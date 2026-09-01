/* Renders every scene as a card on one page, so the whole set can be judged
 * side by side instead of one theme at a time.
 *
 *   node tools/contact-sheet.js   ->  _review/contact-sheet.html
 *
 * The layer CSS goes in a real <style> block, never an inline style attribute.
 * The SVG uses single-quoted attributes and the data URI is wrapped in
 * url("..."), so an inline attribute truncates on whichever quote it picks -
 * which silently blanked every layer the first time round.
 */
const fs = require('fs');
const path = require('path');

global.self = {};
require('../src/scenes.js');
require('../src/theme-engine.js');
const NWT = global.self.NWT;
const SCENES = global.self.NWT_SCENES;

const settings = JSON.parse(JSON.stringify(NWT.DEFAULT_SETTINGS));
const url = m => 'url("data:image/svg+xml,' + encodeURIComponent(m) + '")';

const cards = [];
const rules = [];

Object.keys(NWT.PRESETS).forEach(function (id, n) {
  const theme = NWT.getTheme(settings, id);
  const p = NWT.buildPalette(theme);
  const def = SCENES[id];
  const scene = typeof def === 'function'
    ? def(p, { toneOf: (hex, t) => NWT.toneOf(hex, p.textPrimary, t), mix: NWT.color.mix, rgba: NWT.color.rgba })
    : def;

  const k = 's' + n;
  rules.push('.' + k + ' { background:' + p.canvas + '; color:' + p.textPrimary + '; }');
  rules.push('.' + k + ' .t2 { color:' + p.textSecondary + '; }');
  rules.push('.' + k + ' .cd { background:' + p.surface + '; border:1px solid ' + p.border + '; }');
  rules.push('.' + k + ' .ac { background:' + p.accent + '; color:' + p.accentText + '; }');

  const layers = [];
  if (scene && scene.hero) {
    layers.push('<i class="l hero"></i>');
    rules.push('.' + k + ' .hero { background-image:' + url(scene.hero.svg) +
      '; background-size:' + scene.hero.size + '; background-position:' + scene.hero.position +
      '; background-repeat:no-repeat; }');
  }
  ['far', 'near'].forEach(function (which) {
    const l = scene && scene[which];
    if (!l) return;
    layers.push('<i class="l ' + which + '"></i>');
    const fade = 'linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 45%, rgba(0,0,0,0) 96%)';
    rules.push('.' + k + ' .' + which + ' { background-image:' + url(l.svg) +
      '; background-size:auto ' + parseInt(l.height, 10) + '%; background-position:left ' +
      (l.y || 'bottom') + '; background-repeat:repeat-x' +
      '; -webkit-mask-image:' + fade + '; mask-image:' + fade +
      (l.blur ? '; filter:blur(' + l.blur + 'px)' : '') + '; }');
  });

  const atmos = global.self.NWT_ATMOS;
  layers.push('<i class="l vig"></i><i class="l grain"></i>');
  rules.push('.' + k + ' .vig { background-image:' + url(atmos.vignette(theme.mode === 'light' ? '#5b5348' : '#000000', theme.mode === 'light' ? 0.10 : 0.34)) + '; background-size:cover; }');
  rules.push('.' + k + ' .grain { background-image:' + url(atmos.grainTile(theme.mode === 'light' ? 0.030 : 0.045)) + '; background-size:220px 220px; }');

  cards.push('<figure class="card ' + k + '">' + layers.join('') +
    '<div class="body">' +
      '<b>' + theme.name + '</b>' +
      '<span class="t2">Body copy sits right here, and this is roughly how much of ' +
      'it there is on a real project page. If the scenery competes with these ' +
      'two sentences, it is too loud - the paragraph has to win.</span>' +
      '<em class="cd">card</em><u class="ac">Action</u>' +
    '</div>' +
    '<figcaption>' + (theme.mode === 'light' ? 'light' : 'dark') + ' &middot; ' +
      (scene ? Object.keys(scene).filter(x => x !== 'areaColors').join(' + ') : 'no scene') +
    '</figcaption></figure>');
});

const html = `<!doctype html><meta charset="utf-8"><title>Scene contact sheet</title>
<style>
  body { margin:0; padding:20px; background:#17181a; color:#e8e9e9;
         font:13px/1.45 ui-sans-serif, system-ui, sans-serif; }
  h1 { font-size:15px; margin:0 0 14px; }
  .grid { display:grid; grid-template-columns:repeat(2, 1fr); gap:16px; }
  /* 70vh, not 230px. Scenery is sized in vh, so a short card makes a band that
     swallows the reading column look like a tasteful strip along the bottom.
     That is how nine over-tall scenes shipped. */
  .card { position:relative; height:70vh; min-height:520px; margin:0;
          border-radius:10px; overflow:hidden; border:1px solid #34383b; }
  .card .l { position:absolute; inset:0; }
  .body { position:relative; z-index:2; padding:12px; display:flex;
          flex-direction:column; align-items:flex-start; gap:6px; }
  .body b { font-size:15px; }
  .body span { font-size:12px; max-width:42ch; line-height:1.5; }
  .body em { font-style:normal; font-size:10px; padding:4px 8px; border-radius:6px; }
  .body u { text-decoration:none; font-size:10px; font-weight:700;
            padding:4px 10px; border-radius:6px; }
  figcaption { position:absolute; bottom:0; left:0; right:0; z-index:2;
               font-size:9px; padding:4px 8px; color:#9aa0a4;
               background:rgba(0,0,0,.35); }
${rules.join('\n')}
</style>
<h1>Scene contact sheet &mdash; ${Object.keys(NWT.PRESETS).length} themes</h1>
<div class="grid">
${cards.join('\n')}
</div>`;

const outDir = path.join(__dirname, '..', '_review');
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'contact-sheet.html'), html);
console.log('wrote _review/contact-sheet.html (' + (html.length / 1024).toFixed(0) + ' KB)');
