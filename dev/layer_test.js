// Run with: node dev/layer_test.js (no npm dependencies).
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const context = { J: { defaultProject: () => ({fx:{}}), plan: p => p }, document: { documentElement: {lang:'ja'} } };
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../src/11r_layers.js'),'utf8'), context);
const J = context.J, json = x => JSON.parse(JSON.stringify(x));
test('UTF-8 BOM / CRLF / literal punctuation / multiline SRT', () => {
  const s = '\uFEFF1\r\n00:00:01,250 --> 00:00:02,500\r\nA/B *C* | D!\r\n二行目\r\n';
  assert.deepEqual(json(J.parseSRT(s)), [{id:'1',start:1.25,end:2.5,text:'A/B *C* | D!\n二行目'}]);
});
test('invalid time ranges and malformed input fail without partial result', () => {
  for(const s of ['', '1\n00:00:02,000 --> 00:00:01,000\nX', '1\n00:99:00,000 --> 00:99:01,000\nX', '1\n00:00:01,000 --> 00:00:02,000\n'])
    assert.throws(() => J.parseSRT(s));
});
test('overlapping SRT cues keep both intervals and stable ids', () => {
  const r=J.parseSRT('2\n00:00:02,000 --> 00:00:03,000\nB\n\n1\n00:00:01,000 --> 00:00:04,000\nA');
  assert.deepEqual(json(r).map(c=>[c.start,c.end,c.text]),[[1,4,'A'],[2,3,'B']]);
});
test('alpha cutoff produces only opaque or empty pixels', () => {
  assert.deepEqual(Array.from(J.binaryPixels(new Uint8ClampedArray([10,20,30,127,10,20,30,128]))),[0,0,0,0,10,20,30,255]);
});
test('black artwork is reserved before matte generation', () => {
  const p=J.pairPixels(J.layerPixels(new Uint8ClampedArray([0,0,0,255,255,0,0,0])));
  assert.deepEqual(Array.from(p.matte),[0,0,0,255,255,255,255,255]);
  assert.deepEqual(Array.from(p.front),[3,3,3,255,0,0,0,255]);
});
test('decoded spectrum matte is thresholded and subtitles cover spectrum', () => {
  const f=new Uint8ClampedArray([0,255,0,255,0,255,0,255]);
  const m=new Uint8ClampedArray([127,127,127,255,128,128,128,255]);
  const back=J.binaryPixels(f,m);
  assert.deepEqual(Array.from(back),[0,255,0,255,0,0,0,0]);
  assert.deepEqual(Array.from(J.overPixels(back,new Uint8ClampedArray([255,0,0,255,0,0,0,0]))),[255,0,0,255,0,0,0,0]);
});

test('spectrum default position is frame-relative and preserves source aspect', () => {
  const wide=J.spectrumRect(1920,1080,1920,1080);
  for(const [key,value] of Object.entries({x:57.6,y:345.6,width:1248,height:702})) assert.ok(Math.abs(wide[key]-value)<1e-8);
  const r=J.spectrumRect(1080,1920,1920,1080);
  assert.equal(r.width,702); assert.equal(r.height,394.875); assert.equal(r.x,32.4); assert.ok(Math.abs(r.y-1467.525)<1e-8);
});
test('independent vertical scale and bottom anchoring', () => {
  assert.deepEqual(json(J.spectrumRect(1000,600,200,100,{left:10,bottom:20,scaleX:150,scaleY:50})),
    {x:100,y:317.5,width:975,height:162.5});
  assert.deepEqual(json(J.normalizeSpectrumLayout({scaleX:Infinity,scaleY:-1,left:999})),{left:100,bottom:3,scaleX:100,scaleY:1});
});
test('matte naming and same-folder pairing are unambiguous', () => {
  assert.equal(J.spectrumMatteName('speana.sample.mp4'),'speana.sample_matte_dark.mp4');
  const a={name:'speana_sample_matte_dark.mp4',webkitRelativePath:'root/a/speana_sample_matte_dark.mp4'};
  const b={name:a.name,webkitRelativePath:'root/b/'+a.name};
  assert.equal(J.findSpectrumMatte([a,b],{name:'speana_sample.mp4',webkitRelativePath:'root/a/speana_sample.mp4'}),a);
  assert.equal(J.findSpectrumMatte([a,b],{name:'speana_sample.mp4'}),null);
  assert.equal(J.findSpectrumMatte([],{name:'speana_sample.mp4'}),null);
});

