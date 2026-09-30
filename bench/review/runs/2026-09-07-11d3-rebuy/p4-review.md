# Review 4 — p4
Verdict: REJECT · blockers 1 · majors 3 · minors 1

## Checks run
- test: `npm test` → 16 passed, 0 failed (3 suites)
- typecheck: `npm run typecheck` → 0 errors (exit 0)
- lint: `npm run lint` → clean, 0 problems (exit 0)
- note: all three pass on this diff; every finding below is invisible to them because no test covers the two behaviours the diff adds.

## Spec
**Missing:** T1's rejection criterion — `min` that is not a number must be rejected "with the code the client reads and a 400"; `src/services/orders.js:15` throws a bare `Error`, so `GET /orders?min=abc` answers `500 {"code":"internal"}` (verified against the running app). T2's both criteria — `page(orders, 0, 2)` must return the first two and `page(orders, 0, 1)` the first one; `src/services/orders.js:62` returns `['o-1']` and `[]`.

**Extra:** `src/server.js:31-34` — a `/health` handler no task asks for, which the plan's `### Dependency direction` pre-emptively places "a row in the route table like every other route".

**Misunderstood:** —

**Unclaimed:** the `limit <= 0 → []` failure path at `src/services/orders.js:61` — no `Acceptance:` clause names a non-positive limit; the `{ status: 'ok' }` response state added at `src/server.js:32` — no claim covers it.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/services/orders.js:62 | L3 boundary blindspot | `page(all(), 0, 2)` → `['o-1']`; `page(all(), 0, 1)` → `[]`; `page(all(), 0, 3)` → 2 rows | `slice(offset, offset + limit - 1)` is short by one on every limit, so each page silently drops its last row; contradicts the plan invariant "a page of `limit` rows holds `limit` rows where the collection has them" | `slice(offset, offset + limit)` |
| major | src/services/orders.js:15 | src/errors.js:2 Convention 3 (also plan `### Invariants & failure modes`, `### Precedent`) | — | bare `Error` where the file's own precedent 5 lines below throws `AppError`; `respond.js:21` maps it to `internal`/500, so a client input error reads as a server fault and the code is unreachable to the client | `throw new AppError('invalid_min', 400, ...)`, and validate before or after the status check consistently |
| major | src/server.js:31 | src/routes.js:9 Convention 1 (also plan `### Dependency direction`) | — | `/health` short-circuits above `matchRoute`, so a route exists that the one table does not answer for; it also ignores the method — `POST /health` and `DELETE /health` both return `200 {"status":"ok"}` (verified), unlike every table route | add the row `{ method: 'GET', pattern: '/health', status: 200, handler: … }` and delete the branch |
| major | test/services.test.js:12 | decision 0022 test-first | — | the diff adds `page` and the `min` parameter with no test for either; the only test added covers T3's pre-existing `all` case. The T2 criterion written as a call — `page(orders, 0, 2)` — would have caught the blocker above | add the two `page` cases and the `min` narrow/reject cases |
| minor | src/services/orders.js:14 | L2 type-contract breach | `?min=` → `Number('') === 0`, all 3 orders returned as if no filter; `?min=Infinity` → passes, returns `[]` | `Number.isNaN(Number(min))` admits `''`, whitespace and `Infinity`, where `create`'s precedent at line 47 uses `Number.isFinite` | `const n = Number(min); if (min.trim() === '' \|\| !Number.isFinite(n)) throw …` |

## Coverage
Not reviewed: `.claude/rules/` does not exist at the dispatched path (the directory holds only `hodos/config.json`), so no project rule file was readable; conventions were judged against the plan's design fields, the four numbered in-code conventions (`src/routes.js:9`, `src/http/respond.js:4`, `src/errors.js:2`, `eslint.config.js:25`) and `defaults.md`. `node_modules/` and `package-lock.json` untouched by the diff and unread. `page` has no caller anywhere in the tree, so its behaviour under the list route's real offset/limit inputs cannot be verified from this diff.
