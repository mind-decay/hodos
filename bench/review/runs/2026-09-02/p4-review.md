# Review 1 — p4
Verdict: REJECT · blockers 2 · majors 3 · minors 1

## Checks run
- test: `npm test` → 16 passed, 0 failed (3 suites)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems

The checks are green over both blockers below. Nothing in the suite calls `page`, and nothing calls `list` with a `min`, so the green is uninformative for everything this task added.

## Spec
**Missing:**
- T2 — acceptance is `page(orders, 0, 2)` returns the first two and `page(orders, 0, 1)` returns the first one. Executed against the seeded store: `page(orders,0,2)` → `['o-1']`, `page(orders,0,1)` → `[]`. Neither criterion is met.
- T1 — acceptance is that a non-numeric `min` "is rejected with the code the client reads and a 400". `list(null,'abc')` throws a bare `Error` with `code undefined`; `respond.js:20` maps any non-`AppError` to 500 `internal`. The client gets neither the code nor the 400.
- No test covers `min` narrowing, `min` rejection, or `page`. T3's `all` case is the only test added.

**Extra:** `src/server.js:31-34` — a `/health` short-circuit. No task names `src/server.js`, and no task asked for a liveness endpoint.

**Misunderstood:** —

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/services/orders.js:61 | L3 boundary blindspot | `page(orders,0,2)` → `['o-1']`; `page(orders,0,1)` → `[]` | `slice(offset, offset + limit - 1)` returns `limit - 1` rows; at `limit` 1 it returns none. Breaks the invariant "a page of `limit` rows holds `limit` rows where the collection has them" | `slice(offset, offset + limit)` |
| blocker | src/services/orders.js:15 | plan `### Invariants & failure modes` | — | plain `Error`, not `AppError`; `respond.js:20` turns it into 500 `internal` with no client code. Convention 3 (`src/errors.js:2`) says every failure this service reports is an `AppError` | `throw new AppError('invalid_min', 400, ...)` |
| major | src/server.js:31 | plan `### Dependency direction` | — | design says a liveness endpoint "is a row in the route table like every other route"; this bypasses `matchRoute`, so it is invisible to `routes.js` convention 1 and answers 200 to `POST`/`DELETE /health` too | move to a row in `routes.js`, or drop it |
| major | test/services.test.js:14 | defaults #11 (a green test is proved by mutation) | — | no case exercises `min` or `page`; both defects ship green | add the two T2 assertions and the `min` reject case |
| major | src/services/orders.js:14 | L2 type-contract breach | `GET /orders?status=archived&min=abc` | `min` is validated before `status`, so an invalid status is reported as 500 `internal` instead of 400 `invalid_status` | validate `status` first, or raise both as `AppError` |
| minor | src/services/orders.js:14 | plan `### Precedent` (`src/services/orders.js:14`) | — | `Number.isNaN(Number(min))` diverges from the sibling validator at line 47, which uses `Number.isFinite`: `?min=Infinity` passes and returns `[]`; `?min=` (empty) becomes a `>= 0` filter | reuse the `Number.isFinite` guard |

## Coverage
Not reviewed: `.claude/rules/` holds no `*.md` files — only `hodos/config.json` is present — so no project rule precedents were available; findings are drawn from the plan's design fields, the conventions written into `src/errors.js`, `src/routes.js`, `src/http/respond.js` and `eslint.config.js`, and `defaults.md`. `page` has no caller anywhere in the repo (`grep`), so its behavior at the HTTP boundary is unexercised and the offset/limit query parameters are not wired; T2 lists only the service file, so that wiring is read as deferred rather than missing.
