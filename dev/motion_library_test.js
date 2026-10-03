const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const sandbox = { window: {}, document: { documentElement: { lang: 'ja' }, createElement: () => ({ getContext: () => ({ measureText: t => ({ width: String(t).length * 20 }) }) }) }, console };
vm.createContext(sandbox);
const root = path.join(__dirname, '../src');
for (const n of fs.readdirSync(root).filter(n => n.endsWith('.js') && n < '12').sort()) vm.runInContext(fs.readFileSync(path.join(root,n),'utf8'),sandbox,{filename:n});
const J=sandbox.window.J, copy=x=>JSON.parse(JSON.stringify(x));
function fixture(seed=152) {
  const p=J.defaultProject(); Object.assign(p,J.omakase(p,J.rng(seed)));
  p.subtitleCues=['朝が来る 光の中へ','空の向こう 夜の彼方へ','明日へ 歩いていこう'].map((text,i)=>({id:'c'+i,text,start:i*6,end:i*6+6}));
  p.overrides={}; return p;
}
test('motion recipe applies independently, keeps neighbors and survives JSON and gacha',()=>{
  let p=fixture(), current=J.plan(p), recipe=J.captureMotionRecipe(p,current,0);
  assert.ok(!JSON.stringify(recipe).includes('朝が来る'));
  const before=JSON.stringify(p), next=J.prepareMotionApply(p,current,1,recipe), plan=J.plan(next);
  assert.equal(JSON.stringify(p),before);
  assert.deepEqual(copy(plan.cuts.filter(c=>c.line===2)),copy(current.cuts.filter(c=>c.line===2)));
  assert.deepEqual(copy(J.plan(copy(next)).cuts),copy(plan.cuts));
  assert.deepEqual(copy(J.captureMotionRecipe(next,plan,1).cuts.map(c=>c.layout)),copy(recipe.cuts.map(c=>c.layout)));
  for(const mode of ['all','style','mood','motion','color','fine','font','global','random']) assert.ok(J.plan(J.prepareCueReroll(next,plan,1,null,mode)).cuts.length);
});
test('old data is viewable but cannot be saved until a generation draw',()=>{
  const p=fixture(); p.motionRecipeVersion=0;
  assert.throws(()=>J.captureMotionRecipe(p,J.plan(p),0),/設定情報/);
  for(const mode of ['color','font']) {const n=J.prepareCueReroll(p,J.plan(p),0,null,mode); assert.throws(()=>J.captureMotionRecipe(n,J.plan(n),0));}
  const n=J.prepareCueReroll(p,J.plan(p),0,null,'all'); assert.ok(J.captureMotionRecipe(n,J.plan(n),0));
});
test('random recipes sample and adapt across seeds; invalid targets fail atomically',()=>{
  for(let seed=0;seed<25;seed++) {
    let p=fixture(seed); p=J.prepareCueReroll(p,J.plan(p),0,null,'random');
    const r=J.captureMotionRecipe(p,J.plan(p),0), sample=J.motionSampleProject(r);
    assert.ok(J.plan(sample).cuts.length);
    const locked=copy(p); locked.overrides[1]={lock:true}; assert.throws(()=>J.prepareMotionApply(locked,J.plan(locked),1,r),/ロック/);
    const invalid=copy(r); invalid.cuts[0].layout='bad'; assert.throws(()=>J.validateMotionRecipe(invalid));
    assert.throws(()=>J.parseMotionLibrary({format:'bad',version:1,items:[]}));
  }
});
test('samples cover normal, center-free and English generated motions',()=>{
  for(let seed=0;seed<100;seed++)for(const centerFree of [false,true]) {
    const p=fixture(seed); p.centerFree=centerFree;
    if(seed%2) {p.lang='en';p.subtitleCues[0].text='Had a Dream in the Neon Light';}
    const plan=J.plan(p), r=J.captureMotionRecipe(p,plan,0);
    try { assert.ok(J.plan(J.motionSampleProject(r)).cuts.length); }
    catch(e) {throw new Error('seed '+seed+' center '+centerFree+' layouts '+r.cuts.map(c=>c.layout)+': '+e.message);}
    try {
      const applied=J.plan(J.prepareMotionApply(p,plan,0,r));
      assert.ok(applied.cuts.length);
      const old=plan.cuts.filter(c=>c.line===0&&c.utext!=null), now=applied.cuts.filter(c=>c.line===0&&c.utext!=null);
      old.forEach((c,i)=>{if(c.text===now[i].text)assert.deepEqual(copy(now[i].params),copy(c.params));});
    }
    catch(e) {throw new Error('self seed '+seed+' center '+centerFree+' layouts '+r.cuts.map(c=>c.layout)+': '+e.message);}
  }
});
test('portable source theme survives deletion and destination baseline stays independent',()=>{
  const p=fixture();p.userThemes=[{id:'user-a',name:'Source',styles:{paper:1},moods:{calm:1}}];p.theme='user-a';
  Object.assign(p,J.omakase(p,J.rng(121)));
  const recipe=J.captureMotionRecipe(p,J.plan(p),0), dest=fixture(26), before=J.plan(dest);
  const baseline=J.globalLookBaseline(dest,before);dest.globalLook=baseline;
  let next=J.prepareMotionApply(dest,before,0,recipe), look=next.overrides[0].cueLook;
  assert.equal(next.themeSnapshots[look.lookTheme].name,'Source'); assert.equal(look.style,'paper');assert.equal(look.mood,'calm');
  assert.equal(JSON.stringify(next.globalLook),JSON.stringify(baseline));
  next.userThemes=[];next=J.prepareCueReroll(next,J.plan(next),0,null,'fine');
  assert.equal(next.overrides[0].cueLook.style,'paper');
  assert.equal(next.overrides[0].cueLook.mood,'calm');
  assert.ok(J.captureMotionRecipe(next,J.plan(next),0));
});
test('invalid imports cannot mutate prototypes or create unbounded sample text',()=>{
  const p=fixture(), r=J.captureMotionRecipe(p,J.plan(p),0), corrupt=copy(r);
  corrupt.cuts[0].layoutPlan.fonts=[[['__proto__','toString'],'gothic_bold']];assert.throws(()=>J.validateMotionRecipe(corrupt));
  const bad=copy(r);bad.cuts[0].shape.words=[1000000000];assert.throws(()=>J.validateMotionRecipe(bad));
  const item={id:'a',name:'a',recipe:r};assert.throws(()=>J.parseMotionLibrary({format:'jizura-motion-library',version:1,items:[item,item]}));
});
test('intentional whitespace fillers can supply library motions',()=>{
  const p=fixture();p.subtitleCues[0].text='　　 　　　';p.subtitleCues[0].filler=true;
  const r=J.captureMotionRecipe(p,J.plan(p),0);
  assert.ok(J.plan(J.motionSampleProject(r)).cuts.length);
});
test('spaced Japanese random cuts stay aligned and can be reapplied to their source',()=>{
  for(const seed of [6,30]) {
    let p=fixture(seed);p.subtitleCues[0].text='朝が来る 光の中へ 歩いていこう';p.subtitleCues[0].end=8;p.subtitleCues[1].start=8;p.subtitleCues[1].end=16;p.subtitleCues[2].start=16;p.subtitleCues[2].end=24;
    p=J.prepareCueReroll(p,J.plan(p),0,null,'random');
    const current=J.plan(p), saved=p.overrides[0].randomDraw.cuts, actual=current.cuts.filter(c=>c.line===0&&c.utext!=null);
    assert.deepEqual(copy(actual.map(c=>[c.utext,c.layout])),copy(saved.map(c=>[c.utext,c.layout])));
    const r=J.captureMotionRecipe(p,current,0), n=J.prepareMotionApply(p,current,0,r);
    assert.equal(J.plan(n).cuts.filter(c=>c.line===0).length,saved.length);
    const locked=copy(p);locked.overrides[0].lock=true;locked.overrides[0].lockedCuts=J.lineSnapshot(current,0);
    assert.deepEqual(copy(J.plan(locked).cuts.filter(c=>c.line===0).map(c=>[c.utext,c.layout])),copy(actual.map(c=>[c.utext,c.layout])));
    const edited=copy(p);edited.subtitleCues[0].text='違う歌詞';
    assert.equal(J.localLookFor(edited,{text:'違う歌詞'},edited.overrides[0],0,0,8),null);
  }
});
test('font-only draws retain original layout planning inputs across library save/apply',()=>{
  for(const seed of [25,34])for(const global of [false,true]) {
    let p=fixture(seed);p.subtitleCues[0].text='朝が来る 光の中へ 歩いていこう';p.subtitleCues[0].end=8;p.subtitleCues[1].start=8;p.subtitleCues[1].end=16;p.subtitleCues[2].start=16;p.subtitleCues[2].end=24;
    const initial=J.plan(p), metadata=initial.cuts.filter(c=>c.line===0).map(c=>copy(c.params._motionPlan));
    p=global?J.prepareGlobalAppearance(p,initial,null,'font',J.rng(5)):J.prepareCueReroll(p,initial,0,null,'font');
    const before=J.plan(p), old=before.cuts.filter(c=>c.line===0);
    assert.deepEqual(copy(old.map(c=>c.params._motionPlan)),copy(metadata));
    const r=J.captureMotionRecipe(p,before,0), after=J.plan(J.prepareMotionApply(p,before,0,r)).cuts.filter(c=>c.line===0);
    old.forEach((c,i)=>{if(c.text===after[i].text)assert.deepEqual(copy(c.params),copy(after[i].params));});
    // Pre-fix recipes have no original font-role record; keep them loadable.
    for(const c of r.cuts)for(const spec of [c.layoutPlan,c.twinPlan].filter(Boolean))delete spec.fontRoles;
    assert.ok(J.plan(J.motionSampleProject(r)).cuts.length);
  }
});
