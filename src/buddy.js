/* Pineapple Theme Studio · companion: the little friend floating on the page.
 *
 * It lives in a closed shadow root in the top frame, so the page cannot style
 * it and it cannot style the page. It floats anywhere on the screen, mostly
 * along the edges, and glides slowly; it draws only while the tab is visible,
 * at fifteen frames a second at most, and holds still under reduced motion.
 * It watches only that you are here (scrolling, typing, pointing), never what
 * you type, and keeps nothing but a mood and minutes.
 *
 * Click it and a chat opens: its messages, yours, and replies to tap. With no
 * model it answers from its own lines. With a model tied in, a message goes to
 * the background page, which hands it to a program on this computer through
 * the browser's native messaging. It can speak, too: with this computer's own
 * voices, or a neural voice the helper runs. Nothing here opens a connection. */
'use strict';
(function () {
  if (window.top !== window || !self.NWB || typeof chrome === 'undefined' || !chrome.storage) return;
  const B = self.NWB, MIN = 60000, SIZE = 120, PANEL_W = 296, EDGE = 10;
  const DEFAULTS = B.DEFAULTS;
  const reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let cfg = Object.assign({}, DEFAULTS), shown = false, ui = null, raf = 0, ticker = 0, lastDraw = 0;
  let pet = { mood: 70, focusMin: 0, today: '', todayMin: 0, lastSeen: 0 }, petLoaded = false, petDirty = false, petSavedAt = 0;
  let act = { action: 'idle', start: 0, dur: 5000 }, lastActive = Date.now(), nudges = 0, lastSpoke = 0, nextChat = 0, minuteAt = Date.now(), restSaid = 0;
  let pos = null, move = null, sway = 0, swayDir = -1, path = location.pathname, typing = false, talkUntil = 0;
  const thread = [];   /* this page's conversation, newest last; it goes when the tab does */

  const onProject = () => /^\/projects?\/[^/]+/.test(location.pathname);
  const today = () => new Date().toISOString().slice(0, 10);
  const project = () => { const h = document.querySelector('h1'); return h ? h.textContent.trim().slice(0, 100) : ''; };
  /* the section you are reading: the last heading above the middle of the window */
  function section() { const hs = document.querySelectorAll('h2, h3'); let best = ''; for (let i = 0; i < hs.length; i++) { const r = hs[i].getBoundingClientRect(); if (r.top < window.innerHeight * 0.45) best = hs[i].textContent.trim(); } return best.slice(0, 80); }
  const who = () => B.get(cfg.who), nameOf = () => cfg.name || who().name;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---- the look: dark glass, a neon edge in the companion's own colour ---- */
  const CSS = ':host { all: initial; }' +
    '.wrap { position: fixed; left: 0; top: 0; z-index: 2147483000; width: ' + SIZE + 'px; height: ' + SIZE + 'px; pointer-events: none; font: 500 13px/1.45 ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif; color: #eef3ff; }' +
    'canvas { display: block; width: ' + SIZE + 'px; height: ' + SIZE + 'px; pointer-events: auto; cursor: grab; touch-action: none; transition: filter .3s; }' +
    'canvas:hover { filter: drop-shadow(0 0 10px color-mix(in srgb, var(--acc) 55%, transparent)); }' +
    '.glass { background: linear-gradient(160deg, rgba(30,34,56,.88), rgba(12,14,26,.9)); backdrop-filter: blur(14px) saturate(140%); -webkit-backdrop-filter: blur(14px) saturate(140%); border: 1px solid color-mix(in srgb, var(--acc) 42%, transparent); box-shadow: 0 10px 34px rgba(0,0,0,.42), 0 0 22px -8px var(--acc), inset 0 1px 0 rgba(255,255,255,.06); }' +
    '.msg { position: absolute; width: max-content; max-width: 250px; padding: 9px 13px 10px; border-radius: 18px; pointer-events: auto; opacity: 0; transform: translateY(6px) scale(.96); transition: opacity .22s, transform .22s; cursor: pointer; }' +
    '.msg[data-on="0"], .msg:not([data-on]) { pointer-events: none; }' +
    '.msg[data-on="1"] { opacity: 1; transform: none; } .msg[data-tail="l"] { border-bottom-left-radius: 6px; } .msg[data-tail="r"] { border-bottom-right-radius: 6px; } .msg[data-below="1"][data-tail="l"] { border-radius: 6px 18px 18px 18px; } .msg[data-below="1"][data-tail="r"] { border-radius: 18px 6px 18px 18px; }' +
    '.who { display: block; font: 700 9.5px/1 ui-monospace, "Cascadia Code", Consolas, monospace; letter-spacing: .14em; text-transform: uppercase; color: var(--acc); margin-bottom: 4px; }' +
    '.dots { display: inline-flex; gap: 4px; padding: 4px 2px; } .dots i { width: 6px; height: 6px; border-radius: 50%; background: var(--acc); opacity: .35; animation: blip 1.2s infinite; } .dots i:nth-child(2) { animation-delay: .15s; } .dots i:nth-child(3) { animation-delay: .3s; }' +
    '@keyframes blip { 0%, 60%, 100% { opacity: .3; transform: none; } 30% { opacity: 1; transform: translateY(-3px); } }' +
    '.panel { position: absolute; width: ' + PANEL_W + 'px; max-height: min(430px, 72vh); display: flex; flex-direction: column; border-radius: 20px; overflow: hidden; pointer-events: auto; animation: pop .2s ease-out; }' +
    '.panel[hidden] { display: none; } @keyframes pop { from { opacity: 0; transform: scale(.94); } }' +
    '.head { display: flex; align-items: center; gap: 9px; padding: 10px 10px 10px 13px; border-bottom: 1px solid rgba(255,255,255,.07); background: linear-gradient(90deg, color-mix(in srgb, var(--acc) 20%, transparent), transparent 70%); }' +
    '.led { width: 8px; height: 8px; border-radius: 50%; background: var(--acc); box-shadow: 0 0 10px var(--acc); flex: none; }' +
    '.head b { display: block; font: 700 13.5px/1.1 ui-sans-serif, system-ui, sans-serif; } .head small { display: block; font: 500 10px/1.2 ui-monospace, Consolas, monospace; color: #9aa6c8; letter-spacing: .05em; margin-top: 2px; }' +
    '.head button { margin-left: auto; width: 28px; height: 28px; border-radius: 50%; border: 1px solid rgba(255,255,255,.12); background: rgba(255,255,255,.05); color: #c9d4f0; font: 600 15px/1 system-ui; cursor: pointer; flex: none; }' +
    '.thread { flex: 1; min-height: 60px; overflow-y: auto; padding: 10px 12px 4px; display: flex; flex-direction: column; gap: 6px; scrollbar-width: thin; scrollbar-color: rgba(255,255,255,.2) transparent; }' +
    '.b { max-width: 84%; padding: 8px 11px; border-radius: 16px; font-size: 13px; line-height: 1.42; overflow-wrap: anywhere; }' +
    '.b.them { align-self: flex-start; background: rgba(255,255,255,.075); border: 1px solid rgba(255,255,255,.08); border-bottom-left-radius: 5px; }' +
    '.b.me { align-self: flex-end; background: linear-gradient(135deg, var(--acc), var(--acc2)); color: #0b0d18; font-weight: 600; border-bottom-right-radius: 5px; }' +
    '.chips { display: flex; flex-wrap: wrap; gap: 6px; padding: 8px 12px 2px; }' +
    'button { font: 600 11.5px/1 ui-sans-serif, system-ui, sans-serif; cursor: pointer; }' +
    '.chips button { padding: 7px 10px; border-radius: 999px; border: 1px solid color-mix(in srgb, var(--acc) 50%, transparent); background: rgba(255,255,255,.04); color: #e6f6ff; }' +
    '.chips button:hover { background: color-mix(in srgb, var(--acc) 22%, transparent); }' +
    'form { display: flex; gap: 6px; padding: 8px 10px 10px; }' +
    'input { flex: 1; min-width: 0; font: 500 13px/1.2 ui-sans-serif, system-ui, sans-serif; padding: 9px 13px; border-radius: 999px; border: 1px solid rgba(255,255,255,.14); background: rgba(0,0,0,.35); color: #eef3ff; }' +
    'input::placeholder { color: #8f9bbc; } input:disabled { opacity: .55; }' +
    '.send { border: 0; border-radius: 999px; padding: 0 15px; background: linear-gradient(135deg, var(--acc), var(--acc2)); color: #0b0d18; font-weight: 800; }' +
    '.send:disabled { opacity: .45; cursor: default; }' +
    'button:focus-visible, input:focus-visible, canvas:focus-visible { outline: 2px solid var(--acc); outline-offset: 2px; }' +
    '@media (prefers-reduced-motion: reduce) { * { animation: none !important; transition: none !important; } }';
  function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
  const dots = () => { const d = el('span', 'dots'); d.appendChild(el('i')); d.appendChild(el('i')); d.appendChild(el('i')); return d; };
  function build() {
    const hostEl = document.createElement('div'); hostEl.id = 'nwt-buddy'; const root = hostEl.attachShadow({ mode: 'closed' });
    const style = el('style'); style.textContent = CSS; const wrap = el('div', 'wrap');
    const cv = el('canvas'); cv.width = SIZE * dpr(); cv.height = SIZE * dpr(); cv.setAttribute('role', 'button'); cv.tabIndex = 0;
    const msg = el('div', 'msg glass'); msg.setAttribute('role', 'status'); msg.setAttribute('aria-live', 'polite'); const mWho = el('span', 'who'); const mText = el('span'); msg.appendChild(mWho); msg.appendChild(mText);
    const panel = el('div', 'panel glass'); panel.hidden = true; panel.setAttribute('role', 'dialog');
    const head = el('div', 'head'); const led = el('span', 'led'); const ht = el('div'); const hName = el('b'); const hSub = el('small'); ht.appendChild(hName); ht.appendChild(hSub); const close = el('button', null, '×'); close.type = 'button'; close.setAttribute('aria-label', 'Close'); head.appendChild(led); head.appendChild(ht); head.appendChild(close);
    const list = el('div', 'thread'); list.setAttribute('aria-live', 'polite'); const chips = el('div', 'chips');
    const form = el('form'); const input = el('input'); input.type = 'text'; input.maxLength = 300; const send = el('button', 'send', 'Send'); send.type = 'submit'; form.appendChild(input); form.appendChild(send);
    panel.appendChild(head); panel.appendChild(list); panel.appendChild(chips); panel.appendChild(form);
    wrap.appendChild(panel); wrap.appendChild(msg); wrap.appendChild(cv); root.appendChild(style); root.appendChild(wrap); (document.body || document.documentElement).appendChild(hostEl);
    ui = { hostEl, wrap, cv, ctx: cv.getContext('2d'), msg, mWho, mText, panel, hName, hSub, list, chips, form, input, send, close, hideAt: 0 };
    wire(); theme(); place(); paintPanel(); thread.forEach(m => addBubble(m));
  }
  const dpr = () => Math.min(2, Math.max(1, window.devicePixelRatio || 1));
  function remove() { if (ui) { ui.hostEl.remove(); ui = null; } stopLoops(); move = null; }
  function theme() { if (!ui) return; const p = who(); ui.wrap.style.setProperty('--acc', p.accent || '#5ef0ff'); ui.wrap.style.setProperty('--acc2', p.accent2 || '#b06cff'); }

  /* ---- where it is: anywhere on the screen, kept on it when the window changes ---- */
  function home() { const vw = window.innerWidth, vh = window.innerHeight; return cfg.x == null || cfg.y == null ? { x: vw - SIZE - 22, y: vh - SIZE - 18 } : { x: cfg.x * vw, y: cfg.y * vh }; }
  function setPos(p) { const vw = window.innerWidth, vh = window.innerHeight; pos = { x: clamp(p.x, EDGE, vw - SIZE - EDGE), y: clamp(p.y, EDGE, vh - SIZE - EDGE) }; if (ui) { ui.wrap.style.transform = 'translate(' + Math.round(pos.x) + 'px,' + Math.round(pos.y) + 'px)'; layout(); } }
  function place() { setPos(pos || home()); }
  /* somewhere to drift to: mostly along an edge, now and then anywhere */
  function roamTarget(r) { const vw = window.innerWidth, vh = window.innerHeight, mx = vw - SIZE - EDGE, my = vh - SIZE - EDGE, band = 0.18;
    if (r < 0.8) { const side = Math.floor(r / 0.2), t = Math.random(); if (side === 0) return { x: EDGE + Math.random() * vw * band, y: EDGE + t * (my - EDGE) }; if (side === 1) return { x: mx - Math.random() * vw * band, y: EDGE + t * (my - EDGE) }; if (side === 2) return { x: EDGE + t * (mx - EDGE), y: EDGE + Math.random() * vh * band }; return { x: EDGE + t * (mx - EDGE), y: my - Math.random() * vh * band }; }
    return { x: EDGE + Math.random() * (mx - EDGE), y: EDGE + Math.random() * (my - EDGE) }; }
  function glideTo(t, speed) { if (!pos) return; const d = Math.hypot(t.x - pos.x, t.y - pos.y); if (d < 4) return; move = { fx: pos.x, fy: pos.y, tx: t.x, ty: t.y, start: performance.now(), dur: clamp(d / (speed || 70) * 1000, 600, 14000) }; }

  /* the chat and the single bubble sit beside it, on whichever side has room */
  function layout() {
    if (!ui || !pos) return; const vw = window.innerWidth, vh = window.innerHeight, cx = pos.x + SIZE / 2, right = cx > vw / 2;
    if (!ui.panel.hidden) { const ph = ui.panel.offsetHeight || 380; let lx = right ? SIZE / 2 - PANEL_W + 14 : SIZE / 2 - 14, ty = pos.y > vh / 2 ? -ph + 18 : SIZE - 14; lx = clamp(pos.x + lx, EDGE, vw - PANEL_W - EDGE) - pos.x; ty = clamp(pos.y + ty, EDGE, vh - ph - EDGE) - pos.y; ui.panel.style.left = lx + 'px'; ui.panel.style.top = ty + 'px'; }
    const mw = ui.msg.offsetWidth || 200, mh = ui.msg.offsetHeight || 50, below = pos.y < mh + 24; let mx = right ? SIZE / 2 + 18 - mw : SIZE / 2 - 18; mx = clamp(pos.x + mx, EDGE, vw - mw - EDGE) - pos.x;
    ui.msg.style.left = mx + 'px'; ui.msg.style.top = (below ? SIZE - 6 : -mh + 10) + 'px'; ui.msg.setAttribute('data-tail', right ? 'r' : 'l'); ui.msg.setAttribute('data-below', below ? '1' : '0');
  }

  /* ---- talking: every line goes into the chat; while the chat is closed it also pops up as a bubble ---- */
  function addBubble(m) { if (!ui) return; const b = el('div', 'b ' + m.from, m.text); const typingEl = ui.list.querySelector('.typing'); ui.list.insertBefore(b, typingEl); while (ui.list.children.length > 30) ui.list.removeChild(ui.list.firstChild); ui.list.scrollTop = ui.list.scrollHeight; }
  function post(from, text) { const m = { from, text }; thread.push(m); if (thread.length > 30) thread.shift(); addBubble(m); }
  function popBubble(fill, ms) { if (!ui || !ui.panel.hidden) return; ui.mWho.textContent = nameOf(); while (ui.mText.firstChild) ui.mText.removeChild(ui.mText.firstChild); if (typeof fill === 'string') ui.mText.textContent = fill; else ui.mText.appendChild(fill); ui.msg.setAttribute('data-on', '1'); ui.hideAt = Date.now() + ms; layout(); }
  function say(text, opts) {
    if (!text) return; opts = opts || {}; post('them', text); lastSpoke = Date.now(); nextChat = Math.max(nextChat, lastSpoke + 2 * MIN);
    popBubble(text, Math.max(5000, text.length * 75)); talkUntil = Date.now() + Math.min(6000, 600 + text.length * 55);
    if (opts.speak !== false) speak(text);
  }
  function sayKind(kind) { say(B.line(kind, cfg.who, { project: project(), today: pet.todayMin, total: pet.focusMin })); }
  function setTyping(on) {
    typing = on; if (!ui) return; const old = ui.list.querySelector('.typing'); if (old) old.remove();
    if (on) { const b = el('div', 'b them typing'); b.appendChild(dots()); ui.list.appendChild(b); ui.list.scrollTop = ui.list.scrollHeight; popBubble(dots(), 60000); }
    else if (ui.panel.hidden) { ui.msg.setAttribute('data-on', '0'); ui.hideAt = 0; }
  }
  function setAction(action, dur) { act = { action, start: Date.now(), dur: dur || (B.ACTIONS[action] ? B.ACTIONS[action].dur[0] : 3000) }; }

  /* ---- its voice: this computer's own voices, or a neural one the helper runs; never a voice that needs the internet ---- */
  let audio = null;
  function speak(text) {
    if (cfg.voice !== 'system' && cfg.voice !== 'model') return; const clean = text.replace(/\*[^*]*\*/g, ' ').replace(/[‘’]/g, '\'').replace(/\s+/g, ' ').trim(); if (!clean) return;
    if (cfg.voice === 'model') { try { chrome.runtime.sendMessage({ type: 'buddy:speak', text: clean.slice(0, 220) }, res => { if (chrome.runtime.lastError || !res || !res.ok || !res.audio) { systemSpeak(clean); return; } play(res.audio); }); } catch (e) { systemSpeak(clean); } return; }
    systemSpeak(clean);
  }
  function systemSpeak(text, retried) {
    const ss = window.speechSynthesis; if (!ss) return; const local = ss.getVoices().filter(v => v.localService);   /* only voices that run on this computer: an online voice would send the text away */
    if (!local.length) { if (!retried) ss.addEventListener('voiceschanged', () => systemSpeak(text, true), { once: true }); return; }
    const voice = local.find(v => v.name === cfg.voiceName) || local.find(v => /^en/i.test(v.lang)) || local[0], st = who().speech || {};
    const u = new SpeechSynthesisUtterance(text); u.voice = voice; u.rate = st.rate || 1; u.pitch = st.pitch || 1; ss.cancel(); ss.speak(u);
  }
  function play(b64) { try { audio = audio || new AudioContext(); const bin = atob(b64), buf = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i); audio.decodeAudioData(buf.buffer).then(ab => { const src = audio.createBufferSource(); src.buffer = ab; src.connect(audio.destination); src.start(); }, () => {}); } catch (e) { /* no sound this time */ } }

  /* ---- the chat: a header, the conversation, replies to tap, and a box when a model is tied in ---- */
  function paintPanel() {
    if (!ui) return; ui.hName.textContent = nameOf(); ui.hSub.textContent = cfg.linked ? 'local model · on this computer' : 'offline · its own lines';
    while (ui.chips.firstChild) ui.chips.removeChild(ui.chips.firstChild);
    const voiceOn = cfg.voice === 'system' || cfg.voice === 'model';
    const chips = [['Where am I?', whereAmI], ['How am I doing?', () => { post('me', 'How am I doing?'); sayKind('build'); }], ['Focus music', () => { post('me', 'Focus music?'); sayKind('music'); }], ['Pet', () => { pet.mood = Math.min(100, pet.mood + 6); petDirty = true; setAction('cheer'); sayKind('pet'); }]];
    if (voiceOn || cfg.lastVoice) chips.push([voiceOn ? 'Mute' : 'Voice on', () => saveCfg(voiceOn ? { voice: 'off', lastVoice: cfg.voice } : { voice: cfg.lastVoice || 'system' })]);
    chips.push(['Hide for an hour', () => saveCfg({ snoozeUntil: Date.now() + 60 * MIN })]);
    chips.forEach(([label, fn]) => { const b = el('button', null, label); b.type = 'button'; b.addEventListener('click', fn); ui.chips.appendChild(b); });
    ui.input.disabled = !cfg.linked; ui.send.disabled = !cfg.linked; ui.input.placeholder = cfg.linked ? 'Message ' + nameOf() : 'Tie in a model to chat (Companion tab)';
  }
  function openPanel(open) { if (!ui) return; ui.panel.hidden = !open; if (open) { ui.msg.setAttribute('data-on', '0'); ui.hideAt = 0; move = null; layout(); ui.list.scrollTop = ui.list.scrollHeight; if (!thread.length) sayKind('hello'); if (cfg.linked) ui.input.focus(); if (act.action === 'nap') { setAction('wave'); sayKind('back'); } } }
  function whereAmI() { post('me', 'Where am I?'); const p = project(), sec = section(); if (!onProject()) { say(p ? 'You’re on ' + p + '. Open a project and I’ll keep you on track.' : 'Open a project and I’ll keep you on track.'); return; } say(sec ? 'You’re on ' + (p || 'this project') + ', reading “' + sec + '”.' : B.line('navigate', cfg.who, { project: p })); }

  /* a message for the model on this computer; the page and section go with it so the answer is about where you are */
  function askModel(q) {
    post('me', q); setAction('think'); setTyping(true);
    const msg = { type: 'buddy:ask', question: q, persona: { name: nameOf(), voice: who().voice }, page: { project: project(), section: section(), onProject: onProject(), path: location.pathname.slice(0, 120) }, stats: { today: pet.todayMin, total: pet.focusMin, mood: Math.round(pet.mood) } };
    const done = text => { setTyping(false); setAction('wave'); say(text); };
    try { chrome.runtime.sendMessage(msg, reply => { if (chrome.runtime.lastError || !reply) { done('I couldn’t reach my model. Check the Companion tab in the extension.'); return; } done(reply.ok ? String(reply.text || '').slice(0, 400) : (reply.error || 'My model didn’t answer. Try again in a moment.')); }); }
    catch (e) { done('I couldn’t reach my model just now.'); }
  }

  function wire() {
    let down = null, moved = false;
    ui.cv.addEventListener('pointerdown', e => { down = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y }; moved = false; move = null; ui.cv.setPointerCapture(e.pointerId); });
    ui.cv.addEventListener('pointermove', e => { if (!down) return; const dx = e.clientX - down.x, dy = e.clientY - down.y; if (!moved && Math.hypot(dx, dy) < 5) return; moved = true; setPos({ x: down.px + dx, y: down.py + dy }); });
    ui.cv.addEventListener('pointerup', () => { if (!down) return; const wasMoved = moved; down = null; if (wasMoved) { saveCfg({ x: pos.x / window.innerWidth, y: pos.y / window.innerHeight }); return; } openPanel(ui.panel.hidden); });
    ui.cv.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openPanel(ui.panel.hidden); } });
    ui.cv.addEventListener('dblclick', () => { saveCfg({ x: null, y: null }); pos = null; place(); });
    ui.close.addEventListener('click', () => openPanel(false));
    ui.panel.addEventListener('keydown', e => { if (e.key === 'Escape') { openPanel(false); ui.cv.focus(); } });
    ui.form.addEventListener('submit', e => { e.preventDefault(); const q = ui.input.value.trim(); if (!q || !cfg.linked || typing) return; ui.input.value = ''; askModel(q); });
    ui.msg.addEventListener('click', () => openPanel(true));
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

  /* ---- the tick: twice a second, decide; the frames only draw and glide ---- */
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
    if (ui && ui.hideAt && now > ui.hideAt) { ui.msg.setAttribute('data-on', '0'); ui.hideAt = 0; }
    if (now - act.start > act.dur || (act.action === 'nap' && idle < 15 * MIN)) {
      const next = B.pickAction({ idleMs: idle, onProject: onProject(), nudgeMin: cfg.quiet ? 0 : cfg.nudgeMin, nudges, reduce });
      setAction(next.action, next.dur);
      const roam = cfg.roam && !reduce && ui && ui.panel.hidden;
      if (next.action === 'stroll' && roam) glideTo(roamTarget(Math.random()), 60);   /* off it drifts, somewhere along the edge of your screen */
      if (next.action === 'nudge') { nudges++; sayKind('nudge'); if (roam) { const vw = window.innerWidth, vh = window.innerHeight; glideTo({ x: vw * (0.35 + Math.random() * 0.3) - SIZE / 2, y: vh * 0.62 - SIZE / 2 }, 140); } }   /* and comes closer to get your attention */
    }
    /* now and then, unasked, a line about you and your build; never while you are away, never in quiet mode, never over a line still being read */
    if (!cfg.quiet && idle < MIN && now > nextChat && act.action !== 'think' && ui && !ui.hideAt && ui.panel.hidden) {
      nextChat = now + (6 + Math.random() * 6) * MIN; if (!lastSpoke) { sayKind('hello'); return; }
      if (pet.todayMin >= 50 && now - restSaid > 50 * MIN) { restSaid = now; sayKind('rest'); return; }
      sayKind(['navigate', 'build', 'motivate', 'music', 'motivate'][Math.floor(Math.random() * 5)]);
    }
  }

  /* ---- the frames: gliding every frame while it moves, drawing at most fifteen a second, nothing while the tab is hidden ---- */
  function frame(ts) {
    raf = requestAnimationFrame(frame); if (!ui) return;
    if (move) { const k = clamp((ts - move.start) / move.dur, 0, 1), e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; setPos({ x: move.fx + (move.tx - move.fx) * e, y: move.fy + (move.ty - move.fy) * e }); if (k >= 1) move = null; }
    if (ts - lastDraw < 66) return; lastDraw = ts;
    if (!cfg.roam && act.action === 'stroll' && !reduce) { sway += swayDir * 1.2; if (sway < -40 || sway > 0) { swayDir *= -1; sway = clamp(sway, -40, 0); } } else sway *= 0.85;   /* pinned in place: a small sway instead of a journey */
    const d = dpr(), c = ui.ctx, t = ts / 1000; c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, SIZE, SIZE);
    const p = who(), acc = p.accent || '#5ef0ff', cx = SIZE / 2 + sway, gy = SIZE - 9, pulse = 0.55 + Math.sin(t * 2.2) * 0.15;
    const g = c.createRadialGradient(cx, gy, 2, cx, gy, 30); g.addColorStop(0, acc); g.addColorStop(1, 'rgba(0,0,0,0)'); c.globalAlpha = 0.28 * pulse + (move ? 0.15 : 0); c.fillStyle = g; c.beginPath(); c.ellipse(cx, gy, 30, 7, 0, 0, Math.PI * 2); c.fill();   /* the hover pad: a ring of its colour under its feet */
    c.globalAlpha = 0.7 * pulse; c.strokeStyle = acc; c.lineWidth = 1.2; c.beginPath(); c.ellipse(cx, gy, 22, 5, 0, 0, Math.PI * 2); c.stroke();
    if (move) for (let i = 1; i <= 3; i++) { c.globalAlpha = 0.25 / i; c.fillStyle = acc; c.beginPath(); c.arc(cx - Math.sign(move.tx - move.fx) * i * 9, gy - 18 - i * 2, 3 - i * 0.6, 0, Math.PI * 2); c.fill(); }   /* a faint trail while it glides */
    c.globalAlpha = 1;
    const blink = (t % 4.2) < 0.13, mood = pet.mood < 30 ? 'sad' : pet.mood > 80 ? 'happy' : 'ok', shown2 = move ? 'hop' : (act.action === 'stroll' ? 'idle' : act.action);
    B.draw(c, cfg.who, cx, SIZE - 10, 0.95 * (cfg.scale || 1), { action: shown2, t: reduce ? t * 0.3 : t, blink, mood, talk: Date.now() < talkUntil, stage: B.stageOf(pet.focusMin), hearts: pet.mood > 85 && act.action === 'idle' && !move });
  }
  function startDraw() { if (!raf && !document.hidden) raf = requestAnimationFrame(frame); }
  function stopLoops() { if (raf) { cancelAnimationFrame(raf); raf = 0; } }
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopLoops(); savePet(true); if (window.speechSynthesis) window.speechSynthesis.cancel(); } else if (shown) startDraw(); });
  window.addEventListener('pagehide', () => savePet(true));
  window.addEventListener('resize', () => { if (pos) setPos(pos); });

  /* ---- settings: the companion's own, plus the two switches everything on the page answers to ---- */
  function render(s) {
    const was = cfg; cfg = Object.assign({}, DEFAULTS, s.buddy); if (!petLoaded) loadPet(s.buddyPet);
    const want = !!(s.enabled !== false && !s.peek && cfg.enabled);
    if (!want) { if (shown) { shown = false; savePet(true); remove(); clearInterval(ticker); ticker = 0; } return; }
    if (!shown) { shown = true; act.start = 0; nextChat = Date.now() + 4000; ticker = setInterval(tick, 500); tick(); }
    if (was.x !== cfg.x || was.y !== cfg.y) pos = cfg.x == null ? null : { x: cfg.x * window.innerWidth, y: cfg.y * window.innerHeight };
    if (!cfg.roam) move = null;
    theme(); place(); paintPanel(); if (ui) ui.cv.setAttribute('aria-label', 'Your companion, ' + nameOf() + '. Press to chat, drag to move.');
  }
  function read() { chrome.storage.local.get({ enabled: true, peek: false, buddy: {}, buddyPet: {} }, s => { if (!chrome.runtime.lastError) render(s); }); }
  read();
  chrome.storage.onChanged.addListener((changes, area) => { if (area === 'local' && (changes.buddy || changes.enabled || changes.peek)) read(); });
})();
