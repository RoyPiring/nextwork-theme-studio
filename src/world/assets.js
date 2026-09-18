/* NextWorld · assets: every building and prop
 * Part of the NextWorld feature. Plain script, no modules, so the same file
 * runs in the extension page and in the bundled concept demo. */
'use strict';
(function () {
  const { ease, clamp, lerp, shade, reduce } = NW;
  const drop = (k, i, n) => { const e = ease(k * n - i); return { z: (1 - e) * -90, on: e > 0 }; };
  function crenel(I, t) { for (let i = 0; i < 3; i++) { const q = I.P(t.D2, t.C2, 0.15 + i * 0.35); I.poly([q, [q[0] + 4, q[1] + 2], [q[0] + 4, q[1] - 3], [q[0], q[1] - 5]], '#a39d93'); } }
  const B = {
    house(I, gx, gy, k, now, tier) {
      const n = 5, storeys = tier >= 3 ? 2 : 1, H = storeys === 2 ? 64 : 34;
      let d = drop(k, 0, n); if (d.on) { I.box(gx + 0.05, gy + 0.05, 0.9, 0.9, 4, '#c9c2b0', 0, { top: 0.1 }); I.poly([I.p(gx + 0.55, gy + 0.95), I.p(gx + 0.7, gy + 0.95), I.p(gx + 0.7, gy + 1.35), I.p(gx + 0.55, gy + 1.35)], '#d8ccae'); }
      d = drop(k, 1, n); if (d.on) { const b = I.box(gx + 0.12, gy + 0.12, 0.76, 0.76, H, '#f3e6cc', 4 - d.z, { tex: tier >= 2 ? 'brick' : 'siding', noShadow: true }); I.win(b.D, b.C, 0.12, 11, 0.24, 14, true); if (storeys === 2) { I.win(b.D, b.C, 0.12, 42, 0.24, 14, false); I.win(b.D, b.C, 0.62, 42, 0.24, 14, true); } I.door(b.D, b.C, 0.6, 0.24, 22, '#8b4a2b'); I.win(b.C, b.B, 0.2, 11, 0.28, 14, tier < 2); if (storeys === 2) I.win(b.C, b.B, 0.55, 42, 0.28, 14, true); I.line(I.up(b.D, H), I.up(b.C, H), '#c9c2b0', 2); }
      d = drop(k, 2, n); if (d.on) { I.roof(gx + 0.12, gy + 0.12, 0.76, 0.76, H + 4 - d.z, 26, tier >= 2 ? '#8a5a3a' : '#d9563f'); I.chimney(gx + 0.62, gy + 0.22, H + 14 - d.z); const c = I.p(gx + 0.68, gy + 0.28, H + 32 - d.z); I.smoke(c[0], c[1], now); }
      d = drop(k, 3, n); if (d.on) { I.bush(gx + 0.05, gy + 0.95, true); I.bush(gx + 0.85, gy + 0.05, tier >= 2); if (tier >= 2) I.fence(gx + 0.0, gy + 1.0, gx + 0.5, gy + 1.0, 4); }
      d = drop(k, 4, n); if (d.on && tier >= 2) { const m = I.p(gx + 1.02, gy + 0.9); I.ctx.fillStyle = '#3b4252'; I.ctx.fillRect(m[0] - 1, m[1] - 10, 2, 10); I.roundRect(m[0] - 4, m[1] - 14, 8, 5, 1.5, '#2f7fd6'); }
      I.puff(gx, gy, k * n - 4);
    },
    datacentre(I, gx, gy, k, now, tier) {
      const n = 5, w = tier >= 2 ? 1.25 : 0.95;
      let d = drop(k, 0, n); if (d.on) { I.box(gx, gy, w + 0.05, 1, 3, '#aeb4bf', 0, { top: 0.05 }); I.poly([I.p(gx, gy + 1.02), I.p(gx + w, gy + 1.02), I.p(gx + w, gy + 1.4), I.p(gx, gy + 1.4)], '#6b7280'); for (let i = 0; i < 3; i++) I.line(I.p(gx + 0.15 + i * 0.3, gy + 1.05), I.p(gx + 0.15 + i * 0.3, gy + 1.37), '#f5f5f5', 1); }
      d = drop(k, 1, n); if (d.on) { const b = I.box(gx + 0.05, gy + 0.08, w - 0.05, 0.84, 40, '#8a95a6', 3 - d.z, { tex: 'ribbed', noShadow: true }); for (let r = 0; r < 2; r++) for (let c = 0; c < 6; c++) { const u = (c + 0.5) / 6, x = b.D[0] + (b.C[0] - b.D[0]) * u, y = b.D[1] + (b.C[1] - b.D[1]) * u - 9 - r * 9; const on = Math.floor(now / 350 + c * 1.7 + r * 2.3) % 3 !== 0; I.ctx.fillStyle = on ? '#4ff0ff' : '#1e3a4a'; I.ctx.fillRect(x - 1.5, y - 1.5, 3, 3); } I.door(b.C, b.B, 0.4, 0.2, 22, '#2f3a4a'); const s = I.up(I.P(b.C, b.B, 0.5), 30); I.roundRect(s[0] - 10, s[1] - 4, 20, 7, 1.5, '#ffffff'); I.ctx.fillStyle = '#2f7fd6'; I.ctx.fillRect(s[0] - 8, s[1] - 2, 16, 3); }
      d = drop(k, 2, n); if (d.on) { I.flatRoof(gx + 0.05, gy + 0.08, w - 0.05, 0.84, 43 - d.z, '#c9d1dc'); [0.15, 0.45, 0.75].forEach((o, i) => { if (i === 2 && tier < 2) return; const u = I.box(gx + 0.1 + o * (w - 0.3), gy + 0.2, 0.18, 0.18, 8, '#dfe5ee', 47 - d.z, { noShadow: true }); const f = I.P(u.A2, u.C2, 0.5); I.ctx.strokeStyle = '#8a95a6'; I.ctx.lineWidth = 1; I.ctx.beginPath(); I.ctx.ellipse(f[0], f[1], 3.5, 1.8, 0, 0, Math.PI * 2); I.ctx.stroke(); }); }
      d = drop(k, 3, n); if (d.on) { const dsh = I.p(gx + w - 0.15, gy + 0.75, 47 - d.z); I.ctx.fillStyle = '#e6e9ef'; I.ctx.beginPath(); I.ctx.ellipse(dsh[0], dsh[1] - 4, 6, 4, -0.5, 0, Math.PI * 2); I.ctx.fill(); I.line([dsh[0], dsh[1]], [dsh[0], dsh[1] - 4], '#8a95a6', 2); }
      d = drop(k, 4, n); if (d.on) { I.fence(gx - 0.05, gy + 1.0, gx + w, gy + 1.0, 8); if (tier >= 2) I.car(gx + 0.05, gy + 1.0, '#3b7dd8'); }
      I.puff(gx, gy, k * n - 4);
    },
    containers(I, gx, gy, k, now, tier) {
      const n = 6, cols = ['#e8552f', '#2f7fd6', '#f2b42a', '#3fa66b', '#8f5fd1', '#ff8fb1'];
      const spots = [[0.05, 0.05, 0], [0.5, 0.05, 0], [0.05, 0.55, 0], [0.5, 0.55, 0], [0.28, 0.3, 16], [0.05, 0.05, 16]];
      I.poly([I.p(gx - 0.05, gy - 0.05), I.p(gx + 1.05, gy - 0.05), I.p(gx + 1.05, gy + 1.05), I.p(gx - 0.05, gy + 1.05)], '#9aa3b0');
      for (let i = 0; i < 6; i++) { if (i > 4 && tier < 2) break; const d = drop(k, i, n); if (!d.on) continue; const b = I.box(gx + spots[i][0], gy + spots[i][1], 0.42, 0.42, 16, cols[i], spots[i][2] - d.z, { tex: 'ribbed', noShadow: spots[i][2] > 0 }); I.line(I.P(b.C, b.B, 0.5), I.up(I.P(b.C, b.B, 0.5), 16), 'rgba(0,0,0,.35)', 1); I.ctx.fillStyle = 'rgba(255,255,255,.75)'; I.ctx.fillRect(b.D2[0] + 3, b.D2[1] + 3, 6, 2); }
      const c1 = I.p(gx - 0.05, gy + 1.08), c2 = I.p(gx + 1.05, gy + 1.08); const H = 62; I.line(c1, I.up(c1, H), '#f2b42a', 3); I.line(c2, I.up(c2, H), '#f2b42a', 3); I.line(I.up(c1, H), I.up(c2, H), '#f2b42a', 4);
      const hook = I.P(I.up(c1, H), I.up(c2, H), 0.4 + Math.sin(now / 1500) * 0.15); I.line(hook, [hook[0], hook[1] + 14], '#3b4252', 1); I.ctx.fillStyle = '#3b4252'; I.ctx.fillRect(hook[0] - 3, hook[1] + 14, 6, 3);
      I.puff(gx, gy, k * n - 5);
    },
    tower(I, gx, gy, k, now, tier) {
      const n = 3, H = tier >= 2 ? 120 : 90;
      let d = drop(k, 0, n); if (d.on) { I.box(gx + 0.2, gy + 0.2, 0.6, 0.6, 6, '#aab3bf', 0, { tex: 'stone' }); I.fence(gx + 0.1, gy + 0.9, gx + 0.9, gy + 0.9, 5); }
      d = drop(k, 1, n); if (d.on) { const base = 6 - d.z; const a = I.p(gx + 0.3, gy + 0.7, base), b = I.p(gx + 0.7, gy + 0.7, base), c = I.p(gx + 0.7, gy + 0.3, base), t = I.p(gx + 0.5, gy + 0.5, base + H); [a, b, c].forEach(q => I.line(q, [t[0], t[1]], '#d8dde5', 2.5)); for (let v = 0.15; v < 1; v += 0.2) { I.line(I.P(a, t, v), I.P(b, t, v), '#c4cad4', 1); I.line(I.P(b, t, v), I.P(c, t, v), '#b0b7c2', 1); I.line(I.P(a, t, v), I.P(b, t, v + 0.2), '#c4cad4', 1); I.line(I.P(b, t, v), I.P(c, t, v + 0.2), '#b0b7c2', 1); } }
      d = drop(k, 2, n); if (d.on) { const t = I.p(gx + 0.5, gy + 0.5, 6 + H - d.z); [-8, 6].forEach((o, i) => { I.ctx.fillStyle = '#e6e9ef'; I.ctx.beginPath(); I.ctx.ellipse(t[0] + o, t[1] + 14 + i * 6, 5, 3.2, i ? 0.6 : -0.6, 0, Math.PI * 2); I.ctx.fill(); }); I.line(t, [t[0], t[1] - 16], '#8a95a3', 2); const on = Math.floor(now / 500) % 2 === 0; I.blob(t[0], t[1] - 18, on ? 4 : 2.5, '#ff4d4d'); if (on) { I.ctx.fillStyle = 'rgba(255,77,77,.16)'; I.ctx.beginPath(); I.ctx.arc(t[0], t[1] - 18, 11, 0, Math.PI * 2); I.ctx.fill(); } }
      I.puff(gx, gy, k * n - 2);
    },
    gate(I, gx, gy, k, now, tier) {
      const n = 3;
      let d = drop(k, 0, n); if (d.on) { const t = I.box(gx + 0.02, gy + 0.3, 0.26, 0.4, 48, '#b3ada3', -d.z, { tex: 'stone' }); crenel(I, t); }
      d = drop(k, 1, n); if (d.on) { const t = I.box(gx + 0.72, gy + 0.3, 0.26, 0.4, 48, '#b3ada3', -d.z, { tex: 'stone' }); crenel(I, t); }
      d = drop(k, 2, n); if (d.on) { I.box(gx + 0.02, gy + 0.36, 0.96, 0.28, 14, '#c2bcb3', 40 - d.z, { noShadow: true, tex: 'stone' }); const m = I.p(gx + 0.5, gy + 0.64); I.ctx.fillStyle = '#4a2b17'; I.ctx.beginPath(); I.ctx.moveTo(m[0] - 8, m[1]); I.ctx.lineTo(m[0] - 8, m[1] - 26); I.ctx.arc(m[0], m[1] - 26, 8, Math.PI, 0); I.ctx.lineTo(m[0] + 8, m[1]); I.ctx.closePath(); I.ctx.fill(); [[gx + 0.15, gy + 0.72], [gx + 0.85, gy + 0.72]].forEach(q => { const f = I.p(q[0], q[1], 28); const fl = 1 + Math.sin(now / 90 + q[0]) * 0.2; I.blob(f[0], f[1] - 4 * fl, 3 * fl, '#ff8a2a', 1.3); }); }
      I.puff(gx, gy, k * n - 2);
    },
    observatory(I, gx, gy, k, now, tier) {
      const n = 3;
      let d = drop(k, 0, n); if (d.on) { I.box(gx + 0.08, gy + 0.08, 0.84, 0.84, 6, '#d6d1c4', 0, { top: 0.1 }); [0.2, 0.5, 0.8].forEach(u => I.box(gx + 0.08 + u * 0.8, gy + 0.9, 0.06, 0.06, 34, '#efe9dc', 6, { noShadow: true })); }
      d = drop(k, 1, n); if (d.on) { const b = I.box(gx + 0.2, gy + 0.2, 0.6, 0.6, 40, '#efe9dc', 6 - d.z, { tex: 'stone', noShadow: true }); I.win(b.D, b.C, 0.2, 12, 0.25, 14, true); I.win(b.D, b.C, 0.6, 12, 0.25, 14, true); I.door(b.C, b.B, 0.35, 0.3, 22, '#4a3a6b'); }
      d = drop(k, 2, n); if (d.on) { const c = I.p(gx + 0.5, gy + 0.5, 46 - d.z); const r = 17; const g = I.ctx.createRadialGradient(c[0] - 6, c[1] - 9, 2, c[0], c[1], r); g.addColorStop(0, '#c9b6ff'); g.addColorStop(1, '#5a3aa8'); I.ctx.beginPath(); I.ctx.ellipse(c[0], c[1], r, r * 0.8, 0, Math.PI, 0); I.ctx.closePath(); I.ctx.fillStyle = g; I.ctx.fill(); I.ctx.fillStyle = '#2a1a4d'; I.ctx.beginPath(); I.ctx.moveTo(c[0] + 2, c[1] - r * 0.78); I.ctx.lineTo(c[0] + 6, c[1] - r * 0.78); I.ctx.lineTo(c[0] + 12, c[1] - 4); I.ctx.lineTo(c[0] + 6, c[1] - 4); I.ctx.closePath(); I.ctx.fill(); I.line([c[0] + 5, c[1] - 6], [c[0] + 16, c[1] - 24], '#3b2a63', 3); }
      I.puff(gx, gy, k * n - 2);
    },
    workshop(I, gx, gy, k, now, tier) {
      const n = 4;
      let d = drop(k, 0, n); if (d.on) { const b = I.box(gx + 0.08, gy + 0.08, 0.84, 0.84, 36, '#e3a45b', -d.z, { tex: 'brick' }); I.win(b.D, b.C, 0.1, 14, 0.22, 12, false); I.win(b.D, b.C, 0.68, 14, 0.22, 12, false); const a = I.P(b.D, b.C, 0.36), c = I.P(b.D, b.C, 0.64); I.poly([a, c, I.up(c, 26), I.up(a, 26)], '#6b7280'); for (let v = 4; v < 26; v += 4) I.line(I.up(a, v), I.up(c, v), '#4b5563', 1); }
      d = drop(k, 1, n); if (d.on) { for (let i = 0; i < 3; i++) { const g0 = gx + 0.08 + i * 0.28; I.box(g0, gy + 0.08, 0.28, 0.84, 10, '#6b7280', 36 - d.z, { noShadow: true, top: -0.05 }); I.box(g0 + 0.02, gy + 0.1, 0.1, 0.8, 8, '#9ad3ff', 46 - d.z, { noShadow: true, top: 0.5 }); } }
      d = drop(k, 2, n); if (d.on) { I.chimney(gx + 0.8, gy + 0.2, 46 - d.z, '#8a5a3a'); const c = I.p(gx + 0.86, gy + 0.26, 64 - d.z); I.smoke(c[0], c[1], now); }
      d = drop(k, 3, n); if (d.on) { I.box(gx + 0.95, gy + 0.75, 0.16, 0.16, 8, '#e8552f', 0, { noShadow: true }); I.box(gx + 0.95, gy + 0.55, 0.16, 0.16, 12, '#2f7fd6', 0, { noShadow: true }); }
      I.puff(gx, gy, k * n - 3);
    },
    warehouse(I, gx, gy, k, now, tier) {
      const n = 3, w = tier >= 2 ? 1.3 : 1;
      let d = drop(k, 0, n); if (d.on) { const b = I.box(gx, gy + 0.15, w, 0.7, 34, '#c9a06a', -d.z, { tex: 'ribbed' }); [[0.2, 0.45], [0.55, 0.8]].forEach(u => { const a = I.P(b.D, b.C, u[0]), c = I.P(b.D, b.C, u[1]); I.poly([a, c, I.up(c, 24), I.up(a, 24)], '#5b3a22'); for (let v = 3; v < 24; v += 3) I.line(I.up(a, v), I.up(c, v), 'rgba(255,255,255,.14)', 1); }); I.box(gx, gy + 0.85, w, 0.12, 6, '#9aa3b0', 0, { noShadow: true }); }
      d = drop(k, 1, n); if (d.on) I.roof(gx, gy + 0.15, w, 0.7, 34 - d.z, 9, '#4b5563', 0.08);
      d = drop(k, 2, n); if (d.on) [0.1, 0.3].forEach((o, i) => { I.box(gx + o, gy + 1.02, 0.14, 0.14, 4, '#b8834a', 0, { noShadow: true }); if (i) I.box(gx + o, gy + 1.02, 0.14, 0.14, 4, '#c9a06a', 4, { noShadow: true }); });
      I.puff(gx, gy, k * n - 2);
    },
    cityhall(I, gx, gy, k, now, tier) {
      const two = tier >= 4, H = two ? 60 : 40;
      I.box(gx - 0.3, gy - 0.3, 2.6, 2.6, 4, '#d8d0bc', 0, { top: 0.08 });
      const b = I.box(gx + 0.2, gy + 0.2, 1.6, 1.6, H, '#f3e6cc', 4, { tex: 'brick', noShadow: true });
      I.win(b.D, b.C, 0.1, 12, 0.18, 14, true); I.win(b.D, b.C, 0.72, 12, 0.18, 14, true); I.door(b.D, b.C, 0.38, 0.24, 24, '#7a3c1d'); I.win(b.C, b.B, 0.2, 12, 0.22, 14, true); I.win(b.C, b.B, 0.6, 12, 0.22, 14, true);
      if (two) { I.win(b.D, b.C, 0.1, 40, 0.18, 14, false); I.win(b.D, b.C, 0.41, 40, 0.18, 14, true); I.win(b.D, b.C, 0.72, 40, 0.18, 14, true); I.win(b.C, b.B, 0.4, 40, 0.22, 14, true); }
      [0.05, 0.35, 0.65, 0.95].forEach(u => I.box(gx + 0.2 + u * 1.5, gy + 1.82, 0.08, 0.08, H, '#efe9dc', 4, { noShadow: true }));   /* the colonnade */
      I.roof(gx + 0.2, gy + 0.2, 1.6, 1.6, H + 4, 30, '#ffc531');
      const f = I.p(gx + 1, gy + 1, H + 34); I.line(f, [f[0], f[1] - 26], '#e6e9ef', 2); const wv = Math.sin(now / 300) * 2; I.poly([[f[0], f[1] - 26], [f[0] + 16, f[1] - 22 + wv], [f[0], f[1] - 17]], '#2f7fd6');
    },
    hq(I, gx, gy, k, now) {
      I.box(gx - 0.2, gy - 0.2, 2.4, 2.4, 5, '#cfd5df', 0, { top: 0.1, tex: 'stone' });
      const b = I.box(gx + 0.15, gy + 0.15, 1.7, 1.7, 150, '#2f5f9f', 5, { tex: 'glass', top: 0.12 });
      I.box(gx + 0.4, gy + 0.4, 1.2, 1.2, 18, '#3b6fb5', 155, { tex: 'glass', noShadow: true, top: 0.2 }); I.flatRoof(gx + 0.6, gy + 0.6, 0.8, 0.8, 173, '#dfe5ee');
      I.box(gx + 0.5, gy + 1.85, 1.0, 0.3, 3, '#ffc531', 30, { noShadow: true, top: 0.15 });
      const a = I.P(b.D, b.C, 0.32), c = I.P(b.D, b.C, 0.68); I.poly([a, c, I.up(c, 26), I.up(a, 26)], '#dff1ff');
      const s = I.up(I.P(b.D, b.C, 0.5), 120); I.roundRect(s[0] - 26, s[1] - 8, 52, 14, 3, '#ffffff'); I.ctx.fillStyle = '#172033'; I.ctx.font = '800 9px Baloo 2, sans-serif'; I.ctx.textAlign = 'center'; I.ctx.fillText('NEXTWORK', s[0], s[1] + 3); I.ctx.textAlign = 'left';
      const f = I.p(gx + 1.0, gy + 1.0, 178); I.line(f, [f[0], f[1] - 26], '#e6e9ef', 2); const wv = Math.sin(now / 300) * 2; I.poly([[f[0], f[1] - 26], [f[0] + 16, f[1] - 22 + wv], [f[0], f[1] - 17]], '#ffc531');
    },
    fountain(I, gx, gy, k, now) {
      const c = I.p(gx + 0.5, gy + 0.5);
      I.ctx.fillStyle = 'rgba(20,40,30,.2)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] + 2, c[1] + 2, 20, 10, 0, 0, Math.PI * 2); I.ctx.fill();
      I.ctx.fillStyle = '#c9c2b0'; I.ctx.beginPath(); I.ctx.ellipse(c[0], c[1], 20, 10, 0, 0, Math.PI * 2); I.ctx.fill();
      I.ctx.fillStyle = '#4fb3f0'; I.ctx.beginPath(); I.ctx.ellipse(c[0], c[1] - 2, 16, 8, 0, 0, Math.PI * 2); I.ctx.fill();
      I.ctx.fillStyle = '#e9e4d6'; I.ctx.fillRect(c[0] - 2, c[1] - 22, 4, 20);
      for (let i = 0; i < 8; i++) { const ph = (now / 900 + i / 8) % 1; const a = i / 8 * Math.PI * 2; I.ctx.fillStyle = 'rgba(200,235,255,' + (0.9 - ph * 0.8) + ')'; I.ctx.beginPath(); I.ctx.arc(c[0] + Math.cos(a) * ph * 12, c[1] - 22 + ph * 22 - Math.sin(ph * Math.PI) * 12, 1.6, 0, Math.PI * 2); I.ctx.fill(); }
    },
    park(I, gx, gy, k, now, size) {
      /* a block with nothing built on it yet: trees, a path, a bench */
      const s = size || 6;
      I.poly([I.p(gx + 1, gy + s / 2 - 0.3), I.p(gx + s - 1, gy + s / 2 - 0.3), I.p(gx + s - 1, gy + s / 2 + 0.3), I.p(gx + 1, gy + s / 2 + 0.3)], '#d8ccae');
      I.tree(gx + 1, gy + 1, 1.1); I.tree(gx + s - 2, gy + 1.2, 0.9); I.tree(gx + 1.2, gy + s - 2, 1); I.tree(gx + s - 2, gy + s - 2, 1.1);
      I.bush(gx + s / 2, gy + 1, true); I.bench(gx + s / 2 - 0.5, gy + s / 2 - 1.2);
    }
  };

  /* ---- the taxonomy names, over the drawers that already existed ---- */
  B.home = B.house; B.lab = B.observatory; B.barn = B.warehouse; B.vault = B.gate; B.yard = B.containers;

  B.library = function (I, gx, gy, k, now, tier) {
    const n = 3, H = tier >= 3 ? 46 : 36;
    let d = drop(k, 0, n); if (d.on) { I.box(gx - 0.05, gy - 0.05, 1.1, 1.1, 5, '#d6d1c4', 0, { top: 0.1, tex: 'stone' }); I.poly([I.p(gx + 0.35, gy + 1.05), I.p(gx + 0.65, gy + 1.05), I.p(gx + 0.65, gy + 1.4), I.p(gx + 0.35, gy + 1.4)], '#d8ccae'); }
    d = drop(k, 1, n); if (d.on) { const b = I.box(gx + 0.12, gy + 0.12, 0.76, 0.76, H, '#c9503c', 5 - d.z, { tex: 'brick', noShadow: true }); I.win(b.D, b.C, 0.1, 12, 0.2, 18, true); I.win(b.D, b.C, 0.7, 12, 0.2, 18, true); const a = I.P(b.D, b.C, 0.38), c = I.P(b.D, b.C, 0.62); I.poly([a, c, I.up(c, 26), I.up(a, 26)], '#efe9dc'); I.ctx.fillStyle = '#4a2b17'; I.ctx.beginPath(); const m = I.P(a, c, 0.5); I.ctx.moveTo(m[0] - 5, m[1]); I.ctx.lineTo(m[0] - 5, m[1] - 18); I.ctx.arc(m[0], m[1] - 18, 5, Math.PI, 0); I.ctx.lineTo(m[0] + 5, m[1]); I.ctx.closePath(); I.ctx.fill(); [0.08, 0.3, 0.7, 0.92].forEach(u => I.box(gx + 0.12 + u * 0.72, gy + 0.9, 0.05, 0.05, H, '#efe9dc', 5 - d.z, { noShadow: true })); I.win(b.C, b.B, 0.25, 12, 0.5, 18, true); }
    d = drop(k, 2, n); if (d.on) { I.flatRoof(gx + 0.12, gy + 0.12, 0.76, 0.76, H + 5 - d.z, '#8a5a3a'); I.box(gx + 0.1, gy + 0.1, 0.8, 0.08, 6, '#efe9dc', H + 9 - d.z, { noShadow: true }); const s = I.p(gx + 0.5, gy + 1.05, 34 - d.z); I.roundRect(s[0] - 9, s[1] - 5, 18, 8, 2, '#ffffff'); I.ctx.fillStyle = '#c9503c'; I.ctx.fillRect(s[0] - 7, s[1] - 3, 5, 4); I.ctx.fillRect(s[0] - 1, s[1] - 3, 5, 4); if (tier >= 2) I.tree(gx + 1.0, gy + 0.9, 0.8); }
    I.puff(gx, gy, k * n - 2);
  };
  B.clinic = function (I, gx, gy, k, now, tier) {
    const n = 3, w = tier >= 2 ? 1.1 : 0.9;
    let d = drop(k, 0, n); if (d.on) { I.box(gx - 0.05, gy - 0.05, w + 0.1, 1.1, 4, '#cfd5df', 0, { top: 0.1 }); I.poly([I.p(gx + 0.3, gy + 1.05), I.p(gx + 0.7, gy + 1.05), I.p(gx + 0.7, gy + 1.4), I.p(gx + 0.3, gy + 1.4)], '#c8ccd4'); }
    d = drop(k, 1, n); if (d.on) { const b = I.box(gx + 0.08, gy + 0.1, w - 0.16, 0.8, 34, '#f4f6f8', 4 - d.z, { tex: 'siding', noShadow: true }); I.win(b.D, b.C, 0.08, 11, 0.22, 14, true); I.win(b.D, b.C, 0.7, 11, 0.22, 14, true); const a = I.P(b.D, b.C, 0.36), c = I.P(b.D, b.C, 0.64); I.poly([a, c, I.up(c, 24), I.up(a, 24)], '#9ad3ff'); I.line(I.P(a, c, 0.5), I.up(I.P(a, c, 0.5), 24), '#e6f1fb', 1.5); I.win(b.C, b.B, 0.2, 11, 0.28, 14, true); I.win(b.C, b.B, 0.6, 11, 0.28, 14, true); }
    d = drop(k, 2, n); if (d.on) { I.flatRoof(gx + 0.08, gy + 0.1, w - 0.16, 0.8, 38 - d.z, '#dfe5ee'); const s = I.p(gx + w / 2, gy + 0.12, 50 - d.z); I.roundRect(s[0] - 8, s[1] - 8, 16, 16, 3, '#ffffff'); I.ctx.fillStyle = '#e8352f'; I.ctx.fillRect(s[0] - 2, s[1] - 6, 4, 12); I.ctx.fillRect(s[0] - 6, s[1] - 2, 12, 4); if (tier >= 2) I.bush(gx + w, gy + 0.95, true); }
    I.puff(gx, gy, k * n - 2);
  };
  B.bank = function (I, gx, gy, k, now, tier) {
    const n = 3, H = tier >= 3 ? 48 : 40;
    let d = drop(k, 0, n); if (d.on) { I.box(gx - 0.08, gy - 0.08, 1.16, 1.16, 8, '#d6d1c4', 0, { top: 0.1, tex: 'stone' }); [0.1, 0.2].forEach((o, i) => I.box(gx + 0.25, gy + 1.08 + o, 0.5, 0.1, 6 - i * 3, '#e3dccb', 0, { noShadow: true })); }
    d = drop(k, 1, n); if (d.on) { const b = I.box(gx + 0.15, gy + 0.15, 0.7, 0.7, H, '#e9e2d0', 8 - d.z, { tex: 'stone', noShadow: true }); I.win(b.D, b.C, 0.12, 14, 0.18, 16, false); I.win(b.D, b.C, 0.7, 14, 0.18, 16, false); I.door(b.D, b.C, 0.4, 0.2, 26, '#3b3a44'); [0.02, 0.34, 0.66, 0.98].forEach(u => I.box(gx + 0.15 + u * 0.66, gy + 0.9, 0.06, 0.06, H, '#f4f1e8', 8 - d.z, { noShadow: true })); I.win(b.C, b.B, 0.3, 14, 0.4, 16, true); }
    d = drop(k, 2, n); if (d.on) { const base = H + 8 - d.z; I.box(gx + 0.1, gy + 0.1, 0.8, 0.8, 6, '#e9e2d0', base, { noShadow: true, top: 0.15 }); const a = I.p(gx + 0.1, gy + 0.95, base + 6), c = I.p(gx + 0.9, gy + 0.95, base + 6), t = I.p(gx + 0.5, gy + 0.95, base + 22); I.poly([a, c, t], '#f4f1e8'); I.line(a, c, '#c9c2b0', 1.5); const s = I.p(gx + 0.5, gy + 0.95, base + 12); I.ctx.fillStyle = '#c9971f'; I.ctx.font = '800 7px Baloo 2, sans-serif'; I.ctx.textAlign = 'center'; I.ctx.fillText('$', s[0], s[1] + 2); I.ctx.textAlign = 'left'; }
    I.puff(gx, gy, k * n - 2);
  };

  /* ---- NextWork Hall and the cafe: a campus, not a tower ---- */
  B.hall = function (I, gx, gy, now, depth) {
    /* six tiles wide and, since it is headquarters, long: two storeys of warm
     * brick, a colonnade along the front, a cupola with a clock, and the flag */
    const D = depth || 2.4;
    I.box(gx - 0.4, gy - 0.4, 6.8, D + 1, 4, '#d6d1c4', 0, { top: 0.1, tex: 'stone' });
    const H = 58, b = I.box(gx, gy, 6, D, H, '#b8553f', 4, { tex: 'brick' });
    for (let u = 0.06; u < 0.95; u += 0.12) { I.win(b.D, b.C, u, 12, 0.07, 16, (Math.floor(u * 100) % 3) !== 0); I.win(b.D, b.C, u, 36, 0.07, 16, (Math.floor(u * 100) % 4) !== 0); }
    for (let u = 0.06; u < 0.95; u += 0.5 / D) { I.win(b.C, b.B, u, 12, 0.18 / D, 16, (Math.floor(u * 100) % 2) === 0); I.win(b.C, b.B, u, 36, 0.18 / D, 16, (Math.floor(u * 100) % 3) !== 0); }
    const a = I.P(b.D, b.C, 0.44), c = I.P(b.D, b.C, 0.56); I.poly([a, c, I.up(c, 30), I.up(a, 30)], '#efe9dc'); I.ctx.fillStyle = '#4a2b17'; I.ctx.beginPath(); const m = I.P(a, c, 0.5); I.ctx.moveTo(m[0] - 7, m[1]); I.ctx.lineTo(m[0] - 7, m[1] - 22); I.ctx.arc(m[0], m[1] - 22, 7, Math.PI, 0); I.ctx.lineTo(m[0] + 7, m[1]); I.ctx.closePath(); I.ctx.fill();
    [0.02, 0.18, 0.34, 0.66, 0.82, 0.98].forEach(u => I.box(gx + u * 5.9, gy + D + 0.1, 0.08, 0.08, H, '#efe9dc', 4, { noShadow: true }));
    I.poly([I.p(gx - 0.15, gy + D + 0.05, H + 4), I.p(gx + 6.15, gy + D + 0.05, H + 4), I.p(gx + 6.15, gy + D + 0.35, H + 1), I.p(gx - 0.15, gy + D + 0.35, H + 1)], '#efe9dc');
    I.roof(gx, gy, 6, D, H + 4, 22, '#4b5563', 0.1);
    const cup = I.box(gx + 2.6, gy + D * 0.35, 0.8, 0.8, 22, '#efe9dc', H + 26, { noShadow: true }); I.roof(gx + 2.6, gy + D * 0.35, 0.8, 0.8, H + 48, 12, '#3b7dd8', 0.1);
    const f = I.up(I.P(cup.D, cup.C, 0.5), 11); I.ctx.fillStyle = '#fff'; I.ctx.beginPath(); I.ctx.arc(f[0], f[1], 4, 0, Math.PI * 2); I.ctx.fill(); const t = now / 60000; I.line(f, [f[0] + Math.cos(t) * 2.5, f[1] + Math.sin(t) * 2.5], '#172033', 1); I.line(f, [f[0], f[1] - 3], '#172033', 1);
    const s = I.up(I.P(b.D, b.C, 0.5), 50); I.roundRect(s[0] - 30, s[1] - 7, 60, 13, 2, '#4a2b17'); I.ctx.fillStyle = '#ffe9a6'; I.ctx.font = '800 8px Baloo 2, sans-serif'; I.ctx.textAlign = 'center'; I.ctx.fillText('NEXTWORK', s[0], s[1] + 3); I.ctx.textAlign = 'left';
    const fl = I.p(gx + 5.5, gy + 0.3, H + 26); I.line(fl, [fl[0], fl[1] - 26], '#e6e9ef', 2); const wv = Math.sin(now / 300) * 2; I.poly([[fl[0], fl[1] - 26], [fl[0] + 16, fl[1] - 22 + wv], [fl[0], fl[1] - 17]], '#ffc531');
  };
  B.cafe = function (I, gx, gy, now) {
    /* a low warm room with a striped awning and the sign; the terrace with
     * tables is laid out by the campus, not here */
    I.box(gx - 0.3, gy - 0.3, 3.6, 2.6, 4, '#d6d1c4', 0, { top: 0.1 });
    const c = I.box(gx, gy, 3, 1.4, 22, '#f1e7d2', 4, { tex: 'siding', noShadow: true });
    const a = I.P(c.D, c.C, 0.08), d2 = I.P(c.D, c.C, 0.92); I.poly([a, d2, I.up(d2, 16), I.up(a, 16)], '#ffe9a6'); for (let u = 0.2; u < 0.95; u += 0.2) I.line(I.P(a, d2, u), I.up(I.P(a, d2, u), 16), '#d9b24c', 1);
    I.door(c.C, c.B, 0.35, 0.3, 20, '#6b3a22');
    I.poly([I.p(gx - 0.2, gy + 1.35, 26), I.p(gx + 3.2, gy + 1.35, 26), I.p(gx + 3.2, gy + 2.1, 19), I.p(gx - 0.2, gy + 2.1, 19)], '#c9503c'); for (let u = 0; u <= 1; u += 0.1) I.line(I.p(gx - 0.2 + u * 3.4, gy + 1.35, 26), I.p(gx - 0.2 + u * 3.4, gy + 2.1, 19), Math.round(u * 10) % 2 ? '#f4f1e8' : '#c9503c', 3);
    I.flatRoof(gx, gy, 3, 1.4, 26, '#8a5a3a'); I.chimney(gx + 2.6, gy + 0.2, 30, '#b3ada3'); const sm = I.p(gx + 2.66, gy + 0.26, 48); I.smoke(sm[0], sm[1], now);
    const sg = I.p(gx + 1.5, gy + 2.1, 24); I.roundRect(sg[0] - 14, sg[1] - 5, 28, 9, 2, '#4a2b17'); I.ctx.fillStyle = '#ffe9a6'; I.ctx.font = '800 6px Baloo 2, sans-serif'; I.ctx.textAlign = 'center'; I.ctx.fillText('CAFE', sg[0], sg[1] + 2); I.ctx.textAlign = 'left';
  };
  B.table = function (I, gx, gy, diners, now) {
    const b = I.p(gx + 0.5, gy + 0.5); I.ctx.fillStyle = 'rgba(20,40,30,.2)'; I.ctx.beginPath(); I.ctx.ellipse(b[0], b[1] + 1, 9, 4, 0, 0, Math.PI * 2); I.ctx.fill();
    const seat = (x, colour, side) => { /* someone at the table, eating: on a chair, elbows in, a plate in front */ I.ctx.fillStyle = '#3b4252'; I.ctx.fillRect(x - 3, b[1] - 6, 6, 1.5); I.ctx.fillRect(x - 2.5, b[1] - 4.5, 1.5, 4.5); I.ctx.fillRect(x + 1, b[1] - 4.5, 1.5, 4.5); I.roundRect(x - 3.2, b[1] - 14, 6.4, 8, 2.4, colour); I.blob(x, b[1] - 17, 3.1, '#ffd6ad'); I.ctx.fillStyle = '#4a2e1a'; I.ctx.beginPath(); I.ctx.ellipse(x, b[1] - 18.4, 3.1, 1.8, 0, Math.PI, 0); I.ctx.fill(); const nod = Math.sin((now || 0) / 700 + x) > 0.6 ? 1 : 0; I.ctx.fillStyle = colour; I.ctx.fillRect(x - 5 * side, b[1] - 11 + nod, 2, 3); };
    if (diners && diners[0]) seat(b[0] - 9, diners[0], 1); if (diners && diners[1]) seat(b[0] + 9, diners[1], -1);
    I.ctx.fillStyle = '#3b4252'; I.ctx.fillRect(b[0] - 1, b[1] - 10, 2, 10); I.ctx.beginPath(); I.ctx.ellipse(b[0], b[1] - 10, 7, 3, 0, 0, Math.PI * 2); I.ctx.fillStyle = '#e9e4d6'; I.ctx.fill();
    if (diners) { [[-3.5, -11], [3.5, -10]].forEach(o => { I.ctx.beginPath(); I.ctx.ellipse(b[0] + o[0], b[1] + o[1], 2.4, 1.1, 0, 0, Math.PI * 2); I.ctx.fillStyle = '#fff'; I.ctx.fill(); I.ctx.beginPath(); I.ctx.ellipse(b[0] + o[0], b[1] + o[1], 1.3, 0.6, 0, 0, Math.PI * 2); I.ctx.fillStyle = '#d9563f'; I.ctx.fill(); }); I.ctx.fillStyle = '#f4f1e8'; I.ctx.fillRect(b[0] - 0.8, b[1] - 13.5, 1.6, 3); }
    I.ctx.fillStyle = '#e9e4d6'; I.ctx.fillRect(b[0] - 1, b[1] - 26, 2, 16); I.ctx.beginPath(); I.ctx.ellipse(b[0], b[1] - 26, 11, 4, 0, Math.PI, 0); I.ctx.fillStyle = '#c9503c'; I.ctx.fill();
  };
  B.pair = function (I, gx, gy, a, b, t) { /* two people talking: facing each other, one of them gesturing */ I.person(gx, gy, a, 3, false); I.person(gx + 0.45, gy - 0.35, b, 3, false); const q = I.p(gx + 0.45, gy - 0.35); const g = Math.sin(t * 3) > 0 ? 2 : 0; I.ctx.fillStyle = b; I.ctx.fillRect(q[0] - 6, q[1] - 12 - g, 3, 2); };
  B.site = function (I, gx, gy, now, name) {
    /* coming soon: a fenced lot, the slab poured, a frame going up, a crane, and the board saying what it will be */
    I.box(gx - 0.2, gy - 0.2, 3.4, 3.4, 3, '#c9c2b0', 0, { top: 0.1 });
    I.fence(gx - 0.3, gy - 0.3, gx + 3.3, gy - 0.3, 7); I.fence(gx - 0.3, gy - 0.3, gx - 0.3, gy + 3.3, 7); I.fence(gx + 3.3, gy - 0.3, gx + 3.3, gy + 3.3, 7);
    [[0.3, 0.3], [2.5, 0.3], [0.3, 2.5], [2.5, 2.5], [1.4, 1.4]].forEach(o => I.box(gx + o[0], gy + o[1], 0.16, 0.16, 40, '#b58a5a', 3, { noShadow: true }));
    I.box(gx + 0.3, gy + 0.3, 2.36, 0.12, 4, '#b58a5a', 43, { noShadow: true }); I.box(gx + 0.3, gy + 2.5, 2.36, 0.12, 4, '#b58a5a', 43, { noShadow: true });
    const c1 = I.p(gx + 3.1, gy + 3.1), H = 78; I.line(c1, I.up(c1, H), '#f2b42a', 3); const arm = I.up(c1, H); const sw = Math.sin(now / 4000) * 0.4; const tip = [arm[0] - 40 * Math.cos(sw), arm[1] - 14 - 18 * Math.sin(sw)]; I.line(arm, tip, '#f2b42a', 3); I.line([arm[0] + 12, arm[1] - 6], [arm[0], arm[1] - 14], '#f2b42a', 2); I.line(tip, [tip[0], tip[1] + 24], '#3b4252', 1); I.ctx.fillStyle = '#3b4252'; I.ctx.fillRect(tip[0] - 3, tip[1] + 24, 6, 3);
    const s = I.p(gx + 1.5, gy + 3.35, 4); I.roundRect(s[0] - 30, s[1] - 26, 60, 22, 2, '#172033'); I.ctx.fillStyle = '#ffc531'; I.ctx.font = '800 7.5px Baloo 2, system-ui, sans-serif'; I.ctx.textAlign = 'center'; I.ctx.fillText(name.toUpperCase(), s[0], s[1] - 15); I.ctx.fillStyle = '#fff'; I.ctx.font = '700 6px Nunito, system-ui, sans-serif'; I.ctx.fillText('COMING SOON', s[0], s[1] - 7); I.ctx.textAlign = 'left'; I.ctx.fillStyle = '#3b4252'; I.ctx.fillRect(s[0] - 26, s[1] - 4, 2, 5); I.ctx.fillRect(s[0] + 24, s[1] - 4, 2, 5);
    I.box(gx + 3.0, gy + 0.2, 0.3, 0.3, 8, '#e8552f', 0, { noShadow: true }); I.box(gx + 3.0, gy + 0.7, 0.3, 0.3, 12, '#2f7fd6', 0, { noShadow: true });
  };
  B.hub = function (I, gx, gy, now, hub) {
    I.box(gx - 0.3, gy - 0.3, 2.2, 2.2, 4, '#d6d1c4', 0, { top: 0.1 });
    B[hub.kind](I, gx + 0.3, gy + 0.3, 1, now, 3);
    const s = I.p(gx + 0.8, gy + 2.05, 2); I.roundRect(s[0] - 22, s[1] - 12, 44, 12, 3, '#172033'); I.ctx.fillStyle = '#ffc531'; I.ctx.font = '800 7px Baloo 2, sans-serif'; I.ctx.textAlign = 'center'; I.ctx.fillText(hub.name.toUpperCase(), s[0], s[1] - 3.5); I.ctx.textAlign = 'left';
    I.ctx.fillStyle = '#3b4252'; I.ctx.fillRect(s[0] - 1, s[1] - 1, 2, 6);
  };
  B.bench = function (I, gx, gy, who, now) {
    const b = I.p(gx + 0.5, gy + 0.5); I.ctx.fillStyle = 'rgba(20,40,30,.2)'; I.ctx.beginPath(); I.ctx.ellipse(b[0] + 2, b[1] + 1, 10, 4, 0, 0, Math.PI * 2); I.ctx.fill();
    I.ctx.fillStyle = '#8b5a2b'; I.ctx.fillRect(b[0] - 9, b[1] - 8, 18, 3); I.ctx.fillRect(b[0] - 9, b[1] - 13, 18, 2.5); I.ctx.fillStyle = '#3b4252'; I.ctx.fillRect(b[0] - 8, b[1] - 5, 2, 5); I.ctx.fillRect(b[0] + 6, b[1] - 5, 2, 5);
    if (who) { /* someone sitting: thighs along the seat, shins down, laptop on the knees */ const t = now / 1000; I.ctx.fillStyle = '#2b3a5c'; I.ctx.fillRect(b[0] - 3, b[1] - 9, 6, 3); I.ctx.fillRect(b[0] - 3, b[1] - 7, 2, 6); I.ctx.fillRect(b[0] + 1, b[1] - 7, 2, 6); I.ctx.fillStyle = '#3b4252'; I.ctx.fillRect(b[0] - 3.5, b[1] - 1.5, 3, 1.5); I.ctx.fillRect(b[0] + 0.5, b[1] - 1.5, 3, 1.5); I.roundRect(b[0] - 3.5, b[1] - 17, 7, 8.5, 2.5, who); I.blob(b[0], b[1] - 20, 3.4, '#ffd6ad'); I.ctx.fillStyle = '#4a2e1a'; I.ctx.beginPath(); I.ctx.ellipse(b[0], b[1] - 21.5, 3.4, 2, 0, Math.PI, 0); I.ctx.fill(); I.roundRect(b[0] - 4.5, b[1] - 10.5, 9, 1.5, 0.5, '#9aa3b0'); I.poly([[b[0] - 4.5, b[1] - 10.5], [b[0] + 4.5, b[1] - 10.5], [b[0] + 4.5, b[1] - 16.5], [b[0] - 4.5, b[1] - 16.5]], '#dfe5ee'); I.ctx.fillStyle = '#9ad3ff'; I.ctx.fillRect(b[0] - 3.5, b[1] - 15.5, 7, 4); I.ctx.fillStyle = '#e6f1fb'; I.ctx.fillRect(b[0] - 2.5, b[1] - 14.5, 3 + Math.floor((t * 2) % 3), 0.8); I.ctx.fillStyle = who; I.ctx.fillRect(b[0] - 5.5, b[1] - 13, 2, 3.5); I.ctx.fillRect(b[0] + 3.5, b[1] - 13, 2, 3.5); I.lights.push({ x: b[0], y: b[1] - 14, r: 10, c: '154,211,255', k: 0.5 }); }
  };
  B.horse = function (I, gx, gy, colour, walkT) {
    const c = I.p(gx, gy); const bob = Math.sin(walkT * 9) * 0.6;
    I.ctx.fillStyle = 'rgba(20,40,30,.25)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] + 2, c[1] + 1, 9, 3, 0, 0, Math.PI * 2); I.ctx.fill();
    I.ctx.fillStyle = shade(colour, -0.25); [[-6, 0], [-2, 1], [3, 1], [6, 0]].forEach((l, i) => I.ctx.fillRect(c[0] + l[0], c[1] - 7 + l[1] + bob, 2, 7 + Math.sin(walkT * 9 + i) * 1.2));
    I.roundRect(c[0] - 8, c[1] - 13 + bob, 15, 7, 3, colour);
    I.roundRect(c[0] + 5, c[1] - 20 + bob, 4, 9, 1.5, colour); I.roundRect(c[0] + 6, c[1] - 21 + bob, 6, 4, 1.5, colour);
    I.ctx.fillStyle = shade(colour, -0.45); I.ctx.fillRect(c[0] + 4, c[1] - 20 + bob, 2, 8); I.ctx.fillRect(c[0] - 9, c[1] - 12 + bob, 2, 6);
    I.ctx.fillStyle = '#20242b'; I.ctx.fillRect(c[0] + 10, c[1] - 19.5 + bob, 1.2, 1.2);
  };
  B.bike = function (I, gx, gy, colour, walkT) {
    const c = I.p(gx, gy); I.ctx.fillStyle = 'rgba(20,40,30,.25)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] + 1, c[1] + 1, 7, 2.5, 0, 0, Math.PI * 2); I.ctx.fill();
    I.wheel(c[0] - 5, c[1] - 2, 3.2); I.wheel(c[0] + 5, c[1] - 2, 3.2); I.line([c[0] - 5, c[1] - 2], [c[0] + 1, c[1] - 8], '#e8552f', 1.5); I.line([c[0] + 1, c[1] - 8], [c[0] + 5, c[1] - 2], '#e8552f', 1.5); I.line([c[0] - 1, c[1] - 3], [c[0] + 1, c[1] - 8], '#e8552f', 1.5);
    const p = Math.sin(walkT * 10); I.ctx.fillStyle = '#2b3a5c'; I.ctx.fillRect(c[0] - 1, c[1] - 7 + p, 2, 4); I.roundRect(c[0] - 3, c[1] - 16, 6, 8, 2.5, colour); I.blob(c[0], c[1] - 19, 3.2, '#ffd6ad'); I.roundRect(c[0] - 3.8, c[1] - 22.5, 7.6, 3.5, 2, '#f2b42a');
  };
  B.lake = function (I, gx, gy, w, h, now) {
    const ctx = I.ctx; const pts = []; for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2; const r = 1 + Math.sin(a * 3 + 1) * 0.12 + Math.sin(a * 5) * 0.06; pts.push(I.p(gx + w / 2 + Math.cos(a) * w / 2 * r, gy + h / 2 + Math.sin(a) * h / 2 * r)); }
    I.poly(pts.map(q => [q[0], q[1] + 3]), '#d9c9a0'); I.poly(pts, '#3ea3e8');
    ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.lineWidth = 1.2; for (let i = 0; i < 9; i++) { const q = I.p(gx + 0.8 + (i * 1.7) % (w - 1.5), gy + 0.8 + (i * 2.3) % (h - 1.5)); const o = ((now / 900 + i) % 1) * 6; ctx.beginPath(); ctx.moveTo(q[0] - 6 + o, q[1]); ctx.lineTo(q[0] + 2 + o, q[1]); ctx.stroke(); }
    const j = I.p(gx + w * 0.75, gy + h * 0.85); I.ctx.fillStyle = '#8b5a2b'; I.ctx.fillRect(j[0] - 14, j[1] - 4, 28, 4); [-12, -4, 4, 12].forEach(o => I.ctx.fillRect(j[0] + o, j[1] - 4, 2, 7));
  };
  B.paddock = function (I, gx, gy, w, h) { I.fence(gx, gy, gx + w, gy, Math.round(w * 2)); I.fence(gx, gy, gx, gy + h, Math.round(h * 2)); I.fence(gx + w, gy, gx + w, gy + h, Math.round(h * 2)); I.fence(gx, gy + h, gx + w, gy + h, Math.round(w * 2)); const t = I.p(gx + w - 0.8, gy + 0.6); I.ctx.fillStyle = '#9aa3b0'; I.ctx.fillRect(t[0] - 6, t[1] - 8, 12, 8); I.ctx.fillStyle = '#4fb3f0'; I.ctx.fillRect(t[0] - 5, t[1] - 7, 10, 2); };

  /* ---- ranch props ---- */
  B.windmill = function (I, gx, gy, now) { const b = I.p(gx + 0.5, gy + 0.5); I.ctx.fillStyle = 'rgba(20,40,30,.22)'; I.ctx.beginPath(); I.ctx.ellipse(b[0] + 3, b[1] + 2, 8, 3.5, 0, 0, Math.PI * 2); I.ctx.fill(); [[-5, 0], [5, 0], [0, -6], [0, 6]].forEach(o => I.line([b[0] + o[0], b[1] + o[1] * 0.5], [b[0], b[1] - 46], '#8a8f98', 1.5)); I.line([b[0] - 3, b[1] - 20], [b[0] + 3, b[1] - 20], '#8a8f98', 1); I.line([b[0] - 4, b[1] - 32], [b[0] + 4, b[1] - 32], '#8a8f98', 1); const c = [b[0] + 1, b[1] - 48]; const a0 = reduce ? 0 : now / 900; I.ctx.strokeStyle = '#e6e9ef'; I.ctx.lineWidth = 2; for (let i = 0; i < 8; i++) { const a = a0 + i * Math.PI / 4; I.ctx.beginPath(); I.ctx.moveTo(c[0], c[1]); I.ctx.lineTo(c[0] + Math.cos(a) * 9, c[1] + Math.sin(a) * 9); I.ctx.stroke(); } I.ctx.beginPath(); I.ctx.arc(c[0], c[1], 2, 0, Math.PI * 2); I.ctx.fillStyle = '#3b4252'; I.ctx.fill(); I.line([c[0] - 1, c[1] + 2], [c[0] - 7, c[1] + 6], '#3b4252', 2); };
  B.tank = function (I, gx, gy) { const b = I.p(gx + 0.5, gy + 0.5); I.ctx.fillStyle = 'rgba(20,40,30,.22)'; I.ctx.beginPath(); I.ctx.ellipse(b[0] + 2, b[1] + 1, 9, 4, 0, 0, Math.PI * 2); I.ctx.fill(); I.ctx.fillStyle = '#9aa3b0'; I.ctx.fillRect(b[0] - 7, b[1] - 14, 14, 14); I.ctx.fillStyle = '#7b848f'; I.ctx.fillRect(b[0], b[1] - 14, 7, 14); I.ctx.beginPath(); I.ctx.ellipse(b[0], b[1] - 14, 7, 3, 0, 0, Math.PI * 2); I.ctx.fillStyle = '#4fb3f0'; I.ctx.fill(); for (let v = 3; v < 14; v += 4) I.line([b[0] - 7, b[1] - v], [b[0] + 7, b[1] - v], 'rgba(0,0,0,.18)', 1); };
  B.oak = function (I, gx, gy, size) { size = size || 1; const b = I.p(gx + 0.5, gy + 0.5); I.ctx.fillStyle = 'rgba(20,40,30,.22)'; I.ctx.beginPath(); I.ctx.ellipse(b[0] + 8, b[1] + 3, 18 * size, 7 * size, 0, 0, Math.PI * 2); I.ctx.fill(); I.ctx.strokeStyle = '#5a3a1e'; I.ctx.lineWidth = 4 * size; I.ctx.beginPath(); I.ctx.moveTo(b[0], b[1]); I.ctx.lineTo(b[0] - 2, b[1] - 14 * size); I.ctx.lineTo(b[0] - 9, b[1] - 22 * size); I.ctx.moveTo(b[0] - 2, b[1] - 14 * size); I.ctx.lineTo(b[0] + 8, b[1] - 24 * size); I.ctx.stroke(); const c = ['#4f7f3a', '#5c9143', '#6ea24c']; I.blob(b[0] - 12, b[1] - 24 * size, 11 * size, c[0], 0.8); I.blob(b[0] + 10, b[1] - 26 * size, 12 * size, c[1], 0.8); I.blob(b[0] - 1, b[1] - 33 * size, 13 * size, c[2], 0.8); };
  B.hay = function (I, gx, gy) { const b = I.box(gx + 0.2, gy + 0.25, 0.6, 0.45, 9, '#d9b24c', 0, { tex: 'ribbed', top: 0.12 }); I.line(I.P(b.D, b.C, 0.35), I.up(I.P(b.D, b.C, 0.35), 9), 'rgba(120,80,20,.5)', 1); I.line(I.P(b.D, b.C, 0.65), I.up(I.P(b.D, b.C, 0.65), 9), 'rgba(120,80,20,.5)', 1); };
  B.board = function (I, gx, gy) { /* the bulletin board: start here */ const b = I.p(gx + 0.5, gy + 0.5); I.ctx.fillStyle = 'rgba(20,40,30,.2)'; I.ctx.beginPath(); I.ctx.ellipse(b[0] + 2, b[1] + 1, 12, 4, 0, 0, Math.PI * 2); I.ctx.fill(); I.ctx.fillStyle = '#8b5a2b'; I.ctx.fillRect(b[0] - 10, b[1] - 24, 3, 24); I.ctx.fillRect(b[0] + 7, b[1] - 24, 3, 24); I.roundRect(b[0] - 14, b[1] - 34, 28, 16, 2, '#c9a06a'); I.ctx.fillStyle = '#fff8e0'; I.ctx.fillRect(b[0] - 11, b[1] - 31, 9, 6); I.ctx.fillRect(b[0] + 1, b[1] - 31, 9, 6); I.ctx.fillRect(b[0] - 11, b[1] - 24, 9, 4); I.ctx.fillStyle = '#e8552f'; I.ctx.fillRect(b[0] + 2, b[1] - 24, 8, 4); I.poly([[b[0] - 16, b[1] - 34], [b[0], b[1] - 40], [b[0] + 16, b[1] - 34]], '#8a5a3a'); };
  B.homestead = function (I, gx, gy, now, tier) {
    const two = tier >= 4, H = two ? 58 : 36, w = tier >= 5 ? 1.9 : 1.5;
    I.poly([I.p(gx - 0.4, gy - 0.4), I.p(gx + w + 0.6, gy - 0.4), I.p(gx + w + 0.6, gy + 2.2), I.p(gx - 0.4, gy + 2.2)], '#c9b98a');
    const b = I.box(gx, gy, w, 1.4, H, '#f1e7d2', 0, { tex: 'siding' });
    I.win(b.D, b.C, 0.08, 12, 0.18, 14, true); I.win(b.D, b.C, 0.74, 12, 0.18, 14, true); I.door(b.D, b.C, 0.41, 0.18, 24, '#6b3a22'); I.win(b.C, b.B, 0.2, 12, 0.25, 14, true); I.win(b.C, b.B, 0.6, 12, 0.25, 14, false);
    if (two) { I.win(b.D, b.C, 0.08, 40, 0.18, 14, false); I.win(b.D, b.C, 0.41, 40, 0.18, 14, true); I.win(b.D, b.C, 0.74, 40, 0.18, 14, true); }
    I.box(gx - 0.05, gy + 1.4, w + 0.1, 0.55, 3, '#c9a06a', 0, { noShadow: true, top: 0.1 }); [0.05, 0.5, 0.95].forEach(u => I.box(gx + u * w - 0.03, gy + 1.88, 0.06, 0.06, 26, '#f1e7d2', 3, { noShadow: true }));
    I.poly([I.p(gx - 0.1, gy + 1.4, 29), I.p(gx + w + 0.1, gy + 1.4, 29), I.p(gx + w + 0.1, gy + 2.0, 24), I.p(gx - 0.1, gy + 2.0, 24)], '#8a5a3a');
    I.roof(gx, gy, w, 1.4, H, 24, '#8a5a3a'); I.chimney(gx + w - 0.3, gy + 0.2, H + 10, '#b3ada3'); const c = I.p(gx + w - 0.24, gy + 0.26, H + 28); I.smoke(c[0], c[1], now);
  };
  B.plot = function (I, gx, gy, owner, now) {
    /* a learner's plot on the NextWork World map: a little home if they have
     * built, a stake and a name if they are just starting */
    I.poly([I.p(gx - 0.6, gy - 0.6), I.p(gx + 1.8, gy - 0.6), I.p(gx + 1.8, gy + 1.8), I.p(gx - 0.6, gy + 1.8)], owner.mine ? 'rgba(255,197,49,.28)' : 'rgba(255,255,255,.14)', owner.mine ? '#ffc531' : 'rgba(255,255,255,.55)', owner.mine ? 2 : 1);
    if (owner.built > 0) B.house(I, gx + 0.1, gy + 0.1, 1, now, owner.built >= 20 ? 3 : owner.built >= 5 ? 2 : 1); else { const s = I.p(gx + 0.6, gy + 0.6); I.ctx.fillStyle = '#8b5a2b'; I.ctx.fillRect(s[0] - 1, s[1] - 16, 2, 16); I.roundRect(s[0] - 8, s[1] - 20, 16, 7, 1.5, '#f4f1e8'); }
  };

  /* ---- the avatar: you, as you built yourself ---- */
  function hat(I, x, y, kind, colour) {
    if (kind === 'cap') { I.roundRect(x - 4.2, y - 2, 8.4, 3.5, 1.5, colour); I.roundRect(x - 1, y - 0.5, 7, 1.6, 0.8, colour); }
    else if (kind === 'hard') { I.roundRect(x - 4.4, y - 0.8, 8.8, 2.2, 1, colour); I.roundRect(x - 3.2, y - 4, 6.4, 3.8, 2.4, colour); }
    else if (kind === 'cowboy') { I.roundRect(x - 6.5, y - 0.6, 13, 2, 1, colour); I.roundRect(x - 3.4, y - 5, 6.8, 5, 2, colour); I.ctx.fillStyle = 'rgba(0,0,0,.25)'; I.ctx.fillRect(x - 3.4, y - 1.6, 6.8, 1); }
    else if (kind === 'beanie') { I.roundRect(x - 4, y - 4.5, 8, 5, 2.5, colour); I.blob(x, y - 5, 1.6, colour); }
  }
  B.avatar = function (I, gx, gy, av, walkT, moving) {
    av = av || {}; const c = I.p(gx, gy); const bob = moving ? Math.sin(walkT * 12) * 0.7 : 0, swing = moving ? Math.sin(walkT * 12) * 1.2 : 0;
    I.ctx.fillStyle = 'rgba(20,40,30,.28)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] + 1, c[1] + 0.5, 5, 2.2, 0, 0, Math.PI * 2); I.ctx.fill();
    if (av.body === 'pineapple') {
      /* the pineapple: legs, an oval body with the diamond skin, a face, the crown */
      I.ctx.fillStyle = '#2b3a5c'; I.ctx.fillRect(c[0] - 2.6, c[1] - 5 + bob, 2, 5 + swing); I.ctx.fillRect(c[0] + 0.6, c[1] - 5 + bob, 2, 5 - swing);
      I.ctx.fillStyle = '#3b4252'; I.ctx.fillRect(c[0] - 3.2, c[1] - 0.6 + bob, 3, 1.4); I.ctx.fillRect(c[0] + 0.4, c[1] - 0.6 + bob, 3, 1.4);
      const by = c[1] - 12 + bob; I.blob(c[0], by, 6.2, '#f2b42a', 1.25);
      I.ctx.save(); I.ctx.beginPath(); I.ctx.ellipse(c[0], by, 6.2, 7.7, 0, 0, Math.PI * 2); I.ctx.clip(); I.ctx.strokeStyle = 'rgba(140,80,10,.45)'; I.ctx.lineWidth = 0.8; for (let d = -14; d < 14; d += 3.2) { I.ctx.beginPath(); I.ctx.moveTo(c[0] + d - 8, by + 8); I.ctx.lineTo(c[0] + d + 8, by - 8); I.ctx.stroke(); I.ctx.beginPath(); I.ctx.moveTo(c[0] + d + 8, by + 8); I.ctx.lineTo(c[0] + d - 8, by - 8); I.ctx.stroke(); } I.ctx.restore();
      I.ctx.fillStyle = '#2a1d0e'; I.ctx.fillRect(c[0] - 2.6, by - 1.5, 1.4, 1.8); I.ctx.fillRect(c[0] + 1.2, by - 1.5, 1.4, 1.8); I.ctx.strokeStyle = '#2a1d0e'; I.ctx.lineWidth = 0.9; I.ctx.beginPath(); I.ctx.arc(c[0], by + 1.6, 2.2, 0.25, Math.PI - 0.25); I.ctx.stroke();
      I.ctx.fillStyle = 'rgba(255,255,255,.35)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] - 2.6, by - 4, 1.6, 2.4, -0.4, 0, Math.PI * 2); I.ctx.fill();
      if (av.shirt) { I.ctx.fillStyle = av.shirt; I.ctx.beginPath(); I.ctx.ellipse(c[0], by + 4.6, 5.4, 2.6, 0, 0, Math.PI); I.ctx.fill(); }
      const top = by - 7.5; [[-4, -3, -6], [-2, -1.5, -9], [0, 0, -10.5], [2, 1.5, -9], [4, 3, -6]].forEach(l => { I.ctx.fillStyle = l[0] % 4 === 0 ? '#3fa66b' : '#5cc464'; I.ctx.beginPath(); I.ctx.moveTo(c[0] + l[0] * 0.55, top + 1.5); I.ctx.lineTo(c[0] + l[1] + l[0] * 0.9, top + l[2]); I.ctx.lineTo(c[0] + l[0] * 0.55 + 1.6, top + 1.5); I.ctx.closePath(); I.ctx.fill(); });
      hat(I, c[0], top - 1, av.hat, av.hatColour || '#8a5a3a');
      I.ctx.fillStyle = '#f2b42a'; I.ctx.fillRect(c[0] - 8, by + 1 + swing * 0.5, 2.4, 1.6); I.ctx.fillRect(c[0] + 5.6, by + 1 - swing * 0.5, 2.4, 1.6);
      return;
    }
    /* a person: legs, shirt, head, hair, and a hat if you picked one */
    I.ctx.fillStyle = '#2b3a5c'; I.ctx.fillRect(c[0] - 2.4, c[1] - 5.5 + bob, 1.8, 5 + swing); I.ctx.fillRect(c[0] + 0.6, c[1] - 5.5 + bob, 1.8, 5 - swing);
    I.roundRect(c[0] - 3.5, c[1] - 13 + bob, 7, 8.5, 2.5, av.shirt || '#2f7fd6'); I.blob(c[0], c[1] - 16 + bob, 3.5, av.skin || '#ffd6ad');
    I.ctx.fillStyle = av.hair || '#4a2e1a'; I.ctx.beginPath(); I.ctx.ellipse(c[0], c[1] - 17.5 + bob, 3.5, 2, 0, Math.PI, 0); I.ctx.fill();
    hat(I, c[0], c[1] - 18.5 + bob, av.hat, av.hatColour || '#8a5a3a');
  };

  /* ---- a hub: a building the size of headquarters, with its name on it ---- */
  const HUB_LOOK = { datacentre: ['#8a95a6', 'ribbed', '#c9d1dc'], lab: ['#efe9dc', 'stone', '#5a3aa8'], workshop: ['#e3a45b', 'brick', '#4b5563'], vault: ['#b3ada3', 'stone', '#6b7280'], library: ['#c9503c', 'brick', '#8a5a3a'], clinic: ['#f4f6f8', 'siding', '#dfe5ee'], bank: ['#e9e2d0', 'stone', '#c9971f'], home: ['#f3e6cc', 'siding', '#d9563f'] };
  B.bighub = function (I, gx, gy, now, hub) {
    const look = HUB_LOOK[hub.kind] || HUB_LOOK.home, H = 84;
    I.box(gx - 0.4, gy - 0.4, 3.8, 3.8, 4, '#d6d1c4', 0, { top: 0.1, tex: 'stone' });
    const b = I.box(gx, gy, 3, 3, H, look[0], 4, { tex: look[1] });
    for (let r = 0; r < 3; r++) for (let u = 0.08; u < 0.95; u += 0.16) { if (r === 0 && u > 0.35 && u < 0.6) continue; I.win(b.D, b.C, u, 12 + r * 24, 0.09, 15, ((r * 7 + Math.floor(u * 10)) % 3) !== 0); }
    for (let r = 0; r < 3; r++) [0.15, 0.45, 0.75].forEach((u, i) => I.win(b.C, b.B, u, 12 + r * 24, 0.16, 15, (r + i) % 2 === 0));
    const a = I.P(b.D, b.C, 0.38), c = I.P(b.D, b.C, 0.62); I.poly([a, c, I.up(c, 28), I.up(a, 28)], '#efe9dc'); I.poly([I.P(a, c, 0.15), I.P(a, c, 0.85), I.up(I.P(a, c, 0.85), 24), I.up(I.P(a, c, 0.15), 24)], '#3b4252'); I.line(I.P(a, c, 0.5), I.up(I.P(a, c, 0.5), 24), '#9ad3ff', 1.2);
    [0.02, 0.98].forEach(u => I.box(gx + u * 2.94, gy + 3.05, 0.06, 0.06, 30, '#efe9dc', 4, { noShadow: true })); I.poly([I.p(gx - 0.1, gy + 3.0, 34), I.p(gx + 3.1, gy + 3.0, 34), I.p(gx + 3.1, gy + 3.35, 31), I.p(gx - 0.1, gy + 3.35, 31)], look[2]);
    I.flatRoof(gx, gy, 3, 3, H + 4, look[2]);
    /* the name, on the building, big: a board across the front and one on the roof */
    const s = I.up(I.P(b.D, b.C, 0.5), H - 12); const w = Math.hypot(b.C[0] - b.D[0], b.C[1] - b.D[1]) * 0.92; I.roundRect(s[0] - w / 2, s[1] - 9, w, 18, 3, '#172033'); I.ctx.fillStyle = '#ffc531'; I.ctx.font = '800 11px Baloo 2, system-ui, sans-serif'; I.ctx.textAlign = 'center'; I.ctx.fillText(hub.name.toUpperCase(), s[0], s[1] + 4); I.ctx.textAlign = 'left'; I.lights.push({ x: s[0], y: s[1], r: w * 0.45, c: '255,197,49', k: 0.45 });
    const rb = I.box(gx + 0.5, gy + 0.4, 2, 0.25, 18, '#172033', H + 8, { noShadow: true }); I.ctx.fillStyle = '#ffc531'; I.ctx.font = '800 9px Baloo 2, system-ui, sans-serif'; I.ctx.textAlign = 'center'; const rs = I.up(I.P(rb.D, rb.C, 0.5), 6); I.ctx.fillText(hub.name.toUpperCase(), rs[0], rs[1] + 3); I.ctx.textAlign = 'left';
    const f = I.p(gx + 2.7, gy + 0.3, H + 8); I.line(f, [f[0], f[1] - 22], '#e6e9ef', 2); const wv = Math.sin(now / 300 + gx) * 2; I.poly([[f[0], f[1] - 22], [f[0] + 13, f[1] - 19 + wv], [f[0], f[1] - 15]], '#ffc531');
  };

  /* ---- the entry: a ranch archway on the fence line, and what sits outside it ---- */
  B.arch = function (I, gx, gy, text) {
    /* two posts either side of the road and a beam with the name on it */
    const H = 52; [gx - 2.2, gx + 2.2].forEach(x => { I.box(x - 0.15, gy - 0.15, 0.3, 0.3, H, '#8a5a3a', 0, { tex: 'siding' }); });
    const a = I.p(gx - 2.2, gy, H), b = I.p(gx + 2.2, gy, H);
    I.line([a[0], a[1] - 2], [b[0], b[1] - 2], '#6b3a22', 8); I.line([a[0], a[1] - 2], [b[0], b[1] - 2], '#8a5a3a', 5);
    const m = I.P(a, b, 0.5); I.roundRect(m[0] - 46, m[1] - 20, 92, 22, 3, '#4a2b17'); I.ctx.strokeStyle = '#ffc531'; I.ctx.lineWidth = 1.5; I.ctx.strokeRect(m[0] - 43, m[1] - 17, 86, 16);
    I.ctx.fillStyle = '#ffe9a6'; I.ctx.font = '800 9px Baloo 2, system-ui, sans-serif'; I.ctx.textAlign = 'center'; I.ctx.fillText(text.toUpperCase(), m[0], m[1] - 6); I.ctx.textAlign = 'left';
    I.blob(m[0], m[1] - 26, 4, '#ffc531'); I.ctx.fillStyle = '#4a2b17'; I.ctx.font = '800 6px Baloo 2, system-ui, sans-serif'; I.ctx.textAlign = 'center'; I.ctx.fillText('NW', m[0], m[1] - 24); I.ctx.textAlign = 'left';
  };
  B.bikerack = function (I, gx, gy, n) {
    const a = I.p(gx, gy + 0.5), b = I.p(gx + n * 0.5, gy + 0.5); I.line([a[0], a[1] - 6], [b[0], b[1] - 6], '#8a8f98', 2);
    for (let i = 0; i <= n; i++) { const q = I.P(a, b, i / n); I.ctx.strokeStyle = '#8a8f98'; I.ctx.lineWidth = 1.5; I.ctx.beginPath(); I.ctx.arc(q[0], q[1] - 4, 4, Math.PI, 0); I.ctx.stroke(); }
    for (let i = 0; i < n; i++) { if (i % 3 === 2) continue; const q = I.P(a, b, (i + 0.5) / n); I.wheel(q[0] - 3, q[1] + 1, 2.6); I.wheel(q[0] + 3, q[1] + 1, 2.6); I.line([q[0] - 3, q[1] + 1], [q[0] + 1, q[1] - 4], ['#e8552f', '#2f7fd6', '#3fa66b', '#f2b42a'][i % 4], 1.5); I.line([q[0] + 1, q[1] - 4], [q[0] + 3, q[1] + 1], ['#e8552f', '#2f7fd6', '#3fa66b', '#f2b42a'][i % 4], 1.5); }
  };
  B.sign = function (I, gx, gy, text, sub) { const q = I.p(gx + 0.5, gy + 0.5); I.ctx.fillStyle = '#3b4252'; I.ctx.fillRect(q[0] - 1, q[1] - 22, 2, 22); I.roundRect(q[0] - 22, q[1] - 34, 44, 14, 2, '#172033'); I.ctx.fillStyle = '#fff'; I.ctx.font = '800 6.5px Baloo 2, system-ui, sans-serif'; I.ctx.textAlign = 'center'; I.ctx.fillText(text, q[0], q[1] - 27); if (sub) { I.ctx.fillStyle = '#ffc531'; I.ctx.font = '700 5px Nunito, system-ui, sans-serif'; I.ctx.fillText(sub, q[0], q[1] - 21.5); } I.ctx.textAlign = 'left'; };

  /* ---- the ranch: cows, chickens, coops; the lodge; the halls at the back ---- */
  B.cow = function (I, gx, gy, walkT) {
    const c = I.p(gx, gy); const bob = Math.sin(walkT * 6) * 0.4;
    I.ctx.fillStyle = 'rgba(20,40,30,.25)'; I.ctx.beginPath(); I.ctx.ellipse(c[0] + 2, c[1] + 1, 10, 3.2, 0, 0, Math.PI * 2); I.ctx.fill();
    I.ctx.fillStyle = '#2a2a2a'; [[-7, 0], [-3, 1], [3, 1], [7, 0]].forEach((l, i) => I.ctx.fillRect(c[0] + l[0], c[1] - 6 + l[1] + bob, 2.2, 6 + Math.sin(walkT * 6 + i) * 0.8));
    I.roundRect(c[0] - 9.5, c[1] - 13 + bob, 18, 8, 3.5, '#f4f1e8'); I.ctx.fillStyle = '#2a2a2a'; I.ctx.beginPath(); I.ctx.ellipse(c[0] - 4, c[1] - 9 + bob, 3.5, 2.6, 0.3, 0, Math.PI * 2); I.ctx.fill(); I.ctx.beginPath(); I.ctx.ellipse(c[0] + 4, c[1] - 10 + bob, 2.6, 2, -0.4, 0, Math.PI * 2); I.ctx.fill();
    I.roundRect(c[0] + 7, c[1] - 15 + bob, 6, 6, 2, '#f4f1e8'); I.ctx.fillStyle = '#e8b48a'; I.ctx.fillRect(c[0] + 9.5, c[1] - 11.5 + bob, 4, 2.5); I.ctx.fillStyle = '#2a2a2a'; I.ctx.fillRect(c[0] + 11, c[1] - 14 + bob, 1, 1); I.ctx.fillStyle = '#e9e4d6'; I.ctx.fillRect(c[0] + 7.5, c[1] - 16.5 + bob, 1.5, 2); I.ctx.fillRect(c[0] + 11.5, c[1] - 16.5 + bob, 1.5, 2);
    I.ctx.fillStyle = '#e8b48a'; I.ctx.fillRect(c[0] - 4, c[1] - 6 + bob, 4, 2.5); I.ctx.strokeStyle = '#2a2a2a'; I.ctx.lineWidth = 1; I.ctx.beginPath(); I.ctx.moveTo(c[0] - 9.5, c[1] - 10 + bob); I.ctx.lineTo(c[0] - 12, c[1] - 6 + bob); I.ctx.stroke();
  };
  B.chicken = function (I, gx, gy, t) { const c = I.p(gx, gy); const peck = Math.sin(t * 5) > 0.7 ? 1.5 : 0; I.ctx.fillStyle = 'rgba(20,40,30,.2)'; I.ctx.beginPath(); I.ctx.ellipse(c[0], c[1], 3, 1.2, 0, 0, Math.PI * 2); I.ctx.fill(); I.ctx.fillStyle = '#f2b42a'; I.ctx.fillRect(c[0] - 1.2, c[1] - 2, 1, 2); I.ctx.fillRect(c[0] + 0.4, c[1] - 2, 1, 2); I.blob(c[0], c[1] - 4, 2.6, '#f4f1e8', 0.85); I.blob(c[0] + 2.2, c[1] - 6.5 + peck, 1.5, '#f4f1e8'); I.ctx.fillStyle = '#e8352f'; I.ctx.fillRect(c[0] + 1.6, c[1] - 8.6 + peck, 1.4, 1.2); I.ctx.fillStyle = '#f2b42a'; I.ctx.fillRect(c[0] + 3.4, c[1] - 6.6 + peck, 1.6, 0.9); I.ctx.fillStyle = '#8a5a3a'; I.ctx.fillRect(c[0] - 3, c[1] - 6, 1.2, 2); };
  B.coop = function (I, gx, gy, now) { const b = I.box(gx, gy, 1, 0.7, 14, '#c9503c', 0, { tex: 'siding' }); I.roof(gx, gy, 1, 0.7, 14, 8, '#4b5563', 0.1); const a = I.P(b.D, b.C, 0.2), c = I.P(b.D, b.C, 0.42); I.poly([a, c, I.up(c, 8), I.up(a, 8)], '#3b2a1e'); I.box(gx + 0.55, gy + 0.72, 0.4, 0.06, 6, '#9aa3b0', 0, { noShadow: true }); I.fence(gx - 0.2, gy + 1.0, gx + 1.6, gy + 1.0, 5); I.fence(gx + 1.6, gy - 0.2, gx + 1.6, gy + 1.0, 4); for (let i = 0; i < 3; i++) B.chicken(I, gx + 1.1 + (i % 2) * 0.35 + Math.sin(now / 1500 + i) * 0.15, gy + 0.85 + i * 0.12, now / 1000 + i); };
  B.lodge = function (I, gx, gy, k, now, tier) {
    /* a cabin for a learner staying a while: log walls, a porch light, a bush by the step */
    const b = I.box(gx + 0.1, gy + 0.1, 0.8, 0.8, 30, '#c9a06a', 0, { tex: 'siding' }); I.win(b.D, b.C, 0.12, 10, 0.24, 12, tier > 0); I.door(b.D, b.C, 0.58, 0.24, 20, '#6b3a22'); I.win(b.C, b.B, 0.25, 10, 0.3, 12, false);
    I.roof(gx + 0.1, gy + 0.1, 0.8, 0.8, 30, 18, '#3f6b3a'); const l = I.up(I.P(b.D, b.C, 0.42), 24); I.blob(l[0], l[1], 1.6, '#ffe9a6'); I.lights.push({ x: l[0], y: l[1], r: 22, c: '255,226,150', k: 0.8 }); I.bush(gx - 0.05, gy + 0.95, true);
  };
  B.hallwide = function (I, gx, gy, now, name, colour, roofColour) {
    /* a wide competition hall: six by three, a glass front, the name across it */
    I.box(gx - 0.3, gy - 0.3, 6.6, 3.6, 4, '#d6d1c4', 0, { top: 0.1, tex: 'stone' });
    const H = 60, b = I.box(gx, gy, 6, 3, H, colour, 4, { tex: 'brick' });
    I.faceTex(b.D, b.C, H * 0.55, 'glass', '#2f4f7f'); for (let u = 0.06; u < 0.95; u += 0.11) I.win(b.D, b.C, u, 40, 0.07, 14, (Math.floor(u * 100) % 2) === 0);
    const a = I.P(b.D, b.C, 0.42), c = I.P(b.D, b.C, 0.58); I.poly([a, c, I.up(c, 26), I.up(a, 26)], '#efe9dc'); I.poly([I.P(a, c, 0.12), I.P(a, c, 0.88), I.up(I.P(a, c, 0.88), 22), I.up(I.P(a, c, 0.12), 22)], '#3b4252');
    I.win(b.C, b.B, 0.2, 14, 0.25, 16, true); I.win(b.C, b.B, 0.6, 14, 0.25, 16, true); I.win(b.C, b.B, 0.2, 38, 0.25, 16, false); I.win(b.C, b.B, 0.6, 38, 0.25, 16, true);
    I.flatRoof(gx, gy, 6, 3, H + 4, roofColour); const s = I.up(I.P(b.D, b.C, 0.5), H - 4); const w = Math.hypot(b.C[0] - b.D[0], b.C[1] - b.D[1]) * 0.9; I.roundRect(s[0] - w / 2, s[1] - 9, w, 18, 3, '#172033'); I.ctx.fillStyle = '#ffc531'; I.ctx.font = '800 10.5px Baloo 2, system-ui, sans-serif'; I.ctx.textAlign = 'center'; I.ctx.fillText(name.toUpperCase(), s[0], s[1] + 4); I.ctx.textAlign = 'left'; I.lights.push({ x: s[0], y: s[1], r: w * 0.5, c: '255,197,49', k: 0.5 });
    [[0.5, 0.4], [5.3, 0.4]].forEach(o => { const f = I.p(gx + o[0], gy + o[1], H + 8); I.line(f, [f[0], f[1] - 20], '#e6e9ef', 2); const wv = Math.sin(now / 300 + o[0]) * 2; I.poly([[f[0], f[1] - 20], [f[0] + 12, f[1] - 17 + wv], [f[0], f[1] - 13]], '#ffc531'); });
  };
  NW.B = B; NW.drop = drop;
})();
