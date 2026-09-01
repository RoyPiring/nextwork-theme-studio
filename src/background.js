/* ============================================================================
 * Pineapple NextWork Theme Studio Mod - service worker
 * Seeds defaults on install, owns the keyboard shortcut, and keeps the
 * toolbar badge honest about whether the theme is on.
 * ==========================================================================*/
/* Chromium runs this as a service worker, where importScripts exists. Firefox
 * MV3 runs it as an event page, where it does not - there the same two files
 * are listed in manifest.background.scripts instead. One file, both worlds. */
if (typeof importScripts === 'function') {
  importScripts('wallpapers.js', 'scenes.js', 'theme-engine.js');
}

/* The badge shows the focus timer when one is running, because that is the
 * thing you want to glance at. Otherwise it just reports the theme state. */
function setBadge(settings) {
  const s = settings || {};
  const focus = Object.assign({}, NWT.DEFAULT_SETTINGS.focus, s.focus);
  const enabled = s.enabled !== false;

  if (focus.enabled && focus.running) {
    /* A minute count here would need an alarm to stay true, and an alarm needs
     * a permission this extension does not otherwise want. The badge says a
     * session is running; the pill on the page carries the live number, and
     * the title is recomputed each time something opens the popup. */
    const counting = focus.targetMin > 0;
    const ms = counting ? NWT.focusRemaining(focus) : NWT.focusElapsed(focus);
    chrome.action.setBadgeText({ text: ms < 0 ? '+' : '\u25CF' });
    chrome.action.setBadgeBackgroundColor({ color: ms < 0 ? '#8a4b1e' : '#2f5d7a' });
    chrome.action.setTitle({ title: 'Focus - ' + NWT.formatDuration(ms) });
    return;
  }

  chrome.action.setBadgeText({ text: enabled ? '' : 'off' });
  chrome.action.setBadgeBackgroundColor({ color: '#3a3f42' });
  chrome.action.setTitle({
    title: 'Pineapple NextWork Theme Studio Mod - ' + (enabled ? 'on' : 'off') + ' (Alt+Shift+D)'
  });
}

function refreshBadge() {
  chrome.storage.local.get(null, function (s) { setBadge(s); });
}

/* Migration runs here, once, and the result is written back. It used to run
 * only in the popup, on a copy that was never persisted - so anyone carrying
 * an older schema had their dials cleared every single time they opened it. */
function seed(cb) {
  chrome.storage.local.get(null, function (current) {
    const seeded = NWT.migrate(Object.assign({}, NWT.DEFAULT_SETTINGS, current || {}));
    delete seeded.migrated;
    chrome.storage.local.set(seeded, function () { setBadge(seeded); if (cb) cb(); });
  });
}

chrome.runtime.onInstalled.addListener(function () { seed(); });
chrome.runtime.onStartup.addListener(function () { seed(); });

chrome.commands.onCommand.addListener(function (command) {
  if (command !== 'toggle-theme') return;
  chrome.storage.local.get({ enabled: true }, function (s) {
    chrome.storage.local.set({ enabled: !s.enabled });
  });
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && (changes.enabled || changes.focus)) refreshBadge();
});
