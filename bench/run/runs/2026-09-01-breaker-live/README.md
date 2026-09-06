# The breaker, live — session A

`docs/stages/06-manual.md` session A, run by the user on 2026-09-01 in an
interactive session, because the breaker needs `AskUserQuestion`
(`PLATFORM-NOTES.md` fact 32). Only the excerpts below came back; the copy was
`/tmp/breaker-c` and is not committed.

## The ledger

```
2026-09-01T15:59:48.885Z Init: quick feature
2026-09-01T15:59:48.983Z Plan: approved (f86d66e, 1 tasks, feature/status-label-frozen-api)
2026-09-01T15:59:49.038Z Task 1: started
2026-09-01T15:59:49.080Z Task 1: test red
2026-09-01T15:59:49.193Z Task 1: done (ed184d2)
2026-09-01T15:59:49.236Z Simplify: done (ed184d2, net -0)
2026-09-01T16:02:35.499Z Gap: working tree held an uncommitted revert of T1 wiring the ledger did not record — stashed as stash@{0}, review runs against ed184d2
2026-09-01T16:06:08.631Z Review 1: NEEDS_WORK (0/1/2)
2026-09-01T16:07:23.620Z Gap: review 1 major (unmodeled status renders empty, request<T> is an unchecked cast) contradicts the plan's no-fallback invariant — user chose to keep the plan; carried to the finish report as open
2026-09-01T16:08:22.857Z Ruling: review 1 minor 2 fixed — new OrderDetailPage.test.tsx, T1's detail acceptance criterion had no check — cost if wrong: one test file beyond the plan's file list
2026-09-01T16:08:22.889Z Ruling: review 1 minor 1 carried open — a real check needs OrderStatus, which D1 froze until refactor/orders-api-split lands — cost if wrong: a stale label map goes unnoticed until the follow-up task
2026-09-01T16:08:32.048Z Fix 1: done (ea0dfbf)
2026-09-01T16:12:10.164Z Review 2: NEEDS_WORK (0/1/1)
2026-09-01T16:29:11.756Z Breaker: review — accept
```

```json
{ "phase": "verify", "review": { "iteration": 2, "verdict": "NEEDS_WORK" },
  "tasks": { "total": 1, "done": 1, "current": 1 } }
```

## The breaker, as the session put it

The three options come from `review-loop.md §7`. What the user pasted back of
the live prompt is the question and the answer, not the option list:

```
Review bound exhausted at NEEDS_WORK (0 blockers / 1 major / 1 minor). Open: the
unmodeled-status empty cell at OrderList.tsx:17 and OrderDetailPage.tsx:19 (you
chose to keep the plan's no-fallback design), and the vacuous loop test at
labels.test.ts:13 (its real fix needs the frozen OrderStatus import). How does
the task proceed? → Accept with open findings
```

The option labels themselves were read out of the live session by the stage
reviewer (`docs/stages/06-review.md`, criterion 2b) and match §7 word for word;
they are not in this repository, and `06-manual.md` step 5 now asks for them so
the next run's are.

## What this evidences

The whole loop, live: two iterations and no third package, a fix pass between
them, the breaker offered as three options after the bound was spent, the
`Breaker: review — accept` line written, and `state.phase` deriving `verify`
from it — `ledger.mjs`'s rule (`scripts/ledger.test.mjs:340`) reached by a real
run rather than by a unit test. Both open findings are carried, not closed:
that is what "accept with open findings" means.

Two `Gap:` lines and two `Ruling:` lines, each naming its cost if wrong. The
kernel asked twice and ruled twice, and the ledger says which was which.

## What it does not evidence, and why

**The seeded defect was not in the tree.** `--into /tmp/breaker-c` pointed at a
directory an earlier attempt had used. `fixture-copy` laid the pristine fixture
over the seeded working tree, deleted nothing, and kept the old `.git` and
`.claude/hodos/tasks/` — so the copy carried a ledger describing commits its
tree did not have, and `labels.ts` never got its fourth key. The reviewer says
so in as many words: `OrderStatus` and `LabelKey` are the same three keys.

The kernel **caught it** before dispatching: it read the tree against the
ledger, stopped, laid out four options, and recorded the `Gap:` at 16:02:35.
That is the run's best moment and it is not a criterion anywhere.

The harness fault is fixed at `bench/scripts/fixture-copy.mjs`: `--into` now
refuses a directory that already holds something.

So the major that survived to the breaker is the reviewer's own — an unmodeled
status rendering an empty cell, because `request<T>` casts unchecked JSON — held
open by the user's ruling that the plan's no-fallback invariant stands. The
mechanism `status-label-frozen-api` was built for (a stray status key the local
union cannot catch) was never exercised. Session B runs it on a clean copy.
