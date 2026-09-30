# Verify 1 — home-shift-wording (recovered from the run's stream)

`finish` deletes `verify.md` when it folds the outcome into `plan.md#Outcome`
(`finish.md` §3), so this table is lifted out of the arm's own `stream-json`
rather than read off disk. Row 6 is what the arm was bought for.

Verdict: FAIL · claims 11 · pass 7 · fail 1 · flaky 0 · pre-existing 0 · skip 3

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | T1: `/` renders the two links reading `Orders` and `Handover` in that order, hrefs unchanged at `/orders` and `/shift` | navigate `/`; `take_snapshot`; `evaluate` nav+links | snapshot: link 1 "Orders"→`/orders`, link 2 "Handover"→`/shift` · console: 0 errors · network: 0 failed · detectors: 0 hits · evidence/01-home.png | pass |
| 2 | T1: `npm test` is green | `npm test` | `Test Files 5 passed (5)` · `Tests 19 passed (19)` | pass |
| 3 | Verify plan — unit: T1's tests (recipe `unit`) | `npm test` | `Test Files 5 passed (5)` · `Tests 19 passed (19)` (same run as #2) | pass |
| 4 | Verify plan — ui: `/` — the two link texts as the page renders them (recipe `ui`) | navigate `/`; `take_snapshot` (same run as #1) | texts `["Orders","Handover"]` · evidence/01-home.png | pass |
| 5 | mutation: `HomePage.test.tsx` pins the label `'Handover'` | `HomePage.test.tsx:20` `'Handover'`→`'Handoff'`; `npm test`; restore; `git status --porcelain` | red: `offers both sections from one navigation landmark` failed (`expected ['Orders','Handover'] to deeply equal ['Orders','Handoff']`) → file restored → `git status --porcelain` empty | pass |
| 6 | *pin* · `verify.recipes[ui].checks[0]` on route `/` | navigate `/`; `evaluate` `() => {...texts: links.map(a=>a.textContent)...}` | expect `{"texts":["Orders","Shift handover"],...}` · returned `{"navLabel":"Sections","count":2,"texts":["Orders","Handover"],"hrefs":["/orders","/shift"]}` — the pin still names the wording this task replaced | fail · major |
| 7 | *attack* · route `/` — invalid input, permission denied, double submit | — | `/` has no form and no submit control (two links only) | skip: no form on the route |
| 8 | *attack* · route `/` — the network killed, then throttled | `emulate {networkConditions:"Offline"}`; reload; `emulate {networkConditions:"Slow 3G"}`; reload; `emulate` (reset) | Offline reload: browser interstitial (`ERR_INTERNET_DISCONNECTED`), 0 console errors, 1 request sent, snapshot answered · Slow 3G reload: snapshot shows `Orders`/`Handover` correctly, 0 console errors | pass |
| 9 | *attack* · route `/` — a back-and-forward round trip | navigate `/orders`; navigate `/`; `evaluate history.back()`; snapshot; `evaluate history.forward()`; snapshot | back → `/orders` snapshot correct; forward → `/` snapshot shows `Orders`/`Handover`; 0 console errors, 0 failed requests | pass |
| 10 | *console*/*network*/*detector* sweep · route `/orders` | navigate `/orders`; snapshot; screenshot; console; network; detectors collector→decide | console: 0 errors (1 non-error DevTools issue, "form field element should have an id or name attribute" — pre-existing `<select>`, unrelated to this diff) · network: 0 failed · detectors: 0 hits · evidence/02-orders.png | skip: not attacked — the diff does not reach this route |
| 11 | *console*/*network*/*detector* sweep · route `/orders/:id` (visited `/orders/o-1`) | navigate `/orders/o-1`; snapshot; screenshot; console; network; detectors collector→decide | console: 0 errors · network: 0 failed · detectors: 0 hits · evidence/03-order-detail.png | skip: not attacked — the diff does not reach this route |

## Claim feedback
- unfalsifiable: —
- redundant: 1 and 4 — both run the same `/` navigate+snapshot check; 2 and 3 — both run the same `npm test`
- absent: —

## Not covered
- matrix: routes 3 × states 0 × widths 0 → 3 rows, of 3 in the product
- skips: 7 — no form on the route; 10, 11 — not attacked: the diff does not reach this route
- residue: the first cross-feature interaction before a neighbor is pinned, aesthetics and product fit, and usability as a person means it
27
