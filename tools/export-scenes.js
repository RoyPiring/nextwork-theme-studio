/* Writes every scene layer out as a standalone .svg so the artwork can be
 * opened, inspected and edited in a normal vector editor.
 *
 * The runtime source of truth is src/scenes.js - these files are generated
 * FROM it, never the other way round, so the two can't drift.
 *
 *   node tools/export-scenes.js
 */
const fs = require('fs');
const path = require('path');

global.self = {};
require('../src/scenes.js');
require('../src/theme-engine.js');
const NWT = global.self.NWT;
const SCENES = global.self.NWT_SCENES;
const settings = JSON.parse(JSON.stringify(NWT.DEFAULT_SETTINGS));

/* Scenes are functions of the palette, so resolve each against its theme. */
function resolve(id) {
  const theme = NWT.getTheme(settings, id);
  const p = NWT.buildPalette(theme);
  const def = SCENES[id];
  return typeof def === 'function'
    ? def(p, { toneOf: (hex, t) => NWT.toneOf(hex, p.textPrimary, t), mix: NWT.color.mix, rgba: NWT.color.rgba })
    : def;
}

const outDir = path.join(__dirname, '..', 'assets');
fs.mkdirSync(outDir, { recursive: true });

/* Clear first. Without this a layer that stops being generated - a band that
 * gets removed from every scene, say - stays in assets/ and in git as a file
 * nothing produces any more, and the CI freshness check cannot see it because
 * it only compares files that are still being written. */
fs.readdirSync(outDir)
  .filter(f => f.endsWith('.svg'))
  .forEach(f => fs.unlinkSync(path.join(outDir, f)));

let count = 0;
Object.keys(SCENES).forEach(function (theme) {
  ['hero', 'far', 'near'].forEach(function (layer) {
    const def = resolve(theme)[layer];
    /* A hero can be a painted wallpaper instead of generated SVG. There is
     * nothing to export in that case - the artwork already exists as a file
     * outside the repo, and what ships is the encoded copy in wallpapers.js. */
    if (!def || !def.svg) return;
    const file = path.join(outDir, theme + '-' + layer + '.svg');
    fs.writeFileSync(file, def.svg);
    count++;
    console.log('wrote', path.relative(path.join(__dirname, '..'), file),
                '(' + (def.svg.length / 1024).toFixed(1) + ' KB)');
  });
});
console.log('\n' + count + ' layers across ' + Object.keys(SCENES).length + ' scenes');
