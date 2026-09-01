# Browser support

`node tools/build.js` writes one loadable folder per browser into `dist/`,
each with its own `INSTALL.md` inside it. The audit runs first, so a failing
build produces nothing.

| Browser | Folder | Loadable directly | Survives restart | Notes |
| --- | --- | --- | --- | --- |
| Chrome | `dist/chrome` | yes | yes | Reference build |
| Brave | `dist/brave` | yes | yes | Same files; different route to the extensions page |
| Edge | `dist/edge` | yes | yes | Same files |
| Firefox | `dist/firefox` | yes, temporarily | **no** | Event-page manifest; needs signing to persist |
| Safari | `dist/safari` | **no** | n/a | Must be converted with Xcode on macOS |

## Why there are five folders for two builds

Chrome, Brave and Edge take byte-identical files. They get separate folders so
each can be uploaded without renaming anything, and so each carries the guide
for its own extensions page — the three pages differ enough to be worth writing
down, particularly Brave's, where `brave://extensions` does not lead where you
would expect.

## What actually differs

**Firefox** has no service worker in MV3. The background runs as an event page,
so `background.service_worker` is replaced with `background.scripts` listing the
two libraries in load order. `src/background.js` calls `importScripts` only when
it exists, so the same file works in both. The manifest also carries a
`browser_specific_settings.gecko` block with an add-on ID and a minimum version
of 121 — the floor for `:has()`, which the code-block rules use.

A temporary add-on is removed when Firefox restarts. Keeping it installed means
either Developer Edition with `xpinstall.signatures.required` off, or a signed
`.xpi` from addons.mozilla.org. Unlisted submissions are free.

**Safari** is a different kind of thing. A Safari web extension is a native
macOS app wrapping the extension, produced by
`xcrun safari-web-extension-converter` and built in Xcode. There is no
load-unpacked equivalent, and the conversion only runs on macOS.

## Verification status

Chrome, Brave and Edge share the build that has been used and checked
throughout development.

**Firefox and Safari are unverified.** The Firefox manifest is correct for MV3
event pages and the APIs used are all supported in 121+, but this was built on
Windows and no Firefox run has confirmed it. Safari has not been converted at
all — that needs a Mac. Treat both as "should work, not yet proven".

The things most likely to differ are the two that reach furthest into the page:
the constructable stylesheet pushed into NextWork's web components, and the
runtime pass that repaints panels the token layer cannot reach.
