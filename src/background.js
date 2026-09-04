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

/* Put the companion window in one exact place, reusing the one already open
 * for this link rather than adding another beside it. */
function placeCompanion(url, left, top, width, height, reply) {
  const bounds = { left: left | 0, top: top | 0,
                   width: Math.max(320, width | 0), height: Math.max(240, height | 0) };
  const known = paneWindows[url];
  if (known) {
    chrome.windows.update(known, Object.assign({ state: 'normal' }, bounds),
      function () {
        if (!chrome.runtime.lastError) { reply({ docked: true, reused: true }); return; }
        delete paneWindows[url];
        placeCompanion(url, left, top, width, height, reply);
      });
    return;
  }
  chrome.windows.create(Object.assign({ url: url, type: 'popup' }, bounds),
    function (win) {
      if (chrome.runtime.lastError || !win) { reply({ docked: false }); return; }
      paneWindows[url] = win.id;
      reply({ docked: true, reused: false });
    });
}

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
            /* Sub-frames only. A page you navigate to normally is untouched.
             *
             * There was an `initiatorDomains: ['nextwork.ai']` here as well,
             * and taking it out is not a loosening. `modifyHeaders` is only
             * applied where the extension holds host access to *both* ends of
             * the request, and the only initiator it holds access to is
             * nextwork.ai - the browser already confines this to exactly what
             * that condition described. It was restating the permission model,
             * and it was the one condition that could silently fail to match
             * and leave the rule installed, correct-looking and inert. */
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

/* ---------------------------------------------------------------------------
 * Beside the page: real windows, arranged.
 *
 * The page keeps a column on the left; everything open beside it shares the
 * column on the right. One or two go in a single column, three or four in a
 * grid of two, because a quarter of a screen is still usable and a sixth is
 * not - so four is the ceiling.
 * ------------------------------------------------------------------------- */

const MIN_PAGE = 420;   /* narrower than this and the work is not workable */
const MIN_SIDE = 300;   /* narrower than this and the companion is decorative */
const MAX_BESIDE = 4;

function layoutFor(area, splitPct, count) {
  const width = area.width | 0, height = area.height | 0;
  const left = area.left | 0, top = area.top | 0;

  /* The floors in the order that keeps them both true. The other order lets
   * the page take its minimum and hands the companions whatever is left,
   * which on a small screen is less than their own. Below the width where
   * both can hold, it is halved and said plainly rather than faked. */
  const wanted = Math.round(width * (Math.max(30, Math.min(85, splitPct)) / 100));
  const pageW = width < MIN_PAGE + MIN_SIDE
    ? Math.round(width / 2)
    : Math.min(Math.max(wanted, MIN_PAGE), width - MIN_SIDE);

  const page = { left: left, top: top, width: pageW, height: height };
  const n = Math.max(0, Math.min(MAX_BESIDE, count | 0));
  if (!n) return { page: page, cells: [] };

  const colX = left + pageW;
  const colW = width - pageW;
  const cols = n >= 3 ? 2 : 1;
  const rows = Math.ceil(n / cols);
  const cellW = Math.floor(colW / cols);
  const cellH = Math.floor(height / rows);

  const cells = [];
  for (let i = 0; i < n; i++) {
    const c = i % cols, r = (i - c) / cols;
    cells.push({
      left: colX + c * cellW,
      top: top + r * cellH,
      /* The last in a row takes the remainder, so rounding never leaves a
       * stripe of desktop showing down the middle. */
      width: c === cols - 1 ? colW - c * cellW : cellW,
      height: r === rows - 1 ? height - r * cellH : cellH
    });
  }
  return { page: page, cells: cells };
}

/* Move a window that already exists, or make one. Answers with its id so the
 * caller can record it, and with nothing if the browser refused. */
function placeOne(url, rect, then) {
  const known = besideWindows[url];
  const bounds = { left: rect.left, top: rect.top,
                   width: Math.max(200, rect.width), height: Math.max(180, rect.height) };
  if (known) {
    chrome.windows.update(known, { state: 'normal' }, function () {
      void chrome.runtime.lastError;
      chrome.windows.update(known, bounds, function () {
        if (!chrome.runtime.lastError) { then(known); return; }
        /* Closed without us hearing - a worker that was asleep gets no
         * backlog - so it is made again rather than given up on. */
        delete besideWindows[url];
        placeOne(url, rect, then);
      });
    });
    return;
  }
  chrome.windows.create(Object.assign({ url: url, type: 'popup' }, bounds),
    function (win) {
      if (chrome.runtime.lastError || !win) { then(null); return; }
      besideWindows[url] = win.id;
      then(win.id);
    });
}

