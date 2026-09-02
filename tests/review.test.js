/* Tests for the pull request review gate.
 *
 * Every case here is a way the gate could fail *open* — recording a pass when
 * nobody actually passed the change. That is the only failure mode that
 * matters: a gate that wrongly blocks costs a re-run, a gate that wrongly
 * passes is the reason it exists.
 *
 * The first three were found by the gate reviewing its own pull request.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { parseVerdict } = require('../tools/review-pr.js');

test('a clean verdict on the last line is taken at face value', () => {
  assert.strictEqual(parseVerdict('Looks fine.\n\nVERDICT: PASS').verdict, 'PASS');
  assert.strictEqual(parseVerdict('Two bugs here.\n\nVERDICT: BLOCK').verdict, 'BLOCK');
  /* Trailing blank lines are the reviewer's formatting, not a missing verdict. */
  assert.strictEqual(parseVerdict('Fine.\n\nVERDICT: PASS\n\n\n').verdict, 'PASS');
  assert.strictEqual(parseVerdict('fine\nverdict: pass').verdict, 'PASS');
});

test('a verdict quoted mid-review does not decide the review', () => {
  /* The original parser searched the whole reply and took the first match, so
   * a reviewer explaining why it would NOT pass was recorded as a pass. */
  const review = [
    'I considered answering VERDICT: PASS here, but the storage write is',
    'unguarded and will throw in private mode.',
    '',
    'VERDICT: BLOCK'
  ].join('\n');
  assert.strictEqual(parseVerdict(review).verdict, 'BLOCK');
});

test('two verdicts is a refusal, not a guess', () => {
  const r = parseVerdict('VERDICT: PASS\nsecond thoughts\nVERDICT: BLOCK');
  assert.strictEqual(r.verdict, 'BLOCK');
  assert.match(r.reason, /2 VERDICT lines/);
});

test('a reply that does not end with the verdict blocks', () => {
  /* Trailing prose after the verdict means the reviewer kept going, and what
   * it decided in the end is not knowable from the line it passed through. */
  const r = parseVerdict('VERDICT: PASS\nActually, one more thing worries me.');
  assert.strictEqual(r.verdict, 'BLOCK');
});

test('silence, noise and nonsense all block', () => {
  assert.strictEqual(parseVerdict('').verdict, 'BLOCK');
  assert.strictEqual(parseVerdict(null).verdict, 'BLOCK');
  assert.strictEqual(parseVerdict(undefined).verdict, 'BLOCK');
  assert.strictEqual(parseVerdict('   \n  \n').verdict, 'BLOCK');
  assert.strictEqual(parseVerdict('The command line is too long.').verdict, 'BLOCK');
  /* The real Gemini failure: an authentication stack trace and no verdict. */
  assert.strictEqual(
    parseVerdict('Error authenticating: IneligibleTierError: ...').verdict, 'BLOCK');
  /* A verdict word that is not one of the two allowed. */
  assert.strictEqual(parseVerdict('VERDICT: MAYBE').verdict, 'BLOCK');
  assert.strictEqual(parseVerdict('VERDICT:').verdict, 'BLOCK');
});

test('the reason a block happened is always reported', () => {
  /* Whoever re-runs this has to be able to tell "the reviewer found a bug"
   * from "the reviewer never ran", and those look identical without it. */
  ['', 'no verdict here', 'VERDICT: PASS\ntrailing'].forEach(input => {
    const r = parseVerdict(input);
    assert.strictEqual(r.verdict, 'BLOCK');
    assert.ok(r.reason && r.reason.length > 0,
      'a block with no stated reason for: ' + JSON.stringify(input));
  });
  /* A real pass carries no reason, because there is nothing to explain. */
  assert.strictEqual(parseVerdict('ok\n\nVERDICT: PASS').reason, null);
});
