# Decisions

Short records of choices that are expensive to reverse or easy to undo by
accident. Each one exists because the alternative was tried and failed.

---

## 1. Override design tokens, not rules

**Decision.** Redefine NextWork's CSS variables and let the site restyle itself,
rather than matching their selectors with `!important`.

**Why.** Every Tailwind v4 utility resolves through a variable, so the token
layer reaches components that don't exist yet. A selector-matching approach
breaks on their next release.

**Cost.** You have to find *all* the token families, including the namespaced
aliases and the ones inside shadow roots. That is most of the complexity in
`theme-engine.js`.

---

## 2. Scope every selector under `html`

**Decision.** Generated selectors are prefixed `html `, and the token block uses
`:root:root`.

**Why.** The content script runs at `document_start`, so its stylesheet is
*earlier* than the site's. On equal specificity the later rule wins, so their
unlayered `body { background: #f8f5f1 }` beat ours and the page stayed cream
while the text went light.

**Rejected.** Blanket `!important`. It works, but it makes the sheet impossible
to override from the editor's custom CSS box, and it fights every future change.

---

## 3. Adopt a second stylesheet into shadow roots

**Decision.** Build a shadow-scoped copy of the CSS and push it into every open
shadow root with `adoptedStyleSheets`.

**Why.** 86 open roots on one page, each carrying the site theme on `:host`.
Nothing in the document can reach them.

**Note.** `:host:host` parses but still loses. `:host(:not(#id))` is the valid
way to buy ID-level specificity. This is not obvious and cost an afternoon.

---

## 4. Relative dials, not absolute

**Decision.** Tint rotates hue; saturation scales the theme's existing
saturation. `0` / `100%` leaves a theme exactly as designed.

**Why.** Absolute dials overwrote every neutral's hue with one value, which
flattened the thing that made themes distinct — Dark Japandi's rosy oatmeal over
cocoa became the same grey as everything else.

**Migration.** Old dial positions mean something different now, so `migrate()`
drops stored dial state at schema 2 rather than silently desaturating.

---

## 5. Contrast is enforced in CI, not documented

**Decision.** `tools/audit.js` fails the build if any theme drops below the
floor, including every scenery fill and backdrop stop.

**Why.** Article text on nextwork.ai sits directly on the page background, so
scenery is read *through* body copy. A pretty palette that fails at 4:1 is not a
palette. It has already caught one real regression: all five light themes shipped
with borders below the visibility floor because the check had only ever been run
against dark themes.

---

## 6. Solve scenery tone against the floor

**Decision.** `toneOf(hue, text, target)` computes the lightness that sits just
inside the contrast limit, rather than hand-picking hex values.

**Why.** Hand-picked fills sat at 11:1 when 7:1 was allowed. The art was
technically present and practically invisible — most of the usable range went
unused. The solver recovers it while keeping the guarantee.

---

## 7. One motif per theme

**Decision.** Each scene declares `motifs`, and the audit fails on any overlap.

**Why.** `ridgeBand` was in five themes and `cloudBank` in four. Eighteen
wallpapers felt like three. The rule is mechanical, so it belongs in CI rather
than in review.

---

## 8. Draw the scenery, don't ship photographs

**Decision.** All artwork is original SVG in `src/scenes.js`.

**Why.** Stock photography puts someone else's copyright in the repository, and a
raster image cannot be recoloured to match a palette or contrast-checked against
body text. The whole set is 32 KB.

**Limit, stated plainly.** This buys stylised depth, not photorealism. If a
photographic backdrop is ever wanted, it needs an image the project owns, and the
masking, blur, grain and contrast-guarding already exist to host it.

---

## 9. No dependencies, no build step

**Decision.** Plain files, loaded unpacked. Node is used only for `tools/`.

**Why.** Nothing to audit, nothing to update, no lockfile, no supply chain. For
an extension with access to a page you are signed into, that is worth more than
the ergonomics of a bundler.

---

## 10. MIT, and independent of `nextwork-dark`

**Decision.** MIT licence; no code shared with
[ZAG23/nextwork-dark](https://github.com/ZAG23/nextwork-dark).

**Why.** That project is a static stylesheet gated on an attribute; this is a
runtime theming engine. They are not compatible codebases, so this is a separate
project rather than a fork or a pull request. Same licence, no conflict.
