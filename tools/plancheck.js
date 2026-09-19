/* NextWorld · plancheck: does every plan leave room?
 * Loads the plans the way the game does and lays every footprint out:
 * roads, lots, civic buildings, the era's builds, zones and fields. Then it
 * reports anything that overlaps something else, anything standing on a
 * road, and anything closer than the gap a planner keeps between buildings.
 *   node tools/plancheck.js           the report (exit 1 on a conflict) */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
function loadWorld() {
  const g = { console, Date, Math, JSON, Set, Map, Object, Array, Number, String, RegExp, Error, performance: { now: () => 0 } };
  g.window = g; g.self = g; g.document = { createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} }, appendChild() {}, addEventListener() {}, setAttribute() {}, getContext: () => null }), createTextNode: () => ({}) };
  const ctx = vm.createContext(g);
  ['engine', 'assets', 'data', 'plans', 'state', 'eras', 'homes', 'land', 'hq', 'global'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'world', f + '.js'), 'utf8'), ctx, { filename: f + '.js' }));
  return g.NW;
}
const NW = loadWorld();
/* what each kind of building stands on: [dx, dy, w, d] from its plan point, in tiles, including its plinth */
const FOOT = {
  campfire: [0, 0, 1, 1], board: [0, 0, 1, 1], pump: [0, 0, 1, 1], foodcache: [0, 0, 1, 1], woodshed: [0, 0, 1, 1], lantern: [0, 0, 1, 1], shelter: [0, 0, 1, 1], well: [0, 0, 1, 1], watchtower: [0, 0, 1, 1],
  windmill: [0, 0, 1, 1], tank: [0, 0, 1, 1], workshop: [0, 0, 1.3, 1.3], barn: [0, 0, 2, 1.6], coop: [0, 0, 1.2, 1.2], townhall: [0, 0, 2.2, 2.2], townhall2: [0, 0, 2.2, 2.2], school: [0, 0, 2.2, 1.4], store: [0, 0, 2, 1.2], community: [0, 0, 1.2, 1.2],
  cityhall: [0, 0, 6, 2.9], hospital: [-0.2, -0.2, 3.4, 2.4], library: [-0.15, -0.15, 2.2, 1.8], firestation: [0, 0, 1.7, 1.3], datacentre: [0, 0, 1.2, 1.2], park: [0, 0, 3, 3], station: [-0.2, 0, 2.8, 1.6], university: [0, 0, 6, 3.2], stadium: [0, 0, 4, 3], solar: [0, 0, 3, 2], watertower: [0, 0, 1, 1],
  capitol: [-0.5, -0.5, 7, 3.5], arch: [0, 0, 2, 1], obelisk: [-0.3, -0.3, 1.6, 1.6], pool: [-0.15, -0.15, 4.3, 5.3], memorial: [-0.4, -0.4, 1.8, 1.8], skypad: [-0.5, -0.5, 3, 3], hoverport: [-0.3, -0.3, 2.6, 2.6], palace: [0, 0, 6, 3.2],
  greenhouse: [0, 0, 2, 1.2], verticalfarm: [0, 0, 2, 2], market: [0, 0, 2, 2], gasworks: [0, 0, 2, 2], waterworks: [0, 0, 2, 2], hydroponic: [0, 0, 1, 1], windturbine: [0, 0, 1, 1], reservoir: [0, 0, 3, 2], fusion: [0, 0, 2, 2], skyfarm: null, windturbine: [0, 0, 1, 1], skyisland: null, rail: null, stockade: null, paddock: null
};
const GAP = 0.3;   /* the least a planner leaves between two things */
const overlap = (a, b, gap) => a[0] < b[0] + b[2] + gap && b[0] < a[0] + a[2] + gap && a[1] < b[1] + b[3] + gap && b[1] < a[1] + a[3] + gap;
let bad = 0;
NW.PLANS.forEach(plan => {
  const things = [];
  plan.civic.concat(plan.builds).forEach(c => { if (c.rect) { if (c.kind === 'paddock') things.push({ name: c.kind, r: c.rect.slice(), soft: true }); return; } if (!c.at) return; const f = FOOT[c.kind]; if (f === null) return; if (!f) { console.log('  ? no footprint for ' + c.kind); return; } things.push({ name: c.kind + '@' + c.at.join(','), r: [c.at[0] + f[0], c.at[1] + f[1], f[2], f[3]] }); });
  plan.lotList.forEach(q => things.push({ name: 'lot@' + q.join(','), r: [q[0] - 0.2 + (q.dx || 0), q.side === 'south' ? q[1] - 0.75 : q.side === 'north' ? q[1] + 0.05 : q[1] - 0.2, 1.4, 1.4 + (q.side === 'south' ? 0.3 : 0)], lot: true }));   /* as the builder places a home: back from its street, a porch toward it */
  const roads = new Set(plan.roadSet);
  const onRoad = r => { for (let x = Math.floor(r[0]); x < r[0] + r[2]; x++) for (let y = Math.floor(r[1]); y < r[1] + r[3]; y++) if (roads.has(x + ',' + y)) return x + ',' + y; return null; };
  const issues = [];
  things.forEach(t => { if (t.soft) return; const road = onRoad(t.r); if (road) issues.push(t.name + ' stands on the road at ' + road); });
  for (let i = 0; i < things.length; i++) for (let j = i + 1; j < things.length; j++) { const a = things[i], b = things[j]; if (a.lot && b.lot) continue; if (overlap(a.r, b.r, 0)) issues.push(a.name + ' overlaps ' + b.name); else if (!a.soft && !b.soft && overlap(a.r, b.r, GAP)) issues.push(a.name + ' is within ' + GAP + ' of ' + b.name); }
  plan.landscape.fields.forEach(f => things.forEach(t => { if (!t.lot && !t.soft && overlap(t.r, f, 0)) issues.push(t.name + ' stands in the field at ' + f.join(',')); }));
  const lots = plan.lotList.length, homes = Math.max(0, (NW.PLANS[NW.PLANS.indexOf(plan) + 1] ? NW.PLANS[NW.PLANS.indexOf(plan) + 1].threshold : 220) - plan.builds.length);
  console.log(plan.id.padEnd(11) + ' lots ' + String(lots).padStart(3) + '  homes before the next era ' + String(homes).padStart(3) + (lots < homes ? '  SHORT of lots' : '') + '  issues ' + issues.length);
  issues.forEach(m => console.log('    ' + m)); bad += issues.length;
});
process.exit(bad ? 1 : 0);
