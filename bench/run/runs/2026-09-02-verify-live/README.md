# Verify loop, live — 2026-09-02

Stage 7 criterion 1. `bench/run/seed.mjs orders-summary --at verify`, then
`claude -p "/hodos:run orders-summary" --plugin-dir <repo> --permission-mode
bypassPermissions --max-turns 45 --output-format stream-json --verbose` inside
the copy. One session, 21 turns, **$1.43**, `result.subtype: success`.

The verifier ran on `config.models.verify` = **sonnet** — the first thing in
this tree executed on a non-opus model. Recorded as a **measurement**
(decision 0019): no threshold, no gate.

| What the criterion asks | What the run produced |
|---|---|
| `verify.md` covers every plan claim | 12 rows: four for T1's acceptance clause, three for T2's, three for T3's, two for the `## Verify plan` lines |
| header counts equal the rows | `claims 12 · pass 12 · fail 0 · skip 0` over a 12-row table |
| ≥2 screenshots in `evidence/` | `01-orders-three.png` (93K), `02-orders-empty.png` (79K), beside `unit-run.txt` and `unit-verbose.txt` |
| console and network checked | recorded per navigation; the two console items found (a `favicon.ico` 404 and a `<select>` a11y warning) are named as pre-existing and outside the diff |
| one mutation row | row 4 plus the `## Mutation check` section: `summary.test.ts:34`'s `0.3` broken to `0.4`, suite red, restored, `git status --porcelain` empty |
| verdict `PASS` | `Verify 1: PASS 12 claims, 0 skipped`; `state.phase` → `finish` |

`node bench/run/runs/kernel-turns.mjs <run.jsonl>` on the session log:

```
kernel tool uses: 20
  review-input.md: 0 read, 0 mentioned
  review.md: 0 read, 0 mentioned
  dispatches: 1
    hodos:hodos-verifier x1
  git diff in a kernel command: 0
```

One dispatch, and the kernel never opened a review artifact — the verify loop
does not re-enter the review's.

## What the run found that the design had not said

The fixture serves no `/api` in dev, on purpose (`bench/fixtures/webapp/CLAUDE.md`).
The verifier reached both browser claims by stubbing `window.fetch` through the
adapter's `initScript` — the same boundary the project's own tests stub — and
said so in `## Notes` rather than letting the rows pass unexplained. The
adapter gained the `stub` operation and its gotcha from this run.

It also used `evaluate_script` to read `getComputedStyle(...).color` for T3's
colour claim, which is the right tool for a cascade question and was not in the
adapter file. It is now.

The screenshots are not committed: this directory keeps text. Their existence
and size are the evidence, and the rows that cite them say what they showed.
