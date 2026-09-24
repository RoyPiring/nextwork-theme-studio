'use strict';
/* NextWorld: the parts that can be checked without a canvas - the state
 * model, the land layout, and the readers that look at a page. */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { loadPage, parseHTML: parseInto } = require('./harness');
/* a document with the given body, built the way the harness builds pages */
function parseHTML(html) { const p = loadPage({ page: 'src/popup.html', scripts: [], settings: {} }); const doc = p.doc; doc.body.textContent = ''; parseInto(html, doc, doc.body); return doc; }

function loadWorld() {
  const g = { console, Date, Math, JSON, Set, Map, Object, Array, Number, String, RegExp, Error, performance: { now: () => 0 } };
  g.window = g; g.self = g; g.document = { createElement: () => ({ style: {}, dataset: {}, classList: { add() {}, remove() {} }, appendChild() {}, addEventListener() {}, setAttribute() {}, getContext: () => null }), createTextNode: () => ({}) };
  const ctx = vm.createContext(g);
  ['engine', 'assets', 'data', 'plans', 'state', 'eras', 'homes', 'land', 'hq', 'global', 'classes', 'figures', 'hero', 'battle', 'readers', 'views'].forEach(f => {
    vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'world', f + '.js'), 'utf8'), ctx, { filename: f + '.js' });
  });
  return g.NW;
}
const NW = loadWorld();
const S = NW.State;

test('the catalogue is the 90 NextWork projects, each with a building', () => {
  assert.equal(NW.PROJECTS.length, 90);
  NW.SERIES.forEach(sr => assert.ok(NW.B[sr.kind], sr.name + ' has no drawer for ' + sr.kind));
  NW.SAMPLE_LISTS.forEach(l => assert.ok(NW.B[l.kind], l.name + ' has no drawer for ' + l.kind));
});

test('a fresh world is a tent: nothing done, production mode', () => {
  const s = S.normalise(null);
  assert.equal(s.done.length, 0);
  assert.equal(s.mode, 'prod');
  assert.equal(S.houseWord(s)[1], 'Tent');
  assert.equal(S.layout(s).buildings.length, 0);
});

test('the first projects build what the camp needs; a tent only once it has them', () => {
  const s = S.normalise(null);
  S.finish(s, 'Set Up An AWS Account');
  let L = S.layout(s);
  assert.equal(L.infra.length, 1, 'one project, one piece of infrastructure');
  assert.equal(L.infra[0].kind, 'pump', 'water comes first');
  assert.equal(L.buildings.filter(b => b.series).length, 0, 'no tent yet');
  assert.equal(L.nextBuild.kind, 'foodcache');
  ['Join the Cloud Beginner Challenge!', 'Host a Website on Amazon S3', 'Cloud Security with AWS IAM', 'Build a Virtual Private Cloud'].forEach(t => S.finish(s, t));
  L = S.layout(s);
  assert.equal(L.plan.id, 'fort', 'five projects: the fort');
  assert.equal(L.nextBuild.kind, 'stockade', 'and the fort wants its walls first');
  assert.ok(L.capacity >= 4);
  S.finish(s, 'Set Up An AWS Account');
  assert.equal(s.done.length, 5, 'finishing twice counts once');
});

