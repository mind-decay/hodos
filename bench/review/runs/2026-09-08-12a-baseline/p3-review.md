# Review 1 — p3
Verdict: NEEDS_WORK · blockers 0 · majors 6 · minors 2

## Checks run
- test: `npm test` → 22 passed (6 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → clean

## Spec
Missing:
- T1 — "a failure puts the message on the page where a screen reader announces it": `src/features/orders/ui/OrderActions.tsx:26` renders `{error && <p>{error}</p>}`, no `role="alert"`, and `OrderActions.test.tsx:14` asserts with `getByText`, so the criterion is neither met nor covered.
- T2 — "`busy` … false on every path out of it, including the one where there is no order yet": `src/features/orders/ui/useCancelOrder.ts:12` returns with `busy` still true, and no test file for the hook was added.

Extra: `src/features/orders/ui/OrderList.test.tsx:23` — the diff deletes the existing `href` assertion. `### Refactor in scope` lets the list's tests *gain* the totals case; nothing asked for a removal.

Misunderstood: —

Unclaimed:
- `'declined'` — the third member of `RefundState`, added at `src/features/orders/refund.ts:2` with its label at `:7`; T4's `Acceptance:` names `requested` and `approved` only.
- the rejection path of `request` at `src/features/orders/ui/useCancelOrder.ts:13`: the invariant "A failed call leaves the order as it was and puts the reason on the page" is named by no `Acceptance:` clause for cancel — the hook has no failure surface at all.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/ui/OrderActions.tsx:26 | rules/error-role-alert.md | — | the failure message renders in a bare `<p>`; a screen-reader user gets nothing | `<p role="alert">{error}</p>` |
| major | src/features/orders/ui/OrderActions.tsx:17 | rules/api-error-propagation.md | — | `catch` reduces the `ApiError` to `(cause as Error).message` in state, discarding `code` and `status` | hold the `ApiError` (`useState<ApiError \| null>`) or branch on `code` |
| major | src/features/orders/ui/useCancelOrder.ts:12 | L5 control-flow escape | `cancel()` pressed while the detail query is pending, so `order` is `undefined` | the early `return` sits below `setBusy(true)` and skips `setBusy(false)`: busy stays true forever | guard before `setBusy(true)`, or wrap in `try/finally` |
| major | src/features/orders/ui/useCancelOrder.ts:13 | L5 control-flow escape | the POST fails (`/orders/o-9/cancel` → non-OK, `ApiError` thrown by `http.ts:19`) | the throw skips `setBusy(false)`, and the rejection escapes the returned promise unhandled | `try { … } finally { setBusy(false) }`, and surface the reason |
| major | src/features/orders/ui/OrderActions.test.tsx:6 | rules/test-mocking-boundary.md | — | `vi.mock('../../../lib/http')` mocks a project module — the first in the repo — and rejects with a plain `Error`, so `ApiError` never travels | `vi.stubGlobal('fetch', …)` with the error envelope, unstubbed in `afterEach` |
| major | src/features/orders/ui/OrderList.test.tsx:23 | plan `### Refactor in scope` | — | the `href` assertion is gone while the test's name still claims "linking to its detail route"; the link is now unchecked | restore the deleted assertion |
| minor | src/features/orders/ui/OrderActions.tsx:14 | rules/network-through-request.md (precedent `api.ts:25`) | — | path segment interpolated raw where the project encodes it | `encodeURIComponent(orderId)` |
| minor | src/features/orders/refund.ts:1 | defaults catalogue #9 | — | the comment says "The detail page reads it for its badge"; no file imports `refund` | drop the claim or wire the badge |

## Coverage
Not reviewed: everything outside the six diffed files — `src/features/shift/`, `dev-api.ts`, `vite.config.ts`, `eslint.config.js`.

The package carries no `Mutation:` header and no task carries a `Tests:` line, and there is no `.claude/hodos/ledger.md`; per-task mutation counts could not be checked — `— (ledger.md unreadable)`, no finding.

The package carries no `## Callers` section for the four new exported declarations. One grep over `src/` found no reference to `OrderActions`, `useCancelOrder`, `RefundState` or `refundLabel` outside their own files: all three modules are unwired and none is in `src/features/orders/index.ts`. No task ordered the wiring, so this is not a finding — but nothing in the running application exercises this diff.
