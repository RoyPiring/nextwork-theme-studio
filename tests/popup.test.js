/* Tests for the popup.
 *
 * The popup is the only part of the extension most people ever operate, and
 * every control in it writes to the same storage the content script reads. Two
 * things here are worth more than the rest: a write that reaches every open tab
 * must not happen on every pixel of a drag, and the focus timer must never lose
 * or double-count time, because the clock is the one thing a person would
 * notice being wrong.
 *
 * The DOM is built from src/popup.html, so a control renamed in one file and
 * not the other fails here rather than shipping as a button that does nothing.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const { loadPage } = require('./harness.js');

function openPopup(settings, options) {
  const page = loadPage(Object.assign({
    page: 'src/popup.html',
    scripts: ['src/popup.js'],
    settings: settings || {}
  }, options || {}));
  page.flush();
  return page;
}

test('it opens on the saved theme and lists every one', () => {
  const p = openPopup({ themeId: 'hawaiiOcean', enabled: true });
  assert.match(p.el('status').textContent, /on$/);
  const buttons = p.el('themes').querySelectorAll('button');
  assert.ok(buttons.length >= 18, 'only ' + buttons.length + ' themes listed');
  const current = buttons.filter(b => b.getAttribute('aria-current') === 'true');
  assert.equal(current.length, 1, 'exactly one theme should be marked current');
});

test('choosing a theme saves it and the list does not grow', () => {
  const p = openPopup({ themeId: 'concrete' });
  const before = p.el('themes').querySelectorAll('button').length;

  const other = p.el('themes').querySelectorAll('button')
    .find(b => b.getAttribute('aria-current') === 'false');
  p.click(other);

  assert.notEqual(p.stored.themeId, 'concrete', 'the choice was not saved');
  assert.equal(p.el('themes').querySelectorAll('button').length, before,
    'the list was rebuilt on top of itself');
  const current = p.el('themes').querySelectorAll('button')
    .filter(b => b.getAttribute('aria-current') === 'true');
  assert.equal(current.length, 1, 'the mark did not move with the choice');
});

test('the theme switch writes and the status follows', () => {
  const p = openPopup({ enabled: true, themeId: 'concrete' });
  p.set('enabled', false);
  p.fire('enabled', 'change');

  assert.equal(p.stored.enabled, false);
  assert.match(p.el('status').textContent, /off/i);
  assert.ok(p.doc.body.classList.contains('off'), 'the page did not dim');

  p.set('enabled', true);
  p.fire('enabled', 'change');
  assert.equal(p.stored.enabled, true);
  assert.ok(!p.doc.body.classList.contains('off'));
});

/* ------------------------------------------------------------------ dials */

test('dragging a dial previews at once but writes only when it settles', () => {
  /* A range input fires on every pixel. Writing storage on each one put a
   * change event on every open tab, and each rebuilt both stylesheets and
   * re-walked the DOM. Dragging one slider drove a restyle storm. */
  const p = openPopup({ themeId: 'concrete' });
  assert.equal(p.stored.tuningOverrides, undefined);

  for (let v = -30; v <= 0; v += 10) {
    p.set('hue', v);
    p.fireOnly('hue', 'input');
  }
  assert.equal(p.stored.tuningOverrides, undefined,
    'a write reached storage mid-drag');
  assert.equal(p.el('hue-out').textContent.length > 0, true,
    'the readout did not follow the drag');

  p.flush();
  assert.ok(p.stored.tuningOverrides, 'nothing was written once the drag settled');
  assert.equal(p.stored.tuningOverrides.concrete.hue, 0);
});

test('a dial writes once for a whole drag, not once per step', () => {
  const p = openPopup({ themeId: 'concrete' });
  let writes = 0;
  const real = p.chrome.storage.local.set;
  p.chrome.storage.local.set = function (patch, cb) {
    if ('tuningOverrides' in patch) writes++;
    return real.call(this, patch, cb);
  };

  for (let v = 1; v <= 12; v++) {
    p.set('saturation', v);
    p.fireOnly('saturation', 'input');
  }
  p.flush();
  assert.equal(writes, 1, 'twelve steps produced ' + writes + ' writes');
});

test('resetting the dials clears only this theme', () => {
  const p = openPopup({
    themeId: 'concrete',
    tuningOverrides: { concrete: { hue: 20 }, graphite: { hue: -10 } }
  });
  p.fire('reset-dials', 'click');

  assert.equal(p.stored.tuningOverrides.concrete, undefined, 'this theme kept its dials');
  assert.deepEqual(p.stored.tuningOverrides.graphite, { hue: -10 },
    'another theme lost its dials');
});

