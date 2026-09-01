# Security

## Reporting

Open a GitHub issue. If you would rather not do that publicly, use GitHub's
private vulnerability reporting on this repository.

This is a personal project, not a product with an on-call rota — expect a reply
in days, not hours.

## What this extension can and cannot do

It restyles one site in your browser. That is the whole capability.

| Property | Status | Enforced by |
| --- | --- | --- |
| Network requests | none | `tools/audit.js`, in CI |
| Remote code | none | no `eval`, no `new Function`, no remote scripts |
| Dependencies | none | no `package-lock`, nothing to audit |
| Permissions | `storage`, `activeTab` | audit fails on anything else |
| Host access | `*://*.nextwork.ai/*` | audit fails on any other match pattern |
| Data leaving the device | none | there is no code that could send it |

`storage` holds your themes. `activeTab` is used by one button in the popup that
reloads the current tab, and is only granted when you click the extension.

Your themes are in `chrome.storage.local`, which does not sync. They stay on the
machine you made them on.

## Threat model

The realistic risks for an extension like this:

- **A malicious update.** Load it unpacked from a source you have read. There is
  no auto-update path.
- **Over-broad host permissions.** A content script that matched `<all_urls>`
  could read every page you visit. This one is pinned to nextwork.ai and CI
  fails if that changes.
- **Exfiltration.** Prevented structurally: the audit rejects any network API or
  remote URL in `src/`, so a change that adds one cannot pass CI.
- **DOM injection.** All rendering uses `textContent` and `createElement`. The
  audit rejects `innerHTML`.

The extension does read the page it themes — it must, to fix components the
token layer cannot reach. It does not transmit anything it reads.

## Not a supported target

The stylesheet is written against nextwork.ai's current markup. If they change
their design tokens, the theme degrades visually. That is a breakage, not a
vulnerability.
