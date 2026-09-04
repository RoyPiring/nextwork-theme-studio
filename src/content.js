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
  let chimed = false;
  /* Set between playing and the write landing. Without it the reset below
   * fires in that gap - storage still says nothing has been announced, so the
   * guard clears itself and the next paint, a second later, plays again. */
  let chimeWriting = false;

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

    /* A flag, not a session id.
     *
     * It used to compare against `startedAt`, on the reasoning that a new
     * session has a new start time. It does - but so does a resumed one:
     * pausing banks the elapsed time and starting again sets `startedAt` to
     * now, because that is how the clock adds up. So a session that had
     * already run over, paused and restarted, looked like a session that had
     * never been announced, and rang a second time for the same end.
     *
     * Nothing in the timer's own state distinguishes those two, so the flag is
     * cleared by whatever begins a new session - reset, or a change of length -
     * and by nothing else. */
    if (!focus.chimedFor && !chimeWriting) chimed = false;
    if (!over || !focus.chime || chimed || focus.chimedFor) return;

    /* Marked only once something was actually heard. A browser that has not
     * been interacted with yet refuses to make a sound, and says so by handing
     * back a context that runs silently rather than by failing - so marking
     * first meant a session announced to nobody, and never announced again. */
    if (!chime()) return;

    chimed = true;
    chimeWriting = true;
    chrome.storage.local.get({ focus: {} }, function (stored) {
      /* Cleared when the write lands, not when this read returns. Clearing it
       * here left the gap it exists to cover: the marker is not in storage
       * until the set completes, so a paint in between saw nothing announced
       * and played a second time.
       *
       * Cleared however it ends, including on failure - left set, this tab
       * would never chime again for any later session. */
      if (chrome.runtime.lastError) { chimeWriting = false; return; }
      const f = stored.focus || {};
      if (f.chimedFor) { chimeWriting = false; return; }
      chrome.storage.local.set({ focus: Object.assign({}, f, { chimedFor: 1 }) },
        function () { chimeWriting = false; });
    });
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
  /* Answers whether anything was actually heard, which is not the same as
   * whether this ran without throwing.
   *
   * A browser will not let a page make a sound until someone has interacted
   * with it. That refusal is not an error: `new AudioContext()` succeeds and
   * hands back a *suspended* context, every call on it works, and nothing
   * comes out. Treated as success, the session was marked as announced and
   * would never be announced again - so a timer that ran over on a tab you
   * had opened and not yet clicked was silent for good, rather than silent
   * until you touched the page. */
  function chime() {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return false;
      const ctx = new Ctx();

      if (ctx.state === 'suspended') {
        /* Worth asking. It is granted only if the page has been interacted
         * with, in which case a context usually starts running anyway. */
        try { ctx.resume(); } catch (e) { /* nothing else to try */ }
      }
      if (ctx.state !== 'running') {
        try { ctx.close(); } catch (e) { /* already gone */ }
        return false;
      }

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
      return true;
    } catch (e) {
      /* No sound. The pill is still flashing. */
      return false;
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

  /* The first keeps the plain id, so anything that looked it up still finds
   * the one that is there when there is only one. */
  function paneId(index) { return index ? PANE_ID + '-' + index : PANE_ID; }

  function paneEl(index) {
    let el = document.getElementById(paneId(index));
    /* The same check the split makes, for the same reason: a content blocker
     * replaces the frame rather than removing the pane around it. */
    if (el && !el.querySelector('.nwt-companion-frame')) { el.remove(); el = null; }
    if (el) return el;

    el = document.createElement('div');
    el.id = paneId(index);
    el.className = 'nwt-companion';
    el.setAttribute('data-index', String(index));

    /* The bar is the handle. Dragging from anywhere else would fight with
     * whatever is inside the frame. */
    const bar = document.createElement('div');
    bar.className = 'nwt-companion-bar';

    const title = document.createElement('span');
    title.className = 'nwt-companion-title';
    bar.appendChild(title);

    /* Fold it down to its bar and open it again. The same control the split's
     * panels have, for the same reason: getting something out of the way for a
     * minute should not mean closing it and setting it up again. */
    const fold = document.createElement('button');
    fold.type = 'button';
    fold.className = 'nwt-companion-fold';
    bar.appendChild(fold);

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
    /* `sandbox` governs what the page in here may do; `allow` governs what
     * hardware and features it may reach. They are different lists and both
     * were too short.
     *
     * A full application needs more than a video does. A missing token here is
     * not a polite refusal - the call throws inside their code and the boot
     * stops wherever it got to, which from outside is a rectangle that stays
     * whatever colour their loading screen is. Everything a real tab grants is
     * granted, with one exception: `allow-top-navigation` stays out, so a page
     * in the pane cannot replace the tab underneath it. That is the whole
     * point of having a sandbox at all, and it is the only thing being held
     * back. */
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms ' +
      'allow-popups allow-popups-to-escape-sandbox allow-presentation ' +
      'allow-modals allow-downloads allow-pointer-lock allow-orientation-lock ' +
      'allow-storage-access-by-user-activation');
    /* The microphone is not a nicety here. Watching a voice channel while you
     * build was the thing this was asked for, and a frame with no microphone
     * cannot join one - the call fails inside their code and the channel
     * simply never connects. Camera and screen share for the same reason. */
    frame.setAttribute('allow',
      'autoplay; microphone; camera; display-capture; speaker-selection; ' +
      'picture-in-picture; encrypted-media; fullscreen');
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    body.appendChild(frame);

    /* Where you say which video. A doorway address - YouTube itself rather
     * than a video on it - has nothing worth loading, so the panel asks
     * instead of showing a wall of recommendations or an empty box. */
    const linkForm = document.createElement('form');
    linkForm.className = 'nwt-companion-ask-link';
    const linkInput = document.createElement('input');
    linkInput.type = 'url';
    linkInput.className = 'nwt-companion-ask-input';
    linkInput.placeholder = 'Paste a video link';
    linkForm.appendChild(linkInput);
    const linkGo = document.createElement('button');
    linkGo.type = 'submit';
    linkGo.textContent = 'Play';
    linkForm.appendChild(linkGo);
    body.appendChild(linkForm);

    /* Shown when nothing arrives, with the way forward in it rather than a
     * sentence pointing at a button somewhere else. */
    const refused = document.createElement('div');
    refused.className = 'nwt-companion-refused';
    const said = document.createElement('p');
    said.className = 'nwt-companion-said';
    refused.appendChild(said);

    /* Only for a link that has been set to open in a window. Whatever put it
     * there, the way back has to be where you are looking when you notice. */
    const here = document.createElement('button');
    here.type = 'button';
    here.className = 'nwt-companion-here';
    here.textContent = 'Try it in the pane';
    refused.appendChild(here);

    const undock = document.createElement('button');
    undock.type = 'button';
    undock.className = 'nwt-companion-undock';
    undock.textContent = 'Bring the page back to full width';
    refused.appendChild(undock);

    const ask = document.createElement('button');
    ask.type = 'button';
    ask.className = 'nwt-companion-ask';
    ask.textContent = 'Allow this site here';
    refused.appendChild(ask);
    body.appendChild(refused);

    /* Corner to resize from. */
    /* A frame that loaded is not the same as a frame that shows anything.
     * Some sites answer with a page and then refuse to run inside another one,
     * and there is nothing readable across the origin boundary to tell the
     * difference - so rather than declare success and leave a white rectangle
     * with no way out, the way out stays on screen. */
    const hint = document.createElement('button');
    hint.type = 'button';
    hint.className = 'nwt-companion-hint';
    hint.textContent = 'Nothing showing? Open it in a window';
    body.appendChild(hint);

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
    [...document.querySelectorAll('.nwt-companion')].forEach(function (n) { n.remove(); });
    const el = document.getElementById(PANE_ID);
    if (el) el.remove();
    /* Cleared with the elements. Leaving it set meant that switching the theme
     * off and on again rebuilt an empty pane: the address had not changed, so
     * the guard below decided there was nothing to load into a frame that had
     * just been created blank. */
    paneShowing = {};
  }

  /* What each pane is showing, by its place in the list. One string served
   * when there was one pane; with several, a second pane would have told the
   * first that its address had changed. */
  let paneShowing = {};

  /* A frame can also be stopped by the page it is drawn on, rather than by the
   * site it points at: nextwork.ai sends its own content security policy, and
   * a frame this script adds is subject to it like any other. That failure
   * looks identical from the outside - a blank rectangle - but unlike a site's
   * own refusal it announces itself, so it is worth listening for.
   *
   * Removing the host page's policy is not on the table. It protects the page
   * being themed, and weakening the site you are working on to fit a video
   * beside it is the wrong trade. So this reports it and offers the window. */
  document.addEventListener('securitypolicyviolation', function (e) {
    if (!/frame-src|child-src|default-src/.test(e.violatedDirective || '')) return;
    /* Which pane it was. The report names the address that was blocked, and
     * each pane knows what it asked for - so the one that asked is the one
     * that is told, rather than all of them or the first. */
    const blocked = String(e.blockedURI || '');
    const hit = Object.keys(paneShowing).filter(function (i) {
      const src = paneShowing[i];
      return src && blocked.indexOf(src.slice(0, 40)) === 0;
    })[0];
    if (hit === undefined) return;
    const el = document.getElementById(paneId(Number(hit)));
    if (!el) return;
    el.setAttribute('data-state', 'page-blocked');
    el.querySelector('.nwt-companion-said').textContent =
      'The page this pane sits on will not allow another site inside it. ' +
      'That is nextwork.ai’s own setting, and not one worth overriding. ' +
      'The arrow above opens the link in a window of its own.';
  });

  /* Whether a site is allowed to be framed here, as the browser sees it.
   * Cached per address so a repaint - which happens on every storage write -
   * is not a message round trip. */
  const paneAllowed = Object.create(null);
  let paneRefusalWatch = null;

  /* Waiting to see whether a frame loads does not work: a browser that refuses
   * one navigates it to an error document and fires `load` on it just the
   * same, so there is nothing to time out on and nothing to catch. What can be
   * known ahead of time is whether this site has been allowed, so that is what
   * is asked, and the answer is what the pane reports. */
  function askAllowed(url, then) {
    if (url in paneAllowed) { then(paneAllowed[url]); return; }
    try {
      chrome.runtime.sendMessage({ type: 'companion:allowed', url: url }, function (r) {
        if (chrome.runtime.lastError) { then({ allowed: false }); return; }
        paneAllowed[url] = { allowed: !!(r && r.allowed), active: !!(r && r.active) };
        then(paneAllowed[url]);
      });
    } catch (e) {
      then({ allowed: false });
    }
  }


  /* Whether the browser actually took the frame, asked of the layout.
   *
   * Earlier versions of this said there was no way to tell a refused frame
   * from a working one - that a blocked frame fires `load` like any other and
   * leaves nothing to catch. The first half is true and the second is not.
   * A frame the browser refuses is given no layout box at all: it collapses to
   * nothing and has no offsetParent, while a frame that loaded fills its
   * container. Two frames in the same container at the same moment, one
   * allowed and one refused, differ exactly there.
   *
   * So it is measured rather than assumed, a moment after the address is set.
   * Anything else - a permission that was granted with no rule behind it, a
   * rule that failed to install, a site that changed its mind - ends in the
   * same place and is reported the same way, instead of as a black rectangle
   * that has to be guessed at. */
  function watchForRefusal(el, frame, src, index) {
    if (paneRefusalWatch) clearTimeout(paneRefusalWatch);
    paneRefusalWatch = setTimeout(function () {
      if (paneShowing[index] !== src) return;
      if (!frame.isConnected) return;
      const box = frame.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) return;

      el.setAttribute('data-state', 'blocked');
      el.querySelector('.nwt-companion-said').textContent =
        label({ url: src, tiles: [] }) + ' would not open here: the browser ' +
        'refused the frame, which it does by giving it no room at all. That is ' +
        'the site’s own header saying no. If you have allowed it, turn the ' +
        'extension off and on again so the rule that lifts it is rebuilt. The ' +
        'arrow above opens it in a window meanwhile, which always works.';
    }, 2500);
  }

  function paintPane(el, companion, index) {
    /* Folded: the bar and nothing else, and nothing loaded behind it - a video
     * left running where it cannot be seen is a fan you cannot explain. */
    el.setAttribute('data-collapsed', companion.collapsed ? '1' : '0');
    el.querySelector('.nwt-companion-fold').textContent = companion.collapsed ? '▸' : '▾';
    el.querySelector('.nwt-companion-fold').title =
      companion.collapsed ? 'Open it again' : 'Fold it down to its bar';
    if (companion.collapsed) {
      const folded = el.querySelector('.nwt-companion-frame');
      folded.removeAttribute('src');
      el.setAttribute('data-state', 'folded');
      delete paneShowing[index];
      return;
    }

    /* A doorway rather than a destination: ask which video, here, rather than
     * loading a front page that cannot be embedded and calling that a
     * refusal. */
    if (NWT.needsLink(companion.url)) {
      el.querySelector('.nwt-companion-frame').removeAttribute('src');
      el.setAttribute('data-state', 'ask');
      delete paneShowing[index];
      return;
    }
    const src = NWT.companionSrc(companion.url);
    const frame = el.querySelector('.nwt-companion-frame');
    const refused = el.querySelector('.nwt-companion-said');

    el.querySelector('.nwt-companion-title').textContent = label(companion);
    /* Always offered. A window of its own holds anything, and it is the answer
     * whenever the frame is not - so it should not be something that appears
     * only once the pane has already failed. */
    el.querySelector('.nwt-companion-out').style.display = src ? '' : 'none';

    /* Side by side: the link is in its own window beside the page, so there
     * is nothing for the frame to hold. The pane stays as the way back. */
    if (src && companion.docked) {
      frame.removeAttribute('src');
      el.setAttribute('data-state', 'docked');
      refused.textContent =
        label(companion) + ' is beside the page, in a window of its own. ' +
        'That is the one place a site which refuses to be embedded still ' +
        'works properly.';
      delete paneShowing[index];
      return;
    }

    /* Marked as belonging in a window, either by choosing it that way or by
     * giving up on the frame once. Drawing the rectangle again would repeat a
     * failure that has already been seen. */
    if (src && windowedNow(companion)) {
      frame.removeAttribute('src');
      el.setAttribute('data-state', 'windowed');
      refused.textContent =
        label(companion) + ' is set to open in a window of its own. The arrow ' +
        'above opens it; the button below tries it here instead.';
      delete paneShowing[index];
      return;
    }

    if (!src) {
      frame.removeAttribute('src');
      el.setAttribute('data-state', 'empty');
      refused.textContent = companion.url
        ? 'That is not an address this can open. It has to start with https.'
        : 'Nothing chosen yet. Add a link in the extension popup.';
      delete paneShowing[index];
      return;
    }

    /* Only reloaded when it actually changes: setting src again restarts a
     * video that is already playing, and a repaint happens on every write.
     *
     * Asked of the frame, not of a variable beside it. This is the whole
     * reason the pane could sit there empty for good.
     *
     * The site is a single-page app that rebuilds its body, and anything added
     * to it goes with the rebuild - the pane included. The next paint calls
     * paneEl(), finds nothing, and builds a fresh one whose iframe has no src
     * at all. A module variable still held the old address, so this guard said
     * "that is already showing" and returned, and nothing ever put an address
     * into the new frame. The pane looked right, reported itself ready, and
     * was a blank rectangle - which is exactly what a site refusing to be
     * framed looks like, so it was read as one for days.
     *
     * The frame's own src cannot lie about it: a new element has none. */
    if (frame.getAttribute('src') === src) { paneShowing[index] = src; return; }
    paneShowing[index] = src;
    el.setAttribute('data-state', 'loading');
    refused.textContent = 'Loading…';

    /* Sites that publish a player mean it to be framed, so they need no
     * permission and are not worth asking about. */
    if (NWT.framesFreely(src)) {
      frame.setAttribute('src', src);
      el.setAttribute('data-state', 'ready');
      watchForRefusal(el, frame, src, index);
      return;
    }

    askAllowed(src, function (answer) {
      /* Another address arrived while the answer was on its way. */
      if (paneShowing[index] !== src) return;

      /* Granted and carried are two different facts, and only one of them was
       * ever reported. A site could be allowed, say so, and still be refused,
       * because the rule that removes the framing header was missing - which
       * on the page is a blank rectangle and nothing else. Both are now said
       * out loud, because guessing between them cost days. */
      if (answer.allowed && !answer.active) {
        frame.removeAttribute('src');
        el.setAttribute('data-state', 'blocked');
        refused.textContent =
          'This site is allowed, but the rule that lets it through is not ' +
          'installed, so the browser is still refusing it. Turn the extension ' +
          'off and on again in your browser, or take the site back and allow ' +
          'it once more. The arrow above opens it in a window meanwhile.';
        return;
      }
      if (answer.allowed) {
        frame.setAttribute('src', src);
        el.setAttribute('data-state', 'ready');
        watchForRefusal(el, frame, src, index);
        return;
      }
      frame.removeAttribute('src');
      el.setAttribute('data-state', 'blocked');
      refused.textContent =
        'This site refuses to be shown inside another page. Your browser can ' +
        'allow it here, or the arrow above opens it in a window of its own.';
    });
  }

  /* Whether the link showing now is one of the marked ones. */
  function windowedNow(companion) {
    const tile = (companion.tiles || []).filter(function (t) {
      return t && t.url === companion.url;
    })[0];
    return !!(tile && tile.windowed);
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

  function placePane(el, companion, index) {
    const w = Math.max(240, Math.min(window.innerWidth - 16, Number(companion.w) || 380));
    const h = Math.max(160, Math.min(window.innerHeight - 16, Number(companion.h) || 260));
    el.style.width = w + 'px';
    el.style.height = h + 'px';

    if (companion.x == null || companion.y == null) {
      el.style.left = el.style.top = '';
      /* Stepped down and left of the one before it, so a second pane does not
       * land exactly on the first and look as though nothing happened. */
      const step = Math.round((Number(companion.offset) || index * 0.04) * 240);
      el.style.right = (24 + step) + 'px';
      el.style.bottom = (24 + step) + 'px';
      return;
    }
    const maxX = Math.max(0, window.innerWidth - w - 8);
    const maxY = Math.max(0, window.innerHeight - h - 8);
    el.style.left = Math.min(maxX, Math.max(8, companion.x * window.innerWidth)) + 'px';
    el.style.top = Math.min(maxY, Math.max(8, companion.y * window.innerHeight)) + 'px';
    el.style.right = 'auto';
    el.style.bottom = 'auto';
  }

  /* The list, or the single address that came before it - read the same way
   * everywhere, so a setting written by an older version can be changed and
   * not only looked at. Writing through a reading that ignored it produced an
   * empty list and lost the pane. */
  function paneList(companion) {
    const listed = (Array.isArray(companion.panes) ? companion.panes : [])
      .filter(function (x) { return x && typeof x.url === 'string'; });
    if (listed.length) return listed;
    return companion.url
      ? [{ url: companion.url, x: companion.x, y: companion.y,
           w: companion.w, h: companion.h }]
      : [];
  }

  /* Change one pane in the list, leaving the others where they are. */
  function savePane(index, patch) {
    chrome.storage.local.get({ companion: {} }, function (stored) {
      if (chrome.runtime.lastError) return;
      const c = Object.assign({}, NWT.DEFAULT_SETTINGS.companion, stored.companion);
      const panes = paneList(c).map(function (pane, i) {
        return i === index ? Object.assign({}, pane, patch) : pane;
      });
      chrome.storage.local.set({ companion: Object.assign({}, c, { panes: panes }) });
    });
  }

  /* Close one, and the pane feature with the last of them. */
  function closePane(index) {
    chrome.storage.local.get({ companion: {} }, function (stored) {
      if (chrome.runtime.lastError) return;
      const c = Object.assign({}, NWT.DEFAULT_SETTINGS.companion, stored.companion);
      const panes = paneList(c).filter(function (pane, i) { return i !== index; });
      chrome.storage.local.set({
        companion: Object.assign({}, c, { panes: panes, enabled: panes.length > 0 })
      });
    });
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

  function wirePane(el, index) {
    if (el.dataset.wired === '1') return;
    el.dataset.wired = '1';

    /* Closes this pane, not the feature. With one open the two are the same
     * thing; with two, turning both off because you closed one is not what
     * the corner of a window means anywhere else. */
    el.querySelector('.nwt-companion-hide').addEventListener('click', function (e) {
      e.stopPropagation();
      closePane(index);
    });

    /* The browser will only put its permission prompt in front of someone who
     * clicked inside an extension page, and this is a content script - so this
     * cannot raise the prompt itself. It hands the site to the extension,
     * which opens the page that can, with this site already named on it. The
     * alternative was a sentence telling you to go and find a button
     * elsewhere, which is how it read the first time and is not an answer. */
    /* A way out, and nothing more than that.
     *
     * This used to mark the link so it went to a window from then on. That
     * read one press as a decision about where the link lives, and the pane
     * then refused to try again - which is the opposite of what a pane on the
     * page is for. Wanting to see something in a window once is not the same
     * as wanting it out of the pane. Marking it is now something you do on
     * purpose, from the popup. */
    el.querySelector('.nwt-companion-hint').addEventListener('click', function (e) {
      e.stopPropagation();
      el.querySelector('.nwt-companion-out').click();
    });

    el.querySelector('.nwt-companion-undock').addEventListener('click', function (e) {
      e.stopPropagation();
      chrome.runtime.sendMessage({ type: 'companion:undock' },
        function () { void chrome.runtime.lastError; });
    });

    el.querySelector('.nwt-companion-here').addEventListener('click', function (e) {
      e.stopPropagation();
      chrome.storage.local.get({ companion: {} }, function (stored) {
        if (chrome.runtime.lastError) return;
        const c = stored.companion || {};
        saveCompanion({ tiles: (c.tiles || []).map(function (t) {
          return t && t.url === c.url ? Object.assign({}, t, { windowed: false }) : t;
        }) });
      });
    });

    el.querySelector('.nwt-companion-ask').addEventListener('click', function (e) {
      e.stopPropagation();
      chrome.storage.local.get({ companion: {} }, function (stored) {
        const src = NWT.companionSrc((stored.companion || {}).url);
        if (!src) return;
        chrome.runtime.sendMessage({ type: 'companion:ask', url: src },
          function () { void chrome.runtime.lastError; });
      });
    });

    /* Submitting sets this pane's address, so the panel you are looking at
     * becomes the thing you asked for. */
    el.querySelector('.nwt-companion-ask-link').addEventListener('submit', function (e) {
      if (e.preventDefault) e.preventDefault();
      e.stopPropagation();
      const field = el.querySelector('.nwt-companion-ask-input');
      const raw = (field.value || '').trim();
      if (!NWT.companionSrc(raw) || NWT.needsLink(raw)) {
        field.setAttribute('aria-invalid', 'true');
        return;
      }
      field.removeAttribute('aria-invalid');
      field.value = '';
      savePane(index, { url: raw });
    });

    el.querySelector('.nwt-companion-fold').addEventListener('click', function (e) {
      e.stopPropagation();
      savePane(index, { collapsed: el.getAttribute('data-collapsed') !== '1' });
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

    /* Its own place and its own size, so moving one pane does not move the
     * others with it. */
    dragBy(el, el.querySelector('.nwt-companion-bar'), function (r) {
      savePane(index, { x: r.left / window.innerWidth, y: r.top / window.innerHeight });
    });

    resizeBy(el, el.querySelector('.nwt-companion-grip'), function (w, h) {
      savePane(index, { w: w, h: h });
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

  /* ---- the split ---------------------------------------------------------
   * One tab, two boxes: the page narrowed to the left, and a column on the
   * right holding one panel or several, stacked, each with its own address.
   *
   * One is the common case and has to feel like one - a single panel fills the
   * column with no furniture suggesting there should be more. Two or three
   * divide it, with a handle between them and a bar you can collapse a panel
   * into rather than closing it and losing where it was.
   * --------------------------------------------------------------------- */
  const SPLIT_ID = 'nwt-split';
  const MAX_PANELS = 3;
  let splitWatch = null;

  function splitEl() {
    let el = document.getElementById(SPLIT_ID);
    if (el) return el;
    el = document.createElement('div');
    el.id = SPLIT_ID;

    const grip = document.createElement('div');
    grip.className = 'nwt-split-grip';
    grip.title = 'Drag to change how the page is divided';
    el.appendChild(grip);

    (document.body || document.documentElement).appendChild(el);
    return el;
  }

  /* One panel of the stack, built once and then only updated. */
  function panelEl(host, index) {
    let el = host.querySelector('.nwt-panel[data-index="' + index + '"]');
    /* A content blocker replaces the frame rather than removing the panel, so
     * a panel without its own frame is not one this built. */
    if (el && !el.querySelector('.nwt-panel-frame')) { el.remove(); el = null; }
    if (el) return el;

    el = document.createElement('div');
    el.className = 'nwt-panel';
    el.setAttribute('data-index', String(index));

    const grip = document.createElement('div');
    grip.className = 'nwt-panel-grip';
    grip.title = 'Drag to share the column differently';
    el.appendChild(grip);

    const bar = document.createElement('div');
    bar.className = 'nwt-panel-bar';
    const fold = document.createElement('button');
    fold.type = 'button';
    fold.className = 'nwt-panel-fold';
    bar.appendChild(fold);
    const title = document.createElement('span');
    title.className = 'nwt-panel-title';
    bar.appendChild(title);
    const out = document.createElement('button');
    out.type = 'button';
    out.className = 'nwt-panel-out';
    out.title = 'Open in a window of its own';
    out.textContent = '↗';
    bar.appendChild(out);
    const hide = document.createElement('button');
    hide.type = 'button';
    hide.className = 'nwt-panel-hide';
    hide.title = 'Close this panel';
    hide.textContent = '×';
    bar.appendChild(hide);
    el.appendChild(bar);

    const body = document.createElement('div');
    body.className = 'nwt-panel-body';
    const frame = document.createElement('iframe');
    frame.className = 'nwt-panel-frame';
    frame.setAttribute('sandbox', 'allow-scripts allow-same-origin allow-forms ' +
      'allow-popups allow-popups-to-escape-sandbox allow-presentation ' +
      'allow-modals allow-downloads allow-pointer-lock allow-orientation-lock ' +
      'allow-storage-access-by-user-activation');
    frame.setAttribute('allow',
      'autoplay; microphone; camera; display-capture; speaker-selection; ' +
      'picture-in-picture; encrypted-media; fullscreen');
    frame.setAttribute('referrerpolicy', 'strict-origin-when-cross-origin');
    body.appendChild(frame);
    const ask = document.createElement('form');
    ask.className = 'nwt-panel-ask-link';
    const askInput = document.createElement('input');
    askInput.type = 'url';
    askInput.className = 'nwt-panel-ask-input';
    askInput.placeholder = 'Paste a video link';
    ask.appendChild(askInput);
    const askGo = document.createElement('button');
    askGo.type = 'submit';
    askGo.textContent = 'Play';
    ask.appendChild(askGo);
    body.appendChild(ask);

    const said = document.createElement('p');
    said.className = 'nwt-panel-said';
    body.appendChild(said);
    const instead = document.createElement('button');
    instead.type = 'button';
    instead.className = 'nwt-panel-instead';
    body.appendChild(instead);
    el.appendChild(body);

    host.appendChild(el);
    wirePanel(el, index);
    return el;
  }

  function removeSplit() {
    if (splitWatch) { clearTimeout(splitWatch); splitWatch = null; }
    const el = document.getElementById(SPLIT_ID);
    if (el) el.remove();
    document.documentElement.classList.remove('nwt-split-on');
    document.documentElement.style.removeProperty('--nwt-split-w');
  }

  /* Clamped rather than trusted: this comes from storage, and a divider
   * dragged off either edge leaves one half unusable with no way back. */
  function splitWidth(split) {
    const f = Number(split.width);
    const frac = isFinite(f) ? Math.max(0.18, Math.min(0.72, f)) : 0.36;
    return Math.round(window.innerWidth * frac);
  }

  function splitPanels(split) {
    return (Array.isArray(split.panels) ? split.panels : [])
      .filter(function (x) { return x && typeof x.url === 'string'; })
      .slice(0, MAX_PANELS);
  }

  /* The rule report, mirrored onto the page as an attribute.
   *
   * Nothing reads this but a person looking for why a frame is empty. Every
   * other way of finding out needs the browser's own extension pages, and the
   * failure it describes - a rule that was never installed - is
   * indistinguishable on the page from a site that will not be framed. */
  function reportRules(settings) {
    const r = settings.ruleReport;
    if (!TOP_FRAME || !document.documentElement) return;
    if (!r) { document.documentElement.removeAttribute('data-nwt-rules'); return; }
    try {
      document.documentElement.setAttribute('data-nwt-rules', JSON.stringify({
        wanted: r.wanted || [], installed: r.installed || [], error: r.error || ''
      }));
    } catch (e) { /* never break the page over a diagnostic */ }
  }

  function renderSplit(settings) {
    const split = Object.assign({}, NWT.DEFAULT_SETTINGS.split, settings.split);
    const panels = splitPanels(split);
    if (!settings.enabled || !split.enabled || !TOP_FRAME || !panels.length) {
      removeSplit();
      return;
    }

    const el = splitEl();
    document.documentElement.style.setProperty('--nwt-split-w', splitWidth(split) + 'px');
    document.documentElement.classList.add('nwt-split-on');
    wireSplit(el);

    /* Any panel beyond the list has been closed, so its element goes with it. */
    [...el.querySelectorAll('.nwt-panel')].forEach(function (node) {
      if (Number(node.getAttribute('data-index')) >= panels.length) node.remove();
    });

    const shares = NWT.panelShares(panels);
    panels.forEach(function (panel, i) {
      const node = panelEl(el, i);
      node.style.setProperty('--nwt-panel-share', (shares[i] * 100).toFixed(3) + '%');
      node.setAttribute('data-collapsed', panel.collapsed ? '1' : '0');
      node.setAttribute('data-url', panel.url || '');
      node.querySelector('.nwt-panel-fold').textContent = panel.collapsed ? '▸' : '▾';
      node.querySelector('.nwt-panel-fold').title =
        panel.collapsed ? 'Open this panel' : 'Fold it down to its bar';
      paintPanel(node, panel, i);
    });
  }

  function paintPanel(node, panel, index) {
    const frame = node.querySelector('.nwt-panel-frame');
    const said = node.querySelector('.nwt-panel-said');
    const src = NWT.companionSrc(panel.url);
    node.querySelector('.nwt-panel-title').textContent = panelLabel(panel, src);

    if (!src) {
      frame.removeAttribute('src');
      node.setAttribute('data-state', 'empty');
      said.textContent = panel.url
        ? 'That is not an address this can open. It has to start with https.'
        : 'Nothing chosen yet. Pick a link in the extension popup.';
      return;
    }
    /* Nothing is loaded into a panel that is folded away: it is not on screen,
     * and a video in it would go on playing behind a closed bar. */
    if (panel.collapsed) { frame.removeAttribute('src'); node.setAttribute('data-state', 'folded'); return; }

    /* A doorway rather than a destination. */
    if (NWT.needsLink(panel.url)) {
      frame.removeAttribute('src');
      node.setAttribute('data-state', 'ask');
      return;
    }

    /* Asked of the frame rather than a variable beside it: the site rebuilds
     * its body as it navigates, and a fresh element has no src however sure a
     * variable is that it is already showing one. */
    if (frame.getAttribute('src') === src) return;
    node.setAttribute('data-state', 'loading');
    said.textContent = 'Loading…';

    if (NWT.framesFreely(src)) {
      frame.setAttribute('src', src);
      node.setAttribute('data-state', 'ready');
      watchPanelRefusal(node, frame, src);
      return;
    }
    askAllowed(src, function (answer) {
      if (!frame.isConnected) return;
      if (answer.allowed && !answer.active) {
        frame.removeAttribute('src');
        node.setAttribute('data-state', 'blocked');
        said.textContent =
          'This site is allowed, but the rule that lets it through is not ' +
          'installed, so the browser is still refusing it. Turn the extension ' +
          'off and on again, or take the site back and allow it once more.';
        offerInstead(node);
        return;
      }
      if (answer.allowed) {
        frame.setAttribute('src', src);
        node.setAttribute('data-state', 'ready');
        watchPanelRefusal(node, frame, src);
        return;
      }
      frame.removeAttribute('src');
      node.setAttribute('data-state', 'blocked');
      said.textContent =
        'This site refuses to be shown inside another page. Allow it in the ' +
        'extension popup, or open it beside the page instead.';
      offerInstead(node);
    });
  }

  /* A browser refuses a frame by giving it no room, so a panel that stays
   * empty says why rather than sitting there. */
  function watchPanelRefusal(node, frame, src) {
    setTimeout(function () {
      if (!frame.isConnected || frame.getAttribute('src') !== src) return;
      const box = frame.getBoundingClientRect();
      if (box.width > 0 && box.height > 0) return;
      node.setAttribute('data-state', 'blocked');
      node.querySelector('.nwt-panel-said').textContent =
        'The browser refused this frame, which it does by giving it no room ' +
        'at all. Opening it beside the page works instead.';
      offerInstead(node);
    }, 2500);
  }

  /* A frame cannot hold an application that refuses to be embedded, and no
   * permission changes that. A window of its own is not inside another page,
   * so everything works there - signed in, and a voice channel you can hear. */
  function offerInstead(node) {
    const button = node.querySelector('.nwt-panel-instead');
    node.setAttribute('data-instead', '1');
    button.textContent = 'Open it beside the page';
    button.title = 'This window keeps the left of the screen and the site ' +
                   'takes the right, both as real browser windows - where it ' +
                   'runs in full, voice channels included.';
  }

  function panelLabel(panel, src) {
    try {
      return new URL(src || panel.url).hostname.replace(/^www\./, '');
    } catch (e) {
      return 'Panel';
    }
  }

  function saveSplit(patch) {
    chrome.storage.local.get({ split: {} }, function (stored) {
      if (chrome.runtime.lastError) return;
      chrome.storage.local.set({
        split: Object.assign({}, NWT.DEFAULT_SETTINGS.split, stored.split, patch)
      });
    });
  }

  /* Change one panel in the list, leaving the others exactly as they were. */
  function savePanel(index, patch) {
    chrome.storage.local.get({ split: {} }, function (stored) {
      if (chrome.runtime.lastError) return;
      const split = Object.assign({}, NWT.DEFAULT_SETTINGS.split, stored.split);
      const panels = splitPanels(split).map(function (p, i) {
        return i === index ? Object.assign({}, p, patch) : p;
      });
      chrome.storage.local.set({ split: Object.assign({}, split, { panels: panels }) });
    });
  }

  function dropPanel(index) {
    chrome.storage.local.get({ split: {} }, function (stored) {
      if (chrome.runtime.lastError) return;
      const split = Object.assign({}, NWT.DEFAULT_SETTINGS.split, stored.split);
      const panels = splitPanels(split).filter(function (p, i) { return i !== index; })
        /* The sizes belonged to a column with one more panel in it, so they are
         * dropped and shared out evenly again rather than leaving a gap. */
        .map(function (p) { const q = Object.assign({}, p); delete q.size; return q; });
      chrome.storage.local.set({
        split: Object.assign({}, split, { panels: panels, enabled: panels.length > 0 })
      });
    });
  }

  function wirePanel(node, index) {
    node.querySelector('.nwt-panel-ask-link').addEventListener('submit', function (e) {
      if (e.preventDefault) e.preventDefault();
      e.stopPropagation();
      const field = node.querySelector('.nwt-panel-ask-input');
      const raw = (field.value || '').trim();
      if (!NWT.companionSrc(raw) || NWT.needsLink(raw)) {
        field.setAttribute('aria-invalid', 'true');
        return;
      }
      field.removeAttribute('aria-invalid');
      field.value = '';
      savePanel(index, { url: raw });
    });

    node.querySelector('.nwt-panel-hide').addEventListener('click', function (e) {
      e.stopPropagation();
      dropPanel(index);
    });
    node.querySelector('.nwt-panel-fold').addEventListener('click', function (e) {
      e.stopPropagation();
      savePanel(index, { collapsed: node.getAttribute('data-collapsed') !== '1' });
    });
    node.querySelector('.nwt-panel-out').addEventListener('click', function (e) {
      e.stopPropagation();
      const src = NWT.companionSrc(currentPanelUrl(node));
      if (!src) return;
      chrome.runtime.sendMessage({ type: 'companion:window', url: src },
        function () { void chrome.runtime.lastError; });
    });
    node.querySelector('.nwt-panel-instead').addEventListener('click', function (e) {
      e.stopPropagation();
      const src = NWT.companionSrc(currentPanelUrl(node));
      if (!src) return;
      chrome.runtime.sendMessage({
        type: 'companion:dock', url: src,
        screen: { left: screen.availLeft | 0, top: screen.availTop | 0,
                  width: screen.availWidth, height: screen.availHeight }
      }, function () { void chrome.runtime.lastError; });
      dropPanel(index);
    });

    /* Sharing the column between this panel and the one above it. */
    dragRows(node, index);
  }

  /* Read from the element rather than closed over, so a panel that is
   * re-rendered with a different address still acts on the current one. */
  function currentPanelUrl(node) {
    return node.getAttribute('data-url') || '';
  }

  function dragRows(node, index) {
    const grip = node.querySelector('.nwt-panel-grip');
    if (index === 0) return;              /* nothing above the first */
    let dragging = false;
    const host = node.parentElement;

    const settle = NWT.debounce(function () {
      const nodes = [...host.querySelectorAll('.nwt-panel')];
      const total = host.getBoundingClientRect().height || 1;
      chrome.storage.local.get({ split: {} }, function (stored) {
        if (chrome.runtime.lastError) return;
        const split = Object.assign({}, NWT.DEFAULT_SETTINGS.split, stored.split);
        const panels = splitPanels(split).map(function (p, i) {
          if (p.collapsed || !nodes[i]) return p;
          return Object.assign({}, p, {
            size: nodes[i].getBoundingClientRect().height / total
          });
        });
        chrome.storage.local.set({ split: Object.assign({}, split, { panels: panels }) });
      });
    }, 160);

    grip.addEventListener('pointerdown', function (e) {
      dragging = true;
      host.setAttribute('data-drag', 'row');
      try { grip.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
      if (e.preventDefault) e.preventDefault();
    });
    grip.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      const above = node.previousElementSibling;
      if (!above || !above.classList.contains('nwt-panel')) return;
      const total = host.getBoundingClientRect().height || 1;
      const top = above.getBoundingClientRect().top;
      /* Both sides keep a usable minimum, or a panel can be dragged away to
       * nothing with no edge left to take hold of. */
      const min = 64;
      const pair = above.getBoundingClientRect().height + node.getBoundingClientRect().height;
      const wanted = Math.max(min, Math.min(pair - min, e.clientY - top));
      above.style.setProperty('--nwt-panel-share', (wanted / total * 100).toFixed(3) + '%');
      node.style.setProperty('--nwt-panel-share', ((pair - wanted) / total * 100).toFixed(3) + '%');
      settle();
    });
    const stop = function (e) {
      if (!dragging) return;
      dragging = false;
      host.removeAttribute('data-drag');
      try { grip.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      settle.flush();
    };
    grip.addEventListener('pointerup', stop);
    grip.addEventListener('pointercancel', stop);
  }

  function wireSplit(el) {
    if (el.dataset.wired === '1') return;
    el.dataset.wired = '1';

    /* Dragging the column's own edge. The width is written once the drag
     * settles, for the same reason the dials are: every write reaches every
     * open tab. */
    const grip = el.querySelector('.nwt-split-grip');
    let dragging = false;
    const settle = NWT.debounce(function () {
      const px = parseFloat(document.documentElement.style.getPropertyValue('--nwt-split-w'));
      if (px > 0) saveSplit({ width: px / window.innerWidth });
    }, 160);

    grip.addEventListener('pointerdown', function (e) {
      dragging = true;
      el.setAttribute('data-drag', 'col');
      try { grip.setPointerCapture(e.pointerId); } catch (err) { /* older engines */ }
      if (e.preventDefault) e.preventDefault();
    });
    grip.addEventListener('pointermove', function (e) {
      if (!dragging) return;
      /* Measured from the right edge of the window, so the divider lands under
       * the pointer rather than drifting away from it. */
      const px = Math.max(160, Math.min(window.innerWidth - 240,
                                        window.innerWidth - e.clientX));
      document.documentElement.style.setProperty('--nwt-split-w', Math.round(px) + 'px');
      settle();
    });
    const stop = function (e) {
      if (!dragging) return;
      dragging = false;
      el.removeAttribute('data-drag');
      try { grip.releasePointerCapture(e.pointerId); } catch (err) { /* ignore */ }
      settle.flush();
    };
    grip.addEventListener('pointerup', stop);
    grip.addEventListener('pointercancel', stop);
  }

  let paneGrantSeen = 0;
  /* The last settings the pane was drawn from, so it can be drawn again
   * without waiting for something else to change. */
  let paneSettings = null;

  function renderPane(settings) {
    paneSettings = settings;
    const companion = Object.assign({}, NWT.DEFAULT_SETTINGS.companion, settings.companion);
    /* The list, or the single address that came before it.
     *
     * `migrate` folds the old field into the list, but it runs where settings
     * are written - the popup and the worker - and this reads them straight
     * from storage. A page open while an older version wrote there, or opened
     * before anything has run the migration, would otherwise show nothing at
     * all and look like the feature had been removed. */
    const panes = paneList(companion).slice(0, 3);

    /* Anywhere on the site, not only on a project page. The timer is tied to a
     * project because a session is about building one; something to keep in
     * view while you work is not. The top frame only, so it is not drawn once
     * per embedded frame. */
    if (!settings.enabled || !companion.enabled || !TOP_FRAME || !panes.length) {
      removePane();
      return;
    }

    /* A site was allowed, or taken back, since the last paint, so the cached
     * answers are stale and the frames are given another go. */
    const granted = Number(companion.grantedAt) || 0;
    if (granted !== paneGrantSeen) {
      paneGrantSeen = granted;
      Object.keys(paneAllowed).forEach(function (k) { delete paneAllowed[k]; });
      paneShowing = {};
    }

    /* Any pane past the end of the list has been closed. */
    [...document.querySelectorAll('.nwt-companion')].forEach(function (node) {
      if (Number(node.getAttribute('data-index')) >= panes.length) node.remove();
    });

    panes.forEach(function (pane, i) {
      const el = paneEl(i);
      /* Each pane carries the shared settings plus its own place and size, so
       * everything below can go on treating one pane at a time. */
      const one = Object.assign({}, companion, pane);
      paintPane(el, one, i);
      wirePane(el, i);
      placePane(el, one, i);
    });
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
      removeSplit();
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
    renderSplit(s);
    reportRules(s);

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

    /* The same defence the stylesheet has always had, which the pane needed
     * just as much and did not have. This site rebuilds its body as it
     * navigates, and everything added to it goes with the rebuild. The pane
     * then stayed gone until something else happened to change - and when it
     * did come back it came back empty, because the guard that decides whether
     * to load anything was reading a variable rather than the frame. */
    if (paneSettings && !document.getElementById(PANE_ID)) renderPane(paneSettings);

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
