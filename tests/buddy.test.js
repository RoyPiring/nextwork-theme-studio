/* The companion: who it is, what it decides to do, and the helper that gives
 * it a model. The drawing is driven against a canvas that records calls, so
 * every companion in every action is drawn at least once without a browser. */
'use strict';
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('node:vm');

const ROOT = path.join(__dirname, '..');
function loadArt() { const sb = { Math, Object, Array, String, Number, JSON }; sb.self = sb; vm.createContext(sb); vm.runInContext(fs.readFileSync(path.join(ROOT, 'src/buddy-art.js'), 'utf8'), sb); return sb.NWB; }
/* a 2D context that accepts everything and counts what was drawn */
function fakeCtx() {
  const calls = { fill: 0, stroke: 0, text: 0 }, grad = { addColorStop() {} };
  const ctx = new Proxy({}, { get(t, k) { if (k === 'calls') return calls; if (k in t) return t[k]; if (k === 'fill' || k === 'stroke') return () => { calls[k]++; }; if (k === 'fillText') return () => { calls.text++; }; if (/Gradient$/.test(k)) return () => grad; return () => {}; }, set(t, k, v) { t[k] = v; return true; } });
  return ctx;
}

test('five companions, each with a name, a voice and a look', () => {
  const B = loadArt();
  assert.deepEqual(B.PRESETS.map(p => p.id), ['king', 'nabi', 'slime', 'robot', 'ember']);
  B.PRESETS.forEach(p => { assert.ok(p.name && p.title && p.blurb && p.voice, p.id); assert.ok(!/—/.test(p.name + p.title + p.blurb), 'no em dashes in what the popup shows'); });
  assert.equal(B.get('nobody').id, 'king', 'an unknown choice falls back to the king');
});

test('every companion draws in every action, and Ember in each of its three stages', () => {
  const B = loadArt();
  B.PRESETS.forEach(p => Object.keys(B.ACTIONS).forEach(a => { const c = fakeCtx(); B.draw(c, p.id, 60, 110, 1, { action: a, t: 1.3, talk: true, mood: 'happy', hearts: true }); assert.ok(c.calls.fill > 5, p.id + ' ' + a + ' drew something'); }));
  [0, 1, 2].forEach(stage => { const c = fakeCtx(); B.draw(c, 'ember', 60, 110, 1, { action: 'cheer', t: 2, stage }); assert.ok(c.calls.fill > 5); });
  assert.equal(B.stageOf(0), 0); assert.equal(B.stageOf(60), 1); assert.equal(B.stageOf(600), 2);
});

test('it nudges on a project page when you go still, a few times at most, then naps', () => {
  const B = loadArt(), MIN = 60000;
  assert.notEqual(B.pickAction({ idleMs: 30000, onProject: true, nudgeMin: 5, r: 0.5 }).action, 'nudge', 'busy: no nudge');
  assert.equal(B.pickAction({ idleMs: 5 * MIN, onProject: true, nudgeMin: 5, nudges: 0, r: 0.5 }).action, 'nudge');
  assert.notEqual(B.pickAction({ idleMs: 6 * MIN, onProject: true, nudgeMin: 5, nudges: 1, r: 0.5 }).action, 'nudge', 'the second nudge waits for twice as long');
  assert.notEqual(B.pickAction({ idleMs: 14 * MIN, onProject: true, nudgeMin: 3, nudges: 3, r: 0.5 }).action, 'nudge', 'three nudges and it stops');
  assert.notEqual(B.pickAction({ idleMs: 6 * MIN, onProject: false, nudgeMin: 5, r: 0.5 }).action, 'nudge', 'browsing is not slacking');
  assert.notEqual(B.pickAction({ idleMs: 6 * MIN, onProject: true, nudgeMin: 0, r: 0.5 }).action, 'nudge', 'nudges can be turned off');
  assert.equal(B.pickAction({ idleMs: 16 * MIN, onProject: true, nudgeMin: 5, r: 0.5 }).action, 'nap', 'gone: it sleeps');
  for (let i = 0; i < 20; i++) { const a = B.pickAction({ idleMs: 0, onProject: true, nudgeMin: 5, reduce: true, r: i / 20 }).action; assert.ok(!['stroll', 'hop'].includes(a), 'reduced motion: it stays put'); }
});

