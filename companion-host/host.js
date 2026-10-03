#!/usr/bin/env node
/* Pineapple Theme Studio · companion host: the program on your computer that
 * gives your companion a model.
 *
 * The browser starts this when the extension asks a question, hands it one
 * message on stdin (a 4-byte length, then JSON), and reads one reply from
 * stdout. It answers with a local model through Ollama on this computer, or
 * with any command-line AI you name at install. It never talks to anything
 * that is not on this machine: the Ollama address must be localhost, and a
 * command is yours, fixed at install, never chosen by the page.
 *
 *   node companion-host/host.js --selftest          is it working?
 *   node companion-host/host.js --ask "question"     ask once from the terminal
 *   node companion-host/host.js --say "a line"       try the voice; writes .local/say-test.wav */
'use strict';
const fs = require('fs'), path = require('path'), http = require('http'), { execFileSync, spawn } = require('child_process');

const LOCAL_DIR = path.join(__dirname, '.local');   /* everything about this machine lives here, and git ignores it */
const CONFIG = path.join(LOCAL_DIR, 'config.json');
const LOCAL_HOSTS = ['127.0.0.1', 'localhost', '::1', '[::1]'];
const DEFAULTS = { backend: 'ollama', model: 'gemma3:4b', ollama: 'http://127.0.0.1:11434', command: [], repo: '', timeoutMs: 120000, voiceCommand: [] };   /* a cold model can take a minute to load */

function config() { let c = {}; try { c = JSON.parse(fs.readFileSync(CONFIG, 'utf8')); } catch (e) { c = {}; } return Object.assign({}, DEFAULTS, c); }

/* ---- native messaging: a little-endian length, then UTF-8 JSON ---- */
function encode(obj) { const body = Buffer.from(JSON.stringify(obj), 'utf8'), head = Buffer.alloc(4); head.writeUInt32LE(body.length, 0); return Buffer.concat([head, body]); }
function decode(buf) { if (!buf || buf.length < 4) return null; const n = buf.readUInt32LE(0); if (buf.length < 4 + n) return null; return { msg: JSON.parse(buf.subarray(4, 4 + n).toString('utf8')), rest: buf.subarray(4 + n) }; }

/* only an address on this machine, over plain http to localhost */
function localUrl(u) { try { const x = new URL(u); return x.protocol === 'http:' && LOCAL_HOSTS.includes(x.hostname) ? x : null; } catch (e) { return null; } }

function ollama(cfg, route, body) {
  const base = localUrl(cfg.ollama); if (!base) return Promise.reject(new Error('The Ollama address must be on this computer (localhost).'));
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : null;
    const req = http.request({ hostname: base.hostname.replace(/^\[|\]$/g, ''), port: base.port || 11434, path: route, method: data ? 'POST' : 'GET', headers: data ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(data) } : {}, timeout: cfg.timeoutMs }, res => {
      let out = ''; res.setEncoding('utf8'); res.on('data', c => { out += c; }); res.on('end', () => { try { resolve(JSON.parse(out)); } catch (e) { reject(new Error('Ollama sent something unreadable.')); } });
    });
    req.on('timeout', () => req.destroy(new Error('Ollama took too long.'))); req.on('error', reject); if (data) req.write(data); req.end();
  });
}

