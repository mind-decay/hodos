# Review 1 — p4
Verdict: REJECT · blockers 2 · majors 2 · minors 2

## Checks run
- test: `npm test` → 16 passed, 0 failed (3 suites)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems
- Note: all three are green and none of them touch the new code — `page`, the `min` filter and `/health` have no test between them, so the suite's green says nothing about this diff.

## Spec
Missing: **T2** — the acceptance pair is inverted: `page(orders, 0, 2)` returns 1 order and `page(orders, 0, 1)` returns `[]` (src/services/orders.js:61, verified by running the exported function against the three seeded orders). **T1** — "rejected with the code the client reads and a 400" is unmet: the guard throws a plain `Error` (src/services/orders.js:15), which respond.js:21 turns into 500 `internal`.
Extra: the `/health` branch, src/server.js:31–34 — no task names `src/server.js`.
Misunderstood: —

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/services/orders.js:61 | L3 boundary blindspot | `page(orders, 0, 1)` → `[]`; `page(orders, 0, 2)` → 1 row; `page(orders, 0, 3)` → 2 of 3 | `slice(offset, offset + limit - 1)` yields `limit - 1` rows, so every page silently drops its last row and a limit of 1 returns nothing — against the invariant "a page of `limit` rows holds `limit` rows" | `slice(offset, offset + limit)` |
| blocker | src/services/orders.js:15 | plan `Invariants & failure modes`; errors.js:2 Convention 3 | `GET /orders?min=abc` → 500 `{"error":{"code":"internal"}}` | a plain `Error` leaves the AppError envelope, so a client typo becomes a server error with no code to read | `throw new AppError('invalid_min', 400, ...)`, as list's sibling guard at :20 does |
| major | src/server.js:31 | plan `Dependency direction` ("a liveness endpoint … is a row in the route table like every other route"); routes.js:9 Convention 1 | `POST /health` → 200 `{"status":"ok"}`, where every other path answers an unmatched method with 404 | the branch short-circuits `matchRoute`, so the route is invisible to the one table and to the reachability test at routes.test.js:27, and it answers on any method | add a `GET /health` row to `routes` and delete the branch |
| major | test/services.test.js:19 | decision 0022 test-first; defaults row 11 | — | only T3's case was added; T1's filter, T1's rejection and T2's `page` ship untested, which is why both blockers above pass a green suite | add cases for `min`, for the rejected `min`, and for T2's two acceptance pairs |
| minor | src/services/orders.js:14 | L2 type-contract breach | `GET /orders?min=` → `Number('')` is 0, all 3 orders returned; `?min=Infinity` → 0 orders | `Number.isNaN` admits `''`, `' '` and `Infinity` as valid minimums | reject unless `Number.isFinite(Number(min))` and `min.trim() !== ''` |
| minor | src/services/orders.js:60 | defaults row 8 (a helper has ≥2 callers, or it is inlined) | — | `page` is exported with zero callers (grep over `src`, `test`): the list route never pages, so the helper cannot be exercised in the running service | wire it into the `/orders` handler, or hold it until a caller exists |

## Coverage
`.claude/rules/` holds no rule files — the only file under `.claude/` is `hodos/config.json`. Conventions were therefore judged from the plan's design fields, `skills/run/references/defaults.md`, and the conventions the repository states in-line: routes.js:9 (Convention 1), errors.js:2 (Convention 3), respond.js:4 (Convention 2), eslint.config.js (Convention 4).
The `## Callers` entry (test/server.test.js:31) was checked: it calls `list` through `GET /orders` with no `min`, and the new parameter is optional, so the signature change does not break it.
Not reviewed: `node_modules`, `package-lock.json`, and files the diff does not touch (`src/main.js`, `src/store/orders.js`, `src/http/respond.js`) beyond the one error-mapping path at respond.js:21 the `min` guard reaches.
