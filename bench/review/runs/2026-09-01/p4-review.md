# Review 1 — p4
Verdict: REJECT · blockers 2 · majors 1 · minors 1

## Checks run
- test: `npm test` → 16 passed, 0 failed (3 suites)
- typecheck: `npm run typecheck` → 0 errors (exit 0)
- lint: `npm run lint` → clean, 0 problems (exit 0)

All three are green, and both blockers below are green with them: no test calls `page`, and no test drives a non-numeric `min`.

## Spec
**Missing:**
- T2 — acceptance is `page(orders, 0, 2)` returns the first two orders and `page(orders, 0, 1)` returns the first one. Measured: `page(orders,0,2)` → `['o-1']` (1 row), `page(orders,0,1)` → `[]` (0 rows). Neither half holds.
- T1 — acceptance is "a `min` that is not a number is rejected with the code the client reads and a 400". `src/services/orders.js:15` throws a bare `Error`, which `fail()` (`src/http/respond.js:20-21`) rewrites to code `internal` / status 500. The client reads neither the code nor the 400.

**Extra:** `src/server.js:31-34`, a `/health` handler. No task names `src/server.js`, and no task asks for a liveness endpoint.

**Misunderstood:** —

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/services/orders.js:61 | L3 boundary blindspot (and plan Invariants: "a page of `limit` rows holds `limit` rows") | `page(orders, 0, 1)` returns `[]`; `page(orders, 0, 2)` returns 1 row | `slice(offset, offset + limit - 1)` drops the last row of every page; at `limit === 1` the page is always empty | `slice(offset, offset + limit)`, plus a test for `limit === 1` |
| blocker | src/services/orders.js:14-15 | plan Invariants & failure modes; `src/errors.js:1-4` Convention 3 | `GET /orders?min=abc` answers 500 `{"error":{"code":"internal"}}` | a bare `Error` leaves the service; every failure this service reports must be an `AppError` carrying the client's code | `throw new AppError('invalid_min', 400, 'min must be a number')` |
| major | src/server.js:31-34 | plan Design ("a liveness endpoint … is a row in the route table like every other route"); `src/routes.js:8-10` Convention 1 | — | `/health` short-circuits above `matchRoute`, so it is outside the one table that answers "what does this API do"; it also answers every method (`POST /health` → 200) and returns without draining the request body | delete it, or add `{ method: 'GET', pattern: '/health', status: 200, handler: () => ({ status: 'ok' }) }` to `routes` |
| minor | src/services/orders.js:14 | L2 type-contract breach | `GET /orders?min=` sends `min === ''`; `Number('')` is `0`, not `NaN` | an empty or whitespace `min` passes the numeric guard and then filters nothing, so a malformed query is silently treated as no filter | reject when `min.trim() === ''` alongside the `NaN` check |

## Coverage
Reviewed: the four changed files against the plan's Design, Tasks, and Non-goals, and against the conventions carried in `eslint.config.js`, `src/errors.js`, `src/routes.js`, and `src/http/respond.js`. `.claude/rules/` holds no rule files in this repo (only `.claude/hodos/config.json` exists), so the convention pass ran on those in-repo conventions, the plan's design fields, and `defaults.md`.

Not reviewed: files outside the diff (`src/store/orders.js`, `src/http/respond.js`, `test/routes.test.js`, `test/server.test.js` were read for context only, not judged). `page` has no caller anywhere in the tree, so its off-by-one is currently unreachable from HTTP — the blocker stands because T2 states the helper's contract in exact returns and the plan lists it in `### Interfaces`.
