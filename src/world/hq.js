/* NextWorld · HQ: the NextWork World map
 * A university campus in Houston, ranch-style: a quad with paved paths and
 * benches, the main hall at the top of it, the cafe on one side with its
 * terrace, eight hub buildings for the roadmaps round the quad, a lake in
 * one corner and a paddock with horses in another. The eight staff in
 * black T-shirts go about the quad. Learners' plots sit on the outer ring,
 * joined to campus by worn footpaths. Every element has its own ground,
 * laid out by hand so nothing stands on anything else. */
'use strict';
(function () {
  const { B, lerp, HUBS, reduce } = NW;
  const S = NW.State, MAP = 84, C = [42, 42], STAFF_TEE = '#1c1f26';
  const at = (dx, dy) => [C[0] + dx, C[1] + dy];
  const ground = (gx, gy) => NW.Land.groundColour(gx + 120, gy + 40);
  /* the plan, as offsets from the centre of the quad */
  const QUAD = { x0: -6, y0: -4, x1: 6, y1: 6 };                     /* the lawn */
  const RING = { x0: -7, y0: -5, x1: 7, y1: 7 };                     /* the paved path round it */
  const HALL = at(-3, -9.4);                                         /* 6 wide, faces the quad */
  const CAFE = at(9, -2);                                            /* the cafe, its terrace south of it */
  const TABLES = [[8.2, 1.2], [10, 1.4], [11.8, 1.2], [8.6, 3.2], [10.4, 3.4], [12.2, 3.2]].map(o => at(o[0], o[1]));
  const HUB_AT = [at(-12.5, -3), at(-12.5, 4), at(9, 6.5), at(-10, -9.5), at(5, 10), at(-5.5, 10), at(10, -9.5), at(-16, 10.5)];
  const LAKE = at(14, 9).concat([8, 8]);
  const PADDOCK = at(-19, -18).concat([7, 5]); const BARN = at(-11, -17.5);
  const BENCHES = [[-5, -4.8], [-2, -4.8], [2, -4.8], [5, -4.8], [-5, 6.6], [-2, 6.6], [2, 6.6], [5, 6.6], [-6.8, -1], [-6.8, 3], [6.8, -1], [6.8, 3]].map(o => at(o[0], o[1]));
  const SITTERS = ['#2f7fd6', STAFF_TEE, '#e8552f', null, '#3fa66b', null, STAFF_TEE, '#8f5fd1', null, '#f2b42a', '#2f7fd6', null];
  const PLOTS = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + 0.2 + (S.hash(i, 3) - 0.5) * 0.25, r = 30 + (S.hash(i, 5) - 0.5) * 3; PLOTS.push([C[0] + Math.cos(a) * r * 1.15, C[1] + Math.sin(a) * r * 0.9]); }
  const MINE = 3;
  const paved = (gx, gy) => { const dx = gx - C[0], dy = gy - C[1]; const onRing = (dx >= RING.x0 && dx <= RING.x1 && dy >= RING.y0 && dy <= RING.y1) && !(dx > RING.x0 && dx < RING.x1 && dy > RING.y0 && dy < RING.y1); const cross = (dx === 0 || dy === 1) && dx >= RING.x0 && dx <= RING.x1 && dy >= RING.y0 && dy <= RING.y1; const toHall = dx === 0 && dy < RING.y0 && dy >= -6.5; const toCafe = dy === 1 && dx > RING.x1 && dx < 9; const terrace = dx >= 8 && dx <= 13 && dy >= 0.5 && dy <= 4.5; return onRing || cross || toHall || toCafe || terrace; };
  const lawn = (gx, gy) => { const dx = gx - C[0], dy = gy - C[1]; return dx > QUAD.x0 && dx < QUAD.x1 && dy > QUAD.y0 && dy < QUAD.y1; };
  /* who is on the ring: you, and in dev a few sample neighbours */
  function owners(state) { return PLOTS.map((p, i) => i === MINE ? { at: p, mine: true, name: state.name, built: state.done.length } : state.mode === 'dev' && [7, 11, 14].includes(i) ? { at: p, name: 'A learner', built: [4, 22, 9][[7, 11, 14].indexOf(i)] } : { at: p, name: '', built: 0 }); }
  /* footpaths: from every built plot to the nearest paved or worn tile */
  function paths(os) { const worn = new Set(), tiles = []; const key = q => Math.floor(q[0]) + ',' + Math.floor(q[1]);
    for (let dy = RING.y0; dy <= RING.y1; dy++) for (let dx = RING.x0; dx <= RING.x1; dx++) if (paved(C[0] + dx, C[1] + dy)) tiles.push([C[0] + dx + 0.5, C[1] + dy + 0.5]);
    const walk = (from, to) => { const n = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) * 2) + 1; for (let i = 0; i <= n; i++) { const t = i / n, w = Math.sin(t * Math.PI) * (S.hash(from[0] + to[0], from[1] + to[1]) - 0.5) * 4; const q = [lerp(from[0], to[0], t) + w * (to[1] - from[1]) / (n / 2 + 1), lerp(from[1], to[1], t) - w * (to[0] - from[0]) / (n / 2 + 1)]; const k = key(q); if (!worn.has(k) && !paved(Math.floor(q[0]), Math.floor(q[1]))) { worn.add(k); tiles.push([Math.floor(q[0]) + 0.5, Math.floor(q[1]) + 0.5]); } } };
    const nearest = to => { let best = tiles[0], bd = 1e9; tiles.forEach(t => { const d = Math.hypot(t[0] - to[0], t[1] - to[1]); if (d < bd) { bd = d; best = t; } }); return best; };
    HUB_AT.forEach(h => walk(nearest([h[0] + 1, h[1] + 2.6]), [h[0] + 1, h[1] + 2.6]));
    walk(nearest([BARN[0] + 0.5, BARN[1] + 1.6]), [BARN[0] + 0.5, BARN[1] + 1.6]); walk(nearest([LAKE[0] + 6, LAKE[1] + 8.2]), [LAKE[0] + 6, LAKE[1] + 8.2]);
    os.forEach(o => { if (!o.built) return; const to = [o.at[0] + 0.6, o.at[1] + 2]; walk(nearest(to), to); });
    return worn; }
  /* the staff: each has one loop round the quad and a thing they say */
  const STAFF = [
    { name: 'Amber', pts: [at(-6.5, -4.5), at(6.5, -4.5), at(6.5, 6.5), at(-6.5, 6.5)], says: 'Show them what you built. That is the whole idea.' },
    { name: 'Barista', pts: [at(9.4, 0.6), at(11.6, 0.6)], says: 'Flat white. Or a project. Both take about ten minutes.' },
    { name: 'Guide', pts: HUB_AT.slice(0, 4).map(h => [h[0] + 1, h[1] + 2.8]), says: 'Every hub is a roadmap. Pick the one you keep thinking about.' },
    { name: 'Wrangler', pts: [[PADDOCK[0] + 1, PADDOCK[1] + 4], [PADDOCK[0] + 5.5, PADDOCK[1] + 1.5]], says: 'They belong to no one. Like the free tier.' },
    { name: 'Docs', pts: [at(0.4, 1.6)], says: 'Write it down while it is fresh. Future you will read it.' },
    { name: 'Support', pts: HUB_AT.slice(4).map(h => [h[0] + 1, h[1] + 2.8]), says: 'Stuck on a step? The chat is on every project page.' },
    { name: 'Jetty', pts: [[LAKE[0] + 6.2, LAKE[1] + 7.9]], says: 'Nothing to say. Nice out here though.' },
    { name: 'Dean', pts: [at(-1.5, -5.6), at(1.5, -5.6)], says: 'Houston. Where the work gets built. Welcome to campus.' }
  ];
  function along(pts, t) { if (pts.length === 1) return { q: pts[0], moving: false }; const n = pts.length, seg = Math.floor(t * n) % n, f = (t * n) % 1; const a = pts[seg], b = pts[(seg + 1) % n]; if (f > 0.65) return { q: b, moving: false }; const u = f / 0.65; return { q: [lerp(a[0], b[0], u), lerp(a[1], b[1], u)], moving: true }; }
  const HORSES = [{ pts: [[PADDOCK[0] + 1, PADDOCK[1] + 1.5], [PADDOCK[0] + 5.5, PADDOCK[1] + 2.5], [PADDOCK[0] + 4, PADDOCK[1] + 4], [PADDOCK[0] + 1.5, PADDOCK[1] + 3.5]], colour: '#8a5a3a' }, { pts: [[PADDOCK[0] + 2, PADDOCK[1] + 4], [PADDOCK[0] + 5, PADDOCK[1] + 1.5]], colour: '#3b2a1e' }];

  function drawHQ(I, state, now, opts) {
    const ctx = I.ctx, os = owners(state), worn = paths(os); opts = opts || {};
    for (let gy = 0; gy < MAP; gy++) for (let gx = 0; gx < MAP; gx++) { if (!I.onScreen(gx, gy)) continue; if (paved(gx, gy)) { I.tile(gx, gy, (gx + gy) % 2 ? '#e3dccb' : '#d8d0bc', 'rgba(0,0,0,.06)'); continue; } if (lawn(gx, gy)) { I.tile(gx, gy, (gx + gy) % 2 ? '#7fc55a' : '#86cc60'); continue; } I.tile(gx, gy, worn.has(gx + ',' + gy) ? '#c8a877' : ground(gx, gy)); }
    const items = []; const add = (d, fn) => items.push({ d, fn }); const late = fn => items.push({ d: 9999, fn });
    add(LAKE[0] + LAKE[1] + 2, () => B.lake(I, LAKE[0], LAKE[1], LAKE[2], LAKE[3], now));
    add(PADDOCK[0] + PADDOCK[1] - 1, () => B.paddock(I, PADDOCK[0], PADDOCK[1], PADDOCK[2], PADDOCK[3]));
    add(BARN[0] + BARN[1] + 0.6, () => B.barn(I, BARN[0], BARN[1], 1, now, 2)); add(PADDOCK[0] + PADDOCK[1] + 5.5, () => B.hay(I, PADDOCK[0] + 5.5, PADDOCK[1] + 4));
    HORSES.forEach((h, i) => { const s = along(h.pts, ((now / 26000) + i * 0.4) % 1); add(s.q[0] + s.q[1] + 0.2, () => B.horse(I, s.q[0], s.q[1], h.colour, s.moving ? now / 1000 : 0)); });
    add(HALL[0] + 3 + HALL[1] + 2.4, () => B.hall(I, HALL[0], HALL[1], now));
    add(CAFE[0] + 1.5 + CAFE[1] + 1.6, () => B.cafe(I, CAFE[0], CAFE[1], now));
    TABLES.forEach(t => add(t[0] + t[1] + 0.3, () => B.table(I, t[0], t[1])));
    BENCHES.forEach((b, i) => add(b[0] + b[1] + 0.3, () => B.bench(I, b[0], b[1], SITTERS[i], now)));
    [[-3.5, -4.7], [3.5, -4.7], [-3.5, 6.7], [3.5, 6.7], [-6.9, 1], [6.9, 1]].forEach(o => { const q = at(o[0], o[1]); add(q[0] + q[1] + 0.2, () => I.lamp(q[0] + 0.5, q[1] + 0.5)); });
    [[-4, -2], [4, -2], [-4, 4], [4, 4]].forEach(o => { const q = at(o[0], o[1]); add(q[0] + q[1] + 0.5, () => B.oak(I, q[0], q[1], 1.1)); });
    add(C[0] + C[1] + 1.4, () => B.fountain(I, C[0] - 0.5, C[1] + 0.5, 1, now));
    HUBS.forEach((h, i) => { const q = HUB_AT[i]; if (I.onScreen(q[0], q[1])) add(q[0] + q[1] + 2.4, () => B.hub(I, q[0], q[1], now, h)); });
    if (!opts.map) for (let gy = 0; gy < MAP; gy += 1) for (let gx = 0; gx < MAP; gx += 1) { const r = S.hash(gx * 7 + 1, gy * 3 + 2); if (r > 0.03 || !I.onScreen(gx, gy) || worn.has(gx + ',' + gy) || (Math.abs(gx - C[0]) < 21 && Math.abs(gy - C[1]) < 20)) continue; if (os.some(o => Math.abs(o.at[0] - gx) < 2.5 && Math.abs(o.at[1] - gy) < 2.5)) continue; add(gx + gy + 0.5, () => B.oak(I, gx, gy, 0.8 + S.hash(gy, gx) * 0.5)); }
    os.forEach(o => { if (!I.onScreen(o.at[0], o.at[1])) return; add(o.at[0] + o.at[1] + 1.2, () => B.plot(I, o.at[0], o.at[1], o, now)); if (!opts.map) late(() => I.label(o.at[0] + 0.6, o.at[1] + 2.6, o.mine ? o.name + ' · your land' : o.name || 'Open slot', o.built ? o.built + ' built' : o.mine ? 'start here' : 'pick it and build', 8)); });
    STAFF.forEach((st, i) => { const s = along(st.pts, ((now / (18000 + i * 2300)) + i * 0.13) % 1); add(s.q[0] + s.q[1] + 0.05, () => I.person(s.q[0], s.q[1], STAFF_TEE, s.moving && !reduce ? now / 1000 + i : 3 + i, false)); });
    if (state.mode === 'dev') [[7, 0], [11, 1], [14, 4]].forEach((v, i) => { const o = os[v[0]], h = HUB_AT[v[1]]; const pts = [[o.at[0] + 0.6, o.at[1] + 2.2], [h[0] + 1, h[1] + 2.8]]; const s = along(pts, ((now / 22000) + i * 0.33) % 1); const col = ['#3fa66b', '#8f5fd1', '#f2b42a'][i]; add(s.q[0] + s.q[1] + 0.1, () => s.moving ? B.bike(I, s.q[0], s.q[1], col, now / 1000) : I.person(s.q[0], s.q[1], col, 3, false)); });
    late(() => { I.label(HALL[0] + 3, HALL[1] + 4.2, 'NextWork Hall', 'Houston, Texas', 10); I.label(CAFE[0] + 1.5, CAFE[1] + 2.4, 'The cafe', 'ask anything', 8); I.label(LAKE[0] + 4, LAKE[1] + 9, 'The lake', '', 8); I.label(PADDOCK[0] + 3.5, PADDOCK[1] + 5.8, 'The paddock', '', 8); });
    items.sort((a, b) => a.d - b.d).forEach(it => it.fn());
    return { owners: os, hubs: HUB_AT, staff: STAFF };
  }
  function hitHQ(state, g) {
    if (g[0] >= HALL[0] - 0.3 && g[0] <= HALL[0] + 6.3 && g[1] >= HALL[1] - 0.3 && g[1] <= HALL[1] + 2.9) return { kind: 'hall' };
    if (g[0] >= CAFE[0] - 0.5 && g[0] <= CAFE[0] + 4.5 && g[1] >= CAFE[1] - 0.5 && g[1] <= CAFE[1] + 6.5) return { kind: 'cafe' };
    const hi = HUB_AT.findIndex(h => g[0] >= h[0] - 0.5 && g[0] <= h[0] + 2.2 && g[1] >= h[1] - 0.5 && g[1] <= h[1] + 2.4); if (hi >= 0) return { kind: 'hub', hub: HUBS[hi] };
    const os = owners(state); const pi = os.findIndex(o => g[0] >= o.at[0] - 0.6 && g[0] <= o.at[0] + 1.8 && g[1] >= o.at[1] - 0.6 && g[1] <= o.at[1] + 1.8); if (pi >= 0) return { kind: 'plot', owner: os[pi], index: pi };
    if (g[0] >= LAKE[0] && g[0] <= LAKE[0] + LAKE[2] && g[1] >= LAKE[1] && g[1] <= LAKE[1] + LAKE[3]) return { kind: 'lake' };
    if (g[0] >= PADDOCK[0] && g[0] <= PADDOCK[0] + PADDOCK[2] && g[1] >= PADDOCK[1] && g[1] <= PADDOCK[1] + PADDOCK[3]) return { kind: 'paddock' };
    const si = STAFF.findIndex(st => st.pts.some(p => Math.hypot(p[0] - g[0], p[1] - g[1]) < 1.4)); if (si >= 0) return { kind: 'staff', staff: STAFF[si] };
    if (lawn(Math.floor(g[0]), Math.floor(g[1]))) return { kind: 'quad' };
    return { kind: 'grass' };
  }
  NW.HQ = { MAP, C, PLOTS, MINE, owners, drawHQ, hitHQ, HUB_AT, HALL, CAFE };
})();
