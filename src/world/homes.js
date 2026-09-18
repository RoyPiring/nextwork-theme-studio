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
    function (I, gx, gy, k, now, kind) { const c = I.p(gx + 0.5, gy + 0.5); I.ctx.fillStyle = 'rgba(20,40,30,.22)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] + 2, c[1] + 2, 16, 7, 0, 0, Math.PI * 2); I.ctx.fill(); const t = accent(kind); I.poly([[c[0] - 20, c[1] + 3], [c[0] + 20, c[1] + 3], [c[0], c[1] - 26]], '#e9e4d6'); I.poly([[c[0], c[1] + 3], [c[0] + 20, c[1] + 3], [c[0], c[1] - 26]], '#cfc7aa'); I.poly([[c[0] - 5, c[1] + 3], [c[0] + 5, c[1] + 3], [c[0], c[1] - 12]], '#6b4a2b'); I.ctx.fillStyle = t; I.ctx.fillRect(c[0] - 19, c[1], 38, 3); const w = I.p(gx + 1.05, gy + 0.6); for (let i = 0; i < 5; i++) { I.ctx.fillStyle = i % 2 ? '#8a5a3a' : '#6b4a2b'; I.ctx.fillRect(w[0] - 6 + (i % 3) * 4, w[1] - 4 - Math.floor(i / 3) * 3.5, 3.5, 3); } },
    /* 1 fort: a log cabin, shake roof, stone chimney */
    function (I, gx, gy, k, now, kind) { const b = I.box(gx - 0.15, gy - 0.15, 1.3, 1.3, 29, '#a8763f', 0, { tex: 'siding' }); I.line(b.D, b.C, '#6b4a2b', 2); I.win(b.D, b.C, 0.12, 9, 0.2, 13, true); I.win(b.D, b.C, 0.4, 9, 0.2, 13, false); I.door(b.D, b.C, 0.68, 0.2, 22, '#4a2b17'); I.win(b.C, b.B, 0.3, 9, 0.28, 13, true); I.roof(gx - 0.15, gy - 0.15, 1.3, 1.3, 29, 21, '#6b4a2b'); I.ctx.fillStyle = accent(kind); const q = I.p(gx + 0.5, gy + 1.25); I.ctx.fillRect(q[0] - 8, q[1] - 3, 16, 2.5); detail(I, b, gx, gy, 29, kind, now); },
    /* 2 town: timber-frame on a stone base, tiled roof, a storey and a half */
    function (I, gx, gy, k, now, kind) { I.box(gx - 0.2, gy - 0.2, 1.4, 1.4, 9, '#b3ada3', 0, { tex: 'stone' }); const b = I.box(gx - 0.2, gy - 0.2, 1.4, 1.4, 36, '#f3e6cc', 9, { noShadow: true }); [0.12, 0.38, 0.62, 0.88].forEach(u => I.line(I.P(b.D, b.C, u), I.up(I.P(b.D, b.C, u), 36), '#5a3a1e', 1.5)); I.line(I.up(b.D, 18), I.up(b.C, 18), '#5a3a1e', 1.5); I.line(I.up(b.D, 36), I.up(b.C, 36), '#5a3a1e', 2); I.win(b.D, b.C, 0.18, 9, 0.16, 13, true); I.win(b.D, b.C, 0.45, 9, 0.16, 13, false); I.win(b.D, b.C, 0.18, 24, 0.16, 10, false); I.win(b.D, b.C, 0.45, 24, 0.16, 10, true); I.door(b.D, b.C, 0.7, 0.18, 22, '#6b3a22'); I.win(b.C, b.B, 0.3, 9, 0.3, 13, true); I.roof(gx - 0.2, gy - 0.2, 1.4, 1.4, 45, 26, accent(kind)); detail(I, b, gx, gy, 45, kind, now); },
    /* 3 city: a brick townhouse, two storeys, a parapet and an awning */
    function (I, gx, gy, k, now, kind) { const b = I.box(gx - 0.2, gy - 0.2, 1.4, 1.4, 72, '#b8553f', 0, { tex: 'brick' }); [0.1, 0.4].forEach(u => { I.win(b.D, b.C, u, 12, 0.18, 16, true); I.win(b.D, b.C, u, 44, 0.18, 16, u > 0.2); }); I.win(b.D, b.C, 0.7, 44, 0.18, 16, true); I.door(b.D, b.C, 0.7, 0.2, 24, '#172033'); [0.2, 0.6].forEach(u => { I.win(b.C, b.B, u, 12, 0.25, 16, u < 0.5); I.win(b.C, b.B, u, 44, 0.25, 16, true); }); I.poly([I.p(gx + 0.75, gy + 1.2, 28), I.p(gx + 1.15, gy + 1.2, 28), I.p(gx + 1.15, gy + 1.42, 23), I.p(gx + 0.75, gy + 1.42, 23)], accent(kind)); I.flatRoof(gx - 0.2, gy - 0.2, 1.4, 1.4, 72, '#4b5563'); I.box(gx - 0.23, gy - 0.23, 1.46, 0.07, 6, '#e9e2d0', 74, { noShadow: true }); detail(I, b, gx, gy, 74, kind, now); },
    /* 4 metropolis: steel and glass, three storeys, a rooftop unit */
    function (I, gx, gy, k, now, kind) { const b = I.box(gx - 0.2, gy - 0.2, 1.4, 1.4, 108, '#3b6fb5', 0, { tex: 'glass', top: 0.1 }); [0.2, 0.5, 0.8].forEach(u => I.line(I.P(b.D, b.C, u), I.up(I.P(b.D, b.C, u), 108), '#dfe5ee', 1)); [36, 72].forEach(v => I.line(I.up(b.D, v), I.up(b.C, v), '#dfe5ee', 1.2)); I.door(b.D, b.C, 0.68, 0.22, 24, '#172033'); I.poly([I.up(b.D, 108), I.up(b.C, 108), I.up(b.C, 113), I.up(b.D, 113)], accent(kind)); I.flatRoof(gx - 0.2, gy - 0.2, 1.4, 1.4, 113, '#9aa3b0'); I.box(gx + 0.7, gy + 0.6, 0.3, 0.3, 10, '#dfe5ee', 117, { noShadow: true }); detail(I, b, gx, gy, 117, kind, now); },
    /* 5 capital: white stone, a colonnade, a roof garden */
    function (I, gx, gy, k, now, kind) { I.box(gx - 0.3, gy - 0.3, 1.6, 1.6, 6, '#e9e2d0', 0, { tex: 'stone', top: 0.1 }); const b = I.box(gx - 0.2, gy - 0.2, 1.4, 1.4, 92, '#f4f1e8', 6, { tex: 'stone', noShadow: true }); [0.1, 0.35, 0.6].forEach(u => { I.win(b.D, b.C, u, 14, 0.13, 20, (Math.floor(u * 10)) % 2 === 0); I.win(b.D, b.C, u, 50, 0.13, 20, true); }); I.door(b.D, b.C, 0.78, 0.15, 28, accent(kind)); [0.04, 0.3, 0.56, 0.82].forEach(u => I.box(gx - 0.2 + u * 1.34, gy + 1.22, 0.06, 0.06, 40, '#f4f1e8', 6, { noShadow: true })); I.flatRoof(gx - 0.2, gy - 0.2, 1.4, 1.4, 98, '#e9e2d0'); I.blob(I.p(gx + 0.3, gy + 0.3, 104)[0], I.p(gx + 0.3, gy + 0.3, 104)[1], 8, '#5cc464', 0.7); I.blob(I.p(gx + 0.8, gy + 0.6, 104)[0], I.p(gx + 0.8, gy + 0.6, 104)[1], 7, '#3fa66b', 0.7); detail(I, b, gx, gy, 100, kind, now); },
    /* 6 kingdom: the future. a rounded shell, a light band, a lit spire */
    function (I, gx, gy, k, now, kind) { const c = I.p(gx + 0.5, gy + 0.5); I.ctx.fillStyle = 'rgba(20,40,30,.25)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] + 3, c[1] + 2, 18, 8, 0, 0, Math.PI * 2); I.ctx.fill(); const g = I.ctx.createLinearGradient(c[0] - 16, c[1], c[0] + 16, c[1]); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#e6e9ef'); g.addColorStop(1, '#9aa3b0'); I.ctx.fillStyle = g; I.ctx.beginPath(); I.ctx.moveTo(c[0] - 26, c[1] + 2); I.ctx.quadraticCurveTo(c[0] - 30, c[1] - 100, c[0], c[1] - 118); I.ctx.quadraticCurveTo(c[0] + 30, c[1] - 100, c[0] + 26, c[1] + 2); I.ctx.closePath(); I.ctx.fill(); const a = accent(kind); I.ctx.strokeStyle = a; I.ctx.lineWidth = 3; [36, 72].forEach(h => { I.ctx.beginPath(); I.ctx.moveTo(c[0] - 27 + h * 0.08, c[1] - h); I.ctx.quadraticCurveTo(c[0], c[1] - h + 8, c[0] + 27 - h * 0.08, c[1] - h); I.ctx.stroke(); }); I.ctx.fillStyle = 'rgba(79,240,255,.55)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] - 7, c[1] - 60, 8, 14, 0, 0, Math.PI * 2); I.ctx.fill(); I.ctx.beginPath(); I.ctx.ellipse(c[0] + 9, c[1] - 90, 5, 9, 0, 0, Math.PI * 2); I.ctx.fill(); I.ctx.fillStyle = '#172033'; I.ctx.beginPath(); I.ctx.ellipse(c[0] + 8, c[1] - 12, 5, 12, 0, 0, Math.PI * 2); I.ctx.fill(); I.line([c[0], c[1] - 118], [c[0], c[1] - 136], '#e6e9ef', 2); I.blob(c[0], c[1] - 138, 3, a); I.lights.push({ x: c[0], y: c[1] - 50, r: 44, c: '120,220,255', k: 0.6 }); const q = I.p(gx + 0.5, gy + 1.3); I.ctx.fillStyle = 'rgba(79,240,255,.5)'; I.ctx.fillRect(q[0] - 16, q[1] - 1.5, 32, 1.5); }
  ];
  /* what a building goes up as: the very building it will be, revealed from
   * the ground up one slice per step, with scaffolding to the height reached */
  const TOP = [30, 52, 74, 82, 120, 106, 140];   /* how tall each era's home is, for the reveal */
  function drawStage(I, gx, gy, done, total, kind, era, k, now, custom) {
    const draw = custom || ((I2, x, y) => ERA_HOME[era](I2, x, y, 1, now, kind)); const n = Math.max(1, total | 0), frac = Math.min(done, n) / n, rise = frac * (custom ? 90 : TOP[era]) * (0.75 + 0.25 * k);
    I.ctx.setLineDash([4, 4]); I.poly([I.p(gx - 0.35, gy - 0.35), I.p(gx + 1.35, gy - 0.35), I.p(gx + 1.35, gy + 1.35), I.p(gx - 0.35, gy + 1.35)], 'rgba(255,255,255,.1)', 'rgba(255,255,255,.8)', 1.2); I.ctx.setLineDash([]);
    [[-0.35, -0.35], [1.35, -0.35], [-0.35, 1.35], [1.35, 1.35]].forEach(o => { const q = I.p(gx + o[0], gy + o[1]); I.ctx.fillStyle = '#f4f1e8'; I.ctx.fillRect(q[0] - 1, q[1] - 9, 2, 9); I.ctx.fillStyle = '#ffc531'; I.ctx.fillRect(q[0] - 3, q[1] - 11, 6, 3); });
    if (done >= n) { draw(I, gx, gy); return 'Finished'; }
    if (done > 0) {
      /* the slab, then the building itself up to the height the steps have reached */
      I.box(gx - 0.2, gy - 0.2, 1.4, 1.4, 4, era >= 2 ? '#c9c2b0' : '#8a6a3f', 0, { top: 0.1 });
      const base = I.p(gx + 0.5, gy + 1.5); I.ctx.save(); I.ctx.beginPath(); I.ctx.rect(base[0] - (custom ? 200 : 60), base[1] - 4 - rise, custom ? 400 : 120, rise + 8); I.ctx.clip(); draw(I, gx, gy); I.ctx.restore();
      /* scaffolding at the corners, a cut line where the work stops */
      [[-0.2, -0.2], [1.2, -0.2], [-0.2, 1.2], [1.2, 1.2]].forEach(o => { const q = I.p(gx + o[0], gy + o[1], 4); I.line(q, [q[0], q[1] - rise - 6], '#b58a5a', 1.5); });
      const a = I.p(gx - 0.22, gy + 1.22, rise + 4), b = I.p(gx + 1.22, gy + 1.22, rise + 4), c = I.p(gx + 1.22, gy - 0.22, rise + 4); I.line(a, b, '#b58a5a', 1.5); I.line(b, c, '#b58a5a', 1.5); I.ctx.setLineDash([2, 2]); I.line(a, b, 'rgba(255,255,255,.7)', 1); I.line(b, c, 'rgba(255,255,255,.7)', 1); I.ctx.setLineDash([]);
      I.puff(gx, gy, k);
    }
    return done === 0 ? 'Pegged out' : 'Step ' + done + ' of ' + n + ' up';
  }
  /* the hospital, at hospital size: three wide, two deep, three storeys, the cross on the roof */
  B.CIV.hospital = function (I, gx, gy, now) { I.box(gx - 0.2, gy - 0.2, 3.4, 2.4, 4, '#cfd5df', 0, { top: 0.1 }); const H = 108, b = I.box(gx, gy, 3, 2, H, '#f4f6f8', 4, { tex: 'siding' }); for (let r = 0; r < 3; r++) for (let u = 0.06; u < 0.95; u += 0.12) { if (r === 0 && u > 0.38 && u < 0.6) continue; I.win(b.D, b.C, u, 12 + r * 34, 0.07, 18, ((r + Math.floor(u * 10)) % 3) !== 0); } for (let r = 0; r < 3; r++) [0.15, 0.45, 0.75].forEach(u => I.win(b.C, b.B, u, 12 + r * 34, 0.16, 18, r !== 1)); const a = I.P(b.D, b.C, 0.4), c = I.P(b.D, b.C, 0.6); I.poly([a, c, I.up(c, 20), I.up(a, 20)], '#9ad3ff'); I.poly([I.p(gx + 0.9, gy + 2.05, 24), I.p(gx + 2.1, gy + 2.05, 24), I.p(gx + 2.1, gy + 2.5, 20), I.p(gx + 0.9, gy + 2.5, 20)], '#e8352f'); I.flatRoof(gx, gy, 3, 2, H + 4, '#dfe5ee'); const s = I.p(gx + 1.5, gy + 1, H + 12); I.roundRect(s[0] - 9, s[1] - 9, 18, 18, 3, '#ffffff'); I.ctx.fillStyle = '#e8352f'; I.ctx.fillRect(s[0] - 2.5, s[1] - 7, 5, 14); I.ctx.fillRect(s[0] - 7, s[1] - 2.5, 14, 5); I.box(gx + 2.5, gy + 0.3, 0.3, 0.3, 10, '#dfe5ee', H + 4, { noShadow: true }); I.label(gx + 1.5, gy + 2.9, 'Hospital', '', 9); };
  B.CIV.library = function (I, gx, gy, now) { B.library(I, gx, gy, 1, now, 3); B.library(I, gx + 1, gy, 1, now, 3); I.label(gx + 1, gy + 1.7, 'Library', '', 8); };
  B.CIV.datacentre = function (I, gx, gy, now) { B.datacentre(I, gx, gy, 1, now, 3); I.label(gx + 0.6, gy + 1.7, 'Data Centre', 'what keeps the city running', 8); };
  NW.Homes = { ERA_HOME, drawStage, KIND };
})();
