/* NextWorld · battle: the rift beasts come, your line holds
 * A side-on lane battle. The simulation is deterministic (seeded, fixed
 * step) and knows nothing of the canvas, so the tests play it headless
 * to keep it winnable and never trivial; the drawing reads it. Your
 * fighters re-form a few seconds after they fall: while they stand, you
 * stand. Every class casts its own spells, built from a dozen shapes. You aim with a tap and cast your spells; with auto on, the
 * spells cast themselves at the front of the enemy line. */
'use strict';
(function () {
  const LANE = 20, HERO_X = 1.1, SPAWN_X = 19.4, STEP = 1 / 30, LIMIT = 120;
  /* the balance, checked by tools/battlecheck.js: how fast the beasts grow a level, and what the spells do per point of spirit */
  const TUNE = { foe: 1.1, extra: 3, spear: 22, lightning: 12, poison: 10, bleed: 4, wall: 0.12 };   /* spear: a spell's damage per point of power at k 1; foe scales the beasts; extra: one more beast a wave for every this many of your fighters; wall: hero health per era of your land */
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
  function unitOf(side, id, spec, x, y) { return { side, id, x, y, hp: spec.hp, max: spec.hp, atk: spec.atk, range: spec.range, speed: spec.speed, cd: spec.cd, cdLeft: 0.3, aoe: spec.aoe || 0, slow: spec.slow || 0, size: spec.size || 1, boss: !!spec.boss, ranged: spec.range > 1.5, heal: !!spec.heal, dive: !!spec.dive, still: !!spec.still, slowT: 0, curseT: 0, stunT: 0, hasteT: 0, bleed: 0, shield: 0, shieldT: 0, dead: false, deadAt: 0, raised: 0, flash: 0, walk: 0 }; }

  /* ---- a battle ---- */
  function create(o) {
    const r = rng(o.seed || 7), rift = NW.Hero.RIFTS[o.kind] || NW.Hero.RIFTS.raid, L = o.level || 1;
    const b = { kind: o.kind, cls: o.cls || 'necromancer', t: 0, acc: 0, r, units: [], fx: [], corpses: [], queue: [], wave: -1, waves: waves(o.kind, rift.waves, rift.boss, r, (o.army || []).length), spawnT: 0, scale: rift.mult * (o.base || 1), level: L, power: o.power || 1, spirit: o.spirit || 20, weapon: o.weapon || null, spells: o.spells || ['spear'], cds: {}, focus: 12, auto: !!o.auto, heroMax: Math.round((60 + (o.phy || 10) * 1.5) * (1 + TUNE.wall * (o.wall || 0))), field: null, heroHp: 0, over: false, won: false, stars: 0, kills: 0, domainT: 0, shake: 0, par: 20 + rift.waves * 9, tired: !!o.tired };
    b.heroHp = b.heroMax;
    (o.army || []).forEach((u, i) => { const ranged = u.range > 1.5; const hx = (u.still ? 2.5 : ranged ? 2.2 : 3.4) + (i % 3) * 0.35; b.units.push(Object.assign(unitOf('us', u.id, u, hx, 0.15 + ((i * 37) % 70) / 100), { home: true, homeX: hx })); });
    return b;
  }
  const alive = (b, side) => b.units.filter(u => u.side === side && !u.dead);
  const wmult = b => 1 + (b.weapon ? b.weapon.atk / 80 : 0);
  function hurt(b, u, dmg, from) {
    if (u.dead) return; let d = dmg * (u.curseT > 0 ? 1.3 : 1); if (u.shield > 0) { const a = Math.min(u.shield, d); u.shield -= a; d -= a; } u.hp -= d; if (from === 'dot') { u.dot = (u.dot || 0) + d; if (u.dot >= u.max * 0.08 || u.hp <= 0) { b.fx.push({ type: 'num', x: u.x, y: u.y, v: Math.round(u.dot), t: 0, life: 0.8, us: u.side === 'us', dot: true }); u.dot = 0; } } else if (d >= u.max * 0.04 || !u.boss && d >= u.max * 0.02) u.flash = 0.07;   /* a white blink for a real blow only, so a boss under steady fire keeps its colour */   /* a bleed or a domain adds up and shows now and then; it does not flash every tick */
    if (d >= 1 && from !== 'dot') b.fx.push({ type: 'num', x: u.x, y: u.y, v: Math.round(d), t: 0, life: 0.8, us: u.side === 'us', big: d > u.max * 0.4 || from === 'spell' });
    if (u.hp <= 0) { u.dead = true; u.deadAt = b.t; if (u.side === 'them') { b.kills++; b.corpses.push({ x: u.x, y: u.y, at: b.t, id: u.id, max: u.max, atk: u.atk, size: u.size }); b.fx.push({ type: 'bones', x: u.x, y: u.y, t: 0, life: 0.9, seed: b.r() }); if (u.boss) b.shake = 0.5; } }
  }
  /* a weapon's curse, on whatever a spell hits */
  function affix(b, u) { const a = b.weapon && b.weapon.affix; if (!a) return; if (a === 'bleed') u.bleed = Math.max(u.bleed, 3); else if (a === 'slow') u.slowT = Math.max(u.slowT, 2); else if (a === 'decay') u.curseT = Math.max(u.curseT, 3); }
  function front(b) { const e = alive(b, 'them'); if (!e.length) return null; return e.reduce((m, u) => u.x < m.x ? u : m, e[0]).x; }

  /* ---- the spells: every class's, from the shapes in classes.js ---- */
  function mend(b, u, amt) { if (u.dead || u.hp >= u.max) return; const d = Math.min(u.max - u.hp, amt); u.hp += d; if (d >= 1) b.fx.push({ type: 'num', x: u.x, y: u.y, v: Math.round(d), t: 0, life: 0.8, heal: true }); }
  function cast(b, id) {
    const p = NW.Classes.spells[id]; if (b.over || !p || !b.spells.includes(id) || (b.cds[id] || 0) > 0) return false;
    const fx = b.focus, sp = b.power * wmult(b), D = sp * TUNE.spear * (p.k || 0), foes = alive(b, 'them'), mine = alive(b, 'us'), near = r => foes.filter(u => Math.abs(u.x - fx) < r);   /* power already carries the tiredness */
    const hit = (u, d) => { hurt(b, u, d, 'spell'); affix(b, u); };
    if (p.fx === 'strike') { const got = near(p.r); got.forEach(u => hit(u, D)); if (b.weapon && b.weapon.affix === 'lightning') foes.filter(u => !got.includes(u)).sort((a, c) => Math.abs(a.x - fx) - Math.abs(c.x - fx)).slice(0, 2).forEach(u => { hurt(b, u, sp * TUNE.lightning, 'spell'); b.fx.push({ type: 'bolt', x: fx, x2: u.x, y: u.y, t: 0, life: 0.3 }); }); if (b.weapon && b.weapon.affix === 'poison') foes.filter(u => !got.includes(u) && Math.abs(u.x - fx) < p.r + 1.5).forEach(u => hurt(b, u, sp * TUNE.poison, 'spell')); b.fx.push({ type: id === 'spear' ? 'spear' : 'burst', x: fx, r: p.r, c: p.c, t: 0, life: 0.6 }); }
    else if (p.fx === 'single') { const t = near(p.r).sort((a, c) => c.hp - a.hp)[0]; if (!t) return false; hit(t, D); b.fx.push({ type: 'slash', x: t.x, y: t.y, c: p.c, t: 0, life: 0.5 }); }
    else if (p.fx === 'chain') { let from = null, dmg = D; const left = foes.slice(); for (let i = 0; i < p.n && left.length; i++) { const at = from ? from.x : fx; left.sort((a, c) => Math.abs(a.x - at) - Math.abs(c.x - at)); const t = left.shift(); hit(t, dmg); b.fx.push({ type: 'bolt', x: from ? from.x : fx, x2: t.x, y: t.y, t: 0, life: 0.35, c: p.c }); from = t; dmg *= 0.85; } if (!from) return false; }
    else if (p.fx === 'volley') { if (!foes.length) return false; for (let i = 0; i < p.n; i++) { const t = foes[Math.floor(b.r() * foes.length)]; hit(t, D); b.fx.push({ type: 'fall', x: t.x, y: t.y, t: -i * 0.04, life: 0.45, c: p.c }); } }
    else if (p.fx === 'hex') { near(p.r).forEach(u => { u.slowT = p.dur; u.curseT = p.dur; if (p.bleed) u.bleed = Math.max(u.bleed, p.bleed); hit(u, D); }); b.fx.push({ type: 'curse', x: fx, c: p.c, t: 0, life: 1.2 }); }
    else if (p.fx === 'stun') { near(p.r).forEach(u => { u.stunT = Math.max(u.stunT, u.boss ? p.dur * 0.4 : p.dur); hit(u, D); }); b.fx.push({ type: 'stun', x: fx, r: p.r, c: p.c, t: 0, life: 0.8 }); }
    else if (p.fx === 'shield') { mine.forEach(u => { u.shield = u.max * p.pct; u.shieldT = p.dur; }); b.fx.push({ type: 'armor', t: 0, life: 0.8 }); }
    else if (p.fx === 'heal') { mine.forEach(u => mend(b, u, u.max * p.pct)); b.heroHp = Math.min(b.heroMax, b.heroHp + b.heroMax * p.pct * 0.3); b.fx.push({ type: 'heal', t: 0, life: 0.9 }); }
    else if (p.fx === 'haste') { mine.forEach(u => { u.hasteT = p.dur; if (p.shield) { u.shield = Math.max(u.shield, u.max * p.shield); u.shieldT = p.dur; } }); b.fx.push({ type: 'haste', t: 0, life: 0.8, c: p.c }); }
    else if (p.fx === 'summon') { const spec = NW.Classes.units[p.unit], n = p.n + Math.floor(b.level / 6); for (let i = 0; i < n; i++) { const x = spec.still ? 2.6 + i * 0.6 : 3.2 + i * 0.3, y = 0.15 + ((i * 0.29) % 0.7); b.units.push(Object.assign(unitOf('us', p.unit, { hp: Math.round(spec.hp * b.power), atk: Math.round(spec.atk * b.power), range: spec.range, speed: spec.speed, cd: spec.cd, aoe: spec.aoe, still: spec.still, dive: spec.dive }, x, y), { raised: p.dur, homeX: x, called: true })); b.fx.push({ type: 'rise', x, y, c: '#8ff0ff', t: 0, life: 0.8 }); } }
    else if (p.fx === 'raise') { const fresh = b.corpses.filter(c => b.t - c.at < 12 && !c.used).slice(-(1 + Math.floor(b.level / 4))); fresh.forEach(c => { c.used = true; b.units.push(Object.assign(unitOf('us', 'raised', { hp: Math.max(40, c.max * 0.6), atk: Math.max(8, c.atk), range: 0.7, speed: 1.8, cd: 0.9, size: Math.min(1.4, c.size) }, c.x, c.y), { raised: 15, kind: c.id, homeX: 5 })); b.fx.push({ type: 'rise', x: c.x, y: c.y, t: 0, life: 0.8 }); }); if (!fresh.length) return false; }
    else if (p.fx === 'field') { b.field = { k: p.k, c: p.c, haste: !!p.haste, mend: p.mend || 0 }; b.domainT = p.dur; if (p.stun) foes.forEach(u => { u.stunT = Math.max(u.stunT, u.boss ? p.stun * 0.4 : p.stun); }); if (p.burst) foes.forEach(u => hurt(b, u, D * p.burst, 'spell')); b.fx.push({ type: 'domain', t: 0, life: p.dur }); }
    b.cds[id] = p.cd; b.castAt = b.t; b.lastSpell = id; return true;
  }
  /* auto: every spell has a sense of when it is worth casting */
  function wants(b, id) { const p = NW.Classes.spells[id], mine = alive(b, 'us'), foes = alive(b, 'them'); if (!p || !foes.length) return false;
    if (p.fx === 'shield') return mine.some(u => u.hp < u.max * 0.7); if (p.fx === 'heal') return mine.some(u => u.hp < u.max * 0.6) || b.heroHp < b.heroMax * 0.6; if (p.fx === 'field') return foes.length >= 5 || foes.some(u => u.boss); if (p.fx === 'haste') return foes.length >= 3; return true; }
  /* what a ranged fighter throws */
  function shotOf(u) { if (u.side === 'them') return 'venom'; const lk = (NW.Classes.units[u.id] || {}).look || {}; return lk.g === 'bow' || lk.g === 'crossbow' || lk.g === 'knives' || lk.g === 'sling' || lk.g === 'spear' ? 'arrow' : 'orb'; }
  function aim(b, x) { b.focus = Math.max(2, Math.min(LANE - 0.5, x)); b.aimedAt = b.t; }

  /* ---- one fixed step ---- */
  function tick(b) {
    const dt = STEP; b.t += dt; Object.keys(b.cds).forEach(k => { b.cds[k] = Math.max(0, b.cds[k] - dt); }); b.shake = Math.max(0, b.shake - dt);
    /* the next wave when the field is clear */
    if (!b.queue.length && !alive(b, 'them').length) { if (b.wave + 1 >= b.waves.length) { b.over = true; b.won = true; } else { b.wave++; b.queue = b.waves[b.wave].slice(); b.spawnT = 0.6; b.fx.push({ type: 'wave', t: 0, life: 1.6, n: b.wave + 1 }); } }
    if (b.queue.length) { b.spawnT -= dt; if (b.spawnT <= 0) { const id = b.queue.shift(), f = FOES[id], sc = b.scale * (f.boss ? 1.15 : 1); b.units.push(Object.assign(unitOf('them', id, { hp: Math.round(f.hp * sc * TUNE.foe), atk: f.atk * sc * Math.sqrt(TUNE.foe), range: f.range, speed: f.speed, cd: f.cd, aoe: f.aoe, size: f.size, boss: f.boss }, SPAWN_X, 0.12 + b.r() * 0.76), { flank: !!f.flank })); b.spawnT = FOES[id].boss ? 1.2 : 0.55; } }
    if (b.auto || !b.aimedAt || b.t - b.aimedAt > 4) { const f = front(b); if (f != null) b.focus = Math.min(LANE - 0.5, f + 0.8); }
    if (b.auto) b.spells.forEach(id => { if (wants(b, id)) cast(b, id); });
    if (b.domainT > 0 && b.field) { b.domainT -= dt; const f = b.field; alive(b, 'them').forEach(u => { hurt(b, u, b.power * wmult(b) * TUNE.spear * f.k * dt, 'dot'); u.slowT = Math.max(u.slowT, 0.3); }); alive(b, 'us').forEach(u => { if (f.haste) u.hasteT = Math.max(u.hasteT, 0.3); if (f.mend) u.hp = Math.min(u.max, u.hp + u.max * f.mend * dt); }); }
    b.units.forEach(u => {
      u.flash = Math.max(0, u.flash - dt);
      if (u.dead) { if (u.side === 'us' && u.home && b.t - u.deadAt > 4) { u.dead = false; u.hp = u.max; u.x = u.homeX; b.fx.push({ type: 'rise', x: u.x, y: u.y, t: 0, life: 0.8 }); } return; }
      if (u.raised) { u.raised -= dt; if (u.raised <= 0) { u.dead = true; u.home = false; u.deadAt = b.t; return; } }
      u.slowT = Math.max(0, u.slowT - dt); u.curseT = Math.max(0, u.curseT - dt); u.hasteT = Math.max(0, u.hasteT - dt); u.shieldT -= dt; if (u.shieldT <= 0) u.shield = 0;
      if (u.bleed > 0) { u.bleed -= dt; hurt(b, u, b.power * wmult(b) * TUNE.bleed * dt, 'dot'); if (u.dead) return; }   /* a bleed hurts by your power, not by the size of what bleeds */
      if (u.stunT > 0) { u.stunT -= dt; return; }   /* stunned: no step, no swing */
      u.cdLeft -= dt; const foes = alive(b, u.side === 'us' ? 'them' : 'us'); const dir = u.side === 'us' ? 1 : -1, fast = u.hasteT > 0;
      if (u.heal && u.cdLeft <= 0) { const hurtOne = alive(b, u.side).filter(a => a !== u && a.hp < a.max * 0.9 && Math.abs(a.x - u.x) < u.range).sort((a, c) => a.hp / a.max - c.hp / c.max)[0]; if (hurtOne) { mend(b, hurtOne, u.atk * 1.6); u.cdLeft = u.cd * (fast ? 0.6 : 1); b.fx.push({ type: 'mend', x: u.x, y: u.y, x2: hurtOne.x, y2: hurtOne.y, t: 0, life: 0.4 }); return; } }   /* a healer mends first and fights only when nobody needs it */
      let target = null, best = 1e9; if (!u.flank) foes.forEach(f => { const d = (f.x - u.x) * dir; if (d > -0.4 && d < best) { best = d; target = f; } });
      if (u.dive) { const back = foes.filter(f => f.ranged).sort((a, c) => a.x - c.x)[0]; if (back) { target = back; best = Math.abs(back.x - u.x); } }   /* a diver runs past the front for the casters */
      const spd = u.speed * (u.slowT > 0 ? 0.5 : 1) * (fast ? 1.3 : 1);
      if (u.side === 'them' && (!target || best > u.range) && u.x <= HERO_X + 0.6) { if (u.cdLeft <= 0) { b.heroHp -= u.atk; u.cdLeft = u.cd; b.shake = 0.15; b.fx.push({ type: 'hit', x: HERO_X, y: 0.5, t: 0, life: 0.3 }); if (b.heroHp <= 0) { b.over = true; b.won = false; } } return; }
      if (target && best <= u.range) { if (u.cdLeft <= 0) { u.cdLeft = u.cd * (fast ? 0.6 : 1); const dmg = u.atk * (b.tired && u.side === 'us' ? 0.75 : 1); if (u.range > 1.5) b.fx.push({ type: shotOf(u), x: u.x, y: u.y, x2: target.x, y2: target.y, t: 0, life: 0.35 }); hurt(b, target, dmg); if (u.aoe) foes.filter(f => f !== target && Math.abs(f.x - target.x) < u.aoe).forEach(f => { hurt(b, f, dmg * 0.6); if (u.slow) f.slowT = Math.max(f.slowT, 2); }); if (u.slow) target.slowT = Math.max(target.slowT, 2); } }
      else if (u.side === 'them') { u.x = Math.max(HERO_X + 0.5, u.x - spd * dt); u.walk += dt * spd * 3; }
      else if (u.still) { /* a turret or a totem stays where it was put */ }
      else if (target) { /* your line advances; the ranged ones keep behind the front of their own line */ let cap = LANE - 0.5; if (u.ranged) { const melee = alive(b, 'us').filter(m => !m.ranged); if (melee.length) cap = Math.max(u.x, Math.max.apply(null, melee.map(m => m.x)) - 0.5); } const nx = Math.min(cap, u.x + spd * dt); if (nx !== u.x) u.walk += dt * spd * 3; u.x = nx; }
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
      const lane = g.createLinearGradient(0, H * 0.58, 0, H * 0.84); lane.addColorStop(0, 'rgba(120,90,60,0)'); lane.addColorStop(0.25, 'rgba(120,90,60,.45)'); lane.addColorStop(0.75, 'rgba(96,72,48,.5)'); lane.addColorStop(1, 'rgba(96,72,48,0)'); g.fillStyle = lane; g.fillRect(0, H * 0.58, W, H * 0.26);   /* the trodden lane from the wall to the rift */
      for (let i = 0; i < 90; i++) { const x = (i * 131.7) % W, y = gy + 4 + (H - gy - 6) * ((i * 0.618) % 1), sh = 3 + (i % 4) * 1.5; g.strokeStyle = i % 3 ? NW.shade(look.ground, 0.18) : NW.shade(look.ground, -0.25); g.lineWidth = 1.2; g.beginPath(); g.moveTo(x, y); g.lineTo(x - 2, y - sh); g.moveTo(x, y); g.lineTo(x + 2, y - sh * 0.8); g.stroke(); }
      /* your wall on the left, and the home behind it */
      g.fillStyle = '#3a2a1e'; for (let i = 0; i < 7; i++) { g.fillRect(4 + i * 7, gy - 34 - (i % 2) * 4, 6, 44 + (i % 2) * 4); g.beginPath(); g.moveTo(4 + i * 7, gy - 34 - (i % 2) * 4); g.lineTo(7 + i * 7, gy - 40 - (i % 2) * 4); g.lineTo(10 + i * 7, gy - 34 - (i % 2) * 4); g.fill(); }
      g.fillStyle = '#2a2036'; g.fillRect(14, gy - 70, 26, 30); g.beginPath(); g.moveTo(10, gy - 70); g.lineTo(27, gy - 88); g.lineTo(44, gy - 70); g.fill(); g.fillStyle = '#ffd98a'; g.fillRect(22, gy - 62, 5, 6); }
    ctx.drawImage(bg.cv, 0, 0, W, H);
  }
  let K = 1;   /* how big a unit is on this canvas: a person-sized skeleton is about a tenth of the field's height */
  const X = (W, x) => 34 + x / LANE * (W - 70), Y = (H, y) => H * 0.71 + (y - 0.5) * H * 0.26, SC = y => (0.85 + y * 0.3) * K;
  function blob(ctx, x, y, r, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); }
  function ell(ctx, x, y, rx, ry, c) { ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2); ctx.fill(); }
  function ln(ctx, a, b, c, w) { ctx.strokeStyle = c; ctx.lineWidth = w || 1.5; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
  /* a body lit from the upper left, and a soft glow: the rift beasts get the same light as your line */
  function lit(ctx, x, y0, y1, c) { const g = ctx.createLinearGradient(x - 10, y0, x + 8, y1); g.addColorStop(0, NW.shade(c, 0.22)); g.addColorStop(0.55, c); g.addColorStop(1, NW.shade(c, -0.35)); return g; }
  function glowAt(ctx, x, y, r, c, a) { const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, c); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.globalAlpha = a == null ? 0.7 : a; ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill(); ctx.globalAlpha = 1; }
  function poly(ctx, pts, c) { ctx.fillStyle = c; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill(); }
  /* the rift beasts, facing left: a slime, a hound, an ogre and its chief, a goblin shaman, the warden */
  function drawThem(ctx, u, px, py, s, t) {
    const F = u.flash > 0, bob = Math.sin(u.walk) * 1.5 * s, stun = u.stunT > 0;
    if (u.id === 'crawler') { const c = F ? '#ffffff' : '#7a3fb0', sq = 1 + Math.sin(u.walk * 1.4) * 0.08;
      for (let i = 0; i < 4; i++) ln(ctx, [px - 6 * s + i * 4 * s, py - 3 * s], [px - 7 * s + i * 4 * s + Math.sin(u.walk * 2 + i) * 2 * s, py], NW.shade(c, -0.3), 1.6 * s);
      ctx.fillStyle = lit(ctx, px, py - 14 * s, py, c); ctx.beginPath(); ctx.ellipse(px, py - 6 * s + bob, 10 * s * sq, 7.5 * s / sq, 0, Math.PI, 0); ctx.quadraticCurveTo(px + 11 * s, py + 1 * s, px, py); ctx.quadraticCurveTo(px - 11 * s, py + 1 * s, px - 10 * s * sq, py - 6 * s + bob); ctx.fill();
      ell(ctx, px - 3 * s, py - 10 * s + bob, 4 * s, 2 * s, 'rgba(255,255,255,.28)'); [-5, -1].forEach(dx => { blob(ctx, px + dx * s, py - 7 * s + bob, 1.9 * s, '#1c0f2a'); blob(ctx, px + dx * s - 0.4 * s, py - 7.3 * s + bob, 1.1 * s, stun ? '#ffffff' : '#ffe14d'); }); glowAt(ctx, px - 3 * s, py - 7 * s + bob, 6 * s, '#ffe14d', 0.35); return; }
    if (u.id === 'hound') { const c = F ? '#ffffff' : '#2b2433', run = u.walk * 2;
      [[-8, 0], [-4, 2], [5, 1], [9, 3]].forEach(([o, ph]) => ln(ctx, [px + o * s, py - 9 * s], [px + o * s + Math.sin(run + ph) * 3.5 * s, py], NW.shade(c, -0.1), 2.2 * s));
      ctx.fillStyle = lit(ctx, px, py - 17 * s, py - 6 * s, c); ctx.beginPath(); ctx.ellipse(px, py - 12 * s + bob * 0.5, 12 * s, 5.5 * s, -0.08, 0, Math.PI * 2); ctx.fill();
      for (let i = 0; i < 5; i++) poly(ctx, [[px - 6 * s + i * 3.5 * s, py - 16 * s], [px - 5 * s + i * 3.5 * s, py - 21 * s - (i % 2) * 2 * s], [px - 3.5 * s + i * 3.5 * s, py - 16 * s]], F ? '#ffffff' : '#c23cff');
      ln(ctx, [px + 11 * s, py - 13 * s], [px + 18 * s, py - 19 * s + Math.sin(t * 8) * 2 * s], c, 2.2 * s);
      ctx.fillStyle = c; ctx.beginPath(); ctx.ellipse(px - 13 * s, py - 16 * s, 6 * s, 4.2 * s, 0.15, 0, Math.PI * 2); ctx.fill(); poly(ctx, [[px - 17 * s, py - 15 * s], [px - 22 * s, py - 13 * s], [px - 17 * s, py - 12 * s]], c); poly(ctx, [[px - 11 * s, py - 19 * s], [px - 9 * s, py - 25 * s], [px - 7.5 * s, py - 19 * s]], c);
      ln(ctx, [px - 21 * s, py - 12.5 * s], [px - 16 * s, py - 12 * s], '#ffffff', 0.8 * s); blob(ctx, px - 15 * s, py - 17 * s, 1.4 * s, stun ? '#ffffff' : '#ff3b3b'); glowAt(ctx, px - 15 * s, py - 17 * s, 5 * s, '#ff3b3b', 0.5); return; }
    if (u.id === 'brute' || u.id === 'chief') { const chief = u.id === 'chief', c = F ? '#ffffff' : chief ? '#6b5a3a' : '#5f6b4a', swing = Math.sin(t * 3) * 4 * s;
      ln(ctx, [px - 5 * s, py - 8 * s], [px - 6 * s + bob, py], NW.shade(c, -0.3), 5.5 * s); ln(ctx, [px + 5 * s, py - 8 * s], [px + 6 * s - bob, py], NW.shade(c, -0.3), 5.5 * s);
      ctx.fillStyle = lit(ctx, px, py - 36 * s, py - 6 * s, c); ctx.beginPath(); ctx.ellipse(px, py - 20 * s, 12.5 * s, 15.5 * s, 0, 0, Math.PI * 2); ctx.fill(); ell(ctx, px + 1 * s, py - 15 * s, 8 * s, 8 * s, NW.shade(c, 0.12));
      ctx.fillStyle = '#5a3a1e'; ctx.fillRect(px - 12 * s, py - 12 * s, 24 * s, 3 * s); if (chief) { ln(ctx, [px - 9 * s, py - 30 * s], [px + 9 * s, py - 12 * s], '#b03a2e', 2.4 * s); }
      ln(ctx, [px + 9 * s, py - 28 * s], [px + 12 * s, py - 16 * s], NW.shade(c, -0.15), 4.5 * s);
      blob(ctx, px - 3 * s, py - 38 * s, 6.5 * s, c); ell(ctx, px - 7 * s, py - 35 * s, 3.5 * s, 2.4 * s, NW.shade(c, 0.1)); poly(ctx, [[px - 8 * s, py - 34 * s], [px - 7 * s, py - 31 * s], [px - 6 * s, py - 34 * s]], '#f4ecd0');
      blob(ctx, px - 6 * s, py - 40 * s, 1.5 * s, stun ? '#ffffff' : '#ff5a2a'); glowAt(ctx, px - 6 * s, py - 40 * s, 5 * s, '#ff5a2a', 0.5);
      if (chief) { ctx.fillStyle = '#6b7280'; ctx.beginPath(); ctx.arc(px - 3 * s, py - 41 * s, 7 * s, Math.PI, 0); ctx.fill(); [[-9, -1], [3, 1]].forEach(([dx, d]) => { ctx.strokeStyle = '#f4ecd0'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(px + dx * s, py - 43 * s); ctx.quadraticCurveTo(px + (dx + d * 5) * s, py - 48 * s, px + (dx + d * 3) * s, py - 53 * s); ctx.stroke(); }); }
      ln(ctx, [px - 10 * s, py - 26 * s], [px - 21 * s, py - 38 * s + swing], '#6b4a2b', 4 * s); ctx.fillStyle = lit(ctx, px - 22 * s, py - 46 * s + swing, py - 34 * s + swing, '#4a3326'); ctx.beginPath(); ctx.ellipse(px - 22 * s, py - 41 * s + swing, 5 * s, 6.5 * s, -0.5, 0, Math.PI * 2); ctx.fill(); for (let i = 0; i < 4; i++) { const a = -0.5 + i * 1.6; blob(ctx, px - 22 * s + Math.cos(a) * 5.5 * s, py - 41 * s + swing + Math.sin(a) * 6 * s, 1.2 * s, '#c9d2dc'); } return; }
    if (u.id === 'shaman') { const c = F ? '#ffffff' : '#2e3d2e', fl = Math.sin(t * 7);
      poly(ctx, [[px - 8 * s, py], [px + 8 * s, py], [px + 3 * s, py - 27 * s], [px - 4 * s, py - 27 * s]], lit(ctx, px, py - 27 * s, py, c)); for (let i = 0; i < 4; i++) poly(ctx, [[px - 8 * s + i * 4 * s, py], [px - 6 * s + i * 4 * s, py + 2 * s], [px - 4 * s + i * 4 * s, py]], NW.shade(c, -0.3));
      blob(ctx, px, py - 30 * s, 5.2 * s, '#6b8a4a'); poly(ctx, [[px - 4 * s, py - 32 * s], [px - 11 * s, py - 36 * s], [px - 4 * s, py - 29 * s]], '#6b8a4a'); ctx.fillStyle = '#d9c9a8'; ctx.fillRect(px - 5 * s, py - 33 * s, 6 * s, 5 * s); blob(ctx, px - 3.5 * s, py - 31 * s, 1 * s, stun ? '#ffffff' : '#7cff8a');
      poly(ctx, [[px - 4 * s, py - 34 * s], [px, py - 42 * s], [px + 4 * s, py - 34 * s]], '#8a3a2a'); ln(ctx, [px - 9 * s, py + 2 * s], [px - 11 * s, py - 31 * s], '#6b4a2b', 1.8 * s); glowAt(ctx, px - 11 * s, py - 34 * s, 10 * s, '#7cff8a', 0.55 + fl * 0.15); blob(ctx, px - 11 * s, py - 34 * s, 2.6 * s, '#c8ffd0');
      for (let i = 0; i < 3; i++) { const a = t * 2 + i * 2.1; blob(ctx, px - 11 * s + Math.cos(a) * 8 * s, py - 34 * s + Math.sin(a) * 4 * s, 1 * s, 'rgba(124,255,138,.8)'); } return; }
    if (u.id === 'warden') { const c = F ? '#ffffff' : '#3a1f26', wing = Math.sin(t * 2) * 4 * s;
      poly(ctx, [[px + 4 * s, py - 44 * s], [px + 30 * s, py - 70 * s - wing], [px + 26 * s, py - 40 * s], [px + 34 * s, py - 32 * s], [px + 12 * s, py - 30 * s]], F ? '#ffffff' : '#241016'); glowAt(ctx, px, py - 30 * s, 40 * s, '#ff4f6d', 0.18);
      ln(ctx, [px - 7 * s, py - 10 * s], [px - 8 * s + bob, py], NW.shade(c, -0.2), 7.5 * s); ln(ctx, [px + 7 * s, py - 10 * s], [px + 8 * s - bob, py], NW.shade(c, -0.2), 7.5 * s);
      ctx.fillStyle = lit(ctx, px, py - 54 * s, py - 8 * s, c); ctx.beginPath(); ctx.ellipse(px, py - 30 * s, 16 * s, 24 * s, 0, 0, Math.PI * 2); ctx.fill();
      ctx.strokeStyle = '#ff4f6d'; ctx.lineWidth = 2 * s; ctx.beginPath(); ctx.moveTo(px - 8 * s, py - 42 * s); ctx.lineTo(px, py - 26 * s); ctx.lineTo(px + 8 * s, py - 42 * s); ctx.moveTo(px - 5 * s, py - 20 * s); ctx.lineTo(px + 5 * s, py - 20 * s); ctx.stroke(); glowAt(ctx, px, py - 32 * s, 12 * s, '#ff4f6d', 0.4 + Math.sin(t * 4) * 0.1);
      ln(ctx, [px - 13 * s, py - 44 * s], [px - 26 * s, py - 30 * s + Math.sin(t * 2.5) * 4 * s], c, 6 * s); for (let i = 0; i < 3; i++) ln(ctx, [px - 26 * s, py - 30 * s + Math.sin(t * 2.5) * 4 * s], [px - 31 * s - i * 1 * s, py - 27 * s + i * 2.5 * s + Math.sin(t * 2.5) * 4 * s], '#d9d2c4', 1.4 * s);
      blob(ctx, px, py - 58 * s, 9 * s, c); [[-1], [1]].forEach(([d]) => { ctx.strokeStyle = '#d9d2c4'; ctx.lineWidth = 3 * s; ctx.beginPath(); ctx.moveTo(px + d * 6 * s, py - 64 * s); ctx.quadraticCurveTo(px + d * 16 * s, py - 70 * s, px + d * 14 * s, py - 80 * s); ctx.stroke(); });
      blob(ctx, px - 4 * s, py - 59 * s, 2 * s, stun ? '#ffffff' : '#ff4f6d'); blob(ctx, px + 3 * s, py - 59 * s, 2 * s, stun ? '#ffffff' : '#ff4f6d'); glowAt(ctx, px, py - 59 * s, 9 * s, '#ff4f6d', 0.5); }
  }
  function portal(ctx, W, H, t) { const x = W - 22, y = H * 0.62; for (let i = 0; i < 4; i++) { ctx.strokeStyle = 'rgba(' + (180 + i * 18) + ',60,' + (200 - i * 20) + ',' + (0.8 - i * 0.15) + ')'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x, y, 16 - i * 3 + Math.sin(t * 3 + i) * 1.5, 46 - i * 8, 0, t * (1 + i * 0.3), t * (1 + i * 0.3) + Math.PI * 1.6); ctx.stroke(); } const g = ctx.createRadialGradient(x, y, 2, x, y, 40); g.addColorStop(0, 'rgba(255,90,180,.55)'); g.addColorStop(1, 'rgba(255,90,180,0)'); ctx.fillStyle = g; ctx.fillRect(x - 40, y - 60, 80, 120); }

  function draw(ctx, W, H, b, now, look) {
    const t = now / 1000; K = Math.max(0.8, Math.min(1.9, H / 280)); ctx.save(); if (b && b.shake > 0) ctx.translate((Math.random() - 0.5) * b.shake * 12, (Math.random() - 0.5) * b.shake * 8);
    backdrop(ctx, W, H, look); portal(ctx, W, H, t); [12, 44].forEach((x, i) => { const y = H * 0.66 - 44, fl = 1 + Math.sin(t * 11 + i * 2) * 0.2; const tg = ctx.createRadialGradient(x, y, 0, x, y, 26 * fl); tg.addColorStop(0, 'rgba(255,190,90,.6)'); tg.addColorStop(1, 'rgba(255,190,90,0)'); ctx.fillStyle = tg; ctx.beginPath(); ctx.arc(x, y, 26 * fl, 0, Math.PI * 2); ctx.fill(); blob(ctx, x, y, 3 * fl, '#ffd98a'); });
    if (b && b.domainT > 0 && b.field) { const a = Math.min(1, b.domainT, 6 - b.domainT + 0.2), fc = NW.hex(b.field.c || '#5a1490').join(','); const dg = ctx.createLinearGradient(0, H * 0.5, 0, H); dg.addColorStop(0, 'rgba(' + fc + ',0)'); dg.addColorStop(0.4, 'rgba(' + fc + ',' + 0.45 * a + ')'); dg.addColorStop(1, 'rgba(' + fc + ',' + 0.7 * a + ')'); ctx.fillStyle = dg; ctx.fillRect(0, H * 0.5, W, H * 0.5); for (let i = 0; i < 26; i++) { const x = (i * 97 + t * 30 * (i % 3 + 1)) % W, y = H - ((t * 40 + i * 37) % (H * 0.45)); blob(ctx, x, y, 2 + (i % 3), 'rgba(200,140,255,' + 0.6 * a + ')'); } }
    NW.Figures.hero(ctx, X(W, HERO_X) - 6, Y(H, 0.5), look, t, !!(b && b.castAt != null && b.t - b.castAt < 0.4), K * 0.95);
    if (b) {
      const fx = X(W, b.focus); ctx.strokeStyle = 'rgba(127,245,255,.55)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.ellipse(fx, H * 0.72, 30, 7, 0, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
      b.fx.forEach(f => { const k = f.t / f.life;
        if (f.type === 'burst') { const x0 = X(W, f.x), rr = (f.r || 2.2) / LANE * (W - 70); ctx.globalAlpha = 1 - k; const g = ctx.createRadialGradient(x0, H * 0.72, 0, x0, H * 0.72, rr * (0.4 + k)); g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, f.c || '#ffb02e'); g.addColorStop(1, 'rgba(0,0,0,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x0, H * 0.72, rr * (0.4 + k), rr * (0.4 + k) * 0.45, 0, 0, Math.PI * 2); ctx.fill(); for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; blob(ctx, x0 + Math.cos(a) * rr * k, H * 0.72 - 10 - Math.abs(Math.sin(a)) * 30 * k, 2.4 * (1 - k) * K, f.c || '#ffb02e'); } ctx.globalAlpha = 1; }
        if (f.type === 'stun') { const x0 = X(W, f.x), rr = (f.r || 2.2) / LANE * (W - 70); ctx.strokeStyle = f.c || '#ffe08a'; ctx.globalAlpha = 1 - k; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(x0, H * 0.72, rr * (0.3 + k * 0.8), rr * (0.3 + k * 0.8) * 0.3, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
        if (f.type === 'curse') { ctx.strokeStyle = f.c ? f.c : 'rgba(181,108,255,' + (1 - k) + ')'; ctx.globalAlpha = f.c ? 1 - k : 1; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(X(W, f.x), H * 0.72, 20 + k * 60, 5 + k * 14, 0, 0, Math.PI * 2); ctx.stroke(); ctx.globalAlpha = 1; }
        if (f.type === 'spear') for (let i = -4; i <= 4; i++) { const sx = X(W, f.x) + i * 11, hgt = (1 - Math.abs(k * 2 - 1)) * (26 + (i % 2) * 8); ctx.fillStyle = '#ecebe2'; ctx.beginPath(); ctx.moveTo(sx - 3, H * 0.74); ctx.lineTo(sx, H * 0.74 - hgt); ctx.lineTo(sx + 3, H * 0.74); ctx.fill(); } });
      const drawable = b.units.filter(u => !u.dead).sort((a, c) => a.y - c.y);
      b.corpses.slice(-14).forEach(c => { if (b.t - c.at > 12 || c.used) return; ctx.fillStyle = 'rgba(236,235,226,.35)'; ctx.fillRect(X(W, c.x) - 6, Y(H, c.y) - 2, 12, 2); });
      drawable.forEach((u, ui) => { const px = X(W, u.x) + (u.side === 'us' ? (((u.id.length * 7 + ui * 5) % 5) - 2) * 3.5 * K : 0), py = Y(H, u.y), s = SC(u.y) * (u.size || 1);
        ell(ctx, px, py + 1, 10 * s, 3 * s, 'rgba(0,0,0,.3)');
        if (u.side === 'us') NW.Figures.unit(ctx, u, px, py, SC(u.y), t); else drawThem(ctx, u, px, py, s, t);
        if (u.stunT > 0) for (let i = 0; i < 3; i++) { const a = t * 5 + i * 2.1; blob(ctx, px + Math.cos(a) * 8 * s, py - 46 * s + Math.sin(a) * 2.5 * s, 1.6 * K, '#ffe14d'); }
        if (u.hasteT > 0 && u.side === 'us') ln(ctx, [px - 12 * s, py - 14 * s], [px - 20 * s, py - 14 * s], 'rgba(255,255,255,.5)', 1.2);
        if (u.shield > 0) { const hh = (u.side === 'us' ? NW.Figures.height(u.id) * SC(u.y) : 40 * s) * 0.55, a = Math.min(1, u.shield / (u.max * 0.3)); ctx.globalAlpha = 0.1 + 0.14 * a; ctx.strokeStyle = '#e6f4ff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(px, py - hh, 12 * s, hh + 2, 0, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); ctx.globalAlpha = 1; }
        if (u.curseT > 0) blob(ctx, px, py - 44 * s, 2.5, '#b56cff');
        if (u.hp < u.max && !u.boss) { const w = 20 * s, hy = py - (u.side === 'us' ? NW.Figures.height(u.id) * SC(u.y) : 42 * s); ctx.fillStyle = 'rgba(0,0,0,.5)'; ctx.fillRect(px - w / 2, hy, w, 3); ctx.fillStyle = u.side === 'us' ? '#7ff5ff' : '#ff5a6e'; ctx.fillRect(px - w / 2, hy, w * Math.max(0, u.hp / u.max), 3); } });
      let nums = 0; b.fx.forEach(f => { const k = f.t / f.life;
        if (f.type === 'arrow' || f.type === 'orb' || f.type === 'venom' || f.type === 'bolt') { const x0 = X(W, f.x), y0 = Y(H, f.y == null ? 0.5 : f.y) - 20 * K, x1 = X(W, f.x2), y1 = Y(H, f.y2 == null ? f.y : f.y2) - 18, px = x0 + (x1 - x0) * k, py = y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * (f.type === 'arrow' ? 18 : 6); if (f.type === 'arrow') ln(ctx, [px - 6, py + 1], [px + 2, py], '#e6e3d6', 1.5); else if (f.type === 'bolt') { ctx.globalAlpha = 1 - k; ctx.strokeStyle = f.c || '#a0dcff'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(x0, y0); for (let i = 1; i < 6; i++) ctx.lineTo(x0 + (x1 - x0) * i / 6 + (i % 2 ? 5 : -5), y0 + (y1 - y0) * i / 6 + (i % 2 ? -6 : 6)); ctx.lineTo(x1, y1); ctx.stroke(); ctx.globalAlpha = 1; } else blob(ctx, px, py, 3.5, f.type === 'orb' ? 'rgba(255,140,60,.95)' : 'rgba(124,255,138,.9)'); }
        if (f.type === 'rise') { for (let i = 0; i < 6; i++) blob(ctx, X(W, f.x) + Math.sin(i * 2 + k * 6) * 8, Y(H, f.y) - k * 30 - i * 4, 2.2 * (1 - k) * K, f.c || 'rgba(124,255,138,.8)'); }
        if (f.type === 'slash') { const x0 = X(W, f.x), y0 = Y(H, f.y) - 20 * K; ctx.globalAlpha = 1 - k; ln(ctx, [x0 - 16 * K, y0 - 14 * K + k * 6], [x0 + 16 * K, y0 + 10 * K + k * 6], f.c || '#ffffff', 3 * K); ln(ctx, [x0 - 12 * K, y0 + 10 * K], [x0 + 14 * K, y0 - 12 * K], '#ffffff', 1.5 * K); ctx.globalAlpha = 1; }
        if (f.type === 'fall' && k > 0) { const x0 = X(W, f.x), y0 = Y(H, f.y) - 18 * K; ln(ctx, [x0 - 6 + (1 - k) * 20, y0 - (1 - k) * 90], [x0 + (1 - k) * 20, y0 - (1 - k) * 90 + 10], f.c || '#e6e3d6', 1.6); }
        if (f.type === 'mend') { const x0 = X(W, f.x), y0 = Y(H, f.y) - 22 * K, x1 = X(W, f.x2), y1 = Y(H, f.y2) - 22 * K; blob(ctx, x0 + (x1 - x0) * k, y0 + (y1 - y0) * k - Math.sin(k * Math.PI) * 10, 3 * K, 'rgba(124,255,176,.9)'); }
        if (f.type === 'heal' || f.type === 'haste') { alive(b, 'us').forEach((u, i) => { const x0 = X(W, u.x) + ((i * 7) % 11) - 5, y0 = Y(H, u.y) - 20 * K - k * 26; ctx.globalAlpha = 1 - k; if (f.type === 'heal') { ctx.fillStyle = '#7cffb0'; ctx.fillRect(x0 - 1.2 * K, y0 - 4 * K, 2.4 * K, 8 * K); ctx.fillRect(x0 - 4 * K, y0 - 1.2 * K, 8 * K, 2.4 * K); } else ln(ctx, [x0 - 10 * K, y0 + 8], [x0 + 6 * K, y0 + 8], f.c || '#ffe08a', 2); ctx.globalAlpha = 1; }); }
        if (f.type === 'bones') { for (let i = 0; i < 7; i++) { const a = i + f.seed * 6; ln(ctx, [X(W, f.x) + Math.cos(a) * k * 18, Y(H, f.y) - 10 + k * k * 14 - Math.sin(a) * k * 10], [X(W, f.x) + Math.cos(a) * k * 18 + 4, Y(H, f.y) - 12 + k * k * 14 - Math.sin(a) * k * 10], 'rgba(236,235,226,' + (1 - k) + ')', 2); } }
        if (f.type === 'num' && (f.big || f.heal || nums < 14)) { nums++; ctx.globalAlpha = 1 - k; ctx.font = '800 ' + (f.big ? 15 : 11) + 'px Baloo 2, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,.6)'; const tx = X(W, f.x), ty = Y(H, f.y) - 46 - k * 22; ctx.strokeText(String(f.v), tx, ty); ctx.fillStyle = f.heal ? '#7cffb0' : f.us ? '#ff8a8a' : f.dot ? '#d9a3ff' : f.big ? '#ffe14d' : '#ffffff'; ctx.fillText(String(f.v), tx, ty); ctx.globalAlpha = 1; ctx.textAlign = 'left'; }
        if (f.type === 'armor') { ctx.fillStyle = 'rgba(236,235,226,' + (0.25 * (1 - k)) + ')'; ctx.fillRect(0, 0, W * 0.4, H); }
        if (f.type === 'wave') { ctx.globalAlpha = Math.min(1, (1 - k) * 2); ctx.font = '800 ' + Math.round(20 * K) + 'px Baloo 2, system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.lineWidth = 5; ctx.strokeStyle = 'rgba(0,0,0,.55)'; const boss = NW.Hero.RIFTS[b.kind].boss, txt = f.n === b.waves.length && boss ? 'Wave ' + f.n + ': the ' + (boss === 'warden' ? 'Warden' : 'Chief') : 'Wave ' + f.n + ' of ' + b.waves.length; ctx.strokeText(txt, W / 2, H * 0.3); ctx.fillStyle = '#ffffff'; ctx.fillText(txt, W / 2, H * 0.3); ctx.globalAlpha = 1; ctx.textAlign = 'left'; } });
    }
    ctx.restore();
  }
  NW.Battle = { LANE, HERO_X, FOES, TUNE, create, cast, aim, step, run, draw, X, focusAt: (W, px) => (px - 34) / (W - 70) * LANE };
})();
