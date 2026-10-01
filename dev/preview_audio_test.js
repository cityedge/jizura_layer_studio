const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
function fixture() {
  let now = 0, failures = 0, fallbackCount = 0, timerId = 0;
  const made = [], revoked = [], sources = [], timers = new Map();
  class Media extends EventTarget {
    constructor() { super(); this.currentTime = 0; this.duration = 10; this.paused = true; this.plays = 0; }
    load() {}
    removeAttribute() {}
    pause() { this.paused = true; }
    play() { this.paused = false; this.plays++; return this.playResult || Promise.resolve(); }
  }
  class AudioContext {
    constructor() { this.state = 'running'; this.destination = {}; }
    get currentTime() { return now / 1000; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    createGain() { return { connect() {}, gain: { value: 1, setTargetAtTime(v) { this.value = v; } } }; }
    createBufferSource() { const s = { connect() {}, disconnect() {}, start(at, offset) { this.at = at; this.offset = offset; }, stop() { this.stopped = true; } }; sources.push(s); return s; }
  }
  const context = { J: {}, window: { AudioContext }, setTimeout: fn => { const id = ++timerId; timers.set(id, fn); return id; }, clearTimeout: id => timers.delete(id), performance: { now: () => now }, document: { createElement: () => { const m = new Media(); made.push(m); return m; } }, URL: { createObjectURL: () => 'blob:' + made.length, revokeObjectURL: u => revoked.push(u) } };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src/11y_preview_audio.js'), 'utf8'), context);
  const ap = new context.J.PreviewAudio(() => failures++, () => fallbackCount++);
  const load = (buffer = null) => { ap.load({}, buffer); ap.media.dispatchEvent(new Event('loadedmetadata')); return ap.media; };
  return { ap, load, revoked, sources, context, timers, timeout: () => { const callbacks = [...timers.values()]; timers.clear(); callbacks.forEach(fn => fn()); }, advance: ms => { now += ms; }, failures: () => failures, fallbacks: () => fallbackCount };
}
test('media clock, rate changes, volume and silence past audio end', async () => {
  const f = fixture(), { ap } = f, m = f.load();
  ap.setVol(0.5, true); assert.equal(m.volume, 0.25); assert.equal(m.muted, true);
  await ap.play(2, 0.5); assert.equal(m.currentTime, 2); assert.equal(m.playbackRate, 0.5); assert.equal(m.preservesPitch, true);
  m.currentTime = 3; assert.equal(ap.time(), 3); ap.setRate(0.75); assert.equal(ap.time(), 3);
  m.currentTime = 10; m.dispatchEvent(new Event('ended')); f.advance(2000); assert.equal(ap.time(), 11.5);
  ap.setRate(0.5); f.advance(2000); assert.equal(ap.time(), 12.5);
  ap.stop(); f.advance(2000); assert.equal(ap.time(), 12.5);
  await ap.play(14, 0.5); assert.equal(m.plays, 1, 'no last-frame audio replay'); f.advance(2000); assert.equal(ap.time(), 15);
});
test('pause/replacement cancel metadata waits and release object URLs', async () => {
  const f = fixture(), { ap } = f;
  ap.load({}); const old = ap.media, first = ap.play(3, 0.5);
  ap.stop(); old.dispatchEvent(new Event('loadedmetadata')); await first;
  assert.equal(old.plays, 0); assert.equal(ap.running, false);
  ap.load({}); const waiting = ap.play(0); f.load(); await waiting;
  assert.equal(f.failures(), 0); assert.deepEqual(f.revoked, ['blob:1', 'blob:2']);
  ap.clear(); assert.equal(ap.media, null); assert.equal(f.revoked.length, 3);
});
test('a stale play rejection cannot stop a newer seek, current rejection reports once', async () => {
  const f = fixture(), { ap } = f, m = f.load(); let reject;
  m.playResult = new Promise((_, no) => { reject = no; });
  const first = ap.play(0, 0.5); await Promise.resolve();
  m.playResult = Promise.resolve(); await ap.play(4, 0.75);
  reject(new Error('interrupted')); await first;
  assert.equal(ap.running, true); assert.equal(ap.time(), 4); assert.equal(f.failures(), 0);
  m.playResult = Promise.reject(new Error('blocked')); await ap.play(5);
  assert.equal(ap.running, false); assert.equal(f.failures(), 1);
});
test('manual legacy mode needs no media readiness, has a 1x clock, volume, seek and silent tail', async () => {
  const f = fixture(), { ap } = f;
  ap.load({}, { duration: 10 });
  await ap.play(3, 0.5, 'legacy'); assert.equal(ap.rate, 1); assert.equal(ap.mode, 'legacy'); assert.equal(ap.media.plays, 0);
  assert.equal(f.sources[0].offset, 3); f.advance(2000); assert.equal(ap.time(), 5);
  ap.setVol(0.5, false); assert.equal(ap.gain.gain.value, 0.25); ap.setVol(null, true); assert.equal(ap.gain.gain.value, 0);
  await ap.play(8, 1, 'legacy'); assert.equal(f.sources[0].stopped, true); assert.equal(f.sources[1].offset, 8);
  f.advance(3000); assert.equal(ap.time(), 11); ap.stop(); f.advance(1000); assert.equal(ap.time(), 11);
  await ap.play(15, 1, 'legacy'); assert.equal(f.sources.length, 2); f.advance(1000); assert.equal(ap.time(), 16);
  ap.clear(); assert.equal(ap.buffer, null); assert.equal(f.timers.size, 0);
});
test('media rejection and error switch once to legacy at the current time; old errors are ignored', async () => {
  const f = fixture(), { ap } = f, m = f.load({ duration: 10 });
  m.playResult = Promise.reject(new Error('unsupported'));
  await ap.play(4, 0.5); assert.equal(ap.mode, 'legacy'); assert.equal(ap.time(), 4); assert.equal(f.fallbacks(), 1); assert.equal(f.failures(), 0);
  m.dispatchEvent(new Event('error')); assert.equal(f.fallbacks(), 1);
  m.playResult = Promise.resolve(); await ap.play(5, 0.75, 'media'); m.currentTime = 6.2;
  m.dispatchEvent(new Event('error')); assert.equal(ap.time(), 6.2); assert.equal(f.fallbacks(), 2);
  assert.equal(f.sources.at(-1).offset, 6.2); assert.equal(m.paused, true);
});
test('pending media timeout falls back, legacy failure stops without a fallback loop', async () => {
  const f = fixture(), { ap } = f;
  ap.load({}, { duration: 10 }); ap.play(2, 0.5); f.timeout();
  assert.equal(ap.mode, 'legacy'); assert.equal(ap.time(), 2); assert.equal(f.fallbacks(), 1);
  ap.stop(); ap.ctx.state = 'suspended'; ap.ctx.resume = () => Promise.reject(new Error('blocked'));
  await ap.play(2, 1, 'legacy'); assert.equal(ap.running, false); assert.equal(f.failures(), 1); assert.equal(f.fallbacks(), 1);
  assert.equal(f.timers.size, 0);
});
test('pause or switching back to media cancels a pending legacy resume', async () => {
  const f = fixture(), { ap } = f, m = f.load({ duration: 10 });
  await ap.play(0, 1, 'legacy'); ap.stop();
  let resume; ap.ctx.state = 'suspended'; ap.ctx.resume = () => new Promise(ok => { resume = () => { ap.ctx.state = 'running'; ok(); }; });
  const waiting = ap.play(3, 1, 'legacy'); ap.stop(); resume(); await waiting; assert.equal(f.sources.length, 1);
  ap.ctx.state = 'suspended'; const again = ap.play(5, 1, 'legacy'); await ap.play(6, 0.5, 'media'); resume(); await again;
  assert.equal(ap.mode, 'media'); assert.equal(ap.running, true); assert.equal(m.currentTime, 6); assert.equal(f.sources.length, 1);
});
test('synchronous media setup failure preserves decoded audio for legacy fallback', async () => {
  const f = fixture(), { ap } = f;
  f.context.URL.createObjectURL = () => { throw new Error('Blob playback blocked'); };
  ap.load({}, { duration: 10 }); await ap.play(3, 0.75);
  assert.equal(ap.mode, 'legacy'); assert.equal(ap.time(), 3); assert.equal(f.fallbacks(), 1); assert.equal(f.failures(), 0);
});
