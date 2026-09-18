/* NextWorld · land: your world, drawn
 * Hill Country. Grass that dries on the high ground, a creek, worn paths
 * that appear where you have walked, and one figure on it: you. */
'use strict';
(function () {
  const { B, clamp, lerp, ease, rgb, reduce, TIERS, tierOf, KIND_NAME } = NW;
  const S = NW.State, { LAND, HOME } = S;

  /* the ground, in whichever land you chose: two grass tones by height, stone on the high ground */
  let biome = NW.Eras.BIOMES.hill;
  const groundColour = (gx, gy) => { const h = S.height(gx, gy); if (h > 0.68) return (gx + gy) % 2 ? biome.stone : NW.shade(biome.stone, -0.06); const dry = clamp((h - 0.25) * 2.2, 0, 1); const a = NW.hex(biome.grass[0]), b = NW.hex(biome.grass[1]); return rgb(a.map((v, i) => Math.round(lerp(v, b[i], dry)))); };
  const treeOf = (I, gx, gy, size) => { const t = biome.tree; if (t === 'cactus') B.cactus(I, gx, gy, size); else if (t === 'pine') B.pine(I, gx, gy, size); else if (t === 'palm') B.palm(I, gx, gy, size); else B.oak(I, gx, gy, size); };

  /* you: always on a road. Tap somewhere and you take the roads there;
   * hold an arrow key and you walk, but only where there is road. */
  const onRoad = (roads, gx, gy) => roads.has(Math.floor(gx) + ',' + Math.floor(gy));
  function makeMe(state) { const m = state.me && typeof state.me.gx === 'number' ? state.me : { gx: HOME[0] + 1.5, gy: HOME[1] + 2.5 }; return { gx: m.gx, gy: m.gy, route: null, target: null, moving: false, keys: {}, follow: true }; }
  function goTo(me, roads, q) {
    const start = S.nearestRoad(roads, [me.gx, me.gy]), end = S.nearestRoad(roads, q); if (!start || !end) return false;
    const r = S.route(roads, start, end); if (!r) return false;
    me.route = r.map(t => [t[0] + 0.5, t[1] + 0.5]); if (me.route.length > 1 && Math.hypot(me.route[0][0] - me.gx, me.route[0][1] - me.gy) < 0.2) me.route.shift(); me.target = me.route[me.route.length - 1]; return true;
  }
  function stepMe(me, roads) {
    const k = me.keys; const dx = (k.ArrowRight || k.d ? 1 : 0) - (k.ArrowLeft || k.a ? 1 : 0), dy = (k.ArrowDown || k.s ? 1 : 0) - (k.ArrowUp || k.w ? 1 : 0);
    if (dx || dy) { me.route = null; me.target = null; const gx = (dx + dy) * 0.5, gy = (dy - dx) * 0.5, n = Math.hypot(gx, gy) || 1; const nx = me.gx + gx / n * 0.06, ny = me.gy + gy / n * 0.06; if (onRoad(roads, nx, ny)) { me.gx = nx; me.gy = ny; me.moving = true; } else if (onRoad(roads, nx, me.gy)) { me.gx = nx; me.moving = true; } else if (onRoad(roads, me.gx, ny)) { me.gy = ny; me.moving = true; } else me.moving = false; me.follow = true; return; }
    if (!me.route || !me.route.length) { me.moving = false; me.route = null; me.target = null; return; }
    const w = me.route[0], tx = w[0] - me.gx, ty = w[1] - me.gy, d = Math.hypot(tx, ty);
    if (d < 0.06 || reduce) { me.gx = w[0]; me.gy = w[1]; me.route.shift(); me.moving = me.route.length > 0; if (!me.route.length) { me.route = null; me.target = null; } return; }
    const step = Math.min(d, 0.07); me.gx += tx / d * step; me.gy += ty / d * step; me.moving = true;
  }

  /* the build site: four stages tied to how many steps are ticked, trim after */
  function siteFor(state) { const nx = S.nextProject(state); if (!nx) return null; const q = state.sites[nx.title] || S.layout(state).next; if (!q) return null; return { title: nx.title, series: nx.series, xp: nx.xp, gx: q[0], gy: q[1], kind: nx.series.kind }; }
  function drawSite(I, site, done, total, k, now) {
    const { gx, gy } = site; const stage = total > 0 ? Math.min(4, Math.floor(done / total * 4 + 1e-9)) : 0; const z = (1 - k) * -60;
    I.ctx.setLineDash([4, 4]); I.poly([I.p(gx - 0.2, gy - 0.2), I.p(gx + 1.2, gy - 0.2), I.p(gx + 1.2, gy + 1.2), I.p(gx - 0.2, gy + 1.2)], 'rgba(255,255,255,.1)', 'rgba(255,255,255,.8)', 1.2); I.ctx.setLineDash([]);
    [[-0.2, -0.2], [1.2, -0.2], [-0.2, 1.2], [1.2, 1.2]].forEach(o => { const q = I.p(gx + o[0], gy + o[1]); I.ctx.fillStyle = '#8b5a2b'; I.ctx.fillRect(q[0] - 1, q[1] - 9, 2, 9); I.ctx.fillStyle = '#e8552f'; I.ctx.fillRect(q[0] - 3, q[1] - 11, 6, 3); });
    if (stage >= 1) I.box(gx + 0.05, gy + 0.05, 0.9, 0.9, 5, '#c9c2b0', stage === 1 ? -z : 0, { top: 0.1 });
    if (stage >= 2) [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]].forEach(o => I.box(gx + o[0] - 0.04, gy + o[1] - 0.04, 0.08, 0.08, 34, '#b58a5a', 5 + (stage === 2 ? -z : 0), { noShadow: true }));
    let b = null; if (stage >= 3) { b = I.box(gx + 0.1, gy + 0.1, 0.8, 0.8, 34, '#f3e6cc', 5 + (stage === 3 ? -z : 0), { noShadow: true, tex: 'siding' }); I.win(b.D, b.C, 0.12, 11, 0.24, 14, false); I.win(b.C, b.B, 0.2, 11, 0.28, 14, false); }
    if (stage >= 4) { const zz = stage === 4 && done < total ? -z : 0; I.roof(gx + 0.1, gy + 0.1, 0.8, 0.8, 39 + zz, 24, '#d9563f'); if (b) I.door(b.D, b.C, 0.6, 0.24, 22, '#8b4a2b'); }
    if (done >= total && total > 0) { I.chimney(gx + 0.62, gy + 0.22, 49); I.bush(gx - 0.05, gy + 0.95, true); }
    if (done > 0 && done < total) I.puff(gx, gy, k);
    return ['Pegged out', 'Foundation', 'Frame up', 'Walls up', done >= total ? 'Finished' : 'Roof on'][stage];
  }

  function drawLand(I, state, me, now, opts) {
    const ctx = I.ctx, L = S.layout(state), plan = L.plan, W = plan.water; opts = opts || {}; biome = NW.Eras.biomeOf(state);
    const road = (x, y) => L.paths.has(x + ',' + y), paved = (x, y) => plan.pavedSet.has(x + ',' + y) || (x >= S.EAST_TRUNK - 1 && road(x, y) && plan.pavedSet.size > 0);
    const inRect = (x, y, r) => x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3];
    const zone = (x, y) => { for (const z of plan.zones) if (inRect(x, y, z.rect)) return z.kind; return null; };
    const field = (x, y) => plan.landscape.fields.some(f => inRect(x, y, f));
    const prom = (x, y) => W.promenade && x >= W.promenade.x0 && x <= W.promenade.x1 && y >= W.promenade.y0 && y <= W.promenade.y1;
    const managed = (x, y) => { const c = plan.clearing; const dx = (x - c.cx) / c.rx, dy = (y - c.cy) / c.ry; return dx * dx + dy * dy < 1; };
    const rail = plan.civic.find(c => c.kind === 'rail');
    /* ---- the ground ---- */
    for (let gy = 0; gy < LAND; gy++) for (let gx = 0; gx < LAND; gx++) {
      if (!I.onScreen(gx, gy)) continue; const r = road(gx, gy);
      if (S.inWater(gx, gy, plan) && !r) { I.tile(gx, gy, (Math.floor(now / 600) + gx + gy) % 5 === 0 ? NW.shade(biome.water, 0.25) : biome.water); continue; }
      if (r) { if (S.inWater(gx, gy, plan)) I.tile(gx, gy, '#a88c5f', '#6b4a2b'); else if (paved(gx, gy)) I.tile(gx, gy, (gx + gy) % 2 ? '#e3dccb' : '#d8d0bc', 'rgba(0,0,0,.08)'); else I.tile(gx, gy, '#c8a877', 'rgba(110,75,30,.35)'); continue; }
      if (W.channelled && S.onBank(gx, gy, plan)) { I.tile(gx, gy, prom(gx, gy) ? '#e3dccb' : '#b8b4a8', 'rgba(0,0,0,.12)'); continue; }   /* embankment */
      if (S.onBank(gx, gy, plan)) { I.tile(gx, gy, biome.sand); continue; }
      const z = zone(gx, gy); if (z === 'plaza' || z === 'square') { I.tile(gx, gy, (gx + gy) % 2 ? '#e9e2d0' : '#dfd7c3', 'rgba(0,0,0,.05)'); continue; } if (z === 'park') { I.tile(gx, gy, (gx + gy) % 2 ? '#7fc55a' : '#86cc60'); continue; }
      if (field(gx, gy)) { I.tile(gx, gy, gy % 2 ? '#a8783f' : '#c8a06a', 'rgba(90,50,10,.35)'); continue; }
      I.tile(gx, gy, managed(gx, gy) ? groundColour(gx, gy) : NW.shade(groundColour(gx, gy), -0.08));
    }
    if (rail && !opts.map) { ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 1.2; for (let x = rail.from[0]; x <= rail.to[0]; x += 0.5) { const a = I.p(x, rail.from[1] + 0.15), b = I.p(x, rail.from[1] + 0.85); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } [0.3, 0.7].forEach(o => { const a = I.p(rail.from[0], rail.from[1] + o), b = I.p(rail.to[0] + 1, rail.to[1] + o); ctx.strokeStyle = '#9aa3b0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }); }
    const items = []; const add = (d, fn) => items.push({ d, fn });
    /* bridges: rails either side of the deck */
    if (!opts.map) L.paths.forEach(k => { const [x, y] = k.split(',').map(Number); if (!S.inWater(x, y, plan) || !I.onScreen(x, y)) return; add(x + y + 0.4, () => { const a = I.p(x, y), b = I.p(x + 1, y), c = I.p(x, y + 1), d = I.p(x + 1, y + 1); I.line(I.up(a, 6), I.up(b, 6), '#8a6a3f', 1.5); I.line(I.up(c, 6), I.up(d, 6), '#8a6a3f', 1.5); }); });
    /* the wild: trees where the plan leaves the land alone, thinner as the place grows */
    if (!opts.map) { const dens = plan.landscape.treeline === 'dense' ? 0.06 : plan.landscape.treeline === 'thin' ? 0.025 : 0; for (let gy = 0; gy < LAND; gy++) for (let gx = 0; gx < LAND; gx++) { const r = S.hash(gx * 3, gy * 5); const d = managed(gx, gy) ? 0.006 : dens; if (r > d || !I.onScreen(gx, gy) || S.inWater(gx, gy, plan) || S.onBank(gx, gy, plan) || road(gx, gy) || zone(gx, gy) || field(gx, gy) || (rail && gy === rail.from[1] && gx <= rail.to[0])) continue; if (L.buildings.some(b => Math.abs(b.gx - gx) < 1.6 && Math.abs(b.gy - gy) < 1.6) || (Math.abs(gx - HOME[0]) < 3 && Math.abs(gy - HOME[1]) < 3) || (L.next && Math.abs(L.next[0] - gx) < 2 && Math.abs(L.next[1] - gy) < 2)) continue; if (plan.civic.some(c => c.rect ? inRect(gx, gy, [c.rect[0] - 1, c.rect[1] - 1, c.rect[2] + 2, c.rect[3] + 2]) : c.at && Math.abs(c.at[0] - gx) < 4 && Math.abs(c.at[1] - gy) < 3)) continue; add(gx + gy + 0.5, r < 0.004 && managed(gx, gy) ? () => B.hay(I, gx, gy) : () => treeOf(I, gx, gy, 0.8 + S.hash(gy, gx) * 0.5)); } }
    /* lamps: the main street once there is one, every street in a metropolis */
    if (!opts.map && plan.landscape.lamps !== 'none') L.paths.forEach(k => { const [x, y] = k.split(',').map(Number); if (!paved(x, y) || !I.onScreen(x, y) || S.inWater(x, y, plan)) return; if (plan.landscape.lamps === 'main' && y !== 33) return; if ((x + y * 3) % 7 === 0) add(x + y + 0.35, () => I.lamp(x + 0.15, y + 0.15)); });
    /* the home: a tent at the campground, the cabin from the fort on, growing with the eras */
    const lvl = NW.Eras.level(state), era = NW.Eras.eraOf(state);
    if (I.onScreen(HOME[0], HOME[1])) {
      if (lvl === 0) { add(HOME[0] + HOME[1] + 1.5, () => { const t = I.p(HOME[0] + 1, HOME[1] + 1); I.poly([[t[0] - 16, t[1]], [t[0] + 16, t[1]], [t[0], t[1] - 26]], '#e9e4d6'); I.poly([[t[0], t[1]], [t[0] + 16, t[1]], [t[0], t[1] - 26]], '#cfc7aa'); I.poly([[t[0] - 4, t[1]], [t[0] + 4, t[1]], [t[0], t[1] - 12]], '#6b4a2b'); }); }
      else { const t = lvl >= 5 ? 5 : lvl >= 3 ? 4 : lvl >= 2 ? 3 : 2; add(HOME[0] + 1 + HOME[1] + 1.2, () => B.homestead(I, HOME[0] + 0.1, HOME[1] - 0.2, now, t)); }
      if (!opts.map && opts.land) add(9999, () => I.label(HOME[0] + 1, HOME[1] - 2.4, opts.land, era.name, 11));
    }
    /* what the plan brought: every civic piece on its ground */
    plan.civic.forEach(c => {
      if (c.kind === 'rail') return;
      if (c.kind === 'stockade') { if (!opts.map) add(c.rect[0] + c.rect[1] - 0.5, () => { const [x, y, w, h] = c.rect; I.fence(x, y, x + w, y, w * 2); I.fence(x, y, x, y + h, h * 2); I.fence(x + w, y, x + w, y + h, h * 2); I.fence(x, y + h, x + 16, y + h, 32); I.fence(x + 18 - 0.8, y + h, x + w, y + h, 2); }); return; }
      if (c.kind === 'paddock') { add(c.rect[0] + c.rect[1] - 0.5, () => B.paddock(I, c.rect[0], c.rect[1], c.rect[2], c.rect[3])); [[1, 1.2], [4, 2]].forEach((o, i) => { const q = [c.rect[0] + o[0] + Math.sin(now / 9000 + i) * 0.8, c.rect[1] + o[1] + Math.cos(now / 11000 + i) * 0.5]; add(q[0] + q[1] + 0.2, () => (i ? B.cow : B.horse)(I, q[0], q[1], i ? now / 1000 : '#8a5a3a', now / 1000)); }); return; }
      if (!c.at) return; const d = c.kind === 'board' ? (I2, x, y) => B.board(I2, x, y) : c.kind === 'windmill' ? (I2, x, y, n) => B.windmill(I2, x, y, n) : c.kind === 'tank' ? (I2, x, y) => B.tank(I2, x, y) : c.kind === 'barn' ? (I2, x, y, n) => B.barn(I2, x, y, 1, n, 2) : c.kind === 'coop' ? (I2, x, y, n) => B.coop(I2, x, y, n) : B.CIV[c.kind];
      if (!d || !(I.onScreen(c.at[0], c.at[1]) || I.onScreen(c.at[0] + 3, c.at[1] + 3))) return; const big = ['cityhall', 'capitol', 'palace', 'university', 'stadium'].includes(c.kind); add(c.at[0] + c.at[1] + (big ? 4 : 1.2), () => d(I, c.at[0], c.at[1], now)); });
    /* the next lot, pegged out; every free lot while you are choosing */
    if (!opts.map && L.next && !opts.site) add(L.next[0] + L.next[1] + 0.4, () => { const q = I.p(L.next[0] + 0.5, L.next[1] + 0.5); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.ellipse(q[0], q[1], 14, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); [[-0.3, -0.3], [1.3, -0.3], [-0.3, 1.3], [1.3, 1.3]].forEach(o => { const c = I.p(L.next[0] + o[0], L.next[1] + o[1]); ctx.fillStyle = '#8b5a2b'; ctx.fillRect(c[0] - 1, c[1] - 7, 2, 7); ctx.fillStyle = '#e8552f'; ctx.fillRect(c[0] - 2.5, c[1] - 9, 5, 2.5); }); });
    if (opts.placing) L.west.forEach(q => { if (!I.onScreen(q[0], q[1]) || !S.lotFree(state, q)) return; add(q[0] + q[1] + 0.3, () => { const c = I.p(q[0] + 0.5, q[1] + 0.5); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.ellipse(c[0], c[1], 13, 6.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); }); });
    /* the way out: the main road's west end, and the signpost that says where it goes */
    const exit = plan.roads[0].from; if (!opts.map) add(exit[0] + exit[1] + 0.6, () => B.sign(I, exit[0] - 1, exit[1] - 1, 'TO NEXTWORLD', 'NextWork HQ, Austin'));
    /* the buildings */
    L.buildings.forEach(b => { if (!I.onScreen(b.gx, b.gy)) return;
      if (b.tier === 0) { add(b.gx + b.gy + 0.5, () => { const q = I.p(b.gx + 0.5, b.gy + 0.5); I.ctx.fillStyle = '#8b5a2b'; I.ctx.fillRect(q[0] - 1, q[1] - 10, 2, 10); I.ctx.strokeStyle = 'rgba(255,255,255,.6)'; I.ctx.setLineDash([2, 3]); I.ctx.strokeRect(q[0] - 10, q[1] - 5, 20, 10); I.ctx.setLineDash([]); }); return; }
      let k = 1; if (opts.anim && opts.anim.title === b.title) k = reduce ? 1 : clamp((now - opts.anim.start) / 1600, 0, 1);
      add(b.gx + b.gy + 0.5, () => B[b.kind](I, b.gx, b.gy, k, now, b.tier)); if (!opts.map && b.order && !opts.quiet) add(b.gx + b.gy + 0.51, () => { const q = I.p(b.gx + 0.15, b.gy + 0.15, 2); I.roundRect(q[0] - 7, q[1] - 6, 14, 9, 3, 'rgba(16,24,44,.75)'); ctx.fillStyle = '#ffe9a6'; ctx.font = '800 6.5px Baloo 2, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(b.order), q[0], q[1] + 1); ctx.textAlign = 'left'; }); });
    if (opts.placing) add(9998, () => { const q = I.p(HOME[0] + 1, HOME[1] + 4.5); ctx.font = '800 12px Baloo 2, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(16,24,44,.75)'; ctx.strokeText('Where do you want this? Tap an outlined lot.', q[0], q[1]); ctx.fillStyle = '#ffe9a6'; ctx.fillText('Where do you want this? Tap an outlined lot.', q[0], q[1]); ctx.textAlign = 'left'; });
    if (opts.site) { const st = opts.site; add(st.gx + st.gy + 0.5, () => { opts.stage = drawSite(I, st, opts.stepsDone, opts.stepsTotal, opts.k == null ? 1 : opts.k, now); }); }
    if (!opts.map && me) { add(me.gx + me.gy, () => B.avatar(I, me.gx, me.gy, state.avatar, now / 1000, me.moving)); if (me.target) { const q = I.p(me.target[0], me.target[1]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(q[0], q[1], 9, 4.5, 0, 0, Math.PI * 2); ctx.stroke(); } }
    (opts.fx || []).forEach(f => { const t = (now - f.start) / f.life; if (t >= 1 || t < 0) return;
      if (f.type === 'float') add(999, () => { const q = I.p(f.gx, f.gy, 40 + t * 40); ctx.globalAlpha = 1 - t; ctx.font = '800 13px Baloo 2, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(16,24,44,.6)'; ctx.strokeText(f.text, q[0], q[1]); ctx.fillStyle = f.colour; ctx.fillText(f.text, q[0], q[1]); ctx.textAlign = 'left'; ctx.globalAlpha = 1; });
      if (f.type === 'sparkle') add(999, () => { const q = I.p(f.gx, f.gy, 20); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + f.seed, r = ease(t) * 34; ctx.globalAlpha = 1 - t; I.blob(q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r * 0.55 - t * 18, 2.2 * (1 - t) + 0.5, ['#ffd54a', '#7cf0a4', '#4fc3ff', '#ff8fb1'][i % 4]); } ctx.globalAlpha = 1; }); });
    items.sort((a, b) => a.d - b.d).forEach(it => it.fn());
    I.nightfall(I.night);
    return L;
  }
  function sky(I, n) { n = n || 0; const g = I.ctx.createLinearGradient(0, 0, 0, I.H || 620); const mix = (a, b) => { const A = NW.hex(a), B2 = NW.hex(b); return NW.rgb(A.map((v, i) => Math.round(v + (B2[i] - v) * n))); }; g.addColorStop(0, mix('#9ccdf5', '#0b1730')); g.addColorStop(1, mix('#dfeefb', '#16325a')); I.ctx.fillStyle = g; I.ctx.fillRect(0, 0, I.W || 880, I.H || 620); }
  const hit = (L, g) => L.buildings.find(b => b.tier > 0 && Math.abs(b.gx + 0.5 - g[0]) < 0.75 && Math.abs(b.gy + 0.5 - g[1]) < 0.75);
  const tierName = (state) => { const x = S.xpOf(state); return tierOf(x)[1]; };
  NW.Land = { groundColour, treeOf, onRoad, makeMe, goTo, stepMe, siteFor, drawSite, drawLand, sky, hit, tierName, TIERS, KIND_NAME };
})();
