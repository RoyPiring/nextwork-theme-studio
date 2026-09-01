# Install on Brave

Brave is Chromium, so the extension is identical to the Chrome build. Getting
to the extensions page is not.

## Load it

1. Open the Brave menu (☰) → **Extensions** → **Manage Extensions**

   Typing `brave://extensions` lands you on *Settings → Extensions*, which has
   no Developer mode toggle. You want the page reached through **Manage
   Extensions**. Brave changed this in v152; `chrome://extensions` typed into
   the address bar is refused outright.
2. Turn on **Developer mode** (top right)
3. Click **Load unpacked**
4. Select this folder — the one containing `manifest.json`
5. Open nextwork.ai

Pin it from the puzzle-piece icon in the toolbar.

`Alt+Shift+D` toggles the theme. Rebind at `brave://extensions/shortcuts`.

## Updating

Replace this folder's contents, then click **reload** on the extension's card,
then refresh any nextwork.ai tab that is already open. Reloading the extension
does not update tabs that are already loaded.

If a change does not appear, check the version on the card against the version
you built. If they differ, Brave is loading a different folder — check the path
shown on the card, and make sure the same extension is not loaded twice.

## Notes

- Brave Shields does not affect extension content scripts on a normal site.
- Keep this folder out of a cloud-synced directory. OneDrive's Files On-Demand
  can turn files into placeholders, and Brave will error on an unpacked
  extension it cannot read.
