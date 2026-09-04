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

  /* The real page ground: .bg-paper, full width, nothing positioned above it. */
  const ground = env.doc.createElement('div');
  ground.classList.add('bg-paper');
  ground._rect = { left: 0, top: 0, width: 1440, height: 2000 };
  env.doc.body.appendChild(ground);

  /* A pane stacked over it, carrying no positioning class of its own. */
  const shell = env.doc.createElement('div');
  shell._computed = { position: 'fixed' };
  env.doc.body.appendChild(shell);
  const pane = env.doc.createElement('div');
  pane.classList.add('bg-paper');
  pane._rect = { left: 720, top: 0, width: 720, height: 900 };
  shell.appendChild(pane);

  env.mutate([{ addedNodes: [ground, shell] }]);
  env.flush();

  assert.ok(pane.style.getPropertyValue('background-color'),
    'a pane inside a positioned ancestor should keep a background');
  assert.strictEqual(ground.style.getPropertyValue('background-color'), '',
    'the real page ground should stay transparent so the scenery shows');
});

test('an inset card keeps its background, the full-width ground does not', () => {
  /* The second shape of the same bug. A step list is .bg-paper with nothing
   * positioned above it, so the positioned-ancestor test walked past it and it
   * stayed transparent, putting the wallpaper behind the text inside a
   * component. What separates it from the real ground is that it is inset. */
  const env = loadContentScript({ settings: { enabled: true, themeId: 'mountFuji' } });
  env.flush();

  const ground = env.doc.createElement('div');
  ground.classList.add('bg-paper');
  ground._rect = { left: 0, top: 0, width: 1440, height: 2000 };
  env.doc.body.appendChild(ground);

  const card = env.doc.createElement('div');
  card.classList.add('bg-paper');
  card._rect = { left: 400, top: 200, width: 640, height: 300 };
  env.doc.body.appendChild(card);

  env.mutate([{ addedNodes: [ground, card] }]);
  env.flush();

  assert.ok(card.style.getPropertyValue('background-color'),
    'an inset card should keep a background');
  assert.strictEqual(ground.style.getPropertyValue('background-color'), '',
    'the full-width ground should stay transparent so the wallpaper shows');
});

test('white text on a light theme is repointed, but only where it sits on light', () => {
  /* NextWork's home page is dark by design, so its hero is written as white
   * text. The stylesheet leaves --color-white alone on purpose, because
   * text-white is also used on dark cards. On a light theme that means the
   * page goes pale, the heading stays white, and it disappears. */
  const env = loadContentScript({ settings: { enabled: true, themeId: 'hawaiiMorning' } });
  env.flush();

  /* The page itself is light, which is the whole premise. */
  env.doc.body._computed = { backgroundColor: 'rgb(253, 244, 236)' };

  /* A hero heading on the light page ground. */
  const hero = env.doc.createElement('h1');
  hero.classList.add('text-white');
  hero._computed = { color: 'rgb(255, 255, 255)', backgroundColor: 'rgba(0, 0, 0, 0)' };
  env.doc.body.appendChild(hero);

  /* White text on a genuinely dark button. This must not be touched. */
  const button = env.doc.createElement('button');
  button.classList.add('text-white');
  button._computed = { color: 'rgb(255, 255, 255)', backgroundColor: 'rgb(24, 24, 27)' };
  env.doc.body.appendChild(button);

  env.mutate([{ addedNodes: [hero, button] }]);
  env.flush();

  assert.ok(hero.style.getPropertyValue('color'),
    'white text on a light background should be repointed');
  assert.strictEqual(button.style.getPropertyValue('color'), '',
    'white text on a dark button is correct and must be left alone');
});

test('pale text is repointed by readability, in whichever direction the background needs', () => {
  /* text-white was only half the problem. The site also writes its headings and
   * chips with the pale end of its own ramps, and those were chosen for a dark
   * page: on a light theme text-brand-25 lands at 1.00:1 against the canvas,
   * which is to say it is the same colour as the background.
   *
   * Lightness is the wrong test for this. A pale blue-grey heading on cream is
   * not "light text" by any threshold and is still unreadable. So this measures
   * contrast, and picks whichever ink the background can actually carry, which
   * makes it correct on a dark card as well as on a light page. */
  const env = loadContentScript({ settings: { enabled: true, themeId: 'hawaiiMorning' } });
  env.flush();

  const CREAM = 'rgb(253, 244, 236)';
  const CARD = 'rgb(24, 24, 27)';
  env.doc.body._computed = { backgroundColor: CREAM };

  const make = (tag, cls, computed) => {
    const el = env.doc.createElement(tag);
    if (cls) el.classList.add(cls);
    el._computed = computed;
    env.doc.body.appendChild(el);
    return el;
  };

  /* The welcome heading: pale ramp text on the pale page ground. */
  const heading = make('h1', 'text-brand-25',
    { color: CREAM, backgroundColor: 'rgba(0, 0, 0, 0)' });
  /* The same class where it was meant to be read, on a dark card. */
  const onCard = make('span', 'text-brand-25', { color: CREAM, backgroundColor: CARD });
  /* Dark text that ended up on a dark card. The other direction. */
  const dark = make('span', 'text-gray-900',
    { color: 'rgb(40, 40, 40)', backgroundColor: CARD });

  env.mutate([{ addedNodes: [heading, onCard, dark] }]);
  env.flush();

  const ink = el => el.style.getPropertyValue('color');
  const lum = c => {
    const m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)/.exec(c) ||
              /^#(..)(..)(..)$/.exec(c);
    if (!m) return null;
    const n = i => c[0] === '#' ? parseInt(m[i], 16) : +m[i];
    return (0.2126 * n(1) + 0.7152 * n(2) + 0.0722 * n(3)) / 255;
  };

  assert.ok(ink(heading), 'the welcome heading was left the same colour as the page');
  assert.ok(lum(ink(heading)) < 0.5,
    'a heading on a cream page needs dark ink, got ' + ink(heading));

  assert.strictEqual(ink(onCard), '',
    'pale text on a dark card is readable and must be left alone');

  assert.ok(ink(dark), 'dark text on a dark card was left unreadable');
  assert.ok(lum(ink(dark)) > 0.5,
    'text on a dark card needs light ink, got ' + ink(dark));

  /* Text a control dims because it is switched off. A disabled button is
   * supposed to look disabled, so this keeps its dimming. The first cut told
   * it apart from real content by sitting the trigger under the ratio such
   * text lands at, which does not work: a suggestion chip measures about the
   * same as a disabled label, and one of them is content. The DOM already
   * states which is which, so it gets asked. */
  const off = make('span', 'text-gray-400',
    { color: 'rgb(185, 151, 126)', backgroundColor: CREAM });
  off.setAttribute('disabled', '');
  /* The same colour on a chip that is not disabled: a real suggestion the
   * reader is meant to be able to read. */
  const chip = make('span', 'text-gray-400',
    { color: 'rgb(185, 151, 126)', backgroundColor: CREAM });
  env.mutate([{ addedNodes: [off, chip] }]);
  env.flush();

  assert.strictEqual(ink(off), '',
    'a disabled control must keep its dimming');
  assert.ok(ink(chip),
    'an enabled chip at the same colour is content and must be readable');
});

