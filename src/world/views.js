/* NextWorld · views: the panel itself
 * mount(root, host) builds the tabs inside root (an element or a shadow
 * root) and draws only the tab that is showing. The host supplies storage,
 * the theme, and what "open this project" means; nothing here touches the
 * page. */
'use strict';
(function () {
  const { makeIso, B, clamp, lerp, reduce, SERIES, START_HERE, ABOUT, KIND_NAME, ICON, TW, TH } = NW;
  const S = NW.State, Land = NW.Land, HQ = NW.HQ, G = NW.Global;
  const TABS = [['world', 'NextWork World'], ['base', 'My World'], ['avatar', 'Avatar'], ['build', 'My Build'], ['global', 'NextWork Global']];

  const CSS = `
    :host, .nww { all: initial; }
    .nww { display: block; font: 14px/1.45 Nunito, "Segoe UI", system-ui, sans-serif; color: var(--nww-text, #f2f5fb); background: var(--nww-canvas, #172033); border-radius: 14px; overflow: hidden; --gold: var(--nww-accent, #ffc531); --ink: var(--nww-accent-text, #4a2b00); --dim: var(--nww-dim, #9aa6c0); --line: var(--nww-line, rgba(255,255,255,.12)); --card: var(--nww-surface, #1f2a42); --ok: #47d16c; --xp: #4fc3ff; --bar: var(--nww-bar, linear-gradient(180deg, #223052, #182339)); --tab-on: var(--nww-surface-alt, #fff); --tab-on-text: var(--nww-tab-text, #172033); }
    .nww * { box-sizing: border-box; } .nww button { font: inherit; cursor: pointer; } .nww button:focus-visible, .nww canvas:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
    .bar { display: flex; align-items: center; gap: 8px; padding: 10px 12px 8px; background: var(--bar); border-bottom: 1px solid var(--line); flex-wrap: wrap; }
    .brand { font: 800 16px/1 "Baloo 2", "Segoe UI", system-ui, sans-serif; color: var(--nww-text, #fff); white-space: nowrap; } .brand span { color: var(--gold); }
    .mode { margin-left: auto; font: 700 11px/1 "Baloo 2", system-ui, sans-serif; padding: 6px 10px; border: 1px solid var(--line); border-radius: 999px; background: rgba(0,0,0,.25); color: var(--dim); }
    .mode[data-on="dev"] { color: #0b3d1b; background: #8fe3a4; border-color: transparent; }
    .tabs { display: flex; gap: 3px; background: rgba(0,0,0,.25); border-radius: 12px; padding: 3px; width: 100%; }
    .tabs button { flex: 1; font: 700 11.5px/1.1 "Baloo 2", system-ui, sans-serif; padding: 7px 4px; border: 0; border-radius: 9px; background: transparent; color: var(--dim); white-space: nowrap; }
    .tabs button[aria-selected="true"] { background: var(--tab-on); color: var(--tab-on-text); box-shadow: 0 2px 8px rgba(0,0,0,.35); }
    .view { padding: 10px 12px 14px; display: flex; flex-direction: column; gap: 10px; } .view[hidden] { display: none; }
    .scene { position: relative; border-radius: 12px; overflow: hidden; background: #8fd0ff; box-shadow: 0 10px 30px rgba(0,0,0,.4), inset 0 0 0 1px rgba(255,255,255,.15); line-height: 0; }
    .scene canvas { width: 100%; height: auto; display: block; touch-action: none; cursor: grab; }
    .badge { position: absolute; left: 8px; top: 8px; font: 800 12px/1.2 "Baloo 2", system-ui, sans-serif; color: #fff; background: rgba(16,24,44,.72); padding: 6px 10px; border-radius: 999px; border: 1px solid rgba(255,255,255,.18); } .badge small { font-weight: 700; color: var(--dim); margin-left: 6px; }
    .nav { position: absolute; right: 8px; bottom: 8px; display: flex; gap: 5px; flex-wrap: wrap; justify-content: flex-end; max-width: 75%; }
    .nav button, .devbar button { font: 700 11px/1 "Baloo 2", system-ui, sans-serif; padding: 6px 9px; border: 1px solid rgba(255,255,255,.2); border-radius: 999px; background: rgba(16,24,44,.72); color: #fff; } .nav button:hover, .devbar button:hover { background: rgba(30,40,70,.9); }
    .hud { position: absolute; left: 8px; top: 8px; display: flex; align-items: center; gap: 7px; pointer-events: none; }
    .shield { width: 36px; height: 40px; background: linear-gradient(180deg, #5db2ff, #1f6fd1); clip-path: polygon(50% 0, 100% 15%, 92% 72%, 50% 100%, 8% 72%, 0 15%); display: flex; align-items: center; justify-content: center; font: 800 15px/1 "Baloo 2", system-ui, sans-serif; color: #fff; }
    .who { background: rgba(16,24,44,.72); border: 1px solid rgba(255,255,255,.18); border-radius: 10px; padding: 4px 9px 5px; min-width: 120px; } .who b { font: 800 12px/1.1 "Baloo 2", system-ui, sans-serif; color: #fff; display: block; } .who small { display: block; font-size: 10px; color: var(--dim); font-weight: 700; white-space: nowrap; }
    .say { background: #fff; color: #172033; border-radius: 12px; padding: 10px 12px; box-shadow: 0 8px 24px rgba(0,0,0,.35); font-size: 13.5px; line-height: 1.4; } .say b { font: 800 14px/1.2 "Baloo 2", system-ui, sans-serif; display: block; margin-bottom: 2px; color: #0f5fc6; }
    .cap { font-size: 12px; color: var(--dim); line-height: 1.45; } .cap b { color: var(--nww-text, #f2f5fb); }
    .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; } .tile { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 9px 11px; } .tile.wide { grid-column: 1 / -1; }
    .tile small { display: block; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--dim); } .tile b { font: 800 17px/1.1 "Baloo 2", system-ui, sans-serif; display: block; margin-top: 2px; color: var(--nww-text, #fff); } .tile span { font-size: 12px; color: var(--dim); }
    .barx { height: 7px; border-radius: 6px; background: rgba(0,0,0,.35); margin-top: 7px; overflow: hidden; } .barx i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #2c8fe8, var(--xp)); border-radius: 6px; }
    h3 { font: 800 14px/1.2 "Baloo 2", system-ui, sans-serif; margin: 4px 0 0; color: var(--nww-text, #fff); } h3 small { font: 600 12px/1 Nunito, system-ui, sans-serif; color: var(--dim); margin-left: 6px; }
    .list { display: flex; flex-direction: column; gap: 4px; }
    .row { display: grid; grid-template-columns: 28px 1fr auto; gap: 8px; align-items: center; padding: 6px 8px; background: rgba(0,0,0,.22); border: 1px solid var(--line); border-radius: 10px; } .row.full { border-color: rgba(124,240,164,.5); } .row.going { border-color: rgba(255,197,49,.45); }
    .row i { width: 28px; height: 28px; border-radius: 8px; background: var(--card); display: flex; align-items: center; justify-content: center; font-style: normal; font-size: 14px; }
    .row .n { min-width: 0; } .row .n b { display: block; font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .row .n small { display: block; font-size: 11px; color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row .n .barx { height: 4px; margin-top: 4px; } .row .v { text-align: right; font: 800 12px/1.2 "Baloo 2", system-ui, sans-serif; white-space: nowrap; } .row .v small { display: block; font: 600 10px/1.2 Nunito, system-ui, sans-serif; color: var(--dim); }
    .row button, .board button { grid-column: 1 / -1; font: 800 11px/1 "Baloo 2", system-ui, sans-serif; padding: 7px; border: 0; border-radius: 8px; background: rgba(127,127,127,.18); color: var(--nww-text, #f2f5fb); } .row button:hover, .board button:hover { background: rgba(255,255,255,.14); }
    .board { display: flex; flex-direction: column; gap: 6px; background: #c9a06a; color: #3a2a12; border-radius: 12px; padding: 10px 12px; box-shadow: inset 0 0 0 4px #b58a5a; } .board h3 { color: #3a2a12; } .board p { margin: 0; font-size: 12.5px; }
    .pin { background: #fff8e0; border-radius: 6px; padding: 8px 10px; display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; box-shadow: 0 2px 0 rgba(0,0,0,.15); } .pin b { display: block; font-size: 13px; } .pin small { display: block; font-size: 11.5px; color: #6b5a3a; }
    .pin button { grid-column: auto; background: var(--gold); color: var(--ink); } .pin button:hover { background: #ffd35a; }
    .btn { font: 700 13px/1.2 "Baloo 2", system-ui, sans-serif; padding: 10px; border: 0; border-radius: 11px; background: var(--card); color: var(--nww-text, #f2f5fb); box-shadow: inset 0 -3px 0 rgba(0,0,0,.35); } .btn:hover { filter: brightness(1.1); }
    .btn.go { color: var(--ink); background: linear-gradient(180deg, #ffe27a, var(--gold) 55%, #ff9d1c); box-shadow: inset 0 -4px 0 rgba(0,0,0,.18); } .btn:disabled { opacity: .45; cursor: default; }
    .steps { display: flex; flex-direction: column; } .step { display: grid; grid-template-columns: 30px 1fr; gap: 10px; align-items: center; padding: 5px 4px; } .step i { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; background: var(--card); border: 2px solid var(--line); font: 800 12px/1 "Baloo 2", system-ui, sans-serif; color: var(--dim); font-style: normal; }
    .step.done i { background: var(--ok); border-color: var(--ok); color: #fff; } .step.now i { border-color: var(--gold); color: var(--gold); } .step.done b { color: var(--dim); text-decoration: line-through; } .step b { font-size: 13px; font-weight: 700; }
    .card { background: #fff; color: #172033; border-radius: 12px; padding: 10px 12px; display: grid; grid-template-columns: 40px 1fr; gap: 10px; align-items: center; box-shadow: 0 10px 30px rgba(0,0,0,.4); } .card[hidden] { display: none; }
    .card .ic { width: 40px; height: 40px; border-radius: 10px; background: #eef2f8; display: flex; align-items: center; justify-content: center; font-size: 20px; } .card b { font: 800 13.5px/1.15 "Baloo 2", system-ui, sans-serif; display: block; } .card small { font-size: 12px; color: #5b6478; display: block; }
    .card .acts { grid-column: 1 / -1; display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } .card .acts button { font: 800 11.5px/1 "Baloo 2", system-ui, sans-serif; padding: 8px 4px; border: 0; border-radius: 10px; background: #eef2f8; color: #172033; } .card .acts button.up { background: linear-gradient(180deg, #8fe3a4, #47d16c); color: #0b3d1b; } .card .acts button:disabled { opacity: .45; }
    .devbar { display: flex; gap: 5px; flex-wrap: wrap; padding: 8px 12px; background: rgba(143,227,164,.1); border-bottom: 1px solid rgba(143,227,164,.3); } .devbar[hidden] { display: none; } .devbar span { font: 700 11px/2 "Baloo 2", system-ui, sans-serif; color: #8fe3a4; margin-right: 4px; }
    .about p { margin: 0; font-size: 13.5px; line-height: 1.5; } .about .tag { font: 800 22px/1.1 "Baloo 2", system-ui, sans-serif; color: #fff; } .about .mission { font-size: 15px; color: var(--gold); font-weight: 700; }
    .about a { color: var(--xp); font-weight: 700; text-decoration: none; } .about a:hover { text-decoration: underline; }
    .facts { display: grid; grid-template-columns: 1fr 1fr; gap: 6px; } .fact { background: var(--card); border-radius: 10px; padding: 8px 10px; } .fact b { font: 800 18px/1.1 "Baloo 2", system-ui, sans-serif; display: block; } .fact small { font-size: 11.5px; color: var(--dim); }
    .toast { position: absolute; right: 8px; top: 56px; font: 800 12.5px/1.25 "Baloo 2", system-ui, sans-serif; color: var(--ink); background: linear-gradient(180deg, #ffe27a, var(--gold)); padding: 7px 11px; border-radius: 10px; box-shadow: 0 6px 18px rgba(0,0,0,.35); opacity: 0; transform: translateY(-8px); transition: opacity .25s, transform .25s; pointer-events: none; } .toast.on { opacity: 1; transform: none; }
    .av { display: grid; grid-template-columns: 1fr; gap: 10px; } .av .opts { display: flex; flex-direction: column; gap: 8px; }
    .av .grp { display: flex; flex-wrap: wrap; gap: 6px; align-items: center; } .av .grp > span { font: 700 11px/1 "Baloo 2", system-ui, sans-serif; color: var(--dim); min-width: 52px; text-transform: uppercase; letter-spacing: .05em; }
    .av .grp button { font: 700 12px/1 "Baloo 2", system-ui, sans-serif; padding: 7px 10px; border: 1px solid var(--line); border-radius: 999px; background: var(--card); color: var(--nww-text, #f2f5fb); } .av .grp button[aria-pressed="true"] { background: var(--gold); color: var(--ink); border-color: transparent; }
    .av .sw { width: 26px; height: 26px; border-radius: 50%; border: 2px solid var(--line); padding: 0; } .av .sw[aria-pressed="true"] { border-color: var(--gold); box-shadow: 0 0 0 2px var(--gold); }
    .av input { font: inherit; padding: 8px 10px; border: 1px solid var(--line); border-radius: 10px; background: var(--card); color: var(--nww-text, #f2f5fb); min-width: 0; }
    .zoom { position: absolute; left: 8px; bottom: 8px; display: flex; gap: 4px; } .zoom button { width: 30px; height: 30px; font: 800 16px/1 "Baloo 2", system-ui, sans-serif; border: 1px solid rgba(255,255,255,.2); border-radius: 8px; background: rgba(16,24,44,.72); color: #fff; }
    .hud { border: 0; padding: 0; background: transparent; cursor: pointer; text-align: left; pointer-events: auto; } .hud:hover .who { border-color: var(--gold); }
    .dash { position: absolute; left: 8px; right: 8px; top: 56px; bottom: 46px; overflow: auto; background: var(--nww-canvas, #172033); color: var(--nww-text, #f2f5fb); border: 1px solid var(--line); border-radius: 12px; padding: 10px; display: flex; flex-direction: column; gap: 8px; line-height: 1.4; box-shadow: 0 10px 30px rgba(0,0,0,.4); } .dash[hidden] { display: none; }
    .prog { display: flex; flex-direction: column; gap: 4px; } .prog .barx { height: 12px; margin: 0; } .prog small { font-size: 11.5px; color: var(--dim); }
    .scene[hidden] { display: none; }
    @media (prefers-reduced-motion: reduce) { .toast { transition: none; } }
  `;

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const put = (parent, ...kids) => { kids.forEach(k => parent.appendChild(k)); return parent; };
  const camTo = (gx, gy, H) => ({ x: (gx - gy) * TW / 2, y: 60 + (gx + gy) * TH / 2 - H / 2 - 10 });

  function mount(root, host) {
    const state = S.normalise(host.load()); const save = () => host.save(state);
    const wrap = el('div', 'nww'); const style = el('style'); style.textContent = CSS; put(root, style, wrap);
    /* the extension's own theme, when the host has one */
    function theme(p) { if (!p) return; const v = { canvas: p.canvas, surface: p.surfaceAlt || p.surface, 'surface-alt': p.surface, 'tab-text': p.textPrimary, text: p.textPrimary, dim: p.textSecondary, line: p.border, accent: p.accent, 'accent-text': p.accentText, bar: p.surface }; Object.keys(v).forEach(k => { if (v[k]) wrap.style.setProperty('--nww-' + k, v[k]); }); }
    theme(host.palette && host.palette());
    /* bar */
    const bar = el('div', 'bar'); const brand = el('div', 'brand', 'Next'); brand.appendChild(el('span', null, 'World'));
    const mode = el('button', 'mode'); mode.type = 'button'; const tabs = el('div', 'tabs'); tabs.setAttribute('role', 'tablist');
    put(bar, brand, mode, tabs); wrap.appendChild(bar);
    const devbar = el('div', 'devbar'); devbar.hidden = true; wrap.appendChild(devbar);
    const views = {}, tabBtns = {};
    TABS.forEach(([id, name]) => { const b = el('button', null, name); b.type = 'button'; b.setAttribute('role', 'tab'); b.dataset.view = id; b.addEventListener('click', () => show(id)); tabs.appendChild(b); tabBtns[id] = b; const v = el('section', 'view'); v.hidden = true; views[id] = v; wrap.appendChild(v); });
    let current = 'world';
    function show(id) { current = id; TABS.forEach(([k]) => { tabBtns[k].setAttribute('aria-selected', String(k === id)); views[k].hidden = k !== id; }); if (id === 'build') paintBuild(); if (id === 'base') paintBoard(); host.remember && host.remember('tab', id); }
    function scene(w, h, label) { const sc = el('div', 'scene'); const cv = el('canvas'); cv.width = w; cv.height = h; cv.tabIndex = 0; cv.setAttribute('aria-label', label); sc.appendChild(cv); return { sc, cv }; }
    /* zoom: the wheel, and two buttons, on every scene */
    function zoomer(sc, cv, onZoom) { const z = el('div', 'zoom'); const zin = el('button', null, '+'); zin.type = 'button'; zin.setAttribute('aria-label', 'Zoom in'); const zout = el('button', null, '−'); zout.type = 'button'; zout.setAttribute('aria-label', 'Zoom out'); zin.addEventListener('click', () => onZoom(1.25)); zout.addEventListener('click', () => onZoom(0.8)); put(z, zin, zout); sc.appendChild(z); cv.addEventListener('wheel', e => { e.preventDefault(); onZoom(e.deltaY < 0 ? 1.12 : 0.9); }, { passive: false }); }
    function drag(cv, I, onTap, onDrag) { let d = null; cv.addEventListener('pointerdown', e => { d = { x: e.clientX, y: e.clientY, cx: I.cam.x, cy: I.cam.y, moved: false }; cv.setPointerCapture(e.pointerId); }); cv.addEventListener('pointermove', e => { if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.hypot(dx, dy) > 4) d.moved = true; if (d.moved) { const r = cv.getBoundingClientRect(); I.cam.x = d.cx - dx * I.W / r.width; I.cam.y = d.cy - dy * I.H / r.height; if (onDrag) onDrag(); } }); cv.addEventListener('pointerup', e => { const was = d; d = null; if (!was || was.moved) return; const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) * I.W / r.width + I.cam.x - I.W / 2, y = (e.clientY - r.top) * I.H / r.height + I.cam.y - 60; onTap([(x / (TW / 2) + y / (TH / 2)) / 2, (y / (TH / 2) - x / (TW / 2)) / 2], [x + I.W / 2 - I.cam.x, y + 60 - I.cam.y]); }); }
    function sayer(parent) { const s = el('div', 'say'); const b = el('b'); const t = document.createTextNode(''); put(s, b, t); parent.appendChild(s); return (title, body) => { b.textContent = title; t.textContent = body; }; }
    function toast(sc) { const t = el('div', 'toast'); sc.appendChild(t); let timer = null; return text => { t.textContent = text; t.classList.add('on'); clearTimeout(timer); timer = setTimeout(() => t.classList.remove('on'), 2800); }; }
    function nav(sc, items) { const n = el('div', 'nav'); items.forEach(([t, fn]) => { const b = el('button', null, t); b.type = 'button'; b.addEventListener('click', fn); n.appendChild(b); }); sc.appendChild(n); return n; }

    /* ---- 1. NextWork World: the campus ---- */
    const w1 = scene(880, 620, 'NextWork World: NextWork Headquarters in Austin, and the learners’ plots round it. Tap your plot to enter your world. Drag to look, wheel to zoom.');
    const world = makeIso(w1.cv, 880 / (2 * 0.5), 620 / (2 * 0.5), 0.5); const wc = camTo(HQ.C[0], HQ.C[1] + 1, world.H); world.cam.x = wc.x; world.cam.y = wc.y;
    const wbadge = el('div', 'badge', 'NextWork World'); wbadge.appendChild(el('small', null, 'Austin, Texas')); w1.sc.appendChild(wbadge);
    const aimW = (gx, gy) => { const c = camTo(gx, gy, world.H); world.cam.x = c.x; world.cam.y = c.y; };
    nav(w1.sc, [['Headquarters', () => aimW(HQ.HALL[0] + 3, HQ.HALL[1] + 2)], ['The quad', () => aimW(HQ.C[0], HQ.C[1] + 1)], ['My plot', () => aimW(HQ.PLOTS[HQ.MINE][0], HQ.PLOTS[HQ.MINE][1])], ['Whole ranch', () => { world.setScale(0.24); aimW(HQ.C[0], HQ.C[1]); }]]);
    zoomer(w1.sc, w1.cv, f => world.zoom(f));
    views.world.appendChild(w1.sc); const wsay = sayer(views.world);
    wsay('NextWork World', 'NextWork Headquarters, Austin, Texas: a fenced ranch campus. The headquarters hall at the top of the quad, the NextWork Cafe, eight hubs with their names on them, the lake, the paddock, and the eight of them in black T-shirts going about their day. The plots outside the fence are learners. Yours is named. Tap it to go home.');
    views.world.appendChild(el('div', 'cap', 'Paved paths on campus, dirt roads out through the gates. Tap a hub for its roadmap, a staff member for a word, an open slot to see how a world begins. Drag to look, wheel or +/− to zoom.'));
    drag(w1.cv, world, g => { const h = HQ.hitHQ(state, g);
      if (h.kind === 'hall') { wsay('NextWork Headquarters', ABOUT.tagline + '. ' + ABOUT.mission + ' Austin, Texas.'); return; }
      if (h.kind === 'quad') { wsay('The quad', 'The lawn in the middle of campus. Benches round it, and somebody on most of them with a laptop open.'); return; }
      if (h.kind === 'cafe') { wsay('NextWork Cafe', 'Where people ask questions. In the real thing, the chat is on every project page.'); return; }
      if (h.kind === 'hub') { const n = SERIES.filter(sr => sr.kind === h.hub.kind).reduce((a, sr) => a + S.doneIn(state, sr), 0); wsay(h.hub.name + ' hub', h.hub.sub + '. You have built ' + n + ' here. Every ' + KIND_NAME[h.hub.kind].toLowerCase() + ' on your land came from this hub.'); return; }
      if (h.kind === 'plot' && h.owner.mine) { show('base'); return; }
      if (h.kind === 'plot' && h.owner.built) { wsay(h.owner.name, h.owner.built + ' built. When they share their portfolio you can walk it. Not yet: this is about you.'); return; }
      if (h.kind === 'plot') { wsay('Open slot', 'A new learner picks a slot, names it, and it does not touch anyone else’s. Their world opens with a tent, a board, and one oak.'); return; }
      if (h.kind === 'staff') { wsay(h.staff.name, h.staff.says); return; }
      if (h.kind === 'paddock') { wsay('The paddock', 'They belong to no one. Like the free tier.'); return; }
      if (h.kind === 'lake') { wsay('The lake', 'Ripples.'); return; }
      if (h.kind === 'outside') { wsay('Outside the fence', 'Open ground between the ranch and the plots.'); return; }
      wsay('The ranch', 'Inside the fence. Everything here has a path to it.'); });

    /* ---- 2. My World ---- */
    const me = Land.makeMe(state); let anim = null; const fx = []; let lastL = S.layout(state); let placing = null;
    const b1 = scene(880, 620, 'Your land. Tap where you want to go and you take the roads there; arrow keys walk too. Tap a building for its project. Drag to look, wheel to zoom.');
    const base = makeIso(b1.cv, 440, 310); Object.assign(base.cam, camTo(me.gx, me.gy, 310));
    const hud = el('button', 'hud'); hud.type = 'button'; hud.title = 'Where you are and what to do next'; const shield = el('div', 'shield', '1'); const who = el('div', 'who'); const whoB = el('b', null, S.landName(state)); const whoS = el('small', null, ''); put(who, whoB, whoS); put(hud, shield, who); b1.sc.appendChild(hud);
    nav(b1.sc, [['Home', () => { Land.goTo(me, lastL.paths, [S.HOME[0] + 0.5, S.HOME[1] + 2.5]); me.follow = true; }], ['World', () => show('world')], ['Build', () => show('build')]]);
    zoomer(b1.sc, b1.cv, f => base.zoom(f));
    const btoast = toast(b1.sc); views.base.appendChild(b1.sc);
    /* the dashboard panel: tap the shield */
    const dash = el('div', 'dash'); dash.hidden = true; const dashT = el('h3'); const dashList = el('div', 'list'); const dashClose = el('button', 'btn', 'Close'); dashClose.type = 'button'; dashClose.addEventListener('click', () => { dash.hidden = true; }); put(dash, dashT, dashList, dashClose); b1.sc.appendChild(dash);
    function paintDash() { const w = S.houseWord(state), nw = S.nextHouseWord(state), nx = S.nextProject(state); dashT.textContent = S.landName(state) + ' · ' + w[1].toLowerCase() + ' · ' + state.done.length + ' built'; while (dashList.firstChild) dashList.removeChild(dashList.firstChild);
      const step = (n, t, sub, fn) => { const row = el('div', 'row' + (fn ? ' going' : '')); const nn = el('div', 'n'); put(nn, el('b', null, t), el('small', null, sub)); put(row, el('i', null, String(n)), nn, el('div', 'v', '')); if (fn) { const b = el('button', null, 'Go'); b.type = 'button'; b.addEventListener('click', fn); row.appendChild(b); } dashList.appendChild(row); };
      if (nx) { const placed = !!state.sites[nx.title]; step(1, placed ? 'Building: ' + nx.title : 'Next: ' + nx.title, placed ? 'It has its spot. Open the project and tick the steps; it goes up as you go.' : 'Pick where it goes on your land, then open it.', () => { dash.hidden = true; if (placed) show('build'); else startPlacing(nx.title); }); }
      step(2, 'Walk the roads', 'Tap anywhere and you take the roads there. Arrow keys walk too.'); step(3, nw ? (nw[0] - state.done.length) + ' more to a ' + nw[1].toLowerCase() : 'The whole valley', 'The ranch house grows with what you finish.'); if (state.lists.length) step(4, state.lists.length + ' learn lists over the creek', 'Your own projects, each list a spread of its own.'); }
    hud.addEventListener('click', () => { paintDash(); dash.hidden = !dash.hidden; });
    const card = el('div', 'card'); card.hidden = true; const cIc = el('div', 'ic'); const cT = el('div'); const cB = el('b'); const cS = el('small'); put(cT, cB, cS); const acts = el('div', 'acts'); const cOpen = el('button', null, 'Open project'); cOpen.type = 'button'; const cNext = el('button', 'up', 'Next part'); cNext.type = 'button'; put(acts, cOpen, cNext); put(card, cIc, cT, acts); views.base.appendChild(card);
    const bsay = sayer(views.base); const board = el('div', 'board'); views.base.appendChild(board);
    views.base.appendChild(el('div', 'cap', 'Spreads are series. A windmill once a spread has two buildings, a fence once it is whole, oaks where nothing is built yet. Over the creek, your learn lists. Every building gets a road; you walk the roads. Tap the shield for what to do next.'));
    function startPlacing(title) { placing = title; show('base'); bsay('Where do you want this?', 'Tap a spot on your land for ' + title + '. A lane will be laid to it. Tap the shield to cancel.'); btoast('Where do you want this?'); }
    function paintBoard() {
      while (board.firstChild) board.removeChild(board.firstChild);
      const empty = state.done.length === 0; board.appendChild(el('h3', null, empty ? 'Start here' : 'Next on the board'));
      board.appendChild(el('p', null, empty ? 'Pick one. The land fills in as you go.' : 'Where you left off, and one or two worth a look.'));
      const picks = []; const nx = S.nextProject(state); if (nx && !empty) picks.push([nx.title, nx.series.id, 'Part ' + (S.doneIn(state, nx.series) + 1) + ' of ' + nx.series.projects.length + ' in ' + nx.series.name + '.']);
      START_HERE.forEach(p => { if (picks.length < 5 && !state.done.includes(p[0]) && !picks.some(x => x[0] === p[0])) picks.push(p); });
      picks.forEach(p => { const sr = SERIES.find(x => x.id === p[1]); const pin = el('div', 'pin'); const t = el('div'); put(t, el('b', null, p[0]), el('small', null, p[2])); const b = el('button', null, state.sites[p[0]] ? 'Open' : 'Place it'); b.type = 'button'; b.addEventListener('click', () => { if (state.sites[p[0]]) host.openProject(p[0], sr); else startPlacing(p[0]); }); put(pin, t, b); board.appendChild(pin); });
      if (!picks.length) board.appendChild(el('p', null, 'Every project is built. The land is yours.'));
    }
    function showCard(b) { card.hidden = false; cIc.textContent = ICON[b.kind]; cB.textContent = b.series ? b.title : b.list.name; cS.textContent = b.series ? b.series.name + ' · part ' + b.part + ' of ' + b.of + ' · ' + KIND_NAME[b.kind] : 'Learn list · project ' + b.part + ' of ' + b.of + ' · ' + KIND_NAME[b.kind]; const nxt = b.series ? b.series.projects.find(pr => !state.done.includes(pr[0])) : null; cNext.disabled = !nxt; cNext.textContent = nxt ? 'Next: ' + nxt[0] : b.series ? 'Series complete' : 'Yours'; cNext.onclick = () => { if (nxt) { if (state.sites[nxt[0]]) host.openProject(nxt[0], b.series); else startPlacing(nxt[0]); } }; cOpen.onclick = () => host.openProject(b.series ? b.title : b.list.name, b.series); Land.goTo(me, lastL.paths, [b.gx + 0.5, b.gy + 1.4]); me.follow = true; bsay(b.series ? b.title : b.list.name, (b.series ? 'Tier ' + b.tier + ' ' : '') + KIND_NAME[b.kind].toLowerCase() + ' on the ' + (b.series ? b.series.name : b.list.name) + ' spread.'); }
    drag(b1.cv, base, g => { const L = lastL;
      if (placing) { const gx = Math.floor(g[0]), gy = Math.floor(g[1]); if (gx < 1 || gy < 1 || gx > S.LAND - 2 || gy > S.LAND - 2 || S.inCreek(gx, gy) || S.onBank(gx, gy) || L.paths.has(gx + ',' + gy) || L.buildings.some(b => Math.abs(b.gx - gx) < 1.5 && Math.abs(b.gy - gy) < 1.5) || (Math.abs(gx - S.HOME[0]) < 3 && Math.abs(gy - S.HOME[1]) < 3)) { bsay('Not there', 'Clear ground, off the road and away from the creek.'); return; } state.sites[placing] = [gx, gy]; state.building = placing; if (state.mode === 'dev' && !state.steps[placing]) state.steps[placing] = { done: 0, total: 7 }; const t = placing; placing = null; save(); lastL = S.layout(state); btoast('Site pegged out'); bsay('Pegged out', t + ' goes here. Open the project and it goes up as you tick the steps.'); paintBoard(); paintBuild(); show('build'); return; }
      const hit = Land.hit(L, g); if (hit) { showCard(hit); return; } card.hidden = true;
      if (Math.abs(g[0] - S.HOME[0]) < 1.6 && Math.abs(g[1] - S.HOME[1]) < 1.6) { const w = S.houseWord(state), n = S.nextHouseWord(state); bsay('The ' + w[1].toLowerCase() + ' · ' + S.landName(state), n ? (n[0] - state.done.length) + ' more and it is a ' + n[1].toLowerCase() + '.' : 'The whole valley.'); Land.goTo(me, L.paths, [S.HOME[0] + 0.5, S.HOME[1] + 2.5]); me.follow = true; return; }
      if (g[0] >= 0 && g[1] >= 0 && g[0] < S.LAND && g[1] < S.LAND) { if (Land.goTo(me, L.paths, g)) { me.follow = true; bsay('On my way', Land.onRoad(L.paths, g[0], g[1]) ? 'By road.' : 'By road, to the nearest bit of it.'); } else bsay('No road there', 'Roads reach everything that is built.'); } }, () => { me.follow = false; });
    b1.cv.addEventListener('keydown', e => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) { me.keys[e.key] = true; e.preventDefault(); } });
    b1.cv.addEventListener('keyup', e => { delete me.keys[e.key]; }); b1.cv.addEventListener('blur', () => { me.keys = {}; });
    bsay(S.landName(state), state.done.length ? 'Every finished project is a building on its series’ spread, and a road reaches every one. Tap where you want to go, or hold an arrow key.' : 'A tent, a board, one oak, and the road in. Pick a project on the board, choose where it goes, and the first cabin goes up.');
    function finish(title, sr) { S.finish(state, title); save(); lastL = S.layout(state); const b = lastL.buildings.find(x => x.title === title); anim = { title, start: performance.now() }; btoast('Built: ' + title); bsay(title, KIND_NAME[sr.kind] + ' on the ' + sr.name + ' spread.' + (S.doneIn(state, sr) === sr.projects.length ? ' The spread is fenced: series complete.' : '')); if (b) { fx.push({ type: 'sparkle', gx: b.gx + 0.5, gy: b.gy + 0.5, seed: Math.random() * 6, start: performance.now() + 1500, life: 900 }); Land.goTo(me, lastL.paths, [b.gx + 0.5, b.gy + 1.6]); me.follow = true; } paintBoard(); paintBuild(); paintDev(); }

    /* ---- 3. Avatar: build yourself ---- */
    const av = state.avatar; const a1 = scene(880, 400, 'Your avatar, walking'); const avI = makeIso(a1.cv, 440, 200); const avc = camTo(2, 2, 200); avI.cam.x = avc.x; avI.cam.y = avc.y + 10;
    const avWrap = el('div', 'av'); avWrap.appendChild(a1.sc); const opts = el('div', 'opts'); avWrap.appendChild(opts); views.avatar.appendChild(avWrap);
    const field = (label, id, value, onChange) => { const row = el('div', 'grp'); const inp = el('input'); inp.id = id; inp.type = 'text'; inp.maxLength = 28; inp.value = value; inp.setAttribute('aria-label', label); inp.addEventListener('change', () => onChange(inp.value.trim())); put(row, el('span', null, label), inp); opts.appendChild(row); };
    field('Name', 'nww-name', state.name, v => { state.name = v || 'You'; save(); whoB.textContent = S.landName(state); });
    field('Your land', 'nww-land', state.land, v => { state.land = v; save(); whoB.textContent = S.landName(state); });
    function choices(label, k, list, swatch) { const g = el('div', 'grp'); g.appendChild(el('span', null, label)); const paint = () => g.querySelectorAll('button').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.v === av[k]))); list.forEach(([v, t]) => { const b = el('button', swatch ? 'sw' : null, swatch ? '' : t); b.type = 'button'; b.dataset.v = v; if (swatch) { b.style.background = v; b.title = t; b.setAttribute('aria-label', t); } b.addEventListener('click', () => { av[k] = v; save(); paint(); }); g.appendChild(b); }); paint(); opts.appendChild(g); }
    choices('Body', 'body', [['pineapple', 'Pineapple'], ['person', 'Person']]);
    choices('Shirt', 'shirt', [['#2f7fd6', 'Blue'], ['#e8552f', 'Red'], ['#3fa66b', 'Green'], ['#f2b42a', 'Gold'], ['#8f5fd1', 'Purple'], ['#1c1f26', 'Black'], ['#f4f1e8', 'White']], true);
    choices('Hat', 'hat', [['none', 'None'], ['cowboy', 'Cowboy'], ['cap', 'Cap'], ['hard', 'Hard hat'], ['beanie', 'Beanie']]);
    choices('Hat colour', 'hatColour', [['#8a5a3a', 'Tan'], ['#1c1f26', 'Black'], ['#ffc531', 'Yellow'], ['#e8552f', 'Red'], ['#2f7fd6', 'Blue']], true);
    choices('Skin', 'skin', [['#ffd6ad', 'Light'], ['#e8b48a', 'Medium'], ['#b87a4b', 'Tan'], ['#7a4b2a', 'Deep'], ['#4a2e1a', 'Dark']], true);
    choices('Hair', 'hair', [['#4a2e1a', 'Brown'], ['#1c1f26', 'Black'], ['#d9b24c', 'Blond'], ['#b03a2e', 'Red'], ['#9aa3b0', 'Grey']], true);
    views.avatar.appendChild(el('div', 'cap', 'The pineapple is the house avatar. Whatever you build here walks your land, on the roads. Your land’s name is on the world map and over your ranch house.'));

    /* ---- 4. My Build ---- */
    const bt = el('div', 'tiles'); const tWhere = el('div', 'tile wide'); const tWb = el('b'); const tWs = el('span'); const tWbar = el('div', 'barx'); const tWi = el('i'); tWbar.appendChild(tWi); put(tWhere, el('small', null, 'Where you are'), tWb, tWs, tWbar);
    const tDone = el('div', 'tile'); const tDb = el('b'); put(tDone, el('small', null, 'Built'), tDb, el('span', null, 'of 90 NextWork projects'));
    const tLib = el('div', 'tile'); const tLb = el('b'); const tLs = el('span'); put(tLib, el('small', null, 'Library'), tLb, tLs); put(bt, tWhere, tDone, tLib); views.build.appendChild(bt);
    const pName = el('h3'); const pSub = el('div', 'cap'); put(views.build, pName, pSub);
    const prog = el('div', 'prog'); const progBar = el('div', 'barx'); const progI = el('i'); progBar.appendChild(progI); const progT = el('small'); put(prog, progBar, progT); views.build.appendChild(prog);
    const s1 = scene(880, 500, 'The building site. Tap the nails as they pop up to hammer them in.'); const site = makeIso(s1.cv, 440, 250); const sbadge = el('div', 'badge', ''); s1.sc.appendChild(sbadge); zoomer(s1.sc, s1.cv, f => site.zoom(f)); views.build.appendChild(s1.sc);
    const game = { nails: [], hit: 0, last: 0 };
    drag(s1.cv, site, (g, lg) => { const n = game.nails.find(x => !x.done && Math.hypot(x.sx - lg[0], x.sy - lg[1]) < 26); if (n) { n.done = true; n.at = performance.now(); game.hit++; const cs = current_site ? (state.craft[current_site.title] = (state.craft[current_site.title] || 0) + 1) : 0; if (state.mode === 'dev' && current_site && cs % 5 === 0) tickStep(); paintBuild(); } });
    const placeBtn = el('button', 'btn go', 'Where do you want this?'); placeBtn.type = 'button'; views.build.appendChild(placeBtn);
    const steps = el('div', 'steps'); views.build.appendChild(steps);
    const openBtn = el('button', 'btn go', 'Open the project'); openBtn.type = 'button'; views.build.appendChild(openBtn);
    const stepBtn = el('button', 'btn', 'Complete the next step'); stepBtn.type = 'button'; views.build.appendChild(stepBtn);
    views.build.appendChild(el('h3', null, 'The catalogue')); const catList = el('div', 'list'); views.build.appendChild(catList);
    views.build.appendChild(el('h3', null, 'Your library')); const libList = el('div', 'list'); views.build.appendChild(libList);
    views.build.appendChild(el('div', 'cap', 'Pick a project, choose where it goes, open it. Steps are read from the project page as you tick them; the frame, walls and roof go up with them. While it builds, hammer the nails that pop up: every five is a little trim.'));
    let current_site = null; const bs = { lastAt: -9000 };
    function stepsOf(title) { const st = state.steps[title]; return st ? { done: st.done, total: st.total } : { done: 0, total: 7 }; }
    function tickStep() { if (!current_site) return; const st = stepsOf(current_site.title); if (st.done >= st.total) return; state.steps[current_site.title] = { done: st.done + 1, total: st.total }; bs.lastAt = performance.now(); save(); if (st.done + 1 >= st.total) { const t = current_site.title, sr = current_site.series; setTimeout(() => finish(t, sr), 900); } paintBuild(); }
    function paintBuild() {
      const w = S.houseWord(state), nw = S.nextHouseWord(state);
      tWb.textContent = w[1] + ' · ' + state.done.length + ' built'; tWs.textContent = nw ? (nw[0] - state.done.length) + ' more to ' + nw[1].toLowerCase() : 'The whole valley'; tWi.style.width = (nw ? (state.done.length - w[0]) / (nw[0] - w[0]) * 100 : 100) + '%';
      tDb.textContent = state.done.length + ' / 90'; const lt = state.lists.reduce((a, l) => a + l.total, 0); tLb.textContent = state.lists.length + (state.lists.length === 1 ? ' list' : ' lists'); tLs.textContent = lt + ' projects of your own';
      const nx = S.nextProject(state); current_site = nx ? Land.siteFor(state) : null; const placed = nx && !!state.sites[nx.title]; const st = current_site ? stepsOf(current_site.title) : { done: 0, total: 0 };
      pName.textContent = nx ? nx.title : 'Every project is built'; pSub.textContent = nx ? nx.series.name + ' · part ' + (S.doneIn(state, nx.series) + 1) + ' of ' + nx.series.projects.length + ' · becomes a ' + KIND_NAME[nx.series.kind].toLowerCase() + (placed ? '' : ' · not placed yet') : '';
      progI.style.width = (st.total ? st.done / st.total * 100 : 0) + '%'; progT.textContent = st.total ? st.done + ' of ' + st.total + ' steps · ' + (state.craft[nx && nx.title] || 0) + ' nails' : 'No steps yet';
      placeBtn.hidden = !nx || placed; placeBtn.onclick = () => nx && startPlacing(nx.title);
      s1.sc.hidden = !placed; if (current_site) { const c = camTo(current_site.gx + 0.5, current_site.gy + 0.5, site.H); site.cam.x = c.x; site.cam.y = c.y + 20; }
      while (steps.firstChild) steps.removeChild(steps.firstChild);
      const names = state.mode === 'dev' && !state.steps[nx && nx.title] ? ['Set up', 'Build it', 'Connect it', 'Test it', 'Secure it', 'Document it', 'Clean up'] : null;
      for (let i = 0; i < st.total; i++) { const d = el('div', 'step' + (i < st.done ? ' done' : i === st.done ? ' now' : '')); put(d, el('i', null, i < st.done ? '✓' : String(i + 1)), el('b', null, names ? names[i] || 'Step ' + (i + 1) : 'Step ' + (i + 1))); steps.appendChild(d); }
      if (!st.total && placed) steps.appendChild(el('div', 'cap', state.mode === 'dev' ? 'No steps yet.' : 'Open the project and the steps appear here as you tick them.'));
      stepBtn.hidden = state.mode !== 'dev' || !placed; stepBtn.disabled = !current_site || st.done >= st.total; stepBtn.textContent = st.done >= st.total && st.total ? 'All steps done' : 'Complete step ' + (st.done + 1) + ' of ' + st.total;
      openBtn.hidden = !placed; openBtn.disabled = !current_site; openBtn.onclick = () => current_site && host.openProject(current_site.title, current_site.series);
      while (catList.firstChild) catList.removeChild(catList.firstChild);
      SERIES.forEach(sr => { const d = S.doneIn(state, sr), n = sr.projects.length; const row = el('div', 'row' + (d === n ? ' full' : d ? ' going' : '')); const nn = el('div', 'n'); const barx = el('div', 'barx'); const bi = el('i'); bi.style.width = (d / n * 100) + '%'; barx.appendChild(bi); put(nn, el('b', null, sr.name), el('small', null, KIND_NAME[sr.kind] + (d ? ' · tier ' + S.tierIn(state, sr) : ' · not started')), barx); const v = el('div', 'v', d + ' / ' + n); put(row, el('i', null, ICON[sr.kind]), nn, v); const nxt = sr.projects.find(pr => !state.done.includes(pr[0])); if (nxt) { const b = el('button', null, (d ? 'Next: ' : 'Start: ') + nxt[0]); b.type = 'button'; b.addEventListener('click', () => { if (state.sites[nxt[0]]) { state.building = nxt[0]; save(); paintBuild(); } else startPlacing(nxt[0]); }); row.appendChild(b); } catList.appendChild(row); });
      while (libList.firstChild) libList.removeChild(libList.firstChild);
      if (!state.lists.length) libList.appendChild(el('div', 'cap', state.mode === 'dev' ? 'No learn lists in this seed.' : 'Open your portfolio on nextwork.ai and your learn lists appear here, each as a spread over the creek.'));
      state.lists.forEach(l => { const row = el('div', 'row full'); const nn = el('div', 'n'); put(nn, el('b', null, l.name), el('small', null, l.blurb || KIND_NAME[l.kind] + ' spread')); const v = el('div', 'v', String(l.total)); v.appendChild(el('small', null, KIND_NAME[l.kind].toLowerCase() + ' spread')); put(row, el('i', null, '🌉'), nn, v); libList.appendChild(row); });
    }
    stepBtn.addEventListener('click', tickStep);

    /* ---- 5. NextWork Global: the globe ---- */
    const g1 = scene(880, 620, 'NextWork Global: the globe, with NextWork in Austin and learners as plots of land. Drag to spin it, wheel to zoom.'); const gctx = g1.cv.getContext('2d');
    const gview = { yaw: -97, pitch: 25, spin: true, zoom: 1 }; let ghits = [];
    const gbadge = el('div', 'badge', 'NextWork Global'); const gsmall = el('small'); gbadge.appendChild(gsmall); g1.sc.appendChild(gbadge); views.global.appendChild(g1.sc);
    nav(g1.sc, [['Austin', () => { gview.yaw = -97; gview.pitch = 30; gview.spin = false; }], ['Europe', () => { gview.yaw = 15; gview.pitch = 50; gview.spin = false; }], ['Africa', () => { gview.yaw = 20; gview.pitch = 5; gview.spin = false; }], ['Asia', () => { gview.yaw = 90; gview.pitch = 30; gview.spin = false; }], ['Spin', () => { gview.spin = !gview.spin; }]]);
    zoomer(g1.sc, g1.cv, f => { gview.zoom = clamp(gview.zoom * f, 0.6, 3); });
    const gsay = sayer(views.global); gsay('NextWork Global', 'The whole globe. NextWork is in Austin, Texas; every learner is a plot of land somewhere on it.'); views.global.appendChild(el('div', 'cap', 'Drag to spin, wheel to zoom. Each plot is how many are building there. The extension cannot know this on its own; it needs a count NextWork publishes, so production says so until then.'));
    let gdrag = null;
    g1.cv.addEventListener('pointerdown', e => { gdrag = { x: e.clientX, y: e.clientY, yaw: gview.yaw, pitch: gview.pitch, moved: false }; g1.cv.setPointerCapture(e.pointerId); });
    g1.cv.addEventListener('pointermove', e => { if (!gdrag) return; const dx = e.clientX - gdrag.x, dy = e.clientY - gdrag.y; if (Math.hypot(dx, dy) > 4) { gdrag.moved = true; gview.spin = false; } if (gdrag.moved) { const r = g1.cv.getBoundingClientRect(); gview.yaw = gdrag.yaw + dx / r.width * 240 / gview.zoom; gview.pitch = clamp(gdrag.pitch + dy / r.height * 160 / gview.zoom, -80, 80); } });
    g1.cv.addEventListener('pointerup', e => { const was = gdrag; gdrag = null; if (!was || was.moved) return; const r = g1.cv.getBoundingClientRect(); const x = (e.clientX - r.left) * 880 / r.width, y = (e.clientY - r.top) * 620 / r.height; const hit = ghits.find(h => Math.hypot(h.x - x, h.y - y) < h.r + 4); if (!hit) { gsay('Open water', 'Drag to spin the globe.'); return; } if (hit.hq) { gsay('NextWork · Austin, Texas', 'Home of the campus. Tap the headquarters on the world map.'); return; } gsay(hit.d[0], hit.d[3] + ' learners building. Sample numbers: the real count needs NextWork to publish it.'); });

    /* ---- mode, dev controls ---- */
    function paintMode() { mode.textContent = state.mode === 'dev' ? 'Dev · simulate and reset' : 'Production · real data only'; mode.dataset.on = state.mode; devbar.hidden = state.mode !== 'dev'; }
    mode.addEventListener('click', () => { state.mode = state.mode === 'dev' ? 'prod' : 'dev'; if (state.mode === 'prod' && host.production) { const p = S.normalise(host.production()); state.done = p.done; state.lists = p.lists; state.steps = p.steps; state.name = p.name; } save(); lastL = S.layout(state); paintMode(); paintDev(); paintBuild(); paintBoard(); });
    function paintDev() { while (devbar.firstChild) devbar.removeChild(devbar.firstChild); devbar.appendChild(el('span', null, 'Seed'));
      [[0, 'Empty'], [5, '5 built'], [50, '50 built'], [90, 'All 90']].forEach(([n, t]) => { const b = el('button', null, t); b.type = 'button'; b.addEventListener('click', () => { S.seed(state, n, state.name === 'You' ? 'Roy' : state.name); save(); anim = null; lastL = S.layout(state); whoB.textContent = S.landName(state); paintBuild(); paintBoard(); paintDev(); bsay('Seeded', t + '.'); }); devbar.appendChild(b); });
      const nx = S.nextProject(state); const f = el('button', null, nx ? 'Finish: ' + nx.title : 'Nothing left'); f.type = 'button'; f.disabled = !nx; f.addEventListener('click', () => nx && finish(nx.title, nx.series)); devbar.appendChild(f);
      const r = el('button', null, 'Reset'); r.type = 'button'; r.addEventListener('click', () => { const m = state.mode, a = state.avatar; Object.assign(state, S.fresh()); state.mode = m; state.avatar = a; save(); lastL = S.layout(state); whoB.textContent = S.landName(state); paintBuild(); paintBoard(); paintDev(); bsay('Reset', 'A tent, a board, and one oak.'); }); devbar.appendChild(r); }

    /* ---- the loop: draw only what is showing ---- */
    let running = true;
    function frame(now) {
      if (!running) return;
      if (current === 'world') { world.ctx.setTransform(1, 0, 0, 1, 0, 0); Land.sky({ ctx: world.ctx, W: 880, H: 620 }); world.reset(); HQ.drawHQ(world, state, now, {}); }
      else if (current === 'avatar') { Land.sky(avI); for (let y = 0; y < 5; y++) for (let x = 0; x < 5; x++) avI.tile(x, y, y === 2 ? '#c8a877' : Land.groundColour(x + 30, y + 30), y === 2 ? 'rgba(110,75,30,.35)' : null); B.oak(avI, 4, 0, 0.9); B.hay(avI, 0, 4); const t = (now / 2600) % 1; B.avatar(avI, 0.5 + t * 4, 2.5, av, now / 1000, true); }
      else if (current === 'base') { Land.stepMe(me, lastL.paths); if (me.follow) { const c = camTo(me.gx, me.gy, base.H); base.cam.x = lerp(base.cam.x, c.x, reduce ? 1 : 0.08); base.cam.y = lerp(base.cam.y, c.y, reduce ? 1 : 0.08); } Land.sky(base); Land.drawLand(base, state, me, now, { anim, fx, placing, land: S.landName(state) }); const w = S.houseWord(state); shield.textContent = String(NW.TIERS.indexOf(NW.tierOf(S.xpOf(state))) + 1); whoS.textContent = w[1] + ' · ' + state.done.length + ' built · ' + state.lists.length + ' lists'; if (anim && now - anim.start > 1700) anim = null; while (fx.length && now - fx[0].start > fx[0].life) fx.shift(); if (!reduce && me.moving) { state.me = { gx: me.gx, gy: me.gy }; } lastL = S.layout(state); }
      else if (current === 'build') { Land.sky(site); const st = current_site ? stepsOf(current_site.title) : { done: 0, total: 0 }; const o = { site: current_site, stepsDone: st.done, stepsTotal: st.total, k: reduce ? 1 : clamp((now - bs.lastAt) / 900, 0, 1), anim }; Land.drawLand(site, state, null, now, o); sbadge.textContent = o.stage ? o.stage + ' · ' + st.done + ' of ' + st.total : '';
        /* the nail game: while something is going up, nails pop up round the site; tap them */
        if (current_site && st.done > 0 && st.done < st.total && !reduce) { if (now - game.last > 1400 && game.nails.filter(n => !n.done).length < 4) { game.last = now; const slot = [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9], [0.5, 0.1], [0.5, 0.9]][Math.floor(Math.random() * 6)]; game.nails.push({ gx: current_site.gx + slot[0], gy: current_site.gy + slot[1], z: 36, born: now, done: false }); } game.nails = game.nails.filter(n => n.done ? now - n.at < 500 : now - n.born < 7000); game.nails.forEach(n => { const q = site.p(n.gx, n.gy, n.z); n.sx = q[0]; n.sy = q[1]; }); game.nails.forEach(n => { const ctx = site.ctx; if (n.done) { const t = (now - n.at) / 500; ctx.globalAlpha = 1 - t; ctx.font = '800 12px Baloo 2, system-ui, sans-serif'; ctx.fillStyle = '#ffc531'; ctx.textAlign = 'center'; ctx.fillText('+1', n.sx, n.sy - 10 - t * 16); ctx.textAlign = 'left'; ctx.globalAlpha = 1; return; } const pulse = 1 + Math.sin((now - n.born) / 150) * 0.15; ctx.fillStyle = 'rgba(255,197,49,.35)'; ctx.beginPath(); ctx.arc(n.sx, n.sy, 13 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = '#ffc531'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(n.sx, n.sy, 13 * pulse, 0, Math.PI * 2); ctx.stroke(); ctx.fillStyle = '#9aa3b0'; ctx.fillRect(n.sx - 1.5, n.sy - 9, 3, 11); ctx.fillStyle = '#e6e9ef'; ctx.fillRect(n.sx - 4, n.sy - 11, 8, 3); }); } }
      else if (current === 'global') { if (gview.spin && !reduce) gview.yaw += 0.08; ghits = G.drawGlobe(gctx, 880, 620, state, now, gview); gsmall.textContent = state.mode === 'dev' ? 'sample plots' : 'plots appear when NextWork publishes a count'; }
      if (!reduce) requestAnimationFrame(frame);
    }
    paintMode(); paintDev(); paintBuild(); paintBoard();
    show(TABS.some(t => t[0] === (host.remember && host.remember('tab'))) ? host.remember('tab') : 'world');
    requestAnimationFrame(frame); if (reduce) { const keep = current; ['world', 'avatar', 'base', 'build', 'global'].forEach(v => { current = v; frame(0); }); current = keep; }
    return { state, show, finish, theme, repaint() { paintBuild(); paintBoard(); paintDev(); }, applyProject(r) { S.applyProjectReading(state, r); save(); lastL = S.layout(state); paintBuild(); paintBoard(); }, applyPortfolio(r) { S.applyPortfolioReading(state, r); save(); lastL = S.layout(state); paintBuild(); }, pause() { running = false; }, resume() { if (!running) { running = true; requestAnimationFrame(frame); } } };
  }
  NW.mount = mount;
})();
