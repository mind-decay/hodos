# Review 1 — p2
Verdict: NEEDS_WORK · blockers 0 · majors 6 · minors 0

## Checks run
- test: `npm test` → 9 passed (3 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → clean, no output

## Spec
Missing: T1's acceptance — "an unknown one falls back to `all`" — is met by nothing in the diff; `useStatusParam.ts:8` casts whatever the URL holds. Missing: the URL half is never wired to a list. `useStatusParam` has no consumer anywhere in `src` (grep: only its own definition) and is not on the orders barrel, while `OrdersPage.tsx:8` still reads the zustand store, so `/orders?status=open` renders the store's value and the design's stated goal — a filter that "can be linked to" — is not reached by this diff.
Extra: — (the `accept`-header case in `http.test.ts:39` is named by `Refactor in scope`).
Misunderstood: —

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/ui/useStatusParam.ts:8 | L2 type-contract breach | `/orders?status=bogus`, and `/orders?status=` where `get` returns `''` so `?? 'all'` never fires | `as StatusFilter` asserts a union membership never checked; an unknown value is returned typed as one of the four, and the invariant "falls back to `all` rather than rendering an empty list with no explanation" fails | test membership against the four values of `model.ts:3` and return `'all'` otherwise |
| major | src/features/orders/ui/useStatusParam.test.ts | CLAUDE.md conventions — a test sits beside the file it covers | — | new logic module ships with no test; the known/unknown/empty branches of T1's acceptance are unverified, which is why the row above survived | add the file beside the hook, rendering it under `MemoryRouter` per `test-mocking-boundary` |
| major | src/features/orders/ui/useStatusParam.ts:6 | plan `Architecture alternatives` / defaults #16 | — | the hook has zero callers and is absent from `features/orders/index.ts`; the store remains the sole source at `OrdersPage.tsx:8`, so the task adds an unreachable module | read the status from the hook in `OrdersPage`, keying the query with `keys.list(status)` |
| major | src/features/home/ui/HomePage.tsx:3 | rules/feature-barrel-imports.md; plan `Dependency direction` | — | `../../orders/model` reaches inside another feature, pinning `home` to a file path `orders` never promised; the barrel already exports it at `index.ts:7` | `import { useOrdersFilter } from '../../orders';` |
| major | src/features/orders/api.ts:26 | rules/api-error-propagation.md | — | the `catch` replaces the `ApiError` with a plain `Error`, discarding `code` and `status`; the rule requires the caught error re-thrown or its `code` branched on | throw an `ApiError` carrying the original `code`/`status` with the new message |
| major | src/features/orders/api.test.ts | CLAUDE.md conventions — a test sits beside the file it covers | — | T3's acceptance has no test: the only test added covers the `accept` header in `http.ts`, not the failure message `listOrders` now produces | add the file, stubbing `fetch` at the boundary, asserting the surfaced error's message and that it is still an `ApiError` |

## Coverage
Not reviewed: `node_modules`, `package-lock.json` and the pinned versions (frozen by project decision). No browser pass — the config's `ui` recipe over `/`, `/orders`, `/orders/:id` was not run, so the rendered layout of the new `HomePage` line is unverified here. `eslint.config.js` read but not evaluated as a subject; it is unchanged by the diff.
