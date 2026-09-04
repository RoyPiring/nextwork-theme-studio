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

test('the timer offers the short sessions as well as the long ones', () => {
  /* Five and ten minutes are the ones you reach for to start at all. */
  const p = openPopup({ enabled: true });
  const lengths = [...p.el('focus-targets').querySelectorAll('button')]
    .map(b => Number(b.dataset.min));
  assert.deepEqual(lengths, [5, 10, 15, 25, 45, 60, 0]);
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
