/* A broad draw is a persisted, explicit composition, separate from its base look.
   Choose techniques uniformly after compatibility checks; their own planners keep
   geometry valid. Count/strength budgets prevent a pile-up of unrelated effects. */
(() => {
'use strict';
const copy = x => JSON.parse(JSON.stringify(x));
const allowed = (p, group) => (group === 'style' ? J.STYLE_ORDER : J.order(group)).filter(k => {
  const d = (group === 'style' ? J.STYLES : J.registry(group))[k];
  return d && !d.special && (!J.randomOk || J.randomOk(p, group, k));
});
const pick = (rng, items, fallback) => items.length ? rng.pick(items) : fallback;
const planParams = (definition, rng, cut, st, layout = false) => {
  const result = definition?.plan ? (layout ? definition.plan(rng, cut, st) : definition.plan(rng, st)) : {};
  return result || {};
};
const durations = c => {
  const dur = c.fraction;
  c.inDur = Math.max(0, Math.min(c.inDur || 0, dur * 0.8));
  c.outDur = Math.max(0, Math.min(c.outDur || 0, dur * 0.8));
  if (c.inDur + c.outDur > dur * 0.88) {
    const ratio = dur * 0.88 / (c.inDur + c.outDur); c.inDur *= ratio; c.outDur *= ratio;
  }
  c.transDur = Math.max(0, Math.min(c.transDur || 0, J.TRANS[c.trans]?.overlap ? J.transitionDuration(c.trans, dur, c.outDur) : dur * 0.4));
  c.events = (c.events || []).filter(e => e.dt >= 0 && e.dt < dur)
    .map(e => ({ ...e, dur: Math.min(e.dur, dur - e.dt) }));
  return c;
};
J.fitRandomCueCuts = (source, duration) => {
  const cuts = copy(source), total = cuts.reduce((a, c) => a + c.fraction, 0);
  const ratio = duration / Math.max(0.001, total);
  return cuts.map(c => {
    for (const key of ['fraction', 'inDur', 'outDur', 'transDur']) c[key] *= ratio;
    if (c.morph) c.morph.dur *= ratio;
    c.events = (c.events || []).map(e => ({ ...e, dt: e.dt * ratio, dur: e.dur * ratio }));
    return durations(c);
  });
};
J.makeRandomCue = (p, current, index, audio, rng) => {
  const ln = current.lines.find(l => l.index === index), original = p.overrides[index];
  const effective = original.cueLook ? J.cueLookProject(p, original.cueLook) : p;
  const fonts = {}, faces = Object.keys(J.FONTS).filter(k => !J.randomOk || J.randomOk(p, 'font', k));
  for (const role of ['display', 'body', 'serif']) fonts[role] = pick(rng, faces, 'gothic_med');
  const styles = allowed(p, 'style');
  // Palette roles stay coherent and contrasted, but are independent of the base style.
  const palette = copy(J.STYLES[pick(rng, styles, effective.style)].schemes).map(s => ({ ...s, ...J.randomPalette(s.bg, rng) }));
  const fx = { ...effective.fx, motion: rng.range(0.3, 0.85), glitch: rng.range(0, 0.35), chroma: rng.range(0, 0.4),
    decor: rng.range(0.15, 0.65), texture: rng.range(0, 0.45), density: rng.range(0.15, 0.85), bgSwitch: 0,
    hud: rng.chance(0.15) ? 'on' : 'off', flash: rng.chance(0.2), koma: rng.pick([0, 0, 15, 10]) };
  fx.onTwos = fx.koma > 0;
  const temp = copy(p), chunks = J.chunkText(ln.text);
  const count = rng.int(1, Math.max(1, Math.min(6, chunks.length, Math.floor((ln.visEnd - ln.start) / 0.65))));
  temp.overrides[index] = { seed: original.seed, reroll: true, cuts: count,
    cueLook: { style: effective.style, mood: effective.mood, fonts, fx, colors: { enabled: false }, palette } };
  // No unification, beat snapping or inherited manual choices in this target's draft.
  // Other cues are restored from the caller's snapshots and never use this draft.
  temp.unify = false; temp.timing.snap = false;
  const generated = J.plan(temp, audio), source = generated.cuts.filter(c => c.line === index && c.utext != null);
  const cuts = J.lineSnapshot(generated, index);
  if (!cuts?.length) throw new Error(J.layerText('この字幕をランダム化できません。', 'This cue cannot be randomized.'));
  cuts.forEach((c, i) => {
    const src = source[i], dur = c.fraction;
    const text = src.text, n = Math.max(J.glyphCount(text), src.companion ? J.glyphCount(src.companion.text) : 0);
    const W = src.zone?.w || generated.W, H = src.zone?.h || generated.H;
    const st = copy(src.renderLook?.style || J.resolveStyle({ ...effective, fonts, colors: { enabled: false } }));
    st.schemes = copy(palette); st.glitchBoost = 1;
    c.layout = pick(rng, allowed(p, 'layout').filter(k => !J.LAYOUTS[k].fits || J.LAYOUTS[k].fits(n)), 'center');
    const LD = J.LAYOUTS[c.layout], busy = !!LD.busy;
    c.params = planParams(LD, rng, { text, n: J.glyphCount(text), W, H, dur }, st, true);
    c.twinParams = src.companion ? planParams(LD, rng, { text: src.companion.text, n: J.glyphCount(src.companion.text), W, H, dur }, st, true) : null;
    c.enter = pick(rng, allowed(p, 'enter').filter(k => (!J.ENTER[k].minDur || dur >= J.ENTER[k].minDur) && (!J.ENTER[k].maxChars || n <= J.ENTER[k].maxChars)), 'cut');
    c.exit = pick(rng, allowed(p, 'exit').filter(k => !J.EXIT[k].minDur || dur >= J.EXIT[k].minDur), 'cut');
    c.inDur = c.enter === 'cut' ? Math.min(0.12, dur * 0.2) : Math.min(0.6, dur * rng.range(0.22, 0.4));
    c.outDur = c.exit === 'cut' ? 0 : Math.min(0.5, dur * rng.range(0.18, 0.35));
    if (J.ENTER[c.enter].inDur) c.inDur = J.ENTER[c.enter].inDur(dur, n);
    if (J.EXIT[c.exit].outDur) c.outDur = J.EXIT[c.exit].outDur(dur, n);
    c.cam = LD.cam === false ? 'push' : pick(rng, allowed(p, 'cam').filter(k => !busy || !J.CAMERA[k].strong), 'push');
    const strong = !!J.CAMERA[c.cam].strong;
    c.camP = planParams(J.CAMERA[c.cam], rng, null, st);
    c.hold = strong && rng.chance(0.7) ? 'still' : pick(rng, allowed(p, 'hold'), 'still');
    c.treat = LD.treat === false || (busy || strong) || !rng.chance(0.45) ? 'none' :
      pick(rng, allowed(p, 'treat').filter(k => k !== 'none' && (LD.treat !== 'safe' || J.TREAT[k].safe)), 'none');
    c.treatP = planParams(J.TREAT[c.treat], rng, null, st);
    c.bg = !rng.chance(0.45) ? 'none' : pick(rng, allowed(p, 'bg').filter(k => k !== 'none' && (!busy || J.BG[k].subtle)), 'none');
    c.bgP = planParams(J.BG[c.bg], rng, null, st);
    const busyBack = c.bg !== 'none' && !J.BG[c.bg].subtle;
    const budget = busy || strong || busyBack || c.treat !== 'none' || p.typeset ? 1 : 3;
    const pool = allowed(p, 'decor').filter(k => !((busy || busyBack) && J.DECOR[k].layer === 'back' && !J.DECOR[k].subtle));
    c.decor = [];
    for (let j = rng.int(0, budget); j > 0 && pool.length; j--) {
      const id = pool.splice(rng.int(0, pool.length - 1), 1)[0];
      c.decor.push({ id, seed: rng.int(1, 1e9), n: rng.int(1, 3), right: rng.chance(0.5), low: rng.chance(0.5),
        accent: rng.chance(0.4), corner: rng.chance(0.5), big: false, mode: rng.pick(['count', 'index']), from: 0, to: rng.int(30, 999), v: rng.int(0, 5), r: rng() });
    }
    if (p.typeset && c.decor.length) { c.treat = 'none'; c.treatP = {}; }
    c.trans = null; c.transP = {}; c.transDur = 0; c.morph = null;
    // Only internal touching cuts: never bridge SRT gaps or change adjacent cues.
    if (i > 0 && dur >= 0.6 && cuts[i - 1].fraction >= 0.6 && rng.chance(0.25)) {
      c.trans = pick(rng, allowed(p, 'trans').filter(k => J.transitionFits(k, { dur: cuts[i - 1].fraction }, dur)), null);
      if (c.trans) { c.transP = planParams(J.TRANS[c.trans], rng, null, st); c.transDur = J.TRANS[c.trans].overlap ? J.transitionDuration(c.trans, dur, c.outDur) : Math.min(J.TRANS[c.trans].dur || 0.35, dur * 0.3, cuts[i - 1].fraction * 0.3); }
    }
    c.events = [];
    if (dur > 0.5 && rng.chance(busy || strong || busyBack ? 0.15 : 0.4)) {
      const type = pick(rng, allowed(p, 'fx').filter(k => k !== 'flash' || fx.flash), null);
      if (type) { const d = J.FXE[type]; c.events.push({ type, dt: dur * rng.range(0.2, 0.55), amp: Math.min(1, d.amp || 1) * rng.range(0.25, 0.6), dur: Math.min(0.3, (d.dur || 4) / 24, dur * 0.2) }); }
    }
    c.weightGrow = false; c.kime = false; c.recap = false; c.seed = rng.int(1, 1e9);
    c.scheme = rng.int(0, palette.length - 1);
    c.renderLook = { style: st, styleKey: effective.style, fx: copy(fx), hud: fx.hud === 'on' };
    durations(c);
  });
  return cuts;
};
// Preserve all fields outside the selected group's ownership, including cut structure.
J.mergeCueDrawCuts = (oldCuts, freshCuts, mode) => {
  if (!oldCuts || !freshCuts || mode !== 'motion' && oldCuts.length !== freshCuts.length) throw new Error('Subtitle cut structure changed during partial draw');
  if (mode === 'motion') return freshCuts.map((fresh, i) => {
    const c = copy(fresh), old = oldCuts[Math.min(i, oldCuts.length - 1)];
    c.renderLook = copy(old.renderLook);
    if (fresh.renderLook) c.renderLook.fx = copy(fresh.renderLook.fx);
    c.scheme = old.scheme;
    return durations(c);
  });
  const visual = ['layout', 'params', 'twinParams', 'bg', 'bgP', 'treat', 'treatP'];
  const motion = ['enter', 'exit', 'hold', 'inDur', 'outDur', 'decor', 'cam', 'camP', 'trans', 'transP', 'transDur', 'morph', 'treat', 'treatP', 'events', 'weightGrow'];
  const fields = mode === 'style' ? visual : mode === 'mood' ? motion : [...visual, ...motion];
  return oldCuts.map((old, i) => {
    const c = copy(old), fresh = freshCuts[i];
    for (const field of fields) if (fresh[field] !== undefined) c[field] = copy(fresh[field]);
    if (fresh.renderLook) {
      c.renderLook ||= copy(fresh.renderLook);
      if (mode === 'style') {
        const schemes = copy(c.renderLook.style.schemes);
        c.renderLook.style = copy(fresh.renderLook.style); c.renderLook.style.schemes = schemes;
        c.renderLook.styleKey = fresh.renderLook.styleKey;
      } else c.renderLook.fx = copy(fresh.renderLook.fx);
    }
    const LD = J.LAYOUTS[c.layout];
    if (LD.treat === false || LD.treat === 'safe' && !J.TREAT[c.treat]?.safe) { c.treat = 'none'; c.treatP = {}; }
    if (LD.busy && c.bg !== 'none' && !J.BG[c.bg]?.subtle) { c.bg = 'none'; c.bgP = {}; }
    if (LD.cam === false) { c.cam = 'push'; c.camP = {}; }
    return durations(c);
  });
};
})();
