const test = require('node:test'), assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
const sandbox = { window: {}, document: { documentElement: { lang: 'ja' }, createElement: () => ({ getContext: () => ({ measureText: text => ({ width: String(text).length * 20 }) }) }) }, console };
vm.createContext(sandbox);
const root = path.join(__dirname, '../src');
for (const name of fs.readdirSync(root).filter(n => n.endsWith('.js') && n < '12').sort()) vm.runInContext(fs.readFileSync(path.join(root, name), 'utf8'), sandbox, { filename: name });
const J = sandbox.window.J, copy = x => JSON.parse(JSON.stringify(x));
function fixture(filler = false) {
  const p = J.defaultProject();
  p.subtitleCues = ['朝が来る', '空の向こう 夜の彼方', '明日へ'].map((text, i) => ({ id: 'c' + i, text, start: i * 4, end: i * 4 + 4, filler: filler && i === 1 }));
  p.overrides = { 0: { cuts: 1 }, 1: { cuts: 2 }, 2: { cuts: 1 } };
  return p;
}
test('coverage review preserves other cues, timing, JSON and does not repeat; works after full random', () => {
  for (const filler of [false, true]) for (const group of ['layout', 'bg']) {
    let p = fixture(filler); p.unify = true;
    p = J.prepareCueReroll(p, J.plan(p), 1, null, 'random');
    let plan = J.plan(p), last;
    for (let i = 0; i < 20; i++) {
      const before = copy(p), others = [0, 2].map(n => copy(J.lineSnapshot(plan, n)));
      const result = J.prepareCoverageReview(p, plan, 1, null, group);
      assert.deepEqual(copy(p), before);
      p = result.project; plan = J.plan(p);
      assert.notEqual(result.id, last); last = result.id;
      assert.ok(J.coverageReviewPools[group].includes(result.id));
      assert.ok(plan.cuts.filter(c => c.line === 1).every(c => c[group] === result.id));
      assert.deepEqual(copy(p.subtitleCues), before.subtitleCues);
      assert.deepEqual([0, 2].map(n => copy(J.lineSnapshot(plan, n))), others);
      assert.deepEqual(copy(J.plan(copy(p)).cuts), copy(plan.cuts));
    }
  }
});
test('every audited candidate is reachable independent of normal inclusion switches', () => {
  for (const group of ['layout', 'bg']) {
    const pool = J.coverageReviewPools[group];
    try {
      for (const id of pool) {
        J.coverageReviewPools[group] = [id];
        const p = fixture(); p.extra = p.horror = p.wa = p.typo = p.kinetic = false;
        p.overrides[1] = { cuts: 1 };
        const def = J.registry(group)[id]; assert.ok(def, id);
        const n = [4, 8, 12, 20, 40, 60].find(n => !def.fits || def.fits(n)); assert.ok(n, id);
        p.subtitleCues[1].text = '字'.repeat(n);
        const result = J.prepareCoverageReview(p, J.plan(p), 1, null, group);
        assert.equal(J.plan(result.project).cuts.find(c => c.line === 1)[group], id);
      }
    } finally { J.coverageReviewPools[group] = pool; }
  }
});
test('locked, absent and incompatible cues fail transactionally', () => {
  const p = fixture(); p.overrides[1].lock = true;
  const before = JSON.stringify(p);
  for (const group of ['layout', 'bg']) {
    assert.throws(() => J.prepareCoverageReview(p, J.plan(p), 1, null, group));
    assert.throws(() => J.prepareCoverageReview(p, J.plan(p), 99, null, group));
  }
  assert.equal(JSON.stringify(p), before);
  p.overrides[1].lock = false;
  const pool = J.coverageReviewPools.layout;
  try {
    J.coverageReviewPools.layout = ['nonexistent'];
    assert.throws(() => J.prepareCoverageReview(p, J.plan(p), 1, null, 'layout'));
  } finally { J.coverageReviewPools.layout = pool; }
});
