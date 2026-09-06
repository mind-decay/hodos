# Review 1 — p1
Verdict: NEEDS_WORK · blockers 0 · majors 5 · minors 2

## Checks run
- test: `npm test` → 8 passed (3 files); no test added by this diff
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → **1 error** (`src/features/orders/summary.ts:8` no-restricted-globals — "Call the network through request() in src/lib/http.ts")

## Spec
Missing: T3 acceptance "the line shows the count and the total for the current filter" — nothing mounts `<OrdersSummary />`. `grep -rn OrdersSummary src/` returns only its own declaration; `OrdersPage.tsx` is untouched by the diff, so `/orders` renders exactly as before and the task's `verified by ui recipe /orders` has nothing to observe. T1's `fetchSummaryOrders` and T2's `topByTotal` likewise have zero callers.

Extra: —

Misunderstood: T3 — `OrdersSummary.tsx:3,12` calls `listOrders` from `api.ts`. The design's `### Dependency direction` ("`ui/` imports `summary.ts` and `model.ts`") and `### Interfaces` (`fetchSummaryOrders`) name `summary.ts` as the component's request; the plan's own `### Architecture alternatives` records reusing the list query as *declined*. The diff implements the declined alternative and leaves T1 dead.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/summary.ts:8 | lint (`no-restricted-globals`) | — | raw `fetch`; the lint check is red on this diff | call `request<Order[]>('/orders?status=…')` |
| major | src/features/orders/summary.ts:9 | rules/api-error-propagation.md | — | no `response.ok` check: a failed response is parsed and returned as `Order[]`, so the `{error:{code,message}}` envelope reaches callers as data and no `ApiError` is ever raised (`/api` 404s by project design, per CLAUDE.md) | go through `request()`, which throws `ApiError` on both failure paths (`src/lib/http.ts:17-19`) |
| major | src/features/orders/ui/OrdersSummary.tsx:11 | rules/query-key-factory.md | — | literal `['orders','summary',status]` written at the call site, while `api.ts:20` added `keys.summary` in the same diff and no one uses it | `queryKey: keys.summary(status)` |
| major | src/features/orders/model.ts:21 | L4 state mutation | the plan's `ui/` caller passes the query result — `topByTotal(orders.data, n)` — which is TanStack Query's cached array | `sort()` reorders the argument in place; the cache entry `keys.list(status)` is left permanently re-ordered and `OrderList` re-renders in ranked, not server, order | `[...orders].sort(...)` |
| major | src/features/orders/ui/OrdersSummary.tsx:13 | plan T3 `Tests:` (decision 0022) | — | `Tests: visual — … no branch` claims the exemption, but the diff adds `if (!orders.data) return null` — the very branch the acceptance criterion names ("renders nothing before the data arrives"), and it also swallows the error state | cover the pending/loaded branch in a test beside the component, or drop the `visual` claim |
| minor | src/features/orders/summary.ts:8 | rules/network-through-request.md | — | `status` interpolated raw, unlike `api.ts:24` | `encodeURIComponent(status)` |
| minor | src/features/orders/model.ts:20 | CLAUDE.md conventions | — | new exported logic in `model.ts` with no case in the adjacent `model.test.ts` | add a `topByTotal` case (ties, `count` > length) |

## Coverage
Not reviewed: the browser `ui` recipe on `/`, `/orders`, `/orders/:id` was not run — no dev server started, so the rendered summary line is unverified beyond the mount check above. `eslint.config.js`, `package-lock.json` and the pinned versions are frozen by project decision and were read only, not judged. Files outside the diff were opened for one named risk each (the mount site, the key factory, `request()`); the rest of `src` is unchanged and out of scope.