/* ---- the repository you are working on: its name, branch, last commits and the top of its README. Nothing else is read. ---- */
function repoContext(dir) {
  if (!dir) return ''; let st; try { st = fs.statSync(dir); } catch (e) { return ''; } if (!st.isDirectory()) return '';
  const git = args => { try { return execFileSync('git', ['-C', dir].concat(args), { encoding: 'utf8', timeout: 3000, stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch (e) { return ''; } };
  const lines = ['Repository: ' + path.basename(dir)];
  const branch = git(['rev-parse', '--abbrev-ref', 'HEAD']); if (branch) lines.push('Branch: ' + branch);
  const log = git(['log', '--oneline', '-8', '--no-decorate']); if (log) lines.push('Recent commits:\n' + log.split('\n').map(l => '- ' + l.slice(8, 110)).join('\n'));
  try { const pkg = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')); if (pkg.description) lines.push('About: ' + String(pkg.description).slice(0, 200)); } catch (e) { /* not a node project */ }
  for (const f of ['README.md', 'readme.md', 'README.txt']) { try { lines.push('README (start):\n' + fs.readFileSync(path.join(dir, f), 'utf8').slice(0, 1200)); break; } catch (e) { /* try the next name */ } }
  return lines.join('\n');
}

/* who the companion is and what it is for: a navigator and a motivator, not a teacher */
function systemPrompt(msg, cfg) {
  const p = msg.persona || {}, pg = msg.page || {}, st = msg.stats || {};
  const parts = ['You are ' + (p.name || 'a companion') + ', ' + (p.voice || 'a friendly companion') + '. You float on the learner\'s screen while they build hands-on tech projects on NextWork.',
    'You are a navigator and a motivator, not a teacher: do not explain the lesson or hand over solutions. Point them to their next step, keep them focused, notice their progress, and suggest a short break or focus music when it fits.',
    'Answer in one or two short sentences, warm and plain. Do not make up facts about their project.',
    'Where they are: ' + (pg.onProject ? 'building the project "' + (pg.project || 'unknown') + '"' : 'browsing NextWork') + (pg.section ? ', reading the section "' + pg.section + '"' : '') + '.',
    'Focus so far: ' + (st.today | 0) + ' minutes today, ' + (st.total | 0) + ' minutes in all. Your mood: ' + (st.mood | 0) + ' out of 100.'];
  const repo = repoContext(cfg.repo); if (repo) parts.push('They are also working on this code:\n' + repo);
  return parts.join('\n');
}

/* ---- a voice: your text-to-speech command (Piper, say) takes the line on stdin and writes a WAV to stdout ---- */
const AUDIO_MAX = 700 * 1024;   /* the browser takes at most a megabyte back, and base64 grows a third */
function speakLine(cfg, text) {
  return new Promise((resolve, reject) => {
    const cmd = Array.isArray(cfg.voiceCommand) ? cfg.voiceCommand : []; if (!cmd.length) { reject(new Error('No voice is set up. Reinstall with --voice.')); return; }
    const child = spawn(cmd[0], cmd.slice(1), { shell: false, windowsHide: true }); const parts = []; let size = 0, done = false;
    const finish = (err, val) => { if (done) return; done = true; clearTimeout(timer); if (err) reject(err); else resolve(val); };
    const timer = setTimeout(() => { child.kill(); finish(new Error('The voice took too long.')); }, 30000);
    child.stdout.on('data', c => { size += c.length; if (size > AUDIO_MAX) { child.kill(); finish(new Error('That line is too long to say.')); return; } parts.push(c); });
    child.on('error', e => finish(e)); child.on('close', () => { const wav = Buffer.concat(parts); if (wav.length < 44 || wav.toString('ascii', 0, 4) !== 'RIFF') finish(new Error('The voice did not return audio.')); else finish(null, wav); });
    child.stdin.end(String(text).slice(0, 220));
  });
}

function viaCommand(cfg, prompt) {
  return new Promise((resolve, reject) => {
    const cmd = Array.isArray(cfg.command) ? cfg.command : []; if (!cmd.length) { reject(new Error('No command is set. Reinstall with --command.')); return; }
    const child = spawn(cmd[0], cmd.slice(1), { shell: false, windowsHide: true }); let out = '', done = false;
    const timer = setTimeout(() => { if (!done) { done = true; child.kill(); reject(new Error('Your command took too long.')); } }, cfg.timeoutMs);
    child.stdout.on('data', c => { if (out.length < 8000) out += c; }); child.on('error', e => { if (!done) { done = true; clearTimeout(timer); reject(e); } });
    child.on('close', () => { if (!done) { done = true; clearTimeout(timer); resolve(out.trim()); } });
    child.stdin.end(prompt);
  });
}

async function ask(msg, cfg) {
  const q = String(msg.question || '').slice(0, 300).trim(); if (!q) return { ok: false, error: 'Ask me something first.' };
  const sys = systemPrompt(msg, cfg); let text = '';
  if (cfg.backend === 'command') text = await viaCommand(cfg, sys + '\n\nThe learner asks: ' + q + '\nReply as the companion:');
  else { const r = await ollama(cfg, '/api/chat', { model: cfg.model, stream: false, keep_alive: '30m', messages: [{ role: 'system', content: sys }, { role: 'user', content: q }], options: { temperature: 0.7, num_predict: 140 } }); text = (r && r.message && r.message.content) || (r && r.error ? '' : ''); if (!text && r && r.error) return { ok: false, error: 'Ollama: ' + String(r.error).slice(0, 160) }; }
  text = String(text).replace(/<think>[\s\S]*?<\/think>/g, '').replace(/\s*[\u2013\u2014]\s*/g, ', ').trim().slice(0, 400);   /* a thinking model's working-out is not the answer, and no long dashes */
  return text ? { ok: true, text } : { ok: false, error: 'My model had nothing to say. Try again.' };
}

async function ping(cfg) {
  const out = { ok: true, backend: cfg.backend, model: cfg.backend === 'command' ? (cfg.command[0] || 'command') : cfg.model, repo: cfg.repo ? path.basename(cfg.repo) : '', voice: !!(cfg.voiceCommand && cfg.voiceCommand.length) };
  if (cfg.backend === 'command') return Object.assign(out, { ready: !!(cfg.command && cfg.command.length), why: 'no command is set' });
  try { const tags = await ollama(Object.assign({}, cfg, { timeoutMs: 4000 }), '/api/tags'); const names = (tags.models || []).map(m => m.name); const has = names.some(n => n === cfg.model || n === cfg.model + ':latest');
    return Object.assign(out, { ready: has, why: has ? '' : 'the model is not pulled yet. Run: ollama pull ' + cfg.model });
  } catch (e) { return Object.assign(out, { ready: false, why: 'Ollama is not running. Start it, then check again.' }); }
}

async function handle(msg) {
  const cfg = config();
  if (!msg || typeof msg !== 'object') return { ok: false, error: 'Nothing to do.' };
  if (msg.type === 'ping') return ping(cfg);
  if (msg.type === 'ask') { try { return await ask(msg, cfg); } catch (e) { return { ok: false, error: String(e.message || e).slice(0, 200) }; } }
  if (msg.type === 'speak') { try { const wav = await speakLine(cfg, String(msg.text || '').trim()); return { ok: true, audio: wav.toString('base64'), mime: 'audio/wav' }; } catch (e) { return { ok: false, error: String(e.message || e).slice(0, 200) }; } }
  return { ok: false, error: 'Unknown request.' };   /* only these three kinds of message, nothing else */
}

/* the browser's side: read one message, answer it, leave */
function serve() {
  let buf = Buffer.alloc(0), answered = false;
  process.stdin.on('data', chunk => {
    buf = Buffer.concat([buf, chunk]); if (answered) return; let d; try { d = decode(buf); } catch (e) { answered = true; process.stdout.write(encode({ ok: false, error: 'Unreadable message.' }), () => process.exit(0)); return; }
    if (!d) return; answered = true; handle(d.msg).then(reply => process.stdout.write(encode(reply), () => process.exit(0)));
  });
  process.stdin.on('end', () => { if (!answered) process.exit(0); });
}

if (require.main === module) {
  const a = process.argv.slice(2);
  if (a[0] === '--selftest') ping(config()).then(r => { console.log(JSON.stringify(r, null, 2)); if (r.ready) return handle({ type: 'ask', question: 'Say hello in one sentence.', persona: { name: 'Pineapple King', voice: 'a cheerful pineapple king' }, page: {}, stats: {} }).then(x => console.log(x.ok ? 'Reply: ' + x.text : 'Error: ' + x.error)); return null; });
  else if (a[0] === '--say') handle({ type: 'speak', text: a.slice(1).join(' ') || 'Hello! I am your companion.' }).then(r => { if (!r.ok) { console.log('Error: ' + r.error); return; } const out = path.join(LOCAL_DIR, 'say-test.wav'); fs.mkdirSync(LOCAL_DIR, { recursive: true }); fs.writeFileSync(out, Buffer.from(r.audio, 'base64')); console.log('Wrote ' + out); });
  else if (a[0] === '--ask') handle({ type: 'ask', question: a.slice(1).join(' '), persona: { name: 'NextWork Robot', voice: 'a calm robot professor' }, page: {}, stats: {} }).then(r => console.log(r.ok ? r.text : 'Error: ' + r.error));
  else serve();
}

module.exports = { encode, decode, localUrl, systemPrompt, repoContext, handle, speakLine, LOCAL_DIR, CONFIG, DEFAULTS };
