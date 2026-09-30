# Review 1 — p6
Verdict: REJECT · blockers 1 · majors 7 · minors 1

## Checks run
- test: `npm test` → 17 passed (4 files); no test file is added by this diff
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems (clean only because `OrderRefresh.tsx:9` disables the rule that would have fired)

## Spec
**Missing:** T2's acceptance — "changing the status twice in quick succession leaves the rows for the status that was selected last". Nothing in `useOrdersByStatus.ts:10-12` orders the responses, and no test exercises it.

**Extra:** the `limit = 25` parameter (`src/features/orders/api.ts:22`), which no task asks for; the abort timeout in `src/lib/http.ts:4,11-12,17,22-23`, barred twice — `### Refactor in scope` ("no file there changes behaviour, in either direction") and `## Non-goals` ("Changing the shared HTTP client").

**Misunderstood:** T1. "Pressing it reloads the orders" is built as a fetch into the control's own `useState` (`OrderRefresh.tsx:6,11`); the page's list and cache are untouched, so nothing on screen reloads. `### Architecture alternatives` declined `refetch()` because the control must work from anywhere and before the list query exists — `queryClient.invalidateQueries({ queryKey: orderKeys.all })` satisfies both and refreshes the list.

**Unclaimed:** the timeout-abort failure path added at `src/lib/http.ts:12`, surfacing through the `catch` at `:20` as `ApiError('network', 0, 'the request did not reach the server')` — no task's `Acceptance:` names it; no task names `http.ts` at all.

T3 is met (`src/lib/errors.ts:21-22`). No `Mutation:` header, so no count comparison.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/features/orders/ui/useOrdersByStatus.ts:10-12 | L7 concurrency and async | select `open`, then `paid` before `open`'s response lands; `open` resolves last | no cleanup or generation guard, so the stale `setOrders` wins and the rows shown are the status the user left — the exact invariant `### Invariants & failure modes` names | `let live = true` + cleanup, or `useQuery({ queryKey: keys.list(status), queryFn: () => listOrders(status) })` |
| major | src/features/orders/ui/OrderRefresh.tsx:10 | rules/network-through-request.md | — | raw `fetch('/api/orders')` in feature code; `request()` is the application's only fetch and prefixes `/api` itself | call `listOrders(status)` |
| major | src/features/orders/ui/OrderRefresh.tsx:9 | defaults row 7 (+ CLAUDE.md: `eslint.config.js` is not to be weakened) | — | `eslint-disable-next-line no-restricted-globals` takes a silent exception to the project's own check; a rule that does not fit is a `Gap:` for the chat | delete the disable with the fetch |
| major | src/features/orders/ui/OrderRefresh.tsx:10-11 | L6 callee-contract mismatch | press Refresh when `/api/orders` 404s — `dev-api.ts:59` answers `{error:{code,message}}` | `fetch` does not reject on a non-OK status and `response.ok` is never checked: the error envelope is stored as the order array, `orders.length` is `undefined` and the label renders `Refresh ()`; no `ApiError` is produced (rules/api-error-propagation.md). A non-JSON body rejects `response.json()` unhandled | go through `request()`, which throws `ApiError` |
| major | src/features/orders/api.ts:22-23 | plan `### Data & scale`, defaults row 14 | `listOrders(status)` at `OrdersPage.tsx:10` now requests `&limit=25` | a default nobody asked for: `dev-api.ts:45-49` ignores `limit`, so it is inert here, and against an API that honours it the one existing caller silently caps at 25 against "the same few hundred rows"; `keys.list(status)` does not carry it, so two limits share one cache entry | drop the parameter, or add it to `keys.list` and pass it explicitly |
| major | src/features/orders/ui/OrderRefresh.test.tsx | CLAUDE.md: a test sits beside the file it covers | — | no test beside the new component; T1's acceptance (the count changes with the orders) is unverified | add it, `fetch` stubbed at the boundary |
| major | src/features/orders/ui/useOrdersByStatus.test.ts | CLAUDE.md: a test sits beside the file it covers | — | no test beside the new hook; T2's acceptance is unverified, which is why the race above shipped green | add it with two stubs resolving out of order |
| major | src/lib/http.ts:11-12,17,22-23 | plan `### Refactor in scope`, `## Non-goals` | — | the shared client gained an 8s abort; the plan bars behaviour change in `src/lib` in either direction. The timer is also cleared once headers arrive, so `await response.json()` at `:26` is outside the budget | revert `http.ts` to base |
| minor | src/lib/http.ts:18 | L1 shadow override | `request(path, { signal })` — the exported `init?: RequestInit` accepts one | `...init` is spread after `signal: controller.signal`, so a caller's own signal replaces the timeout's and the 8s abort silently applies to nothing | spread `...init` first, or merge the signals |

## Coverage
Not reviewed: `dev-api.ts` and `vite.config.ts` beyond one check of `answer()` for whether `limit` is honoured; the `ui` browser recipe (`/`, `/orders`, `/orders/:id`) was not run.

Cannot verify from diff: nothing imports `OrderRefresh` or `useOrdersByStatus` (grep over `src`, `vite.config.ts`), and neither is on the orders barrel, so T1's "pressing it" cannot be exercised in the running app — whether wiring belongs to this task is the orchestrator's call.
