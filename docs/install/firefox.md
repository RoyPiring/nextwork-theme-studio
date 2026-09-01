# Install on Firefox

This build differs from the Chromium one. Firefox MV3 has no service worker, so
the background runs as an event page and its two libraries are listed in the
manifest instead of being pulled in with `importScripts`. Everything else is the
same code.

**Firefox 121 or newer.** The code-block rules use `:has()`, which landed in
121. The manifest sets that as the minimum.

## Load it temporarily

1. Open `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on…**
3. Select the **`manifest.json`** file in this folder: the file, not the folder
4. Open nextwork.ai

If the page does not change, open the extensions button in the toolbar and
check that this add-on has access to nextwork.ai. Firefox's site-access model
has moved more than once and a manifest-declared content script is not always
granted silently.

`Alt+Shift+D` toggles the theme.

**A temporary add-on is removed when Firefox restarts.** That is a Firefox rule
for unsigned extensions, not something this package can change. To keep it
across restarts you need one of the options below.

## Keeping it installed

**Firefox Developer Edition, Nightly or ESR.** Set
`xpinstall.signatures.required` to `false` in `about:config`, then install
`dist/nextwork-theme-studio-firefox-<version>.xpi` through *Install Add-on From
File…*. Release and Beta builds enforce signing and ignore this setting.

**Sign it through Mozilla.** Submit the `.xpi` to
[addons.mozilla.org](https://addons.mozilla.org/developers/) and choose
*"On your own"* if you do not want it listed publicly. You get back a signed
`.xpi` that installs normally on any Firefox. It is free, and unlisted
submissions still go through an automated review.

The add-on ID is set to `nextwork-theme-studio@local` in the manifest. Change it
to something you own before submitting.

## Updating

Temporary add-ons have a **Reload** button on the `about:debugging` page. Use
that, then refresh any nextwork.ai tab that is already open.

## Known differences from Chromium

- **Theme storage is per-browser.** Themes made in Chrome do not appear here.
  Use **Export theme** in the editor and **Import** on the other side.
- Firefox draws `backdrop-filter` slightly differently, so the frosted effect on
  the focus timer is a touch softer. Cosmetic only.
- The scenery uses constructable stylesheets to reach NextWork's web components.
  Firefox has supported those since 101, so this works, but it is the part most
  likely to behave differently if Mozilla changes shadow DOM styling.
