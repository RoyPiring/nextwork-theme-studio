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
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const VERSION = manifest.version;

/* Runtime files only. No docs, tools or review scaffolding. */
const PAYLOAD = ['src', 'icons', 'themes'];

console.log('Running the audit first...\n');
try {
  execFileSync(process.execPath, [path.join(__dirname, 'audit.js')], { stdio: 'inherit' });
} catch (e) {
  console.error('\nAudit failed. Nothing built.');
  process.exit(1);
}

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const src = path.join(from, entry.name);
    const dst = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(src, dst);
    else fs.copyFileSync(src, dst);
  }
}

function zip(dir, outFile) {
  try {
    if (os.platform() === 'win32') {
      execFileSync('powershell', ['-NoProfile', '-Command',
        'Compress-Archive -Path "' + dir + '\\*" -DestinationPath "' + outFile + '" -Force'
      ], { stdio: 'pipe' });
    } else {
      execFileSync('zip', ['-r', '-q', outFile, '.'], { cwd: dir, stdio: 'pipe' });
    }
    return true;
  } catch (e) {
    return false;
  }
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
  m.background.scripts = ['src/scenes.js', 'src/theme-engine.js', 'src/background.js'];
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

fs.rmSync(DIST, { recursive: true, force: true });
fs.mkdirSync(DIST, { recursive: true });

console.log('\nBuilding packages\n');

TARGETS.forEach(function (t) {
  const out = path.join(DIST, t.dir);
  fs.mkdirSync(out, { recursive: true });

  PAYLOAD.forEach(function (p) { copyDir(path.join(ROOT, p), path.join(out, p)); });
  fs.writeFileSync(path.join(out, 'manifest.json'),
                   JSON.stringify(t.manifest(), null, 2) + '\n');
  fs.copyFileSync(path.join(ROOT, 'LICENSE'), path.join(out, 'LICENSE'));

  const guide = path.join(ROOT, 'docs', 'install', t.dir + '.md');
  if (fs.existsSync(guide)) fs.copyFileSync(guide, path.join(out, 'INSTALL.md'));

  const files = execFileSync(process.execPath, ['-e',
    'const fs=require("fs"),p=require("path");' +
    'let n=0;(function w(d){for(const e of fs.readdirSync(d,{withFileTypes:true}))' +
    'e.isDirectory()?w(p.join(d,e.name)):n++})(process.argv[1]);console.log(n)', out
  ], { encoding: 'utf8' }).trim();

  let zipped = '';
  if (t.zip) {
    const zipFile = path.join(DIST, 'nextwork-theme-studio-' + t.dir + '-' + VERSION + '.zip');
    zipped = zip(out, zipFile) ? '  + zip' : '  (zip unavailable)';
  }
  console.log('  dist/' + t.dir.padEnd(9) + files + ' files' + zipped);
});

console.log('\nVersion ' + VERSION);
console.log('Chrome, Brave and Edge are identical Chromium builds.');
console.log('Firefox uses an event-page background rather than a service worker.');
console.log('Safari has no zip: it must be converted with Xcode on macOS -');
console.log('see dist/safari/INSTALL.md.');
