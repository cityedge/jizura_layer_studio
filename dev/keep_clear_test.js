const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sandbox={window:{},document:{documentElement:{lang:'ja'},createElement:()=>({getContext:()=>({measureText:t=>({width:String(t).length*20})})})},console};vm.createContext(sandbox);
const root=path.join(__dirname,'../src');for(const file of fs.readdirSync(root).filter(f=>f.endsWith('.js')&&f<'12').sort())vm.runInContext(fs.readFileSync(path.join(root,file),'utf8'),sandbox,{filename:file});
const J=sandbox.window.J,copy=x=>JSON.parse(JSON.stringify(x)),audio={duration:18,beats:[]};
function fixture(){const p=J.defaultProject();p.seed=421;p.subtitleCues=[{id:'a',start:1,end:7,text:'花が咲いた 光の中へ'},{id:'b',start:8,end:14,text:'夢を見ていた 夜の先へ'}];return p;}
function custom(p){p.centerFree=true;p.freeAreaMode='custom';J.ensureFreeAreas(p,J.plan(p,audio).lines);return p;}
const cuts=(plan,i)=>copy(plan.cuts.filter(c=>c.line===i).map(c=>{const n=copy(c);delete n.freeAreaLayout;if(n.companion)delete n.companion.freeAreaLayout;return n;}));
test('custom defaults match legacy center zones in landscape, portrait, square and portrait-LR',()=>{
 for(const [aspect,dir] of [['16:9','tb'],['21:9','tb'],['9:16','tb'],['9:16','lr'],['1:1','tb']]){
  const p=fixture();p.aspect=aspect;p.centerDir=dir;p.centerFree=true;
  const base=J.plan(p,audio),n=custom(copy(p)),plan=J.plan(n,audio);
  assert.deepEqual(cuts(plan,0),cuts(base,0),aspect+dir);
  assert.equal(J.freeAreaSide(p),aspect==='9:16'?'tall':'wide');
  assert.equal(Object.keys(n.freeAreas).length,2);assert(n.freeAreas['cue:a'].wide&&n.freeAreas['cue:a'].tall);
 }
});
test('aspect switching and active-side reset keep the other orientation and JSON data',()=>{
 const p=custom(fixture());p.freeAreas['cue:a'].wide={position:.3,width:.2};p.freeAreas['cue:a'].tall={position:.7,width:.3};
 p.aspect='9:16';assert.equal(J.cueFreeBand(p,0).position,.7);
 const raw=copy(p),restored=J.defaultProject();Object.assign(restored,raw);J.upgradeLayerProject(restored,raw);assert.deepEqual(copy(restored.freeAreas),copy(p.freeAreas));
 J.resetFreeAreas(restored,J.plan(restored,audio).lines);assert.equal(J.cueFreeBand(restored,0).position,.5);assert.equal(restored.freeAreas['cue:a'].wide.position,.3);
 restored.aspect='16:9';assert.equal(J.cueFreeBand(restored,0).position,.3);
 restored.centerFree=false;assert.equal(J.freeAreaMode(restored),'off');restored.centerFree=true;assert.equal(J.freeAreaMode(restored),'custom');
 const old=J.defaultProject();J.upgradeLayerProject(old,{centerFree:true});old.centerFree=true;assert.equal(J.freeAreaMode(old),'center');
});
test('edge bands use full text in the wide side and geometry stays outside the protected band',()=>{
 const p=custom(fixture());
 for(const aspect of ['16:9','9:16'])for(const position of [0,.2,.5,.8,1]){
  p.aspect=aspect;const side=J.freeAreaSide(p);p.freeAreas['cue:a'][side]=J.normalizeFreeBand({position,width:.3});
  const plan=J.plan(p,audio),g=J.freeAreaGeometry(p,0,plan.W,plan.H);
  assert(g.zones.length>=1);for(const c of plan.cuts.filter(c=>c.line===0)){
   if(g.zones.length===1){assert.equal(c.text,c.utext);assert(!c.companion);}
   for(const cut of [c,c.companion].filter(Boolean)){
    const z=cut.zone,r=g.rect;assert(z.w>0&&z.h>0);assert(z.x+z.w<=r.x||z.x>=r.x+r.w||z.y+z.h<=r.y||z.y>=r.y+r.h);
   }
  }
 }
});
test('band edits preserve neighboring motion and all cue draws preserve both bands',()=>{
 let p=custom(fixture()),before=J.plan(p,audio);J.captureLocalLooks(p,before,audio);
 p.freeAreas['cue:a'].wide={position:.2,width:.3};const after=J.plan(p,audio);
 assert.deepEqual(cuts(after,1),cuts(before,1));
 for(const mode of J.cueRerollModes.map(m=>m[0])){
  const n=J.prepareCueReroll(p,after,0,audio,mode);assert.deepEqual(copy(n.freeAreas),copy(p.freeAreas),mode);
  assert(J.plan(n,audio).cuts.filter(c=>c.line===0).every(c=>c.zone));
 }
});
test('SRT reorder and filler grouping attach bands to cue IDs, not current indices',()=>{
 const p=custom(fixture());p.freeAreas['cue:a'].wide={position:.2,width:.3};
 J.editLayerCue(p,0,{start:15,end:18});assert.equal(p.subtitleCues[1].id,'a');assert.equal(J.cueFreeBand(p,1).position,.2);
 p.subtitleCues.unshift({id:'f',start:0,end:1,text:'前奏',filler:true});
 const plan=J.plan(p,audio),line=plan.lines.find(l=>l.index===2);assert.equal(line.freeArea.band.position,.2);
 assert(plan.cuts.filter(c=>c.line===2).every(c=>c.zone.x>0));
});
test('closing a band uses the full frame only for its cue and restores both saved bands',()=>{
 const p=custom(fixture()), areas=p.freeAreas['cue:a'];
 areas.wide={position:.4,width:.23};
 areas.tall={position:.57,width:.31};
 const original=copy(areas),before=J.plan(p,audio);
 J.captureLocalLooks(p,before,audio);
 areas.closed=true;
 const closed=J.plan(p,audio);
 assert.deepEqual(cuts(closed,1),cuts(before,1));
 assert(closed.cuts.filter(c=>c.line===0).every(c=>!c.zone&&!c.companion&&c.text===c.utext));
 const recipe=J.captureMotionRecipe(p,closed,0);
 assert.equal(recipe.centerFree,false);
 assert.throws(()=>J.prepareMotionApply(p,closed,1,recipe,audio));
 assert(J.prepareMotionApply(p,closed,0,recipe,audio));
 const rerolled=J.prepareCueReroll(p,closed,0,audio,'fine');
 J.upgradeLayerProject(rerolled,JSON.parse(JSON.stringify(rerolled)));
 rerolled.aspect='9:16';
 const tall=J.plan(rerolled,audio);
 assert(tall.cuts.filter(c=>c.line===0).every(c=>!c.zone&&!c.companion));
 assert(tall.cuts.filter(c=>c.line===1).every(c=>c.zone));
 J.ensureFreeAreas(rerolled,tall.lines);
 assert.equal(rerolled.freeAreas['cue:a'].closed,true);
 delete rerolled.freeAreas['cue:a'].closed;
 assert.deepEqual(copy(rerolled.freeAreas['cue:a']),original);
 assert(J.plan(rerolled,audio).cuts.filter(c=>c.line===0).every(c=>c.zone));
 p.freeAreaMode=null;
 assert(J.plan(p,audio).cuts.filter(c=>c.line===0).every(c=>c.zone));
});
test('motion library uses destination bands; locks remain renderable after resizing',()=>{
 const p=custom(fixture());p.freeAreas['cue:b'].wide={position:.8,width:.3};let plan=J.plan(p,audio);
 const recipe=J.captureMotionRecipe(p,plan,0),n=J.prepareMotionApply(p,plan,1,recipe,audio),after=J.plan(n,audio);
 assert.deepEqual(copy(n.freeAreas),copy(p.freeAreas));assert(after.cuts.filter(c=>c.line===1).every(c=>!c.companion));
 n.overrides[0]={lock:true,lockedCuts:J.lineSnapshot(after,0)};n.freeAreas['cue:a'].wide={position:.15,width:.3};
 assert(J.plan(n,audio).cuts.filter(c=>c.line===0).every(c=>!c.companion&&c.text===c.utext));
});
test('invalid imported bands are bounded and do not pollute object prototypes',()=>{
 const p=fixture(),raw={...copy(p),centerFree:true,freeAreaMode:'custom',freeAreas:JSON.parse('{"__proto__":{"bad":true},"cue:a":{"wide":{"position":999,"width":999},"tall":{"position":-5,"width":-1}}}')};
 J.upgradeLayerProject(p,raw);assert(!({}).bad);assert.deepEqual(copy(p.freeAreas['cue:a'].wide),{position:.64,width:.72});assert.deepEqual(copy(p.freeAreas['cue:a'].tall),{position:.04,width:.08});
});
test('leaving custom mode replans saved layout dimensions for full-frame and center modes',()=>{
 const p=custom(fixture());p.freeAreas['cue:a'].wide={position:.15,width:.3};
 let plan=J.plan(p,audio);J.captureLocalLooks(p,plan,audio);
 p.centerFree=false;p.freeAreaMode=null;J.rekeyLocalLooks(p,plan,audio);
 plan=J.plan(p,audio);
 for(const c of plan.cuts.filter(c=>c.line===0)){
  assert(!c.zone);assert(!c.companion);assert.equal(c.text,c.utext);
  const expected=J.freeAreaParams(c.params,c.layout,c.utext,{w:plan.W,h:plan.H},(c.end-c.start)*c.motionPitch,plan.style,J.h(c.seed,23));
  assert.deepEqual(copy(c.params),copy(expected));
 }
 J.captureLocalLooks(p,plan,audio);p.centerFree=true;J.rekeyLocalLooks(p,plan,audio);
 plan=J.plan(p,audio);assert(plan.cuts.filter(c=>c.line===0).every(c=>c.companion));
});
