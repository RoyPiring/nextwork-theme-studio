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
  function fresh() { return { schema: SCHEMA, mode: 'prod', name: 'You', land: '', biome: '', done: [], lists: [], steps: {}, building: '', sites: {}, craft: {}, me: null, avatar: Object.assign({}, AVATAR), readAt: 0 }; }
  function normalise(saved) {
    const s = Object.assign(fresh(), saved && typeof saved === 'object' ? saved : {});
    if (!Array.isArray(s.done)) s.done = []; if (!Array.isArray(s.lists)) s.lists = []; if (!s.steps || typeof s.steps !== 'object') s.steps = {}; if (!s.sites || typeof s.sites !== 'object') s.sites = {}; if (!s.craft || typeof s.craft !== 'object') s.craft = {}; s.land = String(s.land || ''); s.biome = ['forest', 'sandy', 'island', 'plains', 'mountains', 'snow', 'rain', 'zen', 'savanna'].includes(s.biome) ? s.biome : (s.biome === 'hill' ? 'plains' : s.biome === 'desert' ? 'sandy' : '');
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

  /* ---- the land: a plan per era ----
   * The plan for the era you are in (src/world/plans.js) lays the roads,
   * the water, the civic buildings and the lot rows on the west bank. Your
   * projects settle into its lots in the order they were built, so when the
   * era changes the whole place re-lays itself and everything moves into
   * the new plan. Learn lists take rows on the east bank, over the bridge. */
  const LAND = 68;
  const hash = (x, y) => { let h = (Math.imul(Math.floor(x * 1000), 374761393) + Math.imul(Math.floor(y * 1000), 668265263)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return (h >>> 0) / 4294967296; };   /* uniform on [0, 1): the old one never passed 0.5, so no height ever reached a peak */
  function noise(x, y) { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return lerp(lerp(hash(x0, y0), hash(x0 + 1, y0), u), lerp(hash(x0, y0 + 1), hash(x0 + 1, y0 + 1), u), v); }
  const height = (gx, gy) => noise(gx / 9, gy / 9) * 0.65 + noise(gx / 3.5, gy / 3.5) * 0.35;
  const score = s => s.done.length + s.lists.reduce((a, l) => a + (l.done | 0), 0);
  const planOf = s => { const n = score(s); let p = NW.PLANS[0]; NW.PLANS.forEach(x => { if (n >= x.threshold) p = x; }); return p; };
  const nextPlan = s => NW.PLANS.find(x => x.threshold > score(s)) || null;
  const homeOf = s => planOf(s).home;
  const HOME = [30, 31];   /* the founding ground; every plan keeps the home here */
  /* the water: a creek that meanders until it is channelled, then a straight two-tile river */
  const creekX = (gy, plan) => { const w = plan ? plan.water : NW.PLANS[0].water; return w.channelled ? w.creekX + (w.width - 1) / 2 : w.creekX + Math.sin(gy / 7.5) * 1.6 + Math.sin(gy / 3.3 + 1) * 0.7; };
  const inWater = (gx, gy, plan) => { const w = plan.water; if (w.lake && gx >= w.lake.rect[0] && gx < w.lake.rect[0] + w.lake.rect[2] && gy >= w.lake.rect[1] && gy < w.lake.rect[1] + w.lake.rect[3]) return true; return Math.abs(gx + 0.5 - creekX(gy + 0.5, plan)) < w.width / 2 + 0.55; };
  const onBank = (gx, gy, plan) => !inWater(gx, gy, plan) && Math.abs(gx + 0.5 - creekX(gy + 0.5, plan)) < plan.water.width / 2 + 1.6;
  const EAST_TRUNK = 58, CONNECT = 33;
  const LANES = []; for (let k = 0; k < 8; k++) { LANES.push(21 + k * 4 + (k >= 3 ? 4 : 0)); }   /* 21 25 29 37 41 45 49 53: the east city sits in the gap */
  const EAST_LOTS = (() => { const out = []; LANES.forEach(l => { for (let x = 49; x <= 66; x += 3) { if (Math.abs(x - EAST_TRUNK) < 2) continue; if (x <= 57 && l - 2 >= 28 && l + 1 <= 40) continue; out.push([x, l - 2]); out.push([x, l + 1]); } }); out.sort((a, b) => (Math.abs(a[0] - EAST_TRUNK) * 0.8 + Math.abs(a[1] - CONNECT)) - (Math.abs(b[0] - EAST_TRUNK) * 0.8 + Math.abs(b[1] - CONNECT))); return out; })();
  const key = (x, y) => x + ',' + y;
  /* the layout is asked for many times a frame; it only changes when something is built, moved or read */
  let memoKey = '', memoVal = null;
  const layoutKey = s => planOf(s).id + '|' + s.done.length + '|' + (s.done[s.done.length - 1] || '') + '|' + s.lists.map(l => l.total + ':' + l.done).join(',') + '|' + Object.keys(s.sites).map(t => t + '@' + s.sites[t]).join(';') + '|' + s.biome;
  function layout(s) { const k = layoutKey(s); if (k === memoKey && memoVal) return memoVal; memoVal = layoutRaw(s); memoKey = k; return memoVal; }
  function layoutRaw(s) {
    const plan = planOf(s), buildings = [], taken = new Set(); const at = q => taken.add(key(q[0], q[1]));
    const lotOk = q => plan.lotList.some(l => l[0] === q[0] && l[1] === q[1]);
    Object.keys(s.sites).forEach(t => { if (lotOk(s.sites[t])) at(s.sites[t]); });
    let wi = 0; const nextLot = () => { while (wi < plan.lotList.length && taken.has(key(plan.lotList[wi][0], plan.lotList[wi][1]))) wi++; return plan.lotList[wi++] || plan.lotList[plan.lotList.length - 1]; };
    /* the era's first projects build its infrastructure, in order; every other finished project is a home, rebuilt in the era's material, so the place is never empty on the day it levels up */
    const k = Math.max(0, score(s) - plan.threshold), infra = plan.builds.slice(0, k).map((b, i) => Object.assign({ title: s.done[plan.threshold + i] || s.done[s.done.length - 1] || b.kind }, b));   /* list projects count toward the era and its builds too */
    s.done.forEach((title, i) => { if (i >= plan.threshold && i < plan.threshold + infra.length) return; const sr = SERIES.find(x => x.projects.some(pr => pr[0] === title)); if (!sr) return; const pr = sr.projects.find(x => x[0] === title); const pi = sr.projects.indexOf(pr); const q = (s.sites[title] && lotOk(s.sites[title])) ? s.sites[title] : nextLot(); at(q); buildings.push({ series: sr, kind: sr.kind, title, part: pi + 1, of: sr.projects.length, xp: xpFor(pr[1], sr.hard), tier: tierIn(s, sr), order: i + 1, gx: q[0], gy: q[1] }); });
    let ei = 0; s.lists.forEach(ll => { for (let k = 0; k < ll.total; k++) { const q = EAST_LOTS[ei++] || EAST_LOTS[EAST_LOTS.length - 1]; buildings.push({ list: ll, kind: ll.kind, title: ll.name, part: k + 1, of: ll.total, xp: 0, tier: k < ll.done ? 2 : 0, gx: q[0], gy: q[1] }); } });
    const nextBuild = k < plan.builds.length ? plan.builds[k] : null, next = nextBuild ? null : nextLot();
    const homes = buildings.filter(b => b.series).length, capacity = plan.capacity * (homes + 1);
    return { plan, buildings, infra, nextBuild, next, capacity, paths: roads(plan, buildings, s), west: plan.lotList, east: EAST_LOTS };
  }
  /* the roads: the plan's, plus the east bank's when there are lists (and a way over the water to reach it) */
  function roads(plan, buildings, s) {
    const set = new Set(plan.roadSet); const lay = (x, y) => set.add(key(x, y));
    const line = (a, b) => { let [x, y] = a; lay(x, y); while (x !== b[0]) { x += x < b[0] ? 1 : -1; lay(x, y); } while (y !== b[1]) { y += y < b[1] ? 1 : -1; lay(x, y); } };
    if (s.lists.length) {
      if (!plan.water.bridges.length) { const end = plan.roads[0].to; line(end, [EAST_TRUNK, CONNECT]); }   /* a plank bridge and a track, until the city builds a proper one */
      else line([57, CONNECT], [EAST_TRUNK, CONNECT]);
      line([EAST_TRUNK, 4], [EAST_TRUNK, 64]);
      const used = new Set(); buildings.forEach(b => { if (b.list) used.add(LANES.find(l => b.gy === l - 2 || b.gy === l + 1)); });
      LANES.forEach(l => { if (used.has(l)) line([49, l], [66, l]); });
    }
    return set;
  }
  const lotFree = (s, q) => !Object.keys(s.sites).some(t => s.sites[t][0] === q[0] && s.sites[t][1] === q[1]) && !layout(s).buildings.some(b => b.gx === q[0] && b.gy === q[1]);
  const forget = () => { memoKey = ''; memoVal = null; };
  const nearestLot = (s, g) => { let best = null, bd = 1e9; planOf(s).lotList.forEach(q => { const d = Math.hypot(q[0] + 0.5 - g[0], q[1] + 0.5 - g[1]); if (d < bd && lotFree(s, q)) { bd = d; best = q; } }); return bd < 3 ? best : null; };
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
  NW.State = { SCHEMA, AVATAR, landName, hourOf, nightOf, route, nearestRoad, nearestLot, lotFree, forget, score, planOf, nextPlan, homeOf, inWater, LAND, HOME, EAST_LOTS, LANES, EAST_TRUNK, fresh, normalise, seed, doneIn, tierIn, xpOf, houseWord, nextHouseWord, nextProject, nextListProject, finish, applyProjectReading, applyPortfolioReading, layout, hash, noise, height, creekX, onBank };
})();
