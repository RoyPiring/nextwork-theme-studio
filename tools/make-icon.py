"""Draw the extension icon: the pineapple that walks through every wallpaper.

    python tools/make-icon.py

Writes icons/icon16.png, icon32.png, icon48.png and icon128.png.

The character in the artwork is a pineapple in sunglasses wearing a small gold
crown, with green fronds behind it. All of that survives at 128px and none of
it survives at 16, where the whole mark is about the size of this sentence's
full stop. So detail is dropped as the icon shrinks rather than being scaled
down into mud:

  128, 48  the full character - crown, fronds, lattice, sunglasses
  32       crown dropped, lattice coarsened, sunglasses kept as one bar
  16       silhouette only - body, fronds, and a single dark band

What has to survive at every size is the silhouette, which is why the fronds
stay: a gold oval is a nut, and a gold oval with spikes on top is a pineapple.

The mark has no tile behind it. The icon it replaces sat on a dark rounded
square, and a square costs about a fifth of the width in margin, which at 16px
is the whole difference between having fronds and not having them. A gold body
also holds up against a light toolbar and a dark one on its own, so the square
was buying nothing. Pass tile=True to render() to get it back.

Everything is drawn at 8x and resampled down, so edges are properly resolved
rather than aliased.
"""
import os
from PIL import Image, ImageDraw, ImageChops, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "icons")

W = 1024                      # working canvas; every size renders from this

# Pulled off the artwork so the logo and the wallpapers agree.
GOLD_TOP = (247, 196, 104)
GOLD_BOT = (198, 121, 48)
GOLD_EDGE = (140, 79, 26)
LATTICE = (150, 88, 32)
CROWN = (250, 206, 96)
CROWN_EDGE = (128, 74, 20)
LEAF_TOP = (124, 196, 80)
LEAF_BOT = (54, 124, 56)
LEAF_EDGE = (28, 66, 32)
SHADE = (32, 30, 34)
GROUND = (26, 28, 31)         # the dark tile the mark sits on


def vgradient(size, top, bottom):
    """A vertical ramp, as an image that can be pasted through a mask."""
    strip = Image.new("RGB", (1, size))
    for y in range(size):
        t = y / float(size - 1)
        strip.putpixel((0, y), tuple(int(round(top[i] + (bottom[i] - top[i]) * t))
                                     for i in range(3)))
    return strip.resize((size, size), Image.NEAREST)


def clipped(layer, mask):
    """Keep only the part of layer that falls inside mask."""
    out = layer.copy()
    out.putalpha(ImageChops.multiply(layer.split()[3], mask))
    return out


def leaf(draw, bx, by, lean, length, half, fill, outline):
    """One frond: a blade leaning out from the base of the crown."""
    tipx = bx + lean * 210
    tipy = by - length * 250
    # the blade is drawn as a kite so it has some belly rather than being a
    # plain triangle, which reads as a shard
    midx = bx + lean * 96
    midy = by - length * 118
    draw.polygon([(bx - half, by), (midx - half * 0.75, midy),
                  (tipx, tipy), (midx + half * 0.75, midy), (bx + half, by)],
                 fill=fill, outline=outline, width=6)


