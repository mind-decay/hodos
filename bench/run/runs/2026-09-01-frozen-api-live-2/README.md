# Session C — the corrected plan, and why it accepts too

`docs/stages/06-manual.md` session C, run by the user on 2026-09-01 in
`/tmp/breaker-e`, on the plan whose Non-goal now names `labels.ts` **and**
`labels.test.ts`. It did not reach the breaker either.

```
Review 1: NEEDS_WORK (0/1/1)
Fix 1: done (50d80ef)
Review 2: ACCEPT (0/0/2)
```

`state.phase` is `verify`.

## What happened

Review 1 raised **one** major: the stray `refunded` key, unreachable from both
call sites and undeclared by the plan — the seed, found again. The fix pass
closed it test-first: it added a key-set assertion, confirmed red against the
four-key map, then dropped the key and the union member. It deliberately kept
the test's status list literal, citing D1, rather than deriving it from the map —
"deriving it from the map would have destroyed the only comparison the plan has
while the split is in flight", which is the correct reading of a design whose
whole cost is that nothing derives from anything.

Review 2 accepted with two minors, both against the assertion the fix had just
written: `Object.keys` with `toEqual` pins insertion order and `Record<LabelKey,
string>` already rejects a fourth key at compile time, so the assertion earns
less than the type does; and the case name promises a guarantee about the API
that a fourth hardcoded copy of three strings cannot give. The kernel called the
first one "mine" and carried both. A review that finds the fix pass's own new
line is the re-review rule working.

## Why the design still accepts, and what that means

The vacuous coverage test — session B's second major — was not raised at all
this time. Three runs of the same plan and the same seed produced three shapes
of `Review 1`: `0/2/1`, `0/2/1`, `0/1/1`. The seeded defect was found in all
three; everything beyond it varies, which is exactly why the review bench scores
fixed packages against a fixed key (decision 0019) and why a loop run is not a
measurement.

The deeper finding is about the breaker itself. **The only thing that holds a
finding open through a fix pass is a person declining the fix.** The kernel
fixes what the plan permits, and the reviewer grades what is left by the diff:
of the five designs tried, the one that reached the breaker did so because the
user answered a fork with "keep the plan" (session A). A seeded defect cannot
reach it, because a defect the fix pass can close is closed, and a defect it
cannot close is a fork — and the fork's answer is a person's.

Ironically the plan fix made this harder rather than easier: session B's fork
existed *because* the Non-goal could be read two ways. Removing the ambiguity
removed the fork.

That is not a defect in the loop. It is what `DESIGN.md §4.5` describes — the
breaker is where the session hands a decision back — and the live evidence for
it is session A's `Breaker: review — accept`.
