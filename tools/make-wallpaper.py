"""Turn a source image in art/ into a wallpaper the page can be read through.

    python tools/make-wallpaper.py concrete art/concrete.jpeg
    python tools/make-wallpaper.py --all art

Body copy on nextwork.ai sits straight on the page background with no panel
behind it, so a wallpaper is read *through* the text. The project's floor is a
contrast ratio of 7:1, and that is a hard limit on how much picture can survive.

Three problems, and this script exists for all three.

1. Direction. A dark theme has light text, so its wallpaper has to be dark: the
   brightest part of the image is what fails. A light theme has dark text, so
   its wallpaper has to be light, and the darkest part is what fails. The two
   need opposite treatment, and the measurement flips as well.

2. How much. Darkening the whole frame far enough to clear 7:1 works and also
   throws the picture away. So the middle band, where the reading column sits,
   is pushed further than the sides are. The sides are where the interesting
   parts of these images live, so this is most of the win.

     reading column   7:1    the project's floor, WCAG AAA for body text
     anywhere else    4.5:1  WCAG AA, so text outside the column stays readable

   Both are measured on a blurred copy, because nobody reads against a single
   pixel. They read against the local average. That is also what lets a small
   light source, such as a lit doorway, keep a bright core without failing.

3. The join. The image is sized to the viewport width and pinned to the bottom,
   so on a tall window there is empty space above it. A hard top edge makes it
   look like a photo pasted on. The top of the image is faded to transparent,
   and the colour it fades into is recorded so the stylesheet can fill the gap
   with the same value. The join then has no edge at any window size.

Needs Pillow: python -m pip install pillow
"""
import base64
import io
import json
import os
import re
import subprocess
import sys

try:
    from PIL import Image, ImageEnhance, ImageFilter
