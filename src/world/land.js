/* NextWorld · land: your world, drawn
 * Hill Country. Grass that dries on the high ground, a creek, worn paths
 * that appear where you have walked, and one figure on it: you. */
'use strict';
(function () {
  const { B, clamp, lerp, ease, rgb, reduce, TIERS, tierOf, KIND_NAME } = NW;
  const S = NW.State, { LAND, HOME, CROSSINGS } = S;

  const groundColour = (gx, gy) => { const h = S.height(gx, gy); if (h > 0.68) return (gx + gy) % 2 ? '#d9d2b8' : '#cfc7aa'; const dry = clamp((h - 0.25) * 2.2, 0, 1); return rgb([lerp(0x7f, 0xb9, dry), lerp(0xb3, 0xb1, dry), lerp(0x5a, 0x62, dry)].map(Math.round)); };
  const walkable = (gx, gy) => gx >= 0.5 && gy >= 0.5 && gx < LAND - 0.5 && gy < LAND - 0.5 && (!S.inCreek(Math.floor(gx), Math.floor(gy)) || CROSSINGS.includes(Math.floor(gy)));

  /* you */
  function makeMe(state) { const m = state.me && typeof state.me.gx === 'number' ? state.me : { gx: HOME[0] + 0.6, gy: HOME[1] + 1.6 }; return { gx: m.gx, gy: m.gy, target: null, moving: false, keys: {}, follow: true }; }
  function stepMe(me, onBlocked) {
    const k = me.keys; const dx = (k.ArrowRight || k.d ? 1 : 0) - (k.ArrowLeft || k.a ? 1 : 0), dy = (k.ArrowDown || k.s ? 1 : 0) - (k.ArrowUp || k.w ? 1 : 0);
    if (dx || dy) { me.target = null; const gx = (dx + dy) * 0.5, gy = (dy - dx) * 0.5, n = Math.hypot(gx, gy) || 1; const nx = me.gx + gx / n * 0.06, ny = me.gy + gy / n * 0.06; if (walkable(nx, ny)) { me.gx = nx; me.gy = ny; } me.moving = true; me.follow = true; return; }
    if (!me.target) { me.moving = false; return; }
    const tx = me.target[0] - me.gx, ty = me.target[1] - me.gy, d = Math.hypot(tx, ty);
    if (d < 0.05 || reduce) { me.gx = me.target[0]; me.gy = me.target[1]; me.target = null; me.moving = false; return; }
    const step = Math.min(d, 0.055), nx = me.gx + tx / d * step, ny = me.gy + ty / d * step;
    if (walkable(nx, ny)) { me.gx = nx; me.gy = ny; me.moving = true; } else { me.target = null; me.moving = false; if (onBlocked) onBlocked(); }
  }

  /* the build site: four stages tied to how many steps are ticked, trim after */
  function siteFor(state) { const nx = S.nextProject(state); if (!nx) return null; const L = S.layout(state); const sp = L.spreads.find(x => x.id === nx.series.id); const a = sp ? sp.at : S.WEST[L.spreads.filter(x => !x.list).length]; const pi = nx.series.projects.findIndex(pr => pr[0] === nx.title); const q = S.lot(a, pi); return { title: nx.title, series: nx.series, xp: nx.xp, gx: q[0], gy: q[1], kind: nx.series.kind }; }
  function drawSite(I, site, done, total, k, now) {
    const { gx, gy } = site; const stage = total > 0 ? Math.min(4, Math.floor(done / total * 4 + 1e-9)) : 0; const z = (1 - k) * -60;
    I.ctx.setLineDash([4, 4]); I.poly([I.p(gx - 0.2, gy - 0.2), I.p(gx + 1.2, gy - 0.2), I.p(gx + 1.2, gy + 1.2), I.p(gx - 0.2, gy + 1.2)], 'rgba(255,255,255,.1)', 'rgba(255,255,255,.8)', 1.2); I.ctx.setLineDash([]);
    [[-0.2, -0.2], [1.2, -0.2], [-0.2, 1.2], [1.2, 1.2]].forEach(o => { const q = I.p(gx + o[0], gy + o[1]); I.ctx.fillStyle = '#8b5a2b'; I.ctx.fillRect(q[0] - 1, q[1] - 9, 2, 9); I.ctx.fillStyle = '#e8552f'; I.ctx.fillRect(q[0] - 3, q[1] - 11, 6, 3); });
    if (stage >= 1) I.box(gx + 0.05, gy + 0.05, 0.9, 0.9, 5, '#c9c2b0', stage === 1 ? -z : 0, { top: 0.1 });
    if (stage >= 2) [[0.1, 0.1], [0.9, 0.1], [0.1, 0.9], [0.9, 0.9]].forEach(o => I.box(gx + o[0] - 0.04, gy + o[1] - 0.04, 0.08, 0.08, 34, '#b58a5a', 5 + (stage === 2 ? -z : 0), { noShadow: true }));
    let b = null; if (stage >= 3) { b = I.box(gx + 0.1, gy + 0.1, 0.8, 0.8, 34, '#f3e6cc', 5 + (stage === 3 ? -z : 0), { noShadow: true, tex: 'siding' }); I.win(b.D, b.C, 0.12, 11, 0.24, 14, false); I.win(b.C, b.B, 0.2, 11, 0.28, 14, false); }
    if (stage >= 4) { const zz = stage === 4 && done < total ? -z : 0; I.roof(gx + 0.1, gy + 0.1, 0.8, 0.8, 39 + zz, 24, '#d9563f'); if (b) I.door(b.D, b.C, 0.6, 0.24, 22, '#8b4a2b'); }
    if (done >= total && total > 0) { I.chimney(gx + 0.62, gy + 0.22, 49); I.bush(gx - 0.05, gy + 0.95, true); }
    if (done > 0 && done < total) I.puff(gx, gy, k);
    return ['Pegged out', 'Foundation', 'Frame up', 'Walls up', done >= total ? 'Finished' : 'Roof on'][stage];
  }

  function drawLand(I, state, me, now, opts) {
    const ctx = I.ctx, L = S.layout(state); opts = opts || {};
    for (let gy = 0; gy < LAND; gy++) for (let gx = 0; gx < LAND; gx++) {
      if (!I.onScreen(gx, gy)) continue;
      if (S.inCreek(gx, gy)) { I.tile(gx, gy, (Math.floor(now / 600) + gx + gy) % 5 === 0 ? '#5cc0f5' : '#3ea3e8'); continue; }
      if (S.onBank(gx, gy)) { I.tile(gx, gy, '#d9c9a0'); continue; }
      if (L.paths.has(gx + ',' + gy)) { I.tile(gx, gy, '#c8a877'); continue; }
      I.tile(gx, gy, groundColour(gx, gy));
    }
    const items = []; const add = (d, fn) => items.push({ d, fn });
    CROSSINGS.forEach(gy => { const cx = Math.round(S.creekX(gy + 0.5)); for (let x = cx - 3; x <= cx + 2; x++) if (I.onScreen(x, gy)) add(x + gy + 0.4, () => { I.tile(x, gy, '#a88c5f', '#6b4a2b'); if (!opts.map) { const a = I.p(x, gy), b = I.p(x + 1, gy); I.line(I.up(a, 6), I.up(b, 6), '#8a6a3f', 1.5); const c = I.p(x, gy + 1), d = I.p(x + 1, gy + 1); I.line(I.up(c, 6), I.up(d, 6), '#8a6a3f', 1.5); } }); });
    if (!opts.map) for (let gy = 0; gy < LAND; gy++) for (let gx = 0; gx < LAND; gx++) { const r = S.hash(gx * 3, gy * 5); if (r > 0.045 || !I.onScreen(gx, gy) || S.inCreek(gx, gy) || S.onBank(gx, gy) || L.paths.has(gx + ',' + gy)) continue; if (L.buildings.some(b => Math.abs(b.gx - gx) < 1.8 && Math.abs(b.gy - gy) < 1.8) || (Math.abs(gx - HOME[0]) < 3 && Math.abs(gy - HOME[1]) < 3)) continue; add(gx + gy + 0.5, r < 0.006 ? () => B.hay(I, gx, gy) : () => B.oak(I, gx, gy, 0.8 + S.hash(gy, gx) * 0.5)); }
    /* the ranch house, or a tent until the first project */
    const word = S.houseWord(state);
    if (I.onScreen(HOME[0], HOME[1])) {
      if (state.done.length === 0) { add(HOME[0] + HOME[1] + 1, () => { const t = I.p(HOME[0] + 0.5, HOME[1] + 0.5); I.poly([[t[0] - 16, t[1]], [t[0] + 16, t[1]], [t[0], t[1] - 26]], '#e9e4d6'); I.poly([[t[0], t[1]], [t[0] + 16, t[1]], [t[0], t[1] - 26]], '#cfc7aa'); I.poly([[t[0] - 4, t[1]], [t[0] + 4, t[1]], [t[0], t[1] - 12]], '#6b4a2b'); }); }
      else { const t = word[0] >= 60 ? 5 : word[0] >= 35 ? 4 : word[0] >= 15 ? 3 : 2; add(HOME[0] + HOME[1] + 2.2, () => B.homestead(I, HOME[0] - 0.7, HOME[1] - 1.2, now, t)); if (word[0] >= 5) { add(HOME[0] + HOME[1] + 0.2, () => B.windmill(I, HOME[0] + 1.6, HOME[1] - 2.4, now)); add(HOME[0] + HOME[1] + 0.9, () => B.tank(I, HOME[0] + 2.3, HOME[1] - 1.6)); } }
      add(HOME[0] + HOME[1] + 3.6, () => B.board(I, HOME[0] - 1.6, HOME[1] + 1.8));
    }
    /* every spread: its buildings, a well at half, a fence and a gate sign when whole */
    L.spreads.forEach(sp => { const a = sp.at; if (!I.onScreen(a[0], a[1]) && !I.onScreen(a[0] + 4, a[1] + 4)) return;
      if (sp.n >= 2 && !sp.list) add(a[0] + a[1] - 2.2, () => B.windmill(I, a[0] - 1.6, a[1] - 3.2, now));
      if (!opts.map && sp.whole && sp.n > 1) add(a[0] + a[1] - 4.6, () => { I.fence(a[0] - 4.2, a[1] - 4.4, a[0] + 5.6, a[1] - 4.4, 14); I.fence(a[0] - 4.2, a[1] - 4.4, a[0] - 4.2, a[1] + 5.2, 14); });
      if (!opts.map) add(a[0] + a[1] + 7.5, () => I.label(a[0] + 0.5, a[1] + 6.4, sp.name, sp.list ? sp.n + (sp.n === 1 ? ' project' : ' projects') : sp.n + ' of ' + sp.of, 8)); });
    L.buildings.forEach(b => { if (!I.onScreen(b.gx, b.gy)) return;
      if (b.tier === 0) { add(b.gx + b.gy + 0.5, () => { const q = I.p(b.gx + 0.5, b.gy + 0.5); I.ctx.fillStyle = '#8b5a2b'; I.ctx.fillRect(q[0] - 1, q[1] - 10, 2, 10); I.ctx.strokeStyle = 'rgba(255,255,255,.6)'; I.ctx.setLineDash([2, 3]); I.ctx.strokeRect(q[0] - 10, q[1] - 5, 20, 10); I.ctx.setLineDash([]); }); return; }
      let k = 1; if (opts.anim && opts.anim.title === b.title) k = reduce ? 1 : clamp((now - opts.anim.start) / 1600, 0, 1);
      add(b.gx + b.gy + 0.5, () => B[b.kind](I, b.gx, b.gy, k, now, b.tier)); });
    if (opts.site) { const st = opts.site; add(st.gx + st.gy + 0.5, () => { opts.stage = drawSite(I, st, opts.stepsDone, opts.stepsTotal, opts.k == null ? 1 : opts.k, now); }); }
    if (!opts.map && me) { add(me.gx + me.gy, () => I.person(me.gx, me.gy, '#2f7fd6', me.moving ? now / 1000 : 3, true)); if (me.target) { const q = I.p(me.target[0], me.target[1]); ctx.strokeStyle = 'rgba(255,255,255,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(q[0], q[1], 9, 4.5, 0, 0, Math.PI * 2); ctx.stroke(); } }
    (opts.fx || []).forEach(f => { const t = (now - f.start) / f.life; if (t >= 1 || t < 0) return;
      if (f.type === 'float') add(999, () => { const q = I.p(f.gx, f.gy, 40 + t * 40); ctx.globalAlpha = 1 - t; ctx.font = '800 13px Baloo 2, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(16,24,44,.6)'; ctx.strokeText(f.text, q[0], q[1]); ctx.fillStyle = f.colour; ctx.fillText(f.text, q[0], q[1]); ctx.textAlign = 'left'; ctx.globalAlpha = 1; });
      if (f.type === 'sparkle') add(999, () => { const q = I.p(f.gx, f.gy, 20); for (let i = 0; i < 14; i++) { const a = i / 14 * Math.PI * 2 + f.seed, r = ease(t) * 34; ctx.globalAlpha = 1 - t; I.blob(q[0] + Math.cos(a) * r, q[1] + Math.sin(a) * r * 0.55 - t * 18, 2.2 * (1 - t) + 0.5, ['#ffd54a', '#7cf0a4', '#4fc3ff', '#ff8fb1'][i % 4]); } ctx.globalAlpha = 1; }); });
    items.sort((a, b) => a.d - b.d).forEach(it => it.fn());
    return L;
  }
  function sky(I) { const g = I.ctx.createLinearGradient(0, 0, 0, I.H); g.addColorStop(0, '#9ccdf5'); g.addColorStop(1, '#dfeefb'); I.ctx.fillStyle = g; I.ctx.fillRect(0, 0, I.W, I.H); }
  const hit = (L, g) => L.buildings.find(b => b.tier > 0 && Math.abs(b.gx + 0.5 - g[0]) < 0.75 && Math.abs(b.gy + 0.5 - g[1]) < 0.75);
  const tierName = (state) => { const x = S.xpOf(state); return tierOf(x)[1]; };
  NW.Land = { groundColour, walkable, makeMe, stepMe, siteFor, drawSite, drawLand, sky, hit, tierName, TIERS, KIND_NAME };
})();
