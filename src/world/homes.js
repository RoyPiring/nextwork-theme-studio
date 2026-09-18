/* NextWorld · homes: what a project builds, in the era it stands in
 * One lineage. Every project on your land is drawn in the material of the
 * era the place has reached, so when the settlement levels up the whole
 * town rebuilds itself: canvas at the campground, logs at the fort,
 * timber and stone in the town, brick in the city, steel and glass in
 * the metropolis, white stone at the capital, and the kingdom's houses
 * are the future. The kind of project only tints the building and adds
 * one detail, so a street reads as one place, not a catalogue. */
'use strict';
(function () {
  const { B } = NW;
  /* the accent and the one detail each kind carries through every era */
  const KIND = { home: ['#d9563f', 'chimney'], lab: ['#5a3aa8', 'dish'], library: ['#c9503c', 'sign'], barn: ['#8a5a3a', 'silo'], tower: ['#2f7fd6', 'mast'], workshop: ['#e3a45b', 'stack'], vault: ['#6b7280', 'gate'], datacentre: ['#3fa66b', 'vents'], yard: ['#f2b42a', 'crate'], clinic: ['#e8352f', 'cross'], bank: ['#c9971f', 'coin'] };
  function detail(I, b, gx, gy, H, kind, now) {
    const d = (KIND[kind] || KIND.home)[1], c = (KIND[kind] || KIND.home)[0];
    if (d === 'chimney') { I.chimney(gx + 0.7, gy + 0.2, H + 6, '#9c5a3a'); const q = I.p(gx + 0.76, gy + 0.26, H + 24); I.smoke(q[0], q[1], now); }
    else if (d === 'dish') { const q = I.p(gx + 0.75, gy + 0.3, H + 8); I.ctx.fillStyle = '#e6e9ef'; I.ctx.beginPath(); I.ctx.ellipse(q[0], q[1] - 4, 6, 4, -0.5, 0, Math.PI * 2); I.ctx.fill(); I.line(q, [q[0], q[1] - 4], '#8a95a6', 2); }
    else if (d === 'sign') { const s = I.up(I.P(b.D, b.C, 0.5), H * 0.7); I.roundRect(s[0] - 8, s[1] - 4, 16, 7, 2, '#f4f1e8'); I.ctx.fillStyle = c; I.ctx.fillRect(s[0] - 6, s[1] - 2, 5, 3); I.ctx.fillRect(s[0] + 1, s[1] - 2, 5, 3); }
    else if (d === 'silo') { const t = I.box(gx + 0.82, gy + 0.05, 0.16, 0.16, H + 10, '#c9c2b0', 0, { noShadow: true }); I.roof(gx + 0.82, gy + 0.05, 0.16, 0.16, H + 10, 6, '#8a8f98', 0.05); }
    else if (d === 'mast') { const q = I.p(gx + 0.5, gy + 0.5, H + 4); I.line(q, [q[0], q[1] - 26], '#8a95a3', 2); I.blob(q[0], q[1] - 27, 2, Math.floor(now / 500) % 2 ? '#ff4d4d' : '#ffb3b3'); }
    else if (d === 'stack') { I.chimney(gx + 0.75, gy + 0.15, H + 4, '#6b7280'); const q = I.p(gx + 0.81, gy + 0.21, H + 22); I.smoke(q[0], q[1], now); }
    else if (d === 'gate') { const a = I.P(b.D, b.C, 0.36), e = I.P(b.D, b.C, 0.64); I.poly([a, e, I.up(e, H * 0.6), I.up(a, H * 0.6)], '#3b4252'); I.line(I.P(a, e, 0.5), I.up(I.P(a, e, 0.5), H * 0.6), '#9aa3b0', 1); }
    else if (d === 'vents') { [0.2, 0.5, 0.8].forEach(u => I.box(gx + u - 0.06, gy + 0.2, 0.12, 0.12, 5, '#dfe5ee', H + 4, { noShadow: true })); }
    else if (d === 'crate') { I.box(gx + 1.02, gy + 0.7, 0.22, 0.22, 7, c, 0, { noShadow: true, tex: 'ribbed' }); }
    else if (d === 'cross') { const s = I.up(I.P(b.D, b.C, 0.5), H * 0.72); I.roundRect(s[0] - 5, s[1] - 5, 10, 10, 2, '#fff'); I.ctx.fillStyle = c; I.ctx.fillRect(s[0] - 1.2, s[1] - 3.5, 2.4, 7); I.ctx.fillRect(s[0] - 3.5, s[1] - 1.2, 7, 2.4); }
    else if (d === 'coin') { const s = I.up(I.P(b.D, b.C, 0.5), H * 0.72); I.blob(s[0], s[1], 4, c); I.ctx.fillStyle = '#4a2b00'; I.ctx.font = '800 5px Baloo 2, system-ui, sans-serif'; I.ctx.textAlign = 'center'; I.ctx.fillText('$', s[0], s[1] + 2); I.ctx.textAlign = 'left'; }
  }
  const accent = kind => (KIND[kind] || KIND.home)[0];
  const ERA_HOME = [
    /* 0 campground: a canvas shelter over poles, a firewood stack, what you carried in */
    function (I, gx, gy, k, now, kind) { const c = I.p(gx + 0.5, gy + 0.5); I.ctx.fillStyle = 'rgba(20,40,30,.22)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] + 2, c[1] + 2, 16, 7, 0, 0, Math.PI * 2); I.ctx.fill(); const t = accent(kind); I.poly([[c[0] - 16, c[1] + 2], [c[0] + 16, c[1] + 2], [c[0], c[1] - 24]], '#e9e4d6'); I.poly([[c[0], c[1] + 2], [c[0] + 16, c[1] + 2], [c[0], c[1] - 24]], '#cfc7aa'); I.poly([[c[0] - 4, c[1] + 2], [c[0] + 4, c[1] + 2], [c[0], c[1] - 10]], '#6b4a2b'); I.ctx.fillStyle = t; I.ctx.fillRect(c[0] - 15, c[1] - 1, 30, 2.5); const w = I.p(gx + 1.05, gy + 0.6); for (let i = 0; i < 5; i++) { I.ctx.fillStyle = i % 2 ? '#8a5a3a' : '#6b4a2b'; I.ctx.fillRect(w[0] - 6 + (i % 3) * 4, w[1] - 4 - Math.floor(i / 3) * 3.5, 3.5, 3); } },
    /* 1 fort: a log cabin, shake roof, stone chimney */
    function (I, gx, gy, k, now, kind) { const b = I.box(gx + 0.12, gy + 0.12, 0.76, 0.76, 30, '#a8763f', 0, { tex: 'siding' }); I.line(b.D, b.C, '#6b4a2b', 2); I.win(b.D, b.C, 0.15, 10, 0.22, 11, true); I.door(b.D, b.C, 0.6, 0.24, 20, '#4a2b17'); I.roof(gx + 0.12, gy + 0.12, 0.76, 0.76, 30, 18, '#6b4a2b'); I.ctx.fillStyle = accent(kind); const q = I.p(gx + 0.5, gy + 0.98); I.ctx.fillRect(q[0] - 6, q[1] - 3, 12, 2); detail(I, b, gx, gy, 30, kind, now); },
    /* 2 town: timber-frame on a stone base, tiled roof, a storey and a half */
    function (I, gx, gy, k, now, kind) { I.box(gx + 0.1, gy + 0.1, 0.8, 0.8, 8, '#b3ada3', 0, { tex: 'stone' }); const b = I.box(gx + 0.1, gy + 0.1, 0.8, 0.8, 34, '#f3e6cc', 8, { noShadow: true }); [0.15, 0.5, 0.85].forEach(u => I.line(I.P(b.D, b.C, u), I.up(I.P(b.D, b.C, u), 34), '#5a3a1e', 1.5)); I.line(I.up(b.D, 17), I.up(b.C, 17), '#5a3a1e', 1.5); I.line(I.up(b.D, 34), I.up(b.C, 34), '#5a3a1e', 2); I.win(b.D, b.C, 0.2, 10, 0.2, 12, true); I.win(b.D, b.C, 0.6, 20, 0.2, 10, false); I.door(b.D, b.C, 0.58, 0.22, 20, '#6b3a22'); I.roof(gx + 0.1, gy + 0.1, 0.8, 0.8, 42, 22, accent(kind)); detail(I, b, gx, gy, 42, kind, now); },
    /* 3 city: a brick townhouse, two storeys, a parapet and an awning */
    function (I, gx, gy, k, now, kind) { const b = I.box(gx + 0.08, gy + 0.08, 0.84, 0.84, 56, '#b8553f', 0, { tex: 'brick' }); I.win(b.D, b.C, 0.12, 12, 0.2, 14, true); I.win(b.D, b.C, 0.12, 38, 0.2, 14, false); I.win(b.D, b.C, 0.66, 38, 0.2, 14, true); I.door(b.D, b.C, 0.6, 0.24, 22, '#172033'); I.win(b.C, b.B, 0.25, 12, 0.3, 14, true); I.win(b.C, b.B, 0.25, 38, 0.3, 14, false); I.poly([I.p(gx + 0.55, gy + 0.9, 26), I.p(gx + 0.92, gy + 0.9, 26), I.p(gx + 0.92, gy + 1.1, 22), I.p(gx + 0.55, gy + 1.1, 22)], accent(kind)); I.flatRoof(gx + 0.08, gy + 0.08, 0.84, 0.84, 56, '#4b5563'); I.box(gx + 0.05, gy + 0.05, 0.9, 0.06, 5, '#e9e2d0', 58, { noShadow: true }); detail(I, b, gx, gy, 58, kind, now); },
    /* 4 metropolis: steel and glass, three storeys, a rooftop unit */
    function (I, gx, gy, k, now, kind) { const b = I.box(gx + 0.1, gy + 0.1, 0.8, 0.8, 78, '#3b6fb5', 0, { tex: 'glass', top: 0.1 }); [0.15, 0.55].forEach(u => I.line(I.P(b.D, b.C, u), I.up(I.P(b.D, b.C, u), 78), '#dfe5ee', 1)); I.door(b.D, b.C, 0.58, 0.28, 22, '#172033'); I.poly([I.up(b.D, 78), I.up(b.C, 78), I.up(b.C, 82), I.up(b.D, 82)], accent(kind)); I.flatRoof(gx + 0.1, gy + 0.1, 0.8, 0.8, 82, '#9aa3b0'); I.box(gx + 0.6, gy + 0.55, 0.22, 0.22, 8, '#dfe5ee', 86, { noShadow: true }); detail(I, b, gx, gy, 86, kind, now); },
    /* 5 capital: white stone, a colonnade, a roof garden */
    function (I, gx, gy, k, now, kind) { I.box(gx + 0.05, gy + 0.05, 0.9, 0.9, 6, '#e9e2d0', 0, { tex: 'stone', top: 0.1 }); const b = I.box(gx + 0.12, gy + 0.12, 0.76, 0.76, 64, '#f4f1e8', 6, { tex: 'stone', noShadow: true }); [0.1, 0.4, 0.7].forEach(u => I.win(b.D, b.C, u, 14, 0.14, 18, (Math.floor(u * 10)) % 2 === 0)); [0.1, 0.4, 0.7].forEach(u => I.win(b.D, b.C, u, 42, 0.14, 16, true)); I.door(b.D, b.C, 0.58, 0.22, 24, accent(kind)); [0.05, 0.35, 0.65, 0.95].forEach(u => I.box(gx + 0.12 + u * 0.72, gy + 0.9, 0.05, 0.05, 30, '#f4f1e8', 6, { noShadow: true })); I.flatRoof(gx + 0.12, gy + 0.12, 0.76, 0.76, 70, '#e9e2d0'); I.blob(I.p(gx + 0.4, gy + 0.4, 76)[0], I.p(gx + 0.4, gy + 0.4, 76)[1], 6, '#5cc464', 0.7); I.blob(I.p(gx + 0.7, gy + 0.6, 76)[0], I.p(gx + 0.7, gy + 0.6, 76)[1], 5, '#3fa66b', 0.7); detail(I, b, gx, gy, 72, kind, now); },
    /* 6 kingdom: the future. a rounded shell, a light band, a lit spire */
    function (I, gx, gy, k, now, kind) { const c = I.p(gx + 0.5, gy + 0.5); I.ctx.fillStyle = 'rgba(20,40,30,.25)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] + 3, c[1] + 2, 18, 8, 0, 0, Math.PI * 2); I.ctx.fill(); const g = I.ctx.createLinearGradient(c[0] - 16, c[1], c[0] + 16, c[1]); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#e6e9ef'); g.addColorStop(1, '#9aa3b0'); I.ctx.fillStyle = g; I.ctx.beginPath(); I.ctx.moveTo(c[0] - 16, c[1]); I.ctx.quadraticCurveTo(c[0] - 18, c[1] - 60, c[0], c[1] - 66); I.ctx.quadraticCurveTo(c[0] + 18, c[1] - 60, c[0] + 16, c[1]); I.ctx.closePath(); I.ctx.fill(); const a = accent(kind); I.ctx.strokeStyle = a; I.ctx.lineWidth = 2.5; I.ctx.beginPath(); I.ctx.moveTo(c[0] - 16.5, c[1] - 22); I.ctx.quadraticCurveTo(c[0], c[1] - 16, c[0] + 16.5, c[1] - 22); I.ctx.stroke(); I.ctx.fillStyle = 'rgba(79,240,255,.55)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] - 4, c[1] - 38, 6, 9, 0, 0, Math.PI * 2); I.ctx.fill(); I.ctx.fillStyle = '#172033'; I.ctx.beginPath(); I.ctx.ellipse(c[0] + 5, c[1] - 10, 4, 8, 0, 0, Math.PI * 2); I.ctx.fill(); I.line([c[0], c[1] - 66], [c[0], c[1] - 80], '#e6e9ef', 2); I.blob(c[0], c[1] - 82, 2.5, a); I.lights.push({ x: c[0], y: c[1] - 30, r: 30, c: '120,220,255', k: 0.6 }); const q = I.p(gx + 0.5, gy + 1.02); I.ctx.fillStyle = 'rgba(79,240,255,.5)'; I.ctx.fillRect(q[0] - 10, q[1] - 1.5, 20, 1.5); }
  ];
  /* what a building goes up as, one component per step */
  const STAGES = ['pegs', 'slab', 'posts', 'walls', 'windows', 'roof', 'door', 'trim', 'garden'];
  function drawStage(I, gx, gy, done, total, kind, era, k, now) {
    const n = Math.max(1, total | 0), reached = Math.round(Math.min(done, n) / n * STAGES.length), z = (1 - k) * -50;
    const has = s => reached >= STAGES.indexOf(s) + 1, lift = s => reached === STAGES.indexOf(s) + 1 ? -z : 0;
    I.ctx.setLineDash([4, 4]); I.poly([I.p(gx - 0.2, gy - 0.2), I.p(gx + 1.2, gy - 0.2), I.p(gx + 1.2, gy + 1.2), I.p(gx - 0.2, gy + 1.2)], 'rgba(255,255,255,.1)', 'rgba(255,255,255,.8)', 1.2); I.ctx.setLineDash([]);
    [[-0.2, -0.2], [1.2, -0.2], [-0.2, 1.2], [1.2, 1.2]].forEach(o => { const q = I.p(gx + o[0], gy + o[1]); I.ctx.fillStyle = '#8b5a2b'; I.ctx.fillRect(q[0] - 1, q[1] - 9, 2, 9); I.ctx.fillStyle = '#e8552f'; I.ctx.fillRect(q[0] - 3, q[1] - 11, 6, 3); });
    if (done >= n && n > 0) { ERA_HOME[era](I, gx, gy, 1, now, kind); return 'Finished'; }
    const wall = era <= 1 ? '#a8763f' : era === 2 ? '#f3e6cc' : era === 3 ? '#b8553f' : era === 4 ? '#3b6fb5' : '#f4f1e8', tex = era <= 1 ? 'siding' : era === 2 ? 'siding' : era === 3 ? 'brick' : era === 4 ? 'glass' : 'stone', H = era <= 2 ? 34 : era === 3 ? 56 : era === 4 ? 78 : 64;
    if (has('slab')) I.box(gx + 0.05, gy + 0.05, 0.9, 0.9, 5, era >= 2 ? '#c9c2b0' : '#8a6a3f', lift('slab'), { top: 0.1 });
    if (has('posts') && !has('walls')) [[0.12, 0.12], [0.88, 0.12], [0.12, 0.88], [0.88, 0.88]].forEach(o => I.box(gx + o[0] - 0.04, gy + o[1] - 0.04, 0.08, 0.08, H, era <= 2 ? '#b58a5a' : '#8a95a6', 5 + lift('posts'), { noShadow: true }));
    let b = null; if (has('walls')) { b = I.box(gx + 0.1, gy + 0.1, 0.8, 0.8, H, wall, 5 + lift('walls'), { noShadow: true, tex }); }
    if (has('windows') && b) { I.win(b.D, b.C, 0.15, 12, 0.22, 14, false); I.win(b.C, b.B, 0.25, 12, 0.3, 14, false); if (H > 40) I.win(b.D, b.C, 0.15, 38, 0.22, 14, false); }
    if (has('roof')) { if (era <= 2) I.roof(gx + 0.1, gy + 0.1, 0.8, 0.8, H + 5 + lift('roof'), 22, era === 0 ? '#e9e4d6' : era === 1 ? '#6b4a2b' : accent(kind)); else I.flatRoof(gx + 0.1, gy + 0.1, 0.8, 0.8, H + 5 + lift('roof'), era === 3 ? '#4b5563' : '#9aa3b0'); }
    if (has('door') && b) I.door(b.D, b.C, 0.6, 0.24, 22, '#6b3a22');
    if (has('trim') && b) I.poly([I.up(b.D, H + 5), I.up(b.C, H + 5), I.up(b.C, H + 9), I.up(b.D, H + 9)], accent(kind));
    if (has('garden')) { I.bush(gx - 0.05, gy + 0.95, true); I.bush(gx + 0.95, gy - 0.05, false); }
    if (done > 0) I.puff(gx, gy, k);
    return reached ? STAGES[Math.min(reached, STAGES.length) - 1].replace(/^\w/, ch => ch.toUpperCase()) : 'Pegged out';
  }
  /* the hospital, at hospital size: three wide, two deep, three storeys, the cross on the roof */
  B.CIV.hospital = function (I, gx, gy, now) { I.box(gx - 0.2, gy - 0.2, 3.4, 2.4, 4, '#cfd5df', 0, { top: 0.1 }); const H = 62, b = I.box(gx, gy, 3, 2, H, '#f4f6f8', 4, { tex: 'siding' }); for (let r = 0; r < 3; r++) for (let u = 0.06; u < 0.95; u += 0.12) { if (r === 0 && u > 0.38 && u < 0.6) continue; I.win(b.D, b.C, u, 10 + r * 19, 0.07, 12, ((r + Math.floor(u * 10)) % 3) !== 0); } for (let r = 0; r < 3; r++) [0.15, 0.45, 0.75].forEach(u => I.win(b.C, b.B, u, 10 + r * 19, 0.16, 12, r !== 1)); const a = I.P(b.D, b.C, 0.4), c = I.P(b.D, b.C, 0.6); I.poly([a, c, I.up(c, 20), I.up(a, 20)], '#9ad3ff'); I.poly([I.p(gx + 0.9, gy + 2.05, 24), I.p(gx + 2.1, gy + 2.05, 24), I.p(gx + 2.1, gy + 2.5, 20), I.p(gx + 0.9, gy + 2.5, 20)], '#e8352f'); I.flatRoof(gx, gy, 3, 2, H + 4, '#dfe5ee'); const s = I.p(gx + 1.5, gy + 1, H + 12); I.roundRect(s[0] - 9, s[1] - 9, 18, 18, 3, '#ffffff'); I.ctx.fillStyle = '#e8352f'; I.ctx.fillRect(s[0] - 2.5, s[1] - 7, 5, 14); I.ctx.fillRect(s[0] - 7, s[1] - 2.5, 14, 5); I.box(gx + 2.5, gy + 0.3, 0.3, 0.3, 10, '#dfe5ee', H + 4, { noShadow: true }); I.label(gx + 1.5, gy + 2.9, 'Hospital', '', 9); };
  B.CIV.library = function (I, gx, gy, now) { B.library(I, gx, gy, 1, now, 3); B.library(I, gx + 1, gy, 1, now, 3); I.label(gx + 1, gy + 1.7, 'Library', '', 8); };
  B.CIV.datacentre = function (I, gx, gy, now) { B.datacentre(I, gx, gy, 1, now, 3); I.label(gx + 0.6, gy + 1.7, 'Data Centre', 'what keeps the city running', 8); };
  NW.Homes = { ERA_HOME, drawStage, STAGES, KIND };
})();
