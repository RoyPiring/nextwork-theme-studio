# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning is [semver](https://semver.org/); the `version` field in
`manifest.json` is the source of truth.

## [Unreleased]

### Added
- Focus timer: 15/25/45/60-minute sessions or open-ended count-up, an on-page
  pill and a toolbar badge. Counts across tabs and survives a restart.

### Fixed
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
