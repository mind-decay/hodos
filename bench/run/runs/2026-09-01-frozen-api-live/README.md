# The fourth design on a clean copy — session B

`docs/stages/06-manual.md` session B, run by the user on 2026-09-01 in
`/tmp/breaker-d`, seeded correctly this time (`--into` now refuses a non-empty
directory). It did **not** reach the breaker: `Review 2: ACCEPT`. What it
evidences is the design's seed and the loop's fix pass, both of which session A
could not.

## The ledger, end of the run

```
2026-09-01T20:10:54.381Z Ruling: minor (missing OrderDetailPage test) carried as open — its fix is a new file outside T1's Files line — cost if wrong: the detail-view acceptance criterion stays unproven until the follow[-up task]
2026-09-01T20:11:44.651Z Fix 1: done (1be48e8)
2026-09-01T20:14:42.351Z Review 2: ACCEPT (0/0/1)
```

`state.phase` is `verify`. The branch holds `ad2eadb` (T1) and `1be48e8` (fix 1).

## What it evidences

**The seeded defect is findable.** `Review 1: NEEDS_WORK (0/2/1)`, and major 1
is the seed: `refunded` is dead, `api.ts:3` has three members, and the local
union is what let it in. Session A never put this in front of a reviewer; this
run did, and the reviewer took it in iteration 1 with the right reason.

**A finding the key does not carry.** Major 2: `labels.test.ts` pinned coverage
with a hardcoded `['open', 'paid', 'cancelled']`, so it stays green under the
exact mutation it exists to catch — a new `OrderStatus` member. That is the
seeded design's own test being vacuous, and the reviewer found it unprompted.

**Mutation proof, done properly, after a wrong first attempt.** The fix pass
wrote the pinning line, ran a red check, and *rejected its own red*: the error
came from the local annotation in `labels.ts`, not from the new line. It then
narrowed `LabelKey` below `OrderStatus` so only the test's line could bite, got
the red at `labels.test.ts:17`, restored, and ran the checks green. `execute.md
§5` asks for the line the criterion names; this is a run noticing it had broken
the wrong one.

**Both dispositions of a minor, live.** The missing `OrderDetailPage` test was
*fixed* in session A (with a `Ruling:` naming the cost) and *carried open* here,
under `review-loop.md §5`'s rule that a minor is fixed only when its fix is a
line in a file the pass already has open. Same finding, same plan, two rulings —
the fork is real, not decorative.

## Why it did not reach the breaker

The fork the user answered was major 2's fix: pinning the test needs
`import type { OrderStatus } from '../api'`, and the plan's Non-goal freezes
"any import of `api.ts` **from the new module**". The reviewer read that as not
covering the test file; the user agreed, on the merits — a type-only import in a
test conflicts with nothing the split rewrites, and the plan's own D1 promises
that the keys are "pinned with a test". With both majors closed, iteration 2
accepted.

That is the plan's fault and it is fixed: the Non-goal now names `labels.ts` and
its test explicitly, so the freeze is not a thing to read two ways. What made
this ambiguity survive the gate is worth keeping in mind — the gate reads the
plan for contradictions, and this one only appeared once a reviewer proposed a
fix.
