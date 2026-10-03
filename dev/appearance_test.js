const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const sandbox = { window: {}, document: { documentElement: { lang: 'ja' }, createElement: () => ({ getContext: () => ({ measureText: t => ({ width: String(t).length * 20 }) }) }) }, console };
vm.createContext(sandbox);
const root = path.join(__dirname, '../src');
for (const name of fs.readdirSync(root).filter(n => n.endsWith('.js') && n < '12').sort()) vm.runInContext(fs.readFileSync(path.join(root,name),'utf8'),sandbox,{filename:name});
const J=sandbox.window.J, copy=x=>JSON.parse(JSON.stringify(x));
function fixture() {
  const p=J.defaultProject(); Object.assign(p,J.omakase(p,J.rng(152)));
  p.style='caution'; p.mood='graphic'; p.overrides={};
  p.subtitleCues=['朝が来る 光の中へ','空の向こう 夜の彼方へ','明日へ 歩いていこう'].map((text,i)=>({id:'c'+i,text,start:i*6,end:i*6+6}));
  return p;
}
function motion(plan) {return copy(plan.cuts.map(c=>Object.fromEntries(['line','text','start','end','layout','enter','exit','hold','bg','cam','trans','treat','decor','seed'].map(k=>[k,c[k]]))));}
test('global palette changes the yellow base while preserving motion, inheritance and persistence',()=>{
  let p=fixture(), before=J.plan(p), original=JSON.stringify(p);
  const n=J.prepareGlobalAppearance(p,before,null,'color',J.rng(15)), after=J.plan(n);
  assert.equal(JSON.stringify(p),original);
  assert.notEqual(after.style.schemes[0].bg,before.style.schemes[0].bg);
  assert.deepEqual(motion(after),motion(before));
  assert.equal(n.style,p.style); assert.equal(n.mood,p.mood);
  assert.ok(!n.overrides[0].cueLook,'ordinary cue must inherit future global changes');
  assert.deepEqual(copy(J.plan(copy(n)).cuts),copy(after.cuts));
  const accents={accent:'#e755aa',ghostA:'#11bbcc',ghostB:'#ff3311'};
  const fine=J.prepareGlobalAppearance(n,after,null,'accent',J.rng(2),accents), finePlan=J.plan(fine);
  assert.equal(finePlan.style.schemes[0].bg,after.style.schemes[0].bg);
  assert.deepEqual(motion(finePlan),motion(after));
  assert.notEqual(finePlan.cuts[0].renderLook.style.schemes[0].accent,after.cuts[0].renderLook.style.schemes[0].accent);
});
test('global appearance updates local/random cues but preserves locked artwork',()=>{
  for(const mode of ['color','font']) {
    let p=fixture(); p=J.prepareCueReroll(p,J.plan(p),0,null,'all');
    p=J.prepareCueReroll(p,J.plan(p),1,null,'random');
    p.overrides[2]={lock:true}; const before=J.plan(p);
    const n=J.prepareGlobalAppearance(p,before,null,mode,J.rng(7)), after=J.plan(n);
    assert.deepEqual(motion(after),motion(before));
    const locked=after.cuts.filter(c=>c.line===2), old=before.cuts.filter(c=>c.line===2);
    assert.deepEqual(copy(locked.map(c=>c.params)),copy(old.map(c=>c.params)));
    assert.deepEqual(copy(locked[0].renderLook.style),copy(old[0].renderLook?.style||before.style));
    assert.deepEqual(copy(n.overrides[1].randomDraw.cuts),copy(n.localLooks.lines.c1.cuts));
    assert.deepEqual(copy(J.plan(copy(n)).cuts),copy(after.cuts));
  }
});
test('cue font draw preserves neighbors, motion and palette, and works after random',()=>{
  for(const random of [false,true]) {
    let p=fixture(); if(random)p=J.prepareCueReroll(p,J.plan(p),1,null,'random');
    const before=J.plan(p), n=J.prepareCueReroll(p,before,1,null,'font'), after=J.plan(n);
    assert.deepEqual(motion(after),motion(before));
    assert.deepEqual(copy(after.cuts.filter(c=>c.line!==1)),copy(before.cuts.filter(c=>c.line!==1)));
    const old=before.cuts.find(c=>c.line===1), cur=after.cuts.find(c=>c.line===1);
    assert.deepEqual(copy(cur.renderLook.style.schemes),copy(old.renderLook?.style.schemes||before.style.schemes));
    assert.deepEqual(copy(n.fonts),copy(p.fonts));
    assert.deepEqual(copy(J.plan(copy(n)).cuts),copy(after.cuts));
    for(const follow of ['color','fine','global']) assert.ok(J.plan(J.prepareCueReroll(n,after,1,null,follow)).cuts.length);
  }
  assert.equal(J.cueRerollKey('font'),'7'); assert.equal(J.cueRerollKey('global'),'9'); assert.equal(J.cueRerollKey('random'),'0');
});
test('font retargeting changes fonts only, retaining geometry and mono HUD',()=>{
  const p=fixture(), style=J.resolveStyle(p), fonts=J.drawFontRoles(p,style,J.rng(5),false);
  const c={params:{font:style.fonts.display[0],shape:'round',mark:'dot',nested:{fonts:[style.fonts.display[0]],size:15},fontHUD:'mono'},twinParams:{font:style.fonts.display[0]}};
  J.retargetCutFonts(c,fonts,{style});
  assert.equal(c.params.font,fonts.display); assert.equal(c.twinParams.font,fonts.display);
  assert.equal(c.params.shape,'round'); assert.equal(c.params.mark,'dot'); assert.equal(c.params.nested.size,15);
  assert.equal(c.params.fontHUD,'mono');
  p.mood='calm'; for(let i=0;i<30;i++){
    const f=J.drawFontRoles(p,style,J.rng(i),true);
    assert.ok(!['dela','pop','reggae','rampart','potta','round','dot'].includes(f.display));
  }
});
test('all style palettes remain valid and new omakase clears the global palette',()=>{
  for(const s of Object.values(J.STYLES))for(let i=0;i<10;i++){
    const cols=J.drawRelatedPalette(s.schemes,J.rng(i));
    for(const c of cols)for(const k of ['bg','fg','accent'])assert.match(c[k],/^#[0-9a-f]{6}$/i);
  }
  const p=fixture(), n=J.prepareGlobalAppearance(p,J.plan(p),null,'color',J.rng(2));
  const fresh=J.omakase(n,J.rng(2)); assert.ok(!fresh.colors.palette);
});
test('appearance-only draws keep manual cut geometry, fillers and center-free twins',()=>{
  for(const mode of ['color','font'])for(const local of [false,true]){
    const p=fixture(); p.centerFree=true; p.subtitleCues[1].filler=true;
    p.overrides[1]={cuts:1,cutTech:{0:{layout:'center',bg:'bigChar'}}};
    const before=J.plan(p), n=local?J.prepareCueReroll(p,before,1,null,mode):J.prepareGlobalAppearance(p,before,null,mode,J.rng(7)), after=J.plan(n);
    assert.deepEqual(motion(after),motion(before));
    const c=after.cuts.find(c=>c.line===1), b=before.cuts.find(c=>c.line===1);
    if(mode==='color')assert.deepEqual(copy(c.params),copy(b.params));
    if(mode==='font')assert.notEqual(c.params.font,b.params.font);
  }
});
