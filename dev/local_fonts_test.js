const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const context={window:{},document:{createElement:()=>({getContext:()=>({measureText:()=>({width:20})})})}};
vm.createContext(context);
for(const f of ['01_util.js','02_fonts.js'])vm.runInContext(fs.readFileSync(path.join(__dirname,'../src',f),'utf8'),context);
const J=context.window.J;
test('Japanese and legacy local family names survive project registration without binary APIs',()=>{
 const list=[{key:'local_游明朝',label:'游明朝',family:'游明朝',weight:400},{key:'local_ab123',label:'Arial',family:'Arial',weight:700}];
 assert.deepEqual(JSON.parse(JSON.stringify(J.registerProjectFonts(list))),list);
 assert.equal(J.FONTS.local_游明朝.family,'"游明朝"');
 assert.deepEqual(Array.from(J.missingUserFonts(list.map(f=>f.key))),[]);
 assert.equal(J.loadFontFile,undefined);assert.equal(J.restoreUserFonts,undefined);
 assert.ok(J.fontCSS('local_游明朝',20).includes('游明朝'));
});
test('legacy file fonts remain explicit unavailable references and stale project fonts leave the menu',()=>{
 const legacy={key:'user_UF_old',label:'Old font file',family:'UF_old',weight:400};
 J.registerProjectFonts([legacy]);
 assert.equal(J.FONTS.local_游明朝,undefined);
 assert.deepEqual(Array.from(J.missingUserFonts([legacy.key])),['Old font file']);
 assert.equal(J.FONTS[legacy.key].family,'"JizuraUnavailableLegacyFont"');
 J.registerProjectFonts([]);assert.equal(J.FONTS[legacy.key],undefined);assert.ok(J.FONTS.gothic_bold);
});
test('untrusted font keys and CSS control characters are excluded',()=>{
 assert.equal(J.registerProjectFonts([{key:'__proto__'},{key:'local_\"bad'}]).length,0);
 assert.equal(J.safeFamily('游明朝"\\\n'), '游明朝');
});
