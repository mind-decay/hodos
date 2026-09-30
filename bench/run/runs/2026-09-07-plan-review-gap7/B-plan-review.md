# Plan review — refund-badge
Verdict: GAPS 4

| # | Gap | Location | What an implementer would guess | Fix |
|---|---|---|---|---|
| 1 | invariant clause with no claim (gap 7) | plan.md:31 (failure mode) vs T3 plan.md:52 and Verify plan plain.md:56 | that "a refund request that fails must not blank the order" is covered by T1's 500 case; no task acceptance and no `ui` row renders the page with a failing refund | add a T3 acceptance clause and a `ui` row for the refund-500 page, asserting the order's own content still renders |
| 2 | design contradicts its own clause and `error-role-alert.md` | plan.md:25 (Interfaces) vs plan.md:31 and plan.md:46 | how the refund's error reaches "the page's existing error surface" — `useRefund` returns `{ refund, pending }` with no error member, and per plan.md:23 the page never holds the refund query, so `OrderDetailPage.tsx:11` (`order.isError`) can never show it; also guesses whether the new surface needs `role="alert"` | name the error member on the hook's return and the element that shows it, with `role="alert"` per the rule |
| 3 | typed-state member with no claim (gap 7) | plan.md:25 (`pending: boolean`); no clause in T1/T2/T3 or Verify plan names `pending: true` | what `RefundBadge` renders while the refund query is in flight — nothing, or a placeholder that flashes above the total | state the pending render and add one acceptance clause for it |
| 4 | acceptance not runnable as written | plan.md:49 (T2), plan.md:46 (T1) | how to force "when `useRefund` answers `{ refund: null }`" — the natural read is `vi.mock('./useRefund')`, which `test-mocking-boundary.md` refuses; no repo test renders a `useQuery` component, so the `QueryClientProvider` (and `retry: false`, only in `main.tsx:9`) harness is unnamed | phrase T1/T2 acceptance as stubbed `fetch` statuses and name the provider wrapper |

## Read
plan.md, research.md, .claude/rules/{api-error-propagation,query-key-factory,error-role-alert,test-mocking-boundary,network-through-request,feature-barrel-imports}.md, src/features/orders/{refund.ts,api.ts,index.ts}, src/features/orders/ui/{OrderDetailPage.tsx,OrdersPage.tsx,OrderList.test.tsx}, src/lib/{http.ts,errors.ts}, src/main.tsx, .claude/hodos/config.json