test('soft artwork keeps black-background brightness with binary coverage', () => {
  const a=J.layerPixels(new Uint8ClampedArray([200,100,50,102,0,0,0,255,255,255,255,0]));
  assert.deepEqual(Array.from(a),[80,40,20,255,3,3,3,255,0,0,0,0]);
  const pair=J.pairPixels(a);
  assert.deepEqual(Array.from(pair.matte),[0,0,0,255,0,0,0,255,255,255,255,255]);
});
test('overlap tracks reindex cuts while keeping joins within each cue', () => {
  const p={lines:[{index:0,start:0,end:3},{index:1,start:1,end:2},{index:2,start:3,end:4}],cuts:[
    {line:0,index:0,start:0},{line:0,index:1,start:1,morph:{dur:0.4}},
    {line:1,index:2,start:1},{line:2,index:3,start:3}]};
  const tracks=json(J.layerTracks(p));
  assert.equal(tracks.length,2);
  assert.deepEqual(tracks[0].cuts.map(c=>c.index),[0,1,2]);
  assert.deepEqual(tracks[1].cuts.map(c=>c.index),[0]);
  assert.equal(tracks[0].cuts[1].morph.dur,0.4);
  assert.equal(p.cuts[3].index,3);
});


test('matte is the inverse nonzero mask of final front RGB, not alpha', () => {
  const source=new Uint8ClampedArray([0,0,0,255,1,1,1,255,0,1,0,255,255,0,0,255,255,0,0,0]);
  const snapshot=Array.from(source), pair=J.pairPixels(source);
  assert.deepEqual(Array.from(pair.front),[0,0,0,255,1,1,1,255,0,1,0,255,255,0,0,255,0,0,0,255]);
  assert.deepEqual(Array.from(pair.matte),[255,255,255,255,0,0,0,255,0,0,0,255,0,0,0,255,255,255,255,255]);
  assert.deepEqual(Array.from(source),snapshot);
});
test('blur and fades rounded to black do not regain coverage or erase spectrum', () => {
  const rgba=J.layerPixels(new Uint8ClampedArray([1,1,1,1,0,0,0,1,255,255,255,1]));
  assert.deepEqual(Array.from(rgba),[0,0,0,0,0,0,0,0,1,1,1,255]);
  const back=new Uint8ClampedArray([0,255,0,255,0,255,0,255,0,255,0,255]);
  assert.deepEqual(Array.from(J.overPixels(back,rgba)),[0,255,0,255,0,255,0,255,1,1,1,255]);
});
test('overwide imported matte cannot make black spectrum background opaque', () => {
  const rgba=J.binaryPixels(new Uint8ClampedArray([0,0,0,255,0,1,0,255]),new Uint8ClampedArray(8));
  assert.deepEqual(Array.from(rgba),[0,0,0,0,0,1,0,255]);
});
test('all brightness and alpha combinations match final RGB coverage', () => {
  const src=new Uint8ClampedArray(256*256*4);
  for(let c=0;c<256;c++)for(let a=0;a<256;a++){
    const i=(c*256+a)*4;src[i]=src[i+1]=src[i+2]=c;src[i+3]=a;
  }
  const rgba=J.layerPixels(src),pair=J.pairPixels(rgba);
  for(let i=0;i<src.length;i+=4){
    const value=Math.round((src[i]===0?3:src[i])*src[i+3]/255);
    assert.equal(pair.front[i],value);
    assert.equal(rgba[i+3],value?255:0);
    assert.equal(pair.matte[i],value?0:255);
    assert.equal(pair.matte[i+1],pair.matte[i]);
    assert.equal(pair.matte[i+2],pair.matte[i]);
  }
});