test('surprise me never lands on the theme you are already on', () => {
  /* Picking from the full list would repeat the current theme now and then,
   * which reads as the button being broken rather than as a coincidence. */
  for (let i = 0; i < 30; i++) {
    const p = openPopup({ themeId: 'concrete' });
    p.fire('random-theme', 'click');
    assert.notEqual(p.stored.themeId, 'concrete', 'it picked the current theme');
  }
});

/* ------------------------------------------------------------------ focus */

test('starting the timer records when, and pausing banks what elapsed', () => {
  /* Every control writes timestamps; the popup only ever reads the clock. That
   * is what makes closing the popup or restarting the browser safe. */
  const p = openPopup({ focus: { running: false, accumulatedMs: 0, startedAt: 0 } });

  p.fire('focus-toggle', 'click');
  assert.equal(p.stored.focus.running, true);
  assert.ok(p.stored.focus.startedAt > 0, 'no start time was recorded');
  assert.equal(p.stored.focus.enabled, true, 'starting should show the timer');

  const startedAt = p.stored.focus.startedAt;
  p.fire('focus-toggle', 'click');
  assert.equal(p.stored.focus.running, false);
  assert.equal(p.stored.focus.startedAt, 0, 'a stopped clock kept a start time');
  assert.ok(p.stored.focus.accumulatedMs >= 0, 'elapsed time was not banked');
  assert.ok(startedAt > 0);
});

test('pausing and resuming keeps the time already banked', () => {
  const p = openPopup({
    focus: { running: true, accumulatedMs: 5 * 60000, startedAt: Date.now() - 60000 }
  });
  p.fire('focus-toggle', 'click');
  const banked = p.stored.focus.accumulatedMs;
  assert.ok(banked >= 6 * 60000 - 2000 && banked <= 6 * 60000 + 2000,
    'banked ' + banked + 'ms, expected about six minutes');

  p.fire('focus-toggle', 'click');
  assert.equal(p.stored.focus.accumulatedMs, banked,
    'resuming threw away the banked time');
  assert.equal(p.stored.focus.running, true);
});

test('reset puts the clock back to nothing', () => {
  const p = openPopup({
    focus: { running: true, accumulatedMs: 9 * 60000, startedAt: Date.now() - 1000 }
  });
  p.fire('focus-reset', 'click');
  assert.deepEqual(
    { running: p.stored.focus.running, at: p.stored.focus.startedAt,
      ms: p.stored.focus.accumulatedMs },
    { running: false, at: 0, ms: 0 });
});

test('a target is taken from the button clicked, not the icon inside it', () => {
  /* The handler sits on the group and finds the button under the click, so a
   * click landing on something inside one still counts. */
  const p = openPopup({ focus: {} });
  const button = p.el('focus-targets').querySelectorAll('button[data-min]')[1];
  const inner = p.doc.createElement('span');
  button.appendChild(inner);

  p.click(inner);
  assert.equal(p.stored.focus.targetMin, Number(button.dataset.min));
});

test('a click in the target group that misses every button changes nothing', () => {
  const p = openPopup({ focus: { targetMin: 25 } });
  const before = JSON.stringify(p.stored.focus);
  p.fire('focus-targets', 'click');
  assert.equal(JSON.stringify(p.stored.focus), before,
    'a click that hit no button still wrote');
});

test('the size slider previews at once and writes when it settles', () => {
  const p = openPopup({ focus: {} });
  p.set('focus-size', 150);
  p.fireOnly('focus-size', 'input');

  assert.equal(p.el('focus-size-out').textContent, '150%',
    'the readout did not follow the drag');
  assert.equal(p.stored.focus.hudScale, undefined,
    'a write reached storage mid-drag');

  p.flush();
  assert.equal(p.stored.focus.hudScale, 1.5);
});

test('the timer shows over target once the target is passed', () => {
  const p = openPopup({
    focus: { running: true, targetMin: 1, accumulatedMs: 5 * 60000, startedAt: Date.now() }
  });
  assert.equal(p.el('focus-panel').getAttribute('data-state'), 'over');
  assert.match(p.el('focus-state').textContent, /over target/);
});

test('a running clock is redrawn on a tick, a paused one is not', () => {
  const running = openPopup({
    focus: { running: true, accumulatedMs: 0, startedAt: Date.now() }
  });
  assert.equal(running.intervals.size, 1, 'a running clock is not ticking');

  const paused = openPopup({ focus: { running: false } });
  assert.equal(paused.intervals.size, 0, 'a paused clock is still ticking');
});

