/* Tests for the background worker.
 *
 * It owns three things: the defaults written on install, the keyboard
 * shortcut, and the toolbar badge. All three are invisible when they work and
 * confusing when they do not - a badge that reports the wrong state is worse
 * than no badge, because it is believed.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadBackground } = require('./harness');

/* A timer that started five minutes ago and runs for 25. */
function running(overrides) {
  return Object.assign({
    enabled: true,
    running: true,
    startedAt: Date.now() - 5 * 60 * 1000,
    accumulatedMs: 0,
    targetMin: 25
  }, overrides || {});
}

test('the badge reports the theme being off', () => {
  /* Starts on, so this is a transition rather than a restatement. */
  const env = loadBackground({ settings: { enabled: true } });
  env.change({ enabled: { newValue: false } }, 'local');
  env.flush();
  assert.strictEqual(env.badge.text, 'off');
  assert.match(env.badge.title, /off/i);
});

test('the badge is empty when the theme is on and no timer runs', () => {
  const env = loadBackground({ settings: { enabled: false } });
  env.change({ enabled: { newValue: true } }, 'local');
  env.flush();
  assert.strictEqual(env.badge.text, '', 'an idle badge should show nothing');
});

test('a running timer takes the badge over', () => {
  /* The badge used to count down in minutes with nothing ticking it, so it
   * froze at the number it started with. It now reports that a session is
   * running and leaves the live count to the pill on the page. */
  const env = loadBackground({ settings: { enabled: true } });
  env.change({ focus: { newValue: running() } }, 'local');
  env.flush();
  assert.notStrictEqual(env.badge.text, '', 'a running timer should show on the badge');
  assert.notStrictEqual(env.badge.text, 'off');
  assert.match(env.badge.title, /focus/i);
});

test('running past zero is shown differently from running', () => {
  /* The timer counts past its target rather than stopping, so going over has
   * to be distinguishable from still having time. */
  const over = running({ startedAt: Date.now() - 40 * 60 * 1000 });
  const env = loadBackground({ settings: { enabled: true } });
  env.change({ focus: { newValue: over } }, 'local');
  env.flush();
  const overText = env.badge.text;
  const overColour = env.badge.color;

  const env2 = loadBackground({ settings: { enabled: true } });
  env2.change({ focus: { newValue: running() } }, 'local');
  env2.flush();

  assert.notStrictEqual(overText, env2.badge.text,
    'over and under should not look the same on the badge');
  /* Deep, not strict. The badge colour is a string today and comparing by
   * value is the same either way, but an array would compare by identity and
   * two equal arrays would pass. */
  assert.notDeepStrictEqual(overColour, env2.badge.color);
});

test('a paused timer does not claim to be running', () => {
  const paused = running({ running: false });
  const env = loadBackground({ settings: { enabled: true, focus: running() } });
  env.change({ focus: { newValue: paused } }, 'local');
  env.flush();
  assert.strictEqual(env.badge.text, '', 'a paused timer should not hold the badge');
});

test('the shortcut flips the theme, and only for its own command', () => {
  const env = loadBackground({ settings: { enabled: true } });
  env.command('toggle-theme');
  env.flush();
  assert.strictEqual(env.stored.enabled, false, 'the shortcut did not turn it off');

  env.command('toggle-theme');
  env.flush();
  assert.strictEqual(env.stored.enabled, true, 'the shortcut did not turn it back on');

  /* Chrome delivers every command to every listener. */
  env.command('some-other-command');
  env.flush();
  assert.strictEqual(env.stored.enabled, true,
    'an unrelated command changed the theme');
});

test('install seeds the defaults and leaves no migration flag behind', () => {
  /* A stale schema, so the migration actually runs and sets its flag. That
   * flag tells the caller to persist the result; it is not a setting, and
   * writing it to storage leaves a key nothing ever reads. */
  const env = loadBackground({ settings: { schema: 0, themeId: 'concrete' } });
  env.install();
  env.flush();

  /* Named keys with usable values, not merely "something is there": an empty
   * options object would satisfy a truthiness check and seed nothing. */
  assert.ok(env.stored.themeId, 'no theme was seeded');
  assert.strictEqual(typeof env.stored.enabled, 'boolean', 'enabled was not seeded');
  assert.ok(env.stored.focus && typeof env.stored.focus.targetMin === 'number',
    'the focus defaults were not seeded');
  assert.ok(env.stored.options && Object.keys(env.stored.options).length > 5,
    'the options defaults were not seeded');
  assert.strictEqual(env.stored.options.rescuePanels, true,
    'a known option default is missing');
  assert.ok(env.stored.schema > 0, 'the schema was not migrated');
  assert.strictEqual(env.stored.migrated, undefined,
    'the migration flag was written to storage, where it is not a setting');
});

