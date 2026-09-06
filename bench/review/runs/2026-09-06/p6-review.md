# Review 1 — p6
Verdict: REJECT · blockers 2 · majors 7 · minors 2

## Checks run
- test: `npm test` → 8 passed (3 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems (the one `fetch` in feature code is silenced by an inline disable, see below)

## Spec
Missing: T1 — nothing renders `OrderRefresh` and no test presses it (`grep -rn OrderRefresh src` matches only the file itself), so "pressing it reloads the orders and the count changes" is met nowhere. T2 — "changing the status twice in quick succession leaves the rows for the status selected last" is exactly what `useOrdersByStatus.ts:10-12` does not guarantee; no ignore flag, no abort, no cleanup.
Extra: `limit = 25` on `listOrders` (`api.ts:22`) — no task asked for it; the `AbortController`/`TIMEOUT_MS` in `http.ts:11-12,17,22-23`, which `### Refactor in scope` ("no file there changes behaviour, in either direction") and `## Non-goals` ("Changing the shared HTTP client") both bar.
Misunderstood: T1 built as a private `fetch` with its own local copy of the orders, against `### Dependency direction` ("reach the network the way every other caller does").
T3 is met: the fallback's reason sits at the fallback (`errors.ts:21-22`).

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/features/orders/ui/useOrdersByStatus.ts:10-12 | L7 concurrency | status `open`→`paid`; the `open` response lands last | the later `.then` wins, so the rows shown are for the status the user left — the plan's stated invariant | capture an `ignore` flag / `AbortController` in the effect and drop stale responses in cleanup |
| blocker | src/features/orders/ui/OrderRefresh.tsx:10 | rules/network-through-request.md | — | raw `fetch('/api/orders')` in feature code, bypassing the single client, its `/api` prefix and its `ApiError` | add a request function to `api.ts` and call `request<Order[]>('/orders')` |
| major | src/features/orders/ui/OrderRefresh.tsx:9 | CLAUDE.md "do not weaken `eslint.config.js`" | — | `// eslint-disable-next-line no-restricted-globals` disables the rule that enforces Convention 1, so lint reports green | delete the disable with the `fetch` it protects |
| major | src/features/orders/ui/OrderRefresh.tsx:11 | rules/api-error-propagation.md | `/api` 404s by design (CLAUDE.md); `response.json()` rejects | no `response.ok` check and no `catch`: the failure becomes an unhandled rejection, no `ApiError`, no `role="alert"` surface | route through `request()`; render `error.message` in a `role="alert"` element |
| major | src/features/orders/ui/useOrdersByStatus.ts:11 | rules/api-error-propagation.md | `request()` throws `ApiError` on any non-OK response | `.then(setOrders)` with no `catch` drops `code`/`status`; the hook returns `[]` and `OrderList` renders "No orders match this filter." as if the call succeeded | return the error alongside the rows so the caller can alert on it |
| major | src/features/orders/api.ts:22 | plan `### Non-goals` / `### Data & scale` | a status with more than 25 orders, via `OrdersPage.tsx:10` | the new default silently caps the existing list page at 25 of "the same few hundred rows"; `keys.list(status)` does not carry `limit` either | drop the parameter |
| major | src/lib/http.ts:11-12,22-23 | plan `### Refactor in scope` | — | a behaviour change in `src/lib`, where only a comment was permitted (and the timer is cleared before the body is read, so it never covers `response.json()`) | revert `http.ts` to the comment-only change the plan allows |
| major | src/features/orders/ui/useOrdersByStatus.test.ts | CLAUDE.md "a test sits beside the file it covers" | — | the new hook ships untested; the out-of-order test is what T2's acceptance describes | add it, failing first |
| major | src/features/orders/ui/OrderRefresh.test.tsx | CLAUDE.md "a test sits beside the file it covers" | — | the new component ships untested; nothing presses the button | add it with `fetch` stubbed at the boundary |
| minor | src/lib/http.ts:18 | L1 shadow override | a caller passing `init.signal` | `...init` spreads after `signal`, so a caller's own signal silently discards the timeout's | moot once `http.ts` is reverted |
| minor | src/features/orders/ui/OrderRefresh.tsx:5 | defaults #16 dead code | — | no caller and no barrel export; neither new module is reachable from `App.tsx` | wire it into `OrdersPage` or drop it from this task |

## Coverage
Not reviewed: no browser run — `verify.recipes.ui` (`/`, `/orders`, `/orders/:id`) was not exercised, so the rendered behaviour of the two new modules is judged from source only. The `/api` 404 trigger is taken from `CLAUDE.md`, not observed. Unchanged files outside the diff (`OrdersPage.tsx`, `errors.ts` body, the barrel) were read only for the caller and precedent questions.
