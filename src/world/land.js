/* NextWorld · land: your world, drawn
 * The plan for your era, on the terrain you chose, with every project
 * built in the era's material and the people your work has drawn in.
 * Five terrains, five different maps: the plains have the one river;
 * the forest a wooded belt and a pond; the desert dunes, flat-topped
 * mesas and a dry wash; the island a plateau stepping down to the sea;
 * the mountains rock terraces climbing to snow. The ground and its
 * elevation are classified once per plan and terrain into byte grids;
 * the trees and rocks are placed once; only what moves is worked out
 * each frame. */
'use strict';
(function () {
  const { B, clamp, lerp, rgb, ease, reduce } = NW;
  const S = NW.State, { LAND, HOME } = S, Homes = NW.Homes;
  NW.power = 1;   /* what the last project pays for; the fire and the mill read it */

  /* ---- terrain ---- */
  const TERRAINS = {
    forest: { name: 'Forest', grass: ['#5f8a4b', '#4e7440'], stone: '#8a8f86', water: '#3f7d9c', sand: '#c9b98a', tree: 'pine', edge: 'dense', corridor: 'wood', relief: 'none', blurb: 'Deep pines, a wooded belt down the east side and a still pond. No river.' },
    sandy: { name: 'Sandy', grass: ['#d9c290', '#c8ad76'], stone: '#b58e5c', water: '#3aa5a0', sand: '#eedaa8', tree: 'cactus', edge: 'mesa', corridor: 'wash', relief: 'mesa', blurb: 'Dunes, flat-topped mesas, cactus, and a dry wash where a river once ran.' },
    island: { name: 'Ocean Island', grass: ['#6aa35a', '#579248'], stone: '#7d8a8c', water: '#2f8fb8', sand: '#f0e2b6', tree: 'palm', edge: 'ocean', corridor: 'spine', relief: 'shore', blurb: 'A plateau stepping down in terraces to beaches and open sea, a green spine down the east.' },
    plains: { name: 'Plains', grass: ['#8fb35c', '#7da34e'], stone: '#9a9a90', water: '#4b8fb0', sand: '#d3c49a', tree: 'oak', edge: 'open', corridor: 'river', relief: 'none', blurb: 'Open grass, oaks, and the one river: it meanders until the city channels it.' },
    mountains: { name: 'Rocky Mountains', grass: ['#6f8f5a', '#5b7a4a'], stone: '#8c8a85', water: '#3b7fa8', sand: '#b8b09a', tree: 'pine', edge: 'peaks', corridor: 'scree', relief: 'peaks', blurb: 'Rock terraces climbing to snow, a scree slope where the river would be.' },
    snow: { name: 'Snowfield', grass: ['#eef3f7', '#dde6ee'], stone: '#9aa3ad', water: '#5b9ec4', sand: '#d7dde3', tree: 'snowpine', edge: 'peaks', corridor: 'drift', relief: 'peaks', weather: 'snow', sky: ['#c7d6e6', '#eef3f8'], blurb: 'Snow to every edge, white terraces, a long drift down the east, and it keeps falling.' },
    rain: { name: 'Rainy Moor', grass: ['#5f7f52', '#4f6e46'], stone: '#6f7a72', water: '#4a7f92', sand: '#8f8a70', tree: 'willow', edge: 'open', corridor: 'bog', relief: 'none', weather: 'rain', sky: ['#7f8c99', '#b9c3cc'], blurb: 'Wet dark grass, willows, a bog of puddles and reeds, and rain that does not stop.' },
    zen: { name: 'Zen Garden', grass: ['#b9c4a0', '#a9b592'], stone: '#8f8f88', water: '#4f8fa8', sand: '#e6e0cc', tree: 'cherry', edge: 'gravel', corridor: 'kare', relief: 'none', blurb: 'Moss, cherry trees, stone lanterns, a ring of raked gravel and a dry stream of stones.' },
    savanna: { name: 'Savanna', grass: ['#c9b45a', '#b89e48'], stone: '#8a7a5a', water: '#5a95a8', sand: '#d9c48a', tree: 'acacia', edge: 'open', corridor: 'kopje', relief: 'none', blurb: 'Gold grass, flat-topped acacias, and a line of rocky kopjes where the river would be.' }
  };
  const TERRAIN_KEYS = ['plains', 'forest', 'sandy', 'island', 'mountains', 'snow', 'rain', 'zen', 'savanna'];
  TERRAINS.hill = TERRAINS.plains; TERRAINS.desert = TERRAINS.sandy;
  const terrainOf = s => TERRAINS[s.biome] || TERRAINS.plains;
  let T = TERRAINS.plains;
  /* the ground as [r,g,b], so it can be darkened without going through a hex string */
  const groundRGB = (gx, gy) => { const h = S.height(gx, gy); if (h > 0.8 && T.relief === 'peaks') { const st = NW.hex(T.stone); return (gx + gy) % 2 ? st : st.map(v => Math.round(v * 0.94)); } const dry = clamp((h - 0.25) * 2.2, 0, 1); const a = NW.hex(T.grass[0]), b = NW.hex(T.grass[1]); const c = a.map((v, i) => Math.round(lerp(v, b[i], dry))); if (T.relief === 'mesa') { const d = Math.sin(gx * 0.5 + gy * 0.75 + S.noise(gx / 6, gy / 6) * 5); return c.map(v => Math.round(v * (0.94 + d * 0.07))); } return c; };   /* the desert: dune ridges of lighter and darker sand */
  const groundColour = (gx, gy) => rgb(groundRGB(gx, gy));
  const treeOf = (I, gx, gy, size) => { const d = B[T.tree] || B.oak; d(I, gx, gy, size); };
  /* the island's shore, as a rounded square so the plan's far lots stay on land */
  const C0 = LAND / 2, RAD = LAND / 2 - 1;   /* the middle of the plot and how far the world reaches */
  const shoreR = (gx, gy) => { const dx = (gx - C0) / (RAD - 1), dy = (gy - C0) / (RAD - 1); return dx * dx * dx * dx + dy * dy * dy * dy + (S.noise(gx / 4, gy / 4) - 0.5) * 0.14; };
  const mesaH = (gx, gy) => S.noise((gx + 50) / 7, gy / 7);   /* the mesas: broad, so they stand as tables, not scattered blocks */
  /* the edge of the world, by terrain: ocean round an island, peaks round the mountains, mesas across the desert */
  const edgeOf = (gx, gy) => {
    const dx = (gx - C0) / RAD, dy = (gy - C0) / RAD, r = dx * dx + dy * dy;
    if (T.edge === 'ocean') { const q = shoreR(gx, gy); return q > 1 ? 'ocean' : q > 0.8 ? 'beach' : null; }
    if (T.edge === 'peaks') { const h = S.height(gx * 1.2, gy * 1.2); if (r > 0.92 || (r > 0.7 && h > 0.55)) return h > 0.66 ? 'snow' : 'rock'; return null; }
    if (T.edge === 'mesa') return r > 0.4 && mesaH(gx, gy) > 0.74 ? 'rock' : null;
    if (T.edge === 'gravel') return r > 0.78 ? 'gravel' : null;
    return null;
  };

  /* ---- the ground, classified once ---- */
  const G = { WATER: 1, BANK: 2, ROAD: 3, PAVED: 4, BRIDGE: 5, EMBANK: 6, PROM: 7, PLAZA: 8, PARK: 9, FIELD: 10, MANAGED: 11, WILD: 12, OCEAN: 13, BEACH: 14, ROCK: 15, SNOW: 16, WASH: 17, SCREE: 18, RIDGE: 19, WOOD: 20, GRAVEL: 21, BOG: 22, DRIFT: 23 };
  const STEP = 7;   /* one terrace, in pixels */
  const POND = [43, 9, 5, 4];   /* the forest's pond */
  let groundKey = '', ground = null, elev = null, decor = null;
  const layer = { cv: null, I: null, key: '', PW: 0, PH: 0, S: 0, lights: [], smokes: [] };   /* the still layer, one per pane */
  const LIVE = new Set(['campfire', 'windmill', 'skyisland', 'skyfarm', 'hoverport', 'skypad', 'windturbine', 'fusion', 'pool', 'reservoir', 'fountain']);   /* civic pieces that move, drawn live */
  function classify(L) {
    const plan = L.plan, W = plan.water, g = new Uint8Array(LAND * LAND), el = new Int8Array(LAND * LAND), wet = T.corridor === 'river';
    const inRect = (x, y, r) => x >= r[0] && x < r[0] + r[2] && y >= r[1] && y < r[1] + r[3];
    const road = (x, y) => L.paths.has(x + ',' + y), paved = (x, y) => plan.pavedSet.has(x + ',' + y) || (x >= S.EAST_TRUNK - 1 && road(x, y) && plan.pavedSet.size > 0);
    const prom = (x, y) => W.promenade && x >= W.promenade.x0 && x <= W.promenade.x1 && y >= W.promenade.y0 && y <= W.promenade.y1;
    const managed = (x, y) => { const c = plan.clearing; const dx = (x - c.cx) / c.rx, dy = (y - c.cy) / c.ry; return dx * dx + dy * dy < 1; };
    /* where the river runs on the plains, every other terrain has its own thing: a wooded belt, a dry wash, a green spine, a scree slope */
    const corr = (x, y) => Math.abs(x + 0.5 - S.creekX(y + 0.5, plan)), inCorr = (x, y) => corr(x, y) < W.width / 2 + 0.55, nearCorr = (x, y) => corr(x, y) < W.width / 2 + 1.6;
    const CORR = { wood: G.WOOD, wash: G.WASH, spine: G.RIDGE, scree: G.SCREE, kare: G.GRAVEL, bog: G.BOG, drift: G.DRIFT, kopje: G.SCREE };
    /* the ground near anything built stays flat, so nothing stands in a pit or on a shelf */
    const nearBuilt = (x, y) => L.buildings.some(b => Math.abs(b.gx - x) < 1.8 && Math.abs(b.gy - y) < 1.8) || (Math.abs(x - HOME[0] - 1) < 3 && Math.abs(y - HOME[1] - 1) < 3) || (L.next && Math.abs(L.next[0] - x) < 2 && Math.abs(L.next[1] - y) < 2) || plan.civic.concat(L.infra, L.nextBuild ? [L.nextBuild] : []).some(c => c.rect ? inRect(x, y, [c.rect[0] - 1, c.rect[1] - 1, c.rect[2] + 2, c.rect[3] + 2]) : c.at && Math.abs(c.at[0] - x) < 4 && Math.abs(c.at[1] - y) < 3);
    for (let y = 0; y < LAND; y++) for (let x = 0; x < LAND; x++) {
      let k; const r = road(x, y), e = edgeOf(x, y), m = managed(x, y);
      if (r) k = wet && S.inWater(x, y, plan) ? G.BRIDGE : paved(x, y) ? G.PAVED : G.ROAD;
      else if (e === 'ocean') k = G.OCEAN; else if (e === 'snow') k = G.SNOW; else if (e === 'rock') k = G.ROCK; else if (e === 'gravel') k = G.GRAVEL;
      else if (wet && S.inWater(x, y, plan)) k = G.WATER;
      else if (wet && S.onBank(x, y, plan)) k = W.channelled ? (prom(x, y) ? G.PROM : G.EMBANK) : G.BANK;
      else if (e === 'beach') k = G.BEACH;
      else if (T.corridor === 'wood' && inRect(x, y, POND) && !m) k = G.WATER;
      else if (!wet && !m && (inCorr(x, y) || (T.corridor === 'wood' && nearCorr(x, y)))) k = CORR[T.corridor];
      else { const z = plan.zones.find(zz => inRect(x, y, zz.rect)); k = z ? (z.kind === 'park' ? G.PARK : G.PLAZA) : plan.landscape.fields.some(f => inRect(x, y, f)) ? G.FIELD : m ? G.MANAGED : G.WILD; }
      g[y * LAND + x] = k;
    }
    /* the relief: terraces up into the mountains and onto the mesas, down from the island's plateau to the sea */
    const OPEN = [G.WILD, G.WOOD, G.ROCK, G.SNOW, G.OCEAN, G.BEACH, G.WASH, G.SCREE, G.RIDGE, G.DRIFT];
    if (T.relief !== 'none') for (let y = 0; y < LAND; y++) for (let x = 0; x < LAND; x++) {
      const i = y * LAND + x, k = g[i]; if (!OPEN.includes(k) || nearBuilt(x, y)) continue; let z = 0;
      if (T.relief === 'shore') { const q = shoreR(x, y); z = k === G.OCEAN ? -4 : k === G.BEACH ? -3 : clamp(Math.floor((0.8 - q) * 12) - 3, -3, 0); if (z === 0) { const h = S.height(x * 1.5, y * 1.5); if (h > 0.72) z = 2; else if (h > 0.62) z = 1; } if (k === G.RIDGE) z = Math.max(z, 0) + 1; }
      else if (T.relief === 'peaks') { const h = S.height(x * 1.2, y * 1.2), far = (x - C0) * (x - C0) + (y - C0) * (y - C0) > 600 * (RAD / 33) * (RAD / 33); z = h > 0.72 ? 3 : h > 0.62 ? 2 : h > 0.52 ? 1 : 0; if (k === G.SCREE || k === G.DRIFT) z = 1; else if (z === 3) g[i] = far || T.weather === 'snow' ? G.SNOW : G.ROCK; else if (z === 2 && k === G.WILD && T.weather !== 'snow') g[i] = G.ROCK; }   /* the snowline: only the far peaks keep snow */
      else if (T.relief === 'mesa') { z = k === G.ROCK ? 3 : k === G.WASH ? -1 : mesaH(x, y) > 0.66 && (x - C0) * (x - C0) + (y - C0) * (y - C0) > 435 * (RAD / 33) * (RAD / 33) ? 1 : 0; }
      el[i] = z;
    }
    /* what stands still: trees, rocks, hay, lamps, bridge rails; placed once */
    const d = { trees: [], lamps: [], rails: [] }; const dens = plan.landscape.treeline === 'dense' ? (T.tree === 'pine' && T.corridor === 'wood' ? 0.12 : 0.07) : plan.landscape.treeline === 'thin' ? 0.036 : 0; const rail = plan.civic.find(c => c.kind === 'rail');
    const DENS = { [G.WOOD]: 0.4, [G.RIDGE]: 0.14, [G.SCREE]: 0.28, [G.ROCK]: 0.12, [G.WASH]: 0.06, [G.BEACH]: 0.025, [G.BOG]: 0.3, [G.GRAVEL]: 0.05 };
    for (let y = 0; y < LAND; y++) for (let x = 0; x < LAND; x++) { const i = y * LAND + x, k = g[i]; if (k !== G.MANAGED && k !== G.WILD && DENS[k] == null) continue; const r = S.hash(x * 3, y * 5); const dd = k === G.MANAGED ? 0.012 : k === G.WILD ? dens : DENS[k]; if (r > dd || (rail && y === rail.from[1] && x <= rail.to[0])) continue; if (nearBuilt(x, y)) continue; const what = k === G.BOG ? 'reeds' : k === G.GRAVEL || (T.corridor === 'kare' && k === G.WILD && r < dd * 0.35) ? (S.hash(x, y * 2) < 0.4 ? 'lantern' : 'rock') : k === G.SCREE || k === G.ROCK || k === G.WASH ? 'rock' : r < 0.008 && k === G.MANAGED ? 'hay' : 'tree'; d.trees.push([x, y, what, 0.8 + S.hash(y, x) * 0.5, el[i] * STEP]); }
    if (plan.landscape.lamps !== 'none') L.paths.forEach(key => { const [x, y] = key.split(',').map(Number); const k = g[y * LAND + x]; if (k !== G.PAVED) return; if (plan.landscape.lamps === 'main' && y !== 33) return; if ((x + y * 3) % 7 === 0) d.lamps.push([x, y]); });
    L.paths.forEach(key => { const [x, y] = key.split(',').map(Number); if (g[y * LAND + x] === G.BRIDGE) d.rails.push([x, y]); });
    return { g, el, d };
  }
  function groundFor(L, state) { const k = L.plan.id + '|' + state.biome + '|' + L.buildings.length + '|' + (L.next || []).join() + '|' + (L.nextBuild ? L.nextBuild.kind : ''); if (k !== groundKey) { const c = classify(L); ground = c.g; elev = c.el; decor = c.d; groundKey = k; } return ground; }
  const colourOf = (k, gx, gy) => {
    switch (k) {
      case G.WATER: return (gx + gy) % 5 === 0 ? NW.shade(T.water, 0.2) : T.water;
      case G.OCEAN: return (gx * 7 + gy * 3) % 9 === 0 ? NW.shade(T.water, -0.25) : NW.shade(T.water, -0.4);
      case G.BEACH: case G.BANK: return T.sand;
      case G.ROAD: return '#c8a877'; case G.PAVED: return (gx + gy) % 2 ? '#e3dccb' : '#d8d0bc'; case G.BRIDGE: return '#a88c5f';
      case G.EMBANK: return '#b8b4a8'; case G.PROM: return '#e3dccb';
      case G.PLAZA: return (gx + gy) % 2 ? '#e9e2d0' : '#dfd7c3'; case G.PARK: return (gx + gy) % 2 ? '#7fc55a' : '#86cc60';
      case G.FIELD: return gy % 2 ? '#a8783f' : '#c8a06a';
      case G.ROCK: return (gx + gy) % 2 ? T.stone : NW.shade(T.stone, -0.12); case G.SNOW: return (gx + gy) % 2 ? '#f4f7fa' : '#e6ecf2';
      case G.WASH: return (gx * 3 + gy) % 5 === 0 ? '#cdb07c' : '#e6d3a4';   /* a dry bed: pale sand and pebbles */
      case G.SCREE: return (gx + gy) % 2 ? '#6f6d68' : '#7c7a74';
      case G.RIDGE: return rgb(groundRGB(gx, gy).map(v => Math.min(255, Math.round(v * 1.08))));
      case G.WOOD: return rgb(groundRGB(gx, gy).map(v => Math.round(v * 0.78)));
      case G.GRAVEL: return (gx + gy) % 3 === 0 ? '#d6d0ba' : '#e8e2cd';   /* raked: a line every third tile */
      case G.BOG: return (gx * 3 + gy * 5) % 7 === 0 ? NW.shade(T.water, -0.15) : rgb(groundRGB(gx, gy).map(v => Math.round(v * 0.82)));   /* puddles in wet ground */
      case G.DRIFT: return (gx + gy) % 2 ? '#f7f9fc' : '#eaf0f5';
      case G.MANAGED: return groundColour(gx, gy);
      default: return rgb(groundRGB(gx, gy).map(v => Math.round(v * 0.92)));   /* the wild: the same ground, a shade quieter */
    }
  };
  /* the side of a terrace: the ground colour, in shadow; rock where it climbs */
  const faceRGB = (k, gx, gy) => { if (k === G.WILD || k === G.WOOD || k === G.RIDGE || k === G.MANAGED) return groundRGB(gx, gy).map(v => Math.round(v * 0.62)); const c = colourOf(k, gx, gy); return (c[0] === '#' ? NW.hex(c) : [110, 108, 100]).map(v => Math.round(v * 0.7)); };
  const edgeStroke = k => k === G.ROAD ? 'rgba(110,75,30,.35)' : k === G.PAVED || k === G.PROM ? 'rgba(0,0,0,.08)' : k === G.BRIDGE ? '#6b4a2b' : k === G.EMBANK ? 'rgba(0,0,0,.12)' : k === G.PLAZA ? 'rgba(0,0,0,.05)' : k === G.FIELD ? 'rgba(90,50,10,.35)' : null;
  /* one tile of ground at its terrace, with a face down to any lower neighbour to the south or east */
  function groundTile(I, gx, gy, k) {
    const i = gy * LAND + gx, e = elev ? elev[i] : 0, z = e * STEP;
    if (!e) I.tile(gx, gy, colourOf(k, gx, gy), edgeStroke(k));
    else I.poly([I.p(gx, gy, z), I.p(gx + 1, gy, z), I.p(gx + 1, gy + 1, z), I.p(gx, gy + 1, z)], colourOf(k, gx, gy), edgeStroke(k));
    const eS = gy + 1 < LAND ? elev[i + LAND] : e, eE = gx + 1 < LAND ? elev[i + 1] : e; if (eS >= e && eE >= e) return;
    const f = faceRGB(k, gx, gy);
    if (eS < e) I.poly([I.p(gx, gy + 1, z), I.p(gx + 1, gy + 1, z), I.p(gx + 1, gy + 1, eS * STEP), I.p(gx, gy + 1, eS * STEP)], rgb(f));
    if (eE < e) I.poly([I.p(gx + 1, gy, z), I.p(gx + 1, gy + 1, z), I.p(gx + 1, gy + 1, eE * STEP), I.p(gx + 1, gy, eE * STEP)], rgb(f.map(v => Math.round(v * 0.85))));
  }

  /* ---- you: always on a road ---- */
  const onRoad = (roads, gx, gy) => roads.has(Math.floor(gx) + ',' + Math.floor(gy));
  function makeMe(state) { const m = state.me && typeof state.me.gx === 'number' ? state.me : { gx: HOME[0] + 1.5, gy: HOME[1] + 2.5 }; return { gx: m.gx, gy: m.gy, route: null, target: null, moving: false, keys: {}, follow: true }; }
  function goTo(me, roads, q) { const start = S.nearestRoad(roads, [me.gx, me.gy]), end = S.nearestRoad(roads, q); if (!start || !end) return false; const r = S.route(roads, start, end); if (!r) return false; me.route = r.map(t => [t[0] + 0.5, t[1] + 0.5]); if (me.route.length > 1 && Math.hypot(me.route[0][0] - me.gx, me.route[0][1] - me.gy) < 0.2) me.route.shift(); me.target = me.route[me.route.length - 1]; return true; }
  function stepMe(me, roads) {
    const k = me.keys; const dx = (k.ArrowRight || k.d ? 1 : 0) - (k.ArrowLeft || k.a ? 1 : 0), dy = (k.ArrowDown || k.s ? 1 : 0) - (k.ArrowUp || k.w ? 1 : 0);
    if (dx || dy) { me.route = null; me.target = null; const gx = (dx + dy) * 0.5, gy = (dy - dx) * 0.5, n = Math.hypot(gx, gy) || 1; const nx = me.gx + gx / n * 0.06, ny = me.gy + gy / n * 0.06; if (onRoad(roads, nx, ny)) { me.gx = nx; me.gy = ny; me.moving = true; } else if (onRoad(roads, nx, me.gy)) { me.gx = nx; me.moving = true; } else if (onRoad(roads, me.gx, ny)) { me.gy = ny; me.moving = true; } else me.moving = false; me.follow = true; return; }
    if (!me.route || !me.route.length) { me.moving = false; me.route = null; me.target = null; return; }
    const w = me.route[0], tx = w[0] - me.gx, ty = w[1] - me.gy, d = Math.hypot(tx, ty);
    if (d < 0.06 || reduce) { me.gx = w[0]; me.gy = w[1]; me.route.shift(); me.moving = me.route.length > 0; if (!me.route.length) { me.route = null; me.target = null; } return; }
    const step = Math.min(d, 0.07); me.gx += tx / d * step; me.gy += ty / d * step; me.moving = true;
  }

  /* ---- the people your work drew in: more of them every era, walking the roads between what you built ---- */
  /* ---- the day in the life: everyone has a home and a job, and a routine by the hour of the fast day ----
   * 6: leave home for work. 7 to 12: at work (farmers hoe the field, gardeners trim the trees, the rest at their building).
   * 12: to the square, the fire or the cafe. 13 to 17: back at work. 17: home; some walk the dog. 20 to 6: indoors.
   * Fewer come out when the power is down; at a quarter, nearly nobody. */
  const CAP = [2, 4, 8, 14, 22, 30, 36]; let folk = [], folkKey = '', lastTick = 0; const tilesOf = { paths: null, tiles: [] };
  function jobsOf(L) { const plan = L.plan, jobs = []; plan.landscape.fields.forEach(f => jobs.push({ kind: 'farm', at: [f[0] + 1, f[1] + 1], rect: f })); plan.civic.concat(L.infra).forEach(c => { if (c.at && !['campfire', 'board', 'lantern', 'rail', 'pool', 'obelisk', 'arch', 'memorial', 'skyisland'].includes(c.kind)) jobs.push({ kind: c.kind, at: [c.at[0] + 0.5, c.at[1] + 0.5] }); if (c.kind === 'paddock') jobs.push({ kind: 'milk', at: [c.rect[0] + 1, c.rect[1] + 1] }); }); const trees = decor ? decor.trees.filter(t => t[2] === 'tree' && ground[t[1] * LAND + t[0]] === G.MANAGED) : []; trees.slice(0, 6).forEach(t => jobs.push({ kind: 'garden', at: [t[0] + 0.5, t[1] + 0.5] })); if (!jobs.length) jobs.push({ kind: 'wood', at: [HOME[0] + 1, HOME[1] + 3] }); return jobs; }
  function tickFolk(L, state, now) {
    const lvl = NW.Eras.level(state), pw = S.power(state, S.now(state)), pop = S.population(state, S.now(state), L.capacity), want = Math.max(pw < 0.25 ? 1 : 2, Math.min(CAP[lvl], pop, Math.round(pop * (0.3 + 0.7 * pw)))); const key = L.plan.id + '|' + want + '|' + L.buildings.length; if (tilesOf.paths !== L.paths) { tilesOf.paths = L.paths; tilesOf.tiles = Array.from(L.paths).map(k => k.split(',').map(Number)); } const tiles = tilesOf.tiles;
    if (key !== folkKey || !folk.length) { folkKey = key; folk = []; const jobs = jobsOf(L), homes = L.buildings.filter(b => b.series && b.tier !== 0); for (let i = 0; i < want; i++) { const h = homes.length ? homes[i % homes.length] : { gx: HOME[0], gy: HOME[1] + 1 }; const j = jobs[i % jobs.length]; folk.push({ at: [h.gx + 0.5, h.gy + 1.5], home: [h.gx + 0.5, h.gy + 1.5], job: j, path: null, dwell: 0, where: 'home', shirt: ['#2f7fd6', '#e8552f', '#3fa66b', '#f2b42a', '#8f5fd1', '#1c1f26', '#f4f1e8', '#ff8fb1'][i % 8], hat: i % 4 === 0 || j.kind === 'farm', dog: i % 5 === 1, tool: j.kind === 'farm' ? 'hoe' : j.kind === 'garden' ? 'shears' : j.kind === 'milk' ? 'pail' : j.kind === 'wood' ? 'axe' : null }); } }
    const dt = Math.min(0.1, lastTick ? (now - lastTick) / 1000 : 0); lastTick = now; if (reduce) return;
    const hr = S.hourOfDay(now, state), square = L.plan.zones.length ? [L.plan.zones[0].rect[0] + 1.5, L.plan.zones[0].rect[1] + 1.5] : [HOME[0] + 0.5, HOME[1] + 3.5];
    folk.forEach((f, i) => {
      const wantWhere = hr < 6 || hr >= 20 ? 'home' : hr < 12 ? 'work' : hr < 13 ? 'square' : hr < 17 ? 'work' : (f.dog && hr < 19 ? 'walk' : 'home');
      if (f.path && f.path.length) { const w = f.path[0], dx = w[0] - f.at[0], dy = w[1] - f.at[1], d = Math.hypot(dx, dy), sp = 1.4 * dt; if (d <= sp) { f.at = w.slice(); f.path.shift(); if (!f.path.length) { f.where = f.going; f.dwell = 1; } } else { f.at[0] += dx / d * sp; f.at[1] += dy / d * sp; } f.moving = true; return; }
      f.moving = false; f.dwell -= dt;
      if (f.where === wantWhere && wantWhere !== 'walk') { f.working = wantWhere === 'work' && pw >= 0.25; return; }
      if (f.dwell > 0 && wantWhere === 'walk') return;
      const to = wantWhere === 'home' ? f.home : wantWhere === 'work' ? f.job.at : wantWhere === 'square' ? square : (() => { const t = tiles[Math.floor(S.hash(Math.floor(now / 3000), i) * tiles.length)]; return [t[0] + 0.5, t[1] + 0.5]; })();
      const a = S.nearestRoad(L.paths, [f.at[0], f.at[1]]), b = S.nearestRoad(L.paths, to); const r = a && b ? S.route(L.paths, a, b) : null;
      if (r) { f.path = r.map(t => [t[0] + 0.5, t[1] + 0.5]); f.path.push(to); if (f.path.length && Math.hypot(f.path[0][0] - f.at[0], f.path[0][1] - f.at[1]) < 0.1) f.path.shift(); f.going = wantWhere; f.working = false; } else { f.at = to.slice(); f.where = wantWhere; }
      if (wantWhere === 'walk') f.dwell = 3;
    });
  }
  /* ---- traffic: from the town on, carts and cars take the roads; the paved ones when there are any ---- */
  const CARS = [0, 0, 2, 5, 8, 10, 5], FLEET = [[], [], ['cart', 'pickup', 'sedan'], ['sedan', 'hatch', 'suv', 'pickup', 'van', 'taxi'], ['sedan', 'hatch', 'suv', 'van', 'taxi', 'bus', 'sports', 'pickup'], ['sedan', 'suv', 'taxi', 'bus', 'sports', 'van', 'hatch'], ['sedan', 'sports', 'bus', 'taxi']];
  const CAR_COLOURS = ['#3b7dd8', '#e8552f', '#f4f1e8', '#9aa3b0', '#3fa66b', '#ffc531', '#1c1f26', '#8f5fd1', '#c9503c', '#e6e9ef'];
  let cars = [], carsKey = '', carTick = 0;
  function tickCars(L, state, now) {
    const lvl = NW.Eras.level(state), want = CARS[lvl] || 0; const roads = L.plan.pavedSet.size ? Array.from(L.paths).filter(k => L.plan.pavedSet.has(k)) : Array.from(L.paths); const key = L.plan.id + '|' + want + '|' + roads.length;
    if (key !== carsKey) { carsKey = key; cars = []; for (let i = 0; i < want; i++) { const t = roads[Math.floor(S.hash(i, 11) * roads.length)].split(',').map(Number); cars.push({ at: [t[0] + 0.5, t[1] + 0.5], path: null, dwell: S.hash(i, 13) * 3, kind: FLEET[lvl][i % FLEET[lvl].length], colour: CAR_COLOURS[(i * 3 + lvl) % CAR_COLOURS.length], dir: 'x', flip: false, moving: false }); } }
    const dt = Math.min(0.1, carTick ? (now - carTick) / 1000 : 0); carTick = now; if (reduce || !roads.length) return;
    const set = new Set(roads);
    cars.forEach((c, i) => { if (c.path && c.path.length) { const w = c.path[0], dx = w[0] - c.at[0], dy = w[1] - c.at[1], d = Math.hypot(dx, dy), sp = (c.kind === 'cart' ? 0.9 : c.kind === 'bus' ? 2 : 2.6) * dt; if (Math.abs(dx) > Math.abs(dy)) { c.dir = 'x'; c.flip = dx < 0; } else if (Math.abs(dy) > 0.01) { c.dir = 'y'; c.flip = dy < 0; } if (d <= sp) { c.at = w.slice(); c.path.shift(); if (!c.path.length) c.dwell = 1 + S.hash(now, i) * 4; } else { c.at[0] += dx / d * sp; c.at[1] += dy / d * sp; } c.moving = true; return; }
      c.moving = false; c.dwell -= dt; if (c.dwell > 0) return; const to = roads[Math.floor(S.hash(Math.floor(now / 700), i) * roads.length)].split(',').map(Number); const r = S.route(set, [Math.floor(c.at[0]), Math.floor(c.at[1])], to); if (r && r.length > 2) c.path = r.slice(1).map(t => [t[0] + 0.5, t[1] + 0.5]); else c.dwell = 1; });
  }
  /* what a worker holds, swinging while they work */
  function toolOf(I, f, now) { if (!f.working || !f.tool) return; const c = I.p(f.at[0], f.at[1]), sw = Math.sin(now / 160), ctx = I.ctx; if (f.tool === 'hoe' || f.tool === 'axe') { ctx.strokeStyle = '#7a4b25'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c[0] + 3, c[1] - 10); ctx.lineTo(c[0] + 9, c[1] - 16 - sw * 5); ctx.stroke(); ctx.fillStyle = '#5f6b73'; ctx.fillRect(c[0] + 7.5, c[1] - 18 - sw * 5, 4, 2.5); } else if (f.tool === 'shears') { ctx.strokeStyle = '#8c8f98'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c[0] + 3, c[1] - 11); ctx.lineTo(c[0] + 8, c[1] - 13 - sw * 2); ctx.moveTo(c[0] + 3, c[1] - 9); ctx.lineTo(c[0] + 8, c[1] - 9 + sw * 2); ctx.stroke(); if (sw > 0.7) for (let k = 0; k < 3; k++) I.blob(c[0] + 10 + k * 2, c[1] - 12 - k * 2, 1, '#5cc464'); } else if (f.tool === 'pail') { ctx.fillStyle = '#c9d2dc'; ctx.fillRect(c[0] + 4, c[1] - 7 + sw, 4, 4); } }

  /* ---- the build site: one component per step ---- */
  function siteFor(state) { const nx = S.nextProject(state); if (!nx) return null; const L = S.layout(state); if (L.nextBuild) { const b = L.nextBuild; const at = b.at || (b.rect ? [b.rect[0], b.rect[1]] : b.from); return { title: nx.title, series: nx.series, xp: nx.xp, gx: at[0], gy: at[1], kind: nx.series.kind, infra: b }; } const q = state.sites[nx.title] || L.next; if (!q) return null; return { title: nx.title, series: nx.series, xp: nx.xp, gx: q[0], gy: q[1], kind: nx.series.kind }; }

  function drawLand(I, state, me, now, opts) {
    const ctx = I.ctx, L = S.layout(state), plan = L.plan; opts = opts || {}; T = terrainOf(state); Homes.setTerrain(state.biome); B.modern = NW.Eras.level(state) >= 3;
    const g = groundFor(L, state), lvl = NW.Eras.level(state), era = NW.Eras.eraOf(state);
    const pw = S.power(state, S.now(state)); NW.power = pw; const stage = pw < 0.5 ? -1 : Math.floor(((S.dayOf(state, S.now(state)) % 30) / 30) * 5);
    const items = []; const add = (d, fn) => items.push({ d, fn });
    const layered = !opts.map && !opts.site && !opts.placing && !opts.anim && !reduce;
    const drawCivicWith = (I, add) => c => {
      if (c.kind === 'rail') return;
      if (c.kind === 'stockade') { if (!opts.map) add(c.rect[0] + c.rect[1] - 0.5, () => { const [x, y, w, h] = c.rect; I.fence(x, y, x + w, y, w * 2); I.fence(x, y, x, y + h, h * 2); I.fence(x + w, y, x + w, y + h, h * 2); I.fence(x, y + h, x + 16, y + h, 32); I.fence(x + 17.2, y + h, x + w, y + h, 2); }); return; }
      if (c.kind === 'paddock') { add(c.rect[0] + c.rect[1] - 0.5, () => B.paddock(I, c.rect[0], c.rect[1], c.rect[2], c.rect[3])); [[1, 1.2], [4, 2]].forEach((o, i) => { const q = [c.rect[0] + o[0] + Math.sin(now / 9000 + i) * 0.8, c.rect[1] + o[1] + Math.cos(now / 11000 + i) * 0.5]; add(q[0] + q[1] + 0.2, () => (i ? B.cow : B.horse)(I, q[0], q[1], i ? now / 1000 : '#8a5a3a', now / 1000)); }); return; }
      if (!c.at) return; const d = c.kind === 'board' ? (I2, x, y) => B.board(I2, x, y) : c.kind === 'windmill' ? (I2, x, y, n) => B.windmill(I2, x, y, n) : c.kind === 'tank' ? (I2, x, y) => B.tank(I2, x, y) : c.kind === 'barn' ? (I2, x, y, n) => B.barn(I2, x, y, 1, n, 2) : c.kind === 'coop' ? (I2, x, y, n) => B.coop(I2, x, y, n) : B.CIV[c.kind];
      if (!d || !(I.onScreen(c.at[0], c.at[1]) || I.onScreen(c.at[0] + 3, c.at[1] + 3))) return; const big = ['cityhall', 'capitol', 'palace', 'university', 'stadium', 'hospital', 'skypad', 'hoverport', 'obelisk', 'pool'].includes(c.kind); add(c.kind === 'skyisland' ? 4000 + c.at[0] + c.at[1] : c.at[0] + c.at[1] + (big ? 4 : 1.2), () => d(I, c.at[0], c.at[1], now)); };
    /* everything that stands still: the ground, the fields, the rail, the trees, the home, the civic buildings, the homes */
    const scene = (I, ctx, add) => {
    for (let d = 0; d <= 2 * (LAND - 1); d++) for (let gx = Math.max(0, d - LAND + 1); gx <= Math.min(LAND - 1, d); gx++) { const gy = d - gx; if (!I.onScreen(gx, gy)) continue; groundTile(I, gx, gy, g[gy * LAND + gx]); }
    if (!opts.map) plan.landscape.fields.forEach(f => { for (let y = f[1]; y < f[1] + f[3]; y++) for (let x = f[0]; x < f[0] + f[2]; x++) { if (!I.onScreen(x, y)) continue; const q = I.p(x + 0.5, y + 0.5); if (stage < 0) { ctx.fillStyle = '#7a8f3a'; [[-8, -2], [2, 1], [-2, 4], [7, -3]].forEach(o => ctx.fillRect(q[0] + o[0], q[1] + o[1] - 3, 1.5, 3)); continue; } if (stage === 0) { ctx.fillStyle = 'rgba(0,0,0,.12)'; for (let k = -1; k <= 1; k++) ctx.fillRect(q[0] - 12, q[1] + k * 4, 24, 1); continue; } if (stage === 4) { if ((x + y) % 2 === 0) { ctx.fillStyle = '#d9b24c'; ctx.fillRect(q[0] - 4, q[1] - 6, 8, 5); ctx.fillStyle = '#b8902e'; ctx.fillRect(q[0] - 4, q[1] - 2, 8, 1); } continue; } const h = [0, 4, 8, 11][stage], col = stage === 3 ? '#d9a23a' : stage === 2 ? '#7fb35a' : '#9fd06a'; ctx.fillStyle = col; for (let k = -2; k <= 2; k++) for (let m = -1; m <= 1; m++) ctx.fillRect(q[0] + k * 5 + m * 1.5, q[1] + m * 3 - h, 1.5, h); if (stage === 3) { ctx.fillStyle = '#f2c94c'; for (let k = -2; k <= 2; k++) ctx.fillRect(q[0] + k * 5 - 1, q[1] - h - 3, 3, 3); } } });
    const rail = plan.civic.find(c => c.kind === 'rail');
    if (rail && !opts.map) { ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 1.2; for (let x = rail.from[0]; x <= rail.to[0]; x += 0.5) { const a = I.p(x, rail.from[1] + 0.15), b = I.p(x, rail.from[1] + 0.85); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); } [0.3, 0.7].forEach(o => { const a = I.p(rail.from[0], rail.from[1] + o), b = I.p(rail.to[0] + 1, rail.to[1] + o); ctx.strokeStyle = '#9aa3b0'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }); }
    if (!opts.map) { decor.rails.forEach(([x, y]) => { if (!I.onScreen(x, y)) return; add(x + y + 0.4, () => { const a = I.p(x, y), b = I.p(x + 1, y), c = I.p(x, y + 1), d = I.p(x + 1, y + 1); I.line(I.up(a, 6), I.up(b, 6), '#8a6a3f', 1.5); I.line(I.up(c, 6), I.up(d, 6), '#8a6a3f', 1.5); }); });
      const grown = clamp(0.55 + S.dayOf(state, S.now(state)) / 30 * 0.45, 0.55, 1);
      decor.trees.forEach(([x, y, what, size, z]) => { if (!I.onScreen(x, y)) return; if (what === 'tree' && g[y * LAND + x] === G.MANAGED) size *= grown; add(x + y + 0.5, () => { I.cam.y += z; if (what === 'hay') B.hay(I, x, y); else if (what === 'rock') B.boulder(I, x, y, size); else if (what === 'reeds') B.reeds(I, x, y, size); else if (what === 'lantern') B.stonelantern(I, x, y); else treeOf(I, x, y, size); I.cam.y -= z; }); });
      decor.lamps.forEach(([x, y], i) => { if (I.onScreen(x, y)) add(x + y + 0.35, () => { I.lamp(x + 0.15, y + 0.15); if ((i % 4) / 4 >= pw) I.lights.pop(); }); }); }
    /* the home: a tent at the campground, the cabin from the fort on, growing with the eras */
    if (I.onScreen(HOME[0], HOME[1])) {
      if (lvl === 0) { add(HOME[0] + HOME[1] + 1.5, () => { const t = I.p(HOME[0] + 1, HOME[1] + 1); I.poly([[t[0] - 16, t[1]], [t[0] + 16, t[1]], [t[0], t[1] - 26]], '#e9e4d6'); I.poly([[t[0], t[1]], [t[0] + 16, t[1]], [t[0], t[1] - 26]], '#cfc7aa'); I.poly([[t[0] - 4, t[1]], [t[0] + 4, t[1]], [t[0], t[1] - 12]], '#6b4a2b'); }); }
      else { const t = lvl >= 5 ? 5 : lvl >= 3 ? 4 : lvl >= 2 ? 3 : 2; add(HOME[0] + 1 + HOME[1] + 1.2, () => B.homestead(I, HOME[0] + 0.1, HOME[1] - 0.2, now, t)); }
      if (!opts.map && opts.land) add(9999, () => I.label(HOME[0] + 1, HOME[1] - 2.4, opts.land, era.name, 11));
    }
    /* what you bought with sparks: flowers, a flag, a name plate, a fountain, an orchard */
    if (!opts.map && state.wallet && state.wallet.unlocked.length) { const has = k => state.wallet.unlocked.includes(k);
      if (has('land:flowers')) [[-0.4, 2.3], [2.4, 2.3], [-0.4, 0.2], [2.4, 0.2]].forEach(o => { const x = HOME[0] + o[0], y = HOME[1] + o[1]; if (I.onScreen(x, y)) add(x + y + 0.3, () => I.bush(x, y, true)); });
      if (has('land:flag')) add(HOME[0] + HOME[1] + 2.6, () => { const q = I.p(HOME[0] + 2.1, HOME[1] + 0.2, lvl >= 3 ? 90 : 46); ctx.fillStyle = '#3b4252'; ctx.fillRect(q[0] - 1, q[1] - 26, 2, 26); I.poly([[q[0] + 1, q[1] - 26], [q[0] + 14, q[1] - 22 + Math.sin(now / 300) * 2], [q[0] + 1, q[1] - 17]], (state.avatar && state.avatar.shirt) || '#2f7fd6'); });
      if (has('land:sign')) add(HOME[0] + HOME[1] + 3.3, () => B.sign(I, HOME[0] - 0.6, HOME[1] + 2.4, (opts.land || 'Your land').toUpperCase().slice(0, 18), 'est. ' + new Date(state.life.founded).getFullYear()));
      if (has('land:fountain')) { const sq = plan.zones.find(z => z.kind === 'square' || z.kind === 'plaza' || z.kind === 'park'); const fx0 = sq ? sq.rect[0] + Math.floor(sq.rect[2] / 2) - 0.5 : HOME[0] - 2.5, fy0 = sq ? sq.rect[1] + Math.floor(sq.rect[3] / 2) - 0.5 : HOME[1] + 4; if (I.onScreen(fx0, fy0)) add(fx0 + fy0 + 1.4, () => B.fountain(I, fx0, fy0, 1, now)); }
      if (has('land:orchard')) [[-1.2, -1.2], [0, -1.6], [1.2, -1.2], [2.4, -1.6], [3.4, -1], [-1.6, 0]].forEach((o, i) => { const x = HOME[0] + o[0], y = HOME[1] + o[1]; if (I.onScreen(x, y)) add(x + y + 0.5, () => { B.oak(I, x, y, 0.75); const q = I.p(x + 0.5, y + 0.5); [[-6, -26], [4, -30], [8, -22], [-2, -20]].forEach((f, k) => I.blob(q[0] + f[0], q[1] + f[1], 1.8, k % 2 ? '#e8552f' : '#ffc531')); }); }); }
    /* what stood here before, and what this era's projects have built so far */
    const drawCivic = drawCivicWith(I, add);
    const skipLive = c => layered && LIVE.has(c.kind);
    plan.civic.forEach(c => { if (!skipLive(c)) drawCivic(c); }); L.infra.forEach(c => { if (!skipLive(c) && (!opts.site || opts.site.title !== c.title)) drawCivic(c); });
    /* the next lot, pegged out; every free lot while you are choosing */
    if (!opts.map && L.next && !opts.site) add(L.next[0] + L.next[1] + 0.4, () => { const q = I.p(L.next[0] + 0.5, L.next[1] + 0.5); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.setLineDash([3, 3]); ctx.beginPath(); ctx.ellipse(q[0], q[1], 14, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]); [[-0.3, -0.3], [1.3, -0.3], [-0.3, 1.3], [1.3, 1.3]].forEach(o => { const c = I.p(L.next[0] + o[0], L.next[1] + o[1]); ctx.fillStyle = '#f4f1e8'; ctx.fillRect(c[0] - 1, c[1] - 7, 2, 7); ctx.fillStyle = '#ffc531'; ctx.fillRect(c[0] - 2.5, c[1] - 9, 5, 2.5); }); });
    if (opts.placing) L.west.forEach(q => { if (!I.onScreen(q[0], q[1]) || !S.lotFree(state, q)) return; add(q[0] + q[1] + 0.3, () => { const c = I.p(q[0] + 0.5, q[1] + 0.5); ctx.fillStyle = 'rgba(255,255,255,.18)'; ctx.strokeStyle = 'rgba(255,255,255,.75)'; ctx.setLineDash([2, 3]); ctx.beginPath(); ctx.ellipse(c[0], c[1], 13, 6.5, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.setLineDash([]); }); });
    const exit = plan.roads[0].from; if (!opts.map) add(exit[0] + exit[1] + 0.6, () => B.sign(I, exit[0] - 1, exit[1] - 1, 'THE WAY OUT', 'to the world'));
    /* the buildings, every one in the era's material */
    L.buildings.forEach(b => { if (!I.onScreen(b.gx, b.gy)) return;
      if (b.tier === 0) { add(b.gx + b.gy + 0.5, () => { /* not yet: a clear field with a light cross, nothing to trip over */ I.tile(b.gx + 0.1, b.gy + 0.1, 'rgba(255,255,255,.28)', 'rgba(255,255,255,.55)'); const a = I.p(b.gx + 0.3, b.gy + 0.3), c = I.p(b.gx + 0.7, b.gy + 0.7), d = I.p(b.gx + 0.7, b.gy + 0.3), e = I.p(b.gx + 0.3, b.gy + 0.7); I.line(a, c, 'rgba(255,255,255,.6)', 1); I.line(d, e, 'rgba(255,255,255,.6)', 1); }); return; }
      let k = 1; if (opts.anim && opts.anim.title === b.title) k = reduce ? 1 : clamp((now - opts.anim.start) / 1600, 0, 1);
      add(b.gx + b.gy + 0.5, () => { Homes.setN(b.order || 0, b); Homes.ERA_HOME[lvl](I, b.gx, b.gy, k, now, b.kind); }); if (!opts.map && b.order && !opts.quiet) add(b.gx + b.gy + 0.51, () => { const q = I.p(b.gx + 0.15, b.gy + 0.15, 2); I.roundRect(q[0] - 7, q[1] - 6, 14, 9, 3, 'rgba(255,255,255,.88)'); ctx.fillStyle = '#172033'; ctx.font = '800 6.5px Baloo 2, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.fillText(String(b.order), q[0], q[1] + 1); ctx.textAlign = 'left'; }); });
    if (opts.placing) add(9998, () => { const q = I.p(HOME[0] + 1, HOME[1] + 4.5); ctx.font = '800 12px Baloo 2, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(40,40,60,.55)'; ctx.strokeText('Where do you want this? Tap an outlined lot.', q[0], q[1]); ctx.fillStyle = '#fff'; ctx.fillText('Where do you want this? Tap an outlined lot.', q[0], q[1]); ctx.textAlign = 'left'; });
    };
    /* the still layer: the scene is drawn into a cached canvas and blitted every frame, redrawn only when the camera, the zoom, the
     * layout or the day moves on. Only what moves is drawn live: people, cars, the avatar, smoke, the animated civic pieces, the lights. */
    if (layered) {
      const key = [plan.id, state.biome, L.buildings.length, (L.next || []).join(), L.nextBuild ? L.nextBuild.kind : '', I.S, Math.round(I.cam.x * 2), Math.round(I.cam.y * 2), I.PW, I.PH, stage, lvl, state.wallet.unlocked.length, opts.land || '', !!opts.quiet, Math.floor(S.dayOf(state, S.now(state)) / 3)].join('|');
      if (!layer.cv) layer.cv = document.createElement('canvas');
      if (layer.PW !== I.PW || layer.PH !== I.PH || layer.S !== I.S) { layer.cv.width = I.PW; layer.cv.height = I.PH; layer.I = NW.makeIso(layer.cv, I.PW / (I.DPR * I.S), I.PH / (I.DPR * I.S), I.S, I.DPR); layer.PW = I.PW; layer.PH = I.PH; layer.S = I.S; layer.key = ''; }
      if (layer.key !== key) { const I2 = layer.I; I2.cam.x = I.cam.x; I2.cam.y = I.cam.y; I2.ctx.setTransform(1, 0, 0, 1, 0, 0); I2.ctx.clearRect(0, 0, I.PW, I.PH); I2.reset(); I2.lights.length = 0; I2.night = I.night; Homes.setLive(false); const items2 = []; scene(I2, I2.ctx, (d, fn) => items2.push({ d, fn })); items2.sort((a, b) => a.d - b.d).forEach(it => it.fn()); Homes.setLive(true); layer.lights = I2.lights.slice(); I2.lights.length = 0; layer.smokes = Homes.takeSmokes(); layer.key = key; }
      ctx.drawImage(layer.cv, 0, 0, I.W, I.H);
      layer.lights.forEach(l => I.lights.push({ x: l.x, y: l.y, r: l.r, c: l.c, k: l.k }));
      layer.smokes.forEach(sm => { const q = I.p(sm.gx, sm.gy, sm.z); I.smoke(q[0], q[1], now); });
      const dc = drawCivicWith(I, add); plan.civic.concat(L.infra).forEach(c => { if (LIVE.has(c.kind)) dc(c); });
    } else scene(I, ctx, add);
    if (opts.site) { const st = opts.site; Homes.setN(L.buildings.filter(b => b.series).length + 1, L.next ? L.plan.lotList.find(q => q[0] === L.next[0] && q[1] === L.next[1]) || {} : {}); const draw = st.infra ? ((I2, x, y) => { const c = st.infra; if (c.kind === 'stockade') { const [sx, sy, w, h] = c.rect; I.fence(sx, sy, sx + w, sy, w * 2); I.fence(sx, sy, sx, sy + h, h * 2); I.fence(sx + w, sy, sx + w, sy + h, h * 2); I.fence(sx, sy + h, sx + 16, sy + h, 32); return; } if (c.kind === 'paddock') { B.paddock(I, c.rect[0], c.rect[1], c.rect[2], c.rect[3]); return; } if (c.kind === 'rail') return; const d = c.kind === 'board' ? (I3, a, b2) => B.board(I3, a, b2) : c.kind === 'windmill' ? (I3, a, b2, n) => B.windmill(I3, a, b2, n) : c.kind === 'tank' ? (I3, a, b2) => B.tank(I3, a, b2) : c.kind === 'barn' ? (I3, a, b2, n) => B.barn(I3, a, b2, 1, n, 2) : c.kind === 'coop' ? (I3, a, b2, n) => B.coop(I3, a, b2, n) : B.CIV[c.kind]; if (d) d(I2, x, y, now); }) : null; add(st.gx + st.gy + (st.infra ? 3 : 0.5), () => { opts.stage = Homes.drawStage(I, st.gx, st.gy, opts.stepsDone, opts.stepsTotal, st.kind, lvl, opts.k == null ? 1 : opts.k, now, draw); }); }
    /* the dead at work: bone workers on the build site, one waiting at the next pegged lot; and the rift at the edge of the land */
    if (NW.Battle && !opts.map && !opts.quiet) {
      const Bt = NW.Battle, t0 = reduce ? 1.1 : now / 1000, crew = (gx, gy, i) => add(gx + gy + 0.05, () => { const q = I.p(gx, gy); Bt.worker(ctx, q[0], q[1], 0.7, t0 + i * 0.37); });
      if (opts.site) { const n = Math.min(3, 2 + Math.floor((NW.Hero ? NW.Hero.level(state) : 1) / 5)); [[-0.2, 0.75], [1.2, 0.3], [0.7, 1.25]].slice(0, n).forEach((o, i) => crew(opts.site.gx + o[0], opts.site.gy + o[1], i)); }
      else if (L.next) crew(L.next[0] + 0.15, L.next[1] + 0.95, 0);
      const r = riftOf(state); if (r && I.onScreen(r[0], r[1])) add(r[0] + r[1], () => riftGate(I, r, t0, NW.Hero && NW.Hero.hero(state).raids.length > 0));
    }
    /* the traffic */
    if (!opts.map && !opts.quiet && lvl >= 2) { tickCars(L, state, now); cars.forEach(c => { if (!I.onScreen(c.at[0], c.at[1])) return; const k = I.KINDS[c.kind], gx = c.at[0] - (c.dir === 'x' ? k.L / 2 : 0.5), gy = c.at[1] - (c.dir === 'y' ? k.L / 2 : 0.5); add(c.at[0] + c.at[1] + 0.45, () => { I.vehicle(gx, gy, c.kind, c.colour, 0, c.dir, { flip: c.flip, lit: I.night > 0.3 }); if (c.kind === 'cart') { const f = c.flip ? -0.75 : 0.75; B.horse(I, c.at[0] - 0.5 + (c.dir === 'x' ? f + 0.1 : 0), c.at[1] - 0.5 + (c.dir === 'y' ? f + 0.1 : 0), '#8a5a3a', c.moving ? now / 1000 : 3); } }); }); }
    /* the kingdom's hover cars, circling the two cities at height, their shadows on the ground */
    if (!opts.map && !opts.quiet && lvl >= 6 && !reduce) for (let i = 0; i < 7; i++) { const a = now / (7000 + i * 900) * Math.PI * 2 * (i % 2 ? 1 : -1) + i * 1.3, gx = 44 + Math.cos(a) * (12 + i * 1.5), gy = 36 + Math.sin(a) * (10 + i); if (!I.onScreen(gx, gy)) continue; const z = 60 + Math.sin(now / 900 + i) * 5 + i * 4; add(5000 + i, () => { const s = I.p(gx, gy); ctx.fillStyle = 'rgba(20,40,30,.14)'; ctx.beginPath(); ctx.ellipse(s[0], s[1], 12, 5, 0, 0, Math.PI * 2); ctx.fill(); B.hovercar(I, I.p(gx, gy, z), ['#e8552f', '#3b7dd8', '#ffc531', '#3fa66b', '#8f5fd1', '#f4f1e8', '#ff8fb1'][i], now, 0.85); }); }
    /* the people */
    if (!opts.map && !opts.quiet) { tickFolk(L, state, now); folk.forEach((f, i) => { if (!I.onScreen(f.at[0], f.at[1]) || (f.where === 'home' && !f.moving)) return; add(f.at[0] + f.at[1] + 0.02, () => { I.person(f.at[0], f.at[1], f.shirt, f.moving && !reduce ? now / 1000 + i : 3 + i, f.hat); toolOf(I, f, now); if (f.dog) { const q = I.p(f.at[0] + 0.35, f.at[1] + 0.1); I.ctx.fillStyle = '#8a5a3a'; I.ctx.fillRect(q[0] - 4, q[1] - 5, 8, 4); I.ctx.fillRect(q[0] + 3, q[1] - 8, 3, 4); I.ctx.fillRect(q[0] - 3, q[1] - 1.5, 1.5, 2); I.ctx.fillRect(q[0] + 1.5, q[1] - 1.5, 1.5, 2); } }); }); }
    if (!opts.map && me) { if (!onRoad(L.paths, me.gx, me.gy) && !me.route) { const r = S.nearestRoad(L.paths, [me.gx, me.gy]); if (r) { me.gx = r[0] + 0.5; me.gy = r[1] + 0.5; } } add(me.gx + me.gy, () => B.avatar(I, me.gx, me.gy, state.avatar, now / 1000, me.moving)); if (me.target) { const q = I.p(me.target[0], me.target[1]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(q[0], q[1], 9, 4.5, 0, 0, Math.PI * 2); ctx.stroke(); } }
    (opts.fx || []).forEach(f => { const t = (now - f.start) / f.life; if (t >= 1 || t < 0) return;
      if (f.type === 'float') add(999, () => { const q = I.p(f.gx, f.gy, 40 + t * 40); ctx.globalAlpha = 1 - t; ctx.font = '800 13px Baloo 2, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(16,24,44,.6)'; ctx.strokeText(f.text, q[0], q[1]); ctx.fillStyle = f.colour; ctx.fillText(f.text, q[0], q[1]); ctx.textAlign = 'left'; ctx.globalAlpha = 1; });
      if (f.type === 'sparkle') add(999, () => { const q = I.p(f.gx, f.gy, 20); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + f.seed, r = ease(t) * 34; ctx.globalAlpha = 1 - t; I.blob(q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r * 0.55 - t * 18, 2.2 * (1 - t) + 0.5, ['#ffd54a', '#7cf0a4', '#4fc3ff', '#ff8fb1'][i % 4]); } ctx.globalAlpha = 1; }); });
    items.sort((a, b) => a.d - b.d).forEach(it => it.fn());
    if (pw < 1) I.lights.forEach((l, i) => { if ((i % 5) / 5 >= pw) l.k = 0; else l.k *= 0.5 + 0.5 * pw; });   /* the grid: the lights a project pays for */
    I.nightfall(I.night);
    if (T.weather && !opts.map && !opts.quiet && !reduce) weather(I, now);
    return L;
  }
  /* the rift: a portal on open, level ground at the edge of the cleared land, clear of every build, lot and tree; found once per layout */
  let rift = null, riftKey = null;
  function riftOf(state) { const L = S.layout(state); T = terrainOf(state); groundFor(L, state); if (riftKey === groundKey) return rift; riftKey = groundKey; rift = null; const c = L.plan.clearing;
    const near = (a, x, y, d) => a.some(q => Math.abs(q[0] - x) < d && Math.abs(q[1] - y) < d), lots = L.plan.lotList || [];
    for (let i = 0; i < 48 && !rift; i++) { const a = -Math.PI / 2 + (i % 2 ? 1 : -1) * Math.ceil(i / 2) * Math.PI / 24;
      for (let f = 1.05; f >= 0.7 && !rift; f -= 0.07) { const x = Math.floor(c.cx + Math.cos(a) * c.rx * f), y = Math.floor(c.cy + Math.sin(a) * c.ry * f); if (x < 2 || y < 2 || x >= LAND - 2 || y >= LAND - 2) continue; let ok = true;
        for (let dy = -1; dy <= 1 && ok; dy++) for (let dx = -1; dx <= 1 && ok; dx++) { const j = (y + dy) * LAND + x + dx; if ((ground[j] !== G.MANAGED && ground[j] !== G.WILD) || elev[j] !== 0) ok = false; }
        if (ok && !L.buildings.some(b => Math.abs(b.gx - x) < 2.5 && Math.abs(b.gy - y) < 2.5) && !near(lots, x, y, 2.5) && !near(decor.trees, x, y, 1.5) && !near([[HOME[0] + 1, HOME[1] + 1]], x, y, 4) && !(L.next && near([L.next], x, y, 2.5))) rift = [x + 0.5, y + 0.5]; } }
    return rift; }
  /* the gate itself: a standing ring of violet light over a scorched patch, brighter while a raid is waiting */
  function riftGate(I, r, t, hot) { const ctx = I.ctx, q = I.p(r[0], r[1]), e = I.p(r[0] + 1, r[1]), w = Math.hypot(e[0] - q[0], e[1] - q[1]) * 0.9, h = w * 1.5, cy = q[1] - h * 0.55, k = hot ? 1 : 0.7, pulse = 0.85 + Math.sin(t * 3) * 0.15;
    ctx.save(); ctx.fillStyle = 'rgba(40,20,50,.45)'; ctx.beginPath(); ctx.ellipse(q[0], q[1], w * 0.75, w * 0.32, 0, 0, Math.PI * 2); ctx.fill();
    const glow = ctx.createRadialGradient(q[0], cy, 0, q[0], cy, h * 0.9); glow.addColorStop(0, 'rgba(190,110,255,' + 0.45 * k * pulse + ')'); glow.addColorStop(1, 'rgba(190,110,255,0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(q[0], cy, h * 0.9, 0, Math.PI * 2); ctx.fill();
    [[-0.42, 0.9], [0.42, 1.05]].forEach(([dx, s]) => { ctx.fillStyle = '#4a4458'; ctx.beginPath(); ctx.moveTo(q[0] + dx * w - 3, q[1]); ctx.lineTo(q[0] + dx * w - 2, q[1] - h * 0.95 * s); ctx.lineTo(q[0] + dx * w + 2.5, q[1] - h * 0.9 * s); ctx.lineTo(q[0] + dx * w + 3, q[1]); ctx.closePath(); ctx.fill(); });
    const core = ctx.createRadialGradient(q[0], cy, 0, q[0], cy, w * 0.4); core.addColorStop(0, 'rgba(20,0,40,.95)'); core.addColorStop(0.7, 'rgba(90,20,150,.9)'); core.addColorStop(1, 'rgba(200,120,255,.8)'); ctx.fillStyle = core; ctx.beginPath(); ctx.ellipse(q[0], cy, w * 0.32, h * 0.4, 0, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) { ctx.strokeStyle = 'rgba(230,190,255,' + (0.8 - i * 0.2) * k + ')'; ctx.lineWidth = 1.4 - i * 0.3; ctx.beginPath(); ctx.ellipse(q[0], cy, w * (0.3 - i * 0.07), h * (0.38 - i * 0.09), 0, t * (1.5 + i) + i, t * (1.5 + i) + i + Math.PI * 1.3); ctx.stroke(); }
    for (let i = 0; i < 5; i++) { const a = (t * 0.7 + i / 5) % 1; ctx.fillStyle = 'rgba(220,170,255,' + (1 - a) * k + ')'; ctx.beginPath(); ctx.arc(q[0] + Math.sin(i * 2.4 + t) * w * 0.3, cy - a * h * 0.7, 1.3, 0, Math.PI * 2); ctx.fill(); }
    if (hot) { ctx.font = '800 10px Baloo 2, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(30,10,40,.85)'; ctx.fillStyle = '#f0d6ff'; ctx.strokeText('RAID', q[0], q[1] - h * 1.08); ctx.fillText('RAID', q[0], q[1] - h * 1.08); }
    ctx.restore(); I.lights.push({ x: q[0], y: cy, r: h * 0.9, c: '190,110,255', k: 0.7 * k }); }
  /* rain or snow, falling over the whole view; the drops are placed by hash so they need no state */
  function weather(I, now) { const ctx = I.ctx, W = I.W || 880, H = I.H || 620, t = now / 1000, cx = I.cam.x, cy = I.cam.y; ctx.save(); ctx.setTransform(I.DPR * I.S, 0, 0, I.DPR * I.S, 0, 0);
    if (T.weather === 'rain') { ctx.strokeStyle = 'rgba(200,220,240,.45)'; ctx.lineWidth = 1; ctx.beginPath(); for (let i = 0; i < 160; i++) { const x = (S.hash(i, 1) * W * 1.2 - t * 40 + cx * 0.2) % (W * 1.2), y = (S.hash(i, 2) * H + t * 520 + i * 7 + cy * 0.2) % (H + 40) - 20; ctx.moveTo(x, y); ctx.lineTo(x - 3, y + 14); } ctx.stroke(); ctx.fillStyle = 'rgba(120,140,160,.12)'; ctx.fillRect(0, 0, W, H); }
    else { ctx.fillStyle = 'rgba(255,255,255,.9)'; for (let i = 0; i < 110; i++) { const s = 1 + S.hash(i, 9) * 1.6, x = (S.hash(i, 1) * W + Math.sin(t * 0.8 + i) * 12 + t * 8) % W, y = (S.hash(i, 2) * H + t * (40 + s * 25) + i * 3) % (H + 20) - 10; ctx.beginPath(); ctx.arc(x, y, s, 0, Math.PI * 2); ctx.fill(); } }
    ctx.restore(); }
  function sky(I, n) { n = n || 0; const g = I.ctx.createLinearGradient(0, 0, 0, I.H || 620); const mix = (a, b) => { const A = NW.hex(a), B2 = NW.hex(b); return NW.rgb(A.map((v, i) => Math.round(v + (B2[i] - v) * n))); }; const day = T.sky || ['#9ccdf5', '#dfeefb']; g.addColorStop(0, mix(day[0], '#0b1730')); g.addColorStop(1, mix(day[1], '#16325a')); I.ctx.fillStyle = g; I.ctx.fillRect(0, 0, I.W || 880, I.H || 620); }
  /* the classified ground for a state, for anything that wants to ask what is where */
  const groundOf = state => { T = terrainOf(state); const L = S.layout(state); groundFor(L, state); return { g: ground, el: elev, G, T }; };
  const hit = (L, g) => L.buildings.find(b => b.tier > 0 && Math.abs(b.gx + 0.5 - g[0]) < 0.75 && Math.abs(b.gy + 0.5 - g[1]) < 0.75);
  NW.Land = { TERRAINS, TERRAIN_KEYS, terrainOf, groundColour, treeOf, onRoad, makeMe, goTo, stepMe, siteFor, drawLand, sky, hit, groundOf, riftOf };
})();
