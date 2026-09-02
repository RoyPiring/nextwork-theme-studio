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
  function isStacked(el) {
    let node = el, hops = 0;
    while (node && node !== document.body && hops < 40) {
      const pos = getComputedStyle(node).position;
      if (pos === 'fixed' || pos === 'absolute' || pos === 'sticky') return true;
      node = node.parentElement; hops++;
    }
    return false;
  }
  document.querySelectorAll('.bg-paper, .bg-brand-primary').forEach(function (el) {
    if (isStacked(el)) el.style.setProperty('background-color', ${JSON.stringify(palette.canvas)}, 'important');
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
