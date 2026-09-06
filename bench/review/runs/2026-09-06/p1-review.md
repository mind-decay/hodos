# Review 1 — p1
Verdict: REJECT · blockers 1 · majors 8 · minors 1

## Checks run
- test: `npm test` → 3 files, 8 passed (no test touches the diff)
- typecheck: `npm run typecheck` → 0 errors (exit 0)
- lint: `npm run lint` → **exit 1**, 1 error: `src/features/orders/summary.ts:8` `no-restricted-globals` — "Unexpected use of 'fetch'. Call the network through request() in src/lib/http.ts"

## Spec
**Missing** — T3 acceptance ("the line shows the count and the total for the current filter"): `OrdersSummary` is never mounted. `src/features/orders/ui/OrdersPage.tsx` is untouched (still renders only the select, states and `OrderList`) and `src/features/orders/index.ts` does not export it; `grep -rn OrdersSummary src` finds only its own file. The `ui` recipe on `/orders` can observe nothing (major).

**Misunderstood** — T1: the plan's `### Modules` and `### Dependency direction` put the summary's request in `summary.ts` with `ui/` importing it. `OrdersSummary.tsx:12` calls `listOrders` instead, so `fetchSummaryOrders` ships with zero callers: T1's module is a dead parallel path to an endpoint `api.ts` already reaches (major).

**Misunderstood** — T3's `Tests: visual — one line of text and its numbers, no branch`: the diff contradicts the exemption. `OrdersSummary.tsx:14` is a branch (`if (!orders.data) return null;`) and `:15` is an aggregation over the response. Under decision 0022 this is not `visual`; it needs a test (major).

**Extra** — none. T2's helper was ordered by the plan; that it has no caller is below.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/features/orders/summary.ts:8 | lint `no-restricted-globals` (exit 1) · rules/network-through-request.md | — | raw `fetch`, hand-written `/api` prefix, `status` uninterpolated without `encodeURIComponent`; the repo's lint gate is red at HEAD | `request<Order[]>(`/orders?status=${encodeURIComponent(status)}`)` — or delete the module |
| major | src/features/orders/summary.ts:9 | rules/api-error-propagation.md | — | a non-OK response is `json()`-parsed and cast to `Order[]`: no `ApiError`, no `status`/`code`; the 404 envelope becomes a fake order list | go through `request()`, which throws `ApiError` |
| major | src/features/orders/ui/OrdersSummary.tsx:11 | rules/query-key-factory.md | — | literal `['orders','summary',status]` at the call site while `keys.summary` was added in the same diff | `queryKey: keys.summary(status)` |
| major | src/features/orders/model.ts:21 | L4 state mutation | called on `orders.data` from the `keys.list(status)` query — the plan's stated use | `orders.sort()` mutates the caller's array; TanStack Query's cached array is reordered in place and `OrderList` re-renders in a different order | `[...orders].sort(...)` |
| major | src/features/orders/summary.test.ts | project convention "a test sits beside the file it covers" · decision 0022 | — | `fetchSummaryOrders` ships untested; T1 claims no exemption | test it against a stubbed `fetch`, or delete the module and its test with it |
| major | src/features/orders/model.ts:20 | decision 0022 test-first (T2 has no `Tests:` line) | — | `topByTotal` adds ordering + slicing logic; `model.test.ts` covers only the store | add cases (largest-first, `count` shorter than input, no mutation) and prove by mutation |
| minor | src/features/orders/api.ts:20 | defaults #16 dead code | — | `keys.summary` has no caller — the component wrote the literal instead | resolved by the `keys.summary(status)` fix above |

Not raised: the absent error surface in `OrdersSummary`. The plan's `### Invariants & failure modes` says a failed summary request leaves the page's own error surface alone, so `rules/error-role-alert.md` has no error text here to govern.

## Coverage
Reviewed: the four diffed files against the plan, `.claude/rules/*.md` and `defaults.md`. One check outside the diff: `grep -rn "OrdersSummary\|fetchSummaryOrders\|topByTotal\|keys.summary" src` plus `OrdersPage.tsx` and `index.ts`, to establish that all four new exports are uncalled. Not reviewed: `node_modules`, `package-lock.json`, `eslint.config.js` (frozen by project decision), and the browser `ui` recipe on `/orders` — not runnable here, and moot while nothing mounts the component.
