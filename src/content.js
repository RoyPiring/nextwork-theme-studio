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

  /* ---- real settings --------------------------------------------------- */
  function render(settings) {
    const s = Object.assign({}, NWT.DEFAULT_SETTINGS, settings || {});
    if (!s.enabled) {
      remove();
      shadowSheetFor('');           /* neutralise the adopted copies in place */
      writeCache(false, '');
      return;
    }
    const css = NWT.buildCSS(s);
    apply(css);
    paintShadowRoots(shadowSheetFor(NWT.buildCSS(s, null, { shadow: true })));
    writeCache(true, css);
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