test('text inside a web component is reached too', () => {
  /* The suggestion chips and the composer on the home page are nw-* custom
   * elements. A document stylesheet stops at a shadow boundary and so does
   * querySelectorAll, so the welcome heading beside them could be corrected
   * while everything inside them stayed the colour of the page. */
  const env = loadContentScript({ settings: { enabled: true, themeId: 'mountFuji' } });
  env.flush();

  const CANVAS = 'rgb(242, 245, 250)';
  env.doc.body._computed = { backgroundColor: CANVAS };

  /* A component with an open shadow root, which is how the site ships them. */
  const host = env.doc.createElement('nw-suggestion');
  host._computed = { backgroundColor: CANVAS };
  env.doc.body.appendChild(host);
  const root = env.doc.createElement('#shadow-root');
  root.host = host;
  host.shadowRoot = root;

  const label = env.doc.createElement('span');
  label.classList.add('text-brand-50');
  label._computed = { color: 'rgb(255, 255, 255)', backgroundColor: CANVAS };
  root.appendChild(label);

  env.mutate([{ addedNodes: [host] }]);
  env.flush();

  assert.ok(label.style.getPropertyValue('color'),
    'text inside a shadow root was left the colour of the page');

  /* And the undo has to get back in there, or switching the theme off leaves
   * an inline !important colour behind with no stylesheet to match it. */
  env.chrome.storage.local.set({ enabled: false });
  env.flush();
  assert.strictEqual(label.style.getPropertyValue('color'), '',
    'turning the theme off must clear the colour inside the component too');
});

test('a title over artwork is left alone, in both ways a picture gets there', () => {
  /* The project cards are a dark painting inside a pale card, with a white
   * title over the painting. effectiveBackground can only read a background
   * colour, so it reads the pale card, calls the white title unreadable and
   * turns it black - onto the dark half of the artwork. That takes a title
   * that was perfectly readable and makes it unreadable, which is worse than
   * the problem this pass exists to solve.
   *
   * There is no measuring out of it: the colour that can be read is not the
   * colour the reader sees. So text over a picture is left alone. */
  const env = loadContentScript({ settings: { enabled: true, themeId: 'palmForest' } });
  env.flush();
  env.doc.body._computed = { backgroundColor: 'rgb(240, 245, 238)' };

  const card = (left, useImgElement) => {
    const box = env.doc.createElement('div');
    box._rect = { left: left, top: 0, width: 240, height: 180 };
    box._computed = { backgroundColor: 'rgb(255, 255, 255)' };
    env.doc.body.appendChild(box);
    if (useImgElement) {
      /* The picture as an <img> stacked behind the words. */
      const art = env.doc.createElement('img');
      art._rect = { left: left, top: 0, width: 240, height: 180 };
      box.appendChild(art);
    } else {
      /* The picture as a CSS background on the card itself. */
      box._computed.backgroundImage = 'url("data:image/webp;base64,AA")';
    }
    const title = env.doc.createElement('h3');
    title.classList.add('text-white');
    title._computed = { color: 'rgb(255, 255, 255)', backgroundColor: 'rgba(0, 0, 0, 0)' };
    title._rect = { left: left + 20, top: 60, width: 200, height: 30 };
    box.appendChild(title);
    return title;
  };

  const overImg = card(0, true);
  const overBackground = card(300, false);

  /* And a heading on the bare page, which is the case that must still work. */
  const onPage = env.doc.createElement('h1');
  onPage.classList.add('text-white');
  onPage._computed = { color: 'rgb(255, 255, 255)', backgroundColor: 'rgba(0, 0, 0, 0)' };
  onPage._rect = { left: 0, top: 400, width: 600, height: 40 };
  env.doc.body.appendChild(onPage);

  env.mutate([{ addedNodes: [overImg, overBackground, onPage] }]);
  env.flush();

  assert.strictEqual(overImg.style.getPropertyValue('color'), '',
    'a title over an <img> must keep the colour that was chosen for the artwork');
  assert.strictEqual(overBackground.style.getPropertyValue('color'), '',
    'a title over a background picture must be left alone too');
  assert.ok(onPage.style.getPropertyValue('color'),
    'a heading on the bare page is still measurable and must still be fixed');
});

test('a bubble in oklab on a gradient pill is corrected, a title over a photo is not', () => {
  /* Both halves of this were live bugs on the home page, and they pull in
   * opposite directions, so they are pinned together.
   *
   * The suggestion bubbles write their text in oklab, which Tailwind v4 emits
   * and the canvas round-trip does not resolve: fillStyle takes the string and
   * hands the same string back, so the parse fails, the colour reads as
   * unknown and the text is skipped. Measured properly the bubble text is
   * 1.05:1 against its own pill.
   *
   * They also carry a faint gradient for their glassy edge. Treating any
   * background-image as artwork bailed on them, which is how the first attempt
   * at protecting the card titles stopped the bubbles being fixed at all. A
   * gradient is decoration on a surface we can still measure; a url() is a
   * photograph whose colours we cannot know. */
  const env = loadContentScript({ settings: { enabled: true, themeId: 'cherryBlossom' } });
  env.flush();
  env.doc.body._computed = { backgroundColor: 'rgb(253, 244, 246)' };

  /* The bubble: oklab text on a pill that paints a gradient. */
  const pill = env.doc.createElement('button');
  pill._rect = { left: 100, top: 40, width: 220, height: 44 };
  pill._computed = {
    backgroundColor: 'rgb(251, 233, 238)',
    backgroundImage: 'linear-gradient(to right bottom, rgba(58, 32, 41, 0.07), rgba(0, 0, 0, 0.18))'
  };
  env.doc.body.appendChild(pill);
  const bubble = env.doc.createElement('span');
  bubble.classList.add('text-brand-50');
  bubble._rect = { left: 120, top: 50, width: 180, height: 24 };
  bubble._computed = { color: 'oklab(0.931099 0.020047 -0.00207967 / 0.8)',
                       backgroundColor: 'rgba(0, 0, 0, 0)' };
  pill.appendChild(bubble);

  /* The card: a white title over an actual photograph. */
  const card = env.doc.createElement('a');
  card._rect = { left: 500, top: 40, width: 240, height: 180 };
  card._computed = { backgroundColor: 'rgb(255, 255, 255)' };
  env.doc.body.appendChild(card);
  const photo = env.doc.createElement('div');
  photo._rect = { left: 500, top: 40, width: 240, height: 180 };
  photo._computed = { backgroundImage: 'url("https://nextwork.ai/courses/static/pyramid.webp")' };
  card.appendChild(photo);
  const title = env.doc.createElement('h3');
  title.classList.add('text-white');
  title._rect = { left: 520, top: 100, width: 200, height: 30 };
  title._computed = { color: 'rgb(255, 255, 255)', backgroundColor: 'rgba(0, 0, 0, 0)' };
  card.appendChild(title);

  env.mutate([{ addedNodes: [pill, card] }]);
  env.flush();

  assert.ok(bubble.style.getPropertyValue('color'),
    'the bubble text is 1.05:1 against its own pill and must be corrected');
  assert.strictEqual(title.style.getPropertyValue('color'), '',
    'a title over a photograph must still be left alone');
});

test('oklab and oklch are read, since the canvas hands them back unchanged', () => {
  const env = loadContentScript({ settings: {} });
  const src = require('fs').readFileSync(
    require('path').join(__dirname, '..', 'src', 'content.js'), 'utf8');
  const fromOklab = eval('(' + /function fromOklab\(value\)[\s\S]*?\n  \}/.exec(src)[0] + ')');
  const rgb = c => { const r = fromOklab(c); return r ? [r.r, r.g, r.b] : null; };
  assert.deepStrictEqual(rgb('oklch(1 0 0)'), [255, 255, 255], 'white');
  assert.deepStrictEqual(rgb('oklab(0 0 0)'), [0, 0, 0], 'black');
  /* The colour the suggestion bubbles actually use. */
  assert.deepStrictEqual(rgb('oklab(0.931099 0.020047 -0.00207967 / 0.8)'), [244, 227, 233]);
  assert.strictEqual(fromOklab('oklab(0.931099 0.020047 -0.00207967 / 0.8)').a, 0.8,
    'the alpha has to survive, or a faint colour reads as solid');
  assert.strictEqual(fromOklab('rgb(1, 2, 3)'), null, 'anything else is left to the canvas');
});