def render(detail, tile=False):
    """detail: 'full', 'mid' or 'flat'. tile: draw the dark rounded ground."""
    img = Image.new("RGBA", (W, W), (0, 0, 0, 0))

    if tile:
        ground = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        ImageDraw.Draw(ground).rounded_rectangle(
            [0, 0, W - 1, W - 1], radius=int(W * 0.225), fill=GROUND + (255,))
        img.alpha_composite(ground)

    # Without a tile the mark can use the whole canvas, which is most of what
    # makes 16px legible: there, a fifth of the width spent on margin is the
    # difference between fronds and no fronds.
    cx, cy = W // 2, int(W * (0.605 if tile else 0.625))
    k = 1.0 if tile else 1.16
    rx, ry = int(W * 0.245 * k), int(W * 0.272 * k)
    base_y = cy - ry + int(W * 0.02)          # where the fronds spring from

    # ---- fronds, behind the body -----------------------------------------
    fronds = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    fd = ImageDraw.Draw(fronds)
    blades = [(-1.06, 0.84, 44), (-0.55, 1.10, 50), (0.0, 1.22, 54),
              (0.55, 1.10, 50), (1.06, 0.84, 44)]
    if detail == "flat":
        # fewer, fatter, taller blades. At 16px five of them merge into a
        # smear, and thin ones disappear into the toolbar entirely.
        blades = [(-0.80, 1.00, 76), (0.0, 1.30, 84), (0.80, 1.00, 76)]
    for lean, length, half in blades:
        shade = LEAF_BOT if abs(lean) > 0.6 else LEAF_TOP
        leaf(fd, cx, base_y + 18, lean, length, half, shade,
             LEAF_EDGE if detail != "flat" else None)
    img.alpha_composite(fronds)

    # ---- body -------------------------------------------------------------
    body_mask = Image.new("L", (W, W), 0)
    ImageDraw.Draw(body_mask).ellipse([cx - rx, cy - ry, cx + rx, cy + ry], fill=255)

    body = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    body.paste(vgradient(W, GOLD_TOP, GOLD_BOT), (0, 0), body_mask)
    img.alpha_composite(body)

    # ---- lattice ----------------------------------------------------------
    if detail != "flat":
        step = 74 if detail == "full" else 104
        width = 7 if detail == "full" else 9
        lat = Image.new("RGBA", (W, W), (0, 0, 0, 0))
        ld = ImageDraw.Draw(lat)
        for i in range(-W, 2 * W, step):
            ld.line([(i, 0), (i + W, W)], fill=LATTICE + (105,), width=width)
            ld.line([(i, W), (i + W, 0)], fill=LATTICE + (105,), width=width)
        img.alpha_composite(clipped(lat, body_mask))

    # a soft rim so the body reads as round rather than as a flat disc
    rim = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    ImageDraw.Draw(rim).ellipse([cx - rx, cy - ry, cx + rx, cy + ry],
                                outline=GOLD_EDGE + (150,), width=10)
    img.alpha_composite(clipped(rim, body_mask))

    # ---- crown ------------------------------------------------------------
    if detail == "full":
        cw = int(rx * 0.86)
        top = base_y + 26
        bot = base_y + 96
        crown = [(cx - cw, bot), (cx - cw, top + 26), (cx - cw * 0.5, top + 54),
                 (cx - cw * 0.18, top), (cx + cw * 0.18, top),
                 (cx + cw * 0.5, top + 54), (cx + cw, top + 26), (cx + cw, bot)]
        ImageDraw.Draw(img).polygon(crown, fill=CROWN + (255,),
                                    outline=CROWN_EDGE + (255,), width=6)

    # ---- sunglasses -------------------------------------------------------
    gl = Image.new("RGBA", (W, W), (0, 0, 0, 0))
    gd = ImageDraw.Draw(gl)
    span = int(rx * 1.34)
    gy = cy - int(ry * 0.20)
    if detail == "flat":
        # one bar; two lenses at this size is a grey blur
        gd.rounded_rectangle([cx - span // 2, gy - 34, cx + span // 2, gy + 34],
                             radius=30, fill=SHADE + (255,))
    else:
        lens = int(span * 0.44)
        gd.rounded_rectangle([cx - span // 2, gy - 40, cx - span // 2 + lens, gy + 46],
                             radius=26, fill=SHADE + (255,))
        gd.rounded_rectangle([cx + span // 2 - lens, gy - 40, cx + span // 2, gy + 46],
                             radius=26, fill=SHADE + (255,))
        gd.rectangle([cx - lens * 0.16, gy - 18, cx + lens * 0.16, gy + 4],
                     fill=SHADE + (255,))
    # the same slight tilt the character wears them at
    gl = gl.rotate(7, resample=Image.BICUBIC, center=(cx, gy))
    img.alpha_composite(clipped(gl, body_mask))

    return img


def main():
    if not os.path.isdir(OUT):
        os.makedirs(OUT)
    plan = [(128, "full"), (48, "full"), (32, "mid"), (16, "flat")]
    cache = {}
    tile = os.environ.get("ICON_TILE", "0") != "0"
    for size, detail in plan:
        key = (detail, tile)
        if key not in cache:
            cache[key] = render(detail, tile)
        art = cache[key].resize((size, size), Image.LANCZOS)
        if size <= 32:
            # a touch of sharpening, because LANCZOS to 16px softens the
            # silhouette that is the only thing left at that size
            art = art.filter(ImageFilter.UnsharpMask(radius=1.1, percent=70, threshold=2))
        path = os.path.join(OUT, "icon%d.png" % size)
        art.save(path)
        print("wrote %s (%d bytes)" % (os.path.relpath(path, ROOT),
                                       os.path.getsize(path)))


if __name__ == "__main__":
    main()
