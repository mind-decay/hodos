# Review 1 — p6
Verdict: REJECT · blockers 2 · majors 5 · minors 1

## Checks run
- test: `npm test` → 8 passed (3 files), 0 failed
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems (clean only because of the inline disable at `OrderRefresh.tsx:9`)

## Spec
Missing: T1 acceptance — `OrderRefresh` is imported by nothing (`grep` over `src/` returns no reference), so "pressing it" is unreachable, and what it fetches lands in private state that the rendered list never reads; T2 acceptance — "changing the status twice in quick succession leaves the rows for the status selected last" is not met, see the L7 row.
Extra: the `AbortController` timeout in `src/lib/http.ts:4,11-12,17,22-24`. `### Refactor in scope` allows only a comment in `src/lib` and states "no file there changes behaviour, in either direction"; `## Non-goals` names "Changing the shared HTTP client".
Misunderstood: T1 read as "fetch a private copy and count it", where the plan's `### Precedent` names `OrdersPage.tsx:10` as how this feature fetches a list.
T3 is met — the fallback's reason sits at `src/lib/errors.ts:21-22`, on the statement that carries the fallback, and the text matches the `.catch(() => null)` path above it.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | `src/features/orders/ui/OrderRefresh.tsx:9-10` | rules/network-through-request | — | raw `fetch('/api/orders')` with `// eslint-disable-next-line no-restricted-globals`, suppressing the check at `eslint.config.js:16-22`; CLAUDE.md forbids weakening that config. Also double-prefixes `/api`, which `request()` already adds (`http.ts:3`) | call `listOrders(status)` from `../api`; delete the disable comment |
| blocker | `src/features/orders/ui/useOrdersByStatus.ts:10-12` | L7 concurrency / plan `### Invariants` | status `open`→`paid`; the `open` response resolves after the `paid` one and `setOrders` overwrites the paid rows | the effect has no cancellation, so a response for a status the user has left replaces the rows — the exact invariant the plan names | set an `ignore` flag in the effect's cleanup, or use `useQuery({ queryKey: keys.list(status) })` |
| major | `src/features/orders/ui/OrderRefresh.tsx:10-11` | L6 callee contract / rules/api-error-propagation | `/api` 404s on purpose (CLAUDE.md), so every press in dev takes this path | `fetch` does not reject on a non-2xx; `response.json()` then rejects on the error body inside an unhandled `async` onClick. No `ApiError`, no error surface, count silently unchanged | route through `request()` and render the failure with `role="alert"` |
| major | `src/features/orders/ui/useOrdersByStatus.ts:11` | rules/api-error-propagation | `listOrders` rejects with `ApiError` on any non-OK response | `.then(setOrders)` has no rejection path: the `ApiError` becomes an unhandled rejection, and the hook's `Order[]` return leaves the caller nothing to render | surface the error state to the caller |
| major | `src/lib/http.ts:11-12,22-24` | plan `### Refactor in scope` + `## Non-goals` | — | behaviour change in the shared client, barred twice by the plan; an aborted request also reports "the request did not reach the server" (`:21`) for a request that did reach it | revert `http.ts` to base |
| major | `src/features/orders/ui/OrderRefresh.tsx:5`, `useOrdersByStatus.ts:7` | defaults #16 dead code, #8 ≥2 callers | — | neither module is imported anywhere in `src/`, nor exported from `src/features/orders/index.ts`; both ship unreachable | wire `OrderRefresh` into `OrdersPage` and the hook into its consumer |
| major | `src/features/orders/ui/` | CLAUDE.md "a test sits beside the file it covers" | — | no `OrderRefresh.test.tsx`, no `useOrdersByStatus.test.ts`; T1 and T2 are behavioural and nothing verifies either. Precedent: `OrderList.test.tsx` | add tests stubbing `fetch` per rules/test-mocking-boundary |
| minor | `src/lib/http.ts:17-18` | L1 shadow override | — | `signal` precedes `...init`, so a caller-supplied `init.signal` silently replaces the timeout signal. No caller passes `init` today | moot once `http.ts` is reverted |

## Coverage
Not reviewed: the `ui` browser recipe (`/`, `/orders`, `/orders/:id`) — no runtime or visual check was run, so rendering of the new control is unverified. Outside the four diffed files, only one focused check was made: references to the two new modules, plus `orders/index.ts`, `orders/api.ts` and `eslint.config.js:10-24`.
