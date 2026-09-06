# Verify 1 — orders-summary · env: local
Verdict: PASS · claims 15 · pass 11 · fail 0 · skip 4

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | T1: `summarizeOrders` returns the shape `### Interfaces` declares | `npx vitest run summary.test.ts` (recipe `unit`) | `summarizeOrders > counts the orders, adds the totals, and counts each status` passed — asserts `toEqual({ count, total, byStatus })` against the exact interface shape | pass |
| 2 | T1: for `[]` every number in it is 0 | `npx vitest run summary.test.ts` | `summarizeOrders > summarizes an empty list as zeros rather than as nothing` passed | pass |
| 3 | T1: for three orders (10.10 open, 20.20 paid, 31.20 cancelled) the count is 3 | `npx vitest run summary.test.ts` | same test as #1: `count: 3` asserted and passed | pass |
| 4 | T1: the total is 61.5 | `npx vitest run summary.test.ts` | same test as #1: `total: 61.5` asserted and passed | pass |
| 5 | T1: each of the three statuses counts 1 | `npx vitest run summary.test.ts` | same test as #1: `byStatus: { open: 1, paid: 1, cancelled: 1 }` asserted and passed | pass |
| 6 | T1: the total of 0.1 and 0.2 rounds to 0.3 at cent precision | `npx vitest run summary.test.ts` | `summarizeOrders > adds 0.1 and 0.2 to 0.3 at cent precision` passed | pass |
| 7 | T2: with three orders resolved, `/orders` renders a summary line reading `3 orders · 61.50` above the list | `npx vitest run OrdersPage.test.tsx` (recipe `unit`) | `OrdersPage summary line > states the count and the total of the resolved list` passed — `findByText('3 orders · 61.50')` resolved | pass |
| 8 | T2: with an empty result it reads `0 orders · 0.00` | `npx vitest run OrdersPage.test.tsx` | `OrdersPage summary line > states zeros when the filter matches nothing` passed — `findByText('0 orders · 0.00')` resolved | pass |
| 9 | T2: the line is absent while the query is pending | `npx vitest run OrdersPage.test.tsx` | `OrdersPage summary line > renders no summary while the query is pending` passed — `queryByText(/^\d+ orders · /)` is null while `Loading orders…` shows | pass |
| 10 | T3: every list item carries `data-status` with the order's status | ui recipe: navigate `/orders`, snapshot | skip: environment not up — hosts, access declined (browser layer down; no unit test covers this by the plan's own `Tests:` line) | skip |
| 11 | T3: the status word is rendered in the colour mapped to it | ui recipe: navigate `/orders`, screenshot | skip: environment not up — hosts, access declined | skip |
| 12 | T3: the three colours are distinguishable in the ui recipe's screenshot of `/orders` | ui recipe: screenshot `/orders` | skip: environment not up — hosts, access declined | skip |
| 13 | Verify plan: unit — T1 and T2 tests (recipe `unit`) | `npm test` | `Test Files 5 passed (5)` · `Tests 14 passed (14)` | pass |
| 14 | Verify plan: ui — `/orders`: summary line, empty result, three row colours (recipe `ui`) | browser recipe, routes `/`, `/orders`, `/orders/:id` | skip: environment not up — hosts, access declined | skip |
| 15 | Mutation: `summary.test.ts` pins the total (61.5) the T1 test asserts | mutated `summary.test.ts:16` `total: 61.5,` → `total: 99,`; ran `npx vitest run summary.test.ts` → 1 failed: `summarizeOrders > counts the orders, adds the totals, and counts each status`; restored from backup; `git status --porcelain` printed only the pre-existing `.claude/hodos/config.json` change | failing-test name captured above; file restored byte-identical (`diff` empty); tree clean of the mutation | pass |