test('nine terrains, nine different maps: only the plains have a river', () => {
  const Land = NW.Land; assert.equal(Land.TERRAIN_KEYS.length, 9);
  const count = (biome, k) => { const s = S.normalise({ biome, mode: 'dev' }); const { g, G } = Land.groundOf(s); let n = 0; for (let i = 0; i < g.length; i++) if (g[i] === G[k]) n++; return n; };
  assert.ok(count('plains', 'WATER') > 60, 'the plains have the river');
  ['sandy', 'island', 'mountains', 'snow', 'rain', 'zen', 'savanna'].forEach(b => assert.equal(count(b, 'WATER'), 0, b + ' has no river'));
  const pond = count('forest', 'WATER'); assert.ok(pond > 0 && pond <= 20, 'the forest has a pond, not a river');
  [['sandy', 'WASH'], ['sandy', 'ROCK'], ['island', 'OCEAN'], ['island', 'BEACH'], ['island', 'RIDGE'], ['mountains', 'SNOW'], ['mountains', 'SCREE'], ['snow', 'DRIFT'], ['rain', 'BOG'], ['zen', 'GRAVEL'], ['savanna', 'SCREE'], ['forest', 'WOOD']].forEach(([b, k]) => assert.ok(count(b, k) > 0, b + ' has its ' + k.toLowerCase()));
  const { el } = Land.groundOf(S.normalise({ biome: 'island', mode: 'dev' })); let up = 0, down = 0; for (let i = 0; i < el.length; i++) { if (el[i] > 0) up++; if (el[i] < 0) down++; }
  assert.ok(down > 200 && up > 20, 'the island steps down to the sea and has hills');
});

test('the hash is uniform on [0, 1), so heights reach the peaks', () => {
  let max = 0, sum = 0; for (let i = 0; i < 2000; i++) { const v = S.hash(i * 3, i * 5 + 1); max = Math.max(max, v); sum += v; }
  assert.ok(max > 0.95 && sum / 2000 > 0.45 && sum / 2000 < 0.55);
});

test('the place is never empty on the day it levels up: every finished project stays a home, rebuilt in the era', () => {
  const s = S.normalise({ mode: 'dev', done: NW.PROJECTS.slice(0, 90).map(p => p.title), lists: [{ name: 'Other', kind: 'workshop', total: 12, done: 12, projects: [] }] });
  const L = S.layout(s); assert.equal(L.plan.id, 'capital');
  assert.equal(L.infra.length, 12, 'list projects count toward the capital and its monuments');
  assert.equal(L.infra.map(b => b.kind).slice(0, 8).join(), ['capitol', 'arch', 'obelisk', 'pool', 'memorial', 'cityhall', 'library', 'park'].join()); assert.ok(L.infra.some(b => b.kind === 'hydroponic') && L.infra.some(b => b.kind === 'reservoir'), 'and then the capital feeds and waters itself');
  assert.ok(L.buildings.filter(b => b.series).length >= 80, 'the homes from every earlier era are still there');
  const k = S.normalise({ mode: 'dev', done: NW.PROJECTS.map(p => p.title), lists: [{ name: 'Other', kind: 'workshop', total: 45, done: 45, projects: [] }] });
  const K = S.layout(k); assert.equal(K.plan.id, 'kingdom'); assert.equal(K.infra.map(b => b.kind).slice(0, 3).join(), 'skypad,hoverport,fusion'); assert.equal(K.infra.filter(b => b.kind === 'skyisland').length, 6, 'six districts float');
});

test('the battery: a step adds eight percent, a project fills it, a day of grace, then ten percent a day down to an ember', () => {
  const day = S.REAL_DAY, now = Date.now(); const s = S.normalise({ mode: 'prod' });
  assert.equal(S.power(s, now), 1, 'nothing has happened yet: full');
  S.applyProjectReading(s, { title: 'Set Up An AWS Account', done: 7, total: 7 }, now);
  assert.ok(s.done.includes('Set Up An AWS Account')); assert.equal(S.power(s, now), 1);
  assert.equal(S.power(s, now + 1 * day), 1, 'a day of grace'); assert.equal(+S.power(s, now + 2 * day).toFixed(2), 0.9); assert.equal(+S.power(s, now + 4 * day).toFixed(2), 0.7); assert.equal(+S.power(s, now + 7 * day).toFixed(2), 0.4, 'a week away: the mill has stopped, not embers'); assert.equal(S.power(s, now + 30 * day), S.EMBER, 'an ember, never out');
  const later = now + 4 * day; S.applyProjectReading(s, { title: 'Host a Website on Amazon S3', done: 2, total: 7 }, later);
  assert.equal(+S.power(s, later).toFixed(2), 0.86, 'two steps ticked at 70%: two eights'); assert.equal(s.steps['Host a Website on Amazon S3'].done, 2);
  S.applyProjectReading(s, { title: 'Host a Website on Amazon S3', done: 1, total: 7 }, later); assert.equal(s.steps['Host a Website on Amazon S3'].done, 2, 'steps never fall');
  assert.equal(s.pulse.steps, 0, 'and a reading that adds nothing pulses nothing');
  const fresh = S.normalise({ mode: 'prod' }); S.applyProjectReading(fresh, { title: 'Set Up An AWS Account', done: 1, total: 7 }, now); assert.equal(S.power(fresh, now + 9 * day), 1, 'the clock does not start on a first step');
  S.applyProjectReading(fresh, { title: 'Set Up An AWS Account', done: 0, total: 0 }, now); assert.equal(fresh.done.length, 0, 'a reading with no step list finishes nothing');
});

