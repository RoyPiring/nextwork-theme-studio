# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning is [semver](https://semver.org/); the `version` field in
`manifest.json` is the source of truth.

1.3.0 is the first version published to a public repository. Entries below it
were never released.

## [2.8.3] - 2026-09-02

### Changed
- The label and switch in each toggle tile are centred.

## [2.8.2] - 2026-09-02

### Changed
- The extension icon is the pineapple character cut out of the Cherry Blossom
  artwork by `tools/make-icon.py`, replacing the drawn version added in 2.8.1.
- The three toggles at the top of the popup stack their label above their
  switch, so no label is cut off.
- "Surprise me" restyled as a quiet control beside the section label.

## [2.8.1] - 2026-09-02

### Changed
- New extension icon: the pineapple character from the wallpapers, replacing
  the light and dark split circle.

## [2.8.0] - 2026-09-02

### Added
- "Surprise me" button above the theme grid. It picks a theme at random, never
  the one already showing.

### Changed
- Espresso's smoke is drawn as soft blurred puffs instead of thin curved lines.
- Dark Japandi drifts blue stars instead of smoke.
- The Galactica fleet is black, smaller, and twice as many ships.

### Fixed
- The popup grid is centred. The scrollbar gutter is now reserved on both
  edges instead of taking its width from the right side only.

## [2.7.0] - 2026-09-02

### Added
- A size control for the focus timer, from 80% to 220%. Text, padding and
  corners scale together, so the pill grows in width as well as height.

### Changed
- The focus panel is split into two named groups: "Session" for the clock and
  session lengths, "On the page" for size, lock and placement.
- The focus timer appears only on project pages, not on the project index or
  other pages containing the word.

## [2.6.6] - 2026-09-02

### Fixed
- Suggestion bubbles on the home page were the same colour as the pill behind
  them. Their text is written in `oklab`, which is now converted correctly
  instead of being read as an unknown colour and skipped.
- Gradients are no longer treated as artwork, so elements with a decorative
  gradient are corrected again. Only real pictures are skipped.

## [2.6.5] - 2026-09-02

### Fixed
- Project card titles turned black and disappeared into their artwork on light
  themes. Text sitting over a picture is now left alone, since its background
  cannot be measured.

## [2.6.4] - 2026-09-02

### Fixed
- Suggestion chips and the composer on the home page kept the page colour on
  light themes. The correction now reaches inside the site's web components.
- Placeholder text is held to a readability floor while still reading quieter
  than body text.
- Text dimmed because a control is disabled keeps its dimming, identified from
  the DOM rather than from its contrast.

## [2.6.3] - 2026-09-02

### Fixed
- Headings and chips that vanished into the page on the five light themes. The
  correction now measures contrast rather than matching class names, and
  repoints text in whichever direction its background needs.

## [2.6.2] - 2026-09-01

### Fixed
- White text vanished on light themes. White text is now repointed only where
  it sits on a light background, and left alone on dark cards.
- The light and dark corrections share one palette, one scheduler and one undo,
  so both re-run when the page changes.

## [2.6.1] - 2026-09-01

### Fixed
- Panels were invisible on light themes. Panels now carry a measured border and
  a soft shadow, drawn as a ring so element sizes are unchanged. The border
  clears 1.45:1 against the panel on every theme.

## [2.6.0] - 2026-09-01

### Changed
- Panels are translucent at 72% with a blur behind them, so the wallpaper reads
  through as a wash instead of being covered by a flat slab. Body text still
  clears 7.5:1 against the worst point of every wallpaper.

## [2.5.3] - 2026-09-01

### Fixed
- Cards let the wallpaper through. An element now counts as a panel if any one
  of three things is true: something positioned sits above it, it is nested
  inside another element with the same class, or it is narrower than the page.

## [2.5.2] - 2026-09-01

### Fixed
- In a split view, the page behind showed through the pane in front. Anything
  with a positioned ancestor keeps its background.

## [2.5.1] - 2026-09-01

### Fixed
- The loading skeleton was invisible on light themes, so a loading page looked
  blank. It is now measured against the page and clears 1.45:1 everywhere.

