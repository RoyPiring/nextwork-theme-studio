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
| Claude | `claude -p` | A second read with no memory of writing the code, running with its tools switched off. |

Swapping a reviewer is one entry in that list.

A reviewer that cannot authenticate blocks rather than passes, which is the
behaviour below working as intended.

### Two refusals, and what they mean

The script exits without reviewing anything in two cases. Both print why.

**A pull request from a fork.** Refused outright. Its text would become the
prompt for a local agent whose reply is posted publicly. Reviewers run in an
empty directory with their tools off and the untrusted text fenced, but a
prompt is not a security boundary. Read an outside pull request yourself, or
review it in a disposable container. There is no flag to force it.

**This script differs from the copy on `origin/main`.** Refused, because
running it would let the branch supply its own reviewer. Run it from a clean
`main`. The one pull request that legitimately changes this file passes
`--reviewing-this-script`; the run says so in its output. If the message says
it could not compare rather than that they differ, the clone has no
`origin/main` ref: `git fetch origin main` and try again.

Rules the script enforces, all deliberate:

- **A reviewer that cannot run counts as a block.** If the command is missing,
  errors, or answers without a verdict, that is a `BLOCK`. A gate that opens
  when its checker is broken is not a gate.
- **A diff over 120,000 characters fails the run.** Nobody read the whole
  change, so a pass on the visible part is not a pass on the change. Split the
  pull request.
- **Verdicts are tied to a commit.** The head is recorded, printed in each
  comment, and re-read at the end. If the branch moved during the review, or
  the head cannot be re-read, the run fails: those verdicts describe code that
  is not what would be merged.
- **A review that could not be posted fails the run.** Passing while the
  findings never reached the pull request would hand over an empty record.

### What gets published, and what does not

The full review is printed in your terminal. The comment on the pull request
is a short public note, capped at 1,000 characters, with local detail removed:
absolute paths, the home and temporary directories, the account name, and
stack frames. Standard error is never published.

The repository is public, and reviewer diagnostics contain local paths. Read
the full review in the terminal; the comment exists so the pull request carries
a record that a review happened and what it decided.

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
