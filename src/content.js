/* ============================================================================
 * NextWork Theme Studio - content script
 * Runs at document_start. Injects one <style> element built from the saved
 * theme, then keeps it in sync with storage.
 * ==========================================================================*/
(function () {
  'use strict';

  const STYLE_ID = 'nwt-theme';
  const CACHE_KEY = '__nwt_css_cache_v1';

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
   * chrome.storage is async, which is long enough for a white page to
   * paint. The page's own localStorage is synchronous and same-origin, so
   * we stash the last generated CSS there and use it immediately, then let
   * the real settings correct it a few milliseconds later. */
  let cached = null;
  try { cached = JSON.parse(localStorage.getItem(CACHE_KEY) || 'null'); } catch (e) { /* private mode */ }
  if (cached && cached.enabled && cached.css) apply(cached.css);

  function writeCache(enabled, css) {
    try { localStorage.setItem(CACHE_KEY, JSON.stringify({ enabled: enabled, css: css })); } catch (e) { /* ignore */ }
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

  function adopt(root, sheet) {
    try {
      const current = root.adoptedStyleSheets || [];
      if (current.indexOf(sheet) === -1) root.adoptedStyleSheets = current.concat(sheet);
    } catch (e) { /* closed or cross-origin root */ }
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
      if (e.button !== 0) return;
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

  function renderHud(settings) {
    const focus = Object.assign({}, NWT.DEFAULT_SETTINGS.focus, settings.focus);
    if (!settings.enabled || !focus.enabled) { removeHud(); return; }
    paintHud(focus);
    const el = hudEl();
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

  /* ---- real settings --------------------------------------------------- */
  function render(settings) {
    const s = Object.assign({}, NWT.DEFAULT_SETTINGS, settings || {});
    if (!s.enabled) {
      remove();
      removeHud();
      shadowSheetFor('');           /* neutralise the adopted copies in place */
      writeCache(false, '');
      return;
    }
    const css = NWT.buildCSS(s);
    apply(css);
    paintShadowRoots(shadowSheetFor(NWT.buildCSS(s, null, { shadow: true })));
    writeCache(true, css);
    renderHud(s);
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

  /* Live preview: the options page pushes a candidate stylesheet while you
   * drag a slider, without saving it. */
  chrome.runtime.onMessage.addListener(function (msg) {
    if (!msg) return;
    if (msg.type === 'nwt-preview' && typeof msg.css === 'string') apply(msg.css);
    if (msg.type === 'nwt-preview-end') {
      chrome.storage.local.get(null, function (settings) { render(settings); });
    }
  });

  /* If the page ever nukes our node (head swaps during hydration), put it
   * back with whatever we last applied. */
  const observer = new MutationObserver(function () {
    if (lastCSS && !document.getElementById(STYLE_ID)) apply(lastCSS);
    /* The app mounts components continuously, so newly created shadow roots
     * need the sheet too. Adopting is idempotent and cheap. */
    if (lastCSS && shadowSheet) paintShadowRoots(shadowSheet);
  });
  if (document.documentElement) {
    observer.observe(document.documentElement, { childList: true, subtree: true });
    document.addEventListener('DOMContentLoaded', function () {
      if (document.head) observer.observe(document.head, { childList: true });
      if (shadowSheet) paintShadowRoots(shadowSheet);
    });
  }
})();
