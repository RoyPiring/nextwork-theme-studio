/* NextWorld · HQ: the NextWork World map
 * NextWork Headquarters, Austin, Texas: a fenced ranch campus. The
 * headquarters hall at the top of the quad, the NextWork Cafe with its
 * terrace, eight hubs the size of the hall with their names on them, a
 * lake, a paddock. Paved paths join everything on campus and dirt roads
 * run out through the gates to the learners' plots, each with its name.
 * The staff walk real routes on the paths: somewhere to go, a while
 * there, somewhere else. Nothing ever stands on a road. */
'use strict';
(function () {
  const { B, lerp, HUBS, reduce } = NW;
  const S = NW.State, MAP = 100, C = [50, 50], STAFF_TEE = '#1c1f26';
  const at = (dx, dy) => [C[0] + dx, C[1] + dy];
  const ground = (gx, gy) => NW.Land.groundColour(gx + 120, gy + 40);
  const key = (x, y) => x + ',' + y;
  /* ---- the plan, as offsets from the middle of the quad ---- */
  const QUAD = { x0: -6, y0: -4, x1: 6, y1: 6 };
  const FENCE = { x0: -26, y0: -24, x1: 26, y1: 22 };
  const GATES = [at(0, 22), at(26, 1), at(-26, 1), at(0, -24)];
  const HALL = at(-3, -10.4), HALL_DOOR = at(0, -7);
  const CAFE = at(10, -2), CAFE_DOOR = at(11, 0), TERRACE = { x0: 9, y0: 1, x1: 14, y1: 4 };
  const TABLES = [[9.4, 1.4], [11.4, 1.4], [13.4, 1.4], [9.4, 3.4], [11.4, 3.4], [13.4, 3.4]].map(o => at(o[0], o[1]));
  /* the hubs: three tiles square each, with the paved tile they are entered from */
  const HUB_AT = [at(-16, -4), at(-16, 5), at(12, 8), at(-13, -14), at(6, 13), at(-6, 13), at(14, -14), at(-21, 12)];
  const HUB_DOOR = HUB_AT.map(h => [h[0] + 1, h[1] + 3]);
  const LAKE = at(17, 10).concat([8, 8]); const JETTY = at(23, 18);
  const PADDOCK = at(-24, -22).concat([8, 5]); const BARN = at(-15, -22); const PADDOCK_GATE = at(-16, -16);
  const BENCHES = [[-5, -4.1], [-2, -4.1], [2, -4.1], [5, -4.1], [-5, 6.2], [-2, 6.2], [2, 6.2], [5, 6.2], [-6.2, -1], [-6.2, 3], [6.2, -1], [6.2, 3]].map(o => at(o[0], o[1]));
  const SITTERS = ['#2f7fd6', STAFF_TEE, '#e8552f', null, '#3fa66b', null, STAFF_TEE, '#8f5fd1', null, '#f2b42a', '#2f7fd6', null];
  const PLOTS = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + 0.2 + (S.hash(i, 3) - 0.5) * 0.25, r = 38 + (S.hash(i, 5) - 0.5) * 3; PLOTS.push([Math.round(C[0] + Math.cos(a) * r * 1.15), Math.round(C[1] + Math.sin(a) * r * 0.85)]); }
  const MINE = 3;
  const NEIGHBOURS = { 7: ['Kalpana’s Ridge', 4], 11: ['Adam’s Acres', 22], 14: ['The Cloud Barn', 9] };

  /* ---- paved paths on campus, four-connected so people can walk them ---- */
  const PAVED = new Set();
  const lay = (x, y) => PAVED.add(key(x, y));
  const line = (a, b) => { let [x, y] = a; lay(x, y); while (x !== b[0]) { x += x < b[0] ? 1 : -1; lay(x, y); } while (y !== b[1]) { y += y < b[1] ? 1 : -1; lay(x, y); } };
  for (let dx = QUAD.x0 - 1; dx <= QUAD.x1 + 1; dx++) { lay(C[0] + dx, C[1] + QUAD.y0 - 1); lay(C[0] + dx, C[1] + QUAD.y1 + 1); }
  for (let dy = QUAD.y0 - 1; dy <= QUAD.y1 + 1; dy++) { lay(C[0] + QUAD.x0 - 1, C[1] + dy); lay(C[0] + QUAD.x1 + 1, C[1] + dy); }
  line(at(0, QUAD.y0 - 1), at(0, QUAD.y1 + 1)); line(at(QUAD.x0 - 1, 1), at(QUAD.x1 + 1, 1));
  line(at(0, QUAD.y0 - 1), HALL_DOOR); line(at(QUAD.x1 + 1, 1), at(8, 1)); for (let dy = TERRACE.y0; dy <= TERRACE.y1; dy++) for (let dx = TERRACE.x0; dx <= TERRACE.x1; dx++) lay(C[0] + dx, C[1] + dy); line(at(11, 1), CAFE_DOOR);
  const ringNearest = q => { let best = null, bd = 1e9; PAVED.forEach(k => { const t = k.split(',').map(Number); const d = Math.abs(t[0] - q[0]) + Math.abs(t[1] - q[1]); if (d < bd) { bd = d; best = t; } }); return best; };
  HUB_DOOR.forEach(d => line(ringNearest(d), d));
  line(ringNearest(JETTY), JETTY); line(ringNearest(PADDOCK_GATE), PADDOCK_GATE);
  GATES.forEach(g => line(ringNearest(g), g));
  const paved = (gx, gy) => PAVED.has(key(gx, gy));
  const lawn = (gx, gy) => { const dx = gx - C[0], dy = gy - C[1]; return dx >= QUAD.x0 && dx <= QUAD.x1 && dy >= QUAD.y0 && dy <= QUAD.y1 && !paved(gx, gy); };
  const inside = (gx, gy) => gx > C[0] + FENCE.x0 && gx < C[0] + FENCE.x1 && gy > C[1] + FENCE.y0 && gy < C[1] + FENCE.y1;

  /* ---- who is on the ring, and the dirt roads out to them ---- */
  function owners(state) { return PLOTS.map((p, i) => i === MINE ? { at: p, mine: true, name: S.landName(state), built: state.done.length } : state.mode === 'dev' && NEIGHBOURS[i] ? { at: p, name: NEIGHBOURS[i][0], built: NEIGHBOURS[i][1] } : { at: p, name: '', built: 0 }); }
  let roadsFor = '', ROADS = new Set();
  function roads(os) {
    const sig = os.map(o => o.built ? 1 : 0).join(''); if (sig === roadsFor) return ROADS;
    const set = new Set(), tiles = GATES.map(g => g.slice()); const l = (x, y) => set.add(key(x, y));
    const ln = (a, b) => { let [x, y] = a; l(x, y); while (x !== b[0]) { x += x < b[0] ? 1 : -1; l(x, y); tiles.push([x, y]); } while (y !== b[1]) { y += y < b[1] ? 1 : -1; l(x, y); tiles.push([x, y]); } };
    const bent = (a, b) => { const t = 0.35 + S.hash(a[0] + b[0], a[1] + b[1]) * 0.3; const m = [Math.round(lerp(a[0], b[0], t)), Math.round(lerp(a[1], b[1], 1 - t))]; ln(a, m); ln(m, b); };
    os.forEach(o => { if (!o.built && !o.mine) return; const to = [o.at[0], o.at[1] + 2]; let best = tiles[0], bd = 1e9; tiles.forEach(t => { const d = Math.abs(t[0] - to[0]) + Math.abs(t[1] - to[1]); if (d < bd) { bd = d; best = t; } }); bent(best, to); });
    ROADS = set; roadsFor = sig; return set;
  }
  const walkableAll = (set) => { const u = new Set(PAVED); set.forEach(k => u.add(k)); return u; };

  /* ---- the staff and visitors: somewhere to be, a while there, on again ---- */
  const POIS = { hall: HALL_DOOR, cafe: CAFE_DOOR, jetty: JETTY, paddock: PADDOCK_GATE, hub: i => HUB_DOOR[i], bench: i => { const b = BENCHES[i]; return ringNearest([Math.round(b[0]), Math.round(b[1])]); }, gate: i => GATES[i] };
  const STAFF = [
    { name: 'Amber', plan: ['hall', 'bench0', 'hub1', 'cafe', 'bench5', 'hall'], says: 'Show them what you built. That is the whole idea.' },
    { name: 'Barista', plan: ['cafe', 'cafe', 'bench10', 'cafe'], says: 'Flat white. Or a project. Both take about ten minutes.' },
    { name: 'Guide', plan: ['hub0', 'hub1', 'hub2', 'hub3', 'hub4', 'hub5', 'hub6', 'hub7'], says: 'Every hub is a roadmap. Pick the one you keep thinking about.' },
    { name: 'Wrangler', plan: ['paddock', 'paddock', 'cafe', 'paddock'], says: 'They belong to no one. Like the free tier.' },
    { name: 'Docs', plan: ['bench2', 'bench2', 'bench2', 'cafe', 'bench7', 'bench7'], says: 'Write it down while it is fresh. Future you will read it.' },
    { name: 'Support', plan: ['hub4', 'hub5', 'bench9', 'hall', 'hub6'], says: 'Stuck on a step? The chat is on every project page.' },
    { name: 'Jetty', plan: ['jetty', 'jetty', 'jetty', 'cafe', 'jetty'], says: 'Nothing to say. Nice out here though.' },
    { name: 'Dean', plan: ['hall', 'hall', 'gate0', 'hall', 'bench3'], says: 'Austin. Where the work gets built. Welcome to campus.' }
  ];
  const poi = name => { const m = /^([a-z]+)(\d*)$/.exec(name); const p = POIS[m[1]]; return typeof p === 'function' ? p(+m[2]) : p; };
  const agents = STAFF.map((st, i) => ({ st, i, at: poi(st.plan[0]).slice(), step: 0, path: null, dwell: 2 + i, colour: STAFF_TEE, bike: false }));
  const visitors = [];
  let lastNow = 0;
  function tick(now, state, os) {
    const dt = Math.min(0.1, lastNow ? (now - lastNow) / 1000 : 0); lastNow = now; if (reduce) return;
    const all = walkableAll(roads(os));
    if (state.mode === 'dev' && !visitors.length) Object.keys(NEIGHBOURS).forEach((k, i) => { const o = os[+k]; if (!o.built) return; visitors.push({ st: { name: o.name, plan: ['home', 'hub' + (i * 2), 'cafe', 'hub' + (i * 2 + 1), 'home'] }, home: [o.at[0], o.at[1] + 2], at: [o.at[0], o.at[1] + 2], step: 0, path: null, dwell: 4 + i * 3, colour: ['#3fa66b', '#8f5fd1', '#f2b42a'][i], bike: true }); });
    agents.concat(visitors).forEach(a => {
      if (a.path && a.path.length) { const w = a.path[0], dx = w[0] - a.at[0], dy = w[1] - a.at[1], d = Math.hypot(dx, dy), sp = (a.bike ? 3.2 : 1.5) * dt; if (d <= sp) { a.at = w.slice(); a.path.shift(); if (!a.path.length) a.dwell = 3 + S.hash(a.step, a.i || 9) * 5; } else { a.at[0] += dx / d * sp; a.at[1] += dy / d * sp; } a.moving = true; return; }
      a.moving = false; a.dwell -= dt; if (a.dwell > 0) return;
      a.step = (a.step + 1) % a.st.plan.length; const name = a.st.plan[a.step]; const to = name === 'home' ? a.home : poi(name); const from = [Math.round(a.at[0] - 0.5), Math.round(a.at[1] - 0.5)];
      const r = S.route(all, from, to); if (r) { a.path = r.map(t => [t[0] + 0.5, t[1] + 0.5]); if (a.path.length && Math.hypot(a.path[0][0] - a.at[0], a.path[0][1] - a.at[1]) < 0.1) a.path.shift(); } else a.dwell = 2;
    });
  }

  function drawHQ(I, state, now, opts) {
    const ctx = I.ctx, os = owners(state), rd = roads(os); opts = opts || {}; tick(now, state, os);
    for (let gy = 0; gy < MAP; gy++) for (let gx = 0; gx < MAP; gx++) { if (!I.onScreen(gx, gy)) continue; if (paved(gx, gy)) { I.tile(gx, gy, (gx + gy) % 2 ? '#e3dccb' : '#d8d0bc', 'rgba(0,0,0,.06)'); continue; } if (rd.has(key(gx, gy))) { I.tile(gx, gy, '#c8a877', 'rgba(110,75,30,.35)'); continue; } if (lawn(gx, gy)) { I.tile(gx, gy, (gx + gy) % 2 ? '#7fc55a' : '#86cc60'); continue; } I.tile(gx, gy, ground(gx, gy)); }
    const items = []; const add = (d, fn) => items.push({ d, fn }); const late = fn => items.push({ d: 9999, fn });
    /* the borders: a rail fence round the ranch, open at the gates */
    const fx0 = C[0] + FENCE.x0, fy0 = C[1] + FENCE.y0, fx1 = C[0] + FENCE.x1, fy1 = C[1] + FENCE.y1;
    const seg = (a, b) => add(Math.min(a[0], b[0]) + Math.min(a[1], b[1]) - 0.5, () => I.fence(a[0], a[1], b[0], b[1], Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.5)));
    seg([fx0, fy0], [C[0] - 1.2, fy0]); seg([C[0] + 1.2, fy0], [fx1, fy0]); seg([fx0, fy1], [C[0] - 1.2, fy1]); seg([C[0] + 1.2, fy1], [fx1, fy1]);
    seg([fx0, fy0], [fx0, C[1] + 0.8]); seg([fx0, C[1] + 2.2], [fx0, fy1]); seg([fx1, fy0], [fx1, C[1] + 0.8]); seg([fx1, C[1] + 2.2], [fx1, fy1]);
    add(LAKE[0] + LAKE[1] + 2, () => B.lake(I, LAKE[0], LAKE[1], LAKE[2], LAKE[3], now));
    add(PADDOCK[0] + PADDOCK[1] - 1, () => B.paddock(I, PADDOCK[0], PADDOCK[1], PADDOCK[2], PADDOCK[3]));
    add(BARN[0] + BARN[1] + 0.6, () => B.barn(I, BARN[0], BARN[1], 1, now, 2)); add(PADDOCK[0] + PADDOCK[1] + 5.5, () => B.hay(I, PADDOCK[0] + 6, PADDOCK[1] + 3.5));
    [[1, 1.5], [5.5, 2.5]].forEach((o, i) => { const q = [PADDOCK[0] + o[0] + Math.sin(now / 9000 + i) * 1.4, PADDOCK[1] + o[1] + Math.cos(now / 11000 + i) * 0.9]; add(q[0] + q[1] + 0.2, () => B.horse(I, q[0], q[1], ['#8a5a3a', '#3b2a1e'][i], now / 1000)); });
    add(HALL[0] + 3 + HALL[1] + 2.4, () => B.hall(I, HALL[0], HALL[1], now));
    add(CAFE[0] + 1.5 + CAFE[1] + 1.6, () => B.cafe(I, CAFE[0], CAFE[1], now));
    TABLES.forEach(t => add(t[0] + t[1] + 0.3, () => B.table(I, t[0], t[1])));
    BENCHES.forEach((b, i) => add(b[0] + b[1] + 0.3, () => B.bench(I, b[0], b[1], SITTERS[i], now)));
    [[-4, -4.2], [4, -4.2], [-4, 6.3], [4, 6.3]].forEach(o => { const q = at(o[0], o[1]); add(q[0] + q[1] + 0.2, () => I.lamp(q[0] + 0.5, q[1] + 0.5)); });
    [[-4, -2], [4, -2], [-4, 4], [4, 4]].forEach(o => { const q = at(o[0], o[1]); add(q[0] + q[1] + 0.5, () => B.oak(I, q[0], q[1], 1.1)); });
    add(C[0] + C[1] + 1.4, () => B.fountain(I, C[0] - 0.5, C[1] + 0.5, 1, now));
    HUBS.forEach((h, i) => { const q = HUB_AT[i]; if (I.onScreen(q[0], q[1]) || I.onScreen(q[0] + 3, q[1] + 3)) add(q[0] + q[1] + 3.2, () => B.bighub(I, q[0], q[1], now, h)); });
    if (!opts.map) for (let gy = 0; gy < MAP; gy += 1) for (let gx = 0; gx < MAP; gx += 1) { const r = S.hash(gx * 7 + 1, gy * 3 + 2); if (r > 0.03 || !I.onScreen(gx, gy) || paved(gx, gy) || rd.has(key(gx, gy)) || (Math.abs(gx - C[0]) < 25 && Math.abs(gy - C[1]) < 23)) continue; if (os.some(o => Math.abs(o.at[0] - gx) < 3 && Math.abs(o.at[1] - gy) < 3)) continue; add(gx + gy + 0.5, () => B.oak(I, gx, gy, 0.8 + S.hash(gy, gx) * 0.5)); }
    os.forEach(o => { if (!I.onScreen(o.at[0], o.at[1])) return; add(o.at[0] + o.at[1] + 1.2, () => B.plot(I, o.at[0], o.at[1], o, now)); if (!opts.map) late(() => I.label(o.at[0] + 0.6, o.at[1] + 2.9, o.name || 'Open slot', o.built ? o.built + ' built' : o.mine ? 'start here' : 'pick it and build', o.mine ? 10 : 8)); });
    agents.concat(visitors).forEach(a => add(a.at[0] + a.at[1] + 0.05, () => a.bike && a.moving ? B.bike(I, a.at[0], a.at[1], a.colour, now / 1000) : I.person(a.at[0], a.at[1], a.colour, a.moving && !reduce ? now / 1000 + (a.i || 0) : 3 + (a.i || 0), false)));
    late(() => { I.label(HALL[0] + 3, HALL[1] + 4.6, 'NextWork Headquarters', 'Austin, Texas', 12); I.label(CAFE[0] + 1.5, CAFE[1] + 2.5, 'NextWork Cafe', 'ask anything', 9); I.label(LAKE[0] + 4, LAKE[1] + 9.2, 'The lake', '', 8); I.label(PADDOCK[0] + 4, PADDOCK[1] + 6, 'The paddock', '', 8); I.label(C[0], C[1] + FENCE.y1 + 2.4, 'NextWork Ranch', 'the south gate', 9); });
    items.sort((a, b) => a.d - b.d).forEach(it => it.fn());
    return { owners: os, hubs: HUB_AT, staff: STAFF };
  }
  function hitHQ(state, g) {
    if (g[0] >= HALL[0] - 0.3 && g[0] <= HALL[0] + 6.3 && g[1] >= HALL[1] - 0.3 && g[1] <= HALL[1] + 2.9) return { kind: 'hall' };
    if (g[0] >= CAFE[0] - 0.5 && g[0] <= CAFE[0] + 4.5 && g[1] >= CAFE[1] - 0.5 && g[1] <= CAFE[1] + 6.5) return { kind: 'cafe' };
    const hi = HUB_AT.findIndex(h => g[0] >= h[0] - 0.5 && g[0] <= h[0] + 3.5 && g[1] >= h[1] - 0.5 && g[1] <= h[1] + 3.5); if (hi >= 0) return { kind: 'hub', hub: HUBS[hi] };
    const os = owners(state); const pi = os.findIndex(o => g[0] >= o.at[0] - 0.6 && g[0] <= o.at[0] + 1.8 && g[1] >= o.at[1] - 0.6 && g[1] <= o.at[1] + 1.8); if (pi >= 0) return { kind: 'plot', owner: os[pi], index: pi };
    if (g[0] >= LAKE[0] && g[0] <= LAKE[0] + LAKE[2] && g[1] >= LAKE[1] && g[1] <= LAKE[1] + LAKE[3]) return { kind: 'lake' };
    if (g[0] >= PADDOCK[0] && g[0] <= PADDOCK[0] + PADDOCK[2] && g[1] >= PADDOCK[1] && g[1] <= PADDOCK[1] + PADDOCK[3]) return { kind: 'paddock' };
    const ai = agents.findIndex(a => Math.hypot(a.at[0] - g[0], a.at[1] - g[1]) < 1.2); if (ai >= 0) return { kind: 'staff', staff: STAFF[ai] };
    if (lawn(Math.floor(g[0]), Math.floor(g[1]))) return { kind: 'quad' };
    if (!inside(g[0], g[1])) return { kind: 'outside' };
    return { kind: 'grass' };
  }
  NW.HQ = { MAP, C, PLOTS, MINE, owners, drawHQ, hitHQ, HUB_AT, HALL, CAFE, FENCE };
})();
