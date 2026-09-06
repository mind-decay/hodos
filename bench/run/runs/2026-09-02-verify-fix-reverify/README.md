# A failing claim, the fix, the scoped re-verify — 2026-09-02

Stage 7 criteria 3 (first half) and 4.
`seed.mjs orders-summary --at verify --defect orders-no-data-status`, then one
`claude -p "/hodos:run orders-summary"` session: 13 + 10 + 9 turns, **$2.19**.

The defect drops `data-status` from the row. It is invisible to every static
check — `npm test` 14/14, `tsc --noEmit` clean, `eslint .` clean — and the
review that accepted this diff is seeded as `Review 1: ACCEPT`. Only the
verifier runs the claim, which is the whole reason the phase exists.

```
Verify 1: FAIL 15 claims, 0 skipped
Fix 1: done (cfe99b2)
Verify 2: PASS 15 claims, 0 skipped
```

**Iteration 2 re-ran the failed row and no other.** Its table still answers for
all 15 claims — `FORMATS.md §10` makes a missing claim a failure whichever
iteration writes the table — and the 14 rows that had passed carry
`iteration 1` in the Command column with their first-iteration evidence.

**The fix was not re-reviewed.** From `kernel-turns.mjs` on the session log:

```
kernel tool uses: 29
  review-input.md: 0 read, 0 mentioned
  review.md: 0 read, 0 mentioned
  dispatches: 2
    hodos:hodos-verifier x2
  git diff in a kernel command: 0
```

Two dispatches, both verifiers. No `review-package.mjs` call, no reviewer, and
no review artifact opened after the verify loop began. The fix is named in the
session's closing report instead, which is where `finish` will carry it.

T3 carries `Tests: visual`, so the fix added no unit test: the plan named the
ui recipe as that clause's check and the re-verify is what ran it.
