# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning is [semver](https://semver.org/); the `version` field in
`manifest.json` is the source of truth.

1.3.0 was the first public release. The 1.0.0 and 1.1.0 entries below are
development milestones from before the repository went public, kept because
they record why several non-obvious parts of the code look the way they do.

## [1.4.0] - 2026-09-01

### Added
- Concrete is now a corridor. It uses a raster wallpaper — an arcade at night
  looking toward a lit doorway — with mist along the floor and dust in the air
  drifting over it on the two parallax bands. The picture is fixed; the layers
  moving at different rates over it are what stop it reading as a desktop
  background someone pasted in.
- `src/wallpapers.js` carries raster wallpapers inline as data URIs. A content
  script cannot fetch a file — the site's CSP blocks it, and
  `web_accessible_resources` would widen the extension's surface for the sake
  of one picture — so the bytes ride in the injected stylesheet. Only the theme
  using one pays for it: Concrete's stylesheet is 78 KB, against 26-42 KB for
  the themes without a wallpaper, which are unchanged.
- `tools/make-wallpaper.py` encodes a source image from `art/`. An image cannot
  be contrast-checked the way a hex fill can, so it measures instead: it finds
  the gentlest exposure cut that still clears 7:1 against body text, taken on a
  blurred copy because a reader reads against the local average rather than a
  single pixel — which is also what lets the doorway keep a bright core. The
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
- Removed the `activeTab` permission. It was requested and never used — the
  popup's reload button calls `chrome.tabs.reload()`, which needs no
  permission. `storage` is now the only one.
- Imported themes are validated instead of merged. Colours must be `#rrggbb`,
  dials are clamped, unknown keys are dropped, and custom CSS containing
  `url()`, `@import`, `image-set()` or `expression()` is refused — any of which
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
  top frame. With `all_frames` on, every same-origin subframe was drawing its
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

First public release.

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

[Unreleased]: https://github.com/RoyPiring/nextwork-theme-studio/compare/v1.4.0...HEAD
[1.4.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.4.0
[1.3.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.3.0
[1.2.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.2.0
[1.1.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.1.0
[1.0.0]: https://github.com/RoyPiring/nextwork-theme-studio/releases/tag/v1.0.0
