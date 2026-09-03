#!/usr/bin/env node
/* Print the CHANGELOG section for one version.
 *
 *     node tools/release-notes.js 2.8.3
 *
 * Used by the release workflow so a published release says the same thing as
 * the changelog, rather than a second description that can drift from it.
 *
 * Exits non-zero if the version has no section, which fails the release rather
 * than publishing one with empty notes.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');

/* Accepts "2.8.3" or "v2.8.3". */
function notesFor(changelog, version) {
  const want = String(version).replace(/^v/, '');
  const lines = changelog.split(/\r?\n/);

  /* Which lines sit inside a fenced block.
   *
   * A fence can hold anything, including a line shaped exactly like a heading
   * or a link definition, and none of it is markup. A changelog that shows the
   * reader how an entry is written contains exactly that. */
  const fenced = lines.map(() => false);
  let fence = null;
  lines.forEach((line, i) => {
    const rail = /^\s{0,3}(```+|~~~+)(.*)$/.exec(line);
    if (fence) {
      fenced[i] = true;             /* the closing rail belongs to it too */
      /* A rail closes the block only if it is the same character, at least as
       * long as the one that opened it, and has nothing but space after it.
       * A rail with anything else on the line is a line of the example, and
       * reading it as the end would expose the rest of the example. */
      if (rail && rail[1][0] === fence[0] && rail[1].length >= fence.length &&
          /^\s*$/.test(rail[2])) {
        fence = null;
      }
    } else if (rail && !(rail[1][0] === '`' && rail[2].indexOf('`') !== -1)) {
      /* An opening rail may be followed by a language, so its tail is mostly
       * free. A backtick rail is the exception: its tail may not contain a
       * backtick, because otherwise an ordinary sentence carrying an inline
       * code span would open a block that never closes, and every heading
       * below it would be read as example text. */
      fence = rail[1];
      fenced[i] = true;
    }
  });

  /* Compared as a string, not compiled into a pattern. The version arrives
   * from the command line, and escaping only the dots left every other
   * metacharacter to be interpreted: a version containing one would either
   * match the wrong section or throw. A heading has a fixed shape, so there
   * was nothing here that needed a regular expression.
   *
   * Matched at column 0 and not trimmed. A heading cannot be indented, so an
   * indented line that reads like one is example text, and a line inside a
   * fence is not markup at all. */
  const wanted = '## [' + want + ']';
  const start = lines.findIndex((l, i) => !fenced[i] && l.indexOf(wanted) === 0);
  if (start === -1) return null;

  /* Up to the next version heading, or the link list at the bottom.
   *
   * The link list is found by walking back from the end of the file, not by
   * matching a link definition anywhere. A section that cites something with a
   * reference-style link contains lines of the same shape, and treating the
   * first of those as the end would cut the notes short. */
  let linkList = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    if (fenced[i]) break;
    if (lines[i].trim() === '') continue;
    /* Matched where it sits, not trimmed first. A definition can carry up to
     * three spaces; past that it is an indented example of one, the same as a
     * fenced example, and cutting there would take the example off the end of
     * the section that shows it. */
    if (/^ {0,3}\[[^\]]+\]:\s*\S+$/.test(lines[i])) { linkList = i; continue; }
    break;
  }

  let end = linkList;
  for (let i = start + 1; i < end; i++) {
    if (!fenced[i] && /^## \[/.test(lines[i])) { end = i; break; }
  }
  return lines.slice(start + 1, end).join('\n').trim();
}

function main() {
  const version = process.argv[2];
  if (!version) {
    console.error('usage: node tools/release-notes.js <version>');
    process.exit(2);
  }
  const changelog = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');
  const notes = notesFor(changelog, version);
  if (!notes) {
    console.error('CHANGELOG.md has no section for ' + version + '.');
    console.error('Add one before releasing, so the release and the changelog agree.');
    process.exit(1);
  }
  process.stdout.write(notes + '\n');
}

module.exports = { notesFor };

if (require.main === module) main();
