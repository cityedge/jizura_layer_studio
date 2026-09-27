/* Filler cues are editable placeholders; their identity is independent of their text. */
(() => {
'use strict';
const tr = J.layerText, kinds = J.fillerKinds = ['spaces', 'lyrics', 'timestamp', 'symbols'];
J.defaultFillerSettings = () => ({ threshold: 5, preGap: 0.3, postGap: 0.5, length: 'normal',
  types: { spaces: { enabled: true, weight: 3 }, lyrics: { enabled: true, weight: 8 }, timestamp: { enabled: true, weight: 2 }, symbols: { enabled: true, weight: 1 } } });
J.normalizeFillerSettings = value => {
  const out = J.defaultFillerSettings();
  for (const key of ['threshold', 'preGap', 'postGap']) if (Number.isFinite(value?.[key]))
    out[key] = Math.max(key === 'threshold' ? 0.1 : 0, Math.min(600, value[key]));
  if (['short', 'normal', 'long'].includes(value?.length)) out.length = value.length;
  for (const key of kinds) {
    const v = value?.types?.[key];
    if (typeof v?.enabled === 'boolean') out.types[key].enabled = v.enabled;
    if (Number.isFinite(v?.weight)) out.types[key].weight = Math.max(1, Math.min(10, Math.round(v.weight)));
  }
  return out;
};
const defaults = J.defaultProject, upgrade = J.upgradeLayerProject;
J.defaultProject = () => ({ ...defaults(), fillerSettings: J.defaultFillerSettings() });
J.upgradeLayerProject = (project, source) => {
  upgrade(project, source); project.fillerSettings = J.normalizeFillerSettings(project.fillerSettings); return project;
};
J.cueTimestamp = time => {
  const ms = Math.max(0, Math.round(time * 1000));
  return String(Math.floor(ms / 60000)).padStart(2, '0') + ' ' + String(Math.floor(ms / 1000) % 60).padStart(2, '0') + ' ' + String(ms % 1000).padStart(3, '0');
};
J.resolveCueText = cue => cue.text.replace(/\[timestamp\]/g, () => J.cueTimestamp(cue.start));
const segmenter = typeof Intl !== 'undefined' && Intl.Segmenter ? new Intl.Segmenter(undefined, { granularity: 'grapheme' }) : null;
const charCount = text => segmenter ? [...segmenter.segment(text.replace(/\s/g, ''))].length : [...text.replace(/\s/g, '')].length;
J.fillerAnalysis = (project, settings, media = {}) => {
  const normal = (project.subtitleCues || []).filter(c => !c.filler).slice().sort((a, b) => a.start - b.start);
  if (!normal.length) throw new Error(tr('先にSRT字幕を読み込んでください。', 'Import SRT subtitles first.'));
  const cfg = J.normalizeFillerSettings(settings), durations = normal.map(c => c.end - c.start).sort((a, b) => b - a);
  const top = durations.slice(0, Math.ceil(durations.length / 2));
  const baseline = top.reduce((a, b) => a + b, 0) / top.length;
  const meanChars = normal.reduce((sum, c) => sum + charCount(J.resolveCueText(c)), 0) / normal.length;
  const spans = [];
  for (const c of normal) {
    const last = spans[spans.length - 1];
    if (last && c.start <= last.end) last.end = Math.max(last.end, c.end);
    else spans.push({ start: c.start, end: c.end });
  }
  const lastEnd = spans[spans.length - 1].end;
  const positive = n => Number.isFinite(n) && n > 0;
  const basis = positive(media.audioDuration) ? 'audio' : positive(media.spectrumDuration) ? 'spectrum' : 'subtitles';
  const horizon = Math.max(lastEnd, basis === 'audio' ? media.audioDuration : basis === 'spectrum' ? media.spectrumDuration : lastEnd);
  const gaps = [];
  const add = (start, end) => { if (end > start && end - start + 1e-9 >= cfg.threshold) gaps.push({ start, end }); };
  add(0, spans[0].start - cfg.postGap);
  for (let i = 1; i < spans.length; i++) add(spans[i - 1].end + cfg.preGap, spans[i].start - cfg.postGap);
  add(lastEnd + cfg.preGap, horizon);
  // Keep extremely short source cues from generating unmanageable numbers of placeholders.
  const target = Math.max(0.25, baseline * ({ short: 0.75, normal: 1, long: 1.5 }[cfg.length]));
  const countFor = gap => Math.max(1, Math.round((gap.end - gap.start) / target));
  return { cfg, normal, baseline, meanChars, target, gaps, horizon, basis, count: gaps.reduce((n, g) => n + countFor(g), 0), countFor };
};
function symbolText(n, random, previous) {
  const pool = [...'○●△▲□■◇◆×＋＃＊'];
  const pick = () => pool[Math.floor(random() * pool.length)];
  let pattern = Math.floor(random() * 4);
  if (pattern === previous) pattern = (pattern + 1 + Math.floor(random() * 3)) % 4;
  const a = pick(); let b = pick(); if (a === b) b = pool[(pool.indexOf(a) + 1) % pool.length];
  let chars;
  if (pattern === 0) chars = Array(n).fill(a);
  else if (pattern === 1) chars = Array.from({ length: n }, pick);
  else if (pattern === 2) chars = Array.from({ length: n }, (_, i) => i % 2 ? b : a);
  else { const half = Array.from({ length: Math.ceil(n / 2) }, pick); chars = half.concat(half.slice(0, Math.floor(n / 2)).reverse()); }
  return { text: chars.join(''), pattern };
}
// Pure preparation: validation failures never delete the currently edited fillers.
J.prepareFillers = (project, settings, media, random = Math.random) => {
  const a = J.fillerAnalysis(project, settings, media), enabled = kinds.filter(k => a.cfg.types[k].enabled);
  if (!enabled.length) throw new Error(tr('フィラーの種類を1つ以上選んでください。', 'Select at least one filler type.'));
  if (a.count + a.normal.length > 20000) throw new Error(tr('字幕が20,000件を超えます。長さや閾値を大きくしてください。', 'More than 20,000 cues. Increase the duration or gap threshold.'));
  const totalWeight = enabled.reduce((n, k) => n + a.cfg.types[k].weight, 0);
  const used = new Set(project.subtitleCues.map(c => c.id)); let serial = 0, previous = -1;
  // Fresh identities keep look-history entries from reattaching to a later generation.
  const prefix = 'filler-' + (globalThis.crypto?.randomUUID?.() || Date.now().toString(36) + '-' + Math.random().toString(36).slice(2));
  const fillers = [];
  for (const gap of a.gaps) {
    const count = a.countFor(gap), weights = Array.from({ length: count }, () => 0.8 + random() * 0.4);
    const sum = weights.reduce((x, y) => x + y, 0); let elapsed = 0, start = gap.start;
    for (let i = 0; i < count; i++) {
      elapsed += weights[i];
      const end = i === count - 1 ? gap.end : gap.start + (gap.end - gap.start) * elapsed / sum;
      let draw = random() * totalWeight, type = enabled[enabled.length - 1];
      for (const k of enabled) { draw -= a.cfg.types[k].weight; if (draw < 0) { type = k; break; } }
      let text;
      if (type === 'spaces') text = Array.from({ length: 3 + Math.floor(random() * 2) }, () => '　'.repeat(2 + Math.floor(random() * 4))).join(' ');
      else if (type === 'timestamp') text = '[timestamp]';
      else if (type === 'lyrics') text = a.normal[Math.floor(random() * a.normal.length)].text;
      else {
        const n = Math.max(1, Math.min(120, Math.round(a.meanChars * (0.75 + random() * 0.5))));
        const result = symbolText(n, random, previous); text = result.text; previous = result.pattern;
      }
      let id; do { id = prefix + '-' + (++serial); } while (used.has(id)); used.add(id);
      fillers.push({ id, start, end, text, filler: true }); start = end;
    }
  }
  return { settings: a.cfg, fillers };
};
J.replaceFillers = (project, prepared) => {
  const entries = project.subtitleCues.map((cue, i) => ({ cue, override: project.overrides?.[i] }))
    .filter(e => !e.cue.filler).concat(prepared.fillers.map(cue => ({ cue }))).sort((a, b) => a.cue.start - b.cue.start);
  const cues = J.validateCues(entries.map(e => e.cue));
  project.subtitleCues = cues;
  project.overrides = Object.fromEntries(entries.flatMap((e, i) => e.override ? [[i, e.override]] : []));
  project.lyrics = cues.map(c => c.text).join('\n\n');
  project.fillerSettings = J.normalizeFillerSettings(prepared.settings);
  project.timing.lineTimes = {}; project.exportRange = null;
};

// Plan normal lyrics independently: adding fillers must not shift their random seeds,
// palette history, cut choices, transitions or timed effects. The editor sees one timeline.
const plan = J.plan, tracks = J.layerTracks, snapshot = J.lineSnapshot;
J.plan = (project, audio) => {
  if (!Array.isArray(project.subtitleCues)) return plan(project, audio);
  const entries = project.subtitleCues.map((cue, index) => ({ cue, index }));
  const make = group => plan({ ...project, lyrics: group.map(e => e.cue.text).join('\n\n'),
    subtitleCues: group.map(e => ({ ...e.cue, text: J.resolveCueText(e.cue) })),
    overrides: Object.fromEntries(group.map((e, i) => [i, project.overrides?.[e.index] || {}])) }, audio);
  const normal = entries.filter(e => !e.cue.filler), filler = entries.filter(e => e.cue.filler);
  if (!filler.length || !normal.length) return make(entries);
  const normalPlan = make(normal), fillerPlan = make(filler);
  const groups = [{ plan: fillerPlan, indices: filler.map(e => e.index) }, { plan: normalPlan, indices: normal.map(e => e.index) }];
  const out = { ...normalPlan, duration: Math.max(normalPlan.duration, fillerPlan.duration), layerGroups: groups };
  out.lines = groups.flatMap(g => g.plan.lines.map(l => ({ ...l, index: g.indices[l.index] }))).sort((a, b) => a.index - b.index);
  out.cuts = groups.flatMap(g => g.plan.cuts.map(c => ({ ...c, line: g.indices[c.line] }))).sort((a, b) => a.start - b.start).map((c, index) => ({ ...c, index }));
  out.events = groups.flatMap(g => g.plan.events).sort((a, b) => a.t - b.t);
  return out;
};
J.layerTracks = plan => plan.layerGroups ? plan.layerGroups.flatMap(g => tracks({ ...g.plan, bloomThreshold: plan.bloomThreshold })) : tracks(plan);
J.lineSnapshot = (plan, index) => {
  if (!plan.layerGroups) return snapshot(plan, index);
  const group = plan.layerGroups.find(g => g.indices.includes(index));
  return group ? snapshot(group.plan, group.indices.indexOf(index)) : null;
};
})();
