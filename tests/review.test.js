/* Tests for the pull request review gate.
 *
 * Every case here is a way the gate could fail *open* - recording a pass when
 * nobody passed the change. That is the failure mode that matters: a gate
 * that wrongly blocks costs a re-run, a gate that wrongly passes is the
 * reason it exists.
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
  /* Taking the first match anywhere records a pass when the reviewer was
   * explaining why it would not pass. */
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
   * answer, so the verdict is rarely the final line. */
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
  /* An authentication error and no verdict. */
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

/* --- what reaches a public pull request --------------------------------- */

const { redact } = require('../tools/review-pr.js');

test('no local detail reaches a posted review', () => {
  /* Reviewer diagnostics carry absolute paths, and the comment is public. */
  const os = require('node:os');
  const home = os.homedir();
  const user = os.userInfo().username;
  /* Built from a char code so this file never itself contains a Windows path
   * ending in a backslash, which is awkward to write and easy to get wrong. */
  const bs = String.fromCharCode(92);

  const out = redact([
    'Error: something failed',
    '    at doThing (' + home + '/project/tools/x.js:12:3)',
    '    at Module._compile (node:internal/modules/cjs/loader:1)',
    'See ' + ['C:', 'Users', user, 'AppData', 'Roaming', 'npm', 'x.js'].join(bs),
    'Also /home/' + user + '/.config/secret and file:///C:/Users/' + user + '/x',
    'VERDICT: BLOCK'
  ].join('\n'));

  assert.ok(!out.includes(home), 'the home directory survived redaction');
  if (user.length > 2) {
    assert.ok(!out.includes(user), 'the account name survived redaction');
  }
  assert.ok(!/[A-Za-z]:[\\/]/.test(out), 'a drive path survived redaction');
  assert.ok(!out.includes('/home/'), 'a POSIX home path survived redaction');
  assert.ok(!/^\s*at\s/m.test(out), 'a stack frame survived redaction');
  /* The finding itself has to survive, or redaction has eaten the review. */
  assert.match(out, /Error: something failed/);
  assert.match(out, /VERDICT: BLOCK/);
});

test('redaction leaves an ordinary review alone', () => {
  const review = 'tools/review-pr.js:42 — the guard is inverted.\n\nVERDICT: BLOCK';
  assert.strictEqual(redact(review), review);
});

test('redaction keeps links and issue URLs intact', () => {
  /* An https:// URL contains a letter, a colon and a slash, which is also the
   * shape of a Windows drive path. */
  const review = [
    'See https://github.com/owner/repo/issues/12 and',
    'http://example.com/a/b for the reasoning.',
    'VERDICT: PASS'
  ].join('\n');
  assert.strictEqual(redact(review), review);
});

test('a file:// URL is redacted whole, not left as a stub', () => {
  const out = redact('opened file:///C:/Users/someone/secret.txt here');
  assert.ok(!out.includes('Users'), 'the path survived: ' + out);
  assert.ok(!out.includes('file:///'), 'a bare file:/// stub was left: ' + out);
});

test('stderr never reaches the text that gets posted', () => {
  /* The promise that stderr is never published rests on one assignment, so
   * it gets a test rather than trust. */
  const r = verdictFromRun({
    status: 1, stdout: 'VERDICT: PASS', stderr: 'Error at /home/someone/.aws/creds'
  });
  assert.ok(!r.output.includes('someone'), 'stderr leaked into the posted text');
  assert.ok(!r.output.includes('.aws'), 'stderr leaked into the posted text');
  /* It is still handed back separately, for the terminal. */
  assert.match(r.stderr, /\.aws/);
});

test('a finding that starts with "at" is not mistaken for a stack frame', () => {
  /* A filter that drops any line beginning with "at" deletes real findings
   * along with stack frames. */
  const review = [
    'at tools/scenes.js:40 the guard is inverted',
    'at least two callers depend on the old behaviour',
    'VERDICT: BLOCK'
  ].join('\n');
  const out = redact(review);
  assert.match(out, /the guard is inverted/);
  assert.match(out, /at least two callers/);
});

test('real stack frames are still dropped', () => {
  const out = redact([
    'Something failed',
    '    at doThing (/home/someone/app/x.js:12:3)',
    '    at Module._compile (node:internal/modules/cjs/loader:1)',
    'VERDICT: BLOCK'
  ].join('\n'));
  assert.ok(!out.includes('doThing'), 'a frame survived: ' + out);
  assert.ok(!out.includes('Module._compile'), 'a frame survived: ' + out);
  assert.match(out, /Something failed/);
});

