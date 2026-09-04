# Panels and panes

Something else beside your work, inside the same browser tab.

Two arrangements, one idea. A **pane** floats over the project page, small and
movable, the way a picture-in-picture window does. A **panel** takes a share of
the tab: the page narrows or shifts down and reflows to the room it has left,
and the panel fills the rest. Neither opens a second window, because a second
window is the thing this was built to avoid.

Both live in the popup's **Panels** tab, which has two halves — *In the page*
for panels, *Floating* for panes — built from the same three groups: what is
open, where it sits, and what you have allowed.

---

## Floating panes

Paste a link under **Panels → Floating** and press **Add**. A pane opens on the
page with that link in it.

| Control | Where | What it does |
| --- | --- | --- |
| **Add** | popup | Opens a pane for the link in the box. |
| **Fold** | popup, or the ▾ on the pane's bar | Collapses it to its bar. Nothing loads behind a folded bar. |
| **×** | popup, or on the pane's bar | Closes that pane, and only that pane. |
| bar | on the page | Drag it to move the pane. |
| corner | on the page | Drag it to resize the pane. |

Up to three can be open at once — something you are watching and something you
are talking in. Each new one lands a window's-cascade clear of the last, so a
second never sits exactly on the first and reads as nothing having happened.
Each keeps its own place and size across reloads.

The list in the popup is **what is open**, not a shelf of links saved for
later. Adding one opens it; closing it takes it off the list.

---

## Panels in the page

Paste a link under **Panels → In the page** and press **Add**. The page gives
up part of the tab and carries on working at the size it has.

One panel fills the band. Add a second or a third and they share it, with a
handle between them you can drag. Each has **Fold**, which collapses it to its
bar and keeps its place, and **×**, which closes it. Closing the last one gives
the page the whole tab back.

### Down the side, or across the top

*Where it sits* has two buttons.

| | Where the band is | What the page does | How panels sit |
| --- | --- | --- | --- |
| **Side** | A column down the right | Narrows beside it | Stacked, one above another |
| **Top** | A band across the top | Pushed down below it | Side by side |

Everything else is identical — the same sharing, the same folding, the same
drag handles, turned through a right angle.

> **One thing to know about Top.** A site with a header of its own fixed to the
> top of the window will end up behind the band, because a fixed header ignores
> the room the page makes. Press **Side** to put it back.

### Sizing

Drag the band's own edge on the page, or use **How much it takes** in the
popup.

- A panel with no size of its own takes an equal share of what is left, so
  adding one never rewrites the others.
- A folded panel gives its share back to the rest rather than leaving a gap.
- Everything is stored as a proportion, so an arrangement survives the window
  being resized.
- Three panels is the ceiling. A third of a band is usable; a quarter is a
  letterbox.

---

## The dock

A small strip hangs from the top of the page whenever anything is open. It
carries one control: **Hide**.

Press it and every pane and panel stops being drawn. It then reads **Open**,
and pressing it brings them all back exactly as they were — same places, same
sizes, same addresses. Drag the strip's handle to move it anywhere;
double-click the handle to send it back to the top.

**Hidden is not closed, and that is the whole point.** A hidden pane is still
there and still running: a video keeps playing, a voice channel stays
connected, a page that was loading finishes loading. It simply stops being
painted and stops taking clicks, so the page underneath is fully usable. The
only thing that stops a video or leaves a call is *closing* it — the × on the
pane, or its row in the popup.

That is also why the dock carries one control and no others. Anything that
could close something does not belong beside a control that only hides: a
press meant to get the page back for a moment must never be able to end a
call.

---

## Links, and what happens to them

**A link is loaded as you gave it.** There is one translation, and it is
YouTube: a watch address becomes the player, because the player is the same
video and the watch page cannot be embedded at all. A timestamp on the link is
kept. Nothing else is substituted for anything.

**YouTube and Discord work differently, and the panel follows that.**

- A **Discord** link is the thing itself. You are signed in and it opens where
  you left off, so the address is all it needs.
- **YouTube's front page** is a doorway rather than a destination: it cannot be
  embedded, and embedding it would show a wall of recommendations rather than
  what you meant. So a panel pointed at it asks *which video*, in the panel,
  with a box to paste a link into. Paste one and it plays. Your sign-in comes
  with it, so Premium and your history work as they do in a tab.

---

## Allowing a site

Most sites refuse to be shown inside another page. That refusal is theirs, and
it is specifically about being *inside* a page — no setting on your side
changes it by itself.

The panel offers the one thing that can: **allow this site**, which asks your
browser to set that refusal aside for this frame. The button sits in the
section it applies to, next to the site it is about, and **Sites you have
allowed** in the same section lists everything you have granted with a **Take
it back** beside each one. Both halves of the Panels tab have their own copy,
because a permission granted for a pane is the same permission a panel needs.

Nothing is asked for until you press the button that asks for it.

→ [What allowing a site actually changes](../SECURITY.md)

The short version: it applies only to the site you named, only to frames the
project page opened, and your browser can take it back at any time.

**Some sites still refuse afterwards.** The panel says so rather than leaving a
white rectangle: a browser that refuses a frame gives it no room at all, and
the panel measures that and reports it.

---

## Signing in inside a pane

A frame on another site gets its own storage, kept separate from the tab you
would normally use. So a site you are signed into in a tab may still ask you to
sign in the first time it appears in a pane. Do it once, there, and it is
remembered from then on.

A pane is given what an application needs: microphone and camera, so a voice
channel works, plus screen share, modals, downloads and pointer lock. The one
thing held back is the ability to replace the tab underneath — nothing in a
pane can navigate the page you are working on.

---

## If a panel is empty

**Check your other extensions first.** A content blocker — Privacy Badger,
uBlock and their kin — will replace a third-party frame with a placeholder, and
from the page that looks exactly like the site refusing. They generally offer
an "allow on this site" button in the space where the frame should be.

If that is not it, the panel itself will say which of the two happened: the
site refused, or the site was allowed and the rule carrying that permission is
not installed.
