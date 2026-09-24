/* NextWorld · battlecheck: is every fight winnable, and none of them free?
 * Plays the real battle simulation headless, on auto, for learners at
 * several levels against every rift they can enter, over many seeds, and
 * prints the win rate, the average length and the stars. Auto casts each
 * spell when it is worth it; a player aiming by hand does better.
 *   node tools/battlecheck.js                one class in detail (CLS=knight, default necromancer)
 *   node tools/battlecheck.js --all          every class side by side, so no class is the only right answer
 *   node tools/battlecheck.js --tune         finds each class's edge so its Nightmare at level 5 and Hell at level 13 land on target
 * BARE=1 plays a learner who never spends souls; N sets the seeds. */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
function loadWorld() {
  const g = { console, Date, Math, JSON, Set, Map, Object, Array, Number, String, RegExp, Error, performance: { now: () => 0 } };
  g.window = g; g.self = g; g.document = { createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} }, appendChild() {}, addEventListener() {}, setAttribute() {}, getContext: () => null }), createTextNode: () => ({}) };
  const ctx = vm.createContext(g);
  ['engine', 'assets', 'data', 'plans', 'state', 'eras', 'homes', 'land', 'hq', 'global', 'classes', 'figures', 'hero', 'battle'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'world', f + '.js'), 'utf8'), ctx, { filename: f + '.js' }));
  return g.NW;
}
const NW = loadWorld(), S = NW.State, H = NW.Hero, Bt = NW.Battle;
if (process.env.TUNE) Object.assign(Bt.TUNE, JSON.parse(process.env.TUNE));
if (process.env.RIFTS) { const m = JSON.parse(process.env.RIFTS); Object.keys(m).forEach(k => { H.RIFTS[k].mult = m[k]; }); }
/* a learner of a class with n projects finished, seven steps each, the power up; ranks and a weapon edge as a steady player would have them */
function learner(cls, n, invest) { const s = S.normalise({ mode: 'dev', biome: 'plains' }); s.done = NW.PROJECTS.slice(0, n).map(p => p.title); s.life.steps = n * 7; s.life.at = Date.now(); s.life.lastDone = Date.now(); s.life.power = 1; H.choose(s, cls); if (invest) { const h = H.hero(s); H.unlocked(s).forEach(u => { h.ranks[u.id] = Math.min(H.RANK_MAX, Math.floor(n / 20)); }); const w = H.equipped(s); if (w) h.enhance[w.id] = Math.min(H.PLUS_MAX, Math.floor(n / 12)); } return s; }
function fight(s, kind, seed) { const a = H.army(s), st = H.stats(s); if (process.env.AFFIX && a.weapon) a.weapon = Object.assign({}, a.weapon, { affix: process.env.AFFIX }); const b = Bt.create({ kind, cls: a.cls, wall: a.wall, level: H.level(s), army: a.units, spirit: a.spirit, power: a.power, base: a.base, weapon: a.weapon, spells: H.spells(s).map(x => x.id), phy: st.phy, seed, auto: true, tired: a.tired }); Bt.run(b); return b; }
function play(cls, n, kind) { const s = learner(cls, n, !process.env.BARE); if (H.level(s) < H.RIFTS[kind].at) return null; let won = 0, t = 0, stars = 0; const N = +(process.env.N || 16); for (let i = 0; i < N; i++) { const b = fight(s, kind, 1000 + i * 17); if (b.won) { won++; stars += b.stars; } t += b.t; } return { n, level: H.level(s), rank: H.classOf(H.level(s), s).name, army: H.armySize(s), kind, win: Math.round(won / N * 100), secs: Math.round(t / N), stars: won ? (stars / won).toFixed(1) : '-' }; }
const CASES = [[1, 'raid'], [1, 'ordinary'], [5, 'ordinary'], [10, 'nightmare'], [20, 'nightmare'], [60, 'hell'], [90, 'hell']];
const rows = [];
if (process.argv.includes('--tune')) {
  /* the edge is one number a class carries: its whole line and every spell hit that much harder. Find it by halving the gap. */
  const TARGET = 78, score = id => { const a = play(id, 10, 'nightmare'), b = play(id, 60, 'hell'); return (a.win + b.win) / 2; };
  NW.Classes.LIST.forEach(c => { let lo = 0.5, hi = 3; for (let i = 0; i < 8; i++) { c.edge = (lo + hi) / 2; if (score(c.id) < TARGET) lo = c.edge; else hi = c.edge; } c.edge = Math.round((lo + hi) / 2 * 100) / 100; console.log(c.id.padEnd(15), 'edge', c.edge.toFixed(2), 'scores', score(c.id)); });
} else if (process.argv.includes('--all')) {
  console.log('class          ' + CASES.map(([n, k]) => (k.slice(0, 4) + '@' + n).padStart(11)).join(''));
  NW.Classes.LIST.forEach(c => { const r = CASES.map(([n, k]) => play(c.id, n, k)); rows.push({ cls: c.id, r }); console.log(c.id.padEnd(15) + r.map(x => x ? (x.win + '% ' + x.secs + 's').padStart(11) : '         -').join('')); });
} else {
  const cls = process.env.CLS || 'necromancer';
  console.log('projects level rank                army  rift       win%  secs  stars');
  [1, 3, 5, 10, 20, 35, 60, 90].forEach(n => ['raid', 'ordinary', 'nightmare', 'hell'].forEach(kind => { const r = play(cls, n, kind); if (!r) return; rows.push(r); console.log(String(r.n).padStart(8), String(r.level).padStart(5), ' ' + r.rank.padEnd(18), String(r.army).padStart(4), ' ' + r.kind.padEnd(10), String(r.win).padStart(4), String(r.secs).padStart(5), String(r.stars).padStart(6)); }));
}
module.exports = { rows };
