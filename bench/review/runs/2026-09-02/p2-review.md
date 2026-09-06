# Review 1 — p2
Verdict: REJECT · blockers 1 · majors 4 · minors 1

## Checks run
- test: `npm test` → 9 passed (3 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → clean

## Spec
**Missing:** T1's acceptance — "an unknown one falls back to `all`". `useStatusParam.ts:8` returns whatever the parameter holds under a cast; there is no fallback and no test beside the module for either half of the criterion. The plan's `### Invariants & failure modes` ("falls back to `all` rather than rendering an empty list with no explanation") is therefore unrealised.

**Extra:** — (the `accept` case in `http.test.ts` is authorised by `### Refactor in scope`.)

**Misunderstood:** T2. `HomePage.tsx:6` names the zustand store's status — the shape `### Architecture alternatives` records as the one this task replaces ("it cannot be linked to, which is the goal"). The URL hook the plan's `### Interfaces` defines is left with no caller, so `/?status=paid` still prints the store's value.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/features/orders/ui/useStatusParam.ts:8 | L2 type-contract breach | `?status=bogus` returns `'bogus'`; `?status=` returns `''` (`??` does not catch the empty string) — both typed `StatusFilter` | `as StatusFilter` passes any string across the boundary; callers, `keys.list()` and `listOrders()` receive a value outside the union | test membership against the union and return `'all'` otherwise |
| major | src/features/orders/api.ts:26 | rules/api-error-propagation.md | a 404 from `/api/orders?status=all` | the `catch` replaces the `ApiError` with a plain `Error`, dropping `code` and `status` — exactly the case the rule's "What it prevents" names | re-throw the `ApiError`, or raise a new `ApiError` carrying its `code` and `status` |
| major | src/features/home/ui/HomePage.tsx:3 | rules/feature-barrel-imports.md · plan `### Dependency direction` | — | deep import `../../orders/model` bypasses the barrel, which already exports `useOrdersFilter` (`orders/index.ts:7`) | import from `'../../orders'` |
| major | src/features/orders/ui/useStatusParam.test.ts | CLAUDE.md — "a test sits beside the file it covers" | — | T1's acceptance behaviour has no test; the module is the only untested source file in `src` | add the beside-test for a known status and an unknown one |
| major | src/features/orders/ui/useStatusParam.ts:6 | defaults #16 dead code (#8 helper with no consumer) | — | the module has zero callers (grep across `src`) and is not on the feature barrel | wire it into the page that names the filter, or drop it |
| minor | src/lib/http.test.ts:39 | defaults #11 — a green test proved by mutation | — | "on every request" is proved only for the init-less call; `request('/x', { headers: {...} })` spreads `init` over `headers` and drops `accept` entirely | assert the header with an `init` also passed |

## Coverage
Not reviewed: files outside the diff except `orders/api.ts`, `orders/model.ts`, `orders/index.ts`, `lib/http.ts`, `lib/errors.ts` and the two order pages, read as the diff's direct callers and callees. The browser recipe (`/`, `/orders`, `/orders/:id`) was not run; `/api` 404s in dev by design. Not a finding, no location to hang it on: the work sits on `main`, while `conventions.branch` is `feature/{slug}`.
