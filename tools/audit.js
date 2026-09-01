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
  /* storage only. activeTab was requested for a year and never used: the
   * popup's reload button calls chrome.tabs.reload() with no arguments, which
   * needs no permission at all. */
  const allowed = ['storage'];
  const extra = (manifest.permissions || []).filter(p => !allowed.includes(p));
  if (extra.length) fail('unexpected permission(s): ' + extra.join(', '));
  /* Everything below is another way to widen reach without touching
   * `permissions`, so each one has to be absent rather than merely unchecked. */
  ['host_permissions', 'optional_permissions', 'optional_host_permissions',
   'web_accessible_resources', 'externally_connectable',
   'content_security_policy'].forEach(key => {
    if (manifest[key]) fail(key + ' should not be needed');
  });
  return (manifest.permissions || []).join(', ');
});

check('manifest and package version agree', () => {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  if (pkg.version !== manifest.version) {
    fail('manifest.json ' + manifest.version + ' vs package.json ' + pkg.version);
  }
  return manifest.version;
});

check('every file the HTML pages load exists', () => {
  /* The manifest names three entry points; each of those pages then pulls in
   * scripts and stylesheets nobody was checking. Renaming options.js used to
   * pass the audit and ship a blank editor. */
  const pages = ['src/options.html', 'src/popup.html'];
  const missing = [];
  let n = 0;
  pages.forEach(page => {
    const dir = path.dirname(path.join(ROOT, page));
    const body = fs.readFileSync(path.join(ROOT, page), 'utf8');
    const refs = [];
    body.replace(/(?:src|href)="([^"]+)"/g, (_, r) => { refs.push(r); return _; });
    refs.filter(r => !/^(https?:)?\/\//.test(r) && !r.startsWith('data:')).forEach(r => {
      n++;
      if (!fs.existsSync(path.join(dir, r))) missing.push(page + ' -> ' + r);
    });
  });
  if (missing.length) fail('missing: ' + missing.join(', '));
  return n + ' references';
});

check('content scripts only touch nextwork.ai', () => {
  const bad = manifest.content_scripts
    .flatMap(cs => cs.matches)
    .filter(m => !/^https:\/\/\*\.nextwork\.ai\/\*$/.test(m));
  if (bad.length) fail('unexpected match pattern(s): ' + bad.join(', '));
  return manifest.content_scripts[0].matches.join(' ');
});

/* ------------------------------------------------------------------ syntax */
/* Walk, do not list. A flat readdir left src/anything/deeper.js exempt from
 * every content check below, which is exactly where something would hide. */
function jsUnder(dir) {
  const out = [];
  (function walk(d) {
    fs.readdirSync(d, { withFileTypes: true }).forEach(e => {
      const full = path.join(d, e.name);
      if (e.isDirectory()) walk(full);
      else if (e.name.endsWith('.js')) out.push(full);
    });
  })(dir);
  return out;
}
const srcFiles = jsUnder(path.join(ROOT, 'src'));
const toolFiles = jsUnder(path.join(ROOT, 'tools'));

/* Strip comments before scanning, rather than skipping any line that starts
 * with one. The old test skipped the whole line, so `/* *\/ fetch(url)` was
 * invisible, and a trailing `// see fetch()` produced a false failure. */
function codeOnly(body) {
  return body
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map(line => line.replace(/\/\/.*$/, ''));
}

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
    codeOnly(fs.readFileSync(f, 'utf8')).forEach((line, i) => {
      /* The background pulls its two libraries in with importScripts on
       * Chromium. Allow it only when every argument is a bare local filename -
       * naming the files instead meant adding one broke the build. */
      if (/^\s*importScripts\((?:\s*'[\w.-]+\.js'\s*,?)+\)\s*;?\s*$/.test(line)) return;
      if (banned.test(line)) offenders.push(rel(f) + ':' + (i + 1));
    });
  });
  if (offenders.length) fail(offenders.join(', '));
  return 'clean';
});

