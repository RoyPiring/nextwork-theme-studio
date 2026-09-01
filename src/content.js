/* ============================================================================
 * NextWork Theme Studio - content script
 * Runs at document_start. Injects one <style> element built from the saved
 * theme, then keeps it in sync with storage.
 * ==========================================================================*/
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

  function adopt(root, sheet) {
    if (adoptedRoots.has(root)) return;
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
  function schedulePaint() {
    if (paintQueued || !shadowSheet) return;
    paintQueued = true;
    setTimeout(function () {
      paintQueued = false;
      try { paintShadowRoots(shadowSheet); } catch (e) { /* never break the page */ }
    }, 120);
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

  function paintHud(focus) {
    const el = hudEl();
    const counting = focus.targetMin > 0;
    const value = counting ? NWT.focusRemaining(focus) : NWT.focusElapsed(focus);
    el.querySelector('.nwt-focus-time').textContent = NWT.formatDuration(value);
    el.querySelector('.nwt-focus-label').textContent =
      !focus.running ? 'paused' : (counting && value < 0 ? 'over' : 'focus');
    el.setAttribute('data-state',
      !focus.running ? 'paused' : (counting && value < 0 ? 'over' : 'running'));
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
    return /\/projects?\//.test(location.pathname);
  }

  function renderHud(settings) {
    const focus = Object.assign({}, NWT.DEFAULT_SETTINGS.focus, settings.focus);
    if (!settings.enabled || !focus.enabled || !onProjectPage()) { removeHud(); return; }
    paintHud(focus);
    const el = hudEl();
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

  function parseColour(value) {
    const norm = normalise(value);
    if (!norm) return null;
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

  function isDarkText(colour) {
    const c = parseColour(colour);
    return !!c && luminance(c) < 0.35;
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

  function scheduleRescue(palette) {
    if (rescueQueued) return;
    rescueQueued = true;
    setTimeout(function () {
      rescueQueued = false;
      try { rescueLightPanels(palette); } catch (e) { /* never break the page */ }
    }, 220);
  }

  /* ---- real settings --------------------------------------------------- */
  let lastPalette = null;

  function render(settings) {
    const s = Object.assign({}, NWT.DEFAULT_SETTINGS, settings || {});
    if (!s.enabled) {
      remove();
      removeHud();
      shadowSheetFor('');           /* neutralise the adopted copies in place */
      writeCache(false, '');
      return;
    }
    apply(NWT.buildCSS(s));
    paintShadowRoots(shadowSheetFor(NWT.buildCSS(s, null, { shadow: true })));
    writeCache(true, s.themeId);
    renderHud(s);

    const theme = NWT.getTheme(s);
    if (theme.mode !== 'light' && s.options && s.options.rescuePanels !== false) {
      const p = NWT.buildPalette(theme);
      lastPalette = { surface: p.surfaceAlt, text: p.textPrimary, border: p.border };
      scheduleRescue(lastPalette);
    } else {
      lastPalette = null;
    }
  }

  chrome.storage.local.get(null, function (settings) {
    if (chrome.runtime.lastError) return;
    render(settings);
  });

  chrome.storage.onChanged.addListener(function (changes, area) {
    if (area !== 'local') return;
    chrome.storage.local.get(null, function (settings) {
      if (chrome.runtime.lastError) return;
      render(settings);
    });
  });

  /* If the page ever nukes our node (head swaps during hydration), put it
   * back with whatever we last applied. */
  const observer = new MutationObserver(function () {
    if (lastCSS && !document.getElementById(STYLE_ID)) apply(lastCSS);
    /* The app mounts components continuously, so newly created shadow roots
     * need the sheet too. */
    if (lastCSS) schedulePaint();
    /* panels are built on demand, so re-check whenever the DOM changes */
    if (lastCSS && lastPalette) scheduleRescue(lastPalette);
  });
  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', function () {
      if (document.head) observer.observe(document.head, { childList: true });
      if (shadowSheet) paintShadowRoots(shadowSheet);
    });
  }
})();
