/* Finding an archiver that can actually write a zip.
 *
 * Not every `tar` can. On Debian and Ubuntu it is GNU tar, which accepted the
 * arguments, wrote a file with the right name, and put no central directory in
 * it - the build only noticed when it read the archive back and found nothing.
 * libarchive-tools installs bsdtar beside it under its own name rather than
 * replacing it, so the name has to be tried before the plain one. macOS ships
 * bsdtar as `tar`, which the fallback finds.
 *
 * The choice depends on what is installed, so the deciding is kept here, away
 * from the build, and takes its candidates and its way of asking as arguments.
 * A test can then put the three outcomes to it without needing a machine that
 * has each one.
 */
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');

const NO_ARCHIVER =
  'no bsdtar here, and GNU tar cannot write a zip. Install libarchive-tools ' +
  '(Debian, Ubuntu) or use a machine that ships bsdtar.';

/* The names worth trying, in order, for one platform. */
function candidatesFor(platform, systemRoot, exists) {
  const out = [];
  if (platform === 'win32') {
    const sys = path.join(systemRoot || '', 'System32', 'tar.exe');
    if (exists(sys)) out.push(sys);
  } else {
    out.push('bsdtar');
  }
  out.push('tar');
  return out;
}

/* The first candidate that says it is libarchive, or null.
 *
 * Asked rather than assumed: a name proves nothing, and the one that matters
 * is spelled `tar` on one platform and `bsdtar` on another. A candidate that
 * is not installed throws when probed and is simply the wrong one. */
function findArchiver(candidates, probe) {
  for (const bin of candidates) {
    let version = '';
    try {
      version = probe(bin);
    } catch (e) {
      continue;                          /* not on this machine */
    }
    if (/bsdtar|libarchive/i.test(String(version))) return bin;
  }
  return null;
}

/* undefined until asked; null once asked and answered with nothing. */
let cached;

function tarBin() {
  if (cached === undefined) {
    cached = findArchiver(
      candidatesFor(process.platform, process.env.SystemRoot, fs.existsSync),
      bin => execFileSync(bin, ['--version'], { stdio: 'pipe' }).toString());
  }
  /* Remembered either way, so a machine without one is not probed again for
   * every archive it is about to fail to write. */
  if (cached === null) throw new Error(NO_ARCHIVER);
  return cached;
}

module.exports = { candidatesFor, findArchiver, tarBin, NO_ARCHIVER };
