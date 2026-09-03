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

/* ------------------------------------------------------------ running them */

const { startReviewer } = require('../tools/review-pr.js');

/* A reviewer is a name and a command, so a test can supply its own. These run
 * node rather than the real CLIs: what is being checked is the running, not
 * the reviewing. */
function fake(name, script) {
  return { name: name, cmd: process.execPath, args: ['-e', script] };
}

test('the reviewers run at the same time, not one after the other', async () => {
  /* Run in turn, a review took as long as both put together, and the wait grew
   * with the diff until it was long enough to discourage asking. */
  /* Single quotes inside: an argument carrying a double quote is refused
   * outright on Windows, which is the quoting guard doing its job. */
  const sleep = "setTimeout(() => console.log('VERDICT: PASS'), 700)";

  /* One first, to learn what this machine costs for a single reviewer. A
   * fixed threshold measures the machine as much as the sequencing, and fails
   * on a busy one for reasons that have nothing to do with the change. */
  let mark = Date.now();
  const one = await startReviewer(fake('Solo', sleep), '');
  const alone = Date.now() - mark;
  assert.equal(one.status, 0);

  mark = Date.now();
  const both = await Promise.all([
    startReviewer(fake('A', sleep), ''),
    startReviewer(fake('B', sleep), '')
  ]);
  const together = Date.now() - mark;

  both.forEach((r, i) => {
    assert.equal(r.status, 0, 'reviewer ' + i + ' did not exit cleanly');
    assert.match(r.stdout, /VERDICT: PASS/);
  });
  /* Run in turn it would be about twice one. Halfway between the two is a
   * wide gap either side, so this reads as sequencing rather than speed. */
  assert.ok(together < alone * 1.5,
    'one reviewer took ' + alone + 'ms and two took ' + together +
    'ms, which is one after the other rather than together');
});

test('what a reviewer is given arrives on its stdin', async () => {
  /* The prompt carries a diff, which is far past the command-line limit on
   * Windows, so it never goes in as an argument. */
  const echo = "let s='';process.stdin.on('data',d=>s+=d)" +
               ".on('end',()=>console.log('got:'+s.length))";
  const run = await startReviewer(fake('A', echo), 'x'.repeat(5000));
  assert.match(run.stdout, /got:5000/);
});

test('a reviewer that is not installed blocks rather than throwing', async () => {
  /* How it comes back differs by platform: without a shell the spawn itself
   * errors, and under one the shell runs, says it cannot find the command and
   * exits non-zero. Both have to block, and it is the blocking that matters. */
  const run = await startReviewer(
    { name: 'Missing', cmd: 'definitely-not-a-real-command-xyz', args: [] }, '');
  assert.ok(run.error || run.status !== 0,
    'a missing command should not look like a clean run');
  assert.equal(verdictFromRun(run).verdict, 'BLOCK');
});

test('a reviewer that exits non-zero keeps what it printed', async () => {
  const run = await startReviewer(
    fake('A', "console.log('VERDICT: PASS');process.exit(3)"), '');
  assert.equal(run.status, 3);
  assert.equal(verdictFromRun(run).verdict, 'BLOCK',
    'a run that failed part way through is not a pass');
});

test('a reviewer that will not stop printing is stopped, and blocks', async () => {
  /* spawnSync enforced this through maxBuffer and killed the child. Collecting
   * the output by hand loses it unless it is put back, and a gate that runs
   * out of memory is worse than one that blocks. The cap is an argument so
   * this does not have to produce 32 MB to find out. */
  /* Prints far past the cap and then ends by itself, so this checks the cap
   * without also depending on a kill reaching through a shell. */
  const flood = "for (let i = 0; i < 200; i++) console.log('x'.repeat(4096))";
  const run = await startReviewer(fake('Loud', flood), '', 64 * 1024);

  assert.ok(run.error, 'it was allowed to keep printing');
  assert.match(run.error.message, /printed more than/);
  assert.equal(verdictFromRun(run).verdict, 'BLOCK');
});

test('a reviewer that prints a normal amount is left alone', async () => {
  const some = "console.log('x'.repeat(10000));console.log('VERDICT: PASS')";
  const run = await startReviewer(fake('Quiet', some), '', 64 * 1024);
  assert.ok(!run.error, 'a reviewer under the cap was stopped anyway');
  assert.equal(verdictFromRun(run).verdict, 'PASS');
});

test('a command whose path has a space is quoted for the shell', () => {
  /* Only the arguments were quoted, so a command path containing a space was
   * split at it and the first word run as the program. The reviewers are
   * named plainly enough that it never showed. */
  const { shellArg } = require('../tools/review-pr.js');
  const spaced = ['C:', 'Program Files', 'nodejs', 'node.exe'].join(String.fromCharCode(92));
  assert.equal(shellArg(spaced), '"' + spaced + '"');
  assert.equal(shellArg('codex'), 'codex', 'a plain name should not be quoted');
});

test('a stopped reviewer still shows what it managed to say', () => {
  /* spawnSync handed back the truncated output alongside its error. A bare
   * message would throw away a review that was finished before the reviewer
   * went loud. */
  const r = verdictFromRun({
    error: new Error('it printed more than 64 KB, and was stopped'),
    stdout: 'The storage write is unguarded.\n\nVERDICT: BLOCK'
  });
  assert.equal(r.verdict, 'BLOCK');
  assert.match(r.output, /printed more than 64 KB/);
  assert.match(r.output, /storage write is unguarded/);
});

test('the size in that message reads properly at any cap', () => {
  /* Rounded to megabytes, the tests' own cap read as "0 MB". */
  const { describeSize } = require('../tools/review-pr.js');
  assert.equal(describeSize(32 * 1024 * 1024), '32 MB');
  assert.equal(describeSize(64 * 1024), '64 KB');
  assert.equal(describeSize(512), '512 bytes');
});

test('a cap of nothing is taken at its word', () => {
  /* Written as `limit || MAX_OUTPUT`, asking for no output at all quietly
   * became the 32 MB default. */
  const quiet = "console.log('VERDICT: PASS')";
  return startReviewer(fake('Any', quiet), '', 0).then(run => {
    assert.ok(run.error, 'a cap of zero let output through');
  });
});

test('the cap counts bytes, not characters', async () => {
  /* maxBuffer counted bytes, and bytes are what is being held. Counting the
   * decoded string counts characters instead: 30,000 of these is 90 KB of
   * output but only 30,000 characters, so a 64 KB cap measured in characters
   * would not notice. */
  const wide = "console.log('\u20ac'.repeat(30000))";
  const run = await startReviewer(fake('Wide', wide), '', 64 * 1024);

  assert.ok(run.error, 'ninety kilobytes went through a sixty-four kilobyte cap');
  assert.match(run.error.message, /printed more than 64 KB/);
});

test('text that straddles two chunks is still decoded correctly', async () => {
  /* The buffers are joined once at the end. Decoded as each arrives, a
   * character split across two of them comes back as replacement characters. */
  const wide = "console.log('\u20ac'.repeat(20000));console.log('VERDICT: PASS')";
  const run = await startReviewer(fake('Wide', wide), '');

  assert.equal(run.status, 0);
  assert.ok(!run.stdout.includes('\ufffd'), 'a character was split and lost');
  assert.equal((run.stdout.match(/\u20ac/g) || []).length, 20000);
  assert.equal(verdictFromRun(run).verdict, 'PASS');
});
