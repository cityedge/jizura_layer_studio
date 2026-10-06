/* Portable motion recipes. Layouts replay their initial RNG with new text and
   geometry; concrete cuts remain independent of the shared browser library. */
(() => {
'use strict';
const copy = x => JSON.parse(JSON.stringify(x)), tr = J.layerText;
const fail = (ja, en) => { throw new Error(tr(ja, en)); };
for (const [id, def] of Object.entries(J.LAYOUTS)) {
  const plan = def.plan;
  if (!plan) continue;
  def.plan = function(rng, ctx, style) {
    const seed = rng.state?.(), params = plan.call(this, rng, ctx, style);
    if (params && Number.isInteger(seed)) params._motionPlan = { version: 1, layout: id, seed, fontRoles: copy(style.fonts) };
    return params;
  };
}
const defaults = J.defaultProject, upgrade = J.upgradeLayerProject, omakase = J.omakase, reroll = J.prepareCueReroll;
J.defaultProject = () => ({ ...defaults(), motionRecipeVersion: 1 });
J.upgradeLayerProject = (p, source) => { upgrade(p, source); p.motionRecipeVersion = !source || source.motionRecipeVersion === 1 ? 1 : 0; };
J.omakase = (...args) => ({ ...omakase(...args), motionRecipeVersion: 1 });
J.prepareCueReroll = (p, current, index, audio, mode = 'fine') => {
  const next = reroll(p, current, index, audio, mode);
  if (!['color', 'font'].includes(mode)) next.overrides[index].motionRecipeVersion = 1;
  if (next.overrides[index].randomDraw && !['color', 'font'].includes(mode)) delete next.overrides[index].randomDraw.libraryName;
  J.rekeyLocalLooks(next, current, audio);
  return next;
};
const fontField = k => /font/i.test(k) || /^(hand|rf|fo|fb|fs|fc|fr|main|qf|pen|hf|df|sf|gf|fm|nf)$/.test(k);
function fontValues(value, path = [], key = '', out = []) {
  if (key === '_motionPlan') return out;
  if (typeof value === 'string' && fontField(key) && J.FONTS[value]) out.push([path, value]);
  else if (value && typeof value === 'object') for (const [k, v] of Object.entries(value)) fontValues(v, [...path, k], Array.isArray(value) ? key : k, out);
  return out;
}
function replayParams(recipe, text, W, H, dur, style) {
  const d = J.LAYOUTS[recipe.layout], n = J.glyphCount(text);
  if (!d) fail('レイアウトがありません。', 'Missing layout.');
  const initialStyle = recipe.fontRoles ? { ...style, fonts: copy(recipe.fontRoles) } : style;
  const params = d.plan(J.rng(recipe.seed), { text, n, W, H, dur }, initialStyle);
  for (const [path, value] of recipe.fonts) {
    let obj = params;
    for (const key of path.slice(0, -1)) obj = obj?.[key];
    if (obj && Object.hasOwn(obj, path.at(-1))) obj[path.at(-1)] = value;
  }
  return params;
}
J.replayMotionParams = replayParams;
function recorded(params, layout) {
  const p = params?._motionPlan;
  if (p?.version !== 1 || p.layout !== layout || !Number.isInteger(p.seed)) fail('設定情報がありません。字幕を再生成してから保存してください。', 'No generation settings. Regenerate this subtitle before saving.');
  return { layout, seed: p.seed, fonts: fontValues(params), ...(p.fontRoles ? { fontRoles: copy(p.fontRoles) } : {}) };
}
J.recordMotionParams = recorded;
J.captureMotionRecipe = (p, current, index) => {
  const ln = current.lines.find(l => l.index === index), ov = p.overrides?.[index] || {};
  if (!ln || !ln.text.length || ln.interlude) fail('保存できる字幕を選択してください。', 'Select a subtitle to save.');
  if (p.motionRecipeVersion !== 1 && ov.motionRecipeVersion !== 1) fail('設定情報がありません。字幕を再生成してから保存してください。', 'No generation settings. Regenerate this subtitle before saving.');
  const cuts = J.lineSnapshot(current, index), base = current.layerGroups?.find(g => g.indices.includes(index))?.plan || current;
  if (!cuts?.length || cuts.length > 128) fail('保存できるカットがありません。', 'No supported cuts to save.');
  const rule = ov.cueLook || J.cueAppearanceRule(p, base.style);
  const recipe = { version: 1, rule: copy(rule), lang: current.lang, duration: ln.visEnd - ln.start,
    motionPitch: J.cueMotionPitch(p, index),
    centerFree: !!p.centerFree, centerDir: p.centerDir, aspect: p.aspect, userFonts: copy(p.userFonts || []),
    themeSnapshot: copy(p.themeSnapshots?.[rule.lookTheme] || null), cuts: [] };
  cuts.forEach((c, i) => {
    const layoutPlan = recorded(c.params, c.layout), twinPlan = c.twinParams ? recorded(c.twinParams, c.layout) : null;
    const shape = { chars: J.glyphCount(c.utext), words: J.chunkText(c.utext).map(w => J.glyphCount(w)), whitespace: J.isWhitespaceText(c.utext) };
    const renderLook = c.renderLook || { style: base.style, styleKey: base.styleKey, fx: base.fx, hud: base.hud };
    delete c.utext; delete c.params; delete c.twinParams;
    recipe.cuts.push({ ...c, renderLook: copy(renderLook), layoutPlan, twinPlan, shape });
  });
  return J.validateMotionRecipe(recipe);
};
// Bounded plain JSON only. Never execute imported code or merge prototype keys.
J.validateMotionRecipe = input => {
  if (!input || JSON.stringify(input).length > 2000000) fail('モーションデータが不正または大きすぎます。', 'Invalid or oversized motion data.');
  function walk(x, depth = 0) {
    if (depth > 24) throw new Error('Invalid motion depth');
    if (typeof x === 'number' && !Number.isFinite(x)) throw new Error('Invalid motion number');
    if (typeof x === 'string' && x.length > 50000) throw new Error('Invalid motion string');
    if (x && typeof x === 'object') for (const [k, v] of Object.entries(x)) {
      if (['__proto__', 'prototype', 'constructor'].includes(k)) throw new Error('Invalid motion key');
      walk(v, depth + 1);
    }
  }
  walk(input);
  const r = copy(input);
  r.motionPitch = J.normalizeMotionPitch(r.motionPitch);
  if (r.version !== 1 || !Array.isArray(r.cuts) || !r.cuts.length || r.cuts.length > 128 || !(r.duration > 0 && r.duration <= 3600) || !J.STYLES[r.rule?.style]) throw new Error('Unsupported motion recipe');
  for (const c of r.cuts) {
    for (const [key, registry] of [['layout', J.LAYOUTS], ['enter', J.ENTER], ['exit', J.EXIT], ['hold', J.HOLD], ['bg', J.BG], ['treat', J.TREAT], ['cam', J.CAMERA]])
      if (!Object.hasOwn(registry, c[key])) throw new Error('Unknown motion component: ' + key);
    if (c.trans && !Object.hasOwn(J.TRANS, c.trans)) throw new Error('Unknown transition');
    if (!Array.isArray(c.decor) || c.decor.some(d => !Object.hasOwn(J.DECOR, d.id))) throw new Error('Unknown decoration');
    if (!(c.fraction > 0 && c.fraction <= 3600) || !Number.isInteger(c.shape?.chars) || c.shape.chars < 1 || c.shape.chars > 5000) throw new Error('Invalid motion duration/text shape');
    if (!Array.isArray(c.shape.words) || c.shape.words.length > 5000 || c.shape.words.some(n => !Number.isInteger(n) || n < 1 || n > 5000) || c.shape.words.reduce((a, n) => a + n, 0) > 5000) throw new Error('Invalid sample word lengths');
    if (!c.renderLook?.style?.schemes?.length || !c.renderLook.style.fonts || !c.renderLook.fx) throw new Error('Missing motion appearance');
    for (const spec of [c.layoutPlan, c.twinPlan].filter(Boolean)) {
      if (spec.layout !== c.layout || !Number.isInteger(spec.seed) || !Array.isArray(spec.fonts)) throw new Error('Missing layout initial state');
      if (spec.fontRoles && (typeof spec.fontRoles !== 'object' || Array.isArray(spec.fontRoles) || Object.entries(spec.fontRoles).some(([role, v]) => !['display', 'serif', 'body', 'mono'].includes(role) || !Array.isArray(v) || !v.length || v.some(k => typeof k !== 'string' || !(Object.hasOwn(J.FONTS, k) || J.SAFE_FONT_KEY.test(k)))))) throw new Error('Invalid initial font roles');
      for (const item of spec.fonts) if (!Array.isArray(item) || !Array.isArray(item[0]) || !item[0].length || item[0].length > 20 || item[0].some(k => typeof k !== 'string' || ['__proto__', 'prototype', 'constructor'].includes(k)) || typeof item[1] !== 'string') throw new Error('Invalid font path');
    }
    if (!c.layoutPlan) throw new Error('Missing layout recipe');
  }
  if (!Array.isArray(r.userFonts) || r.userFonts.some(f => !f || !J.SAFE_FONT_KEY.test(f.key) || typeof f.family !== 'string')) throw new Error('Invalid installed font references');
  if (r.themeSnapshot && !J.normalizeUserTheme(r.themeSnapshot)) throw new Error('Invalid theme snapshot');
  return r;
};
function distribute(text, cuts) {
  const parts = /[A-Za-z]/.test(text) && /\s/.test(text.trim()) ? text.match(/\S+\s*/gu) : Array.from(text);
  const regular = cuts.filter(c => !c.recap), total = regular.reduce((a, c) => a + c.shape.chars, 0);
  if (!parts || parts.length < regular.length) fail('字幕が短すぎて、保存されたカット数に分割できません。', 'This subtitle is too short for the saved cut count.');
  const prefix = [0]; for (const part of parts) prefix.push(prefix.at(-1) + J.glyphCount(part));
  let from = 0, accum = 0, k = 0;
  return cuts.map(c => {
    if (c.recap) return text;
    accum += c.shape.chars; k++;
    let to = parts.length;
    if (k !== regular.length) {
      const target = prefix.at(-1) * accum / total; let best = Infinity;
      for (let j = from + 1; j <= parts.length - (regular.length - k); j++) {
        const distance = Math.abs(prefix[j] - target);
        if (distance < best) { best = distance; to = j; }
      }
    }
    const s = J.trimText(parts.slice(from, to).join('')); from = to; return s;
  });
}
J.prepareMotionApply = (project, current, index, input, audio, sampleUnits = null) => {
  const recipe = J.validateMotionRecipe(input), ln = current.lines.find(l => l.index === index);
  if (!ln || !ln.text.length || ln.interlude) fail('適用先の字幕を選択してください。', 'Select a destination subtitle.');
  if (project.overrides?.[index]?.lock) fail('この字幕はロック中です。', 'This subtitle is locked.');
  if (!!project.centerFree !== recipe.centerFree) fail('「中央を空ける」の設定が保存元と異なります。', 'The “Keep center clear” setting differs from the saved motion.');
  const next = copy(project), text = sampleUnits || distribute(ln.text, recipe.cuts), duration = ln.visEnd - ln.start;
  const cuts = J.fitRandomCueCuts(recipe.cuts, duration);
  cuts.forEach((c, i) => {
    c.utext = text[i]; c.params = {}; c.twinParams = null;
    for (const d of [J.ENTER[c.enter], J.EXIT[c.exit]]) if (d.minDur && c.fraction * recipe.motionPitch < d.minDur) fail('字幕の時間が登場／退場の条件に合いません。', 'Duration does not meet entrance/exit requirements.');
    if (c.fraction < 0.12) fail('字幕の時間が短すぎます。', 'The subtitle duration is too short.');
  });
  J.captureLocalLooks(next, current, audio);
  next.overrides ||= {};
  const rule = copy(recipe.rule);
  if (recipe.themeSnapshot) {
    next.themeSnapshots ||= {};
    const stem = 'saved-motion-' + J.h(J.sid(JSON.stringify(recipe.themeSnapshot)), 15).toString(16);
    let key = stem;
    for (let n = 1; next.themeSnapshots[key] && JSON.stringify(next.themeSnapshots[key]) !== JSON.stringify(recipe.themeSnapshot); n++) key = stem + '-' + n;
    next.themeSnapshots[key] = copy(recipe.themeSnapshot); rule.lookTheme = key;
  }
  next.overrides[index] = { cueLook: rule, motionRecipeVersion: 1, motionPitch: recipe.motionPitch, seed: project.overrides?.[index]?.seed || 0,
    randomDraw: { library: true, restore: { cueLook: copy(rule), motionRecipeVersion: 1, motionPitch: recipe.motionPitch }, text: ln.text, cuts } };
  // First obtain the destination's actual split text and zones from the planner.
  delete next.localLooks.lines[project.subtitleCues?.[index]?.id ?? ('line-' + index)];
  const draft = J.plan(next, audio), generated = draft.cuts.filter(c => c.line === index && c.utext != null);
  if (generated.length !== cuts.length) fail('この字幕にはカット構成を適用できません。', 'This cut structure cannot be applied to this subtitle.');
  cuts.forEach((c, i) => {
    const actual = generated[i], saved = recipe.cuts[i], st = c.renderLook.style;
    const n = Math.max(J.glyphCount(actual.text), actual.companion ? J.glyphCount(actual.companion.text) : 0);
    if (J.LAYOUTS[c.layout].fits && !J.LAYOUTS[c.layout].fits(n)) fail('この文字数ではレイアウトを適用できません。', 'This layout does not support this text length.');
    for (const d of [J.ENTER[c.enter], J.EXIT[c.exit]]) if (d.maxChars && n > d.maxChars) fail('字幕の文字数が登場／退場の条件に合いません。', 'Text length does not meet entrance/exit requirements.');
    c.motionPitch = recipe.motionPitch;
    c.params = replayParams(saved.layoutPlan, actual.text, actual.zone?.w || draft.W, actual.zone?.h || draft.H, c.fraction * recipe.motionPitch, st);
    c.twinParams = actual.companion ? replayParams(saved.twinPlan || saved.layoutPlan, actual.companion.text, actual.companion.zone.w, actual.companion.zone.h, c.fraction * recipe.motionPitch, st) : null;
    for (const k of ['layoutPlan', 'twinPlan', 'shape']) delete c[k];
  });
  const key = project.subtitleCues?.[index]?.id ?? ('line-' + index);
  next.localLooks.lines[key] = { cuts: copy(cuts) };
  J.rekeyLocalLooks(next, current, audio);
  // Font records contain installed-family names, never font binaries.
  const fonts = new Map((next.userFonts || []).map(f => [f.key, f]));
  for (const f of recipe.userFonts || []) {
    if (fonts.has(f.key) && fonts.get(f.key).family !== f.family) fail('同じ識別子の別フォントが使われています。', 'A different font uses the same identifier.');
    fonts.set(f.key, copy(f));
  }
  next.userFonts = [...fonts.values()];
  return next;
};
J.motionSampleProject = input => {
  const r = J.validateMotionRecipe(input), p = J.defaultProject(), alphabet = Array.from(r.lang === 'en' ? 'JIZURALayerStudio' : '字面光景音楽世界未来');
  const word = n => Array.from({length:n}, (_, i) => alphabet[i % alphabet.length]).join('');
  const units = r.cuts.map(c => c.shape.whitespace ? '　'.repeat(c.shape.chars) : c.shape.words?.length ? c.shape.words.map(word).join(' ') : word(c.shape.chars));
  const text = units.filter((_, i) => !r.cuts[i].recap).join(' ');
  Object.assign(p, { ...copy(r.rule), aspect: r.aspect, centerFree: r.centerFree, centerDir: r.centerDir, lang: r.lang,
    subtitleCues: [{ id: 'motion-sample', text, start: 0, end: r.duration }], overrides: {} });
  p.userFonts = copy(r.userFonts || []);
  return J.prepareMotionApply(p, J.plan(p), 0, r, null, units);
};
J.motionLibraryKey = 'jizura.layers.motions.v1';
J.parseMotionLibrary = data => {
  if (data?.format !== 'jizura-motion-library' || data.version !== 1 || !Array.isArray(data.items) || data.items.length > 500) throw new Error(tr('モーションライブラリJSONではありません。', 'Not a supported motion library JSON.'));
  const ids = new Set();
  return data.items.map(item => {
    if (typeof item.id !== 'string' || !/^[\w-]{1,100}$/.test(item.id) || typeof item.name !== 'string' || !item.name.trim() || item.name.length > 120) throw new Error('Invalid motion name or ID');
    if (ids.has(item.id)) throw new Error('Duplicate motion ID');
    ids.add(item.id);
    return { id: item.id, name: item.name, recipe: J.validateMotionRecipe(item.recipe) };
  });
};
})();
