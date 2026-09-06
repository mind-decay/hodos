# Review 1 — p3
Verdict: REJECT · blockers 1 · majors 4 · minors 1

## Checks run
- test: `npm test` → 4 files, 10 passed
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → clean, no output

## Spec
Missing:
- **T2 acceptance** — "`busy` … false on every path out of it, including the one where there is no order yet". `useCancelOrder.ts:11-14` sets `busy` true, then leaves it true on the `!order` path and on the rejected-request path. Counted once, as the blocker row below.
- **T1 acceptance** — "a failure … where a screen reader announces it". The message renders in a bare `<p>` (`OrderActions.tsx:26`). Counted once, as the `error-role-alert` row below.
- **major** — nothing renders `OrderActions` and nothing calls `useCancelOrder` (`grep` over `src`: the only reference is its own test). `### Modules` gives `OrderActions` "the buttons" plural and `### Interfaces` gives the hook `useCancelOrder(order): {busy, cancel}`; the diff ships one button, no cancel surface, and a hook with zero callers — dead on arrival (defaults #8, #16). `OrderDetailPage.tsx` is inside `features/orders/ui`, so `### Refactor in scope` permits the wiring; `## Non-goals` bars only the list page.

Extra: — · Misunderstood: —

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | `src/features/orders/ui/useCancelOrder.ts:12` | L5 control-flow escape (plan `### Invariants`) | `cancel()` called while `order` is `undefined` — the detail query still pending, the exact case the interface types; also any rejected `request` at :13 | `setBusy(true)` at :11 runs, then `return` at :12 skips `setBusy(false)` at :14; the rejection path skips it too. `busy` latches true for the component's life | check `!order` before `setBusy(true)`, and wrap the call in `try { … } finally { setBusy(false); }` |
| major | `src/features/orders/ui/OrderActions.tsx:26` | rules/error-role-alert.md | — | `{error && <p>{error}</p>}` — the failure surface is silent to a screen reader; precedents `OrdersPage.tsx:25`, `OrderDetailPage.tsx:11` both carry the role | `<p role="alert">{error}</p>`, and assert it in the test with `getByRole('alert')` |
| major | `src/features/orders/ui/OrderActions.test.tsx:6` | rules/test-mocking-boundary.md | — | `vi.mock('../../../lib/http')` replaces a project module; the rule stubs the global `fetch` only and records that no `vi.mock()` of a project module exists here. The stub also rejects a plain `Error`, so the real `ApiError` surface is never exercised | `vi.stubGlobal('fetch', …)` returning a non-OK response, `vi.unstubAllGlobals()` in `afterEach` (`src/lib/http.test.ts:9-15`) |
| major | `src/features/orders/ui/OrderActions.tsx:17` | rules/api-error-propagation.md | — | the `catch` neither re-throws nor branches on `code`; it casts to `Error` and stores the message as a string, dropping `code` and `status` — the "a string" case the rule names | hold `ApiError \| null` in state, render `error.message` |
| minor | `src/features/orders/ui/OrderActions.tsx:14`, `useCancelOrder.ts:13` | rules/network-through-request.md | — | the two new endpoints are written inline in `ui/` with unencoded ids, where the rule and `api.ts:22-25` declare each call as one line with `encodeURIComponent` | add `markOrderPaid(id)` / `cancelOrder(id)` to `api.ts` and call those |

## Coverage
Not reviewed: no runtime/browser check of the three routes — `OrderActions` is unreachable from any route, so `commands.dev` would show nothing. `useCancelOrder` has no test in the diff (T3 names only the two test files), so its acceptance was judged by reading. The success path of "Mark paid" invalidates no query key; out of the plan's tasks, and moot while nothing renders the component.
