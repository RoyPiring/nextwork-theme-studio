/* Tests for reading JavaScript as text.
 *
 * The audit's checks report a file and a line, and a maintainer opens that
 * line. A number that points somewhere else, or a failure over something that
 * is not code at all, costs more trust than the check earns.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { codeOnly, statementPosition } = require('../tools/source.js');

test('a block comment keeps the lines it spans', () => {
  /* Replacing the whole comment with one space moved every line below it
   * upwards, so five checks reported a line above the one they found. */
  const body = [
    'const a = 1;',
    '/* one',
    '   two',
    '   three */',
    'const b = 2;'
  ].join('\n');
  const code = codeOnly(body);
  assert.equal(code.length, 5, 'the file changed length');
  assert.match(code[4], /const b = 2;/, 'b is no longer on line 5');
  assert.equal(code[1].trim(), '', 'comment text survived');
  assert.equal(code[2].trim(), '', 'comment text survived');
});

test('a comment sharing a line leaves the code on it', () => {
  const code = codeOnly('const a = 1; /* why */ const b = 2;\nconst c = 3; // note');
  assert.match(code[0], /const a = 1;/);
  assert.match(code[0], /const b = 2;/);
  assert.match(code[1], /const c = 3;/);
  assert.ok(!/note/.test(code[1]), 'the line comment survived');
});

test('a keyword at the start of a line stands as a statement', () => {
  assert.equal(statementPosition(''), true);
  assert.equal(statementPosition('  '), true);
});

test('a keyword after a finished statement stands as one', () => {
  assert.equal(statementPosition('  var q = 1; '), true);
  assert.equal(statementPosition('  if (a) { '), true);
  assert.equal(statementPosition('  } '), true);
  assert.equal(statementPosition('  var s = "x"; '), true,
    'a closed string before it should not matter');
  assert.equal(statementPosition('  if (a) { b(); } if (c) { '), true,
    'a second block on the same line should still count');
});

test('a keyword inside a string does not stand as a statement', () => {
  /* A file may hold the text of a declaration inside a string. Reading that
   * as code would fail the build over something that is not code. */
  assert.equal(statementPosition('  var s = "; '), false);
  assert.equal(statementPosition("  var s = '; "), false);
  assert.equal(statementPosition('  var s = `; '), false);
});

test('a keyword mid-expression does not stand as a statement', () => {
  assert.equal(statementPosition('  var x = '), false);
  assert.equal(statementPosition('  call('), false);
});

test('an unpaired quote is declined, whatever put it there', () => {
  /* A pattern such as /['"]/ carries one of each quote, and this rule cannot
   * tell that from a string left open. It declines to read the line.
   *
   * That is the direction to be wrong in. Declining means a declaration on
   * the same line as such a pattern goes unexamined, which loses a little
   * reach; the other direction would fail the build over a file that is
   * correct. Both quotes here are closed, so nothing is actually wrong with
   * the line - it is simply not worth a parser to prove it. */
  assert.equal(statementPosition(`  var m = /['"]/.test(s); `), false);

  /* Same shape, one quote character, and read normally. */
  assert.equal(statementPosition('  var m = /["]/.test(s); '), true);
});
