# Review 1 — p6
Verdict: REJECT · blockers 3 · majors 5 · minors 1

## Checks run
- test: `npm test` → 3 files, 8 passed
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems (the one violation is suppressed inline at `src/features/orders/ui/OrderRefresh.tsx:9`)

## Spec
**Missing:** T2's acceptance — "changing the status twice in quick succession leaves the rows for the status that was selected last". `useOrdersByStatus.ts:10-12` has no ordering guard, and no test exercises two overlapping changes.

**Extra:** the 8s `AbortController` timeout in `src/lib/http.ts` (`:4`, `:11-12`, `:17`, `:22-24`). No task ordered it; T3 scoped the `src/lib` work to a comment in `errors.ts`.

**Misunderstood:** T1 — "pressing it reloads the orders and the count it shows changes with them". `OrderRefresh` loads into a private `useState` array, so the page's list (`OrdersPage.tsx:10`, `keys.list(status)`) is never reloaded and nothing is invalidated; it fetches `/api/orders` with no `?status=`, so the count is of all orders, not the ones shown; and the component has no caller and is not in `src/features/orders/index.ts`, so nothing renders it.

T3 is met: the comment sits with the fallback (`errors.ts:21-26`).

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/features/orders/ui/OrderRefresh.tsx:10 | rules/network-through-request.md | — | raw `fetch('/api/orders')` in feature code, hardcoding the `/api` prefix `request()` already adds | call `listOrders(status)` |
| blocker | src/features/orders/ui/useOrdersByStatus.ts:11 | L7 concurrency (plan `### Invariants`) | status flips open→paid while the open request is in flight and the open response resolves second | the stale `setOrders` wins; rows are for the status the user left | `useQuery({ queryKey: keys.list(status), … })`, or a `cancelled` flag in effect cleanup |
| blocker | src/lib/http.ts:11-12 | plan `### Refactor in scope` / `## Non-goals` | — | shared client changes behaviour where the plan bars it "in either direction" | revert http.ts; raise the timeout as a Gap |
| major | src/features/orders/ui/OrderRefresh.tsx:9 | CLAUDE.md Conventions (eslint.config.js not to be weakened) | — | `// eslint-disable-next-line no-restricted-globals` suppresses `eslint.config.js:18-21`, the check written for exactly this line — which is why lint is green | delete the disable |
| major | src/features/orders/ui/OrderRefresh.tsx:11 | rules/api-error-propagation.md | `/api/orders` 404s by design; body is the `{error:{…}}` envelope or a proxy's HTML | `response.ok` unchecked: the envelope is cast to `Order[]` and `orders.length` renders empty; HTML makes `.json()` reject inside an unhandled async handler — no `ApiError`, no `role="alert"` | go through `request()`, render `error.message` in a `role="alert"` element |
| major | src/features/orders/ui/useOrdersByStatus.ts:11 | L6 callee-contract mismatch | `listOrders` throws `ApiError` on any non-OK response | `.then(setOrders)` has no rejection handler: unhandled rejection, hook returns `[]` forever with no error channel | handle the failure path |
| major | src/features/orders/ui/useOrdersByStatus.ts:10-12 | plan `### Precedent` (`OrdersPage.tsx:10`) | — | hand-rolled `useState`/`useEffect` fetch instead of the named precedent; a second copy of server state already cached under `keys.list(status)`, which no invalidation reaches | back it with `useQuery` |
| major | src/features/orders/ui/OrderRefresh.test.tsx | CLAUDE.md ("a test sits beside the file it covers") | — | new module, no test beside it | add it, `fetch` stubbed per rules/test-mocking-boundary.md |
| major | src/features/orders/ui/useOrdersByStatus.test.ts | CLAUDE.md ("a test sits beside the file it covers") | — | new module, no test beside it; T2's acceptance is unproven | add it, with two overlapping resolutions |
| minor | src/lib/http.ts:17-18 | L1 shadow override | a caller passing `init.signal`; none today | `...init` spreads after `signal`, so a caller's signal silently drops the timeout | spread `init` first, or merge the signals |

## Coverage
Reviewed the four diffed files against the plan, the six rules and the defaults list. Not reviewed: files outside the diff — `api.ts`, `OrdersPage.tsx`, `index.ts` and `eslint.config.js` were read only as the precedents the findings cite. Runtime behaviour was not exercised in a browser; the `/api` 404 path is the fixture's documented dev behaviour, taken from CLAUDE.md rather than observed.
