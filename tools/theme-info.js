/* Prints one line of JSON per theme: the id, whether it is light or dark, and
 * the body text colour the wallpaper has to stay readable behind.
 *
 *   node tools/theme-info.js
 *
 * This exists so tools/make-wallpaper.py does not have to hard-code colours
 * that live in PRESETS. The palette is the source of truth; anything that
 * needs to know about it asks.
 */
const path = require('path');

global.self = {};
require(path.join(__dirname, '..', 'src', 'scenes.js'));
require(path.join(__dirname, '..', 'src', 'theme-engine.js'));
const NWT = global.self.NWT;

const settings = JSON.parse(JSON.stringify(NWT.DEFAULT_SETTINGS));
const out = {};

Object.keys(NWT.PRESETS).forEach(function (id) {
  const theme = NWT.getTheme(settings, id);
  const palette = NWT.buildPalette(theme);
  out[id] = {
    name: theme.name,
    mode: theme.mode === 'light' ? 'light' : 'dark',
    text: palette.textPrimary,
    canvas: palette.canvas
  };
});

process.stdout.write(JSON.stringify(out, null, 2) + '\n');