/* ---------------------------------------------------------------- storage */

test('two reads landing out of order leave the newer one showing', () => {
  /* chrome.storage gives no ordering guarantee, and the popup re-reads on
   * every change, so two answers can be in flight at once. The older one must
   * not overwrite the newer.
   *
   * Both reads are put in flight before either is answered, then delivered
   * newest first - the order the real API is free to choose and the one code
   * usually assumes cannot happen. */
  const p = openPopup({ themeId: 'concrete' });

  p.chrome.storage.local.set({ themeId: 'hawaiiOcean' });
  p.flush({ deliverReads: false });        /* first read is now in flight */

  p.chrome.storage.local.set({ themeId: 'cherryBlossom' });
  p.flush({ deliverReads: false });        /* and now the second */

  assert.equal(p.reads.length, 2, 'expected two reads in flight, saw ' + p.reads.length);
  assert.equal(p.reads[0].snapshot.themeId, 'hawaiiOcean');
  assert.equal(p.reads[1].snapshot.themeId, 'cherryBlossom');

  p.flush({ reverseReads: true });         /* newest answered first */

  const name = p.sandbox.NWT.PRESETS.cherryBlossom.name;
  assert.match(p.el('status').textContent, new RegExp(name, 'i'),
    'the older read overwrote the newer one');
});

test('a failed read leaves the popup as it was', () => {
  /* chrome.storage reports failure by setting lastError rather than throwing,
   * so an unread failure would apply an empty object as the settings. */
  const p = openPopup({ themeId: 'hawaiiOcean', enabled: true });
  const before = p.el('status').textContent;

  p.failNextRead('storage is unavailable');
  p.chrome.storage.local.set({ themeId: 'concrete' });
  p.flush();

  assert.equal(p.el('status').textContent, before,
    'a failed read was treated as an answer');
});

test('a migration is persisted, so it does not run again on every open', () => {
  /* migrate() only reports; writing the result is the caller's job. Without
   * that the same migration reruns on each open and clears the dials again -
   * so the second open here is the point of the test, not the first. */
  const p = openPopup({ schema: 0, tuningOverrides: { concrete: { hue: 30 } } });
  assert.ok(p.stored.schema >= 1, 'the new schema was not saved');
  assert.deepEqual(p.stored.tuningOverrides, {}, 'the migration did not run');

  /* Open again on what the first open left behind, with dials set since. */
  const after = Object.assign({}, p.stored, {
    tuningOverrides: { concrete: { hue: 30 } }
  });
  const q = openPopup(after);
  assert.deepEqual(q.stored.tuningOverrides, { concrete: { hue: 30 } },
    'the migration ran a second time and cleared the dials again');
});

/* ------------------------------------------------------------- other bits */

test('the wallpaper switch is disabled for a theme that has no scenery', () => {
  const p = openPopup({ themeId: 'concrete' });
  const backdrop = p.el('sceneBackdrop');
  assert.ok(p.sandbox.NWT_SCENES, 'no scenery was loaded, so this proves nothing');
  const hasScene = !!p.sandbox.NWT_SCENES.concrete;
  assert.equal(backdrop.disabled, !hasScene);
  if (!hasScene) {
    assert.equal(backdrop.closest('.switch-item').style.opacity, '0.45',
      'a switch that does nothing was left looking active');
  }
});

test('the wallpaper switch keeps the rest of the options', () => {
  const p = openPopup({ options: { sceneBackdrop: false, somethingElse: 7 } });
  p.set('sceneBackdrop', true);
  p.fire('sceneBackdrop', 'change');

  assert.equal(p.stored.options.sceneBackdrop, true);
  assert.equal(p.stored.options.somethingElse, 7, 'another option was dropped');
});

test('the editor and reload buttons act and then close the popup', () => {
  const p = openPopup({});
  p.fire('open-editor', 'click');
  assert.equal(p.opened.optionsPage, 1);
  assert.equal(p.opened.closed, 1, 'the popup stayed open');

  p.fire('reload-tab', 'click');
  assert.equal(p.opened.reloadedTabs, 1);
  assert.equal(p.opened.closed, 2);
});

/* ------------------------------------------------------ the companion pane */

const VIDEO = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ';
function tiles(p) { return p.el('companion-tiles').querySelectorAll('.tile-go'); }
function drops(p) { return p.el('companion-tiles').querySelectorAll('.drop'); }

