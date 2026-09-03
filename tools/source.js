/* Reading JavaScript without parsing it.
 *
 * The audit looks at the shipped sources as text. These two helpers are the
 * part of that worth testing on its own, so they live here rather than inside
 * the script that exits when it finishes.
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
    .map(line => line.replace(/\/\/.*$/, ''));
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

module.exports = { codeOnly, statementPosition };
