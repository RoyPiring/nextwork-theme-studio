/* NextWorld · figures: every class's people and creatures, drawn side-on
 * The battle and the land share them. A figure is drawn facing right with
 * its feet at (x, y) and s as its scale: a person is about 34 s tall. Each
 * body takes a look from classes.js ({b, g, c, a, ...}) so thirteen classes
 * need a dozen drawers, not a hundred. Light comes from the upper left. */
'use strict';
(function () {
  const sh = (c, k) => NW.shade(c, k);
  function blob(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, Math.max(0.1, r), 0, Math.PI * 2); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, c, rot) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, Math.max(0.1, rx), Math.max(0.1, ry), rot || 0, 0, Math.PI * 2); ctx.fill(); }
  function ln(ctx, a, b, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w || 1.5; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); ctx.lineCap = 'butt'; }
  function poly(ctx, pts, c) { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); }
  /* a soft glow, for eyes, orbs and magic */
  function glow(ctx, x, y, r, c, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = a == null ? 0.8 : a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  /* a body lit from the upper left: a vertical gradient over the colour */
  function lit(ctx, x, y0, y1, c) { const g = ctx.createLinearGradient(x - 8, y0, x + 6, y1); g.addColorStop(0, sh(c, 0.25)); g.addColorStop(0.55, c); g.addColorStop(1, sh(c, -0.3)); return g; }

  /* ---- what a hand holds: every weapon and tool, from the hand at h, pointing forward ---- */
  function gear(ctx, g, h, s, t, a, swing) {
    const x = h[0], y = h[1], sw = swing || 0, acc = a || '#ffc531';
    if (g === 'sword' || g === 'sabre') { const tip = [x + 11 * s, y - 11 * s + sw]; ln(ctx, h, tip, '#dfe5ee', 2 * s); ln(ctx, [x + 1 * s, y - 1 * s], tip, 'rgba(255,255,255,.7)', 0.6 * s); ln(ctx, [x - 2 * s, y + 2 * s], [x + 2.5 * s, y - 2.5 * s], acc, 1.6 * s); }
    else if (g === 'greatsword') { const tip = [x + 6 * s, y - 22 * s + sw]; ln(ctx, h, tip, '#e6ebf2', 3.2 * s); ln(ctx, [x + 0.5 * s, y - 2 * s], tip, 'rgba(255,255,255,.6)', 0.8 * s); ln(ctx, [x - 3.5 * s, y - 1 * s], [x + 3.5 * s, y - 1.5 * s], acc, 2 * s); }
    else if (g === 'spear' || g === 'lance') { const L = g === 'lance' ? 24 : 18, tip = [x + L * s, y - 6 * s + sw * 0.4]; ln(ctx, [x - 8 * s, y + 3 * s], tip, '#8a6a3f', 1.6 * s); poly(ctx, [tip, [tip[0] - 4 * s, tip[1] - 1.8 * s], [tip[0] - 4 * s, tip[1] + 1.8 * s]], '#dfe5ee'); if (g === 'lance') poly(ctx, [[x + 10 * s, y - 3 * s], [x + 16 * s, y - 5 * s], [x + 10 * s, y - 7 * s]], acc); }
    else if (g === 'bow') { ctx.strokeStyle = '#8a6a3f'; ctx.lineWidth = 1.8 * s; ctx.beginPath(); ctx.arc(x - 1 * s, y, 8 * s, -1.2, 1.2); ctx.stroke(); ln(ctx, [x + 1.5 * s, y - 7.5 * s], [x + 1.5 * s, y + 7.5 * s], 'rgba(240,240,240,.8)', 0.6 * s); ln(ctx, [x - 4 * s, y], [x + 7 * s, y], '#e6e3d6', 0.9 * s); }
    else if (g === 'crossbow') { ln(ctx, [x - 5 * s, y + 1 * s], [x + 7 * s, y - 1 * s], '#6b4a2b', 2.2 * s); ctx.strokeStyle = '#3b4252'; ctx.lineWidth = 1.4 * s; ctx.beginPath(); ctx.moveTo(x + 5 * s, y - 7 * s); ctx.quadraticCurveTo(x + 9 * s, y - 1 * s, x + 5 * s, y + 5 * s); ctx.stroke(); }
    else if (g === 'tower') { const gg = ctx.createLinearGradient(x - 2 * s, 0, x + 6 * s, 0); gg.addColorStop(0, sh(acc, 0.2)); gg.addColorStop(1, sh(acc, -0.35)); ctx.fillStyle = gg; ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x - 1 * s, y - 13 * s, 7 * s, 20 * s, 2 * s) : ctx.rect(x - 1 * s, y - 13 * s, 7 * s, 20 * s); ctx.fill(); ln(ctx, [x + 2.5 * s, y - 11 * s], [x + 2.5 * s, y + 5 * s], 'rgba(255,255,255,.45)', 1 * s); ln(ctx, [x - 0.5 * s, y - 3 * s], [x + 5.5 * s, y - 3 * s], 'rgba(255,255,255,.45)', 1 * s); }
    else if (g === 'daggers') { [[0, 0], [-4, 3]].forEach(([dx, dy], i) => { const b0 = [x + dx * s, y + dy * s], tip = [b0[0] + 7 * s, b0[1] - 5 * s + (i ? -sw : sw) * 0.5]; ln(ctx, b0, tip, '#dfe5ee', 1.5 * s); ln(ctx, [b0[0] - 1 * s, b0[1] + 1.2 * s], [b0[0] + 1.2 * s, b0[1] - 1 * s], acc, 1.2 * s); }); }
    else if (g === 'knives') { for (let i = 0; i < 3; i++) ln(ctx, [x + i * 1.5 * s, y - i * 1.5 * s], [x + 4 * s + i * 1.5 * s, y - 3 * s - i * 1.5 * s], '#dfe5ee', 1 * s); }
    else if (g === 'staff' || g === 'crozier' || g === 'branch' || g === 'wand') { const L = g === 'wand' ? 9 : 26, top = [x + 2 * s, y - L * s]; ln(ctx, [x, y + (g === 'wand' ? 2 : 10) * s], top, g === 'branch' ? '#6b4a2b' : '#5a3a1e', (g === 'wand' ? 1.4 : 2) * s);
      if (g === 'crozier') { ctx.strokeStyle = '#ffc531'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.arc(top[0] + 3 * s, top[1], 3 * s, Math.PI, Math.PI * 2.4); ctx.stroke(); }
      else if (g === 'branch') { [[-3, -2], [3, -4], [0, -6]].forEach(([dx, dy]) => ell(ctx, top[0] + dx * s, top[1] + dy * s, 2.6 * s, 1.6 * s, '#6fd08c', dx * 0.3)); }
      else { glow(ctx, top[0], top[1], 7 * s, acc, 0.7 + Math.sin(t * 4) * 0.2); blob(ctx, top[0], top[1], 2.2 * s, '#ffffff'); } }
    else if (g === 'orb') { glow(ctx, x + 3 * s, y - 3 * s, 9 * s, acc, 0.8); blob(ctx, x + 3 * s, y - 3 * s, 3.2 * s, sh(acc, 0.4)); blob(ctx, x + 2 * s, y - 4 * s, 1.1 * s, '#ffffff'); }
    else if (g === 'book') { poly(ctx, [[x - 1 * s, y - 4 * s], [x + 7 * s, y - 6 * s], [x + 7 * s, y + 2 * s], [x - 1 * s, y + 4 * s]], sh(acc, -0.3)); poly(ctx, [[x, y - 3.4 * s], [x + 6 * s, y - 5 * s], [x + 6 * s, y + 1.4 * s], [x, y + 3 * s]], '#f4f1e8'); glow(ctx, x + 3 * s, y - 1 * s, 6 * s, acc, 0.5); }
    else if (g === 'flask') { ln(ctx, h, [x + 2 * s, y - 4 * s], '#dfe5ee', 1 * s); blob(ctx, x + 3 * s, y - 6 * s, 3 * s, 'rgba(124,255,138,.85)'); }
    else if (g === 'sling') { ln(ctx, h, [x + 6 * s + Math.sin(t * 14) * 3 * s, y - 7 * s], '#8a6a3f', 0.9 * s); blob(ctx, x + 6 * s + Math.sin(t * 14) * 3 * s, y - 7 * s, 1.5 * s, '#9aa3b0'); }
    else if (g === 'mace' || g === 'hammer') { const head = [x + 5 * s, y - 9 * s + sw]; ln(ctx, [x - 1 * s, y + 2 * s], head, '#6b4a2b', 1.6 * s); if (g === 'mace') { blob(ctx, head[0], head[1], 3 * s, '#c9d2dc'); blob(ctx, head[0] - 1 * s, head[1] - 1 * s, 1 * s, '#ffffff'); } else { ctx.fillStyle = '#6b7280'; ctx.fillRect(head[0] - 2.5 * s, head[1] - 1.5 * s, 5 * s, 3 * s); } }
    else if (g === 'axe' || g === 'whip' || g === 'wrench') {
      if (g === 'axe') { const head = [x + 6 * s, y - 11 * s + sw]; ln(ctx, [x - 1 * s, y + 3 * s], head, '#6b4a2b', 1.8 * s); poly(ctx, [[head[0] - 1 * s, head[1] - 1 * s], [head[0] + 5 * s, head[1] - 4 * s], [head[0] + 6 * s, head[1] + 3 * s], [head[0], head[1] + 3 * s]], '#c9d2dc'); }
      else if (g === 'whip') { ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 1.2 * s; ctx.beginPath(); ctx.moveTo(x, y); ctx.bezierCurveTo(x + 8 * s, y - 10 * s, x + 14 * s, y + 4 * s + Math.sin(t * 6) * 4 * s, x + 20 * s, y - 2 * s + Math.sin(t * 6 + 1) * 5 * s); ctx.stroke(); }
      else { ln(ctx, [x - 1 * s, y + 2 * s], [x + 7 * s, y - 7 * s], '#9aa3b0', 2 * s); ctx.strokeStyle = '#9aa3b0'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.arc(x + 8 * s, y - 8.5 * s, 2.4 * s, 0.6, Math.PI * 1.7); ctx.stroke(); } }
    else if (g === 'drum') { ell(ctx, x - 4 * s, y + 2 * s, 5 * s, 3 * s, sh(acc, -0.2)); ctx.fillStyle = '#8a3a2a'; ctx.fillRect(x - 9 * s, y + 2 * s, 10 * s, 5 * s); ln(ctx, h, [x + 2 * s, y - 5 * s + Math.abs(Math.sin(t * 8)) * 4 * s], '#6b4a2b', 1.2 * s); }
  }

  /* ---- a person: soldiers, casters, militia. look: {g gear, c body colour, a accent, hood, helm, wings, skin} ---- */
  function person(ctx, x, y, s, t, lk, flash, walk) {
    const c = flash ? '#ffffff' : lk.c || '#6b7a8c', a = lk.a || '#ffc531', sw = Math.sin(walk || 0) * 3 * s, skin = lk.skin || '#e8b48a';
    const armoured = ['sword', 'tower', 'greatsword', 'lance', 'mace', 'axe'].includes(lk.g) && !lk.hood;
    if (lk.wings) { [[-1, 0.35], [1, 0.25]].forEach(([d, al]) => { ctx.globalAlpha = al + 0.2; poly(ctx, [[x - 2 * s, y - 24 * s], [x - 16 * s, y - 34 * s + Math.sin(t * 6 + d) * 3 * s], [x - 14 * s, y - 18 * s], [x - 4 * s, y - 16 * s]], '#f4fbff'); ctx.globalAlpha = 1; }); }
    /* legs and boots */
    const leg = sh(c, -0.5); ln(ctx, [x - 2 * s, y - 12 * s], [x - 3 * s + sw, y - 1 * s], leg, 3 * s); ln(ctx, [x + 2 * s, y - 12 * s], [x + 3 * s - sw, y - 1 * s], leg, 3 * s);
    ell(ctx, x - 2.5 * s + sw, y - 0.5 * s, 2.6 * s, 1.3 * s, '#2a2230'); ell(ctx, x + 3.5 * s - sw, y - 0.5 * s, 2.6 * s, 1.3 * s, '#2a2230');
    /* the body: a tunic or a coat of plates, lit from the left */
    poly(ctx, [[x - 6 * s, y - 11 * s], [x + 6 * s, y - 11 * s], [x + 5 * s, y - 25 * s], [x - 5 * s, y - 25 * s]], lit(ctx, x, y - 25 * s, y - 11 * s, c));
    if (armoured) { ln(ctx, [x - 4.5 * s, y - 19 * s], [x + 4.5 * s, y - 19 * s], 'rgba(255,255,255,.35)', 0.8 * s); ell(ctx, x - 5 * s, y - 24 * s, 3 * s, 2.2 * s, sh(c, 0.15)); ell(ctx, x + 5 * s, y - 24 * s, 3 * s, 2.2 * s, sh(c, -0.1)); }
    ctx.fillStyle = a; ctx.fillRect(x - 6 * s, y - 13.5 * s, 12 * s, 2 * s);   /* the belt, in the class colour */
    /* the back arm, then the head */
    ln(ctx, [x - 4 * s, y - 23 * s], [x - 6 * s - sw * 0.4, y - 14 * s], sh(c, -0.25), 2.6 * s);
    if (lk.g === 'sword' || lk.g === 'mace') { ell(ctx, x - 7 * s, y - 17 * s, 3.8 * s, 5.2 * s, sh(a, -0.2)); blob(ctx, x - 7 * s, y - 17 * s, 1.2 * s, sh(a, 0.3)); }   /* a round shield on the off arm */
    blob(ctx, x + 0.5 * s, y - 29.5 * s, 4.6 * s, skin);
    if (lk.hood) { ctx.fillStyle = sh(c, -0.15); ctx.beginPath(); ctx.arc(x, y - 30 * s, 5.8 * s, Math.PI * 0.95, Math.PI * 2.15); ctx.lineTo(x + 3 * s, y - 25 * s); ctx.lineTo(x - 5 * s, y - 25 * s); ctx.closePath(); ctx.fill(); blob(ctx, x + 2.6 * s, y - 29.5 * s, 0.9 * s, a); }
    else if (armoured) { ctx.fillStyle = sh(c, 0.1); ctx.beginPath(); ctx.arc(x + 0.5 * s, y - 30 * s, 5.2 * s, Math.PI, 0); ctx.lineTo(x + 5.7 * s, y - 28 * s); ctx.lineTo(x - 4.7 * s, y - 28 * s); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#1c1a24'; ctx.fillRect(x + 1 * s, y - 30.5 * s, 4 * s, 1.1 * s); poly(ctx, [[x - 1 * s, y - 35 * s], [x + 1 * s, y - 39 * s + Math.sin(t * 3) * 0.5 * s], [x + 2 * s, y - 35 * s]], a); }
    else { ctx.fillStyle = lk.hair || '#4a2e1a'; ctx.beginPath(); ctx.arc(x + 0.2 * s, y - 30.5 * s, 4.8 * s, Math.PI * 0.9, Math.PI * 2.05); ctx.fill(); blob(ctx, x + 3 * s, y - 29.5 * s, 0.7 * s, '#1c1a24'); }
    /* the front arm and what it holds */
    const hand = [x + 6 * s + sw * 0.3, y - 17 * s]; ln(ctx, [x + 3 * s, y - 23 * s], hand, sh(c, 0.05), 2.6 * s); blob(ctx, hand[0], hand[1], 1.3 * s, skin);
    gear(ctx, lk.g, hand, s, t, a, Math.sin(t * 10) * 1.5 * s);
  }

  /* ---- a skeleton: the necromancer's dead ---- */
  function skeleton(ctx, x, y, s, t, eye, flash) {
    const bone = flash ? '#ffffff' : '#ecebe2', dark = '#8a8778', sw = Math.sin(t * 9) * 3 * s;
    ln(ctx, [x - 2 * s, y - 12 * s], [x - 3 * s + sw, y], bone, 2 * s); ln(ctx, [x + 2 * s, y - 12 * s], [x + 3 * s - sw, y], bone, 2 * s);
    ell(ctx, x, y - 13 * s, 4 * s, 2 * s, bone); ln(ctx, [x, y - 14 * s], [x, y - 25 * s], bone, 2 * s);
    for (let k = 0; k < 3; k++) { ctx.strokeStyle = k % 2 ? dark : bone; ctx.lineWidth = 1.3 * s; ctx.beginPath(); ctx.ellipse(x, y - 19 * s - k * 2.2 * s, 4.5 * s - k * 0.4 * s, 1.6 * s, 0, 0, Math.PI); ctx.stroke(); }
    ln(ctx, [x - 4 * s, y - 24 * s], [x - 6 * s - sw * 0.5, y - 15 * s], bone, 1.8 * s); ln(ctx, [x + 4 * s, y - 24 * s], [x + 7 * s + sw * 0.5, y - 17 * s], bone, 1.8 * s);
    blob(ctx, x, y - 30 * s, 5 * s, bone); ctx.fillStyle = '#1c1a24'; ctx.fillRect(x - 1 * s, y - 31.5 * s, 2 * s, 2.5 * s); ctx.fillRect(x + 2.4 * s, y - 31.5 * s, 2 * s, 2.5 * s); blob(ctx, x + 0.2 * s, y - 30.3 * s, 1 * s, eye); blob(ctx, x + 3.4 * s, y - 30.3 * s, 1 * s, eye); ctx.fillStyle = dark; ctx.fillRect(x - 1.5 * s, y - 26.6 * s, 6 * s, 1.2 * s);
    glow(ctx, x + 2 * s, y - 30.5 * s, 4 * s, eye, 0.35);
    return [x + 7 * s + sw * 0.5, y - 17 * s];
  }

  /* ---- four legs: wolves, bears, stags, lizards, mules, a mammoth ---- */
  const BEAST = { wolf: { L: 12, H: 9, legs: 8, head: 5, neck: 1 }, bear: { L: 15, H: 13, legs: 7, head: 6, neck: 0 }, stag: { L: 12, H: 11, legs: 11, head: 4, neck: 1.4 }, lizard: { L: 13, H: 5, legs: 4, head: 4, neck: 0.3 }, mule: { L: 13, H: 10, legs: 9, head: 4.5, neck: 1.2 }, mammoth: { L: 22, H: 20, legs: 12, head: 10, neck: 0 } };
  function beast(ctx, x, y, s, t, lk, flash, walk) {
    const k = BEAST[lk.g] || BEAST.wolf, c = flash ? '#ffffff' : lk.c || '#7a7f8a', a = lk.a || '#ffb02e', ss = s * (lk.big ? 1.3 : 1), w = walk || 0, top = y - (k.legs + k.H) * ss;
    if (lk.glow) glow(ctx, x, top + k.H * ss * 0.5, 24 * ss, a, 0.35);
    [[-k.L * 0.55, 0], [-k.L * 0.35, 2], [k.L * 0.35, 1], [k.L * 0.55, 3]].forEach(([dx, ph], i) => ln(ctx, [x + dx * ss, top + k.H * ss * 0.8], [x + dx * ss + Math.sin(w * 2 + ph) * 2.5 * ss, y], i % 2 ? sh(c, -0.35) : sh(c, -0.15), (lk.g === 'mammoth' || lk.g === 'bear' ? 4.5 : 2.4) * ss));
    ell(ctx, x, top + k.H * ss * 0.5, k.L * 0.75 * ss, k.H * 0.55 * ss, lit(ctx, x, top, top + k.H * ss, c));
    if (lk.metal) { ln(ctx, [x - k.L * 0.5 * ss, top + k.H * 0.3 * ss], [x + k.L * 0.5 * ss, top + k.H * 0.3 * ss], 'rgba(255,255,255,.4)', 1 * ss); for (let i = -1; i <= 1; i++) blob(ctx, x + i * 5 * ss, top + k.H * 0.55 * ss, 0.9 * ss, '#3b4252'); }
    const hx = x + (k.L * 0.75 + k.head * 0.6) * ss, hy = top + k.H * ss * 0.2 - k.neck * 4 * ss;
    if (k.neck) ln(ctx, [x + k.L * 0.55 * ss, top + k.H * 0.35 * ss], [hx - 2 * ss, hy + 2 * ss], c, k.head * 1.1 * ss);
    ell(ctx, hx, hy, k.head * ss, k.head * 0.75 * ss, c); ell(ctx, hx + k.head * 0.8 * ss, hy + k.head * 0.25 * ss, k.head * 0.55 * ss, k.head * 0.4 * ss, sh(c, -0.1));
    blob(ctx, hx + k.head * 0.35 * ss, hy - k.head * 0.2 * ss, 1 * ss, lk.metal || lk.glow ? a : '#1c1a24'); if (lk.metal) glow(ctx, hx + k.head * 0.35 * ss, hy - k.head * 0.2 * ss, 4 * ss, a, 0.6);
    if (lk.g === 'wolf') { poly(ctx, [[hx - 2 * ss, hy - 3 * ss], [hx - 0.5 * ss, hy - 7.5 * ss], [hx + 1.5 * ss, hy - 3 * ss]], sh(c, -0.2)); ln(ctx, [x - k.L * 0.75 * ss, top + k.H * 0.4 * ss], [x - k.L * 1.15 * ss, top + k.H * 0.1 * ss - Math.sin(t * 5) * 2 * ss], c, 3 * ss); }
    if (lk.g === 'bear') { blob(ctx, hx - 2 * ss, hy - 4 * ss, 1.8 * ss, sh(c, -0.2)); }
    if (lk.g === 'stag') { ctx.strokeStyle = lk.glow ? '#ffffff' : '#d9c9a8'; ctx.lineWidth = 1.2 * ss; [[-1, 0], [1, 0.6]].forEach(([d, o]) => { ctx.beginPath(); ctx.moveTo(hx - 1 * ss + o * ss, hy - 3 * ss); ctx.lineTo(hx - 3 * ss + d * 2 * ss, hy - 12 * ss); ctx.moveTo(hx - 2 * ss + d * ss, hy - 8 * ss); ctx.lineTo(hx - 6 * ss + d * ss, hy - 11 * ss); ctx.moveTo(hx - 2.5 * ss + d * 1.5 * ss, hy - 10 * ss); ctx.lineTo(hx + 1 * ss + d * ss, hy - 13 * ss); ctx.stroke(); }); }
    if (lk.g === 'lizard') { ln(ctx, [x - k.L * 0.7 * ss, top + k.H * 0.6 * ss], [x - k.L * 1.4 * ss, y - 1 * ss + Math.sin(t * 4) * 1.5 * ss], c, 2.4 * ss); for (let i = -2; i <= 2; i++) poly(ctx, [[x + i * 3 * ss - 1 * ss, top + 1 * ss], [x + i * 3 * ss, top - 2.5 * ss], [x + i * 3 * ss + 1 * ss, top + 1 * ss]], a); }
    if (lk.g === 'mule') { poly(ctx, [[hx - 1 * ss, hy - 3 * ss], [hx, hy - 8 * ss], [hx + 1.5 * ss, hy - 3 * ss]], sh(c, -0.2)); ctx.fillStyle = '#8a6a3f'; ctx.fillRect(x - 6 * ss, top - 4 * ss, 12 * ss, 5 * ss); }
    if (lk.g === 'mammoth') { ctx.strokeStyle = '#f4ecd0'; ctx.lineWidth = 2.5 * ss; ctx.beginPath(); ctx.moveTo(hx + 2 * ss, hy + 5 * ss); ctx.quadraticCurveTo(hx + 12 * ss, hy + 12 * ss, hx + 13 * ss, hy + 1 * ss); ctx.stroke(); ln(ctx, [hx + 6 * ss, hy + 2 * ss], [hx + 8 * ss, hy + 14 * ss + Math.sin(t * 2) * 2 * ss], c, 3.5 * ss); ctx.fillStyle = a; ctx.fillRect(x - 10 * ss, top - 1 * ss, 20 * ss, 4 * ss); }
  }

  /* ---- wings: hawks, falcons, eagles, a phoenix ---- */
  function bird(ctx, x, y, s, t, lk, flash) {
    const ss = s * (lk.big ? 1.6 : 1), c = flash ? '#ffffff' : lk.c || '#8a6a3f', a = lk.a || '#ffe08a', fy = y - 34 * ss + Math.sin(t * 2.2) * 4 * ss, flap = Math.sin(t * 9) * 9 * ss;
    ell(ctx, x, y + 1, 8 * ss, 2 * ss, 'rgba(0,0,0,.2)');
    if (lk.fire) { for (let i = 0; i < 5; i++) glow(ctx, x - (6 + i * 5) * ss, fy + i * 1.2 * ss, (9 - i) * ss, i % 2 ? '#ffb02e' : '#ff5a2a', 0.5); }
    poly(ctx, [[x - 2 * ss, fy - 1 * ss], [x - 14 * ss, fy - 12 * ss - flap], [x - 8 * ss, fy + 1 * ss]], sh(c, -0.25));
    ell(ctx, x, fy, 8 * ss, 3.6 * ss, lit(ctx, x, fy - 4 * ss, fy + 4 * ss, c)); poly(ctx, [[x - 7 * ss, fy], [x - 13 * ss, fy - 3 * ss], [x - 13 * ss, fy + 3 * ss]], sh(c, -0.2));
    blob(ctx, x + 7 * ss, fy - 2 * ss, 3 * ss, c); poly(ctx, [[x + 9.5 * ss, fy - 2.5 * ss], [x + 13 * ss, fy - 1 * ss], [x + 9.5 * ss, fy - 0.5 * ss]], a); blob(ctx, x + 8 * ss, fy - 2.8 * ss, 0.8 * ss, '#1c1a24');
    poly(ctx, [[x - 1 * ss, fy - 1 * ss], [x - 10 * ss, fy - 14 * ss + flap * 0.8], [x - 4 * ss, fy + 1 * ss]], lk.fire ? '#ffd35a' : sh(c, 0.15));
  }

  /* ---- spirits and elementals: a floating flame with eyes ---- */
  function spirit(ctx, x, y, s, t, lk, flash) {
    const ss = s * (lk.big ? 1.45 : lk.small ? 0.7 : 1), c = flash ? '#ffffff' : lk.c || '#8ff0ff', a = lk.a || '#ffffff', fy = y - (lk.fly ? 30 : 16) * ss + Math.sin(t * 3 + x) * 2.5 * ss;
    ell(ctx, x, y + 1, 7 * ss, 2 * ss, 'rgba(0,0,0,.18)'); glow(ctx, x, fy - 4 * ss, 20 * ss, c, 0.45);
    const tail = Math.sin(t * 6) * 3 * ss; ctx.fillStyle = c; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.moveTo(x - 7 * ss, fy); ctx.quadraticCurveTo(x - 8 * ss, fy - 14 * ss, x, fy - 20 * ss); ctx.quadraticCurveTo(x + 8 * ss, fy - 14 * ss, x + 7 * ss, fy); ctx.quadraticCurveTo(x + 4 * ss, fy + 10 * ss + tail, x - 2 * ss, fy + 14 * ss); ctx.quadraticCurveTo(x - 1 * ss, fy + 6 * ss, x - 7 * ss, fy); ctx.fill(); ctx.globalAlpha = 1;
    ell(ctx, x - 1 * ss, fy - 8 * ss, 3 * ss, 5 * ss, 'rgba(255,255,255,.35)');
    blob(ctx, x + 1.5 * ss, fy - 7 * ss, 1.3 * ss, a); blob(ctx, x + 4.5 * ss, fy - 7 * ss, 1.3 * ss, a);
  }

  /* ---- machines: clockwork soldiers, turrets, tesla coils, totems, golems ---- */
  function construct(ctx, x, y, s, t, lk, flash, walk) {
    const ss = s * (lk.big ? 1.3 : 1), c = flash ? '#ffffff' : lk.c || '#b8834a', a = lk.a || '#4ff0ff', sw = Math.sin(walk || 0) * 2.5 * ss;
    ln(ctx, [x - 2.5 * ss, y - 11 * ss], [x - 3 * ss + sw, y], sh(c, -0.4), 3 * ss); ln(ctx, [x + 2.5 * ss, y - 11 * ss], [x + 3 * ss - sw, y], sh(c, -0.4), 3 * ss);
    ctx.fillStyle = lit(ctx, x, y - 26 * ss, y - 10 * ss, c); ctx.fillRect(x - 6 * ss, y - 26 * ss, 12 * ss, 15 * ss);
    ctx.strokeStyle = sh(c, -0.35); ctx.lineWidth = 1 * ss; ctx.beginPath(); ctx.arc(x, y - 18 * ss, 3.2 * ss, t * 3, t * 3 + Math.PI * 1.6); ctx.stroke(); blob(ctx, x, y - 18 * ss, 1 * ss, a);
    [[-5, -25], [5, -25], [-5, -12], [5, -12]].forEach(([dx, dy]) => blob(ctx, x + dx * ss, y + dy * ss, 0.7 * ss, sh(c, 0.35)));
    ctx.fillStyle = sh(c, 0.1); ctx.fillRect(x - 3.5 * ss, y - 32 * ss, 8 * ss, 6 * ss); ctx.fillStyle = '#1c1a24'; ctx.fillRect(x - 1 * ss, y - 30.5 * ss, 5 * ss, 2 * ss); blob(ctx, x + 2 * ss, y - 29.5 * ss, 1 * ss, a); glow(ctx, x + 2 * ss, y - 29.5 * ss, 4 * ss, a, 0.5);
    const hand = [x + 7 * ss, y - 17 * ss]; ln(ctx, [x + 5 * ss, y - 24 * ss], hand, sh(c, -0.15), 2.6 * ss); gear(ctx, lk.g, hand, ss, t, a, Math.sin(t * 10) * 1.5 * ss);
  }
  function turret(ctx, x, y, s, t, lk, flash) { const c = flash ? '#ffffff' : lk.c || '#6b7280', a = lk.a || '#4ff0ff';
    [[-6, 0], [6, 0], [0, 1]].forEach(([dx, dy]) => ln(ctx, [x, y - 10 * s], [x + dx * s, y + dy * s], sh(c, -0.35), 2 * s));
    ell(ctx, x, y - 12 * s, 7 * s, 5 * s, lit(ctx, x, y - 17 * s, y - 7 * s, c)); const aim = Math.sin(t * 1.5) * 0.15; ctx.save(); ctx.translate(x + 2 * s, y - 13 * s); ctx.rotate(-0.15 + aim); ctx.fillStyle = sh(c, -0.25); ctx.fillRect(0, -1.6 * s, 13 * s, 3.2 * s); ctx.restore(); blob(ctx, x - 2 * s, y - 14 * s, 1.4 * s, a); glow(ctx, x - 2 * s, y - 14 * s, 5 * s, a, 0.5); }
  function tesla(ctx, x, y, s, t, lk, flash) { const c = flash ? '#ffffff' : lk.c || '#5a6b7a', a = lk.a || '#a0dcff';
    poly(ctx, [[x - 6 * s, y], [x + 6 * s, y], [x + 3 * s, y - 8 * s], [x - 3 * s, y - 8 * s]], sh(c, -0.2)); for (let i = 0; i < 5; i++) ell(ctx, x, y - 10 * s - i * 4 * s, (4.5 - i * 0.4) * s, 1.6 * s, i % 2 ? '#b8834a' : sh(c, 0.2));
    blob(ctx, x, y - 32 * s, 4 * s, sh(a, 0.3)); glow(ctx, x, y - 32 * s, 14 * s, a, 0.5 + Math.sin(t * 20) * 0.2); if (Math.sin(t * 13) > 0.3) { ctx.strokeStyle = '#e6f6ff'; ctx.lineWidth = 1 * s; ctx.beginPath(); ctx.moveTo(x, y - 32 * s); for (let i = 1; i < 5; i++) ctx.lineTo(x + i * 3 * s, y - 32 * s + (i % 2 ? -3 : 3) * s); ctx.stroke(); } }
  function totem(ctx, x, y, s, t, lk, flash) { const c = flash ? '#ffffff' : lk.c || '#6b4a2b', a = lk.a || '#a0dcff';
    ctx.fillStyle = lit(ctx, x, y - 34 * s, y, c); ctx.fillRect(x - 4 * s, y - 34 * s, 8 * s, 34 * s); [8, 20, 31].forEach((h, i) => { ctx.fillStyle = sh(c, -0.35); ctx.fillRect(x - 3 * s, y - h * s, 6 * s, 1.2 * s); blob(ctx, x - 1.5 * s, y - (h + 3) * s, 0.9 * s, i === 2 ? a : '#ffe08a'); blob(ctx, x + 1.5 * s, y - (h + 3) * s, 0.9 * s, i === 2 ? a : '#ffe08a'); });
    poly(ctx, [[x - 9 * s, y - 30 * s], [x - 4 * s, y - 27 * s], [x - 4 * s, y - 31 * s]], sh(c, 0.2)); poly(ctx, [[x + 9 * s, y - 30 * s], [x + 4 * s, y - 27 * s], [x + 4 * s, y - 31 * s]], sh(c, 0.2)); glow(ctx, x, y - 38 * s, 10 * s, a, 0.5 + Math.sin(t * 9) * 0.2); }
  function golem(ctx, x, y, s, t, lk, flash, walk) {
    const ss = s * 1.7, c = flash ? '#ffffff' : lk.c || '#8a8272', a = lk.a || '#ff9a3c', sw = Math.sin(walk || 0) * 2 * ss;
    ctx.fillStyle = sh(c, -0.3); ctx.fillRect(x - 6 * ss + sw, y - 10 * ss, 5 * ss, 10 * ss); ctx.fillRect(x + 1 * ss - sw, y - 10 * ss, 5 * ss, 10 * ss);
    poly(ctx, [[x - 9 * ss, y - 10 * ss], [x + 9 * ss, y - 10 * ss], [x + 11 * ss, y - 28 * ss], [x - 10 * ss, y - 28 * ss]], lit(ctx, x, y - 28 * ss, y - 10 * ss, c));
    ctx.strokeStyle = a; ctx.lineWidth = 0.9 * ss; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.moveTo(x - 4 * ss, y - 26 * ss); ctx.lineTo(x - 1 * ss, y - 20 * ss); ctx.lineTo(x - 3 * ss, y - 14 * ss); ctx.moveTo(x + 5 * ss, y - 24 * ss); ctx.lineTo(x + 3 * ss, y - 18 * ss); ctx.stroke(); ctx.globalAlpha = 1;
    ctx.fillStyle = sh(c, 0.1); ctx.fillRect(x - 4 * ss, y - 34 * ss, 9 * ss, 7 * ss); blob(ctx, x + 2.5 * ss, y - 31 * ss, 1.2 * ss, a); glow(ctx, x + 2.5 * ss, y - 31 * ss, 5 * ss, a, 0.7);
    ln(ctx, [x - 10 * ss, y - 26 * ss], [x - 12 * ss - sw, y - 12 * ss], sh(c, -0.15), 5 * ss); ln(ctx, [x + 10 * ss, y - 26 * ss], [x + 14 * ss, y - 14 * ss + Math.sin(t * 3) * 2 * ss], sh(c, 0.05), 5 * ss); blob(ctx, x + 14 * ss, y - 13 * ss + Math.sin(t * 3) * 2 * ss, 3.4 * ss, sh(c, -0.1));
    if (lk.metal) ln(ctx, [x - 8 * ss, y - 22 * ss], [x + 9 * ss, y - 22 * ss], 'rgba(255,255,255,.35)', 1 * ss);
  }
  /* ---- a walking tree ---- */
  function tree(ctx, x, y, s, t, lk, flash, walk) {
    const ss = s * (lk.big ? 1.8 : lk.small ? 0.65 : 1), c = flash ? '#ffffff' : lk.c || '#5a8a3a', a = lk.a || '#b6ff5a', sw = Math.sin(walk || 0) * 2 * ss, bark = '#6b4a2b';
    ln(ctx, [x - 2 * ss, y - 8 * ss], [x - 4 * ss + sw, y], bark, 3 * ss); ln(ctx, [x + 2 * ss, y - 8 * ss], [x + 4 * ss - sw, y], bark, 3 * ss);
    poly(ctx, [[x - 5 * ss, y - 7 * ss], [x + 5 * ss, y - 7 * ss], [x + 3.5 * ss, y - 26 * ss], [x - 3.5 * ss, y - 26 * ss]], lit(ctx, x, y - 26 * ss, y - 7 * ss, bark));
    ln(ctx, [x + 3 * ss, y - 20 * ss], [x + 10 * ss, y - 24 * ss + Math.sin(t * 2) * 2 * ss], bark, 2 * ss); ln(ctx, [x - 3 * ss, y - 21 * ss], [x - 9 * ss, y - 27 * ss], bark, 2 * ss);
    [[0, -31, 9], [-6, -27, 6], [6, -28, 6.5], [2, -36, 6]].forEach(([dx, dy, r], i) => blob(ctx, x + dx * ss, y + dy * ss, r * ss, i % 2 ? sh(c, 0.12) : c));
    blob(ctx, x + 1 * ss, y - 20 * ss, 1 * ss, a); blob(ctx, x + 3.5 * ss, y - 20 * ss, 1 * ss, a); glow(ctx, x + 2 * ss, y - 20 * ss, 4 * ss, a, 0.5);
  }
  /* ---- a serpent, on the ground or in the sky ---- */
  function serpent(ctx, x, y, s, t, lk, flash) {
    const c = flash ? '#ffffff' : lk.c || '#3f7a4a', a = lk.a || '#b6ff5a', base = lk.fly ? y - 30 * s : y - 5 * s;
    if (lk.fly) ell(ctx, x, y + 1, 14 * s, 3 * s, 'rgba(0,0,0,.2)');
    for (let i = 10; i >= 0; i--) { const px = x - i * 3.4 * s, py = base + Math.sin(t * 3 - i * 0.7) * 4 * s - (lk.fly ? 0 : Math.max(0, 4 - i) * 2 * s); blob(ctx, px, py, (5.2 - i * 0.3) * s, i % 2 ? c : sh(c, 0.12)); if (lk.stars && i % 3 === 0) blob(ctx, px, py - 1 * s, 0.8 * s, '#ffffff'); }
    const hx = x + 3 * s, hy = base - (lk.fly ? 0 : 8 * s) + Math.sin(t * 3) * 4 * s; ell(ctx, hx, hy, 6 * s, 4 * s, c); blob(ctx, hx + 2 * s, hy - 1.5 * s, 1.1 * s, a); glow(ctx, hx + 2 * s, hy - 1.5 * s, 4 * s, a, 0.6); ln(ctx, [hx + 6 * s, hy + 1 * s], [hx + 9 * s, hy + 1 * s + Math.sin(t * 12) * 1.5 * s], '#ff5a6e', 0.8 * s);
  }
  /* ---- a dragon, for the knight's drake and the tamer's ---- */
  function drake(ctx, x, y, s, t, lk, flash) {
    const c = flash ? '#ffffff' : lk.c || '#8a3a2a', a = lk.a || '#ffb02e', fl = y - 34 * s + Math.sin(t * 1.5) * 4 * s, flap = Math.sin(t * 4) * 12 * s;
    ell(ctx, x, y + 1, 22 * s, 5 * s, 'rgba(0,0,0,.25)');
    poly(ctx, [[x - 4 * s, fl - 6 * s], [x - 20 * s, fl - 36 * s - flap * 0.4], [x - 34 * s, fl - 10 * s], [x - 14 * s, fl + 2 * s]], sh(a, -0.35));
    ctx.strokeStyle = c; ctx.lineWidth = 5 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(x - 40 * s, fl + 12 * s + Math.sin(t * 3) * 3 * s); ctx.quadraticCurveTo(x - 18 * s, fl + 2 * s, x, fl); ctx.stroke(); ctx.lineCap = 'butt';
    ell(ctx, x - 6 * s, fl, 14 * s, 7 * s, lit(ctx, x, fl - 7 * s, fl + 7 * s, c)); ell(ctx, x - 6 * s, fl + 3 * s, 11 * s, 3.5 * s, sh(a, 0.2));
    ln(ctx, [x + 5 * s, fl - 3 * s], [x + 13 * s, fl - 12 * s], c, 5 * s); ell(ctx, x + 17 * s, fl - 13 * s, 7 * s, 4.5 * s, c); poly(ctx, [[x + 20 * s, fl - 11 * s], [x + 28 * s, fl - 10 * s], [x + 21 * s, fl - 8 * s]], sh(c, -0.2));
    poly(ctx, [[x + 13 * s, fl - 16 * s], [x + 9 * s, fl - 24 * s], [x + 16 * s, fl - 17 * s]], '#f4ecd0'); blob(ctx, x + 19 * s, fl - 14.5 * s, 1.3 * s, a); glow(ctx, x + 19 * s, fl - 14.5 * s, 5 * s, a, 0.6);
    poly(ctx, [[x - 2 * s, fl - 5 * s], [x - 14 * s, fl - 38 * s + flap * 0.5], [x - 26 * s, fl - 8 * s], [x - 10 * s, fl + 1 * s]], sh(a, -0.15)); ln(ctx, [x - 2 * s, fl - 5 * s], [x - 14 * s, fl - 38 * s + flap * 0.5], sh(c, 0.2), 1.6 * s);
    [[-8, 1], [2, 3]].forEach(([dx, ph]) => ln(ctx, [x + dx * s, fl + 5 * s], [x + dx * s + Math.sin(t * 3 + ph) * 2 * s, fl + 12 * s], sh(c, -0.2), 2.4 * s));
  }
  /* ---- a rider: a person on a horse ---- */
  function rider(ctx, x, y, s, t, lk, flash, walk) {
    const horse = lk.horse || (lk.c === '#262a36' ? '#1c1f2a' : '#6b4a2b');
    beast(ctx, x - 2 * s, y, s, t, { g: 'mule', c: flash ? '#ffffff' : horse, a: lk.a }, false, (walk || 0) * 1.5);
    ctx.fillStyle = lk.a || '#ffc531'; ctx.fillRect(x - 8 * s, y - 20 * s, 12 * s, 3 * s);
    person(ctx, x - 2 * s, y - 12 * s, s * 0.85, t, Object.assign({}, lk, { g: lk.g }), flash, 0);
  }
  /* ---- the necromancer's own: the rider, the lich, the wyrm ---- */
  function bonerider(ctx, px, py, s, t, eye, flash) { const bone = '#ecebe2'; ell(ctx, px, py - 14 * s, 13 * s, 6 * s, '#3a3440'); [[-9, 1], [-5, -1], [6, 1], [10, -1]].forEach(([o, ph]) => ln(ctx, [px + o * s, py - 10 * s], [px + o * s + Math.sin(t * 12 + ph) * 3 * s, py], bone, 2 * s)); ln(ctx, [px + 10 * s, py - 16 * s], [px + 17 * s, py - 24 * s], bone, 3 * s); ell(ctx, px + 19 * s, py - 24 * s, 5 * s, 3 * s, bone); blob(ctx, px + 21 * s, py - 25 * s, 1.2 * s, '#ff5a5a'); glow(ctx, px + 21 * s, py - 25 * s, 5 * s, '#ff5a5a', 0.5); skeleton(ctx, px - 2 * s, py - 12 * s, s * 0.8, 0, eye, flash); ln(ctx, [px + 2 * s, py - 30 * s], [px + 26 * s, py - 30 * s], '#c9d2dc', 2 * s); }
  function lich(ctx, px, py, s, t) { const fl = py - 6 * s + Math.sin(t * 2) * 3 * s; glow(ctx, px, fl - 18 * s, 22 * s, '#b56cff', 0.35); poly(ctx, [[px - 9 * s, fl + 6 * s], [px + 9 * s, fl + 6 * s], [px + 5 * s, fl - 26 * s], [px - 5 * s, fl - 26 * s]], lit(ctx, px, fl - 26 * s, fl + 6 * s, '#3b1f5a')); ctx.strokeStyle = '#b56cff'; ctx.lineWidth = 1.5; ctx.stroke(); blob(ctx, px, fl - 31 * s, 5.5 * s, '#ecebe2'); blob(ctx, px + 1.5 * s, fl - 31 * s, 1.2 * s, '#b56cff'); blob(ctx, px + 4 * s, fl - 31 * s, 1.2 * s, '#b56cff'); poly(ctx, [[px - 5 * s, fl - 35 * s], [px - 3 * s, fl - 41 * s], [px, fl - 36 * s], [px + 3 * s, fl - 41 * s], [px + 5 * s, fl - 35 * s]], '#ffc531'); glow(ctx, px + 10 * s, fl - 18 * s, 8 * s, '#b56cff', 0.8); blob(ctx, px + 10 * s, fl - 18 * s, 2.5 * s, '#e6d4ff'); }
  function wyrm(ctx, px, py, s, t, flash) {
    const bone = flash ? '#fff' : '#e6e3d6', fl = py - 34 * s + Math.sin(t * 1.5) * 4 * s, flap = Math.sin(t * 4) * 12 * s; ell(ctx, px, py + 1, 22 * s, 5 * s, 'rgba(0,0,0,.25)');
    [[-1, 'rgba(70,50,110,.55)'], [1, 'rgba(90,70,140,.5)']].forEach(([side, c]) => { const bx = px - 2 * s, by = fl - 4 * s, tipx = px - 18 * s, tipy = fl - 34 * s - flap * side * 0.5; poly(ctx, [[bx, by], [tipx, tipy], [px - 30 * s, fl - 8 * s], [px - 14 * s, fl + 2 * s]], c); ln(ctx, [bx, by], [tipx, tipy], bone, 2.2 * s); [0.35, 0.65].forEach(k => ln(ctx, [tipx + (bx - tipx) * k, tipy + (by - tipy) * k], [px - 30 * s + 16 * s * k, fl - 8 * s + 10 * s * k], bone, 1.2 * s)); });
    ctx.strokeStyle = bone; ctx.lineWidth = 4 * s; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(px - 38 * s, fl + 10 * s); ctx.quadraticCurveTo(px - 14 * s, fl - 2 * s, px + 10 * s, fl - 10 * s); ctx.stroke(); ctx.lineCap = 'butt';
    for (let k = -30; k < 8; k += 5) ln(ctx, [px + k * s, fl - 2 * s + k * 0.25 * s], [px + k * s + 1 * s, fl + 7 * s + k * 0.1 * s], bone, 1.6 * s);
    poly(ctx, [[px + 8 * s, fl - 14 * s], [px + 26 * s, fl - 13 * s], [px + 30 * s, fl - 8 * s], [px + 16 * s, fl - 5 * s]], bone); poly(ctx, [[px + 10 * s, fl - 14 * s], [px + 6 * s, fl - 24 * s], [px + 14 * s, fl - 15 * s]], bone);
    ln(ctx, [px + 16 * s, fl - 5 * s], [px + 28 * s, fl - 3 * s + Math.sin(t * 5) * 2 * s], bone, 2 * s); blob(ctx, px + 18 * s, fl - 11 * s, 2 * s, '#1c1a24'); blob(ctx, px + 18.5 * s, fl - 11 * s, 1.3 * s, '#7ff5ff'); glow(ctx, px + 18 * s, fl - 11 * s, 8 * s, '#7ff5ff', 0.5);
  }

  /* ---- one of your fighters, by its id ---- */
  function unit(ctx, u, px, py, s, t) {
    const spec = NW.Classes.units[u.id], lk = spec ? spec.look : { b: 'skeleton', g: 'sword' }, eye = u.raised && !u.called ? '#7cff8a' : '#7ff5ff';
    if (u.called) { ctx.globalAlpha = 0.85; }
    const b = u.id === 'raised' ? 'skeleton' : lk.b;
    if (b === 'skeleton') { const hand = skeleton(ctx, px, py, s, u.walk, eye, u.flash); gear(ctx, u.id === 'raised' ? 'sword' : lk.g, hand, s, t, lk.a || '#ff7a3c', 0); if (u.id === 'warrior' || u.id === 'raised') ell(ctx, px - 5 * s, py - 18 * s, 3.5 * s, 5 * s, '#6b4a2b'); }
    else if (b === 'bonerider') bonerider(ctx, px, py, s, t, eye, u.flash);
    else if (b === 'lich') lich(ctx, px, py, s, t);
    else if (b === 'wyrm') wyrm(ctx, px, py, s, t, u.flash);
    else if (b === 'person') person(ctx, px, py, s * (lk.big ? 1.25 : 1), t, lk, u.flash, u.walk);
    else if (b === 'giant') { ctx.globalAlpha = 0.9; person(ctx, px, py, s * 1.8, t, lk, u.flash, u.walk); glow(ctx, px, py - 30 * s, 30 * s, lk.a, 0.25); }
    else if (b === 'rider') rider(ctx, px, py, s, t, lk, u.flash, u.walk);
    else if (b === 'beast') beast(ctx, px, py, s, t, lk, u.flash, u.walk);
    else if (b === 'bird') bird(ctx, px, py, s, t, lk, u.flash);
    else if (b === 'spirit') spirit(ctx, px, py, s, t, lk, u.flash);
    else if (b === 'construct') construct(ctx, px, py, s, t, lk, u.flash, u.walk);
    else if (b === 'turret') turret(ctx, px, py, s, t, lk, u.flash);
    else if (b === 'tesla') tesla(ctx, px, py, s, t, lk, u.flash);
    else if (b === 'totem') totem(ctx, px, py, s, t, lk, u.flash);
    else if (b === 'golem') golem(ctx, px, py, s, t, lk, u.flash, u.walk);
    else if (b === 'tree') tree(ctx, px, py, s, t, lk, u.flash, u.walk);
    else if (b === 'serpent') serpent(ctx, px, py, s, t, lk, u.flash);
    else if (b === 'drake') drake(ctx, px, py, s, t, lk, u.flash);
    ctx.globalAlpha = 1;
  }
  /* how tall a fighter stands, for its health bar */
  function height(id) { const lk = (NW.Classes.units[id] || {}).look || {}; return lk.fly || lk.b === 'wyrm' || lk.b === 'drake' ? 72 : lk.b === 'golem' || lk.b === 'giant' || (lk.b === 'tree' && lk.big) ? 64 : lk.big ? 50 : 42; }

  /* ---- a worker for the land: your class's crew, hammering ---- */
  function crew(ctx, cls, x, y, s, t) {
    const c = NW.Classes.get(cls).crew, lk = c.look, swing = Math.sin(t * 7) * 3 * s;
    if (lk.b === 'skeleton') { const hand = skeleton(ctx, x, y, s, 0, '#7ff5ff', false); const a = Math.sin(t * 7) * 0.8; ln(ctx, hand, [hand[0] + Math.cos(a - 1) * 7 * s, hand[1] + Math.sin(a - 1) * 7 * s], '#6b4a2b', 1.6 * s); return; }
    if (lk.b === 'person') { person(ctx, x, y, s, t, lk, false, 0); gear(ctx, 'hammer', [x + 6 * s, y - 17 * s], s, t, lk.a, swing); return; }
    if (lk.b === 'construct') { construct(ctx, x, y, s, t, lk, false, t * 2); return; }
    unit(ctx, { id: c.id, walk: t * 3 }, x, y, s, t);
  }

  /* ---- the hero: your class's look, your skin and hair, the weapon glowing its rarity ---- */
  function hero(ctx, x, y, look, t, cast, s) {
    s = s || 1; const k = NW.Classes.get(look.cls), L = k.look, robe = k.colour, acc = k.accent, glowC = look.weapon ? look.weapon.colour : acc, skin = look.skin || '#e8b48a', tier = look.tier || 0;
    ell(ctx, x, y + 2 * s, 14 * s, 4 * s, 'rgba(0,0,0,.35)');
    if (tier >= 2) glow(ctx, x, y - 26 * s, 40 * s, acc, 0.25 + Math.sin(t * 2) * 0.06);   /* the last rank shines */
    const cape = sh(robe, -0.35); if (L.outfit !== 'apron') poly(ctx, [[x - 5 * s, y - 32 * s], [x - 15 * s - Math.sin(t * 2) * 2 * s, y + 1 * s], [x + 2 * s, y], [x + 4 * s, y - 30 * s]], cape);
    /* the body: robes to the ground; armour, leather and furs to the knee over boots */
    const long = L.outfit === 'robe' || L.outfit === 'vestment';
    if (!long) { ln(ctx, [x - 3 * s, y - 14 * s], [x - 4 * s, y - 1 * s], '#2a2230', 3.4 * s); ln(ctx, [x + 3 * s, y - 14 * s], [x + 4 * s, y - 1 * s], '#2a2230', 3.4 * s); }
    const hem = long ? y : y - 12 * s, body = L.outfit === 'armour' ? '#b8c2d0' : robe;
    poly(ctx, [[x - (long ? 12 : 8) * s, hem], [x + (long ? 12 : 8) * s, hem], [x + 6 * s, y - 32 * s], [x - 6 * s, y - 32 * s]], lit(ctx, x, y - 32 * s, hem, body));
    ln(ctx, [x - (long ? 12 : 8) * s, hem], [x + (long ? 12 : 8) * s, hem], acc, 1.6 * s); ln(ctx, [x, y - 31 * s], [x, hem - 1 * s], sh(acc, -0.1), 1 * s);
    if (L.outfit === 'armour') { ell(ctx, x - 6 * s, y - 31 * s, 4 * s, 3 * s, '#dfe5ee'); ell(ctx, x + 6 * s, y - 31 * s, 4 * s, 3 * s, '#9aa6b8'); ln(ctx, [x - 5 * s, y - 24 * s], [x + 5 * s, y - 24 * s], 'rgba(255,255,255,.4)', 1 * s); }
    if (L.outfit === 'fur') { for (let i = -3; i <= 3; i++) blob(ctx, x + i * 2.4 * s, y - 31 * s, 2.6 * s, '#8a6a4a'); }
    if (L.outfit === 'apron') { poly(ctx, [[x - 5 * s, y - 26 * s], [x + 5 * s, y - 26 * s], [x + 6 * s, hem], [x - 6 * s, hem]], '#6b4a2b'); ctx.fillStyle = acc; ctx.fillRect(x - 2 * s, y - 22 * s, 4 * s, 3 * s); }
    if (L.outfit === 'vestment') { ctx.fillStyle = acc; ctx.fillRect(x - 1.5 * s, y - 31 * s, 3 * s, 31 * s); }
    ctx.fillStyle = acc; ctx.fillRect(x - 7 * s, y - 20 * s, 14 * s, 2 * s);
    /* the head */
    const hy = y - 38 * s;
    if (look.body === 'pineapple') { ell(ctx, x, hy, 8 * s, 10 * s, '#f2b42a'); ctx.strokeStyle = 'rgba(140,80,10,.5)'; ctx.lineWidth = 0.8 * s; for (let d = -8; d < 8; d += 3) { ctx.beginPath(); ctx.moveTo(x + (d - 5) * s, hy + 8 * s); ctx.lineTo(x + (d + 5) * s, hy - 8 * s); ctx.stroke(); } [[-4, -8], [0, -12], [4, -8]].forEach(([o, h]) => poly(ctx, [[x + (o - 2) * s, hy - 8 * s], [x + o * 1.4 * s, hy + (h - 8) * s], [x + (o + 2) * s, hy - 8 * s]], '#3fa66b')); blob(ctx, x + 2 * s, hy + 1 * s, 1.2 * s, '#1c1a24'); blob(ctx, x + 5 * s, hy + 1 * s, 1.2 * s, '#1c1a24'); }
    else {
      blob(ctx, x + 0.5 * s, hy + 2 * s, 6.5 * s, skin); blob(ctx, x + 3 * s, hy + 1.5 * s, 1.1 * s, '#1c1a24'); blob(ctx, x + 5.6 * s, hy + 1.5 * s, 1.1 * s, '#1c1a24');
      const hair = look.hair || '#4a2e1a', hcol = sh(robe, -0.45);
      if (L.head === 'hood') { ctx.fillStyle = hcol; ctx.beginPath(); ctx.arc(x, hy + 1 * s, 8.5 * s, Math.PI * 0.9, Math.PI * 2.1); ctx.lineTo(x + 5 * s, hy + 8 * s); ctx.lineTo(x - 8 * s, hy + 8 * s); ctx.closePath(); ctx.fill(); glow(ctx, x + 4 * s, hy + 1.5 * s, 5 * s, acc, 0.4); }
      else if (L.head === 'helm') { ctx.fillStyle = '#c9d2dc'; ctx.beginPath(); ctx.arc(x + 0.5 * s, hy + 1 * s, 7.5 * s, Math.PI, 0); ctx.lineTo(x + 8 * s, hy + 5 * s); ctx.lineTo(x - 7 * s, hy + 5 * s); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#1c1a24'; ctx.fillRect(x + 1 * s, hy + 0.5 * s, 7 * s, 1.6 * s); poly(ctx, [[x - 2 * s, hy - 6 * s], [x - 8 * s, hy - 14 * s + Math.sin(t * 3) * s], [x + 2 * s, hy - 7 * s]], acc); }
      else if (L.head === 'mask') { ctx.fillStyle = hcol; ctx.beginPath(); ctx.arc(x, hy + 1 * s, 8 * s, Math.PI * 0.9, Math.PI * 2.1); ctx.fill(); ctx.fillStyle = '#1c1f2a'; ctx.fillRect(x - 1 * s, hy + 3.5 * s, 9 * s, 4 * s); blob(ctx, x + 4.5 * s, hy + 1.5 * s, 1.2 * s, acc); }
      else if (L.head === 'hat') { poly(ctx, [[x - 10 * s, hy - 3 * s], [x + 11 * s, hy - 3 * s], [x + 3 * s, hy - 7 * s]], sh(robe, -0.2)); poly(ctx, [[x - 5 * s, hy - 5 * s], [x + 6 * s, hy - 5 * s], [x - 4 * s + Math.sin(t * 2) * s, hy - 22 * s]], sh(robe, -0.1)); blob(ctx, x - 4 * s + Math.sin(t * 2) * s, hy - 22 * s, 1.6 * s, acc); }
      else if (L.head === 'circlet' || L.head === 'veil') { ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, hy + 0.5 * s, 7 * s, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ln(ctx, [x - 6 * s, hy - 1 * s], [x + 7 * s, hy - 1 * s], acc, 1.4 * s); blob(ctx, x + 1 * s, hy - 1.5 * s, 1.5 * s, '#ffffff'); if (L.head === 'veil') { ctx.globalAlpha = 0.55; poly(ctx, [[x - 7 * s, hy - 1 * s], [x + 8 * s, hy - 1 * s], [x + 6 * s, hy + 12 * s], [x - 9 * s, hy + 12 * s]], sh(acc, 0.3)); ctx.globalAlpha = 1; } }
      else if (L.head === 'goggles') { ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, hy + 0.5 * s, 7 * s, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ln(ctx, [x - 6 * s, hy - 1.5 * s], [x + 7 * s, hy - 1.5 * s], '#3b3a44', 1.6 * s); blob(ctx, x + 2 * s, hy - 2 * s, 2.2 * s, acc); blob(ctx, x + 6 * s, hy - 2 * s, 2 * s, acc); }
      else if (L.head === 'mitre') { poly(ctx, [[x - 5 * s, hy - 3 * s], [x + 6 * s, hy - 3 * s], [x + 4 * s, hy - 15 * s], [x + 0.5 * s, hy - 19 * s], [x - 3 * s, hy - 15 * s]], '#f4f1e8'); ctx.fillStyle = acc; ctx.fillRect(x - 0.5 * s, hy - 17 * s, 2 * s, 14 * s); }
      else if (L.head === 'antlers') { ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, hy + 0.5 * s, 7 * s, Math.PI * 0.95, Math.PI * 2.05); ctx.fill(); ctx.strokeStyle = '#d9c9a8'; ctx.lineWidth = 1.4 * s; [[-1, -5], [1, 5]].forEach(([d, o]) => { ctx.beginPath(); ctx.moveTo(x + o * 0.5 * s, hy - 5 * s); ctx.lineTo(x + o * s, hy - 16 * s); ctx.moveTo(x + o * 0.8 * s, hy - 10 * s); ctx.lineTo(x + (o + d * 4) * s, hy - 14 * s); ctx.stroke(); }); [[-3, -13], [4, -15]].forEach(([dx, dy]) => ell(ctx, x + dx * s, hy + dy * s, 1.8 * s, 1 * s, '#6fd08c')); }
      else if (L.head === 'horns') { ctx.fillStyle = '#6b4a2b'; ctx.beginPath(); ctx.arc(x + 0.5 * s, hy + 0.5 * s, 7.2 * s, Math.PI, 0); ctx.fill(); ctx.strokeStyle = '#f4ecd0'; ctx.lineWidth = 2.2 * s; [[-1], [1]].forEach(([d]) => { ctx.beginPath(); ctx.moveTo(x + d * 6 * s, hy - 2 * s); ctx.quadraticCurveTo(x + d * 12 * s, hy - 5 * s, x + d * 10 * s, hy - 12 * s); ctx.stroke(); }); }
      else { ctx.fillStyle = hair; ctx.beginPath(); ctx.arc(x, hy + 0.5 * s, 7 * s, Math.PI * 0.9, Math.PI * 2.05); ctx.fill(); ctx.fillRect(x - 7 * s, hy, 3 * s, 6 * s); }
      if (tier >= 1 && L.head !== 'helm' && L.head !== 'mitre' && L.head !== 'hat') poly(ctx, [[x - 4 * s, hy - 6 * s], [x - 3 * s, hy - 10 * s], [x - 1 * s, hy - 7.5 * s], [x + 1 * s, hy - 11 * s], [x + 3 * s, hy - 7.5 * s], [x + 5 * s, hy - 10 * s], [x + 6 * s, hy - 6 * s]], tier >= 2 ? '#ffd35a' : '#c9d2dc');   /* a circlet at the second rank, a crown at the third */
    }
    /* the arm and the weapon, which glows its rarity; it flares when you cast */
    const hand = [x + 10 * s, y - 22 * s]; ln(ctx, [x + 4 * s, y - 29 * s], hand, sh(body, 0.05), 3 * s); blob(ctx, hand[0], hand[1], 1.6 * s, skin);
    gear(ctx, L.weapon, hand, s * 1.1, t, glowC, 0);
    if (cast) glow(ctx, hand[0] + 4 * s, hand[1] - 12 * s, 26 * s, glowC, 0.8);
  }

  NW.Figures = { unit, hero, crew, height, gear, person, skeleton };
})();