test('adding a link saves it and shows the pane in one step', () => {
  /* Adding something to watch and then having to turn the pane on as well is
   * a second step with no meaning behind it. */
  const p = openPopup({ enabled: true });
  p.set('companion-url', VIDEO);
  p.click(p.el('companion-add'));
  p.flush();

  const c = p.stored.companion;
  assert.equal(c.enabled, true, 'the pane was left switched off');
  assert.equal(c.url, VIDEO);
  assert.deepEqual(c.tiles, [{ label: 'YouTube', url: VIDEO }]);
  assert.equal(p.el('companion-url').value, '', 'the field kept the link it just saved');
});

test('the saved link is the one that was typed, not the player address', () => {
  /* The tile is what a person recognises and what they would send to someone
   * else; turning it into a player address is the pane's job, at the point it
   * loads it. */
  const p = openPopup({ enabled: true });
  p.set('companion-url', VIDEO);
  p.click(p.el('companion-add'));
  p.flush();
  assert.equal(p.stored.companion.tiles[0].url, VIDEO);
});

test('an address the pane cannot open is refused and nothing is saved', () => {
  const p = openPopup({ enabled: true });
  p.set('companion-url', 'notes.txt');
  /* Without flushing: the message puts itself away after a few seconds, and
   * flushing here would run that timer before the test could read it. */
  p.fireOnly('companion-add', 'click');

  assert.match(p.el('companion-note').textContent, /full web address/);
  assert.equal(p.el('companion-url').getAttribute('aria-invalid'), 'true');
  p.flush();
  assert.equal(p.stored.companion, undefined, 'a bad address was saved anyway');
});

test('adding the same link twice leaves one tile', () => {
  const p = openPopup({ enabled: true });
  ['first', 'second'].forEach(function () {
    p.set('companion-url', VIDEO);
    p.click(p.el('companion-add'));
    p.flush();
  });
  assert.equal(p.stored.companion.tiles.length, 1);
});

test('choosing a tile switches the pane to it and marks it as chosen', () => {
  const p = openPopup({
    enabled: true,
    companion: { enabled: true, url: VIDEO, tiles: [
      { label: 'YouTube', url: VIDEO }, { label: 'docs', url: 'https://docs.example/a' }
    ] }
  });
  const row = tiles(p);
  assert.equal(row.length, 2);
  assert.equal(row[0].getAttribute('aria-pressed'), 'true');
  assert.equal(row[1].getAttribute('aria-pressed'), 'false');

  p.click(row[1]);
  p.flush();
  assert.equal(p.stored.companion.url, 'https://docs.example/a');
  assert.equal(tiles(p)[1].getAttribute('aria-pressed'), 'true');
});

test('removing a tile is a control of its own, not a second click target', () => {
  /* A row of places you go to should not drop one because you missed. */
  const p = openPopup({
    enabled: true,
    companion: { enabled: true, url: VIDEO, tiles: [{ label: 'YouTube', url: VIDEO }] }
  });
  p.click(drops(p)[0]);
  p.flush();

  assert.deepEqual(p.stored.companion.tiles, []);
  assert.equal(p.stored.companion.url, '',
    'the pane was left pointed at a tile that no longer exists');
});

test('the cross is a button in its own right, not a span inside another', () => {
  /* It was a span with role="button" nested inside the tile's button. Nesting
   * one button in another is invalid, and a span gets no activation of its
   * own - so Tab reached the cross and Enter fired the tile behind it,
   * switching to the thing you were trying to remove. */
  const p = openPopup({
    enabled: true,
    companion: { enabled: true, url: VIDEO, tiles: [{ label: 'YouTube', url: VIDEO }] }
  });
  /* What a keyboard can do with it follows from what it is, and that is what
   * this checks - the browser supplies Enter and Space activation for a real
   * button and nothing at all for a span, and neither is something the harness
   * can meaningfully stand in for. */
  const drop = drops(p)[0];
  assert.equal(drop.tagName.toLowerCase(), 'button',
    'the cross is not a button, so a keyboard cannot press it');
  assert.equal(drop.parentElement.tagName.toLowerCase(), 'span',
    'the cross is nested inside another button, which no keyboard can reach past');
  assert.ok(drop.getAttribute('aria-label'), 'the cross says nothing to a screen reader');
});

