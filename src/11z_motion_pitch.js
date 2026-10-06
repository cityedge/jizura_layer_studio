/* Pitch-only edits keep the current appearance and seeded layout recipes. */
(() => {
'use strict';
const copy = x => JSON.parse(JSON.stringify(x));
const defaults = J.defaultProject, upgrade = J.upgradeLayerProject, omakase = J.omakase, reroll = J.prepareCueReroll;
J.defaultProject = () => ({ ...defaults(), motionPitch: 1, motionPitchSetting: 1, cuePitchSetting: 1 });
J.upgradeLayerProject = (p, source) => {
  upgrade(p, source);
  for (const key of ['motionPitch','motionPitchSetting','cuePitchSetting']) p[key] = J.normalizeMotionPitch(source?.[key] ?? (key === 'motionPitchSetting' ? source?.motionPitch : 1));
  for (const ov of Object.values(source?.overrides || {})) if (ov && ov.motionPitch != null) ov.motionPitch = J.normalizeMotionPitch(ov.motionPitch);
};
const freezeLocks = p => {
  for (const [i, ov] of Object.entries(p.overrides || {})) if (ov.lock) ov.motionPitch = J.cueMotionPitch(p, i);
};
J.omakase = (p, ...args) => {
  const draft = copy(p); freezeLocks(draft);
  const draw = omakase(draft, ...args);
  draw.motionPitch = J.normalizeMotionPitch(p.motionPitchSetting ?? p.motionPitch);
  // Auto-compose adopts the global pitch, preserving locked cues' previous clocks.
  draw.overrides = copy(draw.overrides || draft.overrides || {});
  for (const ov of Object.values(draw.overrides)) if (!ov.lock) delete ov.motionPitch;
  return draw;
};
const targetPlan = (plan, i) => plan.layerGroups?.find(g => g.indices.includes(i))?.plan || plan;
const lookFor = (p, current, i, c) => c.renderLook || (() => {
  const base = targetPlan(current, i);
  return { style: base.style, styleKey: base.styleKey, fx: base.fx, hud: base.hud };
})();
function retime(c, old, actual, pitch, base, fixed) {
  const n = Math.max(J.glyphCount(actual.text), J.glyphCount(actual.companion?.text || ''));
  const dur = c.fraction * pitch, oldPitch = J.normalizeMotionPitch(old.motionPitch);
  const compatible = !J.LAYOUTS[old.layout].fits || J.LAYOUTS[old.layout].fits(n);
  if (compatible) {
    c.layout = old.layout;
    const replay = (params, text, zone) => {
      if (!params?._motionPlan) return copy(params);
      return J.replayMotionParams(J.recordMotionParams(params, old.layout), text, zone?.w || base.W, zone?.h || base.H, dur, old.renderLook.style);
    };
    c.params = replay(old.params, actual.text, actual.zone);
    c.twinParams = actual.companion ? replay(old.twinParams || old.params, actual.companion.text, actual.companion.zone) : null;
  }
  for (const k of ['bg','bgP','hold','cam','camP','treat','treatP','decor','seed','scheme','stagger','weightGrow','kime','renderLook']) c[k] = copy(old[k]);
  for (const k of ['enter','exit']) {
    const d = (k === 'enter' ? J.ENTER : J.EXIT)[old[k]];
    c[k] = (!d.minDur || dur >= d.minDur) && (!d.maxChars || n <= d.maxChars) ? old[k] : 'cut';
  }
  const ds = fixed ? [old.inDur * oldPitch, old.outDur * oldPitch] : J.motionDurations(c.enter, c.exit, dur, n);
  c.inDur = c.enter === 'cut' ? Math.min(.12, dur * .2) / pitch : ds[0] / pitch;
  c.outDur = c.exit === 'cut' ? 0 : ds[1] / pitch;
  if (c.inDur + c.outDur > c.fraction * .92) {
    const f = c.fraction * .92 / (c.inDur + c.outDur); c.inDur *= f; c.outDur *= f;
  }
  c.trans = old.trans; c.transP = copy(old.transP || {});
  c.transDur = Math.min((old.transDur || 0) * oldPitch / pitch, c.fraction * .45);
  c.morph = old.morph ? { dur: Math.min(old.morph.dur * oldPitch / pitch, c.fraction * .45) } : null;
  c.events = (old.events || []).map(e => ({ ...e,
    dt: e.dt < 0 ? e.dt * oldPitch / pitch : e.dt * c.fraction / old.fraction,
    dur: e.dur * oldPitch / pitch,
  })).filter(e => e.dt < c.fraction).map(e => ({ ...e, dur: Math.min(e.dur, c.fraction - e.dt) }));
  c.motionPitch = pitch;
  return c;
}
J.prepareMotionPitch = (p, current, audio, value, index = null) => {
  const pitch = J.normalizeMotionPitch(value), next = copy(p), all = index == null;
  const targets = current.lines.filter(l => !l.interlude && l.text?.length && (all || l.index === index));
  if (!targets.length) throw new Error(J.layerText('この位置に変更できる字幕はありません。', 'There is no subtitle to change here.'));
  if (!all && p.overrides?.[index]?.lock) throw new Error(J.layerText('この字幕はロック中です。', 'This subtitle is locked.'));
  J.captureLocalLooks(next, current, audio);
  next.overrides ||= {};
  if (all) { freezeLocks(next); next.motionPitch = pitch; }
  const edits = [];
  for (const ln of targets) {
    const i = ln.index, ov = next.overrides[i] ||= {}, key = p.subtitleCues?.[i]?.id ?? ('line-' + i);
    const old = J.lineSnapshot(current, i), base = targetPlan(current, i);
    if (!old?.length) continue;
    old.forEach(c => { c.renderLook = copy(lookFor(p, current, i, c)); });
    if (ov.lock) { ov.lockedCuts = copy(old); continue; }
    if (all) delete ov.motionPitch; else ov.motionPitch = pitch;
    // Explicit/random/library compositions retain their saved cut structure.
    // Old projects without generation inputs also retain their concrete geometry.
    const fixed = !!(ov.randomDraw || ov.cuts > 0 || ov.single || old.some(c => !c.params?._motionPlan));
    edits.push({ ln, i, ov, key, old, base, fixed });
  }
  J.rekeyLocalLooks(next, current, audio);
  // One generation pass for the entire operation, even on a long song.
  const draft = copy(next); draft._cueUnits = {};
  for (const { i, ov, key, old, fixed } of edits) {
    delete draft.localLooks.lines[key];
    delete draft.overrides[i].randomDraw;
    const look = old[0].renderLook;
    const rule = ov.cueLook || J.cueAppearanceRule(p, look.style);
    draft.overrides[i].cueLook = { ...copy(rule), palette: copy(look.style.schemes), fx: copy(look.fx),
      fonts: Object.fromEntries(Object.entries(look.style.fonts).map(([r, v]) => [r, v[0]])) };
    if (fixed) draft._cueUnits[i] = old;
  }
  const fresh = edits.length ? J.plan(draft, audio) : null;
  for (const { i, ov, key, old, base, fixed } of edits) {
    const generated = fresh.cuts.filter(c => c.line === i && c.utext != null);
    const cuts = J.lineSnapshot(fresh, i);
    if (!cuts?.length) throw new Error(J.layerText('演出ピッチを変更できません。', 'Unable to change motion pitch.'));
    // Map the new cut's position to the previous composition, without reseeding.
    let start = 0; const edges = old.map(c => { start += c.fraction; return start; });
    let offset = 0;
    cuts.forEach((c, k) => {
      const pos = offset + c.fraction * .5;
      const slot = fixed ? k : Math.max(0, edges.findIndex(t => t >= pos));
      retime(c, old[Math.min(slot, old.length - 1)], generated[k], pitch, base, fixed);
      offset += c.fraction;
    });
    if (ov.randomDraw) ov.randomDraw.cuts = copy(cuts);
    next.localLooks.lines[key] = { cuts };
  }
  J.rekeyLocalLooks(next, current, audio);
  return next;
};
J.prepareCueReroll = (p, current, index, audio, mode = 'fine') => mode === 'pitch'
  ? J.prepareMotionPitch(p, current, audio, p.cuePitchSetting, index)
  : reroll(p, current, index, audio, mode);
})();
