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

test('nothing is allowed until it is asked for', () => {
  const bg = loadBackground();
  assert.deepEqual(bg.rules(), [], 'a rule existed before anyone granted anything');
  assert.deepEqual(bg.send({ type: 'companion:allowed', url: DISCORD }),
                   { allowed: false, active: false, origin: 'https://discord.com' });
});

test('allowing a site installs one rule, and only for the pane', () => {
  /* The whole safety of this rests on the two conditions below. Without
   * `initiatorDomains` the site loses its framing protection everywhere on the
   * web; without `sub_frame` it loses it on pages you navigate to normally. */
  const bg = loadBackground();
  assert.deepEqual(bg.send({ type: 'companion:allow', url: DISCORD }),
                   { allowed: true, origin: 'https://discord.com' });

  const rules = bg.rules();
  assert.equal(rules.length, 1);
  assert.deepEqual(rules[0].condition.resourceTypes, ['sub_frame'],
    'the rule applies to whole pages, not just frames');
  assert.deepEqual(rules[0].condition.requestDomains, ['discord.com']);
  /* What confines this is not a condition in the rule. `modifyHeaders` is
   * applied only where the extension holds host access to both ends of the
   * request, and the only initiator it holds is nextwork.ai. An
   * `initiatorDomains` clause restating that was carried here for a while; it
   * added nothing the browser was not already enforcing, and it could fail to
   * match while looking perfectly correct in the rule list. */
  assert.equal(rules[0].condition.initiatorDomains, undefined,
    'the rule carries a condition that only restates the permission model');
});

test('the rule only removes headers, and only the framing ones', () => {
  const bg = loadBackground();
  bg.send({ type: 'companion:allow', url: DISCORD });
  const action = bg.rules()[0].action;

  assert.equal(action.type, 'modifyHeaders');
  assert.equal(action.requestHeaders, undefined, 'it changes the request on its way out');
  assert.deepEqual(action.responseHeaders.map(h => h.operation), ['remove', 'remove', 'remove'],
    'a header is set or added rather than removed');
  assert.deepEqual(action.responseHeaders.map(h => h.header),
    ['x-frame-options', 'content-security-policy', 'content-security-policy-report-only']);
});

test('the extension cannot grant itself anything', () => {
  /* The browser asks, and the answer is the browser's. Refusing has to leave
   * no rule behind, or the permission and what is enforced disagree. */
  const bg = loadBackground();
  bg.refuseGrants();
  assert.deepEqual(bg.send({ type: 'companion:allow', url: DISCORD }), { allowed: false });
  assert.deepEqual(bg.rules(), [], 'a rule was installed for a permission that was refused');
  assert.deepEqual(bg.granted(), []);
});

test('taking a site back removes its rule', () => {
  const bg = loadBackground();
  bg.send({ type: 'companion:allow', url: DISCORD });
  assert.equal(bg.rules().length, 1);

  assert.deepEqual(bg.send({ type: 'companion:forget', url: DISCORD }), { allowed: false });
  assert.deepEqual(bg.rules(), [], 'the rule outlived the permission it came from');
  assert.deepEqual(bg.granted(), []);
});

test('a permission taken back in the browser takes its rule with it', () => {
  /* Revoking from the browser's own settings tells the extension nothing but
   * this event. A rule that survived it would be a header quietly missing
   * from a site nobody had allowed. */
  const bg = loadBackground({ origins: ['https://discord.com/*'] });
  bg.startup();
  assert.equal(bg.rules().length, 1, 'precondition: a granted site has its rule');

  bg.chrome.permissions.remove({ origins: ['https://discord.com/*'] }, function () {});
  bg.flush();
  assert.deepEqual(bg.rules(), []);
});

test('the rules are rebuilt from the browser, not from what was stored', () => {
  /* Two grants must not leave two rules for one site, and a site the browser
   * no longer reports must not keep one. */
  const bg = loadBackground();
  bg.send({ type: 'companion:allow', url: DISCORD });
  bg.send({ type: 'companion:allow', url: 'https://discord.com/channels/9/9' });
  assert.equal(bg.rules().length, 1, 'granting the same site twice left two rules');
});

test('nextwork.ai is never given a rule of its own', () => {
  /* It is the page the pane sits on. Stripping its headers would weaken the
   * site being themed, which is the one thing this must not touch. */
  const bg = loadBackground({ origins: ['https://nextwork.ai/*', 'https://discord.com/*'] });
  bg.startup();
  const domains = bg.rules().map(r => r.condition.requestDomains[0]);
  assert.deepEqual(domains, ['discord.com']);
});

