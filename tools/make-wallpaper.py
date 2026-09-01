"""Encode a source image in art/ into src/wallpapers.js.

    python tools/make-wallpaper.py concreteCorridor art/concrete-corridor.jpg

Body copy on nextwork.ai sits directly on the page ground, so a wallpaper is
read *through* the text. That caps how bright it can be, and the cap is brutal:
7:1 against body text means a relative luminance of about 0.0707, roughly
#4b4b4b. A photograph or a painting is nowhere near that dark.

Darkening the whole image to clear that floor works, and it also throws the
picture away - the first version of this ran at 0.17 of source exposure and
what reached the page was a faint smudge.

So it darkens in two zones instead.

The reading column is a narrow strip down the middle of the viewport; the rest
of the page is margin, panels and chrome. A scrim over that middle band lets
the flanks stay far brighter than a single global exposure would ever allow. On
this artwork that is the whole game, because the composition puts the arcades,
the doorway and the figure out at the edges and leaves the middle empty.

Two floors, and both are enforced by the audit:

  reading column   7:1   the project's floor, WCAG AAA for body text
  anywhere else    4.5:1 WCAG AA, so text that strays outside the column
                         is still readable rather than merely darker

Everything is measured on a blurred copy, because nobody reads against a single
pixel - they read against the local average. That is also what lets a small
light source, like a lit doorway, keep a bright core without failing.

The image travels as a data URI inside a stylesheet injected into every page -
a content script cannot fetch a file, the site's CSP blocks it - so the byte
count is a real cost and the audit caps it too.

Needs Pillow: python -m pip install pillow
"""
import base64
import io
import os
import re
import sys

try:
    from PIL import Image, ImageEnhance, ImageFilter
except ImportError:
    sys.exit("This needs Pillow:  python -m pip install pillow")

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

TEXT_LUMINANCE = 0.795        # #e8e9e9, the darkest body text any theme uses
COLUMN_FLOOR = 7.0            # the project's floor, inside the reading column
FLANK_FLOOR = 4.5             # WCAG AA, everywhere else
COLUMN = (0.15, 0.85)         # how much of the width the reading column can span
SCRIM_FULL = (0.18, 0.82)     # where the scrim is at full strength
SCRIM_FEATHER = 0.10          # and how far it takes to fade out
WIDTH = 2560                  # upscaling a 1600px image on a wide screen was soft
MAX_BASE64 = 140000


