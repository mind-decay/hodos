# Review 1 — p3
Verdict: REJECT · blockers 1 · majors 6 · minors 1

## Checks run
- test: `npm test` → 13 passed (5 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems

## Spec
Missing: T1 — "a failure puts the message on the page **where a screen reader announces it**": the `<p>` at `src/features/orders/ui/OrderActions.tsx:26` carries no `role="alert"`, and no assertion covers announcement. T2 — "`busy` … false on every path out of it, **including the one where there is no order yet**": unmet at `src/features/orders/ui/useCancelOrder.ts:12`, and no test claims it.

Extra: — · Misunderstood: —

Unclaimed: `'declined'` — the third member of `RefundState` at `src/features/orders/refund.ts:2` — is in no `Acceptance:` clause (T4 names `requested` and `approved` only). The failure path of `cancel` at `src/features/orders/ui/useCancelOrder.ts:13` (a rejected `request()`) is in no claim. The invariant clause "A failed call leaves the order as it was and puts the reason on the page" is named by T1's acceptance for `OrderActions` and by nothing for `useCancelOrder`, which has no error surface at all.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/features/orders/ui/useCancelOrder.ts:12 | L5 control-flow escape | `cancel()` pressed while `order` is `undefined` — the detail query is still pending | `setBusy(true)` runs, then the early `return` skips `setBusy(false)`: `busy` is stuck true forever, with no call ever made. Plan invariant "every path out of `cancel` leaves it false" and T2's acceptance both break | guard `if (!order) return;` **above** `setBusy(true)`, and wrap the rest in `try/finally` |
| major | src/features/orders/ui/useCancelOrder.ts:13 | L6 callee-contract mismatch | the POST returns non-OK, or never arrives — `request()` throws `ApiError` (`src/lib/http.ts:17-19`) | the throw skips `setBusy(false)`: `busy` stays true and the rejection escapes to a caller with no surface for it | `try { await request(…) } finally { setBusy(false) }`, and surface the `ApiError` |
| major | src/features/orders/ui/OrderActions.tsx:26 | rules/error-role-alert.md | — | `{error && <p>{error}</p>}` renders the failure silently; precedents `OrdersPage.tsx:25`, `OrderDetailPage.tsx:11` | `<p role="alert">{error}</p>` and assert the role in the test |
| major | src/features/orders/ui/OrderActions.test.tsx:6 | rules/test-mocking-boundary.md | — | `vi.mock('../../../lib/http')` replaces a project module — the one shape the rule refuses, and the first `vi.mock` in the repository. The real `request()` never runs, so the URL, the `/api` prefix and the `ApiError` path are unverified | `vi.stubGlobal('fetch', …)` per `src/lib/http.test.ts:15`, unstubbed in `afterEach` |
| major | src/features/orders/ui/OrderActions.tsx:17 | rules/api-error-propagation.md | — | the `catch` reduces the `ApiError` to `(cause as Error).message` in `useState<string \| null>`, discarding `code` and `status` | hold the `ApiError` (`useState<ApiError \| null>`) and render `error.message`, or branch on `code` |
| major | src/features/orders/ui/useCancelOrder.test.ts | CLAUDE.md — "a test sits beside the file it covers" (decision 0022) | — | T2's module ships with no test beside it; its `busy` invariant is unclaimed and, in fact, broken on both paths above | add the file, failing first, covering the no-order and the rejected-call paths |
| major | src/features/orders/ui/OrderActions.tsx:14 | rules/network-through-request.md | — | the POST is written at the call site, not declared in the feature's `api.ts` beside `listOrders`/`getOrder` ("a feature's calls are one line each, declared in its `api.ts`"); same at `useCancelOrder.ts:13`. Both also interpolate the id without `encodeURIComponent`, unlike `api.ts:25` | add `markOrderPaid(id)` and `cancelOrder(id)` to `src/features/orders/api.ts`, encoding the id |
| minor | src/features/orders/refund.ts:1 | defaults #9 / #16 | — | the comment claims "the detail page reads it for its badge"; nothing imports `refund`, and `OrderDetailPage.tsx` renders no badge | drop the claim or wire the badge |

## Coverage
Not reviewed: `src/features/shift/`, `src/features/home/`, `src/main.tsx`, `src/App.tsx` — untouched by the diff.

Two facts, not findings. Nothing outside the three new files imports `OrderActions`, `useCancelOrder` or `refund` (grep over `src`): the barrel `src/features/orders/index.ts` is unchanged, no route renders the component, so the browser recipe cannot reach it and the three green checks exercise the new hook not at all. And `refundLabel` is covered only through its own test.