test('sparks, citizens and the contract come from steps and projects; the crew builds the pegged lists while the power holds', () => {
  const day = S.REAL_DAY, now = Date.now(); const s = S.normalise({ mode: 'prod' });
  S.applyProjectReading(s, { title: 'Set Up An AWS Account', done: 3, total: 7 }, now); assert.equal(s.wallet.sparks, 3, 'a spark a step');
  S.applyProjectReading(s, { title: 'Set Up An AWS Account', done: 7, total: 7 }, now); assert.equal(s.wallet.sparks, 3 + 4 + 10 + 25, 'four more steps, ten for the project, and the contract kept');
  assert.ok(S.citizens(s, now) >= 2, 'people moved in while the power was up'); assert.ok(S.citizens(s, now) <= S.layout(s).capacity);
  const c = S.contract(s, now); assert.equal(c.week.projects, 1); assert.equal(c.week.steps, 7); assert.equal(c.met, true, 'one project meets the week'); assert.ok(c.infra, 'the week asks for the next piece of infrastructure'); assert.equal(s.life.bonusCap, 4, 'four more can live here, for good'); assert.ok(c.daysLeft >= 1 && c.daysLeft <= 7);
  assert.equal(S.citizens(s, now + 30 * day), Math.max(1, s.life.citizens - 25), 'after five idle days, one leaves a day');
  s.wallet.sparks = 60; assert.ok(S.buy(s, 'hat:cowboy'), 'fifty sparks buys a hat'); assert.ok(S.owns(s, 'hat:cowboy')); assert.equal(S.buy(s, 'body:robot'), false, 'ten left: no robot'); assert.ok(S.owns(s, 'hat:cap'), 'the cap was always free');
  S.applyPortfolioReading(s, { lists: [{ name: 'AWS Networks', count: 5, blurb: 'x'.repeat(200) }], name: 'Somebody' });
  assert.equal(s.lists[0].done, 0, 'a portfolio is pegged out, not built'); assert.equal(s.lists[0].blurb.length, 80); assert.equal(s.name, 'You', 'the page does not name you');
  assert.equal(S.crew(s, now).length, 0, 'the crew starts the clock'); assert.equal(S.crew(s, now + 2 * day + 1000).length, 2, 'two days: two buildings'); assert.equal(s.lists[0].done, 2);
  assert.equal(S.crew(s, now + 10 * day).length, 3, 'the three left in the list, while the power held'); assert.equal(s.lists[0].done, 5);
  const lv = S.levelOf(s); assert.equal(S.xp(s), 7 * 5 + NW.PROJECTS.find(p => p.title === 'Set Up An AWS Account').xp, 'five XP a step, the project when it stands'); assert.equal(lv.level, 1, 'ninety-five XP: still level one'); assert.ok(lv.at > 0.9 && lv.at < 1, 'nearly at level two'); assert.equal(lv.next, 100);
  const cap0 = s.life.bonusCap, sp0 = s.wallet.sparks; S.event(s, 'step', now); assert.equal(S.levelOf(s).level, 2, 'one more step: level two'); assert.equal(s.levelled, 2, 'and the panel is told'); assert.equal(s.life.bonusCap, cap0 + 1, 'a level is room for one more'); assert.equal(s.wallet.sparks, sp0 + 1 + 10, 'and ten sparks');
  const t = S.normalise({ mode: 'prod' }); ['Host a Website on Amazon S3', 'Set Up An AWS Account'].forEach(title => { for (let k = 1; k <= 7; k++) S.applyProjectReading(t, { title, done: k, total: 7 }, now); }); assert.ok(t.levelled >= 2, 'a project that crosses a level says so too'); assert.ok(S.levelOf(t).level >= 2);
  const r = S.normalise(JSON.parse(JSON.stringify(S.applyPortfolioReading(S.normalise({}), { lists: [{ name: 'X', count: 9 }] })))); assert.equal(r.lists[0].done, 0, 'a pegged list stays pegged across a reload');
});