test('the timer shows while building a project, not while browsing', () => {
  /* A project being built is /projects/<id>. The gate used to be an unanchored
   * /projects?/, which also matched the index and anything with "project"
   * further along the path, so the pill turned up on pages that are for
   * looking around rather than working. */
  const focus = { enabled: true };
  const shows = p => {
    const env = loadContentScript({ pathname: p,
      settings: { enabled: true, themeId: 'concrete', focus: focus } });
    env.flush();
    return !!env.doc.getElementById('nwt-focus');
  };

  assert.ok(shows('/projects/291fe0ff-09fa-42b0-9be4-4d38914f2c14'),
    'a project build page is the whole point');
  assert.ok(!shows('/'), 'the home page is not a project');
  assert.ok(!shows('/projects'), 'the index is browsing, not building');
  assert.ok(!shows('/projects/'), 'still the index with a trailing slash');
  assert.ok(!shows('/explore/learnlists/all'), 'the library is browsing');
  assert.ok(!shows('/portfolio/refreshed_maroon_timid_jujube'), 'a portfolio is not a project');
  assert.ok(!shows('/blog/my-projects/recap'),
    'the word appearing further along a path does not make it a project page');
});

test('the timer is drawn at the size that was asked for, within reason', () => {
  const at = scale => {
    const env = loadContentScript({ pathname: '/projects/abc',
      settings: { enabled: true, themeId: 'concrete',
                  focus: { enabled: true, hudScale: scale } } });
    env.flush();
    const el = env.doc.getElementById('nwt-focus');
    return el && el.style.getPropertyValue('--nwt-hud-scale');
  };

  assert.strictEqual(at(1.6), '1.6', 'the chosen size should reach the pill');
  assert.strictEqual(at(undefined), '1', 'no setting means the size it always was');
  /* This arrives from storage, so it is not to be trusted. A pill at fifty
   * times its size would cover the page with no obvious way back. */
  assert.strictEqual(at(50), '3', 'an absurd size is clamped');
  assert.strictEqual(at(0), '1', 'zero would make it invisible');
  assert.strictEqual(at('nonsense'), '1', 'so would a value that is not a number');
});

/* ------------------------------------------------------------ the session */

function running(overrides) {
  return Object.assign({
    enabled: true, running: true, locked: false,
    startedAt: Date.now(), accumulatedMs: 0, targetMin: 25, chime: true
  }, overrides || {});
}

test('a session that runs over flashes and says so', () => {
  /* The point of a session length is to be noticed from across the room. */
  const page = loadContentScript({
    settings: { focus: running({ accumulatedMs: 26 * 60000 }) }
  });
  page.flush();

  const hud = page.doc.getElementById('nwt-focus');
  assert.ok(hud, 'the timer is not on the page');
  assert.equal(hud.getAttribute('data-state'), 'over');
  assert.match(hud.textContent, /over/);
});

test('the sound plays once when the session runs over, not every second', () => {
  /* paintHud runs every second. A chime on each one would be unusable. */
  const page = loadContentScript({
    settings: { focus: running({ accumulatedMs: 26 * 60000 }) }
  });
  page.flush();
  assert.equal(page.played.length, 1, 'it did not chime when the session ran over');

  /* Several more paints of the same session.
   *
   * Driven by writing the session back unchanged, which is what a storage
   * change does. Calling flush alone repaints nothing - the clock runs on an
   * interval the harness does not fire - so a loop over it would have proved
   * only that nothing happened. */
  const session = page.stored.focus;
  for (let i = 0; i < 5; i++) {
    page.chrome.storage.local.set({ focus: session });
    page.flush();
  }
  assert.equal(page.played.length, 1,
    'it chimed ' + page.played.length + ' times for one session');

  /* Two notes, and the context closed rather than left open. */
  assert.equal(page.played[0].notes.length, 2);
  assert.ok(page.played[0].notes.every(n => n.frequency.value > 0));
});

test('a session still inside its length makes no sound', () => {
  const page = loadContentScript({
    settings: { focus: running({ accumulatedMs: 60000 }) }
  });
  page.flush();

  assert.equal(page.doc.getElementById('nwt-focus').getAttribute('data-state'), 'running');
  assert.deepEqual(page.played, [], 'it chimed before the session was over');
});

test('turning the sound off leaves the flashing', () => {
  /* The two are separate on purpose: someone in a quiet room still wants to
   * know the session ended. */
  const page = loadContentScript({
    settings: { focus: running({ accumulatedMs: 26 * 60000, chime: false }) }
  });
  page.flush();

  assert.equal(page.doc.getElementById('nwt-focus').getAttribute('data-state'), 'over');
  assert.deepEqual(page.played, [], 'it chimed with the sound turned off');
});

test('one session is announced once, however many tabs are open', () => {
  /* Every project page runs its own copy of this script and they all cross the
   * end of the session in the same second. With the marker held only in the
   * page, three open tabs chimed three times, over the top of each other. */
  const focus = { enabled: true, running: true, startedAt: Date.now() - 26 * 60000,
                  accumulatedMs: 0, targetMin: 25, chime: true };

  const first = loadContentScript({ settings: { enabled: true, focus: focus } });
  first.flush();
  assert.equal(first.played.length, 1, 'the first tab did not chime');
  assert.ok(first.stored.focus.chimedFor,
    'nothing was written down, so every other tab will chime too');

  /* A second tab opening onto the same session, seeing what the first wrote. */
  const second = loadContentScript({
    settings: { enabled: true, focus: Object.assign({}, focus, { chimedFor: 1 }) }
  });
  second.flush();
  assert.deepEqual(second.played, [],
    'a second tab chimed for a session that had already been announced');
});

/* Pause and resume exactly as the popup writes them, rather than by hand.
 *
 * This is the whole point of these two: the previous version of this test
 * invented a resumed state that kept the original `startedAt`, which the real
 * controls cannot produce - the clock has to move `startedAt` forward to keep
 * adding up. So the test passed and the second chime it was written to catch
 * went on happening. */
function pause(focus) {
  const elapsed = focus.accumulatedMs + (Date.now() - focus.startedAt);
  return Object.assign({}, focus, { running: false, startedAt: 0, accumulatedMs: elapsed });
}
function resume(focus) {
  return Object.assign({}, focus, { running: true, startedAt: Date.now() });
}

test('pausing after the session ran over does not announce it a second time', () => {
  const page = loadContentScript({
    settings: { enabled: true, focus: { enabled: true, running: true,
      startedAt: Date.now() - 26 * 60000, accumulatedMs: 0, targetMin: 25,
      chime: true } }
  });
  page.flush();
  assert.equal(page.played.length, 1, 'precondition: the session was announced once');

  const paused = pause(page.stored.focus);
  page.chrome.storage.local.set({ focus: paused });
  page.flush();
  page.chrome.storage.local.set({ focus: resume(paused) });
  page.flush();

  assert.equal(page.played.length, 1,
    'it announced the same session ' + page.played.length + ' times');
});

test('a session that is reset and run again is announced again', () => {
  /* The marker must not make every session after the first one silent. Reset
   * is one of the two things that clears it - the popup does that - so this
   * follows the same path a person would. */
  const page = loadContentScript({
    settings: { enabled: true, focus: { enabled: true, running: true,
      startedAt: Date.now() - 26 * 60000, accumulatedMs: 0, targetMin: 25,
      chime: true } }
  });
  page.flush();
  assert.equal(page.played.length, 1);

  /* Reset, as the popup writes it, then a fresh session that also runs over. */
  page.chrome.storage.local.set({ focus: Object.assign({}, page.stored.focus,
    { running: false, startedAt: 0, accumulatedMs: 0, chimedFor: 0 }) });
  page.flush();
  page.chrome.storage.local.set({ focus: Object.assign({}, page.stored.focus,
    { running: true, startedAt: Date.now() - 26 * 60000 }) });
  page.flush();

  assert.equal(page.played.length, 2, 'the next session was never announced');
});

test('choosing a different length makes an end that has not been reached yet', () => {
  /* The other thing that clears the marker. Going from 25 to 45 after running
   * over 25 is a new end, and passing it should be announced. */
  const page = loadContentScript({
    settings: { enabled: true, focus: { enabled: true, running: true,
      startedAt: Date.now() - 26 * 60000, accumulatedMs: 0, targetMin: 25,
      chime: true } }
  });
  page.flush();
  assert.equal(page.played.length, 1);

  /* 5 minutes, as the popup writes it, and 26 minutes is past that too. */
  page.chrome.storage.local.set({ focus: Object.assign({}, page.stored.focus,
    { targetMin: 5, chimedFor: 0 }) });
  page.flush();
  assert.equal(page.played.length, 2, 'passing the new end was never announced');
});