## [2.5.0] - 2026-09-01

### Added
- A unit test suite in `tests/`, run by `npm test` and in CI. It uses
  `node:test`, so the project still has no dependencies.

### Fixed
- The stylesheet was rewritten on every storage write, forcing a full restyle.
  Identical settings now produce identical output.
- Panels kept the colours of whichever theme was active when they first
  appeared. There is now an undo that runs when the palette changes.
- A storage read whose answer was overtaken could still be applied. Reads now
  drop themselves if a newer one has started.
- Dragging a dial wrote to storage on every pixel of travel. The preview stays
  live; the write waits for the drag to settle.
- Committing a colour in the editor removed the input the pointer was inside.
- The editor preview showed no wallpaper.
- Silent failures now report: a refused clipboard, an unreadable import file,
  and unchecked extension errors in the popup and background.
- The mutation observer walked the whole document on every change. It now walks
  only what was added.

## [2.4.0] - 2026-09-01

### Changed
- Removed the fog band along the bottom of every theme, which covered the part
  of the picture where the character stands.
- Reduced the vignette from 0.34 to 0.14 on dark themes and 0.10 to 0.05 on
  light ones, so the corners are no longer dimmed.
- Galactica drifts a mixed fleet of wedges, saucers and haulers with running
  lights.
- Mount Fuji drifts cloud shapes, each built from a different number of lobes.
- Carbon drifts plain points of light instead of comet tails.
- The popup has a fixed width, an even grid of focus chips, a smaller clock and
  shorter labels.

### Fixed
- `tools/export-scenes.js` clears its output directory first, so layers that
  are no longer generated do not linger in `assets/`.

## [2.3.0] - 2026-09-01

### Changed
- Each drifting layer now suits its picture: gulls over the beaches, petals
  over the blossom themes, ships over the space scene, tetrominoes over the
  arcade, comets over the star field, fireworks over the neon city, smoke over
  the fire-lit rooms, clouds over the mountain.
- Motifs cover the whole viewport instead of a strip along the bottom. The
  audit measures shape count and largest shape rather than capping height.
- Motifs are held to the WCAG AA floor rather than AAA, which had made them
  invisible on dark themes.
- Wallpaper saturation raised from 1.25 to 1.8, so the pictures keep their
  colour instead of reading as a grey filter.

### Fixed
- Wallpaper contrast is measured after saturation, so the recorded numbers
  describe the image that ships.

## [2.2.0] - 2026-09-01

### Changed
- Every theme has its own drifting motif, tinted from its own palette, instead
  of sharing one of seven kinds.
- Hawaii Ocean is cropped 30% off the top so it no longer resembles Palm
  Forest.
- The image pipeline accepts a per-source crop.

## [2.1.0] - 2026-09-01

### Fixed
- The callout panel was a near-black slab on light themes, with its heading
  invisible inside it. Every theme now has its own callout colour tinted with
  its accent, and text measured against the panel. Text clears 7:1 on all 18,
  and the audit checks it.

### Changed
- Each theme picks the drift that suits its picture: petals, leaves, embers,
  stars, falling blocks or fine snow.
- Pinned CI actions to checkout 7.0.1 and setup-node 7.0.0.

## [2.0.0] - 2026-09-01

Renamed to Pineapple NextWork Theme Studio Mod.

### Added
- All 18 themes have a picture, not just Concrete, with mist and dust drifting
  over each at staggered speeds.
- Wallpapers handle light and dark themes, with the direction and measurement
  taken from the palette.
- Each wallpaper carries a thumbnail for the README gallery, which cut that
  file from 794 KB to 93 KB.

### Fixed
- Nothing had been moving since 1.4.x. The scoping pass was prefixing keyframe
  selectors, which browsers discard. Keyframe bodies are now lifted out before
  scoping and put back after.
- The audit rejects scoped keyframe selectors, unbalanced braces and empty
  background layer lists.

### Changed
- The top of every wallpaper fades to transparent, and the space above it is
  filled with the picture's own measured sky colour, so there is no visible
  horizontal edge.
