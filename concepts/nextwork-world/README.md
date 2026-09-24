# NextWorld

Your NextWork projects, as land. A concept for a pane inside the extension.

- `demo.html` is the concept demo. It is built, not written: run
  `node tools/world-bundle.js` and it is assembled from `demo.src.html` and
  the very same files the extension loads from `src/world/`.
- Dev mode seeds, simulates and resets. Production shows only what the
  extension has read from your own pages on nextwork.ai.

## The six tabs

1. **NextWorld** - NextWork Headquarters, Austin: the campus, the hubs, the
   staff, the ranch, and the learners' plots outside the fence. Under it,
   this week's contract and who is building (sample names until NextWork
   publishes counts). Tap your plot to go home.
2. **Hero** - you: a necromancer from the first project, with class,
   combat power, four stats, the army, the spells and the armory. The look
   (pineapple, person, robot or cat) and the shop are still here; dashed
   options cost sparks.
3. **My World** - your land, on one of nine terrains you choose once. Every
   era has a site plan; the era's first projects build its infrastructure,
   every other project is a home. People move in, farm, trim the trees and
   walk the dog on a forty-second day. Bone workers wait at the next lot;
   a rift glows at the edge of the land (tap it to fight). Tap the shield
   for the dashboard.
4. **My Build** - the project going up, step by step, the exact building
   revealed as the steps are ticked, a lesson under each step, the nails,
   and the bone crew hammering on the site.
5. **Battle** - the forge (three taps break the new weapon out), the raid
   a finish opens, and the rifts your steps unlock. See `BATTLE.md`.
6. **Globe** - the world, and your rank in it.

## The economy: three things, three rules

- **Power** is a battery. A step ticked adds 8%; a project fills it. It
  holds for a day, then loses 10% a real day down to an ember (10%); back after a week away, the first step lights it to 60%. The
  lights, the mill, the fields and the fire follow it.
- **Citizens** move in one per step while the power is at least half, up to
  what the homes can hold (each home by what it took to build), and leave
  one a day once the place has stood idle five days. Citizens are the
  number on the leaderboard.
- **Sparks** are the currency: one a step, ten a project, twenty-five for the
  week's contract. Spent in the avatar shop; never lost.

Every week (from Monday) the town posts a contract: the era's next piece of
infrastructure, for one project or seven steps. Kept, it pays sparks, five
citizens, and room for two more, for good. A portfolio read from nextwork.ai
is pegged out, not built: the crew raises one list building a real day while
the power holds. Everything comes from the page: a step ticked, a project
finished.

## Pip

The pineapple under every scene says one next thing: pick your land, pick a
project, open it, step done, built, unlocked, power is low, still here. On a
project page itself a pineapple pill shows the project, the step, a spark
each, a lesson, and a way back to the land.

## In the extension

`src/world/` is loaded as content scripts before `content.js`. The pane is
a fixed element with a shadow root; the world never touches the page and
the page's styles never touch the world. The popup's World tab turns it on,
picks dev or production, and resets it. Readers look at a project page
(title, steps ticked) and the portfolio page (learn lists) and nothing else.
