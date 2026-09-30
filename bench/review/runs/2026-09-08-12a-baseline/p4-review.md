# Review 1 — p4
Verdict: REJECT · blockers 2 · majors 3 · minors 1

## Checks run
- test: `npm test` → 16 passed, 0 failed (3 suites)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems

## Spec
**Missing** — T2: neither acceptance case holds. `page(orders, 0, 2)` returns one order and `page(orders, 0, 1)` returns none (`src/services/orders.js:62`), and no test declares either case. T1, second half: "a `min` that is not a number is rejected with the code the client reads and a 400" is unmet — `src/services/orders.js:15` throws a bare `Error`, which `fail()` reports as `internal`/500 (`src/http/respond.js:20-24`); no test declares the `min` path at all. T1, first half (`min` narrows the list) is met at `src/services/orders.js:17`.

**Extra** — `src/server.js:31-34`: a `/health` endpoint no task asked for, answered before `matchRoute` and outside the route table.

**Misunderstood** — —

**Unclaimed** — `src/services/orders.js:61`, the `limit <= 0` early return: a branch failure path no `Acceptance:` clause names (T2 names only `(0,2)` and `(0,1)`). `src/server.js:31`, the `/health` branch and its `{ status: 'ok' }` body: a path no task's acceptance criterion exercises. No test declaration reaches either.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/services/orders.js:62 | L3 boundary blindspot | `page(all(), 0, 2)` over the 3 seeded orders returns 1 row; `page(x, 0, 1)` returns 0 | `slice(offset, offset + limit - 1)` yields `limit - 1` rows, breaking the plan's invariant "a page of `limit` rows holds `limit` rows" | `slice(offset, offset + limit)` |
| blocker | src/services/orders.js:15 | plan `### Invariants & failure modes` (precedent `src/errors.js:5`) | — | bare `Error`, not `AppError`: `GET /orders?min=abc` answers 500 `internal`, so the client never sees a code or the 400 T1 requires | `throw new AppError('invalid_min', 400, …)` |
| major | src/server.js:31 | plan `### Dependency direction`; `src/routes.js:9-10` Convention 1 | — | the liveness endpoint is not a row in the route table, so `routes.js` no longer answers "what does this API do" | add `{ method: 'GET', pattern: '/health', status: 200, handler: … }` |
| major | src/server.js:31 | L5 control-flow escape | `DELETE /health` (or POST, PUT — any method) | the early return runs before method matching, so every method on `/health` gets 200 instead of the 404 envelope | let the route table match the method |
| major | src/services/orders.js:60 | defaults §11 test-first (decision 0022) | — | new export `page` ships with no test declaration; both T2 cases are unverified, and both in fact fail | add T2's two cases before the fix |
| minor | src/services/orders.js:14 | L3 boundary blindspot | — | only `NaN` is rejected: `?min=` and `?min=%20` coerce to `0` and pass as a filter, unlike `create`'s `Number.isFinite` guard at line 47 | reject a blank/non-finite `min` on the same path |

## Coverage
Not reviewed: `node_modules`, `package-lock.json`, and the two test files the diff does not touch (`test/routes.test.js`, `test/server.test.js`) beyond confirming they still pass.

Conventions were read from `.claude/hodos/config.json`, the plan's design fields, the in-code conventions (`src/routes.js:9`, `src/errors.js:1`, `eslint.config.js`) and `skills/run/references/defaults.md`. `.claude/rules/` does not exist at the dispatched path — the directory is absent, not unreadable — so no rule-file precedent was consulted.

The package carries no `Mutation:` header and no `Tests:` line on any task, so the one added declaration (`test/services.test.js:19`, T3) could not be checked against a recorded count; no finding is raised on that absence. The package carries no `## Callers` section, so no caller list informed L1/L4/L6; the L5 row rests on `src/server.js` itself.
