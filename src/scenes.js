/* ============================================================================
 * Pineapple NextWork Theme Studio Mod - scenery
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
'use strict';

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

  /* ---- drifting motifs -------------------------------------------------
   * One per theme, and each is the thing that belongs in that picture rather
   * than an abstract speck: gulls over the beaches, petals over the blossom,
   * ships over the space scene, tetrominoes over the arcade.
   *
   * These cover the whole viewport, not a band along the bottom. That is only
   * safe because they are sparse. A solid band across the reading column would
   * put a repeating pattern behind every paragraph, which is what the height
   * cap in the audit exists to prevent; a dozen small shapes at low opacity do
   * not, and the audit measures the ink coverage instead.
   *
   * The engine pans a band sideways, so nothing here is drawn as something
   * that ought to fall. Everything is either flying, floating, or far enough
   * away that sideways travel reads as its own motion.
   *
   * Positions come from a seeded generator so every build produces the same
   * file and the exported assets do not churn.
   */

  function scatter(count, w, h, seed) {
    var out = [], i, a = seed * 2654435761 % 2147483647, b = seed * 40503 % 2147483647;
    for (i = 0; i < count; i++) {
      a = (a * 1103515245 + 12345) % 2147483648;
      b = (b * 1103515245 + 12345) % 2147483648;
      out.push([a % w, b % h, ((a >> 9) % 1000) / 1000]);
    }
    return out;
  }

  /* Every motif band is this size. Wide enough that one pass takes a while,
   * tall enough to cover a viewport. */
  var MOTIF_W = 2400, MOTIF_H = 1400;

  function motifBand(body, color, opacity) {
    return svg(MOTIF_W, MOTIF_H,
      "<g fill='" + color + "' stroke='" + color + "' opacity='" + opacity + "'>" +
      body + "</g>");
  }

  /* A gull: two shallow arcs meeting. Reads as a bird at any size. */
  function gulls(color, opacity, seed) {
    var pts = scatter(16, MOTIF_W, MOTIF_H, seed), out = '', i;
    for (i = 0; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1], s = 9 + pts[i][2] * 13;
      out += "<path d='M" + (x - s) + " " + y + " q" + (s * 0.5) + " -" + (s * 0.62) + " " +
             s + " 0 q" + (s * 0.5) + " -" + (s * 0.62) + " " + s + " 0' fill='none'" +
             " stroke-width='" + (1.5 + pts[i][2] * 1.3).toFixed(1) +
             "' stroke-linecap='round'/>";
    }
    return motifBand(out, color, opacity);
  }

  /* A five-lobed blossom, tilted. */
  function petals(color, opacity, seed) {
    var pts = scatter(16, MOTIF_W, MOTIF_H, seed), out = '', i;
    for (i = 0; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1], s = 5 + pts[i][2] * 7;
      out += "<path d='M" + x + " " + y + " q" + s + " -" + (s * 1.25) + " " + (s * 2) +
             " 0 q-" + s + " " + (s * 1.45) + " -" + (s * 2) + " 0 z' stroke='none'" +
             " transform='rotate(" + Math.round(pts[i][2] * 300 - 150) + " " + x + " " + y + ")'/>";
    }
    return motifBand(out, color, opacity);
  }

  /* A firework: rays out of a centre, some with a spark on the end. */
  function fireworks(color, opacity, seed) {
    var pts = scatter(6, MOTIF_W, MOTIF_H, seed), out = '', i, k;
    for (i = 0; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1], s = 26 + pts[i][2] * 34;
      for (k = 0; k < 10; k++) {
        var a = (k / 10) * Math.PI * 2 + pts[i][2];
        var dx = Math.cos(a) * s, dy = Math.sin(a) * s;
        out += "<path d='M" + (x + dx * 0.28).toFixed(1) + " " + (y + dy * 0.28).toFixed(1) +
               " L" + (x + dx).toFixed(1) + " " + (y + dy).toFixed(1) +
               "' fill='none' stroke-width='1.4' stroke-linecap='round'/>";
        if (k % 2 === 0) {
          out += "<circle cx='" + (x + dx).toFixed(1) + "' cy='" + (y + dy).toFixed(1) +
                 "' r='1.8' stroke='none'/>";
        }
      }
    }
    return motifBand(out, color, opacity);
  }

  /* Tetrominoes, outlined rather than filled so they read as silhouettes. */
  function tetrominoes(color, opacity, seed) {
    var pts = scatter(13, MOTIF_W, MOTIF_H, seed), out = '', i;
    var shapes = [[[0,0],[1,0],[2,0],[2,1]], [[0,0],[0,1],[1,1],[2,1]],
                  [[0,0],[1,0],[1,1],[2,1]], [[0,0],[1,0],[0,1],[1,1]],
                  [[0,0],[1,0],[2,0],[1,1]]];
    for (i = 0; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1], u = 8 + pts[i][2] * 8;
      var sh = shapes[i % shapes.length], k;
      for (k = 0; k < sh.length; k++) {
        out += "<rect x='" + (x + sh[k][0] * u).toFixed(1) + "' y='" +
               (y + sh[k][1] * u).toFixed(1) + "' width='" + u.toFixed(1) + "' height='" +
               u.toFixed(1) + "' rx='1.5' fill='none' stroke-width='1.6'/>";
      }
    }
    return motifBand(out, color, opacity);
  }

  /* A leaf with a midrib. */
  function leaves(color, opacity, seed) {
    var pts = scatter(12, MOTIF_W, MOTIF_H, seed), out = '', i;
    for (i = 0; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1], s = 8 + pts[i][2] * 10;
      var rot = Math.round(pts[i][2] * 200 - 100);
      out += "<g transform='rotate(" + rot + " " + x + " " + y + ")'>";
      out += "<path d='M" + x + " " + y + " q" + s + " -" + (s * 0.85) + " " + (s * 2.1) +
             " 0 q-" + s + " " + (s * 0.85) + " -" + (s * 2.1) + " 0 z' stroke='none'/>";
      out += "<path d='M" + x + " " + y + " l" + (s * 2.1).toFixed(1) + " 0' fill='none'" +
             " stroke-width='0.9' opacity='0.5'/></g>";
    }
    return motifBand(out, color, opacity);
  }

  /* Slow soft clouds. The quietest of these, for scenes already busy. */
  function clouds(color, opacity, seed) {
    var pts = scatter(7, MOTIF_W, MOTIF_H, seed), out = '', i, id = uid();
    for (i = 0; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1], s = 90 + pts[i][2] * 150;
      out += "<ellipse cx='" + x + "' cy='" + y + "' rx='" + s.toFixed(0) + "' ry='" +
             (s * 0.30).toFixed(0) + "' fill='url(#" + id + ")' stroke='none'/>";
    }
    return svg(MOTIF_W, MOTIF_H,
      "<defs><radialGradient id='" + id + "'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs>" + out);
  }

  /* Soft points of light. For rooms rather than skies. */
  function glowMotes(color, opacity, seed, count, scale) {
    var pts = scatter(count || 14, MOTIF_W, MOTIF_H, seed), out = '', i, id = uid();
    for (i = 0; i < pts.length; i++) {
      out += "<circle cx='" + pts[i][0] + "' cy='" + pts[i][1] + "' r='" +
             ((3 + pts[i][2] * 5) * (scale || 1)).toFixed(1) +
             "' fill='url(#" + id + ")'/>";
    }
    return svg(MOTIF_W, MOTIF_H,
      "<defs><radialGradient id='" + id + "'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='45%' stop-color='" + color + "' stop-opacity='" +
      (opacity * 0.35).toFixed(3) + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs>" + out);
  }

  /* A rising curl of smoke. */
  /* Smoke as a body rather than a line.
   *
   * The version this replaces drew six curved strokes at 1.8px, which does
   * not read as vapour at all - it reads as loose thread lying on top of the
   * page. Smoke has no outline; it is a soft mass with no edge. So this is
   * overlapping blurred ellipses instead, each paired with a smaller offset
   * one so a puff is never a plain oval.
   *
   * Radii stay under a sixth of the tile, which is the cap a sparse layer has
   * to keep so nothing large enough to sit behind a paragraph gets drawn. */
  function fog(color, opacity, seed) {
    var pts = scatter(9, MOTIF_W, MOTIF_H, seed), out = '', i, id = uid();
    for (i = 0; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1], s = 90 + pts[i][2] * 90;
      out += "<ellipse cx='" + x + "' cy='" + y + "' rx='" + s.toFixed(1) +
             "' ry='" + (s * 0.54).toFixed(1) + "' opacity='" +
             (0.34 + (i % 3) * 0.15).toFixed(2) + "'/>";
      out += "<ellipse cx='" + (x + s * 0.52).toFixed(1) + "' cy='" +
             (y - s * 0.26).toFixed(1) + "' rx='" + (s * 0.62).toFixed(1) +
             "' ry='" + (s * 0.38).toFixed(1) + "' opacity='" +
             (0.22 + (i % 4) * 0.11).toFixed(2) + "'/>";
    }
    return svg(MOTIF_W, MOTIF_H,
      "<defs><filter id='" + id + "' x='-30%' y='-30%' width='160%' height='160%'>" +
      "<feGaussianBlur stdDeviation='34'/></filter></defs>" +
      "<g fill='" + color + "' filter='url(#" + id + ")' opacity='" + opacity + "'>" +
      out + "</g>");
  }

  /* Stars: small, crisp and unevenly bright, which is what separates a night
   * sky from a scattering of identical dots. */
  function stars(color, opacity, seed) {
    var pts = scatter(54, MOTIF_W, MOTIF_H, seed), out = '', i, id = uid();
    for (i = 0; i < pts.length; i++) {
      var r = 1.1 + pts[i][2] * 2.6;
      out += "<circle cx='" + pts[i][0] + "' cy='" + pts[i][1] + "' r='" + r.toFixed(1) +
             "' fill='url(#" + id + ")' opacity='" + (0.4 + (i % 5) * 0.15).toFixed(2) + "'/>";
    }
    return svg(MOTIF_W, MOTIF_H,
      "<defs><radialGradient id='" + id + "'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='40%' stop-color='" + color + "' stop-opacity='" +
      (opacity * 0.7).toFixed(3) + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs>" + out);
  }

  /* Seed heads on a stalk. */
  function seeds(color, opacity, seed) {
    var pts = scatter(13, MOTIF_W, MOTIF_H, seed), out = '', i, k;
    for (i = 0; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1], s = 7 + pts[i][2] * 7;
      for (k = 0; k < 6; k++) {
        var a = (k / 6) * Math.PI * 2;
        out += "<path d='M" + x + " " + y + " l" + (Math.cos(a) * s).toFixed(1) + " " +
               (Math.sin(a) * s).toFixed(1) + "' fill='none' stroke-width='0.9'/>";
      }
      out += "<circle cx='" + x + "' cy='" + y + "' r='1.6' stroke='none'/>";
    }
    return motifBand(out, color, opacity);
  }

  /* Fine specks, denser than the rest. Snow and ash. */
  function specks(color, opacity, seed, count) {
    var pts = scatter(count || 34, MOTIF_W, MOTIF_H, seed), out = '', i, id = uid();
    for (i = 0; i < pts.length; i++) {
      out += "<circle cx='" + pts[i][0] + "' cy='" + pts[i][1] + "' r='" +
             (1.6 + pts[i][2] * 2.4).toFixed(1) + "' fill='url(#" + id + ")'/>";
    }
    return svg(MOTIF_W, MOTIF_H,
      "<defs><radialGradient id='" + id + "'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs>" + out);
  }

  /* A drifting fleet: hulls of a few different builds, plus the odd running
   * light in a second colour so it is not one flat silhouette. */
  function fleet(color, accent, opacity, seed, count, scale) {
    var pts = scatter(count || 13, MOTIF_W, MOTIF_H, seed), out = '', i;
    var k = scale || 1;
    for (i = 0; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1], s = (11 + pts[i][2] * 15) * k, kind = i % 3;
      if (kind === 0) {
        /* a wedge */
        out += "<path d='M" + x + " " + y + " l" + (s * 2.3).toFixed(1) + " -" +
               (s * 0.4).toFixed(1) + " l0 " + (s * 0.8).toFixed(1) + " z'/>";
      } else if (kind === 1) {
        /* a saucer */
        out += "<ellipse cx='" + x + "' cy='" + y + "' rx='" + (s * 1.4).toFixed(1) +
               "' ry='" + (s * 0.42).toFixed(1) + "'/>";
        out += "<ellipse cx='" + x + "' cy='" + (y - s * 0.28).toFixed(1) + "' rx='" +
               (s * 0.62).toFixed(1) + "' ry='" + (s * 0.34).toFixed(1) + "'/>";
      } else {
        /* a hauler: a long hull with a fin */
        out += "<rect x='" + x + "' y='" + y + "' width='" + (s * 2.1).toFixed(1) +
               "' height='" + (s * 0.5).toFixed(1) + "' rx='" + (s * 0.22).toFixed(1) + "'/>";
        out += "<path d='M" + (x + s * 1.3).toFixed(1) + " " + y + " l" + (s * 0.5).toFixed(1) +
               " -" + (s * 0.7).toFixed(1) + " l" + (s * 0.3).toFixed(1) + " " +
               (s * 0.7).toFixed(1) + " z'/>";
      }
      if (i % 2 === 0) {
        out += "<circle cx='" + (x - s * 0.3).toFixed(1) + "' cy='" + (y + s * 0.2).toFixed(1) +
               "' r='" + (s * 0.16).toFixed(1) + "' fill='" + accent + "' stroke='none'/>";
      }
    }
    return svg(MOTIF_W, MOTIF_H,
      "<g fill='" + color + "' stroke='none' opacity='" + opacity + "'>" + out + "</g>");
  }

  /* Soft cloud shapes, each built from a few overlapping lobes so no two are
   * the same silhouette. */
  function cloudPuffs(color, opacity, seed) {
    var pts = scatter(10, MOTIF_W, MOTIF_H, seed), out = '', i, k, id = uid();
    for (i = 0; i < pts.length; i++) {
      var x = pts[i][0], y = pts[i][1], s = 52 + pts[i][2] * 78, lobes = 3 + (i % 3);
      for (k = 0; k < lobes; k++) {
        var off = (k - (lobes - 1) / 2) * s * 0.62;
        var lift = (k % 2 === 0 ? 0 : -s * 0.2) + ((i + k) % 3) * s * 0.06;
        out += "<ellipse cx='" + (x + off).toFixed(1) + "' cy='" + (y + lift).toFixed(1) +
               "' rx='" + (s * (0.55 + ((i + k) % 4) * 0.11)).toFixed(1) + "' ry='" +
               (s * 0.3).toFixed(1) + "' fill='url(#" + id + ")'/>";
      }
    }
    return svg(MOTIF_W, MOTIF_H,
      "<defs><radialGradient id='" + id + "'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs>" + out);
  }

  /* Plain points of light, no tails. */
  function driftingDots(color, opacity, seed) {
    var pts = scatter(30, MOTIF_W, MOTIF_H, seed), out = '', i, id = uid();
    for (i = 0; i < pts.length; i++) {
      out += "<circle cx='" + pts[i][0] + "' cy='" + pts[i][1] + "' r='" +
             (1.8 + pts[i][2] * 3.4).toFixed(1) + "' fill='url(#" + id + ")'/>";
    }
    return svg(MOTIF_W, MOTIF_H,
      "<defs><radialGradient id='" + id + "'>" +
      "<stop offset='0%' stop-color='" + color + "' stop-opacity='" + opacity + "'/>" +
      "<stop offset='55%' stop-color='" + color + "' stop-opacity='" +
      (opacity * 0.45).toFixed(3) + "'/>" +
      "<stop offset='100%' stop-color='" + color + "' stop-opacity='0'/>" +
      "</radialGradient></defs>" + out);
  }

  /* Every theme has a painted wallpaper as its fixed backdrop, and one
   * drifting band carries the motion over the top - fog, stars, petals or
   * whatever suits the picture. The wallpaper does not move, so without that
   * band it reads as a desktop background someone pasted behind the text.
   *
   * `motifs` used to name the silhouette a generated scene drew, and existed so
   * no two scenes could reuse one. Each theme now has its own photograph, so
   * the subject is distinct by construction and the entry simply names the
   * theme. The audit still checks the list is exclusive, which now amounts to
   * checking no two themes point at the same wallpaper.
   *
   * The drift speeds are staggered on purpose. Eighteen bands sharing one
   * period made the whole set feel like a single animation reused.
   */
  /* Each theme picks the drift that suits its picture rather than all of them
   * sharing one. Blossom themes get petals, forests get leaves, the fire-lit
   * rooms get embers, night skies get stars, the retro one gets falling
   * blocks, and the cold scenes get fine snow. Speeds are staggered so no two
   * themes animate in step.
   *
   * `motifs` used to name the silhouette a generated scene drew. Each theme now
   * has its own picture, so it names the theme, and the exclusivity check
   * amounts to making sure no two point at the same wallpaper.
   */
  /* Each theme gets its own drift, matched to what is in its picture. No two
   * share one, which is the point: eighteen different pictures with the same
   * dust over them wastes the difference.
   *
   * `motifs` names the theme, since each now has its own photograph and the
   * exclusivity check amounts to making sure no two point at the same one.
   */
  /* Each theme drifts the thing that belongs in its picture. Gulls over the
   * beaches, petals over the blossom, ships over the space scene, tetrominoes
   * over the arcade, comets over the star field, smoke over the fire-lit
   * rooms.
   *
   * The motif layer covers the whole viewport rather than a strip along the
   * bottom, which is only safe because it is sparse: a dozen small shapes at
   * low opacity, not a repeating pattern behind every paragraph. The audit
   * measures the ink coverage instead of capping the height.
   */
  const SCENES = {

    concrete: function (p, u) {
      const drift = u.toneOf('#9fb4c4', 4.8);
      return {
        motifs: ['concrete'],
        hero: { wallpaper: 'concrete', size: '100% auto', position: 'center bottom' },
        near: { svg: glowMotes(drift, 0.85, 41), tile: 2400, height: '100vh', seconds: 570, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    graphite: function (p, u) {
      const drift = u.toneOf('#a8b0b4', 4.8);
      return {
        motifs: ['graphite'],
        hero: { wallpaper: 'graphite', size: '100% auto', position: 'center bottom' },
        near: { svg: specks(drift, 0.80, 73, 30), tile: 2400, height: '100vh', seconds: 509, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    slate: function (p, u) {
      const drift = u.toneOf('#b6c6da', 4.8);
      return {
        motifs: ['slate'],
        hero: { wallpaper: 'slate', size: '100% auto', position: 'center bottom' },
        near: { svg: specks(drift, 0.85, 97, 40), tile: 2400, height: '100vh', seconds: 611, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    carbon: function (p, u) {
      const drift = u.toneOf('#f4f7fb', 4.8);
      return {
        motifs: ['carbon'],
        hero: { wallpaper: 'carbon', size: '100% auto', position: 'center bottom' },
        near: { svg: driftingDots(drift, 0.8, 131), tile: 2400, height: '100vh', seconds: 539, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    fog: function (p, u) {
      const drift = u.toneOf('#c2ccd0', 4.8);
      return {
        motifs: ['fog'],
        hero: { wallpaper: 'fog', size: '100% auto', position: 'center bottom' },
        near: { svg: clouds(drift, 0.75, 167), tile: 2400, height: '100vh', seconds: 646, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    espresso: function (p, u) {
      const drift = u.toneOf('#d59a5c', 4.8);
      return {
        motifs: ['espresso'],
        hero: { wallpaper: 'espresso', size: '100% auto', position: 'center bottom' },
        /* Steam off a hot cup, as a soft mass. The drawn-line version read as
         * thread on the page rather than as vapour. */
        near: { svg: fog(drift, 0.55, 199), tile: 2400, height: '100vh', seconds: 478, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    tokyoNight: function (p, u) {
      const drift = u.toneOf('#b48ad6', 4.8);
      return {
        motifs: ['tokyoNight'],
        hero: { wallpaper: 'tokyoNight', size: '100% auto', position: 'center bottom' },
        near: { svg: fireworks(drift, 0.75, 233), tile: 2400, height: '100vh', seconds: 589, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    wabiSabi: function (p, u) {
      const drift = u.toneOf('#b8a97e', 4.8);
      return {
        motifs: ['wabiSabi'],
        hero: { wallpaper: 'wabiSabi', size: '100% auto', position: 'center bottom' },
        near: { svg: seeds(drift, 0.77, 271), tile: 2400, height: '100vh', seconds: 562, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    darkJapandi: function (p, u) {
      /* Stars rather than the drawn smoke this used to carry, and blue
       * rather than the warm tone the rest of the theme runs on, so they read
       * as night sky through the window instead of as more of the room. */
      const drift = u.toneOf('#8fb6e8', 4.8);
      return {
        motifs: ['darkJapandi'],
        hero: { wallpaper: 'darkJapandi', size: '100% auto', position: 'center bottom' },
        near: { svg: stars(drift, 0.85, 307), tile: 2400, height: '100vh', seconds: 627, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    zenLobby: function (p, u) {
      const drift = u.toneOf('#d8ae7c', 4.8);
      return {
        motifs: ['zenLobby'],
        hero: { wallpaper: 'zenLobby', size: '100% auto', position: 'center bottom' },
        near: { svg: glowMotes(drift, 0.85, 347, 10, 1.9), tile: 2400, height: '100vh', seconds: 501, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    concreteBlossom: function (p, u) {
      const drift = u.toneOf('#d8b8bd', 4.8);
      return {
        motifs: ['concreteBlossom'],
        hero: { wallpaper: 'concreteBlossom', size: '100% auto', position: 'center bottom' },
        near: { svg: petals(drift, 0.80, 383), tile: 2400, height: '100vh', seconds: 600, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    galactica: function (p, u) {
      /* Black hulls, so the ships read as silhouettes against the nebula
       * rather than as pale shapes floating in front of it. Smaller and twice
       * as many, which turns a handful of large craft into a fleet. */
      const drift = u.mix('#000000', p.canvas, 0.12);
      return {
        motifs: ['galactica'],
        hero: { wallpaper: 'galactica', size: '100% auto', position: 'center bottom' },
        near: { svg: fleet(drift, u.toneOf('#e2a24a', 4.8), 0.85, 419, 26, 0.6), tile: 2400, height: '100vh', seconds: 547, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    tetris: function (p, u) {
      const drift = u.toneOf('#9fd4e4', 4.8);
      return {
        motifs: ['tetris'],
        hero: { wallpaper: 'tetris', size: '100% auto', position: 'center bottom' },
        near: { svg: tetrominoes(drift, 0.80, 457), tile: 2400, height: '100vh', seconds: 653, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    hawaiiOcean: function (p, u) {
      const drift = u.toneOf('#7fb6c8', 4.8);
      return {
        motifs: ['hawaiiOcean'],
        hero: { wallpaper: 'hawaiiOcean', size: '100% auto', position: 'center bottom' },
        near: { svg: gulls(drift, 0.85, 491), tile: 2400, height: '100vh', seconds: 516, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    palmForest: function (p, u) {
      const drift = u.toneOf('#7fa383', 4.8);
      return {
        motifs: ['palmForest'],
        hero: { wallpaper: 'palmForest', size: '100% auto', position: 'center bottom' },
        near: { svg: leaves(drift, 0.77, 541), tile: 2400, height: '100vh', seconds: 577, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    hawaiiMorning: function (p, u) {
      const drift = u.toneOf('#d9a684', 4.8);
      return {
        motifs: ['hawaiiMorning'],
        hero: { wallpaper: 'hawaiiMorning', size: '100% auto', position: 'center bottom' },
        near: { svg: gulls(drift, 0.85, 577), tile: 2400, height: '100vh', seconds: 638, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    mountFuji: function (p, u) {
      const drift = u.mix(u.toneOf('#eef2f8', 4.8), '#ffffff', 0.45);
      return {
        motifs: ['mountFuji'],
        hero: { wallpaper: 'mountFuji', size: '100% auto', position: 'center bottom' },
        near: { svg: cloudPuffs(drift, 0.6, 613), tile: 2400, height: '100vh', seconds: 490, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    },

    cherryBlossom: function (p, u) {
      const drift = u.toneOf('#e0a8b8', 4.8);
      return {
        motifs: ['cherryBlossom'],
        hero: { wallpaper: 'cherryBlossom', size: '100% auto', position: 'center bottom' },
        near: { svg: petals(drift, 0.83, 647), tile: 2400, height: '100vh', seconds: 615, sparse: true },
        areaColors: [],
        sparseColors: [drift]
      };
    }

  };

  /* The engine composites grain and vignette itself, so it needs the two
   * helpers that are not part of any single scene. */
  root.NWT_ATMOS = { grainTile: grainTile, vignette: vignette };
  /* Every scene is wrapped so the SVG id counter restarts before it runs.
   *
   * Without this, resolving the same scene twice produced different id="nN"
   * values, so two buildCSS calls with identical settings returned different
   * bytes. The content script only rewrites its <style> element when the CSS
   * has changed, and that check could therefore never pass: every storage
   * write - every dial drag, every focus timer update - swapped a 70 KB
   * stylesheet and forced the page to restyle from scratch.
   *
   * It also meant assets/ churned on every export for no reason. */
  Object.keys(SCENES).forEach(function (id) {
    const build = SCENES[id];
    if (typeof build !== 'function') return;
    SCENES[id] = function (p, u) {
      UID = 0;
      return build(p, u);
    };
  });

  root.NWT_SCENES = SCENES;
})(typeof self !== 'undefined' ? self : this);
