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
  const env = loadBackground({ settings: { enabled: false } });
  env.change({ enabled: { newValue: false } }, 'local');
  env.flush();
  assert.strictEqual(env.badge.text, 'off');
  assert.match(env.badge.title, /off/i);
});

test('the badge is empty when the theme is on and no timer runs', () => {
  const env = loadBackground({ settings: { enabled: true } });
  env.change({ enabled: { newValue: true } }, 'local');
  env.flush();
  assert.strictEqual(env.badge.text, '', 'an idle badge should show nothing');
});

test('a running timer takes the badge over', () => {
  /* The badge used to count down in minutes with nothing ticking it, so it
   * froze at the number it started with. It now reports that a session is
   * running and leaves the live count to the pill on the page. */
  const env = loadBackground({ settings: { enabled: true, focus: running() } });
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
  const env = loadBackground({ settings: { enabled: true, focus: over } });
  env.change({ focus: { newValue: over } }, 'local');
  env.flush();
  const overText = env.badge.text;
  const overColour = env.badge.color;

  const env2 = loadBackground({ settings: { enabled: true, focus: running() } });
  env2.change({ focus: { newValue: running() } }, 'local');
  env2.flush();

  assert.notStrictEqual(overText, env2.badge.text,
    'over and under should not look the same on the badge');
  assert.notStrictEqual(overColour, env2.badge.color);
});

test('a paused timer does not claim to be running', () => {
  const paused = running({ running: false });
  const env = loadBackground({ settings: { enabled: true, focus: paused } });
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

  assert.ok(env.stored.themeId, 'no theme was seeded');
  assert.ok(env.stored.options, 'no options were seeded');
  assert.ok(env.stored.schema > 0, 'the schema was not migrated');
  assert.strictEqual(env.stored.migrated, undefined,
    'the migration flag was written to storage, where it is not a setting');
});

test('seeding keeps what the user already chose', () => {
  const env = loadBackground({ settings: { themeId: 'tokyoNight', enabled: false } });
  env.install();
  env.flush();
  assert.strictEqual(env.stored.themeId, 'tokyoNight', 'the chosen theme was overwritten');
  assert.strictEqual(env.stored.enabled, false, 'the chosen state was overwritten');
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
  const env = loadBackground({ settings: { enabled: true }, lastError: { message: 'nope' } });
  env.badge.text = 'sentinel';
  assert.doesNotThrow(() => {
    env.change({ enabled: { newValue: true } }, 'local');
    env.flush();
  });
  assert.strictEqual(env.badge.text, 'sentinel',
    'the badge was painted from a read that failed');
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
