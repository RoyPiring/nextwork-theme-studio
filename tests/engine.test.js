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
