# Verify 1 — orders-summary
Verdict: FAIL · claims 15 · pass 9 · fail 2 · skip 4

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | T1: `summarizeOrders` returns the shape `### Interfaces` declares | `npx vitest run src/features/orders/summary.test.ts -t "counts the orders, adds the totals, and counts each status"` | 1 passed — resolves to `{count, total, byStatus}` | pass |
| 2 | T1: for `[]` every number in it is 0 | `npx vitest run src/features/orders/summary.test.ts -t "summarizes an empty list as zeros rather than as nothing"` | 1 passed — `{count:0, total:0, byStatus:{open:0,paid:0,cancelled:0}}` | pass |
| 3 | T1: three orders (10.10 open, 20.20 paid, 31.20 cancelled) — count is 3 | same run as #1 | 1 passed — `count: 3` | pass |
| 4 | T1: three orders — the total is 61.5 | same run as #1 | 1 passed — `total: 61.5` | pass |
| 5 | T1: three orders — each of the three statuses counts 1 | same run as #1 | 1 passed — `byStatus: {open:1, paid:1, cancelled:1}` | pass |
| 6 | T1: the total of 0.1 and 0.2 rounds to 0.3 at cent precision | `npx vitest run src/features/orders/summary.test.ts -t "adds 0.1 and 0.2 to 0.3 at cent precision"` | 1 failed — `AssertionError: expected 0.3 to be 0.4` (`summary.test.ts:34` asserts `.toBe(0.4)`); the code returns 0.3 but the checked-in test pins 0.4, so the recipe's own check of this claim is red | fail |
| 7 | T2: with three orders resolved, `/orders` renders `3 orders · 61.50` above the list | `npx vitest run src/features/orders/ui/OrdersPage.test.tsx -t "states the count and the total of the resolved list"` | 1 passed — found text `3 orders · 61.50` | pass |
| 8 | T2: with an empty result it reads `0 orders · 0.00` | `npx vitest run src/features/orders/ui/OrdersPage.test.tsx -t "states zeros when the filter matches nothing"` | 1 passed — found text `0 orders · 0.00` | pass |
| 9 | T2: the line is absent while the query is pending | `npx vitest run src/features/orders/ui/OrdersPage.test.tsx -t "renders no summary while the query is pending"` | 1 passed — `Loading orders…` shown, no `/^\d+ orders · /` text | pass |
| 10 | T3: every list item carries `data-status` with the order's status | — | skip: not run — unit red | skip |
| 11 | T3: the status word is rendered in the colour mapped to it | — | skip: not run — unit red | skip |
| 12 | T3: the three colours are distinguishable in the ui recipe's screenshot of /orders | — | skip: not run — unit red | skip |
| 13 | Verify plan: unit — T1 and T2 tests (recipe `unit`) | `npm test` | exit 1 — `Test Files 1 failed \| 4 passed (5)`, `Tests 1 failed \| 13 passed (14)` | fail |
| 14 | Verify plan: ui — /orders: the summary line, the empty result, the three row colours (recipe `ui`) | — | skip: not run — unit red | skip |
| 15 | mutation: `summary.test.ts` pins the three-order total (61.5) | `sed` `total: 61.5` → `61.6` at `summary.test.ts:16` → `npx vitest run src/features/orders/summary.test.ts` → restored → `git status --porcelain` | new failure `summarizeOrders > counts the orders, adds the totals, and counts each status`: `expected 61.5 to be 61.6`; file restored; `git status --porcelain` printed nothing | pass |

## Claim feedback
- unfalsifiable: —
- redundant: 13 — repeats, as one aggregate line, exactly what 1–9 already establish test-by-test from the same `npm test` run
- absent: the `{ width: 80, whiteSpace: 'nowrap', overflow: 'hidden' }` style the diff adds to the summary line's `<p>` (`OrdersPage.tsx`, new in this diff) — no claim names it, and the skipped `ui` recipe (row 14) was the row that would have caught it clipping `3 orders · 61.50` at 80px

## Not covered
- matrix: not run — the browser sweep never started (`unit` red gates it before stage 3), so no routes × states × widths were resolved
- skips: 10, 11, 12, 14 — not run: unit red
- residue: the first cross-feature interaction before a neighbor is pinned, aesthetics and product fit, and usability as a person means it
