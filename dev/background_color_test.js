const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const sandbox=vm.createContext({window:{}});
for(const file of ['01_util.js','01b_background_color.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',file),'utf8'),sandbox);
const J=sandbox.window.J, alpha={layerComposition:true,layerMode:'alpha'};
test('render palette gives only bg 40% coverage without changing saved data or binary palettes',()=>{
 const st={schemes:[{bg:'#3B3D41',fg:'#ffffff',ink:'#3B3D41'}]},saved=JSON.stringify(st);
 const a=J.layerRenderStyle(st,alpha);
 assert.equal(a.schemes[0].bg,'#3B3D4166');assert.equal(a.schemes[0].fg,'#ffffff');assert.equal(a.schemes[0].ink,'#3B3D41');
 assert.equal(JSON.stringify(st),saved);
 for(const opts of [{}, {...alpha,layerMode:'binary'},{...alpha,layerComposition:false}])assert.equal(J.layerRenderStyle(st,opts),st);
 assert.equal(J.layerRenderStyle(st,alpha),a);assert.equal(J.layerRenderStyle(a,alpha),a);
 st.schemes[0].bg='#112233';assert.equal(J.layerRenderStyle(st,alpha).schemes[0].bg,'#11223366');
});
test('cue 3 mixing is 45.5% opaque with premultiplied RGB interpolation',()=>{
 const k=.09216454937122762,c=J.mix('#3B3D4166','#FFFFFF',k),rgba=J.hex(c);
 assert.ok(Math.abs(J.colorAlpha(c)-(.4*(1-k)+k))<=.5/255);
 assert.ok(Math.abs(J.colorAlpha(c)-.4553)<.002);
 for(const [i,bg]of [59,61,65].entries())assert.ok(Math.abs(rgba[i]-((bg*.4*(1-k)+255*k)/(.4*(1-k)+k)))<=.5);
 assert.equal(J.mix('#00000066','#FFFFFF',0),'#00000066');assert.equal(J.mix('#00000066','#FFFFFF',1),'#FFFFFFff');
});
test('opacity changes remap originals without accumulating alpha or polluting binary palettes',()=>{
 const st={schemes:[{bg:'#3B3D41',fg:'#ffffff'}]};let mapped=st;
 for(const opacity of [0,25,80,100,40,0]){
  const opt={...alpha,layerBackgroundOpacity:opacity};mapped=J.layerRenderStyle(mapped,opt);
  assert.ok(Math.abs(J.colorAlpha(mapped.schemes[0].bg)-opacity/100)<=.5/255);
  assert.equal(J.layerRenderStyle(st,opt),mapped);
  assert.equal(J.layerRenderStyle(mapped,{...opt,layerMode:'binary'}),st);
  const mixed=J.mix(mapped.schemes[0].bg,'#ffffff',.2);
  assert.ok(Math.abs(J.colorAlpha(mixed)-(opacity/100*.8+.2))<=1/255);
 }
 assert.equal(st.schemes[0].bg,'#3B3D41');
 for(const value of [undefined,null,NaN,Infinity,'80',{}])assert.equal(J.normalizeBackgroundOpacity(value),40);
 assert.equal(J.normalizeBackgroundOpacity(-5),0);assert.equal(J.normalizeBackgroundOpacity(120),100);
 assert.equal(J.normalizeBackgroundOpacity(25.4),25);
});
test('nested mixes, fades and colour adjustments retain alpha',()=>{
 assert.equal(J.mix('#ff000000','#0000ff80',.5),'#0000FF40');
 assert.equal(J.rgba('#ff004466',.5),'rgba(255,0,68,0.2)');
 assert.equal(J.rgba('#ff0044','0.500'),'rgba(255,0,68,0.500)');
 assert.equal(J.colorAlpha(J.fitContrast('#ffffff66','#ffffff',7)),.4);
 for(const t of [0,.1,.5,1])assert.ok(Math.abs(J.colorAlpha(J.mix('#00000066','#ffffff66',t))-.4)<1e-9);
});
test('six digit legacy mixtures keep their exact RGB and formatting',()=>{
 for(const a of ['#000000','#FFFFFF','#345678'])for(const b of ['#000000','#FFFFFF','#ea48b1'])for(const t of [0,.09216455,.5,1]){
  const A=J.hex(a),B=J.hex(b),expected='#'+A.map((v,i)=>Math.round(v+(B[i]-v)*t).toString(16).padStart(2,'0')).join('');
  assert.equal(J.mix(a,b,t),expected);
 }
});
