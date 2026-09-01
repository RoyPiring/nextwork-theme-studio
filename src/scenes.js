/* ============================================================================
 * NextWork Theme Studio - scenery
 *
 * Generated SVG scenes, one per theme, drawn from the theme's own palette so
 * nothing here carries anyone else's colours or copyright.
 *
 * One theme breaks the pattern. Concrete uses a painted wallpaper, which lives
 * in src/wallpapers.js as an inline data URI; its scene supplies only the
 * layers that drift over the top. Nothing is fetched at runtime either way.
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

  /* Full-bleed gradients must STRETCH, not slice. With 'slice' the SVG is
   * cropped to cover its box, which cuts off the outer ring where the gradient
   * reaches zero opacity - so the box edge still paints, as a straight
   * horizontal line across the page. */
  function bleed(w, h, body) {
    return "<svg xmlns='http://www.w3.org/2000/svg' width='" + w + "' height='" + h +
           "' viewBox='0 0 " + w + " " + h + "' preserveAspectRatio='none'>" + body + "</svg>";
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

  /* A planet limb: the curve of a world rising at the bottom of frame.
   * The body is a radial gradient, not a flat fill. A flat circle draws a hard
   * curved edge, and a hard edge crossing a column of text reads as the page
   * being sliced in half - which is exactly what it did. The rim stays, thin
   * and faint, because that is the part that says "planet". */
  function planetArc(body, rim, opacity) {
    var id = uid();
    return bleed(1600, 700,
      "<defs><radialGradient id='" + id + "' cx='50%' cy='163%' r='47%'>" +
      "<stop offset='0%' stop-color='" + body + "' stop-opacity='1'/>" +
      "<stop offset='72%' stop-color='" + body + "' stop-opacity='.92'/>" +
      "<stop offset='96%' stop-color='" + body + "' stop-opacity='.18'/>" +
      "<stop offset='100%' stop-color='" + body + "' stop-opacity='0'/>" +
      "</radialGradient></defs>" +
      "<g opacity='" + opacity + "'>" +
      "<rect width='1600' height='700' fill='url(#" + id + ")'/>" +
      "<path d='M180 640 a620 620 0 0 1 1240 0' fill='none' stroke='" + rim +
      "' stroke-width='5' opacity='.45'/>" +
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
    return bleed(1600, 540, wrap(fill, opacity, out));
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
    return bleed(1400, 700,
      "<defs><radialGradient id='" + id + "' cx='50%' cy='" + (cy || 88) + "%' r='52%'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='70%' stop-color='" + color + "' stop-opacity='" + (opacity * 0.35).toFixed(3) + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs><rect width='1400' height='700' fill='url(#" + id + ")'/>");
  }

  /* Film grain. Kept very low - it should be felt, not seen. */
  function grainTile(opacity) {
    var id = uid();
    return bleed(240, 240,
      "<defs><filter id='" + id + "'>" +
      "<feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3' stitchTiles='stitch'/>" +
      "<feColorMatrix type='saturate' values='0'/>" +
      "</filter></defs>" +
      "<rect width='240' height='240' filter='url(#" + id + ")' opacity='" + opacity + "'/>");
  }

  /* Edge falloff, so the frame darkens away from the reading column. */
  function vignette(color, opacity) {
    var id = uid();
    return bleed(1400, 900,
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
    return bleed(900, 900,
      "<defs><radialGradient id='" + id + "' cx='50%' cy='50%' r='50%'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='" + (r || 34) + "%' stop-color='" + color + "' stop-opacity='" + (opacity * 0.85) + "'/>" +
      "<stop offset='" + ((r || 34) + 4) + "%' stop-color='" + color + "' stop-opacity='" + (opacity * 0.30) + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs><rect width='900' height='900' fill='url(#" + id + ")'/>");
  }

  /* ========================================================================
   * SIGNATURE MOTIFS
   *
   * One motif belongs to exactly one theme. Sharing a shape across themes is
   * what made the set feel like variations of a single wallpaper, so
   * tools/audit.js now fails if two scenes declare the same motif.
   * ======================================================================*/

  /* slate - a run of pitched rooftops with chimneys */
  function roofLine(top, bottom, opacity) {
    var out = '', i, x = 0, w, h, id = uid();
    for (i = 0; i < 14; i++) {
      w = 90 + (i * 53) % 80;
      h = 70 + (i * 37) % 70;
      out += "<path d='M" + x + " 340 L" + x + " " + (340 - h) + " L" + (x + w / 2) + " " +
             (340 - h - 46) + " L" + (x + w) + " " + (340 - h) + " L" + (x + w) + " 340 Z'/>";
      if (i % 3 === 0) {
        out += "<rect x='" + (x + w * 0.68) + "' y='" + (340 - h - 60) + "' width='16' height='40'/>";
      }
      x += w + 6;
    }
    return svg(x, 340, "<defs>" + vgrad(id, top, bottom) + "</defs>" +
      "<g fill='url(#" + id + ")' opacity='" + opacity + "'>" + out + "</g>");
  }

  /* espresso - vapour rising off something hot */
  function steamBand(color, opacity) {
    var out = '', i, x, id = uid();
    for (i = 0; i < 7; i++) {
      x = i * 230 + (i % 3) * 40;
      out += "<path d='M" + x + " 420 c -34 -70 34 -110 0 -180 c -30 -62 26 -96 4 -150' " +
             "fill='none' stroke='url(#" + id + ")' stroke-width='" + (16 + (i % 3) * 7) +
             "' stroke-linecap='round' opacity='" + (0.5 + (i % 4) * 0.14).toFixed(2) + "'/>";
    }
    return svg(1610, 420,
      "<defs><linearGradient id='" + id + "' x1='0' y1='1' x2='0' y2='0'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</linearGradient></defs>" + out);
  }

  /* dark japandi - noren, the split fabric curtain hung in a doorway */
  function norenBand(top, bottom, opacity) {
    var out = '', i, x, id = uid();
    for (i = 0; i < 9; i++) {
      x = i * 180;
      out += "<path d='M" + x + " 0 h150 v250 q-40 16 -75 0 q-35 -16 -75 0 z'/>";
    }
    return svg(1620, 260, "<defs>" + vgrad(id, top, bottom) + "</defs>" +
      "<g fill='url(#" + id + ")' opacity='" + opacity + "'>" + out + "</g>");
  }

  /* concrete & blossom - board-formed concrete: panel seams and tie holes */
  function formworkBand(top, bottom, opacity) {
    var out = '', r, c, id = uid();
    for (r = 0; r < 6; r++) {
      out += "<rect x='0' y='" + (r * 80) + "' width='1600' height='3'/>";
      for (c = 0; c < 8; c++) {
        out += "<rect x='" + (c * 200) + "' y='" + (r * 80) + "' width='3' height='80'/>";
        out += "<circle cx='" + (c * 200 + 100) + "' cy='" + (r * 80 + 40) + "' r='5'/>";
      }
    }
    return svg(1600, 480, "<defs>" + vgrad(id, top, bottom) + "</defs>" +
      "<g fill='url(#" + id + ")' opacity='" + opacity + "'>" + out + "</g>");
  }

  /* concrete & blossom - ikebana: a vessel, three stems, a few blooms */
  function ikebana(stem, bloom) {
    return svg(1200, 640,
      "<g stroke='" + stem + "' stroke-width='7' fill='none' stroke-linecap='round'>" +
      "<path d='M600 620 q-14 -190 -96 -290'/>" +
      "<path d='M604 620 q22 -150 118 -226'/>" +
      "<path d='M598 620 q-4 -110 -30 -170'/>" +
      "</g>" +
      "<g fill='" + bloom + "'>" +
      "<circle cx='504' cy='330' r='17'/><circle cx='486' cy='356' r='11'/>" +
      "<circle cx='722' cy='394' r='15'/><circle cx='744' cy='372' r='10'/>" +
      "<circle cx='568' cy='450' r='12'/>" +
      "</g>" +
      "<path d='M556 620 q6 -66 44 -66 q38 0 44 66 z' fill='" + stem + "'/>");
  }

  /* galactica - dust lanes, drifting diagonally */
  function nebulaBand(color, opacity) {
    var out = '', i, id = uid();
    var lanes = [[120, 90, 520, 60], [640, 150, 620, 84], [1180, 70, 480, 54]];
    for (i = 0; i < lanes.length; i++) {
      out += "<ellipse cx='" + lanes[i][0] + "' cy='" + lanes[i][1] + "' rx='" + lanes[i][2] +
             "' ry='" + lanes[i][3] + "' fill='url(#" + id + ")' transform='rotate(-14 " +
             lanes[i][0] + " " + lanes[i][1] + ")'/>";
    }
    return svg(1600, 300,
      "<defs><radialGradient id='" + id + "' cx='50%' cy='50%' r='50%'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs>" + out);
  }

  /* palm forest - canopy hanging into frame from above */
  function canopyBand(top, bottom, opacity) {
    var out = '', i, x, id = uid();
    for (i = 0; i < 12; i++) {
      x = i * 140 + (i % 3) * 26;
      out += "<ellipse cx='" + x + "' cy='" + (40 + (i % 4) * 34) + "' rx='" + (96 + (i % 3) * 30) +
             "' ry='" + (58 + (i % 4) * 20) + "'/>";
    }
    return svg(1680, 300, "<defs>" + vgrad(id, top, bottom) + "</defs>" +
      "<g fill='url(#" + id + ")' opacity='" + opacity + "'>" + out + "</g>");
  }

  /* palm forest - broadleaf trees. Rounded crowns on visible trunks, so they
   * read as trees without borrowing Fog's conifers or Hawaii's palms. */
  function broadleafBand(top, bottom, opacity, scale) {
    var sc = scale || 1, out = '', i, x, th, cw, ch, id = uid();
    for (i = 0; i < 11; i++) {
      x = i * 150 + (i % 3) * 26;
      th = (150 + (i % 4) * 54) * sc;          /* trunk height */
      cw = (58 + (i % 3) * 20) * sc;           /* crown width  */
      ch = (46 + (i % 4) * 18) * sc;
      out += "<rect x='" + (x - 5 * sc) + "' y='" + (360 - th) + "' width='" + (10 * sc) +
             "' height='" + th + "' rx='" + (4 * sc) + "'/>";
      /* a crown built from three overlapping lobes, never a plain circle */
      out += "<ellipse cx='" + x + "' cy='" + (360 - th - ch * 0.35) + "' rx='" + cw + "' ry='" + ch + "'/>";
      out += "<ellipse cx='" + (x - cw * 0.55) + "' cy='" + (360 - th + ch * 0.1) + "' rx='" + (cw * 0.62) +
             "' ry='" + (ch * 0.72) + "'/>";
      out += "<ellipse cx='" + (x + cw * 0.58) + "' cy='" + (360 - th + ch * 0.04) + "' rx='" + (cw * 0.58) +
             "' ry='" + (ch * 0.7) + "'/>";
    }
    return svg(1700, 360, "<defs>" + vgrad(id, top, bottom) + "</defs>" +
      "<g fill='url(#" + id + ")' opacity='" + opacity + "'>" + out + "</g>");
  }

  /* hawaii morning - birds, high and small */
  function birdBand(color, opacity) {
    var out = '', i, x, y, s;
    for (i = 0; i < 11; i++) {
      x = (i * 173) % 1500 + 40;
      y = (i * 97) % 260 + 30;
      s = 0.6 + (i % 3) * 0.3;
      out += "<path d='M0 0 q9 -8 18 0 q9 -8 18 0' fill='none' stroke='" + color +
             "' stroke-width='3' stroke-linecap='round' transform='translate(" + x + "," + y +
             ") scale(" + s.toFixed(2) + ")' opacity='" + (0.5 + (i % 3) * 0.2).toFixed(2) + "'/>";
    }
    return svg(1560, 320, "<g opacity='" + opacity + "'>" + out + "</g>");
  }

  /* hawaii ocean - a headland on the horizon */
  function islandBand(top, bottom, opacity) {
    var id = uid();
    return svg(1600, 260, "<defs>" + vgrad(id, top, bottom) + "</defs>" +
      "<g fill='url(#" + id + ")' opacity='" + opacity + "'>" +
      "<path d='M120 260 q90 -128 210 -108 q104 18 150 108 z'/>" +
      "<path d='M700 260 q64 -80 150 -70 q78 10 112 70 z'/>" +
      "<path d='M1180 260 q112 -150 250 -120 q120 26 158 120 z'/>" +
      "</g>");
  }

  /* hawaii morning - ripples on flat water */
  function rippleBand(color, opacity) {
    var out = '', i, y;
    for (i = 0; i < 9; i++) {
      y = 40 + i * 30;
      out += "<path d='M0 " + y + " q200 -12 400 0 q200 12 400 0 q200 -12 400 0 q200 12 400 0' " +
             "fill='none' stroke='" + color + "' stroke-width='" + (3 + (i % 3)) +
             "' stroke-linecap='round' opacity='" + (0.28 + (i % 4) * 0.16).toFixed(2) + "'/>";
    }
    return svg(1600, 320, "<g opacity='" + opacity + "'>" + out + "</g>");
  }

  /* ----------------------------------------------------------------- scenes */
  /* Each scene is a function of the palette, so it recolours with the theme.
   *
   *   u.toneOf(hue, target)  keeps the hue, solves the lightness that sits just
   *                          inside the contrast floor against body text
   *   u.mix(a, b, t)         hazes a plane toward the canvas by distance
   *
   * `motifs` names the shapes a scene uses. No two scenes may share one -
   * tools/audit.js enforces it - because reusing a silhouette is what made
   * eighteen themes feel like three.
   *
   *   HAZE  faintest, for glows
   *   FAR   the slow plane, always hazed further
   *   NEAR  the front plane, the most present thing on screen
   */
  /* Contrast targets. These are distances from body text, so a HIGHER number
   * is a QUIETER shape. NEAR used to sit at 7.3 - right on the floor - which
   * made every scene as loud as the guarantee permits. Scenery has to lose
   * an argument with the paragraph in front of it. */
  const HAZE = 11.2, FAR = 9.6, NEAR = 8.4;

  /* concrete - mist lying along the floor. The architecture is fixed, so this
   * is the layer carrying the motion: buildings do not drift, haze does. */
  function floorMist(color, opacity) {
    var id = uid(), out = '', i;
    var pts = [[150, 116, 230], [440, 94, 160], [780, 124, 270], [1090, 102, 180],
               [1430, 112, 220], [1720, 90, 150]];
    for (i = 0; i < pts.length; i++) {
      out += "<ellipse cx='" + pts[i][0] + "' cy='" + (200 - pts[i][1] * 0.3) +
             "' rx='" + pts[i][2] + "' ry='" + pts[i][1] + "'/>";
    }
    return svg(1900, 200,
      "<defs><radialGradient id='" + id + "'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs><g fill='url(#" + id + ")'>" + out + "</g>");
  }

  /* concrete - dust hanging in the air of the corridor, lit from the doorway.
   *
   * This is what the painting cannot do: the picture is fixed, so the motes
   * and the mist are the only things that move, and the two bands panning at
   * different rates are what stop it reading as a static desktop background.
   *
   * Sizes and heights are picked off a fixed table rather than Math.random, so
   * the same stylesheet comes out of every build and the generated assets in
   * assets/ do not churn on every run. */
  function motes(color, opacity) {
    var id = uid(), out = '', i;
    var pts = [[70, 214, 3.0], [186, 96, 1.8], [305, 268, 2.4], [412, 150, 1.4],
               [534, 62, 2.8], [648, 206, 1.6], [761, 128, 3.4], [880, 250, 1.9],
               [995, 84, 2.2], [1108, 178, 1.3], [1230, 240, 2.9], [1344, 110, 1.7],
               [1462, 196, 2.5], [1580, 58, 1.5], [1698, 232, 3.1], [1815, 144, 2.0],
               [1932, 92, 1.6], [2054, 216, 2.7], [2160, 166, 1.4]];
    for (i = 0; i < pts.length; i++) {
      out += "<circle cx='" + pts[i][0] + "' cy='" + pts[i][1] + "' r='" +
             (pts[i][2] * 4) + "' fill='url(#" + id + ")'/>";
    }
    return svg(2200, 300,
      "<defs><radialGradient id='" + id + "'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='45%' stop-color='" + color + "' stop-opacity='" + (opacity * 0.4).toFixed(3) + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs>" + out);
  }

  function planes(u, p, hue, target, distance) {
    const base = u.mix(u.toneOf(hue, target), p.canvas, distance || 0);
    return { top: u.mix(base, p.canvas, 0.30), bottom: base, base: base };
  }

  const SCENES = {

    /* ---- neutral darks ------------------------------------------------- */

    concrete: function (p, u) {
      /* The painting is the wallpaper and it does not move. Everything that
       * does move is layered over it: mist along the floor on the slow band,
       * dust in the air on the faster one. The parallax between the two is
       * what keeps it from reading as a desktop background someone pasted in.
       *
       * The image is already darkened past the contrast floor at generation
       * time (see src/wallpapers.js), so the tones listed here are only the
       * drifting layers drawn on top of it. */
      const haze = u.toneOf('#2b2f33', HAZE);
      const dust = u.toneOf('#9fb4c4', 9.4);
      return {
        motifs: ['arcade', 'portal', 'stroller', 'motes'],
        wallpaper: 'concreteCorridor',
        hero: { wallpaper: 'concreteCorridor', size: 'cover', position: 'center bottom' },
        far: {
          svg: floorMist(haze, 0.55),
          tile: 1900, height: '18vh', seconds: 300, blur: 2
        },
        near: {
          svg: motes(dust, 0.5),
          tile: 2200, height: '24vh', seconds: 140
        },
        areaColors: [haze, dust]
      };
    },
    graphite: function (p, u) {
      const far = planes(u, p, '#2a2c2d', FAR, 0.40), near = planes(u, p, '#2a2c2d', NEAR, 0);
      return {
        motifs: ['ridges'],
        hero: { svg: softGlow(u.toneOf('#2a2c2d', HAZE), 0.5, 84), size: '140% 72%', position: 'center bottom' },
        far: { svg: ridgeBand(far.top, far.bottom, 0.85, 70, 190, 0), tile: 1600, height: '34vh', seconds: 340, blur: 4 },
        near: { svg: ridgeBand(near.top, near.bottom, 0.95, 44, 250, 1.9), tile: 1600, height: '24vh', seconds: 180 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    slate: function (p, u) {
      const far = planes(u, p, '#2b3340', FAR, 0.38), near = planes(u, p, '#2b3340', NEAR, 0);
      return {
        motifs: ['rooftops'],
        hero: { svg: softGlow(u.toneOf('#2b3340', HAZE), 0.6, 84), size: '140% 72%', position: 'center bottom' },
        far: { svg: roofLine(far.top, far.bottom, 0.85), tile: 1450, height: '30vh', seconds: 330, blur: 3 },
        near: { svg: roofLine(near.top, near.bottom, 0.95), tile: 1290, height: '22vh', seconds: 180 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    carbon: function (p, u) {
      return {
        motifs: ['starfield'],
        hero: { svg: softGlow(u.toneOf('#22262b', HAZE), 0.7, 70), size: '150% 80%', position: 'center bottom' },
        far: { svg: starField(p.textMuted, 0.7, 120, 3), tile: 1600, height: '34vh', seconds: 440, y: '4%' },
        near: { svg: starField(p.textSecondary, 0.5, 40, 11), tile: 1600, height: '26vh', seconds: 230, y: '30%' },
        areaColors: []
      };
    },
    fog: function (p, u) {
      const far = planes(u, p, '#3a3e42', FAR, 0.42), near = planes(u, p, '#3a3e42', NEAR, 0);
      return {
        motifs: ['pines'],
        hero: { svg: softGlow(u.toneOf('#3a3e42', HAZE), 0.5), size: '150% 74%', position: 'center bottom' },
        far: { svg: treeLine(far.top, far.bottom, 0.8, 1.2), tile: 1656, height: '34vh', seconds: 330, blur: 5 },
        near: { svg: treeLine(near.top, near.bottom, 0.95, 0.8), tile: 1656, height: '22vh', seconds: 185 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    espresso: function (p, u) {
      return {
        motifs: ['steam'],
        hero: { svg: softGlow(u.toneOf('#3d332b', HAZE), 0.6, 90), size: '150% 76%', position: 'center bottom' },
        far: { svg: steamBand(u.toneOf('#4a3d30', FAR), 0.8), tile: 1610, height: '34vh', seconds: 330, blur: 4 },
        near: { svg: steamBand(u.toneOf('#4a3d30', NEAR), 0.9), tile: 1610, height: '26vh', seconds: 190 },
        areaColors: [u.toneOf('#4a3d30', NEAR)]
      };
    },

    /* ---- drawn from the reference images -------------------------------- */

    tokyoNight: function (p, u) {
      const far = planes(u, p, '#232746', 9.4, 0.30), near = planes(u, p, '#1c1f38', NEAR, 0);
      return {
        motifs: ['skyline'],
        hero: { svg: softGlow(u.toneOf('#3a2246', HAZE), 0.95, 82), size: '150% 74%', position: 'center bottom' },
        far: { svg: skyline(far.top, far.bottom, '#8f7fd8', 0.9, true), tile: 2200, height: '34vh', seconds: 300, blur: 2 },
        near: { svg: skyline(near.top, near.bottom, p.accent, 0.95, false), tile: 1700, height: '24vh', seconds: 170 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    wabiSabi: function (p, u) {
      const far = planes(u, p, '#2f2b1e', FAR, 0.40), near = planes(u, p, '#2f2b1e', NEAR, 0);
      return {
        motifs: ['bamboo'],
        hero: { svg: softGlow(u.toneOf('#2f2b1e', HAZE), 0.5), size: '150% 74%', position: 'center bottom' },
        far: { svg: bambooBand(far.top, far.bottom, 0.8, 1.15), tile: 1620, height: '34vh', seconds: 340, blur: 4 },
        near: { svg: bambooBand(near.top, near.bottom, 0.92, 0.8), tile: 1620, height: '26vh', seconds: 190 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    darkJapandi: function (p, u) {
      const far = planes(u, p, '#33261c', FAR, 0.30), near = planes(u, p, '#33261c', NEAR, 0);
      return {
        motifs: ['shoji', 'noren'],
        hero: { svg: softGlow(u.toneOf('#33261c', HAZE), 0.55), size: '150% 74%', position: 'center bottom' },
        far: { svg: screenBand(far.bottom, 0.45), tile: 1600, height: '34vh', seconds: 360, blur: 1 },
        near: { svg: norenBand(near.top, near.bottom, 0.9), tile: 1620, height: '20vh', seconds: 200, y: '2%' },
        areaColors: [far.bottom, near.bottom]
      };
    },
    zenLobby: function (p, u) {
      const far = planes(u, p, '#33261a', FAR, 0.32), near = planes(u, p, '#33261a', NEAR, 0);
      return {
        motifs: ['reeds', 'stones'],
        hero: { svg: softGlow(u.toneOf('#3a2c1e', HAZE), 0.65), size: '150% 76%', position: 'center bottom' },
        far: { svg: reedBand(far.bottom, 0.95), tile: 1610, height: '34vh', seconds: 320, blur: 2 },
        near: { svg: stoneBand(near.bottom, 0.95), tile: 1620, height: '15vh', seconds: 180 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    concreteBlossom: function (p, u) {
      const far = planes(u, p, '#2f2e29', FAR, 0.34), near = planes(u, p, '#2f2e29', NEAR, 0);
      return {
        motifs: ['formwork', 'ikebana'],
        hero: { svg: ikebana(near.bottom, u.toneOf('#3a3831', NEAR)), size: 'auto 34%', position: '92% bottom' },
        far: { svg: formworkBand(far.top, far.bottom, 0.30), tile: 1600, height: '34vh', seconds: 340, blur: 2 },
        near: { svg: formworkBand(near.top, near.bottom, 0.22), tile: 1120, height: '26vh', seconds: 195 },
        areaColors: [far.bottom, near.bottom]
      };
    },

    /* ---- retro ----------------------------------------------------------- */

    galactica: function (p, u) {
      const body = u.toneOf('#1b2432', 9.6), rim = u.toneOf('#3c4c63', NEAR);
      const hull = u.toneOf('#1b2432', NEAR);
      return {
        motifs: ['planet', 'fleet', 'nebula'],
        hero: { svg: planetArc(body, rim, 0.9), size: '150% 58%', position: 'center bottom' },
        far: { svg: nebulaBand(u.toneOf('#42506b', FAR), 0.8), tile: 1600, height: '34vh', seconds: 420, y: '8%', blur: 3 },
        near: { svg: fleetBand(hull, p.accent, 0.85), tile: 1700, height: '20vh', seconds: 240, y: '78%' },
        areaColors: [body, rim, hull, u.toneOf('#42506b', FAR)]
      };
    },
    tetris: function (p, u) {
      const cyan = u.toneOf('#2f6f86', NEAR), violet = u.toneOf('#4a3a72', NEAR),
            rose = u.toneOf('#6b3a55', NEAR), blue = u.toneOf('#2f4a7a', NEAR);
      const dim = [u.toneOf('#4a3a72', FAR), u.toneOf('#2f4a7a', FAR), u.toneOf('#6b3a55', FAR)];
      return {
        motifs: ['tetrominoes', 'scanlines'],
        hero: { svg: scanlines(u.toneOf('#4a3a72', HAZE), 0.55), size: '100% 100%', position: 'center top' },
        far: { svg: tetrominoes(dim, 0.8, 46, true), tile: 1600, height: '34vh', seconds: 300, y: '6%', blur: 2 },
        near: { svg: blockStack([violet, blue, rose, cyan], 0.95, 52), tile: 1352, height: '20vh', seconds: 175 },
        areaColors: dim.concat([cyan, violet, rose, blue])
      };
    },

    /* ---- light mode ----------------------------------------------------- */

    mountFuji: function (p, u) {
      const rock = planes(u, p, '#bdcadf', NEAR, 0), ridge = planes(u, p, '#bdcadf', FAR, 0.30);
      const id = 'fuji';
      return {
        motifs: ['fuji', 'clouds'],
        hero: {
          svg: svg(1600, 620,
            "<defs>" +
            "<linearGradient id='" + id + "' x1='0' y1='0' x2='0' y2='1'>" +
            "<stop offset='0%' stop-color='" + rock.top + "'/><stop offset='100%' stop-color='" + rock.bottom + "'/>" +
            "</linearGradient>" +
            "<linearGradient id='" + id + "r' x1='0' y1='0' x2='0' y2='1'>" +
            "<stop offset='0%' stop-color='" + ridge.top + "'/><stop offset='100%' stop-color='" + ridge.bottom + "'/>" +
            "</linearGradient>" +
            "<linearGradient id='" + id + "f' x1='0' y1='0' x2='0' y2='1'>" +
            "<stop offset='0%' stop-color='" + p.canvas + "' stop-opacity='0'/>" +
            "<stop offset='58%' stop-color='" + p.canvas + "' stop-opacity='0'/>" +
            "<stop offset='100%' stop-color='" + p.canvas + "' stop-opacity='.82'/>" +
            "</linearGradient></defs>" +
            "<path d='M0 620 L250 452 q30 -22 60 0 L560 620 z' fill='url(#" + id + "r)'/>" +
            "<path d='M1040 620 L1300 430 q30 -22 60 0 L1600 620 z' fill='url(#" + id + "r)'/>" +
            "<path d='M0 620 L470 236 q40 -34 80 0 L1080 620 z' fill='url(#" + id + ")'/>" +
            "<path d='M448 258 q62 -54 124 -22 l58 62 q-42 -22 -76 4 q-34 26 -70 -6 q-24 -22 -36 -38z' fill='#fbfdff'/>" +
            /* The flanks used to end in a hard diagonal. This washes the lower
             * half back toward the sky so the mountain settles into the page
             * instead of being cut out of it. */
            "<rect width='1600' height='620' fill='url(#" + id + "f)'/>"),
          size: '100% 54%', position: 'center bottom'
        },
        far: { svg: cloudBank(u.toneOf('#c9d6ea', HAZE), 0.95, 1.0), tile: 1600, height: '20vh', seconds: 280, y: '34%', blur: 2 },
        near: { svg: cloudBank(u.toneOf('#c9d6ea', FAR), 0.85, 1.5), tile: 1600, height: '24vh', seconds: 165, y: '72%' },
        areaColors: [rock.bottom, ridge.bottom, u.toneOf('#c9d6ea', FAR)]
      };
    },
    palmForest: function (p, u) {
      const far = planes(u, p, '#b9cfb3', FAR, 0.35), near = planes(u, p, '#a7c2a0', NEAR, 0);
      return {
        /* canopy overhead, trees on the ground - both belong to this theme and
         * to no other, so the audit is still satisfied. */
        motifs: ['canopy', 'broadleaf'],
        hero: { svg: softGlow(u.toneOf('#b9cfb3', HAZE), 0.9, 92), size: '150% 70%', position: 'center bottom' },
        far: { svg: canopyBand(far.top, far.bottom, 0.75), tile: 1680, height: '22vh', seconds: 300, y: '0%', blur: 4 },
        near: { svg: broadleafBand(near.top, near.bottom, 0.95, 0.9), tile: 1700, height: '26vh', seconds: 170 },
        areaColors: [far.bottom, near.bottom]
      };
    },
    hawaiiOcean: function (p, u) {
      const sand = planes(u, p, '#e0cba4', NEAR, 0), palm = u.toneOf('#9fc4b2', NEAR);
      const wave = u.toneOf('#a8cfdd', FAR), isle = planes(u, p, '#9fb9c4', FAR, 0.25), id = 'ocn';
      return {
        motifs: ['shoreline', 'palms', 'headland'],
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
        far: { svg: islandBand(isle.top, isle.bottom, 0.85), tile: 1600, height: '16vh', seconds: 310, y: '54%', blur: 3 },
        near: { svg: palmBand(palm, 0.95), tile: 1700, height: '26vh', seconds: 195 },
        areaColors: [sand.bottom, wave, palm, isle.bottom]
      };
    },
    hawaiiMorning: function (p, u) {
      const water = planes(u, p, '#d3b89c', NEAR, 0), sky = u.toneOf('#f0c9a4', FAR), id = 'mrn';
      return {
        motifs: ['sunrise', 'birds', 'ripples'],
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
        far: { svg: birdBand(u.toneOf('#b08a6a', FAR), 0.85), tile: 1560, height: '26vh', seconds: 300, y: '14%' },
        near: { svg: rippleBand(u.toneOf('#c9a888', NEAR), 0.8), tile: 1600, height: '22vh', seconds: 185, y: '82%' },
        areaColors: [water.bottom, sky, u.toneOf('#c9a888', NEAR), u.toneOf('#b08a6a', FAR)]
      };
    },
    cherryBlossom: function (p, u) {
      const bark = u.toneOf('#c39aa8', NEAR), bloom = u.toneOf('#e8b9c9', FAR);
      const drift = u.toneOf('#e3aec1', NEAR), soft = u.toneOf('#eec8d5', HAZE);
      return {
        motifs: ['branch', 'petals'],
        hero: { svg: branch(bark, bloom), size: '112% auto', position: 'center top' },
        far: { svg: petals(soft, 0.9, 26, 1), tile: 1520, height: '34vh', seconds: 320, y: '18%', blur: 2 },
        near: { svg: petals(drift, 0.85, 18, 5), tile: 1520, height: '26vh', seconds: 190, y: '46%' },
        areaColors: [bark, bloom, drift, soft]
      };
    }
  };

  /* The engine composites grain and vignette itself, so it needs the two
   * helpers that are not part of any single scene. */
  root.NWT_ATMOS = { grainTile: grainTile, vignette: vignette };
  root.NWT_SCENES = SCENES;
})(typeof self !== 'undefined' ? self : this);
