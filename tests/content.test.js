/* Tests for the content script, driven through tests/harness.js.
 *
 * These cover the behaviours that produced visible bugs on the page: panels
 * keeping a colour they were given once, stale settings winning a race, and
 * the stylesheet being rewritten when nothing changed.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadContentScript } = require('./harness');

/* A light panel, the thing the rescue pass exists to catch. */
const LIGHT = { backgroundColor: 'rgb(248, 245, 241)', color: 'rgb(20, 20, 20)',
                borderTopColor: 'rgb(230, 228, 224)' };
/* Already dark, so it should be left alone. */
const DARK = { backgroundColor: 'rgb(29, 30, 31)', color: 'rgb(232, 233, 233)',
               borderTopColor: 'rgb(60, 62, 64)' };

function bg(el) { return el.style.getPropertyValue('background-color'); }

test('a light panel gets repainted, a dark one is left alone', () => {
  const env = loadContentScript({ settings: { enabled: true, themeId: 'concrete' } });
  const light = env.addPanel(LIGHT);
  const dark = env.addPanel(DARK);
  env.flush();
  env.mutate();
  env.flush();

  assert.ok(bg(light), 'a light panel should have been repainted');
  assert.strictEqual(bg(dark), '', 'a dark panel should be untouched');
});

test('a small element is ignored however light it is', () => {
  const env = loadContentScript({ settings: { enabled: true, themeId: 'concrete' } });
  const chip = env.addPanel(LIGHT, { width: 80, height: 24 });
  env.flush();
  env.mutate();
  env.flush();
  assert.strictEqual(bg(chip), '', 'a chip is not a panel');
});

test('turning the theme off gives panels their colour back', () => {
  /* The inline style is written with !important and nothing removed it, so a
   * panel kept the theme surface after the theme was switched off. */
  const env = loadContentScript({ settings: { enabled: true, themeId: 'concrete' } });
  const panel = env.addPanel(LIGHT);
  env.flush();
  env.mutate();
  env.flush();
  assert.ok(bg(panel), 'precondition: the panel was repainted');

  env.chrome.storage.local.set({ enabled: false });
  env.flush();

  assert.strictEqual(bg(panel), '',
    'disabling the theme should remove the inline background');
  assert.strictEqual(panel.dataset.nwtLit, undefined,
    'and should clear the marker, or the panel can never be repainted again');
});

test('switching theme repaints panels instead of leaving the old colour', () => {
  /* The marker made an already-painted element skip, so it kept the palette of
   * whichever theme happened to be active when it first appeared. */
  const env = loadContentScript({ settings: { enabled: true, themeId: 'concrete' } });
  const panel = env.addPanel(LIGHT);
  env.flush();
  env.mutate();
  env.flush();
  const first = bg(panel);
  assert.ok(first, 'precondition: the panel was repainted');

  env.chrome.storage.local.set({ themeId: 'espresso' });
  env.flush();
  env.mutate();
  env.flush();

  const second = bg(panel);
  assert.ok(second, 'the panel should still be repainted after the switch');
  assert.notStrictEqual(second, first,
    'the panel kept the previous theme colour');
});

test('the stylesheet is not rewritten when nothing changed', () => {
  /* buildCSS used to return different bytes for identical settings, so this
   * guard could never fire and every storage write forced a full restyle. */
  const env = loadContentScript({ settings: { enabled: true, themeId: 'concrete' } });
  env.flush();
  const style = env.doc.getElementById('nwt-theme');
  assert.ok(style, 'precondition: a stylesheet was injected');

  let writes = 0;
  let value = style.textContent;
  Object.defineProperty(style, 'textContent', {
    get() { return value; },
    set(v) { if (v !== value) writes++; value = v; }
  });

  env.chrome.storage.local.set({ enabled: true });
  env.flush();
  env.chrome.storage.local.set({ enabled: true });
  env.flush();

  assert.strictEqual(writes, 0,
    'the stylesheet was rewritten ' + writes + ' times for no change');
});