test('an address that is not https is refused before anything is asked', () => {
  const bg = loadBackground();
  ['http://discord.com', 'javascript:alert(1)', 'not a url', ''].forEach(function (bad) {
    assert.deepEqual(bg.send({ type: 'companion:allow', url: bad }), { allowed: false },
      JSON.stringify(bad) + ' was accepted');
  });
  assert.deepEqual(bg.rules(), []);
  assert.deepEqual(bg.granted(), []);
});

test('the pane can ask for a page that is able to raise the prompt', () => {
  /* A content script cannot show the browser's permission prompt, so it hands
   * the site over and the extension opens a page that can, with the site
   * written down for it. */
  const bg = loadBackground();
  assert.deepEqual(bg.send({ type: 'companion:ask', url: DISCORD }), { opened: true });
  assert.equal(bg.stored.companion.pending, DISCORD,
    'the site was not written down, so the page would open asking about nothing');
  assert.equal(bg.pagesOpened().length, 1,
    'no page was opened, so the prompt could never be raised');
});

test('a window is opened at the size the pane was left', () => {
  const bg = loadBackground();
  assert.deepEqual(bg.send({ type: 'companion:window', url: DISCORD, w: 500, h: 400 }),
                   { opened: true, reused: false });
  const win = bg.windowsOpened()[0];
  assert.equal(win.url, DISCORD);
  assert.equal(win.type, 'popup');
  assert.deepEqual([win.width, win.height], [500, 400]);
});

test('a window size out of any sane range is clamped rather than obeyed', () => {
  /* This comes from storage, and a window of nine thousand pixels is not one
   * anybody can find again. */
  const bg = loadBackground();
  bg.send({ type: 'companion:window', url: DISCORD, w: 99999, h: -5 });
  const win = bg.windowsOpened()[0];
  assert.ok(win.width <= 1600 && win.width >= 320, 'width was ' + win.width);
  assert.ok(win.height <= 1200 && win.height >= 240, 'height was ' + win.height);
});

test('a message that is not the pane is left alone', () => {
  /* The listener shares the worker with everything else. Replying to messages
   * it does not own would break whatever sent them. */
  const bg = loadBackground();
  assert.equal(bg.send({ type: 'something:else' }), undefined);
  assert.equal(bg.send({}), undefined);
});

test('two allowed sites get two rules, with ids that cannot collide', () => {
  /* The id used to be a hash of the host folded into 900,000 buckets. Two
   * hosts landing on the same number produced two rules with one id, which the
   * browser rejects as a batch - so an unlucky pair of sites would have
   * uninstalled every rule, including the ones that were working, silently. */
  const bg = loadBackground({
    origins: ['https://discord.com/*', 'https://notion.so/*', 'https://figma.com/*']
  });
  bg.startup();

  const rules = bg.rules();
  assert.equal(rules.length, 3);
  assert.equal(new Set(rules.map(r => r.id)).size, 3, 'two rules share an id');
  assert.deepEqual(rules.map(r => r.condition.requestDomains[0]).sort(),
                   ['discord.com', 'figma.com', 'notion.so']);
});

test('an all-sites grant is dropped rather than turned into a rule for the web', () => {
  /* The manifest asks for optional access to https sites, and a browser has
   * its own ways to grant all of them at once. That comes back as a wildcard,
   * and a rule built around one would strip framing headers everywhere. */
  const bg = loadBackground({
    origins: ['https://*/*', 'https://*.discord.com/*', '<all_urls>',
              'http://discord.com/*', 'https://discord.com/*',
              /* Not wildcards, but not hostnames either. The outer shape check
               * lets these through, so something has to look at the host. */
              'https://not a host/*', 'https://-lead.example/*',
              'https://trail-.example/*', 'https://no-dot/*',
              'https://under_score.example/*', 'https:///*']
  });
  bg.startup();

  assert.deepEqual(bg.rules().map(r => r.condition.requestDomains[0]), ['discord.com'],
    'something other than a plain https host was made into a rule');
});

test('a site that merely contains nextwork.ai in its name is not mistaken for it', () => {
  /* The exclusion was a substring test, so it also skipped a different site
   * that happened to have the name inside it - which belongs to somebody
   * else and would silently never be allowed. */
  const bg = loadBackground({
    origins: ['https://nextwork.ai.example/*', 'https://app.nextwork.ai/*']
  });
  bg.startup();
  assert.deepEqual(bg.rules().map(r => r.condition.requestDomains[0]),
                   ['nextwork.ai.example']);
});