test('a chime the browser refuses is not counted as announced', () => {
  /* A page nobody has interacted with is not allowed to make a sound, and the
   * browser says so by returning a context that runs silently rather than by
   * failing. Counted as played, the session was marked announced, and stayed
   * silent for good instead of being announced once the page was touched. */
  const over = { enabled: true, running: true, startedAt: Date.now() - 26 * 60000,
                 accumulatedMs: 0, targetMin: 25, chime: true };
  const page = loadContentScript({
    settings: { enabled: true, focus: over }, silenced: true
  });
  page.flush();

  assert.equal(page.played.length, 1, 'it did not even try');
  assert.ok(page.played[0].resumed > 0, 'it did not ask to be allowed');
  assert.deepEqual(page.played[0].notes, [], 'it played into a context nobody can hear');
  assert.ok(!page.stored.focus.chimedFor,
    'a session nobody heard was marked as announced, so it never will be');
  assert.ok(page.played[0].closed, 'the silent context was left open');
});

test('once the page can make a sound, the same session is still announced', () => {
  /* The other half: refusing to mark it is only right if it is retried. */
  const over = { enabled: true, running: true, startedAt: Date.now() - 26 * 60000,
                 accumulatedMs: 0, targetMin: 25, chime: true };
  const page = loadContentScript({ settings: { enabled: true, focus: over } });
  page.flush();

  assert.equal(page.played[0].notes.length, 2, 'nothing was played');
  assert.ok(page.stored.focus.chimedFor, 'a chime that was heard was not recorded');
});

test('the audio context is closed rather than left open', () => {
  /* One is created per chime. A long day of sessions leaving them all open is
   * how a page runs out of them. The comment claimed this and nothing checked
   * it - the close runs on a timer the tests were not firing. */
  const page = loadContentScript({
    settings: { enabled: true, focus: { enabled: true, running: true,
      startedAt: Date.now() - 26 * 60000, accumulatedMs: 0, targetMin: 25,
      chime: true } }
  });
  page.flush();
  assert.equal(page.played.length, 1);
  assert.ok(page.played[0].closed, 'the context was left open after the chime');
});

test('the in-flight guard does not clear itself before the write lands', () => {
  /* Between playing and the marker reaching storage, storage still says the
   * session has not been announced. The guard reset at the top of the paint
   * read that as "nothing has chimed", cleared the local flag, and the next
   * paint a second later played again. */
  const page = loadContentScript({
    settings: { enabled: true, focus: { enabled: true, running: true,
      startedAt: Date.now() - 26 * 60000, accumulatedMs: 0, targetMin: 25,
      chime: true } }
  });
  /* Hold the write: the read it depends on is delivered, the set is not. */
  const real = page.chrome.storage.local.set;
  let held = [];
  page.chrome.storage.local.set = function (patch, cb) { held.push([patch, cb]); };

  page.flush();
  assert.equal(page.played.length, 1, 'it did not chime once');

  /* More paints while the marker is still in flight. */
  page.chrome.storage.local.set = real;
  page.chrome.storage.local.set({ hue: 5 });
  page.flush();
  page.chrome.storage.local.set({ hue: 6 });
  page.flush();

  assert.equal(page.played.length, 1,
    'it chimed ' + page.played.length + ' times while the marker was in flight');
});
test('an open session never runs over, so it never chimes', () => {
  /* Counting up has no end to reach. */
  const page = loadContentScript({
    settings: { focus: running({ targetMin: 0, accumulatedMs: 90 * 60000 }) }
  });
  page.flush();

  assert.equal(page.doc.getElementById('nwt-focus').getAttribute('data-state'), 'running');
  assert.deepEqual(page.played, []);
});

/* ------------------------------------------------------ the companion pane */

function withPane(companion, rest) {
  return loadContentScript({
    settings: Object.assign({ enabled: true, companion:
      Object.assign({ enabled: true, url: '' }, companion) }, rest)
  });
}
const VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
const EMBED = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
function pane(page) { return page.doc.getElementById('nwt-companion'); }
function frameOf(page) { return pane(page).querySelector('.nwt-companion-frame'); }

test('the pane appears only when it has been turned on', () => {
  const off = withPane({ enabled: false, url: VIDEO });
  off.flush();
  assert.equal(pane(off), null, 'the pane appeared without being asked for');

  const on = withPane({ url: VIDEO });
  on.flush();
  assert.ok(pane(on), 'the pane was turned on and did not appear');
});

test('turning the theme off takes the pane with it', () => {
  /* One switch turns the extension off. Leaving a frame floating over the
   * page after that would be the extension ignoring it. */
  const page = withPane({ url: VIDEO });
  page.flush();
  assert.ok(pane(page), 'precondition: the pane is there');

  page.chrome.storage.local.set({ enabled: false });
  page.flush();
  assert.equal(pane(page), null, 'the pane outlived the theme');
});

test('a video link is loaded as the player, not as the watch page', () => {
  const page = withPane({ url: VIDEO });
  page.flush();
  assert.equal(frameOf(page).getAttribute('src'), EMBED);
  assert.equal(pane(page).querySelector('.nwt-companion-title').textContent, 'youtube.com');
});

test('the name on the bar is the one that was saved with the tile', () => {
  const page = withPane({ url: VIDEO, tiles: [{ label: 'Lecture', url: VIDEO }] });
  page.flush();
  assert.equal(pane(page).querySelector('.nwt-companion-title').textContent, 'Lecture');
});

const DISCORD = 'https://discord.com/channels/1/2';

test('a player needs no permission, because the site published it to be framed', () => {
  const page = withPane({ url: VIDEO });
  page.flush();
  assert.equal(pane(page).getAttribute('data-state'), 'ready');
  assert.equal(frameOf(page).getAttribute('src'), EMBED);
  assert.deepEqual(page.sent.filter(m => m.type === 'companion:allowed'), [],
    'it asked permission for a site that had already said yes');
});

test('the arrow asks the extension for a window rather than opening one here', () => {
  /* A window the browser makes holds anything at all, including every site
   * that refuses to be framed whatever its headers say. `window.open` from
   * the page is subject to the page's own policy on what it may open. */
  const page = withPane({ url: DISCORD, w: 500, h: 400 });
  page.flush();
  pane(page).querySelector('.nwt-companion-out').click();
  page.flush();

  const asked = page.sent.filter(m => m.type === 'companion:window');
  assert.equal(asked.length, 1);
  assert.equal(asked[0].url, DISCORD);
  assert.deepEqual([asked[0].w, asked[0].h], [500, 400],
    'the window did not arrive the shape the pane was left');
});

test('an address it cannot open leaves the frame empty rather than loading it', () => {
  const page = withPane({ url: 'javascript:alert(1)' });
  page.flush();

  assert.equal(frameOf(page).getAttribute('src'), null,
    'something that is not a web address was put in the frame');
  assert.equal(pane(page).getAttribute('data-state'), 'empty');
  assert.equal(pane(page).querySelector('.nwt-companion-out').style.display, 'none');
});

test('a pane with nothing in it is not drawn at all', () => {
  /* An empty list means no panes. An empty rectangle floating over the page
   * inviting you to go and use the popup is furniture, not an invitation -
   * the popup is where links are added, and it says so there. */
  const page = withPane({ url: '' });
  page.flush();
  assert.equal(pane(page), null);
});

