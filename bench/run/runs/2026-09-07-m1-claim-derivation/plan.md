# Plan — refund-badge
Path: standard · Type: feature · Branch: feature/refund-badge · Campaign: — · Base: df62975

## Goal

The order detail page at `/orders/:id` (`src/App.tsx:11`) shows, beside the order's
customer, status and total, a badge naming the state of that order's refund —
requested, approved or declined. The state comes from a second read,
`GET /api/orders/:id/refund`, added to the orders feature's `api.ts` beside the two
reads already there. An order with no refund answers 404, and the page says
"No refund" as ordinary copy rather than as a failure. Any other refund failure —
a 500, a dead network — surfaces inline with `role="alert"` next to where the badge
would be, and the order the user navigated for stays on screen.

## Non-goals

- No refund mutation: nothing requests, approves or declines a refund. Read only.
- No refund on the list page, in `OrderList.tsx`, or in the `listOrders` payload.
- No `src/features/refunds/` feature (D2). The refund read lives in the orders feature.
- No shared test render helper in `src/test/` (D7), tempting because this is the first
  test to mount a query component; the helper stays local until a second caller exists.
- No change to `src/lib/http.ts` — `request()` is not widened with a 404-tolerant option (D3).
- No amendment to `.claude/rules/api-error-propagation.md`. The design obeys it as written.
- No dev-time `/api` stub, fixture server or MSW. `/api` 404s in dev on purpose (CLAUDE.md).
- No barrel export of the refund types (ruling: nothing outside the feature reads them).

## Decisions

