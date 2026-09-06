# `status --debt` — 2026-09-02

Stage 8 criterion 4, two `fixture-copy.mjs` copies of `webapp`.

## The seeded copy — `seeded.md`

Three `hodos:` markers committed into the copy, in the form `defaults.md` writes
them, one of them missing the `upgrade when` half:

```
src/features/orders/model.ts:1        // hodos: the filter is a single string — upgrade when a second facet joins it
src/features/orders/ui/OrderList.tsx:9 // hodos: renders the whole array — upgrade when a page exceeds 200 rows
src/lib/http.ts:9                     // hodos: one base URL, taken from the same origin
```

3 turns, **$0.26**. All three rows, sorted by file, the third tagged
`no-trigger`, closing `3 markers, 1 with no trigger.` — the count the criterion
asks for. `git status --porcelain` afterwards is empty: the run is read-only
(decision 0017).

## The clean copy — `clean.md`

4 turns, **$0.29**. `No hodos: debt.`, and it said which `hodos` strings it saw
and rejected — `.gitignore` and `package.json` path references, not markers.

## Two wrinkles, neither a failure

The clean run printed **both** closers: `No hodos: debt.` and
`0 markers, 0 with no trigger.` `COMPONENTS.md §1.5` gives them as alternatives.
Harmless, and the criterion's line is there.

The row form asks for three fields — `<what was simplified>. ceiling: <the
limit>. upgrade: <the trigger>.` — where the marker carries two, so `what` and
`ceiling` collapse into the same words in every row. Visible in the output
above. Backlogged for Stage 11: either the marker gains a field or the row form
loses one.
