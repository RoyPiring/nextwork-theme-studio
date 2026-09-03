/* Tests for the theme editor.
 *
 * Two things here matter more than the rest.
 *
 * An imported theme is a file from someone else, and whatever it carries ends
 * up in the stylesheet injected into a site you are signed into. CSS is not
 * inert there: a url() in a custom rule is a live request, and an attribute
 * selector plus a background image is a known way to read a form field out one
 * character at a time. The import is an allowlist, and these tests are what say
 * it still is.
 *
 * And editing a preset has to fork it rather than write to it, carrying the
 * fields that are not colours. Without mode a light theme forks to dark; without
 * sceneKey the fork names no scene and the wallpaper disappears.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadPage } = require('./harness.js');

function openEditor(settings, options) {
  const page = loadPage(Object.assign({
    page: 'src/options.html',
    scripts: ['src/options.js'],
    settings: settings || {}
  }, options || {}));
  page.flush();
  return page;
}

const GOOD_COLORS = {
  canvas: '#101112', surface: '#1a1b1c', surfaceAlt: '#222324',
  border: '#3c3e40', textPrimary: '#e8e9e9', textSecondary: '#b9bbbc',
  textMuted: '#8a8c8d', accent: '#7fb2ff', accentText: '#0b1220'
};

function themeFile(overrides) {
  return JSON.stringify({
    kind: 'nextwork-theme',
    theme: Object.assign({ name: 'Imported', colors: GOOD_COLORS }, overrides || {})
  });
}

function customThemes(page) {
  return page.stored.customThemes || {};
}

function onlyCustom(page) {
  const all = customThemes(page);
  const keys = Object.keys(all);
  assert.equal(keys.length, 1, 'expected one custom theme, found ' + keys.length);
  return all[keys[0]];
}

/* ------------------------------------------------------------- importing */

test('a theme file with ordinary colours is imported', async () => {
  const p = openEditor({});
  await p.chooseFile('file-input', themeFile());

  const theme = onlyCustom(p);
  assert.equal(theme.name, 'Imported');
  assert.equal(theme.colors.accent, '#7fb2ff');
  assert.match(p.el('toast').textContent, /Imported/);
});

test('custom CSS that can reach the network is refused', async () => {
  /* Each of these makes a request from a page you are signed into, which is
   * how a stylesheet becomes a way to send data somewhere. */
  const reaching = [
    'body { background: url(https://example.com/x.png); }',
    'body { background: URL("x"); }',
    'body { background: url\t(x); }',
    '@import "https://example.com/x.css";',
    'body { width: expression(alert(1)); }',
    'body { background: image-set("x.png" 1x); }'
  ];

  for (const css of reaching) {
    const p = openEditor({});
    await p.chooseFile('file-input', themeFile({ customCSS: css }));
    assert.deepEqual(customThemes(p), {},
      'this was imported: ' + css);
    assert.match(p.el('toast').textContent, /Cannot import|external resource/i,
      'no reason was given for refusing: ' + css);
  }
});

test('custom CSS that only sets properties is kept', async () => {
  const p = openEditor({});
  const css = '.card { border-radius: 12px; box-shadow: 0 1px 2px #0008; }';
  await p.chooseFile('file-input', themeFile({ customCSS: css }));
  assert.equal(onlyCustom(p).customCSS, css);
});

test('a colour that is not a plain hex value is refused', async () => {
  const bad = [
    'red',
    '#fff',
    '#12345g',
    'rgb(1,2,3)',
    'var(--x)',
    '#101112; background: url(x)'
  ];
  for (const value of bad) {
    const p = openEditor({});
    const colors = Object.assign({}, GOOD_COLORS, { canvas: value });
    await p.chooseFile('file-input', themeFile({ colors }));
    assert.deepEqual(customThemes(p), {}, 'accepted the colour ' + JSON.stringify(value));
    assert.match(p.el('toast').textContent, /canvas/,
      'the refusal did not name the colour at fault');
  }
});

test('a theme missing a colour is refused rather than half-built', async () => {
  const p = openEditor({});
  const colors = Object.assign({}, GOOD_COLORS);
  delete colors.accent;
  await p.chooseFile('file-input', themeFile({ colors }));
  assert.deepEqual(customThemes(p), {});
});

