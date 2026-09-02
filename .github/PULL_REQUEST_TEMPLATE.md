## What this changes

<!-- One or two sentences. If it fixes an issue, link it. -->

## Why

<!-- What was wrong, or what this makes possible. For a styling fix, say which
     site mechanism defeated the previous approach - that context is the part
     that is hard to recover later. -->

## Checks

- [ ] `npm test` and `node tools/audit.js` both exit 0
- [ ] Loaded unpacked and confirmed on nextwork.ai
- [ ] Colour or scenery changed? Ran `node tools/contact-sheet.js` and looked at it
- [ ] Generated assets regenerated if `src/scenes.js` changed

## Screenshots

<!-- Required for anything visual. Before and after, same page, same theme. -->

## Review

Two independent reviewers read this before a maintainer does:

```bash
node tools/review-pr.js <this PR number>
```

- [ ] Both reviewers posted **PASS**
- [ ] Their findings were fixed, not argued away

The reviewers do not approve and do not merge. The maintainer reads the
findings and merges. See [docs/maintenance/CODE_REVIEW.md](../docs/maintenance/CODE_REVIEW.md).
