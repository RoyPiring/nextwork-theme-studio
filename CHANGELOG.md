# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning is [semver](https://semver.org/); the `version` field in
`manifest.json` is the source of truth.

1.3.0 is the first version published to a public repository. Everything below
it predates that and was never released; those entries are kept because they
record why several non-obvious parts of the code look the way they do.

## [2.6.0] - 2026-09-01

### Changed
- Panels blend with the wallpaper instead of covering it. 2.5.3 stopped them
  being see-through by making them opaque, which fixed the readability and
  replaced it with a flat slab of colour sitting on top of a soft picture.

  They are translucent now, at 72% of the surface colour, with a blur behind
  them, so the scene reads through as a wash and the panel belongs to the page
  rather than sitting on it.

  The opacity is measured, not picked. Composited against the worst point of
  each wallpaper, body text still clears 7.5:1 on every theme; the floor is
  near 0.60. The blur is not credited in that measurement, and it only helps,
  since it flattens whatever shows through.

## [2.5.3] - 2026-09-01

### Fixed
- Cards let the wallpaper through. The step list on a project page is the same
  class as the page ground, with nothing positioned above it, so the check
  added in 2.5.2 walked straight past it and left it transparent. The mountain
  showed through the middle of the list.

  What separates a card from the ground is that a card is inset. The test is
  now three ways to be a panel, any one of which is enough: something
  positioned sits above it, it is nested inside another element wearing the
  same class, or it is narrower than the page.

## [2.5.2] - 2026-09-01

### Fixed
- In a split view, the page behind showed through the pane in front. The
  stylesheet makes the page ground transparent so the scenery can show through
  it, and decides what counts as the ground by class name, which is all CSS can
  do. The documentation pane carried none of the names it looks for, so it went
  transparent too and the project page underneath came through it.

  The runtime now corrects that by measurement: anything with a positioned
  ancestor between it and the body is a stacked panel, not the ground, and
  keeps its background. This runs for every theme, not only the dark ones,
  since the transparency it corrects applies to all of them.

## [2.5.1] - 2026-09-01

### Fixed
- The loading skeleton was invisible. It was aliased to the alternate surface,
  which on a light theme is barely a step away from the page: 1.08:1 on Cherry
  Blossom, 1.06:1 on Hawaii Ocean. So while NextWork loaded its content, the
  page looked blank rather than loading, and the wait read as a failure. The
  skeleton is now solved against the canvas and clears 1.45:1 on every theme.
  Not a text ratio, because it is not text; it just has to read as a shape.

## [2.5.0] - 2026-09-01

A correctness and performance pass. Two symptoms were reported: the page felt
slow after a refresh, and components changed colour over time. Both are fixed,
along with five things found while looking for them.

### Added
- A unit test suite in `tests/`, run by `npm test` and in CI ahead of the
  audit. It uses node:test, so the project still has no dependencies. Twenty
  one tests, including a small DOM and extension-API stand-in that lets the
  content script be loaded and driven.
- `docs/PLAN.md` records what was wrong, how it was found, and how to tell it
  is fixed.

### Fixed
- The stylesheet was rewritten on every storage write. SVG ids came from a
  counter that kept incrementing, so two calls with identical settings returned
  different bytes and the check that skips redundant writes could never pass.
  Every dial drag and every timer update swapped 70 KB of CSS and forced a full
  restyle.
- Panels kept a colour once they were given one. The rescue pass writes inline
  styles and marks the element so it skips next time, and nothing removed
  either, so switching theme left everything wearing the previous palette and
  switching the theme off left it wearing the theme surface. There is an undo
  now, and it runs when the palette changes.
- A storage read whose answer was overtaken could still be applied. Each read
  carries a token and drops itself if a newer one has started.
- Dial changes wrote storage on every pixel of slider travel, and every write
  reached every open tab. The preview still updates live; the write waits for
  the drag to settle.
- Committing a colour rebuilt the nine colour rows, which removed the input the
  pointer was inside. The full render is split from a preview refresh.
- The editor preview asked scenes for `hero.svg`, which stopped existing when
  heroes became wallpapers, so it was setting a background to
  `url("data:image/svg+xml,undefined")` and showing nothing.
