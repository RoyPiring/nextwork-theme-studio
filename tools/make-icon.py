"""Cut the extension icon out of the artwork.

    python tools/make-icon.py

Writes icons/icon16.png, icon32.png, icon48.png and icon128.png.

The same character walks through the bottom-left of all eighteen wallpapers, so
the icon is him, lifted straight out of one of them rather than redrawn. Cherry
Blossom is the source: he faces front there, the sunglasses read clearly, and
he stands on a pale even background that can be separated cleanly.

Separating him is the only real work. The background is a smooth near-white
wash and he is gold, dark green and black, so the two do not overlap:

    background   luminance 218-244, saturation 0.05-0.10
    body         luminance 115-122, saturation 0.75
    fronds       luminance  85-120, saturation 0.34-0.38
    sunglasses   luminance  61,     saturation 0.55

A flood fill inward from the border, allowed to cross only pixels that are both
pale and unsaturated, therefore stops dead at his outline. It also takes the
soft shadow under his feet, which is pale and unsaturated too and has no place
in an icon. The flood starts from the border rather than keying the whole frame
so that a bright unsaturated highlight *inside* him is kept.

An earlier attempt let the fill follow the gradient, comparing each pixel to
the one it spread from. That leaks straight through soft anti-aliased edges: it
kept 2% of the frame, having eaten the character on the way past.
"""
import os
from collections import deque
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE = os.path.join(ROOT, "art", "cherry-blossom.jpeg")
OUT = os.path.join(ROOT, "icons")

SIZES = [16, 32, 48, 128]
PAD = 0.045                  # breathing room so he never touches the edge

# What counts as background. Set from the measurements above, with enough room
# either side that neither class can reach the other.
BG_LUM = 175
BG_SAT = 0.22


def paleish(pix, x, y):
    r, g, b = pix[x, y]
    mx, mn = max(r, g, b), min(r, g, b)
    sat = 0 if mx == 0 else (mx - mn) / float(mx)
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return lum > BG_LUM and sat < BG_SAT


def find_him(im):
    """His bounding box: the only strongly coloured or genuinely dark thing in
    the lower-left of the frame."""
    w, h = im.size
    pix = im.load()
    x0, y0, x1, y1 = w, h, 0, 0
    for y in range(int(h * 0.68), h):
        for x in range(0, int(w * 0.25)):
            r, g, b = pix[x, y]
            mx, mn = max(r, g, b), min(r, g, b)
            sat = 0 if mx == 0 else (mx - mn) / float(mx)
            if sat > 0.42 or mx < 95:
                x0 = min(x0, x); y0 = min(y0, y)
                x1 = max(x1, x); y1 = max(y1, y)
    if x1 <= x0 or y1 <= y0:
        raise SystemExit("could not find the character in " + SOURCE)
    return x0, y0, x1, y1


def cut_out(im):
    x0, y0, x1, y1 = find_him(im)
    pad = 26
    crop = im.crop((max(0, x0 - pad), max(0, y0 - pad),
                    min(im.width, x1 + pad), min(im.height, y1 + pad)))
    w, h = crop.size
    pix = crop.load()

    seen = [[False] * w for _ in range(h)]
    q = deque()

    def push(x, y):
        if not seen[y][x] and paleish(pix, x, y):
            seen[y][x] = True
            q.append((x, y))

    for x in range(w):
        push(x, 0); push(x, h - 1)
    for y in range(h):
        push(0, y); push(w - 1, y)
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < w and 0 <= ny < h:
                push(nx, ny)

    alpha = Image.new("L", (w, h), 0)
    ap = alpha.load()
    for y in range(h):
        for x in range(w):
            if not seen[y][x]:
                ap[x, y] = 255
    # a hair of softening, so the outline does not come down jagged
    alpha = alpha.filter(ImageFilter.GaussianBlur(0.6))

    out = crop.convert("RGBA")
    out.putalpha(alpha)
    return out.crop(out.getbbox())


def square(art, size):
    """Fit him inside a square of the given size, centred, without distortion."""
    inner = int(round(size * (1 - 2 * PAD)))
    scale = min(inner / float(art.width), inner / float(art.height))
    w = max(1, int(round(art.width * scale)))
    h = max(1, int(round(art.height * scale)))
    small = art.resize((w, h), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(small, ((size - w) // 2, (size - h) // 2))
    return canvas


def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    art = cut_out(Image.open(SOURCE).convert("RGB"))
    print("cut out %dx%d" % art.size)
    for size in SIZES:
        icon = square(art, size)
        if size <= 32:
            # He is a painting, and a painting resampled to 16px goes soft in
            # exactly the places that carry the shape.
            icon = icon.filter(ImageFilter.UnsharpMask(radius=1.0, percent=110,
                                                       threshold=1))
        path = os.path.join(OUT, "icon%d.png" % size)
        icon.save(path)
        print("wrote %s (%d bytes)" % (os.path.relpath(path, ROOT),
                                       os.path.getsize(path)))


if __name__ == "__main__":
    main()
