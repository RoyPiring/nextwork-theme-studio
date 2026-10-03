/* Pineapple Theme Studio · companion: who they are, how they are drawn, and
 * what they decide to do next.
 *
 * Pure: no storage, no page. The on-page companion (buddy.js) and the popup
 * both draw from here, and the tests drive the decisions without a browser.
 * Each companion is drawn on a canvas with its feet at (x, y); at scale 1 it
 * stands about eighty pixels tall. Light comes from the upper left.
 *
 * Internally this feature is "buddy", because "companion" already names the
 * pane that sits beside the page. */
'use strict';
(function () {
  const PRESETS = [
    { id: 'king', name: 'Pineapple King', title: 'Ruler of your build',
      blurb: 'Regal, warm, a little dramatic. Rules over every project you finish.',
      voice: 'a cheerful pineapple king who speaks with gentle royal flair',
      tag: 'By royal decree: ', accent: '#ffc531', accent2: '#ff7a3c', speech: { rate: 0.95, pitch: 0.8 } },
    { id: 'nabi', name: 'Nabi', title: 'The little fairy',
      blurb: 'A tiny fairy with butterfly wings. Light, kind and quick to cheer.',
      voice: 'a tiny, kind fairy named Nabi who is bright and encouraging',
      tag: '', accent: '#ff8fd8', accent2: '#9f86f0', speech: { rate: 1.08, pitch: 1.6 } },
    { id: 'slime', name: 'Bloop', title: 'A bouncy slime',
      blurb: 'A happy blob of jelly. Bounces when you make progress, droops when you drift.',
      voice: 'a bouncy, simple, happy slime who speaks in short playful bursts',
      tag: '*bloop* ', accent: '#5ef0c8', accent2: '#3fa3ff', speech: { rate: 1.12, pitch: 1.35 } },
    { id: 'robot', name: 'NextWork Robot', title: 'The professor bot',
      blurb: 'A sage little robot in a graduation cap. Calm, precise, quietly proud of you.',
      voice: 'a calm, wise robot professor from NextWork who keeps learners on track',
      tag: 'Professor’s note: ', accent: '#5ee4ff', accent2: '#5b7cff', speech: { rate: 0.95, pitch: 0.7 } },
    { id: 'ember', name: 'Ember', title: 'A dragon egg that hatches as you learn',
      blurb: 'Starts as an egg. An hour of focus hatches it; ten hours and it has wings.',
      voice: 'a small, brave baby dragon who grows stronger every time the learner focuses',
      tag: '*chirp* ', accent: '#ff9a3c', accent2: '#ff4f6d', speech: { rate: 1.05, pitch: 1.25 } }
  ];
  const byId = {}; PRESETS.forEach(p => { byId[p.id] = p; });
  const get = id => byId[id] || byId.king;

  /* ---- what a companion does: a handful of actions, none of them loud ---- */
  const MIN = 60000;
  const ACTIONS = {
    idle: { dur: [4000, 8000] },
    look: { dur: [2500, 3500] },
    stroll: { dur: [4000, 6000], moves: true },
    hop: { dur: [1100, 1300], moves: true },
    wave: { dur: [1800, 2200] },
    peek: { dur: [2500, 3200] },
    cheer: { dur: [2200, 2600] },
    nudge: { dur: [4500, 5000] },
    think: { dur: [60000, 60000] },
    nap: { dur: [60000, 60000] }
  };
  /* Ember grows with focused minutes: an egg, a hatchling at an hour, a young dragon at ten. */
  const stageOf = focusMin => (focusMin >= 600 ? 2 : focusMin >= 60 ? 1 : 0);

  /* The next thing to do. c: { idleMs, onProject, nudgeMin (0 is off), nudges (already given this idle spell),
   * reduce (reduced motion), r (a random number in [0,1)) }. Returns { action, dur }. */
  function pickAction(c) {
    const r = c.r == null ? Math.random() : c.r, span = a => { const d = ACTIONS[a].dur; return Math.round(d[0] + (d[1] - d[0]) * r); };
    if (c.idleMs >= 15 * MIN) return { action: 'nap', dur: span('nap') };   /* you have gone: it sleeps until you are back */
    if (c.onProject && c.nudgeMin > 0 && c.idleMs >= c.nudgeMin * MIN * ((c.nudges | 0) + 1) && (c.nudges | 0) < 3) return { action: 'nudge', dur: span('nudge') };
    const pool = c.reduce ? [['idle', 6], ['look', 3], ['wave', 1], ['peek', 1]] : [['idle', 5], ['look', 2], ['stroll', 2], ['hop', 1], ['wave', 1], ['peek', 1]];
    const total = pool.reduce((a, p) => a + p[1], 0); let x = r * total;
    for (let i = 0; i < pool.length; i++) { x -= pool[i][1]; if (x < 0) return { action: pool[i][0], dur: span(pool[i][0]) }; }
    return { action: 'idle', dur: span('idle') };
  }

  /* ---- what it says when there is no model: short, about you and your build, never a lecture ---- */
  const LINES = {
    hello: ['Hi! I’ll keep you company while you build.', 'Ready when you are.', 'Let’s make some progress.'],
    back: ['Welcome back!', 'There you are. Where were we?', 'Back at it. Nice.'],
    nudge: ['Get back to work!', 'Still with me? Your project is waiting.', 'The next step won’t build itself.', 'Five more minutes of focus. You can do it.'],
    navigate: ['You’re on {project}. Pick up at the step you left.', 'Lost your place? Scroll to the last step you finished and read on from there.', 'Stuck? Re-read the step’s last paragraph, then try it once more.'],
    build: ['{today} minutes of building today.', 'You’ve focused {today} minutes today. Keep the streak.', 'That’s {total} minutes of focus together so far.'],
    motivate: ['One more step, then a stretch.', 'Small steps still count.', 'Every project you finish builds the next one.', 'You’re closer than when you started.'],
    music: ['Focus music idea: lo-fi beats, keep it wordless.', 'Try brown noise or rain sounds for deep focus.', 'A video game soundtrack is built for focus. Try one.', 'Classical piano works well while you read steps.'],
    rest: ['You’ve been at it for a while. Stand up for two minutes.', 'Time for water and a stretch.'],
    pet: ['Hehe, thank you!', 'That made my day.', 'Again! Again!'],
    hatch: ['The egg is cracking!', 'I hatched! Thank you for all that focus.', 'Look, wings! We did that together.']
  };
  /* A line of a kind, filled in from what the companion knows. Every few lines carry the companion's own tag. */
  function line(kind, who, c, r) {
    const bank = LINES[kind] || LINES.motivate, k = r == null ? Math.random() : r, p = get(who);
    let s = bank[Math.floor(k * bank.length) % bank.length];
    s = s.replace('{project}', (c && c.project) || 'this project').replace('{today}', String((c && c.today) | 0)).replace('{total}', String((c && c.total) | 0));
    return (k < 0.34 && p.tag && kind !== 'pet' ? p.tag : '') + s;
  }

  /* ==================== the drawing ==================== */
  function blob(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, c, rot) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); ctx.fill(); }
  function poly(ctx, pts, c) { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath(); ctx.fill(); }
  function ln(ctx, a, b, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  function grad(ctx, x, y, r, c0, c1) { const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.45, r * 0.1, x, y, r); g.addColorStop(0, c0); g.addColorStop(1, c1); return g; }
  function glow(ctx, x, y, r, c, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }

  /* the face every companion shares: eyes that blink and sleep, a mouth that talks, cheeks */
  function face(ctx, x, y, s, p, o) {
    o = o || {}; const dx = (o.dx || 5.5) * s, r = (o.r || 2.3) * s, ink = o.ink || '#2a1d0e', lx = (p.look || 0) * 1.4 * s;
    if (p.sleep || p.blink) { ctx.strokeStyle = ink; ctx.lineWidth = 1.3 * s; [-1, 1].forEach(d => { ctx.beginPath(); ctx.arc(x + d * dx, y, r * 0.9, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }); }
    else [-1, 1].forEach(d => { ell(ctx, x + d * dx + lx, y, r, r * 1.2, ink); blob(ctx, x + d * dx + lx - r * 0.35, y - r * 0.45, r * 0.38, '#ffffff'); });
    if (o.cheeks !== false) [-1, 1].forEach(d => ell(ctx, x + d * (dx + 3.2 * s), y + 3 * s, 2.2 * s, 1.3 * s, 'rgba(255,120,140,.45)'));
    const my = y + 4.5 * s; ctx.strokeStyle = ink; ctx.lineWidth = 1.2 * s;
    if (p.talk && !p.sleep) ell(ctx, x, my + 0.6 * s, 1.8 * s, (1.1 + Math.abs(Math.sin(p.t * 14)) * 1.2) * s, ink);
    else if (p.mood === 'sad') { ctx.beginPath(); ctx.arc(x, my + 2.5 * s, 2.4 * s, 1.15 * Math.PI, 1.85 * Math.PI); ctx.stroke(); }
    else { ctx.beginPath(); ctx.arc(x, my - 0.8 * s, (p.mood === 'happy' ? 2.8 : 2.2) * s, 0.15 * Math.PI, 0.85 * Math.PI); ctx.stroke(); }
  }
  /* an arm: from the shoulder, waving, raised, or resting */
  function arm(ctx, sx, sy, side, s, p, c, len) {
    const L = (len || 9) * s; let a = side > 0 ? 0.55 : Math.PI - 0.55;
    if (p.cheer) a = side > 0 ? -0.9 : Math.PI + 0.9;
    else if (p.wave && side > 0) a = -1.1 + Math.sin(p.t * 9) * 0.45;
    const hx = sx + Math.cos(a) * L, hy = sy + Math.sin(a) * L; ln(ctx, [sx, sy], [hx, hy], c, 3.4 * s); blob(ctx, hx, hy, 2.4 * s, c); return [hx, hy];
  }

  function king(ctx, x, y, s, p) {
    const sway = Math.sin(p.t * 2) * 1.5 * s, by = y - 25 * s;
    poly(ctx, [[x - 13 * s, by - 12 * s], [x + 13 * s, by - 12 * s], [x + 19 * s + sway, y - 3 * s], [x - 19 * s + sway, y - 3 * s]], '#b8352a');   /* the cape */
    poly(ctx, [[x - 13 * s, by - 12 * s], [x - 9 * s, by - 12 * s], [x - 15 * s + sway, y - 3 * s], [x - 19 * s + sway, y - 3 * s]], '#f4f1e8');
    ell(ctx, x - 6 * s, y - 2 * s, 4 * s, 2.4 * s, '#5a3a1e'); ell(ctx, x + 6 * s, y - 2 * s, 4 * s, 2.4 * s, '#5a3a1e');
    ctx.fillStyle = grad(ctx, x, by, 22 * s, '#ffd86b', '#e09a1c'); ctx.beginPath(); ctx.ellipse(x, by, 16.5 * s, 20 * s * p.sq, 0, 0, Math.PI * 2); ctx.fill();
    ctx.save(); ctx.beginPath(); ctx.ellipse(x, by, 16.5 * s, 20 * s * p.sq, 0, 0, Math.PI * 2); ctx.clip(); ctx.strokeStyle = 'rgba(150,85,10,.35)'; ctx.lineWidth = 0.9 * s;
    for (let d = -36; d < 36; d += 6) { ctx.beginPath(); ctx.moveTo(x + (d - 22) * s, by + 22 * s); ctx.lineTo(x + (d + 22) * s, by - 22 * s); ctx.stroke(); ctx.beginPath(); ctx.moveTo(x + (d + 22) * s, by + 22 * s); ctx.lineTo(x + (d - 22) * s, by - 22 * s); ctx.stroke(); }
    ctx.restore(); ell(ctx, x - 7 * s, by - 9 * s, 4 * s, 6 * s, 'rgba(255,255,255,.3)', -0.4);
    arm(ctx, x - 15 * s, by + 2 * s, -1, s, p, '#e09a1c'); const h = arm(ctx, x + 15 * s, by + 2 * s, 1, s, p, '#e09a1c');
    if (!p.wave && !p.cheer) { ln(ctx, [h[0], h[1] + 4 * s], [h[0] + 2 * s, h[1] - 14 * s], '#c9971f', 1.6 * s); blob(ctx, h[0] + 2 * s, h[1] - 15 * s, 2.4 * s, '#e8352f'); }   /* the sceptre */
    face(ctx, x, by + 1 * s, s, p);
    const top = by - 20 * s * p.sq;
    [[-8, -9, 0.5], [-4, -15, 0.2], [0, -19, 0], [4, -15, -0.2], [8, -9, -0.5]].forEach(([dx, h2]) => poly(ctx, [[x + (dx - 3) * s, top + 2 * s], [x + dx * 1.35 * s + Math.sin(p.t * 3 + dx) * 0.6 * s, top + (h2 - 4) * s], [x + (dx + 3) * s, top + 2 * s]], dx % 8 === 0 ? '#2e8a4a' : '#4fb85a'));
    const cg = ctx.createLinearGradient(x, top - 9 * s, x, top + 1 * s); cg.addColorStop(0, '#fff1a6'); cg.addColorStop(1, '#d9a21c');
    poly(ctx, [[x - 10 * s, top + 1 * s], [x + 10 * s, top + 1 * s], [x + 11 * s, top - 7 * s], [x + 6 * s, top - 3 * s], [x, top - 10 * s], [x - 6 * s, top - 3 * s], [x - 11 * s, top - 7 * s]], cg);
    blob(ctx, x, top - 2.5 * s, 1.8 * s, '#e8352f'); blob(ctx, x - 6 * s, top - 1 * s, 1.3 * s, '#2f7fd6'); blob(ctx, x + 6 * s, top - 1 * s, 1.3 * s, '#3fa66b');
  }

  function nabi(ctx, x, y, s, p) {
    const fy = y - 12 * s + Math.sin(p.t * 2.4) * 3 * s, flap = 0.55 + Math.abs(Math.cos(p.t * (p.sleep ? 2 : 11))) * 0.45;
    glow(ctx, x, fy - 22 * s, 30 * s, '#ffd6f4', 0.55);
    [[-1, -26, 14, 11], [1, -26, 14, 11], [-1, -14, 10, 7], [1, -14, 10, 7]].forEach(([d, oy, rx, ry]) => { ctx.save(); ctx.translate(x + d * 5 * s, fy + oy * s); ctx.scale(flap, 1); const g = ctx.createRadialGradient(d * 8 * s, 0, 1, d * 8 * s, 0, rx * s); g.addColorStop(0, 'rgba(255,255,255,.95)'); g.addColorStop(0.5, 'rgba(255,186,232,.75)'); g.addColorStop(1, 'rgba(150,196,255,.55)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(d * 9 * s, 0, rx * s, ry * s, d * 0.5, 0, Math.PI * 2); ctx.fill(); ctx.restore(); });
    ln(ctx, [x - 2 * s, fy - 6 * s], [x - 3 * s, fy + 2 * s], '#f0c6a8', 2 * s); ln(ctx, [x + 2 * s, fy - 6 * s], [x + 3 * s, fy + 2 * s], '#f0c6a8', 2 * s);
    const dg = ctx.createLinearGradient(x, fy - 24 * s, x, fy - 4 * s); dg.addColorStop(0, '#c9b6ff'); dg.addColorStop(1, '#9f86f0'); poly(ctx, [[x - 4 * s, fy - 22 * s], [x + 4 * s, fy - 22 * s], [x + 10 * s, fy - 5 * s], [x - 10 * s, fy - 5 * s]], dg);
    arm(ctx, x - 4 * s, fy - 19 * s, -1, s * 0.8, p, '#f6d3b8'); arm(ctx, x + 4 * s, fy - 19 * s, 1, s * 0.8, p, '#f6d3b8');
    const hy = fy - 31 * s; blob(ctx, x, hy, 9.5 * s, '#f9dcc4');
    ctx.fillStyle = '#e86aa6'; ctx.beginPath(); ctx.arc(x, hy - 1 * s, 10 * s, Math.PI * 1.02, Math.PI * 1.98); ctx.fill(); blob(ctx, x, hy - 11 * s, 4.6 * s, '#e86aa6'); blob(ctx, x - 9 * s, hy + 1 * s, 3 * s, '#e86aa6'); blob(ctx, x + 9 * s, hy + 1 * s, 3 * s, '#e86aa6');
    blob(ctx, x + 6 * s, hy - 8 * s, 2.2 * s, '#ffe14d'); blob(ctx, x + 6 * s, hy - 8 * s, 1 * s, '#ff8fb1');   /* a flower in her hair */
    face(ctx, x, hy + 2 * s, s * 0.85, p);
    for (let i = 0; i < 4; i++) { const a = (p.t * 0.6 + i / 4) % 1; blob(ctx, x - 12 * s + Math.sin(i * 2.3 + p.t) * 8 * s, fy + 6 * s - a * 24 * s, 1.1 * s * (1 - a), 'rgba(255,240,170,' + (1 - a) + ')'); }
  }

  function slime(ctx, x, y, s, p) {
    const w = 22 * s / Math.sqrt(p.sq), h = 32 * s * p.sq, wob = Math.sin(p.t * 3) * 1.2 * s;
    ell(ctx, x, y, w * 0.95, 3.5 * s, 'rgba(0,0,0,.18)');
    const g = ctx.createLinearGradient(x - w, y - h, x + w, y); g.addColorStop(0, '#9af0dc'); g.addColorStop(0.55, '#42c4a6'); g.addColorStop(1, '#23866f');
    ctx.globalAlpha = 0.94; ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - w, y); ctx.bezierCurveTo(x - w - 2 * s, y - h * 0.75, x - w * 0.55 + wob, y - h, x, y - h); ctx.bezierCurveTo(x + w * 0.55 + wob, y - h, x + w + 2 * s, y - h * 0.75, x + w, y); ctx.quadraticCurveTo(x, y + 3 * s, x - w, y); ctx.fill(); ctx.globalAlpha = 1;
    ell(ctx, x - w * 0.42, y - h * 0.68, 4 * s, 6.5 * s, 'rgba(255,255,255,.55)', -0.5); blob(ctx, x - w * 0.62, y - h * 0.45, 1.6 * s, 'rgba(255,255,255,.6)');
    ln(ctx, [x, y - h + 1 * s], [x + 1 * s, y - h - 5 * s], '#3f8a3a', 1.4 * s); ell(ctx, x - 3 * s, y - h - 5 * s, 3.4 * s, 1.8 * s, '#6fd08c', 0.4); ell(ctx, x + 4.5 * s, y - h - 6 * s, 3.4 * s, 1.8 * s, '#4fb85a', -0.4);   /* a sprout on top */
    face(ctx, x, y - h * 0.42, s * 1.05, p, { ink: '#0f3b33' });
  }

  function robot(ctx, x, y, s, p) {
    const hov = Math.sin(p.t * 2.2) * 1.5 * s, by = y - 4 * s + hov, navy = '#172033', blue = '#3b6fd6', gold = '#ffc531';
    ell(ctx, x, y, 14 * s, 3 * s, 'rgba(0,0,0,.18)'); glow(ctx, x, y - 2 * s, 10 * s, '#8fd3ff', 0.5);
    ell(ctx, x, by - 1 * s, 9 * s, 3.2 * s, '#9aa3b0');   /* the hover base */
    const bg = ctx.createLinearGradient(x - 14 * s, 0, x + 14 * s, 0); bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#c9d2dc');
    ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 13 * s, by - 26 * s, 26 * s, 23 * s, 7 * s) : ctx.rect(x - 13 * s, by - 26 * s, 26 * s, 23 * s); ctx.fill();
    ctx.fillStyle = blue; ctx.fillRect(x - 13 * s, by - 16 * s, 26 * s, 3 * s); blob(ctx, x, by - 9 * s, 2.4 * s, gold); glow(ctx, x, by - 9 * s, 6 * s, gold, 0.5);
    arm(ctx, x - 13 * s, by - 20 * s, -1, s, p, '#9aa3b0'); const h = arm(ctx, x + 13 * s, by - 20 * s, 1, s, p, '#9aa3b0');
    if (!p.wave && !p.cheer) { ctx.fillStyle = blue; ctx.fillRect(h[0] - 1 * s, h[1] - 7 * s, 7 * s, 9 * s); ctx.fillStyle = '#f4f1e8'; ctx.fillRect(h[0], h[1] - 6 * s, 1.5 * s, 7 * s); }   /* a book under its arm */
    const hy = by - 42 * s; ctx.fillStyle = bg; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 16 * s, hy - 2 * s, 32 * s, 22 * s, 8 * s) : ctx.rect(x - 16 * s, hy - 2 * s, 32 * s, 22 * s); ctx.fill();
    ctx.fillStyle = navy; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 12.5 * s, hy + 1.5 * s, 25 * s, 15 * s, 5 * s) : ctx.rect(x - 12.5 * s, hy + 1.5 * s, 25 * s, 15 * s); ctx.fill();
    const ey = hy + 7.5 * s, lx = (p.look || 0) * 1.5 * s;
    if (p.sleep || p.blink) [-1, 1].forEach(d => ln(ctx, [x + d * 5.5 * s - 2.5 * s, ey], [x + d * 5.5 * s + 2.5 * s, ey], '#8ff0ff', 1.4 * s));
    else [-1, 1].forEach(d => { ctx.fillStyle = '#8ff0ff'; ctx.fillRect(x + d * 5.5 * s - 2 * s + lx, ey - 2.5 * s, 4 * s, 5 * s); glow(ctx, x + d * 5.5 * s + lx, ey, 5 * s, '#8ff0ff', 0.5); });
    ctx.strokeStyle = gold; ctx.lineWidth = 1 * s; [-1, 1].forEach(d => { ctx.beginPath(); ctx.arc(x + d * 5.5 * s, ey, 4.4 * s, 0, Math.PI * 2); ctx.stroke(); }); ln(ctx, [x - 1.1 * s, ey], [x + 1.1 * s, ey], gold, 1 * s);   /* the professor's spectacles */
    if (p.talk && !p.sleep) ell(ctx, x, ey + 5.5 * s, 2.6 * s, (0.8 + Math.abs(Math.sin(p.t * 14))) * s, '#8ff0ff'); else ln(ctx, [x - 2.6 * s, ey + 5.5 * s], [x + 2.6 * s, ey + 5.5 * s], '#8ff0ff', 1.1 * s);
    poly(ctx, [[x - 9 * s, hy - 1 * s], [x + 9 * s, hy - 1 * s], [x + 8 * s, hy - 5 * s], [x - 8 * s, hy - 5 * s]], navy);   /* the cap */
    poly(ctx, [[x, hy - 13 * s], [x + 20 * s, hy - 6 * s], [x, hy + 0 * s], [x - 20 * s, hy - 6 * s]], '#22304d'); poly(ctx, [[x, hy - 12 * s], [x + 17 * s, hy - 6.5 * s], [x, hy - 3 * s], [x - 17 * s, hy - 6.5 * s]], navy);
    const tx = x + 12 * s + Math.sin(p.t * 2.5) * 1.5 * s; ln(ctx, [x, hy - 7 * s], [x + 12 * s, hy - 6 * s], gold, 1 * s); ln(ctx, [x + 12 * s, hy - 6 * s], [tx, hy + 4 * s], gold, 1.2 * s); ell(ctx, tx, hy + 5.5 * s, 1.6 * s, 2.6 * s, gold);
  }

  function ember(ctx, x, y, s, p) {
    const st = p.stage | 0;
    if (st === 0) {   /* the egg: it wobbles, and its eyes look out through the crack */
      const rock = (p.hop || p.cheer ? Math.sin(p.t * 16) * 0.18 : Math.sin(p.t * 1.6) * 0.05);
      ell(ctx, x, y, 14 * s, 3 * s, 'rgba(0,0,0,.18)'); ctx.save(); ctx.translate(x, y); ctx.rotate(rock);
      ctx.fillStyle = grad(ctx, 0, -20 * s, 26 * s, '#fff1d6', '#f0a050'); ctx.beginPath(); ctx.ellipse(0, -20 * s * p.sq, 15 * s, 20 * s * p.sq, 0, 0, Math.PI * 2); ctx.fill();
      [[-7, -30, 2.2], [6, -12, 2.6], [8, -28, 1.6], [-9, -12, 1.8], [1, -37, 1.4]].forEach(([dx, dy, r]) => blob(ctx, dx * s, dy * s * p.sq, r * s, '#d9563f'));
      ctx.strokeStyle = '#7a3a1e'; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(-14 * s, -22 * s); [[-9, -26], [-5, -21], [0, -26], [5, -21], [9, -26], [14, -22]].forEach(([a, b]) => ctx.lineTo(a * s, b * s)); ctx.stroke();
      face(ctx, 0, -17 * s, s * 0.85, p, { ink: '#4a1d0e' }); ctx.restore(); glow(ctx, x, y - 20 * s, 26 * s, '#ffb02e', 0.25 + (p.cheer ? 0.3 : 0)); return;
    }
    const big = st === 2 ? 1.2 : 1, ss = s * big, by = y - 16 * ss, red = '#e2522e', belly = '#ffd9a8';
    ell(ctx, x, y, 14 * ss, 3 * ss, 'rgba(0,0,0,.18)');
    ctx.strokeStyle = red; ctx.lineWidth = 4 * ss; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 10 * ss, by + 8 * ss); ctx.quadraticCurveTo(x - 22 * ss, by + 10 * ss, x - 24 * ss, by - 2 * ss + Math.sin(p.t * 3) * 2 * ss); ctx.stroke();
    glow(ctx, x - 24 * ss, by - 4 * ss + Math.sin(p.t * 3) * 2 * ss, 6 * ss, '#ffb02e', 0.9); blob(ctx, x - 24 * ss, by - 4 * ss + Math.sin(p.t * 3) * 2 * ss, 2 * ss, '#ffe14d');
    const flap = Math.sin(p.t * (st === 2 ? 7 : 4)) * 3 * ss; [[-1, '#b8352a'], [1, '#c9452f']].forEach(([d, c]) => poly(ctx, [[x + d * 6 * ss, by - 8 * ss], [x + d * (st === 2 ? 26 : 16) * ss, by - (st === 2 ? 26 : 16) * ss - flap], [x + d * (st === 2 ? 22 : 14) * ss, by - 2 * ss], [x + d * 9 * ss, by + 2 * ss]], c));
    ctx.fillStyle = grad(ctx, x, by, 16 * ss, '#ff8a5c', red); ctx.beginPath(); ctx.ellipse(x, by, 12 * ss, 13 * ss * p.sq, 0, 0, Math.PI * 2); ctx.fill(); ell(ctx, x + 1 * ss, by + 3 * ss, 7 * ss, 8 * ss, belly);
    ell(ctx, x - 6 * ss, y - 2 * ss, 3.6 * ss, 2.6 * ss, red); ell(ctx, x + 6 * ss, y - 2 * ss, 3.6 * ss, 2.6 * ss, red);
    arm(ctx, x - 9 * ss, by - 2 * ss, -1, ss * 0.7, p, red); arm(ctx, x + 9 * ss, by - 2 * ss, 1, ss * 0.7, p, red);
    const hy = by - 18 * ss; blob(ctx, x, hy, 11 * ss, red); ell(ctx, x + 1 * ss, hy + 5 * ss, 7 * ss, 4 * ss, '#ff9a6e');
    [[-1], [1]].forEach(([d]) => poly(ctx, [[x + d * 5 * ss, hy - 8 * ss], [x + d * 8 * ss, hy - 17 * ss], [x + d * 9 * ss, hy - 7 * ss]], '#f4ecd0'));
    if (st === 1) { ctx.fillStyle = '#fff1d6'; ctx.beginPath(); ctx.arc(x, hy - 6 * ss, 9 * ss, Math.PI, 0); ctx.lineTo(x + 9 * ss, hy - 6 * ss); [[6, -3], [3, -7], [0, -3], [-3, -7], [-6, -3]].forEach(([a, b]) => ctx.lineTo(x + a * ss, hy + b * ss)); ctx.closePath(); ctx.fill(); }   /* still wearing the shell */
    face(ctx, x, hy + 1 * ss, ss * 0.9, p, { ink: '#3a120a' });
    if (p.cheer) for (let i = 0; i < 4; i++) glow(ctx, x + 14 * ss + i * 4 * ss, hy + 4 * ss - i * 1.5 * ss, (4 + i) * ss, i % 2 ? '#ffb02e' : '#ff5a2a', 0.7);   /* a little puff of fire */
  }

  const DRAW = { king, nabi, slime, robot, ember };
  /* Draw a companion doing an action. pose: { action, t (seconds), blink, talk, mood, look, stage }. */
  function draw(ctx, id, x, y, s, pose) {
    const p = Object.assign({ action: 'idle', t: 0, sq: 1 }, pose), a = p.action, t = p.t;
    let dy = Math.sin(t * 2) * 1.2 * s;
    if (a === 'hop') { const k = Math.abs(Math.sin(t * Math.PI / 0.6)); dy = -k * 16 * s; p.sq = 1 + (k - 0.5) * 0.16; p.hop = true; }
    if (a === 'cheer') { dy = -Math.abs(Math.sin(t * 7)) * 8 * s; p.cheer = true; p.mood = 'happy'; }
    if (a === 'wave') p.wave = true;
    if (a === 'nap') { p.sleep = true; dy = 0; p.sq = 1 + Math.sin(t * 1.6) * 0.03; }
    if (a === 'look') p.look = Math.sin(t * 1.8);
    if (a === 'peek') dy = 10 * s + Math.sin(t * 2) * 2 * s;
    if (a === 'nudge') { p.wave = true; p.talk = true; dy = -Math.abs(Math.sin(t * 5)) * 5 * s; }
    if (a === 'think') p.look = -0.6;
    (DRAW[id] || king)(ctx, x, y + dy, s, p);
    const top = y + dy - 74 * s;
    if (a === 'nap') { ctx.fillStyle = 'rgba(80,90,130,.85)'; ctx.font = '800 ' + Math.round(11 * s) + 'px system-ui, sans-serif'; for (let i = 0; i < 3; i++) { const k = (t * 0.5 + i / 3) % 1; ctx.globalAlpha = 1 - k; ctx.fillText('z', x + 12 * s + k * 12 * s, top + 22 * s - k * 22 * s); } ctx.globalAlpha = 1; }
    if (a === 'cheer') for (let i = 0; i < 6; i++) { const ang = i / 6 * Math.PI * 2 + t * 2, r = 26 * s; star(ctx, x + Math.cos(ang) * r, top + 34 * s + Math.sin(ang) * r * 0.6, 2.6 * s, i % 2 ? '#ffe14d' : '#ff8fb1'); }
    if (a === 'think') for (let i = 0; i < 3; i++) blob(ctx, x + (i - 1) * 6 * s, top + 4 * s - Math.abs(Math.sin(t * 4 + i)) * 3 * s, 2 * s, 'rgba(60,70,100,.75)');
    if (a === 'nudge') { ctx.fillStyle = '#e8352f'; ctx.font = '900 ' + Math.round(16 * s) + 'px system-ui, sans-serif'; ctx.fillText('!', x + 16 * s, top + 10 * s); }
    if (p.hearts) for (let i = 0; i < 2; i++) { const k = (t * 0.4 + i / 2) % 1; ctx.globalAlpha = 1 - k; heart(ctx, x - 14 * s + i * 26 * s, top + 22 * s - k * 18 * s, 3 * s); ctx.globalAlpha = 1; }
  }
  function star(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2 - Math.PI / 2, rr = i % 2 ? r * 0.45 : r; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } ctx.closePath(); ctx.fill(); }
  function heart(ctx, x, y, r) { ctx.fillStyle = '#ff5a7a'; ctx.beginPath(); ctx.moveTo(x, y + r); ctx.bezierCurveTo(x - r * 2, y - r * 0.4, x - r * 0.8, y - r * 1.8, x, y - r * 0.5); ctx.bezierCurveTo(x + r * 0.8, y - r * 1.8, x + r * 2, y - r * 0.4, x, y + r); ctx.fill(); }

  /* the settings, shared by the page and the popup */
  const DEFAULTS = { enabled: false, who: 'king', name: '', nudgeMin: 5, quiet: false, x: null, y: null, scale: 1, linked: false, snoozeUntil: 0, roam: true, voice: 'off', voiceName: '' };   /* voice: off, system (this computer's voices) or model (a neural voice through the helper) */

  self.NWB = { PRESETS, ACTIONS, DEFAULTS, get, stageOf, pickAction, line, draw };
})();