test('the hero: a necromancer from the first project, sublimated at five and ten, every stat doubled each time', () => {
  const H = NW.Hero, at = n => { const s = S.normalise({ mode: 'prod' }); s.done = NW.PROJECTS.slice(0, n).map(p => p.title); s.life.steps = n * 7; return s; };
  const one = at(1); assert.equal(H.classOf(H.level(one)).name, 'Necromancer'); assert.equal(H.stats(one).spi, 20 * H.level(one), 'spirit twenty a level');
  const s4 = at(8), s5 = at(10); assert.equal(H.level(s4), 4); assert.equal(H.level(s5), 5); assert.equal(H.classOf(5).name, 'Bone Lord'); assert.equal(H.stats(s5).spi, 20 * 5 * 2, 'sublimation doubles');
  assert.equal(H.classOf(10).name, 'Undying Sovereign'); assert.ok(H.armySize(s5) > H.armySize(one));
  assert.equal(H.unlocked(one).map(u => u.id).join(), 'worker,warrior'); assert.ok(H.unlocked(s5).some(u => u.id === 'mage'));
});

test('every finished project drops its own weapon: type from its series, rarity from how few finish it, one curse', () => {
  const H = NW.Hero, s = S.normalise({ mode: 'prod' }); s.done = NW.PROJECTS.map(p => p.title);
  const all = H.armory(s); assert.equal(all.length, 90, 'ninety projects, ninety weapons');
  const again = H.weaponFor(s, NW.PROJECTS[20].title), once = H.weaponFor(s, NW.PROJECTS[20].title); assert.equal(again.name, once.name, 'the same project always makes the same weapon');
  assert.ok(new Set(all.map(w => w.name + w.series)).size >= 80, 'and they are not all alike');
  assert.ok(all.some(w => w.rarity === 5), 'a whole series of three or more makes a mythic'); assert.ok(all.every(w => w.atk > 0 && H.AFFIX.some(a => a[0] === w.affix)));
  const lone = S.normalise({ mode: 'prod' }); lone.done = [NW.PROJECTS[0].title]; assert.ok(H.weaponFor(lone, NW.PROJECTS[0].title).rarity < 5, 'a one-project series does not hand out a mythic on day one');
});

test('keys from steps, a raid from every finished project, souls from winning, and what souls buy', () => {
  const H = NW.Hero, now = Date.now(), s = S.normalise({ mode: 'prod' });
  S.applyProjectReading(s, { title: 'Set Up An AWS Account', done: 7, total: 7 }, now); H.projectFinished(s, 'Set Up An AWS Account');
  assert.equal(H.keys(s), 1, 'seven steps: one key'); assert.equal(H.stepsToKey(s), 3); assert.ok(H.canEnter(s, 'raid')); assert.ok(H.canEnter(s, 'ordinary')); assert.ok(!H.canEnter(s, 'nightmare'), 'nightmare waits for level five');
  const e = H.enter(s, 'raid'); assert.equal(e.title, 'Set Up An AWS Account'); assert.ok(!H.canEnter(s, 'raid'), 'one raid a project');
  H.enter(s, 'ordinary'); assert.equal(H.keys(s), 0);
  const r = H.reward(s, 'ordinary', true, 3); assert.ok(r.souls > 25); const lost = H.reward(s, 'raid', false, 0); assert.ok(lost.souls > 0 && lost.souls < r.souls, 'a loss still pays a little');
  const souls = H.hero(s).souls; assert.equal(H.rankUp(s, 'warrior'), souls >= 30); if (souls >= 30) assert.equal(H.hero(s).ranks.warrior, 1);
  s.life.steps = 400; assert.equal(H.keys(s), 5, 'keys cap at five');
});

