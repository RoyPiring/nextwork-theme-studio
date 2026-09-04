/* ============================================================================
 * Pineapple NextWork Theme Studio Mod - content script
 * Runs at document_start. Injects one <style> element built from the saved
 * theme, then keeps it in sync with storage.
 * ==========================================================================*/
'use strict';

(function () {
  'use strict';

  const STYLE_ID = 'nwt-theme';
  const BOOT_KEY = '__nwt_boot_v2';
  const TOP_FRAME = (function () {
    try { return window.top === window; } catch (e) { return false; }
  })();

  /* Whatever we last put on the page, so we can put it back if it is torn out. */
  let lastCSS = '';

  function styleEl() {
    let el = document.getElementById(STYLE_ID);
    if (!el) {
      el = document.createElement('style');
      el.id = STYLE_ID;
      el.type = 'text/css';
      /* documentElement, not head: head does not exist yet at document_start
       * and some frameworks rewrite it wholesale on hydration. */
      (document.head || document.documentElement).appendChild(el);
    }
    return el;
  }

  function apply(css) {
    if (!css) { remove(); return; }
    lastCSS = css;
    const el = styleEl();
    if (el.textContent !== css) el.textContent = css;
  }

  function remove() {
    lastCSS = '';
    const el = document.getElementById(STYLE_ID);
    if (el) el.remove();
  }

  /* ---- zero-flash path -----------------------------------------------
   * chrome.storage is async, which is long enough for a white page to paint.
   * localStorage is synchronous, so it is the only place a hint can live.
   *
   * But that storage belongs to nextwork.ai, not to us: the site's own code,
   * or anything that manages to run on it, can write whatever it likes there.
   * So the hint is never CSS. We store a theme id, check it against the
   * presets compiled into the extension, and build the stylesheet ourselves.
   * The worst a forged hint can do is show one of our own themes for a few
   * milliseconds before real settings arrive.
   *
   * Only the top frame participates. Subframes share the origin and the key,
   * so they used to race each other writing the same value. */
  function bootThemeId() {
    if (!TOP_FRAME) return null;
    let hint = null;
    try { hint = JSON.parse(localStorage.getItem(BOOT_KEY) || 'null'); } catch (e) { return null; }
    if (!hint || hint.enabled !== true) return null;
    if (typeof hint.themeId !== 'string') return null;
    return NWT.PRESETS[hint.themeId] ? hint.themeId : null;
  }

  const booted = bootThemeId();
  if (booted) {
    try {
      apply(NWT.buildCSS(Object.assign({}, NWT.DEFAULT_SETTINGS, { themeId: booted })));
    } catch (e) { /* real settings are milliseconds away */ }
  }

  function writeCache(enabled, themeId) {
    if (!TOP_FRAME) return;
    try {
      localStorage.setItem(BOOT_KEY, JSON.stringify({ enabled: enabled, themeId: themeId || '' }));
    } catch (e) { /* private mode */ }
  }

  /* ---- shadow roots ----------------------------------------------------
   * NextWork ships web components (nw-tooltip, nw-button, nw-badge, nw-icon
   * and friends) whose shadow roots each carry a copy of the site's theme on
   * :host. A document stylesheet cannot reach inside them, so the components
   * keep their light-mode tokens. Every one of these roots is open and
   * supports adoptedStyleSheets, so we hand each a shadow-scoped copy. */
  let shadowSheet = null;

  function shadowSheetFor(css) {
    if (shadowSheet === null) {
      try { shadowSheet = new CSSStyleSheet(); }
      catch (e) { shadowSheet = false; }   /* older engines: skip silently */
    }
    if (!shadowSheet) return null;
    try { shadowSheet.replaceSync(css); } catch (e) { return null; }
    return shadowSheet;
  }

  /* One sheet object is reused for the whole session (replaceSync swaps its
   * contents), so a root only ever needs adopting once. Remembering which ones
   * are done turns the re-sweep after every mutation into a cheap walk. */
  const adoptedRoots = new WeakSet();

  /* The same roots again, in something we can iterate.
   *
   * A document stylesheet stops at a shadow boundary and so does
   * querySelectorAll, which is why the welcome heading could be corrected and
   * the suggestion chips next to it could not: the chips are nw-* components,
   * and everything inside them was out of reach. adopt() already sees every
   * root we discover, so keeping a list here costs nothing.
   *
   * WeakRef where it exists, so a component that unmounts can be collected
   * rather than pinned by this list for the life of the page. */
  const RootRef = typeof WeakRef === 'function' ? WeakRef : null;
  const knownRoots = [];

  /* Run fn over the document and every live shadow root, compacting away the
   * ones whose host has since been removed. */
  function eachRoot(fn) {
    fn(document);
    let live = 0;
    for (let i = 0; i < knownRoots.length; i++) {
      const root = RootRef ? knownRoots[i].deref() : knownRoots[i];
      if (!root) continue;
      if (root.host && root.host.isConnected === false) continue;
      knownRoots[live++] = knownRoots[i];
      try { fn(root); } catch (e) { /* one bad root must not stop the rest */ }
    }
    knownRoots.length = live;
  }

  function adopt(root, sheet) {
    if (adoptedRoots.has(root)) return;
    knownRoots.push(RootRef ? new RootRef(root) : root);
    try {
      const current = root.adoptedStyleSheets || [];
      if (current.indexOf(sheet) === -1) root.adoptedStyleSheets = current.concat(sheet);
      adoptedRoots.add(root);
    } catch (e) { /* closed or cross-origin root */ }
  }

  /* The app mounts components continuously, and each mutation used to trigger
   * a full document walk plus a walk of every shadow root inside it. Coalesce
   * them instead. */
  let paintQueued = false;
  /* Subtrees that were added since the last pass. Painting these is bounded by
   * what actually changed, rather than by the size of the page.
   *
   * The debounce alone bounded how *often* the walk ran, not how much it did:
   * every pass was still querySelectorAll('*') from the root plus a recursive
   * walk of every shadow root under it, on a page that mounts components
   * continuously. */
  let pendingRoots = [];

  function schedulePaint(scopes) {
    if (!shadowSheet) return;
    if (scopes && scopes.length) {
      for (let i = 0; i < scopes.length; i++) pendingRoots.push(scopes[i]);
    } else {
      pendingRoots = null;              /* null means "the whole document" */
    }
    if (paintQueued) return;
    paintQueued = true;
    setTimeout(function () {
      paintQueued = false;
      const scoped = pendingRoots;
      pendingRoots = [];
      try {
        if (scoped === null) {
          paintShadowRoots(shadowSheet);
        } else {
          for (let i = 0; i < scoped.length; i++) {
            /* An element removed again before this ran has no owner document. */
            if (scoped[i].isConnected === false) continue;
            adoptWithin(shadowSheet, scoped[i]);
          }
        }
      } catch (e) { /* never break the page */ }
    }, 120);
  }

  /* The element itself may host a shadow root, and so may anything under it. */
  function adoptWithin(sheet, el) {
    if (el.shadowRoot) { adopt(el.shadowRoot, sheet); paintShadowRoots(sheet, el.shadowRoot); }
    paintShadowRoots(sheet, el);
  }

  function paintShadowRoots(sheet, scope) {
    if (!sheet) return;
    const host = scope || document;
    let nodes;
    try { nodes = host.querySelectorAll('*'); } catch (e) { return; }
    for (let i = 0; i < nodes.length; i++) {
      const sr = nodes[i].shadowRoot;
      if (sr) { adopt(sr, sheet); paintShadowRoots(sheet, sr); }   /* nested roots too */
    }
  }

  /* ---- focus HUD -------------------------------------------------------
   * A small pill in the corner showing the timer. It ticks locally from the
   * stored timestamps rather than being driven from outside, so it stays
   * correct even if nothing messages it for an hour. */
  const HUD_ID = 'nwt-focus';
  let hudTimer = null;

  function hudEl() {
    let el = document.getElementById(HUD_ID);
    if (!el) {
      el = document.createElement('div');
      el.id = HUD_ID;
      el.setAttribute('role', 'status');
      el.setAttribute('aria-live', 'off');
      const time = document.createElement('span');
      time.className = 'nwt-focus-time';
      const label = document.createElement('span');
      label.className = 'nwt-focus-label';
      el.appendChild(time);
      el.appendChild(label);
      (document.body || document.documentElement).appendChild(el);
    }
    return el;
  }

  function removeHud() {
    if (hudTimer) { clearInterval(hudTimer); hudTimer = null; }
    const el = document.getElementById(HUD_ID);
    if (el) el.remove();
  }

  /* The chime is played once, when the session first goes past its length.
   *
   * "Once" has to mean once across every open project page, not once per page.
   * Each tab runs its own copy of this script and they all cross the end of
   * the session in the same second, so a marker held only in the page meant
   * three open tabs chimed three times, over the top of each other.
   *
   * So the marker goes in storage, where every tab can see it, and the local
   * copy below only stops this tab from playing twice while that write is
   * still in flight. Two tabs can still both reach the crossing inside that
   * window and both play; the cost of losing that race is one duplicated
   * chime, which is worth less than the machinery to close it. */
  let chimedFor = null;

  function paintHud(focus) {
    const el = hudEl();
    const counting = focus.targetMin > 0;
    const value = counting ? NWT.focusRemaining(focus) : NWT.focusElapsed(focus);
    const over = focus.running && counting && value < 0;

    el.querySelector('.nwt-focus-time').textContent = NWT.formatDuration(value);
    el.querySelector('.nwt-focus-label').textContent =
      !focus.running ? 'paused' : (over ? 'over' : 'focus');
    el.setAttribute('data-state',
      !focus.running ? 'paused' : (over ? 'over' : 'running'));

    /* Once per session, and only on the crossing. The session is identified by
     * when it started, so a reset or a new session chimes again while a paint
     * every second does not.
     *
     * The marker is not cleared when the session stops being over. It used to
     * be, which meant pausing a session that had already run over and starting
     * it again chimed a second time for the same session - the same end, the
     * same moment, announced twice. */
    const session = focus.startedAt || 0;
    if (!over || !focus.chime) return;
    if (chimedFor === session || focus.chimedFor === session) return;

    chimedFor = session;
    /* Written before playing, so the other open tabs see it as early as they
     * can rather than after the sound has finished. */
    chrome.storage.local.get({ focus: {} }, function (stored) {
      if (chrome.runtime.lastError) return;
      const f = stored.focus || {};
      if (f.chimedFor === session) return;
      chrome.storage.local.set({ focus: Object.assign({}, f, { chimedFor: session }) });
    });
    chime();
  }

  /* A short two-note chime, built rather than fetched.
   *
   * The extension never loads anything, and that is not a rule to work around
   * for a sound: an audio file would be a request, or a payload to carry.
   * Two oscillators cost nothing and are quieter to ship.
   *
   * Everything here is wrapped: audio is not worth a broken timer. A page
   * with no audio, a browser that refuses one before it has been clicked, a
   * device with nothing to play through - each ends with the sound missing,
   * which is what the flashing pill is also there for. */
  function chime() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      const ctx = new Ctx();

      const play = (hz, at, seconds) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.value = hz;
        /* Eased in and out. A square-edged tone clicks at both ends, which
         * reads as a fault rather than a chime. */
        gain.gain.setValueAtTime(0, ctx.currentTime + at);
        gain.gain.linearRampToValueAtTime(0.14, ctx.currentTime + at + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + seconds);
        osc.connect(gain).connect(ctx.destination);
        osc.start(ctx.currentTime + at);
        osc.stop(ctx.currentTime + at + seconds + 0.02);
      };

      /* A fifth apart, the second a little softer: two notes read as a signal
       * where one reads as a notification from something else. */
      play(880, 0, 0.28);
      play(1320, 0.16, 0.34);

      /* Closed once it has finished, so a long session does not leave a
       * context open for every chime it played. */
      setTimeout(function () {
        try { ctx.close(); } catch (e) { /* already closed */ }
      }, 1200);
    } catch (e) {
      /* No sound. The pill is still flashing. */
    }
  }

  /* ---- dragging --------------------------------------------------------
   * Position is stored as a fraction of the viewport rather than pixels, so
   * the pill keeps its relative place when the window is resized. It is also
   * clamped on every paint, so it can never end up off-screen. */
  function placeHud(el, focus) {
    if (focus.hudX == null || focus.hudY == null) {
      el.style.left = el.style.top = el.style.right = '';
      return;
    }
    const w = el.offsetWidth || 180, h = el.offsetHeight || 40;
    const maxX = Math.max(0, window.innerWidth - w - 8);
    const maxY = Math.max(0, window.innerHeight - h - 8);
    el.style.left = Math.min(maxX, Math.max(8, focus.hudX * window.innerWidth)) + 'px';
    el.style.top = Math.min(maxY, Math.max(8, focus.hudY * window.innerHeight)) + 'px';
    el.style.right = 'auto';
  }

  function makeDraggable(el) {
    if (el.dataset.draggable === '1') return;
    el.dataset.draggable = '1';
    let startX = 0, startY = 0, originX = 0, originY = 0, moved = false;

    el.addEventListener('pointerdown', function (e) {
      if (e.button !== 0 || el.getAttribute('data-locked') === '1') return;
      const r = el.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      originX = r.left; originY = r.top;
      moved = false;
      el.setPointerCapture(e.pointerId);
      el.setAttribute('data-dragging', '1');
      e.preventDefault();
    });

    el.addEventListener('pointermove', function (e) {
      if (!el.hasAttribute('data-dragging')) return;
      const dx = e.clientX - startX, dy = e.clientY - startY;
      if (Math.abs(dx) > 2 || Math.abs(dy) > 2) moved = true;
      const w = el.offsetWidth, h = el.offsetHeight;
      const x = Math.min(window.innerWidth - w - 8, Math.max(8, originX + dx));
      const y = Math.min(window.innerHeight - h - 8, Math.max(8, originY + dy));
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.right = 'auto';
    });

    function drop(e) {
      if (!el.hasAttribute('data-dragging')) return;
      el.removeAttribute('data-dragging');
      try { el.releasePointerCapture(e.pointerId); } catch (err) { /* already gone */ }
      if (!moved) return;
      const r = el.getBoundingClientRect();
      chrome.storage.local.get({ focus: {} }, function (stored) {
        const focus = Object.assign({}, NWT.DEFAULT_SETTINGS.focus, stored.focus, {
          hudX: r.left / window.innerWidth,
          hudY: r.top / window.innerHeight
        });
        chrome.storage.local.set({ focus: focus });
      });
    }
    el.addEventListener('pointerup', drop);
    el.addEventListener('pointercancel', drop);

    /* double-click puts it back where it started */
    el.addEventListener('dblclick', function () {
      chrome.storage.local.get({ focus: {} }, function (stored) {
        const focus = Object.assign({}, NWT.DEFAULT_SETTINGS.focus, stored.focus,
                                    { hudX: null, hudY: null });
        chrome.storage.local.set({ focus: focus });
      });
    });
  }

  /* The timer is for working through a project, so it only belongs on a
   * project page - not the dashboard, the library or a marketing page. */
  /* The HUD is a single pill for the whole page. With all_frames on, every
   * same-origin subframe used to draw its own. */
  function onProjectPage() {
    if (!TOP_FRAME) return false;
    /* A project being built is /projects/<id>. The pattern used to be an
     * unanchored /projects?/, which also matched the index and anything with
     * "project" further along the path, so the timer turned up on pages that
     * are for browsing rather than building. Requiring a segment after it is
     * what separates the two. */
    return /^\/projects?\/[^/]+/.test(location.pathname);
  }

  /* Clamped rather than trusted: this comes from storage, and a pill drawn at
   * fifty times its size would cover the page with no obvious way back. */
  function hudScale(focus) {
    const n = Number(focus.hudScale);
    if (!isFinite(n) || n <= 0) return 1;
    return Math.max(0.6, Math.min(3, n));
  }

  /* ---- the companion pane ----------------------------------------------
   *
   * A second thing on the page while you build: a video, a call you want to
   * keep half an eye on. It is a pane on the page rather than another window,
   * so it stays where it was put and goes away with the tab.
   *
   * Whether anything appears in it is not this extension's decision. A site
   * says whether it may be framed and most say no, so the pane says so and
   * offers to open it in a window instead. YouTube publishes a player made to
   * be framed, which is why a watch link is turned into one.
   */
  const PANE_ID = 'nwt-companion';

  function paneEl() {
    let el = document.getElementById(PANE_ID);
    if (el) return el;

    el = document.createElement('div');
    el.id = PANE_ID;

    /* The bar is the handle. Dragging from anywhere else would fight with
     * whatever is inside the frame. */
    const bar = document.createElement('div');
    bar.className = 'nwt-companion-bar';

    const title = document.createElement('span');
    title.className = 'nwt-companion-title';
    bar.appendChild(title);

    const openOut = document.createElement('button');
    openOut.type = 'button';
    openOut.className = 'nwt-companion-out';
    openOut.title = 'Open in a window of its own';
    openOut.textContent = '↗';
    bar.appendChild(openOut);

    const hide = document.createElement('button');
    hide.type = 'button';
    hide.className = 'nwt-companion-hide';
    hide.title = 'Hide the pane';
    hide.textContent = '×';
    bar.appendChild(hide);

    const body = document.createElement('div');
    body.className = 'nwt-companion-body';

    const frame = document.createElement('iframe');
    frame.className = 'nwt-companion-frame';
    /* `allow` is a permissions policy - what the page in here may use. It says
     * nothing about navigation. `sandbox` is what governs that, and leaving
     * `allow-top-navigation` out of the list is what stops a page in the pane
     * from replacing the tab underneath it.
     *
     * `allow-same-origin` is not a hole here: it lets the framed page keep its
     * own origin, which is what it needs to reach its own cookies and stay
     * signed in. Without it a site would be given an opaque origin and would
     * simply fail to load, which is not a security win, only a broken pane. */
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms ' +
      'allow-popups allow-popups-to-escape-sandbox allow-presentation ' +
      'allow-storage-access-by-user-activation');
    frame.setAttribute('allow', 'autoplay; picture-in-picture; encrypted-media; fullscreen');
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    body.appendChild(frame);

    /* Shown when nothing arrives, with the way forward in it rather than a
     * sentence pointing at a button somewhere else. */
    const refused = document.createElement('div');
    refused.className = 'nwt-companion-refused';
    const said = document.createElement('p');
    said.className = 'nwt-companion-said';
    refused.appendChild(said);

    const ask = document.createElement('button');
    ask.type = 'button';
    ask.className = 'nwt-companion-ask';
    ask.textContent = 'Allow this site here';
    refused.appendChild(ask);
    body.appendChild(refused);

    /* Corner to resize from. */
    const grip = document.createElement('div');
    grip.className = 'nwt-companion-grip';
    grip.title = 'Drag to resize';

    el.appendChild(bar);
    el.appendChild(body);
    el.appendChild(grip);
    (document.body || document.documentElement).appendChild(el);
    return el;
  }

  function removePane() {
    const el = document.getElementById(PANE_ID);
    if (el) el.remove();
    /* Cleared with the element. Leaving it set meant that switching the theme
     * off and on again rebuilt an empty pane: the address had not changed, so
     * the guard below decided there was nothing to load into a frame that had
     * just been created blank. */
    paneShowing = '';
  }

  let paneShowing = '';

  /* Whether a site is allowed to be framed here, as the browser sees it.
   * Cached per address so a repaint - which happens on every storage write -
   * is not a message round trip. */
  const paneAllowed = Object.create(null);

  /* Waiting to see whether a frame loads does not work: a browser that refuses
   * one navigates it to an error document and fires `load` on it just the
   * same, so there is nothing to time out on and nothing to catch. What can be
   * known ahead of time is whether this site has been allowed, so that is what
   * is asked, and the answer is what the pane reports. */
  function askAllowed(url, then) {
    if (url in paneAllowed) { then(paneAllowed[url]); return; }
    try {
      chrome.runtime.sendMessage({ type: 'companion:allowed', url: url }, function (r) {
        if (chrome.runtime.lastError) { then(false); return; }
        paneAllowed[url] = !!(r && r.allowed);
        then(paneAllowed[url]);
      });
    } catch (e) {
      then(false);
    }
  }

  function paintPane(companion) {
    const el = paneEl();
    const src = NWT.companionSrc(companion.url);
    const frame = el.querySelector('.nwt-companion-frame');
    const refused = el.querySelector('.nwt-companion-said');

    el.querySelector('.nwt-companion-title').textContent = label(companion);
    /* Always offered. A window of its own holds anything, and it is the answer
     * whenever the frame is not - so it should not be something that appears
     * only once the pane has already failed. */
    el.querySelector('.nwt-companion-out').style.display = src ? '' : 'none';

    if (!src) {
      frame.removeAttribute('src');
      el.setAttribute('data-state', 'empty');
      refused.textContent = companion.url
        ? 'That is not an address this can open. It has to start with https.'
        : 'Nothing chosen yet. Add a link in the extension popup.';
      paneShowing = '';
      return;
    }

    /* Only reloaded when it actually changes: setting src again restarts a
     * video that is already playing, and a repaint happens on every write. */
    if (paneShowing === src) return;
    paneShowing = src;
    el.setAttribute('data-state', 'loading');
    refused.textContent = 'Loading…';

    /* Sites that publish a player mean it to be framed, so they need no
     * permission and are not worth asking about. */
    if (NWT.framesFreely(src)) {
      frame.setAttribute('src', src);
      el.setAttribute('data-state', 'ready');
      return;
    }

    askAllowed(src, function (allowed) {
      /* Another address arrived while the answer was on its way. */
      if (paneShowing !== src) return;
      if (allowed) {
        frame.setAttribute('src', src);
        el.setAttribute('data-state', 'ready');
        return;
      }
      frame.removeAttribute('src');
      el.setAttribute('data-state', 'blocked');
      refused.textContent =
        'This site refuses to be shown inside another page. Your browser can ' +
        'allow it here, or the arrow above opens it in a window of its own.';
    });
  }

  function label(companion) {
    const match = (companion.tiles || []).filter(t => t && t.url === companion.url)[0];
    if (match && match.label) return match.label;
    try {
      return new URL(NWT.companionSrc(companion.url) || companion.url).hostname
        .replace(/^www\./, '');
    } catch (e) {
      return 'Companion';
    }
  }

  function placePane(el, companion) {
    const w = Math.max(240, Math.min(window.innerWidth - 16, Number(companion.w) || 380));
    const h = Math.max(160, Math.min(window.innerHeight - 16, Number(companion.h) || 260));
    el.style.width = w + 'px';
    el.style.height = h + 'px';

    if (companion.x == null || companion.y == null) {
      el.style.left = el.style.top = '';
      return;
    }
    const maxX = Math.max(0, window.innerWidth - w - 8);
    const maxY = Math.max(0, window.innerHeight - h - 8);
    el.style.left = Math.min(maxX, Math.max(8, companion.x * window.innerWidth)) + 'px';
    el.style.top = Math.min(maxY, Math.max(8, companion.y * window.innerHeight)) + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }

  function saveCompanion(patch) {
    chrome.storage.local.get({ companion: {} }, function (stored) {
      /* Nothing to merge into if the read failed, and overwriting the
       * whole record with defaults would lose the saved tiles. */
      if (chrome.runtime.lastError) return;
      chrome.storage.local.set({
        companion: Object.assign({}, NWT.DEFAULT_SETTINGS.companion, stored.companion, patch)
      });
    });
  }

  function wirePane(el) {
    if (el.dataset.wired === '1') return;
    el.dataset.wired = '1';

    el.querySelector('.nwt-companion-hide').addEventListener('click', function (e) {
      e.stopPropagation();
      saveCompanion({ enabled: false });
    });

    /* The browser will only put its permission prompt in front of someone who
     * clicked inside an extension page, and this is a content script - so this
     * cannot raise the prompt itself. It hands the site to the extension,
     * which opens the page that can, with this site already named on it. The
     * alternative was a sentence telling you to go and find a button
     * elsewhere, which is how it read the first time and is not an answer. */
    el.querySelector('.nwt-companion-ask').addEventListener('click', function (e) {
      e.stopPropagation();
      chrome.storage.local.get({ companion: {} }, function (stored) {
        const src = NWT.companionSrc((stored.companion || {}).url);
        if (!src) return;
        chrome.runtime.sendMessage({ type: 'companion:ask', url: src },
          function () { void chrome.runtime.lastError; });
      });
    });

    el.querySelector('.nwt-companion-out').addEventListener('click', function (e) {
      e.stopPropagation();
      chrome.storage.local.get({ companion: {} }, function (stored) {
        const c = stored.companion || {};
        const src = NWT.companionSrc(c.url);
        if (!src) return;
        /* Opened by the extension rather than by `window.open` here. A window
         * the browser makes for us is a real one - it holds anything at all,
         * including every site that refuses to be framed under any headers,
         * and it is not subject to this page's own policy on what it may
         * open. The size is the pane's, so it arrives the shape you left it. */
        chrome.runtime.sendMessage({
          type: 'companion:window', url: src,
          w: Number(c.w) || 380, h: Number(c.h) || 260
        }, function () { void chrome.runtime.lastError; });
      });
    });

    dragBy(el, el.querySelector('.nwt-companion-bar'), function (r) {
      saveCompanion({ x: r.left / window.innerWidth, y: r.top / window.innerHeight });
    });

    resizeBy(el, el.querySelector('.nwt-companion-grip'), function (w, h) {
      saveCompanion({ w: w, h: h });
    });
  }

  /* Moving and resizing, each driven from one small part of the pane rather
   * than the whole of it - the frame in the middle belongs to whatever is
   * inside it, and a drag started there would fight with it. */
  function dragBy(el, handle, done) {
    let startX = 0, startY = 0, originX = 0, originY = 0, dragging = false;

    handle.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      const r = el.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      originX = r.left; originY = r.top;
      dragging = true;
      handle.setPointerCapture(e.pointerId);
      el.setAttribute('data-dragging', '1');
      e.preventDefault();
    });

    handle.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const w = el.offsetWidth, h = el.offsetHeight;
      const x = Math.min(window.innerWidth - w - 8, Math.max(8, originX + e.clientX - startX));
      const y = Math.min(window.innerHeight - h - 8, Math.max(8, originY + e.clientY - startY));
      el.style.left = x + 'px';
      el.style.top = y + 'px';
      el.style.right = el.style.bottom = 'auto';
    });

    function drop(e) {
      if (!dragging) return;
      dragging = false;
      el.removeAttribute('data-dragging');
      try { handle.releasePointerCapture(e.pointerId); } catch (err) { /* gone */ }
      done(el.getBoundingClientRect());
    }
    handle.addEventListener('pointerup', drop);
    handle.addEventListener('pointercancel', drop);
  }

  function resizeBy(el, grip, done) {
    let startX = 0, startY = 0, startW = 0, startH = 0, sizing = false;

    grip.addEventListener('pointerdown', function (e) {
      if (e.button !== 0) return;
      startX = e.clientX; startY = e.clientY;
      startW = el.offsetWidth; startH = el.offsetHeight;
      sizing = true;
      grip.setPointerCapture(e.pointerId);
      el.setAttribute('data-sizing', '1');
      e.preventDefault();
      e.stopPropagation();
    });

    grip.addEventListener('pointermove', function (e) {
      if (!sizing) return;
      el.style.width = Math.max(240, startW + e.clientX - startX) + 'px';
      el.style.height = Math.max(160, startH + e.clientY - startY) + 'px';
    });

    function stop(e) {
      if (!sizing) return;
      sizing = false;
      el.removeAttribute('data-sizing');
      try { grip.releasePointerCapture(e.pointerId); } catch (err) { /* gone */ }
      done(el.offsetWidth, el.offsetHeight);
    }
    grip.addEventListener('pointerup', stop);
    grip.addEventListener('pointercancel', stop);
  }

  let paneGrantSeen = 0;

  function renderPane(settings) {
    const companion = Object.assign({}, NWT.DEFAULT_SETTINGS.companion, settings.companion);
    /* Anywhere on the site, not only on a project page. The timer is tied to a
     * project because a session is about building one; something to keep in
     * view while you work is not - you want it on the lesson you are reading
     * and the dashboard you came from, and having it vanish when you navigate
     * looks like the extension breaking rather than a rule being applied.
     * The top frame only, so it is not drawn once per embedded frame. */
    if (!settings.enabled || !companion.enabled || !TOP_FRAME) {
      removePane();
      return;
    }
    /* A site was allowed, or taken back, since the last paint. The cached
     * answers are stale and the frame has to be given another go - without
     * this, granting permission would leave the pane sitting on its refusal
     * until something else happened to change the address. */
    const granted = Number(companion.grantedAt) || 0;
    if (granted !== paneGrantSeen) {
      paneGrantSeen = granted;
      Object.keys(paneAllowed).forEach(function (k) { delete paneAllowed[k]; });
      paneShowing = '';
    }
    const el = paneEl();
    paintPane(companion);
    wirePane(el);
    placePane(el, companion);
  }

  function renderHud(settings) {
    const focus = Object.assign({}, NWT.DEFAULT_SETTINGS.focus, settings.focus);
    if (!settings.enabled || !focus.enabled || !onProjectPage()) { removeHud(); return; }
    paintHud(focus);
    const el = hudEl();
    el.style.setProperty('--nwt-hud-scale', String(hudScale(focus)));
    if (focus.locked) el.setAttribute('data-locked', '1');
    else el.removeAttribute('data-locked');
    el.title = focus.locked ? 'Focus timer (locked)' : 'Drag to move; double-click to reset';
    makeDraggable(el);
    placeHud(el, focus);
    if (hudTimer) clearInterval(hudTimer);
    /* only tick while running - a paused timer never changes */
    if (focus.running) hudTimer = setInterval(function () { paintHud(focus); }, 1000);
  }

  /* keep it on screen if the window is resized under it */
  window.addEventListener('resize', function () {
    const el = document.getElementById(HUD_ID);
    if (!el) return;
    chrome.storage.local.get({ focus: {} }, function (stored) {
      placeHud(el, Object.assign({}, NWT.DEFAULT_SETTINGS.focus, stored.focus));
    });
  });

  /* ---- stray light panels ----------------------------------------------
   * Some surfaces cannot be reached from a stylesheet: tooltips and side
   * panels that are portalled out of their owner, built after load, or given
   * their colour by a class the token layer has no name for. Five attempts at
   * guessing selectors for those did not hold.
   *
   * So this measures instead of guessing. After the DOM settles it looks for
   * panels that are still painting light on a dark theme and gives them the
   * theme surface. It only ever touches something big enough to be a panel,
   * and only when the colour it is painting is genuinely light. */
  let rescueQueued = false;

  /* getComputedStyle returns colours in whatever space the author wrote them,
   * and NextWork is a Tailwind v4 site, so its palette comes back as oklch().
   * The old rgb()-only pattern never matched one, isLight() answered false for
   * every panel, and this entire pass silently did nothing on exactly the
   * surfaces it exists to catch.
   *
   * A canvas fillStyle round-trip normalises any colour the browser can parse
   * down to #rrggbb or rgba(), whatever space it started in. */
  let probe = null;
  const PROBE_SENTINEL = '#010203';

  function normalise(value) {
    if (!value) return null;
    if (probe === null) {
      try { probe = document.createElement('canvas').getContext('2d'); }
      catch (e) { probe = false; }
    }
    if (!probe) return null;
    try {
      probe.fillStyle = PROBE_SENTINEL;
      probe.fillStyle = value;
      const out = probe.fillStyle;
      /* fillStyle keeps its previous value when handed something it cannot
       * parse, so an unchanged sentinel means "unknown", not "black". */
      return out === PROBE_SENTINEL ? null : out;
    } catch (e) { return null; }
  }

  /* oklab and oklch, which the canvas will not convert for us.
   *
   * fillStyle accepts them and hands the same string straight back rather
   * than resolving it to rgb, so the round-trip above looks like it worked
   * and the parse below then fails. The colour reads as unknown, and unknown
   * means the text is skipped - which is why the suggestion bubbles were
   * never even considered. Tailwind v4 emits these, so this is not an edge
   * case on a site built with it. */
  function fromOklab(value) {
    const m = /^ok(lab|lch)\(\s*([\d.%-]+)[\s,]+([\d.%-]+)[\s,]+([\d.%-]+)\s*(?:[,/]\s*([\d.%]+)\s*)?\)$/i
      .exec(String(value).trim());
    if (!m) return null;
    const num = function (t, scale) {
      if (t === undefined || t === null) return null;
      const n = parseFloat(t);
      if (!isFinite(n)) return null;
      return /%$/.test(t) ? n / 100 * scale : n;
    };
    const Lv = num(m[2], 1);
    if (Lv === null) return null;
    let A, B;
    if (m[1].toLowerCase() === 'lch') {
      const C = num(m[3], 0.4), H = num(m[4], 360);
      if (C === null || H === null) return null;
      A = C * Math.cos(H * Math.PI / 180);
      B = C * Math.sin(H * Math.PI / 180);
    } else {
      A = num(m[3], 0.4); B = num(m[4], 0.4);
      if (A === null || B === null) return null;
    }
    let alpha = m[5] === undefined ? 1 : num(m[5], 1);
    if (alpha === null) alpha = 1;

    /* Oklab to linear sRGB, then gamma encode. */
    const l_ = Lv + 0.3963377774 * A + 0.2158037573 * B;
    const m_ = Lv - 0.1055613458 * A - 0.0638541728 * B;
    const s_ = Lv - 0.0894841775 * A - 1.2914855480 * B;
    const l = l_ * l_ * l_, mm = m_ * m_ * m_, ss = s_ * s_ * s_;
    const lin = [
       4.0767416621 * l - 3.3077115913 * mm + 0.2309699292 * ss,
      -1.2684380046 * l + 2.6097574011 * mm - 0.3413193965 * ss,
      -0.0041960863 * l - 0.7034186147 * mm + 1.7076147010 * ss
    ];
    const out = lin.map(function (v) {
      const e = v <= 0.0031308 ? 12.92 * v : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
      return Math.max(0, Math.min(255, Math.round(e * 255)));
    });
    return { r: out[0], g: out[1], b: out[2], a: alpha };
  }

  function parseColour(value) {
    const ok = fromOklab(value);
    if (ok) return ok;
    const norm = normalise(value);
    if (!norm) return null;
    const ok2 = fromOklab(norm);
    if (ok2) return ok2;
    let m = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(norm);
    if (m) {
      return { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16), a: 1 };
    }
    m = /rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?/i.exec(norm);
    if (m) {
      return { r: +m[1], g: +m[2], b: +m[3], a: m[4] === undefined ? 1 : +m[4] };
    }
    return null;
  }

  function luminance(c) { return (0.2126 * c.r + 0.7152 * c.g + 0.0722 * c.b) / 255; }

  function isLight(colour) {
    const c = parseColour(colour);
    if (!c || c.a < 0.5) return false;                   /* see-through, not a panel */
    return luminance(c) > 0.72;
  }

  /* WCAG relative luminance, which is not the same thing as the weighted
   * average above: sRGB channels are gamma-encoded, so they have to be
   * linearised before they can be summed. The cheap version is fine for the
   * light/dark question isLight asks, and badly wrong for a ratio, where it
   * compresses the mid-tones and reads 1.5 where the real answer is 2.4. */
  function relLuminance(c) {
    const ch = function (v) {
      const x = v / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    };
    return 0.2126 * ch(c.r) + 0.7152 * ch(c.g) + 0.0722 * ch(c.b);
  }

  function ratio(a, b) {
    const x = relLuminance(a), y = relLuminance(b);
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
  }

  function isDarkText(colour) {
    const c = parseColour(colour);
    return !!c && luminance(c) < 0.35;
  }

  /* Put the background back on any page ground that turns out to be a stacked
   * panel rather than the actual page ground.
   *
   * The stylesheet makes `.bg-paper` transparent so the scenery behind the
   * page can show through it. That is right for the one element that really is
   * the page ground, and wrong for every copy of it that is a panel stacked
   * over something else: a split view puts the documentation pane over the
   * project page, and a transparent pane lets the page underneath show through
   * it. Which is what it looked like - the sidebar and a screenshot from the
   * page behind, apparently floating in the middle of the documentation.
   *
   * The stylesheet decides by class name, which is all CSS can do, and the
   * pane carried none of the ones it looks for. Here we can measure instead: a
   * panel is anything with a positioned ancestor between it and the body. */
  const GROUND_SELECTOR = '.bg-paper, .bg-brand-primary';

  /* Is this a panel, or is it the page ground?
   *
   * The stylesheet strips the background off anything matching GROUND_SELECTOR
   * so the wallpaper can show through the page. Exactly one thing on the page
   * wants that. Everything else wearing the same class is a card or a pane,
   * and stripping its background lets the wallpaper show through the middle of
   * a component - a step list with a mountain behind the text.
   *
   * Three ways to be a panel, and any one of them is enough:
   *
   *   1. Something positioned sits between it and the body. That is a pane laid
   *      over the page, like the documentation in a split view.
   *   2. It is inside another element wearing the same class. The ground does
   *      not contain the ground.
   *   3. It is narrower than the page. The ground spans the window; a card is
   *      inset, and that is the shape the first two tests missed.
   */
  function isPanel(el) {
    let node = el.parentElement;
    let hops = 0;
    while (node && node !== document.body && hops < 40) {
      let pos;
      try { pos = getComputedStyle(node).position; } catch (e) { break; }
      if (pos === 'fixed' || pos === 'absolute' || pos === 'sticky') return true;
      try { if (node.matches && node.matches(GROUND_SELECTOR)) return true; }
      catch (e) { /* older engines */ }
      node = node.parentElement;
      hops++;
    }
    try {
      const page = document.documentElement.clientWidth;
      const w = el.getBoundingClientRect().width;
      /* Inset by more than a scrollbar's worth on each side. */
      if (page > 0 && w > 0 && w < page * 0.92) return true;
    } catch (e) { /* fall through */ }
    return false;
  }

  function restorePanelBackgrounds(palette) {
    let nodes;
    try { nodes = document.querySelectorAll(GROUND_SELECTOR); }
    catch (e) { return; }
    const work = [];
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (el.dataset.nwtGround === '1') continue;
      if (!isPanel(el)) continue;
      work.push(el);
    }
    work.forEach(function (el) {
      el.dataset.nwtGround = '1';
      /* Translucent with a blur behind it, not an opaque slab. The wallpaper
       * reads through as a soft wash, so the panel belongs to the page instead
       * of sitting on top of it. */
      el.style.setProperty('background-color', palette.panelFill, 'important');
      el.style.setProperty('backdrop-filter', 'blur(14px)', 'important');
      el.style.setProperty('-webkit-backdrop-filter', 'blur(14px)', 'important');
      /* The edge as a ring rather than a border, because a border would add to
       * the element's box and shift the layout of a page we do not own. On a
       * light theme this ring is the only thing separating the panel from the
       * wallpaper: the fill alone measures about 1.06 against the sky. */
      el.style.setProperty('box-shadow',
        '0 0 0 1px ' + palette.panelEdge + ', 0 12px 32px ' + palette.panelShadow,
        'important');
    });
  }

  /* The background an element is actually read against: its own if it paints
   * one, otherwise the nearest ancestor that does. */
  function effectiveBackground(el) {
    let node = el;
    let hops = 0;
    while (node && hops < 40) {
      let bg;
      try { bg = getComputedStyle(node).backgroundColor; } catch (e) { return null; }
      const c = parseColour(bg);
      if (c && c.a >= 0.5) return bg;
      node = node.parentElement;
      hops++;
    }
    return null;
  }

  /* White text on a light theme.
   *
   * NextWork's home page is dark by design, so its hero and its suggestion
   * chips are written as white text. The stylesheet deliberately leaves
   * --color-white alone, because `text-white` is also used on dark cards where
   * remapping it would erase it. That is the right call on a dark theme and
   * exactly wrong on a light one: the page ground turns pale, the text stays
   * white, and the welcome heading disappears into it.
   *
   * CSS cannot tell the two cases apart, so this measures. White text keeps
   * being white wherever it sits on something dark; only the copies that ended
   * up on a light background are repointed. */
  /* Where the site writes its own text colour rather than taking ours. All of
   * these are pale on a light theme, because they were chosen for a dark page:
   * text-brand-25 lands at 1.00:1 against the canvas, which is the same colour
   * as the background. Bounded by selector so this stays cheap; the decision
   * is made by measurement below. */
  const INK_SELECTOR = [
    '[class*="text-white"]', '[class*="text-paper"]', '[class*="text-warm-white"]',
    '[class*="text-leather"]', '[class*="text-brand-"]', '[class*="text-gray-"]',
    '[class*="text-sand-"]', 'h1', 'h2', 'h3'
  ].join(', ');

  /* Text a control dims because it is switched off. This was previously
   * approximated by keeping the trigger below the ratio such text tends to
   * land at, which also let genuinely unreadable content through: the
   * suggestion chips measure about the same as a disabled label, and one of
   * them is content and the other is not. The DOM says which is which. */
  function looksDisabled(el) {
    let node = el, hops = 0;
    while (node && hops++ < 12) {
      if (node.getAttribute) {
        if (node.getAttribute('disabled') !== null) return true;
        if (node.getAttribute('aria-disabled') === 'true') return true;
      }
      node = node.parentElement;
    }
    return false;
  }

  /* Text sitting over a picture.
   *
   * effectiveBackground can only read a background *colour*, and a project
   * card is a dark painting inside a pale card. Measuring the title against
   * the card says white-on-white, so a white title that was perfectly
   * readable gets turned black and lands on the dark half of the artwork.
   * That is a readable title made unreadable, which is worse than the thing
   * this pass exists to fix.
   *
   * There is no measuring our way out of it: the colour we can read is not
   * the colour the reader sees. So the rule is to leave it alone. Bailing
   * costs a bit of pale text somewhere; guessing costs a title.
   *
   * Our own wallpaper does not count. It lives on the root, and the palette is
   * already solved against it. */
  /* A picture, as opposed to any background-image at all.
   *
   * The first cut of this treated the two as the same thing and bailed on
   * anything painted, which turned out to cover the suggestion bubbles: they
   * carry a faint linear-gradient for their glassy edge, so the correction
   * decided they were artwork and left them the colour of the page.
   *
   * A gradient is decoration on a surface we can still measure. A url() is a
   * photograph whose colours we cannot know. The project cards are the second
   * kind - the title sits over a .webp, with a gradient scrim between - so
   * this keeps them protected while letting the bubbles through. */
  function isPicture(backgroundImage) {
    if (!backgroundImage || backgroundImage === 'none') return false;
    return /(^|[\s,(])(url|image-set|-webkit-image-set|element|paint|cross-fade)\(/i
      .test(backgroundImage);
  }

  function overArtwork(el) {
    /* Asking what is stacked under this point answers it directly, and only
     * counts a picture that really is under these words rather than one
     * elsewhere on the page. Ancestors contain the point too, so a card
     * painting its art as a background shows up here the same as one using an
     * <img>, and so does art that is positioned behind the text without being
     * an ancestor at all. */
    const scope = (el.getRootNode && typeof el.getRootNode().elementsFromPoint === 'function')
      ? el.getRootNode() : document;
    if (typeof scope.elementsFromPoint === 'function') {
      let rect;
      try { rect = el.getBoundingClientRect(); } catch (e) { return true; }
      if (!rect || !rect.width || !rect.height) return true;    /* not laid out yet */
      let stack;
      try { stack = scope.elementsFromPoint(rect.left + rect.width / 2,
                                            rect.top + rect.height / 2); }
      catch (e) { return true; }
      if (!stack || !stack.length) return true;                 /* off screen */
      for (let i = 0; i < stack.length; i++) {
        const node = stack[i];
        if (node === el || (el.contains && el.contains(node))) continue;
        const tag = node.tagName;
        if (tag === 'IMG' || tag === 'PICTURE' || tag === 'VIDEO' || tag === 'CANVAS') return true;
        /* Our own wallpaper lives on the root and the palette is already
         * solved against it, so stop before we reach it. */
        if (node === document.body || node === document.documentElement) break;
        let cs;
        try { cs = getComputedStyle(node); } catch (e) { continue; }
        if (isPicture(cs.backgroundImage)) return true;
      }
      return false;
    }

    /* No way to ask, so fall back to walking up. Less precise: a decorative
     * gradient on some far ancestor will stop us correcting text it is
     * nowhere near. That is the safe direction to be wrong in. */
    let node = el, hops = 0;
    while (node && hops++ < 12) {
      if (node === document.body || node === document.documentElement) break;
      let cs;
      try { cs = getComputedStyle(node); } catch (e) { return true; }
      if (isPicture(cs.backgroundImage)) return true;
      node = node.parentElement;
    }
    return false;
  }
  function rescueInvisibleText(palette) {
    const work = [];
    eachRoot(function (root) {
    let nodes;
    try { nodes = root.querySelectorAll(INK_SELECTOR); }
    catch (e) { return; }
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (looksDisabled(el)) continue;
      if (el.dataset.nwtInk === '1') continue;
      if (overArtwork(el)) continue;
      let cs;
      try { cs = getComputedStyle(el); } catch (e) { continue; }
      const ink = parseColour(cs.color);
      if (!ink || ink.a < 0.5) continue;
      const behind = parseColour(effectiveBackground(el) || palette.pageBg);
      if (!behind) continue;
      /* Readability, not lightness. A pale blue-grey heading on cream is not
       * "light text" by any threshold, and it is still unreadable.
       *
       * The floor is deliberately below the WCAG one. This pass is for text
       * that has effectively vanished, not for holding the site to a contrast
       * standard: the pale ramp stops land at 1.00 to 1.60 against a light
       * canvas, while text that is meant to read as de-emphasised sits nearer
       * 2.5. Repointing that too would make every disabled control look
       * enabled, which trades one visual bug for another. Disabled is asked
       * of the DOM rather than guessed from the ratio, so the floor here can
       * be the real readability one. */
      if (ratio(ink, behind) >= 4.5) continue;
      /* Pick whichever of the two candidates the background can actually
       * carry, so this is right on a dark card as well as a light page. */
      const dark = parseColour(palette.ink);
      const light = parseColour(palette.inkAlt);
      const pick = (dark && light)
        ? (ratio(dark, behind) >= ratio(light, behind) ? palette.ink : palette.inkAlt)
        : palette.ink;
      work.push({ el: el, colour: pick });
    }
    });
    work.forEach(function (w) {
      w.el.dataset.nwtInk = '1';
      w.el.style.setProperty('color', w.colour, 'important');
    });
  }

  function rescueLightPanels(palette) {
    /* span and li are gone from this list: nothing 220x90 is a span, and they
     * were most of the nodes being measured. */
    const nodes = document.querySelectorAll('div,section,aside,dialog,article,nav,form');
    /* Read everything first, then write. Interleaving getBoundingClientRect
     * with a style write forces a synchronous layout per element, which on a
     * page this size meant thousands of them in one pass. */
    const work = [];
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (el.dataset.nwtLit === '1' || el.id === HUD_ID) continue;
      const r = el.getBoundingClientRect();
      /* big enough to be a panel, not a chip or a badge */
      if (r.width < 220 || r.height < 90) continue;
      const cs = getComputedStyle(el);
      if (!isLight(cs.backgroundColor)) continue;
      work.push({ el: el, darkText: isDarkText(cs.color), lightEdge: isLight(cs.borderTopColor) });
    }
    work.forEach(function (w) {
      w.el.dataset.nwtLit = '1';
      w.el.style.setProperty('background-color', palette.surface, 'important');
      /* only repaint text that would now be dark-on-dark */
      if (w.darkText) w.el.style.setProperty('color', palette.text, 'important');
      if (w.lightEdge) w.el.style.setProperty('border-color', palette.border, 'important');
    });
  }

  /* Give every rescued element its colour back.
   *
   * The pass writes inline `!important` styles and stamps the element so it is
   * skipped next time. Without an undo, two things went wrong and both were
   * visible: turning the theme off left panels wearing the theme surface, and
   * switching theme left them wearing the *previous* theme, because the stamp
   * made them skip. */
  const RESCUED = ['background-color', 'color', 'border-color',
                   'backdrop-filter', '-webkit-backdrop-filter', 'box-shadow'];

  function unrescue() {
    eachRoot(function (root) {
    let nodes;
    try { nodes = root.querySelectorAll('[data-nwt-lit], [data-nwt-ground], [data-nwt-ink]'); }
    catch (e) { return; }
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      RESCUED.forEach(function (prop) { el.style.removeProperty(prop); });
      delete el.dataset.nwtLit;
      delete el.dataset.nwtGround;
      delete el.dataset.nwtInk;
      if (el.removeAttribute) {
        el.removeAttribute('data-nwt-lit');
        el.removeAttribute('data-nwt-ground');
        el.removeAttribute('data-nwt-ink');
      }
    }
    });
  }

  let groundPalette = null;
  let groundQueued = false;

  function scheduleGrounds(palette) {
    if (groundQueued) return;
    groundQueued = true;
    setTimeout(function () {
      groundQueued = false;
      try { restorePanelBackgrounds(palette); } catch (e) { /* never break the page */ }
    }, 200);
  }

  function scheduleRescue(palette) {
    if (rescueQueued) return;
    rescueQueued = true;
    setTimeout(function () {
      rescueQueued = false;
      try {
        if (palette.panels) rescueLightPanels(palette);
      } catch (e) { /* never break the page */ }
      try {
        if (palette.ink) rescueInvisibleText(palette);
      } catch (e) { /* never break the page */ }
    }, 220);
  }

  /* ---- real settings --------------------------------------------------- */
  let lastPalette = null;

  function render(settings) {
    const s = Object.assign({}, NWT.DEFAULT_SETTINGS, settings || {});
    if (!s.enabled) {
      remove();
      removeHud();
      removePane();
      unrescue();                   /* inline styles outlive the stylesheet */
      groundPalette = null;
      shadowSheetFor('');           /* neutralise the adopted copies in place */
      writeCache(false, '');
      return;
    }
    apply(NWT.buildCSS(s));
    /* A full pass here, because this is the first sight of the page. After
     * this the observer only has to cover what changes. */
    paintShadowRoots(shadowSheetFor(NWT.buildCSS(s, null, { shadow: true })));
    writeCache(true, s.themeId);
    renderHud(s);
    renderPane(s);

    const theme = NWT.getTheme(s);
    /* One palette, one scheduler, one undo, whichever pass is wanted.
     *
     * A dark theme needs light panels repainted; a light theme needs white
     * text repointed. Those are the same problem seen from either side. Giving
     * the light one its own schedule meant it never re-ran on a mutation,
     * because the observer only fires the pass when a palette is set. */
    const wanted = (s.options && s.options.rescuePanels !== false)
      ? (function () {
          const p = NWT.buildPalette(theme);
          const base = { surface: p.surfaceAlt, text: p.textPrimary, border: p.border,
                         panelFill: p.panelFill, panelEdge: p.panelEdge,
                         panelShadow: p.panelShadow };
          /* Both candidates travel, so the pass can choose per element. */
          base.ink = p.textPrimary;
          base.inkAlt = p.canvas;
          base.pageBg = p.canvas;
          if (theme.mode !== 'light') base.panels = true;
          return base;
        })()
      : null;

    /* If the colours changed, everything already painted is wearing the old
     * ones and has to be released before it can be painted again. */
    const changed = JSON.stringify(wanted) !== JSON.stringify(lastPalette);
    if (changed) unrescue();
    lastPalette = wanted;
    if (wanted) scheduleRescue(wanted);

    /* Separate from the rescue pass, and not gated on the theme being dark.
     * The transparency this corrects is applied to every theme, and the split
     * view that exposed it was on a light one. */
    groundPalette = (function () {
      const gp = NWT.buildPalette(theme);
      return { panelFill: gp.panelFill, panelEdge: gp.panelEdge, panelShadow: gp.panelShadow };
    })();
    scheduleGrounds(groundPalette);
  }

  /* Every change starts its own read, so more than one can be in flight at
   * once, and chrome.storage gives no ordering guarantee. Without a token the
   * older snapshot can land last and the page renders settings the user has
   * already moved past. */
  let readSeq = 0;

  function readAndRender() {
    const mine = ++readSeq;
    chrome.storage.local.get(null, function (settings) {
      if (chrome.runtime.lastError) return;
      if (mine !== readSeq) return;      /* a newer read is already in flight */
      render(settings);
    });
  }

  readAndRender();

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    readAndRender();
  });

  /* If the page ever nukes our node (head swaps during hydration), put it
   * back with whatever we last applied. */
  const observer = new MutationObserver(function (records) {
    if (!lastCSS) return;
    if (!document.getElementById(STYLE_ID)) apply(lastCSS);

    /* Only the subtrees that were actually added. A page that mounts a single
     * component should cost one small walk, not a walk of the document. */
    const added = [];
    for (let i = 0; i < records.length; i++) {
      const nodes = records[i].addedNodes;
      if (!nodes) continue;
      for (let k = 0; k < nodes.length; k++) {
        if (nodes[k].nodeType === 1) added.push(nodes[k]);
      }
    }
    if (added.length) schedulePaint(added);

    /* panels are built on demand, so re-check whenever the DOM changes */
    if (lastPalette) scheduleRescue(lastPalette);
    if (groundPalette) scheduleGrounds(groundPalette);
  });
  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', function () {
      if (document.head) observer.observe(document.head, { childList: true });
      if (shadowSheet) paintShadowRoots(shadowSheet);
    });
  }
})();
