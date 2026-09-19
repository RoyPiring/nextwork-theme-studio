/* NextWorld · state: what you have built, and where it goes
 * Pure: no DOM, no storage. The host (demo page or extension pane) hands in
 * a saved object and gets back the same shape to save. Everything the map
 * draws is derived from here, so production and dev share one code path. */
'use strict';
(function () {
  const { SERIES, PROJECTS, xpFor, kindFor, SAMPLE_LISTS, SAMPLE_DONE, lerp, clamp } = NW;
  const SCHEMA = 1;
  const HOUSE_WORDS = [[0, 'Tent'], [1, 'Cabin'], [5, 'Homestead'], [15, 'Farmhouse'], [35, 'Ranch'], [60, 'Estate'], [90, 'Valley']];

  const AVATAR = { body: 'pineapple', shirt: '#2f7fd6', hat: 'none', skin: '#ffd6ad', hair: '#4a2e1a' };
  function fresh() { return { schema: SCHEMA, mode: 'prod', name: 'You', land: '', biome: '', done: [], lists: [], steps: {}, building: '', sites: {}, craft: {}, me: null, avatar: Object.assign({}, AVATAR), life: freshLife(), wallet: { sparks: 0, unlocked: [] } }; }
  function freshLife() { return { founded: Date.now(), lastDone: 0, at: 0, power: 1, citizens: 1, bonusCap: 0, crewAt: 0, steps: 0, week: { id: 0, projects: 0, steps: 0, met: false } }; }
  function normalise(saved) {
    const s = Object.assign(fresh(), saved && typeof saved === 'object' ? saved : {});
    if (!Array.isArray(s.done)) s.done = []; if (!Array.isArray(s.lists)) s.lists = []; if (!s.steps || typeof s.steps !== 'object') s.steps = {}; if (!s.sites || typeof s.sites !== 'object') s.sites = {}; if (!s.craft || typeof s.craft !== 'object') s.craft = {}; s.land = String(s.land || ''); const migrating = !s.life || typeof s.life !== 'object' || typeof s.life.citizens !== 'number'; s.life = Object.assign(freshLife(), s.life && typeof s.life === 'object' ? s.life : {}); ['founded', 'lastDone', 'at', 'power', 'citizens', 'bonusCap', 'crewAt', 'steps'].forEach(k => { if (typeof s.life[k] !== 'number' || !isFinite(s.life[k])) s.life[k] = freshLife()[k]; }); if (!s.life.week || typeof s.life.week !== 'object') s.life.week = freshLife().week; if (!s.wallet || typeof s.wallet !== 'object') s.wallet = { sparks: 0, unlocked: [] }; s.wallet.sparks = Math.max(0, s.wallet.sparks | 0); if (!Array.isArray(s.wallet.unlocked)) s.wallet.unlocked = []; delete s.readAt;
    if (migrating) { const n = score(s); s.life.citizens = Math.max(1, Math.floor(n / 2)); if (!s.wallet.sparks) s.wallet.sparks = n * 5; }   /* a world saved before the economy: the people and the sparks it had earned */ s.biome = ['forest', 'sandy', 'island', 'plains', 'mountains', 'snow', 'rain', 'zen', 'savanna'].includes(s.biome) ? s.biome : (s.biome === 'hill' ? 'plains' : s.biome === 'desert' ? 'sandy' : '');
    s.mode = s.mode === 'dev' ? 'dev' : 'prod'; s.schema = SCHEMA; s.avatar = Object.assign({}, AVATAR, s.avatar && typeof s.avatar === 'object' ? s.avatar : {});
    s.lists = s.lists.map(l => { const total = +l.total || 0; return { name: String(l.name || ''), total, done: Math.min(total, Math.max(0, +l.done || 0)), blurb: String(l.blurb || ''), kind: l.kind || kindFor(String(l.name || '')) }; });
    return s;
  }
  /* dev seeds: how the land looks at 0, 5, 50 and 90 projects */
  function seed(s, n, name) {
    s.done = PROJECTS.slice(0, Math.max(0, Math.min(90, n))).map(p => p.title);
    s.lists = n > 0 ? SAMPLE_LISTS.map(l => Object.assign({}, l, { done: 0 })) : [];   /* pegged out, not built: one at a time */ s.name = name || 'Sam'; s.land = n > 0 ? 'Pineapple Kingdom' : ''; s.steps = {}; s.building = ''; s.sites = {}; s.craft = {}; s.me = null; return s;
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
  function finish(s, title, now) { if (!s.done.includes(title)) { const lv0 = levelOf(s).level; s.done.push(title); event(s, 'project', now, lv0); } delete s.steps[title]; if (s.building === title) s.building = ''; return s; }
  /* a reading off a nextwork.ai page: which project, which steps are ticked. Steps only ever rise; a step ticked is an event */
  function applyProjectReading(s, r, now) { now = now || Date.now(); s.pulse = null; if (!r || !r.title || !(r.total | 0)) return s; const had = s.steps[r.title], was = had ? had.done | 0 : 0, done = Math.max(was, r.done | 0), total = Math.max(r.total | 0, had ? had.total | 0 : 0, done);
    if (s.done.includes(r.title)) return s; const rose = Math.max(0, done - was); for (let i = 0; i < rose; i++) event(s, 'step', now);
    if (total > 0 && done >= total) finish(s, r.title, now); else if (total > 0) s.steps[r.title] = { done, total };
    s.pulse = { title: r.title, steps: rose, done, total, finished: s.done.includes(r.title), at: now }; return s; }
  function applyPortfolioReading(s, r) { if (!r || !Array.isArray(r.lists)) return s; const old = s.lists; s.lists = r.lists.map(l => { const prev = old.find(x => x.name === l.name); return { name: l.name, total: l.count | 0, done: Math.min(l.count | 0, prev ? prev.done | 0 : 0), blurb: String(l.blurb || '').slice(0, 80), kind: kindFor(l.name) }; }); return s; }   /* pegged out for the crew to build, one a day while the power is up; the learner's name stays theirs to type */

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
    s.done.forEach((title, i) => { if (i >= plan.threshold && i < plan.threshold + infra.length) return; const sr = SERIES.find(x => x.projects.some(pr => pr[0] === title)); if (!sr) { const q = (s.sites[title] && lotOk(s.sites[title])) ? s.sites[title] : nextLot(); at(q); buildings.push({ custom: true, kind: 'home', title, part: 1, of: 1, xp: 60, tier: 1, order: i + 1, gx: q[0], gy: q[1] }); return; } const pr = sr.projects.find(x => x[0] === title); const pi = sr.projects.indexOf(pr); const q = (s.sites[title] && lotOk(s.sites[title])) ? s.sites[title] : nextLot(); at(q); buildings.push({ series: sr, kind: sr.kind, title, part: pi + 1, of: sr.projects.length, xp: xpFor(pr[1], sr.hard), tier: tierIn(s, sr), order: i + 1, gx: q[0], gy: q[1] }); });
    let ei = 0; s.lists.forEach(ll => { for (let k = 0; k < ll.total; k++) { const q = EAST_LOTS[ei++] || EAST_LOTS[EAST_LOTS.length - 1]; buildings.push({ list: ll, kind: ll.kind, title: ll.name, part: k + 1, of: ll.total, xp: 0, tier: k < ll.done ? 2 : 0, gx: q[0], gy: q[1] }); } });
    const nextBuild = k < plan.builds.length ? plan.builds[k] : null, next = nextBuild ? null : nextLot();
    const capacity = plan.capacity + (s.life.bonusCap | 0) + infra.reduce((a, b) => a + (b.kind === 'shelter' ? 6 : 3), 0) + buildings.reduce((a, b) => a + (b.tier === 0 ? 0 : clamp(Math.ceil((b.xp || 60) / 8), 8, 18)), 0);   /* room: the era's own, the contracts kept, and every home by what it took to build */
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
  /* the life of the place. Days pass fast: one every 40 seconds, a season in twenty minutes, so crops grow and trees fill in while you watch.
  /* ---- the economy: three things and three rules ----
   * POWER is a battery. A step ticked adds 8%; a project finished fills it. It holds for a day, then loses 10% a real day down to an
   * ember (10%): the lights, the mill, the fields and the fire follow it. Back after a week away, the first step lights it to 60%.
   * CITIZENS move in one per step while the power is at least half, up to the homes' room (eight to eighteen a home, by what it took
   * to build), and leave one a day once the place has stood idle five days. SPARKS are the currency: one a
   * step, ten a project, spent in the avatar shop, never lost. Everything comes from the page: a step ticked, a project finished. */
  const DAY_MS = 40000, REAL_DAY = 86400000, GRACE = 1, DECAY = 0.1, EMBER = 0.1, STEP_POWER = 0.08, SPARK = { step: 1, project: 10 };
  /* the clock: real time, unless dev has moved it */
  const now = s => Date.now() + ((s && s.mode === 'dev' && typeof s.clockOffset === 'number') ? s.clockOffset : 0);
  const dayMs = s => (s.mode === 'dev' && typeof s.dayMs === 'number' && s.dayMs > 0) ? s.dayMs : DAY_MS;
  const dayOf = (s, now) => Math.max(0, Math.floor((now - s.life.founded) / dayMs(s)));
  const hourOfDay = (now, s) => ((now / (s ? dayMs(s) : DAY_MS)) % 1) * 24;
  const idleDays = (s, now) => s.life.at ? (now - s.life.at) / REAL_DAY : 0;
  const power = (s, now) => { if (s.mode === 'dev' && typeof s.power === 'number') return s.power; if (!s.life.at || !s.life.lastDone) return 1; return clamp(s.life.power - Math.max(0, idleDays(s, now) - GRACE) * DECAY, EMBER, 1); };   /* the clock starts with the first project, not the first step */
  const citizens = (s, now) => Math.min(Math.max(1, layout(s).capacity), Math.max(1, (s.life.citizens | 0) - Math.floor(Math.max(0, idleDays(s, now) - 5))));
  const population = (s, now, capacity) => Math.min(Math.max(1, capacity), citizens(s, now));
  const weekId = now => Math.floor((now - 4 * REAL_DAY - new Date(now).getTimezoneOffset() * 60000) / (7 * REAL_DAY));   /* weeks start on a local Monday */
  /* this week's contract: the era's next piece of infrastructure, for one project or seven steps. Met: 25 sparks, five move in, and two more of room for good */
  const CONTRACT = { projects: 1, steps: 7, reward: 4, sparks: 25, citizens: 5 };
  function contract(s, now) { now = now || Date.now(); const id = weekId(now); if (s.life.week.id !== id) s.life.week = { id, projects: 0, steps: 0, met: false }; const w = s.life.week, L = layout(s); const met = w.met || w.projects >= CONTRACT.projects || w.steps >= CONTRACT.steps; const tz = new Date(now).getTimezoneOffset() * 60000; return { week: w, infra: L.nextBuild ? L.nextBuild.kind : null, projects: CONTRACT.projects, steps: CONTRACT.steps, met, reward: CONTRACT.reward, sparks: CONTRACT.sparks, citizens: CONTRACT.citizens, daysLeft: Math.max(1, Math.ceil(((id + 1) * 7 * REAL_DAY + 4 * REAL_DAY + tz - now) / REAL_DAY)) }; }
  /* one thing happened: a step ticked, or a project finished */
  function event(s, kind, now, lvBefore) { now = now || Date.now(); if (lvBefore == null) lvBefore = levelOf(s).level; const before = power(s, now), cap = layout(s).capacity; if (kind === 'project') s.life.lastDone = now;
    const after = clamp(Math.max(before + (kind === 'project' ? 1 : STEP_POWER), idleDays(s, now) >= 7 && kind === 'step' ? 0.6 : 0), 0, 1);   /* back after a week away: the first step lights most of it again */ const have = citizens(s, now); s.life.power = after; s.life.citizens = Math.min(Math.max(cap, 1), have + (after >= 0.5 ? 1 : 0)); s.life.at = now; if (kind === 'step') s.life.steps = (s.life.steps | 0) + 1;
    s.wallet.sparks += SPARK[kind] || 0; const c = contract(s, now); if (kind === 'project') c.week.projects++; else c.week.steps++; if (!c.week.met && (c.week.projects >= CONTRACT.projects || c.week.steps >= CONTRACT.steps)) { c.week.met = true; s.life.bonusCap += CONTRACT.reward; s.wallet.sparks += CONTRACT.sparks; s.life.citizens = Math.min(Math.max(cap + CONTRACT.reward, 1), s.life.citizens + CONTRACT.citizens); }
    const lvAfter = levelOf(s).level; if (lvAfter > lvBefore) { s.wallet.sparks += 10 * (lvAfter - lvBefore); s.life.bonusCap += lvAfter - lvBefore; s.levelled = lvAfter; }
    forget(); return s; }
  /* the crew: while the power holds, they raise one pegged list building a real day */
  function crew(s, now) { now = now || Date.now(); const built = []; if (!s.life.crewAt || !s.life.lastDone) { s.life.crewAt = now; return built; } const days = Math.floor((now - s.life.crewAt) / REAL_DAY); if (days <= 0) return built;
    for (let k = 1; k <= days; k++) { if (power(s, s.life.crewAt + k * REAL_DAY) < 0.5) continue; const l = nextListProject(s); if (!l) break; l.done++; built.push(l.name + ' ' + l.done + ' of ' + l.total); } s.life.crewAt += days * REAL_DAY; if (built.length) forget(); return built; }
  /* experience: five a step, the project's own worth when it stands; levels take a little more each time */
  const xp = s => xpOf(s) + (s.life.steps | 0) * 5;
  const levelFloor = n => 50 * n * (n + 1);   /* level 1 at 0, 2 at 100, 3 at 300, 4 at 600, 5 at 1000 */
  function levelOf(s) { const x = xp(s); let n = 0; while (levelFloor(n + 1) <= x) n++; const lo = levelFloor(n), hi = levelFloor(n + 1); return { level: n + 1, xp: x, into: x - lo, need: hi - lo, next: hi, at: (x - lo) / (hi - lo) }; }
  /* the shop: sparks for what you wear */
  const PRICES = { 'hat:cowboy': 50, 'hat:hard': 50, 'hat:beanie': 50, 'body:robot': 100, 'body:cat': 100, 'land:flowers': 60, 'land:flag': 80, 'land:sign': 100, 'land:fountain': 150, 'land:orchard': 200 };
  const LAND_GOODS = [['land:flowers', 'Flower beds', 'colour round the door'], ['land:flag', 'Your flag', 'on the home, in your shirt colour'], ['land:sign', 'A name plate', 'your land\u2019s name at the door'], ['land:fountain', 'A fountain', 'on the square, lit at night'], ['land:orchard', 'An orchard', 'six fruit trees behind the home']];
  const owns = (s, item) => !(item in PRICES) || s.wallet.unlocked.includes(item);
  function buy(s, item) { if (owns(s, item)) return true; const p = PRICES[item]; if (s.wallet.sparks < p) return false; s.wallet.sparks -= p; s.wallet.unlocked.push(item); return true; }
  const hourOf = s => (s.mode === 'dev' && typeof s.hour === 'number') ? s.hour : (() => { const d = new Date(); return d.getHours() + d.getMinutes() / 60; })();
  const nightOf = h => h >= 20 || h < 5 ? 1 : h >= 18 ? (h - 18) / 2 : h < 7 ? (7 - h) / 2 : 0;
  const landName = s => s.land || (s.name && s.name !== 'You' ? s.name + '’s land' : 'Your land');
  NW.State = { SCHEMA, AVATAR, landName, hourOf, now, DAY_MS, REAL_DAY, EMBER, dayMs, dayOf, hourOfDay, idleDays, power, citizens, population, contract, CONTRACT, event, crew, PRICES, LAND_GOODS, owns, buy, xp, levelOf, nightOf, route, nearestRoad, nearestLot, lotFree, forget, score, planOf, nextPlan, homeOf, inWater, LAND, HOME, EAST_LOTS, LANES, EAST_TRUNK, fresh, normalise, seed, doneIn, tierIn, xpOf, houseWord, nextHouseWord, nextProject, nextListProject, finish, applyProjectReading, applyPortfolioReading, layout, hash, noise, height, creekX, onBank };
})();
