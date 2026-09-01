# Work queue

Ordered by what a user actually notices. Each item says what is wrong, how it
was found, and how to tell it is fixed.

Rules for working through this:

- One item per commit, so any of it can be reverted on its own.
- A test comes with the fix, in `tests/`, and it fails before the fix lands.
- Tag before starting a group. `v2.4.0` is the last state before this queue.
- Nothing here is a rewrite. If an item turns into one, stop and split it.

---

## Done

### 1. buildCSS returned different bytes for identical settings

**Symptom.** The page felt slow after a refresh and stayed slow.

**Cause.** SVG ids came from a counter that kept incrementing across calls, so
two calls with the same settings produced different output. `content.js` only
rewrites its `<style>` element when the CSS has changed, and that comparison
could never succeed. Every storage write swapped a 70 KB stylesheet and forced
a full restyle.

**Fix.** Scenes reset the counter before they run.

**Test.** `buildCSS is deterministic for the same settings`.

---

## Next, in order

All seven are done. What follows is the record of each.

### 2. Panels keep a colour they were given once and never give it back  [done]

**Symptom.** Boxes change colour over time. Components look wrong after a while
or after switching themes.

**Cause.** `rescueLightPanels` in `src/content.js` stamps `data-nwt-lit="1"` on
an element and writes `background-color` as an inline `!important`. Nothing ever
removes either. Three consequences:

- Switch theme and every previously stamped element keeps the **old** palette,
  because the stamp makes it skip.
- Turn the theme off and they stay stamped. `render()` removes the stylesheet
  but not the inline styles.
- It runs on every DOM mutation, so anything that is momentarily light while it
  runs - a transition, a hover, a skeleton mid-render - is captured forever.

**Fix.** Add `unrescue()`: walk `[data-nwt-lit]`, `removeProperty` the three
properties, drop the attribute. Call it when the theme is disabled and before
re-running under a different palette. Store the palette that was applied so a
theme change can be detected.

**Test.** Rescue under palette A, switch to palette B, assert no element still
carries A. Disable, assert no element carries an inline background.

### 3. Two storage reads can land out of order  [done]

**Cause.** `content.js` and `popup.js` both answer a change by starting a fresh
async `chrome.storage.local.get(null)`. Two changes in quick succession put two
reads in flight with no ordering guarantee, so an older snapshot can be applied
last and the page renders stale settings.

**Fix.** A monotonic token: increment before the read, capture it, drop the
callback if it has moved on.

**Test.** Drive two overlapping reads through a stubbed `chrome.storage` and
assert the later settings win.

### 4. Every dial pixel writes storage and rebuilds the world  [done]

**Cause.** `input` fires per pixel. Each tick writes storage, which re-enters
through the change listener, rebuilds all 18 theme cards in the popup, and
reaches every open nextwork.ai tab, where it rebuilds both stylesheets and
re-walks the DOM. Item 1 removed the stylesheet rewrite; the rest of the storm
is still there.

**Fix.** Debounce the write to about 120 ms. Update the local readout
immediately so dragging still feels live.

**Test.** Feed 40 synthetic input events and assert one write.

### 5. The colour picker is destroyed while you are dragging it  [done]

**Cause.** `src/options.js` `renderColors` empties and rebuilds all nine rows on
every change, including the `<input type="color">` currently being dragged.

**Fix.** Commit should update the theme and re-run only the preview, ramp,
checks and sidebar, leaving the rows in place.

### 6. Errors that never surface  [done]

- `navigator.clipboard.writeText(...)` with no `.catch` - a denied permission is
  an unhandled rejection and the user believes the copy worked.
- `file.text()` with no `.catch` on import.
- No `chrome.runtime.lastError` check anywhere outside `content.js`, which does
  check. Same pattern, applied in one file of four.

### 7. The mutation observer still walks the whole document  [done]

**Cause.** `paintShadowRoots` does `querySelectorAll('*')` and recurses into
every shadow root. It is debounced at 120 ms, which bounds how often, not how
much. Roots already adopted are tracked in a `WeakSet`, so the walk is cheap per
node, but it is still a full walk on a page that mounts components constantly.

**Fix.** Drive it from the mutation records' `addedNodes` rather than re-walking
from the root.

---

## Later, and only if they start costing something

- `buildCSS` is about 620 lines doing a dozen jobs. The seams are already marked
  by its own comment banners. Extracting them is safe but large, and it should
  not happen in the same commit as a behaviour change.
- Scene resolution is copy-pasted in eight places across `src/` and `tools/`.
  One `NWT.resolveScene(settings, id)` would replace all of them.
- `tools/contact-sheet.js` hardcodes a `to top` fade for every band, so the
  review tool disagrees with the runtime for any band that is not anchored at
  the bottom.
- Dead code: `hasWallpaper` in `theme-engine.js`, the unused `isCustom`
  parameter in `options.js` `themeCard`, an unconditional `disabled = false`.