test('the same link is brought forward rather than opened twice', () => {
  /* Two windows of the same thing is the opposite of keeping one thing in
   * view beside your work. */
  const bg = loadBackground();
  assert.deepEqual(bg.send({ type: 'companion:window', url: DISCORD }),
                   { opened: true, reused: false });
  assert.deepEqual(bg.send({ type: 'companion:window', url: DISCORD }),
                   { opened: true, reused: true });

  assert.equal(bg.windowsOpened().length, 1, 'it opened a second window');
  assert.equal(bg.windowsFocused().length, 1, 'it did not bring the first one forward');
  assert.equal(bg.windowsFocused()[0].options.focused, true);
});

test('a different link gets a window of its own', () => {
  const bg = loadBackground();
  bg.send({ type: 'companion:window', url: DISCORD });
  bg.send({ type: 'companion:window', url: 'https://example.com/notes' });
  assert.equal(bg.windowsOpened().length, 2);
});

test('closing the window means the next click opens a new one', () => {
  /* The id is remembered, and a remembered id for a window that is gone would
   * mean the link could never be opened again. */
  const bg = loadBackground();
  bg.send({ type: 'companion:window', url: DISCORD });
  bg.closeWindow(1);

  assert.deepEqual(bg.send({ type: 'companion:window', url: DISCORD }),
                   { opened: true, reused: false });
  assert.equal(bg.windowsOpened().length, 2);
});

test('a window closed without us hearing is recovered from, not given up on', () => {
  /* The event can be missed - a worker that was asleep gets no backlog. The
   * update fails, and that failure has to become a new window rather than a
   * click that does nothing at all. */
  const bg = loadBackground();
  bg.send({ type: 'companion:window', url: DISCORD });
  bg.forgetWindowQuietly(1);

  assert.deepEqual(bg.send({ type: 'companion:window', url: DISCORD }),
                   { opened: true, reused: false });
  assert.equal(bg.windowsOpened().length, 2, 'the click did nothing');
});

test('the rules are put back when the extension is reloaded', () => {
  /* Dynamic rules outlive the worker, so building them once looked like
   * enough. A rule that failed to install leaves nothing behind, and nothing
   * was ever going to try again: onStartup fires when the browser starts, not
   * when the extension is reloaded. So a site could be granted, the popup
   * could say so, and no rule existed - which from the page looks exactly like
   * the site refusing. */
  const bg = loadBackground({ origins: ['https://discord.com/*'] });
  bg.install();
  bg.flush();
  assert.equal(bg.rules().length, 1, 'reloading did not put the rule back');
});

test('a site that is granted with no rule behind it is reported, not hidden', () => {
  /* Permission held and rule installed are two different things, and the gap
   * between them is invisible from the page. */
  const bg = loadBackground({ origins: ['https://discord.com/*'] });
  bg.flush();
  const ok = bg.send({ type: 'companion:allowed', url: DISCORD });
  assert.deepEqual([ok.allowed, ok.active], [true, true],
    'the worker did not install the rule for a site already granted');

  /* The state the fault produced: the permission held, the rule gone. */
  bg.chrome.declarativeNetRequest.updateDynamicRules(
    { removeRuleIds: bg.rules().map(r => r.id), addRules: [] }, function () {});
  const gap = bg.send({ type: 'companion:allowed', url: DISCORD });
  assert.equal(gap.allowed, true);
  assert.equal(gap.active, false,
    'it reported a rule that does not exist, which is what made this invisible');
});

/* ------------------------------------------------------------ side by side */
/* The answer to the thing a frame could not do. A site refusing to be shown
 * inside another page is not refusing to exist beside one, and a window of its
 * own is not an embedding - so it signs in and behaves as it does in a tab. */

const SCREEN = { left: 0, top: 0, width: 1600, height: 900 };

test('the page keeps the left of the screen and the companion takes the right', () => {
  const bg = loadBackground();
  const out = bg.send({ type: 'companion:dock', url: DISCORD, screen: SCREEN });
  assert.equal(out.docked, true);

  const page = bg.hostWindow();
  const side = bg.windowsOpened()[0];
  assert.equal(page.left, 0, 'the page did not move to the left edge');
  assert.equal(page.height, 900);
  assert.equal(side.left, page.width, 'the two overlap or leave a gap');
  assert.equal(page.width + side.width, SCREEN.width,
    'together they do not fill the screen');
  assert.equal(side.url, DISCORD);
});