test('the battle is deterministic, a first raid is won, and a hell rift is not free', () => {
  const H = NW.Hero, Bt = NW.Battle, at = n => { const s = S.normalise({ mode: 'prod' }); s.done = NW.PROJECTS.slice(0, n).map(p => p.title); s.life.steps = n * 7; s.life.at = Date.now(); s.life.lastDone = Date.now(); return s; };
  const go = (s, kind, seed) => { const a = H.army(s); return Bt.run(Bt.create({ kind, level: H.level(s), army: a.units, spirit: a.spirit, power: a.power, base: a.base, weapon: a.weapon, spells: H.spells(s).map(x => x.id), phy: H.stats(s).phy, seed, auto: true })); };
  const a = go(at(1), 'raid', 5), b = go(at(1), 'raid', 5); assert.equal(a.t, b.t); assert.equal(a.kills, b.kills, 'the same seed plays the same fight');
  assert.ok(a.won, 'a first raid is won'); assert.ok(a.stars >= 1 && a.stars <= 3);
  let hellWins = 0; for (let i = 0; i < 4; i++) if (go(at(60), 'hell', 300 + i).won) hellWins++; assert.ok(hellWins < 4, 'hell is not won every time by a learner who never spends souls');
  const tired = at(20); tired.life.at = Date.now() - 20 * S.REAL_DAY; assert.ok(H.army(tired).tired, 'power low: the dead are tired'); assert.ok(H.army(tired).units[0].atk < H.army(at(20)).units[0].atk);
});

test('thirteen classes, each whole: six fighters and a crew, five spells, six weapons, three ranks, eight chapters', () => {
  const C = NW.Classes, ids = new Set(), spells = new Set();
  assert.equal(C.LIST.length, 13);
  C.LIST.forEach(k => {
    assert.equal(k.units.length, 6, k.id); assert.equal(k.spells.length, 5, k.id); assert.equal(k.weapons.length, 6, k.id); assert.equal(k.ranks.length, 3, k.id); assert.equal(k.story.length, C.CHAPTERS.length, k.id);
    const st = k.stats; assert.equal(st.str + st.agi + st.spi + st.phy, 50, k.id + ': fifty stat points a level, spread its own way');
    assert.ok(k.units[0].range < 1.5 && !k.units[0].dive, k.id + ': the first fighter holds the line');
    [k.crew].concat(k.units).forEach(u => { assert.ok(!ids.has(u.id), 'one id per fighter: ' + u.id); ids.add(u.id); });
    k.spells.forEach(p => { assert.ok(!spells.has(p.id), 'one id per spell: ' + p.id); spells.add(p.id); assert.ok(['strike', 'single', 'chain', 'volley', 'hex', 'stun', 'shield', 'heal', 'haste', 'summon', 'raise', 'field'].includes(p.fx), p.id); if (p.fx === 'summon') assert.ok(C.units[p.unit], p.id + ' calls a fighter that exists'); });
    k.story.forEach(ch => assert.ok(!/\u2014/.test(ch[0] + ch[1]), 'no em dashes in the story'));
  });
});

