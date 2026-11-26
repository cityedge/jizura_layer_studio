const test=require('node:test'), assert=require('node:assert/strict');
const fs=require('node:fs'), path=require('node:path'), vm=require('node:vm');
function engine(store=new Map()) {
  const sandbox={window:{},console,localStorage:{getItem:k=>store.get(k),setItem:(k,v)=>store.set(k,v)},
    document:{documentElement:{lang:'ja'},createElement:()=>({getContext:()=>({measureText:t=>({width:String(t).length*20})})})}};
  vm.createContext(sandbox);
  const root=path.join(__dirname,'../src');
  for(const f of fs.readdirSync(root).filter(f=>f.endsWith('.js')&&f<'12').sort())
    vm.runInContext(fs.readFileSync(path.join(root,f),'utf8'),sandbox,{filename:f});
  return sandbox.window.J;
}
const plain = value => JSON.parse(JSON.stringify(value));
const allParts = J => J.GROUP_KEYS.flatMap(g=>J.order(g).filter(k=>J.blacklistEligible(g,k)).map(k=>[g,k]));
function fixture(J) {
  const p=J.defaultProject();
  Object.assign(p,J.omakase(p,J.rng(551)));
  p.seed=711;p.unify=true;p.fx.decor=1;
  p.subtitleCues=['夜の空に 星がまたたく','見上げた先には 光があった','夜の空に 星がまたたく'].map((text,i)=>({id:'c'+i,text,start:6*i,end:6*(i+1)}));
  return p;
}
function ids(cuts,g) {
  if(g==='fx')return cuts.flatMap(c=>c.events.map(e=>e.type));
  if(g==='decor')return cuts.flatMap(c=>c.decor.map(d=>d.id));
  return cuts.map(c=>c[g]).filter(Boolean);
}
function check(J,cuts,groups,msg) {
  for(const g of groups) for(const k of ids(cuts,g)) assert(!J.blacklistEligible(g,k),msg+' '+g+' '+k);
}
test('browser exclusions are portable, deduplicated, atomic and independent of projects',()=>{
  const store=new Map(),J=engine(store),p=fixture(J),before=JSON.stringify(J.plan(p));
  const file=J.blacklistFile([['enter','blur'],['enter','blur']]);
  assert.deepEqual(plain(file.entries),[['enter','blur']]);J.writeBlacklist(J.parseBlacklist(plain(file)));
  const reopened=engine(store);
  assert.deepEqual(plain(reopened.readBlacklist()),[['enter','blur']]);
  for(const items of [[['layout','center']],[['bogus','id']],[['__proto__','x']],[['enter','unknown']]]) {
    assert.throws(()=>J.writeBlacklist(items)); assert.throws(()=>J.parseBlacklist({...file,entries:items}));
  }
  assert.equal(JSON.stringify(J.plan(p)),before);
  assert(!JSON.stringify(p).includes('blacklist'));
  J.writeBlacklist([]);assert.equal(JSON.stringify(J.plan(p)),before);
});
test('all-excluded global draws use finite defaults, preserve locks, repeats, and replay without the list',()=>{
  const J=engine(),p=fixture(J),before=J.plan(p);
  p.overrides[0]={lock:true,lockedCuts:J.lineSnapshot(before,0)};
  J.writeBlacklist(allParts(J));
  const after=J.planGlobalTechniqueDraw(p);
  for(const i of [1,2])check(J,J.lineSnapshot(after,i),J.GROUP_KEYS,'global '+i);
  assert.deepEqual(ids(J.lineSnapshot(after,0),'layout'),ids(J.lineSnapshot(before,0),'layout'));
  const expected=J.lineSnapshot(after,2);
  J.writeBlacklist([]);
  assert.deepEqual(plain(J.lineSnapshot(J.plan(plain(p)),2)),plain(expected));
});
test('cue draws only filter the groups being drawn, including full random and global-taste restore',()=>{
  const J=engine(),p=fixture(J),before=J.plan(p);
  J.writeBlacklist(allParts(J));
  for(const mode of ['all','style','mood','motion','fine','random','global','color','font','pitch']) {
    const next=J.prepareCueReroll(p,before,1,null,mode),after=J.plan(next);
    const cuts=J.lineSnapshot(after,1),old=J.lineSnapshot(before,1);
    const groups=mode==='style'?['layout','bg','treat']:mode==='mood'?['enter','exit','hold','decor','cam','treat','fx','trans']:
      ['font','color','pitch'].includes(mode)?[]:J.GROUP_KEYS;
    check(J,cuts,groups,mode);
    if(['font','color','mood'].includes(mode))assert.deepEqual(ids(cuts,'layout'),ids(old,'layout'));
    if(['font','color','style'].includes(mode))assert.deepEqual(ids(cuts,'hold'),ids(old,'hold'));
    for(const g of ['layout','bg','decor','hold','fx'])assert.deepEqual(ids(J.lineSnapshot(after,0),g),ids(J.lineSnapshot(before,0),g),mode+' neighbor '+g);
  }
});

test('adding a filler filters its draw and keeps every original lyric cut',()=>{
  const J=engine(),p=fixture(J);
  p.subtitleCues[0].end=4;
  const original=J.plan(p);
  J.writeBlacklist(allParts(J));
  p.subtitleCues.splice(1,0,{id:'fill',start:4,end:6,text:'星',filler:true});
  const drawn=J.planAddedTechniques(p,null,line=>p.subtitleCues[line.index].filler);
  check(J,J.lineSnapshot(drawn,1),J.GROUP_KEYS,'filler');
  for(const [from,to] of [[0,0],[1,2],[2,3]]) {
    assert.deepEqual(plain(J.lineSnapshot(drawn,to)),plain(J.lineSnapshot(original,from)));
  }
  J.writeBlacklist([]);
  assert.deepEqual(plain(J.lineSnapshot(J.plan(plain(p)),1)),plain(J.lineSnapshot(drawn,1)));
});

test('an exclusion is scoped by group even when the entrance and exit share an ID',()=>{
  const J=engine(),p=fixture(J);
  p.unify=false;
  p.enabled.enter=Object.fromEntries(J.order('enter').map(id=>[id,id==='blur']));
  p.enabled.exit=Object.fromEntries(J.order('exit').map(id=>[id,id==='blur']));
  J.writeBlacklist([['enter','blur']]);
  const drawn=J.planGlobalTechniqueDraw(p);
  assert(drawn.cuts.some(c=>c.exit==='blur'));
  assert(drawn.cuts.every(c=>c.enter!=='blur'));
  assert.equal(p.enabled.enter.blur,true);
});
