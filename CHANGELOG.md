# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning is [semver](https://semver.org/); the `version` field in
`manifest.json` is the source of truth.

## [Unreleased]

### Added
- Focus timer: 15/25/45/60-minute sessions or open-ended count-up, an on-page
  pill and a toolbar badge. Counts across tabs and survives a restart.

### Fixed
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
- 18 themes: 12 dark, 5 light with layered backdrops, and 2 retro.
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

[Unreleased]: https://github.com/OWNER/REPO/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/OWNER/REPO/releases/tag/v1.0.0