- Failures that said nothing: a refused clipboard, an unreadable import file,
  and `chrome.runtime.lastError` unchecked in the popup and the background.
- The mutation observer ran a full document walk per batch. It now walks only
  the subtrees that were added.

## [2.4.0] - 2026-09-01

### Changed
- Removed the fog band that ran along the bottom of every theme. It sat over
  the part of the picture where the character stands.
- Vignette down from 0.34 to 0.14 on dark themes and 0.10 to 0.05 on light
  ones. A vignette darkens the corners, and the corner is exactly where that
  character is, so it was quietly dimming the one thing worth seeing.
- Galactica drifts a mixed fleet: wedges, saucers and haulers rather than one
  repeated hull, with running lights in a second colour.
- Mount Fuji drifts white cloud shapes, each built from a different number of
  lobes so no two silhouettes match.
- Carbon drifts plain points of light. The comet tails were too busy for what
  is behind them.
- The popup has a fixed width. Without one the browser sized it to the widest
  row, which was the focus chips, and everything else had to live with that.
  The chips are an even grid now instead of five different widths in a flex
  row, the clock is smaller, and the labels under it are shorter.

### Fixed
- `tools/export-scenes.js` clears its output directory first. A layer that
  stopped being generated stayed in `assets/` and in git as a file nothing
  produced, and the freshness check in CI could not see it because it only
  compares files still being written. Removing the fog band left eighteen
  such orphans.

## [2.3.0] - 2026-09-01

### Changed
- The drifting layer is the thing that belongs in each picture instead of an
  abstract speck. Gulls over both beaches, petals over the blossom themes,
  ships over the space scene, tetrominoes over the arcade, comets over the star
  field, fireworks over the neon city, smoke over the fire-lit rooms, clouds
  over the mountain.
- Motifs cover the whole viewport rather than a strip along the bottom. That is
  safe because they are sparse, so the audit stopped capping their height and
  started measuring what they actually cover: shape count and the size of the
  largest one.
- Motifs take the WCAG AA floor rather than the AAA one the solid bands take. A
  handful of small shapes spread over a page is not a fill a paragraph is read
  against, and holding them to 7:1 made every one of them invisible on the dark
  themes. The wallpaper flanks were in the same trap in 1.4.1.
- Wallpaper saturation raised from 1.25 to 1.8. Pushing the exposure far enough
  to clear the contrast floor drains the colour, and the result read as a heavy
  grey filter over the picture rather than as the picture. Colour is close to
  independent of the luminance the floor constrains: measured across this set,
  1.8x moves the worst contrast by about 0.2 on the darkest theme and not at
  all on the lightest.

### Fixed
- The measurement now happens after saturation rather than before it, so the
  numbers recorded in src/wallpapers.js describe the image that actually
  ships.

## [2.2.0] - 2026-09-01

### Changed
- Every theme now has its own drift, not one of seven shared kinds. Eighteen
  different pictures with the same dust over them wasted the difference. Dust,
  ash, snow, star points, mist wisps, ember sparks, neon bokeh, seed fluff,
  smoke curls, lantern glow, blossom petals, meteor streaks, falling blocks,
  ocean glints, leaf fall, sun flares, wind streaks and cherry petals, one
  each, tinted from its own palette.
- Hawaii Ocean is cropped 30% off the top. Its source was drawn with the same
  leafy border as Palm Forest, so the two looked like the same picture wherever
  the top of the image showed. Cropping it also drops the shared green from the
  colour that fills above the image. Structural similarity between the two fell
  from 0.669 to 0.556.
- The image pipeline takes a per-source crop, so a shared border in the artwork
  can be handled without repainting anything.

## [2.1.0] - 2026-09-01

### Fixed
- The callout panel. NextWork puts some sections on a dark navy block, which is
  fine on a dark theme where it reads as one more surface. Light themes left it
  alone, so a near-black slab sat in the middle of a pale page, and the heading
  inside it went dark along with the rest of the page and disappeared into its
  own background.

  Every theme now has its own callout colour, tinted with that theme accent so
  it belongs to the palette instead of fighting it, and its own text colour
  measured against the panel rather than against the page. Text clears 7:1 on
  all eighteen, and the audit checks it.

