# Verify 1 — orders-summary
Verdict: PASS · claims 15 · pass 15 · fail 0 · skip 0

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | T1: `summarizeOrders` returns the shape `### Interfaces` declares | `npx vitest run --reporter=verbose` (summary.test.ts) | `✓ summarizeOrders > counts the orders, adds the totals, and counts each status` — returned `{count, total, byStatus}` matching `OrderSummary` | pass |
| 2 | T1: for `[]` every number in it is 0 | same run | `✓ summarizeOrders > summarizes an empty list as zeros rather than as nothing` — `{count:0, total:0, byStatus:{open:0,paid:0,cancelled:0}}` | pass |
| 3 | T1: for the three fixture orders, count is 3 | same run | `✓ counts the orders...` test asserts `count: 3` | pass |
| 4 | T1: the total is 61.5 | same run | `✓ counts the orders...` test asserts `total: 61.5` — pinned by mutation row 15 | pass |
| 5 | T1: each of the three statuses counts 1 | same run | `✓ counts the orders...` test asserts `byStatus:{open:1,paid:1,cancelled:1}` | pass |
| 6 | T1: 0.1 + 0.2 rounds to 0.3 at cent precision | same run | `✓ summarizeOrders > adds 0.1 and 0.2 to 0.3 at cent precision` | pass |
| 7 | T2: with three orders resolved, `/orders` renders `3 orders · 61.50` above the list | unit: same run; ui: navigate `/orders` (initScript stubs `fetch` → 3 orders), snapshot, screenshot | unit `✓ OrdersPage summary line > states the count and the total of the resolved list`; ui snapshot shows `"3" " orders · " "61.50"` above the `<li>` rows; `evidence/01-orders-resolved.png`; console/network clean | pass |
| 8 | T2: empty result reads `0 orders · 0.00` | unit: same run; ui: navigate `/orders` (initScript stubs `fetch` → `[]`), snapshot, screenshot | unit `✓ OrdersPage summary line > states zeros when the filter matches nothing`; ui snapshot shows `"0" " orders · " "0.00"` and "No orders match this filter."; `evidence/02-orders-empty.png`; console clean | pass |
| 9 | T2: the line is absent while the query is pending | unit: same run; ui: navigate `/orders` (initScript stubs `fetch` → never-resolving promise), snapshot, screenshot | unit `✓ OrdersPage summary line > renders no summary while the query is pending`; ui snapshot shows only "Loading orders…", no `orders ·` text; `evidence/03-orders-pending.png`; console clean | pass |
| 10 | T3: every list item carries `data-status` with the order's status | ui: `evaluate_script` reading `li[data-status]` on the resolved-state page | returned `[{"status":"open",...},{"status":"paid",...},{"status":"cancelled",...}]` — one per order, matching each order's status | pass |
| 11 | T3: the status word is rendered in the colour mapped to it | ui: `evaluate_script` reading `getComputedStyle(span).color` for each row | `rgb(26,127,55)` / `rgb(9,105,218)` / `rgb(207,34,46)` = `#1a7f37`/`#0969da`/`#cf222e`, the exact map in `OrderList.tsx` | pass |
| 12 | T3: the three colours are distinguishable in the ui recipe's screenshot of `/orders` | ui: `take_screenshot` of resolved `/orders` | `evidence/01-orders-resolved.png` shows green/blue/red status words; backed by the three distinct computed-style values in row 11 | pass |
| 13 | Verify plan: unit — T1 and T2 tests (recipe `unit`) | `npm test` | `Test Files 5 passed (5)` / `Tests 14 passed (14)` — see rows 1–9 for the T1/T2 tests by name | pass |
| 14 | Verify plan: ui — `/orders`: the summary line, the empty result, the three row colours (recipe `ui`) | navigate `/orders` in the three stubbed states; screenshot; `evaluate_script` for colour | `evidence/01-orders-resolved.png`, `evidence/02-orders-empty.png`; colour check in row 11 | pass |
| 15 | Mutation: `summary.test.ts` pins `total: 61.5` | `cp summary.test.ts $TMPDIR/...orig`; `sed -i '' '16s/total: 61.5,/total: 62.5,/'`; `npm test`; restore; `git status --porcelain` | 1 failed: `summary.test.ts > summarizeOrders > counts the orders, adds the totals, and counts each status` (expected 62.5, received 61.5); restored; `git status --porcelain` printed nothing | pass |

## Claim feedback
- unfalsifiable: —
- redundant: 13 and 14 — the Verify plan's `unit` line reruns the identical `npm test` that rows 1–9 already cite by test name, and its `ui` line revisits the identical `/orders` navigations and colour check that rows 7, 8, and 10–12 already cover
- absent: `src/features/orders/index.ts`'s new re-export of `OrderSummary`/`summarizeOrders` through the feature barrel (the plan's own Precedent: "the barrel is the only public surface") — every test reaches `summary.ts` by its direct relative path, so no claim exercises the barrel export itself
