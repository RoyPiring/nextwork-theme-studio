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
    function (I, gx, gy, k, now, kind) { const lift = STY.stilts ? 10 : 0; stiltsOf(I, gx - 0.15, gy - 0.15, 1.3, 1.3, lift); const w1 = wallOf(STY.wall1); const b = I.box(gx - 0.15, gy - 0.15, 1.3, 1.3, 29, w1, lift, { tex: STY.tex1 }); I.line(b.D, b.C, NW.shade(w1, -0.35), 2); I.win(b.D, b.C, 0.12, 9, 0.2, 13, true); I.win(b.D, b.C, 0.4, 9, 0.2, 13, false); I.door(b.D, b.C, 0.68, 0.2, 22, '#4a2b17'); I.win(b.C, b.B, 0.3, 9, 0.28, 13, true); roofOf(I, gx - 0.15, gy - 0.15, 1.3, 1.3, 29 + lift, 21, roofOf2(STY.roof1), w1); I.ctx.fillStyle = bandOf(); const q = I.p(gx + 0.5, gy + 1.25); I.ctx.fillRect(q[0] - 8, q[1] - 3, 16, 2.5); detail(I, b, gx, gy, 29, kind, now); },
    /* 2 town: timber-frame on a stone base, tiled roof, a storey and a half */
    function (I, gx, gy, k, now, kind) { const lift = STY.stilts ? 10 : 0; stiltsOf(I, gx - 0.2, gy - 0.2, 1.4, 1.4, lift); I.box(gx - 0.2, gy - 0.2, 1.4, 1.4, 9, STY.stilts ? STY.wall2 : '#b3ada3', lift, { tex: STY.stilts ? 'siding' : 'stone' }); const w2 = wallOf(STY.wall2); const b = I.box(gx - 0.2, gy - 0.2, 1.4, 1.4, 36, w2, 9 + lift, { noShadow: true }); if (STY.timber) { [0.12, 0.38, 0.62, 0.88].forEach(u => I.line(I.P(b.D, b.C, u), I.up(I.P(b.D, b.C, u), 36), STY.timber, 1.5)); I.line(I.up(b.D, 18), I.up(b.C, 18), STY.timber, 1.5); I.line(I.up(b.D, 36), I.up(b.C, 36), STY.timber, 2); } I.win(b.D, b.C, 0.18, 9, 0.16, 13, true); I.win(b.D, b.C, 0.45, 9, 0.16, 13, false); I.win(b.D, b.C, 0.18, 24, 0.16, 10, false); I.win(b.D, b.C, 0.45, 24, 0.16, 10, true); I.door(b.D, b.C, 0.7, 0.18, 22, '#6b3a22'); I.win(b.C, b.B, 0.3, 9, 0.3, 13, true); roofOf(I, gx - 0.2, gy - 0.2, 1.4, 1.4, 45 + lift, 26, roofOf2(STY.roof2), w2); detail(I, b, gx, gy, 45 + lift, kind, now); },
    /* 3 city: a brick townhouse, two storeys, a parapet and an awning */
    function (I, gx, gy, k, now, kind) { /* the city: a glass mid-rise, four floors, the terrain in the tint */ const g = wallOf(STY.glass), H = 84; const b = I.box(gx - 0.2, gy - 0.2, 1.4, 1.4, H, g, 0, { tex: 'glass', top: 0.08 }); [0.25, 0.5, 0.75].forEach(u => I.line(I.P(b.D, b.C, u), I.up(I.P(b.D, b.C, u), H), 'rgba(255,255,255,.35)', 1)); [21, 42, 63].forEach(v => { I.line(I.up(b.D, v), I.up(b.C, v), 'rgba(255,255,255,.5)', 1.2); I.line(I.up(b.C, v), I.up(b.B, v), 'rgba(255,255,255,.3)', 1.2); }); [0.08, 0.36].forEach(u => { I.win(b.D, b.C, u, 26, 0.16, 12, u < 0.2); I.win(b.D, b.C, u, 68, 0.16, 12, u > 0.2); }); I.win(b.C, b.B, 0.3, 47, 0.3, 12, true); I.door(b.D, b.C, 0.62, 0.3, 22, '#172033'); I.poly([I.up(b.D, H), I.up(b.C, H), I.up(b.C, H + 4), I.up(b.D, H + 4)], bandOf()); I.flatRoof(gx - 0.2, gy - 0.2, 1.4, 1.4, H + 4, '#9aa3b0'); I.box(gx + 0.7, gy + 0.6, 0.3, 0.3, 8, '#dfe5ee', H + 8, { noShadow: true }); detail(I, b, gx, gy, H + 8, kind, now); },
    /* 4 metropolis: steel and glass, three storeys, a rooftop unit */
    function (I, gx, gy, k, now, kind) { const b = I.box(gx - 0.2, gy - 0.2, 1.4, 1.4, 108, wallOf(['#3b6fb5', '#2f8f8f', '#5a7fc9', '#3f7fb0'][N % 4]), 0, { tex: 'glass', top: 0.1 }); [0.2, 0.5, 0.8].forEach(u => I.line(I.P(b.D, b.C, u), I.up(I.P(b.D, b.C, u), 108), '#dfe5ee', 1)); [36, 72].forEach(v => I.line(I.up(b.D, v), I.up(b.C, v), '#dfe5ee', 1.2)); I.door(b.D, b.C, 0.68, 0.22, 24, '#172033'); I.poly([I.up(b.D, 108), I.up(b.C, 108), I.up(b.C, 113), I.up(b.D, 113)], bandOf()); I.flatRoof(gx - 0.2, gy - 0.2, 1.4, 1.4, 113, '#9aa3b0'); I.box(gx + 0.7, gy + 0.6, 0.3, 0.3, 10, '#dfe5ee', 117, { noShadow: true }); detail(I, b, gx, gy, 117, kind, now); },
    /* 5 capital: white stone, a colonnade, a roof garden */
    function (I, gx, gy, k, now, kind) { /* the capital: a glass tower with a crown and a spire */ const g = wallOf(STY.glass), H = 130; I.box(gx - 0.3, gy - 0.3, 1.6, 1.6, 5, '#dfe5ee', 0, { top: 0.1 }); const b = I.box(gx - 0.2, gy - 0.2, 1.4, 1.4, H, g, 5, { tex: 'glass', top: 0.08, noShadow: true }); for (let v = 18; v < H; v += 18) { I.line(I.up(b.D, v), I.up(b.C, v), 'rgba(255,255,255,.45)', 1); I.line(I.up(b.C, v), I.up(b.B, v), 'rgba(255,255,255,.25)', 1); } [0.33, 0.66].forEach(u => I.line(I.P(b.D, b.C, u), I.up(I.P(b.D, b.C, u), H), 'rgba(255,255,255,.3)', 1)); [0.1, 0.4, 0.7].forEach(u => { I.win(b.D, b.C, u, 40, 0.16, 12, u > 0.2); I.win(b.D, b.C, u, 94, 0.16, 12, u < 0.5); }); I.door(b.D, b.C, 0.62, 0.3, 24, '#172033'); const t = I.box(gx + 0.1, gy + 0.1, 0.8, 0.8, 22, g, H + 5, { noShadow: true, tex: 'glass' }); I.poly([I.up(t.D, 22), I.up(t.C, 22), I.up(t.C, 26), I.up(t.D, 26)], bandOf()); I.flatRoof(gx + 0.1, gy + 0.1, 0.8, 0.8, H + 27, '#c9d2dc'); const sp = I.p(gx + 0.5, gy + 0.5, H + 32); I.line(sp, [sp[0], sp[1] - 26], '#e6e9ef', 2); I.blob(sp[0], sp[1] - 28, 2.5, accent(kind)); I.lights.push({ x: sp[0], y: sp[1] - 28, r: 16, c: '255,80,80', k: 0.5 }); detail(I, b, gx, gy, H + 5, kind, now); },
    /* 6 kingdom: the future. a rounded shell, a light band, a lit spire */
    function (I, gx, gy, k, now, kind) { const c = I.p(gx + 0.5, gy + 0.5); I.ctx.fillStyle = 'rgba(20,40,30,.25)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] + 3, c[1] + 2, 18, 8, 0, 0, Math.PI * 2); I.ctx.fill(); const g = I.ctx.createLinearGradient(c[0] - 16, c[1], c[0] + 16, c[1]); g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#e6e9ef'); g.addColorStop(1, '#9aa3b0'); I.ctx.fillStyle = g; I.ctx.beginPath(); I.ctx.moveTo(c[0] - 26, c[1] + 2); I.ctx.quadraticCurveTo(c[0] - 30, c[1] - 100, c[0], c[1] - 118); I.ctx.quadraticCurveTo(c[0] + 30, c[1] - 100, c[0] + 26, c[1] + 2); I.ctx.closePath(); I.ctx.fill(); const a = accent(kind); I.ctx.strokeStyle = a; I.ctx.lineWidth = 3; [36, 72].forEach(h => { I.ctx.beginPath(); I.ctx.moveTo(c[0] - 27 + h * 0.08, c[1] - h); I.ctx.quadraticCurveTo(c[0], c[1] - h + 8, c[0] + 27 - h * 0.08, c[1] - h); I.ctx.stroke(); }); I.ctx.fillStyle = 'rgba(79,240,255,.55)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] - 7, c[1] - 60, 8, 14, 0, 0, Math.PI * 2); I.ctx.fill(); I.ctx.beginPath(); I.ctx.ellipse(c[0] + 9, c[1] - 90, 5, 9, 0, 0, Math.PI * 2); I.ctx.fill(); I.ctx.fillStyle = '#172033'; I.ctx.beginPath(); I.ctx.ellipse(c[0] + 8, c[1] - 12, 5, 12, 0, 0, Math.PI * 2); I.ctx.fill(); I.line([c[0], c[1] - 118], [c[0], c[1] - 136], '#e6e9ef', 2); I.blob(c[0], c[1] - 138, 3, a); I.lights.push({ x: c[0], y: c[1] - 50, r: 44, c: '120,220,255', k: 0.6 }); const q = I.p(gx + 0.5, gy + 1.3); I.ctx.fillStyle = 'rgba(79,240,255,.5)'; I.ctx.fillRect(q[0] - 16, q[1] - 1.5, 32, 1.5); }
  ];
  /* what a building goes up as: the very building it will be, revealed from
   * the ground up one slice per step, with scaffolding to the height reached */
  /* the terrain's building style: what the walls are made of, how the roof is pitched */
  const STYLES = {
    plains: { wall1: '#a8763f', tex1: 'siding', roof1: '#6b4a2b', wall2: '#f3e6cc', timber: '#5a3a1e', roof2: null, glass: '#5aa0d8', roof: 'gable' },
    forest: { wall1: '#8a5a2e', tex1: 'siding', roof1: '#2f5d3a', wall2: '#c9a06a', timber: '#4a2b17', roof2: '#3f6a4a', glass: '#5f8f7a', roof: 'steep' },
    sandy: { wall1: '#d9b38c', tex1: 'stone', roof1: '#b5643a', wall2: '#e6c9a0', timber: null, roof2: '#b5643a', glass: '#c9a26a', roof: 'flat' },
    island: { wall1: '#e8d9b5', tex1: 'siding', roof1: '#b89a5a', wall2: '#f2e6c8', timber: null, roof2: '#b89a5a', glass: '#5fb0c8', roof: 'thatch', stilts: true },
    mountains: { wall1: '#a9a49a', tex1: 'stone', roof1: '#4b4b4b', wall2: '#d9d2c4', timber: '#5a3a1e', roof2: '#4b4b4b', glass: '#7a93a8', roof: 'steep' },
    snow: { wall1: '#c9a06a', tex1: 'siding', roof1: '#f4f7fa', wall2: '#e8dcc6', timber: '#6b4a2b', roof2: '#f4f7fa', glass: '#8fb6d9', roof: 'steep' },
    rain: { wall1: '#9aa0a3', tex1: 'stone', roof1: '#4f5b66', wall2: '#d8d6cf', timber: null, roof2: '#4f5b66', glass: '#6e8aa0', roof: 'gable' },
    zen: { wall1: '#f4efe4', tex1: 'siding', roof1: '#3d3d3d', wall2: '#f4efe4', timber: '#3d3d3d', roof2: '#3d3d3d', glass: '#8fb3a8', roof: 'pagoda' },
    savanna: { wall1: '#c8925a', tex1: 'stone', roof1: '#b89a5a', wall2: '#dcb27a', timber: null, roof2: '#b89a5a', glass: '#b08a4a', roof: 'thatch' }
  };
  /* a palette that goes together: roofs, bands and doors take turns through it, so a street is varied and never garish */
  const PALETTE = ['#c9503c', '#3f8f6b', '#3b6fb5', '#d9a23a', '#8f5fd1', '#e8845a', '#4fa3c9', '#7a8f3a'];
  const TINT = [0, 0.14, -0.1, 0.26, -0.18, 0.08];
  let STY = STYLES.plains, N = 0;   /* N: which home on the street this is */
  const wallOf = base => NW.shade(base, TINT[N % TINT.length]);
  const roofOf2 = base => base ? NW.shade(base, TINT[(N + 2) % TINT.length] * 0.5) : PALETTE[N % PALETTE.length];
  const bandOf = () => PALETTE[(N * 3 + 1) % PALETTE.length];
  const setTerrain = key => { STY = STYLES[key] || STYLES.plains; };
  /* the roof the terrain builds: flat in the desert, steep where it snows, thatch on the island, tiered in the garden */
  function roofOf(I, gx, gy, w, d, base, h, colour, wall) {
    if (STY.roof === 'flat') { I.flatRoof(gx, gy, w, d, base, NW.shade(colour, 0.1)); I.box(gx - 0.03, gy - 0.03, w + 0.06, 0.06, 5, wall, base + 4, { noShadow: true }); I.box(gx + w - 0.03, gy - 0.03, 0.06, d + 0.06, 5, wall, base + 4, { noShadow: true }); return; }
    if (STY.roof === 'steep') { I.roof(gx, gy, w, d, base, h * 1.6, colour); return; }
    if (STY.roof === 'thatch') { I.roof(gx, gy, w, d, base, h * 1.15, colour, 0.24); return; }
    if (STY.roof === 'pagoda') { I.roof(gx, gy, w, d, base, h * 0.6, colour, 0.34); I.box(gx + w * 0.22, gy + d * 0.22, w * 0.56, d * 0.56, 12, wall, base + h * 0.6, { noShadow: true }); I.roof(gx + w * 0.22, gy + d * 0.22, w * 0.56, d * 0.56, base + h * 0.6 + 12, h * 0.55, colour, 0.28); return; }
    I.roof(gx, gy, w, d, base, h, colour);
  }
  const stiltsOf = (I, gx, gy, w, d, lift) => { if (!lift) return; [[0, 0], [w, 0], [0, d], [w, d], [w / 2, d], [w, d / 2]].forEach(o => { const q = I.p(gx + o[0], gy + o[1]); I.ctx.fillStyle = '#6b4a2b'; I.ctx.fillRect(q[0] - 1.5, q[1] - lift, 3, lift); }); };
  const TOP = [30, 52, 96, 82, 120, 165, 140];   /* how tall each era's home is, for the reveal */
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
  B.CIV.library = function (I, gx, gy, now) { if (!B.modern) { B.library(I, gx, gy, 1, now, 3); I.label(gx + 0.5, gy + 1.7, 'Library', '', 8); return; } I.box(gx - 0.15, gy - 0.15, 2.1, 1.7, 4, '#d6d1c4', 0, { top: 0.1, tex: 'stone' }); const H = 62, b = I.box(gx, gy, 1.8, 1.4, H, '#6fa8d8', 4, { tex: 'glass' }); [20, 40].forEach(v => { I.line(I.up(b.D, v), I.up(b.C, v), 'rgba(255,255,255,.5)', 1.2); I.line(I.up(b.C, v), I.up(b.B, v), 'rgba(255,255,255,.3)', 1.2); }); for (let u = 0.06; u < 0.95; u += 0.1) I.win(b.D, b.C, u, 46, 0.06, 12, (Math.floor(u * 100) % 3) !== 0); const a = I.P(b.D, b.C, 0.4), c = I.P(b.D, b.C, 0.6); I.poly([a, c, I.up(c, 30), I.up(a, 30)], '#efe9dc'); I.flatRoof(gx, gy, 1.8, 1.4, H + 4, '#dfe5ee'); I.tree(gx + 1.95, gy + 1.1, 0.8); I.label(gx + 0.9, gy + 2.2, 'Library', '', 8); };
  B.CIV.hospital = function (I, gx, gy, now) { I.box(gx - 0.2, gy - 0.2, 3.4, 2.4, 4, '#cfd5df', 0, { top: 0.1 }); const H = 108, b = I.box(gx, gy, 3, 2, H, '#dfe9f2', 4, { tex: 'glass' }); [36, 72].forEach(v => I.line(I.up(b.D, v), I.up(b.C, v), 'rgba(255,255,255,.6)', 1.5)); for (let r = 0; r < 3; r++) for (let u = 0.06; u < 0.95; u += 0.12) { if (r === 0 && u > 0.38 && u < 0.6) continue; I.win(b.D, b.C, u, 12 + r * 34, 0.07, 18, ((r + Math.floor(u * 10)) % 3) !== 0); } for (let r = 0; r < 3; r++) [0.15, 0.45, 0.75].forEach(u => I.win(b.C, b.B, u, 12 + r * 34, 0.16, 18, r !== 1)); const a = I.P(b.D, b.C, 0.4), c = I.P(b.D, b.C, 0.6); I.poly([a, c, I.up(c, 20), I.up(a, 20)], '#9ad3ff'); I.poly([I.p(gx + 0.9, gy + 2.05, 24), I.p(gx + 2.1, gy + 2.05, 24), I.p(gx + 2.1, gy + 2.5, 20), I.p(gx + 0.9, gy + 2.5, 20)], '#e8352f'); I.flatRoof(gx, gy, 3, 2, H + 4, '#dfe5ee'); const s = I.p(gx + 1.5, gy + 1, H + 12); I.roundRect(s[0] - 9, s[1] - 9, 18, 18, 3, '#ffffff'); I.ctx.fillStyle = '#e8352f'; I.ctx.fillRect(s[0] - 2.5, s[1] - 7, 5, 14); I.ctx.fillRect(s[0] - 7, s[1] - 2.5, 14, 5); I.box(gx + 2.5, gy + 0.3, 0.3, 0.3, 10, '#dfe5ee', H + 4, { noShadow: true }); I.label(gx + 1.5, gy + 2.9, 'Hospital', '', 9); };
  B.CIV.library = function (I, gx, gy, now) { B.library(I, gx, gy, 1, now, 3); B.library(I, gx + 1, gy, 1, now, 3); I.label(gx + 1, gy + 1.7, 'Library', '', 8); };
  B.CIV.datacentre = function (I, gx, gy, now) { B.datacentre(I, gx, gy, 1, now, 3); I.label(gx + 0.6, gy + 1.7, 'Data Centre', 'what keeps the city running', 8); };
  const setN = n => { N = n | 0; };
  NW.Homes = { setTerrain, setN, STYLES, PALETTE, ERA_HOME, drawStage, KIND };
})();
