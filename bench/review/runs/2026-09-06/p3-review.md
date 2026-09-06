# Review 1 — p3
Verdict: REJECT · blockers 2 · majors 5 · minors 2

## Checks run
- test: `npm test` → 4 files, 10 tests passed
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems

## Spec
Missing: T2's acceptance — "`busy` … false on every path out of it, including the one where there is no order yet" — is met on neither path: `useCancelOrder.ts:12` returns above the reset, `:13` throws past it. T1's acceptance — the failure message "where a screen reader announces it" — is unmet: `OrderActions.tsx:26` renders a plain `<p>`.
Extra: — · Misunderstood: —

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/features/orders/ui/useCancelOrder.ts:12 | L5 control-flow escape | `cancel()` while `order` is `undefined` — the detail page's query is still pending, the case T2 names | `setBusy(true)` already ran; the guard returns above `setBusy(false)`, so `busy` stays true for the life of the component | move the `if (!order) return` above `setBusy(true)` |
| blocker | src/features/orders/ui/useCancelOrder.ts:13 | L6 callee-contract mismatch | the POST fails — `/api` 404s in dev, and `request()` throws `ApiError` on any non-OK or dead network (`src/lib/http.ts:17-19`) | the throw skips `setBusy(false)`; the flag is stuck true after every failed cancel | `try { … } finally { setBusy(false) }` |
| major | src/features/orders/ui/OrderActions.tsx:26 | rules/error-role-alert.md | — | the error `<p>` has no `role="alert"`; the message renders silently | `<p role="alert">{error}</p>` |
| major | src/features/orders/ui/OrderActions.tsx:17 | rules/api-error-propagation.md | — | the caught `ApiError` is flattened to a string in state, dropping `code` and `status` | hold the `ApiError` and render `error.message` |
| major | src/features/orders/ui/OrderActions.test.tsx:6 | rules/test-mocking-boundary.md | — | `vi.mock()` of `lib/http` — the only one in the repo; the test also mocks away `ApiError`, so it cannot see the row above | `vi.stubGlobal('fetch', …)` returning the failure, unstubbed in `afterEach` |
| major | src/features/orders/ui/OrderActions.tsx:14 | rules/network-through-request.md | — | the call is written inline in a component instead of declared in `api.ts`, and `orderId` skips the `encodeURIComponent` of the rule's precedents | add `markOrderPaid(id)` to `src/features/orders/api.ts` |
| major | src/features/orders/ui/useCancelOrder.ts:13 | rules/network-through-request.md | — | same: an inline `request()` path, `order.id` unencoded | add `cancelOrder(id)` to `api.ts` |
| minor | src/features/orders/ui/OrderActions.tsx:17 | L7 concurrency and async | two clicks: the first call rejects after the second resolves | the stale rejection overwrites the cleared error, and both POSTs are sent | disable the button while a call is in flight |
| minor | src/features/orders/ui/useCancelOrder.test.ts | CLAUDE.md — "a test sits beside the file it covers" | — | the hook ships untested; either blocker above dies to one test of the busy flag | add the test beside the hook |

## Coverage
Not reviewed: the browser recipe (`/`, `/orders`, `/orders/:id`) — no dev server was started. Neither new module is imported anywhere in `src` (no `## Callers`, confirmed by grep), so nothing here is exercised in the running app; the plan ordered no wiring, and I raise no finding on it. `node_modules`, `package-lock.json` and the frozen `eslint.config.js` untouched.
