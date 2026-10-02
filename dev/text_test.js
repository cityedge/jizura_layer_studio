// Regression coverage for word boundaries in lyric parsing and planned cuts.
const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
function load(segmenter = true) {
  const sandbox = { window: {}, document: { documentElement: { lang: 'ja' }, createElement: () => ({ getContext: () => ({ measureText: text => ({ width: String(text).length * 20 }) }) }) }, console };
  if (!segmenter) sandbox.Intl = {};
  vm.createContext(sandbox);
  const root = path.join(__dirname, '../src');
  for (const name of fs.readdirSync(root).filter(n => n.endsWith('.js') && n < '12').sort()) vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), sandbox, { filename: name });
  return sandbox.window.J;
}
const copy = x => JSON.parse(JSON.stringify(x));
test('decorative number filtering preserves numeric lyrics and timestamp fillers without rerolling', () => {
  const J=load(), on={hideDecorativeText:true,cut:{lineText:'見てた',text:'見てた'}};
  for(const text of ['No.01','#03','128','LYRIC 01/12','00:12.34','REC 1:05','02:05,853']) {
    assert.equal(J.hideDecoText(on,text),true,text);
    assert.equal(J.hideDecoText({...on,hideDecorativeText:false},text),false);
  }
  for(const text of ['REC','UNTITLED','第1章','見てた',''])assert.equal(J.hideDecoText(on,text),false,text);
  for(const lyric of ['2026','No.01','02:05,853','02 05 853']) {
    const env={...on,cut:{lineText:lyric,text:lyric}};
    for(const text of [lyric,...lyric.split(' ')])assert.equal(J.hideDecoText(env,text),false,text);
  }
  const p=J.defaultProject();p.subtitleCues=[{id:'stamp',start:125.853,end:130,text:'[timestamp]',filler:true},{id:'number',start:130,end:135,text:'2026'}];
  const a=J.plan(p), context=J.localLookContext(p);p.hideDecorativeText=true;const b=J.plan(p);
  assert.deepEqual(copy(a),copy(b));assert.equal(J.localLookContext(p),context);
  for(const cut of b.cuts)for(const text of [cut.text,...cut.words])assert.equal(J.hideDecoText({...on,cut},text),false,text);
});
test('long words stay whole in automatic chunks and balanced layout wrapping', () => {
  for (const segmenter of [true, false]) {
    const J = load(segmenter);
    for (const lang of ['ja', 'en']) {
      J.lang = lang;
      for (const word of ['extraordinary', 'unforgettable', 'internationalization']) {
        assert.deepEqual(copy(J.chunkText(word)), [word]);
        assert.equal(J.splitLines(word, 6), word);
        const p = J.defaultProject(); p.lang = lang;
        p.subtitleCues = [{id:'long',start:1,end:6,text:word}];
        assert.ok(J.plan(p).cuts.every(c => c.utext === word));
        const panels = J.LAYOUTS.panels.plan(J.rng(12), {text:word,n:word.length}, J.STYLES.noir);
        assert.deepEqual(copy(panels.chunks), [word]);
      }
      const phrase = 'Had a Dream in the Neon';
      const lines = J.splitLines(phrase, 6).split('\n');
      assert.equal(lines.join(' '), phrase);
      assert.ok(lines.length <= phrase.split(' ').length);
      assert.equal(J.joinWords(J.chunkText('never-ending')), 'never-ending');
      assert.equal(J.phraseChunks(J.chunkText('never-ending')).join(' '), 'never-ending');
    }
  }
});
test('single-letter words retain boundaries with Japanese/English segmentation and its fallback', () => {
  for (const segmenter of [true, false]) {
    const J = load(segmenter);
    for (const lang of ['ja', 'en']) {
      J.lang = lang;
      for (const text of ['Had a Dream in the Neon', 'Take a chance', 'You and I', 'I had a dream', 'A B C', 'Verse 1', '星 ○ △']) {
        assert.deepEqual(copy(J.chunkText(text)), text.split(' '), `${lang}: ${text}`);
      }
      assert.deepEqual(copy(J.phraseChunks(J.chunkText('Had a Dream in the Neon'))), ['Had a Dream', 'in the Neon']);
      assert.deepEqual(copy(J.chunkText('君 は')), ['君は']);
      assert.deepEqual(copy(J.chunkText('夢 ヲ')), ['夢ヲ']);
      assert.deepEqual(copy(J.chunkText('　　 　　　 　 　　')), ['　　', '　　　', '　', '　　']);
    }
  }
});
test('SRT and plain lyrics preserve English words in multi-cut plans and cut word lists', () => {
  const J = load(), text = 'Had a Dream in the Neon';
  for (const lang of ['ja', 'en']) for (const srt of [false, true]) {
    const p = J.defaultProject();
    p.lang = lang; p.lyrics = text;
    if (srt) p.subtitleCues = [{id:'1', start:0, end:8, text}];
    p.overrides = {0:{cuts:3, layout:'center'}};
    const plan = J.plan(p);
    assert.equal(plan.lines[0].text, text);
    assert.equal(plan.cuts.map(c => c.text).join(' '), text);
    assert.equal(plan.cuts.flatMap(c => copy(c.words)).join(' '), text);
  }
});
