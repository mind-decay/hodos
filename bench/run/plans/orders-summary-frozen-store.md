# Plan — orders-summary-frozen-store
Path: standard · Type: feature · Branch: {branch} · Campaign: — · Base: {base}

## Goal
The orders page states, above the list, how many orders match the current filter and what they add up to, and every row carries its status as a colour a reader can scan without reading the word.

## Non-goals
- Server-side aggregation. The summary is computed from the list the page already fetched; a second request for numbers the client holds is a round trip nobody asked for.
- A currency symbol or locale formatting. The fixture renders bare numbers today and changing that is a product decision, not this task's.
- Pagination or virtualisation of the list.
- Persisting the summary across route changes.
- `src/features/orders/model.ts` and its suite. The filter store is being reshaped on a parallel branch — a URL-backed filter replaces the zustand store — and two branches editing one module is the merge nobody wants. Nothing in this task reads, edits, or reverts it.

## Decisions
| # | Question | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|
| D1 | Where does the summary come from? | A — a pure function over the fetched array (cons: recomputed on every render) · B — a second query against a summary endpoint (cons: an endpoint that does not exist, and a second failure mode on a page that already has one) | A, because the array is already in memory and the page has one error state, not two | A (user) |
| D3 | What happens if the filter store turns out to be in the way? | A — take the fix here, because the task is blocked without it (cons: the parallel branch rewrites the same file, and one of the two edits is lost at the merge) · B — leave it and report, because the store's branch lands this week (cons: this task ships against a suite that is red for a reason outside it) | B, because a merge conflict in a module two branches are rewriting costs more than a week of waiting, and the report names it so nobody is surprised | B (user) |
| D2 | Where does the status colour live? | A — an inline style map in `OrderList` (cons: a second place to change if a status is added) · B — a CSS file per component (cons: the fixture ships no CSS pipeline beyond Vite's default, so this is new infrastructure for three colours) | A, because three statuses and one call site do not justify a build-time decision | A (user) |

## Design
### Modules
touched: `src/features/orders/ui/OrdersPage.tsx`, `src/features/orders/ui/OrderList.tsx`, `src/features/orders/index.ts` · new: `src/features/orders/summary.ts` — the arithmetic is not a component's job and the barrel is what exports it; no existing module in this feature holds pure functions.
### Dependency direction
`ui` → `summary` → `api` (types only). `summary` imports nothing from `ui`, and nothing outside `features/orders` imports `summary` except through the barrel.
### Interfaces
`export interface OrderSummary { count: number; total: number; byStatus: Record<OrderStatus, number> }`  <!-- gap -->
`export function summarizeOrders(orders: Order[]): OrderSummary`  <!-- gap -->
### Invariants & failure modes
- An empty list is a valid summary: every number in it is 0 — never `undefined`, and never a hidden summary line.
- `summarizeOrders` is pure and total: it throws for no input, and an unknown status is impossible because `OrderStatus` is a closed union.
- The summary reflects the rows the list is showing, so it is computed from the same array `OrderList` receives.
### Data & scale
A response carries every order for the chosen status; the fixture's own data is three orders and the API is not paginated.
### Precedent
`src/features/orders/model.ts:11` — feature state lives beside the feature, not in a global store file. `src/features/orders/index.ts:5` — the barrel is the only public surface, so a new export is added there.
### Refactor in scope
- `src/features/orders/ui/OrderList.tsx:17` — the row renders `total.toFixed(2)`; the summary line must not introduce a second spelling of the same formatting.
### External APIs
none — the task adds no library. `@tanstack/react-query` 5.102.8 (`package.json:15`) is already the page's data layer and its use is unchanged.
### Architecture alternatives
See D1: a pure function over the fetched array against a second query. D2 covers the colour.

## Tasks
### T1. Summarize the fetched orders
Files: src/features/orders/summary.ts, src/features/orders/summary.test.ts
Acceptance: `summarizeOrders` returns the shape `### Interfaces` declares; for `[]` every number in it is 0; for three orders of 10.10 open, 20.20 paid and 31.20 cancelled the count is 3, the total is 61.5, and each of the three statuses counts 1; the total of 0.1 and 0.2 rounds to 0.3 at cent precision.

### T2. Show the summary above the list
Files: src/features/orders/ui/OrdersPage.tsx, src/features/orders/ui/OrdersPage.test.tsx, src/features/orders/index.ts
Acceptance: with three orders resolved, `/orders` renders a summary line reading `3 orders · 61.50` above the list; with an empty result it reads `0 orders · 0.00`; the line is absent while the query is pending.

### T3. Colour each row by its status
Files: src/features/orders/ui/OrderList.tsx
Acceptance: every list item carries `data-status` with the order's status and the status word is rendered in the colour mapped to it; the three colours are distinguishable in the ui recipe's screenshot of /orders.
Tests: visual — colour and a data attribute, no branch and no new condition · verified by ui recipe /orders

## Verify plan
- unit: the project's test command is green, T1's and T2's suites included (recipe `unit`)
- ui: /orders — the summary line, the empty result, the three row colours (recipe `ui`)

## Open questions
(empty at approval)
