/* Repository gate. Runs in CI and locally:
 *
 *   node tools/audit.js
 *
 * Exits non-zero on any failure, so a broken theme cannot be merged. Every
 * check here exists because the corresponding bug actually shipped at some
 * point during development.
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const rel = p => path.relative(ROOT, p).replace(/\\/g, '/');

let failures = 0;
const results = [];

function check(name, fn) {
  let detail = '';
  let ok = true;
  try {
    detail = fn() || '';
  } catch (err) {
    ok = false;
    detail = err.message;
  }
  if (!ok) failures++;
  results.push({ name, ok, detail });
}

function fail(msg) { throw new Error(msg); }

/* ---------------------------------------------------------------- manifest */
const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));

check('manifest is v3', () => {
  if (manifest.manifest_version !== 3) fail('manifest_version is ' + manifest.manifest_version);
  return 'v3';
});

check('every referenced file exists', () => {
  const refs = [manifest.background.service_worker, manifest.options_ui.page,
                manifest.action.default_popup]
    .concat(manifest.content_scripts.flatMap(cs => (cs.js || []).concat(cs.css || [])))
    .concat(Object.values(manifest.icons))
    .concat(Object.values(manifest.action.default_icon));
  const missing = refs.filter(r => !fs.existsSync(path.join(ROOT, r)));
  if (missing.length) fail('missing: ' + missing.join(', '));
  return refs.length + ' files';
});

check('permissions stay minimal', () => {
  const allowed = ['storage', 'activeTab'];
  const extra = (manifest.permissions || []).filter(p => !allowed.includes(p));
  if (extra.length) fail('unexpected permission(s): ' + extra.join(', '));
  if (manifest.host_permissions) fail('host_permissions should not be needed');
  return (manifest.permissions || []).join(', ');
});

check('content scripts only touch nextwork.ai', () => {
  const bad = manifest.content_scripts
    .flatMap(cs => cs.matches)
    .filter(m => !/^\*:\/\/(\*\.)?nextwork\.ai\/\*$/.test(m));
  if (bad.length) fail('unexpected match pattern(s): ' + bad.join(', '));
  return manifest.content_scripts[0].matches.join(' ');
});

/* ------------------------------------------------------------------ syntax */
const srcFiles = fs.readdirSync(path.join(ROOT, 'src'))
  .filter(f => f.endsWith('.js'))
  .map(f => path.join(ROOT, 'src', f));
const toolFiles = fs.readdirSync(path.join(ROOT, 'tools'))
  .filter(f => f.endsWith('.js'))
  .map(f => path.join(ROOT, 'tools', f));

check('all JavaScript parses', () => {
  srcFiles.concat(toolFiles).forEach(f => {
    try {
      execFileSync(process.execPath, ['--check', f], { stdio: 'pipe' });
    } catch (e) {
      fail(rel(f) + ': ' + String(e.stderr).split('\n')[0]);
    }
  });
  return srcFiles.length + toolFiles.length + ' files';
});

/* -------------------------------------------------------------- no network */
/* The extension must never talk to anything. This is the single most important
 * privacy property it has, so it is enforced rather than documented. */
check('no network calls in extension code', () => {
  const banned = /\b(fetch|XMLHttpRequest|WebSocket|EventSource|sendBeacon|importScripts)\s*\(/;
  const offenders = [];
  srcFiles.forEach(f => {
    const body = fs.readFileSync(f, 'utf8');
    body.split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;          /* comments are fine */
      if (/importScripts\('theme-engine|importScripts\('scenes/.test(line)) return;
      if (banned.test(line)) offenders.push(rel(f) + ':' + (i + 1));
    });
  });
  if (offenders.length) fail(offenders.join(', '));
  return 'clean';
});

check('no remote URLs in extension code', () => {
  const offenders = [];
  srcFiles.forEach(f => {
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      /* the SVG xmlns is a namespace identifier, never fetched */
      const stripped = line.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
      if (/https?:\/\//.test(stripped)) offenders.push(rel(f) + ':' + (i + 1));
    });
  });
  if (offenders.length) fail(offenders.join(', '));
  return 'clean';
});

