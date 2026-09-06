I'll start by reading config and state.

Phase `finish`. Claim task, read finish reference.

One occurrence only — observation, not a rule. Writing the fold into `plan.md`.

`<slug>` report:

```
orders-summary — 3 tasks, 3 commits, branch feature/orders-summary
Done:
  T1. Summarize the fetched orders (60f229e)
  T2. Show the summary above the list (132fcaf)
  T3. Colour each row by its status (8a22bf2, tests: visual)
Simplify: net -0 lines · markers: none
Gaps (1):
  the plan did not say what the summary shows while the list query is pending — the line is absent until data arrives, confirmed in chat
Rulings (1):
  summarizeOrders lives in summary.ts beside the api types — one consumer today and the plan names no module for it — cost if wrong: one file move
Upgrades (0): —
Review: ACCEPT after 0 fix passes · Verify: PASS, 6 claims, 1 skipped
Fixed after the last review: —
Open minors (1):
  minor src/features/orders/ui/OrderDetailPage.tsx:8 convention — detail query guarded with `enabled: id !== ''`; project says nothing about what a route-parameter-keyed query does before the parameter arrives
Proposals:
  Observation — the `enabled` guard on a route-parameter query occurs once (src/features/orders/ui/OrderDetailPage.tsx:8). One incident, not a convention. No rule proposed.
  Hook proposals: none — no project rule was broken in this task's commits.
```

Checks at review: `npm test` 17 passed · `npm run typecheck` 0 errors · `npm run lint` 0 problems. Verify note: `/api` unserved in this fixture, so browser rows drove the page with `window.fetch` stubbed via the adapter's `initScript`.

Phase `done`. `active` pointer gone, `history.jsonl` appended, tree clean, branch `feature/orders-summary` stays.

**Task directory — your call.** No `AskUserQuestion` in this session, so nothing deleted. `.claude/hodos/tasks/orders-summary/` is kept for want of an answer. Deleting it drops:

- `plan.md` with its `## Outcome`
- `ledger.md` — the full event record
- `evidence/01-orders.png`, `evidence/02-orders-empty.png`

Survives either way: `.claude/hodos/history.jsonl` and the three commits. Say the word and I remove it; otherwise it stays.

Push and merge are yours.

