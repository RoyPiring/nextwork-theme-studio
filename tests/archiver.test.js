/* Tests for choosing an archiver.
 *
 * The build writes the files people install, and it once wrote a file with the
 * right name and no zip inside it, on a platform nothing was checking. What
 * gets chosen depends on what is installed, so the deciding is asked here
 * against lists these tests control - CI exercises one path per platform and
 * cannot reach the case where nothing is found at all.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { candidatesFor, findArchiver, NO_ARCHIVER } = require('../tools/archiver.js');

/* A stand-in for asking a binary what it is. Anything not named here is not
 * installed, and says so the way a missing binary does. */
function machine(installed) {
  const asked = [];
  const probe = bin => {
    asked.push(bin);
    if (!(bin in installed)) throw new Error('ENOENT: ' + bin);
    return installed[bin];
  };
  probe.asked = asked;
  return probe;
}

const BSDTAR = 'bsdtar 3.7.2 - libarchive 3.7.2 zlib/1.2.12';
const GNUTAR = 'tar (GNU tar) 1.35\nCopyright (C) 2023 Free Software Foundation';

test('bsdtar is found under its own name', () => {
  /* Debian and Ubuntu: GNU tar answers to `tar`, and libarchive-tools puts
   * bsdtar beside it rather than replacing it. */
  const probe = machine({ bsdtar: BSDTAR, tar: GNUTAR });
  assert.equal(findArchiver(['bsdtar', 'tar'], probe), 'bsdtar');
  assert.deepEqual(probe.asked, ['bsdtar'], 'it kept asking after it had an answer');
});

test('a tar that is libarchive is used as it is', () => {
  /* macOS, and Windows System32. */
  const probe = machine({ tar: BSDTAR });
  assert.equal(findArchiver(['bsdtar', 'tar'], probe), 'tar');
  assert.deepEqual(probe.asked, ['bsdtar', 'tar'], 'it skipped one without asking');
});

test('GNU tar alone is not an archiver', () => {
  /* This is the case that shipped a file with the right name and nothing in
   * it. GNU tar cannot write a zip, and answering "tar" here is worse than
   * answering nothing. */
  const probe = machine({ tar: GNUTAR });
  assert.equal(findArchiver(['bsdtar', 'tar'], probe), null);
});

test('nothing installed is nothing found', () => {
  const probe = machine({});
  assert.equal(findArchiver(['bsdtar', 'tar'], probe), null);
  assert.deepEqual(probe.asked, ['bsdtar', 'tar'], 'it stopped early');
});

test('a candidate that cannot be run is passed over, not fatal', () => {
  const probe = machine({ tar: BSDTAR });
  assert.equal(findArchiver(['does-not-exist', 'bsdtar', 'tar'], probe), 'tar');
});

test('the message for finding none says what to install', () => {
  assert.match(NO_ARCHIVER, /libarchive-tools/);
  assert.match(NO_ARCHIVER, /GNU tar cannot write a zip/);
});

/* ------------------------------------------------------------- candidates */

test('Windows tries the one in System32 before anything on PATH', () => {
  /* A POSIX toolchain on PATH first - Git for Windows ships one - otherwise
   * supplies GNU tar, which reads a drive letter as a remote host. */
  const seen = [];
  const list = candidatesFor('win32', 'C:\\Windows', p => { seen.push(p); return true; });
  assert.equal(list.length, 2);
  assert.match(list[0], /System32/);
  assert.equal(list[1], 'tar');
  assert.equal(seen.length, 1, 'it checked for something other than System32');
});

test('Windows without that copy still has somewhere to look', () => {
  const list = candidatesFor('win32', 'C:\\Windows', () => false);
  assert.deepEqual(list, ['tar']);
});

test('elsewhere, the separate name comes first', () => {
  ['linux', 'darwin', 'freebsd'].forEach(platform => {
    assert.deepEqual(candidatesFor(platform, undefined, () => true), ['bsdtar', 'tar'],
      platform + ' looked in the wrong order');
  });
});

test('a missing SystemRoot does not throw', () => {
  assert.deepEqual(candidatesFor('win32', undefined, () => false), ['tar']);
});

/* There is deliberately no test here that this machine has an archiver.
 *
 * It was written, and it failed on the runner that only runs the tests -
 * correctly, because that machine has no bsdtar and does not need one. An
 * assertion about what is installed is not a test of this code; it passes or
 * fails on the machine rather than on the change.
 *
 * The property it was reaching for is held where it belongs: the build asks
 * before it stages anything and stops with a message naming what to install,
 * and CI builds the packages on both platforms. */