test('its own lines fill in what it knows and stay short', () => {
  const B = loadArt();
  const s = B.line('build', 'robot', { today: 42, total: 300 }, 0.9); assert.ok(/42|300/.test(s));
  assert.ok(B.line('navigate', 'king', { project: 'Host a Website on S3' }, 0.1).includes('Host a Website on S3'));
  ['hello', 'back', 'nudge', 'navigate', 'build', 'motivate', 'music', 'rest', 'pet', 'hatch'].forEach(k => { const t = B.line(k, 'nabi', {}, 0.5); assert.ok(t.length > 5 && t.length < 160, k); assert.ok(!/—/.test(t), 'no em dashes'); });
});

test('the helper speaks native messaging, and only to this computer', () => {
  const h = require('../companion-host/host.js');
  const framed = h.encode({ type: 'ping', note: 'café' }); assert.equal(framed.readUInt32LE(0), framed.length - 4);
  assert.deepEqual(h.decode(framed).msg, { type: 'ping', note: 'café' }); assert.equal(h.decode(framed.subarray(0, 6)), null, 'half a message waits for the rest');
  ['http://127.0.0.1:11434', 'http://localhost:11434', 'http://[::1]:11434'].forEach(u => assert.ok(h.localUrl(u), u));
  ['https://api.example.com', 'http://192.168.1.4:11434', 'http://example.com', 'file:///etc/passwd'].forEach(u => assert.equal(h.localUrl(u), null, u));
  const sys = h.systemPrompt({ persona: { name: 'Bloop', voice: 'a bouncy slime' }, page: { onProject: true, project: 'Deploy with ECS', section: 'Step 3' }, stats: { today: 12 } }, { repo: '' });
  assert.ok(sys.includes('Bloop') && sys.includes('Deploy with ECS') && sys.includes('Step 3') && /not a teacher/.test(sys));
});

test('the helper answers only the two kinds of message', async () => {
  const h = require('../companion-host/host.js');
  assert.equal((await h.handle({ type: 'run', cmd: 'anything' })).ok, false);
  assert.equal((await h.handle(null)).ok, false);
  assert.equal((await h.handle({ type: 'ask', question: '   ' })).ok, false, 'an empty question is not sent to a model');
});

test('the installer allows only this extension, and splits a command without a shell', () => {
  const ins = require('../companion-host/install.js');
  assert.ok(ins.validId('abcdefghijklmnopabcdefghijklmnop')); assert.ok(!ins.validId('not-an-id')); assert.ok(!ins.validId('abcdefghijklmnopabcdefghijklmnoz'));
  const m = ins.manifestFor('abcdefghijklmnopabcdefghijklmnop', '/x/host.sh');
  assert.equal(m.name, ins.NAME); assert.equal(m.type, 'stdio'); assert.deepEqual(m.allowed_origins, ['chrome-extension://abcdefghijklmnopabcdefghijklmnop/']);
  assert.deepEqual(ins.splitCommand('my-cli --print "two words"'), ['my-cli', '--print', 'two words']);
});

test('the extension asks for native messaging only when you tie in a model, and the page never connects', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(ROOT, 'manifest.json'), 'utf8'));
  assert.ok(!(manifest.permissions || []).includes('nativeMessaging'), 'not at install');
  assert.deepEqual(manifest.optional_permissions, ['nativeMessaging']);
  const js = manifest.content_scripts[0].js; assert.ok(js.indexOf('src/buddy-art.js') < js.indexOf('src/buddy.js'), 'the art loads before the companion');
  const page = fs.readFileSync(path.join(ROOT, 'src/buddy.js'), 'utf8'); assert.ok(!/connectNative|sendNativeMessage/.test(page), 'the page only messages the extension');
  assert.ok(/window\.top !== window/.test(page), 'top frame only');
  const bg = fs.readFileSync(path.join(ROOT, 'src/background.js'), 'utf8'); assert.ok(/sender\.id !== chrome\.runtime\.id/.test(bg), 'the relay answers only its own extension');
  const ignore = fs.readFileSync(path.join(ROOT, '.gitignore'), 'utf8'); assert.ok(ignore.includes('companion-host/.local/'), 'nothing about this machine goes into git');
});
