# Plan review — refund-badge
Verdict: GAPS 4

| # | Gap | Location | What an implementer would guess | Fix |
|---|---|---|---|---|
| 1 | claim missing for a typed state member | plan.md:49 (T2), plan.md:56 (ui row) | `RefundState` has three members (`src/features/orders/refund.ts:2`: `requested \| approved \| declined`); only two are claimed. Whether `declined` renders "Refund declined", renders nothing, or crashes on a missing label is untested — that path reaches no row in `verify.md` and ships unexercised | add a `declined` clause to T2's acceptance and to the ui row |
| 2 | claim missing for a failure-mode clause | plan.md:31 vs T3 acceptance (plan.md:52) and Verify plan (plan.md:55-56) | "a refund request that fails must not blank the order" is claimed nowhere: T1 stops at the hook's error state, T3 names only refund/no-refund. The exact risk research.md:17-19 raises goes unverified | add a T3 acceptance clause: a 500 on the refund leaves the order body rendered, and a ui row for it |
| 3 | interface contradicts the failure mode | plan.md:25 vs plan.md:31, plan.md:46 | `useRefund` returns `{ refund, pending }` only — no error. The page's "existing error surface" (`OrderDetailPage.tsx:11`) reads `order.error`, not the refund query's, so a 500 has no route to any surface. Implementer guesses: expose `error`, render a `role="alert"` inside the badge (rule `error-role-alert.md`), or swallow it | name the surface in Interfaces: what the hook returns on error and which element shows it |
| 4 | acceptance not runnable as written | plan.md:49 ("when `useRefund` answers `{ refund: null }`") | `RefundBadge` takes only `orderId`, so the hook's answer cannot be injected; `test-mocking-boundary.md:43-45` refuses `vi.mock()` of a project module. Implementer either breaks the rule or invents a fetch-stub + `QueryClientProvider` harness the plan never names | restate T2's acceptance as a 200/404 fetch stub and name the provider wrapper |

## Read
plan.md, research.md, .claude/rules/{api-error-propagation,query-key-factory,error-role-alert,test-mocking-boundary,network-through-request,feature-barrel-imports}.md, src/features/orders/{refund.ts,api.ts,index.ts}, src/features/orders/ui/OrderDetailPage.tsx, src/lib/{http.ts,errors.ts}
