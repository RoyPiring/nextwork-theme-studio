# Architecture

How the extension actually works, and why it is built this way. If you are
changing anything about how styles reach the page, read this first.

## The core idea

NextWork is built on Tailwind v4, and every utility resolves through a CSS
variable. `.bg-gray-50` compiles to `background-color: var(--color-gray-50)`.

That means you do not have to override their rules. You override their
*variables*, and the site restyles itself. The alternative — matching every
selector with `!important` — breaks the moment they ship a new component.

Four families have to be handled. Missing any one leaves half the page light.

### 1. The neutral ramp

Their scale runs `25` (lightest) to `950` (darkest), and `--color-gray-*` is
aliased to `--color-brand-*`, a warm brown. On a dark theme the ramp inverts:
low numbers become surfaces, high numbers become text.

### 2. The semantic layer

`--color-bg-*`, `--color-text-*`, `--color-fg-*`, `--color-border-*` and
`--color-utility-*` are hardcoded hex values, not aliases of the ramp. They are
what actually paints the signed-in app — cards, tables, skeletons, badges.
Overriding the ramp alone gets you a themed marketing page and a light app.

### 3. The namespaced aliases

Tailwind v4 emits a **second** variable for every theme key, and the utilities
reference those, not the ones above:

```css
.border-primary { border-color: var(--border-color-primary); }   /* not --color-border-primary */
.bg-primary     { background-color: var(--background-color-primary); }
```

Sixty of these exist: `--background-color-*`, `--border-color-*`,
`--text-color-*`, `--ring-color-*`, `--outline-color-*`. Miss the family and
every border and ring stays light while the page around it goes dark.

### 4. Shadow DOM

NextWork ships web components — `nw-tooltip`, `nw-button`, `nw-badge`,
`nw-icon`, `nw-modal-provider` and more. A single project page has **86 open
shadow roots**.

Each root carries its own copy of the site theme on `:host`. A document
stylesheet cannot reach inside one, so those components keep light-mode tokens
no matter what you do at `:root`.

`content.js` builds a second, shadow-scoped stylesheet and adopts it into every
open root via `adoptedStyleSheets`, re-scanning on mutation because the app
mounts components continuously.

## Winning the cascade without `!important`

Two ordering traps, both found the hard way.

**Document order.** The stylesheet is injected at `document_start`, which puts
it *before* the site's own sheets. Their unlayered rules therefore win every
specificity tie — including `body { background: #f8f5f1 }`, which is exactly how
you end up with a cream page and light text. Every generated selector is scoped
under `html`, and the token block uses `:root:root`, so ties are settled on
specificity and injection order stops mattering.

**Inside a shadow root** the same problem needs a different answer. `:host:host`
parses but still loses to the site's own `:host` block. The shadow copy uses
`:host(:not(#nwt-never))` — the valid way to buy ID-level specificity.

Tailwind's utilities live in `@layer`, and unlayered rules beat layered ones
outright, so `!important` appears in exactly two places.

## What tokens cannot fix

A short list, each with a switch in Extras:

| Thing | Why tokens miss it |
| --- | --- |
| The logo | Dark ink on transparent, needs inverting |
| Hero glow | A cream radial gradient in an inline `style` |
| `bg-[#FDEEE2]` classes | Arbitrary values, no variable involved |
| `.bg-secondary-alt`, `.bg-code-inline` | Semantic utilities carrying literal hex |
| Scroll fades | Class-based gradients ending in a literal cream |
| The Secret Mission card | An inline `data:` URI SVG filled with a cream hex |
| Code blocks | highlight.js ships its own light stylesheet |

## Colour

A theme is nine colours plus four relative dials. Everything else is derived.

`buildPalette()` produces the neutral ramp and a status ramp per family
(error, warning, success, information, plum, green, orange). Status tints sit at
5–13% colour over the canvas: on a dark ground anything heavier reads as a
coloured slab bolted onto the page, so the border and text carry the signal.

The dials are **relative** — tint rotates hue, saturation scales what the theme
already has. Absolute dials flattened every theme to one hue, which destroyed
the thing that made them distinct.

`toneOf(hue, textColour, targetRatio)` is the important helper. Give it a hue
and a contrast target and it solves the lightness that lands just inside the
floor. Picking those by eye is what left the first scenery invisible: fills sat
at 11:1 when 7:1 was permitted, so most of the usable range went unused.

## Scenery

Three layers per scene: a fixed `hero`, and `far` / `near` bands that tile
horizontally and pan at different speeds. The bands ride on root pseudo-elements
with a `translate3d` animation, which keeps motion on the compositor instead of
repainting the page every frame. Each travels exactly one tile width, so the
loop has no seam.

The page ground must be transparent for any of this to be visible: the bands sit
at `z-index: -1`, which paints *below* body's background box. The root keeps
painting the canvas colour, so nothing is lost.

Three things stop it looking like clip-art: gradient fills rather than flat ones,
atmospheric perspective (distant planes lose contrast, drift toward the sky, and
carry a real `blur()`), and a grain plus vignette pass.

Every band is masked so its top edge dissolves. A band that simply stops draws a
horizontal line, and on a page of text that line reads as a rule. Glows reach
zero *inside* their background box for the same reason.

**The constraint behind all of it:** NextWork sets article text directly on the
page ground, so body copy is read *against* the scenery. Every large fill is
contrast-checked against body text at 7:1 and CI fails if one slips. That is why
these read as watermarks rather than silhouettes.

**One motif per theme.** Each scene declares `motifs`, and the audit fails if two
scenes share one. Reusing a silhouette is what made eighteen wallpapers feel like
three.

## Files

```
src/theme-engine.js   Palettes, contrast maths, CSS generation. The whole brain.
src/scenes.js         Motif generators and the scene per theme.
src/content.js        Injects the stylesheet; adopts the shadow copy into roots.
src/background.js     Keyboard shortcut and toolbar badge.
src/popup.*           Toolbar panel.
src/options.*         The editor.
src/ui.css            Shared styling, dressed in the current theme.
```

Storage is `chrome.storage.local`. The generated stylesheet is also cached in the
page's own `localStorage` so the theme paints at `document_start` with no white
flash while `chrome.storage` answers asynchronously.
