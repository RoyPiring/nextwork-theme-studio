# Security

## Reporting

Open a GitHub issue. If you would rather not do that publicly, use GitHub's
private vulnerability reporting on this repository.

This is a volunteer-maintained project, not a product with staff on duty. Expect a reply in days, not hours.

## What this extension can and cannot do

It restyles one site in your browser. That is the whole capability.

| Property | Status | Enforced by |
| --- | --- | --- |
| Network requests | none from the extension's own code | `tools/audit.js`, in CI |
| Remote code | none | no `eval`, no `new Function`, no remote scripts |
| Permissions | `storage` | audit fails on anything else |
| Host access | `https://nextwork.ai/*` and `https://*.nextwork.ai/*` | audit fails on any other match pattern |
| Data leaving the device | none | `tools/audit.js`, in CI |

`storage` holds your themes, and it is the only permission requested. The popup's
reload button calls `chrome.tabs.reload()` with no arguments, which needs no
permission at all. `activeTab` was requested for a while, never used, and has
been removed.

Your themes are in `chrome.storage.local`, which does not sync. They stay on the
machine you made them on.

The one exception to "no network requests" is the pane, and it is yours to
start: a link you paste into the popup is loaded in a frame on the project
page, so that site sees a request the same way it would if you opened it in a
tab. Nothing about you or your themes is added to it. The pane is off until you
turn it on, loads nothing until you give it an address, and accepts only
`https`. The frame is given the referrer policy `strict-origin-when-cross-origin`
and no permission to navigate the tab it sits in. The single remote address
written anywhere in the source is YouTube's player, used to turn a link to a
video into the form that can be framed; the audit allows that one literal by
name and rejects every other.

## Threat model

The realistic risks for an extension like this:

- **A malicious update.** Load it unpacked from a source you have read. There is
  no auto-update path.
- **Over-broad host permissions.** A content script that matched `<all_urls>`
  could read every page you visit. This one is pinned to nextwork.ai and CI
  fails if that changes.
- **Exfiltration from our own code.** The audit rejects any network API or
  remote URL in `src/`, so a change that adds one cannot pass CI.
- **DOM injection.** All rendering uses `textContent` and `createElement`. The
  audit rejects `innerHTML` and the other HTML sinks.

The extension does read the page it themes. It must, to fix components the
token layer cannot reach. It does not transmit anything it reads.

### Importing a theme is a trust boundary

A `.nwtheme.json` file is data from somewhere else, and a theme can carry
custom CSS that ends up in the stylesheet injected into a site you are signed
into. CSS is not inert there. A `url()` is a live request. An attribute selector
paired with a background image is a known way to read a form field out one
character at a time.

So imports are validated rather than merged. Anything that is not a `#rrggbb` colour or an
in-range dial value is dropped. Custom CSS that could make a network request is
refused, with a message saying why. Import files from people you trust anyway.

## Not a supported target

The stylesheet is written against nextwork.ai's current markup. If they change
their design tokens, the theme degrades visually. That is a breakage, not a
vulnerability.
