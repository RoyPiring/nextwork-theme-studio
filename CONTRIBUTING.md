# Contributing

## Where to start

Themes and scenery are the easiest place to start. A theme is one entry in `PRESETS`
and one function in `src/scenes.js`, and the audit tells you straight away if
it misses the contrast floor. Firefox and Safari are packaged but nobody has
confirmed a run on either, so a report from one of those is worth as much as
code.

## Setup

Clone it and load the repository root unpacked: not `dist/`, which is build
output and will not include your edits. There is no build step and no
dependencies; Node 18+ is needed only for the tools in `tools/`.

Most of what this extension styles is behind a login. Without a nextwork.ai
account you can see the marketing pages themed correctly. You cannot reproduce
or verify anything on a project page, and that is where most of the work is.

What is queued and what is known broken is in [docs/PLAN.md](docs/PLAN.md).

## Before you open a PR

```bash
npm test          # unit tests
node tools/audit.js
```

It must exit 0. CI runs the same command, so a red audit is a red PR.

If you changed anything about colour, also look at the result:

```bash
node tools/contact-sheet.js   # then open review/contact-sheet.html
```

Judging a palette from hex values does not work. Look at it.

## What the audit enforces

- The manifest is valid, every file it references exists, including the ones
  only the HTML pages pull in, and the only permission is `storage`.
- Content scripts match nextwork.ai and nothing else.
- `manifest.json` and `package.json` agree on the version.
- No `fetch`, `XMLHttpRequest`, `WebSocket`, `sendBeacon`, or remote URLs. The
  extension must never talk to anything.
- No `eval`, `new Function`, or `innerHTML`.
- Body text clears 7:1 on canvas and surface, secondary 4.5:1, text on accent
  4.5:1, badges 4.5:1, and every scenery fill 7:1 against body text.

The contrast floor is not advisory, and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md#scenery) explains what it is
protecting.

## Adding scenery

Every scene declares `motifs`, and no two scenes may share one: the audit fails
if they do. If you want pine trees, Fog already has them; pick something else.

The shape of a scene is documented in the header comment at the top of
`src/scenes.js`. Copy the `tokyoNight` entry and work from that rather than
starting empty.

A scene can use a raster image instead of a generated hero. Put the source in
`art/` and run `python tools/make-wallpaper.py <name> art/<file>`.

It adjusts the exposure until the image clears 7:1 against body text, and
records the measurement. The audit then enforces that number. Keep the drifting layers as SVG: a still image on its own
reads as a desktop background.

`tools/contact-sheet.js` renders all of them on one page at reading size. Use
it: a band that looks like a tasteful strip in a thumbnail can swallow the
whole reading column at full height.

## Adding a theme

Add an entry to `PRESETS` in `src/theme-engine.js`, then a matching scene in
`src/scenes.js`. The quickest route is to copy the `concrete` entry and change
the values; the nine colours are `canvas`, `surface`, `surfaceAlt`, `border`,
`textPrimary`, `textSecondary`, `textMuted`, `accent` and `accentText`.

Run the audit. It names the pair that misses the floor. Rather than guessing at a
lightness by hand, use `NWT.toneOf(hex, textHex, targetRatio)`.

Give it the colour you want, the text colour it has to sit behind, and the
ratio. It returns the nearest version of that colour that clears the floor. Inside a scene generator it arrives already bound to the theme's text
colour, so there it takes two arguments: `toneOf(hex, targetRatio)`.

Light themes set `mode: 'light'`. That skips the dark-mode repairs, which would
otherwise do damage: the ramp is not reversed and `--color-leather` stays dark,
because white text sits on it.

## Style

Match what's there. Plain ES5-ish JavaScript, no framework, no bundler. Comments
explain *why*, not *what*. Most of the non-obvious code exists because of a
specific bug in how the site is built, and that reason is worth a sentence.

Keep commits focused. One fix per PR is easier to review than five.

## Reporting a bug

A screenshot is worth more than a description for anything visual. Include the
theme name, whether Wallpaper was on, and the page URL.
