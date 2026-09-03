/* Tests for reading JavaScript as text.
 *
 * The audit's checks report a file and a line, and a maintainer opens that
 * line. A number that points somewhere else, or a failure over something that
 * is not code at all, costs more trust than the check earns.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { codeOnly, statementPosition, duplicateDeclarations,
        unusedDeclarations, isText,
        importsOnlyLocalFiles } = require('../tools/source.js');

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
  assert.equal(statementPosition('  var m = /["]/.test(s); '), false,
    'one quote in a class is still one unpaired quote');

  /* The same shape without a quote in it is read normally. */
  assert.equal(statementPosition('  var m = /[0-9]/.test(s); '), true);
});

/* ------------------------------------------------- duplicate declarations */

const src = lines => lines.join('\n');

test('the same name declared twice beside itself is found', () => {
  const found = duplicateDeclarations(src([
    '(function () {',
    "  'use strict';",
    '  function petals(a) { return a; }',
    '  function other() {}',
    '  function petals(a, b) { return b; }',
    '}());'
  ]));
  assert.equal(found.length, 1);
  assert.equal(found[0].name, 'petals');
  assert.equal(found[0].first, 3, 'wrong line for the first');
  assert.equal(found[0].second, 5, 'wrong line for the second');
});

test('a helper of the same name in two functions is left alone', () => {
  /* Two scenes may each keep a local y. They are different functions that
   * never meet, and reporting them would fail the build over correct code. */
  const found = duplicateDeclarations(src([
    '(function () {',
    '  function ridge() {',
    '    function y(i) { return i; }',
    '    return y(1);',
    '  }',
    '  function trees() {',
    '    function y(i) { return i * 2; }',
    '    return y(2);',
    '  }',
    '}());'
  ]));
  assert.deepEqual(found, [], 'a local helper was reported as a duplicate');
});

test('the same helper twice in one function is found', () => {
  const found = duplicateDeclarations(src([
    '(function () {',
    '  function ridge() {',
    '    function y(i) { return i; }',
    '    function y(i) { return i * 2; }',
    '  }',
    '}());'
  ]));
  assert.equal(found.length, 1);
  assert.equal(found[0].name, 'y');
  assert.equal(found[0].first, 3);
  assert.equal(found[0].second, 4);
});

test('a name split from its keyword is still a declaration', () => {
  const found = duplicateDeclarations(src([
    '  function',
    '  split() {}',
    '  function',
    '  split() {}'
  ]));
  assert.equal(found.length, 1, 'a declaration written across lines was missed');
  assert.equal(found[0].second, 4, 'the line reported is not the name');
});

test('two declarations on one line are both read', () => {
  const found = duplicateDeclarations('  if (a) { function w() {} } if (b) { function w() {} }');
  assert.equal(found.length, 1, 'the second on the line was missed');
});

test('a declaration written inside a string is not one', () => {
  const found = duplicateDeclarations(src([
    '  var s = "; function render(";',
    '  function render() {}'
  ]));
  assert.deepEqual(found, [], 'text in a string was read as code');
});

test('a named function expression is not a declaration', () => {
  const found = duplicateDeclarations(src([
    '  var a = function keep() {};',
    '  var b = function keep() {};'
  ]));
  assert.deepEqual(found, []);
});

test('a declaration under a block comment reports the line it is on', () => {
  const found = duplicateDeclarations(src([
    '  function dup() {}',
    '  /* one',
    '     two',
    '     three */',
    '  function dup() {}'
  ]));
  assert.equal(found.length, 1);
  assert.equal(found[0].second, 5, 'the comment moved the reported line');
});

/* ----------------------------------------------------------- importScripts */

test('importScripts naming local files is allowed', () => {
  assert.equal(importsOnlyLocalFiles("importScripts('a.js');"), true);
  assert.equal(importsOnlyLocalFiles("  importScripts('scenes.js', 'theme-engine.js');"), true);
  assert.equal(importsOnlyLocalFiles("importScripts('a.js')"), true);
});

test('importScripts reaching anywhere else is not', () => {
  assert.equal(importsOnlyLocalFiles("importScripts('a.js' + x);"), false);
  assert.equal(importsOnlyLocalFiles('importScripts(url);'), false);
  assert.equal(importsOnlyLocalFiles("importScripts('https://example.com/a.js');"), false);
  assert.equal(importsOnlyLocalFiles('importScripts();'), false,
    'no arguments is not a list of local files');
  assert.equal(importsOnlyLocalFiles("importScripts('a.js', url);"), false,
    'one bad argument is enough');
  assert.equal(importsOnlyLocalFiles("fetch('a.js');"), false);
});

