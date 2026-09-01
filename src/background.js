/* ============================================================================
 * NextWork Theme Studio - service worker
 * Seeds defaults on install, owns the keyboard shortcut, and keeps the
 * toolbar badge honest about whether the theme is on.
 * ==========================================================================*/
importScripts('theme-engine.js');

function setBadge(enabled) {
  chrome.action.setBadgeText({ text: enabled ? '' : 'off' });
  chrome.action.setBadgeBackgroundColor({ color: '#3a3f42' });
  chrome.action.setTitle({
    title: 'NextWork Theme Studio - ' + (enabled ? 'on' : 'off') + ' (Alt+Shift+D)'
  });
}

chrome.runtime.onInstalled.addListener(function () {
  chrome.storage.local.get(null, function (current) {
    const seeded = Object.assign({}, NWT.DEFAULT_SETTINGS, current || {});
    chrome.storage.local.set(seeded, function () { setBadge(seeded.enabled); });
  });
});

chrome.runtime.onStartup.addListener(function () {
  chrome.storage.local.get({ enabled: true }, function (s) { setBadge(s.enabled); });
});

chrome.commands.onCommand.addListener(function (command) {
  if (command !== 'toggle-theme') return;
  chrome.storage.local.get({ enabled: true }, function (s) {
    chrome.storage.local.set({ enabled: !s.enabled });
  });
});

chrome.storage.onChanged.addListener(function (changes, area) {
  if (area === 'local' && changes.enabled) setBadge(changes.enabled.newValue);
});
