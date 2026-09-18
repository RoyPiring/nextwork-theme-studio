# NextWork World — concept

A 2D pixel base-builder that grows from completed NextWork projects, drawn as
a side panel beside the page. This is a concept demo for the NextWork team,
not a feature of the extension: nothing here is wired to nextwork.ai and none
of it ships in a build.

`demo.html` is self-contained. Open it in a browser. It shows:

- **World** — the portfolio surface. An example account with eight projects,
  each tag building a different kind of building on a fixed plot. Timeline
  buttons show the same account at week 1, month 3 and year 1; *Simulate*
  finishes the next project and drops its building in.
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
