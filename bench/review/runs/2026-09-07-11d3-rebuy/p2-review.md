# Review 1 — p2
Verdict: NEEDS_WORK · blockers 0 · majors 4 · minors 1

## Checks run
- test: `npm test` → 9 passed (3 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → clean, 0 problems

## Spec
Missing: T1's second acceptance clause — "an unknown one falls back to `all`". `src/features/orders/ui/useStatusParam.ts:8` casts the raw parameter (`as StatusFilter`) instead of checking it, so an unknown status is returned unchanged; no code in the diff meets the criterion.

Extra: — · Misunderstood: —

Unclaimed: the `null` branch of `params.get('status')` at `src/features/orders/ui/useStatusParam.ts:8` — the absent-parameter path. T1's acceptance names only "a known status in the URL" and "an unknown one"; no acceptance clause exercises a URL with no `status` at all. (T3's `catch` at `api.ts:25` is claimed by T3's acceptance; both `### Invariants & failure modes` clauses are named by T1 and T3.)

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/home/ui/HomePage.tsx:3 | rules/feature-barrel-imports.md (+ plan `### Dependency direction`) | — | deep import `'../../orders/model'` pins home to a file path inside orders; the barrel already exports it (`src/features/orders/index.ts:7`), and this is the only deep cross-feature import in `src` | `import { useOrdersFilter } from '../../orders';` |
| major | src/features/orders/api.ts:26 | rules/api-error-propagation.md | — | `throw new Error(...)` replaces the `ApiError` with a plain `Error`, discarding `code` and `status`; the rule names exactly this ("a new local error type … throws away the status and code") | re-throw the caught `ApiError` with the fuller message, or set the message on an `ApiError` carrying the original `code`/`status` |
| major | src/features/orders/ui/useStatusParam.ts:8 | L2 type-contract breach | `/orders?status=bogus` returns `'bogus'`; `/orders?status=` returns `''`, since `??` does not catch the empty string | an arbitrary string is cast into the four-member `StatusFilter`, so the declared return type is a lie and the URL fallback invariant does not hold | test membership before returning: `const raw = params.get('status'); return isStatusFilter(raw) ? raw : 'all';` |
| major | src/features/orders/ui/useStatusParam.test.ts | CLAUDE.md conventions — "a test sits beside the file it covers" | — | the new module carries T1's whole behaviour and has no test beside it; the run's 9 tests touch none of it | add the file, covering known status, unknown status, and absent parameter |
| minor | src/features/orders/ui/useStatusParam.ts:6 | defaults #8 / #16 | — | the hook has zero call sites — `OrdersPage.tsx:8` still reads the store — so the design's goal, a list that can be linked to, is unreached by the diff | call it from `OrdersPage`, or return it to the plan as a gap |

## Coverage
Not reviewed: `node_modules`, `package-lock.json`, `eslint.config.js` (frozen, untouched). The `ui` browser recipe (`/`, `/orders`, `/orders/:id`) was not exercised — no browser run in this pass. `src/features/shift` and `src/lib/http.ts` are outside the diff; the pre-existing `...init` spread at `http.ts:12-15`, which lets a caller's `headers` clobber the `accept` header the new test asserts, is noted but not a finding here.
