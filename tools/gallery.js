/* Renders all themes into one SVG for the README.
 *
 *   node tools/gallery.js   ->  docs/img/themes.svg
 *
 * Plain SVG rather than a screenshot, so it regenerates from source when a
 * theme changes and nobody has to remember to retake a picture. Each scene is
 * inlined as a nested <svg> instead of a data URI, because GitHub sanitises
 * markdown images and data URIs do not survive it. Inlining means every scene
 * shares one ID namespace, so ids and the references to them are prefixed per
 * card - without that the first gradient defined wins for all of them.
 */
const fs = require('fs');
const path = require('path');

global.self = {};
require('../src/wallpapers.js');
require('../src/scenes.js');
require('../src/theme-engine.js');
const NWT = global.self.NWT;
const SCENES = global.self.NWT_SCENES;

const COLS = 3;
const W = 300, H = 190, GAP = 14, PAD = 16, LABEL = 26;

function esc(s) {
  return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/* The scene generators write single-quoted attributes, so everything that
 * reads them has to accept either quote. Matching only double quotes silently
 * produces a gallery of empty colour swatches. */
const ATTR = function (name) {
  return new RegExp(name + "=['\"]([^'\"]+)['\"]");
};

/* Prefix every ID this fragment defines, and every reference to one.
 * Plain split/join rather than built regexes - the ids come from our own
 * generators, so there is nothing to escape and nothing to get wrong. */
function namespaceIds(svg, tag) {
  const ids = [];
  const finder = / id=['"]([^'"]+)['"]/g;
  let m;
  while ((m = finder.exec(svg)) !== null) ids.push(m[1]);
  ids.forEach(function (id) {
    ["'", '"'].forEach(function (q) {
      svg = svg.split(' id=' + q + id + q).join(' id=' + q + tag + '-' + id + q);
      svg = svg.split('href=' + q + '#' + id + q).join('href=' + q + '#' + tag + '-' + id + q);
    });
    svg = svg.split('url(#' + id + ')').join('url(#' + tag + '-' + id + ')');
  });
  return svg;
}

/* Strip the outer <svg> wrapper, keeping its viewBox so we can re-nest it. */
function unwrap(svg) {
  const open = /^<svg[^>]*>/.exec(svg);
  if (!open) return null;
  const vb = ATTR('viewBox').exec(open[0]);
  return { viewBox: vb ? vb[1] : null, body: svg.slice(open[0].length).replace(/<\/svg>\s*$/, '') };
}

/* "140% 70%" against the card box. */
function boxFromSize(size, position) {
  const parts = String(size || '100% 100%').trim().split(/\s+/);
  const w = W * (parseFloat(parts[0]) / 100);
  const h = H * (parseFloat(parts[1] !== undefined ? parts[1] : parts[0]) / 100);
  const pos = String(position || 'center bottom').trim().split(/\s+/);
  const x = pos[0] === 'left' ? 0 : pos[0] === 'right' ? W - w : (W - w) / 2;
  const y = pos[1] === 'top' ? 0 : pos[1] === 'center' ? (H - h) / 2 : H - h;
  return { x: x, y: y, w: w, h: h };
}

const ids = Object.keys(NWT.PRESETS);
const settings = JSON.parse(JSON.stringify(NWT.DEFAULT_SETTINGS));
const rows = Math.ceil(ids.length / COLS);
const totalW = PAD * 2 + COLS * W + (COLS - 1) * GAP;
const totalH = PAD * 2 + rows * (H + LABEL) + (rows - 1) * GAP;

const out = [];
const blurDefs = [];
out.push('<svg xmlns="http://www.w3.org/2000/svg" width="' + totalW + '" height="' + totalH +
         '" viewBox="0 0 ' + totalW + ' ' + totalH + '" role="img" aria-label="' +
         ids.length + ' themes">');
out.push('<title>' + ids.length + ' themes</title>');
out.push('<rect width="100%" height="100%" fill="#0e0f10"/>');
out.push('<defs>');
ids.forEach(function (id, n) {
  out.push('<clipPath id="clip' + n + '"><rect x="0" y="0" width="' + W + '" height="' + H +
           '" rx="8"/></clipPath>');
});
out.push('</defs>');

ids.forEach(function (id, n) {
  const theme = NWT.getTheme(settings, id);
  const p = NWT.buildPalette(theme);
  const def = SCENES[id];
  const scene = typeof def === 'function'
    ? def(p, { toneOf: function (hex, t) { return NWT.toneOf(hex, p.textPrimary, t); },
               mix: NWT.color.mix, rgba: NWT.color.rgba })
    : def;

  const x = PAD + (n % COLS) * (W + GAP);
  const y = PAD + Math.floor(n / COLS) * (H + LABEL + GAP);

  out.push('<g transform="translate(' + x + ',' + y + ')">');
  out.push('<g clip-path="url(#clip' + n + ')">');
  out.push('<rect width="' + W + '" height="' + H + '" fill="' + p.canvas + '"/>');

  /* Hero first - it is the sky or the far mass everything else sits against.
   * A painted hero goes in as an <image>; if a renderer strips data URIs the
   * card still shows the palette underneath rather than a hole. */
  const papers = global.self.NWT_WALLPAPERS || {};
  const paper = scene && scene.hero && scene.hero.wallpaper && papers[scene.hero.wallpaper];
  if (paper) {
    out.push('<image x="0" y="0" width="' + W + '" height="' + H +
             '" preserveAspectRatio="xMidYMax slice" href="' + paper.uri + '"/>');
  } else if (scene && scene.hero) {
    const u = unwrap(scene.hero.svg);
    if (u && u.viewBox) {
      const b = boxFromSize(scene.hero.size, scene.hero.position);
      out.push('<svg x="' + b.x.toFixed(1) + '" y="' + b.y.toFixed(1) + '" width="' + b.w.toFixed(1) +
               '" height="' + b.h.toFixed(1) + '" viewBox="' + u.viewBox +
               '" preserveAspectRatio="none">' + namespaceIds(u.body, 'c' + n + 'hero') + '</svg>');
    }
  }

  /* Then the bands, back to front, anchored the way the extension anchors them.
   * `height` is in vh and `y` is a background-position percentage, which places
   * the band at that fraction of the leftover space, not of the card. */
  ['far', 'near'].forEach(function (which) {
    const l = scene && scene[which];
    if (!l) return;
    const u = unwrap(l.svg);
    if (!u || !u.viewBox) return;
    const bandH = H * (parseInt(l.height, 10) / 100);
    const anchor = l.y || 'bottom';
    const pct = /^(\d+)%$/.exec(anchor);
    const top = anchor === 'top' ? 0
              : pct ? (H - bandH) * (Number(pct[1]) / 100)
              : H - bandH;
    /* Blur is authored in px against a full-width viewport; scale it to the
     * card or every distant band turns to fog. */
    const filter = l.blur ? ' filter="url(#blur' + n + which + ')"' : '';
    if (l.blur) {
      blurDefs.push('<filter id="blur' + n + which + '" x="-20%" y="-20%" width="140%" ' +
                    'height="140%"><feGaussianBlur stdDeviation="' +
                    Math.max(0.4, l.blur * (W / 1600)).toFixed(2) + '"/></filter>');
    }
    out.push('<svg x="0" y="' + top.toFixed(1) + '" width="' + W + '" height="' + bandH.toFixed(1) +
             '" viewBox="' + u.viewBox + '" preserveAspectRatio="xMidYMid slice" opacity="' +
             (which === 'far' ? '0.9' : '1') + '"' + filter + '>' +
             namespaceIds(u.body, 'c' + n + which) + '</svg>');
  });

  /* A card and an accent chip, so the component colours show as well as the
   * background - the palette is the point, not just the scenery. */
  out.push('<rect x="16" y="18" width="150" height="46" rx="7" fill="' + p.surface +
           '" stroke="' + p.border + '"/>');
  out.push('<rect x="26" y="30" width="96" height="7" rx="3.5" fill="' + p.textPrimary +
           '" opacity="0.85"/>');
  out.push('<rect x="26" y="45" width="126" height="6" rx="3" fill="' + p.textSecondary +
           '" opacity="0.7"/>');
  out.push('<rect x="16" y="74" width="72" height="24" rx="6" fill="' + p.accent + '"/>');
  out.push('<rect x="28" y="83" width="48" height="6" rx="3" fill="' + p.accentText + '"/>');
  out.push('<rect width="' + W + '" height="' + H + '" rx="8" fill="none" stroke="#2a2d30"/>');
  out.push('</g>');

  out.push('<text x="1" y="' + (H + 17) + '" font-family="ui-sans-serif, system-ui, sans-serif" ' +
           'font-size="12" font-weight="600" fill="#e6e7e8">' + esc(theme.name) + '</text>');
  out.push('<text x="' + W + '" y="' + (H + 17) + '" text-anchor="end" ' +
           'font-family="ui-sans-serif, system-ui, sans-serif" font-size="11" fill="#8b9196">' +
           (theme.mode === 'light' ? 'light' : 'dark') + '</text>');
  out.push('</g>');
});

/* Filters go in a trailing defs block: they are collected while the cards are
 * built, and references resolve document-wide regardless of order. */
if (blurDefs.length) out.push('<defs>' + blurDefs.join('') + '</defs>');
out.push('</svg>');

const dir = path.join(__dirname, '..', 'docs', 'img');
fs.mkdirSync(dir, { recursive: true });
const body = out.join('\n') + '\n';
fs.writeFileSync(path.join(dir, 'themes.svg'), body);
console.log('wrote docs/img/themes.svg  (' + ids.length + ' themes, ' +
            (body.length / 1024).toFixed(0) + ' KB)');