test('the switch turns the pane off without losing what was saved', () => {
  const p = openPopup({
    enabled: true,
    companion: { enabled: true, url: VIDEO, tiles: [{ label: 'YouTube', url: VIDEO }] }
  });
  p.set('companionEnabled', false);
  p.fire('companionEnabled', 'change');
  p.flush();

  assert.equal(p.stored.companion.enabled, false);
  assert.equal(p.stored.companion.tiles.length, 1, 'turning it off dropped the tiles');
  assert.equal(p.stored.companion.url, VIDEO);
});

test('the popup opens on the pane as it was left', () => {
  const p = openPopup({
    enabled: true,
    companion: { enabled: true, url: VIDEO, tiles: [{ label: 'YouTube', url: VIDEO }] }
  });
  assert.equal(p.el('companionEnabled').checked, true);
  assert.equal(p.el('companion-empty').style.display, 'none');
});

test('with nothing saved it says so rather than showing an empty row', () => {
  const p = openPopup({ enabled: true });
  assert.equal(tiles(p).length, 0);
  assert.notEqual(p.el('companion-empty').style.display, 'none');
});

test('the timer offers the short sessions as well as the long ones', () => {
  /* Five and ten minutes are the ones you reach for to start at all. */
  const p = openPopup({ enabled: true });
  const lengths = [...p.el('focus-targets').querySelectorAll('button')]
    .map(b => Number(b.dataset.min));
  assert.deepEqual(lengths, [5, 10, 15, 25, 45, 60, 0]);
});

test('the sound can be turned off on its own', () => {
  const p = openPopup({ enabled: true });
  assert.equal(p.el('focus-chime').checked, true, 'it should start on');
  p.set('focus-chime', false);
  p.fire('focus-chime', 'change');
  p.flush();
  assert.equal(p.stored.focus.chime, false);
});

const DISCORD = 'https://discord.com/channels/1/2';

/* Record what an element is told to say, in order. */
function watchText(el) {
  const said = [];
  let value = el.textContent;
  Object.defineProperty(el, 'textContent', {
    configurable: true,
    get() { return value; },
    set(v) { value = v; said.push(v); }
  });
  return said;
}

test('a site that will not be framed offers to be allowed', () => {
  const p = openPopup({
    enabled: true, companion: { enabled: true, url: DISCORD }
  });
  assert.notEqual(p.el('companion-access').style.display, 'none');
  assert.ok(p.el('companion-access-note').textContent.includes('discord.com refuses'),
    'it does not say which site refuses');
  assert.match(p.el('companion-access-btn').textContent, /^Allow discord\.com/);
});

test('a player is not offered, because it needs no permission', () => {
  const p = openPopup({ enabled: true, companion: { enabled: true, url: VIDEO } });
  assert.equal(p.el('companion-access').style.display, 'none');
});

test('taking a site back is the same control, the other way round', () => {
  const p = openPopup({
    enabled: true, companion: { enabled: true, url: DISCORD }
  }, { allowed: ['https://discord.com'] });
  assert.match(p.el('companion-access-note').textContent, /is allowed/);
  p.click(p.el('companion-access-btn'));
  p.flush();
  assert.deepEqual(p.granted(), []);
});

test('arriving from the pane leads with the site the pane asked about', () => {
  /* The pane cannot raise the browser's prompt itself, so it writes the site
   * down and sends you here. What you were looking at is the question, not
   * whatever the pane happens to be pointed at now. */
  const p = openPopup({
    enabled: true,
    companion: { enabled: true, url: VIDEO, pending: DISCORD }
  });
  /* A sentence, read as a sentence.
   *
   * A bare hostname tested against a string is how a URL check is written
   * badly - unanchored, matching anywhere - and the scanner flags the shape
   * wherever it sees it. It cannot tell that this is a note on screen rather
   * than an address being trusted, and it should not have to guess. Looking
   * for the whole phrase is both a stronger assertion and not that shape. */
  assert.ok(p.el('companion-access-note').textContent.includes('discord.com refuses'),
    'the site the pane asked about is not the one named');
  assert.equal(p.el('companion-access').getAttribute('data-asked'), '1');
});

test('a link is named for the site, not for whatever is in front of the dot', () => {
  /* app.slack.com was called "app" and mail.google.com was called "mail",
   * which names the subdomain instead of the place. */
  const cases = [
    ['https://app.slack.com/client/x', 'Slack'],
    ['https://mail.google.com/mail/u/0', 'Google'],
    ['https://discord.com/channels/1/2', 'Discord'],
    ['https://www.bbc.co.uk/news', 'Bbc'],
    ['https://youtu.be/dQw4w9WgXcQ', 'YouTube']
  ];
  cases.forEach(function (pair) {
    const p = openPopup({ enabled: true });
    p.set('companion-url', pair[0]);
    p.click(p.el('companion-add'));
    p.flush();
    assert.equal(p.stored.companion.tiles[0].label, pair[1], pair[0]);
  });
});

