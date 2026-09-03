/* Tests for the release-notes extractor.
 *
 * A release whose notes are empty, or which quietly carries the wrong
 * version's notes, is worse than no release: it is a published claim about
 * what changed that nobody checked.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const { notesFor } = require('../tools/release-notes.js');

const CHANGELOG = fs.readFileSync(
  path.join(__dirname, '..', 'CHANGELOG.md'), 'utf8');

test('a version returns its own section and stops at the next one', () => {
  const notes = notesFor(CHANGELOG, '2.8.0');
  assert.match(notes, /Surprise me/, 'the section body is missing');
  assert.ok(!/## \[/.test(notes), 'it ran into the next version heading');
  assert.ok(!/Surprise me[\s\S]*focus timer can be resized/.test(notes),
    'it swallowed the following version');
});

test('a leading v is accepted, since tags carry one', () => {
  assert.strictEqual(notesFor(CHANGELOG, 'v2.8.0'), notesFor(CHANGELOG, '2.8.0'));
});

test('the oldest version stops before the link list', () => {
  /* The last section is followed by the reference links rather than by
   * another heading, so it needs its own stopping rule. */
  const notes = notesFor(CHANGELOG, '1.0.0');
  assert.ok(notes.length > 0, 'no notes for the first version');
  assert.ok(!/^\[[^\]]+\]:\s*https?:/m.test(notes),
    'the link list was included in the notes');
});

test('an unknown version returns nothing rather than guessing', () => {
  assert.strictEqual(notesFor(CHANGELOG, '9.9.9'), null);
  assert.strictEqual(notesFor(CHANGELOG, ''), null);
});

test('a version is not matched by a longer one that starts the same', () => {
  /* Without anchoring, "2.8.0" would also match the "[2.8.0-beta]" heading,
   * and a prerelease would supply the notes for the release. */
  const made_up = '## [2.8]\n- wrong section\n\n## [2.8.0]\n- right section\n';
  assert.match(notesFor(made_up, '2.8.0'), /right section/);
});

test('a reference link inside a section does not end it early', () => {
  /* A section citing something with a reference-style link contains lines of
   * the same shape as the changelog's trailing link list. Matching the first
   * of those anywhere would cut the notes off at the citation. */
  const doc = [
    '## [2.0.0]',
    '### Fixed',
    '- Something, see [the spec][s].',
    '',
    '[s]: https://example.com/spec',
    '',
    '- And something after the citation.',
    '',
    '## [1.0.0]',
    '- older',
    '',
    '[2.0.0]: https://example.com/2',
    '[1.0.0]: https://example.com/1'
  ].join('\n');
  const notes = notesFor(doc, '2.0.0');
  assert.match(notes, /And something after the citation/,
    'the section was cut off at an inline reference link');
  assert.ok(!/older/.test(notes), 'it ran into the next version');
  assert.ok(!/^\[2\.0\.0\]:/m.test(notes), 'the trailing link list was included');
});

test('an indented line that reads like a heading is not one', () => {
  /* A heading cannot be indented, so this is an indented code block: example
   * text, whatever it says. Nothing here is fenced, so the column the heading
   * starts in is the only thing that separates the two - which is what a
   * trim() before comparing would take away. */
  const doc = [
    '# Changelog',
    '',
    '## [3.0.0]',
    'A heading is written like this:',
    '',
    '    ## [2.0.0]',
    '',
    '- the real 3.0.0 note',
    '',
    '## [2.0.0]',
    '- the real 2.0.0 note',
    '',
    '[3.0.0]: https://example.com/3',
    '[2.0.0]: https://example.com/2'
  ].join('\n');
  assert.equal(notesFor(doc, '2.0.0'), '- the real 2.0.0 note',
    'it started at the indented example instead of the heading');
  assert.match(notesFor(doc, '3.0.0'), /the real 3\.0\.0 note/,
    'the section was cut short at its own example');
});

