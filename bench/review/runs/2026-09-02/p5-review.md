# Review 1 — p5
Verdict: REJECT · blockers 1 · majors 5 · minors 1

## Checks run
- test: `npm test` → 16 passed, 0 failed
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 1 error (src/services/orders.js:2 `no-restricted-imports`)

## Spec
Missing: T2 — "a created order carries the date it was created, and `since` returns exactly the orders at or after it — seeded and created alike" is not met: the created stamp is not the seeds' format (see blocker), and no test covers the `since` branch.
Extra: `createInto` and its `ok` import (`src/services/orders.js:2,51-58`), and the CORS constant and header (`src/server.js:8,32`) — `src/server.js` is in no task's `Files` list, and both sit under `## Non-goals`.
Misunderstood: —
T1 and T3 are met: every seed carries `createdAt`, the typedef says so, and the POST row's 201 is asserted.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/services/orders.js:48 | L9 time and locale (plan Invariants: "one format everywhere it is written or compared") | `LANG=en_GB` — `create({customer:'Barbara',total:7})` stamps `"02/09/2026"`; `list(null,'2026-01-01')` then returns only `o-1,o-2,o-3` and drops the order just created | `toLocaleDateString()` is locale- and time-zone-dependent, so `createdAt` is never the seeds' ISO shape and `order.createdAt >= since` compares two different formats. Under de-DE it is `2.9.2026`; under en-US `9/2/2026` passes only by accident of `'9' > '2'`, and two created orders still sort wrong (`10/1` < `9/2`) | `new Date().toISOString().slice(0, 10)` |
| major | src/services/orders.js:2 | lint `no-restricted-imports` / plan Dependency direction | — | the service imports `src/http/respond.js`; convention 4 and the plan keep response writing in respond.js "and only its" | drop the import with `createInto` |
| major | src/services/orders.js:56 | defaults #16 dead code, #8 helper with <2 callers | — | `createInto` has no caller in `src` or `test`. A handler that used it would write the response, then `src/server.js:41` calls `ok()` again on the return — the double write convention 2 exists to prevent | delete it |
| major | src/server.js:8 | plan Non-goals / defaults #13 | — | new env var `CORS_ORIGIN`; Non-goals: "no new environment variables, nothing this service reads from its environment that it does not read today" | remove |
| major | src/server.js:32 | plan Non-goals / defaults #13 | — | a CORS header on every response; Non-goals: "no CORS" | remove |
| major | src/services/orders.js:15 | plan T2 acceptance / defaults #11 | — | the `since` branch has no test — `test/services.test.js` is untouched, so the only behavior T2 adds is unproven, and it is the branch that is broken | add a case asserting a created order is returned for a `since` at or before today |
| minor | src/routes.js:14 | L2 type-contract breach | `GET /orders?since=banana` → `[]` with 200 | `since` reaches the comparison unvalidated, unlike `status`, which throws a 400 at `src/services/orders.js:17`; a malformed value silently yields wrong results instead of an error | validate the shape and throw `AppError('invalid_since', 400, ...)` |

## Coverage
Not reviewed: `.claude/rules/` holds no `.md` files at the dispatched path, so conventions were read from the plan's design fields, the defaults list, and the rules `eslint.config.js` and the `Convention 1/2/4` comments encode. `node_modules` and `package-lock.json` untouched by the diff and not read.