test('a repaint does not reload a video that is already playing', () => {
  /* Setting src again restarts it from the beginning. Any storage write -
   * the timer ticking, a dial moving - repaints, so this has to hold. */
  const page = withPane({ url: VIDEO });
  page.flush();
  const frame = frameOf(page);
  let sets = 0;
  const real = frame.setAttribute.bind(frame);
  frame.setAttribute = function (n, v) { if (n === 'src') sets++; return real(n, v); };

  page.chrome.storage.local.set({ hue: 20 });
  page.flush();
  page.chrome.storage.local.set({ hue: 40 });
  page.flush();

  assert.equal(sets, 0, 'the frame was reloaded ' + sets + ' times by an unrelated change');
  assert.equal(pane(page).getAttribute('data-state'), 'ready');
});

test('the frame is not allowed to navigate the tab it sits in', () => {
  /* This used to read the `allow` attribute, which is a permissions policy and
   * has nothing to say about navigation - so it asserted the absence of a word
   * that could never have appeared there, and would have gone on passing if
   * the frame had been given free rein. `sandbox` is the attribute that
   * governs this, and a frame with no sandbox at all has no restriction. */
  const page = withPane({ url: VIDEO });
  page.flush();
  const sandbox = frameOf(page).getAttribute('sandbox');

  assert.ok(sandbox, 'the frame has no sandbox, so nothing restricts it');
  assert.ok(!/allow-top-navigation/.test(sandbox),
    'a page in the pane can replace the tab underneath it');
  assert.ok(/allow-scripts/.test(sandbox), 'nothing would run, so nothing would load');
  assert.equal(frameOf(page).getAttribute('referrerpolicy'), 'strict-origin-when-cross-origin');
});

test('the frame is not handed the clipboard', () => {
  /* It was granted clipboard-write, unconditionally, to whatever address
   * happened to be pasted in. Nothing in a pane beside your work needs it. */
  const page = withPane({ url: VIDEO });
  page.flush();
  assert.ok(!/clipboard/.test(frameOf(page).getAttribute('allow') || ''),
    'the frame was given the clipboard');
});

test('hiding the pane from its own corner turns it off for good', () => {
  /* Not just removed from the page - it has to stay gone after a reload. */
  const page = withPane({ url: VIDEO });
  page.flush();
  pane(page).querySelector('.nwt-companion-hide').click();
  page.flush();

  assert.equal(page.stored.companion.enabled, false,
    'closing the pane did not turn it off in storage');
  assert.equal(pane(page), null, 'the pane is still on the page');
});

test('a frame that loaded still offers the way out', () => {
  /* A frame that loaded is not a frame that shows anything, and nothing
   * readable across the origin boundary says which happened. */
  const page = withPane({ url: VIDEO });
  page.flush();
  const hint = pane(page).querySelector('.nwt-companion-hint');
  assert.ok(hint, 'a frame that loaded and showed nothing would be a dead end');

  hint.click();
  page.flush();
  assert.equal(page.sent.filter(m => m.type === 'companion:window').length, 1,
    'the way out did not lead anywhere');
});

test('a site nobody has allowed is not loaded, and says why', () => {
  /* Waiting to see whether the frame loads cannot work: a browser that refuses
   * one navigates it to an error page and fires `load` on it just the same, so
   * there is no failure to catch and nothing to time out on. What is knowable
   * in advance is whether this site has been allowed, so that is what is
   * asked - and someone looking at the pane is told which it is. */
  const page = withPane({ url: DISCORD });
  page.flush();

  assert.equal(pane(page).getAttribute('data-state'), 'blocked');
  assert.equal(frameOf(page).getAttribute('src'), null,
    'a site that was refused was loaded anyway');
  assert.match(pane(page).querySelector('.nwt-companion-refused').textContent,
    /refuses to be shown inside another page/);
  assert.notEqual(pane(page).querySelector('.nwt-companion-out').style.display, 'none',
    'the button that opens it in a window was hidden');
});

test('a site that has been allowed is loaded', () => {
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, url: DISCORD } },
    allowed: ['https://discord.com']
  });
  page.flush();

  assert.equal(pane(page).getAttribute('data-state'), 'ready');
  assert.equal(frameOf(page).getAttribute('src'), DISCORD);
});

test('allowing a site while the page is open loads it without a reload', () => {
  /* The answer is cached, so being granted permission has to be able to reach
   * a page that has already been told no. Without this, allowing a site left
   * the pane sitting on its refusal until something else changed. */
  const page = withPane({ url: DISCORD });
  page.flush();
  assert.equal(pane(page).getAttribute('data-state'), 'blocked');

  page.allow('https://discord.com');
  page.chrome.storage.local.set({
    companion: { enabled: true, url: DISCORD, grantedAt: 1234 }
  });
  page.flush();

  assert.equal(pane(page).getAttribute('data-state'), 'ready');
  assert.equal(frameOf(page).getAttribute('src'), DISCORD);
});

test('switching to another link does load the new one', () => {
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, url: VIDEO } },
    allowed: ['https://example.com']
  });
  page.flush();
  assert.equal(frameOf(page).getAttribute('src'), EMBED);

  page.chrome.storage.local.set({
    companion: { enabled: true, url: 'https://example.com/notes' }
  });
  page.flush();
  assert.equal(frameOf(page).getAttribute('src'), 'https://example.com/notes');
});

test('a frame the page itself blocks says so, rather than staying blank', () => {
  /* Two different failures look identical from outside: the site refusing to
   * be framed, and nextwork.ai's own policy refusing to hold a frame. Unlike
   * the first, the second announces itself, so there is no excuse for showing
   * a white rectangle and leaving it at that. */
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, url: DISCORD } },
    allowed: ['https://discord.com']
  });
  page.flush();
  assert.equal(pane(page).getAttribute('data-state'), 'ready');

  page.doc.dispatchEvent({ type: 'securitypolicyviolation', violatedDirective: 'frame-src', blockedURI: DISCORD });

  assert.equal(pane(page).getAttribute('data-state'), 'page-blocked');
  assert.match(pane(page).querySelector('.nwt-companion-said').textContent,
    /will not allow another site inside it/);
});

test('a policy report about something else is not mistaken for the pane', () => {
  /* The page reports every violation it has, most of which are its own. */
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, url: DISCORD } },
    allowed: ['https://discord.com']
  });
  page.flush();

  [{ violatedDirective: 'img-src', blockedURI: DISCORD },
   { violatedDirective: 'frame-src', blockedURI: 'https://ads.example/x' }
  ].forEach(function (report) {
    page.doc.dispatchEvent(Object.assign({ type: 'securitypolicyviolation' }, report));
  });
  assert.equal(pane(page).getAttribute('data-state'), 'ready',
    'an unrelated policy report was blamed on the pane');
});


test('a link marked for a window is not framed again', () => {
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, url: DISCORD,
      tiles: [{ label: 'Discord', url: DISCORD, windowed: true }] } },
    allowed: ['https://discord.com']
  });
  page.flush();

  assert.equal(pane(page).getAttribute('data-state'), 'windowed');
  assert.equal(frameOf(page).getAttribute('src'), null,
    'a link known to fail in a frame was loaded into one anyway');
  assert.match(pane(page).querySelector('.nwt-companion-said').textContent,
    /set to open in a window of its own/);
});


test('opening a window once does not move the link out of the pane', () => {
  /* One press of "open it in a window" is not a decision about where a link
   * lives. It used to be taken as one - the link was marked and the pane
   * refused to try again - which is the opposite of what a pane on the page
   * is for. */
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, url: DISCORD,
      tiles: [{ label: 'Discord', url: DISCORD }] } },
    allowed: ['https://discord.com']
  });
  page.flush();
  pane(page).querySelector('.nwt-companion-hint').click();
  page.flush();

  assert.equal(page.sent.filter(m => m.type === 'companion:window').length, 1,
    'it did not open the window that was asked for');
  assert.ok(!page.stored.companion.tiles[0].windowed,
    'one press was taken as a decision to stop using the pane');
  assert.equal(pane(page).getAttribute('data-state'), 'ready',
    'the pane stopped showing it');
});

