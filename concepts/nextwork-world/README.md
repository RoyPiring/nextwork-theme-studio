# NextWork World — concept

A 2D pixel base-builder that grows from completed NextWork projects, drawn as
a side panel beside the page. This is a concept demo for the NextWork team,
not a feature of the extension: nothing here is wired to nextwork.ai and none
of it ships in a build.

The world is built from NextWork's real catalogue: the ninety projects in
their twenty-seven series. A series is one building on your land that goes up
with its first part and grows with each one after. XP is by rarity - the fewer
people who have done a project, the more it is worth. The learner's own
generated projects are an expansion island across the water.

`demo.html` is self-contained. Open it in a browser. It shows:

- **My World** — your base, close up, the way Clash of Clans shows a
  village. Every finished project is a building at its own level, grouped
  by series into districts, inside a stone wall that grows with your tier.
  The Town Hall in the middle is the tier. Tap a building for its project.
- **World** — the portfolio surface, as an open world. Your land starts as
  dust and greens around what you build. Growth is cumulative by XP, never by
  time: Plot, Homestead, Hamlet, Village, Town, City, Metropolis, with
  builders arriving at 500 and 1,500 XP. Drag to look around; NextWork HQ is
  the hub town up the road, and other learners' land is either side with a
  nameplate. *Simulate* finishes a project and hands you the component it
  built, and you choose the plot it goes on.
- **Build** — the project surface, on your land. The same world, camera on
  the plot under construction. Pick what the project builds - a house, a
  car, a data centre - and how: *agile*, where every step delivers something
  whole (shed, cabin, cottage, house), or *waterfall*, where pieces arrive in
  order and nothing is usable until the last one. Every step is an event: a
  flatbed drives in from the hub with the piece, the builders run out from
  their hut and hammer it up, the XP floats off the site. Keep it, and it
  stays where it was built.
- **Projects** — the catalogue, series by series, with progress, XP and the
  building each one grows; and the expansion.
- **Notes** — the loop, what each series builds, the growth tiers, what the
  extension can actually read from the page, and the open questions.

The art is isometric and drawn in code from primitives — boxes, roofs, domes,
wheels, blobs for trees — with one light from the top-left and shadows to the
front. No image files, which is the constraint the extension lives under. The two fonts come from Google Fonts and would be inlined in a
real build.

This branch is deliberately not merged into `main`.