test('you choose your class once: the story, the weapons and the army follow it', () => {
  const H = NW.Hero, s = S.normalise({ mode: 'prod' }); s.done = NW.PROJECTS.slice(0, 12).map(p => p.title); s.life.steps = 84;
  assert.ok(!H.chosen(s)); assert.equal(H.chapters(s).filter(c => c.open).length, 0, 'no story before the awakening');
  assert.ok(H.choose(s, 'knight')); assert.ok(!H.choose(s, 'archer'), 'production: the awakening is for good'); assert.equal(H.cls(s).id, 'knight');
  assert.equal(H.classOf(H.level(s), s).name, 'Banneret'); assert.ok(H.army(s).units.every(u => u.id.startsWith('k_')), 'a knight fights with knights');
  assert.ok(H.armory(s).every(w => NW.Classes.byId.knight.weapons.includes(w.type)), 'and carries knight weapons');
  const open = H.chapters(s).filter(c => c.open).map(c => c.key); assert.ok(open.includes('awaken') && open.includes('fort') && open.includes('sub1')); assert.ok(!open.includes('raid'), 'the raid chapter waits for a raid won');
  assert.ok(H.unread(s) > 0); H.markRead(s); assert.equal(H.unread(s), 0);
  const d = S.normalise({ mode: 'dev' }); H.choose(d, 'knight'); assert.ok(H.choose(d, 'archer'), 'dev: try them all'); assert.equal(H.cls(d).id, 'archer');
});

test('every class wins its first raid and its first ordinary rift', () => {
  const H = NW.Hero, Bt = NW.Battle;
  NW.Classes.LIST.forEach(k => { const s = S.normalise({ mode: 'dev' }); s.done = [NW.PROJECTS[0].title]; s.life.steps = 7; s.life.at = Date.now(); s.life.lastDone = Date.now(); H.choose(s, k.id);
    ['raid', 'ordinary'].forEach(kind => { let won = 0; for (let i = 0; i < 3; i++) { const a = H.army(s); if (Bt.run(Bt.create({ kind, cls: a.cls, wall: a.wall, level: H.level(s), army: a.units, spirit: a.spirit, power: a.power, base: a.base, weapon: a.weapon, spells: H.spells(s).map(x => x.id), phy: H.stats(s).phy, seed: 40 + i, auto: true })).won) won++; } assert.ok(won >= 2, k.id + ' ' + kind + ': ' + won + ' of 3'); }); });
});

test('the rift stands on open ground at the edge of the land, clear of the home and every build', () => {
  const at = (n, biome) => { const s = S.normalise({ mode: 'prod', biome }); s.done = NW.PROJECTS.slice(0, n).map(p => p.title); s.life.steps = n * 7; return s; };
  [1, 3, 12, 40, 90].forEach(n => ['plains', 'mountains', 'island'].forEach(biome => {
    const s = at(n, biome), r = NW.Land.riftOf(s), L = S.layout(s);
    assert.ok(r, 'a rift at ' + n + ' projects on ' + biome);
    assert.ok(Math.max(Math.abs(r[0] - 0.5 - S.HOME[0] - 1), Math.abs(r[1] - 0.5 - S.HOME[1] - 1)) >= 4, 'the rift keeps away from the home');
    assert.ok(!L.buildings.some(b => Math.abs(b.gx + 0.5 - r[0]) < 2 && Math.abs(b.gy + 0.5 - r[1]) < 2), 'the rift stands on no build');
    assert.deepEqual(NW.Land.riftOf(at(n, biome)), r, 'the same land puts it in the same place');
  }));
});
test('the ranch house grows by count, not by rarity', () => {
  const s = S.seed(S.fresh(), 50);
  assert.equal(s.done.length, 50);
  assert.equal(S.houseWord(s)[1], 'Ranch');
  assert.equal(S.nextHouseWord(s)[1], 'Estate');
});

test('learn lists are spreads over the creek, one building per project', () => {
  const s = S.seed(S.fresh(), 5);
  const L = S.layout(s);
  const east = L.buildings.filter(b => b.list);
  assert.equal(east.length, NW.SAMPLE_LISTS.reduce((a, l) => a + l.total, 0));
  east.forEach(b => assert.ok(b.gx > S.creekX(b.gy) + 1.5, b.title + ' is in or west of the creek'));
  L.buildings.filter(b => b.series).forEach(b => assert.ok(b.gx < S.creekX(b.gy) - 1.5, b.title + ' is in or east of the creek'));
});