test('reset lets the next session be announced', () => {
  /* The chime marker says "this session has already been announced". Nothing
   * in the timer's own state separates a resumed session from a new one - the
   * clock has to move startedAt forward either way - so reset is what has to
   * clear it. Left set, the first session would chime and every one after it
   * would be silent. */
  const p = openPopup({
    focus: { running: true, startedAt: Date.now() - 26 * 60000,
             accumulatedMs: 0, targetMin: 25, chime: true, chimedFor: 1 }
  });
  p.fire('focus-reset', 'click');
  assert.ok(!p.stored.focus.chimedFor,
    'reset left the session marked as already announced, so the next one is silent');
});

test('choosing a different length lets the new end be announced', () => {
  /* The other thing that begins a session: 45 minutes is an end that has not
   * been reached yet, whatever happened with the last one. */
  const p = openPopup({
    focus: { running: true, startedAt: Date.now() - 26 * 60000,
             accumulatedMs: 0, targetMin: 25, chime: true, chimedFor: 1 }
  });
  p.click(p.el('focus-targets').querySelectorAll('button[data-min]')[4]);
  assert.equal(p.stored.focus.targetMin, 45);
  assert.ok(!p.stored.focus.chimedFor,
    'the new end was already marked as announced');
});

test('pausing and resuming does not clear the marker', () => {
  /* If it did, the fix would be undone: a session that had run over, paused
   * and started again would look new and chime for the same end twice. */
  const p = openPopup({
    focus: { running: true, startedAt: Date.now() - 26 * 60000,
             accumulatedMs: 0, targetMin: 25, chime: true, chimedFor: 1 }
  });
  p.fire('focus-toggle', 'click');
  assert.ok(p.stored.focus.chimedFor, 'pausing cleared it');
  p.fire('focus-toggle', 'click');
  assert.ok(p.stored.focus.chimedFor, 'resuming cleared it');
});

test('choosing the length already chosen does not re-announce the session', () => {
  /* Clicking the chip that is already selected changes nothing about the
   * session, so clearing the marker there rang for an end that had already
   * been announced - the same fault as the resume path, through another door. */
  const p = openPopup({
    focus: { running: true, startedAt: Date.now() - 26 * 60000,
             accumulatedMs: 0, targetMin: 25, chime: true, chimedFor: 1 }
  });
  const chips = p.el('focus-targets').querySelectorAll('button[data-min]');
  const same = chips.find(b => Number(b.dataset.min) === 25);

  p.click(same);
  assert.equal(p.stored.focus.targetMin, 25);
  assert.ok(p.stored.focus.chimedFor,
    're-picking the same length cleared the marker, so it will chime again');
});

test('a link marked for a window opens one instead of filling the pane', () => {
  const p = openPopup({
    enabled: true,
    companion: { enabled: true, url: VIDEO, tiles: [
      { label: 'YouTube', url: VIDEO },
      { label: 'Discord', url: DISCORD, windowed: true }] }
  });
  const marked = tiles(p)[1];
  assert.ok(marked.classList.contains('windowed'), 'the row does not say which is which');

  p.click(marked);
  p.flush();
  assert.equal(p.sent().filter(m => m.type === 'companion:window').length, 1,
    'it did not open the window');
  assert.equal(p.stored.companion.url, VIDEO,
    'it pointed the pane at a link known not to work in one');
});

test('shift-clicking a marked link tries it in the pane again', () => {
  /* For one marked by mistake, or a site that has since changed. */
  const p = openPopup({
    enabled: true,
    companion: { enabled: true, url: VIDEO,
                 tiles: [{ label: 'Discord', url: DISCORD, windowed: true }] }
  });
  p.click(tiles(p)[0], { shiftKey: true });
  p.flush();

  assert.equal(p.stored.companion.url, DISCORD);
  assert.ok(!p.stored.companion.tiles[0].windowed, 'the mark was not lifted');
});

/* ------------------------------------------------ windows beside the page */

