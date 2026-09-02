/* ============================================================================
 * Pineapple NextWork Theme Studio Mod - content script
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
  function rescueInvisibleText(palette) {
    let nodes;
    try { nodes = document.querySelectorAll('[class*="text-white"]'); }
    catch (e) { return; }
    const work = [];
    for (let i = 0; i < nodes.length; i++) {
      const el = nodes[i];
      if (el.dataset.nwtInk === '1') continue;
      let cs;
      try { cs = getComputedStyle(el); } catch (e) { continue; }
      if (!isLight(cs.color)) continue;            /* not light text, leave it */
      const behind = effectiveBackground(el);
      if (behind && !isLight(behind)) continue;    /* light on dark is correct */
      work.push(el);
    }
    work.forEach(function (el) {
      el.dataset.nwtInk = '1';
      el.style.setProperty('color', palette.ink, 'important');
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
    let nodes;
    try { nodes = document.querySelectorAll('[data-nwt-lit], [data-nwt-ground], [data-nwt-ink]'); }
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
          if (theme.mode === 'light') base.ink = p.textPrimary;
          else base.panels = true;
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
