# Verify with no browser adapter — 2026-09-02

Stage 7 criterion 2. The copy is a `fixture-copy.mjs` of `webapp` whose
`config.adapters.browser` was set to `null` **and committed before**
`seed.mjs orders-summary --copy <dir> --at verify`, so the absence is in the
base rather than in an uncommitted edit the run would trip over.

One session, 12 turns, **$0.98**.

```
Verify 1: PASS 13 claims, 4 skipped
```

- rows 8, 9, 10 (T3's three clauses) and row 12 (the `## Verify plan` ui line)
  are `skip`, each reading `no browser adapter configured`
- the `unit` recipe's claims ran for real: `Test Files 5 passed (5)`,
  `Tests 14 passed (14)`
- the mutation row ran and went red as expected, and the tree came back clean
- the header counts equal the rows: `claims 13 · pass 9 · fail 0 · skip 4`
- no dev server was started, and `evidence/` holds no screenshots

The verdict is `PASS`, which is the design as written: a skip with a reason is a
claim nobody could run, not a claim that failed (`FORMATS.md §10`). What the
row would hide if it were silent is exactly what the reason makes visible.

The verifier also justified each skip against the plan rather than against the
config alone — T3 carries `Tests: visual … verified by ui recipe /orders`, so
no unit test exists for those clauses and none was expected.