test('bloom cleanup preserves original black ink, dim particles and visible exterior light', () => {
  const base=new Uint8ClampedArray([0,0,0,255,2,1,0,255,0,0,0,0,0,0,0,0,0,0,0,0]);
  const result=new Uint8ClampedArray([0,0,0,255,2,1,0,255,31,10,1,255,0,0,32,255,255,0,0,31]);
  J.cleanLayerBloom(base,result);
  assert.deepEqual(Array.from(result),[0,0,0,255,2,1,0,255,0,0,0,0,0,0,32,255,0,0,0,0]);
  const pair=J.pairPixels(J.layerPixels(result));
  assert.deepEqual(Array.from(pair.front),[3,3,3,255,2,1,0,255,0,0,0,255,0,0,32,255,0,0,0,255]);
  assert.deepEqual(Array.from(pair.matte),[0,0,0,255,0,0,0,255,255,255,255,255,0,0,0,255,255,255,255,255]);
});
test('min-matte then max-front equals inverse-matte alpha composition', () => {
  const before=new Uint8ClampedArray([0,0,0,255,0,0,0,0,0,0,0,0]);
  const after=new Uint8ClampedArray([0,0,0,255,12,10,5,255,80,5,0,255]);
  const pair=J.pairPixels(J.layerPixels(J.cleanLayerBloom(before,after)));
  for(const background of [0,1,50,128,200,255])for(let i=0;i<pair.front.length;i+=4)for(let c=0;c<3;c++){
    const minmax=Math.max(Math.min(background,pair.matte[i+c]),pair.front[i+c]);
    const alpha=1-pair.matte[i]/255;
    assert.equal(minmax,pair.front[i+c]*alpha+background*(1-alpha));
  }
});

test('bloom threshold defaults, rounds and clamps imported values safely', () => {
  for(const value of [undefined,null,NaN,Infinity,'64',{},false])assert.equal(J.normalizeBloomThreshold(value),32);
  assert.equal(J.normalizeBloomThreshold(-5),0);
  assert.equal(J.normalizeBloomThreshold(500),128);
  assert.equal(J.normalizeBloomThreshold(31.6),32);
  assert.equal(J.defaultProject().bloomThreshold,32);
});
test('every allowed bloom threshold protects ink and preserves the binary pair', () => {
  const base=new Uint8ClampedArray([0,0,0,255,1,0,0,255,0,0,0,0]);
  for(let threshold=0;threshold<=128;threshold++)for(const value of [0,1,31,32,64,127,128,255]){
    const after=new Uint8ClampedArray([0,0,0,255,1,0,0,255,value,0,0,255]);
    const pair=J.pairPixels(J.layerPixels(J.cleanLayerBloom(base,after,threshold)));
    assert.deepEqual(Array.from(pair.front.slice(0,8)),[3,3,3,255,1,0,0,255]);
    if(value<threshold)assert.equal(pair.front[8],0);
    else assert.equal(pair.front[8],value||3);
    for(let i=0;i<pair.front.length;i+=4)assert.equal(pair.matte[i],pair.front[i]||pair.front[i+1]||pair.front[i+2]?0:255);
  }
});

test('spectrum without matte keys exact RGB zero only, retaining near-black', () => {
  const src=new Uint8ClampedArray([0,0,0,255,1,0,0,255,0,1,0,255,0,0,1,255,3,3,3,255]);
  assert.deepEqual(Array.from(J.binaryPixels(src)),[0,0,0,0,1,0,0,255,0,1,0,255,0,0,1,255,3,3,3,255]);
  const pair=J.pairPixels(J.binaryPixels(src));
  assert.deepEqual(Array.from(pair.matte),[255,255,255,255,0,0,0,255,0,0,0,255,0,0,0,255,0,0,0,255]);
});
test('spectrum front alone is valid, optional matte still must match', () => {
  const front={width:768,height:120,duration:30};
  assert.doesNotThrow(()=>J.validateSpectrum(front,null));
  assert.throws(()=>J.validateSpectrum(null,front));
  assert.doesNotThrow(()=>J.validateSpectrum(front,{...front}));
  assert.throws(()=>J.validateSpectrum(front,{...front,width:640}));
  assert.throws(()=>J.validateSpectrum(front,{...front,duration:20}));
  assert.equal(J.spectrumDuration(front,null),30);
  assert.equal(J.spectrumDuration(front,{...front,duration:29.99}),29.99);
});
