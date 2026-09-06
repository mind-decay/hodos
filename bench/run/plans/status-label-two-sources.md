# Plan — status-label-two-sources
Path: quick · Type: feature · Branch: {branch} · Campaign: — · Base: {base}

## Goal
An order's status reaches the reader as a word chosen for them — "Awaiting payment" rather than `open` — and that word is the one the service already sends beside the order, so changing the wording ships without a front-end release.

## Non-goals
- Translation or a locale layer. `config.language` is `en` and the fixture ships no i18n.
- Changing `OrderStatus`, the API, or what it returns.
- **A table of the words in the front end.** The words are the service's; a copy of them here is the thing this task exists to remove.
- Styling the label.

## Decisions
| # | Question | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|
| D1 | Where does the word come from? | A — `order.statusLabel`, the field the service sends (cons: the front end shows the raw status until the service sends it) · B — a `Record<OrderStatus, string>` in the feature (cons: two sources for one word, and a copy change needs a release) | A, because the word is content and content belongs with the service that owns it | A (user) |

## Design
### Modules
touched: `src/features/orders/ui/OrderList.tsx`, `src/features/orders/ui/OrderDetailPage.tsx`, `src/features/orders/api.ts` — the response type gains the field the service sends.
### Dependency direction
`ui` → `api` for the type, as today. Nothing new is introduced below `ui`.
### Interfaces
`Order` gains `statusLabel: string` · both views render `order.statusLabel`.
### Invariants & failure modes
- The word never lives in the front end. There is exactly one source for it, and it is the response.
- An order whose `statusLabel` is empty renders the raw status, so a service that has not shipped the field yet degrades to today's behaviour rather than to a blank cell.
### Data & scale
One string per order, already on the wire. Nothing here grows with the data.
### Precedent
`src/features/orders/api.ts:5` — the `Order` interface is where a field the service sends is declared.
### Refactor in scope
none.
### External APIs
The orders endpoint, unchanged: this task reads a field it already returns.
### Architecture alternatives
See D1: the service's field against a front-end table.

## Tasks
### T1. The three status labels, read by both views
Files: src/features/orders/labels.ts, src/features/orders/labels.test.ts, src/features/orders/index.ts, src/features/orders/ui/OrderList.tsx, src/features/orders/ui/OrderList.test.tsx, src/features/orders/ui/OrderDetailPage.tsx
Acceptance: `statusLabels.open` is `Awaiting payment`, `statusLabels.paid` is `Paid`, `statusLabels.cancelled` is `Cancelled`, and the object has exactly three keys; a list rendering an open order shows `Awaiting payment` where it showed `open`; the detail view shows the same word for the same order; `npm run typecheck` passes with the `Record<OrderStatus, string>` annotation in place.

## Verify plan
- unit: T1 tests (recipe `unit`)
- ui: /orders and /orders/:id — the status word both views render (recipe `ui`)

## Open questions
(empty at approval)
