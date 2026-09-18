/* NextWorld · global: the globe
 * An actual globe, drawn straight onto the canvas: land painted from a few
 * dozen lat/lon ellipses, lit from the top left, spinning slowly until you
 * take hold of it. NextWork is pinned in Houston. Each learner is a plot
 * of land on it, not a building. Population needs a count NextWork
 * publishes; until then production says so and dev shows sample plots. */
'use strict';
(function () {
  const S = NW.State, clamp = NW.clamp;
  const D = Math.PI / 180;
  /* lon, lat, half-width, half-height, in degrees */
  const LANDS = [[-100, 45, 28, 17], [-150, 64, 12, 6], [-95, 66, 26, 8], [-102, 23, 9, 7], [-88, 13, 6, 4], [-42, 72, 12, 9],
    [-60, -8, 16, 18], [-64, -34, 7, 14], [15, 50, 18, 10], [15, 63, 9, 8], [-3, 54, 3.5, 5], [-5, 40, 5, 4],
    [20, 5, 20, 22], [10, 25, 25, 10], [47, -20, 3, 6], [45, 27, 12, 9], [95, 62, 60, 12], [70, 45, 25, 10],
    [105, 35, 20, 13], [78, 20, 10, 12], [102, 12, 8, 8], [115, -3, 22, 5], [138, 37, 4, 9], [134, -25, 18, 12], [172, -41, 3, 6]];
  const isLand = (lon, lat) => lat < -70 || LANDS.some(e => { const dx = ((lon - e[0] + 540) % 360 - 180) / e[2], dy = (lat - e[1]) / e[3]; return dx * dx + dy * dy < 1 + (S.hash(lon * 2, lat * 2) - 0.5) * 0.5; });
  /* the land, once, as cells */
  const STEP = 2.5, CELLS = []; for (let lat = -87.5; lat < 90; lat += STEP) for (let lon = -180; lon < 180; lon += STEP) if (isLand(lon, lat)) CELLS.push([lon, lat, S.hash(lon, lat)]);
  const HOUSTON = [-95.37, 29.76];
  const SAMPLE = [['Houston', -95.4, 29.8, 140], ['Austin', -97.7, 30.3, 60], ['Dallas', -96.8, 32.8, 45], ['Los Angeles', -118.2, 34.1, 70], ['New York', -74, 40.7, 70], ['Toronto', -79.4, 43.7, 30],
    ['London', -0.1, 51.5, 80], ['Berlin', 13.4, 52.5, 40], ['Lagos', 3.4, 6.5, 110], ['Nairobi', 36.8, -1.3, 45], ['Cairo', 31.2, 30, 25], ['Dubai', 55.3, 25.2, 30],
    ['Bangalore', 77.6, 13, 160], ['Mumbai', 72.9, 19.1, 90], ['Lahore', 74.3, 31.5, 40], ['Singapore', 103.8, 1.3, 30], ['Manila', 121, 14.6, 60], ['Sydney', 151.2, -33.9, 35], ['Wellington', 174.8, -41.3, 20], ['São Paulo', -46.6, -23.5, 50]];
  function project(lon, lat, view, R, cx, cy) {
    const la = lat * D, lo = (lon - view.yaw) * D; const x = Math.cos(la) * Math.sin(lo), y = Math.sin(la), z = Math.cos(la) * Math.cos(lo);
    const p = view.pitch * D; const y2 = y * Math.cos(p) - z * Math.sin(p), z2 = y * Math.sin(p) + z * Math.cos(p);
    return { x: cx + R * x, y: cy - R * y2, z: z2, lit: 0.55 + 0.45 * clamp((x * -0.4 + y2 * 0.5 + z2) / 1.2, 0, 1) };
  }
  function drawGlobe(ctx, W, H, state, now, view) {
    const R = Math.min(W, H) * 0.42, cx = W / 2, cy = H / 2 + 8;
    const sky = ctx.createLinearGradient(0, 0, 0, H); sky.addColorStop(0, '#0b1730'); sky.addColorStop(1, '#16325a'); ctx.fillStyle = sky; ctx.fillRect(0, 0, W, H);
    for (let i = 0; i < 70; i++) { const x = (i * 131 + 17) % W, y = (i * 71 + 5) % H; if (Math.hypot(x - cx, y - cy) < R + 10) continue; ctx.fillStyle = 'rgba(255,255,255,' + (0.25 + (i % 5) * 0.12) + ')'; ctx.fillRect(x, y, 1.5, 1.5); }
    ctx.fillStyle = 'rgba(79,179,240,.18)'; ctx.beginPath(); ctx.arc(cx, cy, R + 10, 0, Math.PI * 2); ctx.fill();
    const sea = ctx.createRadialGradient(cx - R * 0.4, cy - R * 0.45, R * 0.1, cx, cy, R); sea.addColorStop(0, '#5cc0f5'); sea.addColorStop(0.7, '#2f8fd6'); sea.addColorStop(1, '#173f75'); ctx.fillStyle = sea; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    const size = R * STEP * D;
    CELLS.forEach(c => { const q = project(c[0], c[1], view, R, cx, cy); if (q.z <= 0.02) return; const w = size * Math.cos(c[1] * D) * 0.95 + 0.6, h = size * 0.95 + 0.6; const g = 0x5c + Math.round(c[2] * 40), col = [Math.round((g - 20) * q.lit), Math.round((g + 60) * q.lit), Math.round((g - 30) * q.lit)]; ctx.fillStyle = 'rgb(' + col.join(',') + ')'; ctx.fillRect(q.x - w / 2, q.y - h / 2, w, h); });
    /* the terminator's soft edge */
    const rim = ctx.createRadialGradient(cx, cy, R * 0.86, cx, cy, R); rim.addColorStop(0, 'rgba(10,20,40,0)'); rim.addColorStop(1, 'rgba(10,20,40,.55)'); ctx.fillStyle = rim; ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.fill();
    /* learners: plots of land, sized by how many */
    const hits = [];
    if (state.mode === 'dev') SAMPLE.forEach((d, i) => { const q = project(d[1], d[2], view, R, cx, cy); if (q.z <= 0.05) return; const s = 4 + Math.sqrt(d[3]) * 0.9, pulse = 1 + Math.sin(now / 900 + i) * 0.06; ctx.fillStyle = 'rgba(255,197,49,.25)'; ctx.beginPath(); ctx.arc(q.x, q.y, s * 1.8 * pulse, 0, Math.PI * 2); ctx.fill(); ctx.fillStyle = '#ffc531'; ctx.strokeStyle = '#4a2b00'; ctx.lineWidth = 1; ctx.beginPath(); ctx.rect(q.x - s / 2, q.y - s / 2, s, s); ctx.fill(); ctx.stroke(); hits.push({ d, x: q.x, y: q.y, r: s * 1.8 }); });
    /* NextWork, in Houston */
    const hq = project(HOUSTON[0], HOUSTON[1], view, R, cx, cy);
    if (hq.z > 0.05) { ctx.strokeStyle = '#fff'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(hq.x, hq.y); ctx.lineTo(hq.x, hq.y - 22); ctx.stroke(); ctx.fillStyle = '#ffc531'; ctx.beginPath(); ctx.moveTo(hq.x, hq.y - 22); ctx.lineTo(hq.x + 16, hq.y - 18); ctx.lineTo(hq.x, hq.y - 14); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(hq.x, hq.y, 3, 0, Math.PI * 2); ctx.fill(); ctx.font = '800 12px Baloo 2, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(16,24,44,.8)'; ctx.strokeText('NextWork · Houston', hq.x, hq.y - 28); ctx.fillStyle = '#fff'; ctx.fillText('NextWork · Houston', hq.x, hq.y - 28); ctx.textAlign = 'left'; hits.push({ hq: true, x: hq.x, y: hq.y, r: 14 }); }
    return hits;
  }
  NW.Global = { drawGlobe, SAMPLE, HOUSTON };
})();
