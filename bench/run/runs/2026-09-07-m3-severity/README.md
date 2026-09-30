# M3 — severity, the breaker's counts, and the order nothing records, 2026-09-07

Stage **11d-3**, criterion 2 (*Severity orders the fix, and the breaker names
the counts*). One `/hodos:run orders-summary` from phase `verify` in a prepared
`webapp` copy, run by the developer because the verify breaker is an
`AskUserQuestion` (`PLATFORM-NOTES.md` fact 32). Two verifier dispatches
(20m 40s, 7m 58s), one fix pass, the finish fold.

```
Verify 1: FAIL · 24 claims · 15 pass · 6 fail · 3 skip
Fix 1:    668a206
Verify 2: FAIL · 24 claims · 18 pass · 3 fail · 0 flaky · 0 pre-existing · 3 skip
Breaker:  verify — accept
```

`verify-2.md` is here because `verify.md` does not survive `finish` (`§3` folds
it into `plan.md#Outcome` and deletes it); it was copied off disk between the
breaker and the fold.

## What it proved

**The breaker names the counts.** `0 blockers · 1 major · 2 minor · flaky 0 ·
pre-existing 0`, with rows 22, 23 and 24 named, and the same counts reach the
finish report and `plan.md#Outcome`. All three agree.

**The counts are the table's, not the kernel's.** The kernel predicted the
`/shift` rows would come back `pre-existing`; the verifier graded them `fail`
and counted `pre-existing 0`, which is decision **0119** holding. The kernel
reconciled to the table and said so.

## What it could not prove, and what it found

**The fix order.** `verify-loop.md:146` allows one commit for the pass, so
severity order leaves no artifact. `fix-commit.txt` narrates row 19 (`minor`)
before rows 20–21 (`major`) — consistent with narrating by row number and
consistent with the wrong order, and nothing distinguishes them. Proposal
**TTT**.

Four more, each with this run behind it: **QQQ** (the fix pass's bound cites a
status these rows cannot hold), **SSS** (the run proved provenance from the
object store, which 0119 said a browser row could not do), **UUU** (`config.mjs
check` passed a predicate that walks `nextElementSibling` twice), **VVV**
(`pin.diff`'s `evaluate` is a bare expression where M1's is a function).

The write-up is `docs/stages/11d3-report.md`, rows **2a–2g**.

## Files

| File | What it is |
|---|---|
| `verify-2.md` | iteration 2's table, rescued before the fold |
| `plan.md` | with the `## Outcome` the fold wrote |
| `ledger.md` | 19 lines, including two `Gap:` and one `Ruling:` |
| `fix-commit.txt` | `668a206`, the whole fix pass |
| `pin.diff` | the pin the developer approved, uncommitted in the copy |