- `tools/theme-info.js` reports each theme's mode and text colour.
- Corrected the capability table in `SECURITY.md` to match the manifest.
- Corrected decision 8, which said all artwork is generated SVG.

## [1.5.0] - 2026-09-01

### Changed
- The wallpaper is sized `100% auto` and pinned to the bottom instead of
  `cover`, which had cropped the figure and the doorway on narrow windows.
- Space above the image is filled with its own measured sky colour.
- Wallpapers encode as WebP at 2560px instead of JPEG at 1600px, which holds
  the gradients at roughly a third the size. 72 KB.
- The mist and dust are now as bright as the contrast gate allows, both at
  26vh.
- `art/concrete-corridor.jpg` is stored at full resolution.

## [1.4.4] - 2026-09-01

### Fixed
- The contact sheet wrote into `_review/`, and a leading underscore at an
  extension root makes Chromium refuse to load it. It is `review/` now, and the
  audit fails on any underscore-prefixed name at the root.

## [1.4.3] - 2026-09-01

### Fixed
- Warn instead of failing silently when a scene names a wallpaper that is not
  loaded.

## [1.4.2] - 2026-09-01

### Fixed
- List both `https://nextwork.ai/*` and `https://*.nextwork.ai/*` in the
  content script matches.

## [1.4.1] - 2026-09-01

### Changed
- The Concrete wallpaper is 3.2x brighter. It darkens in two zones: the reading
  column is scrimmed so the flanks can run at 0.55 exposure instead of 0.17. It
  ships at 7.44:1 in the reading column and 4.90:1 elsewhere.
- The wallpaper audit enforces the reading-column and edge floors separately.

## [1.4.0] - 2026-09-01

### Added
- Concrete uses a raster wallpaper, with mist and dust drifting over it.
- `src/wallpapers.js` carries raster wallpapers inline as data URIs, since a
  content script cannot fetch a file. Only the theme using one pays for it.
- `tools/make-wallpaper.py` finds the gentlest exposure cut that still clears
  7:1 against body text, measured on a blurred copy.
- An audit check for wallpapers: inline data URIs only, a 160 KB cap, recorded
  contrast above the floor, and no scene naming a missing wallpaper.

### Fixed
- The `importScripts` exemption in the no-network check now allows the call
  only when every argument is a bare local filename.

## [1.3.0] - 2026-09-01

First release prepared for a public repository.

### Fixed
- The packaged archives were not loadable. The Windows build wrote backslashes
  into the zip index, so every entry came out as one flat filename and the
  archives failed to install while the build reported success. The build now
  uses `tar` and reads each archive back before reporting success.
- Selectors inside a single-line `@media` block were not given the `html`
  prefix, so the rule that moves the focus timer out from under the account
  menu had never applied.
- Panel repair matched `rgb()` only, and this is a Tailwind v4 site, so
  computed colours arrive as `oklch()`. Colours now round-trip through a canvas.
- A stale settings schema cleared the four dials on every popup open.
- The toolbar badge froze at its starting number. It now shows that a session
  is running and leaves the live count to the pill on the page.

### Security
- Removed the `activeTab` permission, which was never used. `storage` is now
  the only one.
- Imported themes are validated rather than merged. Colours must be `#rrggbb`,
  dials are clamped, unknown keys dropped, and custom CSS containing `url()`,
  `@import`, `image-set()` or `expression()` is refused.
- The zero-flash cache stores a theme id and builds the stylesheet itself,
  instead of injecting CSS found in the site's own `localStorage`.
- Host access narrowed to `https://*.nextwork.ai/*`.

### Changed
- The audit walks `src/` recursively, strips comments before scanning, covers
  `optional_permissions`, `web_accessible_resources` and
  `externally_connectable`, checks files the HTML pages load, and compares the
  manifest and package versions. Fifteen checks, up from thirteen.
- The focus timer, panel repair and boot cache are confined to the top frame,
  so subframes no longer each draw their own timer.