test('adding a link there opens it and turns the arrangement on', () => {
  const p = openPopup({ enabled: true });
  p.set('windows-url', DISCORD);
  p.click(p.el('windows-add'));
  p.flush();

  const w = p.stored.windows;
  assert.equal(w.enabled, true, 'it was saved but nothing was arranged');
  assert.deepEqual(w.items, [{ label: 'Discord', url: DISCORD, on: true }]);
  const asked = p.sent().filter(m => m.type === 'windows:arrange');
  assert.equal(asked.length, 1);
  assert.deepEqual(asked[0].urls, [DISCORD]);
  assert.ok(asked[0].screen.width > 0,
    'it asked for an arrangement without saying how big the screen is');
});

test('turning one off closes its window and rearranges the rest', () => {
  const p = openPopup({
    enabled: true,
    windows: { enabled: true, split: 62, items: [
      { label: 'Discord', url: DISCORD, on: true },
      { label: 'YouTube', url: VIDEO, on: true }] }
  });
  const boxes = p.el('windows-list').querySelectorAll('input');
  boxes[0].checked = false;
  p.fireOn(boxes[0], 'change');
  p.flush();

  assert.equal(p.sent().filter(m => m.type === 'windows:close').length, 1,
    'the window was left open');
  assert.equal(p.stored.windows.items[0].on, false);
  assert.equal(p.stored.windows.items[1].on, true, 'it closed the wrong one, or both');
  /* The one still open is rearranged to take the space the other left. */
  const last = p.sent().filter(m => m.type === 'windows:arrange').pop();
  assert.deepEqual(last.urls, [VIDEO.replace('www.youtube.com/watch?v=', 'www.youtube.com/embed/')
    .replace('&t=90', '')]);
});

test('a fifth cannot be turned on, because a sixth of a screen is not usable', () => {
  const on = n => ({ label: 'S' + n, url: 'https://s' + n + '.example/', on: true });
  const p = openPopup({
    enabled: true,
    windows: { enabled: true, split: 62, items: [
      on(1), on(2), on(3), on(4),
      { label: 'S5', url: 'https://s5.example/', on: false }] }
  });
  const boxes = p.el('windows-list').querySelectorAll('input');
  assert.equal(boxes[4].disabled, true, 'a fifth could be turned on');
  assert.equal(boxes[0].disabled, false, 'the ones already on cannot be swapped out');
});

test('turning the arrangement off puts the page back', () => {
  const p = openPopup({
    enabled: true,
    windows: { enabled: true, split: 62,
               items: [{ label: 'Discord', url: DISCORD, on: true }] }
  });
  p.set('windowsEnabled', false);
  p.fire('windowsEnabled', 'change');
  p.flush();

  assert.equal(p.stored.windows.enabled, false);
  assert.equal(p.sent().filter(m => m.type === 'windows:restore').length, 1,
    'the page was left at part width');
});

test('the split writes once when it settles, not once per pixel', () => {
  /* Each write moves every window on the screen. */
  const p = openPopup({
    enabled: true,
    windows: { enabled: true, split: 62,
               items: [{ label: 'Discord', url: DISCORD, on: true }] }
  });
  for (let v = 50; v <= 62; v++) {
    p.set('windows-split', v);
    p.fireOnly('windows-split', 'input');
  }
  assert.equal(p.sent().filter(m => m.type === 'windows:arrange').length, 0,
    'it rearranged mid-drag');
  p.flush();
  assert.equal(p.sent().filter(m => m.type === 'windows:arrange').length, 1,
    'a whole drag should settle into one arrangement');
  assert.equal(p.stored.windows.split, 62);
});

test('the two sections keep their own lists', () => {
  /* They answer different questions and a link belongs to one or the other.
   * Sharing a list meant every site had to pretend to be the other kind. */
  const p = openPopup({ enabled: true });
  p.set('companion-url', VIDEO);
  p.click(p.el('companion-add'));
  p.set('windows-url', DISCORD);
  p.click(p.el('windows-add'));
  p.flush();

  assert.deepEqual(p.stored.companion.tiles.map(t => t.url), [VIDEO]);
  assert.deepEqual(p.stored.windows.items.map(i => i.url), [DISCORD]);
});

test('an address it cannot open is refused there too', () => {
  const p = openPopup({ enabled: true });
  p.set('windows-url', 'notes.txt');
  p.fireOnly('windows-add', 'click');

  assert.equal(p.el('windows-url').getAttribute('aria-invalid'), 'true');
  assert.match(p.el('windows-note').textContent, /full web address/);
  p.flush();
  assert.equal(p.stored.windows, undefined, 'a bad address was saved anyway');
});

/* ------------------------------------------------------------------- tabs */

