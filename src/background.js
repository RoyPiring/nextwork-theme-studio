/* ============================================================================
 * NextWork Theme Studio - service worker
 * Seeds defaults on install, owns the keyboard shortcut, and keeps the
 * toolbar badge honest about whether the theme is on.
 * ==========================================================================*/
importScripts('scenes.js', 'theme-engine.js');

/* The badge shows the focus timer when one is running, because that is the
 * thing you want to glance at. Otherwise it just reports the theme state. */
function setBadge(settings) {
  const s = settings || {};
  const focus = Object.assign({}, NWT.DEFAULT_SETTINGS.focus, s.focus);
  const enabled = s.enabled !== false;

  if (focus.enabled && focus.running) {
    const counting = focus.targetMin > 0;
    const ms = counting ? NWT.focusRemaining(focus) : NWT.focusElapsed(focus);
    const mins = Math.ceil(Math.abs(ms) / 60000);
    chrome.action.setBadgeText({ text: (ms < 0 ? '+' : '') + mins + 'm' });
    chrome.action.setBadgeBackgroundColor({ color: ms < 0 ? '#8a4b1e' : '#2f5d7a' });
    chrome.action.setTitle({ title: 'Focus - ' + NWT.formatDuration(ms) });
    return;
  }

  chrome.action.setBadgeText({ text: enabled ? '' : 'off' });
  chrome.action.setBadgeBackgroundColor({ color: '#3a3f42' });
  chrome.action.setTitle({
    title: 'NextWork Theme Studio - ' + (enabled ? 'on' : 'off') + ' (Alt+Shift+D)'
  });
}

function refreshBadge() {
  chrome.storage.local.get(null, function (s) { setBadge(s); });
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(null, function (current) {
    const seeded = Object.assign({}, NWT.DEFAULT_SETTINGS, current || {});
    chrome.storage.local.set(seeded, function () { setBadge(seeded); });
  });
});

chrome.runtime.onStartup.addListener(refreshBadge);

chrome.commands.onCommand.addListener(function (command) {
  if (command !== 'toggle-theme') return;
  chrome.storage.local.get({ enabled: true }, function (s) {
    chrome.storage.local.set({ enabled: !s.enabled });
  });
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && (changes.enabled || changes.focus)) refreshBadge();
});
