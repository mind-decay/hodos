# Verify 1 — orders-summary
Verdict: PASS · claims 16 · pass 10 · fail 0 · skip 6

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | T1: `summarizeOrders` returns the shape `OrderSummary` declares (`count`, `total`, `byStatus`) | `npm test` | evidence/01-npm-test.txt: `summarizeOrders > counts the orders, adds the totals, and counts each status` ✓, `summarizes an empty list as zeros rather than as nothing` ✓ — both assert the full `{count,total,byStatus}` shape via `toEqual` | pass |
| 2 | T1: for `[]` every number in the summary is 0 | `npm test` | evidence/01-npm-test.txt: `summarizeOrders > summarizes an empty list as zeros rather than as nothing` ✓ | pass |
| 3 | T1: for the three-order fixture, count is 3 | `npm test` | evidence/01-npm-test.txt: `summarizeOrders > counts the orders, adds the totals, and counts each status` ✓ (asserts `count: 3`) | pass |
| 4 | T1: for the three-order fixture, total is 61.5 | `npm test` | evidence/01-npm-test.txt: same test ✓ (asserts `total: 61.5`); confirmed as the value that fails under mutation (row 16) | pass |
| 5 | T1: for the three-order fixture, each of the three statuses counts 1 | `npm test` | evidence/01-npm-test.txt: same test ✓ (asserts `byStatus: {open:1,paid:1,cancelled:1}`) | pass |
| 6 | T1: the total of 0.1 and 0.2 rounds to 0.3 at cent precision | `npm test` | evidence/01-npm-test.txt: `summarizeOrders > adds 0.1 and 0.2 to 0.3 at cent precision` ✓ | pass |
| 7 | T2: with three orders resolved, `/orders` renders a summary line reading `3 orders · 61.50` | `npm test` | evidence/01-npm-test.txt: `OrdersPage summary line > states the count and the total of the resolved list` ✓ (`findByText('3 orders · 61.50')`) | pass |
| 8 | T2: the summary line renders above the list (visual position) | — | skip: no browser adapter configured — position/layout is a browser-recipe (`ui`) claim, and the dispatch reports no adapter | skip |
| 9 | T2: with an empty result the line reads `0 orders · 0.00` | `npm test` | evidence/01-npm-test.txt: `OrdersPage summary line > states zeros when the filter matches nothing` ✓ | pass |
| 10 | T2: the summary line is absent while the query is pending | `npm test` | evidence/01-npm-test.txt: `OrdersPage summary line > renders no summary while the query is pending` ✓ | pass |
| 11 | T3: every list item carries `data-status` with the order's status | — | skip: no browser adapter configured — plan's own Tests line for T3 designates this "visual — colour and a data attribute … verified by ui recipe /orders"; no unit test exercises it (`OrderList.test.tsx` covers row count and link href only, not `data-status`) | skip |
| 12 | T3: the status word is rendered in the colour mapped to it | — | skip: no browser adapter configured — same T3 Tests line, ui-recipe only | skip |
| 13 | T3: the three colours are distinguishable in the ui recipe's screenshot of /orders | — | skip: no browser adapter configured | skip |
| 14 | Verify plan: unit recipe covers T1 and T2 tests | `npm test` | evidence/01-npm-test.txt: `Test Files 5 passed (5)`, `Tests 14 passed (14)`, exit 0 — includes `summary.test.ts` (T1) and `OrdersPage.test.tsx` (T2) | pass |
| 15 | Verify plan: ui recipe checks /orders — summary line, empty result, three row colours | — | skip: no browser adapter configured (dispatch: "browser claims are skip: no browser adapter configured", no base URL) | skip |
| 16 | Mutation: `summary.test.ts` pins `total: 61.5` for the three-order fixture | sed -i change `61.5`→`61.4` on line 16 of `src/features/orders/summary.test.ts`, ran `npm test`, restored file, ran `git status --porcelain` | evidence/02-mutation-run.txt: `summarizeOrders > counts the orders, adds the totals, and counts each status` → FAIL (`expected total: 61.5 to deeply equal 61.4`); file restored; `git status --porcelain` printed nothing | pass |

## Notes
- `git status --porcelain` is empty after the mutation check (verified above and again just before writing this file).
- Rows 8, 11, 12, 13, 15 are skipped for the same underlying reason: the dispatch states no browser adapter is configured and no dev server is running, so the `ui` recipe (and any acceptance clause the plan explicitly assigns to it — T2's "above the list" position, and all of T3, whose own Tests line reads "verified by ui recipe /orders") cannot be run this iteration. Nothing in the unit suite substitutes for them, so no row was marked pass on inferred evidence.
