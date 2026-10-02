const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sandbox={window:{},document:{documentElement:{lang:'ja'},createElement:()=>({getContext:()=>({measureText:t=>({width:String(t).length*20})})})},console};
vm.createContext(sandbox);const root=path.join(__dirname,'../src');
for(const name of fs.readdirSync(root).filter(n=>n.endsWith('.js')&&n<'12').sort())vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
const J=sandbox.window.J,copy=x=>JSON.parse(JSON.stringify(x));
const switches=['extra','wa','horror','typo','kinetic'];
function fixture(filler=false,unify=false){
 const p=J.defaultProject();Object.assign(p,{theme:'ballad',unify});Object.assign(p,J.omakase(p,J.rng(222)));
 for(const k of switches)p[k]=false;
 p.subtitleCues=['朝が来る 光の中へ','夜の彼方へ 歩いていこう','明日へと 記憶の向こう'].map((text,i)=>({id:'c'+i,text,start:i*8,end:i*8+7,filler:filler&&i===1}));
 p.globalLook=J.globalLookBaseline(p,J.plan(p));return p;
}
test('themes narrow moods and enable required sets without mutating the input',()=>{
 for(const [theme,T]of Object.entries(J.THEMES))for(let seed=1;seed<=30;seed++){
  const p=fixture();p.theme=theme;const before=JSON.stringify(p),draw=J.omakase(p,J.rng(seed)),effective={...p,...draw};
  assert.equal(JSON.stringify(p),before);assert.ok(T.moods.includes(draw.mood));assert.equal(draw.lookTheme,theme);
  for(const[k,v]of Object.entries(J.themeSwitches(theme)))assert.equal(effective[k],v);
  for(const g of J.GROUP_KEYS)for(const id of J.order(g)){const d=J.registry(g)[id];if(!d.special&&J.randomOk(effective,g,id)&&((T.set&&d.set===T.set)||(T.wa&&d.wa)))assert.equal(draw.enabled[g][id],true,theme+' '+g+'.'+id);}
  if(theme==='ballad')assert.ok([0,15].includes(draw.fx.koma));
 }
 for(const value of [undefined,null,'bogus','__proto__',{}])assert.equal(J.normalizeTheme(value),'');
 const a=fixture();a.theme='';const b=copy(a);delete b.theme;assert.deepEqual(copy(J.omakase(a,J.rng(4))),copy(J.omakase(b,J.rng(4))));
});
test('pending theme does not change existing snapshots or the global baseline',()=>{
 let p=fixture(true,true);p=J.prepareCueReroll(p,J.plan(p),1,null,'random');
 const before=copy(J.plan(p)),context=J.localLookContext(p),baseline=copy(J.globalLookBaseline(p,J.plan(p)));
 for(const theme of Object.keys(J.THEMES)){p.theme=theme;assert.deepEqual(copy(J.plan(p)),before);assert.equal(J.localLookContext(p),context);assert.deepEqual(copy(J.globalLookBaseline(p,J.plan(p))),baseline);}
});
test('cue 1 applies all themes locally, retains others, persists, and 9 restores applied global theme',()=>{
 for(const filler of [false,true])for(const unify of [false,true])for(const theme of Object.keys(J.THEMES)){
  let p=fixture(filler,unify);p.theme=theme;const current=J.plan(p),before=copy(p),others=[0,2].map(i=>copy(J.lineSnapshot(current,i)));
  p=J.prepareCueReroll(p,current,1,null,'all');let rule=p.overrides[1].cueLook;
  assert.equal(rule.lookTheme,theme);assert.ok(J.THEMES[theme].moods.includes(rule.mood));for(const[k,v]of Object.entries(J.themeSwitches(theme)))assert.equal(rule[k],v);
  for(const k of [...switches,'style','mood','fx','enabled','lookTheme','globalLook'])assert.deepEqual(copy(p[k]),before[k],k);
  assert.deepEqual([0,2].map(i=>copy(J.lineSnapshot(J.plan(p),i))),others);
  assert.deepEqual(copy(J.plan(copy(p))),copy(J.plan(p)));
  // fine/motion operate on the cue even after selecting a conflicting next theme.
  p.theme='pop';for(const mode of ['motion','fine']){p=J.prepareCueReroll(p,J.plan(p),1,null,mode);assert.equal(p.overrides[1].cueLook.lookTheme,theme);for(const[k,v]of Object.entries(J.themeSwitches(theme)))assert.equal(p.overrides[1].cueLook[k],v);}
  p=J.prepareCueReroll(p,J.plan(p),1,null,'global');rule=p.overrides[1].cueLook;assert.equal(rule.lookTheme,'ballad');assert.equal(rule.style,before.style);assert.equal(rule.mood,before.mood);assert.equal(p.theme,'pop');for(const k of switches)assert.equal(rule[k],false);
 }
});
test('2 and 3 keep their invariants; themed 0/5 remain independent and manual draws are supported',()=>{
 for(const mode of ['style','mood'])for(const randomFirst of [false,true]){
  let p=fixture(false,true);if(randomFirst)p=J.prepareCueReroll(p,J.plan(p),1,null,'random');else p.overrides[1]={layout:'center',enter:'wipe'};
  const current=J.plan(p),first=current.cuts.find(c=>c.line===1),oldStyle=first.renderLook?.style||current.style,oldMood=p.overrides[1]?.cueLook?.mood||p.mood;
  p.theme='horror';p=J.prepareCueReroll(p,current,1,null,mode);const rule=p.overrides[1].cueLook,updated=J.plan(p).cuts.find(c=>c.line===1);
  assert.equal(rule.lookTheme,'horror');assert.equal(rule.horror,true);assert.equal(p.horror,false);assert.deepEqual(copy(updated.renderLook.style.schemes),copy(oldStyle.schemes));
  if(mode==='style')assert.equal(rule.mood,oldMood);else{assert.equal(rule.mood,'horror');assert.equal(updated.layout,first.layout);assert.deepEqual(copy(updated.renderLook.style.fonts),copy(oldStyle.fonts));}
 }
 for(const mode of ['color','random']){const a=fixture(),b=copy(a);a.theme='horror';b.theme='ballad';const ra=J.prepareCueReroll(a,J.plan(a),1,null,mode),rb=J.prepareCueReroll(b,J.plan(b),1,null,mode);assert.deepEqual(copy(ra.overrides),copy(rb.overrides));assert.deepEqual(copy(J.plan(ra).cuts),copy(J.plan(rb).cuts));}
});
test('local candidates really bypass disabled global sets after changing the draw seed',()=>{
 let p=fixture();p.theme='horror';p=J.prepareCueReroll(p,J.plan(p),1,null,'all');
 const rule=p.overrides[1].cueLook;rule.enabled.layout=Object.fromEntries(J.LAYOUT_ORDER.map(k=>[k,k==='hrCctv']));
 p.overrides[1].seed++;p.localLooks=null;assert.ok(J.plan(p).cuts.filter(c=>c.line===1).every(c=>c.layout==='hrCctv'));
 assert.equal(p.horror,false);
});
