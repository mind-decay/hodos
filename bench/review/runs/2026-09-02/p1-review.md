# Review 1 — p1
Verdict: REJECT · blockers 1 · majors 5 · minors 1

## Checks run
- test: `npm test` → 8 passed (3 files); no test was added by this diff
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → **1 error** — `src/features/orders/summary.ts:8:26` `no-restricted-globals`: "Unexpected use of 'fetch'. Call the network through request() in src/lib/http.ts". The gate was green on 2026-08-31 (CLAUDE.md); this diff turns it red.

## Spec
Missing: T3's acceptance — "the line shows the count and the total for the current filter" — is unmet. `OrdersSummary` has no consumer: `src/features/orders/ui/OrdersPage.tsx` and `src/features/orders/index.ts` are untouched and nothing in `src` renders the component (grep over `src`: the only hits are its own declaration). Nothing appears on `/orders`, so the task's `verified by ui recipe /orders` cannot exercise it either. T2's `topByTotal` likewise has no caller.

Misunderstood (major): the design's Interfaces and Dependency direction put `fetchSummaryOrders` behind the summary and have `ui/` import `summary.ts`. `src/features/orders/ui/OrdersSummary.tsx:3` imports `listOrders` from `../api` instead, so T1's module is never reached, and the component issues the list's own request under a second key — the identical collection cached twice, with `keys.list` invalidation leaving the summary entry stale. That is the opposite of the "summary holds while the list is paging" reason the plan gave for a separate request.

Misunderstood (major, decision 0022): T3's `Tests: visual — one line of text and its numbers, no branch`. The diff contradicts the exemption — `OrdersSummary.tsx:14` is a branch (`if (!orders.data) return null`) and `:15` is a `reduce` over the payload. Both are logic, and neither is covered by any test.

Extra: —

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/features/orders/summary.ts:8 | rules/network-through-request.md + lint | — | raw `fetch`, the project's only permitted one being `src/lib/http.ts:12`; `npm run lint` exits non-zero on it. The literal `/api/orders` also re-adds the prefix `request()` owns, and interpolates `status` without the `encodeURIComponent` `listOrders` applies | delete the module and call `listOrders(status)`, or `request<Order[]>(\`/orders?status=${encodeURIComponent(status)}\`)` |
| major | src/features/orders/summary.ts:9 | rules/api-error-propagation.md | — | no `response.ok` check: a non-OK response is parsed and cast to `Order[]`, so the server envelope `{ error: { code, message } }` is returned as data and no `ApiError` is ever raised. `/api` 404s on purpose (CLAUDE.md), which is exactly this path | route through `request()`, which raises `ApiError` on both failure halves |
| major | src/features/orders/ui/OrdersSummary.tsx:11 | rules/query-key-factory.md | — | literal key array at the call site, while `keys.summary` was added for it at `src/features/orders/api.ts:20` and is unused | `queryKey: keys.summary(status)` |
| major | src/features/orders/model.ts:21 | L4 state-mutation hazard | called with an array the caller still holds — the design's intended argument is the summary query's `data`, the same cached `Order[]` `OrderList` renders from (`OrdersPage.tsx:26`) | `orders.sort(...)` sorts in place, reordering the caller's array and the TanStack Query cache entry; the list silently re-renders in total order | `[...orders].sort((a, b) => b.total - a.total).slice(0, count)` |
| major | src/features/orders/summary.ts:7 | defaults #16 (dead code dies in this pass) | — | `fetchSummaryOrders` has zero callers in `src`; the module ships unreachable | wire it into `OrdersSummary` per the design, or drop the file |
| minor | src/features/orders/model.test.ts | CLAUDE.md — "a test sits beside the file it covers" | — | `topByTotal` is new exported logic in `model.ts`; the test file beside it still covers only the store | add cases for ordering, `count` beyond the list length, and that the input array is not reordered |

## Coverage
Not reviewed: `eslint.config.js` and `package-lock.json` (frozen by project decision, and untouched by the diff). The `ui` browser recipe on `/orders` was not run — no route mounts `OrdersSummary`, so it has nothing to observe. One check was made outside the diff: a grep across `src` for consumers of `OrdersSummary`, `fetchSummaryOrders` and `topByTotal`, which returned only their own declarations.
