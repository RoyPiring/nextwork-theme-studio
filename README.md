# NextWork Theme Studio

An unofficial theme extension for [nextwork.ai](https://nextwork.ai). Eighteen
themes, a live editor, and hand-drawn scenery behind the page. Chrome and Brave,
loaded unpacked.

Not affiliated with NextWork. The extension makes no network requests at all.

---

## Install

1. Open `chrome://extensions` — or, on Brave, `brave://extensions` and then click
   **Manage extensions** on that page. (Brave 152 redirects `brave://extensions`
   to a settings page with no Developer mode toggle.)
2. Turn on **Developer mode**.
3. **Load unpacked**, and pick this folder.
4. Open nextwork.ai.

`Alt+Shift+D` toggles the theme. Rebind at `chrome://extensions/shortcuts`.

## Use it

Click the toolbar icon:

- **Theme** — on/off.
- **Wallpaper** — scenery on/off, independent of the colours.
- Pick any of the 18 themes. Four dials re-tint every neutral at once.

**Open editor** gives you the full palette: nine colours, a live WCAG contrast
readout, the generated neutral ramp, a component preview, and a custom CSS box.
Presets are read-only — change a colour and it forks into a theme of your own.

Themes live in `chrome.storage.local`, so they stay on this machine. Use
**Export theme** / **Import** to move one between browsers.

---

## How it works

NextWork is built on Tailwind v4, and every utility resolves through a CSS
variable: `.bg-gray-50` is literally `background-color: var(--color-gray-50)`.
So the extension doesn't fight the site with a wall of `!important` — it
redefines the design tokens and lets the site restyle itself.

Doing that properly means handling four variable families, the last of which
lives inside 86 shadow roots that no document stylesheet can reach. Full detail,
including the two cascade traps that cost the most time, is in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md). The reasoning behind the choices
that are expensive to reverse is in [docs/DECISIONS.md](docs/DECISIONS.md).

### Scenery

Each theme has its own scene — an arcade, a ridge line, rooftops, bamboo, a
skyline, a planet. One motif belongs to exactly one theme, and CI fails if two
share, because reusing a silhouette made eighteen wallpapers feel like three.

All of it is original SVG in `src/scenes.js` — no stock photography. Toggle it
with **Wallpaper** in the popup, independently of the colours.

The constraint that shapes it: NextWork sets article text directly on the page
ground, so body copy is read *against* the scenery. Every large fill is
contrast-checked against body text at 7:1 and CI fails if one slips. That is why
these read as watermarks — a bold silhouette behind a paragraph is unreadable,
however good it looks alone.

---

## Layout

```
manifest.json          MV3, matches *://*.nextwork.ai/*
src/theme-engine.js    Palettes, contrast maths, CSS generation
src/scenes.js          Motif generators and the scene per theme
src/content.js         Injects the stylesheet, adopts it into shadow roots
src/background.js      Keyboard shortcut and toolbar badge
src/popup.*            Toolbar panel
src/options.*          The editor
themes/                Themes as importable JSON
assets/                Generated SVG layers, for looking at and editing
tools/                 Audit gate, asset export, contact sheet, packaging
docs/                  Architecture, decisions, publishing checklist
```

## Working on it

No build step and no dependencies. Edit a file, hit reload on the extension
card, refresh the tab.

```bash
node tools/audit.js           # the CI gate - run before every commit
node tools/export-scenes.js   # regenerate assets/*.svg from scenes.js
node tools/contact-sheet.js   # render all 18 scenes on one page to compare
node tools/package.js         # build a distributable zip
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
