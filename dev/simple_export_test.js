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
 assert.deepEqual(json(J.defaultProject().simpleExport),{duration:null,includeAudio:true,title:json(J.normalizeSimpleTitle())});
 const p={includeAudio:false,simpleExport:{duration:123.456,includeAudio:false}};
 J.upgradeLayerProject(p,p);assert.equal(p.includeAudio,false);assert.deepEqual(json(p.simpleExport),{duration:123.456,includeAudio:false,title:json(J.normalizeSimpleTitle())});
 assert.equal(J.normalizeSimpleExport({duration:Infinity}).duration,null);
});
test('title defaults, validation and untrusted JSON stay independent of project filename',()=>{
 const d=J.normalizeSimpleTitle();assert.equal(d.enabled,false);assert.equal(d.all,true);assert.equal(d.fade,true);assert.equal(d.opacity,50);
 assert.match(J.simpleTitleError({...d,enabled:true}),/text/);
 assert.equal(J.simpleTitleError({...d,enabled:true,text:'Song',all:true,end:0}),'');
 assert.match(J.simpleTitleError({...d,enabled:true,text:'Song',all:false,end:0}),/after/);
 assert.match(J.simpleTitleError({...d,enabled:true,text:'Song',font:'custom'}),/family/);
 const hostile=J.normalizeSimpleTitle({text:'X\r\nY',family:'"Arial\\\n',color:'url(bad)',size:Infinity,opacity:-20,position:'x'});
 assert.equal(hostile.text,'X\nY');assert.equal(hostile.family,'Arial');assert.equal(hostile.color,'#ffffff');assert.equal(hostile.size,5);assert.equal(hostile.opacity,0);assert.equal(hostile.position,'top-left');
 const p={title:'Filename',simpleExport:{duration:30,title:{enabled:true,text:'Different title',all:false,start:2,end:12,fade:false,font:'custom',family:'Arial'}}};
 J.upgradeLayerProject(p,p); const copy=JSON.parse(JSON.stringify(p)); J.upgradeLayerProject(copy,copy);
 assert.deepEqual(json(copy),json(p));assert.equal(copy.title,'Filename');assert.equal(copy.simpleExport.title.text,'Different title');
});
test('title uses output intersection, exact time bounds and shared short-interval fades',()=>{
 const s={...J.normalizeSimpleTitle(),enabled:true,text:'Song'},span={t0:4,duration:6};
 assert.deepEqual(json(J.simpleTitleWindow(s,span)),{start:4,end:10});
 for(const [t,a] of [[3,0],[4,0],[4.5,.5],[5,1],[9,1],[9.5,.5],[10,0]])assert.equal(J.simpleTitleAlpha(s,t,span),a);
 assert.equal(J.simpleTitleAlpha({...s,fade:false},4,span),1);
 assert.equal(J.simpleTitleAlpha({...s,fade:false},10,span),0);
 const timed={...s,all:false,start:5,end:6};
 assert.equal(J.simpleTitleAlpha(timed,5.25,span),.5);assert.equal(J.simpleTitleAlpha(timed,5.5,span),1);assert.equal(J.simpleTitleAlpha(timed,5.75,span),.5);
 assert.equal(J.simpleTitleWindow({...timed,end:3},span),null);
 assert.deepEqual(json(J.simpleTitleWindow({...timed,start:0,end:8},span)),{start:4,end:8});
 assert.equal(J.simpleTitleAlpha({...s,enabled:false},5,span),0);
});
