/* Unit tests for the theming engine.
 *
 *   node --test tests/
 *
 * Uses node:test, which ships with Node 18, so this stays dependency-free like
 * the rest of the repo.
 *
 * tools/audit.js already checks the things that are true of the repository:
 * the manifest is valid, no file makes a network call, every theme clears the
 * contrast floor. These check the things that are true of the *code* - that a
 * function returns what it claims to, given an input.
 *
 * Every test here corresponds to a bug that actually reached a user.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const path = require('path');

const ROOT = path.join(__dirname, '..');
global.self = {};
require(path.join(ROOT, 'src', 'wallpapers.js'));
require(path.join(ROOT, 'src', 'scenes.js'));
require(path.join(ROOT, 'src', 'theme-engine.js'));

const NWT = global.self.NWT;
const SCENES = global.self.NWT_SCENES;
const PAPERS = global.self.NWT_WALLPAPERS;
const C = NWT.color.contrastRatio;

function settings(overrides) {
  return Object.assign(JSON.parse(JSON.stringify(NWT.DEFAULT_SETTINGS)), overrides || {});
}
const THEMES = Object.keys(NWT.PRESETS);

/* ---------------------------------------------------------------- output */

test('buildCSS is deterministic for the same settings', () => {
  /* The content script only rewrites the <style> element when the CSS differs.
   * If two calls with identical input produce different bytes, that guard can
   * never fire, and every storage change - every dial drag, every timer write -
   * swaps the whole stylesheet and forces a full restyle. */
  for (const id of THEMES) {
    const s = settings({ themeId: id });
    const a = NWT.buildCSS(s);
    const b = NWT.buildCSS(s);
    if (a !== b) {
      /* Report the difference, not the stylesheet. These are 70 KB each. */
      let i = 0;
      while (i < a.length && a[i] === b[i]) i++;
      assert.fail(id + ': two calls differ at byte ' + i +
                  ' | first: ' + JSON.stringify(a.slice(i - 20, i + 30)) +
                  ' | second: ' + JSON.stringify(b.slice(i - 20, i + 30)));
    }
  }
});

test('buildCSS does not scope keyframe selectors', () => {
  /* `html from` is not a valid keyframe selector, so the browser throws away
   * the whole block and the animation silently does nothing. */
  for (const id of THEMES) {
    const css = NWT.buildCSS(settings({ themeId: id }));
    const frames = css.match(/@(-\w+-)?keyframes[^{]*\{[\s\S]*?\n?\}/g) || [];
    for (const block of frames) {
      assert.ok(!/(html|:host)[^{}]*\b(from|to|\d+%)\s*\{/.test(block),
        id + ': a keyframe selector was prefixed');
    }
  }
});

test('buildCSS produces balanced braces and no empty declarations', () => {
  for (const id of THEMES) {
    for (const shadow of [false, true]) {
      const css = NWT.buildCSS(settings({ themeId: id }), null, { shadow });
      const open = (css.match(/\{/g) || []).length;
      const close = (css.match(/\}/g) || []).length;
      assert.strictEqual(open, close, id + (shadow ? ' shadow' : '') + ': unbalanced braces');
      assert.ok(!/:\s*;/.test(css), id + ': an empty declaration was emitted');
    }
  }
});

test('the shadow variant carries no document-only selectors', () => {
  for (const id of THEMES) {
    const css = NWT.buildCSS(settings({ themeId: id }), null, { shadow: true });
    assert.ok(!/\bhtml /.test(css), id + ': shadow copy contains html-scoped rules');
  }
});

/* --------------------------------------------------------------- contrast */

test('body text clears 7:1 on canvas and on every surface', () => {
  for (const id of THEMES) {
    const p = NWT.buildPalette(NWT.getTheme(settings(), id));
    assert.ok(C(p.textPrimary, p.canvas) >= 7, id + ': text on canvas');
    assert.ok(C(p.textPrimary, p.surface) >= 7, id + ': text on surface');
    assert.ok(C(p.textPrimary, p.surfaceAlt) >= 7, id + ': text on surfaceAlt');
  }
});

test('callout text is measured against the callout, not the page', () => {
  /* A light theme used to leave NextWork's dark navy panel in place and then
   * darken the heading with the rest of the page, so the heading vanished into
   * its own background. */
  for (const id of THEMES) {
    const p = NWT.buildPalette(NWT.getTheme(settings(), id));
    assert.ok(C(p.calloutText, p.callout) >= 7, id + ': callout heading');
    assert.ok(C(p.calloutTextSecondary, p.callout) >= 4.5, id + ': callout body');
  }
});

test('the loading skeleton is visible against the page', () => {
  /* It was aliased to surfaceAlt, which on a light theme is barely a step from
   * the canvas: about 1.07:1, which is invisible. A page that was loading
   * normally looked like a page that had failed to load at all. */
  for (const id of THEMES) {
    const p = NWT.buildPalette(NWT.getTheme(settings(), id));
    const r = C(p.skeleton, p.canvas);
    assert.ok(r >= 1.4, id + ': skeleton is ' + r.toFixed(2) + ':1 against the canvas');
  }
});

test('text still clears the floor on a translucent panel over its wallpaper', () => {
  /* Panels are translucent so the wallpaper reads through them as a wash
   * rather than being covered by a flat slab. That only holds if the worst
   * point of the wallpaper, seen through the panel, still leaves body text
   * readable. The measurement ignores the blur, which only helps. */
  function lin(c) { c /= 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); }
  function lum(hex) {
    const r = parseInt(hex.slice(1, 3), 16), g = parseInt(hex.slice(3, 5), 16), b = parseInt(hex.slice(5, 7), 16);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  }
  function greyAt(target) {
    let lo = 0, hi = 255;
    for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (lin(m) < target) lo = m; else hi = m; }
    const n = Math.round((lo + hi) / 2);
    return '#' + [n, n, n].map(x => x.toString(16).padStart(2, '0')).join('');
  }

  for (const id of THEMES) {
    const theme = NWT.getTheme(settings(), id);
    const p = NWT.buildPalette(theme);
    const paper = PAPERS[id];
    assert.ok(p.panelAlpha < 1, id + ': panels are opaque, so they will read as a slab');

    const lt = lum(p.textPrimary);
    /* The luminance of the worst point in this wallpaper, from its measurement. */
    const lw = theme.mode === 'light'
      ? paper.minRatio * (lt + 0.05) - 0.05
      : (lt + 0.05) / paper.minRatio - 0.05;
    const behind = greyAt(Math.max(0, Math.min(1, lw)));
    const composite = NWT.color.mix(behind, p.surface, p.panelAlpha);
    const r = C(p.textPrimary, composite);
    assert.ok(r >= 7, id + ': text on a panel over its wallpaper is ' + r.toFixed(2) + ':1');
  }
});

