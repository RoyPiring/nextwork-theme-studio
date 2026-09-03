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

  /* Compared as a string, not compiled into a pattern. The version arrives
   * from the command line, and escaping only the dots left every other
   * metacharacter to be interpreted: a version containing one would either
   * match the wrong section or throw. A heading has a fixed shape, so there
   * was nothing here that needed a regular expression. */
  const wanted = '## [' + want + ']';
  const start = lines.findIndex(l => l.trim().indexOf(wanted) === 0);
  if (start === -1) return null;

  /* Up to the next version heading, or the link list at the bottom.
   *
   * The link list is found by walking back from the end of the file, not by
   * matching a link definition anywhere. A section that cites something with a
   * reference-style link contains lines of the same shape, and treating the
   * first of those as the end would cut the notes short. */
  let linkList = lines.length;
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i].trim();
    if (line === '') continue;
    if (/^\[[^\]]+\]:\s*\S+$/.test(line)) { linkList = i; continue; }
    break;
  }

  let end = linkList;
  for (let i = start + 1; i < end; i++) {
    if (/^## \[/.test(lines[i])) { end = i; break; }
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
