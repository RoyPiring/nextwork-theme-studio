/* ============================================================================
 * Pineapple NextWork Theme Studio Mod - service worker
 * Seeds defaults on install, owns the keyboard shortcut, and keeps the
 * toolbar badge honest about whether the theme is on.
 * ==========================================================================*/
/* Strict mode. This file is the one that is not wrapped in a function, since a
 * worker's top level is where its listeners have to be registered, so without
 * it a mistyped assignment would quietly create a global instead of throwing. */
'use strict';

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
  chrome.storage.local.get(null, function (s) {
    if (chrome.runtime.lastError) return;
    setBadge(s);
  });
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

/* ---------------------------------------------------------------------------
 * The companion pane, and why it needs a permission at all
 *
 * A site decides whether it may be shown inside another page. Most say no:
 * `X-Frame-Options: DENY`, or a `frame-ancestors` line in their content
 * security policy. Discord says no. Notion says no. A frame pointed at one of
 * them stays blank, and no amount of markup changes that - the refusal is the
 * site's, and the browser enforces it.
 *
 * An extension can drop those headers as the response goes past. That is the
 * only way a pane like this holds anything beyond the few sites that already
 * allow being framed.
 *
 * Those headers are not decoration. They stop a page you are signed in to from
 * being framed by someone else and clicked through invisibly. Dropping them
 * everywhere would be a real loss, so this does not:
 *
 *   - Nothing changes until you name a site and grant it. The browser's own
 *     prompt asks, naming the site. The extension ships with no host access
 *     beyond nextwork.ai and cannot grant itself any.
 *   - The rule carries `initiatorDomains`, so it applies only to a frame that
 *     nextwork.ai opened, which is only ever this pane. The same site framed
 *     by anything else on the web keeps every header it sent.
 *   - It applies to sub-frames only. A page you navigate to normally is
 *     untouched.
 *   - Taking it back is one control in the popup, and it takes the rule too.
 *
 * `content-security-policy` is dropped whole rather than edited, because a
 * rule can remove or replace a header, not reach inside one and take out a
 * single directive. Inside a frame that only this pane can open, that is the
 * price, and it is written here so it is not a surprise.
 * ------------------------------------------------------------------------- */

const FRAME_HEADERS = [
  { header: 'x-frame-options', operation: 'remove' },
  { header: 'content-security-policy', operation: 'remove' },
  { header: 'content-security-policy-report-only', operation: 'remove' }
];

/* Rule ids must be numbers and must be stable, so one site always maps to one
 * id and granting twice replaces the rule rather than stacking another. */
function ruleId(host) {
  let h = 0;
  for (let i = 0; i < host.length; i++) h = (h * 31 + host.charCodeAt(i)) % 900000;
  return h + 1000;
}

function originOf(url) {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' ? u.origin : null;
  } catch (e) {
    return null;
  }
}

function pattern(origin) { return origin + '/*'; }

/* One rule per allowed site, rebuilt from what the browser says is granted
 * rather than from anything stored. A permission taken back in the browser's
 * own settings leaves storage untouched, and a rule outliving its permission
 * would be a header quietly missing from a site nobody had allowed. */
function syncRules(done) {
  chrome.permissions.getAll(function (granted) {
    const origins = ((granted && granted.origins) || [])
      .filter(p => /^https:\/\//.test(p) && !/nextwork\.ai/.test(p));

    chrome.declarativeNetRequest.getDynamicRules(function (existing) {
      const wanted = origins.map(function (p) {
        const host = p.replace(/^https:\/\//, '').replace(/\/\*$/, '').replace(/^\*\./, '');
        return {
          id: ruleId(host),
          priority: 1,
          action: { type: 'modifyHeaders', responseHeaders: FRAME_HEADERS },
          condition: {
            requestDomains: [host],
            /* Only a frame this pane opened. */
            initiatorDomains: ['nextwork.ai'],
            resourceTypes: ['sub_frame']
          }
        };
      });
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: (existing || []).map(r => r.id),
        addRules: wanted
      }, function () { if (done) done(origins); });
    });
  });
}

