# NextWorld

Your NextWork projects, as land. A concept for a pane inside the extension.

- `demo.html` is the concept demo. It is built, not written: run
  `node tools/world-bundle.js` and it is assembled from `demo.src.html` and
  the very same files the extension loads from `src/world/`.
- Dev mode seeds, simulates and resets. Production shows only what the
  extension has read from your own pages on nextwork.ai.

## The five tabs

1. **NextWork World** - the NextWork ranch in the middle: the tower with the
   cafe at its foot, eight hubs for the roadmaps, a lake, a paddock, the
   eight staff in black T-shirts. Learners' plots on the ring round it,
   joined by worn footpaths. Tap your plot to go home.
2. **NextWork** - what NextWork is, in its own words.
3. **My World** - your land. A tent, a board and one oak until the first
   project; then a cabin, then spreads, windmills, fences, the creek and
   your learn lists over it. Tap or use the arrow keys to walk.
4. **My Build** - the project going up, four stages tied to its steps, the
   catalogue and your library.
5. **NextWork Global** - the map, and where people are building, once
   NextWork publishes a count.

## In the extension

`src/world/` is loaded as content scripts before `content.js`. The pane is
a fixed element with a shadow root; the world never touches the page and
the page's styles never touch the world. The popup's World tab turns it on,
picks dev or production, and resets it. Readers look at a project page
(title, steps ticked) and the portfolio page (learn lists) and nothing else.