| # | Question | Axis | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|---|
| D1 | Refund endpoint and payload shape — the repository names none (no `/api` server, no fixture) | — | A `GET /orders/:id/refund` → `{ status }`, 404 = absent (cons: a shape no server here confirms) · B same path, `{ status, amount, requestedAt }` (cons: two fields nothing renders and nothing can verify) · C a field on `GET /orders/:id` (cons: contradicts the stated 404 behavior; no second read at all) | A | A (user) |
| D2 | Where does the refund read live | module boundary | A inside the orders feature — `api.ts` gains `Refund`, `keys.refund`, `getRefund` (cons: the feature now owns two resources) · B a new `src/features/refunds/` feature imported through its barrel (cons: a new module and a cross-feature edge for one badge; widens the task) | A | A (user) |
| D3 | How does a 404 become "no refund" rather than an error | what fails and how | A no catch — the `ApiError` travels and `OrderDetailPage` narrows on `status === 404` (cons: the no-refund happy path sits in react-query's error state, and branching on `.status` is a pattern nothing in `src/` has today) · B catch → resolve `null`, which react-query treats as success (cons: literally the shape `.claude/rules/api-error-propagation.md:22-24` names as what it prevents) · C catch → a union carrying the `ApiError` (cons: a return shape neither `api.ts:22` nor `api.ts:25` has; a union unwrapped to render one badge) | A | A (user) |
| D4 | What the page shows for an order with no refund | what fails and how | A ordinary copy "No refund", no `role` (cons: none found — `.claude/rules/error-role-alert.md:22-24` names this exact case) · B render nothing (cons: absence and a broken read look identical, and `OrderList.tsx:10` does the opposite) | A | A (user) |
| D5 | Where a non-404 refund failure surfaces | what fails and how | A inline beside the badge with `role="alert"`, order details still rendered (cons: two error idioms on one page — early return for the order, inline for the refund) · B early return, whole page replaced, matching `OrderDetailPage.tsx:11` (cons: a failed refund read hides the order the user navigated for) | A | A (user) |
| D6 | Badge as its own component or inline JSX | module boundary | A a props-only `ui/RefundBadge.tsx` tested beside itself like `OrderList.tsx` (cons: one more file) · B inline in `OrderDetailPage.tsx` (cons: every status assertion then needs a mounted query and a test-local `QueryClient`) | A | A (user) |
| D7 | Where the query-component render wrapper lives | module boundary | A a local `renderPage` in `OrderDetailPage.test.tsx`, mirroring `OrderList.test.tsx:13-18` (cons: the next such test copies it, and a convention starts at two) · B a shared `src/test/` helper (cons: a new module imported from outside its directory, flipping checklist row 2 to `yes`, built on one caller) | A | A (user) |

Rulings recorded in the ledger: the refund types stay out of the barrel; the badge mounts
as a `dt`/`dd` pair inside the existing `dl`; the refund query repeats the `enabled` guard;
refund pending is inline copy with no role.

## Design

### Modules

- touched: `src/features/orders/api.ts` — gains `RefundStatus`, `Refund`, `keys.refund`, `getRefund`.
- touched: `src/features/orders/ui/OrderDetailPage.tsx` — gains the second query and the four render branches.
- new: `src/features/orders/ui/RefundBadge.tsx` — a props-only component. No existing module fits: `OrderList.tsx` renders a list of orders, and putting the status-to-text mapping in the page would make the three statuses unassertable without a mounted query (D6).
- new: `src/features/orders/ui/RefundBadge.test.tsx`, `src/features/orders/ui/OrderDetailPage.test.tsx` — a test beside the file it covers (CLAUDE.md).
- No new module in the checklist's sense: `RefundBadge.tsx` is imported only by `OrderDetailPage.tsx`, which sits in the same `ui/` directory.

### Dependency direction

`ui/OrderDetailPage.tsx` → `ui/RefundBadge.tsx` → `../api` (type only) → `../../lib/http` → `../../lib/errors`. No arrow points back out; `api.ts` learns nothing about the badge, and `src/lib` is unchanged.

### Interfaces

```ts
// src/features/orders/api.ts
export type RefundStatus = 'requested' | 'approved' | 'declined';
export interface Refund { status: RefundStatus }

keys.refund = (id: string) => [...keys.all, 'refund', id] as const;

export const getRefund = (id: string) =>
  request<Refund>(`/orders/${encodeURIComponent(id)}/refund`);

// src/features/orders/ui/RefundBadge.tsx
export function RefundBadge({ status }: { status: RefundStatus }): ReactElement;
```

`getRefund` is one line with the same shape as `getOrder` (`src/features/orders/api.ts:25`) — no catch, no options bag, no second return shape.

### Invariants & failure modes

- Invariant: the refund query key is built by `keys.refund` in `api.ts` and read off the factory by the page; no component writes a key array (`.claude/rules/query-key-factory.md:8-10`).
- Invariant: the refund read reaches the network only through `request<T>()`, so a failure arrives as an `ApiError` carrying `code` and `status`, unwrapped and un-rethrown (`.claude/rules/api-error-propagation.md:22-24`).
- Invariant: the order query's own pending and error early returns (`src/features/orders/ui/OrderDetailPage.tsx:10-11`) are unchanged — no refund outcome can blank the page.
- Postcondition: a refund read resolving `{ status: 'requested' }` renders the requested badge; `'approved'` renders the approved badge; `'declined'` renders the declined badge.
- Precondition: `getRefund` is never called with an empty id — the query is `enabled: id !== ''`, as the order query already is. Calling it with `''` would issue `GET /api/orders//refund`; instead no fetch is made and no badge region renders.
- Failure mode, absent: an `ApiError` with `status === 404` renders "No refund" as ordinary copy, with no `role="alert"` (`.claude/rules/error-role-alert.md:22-24`).
- Failure mode, real: any other `ApiError` — a 500 from the envelope, or the `code: 'network', status: 0` of `src/lib/http.ts:17` — renders `<p role="alert">` carrying `error.message`, inline, with the order's customer, status and total still on screen.
- Failure mode, not an `ApiError`: a rejection that fails the `instanceof` narrowing takes the alert path, not the absent path. Absence is claimed only by a 404.
- Failure mode, pending: while the refund read is in flight and the order has resolved, the badge region shows "Loading refund…" with no role.

States: badge | absent | alert | pending — not a type; enumerated by hand, since the page derives them from `isPending`, `isError` and an `instanceof` narrowing rather than from a union.

### Data & scale

One extra `GET` per order-detail view, returning a single object with one field — bytes, not kilobytes. Two requests per page view, both issued on mount, no waterfall between them: the refund query does not wait on the order query. `staleTime: 30_000` (`src/main.tsx:9`) means a revisit inside 30 seconds issues neither request. `retry: false` (`src/main.tsx:9`) means the 404 costs exactly one request, not four; a test-local `QueryClient` must repeat `retry: false` or it inherits the library's default of 3 with exponential backoff. No list, no loop, no unbounded growth: the refund cache holds one entry per order id visited.

### Precedent

- `src/features/orders/api.ts:22` and `src/features/orders/api.ts:25` — a request function is one line over `request<T>()`; `getRefund` is the third.
- `src/features/orders/api.ts:16-20` — the key factory; `keys.refund` is a fourth entry in the same shape.
- `src/features/orders/ui/OrdersPage.tsx:10` and `src/features/orders/ui/OrderDetailPage.tsx:8` — a feature component reads its data with `useQuery` and a key off the factory.
- `src/features/orders/ui/OrdersPage.tsx:25` and `src/features/orders/ui/OrderDetailPage.tsx:11` — an error surface is `<p role="alert">{error.message}</p>`.
- `src/features/orders/ui/OrderList.tsx:10` — a no-content state is ordinary copy with no role; the model for "No refund".
- `src/features/orders/ui/OrderList.tsx` with `src/features/orders/ui/OrderList.test.tsx:13-18` — a props-only component with a local render helper beside it; the model for `RefundBadge`.
- `src/lib/http.test.ts:15`, `src/lib/http.test.ts:33` and `src/lib/http.test.ts:9-11` — the network is stubbed by replacing global `fetch` per test and unstubbing after (`.claude/rules/test-mocking-boundary.md:9-10`).

Three things have **no** precedent and each is a decisions row above, not a quiet invention: rendering an absent state (D4), branching on an `ApiError`'s `status` (D3), and mounting a query-driven component under test (D7).

### Refactor in scope

none — the two files the tasks open, `src/features/orders/api.ts` and `src/features/orders/ui/OrderDetailPage.tsx`, carry no defect the research turned up: the key factory, the `request()` calls and the error surfaces already match their rules.

### External APIs

`@tanstack/react-query` → 5.102.8, from the lockfile (`package-lock.json:11`, resolved at `package-lock.json:750`) → the v5 `query-functions` and `testing` guides (https://tanstack.com/query/v5/docs/framework/react/guides/query-functions, https://tanstack.com/query/v5/docs/framework/react/guides/testing) → the plan uses `useQuery` with `enabled`, and relies on the documented fact that a test's own `QueryClient` needs `retry: false` because the library default is 3 retries with exponential backoff. The plan does **not** use the `null`-resolves-as-success mechanism from the same guide: D3 chose to let the `ApiError` travel instead.

### Architecture alternatives

See D3 (what fails and how — three real shapes for turning a 404 into absence), D5 (what fails and how — where a real failure surfaces), D6 and D7 (module boundary — what is a component, and where a test helper lives).

## Tasks

### T1. RefundBadge, the three statuses
Files: `src/features/orders/ui/RefundBadge.tsx`, `src/features/orders/ui/RefundBadge.test.tsx`
Acceptance: `npm test` green, with a test that renders the badge for each of `requested`, `approved` and `declined` and asserts each renders its own distinct text; the component takes `status: RefundStatus` as its only prop and needs no `QueryClientProvider` to mount.

### T2. The refund read, wired into the detail page
Files: `src/features/orders/api.ts`, `src/features/orders/ui/OrderDetailPage.tsx`, `src/features/orders/ui/OrderDetailPage.test.tsx`
Acceptance: `npm test` green, with a test that stubs global `fetch` to answer `/api/orders/o-1` with an order and `/api/orders/o-1/refund` with `{ status: 'approved' }`, then asserts the page shows both the order's customer and the approved badge; a second case asserts that with an empty route id `fetch` is not called at all; the refund query's key is `keys.refund('o-1')` read off the factory, asserted by comparing against the factory rather than a literal array; the test's own `QueryClient` sets `retry: false`.

### T3. Absence, failure and pending
Files: `src/features/orders/ui/OrderDetailPage.tsx`, `src/features/orders/ui/OrderDetailPage.test.tsx`
Acceptance: `npm test` green, with four cases — (a) the refund route answering 404 with the error envelope renders the text "No refund" and `queryByRole('alert')` is null; (b) the refund route answering 500 with `{ error: { code, message } }` renders an element with `role="alert"` carrying that `message` while the order's customer is still on screen; (c) `fetch` rejecting for the refund route renders `role="alert"` carrying "the request did not reach the server" from `src/lib/http.ts:17`, order still on screen; (d) with the refund response unresolved the page shows "Loading refund…" and the order's customer, and that element has no `role`.

## Verify plan

- unit: T1, T2, T3 tests — every claim above (recipe `unit`, `npm test`).
  - the three `RefundStatus` members: T1.
  - the postcondition (a resolved refund renders its badge) and the precondition (empty id issues no fetch): T2.
  - the 404 branch, the non-404 branch, the network branch and the pending branch: T3.
  - the key-factory invariant: T2's key assertion.
- ui: `/orders/:id` renders without a crash (recipe `ui`, route already in `config.verify.recipes`).
- **Missing layer — an `init` finding, not a task.** No claim about the badge, the absent copy or the inline alert can be reached in the browser: `/api` is served by nobody in dev (CLAUDE.md), so `/orders/:id` shows the order query's own error early return and the refund region never renders. `config.verify` declares `recipes` and no `layers`, so there is no layer that seeds `/api`. Every badge claim is therefore carried by the `unit` recipe alone, and the `ui` recipe proves only that the route still mounts.

## Open questions

None.
