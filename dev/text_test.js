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
