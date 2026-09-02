# Regenerating assets

Four things in this repository are generated from source rather than edited by
hand. Continuous integration rebuilds them and fails if the committed files do
not match, so regenerate and commit them together with whatever you changed.

| Generated | From | Command |
| --- | --- | --- |
| `src/wallpapers.js` | `art/*.jpeg` | `python tools/make-wallpaper.py --all art` |
| `assets/*.svg` | `src/scenes.js` | `node tools/export-scenes.js` |
| `docs/img/themes.svg` | themes and scenes | `node tools/gallery.js` |
| `icons/icon*.png` | `art/cherry-blossom.jpeg` | `python tools/make-icon.py` |

The Python tools need Pillow:

```bash
pip install pillow
```

## Wallpapers

```bash
python tools/make-wallpaper.py --all art        # all of them
python tools/make-wallpaper.py concrete art/concrete.jpeg   # just one
```

Source images live in `art/` and are build input only. Nothing in `art/` ships
in the extension. The tool darkens or lightens each image until the reading
column clears a contrast ratio of 7:1, pushing the middle of the frame further
than the sides, and writes the result into `src/wallpapers.js` as an embedded
image along with the measurements the tests check.

Dark themes get darker and light themes get lighter, because text on a dark
theme is light and text on a light theme is dark, so the failure is at opposite
ends of the image.

## Scenery

```bash
node tools/export-scenes.js
```

Writes each theme's drifting layers to `assets/` as SVG files you can open and
look at. These are a preview of what `src/scenes.js` generates at runtime; the
extension does not load them.

## Theme gallery

```bash
node tools/gallery.js
```

Rebuilds `docs/img/themes.svg`, the grid shown in the README and in
[THEMES.md](../THEMES.md). Run it after adding a theme or changing a palette.

## Icon

```bash
python tools/make-icon.py
```

Writes `icons/icon16.png`, `icon32.png`, `icon48.png` and `icon128.png`.

The icon is the character from the wallpapers, cut out of
`art/cherry-blossom.jpeg`. The background there is a pale even wash and the
character is gold, dark green and black, so a flood fill inward from the border
that may only cross pale, unsaturated pixels stops on his outline. Comments in
the tool record the measured values that set those thresholds.
