/* Builds a page that reproduces the split-view bleed-through, so the fix for
 * it can be checked by eye rather than by argument.
 *
 *   node tools/split-repro.js            -> review/split.html
 *   node tools/split-repro.js --fixed    -> review/split-fixed.html
 *
 * The bug: the stylesheet makes the page ground transparent so the scenery can
 * show through it, and CSS can only decide what counts as "the ground" by
 * class name. A documentation pane laid over the project page carries the same
 * class and none of the positioning names the rule looks for, so it went
 * transparent too and the page underneath showed through it.
 *
 * The layout below is the smallest thing that produces that: a fixed shell
 * holding a pane, over a page with content in it. Open the plain version and
 * the step list and the screenshot from the page behind are legible through
 * the pane. Open --fixed, which runs the same check the content script runs,
 * and they are not.
 *
 * This is a review tool, not a test. tests/content.test.js asserts the same
 * behaviour headlessly; this is for looking at it.
 */
const fs = require('fs');
const path = require('path');

global.self = {};
require('../src/wallpapers.js');
require('../src/scenes.js');
require('../src/theme-engine.js');
const NWT = global.self.NWT;

const themeId = process.argv.find(a => !a.startsWith('-') && NWT.PRESETS[a]) || 'cherryBlossom';
const fixed = process.argv.includes('--fixed');

const settings = JSON.parse(JSON.stringify(NWT.DEFAULT_SETTINGS));
settings.themeId = themeId;
const palette = NWT.buildPalette(NWT.getTheme(settings));
const css = NWT.buildCSS(settings);

/* The same test the content script uses: anything with a positioned ancestor
 * between it and the body is a panel stacked over something, not the ground. */
const correction = `
<script>
  var GROUND = '.bg-paper, .bg-brand-primary';
  function isPanel(el) {
    var node = el.parentElement, hops = 0;
    while (node && node !== document.body && hops < 40) {
      var pos = getComputedStyle(node).position;
      if (pos === 'fixed' || pos === 'absolute' || pos === 'sticky') return true;
      if (node.matches && node.matches(GROUND)) return true;
      node = node.parentElement; hops++;
    }
    var page = document.documentElement.clientWidth;
    var w = el.getBoundingClientRect().width;
    if (page > 0 && w > 0 && w < page * 0.92) return true;
    return false;
  }
  document.querySelectorAll(GROUND).forEach(function (el) {
    if (!isPanel(el)) return;
    el.style.setProperty('background-color', ${JSON.stringify(palette.panelFill)}, 'important');
    el.style.setProperty('backdrop-filter', 'blur(14px)', 'important');
    el.style.setProperty('-webkit-backdrop-filter', 'blur(14px)', 'important');
    el.style.setProperty('box-shadow',
      '0 0 0 1px ${palette.panelEdge}, 0 12px 32px ${palette.panelShadow}', 'important');
  });
</script>`;

const page = `<!doctype html><meta charset="utf-8"><title>Split view: ${themeId}${fixed ? ' (corrected)' : ''}</title>
<style>${css}</style>
<style>
  body { margin: 0; font: 14px/1.6 ui-sans-serif, system-ui, sans-serif; }
  .col { max-width: 640px; margin: 0 auto; padding: 40px 24px; }
  .steps { border: 1px solid ${palette.border}; border-radius: 10px; padding: 12px; margin: 20px 0; }
  .shot { background: #111; color: #eee; padding: 14px; border-radius: 8px; margin: 14px 0; }
  /* The split view: a fixed shell holding the pane. The shell is positioned;
     the pane inside it is not, and carries no positioning class either, which
     is exactly why the class-name rule mistook it for the page ground. */
  .docshell { position: fixed; top: 0; right: 0; width: 50vw; height: 100vh;
              box-shadow: -2px 0 14px rgba(0,0,0,.18); }
  .docpane { height: 100%; overflow: auto; padding: 36px; }
</style>

<div class="bg-paper" id="ground">
  <div class="col">
    <h1>Build a Stage-Gate Lifecycle Tracker</h1>

    <!-- An inset card that is also .bg-paper, with nothing positioned above
         it. This is the second shape of the same bug: it is a panel, but the
         positioned-ancestor test does not see it, so it stayed transparent and
         the wallpaper showed through the step list. -->
    <div class="bg-paper" id="card" style="border-radius:14px;padding:18px;margin:22px 0">
      <div>Step #0: Before We Start</div>
      <div>Step #1: Start the Local Control Plane</div>
      <div>Step #2: Freeze the Contract</div>
    </div>
    <div class="steps">
      Secret Mission: Present the Two-Audience Walkthrough<br>
      Before you go: Clean Up Your Resources<br>
      Mission Accomplished: Well Done!
    </div>
    <div class="shot">Broken Deal: Grayfield Tower &mdash; DEAL KILLED AT THIS GATE</div>
    <p>None of this should be legible through the pane on the right.</p>
  </div>
</div>

<div class="docshell"><div class="bg-paper docpane" id="pane">
  <h2>BUILD A STAGE-GATE LIFECYCLE TRACKER</h2>
  <h3>Committing to the Build</h3>
  <p>If the page behind shows through this text, the bug is present.</p>
</div></div>
${fixed ? correction : ''}`;

const dir = path.join(__dirname, '..', 'review');
fs.mkdirSync(dir, { recursive: true });
const out = path.join(dir, fixed ? 'split-fixed.html' : 'split.html');
fs.writeFileSync(out, page);
console.log('wrote review/' + path.basename(out) + '  (' + themeId + ')');
console.log(fixed
  ? 'The pane should be solid and the page behind hidden.'
  : 'The pane should be see-through. Run again with --fixed to compare.');