/* Kept in step with the browser rather than assumed: a permission can be taken
 * back from the browser's own settings, with nothing to say so but this. */
if (chrome.permissions.onAdded) {
  chrome.permissions.onAdded.addListener(function () { syncRules(); });
}
if (chrome.permissions.onRemoved) {
  chrome.permissions.onRemoved.addListener(function () { syncRules(); });
}
chrome.runtime.onStartup.addListener(function () { syncRules(); });

chrome.runtime.onMessage.addListener(function (msg, sender, reply) {
  if (!msg || typeof msg.type !== 'string' || msg.type.indexOf('companion:') !== 0) return;

  /* Whether this site is already allowed. The pane asks before it loads, so it
   * can say what is wrong instead of showing a blank rectangle and guessing at
   * the reason afterwards. */
  if (msg.type === 'companion:allowed') {
    const origin = originOf(msg.url);
    if (!origin) { reply({ allowed: false }); return true; }
    chrome.permissions.contains({ origins: [pattern(origin)] }, function (has) {
      reply({ allowed: !!has && !chrome.runtime.lastError, origin: origin });
    });
    return true;
  }

  /* Asking for a site. The browser prompts; this cannot grant itself anything,
   * and the prompt only ever follows a click in the popup. */
  if (msg.type === 'companion:allow') {
    const origin = originOf(msg.url);
    if (!origin) { reply({ allowed: false }); return true; }
    chrome.permissions.request({ origins: [pattern(origin)] }, function (given) {
      if (!given || chrome.runtime.lastError) { reply({ allowed: false }); return; }
      syncRules(function () { reply({ allowed: true, origin: origin }); });
    });
    return true;
  }

  if (msg.type === 'companion:forget') {
    const origin = originOf(msg.url);
    if (!origin) { reply({ allowed: false }); return true; }
    chrome.permissions.remove({ origins: [pattern(origin)] }, function () {
      syncRules(function () { reply({ allowed: false }); });
    });
    return true;
  }

  /* Raised from the pane, which cannot show the prompt itself: a content
   * script is not an extension page, and the browser only puts that prompt in
   * front of someone who clicked inside one. So the site is written down and
   * the page that can ask is opened with it already named.
   *
   * The popup is the better of the two - it is where the rest of the controls
   * are - but opening it from code needs a newer browser than this supports,
   * so the options page is the one that always works. */
  if (msg.type === 'companion:ask') {
    const origin = originOf(msg.url);
    if (!origin) { reply({ opened: false }); return true; }
    chrome.storage.local.get({ companion: {} }, function (stored) {
      const companion = Object.assign({}, stored.companion, { pending: msg.url });
      chrome.storage.local.set({ companion: companion }, function () {
        const opened = function () { reply({ opened: true }); };
        if (chrome.action && chrome.action.openPopup) {
          try {
            chrome.action.openPopup(function () {
              if (chrome.runtime.lastError) { chrome.runtime.openOptionsPage(opened); return; }
              opened();
            });
            return;
          } catch (e) { /* older browsers throw rather than report */ }
        }
        chrome.runtime.openOptionsPage(opened);
      });
    });
    return true;
  }

  /* A window of its own: a real browser window, so it holds anything at all,
   * including the sites that refuse to be framed whatever the headers say. */
  if (msg.type === 'companion:window') {
    if (!originOf(msg.url)) { reply({ opened: false }); return true; }
    chrome.windows.create({
      url: msg.url, type: 'popup',
      width: Math.max(320, Math.min(1600, Number(msg.w) || 480)),
      height: Math.max(240, Math.min(1200, Number(msg.h) || 640))
    }, function () { reply({ opened: !chrome.runtime.lastError }); });
    return true;
  }
});
