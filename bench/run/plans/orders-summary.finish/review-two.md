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
| minor | src/features/orders/ui/OrdersPage.tsx:27 | convention | — | the raw server message is rendered to the user inside `role="alert"`, the same way `OrderDetailPage.tsx:11` does it, while `ApiError` carries a `code` the copy could be chosen from | one place decides what a failed query shows, keyed on `ApiError.code` |

## Coverage
Not reviewed: `src/lib/http.ts` and its suite — outside `base..HEAD`.
