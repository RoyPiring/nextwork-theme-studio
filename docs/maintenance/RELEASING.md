# Cutting a release

The version in `manifest.json` is the source of truth; `package.json` has to
match it and the audit fails if it does not.

## 1. Bump and record

Update `manifest.json` and `package.json` together, then add a `CHANGELOG.md`
entry describing what changed for a user, not what changed in the diff.

## 2. Build

```bash
node tools/build.js
```

The audit runs first, and nothing is written if it fails. You get five folders
under `dist/`: Chrome, Brave, Edge, Firefox, Safari, plus an archive for each
of the four that can take one.

Every archive is read back before the build reports success, because the
previous archiver wrote Windows path separators into the zip index and produced
files that looked fine, uploaded fine, and then failed to install. The check
looks for that and for `manifest.json` at the archive root.

## 3. Tag and publish

```bash
git tag -a v1.3.0 -m "1.3.0"
git push origin main --follow-tags
```

Attach the archives from `dist/` to the GitHub release so people can install
without cloning. The Firefox one is named `.xpi` because Firefox's
install-from-file picker filters to that extension.

## 4. If you ever submit to a store

Both stores ask why the extension needs its permissions. The honest answers are
short:

- `storage`: saves your themes on your machine. It is the only permission.
- Host access: the content script matches `https://*.nextwork.ai/*` and
  nothing else.

You will also need a privacy policy. The true one is one sentence: the
extension collects nothing and transmits nothing, and `tools/audit.js` enforces
that in CI on every push.

Two things worth raising in the reviewer notes:

- The listing is unofficial and not affiliated with NextWork. The manifest
  description says so.
- The extension reads the page it themes, to repair components the token layer
  cannot reach. It writes styles back and sends nothing anywhere.
