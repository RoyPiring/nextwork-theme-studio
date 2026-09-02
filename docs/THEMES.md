# Themes and wallpapers

18 themes ship with the extension. 13 are dark and 5 are light.

![The eighteen themes](img/themes.svg)

## Dark

| Theme | Description |
| --- | --- |
| Concrete | Neutral cool grey. The default. |
| Graphite | Darker, flatter, almost no hue at all. |
| Slate | Cool blue-grey with more colour in the neutrals. |
| Carbon | Near-black, heavy contrast. Good on OLED. |
| Fog | Dimmed rather than dark, for a bright room. |
| Espresso | Warm brown. |
| Tokyo Night | Neon on indigo. Surfaces are desaturated so the neon stays the only loud thing. |
| Wabi-Sabi | Sumi ink ground, bone-paper text, aged brass for actions. The quietest one. |
| Dark Japandi | Walnut panelling and oatmeal bouclé, with a clay accent. |
| Zen Lobby | Dark stone lit by hidden warm light. The most dramatic of the warm set. |
| Concrete & Blossom | Poured concrete with a warm clay call to action. |
| Galactica | Cold hull grey and amber CRT. Deep-space quiet, not neon. |
| Tetris | Arcade cabinet in a dark room: violet well, cyan accent. |

## Light

| Theme | Description |
| --- | --- |
| Hawaii Ocean | Sand, turquoise, deep water and palm green. |
| Palm Forest | Deep green canopy light. The quietest of the light set. |
| Hawaii Morning | Sunrise over the water: peach, gold and a band of aqua. |
| Mount Fuji | Cold dawn air, snow, and a faint pink on the ridge. |
| Cherry Blossom | Sakura against cream, with a little leaf green underneath. |

## Making your own

The 18 built-in themes cannot be edited. Change a colour and the extension
makes you a copy, leaving the original alone.

Open the editor from the popup. You get all nine colours, a live contrast
score, a preview, and a box for your own CSS. **Extras** holds switches for the
few things colours alone cannot reach, such as the logo, code blocks, and
panels that stay light.

Your themes are saved on your own computer. They are not synced and never
uploaded. To move one to another browser, use **Export theme** in the editor
and **Import** on the other side.

## Wallpapers

Every theme has its own picture. The source images live in `art/` and ship
embedded inside `src/wallpapers.js`, so nothing is downloaded while you browse.

Over each picture, two layers drift at different speeds: mist along the floor
and dust in the air. The picture itself does not move. Without those layers it
reads as a desktop background sitting behind the text rather than as part of
the page. Each theme has its own motif, and no two are the same.

### Why the pictures are so dark

Article text on nextwork.ai sits straight on the page background, with no panel
behind it. You read the words *through* the picture. Comfortable body text needs
a contrast ratio of 7:1, and that is a hard limit on how much picture can
survive.

A picture cannot be checked the way a single colour can, so
`tools/make-wallpaper.py` measures it. It pushes the middle of the image, where
the reading column sits, further than the sides, where the interesting parts of
the picture are. Dark themes are pushed darker and light themes lighter, since
the two need opposite treatment.

Every wallpaper ships at 7:1 or better in the reading area and 4.5:1 or better
at the edges. Both numbers are recorded per picture, and the tests check them.

Rebuilding them is covered in
[regenerating assets](maintenance/ASSETS.md).
