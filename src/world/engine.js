/* NextWorld · engine: the isometric canvas
 * Part of the NextWorld feature. Plain script, no modules, so the same file
 * runs in the extension page and in the bundled concept demo. */
'use strict';
(function () {
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = t => { t = clamp(t, 0, 1); return 1 - Math.pow(1 - t, 3); };
  function hex(h) { const n = parseInt(h.slice(1), 16); return [n >> 16 & 255, n >> 8 & 255, n & 255]; }
  function rgb(c, a) { return 'rgba(' + c[0] + ',' + c[1] + ',' + c[2] + ',' + (a == null ? 1 : a) + ')'; }
  function shade(h, k) { const c = hex(h).map(v => Math.round(k > 0 ? v + (255 - v) * k : v * (1 + k))); return rgb(c); }

  const TW = 48, TH = 24;
  function makeIso(canvas, W, H, scale) {
    const ctx = canvas.getContext('2d');
    const S = scale || 1;
    ctx.setTransform(2 * S, 0, 0, 2 * S, 0, 0);
    const cam = { x: 0, y: 0 };
    const p = (gx, gy, z) => [W / 2 + (gx - gy) * TW / 2 - cam.x, 60 + (gx + gy) * TH / 2 - (z || 0) - cam.y];
    const P = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
    const up = (q, h) => [q[0], q[1] - h];
    const onScreen = (gx, gy) => { const q = p(gx, gy); return q[0] > -80 && q[0] < W + 80 && q[1] > -160 && q[1] < H + 60; };
    function poly(pts, fill, stroke, lw) { ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); if (fill) { ctx.fillStyle = fill; ctx.fill(); } if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.stroke(); } }
    function line(a, b, stroke, lw) { ctx.strokeStyle = stroke; ctx.lineWidth = lw || 1; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    function tile(gx, gy, fill, stroke) { poly([p(gx, gy), p(gx + 1, gy), p(gx + 1, gy + 1), p(gx, gy + 1)], fill, stroke); }
    function roundRect(x, y, w, h, r, fill) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); }
    function blob(x, y, r, colour, squash) { const g = ctx.createRadialGradient(x - r * 0.35, y - r * 0.4, r * 0.1, x, y, r); g.addColorStop(0, shade(colour, 0.35)); g.addColorStop(0.7, colour); g.addColorStop(1, shade(colour, -0.35)); ctx.beginPath(); ctx.ellipse(x, y, r, r * (squash || 1), 0, 0, Math.PI * 2); ctx.fillStyle = g; ctx.fill(); }
    function shadow(gx, gy, w, d, h) { const s = Math.min(0.6, 0.15 + h / 100); poly([p(gx + 0.1, gy + 0.1), p(gx + w + s, gy + 0.1), p(gx + w + s, gy + d + s), p(gx + 0.1, gy + d + s)], 'rgba(20,40,30,.26)'); }
    function faceTex(A, B, h, kind, colour) {
      ctx.save(); ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(B[0], B[1] - h); ctx.lineTo(A[0], A[1] - h); ctx.closePath(); ctx.clip();
      const len = Math.hypot(B[0] - A[0], B[1] - A[1]);
      if (kind === 'brick') { for (let v = 4; v < h; v += 5) { line(up(A, v), up(B, v), shade(colour, -0.18), 1); const off = (Math.floor(v / 5) % 2) * 4.5; for (let u = off; u < len; u += 9) { const q = P(A, B, u / len); line(up(q, v), up(q, v + 5), shade(colour, -0.18), 1); } } }
      else if (kind === 'siding') { for (let v = 3; v < h; v += 4) line(up(A, v), up(B, v), shade(colour, -0.14), 1); }
      else if (kind === 'ribbed') { for (let u = 3; u < len; u += 5) { const q = P(A, B, u / len); line(q, up(q, h), shade(colour, -0.16), 1); } }
      else if (kind === 'glass') { const g = ctx.createLinearGradient(A[0], A[1] - h, B[0], B[1]); g.addColorStop(0, 'rgba(255,255,255,.35)'); g.addColorStop(0.5, 'rgba(255,255,255,.05)'); g.addColorStop(1, 'rgba(255,255,255,.25)'); ctx.fillStyle = g; ctx.fillRect(Math.min(A[0], B[0]) - 2, Math.min(A[1], B[1]) - h - 2, Math.abs(B[0] - A[0]) + 4, h + Math.abs(B[1] - A[1]) + 4); for (let v = 9; v < h; v += 9) line(up(A, v), up(B, v), 'rgba(20,40,70,.35)', 1); for (let u = 8; u < len; u += 8) { const q = P(A, B, u / len); line(q, up(q, h), 'rgba(20,40,70,.3)', 1); } }
      else if (kind === 'stone') { for (let v = 6; v < h; v += 7) { line(up(A, v), up(B, v), shade(colour, -0.2), 1); const off = (Math.floor(v / 7) % 2) * 6; for (let u = off; u < len; u += 12) { const q = P(A, B, u / len); line(up(q, v), up(q, v + 7), shade(colour, -0.2), 1); } } }
      ctx.restore();
    }
    function box(gx, gy, w, d, h, colour, z, o) {
      o = o || {}; z = z || 0;
      const A = p(gx, gy, z), B = p(gx + w, gy, z), C = p(gx + w, gy + d, z), D = p(gx, gy + d, z);
      const A2 = up(A, h), B2 = up(B, h), C2 = up(C, h), D2 = up(D, h);
      if (!o.noShadow) shadow(gx, gy, w, d, h + z);
      poly([D, C, C2, D2], shade(colour, -0.04)); poly([C, B, B2, C2], shade(colour, -0.34));
      if (o.tex) { faceTex(D, C, h, o.tex, colour); faceTex(C, B, h, o.tex, shade(colour, -0.3)); }
      poly([A2, B2, C2, D2], shade(colour, o.top == null ? 0.2 : o.top));
      line(D2, C2, 'rgba(255,255,255,.4)'); line(C2, B2, 'rgba(255,255,255,.25)'); line(D, C, 'rgba(0,0,0,.18)'); line(C, B, 'rgba(0,0,0,.25)'); line(C, C2, 'rgba(0,0,0,.12)');
      return { A, B, C, D, A2, B2, C2, D2, h };
    }
    function roof(gx, gy, w, d, base, h, colour, over) {
      over = over == null ? 0.14 : over;
      const A = p(gx - over, gy - over, base), B = p(gx + w + over, gy - over, base), C = p(gx + w + over, gy + d + over, base), D = p(gx - over, gy + d + over, base);
      const cx = (A[0] + C[0]) / 2, cy = (A[1] + C[1]) / 2 - h; const rl = Math.max(0, (Math.max(w, d) - Math.min(w, d))) * 0.55;
      let R1, R2; if (w >= d) { R1 = [cx - rl * TW / 4, cy + rl * TH / 4]; R2 = [cx + rl * TW / 4, cy - rl * TH / 4]; } else { R1 = [cx - rl * TW / 4, cy - rl * TH / 4]; R2 = [cx + rl * TW / 4, cy + rl * TH / 4]; }
      poly([D, C, [C[0], C[1] + 3], [D[0], D[1] + 3]], shade(colour, -0.45)); poly([C, B, [B[0], B[1] + 3], [C[0], C[1] + 3]], shade(colour, -0.55));
      poly([A, B, R2, R1], shade(colour, 0.15)); poly([B, C, R2], shade(colour, -0.3)); poly([A, D, R1], shade(colour, 0.02)); poly([D, C, R2, R1], shade(colour, -0.08));
      for (let t = 0.2; t < 1; t += 0.2) { line(P(D, R1, t), P(C, R2, t), shade(colour, -0.28), 1); line(P(C, R2, t), P(B, R2, t), shade(colour, -0.45), 1); }
      line(R1, R2, shade(colour, 0.35), 2); line(D, C, 'rgba(0,0,0,.3)'); line(C, B, 'rgba(0,0,0,.35)');
    }
    function flatRoof(gx, gy, w, d, base, colour) { const b = box(gx - 0.05, gy - 0.05, w + 0.1, d + 0.1, 4, colour, base, { noShadow: true, top: 0.05 }); line(b.D2, b.C2, 'rgba(255,255,255,.5)'); return b; }
    function win(A, B, u, v, uw, vh, lit) {
      const a = up(P(A, B, u), v), b = up(P(A, B, u + uw), v); poly([a, b, up(b, vh), up(a, vh)], '#f4f1e8');
      const ia = P(a, b, 0.1), ib = P(a, b, 0.9); const g = ctx.createLinearGradient(ia[0], ia[1] - vh, ib[0], ib[1]); g.addColorStop(0, lit ? '#fff0b8' : '#dff1ff'); g.addColorStop(1, lit ? '#ffcf6b' : '#7fb7e6');
      poly([up(ia, 1.5), up(ib, 1.5), up(ib, vh - 1.5), up(ia, vh - 1.5)], g); line(up(P(a, b, 0.5), 1.5), up(P(a, b, 0.5), vh - 1.5), 'rgba(255,255,255,.7)', 1); line([a[0] - 1, a[1] + 1], [b[0] + 1, b[1] + 1], '#d9d4c4', 2);
      if (lit) { ctx.fillStyle = 'rgba(255,220,120,.18)'; ctx.beginPath(); ctx.ellipse((a[0] + b[0]) / 2, a[1] - vh / 2, vh * 0.9, vh * 0.7, 0, 0, Math.PI * 2); ctx.fill(); }
    }
    function door(A, B, u, uw, vh, colour) {
      const a = P(A, B, u), b = P(A, B, u + uw); poly([[a[0], a[1] + 2], [b[0], b[1] + 2], [b[0] + 3, b[1] + 4], [a[0] - 3, a[1] + 4]], '#cfc6b3');
      poly([a, b, up(b, vh), up(a, vh)], '#f4f1e8'); poly([P(a, b, 0.1), P(a, b, 0.9), up(P(a, b, 0.9), vh - 1.5), up(P(a, b, 0.1), vh - 1.5)], colour || '#8b4a2b');
      const k = up(P(a, b, 0.75), vh * 0.5); blob(k[0], k[1], 1.2, '#ffd54a'); const w1 = up(P(a, b, 0.25), vh * 0.78); ctx.fillStyle = '#dff1ff'; ctx.fillRect(w1[0] - 1.5, w1[1] - 2, 3, 3);
    }
    function chimney(gx, gy, base, colour) { const b = box(gx, gy, 0.12, 0.12, 18, colour || '#9c5a3a', base, { noShadow: true, tex: 'brick' }); line(b.D2, b.C2, '#6b3a22', 2); return b; }
    function smoke(x, y, now) { for (let i = 0; i < 3; i++) { const ph = (now / 1800 + i * 0.33) % 1; ctx.fillStyle = 'rgba(235,235,240,' + (0.5 * (1 - ph)) + ')'; ctx.beginPath(); ctx.arc(x + ph * 8, y - ph * 22, 2.5 + ph * 5, 0, Math.PI * 2); ctx.fill(); } }
    function fence(gx0, gy0, gx1, gy1, n) { for (let i = 0; i <= n; i++) { const q = p(lerp(gx0, gx1, i / n), lerp(gy0, gy1, i / n)); ctx.fillStyle = '#e9e4d6'; ctx.fillRect(q[0] - 1, q[1] - 9, 2, 9); } line(up(p(gx0, gy0), 4), up(p(gx1, gy1), 4), '#e9e4d6', 1.5); line(up(p(gx0, gy0), 7), up(p(gx1, gy1), 7), '#e9e4d6', 1.5); }
    function lamp(gx, gy) { const b = p(gx, gy); ctx.fillStyle = 'rgba(20,40,30,.25)'; ctx.beginPath(); ctx.ellipse(b[0] + 2, b[1] + 1, 4, 2, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#3b4252'; ctx.fillRect(b[0] - 1, b[1] - 38, 2, 38); ctx.fillRect(b[0] - 3, b[1] - 1, 6, 2); roundRect(b[0] - 3.5, b[1] - 44, 7, 6, 2, '#3b4252'); ctx.fillStyle = '#ffe9a6'; ctx.fillRect(b[0] - 2, b[1] - 42, 4, 3); ctx.fillStyle = 'rgba(255,225,150,.16)'; ctx.beginPath(); ctx.ellipse(b[0], b[1] - 4, 14, 8, 0, 0, Math.PI * 2); ctx.fill(); }
    function tree(gx, gy, size, tone) { size = size || 1; const b = p(gx + 0.5, gy + 0.5); ctx.fillStyle = 'rgba(20,40,30,.25)'; ctx.beginPath(); ctx.ellipse(b[0] + 7, b[1] + 3, 14 * size, 6 * size, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#7a4b25'; ctx.fillRect(b[0] - 3, b[1] - 20 * size, 6, 20 * size); ctx.fillStyle = '#5a361a'; ctx.fillRect(b[0] + 0.5, b[1] - 20 * size, 2.5, 20 * size); const c = tone || ['#3c9a4a', '#46ad53', '#5cc464']; blob(b[0] + 6, b[1] - 24 * size, 12 * size, c[0]); blob(b[0] - 7, b[1] - 29 * size, 13 * size, c[1]); blob(b[0] + 1, b[1] - 40 * size, 12 * size, c[2]); }
    function bush(gx, gy, flowers) { const b = p(gx + 0.5, gy + 0.5); blob(b[0] - 5, b[1] - 3, 6, '#4fb85a', 0.8); blob(b[0] + 4, b[1] - 2, 5, '#5cc464', 0.8); if (flowers) ['#ff6b8a', '#ffd54a', '#ff8fb1'].forEach((f, i) => blob(b[0] - 6 + i * 5, b[1] - 6 - (i % 2) * 2, 1.6, f)); }
    function bench(gx, gy) { const b = p(gx + 0.5, gy + 0.5); ctx.fillStyle = '#8b5a2b'; ctx.fillRect(b[0] - 8, b[1] - 8, 16, 3); ctx.fillRect(b[0] - 8, b[1] - 13, 16, 2.5); ctx.fillStyle = '#3b4252'; ctx.fillRect(b[0] - 7, b[1] - 5, 2, 5); ctx.fillRect(b[0] + 5, b[1] - 5, 2, 5); }
    function wheel(x, y, r) { ctx.beginPath(); ctx.ellipse(x, y, r, r * 0.55, 0, 0, Math.PI * 2); ctx.fillStyle = '#20242b'; ctx.fill(); ctx.beginPath(); ctx.ellipse(x, y, r * 0.45, r * 0.25, 0, 0, Math.PI * 2); ctx.fillStyle = '#9aa3b0'; ctx.fill(); }
    function person(gx, gy, colour, walkT, hat, tool) {
      const c = p(gx, gy); const bob = Math.sin(walkT * 12) * 0.7;
      ctx.fillStyle = 'rgba(20,40,30,.28)'; ctx.beginPath(); ctx.ellipse(c[0] + 1, c[1] + 0.5, 4.5, 2, 0, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#2b3a5c'; ctx.fillRect(c[0] - 2.4, c[1] - 5.5 + bob, 1.8, 5 + Math.sin(walkT * 12) * 1.2); ctx.fillRect(c[0] + 0.6, c[1] - 5.5 + bob, 1.8, 5 - Math.sin(walkT * 12) * 1.2);
      roundRect(c[0] - 3.5, c[1] - 13 + bob, 7, 8.5, 2.5, colour); blob(c[0], c[1] - 16 + bob, 3.5, '#ffd6ad');
      if (hat) { roundRect(c[0] - 4.2, c[1] - 19.5 + bob, 8.4, 3, 1.2, '#ffc531'); roundRect(c[0] - 3, c[1] - 22 + bob, 6, 3, 2, '#ffc531'); } else { ctx.fillStyle = '#4a2e1a'; ctx.beginPath(); ctx.ellipse(c[0], c[1] - 17.5 + bob, 3.5, 2, 0, Math.PI, 0); ctx.fill(); }
      if (tool === 'hammer') { const sw = Math.sin(walkT * 18); ctx.strokeStyle = '#7a4b25'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(c[0] + 3, c[1] - 10 + bob); ctx.lineTo(c[0] + 8, c[1] - 14 - sw * 4 + bob); ctx.stroke(); ctx.fillStyle = '#5f6b73'; ctx.fillRect(c[0] + 6.5, c[1] - 16.5 - sw * 4 + bob, 4, 3); if (sw > 0.8) for (let i = 0; i < 3; i++) blob(c[0] + 9 + i * 2 - 2, c[1] - 12 + bob - i * 2, 1, '#ffd54a'); }
    }
    function puff(gx, gy, t) { if (t <= 0 || t >= 1) return; const c = p(gx + 0.5, gy + 0.5); for (let i = 0; i < 7; i++) { const a = i / 7 * Math.PI * 2, r = 8 + t * 22; ctx.beginPath(); ctx.arc(c[0] + Math.cos(a) * r, c[1] - 2 + Math.sin(a) * r * 0.5, 6 * (1 - t) + 1, 0, Math.PI * 2); ctx.fillStyle = 'rgba(225,215,190,' + (0.75 * (1 - t)) + ')'; ctx.fill(); } }
    function car(gx, gy, colour, z) { z = z || 0; shadow(gx + 0.2, gy + 0.32, 0.55, 0.3, 4); box(gx + 0.2, gy + 0.32, 0.55, 0.3, 7, colour, 4 + z, { noShadow: true }); const cab = box(gx + 0.34, gy + 0.34, 0.28, 0.26, 7, colour, 11 + z, { noShadow: true }); faceTex(cab.D, cab.C, 7, 'glass', '#2f4f7f'); faceTex(cab.C, cab.B, 7, 'glass', '#2f4f7f'); [[0.27, 0.34], [0.68, 0.34], [0.27, 0.6], [0.68, 0.6]].forEach(o => { const q = p(gx + o[0], gy + o[1], 2 + z); wheel(q[0], q[1], 3); }); const hl = p(gx + 0.2, gy + 0.47, 7 + z); blob(hl[0] + 1, hl[1], 1.2, '#fff4c2'); }
    function truck(gx, gy, load, z) { z = z || 0; shadow(gx + 0.1, gy + 0.3, 0.75, 0.32, 4); box(gx + 0.1, gy + 0.32, 0.75, 0.3, 5, '#5f6b73', 4 + z, { noShadow: true }); const cab = box(gx + 0.12, gy + 0.33, 0.24, 0.28, 13, '#e8552f', 9 + z, { noShadow: true }); faceTex(cab.D, cab.C, 13, 'glass', '#2f4f7f'); if (load) box(gx + 0.42, gy + 0.36, 0.38, 0.22, 9, load, 9 + z, { noShadow: true, tex: 'ribbed' }); [[0.2, 0.34], [0.5, 0.34], [0.78, 0.34], [0.2, 0.6], [0.5, 0.6], [0.78, 0.6]].forEach(o => { const q = p(gx + o[0], gy + o[1], 2 + z); wheel(q[0], q[1], 3); }); }
    function label(gx, gy, text, sub, size) { const q = p(gx, gy), k = 1 / S; ctx.font = '800 ' + (size || 11) * k + 'px Baloo 2, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3 * k; ctx.strokeStyle = 'rgba(16,24,44,.75)'; ctx.strokeText(text, q[0], q[1]); ctx.fillStyle = '#fff'; ctx.fillText(text, q[0], q[1]); if (sub) { ctx.font = '700 ' + 8 * k + 'px Nunito, sans-serif'; ctx.strokeText(sub, q[0], q[1] + 10 * k); ctx.fillStyle = '#ffe9a6'; ctx.fillText(sub, q[0], q[1] + 10 * k); } ctx.textAlign = 'left'; }
    const reset = () => ctx.setTransform(2 * S, 0, 0, 2 * S, 0, 0);
    return { ctx, cam, W, H, S, reset, p, P, up, onScreen, poly, line, tile, box, roof, flatRoof, faceTex, win, door, chimney, smoke, fence, lamp, tree, bush, bench, wheel, person, puff, car, truck, blob, roundRect, shadow, label };
  }

  window.NW = window.NW || {};
  Object.assign(NW, { TW, TH, reduce, clamp, lerp, ease, hex, rgb, shade, makeIso });
})();