test('a panel has an edge that separates it from its own surface', () => {
  /* On a light theme the fill does no work: a translucent near-white panel on
   * a near-white sky separates by about 1.06, and making it opaque does not
   * help, because an opaque near-white panel on a near-white sky is still
   * near-white. The border is what tells a reader where the panel starts. */
  for (const id of THEMES) {
    const p = NWT.buildPalette(NWT.getTheme(settings(), id));
    const r = C(p.panelEdge, p.surface);
    assert.ok(r >= 1.45, id + ': panel edge is ' + r.toFixed(2) + ':1 against the panel');
  }
});

test('toneOf lands on the ratio it was asked for, in both directions', () => {
  const light = '#e8e9e9';
  const dark = '#152a1d';
  for (const target of [4.5, 7, 9.6]) {
    for (const text of [light, dark]) {
      const got = C(NWT.toneOf('#2b6f9c', text, target), text);
      assert.ok(Math.abs(got - target) < 0.35,
        'toneOf(' + target + ') against ' + text + ' produced ' + got.toFixed(2));
    }
  }
});

/* -------------------------------------------------------------- wallpapers */

test('every theme names a wallpaper that exists and is measured', () => {
  for (const id of THEMES) {
    const p = NWT.buildPalette(NWT.getTheme(settings(), id));
    const u = {
      toneOf: (hex, t) => NWT.toneOf(hex, p.textPrimary, t),
      mix: NWT.color.mix,
      rgba: NWT.color.rgba
    };
    const scene = typeof SCENES[id] === 'function' ? SCENES[id](p, u) : SCENES[id];
    const named = scene.hero && scene.hero.wallpaper;
    assert.ok(named, id + ': no wallpaper named');
    const paper = PAPERS[named];
    assert.ok(paper, id + ': names a missing wallpaper ' + named);
    assert.ok(paper.columnRatio >= 7, id + ': reading column below the floor');
    assert.ok(paper.minRatio >= 4.5, id + ': flanks below WCAG AA');
    assert.ok(/^data:image\/(webp|jpeg|png);base64,/.test(paper.uri), id + ': not inline');
  }
});

test('no two themes point at the same wallpaper', () => {
  const seen = new Map();
  for (const id of THEMES) {
    const p = NWT.buildPalette(NWT.getTheme(settings(), id));
    const u = {
      toneOf: (hex, t) => NWT.toneOf(hex, p.textPrimary, t),
      mix: NWT.color.mix,
      rgba: NWT.color.rgba
    };
    const scene = typeof SCENES[id] === 'function' ? SCENES[id](p, u) : SCENES[id];
    const w = scene.hero.wallpaper;
    assert.ok(!seen.has(w), w + ' is used by both ' + seen.get(w) + ' and ' + id);
    seen.set(w, id);
  }
});

