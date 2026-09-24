# NextWorld: the battle pass

Branch `feature/nextworld-battle`, cut from `feature/nextwork-world` at tag
`nextworld-v1-before-battle`. To go back: `git checkout nextworld-v1-before-battle`.

| Commit | What it holds |
|---|---|
| part one | the necromancer hero, weapons, the battle simulation and its balance |
| part two | the Hero and Battle tabs, the forge, the raid, bone workers and the rift on the land |
| part three | thirteen classes, the awakening, eight chapters of story each, twelve spell shapes |
| visuals | the ground as one surface, the building site, a still layer for My Build |

## What the source is, and what we take from it

*Necromancer, the Ultimate Scourge!* (Kuaikan Comics, on WEBTOON and
Tappytoon; also known as *Disastrous Necromancer*). The world turns into a
game: at eighteen everyone awakens a class, and one boy awakens the only
necromancer. His summons never stay dead, so neither does he. He climbs
by levels, awakens twice more, raises a bigger and stranger army, clears
dungeons at harder and harder difficulty, and rises from a student to a
city lord to the lord of a world. Its world has combat classes (knight,
assassin, archer, mage, summoner), support classes (prophet, elder,
healer, bishop and a war leader), grades from elementary to legendary,
and hidden classes rarer than all of them.

We take the **systems**, which are genre mechanics, not the story's
property: awakening a class and sublimating it, four stats, grades,
graded weapons, rifts at three difficulties, and power that comes from
levelling. We do **not** use the series' characters, place names, skill
names, text or art. Class names that are plain words (Knight, Archer)
stay; the series' own coinages are renamed (the war leader is our
Warlord). Every story line in the game is our own.

## The awakening: thirteen classes, chosen once

Your first finished project is your awakening. The Hero tab opens on
thirteen classes. In production the choice is for good, like your
terrain; in dev you can switch.

| Class | Kind | Ranks (level 1, 5, 10) | Plays like |
|---|---|---|---|
| Necromancer | Combat, hidden | Necromancer, Bone Lord, Undying Sovereign | the dead never stay down; raises the beasts you kill |
| Knight | Combat | Knight, Banneret, High Marshal | a shield wall; rallies and stuns |
| Assassin | Combat | Assassin, Nightblade, Veilmaster | a killing blow on the strongest; poison and smoke |
| Archer | Combat | Archer, Ranger, Hawklord | volleys across the field; pins them down |
| Elementalist | Combat | Elementalist, Archmage, Worldcaller | fire, frost, chain lightning, a meteor; a thin line |
| Summoner | Combat | Summoner, Spiritbinder, Heavencaller | calls wisps mid-fight; a phoenix at the top |
| Beast Tamer | Combat | Beast Tamer, Packlord, Wildking | wolves, a bear, a drake; calls the pack |
| Artificer | Combat | Artificer, Machinist, Grand Engineer | turrets and golems; the more you build, the stronger they are |
| Healer | Support | Healer, Lifewarden, Dawnbringer | medics mend the line; a sunrise that burns and heals |
| Bishop | Support | Bishop, Archbishop, Hierarch | blessings, judgement marks, sanctuary |
| Prophet | Support | Prophet, Seer, Oracle of Ages | foresight, doom marks, an eclipse that stops the field |
| Elder | Support | Elder, High Elder, Grove Ancient | treants and totems; roots hold them, bark guards you |
| Warlord | Support | Warlord, Conqueror, Iron Emperor | war cries and drums; a mammoth at the top |

Every class has fifty stat points a level spread its own way, six
fighters (joining at levels 1, 2, 4, 6, 8, 12) plus a crew that builds on
your land, five spells (levels 1, 2, 3, 4, 10), six weapon types, and a
look for each rank. The pineapple stays in the shop and as Pip, the guide.

## The story: eight chapters a class

Every class has its own eight chapters. They open as you learn and build:

1. your awakening
2. your first raid won
3. your land becomes a fort
4. level 5, the first sublimation
5. your land becomes a town
6. level 10, the second sublimation
7. your land becomes a city
8. your land becomes a kingdom

A new chapter puts a dot on the Hero tab; the story is under **Your story**.

## The loop, with battle in it

