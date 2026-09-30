const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={J:{defaultProject:()=>({}),upgradeLayerProject:p=>p,layerText:(ja,en)=>en,spectrumDuration:(f,m)=>m?Math.min(f.duration,m.duration):f.duration}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/11u_simple_export.js'),'utf8'),ctx);const J=ctx.J;
const json=x=>JSON.parse(JSON.stringify(x));
test('material duration uses latest subtitle/filler, paired spectrum and decoded audio samples',()=>{
 const plan={lines:[{end:2},{end:3}],duration:999};
 assert.equal(J.simpleMaterialDuration(plan,{duration:500,buffer:{length:44100*7,sampleRate:44100}},null,null),7);
 assert.equal(J.simpleMaterialDuration(plan,null,{duration:10},{duration:8}),8);
 assert.equal(J.simpleMaterialDuration(plan,null,null,{duration:20}),3);
 assert.equal(J.simpleMaterialDuration({lines:[]},null,null,null),.001);
 assert.equal(J.simpleMaterialDuration(plan,null,null,null,{video:true,duration:30,videoDuration:12}),12);
 assert.equal(J.simpleMaterialDuration(plan,null,null,null,{video:true,duration:8}),8);
 assert.equal(J.simpleMaterialDuration(plan,null,null,null,{video:false,duration:Infinity}),3);
 assert.equal(J.simpleMaterialDuration(plan,{buffer:{length:48000*15,sampleRate:48000}},null,null,{video:true,videoDuration:12}),15);
});
test('frame duration rounds up, supports ranges and rejects non-overlap/invalid input',()=>{
 assert.deepEqual(json(J.simpleExportSpan(1.001,30)),{t0:0,frames:31,duration:31/30});
 assert.equal(J.simpleExportSpan(1,30).frames,30);
 assert.deepEqual(json(J.simpleExportSpan(5,30,{t0:2,t1:3})),{t0:2,frames:30,duration:1});
 assert.equal(J.simpleExportSpan(5,30,{t0:4,t1:9}).frames,30);
 for(const d of [0,-1,NaN,Infinity,86401,'3'])assert.throws(()=>J.simpleExportSpan(d,30));
 assert.throws(()=>J.simpleExportSpan(1,30,{t0:2,t1:3}));
});
test('simple preferences are independent of silent layer settings and survive migration',()=>{
 assert.deepEqual(json(J.defaultProject().simpleExport),{duration:null,includeAudio:true});
 const p={includeAudio:false,simpleExport:{duration:123.456,includeAudio:false}};
 J.upgradeLayerProject(p,p);assert.equal(p.includeAudio,false);assert.deepEqual(json(p.simpleExport),{duration:123.456,includeAudio:false});
 assert.equal(J.normalizeSimpleExport({duration:Infinity}).duration,null);
});