test('a maximised window is taken out of that state before it is moved', () => {
  /* Bounds are ignored while a window is maximised, so setting them first
   * does nothing at all and the page stays full width under the companion. */
  const bg = loadBackground();
  bg.send({ type: 'companion:dock', url: DISCORD, screen: SCREEN });

  const updates = bg.windowsFocused().filter(u => u.id === 7);
  assert.ok(updates.length >= 2, 'the window was moved in a single update');
  assert.equal(updates[0].options.state, 'normal',
    'it was moved while still maximised, which a browser ignores');
  assert.ok(updates[1].options.width > 0, 'nothing set the bounds afterwards');
});

test('neither half is left too narrow to use', () => {
  /* The split is a proportion, and a proportion of a small screen is not.
   * 820 is the width that catches it: 62% is 508, which leaves the companion
   * 312 - under its floor - so the page has to give some back. Written with
   * the floors in the wrong order the page keeps 480 and the companion gets
   * 340 on this screen but less than its floor on smaller ones. */
  const bg = loadBackground();
  bg.send({ type: 'companion:dock', url: DISCORD,
            screen: { left: 0, top: 0, width: 820, height: 700 } });
  const page = bg.hostWindow();
  const side = bg.windowsOpened()[0];
  assert.ok(page.width >= 480, 'the page was squeezed to ' + page.width);
  assert.ok(side.width >= 320, 'the companion was squeezed to ' + side.width);
  assert.equal(page.width + side.width, 820);
});

test('a screen too small for both floors is halved rather than faked', () => {
  /* Below the width where both minimums can hold, one of them has to give.
   * Splitting it evenly is at least predictable; quietly handing the whole
   * floor to one side and the remainder to the other is not. */
  const bg = loadBackground();
  bg.send({ type: 'companion:dock', url: DISCORD,
            screen: { left: 0, top: 0, width: 700, height: 600 } });
  const page = bg.hostWindow();
  const side = bg.windowsOpened()[0];
  assert.equal(page.width, 350);
  assert.ok(Math.abs(page.width - side.width) <= 1,
    'one side was given its floor and the other whatever was left');
});

test('undocking puts the page window back where it was', () => {
  const bg = loadBackground();
  const before = bg.hostWindow();
  bg.send({ type: 'companion:dock', url: DISCORD, screen: SCREEN });
  assert.notEqual(bg.hostWindow().width, before.width, 'precondition: it moved');

  bg.send({ type: 'companion:undock' });
  const after = bg.hostWindow();
  assert.equal(after.width, before.width, 'the page was left at half width');
  assert.equal(after.state, 'maximized',
    'a window that had been maximised came back as a small one');
  assert.equal(bg.stored.companion.docked, false);
});

test('docking twice moves the one window rather than opening another', () => {
  const bg = loadBackground();
  bg.send({ type: 'companion:dock', url: DISCORD, screen: SCREEN });
  bg.send({ type: 'companion:dock', url: DISCORD, screen: SCREEN });
  assert.equal(bg.windowsOpened().length, 1, 'it opened a second window');
});

test('side by side is remembered, so a reload does not lose it', () => {
  const bg = loadBackground();
  bg.send({ type: 'companion:dock', url: DISCORD, screen: SCREEN });
  assert.equal(bg.stored.companion.docked, true);
  assert.ok(bg.stored.companion.priorWindow.width > 0,
    'nothing was remembered, so undocking has nowhere to put the window back');
});

test('a screen it was told nothing about is refused rather than guessed at', () => {
  /* The measurements come from the page. A window moved to a size derived
   * from nothing is a window somebody has to go and find. */
  const bg = loadBackground();
  [undefined, {}, { width: 0, height: 0 }, { width: 1600 }].forEach(function (screen) {
    assert.deepEqual(bg.send({ type: 'companion:dock', url: DISCORD, screen: screen }),
      { docked: false }, JSON.stringify(screen) + ' was accepted');
  });
  assert.deepEqual(bg.windowsOpened(), []);
});

test('docking an address that is not https is refused', () => {
  const bg = loadBackground();
  assert.deepEqual(bg.send({ type: 'companion:dock', url: 'javascript:alert(1)', screen: SCREEN }),
    { docked: false });
  assert.deepEqual(bg.windowsOpened(), []);
});

