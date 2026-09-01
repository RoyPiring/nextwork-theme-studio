/* ============================================================================
 * NextWork Theme Studio - scenery
 *
 * Hand-drawn SVG scenes, one per theme. Everything here is original artwork:
 * no stock photography, nothing downloaded, so the extension carries no one
 * else's copyright and every shape is picked from the theme's own palette.
 *
 * Each scene has up to three layers:
 *   hero  - a fixed centrepiece (the mountain, the planet, the branch)
 *   far   - a slow parallax band, tiled horizontally
 *   near  - a faster parallax band in front of it
 *
 * `areaColors` lists the large fills. The audit checks each one against the
 * theme's body text and fails under 7:1 - which is why these read as pale
 * watermarks (light themes) or deep shadows (dark ones) rather than bold
 * silhouettes. Article copy sits directly on this.
 *
 * A band must tile seamlessly: shapes either stay clear of the tile edge, or
 * the path's first and last y match.
 * ==========================================================================*/
(function (root) {
  'use strict';

  function svg(w, h, body) {
    return "<svg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h +
           "' viewBox='0 0 " + w + " " + h + "' preserveAspectRatio='xMidYMax slice'>" + body + "</svg>";
  }
  function wrap(fill, opacity, body) {
    return "<g fill='" + fill + "' opacity='" + opacity + "'>" + body + "</g>";
  }

  function palmBand(fill, opacity) {
    var out = '', i, x;
    for (i = 0; i < 5; i++) {
      x = i * 340 + (i % 2) * 60;
      out += "<path d='M" + x + " 300 q14 -120 40 -196' stroke='" + fill +
             "' stroke-width='9' fill='none' stroke-linecap='round'/>";
      out += "<g transform='translate(" + (x + 40) + ",104)'>" +
             "<path d='M0 0 q-72 -30 -116 6 q56 -6 116 -6z'/>" +
             "<path d='M0 0 q-58 -58 -112 -50 q52 16 112 50z'/>" +
             "<path d='M0 0 q-14 -78 -62 -100 q30 46 62 100z'/>" +
             "<path d='M0 0 q72 -30 116 6 q-56 -6 -116 -6z'/>" +
             "<path d='M0 0 q58 -58 112 -50 q-52 16 -112 50z'/>" +
             "<path d='M0 0 q14 -78 62 -100 q-30 46 -62 100z'/>" +
             "</g>";
    }
    return svg(1700, 300, wrap(fill, opacity, out));
  }

  /* --------------------------------------------------------------- bamboo */
  function bambooBand(gTop, gBottom, opacity, scale) {
    var s = scale || 1, out = '', i, x, w, top, y, gid = uid();
    for (i = 0; i < 9; i++) {
      x = i * 180 + (i % 3) * 34;
      w = (16 + (i % 3) * 6) * s;
      top = 40 + (i % 4) * 60;
      out += "<rect x='" + x + "' y='" + top + "' width='" + w + "' height='" + (620 - top) + "' rx='" + (w / 2) + "'/>";
      for (y = top + 70; y < 620; y += 92) {
        out += "<rect x='" + (x - 3) + "' y='" + y + "' width='" + (w + 6) + "' height='5' rx='2.5' opacity='.55'/>";
      }
      out += "<g transform='translate(" + (x + w / 2) + "," + (top + 46) + ")'>" +
             "<path d='M0 0 q56 -26 104 -6 q-52 22 -104 6z'/>" +
             "<path d='M0 34 q-62 -20 -112 4 q56 18 112 -4z'/>" +
             "<path d='M0 74 q50 -34 96 -22 q-48 30 -96 22z'/>" +
             "</g>";
    }
    return svg(1620, 620, "<defs>" + vgrad(gid, gTop, gBottom) + "</defs>" +
      "<g fill='url(#" + gid + ")' opacity='" + opacity + "'>" + out + "</g>");
  }

  function skyline(top, bottom, windowFill, opacity, tall) {
    var gid = uid();
    var out = '', wins = '', i, x = 0, w, h, r, c;
    for (i = 0; i < 22; i++) {
      w = 38 + (i * 37) % 54;
      h = (tall ? 150 : 90) + (i * 53) % (tall ? 190 : 130);
      out += "<rect x='" + x + "' y='" + (360 - h) + "' width='" + w + "' height='" + h + "'/>";
      for (r = 0; r < Math.floor(h / 26); r++) {
        for (c = 0; c < Math.floor(w / 18); c++) {
          if ((i + r * 3 + c * 5) % 7 !== 0) continue;
          wins += "<rect x='" + (x + 7 + c * 18) + "' y='" + (360 - h + 12 + r * 26) +
                  "' width='6' height='9' rx='1'/>";
        }
      }
      x += w + 8 + (i % 3) * 6;
    }
    return svg(x, 360, "<defs>" + vgrad(gid, top, bottom) + "</defs>" +
      "<g fill='url(#" + gid + ")' opacity='" + opacity + "'>" + out + "</g>" +
      wrap(windowFill, opacity * 0.42, wins));
  }

  /* ---------------------------------------------------------------- reeds */
  function reedBand(fill, opacity) {
    var out = '', i, x, h;
    for (i = 0; i < 46; i++) {
      x = i * 35 + (i % 4) * 7;
      h = 130 + (i * 53) % 240;
      out += "<rect x='" + x + "' y='" + (400 - h) + "' width='3.5' height='" + h + "' rx='1.75' opacity='" +
             (0.4 + (i % 5) * 0.14).toFixed(2) + "'/>";
    }
    return svg(1610, 400, wrap(fill, opacity, out));
  }

  function stoneBand(fill, opacity) {
    var out = '', i, x, rx, ry;
    for (i = 0; i < 12; i++) {
      x = i * 135 + (i % 3) * 30;
      rx = 40 + (i % 4) * 22;
      ry = 16 + (i % 3) * 8;
      out += "<ellipse cx='" + x + "' cy='" + (250 - (i % 2) * 12) + "' rx='" + rx + "' ry='" + ry + "'/>";
    }
    return svg(1620, 260, wrap(fill, opacity, out));
  }

  /* A shoji screen wall: mullions with two rails. Bottom-anchored, so it reads
   * as a screen standing behind the page rather than graph paper over it. */
  function screenBand(fill, opacity) {
    var out = '', i;
    for (i = 0; i <= 16; i++) out += "<rect x='" + (i * 100) + "' y='24' width='7' height='396'/>";
    out += "<rect x='0' y='150' width='1600' height='6'/>";
    out += "<rect x='0' y='300' width='1600' height='6'/>";
    out += "<rect x='0' y='18' width='1600' height='9'/>";
    return svg(1600, 420, wrap(fill, opacity, out));
  }

  function starField(fill, opacity, count, seed) {
    var out = '', i, x, y, r;
    for (i = 0; i < count; i++) {
      x = (i * 211 + seed * 47) % 1580 + 10;
      y = (i * 97 + seed * 29) % 420 + 10;
      r = 1 + (i % 3) * 0.7;
      out += "<circle cx='" + x + "' cy='" + y + "' r='" + r + "' opacity='" + (0.35 + (i % 4) * 0.18).toFixed(2) + "'/>";
    }
    return svg(1600, 440, wrap(fill, opacity, out));
  }

  function petals(fill, opacity, count, seed) {
    var out = '', i, x, y, r, rot;
    for (i = 0; i < count; i++) {
      x = ((i * 137 + seed * 31) % 1500) + 20;
      y = ((i * 89 + seed * 17) % 420) + 20;
      r = 5 + (i % 3) * 2.5;
      rot = (i * 47 + seed * 13) % 360;
      out += "<ellipse cx='" + x + "' cy='" + y + "' rx='" + r + "' ry='" + (r * 0.58) +
             "' transform='rotate(" + rot + " " + x + " " + y + ")'/>";
    }
    return svg(1520, 460, wrap(fill, opacity, out));
  }

  function branch(strokeFill, blossomFill) {
    return svg(1600, 620,
      "<g stroke='" + strokeFill + "' stroke-width='11' fill='none' stroke-linecap='round'>" +
      "<path d='M-20 70 q220 40 360 6 q150 -36 280 26'/>" +
      "<path d='M250 88 q60 -52 120 -58'/>" +
      "<path d='M470 96 q54 46 118 52'/>" +
      "</g>" +
      "<g fill='" + blossomFill + "'>" +
      "<circle cx='150' cy='78' r='19'/><circle cx='188' cy='58' r='14'/>" +
      "<circle cx='360' cy='36' r='17'/><circle cx='398' cy='60' r='12'/>" +
      "<circle cx='596' cy='150' r='18'/><circle cx='632' cy='128' r='13'/>" +
      "<circle cx='700' cy='128' r='15'/><circle cx='268' cy='120' r='13'/>" +
      "</g>");
  }

  /* -------------------------------------------------------- retro sci-fi */
  /* A capital ship in profile: hull, engine block, a spine of lit ports. */
  function fleetBand(hull, portFill, opacity) {
    var out = '', i, x, y, s;
    for (i = 0; i < 4; i++) {
      x = i * 420 + (i % 2) * 90;
      y = 150 + (i % 3) * 70;
      s = 0.7 + (i % 3) * 0.22;
      out += "<g transform='translate(" + x + "," + y + ") scale(" + s.toFixed(2) + ")'>" +
             "<path d='M0 40 L54 6 L250 6 L286 26 L286 58 L250 78 L54 78 Z' fill='" + hull + "'/>" +
             "<rect x='96' y='-14' width='120' height='22' rx='4' fill='" + hull + "'/>" +
             "<rect x='286' y='30' width='42' height='24' rx='4' fill='" + hull + "'/>" +
             "<g fill='" + portFill + "' opacity='.6'>" +
             "<rect x='120' y='34' width='9' height='7' rx='1.5'/>" +
             "<rect x='150' y='34' width='9' height='7' rx='1.5'/>" +
             "<rect x='180' y='34' width='9' height='7' rx='1.5'/>" +
             "<rect x='210' y='34' width='9' height='7' rx='1.5'/>" +
             "</g></g>";
    }
    return svg(1700, 440, "<g opacity='" + opacity + "'>" + out + "</g>");
  }

  /* A planet limb: the curve of a world rising at the bottom of frame. */
  function planetArc(body, rim, opacity) {
    return svg(1600, 700,
      "<g opacity='" + opacity + "'>" +
      "<circle cx='800' cy='1140' r='620' fill='" + body + "'/>" +
      "<path d='M180 640 a620 620 0 0 1 1240 0' fill='none' stroke='" + rim +
      "' stroke-width='7' opacity='.8'/>" +
      "</g>");
  }

  /* --------------------------------------------------------------- tetris */
  /* Real tetrominoes - I, O, T, S, Z, J, L - as falling pieces and a stack. */
  function tetrominoes(fills, opacity, cell, sparse) {
    var SHAPES = [
      [[0,0],[1,0],[2,0],[3,0]],          /* I */
      [[0,0],[1,0],[0,1],[1,1]],          /* O */
      [[0,0],[1,0],[2,0],[1,1]],          /* T */
      [[1,0],[2,0],[0,1],[1,1]],          /* S */
      [[0,0],[1,0],[1,1],[2,1]],          /* Z */
      [[0,0],[0,1],[1,1],[2,1]],          /* J */
      [[2,0],[0,1],[1,1],[2,1]]           /* L */
    ];
    var out = '', i, k, px, py, shape, fill;
    for (i = 0; i < (sparse ? 5 : 9); i++) {
      shape = SHAPES[(i * 3) % SHAPES.length];
      fill = fills[(i * 2) % fills.length];
      /* snap to the well's column grid - loose pieces read as confetti */
      px = Math.floor(((i * 233) % (1600 - cell * 4)) / cell) * cell;
      py = Math.floor(((i * 151) % (420 - cell * 2)) / cell) * cell;
      out += "<g fill='" + fill + "'>";
      for (k = 0; k < shape.length; k++) {
        out += "<rect x='" + (px + shape[k][0] * cell) + "' y='" + (py + shape[k][1] * cell) +
               "' width='" + (cell - 4) + "' height='" + (cell - 4) + "' rx='3'/>";
      }
      out += "</g>";
    }
    return svg(1600, 560, "<g opacity='" + opacity + "'>" + out + "</g>");
  }

  /* The well: a settled stack of blocks along the floor. */
  function blockStack(fills, opacity, cell) {
    var out = '', col, r, h, fill;
    for (col = 0; col < 26; col++) {
      h = (col * 7) % 6;              /* some columns stay empty - it is a well */
      if (h === 0) continue;
      for (r = 0; r < h; r++) {
        fill = fills[(col + r) % fills.length];
        out += "<rect x='" + (col * cell) + "' y='" + (320 - (r + 1) * cell) +
               "' width='" + (cell - 4) + "' height='" + (cell - 4) + "' rx='3' fill='" + fill + "'/>";
      }
    }
    return svg(26 * cell, 320, "<g opacity='" + opacity + "'>" + out + "</g>");
  }

  /* Scanlines - the CRT tell for both retro themes. */
  function scanlines(fill, opacity) {
    var out = '', i;
    for (i = 0; i < 90; i++) out += "<rect x='0' y='" + (i * 6) + "' width='1600' height='2'/>";
    return svg(1600, 540, wrap(fill, opacity, out));
  }

  /* ==========================================================================
   * ATMOSPHERE TOOLKIT
   *
   * Three things separate a wallpaper from clip-art, and all three were missing:
   *
   *   1. Gradient fills. A flat fill has no light direction. Every mass here is
   *      filled with a vertical gradient - lighter where the sky hits it,
   *      deeper at its base.
   *   2. Atmospheric perspective. Distant planes lose contrast and drift toward
   *      the sky colour. `haze()` mixes a tone toward the canvas by distance, so
   *      the far band genuinely sits behind the near one.
   *   3. Grain and vignette. Perfectly smooth vectors read as vectors. A little
   *      turbulence noise and an edge falloff sell it as a photograph.
   *
   * Radial glows stop at 52% so they reach zero INSIDE their background box -
   * a gradient still painting at the box edge is what drew that hard line
   * across the page.
   * ========================================================================*/

  var UID = 0;
  function uid() { UID += 1; return 'n' + UID; }

  /* vertical gradient def */
  function vgrad(id, top, bottom) {
    return "<linearGradient id='" + id + "' x1='0' y1='0' x2='0' y2='1'>" +
           "<stop offset='0%' stop-color='" + top + "'/>" +
           "<stop offset='100%' stop-color='" + bottom + "'/></linearGradient>";
  }

  /* A glow that is genuinely zero before the edge of its box. */
  function softGlow(color, opacity, cy) {
    var id = uid();
    return svg(1400, 700,
      "<defs><radialGradient id='" + id + "' cx='50%' cy='" + (cy || 88) + "%' r='52%'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='70%' stop-color='" + color + "' stop-opacity='" + (opacity * 0.35).toFixed(3) + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs><rect width='1400' height='700' fill='url(#" + id + ")'/>");
  }

  /* Film grain. Kept very low - it should be felt, not seen. */
  function grainTile(opacity) {
    var id = uid();
    return svg(240, 240,
      "<defs><filter id='" + id + "'>" +
      "<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>" +
      "<feColorMatrix type='saturate' values='0'/>" +
      "</filter></defs>" +
      "<rect width='240' height='240' filter='url(#" + id + ")' opacity='" + opacity + "'/>");
  }

  /* Edge falloff, so the frame darkens away from the reading column. */
  function vignette(color, opacity) {
    var id = uid();
    return svg(1400, 900,
      "<defs><radialGradient id='" + id + "' cx='50%' cy='45%' r='72%'>" +
      "<stop offset='55%' stop-color='" + color + "' stop-opacity='0'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "</radialGradient></defs><rect width='1400' height='900' fill='url(#" + id + ")'/>");
  }

  /* ---------------------------------------------------------------- ridges */
  /* The workhorse. One sine period per tile so the seam matches, filled with a
   * gradient, and offered at any distance so a scene can stack value planes. */
  function ridgeBand(top, bottom, opacity, amp, base, seed) {
    var w = 1600, h = 340, i, d, x0, y0, y1, id = uid();
    function y(i) { return base - amp * Math.sin(i * Math.PI / 4 + (seed || 0)); }
    d = 'M0 ' + h + ' L0 ' + y(0).toFixed(1);
    for (i = 0; i < 8; i++) {
      x0 = i * 200; y0 = y(i); y1 = y(i + 1);
      d += ' Q' + (x0 + 100) + ' ' + ((y0 + y1) / 2 - amp * 0.6).toFixed(1) +
           ' ' + (x0 + 200) + ' ' + y1.toFixed(1);
    }
    d += ' L' + w + ' ' + h + ' Z';
    return svg(w, h, "<defs>" + vgrad(id, top, bottom) + "</defs>" +
      "<path d='" + d + "' fill='url(#" + id + ")' opacity='" + opacity + "'/>");
  }

  /* A treeline whose crowns sit on a gradient, for fog-forest depth. */
  function treeLine(top, bottom, opacity, scale) {
    var s = scale || 1, out = '', x, i, hh, ww, id = uid();
    for (i = 0; i < 18; i++) {
      x = i * 92 + (i % 3) * 14;
      hh = (120 + (i % 5) * 44) * s;
      ww = (30 + (i % 3) * 8) * s;
      out += "<path d='M" + x + " 300 l" + ww + " -" + (hh * 0.48) + " l" + ww + " " + (hh * 0.48) + " z'/>";
      out += "<path d='M" + (x + ww * 0.2) + " " + (300 - hh * 0.34) + " l" + (ww * 0.8) + " -" + (hh * 0.46) +
             " l" + (ww * 0.8) + " " + (hh * 0.46) + " z'/>";
      out += "<path d='M" + (x + ww * 0.38) + " " + (300 - hh * 0.64) + " l" + (ww * 0.62) + " -" + (hh * 0.44) +
             " l" + (ww * 0.62) + " " + (hh * 0.44) + " z'/>";
      out += "<rect x='" + (x + ww * 0.86) + "' y='276' width='" + (ww * 0.28) + "' height='26'/>";
    }
    return svg(1656, 300, "<defs>" + vgrad(id, top, bottom) + "</defs>" +
      "<g fill='url(#" + id + ")' opacity='" + opacity + "'>" + out + "</g>");
  }

  /* Brutalist arcade - the concrete themes deserve architecture, not blocks. */
  function archBand(top, bottom, opacity) {
    var out = '', i, x, id = uid(), colW = 46, span = 150;
    for (i = 0; i < 11; i++) {
      x = i * span;
      out += "<rect x='" + x + "' y='120' width='" + colW + "' height='240'/>";
      /* the vault between this column and the next */
      out += "<path d='M" + (x + colW) + " 200 q" + ((span - colW) / 2) + " -96 " + (span - colW) + " 0 l0 -46 q-" +
             ((span - colW) / 2) + " -70 -" + (span - colW) + " 0 z'/>";
    }
    out += "<rect x='0' y='96' width='" + (11 * span) + "' height='30'/>";
    return svg(11 * span, 360, "<defs>" + vgrad(id, top, bottom) + "</defs>" +
      "<g fill='url(#" + id + ")' opacity='" + opacity + "'>" + out + "</g>");
  }

  /* Soft cloud/fog bank - radial so the edges dissolve instead of cutting. */
  function cloudBank(color, opacity, scale) {
    var s = scale || 1, id = uid(), out = '', i;
    var pts = [[180, 150, 190], [420, 128, 130], [700, 168, 230], [960, 142, 150],
               [1240, 156, 200], [1450, 134, 140]];
    for (i = 0; i < pts.length; i++) {
      out += "<ellipse cx='" + pts[i][0] + "' cy='" + pts[i][1] + "' rx='" + (pts[i][2] * s) +
             "' ry='" + (pts[i][2] * s * 0.26) + "' fill='url(#" + id + ")'/>";
    }
    return svg(1600, 280,
      "<defs><radialGradient id='" + id + "' cx='50%' cy='50%' r='50%'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs>" + out);
  }

  /* A sun/moon disc with a real corona rather than a hard circle. */
  function disc(color, opacity, r) {
    var id = uid();
    return svg(900, 900,
      "<defs><radialGradient id='" + id + "' cx='50%' cy='50%' r='50%'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='" + (r || 34) + "%' stop-color='" + color + "' stop-opacity='" + (opacity * 0.85) + "'/>" +
      "<stop offset='" + ((r || 34) + 4) + "%' stop-color='" + color + "' stop-opacity='" + (opacity * 0.30) + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs><rect width='900' height='900' fill='url(#" + id + ")'/>");
  }

  /* ----------------------------------------------------------------- scenes */
  /* Each scene is a function of the palette, so it recolours with the theme.
   *
   *   u.toneOf(hue, target)  keeps the hue, solves the lightness that sits just
   *                          inside the contrast floor against body text
   *   u.mix(a, b, t)         used to haze a plane toward the canvas by distance
   *
   * Every mass is a gradient, never a flat fill, and every distant plane is
   * hazed toward the sky. That is what separates depth from clip-art.
   *
   *   HAZE  faintest, for glows
   *   FAR   the slow plane, always hazed further
   *   NEAR  the front plane, the most present thing on screen
   */
  const HAZE = 10.5, FAR = 8.6, NEAR = 7.3;

  /* Build the two stops of a mass: crown catches the sky, base stays deep. */
  function planes(u, p, hue, target, distance) {
    const base = u.mix(u.toneOf(hue, target), p.canvas, distance || 0);
    return { top: u.mix(base, p.canvas, 0.30), bottom: base, base: base };
  }

  const SCENES = {

    /* ---- neutral darks ------------------------------------------------- */

    /* Brutalism: a concrete arcade behind a distant ridge of slabs. */
    concrete: function (p, u) {
      const far = planes(u, p, '#2b2f33', FAR, 0.35), near = planes(u, p, '#2b2f33', NEAR, 0);
      return {
        hero: { svg: softGlow(u.toneOf('#2b2f33', HAZE), 0.55), size: '140% 70%', position: 'center bottom' },
        far: { svg: ridgeBand(far.top, far.bottom, 0.9, 52, 210, 0.4), tile: 1600, height: '30vh', seconds: 320, blur: 3 },
        near: { svg: archBand(near.top, near.bottom, 0.95), tile: 1650, height: '26vh', seconds: 175 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    /* Three receding ridges - the classic layered-mountain wallpaper. */
    graphite: function (p, u) {
      const far = planes(u, p, '#2a2c2d', FAR, 0.40), near = planes(u, p, '#2a2c2d', NEAR, 0);
      return {
        hero: { svg: softGlow(u.toneOf('#2a2c2d', HAZE), 0.5, 84), size: '140% 72%', position: 'center bottom' },
        far: { svg: ridgeBand(far.top, far.bottom, 0.85, 70, 190, 0), tile: 1600, height: '38vh', seconds: 340, blur: 4 },
        near: { svg: ridgeBand(near.top, near.bottom, 0.95, 44, 250, 1.9), tile: 1600, height: '24vh', seconds: 180 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    /* A ridge behind low cloud sitting in the valley. */
    slate: function (p, u) {
      const far = planes(u, p, '#2b3340', FAR, 0.38), near = planes(u, p, '#2b3340', NEAR, 0);
      return {
        hero: { svg: softGlow(u.toneOf('#2b3340', HAZE), 0.6, 84), size: '140% 72%', position: 'center bottom' },
        far: { svg: ridgeBand(far.top, far.bottom, 0.9, 76, 195, 0.7), tile: 1600, height: '36vh', seconds: 320, blur: 4 },
        near: { svg: cloudBank(u.toneOf('#2b3340', NEAR), 0.85, 1.15), tile: 1600, height: '22vh', seconds: 190, y: '72%' },
        areaColors: [far.bottom, u.toneOf('#2b3340', NEAR)]
      };
    },
    /* Deep space: a nebula wash, stars, and one silhouetted horizon. */
    carbon: function (p, u) {
      const near = planes(u, p, '#1a1c1e', NEAR, 0);
      return {
        hero: { svg: softGlow(u.toneOf('#22262b', HAZE), 0.7, 70), size: '150% 80%', position: 'center bottom' },
        far: { svg: starField(p.textMuted, 0.75, 120, 3), tile: 1600, height: '58vh', seconds: 440, y: '4%' },
        near: { svg: ridgeBand(near.top, near.bottom, 1, 40, 262, 0.4), tile: 1600, height: '20vh', seconds: 210 },
        areaColors: [near.bottom]
      };
    },
    /* Forest in fog: pale trees receding into a bank of it. */
    fog: function (p, u) {
      const far = planes(u, p, '#3a3e42', FAR, 0.42), near = planes(u, p, '#3a3e42', NEAR, 0);
      return {
        hero: { svg: softGlow(u.toneOf('#3a3e42', HAZE), 0.5), size: '150% 74%', position: 'center bottom' },
        far: { svg: treeLine(far.top, far.bottom, 0.8, 1.2), tile: 1656, height: '34vh', seconds: 330, blur: 5 },
        near: { svg: treeLine(near.top, near.bottom, 0.95, 0.8), tile: 1656, height: '22vh', seconds: 185 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    /* Dusk: a low sun over two warm ridges. */
    espresso: function (p, u) {
      const far = planes(u, p, '#332c26', FAR, 0.38), near = planes(u, p, '#332c26', NEAR, 0);
      return {
        hero: { svg: disc(u.toneOf('#4a3d30', 8.2), 0.85, 30), size: '46% 46%', position: '68% 66%' },
        far: { svg: ridgeBand(far.top, far.bottom, 0.9, 62, 200, 0.9), tile: 1600, height: '34vh', seconds: 310, blur: 3 },
        near: { svg: ridgeBand(near.top, near.bottom, 0.95, 40, 254, 2.4), tile: 1600, height: '22vh', seconds: 175 },
        areaColors: [far.bottom, near.bottom, u.toneOf('#4a3d30', 8.2)]
      };
    },

    /* ---- drawn from the reference images -------------------------------- */

    tokyoNight: function (p, u) {
      const far = planes(u, p, '#232746', 9.4, 0.30), near = planes(u, p, '#1c1f38', NEAR, 0);
      return {
        hero: { svg: softGlow(u.toneOf('#3a2246', HAZE), 0.95, 82), size: '150% 74%', position: 'center bottom' },
        far: { svg: skyline(far.top, far.bottom, '#8f7fd8', 0.9, true), tile: 2200, height: '36vh', seconds: 300, blur: 2 },
        near: { svg: skyline(near.top, near.bottom, p.accent, 0.95, false), tile: 1700, height: '24vh', seconds: 170 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    wabiSabi: function (p, u) {
      const far = planes(u, p, '#2f2b1e', FAR, 0.40), near = planes(u, p, '#2f2b1e', NEAR, 0);
      return {
        hero: { svg: softGlow(u.toneOf('#2f2b1e', HAZE), 0.5), size: '150% 74%', position: 'center bottom' },
        far: { svg: bambooBand(far.top, far.bottom, 0.8, 1.15), tile: 1620, height: '70vh', seconds: 340, blur: 4 },
        near: { svg: bambooBand(near.top, near.bottom, 0.92, 0.8), tile: 1620, height: '48vh', seconds: 190 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    darkJapandi: function (p, u) {
      const far = planes(u, p, '#33261c', FAR, 0.30), near = planes(u, p, '#33261c', NEAR, 0);
      return {
        hero: { svg: softGlow(u.toneOf('#33261c', HAZE), 0.55), size: '150% 74%', position: 'center bottom' },
        far: { svg: screenBand(far.bottom, 0.9), tile: 1600, height: '44vh', seconds: 360, blur: 1 },
        near: { svg: petals(near.bottom, 0.8, 14, 4), tile: 1520, height: '38vh', seconds: 200, y: '52%' },
        areaColors: [far.bottom, near.bottom]
      };
    },
    zenLobby: function (p, u) {
      const far = planes(u, p, '#33261a', FAR, 0.32), near = planes(u, p, '#33261a', NEAR, 0);
      return {
        hero: { svg: softGlow(u.toneOf('#3a2c1e', HAZE), 0.65), size: '150% 76%', position: 'center bottom' },
        far: { svg: reedBand(far.bottom, 0.95), tile: 1610, height: '46vh', seconds: 320, blur: 2 },
        near: { svg: stoneBand(near.bottom, 0.95), tile: 1620, height: '15vh', seconds: 180 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    concreteBlossom: function (p, u) {
      const far = planes(u, p, '#2f2e29', FAR, 0.34), near = planes(u, p, '#2f2e29', NEAR, 0);
      return {
        hero: { svg: branch(near.bottom, u.toneOf('#3a3831', NEAR)), size: '128% auto', position: 'center top' },
        far: { svg: archBand(far.top, far.bottom, 0.85), tile: 1650, height: '24vh', seconds: 310, blur: 3 },
        near: { svg: petals(near.bottom, 0.9, 16, 2), tile: 1520, height: '44vh', seconds: 200, y: '38%' },
        areaColors: [far.bottom, near.bottom]
      };
    },

    /* ---- retro ----------------------------------------------------------- */

    galactica: function (p, u) {
      const body = u.toneOf('#1b2432', 9.6), rim = u.toneOf('#3c4c63', NEAR);
      const hull = u.toneOf('#1b2432', NEAR);
      return {
        hero: { svg: planetArc(body, rim, 0.95), size: '150% 76%', position: 'center bottom' },
        far: { svg: starField(p.textSecondary, 0.7, 120, 7), tile: 1600, height: '58vh', seconds: 460, y: '4%' },
        near: { svg: fleetBand(hull, p.accent, 0.95), tile: 1700, height: '28vh', seconds: 240, y: '62%' },
        areaColors: [body, rim, hull]
      };
    },
    tetris: function (p, u) {
      const cyan = u.toneOf('#2f6f86', NEAR), violet = u.toneOf('#4a3a72', NEAR),
            rose = u.toneOf('#6b3a55', NEAR), blue = u.toneOf('#2f4a7a', NEAR);
      const dim = [u.toneOf('#4a3a72', FAR), u.toneOf('#2f4a7a', FAR), u.toneOf('#6b3a55', FAR)];
      return {
        hero: { svg: scanlines(u.toneOf('#4a3a72', HAZE), 0.55), size: '100% 100%', position: 'center top' },
        far: { svg: tetrominoes(dim, 0.8, 46, true), tile: 1600, height: '56vh', seconds: 300, y: '6%', blur: 2 },
        near: { svg: blockStack([violet, blue, rose, cyan], 0.95, 52), tile: 1352, height: '20vh', seconds: 175 },
        areaColors: dim.concat([cyan, violet, rose, blue])
      };
    },

    /* ---- light mode ----------------------------------------------------- */

    mountFuji: function (p, u) {
      const rock = planes(u, p, '#bdcadf', NEAR, 0), ridge = planes(u, p, '#bdcadf', FAR, 0.30);
      const pine = planes(u, p, '#aebbd2', NEAR, 0.10);
      const id = 'fuji';
      return {
        hero: {
          svg: svg(1600, 620,
            "<defs>" +
            "<linearGradient id='" + id + "' x1='0' y1='0' x2='0' y2='1'>" +
            "<stop offset='0%' stop-color='" + rock.top + "'/><stop offset='100%' stop-color='" + rock.bottom + "'/>" +
            "</linearGradient>" +
            "<linearGradient id='" + id + "r' x1='0' y1='0' x2='0' y2='1'>" +
            "<stop offset='0%' stop-color='" + ridge.top + "'/><stop offset='100%' stop-color='" + ridge.bottom + "'/>" +
            "</linearGradient></defs>" +
            "<path d='M0 620 L250 452 q30 -22 60 0 L560 620 z' fill='url(#" + id + "r)'/>" +
            "<path d='M1040 620 L1300 430 q30 -22 60 0 L1600 620 z' fill='url(#" + id + "r)'/>" +
            "<path d='M0 620 L470 236 q40 -34 80 0 L1080 620 z' fill='url(#" + id + ")'/>" +
            /* snow reads lighter than the canvas, so it is safe by construction */
            "<path d='M448 258 q62 -54 124 -22 l58 62 q-42 -22 -76 4 q-34 26 -70 -6 q-24 -22 -36 -38z' fill='#fbfdff'/>"),
          size: '116% 56%', position: 'center bottom'
        },
        far: { svg: cloudBank(u.toneOf('#c9d6ea', HAZE), 0.95, 1.05), tile: 1600, height: '20vh', seconds: 270, y: '38%', blur: 2 },
        near: { svg: treeLine(pine.top, pine.bottom, 0.9, 0.72), tile: 1656, height: '16vh', seconds: 155 },
        areaColors: [rock.bottom, ridge.bottom, pine.bottom]
      };
    },
    palmForest: function (p, u) {
      const far = planes(u, p, '#b9cfb3', FAR, 0.35), near = planes(u, p, '#a7c2a0', NEAR, 0);
      return {
        hero: { svg: softGlow(u.toneOf('#b9cfb3', HAZE), 0.9, 92), size: '150% 70%', position: 'center bottom' },
        far: { svg: treeLine(far.top, far.bottom, 0.85, 1.2), tile: 1656, height: '34vh', seconds: 290, blur: 4 },
        near: { svg: treeLine(near.top, near.bottom, 0.95, 0.78), tile: 1656, height: '22vh', seconds: 165 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    hawaiiOcean: function (p, u) {
      const sand = planes(u, p, '#e0cba4', NEAR, 0), palm = u.toneOf('#9fc4b2', NEAR);
      const wave = u.toneOf('#a8cfdd', FAR), id = 'ocn';
      return {
        hero: {
          svg: svg(1600, 560,
            "<defs><linearGradient id='" + id + "' x1='0' y1='0' x2='0' y2='1'>" +
            "<stop offset='0%' stop-color='" + sand.top + "'/><stop offset='100%' stop-color='" + sand.bottom + "'/>" +
            "</linearGradient></defs>" +
            "<path d='M0 372 q260 -34 520 0 q260 34 520 0 q260 -34 560 6' stroke='" + wave + "' stroke-width='9' fill='none' stroke-linecap='round' opacity='.85'/>" +
            "<path d='M0 322 q300 -30 600 2 q300 32 600 -4 q200 -22 400 4' stroke='" + wave + "' stroke-width='7' fill='none' stroke-linecap='round' opacity='.6'/>" +
            "<path d='M0 560 L0 430 q400 -70 800 -10 q400 60 800 -20 L1600 560 z' fill='url(#" + id + ")'/>"),
          size: '110% 48%', position: 'center bottom'
        },
        far: { svg: cloudBank(u.toneOf('#bcd9e2', HAZE), 0.9, 1.1), tile: 1600, height: '20vh', seconds: 300, y: '44%', blur: 2 },
        near: { svg: palmBand(palm, 0.95), tile: 1700, height: '32vh', seconds: 195 },
        areaColors: [sand.bottom, wave, palm]
      };
    },
    hawaiiMorning: function (p, u) {
      const water = planes(u, p, '#d3b89c', NEAR, 0), palm = u.toneOf('#c9a888', NEAR);
      const sky = u.toneOf('#f0c9a4', FAR), id = 'mrn';
      return {
        hero: {
          svg: svg(1600, 620,
            "<defs><linearGradient id='" + id + "' x1='0' y1='0' x2='0' y2='1'>" +
            "<stop offset='0%' stop-color='" + water.top + "'/><stop offset='100%' stop-color='" + water.bottom + "'/>" +
            "</linearGradient>" +
            "<radialGradient id='" + id + "s' cx='50%' cy='50%' r='50%'>" +
            "<stop offset='0%' stop-color='#fff3e4' stop-opacity='.95'/>" +
            "<stop offset='34%' stop-color='#fff3e4' stop-opacity='.8'/>" +
            "<stop offset='100%' stop-color='#fff3e4' stop-opacity='0'/>" +
            "</radialGradient></defs>" +
            "<rect x='430' y='60' width='740' height='740' fill='url(#" + id + "s)'/>" +
            "<path d='M0 402 q300 -26 600 2 q300 28 600 -6' stroke='" + sky + "' stroke-width='8' fill='none' stroke-linecap='round' opacity='.8'/>" +
            "<path d='M0 620 L0 452 q400 -46 800 -6 q400 40 800 -14 L1600 620 z' fill='url(#" + id + ")'/>"),
          size: '112% 54%', position: 'center bottom'
        },
        far: { svg: cloudBank(u.toneOf('#f2d3b4', HAZE), 0.85, 1.1), tile: 1600, height: '20vh', seconds: 290, y: '50%', blur: 2 },
        near: { svg: palmBand(palm, 0.95), tile: 1700, height: '32vh', seconds: 185 },
        areaColors: [water.bottom, sky, palm]
      };
    },
    cherryBlossom: function (p, u) {
      const bark = u.toneOf('#c39aa8', NEAR), bloom = u.toneOf('#e8b9c9', FAR);
      const drift = u.toneOf('#e3aec1', NEAR), soft = u.toneOf('#eec8d5', HAZE);
      return {
        hero: { svg: branch(bark, bloom), size: '112% auto', position: 'center top' },
        far: { svg: petals(soft, 0.9, 26, 1), tile: 1520, height: '58vh', seconds: 320, y: '18%', blur: 2 },
        near: { svg: petals(drift, 0.85, 18, 5), tile: 1520, height: '40vh', seconds: 190, y: '46%' },
        areaColors: [bark, bloom, drift, soft]
      };
    }
  };

  /* The engine composites grain and vignette itself, so it needs the two
   * helpers that are not part of any single scene. */
  root.NWT_ATMOS = { grainTile: grainTile, vignette: vignette };
  root.NWT_SCENES = SCENES;
})(typeof self !== 'undefined' ? self : this);
