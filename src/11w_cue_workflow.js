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
  const automatic = cues.map(c => {
    let lo = 0, hi = starts.length;
    while (lo < hi) { const mid = (lo + hi) >>> 1; if (starts[mid] <= c.start) lo = mid + 1; else hi = mid; }
    return Math.max(0, lo - 1);
  });
  const result = Array(cues.length), ordered = cues.map((cue, i) => ({ cue, i })).sort((a, b) => a.cue.start - b.cue.start);
  let section = 0;
  ordered.forEach(({ cue, i }, n) => {
    if (n && (typeof cue.partBefore === 'boolean' ? cue.partBefore : automatic[i] !== automatic[ordered[n - 1].i])) section++;
    result[i] = section;
  });
  return result;
};
// One display row per cue; embedded line breaks remain in the original SRT text.
J.subtitlePartRows = cues => {
  const parts = J.subtitleParts(cues);
  let offset = 0;
  return cues.map((c, i) => {
    const gap = i ? (parts[i] !== parts[i - 1] ? '\n\n' : '\n') : '';
    const text = c.text.length ? (/^[\s\u3000]+$/.test(c.text) ? J.layerText('（空白文字）', '(Whitespace)') : c.text.replace(/\r\n?|\n/g, ' ↵ ')) : J.layerText('（文字なし）', '(Empty cue)');
    const row = { index: i, gapStart: offset, start: offset + gap.length, end: offset + gap.length + text.length, gap, text };
    offset = row.end; return row;
  });
};
J.subtitlePartText = cues => J.subtitlePartRows(cues).map(r => r.gap + r.text).join('');
// Return the next cue whose boundary is changed, without ever modifying cue text.
J.partEditTarget = (cues, start, end, action) => {
  const rows = J.subtitlePartRows(cues);
  if (action === 'add') {
    if (start !== end) return -1;
    const row = rows.find(r => start >= r.start && start <= r.end);
    if (!row) return -1;
    const index = start === row.start ? row.index : row.index + 1;
    return index > 0 && index < rows.length && rows[index].gap.length === 1 ? index : -1;
  }
  const boundary = rows.find(r => r.gap.length === 2 && (start === end
    ? action === 'backward' ? start > r.gapStart && start <= r.start : start >= r.gapStart && start < r.start
    : start >= r.gapStart && end <= r.start));
  return boundary?.index ?? -1;
};
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object'
  ? Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])])) : value;
// Missing candidate entries and explicit true both mean enabled. Import expands
// sparse pools, so neither expansion nor object insertion order invalidates a draw.
const poolContext = enabled => Object.fromEntries(Object.entries(enabled || {}).map(([g, items]) =>
  [g, Object.fromEntries(Object.entries(items || {}).filter(([, value]) => value === false))]).filter(([, items]) => Object.keys(items).length));
