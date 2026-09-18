/* NextWorld · HQ: the NextWork World map
 * The ranch in the middle is NextWork: the tower with the cafe at its foot,
 * eight hubs round it for the roadmaps, a lake, a paddock, and the eight
 * staff in black T-shirts going about their day. Learners' plots sit on
 * the outer ring, joined to the ranch by worn footpaths. No roads. */
(function () {
  'use strict';
  const { B, lerp, HUBS, reduce } = NW;
  const S = NW.State, MAP = 72, C = [36, 36], STAFF_TEE = '#1c1f26';
  const ground = (gx, gy) => NW.Land.groundColour(gx + 120, gy + 40);
  const HUB_AT = HUBS.map((h, i) => { const a = i / HUBS.length * Math.PI * 2 - Math.PI / 2; return [C[0] + Math.cos(a) * 11 - 1, C[1] + Math.sin(a) * 9 - 1]; });
  const LAKE = [22, 38, 8, 9], PADDOCK = [42, 26, 7, 5];
  const PLOTS = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + 0.2 + (S.hash(i, 3) - 0.5) * 0.25, r = 23 + (S.hash(i, 5) - 0.5) * 3; PLOTS.push([C[0] + Math.cos(a) * r * 1.15, C[1] + Math.sin(a) * r * 0.95]); }
  const MINE = 3;
  /* who is on the ring: you, and in dev a few sample neighbours */
  function owners(state) { return PLOTS.map((p, i) => i === MINE ? { at: p, mine: true, name: state.name, built: state.done.length } : state.mode === 'dev' && [7, 11, 14].includes(i) ? { at: p, name: 'A learner', built: [4, 22, 9][[7, 11, 14].indexOf(i)] } : { at: p, name: '', built: 0 }); }
  /* footpaths: from every built plot to the nearest worn tile, like the land */
  function paths(os) { const worn = new Set(), tiles = [[C[0], C[1] + 6]]; const key = q => Math.floor(q[0]) + ',' + Math.floor(q[1]); worn.add(key(tiles[0]));
    const walk = (from, to) => { const n = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) * 2) + 1; for (let i = 0; i <= n; i++) { const t = i / n, w = Math.sin(t * Math.PI) * (S.hash(from[0] + to[0], from[1] + to[1]) - 0.5) * 4; const q = [lerp(from[0], to[0], t) + w * (to[1] - from[1]) / (n / 2 + 1), lerp(from[1], to[1], t) - w * (to[0] - from[0]) / (n / 2 + 1)]; const k = key(q); if (!worn.has(k)) { worn.add(k); tiles.push([Math.floor(q[0]) + 0.5, Math.floor(q[1]) + 0.5]); } } };
    HUB_AT.forEach(h => walk([C[0], C[1] + 6], [h[0] + 1, h[1] + 2.5]));
    os.forEach(o => { if (!o.built) return; const to = [o.at[0] + 0.6, o.at[1] + 2]; let best = tiles[0], bd = 1e9; tiles.forEach(t => { const d = Math.hypot(t[0] - to[0], t[1] - to[1]); if (d < bd) { bd = d; best = t; } }); walk(best, to); });
    return worn; }
  /* the staff: each has one loop and a thing they do */
  const STAFF = [
    { name: 'Amber', pts: [[34.5, 37.2], [36.8, 37.2], [36.8, 39.5], [34.5, 39.5]], says: 'Show them what you built. That is the whole idea.' },
    { name: 'Barista', pts: [[33.6, 36.6], [34.4, 36.6]], says: 'Flat white. Or a project. Both take about ten minutes.' },
    { name: 'Guide', pts: HUB_AT.map(h => [h[0] + 1, h[1] + 2.6]), says: 'Every hub is a roadmap. Pick the one you keep thinking about.' },
    { name: 'Wrangler', pts: [[PADDOCK[0] + 1, PADDOCK[1] + 4], [PADDOCK[0] + 5, PADDOCK[1] + 2]], says: 'They belong to no one. Like the free tier.' },
    { name: 'Docs', pts: [[36, 40.4]], says: 'Write it down while it is fresh. Future you will read it.' },
    { name: 'Support', pts: [[HUB_AT[1][0] + 1, HUB_AT[1][1] + 2.6], [HUB_AT[2][0] + 1, HUB_AT[2][1] + 2.6]], says: 'Stuck on a step? The chat is on every project page.' },
    { name: 'Jetty', pts: [[LAKE[0] + 6.2, LAKE[1] + 7.9]], says: 'Nothing to say. Nice out here though.' },
    { name: 'Runner', pts: [[HUB_AT[5][0] + 1, HUB_AT[5][1] + 2.6], [HUB_AT[6][0] + 1, HUB_AT[6][1] + 2.6], [HUB_AT[7][0] + 1, HUB_AT[7][1] + 2.6]], says: 'New projects land every week. The gazette is on the board.' }
  ];
  function along(pts, t) { if (pts.length === 1) return { q: pts[0], moving: false }; const n = pts.length, seg = Math.floor(t * n) % n, f = (t * n) % 1; const a = pts[seg], b = pts[(seg + 1) % n]; const walkPart = 0.65; if (f > walkPart) return { q: b, moving: false }; const u = f / walkPart; return { q: [lerp(a[0], b[0], u), lerp(a[1], b[1], u)], moving: true }; }
  const HORSES = [{ pts: [[43, 27.5], [47.5, 28.5], [46, 30], [43.5, 29.5]], colour: '#8a5a3a' }, { pts: [[44, 30], [47, 27.5]], colour: '#3b2a1e' }];

  function drawHQ(I, state, now, opts) {
    const ctx = I.ctx, os = owners(state), worn = paths(os); opts = opts || {};
    for (let gy = 0; gy < MAP; gy++) for (let gx = 0; gx < MAP; gx++) { if (!I.onScreen(gx, gy)) continue; if (Math.abs(gx - C[0]) < 6 && Math.abs(gy - C[1]) < 6) { I.tile(gx, gy, (gx + gy) % 2 ? '#e3dccb' : '#d8d0bc'); continue; } I.tile(gx, gy, worn.has(gx + ',' + gy) ? '#c8a877' : ground(gx, gy)); }
    const items = []; const add = (d, fn) => items.push({ d, fn });
    add(LAKE[0] + LAKE[1] + 2, () => B.lake(I, LAKE[0], LAKE[1], LAKE[2], LAKE[3], now));
    add(PADDOCK[0] + PADDOCK[1] - 1, () => B.paddock(I, PADDOCK[0], PADDOCK[1], PADDOCK[2], PADDOCK[3]));
    HORSES.forEach((h, i) => { const s = along(h.pts, ((now / 26000) + i * 0.4) % 1); add(s.q[0] + s.q[1] + 0.2, () => B.horse(I, s.q[0], s.q[1], h.colour, s.moving ? now / 1000 : 0)); });
    add(C[0] + C[1] + 1.2, () => B.tower_hq(I, C[0] - 1, C[1] - 2, now));
    [[33.2, 40.2, '#2f7fd6'], [35.4, 40.6, STAFF_TEE], [37.6, 40.2, '#e8552f'], [39.6, 39.6, '#3fa66b']].forEach(b => add(b[0] + b[1] + 0.3, () => B.bench(I, b[0], b[1], b[2], now)));
    HUBS.forEach((h, i) => { const q = HUB_AT[i]; if (I.onScreen(q[0], q[1])) add(q[0] + q[1] + 2.4, () => B.hub(I, q[0], q[1], now, h)); });
    if (!opts.map) for (let gy = 0; gy < MAP; gy += 1) for (let gx = 0; gx < MAP; gx += 1) { const r = S.hash(gx * 7 + 1, gy * 3 + 2); if (r > 0.03 || !I.onScreen(gx, gy) || worn.has(gx + ',' + gy) || (Math.abs(gx - C[0]) < 15 && Math.abs(gy - C[1]) < 13)) continue; if (os.some(o => Math.abs(o.at[0] - gx) < 2.5 && Math.abs(o.at[1] - gy) < 2.5)) continue; add(gx + gy + 0.5, () => B.oak(I, gx, gy, 0.8 + S.hash(gy, gx) * 0.5)); }
    os.forEach((o, i) => { if (!I.onScreen(o.at[0], o.at[1])) return; add(o.at[0] + o.at[1] + 1.2, () => { B.plot(I, o.at[0], o.at[1], o, now); if (!opts.map) I.label(o.at[0] + 0.6, o.at[1] + 2.6, o.mine ? o.name + ' · your land' : o.name || 'Open slot', o.built ? o.built + ' built' : o.mine ? 'start here' : 'pick it and build', 8); }); });
    STAFF.forEach((st, i) => { const s = along(st.pts, ((now / (18000 + i * 2300)) + i * 0.13) % 1); add(s.q[0] + s.q[1] + 0.05, () => I.person(s.q[0], s.q[1], STAFF_TEE, s.moving && !reduce ? now / 1000 + i : 3 + i, false)); });
    if (state.mode === 'dev') [[7, 0], [11, 1], [14, 4]].forEach((v, i) => { const o = os[v[0]], h = HUB_AT[v[1]]; const pts = [[o.at[0] + 0.6, o.at[1] + 2.2], [h[0] + 1, h[1] + 2.8]]; const s = along(pts, ((now / 22000) + i * 0.33) % 1); add(s.q[0] + s.q[1] + 0.1, () => s.moving ? B.bike(I, s.q[0], s.q[1], ['#3fa66b', '#8f5fd1', '#f2b42a'][i], now / 1000) : I.person(s.q[0], s.q[1], ['#3fa66b', '#8f5fd1', '#f2b42a'][i], 3, false)); });
    add(C[0] + C[1] + 8.5, () => I.label(C[0], C[1] + 7.6, 'NextWork HQ Ranch', 'the tower, the cafe, eight hubs, one lake', 11));
    items.sort((a, b) => a.d - b.d).forEach(it => it.fn());
    return { owners: os, hubs: HUB_AT, staff: STAFF };
  }
  function hitHQ(state, g) {
    if (Math.abs(g[0] - C[0]) < 2.2 && Math.abs(g[1] - C[1] - 0.2) < 2.4) return { kind: 'tower' };
    if (g[1] > C[1] + 1.6 && g[1] < C[1] + 4.6 && Math.abs(g[0] - C[0]) < 2.6) return { kind: 'cafe' };
    const hi = HUB_AT.findIndex(h => g[0] >= h[0] - 0.5 && g[0] <= h[0] + 2.2 && g[1] >= h[1] - 0.5 && g[1] <= h[1] + 2.4); if (hi >= 0) return { kind: 'hub', hub: HUBS[hi] };
    const os = owners(state); const pi = os.findIndex(o => g[0] >= o.at[0] - 0.6 && g[0] <= o.at[0] + 1.8 && g[1] >= o.at[1] - 0.6 && g[1] <= o.at[1] + 1.8); if (pi >= 0) return { kind: 'plot', owner: os[pi], index: pi };
    if (g[0] >= LAKE[0] && g[0] <= LAKE[0] + LAKE[2] && g[1] >= LAKE[1] && g[1] <= LAKE[1] + LAKE[3]) return { kind: 'lake' };
    if (g[0] >= PADDOCK[0] && g[0] <= PADDOCK[0] + PADDOCK[2] && g[1] >= PADDOCK[1] && g[1] <= PADDOCK[1] + PADDOCK[3]) return { kind: 'paddock' };
    const si = STAFF.findIndex(st => st.pts.some(p => Math.hypot(p[0] - g[0], p[1] - g[1]) < 1.2)); if (si >= 0) return { kind: 'staff', staff: STAFF[si] };
    return { kind: 'grass' };
  }
  NW.HQ = { MAP, C, PLOTS, MINE, owners, drawHQ, hitHQ, HUB_AT };
})();
