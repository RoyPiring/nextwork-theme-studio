/* NextWorld · personas: a hundred learners, sixty days, the real economy
 * Loads src/world the way the tests do and plays each learner's cadence
 * through State.applyProjectReading, so every number here comes from the
 * code that ships. Retention is a stated proxy, not a measurement: once a
 * week each learner rolls to stay, at a base rate for their cadence, lower
 * for every visit that week that found embers, showed nothing new or had
 * nowhere left to live, higher for a week that built, grew or levelled up.
 *   node tools/personas.js            the table
 *   node tools/personas.js --json     the raw rows */
'use strict';
const fs = require('fs'), path = require('path'), vm = require('vm');

function loadWorld() {
  const g = { console, Date, Math, JSON, Set, Map, Object, Array, Number, String, RegExp, Error, performance: { now: () => 0 } };
  g.window = g; g.self = g; g.document = { createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} }, appendChild() {}, addEventListener() {}, setAttribute() {}, getContext: () => null }), createTextNode: () => ({}) };
  const ctx = vm.createContext(g);
  ['engine', 'assets', 'data', 'plans', 'state', 'eras', 'homes', 'land', 'hq', 'global', 'readers', 'views'].forEach(f => vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'world', f + '.js'), 'utf8'), ctx, { filename: f + '.js' }));
  return g.NW;
}
const NW = loadWorld(), S = NW.State, E = NW.Eras, DAY = S.REAL_DAY;

/* the cadences: how often a learner shows up, and what a visit is */
const CADENCES = [
  { name: 'daily', share: 20, days: () => true, partial: 0.2, base: 0.985 },
  { name: 'weekdays', share: 15, days: d => d % 7 < 5, partial: 0.25, base: 0.98 },
  { name: 'weekender', share: 15, days: d => d % 7 >= 5, projects: 2, partial: 0.1, base: 0.975 },
  { name: 'twice a week', share: 15, days: d => d % 7 === 1 || d % 7 === 4, partial: 0.3, base: 0.97 },
  { name: 'weekly', share: 15, days: d => d % 7 === 2, partial: 0.3, base: 0.96 },
  { name: 'bursty', share: 10, days: d => d % 17 < 5, partial: 0.15, base: 0.965 },
  { name: 'returner', share: 10, days: d => d >= 14, partial: 0.2, base: 0.975 }
];
let seedN = 7; const rnd = () => { seedN = (seedN * 1103515245 + 12345) & 0x7fffffff; return seedN / 0x7fffffff; };

