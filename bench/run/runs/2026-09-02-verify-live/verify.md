# Verify 1 — orders-summary
Verdict: PASS · claims 12 · pass 12 · fail 0 · skip 0

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | T1: `summarizeOrders` returns the shape `### Interfaces` declares (`{ count, total, byStatus }`) | `npx vitest run --reporter=verbose src/features/orders/summary.test.ts` | evidence/unit-verbose.txt — `summarizeOrders > counts the orders, adds the totals, and counts each status` asserts `toEqual({ count, total, byStatus })` and passed | pass |
| 2 | T1: for `[]` every number in the summary is 0 | same run | evidence/unit-verbose.txt — `summarizes an empty list as zeros rather than as nothing` passed | pass |
| 3 | T1: for three orders (10.10 open, 20.20 paid, 31.20 cancelled) count is 3, total is 61.5, each status counts 1 | same run | evidence/unit-verbose.txt — `counts the orders, adds the totals, and counts each status` passed | pass |
| 4 | T1: total of 0.1 and 0.2 rounds to 0.3 at cent precision | same run + mutation check (row 12 below) | evidence/unit-verbose.txt — `adds 0.1 and 0.2 to 0.3 at cent precision` passed; mutating the pinned `0.3` to `0.4` turned it red, restore turned it green again | pass |
| 5 | T2: with three orders resolved, `/orders` renders a summary line reading `3 orders · 61.50` above the list | navigate `http://localhost:5173/orders` with `window.fetch` stubbed (initScript) to resolve the three-order fixture → snapshot → screenshot | evidence/01-orders-three.png; snapshot showed `StaticText "3"`, `" orders · "`, `"61.50"` positioned before the `<ul>` items; no console errors on this navigation | pass |
| 6 | T2: with an empty result the line reads `0 orders · 0.00` | navigate `/orders` with `window.fetch` stubbed to resolve `[]` → snapshot → screenshot | evidence/02-orders-empty.png; snapshot showed `"0"`, `" orders · "`, `"0.00"` and `"No orders match this filter."`; no console errors | pass |
| 7 | T2: the summary line is absent while the query is pending | `npx vitest run --reporter=verbose src/features/orders/ui/OrdersPage.test.tsx` (unit recipe; verify plan scopes the ui/browser recipe to the summary line, empty result and row colours only, not the pending state) | evidence/unit-verbose.txt — `renders no summary while the query is pending` passed, asserting `screen.queryByText(/^\d+ orders · /)` is null while `Loading orders…` renders | pass |
| 8 | T3: every list item carries `data-status` with the order's status | `evaluate_script` on the three-order `/orders` page: `document.querySelectorAll('li[data-status]')` mapped to `{dataStatus, statusText}` | returned `[{"dataStatus":"open","statusText":"open"},{"dataStatus":"paid","statusText":"paid"},{"dataStatus":"cancelled","statusText":"cancelled"}]` — one `data-status` per row, matching its status | pass |
| 9 | T3: the status word is rendered in the colour mapped to it | same `evaluate_script` call, reading `getComputedStyle(...).color` of each status `<span>` | `open` → `rgb(26, 127, 55)`, `paid` → `rgb(9, 105, 218)`, `cancelled` → `rgb(207, 34, 46)` — matches `OrderList.tsx`'s `statusColour` map (`#1a7f37`/`#0969da`/`#cf222e`) | pass |
| 10 | T3: the three colours are distinguishable in the ui recipe's screenshot of `/orders` | screenshot of the three-order `/orders` page | evidence/01-orders-three.png — green "open", blue "paid", red "cancelled" are visually distinct | pass |
| 11 | Verify plan: unit — T1 and T2 tests (recipe `unit`) | `npm test` (full suite) | evidence/unit-run.txt — `Test Files 5 passed (5)`, `Tests 14 passed (14)`, includes all 3 summary.test.ts and 3 OrdersPage.test.tsx cases | pass |
| 12 | Verify plan: ui — `/orders`: the summary line, the empty result, the three row colours (recipe `ui`) | navigations + snapshots + screenshots + `evaluate_script`, rows 5, 6, 8, 9, 10 above | evidence/01-orders-three.png, evidence/02-orders-empty.png | pass |

## Mutation check (T1, `summary.test.ts:34`)
```
cp src/features/orders/summary.test.ts "$TMPDIR/summary.test.orig.ts"
sed -i '' '34s/0\.3/0.4/' src/features/orders/summary.test.ts
npx vitest run --reporter=verbose src/features/orders/summary.test.ts
#  × summarizeOrders > adds 0.1 and 0.2 to 0.3 at cent precision
#    → expected 0.3 to be 0.4
cp "$TMPDIR/summary.test.orig.ts" src/features/orders/summary.test.ts
git status --porcelain   # empty
```
The pinned literal at `summary.test.ts:34` (`expect(summarizeOrders(pennies).total).toBe(0.3)`) is load-bearing: breaking it turns the suite red, and the restore left the tree clean.

## Notes
- The dev API is not served (`/api` 404s by project convention), so both `/orders` navigations stubbed `window.fetch` via the browser adapter's `initScript`, mirroring the same boundary the unit tests stub — no project module was mocked to make a claim true.
- A `favicon.ico` 404 and one "form field element should have an id or name" a11y issue appeared in the console on the first navigation; both are pre-existing (no `<link rel="icon">` in `index.html`, and the `<select>` predates this task) and unrelated to any claim in this task's diff.