- Shadow-root adoption and the mutation sweep are coalesced, and the repair
  pass reads every element before writing to any of them.
- Removed `themes/`: ten hand-maintained JSON files duplicating `PRESETS` that
  nothing read and that shipped in every package.
- `tools/gallery.js` renders every theme into `docs/img/themes.svg`, and CI
  fails if it drifts from the code.

## [1.2.0] - 2026-09-01

### Added
- Per-browser packages. `node tools/build.js` writes a loadable folder for
  Chrome, Brave, Edge, Firefox and Safari into `dist/`, each with its own
  install guide, plus a zip for the stores.
- Firefox build, which runs the background as an event page rather than a
  service worker. One file serves both engines.
- Safari source laid out for `safari-web-extension-converter`, with the Xcode
  steps written down. Converting it needs a Mac.
- Panels that escape the token layer are measured and repainted at runtime.
  Switchable in Extras.
- The focus timer can be locked, so it cannot be dragged and clicks pass
  through it.
- The focus timer appears only on project pages.

## [1.1.0] - 2026-09-01

### Added
- The focus timer can be dragged anywhere and remembers where it was put, as a
  fraction of the viewport. Double-click returns it to the corner.
- Focus timer: 15/25/45/60-minute sessions or open-ended count-up, an on-page
  pill and a toolbar badge. Counts across tabs and survives a restart.

### Fixed
- The Your Work overlay let the page bleed through it. Positioned elements
  count as panels and keep their surface.
- The focus timer overlapped the account avatar and could be pushed off-screen.
- Eight bands across seven themes were invisible, because the mask always faded
  the top edge. The fade now follows the band's anchor.
- Palm Forest has trees again: broadleaf crowns on trunks, distinct from Fog's
  conifers and Hawaii's palms.
- Mount Fuji was cut off and bare. It now fits, and the flanks wash back toward
  the sky.
- Article headings stayed near-black on a dark page. All eighteen
  `--tw-prose-*` variables are now mapped, plus the `invert` set.
- Removed the scroll fades at the bottom of the Steps list, which could only
  paint a slab that did not match what was behind them.
- Panels using Tailwind `from-white` gradient utilities painted a white sheet.
  The gradient stops are now themed.
- Scenery reached into the reading column. Bands are capped at 34vh far and
  26vh near, and CI enforces it.
- Scenery was as loud as the contrast floor permits. The tone targets are
  backed off.
- A horizontal line across the page, caused by full-bleed gradients cropping
  their outer ring.
- Tooltips, menus and dialogs kept a white background with light text. They are
  now themed by role.
- The assistant slide-over arrived as a white sheet over the page.
- The logo came back pale blue instead of white. It is driven to black first
  and then inverted.
- The giant footer wordmark is halved in opacity so it stays a watermark.

## [1.0.0] - 2026-09-01

First working version. Never published.

### Added
- 18 themes: 13 dark and 5 light, each with a layered backdrop.
- Live editor with nine palette colours, four dials, a WCAG contrast readout,
  the generated neutral ramp, a component preview and custom CSS.
- Hand-drawn SVG scenery per theme, with parallax and a wallpaper toggle
  independent of the colour scheme. One exclusive motif per theme.
- Theme export and import as JSON.
- `Alt+Shift+D` to toggle.
- `tools/audit.js` as the CI gate; `tools/export-scenes.js` and
  `tools/contact-sheet.js` for working on scenery.

### Security
- No network calls, no `eval`, no `innerHTML`, no dependencies. Enforced in CI.
- Permissions limited to `storage` and `activeTab`; host access pinned to
  `*://*.nextwork.ai/*`.

[Unreleased]: https://github.com/RoyPiring/nextwork-theme-studio/compare/v2.8.3...HEAD
[2.8.3]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.8.3
[2.8.2]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.8.2
[2.8.1]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.8.1
[2.8.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.8.0
[2.7.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.7.0
[2.6.6]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.6.6
[2.6.5]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.6.5
[2.6.4]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.6.4
[2.6.3]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.6.3
[2.6.2]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.6.2
[2.6.1]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v2.6.1
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
