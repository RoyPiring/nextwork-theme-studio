/* NextWorld · global: the whole map, and where learners are
 * The same isometric ground, at world scale. Continents are painted from a
 * few ellipses so nothing is loaded. Population needs a count NextWork
 * publishes; until then production says so and dev shows sample dots. */
(function () {
  'use strict';
  const S = NW.State, W = 52, H = 26;
  const LANDS = [[10, 7, 7, 5], [6, 4, 3, 1.6], [14, 16, 3.5, 5.2], [25, 6, 4.2, 2.6], [22.5, 4.6, 1.1, 1], [26.5, 13, 4.2, 5.6], [35, 7, 9.5, 5], [33.5, 12, 2.2, 2.6], [41, 18.5, 3.6, 2.4], [45, 8.5, 1.4, 2.2]];
  const isLand = (gx, gy) => LANDS.some(e => { const dx = (gx - e[0]) / e[2], dy = (gy - e[1]) / e[3]; return dx * dx + dy * dy < 1 + (S.hash(gx * 3, gy * 5) - 0.5) * 0.35; });
  const SAMPLE = [['Texas', 8, 10, 140], ['California', 4.5, 8.5, 90], ['New York', 14, 7, 70], ['UK', 22.5, 4.6, 80], ['Germany', 26, 6, 40], ['Nigeria', 24.5, 11.5, 110], ['Kenya', 28.5, 14, 45], ['India', 33.5, 12, 160], ['Singapore', 37.5, 13.5, 30], ['Philippines', 40.5, 12, 60], ['Brazil', 15, 15, 50], ['Australia', 41.5, 18.5, 35]];
  function drawGlobal(I, state, now) {
    const ctx = I.ctx;
    for (let gy = 0; gy < H; gy++) for (let gx = 0; gx < W; gx++) { if (!I.onScreen(gx, gy)) continue; I.tile(gx, gy, isLand(gx, gy) ? NW.Land.groundColour(gx * 2 + 300, gy * 2) : ((Math.floor(now / 700) + gx + gy) % 7 === 0 ? '#4fb3f0' : '#3ea3e8')); }
    if (state.mode === 'dev') SAMPLE.forEach((d, i) => { const q = I.p(d[1], d[2]); const r = 4 + Math.sqrt(d[3]) * 1.1, pulse = 1 + Math.sin(now / 900 + i) * 0.08; ctx.fillStyle = 'rgba(255,197,49,.22)'; ctx.beginPath(); ctx.ellipse(q[0], q[1], r * 2 * pulse, r * pulse, 0, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffc531'; ctx.beginPath(); ctx.ellipse(q[0], q[1], r * 0.55, r * 0.3, 0, 0, Math.PI * 2); ctx.fill(); ctx.strokeStyle = 'rgba(74,43,0,.6)'; ctx.lineWidth = 1; ctx.stroke(); I.label(d[1], d[2] + 1.1, d[0], d[3] + ' building', 8); });
    const hq = I.p(43.5, 20.5); NW.B.tower_hq(I, 42.5, 19.5, now); I.label(43.5, 23.2, 'NextWork', 'everywhere', 9);
    return hq;
  }
  NW.Global = { W, H, drawGlobal, SAMPLE };
})();
