# Contributing

## Setup

Clone it, load it unpacked (see the README), and you're set. There is no build
step and no dependencies — Node is used only for the tools in `tools/`.

## Before you open a PR

```bash
node tools/audit.js
```

It must exit 0. CI runs the same command, so a red audit is a red PR.

If you changed anything about colour, also look at the result:

```bash
node tools/contact-sheet.js   # then open _review/contact-sheet.html
```

Judging a palette from hex values does not work. Look at it.

## What the audit enforces

- The manifest is valid, every file it references exists, and permissions stay
  at `storage` + `activeTab`.
- Content scripts match nextwork.ai and nothing else.
- No `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, or remote URLs. The
  extension must never talk to anything.
- No `eval`, `new Function`, or `innerHTML`.
- Body text clears 7:1 on canvas and surface, secondary 4.5:1, text on accent
  4.5:1, badges 4.5:1, and every scenery fill 7:1 against body text.

The contrast floor is not advisory. Article text on nextwork.ai sits directly on
the page background, so scenery is read *through* body copy.

## Adding a theme

Add an entry to `PRESETS` in `src/theme-engine.js` with nine colours, then a
matching scene in `src/scenes.js`. Run the audit — it will tell you which pair
misses the floor. `NWT.toneOf(hue, textColour, targetRatio)` solves the
lightness for you: pass the hue you want, get back the version of it that sits
just inside the floor.

Light themes set `mode: 'light'`. That skips the dark-mode repairs, which would
otherwise do damage — the ramp is not reversed and `--color-leather` stays dark,
because white text sits on it.

## Style

Match what's there. Plain ES5-ish JavaScript, no framework, no bundler. Comments
explain *why*, not *what* — most of the non-obvious code exists because of a
specific bug in how the site is built, and that reason is worth a sentence.

Keep commits focused. One fix per PR is easier to review than five.

## Reporting a bug

A screenshot is worth more than a description for anything visual. Include the
theme name, whether Wallpaper was on, and the page URL.
