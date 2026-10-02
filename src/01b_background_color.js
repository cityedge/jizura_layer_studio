/* Render-only palette policy. A background colour is translucent wherever a
   painter references it, including foreground parts, transitions and post FX.
   Saved palettes, planning, and legacy binary rendering stay unchanged. */
(() => {
'use strict';
J.LAYER_BACKGROUND_ALPHA = 0.4;
J.normalizeBackgroundOpacity = value => typeof value === 'number' && Number.isFinite(value)
  ? Math.max(0, Math.min(100, Math.round(value))) : J.LAYER_BACKGROUND_ALPHA * 100;
const cache = new WeakMap(), originals = new WeakMap();
J.layerRenderStyle = (style, opt = {}) => {
  style = originals.get(style) || style;
  if (!opt.layerComposition || opt.layerMode !== 'alpha') return style;
  const opacity = J.normalizeBackgroundOpacity(opt.layerBackgroundOpacity);
  let copy = cache.get(style);
  // Palettes can be edited in place; never reuse stale cached colours.
  if (copy && copy.opacity === opacity && copy.original.length === style.schemes.length && style.schemes.every((sc, i) => {
    const prev = copy.original[i];
    return Object.keys(sc).length === Object.keys(prev).length && Object.keys(sc).every(k => sc[k] === prev[k]);
  }) && Object.keys(style).every(k => k === 'schemes' || copy.style[k] === style[k])) return copy.style;
  const value = { ...style, schemes: style.schemes.map(sc => ({ ...sc, bg: J.withColorAlpha(sc.bg, J.colorAlpha(sc.bg) * opacity / 100) })) };
  originals.set(value, style);
  cache.set(style, { style: value, opacity, original: style.schemes.map(sc => ({ ...sc })) });
  return value;
};
})();
