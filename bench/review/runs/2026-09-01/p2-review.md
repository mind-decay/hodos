# Review 1 — p2
Verdict: NEEDS_WORK · blockers 0 · majors 3 · minors 2

## Checks run
- test: `npm test` → 9 passed (3 files), including the new `asks for JSON on every request`
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems

## Spec
Missing: T1's second acceptance criterion — "an unknown one falls back to `all`". `useStatusParam.ts:8` casts whatever the URL holds (`as StatusFilter`) instead of validating it, so nothing in the diff meets it. The plan's `Invariants & failure modes` names the same fallback.

Extra: —

Misunderstood: T3. "A message naming what failed" was read as *replace* the error — `api.ts:26` throws a new plain `Error`. The plan's invariant asks the failure to *reach the page* readable, and it already did: `OrdersPage.tsx:25` renders `orders.error.message` in a `role="alert"`. The prefix is the only gain; `code` and `status` are the cost.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/ui/useStatusParam.ts:8 | T1 acceptance · plan `Invariants` · L2 type-contract breach | `/orders?status=bogus` returns `'bogus'`; `/orders?status=` returns `''`, since `??` only catches `null` | the cast asserts a `StatusFilter` the value need not be; a bogus status flows into `keys.list()` and the request, giving the empty list with no explanation the invariant forbids | test membership in the four `StatusFilter` values and return `'all'` otherwise |
| major | src/features/orders/api.ts:23-27 | rules/api-error-propagation.md | — | the `catch` converts the `ApiError` from `request()` into a plain `Error`, dropping `code` and `status` — the rule's named failure verbatim ("a new local error type ... throws away the status and code") | drop the try/catch and let the `ApiError` travel; if the prefix is wanted, rethrow `new ApiError(error.code, error.status, ...)` or add the wording at the page |
| major | src/features/home/ui/HomePage.tsx:3 | rules/feature-barrel-imports.md · plan `Dependency direction` | — | `'../../orders/model'` is a deep import into another feature; the plan required the public surface, and `src/features/orders/index.ts:7` already exports `useOrdersFilter` | `import { useOrdersFilter } from '../../orders';` |
| minor | src/features/orders/ui/useStatusParam.ts:6 | defaults #8, #16 (dead code, zero callers) | — | `grep -rn useStatusParam src/` finds only the declaration; `OrdersPage.tsx:8` still reads the store, so the plan's goal — a filtered list that can be linked to — is not reachable | wire it into `OrdersPage`, or drop it; if the plan owes a wiring task, raise it as a `Gap:` |
| minor | src/features/orders/ui/useStatusParam.ts | CLAUDE.md conventions ("a test sits beside the file it covers") | — | a new module with a branch and no `useStatusParam.test.ts`; the missing fallback above is exactly what such a test would have caught | add the two cases: a known status, and an unknown one falling back to `all` |

## Coverage
Not reviewed: files outside the diff, apart from one targeted grep for callers of `useStatusParam` and a read of the `orders` barrel to confirm `useOrdersFilter` is exported. The `ui` verify recipe (routes `/`, `/orders`, `/orders/:id`) was not run — no dev server was started, so the rendered layout of the new `Filter in effect:` line is unverified.
