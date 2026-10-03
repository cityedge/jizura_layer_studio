/* Color/font-only draws edit saved cuts, so motion and timing are not rerolled. */
(() => {
'use strict';
const copy = v => JSON.parse(JSON.stringify(v));
const roles = ['display', 'serif', 'body'];
const pick = (a, rng) => a[Math.min(a.length - 1, Math.floor(rng() * a.length))];
const serif = k => ['mincho', 'brush', 'hand'].includes(J.FONTS[k]?.kind);
const quiet = new Set(['dela', 'pop', 'reggae', 'rampart', 'potta', 'round', 'dot']);
J.drawFontRoles = (project, style, rng = Math.random, coherent = false) => {
  const available = Object.keys(J.FONTS).filter(k => !J.FONTS[k].user && J.FONTS[k].kind !== 'mono' && J.randomOk(project, 'font', k));
  const base = J.STYLES[project.style] || style, result = {};
  for (const role of roles) {
    let pool = available.filter(k => role === 'serif' ? serif(k) : role === 'body' ? ['gothic', 'mincho', 'round', 'hand'].includes(J.FONTS[k].kind) : true);
    if (coherent) {
      const calm = ['calm', 'editorial', 'emotional'].includes(project.mood);
      const compatible = pool.filter(k => !calm || !quiet.has(k));
      if (compatible.length) pool = compatible;
      const kinds = new Set((base.fonts[role] || []).map(k => J.FONTS[k]?.kind));
      const related = pool.filter(k => kinds.has(J.FONTS[k].kind));
      if (related.length) pool = related;
    }
    const changed = pool.filter(k => !(style.fonts[role] || []).includes(k));
    result[role] = pick(changed.length ? changed : pool, rng) || style.fonts[role]?.[0] || 'gothic_med';
  }
  return result;
};
// Only font-valued fields, never strings such as shape:"round" or mark:"dot".
const fontField = k => /font/i.test(k) || /^(hand|rf|fo|fb|fs|fc|fr|main|qf|pen|hf|df|sf|gf|fm|nf)$/.test(k);
J.retargetCutFonts = (cut, fonts, fallback) => {
  cut.renderLook = copy(cut.renderLook || fallback);
  const old = cut.renderLook.style.fonts;
  const replace = (value, key) => {
    if (key === '_motionPlan') return copy(value); // immutable generation inputs
    if (typeof value === 'string' && J.FONTS[value] && fontField(key)) {
      if (J.FONTS[value].kind === 'mono') return value;
      const role = /small|tile|fill|cap|^(fs|sf|gf|df|rf)$/i.test(key) ? 'body'
        : (old.serif || []).includes(value) && !(old.display || []).includes(value) ? 'serif' : 'display';
      return fonts[role];
    }
    if (Array.isArray(value)) return value.map(v => replace(v, key));
    if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([k,v]) => [k, replace(v,k)]));
    return value;
  };
  for (const key of ['params', 'twinParams', 'bgP', 'treatP', 'transP']) if (cut[key]) cut[key] = replace(cut[key], '');
  for (const role of roles) cut.renderLook.style.fonts[role] = [fonts[role]];
  return cut;
};
const colorKeys = ['bg','fg','sub','accent','accent2','ink','dim','ghostA','ghostB'];
J.paletteForStyle = (source, palette) => source.map((s,i) => {
  const d = palette[i % palette.length], result = { ...s };
  for (const k of colorKeys) if (/^#[\da-f]{6}$/i.test(d?.[k])) result[k] = d[k];
  if (s.grad) result.grad = Array.isArray(d?.grad) && d.grad.length === 2 && d.grad.every(c => /^#[\da-f]{6}$/i.test(c)) ? copy(d.grad) : [result.accent, J.mix(result.accent, '#000000', .7)];
  return result;
});
J.drawRelatedPalette = (schemes, rng = Math.random) => {
  // Rotate the whole system together. Retain its light/dark and saturation
  // structure; small neutral tints also give monochrome packs a useful variant.
  const turn = (45 + rng() * 80) * (rng() < .5 ? -1 : 1), neutralHue = rng() * 360;
  const shift = hex => {
    const [h,s,l] = J.toHsl(hex);
    return J.hsl(s < .04 ? neutralHue : h + turn, s < .04 ? .07 : s, l);
  };
  return schemes.map(s => {
    const d = { ...s };
    for (const k of colorKeys) if (s[k]) d[k] = shift(s[k]);
    if (s.grad) d.grad = s.grad.map(shift);
    // Preserve existing low-contrast ornaments; maintain readable text where
    // the original has readable contrast instead of flattening intentional dim ink.
    for (const k of ['fg','sub','accent','ghostA','ghostB']) if (s[k])
      d[k] = J.fitContrast(d[k], d.bg, Math.min(k === 'fg' ? 4.5 : 2.4, J.contrast(s[k],s.bg)));
    if (s.ink === s.fg) d.ink = d.fg;
    return d;
  });
};
const accentPalette = (schemes, colors) => schemes.map(s => {
  const d = { ...s, accent:J.fitContrast(colors.accent,s.bg,2.4), ghostA:J.fitContrast(colors.ghostA,s.bg,1.35), ghostB:J.fitContrast(colors.ghostB,s.bg,1.35) };
  if (s.ink === s.accent) d.ink = d.accent;
  if (s.grad) d.grad = [d.accent, J.mix(colors.accent,'#000000',.7)];
  return d;
});
J.prepareGlobalAppearance = (p, current, audio, mode, rng = Math.random, accents) => {
  if (!['color','font','accent'].includes(mode)) throw new Error('Unknown appearance draw');
  const next = copy(p), style = J.resolveStyle(p);
  const fonts = mode === 'font' ? J.drawFontRoles(p, style, rng, true) : null;
  const palette = mode === 'color' ? J.drawRelatedPalette(style.schemes, rng) : null;
  J.captureLocalLooks(next, current, audio);
  if (fonts) next.fonts = { ...next.fonts, ...fonts };
  else if (mode === 'accent') next.colors = { ...next.colors, ...accents, accentOn:true };
  else next.colors = { ...next.colors, enabled:false, accentOn:false, palette, paletteStyle:p.style };
  const recolor = schemes => mode === 'accent' ? accentPalette(schemes, accents) : J.paletteForStyle(schemes,palette);
  next.overrides ||= {};
  for (const line of current.lines) {
    if (line.interlude) continue;
    const key = p.subtitleCues?.[line.index]?.id ?? ('line-' + line.index), entry = next.localLooks.lines[key];
    if (!entry) continue;
    const base = current.layerGroups?.find(g => g.indices.includes(line.index))?.plan || current;
    const cut = current.cuts.find(c => c.line === line.index), fallback = cut?.renderLook || {style:base.style,styleKey:base.styleKey,fx:base.fx,hud:base.hud};
    const ov = next.overrides[line.index] ||= {};
    if (ov.lock) {
      ov.lockedCuts = copy(entry.cuts);
      for (const c of ov.lockedCuts) c.renderLook ||= copy(fallback);
      continue;
    }
    const updateRule = rule => {
      const r = rule || J.cueAppearanceRule(p, fallback.style);
      if (fonts) r.fonts = { ...r.fonts, ...fonts };
      else { r.palette = recolor(r.palette || fallback.style.schemes); r.colors = copy(next.colors); }
      return r;
    };
    // Ordinary cues continue inheriting the global rule, including future
    // global style/mood changes. Only rewrite rules already local to a cue.
    if (ov.cueLook) ov.cueLook = updateRule(ov.cueLook);
    for (const c of entry.cuts) {
      if (fonts) J.retargetCutFonts(c, fonts, fallback);
      else { c.renderLook = copy(c.renderLook || fallback); c.renderLook.style.schemes = recolor(c.renderLook.style.schemes); }
    }
    if (ov.randomDraw) {
      ov.randomDraw.cuts = copy(entry.cuts);
      if (ov.randomDraw.restore?.cueLook) ov.randomDraw.restore.cueLook = updateRule(ov.randomDraw.restore.cueLook);
    }
  }
  J.rekeyLocalLooks(next, current, audio);
  return next;
};
})();