### Changed
- Each theme picks the drift that suits its picture instead of all eighteen
  sharing mist and dust. Blossom themes get petals, forests get leaves, the
  fire-lit rooms get embers, night skies get stars, the retro theme gets
  falling blocks, and the cold scenes get fine snow. Seven kinds in all, each
  tinted from its own palette.

  Nothing here falls. The engine only pans a band sideways, so rain and snow
  drawn as streaks look wrong; everything drifting is material air would
  actually carry.
- Pinned actions moved to checkout 7.0.1 and setup-node 7.0.0, applied directly
  rather than through the two Dependabot pull requests, whose merge base no
  longer existed. Both are closed and their branches deleted.

## [2.0.0] - 2026-09-01

Renamed to Pineapple NextWork Theme Studio Mod.

### Fixed
- Nothing has been moving. The scoping pass added in 1.4.x prefixed keyframe
  selectors as well as element selectors, producing `html from`, which is not a
  valid keyframe selector. Browsers discard the whole block, so every parallax
  band in every theme has been sitting still since then, while the code that
  set the speeds, the wrap distance and the reduced-motion opt-out all looked
  correct. Keyframe bodies are now lifted out before scoping and put back
  after.
- The audit only checked that a stylesheet was non-empty, which is why the
  above passed for four releases. It now also rejects a scoped keyframe
  selector, unbalanced braces, and an empty background layer list.

### Added
- All 18 themes have a picture now, not just Concrete. Each one keeps mist and
  dust drifting over the top at staggered speeds, so no two themes animate in
  step.
- Wallpapers handle light and dark themes. A dark theme has light text, so its
  picture has to be dark and the brightest part is what fails. A light theme is
  the exact opposite. `tools/make-wallpaper.py` now picks the direction from
  the palette, and flips the measurement to match.
- Each wallpaper carries a thumbnail for the README gallery. Embedding the full
  images there made that one file 794 KB; it is 93 KB with thumbnails.

### Changed
- The top of every wallpaper fades to transparent, and the colour it fades into
  is measured and recorded so the stylesheet fills the space above it with the
  same value. Before this, shrinking the window left the picture sitting on a
  visible horizontal edge, which is exactly what makes an image look pasted on
  rather than part of the page.
- `tools/theme-info.js` reports each theme's mode and text colour, so the image
  pipeline reads the palette instead of hard-coding colours that live in
  `PRESETS`.
- `SECURITY.md` listed `activeTab` and the wrong host pattern in its capability
  table, and contradicted itself four lines later. Both rows now match the
  manifest.
- Decision 8 said all artwork is generated SVG, which stopped being true in
  1.4.0. It now states the rule and the exception, and what an image has to
  prove before it can ship.

## [1.5.0] - 2026-09-01

### Changed
- The wallpaper is sized `100% auto` and pinned to the bottom instead of
  `cover`. `cover` scales to height on a narrow window and crops inward from
  the sides, which took off the figure at the left edge and the doorway at the
  right - the two things worth looking at. Filling the width instead keeps both
  in frame from ultrawide down to a narrow window.
- Bare space above the image on a tall window is filled with the image's own
  sky colour, measured at generation time and recorded as `sky`. Filling it
  with the theme canvas drew a lighter band and a hard horizontal edge across
  the top of the scene.
- Wallpapers encode as WebP at 2560px rather than JPEG at 1600px. This artwork
  is mostly smooth dark gradients, the worst case for JPEG, and it banded right
  where the scene is darkest; it was also being upscaled on any wide screen.
  WebP holds the gradients at roughly a third the size, so the same budget buys
  the resolution. 72 KB.
- The mist and the dust drift were pitched well under the contrast floor and
  read as nothing. Both are now as bright as the gate allows, and both bands
  run at 26vh.
- `art/concrete-corridor.jpg` is stored at its full 2752x1536 rather than
  pre-downscaled, so the encoder has something to work from.

## [1.4.4] - 2026-09-01