check('no eval or innerHTML', () => {
  const banned = /\b(eval\s*\(|new\s+Function\s*\(|\.innerHTML\s*=|document\.write\s*\()/;
  const offenders = [];
  srcFiles.forEach(f => {
    fs.readFileSync(f, 'utf8').split('\n').forEach((line, i) => {
      if (/^\s*(\/\/|\*|\/\*)/.test(line)) return;
      if (banned.test(line)) offenders.push(rel(f) + ':' + (i + 1));
    });
  });
  if (offenders.length) fail(offenders.join(', '));
  return 'clean';
});

/* ------------------------------------------------------------ themes */
global.self = {};
require(path.join(ROOT, 'src', 'scenes.js'));
require(path.join(ROOT, 'src', 'theme-engine.js'));
const NWT = global.self.NWT;
const SCENES = global.self.NWT_SCENES;
const settings = JSON.parse(JSON.stringify(NWT.DEFAULT_SETTINGS));
const C = NWT.color.contrastRatio;

const themeIds = Object.keys(NWT.PRESETS);

check('every theme has scenery', () => {
  const missing = themeIds.filter(id => !SCENES[id]);
  if (missing.length) fail('no scene for: ' + missing.join(', '));
  return themeIds.length + ' themes';
});

/* Reusing a silhouette across themes is what made eighteen wallpapers feel like
 * three, so each motif belongs to exactly one scene and CI keeps it that way. */
check('every motif is exclusive to one theme', () => {
  const owner = {};
  const clashes = [];
  themeIds.forEach(id => {
    const theme = NWT.getTheme(settings, id);
    const p = NWT.buildPalette(theme);
    const u = {
      toneOf: (hex, t) => NWT.toneOf(hex, p.textPrimary, t),
      mix: NWT.color.mix,
      rgba: NWT.color.rgba
    };
    const scene = typeof SCENES[id] === 'function' ? SCENES[id](p, u) : SCENES[id];
    if (!scene.motifs || !scene.motifs.length) fail(theme.name + ' declares no motifs');
    scene.motifs.forEach(m => {
      if (owner[m]) clashes.push('"' + m + '" in both ' + owner[m] + ' and ' + theme.name);
      else owner[m] = theme.name;
    });
  });
  if (clashes.length) fail('\n    ' + clashes.join('\n    '));
  return Object.keys(owner).length + ' distinct motifs';
});

check('both stylesheet variants build for every theme', () => {
  themeIds.forEach(id => {
    const theme = NWT.getTheme(settings, id);
    const doc = NWT.buildCSS(settings, theme);
    const shadow = NWT.buildCSS(settings, theme, { shadow: true });
    if (!doc.length || !shadow.length) fail(id + ' produced an empty stylesheet');
    /* the shadow copy must not carry document-only selectors */
    if (/\bhtml /.test(shadow)) fail(id + ': shadow variant contains html-scoped rules');
  });
  return themeIds.length * 2 + ' stylesheets';
});

/* Contrast is the property most likely to regress silently, so it gates CI.
 * Targets: body text 7:1, secondary 4.5:1, text on accent 4.5:1, and every
 * large scenery fill and backdrop stop 7:1 against body text - article copy
 * sits directly on those. */
check('contrast floor holds for every theme', () => {
  const bad = [];
  themeIds.forEach(id => {
    const theme = NWT.getTheme(settings, id);
    const p = NWT.buildPalette(theme);
    const u = {
      toneOf: (hex, t) => NWT.toneOf(hex, p.textPrimary, t),
      mix: NWT.color.mix,
      rgba: NWT.color.rgba
    };
    const scene = typeof SCENES[id] === 'function' ? SCENES[id](p, u) : SCENES[id];

    const checks = [
      ['body text on canvas', C(p.textPrimary, p.canvas), 7],
      ['body text on surface', C(p.textPrimary, p.surface), 7],
      ['secondary on surface', C(p.textSecondary, p.surface), 4.5],
      ['muted on surface', C(p.textMuted, p.surface), 3],
      ['accent on canvas', C(p.accent, p.canvas), 3],
      ['text on accent', C(p.accentText, p.accent), 4.5],
      ['border on canvas', C(p.border, p.canvas), 1.5]
    ];
    ['success', 'warning', 'error', 'information'].forEach(fam => {
      checks.push([fam + ' badge', C(p.status[fam][400], p.status[fam][50]), 4.5]);
    });
    (scene.areaColors || []).forEach(c => {
      checks.push(['scenery ' + c, C(p.textPrimary, c), 7]);
    });
    if (theme.backdrop) {
      [...new Set(theme.backdrop.match(/#[0-9a-f]{6}/gi) || [])].forEach(c => {
        checks.push(['backdrop ' + c, C(p.textPrimary, c), 7]);
      });
    }
    checks.forEach(([label, value, target]) => {
      if (value < target) {
        bad.push(theme.name + ' / ' + label + ': ' + value.toFixed(2) + ' < ' + target);
      }
    });
  });
  if (bad.length) fail('\n    ' + bad.join('\n    '));
  return themeIds.length + ' themes checked';
});

/* ------------------------------------------------------------------ report */
const width = Math.max(...results.map(r => r.name.length));
console.log('');
results.forEach(r => {
  console.log((r.ok ? '  PASS  ' : '  FAIL  ') + r.name.padEnd(width + 2) + r.detail);
});
console.log('');
console.log(failures === 0
  ? results.length + ' checks passed'
  : failures + ' of ' + results.length + ' checks FAILED');
process.exit(failures === 0 ? 0 : 1);
