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
  are in, rising as steps are ticked, with the time invested.
- **Notes** — the loop, what each tag builds, the growth tiers, what the
  extension can actually read from the page, and the open questions.

The art is a dozen 16×16 sprites written as text in the file and drawn to a
canvas, so the demo needs no image files — the same constraint the extension
lives under. The two fonts come from Google Fonts and would be inlined in a
real build.

This branch is deliberately not merged into `main`.
