# Installing

Chrome, Brave and Edge load the folder as it is, and the
[main README](../../README.md#install) covers that in five steps.

Firefox and Safari need a packaged build:

```bash
node tools/build.js
```

That writes a folder for each browser into `dist/`, and each folder carries its
own instructions.

| Browser | Guide | Notes |
| --- | --- | --- |
| [Chrome](chrome.md) | Load unpacked | Nothing to build |
| [Brave](brave.md) | Load unpacked | Use the menu, not `brave://extensions` |
| [Edge](edge.md) | Load unpacked | Nothing to build |
| [Firefox](firefox.md) | Temporary add-on | Removed when you restart, unless signed |
| [Safari](safari.md) | Xcode conversion | macOS only |

[Browser support](../BROWSERS.md) explains what differs between them.
