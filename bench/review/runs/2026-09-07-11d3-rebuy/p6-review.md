# Review p6 — the refresh control and rows for one status
Verdict: REJECT · blockers 2 · majors 8 · minors 1

## Checks run
- test: `npm test` → 3 files, 8 tests passed (identical to base 311d49f: no test accompanies either new module)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems
- Note: lint is green only because `src/features/orders/ui/OrderRefresh.tsx:9` suppresses `no-restricted-globals` inline; without that line the raw `fetch` is an eslint error.

## Spec
**Missing** — T1: nothing imports, renders or exports `OrderRefresh` (no reference outside its own file; `src/features/orders/index.ts` unchanged), so "pressing it" is unreachable, and its count is component-local state disconnected from the page's list — pressing it reloads nothing the user sees and touches no query cache. T2: no cancellation, no staleness guard, no test — "changing the status twice in quick succession leaves the rows for the status that was selected last" is unmet (blocker row 1).

**Extra** — `limit = 25` on `listOrders` (`src/features/orders/api.ts:22`), asked for by no task; the 8 s abort timeout in `src/lib/http.ts:4,11-12,17,22-23`, which `### Refactor in scope` permits only as a comment.

**Misunderstood** — none. T3 is met: the fallback's reason sits at the fallback (`src/lib/errors.ts:21-22`).

**Unclaimed** — three failure paths the diff adds that no `Acceptance:` clause exercises: the abort path at `src/lib/http.ts:12` (`controller.abort()` → the `catch` → `ApiError('network', 0, …)`); the rejection of `listOrders(status)` at `src/features/orders/ui/useOrdersByStatus.ts:11`; the non-OK response of `fetch('/api/orders')` at `src/features/orders/ui/OrderRefresh.tsx:10`. The `### Invariants & failure modes` clause is named by T2's acceptance, so it is claimed — and unmet.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/features/orders/ui/useOrdersByStatus.ts:10-12 | L7 concurrency | status goes `open`→`paid` quickly and the `open` response lands second | no cleanup, no abort, no staleness check: the late response calls `setOrders` and the rows for the status the user left replace the current ones — the plan's stated invariant and T2's acceptance | `useQuery({ queryKey: keys.list(status), queryFn: () => listOrders(status) })`, or an `ignore` flag cleared in the effect's cleanup |
| blocker | src/features/orders/api.ts:22-23 | plan `### Non-goals` / `### Data & scale` | `OrdersPage.tsx:10` calls `listOrders(status)` for a status with more than 25 orders | the defaulted `limit` silently truncates every existing caller's list to 25 of "the same few hundred rows"; `keys.list(status)` also omits `limit`, so any varied limit shares one cache entry | drop the parameter; if it must stay, make it explicit at the call site and part of the key |
| major | src/features/orders/ui/OrderRefresh.tsx:10 | rules/network-through-request.md | — | bare `fetch('/api/orders')` bypasses `request()`, and re-prefixes `/api`, which `request()` adds itself | `listOrders(status)` |
| major | src/features/orders/ui/OrderRefresh.tsx:9 | CLAUDE.md conventions ("do not weaken `eslint.config.js`") | — | an inline `eslint-disable-next-line no-restricted-globals` disables the frozen guard for convention 1; the check reports green because the violation was silenced | remove the disable and the `fetch` it protects |
| major | src/features/orders/ui/OrderRefresh.tsx:10-11 | L6 callee-contract | `/api/orders` answers 404 — it does in dev, by design | `fetch` does not throw on a non-OK status; `response.json()` then rejects on the non-JSON body, giving an unhandled rejection inside the click handler, no `ApiError`, and no error surface at all | go through `request()`, which raises `ApiError`, and render it with `role="alert"` per rules/error-role-alert.md |
| major | src/features/orders/ui/useOrdersByStatus.ts:11 | rules/api-error-propagation.md | any non-OK `/orders` response or a dead network | `.then(setOrders)` with no `catch`: the `ApiError`'s `code` and `status` are dropped into an unhandled rejection, the hook keeps stale rows and nothing above can tell 404 from a dead network | return the error to the caller (react-query's `isError`), never swallow it |
| major | src/lib/http.ts:11-12,17,22-23 | plan `### Refactor in scope` / `### Non-goals` | — | the shared client changes behaviour where the plan allows only a comment: every request now aborts at 8 s, the abort surfaces as `'the request did not reach the server'` though it did, and `clearTimeout` in `finally` fires once headers arrive, so the body read is uncovered | revert `src/lib/http.ts`; propose the timeout as its own task |
| major | src/features/orders/ui/useOrdersByStatus.ts:10 | plan `### Precedent` (`OrdersPage.tsx:10`) + rules/query-key-factory.md | — | server state fetched with `useEffect`/`useState` instead of the feature's precedent; the rows live in no cache entry, so an invalidation against the barrel's `orderKeys` never refreshes them | `useQuery` with `keys.list(status)` |
| major | src/features/orders/ui/useOrdersByStatus.test.ts | CLAUDE.md ("a test sits beside the file it covers") / decision 0022 | — | the module with the race the plan names as its invariant ships with no test; the suite count is unchanged from base | add the failing race test first |
| major | src/features/orders/ui/OrderRefresh.test.tsx | CLAUDE.md ("a test sits beside the file it covers") / decision 0022 | — | new component, no test beside it; T1's acceptance is unverified | cover the press with `fetch` stubbed at the boundary |
| minor | src/lib/http.ts:17-18 | L1 shadow override | a caller passing `init` with its own `signal` (none today) | `...init` spreads after `signal`, so a caller's signal silently replaces the timeout's | merge the signals, or spread `init` first |

## Coverage
Not reviewed: everything outside the diff, except four reads made to judge it — `src/features/orders/ui/OrdersPage.tsx` (the listed caller), `src/features/orders/index.ts` (barrel, to check reachability of the new modules), `eslint.config.js` (the suppressed rule), `package.json` (react-query 5.102.8). No browser run: `verify.recipes.ui` routes were not exercised, and `/api` is served by nobody in this repository, so the 404 path and the timeout are read from source rather than observed. Rules `feature-barrel-imports` and `test-mocking-boundary` had no in-diff instance to judge.
