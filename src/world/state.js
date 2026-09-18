/* NextWorld · state: what you have built, and where it goes
 * Pure: no DOM, no storage. The host (demo page or extension pane) hands in
 * a saved object and gets back the same shape to save. Everything the map
 * draws is derived from here, so production and dev share one code path. */
'use strict';
(function () {
  const { SERIES, PROJECTS, xpFor, kindFor, SAMPLE_LISTS, SAMPLE_DONE, lerp } = NW;
  const SCHEMA = 1;
  const HOUSE_WORDS = [[0, 'Tent'], [1, 'Cabin'], [5, 'Homestead'], [15, 'Farmhouse'], [35, 'Ranch'], [60, 'Estate'], [90, 'Valley']];

  const AVATAR = { body: 'pineapple', shirt: '#2f7fd6', hat: 'none', skin: '#ffd6ad', hair: '#4a2e1a' };
  function fresh() { return { schema: SCHEMA, mode: 'prod', name: 'You', land: '', biome: 'hill', done: [], lists: [], steps: {}, building: '', sites: {}, craft: {}, me: null, avatar: Object.assign({}, AVATAR), readAt: 0 }; }
  function normalise(saved) {
    const s = Object.assign(fresh(), saved && typeof saved === 'object' ? saved : {});
    if (!Array.isArray(s.done)) s.done = []; if (!Array.isArray(s.lists)) s.lists = []; if (!s.steps || typeof s.steps !== 'object') s.steps = {}; if (!s.sites || typeof s.sites !== 'object') s.sites = {}; if (!s.craft || typeof s.craft !== 'object') s.craft = {}; s.land = String(s.land || ''); s.biome = ['hill', 'desert', 'forest', 'coast'].includes(s.biome) ? s.biome : 'hill';
    s.mode = s.mode === 'dev' ? 'dev' : 'prod'; s.schema = SCHEMA; s.avatar = Object.assign({}, AVATAR, s.avatar && typeof s.avatar === 'object' ? s.avatar : {});
    s.lists = s.lists.map(l => ({ name: String(l.name || ''), total: +l.total || 0, done: +l.done || +l.total || 0, blurb: String(l.blurb || ''), kind: l.kind || kindFor(String(l.name || '')) }));
    return s;
  }
  /* dev seeds: how the land looks at 0, 5, 50 and 90 projects */
  function seed(s, n, name) {
    s.done = PROJECTS.slice(0, Math.max(0, Math.min(90, n))).map(p => p.title);
    s.lists = n > 0 ? SAMPLE_LISTS.map(l => Object.assign({}, l, { done: 0 })) : [];   /* pegged out, not built: one at a time */ s.name = name || 'Roy'; s.land = n > 0 ? 'Pineapple Kingdom' : ''; s.steps = {}; s.building = ''; s.sites = {}; s.craft = {}; s.me = null; return s;
  }
  const doneSet = s => new Set(s.done);
  const doneIn = (s, sr) => sr.projects.filter(pr => s.done.includes(pr[0])).length;
  const tierIn = (s, sr) => { const d = doneIn(s, sr), n = sr.projects.length; return d >= n ? 3 : d >= Math.ceil(n / 2) ? 2 : 1; };
  const xpOf = s => { const d = doneSet(s); return PROJECTS.filter(p => d.has(p.title)).reduce((a, p) => a + p.xp, 0); };
  const houseWord = s => { let w = HOUSE_WORDS[0]; HOUSE_WORDS.forEach(x => { if (s.done.length >= x[0]) w = x; }); return w; };
  const nextHouseWord = s => HOUSE_WORDS.find(x => x[0] > s.done.length);
  function nextProject(s) {
    if (s.building && !s.done.includes(s.building)) { const sr = SERIES.find(x => x.projects.some(pr => pr[0] === s.building)); if (sr) { const pr = sr.projects.find(x => x[0] === s.building); return { title: pr[0], series: sr, xp: xpFor(pr[1], sr.hard) }; } }
    const started = SERIES.filter(sr => doneIn(s, sr) > 0 && doneIn(s, sr) < sr.projects.length);
    for (const sr of started) { const pr = sr.projects.find(x => !s.done.includes(x[0])); if (pr) return { title: pr[0], series: sr, xp: xpFor(pr[1], sr.hard) }; }
    for (const sr of SERIES) { const pr = sr.projects.find(x => !s.done.includes(x[0])); if (pr) return { title: pr[0], series: sr, xp: xpFor(pr[1], sr.hard) }; }
    return null;
  }
  /* after the ninety: the lists, one project at a time */
  function nextListProject(s) { return s.lists.find(l => l.done < l.total) || null; }
  function finish(s, title) { if (!s.done.includes(title)) s.done.push(title); delete s.steps[title]; if (s.building === title) s.building = ''; return s; }
  /* a reading off a nextwork.ai page: which project, which steps are ticked */
  function applyProjectReading(s, r) { if (!r || !r.title) return s; if (r.total > 0 && r.done >= r.total) finish(s, r.title); else s.steps[r.title] = { done: r.done | 0, total: r.total | 0 }; s.readAt = r.at || Date.now(); return s; }
  function applyPortfolioReading(s, r) { if (!r || !Array.isArray(r.lists)) return s; s.lists = r.lists.map(l => ({ name: l.name, total: l.count | 0, done: l.count | 0, blurb: l.blurb || '', kind: kindFor(l.name) })); if (r.name) s.name = r.name; s.readAt = r.at || Date.now(); return s; }

  /* ---- the land: rows ----
   * One project at a time, and the land fills in one lot at a time. A
   * trunk road runs north-south through the ranch house; lanes branch off
   * it every four rows; lots line each lane on both sides. Lot n is the
   * n-th nearest the house, so the first cabin is on the porch's doorstep
   * and the ninetieth is out by the fence. You can move any building to
   * any empty lot. Learn lists get the same rows east of the creek. */
  const LAND = 68, HOME = [15, 33];
  const hash = (x, y) => { let h = (Math.floor(x * 1000) * 374761393 + Math.floor(y * 1000) * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
  function noise(x, y) { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return lerp(lerp(hash(x0, y0), hash(x0 + 1, y0), u), lerp(hash(x0, y0 + 1), hash(x0 + 1, y0 + 1), u), v); }
  const height = (gx, gy) => noise(gx / 9, gy / 9) * 0.65 + noise(gx / 3.5, gy / 3.5) * 0.35;
  const creekX = gy => 33 + Math.sin(gy / 7.5) * 2.2 + Math.sin(gy / 3.3 + 1) * 0.9;
  const inCreek = (gx, gy) => Math.abs(gx + 0.5 - creekX(gy + 0.5)) < 1.5;
  const onBank = (gx, gy) => !inCreek(gx, gy) && Math.abs(gx + 0.5 - creekX(gy + 0.5)) < 2.6;
  const CROSSINGS = [35];
  const EAST_TRUNK = 48, CONNECT = 35;
  const LANES = []; for (let k = 0; k < 7; k++) { LANES.push(HOME[1] - 5 - k * 4); LANES.push(HOME[1] + 6 + k * 4); }
  /* the civic district: south of the house, both sides of the trunk; and its twin across the creek */
  const CIVIC = (x, y, side) => side === 'west' ? (x >= 4 && x <= 25 && y >= HOME[1] + 1 && y <= HOME[1] + 24) : (x >= 44 && x <= 56 && y >= 35 && y <= 44);
  function lotsOf(side) { /* every lot on one side of the creek, nearest the house first */ const out = []; const x0 = side === 'west' ? 3 : 38, x1 = side === 'west' ? 27 : 64, trunk = side === 'west' ? HOME[0] : EAST_TRUNK; LANES.forEach(lane => { for (let x = x0; x <= x1; x += 3) { if (Math.abs(x - trunk) < 2) continue; if (!CIVIC(x, lane - 2, side)) out.push([x, lane - 2]); if (!CIVIC(x, lane + 1, side)) out.push([x, lane + 1]); } }); const home = side === 'west' ? HOME : [EAST_TRUNK, CONNECT]; out.sort((a, b) => (Math.abs(a[0] - home[0]) * 0.8 + Math.abs(a[1] - home[1])) - (Math.abs(b[0] - home[0]) * 0.8 + Math.abs(b[1] - home[1]))); return out; }
  const WEST_LOTS = lotsOf('west'), EAST_LOTS = lotsOf('east');
  const laneOf = q => LANES.find(l => q[1] === l - 2 || q[1] === l + 1);
  const key = (x, y) => x + ',' + y;
  function layout(s) {
    const buildings = [], taken = new Set(); const at = q => taken.add(key(q[0], q[1]));
    Object.keys(s.sites).forEach(t => at(s.sites[t]));
    let wi = 0; const nextWest = () => { while (wi < WEST_LOTS.length && taken.has(key(WEST_LOTS[wi][0], WEST_LOTS[wi][1]))) wi++; return WEST_LOTS[wi++] || WEST_LOTS[WEST_LOTS.length - 1]; };
    s.done.forEach((title, i) => { const sr = SERIES.find(x => x.projects.some(pr => pr[0] === title)); if (!sr) return; const pr = sr.projects.find(x => x[0] === title); const pi = sr.projects.indexOf(pr); const q = s.sites[title] || nextWest(); at(q); buildings.push({ series: sr, kind: sr.kind, title, part: pi + 1, of: sr.projects.length, xp: xpFor(pr[1], sr.hard), tier: tierIn(s, sr), order: i + 1, gx: q[0], gy: q[1] }); });
    let ei = 0; s.lists.forEach(ll => { for (let k = 0; k < ll.total; k++) { const q = EAST_LOTS[ei++] || EAST_LOTS[EAST_LOTS.length - 1]; buildings.push({ list: ll, kind: ll.kind, title: ll.name, part: k + 1, of: ll.total, xp: 0, tier: k < ll.done ? 2 : 0, gx: q[0], gy: q[1] }); } });
    const next = nextWest();
    return { buildings, next, paths: roads(buildings, s), lanes: LANES, west: WEST_LOTS, east: EAST_LOTS };
  }
  /* the roads: the trunk, the connector over the creek, and every lane that has a lot in use (or the next lot) */
  function roads(buildings, s) {
    const set = new Set(); const lay = (x, y) => set.add(key(x, y));
    const line = (a, b) => { let [x, y] = a; lay(x, y); while (x !== b[0]) { x += x < b[0] ? 1 : -1; lay(x, y); } while (y !== b[1]) { y += y < b[1] ? 1 : -1; lay(x, y); } };
    line([HOME[0], LAND - 1], [HOME[0], 2]);
    const used = new Set(); buildings.forEach(b => { if (b.gx > creekX(b.gy)) used.add('e' + laneOf([b.gx, b.gy])); else used.add('w' + laneOf([b.gx, b.gy])); });
    const nx = WEST_LOTS.find(q => !buildings.some(b => b.gx === q[0] && b.gy === q[1])); if (nx) used.add('w' + laneOf(nx));
    LANES.forEach(l => { if (used.has('w' + l)) line([3, l], [27, l]); if (used.has('e' + l)) line([38, l], [64, l]); });
    if (s.lists.length) { line([HOME[0], CONNECT], [EAST_TRUNK, CONNECT]); line([EAST_TRUNK, LAND - 3], [EAST_TRUNK, 2]); }
    return set;
  }
  const lotFree = (s, q) => !Object.keys(s.sites).some(t => s.sites[t][0] === q[0] && s.sites[t][1] === q[1]) && !layout(s).buildings.some(b => b.gx === q[0] && b.gy === q[1]);
  const nearestLot = (s, g) => { let best = null, bd = 1e9; WEST_LOTS.forEach(q => { const d = Math.hypot(q[0] + 0.5 - g[0], q[1] + 0.5 - g[1]); if (d < bd && lotFree(s, q)) { bd = d; best = q; } }); return bd < 3 ? best : null; };
  /* the way from one tile to another along the roads, or null */
  function route(set, from, to) {
    const start = key(from[0], from[1]), goal = key(to[0], to[1]); if (!set.has(start) || !set.has(goal)) return null;
    const prev = new Map([[start, null]]); const q = [from]; let qi = 0;
    while (qi < q.length) { const c = q[qi++]; if (key(c[0], c[1]) === goal) break; [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(d => { const n = [c[0] + d[0], c[1] + d[1]], k = key(n[0], n[1]); if (set.has(k) && !prev.has(k)) { prev.set(k, c); q.push(n); } }); }
    if (!prev.has(goal)) return null; const out = []; let c = to; while (c) { out.unshift(c); c = prev.get(key(c[0], c[1])); } return out;
  }
  function nearestRoad(set, q) { let best = null, bd = 1e9; set.forEach(k => { const t = k.split(',').map(Number); const d = Math.hypot(t[0] + 0.5 - q[0], t[1] + 0.5 - q[1]); if (d < bd) { bd = d; best = t; } }); return best; }
  /* the hour: yours, unless dev has set one */
  const hourOf = s => (s.mode === 'dev' && typeof s.hour === 'number') ? s.hour : (() => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; })();
  const nightOf = h => h >= 20 || h < 5 ? 1 : h >= 18 ? (h - 18) / 2 : h < 7 ? (7 - h) / 2 : 0;
  const landName = s => s.land || (s.name && s.name !== 'You' ? s.name + '’s land' : 'Your land');
  NW.State = { SCHEMA, AVATAR, landName, hourOf, nightOf, route, nearestRoad, nearestLot, lotFree, LAND, HOME, WEST_LOTS, EAST_LOTS, LANES, CROSSINGS, fresh, normalise, seed, doneIn, tierIn, xpOf, houseWord, nextHouseWord, nextProject, nextListProject, finish, applyProjectReading, applyPortfolioReading, layout, hash, noise, height, creekX, inCreek, onBank };
})();
