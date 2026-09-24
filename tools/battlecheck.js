/* NextWorld · battlecheck: is every fight winnable, and none of them free?
 * Plays the real battle simulation headless, on auto, for learners at
 * several levels against every rift they can enter, over many seeds, and
 * prints the win rate, the average length and the stars. Auto casts on
 * cooldown at the front of the line; a player aiming by hand does better.
 *   node tools/battlecheck.js */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');
function loadWorld() {
  const g = { console, Date, Math, JSON, Set, Map, Object, Array, Number, String, RegExp, Error, performance: { now: () => 0 } };
  g.window = g; g.self = g; g.document = { createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} }, appendChild() {}, addEventListener() {}, setAttribute() {}, getContext: () => null }), createTextNode: () => ({}) };
  const ctx = vm.createContext(g);
  ['engine', 'assets', 'data', 'plans', 'state', 'eras', 'homes', 'land', 'hq', 'global', 'hero', 'battle'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'world', f + '.js'), 'utf8'), ctx, { filename: f + '.js' }));
  return g.NW;
}
const NW = loadWorld(), S = NW.State, H = NW.Hero, Bt = NW.Battle;
if (process.env.TUNE) Object.assign(Bt.TUNE, JSON.parse(process.env.TUNE));
if (process.env.RIFTS) { const m = JSON.parse(process.env.RIFTS); Object.keys(m).forEach(k => { H.RIFTS[k].mult = m[k]; }); }
/* a learner with n projects finished, seven steps each, the power up; ranks and a weapon edge as a steady player would have them */
function learner(n, invest) { const s = S.normalise({ mode: 'prod', biome: 'plains' }); s.done = NW.PROJECTS.slice(0, n).map(p => p.title); s.life.steps = n * 7; s.life.at = Date.now(); s.life.lastDone = Date.now(); s.life.power = 1; if (invest) { const h = H.hero(s); H.unlocked(s).forEach(u => { h.ranks[u.id] = Math.min(H.RANK_MAX, Math.floor(n / 20)); }); const w = H.equipped(s); if (w) h.enhance[w.id] = Math.min(H.PLUS_MAX, Math.floor(n / 12)); } return s; }
function fight(s, kind, seed) { const a = H.army(s), st = H.stats(s); if (process.env.AFFIX && a.weapon) a.weapon = Object.assign({}, a.weapon, { affix: process.env.AFFIX }); const b = Bt.create({ kind, level: H.level(s), army: a.units, spirit: a.spirit, power: a.power, base: a.base, weapon: a.weapon, spells: H.spells(s).map(x => x.id), phy: st.phy, seed, auto: true, tired: a.tired }); Bt.run(b); return b; }
const rows = [];
[1, 3, 5, 10, 20, 35, 60, 90].forEach(n => { const s = learner(n, !process.env.BARE); ['raid', 'ordinary', 'nightmare', 'hell'].forEach(kind => { if (H.level(s) < H.RIFTS[kind].at) return; let won = 0, t = 0, stars = 0; const N = +(process.env.N || 16); for (let i = 0; i < N; i++) { const b = fight(s, kind, 1000 + i * 17); if (b.won) { won++; stars += b.stars; } t += b.t; } rows.push({ n, level: H.level(s), cls: H.classOf(H.level(s)).name, army: H.armySize(s), kind, win: Math.round(won / N * 100), secs: Math.round(t / N), stars: won ? (stars / won).toFixed(1) : '-' }); }); });
console.log('projects level class              army  rift       win%  secs  stars');
rows.forEach(r => console.log(String(r.n).padStart(8), String(r.level).padStart(5), ' ' + r.cls.padEnd(18), String(r.army).padStart(4), ' ' + r.kind.padEnd(10), String(r.win).padStart(4), String(r.secs).padStart(5), String(r.stars).padStart(6)));
module.exports = { rows };