/* Which link is in which window. Held in the worker, not in storage: it is
 * about windows that exist right now, and a worker that restarts has none it
 * still knows about. */
const besideWindows = Object.create(null);

if (chrome.windows && chrome.windows.onRemoved) {
  chrome.windows.onRemoved.addListener(function (id) {
    /* A window closed from its own corner is the same instruction as turning
     * it off in the popup, and has to be recorded as one - otherwise the
     * popup goes on claiming it is open and the next arrangement reopens it. */
    let closed = null;
    Object.keys(besideWindows).forEach(function (url) {
      if (besideWindows[url] === id) { closed = url; delete besideWindows[url]; }
    });
    if (!closed) return;
    chrome.storage.local.get({ windows: {} }, function (stored) {
      if (chrome.runtime.lastError) return;
      const w = stored.windows || {};
      const items = (w.items || []).map(function (it) {
        return it && it.url === closed ? Object.assign({}, it, { on: false }) : it;
      });
      chrome.storage.local.set({ windows: Object.assign({}, w, { items: items }) });
    });
  });
}

chrome.runtime.onMessage.addListener(function (msg, sender, reply) {
  /* Both prefixes. The pane's messages start with `companion:` and the windows
   * beside the page start with `windows:`; a guard that named only the first
   * dropped every one of the second on the floor, silently, because a listener
   * that returns nothing is how a message is declined. */
  if (!msg || typeof msg.type !== 'string') return;
  if (msg.type.indexOf('companion:') !== 0 && msg.type.indexOf('windows:') !== 0) return;

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
  /* Side by side: the page keeps the left of the screen, the companion takes
   * the right, and both are real browser windows.
   *
   * This is the answer to the thing the frame could not do. A site that
   * refuses to be shown inside another page is not refusing to exist beside
   * one - the refusal is about being embedded, and a window of its own is not
   * an embedding. Discord signs in, connects to voice and behaves exactly as
   * it does in a tab, because as far as it is concerned it is one.
   *
   * The screen's measurements come from the page rather than from an API,
   * because reading them properly needs the `system.display` permission and
   * every page already knows how big its own screen is. */
  /* Arrange everything that is meant to be beside the page, and the page with
   * it. Driven from the popup, which knows the screen it is on and can ask the
   * browser which window it belongs to. */
  if (msg.type === 'windows:arrange') {
    const area = msg.screen || {};
    const urls = (msg.urls || []).filter(function (u) { return !!originOf(u); })
                                 .slice(0, MAX_BESIDE);
    if (!(area.width > 0) || !(area.height > 0)) { reply({ placed: 0 }); return true; }

    const plan = layoutFor(area, Number(msg.split) || 62, urls.length);

    chrome.windows.getCurrent(function (win) {
      if (chrome.runtime.lastError || !win) { reply({ placed: 0 }); return; }

      chrome.storage.local.get({ windows: {} }, function (stored) {
        const w = stored.windows || {};
        /* Remembered once, on the first arrangement, so that undoing it goes
         * back to where the window actually was rather than to the last
         * arrangement of it. */
        const prior = w.priorWindow || { left: win.left, top: win.top,
                                         width: win.width, height: win.height,
                                         state: win.state };
        chrome.storage.local.set({
          windows: Object.assign({}, w, { priorWindow: prior })
        }, function () {
          /* Bounds are ignored while a window is maximised, so it comes out of
           * that state first. Set together, the page stays full width with the
           * companions sitting on top of it. */
          chrome.windows.update(win.id, { state: 'normal' }, function () {
            void chrome.runtime.lastError;
            chrome.windows.update(win.id, plan.page, function () {
              void chrome.runtime.lastError;
              let left = urls.length, placed = 0;
              if (!left) { reply({ placed: 0, page: plan.page }); return; }
              urls.forEach(function (url, i) {
                placeOne(url, plan.cells[i], function (id) {
                  if (id) placed++;
                  if (--left === 0) reply({ placed: placed, page: plan.page });
                });
              });
            });
          });
        });
      });
    });
    return true;
  }

  /* Close one, without disturbing the others. */
  if (msg.type === 'windows:close') {
    const id = besideWindows[msg.url];
    if (!id) { reply({ closed: true }); return true; }
    chrome.windows.remove(id, function () {
      void chrome.runtime.lastError;
      delete besideWindows[msg.url];
      reply({ closed: true });
    });
    return true;
  }

  /* Give the page its screen back. */
  if (msg.type === 'windows:restore') {
    chrome.storage.local.get({ windows: {} }, function (stored) {
      const w = stored.windows || {};
      const prior = w.priorWindow;
      const items = (w.items || []).map(function (it) {
        return it ? Object.assign({}, it, { on: false }) : it;
      });
      const next = Object.assign({}, w, { items: items });
      delete next.priorWindow;

      Object.keys(besideWindows).forEach(function (url) {
        chrome.windows.remove(besideWindows[url], function () { void chrome.runtime.lastError; });
        delete besideWindows[url];
      });

      chrome.storage.local.set({ windows: next }, function () {
        if (!prior || !(prior.width > 0)) { reply({ restored: false }); return; }
        chrome.windows.getCurrent(function (win) {
          if (chrome.runtime.lastError || !win) { reply({ restored: false }); return; }
          chrome.windows.update(win.id, {
            left: prior.left | 0, top: prior.top | 0,
            width: prior.width, height: prior.height
          }, function () {
            void chrome.runtime.lastError;
            if (prior.state === 'maximized') {
              chrome.windows.update(win.id, { state: 'maximized' },
                function () { void chrome.runtime.lastError; });
            }
            reply({ restored: true });
          });
        });
      });
    });
    return true;
  }

  if (msg.type === 'companion:dock') {
    const src = originOf(msg.url) ? msg.url : null;
    const area = msg.screen || {};
    const windowId = sender && sender.tab && sender.tab.windowId;
    if (!src || !windowId || !(area.width > 0) || !(area.height > 0)) {
      reply({ docked: false });
      return true;
    }

    /* A little under two thirds for the work, the rest for what you are
     * watching, with a floor under each so neither ends up too narrow to use.
     *
     * The floors are applied in the order that keeps them both true. Written
     * the other way round - max(floor, min(width - other, share)) - the outer
     * max wins on a small screen and hands the companion less than its own
     * floor, which is the half more likely to be unusable. Below the width
     * where both can be met, it is halved and said plainly rather than
     * pretending one of them fits. */
    const MIN_PAGE = 480, MIN_SIDE = 320;
    const gap = 0;
    const leftW = area.width < MIN_PAGE + MIN_SIDE
      ? Math.round(area.width / 2)
      : Math.min(Math.max(Math.round(area.width * 0.62), MIN_PAGE), area.width - MIN_SIDE);
    const rightW = area.width - leftW - gap;

    chrome.windows.get(windowId, function (win) {
      if (chrome.runtime.lastError || !win) { reply({ docked: false }); return; }

      /* Remembered so undocking can put the window back where it was. A
       * maximised window reports bounds that are not where it would return
       * to, so its state is kept as well. */
      chrome.storage.local.get({ companion: {} }, function (stored) {
        const companion = Object.assign({}, stored.companion, {
          docked: true,
          priorWindow: { left: win.left, top: win.top, width: win.width,
                         height: win.height, state: win.state }
        });
        chrome.storage.local.set({ companion: companion }, function () {
          /* Bounds are ignored while a window is maximised, so it is taken out
           * of that state first and moved afterwards. */
          chrome.windows.update(windowId, { state: 'normal' }, function () {
            void chrome.runtime.lastError;
            chrome.windows.update(windowId, {
              left: area.left | 0, top: area.top | 0,
              width: leftW, height: area.height
            }, function () {
              void chrome.runtime.lastError;
              placeCompanion(src, (area.left | 0) + leftW + gap, area.top | 0,
                             rightW, area.height, reply);
            });
          });
        });
      });
    });
    return true;
  }

  if (msg.type === 'companion:undock') {
    const windowId = sender && sender.tab && sender.tab.windowId;
    chrome.storage.local.get({ companion: {} }, function (stored) {
      const c = stored.companion || {};
      const prior = c.priorWindow;
      const rest = Object.assign({}, c, { docked: false });
      delete rest.priorWindow;
      chrome.storage.local.set({ companion: rest }, function () {
        if (windowId && prior && prior.width > 0) {
          chrome.windows.update(windowId, {
            left: prior.left | 0, top: prior.top | 0,
            width: prior.width, height: prior.height
          }, function () {
            void chrome.runtime.lastError;
            if (prior.state === 'maximized') {
              chrome.windows.update(windowId, { state: 'maximized' },
                function () { void chrome.runtime.lastError; });
            }
          });
        }
        reply({ docked: false });
      });
    });
    return true;
  }

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
