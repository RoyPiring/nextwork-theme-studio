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
 *     a nextwork.ai page opened. The same site framed by anything else on the
 *     web keeps every header it sent.
 *   - It applies to sub-frames only. A page you navigate to normally is
 *     untouched.
 *   - Taking it back is one control in the popup, and it takes the rule too.
 *
 * Two limits worth being exact about, because the looser version of each
 * reads better and is not true:
 *
 *   - `initiatorDomains` cannot say "a frame this extension made". It says
 *     "a frame a nextwork.ai document opened", and this pane is not the only
 *     thing that could be. If nextwork.ai were ever made to frame an allowed
 *     site itself, that frame would get the stripped headers too.
 *   - Granting a site is a host permission, and a host permission is broader
 *     than the rules built from it: it would also allow this extension to
 *     fetch that site with your cookies attached. It does not - the audit
 *     rejects every network call in `src/`, and CI runs it - but the grant
 *     itself is wider than its use, and you are consenting to the grant.
 *
 * `content-security-policy` is dropped whole rather than edited, because a
 * rule can remove or replace a header, not reach inside one and take out a
 * single directive. That is a wider cut than `frame-ancestors` alone, and it
 * is written here so it is not a surprise.
 * ------------------------------------------------------------------------- */

const FRAME_HEADERS = [
  { header: 'x-frame-options', operation: 'remove' },
  { header: 'content-security-policy', operation: 'remove' },
  { header: 'content-security-policy-report-only', operation: 'remove' }
];

/* A concrete host and nothing else.
 *
 * `optional_host_permissions` is declared as a wildcard over https sites, so
 * what comes back from the browser is whatever was granted - and a browser
 * offers ways to
 * grant access to every site at once. That arrives here as `*`, and a rule
 * built around it would strip framing headers from the entire web. Anything
 * that is not a plain hostname is dropped rather than interpreted.
 *
 * The nextwork.ai test is an exact match on the host, not a search for the
 * text: as a substring it also skipped nextwork.ai.example, which is a
 * different site belonging to somebody else. */
