# NextWork Theme Studio

[![audit](https://github.com/RoyPiring/nextwork-theme-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/RoyPiring/nextwork-theme-studio/actions/workflows/ci.yml)

An unofficial theme extension for [nextwork.ai](https://nextwork.ai). Eighteen
themes, a live palette editor, and generated scenery behind the page. Chromium
browsers load it directly; Firefox and Safari are packaged but unverified.

Not affiliated with NextWork. The extension makes no network requests at all.

![The eighteen themes](docs/img/themes.svg)

## Try it in a minute

```bash
git clone https://github.com/RoyPiring/nextwork-theme-studio
```

Open `chrome://extensions`, turn on **Developer mode**, click **Load unpacked**,
and pick the folder you just cloned. There is nothing to build — the manifest
and `src/` sit at the repository root.

Brave hides that page behind menu → Extensions → **Manage Extensions**; typing
`brave://extensions` lands on a settings page with no Developer mode toggle.
Edge is `edge://extensions`.

Then open nextwork.ai. `Alt+Shift+D` toggles the theme, and you can rebind it at
`chrome://extensions/shortcuts`.

Firefox and Safari need a packaged build — see below.

## Use it

Click the toolbar icon:

- **Theme** — on/off.
- **Wallpaper** — scenery on/off, independent of the colours.
- **Focus** — a timer on the page, for timeboxing a project.
- Pick any of the 18 themes. Four dials re-tint every neutral at once.

**Open editor** gives you the full palette: nine colours, a live WCAG contrast
readout, the generated neutral ramp, a component preview, and a custom CSS box.
Presets are read-only — change a colour and it forks into a theme of your own.

Themes live in `chrome.storage.local`, so they stay on the machine that made
them. Use **Export theme** / **Import** to move one between browsers.

### Focus timer

Pick a length — 15/25/45/60 minutes, or **Count up** for an open session — and
press Start. A small pill sits in the corner of the page and the toolbar badge
shows the minutes left, so you can glance without opening anything.

It counts across every tab, survives closing the popup, and keeps counting past
zero rather than stopping, so an overrun is visible instead of silent. Time is
stored as timestamps, not as a running counter, so nothing is lost or
double-counted if the browser restarts.

## Packaging for other browsers

```bash
node tools/build.js
```

That writes `dist/chrome`, `dist/brave`, `dist/edge`, `dist/firefox` and
`dist/safari`, each with its own `INSTALL.md`, plus a zip ready to upload to a
store. The audit runs first and nothing is written if it fails.

Chrome, Brave and Edge are byte-identical Chromium builds — the separate folders
exist so each carries the right install guide. Firefox needs a different
manifest, because MV3 there runs the background as an event page rather than a
service worker, and a temporary add-on is dropped on restart unless it is
signed. Safari cannot be loaded as a folder at all; it has to be converted into
a native app with Xcode on a Mac.

Per-browser detail is in [docs/BROWSERS.md](docs/BROWSERS.md), and each
`docs/install/*.md` is the guide that ships inside its package.

## How it works

NextWork is built on Tailwind v4, and every utility resolves through a CSS
variable: `.bg-gray-50` is literally `background-color: var(--color-gray-50)`.
So the extension doesn't fight the site with a wall of `!important` — it
redefines the design tokens and lets the site restyle itself.

Doing that properly means handling four variable families, the last of which
lives inside shadow roots that no document stylesheet can reach. Full detail,
including the two cascade traps that cost the most time, is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The reasoning behind the choices
that are expensive to reverse is in [docs/DECISIONS.md](docs/DECISIONS.md).

### Scenery

Each theme has its own scene — an arcade, a ridge line, rooftops, bamboo, a
skyline, a planet. One motif belongs to exactly one theme, and CI fails if two
share.

All of it is original SVG in `src/scenes.js`; there is no stock photography and
nothing is fetched. Toggle it with **Wallpaper** in the popup, independently of
the colours.

Body copy on nextwork.ai is read against the scenery rather than on top of a
panel, which is the constraint that shapes every scene and the reason they read
as watermarks. Why that is, and what CI checks because of it, is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#scenery).

## Layout

```
manifest.json          MV3, matches *://*.nextwork.ai/*
src/theme-engine.js    Palettes, contrast maths, CSS generation
src/scenes.js          Motif generators and the scene per theme
src/content.js         Injects the stylesheet, adopts it into shadow roots
src/background.js      Keyboard shortcut and toolbar badge
src/popup.*            Toolbar panel
src/options.*          The editor
assets/                Generated SVG layers, for looking at and editing
tools/                 Audit gate, asset export, gallery, contact sheet, packaging
docs/                  Architecture, decisions, browser guides, release process
docs/img/              Generated images used by this README
```

## Working on it

No build step and no dependencies. Edit a file, hit reload on the extension
card, refresh the tab. Node 18+ is needed only for the tools.

```bash
node tools/audit.js           # the CI gate - run before every commit
node tools/build.js           # per-browser packages into dist/
node tools/export-scenes.js   # regenerate assets/*.svg from scenes.js
node tools/gallery.js         # regenerate docs/img/themes.svg
node tools/contact-sheet.js   # render all 18 scenes at reading size
```

`tools/audit.js` is the important one. It validates the manifest, parses every
file, enforces that the extension makes no network calls and uses no `eval` or
`innerHTML`, and runs the full contrast floor across all 18 themes. Every check
in it exists because that bug actually shipped at some point during development.

[CONTRIBUTING.md](CONTRIBUTING.md) · [SECURITY.md](SECURITY.md) ·
[CHANGELOG.md](CHANGELOG.md) · [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md)

## Licence

MIT — see [LICENSE](LICENSE).

## Related

[ZAG23/nextwork-dark](https://github.com/ZAG23/nextwork-dark) is a separate,
earlier dark-mode extension for the same site, also MIT. This project is an
independent implementation and shares no code with it — a runtime theming engine
rather than a static stylesheet. If you want one warm dark theme and nothing
else, that one is smaller and simpler.