test('a scene this build does not have is dropped, not carried', async () => {
  /* An unknown name would leave the theme pointing at no scenery at all. */
  const p = openEditor({});
  await p.chooseFile('file-input', themeFile({ sceneKey: 'not-a-scene' }));
  assert.equal(onlyCustom(p).sceneKey, undefined);

  const q = openEditor({});
  const real = Object.keys(q.sandbox.NWT_SCENES || {})[0];
  await q.chooseFile('file-input', themeFile({ sceneKey: real }));
  assert.equal(onlyCustom(q).sceneKey, real, 'a real scene was dropped');
});

test('a mode other than light is read as dark', async () => {
  const p = openEditor({});
  await p.chooseFile('file-input', themeFile({ mode: 'neon' }));
  assert.equal(onlyCustom(p).mode, 'dark');

  const q = openEditor({});
  await q.chooseFile('file-input', themeFile({ mode: 'light' }));
  assert.equal(onlyCustom(q).mode, 'light');
});

test('long text and out-of-range dials are brought back into range', async () => {
  const p = openEditor({});
  await p.chooseFile('file-input', themeFile({
    name: 'n'.repeat(200),
    note: 'x'.repeat(500),
    customCSS: '/*' + 'c'.repeat(30000) + '*/',
    tuning: { hue: 9000, saturation: -9000, contrast: 'nonsense', brightness: 5 }
  }));

  const theme = onlyCustom(p);
  assert.equal(theme.name.length, 60);
  assert.equal(theme.note.length, 200);
  assert.equal(theme.customCSS.length, 20000);
  assert.equal(theme.tuning.hue, 100);
  assert.equal(theme.tuning.saturation, -100);
  assert.equal(theme.tuning.contrast, undefined, 'a value that is not a number was kept');
  assert.equal(theme.tuning.brightness, 5);
});

test('a file that is not an export of this extension is refused', async () => {
  for (const text of ['{"kind":"something-else"}', '{}', '[]', '"a string"', 'null']) {
    const p = openEditor({});
    await p.chooseFile('file-input', text);
    assert.deepEqual(customThemes(p), {}, 'accepted ' + text);
    assert.match(p.el('toast').textContent, /not a Theme Studio export/);
  }
});

test('a file that is not JSON is refused without throwing', async () => {
  const p = openEditor({});
  await p.chooseFile('file-input', 'this is not json at all');
  assert.deepEqual(customThemes(p), {});
  assert.match(p.el('toast').textContent, /not valid JSON/);
});

test('restoring a backup cleans every theme in it', async () => {
  const p = openEditor({});
  await p.chooseFile('file-input', JSON.stringify({
    kind: 'nextwork-theme-settings',
    settings: {
      themeId: 'custom-a',
      customThemes: {
        'custom-a': { name: 'A', colors: GOOD_COLORS, customCSS: '.a { color: red; }' },
        'custom-b': { name: 'B', colors: GOOD_COLORS }
      }
    }
  }));

  assert.equal(Object.keys(customThemes(p)).length, 2);
  assert.equal(customThemes(p)['custom-a'].customCSS, '.a { color: red; }');
});

test('one bad theme stops the whole restore, rather than importing the rest', async () => {
  /* Restoring half a backup would leave the settings pointing at a theme that
   * was not written. */
  const p = openEditor({ themeId: 'concrete' });
  await p.chooseFile('file-input', JSON.stringify({
    kind: 'nextwork-theme-settings',
    settings: {
      themeId: 'custom-a',
      customThemes: {
        'custom-a': { name: 'A', colors: GOOD_COLORS },
        'custom-b': { name: 'B', colors: GOOD_COLORS,
                      customCSS: 'body { background: url(https://example.com/x); }' }
      }
    }
  }));

  assert.deepEqual(customThemes(p), {}, 'part of the backup was restored');
  assert.equal(p.stored.themeId, 'concrete', 'the settings moved anyway');
  assert.match(p.el('toast').textContent, /Cannot restore/);
});

/* -------------------------------------------------------------- exporting */

test('an export carries the theme, and comes back through import', async () => {
  const p = openEditor({ themeId: 'hawaiiOcean' });
  p.fire('export-theme', 'click');

  assert.equal(p.saved.length, 1, 'nothing was handed over to save');
  const payload = JSON.parse(p.saved[0].text);
  assert.equal(payload.kind, 'nextwork-theme');
  assert.ok(payload.theme.colors.canvas, 'the export has no colours');

  const q = openEditor({});
  await q.chooseFile('file-input', JSON.stringify(payload));
  assert.equal(Object.keys(customThemes(q)).length, 1,
    'this extension cannot read its own export');
});

/* ---------------------------------------------------------------- editing */

