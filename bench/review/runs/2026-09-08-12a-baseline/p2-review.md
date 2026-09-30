# Review 1 — p2
Verdict: NEEDS_WORK · blockers 0 · majors 5 · minors 1

## Checks run
- test: `npm test` → 18 passed (4 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems

## Spec
Missing: T1's second acceptance clause — "an unknown one falls back to `all`" — is met by nothing in the diff; `useStatusParam` casts whatever the URL holds (`src/features/orders/ui/useStatusParam.ts:8`). T3's acceptance ("a failed list request reaches the page with a message naming what failed") has no test declaration: the one test the diff adds covers the `accept` header, an in-scope aside, not the failure message.

Extra: —

Misunderstood: T2 names the filter from the zustand store (`src/features/home/ui/HomePage.tsx:6`), which `### Architecture alternatives` records as the shape "before this task … it cannot be linked to, which is the goal". The URL half the design ordered has no caller anywhere in `src`.

Unclaimed: the "no `status` key in the URL at all" path — the `?? 'all'` half of `src/features/orders/ui/useStatusParam.ts:8` — is a branch T1's acceptance does not name; it names a known status and an unknown one only. And the thrown type of `listOrders` widens from `ApiError` to plain `Error` at `src/features/orders/api.ts:26`; no acceptance clause names the error type a failed list request delivers.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/ui/useStatusParam.ts:8 | L2 type-contract breach | `/orders?status=bogus` — the hook returns `'bogus'` typed as `StatusFilter` | `as StatusFilter` asserts a four-member union over an arbitrary string; the plan's invariant "falls back to `all`" is never executed | test membership: `const raw = params.get('status'); return (['all','open','paid','cancelled'] as const).includes(raw as StatusFilter) ? raw as StatusFilter : 'all'` |
| major | src/features/orders/api.ts:26 | rules/api-error-propagation.md | — | the caught `ApiError` is replaced by a plain `Error`; `code` and `status` are dropped at the one boundary that produces them, so the caller at `OrdersPage.tsx:10` can no longer tell 404 from a dead network | re-throw the `ApiError` (message can be composed into a new `ApiError(error.code, error.status, …)`), never a bare `Error` |
| major | src/features/home/ui/HomePage.tsx:3 | rules/feature-barrel-imports.md (and `### Dependency direction`) | — | `features/home` reaches into `../../orders/model`, a file path inside another feature, though the barrel already exports it (`src/features/orders/index.ts:7`) | `import { useOrdersFilter } from '../../orders';` |
| major | src/features/orders/ui/useStatusParam.test.ts | decision 0022 / CLAUDE.md "a test sits beside the file it covers" | — | the new module has no test; both halves of T1's acceptance are unverified and no exemption of `DESIGN.md §6.2` applies to a pure hook | add the file: known status returned, unknown falls back, absent falls back |
| major | src/features/orders/api.test.ts | decision 0022 / defaults #10 | — | the `catch` added at `api.ts:25-27` is untested; nothing asserts the message a failed list request delivers, which is T3's whole criterion | add the file, stub `fetch` per rules/test-mocking-boundary.md, assert the rejection's message and type |
| minor | src/features/orders/ui/useStatusParam.ts:6 | defaults #8 / #16 | — | the exported hook has zero callers in `src`; the diff ships the URL half without connecting it, so no list is linkable yet | wire it into `OrdersPage`, or record the wiring as the next task |

## Coverage
The package carries no `Mutation:` header and the tree has no `ledger.md`, so the mutation record for the single added declaration (`src/lib/http.test.ts:36`) could not be compared — `— (ledger.md unreadable)`.
Not reviewed: `src/features/shift/**`, `dev-api.ts`, `vite.config.ts`, `eslint.config.js` — untouched by this diff. One check was run outside the diff: a repository-wide grep for `useStatusParam`, which returned only its own declaration.