Learning is still the only source of **level**. Battle is where the level
is felt, and your land is where it is kept.

1. **Awaken** as one of thirteen classes.
2. **Sublimate** at level 5 and 10: new rank, every stat doubles.
3. **Raise your army**: a new fighter at levels 1, 2, 4, 6, 8, 12. Fighters
   that fall re-form a few seconds later.
4. **Arm**: every finished project drops a weapon made from it: its series
   picks which of your class's six weapons, how few finish it sets the
   rarity, and it carries one curse. Ninety projects, ninety weapons.
5. **Battle**: a finish opens the forge (three taps) and a **raid** on your
   land. Tap to aim; the spell buttons cast; Auto casts each spell when it
   is worth it.
6. **Rifts**: every five steps ticked is a key; Ordinary, Nightmare (level
   5), Hell (level 10) pay **souls**.
7. **Souls** rank up your fighters and sharpen your weapon.
8. **Your walls**: every era your land reaches adds 12% to your hero's
   health in battle. The Artificer's machines also grow 5% an era.
9. **Power** still follows your learning: below half, your army fights at
   three quarters strength.

## The numbers

| Rift | Opens at | Waves | Boss | Souls |
|---|---|---|---|---|
| Raid (a finished project) | always | 3 | none | 10 |
| Ordinary | level 1 | 3 | chief | 25 |
| Nightmare | level 5 | 4 | warden | 60 |
| Hell | level 10 | 5 | warden | 150 |

Souls scale with level and stars (a win, the hero above half health, under
par time); a loss pays a fifth. Rank a fighter: 30, 60, 120, 240, 480
souls. Sharpen a weapon: 20 x (n+1)^1.5 souls, up to +10.

## Balance

Each class carries one number, its **edge**: its whole line and every
spell hit that much harder. `node tools/battlecheck.js --tune` finds it so
Nightmare at level 5 and Hell at level 13 land near the same win rate for
every class; `--all` prints them side by side (16 seeds, on auto, a player
who ranks up and sharpens):

| Class | Raid, L1 | Ordinary, L1 | Nightmare, L5 | Hell, L13 | Hell, L16 |
|---|---|---|---|---|---|
| Necromancer | 100% | 100% | 81% | 69% | 100% |
| Knight | 100% | 100% | 100% | 56% | 100% |
| Assassin | 100% | 88% | 100% | 50% | 100% |
| Archer | 100% | 100% | 69% | 100% | 100% |
| Elementalist | 100% | 100% | 94% | 63% | 100% |
| Summoner | 100% | 100% | 100% | 63% | 100% |
| Beast Tamer | 100% | 100% | 100% | 75% | 100% |
| Artificer | 100% | 100% | 100% | 56% | 100% |
| Healer | 100% | 100% | 100% | 63% | 100% |
| Bishop | 100% | 100% | 100% | 75% | 100% |
| Prophet | 100% | 100% | 100% | 81% | 100% |
| Elder | 100% | 100% | 100% | 69% | 100% |
| Warlord | 100% | 100% | 100% | 88% | 100% |

A player who never spends souls (`BARE=1`) loses Hell at level 13 with
every class. Hell fights run close to the two-minute limit.

## What does not change

The NextWorld tab (the campus, the hub) is untouched. My World keeps its
eras and plans; your class's crew builds there (bone workers, squires,
clockwork hands, saplings), one waits at the next pegged lot, and a rift
portal glows on open ground at the edge of your land, marked RAID while
one is waiting. Tap it and the Battle tab opens.

## Files

- `src/world/classes.js` pure data: the thirteen classes, their fighters,
  spells, weapons, looks and stories.
- `src/world/hero.js` pure: your class, ranks, stats, army, weapons, story,
  souls, keys, rifts, rewards.
- `src/world/figures.js` every class's hero, crew and fighters, drawn side-on.
- `src/world/battle.js` the battle: a deterministic simulation (tested
  headless), the rift beasts and the field.
- `src/world/views.js` the Hero tab (the awakening, the sheet, the story,
  the army), the Battle tab, the forge and the raid after a finish.
- `src/world/land.js` the crew on the site, the rift portal, the ground.
- `src/world/homes.js` the building site.
