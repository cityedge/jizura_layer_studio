/* Automatic SRT parts and persisted local draws, separate from manual overrides. */
(() => {
'use strict';
const clone = value => JSON.parse(JSON.stringify(value));
J.subtitleParts = cues => {
  const normal = cues.filter(c => !c.filler && c.text.length).slice().sort((a, b) => a.start - b.start);
  const starts = []; let end = -Infinity, part = -1;
  for (const c of normal) {
    if (part < 0 || Math.round(c.start * 1000) - Math.round(end * 1000) >= 3000) { part++; starts.push(c.start); }
    end = Math.max(end, c.end);
  }
  return cues.map(c => {
    let lo = 0, hi = starts.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (starts[mid] <= c.start) lo = mid + 1; else hi = mid; }
    return Math.max(0, lo - 1);
  });
};
J.subtitlePartText = cues => {
  const parts = J.subtitleParts(cues);
  return cues.map((c, i) => (i ? (parts[i] !== parts[i - 1] ? '\n\n' : '\n') : '') +
    (c.text.length ? (/^[\s\u3000]+$/.test(c.text) ? J.layerText('（空白文字）', '(Whitespace)') : c.text) : J.layerText('（文字なし）', '(Empty cue)'))).join('');
};
J.localLookContext = (p, audio) => JSON.stringify([
  ...['style','mood','seed','fx','enabled','fonts','colors','extra','wa','horror','typo','kinetic','lang','unify','typeset','centerDir','centerFree','aspect','fps'].map(k => p[k]),
  p.timing?.bpm, p.timing?.offset, p.timing?.snap, p.timing?.lineScale, audio?.duration, audio?.beats,
]);
const cueKey = (text, start, end, part, ov) => JSON.stringify([text, start, end, part, ov]);
J.localLookFor = (p, ln, ov, index, start, end) => {
  const saved = p.localLooks;
  const entry = saved?.context === p._localLookContext && saved.lines?.[ln.cueId ?? ('line-' + index)];
  if (entry?.key === cueKey(ln.text, start, end, ln.part, ov)) return entry.cuts;
  if (ov.randomDraw?.text === ln.text && Array.isArray(ov.randomDraw.cuts))
    return J.fitRandomCueCuts(ov.randomDraw.cuts, end - start);
  return null;
};
const plan = J.plan;
J.plan = (p, audio) => plan({ ...p, _localLookContext: J.localLookContext(p, audio) }, audio);
J.captureLocalLooks = (p, current, audio) => {
  const lines = {};
  current.lines.forEach(ln => {
    const i = ln.index, cuts = J.lineSnapshot(current, i), id = p.subtitleCues?.[i]?.id ?? ('line-' + i);
    if (cuts) lines[id] = { key: cueKey(ln.text, ln.start, ln.end, ln.part, p.overrides?.[i] || {}), cuts };
  });
  p.localLooks = { context: J.localLookContext(p, audio), lines };
};
J.cueRerollModes = [
  ['all', '全体変更', 'Everything'], ['style', 'スタイル変更', 'Style'], ['mood', '雰囲気変更', 'Mood'],
  ['motion', '演出変更', 'Performance'], ['color', '配色変更', 'Colors'], ['fine', '微調整', 'Fine-tune'],
  ['random', 'ランダム', 'Random'],
];
J.cueRerollKey = mode => mode === 'random' ? '0' : String(J.cueRerollModes.findIndex(m => m[0] === mode) + 1);
const ruleKeys = ['style', 'mood', 'fonts', 'colors', 'fx', 'enabled'];
const ruleFrom = p => Object.fromEntries(ruleKeys.map(k => [k, clone(p[k] ?? null)]));
J.cueLookProject = (p, rule) => ({ ...p, ...Object.fromEntries(ruleKeys.filter(k => rule[k] != null).map(k => [k, rule[k]])) });
const targetPlan = (plan, index) => plan.layerGroups?.find(g => g.indices.includes(index))?.plan || plan;
const clearGroups = (ov, groups) => {
  for (const key of groups) delete ov[key];
  if (groups.includes('layout')) { delete ov.cutLayouts; }
  for (const key of ['cutTech', 'cutQuiet']) if (ov[key]) for (const slot of Object.values(ov[key])) for (const group of groups) delete slot[group];
};
const broadPool = (p, mood, random) => {
  const M = J.MOODS[mood];
  return Object.fromEntries(J.GROUP_KEYS.map(g => [g, Object.fromEntries(J.order(g).map(k => {
    const d = J.registry(g)[k], preferred = d.tags?.includes(mood) || (Array.isArray(M?.[g]) && M[g].includes(k));
    return [k, !d.special && J.randomOk(p, g, k) && (preferred || random() < 0.7)];
  }))]));
};
const signature = (plan, index) => JSON.stringify(plan.cuts.filter(c => c.line === index).map(c => [c.layout, c.enter, c.exit, c.hold, c.cam, c.utext]));
const baseOverride = ov => {
  const base = { ...(ov.randomDraw?.restore || {}), ...ov };
  delete base.randomDraw;
  return base;
};
// Preparation is transactional; callers record Undo before applying the result.
J.prepareCueReroll = (p, current, index, audio, mode = 'fine') => {
  const ln = current.lines.find(l => l.index === index), ov = p.overrides?.[index] || {};
  if (!ln || !ln.text.length || ln.interlude) throw new Error(J.layerText('この位置に再抽選できる字幕はありません。', 'There is no subtitle to reroll here.'));
  if (ov.lock) throw new Error(J.layerText('この字幕はロック中です。', 'This subtitle is locked.'));
  if (!J.cueRerollModes.some(m => m[0] === mode)) throw new Error('Unknown subtitle draw');
  const next = clone(p);
  J.captureLocalLooks(next, current, audio);
  next.overrides ||= {};
  const target = next.overrides[index] = { ...clone(mode === 'fine' ? baseOverride(ov) : ov), seed: (ov.seed | 0) + (mode === 'color' ? 0 : 1), drawSerial: (ov.drawSerial | 0) + 1, reroll: true };
  const palettes = current.layerGroups ? Object.fromEntries(current.layerGroups.map(g => [g.kind, g.plan.unifyPalettes])) : { normal: current.unifyPalettes, filler: current.unifyPalettes };
  const key = p.subtitleCues?.[index]?.id ?? ('line-' + index);
  const first = current.cuts.find(c => c.line === index), base = targetPlan(current, index);
  const renderLook = first?.renderLook || { style: base.style, styleKey: base.styleKey, fx: base.fx, hud: base.hud };
  const random = J.rng(J.h(p.seed, index + 1, target.drawSerial, 120));
  const storeCuts = cuts => {
    next.localLooks.lines[key] = { key: cueKey(ln.text, ln.start, ln.end, ln.part, target), cuts };
    return next;
  };
  if (mode === 'random') {
    const restore = clone(baseOverride(ov));
    const cuts = J.makeRandomCue(next, current, index, audio, random);
    for (const k of Object.keys(target)) if (!['seed', 'drawSerial', 'reroll', 'cueLook'].includes(k)) delete target[k];
    target.randomDraw = { restore, text: ln.text, cuts };
    return storeCuts(cuts);
  }
  const effective = ov.cueLook ? J.cueLookProject(p, ov.cueLook) : p;
  let rule = ov.cueLook ? clone(ov.cueLook) : { ...ruleFrom(p), palette: clone(renderLook.style.schemes), palettes: clone(base.unifyPalettes || []) };
  if (mode === 'color' && ov.randomDraw) rule.palette = clone(renderLook.style.schemes);
  if (mode !== 'fine') {
    if (mode === 'all' || mode === 'style' || mode === 'mood') {
      const draw = J.omakase(effective, random, mode === 'style' ? { mood: effective.mood } : {});
      if (mode === 'all') {
        for (const k of Object.keys(target)) if (!['seed', 'drawSerial', 'reroll'].includes(k)) delete target[k];
        rule = { ...ruleFrom(draw), palette: clone(J.resolveStyle({ ...p, ...draw }).schemes), palettes: [] };
      } else if (mode === 'style') {
        Object.assign(rule, { style: draw.style, fonts: draw.fonts, enabled: broadPool(p, effective.mood, random), palettes: [] });
        clearGroups(target, ['layout', 'bg', 'treat']);
      } else {
        Object.assign(rule, { mood: draw.mood, fx: draw.fx, enabled: draw.enabled, palettes: [] });
        clearGroups(target, ['enter', 'exit', 'hold', 'decor', 'cam', 'trans', 'treat']);
      }
      rule.unifyMode = 'local';
    } else if (mode === 'motion') {
      rule.enabled = broadPool(p, effective.mood, random);
      rule.fx = { ...rule.fx, density: 0.2 + random() * 0.75 };
      rule.unifyMode = 'loose';
      clearGroups(target, ['layout', 'bg', 'enter', 'exit', 'hold', 'decor', 'cam', 'trans', 'treat']);
      delete target.cuts; delete target.single;
    } else if (mode === 'color') {
      const styles = J.STYLE_ORDER.filter(k => J.randomOk(p, 'style', k));
      const donor = J.STYLES[styles[Math.floor(random() * styles.length)] || p.style].schemes;
      rule.palette = rule.palette.map((s, i) => {
        const d = donor[i % donor.length], colors = J.randomPalette(d.bg, random);
        const tones = Object.fromEntries(['bg', 'fg', 'sub', 'accent', 'accent2', 'ink', 'dim', 'ghostA', 'ghostB'].filter(k => typeof d[k] === 'string').map(k => [k, d[k]]));
        return { ...s, ...tones, ...colors, ...(s.grad ? { grad: [colors.accent, J.mix(colors.accent, '#000000', 0.7)] } : {}) };
      });
    }
    if (!(mode === 'color' && ov.randomDraw)) target.cueLook = rule;
  }
  if (mode === 'fine' && target.cueLook) target.cueLook.unifyMode = 'local';
  if (mode === 'color') {
    // Re-key the existing snapshots: no new motion, timing, events or joins are planned.
    const entry = next.localLooks.lines[key];
    entry.key = cueKey(ln.text, ln.start, ln.end, ln.part, target);
    for (const cut of entry.cuts) {
      cut.renderLook = clone(cut.renderLook || renderLook);
      cut.renderLook.style.schemes = clone(rule.palette);
    }
    if (target.randomDraw) target.randomDraw.cuts = clone(entry.cuts);
    entry.key = cueKey(ln.text, ln.start, ln.end, ln.part, target);
    return next;
  }
  const partial = ['style', 'mood', 'motion'].includes(mode);
  const previousCuts = partial ? J.lineSnapshot(current, index) : null;
  if (previousCuts) for (const cut of previousCuts) cut.renderLook ||= clone(renderLook);
  const randomDraw = target.randomDraw;
  delete target.randomDraw;
  let fresh;
  for (let attempt = 0; attempt < (mode === 'fine' ? 1 : 6); attempt++) {
    const draft = { ...next, _cueUnits: partial && mode !== 'motion' ? { [index]: previousCuts } : null, _unifyPalettes: palettes, _rerollSchemes: mode === 'all' ? {} : { [key]: first?.scheme } };
    if (mode === 'mood' || mode === 'motion') {
      const fonts = Object.fromEntries(Object.entries(renderLook.style.fonts).map(([role, faces]) => [role, faces[0]]));
      draft.overrides = { ...next.overrides, [index]: { ...target, cueLook: { ...target.cueLook, fonts, palette: clone(renderLook.style.schemes) } } };
    }
    fresh = J.plan(draft, audio);
    if (mode === 'fine' || signature(fresh, index) !== signature(current, index) || attempt === 5) break;
    target.seed++;
  }
  if (target.cueLook) target.cueLook.palettes = clone(fresh.lines.find(l => l.index === index)?.rulePalettes || []);
  J.captureLocalLooks(next, fresh, audio);
  if (partial) {
    const cuts = J.mergeCueDrawCuts(previousCuts, J.lineSnapshot(fresh, index), mode);
    if (randomDraw) {
      const groups = mode === 'style' ? ['layout', 'bg', 'treat'] : ['enter', 'exit', 'hold', 'decor', 'cam', 'trans', 'treat', ...(mode === 'motion' ? ['layout', 'bg'] : [])];
      clearGroups(randomDraw.restore, groups);
      if (mode === 'motion') { delete randomDraw.restore.cuts; delete randomDraw.restore.single; }
      randomDraw.restore.cueLook = clone(target.cueLook);
      target.randomDraw = { ...randomDraw, cuts };
    }
    return storeCuts(cuts);
  }
  return next;
};
J.cueAtTime = (plan, time) => plan.lines.filter(l => !l.interlude && l.text.length && time >= l.start && time < l.end)
  .sort((a, b) => b.start - a.start || b.index - a.index)[0] || null;
J.cueJumpTime = (plan, time, direction) => {
  const starts = [...new Set(plan.lines.filter(l => !l.interlude && l.text.length).map(l => l.start))].sort((a, b) => a - b);
  if (direction > 0) return starts.find(t => t > time + 0.001) ?? time;
  const current = J.cueAtTime(plan, time);
  if (current && time - current.start > 0.3) return current.start;
  return starts.filter(t => t < (current ? current.start : time) - 0.001).at(-1) ?? (starts[0] ?? time);
};
})();
