# Review bench — run of 2026-09-02, under the narrowed absence rule

Six dispatches, one per package, `hodos:hodos-reviewer` on `opus`, all six at
concurrency 3. The reason for the run is decision 0038: the reviews of
2026-09-01 were written before the rule that says how to locate a finding whose
subject is a file that does not exist, so they could not obey it, and criterion
1c was failed against them. This run is the first under the rule.

```
node bench/review/invoke.mjs --out <dir> --concurrency 3
node bench/review/run.mjs --verdicts <dir>/verdicts.json
```

| Axis | Found | Rate | Threshold | |
|---|---|---|---|---|
| recall, overall | 18/18 | 100.0% | 80.0% | PASS |
| recall, convention | 12/12 | 100.0% | 80.0% | PASS |
| recall, behavioral | 6/6 | 100.0% | 80.0% | PASS |
| precision | 41/44 | 93.2% | 85.0% | PASS |

**Measurements** (never thresholded, decision 0019): 6 dispatches · $4.33 ·
2 turns each. Sections: longest Standards 350 against the 400 cap, longest Spec
195, longest Coverage 81. Every package's checks section carries three lines of
real output.

**The rule works, four times out of five.** Five rows carry a path and no line.
Four of them name a `.test.ts` or `.test.tsx` file that does not exist —
`useStatusParam.test.ts`, `useCancelOrder.test.ts`, `OrderRefresh.test.tsx`,
`useOrdersByStatus.test.ts` — which is the form `FORMATS.md §9` prescribes, and
the scorer credits them because the package's own file list says those paths
are empty.

The fifth is p1's `src/features/orders/model.test.ts`, and that file **exists**:
the finding is that it holds no case for the `topByTotal` the diff adds. That
shape has a line — the one the untested behaviour is on — and the rule
deliberately does not admit it, so the row is dropped. One row in 44, at
`minor`.

**Two false positives**, both the same shape: a finding filed against a file
`clean.json` names, citing `defaults #11` ("a green test is proved by
mutation") at `src/lib/http.test.ts:39` (p2) and `test/services.test.js:14`
(p4). The clean files are there to be left alone, and a reviewer that reviews
them pays for it. The 2026-09-01 run had none of these and three dropped rows
instead; this one has two of these and one dropped row.

**All six verdicts are `REJECT`.** On 2026-09-01 two were `NEEDS_WORK` and four
`REJECT`. Nothing in the packages changed; the severities a reviewer assigns to
the same defects move between runs, which is the variance decision 0019 gives as
the reason measurements are never thresholded — and the reason recall and
precision are, since both held: 18/18 twice, 91.2% and 93.2%.

## What the run was exposed to

**Not recorded.** This run was made on 2026-09-02, before Stage 11a established
that a headless bench session inherits the operator's enabled plugins and their
`SessionStart` hooks (`docs/stages/11a-plan.md` D5). Which plugins were enabled
while these six dispatches ran is not known and is not reconstructable, so it is
stated as missing rather than guessed. Every run made from 2026-09-03 onward
records it; this one is the gap, and Stage 11a's criterion 11 is reported
against it.
