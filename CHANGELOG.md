# Changelog

Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versioning is [semver](https://semver.org/); the `version` field in
`manifest.json` is the source of truth.

## [Unreleased]

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
