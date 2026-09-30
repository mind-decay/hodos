# Verify 1 — home-shift-link
Verdict: FAIL · claims 12 · pass 6 · fail 2 · flaky 1 · pre-existing 0 · skip 3

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | T1: `/` renders a navigation landmark holding exactly two links, reading `Orders` and `Shift handover` in that order, whose hrefs are `/orders` and `/shift` | `npm test` (recipe `unit`) — `src/features/home/ui/HomePage.test.tsx` | `HomePage > offers both sections from one navigation landmark` ✓, `HomePage > points each link at the path the router declares` ✓ — nav role `navigation` name `Sections`; links `['Orders','Shift handover']`; hrefs `/orders`, `/shift` | pass |
| 2 | T1: `npm test` is green | `npm test` | `Test Files  4 passed (4)` · `Tests  10 passed (10)` | pass |
| 3 | Verify plan — unit: T1's tests (recipe `unit`) | `npm test` — `HomePage.test.tsx` only | `Test Files  1 passed (1)` · `Tests  2 passed (2)` | pass |
| 4 | Verify plan — ui: `/` — the navigation landmark's two link texts, read in the page (recipe `ui`) | navigate `/`; snapshot; screenshot; console; network — retried once (reload) | 1st load: snapshot showed `navigation "Sections"` → `link "Orders"`, `link "Shift handover"` (correct), but console had `[error] Failed to load resource: 404 (favicon.ico)` and network showed `GET /favicon.ico [404]` · evidence/01-home.png. Retry (reload): same correct snapshot, 0 console messages, 0 failed requests | flaky |
| 5 | mutation: `HomePage.test.tsx:25` pins the `Orders` link's href to `/orders` | `cp` orig → `sed` line 25 `/orders`→`/wrong` → `npm test` → restore | mutant run: `FAIL … points each link at the path the router declares` — `AssertionError: expected '/orders' to be '/wrong'` (1 failed, 9 passed) → restored → `Tests 10 passed (10)` → `git status --porcelain` empty | pass |
| 6 | *source console/network* — console error and failed request on `/orders` (swept, not claimed) | navigate `/orders`; snapshot; console; network; detectors | snapshot renders filter + `alert` "Not Found" correctly; console `[error] Failed to load resource: 404`; network `GET /api/orders?status=all [404]`; detectors: 0 hits, 0 allowed · evidence/02-orders.png | fail · major |
| 7 | *source console/network* — console error and failed request on `/orders/:id` (swept, not claimed) | navigate `/orders/o-1`; snapshot; console; network; detectors | snapshot renders early-return `alert` "Not Found"; console `[error] Failed to load resource: 404`; network `GET /api/orders/o-1 [404]`; detectors: 0 hits, 0 allowed · evidence/03-order-detail.png | fail · major |
| 8 | *source attack* — invalid input / permission denied / double submit, route `/` | attempted on `/` | `/` has no form and no submit control (two `Link`s only) | skip: no form on the route |
| 9 | *source attack* — network killed, then throttled, route `/` | `emulate {networkConditions:"Offline"}` → reload → snapshot/console (browser's own `chrome-error://` offline page, no app exception) → `emulate {"Slow 3G"}` → reload `/` → snapshot/console/network (renders correctly, 0 console messages, all requests 200/304) → `emulate` (throttling cleared) | no uncaught exception, no console error, no unhandled rejection, no 5xx, snapshot answered both times | pass |
| 10 | *source attack* — back-and-forward round trip, route `/` | on `/`: navigate to `/orders`; `evaluate history.back()`; snapshot; `evaluate history.forward()`; snapshot | back → `/` re-rendered the landmark and both links correctly, 0 console messages; forward → landed on `/orders` (reproduces row 6's known 404, not a new defect); no crash on `/`'s own leg | pass |
| 11 | *source attack* — surface check, route `/orders` | diff resolves to `src/features/home/ui/HomePage.tsx` and its test only (`git diff --name-only 067854c..HEAD`); `/orders` renders `OrdersPage`, not touched | — | skip: not attacked — the diff does not reach this route |
| 12 | *source attack* — surface check, route `/orders/:id` | same diff check; `/orders/:id` renders `OrderDetailPage`, not touched | — | skip: not attacked — the diff does not reach this route |

## Claim feedback
- unfalsifiable: —
- redundant: 2, 3 — both run `npm test` against the same state with no predicate beyond "green"; row 3 names no assertion row 1 doesn't already cover
- absent: —

## Not covered
- matrix: routes 3 → 3 rows, of 3 in the product
- skips: 8 — no form on the route; 11, 12 — not attacked: the diff does not reach this route
- residue: the first cross-feature interaction before a neighbor is pinned, aesthetics and product fit, and usability as a person means it
