/* A virtual choreography clock, independent of SRT, media and beat clocks. */
(() => {
'use strict';
J.normalizeMotionPitch = value => {
  const n = Number(value);
  return Number.isFinite(n) && value != null && value !== '' ? Math.round(J.clamp(n, .3, 1.2) * 10) / 10 : 1;
};
J.cueMotionPitch = (p, index) => J.normalizeMotionPitch(p.overrides?.[index]?.motionPitch ?? p.motionPitch);
J.motionDurations = (enter, exit, dur, n) => {
  let a = J.clamp(dur * .36, .12, .6);
  if (enter === 'type') a = J.clamp(n * .055 + .1, .15, dur * .65);
  if (enter === 'assemble') a = J.clamp(dur * .45, .22, .75);
  if (J.ENTER[enter]?.inDur) a = J.ENTER[enter].inDur(dur, n);
  if (enter === 'cut') a = .12;
  let b = exit === 'cut' ? 0 : J.clamp(dur * .3, .14, .55);
  if (['explode','fall','drift'].includes(exit)) b = J.clamp(dur * .38, .25, .7);
  if (J.EXIT[exit]?.outDur) b = J.EXIT[exit].outDur(dur, n);
  if (a + b > dur * .92) { const f = dur * .92 / (a + b); a *= f; b *= f; }
  return [a, b];
};
const clocks = new WeakMap();
J.motionEnv = (cut, o, plan) => {
  const pitch = J.normalizeMotionPitch(cut?.motionPitch);
  if (!cut || pitch === 1 || o.motionClock === false) return { cut, ...o };
  const origin = cut.motionOrigin ?? cut.start;
  const time = t => origin + (t - origin) * pitch;
  // Stable identities preserve the effect modules' WeakMap planning caches.
  let cached = clocks.get(cut);
  if (!cached || cached.pitch !== pitch || cached.beats !== plan.beats || cached.cuts !== plan.cuts) {
    const virtual = { ...cut, start: time(cut.start), end: time(cut.end), dur: cut.dur * pitch,
      inDur: cut.inDur * pitch, outDur: cut.outDur * pitch, transDur: (cut.transDur || 0) * pitch };
    if (cut.morph) virtual.morph = { ...cut.morph, dur: cut.morph.dur * pitch };
    cached = { pitch, beats: plan.beats, cuts: plan.cuts, virtual,
      virtualBeats: (plan.beats || []).map(time),
      virtualCuts: (plan.cuts || []).map(c => ({ ...c, start: time(c.start), end: time(c.end), dur: c.dur * pitch })) };
    clocks.set(cut, cached);
  }
  const t = time(o.t), clock = J.komaOf(plan.fx) > 0 ? J.stepDur(plan.fx, plan.fps) : 1 / 30;
  // Beat/energy are intentionally copied unchanged. Their origin is the real song.
  return { ...o, cut: cached.virtual, plan: { ...plan, beats: cached.virtualBeats, cuts: cached.virtualCuts }, realT: o.t, t, lt: o.lt * pitch, ltb: o.ltb * pitch, step: Math.floor(t / clock + 1e-6) };
};
})();
