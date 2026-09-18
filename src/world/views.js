/* NextWorld · views: the panel itself
 * mount(root, host) builds the five tabs inside root (an element or a
 * shadow root) and draws only the tab that is showing. The host supplies
 * storage and what "open this project" means; nothing here touches the page. */
'use strict';
(function () {
  const { makeIso, B, clamp, lerp, ease, reduce, SERIES, START_HERE, HUBS, ABOUT, KIND_NAME, ICON, TW, TH } = NW;
  const S = NW.State, Land = NW.Land, HQ = NW.HQ, G = NW.Global;
  const TABS = [['world', 'NextWork World'], ['hq', 'NextWork'], ['base', 'My World'], ['build', 'My Build'], ['global', 'NextWork Global']];

  const CSS = `
    :host, .nww { all: initial; }
    .nww { display: block; font: 14px/1.45 Nunito, "Segoe UI", system-ui, sans-serif; color: #f2f5fb; background: #172033; border-radius: 14px; overflow: hidden; --gold: #ffc531; --ink: #4a2b00; --dim: #9aa6c0; --line: rgba(255,255,255,.12); --card: #1f2a42; --ok: #47d16c; --xp: #4fc3ff; }
    .nww * { box-sizing: border-box; } .nww button { font: inherit; cursor: pointer; } .nww button:focus-visible, .nww canvas:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
    .bar { display: flex; align-items: center; gap: 8px; padding: 10px 12px 8px; background: linear-gradient(180deg, #223052, #182339); border-bottom: 1px solid var(--line); flex-wrap: wrap; }
    .brand { font: 800 16px/1 "Baloo 2", "Segoe UI", system-ui, sans-serif; color: #fff; white-space: nowrap; } .brand span { color: var(--gold); }
    .mode { margin-left: auto; font: 700 11px/1 "Baloo 2", system-ui, sans-serif; padding: 6px 10px; border: 1px solid var(--line); border-radius: 999px; background: rgba(0,0,0,.25); color: var(--dim); }
    .mode[data-on="dev"] { color: #0b3d1b; background: #8fe3a4; border-color: transparent; }
    .tabs { display: flex; gap: 3px; background: rgba(0,0,0,.25); border-radius: 12px; padding: 3px; width: 100%; }
    .tabs button { flex: 1; font: 700 11.5px/1.1 "Baloo 2", system-ui, sans-serif; padding: 7px 4px; border: 0; border-radius: 9px; background: transparent; color: var(--dim); white-space: nowrap; }
    .tabs button[aria-selected="true"] { background: #fff; color: #172033; box-shadow: 0 2px 8px rgba(0,0,0,.35); }
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
    .cap { font-size: 12px; color: var(--dim); line-height: 1.45; } .cap b { color: #f2f5fb; }
    .tiles { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; } .tile { background: var(--card); border: 1px solid var(--line); border-radius: 12px; padding: 9px 11px; } .tile.wide { grid-column: 1 / -1; }
    .tile small { display: block; font-size: 10px; font-weight: 700; letter-spacing: .06em; text-transform: uppercase; color: var(--dim); } .tile b { font: 800 17px/1.1 "Baloo 2", system-ui, sans-serif; display: block; margin-top: 2px; } .tile span { font-size: 12px; color: var(--dim); }
    .barx { height: 7px; border-radius: 6px; background: rgba(0,0,0,.35); margin-top: 7px; overflow: hidden; } .barx i { display: block; height: 100%; width: 0; background: linear-gradient(90deg, #2c8fe8, var(--xp)); border-radius: 6px; }
    h3 { font: 800 14px/1.2 "Baloo 2", system-ui, sans-serif; margin: 4px 0 0; color: #fff; } h3 small { font: 600 12px/1 Nunito, system-ui, sans-serif; color: var(--dim); margin-left: 6px; }
    .list { display: flex; flex-direction: column; gap: 4px; }
    .row { display: grid; grid-template-columns: 28px 1fr auto; gap: 8px; align-items: center; padding: 6px 8px; background: rgba(0,0,0,.22); border: 1px solid var(--line); border-radius: 10px; } .row.full { border-color: rgba(124,240,164,.5); } .row.going { border-color: rgba(255,197,49,.45); }
    .row i { width: 28px; height: 28px; border-radius: 8px; background: var(--card); display: flex; align-items: center; justify-content: center; font-style: normal; font-size: 14px; }
    .row .n { min-width: 0; } .row .n b { display: block; font-size: 13px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; } .row .n small { display: block; font-size: 11px; color: var(--dim); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .row .n .barx { height: 4px; margin-top: 4px; } .row .v { text-align: right; font: 800 12px/1.2 "Baloo 2", system-ui, sans-serif; white-space: nowrap; } .row .v small { display: block; font: 600 10px/1.2 Nunito, system-ui, sans-serif; color: var(--dim); }
    .row button, .board button { grid-column: 1 / -1; font: 800 11px/1 "Baloo 2", system-ui, sans-serif; padding: 7px; border: 0; border-radius: 8px; background: rgba(255,255,255,.08); color: #f2f5fb; } .row button:hover, .board button:hover { background: rgba(255,255,255,.14); }
    .board { display: flex; flex-direction: column; gap: 6px; background: #c9a06a; color: #3a2a12; border-radius: 12px; padding: 10px 12px; box-shadow: inset 0 0 0 4px #b58a5a; } .board h3 { color: #3a2a12; } .board p { margin: 0; font-size: 12.5px; }
    .pin { background: #fff8e0; border-radius: 6px; padding: 8px 10px; display: grid; grid-template-columns: 1fr auto; gap: 6px; align-items: center; box-shadow: 0 2px 0 rgba(0,0,0,.15); } .pin b { display: block; font-size: 13px; } .pin small { display: block; font-size: 11.5px; color: #6b5a3a; }
    .pin button { grid-column: auto; background: var(--gold); color: var(--ink); } .pin button:hover { background: #ffd35a; }
    .btn { font: 700 13px/1.2 "Baloo 2", system-ui, sans-serif; padding: 10px; border: 0; border-radius: 11px; background: var(--card); color: #f2f5fb; box-shadow: inset 0 -3px 0 rgba(0,0,0,.35); } .btn:hover { background: #283555; }
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
    @media (prefers-reduced-motion: reduce) { .toast { transition: none; } }
  `;

  const el = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };
  const put = (parent, ...kids) => { kids.forEach(k => parent.appendChild(k)); return parent; };
  const camTo = (gx, gy, H) => ({ x: (gx - gy) * TW / 2, y: 60 + (gx + gy) * TH / 2 - H / 2 - 10 });

  function mount(root, host) {
    const state = S.normalise(host.load()); const save = () => host.save(state);
    const wrap = el('div', 'nww'); const style = el('style'); style.textContent = CSS; put(root, style, wrap);
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
    function drag(cv, I, W, H, onTap, onDrag) { let d = null; cv.addEventListener('pointerdown', e => { d = { x: e.clientX, y: e.clientY, cx: I.cam.x, cy: I.cam.y, moved: false }; cv.setPointerCapture(e.pointerId); }); cv.addEventListener('pointermove', e => { if (!d) return; const dx = e.clientX - d.x, dy = e.clientY - d.y; if (Math.hypot(dx, dy) > 4) d.moved = true; if (d.moved) { const r = cv.getBoundingClientRect(); I.cam.x = d.cx - dx * W / r.width; I.cam.y = d.cy - dy * H / r.height; if (onDrag) onDrag(); } }); cv.addEventListener('pointerup', e => { const was = d; d = null; if (!was || was.moved) return; const r = cv.getBoundingClientRect(); const x = (e.clientX - r.left) * W / r.width + I.cam.x - W / 2, y = (e.clientY - r.top) * H / r.height + I.cam.y - 60; onTap([(x / (TW / 2) + y / (TH / 2)) / 2, (y / (TH / 2) - x / (TW / 2)) / 2]); }); }
    function sayer(parent) { const s = el('div', 'say'); const b = el('b'); const t = document.createTextNode(''); put(s, b, t); parent.appendChild(s); return (title, body) => { b.textContent = title; t.textContent = body; }; }
    function toast(sc) { const t = el('div', 'toast'); sc.appendChild(t); let timer = null; return text => { t.textContent = text; t.classList.add('on'); clearTimeout(timer); timer = setTimeout(() => t.classList.remove('on'), 2800); }; }

    /* ---- 1. NextWork World ---- */
    const WS = 0.5, W1 = 880 / (2 * WS), H1 = 620 / (2 * WS);
    const w1 = scene(880, 620, 'NextWork World: the NextWork ranch in the middle, learners’ plots round it. Tap your plot to enter your world.');
    const world = makeIso(w1.cv, W1, H1, WS); const wc = camTo(HQ.C[0], HQ.C[1] + 2, H1); world.cam.x = wc.x; world.cam.y = wc.y;
    const wbadge = el('div', 'badge', 'NextWork World'); wbadge.appendChild(el('small', null, 'the ranch and everyone round it')); w1.sc.appendChild(wbadge);
    const wnav = el('div', 'nav'); [['The ranch', HQ.C[0], HQ.C[1] + 2], ['My plot', HQ.PLOTS[HQ.MINE][0], HQ.PLOTS[HQ.MINE][1]], ['The hubs', HQ.HUB_AT[0][0], HQ.HUB_AT[0][1] + 6]].forEach(([t, gx, gy]) => { const b = el('button', null, t); b.type = 'button'; b.addEventListener('click', () => { const c = camTo(gx, gy, H1); world.cam.x = c.x; world.cam.y = c.y; }); wnav.appendChild(b); }); w1.sc.appendChild(wnav);
    views.world.appendChild(w1.sc); const wsay = sayer(views.world);
    wsay('NextWork World', 'The ranch in the middle is NextWork: the tower, the cafe under it, eight hubs for the roadmaps, the lake, the paddock, and the eight of them in black T-shirts. The plots round the outside are learners. Yours has the flag. Tap it to go home.');
    views.world.appendChild(el('div', 'cap', 'No roads, only the paths people have worn. Tap a hub for its roadmap, a staff member for a word, an open slot to see how a world begins.'));
    drag(w1.cv, world, W1, H1, g => { const h = HQ.hitHQ(state, g);
      if (h.kind === 'tower') { show('hq'); return; }
      if (h.kind === 'cafe') { wsay('The cafe', 'Where people ask questions. In the real thing, the chat is on every project page.'); return; }
      if (h.kind === 'hub') { const n = SERIES.filter(sr => sr.kind === h.hub.kind).reduce((a, sr) => a + S.doneIn(state, sr), 0); wsay(h.hub.name + ' hub', h.hub.sub + '. You have built ' + n + ' here. Every ' + KIND_NAME[h.hub.kind].toLowerCase() + ' on your land came from this hub.'); return; }
      if (h.kind === 'plot' && h.owner.mine) { show('base'); return; }
      if (h.kind === 'plot' && h.owner.built) { wsay(h.owner.name, h.owner.built + ' built. When they share their portfolio you can walk it. Not yet: this is about you.'); return; }
      if (h.kind === 'plot') { wsay('Open slot', 'A new learner picks a slot, and it does not touch anyone else’s. Their world opens with a tent, a board, and one oak.'); return; }
      if (h.kind === 'staff') { wsay(h.staff.name, h.staff.says); return; }
      if (h.kind === 'paddock') { wsay('The paddock', 'They belong to no one. Like the free tier.'); return; }
      if (h.kind === 'lake') { wsay('The lake', 'Ripples.'); return; }
      wsay('Grass', 'Nothing here. Which is the point of a ranch.'); });

    /* ---- 2. NextWork ---- */
    const about = el('div', 'about view'); about.className = 'about'; views.hq.appendChild(about);
    put(about, el('p', 'tag', ABOUT.tagline), el('p', 'mission', ABOUT.mission), el('p', null, ABOUT.story));
    const facts = el('div', 'facts'); ABOUT.facts.forEach(f => { const d = el('div', 'fact'); put(d, el('b', null, f[0]), el('small', null, f[1])); facts.appendChild(d); }); about.appendChild(facts);
    about.appendChild(el('h3', null, 'Roadmaps, as hubs'));
    const rl = el('div', 'list'); ABOUT.roadmaps.forEach(r => { const row = el('div', 'row'); const n = el('div', 'n'); put(n, el('b', null, r[0]), el('small', null, r[1] + ' projects')); const v = el('div', 'v', String(r[1])); put(row, el('i', null, '🗺️'), n, v); rl.appendChild(row); }); about.appendChild(rl);
    const links = el('p'); ABOUT.links.forEach((l, i) => { if (i) links.appendChild(document.createTextNode(' · ')); const a = el('a', null, l[0]); a.href = 'https:' + '//' + l[1]; a.target = '_blank'; a.rel = 'noopener'; links.appendChild(a); }); about.appendChild(links);
    about.appendChild(el('div', 'cap', 'In NextWork’s own words, read from nextwork.ai and the NextWork story. The tower on the map is this page.'));

    /* ---- 3. My World ---- */
    const me = Land.makeMe(state); let anim = null; const fx = [];
    const b1 = scene(880, 620, 'Your land. Tap the ground or use the arrow keys to walk; tap a building for its project; drag to look around.');
    const base = makeIso(b1.cv, 440, 310); Object.assign(base.cam, camTo(me.gx, me.gy, 310));
    const hud = el('div', 'hud'); const shield = el('div', 'shield', '1'); const who = el('div', 'who'); const whoB = el('b', null, state.name); const whoS = el('small', null, ''); put(who, whoB, whoS); put(hud, shield, who); b1.sc.appendChild(hud);
    const bnav = el('div', 'nav'); [['Home', () => { me.target = [S.HOME[0] + 0.6, S.HOME[1] + 1.6]; me.follow = true; }], ['World', () => show('world')], ['Build', () => show('build')]].forEach(([t, fn]) => { const b = el('button', null, t); b.type = 'button'; b.addEventListener('click', fn); bnav.appendChild(b); }); b1.sc.appendChild(bnav);
    const btoast = toast(b1.sc); views.base.appendChild(b1.sc);
    const card = el('div', 'card'); card.hidden = true; const cIc = el('div', 'ic'); const cT = el('div'); const cB = el('b'); const cS = el('small'); put(cT, cB, cS); const acts = el('div', 'acts'); const cOpen = el('button', null, 'Open project'); cOpen.type = 'button'; const cNext = el('button', 'up', 'Next part'); cNext.type = 'button'; put(acts, cOpen, cNext); put(card, cIc, cT, acts); views.base.appendChild(card);
    const bsay = sayer(views.base); const board = el('div', 'board'); views.base.appendChild(board);
    views.base.appendChild(el('div', 'cap', 'Spreads are series. A windmill once a spread has two buildings, a fence once it is whole, oaks where nothing is built yet. Over the creek, your learn lists. Paths appear where you have walked.'));
    function paintBoard() {
      while (board.firstChild) board.removeChild(board.firstChild);
      const empty = state.done.length === 0; const h = el('h3', null, empty ? 'Start here' : 'Next on the board'); board.appendChild(h);
      board.appendChild(el('p', null, empty ? 'Pick one. The land fills in as you go.' : 'Where you left off, and one or two worth a look.'));
      const picks = []; const nx = S.nextProject(state); if (nx && !empty) picks.push([nx.title, nx.series.id, 'Part ' + (S.doneIn(state, nx.series) + 1) + ' of ' + nx.series.projects.length + ' in ' + nx.series.name + '.']);
      START_HERE.forEach(p => { if (picks.length < 5 && !state.done.includes(p[0]) && !picks.some(x => x[0] === p[0])) picks.push(p); });
      picks.forEach(p => { const sr = SERIES.find(x => x.id === p[1]); const pin = el('div', 'pin'); const t = el('div'); put(t, el('b', null, p[0]), el('small', null, p[2])); const b = el('button', null, empty ? 'Start' : 'Open'); b.type = 'button'; b.addEventListener('click', () => host.openProject(p[0], sr)); put(pin, t, b); board.appendChild(pin); });
      if (!picks.length) board.appendChild(el('p', null, 'Every project is built. The land is yours.'));
    }
    function showCard(b) { card.hidden = false; cIc.textContent = ICON[b.kind]; cB.textContent = b.series ? b.title : b.list.name; cS.textContent = b.series ? b.series.name + ' · part ' + b.part + ' of ' + b.of + ' · ' + KIND_NAME[b.kind] : 'Learn list · project ' + b.part + ' of ' + b.of + ' · ' + KIND_NAME[b.kind]; const nxt = b.series ? b.series.projects.find(pr => !state.done.includes(pr[0])) : null; cNext.disabled = !nxt; cNext.textContent = nxt ? 'Next: ' + nxt[0] : b.series ? 'Series complete' : 'Yours'; cNext.onclick = () => { if (nxt) host.openProject(nxt[0], b.series); }; cOpen.onclick = () => host.openProject(b.series ? b.title : b.list.name, b.series); me.target = [b.gx + 0.5, b.gy + 1.4]; me.follow = true; bsay(b.series ? b.title : b.list.name, (b.series ? 'Tier ' + b.tier + ' ' : '') + KIND_NAME[b.kind].toLowerCase() + ' on the ' + (b.series ? b.series.name : b.list.name) + ' spread.'); }
    drag(b1.cv, base, 440, 310, g => { const L = S.layout(state); const hit = Land.hit(L, g); if (hit) { showCard(hit); return; } card.hidden = true;
      if (Math.abs(g[0] - S.HOME[0]) < 1.6 && Math.abs(g[1] - S.HOME[1]) < 1.6) { const w = S.houseWord(state), n = S.nextHouseWord(state); bsay('The ' + w[1].toLowerCase(), n ? (n[0] - state.done.length) + ' more and it is a ' + n[1].toLowerCase() + '.' : 'The whole valley.'); me.target = [S.HOME[0] + 0.6, S.HOME[1] + 1.6]; me.follow = true; return; }
      if (g[0] >= 0 && g[1] >= 0 && g[0] < S.LAND && g[1] < S.LAND) { me.target = [g[0], g[1]]; me.follow = true; } }, () => { me.follow = false; });
    b1.cv.addEventListener('keydown', e => { if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd'].includes(e.key)) { me.keys[e.key] = true; e.preventDefault(); } });
    b1.cv.addEventListener('keyup', e => { delete me.keys[e.key]; }); b1.cv.addEventListener('blur', () => { me.keys = {}; });
    bsay('Your land', state.done.length ? 'Every finished project is a building on its series’ spread. The ranch house is your total. Tap the ground or use the arrow keys to walk.' : 'A tent, a board, and one oak. Pick a project on the board and the first cabin goes up here.');
    function finish(title, sr) { S.finish(state, title); save(); const b = S.layout(state).buildings.find(x => x.title === title); anim = { title, start: performance.now() }; btoast('Built: ' + title); bsay(title, KIND_NAME[sr.kind] + ' on the ' + sr.name + ' spread.' + (S.doneIn(state, sr) === sr.projects.length ? ' The spread is fenced: series complete.' : '')); if (b) { fx.push({ type: 'sparkle', gx: b.gx + 0.5, gy: b.gy + 0.5, seed: Math.random() * 6, start: performance.now() + 1500, life: 900 }); me.target = [b.gx + 0.5, b.gy + 1.6]; me.follow = true; } paintBoard(); paintBuild(); paintDev(); }

    /* ---- 4. My Build ---- */
    const bt = el('div', 'tiles'); const tWhere = el('div', 'tile wide'); const tWb = el('b'); const tWs = el('span'); const tWbar = el('div', 'barx'); const tWi = el('i'); tWbar.appendChild(tWi); put(tWhere, el('small', null, 'Where you are'), tWb, tWs, tWbar);
    const tDone = el('div', 'tile'); const tDb = el('b'); put(tDone, el('small', null, 'Built'), tDb, el('span', null, 'of 90 NextWork projects'));
    const tLib = el('div', 'tile'); const tLb = el('b'); const tLs = el('span'); put(tLib, el('small', null, 'Library'), tLb, tLs); put(bt, tWhere, tDone, tLib); views.build.appendChild(bt);
    const pName = el('h3'); const pSub = el('div', 'cap'); put(views.build, pName, pSub);
    const s1 = scene(880, 500, 'The building site, on its spread'); const site = makeIso(s1.cv, 440, 250); const sbadge = el('div', 'badge', ''); s1.sc.appendChild(sbadge); views.build.appendChild(s1.sc);
    const steps = el('div', 'steps'); views.build.appendChild(steps);
    const openBtn = el('button', 'btn go', 'Open the project'); openBtn.type = 'button'; views.build.appendChild(openBtn);
    const stepBtn = el('button', 'btn', 'Complete the next step'); stepBtn.type = 'button'; views.build.appendChild(stepBtn);
    views.build.appendChild(el('h3', null, 'The catalogue')); const catList = el('div', 'list'); views.build.appendChild(catList);
    views.build.appendChild(el('h3', null, 'Your library')); const libList = el('div', 'list'); views.build.appendChild(libList);
    views.build.appendChild(el('div', 'cap', 'Steps are read from the project page as you tick them. Four stages go up with them; the roof goes on with the last step, and the building is yours.'));
    let current_site = null; const bs = { k: 1, lastAt: -9000 };
    function stepsOf(title) { const st = state.steps[title]; return st ? { done: st.done, total: st.total } : { done: 0, total: 7 }; }
    function paintBuild() {
      const xp = S.xpOf(state), w = S.houseWord(state), nw = S.nextHouseWord(state);
      tWb.textContent = w[1] + ' · ' + state.done.length + ' built'; tWs.textContent = nw ? (nw[0] - state.done.length) + ' more to ' + nw[1].toLowerCase() : 'The whole valley'; tWi.style.width = (nw ? (state.done.length - w[0]) / (nw[0] - w[0]) * 100 : 100) + '%';
      tDb.textContent = state.done.length + ' / 90'; const lt = state.lists.reduce((a, l) => a + l.total, 0); tLb.textContent = state.lists.length + (state.lists.length === 1 ? ' list' : ' lists'); tLs.textContent = lt + ' projects of your own';
      current_site = Land.siteFor(state); const st = current_site ? stepsOf(current_site.title) : { done: 0, total: 0 };
      pName.textContent = current_site ? current_site.title : 'Every project is built'; pSub.textContent = current_site ? current_site.series.name + ' · part ' + (S.doneIn(state, current_site.series) + 1) + ' of ' + current_site.series.projects.length + ' · becomes a ' + KIND_NAME[current_site.kind].toLowerCase() : '';
      if (current_site) { const c = camTo(current_site.gx + 0.5, current_site.gy + 0.5, 250); site.cam.x = c.x; site.cam.y = c.y + 20; }
      while (steps.firstChild) steps.removeChild(steps.firstChild);
      const names = state.mode === 'dev' && !state.steps[current_site && current_site.title] ? ['Set up', 'Build it', 'Connect it', 'Test it', 'Secure it', 'Document it', 'Clean up'] : null;
      for (let i = 0; i < st.total; i++) { const d = el('div', 'step' + (i < st.done ? ' done' : i === st.done ? ' now' : '')); put(d, el('i', null, i < st.done ? '✓' : String(i + 1)), el('b', null, names ? names[i] || 'Step ' + (i + 1) : 'Step ' + (i + 1))); steps.appendChild(d); }
      if (!st.total) steps.appendChild(el('div', 'cap', state.mode === 'dev' ? 'No steps yet.' : 'Open the project and the steps appear here as you tick them.'));
      stepBtn.hidden = state.mode !== 'dev' || !current_site; stepBtn.disabled = !current_site || st.done >= st.total; stepBtn.textContent = st.done >= st.total && st.total ? 'All steps done' : 'Complete step ' + (st.done + 1) + ' of ' + st.total;
      openBtn.disabled = !current_site; openBtn.onclick = () => current_site && host.openProject(current_site.title, current_site.series);
      while (catList.firstChild) catList.removeChild(catList.firstChild);
      SERIES.forEach(sr => { const d = S.doneIn(state, sr), n = sr.projects.length; const row = el('div', 'row' + (d === n ? ' full' : d ? ' going' : '')); const nn = el('div', 'n'); const bar = el('div', 'barx'); const bi = el('i'); bi.style.width = (d / n * 100) + '%'; bar.appendChild(bi); put(nn, el('b', null, sr.name), el('small', null, KIND_NAME[sr.kind] + (d ? ' · tier ' + S.tierIn(state, sr) : ' · not started')), bar); const v = el('div', 'v', d + ' / ' + n); put(row, el('i', null, ICON[sr.kind]), nn, v); const nxt = sr.projects.find(pr => !state.done.includes(pr[0])); if (nxt) { const b = el('button', null, (d ? 'Next: ' : 'Start: ') + nxt[0]); b.type = 'button'; b.addEventListener('click', () => host.openProject(nxt[0], sr)); row.appendChild(b); } catList.appendChild(row); });
      while (libList.firstChild) libList.removeChild(libList.firstChild);
      if (!state.lists.length) libList.appendChild(el('div', 'cap', state.mode === 'dev' ? 'No learn lists in this seed.' : 'Open your portfolio on nextwork.ai and your learn lists appear here, each as a spread over the creek.'));
      state.lists.forEach(l => { const row = el('div', 'row full'); const nn = el('div', 'n'); put(nn, el('b', null, l.name), el('small', null, l.blurb || KIND_NAME[l.kind] + ' spread')); const v = el('div', 'v', String(l.total)); v.appendChild(el('small', null, KIND_NAME[l.kind].toLowerCase() + ' spread')); put(row, el('i', null, '🌉'), nn, v); libList.appendChild(row); });
    }
    stepBtn.addEventListener('click', () => { if (!current_site) return; const st = stepsOf(current_site.title); if (st.done >= st.total) return; state.steps[current_site.title] = { done: st.done + 1, total: st.total }; bs.lastAt = performance.now(); save(); if (st.done + 1 >= st.total) { const t = current_site.title, sr = current_site.series; setTimeout(() => finish(t, sr), 900); } paintBuild(); });

    /* ---- 5. NextWork Global ---- */
    const GS = 0.24, W5 = 880 / (2 * GS), H5 = 620 / (2 * GS); const g1 = scene(880, 620, 'NextWork Global: the map, and where learners are building.'); const glob = makeIso(g1.cv, W5, H5, GS); const gc = camTo(G.W / 2, G.H / 2, H5); glob.cam.x = gc.x; glob.cam.y = gc.y;
    const gbadge = el('div', 'badge', 'NextWork Global'); const gsmall = el('small'); gbadge.appendChild(gsmall); g1.sc.appendChild(gbadge); views.global.appendChild(g1.sc);
    const gsay = sayer(views.global); gsay('NextWork Global', 'Where people are building. Same land, whole world.'); views.global.appendChild(el('div', 'cap', 'Same land, whole world. Each dot is how many are building there. The extension cannot know this on its own; it needs a count NextWork publishes, so production says so until then.'));
    drag(g1.cv, glob, W5, H5, g => { const d = G.SAMPLE.find(x => Math.hypot(x[1] - g[0], x[2] - g[1]) < 1.6); if (d && state.mode === 'dev') gsay(d[0], d[3] + ' learners building. Sample numbers: the real count needs NextWork to publish it.'); else gsay('Open water', 'Drag to look around.'); });

    /* ---- mode, dev controls ---- */
    function paintMode() { mode.textContent = state.mode === 'dev' ? 'Dev · simulate and reset' : 'Production · real data only'; mode.dataset.on = state.mode; devbar.hidden = state.mode !== 'dev'; }
    mode.addEventListener('click', () => { state.mode = state.mode === 'dev' ? 'prod' : 'dev'; if (state.mode === 'prod' && host.production) { const p = S.normalise(host.production()); state.done = p.done; state.lists = p.lists; state.steps = p.steps; state.name = p.name; } save(); paintMode(); paintDev(); paintBuild(); paintBoard(); });
    function paintDev() { while (devbar.firstChild) devbar.removeChild(devbar.firstChild); devbar.appendChild(el('span', null, 'Seed'));
      [[0, 'Empty'], [5, '5 built'], [50, '50 built'], [90, 'All 90']].forEach(([n, t]) => { const b = el('button', null, t); b.type = 'button'; b.addEventListener('click', () => { S.seed(state, n, state.name === 'You' ? 'Roy' : state.name); save(); anim = null; paintBuild(); paintBoard(); paintDev(); bsay('Seeded', t + '.'); }); devbar.appendChild(b); });
      const nx = S.nextProject(state); const f = el('button', null, nx ? 'Finish: ' + nx.title : 'Nothing left'); f.type = 'button'; f.disabled = !nx; f.addEventListener('click', () => nx && finish(nx.title, nx.series)); devbar.appendChild(f);
      const r = el('button', null, 'Reset'); r.type = 'button'; r.addEventListener('click', () => { const m = state.mode; Object.assign(state, S.fresh()); state.mode = m; save(); paintBuild(); paintBoard(); paintDev(); bsay('Reset', 'A tent, a board, and one oak.'); }); devbar.appendChild(r); }

    /* ---- the loop: draw only what is showing ---- */
    let running = true;
    function frame(now) {
      if (!running) return;
      if (current === 'world') { world.ctx.setTransform(1, 0, 0, 1, 0, 0); Land.sky({ ctx: world.ctx, W: 880, H: 620 }); world.reset(); HQ.drawHQ(world, state, now, {}); }
      else if (current === 'base') { Land.stepMe(me, () => bsay('The creek', 'Cross at a bridge.')); if (me.follow) { const c = camTo(me.gx, me.gy, 310); base.cam.x = lerp(base.cam.x, c.x, reduce ? 1 : 0.08); base.cam.y = lerp(base.cam.y, c.y, reduce ? 1 : 0.08); } Land.sky(base); Land.drawLand(base, state, me, now, { anim, fx }); const w = S.houseWord(state); shield.textContent = String(NW.TIERS.indexOf(NW.tierOf(S.xpOf(state))) + 1); whoS.textContent = w[1] + ' · ' + state.done.length + ' built · ' + state.lists.length + ' lists'; whoB.textContent = state.name; if (anim && now - anim.start > 1700) anim = null; while (fx.length && now - fx[0].start > fx[0].life) fx.shift(); if (!reduce && (me.moving || me.target)) { state.me = { gx: me.gx, gy: me.gy }; } }
      else if (current === 'build') { Land.sky(site); const st = current_site ? stepsOf(current_site.title) : { done: 0, total: 0 }; const o = { site: current_site, stepsDone: st.done, stepsTotal: st.total, k: reduce ? 1 : clamp((now - bs.lastAt) / 900, 0, 1), anim }; Land.drawLand(site, state, null, now, o); sbadge.textContent = o.stage ? o.stage + ' · ' + st.done + ' of ' + st.total : ''; }
      else if (current === 'global') { glob.ctx.setTransform(1, 0, 0, 1, 0, 0); const g = glob.ctx.createLinearGradient(0, 0, 0, 620); g.addColorStop(0, '#1d5f9a'); g.addColorStop(1, '#2f8fd6'); glob.ctx.fillStyle = g; glob.ctx.fillRect(0, 0, 880, 620); glob.reset(); G.drawGlobal(glob, state, now); gsmall.textContent = state.mode === 'dev' ? 'sample counts' : 'population appears when NextWork publishes it'; }
      if (!reduce) requestAnimationFrame(frame);
    }
    paintMode(); paintDev(); paintBuild(); paintBoard();
    show(host.remember && host.remember('tab') || 'world');
    requestAnimationFrame(frame); if (reduce) { ['world', 'base', 'build', 'global'].forEach(v => { current = v; frame(0); }); current = host.remember && host.remember('tab') || 'world'; }
    return { state, show, finish, repaint() { paintBuild(); paintBoard(); paintDev(); }, applyProject(r) { S.applyProjectReading(state, r); save(); paintBuild(); paintBoard(); }, applyPortfolio(r) { S.applyPortfolioReading(state, r); save(); paintBuild(); }, pause() { running = false; }, resume() { if (!running) { running = true; requestAnimationFrame(frame); } } };
  }
  NW.mount = mount;
})();
