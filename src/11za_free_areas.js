/* Per-cue keep-clear bands. Geometry is a project setting, not part of a draw. */
(() => {
'use strict';
J.freeAreaMode = p => p.centerFree ? (p.freeAreaMode === 'custom' ? 'custom' : 'center') : 'off';
J.freeAreaSide = p => { const [w,h] = J.designSize(p.aspect || '16:9'); return h > w * 1.1 ? 'tall' : 'wide'; };
J.freeAreaKey = (p, index) => p.subtitleCues?.[index] ? 'cue:' + p.subtitleCues[index].id : 'line:' + index;
J.cueKeepsArea = (p, index) => !!p.centerFree &&
  (p.freeAreaMode !== 'custom' || p.freeAreas?.[J.freeAreaKey(p, index)]?.closed !== true);
J.defaultFreeBand = (p, side) => {
  const [w,h] = J.designSize(p.aspect || '16:9');
  const wide = side === 'wide';
  const W = wide ? (w >= h ? w : 1920) : (h > w * 1.1 ? w : 1080);
  const H = wide ? (w >= h ? h : 1080) : (h > w * 1.1 ? h : 1920);
  const z = J.sideZones(W,H,p.centerDir), vertical = z[0].side === 'left';
  return { position:.5, width:1 - 2 * (vertical ? z[0].w / W : z[0].h / H) };
};
J.normalizeFreeBand = (value, fallback = {position:.5,width:.28}) => {
  const width = J.clamp(Number.isFinite(value?.width) ? value.width : fallback.width, .08, .72);
  const position = J.clamp(Number.isFinite(value?.position) ? value.position : fallback.position, width/2, 1-width/2);
  return { position, width };
};
J.cueFreeBand = (p,index,side=J.freeAreaSide(p)) => J.normalizeFreeBand(p.freeAreas?.[J.freeAreaKey(p,index)]?.[side],J.defaultFreeBand(p,side));
function normalizeCueAreas(p, saved) {
  const areas = {};
  for (const side of ['wide', 'tall'])
    areas[side] = J.normalizeFreeBand(saved?.[side], J.defaultFreeBand(p, side));
  if (saved?.closed === true) areas.closed = true;
  return areas;
}
J.ensureFreeAreas = (p, lines) => {
  p.freeAreas ||= {};
  for (const line of lines) {
    const key = J.freeAreaKey(p,line.index), saved = p.freeAreas[key] || {};
    p.freeAreas[key] = normalizeCueAreas(p, saved);
  }
};
J.resetFreeAreas = (p,lines,side=J.freeAreaSide(p)) => {
  J.ensureFreeAreas(p,lines);
  for (const line of lines) p.freeAreas[J.freeAreaKey(p,line.index)][side] = J.defaultFreeBand(p,side);
};
J.freeAreaGeometry = (p,index,W,H) => {
  const vertical = H <= W * 1.1 || p.centerDir === 'lr';
  const band = J.cueFreeBand(p,index), size = vertical ? W : H;
  const lo = Math.round(size*(band.position-band.width/2)), hi = Math.round(size*(band.position+band.width/2));
  const rect = vertical ? {x:lo,y:0,w:hi-lo,h:H} : {x:0,y:lo,w:W,h:hi-lo};
  const zones = vertical
    ? [{x:0,y:0,w:lo,h:H,side:'left'}, {x:hi,y:0,w:W-hi,h:H,side:'right'}]
    : [{x:0,y:0,w:W,h:lo,side:'top'}, {x:0,y:hi,w:W,h:H-hi,side:'bottom'}];
  // Never assign half of a lyric to a sliver of screen. The other side gets the whole text.
  return {rect,vertical,band,zones:zones.filter(z => (vertical ? z.w/W : z.h/H) >= .16)};
};
J.cueFreeZones = (p,index,W,H) => {
  if (!J.cueKeepsArea(p,index)) return null;
  return p.freeAreaMode === 'custom' ? J.freeAreaGeometry(p,index,W,H).zones : J.sideZones(W,H,p.centerDir);
};
J.freeAreaParams = (params,layout,text,zone,dur,style,seed) => {
  if (params?._motionPlan && J.recordMotionParams && J.replayMotionParams)
    return J.replayMotionParams(J.recordMotionParams(params,layout),text,zone.w,zone.h,dur,style);
  return J.LAYOUTS[layout].plan(J.rng(seed),{text,n:J.glyphCount(text),W:zone.w,H:zone.h,dur},style);
};
const defaults = J.defaultProject, upgrade = J.upgradeLayerProject;
J.defaultProject = () => ({...defaults(),freeAreaMode:null,freeAreas:{}});
J.upgradeLayerProject = (p,source) => {
  const saved = source?.freeAreas;
  upgrade(p,source);
  p.freeAreaMode = source?.freeAreaMode === 'custom' ? 'custom' : null;
  p.freeAreas = {};
  if (saved && typeof saved === 'object') {
    for (const [key,value] of Object.entries(saved).slice(0,20000)) {
      if (!/^(cue:|line:)/.test(key) || key.length > 256 || !value) continue;
      p.freeAreas[key] = normalizeCueAreas(p, value);
    }
  }
  return p;
};
})();
