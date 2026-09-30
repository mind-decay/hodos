# Review 1 — orders-summary
Verdict: NEEDS_WORK · blockers 0 · majors 2 · minors 0

## Checks run
- test: `npm test` → 23 passed (6 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems
- `summarizeOrders` is pure and total as the design ordered — no `sort`/`push` on the caller's array, `byStatus` built locally, and the empty list returns zeros rather than `undefined` (no `L3`/`L4` finding on it).

## Spec
Missing: — · Extra: — · Misunderstood: —

Mutation (major): `src/features/orders/summary.test.ts:12` — the header records `T1 9 tests`, and the diff adds 3 `it` declarations for T1 (`ledger.md:5` — `Task 1: mutation (9 tests)`). A count larger than the declarations is a number nobody ran (decision **0122**). T2 records 3 against 3 declarations in `ui/OrdersPage.test.tsx` and agrees. T3 records 0 under its `Tests: visual` exemption, and the diff adds a lookup map and a `data-status` attribute with no branch and no new condition, so the exemption holds (decision 0022 not triggered).

Unclaimed:
- `src/features/orders/ui/OrdersPage.tsx:12` — the falsy path of `orders.data ? … : null` is reached on a first-load error as well as while pending; T2's acceptance names only "absent while the query is pending", so no acceptance criterion exercises the error path of that branch.
- `### Invariants & failure modes` clause 2 — "it throws for no input, and an unknown status is impossible because `OrderStatus` is a closed union": no `Acceptance:` clause names a throw-freedom or unknown-status path. `request<Order[]>` casts with `as T` (`src/lib/http.ts:20`), so the closed union is a compile-time claim only; under the plan's own `### Data & scale` the fixture cannot produce another shape, which is why this is a claim gap and not a Standards row.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/ui/OrdersPage.tsx:30 | plan `### Refactor in scope` (defaults row 3) | — | the field named `OrderList.tsx:17` and required that "the summary line must not introduce a second spelling of the same formatting"; the diff adds `summary.total.toFixed(2)` while `OrderList.tsx:27` keeps `order.total.toFixed(2)` — the ordered refactor was skipped | extract the money formatter (`summary.ts:10`'s `cents` is the same nuance, currently one caller) and call it from both `OrdersPage.tsx:30` and `OrderList.tsx:27` |

## Coverage
Not reviewed: the `ui` verify recipe's screenshot of `/orders`, which is where T3's "three colours are distinguishable" is settled — not answerable from the diff. `dev-api.ts` and `vite.config.ts` are untouched by the diff. The package carries no `## Callers` section; the exported declarations the diff adds (`summarizeOrders`, `OrderSummary` at `index.ts:8-9`) are new, and a repo-wide grep found their only call site at `OrdersPage.tsx:12`, so the `L1`/`L4`/`L6` caller questions were judged against that one site. Rules `network-through-request`, `query-key-factory`, `feature-barrel-imports`, `api-error-propagation`, `error-role-alert` and `test-mocking-boundary` were each checked against the diff and hold.
