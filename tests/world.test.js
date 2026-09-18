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
  ['engine', 'assets', 'data', 'state', 'land', 'hq', 'global', 'readers', 'views'].forEach(f => {
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

test('finishing a project places one building on its series’ spread', () => {
  const s = S.normalise(null);
  S.finish(s, 'Set Up An AWS Account');
  const L = S.layout(s);
  assert.equal(L.buildings.length, 1);
  assert.equal(L.buildings[0].kind, 'home');
  assert.equal(S.houseWord(s)[1], 'Cabin');
  assert.ok(L.paths.size > 1, 'a path is worn to it');
  S.finish(s, 'Set Up An AWS Account');
  assert.equal(s.done.length, 1, 'finishing twice counts once');
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
  const doc = parseHTML('<h1>Roy Piring: Cloud Platform Engineer</h1><a href="/l/1"><h3>Cloud Systems Engineering</h3><p>Cloud platforms engineered for scale.</p><p>14 projects · Learnlist</p></a><a href="/l/2"><h3>Quantitative Finance</h3><p>1 project · Learnlist</p></a>');
  const r = NW.Readers.readPortfolioPage(doc, '/portfolio/refreshed');
  assert.equal(r.lists.length, 2);
  assert.equal(r.lists[0].name, 'Cloud Systems Engineering');
  assert.equal(r.lists[0].count, 14);
  assert.equal(r.lists[0].blurb, 'Cloud platforms engineered for scale.');
  assert.equal(r.lists[1].count, 1);
  assert.equal(r.name, 'Roy Piring');
  const s = S.applyPortfolioReading(S.normalise(null), r);
  assert.equal(s.lists[0].kind, 'datacentre');
  assert.equal(s.lists[1].kind, 'bank');
});

test('the world settings default to off, and the content script draws nothing without it', () => {
  const engine = fs.readFileSync(path.join(__dirname, '..', 'src', 'theme-engine.js'), 'utf8');
  assert.match(engine, /world: \{ enabled: false, mode: 'prod'/);
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf8'));
  const js = manifest.content_scripts[0].js;
  assert.ok(js.indexOf('src/world/pane.js') < js.indexOf('src/content.js'), 'the world loads before the content script that calls it');
  assert.ok(js.indexOf('src/world/engine.js') < js.indexOf('src/world/views.js'));
});
