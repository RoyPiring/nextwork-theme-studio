/* The audit runs, and reports as many checks as it holds.
 *
 * Every check is wired to the repository it is checking, so the checks
 * themselves are exercised by running the thing. What this pins is the wiring:
 * a broken require, a check that stopped being registered, or a helper that
 * changed shape all show up here rather than as a quiet drop in the count that
 * nobody reads.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const fs = require('node:fs');
const { execFileSync } = require('node:child_process');

const ROOT = path.join(__dirname, '..');
const AUDIT = path.join(ROOT, 'tools', 'audit.js');

function runAudit() {
  try {
    return { code: 0, out: execFileSync(process.execPath, [AUDIT],
      { cwd: ROOT, encoding: 'utf8', stdio: 'pipe' }) };
  } catch (e) {
    return { code: e.status, out: String(e.stdout || '') + String(e.stderr || '') };
  }
}

test('the audit passes on the repository as it stands', () => {
  const { code, out } = runAudit();
  assert.equal(code, 0, 'the audit failed:\n' + out);
  assert.match(out, /checks passed/);
});

/* The gate only means anything if it is still holding as much as it was.
 *
 * A floor rather than an exact number, so adding a check does not fail this,
 * but removing one has to be deliberate: the count drops, this fails, and
 * whoever removed it comes here and says so. Comparing the file's own
 * registrations against the printed count would not do it - deleting a check
 * lowers both together and stays consistent with itself. */
const AT_LEAST = 24;

test('the audit still holds every check it had', () => {
  const { out } = runAudit();
  const reported = Number((/(\d+) checks passed/.exec(out) || [])[1]);
  assert.ok(reported >= AT_LEAST,
    'the audit reported ' + reported + ' checks, down from ' + AT_LEAST +
    '. If a check was removed on purpose, lower AT_LEAST and say why.');
});

test('every check that runs prints a result', () => {
  const { out } = runAudit();
  const reported = Number((/(\d+) checks passed/.exec(out) || [])[1]);
  const printed = (out.match(/^ {2}(PASS|FAIL) {2}/gm) || []).length;
  assert.equal(printed, reported, 'a check ran without printing a result');

  const body = fs.readFileSync(AUDIT, 'utf8');
  const registered = (body.match(/^check\(/gm) || []).length;
  assert.equal(reported, registered,
    'the file registers ' + registered + ' checks and ' + reported + ' ran');
});
