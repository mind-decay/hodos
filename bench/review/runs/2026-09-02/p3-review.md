# Review 1 — p3
Verdict: REJECT · blockers 2 · majors 5 · minors 2

## Checks run
- test: `npm test` → 10 passed (4 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → clean

## Spec
Missing: T1's "a screen reader announces it" — the message renders in a bare `<p>` (row 3). T2's "`busy` … false on every path out of it, including the one where there is no order yet" — met on no path but the happy one (rows 1–2). T3's "a failing call renders its message" is asserted against a mocked project module, not the network boundary (row 5); the list's two-decimal case is present and green. The plan's `### Modules` calls `OrderActions` "the buttons" and orders `useCancelOrder` beside it; only "Mark paid" exists and the hook has no caller in `src` (row 8).
Extra: —
Misunderstood: —

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/features/orders/ui/useCancelOrder.ts:12 | L5 control-flow escape | `cancel()` pressed while `order` is `undefined` — the detail query still pending | `setBusy(true)` runs above the guard; the `return` skips `setBusy(false)`, so `busy` is stuck true for the component's life | guard before `setBusy(true)`, or wrap the call in `try { … } finally { setBusy(false) }` |
| blocker | src/features/orders/ui/useCancelOrder.ts:13 | plan design: Invariants & failure modes | `request` rejects with `ApiError` — any non-2xx, e.g. the `/api` 404 that dev serves | `setBusy(false)` is skipped and `cancel` rejects to an `onClick` that cannot catch it: `busy` stuck true, reason nowhere on the page | `try/finally` for the flag; return the `ApiError` so the caller can render it |
| major | src/features/orders/ui/OrderActions.tsx:26 | rules/error-role-alert.md | — | the failure text has no `role="alert"`; sighted users see it, a screen-reader user gets nothing | `<p role="alert">{error}</p>` |
| major | src/features/orders/ui/OrderActions.tsx:17 | rules/api-error-propagation.md | — | the `catch` flattens the `ApiError` to a string, dropping `code` and `status` the rule keeps travelling | hold the `ApiError` in state (or branch on `code`) and render `.message` |
| major | src/features/orders/ui/OrderActions.test.tsx:6 | rules/test-mocking-boundary.md | — | `vi.mock('../../../lib/http')` mocks a project module — the first in the repo — and rejects a plain `Error`, so the real `ApiError` surface is never exercised | `vi.stubGlobal('fetch', …)` with a non-OK response, `vi.unstubAllGlobals()` in `afterEach` |
| major | src/features/orders/ui/OrderActions.tsx:14 | rules/network-through-request.md; CLAUDE.md "Where things live" | — | the request is written in `ui/`, not declared in the feature's `api.ts`; the id is interpolated raw, unlike `api.ts:25`. Same at `useCancelOrder.ts:13` | add `markOrderPaid`/`cancelOrder` to `src/features/orders/api.ts` with `encodeURIComponent`, call those |
| major | src/features/orders/ui/useCancelOrder.test.ts | CLAUDE.md "a test sits beside the file it covers" | — | T2's whole acceptance is the `busy` flag and nothing exercises it; the hook has no caller in `src` either, so both blockers ship unobserved | cover `busy` on the no-order, success and reject paths |
| minor | src/features/orders/ui/OrderActions.tsx:23 | L7 concurrency | second click before the first promise settles | no pending guard on the button: two POSTs, and the later `setError` wins | disable while in flight |
| minor | src/features/orders/ui/OrderActions.tsx:22 | plan design: Modules / Interfaces | — | no cancel affordance anywhere: `<OrderActions orderId>` cannot feed `useCancelOrder(order)`, so the ordered pair does not compose | pass the `Order` (or render cancel where the order is held) |

## Coverage
Verified by focused check outside the diff: `useCancelOrder` and `OrderActions` have no reference in `src` and neither is on `src/features/orders/index.ts`, so no route renders this work. Not reviewed: `node_modules`, the frozen `eslint.config.js` and `package-lock.json`, and browser behaviour — the `ui` recipe was not run.
