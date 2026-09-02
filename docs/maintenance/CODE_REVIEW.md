# How a change gets merged

Every change reaches `main` the same way: on a branch, through a pull request,
read by two independent reviewers, and merged by the maintainer. No step is
skipped, including for small changes and including for the maintainer's own
work.

## The order

| # | Who | Does what |
| --- | --- | --- |
| 1 | Author | Opens a pull request from a branch. Never pushes to `main`. |
| 2 | Checks | CI runs the tests, the audit and the generated-asset check. |
| 3 | Reviewers | Two independent reviewers read the diff and post findings. |
| 4 | Author | Fixes what the reviewers found, and runs them again. |
| 5 | **Maintainer** | Reads the findings, approves, and merges. |

Steps 3 and 5 are separate on purpose. **The reviewers never approve and never
merge.** They post findings; a person decides what those findings mean. An
automated reviewer that could also merge its own verdict is not a gate, it is a
rubber stamp with extra steps.

## 1. Branch

```bash
git checkout -b fix/short-description     # or feat/, chore/, docs/
```

`main` is protected. A direct push is rejected, which is the intended
behaviour and not a problem to route around.

## 2. Open the pull request

```bash
gh pr create --fill
```

Fill in the template. Screenshots are required for anything visual: this
project is about how a page looks, and a description of a colour is not
reviewable.

## 3. Run the reviewers

```bash
node tools/review-pr.js <pr-number>
```

This reads the diff, gives it to each reviewer with the project's house rules,
and posts each reply as a pull request comment. It prints `PASS` or `BLOCK` per
reviewer and exits non-zero if any blocked.

The reviewers are configured at the top of `tools/review-pr.js`:

| Reviewer | Command | Why this one |
| --- | --- | --- |
| Codex | `codex exec` | Reads the diff cold, with no memory of writing it. |
| Gemini | `gemini -p` | A different vendor and model family, so the two are unlikely to miss the same thing. |

Swapping a reviewer is one entry in that list.

Two rules the script enforces, both deliberate:

- **A reviewer that cannot run counts as a block.** If the command is missing,
  errors, or answers without a verdict, that is a `BLOCK`. A gate that opens
  when its checker is broken is not a gate.
- **A diff over 120,000 characters is truncated** and the reviewers are told so.
  Split the pull request instead. A review of part of a change is not a review
  of the change.

## 4. Fix and re-run

Address the findings, push, and run `review-pr.js` again. Each run posts fresh
comments, so the history of what was raised and what was done about it stays on
the pull request.

## 5. The maintainer merges

The maintainer is the quality gate. Two passing reviews are a prerequisite for
looking at it, not permission to skip looking at it.

Before merging, the maintainer checks that:

- CI is green.
- Both reviewers posted `PASS`.
- The findings were addressed rather than argued away.
- The change does what the description says.

Then, and only then:

```bash
gh pr merge <pr-number> --squash --delete-branch
```

Nothing else merges. There is no auto-merge on this repository, and the
reviewers have no ability to approve.

## Why it is built this way

The reason is on the record. Versions 2.8.0 through 2.8.3 were pushed straight
to `main` after local checks passed. CI failed on all four, for the same
reason each time, and nothing stopped any of them. The problem was never the
checks — they were correct and they ran. The problem was that nothing was
listening to them and nothing could refuse a push.

So the checks now block, the branch is protected, and a person signs off. Each
of those covers a different way the previous arrangement failed.