test('a heading inside a fence is not mistaken for one', () => {
  /* A fence can hold a line shaped exactly like a heading, indented or not.
   * A changelog that shows the reader how an entry is written contains one. */
  const doc = [
    '# Changelog',
    '',
    '## [3.0.0]',
    'An entry is written like this:',
    '',
    '```',
    '## [2.0.0]',
    '```',
    '',
    '- the real 3.0.0 note',
    '',
    '## [2.0.0]',
    '- the real 2.0.0 note',
    '',
    '[3.0.0]: https://example.com/3',
    '[2.0.0]: https://example.com/2'
  ].join('\n');
  assert.equal(notesFor(doc, '2.0.0'), '- the real 2.0.0 note',
    'it started at the example instead of the heading');
  assert.match(notesFor(doc, '3.0.0'), /the real 3\.0\.0 note/,
    'the section was cut short at its own example');
  assert.match(notesFor(doc, '3.0.0'), /## \[2\.0\.0\]/,
    'the example was dropped from the section that shows it');
});

test('a tilde fence counts as a fence', () => {
  const doc = [
    '## [1.0.0]',
    '~~~',
    '## [0.9.0]',
    '~~~',
    '- the real 1.0.0 note',
    '',
    '## [0.9.0]',
    '- the real 0.9.0 note'
  ].join('\n');
  assert.equal(notesFor(doc, '0.9.0'), '- the real 0.9.0 note');
});

test('a fenced link definition at the end is content, not the link list', () => {
  /* The walk back from the end of the file stops at a fence, so an example
   * showing how the links are written stays part of the section. */
  const doc = [
    '## [1.0.0]',
    '- the real 1.0.0 note',
    '',
    'The links go at the bottom:',
    '',
    '```',
    '[1.0.0]: https://example.com/1',
    '```'
  ].join('\n');
  const notes = notesFor(doc, '1.0.0');
  assert.match(notes, /the real 1\.0\.0 note/);
  assert.match(notes, /\[1\.0\.0\]: https/, 'the fenced example was cut off');
});

test('a version carrying pattern characters matches nothing', () => {
  /* The version arrives from the command line. Compiled into a pattern with
   * only the dots escaped, every other metacharacter stayed live: these either
   * selected the wrong section or threw. */
  const doc = [
    '## [2.9.0]',
    '- the real note',
    '',
    '[2.9.0]: https://example.com/1'
  ].join('\n');
  assert.equal(notesFor(doc, '2.9.0'), '- the real note', 'the ordinary case broke');
  ['.*', '2.9.0]|(', '.', '2.9.0)', '[2.9.0]', '2!9!0', '^'].forEach(v => {
    assert.doesNotThrow(() => notesFor(doc, v), 'threw on ' + JSON.stringify(v));
    assert.equal(notesFor(doc, v), null, JSON.stringify(v) + ' matched a section');
  });
});

test('an inline code span does not open a fence', () => {
  /* Three backticks only open a block when nothing on the line closes them.
   * Treating a sentence with a code span in it as a fence would swallow every
   * heading below it, and the whole changelog would go missing. */
  const doc = [
    '## [2.0.0]',
    '```build``` is now ``` on its own line',
    '- the real 2.0.0 note',
    '',
    '## [1.0.0]',
    '- the real 1.0.0 note'
  ].join('\n');
  assert.equal(notesFor(doc, '1.0.0'), '- the real 1.0.0 note',
    'a code span hid the sections below it');
});

test('an indented link definition at the end is content, not the link list', () => {
  /* The fenced version of this document is covered above. An indented example
   * is the same shape in a different wrapper, and cutting there took the
   * example off the end and left the sentence introducing it dangling. */
  const doc = [
    '## [1.0.0]',
    '- the real 1.0.0 note',
    '',
    'The links go at the bottom:',
    '',
    '    [1.0.0]: https://example.com/1'
  ].join('\n');
  const notes = notesFor(doc, '1.0.0');
  assert.match(notes, /the real 1\.0\.0 note/);
  assert.match(notes, /\[1\.0\.0\]: https/, 'the indented example was cut off');
});

test('the real link list is still recognised when slightly indented', () => {
  /* Up to three spaces is still a definition, not an example. */
  const doc = [
    '## [1.0.0]',
    '- the real 1.0.0 note',
    '',
    '   [1.0.0]: https://example.com/1'
  ].join('\n');
  assert.equal(notesFor(doc, '1.0.0'), '- the real 1.0.0 note',
    'the trailing link list was kept in the notes');
});