/* --------------------------------------------------------------- settings */

test('migrate reports when it changed something', () => {
  /* migrate() only mutates a copy. If the caller cannot tell that it ran, the
   * schema never gets written back and the migration repeats on every load,
   * clearing the dials each time. */
  const stale = settings({ schema: 0, tuningOverrides: { concrete: { hue: 40 } } });
  const out = NWT.migrate(stale);
  assert.strictEqual(out.schema, NWT.SCHEMA);
  assert.deepStrictEqual(out.tuningOverrides, {});
  assert.ok(out.migrated, 'migrate did not report that it ran');

  const current = NWT.migrate(settings());
  assert.ok(!current.migrated, 'migrate reported a change it did not make');
});

test('a fork keeps mode, backdrop and the scene it came from', () => {
  /* Copying only the colours turned every light theme dark and removed its
   * scenery, with no way back short of deleting the fork. */
  for (const id of ['mountFuji', 'cherryBlossom', 'concrete']) {
    const base = NWT.getTheme(settings(), id);
    const fork = {
      name: base.name, mode: base.mode, backdrop: base.backdrop,
      sceneKey: base.sceneKey || id,
      colors: NWT.cloneTheme(base.colors), tuning: NWT.cloneTheme(base.tuning)
    };
    const s = settings({ themeId: 'custom-x', customThemes: { 'custom-x': fork } });
    const got = NWT.getTheme(s);
    assert.strictEqual(got.mode, base.mode, id + ': fork changed mode');
    assert.ok(SCENES[got.sceneKey || got.id], id + ': fork lost its scene');
  }
});

/* ------------------------------------------------------------- focus timer */

test('the focus timer is derived from timestamps, not a counter', () => {
  const now = Date.now();
  const running = { enabled: true, running: true, targetMin: 25, startedAt: now - 60000, accumulatedMs: 0 };
  const elapsed = NWT.focusElapsed(running);
  assert.ok(Math.abs(elapsed - 60000) < 1500, 'elapsed was ' + elapsed);
  assert.ok(Math.abs(NWT.focusRemaining(running) - (25 * 60000 - 60000)) < 1500);
});

test('the focus timer keeps counting past zero', () => {
  const now = Date.now();
  const over = { enabled: true, running: true, targetMin: 1, startedAt: now - 90000, accumulatedMs: 0 };
  assert.ok(NWT.focusRemaining(over) < 0, 'an overrun should read negative, not clamp to zero');
  assert.ok(NWT.formatDuration(NWT.focusRemaining(over)).length > 0);
});

test('placeholder text is readable on every theme', () => {
  /* A placeholder is the only thing telling a reader what a field is for, so
   * it is content, not decoration. The site's own stops were chosen against a
   * dark page and land near 2.5:1 on a light one; the composer on the home
   * page was the visible symptom. Nothing else can correct this, because
   * ::placeholder is a pseudo-element and no inline style reaches it. */
  Object.keys(NWT.PRESETS).forEach(id => {
    const p = NWT.buildPalette(NWT.getTheme({ themeId: id }, id));
    const onSurface = C(p.placeholder, p.surface);
    assert.ok(onSurface >= 4.5,
      id + ': placeholder is ' + onSurface.toFixed(2) + ':1 on its field');
    /* And still quieter than body text, or it is not a placeholder. */
    assert.ok(C(p.textPrimary, p.surface) > onSurface,
      id + ': placeholder should read quieter than body text');
  });
});

/* --------------------------------------------------------------- scenery */

function sceneFor(id) {
  const theme = NWT.getTheme(settings(), id);
  const p = NWT.buildPalette(theme);
  const u = {
    toneOf: (hex, t) => NWT.toneOf(hex, p.textPrimary, t),
    mix: NWT.color.mix,
    rgba: NWT.color.rgba
  };
  const def = SCENES[id];
  return { scene: typeof def === 'function' ? def(p, u) : def, palette: p };
}

test('the themes that drew smoke as a thin line no longer do', () => {
  /* Espresso and Dark Japandi drew vapour as six curved strokes at 1.8px.
   * At that width a long curve does not read as smoke, it reads as a loose
   * thread lying on top of the page.
   *
   * Only these two. A hairline is not wrong in itself: Hawaii Ocean draws its
   * gulls at the same width, and a gull is a line. What did not work was
   * drawing something with no edges as though it had one. */
  ['espresso', 'darkJapandi'].forEach(id => {
    const near = sceneFor(id).scene.near;
    const hairlines = (near.svg.match(/stroke-width='1\.8'/g) || []).length;
    assert.strictEqual(hairlines, 0,
      id + ' still draws ' + hairlines + ' hairline strokes');
  });
});

