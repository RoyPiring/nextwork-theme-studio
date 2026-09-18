/* NextWorld · HQ: the NextWork World map
 * NextWork Headquarters, Austin, Texas, laid out like a campus should be:
 * one axis. You arrive from the south on the entry road, park in the lot
 * or rack your bike outside the fence, walk in under the archway, up the
 * main avenue past the quad to the headquarters hall. Eight hubs stand in
 * two colonnades either side of the quad, the NextWork Cafe on the east
 * side, the lake in the north-east corner, the paddock in the north-west.
 * Paved paths join everything inside the fence; the learners' plots sit
 * outside it. Staff and visitors walk the paths and
 * nothing else; visitors arrive by car and bike. Behind headquarters a back
 * road joins the Cloud side to the System Design side, with the Hackathon
 * and Games halls on it; the Lodge row is where learners stay; the ranch
 * corner has the horses, the cows and the chickens. After dark the lights
 * come on. */
'use strict';
(function () {
  const { B, lerp, HUBS, reduce } = NW;
  const S = NW.State, MAP = 110, C = [55, 55], STAFF_TEE = '#1c1f26';
  const at = (dx, dy) => [C[0] + dx, C[1] + dy];
  const ground = (gx, gy) => NW.Land.groundColour(gx + 120, gy + 40);
  const key = (x, y) => x + ',' + y;
  /* ---- the plan, as offsets from the middle of the quad ---- */
  const QUAD = { x0: -6, y0: -4, x1: 6, y1: 6 };
  const FENCE = { x0: -30, y0: -27, x1: 30, y1: 22 };
  const SOUTH_GATE = at(0, 22), NORTH_GATE = at(0, -27), ARCH = at(0, 22.5);
  const HALL = at(-3, -17), HALL_DEPTH = 7.4, HALL_DOOR = at(0, -9);
  const CAFE = at(8, -3), CAFE_DOOR = at(9, 0), TERRACE = { x0: 7, y0: 1, x1: 11, y1: 4 };
  const TABLES = [[7.4, 1.4], [9.4, 1.4], [11.4, 1.4], [7.4, 3.4], [9.4, 3.4], [11.4, 3.4]].map(o => at(o[0], o[1]));
  /* two colonnades of hubs, west and east, each fronting its own avenue */
  const WEST_AVE = -14, EAST_AVE = 14;
  const HUB_AT = [at(-20, -19), at(-20, -9), at(-20, 1), at(-20, 11), at(17, -19), at(17, -9), at(17, 1), at(17, 11)];
  /* what the next way of learning needs, and is not built yet: sites on the outer lanes */
  const SOON = [['Research Center', -28, -6], ['Planetarium', -28, 2], ['Climate Lab', -28, 10], ['Ocean Institute', -28, 18], ['Space Center', 25, -16], ['Medical Research', 25, -8], ['Energy Lab', 25, 0], ['Library of Everything', 25, 8]].map(x => [x[0], at(x[1], x[2])]);
  const OUTER_W = -24, OUTER_E = 23;
  const HUB_DOOR = HUB_AT.map(h => [h[0] + 1, h[1] + 3]);
  const LAKE = at(21, -27).concat([8, 7]); const JETTY = at(20, -23);
  /* the ranch corner: horses, cows, chickens, and the barn */
  const PADDOCK = at(-29, -26).concat([10, 6]); const BARN = at(-19.6, -26.2); const PASTURE = at(-29, -18).concat([10, 6]); const COOPS = [at(-29, -9), at(-26, -9), at(-23, -9)]; const RANCH_GATE = at(-24, -9);
  /* the back: a road behind headquarters from the Cloud side to the System Design side, and the two halls where people compete */
  const BACK = -22, HACK = at(-14, -26), GAMES = at(2, -26), HACK_DOOR = at(-11, -23), GAMES_DOOR = at(5, -23);
  /* the lodge: a row of cabins for learners staying a while */
  const LODGE = [16, 18.5, 21, 23.5, 26].map(x => at(x, 17)); const LODGE_LANE = 16;
  const BENCHES = [[-5, -4.1], [-2, -4.1], [2, -4.1], [5, -4.1], [-5, 6.2], [-2, 6.2], [2, 6.2], [5, 6.2], [-6.2, -1], [-6.2, 3], [6.2, -1], [6.2, 3], [-1.6, 10], [1.6, 10], [-1.6, 15], [1.6, 15]].map(o => at(o[0], o[1]));
  const SITTERS = ['#2f7fd6', null, null, null, null, STAFF_TEE, null, null, '#8f5fd1', null, null, null, null, null, '#e8552f', null];
  const PAIRS = [[at(-3, -1.5), '#3fa66b', '#f2b42a'], [at(3.5, 3.2), STAFF_TEE, '#2f7fd6'], [at(-2, 4.2), '#e8552f', '#8f5fd1'], [at(10.5, -0.5), STAFF_TEE, '#3fa66b']];
  const DINERS = [['#2f7fd6', '#e8552f'], null, ['#3fa66b', STAFF_TEE], ['#f2b42a', null], null, ['#8f5fd1', '#2f7fd6']];
  /* outside the fence: the entry road, the lot and the racks */
  const LOT = { x0: 3, y0: 25, x1: 13, y1: 31 }; const LOT_IN = at(2, 28);
  const SPACES = []; for (let i = 0; i < 8; i++) SPACES.push(at(4 + (i % 4) * 2.3, i < 4 ? 26 : 30));
  const RACK = at(-8, 26); const RACK_IN = at(-1, 26);
  const PLOTS = []; for (let i = 0; i < 16; i++) { const a = i / 16 * Math.PI * 2 + 0.2 + (S.hash(i, 3) - 0.5) * 0.25, r = 42 + (S.hash(i, 5) - 0.5) * 3; PLOTS.push([Math.round(C[0] + Math.cos(a) * r * 1.15), Math.round(C[1] + Math.sin(a) * r * 0.85)]); }
  const MINE = 3;
  const NEIGHBOURS = { 7: ['Kalpana’s Ridge', 4], 11: ['Adam’s Acres', 22], 14: ['The Cloud Barn', 9] };

  /* ---- paved paths on campus, four-connected so people can walk them ---- */
  const PAVED = new Set(), ASPHALT = new Set();
  const lay = (x, y) => PAVED.add(key(x, y));
  const line = (a, b, set) => { const put = set ? (x, y) => set.add(key(x, y)) : lay; let [x, y] = a; put(x, y); while (x !== b[0]) { x += x < b[0] ? 1 : -1; put(x, y); } while (y !== b[1]) { y += y < b[1] ? 1 : -1; put(x, y); } };
  for (let dx = QUAD.x0 - 1; dx <= QUAD.x1 + 1; dx++) { lay(C[0] + dx, C[1] + QUAD.y0 - 1); lay(C[0] + dx, C[1] + QUAD.y1 + 1); }
  for (let dy = QUAD.y0 - 1; dy <= QUAD.y1 + 1; dy++) { lay(C[0] + QUAD.x0 - 1, C[1] + dy); lay(C[0] + QUAD.x1 + 1, C[1] + dy); }
  line(at(0, QUAD.y0 - 1), at(0, QUAD.y1 + 1)); line(at(QUAD.x0 - 1, 1), at(QUAD.x1 + 1, 1));   /* the cross */
  line(at(0, QUAD.y0 - 1), HALL_DOOR);                                                              /* up to the hall */
  line(at(0, QUAD.y1 + 1), SOUTH_GATE); line(at(-1, QUAD.y1 + 1), at(-1, 21)); line(at(1, QUAD.y1 + 1), at(1, 21));   /* the main avenue, three wide */
  line(at(WEST_AVE, -22), at(WEST_AVE, 16)); line(at(EAST_AVE, -22), at(EAST_AVE, 16));            /* the two hub avenues */
  line(at(QUAD.x0 - 1, 1), at(WEST_AVE, 1)); line(at(QUAD.x1 + 1, 1), at(EAST_AVE, 1));           /* joined to the quad */
  line(at(-1, -5), at(WEST_AVE, -5)); line(at(1, -5), at(EAST_AVE, -5)); line(at(0, 7), at(WEST_AVE, 7)); line(at(0, 7), at(EAST_AVE, 7));
  for (let dy = TERRACE.y0; dy <= TERRACE.y1; dy++) for (let dx = TERRACE.x0; dx <= TERRACE.x1; dx++) lay(C[0] + dx, C[1] + dy); line(at(9, 1), CAFE_DOOR);
  HUB_DOOR.forEach((d, i) => line([i < 4 ? C[0] + WEST_AVE : C[0] + EAST_AVE, d[1]], d));
  line(at(WEST_AVE, BACK), at(EAST_AVE, BACK)); line(HACK_DOOR, at(-11, BACK)); line(GAMES_DOOR, at(5, BACK)); line(at(0, -9), NORTH_GATE);
  line(at(EAST_AVE, BACK), at(19, BACK)); line(at(19, BACK), JETTY);
  line(at(OUTER_W, -8), at(OUTER_W, 20)); line(at(WEST_AVE, -3), at(OUTER_W, -3)); line(at(WEST_AVE, 7), at(OUTER_W, 7)); line(at(OUTER_E, -18), at(OUTER_E, 12)); line(at(EAST_AVE, -3), at(OUTER_E, -3)); line(at(EAST_AVE, 7), at(OUTER_E, 7)); SOON.forEach(x => line([x[1][0] + 1, x[1][1] + 3], [x[1][0] + 1 < C[0] ? C[0] + OUTER_W : C[0] + OUTER_E, x[1][1] + 3]));
  line(at(OUTER_W, -8), RANCH_GATE); line(at(EAST_AVE, LODGE_LANE), at(27, LODGE_LANE)); LODGE.forEach(l => line([Math.round(l[0]), C[1] + LODGE_LANE], [Math.round(l[0]), l[1] + 1]));
  /* outside: the entry road and the lot are asphalt, the lane to the racks is paved */
  line(SOUTH_GATE, at(0, MAP - C[1] - 1), ASPHALT); line(at(-1, 23), at(-1, MAP - C[1] - 1), ASPHALT); line(at(1, 23), at(1, MAP - C[1] - 1), ASPHALT);
  for (let dy = LOT.y0; dy <= LOT.y1; dy++) for (let dx = LOT.x0; dx <= LOT.x1; dx++) ASPHALT.add(key(C[0] + dx, C[1] + dy)); line(LOT_IN, at(LOT.x0, 28), ASPHALT);
  line(at(-1, 26), at(-3, 26)); line(at(-3, 26), at(-8, 26)); line(at(2, 25), at(12, 25)); line(at(2, 25), at(2, 24));   /* footways from the racks and the lot to the gate */
  const paved = (gx, gy) => PAVED.has(key(gx, gy)), asphalt = (gx, gy) => ASPHALT.has(key(gx, gy));
  const lawn = (gx, gy) => { const dx = gx - C[0], dy = gy - C[1]; return dx >= QUAD.x0 && dx <= QUAD.x1 && dy >= QUAD.y0 && dy <= QUAD.y1 && !paved(gx, gy); };
  const inside = (gx, gy) => gx > C[0] + FENCE.x0 && gx < C[0] + FENCE.x1 && gy > C[1] + FENCE.y0 && gy < C[1] + FENCE.y1;

  /* ---- who is on the ring, and the dirt roads out to them ---- */
  function owners(state) { return PLOTS.map((p, i) => i === MINE ? { at: p, mine: true, name: S.landName(state), built: state.done.length } : state.mode === 'dev' && NEIGHBOURS[i] ? { at: p, name: NEIGHBOURS[i][0], built: NEIGHBOURS[i][1] } : { at: p, name: '', built: 0 }); }
  const WALK = new Set(PAVED); ASPHALT.forEach(k => WALK.add(k));

  /* ---- the staff and visitors: somewhere to be, a while there, on again ---- */
  const POIS = { hall: HALL_DOOR, cafe: CAFE_DOOR, jetty: JETTY, paddock: RANCH_GATE, gate: SOUTH_GATE, hack: HACK_DOOR, games: GAMES_DOOR, lodge: i => [Math.round(LODGE[i][0]), LODGE[i][1] + 1], hub: i => HUB_DOOR[i], bench: i => { const b = BENCHES[i]; let best = null, bd = 1e9; PAVED.forEach(k => { const t = k.split(',').map(Number); const d = Math.abs(t[0] + 0.5 - b[0] - 0.5) + Math.abs(t[1] + 0.5 - b[1] - 0.5); if (d < bd) { bd = d; best = t; } }); return best; }, space: i => SPACES[i].map(Math.round), rack: () => RACK_IN };
  const STAFF = [
    { name: 'Amber', plan: ['hall', 'bench0', 'hub1', 'cafe', 'bench5', 'hall'], says: 'Show them what you built. That is the whole idea.' },
    { name: 'Barista', plan: ['cafe', 'cafe', 'bench10', 'cafe'], says: 'Flat white. Or a project. Both take about ten minutes.' },
    { name: 'Guide', plan: ['gate', 'hub0', 'hub1', 'hub2', 'hub3', 'hack', 'games', 'hub4', 'hub5', 'hub6', 'hub7'], says: 'Every hub is a roadmap. Pick the one you keep thinking about.' },
    { name: 'Wrangler', plan: ['paddock', 'paddock', 'cafe', 'paddock'], says: 'They belong to no one. Like the free tier.' },
    { name: 'Docs', plan: ['bench2', 'bench2', 'bench2', 'cafe', 'bench7', 'bench7'], says: 'Write it down while it is fresh. Future you will read it.' },
    { name: 'Support', plan: ['hub4', 'hub5', 'bench9', 'hall', 'lodge1', 'hub6'], says: 'Stuck on a step? The chat is on every project page.' },
    { name: 'Jetty', plan: ['jetty', 'jetty', 'jetty', 'cafe', 'jetty'], says: 'Nothing to say. Nice out here though.' },
    { name: 'Dean', plan: ['hall', 'hall', 'gate', 'bench12', 'hall'], says: 'Austin. Where the work gets built. Welcome to campus.' }
  ];
  const poi = name => { const m = /^([a-z]+)(\d*)$/.exec(name); const p = POIS[m[1]]; return typeof p === 'function' ? p(+m[2]) : p; };
  const agents = STAFF.map((st, i) => ({ st, i, at: poi(st.plan[0]).map(v => v + 0.5), step: 0, path: null, dwell: 2 + i, colour: STAFF_TEE }));
  /* visitors: drive in, park, walk the campus, drive off; or ride in and rack the bike */
  const VISITORS = [{ colour: '#3fa66b', car: '#3b7dd8', space: 1, plan: ['space1', 'gate', 'hub2', 'cafe', 'bench13', 'space1'] }, { colour: '#8f5fd1', car: '#e8552f', space: 5, plan: ['space5', 'gate', 'hack', 'games', 'hall', 'space5'] }, { colour: '#f2b42a', bike: true, plan: ['rack', 'gate', 'hub6', 'lodge3', 'bench14', 'rack'] }, { colour: '#2f7fd6', lodger: true, plan: ['lodge0', 'cafe', 'hub1', 'games', 'lodge0'] }];
  const visitors = VISITORS.map((v, i) => ({ st: { name: v.lodger ? 'Lodger' : 'Visitor', plan: v.plan }, i: 20 + i, at: poi(v.plan[0]).map(x => x + 0.5), step: 0, path: null, dwell: 6 + i * 7, colour: v.colour, car: v.car, space: v.space, bike: v.bike, away: false }));
  const CAR_COLOURS = ['#3b7dd8', '#e8552f', '#f2b42a', '#3fa66b', '#9aa3b0', '#8f5fd1'];
  let lastNow = 0;
  function tick(now) {
    const dt = Math.min(0.1, lastNow ? (now - lastNow) / 1000 : 0); lastNow = now; if (reduce) return;
    const all = WALK;
    agents.concat(visitors).forEach(a => {
      if (a.path && a.path.length) { const w = a.path[0], dx = w[0] - a.at[0], dy = w[1] - a.at[1], d = Math.hypot(dx, dy), sp = (a.bike && a.step === 0 ? 3 : 1.5) * dt; if (d <= sp) { a.at = w.slice(); a.path.shift(); if (!a.path.length) a.dwell = 3 + S.hash(a.step, a.i) * 5; } else { a.at[0] += dx / d * sp; a.at[1] += dy / d * sp; } a.moving = true; return; }
      a.moving = false; a.dwell -= dt; if (a.dwell > 0) return;
      a.step = (a.step + 1) % a.st.plan.length; const to = poi(a.st.plan[a.step]); const from = [Math.floor(a.at[0]), Math.floor(a.at[1])];
      const r = S.route(all, from, to); if (r) { a.path = r.map(t => [t[0] + 0.5, t[1] + 0.5]); if (a.path.length && Math.hypot(a.path[0][0] - a.at[0], a.path[0][1] - a.at[1]) < 0.1) a.path.shift(); } else a.dwell = 2;
    });
  }

  function drawHQ(I, state, now, opts) {
    const ctx = I.ctx, os = owners(state); opts = opts || {}; tick(now);
    for (let gy = 0; gy < MAP; gy++) for (let gx = 0; gx < MAP; gx++) { if (!I.onScreen(gx, gy)) continue; if (asphalt(gx, gy)) { I.tile(gx, gy, '#6f737b', 'rgba(0,0,0,.15)'); continue; } if (paved(gx, gy)) { I.tile(gx, gy, (gx + gy) % 2 ? '#e3dccb' : '#d8d0bc', 'rgba(0,0,0,.06)'); continue; } if (lawn(gx, gy)) { I.tile(gx, gy, (gx + gy) % 2 ? '#7fc55a' : '#86cc60'); continue; } I.tile(gx, gy, ground(gx, gy)); }
    /* road markings: the centre line of the entry road, the bays in the lot */
    ctx.strokeStyle = 'rgba(255,255,255,.55)'; ctx.lineWidth = 1; ctx.setLineDash([5, 5]); ctx.beginPath(); const c0 = I.p(C[0] + 0.5, C[1] + 23), c1 = I.p(C[0] + 0.5, MAP - 1); ctx.moveTo(c0[0], c0[1]); ctx.lineTo(c1[0], c1[1]); ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i <= 4; i++) [26, 30].forEach(row => { const a = I.p(C[0] + 4 + i * 2.3 - 0.3, C[1] + row - 0.2), b = I.p(C[0] + 4 + i * 2.3 - 0.3, C[1] + row + 1.2); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); });
    const items = []; const add = (d, fn) => items.push({ d, fn }); const late = fn => items.push({ d: 9999, fn });
    /* the borders: a rail fence round the ranch, open at the two gates */
    const fx0 = C[0] + FENCE.x0, fy0 = C[1] + FENCE.y0, fx1 = C[0] + FENCE.x1, fy1 = C[1] + FENCE.y1;
    const seg = (a, b) => add(Math.min(a[0], b[0]) + Math.min(a[1], b[1]) - 0.5, () => I.fence(a[0], a[1], b[0], b[1], Math.round(Math.hypot(b[0] - a[0], b[1] - a[1]) * 1.5)));
    seg([fx0, fy0], [C[0] - 1.2, fy0]); seg([C[0] + 2.2, fy0], [fx1, fy0]); seg([fx0, fy1], [C[0] - 2.2, fy1]); seg([C[0] + 3.2, fy1], [fx1, fy1]); seg([fx0, fy0], [fx0, fy1]); seg([fx1, fy0], [fx1, fy1]);
    add(ARCH[0] + ARCH[1] + 1, () => B.arch(I, ARCH[0] + 0.5, ARCH[1] + 0.3, 'NextWork Headquarters'));
    /* outside the fence: parked cars, the racks, a sign, a car coming or going */
    SPACES.forEach((sp, i) => { const v = visitors.find(x => x.space === i); const parked = !v || (v.step === 0 || v.step === v.st.plan.length - 1) && !v.moving; if ((i === 2 || i === 6) && !v) return; if (parked) add(sp[0] + sp[1] + 0.5, () => I.car(sp[0], sp[1], v ? v.car : CAR_COLOURS[i % CAR_COLOURS.length])); });
    const loop = (now / 16000) % 1; const cy = loop < 0.5 ? lerp(MAP - 2, C[1] + 29, loop * 2) : lerp(C[1] + 29, MAP - 2, (loop - 0.5) * 2); add(C[0] + 1 + cy + 0.6, () => I.car(C[0] + (loop < 0.5 ? 1 : -1) + 0.05, cy, loop < 0.5 ? '#9aa3b0' : '#3fa66b'));
    add(RACK[0] + RACK[1] + 0.6, () => B.bikerack(I, RACK[0], RACK[1], 6)); add(C[0] + 2 + C[1] + 24.5, () => B.sign(I, C[0] + 2, C[1] + 23.6, 'PARKING', 'lot and racks'));
    [[2, 33], [-2, 33], [2, 38], [-2, 38], [2, 43], [-2, 43]].forEach(o => { const q = at(o[0], o[1]); add(q[0] + q[1] + 0.2, () => I.lamp(q[0] + 0.5, q[1] + 0.5)); });
    /* the grounds */
    add(LAKE[0] + LAKE[1] + 2, () => B.lake(I, LAKE[0], LAKE[1], LAKE[2], LAKE[3], now));
    add(PADDOCK[0] + PADDOCK[1] - 1, () => B.paddock(I, PADDOCK[0], PADDOCK[1], PADDOCK[2], PADDOCK[3]));
    add(PASTURE[0] + PASTURE[1] - 1, () => B.paddock(I, PASTURE[0], PASTURE[1], PASTURE[2], PASTURE[3]));
    add(BARN[0] + BARN[1] + 0.6, () => B.barn(I, BARN[0], BARN[1], 1, now, 2)); [[1, 4.5], [7.5, 1.2]].forEach(o => add(PADDOCK[0] + o[0] + PADDOCK[1] + o[1] + 0.5, () => B.hay(I, PADDOCK[0] + o[0], PADDOCK[1] + o[1])));
    [[1.5, 1.5], [6, 2.5], [3.5, 4], [8, 4.2]].forEach((o, i) => { const q = [PADDOCK[0] + o[0] + Math.sin(now / 9000 + i * 1.7) * 1.2, PADDOCK[1] + o[1] + Math.cos(now / 11000 + i) * 0.7]; add(q[0] + q[1] + 0.2, () => B.horse(I, q[0], q[1], ['#8a5a3a', '#3b2a1e', '#c9a06a', '#5a3a1e'][i], now / 1000 + i)); });
    [[2, 1.5], [6.5, 2], [4, 4], [8, 4.5]].forEach((o, i) => { const q = [PASTURE[0] + o[0] + Math.sin(now / 14000 + i * 2.1) * 0.8, PASTURE[1] + o[1] + Math.cos(now / 17000 + i) * 0.5]; add(q[0] + q[1] + 0.2, () => B.cow(I, q[0], q[1], now / 1000 + i)); });
    COOPS.forEach(c => add(c[0] + c[1] + 0.8, () => B.coop(I, c[0], c[1], now)));
    add(HACK[0] + 3 + HACK[1] + 3, () => B.hallwide(I, HACK[0], HACK[1], now, 'NextWork Hackathon', '#2f5f9f', '#dfe5ee'));
    add(GAMES[0] + 3 + GAMES[1] + 3, () => B.hallwide(I, GAMES[0], GAMES[1], now, 'NextWork Games', '#c9503c', '#4b5563'));
    LODGE.forEach((l, i) => add(l[0] + l[1] + 0.5, () => B.lodge(I, l[0], l[1], 1, now, i % 2)));
    add(HALL[0] + 3 + HALL[1] + HALL_DEPTH, () => B.hall(I, HALL[0], HALL[1], now, HALL_DEPTH));
    add(CAFE[0] + 1.5 + CAFE[1] + 1.6, () => B.cafe(I, CAFE[0], CAFE[1], now));
    TABLES.forEach((t, i) => add(t[0] + t[1] + 0.3, () => B.table(I, t[0], t[1], DINERS[i], now)));
    PAIRS.forEach(pr => add(pr[0][0] + pr[0][1] + 0.1, () => B.pair(I, pr[0][0], pr[0][1], pr[1], pr[2], now / 1000)));
    SOON.forEach(x => add(x[1][0] + x[1][1] + 3.4, () => B.site(I, x[1][0], x[1][1], now, x[0])));
    BENCHES.forEach((b, i) => add(b[0] + b[1] + 0.3, () => B.bench(I, b[0], b[1], SITTERS[i], now)));
    [[-2, -4.2], [2, -4.2], [-2, 6.3], [2, 6.3], [-2.2, 10], [2.2, 10], [-2.2, 15], [2.2, 15], [-2.2, 19], [2.2, 19], [-1.5, -7.5], [1.5, -7.5]].forEach(o => { const q = at(o[0], o[1]); add(q[0] + q[1] + 0.2, () => I.lamp(q[0] + 0.5, q[1] + 0.5)); });
    [[-4, -2], [4, -2], [-4, 4], [4, 4], [-9, -2], [-9, 4], [9, 5], [-4, 12], [4, 12], [-4, 17], [4, 17]].forEach(o => { const q = at(o[0], o[1]); add(q[0] + q[1] + 0.5, () => B.oak(I, q[0], q[1], 1.05)); });
    add(C[0] + C[1] + 1.4, () => B.fountain(I, C[0] - 0.5, C[1] + 0.5, 1, now));
    HUBS.forEach((h, i) => { const q = HUB_AT[i]; if (I.onScreen(q[0], q[1]) || I.onScreen(q[0] + 3, q[1] + 3)) add(q[0] + q[1] + 3.2, () => B.bighub(I, q[0], q[1], now, h)); });
    if (!opts.map) for (let gy = 0; gy < MAP; gy += 1) for (let gx = 0; gx < MAP; gx += 1) { const r = S.hash(gx * 7 + 1, gy * 3 + 2); if (r > 0.06 || !I.onScreen(gx, gy) || paved(gx, gy) || asphalt(gx, gy) || inside(gx, gy) || (Math.abs(gx - C[0]) < 16 && gy > C[1] + 22)) continue; if (os.some(o => Math.abs(o.at[0] - gx) < 3 && Math.abs(o.at[1] - gy) < 3)) continue; add(gx + gy + 0.5, () => B.oak(I, gx, gy, 0.8 + S.hash(gy, gx) * 0.5)); }
    os.forEach(o => { if (!I.onScreen(o.at[0], o.at[1])) return; add(o.at[0] + o.at[1] + 1.2, () => B.plot(I, o.at[0], o.at[1], o, now)); if (!opts.map) late(() => I.label(o.at[0] + 0.6, o.at[1] + 2.9, o.name || 'Open slot', o.built ? o.built + ' built' : o.mine ? 'start here' : 'pick it and build', o.mine ? 10 : 8)); });
    agents.forEach(a => add(a.at[0] + a.at[1] + 0.05, () => I.person(a.at[0], a.at[1], a.colour, a.moving && !reduce ? now / 1000 + a.i : 3 + a.i, false)));
    visitors.forEach(a => { const atCar = !a.bike && (a.step === 0 || a.step === a.st.plan.length - 1) && !a.moving; if (atCar) return; add(a.at[0] + a.at[1] + 0.05, () => a.bike && a.moving && a.step <= 1 ? B.bike(I, a.at[0], a.at[1], a.colour, now / 1000) : I.person(a.at[0], a.at[1], a.colour, a.moving && !reduce ? now / 1000 + a.i : 3 + a.i, false)); });
    late(() => { I.label(HALL[0] + 3, HALL[1] + HALL_DEPTH + 2.2, 'NextWork Headquarters', 'Austin, Texas', 12); I.label(CAFE[0] + 1.5, CAFE[1] + 2.5, 'NextWork Cafe', 'ask anything', 9); I.label(LAKE[0] + 4, LAKE[1] + 8.4, 'The lake', '', 8); I.label(PADDOCK[0] + 5, PADDOCK[1] + 7, 'The paddock', 'horses', 8); I.label(PASTURE[0] + 5, PASTURE[1] + 7, 'The pasture', 'cows', 8); I.label(COOPS[1][0] + 0.5, COOPS[1][1] + 2.6, 'The coops', 'chickens', 8); I.label(HACK[0] + 3, HACK[1] + 4.4, 'NextWork Hackathon', 'where people compete', 9); I.label(GAMES[0] + 3, GAMES[1] + 4.4, 'NextWork Games', 'where people compete', 9); I.label(LODGE[2][0] + 0.5, LODGE[2][1] + 2.7, 'NextWork Lodge', 'a place to stay', 9); I.label(C[0] + 8, C[1] + 32.6, 'Parking', '', 8); I.label(RACK[0] + 1.5, RACK[1] + 1.9, 'Bike racks', '', 8); I.label(C[0] + 0.5, C[1] + 45, 'The entry road', 'from town', 8); });
    items.sort((a, b) => a.d - b.d).forEach(it => it.fn());
    I.nightfall(I.night);
    return { owners: os, hubs: HUB_AT, staff: STAFF };
  }
  function hitHQ(state, g) {
    if (g[0] >= HALL[0] - 0.3 && g[0] <= HALL[0] + 6.3 && g[1] >= HALL[1] - 0.3 && g[1] <= HALL[1] + HALL_DEPTH + 0.5) return { kind: 'hall' };
    const si = SOON.findIndex(x => g[0] >= x[1][0] - 0.3 && g[0] <= x[1][0] + 3.3 && g[1] >= x[1][1] - 0.3 && g[1] <= x[1][1] + 3.5); if (si >= 0) return { kind: 'soon', name: SOON[si][0] };
    if (g[0] >= CAFE[0] - 0.5 && g[0] <= CAFE[0] + 4.5 && g[1] >= CAFE[1] - 0.5 && g[1] <= CAFE[1] + 6.5) return { kind: 'cafe' };
    const hi = HUB_AT.findIndex(h => g[0] >= h[0] - 0.5 && g[0] <= h[0] + 3.5 && g[1] >= h[1] - 0.5 && g[1] <= h[1] + 3.5); if (hi >= 0) return { kind: 'hub', hub: HUBS[hi] };
    const os = owners(state); const pi = os.findIndex(o => g[0] >= o.at[0] - 0.6 && g[0] <= o.at[0] + 1.8 && g[1] >= o.at[1] - 0.6 && g[1] <= o.at[1] + 1.8); if (pi >= 0) return { kind: 'plot', owner: os[pi], index: pi };
    if (g[0] >= LAKE[0] && g[0] <= LAKE[0] + LAKE[2] && g[1] >= LAKE[1] && g[1] <= LAKE[1] + LAKE[3]) return { kind: 'lake' };
    if (g[0] >= PADDOCK[0] && g[0] <= PADDOCK[0] + PADDOCK[2] && g[1] >= PADDOCK[1] && g[1] <= PADDOCK[1] + PADDOCK[3]) return { kind: 'paddock' };
    if (g[0] >= PASTURE[0] && g[0] <= PASTURE[0] + PASTURE[2] && g[1] >= PASTURE[1] && g[1] <= PASTURE[1] + PASTURE[3]) return { kind: 'pasture' };
    if (COOPS.some(c => Math.abs(g[0] - c[0] - 0.8) < 1.5 && Math.abs(g[1] - c[1] - 0.5) < 1.2)) return { kind: 'coops' };
    if (g[0] >= HACK[0] - 0.3 && g[0] <= HACK[0] + 6.3 && g[1] >= HACK[1] - 0.3 && g[1] <= HACK[1] + 3.3) return { kind: 'hack' };
    if (g[0] >= GAMES[0] - 0.3 && g[0] <= GAMES[0] + 6.3 && g[1] >= GAMES[1] - 0.3 && g[1] <= GAMES[1] + 3.3) return { kind: 'games' };
    if (LODGE.some(l => Math.abs(g[0] - l[0] - 0.5) < 1 && Math.abs(g[1] - l[1] - 0.5) < 1)) return { kind: 'lodge' };
    if (g[0] >= C[0] + LOT.x0 && g[0] <= C[0] + LOT.x1 + 1 && g[1] >= C[1] + LOT.y0 && g[1] <= C[1] + LOT.y1 + 1) return { kind: 'lot' };
    if (Math.abs(g[0] - RACK[0] - 1.5) < 2.5 && Math.abs(g[1] - RACK[1] - 0.5) < 1.5) return { kind: 'rack' };
    if (Math.abs(g[0] - ARCH[0] - 0.5) < 3 && Math.abs(g[1] - ARCH[1]) < 1.5) return { kind: 'arch' };
    const ai = agents.findIndex(a => Math.hypot(a.at[0] - g[0], a.at[1] - g[1]) < 1.2); if (ai >= 0) return { kind: 'staff', staff: STAFF[ai] };
    if (lawn(Math.floor(g[0]), Math.floor(g[1]))) return { kind: 'quad' };
    if (!inside(g[0], g[1])) return { kind: 'outside' };
    return { kind: 'grass' };
  }
  NW.HQ = { MAP, C, PLOTS, MINE, owners, drawHQ, hitHQ, HUB_AT, HALL, CAFE, FENCE, ARCH, LOT, HACK, LODGE, PADDOCK };
})();
