# Review 1 — p5
Verdict: REJECT · blockers 1 · majors 4 · minors 0

## Checks run
- test: `npm test` → 16 passed, 0 failed (3 suites)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → **1 error** (src/services/orders.js:2 `no-restricted-imports`: `'../http/respond.js' import is restricted`)

## Spec
Missing: T2 acceptance — "`since` returns exactly the orders at or after it, seeded and created alike" is not met for created orders (see blocker below); no test in the diff exercises `since`.
Extra: `createInto` (src/services/orders.js:51-58), zero callers; CORS header and `CORS_ORIGIN` env var (src/server.js:8,32), both named in `## Non-goals`.
Misunderstood: —

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/services/orders.js:48 | plan `### Invariants & failure modes` ("`createdAt` is one format everywhere it is written or compared") · L9 time/locale | `create({customer:'Zoe',total:5})` today stamps `"9/1/2026"`; `list(null,'2026-12-31')` then returns that order — verified by running the module. Created in January it is instead excluded from *every* `since` filter (`'1/…' < '2026-…'`) | `new Date().toLocaleDateString()` writes host-locale, host-TZ `M/D/YYYY`, not the seeds' ISO `YYYY-MM-DD`; the `>=` string compare on line 15 keys off the leading month digit, so results are false-positive for months 3–9 and false-negative for 1,2,10,11,12. Locale also varies the format (`15.6.2026` in de-DE) | `createdAt: new Date().toISOString().slice(0, 10)` |
| major | src/server.js:8, 32 | plan `## Non-goals` ("no new environment variables, no CORS, nothing this service reads from its environment") · defaults #13 | — | Adds `process.env.CORS_ORIGIN` and a wildcard `access-control-allow-origin: *` on every response, including error envelopes. Nothing in T1–T3 asks for it | Revert both lines |
| major | src/services/orders.js:2 | lint `no-restricted-imports` · eslint Convention 4 | — | Lint is red on this diff: the service layer imports `../http/respond.js` | Drop the import |
| major | src/services/orders.js:51-58 | plan `### Dependency direction` ("writing a response stays `src/http/respond.js`'s job, and only its") · defaults #8, #16 | — | `createInto` writes a response from the service layer and has no caller anywhere in `src/` or `test/` | Delete the function |
| major | test/services.test.js (untouched) | T2 acceptance · defaults #11 | — | The `since` branch (services/orders.js:15) ships with no test; the suite covers all six other `list`/`create` branches. A single create-then-`since` case would have caught the blocker | Add a case asserting a created order is returned for a past `since` and excluded for a future one |

## Coverage
`.claude/rules/` does not exist at the dispatched path — no rule files were read; conventions were taken from `eslint.config.js` (Conventions 2 and 4), the in-code convention comments, the plan's design fields, and the defaults list. `src/store/orders.js` `all()` returns a fresh array, so the new `.filter` chain carries no L4 hazard. Not reviewed: `node_modules`, `package-lock.json`.