test('the newest settings win when two reads overlap', () => {
  /* Both listeners answer a change by starting a fresh async read. Two changes
   * in quick succession put two reads in flight with no ordering guarantee, so
   * an older snapshot could be applied last. */
  const env = loadContentScript({ settings: { enabled: true, themeId: 'concrete' } });
  env.flush();

  /* Start a read against espresso, then another against tokyoNight, and hold
   * both. This is the shape the real thing takes: the listener fires on each
   * change and starts its own read, so two are in flight at once. */
  env.chrome.storage.local.set({ themeId: 'espresso' });
  env.flush({ deliverReads: false });
  env.chrome.storage.local.set({ themeId: 'tokyoNight' });
  env.flush({ deliverReads: false });
  assert.ok(env.reads.length >= 2, 'expected two reads in flight, got ' + env.reads.length);

  /* Deliver them newest-first, so the older snapshot lands last. */
  env.flush({ reverseReads: true });

  const css = env.doc.getElementById('nwt-theme').textContent;
  const tokyo = env.sandbox.self.NWT.buildPalette(
    env.sandbox.self.NWT.getTheme({ themeId: 'tokyoNight' }, 'tokyoNight'));
  assert.ok(css.indexOf(tokyo.canvas) !== -1,
    'the last write should be what is on the page');
});

test('dragging a dial writes storage once, not once per pixel', () => {
  /* A range input fires per pixel of travel. Each write reached every open
   * nextwork.ai tab, and each of those rebuilt both stylesheets and re-walked
   * the DOM, so one drag drove a restyle storm across every tab. */
  const { loadContentScript } = require('./harness');
  const NWT = loadContentScript({ settings: {} }).sandbox.NWT;
  let writes = 0;
  const commit = NWT.debounce(() => { writes++; }, 140);
  for (let i = 0; i < 40; i++) commit();
  assert.strictEqual(writes, 0, 'nothing should be written while still dragging');
  commit.flush();
  assert.strictEqual(writes, 1, 'the drag should settle into a single write');
});

test('a mutation walks only what was added, not the whole page', () => {
  /* The debounce bounded how often the walk ran, not how much it did: every
   * pass was querySelectorAll('*') from the root plus every shadow root under
   * it, on a page that mounts components continuously. */
  const env = loadContentScript({ settings: { enabled: true, themeId: 'concrete' } });
  env.flush();

  /* A page with some depth to it. */
  for (let i = 0; i < 60; i++) env.addPanel(DARK);
  env.flush();

  const added = env.addPanel(DARK);
  const walked = env.countWalks(() => {
    env.mutate([{ addedNodes: [added] }]);
    env.flush();
  });

  assert.ok(walked.fromRoot === 0,
    'the whole document was walked ' + walked.fromRoot + ' time(s) for one added node');
});

test('a stacked pane keeps its background instead of showing the page behind', () => {
  /* The stylesheet makes .bg-paper transparent so the scenery can show through
   * the page ground. That is right for the actual ground and wrong for every
   * copy of it that is a panel stacked over something else. In a split view the
   * documentation pane sat over the project page, went transparent, and the
   * page underneath showed through it.
   *
   * The stylesheet decides by class name, which is all CSS can do. This is the
   * runtime correcting it by measurement. */
  const env = loadContentScript({ settings: { enabled: true, themeId: 'cherryBlossom' } });
  env.flush();

  /* The real page ground: .bg-paper with nothing positioned above it. */
  const ground = env.doc.createElement('div');
  ground.classList.add('bg-paper');
  env.doc.body.appendChild(ground);

  /* A pane stacked over it, carrying no positioning class of its own. */
  const shell = env.doc.createElement('div');
  shell._computed = { position: 'fixed' };
  env.doc.body.appendChild(shell);
  const pane = env.doc.createElement('div');
  pane.classList.add('bg-paper');
  shell.appendChild(pane);

  env.mutate([{ addedNodes: [ground, shell] }]);
  env.flush();

  assert.ok(pane.style.getPropertyValue('background-color'),
    'a pane inside a positioned ancestor should keep a background');
  assert.strictEqual(ground.style.getPropertyValue('background-color'), '',
    'the real page ground should stay transparent so the scenery shows');
});
