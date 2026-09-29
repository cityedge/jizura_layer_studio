// Pure gap/generation tests; rendering and editor persistence are verified in browser QA.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const ctx = { J: { defaultProject: () => ({fx:{}}), plan: p => p }, document: {documentElement:{lang:'ja'}}, Intl };
for (const name of ['11r_layers.js', '11t_fillers.js', '11w_cue_workflow.js']) vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../src', name), 'utf8'), ctx);
const J = ctx.J, json = x => JSON.parse(JSON.stringify(x));
const cue = (start, end, text = '歌詞', id = String(start)) => ({id,start,end,text});
const project = cues => ({subtitleCues:cues, timing:{}, overrides:{}});
const settings = () => J.defaultFillerSettings();
test('bulk shifts clamp starts at zero, keep fillers and tags, and validate atomically', () => {
  const cues = [cue(0, 1, 'one', 'a'), {...cue(2, 3, '[timestamp]', 'b'), filler:true}];
  const original = JSON.stringify(cues);
  const shifted = J.prepareLayerCueShift(cues, -.1);
  assert.deepEqual(json(shifted).map(c => [c.start,c.end]), [[0,.9],[1.9,2.9]]);
  assert.equal(shifted[1].filler,true); assert.equal(shifted[1].text,'[timestamp]');
  assert.equal(J.resolveCueText(shifted[1]),'00 01 900');
  assert.equal(JSON.stringify(cues),original);
  assert.deepEqual(json(J.prepareLayerCueShift(cues,.1)).map(c=>[c.start,c.end]),[[.1,1.1],[2.1,3.1]]);
  for(const invalid of [[cue(0,0)], [cue(0,.1),cue(2,3)], [cue(0,.05)], [cue(0,1),cue(2,NaN)], [cue('',1)]]) {
    const snapshot=JSON.stringify(invalid);assert.throws(()=>J.prepareLayerCueShift(invalid,-.1));assert.equal(JSON.stringify(invalid),snapshot);
  }
  let repeated=[cue(1,2)];for(let i=0;i<10;i++)repeated=J.prepareLayerCueShift(repeated,-.1);
  assert.equal(repeated[0].start,0);assert.equal(repeated[0].end,1);
});
const oldMargins = () => ({...settings(), preGap:1, postGap:2});
let seed = 45678;
const rng = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
test('automatic parts use 3 seconds of actual normal-cue silence, independent of fillers', () => {
  const cues=[cue(0,10),cue(2,3),{...cue(10.3,13,'f'),filler:true},cue(13,15),cue(17.999,20),cue(23,25)];
  assert.deepEqual(json(J.subtitleParts(cues)),[0,0,0,1,1,2]);
  assert.equal(J.subtitlePartText([cue(0,2,'A'),cue(2,4,'B'),cue(7,9,'C')]),'A\nB\n\nC');
  assert.deepEqual(json(J.subtitleParts([cue(0,2,''),cue(5,7,'visible')])),[0,0]);
});
test('cue navigation includes fillers, prefers latest overlap and handles gaps/ends', () => {
  const p={lines:[{index:0,start:0,end:4,text:'a'},{index:1,start:3,end:7,text:'f'}, {index:2,start:10,end:12,text:'b'}]};
  assert.equal(J.cueAtTime(p,3.5).index,1);assert.equal(J.cueAtTime(p,8),null);
  assert.equal(J.cueJumpTime(p,3.5,-1),3);assert.equal(J.cueJumpTime(p,3.1,-1),0);
  assert.equal(J.cueJumpTime(p,8,-1),3);assert.equal(J.cueJumpTime(p,8,1),10);
  assert.equal(J.cueJumpTime(p,0,-1),0);assert.equal(J.cueJumpTime(p,11,1),11);
});
test('threshold includes exact boundary after BOTH margins, without fillers influencing gaps', () => {
  const p = project([cue(0,2),cue(10,12),cue(19.999,22),{...cue(3,9,'edited','f'),filler:true}]);
  const a = J.fillerAnalysis(p,oldMargins());
  assert.deepEqual(json(a.gaps),[{start:3,end:8}]);
  assert.equal(a.normal.length,3);
});
test('intro/outro use only adjacent margin; audio has priority; existing fillers never extend end', () => {
  const p = project([cue(7,9),{...cue(30,80,'old'),filler:true}]);
  assert.deepEqual(json(J.fillerAnalysis(p,oldMargins(),{audioDuration:15,spectrumDuration:60}).gaps),[{start:0,end:5},{start:10,end:15}]);
  assert.equal(J.fillerAnalysis(p,settings()).horizon,9);
  assert.equal(J.fillerAnalysis(p,settings(),{audioDuration:3}).horizon,9);
  assert.equal(J.fillerAnalysis(p,settings(),{spectrumDuration:20}).horizon,20);
});
test('overlapping/nested normal cues form a union', () => {
  const a=J.fillerAnalysis(project([cue(0,10),cue(2,3),cue(18,20)]),oldMargins());
  assert.deepEqual(json(a.gaps),[{start:11,end:16}]);
});
test('duration basis is mean of longer half (rounded up), excluding fillers', () => {
  const p=project([cue(0,1),cue(2,4),cue(5,15),{...cue(20,100),filler:true}]);
  const a=J.fillerAnalysis(p,settings()); assert.equal(a.baseline,6);
  assert.equal(J.fillerAnalysis(p,{...settings(),length:'short'}).target,4.5);
  assert.equal(J.fillerAnalysis(p,{...settings(),length:'long'}).target,9);
});
test('symbols only: Unicode text lengths, varied patterns/durations and exact gap containment', () => {
  const p=project([cue(0,3,'あ い\nうえ'),cue(63,66,'👩‍💻い うえ')]);
  const a=J.fillerAnalysis(p,settings()); assert.equal(a.meanChars,4);
  const cfg=oldMargins();cfg.types.lyrics.enabled=false;cfg.types.timestamp.enabled=false;cfg.types.spaces.enabled=false;
  const r=J.prepareFillers(p,cfg,{},rng);
  assert.equal(r.fillers[0].start,4); assert.equal(r.fillers.at(-1).end,61);
  for (let i=0;i<r.fillers.length;i++) {
    const c=r.fillers[i]; assert.equal(c.filler,true); assert.match(c.text,/^[○●△▲□■◇◆×＋＃＊]{3,5}$/);
    if(i)assert.equal(c.start,r.fillers[i-1].end);
  }
  assert.ok(new Set(r.fillers.map(c=>c.text)).size>4);
  assert.ok(new Set(r.fillers.map(c=>(c.end-c.start).toFixed(4))).size>4);
});
test('lyrics are drawn whole without length filtering; weights select enabled types only', () => {
  const p=project([cue(0,2,'短'),cue(102,104,'長い歌詞の全文が残ること')]);
  const cfg=settings();cfg.types.symbols.enabled=false;cfg.types.lyrics.enabled=true;cfg.types.timestamp.enabled=false;cfg.types.spaces.enabled=false;
  const r=J.prepareFillers(p,cfg,{},rng); assert.deepEqual(new Set(r.fillers.map(c=>c.text)),new Set(['短','長い歌詞の全文が残ること']));
  cfg.types.timestamp.enabled=true; cfg.types.lyrics.weight=1;cfg.types.timestamp.weight=10;
  const mixed=J.prepareFillers(p,cfg,{},rng);assert.ok(mixed.fillers.filter(c=>c.text==='[timestamp]').length>mixed.fillers.length/2);
});
test('regeneration/removal preserve normal cues and overrides, and metadata survives editing', () => {
  const p=project([cue(0,2),{...cue(4,7,'hand edited','filler-1'),filler:true},cue(12,15)]);
  p.overrides={0:{lock:true,lockedCuts:[{layout:'ticket'}]},1:{seed:12},2:{layout:'grid'}};
  const before=json([p.subtitleCues[0],p.subtitleCues[2]]), overrides=json([p.overrides[0],p.overrides[2]]);
  const r=J.prepareFillers(p,settings(),{},rng);J.replaceFillers(p,r);
  assert.deepEqual(json(p.subtitleCues.filter(c=>!c.filler)),before);
  assert.deepEqual(json(p.subtitleCues.flatMap((c,i)=>c.filler?[]:[p.overrides[i]])),overrides);
  assert.ok(!p.subtitleCues.some(c=>c.text==='hand edited'));
  const i=p.subtitleCues.findIndex(c=>c.filler);J.editLayerCue(p,i,{text:'[timestamp]'});assert.equal(p.subtitleCues[i].filler,true);
  J.replaceFillers(p,{settings:settings(),fillers:[]});assert.deepEqual(json(p.subtitleCues),before);assert.deepEqual(json(p.overrides),{0:overrides[0],1:overrides[1]});
});
test('timestamp substitution follows cue start, supports literal surrounding text, leaves raw tags intact', () => {
  const c=cue(125.853,130,'時刻 [timestamp] / [timestamp]'); assert.equal(J.resolveCueText(c),'時刻 02 05 853 / 02 05 853');
  assert.equal(c.text,'時刻 [timestamp] / [timestamp]'); assert.equal(J.cueTimestamp(59.9999),'01 00 000');
});
test('new defaults include all types and 5.8s gaps, but preserve saved settings', () => {
  const cfg=settings();assert.deepEqual(json(cfg),{threshold:5,preGap:.3,postGap:.5,length:'normal',customText:'',types:{spaces:{enabled:true,weight:3},lyrics:{enabled:true,weight:8},timestamp:{enabled:true,weight:2},symbols:{enabled:true,weight:1},custom:{enabled:true,weight:0}}});
  const a=J.fillerAnalysis(project([cue(0,2),cue(7.8,9),cue(14.799,17)]),cfg);
  assert.deepEqual(json(a.gaps),[{start:2.3,end:7.3}]);
  const saved=oldMargins();saved.types.lyrics.enabled=false;assert.deepEqual(json(J.normalizeFillerSettings(saved)),json(saved));
});
test('whitespace fillers retain 3–4 groups of 2–5 ideographic spaces and metadata', () => {
  const p=project([cue(0,2),cue(80,82)]), cfg=settings();
  for(const k of ['symbols','lyrics','timestamp'])cfg.types[k].enabled=false;
  const r=J.prepareFillers(p,cfg,{},rng);
  assert.ok(r.fillers.length>10);
  const groups=new Set();
  for(const c of r.fillers){assert.match(c.text,/^　{2,5}( 　{2,5}){2,3}$/);groups.add(c.text.split(' ').length);}
  assert.deepEqual(groups,new Set([3,4]));
  J.replaceFillers(p,r);
  assert.deepEqual(json(J.validateCues(p.subtitleCues)),json(p.subtitleCues));
  const old={types:{symbols:{enabled:false,weight:7},lyrics:{enabled:true,weight:10},timestamp:{enabled:false,weight:3}}};
  const upgraded=J.normalizeFillerSettings(old);
  assert.deepEqual(json(upgraded.types.spaces),{enabled:true,weight:3});
  assert.deepEqual(json(upgraded.types.lyrics),old.types.lyrics);
});
test('invalid generation is atomic and has finite safeguards', () => {
  const p=project([cue(0,0.001),cue(10000,10000.001)]), before=JSON.stringify(p);
  assert.throws(()=>J.prepareFillers(p,settings(),{},rng),/20,000/);assert.equal(JSON.stringify(p),before);
  const cfg=settings(); for(const v of Object.values(cfg.types))v.enabled=false;
  assert.throws(()=>J.prepareFillers(project([cue(0,2)]),cfg,{},rng));
  assert.throws(()=>J.fillerAnalysis(project([]),settings()));
});
test('custom text starts excluded, preserves literal text and settings across serialization', () => {
  const old = {types:{lyrics:{enabled:true,weight:8}}}, migrated = J.normalizeFillerSettings(old);
  assert.equal(migrated.customText,'');assert.deepEqual(json(migrated.types.custom),{enabled:true,weight:0});
  const p=project([cue(0,2),cue(20,22)]), cfg=settings();
  for(const k of J.fillerKinds)cfg.types[k].enabled=k==='custom';
  assert.throws(()=>J.prepareFillers(p,cfg,{},rng),/重み1以上/);
  cfg.types.custom.weight=5;
  for(const text of [' 任意　テキスト\n第二行 [timestamp] ', '　　 　　']){
    cfg.customText=text;const result=J.prepareFillers(p,cfg,{},rng);
    assert.ok(result.fillers.length>0);assert.ok(result.fillers.every(c=>c.filler && c.text===text));
    J.replaceFillers(p,result);assert.deepEqual(json(J.normalizeFillerSettings(json(p.fillerSettings))),json(cfg));
  }
});
test('empty custom text fails atomically before the lottery, even without usable gaps', () => {
  const p=project([cue(0,2),{...cue(4,6,'edited filler'),filler:true},cue(20,22)]), before=JSON.stringify(p), cfg=settings();
  cfg.types.custom.weight=1;
  assert.throws(()=>J.prepareFillers(p,cfg,{},()=>0),/指定テキスト/);
  assert.equal(JSON.stringify(p),before);
  assert.throws(()=>J.prepareFillers(project([cue(0,2)]),cfg,{},rng),/指定テキスト/);
  cfg.types.custom.enabled=false;assert.doesNotThrow(()=>J.prepareFillers(p,cfg,{},rng));
  cfg.types.custom.enabled=true;cfg.types.custom.weight=0;assert.doesNotThrow(()=>J.prepareFillers(p,cfg,{},rng));
  assert.equal(J.normalizeFillerSettings({types:{custom:{weight:-5}}}).types.custom.weight,0);
  assert.equal(J.normalizeFillerSettings({types:{custom:{weight:99}}}).types.custom.weight,10);
});
test('every filler type accepts zero, a single positive weight works, and all-zero is atomic', () => {
  const p=project([cue(0,2),{...cue(4,6,'keep me'),filler:true},cue(20,22)]), cfg=settings();
  cfg.customText='指定した本文';
  for(const v of Object.values(cfg.types))v.weight=0;
  const before=JSON.stringify(p);
  assert.throws(()=>J.prepareFillers(p,cfg,{},rng),/重み1以上/);
  assert.equal(JSON.stringify(p),before);
  assert.deepEqual(json(J.normalizeFillerSettings(json(cfg))),json(cfg));
  for(const kind of J.fillerKinds){
    cfg.types[kind].weight=1;
    const r=J.prepareFillers(p,cfg,{},rng);assert.ok(r.fillers.length>0);
    if(kind==='custom')assert.ok(r.fillers.every(c=>c.text===cfg.customText));
    else if(kind==='lyrics')assert.ok(r.fillers.every(c=>c.text==='歌詞'));
    else if(kind==='timestamp')assert.ok(r.fillers.every(c=>c.text==='[timestamp]'));
    else if(kind==='spaces')assert.ok(r.fillers.every(c=>/^[　 ]+$/.test(c.text)));
    else assert.ok(r.fillers.every(c=>/^[○●△▲□■◇◆×＋＃＊]+$/.test(c.text)));
    cfg.types[kind].weight=0;
  }
});