const normalizeLookContext = values => {
  if (!Array.isArray(values)) return values;
  const result = values.slice(); result[4] = poolContext(result[4]); return result;
};
const savedLookContext = context => {
  try { return JSON.stringify(canonical(normalizeLookContext(JSON.parse(context)))); } catch { return null; }
};
J.localLookContext = (p, audio) => JSON.stringify(canonical(normalizeLookContext([
  ...['style','mood','seed','fx','enabled','fonts','colors','extra','wa','horror','typo','kinetic','lang','unify','typeset','centerDir','centerFree','aspect','fps'].map(k => p[k]),
  p.timing?.bpm, p.timing?.offset, p.timing?.snap, p.timing?.lineScale, audio?.duration, audio?.beats,
  ...(J.normalizeMotionPitch(p.motionPitch) === 1 ? [] : [J.normalizeMotionPitch(p.motionPitch)]),
])));
const cueKey = (text, start, end, part, ov) => JSON.stringify([text, start, end, part, ov]);
J.localLookFor = (p, ln, ov, index, start, end) => {
  const saved = p.localLooks;
  const entry = saved && p._savedLocalLookContext === p._localLookContext && saved.lines?.[ln.cueId ?? ('line-' + index)];
  if (entry?.key === cueKey(ln.text, start, end, ln.part, ov)) return entry.cuts;
  if (ov.randomDraw?.text === ln.text && Array.isArray(ov.randomDraw.cuts))
    return J.fitRandomCueCuts(ov.randomDraw.cuts, end - start);
  return null;
};
const plan = J.plan;
J.plan = (p, audio) => plan({ ...p, _localLookContext: J.localLookContext(p, audio), _savedLocalLookContext: savedLookContext(p.localLooks?.context) }, audio);
J.captureLocalLooks = (p, current, audio) => {
  const lines = {};
  current.lines.forEach(ln => {
    const i = ln.index, cuts = J.lineSnapshot(current, i), id = p.subtitleCues?.[i]?.id ?? ('line-' + i);
    if (cuts) lines[id] = { key: cueKey(ln.text, ln.start, ln.end, ln.part, p.overrides?.[i] || {}), cuts };
  });
  p.localLooks = { context: J.localLookContext(p, audio), lines };
};
J.rekeyLocalLooks = (p, current, audio) => {
  p.localLooks.context = J.localLookContext(p, audio);
  for (const ln of current.lines) {
    const key = p.subtitleCues?.[ln.index]?.id ?? ('line-' + ln.index), entry = p.localLooks.lines[key];
    if (entry) entry.key = cueKey(ln.text, ln.start, ln.end, ln.part, p.overrides?.[ln.index] || {});
  }
};
J.cueRerollModes = [
  ['all', '全体変更', 'Everything'], ['style', 'スタイル変更', 'Style'], ['mood', '雰囲気変更', 'Mood'],
  ['motion', '演出変更', 'Performance'], ['color', '配色変更', 'Colors'], ['fine', '微調整', 'Fine-tune'],
  ['font', '書体変更', 'Fonts'],
  ['pitch', '演出ピッチ', 'Motion pitch'],
  ['global', '全体のテイスト', 'Global taste'],
  ['random', 'ランダム', 'Random'],
];
J.cueRerollKey = mode => mode === 'global' ? '9' : mode === 'random' ? '0' : String(J.cueRerollModes.findIndex(m => m[0] === mode) + 1);
const ruleKeys = ['style', 'mood', 'fonts', 'colors', 'fx', 'enabled', 'extra', 'wa', 'horror', 'typo', 'kinetic', 'lookTheme'];
const ruleFrom = p => Object.fromEntries(ruleKeys.map(k => [k, clone(p[k] ?? null)]));
J.cueAppearanceRule = (p, style) => ({ ...ruleFrom(p), palette: clone(style.schemes), palettes: [], unifyMode: 'local' });
const globalKeys = [...ruleKeys, 'seed', 'unify', 'typeset'];
// Local overrides are deliberately absent from the signature. Global controls,
// including manual edits and history navigation, establish the latest baseline.
J.globalLookBaseline = (p, current) => {
  const values = Object.fromEntries(globalKeys.map(k => [k, clone(p[k] ?? null)]));
  values.lookTheme = J.normalizeLookTheme(values.lookTheme, p);
  const signature = { ...values, enabled: poolContext(values.enabled) };
  // No-theme signatures match projects saved before themes were introduced.
  if (!signature.lookTheme) delete signature.lookTheme;
  const context = JSON.stringify(canonical(signature));
  if (p.globalLook?.context === context && p.globalLook.values && p.globalLook.palettes) return clone(p.globalLook);
  const palettes = current.layerGroups ? Object.fromEntries(current.layerGroups.map(g => [g.kind, g.plan.unifyPalettes || []]))
    : { normal: current.unifyPalettes || [], filler: current.unifyPalettes || [] };
  return { context, values, palettes: clone(palettes) };
};
J.cueLookProject = (p, rule) => ({ ...p, ...Object.fromEntries(ruleKeys.filter(k => rule[k] != null).map(k => [k, rule[k]])) });
const targetPlan = (plan, index) => plan.layerGroups?.find(g => g.indices.includes(index))?.plan || plan;
// Hidden review draw: change one eligible join, preserve the rest of the composition.
J.prepareTransitionReview = (p, current, index, audio) => {
  const ln = current.lines.find(l => l.index === index), ov = p.overrides?.[index] || {};
  if (!ln || !ln.text.length || ln.interlude) throw new Error(J.layerText('この位置に再抽選できる字幕はありません。', 'There is no subtitle to reroll here.'));
  if (ov.lock) throw new Error(J.layerText('この字幕はロック中です。', 'This subtitle is locked.'));
  const group = current.layerGroups?.find(g => g.indices.includes(index));
  const base = group?.plan || current, localIndex = group ? group.indices.indexOf(index) : index;
  const own = base.cuts.filter(c => c.line === localIndex && c.utext != null);
  const eligible = own.find(c => {
    const prev = base.cuts[base.cuts.indexOf(c) - 1];
    if (!prev || prev.layout === 'interlude' || Math.abs(prev.end - c.start) >= 0.06) return false;
    if (prev.line !== localIndex) {
      const previousIndex = group ? group.indices[prev.line] : prev.line;
      const before = current.lines.find(l => l.index === previousIndex);
      if (p.overrides?.[previousIndex]?.lock || before?.part !== ln.part) return false;
      if (Array.isArray(p.subtitleCues) && (Math.round(before.end * 1000) !== Math.round(ln.start * 1000) || Math.round(prev.end * 1000) !== Math.round(c.start * 1000))) return false;
    }
    return J.reviewTransitions.some(id => J.transitionFits(id, prev, c.dur));
  });
  if (!eligible) throw new Error(J.layerText('この字幕には新しいつなぎを試せる境界がありません。同じパート内で直前の字幕と接し、カットが1秒以上ある字幕で試してください。', 'No eligible join here. Try a cut of at least one second, touching the previous subtitle in the same part.'));
  const next = clone(p);
  J.captureLocalLooks(next, current, audio);
  next.overrides ||= {};
  const target = next.overrides[index] = { ...clone(ov), drawSerial: (ov.drawSerial | 0) + 1 };
  const rng = J.rng(J.h(p.seed, index + 1, target.drawSerial, 319));
  const id = rng.pick(J.reviewTransitions.filter(id => id !== eligible.trans));
  const slot = own.indexOf(eligible), key = p.subtitleCues?.[index]?.id ?? ('line-' + index);
  target.cutTech ||= {};
  target.cutTech[slot] = { ...target.cutTech[slot], trans: id };
  const entry = next.localLooks.lines[key];
  Object.assign(entry.cuts[slot], { trans: id, transP: J.TRANS[id].plan(rng), transDur: J.transitionDuration(id, eligible.dur, eligible.outDur), morph: null });
  if (target.randomDraw) target.randomDraw.cuts = clone(entry.cuts);
  entry.key = cueKey(ln.text, ln.start, ln.end, ln.part, target);
  return { project: next, start: eligible.start, id };
};
// Historical screening: >=50% maximum coverage in the noir/paper audit, before
// the visibility revisions. Keep revised effects in the pool for comparison.
J.coverageReviewPools = {
  layout: 'huge hrFlashlight hrDoorGap hrCctv hrStaticTv knPadGrid subtitleBar splitScreen filmstrip zoomRepeat magazine newspaper cassette stampSheet postcard letterPaper chochin stationSign noren omikuji kakejiku shoji warningLabel karuta magnets wordSearch shadowPlay kaleido wall zipper glitchGrid mosaicTiles contour'.split(' '),
  bg: 'auroraRibbons meshBlobs duotoneSweep horizonGlow seigaiha asanoha houndstooth herringbone argyle tartan chevron isoCubes hexGrid triTess moire squareTunnel spiralArms skyline sunsetSun cloudLayers vignettePulse marble paperCut hrFailingLamp hrCorridor hrDeadTrees sunburst halftoneFade bigStripes splitV splitH splitDiag gradientSweep spotlight checker'.split(' ')
};
J.prepareCoverageReview = (p, current, index, audio, group) => {
  const ln = current.lines.find(l => l.index === index), ov = p.overrides?.[index] || {};
  if (!ln || !ln.text.length || ln.interlude) throw new Error(J.layerText('この位置に再抽選できる字幕はありません。', 'There is no subtitle to reroll here.'));
  if (ov.lock) throw new Error(J.layerText('この字幕はロック中です。', 'This subtitle is locked.'));
  if (!J.coverageReviewPools[group]) throw new Error('Unknown coverage review group');
  const own = current.cuts.filter(c => c.line === index && c.utext != null), base = targetPlan(current, index);
  const registry = group === 'layout' ? J.LAYOUTS : J.BG;
  const pool = J.coverageReviewPools[group].filter(id => registry[id] && !registry[id].special &&
    (group !== 'layout' || own.every(c => !registry[id].fits || registry[id].fits(Math.max(J.glyphCount(c.text), J.glyphCount(c.companion?.text || ''))))));
  if (!own.length || !pool.length) throw new Error(J.layerText('この字幕に適合するレビュー候補がありません。', 'No compatible review candidates for this subtitle.'));
  const next = clone(p);
  J.captureLocalLooks(next, current, audio);
  next.overrides ||= {};
  const target = next.overrides[index] = { ...clone(ov), drawSerial: (ov.drawSerial | 0) + 1 };
  const rng = J.rng(J.h(p.seed, index + 1, target.drawSerial, group === 'layout' ? 421 : 422));
  const alternatives = pool.filter(id => id !== own[0][group]);
  const id = rng.pick(alternatives.length ? alternatives : pool);
  target[group] = id;
  if (group === 'layout') delete target.cutLayouts;
  for (const slots of [target.cutTech, target.cutQuiet]) for (const slot of Object.values(slots || {})) delete slot[group];
  const key = p.subtitleCues?.[index]?.id ?? ('line-' + index), entry = next.localLooks.lines[key];
  entry.cuts.forEach((cut, i) => {
    const src = own[i], st = cut.renderLook?.style || base.style, def = registry[id];
    cut[group] = id;
    if (group === 'bg') cut.bgP = def.plan ? def.plan(rng, st) : {};
    else {
      const params = c => def.plan(rng, { text: c.text, n: J.glyphCount(c.text), W: c.zone?.w || base.W, H: c.zone?.h || base.H, dur: src.dur }, st);
      cut.params = params(src); cut.twinParams = src.companion ? params(src.companion) : null;
      cut.morph = null;
      // Keep a new layout's explicit technique restrictions, including manual overrides.
      if (def.treat === false || def.treat === 'safe' && !J.TREAT[cut.treat]?.safe) {
        cut.treat = 'none'; cut.treatP = {}; (target.cutTech ||= {})[i] = { ...target.cutTech[i], treat: 'none' };
      }
      if (def.cam === false) {
        cut.cam = 'push'; cut.camP = {}; (target.cutTech ||= {})[i] = { ...target.cutTech[i], cam: 'push' };
      }
    }
  });
  if (target.randomDraw) target.randomDraw.cuts = clone(entry.cuts);
  entry.key = cueKey(ln.text, ln.start, ln.end, ln.part, target);
  return { project: next, start: ln.start, id, group };
};
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
  const target = next.overrides[index] = { ...clone(mode === 'fine' ? baseOverride(ov) : ov), seed: (ov.seed | 0) + (['color','font'].includes(mode) ? 0 : 1), drawSerial: (ov.drawSerial | 0) + 1, reroll: true };
  const palettes = current.layerGroups ? Object.fromEntries(current.layerGroups.map(g => [g.kind, g.plan.unifyPalettes])) : { normal: current.unifyPalettes, filler: current.unifyPalettes };
  const key = p.subtitleCues?.[index]?.id ?? ('line-' + index);
  const first = current.cuts.find(c => c.line === index), base = targetPlan(current, index);
  const renderLook = first?.renderLook || { style: base.style, styleKey: base.styleKey, fx: base.fx, hud: base.hud };
  const random = J.rng(J.h(p.seed, index + 1, target.drawSerial, 120));
  const storeCuts = cuts => {
    next.localLooks.lines[key] = { key: cueKey(ln.text, ln.start, ln.end, ln.part, target), cuts };
    return next;
  };
  if (mode === 'font') {
    const fonts = J.drawFontRoles(p, renderLook.style, random, false);
    // Full-random cues keep their hidden taste, just as with cue color draws.
    if (!target.randomDraw) {
      target.cueLook ||= J.cueAppearanceRule(p, renderLook.style);
      target.cueLook.fonts = { ...target.cueLook.fonts, ...fonts };
    }
    const cuts = next.localLooks.lines[key].cuts;
    for (const cut of cuts) J.retargetCutFonts(cut, fonts, renderLook);
    if (target.randomDraw) target.randomDraw.cuts = clone(cuts);
    return storeCuts(cuts);
  }
  if (mode === 'global') {
    const baseline = J.globalLookBaseline(p, current);
    next.globalLook = baseline;
    // A fresh draw in the global framework: discard local look, explicit techniques,
    // forced cut counts and full-random snapshots; retain cue text and timestamps.
    for (const k of Object.keys(target)) if (!['seed', 'drawSerial', 'reroll', 'motionPitch'].includes(k)) delete target[k];
    const draft = { ...next, ...clone(baseline.values), _unifyPalettes: clone(baseline.palettes) };
    const fresh = J.plan(draft, audio), source = targetPlan(fresh, index);
    const look = { style: source.style, styleKey: source.styleKey, fx: source.fx, hud: source.hud };
    const cuts = J.lineSnapshot(fresh, index);
    if (!cuts?.length) throw new Error(J.layerText('この字幕を再抽選できません。', 'This subtitle cannot be rerolled.'));
    for (const c of cuts) c.renderLook = clone(look);
    // Subsequent Q/6 now uses this global base, instead of the abandoned local taste.
    target.cueLook = { ...ruleFrom(draft), palette: clone(source.style.schemes), palettes: clone(source.unifyPalettes || []), unifyMode: 'local' };
    return storeCuts(cuts);
  }
  if (mode === 'random') {
    const restore = clone(baseOverride(ov));
    const cuts = J.makeRandomCue(next, current, index, audio, random);
    for (const k of Object.keys(target)) if (!['seed', 'drawSerial', 'reroll', 'cueLook', 'motionPitch'].includes(k)) delete target[k];
    target.randomDraw = { restore, text: ln.text, cuts };
    return storeCuts(cuts);
  }
  const effective = ov.cueLook ? J.cueLookProject(p, ov.cueLook) : p;
  let rule = ov.cueLook ? clone(ov.cueLook) : { ...ruleFrom(p), palette: clone(renderLook.style.schemes), palettes: clone(base.unifyPalettes || []) };
  if (mode === 'color' && ov.randomDraw) rule.palette = clone(renderLook.style.schemes);
  if (mode !== 'fine') {
    if (mode === 'all' || mode === 'style' || mode === 'mood') {
      const draw = J.omakase(effective, random, { theme: p.theme, ...(mode === 'style' ? { mood: effective.mood } : mode === 'mood' ? { style: effective.style } : {}) });
      if (draw.themeSnapshots) next.themeSnapshots = draw.themeSnapshots;
      const themed = { ...effective, ...draw };
      if (mode === 'all') {
        for (const k of Object.keys(target)) if (!['seed', 'drawSerial', 'reroll', 'motionPitch'].includes(k)) delete target[k];
        rule = { ...ruleFrom(themed), palette: clone(J.resolveStyle(themed).schemes), palettes: [] };
      } else if (mode === 'style') {
        Object.assign(rule, { style: draw.style, fonts: draw.fonts, enabled: broadPool(themed, effective.mood, random), palettes: [] });
        clearGroups(target, ['layout', 'bg', 'treat']);
      } else {
        Object.assign(rule, { mood: draw.mood, fx: draw.fx, enabled: draw.enabled, palettes: [] });
        clearGroups(target, ['enter', 'exit', 'hold', 'decor', 'cam', 'trans', 'treat']);
      }
      Object.assign(rule, J.themeDrawSwitches(draw), { lookTheme: draw.lookTheme });
      rule.unifyMode = 'local';
    } else if (mode === 'motion') {
      rule.enabled = broadPool(effective, effective.mood, random);
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
J.firstCuePreviewTime = plan => {
  let first = Infinity;
  for (const line of plan?.lines || []) {
    if (!line.interlude && line.text?.length && Number.isFinite(line.start)) first = Math.min(first, line.start);
  }
  return Number.isFinite(first) ? Math.max(0, first - 0.5) : 0;
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
