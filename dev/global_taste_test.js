const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const sandbox = { window: {}, document: { documentElement: { lang: 'ja' }, createElement: () => ({ getContext: () => ({ measureText: text => ({ width: String(text).length * 20 }) }) }) }, console };
vm.createContext(sandbox);
const root = path.join(__dirname, '../src');
for (const name of fs.readdirSync(root).filter(n => n.endsWith('.js') && n < '12').sort()) vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), sandbox, { filename: name });
const J = sandbox.window.J, copy = x => JSON.parse(JSON.stringify(x));
function fixture(filler, unify) {
  const p = J.defaultProject(); Object.assign(p, J.omakase(p, J.rng(152)));
  p.unify = unify;
  p.subtitleCues = ['朝が来る 光の中へ', '空の向こう 夜の彼方へ', '明日へ 歩いていこう'].map((text, i) => ({ id: 'c' + i, text, start: i * 6, end: i * 6 + 6, filler: filler && i === 1 }));
  p.overrides = {};
  p.globalLook = J.globalLookBaseline(p, J.plan(p));
  return p;
}
test('9 returns every local draw to the global base, preserves other cues and survives save/reload', () => {
  for (const filler of [false, true]) for (const unify of [false, true]) {
    for (const mode of ['all', 'style', 'mood', 'motion', 'color', 'random']) {
      let p = fixture(filler, unify); const baseline = copy(p.globalLook);
      p = J.prepareCueReroll(p, J.plan(p), 1, null, mode);
      p = J.prepareCueReroll(p, J.plan(p), 1, null, 'color');
      const before = copy(p), current = J.plan(p), others = [0,2].map(i => copy(J.lineSnapshot(current,i)));
      p = J.prepareCueReroll(p, current, 1, null, 'global');
      assert.deepEqual(copy(p.globalLook), baseline);
      assert.deepEqual(copy(p.subtitleCues), before.subtitleCues);
      const plan = J.plan(p), rule = p.overrides[1].cueLook;
      for (const k of ['style','mood','fonts','colors','fx','enabled']) assert.deepEqual(copy(rule[k]), baseline.values[k], k);
      assert.ok(!p.overrides[1].randomDraw);
      assert.deepEqual([0,2].map(i => copy(J.lineSnapshot(plan,i))), others);
      for (const c of plan.cuts.filter(c => c.line === 1)) {
        assert.equal(c.renderLook.styleKey, baseline.values.style);
        assert.deepEqual(copy(c.renderLook.style.schemes), copy(rule.palette));
      }
      assert.deepEqual(copy(J.plan(copy(p)).cuts), copy(plan.cuts));
      p = J.prepareCueReroll(p, plan, 1, null, 'fine');
      assert.equal(p.overrides[1].cueLook.style, baseline.values.style);
    }
  }
});
test('global baseline changes only with global controls, handles legacy JSON, and excludes manual cue choices', () => {
  let p = fixture(false,true), baseline = copy(p.globalLook);
  p.overrides[1] = {layout:'ticket',cuts:1,cutTech:{0:{bg:'checker'}},decor:['frame']};
  assert.deepEqual(copy(J.globalLookBaseline(p,J.plan(p))), baseline);
  delete p.globalLook;
  p = J.prepareCueReroll(p,J.plan(p),1,null,'global');
  assert.deepEqual(copy(p.globalLook),baseline);
  assert.deepEqual(Object.keys(p.overrides[1]).sort(), ['cueLook','drawSerial','motionRecipeVersion','reroll','seed']);
  Object.assign(p,J.omakase(p,J.rng(984)));
  const next=J.globalLookBaseline(p,J.plan(p));
  assert.notEqual(next.context,baseline.context);
  p.globalLook=next;
  p=J.prepareCueReroll(p,J.plan(p),1,null,'random');
  p=J.prepareCueReroll(p,J.plan(p),1,null,'global');
  assert.equal(p.overrides[1].cueLook.style,next.values.style);
  assert.deepEqual(copy(p.overrides[1].cueLook.colors),copy(next.values.colors));
  p.unify=!p.unify;
  assert.notEqual(J.globalLookBaseline(p,J.plan(p)).context,next.context);
});
test('repeated 9 draws vary, and locks or absent cues reject without mutation', () => {
  let p=fixture(false,false);const seen=new Set();
  for(let i=0;i<12;i++) { p=J.prepareCueReroll(p,J.plan(p),1,null,'global');seen.add(JSON.stringify(J.lineSnapshot(J.plan(p),1))); }
  assert.ok(seen.size>1);
  p.overrides[1].lock=true;const original=JSON.stringify(p);
  assert.throws(()=>J.prepareCueReroll(p,J.plan(p),1,null,'global'));
  assert.throws(()=>J.prepareCueReroll(p,J.plan(p),99,null,'global'));
  assert.equal(JSON.stringify(p),original);
  assert.equal(J.cueRerollKey('global'),'9');assert.equal(J.cueRerollKey('fine'),'6');assert.equal(J.cueRerollKey('random'),'0');
});
test('import expansion and property order preserve snapshots, including legacy context strings', () => {
  let p=fixture(false,true);
  p=J.prepareCueReroll(p,J.plan(p),1,null,'global');
  const before=copy(J.plan(p).cuts),baseline=copy(p.globalLook);
  // The exact context format written by releases through 1.3.0.
  p.localLooks.context=JSON.stringify([
    ...['style','mood','seed','fx','enabled','fonts','colors','extra','wa','horror','typo','kinetic','lang','unify','typeset','centerDir','centerFree','aspect','fps'].map(k=>p[k]),
    p.timing.bpm,p.timing.offset,p.timing.snap,p.timing.lineScale,undefined,undefined
  ]);
  const defaults=J.defaultProject().enabled;
  p.enabled=Object.fromEntries(Object.keys(defaults).reverse().map(g=>[g,{...defaults[g],...p.enabled[g]}]));
  p.fx=Object.fromEntries(Object.entries(p.fx).reverse());
  assert.deepEqual(copy(J.globalLookBaseline(p,J.plan(p))),baseline);
  assert.deepEqual(copy(J.plan(p).cuts),before);
  const previousContext=J.localLookContext(p);
  p.enabled.layout.center=p.enabled.layout.center===false;
  assert.notEqual(J.localLookContext(p),previousContext);
});
