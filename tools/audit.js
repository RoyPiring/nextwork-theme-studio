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
const { codeOnly, duplicateDeclarations, unusedDeclarations, isText,
        importsOnlyLocalFiles } = require('./source.js');

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

/* Chromium refuses to load an unpacked extension whose root contains a name
 * starting with an underscore - those are reserved. The repo root is what
 * CONTRIBUTING tells contributors to load, and the tools write output into it,
 * so a generated directory could quietly make the whole extension unloadable.
 * The error names the directory but not the cause. */
check('no reserved underscore names at the root', () => {
  const bad = fs.readdirSync(ROOT).filter(n => n.charAt(0) === '_');
  if (bad.length) {
    fail(bad.join(', ') + ' - Chromium reserves names starting with "_", so ' +
         'the root cannot be loaded unpacked while these exist');
  }
  return 'clean';
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
  /* storage only. activeTab was requested for a while and never used: the
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
    /* Both hosts are listed explicitly. `*.host` is documented to cover the
     * bare host as well, but relying on that put the whole content script on a
     * spec detail nobody can check from the extensions page. */
    .filter(m => !/^https:\/\/(\*\.)?nextwork\.ai\/\*$/.test(m));
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

/* A source file has to be readable as text, and parsing is not enough to say
 * it is: a NUL byte inside a comment or a string parses perfectly well, and
 * git then reports the whole file as "Binary files differ". A file that cannot
 * be shown in a diff cannot be reviewed, which is the one thing every other
 * check here depends on. */
check('every source file is text', () => {
  const bad = srcFiles.concat(toolFiles)
    .filter(f => !isText(fs.readFileSync(f)))
    .map(f => rel(f));
  if (bad.length) {
    fail(bad.join(', ') + ' - a diff shows this as binary, so it cannot be read');
  }
  return srcFiles.length + toolFiles.length + ' files';
});

/* Nothing declared and never called.
 *
 * Thirty-six of these had collected in the scenery: generators from before
 * every theme carried a picture, and the helpers only they used. None of it
 * ran, and all of it shipped to everyone who installed the extension.
 *
 * This is also what makes removing one safe to check. A function that survives
 * while calling something deleted is unreachable by definition, and would be
 * reported here rather than waiting to throw. */
check('no function is declared and never named again', () => {
  const idle = [];
  srcFiles.concat(toolFiles).forEach(f => {
    unusedDeclarations(fs.readFileSync(f, 'utf8')).forEach(d => {
      idle.push(rel(f) + ':' + d.line + ' ' + d.name);
    });
  });
  if (idle.length) {
    fail('\n    ' + idle.join('\n    ') +
         '\n    (each file is read on its own, so a name reached from' +
         '\n     another file by anything but an object needs a look)');
  }
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
       * Chromium, which is the one exception. */
      if (importsOnlyLocalFiles(line)) return;
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
    if (!/^data:image\/webp;base64,/.test(w.thumb || '')) {
      fail(id + ' has no thumbnail for the README gallery');
    }
    if (w.thumb.length / 1024 > 12) {
      fail(id + ' thumbnail is ' + (w.thumb.length / 1024).toFixed(0) + ' KB (max 12)');
    }
    /* Two floors. The reading column is a strip down the middle of the
     * viewport and gets the project's 7:1; everywhere else has to clear WCAG
     * AA so text that strays outside the column is still readable. A single
     * global figure would force the whole picture down to the stricter one,
     * which is what reduced the first version of this to a smudge. */
    if (!(w.columnRatio >= 7)) {
      fail(id + ' reading column is ' + w.columnRatio + ':1, under the 7:1 floor');
    }
    if (!(w.minRatio >= 4.5)) {
      fail(id + ' is ' + w.minRatio + ':1 outside the column, under WCAG AA');
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
      /* A sparse layer is allowed to cover the viewport, because the thing the
       * height cap protects against is a repeating pattern sitting behind a
       * paragraph. A dozen small shapes at low opacity is not that. What has
       * to be bounded instead is how much of the tile they actually cover and
       * how big any one of them gets. */
      if (layer.sparse) {
        const body = layer.svg;
        const shapes = (body.match(/<(circle|rect|ellipse|path)/g) || []).length;
        if (shapes > 140) {
          over.push(theme.name + ' ' + which + ' draws ' + shapes +
                    ' shapes (max 140 for a sparse layer)');
        }
        let widest = 0;
        (body.match(/r=['"]([\d.]+)/g) || []).forEach(m => {
          widest = Math.max(widest, parseFloat(m.split(/['"]/)[1]) * 2);
        });
        (body.match(/rx=['"]([\d.]+)/g) || []).forEach(m => {
          widest = Math.max(widest, parseFloat(m.split(/['"]/)[1]) * 2);
        });
        if (widest > layer.tile * 0.16) {
          over.push(theme.name + ' ' + which + ' has a ' + widest.toFixed(0) +
                    'px shape (max ' + (layer.tile * 0.16).toFixed(0) + ' for a sparse layer)');
        }
        return;
      }
      const vh = parseInt(layer.height, 10);
      if (vh > CAP[which]) {
        over.push(theme.name + ' ' + which + ' is ' + vh + 'vh (max ' + CAP[which] + ')');
      }
    });
  });
  if (over.length) fail('\n    ' + over.join('\n    '));
  return 'bands far <= ' + CAP.far + 'vh, near <= ' + CAP.near + 'vh; sparse layers by coverage';
});

check('both stylesheet variants build for every theme', () => {
  themeIds.forEach(id => {
    const theme = NWT.getTheme(settings, id);
    const doc = NWT.buildCSS(settings, theme);
    const shadow = NWT.buildCSS(settings, theme, { shadow: true });
    if (!doc.length || !shadow.length) fail(id + ' produced an empty stylesheet');
    /* The old check only asserted the sheet was non-empty, which is why the
     * scoping pass could prefix keyframe selectors - producing `html from`,
     * which browsers discard - and every parallax band sat still for four
     * releases while this check stayed green. */
    if (/@(-\w+-)?keyframes[^{]*\{[\s\S]*?(html|:host)[^{}]*(from|to|\d+%)\s*\{/.test(doc)) {
      fail(id + ': a keyframe selector got scoped, so the animation is dead');
    }
    if ((doc.match(/\{/g) || []).length !== (doc.match(/\}/g) || []).length) {
      fail(id + ': unbalanced braces in the generated stylesheet');
    }
    if (/background-(image|size|position|repeat):\s*;/.test(doc)) {
      fail(id + ': an empty background layer list was emitted');
    }
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
    /* The callout is a panel with its own background, so its text is measured
     * against the panel and not against the page. Light themes used to leave
     * NextWork's dark navy in place and then darken the heading with the rest
     * of the page, which put dark text on a near-black slab. */
    checks.push(['callout text', C(p.calloutText, p.callout), 7]);
    /* Not a text ratio. A skeleton just has to read as a shape, and at 1.07:1
     * it did not, so a loading page looked like an empty one. */
    checks.push(['loading skeleton', C(p.skeleton, p.canvas), 1.4]);
    /* Panels are translucent so they blend with the wallpaper. On a light
     * theme that leaves the border doing all the work of saying where the
     * panel is. */
    checks.push(['panel edge', C(p.panelEdge, p.surface), 1.45]);
    checks.push(['callout secondary text', C(p.calloutTextSecondary, p.callout), 4.5]);
    (scene.areaColors || []).forEach(c => {
      checks.push(['scenery ' + c, C(p.textPrimary, c), 7]);
    });
    /* A sparse motif is a handful of small shapes spread over the viewport,
     * not a fill the eye reads a paragraph against, so it takes the AA floor
     * rather than the AAA one. Holding it to 7:1 made every motif invisible on
     * the dark themes, which is the same trap the wallpaper flanks were in. */
    (scene.sparseColors || []).forEach(c => {
      checks.push(['motif ' + c, C(p.textPrimary, c), 4.5]);
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

/* ------------------------------------------------------- shipped code ---
 * Two properties a linter would give, without becoming the project's first
 * dependency. See docs/maintenance/DEVELOPMENT.md for why that trade was made
 * the way it was.
 */
check('shipped code runs in strict mode', () => {
  /* Sloppy mode turns a mistyped assignment into a new global rather than an
   * error, which is the one class of typo that survives every other check
   * here: it parses, it runs, and it silently does nothing useful. */
  /* The directive is the first statement of the file. Nothing else counts.
   *
   * Earlier versions of this tried to be accommodating and were wrong three
   * times over, each in the same way: a regular expression cannot tell where
   * one scope ends and the next begins, so every allowance it made left a
   * shape that passed while running sloppy code. A wrapper proves nothing,
   * because a sloppy function leaks a global exactly as top level does. A
   * directive further down proves nothing, because it only takes effect in
   * the prologue. A wrapper that closes before the end of the file proves
   * nothing about what follows it.
   *
   * So the allowances are gone, and every shipped file now says it at the
   * top. That makes the whole file strict whatever is inside it, and makes
   * this check a single unambiguous question. */
  function isStrict(body) {
    const code = codeOnly(body).map(l => l.trim()).filter(Boolean);
    if (!code.length) return true;                 /* nothing to leak */
    /* The semicolon is required. Without it the next line can continue the
     * expression - `'use strict'` followed by `+function(){}` is one additive
     * expression and not a directive at all - and the file stays sloppy. */
    return /^['"]use strict['"]\s*;$/.test(code[0]);
  }

  const loose = srcFiles.filter(f => !isStrict(fs.readFileSync(f, 'utf8')));
  if (loose.length) {
    fail(loose.map(rel).join(', ') +
         ' - add a \'use strict\' directive, or a typo becomes a global');
  }
  return srcFiles.length + ' files';
});

check('no function is declared twice in the same scope', () => {
  /* A second declaration of the same name silently replaces the first, and
   * every call then reaches whichever came last regardless of what it was
   * written against. Two pairs had accumulated this way, each with different
   * arguments; nothing was broken because the callers happened to match the
   * survivor, which is luck rather than design. */
  const clashes = [];
  srcFiles.concat(toolFiles).forEach(f => {
    duplicateDeclarations(fs.readFileSync(f, 'utf8')).forEach(d => {
      clashes.push(rel(f) + ': ' + d.name +
        ' at lines ' + d.first + ' and ' + d.second);
    });
  });
  if (clashes.length) fail('\n    ' + clashes.join('\n    '));
  return srcFiles.length + toolFiles.length + ' files';
});

check('no debugging left in shipped code', () => {
  /* console.log and debugger are for working on something, not for shipping
   * it. Real reporting in this codebase uses console.warn or console.error. */
  const offenders = [];
  srcFiles.forEach(f => {
    codeOnly(fs.readFileSync(f, 'utf8')).forEach((line, i) => {
      /* debugger only as a statement of its own. The bare word appears in
       * ordinary prose and inside strings, and flagging those would make this
       * something to work around rather than something to keep. */
      if (/\bconsole\s*\.\s*log\s*\(/.test(line) || /^\s*debugger\s*;?\s*$/.test(line)) {
        offenders.push(rel(f) + ':' + (i + 1));
      }
    });
  });
  if (offenders.length) fail(offenders.join(', '));
  return 'clean';
});

/* ------------------------------------------------- the workflow itself ---
 * The branch rule requires one check, named `audit`, and that job passes only
 * if every other job passed. The whole arrangement rests on `audit` listing
 * all of them, which until now was guaranteed by a comment. A job added later
 * and left out of that list is built, run, and not required by anything.
 *
 * Parsed by hand rather than with a YAML library, because the project has no
 * dependencies. Job names sit at two spaces under `jobs:` and nothing else in
 * the file does, so that is what this looks for. */
function workflowFile() {
  const p = path.join(ROOT, '.github', 'workflows', 'ci.yml');
  if (!fs.existsSync(p)) fail('.github/workflows/ci.yml is missing');
  return fs.readFileSync(p, 'utf8').split(/\r?\n/);
}

check('every CI job is required by the gate', () => {
  const lines = workflowFile();
  const jobsAt = lines.findIndex(l => /^jobs:\s*$/.test(l));
  if (jobsAt < 0) fail('ci.yml has no jobs: block');

  const jobs = [];
  for (let i = jobsAt + 1; i < lines.length; i++) {
    /* A trailing comment is legal after a job name, and a job that carried
     * one used to slip past this and out of the gate entirely. */
    const m = /^ {2}([A-Za-z_][\w-]*):[ 	]*(?:#.*)?$/.exec(lines[i]);
    if (m) jobs.push({ name: m[1], line: i });
  }
  if (jobs.length < 2) fail('expected more than one job, found ' + jobs.length);

  const gate = jobs.find(j => j.name === 'audit');
  if (!gate) fail('there is no job named `audit`, which is the required check');

  /* The gate's own needs list, read from its block only. */
  const end = jobs.filter(j => j.line > gate.line)
                  .reduce((a, j) => Math.min(a, j.line), lines.length);
  let needs = null;
  for (let i = gate.line + 1; i < end; i++) {
    const m = /^ {4}needs:[ 	]*\[([^\]]*)\][ 	]*(?:#.*)?$/.exec(lines[i]);
    if (m) needs = m[1].split(',').map(s => s.trim()).filter(Boolean);
  }
  if (!needs) fail('the `audit` job has no single-line needs: [...] list');

  const missing = jobs.map(j => j.name)
                      .filter(n => n !== 'audit' && needs.indexOf(n) === -1);
  if (missing.length) {
    fail('these jobs run but nothing requires them, so a failure in any of ' +
         'them would not block a merge: ' + missing.join(', ') +
         '\n    Add them to `needs:` on the `audit` job.');
  }

  /* Listing a job is not enough: its result has to be looked at. */
  const body = lines.slice(gate.line, end).join('\n');
  const unread = needs.filter(n => body.indexOf('needs.' + n + '.result') === -1);
  if (unread.length) {
    fail('the `audit` job waits for these but never reads their result: ' +
         unread.join(', '));
  }
  return needs.length + ' jobs gated';
});

check('every action is pinned to a commit SHA', () => {
  /* A tag can be moved to point at different code. A SHA cannot. */
  const loose = [];
  fs.readdirSync(path.join(ROOT, '.github', 'workflows'))
    .filter(f => /\.ya?ml$/.test(f))
    .forEach(function (f) {
      const text = fs.readFileSync(path.join(ROOT, '.github', 'workflows', f), 'utf8');
      text.split(/\r?\n/).forEach(function (line, i) {
        const m = /^\s*(?:-\s*)?uses:\s*(\S+)/.exec(line);
        if (!m) return;
        const ref = m[1].split('@')[1];
        if (!ref || !/^[0-9a-f]{40}$/.test(ref)) {
          loose.push(f + ':' + (i + 1) + ' ' + m[1]);
        }
      });
    });
  if (loose.length) fail('\n    ' + loose.join('\n    '));
  return 'all pinned';
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