test('espresso carries smoke as a soft mass', () => {
  const near = sceneFor('espresso').scene.near;
  assert.ok(/feGaussianBlur/.test(near.svg),
    'smoke with a hard edge is not smoke');
  assert.ok((near.svg.match(/<ellipse/g) || []).length >= 8,
    'it should be built from overlapping puffs');
});

test('dark japandi has blue stars rather than warm smoke', () => {
  const near = sceneFor('darkJapandi').scene.near;
  const dots = (near.svg.match(/<circle/g) || []).length;
  assert.ok(dots >= 40, 'a night sky needs more than a handful of dots, got ' + dots);
  const stop = /stop-color='(#[0-9a-f]{6})'/i.exec(near.svg);
  assert.ok(stop, 'expected a colour on the star gradient');
  const [, hex] = stop;
  const r = parseInt(hex.slice(1, 3), 16), b = parseInt(hex.slice(5, 7), 16);
  assert.ok(b > r, 'the stars should read blue, got ' + hex);
});

test('the galactica fleet is black, smaller and twice the size of fleet', () => {
  const { scene } = sceneFor('galactica');
  const svg = scene.near.svg;
  const hull = /<g fill='(#[0-9a-f]{6})'/i.exec(svg);
  assert.ok(hull, 'expected a hull colour');
  /* Silhouettes against the nebula, not pale shapes in front of it. */
  const lum = ['1', '3', '5'].map(i => parseInt(hull[1].slice(+i, +i + 2), 16))
    .reduce((a, b) => a + b, 0) / 3;
  assert.ok(lum < 60, 'the hulls should be near black, got ' + hull[1]);

  /* Every ship is at least one shape, and a third of them are haulers which
   * are two, so counting hulls is the honest way to count ships. */
  const ships = (svg.match(/<(path|ellipse|rect)/g) || []).length;
  assert.ok(ships > 30, 'a fleet of 26 should draw more than 30 shapes, got ' + ships);

  /* Smaller: nothing in it should approach the sparse-layer size cap. */
  let widest = 0;
  (svg.match(/r[xy]?=['"]([\d.]+)/g) || []).forEach(m => {
    widest = Math.max(widest, parseFloat(m.split(/['"]/)[1]) * 2);
  });
  assert.ok(widest < scene.near.tile * 0.05,
    'the ships should be small, widest was ' + widest.toFixed(0));
});

/* ------------------------------------------------- custom CSS at injection */

/* The editor refuses a theme file that can reach the network, but storage
 * outlives the version that wrote it. A theme imported before that check
 * existed is still there, still selected, and still injected on every visit,
 * and nobody has to open the editor again for that to happen. So the question
 * is asked once more here, at the last point before the rules reach the page.
 */
function withCustomCSS(css) {
  return settings({
    themeId: 'stored',
    customThemes: {
      stored: {
        name: 'Stored',
        mode: 'dark',
        colors: NWT.cloneTheme(NWT.PRESETS.concrete.colors),
        tuning: NWT.cloneTheme(NWT.DEFAULT_TUNING),
        customCSS: css
      }
    }
  });
}

test('custom CSS that only sets properties is injected', () => {
  const css = NWT.buildCSS(withCustomCSS('.card { border-radius: 12px; }'));
  assert.match(css, /border-radius: 12px/, 'ordinary custom CSS was dropped');
});

test('custom CSS already in storage that reaches out is not injected', () => {
  /* This is the upgrade case: the theme was accepted by a version that did
   * not look, and the person never opened the editor again. */
  const reaching = [
    'body { background: url("https://example.com/x.png"); }',
    '@import "https://example.com/x.css";',
    'body { background: image("https://example.com/x.png"); }',
    '@font-face { font-family: x; src: src("https://example.com/x.woff2"); }',
    'body { background: cross-fade(url(a), url(b), 50%); }',
    'body { background: -webkit-image-set("x.png" 1x); }'
  ];
  reaching.forEach(bad => {
    const css = NWT.buildCSS(withCustomCSS(bad));
    assert.equal(css.indexOf('example.com'), -1, 'this was injected: ' + bad);
    assert.equal(css.indexOf('custom CSS'), -1, 'the block was written out anyway');
  });
});

test('custom CSS hiding a request behind an escape is not injected', () => {
  /* \75 is "u", so a browser reads this as url() the moment it parses it. */
  const hidden = [
    String.raw`body { background: \75 rl("https://example.com/x.png"); }`,
    String.raw`@\69 mport "https://example.com/x.css";`,
    String.raw`body { background: \000075rl("https://example.com/x.png"); }`,
    'body { background: ' + String.raw`\75` + '\r\nrl("https://example.com/x.png"); }'
  ];
  hidden.forEach(bad => {
    const css = NWT.buildCSS(withCustomCSS(bad));
    assert.equal(css.indexOf('example.com'), -1,
      'this was injected: ' + JSON.stringify(bad));
  });
});

test('the engine and the editor ask the same question', () => {
  /* One definition, so the two cannot drift apart and leave the injection
   * point accepting what the import refuses. */
  assert.equal(typeof NWT.cssReachesOut, 'function');
  assert.equal(NWT.cssReachesOut('body { color: red; }'), false);
  assert.equal(NWT.cssReachesOut('body { background: url(x); }'), true);
  assert.equal(NWT.cssReachesOut(String.raw`body { background: \75 rl(x); }`), true);
});

test('a stored colour that is not a hex value never reaches the stylesheet', () => {
  /* The accent pair is written into the stylesheet as typed rather than
   * through the tuner, so a value carrying a semicolon ends the declaration
   * and whatever follows becomes a rule of its own - a url() on the page
   * without touching the custom CSS the other checks look at. The editor
   * refuses these on import, but storage outlives the version that wrote it. */
  const keys = ['canvas', 'surface', 'surfaceAlt', 'border', 'textPrimary',
    'textSecondary', 'textMuted', 'accent', 'accentText'];
  const payloads = [
    '#101112; background: url(https://evil.example/x)',
    'url(https://evil.example/x)',
    '#101112;} body { background: url(https://evil.example/x) }',
    'red; background-image: url(https://evil.example/x)'
  ];

  keys.forEach(key => {
    payloads.forEach(payload => {
      const colors = NWT.cloneTheme(NWT.PRESETS.concrete.colors);
      colors[key] = payload;
      const s = settings({
        themeId: 'stored',
        customThemes: {
          stored: { name: 'S', mode: 'dark', colors: colors,
                    tuning: NWT.cloneTheme(NWT.DEFAULT_TUNING) }
        }
      });
      const css = NWT.buildCSS(s);
      /* Asked as "does this text appear at all", which is the actual
       * question. Written as a pattern it reads to a scanner like a host
       * check that forgot its anchors, and about a pattern matched against a
       * URL a scanner is right to say so. */
      assert.equal(css.indexOf('evil.example'), -1,
        key + ' carried a request into the stylesheet: ' + payload);
    });
  });
});

test('a theme with an unusable colour gets a whole palette of its own mode', () => {
  /* Filled in key by key from one fixed theme, a light theme took a
   * near-white text colour from the dark default and put it on a light
   * canvas: unreadable, on every visit. It is all or nothing now, and the
   * replacement is a set that was drawn together. */
  /* mode, the theme it was forked from, and the palette it should land on. */
  [['dark', 'graphite', 'concrete'],
   ['light', 'mountFuji', 'hawaiiMorning']].forEach(function (row) {
    const mode = row[0];

    /* textPrimary, not accent: this is the key where taking one colour from
     * a palette of the other mode is unreadable rather than merely wrong, and
     * where filling in key by key looks the same as taking the lot until you
     * corrupt this one. Written the way a version before the check would
     * have saved it. */
    const colors = NWT.cloneTheme(NWT.PRESETS[row[1]].colors);
    colors.textPrimary = 'rgb(20,20,20)';

    const s = settings({
      themeId: 'stored',
      customThemes: {
        stored: { name: 'S', mode: mode, colors: colors,
                  tuning: NWT.cloneTheme(NWT.DEFAULT_TUNING) }
      }
    });
    const p = NWT.buildPalette(NWT.getTheme(s));

    /* Readable, which filling in key by key from the other mode is not. */
    assert.ok(C(p.textPrimary, p.canvas) >= 7,
      mode + ': text on canvas is ' + C(p.textPrimary, p.canvas).toFixed(2) + ':1');
    assert.ok(C(p.textPrimary, p.surface) >= 7, mode + ': text on surface');

    /* And of this theme's own mode, not whichever one is the overall default. */
    assert.equal(p.canvas, NWT.PRESETS[row[2]].colors.canvas,
      mode + ' theme fell back to a palette of the wrong mode');
    assert.equal(p.textPrimary, NWT.PRESETS[row[2]].colors.textPrimary,
      mode + ' theme took its text colour from the wrong palette');
  });
});

test('an ordinary theme keeps its own colours, not the default ones', () => {
  /* Asserted as identity. Checked only for the shape of a hex value, this
   * passed just as well when every theme silently became the default one,
   * since that is a hex value too. */
  THEMES.forEach(id => {
    const p = NWT.buildPalette(NWT.getTheme(settings({ themeId: id })));
    assert.equal(p.accent, NWT.PRESETS[id].colors.accent, id + ' lost its accent');
    assert.equal(p.canvas, NWT.PRESETS[id].colors.canvas, id + ' lost its canvas');
  });
});

test('the over-state colour is readable on the pill in every theme', () => {
  /* The pill turns this colour when a session runs over, and it carries the
   * clock - body-weight text, so it is held to the same floor as body text.
   * The colour changed from warning to error and nothing checked the new one. */
  for (const id of THEMES) {
    const p = NWT.buildPalette(NWT.getTheme(settings(), id));
    const css = NWT.buildCSS(settings({ themeId: id }));
    const rule = css.match(/#nwt-focus\[data-state="over"\] \.nwt-focus-time \{ color: (#[0-9a-f]{6})/i);
    assert.ok(rule, id + ': the over-state clock has no colour of its own');
    const r = C(rule[1], p.surface);
    assert.ok(r >= 4.5, id + ': over-state clock is ' + r.toFixed(2) + ':1 on the pill');
  }
});
test('a YouTube link becomes the player, which is the part that can be framed', () => {
  /* A watch page refuses to appear in a frame. The player does not, and it is
   * at a different address - so pasting the link from the address bar, which
   * is the obvious thing to do, has to work. */
  const embed = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
  assert.equal(NWT.companionSrc('https://www.youtube.com/watch?v=dQw4w9WgXcQ'), embed);
  assert.equal(NWT.companionSrc('https://youtube.com/watch?v=dQw4w9WgXcQ'), embed);
  assert.equal(NWT.companionSrc('https://m.youtube.com/watch?v=dQw4w9WgXcQ'), embed);
  assert.equal(NWT.companionSrc('https://youtu.be/dQw4w9WgXcQ'), embed);
  assert.equal(NWT.companionSrc('https://www.youtube.com/shorts/dQw4w9WgXcQ'), embed);
});

test('a timestamp on the link is kept', () => {
  assert.equal(NWT.companionSrc('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=90'),
               'https://www.youtube.com/embed/dQw4w9WgXcQ?start=90');
});

test('anything else is passed through as it was given', () => {
  const url = 'https://discord.com/channels/1/2';
  assert.equal(NWT.companionSrc(url), url);
});

test('an address the pane cannot open is refused', () => {
  /* http would be blocked as mixed content on an https page and the pane
   * would sit there empty; the others would run in the page rather than in a
   * frame of their own. */
  ['', '   ', null, undefined, 'not a url', 'example.com',
   'http://example.com', 'javascript:alert(1)',
   'data:text/html,<b>x</b>', 'file:///etc/passwd'].forEach(bad => {
    assert.equal(NWT.companionSrc(bad), null, JSON.stringify(bad) + ' was accepted');
  });
});

test('a video id that is not one is not turned into a player', () => {
  /* Rather than building a player address around whatever was in v=. */
  const odd = 'https://www.youtube.com/watch?v=' + '../../evil';
  assert.ok(!String(NWT.companionSrc(odd)).includes('/embed/'),
    'a bad id was built into a player address');
});

test('a timestamp is kept in every form the share button writes', () => {
  /* Reading it as a plain number gave NaN for all but the first, and the
   * start time was then silently dropped - on exactly the links people copy,
   * since the share button writes seconds with a suffix. */
  const base = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=';
  const player = 'https://www.youtube.com/embed/dQw4w9WgXcQ?start=';
  assert.equal(NWT.companionSrc(base + '90'), player + '90');
  assert.equal(NWT.companionSrc(base + '90s'), player + '90');
  assert.equal(NWT.companionSrc(base + '1m30s'), player + '90');
  assert.equal(NWT.companionSrc(base + '1h2m3s'), player + '3723');
  assert.equal(NWT.companionSrc(base + '2m'), player + '120');
});

test('a timestamp that is not one is dropped rather than passed on', () => {
  const base = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=';
  ['', 'soon', '-30', '1x2', '9e9'].forEach(bad => {
    assert.equal(NWT.companionSrc(base + bad),
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      JSON.stringify(bad) + ' was carried into the player address');
  });
});

test('a player is known to need no permission; anything else is not', () => {
  assert.equal(NWT.framesFreely('https://www.youtube.com/embed/x'), true);
  ['https://www.youtube.com/watch?v=x', 'https://discord.com/channels/1/2',
   'https://evil.example/embed/', '', null].forEach(other => {
    assert.equal(NWT.framesFreely(other), false, JSON.stringify(other));
  });
});

test('the pane will not point back at the site it sits on', () => {
  /* The frame is sandboxed with allow-same-origin, which a cross-origin page
   * needs to stay signed in. Pointed at nextwork.ai it means the opposite: the
   * framed page then shares an origin with its parent, a sandbox does not
   * restrain a same-origin document, and the missing allow-top-navigation
   * stops restraining anything. */
  ['https://nextwork.ai/projects/1', 'https://www.nextwork.ai/',
   'https://app.nextwork.ai/x'].forEach(url => {
    assert.equal(NWT.companionSrc(url), null, url + ' was accepted');
  });
  /* A different site that merely ends in something similar is not the same. */
  assert.ok(NWT.companionSrc('https://nextwork.ai.example/x'));
});

test('a Discord channel link is kept as it was given', () => {
  /* A channel link means that channel. Quietly turning it into the widget
   * takes away what was asked for - the widget is a member list and an
   * invite, not the conversation - so the link is loaded as given and the
   * widget is offered separately when that link is refused. */
  const channel = 'https://discord.com/channels/1432837534118838355/1433926582124286082';
  assert.equal(NWT.companionSrc(channel), channel);
});


test('an upgrade keeps whatever was on screen', () => {
  /* Both the pane and the split were a single address before they were lists.
   * Dropping the old field on upgrade would empty the screen and read as the
   * feature having been removed. */
  const before = {
    schema: NWT.SCHEMA,
    split: { enabled: true, url: 'https://a.example/', width: 0.4 },
    companion: { enabled: true, url: 'https://b.example/', x: 0.1, y: 0.2, w: 400, h: 300 }
  };
  const after = NWT.migrate(JSON.parse(JSON.stringify(before)));

  assert.deepEqual(after.split.panels, [{ url: 'https://a.example/', size: 1, collapsed: false }]);
  assert.equal(after.split.url, '', 'the old field was left to be read twice');
  assert.equal(after.companion.panes.length, 1);
  assert.deepEqual(
    { url: after.companion.panes[0].url, w: after.companion.panes[0].w },
    { url: 'https://b.example/', w: 400 },
    'the pane came back without the size it had');
});

test('a list that already exists is not overwritten by the old field', () => {
  const s = NWT.migrate({
    schema: NWT.SCHEMA,
    split: { url: 'https://old.example/', panels: [{ url: 'https://new.example/' }] },
    companion: { url: 'https://old.example/', panes: [{ url: 'https://new.example/' }] }
  });
  assert.equal(s.split.panels.length, 1);
  assert.equal(s.split.panels[0].url, 'https://new.example/');
  assert.equal(s.companion.panes[0].url, 'https://new.example/');
});

test('shares that claim more than the column are scaled back, not honoured', () => {
  /* These come from storage and from dragging, and two panels that each think
   * they own most of the column would push the third out of it entirely. */
  const shares = NWT.panelShares([{ size: 0.9 }, { size: 0.9 }]);
  assert.deepEqual(shares, [0.5, 0.5]);
  const sum = shares.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1) < 1e-9, 'the shares add up to ' + sum);
});

test('the shares always add up to the whole column', () => {
  [[{}], [{}, {}], [{}, {}, {}], [{ size: 0.5 }, {}], [{ size: 0.2 }, { size: 0.3 }, {}],
   [{ collapsed: true }, {}, {}], [{ size: 2 }, {}]
  ].forEach(function (panels) {
    const sum = NWT.panelShares(panels).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(sum - 1) < 1e-9,
      JSON.stringify(panels) + ' shares add up to ' + sum);
  });
});

test('a column of nothing but folded panels asks for no space', () => {
  assert.deepEqual(NWT.panelShares([{ collapsed: true }, { collapsed: true }]), [0, 0]);
});

test('a doorway address is told apart from something to watch', () => {
  /* A YouTube link with a video becomes the player. YouTube itself is a front
   * page: it cannot be embedded, and embedding it would show a wall of
   * recommendations rather than the thing you meant. */
  ['https://www.youtube.com', 'https://www.youtube.com/', 'https://m.youtube.com/feed/subscriptions'
  ].forEach(u => assert.equal(NWT.needsLink(u), true, u));

  ['https://www.youtube.com/watch?v=dQw4w9WgXcQ', 'https://youtu.be/dQw4w9WgXcQ',
   'https://www.youtube.com/shorts/dQw4w9WgXcQ', 'https://www.youtube.com/embed/x'
  ].forEach(u => assert.equal(NWT.needsLink(u), false, u));
});

test('nothing else is treated as a doorway', () => {
  /* Discord is deliberately not in this list: there the address is the point,
   * it opens where you left off, and asking for a different link would be a
   * question with no answer. */
  ['https://discord.com/channels/@me', 'https://discord.com/channels/1/2',
   'https://example.com/', 'http://www.youtube.com', 'not a url', ''
  ].forEach(u => assert.equal(NWT.needsLink(u), false, JSON.stringify(u)));
});

/* ------------------------------------------------------- out of the way */

test('a hidden pane stops being painted rather than being emptied', () => {
  /* The attributes are set by the content script; these are the rules that
   * make them mean anything. A frame with no rule behind data-peek is a frame
   * still sitting in front of the page, and a rule that used display or
   * visibility would let the browser stop the video inside it. */
  const css = NWT.buildCSS(settings());
  assert.match(css, /\.nwt-companion\[data-peek="1"\][^}]*opacity:\s*0/);
  assert.match(css, /\.nwt-companion\[data-peek="1"\][^}]*pointer-events:\s*none/);
  assert.doesNotMatch(css, /\.nwt-companion\[data-peek="1"\][^}]*display:\s*none/);
  /* The column moves out of the window rather than out of the page, for the
   * same reason: a call in it has to survive being hidden. */
  assert.match(css, /#nwt-split\[data-peek="1"\][^}]*transform:\s*translateX\(100%\)/);
  assert.doesNotMatch(css, /#nwt-split\[data-peek="1"\][^}]*display:\s*none/);
});

test('the band along the top gives back width and takes height', () => {
  const css = NWT.buildCSS(settings());
  assert.match(css, /html\.nwt-split-on\.nwt-split-top[^}]*width:\s*auto/);
  assert.match(css, /html\.nwt-split-on\.nwt-split-top[^}]*margin-top:\s*var\(--nwt-split-w/);
  /* Panels that stacked now sit side by side, and the handle between two of
   * them stands up instead of lying down. */
  assert.match(css, /#nwt-split\[data-side="top"\][^}]*flex-direction:\s*row/);
  assert.match(css, /#nwt-split\[data-side="top"\] \.nwt-panel-grip[^}]*col-resize/);
  assert.match(css, /#nwt-split\[data-side="top"\] \.nwt-split-grip[^}]*row-resize/);
  assert.match(css, /#nwt-split\[data-side="top"\]\[data-peek="1"\][^}]*translateY\(-100%\)/);
});

test('the dock stays on top of what it opens', () => {
  /* It is the way back to everything else, so nothing this draws may cover
   * it - and it has to outrank both the panes and the column. */
  const css = NWT.buildCSS(settings());
  const zOf = (re) => Number((css.match(re) || [])[1]);
  const dock = zOf(/#nwt-dock \{[^}]*z-index:\s*(\d+)/);
  assert.ok(dock > zOf(/\.nwt-companion \{[^}]*z-index:\s*(\d+)/), 'a pane covers the dock');
  assert.ok(dock > zOf(/#nwt-split \{[^}]*z-index:\s*(\d+)/), 'the column covers the dock');
});

/* --------------------------------------------------- the end of a session */

test('the alarm is long enough to walk back to', () => {
  /* Two sine tones over half a second is a notification: away from the screen
   * when it lands - which is what a focus timer is for - and you never know
   * it happened. */
  assert.ok(NWT.alarmSeconds() >= 10,
    'the alarm is ' + NWT.alarmSeconds().toFixed(1) + 's, which is a beep');
});

test('it rings more than once, and gets firmer as it goes', () => {
  const plan = NWT.alarmPlan();
  const levels = [...new Set(plan.map(n => n.level))];
  assert.ok(levels.length > 1, 'every ring is the same volume');
  assert.ok(levels[0] < levels[levels.length - 1],
    'it opens at full volume, which is startling rather than telling');
  /* Rings, not one long run of notes: there are gaps between them. */
  const gaps = plan.slice(1).map((n, i) => n.at - plan[i].at);
  assert.ok(Math.max(...gaps) > Math.min(...gaps) * 4,
    'the notes run together rather than ringing in groups');
});

test('every note is struck, not sounded', () => {
  /* A bell has partials that are not whole multiples of its fundamental, and
   * that is what stops it reading as electronic. One note per strike is a
   * beep however long you leave it. */
  const plan = NWT.alarmPlan();
  assert.ok(plan.length >= 12, 'only ' + plan.length + ' notes in the whole alarm');
  assert.ok(plan.every(n => n.life > 1),
    'the notes are cut off rather than left to die away');
  assert.ok([...new Set(plan.map(n => n.hz))].length > 1, 'it is one note over and over');
});
