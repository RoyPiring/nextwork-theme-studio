/* NextWorld · hero: the necromancer you become by building
 * Pure: no DOM, no canvas. Your level comes only from learning (State);
 * this file turns that level into a class, four stats, an army, a
 * weapon for every finished project, rift keys from ticked steps, and
 * souls to spend on the dead. Everything is derived from what you have
 * built, so it can never drift from the page. */
'use strict';
(function () {
  const S = NW.State, { SERIES, PROJECTS } = NW;

  /* ---- the class: awakened at level 1, sublimated at 5 and 10; every stat doubles each time ---- */
  const CLASSES = [
    { at: 1, name: 'Necromancer', grade: 'Hidden', mult: 1 },
    { at: 5, name: 'Bone Lord', grade: 'Unique', mult: 2 },
    { at: 10, name: 'Undying Sovereign', grade: 'Unique', mult: 4 }
  ];
  const classOf = level => CLASSES.filter(c => level >= c.at).pop();

  /* ---- the dead you can raise, in the order you learn to raise them ---- */
  const SUMMONS = [
    { id: 'worker', name: 'Bone worker', at: 1, role: 'builds', hp: 0, atk: 0, range: 0, speed: 0, cd: 0 },
    { id: 'warrior', name: 'Bone warrior', at: 1, role: 'holds the line', hp: 70, atk: 9, range: 0.7, speed: 1.6, cd: 0.8 },
    { id: 'archer', name: 'Bone archer', at: 2, role: 'shoots from the back', hp: 34, atk: 8, range: 4.2, speed: 1.4, cd: 1.0 },
    { id: 'mage', name: 'Bone mage', at: 4, role: 'burns a crowd', hp: 30, atk: 11, range: 3.6, speed: 1.3, cd: 1.6, aoe: 1.3 },
    { id: 'rider', name: 'Headless rider', at: 6, role: 'charges', hp: 90, atk: 16, range: 0.8, speed: 3.0, cd: 0.9 },
    { id: 'lich', name: 'Lich', at: 8, role: 'curses and freezes', hp: 70, atk: 18, range: 4.4, speed: 1.2, cd: 1.8, aoe: 1.6, slow: 0.4 },
    { id: 'wyrm', name: 'Bone wyrm', at: 12, role: 'breathes death', hp: 260, atk: 34, range: 3.2, speed: 1.0, cd: 2.2, aoe: 2.2, cap: 1 }
  ];
  /* ---- the spells you cast yourself ---- */
  const SPELLS = [
    { id: 'spear', name: 'Bone spear', at: 1, cd: 3, what: 'pierces the lane at your mark' },
    { id: 'raise', name: 'Raise the fallen', at: 2, cd: 8, what: 'the beasts you killed stand up for you' },
    { id: 'curse', name: 'Withering curse', at: 3, cd: 7, what: 'slows and softens everything at your mark' },
    { id: 'armor', name: 'Bone armour', at: 4, cd: 10, what: 'shields every summon' },
    { id: 'domain', name: 'Domain of the dead', at: 10, cd: 25, what: 'the whole field rots for six seconds' }
  ];

  const level = s => S.levelOf(s).level;
  /* strength, agility and physique ten a level, spirit twenty, all doubled by each sublimation; the weapon sharpens spells, it does not replace learning */
  function stats(s) { const L = level(s), c = classOf(L); const base = { str: 10 * L, agi: 10 * L, spi: 20 * L, phy: 10 * L }; Object.keys(base).forEach(k => { base[k] *= c.mult; }); return base; }
  const armySize = s => Math.min(12, 2 + level(s));
  const unlocked = s => SUMMONS.filter(u => level(s) >= u.at);
  const spells = s => SPELLS.filter(sp => level(s) >= sp.at);
  function combatPower(s) { const st = stats(s), w = equipped(s); return Math.round(st.str + st.agi + st.spi * 1.5 + st.phy + (w ? w.atk * 10 : 0) + armySize(s) * 50 + Object.values(hero(s).ranks).reduce((a, r) => a + r * 40, 0)); }

  /* ---- the save: a small record beside the rest of the world ---- */
  function freshHero() { return { souls: 0, keysUsed: 0, ranks: {}, enhance: {}, equipped: '', raids: [], forge: [], best: {}, cleared: { ordinary: 0, nightmare: 0, hell: 0 } }; }
  function hero(s) { if (!s.hero || typeof s.hero !== 'object') s.hero = freshHero(); const h = s.hero, f = freshHero(); Object.keys(f).forEach(k => { if (h[k] == null || typeof h[k] !== typeof f[k] || Array.isArray(f[k]) !== Array.isArray(h[k])) h[k] = f[k]; }); h.souls = Math.max(0, h.souls | 0); return h; }

  /* ---- weapons: one for every finished project, made from the project itself ---- */
  const RARITY = ['Common', 'Uncommon', 'Rare', 'Epic', 'Legendary', 'Mythic'];
  const RARITY_COLOUR = ['#b8c0cc', '#6fd08c', '#4fa3ff', '#b56cff', '#ffb02e', '#ff4f6d'];
  const ATTACK = [10, 16, 24, 36, 52, 75];
  const TYPE = { home: 'Bone staff', lab: 'Soul orb', library: 'Grimoire', barn: 'Harvest scythe', tower: 'Storm wand', workshop: 'Bone hammer', vault: 'Warden blade', datacentre: 'Soul lantern', yard: 'Chain flail', clinic: 'Mending censer', bank: 'Gilded sceptre' };
  const PREFIX = [['Worn', 'Plain', 'Ashen'], ['Tempered', 'Grave', 'Hollow'], ['Moonlit', 'Runed', 'Wraith'], ['Dreadsworn', 'Nightforged', 'Soulbound'], ['Kingsbane', 'Worldgrave', 'Eclipse'], ['Undying', 'First Dawn', 'Endless']];
  const AFFIX = [['bleed', 'Bleed', 'bleeds what it hits'], ['slow', 'Frost', 'slows what it hits'], ['decay', 'Decay', 'breaks armour'], ['poison', 'Plague', 'splashes poison'], ['lightning', 'Storm', 'chains to two more']];
  const STOP = ['with', 'and', 'the', 'for', 'your', 'using', 'from', 'into', 'build', 'set', 'up', 'an', 'a', 'on', 'to', 'of', 'in', 'aws', 'amazon', 'three', 'two', 'multiple', 'started', 'getting', 'part', 'first', 'your', 'create', 'make', 'deploy', 'host', 'website', 'app', 'project', 'tier'];
  const rarityOfXp = xp => xp >= 140 ? 4 : xp >= 115 ? 3 : xp >= 95 ? 2 : xp >= 75 ? 1 : 0;
  function weaponFor(s, title) {
    const p = PROJECTS.find(x => x.title === title); if (!p) return null; const sr = SERIES.find(x => x.id === p.series);
    const done = sr.projects.every(pr => s.done.includes(pr[0])), last = sr.projects[sr.projects.length - 1][0] === title;
    let sum = 0; for (let i = 0; i < title.length; i++) sum = (sum * 31 + title.charCodeAt(i)) % 100003;
    const r = done && last && sr.projects.length >= 3 ? 5 : rarityOfXp(p.xp)   /* mythic: the last of a series of three or more, once the series is whole */, h = S.hash(sum % 997, sum % 991), plus = hero(s).enhance[title] | 0;
    const word = title.split(/[^A-Za-z0-9+#.]+/).filter(x => x.length > 2 && !STOP.includes(x.toLowerCase())).sort((a, c) => c.length - a.length)[0] || sr.name.split(' ')[0];   /* the project's own word: a grimoire of Kubernetes */
    const aff = AFFIX[Math.floor(h * AFFIX.length) % AFFIX.length];
    return { id: title, name: PREFIX[r][Math.floor(h * 97) % 3] + ' ' + TYPE[sr.kind].toLowerCase() + ' of ' + word, type: TYPE[sr.kind], series: sr.name, rarity: r, rarityName: RARITY[r], colour: RARITY_COLOUR[r], affix: aff[0], affixName: aff[1], affixWhat: aff[2], plus, atk: Math.round(ATTACK[r] * (1 + 0.1 * plus)) };
  }
  const armory = s => s.done.map(t => weaponFor(s, t)).filter(Boolean).sort((a, b) => b.atk - a.atk);
  function equipped(s) { const h = hero(s); const w = h.equipped && s.done.includes(h.equipped) ? weaponFor(s, h.equipped) : null; if (w) return w; const all = armory(s); return all[0] || null; }

  /* ---- keys and raids: every five steps ticked is a rift key; every finished project is a raid on your land ---- */
  const KEY_STEPS = 5, KEY_CAP = 5, RAID_CAP = 3;
  function keys(s) { const h = hero(s), earned = Math.floor((s.life.steps | 0) / KEY_STEPS); if (earned - h.keysUsed > KEY_CAP) h.keysUsed = earned - KEY_CAP; return Math.max(0, earned - h.keysUsed); }
  const stepsToKey = s => KEY_STEPS - ((s.life.steps | 0) % KEY_STEPS);
  function projectFinished(s, title) { const h = hero(s); if (!h.raids.includes(title)) { h.raids.push(title); if (h.raids.length > RAID_CAP) h.raids.shift(); } if (!h.forge.includes(title)) h.forge.push(title); if (h.forge.length > RAID_CAP) h.forge.shift(); return s; }
  const RIFTS = { raid: { name: 'Raid on your land', at: 1, mult: 0.8, waves: 3, boss: '', souls: 10 }, ordinary: { name: 'Ordinary rift', at: 1, mult: 1.2, waves: 3, boss: 'chief', souls: 25 }, nightmare: { name: 'Nightmare rift', at: 5, mult: 3.5, waves: 4, boss: 'warden', souls: 60 }, hell: { name: 'Hell rift', at: 10, mult: 10, waves: 5, boss: 'warden', souls: 150 } };   /* balanced with tools/battlecheck.js */
  function canEnter(s, kind) { const r = RIFTS[kind]; if (!r || level(s) < r.at) return false; return kind === 'raid' ? hero(s).raids.length > 0 : keys(s) > 0; }
  function enter(s, kind) { if (!canEnter(s, kind)) return null; const h = hero(s); let title = ''; if (kind === 'raid') title = h.raids.shift(); else h.keysUsed++; return { kind, title, level: level(s) }; }
  /* the result of a battle: souls by rift, stars and level; a loss still pays a little */
  function reward(s, kind, won, stars) { const r = RIFTS[kind], h = hero(s), L = level(s); const souls = won ? Math.round((r.souls + 3 * L) * (1 + 0.25 * Math.max(0, (stars | 0) - 1))) : Math.round(r.souls * 0.2); h.souls += souls; if (won && kind !== 'raid') h.cleared[kind] = (h.cleared[kind] | 0) + 1; if (won) h.best[kind] = Math.max(h.best[kind] | 0, stars | 0); const sparks = won ? (kind === 'raid' ? 5 : kind === 'hell' ? 20 : 8) : 0; s.wallet.sparks += sparks; return { souls, sparks }; }

  /* ---- what souls buy: ranks for the dead, edges for the weapon ---- */
  const RANK_MAX = 5, PLUS_MAX = 10;
  const rankCost = r => 30 * Math.pow(2, r);
  const plusCost = n => Math.round(20 * Math.pow(n + 1, 1.5));
  function rankUp(s, id) { const h = hero(s), r = h.ranks[id] | 0; if (r >= RANK_MAX || !unlocked(s).some(u => u.id === id) || h.souls < rankCost(r)) return false; h.souls -= rankCost(r); h.ranks[id] = r + 1; return true; }
  function enhance(s, title) { const h = hero(s), n = h.enhance[title] | 0; if (n >= PLUS_MAX || !s.done.includes(title) || h.souls < plusCost(n)) return false; h.souls -= plusCost(n); h.enhance[title] = n + 1; return true; }
  function equip(s, title) { if (!s.done.includes(title)) return false; hero(s).equipped = title; return true; }

  /* ---- the army that takes the field: each summon's numbers at your level, rank and power ---- */
  function army(s, now) {
    const L = level(s), c = classOf(L), w = equipped(s), pw = S.power(s, now || S.now(s)), tired = pw < 0.5 ? 0.75 : 1, h = hero(s);
    const grow = (1 + 0.12 * (L - 1)) * (c.mult === 1 ? 1 : c.mult === 2 ? 1.5 : 2) * tired, fighters = unlocked(s).filter(u => u.id !== 'worker');
    const out = []; let n = armySize(s), i = 0;
    while (n > 0 && fighters.length) { const u = fighters[i % fighters.length]; i++; if (u.cap && out.filter(x => x.id === u.id).length >= u.cap) { if (i > 40) break; continue; } const rk = 1 + 0.2 * (h.ranks[u.id] | 0); out.push({ id: u.id, hp: Math.round(u.hp * grow * rk), atk: Math.round(u.atk * grow * rk * (1 + (w ? w.atk / 250 : 0))), range: u.range, speed: u.speed, cd: u.cd, aoe: u.aoe || 0, slow: u.slow || 0 }); n--; }
    return { units: out, spirit: stats(s).spi, weapon: w, tired: tired < 1, level: L, power: grow, base: (1 + 0.12 * (L - 1)) * (c.mult === 1 ? 1 : c.mult === 2 ? 1.5 : 2) };   /* power: what your dead hit with; base: the curve the beasts are built on */
  }

  NW.Hero = { CLASSES, SUMMONS, SPELLS, RIFTS, RARITY, RARITY_COLOUR, AFFIX, RANK_MAX, PLUS_MAX, KEY_STEPS, classOf, level, stats, armySize, unlocked, spells, combatPower, hero, weaponFor, armory, equipped, equip, keys, stepsToKey, projectFinished, canEnter, enter, reward, rankCost, plusCost, rankUp, enhance, army };
})();
