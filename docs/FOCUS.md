# The focus timer

A session, and something that tells you when it is over even if you have
looked away.

The controls are in the popup's **Focus** tab. The timer itself is a pill on
the project page.

---

## Counting down, or counting up

Two buttons, said in those words.

| | What it does | When you want it |
| --- | --- | --- |
| **Count down** | Runs out a set length and says when it is up | A session with an end in mind |
| **Count up** | Counts from zero with no end to reach | Working until you are done |

Counting down offers **15m**, **30m**, **1h**, and **Custom** for any length
you like. Custom opens a box for the number of minutes; it also opens by
itself when the length in force is not one of the three, so a setting you
cannot see has nowhere to hide.

Choosing to count up puts the length away rather than losing it. Press **Count
down** again and you are back on the session you had.

**Start** and **Pause** bank the time as you go, so pausing and resuming keeps
what has already elapsed. **Reset** puts the clock back to nothing and begins a
new session.

---

## On the page

The pill only appears on project pages — a session is about building one — and
it keeps running across tabs, so it is the same session wherever you look at
it. It counts past zero, so you can see how far over you have gone.

| Setting | What it does |
| --- | --- |
| **Timer size** | How large the pill is drawn. |
| **Lock in place** | Stops it being dragged, for when you keep catching it. |
| **Sound when time is up** | The alarm below. **Try it** plays it now. |

Drag the pill to move it; double-click it to put it back. Where you leave it is
stored as a fraction of the window, so it lands in the same relative place on a
different screen.

---

## The alarm

When the session reaches its length the pill flashes red and an alarm rings.

It is a struck bell rather than a beep. Each note carries three partials at the
ratios a tubular bell has, with a fast attack and a long decay; three notes
make a ring, and it rings six times over about **fourteen seconds**, opening
quietly and getting firmer as it goes. An alarm that starts at full volume is
startling, and being startled is not the same as being told.

Fourteen seconds is deliberate. Half a second is a notification: if you are
away from the screen when it lands — which is the entire point of a focus
timer — you never know it happened.

**Any press anywhere on the page stops it**, the pill included. It listens for
the press rather than the click, because the pill is also a drag handle and a
press on it is taken for a drag before a click is ever raised. Touching
anything else on the page silences it too, which is the right trade: an alarm
you have to hunt for the off switch of is worse than one that stops a moment
early.

Anything that ends the overrun ends the ringing with it — reset, pause, or a
different length — so a bell cannot outlive the session it is about.

The sound is generated on the spot. Nothing is downloaded and no audio file is
bundled.

**Both halves can be turned off.** The sound has its own switch; the flashing
stops on its own for anyone who has asked their system for reduced motion.

---

## When it will not make a sound

A browser will not let a page make a sound until someone has interacted with
it, and it refuses by handing back a silent audio context rather than by
failing. The timer treats that as "not yet heard" rather than "announced", so a
session that ran over on a tab you had opened and not yet clicked is announced
as soon as you touch the page — not silently skipped for good.

The pill flashes either way.

---

## Announced once, not once per tab

Every open project page runs its own copy of the timer and they all cross the
end of the session in the same second. The marker that says "this session has
been announced" is kept in storage where every tab can see it, so three open
tabs ring once between them rather than three times over the top of each
other.
