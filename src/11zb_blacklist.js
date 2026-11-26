/* The shared list belongs to this browser. Only an explicitly requested draw
   gets its filter. Ordinary plans (loading, playback, export, Undo) never do. */
(() => {
'use strict';
const storageKey = 'jizura.layers.blacklist.v1';
const format = 'jizura-technique-blacklist';
const filterKey = Symbol('technique draw filter');
const basic = {layout:'center', enter:'cut', exit:'cut', hold:'still', cam:'push', bg:'none', treat:'none'};
const styleGroups = ['layout','bg','treat'];
const moodGroups = ['enter','hold','exit','decor','treat','cam','trans','fx'];
let entries;
J.basicTechnique = group => basic[group] || 'none';

J.blacklistEligible = (group,id) => J.GROUP_KEYS.includes(group) && typeof id === 'string' &&
  Object.hasOwn(J.registry(group), id) && J.order(group).includes(id) &&
  !J.registry(group)[id].special && id !== basic[group];

function normalize(items) {
  if (!Array.isArray(items) || items.length > 10000) throw invalidFile();
  const unique = new Map();
  for (const pair of items) {
    if (!Array.isArray(pair) || pair.length !== 2 || !J.blacklistEligible(...pair)) throw invalidFile();
    unique.set(pair.join(':'), pair.slice());
  }
  return [...unique.values()];
}
function invalidFile() {
  return new Error(J.layerText('ブラックリストJSONの形式または手法が無効です。','Invalid blacklist file or unsupported technique.'));
}
J.parseBlacklist = file => {
  if (file?.format !== format || file.version !== 1) throw invalidFile();
  return normalize(file.entries);
};
J.blacklistFile = items => ({format,version:1,entries:normalize(items)});
J.readBlacklist = () => {
  if (!entries) {
    try {
      const raw = localStorage.getItem(storageKey);
      entries = raw ? J.parseBlacklist(JSON.parse(raw)) : [];
    } catch { entries = []; }
  }
  return entries.map(pair => pair.slice());
};
J.writeBlacklist = items => {
  const file = J.blacklistFile(items);
  entries = file.entries;
  try { localStorage.setItem(storageKey, JSON.stringify(file)); return true; }
  catch { return false; }
};
window.addEventListener?.('storage', e => {
  if (e.key !== storageKey && e.key !== null) return;
  entries = null;
  window.dispatchEvent(new Event('jizura-blacklist-changed'));
});
J.techniqueDrawProject = (p,mode) => {
  const items = J.readBlacklist();
  const groups = mode === 'style' ? styleGroups : mode === 'mood' ? moodGroups : mode === 'pitch' ? ['layout'] : null;
  const keys = items.filter(([g]) => !groups || groups.includes(g)).map(pair => pair.join(':'));
  return keys.length ? {...p, [filterKey]:new Set(keys)} : p;
};
J.drawAllows = (p,g,id) => !p[filterKey]?.has(g+':'+id);
const randomOk = J.randomOk;
J.randomOk = (p,g,id) => randomOk(p,g,id) && (!p || J.drawAllows(p,g,id));
// A unification repeat can inherit a technique from a manual or locked cut.
J.drawAllowsRepeat = (p,cut) => !p[filterKey] || !cut || (
  ['layout','enter','hold','exit','bg','treat','cam','trans'].every(g=>J.drawAllows(p,g,cut[g])) &&
  cut.decor.every(d=>J.drawAllows(p,'decor',d.id))
);
J.planTechniqueDraw = (p,audio,mode) => J.plan(J.techniqueDrawProject(p,mode),audio);
J.planGlobalTechniqueDraw = (p,audio) => {
  const draft = J.techniqueDrawProject(p);
  const result = J.plan(draft,audio);
  if (draft !== p) J.captureLocalLooks(p,result,audio);
  return result;
};
// New lyrics and regenerated fillers can share a plan with existing subtitles.
// Keep the ordinary plan for all unselected cues, including their timed effects.
J.planAddedTechniques = (p,audio,selected) => {
  const base = J.plan(p,audio), draft = J.techniqueDrawProject(p);
  if (draft===p) return base;
  const targets = base.lines.filter(line=>line.text && selected(line));
  if (!targets.length) return base;
  const drawn = J.plan(draft,audio);
  J.captureLocalLooks(p,base,audio);
  for (const line of targets) {
    const key=p.subtitleCues?.[line.index]?.id ?? ('line-'+line.index);
    const cuts=J.lineSnapshot(drawn,line.index);
    if (cuts && p.localLooks.lines[key]) p.localLooks.lines[key].cuts=cuts;
  }
  return J.plan(p,audio);
};
})();
