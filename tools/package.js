/* Builds a distributable zip containing only what the browser loads.
 *
 *   node tools/package.js
 *
 * Docs, tools and review scaffolding are left out. The audit runs first, so a
 * failing build cannot be packaged.
 */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
const outDir = path.join(ROOT, 'dist');
const name = 'nextwork-theme-studio-' + manifest.version + '.zip';
const outFile = path.join(outDir, name);

/* Only what the extension needs at runtime. */
const INCLUDE = ['manifest.json', 'src', 'icons', 'themes', 'LICENSE', 'README.md'];

console.log('Running the audit first...');
try {
  execFileSync(process.execPath, [path.join(__dirname, 'audit.js')], { stdio: 'inherit' });
} catch (e) {
  console.error('\nAudit failed. Not packaging.');
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outFile)) fs.unlinkSync(outFile);

const missing = INCLUDE.filter(f => !fs.existsSync(path.join(ROOT, f)));
if (missing.length) {
  console.error('Missing: ' + missing.join(', '));
  process.exit(1);
}

try {
  if (os.platform() === 'win32') {
    execFileSync('powershell', ['-NoProfile', '-Command',
      'Compress-Archive -Path ' + INCLUDE.map(f => '"' + f + '"').join(',') +
      ' -DestinationPath "' + outFile + '" -Force'
    ], { cwd: ROOT, stdio: 'pipe' });
  } else {
    execFileSync('zip', ['-r', '-q', outFile].concat(INCLUDE), { cwd: ROOT, stdio: 'pipe' });
  }
} catch (e) {
  console.error('\nCould not create the archive: ' + e.message);
  console.error('On Linux or macOS this needs the `zip` command.');
  process.exit(1);
}

const kb = (fs.statSync(outFile).size / 1024).toFixed(0);
console.log('\nWrote dist/' + name + ' (' + kb + ' KB)');
console.log('Contents: ' + INCLUDE.join(', '));