function hostOf(patternText) {
  const m = /^https:\/\/([^/*]+)\/\*$/.exec(patternText);
  if (!m) return null;
  const host = m[1];
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/i.test(host)) {
    return null;
  }
  if (host === 'nextwork.ai' || /\.nextwork\.ai$/.test(host)) return null;
  return host;
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

/* Which link is showing in which window, so the same link is brought forward
 * rather than opened again. Held in the worker rather than in storage: it is
 * about windows that exist right now, and a worker that restarts has no
 * windows it still knows about. */
const paneWindows = Object.create(null);

function openPaneWindow(msg, reply) {
  chrome.windows.create({
    url: msg.url, type: 'popup',
    width: Math.max(320, Math.min(1600, Number(msg.w) || 480)),
    height: Math.max(240, Math.min(1200, Number(msg.h) || 640))
  }, function (win) {
    if (chrome.runtime.lastError || !win) { reply({ opened: false }); return; }
    paneWindows[msg.url] = win.id;
    reply({ opened: true, reused: false });
  });
}

if (chrome.windows && chrome.windows.onRemoved) {
  chrome.windows.onRemoved.addListener(function (id) {
    Object.keys(paneWindows).forEach(function (url) {
      if (paneWindows[url] === id) delete paneWindows[url];
    });
  });
}

/* One rule per allowed site, rebuilt from what the browser says is granted
 * rather than from anything stored. A permission taken back in the browser's
 * own settings leaves storage untouched, and a rule outliving its permission
 * would be a header quietly missing from a site nobody had allowed. */
function syncRules(done) {
  chrome.permissions.getAll(function (granted) {
    const hosts = ((granted && granted.origins) || [])
      .map(hostOf).filter(Boolean).sort();

    chrome.declarativeNetRequest.getDynamicRules(function (existing) {
      /* Numbered by position rather than by a hash of the name. Two hosts
       * whose hashes landed on the same number produced two rules with one id,
       * which the browser rejects as a batch - so a single unlucky pair of
       * sites would have silently uninstalled every rule, including the ones
       * that were working, with nothing anywhere to say so. The whole set is
       * rebuilt on every change, so a position is all an id has to be. */
      const wanted = hosts.map(function (host, i) {
        return {
          id: 1000 + i,
          priority: 1,
          action: { type: 'modifyHeaders', responseHeaders: FRAME_HEADERS },
          condition: {
            requestDomains: [host],
            /* Frames opened by a nextwork.ai page. That is narrower than the
             * whole web and wider than this pane alone - there is no condition
             * for "a frame this extension created" - so it is written down as
             * what it is rather than as what would be nicer. */
            initiatorDomains: ['nextwork.ai'],
            resourceTypes: ['sub_frame']
          }
        };
      });
      chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: (existing || []).map(r => r.id),
        addRules: wanted
      }, function () { if (done) done(hosts); });
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
/* And on install, update and reload. This is the one that was missing, and it
 * is why a site could be granted and still refuse to appear.
 *
 * Dynamic rules outlive the worker, so building them once looked like enough.
 * It is not: a rule that failed to install - because the extension did not yet
 * hold host access to both ends of the request, which is the fault this
 * follows - leaves nothing behind, and nothing was ever going to try again.
 * `onStartup` only fires when the browser starts, not when the extension is
 * reloaded, so reloading it to pick up the fix did not help either. The
 * permission was granted, the popup said so, and no rule existed.
 *
 * Run at the top level as well, so any wake of the worker puts them back. It
 * reads what the browser reports and rewrites the same set, so doing it more
 * often costs nothing and being wrong once stops being permanent. */
chrome.runtime.onInstalled.addListener(function () { syncRules(); });
syncRules();

chrome.runtime.onMessage.addListener(function (msg, sender, reply) {
  if (!msg || typeof msg.type !== 'string' || msg.type.indexOf('companion:') !== 0) return;

  /* Whether this site is already allowed. The pane asks before it loads, so it
   * can say what is wrong instead of showing a blank rectangle and guessing at
   * the reason afterwards. */
  if (msg.type === 'companion:allowed') {
    const origin = originOf(msg.url);
    if (!origin) { reply({ allowed: false }); return true; }
    chrome.permissions.contains({ origins: [pattern(origin)] }, function (has) {
      const allowed = !!has && !chrome.runtime.lastError;
      /* Permission granted and a rule installed are two different things, and
       * the gap between them is invisible from the page: the site is allowed,
       * the popup says so, and the frame is still refused because no rule is
       * carrying the header removal. That gap was a real fault, and it is
       * reported now rather than left to be guessed at. */
      chrome.declarativeNetRequest.getDynamicRules(function (rules) {
        const host = hostOf(pattern(origin));
        const active = (rules || []).some(function (r) {
          return r.condition && (r.condition.requestDomains || []).indexOf(host) !== -1;
        });
        reply({ allowed: allowed, active: active, origin: origin });
      });
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

  /* A window of its own: a real browser window, so it holds anything at all -
   * including every site that will not run inside another page whatever its
   * headers say, and including sites that need to be signed in, because a
   * window is a first-party context and a frame on someone else's page is
   * not. That last part is why Discord is blank in the pane and fine here.
   *
   * The same link reuses its window rather than opening another. Clicking
   * twice used to leave two, which is the opposite of keeping one thing in
   * view beside your work. */
  if (msg.type === 'companion:window') {
    if (!originOf(msg.url)) { reply({ opened: false }); return true; }

    const known = paneWindows[msg.url];
    if (known) {
      chrome.windows.update(known, { focused: true, drawAttention: true },
        function () {
          if (!chrome.runtime.lastError) { reply({ opened: true, reused: true }); return; }
          /* It was closed without us hearing. Forget it and open a new one. */
          delete paneWindows[msg.url];
          openPaneWindow(msg, reply);
        });
      return true;
    }
    openPaneWindow(msg, reply);
    return true;
  }
});
