const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const sandbox = { window: {}, document: { documentElement: { lang: 'ja' }, createElement: () => ({ getContext: () => ({ measureText: t => ({ width: String(t).length * 20 }) }) }) }, console };
vm.createContext(sandbox);
const root = path.join(__dirname, '../src');
for (const name of fs.readdirSync(root).filter(n => n.endsWith('.js') && n < '12').sort()) vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
const J = sandbox.window.J, copy = x => JSON.parse(JSON.stringify(x));
const audio = {duration: 32, beats: Array.from({length:64},(_,i)=>i*.5)};
function fixture() {
  const p = J.defaultProject(); p.seed=155151; p.fx.density=1; p.extra=true; p.kinetic=true;
  p.subtitleCues = ['朝が来る 光の中へ どこまでも 未来へ進もう','夜を越えて 音に乗って 明日へ向かおう','この夢を 抱いて 新しい世界へ'].map((text,i)=>({id:'p'+i,text,start:2+i*8,end:10+i*8}));
  return p;
}
const owned = (plan,i) => copy(plan.cuts.filter(c=>c.line===i).map(c=>{const n={...c};delete n.index;return n;}));
const times = plan => copy(plan.lines.map(l=>[l.index,l.start,l.end,l.visEnd]));
test('virtual planning reduces automatic cuts, preserves SRT/beat/media clocks and native 1x',()=>{
  const p=fixture(), original=J.plan(p,audio), legacy=copy(p);
  delete legacy.motionPitch;delete legacy.motionPitchSetting;delete legacy.cuePitchSetting;
  assert.deepEqual(copy(J.plan(legacy,audio)),copy(original));
  p.motionPitch=.3;const slow=J.plan(p,audio);
  assert(slow.cuts.length<original.cuts.length);
  assert.deepEqual(times(slow),times(original));assert.deepEqual(copy(slow.beats),audio.beats);assert.equal(slow.duration,original.duration);
  for(const c of slow.cuts){assert.equal(c.motionPitch,.3);assert(c.inDur+c.outDur<=c.dur*.93);assert(c.start>=2);}
  for(const c of slow.cuts.slice(1))if(c.line===slow.cuts[slow.cuts.indexOf(c)-1].line) {
    // Automatic boundaries close to a real beat are snapped at actual speed.
    const b=audio.beats.find(b=>Math.abs(b-c.start)<.000001);if(b!=null)assert.equal(c.start,b);
  }
});
test('8 keeps appearance and neighbors, adapts auto cuts and survives every other draw and JSON',()=>{
  const p=fixture(), before=J.plan(p,audio), untouched=JSON.stringify(p);p.cuePitchSetting=.3;
  const n=J.prepareCueReroll(p,before,1,audio,'pitch'), after=J.plan(n,audio);
  assert.equal(n.overrides[1].motionPitch,.3);assert.equal(J.cueRerollKey('pitch'),'8');
  assert.deepEqual(owned(after,0),owned(before,0));assert.deepEqual(owned(after,2),owned(before,2));
  assert.deepEqual(times(after),times(before));assert.deepEqual(copy(n.fonts),copy(p.fonts));assert.equal(n.seed,p.seed);
  assert(after.cuts.filter(c=>c.line===1).length<before.cuts.filter(c=>c.line===1).length);
  const old=before.cuts.find(c=>c.line===1), c=after.cuts.find(c=>c.line===1);
  assert.deepEqual(copy(c.renderLook.style.schemes),copy(old.renderLook?.style.schemes||before.style.schemes));
  assert.deepEqual(copy(J.plan(copy(n),audio)),copy(after));
  for(const mode of ['random','fine','all','style','mood','motion','color','font','global']) {
    const next=J.prepareCueReroll(n,after,1,audio,mode), plan=J.plan(next,audio);
    assert.equal(J.cueMotionPitch(next,1),.3,mode);
    assert(plan.cuts.filter(c=>c.line===1).every(c=>c.motionPitch===.3),mode);
  }
  const withoutSetting=copy(p);delete withoutSetting.cuePitchSetting;
  const originalP=JSON.parse(untouched);delete originalP.cuePitchSetting;
  assert.deepEqual(withoutSetting,originalP);
});
test('global application overrides local pitches, respects locks and keeps manual/random/library structures',()=>{
  let p=fixture();p=J.prepareCueReroll(p,J.plan(p,audio),1,audio,'random');
  p.overrides[0]={cuts:2,layout:'center',enter:'blur',exit:'blur',trans:'none'};
  p.overrides[2]={lock:true};const before=J.plan(p,audio);
  const n=J.prepareMotionPitch(p,before,audio,.5), after=J.plan(n,audio);
  assert.equal(n.motionPitch,.5);
  const locked=owned(after,2);locked.forEach(c=>delete c.renderLook);
  assert.deepEqual(locked,owned(before,2));
  for(const i of [0,1]) {
    assert.equal(owned(after,i).length,owned(before,i).length);
    assert.deepEqual(owned(after,i).map(c=>[c.utext,c.layout,c.bg,c.cam,c.scheme,c.seed]),owned(before,i).map(c=>[c.utext,c.layout,c.bg,c.cam,c.scheme,c.seed]));
    assert(after.cuts.filter(c=>c.line===i).every(c=>c.motionPitch===.5));
  }
  assert.deepEqual(copy(J.plan(copy(n),audio)),copy(after));
  n.motionPitchSetting=.8;const draw=J.omakase(n,J.rng(28)), auto={...n,...draw};
  assert.equal(auto.motionPitch,.8);assert.equal(J.cueMotionPitch(auto,2),1);assert.equal(J.cueMotionPitch(auto,1),.8);
});
test('virtual rendering stretches fixed-second motions and maps scheduled beats without changing beat pulses',()=>{
  const p=fixture();p.overrides[0]={cuts:1,layout:'center',enter:'blur',exit:'blur',trans:'none'};
  const before=J.plan(p,audio), n=J.prepareMotionPitch(p,before,audio,.5,0), after=J.plan(n,audio);
  const c=after.cuts[0], b=before.cuts[0];assert(Math.abs(c.inDur-b.inDur*2)<1e-9);
  const o={t:c.start+1,lt:1,ltb:1.1,step:90,beat:{since:.1,len:.5,index:6},energy:.7};
  const v=J.motionEnv(c,o,after), v2=J.motionEnv(c,{...o,t:o.t+.1},after);
  assert.equal(v.lt,.5);assert.equal(v.ltb,.55);assert.equal(v.cut.dur,c.dur*.5);assert.equal(v.cut,v2.cut);
  assert.equal(v.beat,o.beat);assert.equal(v.energy,.7);assert.equal(v.realT,o.t);
  const mapped=audio.beats.map(t=>c.motionOrigin+(t-c.motionOrigin)*.5);assert.deepEqual(copy(v.plan.beats),mapped);
  assert.equal(J.motionEnv(c,{...o,motionClock:false},after).t,o.t);
});
test('library preserves pitch, accepts legacy 1x recipes and pitch edits retain portability',()=>{
  const p=fixture();p.cuePitchSetting=.6;
  const n=J.prepareCueReroll(p,J.plan(p,audio),0,audio,'pitch'), plan=J.plan(n,audio);
  const recipe=J.captureMotionRecipe(n,plan,0);assert.equal(recipe.motionPitch,.6);
  const applied=J.prepareMotionApply(n,plan,1,recipe,audio), appliedPlan=J.plan(applied,audio);
  assert.equal(J.cueMotionPitch(applied,1),.6);
  assert.equal(J.motionSampleProject(recipe).overrides[0].motionPitch,.6);
  const slower=J.prepareMotionPitch(applied,appliedPlan,audio,.3,1), slowerPlan=J.plan(slower,audio);
  assert.equal(J.captureMotionRecipe(slower,slowerPlan,1).motionPitch,.3);
  assert.equal(owned(slowerPlan,1).length,owned(appliedPlan,1).length);
  delete recipe.motionPitch;recipe.cuts.forEach(c=>delete c.motionPitch);
  assert.equal(J.validateMotionRecipe(recipe).motionPitch,1);
});
test('center-free companion clocks and library recipes retain side zones at every pitch',()=>{
  for(const aspect of ['16:9','9:16']) for(const pitch of [.3,.8,1.2]) {
    const p=fixture();p.centerFree=true;p.aspect=aspect;
    p.overrides[0]={cuts:1,layout:'center',enter:'blur',exit:'blur',trans:'none'};
    const before=J.plan(p,audio), next=J.prepareMotionPitch(p,before,audio,pitch,0), plan=J.plan(next,audio);
    const c=plan.cuts.find(c=>c.line===0), twin=c.companion;
    assert(twin);assert.equal(twin.motionPitch,pitch);assert.equal(twin.motionOrigin,c.motionOrigin);
    assert.equal(twin.end,c.end);assert(twin.start>c.start&&twin.start<twin.end);
    assert.deepEqual(copy(c.zone),copy(before.cuts[0].zone));
    assert.deepEqual(copy(twin.zone),copy(before.cuts[0].companion.zone));
    const t=twin.start+.2,v=J.motionEnv(twin,{t,lt:.2,ltb:.2},plan);
    assert(Math.abs(v.lt-.2*pitch)<1e-9);assert(v.cut.start<v.cut.end);
    const recipe=J.captureMotionRecipe(next,plan,0), applied=J.prepareMotionApply(next,plan,1,recipe,audio);
    assert(J.plan(applied,audio).cuts.find(c=>c.line===1).companion);
    assert.equal(J.cueMotionPitch(applied,1),pitch);
  }
});
test('empty targets and locks reject atomically; short, overlapping, filler and legacy cues stay valid',()=>{
  const p=fixture();p.overrides[1]={lock:true};let before=J.plan(p,audio), saved=JSON.stringify(p);
  assert.throws(()=>J.prepareMotionPitch(p,before,audio,.3,1),/ロック/);
  assert.throws(()=>J.prepareMotionPitch(p,before,audio,.3,99),/字幕/);assert.equal(JSON.stringify(p),saved);
  p.subtitleCues.push({id:'filler',text:'[timestamp]',start:3,end:4,filler:true});
  p.subtitleCues.sort((a,b)=>a.start-b.start);p.overrides={0:{cuts:1},1:{cuts:1},2:{cuts:1}};
  for(const pitch of [.3,.5,.8,1,1.2]) {
    p.motionPitch=pitch;before=J.plan(p,audio);
    const n=J.prepareMotionPitch(p,before,audio,pitch), plan=J.plan(n,audio);
    assert.deepEqual(times(plan),times(before));assert.deepEqual(copy(plan.beats),audio.beats);
    for(const c of plan.cuts)assert(Number.isFinite(c.inDur)&&c.start<c.end&&c.inDur+c.outDur<=c.dur*.93);
  }
  const legacy=fixture();delete legacy.motionRecipeVersion;
  const plan=J.plan(legacy);plan.cuts.forEach(c=>delete c.params._motionPlan);
  const n=J.prepareMotionPitch(legacy,plan,null,.5,0);assert.equal(owned(J.plan(n),0).length,owned(plan,0).length);
  for(const x of [null,undefined,'',NaN,Infinity]) assert.equal(J.normalizeMotionPitch(x),1);
  assert.equal(J.normalizeMotionPitch(99),1.2);assert.equal(J.normalizeMotionPitch(-1),.3);
});
