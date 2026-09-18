# NextWork World — concept

A 2D pixel base-builder that grows from completed NextWork projects, drawn as
a side panel beside the page. This is a concept demo for the NextWork team,
not a feature of the extension: nothing here is wired to nextwork.ai and none
of it ships in a build.

`demo.html` is self-contained. Open it in a browser. It shows:

- **World** — the portfolio surface, as an open world. Your land starts as
  dust and greens around what you build. Growth is cumulative by XP, never by
  time: Plot, Homestead, Hamlet, Village, Town, City, Metropolis, with
  builders arriving at 500 and 1,500 XP. Drag to look around; NextWork HQ is
  the hub town up the road, and other learners' land is either side with a
  nameplate. *Simulate* finishes a project and hands you the component it
  built, and you choose the plot it goes on.
- **Build** — the project surface. One construction site for the project you
  are in. Pick what the project builds - a house, a car, a data centre - and
  how: *agile*, where every step delivers something whole (tent, shed, cabin,
  cottage, house), or *waterfall*, where pieces arrive in order and nothing is
  usable until the last one. Each step is a bubble worth XP.
- **Notes** — the loop, what each tag builds, the growth tiers, what the
  extension can actually read from the page, and the open questions.

The art is isometric and drawn in code from primitives — boxes, roofs, domes,
wheels, blobs for trees — with one light from the top-left and shadows to the
front. No image files, which is the constraint the extension lives under. The two fonts come from Google Fonts and would be inlined in a
real build.

This branch is deliberately not merged into `main`.