test('a link set to open in a window can be brought back from the pane', () => {
  /* Wherever the setting came from, the way back has to be where you are
   * looking when you notice it. */
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, url: DISCORD,
      tiles: [{ label: 'Discord', url: DISCORD, windowed: true }] } },
    allowed: ['https://discord.com']
  });
  page.flush();
  assert.equal(pane(page).getAttribute('data-state'), 'windowed');

  pane(page).querySelector('.nwt-companion-here').click();
  page.flush();

  assert.ok(!page.stored.companion.tiles[0].windowed, 'the setting was not lifted');
  assert.equal(pane(page).getAttribute('data-state'), 'ready');
  assert.equal(frameOf(page).getAttribute('src'), DISCORD);
});

test('the frame may reach the microphone, or a voice channel cannot connect', () => {
  /* Watching a voice channel while you build was the thing this was asked
   * for. A frame with no microphone cannot join one: the call fails inside
   * their code and the channel never connects, with nothing on the outside to
   * say why. */
  const page = withPane({ url: VIDEO });
  page.flush();
  const allow = frameOf(page).getAttribute('allow') || '';
  ['microphone', 'camera', 'display-capture'].forEach(function (feature) {
    assert.ok(allow.split(/;\s*/).includes(feature),
      'the frame cannot use the ' + feature + '; it may use: ' + allow);
  });
});

test('the frame is allowed what an application needs, minus the tab', () => {
  /* A missing sandbox token is not a polite refusal - the call throws inside
   * their code and the boot stops wherever it got to, which from outside is a
   * rectangle that stays whatever colour their loading screen is. */
  const page = withPane({ url: VIDEO });
  page.flush();
  const sandbox = frameOf(page).getAttribute('sandbox') || '';
  ['allow-scripts', 'allow-same-origin', 'allow-forms', 'allow-popups',
   'allow-modals', 'allow-downloads'].forEach(function (token) {
    assert.ok(sandbox.split(/\s+/).includes(token),
      'the frame is missing ' + token);
  });
  assert.ok(!/allow-top-navigation/.test(sandbox),
    'a page in the pane can replace the tab underneath it');
});

test('the pane comes back when the page tears it out, with its link in it', () => {
  /* The site is a single-page app that rebuilds its body as it navigates, and
   * everything added to it goes with the rebuild. Two faults met here, and
   * between them the pane was a blank rectangle that read as a site refusing
   * to be framed:
   *
   *   - nothing put the pane back, so it stayed gone;
   *   - and when it was rebuilt, the guard that decides whether to load
   *     anything compared against a variable that still held the old address,
   *     so it decided the new empty frame was already showing it.
   */
  const page = withPane({ url: VIDEO });
  page.flush();
  assert.equal(frameOf(page).getAttribute('src'), EMBED, 'precondition');

  /* The page throws it away, as this one does. */
  pane(page).remove();
  assert.equal(pane(page), null);

  page.mutate([{ addedNodes: [] }]);
  page.flush();

  assert.ok(pane(page), 'the pane never came back');
  assert.equal(frameOf(page).getAttribute('src'), EMBED,
    'the pane came back empty, which looks exactly like a site refusing to load');
  assert.equal(pane(page).getAttribute('data-state'), 'ready');
});

test('a rebuilt pane loads a site that needed permission, too', () => {
  /* The same path, through the branch that has to ask first. */
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, url: DISCORD } },
    allowed: ['https://discord.com']
  });
  page.flush();
  assert.equal(frameOf(page).getAttribute('src'), DISCORD, 'precondition');

  pane(page).remove();
  page.mutate([{ addedNodes: [] }]);
  page.flush();

  assert.equal(frameOf(page).getAttribute('src'), DISCORD,
    'the rebuilt pane was left empty');
});

test('a pane still on the page is not reloaded by an unrelated mutation', () => {
  /* The site mutates constantly. Reloading on each one would restart a video
   * every time anything on the page changed. */
  const page = withPane({ url: VIDEO });
  page.flush();
  const frame = frameOf(page);
  let sets = 0;
  const real = frame.setAttribute.bind(frame);
  frame.setAttribute = function (n, v) { if (n === 'src') sets++; return real(n, v); };

  for (let i = 0; i < 5; i++) { page.mutate([{ addedNodes: [] }]); page.flush(); }
  assert.equal(sets, 0, 'the frame was reloaded ' + sets + ' times by page churn');
});

test('a site allowed with no rule behind it says so, instead of a blank frame', () => {
  /* Granted and carried are two different facts and only one was reported. A
   * site could be allowed, the pane could say ready, and the browser could
   * still refuse it - because the rule that removes the framing header was
   * missing. On the page that is a blank rectangle and nothing else, which is
   * indistinguishable from the site refusing, and it cost days. */
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, url: DISCORD } },
    allowed: ['https://discord.com'],
    inert: true
  });
  page.flush();

  assert.equal(pane(page).getAttribute('data-state'), 'blocked');
  assert.equal(frameOf(page).getAttribute('src'), null,
    'it loaded a frame the browser was always going to refuse');
  assert.match(pane(page).querySelector('.nwt-companion-said').textContent,
    /allowed, but the rule that lets it through is not installed/);
});

test('a frame the browser refuses is noticed, because it is given no room', () => {
  /* This is the signal earlier versions said did not exist. A refused frame
   * fires `load` like any other, so waiting for an error catches nothing - but
   * the browser gives it no layout box at all. It collapses to zero while a
   * frame that loaded fills its container. Measuring that is the difference
   * between reporting what happened and showing a black rectangle. */
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, url: DISCORD } },
    allowed: ['https://discord.com']
  });
  page.flush();
  assert.equal(pane(page).getAttribute('data-state'), 'ready', 'precondition');

  /* The browser refuses the next one: no box at the moment it is measured. */
  frameOf(page)._rect = { left: 0, top: 0, width: 0, height: 0 };
  page.chrome.storage.local.set({
    companion: { enabled: true, url: 'https://discord.com/channels/9/9' }
  });
  page.flush();

  assert.equal(pane(page).getAttribute('data-state'), 'blocked',
    'a refused frame was left reported as working');
  assert.match(pane(page).querySelector('.nwt-companion-said').textContent,
    /refused the frame/);
});

test('a frame that did load is left alone', () => {
  /* The same measurement must not condemn a frame that is working, or every
   * video would be replaced by an error message a moment after it started. */
  const page = withPane({ url: VIDEO });
  page.flush();
  assert.equal(pane(page).getAttribute('data-state'), 'ready');
  assert.equal(frameOf(page).getAttribute('src'), EMBED,
    'a frame that loaded was condemned by the same measurement');
});

test('a frame removed before the check does not report anything', () => {
  /* The pane can be torn off the page by the site between setting the address
   * and measuring it. A detached element has no box either, and calling that
   * a refusal would put an error on a pane that was simply rebuilt. */
  const page = withPane({ url: VIDEO });
  page.flush();
  const frame = frameOf(page);
  frame._rect = { left: 0, top: 0, width: 0, height: 0 };
  frame.isConnected = false;
  page.chrome.storage.local.set({
    companion: { enabled: true, url: 'https://www.youtube.com/watch?v=abcdefghijk' }
  });
  page.flush();

  assert.notEqual(pane(page).getAttribute('data-state'), 'blocked',
    'a pane the site had torn out was reported as refused');
});

test('a frame swapped out by something else is rebuilt, not read as ours', () => {
  /* A content blocker does not remove a third-party frame - it swaps in a
   * placeholder of its own. The panel stays, the right size, with an element
   * inside it that this did not build. Every later paint then reads a frame
   * that is not ours: no src to compare, nothing to measure, and a panel
   * reporting itself ready while showing somebody else's notice. */
  const page = withPane({ url: VIDEO });
  page.flush();
  assert.equal(frameOf(page).getAttribute('src'), EMBED, 'precondition');

  /* Something else replaces the frame with one of its own. */
  const ours = frameOf(page);
  const theirs = page.doc.createElement('iframe');
  ours.parentNode.appendChild(theirs);
  ours.remove();
  assert.equal(pane(page).querySelector('.nwt-companion-frame'), null);

  page.chrome.storage.local.set({ hue: 21 });
  page.flush();

  assert.ok(frameOf(page), 'the pane was left holding a frame it did not build');
  assert.equal(frameOf(page).getAttribute('src'), EMBED,
    'it was rebuilt but never given the address again');
});