test('a cited location is kept, an indented stack frame is dropped', () => {
  /* "at src/theme.js:12:5" is the shape the prompt asks reviewers to use when
   * citing a line. Indented, the same shape is a stack frame. Indentation is
   * what separates them, so it is what the filter uses. */
  const out = redact([
    'at src/theme.js:12:5 the ratio is computed before the mix',
    'at tools/audit.js:88:1',
    '    at doThing (/home/someone/app/x.js:12:3)',
    '    at run (/home/someone/app/y.js:4:1)',
    'VERDICT: BLOCK'
  ].join('\n'));
  assert.match(out, /the ratio is computed before the mix/);
  assert.match(out, /tools\/audit\.js:88:1/, 'an unindented citation was dropped');
  assert.ok(!out.includes('doThing'), 'an indented frame survived');
  assert.ok(!out.includes('run ('), 'an indented frame survived');
});

test('the directory the reviewers run in is not published', () => {
  const os = require('node:os');
  const out = redact('failed to start in ' + os.tmpdir() + '/nwt-review-ab12cd');
  assert.ok(!out.includes(os.tmpdir()), 'the scratch directory leaked: ' + out);
});

test('a path containing the account name is removed whole, tail and all', () => {
  /* Replacing the account name before the path rules truncates them: they
   * stop at "]", so a name already replaced ends the match and the rest of
   * the path survives. */
  const os = require('node:os');
  const user = os.userInfo().username;
  const B = String.fromCharCode(92);

  [
    'opened /home/' + user + '/.aws/credentials now',
    'in ' + os.homedir() + '/secrets/key.pem here',
    'see C:' + B + 'Users' + B + user + B + '.ssh' + B + 'id_rsa ok',
    'cwd was ' + os.tmpdir() + '/nwt-review-ab12'
  ].forEach(input => {
    const out = redact(input);
    assert.ok(!out.includes('.aws'), 'a path tail leaked: ' + out);
    assert.ok(!out.includes('secrets'), 'a path tail leaked: ' + out);
    assert.ok(!out.includes('id_rsa'), 'a path tail leaked: ' + out);
    assert.ok(!out.includes('nwt-review'), 'a path tail leaked: ' + out);
    if (user.length > 2) assert.ok(!out.includes(user), 'the account name leaked: ' + out);
  });
});

test('any absolute path is removed, not just the ones already thought of', () => {
  /* Naming particular directories is a denylist, and covers only the cases
   * already thought of. */
  const B = String.fromCharCode(92);
  [
    ["Cannot find module '/opt/homebrew/lib/node_modules/x/cli.js'", 'homebrew'],
    ["ENOENT, open '/root/.config/codex/auth.json'", 'auth.json'],
    ['failed on ' + B + B + 'server' + B + 'share' + B + 'secret.txt', 'secret.txt'],
    ['read /etc/passwd today', 'passwd']
  ].forEach(([input, secret]) => {
    const out = redact(input);
    assert.ok(!out.includes(secret), 'a path leaked: ' + out);
    assert.match(out, /\[path\]/);
  });
});

test('links and in-project citations survive the broad path rule', () => {
  /* A broad path rule matches from the second slash of "https://" unless the
   * lookbehind refuses a preceding slash or colon. */
  [
    'see https://github.com/owner/repo/issues/12 ok',
    'and http://example.com/a/b too',
    'tools/review-pr.js:42 the guard is inverted',
    'see docs/maintenance/CODE_REVIEW.md for the rule'
  ].forEach(input => assert.strictEqual(redact(input), input,
    'redaction changed something it should not have: ' + input));
});

test('a path with a space in it is removed whole, not up to the space', () => {
  /* Every pattern rule ends its match at whitespace, so a directory whose
   * name contains a space would keep everything after it. */
  const os = require('node:os');
  const B = String.fromCharCode(92);
  const u = os.userInfo().username;

  [
    ["ENOENT: open 'C:" + B + "Users" + B + u + B + "OneDrive - Acme Corp" + B + "keys.txt'", 'keys.txt'],
    ["cannot read '/mnt/My Drive/creds.json'", 'creds.json'],
    ['in ' + os.homedir() + B + 'secrets' + B + 'key.pem here', 'secrets'],
    ['in ' + os.homedir() + '/secrets/key.pem here', 'key.pem'],
    ['cwd ' + os.tmpdir() + B + 'nwt-review-ab', 'nwt-review']
  ].forEach(([input, secret]) => {
    const out = redact(input);
    assert.ok(!out.includes(secret), 'a path tail leaked: ' + out);
  });
});

test('an unindented citation with a parenthetical is kept', () => {
  /* Indentation is what separates a frame from a citation, so every pattern
   * has to require it. */
  const out = redact([
    'at buildPalette (theme-engine.js) the mix runs before the clamp',
    '    at buildPalette (/home/someone/app/theme-engine.js:88:3)',
    'VERDICT: BLOCK'
  ].join('\n'));
  assert.match(out, /the mix runs before the clamp/);
  assert.ok(!out.includes('88:3'), 'an indented frame survived: ' + out);
});
