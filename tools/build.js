/* Builds a loadable package per browser.
 *
 *   node tools/build.js
 *
 * Chrome, Brave and Edge are all Chromium and take the same files - they get
 * separate folders anyway so each can be uploaded without renaming anything,
 * and so each carries the install guide for its own extensions page.
 *
 * Firefox needs a different manifest: MV3 there runs the background as an
 * event page, not a service worker.
 *
 * Safari is not a folder you can load. It has to be converted into a native
 * app with Xcode on macOS, so its folder holds the source plus instructions.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { tarBin } = require('./archiver.js');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const VERSION = manifest.version;

/* Runtime files only. No docs, tools or review scaffolding. */
const PAYLOAD = ['src', 'icons'];

console.log('Running the audit first...\n');
try {
  execFileSync(process.execPath, [path.join(__dirname, 'audit.js')], { stdio: 'inherit' });
} catch (e) {
  console.error('\nAudit failed. Nothing built.');
  process.exit(1);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  let n = 0;
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) n += copyDir(src, dst);
    else { fs.copyFileSync(src, dst); n++; }
  }
  return n;
}

/* bsdtar, not PowerShell's Compress-Archive.
 *
 * Compress-Archive writes Windows path separators into the zip central
 * directory. The spec requires forward slashes, so src/content.js came back
 * out as a single root-level entry whose name merely contained a separator
 * character. The manifest's reference to it resolved to nothing, and every
 * store upload and Firefox install failed - while the build still reported
 * success.
 *
 * Which binary that is differs by platform and by what is installed, so
 * tools/archiver.js works it out and this only asks. */
function zip(dir, outFile) {
  const entries = fs.readdirSync(dir);
  /* -a picks the format from the file extension, and it does not know .xpi -
   * asking for one directly produced an uncompressed tar that Firefox refused.
   * Always write a .zip, then rename. */
  const zipFile = outFile.replace(/\.xpi$/, '.zip');
  execFileSync(tarBin(), ['-a', '-c', '-f', zipFile, '-C', dir].concat(entries),
               { stdio: 'pipe' });
  const entryCount = verifyZip(zipFile);
  if (zipFile !== outFile) fs.renameSync(zipFile, outFile);
  return entryCount;
}

/* A zip that will not load is worse than no zip, because the build looks like
 * it worked. Read the archive back and check the two things that broke. */
function verifyZip(file) {
  const buf = fs.readFileSync(file);
  const SEP = String.fromCharCode(92);   /* backslash, kept out of the literal */
  const names = [];
  for (let i = 0; i < buf.length - 46; i++) {
    /* central directory file header signature */
    if (buf[i] === 0x50 && buf[i + 1] === 0x4b && buf[i + 2] === 0x01 && buf[i + 3] === 0x02) {
      const len = buf.readUInt16LE(i + 28);
      names.push(buf.toString('utf8', i + 46, i + 46 + len));
    }
  }
  if (!names.length) throw new Error('no entries in ' + path.basename(file));
  const wrongSep = names.filter(function (n) { return n.indexOf(SEP) !== -1; });
  if (wrongSep.length) {
    throw new Error(path.basename(file) + ': entry "' + wrongSep[0] + '" uses the wrong ' +
                    'path separator - the archiver is not writing a valid zip');
  }
  if (names.indexOf('manifest.json') === -1) {
    throw new Error(path.basename(file) + ': manifest.json is not at the archive root');
  }
  return names.length;
}

/* ---------------------------------------------------------------- manifests */

function chromiumManifest() {
  return JSON.parse(JSON.stringify(manifest));
}

function firefoxManifest() {
  const m = JSON.parse(JSON.stringify(manifest));
  /* Firefox MV3 has no service worker. The two libraries the background needs
   * are listed here instead of being pulled in with importScripts. */
  delete m.background.service_worker;
  m.background.scripts = ['src/wallpapers.js', 'src/scenes.js',
                          'src/theme-engine.js', 'src/background.js'];
  /* Chromium-only key; Firefox warns on it during review. */
  delete m.minimum_chrome_version;
  m.browser_specific_settings = {
    gecko: {
      id: 'nextwork-theme-studio@local',
      /* 121 is the floor for :has(), which the code-block rules use. */
      strict_min_version: '121.0'
    }
  };
  return m;
}

/* ------------------------------------------------------------------ targets */

const TARGETS = [
  { dir: 'chrome', label: 'Chrome', manifest: chromiumManifest, zip: true },
  { dir: 'brave', label: 'Brave', manifest: chromiumManifest, zip: true },
  { dir: 'edge', label: 'Edge', manifest: chromiumManifest, zip: true },
  { dir: 'firefox', label: 'Firefox', manifest: firefoxManifest, zip: true },
  { dir: 'safari', label: 'Safari', manifest: chromiumManifest, zip: false }
];

/* Asked before anything is staged. Left until the first archive, a machine
 * without a usable archiver copied five directories and then failed, leaving
 * all of them behind. */
tarBin();

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

console.log('\nBuilding packages\n');

TARGETS.forEach(function (t) {
  const out = path.join(DIST, t.dir);
  fs.mkdirSync(out, { recursive: true });

  let files = 0;
  PAYLOAD.forEach(function (p) { files += copyDir(path.join(ROOT, p), path.join(out, p)); });
  fs.writeFileSync(path.join(out, 'manifest.json'),
                   JSON.stringify(t.manifest(), null, 2) + '\n');
  fs.copyFileSync(path.join(ROOT, 'LICENSE'), path.join(out, 'LICENSE'));
  files += 2;

  const guide = path.join(ROOT, 'docs', 'install', t.dir + '.md');
  if (fs.existsSync(guide)) { fs.copyFileSync(guide, path.join(out, 'INSTALL.md')); files++; }

  let zipped = '';
  if (t.zip) {
    /* Firefox's install-from-file picker filters to .xpi. It is a zip either
     * way, but under a .zip name the file looks missing and people conclude
     * the build is broken. */
    const ext = t.dir === 'firefox' ? '.xpi' : '.zip';
    const zipFile = path.join(DIST, 'nextwork-theme-studio-' + t.dir + '-' + VERSION + ext);
    const entries = zip(out, zipFile);
    zipped = '  + ' + path.basename(zipFile) + ' (' + entries + ' entries, verified)';
  }
  console.log('  dist/' + t.dir.padEnd(9) + String(files).padStart(3) + ' files' + zipped);
});

console.log('\nVersion ' + VERSION);
console.log('Chrome, Brave and Edge are identical Chromium builds.');
console.log('Firefox uses an event-page background rather than a service worker,');
console.log('and its archive is named .xpi so the install picker shows it.');
console.log('Safari has no archive: it must be converted with Xcode on macOS -');
console.log('see dist/safari/INSTALL.md.');
