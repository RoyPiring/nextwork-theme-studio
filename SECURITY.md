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
| Permissions | `storage`, `declarativeNetRequest` | audit fails on anything else |
| Host access | `https://nextwork.ai/*` and `https://*.nextwork.ai/*` | audit fails on any other match pattern |
| Data leaving the device | none | `tools/audit.js`, in CI |

`storage` holds your themes. `declarativeNetRequest` is the companion pane's,
and is explained below. The popup's reload button calls `chrome.tabs.reload()`
with no arguments, which needs no permission at all. `activeTab` was requested
for a while, never used, and has been removed.

Host access at install is still nextwork.ai and nothing else. Any other site
is optional, granted one at a time by you, through the browser's own prompt,
and revocable from the browser's settings without going near the extension.

Your themes are in `chrome.storage.local`, which does not sync. They stay on the
machine you made them on.

### The companion pane

The one exception to "no network requests" is the pane, and it is yours to
start: a link you paste into the popup is loaded in a frame on the page, so
that site sees a request the same way it would if you opened it in a tab.
Nothing about you or your themes is added to it. The pane is off until you turn
it on, loads nothing until you give it an address, and accepts only `https`.
The frame is sandboxed without `allow-top-navigation`, so a page inside it
cannot replace the tab it sits in, and carries the referrer policy
`strict-origin-when-cross-origin`.

**The part that deserves your attention.** Most sites refuse to be shown inside
another page, using `X-Frame-Options` or a `frame-ancestors` policy. Those
headers exist to stop a page you are signed in to being framed by someone else
and clicked through invisibly. For the pane to hold such a site, the extension
has to remove them, and that is a real reduction in the protection that site
asked for.

So it is scoped as tightly as the API allows, and the audit checks each of
these rather than trusting a reviewer to notice:

| | |
| --- | --- |
| When | Only after you name a site and the browser's own prompt is accepted |
| Where | Only in a sub-frame, and only where the extension holds host access to the page that opened it — which is nextwork.ai and nothing else. The same site framed anywhere else on the web keeps every header it sent |
| What | Only `x-frame-options` and the two `content-security-policy` headers, and only removed, never added or replaced. Request headers are never touched |
| Undo | One control in the popup, or the browser's own permission settings. The rules are rebuilt from what the browser reports as granted, so revoking there takes the rule with it |

Three things about that table are narrower than they may sound, and each is
worth saying plainly rather than leaving to be discovered:

- **"A frame nextwork.ai opened" is not the same as "this pane."** Nothing in
  the rule API expresses *a frame this extension created*. What confines it is
  the permission model: header rules are applied only where the extension holds
  host access to both ends of a request, and the only page it holds access to
  is nextwork.ai. In practice the pane is the only thing framing these sites —
  but if nextwork.ai itself were ever made to frame an allowed site, that frame
  would get the stripped headers too.
- **A rule covers the host you named and hosts under it.** Granting
  `example.com` also matches `cdn.example.com`. The permission you granted is
  the narrower of the two and the browser enforces it, but the rule as written
  is the wider one.
- **A host permission is broader than the rules built from it.** Allowing a
  site means the extension *could* fetch that site with your cookies attached.
  It does not — the audit rejects every network call in `src/` and CI runs it
  on every change — but you are consenting to the permission, not to our
  restraint, and those are different things.

`content-security-policy` is removed whole rather than edited, because the API
can remove or replace a header, not reach inside one and drop a single
directive. That is a wider cut than `frame-ancestors` alone and is the honest
cost of the feature.

The pane will not point at nextwork.ai itself. A same-origin frame is not
restrained by its sandbox, so the missing `allow-top-navigation` would stop
meaning anything — and it is the page you are already looking at.

If you would rather not do any of this, the arrow on the pane opens the site in
a window of its own instead. That path needs no permission, changes no headers,
and works for every site.

**When a site is refused, the pane says so.** A browser that refuses a frame
gives it no layout box at all — it collapses to nothing, while a frame that
loaded fills its container. The pane measures that shortly after loading, so a
refusal is reported rather than left as an empty rectangle: whether the site
said no, or the site was allowed and the rule carrying that permission is not
installed, you are told which.

The single remote address written anywhere in the source is YouTube's player,
used to turn a link to a video into the form that can be framed; the audit
allows that one literal by name and rejects every other, in the markup as well
as the code.

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