### Fixed
- The contact sheet wrote into `_review/`, and Chromium reserves names starting
  with an underscore at an extension root. Since CONTRIBUTING tells you to load
  the repo root unpacked, running that tool made the extension refuse to load
  with an error naming the directory but not the cause. It is `review/` now,
  and the audit fails on any underscore-prefixed name at the root.

## [1.4.3] - 2026-09-01

### Fixed
- Warn instead of failing silently when a scene names a wallpaper that is not
  loaded. The layer was skipped with no error, which is indistinguishable from
  a stale build from the outside and cost real debugging time.

## [1.4.2] - 2026-09-01

### Fixed
- List both `https://nextwork.ai/*` and `https://*.nextwork.ai/*` in the
  content script matches. A wildcard host is documented to cover the bare host
  too, so 1.3.0 narrowed it to the one pattern - but that put whether the
  extension runs at all on a spec detail you cannot verify from the extensions
  page. Explicit is worth the extra line.

## [1.4.1] - 2026-09-01

### Changed
- The Concrete wallpaper is 3.2x brighter. Darkening the whole frame to clear
  7:1 had taken it to 0.17 of source exposure, and what reached the page was a
  smudge rather than a picture: the arches, the lit doorway and the figure
  were all technically present and effectively invisible.

  It now darkens in two zones. The reading column is a strip down the middle of
  the viewport; the rest is margin and panels. Scrimming that middle band lets
  the flanks run at 0.55 exposure instead of 0.17, which matters here because
  the composition puts everything worth looking at out at the edges. It ships
  at 7.44:1 in the reading column: the project's floor, WCAG AAA, and 4.90:1
  everywhere else, which is WCAG AA, so text straying outside the column is
  still readable rather than merely darker.
- The wallpaper audit check enforces both floors separately. A single global
  figure is what forced the picture down to the stricter one.

## [1.4.0] - 2026-09-01

### Added
- Concrete is now a corridor. It uses a raster wallpaper: an arcade at night
  looking toward a lit doorway, with mist along the floor and dust in the air
  drifting over it on the two parallax bands. The picture is fixed; the layers
  moving at different rates over it are what stop it reading as a desktop
  background someone pasted in.
- `src/wallpapers.js` carries raster wallpapers inline as data URIs. A content
  script cannot fetch a file: the site's CSP blocks it, and
  `web_accessible_resources` would widen the extension's surface for the sake
  of one picture. So the bytes ride in the injected stylesheet. Only the theme
  using one pays for it: Concrete's stylesheet is 78 KB, against 26-42 KB for
  the themes without a wallpaper, which are unchanged.
- `tools/make-wallpaper.py` encodes a source image from `art/`. An image cannot
  be contrast-checked the way a hex fill can, so it measures instead: it finds
  the gentlest exposure cut that still clears 7:1 against body text, taken on a
  blurred copy because a reader reads against the local average rather than a
  single pixel, which is also what lets the doorway keep a bright core. The
  corridor measured 2.40:1 as supplied and ships at 7.32:1.
- An audit check for wallpapers: inline data URIs only, a 160 KB cap, the
  recorded contrast has to clear the floor, and a scene cannot name a wallpaper
  that does not exist. Sixteen checks now.

### Fixed
- The `importScripts` exemption in the no-network check listed filenames, so
  adding a third library failed the audit. It now allows the call only when
  every argument is a bare local filename, which is the property that made it
  safe in the first place.

## [1.3.0] - 2026-09-01

First release prepared for a public repository. Most of this is the result of
reviewing the project as an outsider would read it.

### Fixed
- **The packaged archives were not loadable.** The Windows build path used
  PowerShell's `Compress-Archive`, which writes backslashes as path separators
  into the zip index. Every entry came out as one flat filename, so the
  manifest's reference to `src/content.js` resolved to nothing and the archives
  failed to install everywhere while the build still reported success. The
  build now uses `tar`, and reads each archive back before claiming it worked.
- Selectors inside a single-line `@media` block were never given the `html`
  prefix the rest of the sheet gets, so they lost every specificity tie. The
  narrow-window rule that moves the focus timer out from under the account menu
  had never once applied.