check('no remote URLs in extension code', () => {
  const offenders = [];
  srcFiles.forEach(f => {
    codeOnly(fs.readFileSync(f, 'utf8')).forEach((line, i) => {
      /* the SVG xmlns is a namespace identifier, never fetched */
      const stripped = line.replace(/http:\/\/www\.w3\.org\/2000\/svg/g, '');
      if (/https?:\/\//.test(stripped)) offenders.push(rel(f) + ':' + (i + 1));
    });
  });
  if (offenders.length) fail(offenders.join(', '));
  return 'clean';
});

check('no eval or HTML injection', () => {
  /* `.innerHTML +=` slipped past the old `\\s*=`, and the other four sinks were
   * simply not listed. */
  const banned = new RegExp(
    '\\b(eval\\s*\\(|new\\s+Function\\s*\\(|document\\.write\\s*\\(' +
    '|\\.(inner|outer)HTML\\s*\\+?=' +
    '|insertAdjacentHTML|setHTMLUnsafe|createContextualFragment)');
  const offenders = [];
  srcFiles.forEach(f => {
    codeOnly(fs.readFileSync(f, 'utf8')).forEach((line, i) => {
      if (banned.test(line)) offenders.push(rel(f) + ':' + (i + 1));
    });
  });
  if (offenders.length) fail(offenders.join(', '));
  return 'clean';
});

/* ------------------------------------------------------------ themes */
global.self = {};
require(path.join(ROOT, 'src', 'wallpapers.js'));
require(path.join(ROOT, 'src', 'scenes.js'));
require(path.join(ROOT, 'src', 'theme-engine.js'));
const sandbox = global.self;
const NWT = sandbox.NWT;
const SCENES = sandbox.NWT_SCENES;
const settings = JSON.parse(JSON.stringify(NWT.DEFAULT_SETTINGS));
const C = NWT.color.contrastRatio;

const themeIds = Object.keys(NWT.PRESETS);

/* The painted wallpapers are the one place a fill is not a hex value the
 * contrast check can read, so they get their own gate: inline only, size
 * capped because the bytes ride in every injected stylesheet, and a recorded
 * contrast measurement that has to clear the same 7:1 floor as everything
 * else. tools/make-wallpaper.py is what produces the number. */
check('image wallpapers stay inline, small and legible', () => {
  const papers = sandbox.NWT_WALLPAPERS || {};
  const ids = Object.keys(papers);
  if (!ids.length) return 'none';
  const CAP_KB = 160;
  ids.forEach(id => {
    const w = papers[id];
    if (!/^data:image\/(jpeg|png|webp);base64,/.test(w.uri || '')) {
      fail(id + ' is not an inline data URI');
    }
    const kb = w.uri.length / 1024;
    if (kb > CAP_KB) fail(id + ' is ' + kb.toFixed(0) + ' KB (max ' + CAP_KB + ')');
    if (!(w.minRatio >= 7)) {
      fail(id + ' records a contrast of ' + w.minRatio + ', under the 7:1 floor');
    }
  });
  /* Every wallpaper named by a scene has to actually exist, or the hero layer
   * is silently dropped and the theme loses its background. */
  themeIds.forEach(id => {
    const theme = NWT.getTheme(settings, id);
    const p = NWT.buildPalette(theme);
    const u = {
      toneOf: (hex, t) => NWT.toneOf(hex, p.textPrimary, t),
      mix: NWT.color.mix,
      rgba: NWT.color.rgba
    };
    const scene = typeof SCENES[id] === 'function' ? SCENES[id](p, u) : SCENES[id];
    const named = scene && scene.hero && scene.hero.wallpaper;
    if (named && !papers[named]) fail(theme.name + ' names a missing wallpaper: ' + named);
  });
  return ids.length + ' wallpaper(s)';
});

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

/* Scenery must stay out of the reading column. A band taller than this sits
 * behind body copy, and a regular pattern there reads as ruled lines through
 * the text. Caught late because the review sheet used 230px cards, where a
 * 56vh band looks like a tasteful bottom texture. */
check('scenery stays clear of the reading column', () => {
  const CAP = { far: 34, near: 26 };
  const over = [];
  themeIds.forEach(id => {
    const theme = NWT.getTheme(settings, id);
    const p = NWT.buildPalette(theme);
    const u = {
      toneOf: (hex, t) => NWT.toneOf(hex, p.textPrimary, t),
      mix: NWT.color.mix,
      rgba: NWT.color.rgba
    };
    const scene = typeof SCENES[id] === 'function' ? SCENES[id](p, u) : SCENES[id];
    ['far', 'near'].forEach(which => {
      const layer = scene[which];
      if (!layer) return;
      const vh = parseInt(layer.height, 10);
      if (vh > CAP[which]) {
        over.push(theme.name + ' ' + which + ' is ' + vh + 'vh (max ' + CAP[which] + ')');
      }
    });
  });
  if (over.length) fail('\n    ' + over.join('\n    '));
  return 'far <= ' + CAP.far + 'vh, near <= ' + CAP.near + 'vh';
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
