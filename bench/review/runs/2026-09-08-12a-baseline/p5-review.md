# Review 1 — p5
Verdict: REJECT · blockers 1 · majors 5 · minors 0

## Checks run
- test: `npm test` → 16 passed, 0 failed (exit 0)
- typecheck: `npm run typecheck` → 0 errors (exit 0)
- lint: `npm run lint` → 1 error, exit 1 (src/services/orders.js:2 no-restricted-imports)

## Spec
Missing: T2 — "`since` returns exactly the orders at or after it — seeded and created alike" is not met: the created order is stamped in another format than the seeds (src/services/orders.js:48), so the seeded/created comparison does not hold, and no test declaration in the diff exercises `since` or the stamp.

Extra: the CORS constant and header (src/server.js:8, :32) — `src/server.js` is in no task's Files, and `## Non-goals` excludes "no new environment variables, no CORS"; `createInto` (src/services/orders.js:56) — no task asked for it and it has no caller in `src` or `test`.

Misunderstood: —

Unclaimed: the `### Invariants & failure modes` clause "`createdAt` is one format everywhere it is written or compared" — no `Acceptance:` clause names a format (T1 says "carries a `createdAt`", T2 "carries the date it was created"), and it is the clause the diff breaks. The no-filter branch `since === undefined` at src/services/orders.js:15 is named by no acceptance clause either.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/services/orders.js:48 | L9 time and locale | create an order on 2026-09-08, then `GET /orders?since=2026-10-01`: `'9/8/2026' >= '2026-10-01'` is `true` (verified in node), so a September order is returned for an October cutoff | `new Date().toLocaleDateString()` writes a locale- and TZ-dependent date (`9/8/2026` en-US, `8.9.2026` de-DE) while the seeds are ISO `YYYY-MM-DD`; the `>=` in `list` compares two formats, breaking the plan's invariant | `new Date().toISOString().slice(0, 10)` |
| major | src/routes.js:14 | L2 type-contract breach | `GET /orders?since=05/01/2026`: `'2026-01-05' >= '05/01/2026'` is `true`, so all three seeds come back instead of a 400 or a filtered list | the raw query string reaches an ISO-assuming string comparison unvalidated | reject a `since` that is not `YYYY-MM-DD` with a 400 `AppError` |
| major | src/server.js:8 | plan `## Non-goals` | — | `process.env.CORS_ORIGIN` — a new environment variable the non-goal names outright | revert |
| major | src/server.js:32 | plan `## Non-goals` | — | `access-control-allow-origin` header, defaulting to `*` — CORS the non-goal names outright | revert |
| major | src/services/orders.js:2 | lint no-restricted-imports (eslint Convention 4) | — | the service layer imports `../http/respond.js`, against `routes → services → store`; `npm run lint` exits 1 | drop the import |
| major | src/services/orders.js:56 | defaults §16 dead code, §8 ≥2 callers | — | `createInto` is exported with zero callers and is the only reason for the restricted import above | delete |
| major | src/services/orders.js:15 | decision 0022 test-first | — | T2's logic — the `since` filter and the stamp — adds no test declaration; the diff's only new test covers T3 | add cases for `since` before, at, and after a date, over a seeded and a created order |

## Coverage
`.claude/rules/` does not exist at the path the dispatch names — the `.claude` tree carries only `hodos/config.json`, which has no `conventions` key. Conventions were reviewed against the plan's design fields, the conventions stated in `eslint.config.js` (1, 2, 4), and the defaults list.

The package header carries no `Mutation:` field — `— (no mutation record in the package)`; recorded here, no finding.

Not reviewed: `node_modules`, `package-lock.json`. Outside the diff, only `src/http/respond.js`, `src/store/orders.js` and the three test files were read, for the caller, dead-code and coverage questions.