- Panel repair could not read the colours it was written to catch. It matched
  `rgb()` only, and this is a Tailwind v4 site, so computed colours arrive as
  `oklch()` and every test answered "not light". Colours now round-trip through
  a canvas first.
- A stale settings schema cleared the four dials on every popup open, because
  the migration ran on a copy that was never written back.
- The toolbar badge counted down in minutes but nothing ever ticked it, so it
  froze at the starting number. It now shows that a session is running and
  leaves the live count to the pill on the page.

### Security
- Removed the `activeTab` permission. It was requested and never used: the
  popup's reload button calls `chrome.tabs.reload()`, which needs no
  permission. `storage` is now the only one.
- Imported themes are validated instead of merged. Colours must be `#rrggbb`,
  dials are clamped, unknown keys are dropped, and custom CSS containing
  `url()`, `@import`, `image-set()` or `expression()` is refused, any of which
  could have made a live request from a page you are signed into.
- The zero-flash cache no longer trusts the page. It stored generated CSS in
  the site's own `localStorage` and injected whatever it found there at
  `document_start`; it now stores a theme id, checks it against the bundled
  presets, and builds the stylesheet itself.
- Host access narrowed to `https://*.nextwork.ai/*`.

### Changed
- The audit walks `src/` recursively, strips comments before scanning rather
  than skipping any line that starts with one, covers `optional_permissions`,
  `web_accessible_resources` and `externally_connectable`, checks the files the
  HTML pages load, and compares the manifest and package versions. Fifteen
  checks, up from thirteen.
- The focus HUD, the panel repair pass and the boot cache are confined to the
  top frame. With `all_frames` on, every same-origin subframe drew its
  own timer.
- Shadow-root adoption and the mutation sweep are coalesced, and the repair
  pass reads every element before writing to any of them rather than forcing a
  layout per node.
- `themes/` is gone. Ten hand-maintained JSON files duplicated palettes whose
  source of truth is `PRESETS`, nothing read them, and they shipped inside
  every package.
- `tools/gallery.js` renders every theme into `docs/img/themes.svg` for the
  README, and CI fails if it drifts from the code that generates it.

## [1.2.0] - 2026-09-01

### Added
- Per-browser packages. `node tools/build.js` writes a loadable folder for
  Chrome, Brave, Edge, Firefox and Safari into `dist/`, each carrying the
  install guide for its own extensions page, plus a zip for the stores.
- Firefox build: MV3 there has no service worker, so the background runs as an
  event page with its libraries listed in the manifest. `src/background.js`
  calls `importScripts` only where it exists, so one file serves both engines.
- Safari: source laid out for `safari-web-extension-converter`, with the Xcode
  steps written down. It cannot be loaded as a folder and is unverified -
  converting it needs a Mac.
- Panels that escape the token layer are now measured and repainted at runtime.
  Tooltips and side panels that are portalled away from their owner or built
  after load cannot be reached from a stylesheet; this finds anything still
  painting light on a dark theme and gives it the theme surface. Only touches
  elements large enough to be a panel. Switch in Extras.
- The focus timer can be locked. Locked, it cannot be dragged and clicks pass
  straight through it, so it can never be in the way.
- The focus timer only appears on project pages.

## [1.1.0] - 2026-09-01

### Added
- The focus timer can be dragged anywhere and remembers where it was put, as a
  fraction of the viewport so it holds its place when the window resizes.
  Double-click returns it to the corner. It is clamped on screen at all times.
- Focus timer: 15/25/45/60-minute sessions or open-ended count-up, an on-page
  pill and a toolbar badge. Counts across tabs and survives a restart.

### Fixed
- The Your Work overlay let the page bleed through it. The page ground is made
  transparent so scenery shows, but NextWork paints `.bg-paper` on sticky
  headers and modal panels too, so those went see-through as well. Positioned
  elements are panels rather than ground, and now keep their surface.
- The focus timer overlapped the account avatar and could be pushed off-screen.
- Eight bands across seven themes were invisible. The mask always faded the top
  edge, which is right for a band on the floor and destroys one hanging from
  the ceiling - it erased exactly the part meant to be seen. Palm Forest lost
  both of its layers that way. The fade now follows the band's anchor.
