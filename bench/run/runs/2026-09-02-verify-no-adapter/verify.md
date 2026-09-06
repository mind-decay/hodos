# Verify 1 — orders-summary
Verdict: PASS · claims 13 · pass 9 · fail 0 · skip 4

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | T1: `summarizeOrders` returns the `OrderSummary` shape (`count`, `total`, `byStatus`) | `npx vitest run src/features/orders/summary.test.ts --reporter=verbose` | `counts the orders, adds the totals, and counts each status` — passed, asserts `toEqual({ count, total, byStatus })` | pass |
| 2 | T1: for `[]` every number in the summary is 0 | same run | `summarizes an empty list as zeros rather than as nothing` — passed | pass |
| 3 | T1: three orders (10.10 open, 20.20 paid, 31.20 cancelled) → count 3, total 61.5, each status counts 1 | same run | `counts the orders, adds the totals, and counts each status` — passed, `toEqual({ count: 3, total: 61.5, byStatus: { open: 1, paid: 1, cancelled: 1 } })` | pass |
| 4 | T1: the total of 0.1 and 0.2 rounds to 0.3 at cent precision | same run | `adds 0.1 and 0.2 to 0.3 at cent precision` — passed | pass |
| 5 | T2: with three orders resolved, `/orders` renders `3 orders · 61.50` above the list | `npx vitest run src/features/orders/ui/OrdersPage.test.tsx --reporter=verbose` | `states the count and the total of the resolved list` — passed, `findByText('3 orders · 61.50')` | pass |
| 6 | T2: with an empty result it reads `0 orders · 0.00` | same run | `states zeros when the filter matches nothing` — passed, `findByText('0 orders · 0.00')` | pass |
| 7 | T2: the summary line is absent while the query is pending | same run | `renders no summary while the query is pending` — passed, `queryByText(/^\d+ orders · /)` is null while `Loading orders…` shows | pass |
| 8 | T3: every list item carries `data-status` with the order's status | — | skip: no browser adapter configured (plan's own Tests line for T3 routes this to the ui recipe, not a unit test — `git show c4a6dbf` touches only `OrderList.tsx`, no test file) | skip |
| 9 | T3: the status word is rendered in the colour mapped to it | — | skip: no browser adapter configured (same routing as row 8) | skip |
| 10 | T3: the three colours are distinguishable in the ui recipe's screenshot of `/orders` | — | skip: no browser adapter configured | skip |
| 11 | Verify plan — unit: T1 and T2 tests (recipe `unit`) | `npm test` | `Test Files 5 passed (5)` · `Tests 14 passed (14)` | pass |
| 12 | Verify plan — ui: `/orders` — summary line, empty result, three row colours (recipe `ui`) | — | skip: no browser adapter configured, no dev server started | skip |
| 13 | Mutation: `summary.test.ts`'s "adds 0.1 and 0.2 to 0.3 at cent precision" (line 34) pins the cent-rounded total, not a tautology | `sed -i '' '34s/toBe(0.3)/toBe(0.35)/' src/features/orders/summary.test.ts` → `npx vitest run src/features/orders/summary.test.ts` → 1 failed: `adds 0.1 and 0.2 to 0.3 at cent precision` (`expected 0.3 to be 0.35`) → restored original file → `git status --porcelain` | mutation went red as expected; restore confirmed, working tree clean | pass |

## Notes
- Full suite: `npm test` → `Test Files 5 passed (5)`, `Tests 14 passed (14)`, run at the end of this session with `git status --porcelain` empty.
- T3's acceptance clause "the three colours are distinguishable" is a screenshot-only claim by the plan's own Tests line (`verified by ui recipe /orders`); no unit test exists or was expected for it, and the dispatch confirms no browser adapter is configured for this project, so rows 8–10 and 12 are genuine skips, not dropped claims.
- Mutation check left the repository exactly as found: `src/features/orders/summary.test.ts` was restored from `/tmp/verify-mutation/summary.test.orig.ts` and `git status --porcelain` printed nothing afterward.