test('the badge is painted at startup, before anything changes', () => {
  /* Every other test here begins with a storage change. Without this one,
   * removing the worker's startup refresh would pass them all, and a browser
   * launched with the theme off would show a blank or stale badge until
   * something else happened to change. */
  const env = loadBackground({ settings: { enabled: false } });
  env.badge.text = 'sentinel';
  env.startup();
  env.flush();
  assert.strictEqual(env.badge.text, 'off',
    'the badge was not painted when the browser started');
});

test('a fresh install gets the default theme by name', () => {
  /* Every other install test supplies a theme id, so removing the default
   * would leave a fresh install with no theme and still pass them. */
  const env = loadBackground({ settings: {} });
  env.install();
  env.flush();
  assert.strictEqual(env.stored.themeId, 'concrete',
    'a fresh install did not get the default theme');
});

test('seeding keeps what the user already chose', () => {
  /* More than the theme: seeding merges defaults under what is already
   * there, so anything the user set has to come back out unchanged. */
  const env = loadBackground({ settings: {
    themeId: 'tokyoNight',
    enabled: false,
    options: { dimImages: 30 },
    focus: { targetMin: 45 }
  } });
  env.install();
  env.flush();
  assert.strictEqual(env.stored.themeId, 'tokyoNight', 'the chosen theme was overwritten');
  assert.strictEqual(env.stored.enabled, false, 'the chosen state was overwritten');
  assert.strictEqual(env.stored.options.dimImages, 30, 'a chosen option was overwritten');
  assert.strictEqual(env.stored.focus.targetMin, 45, 'a chosen session length was overwritten');
});

test('the badge ignores changes from another storage area', () => {
  /* sync and session deliver to the same listener. Acting on those would
   * repaint the badge from settings that are not the ones in use. */
  const env = loadBackground({ settings: { enabled: true } });
  env.change({ enabled: { newValue: true } }, 'local');
  env.flush();
  const before = env.badge.text;

  env.badge.text = 'sentinel';
  env.change({ enabled: { newValue: false } }, 'sync');
  env.flush();
  assert.strictEqual(env.badge.text, 'sentinel',
    'a change in another area repainted the badge');
  assert.strictEqual(before, '');
});

test('an unrelated key does not repaint the badge', () => {
  const env = loadBackground({ settings: { enabled: true } });
  env.flush();
  env.badge.text = 'sentinel';
  env.change({ tuningOverrides: { newValue: {} } }, 'local');
  env.flush();
  assert.strictEqual(env.badge.text, 'sentinel',
    'a dial change repainted the badge for no reason');
});

test('a storage error is checked rather than walked past', () => {
  /* Reading chrome.storage after an error gives undefined, and building a
   * badge out of that used to throw inside the callback where nothing
   * reports it. */
  const env = loadBackground({ settings: { enabled: true } });
  env.failNextRead();
  env.badge.text = 'sentinel';
  assert.doesNotThrow(() => {
    env.change({ enabled: { newValue: false } }, 'local');
    env.flush();
  });
  assert.strictEqual(env.badge.text, 'sentinel',
    'the badge was painted from a read that failed');

  /* And the next read works, because the error was for that call only. */
  env.change({ enabled: { newValue: false } }, 'local');
  env.flush();
  assert.strictEqual(env.badge.text, 'off',
    'the worker did not recover after one failed read');
});

test('the service worker path loads its libraries by name', () => {
  /* Chromium runs this as a service worker and pulls the libraries in with
   * importScripts; Firefox lists them in the manifest instead. The audit
   * allows the call only when every argument is a bare local filename, so
   * that is what it has to pass. */
  const env = loadBackground({ serviceWorker: true, settings: { enabled: true } });
  assert.deepStrictEqual(env.imported,
    ['wallpapers.js', 'scenes.js', 'theme-engine.js']);
  env.change({ enabled: { newValue: true } }, 'local');
  env.flush();
  assert.strictEqual(env.badge.text, '', 'the worker did not run after importing');
});

/* ------------------------------- letting a site be shown inside the pane */
/* This is the only place the extension changes what the browser does with
 * someone else's response, so what it does and how far it reaches are worth
 * more scrutiny than the rest of the file put together. */

const DISCORD = 'https://discord.com/channels/1/2';