- Palm Forest has trees again: broadleaf crowns on trunks, distinct from Fog's
  conifers and Hawaii's palms, with the canopy kept overhead.
- Mount Fuji was cut off and bare. The hero ran at 116% width so its ridges ran
  off the edge, and the cone ended in a hard diagonal. It now fits, and the
  flanks wash back toward the sky so the mountain settles into the page.
- The focus timer collided with the account avatar and pushed its label outside
  the box. It sits lower now and sizes to its content.
- Galactica's planet was a flat filled circle, so its limb drew a hard curved
  edge straight through the reading column. The body is now a radial gradient
  that fades at the limb, and the fleet moved below the text.
- Article headings stayed near-black on a dark page. The body is a Tailwind
  Typography `.prose` container with its own eighteen `--tw-prose-*` variables,
  declared on the class itself and unrelated to NextWork's tokens, so every
  override missed them. All eighteen are now mapped, plus the `invert` set.
- The box at the bottom of the Steps list. Those scroll fades exist to blend a
  list into a cream page; on a themed page they can only paint a slab that does
  not match what is behind them, so they are removed rather than recoloured.
- Panels using Tailwind `from-white` gradient utilities painted a white sheet no
  token could reach; the gradient stops are now themed.
- Scenery reached into the reading column. Nine of eighteen scenes had bands
  44-70vh tall, so a pattern sat directly behind body copy - worst with the
  grid motifs, which read as ruled lines through the text. Bands are now capped
  (far 34vh, near 26vh) and CI enforces it.
- Scenery was as loud as the contrast floor permits. The tone targets sat right
  on the limit; they are now backed off, so a scene reads without competing.
- A horizontal line across the page: full-bleed gradients used
  `preserveAspectRatio="slice"`, which crops the outer ring where a gradient
  reaches zero opacity, so the background box edge still painted.
- Tooltips, menus and dialogs kept a white background with light text. They are
  rendered on demand and portalled away from their owner, so they missed the
  token pass; they are now themed by role.
- The assistant slide-over arrived as a white sheet over the page.
- The logo came back pale blue instead of white. `invert()` rotates hue as well
  as value, and their mark is a warm near-black. Driving it to black first and
  then inverting lands on neutral white whatever the source colour is.
- The giant footer wordmark read as a billboard. It ships at 6% opacity, which
  is far heavier as light-on-dark than as dark-on-light; it is now halved so it
  stays a watermark.

## [1.0.0] - 2026-09-01

First working version. Never published.

### Added
- 18 themes: 13 dark and 5 light, each with a layered backdrop.
- Live editor with nine palette colours, four relative dials, a WCAG contrast
  readout, the generated neutral ramp, a component preview, and custom CSS.
- Hand-drawn SVG scenery per theme, with parallax and a wallpaper toggle
  independent of the colour scheme. One exclusive motif per theme.
- Theme export/import as JSON.
- `Alt+Shift+D` to toggle.
- `tools/audit.js` as the CI gate; `tools/export-scenes.js` and
  `tools/contact-sheet.js` for working on scenery.

### Security
- No network calls, no `eval`, no `innerHTML`, no dependencies. Enforced in CI.
- Permissions limited to `storage` and `activeTab`; host access pinned to
  `*://*.nextwork.ai/*`.

[Unreleased]: https://github.com/RoyPiring/nextwork-theme-studio/compare/v2.6.0...HEAD
[2.6.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.6.0
[2.5.3]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.5.3
[2.5.2]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.5.2
[2.5.1]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.5.1
[2.5.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.5.0
[2.4.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.4.0
[2.3.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.3.0
[2.2.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.2.0
[2.1.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.1.0
[2.0.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.0.0
[1.5.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.5.0
[1.4.4]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.4.4
[1.4.3]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.4.3
[1.4.2]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.4.2
[1.4.1]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.4.1
[1.4.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.4.0
[1.3.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.3.0
[1.2.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.2.0
[1.1.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.1.0
[1.0.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.0.0
