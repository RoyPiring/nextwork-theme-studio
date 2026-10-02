/* Pineapple Theme Studio · companion: the little friend floating on the page.
 *
 * It lives in a closed shadow root in the top frame, so the page cannot style
 * it and it cannot style the page. It draws only while the tab is visible, at
 * a low frame rate, and moves within a small patch of the corner: company, not
 * a distraction. It watches only that you are here (scrolling, typing,
 * pointing), never what you type, and keeps nothing but a mood and minutes.
 *
 * With no model it speaks from its own lines. With a model tied in, a question
 * goes to the background page, which hands it to a program on this computer
 * through the browser's native messaging. Nothing here opens a connection. */
'use strict';
(function () {
  if (window.top !== window || !window.NWB || typeof chrome === 'undefined' || !chrome.storage) return;
  const B = window.NWB, MIN = 60000, SIZE = 120;
  const DEFAULTS = B.DEFAULTS;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let cfg = Object.assign({}, DEFAULTS), shown = false, ui = null, raf = 0, ticker = 0, lastFrame = 0;
  let pet = { mood: 70, focusMin: 0, today: '', todayMin: 0, lastSeen: 0 }, petLoaded = false, petDirty = false, petSavedAt = 0;
  let act = { action: 'idle', start: 0, dur: 5000 }, lastActive = Date.now(), nudges = 0, lastSpoke = 0, nextChat = 0, minuteAt = Date.now(), restSaid = 0;
  let stroll = 0, strollDir = -1, path = location.pathname;

  const onProject = () => /^\/projects?\/[^/]+/.test(location.pathname);
  const today = () => new Date().toISOString().slice(0, 10);
  const project = () => { const h = document.querySelector('h1'); return h ? h.textContent.trim().slice(0, 100) : ''; };
  /* the section you are reading: the last heading above the middle of the window */
  function section() { const hs = document.querySelectorAll('h2, h3'); let best = ''; for (let i = 0; i < hs.length; i++) { const r = hs[i].getBoundingClientRect(); if (r.top < window.innerHeight * 0.45) best = hs[i].textContent.trim(); } return best.slice(0, 80); }
  const who = () => B.get(cfg.who), nameOf = () => cfg.name || who().name;

  /* ---- the shadow root: a canvas, a speech bubble, a small menu ---- */
  const CSS = ':host { all: initial; }' +
    '.wrap { position: fixed; z-index: 2147483000; width: ' + SIZE + 'px; pointer-events: none; font: 500 13px/1.4 system-ui, -apple-system, "Segoe UI", sans-serif; }' +
    'canvas { display: block; width: ' + SIZE + 'px; height: ' + SIZE + 'px; pointer-events: auto; cursor: grab; touch-action: none; transition: transform .25s linear; }' +
    '.bubble { position: absolute; bottom: ' + (SIZE - 8) + 'px; right: 0; width: max-content; max-width: 240px; padding: 9px 12px; border-radius: 14px; background: #fffdf6; color: #1d1a26; box-shadow: 0 6px 22px rgba(0,0,0,.22); border: 1px solid rgba(0,0,0,.08); pointer-events: auto; opacity: 0; transform: translateY(6px); transition: opacity .2s, transform .2s; }' +
    '.bubble[data-on="1"] { opacity: 1; transform: none; } .bubble b { display: block; font-size: 11px; letter-spacing: .04em; text-transform: uppercase; color: #8a6a2a; margin-bottom: 2px; }' +
    '.bubble::after { content: ""; position: absolute; right: 44px; bottom: -7px; border: 7px solid transparent; border-top-color: #fffdf6; border-bottom: 0; }' +
    '.menu { position: absolute; bottom: 6px; right: ' + (SIZE - 6) + 'px; display: flex; flex-direction: column; gap: 5px; pointer-events: auto; }' +
    '.menu[hidden], .ask[hidden] { display: none; }' +
    'button { font: 600 12px/1 system-ui, sans-serif; padding: 8px 11px; border-radius: 10px; border: 1px solid rgba(0,0,0,.12); background: #fffdf6; color: #1d1a26; cursor: pointer; white-space: nowrap; box-shadow: 0 3px 10px rgba(0,0,0,.15); }' +
    'button:hover { background: #fff3c4; } button:focus-visible, input:focus-visible { outline: 2px solid #3b6fd6; outline-offset: 2px; }' +
    '.ask { position: absolute; bottom: ' + (SIZE + 4) + 'px; right: 0; display: flex; gap: 5px; pointer-events: auto; }' +
    'input { width: 200px; font: 500 13px/1.2 system-ui, sans-serif; padding: 8px 10px; border-radius: 10px; border: 1px solid rgba(0,0,0,.2); background: #fffdf6; color: #1d1a26; }';
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  function build() {
    const hostEl = document.createElement('div'); hostEl.id = 'nwt-buddy'; const root = hostEl.attachShadow({ mode: 'closed' });
    const style = el('style'); style.textContent = CSS; const wrap = el('div', 'wrap'); const cv = el('canvas'); cv.width = SIZE * dpr(); cv.height = SIZE * dpr(); cv.setAttribute('role', 'img');
    const bubble = el('div', 'bubble'); bubble.setAttribute('role', 'status'); bubble.setAttribute('aria-live', 'polite'); const bName = el('b'); const bText = el('span'); bubble.appendChild(bName); bubble.appendChild(bText);
    const menu = el('div', 'menu'); menu.hidden = true; const ask = el('form', 'ask'); ask.hidden = true; const input = el('input'); input.type = 'text'; input.maxLength = 300; input.placeholder = 'Ask me something'; input.setAttribute('aria-label', 'Ask your companion'); const send = el('button', null, 'Ask'); send.type = 'submit'; ask.appendChild(input); ask.appendChild(send);
    wrap.appendChild(bubble); wrap.appendChild(ask); wrap.appendChild(menu); wrap.appendChild(cv); root.appendChild(style); root.appendChild(wrap); (document.body || document.documentElement).appendChild(hostEl);
    ui = { hostEl, wrap, cv, ctx: cv.getContext('2d'), bubble, bName, bText, menu, ask, input, hideAt: 0 };
    wire(); place(); paintMenu();
  }
  const dpr = () => Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  function remove() { if (ui) { ui.hostEl.remove(); ui = null; } stopLoops(); }

  /* where it stands: where you dropped it, or the lower right */
  function place() { if (!ui) return; const w = ui.wrap.style; if (cfg.x == null || cfg.y == null) { w.left = 'auto'; w.top = 'auto'; w.right = '22px'; w.bottom = '18px'; return; } w.right = 'auto'; w.bottom = 'auto'; w.left = Math.min(window.innerWidth - SIZE - 8, Math.max(8, cfg.x * window.innerWidth)) + 'px'; w.top = Math.min(window.innerHeight - SIZE - 8, Math.max(8, cfg.y * window.innerHeight)) + 'px'; }

  /* ---- talking: one line at a time, held long enough to read ---- */
  function say(text, ms) { if (!ui || !text) return; ui.bName.textContent = nameOf(); ui.bText.textContent = text; ui.bubble.setAttribute('data-on', '1'); ui.hideAt = Date.now() + (ms || Math.max(4500, text.length * 70)); lastSpoke = Date.now(); nextChat = Math.max(nextChat, lastSpoke + 2 * MIN); }
  function sayKind(kind) { say(B.line(kind, cfg.who, { project: project(), today: pet.todayMin, total: pet.focusMin })); }
  function setAction(action, dur) { act = { action, start: Date.now(), dur: dur || (B.ACTIONS[action] ? B.ACTIONS[action].dur[0] : 3000) }; }

  /* ---- the menu: what you can ask of it ---- */
  function paintMenu() {
    if (!ui) return; while (ui.menu.firstChild) ui.menu.removeChild(ui.menu.firstChild);
    const items = [['Where am I?', whereAmI], ['How am I doing?', () => sayKind('build')], ['Focus music', () => sayKind('music')], ['Pet', () => { pet.mood = Math.min(100, pet.mood + 6); petDirty = true; setAction('cheer'); sayKind('pet'); }]];
    if (cfg.linked) items.unshift(['Ask', () => { ui.bubble.setAttribute('data-on', '0'); ui.hideAt = 0; ui.ask.hidden = false; ui.input.focus(); }]);
    items.push(['Hide for an hour', () => saveCfg({ snoozeUntil: Date.now() + 60 * MIN })]);
    items.forEach(([label, fn]) => { const b = el('button', null, label); b.type = 'button'; b.addEventListener('click', () => { ui.menu.hidden = true; fn(); }); ui.menu.appendChild(b); });
  }
  function whereAmI() { const p = project(), sec = section(); if (!onProject()) { say(p ? 'You’re on ' + p + '. Open a project and I’ll keep you on track.' : 'Open a project and I’ll keep you on track.'); return; } say(sec ? 'You’re on ' + (p || 'this project') + ', reading “' + sec + '”.' : B.line('navigate', cfg.who, { project: p })); }

  /* a question for the model on this computer; the page and section go with it so the answer is about where you are */
  function askModel(q) {
    setAction('think'); say('Thinking…', 60000);
    const msg = { type: 'buddy:ask', question: q, persona: { name: nameOf(), voice: who().voice }, page: { project: project(), section: section(), onProject: onProject(), path: location.pathname.slice(0, 120) }, stats: { today: pet.todayMin, total: pet.focusMin, mood: Math.round(pet.mood) } };
    try {
      chrome.runtime.sendMessage(msg, reply => {
        setAction('idle');
        if (chrome.runtime.lastError || !reply) { say('I couldn’t reach my model. Open the extension’s Companion tab to check it.'); return; }
        if (!reply.ok) { say(reply.error || 'My model didn’t answer. Try again in a moment.'); return; }
        setAction('wave'); say(String(reply.text || '').slice(0, 400));
      });
    } catch (e) { setAction('idle'); say('I couldn’t reach my model just now.'); }
  }

  function wire() {
    let down = null, moved = false;
    ui.cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, r: ui.wrap.getBoundingClientRect() }; moved = false; ui.cv.setPointerCapture(e.pointerId); });
    ui.cv.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (!moved && Math.hypot(dx, dy) < 5) return; moved = true; const w = ui.wrap.style; w.right = 'auto'; w.bottom = 'auto'; w.left = (down.r.left + dx) + 'px'; w.top = (down.r.top + dy) + 'px'; });
    ui.cv.addEventListener('pointerup', () => { if (!down) return; const r = ui.wrap.getBoundingClientRect(); const wasMoved = moved; down = null; if (wasMoved) { saveCfg({ x: r.left / window.innerWidth, y: r.top / window.innerHeight }); return; } ui.menu.hidden = !ui.menu.hidden; ui.ask.hidden = true; if (!ui.menu.hidden) { ui.bubble.setAttribute('data-on', '0'); ui.hideAt = 0; }   /* the menu and the bubble never overlap */ if (!ui.menu.hidden && act.action === 'nap') { setAction('wave'); sayKind('back'); } });
    ui.cv.addEventListener('dblclick', () => saveCfg({ x: null, y: null }));
    ui.ask.addEventListener('submit', e => { e.preventDefault(); const q = ui.input.value.trim(); if (!q) return; ui.input.value = ''; ui.ask.hidden = true; askModel(q); });
    ui.bubble.addEventListener('click', () => { ui.hideAt = 0; });
  }
  function saveCfg(patch) { chrome.storage.local.get({ buddy: {} }, s => { chrome.storage.local.set({ buddy: Object.assign({}, s.buddy, patch) }); }); }

  /* ---- you: only whether you are here, never what you do ---- */
  function active() {
    const now = Date.now(), away = now - lastActive; lastActive = now;
    if (!shown) return;
    if (away > 3 * MIN && (act.action === 'nap' || act.action === 'nudge' || nudges > 0)) { nudges = 0; setAction('cheer'); sayKind('back'); }
    else if (act.action === 'nap') setAction('idle');
  }
  let lastMove = 0;
  ['scroll', 'wheel', 'keydown', 'pointerdown'].forEach(t => window.addEventListener(t, active, { passive: true, capture: true }));
  window.addEventListener('pointermove', () => { const n = Date.now(); if (n - lastMove > 2000) { lastMove = n; active(); } }, { passive: true, capture: true });

  /* ---- the mood and the minutes, kept in this browser and nowhere else ---- */
  function loadPet(stored) {
    pet = Object.assign(pet, stored || {}); const now = Date.now();
    if (pet.lastSeen) pet.mood = Math.max(10, pet.mood - Math.floor((now - pet.lastSeen) / (60 * MIN)) * 3);   /* it missed you a little */
    if (pet.today !== today()) { pet.today = today(); pet.todayMin = 0; }
    pet.lastSeen = now; petLoaded = true;
  }
  function savePet(force) { if (!petLoaded || (!petDirty && !force)) return; pet.lastSeen = Date.now(); petDirty = false; petSavedAt = Date.now(); chrome.storage.local.set({ buddyPet: pet }); }

  /* ---- the tick: twice a second, decide; the frames only draw ---- */
  function tick() {
    const now = Date.now(), idle = now - lastActive;
    if (cfg.snoozeUntil && now < cfg.snoozeUntil) { if (ui) remove(); return; }
    if (!ui) { build(); startDraw(); }
    if (location.pathname !== path) { path = location.pathname; if (onProject() && !cfg.quiet) setTimeout(() => sayKind('navigate'), 1500); }
    if (now - minuteAt >= MIN) {   /* a minute: learning on a project page feeds it; being away does not */
      minuteAt = now; const before = B.stageOf(pet.focusMin);
      if (onProject() && idle < MIN && !document.hidden) { pet.focusMin++; pet.todayMin++; pet.mood = Math.min(100, pet.mood + 1.5); petDirty = true; }
      else if (idle > 10 * MIN) { pet.mood = Math.max(10, pet.mood - 0.5); petDirty = true; }
      if (cfg.who === 'ember' && B.stageOf(pet.focusMin) > before) { setAction('cheer'); sayKind('hatch'); }
      if (pet.today !== today()) { pet.today = today(); pet.todayMin = 0; }
    }
    if (petDirty && now - petSavedAt > 5 * MIN) savePet();
    if (ui && ui.hideAt && now > ui.hideAt) { ui.bubble.setAttribute('data-on', '0'); ui.hideAt = 0; }
    if (now - act.start > act.dur || (act.action === 'nap' && idle < 15 * MIN)) {
      const next = B.pickAction({ idleMs: idle, onProject: onProject(), nudgeMin: cfg.quiet ? 0 : cfg.nudgeMin, nudges, reduce });
      if (next.action === 'nudge') { nudges++; sayKind('nudge'); }
      setAction(next.action, next.dur);
    }
    /* now and then, unasked, a line about you and your build; never while you are away, never in quiet mode */
    if (!cfg.quiet && idle < MIN && now > nextChat && act.action !== 'think' && !(ui && ui.hideAt)) {   /* never over a line that is still being read */
      nextChat = now + (6 + Math.random() * 6) * MIN; if (!lastSpoke) return void sayKind('hello');
      if (pet.todayMin >= 50 && now - restSaid > 50 * MIN) { restSaid = now; sayKind('rest'); return; }
      sayKind(['navigate', 'build', 'motivate', 'music', 'motivate'][Math.floor(Math.random() * 5)]);
    }
  }

  /* ---- the frames: at most fifteen a second, none while the tab is hidden ---- */
  function frame(ts) {
    raf = requestAnimationFrame(frame); if (!ui || ts - lastFrame < 66) return; lastFrame = ts;
    const d = dpr(), c = ui.ctx, t = ts / 1000; c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, SIZE, SIZE);
    if (act.action === 'stroll') { stroll += strollDir * 1.2; if (stroll < -70 || stroll > 0) { strollDir *= -1; stroll = Math.max(-70, Math.min(0, stroll)); } ui.cv.style.transform = 'translateX(' + stroll + 'px)'; }
    const blink = (t % 4.2) < 0.13, mood = pet.mood < 30 ? 'sad' : pet.mood > 80 ? 'happy' : 'ok';
    B.draw(c, cfg.who, SIZE / 2, SIZE - 10, 0.95 * (cfg.scale || 1), { action: act.action, t: reduce ? t * 0.3 : t, blink, mood, talk: !!(ui.hideAt && Date.now() < ui.hideAt - 2500), stage: B.stageOf(pet.focusMin), hearts: pet.mood > 85 && act.action === 'idle' });
  }
  function startDraw() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  function stopLoops() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopLoops(); savePet(true); } else if (shown) startDraw(); });
  window.addEventListener('pagehide', () => savePet(true));
  window.addEventListener('resize', place);

  /* ---- settings: the companion's own, plus the two switches everything on the page answers to ---- */
  function render(s) {
    cfg = Object.assign({}, DEFAULTS, s.buddy); if (!petLoaded) loadPet(s.buddyPet);
    const want = !!(s.enabled !== false && !s.peek && cfg.enabled);
    if (!want) { if (shown) { shown = false; savePet(true); remove(); clearInterval(ticker); ticker = 0; } return; }
    if (!shown) { shown = true; act.start = 0; nextChat = Date.now() + 4000; ticker = setInterval(tick, 500); tick(); }
    place(); paintMenu(); if (ui) ui.cv.setAttribute('aria-label', 'Your companion, ' + nameOf() + '. Click for options, drag to move.');
  }
  function read() { chrome.storage.local.get({ enabled: true, peek: false, buddy: {}, buddyPet: {} }, s => { if (!chrome.runtime.lastError) render(s); }); }
  read();
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && (changes.buddy || changes.enabled || changes.peek)) read(); });
})();