function play(cad, id) {
  const t0 = Date.UTC(2026, 8, 7, 9, 0, 0) + id * 977;   /* a Monday morning, each learner a little apart */
  const s = S.normalise({ mode: 'prod', biome: 'plains' }); let alive = true, control = true, sessions = 0, dark = 0, flat = 0, full = 0, retiredOn = null; const eras = [E.eraOf(s).name];
  let lastLevel = 1; let lastSeen = { built: 0, citizens: 1, sparks: 0 }; let week = { dark: 0, flat: 0, full: 0, grew: false };
  for (let d = 0; d < 60 && (alive || control); d++) {
    if (!alive) { if (d % 7 === 6 && control && rnd() > cad.base) control = false; continue; }
    if (d % 7 === 6) { /* the week's roll: one draw against the game's odds and against the bare base, so the game's own effect can be read off */ const p = cad.base - 0.04 * week.dark - 0.02 * week.flat - 0.01 * week.full + (week.grew ? 0.02 : 0); const r = rnd(); if (control && r > cad.base) control = false; if (r > Math.min(0.999, p)) { alive = false; retiredOn = d; } week = { dark: 0, flat: 0, full: 0, grew: false }; }
    if (!cad.days(d)) continue;
    const now = t0 + d * DAY; sessions++;
    const pwOnArrival = S.power(s, now), citOnArrival = S.citizens(s, now);
    /* the visit: a project, or a few steps of one */
    const partial = rnd() < cad.partial; const projects = partial ? 0 : (cad.projects || 1);
    let steps = 0;
    for (let k = 0; k < projects; k++) { const nx = S.nextProject(s); if (!nx) break; for (let st = 1; st <= 7; st++) S.applyProjectReading(s, { title: nx.title, done: st, total: 7 }, now + k * 1200000 + st * 120000); steps += 7; }
    if (partial) { const nx = S.nextProject(s); if (nx) { const had = s.steps[nx.title] ? s.steps[nx.title].done : 0; const to = Math.min(7, had + 2 + Math.floor(rnd() * 2)); S.applyProjectReading(s, { title: nx.title, done: to, total: 7 }, now + 300000); steps += to - had; } }
    S.crew(s, now + 3600000);
    const L = S.layout(s), after = { built: E.score(s), citizens: S.citizens(s, now + 3600000), sparks: s.wallet.sparks };
    const era = E.eraOf(s).name; if (era !== eras[eras.length - 1]) eras.push(era);
    /* what the visit felt like */
    const embers = pwOnArrival <= S.EMBER + 0.01 && S.power(s, now + 3600000) < 0.5; if (embers) { dark++; week.dark++; }   /* dark: found embers and left them that way */
    const nothingNew = after.built === lastSeen.built && after.citizens <= lastSeen.citizens && S.levelOf(s).level === lastLevel; if (nothingNew) { flat++; week.flat++; }
    if (S.population(s, now, L.capacity) >= L.capacity) { full++; week.full++; }
    if (after.built > lastSeen.built || after.citizens > citOnArrival || era !== eras[eras.length - 2] || S.levelOf(s).level > lastLevel) week.grew = true;
    lastLevel = S.levelOf(s).level; lastSeen = after; void steps;
  }
  const end = t0 + 60 * DAY, c = S.contract(s, end);
  return { id, cadence: cad.name, retained: alive, control, retiredOn, sessions, built: E.score(s), era: E.eraOf(s).name, eras: eras.length - 1, citizens: S.citizens(s, end), capacity: S.layout(s).capacity, power: +S.power(s, end).toFixed(2), sparks: s.wallet.sparks, dark, flat, full, bonusCap: s.life.bonusCap, weekMet: c.met };
}

const rows = []; let id = 0; CADENCES.forEach(c => { for (let i = 0; i < c.share; i++) rows.push(play(c, id++)); });
if (process.argv.includes('--json')) { console.log(JSON.stringify(rows, null, 1)); process.exit(0); }
const pct = (a, b) => Math.round(a / b * 100) + '%';
const by = {}; rows.forEach(r => { (by[r.cadence] = by[r.cadence] || []).push(r); });
console.log('cadence        n  retained  control  built  era(final)   citizens/cap  power  sparks  dark  flat  full');
Object.keys(by).forEach(k => { const g = by[k], n = g.length, avg = f => (g.reduce((a, r) => a + f(r), 0) / n); const eraN = {}; g.forEach(r => { eraN[r.era] = (eraN[r.era] || 0) + 1; }); const era = Object.keys(eraN).sort((a, b) => eraN[b] - eraN[a])[0];
  console.log(k.padEnd(14), String(n).padStart(2), pct(g.filter(r => r.retained).length, n).padStart(9), pct(g.filter(r => r.control).length, n).padStart(8), avg(r => r.built).toFixed(0).padStart(6), era.padEnd(12), (avg(r => r.citizens).toFixed(0) + '/' + avg(r => r.capacity).toFixed(0)).padStart(13), avg(r => r.power).toFixed(2).padStart(6), avg(r => r.sparks).toFixed(0).padStart(7), avg(r => r.dark).toFixed(1).padStart(5), avg(r => r.flat).toFixed(1).padStart(5), avg(r => r.full).toFixed(1).padStart(5)); });
console.log('all'.padEnd(14), String(rows.length).padStart(2), pct(rows.filter(r => r.retained).length, rows.length).padStart(9), pct(rows.filter(r => r.control).length, rows.length).padStart(8));
console.log('');
console.log('retained: with the game signals. control: the same draws with no game at all. dark: visits that found embers. flat: visits that showed nothing new. full: visits with nowhere left to live');
