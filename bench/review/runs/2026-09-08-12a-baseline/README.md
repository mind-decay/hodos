# Review bench — run of 2026-09-08, Stage 12a's baseline for decision 0121

Six dispatches, one per package, `hodos:hodos-reviewer` on `opus`, three in
flight. The reason for the run is decision **0121**: a twenty-second seeded
defect — `t-deleted-list-assertion`, a diff that deletes the assertion pinning a
row's link and leaves the suite green — is scored against the review package
**as it stands**, and whether the reviewer catches it cold decides whether a
mechanism is bought for the shape. Decision **0015**'s rule applies as well: the
set's input changed, so the run is re-bought rather than argued.

```
node bench/review/run.mjs --check-key
node bench/review/invoke.mjs --out /tmp/hodos-12a-dryrun --dry-run
node bench/review/invoke.mjs --out bench/review/runs/2026-09-08-12a-baseline --concurrency 3
node bench/review/run.mjs --verdicts bench/review/runs/2026-09-08-12a-baseline/verdicts.json \
  --measurements bench/review/runs/2026-09-08-12a-baseline/measurements.json
```

| Axis | Found | Rate | Threshold | |
|---|---|---|---|---|
| recall, overall | 19/19 | 100.0% | 80.0% | PASS |
| recall, convention | 12/12 | 100.0% | 80.0% | PASS |
| recall, behavioral | 7/7 | 100.0% | 80.0% | PASS |
| precision | 44/44 | 100.0% | 85.0% | PASS |
| recall, spec | 2/2 | 100.0% | — | measurement |
| **recall, test-floor** | **1/1** | **100.0%** | — | **measurement** |

**Measurements** (never thresholded, decision 0019): 6 dispatches · **$4.91** ·
2 turns each · 180–269 s. Verdicts: 3 × `REJECT` (p1, p4, p5), 3 ×
`NEEDS_WORK` (p2, p3, p6). Enabled at run time: the operator's own plugin set,
`caveman@caveman` among them — its `SessionStart` hook injects a prose-register
instruction, which affects the register of a quoted transcript and no number
here (`BACKLOG.md`, Stage 8).

## The answer to the question the run was bought for

**Caught cold.** p3's reviewer filed the removal twice, with nothing in its
prompt naming the shape:

- Spec, `Extra:` — *"`src/features/orders/ui/OrderList.test.tsx:23` — the diff
  deletes the existing `href` assertion. `### Refactor in scope` lets the list's
  tests *gain* the totals case; nothing asked for a removal."*
- Standards, `major` — *"the `href` assertion is gone while the test's name
  still claims 'linking to its detail route'; the link is now unchecked"*, fixed
  as *"restore the deleted assertion"*.

That is decision 0121's *catch it cold* branch: one `defaults.md` row is the
whole answer, and the computed section on the `## Callers` contract is **not**
bought. The row is `defaults.md` **12**, and it cites this run as the instance
that admitted it, which is the procedure decision **0086** created.

## Three things that bound the claim

**n = 1.** One dispatch, one seeded defect. No threshold, for `recall, spec`'s
reason (decision **0117**): a single miss would read as 0%.

**The key was corrected after the run.** Its `names` tokens were
`OrderList.test, getByRole`; the reviewer wrote *"href assertion"*. `getByRole`
is the matcher, and the kind's own rule is that a token is the thing itself —
the member, the path, the clause — so they became `OrderList.test, href`. The
number above is therefore the review text read by a person, with the scorer's
key brought back to the rule it should have followed. Stated here rather than
quietly amended, because the alternative reading is that the key was fitted to
the output.

**The net is wide.** A `test-floor` hit counts from a Standards row, a Spec word
or the Coverage line, so an incidental mention of `href` anywhere in a review
would credit it. Deliberate — at the baseline the reviewer has no section to
file a removal under — and a third reason this stays a measurement. Stage 12c's
hold-out set is where it is re-derived.

## What the run found in the bench rather than in the engine

`clean.json` names one file for p3, `OrderList.test.tsx`, and the new seeded
patch edits that same file. The reviewer's correct catch was therefore scored a
**false positive**, and precision printed **97.7% (43/44)**. The rule was
narrowed — a clean file is not clean **on the lines** a seeded patch of the same
package changed, because `clean.json`'s own words are "changed correctly" and
that stops being true exactly there — and precision is **100% (44/44)**. (The
first narrowing keyed on the whole file and silently cost one of six clean
files; Stage 12a's review 1 caught it, and the rule above is what replaced it.) Both numbers are here on
purpose: the first is what the scorer said before the bug was fixed.

One more, cheaper: `--check-key` reads each patch's metadata and cannot see
whether a package's patches apply *together*. The first attempt at this run died
in `prepare` after two dispatches had already gone out, because the defect
deleted a line the clean patch quotes as context. `--dry-run` builds every copy
and dispatches nothing, and is now the documented first step.

## Also recorded, not acted on

`b-l6-callee-contract` was found but **miscategorised**: the reviewer filed it
under `plan ### Non-goals + ### Data & scale` rather than as an `L6` item, so
the scorer credited it on the neighbour pass and logged the disagreement. Same
as the run of 2026-09-07. Five of 44 findings were located by path alone.
