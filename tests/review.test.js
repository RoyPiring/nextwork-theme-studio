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

test('a trailer after the verdict does not change it', () => {
  /* These CLIs print token counts, update notices and warnings after their
   * answer. An earlier version demanded the verdict be the final line, which
   * turned every clean review into a block and made the gate unusable. */
  assert.strictEqual(
    parseVerdict('Looks fine.\n\nVERDICT: PASS\ntokens used: 5310').verdict, 'PASS');
  assert.strictEqual(
    parseVerdict('VERDICT: BLOCK\n\n[notice] a new version is available').verdict, 'BLOCK');
});

test('a verdict line that is neither PASS nor BLOCK blocks', () => {
  const r = parseVerdict('VERDICT: probably fine');
  assert.strictEqual(r.verdict, 'BLOCK');
  assert.match(r.reason, /neither PASS nor BLOCK/);
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
  ['', 'no verdict here', 'VERDICT: maybe'].forEach(input => {
    const r = parseVerdict(input);
    assert.strictEqual(r.verdict, 'BLOCK');
    assert.ok(r.reason && r.reason.length > 0,
      'a block with no stated reason for: ' + JSON.stringify(input));
  });
  /* A real pass carries no reason, because there is nothing to explain. */
  assert.strictEqual(parseVerdict('ok\n\nVERDICT: PASS').reason, null);
});

/* --- how the process exited, as opposed to what it said ------------------ */

const { verdictFromRun } = require('../tools/review-pr.js');

test('a clean exit with a clean verdict passes', () => {
  assert.strictEqual(
    verdictFromRun({ status: 0, stdout: 'Looks fine.\n\nVERDICT: PASS', stderr: '' }).verdict,
    'PASS');
});

test('a non-zero exit blocks even when a verdict was printed', () => {
  /* A reviewer that crashes part way through may have printed a verdict
   * before falling over. That verdict describes a review that never
   * finished, so the exit code decides, not the text. */
  const r = verdictFromRun({ status: 1, stdout: 'VERDICT: PASS', stderr: 'segfault' });
  assert.strictEqual(r.verdict, 'BLOCK');
  assert.match(r.output, /exited with code 1/);
});

test('a non-zero exit with nothing printed blocks and says so', () => {
  const r = verdictFromRun({ status: 127, stdout: '', stderr: '' });
  assert.strictEqual(r.verdict, 'BLOCK');
  assert.match(r.output, /no output/);
});

test('a spawn that never started blocks', () => {
  const r = verdictFromRun({ error: new Error('spawn codex ENOENT') });
  assert.strictEqual(r.verdict, 'BLOCK');
  assert.match(r.output, /could not be run/);
});
