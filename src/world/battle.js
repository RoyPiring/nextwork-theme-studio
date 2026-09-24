/* NextWorld · battle: the rift beasts come, the dead hold the line
 * A side-on lane battle. The simulation is deterministic (seeded, fixed
 * step) and knows nothing of the canvas, so the tests play it headless
 * to keep it winnable and never trivial; the drawing reads it. Your
 * summons re-form a few seconds after they fall: while they stand, you
 * stand. You aim with a tap and cast your spells; with auto on, the
 * spells cast themselves at the front of the enemy line. */
'use strict';
(function () {
  const LANE = 20, HERO_X = 1.1, SPAWN_X = 19.4, STEP = 1 / 30, LIMIT = 120;
  /* the balance, checked by tools/battlecheck.js: how fast the beasts grow a level, and what the spells do per point of spirit */
  const TUNE = { foe: 1.1, extra: 3, spear: 22, curse: 6, domain: 8, lightning: 12, poison: 10, bleed: 4 };   /* spells in damage per point of power; foe scales the beasts; extra: one more beast a wave for every this many of your dead */
  const FOES = {
    crawler: { hp: 34, atk: 6, speed: 1.3, range: 0.6, cd: 1.0, size: 0.8 },
    hound: { hp: 26, atk: 7, speed: 2.8, range: 0.6, cd: 0.7, size: 0.85, flank: true },   /* runs past the line for you */
    brute: { hp: 140, atk: 15, speed: 0.9, range: 0.8, cd: 1.4, size: 1.35 },
    shaman: { hp: 40, atk: 9, speed: 1.1, range: 3.6, cd: 1.8, size: 0.95, ranged: true },
    chief: { hp: 300, atk: 18, speed: 0.8, range: 0.9, cd: 1.3, size: 1.7, aoe: 1.0, boss: true },   /* the brute that leads an ordinary rift */
    warden: { hp: 900, atk: 26, speed: 0.7, range: 1.2, cd: 1.6, size: 2.1, aoe: 1.4, boss: true }
  };
  const rng = seed => { let a = (seed | 0) || 1; return () => { a = (a * 1664525 + 1013904223) | 0; return ((a >>> 0) % 100000) / 100000; }; };

  /* the waves: crawlers first, hounds and brutes from the second, shamans from the third, the warden at the end of a rift */
  function waves(kind, n, boss, r, army) {
    const out = [];
    for (let i = 0; i < n; i++) { const w = []; const count = 5 + 2 * i + (kind === 'raid' ? 0 : 1) + Math.floor((army || 3) / TUNE.extra); for (let k = 0; k < count; k++) { const roll = r(); w.push(i >= 2 && roll < 0.2 ? 'shaman' : i >= 1 && roll < 0.45 ? 'hound' : 'crawler'); } for (let b = 0; b < (i >= 1 ? Math.min(3, i) : 0); b++) w.push('brute'); if (boss && i === n - 1) w.push(boss); out.push(w); }
    return out;
  }
  function unitOf(side, id, spec, x, y) { return { side, id, x, y, hp: spec.hp, max: spec.hp, atk: spec.atk, range: spec.range, speed: spec.speed, cd: spec.cd, cdLeft: 0.3, aoe: spec.aoe || 0, slow: spec.slow || 0, size: spec.size || 1, boss: !!spec.boss, ranged: spec.range > 1.5, slowT: 0, curseT: 0, bleed: 0, shield: 0, shieldT: 0, dead: false, deadAt: 0, raised: 0, flash: 0, walk: 0 }; }

  /* ---- a battle ---- */
  function create(o) {
    const r = rng(o.seed || 7), rift = NW.Hero.RIFTS[o.kind] || NW.Hero.RIFTS.raid, L = o.level || 1;
    const b = { kind: o.kind, t: 0, acc: 0, r, units: [], fx: [], corpses: [], queue: [], wave: -1, waves: waves(o.kind, rift.waves, rift.boss, r, (o.army || []).length), spawnT: 0, scale: rift.mult * (o.base || 1), level: L, power: o.power || 1, spirit: o.spirit || 20, weapon: o.weapon || null, spells: o.spells || ['spear'], cds: {}, focus: 12, auto: !!o.auto, heroMax: Math.round(60 + (o.phy || 10) * 1.5), heroHp: 0, over: false, won: false, stars: 0, kills: 0, domainT: 0, shake: 0, par: 20 + rift.waves * 9, tired: !!o.tired };
    b.heroHp = b.heroMax;
    (o.army || []).forEach((u, i) => { const ranged = u.range > 1.5; const hx = (ranged ? 2.2 : 3.4) + (i % 3) * 0.35; b.units.push(Object.assign(unitOf('us', u.id, u, hx, 0.15 + ((i * 37) % 70) / 100), { home: true, homeX: hx })); });
    return b;
  }
  const alive = (b, side) => b.units.filter(u => u.side === side && !u.dead);
  const wmult = b => 1 + (b.weapon ? b.weapon.atk / 80 : 0);
  function hurt(b, u, dmg, from) {
    if (u.dead) return; let d = dmg * (u.curseT > 0 ? 1.3 : 1); if (u.shield > 0) { const a = Math.min(u.shield, d); u.shield -= a; d -= a; } u.hp -= d; u.flash = 0.12;
    if (d >= 1) b.fx.push({ type: 'num', x: u.x, y: u.y, v: Math.round(d), t: 0, life: 0.8, us: u.side === 'us', big: d > u.max * 0.4 || from === 'spell' });
    if (u.hp <= 0) { u.dead = true; u.deadAt = b.t; if (u.side === 'them') { b.kills++; b.corpses.push({ x: u.x, y: u.y, at: b.t, id: u.id, max: u.max, atk: u.atk, size: u.size }); b.fx.push({ type: 'bones', x: u.x, y: u.y, t: 0, life: 0.9, seed: b.r() }); if (u.boss) b.shake = 0.5; } }
  }
  /* a weapon's curse, on whatever a spell hits */
  function affix(b, u) { const a = b.weapon && b.weapon.affix; if (!a) return; if (a === 'bleed') u.bleed = Math.max(u.bleed, 3); else if (a === 'slow') u.slowT = Math.max(u.slowT, 2); else if (a === 'decay') u.curseT = Math.max(u.curseT, 3); }
  function front(b) { const e = alive(b, 'them'); if (!e.length) return null; return e.reduce((m, u) => u.x < m.x ? u : m, e[0]).x; }

  /* ---- the spells ---- */
  function cast(b, id) {
    if (b.over || !b.spells.includes(id) || (b.cds[id] || 0) > 0) return false; const spec = NW.Hero.SPELLS.find(s => s.id === id); const fx = b.focus, sp = b.power * wmult(b);   /* power already carries the tiredness */
    if (id === 'spear') { const hit = alive(b, 'them').filter(u => Math.abs(u.x - fx) < 2.2); hit.forEach(u => { hurt(b, u, sp * TUNE.spear, 'spell'); affix(b, u); }); if (b.weapon && b.weapon.affix === 'lightning') alive(b, 'them').filter(u => !hit.includes(u)).sort((a, c) => Math.abs(a.x - fx) - Math.abs(c.x - fx)).slice(0, 2).forEach(u => { hurt(b, u, sp * TUNE.lightning, 'spell'); b.fx.push({ type: 'bolt', x: fx, x2: u.x, y: u.y, t: 0, life: 0.3 }); }); if (b.weapon && b.weapon.affix === 'poison') alive(b, 'them').filter(u => !hit.includes(u) && Math.abs(u.x - fx) < 3.7).forEach(u => hurt(b, u, sp * TUNE.poison, 'spell')); b.fx.push({ type: 'spear', x: fx, t: 0, life: 0.6 }); }
    else if (id === 'raise') { const fresh = b.corpses.filter(c => b.t - c.at < 12 && !c.used).slice(-(1 + Math.floor(b.level / 4))); fresh.forEach(c => { c.used = true; b.units.push(Object.assign(unitOf('us', 'raised', { hp: Math.max(40, c.max * 0.6), atk: Math.max(8, c.atk), range: 0.7, speed: 1.8, cd: 0.9, size: Math.min(1.4, c.size) }, c.x, c.y), { raised: 15, kind: c.id, homeX: 5 })); b.fx.push({ type: 'rise', x: c.x, y: c.y, t: 0, life: 0.8 }); }); if (!fresh.length) return false; }
    else if (id === 'curse') { alive(b, 'them').filter(u => Math.abs(u.x - fx) < 2.6).forEach(u => { u.slowT = 5; u.curseT = 5; hurt(b, u, sp * TUNE.curse, 'spell'); affix(b, u); }); b.fx.push({ type: 'curse', x: fx, t: 0, life: 1.2 }); }
    else if (id === 'armor') { alive(b, 'us').forEach(u => { u.shield = u.max * 0.35; u.shieldT = 6; }); b.fx.push({ type: 'armor', t: 0, life: 0.8 }); }
    else if (id === 'domain') { b.domainT = 6; b.fx.push({ type: 'domain', t: 0, life: 6 }); }
    b.cds[id] = spec.cd; b.castAt = b.t; return true;
  }
  function aim(b, x) { b.focus = Math.max(2, Math.min(LANE - 0.5, x)); b.aimedAt = b.t; }

  /* ---- one fixed step ---- */
  function tick(b) {
    const dt = STEP; b.t += dt; Object.keys(b.cds).forEach(k => { b.cds[k] = Math.max(0, b.cds[k] - dt); }); b.shake = Math.max(0, b.shake - dt);
    /* the next wave when the field is clear */
    if (!b.queue.length && !alive(b, 'them').length) { if (b.wave + 1 >= b.waves.length) { b.over = true; b.won = true; } else { b.wave++; b.queue = b.waves[b.wave].slice(); b.spawnT = 0.6; b.fx.push({ type: 'wave', t: 0, life: 1.6, n: b.wave + 1 }); } }
    if (b.queue.length) { b.spawnT -= dt; if (b.spawnT <= 0) { const id = b.queue.shift(), f = FOES[id], sc = b.scale * (f.boss ? 1.15 : 1); b.units.push(Object.assign(unitOf('them', id, { hp: Math.round(f.hp * sc * TUNE.foe), atk: f.atk * sc * Math.sqrt(TUNE.foe), range: f.range, speed: f.speed, cd: f.cd, aoe: f.aoe, size: f.size, boss: f.boss }, SPAWN_X, 0.12 + b.r() * 0.76), { flank: !!f.flank })); b.spawnT = FOES[id].boss ? 1.2 : 0.55; } }
    if (b.auto || !b.aimedAt || b.t - b.aimedAt > 4) { const f = front(b); if (f != null) b.focus = Math.min(LANE - 0.5, f + 0.8); }
    if (b.auto) b.spells.forEach(id => { if (id === 'armor' && !alive(b, 'us').some(u => u.hp < u.max * 0.7)) return; if (id === 'domain' && alive(b, 'them').length < 5) return; cast(b, id); });
    if (b.domainT > 0) { b.domainT -= dt; alive(b, 'them').forEach(u => { hurt(b, u, b.power * wmult(b) * TUNE.domain * dt, 'dot'); u.slowT = Math.max(u.slowT, 0.3); }); }
    b.units.forEach(u => {
      u.flash = Math.max(0, u.flash - dt);
      if (u.dead) { if (u.side === 'us' && u.home && b.t - u.deadAt > 4) { u.dead = false; u.hp = u.max; u.x = u.homeX; b.fx.push({ type: 'rise', x: u.x, y: u.y, t: 0, life: 0.8 }); } return; }
      if (u.raised) { u.raised -= dt; if (u.raised <= 0) { u.dead = true; u.home = false; u.deadAt = b.t; return; } }
      u.slowT = Math.max(0, u.slowT - dt); u.curseT = Math.max(0, u.curseT - dt); u.shieldT -= dt; if (u.shieldT <= 0) u.shield = 0;
      if (u.bleed > 0) { u.bleed -= dt; hurt(b, u, b.power * wmult(b) * TUNE.bleed * dt, 'dot'); if (u.dead) return; }   /* a bleed hurts by your power, not by the size of what bleeds */
      u.cdLeft -= dt; const foes = alive(b, u.side === 'us' ? 'them' : 'us'); const dir = u.side === 'us' ? 1 : -1;
      let target = null, best = 1e9; if (!u.flank) foes.forEach(f => { const d = (f.x - u.x) * dir; if (d > -0.4 && d < best) { best = d; target = f; } });
      const spd = u.speed * (u.slowT > 0 ? 0.5 : 1);
      if (u.side === 'them' && (!target || best > u.range) && u.x <= HERO_X + 0.6) { if (u.cdLeft <= 0) { b.heroHp -= u.atk; u.cdLeft = u.cd; b.shake = 0.15; b.fx.push({ type: 'hit', x: HERO_X, y: 0.5, t: 0, life: 0.3 }); if (b.heroHp <= 0) { b.over = true; b.won = false; } } return; }
      if (target && best <= u.range) { if (u.cdLeft <= 0) { u.cdLeft = u.cd; const dmg = u.atk * (b.tired && u.side === 'us' ? 0.75 : 1); if (u.range > 1.5) b.fx.push({ type: u.id === 'archer' ? 'arrow' : u.side === 'us' ? 'orb' : 'venom', x: u.x, y: u.y, x2: target.x, y2: target.y, t: 0, life: 0.35 }); hurt(b, target, dmg); if (u.aoe) foes.filter(f => f !== target && Math.abs(f.x - target.x) < u.aoe).forEach(f => { hurt(b, f, dmg * 0.6); if (u.slow) f.slowT = Math.max(f.slowT, 2); }); if (u.slow) target.slowT = Math.max(target.slowT, 2); } }
      else if (u.side === 'them') { u.x = Math.max(HERO_X + 0.5, u.x - spd * dt); u.walk += dt * spd * 3; }
      else if (target) { /* the dead advance; the ranged ones keep behind the front of their own line */ let cap = LANE - 0.5; if (u.ranged) { const melee = alive(b, 'us').filter(m => !m.ranged); if (melee.length) cap = Math.max(u.x, Math.max.apply(null, melee.map(m => m.x)) - 0.5); } const nx = Math.min(cap, u.x + spd * dt); if (nx !== u.x) u.walk += dt * spd * 3; u.x = nx; }
      else if (Math.abs(u.x - u.homeX) > 0.05) { u.x += Math.sign(u.homeX - u.x) * Math.min(Math.abs(u.homeX - u.x), spd * dt); u.walk += dt * spd * 3; }   /* between waves they walk back to their places */
    });
    b.units = b.units.filter(u => !(u.dead && !u.home && b.t - u.deadAt > 1.5));
    b.fx.forEach(f => { f.t += dt; }); b.fx = b.fx.filter(f => f.t < f.life);
    if (b.t > LIMIT && !b.over) { b.over = true; b.won = false; }
    if (b.over && !b.stars) b.stars = b.won ? 1 + (b.heroHp / b.heroMax > 0.5 ? 1 : 0) + (b.t < b.par ? 1 : 0) : 0;
  }
  /* real time in, fixed steps out; a slow frame never makes the fight jump */
  function step(b, secs) { b.acc = Math.min(0.25, b.acc + secs); while (b.acc >= STEP && !b.over) { tick(b); b.acc -= STEP; } if (b.over) b.fx.forEach(f => { f.t += secs; }); }
  function run(b, maxSecs) { let n = 0; while (!b.over && n < (maxSecs || LIMIT + 5) / STEP) { tick(b); n++; } return b; }

  /* ==================== the drawing ==================== */
  const bg = { key: '', cv: null };
  function backdrop(ctx, W, H, look) {
    const key = W + 'x' + H + '|' + look.ground + '|' + look.night; if (bg.key !== key) { bg.key = key; bg.cv = document.createElement('canvas'); bg.cv.width = Math.round(W * look.dpr); bg.cv.height = Math.round(H * look.dpr); const g = bg.cv.getContext('2d'); g.setTransform(look.dpr, 0, 0, look.dpr, 0, 0);
      const sky = g.createLinearGradient(0, 0, W, 0); sky.addColorStop(0, look.night ? '#101a3a' : '#3a4f8a'); sky.addColorStop(0.7, look.night ? '#2a1640' : '#6b4c8f'); sky.addColorStop(1, '#8a2f6b'); g.fillStyle = sky; g.fillRect(0, 0, W, H);
      for (let i = 0; i < 60; i++) { g.fillStyle = 'rgba(255,255,255,' + (0.3 + (i % 5) * 0.12) + ')'; g.fillRect((i * 97.3) % W, (i * 41.7) % (H * 0.45), 1.2, 1.2); }
      [[0.5, '#2a2a4a', 0.28], [0.62, '#20203a', 0.18]].forEach(([base, c, amp], k) => { g.fillStyle = c; g.beginPath(); g.moveTo(0, H); for (let x = 0; x <= W; x += 12) g.lineTo(x, H * base - Math.abs(Math.sin(x / (70 + k * 40) + k)) * H * amp * 0.6 - Math.sin(x / 23) * 4); g.lineTo(W, H); g.closePath(); g.fill(); });
      const gy = H * 0.66, gr = g.createLinearGradient(0, gy, 0, H); gr.addColorStop(0, look.ground); gr.addColorStop(1, NW.shade(look.ground, -0.55)); g.fillStyle = gr; g.fillRect(0, gy, W, H - gy);
      g.strokeStyle = 'rgba(0,0,0,.18)'; for (let i = 0; i < 26; i++) { const y = gy + (H - gy) * ((i * 0.37) % 1); g.beginPath(); g.moveTo((i * 131) % W, y); g.lineTo((i * 131) % W + 14, y); g.stroke(); }
      /* your wall on the left, and the home behind it */
      g.fillStyle = '#3a2a1e'; for (let i = 0; i < 7; i++) { g.fillRect(4 + i * 7, gy - 34 - (i % 2) * 4, 6, 44 + (i % 2) * 4); g.beginPath(); g.moveTo(4 + i * 7, gy - 34 - (i % 2) * 4); g.lineTo(7 + i * 7, gy - 40 - (i % 2) * 4); g.lineTo(10 + i * 7, gy - 34 - (i % 2) * 4); g.fill(); }
      g.fillStyle = '#2a2036'; g.fillRect(14, gy - 70, 26, 30); g.beginPath(); g.moveTo(10, gy - 70); g.lineTo(27, gy - 88); g.lineTo(44, gy - 70); g.fill(); g.fillStyle = '#ffd98a'; g.fillRect(22, gy - 62, 5, 6); }
    ctx.drawImage(bg.cv, 0, 0, W, H);
  }
  const X = (W, x) => 34 + x / LANE * (W - 70), Y = (H, y) => H * 0.7 + (y - 0.5) * H * 0.2, SC = y => 0.85 + y * 0.3;
  function blob(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  function ln(ctx, a, b, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w || 1.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  /* a skeleton, facing right, feet at (x,y): the body every summon shares */
  function skeleton(ctx, x, y, s, t, eye, flash) {
    const bone = flash ? '#ffffff' : '#ecebe2', dark = '#8a8778', sw = Math.sin(t * 9) * 3 * s;
    ln(ctx, [x - 2 * s, y - 12 * s], [x - 3 * s + sw, y], bone, 2 * s); ln(ctx, [x + 2 * s, y - 12 * s], [x + 3 * s - sw, y], bone, 2 * s);
    ell(ctx, x, y - 13 * s, 4 * s, 2 * s, bone); ln(ctx, [x, y - 14 * s], [x, y - 25 * s], bone, 2 * s);
    for (let k = 0; k < 3; k++) { ctx.strokeStyle = k % 2 ? dark : bone; ctx.lineWidth = 1.3 * s; ctx.beginPath(); ctx.ellipse(x, y - 19 * s - k * 2.2 * s, 4.5 * s - k * 0.4 * s, 1.6 * s, 0, 0, Math.PI); ctx.stroke(); }
    ln(ctx, [x - 4 * s, y - 24 * s], [x - 6 * s - sw * 0.5, y - 15 * s], bone, 1.8 * s); ln(ctx, [x + 4 * s, y - 24 * s], [x + 7 * s + sw * 0.5, y - 17 * s], bone, 1.8 * s);
    blob(ctx, x, y - 30 * s, 5 * s, bone); ctx.fillStyle = '#1c1a24'; ctx.fillRect(x - 1 * s, y - 31.5 * s, 2 * s, 2.5 * s); ctx.fillRect(x + 2.4 * s, y - 31.5 * s, 2 * s, 2.5 * s); blob(ctx, x + 0.2 * s, y - 30.3 * s, 1 * s, eye); blob(ctx, x + 3.4 * s, y - 30.3 * s, 1 * s, eye); ctx.fillStyle = dark; ctx.fillRect(x - 1.5 * s, y - 26.6 * s, 6 * s, 1.2 * s);
    return [x + 7 * s + sw * 0.5, y - 17 * s];
  }
  function drawUs(ctx, u, px, py, s, t) {
    const eye = u.raised ? '#7cff8a' : '#7ff5ff';
    if (u.id === 'rider') { const bone = '#ecebe2'; ell(ctx, px, py - 14 * s, 13 * s, 6 * s, '#3a3440'); [[-9, 1], [-5, -1], [6, 1], [10, -1]].forEach(([o, ph]) => ln(ctx, [px + o * s, py - 10 * s], [px + o * s + Math.sin(t * 12 + ph) * 3 * s, py], bone, 2 * s)); ln(ctx, [px + 10 * s, py - 16 * s], [px + 17 * s, py - 24 * s], bone, 3 * s); ell(ctx, px + 19 * s, py - 24 * s, 5 * s, 3 * s, bone); blob(ctx, px + 21 * s, py - 25 * s, 1.2 * s, '#ff5a5a'); skeleton(ctx, px - 2 * s, py - 12 * s, s * 0.8, 0, eye, u.flash); ln(ctx, [px + 2 * s, py - 30 * s], [px + 26 * s, py - 30 * s], '#c9d2dc', 2 * s); return; }
    if (u.id === 'lich') { const fl = py - 6 * s + Math.sin(t * 2) * 3 * s; ctx.fillStyle = '#3b1f5a'; ctx.beginPath(); ctx.moveTo(px - 9 * s, fl + 6 * s); ctx.lineTo(px + 9 * s, fl + 6 * s); ctx.lineTo(px + 5 * s, fl - 26 * s); ctx.lineTo(px - 5 * s, fl - 26 * s); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#b56cff'; ctx.lineWidth = 1.5; ctx.stroke(); blob(ctx, px, fl - 31 * s, 5.5 * s, '#ecebe2'); blob(ctx, px + 1.5 * s, fl - 31 * s, 1.2 * s, '#b56cff'); blob(ctx, px + 4 * s, fl - 31 * s, 1.2 * s, '#b56cff'); ctx.fillStyle = '#ffc531'; ctx.beginPath(); ctx.moveTo(px - 5 * s, fl - 35 * s); ctx.lineTo(px - 3 * s, fl - 41 * s); ctx.lineTo(px, fl - 36 * s); ctx.lineTo(px + 3 * s, fl - 41 * s); ctx.lineTo(px + 5 * s, fl - 35 * s); ctx.closePath(); ctx.fill(); blob(ctx, px + 10 * s, fl - 18 * s, 3.5 * s, 'rgba(181,108,255,.8)'); return; }
    if (u.id === 'wyrm') { const bone = u.flash ? '#fff' : '#e6e3d6', fl = py - 26 * s + Math.sin(t * 1.5) * 4 * s; ctx.fillStyle = 'rgba(80,60,110,.45)'; ctx.beginPath(); ctx.moveTo(px - 4 * s, fl - 4 * s); ctx.lineTo(px - 26 * s, fl - 30 * s + Math.sin(t * 3) * 6 * s); ctx.lineTo(px - 16 * s, fl + 4 * s); ctx.closePath(); ctx.fill(); ln(ctx, [px - 4 * s, fl - 4 * s], [px - 26 * s, fl - 30 * s + Math.sin(t * 3) * 6 * s], bone, 2 * s); ctx.strokeStyle = bone; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(px - 30 * s, fl + 6 * s); ctx.quadraticCurveTo(px - 10 * s, fl - 6 * s, px + 12 * s, fl - 8 * s); ctx.stroke(); for (let k = -24; k < 10; k += 5) ln(ctx, [px + k * s, fl - 2 * s + k * 0.2 * s], [px + k * s + 2 * s, fl + 6 * s], bone, 1.5 * s); ell(ctx, px + 16 * s, fl - 9 * s, 7 * s, 4 * s, bone); blob(ctx, px + 18 * s, fl - 10 * s, 1.6 * s, '#7ff5ff'); ln(ctx, [px + 20 * s, fl - 6 * s], [px + 24 * s, fl - 4 * s], bone, 1.5 * s); return; }
    const hand = skeleton(ctx, px, py, s, u.walk, eye, u.flash);
    if (u.id === 'warrior' || u.id === 'raised') { ln(ctx, hand, [hand[0] + 9 * s, hand[1] - 9 * s], '#c9d2dc', 2 * s); ell(ctx, px - 5 * s, py - 18 * s, 3.5 * s, 5 * s, '#6b4a2b'); }
    else if (u.id === 'archer') { ctx.strokeStyle = '#8a6a3f'; ctx.lineWidth = 1.6 * s; ctx.beginPath(); ctx.arc(hand[0], hand[1], 7 * s, -1.2, 1.2); ctx.stroke(); ln(ctx, [hand[0] + 2.5 * s, hand[1] - 6.5 * s], [hand[0] + 2.5 * s, hand[1] + 6.5 * s], '#ddd', 0.8); }
    else if (u.id === 'mage') { ln(ctx, [hand[0], hand[1] + 10 * s], [hand[0] + 1 * s, hand[1] - 14 * s], '#6b4a2b', 1.8 * s); blob(ctx, hand[0] + 1 * s, hand[1] - 16 * s, 3 * s, 'rgba(255,120,60,.9)'); }
  }
  function drawThem(ctx, u, px, py, s, t) {
    const f = u.flash ? '#ffffff' : null, bob = Math.sin(u.walk) * 1.5 * s;
    if (u.id === 'crawler') { ell(ctx, px, py - 6 * s + bob, 10 * s, 7 * s, f || '#7a3fb0'); ell(ctx, px - 2 * s, py - 9 * s + bob, 5 * s, 3 * s, 'rgba(255,255,255,.18)'); blob(ctx, px - 4 * s, py - 8 * s + bob, 1.6 * s, '#ffe14d'); blob(ctx, px - 8 * s, py - 7 * s + bob, 1.4 * s, '#ffe14d'); }
    else if (u.id === 'hound') { const c = f || '#2b2433'; ell(ctx, px, py - 11 * s, 11 * s, 5 * s, c); [[-7, 0], [-3, 2], [4, 0], [8, 2]].forEach(([o, ph]) => ln(ctx, [px + o * s, py - 8 * s], [px + o * s + Math.sin(u.walk * 2 + ph) * 3 * s, py], c, 2 * s)); ell(ctx, px - 12 * s, py - 15 * s, 5 * s, 4 * s, c); ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(px - 12 * s, py - 18 * s); ctx.lineTo(px - 10 * s, py - 23 * s); ctx.lineTo(px - 8 * s, py - 18 * s); ctx.fill(); blob(ctx, px - 14 * s, py - 16 * s, 1.3 * s, '#ff3b3b'); ln(ctx, [px + 10 * s, py - 12 * s], [px + 16 * s, py - 17 * s], c, 2 * s); }
    else if (u.id === 'brute' || u.id === 'chief') { const c = f || '#5f6b4a'; ell(ctx, px, py - 20 * s, 12 * s, 15 * s, c); ln(ctx, [px - 5 * s, py - 6 * s], [px - 6 * s + bob, py], c, 5 * s); ln(ctx, [px + 5 * s, py - 6 * s], [px + 6 * s - bob, py], c, 5 * s); blob(ctx, px - 3 * s, py - 38 * s, 6 * s, c); blob(ctx, px - 5 * s, py - 39 * s, 1.3 * s, '#ff5a2a'); ln(ctx, [px - 10 * s, py - 24 * s], [px - 20 * s, py - 38 * s + Math.sin(t * 3) * 4 * s], '#6b4a2b', 4 * s); blob(ctx, px - 21 * s, py - 40 * s + Math.sin(t * 3) * 4 * s, 4.5 * s, '#4a3326'); }
    else if (u.id === 'shaman') { const c = f || '#2e3d2e'; ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(px - 8 * s, py); ctx.lineTo(px + 8 * s, py); ctx.lineTo(px + 3 * s, py - 28 * s); ctx.lineTo(px - 4 * s, py - 28 * s); ctx.closePath(); ctx.fill(); blob(ctx, px, py - 30 * s, 5 * s, c); blob(ctx, px - 2 * s, py - 30 * s, 1.2 * s, '#7cff8a'); ln(ctx, [px - 9 * s, py + 2 * s], [px - 10 * s, py - 30 * s], '#6b4a2b', 1.6 * s); blob(ctx, px - 10 * s, py - 32 * s, 3.2 * s, 'rgba(124,255,138,.85)'); }
    else if (u.id === 'warden') { const c = f || '#3a1f26'; ell(ctx, px, py - 30 * s, 16 * s, 24 * s, c); ctx.strokeStyle = '#ff4f6d'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(px - 8 * s, py - 40 * s); ctx.lineTo(px, py - 24 * s); ctx.lineTo(px + 8 * s, py - 40 * s); ctx.stroke(); ln(ctx, [px - 7 * s, py - 8 * s], [px - 8 * s + bob, py], c, 7 * s); ln(ctx, [px + 7 * s, py - 8 * s], [px + 8 * s - bob, py], c, 7 * s); blob(ctx, px, py - 58 * s, 9 * s, c); [[-1, -1], [1, 1]].forEach(([d]) => { ctx.strokeStyle = '#d9d2c4'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(px + d * 6 * s, py - 64 * s); ctx.quadraticCurveTo(px + d * 16 * s, py - 70 * s, px + d * 14 * s, py - 80 * s); ctx.stroke(); }); blob(ctx, px - 4 * s, py - 59 * s, 2 * s, '#ff4f6d'); blob(ctx, px + 3 * s, py - 59 * s, 2 * s, '#ff4f6d'); }
  }
  /* the necromancer: the robe in your shirt colour, your own head, a staff that glows the weapon's rarity */
  function drawHero(ctx, x, y, look, t, cast) {
    const robe = look.shirt || '#3b1f5a', glow = look.weapon ? look.weapon.colour : '#7ff5ff';
    ell(ctx, x, y + 2, 14, 4, 'rgba(0,0,0,.35)');
    ctx.fillStyle = NW.shade(robe, -0.35); ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.lineTo(x + 6, y - 30); ctx.lineTo(x - 6, y - 30); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#b56cff'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(x - 12, y); ctx.lineTo(x + 12, y); ctx.stroke();
    if (look.body === 'pineapple') { ell(ctx, x, y - 38, 8, 10, '#f2b42a'); ctx.strokeStyle = 'rgba(140,80,10,.5)'; ctx.lineWidth = 0.8; for (let d = -8; d < 8; d += 3) { ctx.beginPath(); ctx.moveTo(x + d - 5, y - 30); ctx.lineTo(x + d + 5, y - 46); ctx.stroke(); } [[-4, -8], [0, -12], [4, -8]].forEach(([o, h]) => { ctx.fillStyle = '#3fa66b'; ctx.beginPath(); ctx.moveTo(x + o - 2, y - 46); ctx.lineTo(x + o * 1.4, y - 46 + h); ctx.lineTo(x + o + 2, y - 46); ctx.fill(); }); }
    else { blob(ctx, x, y - 36, 6.5, look.skin || '#ffd6ad'); ctx.fillStyle = NW.shade(robe, -0.5); ctx.beginPath(); ctx.arc(x, y - 37, 8, Math.PI, 0); ctx.fill(); }
    blob(ctx, x + 2, y - 37, 1.2, '#1c1a24'); blob(ctx, x + 5, y - 37, 1.2, '#1c1a24');
    ln(ctx, [x + 11, y + 2], [x + 13, y - 46], '#5a3a1e', 2.5); const gl = 4 + Math.sin(t * 4) * 1 + (cast ? 4 : 0); const g = ctx.createRadialGradient(x + 13, y - 49, 0, x + 13, y - 49, gl * 3); g.addColorStop(0, glow); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x + 13, y - 49, gl * 3, 0, Math.PI * 2); ctx.fill(); blob(ctx, x + 13, y - 49, 3, '#ffffff');
  }
  function portal(ctx, W, H, t) { const x = W - 22, y = H * 0.62; for (let i = 0; i < 4; i++) { ctx.strokeStyle = 'rgba(' + (180 + i * 18) + ',60,' + (200 - i * 20) + ',' + (0.8 - i * 0.15) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 16 - i * 3 + Math.sin(t * 3 + i) * 1.5, 46 - i * 8, 0, t * (1 + i * 0.3), t * (1 + i * 0.3) + Math.PI * 1.6); ctx.stroke(); } const g = ctx.createRadialGradient(x, y, 2, x, y, 40); g.addColorStop(0, 'rgba(255,90,180,.55)'); g.addColorStop(1, 'rgba(255,90,180,0)'); ctx.fillStyle = g; ctx.fillRect(x - 40, y - 60, 80, 120); }

  function draw(ctx, W, H, b, now, look) {
    const t = now / 1000; ctx.save(); if (b && b.shake > 0) ctx.translate((Math.random() - 0.5) * b.shake * 12, (Math.random() - 0.5) * b.shake * 8);
    backdrop(ctx, W, H, look); portal(ctx, W, H, t);
    if (b && b.domainT > 0) { ctx.fillStyle = 'rgba(60,0,90,' + (0.22 + Math.sin(t * 6) * 0.05) + ')'; ctx.fillRect(0, H * 0.62, W, H * 0.38); }
    drawHero(ctx, X(W, HERO_X) - 6, Y(H, 0.5), look, t, !!(b && b.castAt != null && b.t - b.castAt < 0.4));
    if (b) {
      const fx = X(W, b.focus); ctx.strokeStyle = 'rgba(127,245,255,.55)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(fx, H * 0.72, 30, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      b.fx.forEach(f => { const k = f.t / f.life;
        if (f.type === 'curse') { ctx.strokeStyle = 'rgba(181,108,255,' + (1 - k) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(X(W, f.x), H * 0.72, 20 + k * 60, 5 + k * 14, 0, 0, Math.PI * 2); ctx.stroke(); }
        if (f.type === 'spear') for (let i = -4; i <= 4; i++) { const sx = X(W, f.x) + i * 11, hgt = (1 - Math.abs(k * 2 - 1)) * (26 + (i % 2) * 8); ctx.fillStyle = '#ecebe2'; ctx.beginPath(); ctx.moveTo(sx - 3, H * 0.74); ctx.lineTo(sx, H * 0.74 - hgt); ctx.lineTo(sx + 3, H * 0.74); ctx.fill(); } });
      const drawable = b.units.filter(u => !u.dead).sort((a, c) => a.y - c.y);
      b.corpses.slice(-14).forEach(c => { if (b.t - c.at > 12 || c.used) return; ctx.fillStyle = 'rgba(236,235,226,.35)'; ctx.fillRect(X(W, c.x) - 6, Y(H, c.y) - 2, 12, 2); });
      drawable.forEach(u => { const px = X(W, u.x), py = Y(H, u.y), s = SC(u.y) * (u.size || 1);
        ell(ctx, px, py + 1, 10 * s, 3 * s, 'rgba(0,0,0,.3)');
        if (u.side === 'us') drawUs(ctx, u, px, py, SC(u.y), t); else drawThem(ctx, u, px, py, s, t);
        if (u.shield > 0) { ctx.strokeStyle = 'rgba(236,235,226,.7)'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(px, py - 18 * s, 13 * s, 22 * s, 0, 0, Math.PI * 2); ctx.stroke(); }
        if (u.curseT > 0) blob(ctx, px, py - 44 * s, 2.5, '#b56cff');
        if (u.hp < u.max && !u.boss) { const w = 20 * s; ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(px - w / 2, py - 42 * s - (u.id === 'wyrm' ? 30 : 0), w, 3); ctx.fillStyle = u.side === 'us' ? '#7ff5ff' : '#ff5a6e'; ctx.fillRect(px - w / 2, py - 42 * s - (u.id === 'wyrm' ? 30 : 0), w * Math.max(0, u.hp / u.max), 3); } });
      b.fx.forEach(f => { const k = f.t / f.life;
        if (f.type === 'arrow' || f.type === 'orb' || f.type === 'venom' || f.type === 'bolt') { const x0 = X(W, f.x), y0 = Y(H, f.y || 0.5) - 20, x1 = X(W, f.x2), y1 = Y(H, f.y2 == null ? f.y : f.y2) - 18, px = x0 + (x1 - x0) * k, py = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * (f.type === 'arrow' ? 18 : 6); if (f.type === 'arrow') ln(ctx, [px - 6, py + 1], [px + 2, py], '#e6e3d6', 1.5); else if (f.type === 'bolt') ln(ctx, [x0, y0], [x1, y1], 'rgba(160,220,255,' + (1 - k) + ')', 2); else blob(ctx, px, py, 3.5, f.type === 'orb' ? 'rgba(255,140,60,.95)' : 'rgba(124,255,138,.9)'); }
        if (f.type === 'rise') { for (let i = 0; i < 6; i++) blob(ctx, X(W, f.x) + Math.sin(i * 2 + k * 6) * 8, Y(H, f.y) - k * 30 - i * 4, 2.2 * (1 - k), 'rgba(124,255,138,.8)'); }
        if (f.type === 'bones') { for (let i = 0; i < 7; i++) { const a = i + f.seed * 6; ln(ctx, [X(W, f.x) + Math.cos(a) * k * 18, Y(H, f.y) - 10 + k * k * 14 - Math.sin(a) * k * 10], [X(W, f.x) + Math.cos(a) * k * 18 + 4, Y(H, f.y) - 12 + k * k * 14 - Math.sin(a) * k * 10], 'rgba(236,235,226,' + (1 - k) + ')', 2); } }
        if (f.type === 'num') { ctx.globalAlpha = 1 - k; ctx.font = '800 ' + (f.big ? 15 : 11) + 'px Baloo 2, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; const tx = X(W, f.x), ty = Y(H, f.y) - 46 - k * 22; ctx.strokeText(String(f.v), tx, ty); ctx.fillStyle = f.us ? '#ff8a8a' : f.big ? '#ffe14d' : '#ffffff'; ctx.fillText(String(f.v), tx, ty); ctx.globalAlpha = 1; ctx.textAlign = 'left'; }
        if (f.type === 'armor') { ctx.fillStyle = 'rgba(236,235,226,' + (0.25 * (1 - k)) + ')'; ctx.fillRect(0, 0, W * 0.4, H); }
        if (f.type === 'wave') { ctx.globalAlpha = Math.min(1, (1 - k) * 2); ctx.font = '800 22px Baloo 2, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.55)'; const boss = NW.Hero.RIFTS[b.kind].boss, txt = f.n === b.waves.length && boss ? 'Wave ' + f.n + ': the ' + (boss === 'warden' ? 'Warden' : 'Chief') : 'Wave ' + f.n; ctx.strokeText(txt, W / 2, H * 0.3); ctx.fillStyle = '#ffffff'; ctx.fillText(txt, W / 2, H * 0.3); ctx.globalAlpha = 1; ctx.textAlign = 'left'; } });
    }
    ctx.restore();
  }
  /* a bone worker for the land's build sites: a small skeleton with a hammer, screen space */
  function worker(ctx, x, y, s, t) { const hand = skeleton(ctx, x, y, s, 0, '#7ff5ff', false); const a = Math.sin(t * 7) * 0.8; ln(ctx, hand, [hand[0] + Math.cos(a - 1) * 7 * s, hand[1] + Math.sin(a - 1) * 7 * s], '#6b4a2b', 1.6 * s); }

  NW.Battle = { LANE, HERO_X, FOES, TUNE, create, cast, aim, step, run, draw, worker, X, focusAt: (W, px) => (px - 34) / (W - 70) * LANE };
})();