test('the next project is the one you opened, then the series you are in', () => {
  const s = S.seed(S.fresh(), 5);
  assert.equal(S.nextProject(s).series.id, 'vpc');
  s.building = 'Learn Git Fundamentals';
  assert.equal(S.nextProject(s).title, 'Learn Git Fundamentals');
  S.finish(s, 'Learn Git Fundamentals');
  assert.equal(s.building, '', 'finishing clears what was being built');
});

test('a project page reading ticks steps, and finishes the project on the last one', () => {
  const s = S.normalise(null);
  S.applyProjectReading(s, { title: 'Host a Website on Amazon S3', done: 3, total: 7 });
  assert.equal(s.steps['Host a Website on Amazon S3'].done, 3);
  assert.equal(s.steps['Host a Website on Amazon S3'].total, 7);
  assert.equal(s.done.length, 0);
  S.applyProjectReading(s, { title: 'Host a Website on Amazon S3', done: 7, total: 7 });
  assert.ok(s.done.includes('Host a Website on Amazon S3'));
  assert.equal(s.steps['Host a Website on Amazon S3'], undefined);
});

test('the project reader wants a project path, an h1 and a Steps heading', () => {
  const doc = parseHTML('<h1>Build a Chatbot with Amazon Lex</h1><h3>Steps</h3><ol><li aria-checked="true">Create the bot</li><li aria-checked="true">Add an intent</li><li>Build and test</li></ol>');
  const r = NW.Readers.readProjectPage(doc, '/projects/build-a-chatbot');
  assert.equal(r.title, 'Build a Chatbot with Amazon Lex');
  assert.equal(r.done, 2);
  assert.equal(r.total, 3);
  assert.equal(NW.Readers.readProjectPage(doc, '/portfolio/x'), null, 'not on a project page');
  assert.equal(NW.Readers.readProjectPage(parseHTML('<p>nothing</p>'), '/projects/x'), null, 'no title, no reading');
});

test('the portfolio reader finds learn lists by their "N projects · Learnlist" line', () => {
  const doc = parseHTML('<h1>Sam Learner: Cloud Platform Engineer</h1><a href="/l/1"><h3>Cloud Systems Engineering</h3><p>Cloud platforms engineered for scale.</p><p>14 projects · Learnlist</p></a><a href="/l/2"><h3>Quantitative Finance</h3><p>1 project · Learnlist</p></a>');
  const r = NW.Readers.readPortfolioPage(doc, '/portfolio/refreshed');
  assert.equal(r.lists.length, 2);
  assert.equal(r.lists[0].name, 'Cloud Systems Engineering');
  assert.equal(r.lists[0].count, 14);
  assert.equal(r.lists[0].blurb, 'Cloud platforms engineered for scale.');
  assert.equal(r.lists[1].count, 1);
  assert.equal(r.name, 'Sam Learner');
  const s = S.applyPortfolioReading(S.normalise(null), r);
  assert.equal(s.lists[0].kind, 'datacentre');
  assert.equal(s.lists[1].kind, 'bank');
});

test('the world settings default to off, and the content script draws nothing without it', () => {
  const engine = fs.readFileSync(path.join(__dirname, '..', 'src', 'theme-engine.js'), 'utf8');
  assert.match(engine, /world: \{ enabled: false, mode: 'prod'/);
  assert.match(engine, /full: false/);
  const pane = fs.readFileSync(path.join(__dirname, '..', 'src', 'world', 'pane.js'), 'utf8');
  assert.ok(pane.includes('(document.body || document.documentElement).appendChild(el)'), 'the pane attaches to the body');
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'));
  const js = manifest.content_scripts[0].js;
  assert.ok(js.indexOf('src/world/pane.js') < js.indexOf('src/content.js'), 'the world loads before the content script that calls it');
  assert.ok(js.indexOf('src/world/engine.js') < js.indexOf('src/world/views.js'));
  assert.ok(js.indexOf('src/world/eras.js') < js.indexOf('src/world/land.js'), 'the eras load before the land that draws them');
});
