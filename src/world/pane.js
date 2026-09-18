/* NextWorld · pane: the world on the page
 * A fixed pane the content script owns, with a shadow root so the site's
 * styles cannot reach the game and the game's cannot reach the site. The
 * content script calls render() with the settings and a few of its own
 * tools; this file never reads storage or the page on its own. */
'use strict';
(function () {
  const ID = 'nwt-world';
  let el = null, root = null, api = null, tools = null, lastMode = '';
  const BAR_CSS = `
    :host { all: initial; }
    .nwp-shell { display: flex; flex-direction: column; height: 100%; font: 13px/1.4 "Segoe UI", system-ui, sans-serif; color: var(--nwp-text, #f2f5fb); background: var(--nwp-canvas, #172033); border-radius: 14px; overflow: hidden; box-shadow: 0 18px 50px rgba(0,0,0,.5), 0 0 0 1px var(--nwp-line, rgba(255,255,255,.12)); }
    .nwp-shell[data-full="1"] { border-radius: 0; }
    .nwp-bar { display: flex; align-items: center; gap: 8px; padding: 6px 8px 6px 12px; background: var(--nwp-surface, #111828); border-bottom: 1px solid var(--nwp-line, rgba(255,255,255,.12)); cursor: grab; user-select: none; touch-action: none; }
    .nwp-bar b { font-weight: 800; font-size: 13px; flex: 1; color: var(--nwp-text, #fff); } .nwp-bar b span { color: var(--nwp-accent, #ffc531); }
    .nwp-bar button { font: 700 12px/1 "Segoe UI", system-ui, sans-serif; min-width: 28px; height: 26px; padding: 0 6px; border: 1px solid var(--nwp-line, rgba(255,255,255,.18)); border-radius: 8px; background: transparent; color: var(--nwp-text, #fff); cursor: pointer; }
    .nwp-bar button:hover { filter: brightness(1.15); background: rgba(127,127,127,.15); } .nwp-bar button:focus-visible { outline: 3px solid var(--nwp-accent, #ffc531); outline-offset: 1px; }
    .nwp-body { flex: 1; overflow: auto; min-height: 0; } .nwp-body[hidden] { display: none; }
    .nwp-grip { position: absolute; right: 0; bottom: 0; width: 18px; height: 18px; cursor: nwse-resize; background: linear-gradient(135deg, transparent 50%, rgba(255,255,255,.35) 50%, rgba(255,255,255,.35) 60%, transparent 60%, transparent 75%, rgba(255,255,255,.35) 75%, rgba(255,255,255,.35) 85%, transparent 85%); }
  `;
  function world(settings) { return Object.assign({}, NWT.DEFAULT_SETTINGS.world, settings.world); }
  /* the extension's palette for whatever theme is on, so the world wears it too */
  function palette(settings) { try { return NWT.buildPalette(NWT.getTheme(settings)); } catch (e) { return null; } }
  function place(w) {
    const vw = window.innerWidth, vh = window.innerHeight;
    if (w.full) { el.style.left = '0px'; el.style.top = '0px'; el.style.width = vw + 'px'; el.style.height = vh + 'px'; return; }
    /* by default: the right-hand side, top to bottom of the browser */
    const width = Math.min(w.w || 470, vw - 16), height = Math.min(w.h || (vh - 24), vh - 16);
    el.style.width = width + 'px'; el.style.height = (w.collapsed ? 38 : height) + 'px';
    const x = typeof w.x === 'number' ? w.x * vw : vw - width - 12, y = typeof w.y === 'number' ? w.y * vh : 12;
    el.style.left = Math.max(0, Math.min(vw - width, x)) + 'px'; el.style.top = Math.max(0, Math.min(vh - 38, y)) + 'px';
  }
  /* the bar wears the extension's theme as well */
  function dress(p) { if (!p || !el) return; const v = { canvas: p.canvas, surface: p.surface, text: p.textPrimary, line: p.border, accent: p.accent }; Object.keys(v).forEach(k => { if (v[k]) el.style.setProperty('--nwp-' + k, v[k]); }); }
  function build(settings) {
    el = document.createElement('div'); el.id = ID; el.setAttribute('data-nwt-own', '1');
    el.style.cssText = 'position:fixed;z-index:2147483000;left:0;top:0;width:470px;height:640px;';
    root = el.attachShadow({ mode: 'open' });
    const style = document.createElement('style'); style.textContent = BAR_CSS; root.appendChild(style);
    const shell = document.createElement('div'); shell.className = 'nwp-shell'; shell.id = 'nwp-shell'; root.appendChild(shell);
    const bar = document.createElement('div'); bar.className = 'nwp-bar'; const title = document.createElement('b'); title.textContent = 'Next'; const span = document.createElement('span'); span.textContent = 'World'; title.appendChild(span);
    const full = document.createElement('button'); full.type = 'button'; full.title = 'Fill the browser, or put it back'; full.textContent = '⤢'; full.setAttribute('aria-label', 'Expand to the whole browser, or put it back');
    const fold = document.createElement('button'); fold.type = 'button'; fold.title = 'Fold'; fold.textContent = '▾'; fold.setAttribute('aria-label', 'Fold the world away');
    const close = document.createElement('button'); close.type = 'button'; close.title = 'Close'; close.textContent = '×'; close.setAttribute('aria-label', 'Close the world');
    bar.appendChild(title); bar.appendChild(full); bar.appendChild(fold); bar.appendChild(close); shell.appendChild(bar);
    const body = document.createElement('div'); body.className = 'nwp-body'; shell.appendChild(body);
    const grip = document.createElement('div'); grip.className = 'nwp-grip'; shell.appendChild(grip);
    full.addEventListener('click', () => tools.saveWorld({ full: !world(tools.current()).full, collapsed: false }));
    fold.addEventListener('click', () => tools.saveWorld({ collapsed: !world(tools.current()).collapsed }));
    close.addEventListener('click', () => tools.saveWorld({ enabled: false }));
    tools.dragBy(el, bar, () => tools.saveWorld({ x: el.offsetLeft / window.innerWidth, y: el.offsetTop / window.innerHeight }));
    tools.resizeBy(el, grip, () => tools.saveWorld({ w: el.offsetWidth, h: el.offsetHeight }));
    (document.body || document.documentElement).appendChild(el);
    const w = world(settings);
    api = NW.mount(body, {
      load: () => Object.assign({}, w.state || w.read || NW.State.fresh(), { mode: w.mode }),
      save: s => tools.saveWorld({ state: s, mode: s.mode }),
      remember: (k, v) => { if (v === undefined) return w.tab || ''; tools.saveWorld({ tab: v }); },
      production: () => world(tools.current()).read || NW.State.fresh(),
      palette: () => palette(settings),
      openProject: (title) => { api.state.building = title; api.repaint(); tools.openExplore(title); }
    });
    return body;
  }
  function render(settings) {
    const w = world(settings);
    if (!settings.enabled || !w.enabled) { remove(); return; }
    if (!el || !el.isConnected) { if (el) el.remove(); build(settings); }
    el.setAttribute('data-peek', settings.peek ? '1' : '0');
    el.style.opacity = settings.peek ? '0' : ''; el.style.pointerEvents = settings.peek ? 'none' : '';
    root.querySelector('.nwp-body').hidden = !!w.collapsed; root.getElementById('nwp-shell').setAttribute('data-full', w.full ? '1' : '0');
    dress(palette(settings)); place(w);
    if (api) api.theme(palette(settings));
    if (api && w.mode !== lastMode) { lastMode = w.mode; if (api.state.mode !== w.mode) { api.state.mode = w.mode; api.repaint(); } }
    if (!api) return;   /* still mounting: a save from inside mount comes back through here */
    if (settings.peek || w.collapsed || document.hidden) api.pause(); else api.resume();
  }
  function remove() { if (el) el.remove(); if (api) api.pause(); el = null; root = null; api = null; lastMode = ''; }
  /* readings from the page, handed in by the content script once the page has settled */
  function read(doc, pathname) {
    const p = NW.Readers.readProjectPage(doc, pathname); if (p) { if (api) api.applyProject(p); const cur = world(tools.current()); const r = NW.State.applyProjectReading(NW.State.normalise(cur.read || {}), p); tools.saveWorld({ read: r }); return p; }
    const f = NW.Readers.readPortfolioPage(doc, pathname); if (f) { if (api) api.applyPortfolio(f); const cur = world(tools.current()); const r = NW.State.applyPortfolioReading(NW.State.normalise(cur.read || {}), f); tools.saveWorld({ read: r }); return f; }
    return null;
  }
  function setup(t) { tools = t; }
  /* the browser changed size: the pane keeps its place and its share of it */
  window.addEventListener('resize', () => { if (el && tools) place(world(tools.current())); });
  self.NWT_WORLD = { ID, setup, render, remove, read, isOpen: () => !!el };
})();
