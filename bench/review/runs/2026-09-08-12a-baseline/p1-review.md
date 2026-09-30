# Review 1 — p1
Verdict: REJECT · blockers 1 · majors 8 · minors 0

## Checks run
- test: `npm test` → 17 passed (4 files); no test file added by this diff
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → **1 error** (`src/features/orders/summary.ts:8:26` `no-restricted-globals`: "Unexpected use of 'fetch'. Call the network through request() in src/lib/http.ts")

## Spec
**Missing (blocker)**: T3's acceptance — "the line shows the count and the total for the current filter" — is met by nothing reachable. `OrdersSummary` (`src/features/orders/ui/OrdersSummary.tsx:9`) is rendered by no one: `src/features/orders/ui/OrdersPage.tsx:26` is unchanged and the component is absent from `src/features/orders/index.ts`. The task's own verification route, `ui recipe /orders`, has nothing to see; the diff changes no observable behaviour. T3's `Files:` list omits `OrdersPage.tsx`, a plan gap, but the criterion is still unmet.

**Missing (major, decision 0022)**: T2 claims no `Tests:` exemption and the diff adds no test declaration for `topByTotal` (`src/features/orders/model.ts:20`), although `src/features/orders/model.test.ts` sits beside it.

**Extra**: —

**Misunderstood (major, decision 0022)**: T3's `Tests: visual — one line of text and its numbers, no branch` is contradicted by `src/features/orders/ui/OrdersSummary.tsx:14`, `if (!orders.data) return null;` — a branch, and the very branch T3's second acceptance clause ("renders nothing before the data arrives") names. Logic under a `visual` exemption.

**Misunderstood**: `### Modules` names `summary.ts` as "the request the summary makes" and `### Dependency direction` has `ui/` importing it; `OrdersSummary.tsx:3` imports `listOrders` from `../api` instead, leaving T1's module with no caller.

**Unclaimed**: `OrdersSummary.tsx:14` — the `!orders.data` path is also the failure path (`isError` renders `null`); no `Acceptance:` clause names it. · `### Invariants & failure modes`, "A failed request leaves the list alone … the list's own error surface stays the one the page shows" — no `Acceptance:` clause names this clause. · `OrdersSummary.tsx:6` widens the feature's status from `StatusFilter` (`model.ts:5`) to `string`; no acceptance clause exercises a value outside the union.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/summary.ts:8 | lint (`no-restricted-globals`) | — | raw `fetch`, so `npm run lint` is red on this diff; the path is also `/api/orders`, double-prefixing what `request()` adds, and `status` is uninterpolated without `encodeURIComponent` | declare the call in `api.ts` as `request<Order[]>(`/orders?status=${encodeURIComponent(status)}`)` |
| major | src/features/orders/summary.ts:9 | rules/api-error-propagation.md | — | `(await response.json()) as Order[]` with no `ok` check: a non-OK envelope `{error:{code,message}}` is cast to `Order[]` instead of raising `ApiError`, so `status` and `code` are lost | route through `request()`, which throws `ApiError` on both halves of the failure surface |
| major | src/features/orders/summary.ts:7 | defaults #16 dead code (#8 helper with <2 callers) | — | `fetchSummaryOrders` has no caller anywhere in `src`; `OrdersSummary` calls `listOrders` | wire the summary to it per `### Modules`, or delete the module |
| major | src/features/orders/ui/OrdersSummary.tsx:11 | rules/query-key-factory.md | — | literal key array `['orders','summary',status]` written at the call site; `keys.summary` was added at `api.ts:20` — the `### Refactor in scope` edit — and is used by nobody | `queryKey: keys.summary(status)` |
| major | src/features/orders/model.ts:21 | L4 state mutation | `topByTotal(orders.data, n)` — the documented use ("the summary row above the list") passes TanStack Query's cached array, which `OrdersPage.tsx:26` still holds and renders | `orders.sort()` sorts the caller's array in place, reordering the cache entry and the list below it | `[...orders].sort(...)` |
| major | src/features/orders/summary.test.ts | CLAUDE.md conventions — "a test sits beside the file it covers" | — | the new module ships with no test beside it | add the file, stubbing `fetch` per rules/test-mocking-boundary.md |

## Coverage
The package header carries no `Mutation:` field and no `## Callers` section, so no recorded per-task count could be compared; the diff adds no test declarations, so there is nothing on the other side of that comparison either. One focused check outside the diff: `grep` for `OrdersSummary`, `fetchSummaryOrders`, `topByTotal` and `keys.summary` across `src/`, `dev-api.ts` and `vite.config.ts` — the four exported additions have no call site, which is what the blocker rests on. Not reviewed: `node_modules`, `package-lock.json`, and the frozen `eslint.config.js`. The `ui recipe /orders` browser check was not run — with nothing mounting the component there is nothing for it to assert.