/* --------------------------------------------------- windows beside the page */
/* A separate feature from the pane, because it answers a different question.
 * The pane puts a site inside the page, which only works for sites that
 * publish something meant to be embedded. These are ordinary browser windows
 * arranged around the page, which is the only thing that works for an
 * application that refuses to be embedded at all. */

const AREA = { left: 0, top: 0, width: 1600, height: 900 };
const YT = 'https://www.youtube.com/embed/x';

test('one beside the page takes the whole right-hand column', () => {
  const bg = loadBackground();
  bg.send({ type: 'windows:arrange', screen: AREA, split: 62, urls: [DISCORD] });

  const page = bg.hostWindow();
  const side = bg.windowsOpened()[0];
  assert.equal(page.left, 0);
  assert.equal(page.width + side.width, AREA.width, 'they do not fill the screen');
  assert.equal(side.left, page.width, 'they overlap or leave a stripe of desktop');
  assert.equal(side.height, AREA.height);
});

test('two share that column one above the other', () => {
  const bg = loadBackground();
  bg.send({ type: 'windows:arrange', screen: AREA, split: 62, urls: [DISCORD, YT] });

  const [a, b] = bg.windowsOpened();
  assert.equal(a.width, b.width, 'they are different widths');
  assert.equal(a.left, b.left, 'they are not in the same column');
  assert.equal(a.top + a.height, b.top, 'they overlap or leave a gap');
  assert.equal(a.height + b.height, AREA.height);
});

test('three or four go in a grid, since a sixth of a screen is not usable', () => {
  const bg = loadBackground();
  bg.send({ type: 'windows:arrange', screen: AREA, split: 62,
            urls: [DISCORD, YT, 'https://a.example/', 'https://b.example/'] });

  const w = bg.windowsOpened();
  assert.equal(w.length, 4);
  const lefts = new Set(w.map(x => x.left));
  const tops = new Set(w.map(x => x.top));
  assert.equal(lefts.size, 2, 'they are not in two columns');
  assert.equal(tops.size, 2, 'they are not in two rows');
});

test('a fifth is refused rather than shrinking the rest', () => {
  const bg = loadBackground();
  bg.send({ type: 'windows:arrange', screen: AREA, split: 62,
            urls: [DISCORD, YT, 'https://a.example/', 'https://b.example/',
                   'https://c.example/'] });
  assert.equal(bg.windowsOpened().length, 4);
});

test('rounding never leaves a stripe of desktop showing', () => {
  /* Three windows over a column that does not divide by two, on a screen
   * height that does not divide by two either. Each of the last in a row and
   * column takes the remainder. */
  const odd = { left: 0, top: 0, width: 1443, height: 907 };
  const bg = loadBackground();
  bg.send({ type: 'windows:arrange', screen: odd, split: 55,
            urls: [DISCORD, YT, 'https://a.example/'] });

  const page = bg.hostWindow();
  const w = bg.windowsOpened();
  const rightEdge = Math.max(...w.map(x => x.left + x.width));
  const bottomEdge = Math.max(...w.map(x => x.top + x.height));
  assert.equal(rightEdge, odd.width, 'a strip is left down the right');
  assert.equal(bottomEdge, odd.height, 'a strip is left along the bottom');
  assert.equal(page.width + w[0].width + w[1].width, odd.width);
});

test('the split is honoured, and floored at both ends', () => {
  const bg = loadBackground();
  bg.send({ type: 'windows:arrange', screen: AREA, split: 75, urls: [DISCORD] });
  assert.equal(bg.hostWindow().width, Math.round(AREA.width * 0.75));

  /* Asking for almost all of it still leaves the companion something. */
  const bg2 = loadBackground();
  bg2.send({ type: 'windows:arrange', screen: { left: 0, top: 0, width: 1000, height: 800 },
             split: 95, urls: [DISCORD] });
  assert.ok(bg2.windowsOpened()[0].width >= 300,
    'the companion was squeezed to ' + bg2.windowsOpened()[0].width);
});

test('closing a window from its own corner turns it off in the popup', () => {
  /* Otherwise the popup goes on claiming it is open, and the next arrangement
   * quietly reopens something the person just closed. */
  const bg = loadBackground({ settings: { windows: { items: [{ label: 'Discord', url: DISCORD, on: true }] } } });
  bg.send({ type: 'windows:arrange', screen: AREA, split: 62, urls: [DISCORD] });
  assert.equal(bg.windowsOpened().length, 1);

  bg.closeWindow(1);
  assert.equal(bg.stored.windows.items[0].on, false,
    'the popup still thinks it is open');
});

