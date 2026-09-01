"""Encode a source image in art/ into src/wallpapers.js.

    python tools/make-wallpaper.py concreteCorridor art/concrete-corridor.jpg

Two constraints shape this, and they pull against each other.

Contrast. Body copy on nextwork.ai sits directly on the page ground, so a
wallpaper is read *through* the text. The project's floor is 7:1, which caps
the background's relative luminance at about 0.0707 - roughly #4b4b4b. A normal
photograph or painting is nowhere near that dark, so this cuts exposure in
linear light rather than laying a grey veil over the top, which would flatten
the picture to mud. It searches downward for the gentlest cut that still
clears the floor, so the image stays as bright as it is allowed to be.

The measurement is taken on a blurred copy, because nobody reads against a
single pixel - they read against the local average. That is also what lets a
small light source, like a lit doorway, keep a bright core without failing.

Size. A content script cannot fetch a file: the site's CSP blocks it, and
web_accessible_resources would widen the extension's surface for the sake of
one picture. So the image travels as a data URI inside a stylesheet that is
injected into every page, and the byte count is a real cost. The audit caps it.

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
FLOOR = 7.0
WIDTH = 1600
MAX_BASE64 = 130000           # keep under the audit's cap with room to spare


def _to_linear(c):
    c /= 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


LINEAR = [_to_linear(i) for i in range(256)]


def brightest_local_luminance(im):
    """Max relative luminance of a blurred copy - what a reader reads against."""
    blurred = im.convert("RGB").filter(ImageFilter.GaussianBlur(radius=9))
    px = blurred.load()
    w, h = blurred.size
    best = 0.0
    for y in range(0, h, 2):
        for x in range(0, w, 2):
            r, g, b = px[x, y]
            lum = 0.2126 * LINEAR[r] + 0.7152 * LINEAR[g] + 0.0722 * LINEAR[b]
            if lum > best:
                best = lum
    return best


def contrast(luminance):
    return (TEXT_LUMINANCE + 0.05) / (luminance + 0.05)


def darken(im, factor):
    """Scale exposure in linear light, not a grey wash over the top."""
    lut = []
    for i in range(256):
        lin = min(1.0, max(0.0, LINEAR[i] * factor))
        c = 12.92 * lin if lin <= 0.0031308 else 1.055 * (lin ** (1 / 2.4)) - 0.055
        lut.append(int(round(min(1.0, max(0.0, c)) * 255)))
    return im.point(lut * 3)


def build(name, src_path):
    src = Image.open(src_path).convert("RGB")
    base = src.resize((WIDTH, int(src.size[1] * WIDTH / src.size[0])), Image.LANCZOS)

    before = contrast(brightest_local_luminance(base.resize((WIDTH // 3, base.size[1] // 3))))
    print("source %s  %dx%d  contrast %.2f:1" % (src_path, src.size[0], src.size[1], before))

    chosen = None
    for factor in (0.40, 0.34, 0.30, 0.24, 0.20, 0.17, 0.14, 0.12, 0.10, 0.085, 0.07):
        candidate = darken(base, factor)
        half = candidate.resize((candidate.size[0] // 2, candidate.size[1] // 2))
        ratio = contrast(brightest_local_luminance(half))
        print("  exposure %-5s -> %.2f:1%s" % (factor, ratio, "  ok" if ratio >= FLOOR else ""))
        if ratio >= FLOOR:
            chosen = (factor, candidate, ratio)
            break

    if not chosen:
        sys.exit("Nothing cleared %.1f:1. The source may be too bright to use." % FLOOR)

    factor, img, ratio = chosen
    # Heavy darkening drains the colour out; put a little back so a coloured
    # light source still reads as coloured.
    img = ImageEnhance.Color(img).enhance(1.25)

    encoded = None
    for quality in (78, 72, 66, 60, 52):
        buf = io.BytesIO()
        img.save(buf, "JPEG", quality=quality, optimize=True, progressive=True)
        candidate = base64.b64encode(buf.getvalue()).decode("ascii")
        print("  quality %d -> %.0f KB base64" % (quality, len(candidate) / 1024))
        if len(candidate) < MAX_BASE64:
            encoded = candidate
            break
    if encoded is None:
        sys.exit("Could not get under %d base64 chars." % MAX_BASE64)

    print("\n%s: exposure %s, %.2f:1, %dx%d, %.0f KB"
          % (name, factor, ratio, img.size[0], img.size[1], len(encoded) / 1024))
    return {
        "name": name, "ratio": ratio, "factor": factor,
        "width": img.size[0], "height": img.size[1], "uri":
        "data:image/jpeg;base64," + encoded,
    }


def write_into_module(entry):
    """Replace one wallpaper's block in src/wallpapers.js, leaving the rest."""
    path = os.path.join(ROOT, "src", "wallpapers.js")
    body = io.open(path, encoding="utf-8").read()
    pattern = re.compile(
        r"(    " + re.escape(entry["name"]) + r": \{\n)"
        r".*?"
        r"(\n    \})", re.S)
    if not pattern.search(body):
        sys.exit("No block named %s in src/wallpapers.js - add one first." % entry["name"])
    replacement = (
        "\\1"
        "      minRatio: %.2f,\n"
        "      width: %d,\n"
        "      height: %d,\n"
        "      uri: '%s'"
        "\\2" % (entry["ratio"], entry["width"], entry["height"], entry["uri"])
    )
    io.open(path, "w", encoding="utf-8", newline="\n").write(pattern.sub(replacement, body))
    print("wrote src/wallpapers.js")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    write_into_module(build(sys.argv[1], os.path.join(ROOT, sys.argv[2])))
