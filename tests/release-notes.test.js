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
