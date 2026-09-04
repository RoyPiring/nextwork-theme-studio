<div align="center">

<img src="icons/icon128.png" width="96" alt="">

# Pineapple NextWork Theme Studio Mod

**A browser extension that makes [nextwork.ai](https://nextwork.ai) yours.**
18 themes and an editor for your own, a picture behind the page, a focus timer
that will not let you miss the end of a session, and somewhere to keep Discord
or a video while you work — all inside the one tab.

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

Click the extension icon in your toolbar. The popup has three tabs.

| Tab | What is in it |
| --- | --- |
| **Theme** | The 18 themes, the wallpaper switch, and dials for tint, saturation, contrast and brightness. |
| **Focus** | A session timer, and the alarm that ends it. |
| **Panels** | Somewhere to put Discord, a video, or anything else beside your work. |

`Alt+Shift+D` turns the theme on and off without opening anything.

Nothing is downloaded while you browse, apart from a link you put in a pane
yourself. It sends no data anywhere.

---

### Themes and wallpapers

Every theme has its own picture and its own drifting scenery, and no two are
the same. Text on nextwork.ai sits straight on the page background, so you read
it *through* the picture — every wallpaper is measured and held to a contrast
ratio of 7:1 where the text sits.

The 18 built-in themes cannot be edited. Change a colour and the extension
makes you a copy, leaving the original alone. **Open editor** gives you all nine
colours at once with a live contrast score. Your themes are saved on your own
computer and never uploaded.

→ [All 18 themes, and how the wallpapers are made](docs/THEMES.md)

---

### Focus timer

Count **down** from 15 minutes, 30, an hour or any length you like — or count
**up** with no end to reach. A pill sits on the project page while you work and
keeps running across tabs.

When the time is up the pill flashes red and an alarm rings: a struck bell, six
times over about fourteen seconds, long enough to hear from the next room. Any
press anywhere on the page stops it.

→ [The focus timer in full](docs/FOCUS.md)

---

### Beside your work

For one screen. Paste a link and it opens **in the same tab** — never in a
second window.

- A **floating pane** over the page, which you drag to move and resize. Up to
  three at once.
- A **panel** that shares the tab: the page narrows beside it, or shifts down
  under it, and reflows to fit. Up to three, sharing the band.
- A **dock** on the page with one control — **Hide** — that puts everything out
  of sight without closing it. A video keeps playing and a call stays
  connected.

Most sites refuse to be shown inside another page. When one does, the panel
says so and offers to ask your browser for permission, and lists everything you
have already allowed with a way to take each one back.

→ [Panels and panes in full](docs/PANELS.md) ·
[What allowing a site changes](SECURITY.md)

---

## Documentation

**New here?** [The changelog](CHANGELOG.md) lists what each version added.

| Guide | For |
| --- | --- |
| [Install on other browsers](docs/install/) | Firefox and Safari |
| [Themes and wallpapers](docs/THEMES.md) | What ships, and how it is made |
| [The focus timer](docs/FOCUS.md) | Sessions, the alarm, and the pill on the page |
| [Panels and panes](docs/PANELS.md) | Discord, a video or a document beside your work |
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
