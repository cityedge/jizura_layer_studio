/* User themes are editable recipes. Applied recipes are immutable, shared once
   inside a project; cue/global looks refer to them without consulting the library. */
(() => {
'use strict';
const has = (o, k) => !!o && Object.hasOwn(o, k);
J.USER_THEME_RANDOM = 'random';
J.USER_THEME_FROM_MOOD = 'fromMood';
J.newUserThemeId = () => 'user-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
J.normalizeUserTheme = value => {
  if (!value || typeof value !== 'object' || typeof value.id !== 'string' || !/^user-[\w-]{1,100}$/.test(value.id)) return null;
  const name = typeof value.name === 'string' ? value.name.replace(/[\x00-\x1f]/g, '').trim().slice(0, 80) : '';
  if (!name) return null;
  const weights = (input, keys) => Object.fromEntries(['random', ...keys].filter(k => has(input, k) && Number.isInteger(input[k]) && input[k] > 0 && input[k] <= 10).map(k => [k, input[k]]));
  const styles = weights(value.styles, ['fromMood', ...J.STYLE_ORDER]), moods = weights(value.moods, Object.keys(J.MOODS));
  if (!Object.keys(styles).length || !Object.keys(moods).length) return null;
  return { id: value.id, name, styles, moods };
};
J.normalizeUserThemes = values => {
  const out = [], seen = new Set();
  for (const value of Array.isArray(values) ? values : []) {
    const t = J.normalizeUserTheme(value);
    if (t && !seen.has(t.id)) { seen.add(t.id); out.push(t); }
  }
  return out;
};
J.mergeUserThemeLists = (existing, incoming) => {
  const themes = J.normalizeUserThemes(existing), idMap = {};
  const content = t => JSON.stringify({ ...t, id: '' });
  for (const t of J.normalizeUserThemes(incoming)) {
    const found = themes.find(x => x.id === t.id);
    if (!found) { themes.push(t); idMap[t.id] = t.id; }
    else if (content(found) === content(t)) idMap[t.id] = t.id;
    else {
      // Reimporting a conflicting revision reuses its previous imported copy.
      const same = themes.find(x => content(x) === content(t));
      const added = same || { ...t, id: J.newUserThemeId() };
      if (!same) themes.push(added);
      idMap[t.id] = added.id;
    }
  }
  return { themes, idMap };
};
J.parseUserThemeFile = value => {
  if (value?.format !== 'jizura-user-themes' || ![1, 2].includes(value.version) || !Array.isArray(value.themes)) throw new Error('Invalid user theme file');
  for (const t of value.themes) {
    if (!J.normalizeUserTheme(t)) throw new Error('Invalid theme or empty weights');
    for (const weights of [t.styles, t.moods]) if (!weights || Object.values(weights).some(w => !Number.isInteger(w) || w < 0 || w > 10)) throw new Error('Invalid weight');
  }
  const themes = J.normalizeUserThemes(value.themes);
  if (themes.length !== value.themes.length) throw new Error('Duplicate theme ID');
  return themes;
};
// Older apps must reject, rather than silently drop, the new draw instruction.
J.userThemesFile = themes => ({ format: 'jizura-user-themes', version: themes.some(t => t.styles.fromMood > 0) ? 2 : 1, themes });
J.normalizeThemeSnapshots = values => Object.fromEntries(Object.entries(values && typeof values === 'object' && !Array.isArray(values) ? values : {})
  .filter(([id, t]) => /^saved-[\w-]{1,100}$/.test(id) && J.normalizeUserTheme(t))
  .map(([id, t]) => [id, J.normalizeUserTheme(t)]));
const systemNormalize = J.normalizeTheme;
J.normalizeTheme = (value, project) => systemNormalize(value) || (typeof value === 'string' && project?.userThemes?.some(t => t.id === value) ? value : '');
J.normalizeLookTheme = (value, project) => systemNormalize(value) || (typeof value === 'string' && /^saved-[\w-]+$/.test(value) && has(project?.themeSnapshots, value) ? value : '');
J.appliedThemeName = (value, project) => {
  const key = J.normalizeLookTheme(value, project), t = J.THEMES[key];
  return t ? J.layerText(t.name, t.en) : project?.themeSnapshots?.[key]?.name || '';
};
J.userThemeFor = (project, value = project.theme) => J.normalizeUserTheme(project.userThemes?.find(t => t.id === value));
J.themeDrawSwitches = draw => Object.fromEntries(['extra', 'wa', 'horror', 'typo', 'kinetic'].filter(k => draw[k] === true).map(k => [k, true]));
J.moodStyleCandidates = (project, mood, themePart = () => false) => {
  const M = J.MOODS[mood] || J.MOODS.chaos;
  const allowed = J.STYLE_ORDER.filter(k => {
    const d = J.STYLES[k];
    return d && (!J.randomOk || J.randomOk(project, 'style', k)) &&
      (themePart(d) || !d.set || !Object.values(J.MOODS).some(m => m.set === d.set) || M.set === d.set);
  });
  const preferred = [...new Set([...(M.styles || []), ...J.STYLE_ORDER.filter(k => (J.STYLES[k].moods || []).includes(mood))])].filter(k => allowed.includes(k));
  return { allowed, preferred };
};
const moodContext = (project, mood) => J.MOODS[mood]?.set ? { ...project, [J.MOODS[mood].set]: true } : project;
J.chooseStyleFromMood = (project, mood, rnd) => {
  const pick = a => a[Math.min(a.length - 1, Math.floor(rnd() * a.length))];
  // A manually edited cue may never have had a mood assigned. Keep it unset,
  // and use the same available-style pool as the ordinary random entry.
  if (!has(J.MOODS, mood)) return pick(J.STYLE_ORDER.filter(k => J.randomOk(project, 'style', k)));
  const { allowed, preferred } = J.moodStyleCandidates(moodContext(project, mood), mood);
  let pool = (preferred.length && rnd() < 0.72 ? preferred : allowed).filter(k => k !== project.style);
  if (!pool.length) pool = allowed.filter(k => k !== project.style);
  if (!pool.length) pool = allowed;
  return pick(pool);
};
J.approximateMoodStyleWeights = (project, mood) => {
  if (!has(J.MOODS, mood)) throw new Error('Unknown reference mood');
  const { allowed, preferred } = J.moodStyleCandidates(moodContext(project, mood), mood), n = preferred.length;
  if (!n) return { weights: { random: 1 }, preferredCount: 0, availableCount: allowed.length, mainShare: 0 };
  // Equal weights preserve the uniform draw within the preferred pool. Search
  // all integer pairs and prefer a smaller total on ties; never exclude a main
  // candidate just to make the branch ratio look more accurate.
  let best;
  for (let weight = 1; weight <= 10; weight++) for (let random = 1; random <= 10; random++) {
    const total = n * weight + random, mainShare = n * weight / total, error = Math.abs(mainShare - 0.72);
    if (!best || error < best.error - 1e-12 || (Math.abs(error - best.error) < 1e-12 && total < best.total)) best = { weight, random, total, mainShare, error };
  }
  return { weights: { random: best.random, ...Object.fromEntries(preferred.map(k => [k, best.weight])) }, preferredCount: n, availableCount: allowed.length, mainShare: best.mainShare };
};
J.prepareUserThemeDraw = (project, theme, rnd, options = {}) => {
  const choose = (weights, allowed) => {
    const entries = Object.entries(weights), total = entries.reduce((n, [, w]) => n + w, 0);
    let at = rnd() * total, key = entries.at(-1)[0];
    for (const [k, w] of entries) { at -= w; if (at < 0) { key = k; break; } }
    if (key !== 'random') return key;
    if (!allowed.length) throw new Error(J.layerText('ランダム抽選に使える候補がありません。', 'No candidates are available for the random draw.'));
    return allowed[Math.min(allowed.length - 1, Math.floor(rnd() * allowed.length))];
  };
  // Each random bucket uses the existing switches, not sets enabled by the other
  // dimension's explicit choice. Explicit choices never lose their stated weight.
  const mood = has(options, 'mood') ? (has(J.MOODS, options.mood) ? options.mood : null) : choose(theme.moods, Object.keys(J.MOODS).filter(k => !J.MOODS[k].set || J.setOn(project, J.MOODS[k].set)));
  const pickedStyle = has(J.STYLES, options.style) ? options.style : choose(theme.styles, J.STYLE_ORDER.filter(k => J.randomOk(project, 'style', k)));
  const style = pickedStyle === 'fromMood' ? J.chooseStyleFromMood(project, mood, rnd) : pickedStyle;
  const switches = {}, sets = new Set(); let wa = false;
  for (const d of [J.STYLES[style], J.MOODS[mood]].filter(Boolean)) {
    if (d.extra) switches.extra = true;
    if (d.wa) { wa = true; switches.wa = true; switches.extra = true; }
    if (d.set) { sets.add(d.set); switches[d.set] = true; }
  }
  const themeSnapshots = { ...(project.themeSnapshots || {}) }, serialized = JSON.stringify(theme);
  let lookTheme = Object.keys(themeSnapshots).find(id => JSON.stringify(themeSnapshots[id]) === serialized);
  if (!lookTheme) {
    const stem = 'saved-' + J.sid(serialized).toString(16); lookTheme = stem;
    for (let n = 1; has(themeSnapshots, lookTheme); n++) lookTheme = stem + '-' + n;
    themeSnapshots[lookTheme] = JSON.parse(serialized);
  }
  return { mood, style, switches, sets, wa, themeSnapshots, lookTheme };
};
})();