except ImportError:
    sys.exit("This needs Pillow:  python -m pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

COLUMN_FLOOR = 7.0
FLANK_FLOOR = 4.5
COLUMN = (0.15, 0.85)        # how wide the reading column can get
SCRIM_FULL = (0.18, 0.82)    # where the middle band is at full strength
SCRIM_FEATHER = 0.10
FADE = 0.22                  # fraction of the height that fades out at the top
SATURATION = 1.8             # see treat()
WIDTH = 2048
MAX_BASE64 = 72000

# Some sources were drawn with the same decorative border, which made two
# themes look like the same picture at the top. Crop it off rather than accept
# the collision: the fraction is taken off the top before anything else.
CROP_TOP = {
    "hawaiiOcean": 0.30,
}


def _to_linear(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _to_srgb(v):
    v = min(1.0, max(0.0, v))
    return 12.92 * v if v <= 0.0031308 else 1.055 * (v ** (1 / 2.4)) - 0.055


LINEAR = [_to_linear(i) for i in range(256)]


def _lut(factor, toward_white):
    """factor < 1 moves every value toward black, or toward white if asked."""
    out = []
    for i in range(256):
        v = LINEAR[i]
        v = 1.0 - (1.0 - v) * factor if toward_white else v * factor
        out.append(int(round(_to_srgb(v) * 255)))
    return out


def adjust(im, factor, toward_white):
    return im.point(_lut(factor, toward_white) * 3)


def treat(im, factor, strength, toward_white):
    """Exposure, then the scrim, then the colour back.

    Pushing the exposure this far drains the colour out, and the result reads
    as a heavy grey filter over the picture rather than as the picture. Putting
    saturation back fixes that almost for free: colour is close to independent
    of the luminance the contrast floor actually constrains. Measured on this
    set, 1.8x saturation moves the worst contrast by about 0.2 on the darkest
    theme and not at all on the lightest.

    The whole treatment happens here so the search measures exactly what ships.
    Saturating after the measurement, which is what it used to do, meant the
    recorded numbers were for a different image than the one in the file.
    """
    out = apply_scrim(adjust(im, factor, toward_white), strength, toward_white)
    return ImageEnhance.Color(out).enhance(SATURATION)


def apply_scrim(im, strength, toward_white):
    """Push the middle band further than the sides, feathered so no edge shows.

    Done one column at a time with a lookup table per column. Slower than a
    single multiply, but it keeps the maths in linear light and avoids adding
    numpy, which this repo does not otherwise need.
    """
    w, h = im.size
    lo, hi = SCRIM_FULL
    out = im.copy()
    cache = {}
    for x in range(w):
        t = x / w
        if t < lo - SCRIM_FEATHER or t > hi + SCRIM_FEATHER:
            continue
        if lo <= t <= hi:
            k = strength
        else:
            a = ((t - (lo - SCRIM_FEATHER)) / SCRIM_FEATHER if t < lo
                 else ((hi + SCRIM_FEATHER) - t) / SCRIM_FEATHER)
            k = 1.0 + (strength - 1.0) * (a * a * (3 - 2 * a))   # smoothstep
        key = round(k, 3)
        if key not in cache:
            cache[key] = _lut(key, toward_white) * 3
        out.paste(out.crop((x, 0, x + 1, h)).point(cache[key]), (x, 0))
    return out


def extreme_luminance(im, x0, x1, brightest):
    """Highest or lowest local luminance in a horizontal slice."""
    blurred = im.convert("RGB").filter(ImageFilter.GaussianBlur(radius=9))
    px = blurred.load()
    w, h = blurred.size
    best = 0.0 if brightest else 1.0
    for y in range(0, h, 2):
        for x in range(int(w * x0), int(w * x1), 2):
            r, g, b = px[x, y]
            lum = 0.2126 * LINEAR[r] + 0.7152 * LINEAR[g] + 0.0722 * LINEAR[b]
            if (lum > best) if brightest else (lum < best):
                best = lum
    return best


def worst_contrast(im, text_luminance, light_theme, x0=0.0, x1=1.0):
    """Contrast at the point in this slice where the image is closest to failing."""
    if light_theme:
        lum = extreme_luminance(im, x0, x1, brightest=False)
        return (lum + 0.05) / (text_luminance + 0.05)
    lum = extreme_luminance(im, x0, x1, brightest=True)
    return (text_luminance + 0.05) / (lum + 0.05)


def hex_luminance(hex_colour):
    r = int(hex_colour[1:3], 16)
    g = int(hex_colour[3:5], 16)
    b = int(hex_colour[5:7], 16)
    return 0.2126 * LINEAR[r] + 0.7152 * LINEAR[g] + 0.0722 * LINEAR[b]


def fade_top(im):
    """Fade the top edge to transparent so there is no hard join."""
    rgba = im.convert("RGBA")
    w, h = rgba.size
    alpha = Image.new("L", (w, h), 255)
    cut = int(h * FADE)
    for y in range(cut):
        a = y / cut
        value = int(round(255 * (a * a * (3 - 2 * a))))     # smoothstep
        alpha.paste(value, (0, y, w, y + 1))
    rgba.putalpha(alpha)
    return rgba


def join_colour(im):
    """The colour the fade lands on, so the stylesheet can fill above it."""
    w, h = im.size
    px = im.convert("RGB").load()
    row = int(h * FADE)
    r = g = b = n = 0
    for y in range(row, min(h, row + max(2, h // 40))):
        for x in range(0, w, 7):
            p = px[x, y]
            r += p[0]; g += p[1]; b += p[2]; n += 1
    return "#%02x%02x%02x" % (r // n, g // n, b // n)


def themes():
    raw = subprocess.check_output(
        ["node", os.path.join(ROOT, "tools", "theme-info.js")], cwd=ROOT)
    return json.loads(raw.decode("utf-8"))


def build(theme_id, src_path, info, quiet=False):
    light = info["mode"] == "light"
    text_lum = hex_luminance(info["text"])

    src = Image.open(src_path).convert("RGB")
    cut = CROP_TOP.get(theme_id, 0.0)
    if cut:
        src = src.crop((0, int(src.size[1] * cut), src.size[0], src.size[1]))
        if not quiet:
            print("  cropped %d%% off the top (shared border with another source)"
                  % round(cut * 100))
    base = src.resize((WIDTH, int(src.size[1] * WIDTH / src.size[0])), Image.LANCZOS)
    probe = base.resize((768, base.size[1] * 768 // WIDTH), Image.LANCZOS)

    if not quiet:
        print("  source %.2f:1 untouched, %s theme, text %s"
              % (worst_contrast(probe, text_lum, light), info["mode"], info["text"]))

    chosen = None
    for factor in (1.00, 0.85, 0.70, 0.55, 0.44, 0.34, 0.26, 0.20, 0.15, 0.11, 0.08):
        for strength in (0.70, 0.60, 0.50, 0.38, 0.30, 0.24, 0.18, 0.13, 0.09):
            candidate = treat(probe, factor, strength, light)
            column = worst_contrast(candidate, text_lum, light, *COLUMN)
            if column < COLUMN_FLOOR:
                continue
            flank = worst_contrast(candidate, text_lum, light)
            if flank >= FLANK_FLOOR:
                chosen = (factor, strength, column, flank)
            break
        if chosen:
            break

    if not chosen:
        return None

    factor, strength, column, flank = chosen
    img = treat(base, factor, strength, light)
    sky = join_colour(img)
    img = fade_top(img)

    encoded = None
    for quality in (86, 80, 74, 68, 60, 52):
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=quality, method=6)
        candidate = base64.b64encode(buf.getvalue()).decode("ascii")
        if len(candidate) < MAX_BASE64:
            encoded = candidate
            break
    if encoded is None:
        return None

    # A card in the README gallery is 300px wide. Embedding the full wallpaper
    # there made that one file 794 KB, so each entry carries a thumbnail for it.
    thumb_img = img.resize((320, int(img.size[1] * 320 / img.size[0])), Image.LANCZOS)
    tbuf = io.BytesIO()
    thumb_img.save(tbuf, "WEBP", quality=68, method=6)
    thumb = base64.b64encode(tbuf.getvalue()).decode("ascii")

    return {
        "id": theme_id, "column": column, "flank": flank, "sky": sky,
        "thumb": "data:image/webp;base64," + thumb,
        "exposure": factor, "scrim": strength,
        "width": img.size[0], "height": img.size[1],
        "kb": len(encoded) / 1024,
        "uri": "data:image/webp;base64," + encoded,
    }


HEADER = '''/* ============================================================================
 * NextWork Theme Studio - image wallpapers
 *
 * Generated by tools/make-wallpaper.py from the sources in art/.
 * Do not edit the data below by hand; it will be overwritten.
 *
 * Most scenery in this extension is drawn in code from the theme's own
 * colours. These are photographs, carried inline as data URIs because a
 * content script cannot fetch a file: the site's content security policy
 * blocks it, and making them web accessible would widen what the extension
 * exposes for the sake of some pictures.
 *
 * Each entry records what the generator measured:
 *
 *   columnRatio  contrast in the reading column, floor 7:1   (WCAG AAA)
 *   minRatio     contrast anywhere else,         floor 4.5:1 (WCAG AA)
 *   sky          the colour the faded top edge lands on, so the stylesheet
 *                can fill the space above the image with the same value
 *
 * The audit checks all three.
 * ==========================================================================*/
(function (root) {
  'use strict';

  root.NWT_WALLPAPERS = {
'''

FOOTER = '''  };

})(typeof self !== 'undefined' ? self : this);
'''


def write_module(entries):
    parts = [HEADER]
    for i, e in enumerate(entries):
        parts.append("    %s: {\n" % e["id"])
        parts.append("      columnRatio: %.2f,\n" % e["column"])
        parts.append("      minRatio: %.2f,\n" % e["flank"])
        parts.append("      sky: '%s',\n" % e["sky"])
        parts.append("      width: %d,\n" % e["width"])
        parts.append("      height: %d,\n" % e["height"])
        parts.append("      uri: '%s',\n" % e["uri"])
        parts.append("      thumb: '%s'\n" % e["thumb"])
        parts.append("    }%s\n" % ("," if i < len(entries) - 1 else ""))
    parts.append(FOOTER)
    path = os.path.join(ROOT, "src", "wallpapers.js")
    io_open(path, "".join(parts))
    return path


def io_open(path, text):
    with open(path, "w", encoding="utf-8", newline="\n") as fh:
        fh.write(text)


def slug(theme_id):
    return re.sub(r"(?<!^)(?=[A-Z])", "-", theme_id).lower()


def main():
    if len(sys.argv) < 2:
        sys.exit(__doc__)
    info = themes()

    if sys.argv[1] == "--all":
        folder = os.path.join(ROOT, sys.argv[2] if len(sys.argv) > 2 else "art")
        entries, skipped = [], []
        for theme_id in info:
            match = None
            for ext in (".jpeg", ".jpg", ".png", ".webp"):
                candidate = os.path.join(folder, slug(theme_id) + ext)
                if os.path.exists(candidate):
                    match = candidate
                    break
            if not match:
                skipped.append(theme_id + " (no image)")
                continue
            print("%s" % theme_id)
            built = build(theme_id, match, info[theme_id])
            if not built:
                skipped.append(theme_id + " (could not reach the floors)")
                print("  SKIPPED")
                continue
            entries.append(built)
            print("  exposure %.2f, scrim %.2f, column %.2f:1, elsewhere %.2f:1, "
                  "sky %s, %.0f KB"
                  % (built["exposure"], built["scrim"], built["column"],
                     built["flank"], built["sky"], built["kb"]))
        write_module(entries)
        total = sum(e["kb"] for e in entries)
        print("\n%d wallpapers, %.0f KB total" % (len(entries), total))
        for s in skipped:
            print("  skipped: " + s)
        return

    theme_id = sys.argv[1]
    if theme_id not in info:
        sys.exit("Unknown theme: " + theme_id)
    built = build(theme_id, os.path.join(ROOT, sys.argv[2]), info[theme_id])
    if not built:
        sys.exit("Could not reach both floors for " + theme_id)
    print(built["id"], "%.2f:1 / %.2f:1, %.0f KB" % (built["column"], built["flank"], built["kb"]))


if __name__ == "__main__":
    main()
