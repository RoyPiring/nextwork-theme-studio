# Install on Safari

**Read this first: Safari is not a folder you load.** There is no equivalent of
"Load unpacked". A Safari web extension has to be wrapped in a native macOS app,
built with Xcode, and that conversion only runs on a Mac.

So this folder is not directly installable. It holds the extension source laid
out the way the converter expects, plus the steps to do the conversion on a Mac.

## What you need

- **macOS** — the converter is a macOS-only tool
- **Xcode** (free, from the Mac App Store). The Command Line Tools alone are
  not enough — `xcrun safari-web-extension-converter` needs the full app.
- **Safari 16.4 or newer** for MV3 support
- An **Apple Developer account** ($99/year) only if you want to distribute it.
  Running it on your own Mac does not need one.

## Convert it

Copy this folder to the Mac, then:

```bash
xcrun safari-web-extension-converter /path/to/safari --macos-only --project-location ~/Desktop
```

That generates an Xcode project wrapping the extension in a small host app.
Useful flags:

- `--app-name "Pineapple NextWork Theme Studio Mod"` — sets the app's name
- `--bundle-identifier com.yourname.nextworktheme` — use your own identifier
- `--no-open` — skip launching Xcode straight away

## Run it

1. Open the generated project in Xcode
2. Press **Run** (⌘R). The host app launches and registers the extension.
3. Safari → **Settings → Advanced** → tick **Show features for web developers**
4. Safari → **Settings → Developer** → tick **Allow unsigned extensions**

   This resets every time Safari restarts. It is Safari's rule for unsigned
   extensions, not something the package controls.
5. Safari → **Settings → Extensions** → enable **Pineapple NextWork Theme Studio Mod**
6. Grant it access to nextwork.ai when Safari asks
7. Open nextwork.ai

## Distributing it

There are two signed routes, and both need a paid Apple Developer account:

- **The Mac App Store**, which adds an App Store review.
- **Developer ID plus notarisation**, distributed yourself. Safari will load an
  extension from a notarised Developer ID app, so this skips App Store review.

There is no unsigned sideloading path for other people's Macs the way there is
on Chromium.

## What to expect

Safari's MV3 support is real but less complete than Chromium's. Two parts of
this extension are worth watching:

- **Shadow DOM styling.** The extension pushes a second stylesheet into
  NextWork's web components with `adoptedStyleSheets`. Safari has supported that
  since 16.4, but it is the most likely thing to behave differently.
- **The keyboard shortcut.** Safari handles `commands` differently from
  Chromium; `Alt+Shift+D` may not bind. The toolbar popup toggle always works.

This path is unverified: the conversion requires a Mac, and the project is
developed on Windows. Everything up to the conversion step is standard Apple
documentation; what happens after it is worth checking before you rely on it.
A report either way is a useful contribution.
