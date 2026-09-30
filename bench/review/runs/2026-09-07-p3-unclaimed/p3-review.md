# Review 1 — p3
Verdict: REJECT · blockers 2 · majors 4 · minors 1

## Checks run
- test: `npm test` → 5 files, 13 tests passed
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → clean

## Spec
Missing: T1's "a screen reader announces it" — no `role="alert"` on the message (`OrderActions.tsx:26`); T2's "`busy` … false on every path out of it, including the one where there is no order yet" — two of three paths leave it true (`useCancelOrder.ts:12`, `:13`) · Extra: the `Refund` interface (`refund.ts:4`), which no task names and nothing imports · Misunderstood: — · Unclaimed: `'declined'`, the third member of `RefundState` (`refund.ts:2`), is in no `Acceptance:` clause — T4 names `requested` and `approved` only; and the `### Invariants & failure modes` clause "a failed call … puts the reason on the page" has no acceptance clause covering `cancel`, which exposes no error surface at all.

Note: neither `OrderActions` nor `useCancelOrder` has a call site in `src` — nothing renders them and `src/features/orders/index.ts` does not export them (grep). No task ordered the wiring, so this is not counted Missing; it is why the suite is green over both blockers below.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/features/orders/ui/useCancelOrder.ts:12 | L5 control-flow escape | `cancel()` pressed while `order` is `undefined` — the detail page's pending state, `enabled: id !== ''` | `setBusy(true)` sits above the guard, so `return` skips `setBusy(false)` and `busy` latches true forever — the exact path T2 names | set the flag below the guard, or `try { … } finally { setBusy(false); }` |
| blocker | src/features/orders/ui/useCancelOrder.ts:13 | L6 callee-contract mismatch | `request()` throws `ApiError` on any non-OK response or dead network (`src/lib/http.ts:17,19`) — e.g. the 404 `/api` returns in dev | line 14 never runs: `busy` stays true after a failed cancel and the rejection escapes the click handler unhandled | wrap in `try/finally`, and surface the caught `ApiError` per the invariant |
| major | src/features/orders/ui/OrderActions.tsx:26 | rules/error-role-alert.md | — | `{error && <p>{error}</p>}` renders a failure silently; the rule's precedents render the message with `role="alert"` | `<p role="alert">{error}</p>` |
| major | src/features/orders/ui/OrderActions.tsx:17 | rules/api-error-propagation.md | — | the `catch` keeps only `(cause as Error).message`, discarding the `ApiError`'s `code` and `status` — the "a string" case the rule names | hold the `ApiError` in state, read `.message` at render |
| major | src/features/orders/ui/OrderActions.test.tsx:6 | rules/test-mocking-boundary.md | — | `vi.mock('../../../lib/http')` replaces a project module and a plain `Error`, not an `ApiError`; the rule's own evidence is that no `vi.mock()` of project code exists in this repository | `vi.stubGlobal('fetch', …)` with a non-OK response, unstubbed in `afterEach` |
| major | src/features/orders/ui/useCancelOrder.test.ts | CLAUDE.md conventions — a test sits beside the file it covers | — | the hook has no test file; both blockers above are uncovered and unrendered | add the file, covering the no-order, failure and success paths |
| minor | src/features/orders/refund.ts:4 | defaults #16 dead code (#8 no consumer) | — | exported `Refund` interface with no importer anywhere in `src` | delete it |

## Coverage
Read outside the six diffed files only for context, and only where the plan's `### Precedent` pointed: `src/lib/http.ts`, `src/features/orders/api.ts`, `ui/OrderDetailPage.tsx`, `ui/OrderList.tsx`, `index.ts`. The package carried no `## Callers` section; grep confirms the diff's exports have no call site in `src`. Not reviewed: the `ui` browser verify recipe (routes `/`, `/orders`, `/orders/:id`) — not run here; `npm run build` — outside the three checks.
