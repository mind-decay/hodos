# Verify 2 — orders-summary
Verdict: FAIL · claims 24 · pass 18 · fail 3 · flaky 0 · pre-existing 0 · skip 3

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | T1 — `summarizeOrders` returns the shape `### Interfaces` declares | iteration 1 | `summary.ts:3-7` declares `{count, total, byStatus}`; all 3 `toEqual` assertions pin the exact shape — evidence/07-unit-verbose.txt | pass |
| 2 | T1 — for `[]` every number in it is 0 | iteration 1 | `✓ ... summarizes an empty list as zeros rather than as nothing` — evidence/07-unit-verbose.txt | pass |
| 3 | T1 — for three orders (10.10 open, 20.20 paid, 31.20 cancelled) the count is 3 | iteration 1 | `{count: 3, total: 61.5, byStatus: {open:1,paid:1,cancelled:1}}` — evidence/07-unit-verbose.txt | pass |
| 4 | T1 — the total is 61.5 | iteration 1 | see above | pass |
| 5 | T1 — each of the three statuses counts 1 | iteration 1 | see above | pass |
| 6 | T1 — the total of 0.1 and 0.2 rounds to 0.3 at cent precision | iteration 1 | `✓ ... adds 0.1 and 0.2 to 0.3 at cent precision` — evidence/07-unit-verbose.txt | pass |
| 7 | T2 — with three orders resolved, /orders renders a summary line reading "3 orders · 61.50" above the list | iteration 1 | `"3 orders · 61.50"` — evidence/02-orders.png | pass · pin |
| 8 | T2 — with an empty result it reads "0 orders · 0.00" | iteration 1 | snapshot text `"0" " orders · " "0.00"` — evidence/03-orders-empty.png | pass |
| 9 | T2 — the line is absent while the query is pending | iteration 1 | snapshot shows only `"Loading orders…"`, no summary text node — evidence/04-orders-pending.png | pass |
| 10 | T3 — every list item carries `data-status` with the order's status | iteration 1 | `["open","paid","cancelled"]` | pass |
| 11 | T3 — the status word is rendered in the colour mapped to it | iteration 1 | `{"open":"rgb(26, 127, 55)","paid":"rgb(9, 105, 218)","cancelled":"rgb(207, 34, 46)"}` matches `OrderList.tsx`'s `statusColour` map | pass |
| 12 | T3 — the three colours are distinguishable in the ui recipe's screenshot of /orders | iteration 1 | three distinct RGB values above, three distinct rendered colours — evidence/02-orders.png | pass |
| 13 | Verify plan — unit: T1 and T2 tests (recipe `unit`) | iteration 1 | `Test Files 6 passed (6)` · `Tests 23 passed (23)` — evidence/00-unit.txt | pass |
| 14 | Verify plan — ui: /orders — the summary line, the empty result, the three row colours (recipe `ui`) | iteration 1 | see rows 7-12 | pass |
| 15 | mutation: `summary.test.ts` pins the total (61.5) for the three-order case | iteration 1 | 1 failed: `summarizeOrders > counts the orders, adds the totals, and counts each status` (expected 61.6, received 61.5), 22 passed → file restored, tree clean — evidence/11-mutation.txt | pass |
| 16 | *added* — `/`: swept, not attacked | iteration 1 | `0 hits` — evidence/01-home.png | skip: not attacked — the diff does not reach this route |
| 17 | *added* — `/orders/:id`: swept, not attacked | iteration 1 | `0 hits` — evidence/05-order-detail.png, evidence/09-detect-orders-id.json | skip: not attacked — the diff does not reach this route |
| 18 | *added* — `/orders`: attacks 1 (invalid input), 2 (permission denied), 4 (double submit) | iteration 1 | — (attack 3, network killed/throttled, and attack 5, back-and-forward, were run instead and passed cleanly) | skip: no form on the route |
| 19 | *added* — `/orders`: detector hit | source *detector* · navigate `/orders`; `evaluate` `detectors.mjs source`'s collector; `detectors.mjs decide` | `0 hits` — `OrdersPage.tsx`'s summary `<p>` no longer carries the fixed 80px/`overflow:hidden` box (fix commit `668a206`); the snapshot shows the full, unclipped text `"3" " orders · " "61.50"` — evidence/12-detect-orders-collect.json, evidence/12-detect-orders.json, evidence/13-orders-fixed.png | pass |
| 20 | *added* — `/shift`: attack 1 (invalid input in every field, then submit) | source *attack* · navigate `/shift`; snapshot (0 fillable fields); `click` "Save handover" | `list_network_requests` shows only the page's own document/module requests, no request to `/api/handover` (the `save()` handler and its `request()` call were removed from `ShiftPage.tsx` in `668a206`); `list_console_messages` shows only vite/React-DevTools debug/info lines, no error; snapshot still answers — evidence/14-shift-fixed.png | pass |
| 21 | *added* — `/shift`: attack 4 (a double submit) | source *attack* · `click` "Save handover" twice with no wait between the calls | `list_network_requests` after both clicks: "No requests found" — zero requests for two clicks, since the button now carries no `onClick`; `list_console_messages` unchanged, no error; snapshot still answers | pass |
| 22 | *added* — `/shift`: detector hit | iteration 1 | `overflow`: the banner (`div[6]`) is 352px wider than its box (`overflow-x: visible`) — evidence/06-shift.png, evidence/10-detect-shift.json | fail · minor |
| 23 | *added* — `/shift`: detector hit | iteration 1 | `clipped`: the notes box (`div[8]`) has text cut 34px short (`overflow-y: hidden`, no ellipsis) — evidence/06-shift.png, evidence/10-detect-shift.json | fail · minor |
| 24 | *added* — `/shift`: detector hit | iteration 1 | `overlap`: "Save handover" (`button[10]`) overlaps "Discard" (`button[11]`) by 20×20px | fail · major |

## Claim feedback
- unfalsifiable: —
- redundant: 13 duplicates 1–6 (the same `npm test` run cited again); 14 duplicates 7–12 (the same `/orders` browser sweep cited again)
- absent: the `.claude/hodos/config.json` change adding `/shift` to the `ui` recipe's `routes` (still present in this diff — `ShiftPage.tsx` itself is back to its base shape after fix commit `668a206`, so this line is now the only reason `/shift` is still swept) is in no claim anywhere in the plan, which never mentions `/shift`; the sweep this line still authorizes is what surfaces rows 22-24

## Not covered
- matrix: routes 4 × states 1 × widths 1 → 4 rows, of 4 in the product
- skips: 16 — not attacked: the diff does not reach `/`; 17 — not attacked: the diff does not reach `/orders/:id`; 18 — no form on the route (`/orders` attacks 1, 2, 4)
- residue: the first cross-feature interaction before a neighbor is pinned, aesthetics and product fit, and usability as a person means it
