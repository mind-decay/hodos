# Review 1 — p1
Verdict: NEEDS_WORK · blockers 0 · majors 8 · minors 0

## Checks run
- test: `npm test` → 17 passed (4 files); head commit adds no test file, so this is the base suite unchanged
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → **1 error** — `src/features/orders/summary.ts:8` `no-restricted-globals`: "Unexpected use of 'fetch'. Call the network through request() in src/lib/http.ts"

## Spec
**Missing:** T3's acceptance — "the line shows the count and the total for the current filter" — is met by no path: `OrdersSummary` is rendered nowhere. `grep -rn OrdersSummary src` returns only its own file; `OrdersPage.tsx:12-27` does not mount it and `index.ts:5-9` does not export it, so the `ui` recipe at `/orders` cannot see the line. T2's `topByTotal` likewise has no caller.

**Extra:** —

**Misunderstood:** Design/Modules and Interfaces make `summary.ts` "the request the summary makes" (`fetchSummaryOrders`); the component instead calls `listOrders` (`OrdersSummary.tsx:3,12`), leaving T1's module unwired at `summary.ts:7`.

**T3 `Tests:` exemption — major (decision 0022):** the line claims "visual … no branch", but `OrdersSummary.tsx:14` adds `if (!orders.data) return null;` — a branch, and the one T3's own acceptance names ("renders nothing before the data arrives"). The exemption does not hold; the branch is untested.

**Unclaimed:** the failure half of that same branch (`OrdersSummary.tsx:14`) — `data` is undefined because the request threw, not because it is pending — is in no `Acceptance:` clause. The invariant "A failed request leaves the list alone … the list's own error surface stays the one the page shows" is named by no task's acceptance criterion either.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/summary.ts:8 | lint `no-restricted-globals` | — | raw `fetch`, hard-coded `/api` prefix, un-encoded `status`; the lint gate is red | `request<Order[]>(`/orders?status=${encodeURIComponent(status)}`)` |
| major | src/features/orders/summary.ts:9 | rules/api-error-propagation.md | — | a non-OK response is parsed and cast to `Order[]`, so the `{error:{code,message}}` envelope becomes data — no `ApiError`, no `status`/`code` | go through `request()`, which throws `ApiError` |
| major | src/features/orders/model.ts:21 | L4 state mutation | any caller passing the list query's array, as the design's "reads the same collection as the list" intends: `orders.data` is reordered in place and `OrderList` then renders in total order | `orders.sort()` mutates its argument | `[...orders].sort(...)` |
| major | src/features/orders/ui/OrdersSummary.tsx:11 | rules/query-key-factory.md | — | literal `['orders','summary',status]` at the call site, while `keys.summary` added by this diff at `api.ts:20` has no reader | `queryKey: keys.summary(status)` |
| major | src/features/orders/summary.ts:7 | defaults row 17 (dead code), row 8 (≥2 callers) | — | `fetchSummaryOrders` has no caller anywhere | wire it into `OrdersSummary` or delete the module |
| major | src/features/orders/summary.test.ts | CLAUDE.md "a test sits beside the file it covers" | — | T1 claims no `Tests:` exemption and the file has no test beside it | add the test, `fetch` stubbed per rules/test-mocking-boundary.md |
| major | src/features/orders/model.ts:20 | plan T2 (no `Tests:` exemption) · decision 0022 | — | `topByTotal` ships untested; `model.test.ts` is untouched and the suite is still 17 | cover "largest first", `count` truncation, and that the input is not reordered |

## Coverage
Not reviewed: `dev-api.ts`, `vite.config.ts`, `src/lib/**` and the other features — untouched by this diff. The `ui` verify recipe (`/orders`) was not run: no browser here, and per the Spec finding above the summary line cannot render at that route regardless. The package carries no `## Callers` section, consistent with the grep above finding no caller for any of the three new exports.