test('the line the extension actually ships is the one that is allowed', () => {
  /* The exemption is the single hole in "no network calls", so it is pinned to
   * the real file rather than to an example of it. If background.js starts
   * loading something a different way, this fails here rather than passing an
   * audit that no longer describes the code. */
  const fs = require('node:fs');
  const path = require('node:path');
  const body = fs.readFileSync(
    path.join(__dirname, '..', 'src', 'background.js'), 'utf8');
  const calls = body.split('\n').filter(l => /^\s*importScripts\(/.test(l));

  assert.ok(calls.length > 0, 'no importScripts call found in background.js');
  calls.forEach(call => {
    assert.equal(importsOnlyLocalFiles(call), true,
      'a call the extension ships is no longer covered: ' + call.trim());
  });

  /* And the same call reaching a name instead of a file would not be. The
   * filename is matched by shape rather than spelled out, so renaming a
   * library or adding a third does not turn this into a test of nothing. */
  const weakened = calls[0].replace(/'[\w.-]+\.js'/, 'name');
  assert.notEqual(weakened, calls[0], 'the substitution matched nothing');
  assert.equal(importsOnlyLocalFiles(weakened), false);
});

/* ------------------------------------------------------- unused and binary */

test('a function nothing names again is unused', () => {
  const found = unusedDeclarations(src([
    '(function () {',
    '  function used() { return 1; }',
    '  function idle() { return 2; }',
    '  return used();',
    '}());'
  ]));
  assert.equal(found.length, 1);
  assert.equal(found[0].name, 'idle');
  assert.equal(found[0].line, 3);
});

test('a comment is not a use', () => {
  /* Six functions hid this way: the name in the description above each one
   * made it look busy to a scan that counted the raw text. */
  const found = unusedDeclarations(src([
    '(function () {',
    '  /* A sun or moon disc, drawn with a corona. */',
    '  function disc() { return 1; }',
    '}());'
  ]));
  assert.equal(found.length, 1, 'the name in its own comment counted as a use');
  assert.equal(found[0].name, 'disc');
});

test('a function used only by a dead one is also dead', () => {
  /* This is what makes a removal safe to check: whatever survives while
   * calling something deleted is unreachable, and says so. */
  const first = unusedDeclarations(src([
    '(function () {',
    '  function helper() { return 1; }',
    '  function band() { return helper(); }',
    '}());'
  ]));
  assert.deepEqual(first.map(d => d.name), ['band'],
    'the caller should be the only one reported while it still stands');

  const after = unusedDeclarations(src([
    '(function () {',
    '  function helper() { return 1; }',
    '}());'
  ]));
  assert.deepEqual(after.map(d => d.name), ['helper'],
    'the helper should be reported once its only caller is gone');
});

test('a name used inside a string does not keep a function alive', () => {
  const found = unusedDeclarations(src([
    '(function () {',
    '  function idle() { return 1; }',
    "  var label = 'idle';",
    '  return label;',
    '}());'
  ]));
  assert.deepEqual(found.map(d => d.name), [],
    'a quoted name counts as a use, which errs towards keeping code');
});

test('the shipped sources have nothing left that is never called', () => {
  const fs = require('node:fs');
  const path = require('node:path');
  const dir = path.join(__dirname, '..', 'src');
  const idle = [];
  fs.readdirSync(dir).filter(n => n.endsWith('.js')).forEach(n => {
    unusedDeclarations(fs.readFileSync(path.join(dir, n), 'utf8'))
      .forEach(d => idle.push(n + ':' + d.line + ' ' + d.name));
  });
  assert.deepEqual(idle, [], 'dead code is back in the extension');
});

test('a file with a NUL byte is not text', () => {
  /* It parses, and git then shows the whole file as binary, so none of it
   * can be read in review. */
  assert.equal(isText(Buffer.from('var a = 1;\n', 'utf8')), true);
  assert.equal(isText(Buffer.from([0x76, 0x61, 0x72, 0x00, 0x20, 0x61])), false);
});

test('a file that is not valid UTF-8 is not text', () => {
  assert.equal(isText(Buffer.from([0xff, 0xfe, 0x41])), false);
  assert.equal(isText(Buffer.from('café — ok\n', 'utf8')), true,
    'ordinary accented text should still read as text');
});
