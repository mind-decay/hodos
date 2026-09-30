# One package, for the Unclaimed word — 2026-09-07

Stage 11d-1, T3 and T4 (`BUILD-PLAN.md` Stage 11d, *The derivation is checked where the inputs are*), decisions **0092** and **0107**'s sibling half. Not a scored run of the set: one package, dispatched to see whether the row appears at all. The full re-buy of recall and precision is Stage **11d-3**'s criterion.

```
node bench/review/invoke.mjs --out <dir> --only p3
node bench/review/run.mjs --verdicts <dir>/verdicts.json
```

One dispatch, 2 turns, 230 s, **$0.87**. `p3` now carries a fourth seeded defect, `s-unclaimed-refund-state`: its diff adds `RefundState = 'requested' | 'approved' | 'declined'` with a test that covers all three, and the package's plan claims two of them in T4. The defect is in the **claim set** and not in the code, which is what makes it a test of the new word rather than of the Standards table.

## What the reviewer wrote — `p3-review.md`, verbatim

```
Unclaimed: `'declined'`, the third member of `RefundState` (`refund.ts:2`), is in no `Acceptance:`
clause — T4 names `requested` and `approved` only; and the `### Invariants & failure modes` clause
"a failed call … puts the reason on the page" has no acceptance clause covering `cancel`, which
exposes no error surface at all.
```

Both of gap 7's inputs fired from one diff: the union member, and a clause of `### Invariants & failure modes` with no claim behind it. The row carries the member's name and the `file:line` the diff added it at, and it carries no severity — the verdict, `REJECT`, comes from two blockers in the Standards table that have nothing to do with it.

## The score — `score.txt`

| Axis | Found | Rate | Threshold | |
|---|---|---|---|---|
| recall, overall | 3/3 | 100.0% | 80.0% | PASS |
| recall, convention | 2/2 | 100.0% | 80.0% | PASS |
| recall, behavioral | 1/1 | 100.0% | 80.0% | PASS |
| precision | 7/7 | 100.0% | 85.0% | PASS |
| recall, spec | 1/1 | 100.0% | — | **measurement** |

`packages scored: 1 of 6 (--only p3)` — the scorer prints the scope because the gates are over the whole set, and a run that does not declare one exits 1 (Stage 11b's own fix). The three gate rows are p3's own three older defects.

`recall, spec` is a measurement and not a gate: the four thresholds were bought on twelve convention and seven behavioral defects, and a third class entering their denominator would move a threshold with no decision behind it (`docs/BENCH.md`, `bench/review/README.md`). Whether it joins them is Stage 11d-3's Start question.

## What this run does not say

It says the row appears, is scored, and names the member — one package, one dispatch, one seeded defect the same stage authored. It says nothing about a claim set nobody seeded: that is the hold-out measurement of Stage 12, on a repository this engine has never seen (`BENCH.md`).

## Corrections after review 1

Two edits to this directory and its patch, both named by review 1 of Stage 11d-1:

- `verdicts.json:9`'s `copyDir` held a scratch path carrying the home directory's name and was replaced with `<scratch>/p3run/copies/p3` (decision **0104**'s gate, `tools/export-public.test.mjs`). `<scratch>` is **new here**, and review 2 was right to say the attribution first written in its place was false: the 2026-09-06 record's same field holds `<repo>/bench/review/runs/2026-09-06/copies/p1`, and 0104 names `<home>` and `<repo>`. Neither fits a session scratch directory under `/private/tmp`, which is what this path was, so the placeholder says which root it stands for by not claiming either. Nothing else in the file changed and it still parses.
- The seeded patch carried `export interface Refund { … }`, which nothing imported. The dispatch reported it twice — as `Extra: the Refund interface (refund.ts:4)` in the Spec line and as a `minor` on `refund.ts:4` — and the answer key named neither, so a finding outside a `clean/` file counted as correct and `--check-key` could not see it: **one free finding in the 7/7 precision above**. `bench/review/README.md` says a seeded patch carries one defect each, so the interface was removed and the patch regenerated with a real `git diff` (hunk counts and blob hashes recomputed, `line: refund.ts:2` and the anchor unmoved). The score above was **not** re-derived: the dispatch ran against the patch as it then was, and the caveat stands rather than being tidied away.
