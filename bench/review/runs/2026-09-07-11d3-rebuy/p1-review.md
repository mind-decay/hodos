# Review 1 — p1
Verdict: REJECT · blockers 1 · majors 6 · minors 1

## Checks run
- test: `npm test` → 8 passed (3 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → FAILED, exit 1: 1 error — `src/features/orders/summary.ts:8:26` `no-restricted-globals` "Unexpected use of 'fetch'. Call the network through request() in src/lib/http.ts"

## Spec
**Missing:** T3's acceptance — "the line shows the count and the total for the current filter" — is unmet: `OrdersSummary` is mounted nowhere. `OrdersPage.tsx` is not in the diff and no file outside the two new ones references `OrdersSummary` (grep over `src/`), so `/orders` renders exactly what it rendered before and the `ui` recipe at `/orders` has nothing to verify. T1's acceptance is unreached for the same reason: `fetchSummaryOrders` has no caller.

**Extra:** — (`keys.summary` is the `### Refactor in scope` entry).

**Misunderstood:** —

**Tests exemption (decision 0022, major):** T3 declares `Tests: visual — one line of text and its numbers, no branch`, and the diff contradicts it. `src/features/orders/ui/OrdersSummary.tsx:14` is a branch — `if (!orders.data) return null` — and it is what T3's own second acceptance clause ("renders nothing before the data arrives") asserts. Under the `visual` exemption no test exists for it, and the `ui` recipe cannot reach a component that is never mounted.

**Unclaimed:**
- The failure path of that branch, `OrdersSummary.tsx:14`: the query's error state falls into the same `return null`. No `Acceptance:` clause names what the summary does when its request fails.
- `### Invariants & failure modes`, clause 2 — "A failed request leaves the list alone… the list's own error surface stays the one the page shows" — is named by no `Acceptance:` clause of T1–T3.
- `OrdersSummaryProps.status: string` at `OrdersSummary.tsx:6` widens the page's `StatusFilter` (`model.ts:5`) to any string; no acceptance clause names a value outside the four.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/features/orders/summary.ts:8 | lint `no-restricted-globals` · rules/network-through-request.md | — | raw `fetch` in feature code turns the project's lint gate red; `src/lib/http.ts:12` is meant to hold the only `fetch` | `request<Order[]>(`/orders?status=${encodeURIComponent(status)}`)`, per api.ts:23-24 |
| major | src/features/orders/summary.ts:9 | rules/api-error-propagation.md | — | no `response.ok` check: a non-OK body — the `{ error: { code, message } }` envelope — is cast to `Order[]` and no `ApiError` is ever raised, so status and code are lost (`/api` 404s by design) | route through `request()`, which throws `ApiError.fromResponse` (http.ts:19) |
| major | src/features/orders/ui/OrdersSummary.tsx:11 | rules/query-key-factory.md | — | literal key array `['orders','summary',status]` written at the call site while the factory entry added at api.ts:20 goes unused | `queryKey: keys.summary(status)` |
| major | src/features/orders/model.ts:21 | L4 state-mutation hazard | `topByTotal(orders.data, 3)` — the array the doc comment intends, held by the query cache and by `OrderList` | `sort()` reorders the caller's array in place; the list re-renders largest-first without asking | `[...orders].sort(...)` |
| major | src/features/orders/ui/OrdersSummary.tsx:12 | plan `### Modules` / `### Dependency direction` | — | ui calls `listOrders`, not the summary's own request, so `summary.ts` — all of T1 — has zero callers; the design has `ui/` importing `summary.ts` | call `fetchSummaryOrders`, itself made a `request()` call, or record the deviation and delete `summary.ts` |
| major | src/features/orders/summary.test.ts | decision 0022 test-first · CLAUDE.md "a test sits beside the file it covers" | — | T1 claims no exemption and has no test; the module parses and casts a response body | add the test, failing first, with `fetch` stubbed per rules/test-mocking-boundary.md |
| major | src/features/orders/model.ts:20 | decision 0022 test-first | — | T2 claims no exemption; `model.test.ts` has no case for `topByTotal`, so "largest first" and `count` are unproven | add cases to `model.test.ts` — ties, `count` > length, empty — and prove them by mutation |
| minor | src/features/orders/model.ts:20 | defaults #16 dead code · #8 helper with ≥2 callers | — | `topByTotal` has no caller: T3's line shows a count and a total, never a ranking | consume it in the summary or drop it with T2 |

## Coverage
Not reviewed: the `ui` verify recipe (`/orders`, browser) was not run — no browser here, and `OrdersSummary` is mounted nowhere, so there is nothing on the route to look at. `package-lock.json`, pinned versions and `eslint.config.js` are untouched by the diff and were read only to confirm that. Outside the diff I read `api.ts`, `model.ts`, `model.test.ts`, `index.ts`, `OrdersPage.tsx`, `OrderList.tsx` and `lib/http.ts` for the caller and precedent questions; nothing else in the tree was inspected. The package carried no `## Callers` section.
