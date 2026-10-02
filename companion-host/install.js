#!/usr/bin/env node
/* Pineapple Theme Studio · companion host installer.
 *
 * Registers host.js with your browser so the extension can reach it through
 * native messaging, and writes its settings. Everything it writes about this
 * machine (the paths, the extension's id, your repo) goes in .local/ beside
 * this file, which git ignores, plus one registry key or one file per browser.
 *
 *   node companion-host/install.js --extension <id>
 *       [--repo "C:\path\to\project"]   give the companion that project's context
 *       [--model gemma3:4b]             the Ollama model (default gemma3:4b)
 *       [--command "your-cli --print"]  use any command-line AI instead of Ollama
 *       [--ollama http://127.0.0.1:11434]
 *   node companion-host/install.js --uninstall
 *
 * Your extension's id is shown in the popup (Companion, Tie in your model) and
 * on chrome://extensions with developer mode on. */
'use strict';
const fs = require('fs'), os = require('os'), path = require('path'), { execFileSync } = require('child_process');
const host = require('./host.js');

const NAME = 'com.pineapple.nextwork_buddy';
const validId = id => /^[a-p]{32}$/.test(String(id || ''));
/* "my-cli --flag 'two words'" into ['my-cli', '--flag', 'two words'], no shell in between */
function splitCommand(s) { const out = []; String(s || '').replace(/"([^"]*)"|'([^']*)'|(\S+)/g, (m, a, b, c) => { out.push(a != null ? a : b != null ? b : c); return m; }); return out; }
function manifestFor(id, launcher) { return { name: NAME, description: 'Pineapple Theme Studio companion: a local model for your companion', path: launcher, type: 'stdio', allowed_origins: ['chrome-extension://' + id + '/'] }; }

function args(argv) { const o = {}; for (let i = 0; i < argv.length; i++) { const k = argv[i]; if (!k.startsWith('--')) continue; const v = argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[++i] : true; o[k.slice(2)] = v; } return o; }

/* where each browser looks for a host, on this system */
function targets() {
  const home = os.homedir();
  if (process.platform === 'win32') return [['Chrome', 'HKCU\\Software\\Google\\Chrome\\NativeMessagingHosts\\' + NAME], ['Edge', 'HKCU\\Software\\Microsoft\\Edge\\NativeMessagingHosts\\' + NAME], ['Brave', 'HKCU\\Software\\BraveSoftware\\Brave-Browser\\NativeMessagingHosts\\' + NAME]];
  const base = process.platform === 'darwin' ? path.join(home, 'Library', 'Application Support') : path.join(home, '.config');
  const dirs = process.platform === 'darwin' ? [['Chrome', 'Google/Chrome'], ['Edge', 'Microsoft Edge'], ['Brave', 'BraveSoftware/Brave-Browser'], ['Chromium', 'Chromium']] : [['Chrome', 'google-chrome'], ['Edge', 'microsoft-edge'], ['Brave', 'BraveSoftware/Brave-Browser'], ['Chromium', 'chromium']];
  return dirs.map(([n, d]) => [n, path.join(base, d, 'NativeMessagingHosts', NAME + '.json')]);
}

function install(o) {
  if (!validId(o.extension)) { console.error('Give your extension\u2019s id: --extension <32 letters a to p>. The popup shows it under Companion.'); process.exit(1); }
  const backend = o.command ? 'command' : 'ollama';
  if (o.ollama && !host.localUrl(o.ollama)) { console.error('The Ollama address has to be on this computer, like http://127.0.0.1:11434.'); process.exit(1); }
  const repo = o.repo ? path.resolve(String(o.repo)) : '';
  if (repo && !fs.existsSync(repo)) { console.error('That repo folder does not exist: ' + repo); process.exit(1); }
  fs.mkdirSync(host.LOCAL_DIR, { recursive: true });
  const cfg = Object.assign({}, host.DEFAULTS, { backend, model: o.model ? String(o.model) : host.DEFAULTS.model, ollama: o.ollama ? String(o.ollama) : host.DEFAULTS.ollama, command: o.command ? splitCommand(o.command) : [], repo });
  fs.writeFileSync(host.CONFIG, JSON.stringify(cfg, null, 2));
  /* the browser runs a program, not a script: a small launcher that runs this Node on host.js */
  const hostJs = path.join(__dirname, 'host.js'); let launcher;
  if (process.platform === 'win32') { launcher = path.join(host.LOCAL_DIR, 'host.bat'); fs.writeFileSync(launcher, '@echo off\r\n"' + process.execPath + '" "' + hostJs + '" %*\r\n'); }
  else { launcher = path.join(host.LOCAL_DIR, 'host.sh'); fs.writeFileSync(launcher, '#!/bin/sh\nexec "' + process.execPath + '" "' + hostJs + '" "$@"\n'); fs.chmodSync(launcher, 0o755); }
  const manifest = path.join(host.LOCAL_DIR, NAME + '.json'); fs.writeFileSync(manifest, JSON.stringify(manifestFor(o.extension, launcher), null, 2));
  const done = [];
  targets().forEach(([browser, where]) => {
    try {
      if (process.platform === 'win32') { execFileSync('reg', ['add', where, '/ve', '/t', 'REG_SZ', '/d', manifest, '/f'], { stdio: 'ignore' }); done.push(browser); }
      else if (browser === 'Chrome' || fs.existsSync(path.dirname(path.dirname(where)))) { fs.mkdirSync(path.dirname(where), { recursive: true }); fs.copyFileSync(manifest, where); done.push(browser); }
    } catch (e) { /* that browser is not here */ }
  });
  console.log('Companion helper registered for: ' + (done.join(', ') || 'no browser found'));
  console.log('Model: ' + (backend === 'command' ? cfg.command.join(' ') : cfg.model + ' via Ollama') + (repo ? '\nContext from: ' + repo : ''));
  return host.handle({ type: 'ping' }).then(r => { console.log(r.ready ? 'Ready. Open the extension, Companion tab, and press Tie in your model.' : 'Almost: ' + r.why); });
}

function uninstall() {
  targets().forEach(([, where]) => { try { if (process.platform === 'win32') execFileSync('reg', ['delete', where, '/f'], { stdio: 'ignore' }); else if (fs.existsSync(where)) fs.unlinkSync(where); } catch (e) { /* was not registered there */ } });
  fs.rmSync(host.LOCAL_DIR, { recursive: true, force: true }); console.log('Companion helper removed.');
}

if (require.main === module) { const o = args(process.argv.slice(2)); if (o.uninstall) uninstall(); else install(o); }
module.exports = { NAME, validId, splitCommand, manifestFor };