test('editing a preset forks it instead of writing to it', () => {
  const p = openEditor({ themeId: 'concrete' });
  p.set('theme-name', 'My own');
  p.fire('theme-name', 'change');

  assert.equal(Object.keys(customThemes(p)).length, 1, 'no fork was made');
  assert.notEqual(p.stored.themeId, 'concrete', 'the editor stayed on the preset');
  assert.match(p.el('toast').textContent, /Forked/);
});

test('a fork keeps the fields that are not colours', () => {
  /* Without mode a light theme forks to dark and every !light branch fires
   * against a light palette; without sceneKey the fork names no scene. */
  const p = openEditor({ themeId: 'hawaiiMorning' });
  const preset = p.sandbox.NWT.PRESETS.hawaiiMorning;

  p.set('theme-name', 'Morning, mine');
  p.fire('theme-name', 'change');

  const fork = onlyCustom(p);
  assert.equal(fork.mode, preset.mode, 'the fork changed mode');
  /* Asserted on its own. Written as "fork.sceneKey || themeId" this also
   * passed when the scene was missing and the editor had failed to move off
   * the preset - two faults cancelling to look like success. */
  assert.equal(fork.sceneKey, 'hawaiiMorning', 'the fork names no scene');
  assert.notEqual(p.stored.themeId, 'hawaiiMorning', 'the editor stayed on the preset');
  assert.deepEqual(fork.colors, preset.colors, 'the colours were not carried');
});

test('editing a theme you already own does not fork it again', () => {
  const p = openEditor({ themeId: 'concrete' });
  p.set('theme-name', 'First edit');
  p.fire('theme-name', 'change');
  const afterFirst = Object.keys(customThemes(p));

  p.set('theme-name', 'Second edit');
  p.fire('theme-name', 'change');

  assert.deepEqual(Object.keys(customThemes(p)), afterFirst,
    'a second edit forked again');
  assert.equal(customThemes(p)[afterFirst[0]].name, 'Second edit');
});

test('a new theme is a copy of the one you are on', () => {
  const p = openEditor({ themeId: 'cherryBlossom' });
  p.fire('new-theme', 'click');

  const copy = onlyCustom(p);
  const preset = p.sandbox.NWT.PRESETS.cherryBlossom;
  assert.match(copy.name, /copy$/);
  assert.equal(copy.mode, preset.mode);
  assert.deepEqual(copy.colors, preset.colors);
  assert.equal(p.stored.themeId, Object.keys(customThemes(p))[0]);
});

test('deleting asks first, and declining keeps the theme', () => {
  const p = openEditor({
    themeId: 'custom-x',
    customThemes: { 'custom-x': { name: 'Mine', colors: GOOD_COLORS } }
  }, { confirm: false });

  p.fire('delete-theme', 'click');
  assert.ok(customThemes(p)['custom-x'], 'it was deleted without an answer');
  assert.equal(p.stored.themeId, 'custom-x');
});

test('deleting takes the theme and its dials, and moves you somewhere real', () => {
  const p = openEditor({
    themeId: 'custom-x',
    customThemes: { 'custom-x': { name: 'Mine', colors: GOOD_COLORS } },
    tuningOverrides: { 'custom-x': { hue: 20 }, concrete: { hue: -5 } }
  });

  p.fire('delete-theme', 'click');
  assert.equal(customThemes(p)['custom-x'], undefined);
  assert.equal((p.stored.tuningOverrides || {})['custom-x'], undefined,
    'the deleted theme left its dials behind');
  assert.deepEqual(p.stored.tuningOverrides.concrete, { hue: -5 },
    'another theme lost its dials');
  assert.equal(p.stored.themeId, 'concrete');
});

test('a preset cannot be deleted, and is not even asked about', () => {
  /* Compared as a whole. Deleting a preset happens to remove nothing, so a
   * test that only looked at the themes would pass with the guard taken out,
   * while the editor asked whether to delete something it cannot delete and
   * then wrote a settings object anyway. */
  const p = openEditor({ themeId: 'concrete' });
  const before = JSON.stringify(p.stored);

  p.fire('delete-theme', 'click');

  assert.equal(JSON.stringify(p.stored), before,
    'deleting a preset wrote to storage');
  assert.deepEqual(p.asked, [],
    'it asked whether to delete something it cannot delete');
});

test('resetting everything asks first, and declining changes nothing', () => {
  const p = openEditor({
    themeId: 'custom-x',
    customThemes: { 'custom-x': { name: 'Mine', colors: GOOD_COLORS } }
  }, { confirm: false });

  p.fire('reset-all', 'click');
  assert.ok(customThemes(p)['custom-x'], 'everything was cleared without an answer');
});