test('the popup opens on one tab and switches between three', () => {
  /* Three unrelated things share this popup, and in one column you scrolled
   * past two features to reach the third. */
  const p = openPopup({ enabled: true });
  assert.equal(p.el('panel-theme').hidden, false);
  assert.equal(p.el('panel-focus').hidden, true);
  assert.equal(p.el('panel-split').hidden, true);
  assert.equal(p.el('tab-theme').getAttribute('aria-selected'), 'true');

  p.click(p.el('tab-split'));
  assert.equal(p.el('panel-split').hidden, false);
  assert.equal(p.el('panel-theme').hidden, true, 'two panels were showing at once');
  assert.equal(p.el('tab-split').getAttribute('aria-selected'), 'true');
  assert.equal(p.el('tab-theme').getAttribute('aria-selected'), 'false');
});

test('every control still exists behind its tab', () => {
  /* Hiding a panel must not detach it: the script wires each control by id at
   * load, and a control that moved into a hidden panel and lost its id would
   * fail here rather than shipping as a switch that does nothing. */
  const p = openPopup({ enabled: true });
  ['enabled', 'sceneBackdrop', 'focusEnabled', 'themes', 'hue',
   'focus-toggle', 'focus-targets', 'focus-chime',
   'splitEnabled', 'split-url', 'split-width',
   'companionEnabled', 'companion-tiles', 'windowsEnabled', 'windows-list']
    .forEach(function (id) { assert.ok(p.el(id), id + ' is missing'); });
});

/* ------------------------------------------------------------- the split */

test('choosing a link for the split turns it on in one step', () => {
  const p = openPopup({ enabled: true });
  p.set('split-url', VIDEO);
  p.click(p.el('split-set'));
  p.flush();

  assert.equal(p.stored.split.url, VIDEO);
  assert.equal(p.stored.split.enabled, true,
    'it was saved but the page was never split');
});

test('an address the split cannot open is refused and nothing is saved', () => {
  const p = openPopup({ enabled: true });
  p.set('split-url', 'notes.txt');
  p.fireOnly('split-set', 'click');

  assert.equal(p.el('split-url').getAttribute('aria-invalid'), 'true');
  assert.match(p.el('split-note').textContent, /full web address/);
  p.flush();
  assert.equal(p.stored.split, undefined, 'a bad address was saved anyway');
});

test('the width writes once when the drag settles, not once per pixel', () => {
  const p = openPopup({ enabled: true, split: { enabled: true, url: VIDEO, width: 0.36 } });
  for (let v = 30; v <= 45; v++) {
    p.set('split-width', v);
    p.fireOnly('split-width', 'input');
  }
  assert.equal(p.stored.split.width, 0.36, 'a write reached storage mid-drag');
  assert.equal(p.el('split-width-out').textContent, '45%',
    'the readout did not follow the drag');

  p.flush();
  assert.equal(p.stored.split.width, 0.45);
});

test('the split panel opens on what was saved', () => {
  const p = openPopup({ enabled: true, split: { enabled: true, url: VIDEO, width: 0.5 } });
  assert.equal(p.el('splitEnabled').checked, true);
  assert.equal(p.el('split-url').value, VIDEO);
  assert.equal(p.el('split-width-out').textContent, '50%');
});

test('asking to allow a site sends you where the prompt survives', () => {
  /* The popup cannot grant anything. `permissions.request` has to come from an
   * extension page in response to a click, and a popup is one - but the browser
   * closes the popup to put its prompt on screen, and closing the page cancels
   * the request. Nothing is granted and nothing says so. */
  const p = openPopup({ enabled: true, companion: { enabled: true, url: DISCORD } });
  p.click(p.el('companion-access-btn'));
  p.flush();

  assert.equal(p.opened.optionsPage, 1, 'it tried to ask from the popup again');
  assert.equal(p.stored.companion.pending, DISCORD,
    'the site was not written down, so that page opens asking about nothing');
  assert.deepEqual(p.sent().filter(m => m.type === 'companion:allow'), [],
    'it still asked the worker to raise a prompt the popup cannot survive');
});

test('taking a site back is still done from here, since nothing is prompted', () => {
  /* Only granting needs the prompt. Removing one does not, so it stays where
   * you are already looking. */
  const p = openPopup({
    enabled: true, companion: { enabled: true, url: DISCORD }
  }, { allowed: ['https://discord.com'] });
  p.click(p.el('companion-access-btn'));
  p.flush();

  assert.deepEqual(p.granted(), []);
  assert.equal(p.opened.optionsPage, 0, 'it opened a page for something it could do itself');
});
