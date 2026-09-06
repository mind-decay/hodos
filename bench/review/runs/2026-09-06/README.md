# Review bench — run of 2026-09-06, the re-buy for `## Callers`

Six dispatches, one per package, `hodos:hodos-reviewer` on `opus`, sequential.
The reason for the run is decision **0100**: the package gained a `## Callers`
section, `agents/hodos-reviewer.md` gained one sentence naming it as an input,
and a nineteenth defect was seeded whose only evidence is a call site outside
the changed files. A section the reviewer is shown and a defect only that
section can reach are both changes to the bench's input, and decision 0015 says
an input change is re-bought rather than argued.

```
node bench/review/invoke.mjs --out bench/review/runs/2026-09-06
node bench/review/run.mjs --verdicts bench/review/runs/2026-09-06/verdicts.json \
  --measurements bench/review/runs/2026-09-06/measurements.json --json
```

| Axis | Found | Rate | Threshold | |
|---|---|---|---|---|
| recall, overall | 19/19 | 100.0% | 80.0% | PASS |
| recall, convention | 12/12 | 100.0% | 80.0% | PASS |
| recall, behavioral | 7/7 | 100.0% | 80.0% | PASS |
| precision | 41/44 | 93.2% | 85.0% | PASS |

**Measurements** (never thresholded, decision 0019): 6 dispatches · $4.39 ·
2 turns each.

## What changed between this run and 2026-09-02

Three things, and nothing else: the `## Callers` section in every package that
has callers, one sentence in the reviewer's prompt naming it, and the
nineteenth seeded defect (`b-l6-callee-contract`, p6). The four fixtures, the
other eighteen defects, the six packages and the scorer are the ones
2026-09-02 ran against.

| | 2026-09-02 | 2026-09-06 |
|---|---|---|
| recall, overall | 18/18 | **19/19** |
| recall, behavioral | 6/6 | **7/7** |
| precision | 41/44 · 93.2% | 41/44 · 93.2% |
| dispatches · cost | 6 · $4.33 | 6 · **$4.39** |
| turns, mean | 2 | 2 |
| verdicts | 6 × REJECT | 5 × REJECT, 1 × NEEDS_WORK (p2) |

Precision is the same fraction, from a different denominator's worth of work:
44 findings both times, three wrong both times, and **not the same three**. The
$0.06 is the section and the sentence; the reviewer reads a few more lines and
does not spend a turn on them.

## The nineteenth defect, and what read it

`b-l6-callee-contract` adds `limit = 25` as a default parameter of
`listOrders` in p6. Nothing in the changed files shows the harm: the caller is
`src/features/orders/ui/OrdersPage.tsx:10`, unchanged, outside the diff, and it
passes no `limit`. The package's `## Callers` block carries exactly that line,
and the reviewer's row names it as the trigger:

```
| major | src/features/orders/api.ts:22 | plan `### Non-goals` / `### Data & scale`
| a status with more than 25 orders, via `OrdersPage.tsx:10`
| the new default silently caps the existing list page at 25 of "the same few
  hundred rows"; `keys.list(status)` does not carry `limit` either
| drop the parameter |
```

That is the arm working: the defect is reached, and reached through the one
path the section opened.

**It is filed under the wrong item.** The answer key calls it behavioral —
an `L6` callee-contract mismatch — and the reviewer filed it against the
plan's `### Non-goals` / `### Data & scale`. The scorer credits the row (it
matches on location, and `--json` reports the mismatch under
`miscategorised`), so recall counts it and the item name does not. Both
readings are true of the same line: the default is a contract change *and* a
non-goal the plan barred. The bench does not gate the item, and this run is
the reason to say so out loud rather than to tighten the key against one row.

## Two false positives, and one row with no line

- p1 `src/features/orders/api.ts:20`, minor, `defaults #16 dead code`:
  `keys.summary` has no caller. It is a consequence of a real finding the
  reviewer had already filed two rows above, and its own fix line says so
  ("resolved by the `keys.summary(status)` fix above"). A finding whose fix is
  another finding is one finding.
- p4 `test/services.test.js:19`, major, test-first: the file is a clean file,
  and a reviewer that reviews a clean file pays for it. 2026-09-02 had two of
  this exact shape (p2 and p4); this run has one.
- p5 `test/services.test.js`, major, no line: the same test-first shape filed
  without a line, which `FORMATS.md §9` admits only for a path that does not
  exist. This one exists.

The section reached four of the six packages — p2, p4, p5 and p6 — so two of
the three wrong rows (p4's false positive, p5's invalid row) are in packages it
changed. What holds is the narrower claim, checked against `verdicts.json`:
**no wrong row cites a `## Callers` line**, and none of the three is about a
caller at all.

## The section named one line that is not a call, in two packages

p4 and p5 were packaged with `- \`list\` · test/server.test.js:31 — \`it('answers
the list route with JSON', async () => {\``. The word `list` is in a test
title, and `git grep --word-regexp` cannot tell a title from a call. p4's
reviewer read the pointer, checked it and reached the right answer anyway; the
line is still noise, and criterion 7 of Stage 11b-3 is written against noise.

`scripts/review-package.mjs` now requires a match to be shaped like a call —
the name, then `(`. The filter landed **after** this run, so the packages above
are the pre-filter ones; it is proven by its own red-first case and mutant O in
`docs/stages/11b3-report.md`. What it does to these three packages,
re-derived with `--dry-run` and no dispatch:

```
node bench/review/invoke.mjs --out <tmp> --dry-run --only p4,p5,p6
```

- **p4** carries no `## Callers` at all. The noise line was its only match, so
  the honest package is the one with no section — `list` has no call site
  outside the diff.
- **p5** keeps three of four: `list(null)`, `list('paid')` and
  `list('archived')` in `test/services.test.js`, and drops the title.
- **p6** is unchanged — `listOrders(status)` at `OrdersPage.tsx:10`, the arm.

Re-buying six dispatches to watch one noise line disappear buys nothing the
test and this re-derivation do not already prove. The cost of not re-buying is
named: p4's reviewer saw a section that should not have been there, and its
verdict is in the numbers above.

## What the run was exposed to

Nine plugins enabled, **`caveman` and `hookify` among them** — unlike the runs
of 2026-09-03, which disabled both: `caveman`, `claude-md-management`,
`clangd-lsp`, `frontend-design`, `gopls-lsp`, `hookify`, `humanizer`,
`rust-analyzer-lsp`, `typescript-lsp`. `chrome-devtools-mcp` disabled.

What 2026-09-02 ran under is **not recorded** and not reconstructable, so the
comparison above states the numbers and not that the conditions matched. The
two plugins that differ from 2026-09-03 shape the operator's prose, not a
subagent's dispatch, and no finding in the six reviews reads as either of
them — but that is a reading, not a control, and there is no clean-profile arm
today (`docs/BENCH.md`, "What every run here is exposed to").

The six `stream-json` transcripts are not committed, and neither are the
package copies — `bench/review/runs/*/copies/` is gitignored, as it is for the
router bench. `verdicts.json`, `measurements.json` and the six `p*-review.md`
files are what the numbers rest on; the copies are rebuildable from
`bench/review/packages/` and `bench/review/seeded/` with `--dry-run`, which is
how the section above was re-derived.
