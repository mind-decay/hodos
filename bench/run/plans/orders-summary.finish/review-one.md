# Review 1 — orders-summary
Verdict: ACCEPT · blockers 0 · majors 0 · minors 1

## Checks run
- test: `npm test` → 17 passed
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems

## Spec
Missing: — · Extra: — · Misunderstood: —

T1's summary is pure and total as the plan's invariants require, T2 renders it from the query's data only, and T3's colours come from the status the API already returns. Nothing outside `## Tasks` was touched.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| minor | src/features/orders/ui/OrderDetailPage.tsx:8 | convention | — | the detail query is guarded with `enabled: id !== ''` and nothing in the project says what a query whose key depends on a route parameter does before that parameter arrives — this is the feature's only such query | say it once, where the feature's queries are declared |

## Coverage
Not reviewed: `src/lib/http.ts` and its suite — outside `base..HEAD`.
