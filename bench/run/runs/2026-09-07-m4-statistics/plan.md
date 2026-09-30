# Plan — detail-timing
Path: quick · Type: feature · Branch: feature/detail-timing · Campaign: — · Base: f034685

## Goal
An order's detail page says which order it is before its data arrives, so a reader who followed a link from the list is not looking at the word `Loading` alone.

## Non-goals
- The request and its cache. What `useQuery` does is somebody else's task.
- The order list.
- An error state for a bad id, which the page already renders through `role="alert"`.

## Decisions
| # | Question | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|
| D1 | Where does the pending heading come from? | A — the route parameter the page already reads (cons: it is an id and not a customer name, so the heading changes once the data lands) · B — the list's cached row through the query client (cons: it couples the detail page to the list's cache key and shows nothing on a cold load) | A, because the id is the one thing known before the request answers | A (user) |

## Design
### Modules
touched: `src/features/orders/ui/OrderDetailPage.tsx`, and a test beside it.
### Dependency direction
unchanged — `orders/ui` → `orders/api`, types and functions only.
### Interfaces
none new.
### Invariants & failure modes
- The pending state always names the id it is loading; an empty id renders the error surface the page already has rather than a heading with nothing in it.
- Failure mode unchanged: an error still renders through `role="alert"` with the message the request gave.
### Data & scale
One string per render. Nothing grows.
### Precedent
`src/features/orders/ui/OrderDetailPage.tsx:10` — the page already answers the pending state with its own element rather than rendering nothing.
### Refactor in scope
none.
### External APIs
none.
### Architecture alternatives
See D1: the route parameter against the list's cache.

## Tasks
### T1. The pending state names its order
Files: src/features/orders/ui/OrderDetailPage.tsx, src/features/orders/ui/OrderDetailPage.test.tsx
Acceptance: while the request is pending, `/orders/:id` renders a level-1 heading reading `Order <id>`; an empty id renders no heading; `npm test` is green.

## Verify plan
- unit: T1's tests (recipe `unit`)
- ui: /orders/:id — the route loads with no uncaught error in the console (recipe `ui`). The pending heading itself is T1's unit claim: it is one render apart from the request answering, and a browser row that caught it would be catching a moment
- perf: /orders reaches DOMContentLoaded inside 500 ms, read as the **median and p95 of five loads** (recipe `ui`, through the adapter's own navigation timing)

## Open questions
(empty at approval)

## Outcome
Review: ACCEPT after 0 fix passes (0 blocker / 0 major fixed / 0 minor open)
Verify: FAIL, accepted at the breaker — 13 claims, 3 skipped, 0/0/1 by severity, flaky 0, pre-existing 0; evidence/00-unit-test-run.txt, `npm test` 19 passed (5 files); evidence/09-perf-orders-dcl.txt, /orders DOMContentLoaded median 72.1 ms · p95 82.9 ms of five loads
Open minors: minor src/App.tsx:9 landmark-one-main — no `<main>` wraps the app on any of the three swept routes; app-wide, not introduced by this diff, left open by the developer's call at the fix pass and accepted at the breaker
Gaps: 1 — see ledger
