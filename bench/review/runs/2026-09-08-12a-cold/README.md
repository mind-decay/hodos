# Review bench — the cold re-buy of 2026-09-08, Stage 12a

Six dispatches, `hodos:hodos-reviewer` on `opus`, three in flight. This run
exists because review 1's **major 1** was right: the baseline of
`2026-09-08-12a-baseline` was scored with a `test-floor` answer key that had
been edited **after** the run, and the edit was decision-determining — with the
pre-run key (`getByRole`) the scorer prints `recall, test-floor 0/1`, which is
decision **0121**'s *miss* branch and buys the computed section. The developer's
answer was to re-buy the number instead of arguing for it, which is also what
decision **0015** asks when a bench's input changes.

Three things were fixed **before** this run, so nothing here rests on a
post-run edit:

1. **The key.** `names: OrderList.test, href` was already committed
   (`7402722`…`35898e1`) and unchanged when the dispatches went out.
2. **The package shape.** Review 1's blocker 1: `FORMATS.md §8` now specifies
   that a package built over a diff owning no task carries no `Mutation:` line,
   which is every package this bench builds, and the reviewer has a reading for
   that shape — so no run improvises one and none earns a spurious `major`.
3. **`defaults.md` row 12 was held out of the tree for the duration.** The row
   is handed to the reviewer by path in every dispatch, so leaving it in would
   have told the reviewer exactly what to look for and the run would have
   measured the mechanism instead of the cold catch. Restored from the index
   immediately after the sixth dispatch returned.

```
node bench/review/run.mjs --check-key
node bench/review/invoke.mjs --out /tmp/hodos-12a-dry2 --dry-run
node bench/review/invoke.mjs --out bench/review/runs/2026-09-08-12a-cold --concurrency 3
node bench/review/run.mjs --verdicts bench/review/runs/2026-09-08-12a-cold/verdicts.json \
  --measurements bench/review/runs/2026-09-08-12a-cold/measurements.json
```

| Axis | Found | Rate | Threshold | |
|---|---|---|---|---|
| recall, overall | 19/19 | 100.0% | 80.0% | PASS |
| recall, convention | 12/12 | 100.0% | 80.0% | PASS |
| recall, behavioral | 7/7 | 100.0% | 80.0% | PASS |
| precision | 42/43 | 97.7% | 85.0% | PASS |
| recall, spec | 2/2 | 100.0% | — | measurement |
| **recall, test-floor** | **1/1** | **100.0%** | — | **measurement** |

**Measurements** (never thresholded, decision 0019): 6 dispatches · **$5.03** ·
2 turns each · 188–236 s. Verdicts: 3 × `NEEDS_WORK` (p1, p2, p3), 3 ×
`REJECT` (p4, p5, p6).

## What this settles that the baseline could not

**The key was a correction, not a fit — and that is now evidence rather than an
argument.** A fresh reviewer instance, with `href` in the key before anything
was dispatched, wrote:

> `major` · `src/features/orders/ui/OrderList.test.tsx:23` · plan
> `Refactor in scope` — *"the `Ada` link-**href** assertion was deleted; scope
> permits the list's tests to gain the totals case only, `OrderList.tsx:15`
> still renders the link, and the test's name now claims a route check it no
> longer makes"* — fix: *"restore the assertion"*.

Two independent dispatches, on two different days' copies, both reached for the
same word for the same thing. That is what `href` being *the thing itself* looks
like when it is true, and it is the check the baseline's post-run edit could not
supply about itself.

**n = 2, and it is still a measurement.** Two cold catches of one seeded defect
carry no threshold: decision **0117**'s reasoning does not improve at n=2, and
both instances read the same authored patch. What changed is that the number no
longer rests on an edit made after seeing an output. Stage 12c's hold-out set is
where a denominator worth thresholding comes from.

**Decision 0121's branch, taken on this run.** Caught cold, so the computed
section on the `## Callers` contract is **not** bought, and `defaults.md` row 12
is the answer — now cited to this run as well as to the baseline.

## The two numbers that moved, and why

**precision 42/43 (97.7%)**, against the baseline's 44/44. One genuine false
positive, and it is not about anything this stage built: p4's reviewer filed
`test/services.test.js:12` against `defaults.md` catalogue row 11, in a file
`clean.json` names and no seeded patch touches. Above the 85% gate. The
denominator also fell by one finding, which is ordinary run-to-run variance in
how many rows six reviewers write.

**`b-l6-callee-contract` was miscategorised again**, this time as
"plan `### Data & scale`, defaults row 14" — a third different wrong item across
three runs, and found every time. The scorer credits it on the neighbour pass
and logs the disagreement; the pattern is now stable enough to be worth a line
in `BACKLOG.md` rather than a note in a third run directory.