test('resetting everything puts the defaults back', () => {
  const p = openEditor({
    themeId: 'custom-x',
    customThemes: { 'custom-x': { name: 'Mine', colors: GOOD_COLORS } }
  });

  p.fire('reset-all', 'click');
  assert.deepEqual(p.stored.customThemes, {}, 'a custom theme survived the reset');
  assert.equal(p.stored.themeId, p.sandbox.NWT.DEFAULT_SETTINGS.themeId);
});

test('CSS that hides url() behind an escape is refused', async () => {
  /* A name in CSS may be written with escapes, and the browser resolves them
   * before deciding what it is looking at: \75 is "u", so this is a url() the
   * moment it is parsed. Matched as typed, it read as nothing in particular
   * and went straight through - and the request would have been made. */
  const hidden = [
    String.raw`body { background: \75 rl("https://example.com/x.png"); }`,
    String.raw`body { background: \75\72\6C("https://example.com/x.png"); }`,
    String.raw`@\69 mport "https://example.com/x.css";`,
    String.raw`body { background: \000075rl("https://example.com/x.png"); }`,
    String.raw`body { width: \65 xpression(alert(1)); }`,
    String.raw`body { background: \69 mage-set("x.png" 1x); }`,

    /* A file saved on Windows. The browser turns the two bytes of a CRLF into
     * one newline before it reads a single token, and the escape then swallows
     * that one character and carries on reading the name - so this is url()
     * there. Consuming one raw byte here left the newline behind and the
     * payload went through, on the line ending most files actually use. */
    'body { background: ' + String.raw`\75` + '\r\n' +
      'rl("https://example.com/x.png"); }',
    'body { background: ' + String.raw`\75` + '\r' +
      'rl("https://example.com/x.png"); }'
  ];

  for (const css of hidden) {
    const p = openEditor({});
    await p.chooseFile('file-input', themeFile({ customCSS: css }));
    assert.deepEqual(customThemes(p), {}, 'this was imported: ' + css);
    assert.match(p.el('toast').textContent, /external resource/i);
  }
});

test('an escape naming nothing is dropped rather than throwing', async () => {
  /* A code point past the end of the range, a null, or half of a surrogate
   * pair is not a character a browser would produce here either. The decoder
   * has to get through the file all the same: throwing would refuse a theme
   * for a reason that has nothing to do with reaching the network. */
  const p = openEditor({});
  const css = String.raw`.a { content: "\110000 \0 \d800"; }`;
  await p.chooseFile('file-input', themeFile({ customCSS: css }));
  assert.equal(onlyCustom(p).customCSS, css, 'the file was refused or mangled');
});

test('an escape naming nothing cannot be used to hide a payload', async () => {
  /* The dropped character must not join what is either side of it into
   * something new. */
  const p = openEditor({});
  await p.chooseFile('file-input', themeFile({
    customCSS: String.raw`body { background: u\d800rl("https://example.com/x"); }`
  }));
  assert.deepEqual(customThemes(p), {}, 'a payload hid behind a dropped escape');
});

test('an escape that spells something harmless is still allowed', () => {
  /* Decoding is for the check, not for the file. Ordinary CSS that happens to
   * use an escape - a quotation mark in generated content - is not refused. */
  const p = openEditor({});
  const css = String.raw`.q::before { content: "\201C"; }`;
  return p.chooseFile('file-input', themeFile({ customCSS: css })).then(() => {
    assert.equal(onlyCustom(p).customCSS, css,
      'an ordinary escape was treated as an attempt to reach out');
  });
});

test('asking to reset is a real question', () => {
  const p = openEditor({ customThemes: {} }, { confirm: false });
  p.fire('reset-all', 'click');
  assert.equal(p.asked.length, 1, 'it reset without asking');
  assert.match(p.asked[0], /reset/i);
});

test('an escaped backslash is spent as one, not read as starting an escape', () => {
  /* Two backslashes are a literal backslash to a browser, so what follows is
   * plain text. Read in two passes, the second was taken as opening an escape
   * and the file was refused for asking for nothing. */
  const p = openEditor({});
  const css = '.a::before { content: "' + String.raw`\75rl` + '"; }';
  return p.chooseFile('file-input', themeFile({ customCSS: css })).then(() => {
    assert.equal(onlyCustom(p).customCSS, css,
      'a literal backslash was read as an escape and the theme refused');
  });
});
