const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ctx={J:{defaultProject:()=>({}),upgradeLayerProject:p=>p,layerText:(ja,en)=>en,spectrumDuration:(f,m)=>m?Math.min(f.duration,m.duration):f.duration},setTimeout,DOMException};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/11v_native_spectrum.js'),'utf8'),ctx);const J=ctx.J;
test('native settings clamp and legacy projects preserve external mode',()=>{
 assert.equal(J.defaultProject().spectrumMode,'none');
 const p={};J.upgradeLayerProject(p,{});assert.equal(p.spectrumMode,'external');
 J.upgradeLayerProject(p,{spectrumMode:'generated'});assert.equal(p.spectrumMode,'generated');
 const c=J.normalizeNativeSpectrum({sensitivity:999,pulse:-5,returnMs:1,top:'bad'});
 assert.equal(c.sensitivity,24);assert.equal(c.pulse,0);assert.equal(c.returnMs,60);assert.equal(c.top,'#ffffff');
 assert.equal(J.nativeMotionKey({}),J.nativeMotionKey({nativeSpectrum:{top:'#ff0000'}}));
});
test('FFT distinguishes real frequencies and silence',()=>{
 const tone=hz=>J.analyzeNativePCM(Float32Array.from({length:48000},(_,i)=>.5*Math.sin(2*Math.PI*hz*i/48000)),48000);
 const peak=a=>Array.from(a.raw.slice(30*64,31*64)).reduce((p,v,i,x)=>v>x[p]?i:p,0);
 assert.ok(peak(tone(400))<peak(tone(4000)));
 assert.ok(Array.from(J.analyzeNativePCM(new Float32Array(48000),48000).raw).every(x=>x===-160));
});
test('saturated sustained sound decays, transients recur and silence reaches exact zero',async()=>{
 const raw=new Float32Array(120*64).fill(-160);
 for(let f=6;f<40;f++)raw[f*64+20]=0;
 for(let f=60;f<65;f++)raw[f*64+20]=0;
 const data=await J.shapeNativeSpectrum({raw,frames:120,bars:64,rate:60,duration:2},{});
 assert.ok(data.values[6*64+20]>.9);assert.equal(data.values[39*64+20],0);
 assert.ok(data.values[60*64+20]>.9);assert.equal(data.values[90*64+20],0);
 const a=Array.from(J.nativeSpectrumLevels(data,.11));J.nativeSpectrumLevels(data,1.7);
 assert.deepEqual(Array.from(J.nativeSpectrumLevels(data,.11)),a);
 assert.ok(Array.from(J.nativeSpectrumLevels(data,2)).every(x=>x===0));
 const regular=await J.shapeNativeSpectrum({raw,frames:120,bars:64,rate:60,duration:2},{pulse:0});
 assert.ok(regular.values[39*64+20]>.9);
});
test('motion shaping is cancellable and active duration respects selected source',async()=>{
 const ac=new AbortController();ac.abort();
 await assert.rejects(J.shapeNativeSpectrum({raw:new Float32Array(64),frames:1,bars:64,rate:60},{},ac.signal),{name:'AbortError'});
 const audio={buffer:{length:480000,sampleRate:48000}},media={front:{duration:25}};
 assert.equal(J.activeSpectrumDuration({spectrumMode:'none'},audio,media),0);
 assert.equal(J.activeSpectrumDuration({spectrumMode:'generated'},audio,media),10);
 assert.equal(J.activeSpectrumDuration({spectrumMode:'external'},audio,media),25);
});
test('auto range keeps the safety band, adapts to content, and includes a late high-frequency section',()=>{
 const sr=48000,signal=(hz,late=false)=>Float32Array.from({length:sr*3},(_,i)=>late&&i<sr*2?0:.4*Math.sin(2*Math.PI*hz*i/sr));
 const low=J.analyzeNativePCM(signal(150),sr),high=J.analyzeNativePCM(signal(7000),sr),late=J.analyzeNativePCM(signal(9000,true),sr);
 assert.equal(low.frequencyRange.high,4000);assert.ok(low.frequencyRange.low<=150);
 assert.ok(high.frequencyRange.high>=7000);assert.equal(high.frequencyRange.low,250);
 assert.ok(late.frequencyRange.high>=9000);assert.equal(late.fftSize,2048);
 for(const a of [low,high,late]){
  assert.ok(a.frequencyRange.low<=250);assert.ok(a.frequencyRange.high>=4000);assert.equal(a.frequencyRange.fallback,false);
  assert.equal(a.bandEdges.length,65);assert.ok(a.bandEdges.every((v,i,x)=>!i||v>x[i-1]));
  assert.ok(Array.from(a.raw).every(Number.isFinite));assert.ok(a.scanFrames<=600);
 }
});
test('silent/short input falls back; low/high sample rates keep unique bins without changing FFT sizes',()=>{
 for(const sr of [8000,44100,48000,96000,192000,384000]){
  const a=J.analyzeNativePCM(new Float32Array(Math.ceil(sr*.1)),sr);
  assert.equal(a.frequencyRange.fallback,true);assert.equal(a.frequencyRange.low,80);assert.equal(a.frequencyRange.high,Math.min(12000,sr/2));
  assert.equal(a.fftSize,sr>60000?4096:2048);assert.ok(a.bandEdges.every((v,i,x)=>!i||v>x[i-1]));assert.ok(a.bandEdges[64]<=a.fftSize/2+1);
  const b=J.analyzeNativePCM(Float32Array.from({length:sr},(_,i)=>.5*Math.sin(2*Math.PI*300*i/sr)),sr);
  assert.ok(b.frequencyRange.high<=sr/2);assert.ok(b.frequencyRange.high>=Math.min(4000,sr/2));assert.ok(b.bandEdges.every((v,i,x)=>!i||v>x[i-1]));
 }
 const short=J.analyzeNativePCM(new Float32Array(50).fill(.5),48000);assert.equal(short.frequencyRange.fallback,true);
});
test('range survives motion reshaping and does not depend on signal level',async()=>{
 const sr=48000,pcm=Float32Array.from({length:sr},(_,i)=>.4*Math.sin(2*Math.PI*1800*i/sr));
 const a=J.analyzeNativePCM(pcm,sr),b=J.analyzeNativePCM(pcm.map(x=>x*.1),sr);
 assert.deepEqual(a.frequencyRange,b.frequencyRange);
 const shaped=await J.shapeNativeSpectrum(a,{sensitivity:24,pulse:35});assert.strictEqual(shaped.frequencyRange,a.frequencyRange);
 assert.equal(shaped.fftSize,2048);
});
