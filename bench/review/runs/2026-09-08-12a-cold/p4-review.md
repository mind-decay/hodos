# Review 1 — p4
Verdict: REJECT · blockers 2 · majors 2 · minors 3

## Checks run
- test: `npm test` → 16 passed, 0 failed (3 suites), exit 0
- typecheck: `npm run typecheck` → 0 errors, exit 0
- lint: `npm run lint` → clean, exit 0
- Note: the suite is green and covers neither blocker below — no test declaration exercises `page` or `min`. Both defects were reproduced directly (`page(o,0,1)` → `[]`; `GET /orders?min=abc` → `500 {"code":"internal"}`).

## Spec
**Missing:** T1's rejection criterion — "a `min` that is not a number is rejected with the code the client reads and a 400" — is unmet: `src/services/orders.js:15` throws a plain `Error`, which `src/http/respond.js:21` maps to 500 `internal`. T2's two criteria are unmet (see blocker 1). Neither task's criteria are covered by a test declaration: the diff adds `min` and `page` and adds only T3's `all` case.

**Extra:** `src/server.js:31-34` — the `/health` short-circuit. No task lists `src/server.js` in `Files:`.

**Misunderstood:** T2 — `offset + limit - 1` reads `limit` as an inclusive last index, a reading the plan's "a page of `limit` rows holds `limit` rows" does not support.

**Unclaimed:** `page`'s `limit <= 0` → `[]` failure path (`src/services/orders.js:61`) — no `Acceptance:` clause names it. The `/health` success path (`src/server.js:32`) — no task, and so no acceptance clause, exercises it. The design clause "every failure this service reports is an `AppError`" is claimed only for T1's `min` case; the `/health` path added carries no failure envelope at all.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/services/orders.js:62 | L3 boundary | `page(o,0,1)` → `[]`; `page(o,0,2)` → 1 row; `page(o,0,3)` → 2 rows | `slice(offset, offset + limit - 1)` returns `limit - 1` rows, breaking plan invariant "a page of `limit` rows holds `limit` rows" and both T2 criteria | `slice(offset, offset + limit)` |
| blocker | src/services/orders.js:15 | plan `### Invariants & failure modes`; errors.js:2 Convention 3 | `GET /orders?min=abc` → `500 {"code":"internal"}` | plain `Error`, not `AppError`, so `fail()` returns 500 `internal` instead of a 400 the client can read | `throw new AppError('invalid_min', 400, …)` |
| major | src/server.js:31 | plan `### Dependency direction` ("a liveness endpoint … is a row in the route table like every other route"); routes.js:11 Convention 1 | — | `/health` is answered before `matchRoute`, so a reachable route exists outside the one table that answers "what does this API do" | add a `routes` row with a `health` handler |
| major | src/server.js:31 | L5 control-flow escape | `POST /health` → `200 {"status":"ok"}`, body never read, while `POST /orders/o-1` → 404 | the early `return` skips the method match, `readBody` and the `.catch(fail)` envelope | route it through the table |
| minor | src/services/orders.js:14 | L2 type-contract breach | — | `Number.isNaN(Number(min))` accepts `''`, `'  '` and `'Infinity'`: `?min=` silently means no filter, `?min=Infinity` returns `[]` | guard with `Number.isFinite` |
| minor | src/services/orders.js:60 | defaults.md catalogue row 8 | — | `page` has zero callers in `src` — nothing wires offset/limit to a route, so the off-by-one is invisible until it is | wire it or drop it |
| minor | test/services.test.js:12 | defaults.md catalogue row 11 | — | the only added declaration covers T3; `min` and `page` ship with no green test to prove | add the T1 rejection and T2 page cases |

## Coverage
Not reviewed: `node_modules`, `package-lock.json`; `test/routes.test.js` and `test/server.test.js` beyond confirming they pass untouched.

No `.claude/rules/` directory exists at the dispatched path — only `.claude/hodos/config.json`. Conventions were therefore judged against the plan's design fields, `defaults.md`, and the in-repo convention comments (`eslint.config.js:12,25`, `routes.js:11`, `errors.js:2`, `respond.js:4`), with no project rule precedents available.

The package carries no `Mutation:` line, no `## Callers` list and no `## Projects` section: the mutation comparison is skipped per `FORMATS.md §8`, and callers were checked by grep here (`list` → `src/routes.js:14`, tests; `page` → none).
