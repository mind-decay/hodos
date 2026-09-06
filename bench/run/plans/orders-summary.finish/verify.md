# Verify 1 — orders-summary
Verdict: PASS · claims 6 · pass 5 · fail 0 · skip 1

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | T1 sums the fixture range at cent precision | `npm test -- summary` | 4 passed | pass |
| 2 | T1 returns zeros for an empty list | `npm test -- summary` | 4 passed | pass |
| 3 | /orders shows the count and the total | navigate /orders; take_snapshot; screenshot | evidence/01-orders.png | pass |
| 4 | the summary line is absent while the query is pending | navigate /orders with the response held; screenshot | evidence/02-orders-empty.png | pass |
| 5 | mutation: summary.test pins the cent rounding | broke the rounding line → suite red → restored; tree clean | vitest output | pass |
| 6 | perf: 5k orders in one request | — | Skip: the plan declared no perf recipe | skip |

## Notes
`/api` is served by nobody in this fixture's dev mode, so rows 3 and 4 drove the page with `window.fetch` stubbed through the adapter's `initScript`. Stated here rather than left to be inferred from a passing row.
