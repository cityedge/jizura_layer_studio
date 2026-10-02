// Planner-level regression tests; no browser or dependencies required.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const root = path.join(__dirname, '../src');
const sandbox = { window: {}, document: { documentElement: { lang: 'ja' }, createElement: () => ({ getContext: () => ({ measureText: text => ({ width: String(text).length * 20 }) }) }) }, console };
vm.createContext(sandbox);
for (const name of fs.readdirSync(root).filter(n => n.endsWith('.js') && n < '12').sort())
  vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), sandbox, { filename: name });
const J = sandbox.window.J, copy = x => JSON.parse(JSON.stringify(x));
test('owned late effects survive locking, other-cue rerolls and JSON for normal and filler lines', () => {
  for (const filler of [false, true]) for (const plain of [false, true]) {
    if (plain && filler) continue;
    let p = fixture(filler);
    if (plain) { p.lyrics = p.subtitleCues.map(c => c.text).join('\n'); p.subtitleCues = null; }
    const plan = J.plan(p), index = 1;
    const group = plan.layerGroups?.find(g => g.indices.includes(index));
    const base = group?.plan || plan, local = group ? group.indices.indexOf(index) : index;
    const cuts = base.cuts.filter(c => c.line === local && c.utext != null), last = cuts.at(-1);
    // Exit accents can fall outside the old time-window inference (end minus 0.3 s).
    const events = [-0.1, 0.1].map(dt => ({t:last.end+dt,type:'shake',amp:.42,dur:.12,line:local,cut:cuts.length-1}));
    base.events.push(...events);
    const snapshot = J.lineSnapshot(plan, index);
    for (const e of events) assert.ok(snapshot.at(-1).events.some(x => x.dt === e.t-last.start && x.amp === .42));
    p.overrides[index] = {...p.overrides[index],lock:true,lockedSeed:plan.lines[index].seed,lockedCuts:snapshot};
    const expected = copy(J.lineSnapshot(J.plan(p), index));
    p = J.prepareCueReroll(p, J.plan(p), 3, null, 'random');
    assert.deepEqual(copy(J.lineSnapshot(J.plan(copy(p)),index)), expected);
    assert.deepEqual(copy(J.lineSnapshot(J.plan(copy(p)),index)).at(-1).events.filter(e=>e.amp===.42), copy(snapshot.at(-1).events.filter(e=>e.amp===.42)));
    assert.ok(!J.lineSnapshot(plan,0).some(c=>c.events.some(e=>e.amp===.42)));
  }
});
function fixture(filler = false) {
  const p = J.defaultProject();
  p.subtitleCues = ['朝が来る', '空の向こう', '夜を越えて', '明日へ'].map((text, i) => ({ id: 'c' + i, text, start: i * 3, end: (i + 1) * 3, filler: filler && i < 2 }));
  p.overrides = Object.fromEntries(p.subtitleCues.map((_, i) => [i, { cuts: 1, layout: 'center', enter: 'fade', exit: 'fade' }]));
  return p;
}
test('review selects only new joins; no repeated ID, retiming or unrelated edits; survives JSON', () => {
  for (const filler of [false, true]) for (const unify of [false, true]) {
    let p = fixture(filler); p.unify = unify;
    let plan = J.plan(p), last; const index = filler ? 3 : 1, seen = new Set();
    for (let i = 0; i < 12; i++) {
      const original = copy(p), before = J.lineSnapshot(plan, index);
      const result = J.prepareTransitionReview(p, plan, index);
      p = result.project; plan = J.plan(p);
      const cut = plan.cuts.find(c => c.line === index);
      assert.equal(cut.trans, result.id); assert.notEqual(result.id, last);
      assert.ok(J.reviewTransitions.includes(result.id));
      assert.ok(cut.transDur > .6 && cut.transDur <= cut.dur - cut.outDur);
      assert.deepEqual(copy(p.subtitleCues), original.subtitleCues);
      const after = J.lineSnapshot(plan, index);
      for (const cuts of [before, after]) for (const c of cuts) for (const k of ['enter','inDur','trans','transP','transDur','morph']) delete c[k];
      assert.deepEqual(copy(after), copy(before));
      assert.deepEqual(copy(J.plan(copy(p)).cuts), copy(plan.cuts));
      seen.add(result.id); last = result.id;
    }
    assert.equal(seen.size, 3);
  }
});
test('review rejects gaps, part boundaries, short cuts and locks without mutations', () => {
  for (const reason of ['first','gap','part','short','locked','previousLocked']) {
    const p = fixture(); let index = 1;
    if (reason === 'first') index = 0;
    if (reason === 'gap') p.subtitleCues[1].start += .1;
    if (reason === 'part') p.subtitleCues[1].partBefore = true;
    if (reason === 'short') p.subtitleCues[1].end = 3.7;
    if (reason === 'locked') p.overrides[1].lock = true;
    if (reason === 'previousLocked') p.overrides[0].lock = true;
    const before = JSON.stringify(p);
    assert.throws(() => J.prepareTransitionReview(p, J.plan(p), index), reason);
    assert.equal(JSON.stringify(p), before);
  }
});
test('new joins obey part and duration constraints, legacy joins keep their duration policy', () => {
  for (const id of J.TRANS_ORDER) {
    const p = fixture(); p.overrides[1].cutTech = { 0: { trans: id } };
    const cut = J.plan(p).cuts.find(c => c.line === 1);
    assert.equal(cut.trans, id);
    if (!J.TRANS[id].overlap) assert.equal(cut.transDur, J.clamp(J.TRANS[id].dur || .35, .12, .6));
    else {
      p.subtitleCues[1].partBefore = true;
      assert.equal(J.plan(p).cuts.find(c => c.line === 1).trans, null);
      delete p.subtitleCues[1].partBefore; p.subtitleCues[1].end = 3.8;
      assert.equal(J.plan(p).cuts.find(c => c.line === 1).trans, null);
    }
  }
});
test('omakase naturally selects all three new joins and honors kinetic exclusion', () => {
  const seen = new Set();
  for (let seed = 0; seed < 250; seed++) {
    const p = fixture(); Object.assign(p, J.omakase(p, J.rng(seed + 17)));
    for (const c of J.plan(p).cuts) if (J.TRANS[c.trans]?.overlap) seen.add(c.trans);
    p.kinetic = false;
    for (const c of J.plan(p).cuts) assert.ok(!J.TRANS[c.trans]?.overlap);
  }
  assert.deepEqual([...seen].sort(), [...J.reviewTransitions].sort());
});
test('full random includes new joins and partial rerolls still produce valid plans', () => {
  const seen = new Set();
  for (let seed = 0; seed < 120; seed++) {
    let p = fixture(); p.seed = seed + 31;
    p.subtitleCues[1].text = '遠い空の 向こう側で 新しい朝を 待ち続ける';
    p.subtitleCues[1].end = 15; p.subtitleCues.length = 2;
    p = J.prepareCueReroll(p, J.plan(p), 1, null, 'random');
    let current = J.plan(p);
    for (const c of current.cuts) if (J.TRANS[c.trans]?.overlap) { seen.add(c.trans); assert.ok(c.dur >= 1 && c.transDur <= c.dur - c.outDur + 1e-8); }
    if (seed < 5) for (const mode of ['style','mood','motion','color','fine']) {
      p = J.prepareCueReroll(p, current, 1, null, mode); current = J.plan(p);
      assert.ok(current.cuts.every(c => Number.isFinite(c.start) && c.end > c.start));
    }
  }
  assert.deepEqual([...seen].sort(), [...J.reviewTransitions].sort());
});
