/* NextWorld · classes: who you awaken as, and the story you live
 * Pure data. Thirteen classes, chosen once at your awakening: the ones a
 * rift world knows by name, plus two of our own. Every class has its
 * three ranks, its four stats, six fighters and a crew for the land, five
 * spells, six weapon types, a look, and a story in eight chapters that
 * opens as you learn and build. Every name and every line here is ours. */
'use strict';
(function () {
  /* ---- the fighters, by the job they do; a class picks six and bends the numbers ---- */
  const ROLE = {
    melee: { hp: 70, atk: 9, range: 0.7, speed: 1.6, cd: 0.8, role: 'holds the line' },
    tank: { hp: 125, atk: 7, range: 0.7, speed: 1.3, cd: 0.9, role: 'takes the blows' },
    dive: { hp: 50, atk: 13, range: 0.6, speed: 2.6, cd: 0.7, dive: true, role: 'goes for the casters' },
    ranged: { hp: 34, atk: 8, range: 4.2, speed: 1.4, cd: 1.0, role: 'shoots from the back' },
    caster: { hp: 30, atk: 11, range: 3.6, speed: 1.3, cd: 1.6, aoe: 1.3, role: 'burns a crowd' },
    healer: { hp: 36, atk: 8, range: 3.4, speed: 1.2, cd: 1.4, heal: true, role: 'mends the line' },
    turret: { hp: 64, atk: 10, range: 5.0, speed: 0, cd: 1.0, still: true, role: 'stands and fires' },
    cavalry: { hp: 90, atk: 16, range: 0.8, speed: 3.0, cd: 0.9, role: 'charges' },
    champion: { hp: 170, atk: 19, range: 0.9, speed: 1.5, cd: 1.0, aoe: 1.0, role: 'cleaves through' },
    elite: { hp: 70, atk: 18, range: 4.4, speed: 1.2, cd: 1.8, aoe: 1.6, slow: 0.4, role: 'curses and freezes' },
    titan: { hp: 260, atk: 34, range: 3.2, speed: 1.0, cd: 2.2, aoe: 2.2, cap: 1, role: 'ends the wave' }
  };
  const AT = [1, 2, 4, 6, 8, 12];   /* the level each of a class's six fighters joins you */
  /* a fighter: id, name, role, look {b: body, g: gear, c: colour, a: accent}, and any numbers of its own */
  const U = (id, name, role, look, own) => Object.assign({ id, name, look, job: role }, ROLE[role], own || {});

  /* ---- the spells: each one is a shape the battle knows, with its own numbers ----
   * strike: hits all at your mark. single: one big blow on the strongest there. chain: jumps n times.
   * volley: n hits across the field. hex: slows and softens. stun: stops them. shield: guards your line.
   * heal: mends your line. haste: speeds your line. summon: calls help for a while. raise: the fallen fight for you.
   * field: the whole field hurts for dur seconds. k is damage per point of power, as a share of a bone spear. */
  const P = (id, name, at, cd, icon, what, fx, o) => Object.assign({ id, name, at, cd, icon, what, fx }, o || {});

  const LIST = [
    { id: 'necromancer', name: 'Necromancer', kind: 'Combat', hidden: true, edge: 0.95, colour: '#3b1f5a', accent: '#b56cff',
      tagline: 'Raises the dead. They never stay down, and neither do you.',
      ranks: [['Necromancer', 'Hidden'], ['Bone Lord', 'Unique'], ['Undying Sovereign', 'Unique']], stats: { str: 10, agi: 10, spi: 20, phy: 10 },
      look: { outfit: 'robe', head: 'hood', weapon: 'staff' }, crew: { id: 'worker', name: 'Bone worker', look: { b: 'skeleton', g: 'hammer' } },
      units: [U('warrior', 'Bone warrior', 'melee', { b: 'skeleton', g: 'sword' }), U('archer', 'Bone archer', 'ranged', { b: 'skeleton', g: 'bow' }), U('mage', 'Bone mage', 'caster', { b: 'skeleton', g: 'staff', a: '#ff7a3c' }), U('rider', 'Headless rider', 'cavalry', { b: 'bonerider' }), U('lich', 'Lich', 'elite', { b: 'lich' }), U('wyrm', 'Bone wyrm', 'titan', { b: 'wyrm', fly: true })],
      spells: [P('spear', 'Bone spear', 1, 3, '\u{1F9B4}', 'pierces the lane at your mark', 'strike', { k: 1, r: 2.2, c: '#ecebe2' }), P('raise', 'Raise the fallen', 2, 8, '\u{1F480}', 'the beasts you killed stand up for you', 'raise'), P('curse', 'Withering curse', 3, 7, '\u{1F30C}', 'slows and softens everything at your mark', 'hex', { k: 0.27, r: 2.6, dur: 5, c: '#b56cff' }), P('armor', 'Bone armour', 4, 10, '\u{1F6E1}', 'shields every summon', 'shield', { pct: 0.35, dur: 6 }), P('domain', 'Domain of the dead', 10, 25, '\u{2620}', 'the whole field rots for six seconds', 'field', { k: 0.36, dur: 6, c: '#5a1490' })],
      weapons: ['Bone staff', 'Soul orb', 'Grimoire', 'Harvest scythe', 'Bone hammer', 'Soul lantern'],
      story: [
        ['The class nobody wanted', 'The awakening stone went black, and the room went quiet. Necromancer: a hidden class, the only one on record. The first skeleton you raise picks up a hammer before it picks up a sword.'],
        ['They do not stay down', 'The beasts broke through the fence at dusk. Your warriors fell, stood, fell and stood again. By morning the valley had a new rumour: whatever lives on your land does not stay dead.'],
        ['Walls of bone and timber', 'Your camp is a fort now, and the dead dug every post hole. The guild sends a letter, polite and cold: register your summons, or leave the region.'],
        ['Bone Lord', 'At level five the grave answers louder. Your stats double, the archers you raise keep their aim, and the guild’s letter goes in the fire.'],
        ['Neighbours', 'Families move in beside the ossuary and stop noticing it within a week. A skeleton walks the children to school. It is the safest road in the valley.'],
        ['Undying Sovereign', 'Level ten. The rifts feel you before they see you. A lich kneels in your hall and asks, very politely, where it should stand.'],
        ['The Pale Court', 'Something in the Hell rifts has noticed a city that cannot be starved or besieged. The Pale Court sends an envoy with a crown in a box and a knife under it.'],
        ['Nothing is wasted', 'A kingdom where the dead build and the living learn. The Pale Court’s envoy works your mill now. It says the pay is fair.']] },

    { id: 'knight', name: 'Knight', kind: 'Combat', edge: 1.42, colour: '#8a96a8', accent: '#ffc531',
      tagline: 'A shield wall that does not break. Slow to win, hard to beat.',
      ranks: [['Knight', 'Advanced'], ['Banneret', 'Superior'], ['High Marshal', 'Legendary']], stats: { str: 15, agi: 8, spi: 7, phy: 20 },
      look: { outfit: 'armour', head: 'helm', weapon: 'sword' }, crew: { id: 'k_crew', name: 'Squire', look: { b: 'person', g: 'hammer', c: '#7a5a3a' } },
      units: [U('k_squire', 'Squire', 'melee', { b: 'person', g: 'sword', c: '#8a96a8', a: '#ffc531' }, { hp: 80 }), U('k_xbow', 'Crossbowman', 'ranged', { b: 'person', g: 'crossbow', c: '#6b7a8c', a: '#ffc531' }), U('k_shield', 'Shieldbearer', 'tank', { b: 'person', g: 'tower', c: '#9aa6b8', a: '#ffc531' }), U('k_lancer', 'Lancer', 'cavalry', { b: 'rider', g: 'lance', c: '#c9d2dc', a: '#2f5fa8' }), U('k_captain', 'Knight-captain', 'champion', { b: 'person', g: 'greatsword', c: '#dfe5ee', a: '#ffc531' }), U('k_drake', 'Drake knight', 'titan', { b: 'drake', c: '#3a6fb0', a: '#ffc531', fly: true })],
      spells: [P('k_charge', 'Shield charge', 1, 3, '\u{1F6E1}', 'slams the lane at your mark', 'strike', { k: 1.05, r: 2.0, c: '#ffe08a' }), P('k_rally', 'Rally', 2, 9, '\u{1F4EF}', 'your line gets back up: mends a third of every wound', 'heal', { pct: 0.35 }), P('k_bash', 'Shield bash', 3, 7, '\u{1F4A5}', 'stuns everything at your mark', 'stun', { k: 0.3, r: 2.2, dur: 2.2, c: '#ffe08a' }), P('k_wall', 'Shield wall', 4, 10, '\u{1F9F1}', 'your whole line raises shields', 'shield', { pct: 0.5, dur: 7 }), P('k_judge', 'Last stand', 10, 25, '\u{2694}', 'the line surges: every foe takes a beating for six seconds', 'field', { k: 0.38, dur: 6, c: '#ffd35a', haste: true })],
      weapons: ['Longsword', 'Warhammer', 'Oath tome', 'Halberd', 'Mace', 'Tower shield'],
      story: [
        ['The oath', 'The stone lit gold: Knight. You are handed a dented shield and a promise to keep. Your first squire is nine years old and very serious about the job.'],
        ['Hold the gate', 'The raid hit your fence and stopped there. A knight does not win by chasing. You held, the line held, and the beasts ran out of courage before you did.'],
        ['A banner of your own', 'Five buildings and a palisade earn you a banner. Your squires argue for a week over the colours and settle on the ones you already wore.'],
        ['Banneret', 'Level five. Your shield takes blows that would fold a wagon, and your riders now ride under your flag instead of beside it.'],
        ['The tourney', 'The town holds its first tourney. You lose on purpose to the blacksmith’s daughter, who then joins your crossbows and never lets you forget it.'],
        ['High Marshal', 'Level ten. Other lords send their knights to learn how your line never breaks. The answer is dull and true: drill, sleep, drill.'],
        ['The broken oath', 'A knight you trained has sworn himself to a rift lord. He knows your formations, and he is coming for the walls you taught him to build.'],
        ['The last gate', 'Your kingdom’s gate is the one the rifts no longer test. Your old squire commands it now. He is still very serious about the job.']] },

    { id: 'assassin', name: 'Assassin', kind: 'Combat', edge: 1.22, colour: '#262a36', accent: '#4fe0c0',
      tagline: 'Strikes first and hardest. Fragile if the line folds.',
      ranks: [['Assassin', 'Advanced'], ['Nightblade', 'Superior'], ['Veilmaster', 'Legendary']], stats: { str: 10, agi: 25, spi: 7, phy: 8 },
      look: { outfit: 'cloak', head: 'mask', weapon: 'daggers' }, crew: { id: 'a_crew', name: 'Runner', look: { b: 'person', g: 'hammer', c: '#3a3f4e', hood: true } },
      units: [U('a_cut', 'Cutthroat', 'melee', { b: 'person', g: 'daggers', c: '#2e3240', a: '#4fe0c0', hood: true }, { hp: 62, atk: 12, cd: 0.7 }), U('a_knife', 'Knife thrower', 'ranged', { b: 'person', g: 'knives', c: '#3a3f4e', a: '#4fe0c0', hood: true }, { atk: 9 }), U('a_shade', 'Shade', 'dive', { b: 'spirit', c: '#1c1f2a', a: '#4fe0c0' }, { hp: 60, atk: 15 }), U('a_rider', 'Night rider', 'cavalry', { b: 'rider', g: 'sabre', c: '#262a36', a: '#4fe0c0' }), U('a_poison', 'Poisoner', 'elite', { b: 'person', g: 'flask', c: '#2c4a3a', a: '#7cff8a', hood: true }), U('a_twin', 'Umbral twin', 'titan', { b: 'giant', g: 'daggers', c: '#141620', a: '#4fe0c0' }, { range: 1.0, speed: 2.0, aoe: 1.6 })],
      spells: [P('a_stab', 'Backstab', 1, 3, '\u{1F5E1}', 'a killing blow on the strongest foe at your mark', 'single', { k: 2.8, r: 2.6, c: '#4fe0c0' }), P('a_smoke', 'Smoke bomb', 2, 8, '\u{1F4A8}', 'blinds and stops everything at your mark', 'stun', { k: 0.2, r: 2.6, dur: 2.6, c: '#9aa3b0' }), P('a_venom', 'Venom', 3, 7, '\u{1F40D}', 'poisons everything at your mark', 'hex', { k: 0.3, r: 2.6, dur: 5, bleed: 5, c: '#7cff8a' }), P('a_veil', 'Veil', 4, 10, '\u{1F32B}', 'your line fades and strikes faster', 'haste', { dur: 6, shield: 0.2 }), P('a_cuts', 'Thousand cuts', 10, 25, '\u{1F300}', 'shadows cut every foe for six seconds', 'field', { k: 0.42, dur: 6, c: '#0e3b3a' })],
      weapons: ['Twin daggers', 'Hidden blade', 'Poison kit', 'Sickle', 'Garrote', 'Throwing stars'],
      story: [
        ['Unseen', 'The stone flickered, and nobody could say what colour it was. Assassin. You leave the hall before anyone thinks to ask your name.'],
        ['Before they arrive', 'The raid never reached your fence. Its leader was found at the rift’s mouth, and the rest ran home confused. You finished your tea.'],
        ['The quiet fort', 'Your fort has no gate captain and no watch bell. It has you, and a list of who has been sniffing around it.'],
        ['Nightblade', 'Level five. Your shadow moves half a second before you do. Your cutthroats learn to follow it.'],
        ['The guild of whispers', 'The town’s rumours come to you first now. A merchant has been selling rift maps to the beasts. He does not sell them for long.'],
        ['Veilmaster', 'Level ten. You can stand in a crowded square and simply not be there. Your shadow twin takes the meetings you find boring.'],
        ['The contract', 'Someone has put a price on the city, and the contract names you. You recognise the handwriting. It is your own, from a future you prevented.'],
        ['No one rules this kingdom', 'Officially a council runs the kingdom. Everyone knows the council faces an empty chair. Nobody sits in it. Nobody needs to.']] },

    { id: 'archer', name: 'Archer', kind: 'Combat', edge: 1.18, colour: '#3f6b3a', accent: '#d9f27a',
      tagline: 'Death from the back row. Kills them before they arrive.',
      ranks: [['Archer', 'Advanced'], ['Ranger', 'Superior'], ['Hawklord', 'Legendary']], stats: { str: 8, agi: 22, spi: 10, phy: 10 },
      look: { outfit: 'cloak', head: 'hood', weapon: 'bow' }, crew: { id: 'r_crew', name: 'Fletcher', look: { b: 'person', g: 'hammer', c: '#5a6b3a' } },
      units: [U('r_spear', 'Spearman', 'melee', { b: 'person', g: 'spear', c: '#5a6b3a', a: '#c9a06a' }, { hp: 78 }), U('r_bow', 'Longbowman', 'ranged', { b: 'person', g: 'bow', c: '#3f6b3a', a: '#d9f27a', hood: true }, { atk: 9 }), U('r_xbow', 'Arbalest', 'ranged', { b: 'person', g: 'crossbow', c: '#4a5a3a', a: '#d9f27a' }, { atk: 14, cd: 1.6, range: 4.8 }), U('r_horse', 'Horse archer', 'cavalry', { b: 'rider', g: 'bow', c: '#6b5a3a', a: '#d9f27a' }, { range: 3.0, atk: 12 }), U('r_falcon', 'Falconer', 'elite', { b: 'bird', c: '#8a6a3f', a: '#d9f27a', fly: true }), U('r_eagle', 'Great eagle', 'titan', { b: 'bird', c: '#5a3f22', a: '#ffe08a', fly: true, big: true })],
      spells: [P('r_pierce', 'Piercing shot', 1, 3, '\u{1F3F9}', 'an arrow through the whole lane at your mark', 'strike', { k: 1.0, r: 2.4, c: '#d9f27a' }), P('r_volley', 'Volley', 2, 7, '\u{1F327}', 'arrows fall across the whole field', 'volley', { k: 0.5, n: 10 }), P('r_pin', 'Pinning arrows', 3, 7, '\u{1F4CC}', 'pins and slows everything at your mark', 'hex', { k: 0.35, r: 2.6, dur: 5, c: '#d9f27a' }), P('r_camo', 'Camouflage', 4, 10, '\u{1F343}', 'your line hides: shields and quicker draws', 'haste', { dur: 6, shield: 0.25 }), P('r_storm', 'Arrow storm', 10, 25, '\u{26C8}', 'the sky rains arrows for six seconds', 'field', { k: 0.4, dur: 6, c: '#3a4a2a' })],
      weapons: ['Longbow', 'Crossbow', 'Quiver of tales', 'Hunting spear', 'Recurve bow', 'Hawk hood'],
      story: [
        ['First string', 'The stone turned green: Archer. You are given a bow older than your grandmother and told it pulls left. It does.'],
        ['From the roof', 'You met the raid from the roof of your own cabin. Twelve arrows, eleven beasts. The twelfth is still in the chimney as a reminder.'],
        ['The long field', 'The fort gets a practice field, long enough to hurt. Spears stand in front, bows behind, and the beasts learn what open ground costs.'],
        ['Ranger', 'Level five. You read wind like a page. Arbalests join the line, and the falconer’s chicks start watching you back.'],
        ['The hawk’s eye', 'A falcon brings you a map scratched into bark: a rift the town has not found. You put the first arrow into it before it opens.'],
        ['Hawklord', 'Level ten. A great eagle lands on your tower and does not leave. It seems to consider the arrangement its own idea.'],
        ['The dark sky', 'Flying beasts pour out of the city rifts, too high for the walls. The sky is your field now, and you have never missed from above.'],
        ['The eagle’s kingdom', 'From the eagle’s back your kingdom looks like a map you drew as a child. Every road ends at a field where somebody is learning to shoot.']] },

    { id: 'elementalist', name: 'Elementalist', kind: 'Combat', edge: 1.38, colour: '#8a2f2f', accent: '#ff9a3c',
      tagline: 'Fire, frost and storm. The biggest spells, the thinnest line.',
      ranks: [['Elementalist', 'Advanced'], ['Archmage', 'Superior'], ['Worldcaller', 'Legendary']], stats: { str: 5, agi: 8, spi: 30, phy: 7 },
      look: { outfit: 'robe', head: 'hat', weapon: 'orb' }, crew: { id: 'e_crew', name: 'Apprentice', look: { b: 'person', g: 'hammer', c: '#8a4a3a' } },
      units: [U('e_imp', 'Fire imp', 'melee', { b: 'spirit', c: '#e8552f', a: '#ffd35a' }, { hp: 60, atk: 11 }), U('e_appr', 'Apprentice', 'caster', { b: 'person', g: 'wand', c: '#8a2f2f', a: '#ff9a3c' }), U('e_frost', 'Frost adept', 'elite', { b: 'person', g: 'wand', c: '#2f5f8a', a: '#9ad3ff' }, { hp: 40, atk: 12, aoe: 1.4 }), U('e_hawk', 'Storm hawk', 'cavalry', { b: 'bird', c: '#5a7ab0', a: '#e6f4ff', fly: true }, { hp: 70, atk: 18 }), U('e_flame', 'Flame elemental', 'elite', { b: 'spirit', c: '#ff7a2a', a: '#ffe14d', big: true }, { hp: 110, slow: 0 }), U('e_titan', 'Stone titan', 'titan', { b: 'golem', c: '#8a8272', a: '#ff9a3c' }, { range: 1.2 })],
      spells: [P('e_fire', 'Fireball', 1, 3, '\u{1F525}', 'explodes at your mark', 'strike', { k: 1.25, r: 2.4, c: '#ff7a2a' }), P('e_frost', 'Frost nova', 2, 7, '\u{2744}', 'freezes and cracks everything at your mark', 'hex', { k: 0.5, r: 2.8, dur: 4, c: '#9ad3ff' }), P('e_chain', 'Chain lightning', 3, 6, '\u{26A1}', 'jumps through five foes', 'chain', { k: 0.9, n: 5, c: '#a0dcff' }), P('e_mana', 'Mana shield', 4, 10, '\u{1F52E}', 'wraps your line in raw magic', 'shield', { pct: 0.3, dur: 6 }), P('e_meteor', 'Meteor', 10, 25, '\u{2604}', 'the sky falls on the field for six seconds', 'field', { k: 0.5, dur: 6, c: '#8a2f10', burst: 2.2 })],
      weapons: ['Fire staff', 'Storm orb', 'Spellbook', 'Frost wand', 'Rune hammer', 'Ember lantern'],
      story: [
        ['Sparks', 'The stone burst into four colours at once and cracked. Elementalist. You set the curtains on fire by accident, then put them out on purpose.'],
        ['Fire on the field', 'The raid learned that grass burns and frost bites. So did your tent. Your apprentices call it training.'],
        ['The tower', 'Your fort gets a tower, mostly to keep your experiments away from the barn. Lightning finds it every night. You like the company.'],
        ['Archmage', 'Level five. You stop casting spells and start conducting them. Fire, frost and storm answer in turn.'],
        ['The academy', 'The town’s children ask to learn. You teach them the first rule: never cast what you cannot put out.'],
        ['Worldcaller', 'Level ten. The weather asks your permission now. A stone titan climbs out of the quarry to see who called.'],
        ['The dead star', 'A star is falling toward the city, and it is not a star. It is a Hell rift, burning. You will need every element at once.'],
        ['Calm weather', 'The kingdom has perfect harvests. Storms come on Tuesdays, when people expect them. Nobody remembers it was ever otherwise.']] },

    { id: 'summoner', name: 'Summoner', kind: 'Combat', edge: 1.4, colour: '#2f4f8a', accent: '#8ff0ff',
      tagline: 'Calls spirits to fight beside you, more with every rank.',
      ranks: [['Summoner', 'Advanced'], ['Spiritbinder', 'Superior'], ['Heavencaller', 'Legendary']], stats: { str: 7, agi: 8, spi: 25, phy: 10 },
      look: { outfit: 'robe', head: 'circlet', weapon: 'book' }, crew: { id: 's_crew', name: 'Wisp', look: { b: 'spirit', c: '#8ff0ff', small: true } },
      units: [U('s_guard', 'Guardian spirit', 'tank', { b: 'spirit', c: '#5a8ad8', a: '#e6f4ff', big: true }), U('s_wisp', 'Wisp', 'ranged', { b: 'spirit', c: '#8ff0ff', a: '#ffffff', small: true }), U('s_fae', 'Fae archer', 'ranged', { b: 'person', g: 'bow', c: '#6fd08c', a: '#e6ffea', wings: true }, { atk: 10 }), U('s_stag', 'Spirit stag', 'cavalry', { b: 'beast', g: 'stag', c: '#9ad3ff', a: '#ffffff', glow: true }), U('s_sky', 'Sky spirit', 'elite', { b: 'spirit', c: '#e6f4ff', a: '#8ff0ff', big: true, fly: true }), U('s_phoenix', 'Phoenix', 'titan', { b: 'bird', c: '#ff7a2a', a: '#ffe14d', fly: true, big: true, fire: true })],
      spells: [P('s_lance', 'Spirit lance', 1, 3, '\u{2728}', 'a spear of light at your mark', 'strike', { k: 1.0, r: 2.2, c: '#8ff0ff' }), P('s_call', 'Call spirits', 2, 9, '\u{1F47B}', 'three wisps join the fight for twelve seconds', 'summon', { unit: 's_wisp', n: 3, dur: 12 }), P('s_bind', 'Bind', 3, 7, '\u{1F517}', 'chains everything at your mark in place', 'stun', { k: 0.3, r: 2.4, dur: 2.4, c: '#8ff0ff' }), P('s_ward', 'Spirit ward', 4, 10, '\u{1F54A}', 'spirits shield your line', 'shield', { pct: 0.35, dur: 6 }), P('s_tide', 'Spirit tide', 10, 25, '\u{1F30A}', 'a flood of spirits sweeps the field for six seconds', 'field', { k: 0.38, dur: 6, c: '#1f4f8a' })],
      weapons: ['Spirit staff', 'Soul bell', 'Pact book', 'Moon sickle', 'Totem', 'Spirit lantern'],
      story: [
        ['The first contract', 'The stone rang like a bell: Summoner. A small wisp arrives, reads your contract, and signs it with a glow.'],
        ['Guardians', 'The raid met a wall of spirits that were not there a moment before. They vanished at dawn, leaving a warm feeling and a scorched fence.'],
        ['The shrine', 'Your fort has a shrine, and the spirits have opinions about its roof. You rebuild it three times before they are satisfied.'],
        ['Spiritbinder', 'Level five. More spirits answer, and larger ones. A spirit stag waits at the gate each morning in case you need a ride.'],
        ['Borrowed light', 'Townspeople leave offerings at the shrine: bread, lamp oil, homework. The spirits help with the homework.'],
        ['Heavencaller', 'Level ten. You call, and a phoenix answers. It sets the shrine on fire, then rebuilds it better.'],
        ['The broken seal', 'The Hell rift under the city is an old spirit prison. Its seal is failing, and what is inside once had a contract with you too.'],
        ['A kingdom of lights', 'At night your kingdom glows with spirits walking the streets. Children wave to them. The spirits wave back, and they remember every name.']] },

    { id: 'tamer', name: 'Beast Tamer', kind: 'Combat', edge: 1.52, colour: '#6b4a2b', accent: '#ffb02e',
      tagline: 'Wolves, bears and a drake. Fast, loud, and loyal.',
      ranks: [['Beast Tamer', 'Advanced'], ['Packlord', 'Superior'], ['Wildking', 'Legendary']], stats: { str: 14, agi: 16, spi: 10, phy: 10 },
      look: { outfit: 'leather', head: 'hair', weapon: 'whip' }, crew: { id: 't_crew', name: 'Pack mule', look: { b: 'beast', g: 'mule', c: '#8a6a4a' } },
      units: [U('t_wolf', 'Wolf', 'melee', { b: 'beast', g: 'wolf', c: '#7a7f8a', a: '#ffb02e' }, { speed: 2.4, hp: 64, atk: 10 }), U('t_lizard', 'Spitting lizard', 'ranged', { b: 'beast', g: 'lizard', c: '#4a8a3a', a: '#b6ff5a' }, { hp: 40 }), U('t_bear', 'Bear', 'tank', { b: 'beast', g: 'bear', c: '#5a3f2a', a: '#ffb02e', big: true }, { atk: 8 }), U('t_dire', 'Dire wolf', 'cavalry', { b: 'beast', g: 'wolf', c: '#3a3f4a', a: '#ff5a2a', big: true }), U('t_serpent', 'Great serpent', 'elite', { b: 'serpent', c: '#3f7a4a', a: '#b6ff5a' }), U('t_drake', 'Drake', 'titan', { b: 'drake', c: '#8a3a2a', a: '#ffb02e', fly: true })],
      spells: [P('t_pounce', 'Pounce', 1, 3, '\u{1F43E}', 'the pack lands on your mark', 'strike', { k: 1.0, r: 2.2, c: '#ffb02e' }), P('t_pack', 'Call the pack', 2, 9, '\u{1F43A}', 'three wolves run in for twelve seconds', 'summon', { unit: 't_wolf', n: 3, dur: 12 }), P('t_roar', 'Roar', 3, 7, '\u{1F981}', 'stuns everything at your mark', 'stun', { k: 0.3, r: 2.6, dur: 2.2, c: '#ffb02e' }), P('t_hide', 'Thick hide', 4, 10, '\u{1F43B}', 'your beasts toughen up', 'shield', { pct: 0.4, dur: 6 }), P('t_stampede', 'Stampede', 10, 25, '\u{1F403}', 'a herd tramples the field for six seconds', 'field', { k: 0.4, dur: 6, c: '#5a3a1a' })],
      weapons: ['Beast whip', 'Horn charm', 'Bestiary', 'Hunting axe', 'Bone club', 'Fang necklace'],
      story: [
        ['The wolf at the door', 'The stone growled: Beast Tamer. A starving wolf follows you home, eats your dinner and falls asleep on your feet. That is the whole contract.'],
        ['The pack', 'The raid met your pack. Rift hounds are fast. Wolves with a home to protect are faster.'],
        ['Kennels and corrals', 'The fort needs kennels, then a corral, then a very large barn. The bear moves in without asking.'],
        ['Packlord', 'Level five. Your beasts no longer follow you; they move with you. A dire wolf carries you into battle.'],
        ['Tamed rift beasts', 'You try something forbidden: taming a rift beast. It works. The town is nervous until it pulls a cart better than any horse.'],
        ['Wildking', 'Level ten. A drake circles your land and lands in the field. It chose you, it says. Beasts are like that.'],
        ['The mother of hounds', 'The rift hounds have a mother, somewhere past the city rifts. She wants her children back. Some of them want to stay.'],
        ['Where beasts live freely', 'Your kingdom has more animals than people, and nobody minds. The rift hounds guard the borders now. Their mother visits on holidays.']] },

    { id: 'artificer', name: 'Artificer', kind: 'Combat', edge: 2.05, colour: '#8a5a2a', accent: '#4ff0ff',
      tagline: 'Builds turrets and golems. What you build on your land, it builds stronger.',
      ranks: [['Artificer', 'Advanced'], ['Machinist', 'Superior'], ['Grand Engineer', 'Legendary']], stats: { str: 10, agi: 10, spi: 15, phy: 15 },
      look: { outfit: 'apron', head: 'goggles', weapon: 'wrench' }, crew: { id: 'f_crew', name: 'Clockwork hand', look: { b: 'construct', g: 'hammer', c: '#b8834a' } },
      units: [U('f_clock', 'Clockwork soldier', 'melee', { b: 'construct', g: 'sword', c: '#b8834a', a: '#4ff0ff' }, { hp: 82 }), U('f_turret', 'Turret', 'turret', { b: 'turret', c: '#6b7280', a: '#4ff0ff' }), U('f_bulwark', 'Bulwark', 'tank', { b: 'construct', g: 'tower', c: '#8a95a6', a: '#4ff0ff', big: true }), U('f_hound', 'Iron hound', 'cavalry', { b: 'beast', g: 'wolf', c: '#8a95a6', a: '#4ff0ff', metal: true }), U('f_tesla', 'Tesla coil', 'turret', { b: 'tesla', c: '#5a6b7a', a: '#a0dcff' }, { atk: 16, aoe: 1.6, cd: 1.6, range: 4.6 }), U('f_golem', 'Iron golem', 'titan', { b: 'golem', c: '#6b7280', a: '#4ff0ff', metal: true }, { range: 1.2 })],
      spells: [P('f_bomb', 'Bomb', 1, 3, '\u{1F4A3}', 'blows up the lane at your mark', 'strike', { k: 1.05, r: 2.4, c: '#ffb02e' }), P('f_deploy', 'Deploy turret', 2, 9, '\u{1F3AF}', 'drops two turrets for fourteen seconds', 'summon', { unit: 'f_turret', n: 2, dur: 14 }), P('f_net', 'Net launcher', 3, 7, '\u{1F578}', 'nets everything at your mark', 'stun', { k: 0.25, r: 2.4, dur: 2.4, c: '#c9d2dc' }), P('f_repair', 'Repair', 4, 9, '\u{1F527}', 'mends your whole line', 'heal', { pct: 0.4 }), P('f_barrage', 'Barrage', 10, 25, '\u{1F680}', 'rockets hammer the field for six seconds', 'field', { k: 0.4, dur: 6, c: '#5a3a1a' })],
      weapons: ['Wrench', 'Spark gun', 'Blueprint', 'Drill', 'Steam hammer', 'Arc lantern'],
      story: [
        ['The first gear', 'The stone sparked and clicked: Artificer. You take it apart to see how it works. It works better after you put it back together.'],
        ['The turret', 'The raid met a turret made from a rain barrel and a crossbow. It is ugly, and it never misses. You name it Gerald.'],
        ['The workshop', 'Your fort’s workshop never sleeps. Clockwork hands hammer the walls while you sketch the next thing.'],
        ['Machinist', 'Level five. Your machines learn to repair each other. Gerald has children now, in a manner of speaking.'],
        ['Pipes and power', 'The town gets running water, street lamps and a machine that sorts the mail badly. Two out of three is a triumph.'],
        ['Grand Engineer', 'Level ten. An iron golem stands up in the workshop, ducks under the door and asks for its first job.'],
        ['The engine below', 'Under the city is a machine older than the rifts, and it is waking up. Its builder left notes. The handwriting looks a lot like yours.'],
        ['A kingdom that runs itself', 'Your kingdom hums. The machines keep it, the people improve it, and Gerald stands at the gate with a medal.']] },

    { id: 'healer', name: 'Healer', kind: 'Support', edge: 1.59, colour: '#e6e0cc', accent: '#7cffb0',
      tagline: 'Nobody dies today. A line that mends itself outlasts anything.',
      ranks: [['Healer', 'Advanced'], ['Lifewarden', 'Superior'], ['Dawnbringer', 'Legendary']], stats: { str: 6, agi: 8, spi: 26, phy: 10 },
      look: { outfit: 'robe', head: 'hair', weapon: 'staff' }, crew: { id: 'h_crew', name: 'Villager', look: { b: 'person', g: 'hammer', c: '#8a7a5a' } },
      units: [U('h_militia', 'Militia', 'melee', { b: 'person', g: 'spear', c: '#7a6a4a', a: '#7cffb0' }, { hp: 84 }), U('h_sling', 'Slinger', 'ranged', { b: 'person', g: 'sling', c: '#8a7a5a', a: '#7cffb0' }), U('h_medic', 'Medic', 'healer', { b: 'person', g: 'staff', c: '#f4f1e8', a: '#7cffb0' }), U('h_outrider', 'Outrider', 'cavalry', { b: 'rider', g: 'lance', c: '#c9c2b0', a: '#7cffb0' }), U('h_guard', 'Light guardian', 'champion', { b: 'person', g: 'mace', c: '#f4f1e8', a: '#ffe08a', wings: true }, { hp: 190, atk: 16 }), U('h_sun', 'Sun golem', 'titan', { b: 'golem', c: '#e6c85a', a: '#fff4c2' }, { range: 1.2 })],
      spells: [P('h_bolt', 'Light bolt', 1, 3, '\u{2600}', 'a bolt of light at your mark', 'strike', { k: 1.0, r: 2.2, c: '#fff4c2' }), P('h_mend', 'Mend', 2, 7, '\u{1F49A}', 'mends half of every wound on your line', 'heal', { pct: 0.5 }), P('h_blind', 'Blinding light', 3, 7, '\u{1F506}', 'blinds everything at your mark', 'stun', { k: 0.3, r: 2.6, dur: 2.2, c: '#fff4c2' }), P('h_barrier', 'Barrier', 4, 10, '\u{1F6E1}', 'a wall of light over your line', 'shield', { pct: 0.45, dur: 7 }), P('h_sunrise', 'Sunrise', 10, 25, '\u{1F305}', 'dawn burns every foe and mends your line for six seconds', 'field', { k: 0.34, dur: 6, c: '#8a6a10', mend: 0.05 })],
      weapons: ['Healing staff', 'Sun charm', 'Book of remedies', 'Herb sickle', 'Mace of mercy', 'Dawn lantern'],
      story: [
        ['Warm hands', 'The stone glowed a soft white: Healer. The first thing you mend is the cracked awakening stone. It seems grateful.'],
        ['Nobody dies today', 'The raid hurt your people, and you would not let it keep them. Everyone who went out that night came home.'],
        ['The infirmary', 'The fort’s best building is the infirmary. Soldiers come from other lands to be patched up, and some of them stay.'],
        ['Lifewarden', 'Level five. Your light closes wounds before they finish opening. The militia start taking risks you have to scold them for.'],
        ['The fever', 'A rift fever runs through the town. You work three days without sleep, and on the fourth the fever is gone and you are a legend.'],
        ['Dawnbringer', 'Level ten. Morning comes a little earlier on your land. The rifts near your walls close a little slower, as if ashamed.'],
        ['The plague rift', 'A Hell rift opens that does not send beasts. It sends sickness. This is the fight you were made for.'],
        ['The long life', 'In your kingdom people grow very old and very curious. The infirmary has become a school. You still teach the first class.']] },

    { id: 'bishop', name: 'Bishop', kind: 'Support', edge: 1.32, colour: '#f4f1e8', accent: '#ffc531',
      tagline: 'Blessings that sharpen every blade, and a bell the rifts fear.',
      ranks: [['Bishop', 'Advanced'], ['Archbishop', 'Superior'], ['Hierarch', 'Legendary']], stats: { str: 8, agi: 6, spi: 24, phy: 12 },
      look: { outfit: 'vestment', head: 'mitre', weapon: 'crozier' }, crew: { id: 'b_crew', name: 'Mason', look: { b: 'person', g: 'hammer', c: '#9a8a6a' } },
      units: [U('b_guard', 'Temple guard', 'tank', { b: 'person', g: 'tower', c: '#dfe5ee', a: '#ffc531' }), U('b_acolyte', 'Acolyte', 'caster', { b: 'person', g: 'book', c: '#f4f1e8', a: '#ffc531' }), U('b_crusader', 'Crusader', 'melee', { b: 'person', g: 'sword', c: '#c9d2dc', a: '#e8352f' }, { hp: 90, atk: 11 }), U('b_rider', 'Holy rider', 'cavalry', { b: 'rider', g: 'lance', c: '#f4f1e8', a: '#ffc531' }), U('b_inq', 'Inquisitor', 'elite', { b: 'person', g: 'crossbow', c: '#3b3a44', a: '#ffc531' }), U('b_colossus', 'Radiant colossus', 'titan', { b: 'golem', c: '#f4ecd0', a: '#ffc531' }, { range: 1.2 })],
      spells: [P('b_smite', 'Smite', 1, 3, '\u{1F31F}', 'holy fire at your mark', 'strike', { k: 1.1, r: 2.0, c: '#ffe08a' }), P('b_bless', 'Blessing', 2, 8, '\u{1F64F}', 'your line fights faster and harder', 'haste', { dur: 7, shield: 0.15 }), P('b_mark', 'Judgement', 3, 7, '\u{2696}', 'marks everything at your mark to take more harm', 'hex', { k: 0.3, r: 2.8, dur: 6, c: '#ffc531' }), P('b_sanct', 'Sanctuary', 4, 10, '\u{26EA}', 'your line stands on holy ground', 'shield', { pct: 0.4, dur: 7 }), P('b_holy', 'Holy light', 10, 25, '\u{1F514}', 'the great bell burns every foe for six seconds', 'field', { k: 0.4, dur: 6, c: '#8a7010' })],
      weapons: ['Crozier', 'Holy relic', 'Scripture', 'Censer', 'Blessed mace', 'Bell of dawn'],
      story: [
        ['The bell', 'The stone rang out like a great bell: Bishop. Somewhere far off, a bell you have never heard answers.'],
        ['Sanctuary', 'The raid broke on your door like surf on rock. The beasts would not cross a threshold you had blessed.'],
        ['The chapel', 'The fort raises a chapel with a bell tower. Travellers stop to rest, and some of them bring swords.'],
        ['Archbishop', 'Level five. Your blessings harden steel. Crusaders ride in under your colours.'],
        ['The pilgrims', 'Pilgrims arrive looking for a miracle. They find a library, a hot meal and a job. Some say that is the miracle.'],
        ['Hierarch', 'Level ten. The bell tower rings on its own when a rift opens nearby. A radiant colossus kneels in the square.'],
        ['The false light', 'A rift lord arrives dressed as a saint, promising the city peace. You have heard that voice before. It was in the first bell.'],
        ['The bell of the kingdom', 'Your kingdom has one great bell. It rings each morning for everyone who finished something the day before.']] },

    { id: 'prophet', name: 'Prophet', kind: 'Support', edge: 1.31, colour: '#2a2350', accent: '#c9b6ff',
      tagline: 'Sees the raid before it comes. Marks the future and makes it happen.',
      ranks: [['Prophet', 'Advanced'], ['Seer', 'Superior'], ['Oracle of Ages', 'Legendary']], stats: { str: 6, agi: 12, spi: 24, phy: 8 },
      look: { outfit: 'robe', head: 'veil', weapon: 'orb' }, crew: { id: 'p_crew', name: 'Stargazer', look: { b: 'person', g: 'hammer', c: '#4a4270' } },
      units: [U('p_guard', 'Pilgrim guard', 'melee', { b: 'person', g: 'spear', c: '#4a4270', a: '#c9b6ff' }, { hp: 78 }), U('p_star', 'Star archer', 'ranged', { b: 'person', g: 'bow', c: '#2a2350', a: '#c9b6ff' }, { atk: 9 }), U('p_veil', 'Veiled guard', 'tank', { b: 'person', g: 'tower', c: '#3a3360', a: '#c9b6ff' }), U('p_comet', 'Comet rider', 'cavalry', { b: 'rider', g: 'lance', c: '#5a4a90', a: '#e6dcff' }), U('p_astral', 'Astral mage', 'elite', { b: 'spirit', c: '#c9b6ff', a: '#ffffff' }), U('p_serpent', 'Star serpent', 'titan', { b: 'serpent', c: '#2a2350', a: '#e6dcff', fly: true, stars: true })],
      spells: [P('p_star', 'Starfall', 1, 3, '\u{1F320}', 'a star lands on your mark', 'strike', { k: 1.05, r: 2.2, c: '#c9b6ff' }), P('p_sight', 'Foresight', 2, 8, '\u{1F441}', 'your line sees the blow coming: guard and speed', 'haste', { dur: 6, shield: 0.3 }), P('p_doom', 'Doom mark', 3, 7, '\u{1F52F}', 'marks everything at your mark: more harm, less haste', 'hex', { k: 0.3, r: 2.8, dur: 6, c: '#c9b6ff' }), P('p_ward', 'Fate ward', 4, 10, '\u{1F52E}', 'your line was never going to fall', 'shield', { pct: 0.45, dur: 6 }), P('p_eclipse', 'Eclipse', 10, 25, '\u{1F311}', 'the sun goes out: every foe stops, then burns', 'field', { k: 0.34, dur: 6, c: '#10082a', stun: 1.5 })],
      weapons: ['Star staff', 'Seeing orb', 'Star chart', 'Moon blade', 'Comet flail', 'Oracle lantern'],
      story: [
        ['The dream', 'The stone showed you a map of stars, then went dark: Prophet. That night you dreamed every raid of the coming month.'],
        ['Foretold', 'The raid came exactly when and where you said. The beasts found spears waiting, and one very smug prophet.'],
        ['The observatory', 'The fort’s lookout becomes an observatory. You chart the rifts like weather, and the town plants by your forecasts.'],
        ['Seer', 'Level five. You see three seconds ahead in a fight. Your archers learn to shoot where the beasts are about to be.'],
        ['The other future', 'In one of your dreams the town burns. You spend a season making sure that dream belongs to someone else.'],
        ['Oracle of Ages', 'Level ten. A star serpent coils around your observatory. It has seen the end of the world, and it prefers yours.'],
        ['The eclipse', 'The stars say the city falls on the day of the eclipse. You have never believed the stars as much as they believe themselves.'],
        ['Unwritten', 'The kingdom’s future is no longer written in the stars. You checked. It is written in its people, and they keep changing it.']] },

    { id: 'elder', name: 'Elder', kind: 'Support', edge: 2, colour: '#3f6b2a', accent: '#b6ff5a',
      tagline: 'The land fights for you: thorns, roots and walking trees.',
      ranks: [['Elder', 'Advanced'], ['High Elder', 'Superior'], ['Grove Ancient', 'Legendary']], stats: { str: 8, agi: 8, spi: 20, phy: 14 },
      look: { outfit: 'robe', head: 'antlers', weapon: 'branch' }, crew: { id: 'd_crew', name: 'Sapling', look: { b: 'tree', c: '#5a8a3a', small: true } },
      units: [U('d_sapling', 'Treant sapling', 'tank', { b: 'tree', c: '#5a8a3a', a: '#b6ff5a' }), U('d_thorn', 'Thorn thrower', 'ranged', { b: 'person', g: 'sling', c: '#4a6b2a', a: '#b6ff5a', hood: true }), U('d_druid', 'Druid', 'healer', { b: 'person', g: 'branch', c: '#3f6b2a', a: '#b6ff5a' }), U('d_stag', 'Stag rider', 'cavalry', { b: 'beast', g: 'stag', c: '#8a6a3f', a: '#b6ff5a' }), U('d_totem', 'Storm totem', 'turret', { b: 'totem', c: '#6b4a2b', a: '#a0dcff' }, { atk: 16, aoe: 1.6, cd: 1.6, range: 4.6 }), U('d_ancient', 'Ancient treant', 'titan', { b: 'tree', c: '#4a6b2a', a: '#b6ff5a', big: true }, { range: 1.3 })],
      spells: [P('d_thorns', 'Thorns', 1, 3, '\u{1F335}', 'thorns burst from the ground at your mark', 'strike', { k: 1.0, r: 2.4, c: '#b6ff5a' }), P('d_grow', 'Regrowth', 2, 7, '\u{1F331}', 'mends half of every wound on your line', 'heal', { pct: 0.45 }), P('d_root', 'Entangle', 3, 7, '\u{1F33F}', 'roots hold everything at your mark', 'stun', { k: 0.3, r: 2.6, dur: 2.4, c: '#6fd08c' }), P('d_bark', 'Bark skin', 4, 10, '\u{1F333}', 'bark hardens over your line', 'shield', { pct: 0.45, dur: 7 }), P('d_wrath', 'Wrath of the wild', 10, 25, '\u{1F343}', 'the land itself fights for six seconds', 'field', { k: 0.4, dur: 6, c: '#1f4a10' })],
      weapons: ['Living branch', 'Seed charm', 'Grove codex', 'Thorn sickle', 'Root maul', 'Firefly lantern'],
      story: [
        ['Roots', 'The stone sprouted a green shoot: Elder. A sapling in your garden stands up, stretches and waits for instructions.'],
        ['Thorns', 'The raid ran into your hedge. The hedge ran back into them. Nobody has trimmed it since, out of respect.'],
        ['The grove', 'The fort grows a grove at its heart. Druids come to tend it and never quite leave.'],
        ['High Elder', 'Level five. The land answers when you speak: vines hold the beasts, bark hardens on your people.'],
        ['Good soil', 'The town’s harvests double. The old folk say the soil remembers who was kind to it.'],
        ['Grove Ancient', 'Level ten. The oldest tree in the valley walks to your gate and plants itself beside it.'],
        ['The withering', 'A Hell rift is draining the land around the city. Trees you planted are turning to ash. The forest wants to fight back.'],
        ['The green kingdom', 'Your kingdom grows. Not builds: grows. The walls are hedges, the towers are trees, and the ancient at the gate tells stories to anyone who sits.']] },

    { id: 'warlord', name: 'Warlord', kind: 'Support', edge: 1.3, colour: '#7a2a1f', accent: '#ffb02e',
      tagline: 'Drums, war cries and a line that charges. Makes every fighter better.',
      ranks: [['Warlord', 'Advanced'], ['Conqueror', 'Superior'], ['Iron Emperor', 'Legendary']], stats: { str: 18, agi: 10, spi: 8, phy: 14 },
      look: { outfit: 'fur', head: 'horns', weapon: 'axe' }, crew: { id: 'w_crew', name: 'Farmhand', look: { b: 'person', g: 'hammer', c: '#8a5a3a' } },
      units: [U('w_raider', 'Raider', 'melee', { b: 'person', g: 'axe', c: '#7a2a1f', a: '#ffb02e' }, { atk: 11 }), U('w_jav', 'Javelineer', 'ranged', { b: 'person', g: 'spear', c: '#8a4a2a', a: '#ffb02e' }, { atk: 10, range: 3.6 }), U('w_brute', 'Shield brute', 'tank', { b: 'person', g: 'tower', c: '#5a2a1f', a: '#ffb02e', big: true }), U('w_rider', 'War rider', 'cavalry', { b: 'rider', g: 'axe', c: '#7a2a1f', a: '#ffb02e' }, { atk: 18 }), U('w_drum', 'War drummer', 'elite', { b: 'person', g: 'drum', c: '#8a3a2a', a: '#ffe08a' }, { slow: 0 }), U('w_mammoth', 'War mammoth', 'titan', { b: 'beast', g: 'mammoth', c: '#6b4a2b', a: '#ffe08a', big: true }, { range: 1.3 })],
      spells: [P('w_cleave', 'Cleave', 1, 3, '\u{1FA93}', 'a sweeping blow at your mark', 'strike', { k: 1.05, r: 2.4, c: '#ffb02e' }), P('w_cry', 'War cry', 2, 8, '\u{1F4E3}', 'your line charges: faster and harder', 'haste', { dur: 7, shield: 0.1 }), P('w_shatter', 'Shatter', 3, 7, '\u{1F528}', 'breaks the armour of everything at your mark', 'hex', { k: 0.4, r: 2.6, dur: 5, c: '#ffb02e' }), P('w_iron', 'Iron will', 4, 10, '\u{1F9BE}', 'your line refuses to fall', 'shield', { pct: 0.4, dur: 6 }), P('w_path', 'Warpath', 10, 25, '\u{1F941}', 'the drums drive the line through the field for six seconds', 'field', { k: 0.38, dur: 6, c: '#5a1a0a', haste: true })],
      weapons: ['Great axe', 'War drum', 'Battle standard', 'Glaive', 'War hammer', 'War horn'],
      story: [
        ['The war drum', 'The stone split with a sound like a drum: Warlord. Three farmhands pick up pitchforks and ask who they are fighting.'],
        ['First victory', 'The raid broke on a line of farmhands who did not know they could not win. You shouted, they charged, the beasts fled.'],
        ['The war camp', 'Your fort drills at dawn. The drums wake the valley, and the neighbours send their sons and daughters to learn.'],
        ['Conqueror', 'Level five. Your war cry makes the line surge. Riders join you, eager for the next charge.'],
        ['The feast', 'The town’s victory feasts are famous. You make sure the drummers eat first. They earned it.'],
        ['Iron Emperor', 'Level ten. A war mammoth wanders out of a rift and refuses to go back. It likes the drums.'],
        ['The endless horde', 'The city rifts pour out a horde that never ends. You will not win this by holding. You will win it by marching into the rift.'],
        ['Peace, loudly', 'Your kingdom is at peace, which it celebrates with drums, feasts and a mammoth parade every spring.']] }
  ];

  /* ---- the chapters open as you learn and build: the same eight moments for every class ---- */
  const CHAPTERS = [
    { key: 'awaken', need: 'your awakening' },
    { key: 'raid', need: 'your first raid won' },
    { key: 'fort', need: 'your land becomes a fort (5 projects)' },
    { key: 'sub1', need: 'level 5' },
    { key: 'town', need: 'your land becomes a town (15 projects)' },
    { key: 'sub2', need: 'level 10' },
    { key: 'city', need: 'your land becomes a city (35 projects)' },
    { key: 'kingdom', need: 'your land becomes a kingdom' }
  ];
  const WORLD = 'The rifts opened the year the world went online. Beasts came through, and so did something else: people who finish real work awaken a class. You have just finished yours.';

  /* the look of a whole class at a glance, for the awakening cards: how it plays, from one to five */
  const PLAY = { necromancer: [3, 4, 3], knight: [5, 2, 2], assassin: [1, 5, 3], archer: [2, 5, 3], elementalist: [1, 3, 5], summoner: [3, 3, 4], tamer: [3, 4, 3], artificer: [4, 3, 3], healer: [5, 1, 3], bishop: [4, 2, 4], prophet: [3, 3, 4], elder: [5, 2, 3], warlord: [3, 5, 2] };   /* [holds, hits, spells] */

  const byId = {}; LIST.forEach(c => { byId[c.id] = c; c.units.forEach((u, i) => { u.at = AT[i]; }); c.crew = Object.assign({ at: 1, role: 'builds', hp: 0, atk: 0, range: 0, speed: 0, cd: 0 }, c.crew); c.play = PLAY[c.id]; });
  const units = {}, spells = {}; LIST.forEach(c => { units[c.crew.id] = c.crew; c.units.forEach(u => { units[u.id] = u; }); c.spells.forEach(p => { spells[p.id] = p; }); });

  NW.Classes = { LIST, byId, ROLE, CHAPTERS, WORLD, units, spells, get: id => byId[id] || byId.necromancer };
})();