/* --------------------------------------------------- the split, in panels */

function withSplit(panels, over) {
  return loadContentScript({
    settings: Object.assign({ enabled: true,
      split: Object.assign({ enabled: true, width: 0.36, panels: panels }, over || {}) }, {}),
    allowed: ['https://discord.com']
  });
}
function column(page) { return page.doc.getElementById('nwt-split'); }
function panelsOf(page) {
  const el = column(page);
  return el ? el.querySelectorAll('.nwt-panel') : [];
}
function share(node) { return node.style.getPropertyValue('--nwt-panel-share'); }

test('one panel fills the column', () => {
  /* The common case has to feel like the common case: no furniture suggesting
   * there ought to be more than one. */
  const page = withSplit([{ url: VIDEO }]);
  page.flush();

  assert.ok(page.doc.documentElement.classList.contains('nwt-split-on'),
    'the page did not make room');
  assert.equal(panelsOf(page).length, 1);
  assert.equal(share(panelsOf(page)[0]), '100.000%');
  assert.equal(panelsOf(page)[0].querySelector('.nwt-panel-frame').getAttribute('src'), EMBED);
});

test('three panels divide the column evenly when none has been dragged', () => {
  const page = withSplit([{ url: VIDEO }, { url: DISCORD }, { url: 'https://example.com/' }]);
  page.flush();

  const nodes = panelsOf(page);
  assert.equal(nodes.length, 3);
  nodes.forEach(function (n) { assert.equal(share(n), '33.333%'); });
});

test('a panel that has been sized keeps it, and the rest share what is left', () => {
  const page = withSplit([{ url: VIDEO, size: 0.5 }, { url: DISCORD }, { url: 'https://example.com/' }]);
  page.flush();

  const nodes = panelsOf(page);
  assert.equal(share(nodes[0]), '50.000%');
  assert.equal(share(nodes[1]), '25.000%');
  assert.equal(share(nodes[2]), '25.000%');
});

test('a folded panel gives its share back and loads nothing', () => {
  /* It stays in the stack as a bar you can open again, so the column has no
   * gap in it - and nothing is loaded behind a closed bar, or a video would
   * go on playing where you cannot see it. */
  const page = withSplit([{ url: VIDEO, collapsed: true }, { url: DISCORD }]);
  page.flush();

  const nodes = panelsOf(page);
  assert.equal(nodes.length, 2, 'the folded panel was removed rather than folded');
  assert.equal(nodes[0].getAttribute('data-collapsed'), '1');
  assert.equal(share(nodes[0]), '0.000%');
  assert.equal(share(nodes[1]), '100.000%', 'the space it gave up was left empty');
  assert.equal(nodes[0].querySelector('.nwt-panel-frame').getAttribute('src'), null,
    'a folded panel went on loading behind its bar');
});

test('folding and unfolding is one control on the panel', () => {
  const page = withSplit([{ url: VIDEO }, { url: DISCORD }]);
  page.flush();
  panelsOf(page)[0].querySelector('.nwt-panel-fold').click();
  page.flush();

  assert.equal(page.stored.split.panels[0].collapsed, true);
  assert.equal(page.stored.split.panels[1].collapsed, undefined,
    'folding one panel folded another');
});

test('closing a panel leaves the others, and the last one closes the split', () => {
  const page = withSplit([{ url: VIDEO, size: 0.7 }, { url: DISCORD, size: 0.3 }]);
  page.flush();
  panelsOf(page)[0].querySelector('.nwt-panel-hide').click();
  page.flush();

  assert.equal(page.stored.split.panels.length, 1);
  assert.equal(page.stored.split.panels[0].url, DISCORD);
  assert.equal(page.stored.split.panels[0].size, undefined,
    'it kept a share of a column that had one more panel in it');
  assert.equal(page.stored.split.enabled, true);

  panelsOf(page)[0].querySelector('.nwt-panel-hide').click();
  page.flush();
  assert.equal(page.stored.split.enabled, false,
    'the column stayed open with nothing in it');
});

test('the page gets its width back when the split is turned off', () => {
  const page = withSplit([{ url: VIDEO }]);
  page.flush();
  page.chrome.storage.local.set({ split: { enabled: false, panels: [{ url: VIDEO }] } });
  page.flush();

  assert.equal(column(page), null);
  assert.ok(!page.doc.documentElement.classList.contains('nwt-split-on'),
    'the page was left narrowed with nothing beside it');
  assert.equal(page.doc.documentElement.style.getPropertyValue('--nwt-split-w'), '');
});

test('turning the theme off takes the split with it', () => {
  const page = withSplit([{ url: VIDEO }]);
  page.flush();
  page.chrome.storage.local.set({ enabled: false });
  page.flush();

  assert.equal(column(page), null);
  assert.ok(!page.doc.documentElement.classList.contains('nwt-split-on'));
});

test('a column width dragged past either edge is brought back', () => {
  const wide = withSplit([{ url: VIDEO }], { width: 5 });
  wide.flush();
  assert.equal(wide.doc.documentElement.style.getPropertyValue('--nwt-split-w'),
    Math.round(wide.window.innerWidth * 0.72) + 'px');

  const thin = withSplit([{ url: VIDEO }], { width: 0.001 });
  thin.flush();
  assert.equal(thin.doc.documentElement.style.getPropertyValue('--nwt-split-w'),
    Math.round(thin.window.innerWidth * 0.18) + 'px');
});

test('a refused panel offers to go beside the page, and closes when taken', () => {
  const page = loadContentScript({
    settings: { enabled: true, split: { enabled: true,
      panels: [{ url: 'https://discord.com/channels/1432837534118838355/99' }] } }
  });
  page.flush();
  const node = panelsOf(page)[0];

  assert.equal(node.getAttribute('data-state'), 'blocked');
  assert.equal(node.getAttribute('data-instead'), '1', 'no way forward was offered');

  node.querySelector('.nwt-panel-instead').click();
  page.flush();

  const asked = page.sent.filter(m => m.type === 'companion:dock');
  assert.equal(asked.length, 1, 'the button did not lead anywhere');
  assert.ok(asked[0].screen.width > 0, 'it asked without saying how big the screen is');
  assert.equal(page.stored.split.panels.length, 0,
    'the panel stayed, holding a frame for something now beside the page');
});

test('a panel whose frame something else swapped out is rebuilt', () => {
  const page = withSplit([{ url: VIDEO }]);
  page.flush();
  assert.equal(panelsOf(page)[0].querySelector('.nwt-panel-frame').getAttribute('src'), EMBED);

  panelsOf(page)[0].querySelector('.nwt-panel-frame').remove();
  page.chrome.storage.local.set({ hue: 31 });
  page.flush();

  const frame = panelsOf(page)[0].querySelector('.nwt-panel-frame');
  assert.ok(frame, 'the panel was left without a frame');
  assert.equal(frame.getAttribute('src'), EMBED, 'it was rebuilt but never given the address');
});

test('page churn does not reload a panel that is already right', () => {
  const page = withSplit([{ url: VIDEO }]);
  page.flush();
  const frame = panelsOf(page)[0].querySelector('.nwt-panel-frame');
  let sets = 0;
  const real = frame.setAttribute.bind(frame);
  frame.setAttribute = function (n, v) { if (n === 'src') sets++; return real(n, v); };

  for (let i = 0; i < 4; i++) { page.chrome.storage.local.set({ hue: 40 + i }); page.flush(); }
  assert.equal(sets, 0, 'the panel was reloaded ' + sets + ' times by unrelated changes');
});

