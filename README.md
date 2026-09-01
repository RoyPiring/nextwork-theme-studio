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
So this extension doesn't fight the site with a wall of `!important` — it
redefines the design tokens and lets the site restyle itself.

Four layers, in order of how much work they do:

1. **The neutral ramp.** Their scale runs 25 (lightest) to 950 (darkest), and
   `--color-gray-*` is aliased to `--color-brand-*`, a warm brown. On a dark
   theme the low numbers become surfaces and the high numbers become text.
2. **The semantic layer.** `--color-bg-*`, `--color-text-*`, `--color-border-*`
   and `--color-utility-*` are hardcoded hexes rather than aliases, and they are
   what actually paints the signed-in app.
3. **The namespaced aliases.** Tailwind v4 emits a *second* variable per theme
   key, and the utilities reference those: `.border-primary` resolves
   `var(--border-color-primary)`, not `var(--color-border-primary)`. Miss this
   family and every border stays light while the page around it goes dark.
4. **Shadow DOM.** NextWork ships web components — `nw-tooltip`, `nw-button`,
   `nw-badge`, `nw-icon` and more; 86 roots on one project page. Each carries a
   copy of the site's theme on `:host`, which no document stylesheet can reach.
   The content script builds a second, shadow-scoped stylesheet and adopts it
   into every open root.

Then a short list of things tokens cannot fix: the dark-ink logo, a cream hero
glow in an inline style, arbitrary `bg-[#FDEEE2]` classes, semantic utilities
carrying literal hexes (`.bg-secondary-alt`, `.bg-code-inline`), scroll-fade
gradients, an inline `data:` URI SVG card, and highlight.js code blocks. Each
has a switch in Extras.

### Winning the cascade without !important

The stylesheet is injected at `document_start`, so it sits *before* the site's
own sheets and loses every specificity tie on document order — including
`body { background: #f8f5f1 }`, which is how the page ends up cream while the
text goes light. Every generated selector is scoped under `html`, and the token
block uses `:root:root`, so ties are decided on specificity instead.

Inside a shadow root the same problem needs a different answer: `:host:host`
parses but still loses, so the shadow copy uses `:host(:not(#nwt-never))` — the
valid way to buy ID-level specificity.

Tailwind's utilities live in `@layer`, and unlayered rules beat layered ones
outright, so `!important` appears in exactly two places.

### Scenery

Six scenes are drawn from reference images; the rest are built from the same
toolkit. All of it is original SVG authored in `src/scenes.js` — no stock
photography, nothing downloaded.

Three things keep it from looking like clip-art:

- **Gradient fills, never flat.** A flat fill has no light direction.
- **Atmospheric perspective.** Distant planes lose contrast, drift toward the
  sky colour, and carry a real `blur()`.
- **Grain and a vignette.** Perfectly smooth vectors read as vectors.

Every band is masked so its top edge dissolves. A band that simply stops draws a
horizontal line, and on a page of text that line reads as a rule. Glows reach
zero *inside* their background box for the same reason.

The constraint behind all of it: NextWork sets article text directly on the page
ground, so body copy is read *against* the scenery. Every large fill is
contrast-checked against body text at 7:1, and CI fails if one slips. That is why
these read as watermarks — a bold silhouette behind a paragraph is unreadable,
however good it looks alone.

---

## Layout

```
manifest.json          MV3, matches *://*.nextwork.ai/*
src/theme-engine.js    Palettes, contrast maths, CSS generation
src/scenes.js          The scenery, one scene per theme
src/content.js         Injects the stylesheet, adopts it into shadow roots
src/background.js      Keyboard shortcut and toolbar badge
src/popup.*            Toolbar panel
src/options.*          The editor
themes/                Themes as importable JSON
assets/                Generated SVG layers, for looking at and editing
tools/                 Audit gate, asset export, scene contact sheet
```

## Working on it

No build step and no dependencies. Edit a file, hit reload on the extension
card, refresh the tab.

```bash
node tools/audit.js           # the CI gate - run before every commit
node tools/export-scenes.js   # regenerate assets/*.svg from scenes.js
node tools/contact-sheet.js   # render all 18 scenes on one page to compare
```

`tools/audit.js` is the important one. It validates the manifest, parses every
file, enforces that the extension makes no network calls and uses no `eval` or
`innerHTML`, and runs the full contrast floor across all 18 themes. Every check
in it exists because that bug actually shipped at some point during development.

Contributions: [CONTRIBUTING.md](CONTRIBUTING.md). Security:
[SECURITY.md](SECURITY.md).

## Licence

MIT — see [LICENSE](LICENSE).

## Related

[ZAG23/nextwork-dark](https://github.com/ZAG23/nextwork-dark) is a separate,
earlier dark-mode extension for the same site, also MIT. This project is an
independent implementation and shares no code with it — a runtime theming engine
rather than a static stylesheet. If you want one warm dark theme and nothing
else, that one is smaller and simpler.
