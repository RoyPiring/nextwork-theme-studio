/* Reading JavaScript without parsing it.
 *
 * The audit looks at the shipped sources as text. The parts of that worth
 * testing on their own live here rather than inside the script that exits when
 * it finishes.
 */
'use strict';

/* Comments removed, and nothing else moved.
 *
 * A block comment becomes blank space of the same shape rather than one space,
 * so a comment spanning several lines does not pull everything below it
 * upwards. Checks report the line they found something on, and those numbers
 * have to match the file the reader is about to open. */
function codeOnly(body) {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, m => m.replace(/[^\n]/g, ' '))
    .split('\n')
    .map(withoutLineComment);
}

/* The line with any trailing // comment removed.
 *
 * Cutting at the first // took the tail off every line holding a URL, since
 * one contains "//" of its own. The checks that look for a remote address
 * then saw "var s = 'https:" and found nothing - in a string being the one
 * place a remote address would actually be written.
 *
 * A // only begins a comment when the quotes before it are closed. Where they
 * are not, it is inside a string and the line is kept whole. */
function withoutLineComment(line) {
  for (let i = 0; i + 1 < line.length; i++) {
    if (line[i] !== '/' || line[i + 1] !== '/') continue;
    const before = line.slice(0, i);
    if (["'", '"', '`'].every(q => (before.split(q).length - 1) % 2 === 0)) {
      return before;
    }
  }
  return line;
}

/* Whether what comes before a keyword on its own line leaves it standing as a
 * statement rather than sitting inside something else.
 *
 * Strings are why this is needed. A file can hold the text of a declaration
 * inside a quoted string, and reporting that as a second declaration would
 * fail the build over something that is not code. The obvious answer, blanking
 * out strings first, cannot be done without also recognising regular
 * expressions: a pattern as ordinary as /['"]/ would look like an opening
 * quote and swallow the rest of the file.
 *
 * So this asks a narrower question instead. An unpaired quote before the
 * keyword means it is inside a string. Anything else has to end at a closed
 * block or a finished statement. Both mistakes it can still make are quiet
 * ones: it declines to look at odd code, rather than failing the build over
 * code that is fine. */
function statementPosition(before) {
  if (/^\s*$/.test(before)) return true;
  const paired = ["'", '"', '`'].every(q => (before.split(q).length - 1) % 2 === 0);
  return paired && /[{};]\s*$/.test(before);
}

/* Every function a file declares, with the line it is on.
 *
 * async and generator forms count, and a name may carry a $, so a file that
 * starts using either is read rather than quietly skipped. */
function declarations(body) {
  const code = codeOnly(body).join('\n');
  const decl =
    /(^|[{};])\s*(async\s+)?function\s*\*?\s*([A-Za-z_$][\w$]*)\s*\(/gm;
  const out = [];
  let m;
  while ((m = decl.exec(code)) !== null) {
    const name = m[3];
    /* Where the declaration starts, which is the async when there is one:
     * what precedes it is what decides whether this is a statement. */
    const keyword = m.index + m[0].indexOf(m[2] ? 'async' : 'function');
    decl.lastIndex = m.index + m[0].length - 1;

    const lineStart = code.lastIndexOf('\n', keyword - 1) + 1;
    const before = code.slice(lineStart, keyword);
    if (!statementPosition(before)) continue;

    const start = m.index + m[0].lastIndexOf(name);
    out.push({
      name,
      line: code.slice(0, start).split('\n').length,
      indent: /^[ \t]*/.exec(before)[0].length
    });
  }
  return out;
}

/* Functions declared more than once beside each other.
 *
 * A second declaration of the same name in the same scope silently replaces
 * the first, and every call then reaches whichever came last regardless of
 * what it was written against. Two pairs had accumulated that way, each with
 * different arguments; nothing was broken because the callers happened to
 * match the survivor, which is luck rather than design.
 *
 * "Beside each other" is the whole difficulty. Two scenes may each keep a
 * local helper called y, and those are two different functions that never meet
 * - reporting them would fail the build over correct code, which is a worse
 * outcome than missing a duplicate. Without a parser, scope is read from
 * indentation: a declaration belongs to the nearest one above it that is
 * indented less. That is exact for code laid out normally, and where it is not
 * it separates names that a parser would have joined, which errs towards
 * silence.
 */
function duplicateDeclarations(body) {
  const seen = new Map();
  const clashes = [];
  const enclosing = [];               /* still-open declarations, outermost first */

  declarations(body).forEach(d => {
    while (enclosing.length && enclosing[enclosing.length - 1].indent >= d.indent) {
      enclosing.pop();
    }
    const parent = enclosing.length ? enclosing[enclosing.length - 1].name : '';

    const key = parent + ' ' + d.indent + ' ' + d.name;
    if (seen.has(key)) {
      clashes.push({ name: d.name, first: seen.get(key), second: d.line });
    } else {
      seen.set(key, d.line);
    }
    enclosing.push({ name: d.name, indent: d.indent });
  });
  return clashes;
}

/* Functions the file declares and then never names again.
 *
 * Thirty-six of these had collected in the scenery: generators from before
 * every theme carried a picture, and helpers only those generators had used.
 * None of it ran, and all of it shipped to everyone who installed the
 * extension.
 *
 * Comments do not count as a use, which is what let the last six hide - a
 * function whose own description mentioned it by name looked busy.
 *
 * What it will not find, all of it in the direction of leaving code alone:
 * a function that only calls itself counts its own call, a pair declared
 * twice counts its twin, and a name reached from another file looks used
 * because the name is there. Every shipped file is wrapped in an IIFE and
 * the pages carry no inline handlers, so nothing crosses a file boundary by
 * bare name; if that changes, this needs to know about it. */
function unusedDeclarations(body) {
  const code = codeOnly(body).join('\n');
  return declarations(body).filter(d =>
    (code.match(new RegExp('\\b' + d.name + '\\b', 'g')) || []).length <= 1);
}

/* Whether a file can be read as text.
 *
 * A NUL byte inside a comment or a string parses perfectly well, and git then
 * reports the whole file as "Binary files differ". A file that cannot be shown
 * in a diff cannot be reviewed. */
function isText(bytes) {
  if (bytes.includes(0)) return false;
  try {
    new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return true;
  } catch (e) {
    return false;
  }
}

/* Whether a line is an importScripts call naming only local files.
 *
 * The background pulls its two libraries in this way on Chromium, and that is
 * the one exception to the rule that the extension never loads anything. Every
 * argument has to be a bare quoted filename: a name built from a variable
 * could reach anywhere, and naming the two files here instead meant adding a
 * third broke the build.
 *
 * The arguments are split and checked one at a time. Written as a single
 * pattern this needed a repeated group around a repeated character class,
 * which backtracks exponentially on a long line that almost matches. */
function importsOnlyLocalFiles(line) {
  const call = /^\s*importScripts\(([^()]*)\)\s*;?\s*$/.exec(line);
  if (!call) return false;
  const args = call[1].split(',').map(a => a.trim());
  /* A trailing comma is allowed in a call, so one empty at the end is fine.
   * Dropping every empty instead would have accepted a gap anywhere. */
  if (args.length > 1 && args[args.length - 1] === '') args.pop();
  return args.length > 0 && args.every(a => /^'[\w.-]+\.js'$/.test(a));
}

module.exports = {
  codeOnly,
  statementPosition,
  declarations,
  duplicateDeclarations,
  unusedDeclarations,
  isText,
  importsOnlyLocalFiles
};
