# Review 1 — p6
Verdict: NEEDS_WORK · blockers 0 · majors 10 · minors 1

## Checks run
- test: `npm test` → 17 passed (4 files); no test file added by this diff
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems (green only because of the inline disable at `src/features/orders/ui/OrderRefresh.tsx:9`)

## Spec
Missing: T2's acceptance — `useOrdersByStatus.ts:10-12` has no ordering guard, so two quick status changes can leave the earlier status' rows.

Extra: `src/lib/http.ts:11-12,17,22-23` — `AbortController` + 8 s timeout, named by no task; `src/features/orders/api.ts:22` — the `limit = 25` parameter, named by no task.

Misunderstood: T1 — "pressing it reloads the orders" is built as a private, unfiltered `/api/orders` copy feeding only the button's own count (`OrderRefresh.tsx:6,10`); nothing on the page reloads. Invalidating `keys.all` also satisfies the design's "works before the list query has been created".

Unclaimed: the abort/timeout failure path added at `src/lib/http.ts:12` — no `Acceptance:` clause names it; it surfaces at `:21` as `ApiError('network', 0, 'the request did not reach the server')`, a message that is wrong for a request that did arrive.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/ui/OrderRefresh.tsx:10 | rules/network-through-request.md | — | raw `fetch('/api/orders')` in feature code, with `// eslint-disable-next-line no-restricted-globals` at :9 suppressing the project's only check | call `listOrders()`; delete the disable |
| major | src/features/orders/ui/OrderRefresh.tsx:11 | rules/api-error-propagation.md | `/api/orders?status=bogus` → dev-api 400 `{error:{…}}`; or an HTML error page | `response.ok` unchecked and no rejection path: the envelope is cast to `Order[]` so `orders.length` is `undefined` ("Refresh ()"), a non-JSON body rejects `refresh()` unhandled, and no `role="alert"` surface exists | route through `request()`; render `error.message` with `role="alert"` |
| major | src/features/orders/ui/useOrdersByStatus.ts:11 | L7 concurrency and async | status goes open→paid while the open request is in flight and resolves last | no cancellation or ignore flag; the stale response wins the last `setOrders`, breaking the plan's stated invariant | `useQuery({ queryKey: keys.list(status), queryFn: () => listOrders(status) })`, or an ignore flag in the effect cleanup |
| major | src/features/orders/ui/useOrdersByStatus.ts:11 | rules/api-error-propagation.md | `listOrders('bogus')` → `request()` throws `ApiError` | `.then(setOrders)` has no rejection handler: the `ApiError` becomes an unhandled rejection and the `Order[]` return can express no error | carry the error out of the hook (a query result), or raise a `Gap:` against the plan's fixed `Order[]` interface |
| major | src/features/orders/ui/useOrdersByStatus.ts:10 | plan `### Precedent` (`OrdersPage.tsx:10`) | — | server state hand-rolled in `useState`+`useEffect` here and at `OrderRefresh.tsx:6`, against the named precedent and CLAUDE.md ("server state is TanStack Query") | fetch through `useQuery` as the list page does |
| major | src/features/orders/api.ts:22 | plan `### Non-goals` + `### Data & scale` | `OrdersPage.tsx:10` calls `listOrders(status)` and now sends `&limit=25` against the design's "few hundred rows" | the default cap changes what the existing list renders — a stated non-goal | drop the parameter |
| major | src/features/orders/api.ts:22 | rules/query-key-factory.md | — | the query function now reads a second variable, `limit`, that `keys.list(status)` does not carry, so two limits share one cache entry | add it to the factory first, or drop the parameter |
| major | src/lib/http.ts:11 | plan `### Refactor in scope` + `### Non-goals` | — | the shared client's behaviour changed, which the plan barred "in either direction" and the non-goals name outright; the timer is also cleared before `response.json()` at :26, so a slow body is never covered | revert; `src/lib` was allowed a comment only |
| major | src/features/orders/ui/OrderRefresh.test.tsx | CLAUDE.md conventions ("a test sits beside the file it covers") | — | new component with a click handler, no test; the diff adds no test declarations at all | add it, `fetch` stubbed per rules/test-mocking-boundary.md |
| major | src/features/orders/ui/useOrdersByStatus.test.ts | CLAUDE.md conventions ("a test sits beside the file it covers") | — | the hook carries T2's whole acceptance (two status changes in flight) and is untested | add it |
| minor | src/lib/http.ts:17 | L1 shadow override | a caller passing `request(path, { signal })` | `signal` sits before `...init`, so a caller's `init` silently drops the timeout signal (as `headers` is already dropped) | spread `init` first, then set `signal` |

## Coverage
Mutation counts: — (no `Mutation:` header in the package and no `.claude/hodos/ledger.md`), so per-task test counts could not be compared; the record may exist and be unreadable.

Cannot verify from diff: `grep` over `src`, `dev-api.ts` and `vite.config.ts` finds no consumer of `OrderRefresh` or `useOrdersByStatus` and no barrel export, so neither task's acceptance is exercised anywhere in the application.

Not reviewed: `node_modules`; the four pre-existing test files and `dev-api.test.ts`, unchanged by this diff; the `ui` browser recipe (`/`, `/orders`, `/orders/:id`) was not run.
