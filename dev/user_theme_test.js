const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const sandbox = { window: {}, document: { documentElement: {lang:'ja'}, createElement: () => ({getContext: () => ({measureText:t=>({width:String(t).length*20})})}) }, console };
vm.createContext(sandbox);
for (const name of fs.readdirSync(path.join(__dirname,'../src')).filter(n=>n.endsWith('.js')&&n<'12').sort()) vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',name),'utf8'), sandbox, {filename:name});
const J = sandbox.window.J, copy = x=>JSON.parse(JSON.stringify(x));
const make = (id='user-a', name='Theme A', styles={noir:1}, moods={calm:1}) => ({id,name,styles,moods});
function fixture() {
 const p=J.defaultProject(); p.userThemes=[make()];p.theme='user-a';Object.assign(p,J.omakase(p,J.rng(121)));
 p.subtitleCues=['朝が来る 光の中へ','夜の彼方へ 歩いていこう','明日へと 記憶の向こう'].map((text,i)=>({id:'c'+i,text,start:i*8,end:i*8+7,filler:i===1}));
 p.globalLook=J.globalLookBaseline(p,J.plan(p));return p;
}
test('weighted styles/moods are independent, repeatable and never escape explicit choices',()=>{
 const p=J.defaultProject(), t=make('user-w','Weights',{noir:5,paper:3,random:2},{calm:2,pop:1});
 const allowed=J.STYLE_ORDER.filter(k=>J.randomOk(p,'style',k)), sequence=(...v)=>()=>v.shift()??0;
 assert.equal(J.prepareUserThemeDraw(p,t,sequence(0,.49)).style,'noir');
 assert.equal(J.prepareUserThemeDraw(p,t,sequence(0,.5)).style,'paper');
 assert.equal(J.prepareUserThemeDraw(p,t,sequence(.8,.8,0)).style,allowed[0]);
 assert.equal(J.prepareUserThemeDraw(p,t,sequence(.8,.8,.999)).style,allowed.at(-1));
 assert.equal(J.prepareUserThemeDraw(p,t,sequence(.8,.1)).mood,'pop');
 p.userThemes=[make('user-one','One',{paper:10},{glitch:10})];p.theme='user-one';p.style='paper';
 for(let i=0;i<50;i++){const r=J.omakase(p,J.rng(i));assert.equal(r.style,'paper');assert.equal(r.mood,'glitch');}
 const randomOnly=make('user-r','Random',{random:1},{random:1}), moods=Object.keys(J.MOODS).filter(k=>!J.MOODS[k].set||J.setOn(p,J.MOODS[k].set));
 for(let i=0;i<allowed.length;i++) assert.equal(J.prepareUserThemeDraw(p,randomOnly,sequence(0,0,0,(i+.5)/allowed.length)).style,allowed[i]);
 for(let i=0;i<moods.length;i++) assert.equal(J.prepareUserThemeDraw(p,randomOnly,sequence(0,(i+.5)/moods.length,0,0)).mood,moods[i]);
});
test('explicit choices enable required sets locally and random buckets do not enable disabled sets',()=>{
 const p=fixture(); for(const k of ['extra','wa','horror','kinetic','typo'])p[k]=false;
 for(const style of J.STYLE_ORDER){
  p.userThemes=[make('user-exp','Explicit',{[style]:1},{calm:1})];p.theme='user-exp';
  const before=JSON.stringify(p),r=J.omakase(p,J.rng(22));assert.equal(JSON.stringify(p),before);assert.equal(r.style,style);
  assert.ok(J.randomOk({...p,...r},'style',style));
 }
 p.userThemes=[make('user-h','Horror',{noir:1},{horror:1})];p.theme='user-h';
 const before=J.plan(p),q=J.prepareCueReroll(p,before,1,null,'all');assert.equal(q.horror,false);assert.equal(q.overrides[1].cueLook.horror,true);
 assert.deepEqual(copy(J.lineSnapshot(J.plan(q),0)),copy(J.lineSnapshot(before,0)));
});
test('one project snapshot is shared; edits, deletion and same-name recreation never change applied baselines',()=>{
 let p=fixture();const ref=p.lookTheme, original=copy(p.themeSnapshots[ref]);
 for(let i=0;i<3;i++)p=J.prepareCueReroll(p,J.plan(p),i,null,'all');
 assert.equal(Object.keys(p.themeSnapshots).length,1);
 for(const o of Object.values(p.overrides)){assert.equal(o.cueLook.lookTheme,ref);assert.equal(o.cueLook.themeSnapshots,undefined);assert.equal(o.cueLook.userThemes,undefined);}
 const before=copy(J.plan(p)), baseline=copy(J.globalLookBaseline(p,J.plan(p)));
 p.userThemes[0].styles={paper:1};p.userThemes[0].moods={pop:1};
 assert.deepEqual(copy(J.plan(p)),before);assert.deepEqual(copy(p.themeSnapshots[ref]),original);
 p.userThemes=[];p.theme='';assert.deepEqual(copy(J.globalLookBaseline(p,J.plan(p))),baseline);
 p.userThemes=[make('user-new','Theme A',{paper:1},{pop:1})];p.theme='user-new';
 for(const mode of ['fine','motion']){const q=J.prepareCueReroll(p,J.plan(p),1,null,mode);assert.equal(q.overrides[1].cueLook.style,'noir');assert.equal(q.overrides[1].cueLook.mood,'calm');assert.equal(q.overrides[1].cueLook.lookTheme,ref);}
 const fresh=J.prepareCueReroll(p,J.plan(p),1,null,'all');assert.equal(fresh.overrides[1].cueLook.style,'paper');assert.notEqual(fresh.overrides[1].cueLook.lookTheme,ref);
 assert.equal(Object.keys(fresh.themeSnapshots).length,2);
 const restored=J.prepareCueReroll(fresh,J.plan(fresh),1,null,'global');assert.equal(restored.overrides[1].cueLook.style,'noir');assert.equal(restored.overrides[1].cueLook.lookTheme,ref);
 const loaded=copy(restored);J.upgradeLayerProject(loaded,copy(restored));assert.deepEqual(copy(J.plan(loaded)),copy(J.plan(restored)));
 const again=J.prepareCueReroll(fresh,J.plan(fresh),2,null,'all');assert.equal(Object.keys(again.themeSnapshots).length,2);
});
test('partial draws use only the requested dimension, including after full random; 0 and 5 ignore themes',()=>{
 const manual=J.defaultProject();manual.userThemes=[make('user-manual','Manual',{paper:1},{horror:1})];manual.theme='user-manual';
 const manualDraw=J.omakase(manual,J.rng(1),{mood:manual.mood});assert.equal(manualDraw.mood,null);assert.equal(manualDraw.style,'paper');assert.equal(manualDraw.horror,undefined);
 const manualCue=J.prepareCueReroll(manual,J.plan(manual),0,null,'style');assert.equal(manualCue.overrides[0].cueLook.mood,null);assert.equal(manualCue.overrides[0].cueLook.style,'paper');assert.equal(manualCue.overrides[0].cueLook.horror,false);
 for(const randomFirst of [false,true])for(const mode of ['style','mood']){
  let p=fixture();if(randomFirst)p=J.prepareCueReroll(p,J.plan(p),1,null,'random');
  p.userThemes.push(make('user-b','B',{paper:1},{horror:1}));p.theme='user-b';
  const before=J.plan(p),cut=before.cuts.find(c=>c.line===1),oldStyle=cut.renderLook?.style||before.style;
  const q=J.prepareCueReroll(p,before,1,null,mode),rule=q.overrides[1].cueLook,newCut=J.plan(q).cuts.find(c=>c.line===1);
  assert.equal(rule.style,mode==='style'?'paper':'noir');assert.equal(rule.mood,mode==='mood'?'horror':'calm');
  assert.equal(!!rule.horror,mode==='mood');assert.deepEqual(copy(newCut.renderLook.style.schemes),copy(oldStyle.schemes));
  if(mode==='mood'){assert.equal(newCut.layout,cut.layout);assert.deepEqual(copy(newCut.renderLook.style.fonts),copy(oldStyle.fonts));}
 }
 for(const mode of ['random','color']){const a=fixture(),b=copy(a);b.userThemes.push(make('user-b','B',{paper:1},{horror:1}));b.theme='user-b';assert.deepEqual(copy(J.prepareCueReroll(a,J.plan(a),1,null,mode).overrides),copy(J.prepareCueReroll(b,J.plan(b),1,null,mode).overrides));}
});
test('portable library merges by ID and content, never by name alone; invalid files fail atomically',()=>{
 const a=make(),b=make('user-b');let merged=J.mergeUserThemeLists([a],[b]);assert.equal(merged.themes.length,2);
 merged=J.mergeUserThemeLists([a],[{...a,styles:{paper:3}}]);assert.equal(merged.themes.length,2);assert.notEqual(merged.idMap[a.id],a.id);assert.equal(merged.themes[0].styles.noir,1);
 const twice=J.mergeUserThemeLists(merged.themes,[{...a,styles:{paper:3}}]);assert.equal(twice.themes.length,2);assert.equal(twice.idMap[a.id],merged.idMap[a.id]);
 const file={format:'jizura-user-themes',version:1,themes:[a,b]};assert.equal(J.parseUserThemeFile(copy(file)).length,2);
 for(const bad of [{...file,version:3},{...file,themes:[a,a]},{...file,themes:[{...a,styles:{}}]},{...file,themes:[{...a,moods:{calm:11}}]},{...file,themes:[{...a,styles:{noir:.5}}]}])assert.throws(()=>J.parseUserThemeFile(bad));
 assert.equal(J.normalizeTheme('__proto__',{userThemes:[a]}),'');assert.equal(Object.keys(J.normalizeThemeSnapshots(JSON.parse('{"__proto__":{}}'))).length,0);
});
test('mood-driven style entry survives files and follows the drawn or retained mood',()=>{
 const p=fixture(), t=make('user-mood','Mood driven',{fromMood:10},{horror:1});
 assert.deepEqual(copy(J.normalizeUserTheme(t)),t);
 assert.equal(J.userThemesFile([t]).version,2);assert.equal(J.userThemesFile([make()]).version,1);
 assert.deepEqual(copy(J.parseUserThemeFile(J.userThemesFile([t]))),[t]);
 p.userThemes=[t];p.theme=t.id;p.horror=false;
 const seq=(...v)=>()=>v.shift()??0;
 const draw=J.prepareUserThemeDraw(p,t,seq(0,0,0,0));
 const preferred=J.moodStyleCandidates({...p,horror:true},'horror').preferred.filter(k=>k!==p.style);
 assert.equal(draw.mood,'horror');assert.equal(draw.style,preferred[0]);assert.equal(draw.switches.horror,true);assert.equal(p.horror,false);
 const calm=J.prepareUserThemeDraw(p,t,seq(0,0,0),{mood:'calm'});
 assert.equal(calm.mood,'calm');assert(J.moodStyleCandidates(p,'calm').preferred.includes(calm.style));assert.notEqual(calm.switches.horror,true);
 const unset=J.prepareUserThemeDraw(p,t,seq(0,0),{mood:null});
 assert.equal(unset.mood,null);assert.equal(unset.style,J.STYLE_ORDER.find(k=>J.randomOk(p,'style',k)));
 const retained=J.prepareUserThemeDraw(p,t,seq(0),{style:'paper'});assert.equal(retained.style,'paper');assert.equal(retained.mood,'horror');
 for(const mode of ['all','style','mood']){
  const q=J.prepareCueReroll(p,J.plan(p),1,null,mode),r=q.overrides[1].cueLook;
  assert.equal(r.mood,mode==='style'?'calm':'horror');
  if(mode==='mood')assert.equal(r.style,'noir');
  else assert(J.moodStyleCandidates({...p,horror:r.horror},r.mood).allowed.includes(r.style));
  assert.equal(q.themeSnapshots[r.lookTheme].styles.fromMood,10);
  const loaded=copy(q);J.upgradeLayerProject(loaded,copy(q));assert.deepEqual(copy(J.plan(loaded)),copy(J.plan(q)));
 }
});
test('mood style lottery retains original pools, branch ratio and current-style exclusion',()=>{
 const flags=['extra','wa','horror','kinetic','typo'];
 for(let bits=0;bits<32;bits++)for(const mood of Object.keys(J.MOODS)){
  const p=J.defaultProject();flags.forEach((k,i)=>p[k]=!!(bits&(1<<i)));
  if(J.MOODS[mood].set)p[J.MOODS[mood].set]=true;
  const M=J.MOODS[mood];
  const allowed=J.STYLE_ORDER.filter(k=>{const d=J.STYLES[k];return J.randomOk(p,'style',k)&&(!d.set||!Object.values(J.MOODS).some(m=>m.set===d.set)||M.set===d.set);});
  const preferred=[...new Set([...(M.styles||[]),...J.STYLE_ORDER.filter(k=>(J.STYLES[k].moods||[]).includes(mood))])].filter(k=>allowed.includes(k));
  assert.deepEqual(copy(J.moodStyleCandidates(p,mood)),{allowed:copy(allowed),preferred:copy(preferred)});
  for(const style of allowed)for(let seed=0;seed<10;seed++){
   p.style=style;const r=J.rng(seed),r2=J.rng(seed);
   let pool=(preferred.length&&r()<.72?preferred:allowed).filter(k=>k!==style);
   if(!pool.length)pool=allowed.filter(k=>k!==style);if(!pool.length)pool=allowed;
   assert.equal(J.chooseStyleFromMood(p,mood,r2),pool[Math.floor(r()*pool.length)]);
  }
 }
});
test('integer approximation is optimal across every mood and set combination and never drops a preferred style',()=>{
 const flags=['extra','wa','horror','kinetic','typo'];let maxError=0,maxCount=0;
 for(let bits=0;bits<32;bits++)for(const mood of Object.keys(J.MOODS)){
  const p=J.defaultProject();flags.forEach((k,i)=>p[k]=!!(bits&(1<<i)));const before=JSON.stringify(p);
  const result=J.approximateMoodStyleWeights(p,mood),context={...p};if(J.MOODS[mood].set)context[J.MOODS[mood].set]=true;
  const {preferred}=J.moodStyleCandidates(context,mood),n=preferred.length;
  assert.equal(JSON.stringify(p),before);assert.equal(result.preferredCount,n);maxCount=Math.max(maxCount,n);
  assert.equal(result.weights.fromMood,undefined);
  assert.deepEqual(Object.keys(result.weights).sort(),['random',...preferred].sort());
  for(const w of Object.values(result.weights))assert(Number.isInteger(w)&&w>=1&&w<=10);
  if(!n){assert.deepEqual(copy(result.weights),{random:1});continue;}
  const w=result.weights[preferred[0]],r=result.weights.random;
  preferred.forEach(k=>assert.equal(result.weights[k],w));assert.equal(result.mainShare,n*w/(n*w+r));
  const error=Math.abs(result.mainShare-.72);maxError=Math.max(maxError,error);
  for(let a=1;a<=10;a++)for(let b=1;b<=10;b++)assert(error<=Math.abs(n*a/(n*a+b)-.72)+1e-12);
  p.style=preferred[0];assert.deepEqual(copy(J.approximateMoodStyleWeights(p,mood)),copy(result));
 }
 assert.equal(maxCount,13);assert(maxError<=.010323);
});
test('every explicit style/mood pair can plan valid short and long cues without escaping its style',()=>{
 let seed=0;
 for(const style of J.STYLE_ORDER)for(const mood of Object.keys(J.MOODS)){
  const p=J.defaultProject();p.userThemes=[make('user-pair','Pair',{[style]:1},{[mood]:1})];p.theme='user-pair';
  p.subtitleCues=[{id:'short',text:'光',start:0,end:.6},{id:'long',text:'Had a Dream in the Neon 夜の彼方へ歩いていこう',start:.6,end:9}];
  Object.assign(p,J.omakase(p,J.rng(++seed)));const plan=J.plan(p);assert.equal(p.style,style);assert.equal(p.mood,mood);assert(plan.cuts.length>0);
  for(const c of plan.cuts){assert(Number.isFinite(c.start)&&Number.isFinite(c.end)&&c.end>c.start,style+'/'+mood);assert(J.LAYOUTS[c.layout]);}
 }
});
