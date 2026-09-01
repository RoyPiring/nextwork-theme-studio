# Publishing this repository

A checklist for taking it from a local folder to a public repo that can accept
contributions. Do these in order.

## 1. Replace the placeholders

Four files ship with `OWNER` / `REPO` placeholders, because the repository does
not exist yet. Replace them with your GitHub username and repo name:

| File | What to change |
| --- | --- |
| `.github/CODEOWNERS` | `@OWNER` → your username |
| `.github/ISSUE_TEMPLATE/config.yml` | both `OWNER/REPO` URLs |
| `CHANGELOG.md` | the two link definitions at the bottom |
| `LICENSE` | check the copyright name is right |

On Linux or macOS:

```bash
grep -rln 'OWNER' .github CHANGELOG.md | xargs sed -i 's|OWNER/REPO|yourname/nextwork-theme-studio|g; s|@OWNER|@yourname|g'
```

Then re-run `node tools/audit.js` to be sure nothing broke.

## 2. Add screenshots

This is the highest-value thing left, and it cannot be automated. People decide
from the first image. Put three in `docs/img/` and link them near the top of the
README:

1. The popup, showing the theme grid and the two toggles.
2. A NextWork project page in Concrete, wallpaper on.
3. One light theme — Mount Fuji or Cherry Blossom reads best.

Take them at a sensible window width. Crop out your bookmarks bar.

## 3. Create the repo

Public, no template files (this repo already has them), no default README.

```bash
git remote add origin git@github.com:yourname/nextwork-theme-studio.git
git push -u origin main
```

## 4. Repository settings

**Branch protection** on `main`:

- Require a pull request before merging.
- Require the `audit` status check to pass.
- Require branches to be up to date before merging.
- Do not allow force pushes.

Even working alone, this stops you from pushing a red build at midnight.

**Actions → General:** set workflow permissions to read-only. The workflow
declares `permissions: contents: read` already; this makes it the default.

**Security:** enable private vulnerability reporting, secret scanning, and push
protection. All free on public repos.

**Discussions:** enable it if you want the "question" link in the issue chooser
to work. Otherwise remove that entry from `config.yml`.

**About:** add a description and topics — `chrome-extension`, `firefox`
(if you port it), `dark-mode`, `theme`, `manifest-v3`, `nextwork`.

## 5. Tag the release

```bash
git tag -a v1.0.0 -m "First public release"
git push origin v1.0.0
node tools/package.js          # builds dist/nextwork-theme-studio-1.0.0.zip
```

Attach the zip to the GitHub release so people can install without cloning.

## 6. If you ever submit to a store

Chrome Web Store review will ask why the extension needs its permissions. The
honest answers:

- `storage` — saves your themes locally.
- `activeTab` — one button in the popup reloads the current tab.
- host access — the extension only styles nextwork.ai.

You will also need a privacy policy. The true one is short: the extension
collects nothing and transmits nothing, and `tools/audit.js` enforces that in
CI.
