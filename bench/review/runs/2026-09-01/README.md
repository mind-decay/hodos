# Review bench — run of 2026-09-01

Six dispatches, one per package, `hodos:hodos-reviewer` on `opus`, CLI 2.1.252.
`p1` was run alone first and read before the other five went out three at a
time — the spend rule of `docs/stages/06-plan.md` D12.

```
node bench/review/invoke.mjs --out <dir> --only p1
node bench/review/invoke.mjs --out <dir> --only p2,p3,p4,p5,p6 --concurrency 3
node bench/review/run.mjs --verdicts <dir>/verdicts.json
```

| Axis | Found | Rate | Threshold | |
|---|---|---|---|---|
| recall, overall | 18/18 | 100.0% | 80.0% | PASS |
| recall, convention | 12/12 | 100.0% | 80.0% | PASS |
| recall, behavioral | 6/6 | 100.0% | 80.0% | PASS |
| precision | 31/34 | 91.2% | 85.0% | PASS |

**Measurements** (never thresholded, decision 0019): 6 dispatches · $4.06 ·
994 s wall · 2 turns each. Sections: the longest Standards section is 343 words
against the 400 cap, the longest Spec 156.

**Three findings carry a path and no line**, and none of them is what decision
0038 admits. All three are real and all three are dropped:
`src/features/orders/ui/useStatusParam.ts` (p2) is the module the diff adds —
the missing file is its test; `test/services.test.js` (p5) exists untouched —
what is missing is a case in it; `src/features/orders/ui/` (p6) is a directory.
Decision 0038 asks for the missing file's **own** path, and these six reviews
were written before the rule existed. The scorer proves the difference rather
than trusting it: `invoke.mjs` records each package's file list from the copy it
built, and a bare path counts only when it names a file the package does not
ship. Precision is 31/34 either way, and the gate is met.

**What the reviewer added beyond the key**: every package's Spec section found
that the seeded work is never mounted or called — no component in these
packages is wired into a page, because a patch set is not a feature. That is
correct and unscored: the bench's key is the seeded defects, and a finding
outside it counts against precision only when it lands in a `clean.json` file.

`verdicts.json` is the parsed run; `p<n>-review.md` is what the reviewer wrote,
verbatim. Both were re-parsed once with `invoke.mjs --reparse` after two parser
fixes — locations in backticks, and a risk code named later in the item cell —
which changed no review and no dispatch, and a third time under decision 0038
— that pass also fills in each package's file list, which is the copy's fact
and not the review's.
