# Review p5 — createdAt and the since filter
Verdict: REJECT · blockers 1 · majors 4 · minors 0

## Checks run
- test: `npm test` → 16 passed, 0 failed (3 suites)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 1 error (src/services/orders.js:2 no-restricted-imports)

## Spec
Missing: T2's acceptance — "a created order carries the date it was created, and `since` returns exactly the orders at or after it — seeded and created alike" is not met: the created stamp is written in a different format from the seeds (src/services/orders.js:48), so the comparison at :15 does not order the two alike. T2 also ships with no test for `since` or `createdAt`.

Extra: `createInto` (src/services/orders.js:51-58), a response-writing helper no task asked for and nothing calls. CORS header and the `CORS_ORIGIN` environment variable (src/server.js:8, :32) — `src/server.js` is named in no task's Files line, and the plan's Non-goals bars both by name.

Misunderstood: —

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/services/orders.js:48 | L9 time and locale | POST an order on 2026-09-06 → stored `9/6/2026`; `GET /orders?since=2027-01-01` returns it, and the same order created in January (`1/5/2026`) is dropped by `?since=2026-01-01` | `toLocaleDateString()` writes a locale- and zone-dependent format while the seeds are ISO `2026-01-05`; the string compare at :15 then compares two different formats — the plan's invariant ("one format everywhere it is written or compared") is broken | `new Date().toISOString().slice(0, 10)` |
| major | src/services/orders.js:2 | lint no-restricted-imports | — | the service imports `../http/respond.js`; eslint's Convention 4 layering rule bans it and the lint check fails on it | drop the import |
| major | src/services/orders.js:56 | plan design: Dependency direction ("writing a response stays `src/http/respond.js`'s job, and only its") · defaults #16 dead code | — | `createInto` writes the response from the service layer, and has no caller anywhere in `src/` or `test/` | delete the function |
| major | src/server.js:8 | plan design: Non-goals ("no new environment variables, no CORS") · defaults #13 | — | new `CORS_ORIGIN` env var here and `access-control-allow-origin` set on every response at :32, including 404s; the plan excludes both | remove both lines |
| major | test/services.test.js | decision 0022 test-first · defaults #11 | — | T2's whole behaviour — the `since` filter and the `createdAt` stamp — has no test; the format defect above is exactly what one would have caught. The only test added covers T3 | add a `since` case over a seeded and a created order |

## Coverage
`.claude/rules/` exists but holds no rule files, so conventions were judged on the plan's design fields, the convention comments carried in `eslint.config.js`, and the defaults list.

The four `list` call sites from `## Callers` were checked: all pass one argument, and the new second parameter is optional — no caller breaks, no finding.

Not reviewed: `node_modules`; and the pre-existing id generation `o-${all().length + 1}` at src/services/orders.js:48, which this diff only touched to append the new field.
