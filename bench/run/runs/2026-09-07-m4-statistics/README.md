# M4 — the statistics row, and the status that did not appear, 2026-09-07

Stage **11d-3**, criterion 3 (*A number names its statistic, and a pass on retry
is not a pass*). One `/hodos:run detail-timing` from phase `verify` in a
prepared `webapp` copy, run by the developer because the verify breaker is an
`AskUserQuestion` (`PLATFORM-NOTES.md` fact 32). Two verifier dispatches
(16m 1s, 4m 15s), one fix pass, the finish fold.

```
Verify 1: FAIL · 13 claims · 8 pass · 2 fail · 0 flaky · 0 pre-existing · 3 skip
Fix 1:    16d5298
Verify 2: FAIL · 13 claims · 9 pass · 1 fail · 0 flaky · 0 pre-existing · 3 skip
Breaker:  verify — accept
```

`verify.md` did not survive `finish` and was not copied in time. Its counts
live in `plan.md#Outcome`, which is what the fold is for.

## First half: proved, and past what was asked

`evidence/09-perf-orders-dcl.txt` carries five raw values, the sorted series,
the median, the p95 **and the rule used to pick it** (nearest-rank, n=5). The
criterion asked for two statistics; the row makes them checkable.

## Second half: `flaky 0`, and the seed is why

`evidence/10-crash-console.txt` records `ok, CRASH, ok, CRASH` on four real
navigations — decision **0098**'s literal condition for `flaky`. The verifier
wrote `fail · blocker` and named the mechanism instead: the `sessionStorage`
parity counter, the `performance.getEntriesByType('navigation')` gate that
hides it from jsdom, and the missing `ErrorBoundary`.

**That is the better answer**, and `bench/run/README.md:153` says why: `flaky`
carries no severity, so the status would have dropped the row's `blocker` and
its place in the fix order. A defect whose mechanism is readable in the diff is
never *unexplained*, and every seeded defect is readable in the diff — so
`detail-flaky-every-other-load` cannot produce the status it was written for.
Proposal **RRR**.

## The rest

Row 8 — axe `landmark-one-main`, app-wide — was left by the developer's call at
the fix pass and is what created the breaker; without it the run ended `PASS`.
The report named it *"app-wide, not introduced by this diff"* and did not call
it `pre-existing`, which it has no proof of. Proposals **QQQ** and **SSS** both
have this row behind them too.

`evidence/00-mutation-check.txt` is decision **0122**'s shape a stage early: the
mutation, the `sed`, the vitest output, the restore, and `git status
--porcelain` empty afterwards.

Cost: the kernel session alone reports `output 18899 · cacheCreation 120507 ·
cacheRead 2103892`, about `$6.83` at opus rates, before two sonnet verifiers —
against T13's `$1–4`. The quote assumed one dispatch; a seeded blocker
guarantees a fix pass and a second.

The write-up is `docs/stages/11d3-report.md`, rows **3a–3e**.
