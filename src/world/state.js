/* NextWorld · state: what you have built, and where it goes
 * Pure: no DOM, no storage. The host (demo page or extension pane) hands in
 * a saved object and gets back the same shape to save. Everything the map
 * draws is derived from here, so production and dev share one code path. */
'use strict';
(function () {
  const { SERIES, PROJECTS, xpFor, kindFor, SAMPLE_LISTS, SAMPLE_DONE, lerp } = NW;
  const SCHEMA = 1;
  const HOUSE_WORDS = [[0, 'Tent'], [1, 'Cabin'], [5, 'Homestead'], [15, 'Farmhouse'], [35, 'Ranch'], [60, 'Estate'], [90, 'Valley']];

  function fresh() { return { schema: SCHEMA, mode: 'prod', name: 'You', done: [], lists: [], steps: {}, building: '', me: null, readAt: 0 }; }
  function normalise(saved) {
    const s = Object.assign(fresh(), saved && typeof saved === 'object' ? saved : {});
    if (!Array.isArray(s.done)) s.done = []; if (!Array.isArray(s.lists)) s.lists = []; if (!s.steps || typeof s.steps !== 'object') s.steps = {};
    s.mode = s.mode === 'dev' ? 'dev' : 'prod'; s.schema = SCHEMA;
    s.lists = s.lists.map(l => ({ name: String(l.name || ''), total: +l.total || 0, done: +l.done || +l.total || 0, blurb: String(l.blurb || ''), kind: l.kind || kindFor(String(l.name || '')) }));
    return s;
  }
  /* dev seeds: how the land looks at 0, 5, 50 and 90 projects */
  function seed(s, n, name) {
    s.done = n >= 90 ? PROJECTS.map(p => p.title) : n >= 50 ? PROJECTS.slice(0, 50).map(p => p.title) : n >= 5 ? SAMPLE_DONE.slice(0, 14) : [];
    s.lists = n > 0 ? SAMPLE_LISTS.map(l => Object.assign({}, l)) : []; s.name = name || 'Roy'; s.steps = {}; s.building = ''; s.me = null; return s;
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
  function finish(s, title) { if (!s.done.includes(title)) s.done.push(title); delete s.steps[title]; if (s.building === title) s.building = ''; return s; }
  /* a reading off a nextwork.ai page: which project, which steps are ticked */
  function applyProjectReading(s, r) { if (!r || !r.title) return s; if (r.total > 0 && r.done >= r.total) finish(s, r.title); else s.steps[r.title] = { done: r.done | 0, total: r.total | 0 }; s.readAt = r.at || Date.now(); return s; }
  function applyPortfolioReading(s, r) { if (!r || !Array.isArray(r.lists)) return s; s.lists = r.lists.map(l => ({ name: l.name, total: l.count | 0, done: l.count | 0, blurb: l.blurb || '', kind: kindFor(l.name) })); if (r.name) s.name = r.name; s.readAt = r.at || Date.now(); return s; }

  /* ---- the land: where things stand ----
   * Sixty-four tiles. West of the creek, one spread per started series;
   * east of it, one spread per learn list. Spreads sit on a jittered grid so
   * nothing lines up; lots inside a spread come from a per-spread jitter too. */
  const LAND = 68, HOME = [15, 33];
  const hash = (x, y) => { let h = (Math.floor(x * 1000) * 374761393 + Math.floor(y * 1000) * 668265263) | 0; h = (h ^ (h >> 13)) * 1274126177; return ((h ^ (h >> 16)) >>> 0) / 4294967296; };
  function noise(x, y) { const x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0, u = fx * fx * (3 - 2 * fx), v = fy * fy * (3 - 2 * fy); return lerp(lerp(hash(x0, y0), hash(x0 + 1, y0), u), lerp(hash(x0, y0 + 1), hash(x0 + 1, y0 + 1), u), v); }
  const height = (gx, gy) => noise(gx / 9, gy / 9) * 0.65 + noise(gx / 3.5, gy / 3.5) * 0.35;
  const creekX = gy => 33 + Math.sin(gy / 7.5) * 3 + Math.sin(gy / 3.3 + 1) * 1.2;
  const inCreek = (gx, gy) => Math.abs(gx + 0.5 - creekX(gy + 0.5)) < 1.5;
  const onBank = (gx, gy) => !inCreek(gx, gy) && Math.abs(gx + 0.5 - creekX(gy + 0.5)) < 2.6;
  const CROSSINGS = [9, 21, 33, 45, 57];
  function slots(x0, cols, rows, sx, sy) { const out = []; for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) out.push([x0 + c * sx + (hash(c + 7, r + 3) - 0.5) * 2.4, 5 + r * sy + (hash(c + 1, r + 9) - 0.5) * 2.4]); return out; }
  const WEST = slots(4, 4, 7, 5.6, 8.4).filter(a => Math.abs(a[0] - HOME[0]) > 2.2 || Math.abs(a[1] - HOME[1]) > 4);
  const EAST = slots(45, 3, 8, 5.6, 7.5);
  function lot(anchor, i) { /* the i-th lot of a spread: a loose spiral, jittered by the spread */ const a = i * 2.4 + hash(anchor[0], anchor[1]) * 6.3, r = i === 0 ? 0 : 2.0 + Math.floor((i - 1) / 6) * 1.9 + hash(anchor[1] + i, anchor[0]) * 0.6; return [anchor[0] + Math.cos(a) * r, anchor[1] + Math.sin(a) * r * 0.8]; }
  function layout(s) {
    const started = SERIES.filter(sr => doneIn(s, sr) > 0), buildings = [], spreads = [];
    started.forEach((sr, i) => { const a = WEST[i]; const n = doneIn(s, sr); spreads.push({ id: sr.id, name: sr.name, at: a, n, of: sr.projects.length, whole: n === sr.projects.length, kind: sr.kind });
      sr.projects.forEach((pr, pi) => { if (!s.done.includes(pr[0])) return; const q = lot(a, pi), xp = xpFor(pr[1], sr.hard); buildings.push({ series: sr, kind: sr.kind, title: pr[0], part: pi + 1, of: sr.projects.length, xp, tier: tierIn(s, sr), gx: q[0], gy: q[1], spread: a }); }); });
    s.lists.forEach((ll, i) => { const a = EAST[i]; if (!a) return; spreads.push({ id: 'll' + i, name: ll.name, at: a, n: ll.done, of: ll.total, whole: ll.done >= ll.total, kind: ll.kind, list: ll });
      for (let k = 0; k < ll.total; k++) { const q = lot(a, k); buildings.push({ list: ll, kind: ll.kind, title: ll.name, part: k + 1, of: ll.total, xp: 0, tier: k < ll.done ? 2 : 0, gx: q[0], gy: q[1], spread: a }); } });
    return { buildings, spreads, paths: paths(spreads, buildings) };
  }
  /* desire lines: every new building is reached from the nearest worn tile,
   * so later walks merge into trunks and the land grows a root system */
  function paths(spreads, buildings) {
    const worn = new Set(), tiles = [[HOME[0], HOME[1] + 2]]; worn.add(tiles[0].join(','));
    const key = q => Math.floor(q[0]) + ',' + Math.floor(q[1]);
    const nearest = to => { let best = tiles[0], bd = 1e9; tiles.forEach(t => { const d = Math.hypot(t[0] - to[0], t[1] - to[1]); if (d < bd) { bd = d; best = t; } }); return best; };
    const walk = (from, to) => { const n = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) * 2) + 1; for (let i = 0; i <= n; i++) { const t = i / n, w = Math.sin(t * Math.PI) * (hash(from[0] + to[0], from[1] + to[1]) - 0.5) * 3; const q = [lerp(from[0], to[0], t) + w * (to[1] - from[1]) / (n / 2 + 1), lerp(from[1], to[1], t) - w * (to[0] - from[0]) / (n / 2 + 1)]; const k = key(q); if (!worn.has(k)) { worn.add(k); tiles.push([Math.floor(q[0]) + 0.5, Math.floor(q[1]) + 0.5]); } } };
    const targets = spreads.slice().sort((a, b) => Math.hypot(a.at[0] - HOME[0], a.at[1] - HOME[1]) - Math.hypot(b.at[0] - HOME[0], b.at[1] - HOME[1]));
    targets.forEach(sp => { if (sp.n === 0) return; const to = [sp.at[0] + 0.5, sp.at[1] + 1.5]; let from = nearest(to); const east = to[0] > creekX(to[1]), fromEast = from[0] > creekX(from[1]); if (east !== fromEast) { const gy = CROSSINGS.reduce((a, c) => Math.abs(c - to[1]) < Math.abs(a - to[1]) ? c : a, CROSSINGS[0]); const cx = creekX(gy + 0.5); walk(from, [cx - 3, gy + 0.5]); walk([cx - 3, gy + 0.5], [cx + 3, gy + 0.5]); from = [cx + 3, gy + 0.5]; if (!east) { from = nearest(to); } } walk(from, to); });
    buildings.forEach(b => { if (b.tier === 0) return; const to = [b.gx + 0.5, b.gy + 1.2]; walk(nearest(to), to); });
    return worn;
  }
  NW.State = { SCHEMA, LAND, HOME, WEST, EAST, CROSSINGS, fresh, normalise, seed, doneIn, tierIn, xpOf, houseWord, nextHouseWord, nextProject, finish, applyProjectReading, applyPortfolioReading, layout, lot, hash, noise, height, creekX, inCreek, onBank };
})();
