# Review 1 — p3
Verdict: NEEDS_WORK · blockers 0 · majors 6 · minors 2

## Checks run
- test: `npm test` → 22 passed (6 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems

## Spec
Missing: T2 — `busy` is not false on every path out of `cancel`; the no-order path the acceptance names by hand latches it true (`useCancelOrder.ts:11-12`), and no test declaration covers the hook at all. T1 — "where a screen reader announces it" is unmet: the message renders in a bare `<p>` (`OrderActions.tsx:26`).

Extra: —

Misunderstood: —

Unclaimed:
- `'declined'` — the third member of `RefundState`, added at `src/features/orders/refund.ts:2`; T4's acceptance names only `requested` and `approved`.
- the throw path of `request()` at `src/features/orders/ui/useCancelOrder.ts:13`; T2's acceptance names only the no-order path.
- `### Invariants & failure modes` — "A failed call leaves the order as it was"; no `Acceptance:` clause names it.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/ui/OrderActions.tsx:26 | rules/error-role-alert.md | — | error surface is `<p>{error}</p>`, silent to a screen reader; precedents at `OrdersPage.tsx:25`, `OrderDetailPage.tsx:11` | `<p role="alert">` |
| major | src/features/orders/ui/OrderActions.tsx:17 | rules/api-error-propagation.md | — | the caught `ApiError` is reduced to a string, dropping `code` and `status` | keep the `ApiError` in state, or branch on `code`, and read `.message` at render |
| major | src/features/orders/ui/OrderActions.test.tsx:6 | rules/test-mocking-boundary.md | — | `vi.mock('../../../lib/http')` replaces a project module; the rule stubs `fetch` only, and no `vi.mock` of a project module exists in the repo | `vi.stubGlobal('fetch', …)` per `src/lib/http.test.ts:15`, with `vi.unstubAllGlobals()` |
| major | src/features/orders/ui/useCancelOrder.ts:11 | L5 control-flow escape | `cancel()` pressed while the detail query is pending, so `order === undefined` | `setBusy(true)` runs, then `return` skips `setBusy(false)`; the flag latches true until remount | check `!order` before `setBusy(true)` |
| major | src/features/orders/ui/useCancelOrder.ts:13 | L6 callee-contract mismatch | cancel against a missing order (`/orders/o-9`) or an unreachable server: `request()` throws `ApiError` (`src/lib/http.ts:17-19`) | no `catch`/`finally`, so `setBusy(false)` is skipped and the returned promise rejects unhandled | `try { … } finally { setBusy(false) }`, and surface the `ApiError` |
| major | src/features/orders/ui/useCancelOrder.test.ts | conventions (CLAUDE.md "a test sits beside the file it covers") | — | the hook carrying the plan's busy invariant has no test file; both defects above ship green | add the test beside it, covering the no-order and throwing paths |
| major | src/features/orders/ui/OrderList.test.tsx:23 | plan: `Refactor in scope` | — | the `Ada` link-href assertion was deleted; scope permits the list's tests to *gain* the totals case only, `OrderList.tsx:15` still renders the link, and the test's name now claims a route check it no longer makes | restore the assertion |
| minor | src/features/orders/ui/OrderActions.tsx:14 | rules/network-through-request.md | — | the path segment is interpolated raw, where the rule's example and `api.ts:25` encode it; same at `useCancelOrder.ts:13` | `encodeURIComponent(orderId)`; declare the call in `api.ts` beside `getOrder` |
| minor | src/features/orders/refund.ts:1 | defaults #9 (comment accuracy) | — | "The detail page reads it for its badge" — nothing in `src` imports `refundLabel` or `RefundState`, and the barrel does not export them | drop the claim or wire the badge |

## Coverage
No `Mutation:` header line in the package, so no ledger comparison was made.
One check outside the diff: `grep -rn` over `src` for consumers of `OrderActions`, `useCancelOrder`, `refundLabel`, `RefundState` — none outside the new files. Whether the three modules were meant to be wired into `OrderDetailPage` is not answerable from the diff; no task orders it.
Not reviewed: files the diff does not touch — `OrdersPage.tsx`, `model.ts`, `dev-api.ts`, `vite.config.ts`, `eslint.config.js` (frozen by project decision).