def _to_linear(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def _to_srgb(v):
    v = min(1.0, max(0.0, v))
    return 12.92 * v if v <= 0.0031308 else 1.055 * (v ** (1 / 2.4)) - 0.055


LINEAR = [_to_linear(i) for i in range(256)]


def _lut(factor):
    return [int(round(_to_srgb(LINEAR[i] * factor) * 255)) for i in range(256)]


def expose(im, factor):
    """Scale exposure in linear light, not a grey wash laid over the top."""
    return im.point(_lut(factor) * 3)


def apply_scrim(im, strength):
    """Darken the middle band, feathered so there is no visible vertical edge.

    Applied column by column with a lookup table per column. Slower than a
    single multiply, but it keeps the maths in linear light and the tool free
    of a numpy dependency, which this repo does not otherwise have.
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
            cache[key] = _lut(key) * 3
        strip = out.crop((x, 0, x + 1, h)).point(cache[key])
        out.paste(strip, (x, 0))
    return out


def brightest(im, x0=0.0, x1=1.0):
    """Max relative luminance of a blurred copy - what a reader reads against."""
    blurred = im.convert("RGB").filter(ImageFilter.GaussianBlur(radius=9))
    px = blurred.load()
    w, h = blurred.size
    best = 0.0
    for y in range(0, h, 2):
        for x in range(int(w * x0), int(w * x1), 2):
            r, g, b = px[x, y]
            lum = 0.2126 * LINEAR[r] + 0.7152 * LINEAR[g] + 0.0722 * LINEAR[b]
            if lum > best:
                best = lum
    return best


def contrast(luminance):
    return (TEXT_LUMINANCE + 0.05) / (luminance + 0.05)


def sky_colour(im):
    """Average of the top rows.

    The image is sized to the full viewport width and pinned to the bottom, so
    on a tall window there is bare space above it. Filling that with the theme
    canvas puts a lighter band and a hard horizontal edge across the top of the
    scene. Filling it with the image's own sky instead makes the join
    invisible, which is the whole reason this gets measured and recorded.
    """
    w, h = im.size
    px = im.load()
    r = g = b = n = 0
    for y in range(0, max(1, h // 20)):
        for x in range(0, w, 7):
            p = px[x, y]
            r += p[0]; g += p[1]; b += p[2]; n += 1
    return "#%02x%02x%02x" % (r // n, g // n, b // n)


def build(name, src_path):
    src = Image.open(src_path).convert("RGB")
    base = src.resize((WIDTH, int(src.size[1] * WIDTH / src.size[0])), Image.LANCZOS)
    probe = base.resize((800, base.size[1] * 800 // WIDTH), Image.LANCZOS)

    print("source %dx%d, %.2f:1 untouched" % (src.size + (contrast(brightest(probe)),)))
    print("\nexposure  scrim   reading column   anywhere else")

    chosen = None
    for exposure in (1.00, 0.85, 0.70, 0.55, 0.44, 0.34, 0.26, 0.20, 0.17):
        lit = expose(probe, exposure)
        for strength in (0.60, 0.50, 0.38, 0.30, 0.24, 0.18, 0.14, 0.10):
            candidate = apply_scrim(lit, strength)
            column = contrast(brightest(candidate, *COLUMN))
            if column < COLUMN_FLOOR:
                continue
            flank = contrast(brightest(candidate))
            ok = flank >= FLANK_FLOOR
            print("  %-9s %-6s %6.2f:1        %6.2f:1%s"
                  % (exposure, strength, column, flank, "  ok" if ok else ""))
            if ok and chosen is None:
                chosen = (exposure, strength, column, flank)
            break
        if chosen:
            break

    if not chosen:
        sys.exit("No exposure cleared both floors. The source may be too bright.")

    exposure, strength, column, flank = chosen
    img = apply_scrim(expose(base, exposure), strength)
    # Heavy darkening drains colour; put a little back so a coloured light
    # source still reads as coloured.
    img = ImageEnhance.Color(img).enhance(1.25)

    # WebP, not JPEG. This artwork is mostly smooth dark gradients, which is
    # the worst case for JPEG - it bands visibly right where the scene is
    # darkest. WebP holds those gradients at roughly a third the size, so the
    # same byte budget buys 2560px instead of 1600px and the picture stops
    # looking soft on a wide screen.
    encoded = None
    mime = "webp"
    for quality in (90, 84, 78, 70, 62):
        buf = io.BytesIO()
        img.save(buf, "WEBP", quality=quality, method=6)
        candidate = base64.b64encode(buf.getvalue()).decode("ascii")
        if len(candidate) < MAX_BASE64:
            encoded = candidate
            print("\n  webp quality %d -> %.0f KB base64" % (quality, len(candidate) / 1024))
            break
    if encoded is None:
        sys.exit("Could not get under %d base64 chars." % MAX_BASE64)

    sky = sky_colour(img)
    print("%s: exposure %s, scrim %s, column %.2f:1, elsewhere %.2f:1, sky %s"
          % (name, exposure, strength, column, flank, sky))
    return {
        "name": name, "column": column, "flank": flank, "sky": sky,
        "exposure": exposure, "scrim": strength,
        "width": img.size[0], "height": img.size[1],
        "uri": "data:image/" + mime + ";base64," + encoded,
    }


def write_into_module(entry):
    """Replace one wallpaper's block in src/wallpapers.js, leaving the rest."""
    path = os.path.join(ROOT, "src", "wallpapers.js")
    body = io.open(path, encoding="utf-8").read()
    pattern = re.compile(
        r"(    " + re.escape(entry["name"]) + r": \{\n).*?(\n    \})", re.S)
    if not pattern.search(body):
        sys.exit("No block named %s in src/wallpapers.js - add one first." % entry["name"])
    replacement = (
        "\\1"
        "      columnRatio: %.2f,\n"
        "      minRatio: %.2f,\n"
        "      sky: '%s',\n"
        "      width: %d,\n"
        "      height: %d,\n"
        "      uri: '%s'"
        "\\2" % (entry["column"], entry["flank"], entry["sky"], entry["width"],
                 entry["height"], entry["uri"])
    )
    io.open(path, "w", encoding="utf-8", newline="\n").write(pattern.sub(replacement, body))
    print("wrote src/wallpapers.js")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    write_into_module(build(sys.argv[1], os.path.join(ROOT, sys.argv[2])))