test('the split and the floating pane are separate and can both be on', () => {
  const page = loadContentScript({
    settings: { enabled: true,
      split: { enabled: true, panels: [{ url: VIDEO }] },
      companion: { enabled: true, url: VIDEO } }
  });
  page.flush();
  assert.ok(column(page), 'the split is missing');
  assert.ok(page.doc.getElementById('nwt-companion'), 'the pane is missing');
});

test('a split with no panels is not drawn at all', () => {
  /* Rather than an empty column taking a third of the window. */
  const page = withSplit([]);
  page.flush();
  assert.equal(column(page), null);
  assert.ok(!page.doc.documentElement.classList.contains('nwt-split-on'));
});

/* ------------------------------------------------- more than one pane */

function panesOf(page) { return page.doc.querySelectorAll('.nwt-companion'); }

test('two panes are drawn, each with its own address', () => {
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, panes: [
      { url: VIDEO }, { url: DISCORD }] } },
    allowed: ['https://discord.com']
  });
  page.flush();

  const els = panesOf(page);
  assert.equal(els.length, 2);
  assert.equal(els[0].querySelector('.nwt-companion-frame').getAttribute('src'), EMBED);
  assert.equal(els[1].querySelector('.nwt-companion-frame').getAttribute('src'), DISCORD);
});

test('a second pane does not land exactly on the first', () => {
  /* Two panes in the same place read as one pane and a click that did
   * nothing. */
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, panes: [
      { url: VIDEO }, { url: DISCORD }] } },
    allowed: ['https://discord.com']
  });
  page.flush();
  const els = panesOf(page);
  assert.notEqual(els[0].style.right, els[1].style.right,
    'they were stacked in the same corner');
});

test('closing one pane leaves the other, and the last one turns the feature off', () => {
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, panes: [
      { url: VIDEO }, { url: DISCORD }] } },
    allowed: ['https://discord.com']
  });
  page.flush();
  panesOf(page)[0].querySelector('.nwt-companion-hide').click();
  page.flush();

  assert.equal(page.stored.companion.panes.length, 1);
  assert.equal(page.stored.companion.panes[0].url, DISCORD, 'it closed the wrong one');
  assert.equal(page.stored.companion.enabled, true);

  panesOf(page)[0].querySelector('.nwt-companion-hide').click();
  page.flush();
  assert.equal(page.stored.companion.enabled, false,
    'the last pane closed and the feature stayed on with nothing to show');
});

test('settings written before panes existed still show something', () => {
  /* The list came after a single address. A page open while an older version
   * wrote there would otherwise show nothing and look like the feature had
   * been taken away. */
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, url: VIDEO } }
  });
  page.flush();
  assert.equal(panesOf(page).length, 1);
  assert.equal(panesOf(page)[0].querySelector('.nwt-companion-frame').getAttribute('src'), EMBED);
});

test('each pane knows which one it is, so a move writes to its own entry', () => {
  /* Dragging and resizing both write through that index. Without it every
   * pane would write to the same place and moving one would move them all. */
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, panes: [
      { url: VIDEO }, { url: DISCORD }] } },
    allowed: ['https://discord.com']
  });
  page.flush();
  const els = panesOf(page);
  assert.deepEqual([els[0].getAttribute('data-index'), els[1].getAttribute('data-index')],
    ['0', '1']);
  assert.notEqual(els[0].id, els[1].id, 'two panes shared one id');
});

test('a pane that has been closed is taken off the page', () => {
  /* The list is the truth. A pane left behind after its entry went would sit
   * there with no way to close it, since its corner writes to an entry that
   * no longer exists. */
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, panes: [
      { url: VIDEO }, { url: DISCORD }] } },
    allowed: ['https://discord.com']
  });
  page.flush();
  assert.equal(panesOf(page).length, 2);

  page.chrome.storage.local.set({
    companion: { enabled: true, panes: [{ url: VIDEO }] }
  });
  page.flush();

  assert.equal(panesOf(page).length, 1, 'a closed pane was left on the page');
  assert.equal(panesOf(page)[0].querySelector('.nwt-companion-frame').getAttribute('src'), EMBED);
});

test('a pane can be folded to its bar and opened again', () => {
  /* Getting something out of the way for a minute should not mean closing it
   * and setting it up again. */
  const page = withPane({ url: VIDEO });
  page.flush();
  assert.equal(frameOf(page).getAttribute('src'), EMBED);

  pane(page).querySelector('.nwt-companion-fold').click();
  page.flush();

  assert.equal(page.stored.companion.panes[0].collapsed, true);
  assert.equal(pane(page).getAttribute('data-collapsed'), '1');
  assert.equal(frameOf(page).getAttribute('src'), null,
    'it went on loading behind a closed bar');

  pane(page).querySelector('.nwt-companion-fold').click();
  page.flush();
  assert.equal(pane(page).getAttribute('data-collapsed'), '0');
  assert.equal(frameOf(page).getAttribute('src'), EMBED, 'it did not come back');
});

test('folding one pane does not fold another', () => {
  const page = loadContentScript({
    settings: { enabled: true, companion: { enabled: true, panes: [
      { url: VIDEO }, { url: DISCORD }] } },
    allowed: ['https://discord.com']
  });
  page.flush();
  panesOf(page)[0].querySelector('.nwt-companion-fold').click();
  page.flush();

  assert.equal(page.stored.companion.panes[0].collapsed, true);
  assert.ok(!page.stored.companion.panes[1].collapsed, 'it folded both');
});

test('a pane pointed at YouTube itself asks which video, in the pane', () => {
  /* Loading the front page would fail, and reporting that as a refusal would
   * be reporting the wrong thing. The panel asks instead. */
  const page = withPane({ url: 'https://www.youtube.com' });
  page.flush();

  assert.equal(pane(page).getAttribute('data-state'), 'ask');
  assert.equal(frameOf(page).getAttribute('src'), null,
    'it loaded a front page that cannot be embedded');
  assert.ok(pane(page).querySelector('.nwt-companion-ask-input'),
    'there is nowhere to say which video');
});

test('pasting a video into the pane plays it there', () => {
  const page = withPane({ url: 'https://www.youtube.com' });
  page.flush();
  const form = pane(page).querySelector('.nwt-companion-ask-link');
  pane(page).querySelector('.nwt-companion-ask-input').value = VIDEO;
  form.dispatchEvent(Object.assign({ type: 'submit' },
    { preventDefault() {}, stopPropagation() {} }));
  page.flush();

  assert.equal(page.stored.companion.panes[0].url, VIDEO);
  assert.equal(pane(page).getAttribute('data-state'), 'ready');
  assert.equal(frameOf(page).getAttribute('src'), EMBED);
});

test('a doorway pasted into the doorway is refused rather than looping', () => {
  const page = withPane({ url: 'https://www.youtube.com' });
  page.flush();
  const field = pane(page).querySelector('.nwt-companion-ask-input');
  field.value = 'https://www.youtube.com';
  pane(page).querySelector('.nwt-companion-ask-link').dispatchEvent(
    Object.assign({ type: 'submit' }, { preventDefault() {}, stopPropagation() {} }));
  page.flush();

  assert.equal(field.getAttribute('aria-invalid'), 'true');
  assert.equal(pane(page).getAttribute('data-state'), 'ask', 'it accepted the same doorway');
});

test('a split panel pointed at YouTube itself asks in the panel', () => {
  const page = loadContentScript({
    settings: { enabled: true, split: { enabled: true,
      panels: [{ url: 'https://www.youtube.com' }] } }
  });
  page.flush();
  const node = page.doc.getElementById('nwt-split').querySelector('.nwt-panel');

  assert.equal(node.getAttribute('data-state'), 'ask');
  node.querySelector('.nwt-panel-ask-input').value = VIDEO;
  node.querySelector('.nwt-panel-ask-link').dispatchEvent(
    Object.assign({ type: 'submit' }, { preventDefault() {}, stopPropagation() {} }));
  page.flush();

  assert.equal(page.stored.split.panels[0].url, VIDEO);
  assert.equal(page.doc.getElementById('nwt-split')
    .querySelector('.nwt-panel-frame').getAttribute('src'), EMBED);
});
