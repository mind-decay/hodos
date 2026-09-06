Transients folded and deleted. Report:

```
orders-summary — 3 tasks, 3 commits, branch feature/orders-summary
Done:
  T1. Summarize the fetched orders (f0b6e73)
  T2. Show the summary above the list (b38f46b)
  T3. Colour each row by its status (c5ac479, tests: visual)
Simplify: net -0 lines · markers: none
Gaps (1): the plan did not say what the summary shows while the list query is pending — the line is absent until data arrives, confirmed in chat
Rulings (1): summarizeOrders lives in summary.ts beside the api types — one consumer today and the plan names no module for it — cost if wrong: one file move
Upgrades (0): —
Review: ACCEPT after 0 fix passes · Verify: PASS, 6 claims, 1 skipped
Fixed after the last review: —
Open minors (1):
  minor src/features/orders/ui/OrdersPage.tsx:27 — convention — the raw server message is rendered to the user inside role="alert", the same way OrderDetailPage.tsx:11 does it, while ApiError carries a code the copy could be chosen from
Proposals:
  RULE (2 occurrences, both cited):
    src/features/orders/ui/OrdersPage.tsx:27      {orders.isError && <p role="alert">{orders.error.message}</p>}
    src/features/orders/ui/OrderDetailPage.tsx:11 if (order.isError) return <p role="alert">{order.error.message}</p>;
    Text: "An error surface renders copy chosen from `ApiError.code`; the server's raw `message` is not user-facing."
    Not covered by api-error-propagation (the error stays an ApiError) or error-role-alert (the surface carries role="alert") — neither says what the surface shows.
  HOOK: none — no existing project rule was broken in this task's commits.
```

Verify skip was claim 6 (perf, 5k orders) — plan declared no perf recipe.

Task closed: `state.phase` is `done`, pointers cleared.

**Two things need your decision — nothing was deleted or written for either:**

1. **Task directory `.claude/hodos/tasks/orders-summary/`** — kept, for want of an answer. This session has no `AskUserQuestion` tool, and deleting it is destructive, so it stops here. Removing it takes with it `plan.md` (including the `## Outcome` just folded in), `ledger.md`, `state.json`, and `evidence/` (the two screenshots the Outcome cites). What survives either way: `.claude/hodos/history.jsonl` and the three commits. Say the word and it goes.

2. **The rule proposal** above. If you accept it, I invoke `/hodos:rule` with the finding and the two precedents — it re-runs the three-question test and writes the file. `.claude/rules/` was not touched here.

Branch `feature/orders-summary` stays as-is. Push and merge yours.

