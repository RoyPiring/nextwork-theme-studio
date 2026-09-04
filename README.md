<div align="center">

<img src="icons/icon128.png" width="96" alt="">

# Pineapple NextWork Theme Studio Mod

**A browser extension that recolours [nextwork.ai](https://nextwork.ai).**
18 themes, an editor for your own, a picture behind the page, and a focus timer.

[![audit](https://github.com/RoyPiring/nextwork-theme-studio/actions/workflows/ci.yml/badge.svg)](https://github.com/RoyPiring/nextwork-theme-studio/actions/workflows/ci.yml)
[![licence: MIT](https://img.shields.io/badge/licence-MIT-blue.svg)](LICENSE)

Unofficial. Not made by NextWork and not connected to them.
It sends no data anywhere.

</div>

![The eighteen themes](docs/img/themes.svg)

---

## Install

Works in Chrome, Brave and Edge. Takes about a minute.

![Install in five steps](docs/img/install.svg)

**1. Download it.** Get the archive for your browser from
[the latest release](https://github.com/RoyPiring/nextwork-theme-studio/releases/latest)
and unzip it. Chrome, Brave and Edge use the same build.

Prefer git? `git clone https://github.com/RoyPiring/nextwork-theme-studio`

**2. Open your browser's extensions page.**

| Browser | Where |
| --- | --- |
| Chrome | `chrome://extensions` |
| Edge | `edge://extensions` |
| Brave | Menu → Extensions → **Manage Extensions** |

> **Brave:** do not type `brave://extensions`. That page has no Developer mode
> switch.

**3. Turn on Developer mode.** The switch is in the top right.

**4. Click Load unpacked** and choose the folder you downloaded. Pick the
folder itself, not a file inside it. It is the one containing `manifest.json`.

**5. Open nextwork.ai.** The colours change straight away.

There is nothing to build and nothing to compile. Press `Alt+Shift+D` to turn
the theme on and off.

**Firefox and Safari** need an extra step →
[installing on other browsers](docs/install/)

---

## Use it

Click the extension icon in your toolbar.

| Control | What it does |
| --- | --- |
| **Theme** | Turns the colours on and off. |
| **Wallpaper** | Turns the picture behind the page on and off. |
| **Focus** | A timer that sits on the page while you work. |
| **Beside your work** | A small pane over the page, for something to keep in view. |
| **Surprise me** | Picks a theme at random. |
| **Dials** | Tint, saturation, contrast and brightness, all at once. |
| **Open editor** | Full control of all nine colours, with a live contrast score. |

The 18 built-in themes cannot be edited. Change a colour and the extension
makes you a copy, leaving the original alone. Your themes are saved on your own
computer. They are never uploaded.

**Focus timer.** Choose 5, 10, 15, 25, 45 or 60 minutes, or count up. A pill
appears in the corner while you work. It only shows on project pages, keeps
running across tabs, and counts past zero so you can see when you go over. When
the session reaches its length it can chime and flash red until you look at it;
both can be turned off.

**Beside your work.** For one screen. Paste a link in the popup and it becomes
a tile; the pane floats over the page with that link in it, and you drag its
bar to move it and its corner to resize it. It stays where you put it.

A YouTube link works straight away — paste the address from your browser's bar
and it plays. Most other sites, Discord among them, refuse to be shown inside
another page. The pane says so and offers you two ways on: **allow this site**,
which asks your browser for permission to set that refusal aside for this one
frame, or the arrow in its bar, which opens the site in a small window of its
own and needs no permission at all.

Allowing a site is worth understanding before you do it, and
[SECURITY.md](SECURITY.md) explains what it changes and how far it reaches.
The short version: it applies only inside this pane, only to the site you
named, and the browser can take it back at any time.

**Signing in inside the pane.** A frame on another site gets its own storage,
kept separate from the tab you would normally use. So a site you are signed
into in a tab may still ask you to sign in the first time it appears in the
pane. Do it once, in the pane, and it is remembered there from then on.

The pane is given what an application needs: the microphone and camera, so a
voice channel works; screen share, modals, downloads, pointer lock. The one
thing held back is the ability to replace the tab underneath — nothing in the
pane can navigate the page you are working on.

### Split the page

The tab divided in two: your work narrowed to the left, something else in the
right, with a divider you drag. Not a panel floating over the page and not a
second window to manage — the page gives up part of its width and carries on
working at the width it has, reflowing its own layout to fit.

Paste a link in the **Split** tab and press Show. Drag the divider on the page
itself, or use **Panel width** in the popup. The × on its bar gives the page
its full width back.

**A link is loaded as you gave it.** The one translation is YouTube: a watch
address becomes the player, because the player is the same video and the watch
page cannot be embedded at all. Nothing else is substituted — a link to a
particular page means that page.

When a site refuses, the panel says so and offers what that site *does* publish
for embedding, as a choice rather than a swap. For a Discord channel that is
the server's widget: who is online, and an invite. It is not the conversation
— Discord publishes no embeddable view of a channel's messages, and its full
application cannot be framed by anyone. Taking your channel link and quietly
showing you a member list instead would be answering a different question.

The widget needs **Enable Server Widget** turned on in that server's settings,
under Widget.

**If a panel is empty, check your other extensions first.** A content blocker —
Privacy Badger, uBlock and their kin — will replace a third-party frame with a
placeholder, and from the page that looks exactly like the site refusing. They
generally offer an "allow on this site" button in the space where the frame
should be.

### Beside the page

A second, separate section, because there are two different problems here and
one answer cannot serve both.

The pane above puts a site **inside** the page, in a frame. That works only for
sites that publish something meant to be embedded — a video player, a document
viewer. Most applications refuse to be embedded at all, and no permission
changes that: the refusal is specifically about being inside another page.

**Beside the page** uses real browser windows instead. A window is not an
embedding, so a site that will not be framed — Discord, a mail client, anything
you sign in to — opens, signs in, joins a voice channel and behaves exactly as
it does in a tab, because as far as it is concerned it *is* one.

Paste a link, and it becomes a row with its own switch. Turn it on and its
window opens beside your work; turn it off and the window closes. Close a
window from its own corner and the switch follows. Up to four at once: one or
two share the right-hand column, three or four make a grid of quarters. A fifth
is refused rather than shrinking the rest into slivers.

**Page keeps** is how much of the screen your work holds — the rest is shared
among whatever is open beside it. Turn **Arrange** off and your window goes
back exactly where it was, maximised if that is how you had it.

The rule of thumb: **a video goes in the pane, an application goes beside the
page.**

---

## Themes and wallpapers

Every theme has its own picture and its own drifting scenery, and no two are
the same. Nothing is downloaded while you browse, apart from a link you put in the
pane yourself.

Text on nextwork.ai sits straight on the page background, so you read it
*through* the picture. Every wallpaper is measured and held to a contrast ratio
of 7:1 where the text sits.

→ [All 18 themes, and how the wallpapers are made](docs/THEMES.md)

---

## Documentation

| Guide | For |
| --- | --- |
| [Install on other browsers](docs/install/) | Firefox and Safari |
| [Themes and wallpapers](docs/THEMES.md) | What ships, and how it is made |
| [Architecture](docs/ARCHITECTURE.md) | How the recolouring works |
| [Decisions](docs/DECISIONS.md) | Choices that are hard to reverse |
| [Browser support](docs/BROWSERS.md) | Differences between browsers |
| [Code review](docs/maintenance/CODE_REVIEW.md) | How changes get merged |
| [Development](docs/maintenance/DEVELOPMENT.md) | Running tests and tools |
| [Releasing](docs/maintenance/RELEASING.md) | Cutting a version |
| [Regenerating assets](docs/maintenance/ASSETS.md) | Wallpapers, scenery, icon |

→ [Full documentation index](docs/)

---

## Contributing

Contributions are welcome, and adding a theme is the easiest place to start.
There is no build step and no dependency to install.

```bash
npm test              # unit tests
node tools/audit.js   # repository checks, run before every commit
```

→ [How to contribute](CONTRIBUTING.md) ·
[Getting help](SUPPORT.md) ·
[Security](SECURITY.md) ·
[Changelog](CHANGELOG.md) ·
[Code of conduct](CODE_OF_CONDUCT.md)

---

## Licence

MIT. See [LICENSE](LICENSE).

The pictures in `art/` were made for this project and carry the same licence.
Nothing here uses stock photography.