test('arranging again moves the windows rather than opening more', () => {
  const bg = loadBackground();
  bg.send({ type: 'windows:arrange', screen: AREA, split: 62, urls: [DISCORD] });
  bg.send({ type: 'windows:arrange', screen: AREA, split: 40, urls: [DISCORD] });
  assert.equal(bg.windowsOpened().length, 1, 'it opened a second window');
  assert.equal(bg.hostWindow().width, Math.round(AREA.width * 0.4));
});

test('the page window is remembered once, not re-remembered on every arrangement', () => {
  /* Remembered again each time, undoing it would put the window back to the
   * last arrangement rather than to where it actually was. */
  const bg = loadBackground();
  const before = bg.hostWindow();
  bg.send({ type: 'windows:arrange', screen: AREA, split: 62, urls: [DISCORD] });
  bg.send({ type: 'windows:arrange', screen: AREA, split: 40, urls: [DISCORD] });

  assert.equal(bg.stored.windows.priorWindow.width, before.width);
  assert.equal(bg.stored.windows.priorWindow.state, 'maximized');
});

test('putting it back closes the windows and restores the page', () => {
  const bg = loadBackground({ settings: { windows: { items: [{ label: 'Discord', url: DISCORD, on: true }] } } });
  const before = bg.hostWindow();
  bg.send({ type: 'windows:arrange', screen: AREA, split: 62, urls: [DISCORD] });

  bg.send({ type: 'windows:restore' });
  assert.equal(bg.hostWindow().width, before.width, 'the page was left at part width');
  assert.equal(bg.hostWindow().state, 'maximized',
    'a window that had been maximised came back small');
  assert.equal(bg.stored.windows.items[0].on, false, 'the list still says it is open');
  assert.equal(bg.stored.windows.priorWindow, undefined,
    'it kept a position to return to that no longer means anything');
});

test('a screen it was told nothing about arranges nothing', () => {
  const bg = loadBackground();
  [undefined, {}, { width: 0, height: 0 }].forEach(function (screen) {
    assert.deepEqual(bg.send({ type: 'windows:arrange', screen: screen, urls: [DISCORD] }),
      { placed: 0 }, JSON.stringify(screen) + ' was accepted');
  });
  assert.deepEqual(bg.windowsOpened(), []);
});

test('an address that is not https is left out of the arrangement', () => {
  const bg = loadBackground();
  bg.send({ type: 'windows:arrange', screen: AREA, split: 62,
            urls: ['javascript:alert(1)', 'http://a.example/', DISCORD] });
  assert.equal(bg.windowsOpened().length, 1);
  assert.equal(bg.windowsOpened()[0].url, DISCORD);
});

test('a rule the browser rejects is written down, not swallowed', () => {
  /* updateDynamicRules reports failure the way the rest of the API does - by
   * setting lastError and carrying on - and that was being ignored. A rejected
   * rule left no rule, no error and no trace, and the only symptom was a frame
   * that stayed blank, which is what four other things also look like. */
  const bg = loadBackground({ origins: ['https://discord.com/*'], rulesFail: 'Rule limit exceeded' });
  bg.startup();
  bg.flush();

  assert.equal(bg.stored.ruleReport.error, 'Rule limit exceeded',
    'the browser refused the rule and nothing recorded it');
  assert.deepEqual(bg.stored.ruleReport.wanted, ['discord.com']);
  assert.deepEqual(bg.stored.ruleReport.installed, [],
    'it reported a rule that was never installed');
});

test('a rule that installs is reported as installed', () => {
  const bg = loadBackground({ origins: ['https://discord.com/*'] });
  bg.startup();
  bg.flush();
  assert.equal(bg.stored.ruleReport.error, '');
  assert.deepEqual(bg.stored.ruleReport.installed, ['discord.com']);
});

test('nothing granted is reported as nothing wanted', () => {
  /* This is the state that hid the real fault for weeks: no sites granted, so
   * no rules, no error - and a frame that looked exactly like a refusal. */
  const bg = loadBackground();
  bg.startup();
  bg.flush();
  assert.deepEqual(bg.stored.ruleReport.wanted, []);
  assert.deepEqual(bg.stored.ruleReport.installed, []);
});
