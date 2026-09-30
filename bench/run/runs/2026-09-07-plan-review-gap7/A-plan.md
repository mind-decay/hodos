# Plan — refund-badge
Path: deep · Type: feature · Branch: feature/refund-badge · Campaign: — · Base: 06a150b

## Goal
The order detail page says where a refund has got to, for the orders that have one, and says nothing at all for the orders that do not.

## Non-goals
- Asking for a refund, approving one, or declining one. This task reads the state; it never writes it.
- The list page. A badge per row is a second layout question and is not this task.
- Any change to `src/features/orders/refund.ts`. The state and its label exist; this task consumes them.
- A new dependency, and any change to `src/lib/http.ts`.

## Decisions
| # | Question | Axis | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|---|
| D1 | Where does the refund query live? | module boundary | A — its own hook `useRefund(orderId)` beside the page (cons: one more file for one query) · B — a second `useQuery` inside `OrderDetailPage` (cons: the page then holds two queries and two error surfaces, and the 404 rule has to be written where the order's own error handling already is, which is how a 404 on the refund becomes an error on the order) | A, because the 404 rule belongs to the refund and not to the page | A (user) |
| D2 | How is the 404 read? | what fails and how | A — `useRefund` maps 404 to `{ refund: null }` and rethrows every other status (cons: the hook now knows one status code by number) · B — the page checks the error's status (cons: the page learns the transport, and the rule is repeated at every future caller) | A, because "no refund" is a state of the domain and not a failure of the request | A (user) |

## Design
### Modules
new: `src/features/orders/ui/useRefund.ts` — the query and the 404 rule · `src/features/orders/ui/RefundBadge.tsx` — the badge itself. touched: `src/features/orders/ui/OrderDetailPage.tsx` (renders the badge), `src/features/orders/api.ts` (the query key).
### Dependency direction
`OrderDetailPage.tsx` → `RefundBadge.tsx` → `useRefund.ts` → `api.ts` → `lib/http.ts`. Nothing in `lib/` learns about refunds, and `refund.ts` imports none of them.
### Interfaces
`useRefund(orderId: string): { refund: Refund | null; pending: boolean }` · `<RefundBadge orderId={id} />` · `keys.refund(id: string)` in `api.ts`.
### Invariants & failure modes
- **Postcondition:** for an order that has a refund, the badge's text is `refundLabel(refund.state)` and nothing else.
- **Postcondition:** for an order with no refund — the 404 — the page renders no badge element at all.
- **Invariant:** the badge never renders a state the API did not answer with; `RefundState` is the only source of its text.
- **Precondition:** `useRefund` is called with the id the page is already showing; called with an empty id it makes no request and answers `{ refund: null, pending: false }`.
- **Failure mode:** any status other than 200 and 404 propagates as the query's error, and the page's existing error surface is what shows it. A refund request that fails must not blank the order.
### Data & scale
One refund per order, one request per detail view. Nothing here iterates.
### Precedent
`src/features/orders/ui/OrderDetailPage.tsx:11` for a query in a component; `src/features/orders/api.ts:16` for where a key is built; `src/lib/http.ts:9` for the client.
### Refactor in scope
`api.ts`'s key factory gains `refund`. Nothing else moves.
### External APIs
TanStack Query v5 `useQuery`, at the version the lockfile pins.
### Architecture alternatives
D1 above: the hook against a second query inside the page, differing on the module boundary — where the 404 rule lives, and therefore which component has to know a status code.

## Tasks
### T1. The refund query and its 404 rule
Files: `src/features/orders/ui/useRefund.ts`, `src/features/orders/ui/useRefund.test.ts`, `src/features/orders/api.ts`
Acceptance: `useRefund` answers `{ refund, pending: false }` for a 200 and `{ refund: null, pending: false }` for a 404; a 500 leaves the query in its error state; called with an empty id it makes no request.
### T2. The badge
Files: `src/features/orders/ui/RefundBadge.tsx`, `src/features/orders/ui/RefundBadge.test.tsx`
Acceptance: the badge reads "Refund requested" for a refund whose state is `requested`; it reads "Refund approved" for one whose state is `approved`; it renders nothing when `useRefund` answers `{ refund: null }`.
### T3. The badge on the page
Files: `src/features/orders/ui/OrderDetailPage.tsx`, `src/features/orders/ui/OrderDetailPage.test.tsx`
Acceptance: the detail page for an order with a refund shows the badge above the total; the page for an order with none renders the same page it renders today, with no empty element where the badge would be.

## Verify plan
- unit: T1, T2 and T3 tests (recipe `unit`)
- ui: /orders/:id — the badge for a requested refund, the badge for an approved one, and the page for an order with no refund (recipe `ui`)

## Open questions
none
