# NextWorld: the Necromancer pass

Branch `feature/nextworld-battle`, cut from `feature/nextwork-world` at tag
`nextworld-v1-before-battle`. To go back: `git checkout nextworld-v1-before-battle`.

## What the source is, and what we take from it

*Necromancer, the Ultimate Scourge!* (Kuaikan Comics, on WEBTOON and
Tappytoon; also known as *Disastrous Necromancer*). The world turns into a
game: at eighteen everyone awakens a class, and one boy awakens the only
necromancer. His summons never stay dead, so neither does he. He climbs
by levels, awakens twice more, raises a bigger and stranger army, clears
dungeons at harder and harder difficulty, and rises from a student to a
city lord to the lord of a world.

We take the **systems**, which are genre mechanics, not the story's
property: a class awakened at level 1 and sublimated at later levels,
four stats with spirit leading, a summon ladder, bone spells and curses,
graded weapons, dungeons with three difficulties, and a hero whose power
comes from levelling. We do **not** use the series' characters, place
names, skill names, text or art. Every name in the game is our own.

## The loop, with battle in it

Learning is still the only source of **level**. Battle is where the level
is felt.

1. **Awaken.** Your hero is a Necromancer from the first project. Stats
   (strength, agility, spirit, physique) grow with your level; spirit
   grows twice as fast.
2. **Sublimate.** At level 5 and level 10 your class sublimates
   (Necromancer, Bone Lord, Undying Sovereign) and every stat doubles.
3. **Raise.** Each level unlocks the next summon: bone worker, bone
   warrior, bone archer, bone mage, headless rider, lich, bone wyrm. Your
   army size is set by spirit. Summons that fall re-form a few seconds
   later: while they stand, you stand.
4. **Arm.** Every finished project drops a **weapon**, generated from the
   project itself: its series sets the type (staff, scythe, tome, orb,
   bone blade, lantern), how few people have finished it sets the rarity
   (common to mythic), and it carries one curse (bleed, slow, decay,
   poison, lightning). Ninety projects, ninety weapons, all different.
5. **Battle.** Finishing a project opens the **Raid**: the rift beasts
   come for your land and your army holds the line. Tap to aim, cast bone
   spear, curse, bone armour and raise the fallen enemies as your own.
   About forty seconds.
6. **Rifts.** Every five steps ticked is a **rift key**. A key opens a
   rift at Ordinary, Nightmare (level 5) or Hell (level 10). Rifts pay
   **souls**.
7. **Souls** rank up your summons and enhance your weapon. Sparks stay the
   currency of what you wear and what stands on your land.
8. **Power** still follows your learning. Below half power your summons
   fight at three quarters strength: the lights are out and the dead are
   tired.

## The two mini-games at a finish

- **The forge.** The new weapon arrives as a crystal; three taps break it.
- **The raid.** The battle above.

## What does not change

The NextWorld tab (the campus, the hub) is untouched. My World keeps its
eras and plans; the dead now build there: two or three bone workers hammer
on the build site (more as you level), one waits at the next pegged lot,
and a rift portal glows on open ground at the edge of your land, marked
RAID while one is waiting. Tap it and the Battle tab opens.

## The numbers

| Rift | Opens at | Waves | Boss | Souls |
|---|---|---|---|---|
| Raid (a finished project) | always | 3 | none | 10 |
| Ordinary | level 1 | 3 | chief | 25 |
| Nightmare | level 5 | 4 | warden | 60 |
| Hell | level 10 | 5 | warden | 150 |

Souls scale with level and stars (a win, the hero above half health, under
par time); a loss pays a fifth. Rank a summon: 30, 60, 120, 240, 480 souls
(five ranks). Sharpen a weapon: 20 x (n+1)^1.5 souls, up to +10.

Balance is checked headless: `node tools/battlecheck.js` plays every rift
at eight levels over sixteen seeds on auto. Raids and Ordinary are won
from level 1; Nightmare at level 5 is a long grind (won, but near the
time limit and rarely for three stars); Hell at level 13 is won three
times in four by a player who ranks up and sharpens, and never by one who
leaves the souls unspent.

## Files

- `src/world/hero.js` pure: class, stats, awakenings, summons, weapons,
  souls, keys, rifts, rewards.
- `src/world/battle.js` the battle: a deterministic simulation (tested
  headless) and its drawing.
- `src/world/views.js` the Hero tab (was Avatar), the Battle tab, the
  forge and the raid after a finish.
- `src/world/land.js` bone workers on the site, the rift portal.
