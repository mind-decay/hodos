# Review 1 — p5
Verdict: REJECT · blockers 1 · majors 4 · minors 0

## Checks run
- test: `npm test` → 16 passed, 0 failed (3 suites)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 1 error, command exits non-zero (`src/services/orders.js:2` no-restricted-imports)

## Spec
**Missing:** T2 — "`since` returns exactly the orders at or after it — seeded and created alike" holds for seeded orders only; a created order is stamped in a different format (blocker below). No test in the diff exercises `since` or `createdAt`, so neither T1's nor T2's acceptance criterion has a check behind it; the only test added is T3's.

**Extra:** `src/server.js:8` `CORS_ORIGIN` env var and `src/server.js:32` the `access-control-allow-origin` header — `## Non-goals` names both ("no new environment variables, no CORS"), and `src/server.js` is in no task's `Files:`. `src/services/orders.js:56` `createInto` — in no task, with no caller anywhere in the tree.

**Misunderstood:** —

**Unclaimed:** the failure path of the `since` branch added at `src/services/orders.js:15` — an empty or non-ISO `since` — is named by no `Acceptance:` clause; the sibling `status` parameter throws on a bad value, this one does not.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/services/orders.js:48 | L9 time and locale | POST an order, then `GET /orders?since=2026-12-31`: `'9/8/2026' >= '2026-12-31'` is `true`, so today's order is returned as at-or-after a future date; under `de-DE` it is stamped `8.9.2026` | `new Date().toLocaleDateString()` stamps a locale- and TZ-dependent format while the seeds are ISO `2026-01-05`, breaking the plan's invariant "`createdAt` is one format everywhere it is written or compared" and the `>=` string compare at :15 | `new Date().toISOString().slice(0, 10)` |
| major | src/services/orders.js:15 | L3 boundary blindspot | `GET /orders?since=` returns `''` from `query.get`, not `null`, so every order passes; `?since=03/30/2026` matches nothing and returns `[]` | `since` is compared unvalidated; a bad value silently disables the filter or silently empties it, where `status` throws a 400 `AppError` | reject a `since` that is not `YYYY-MM-DD` with an `AppError`, as `status` does |
| major | src/server.js:8, src/server.js:32 | plan `### Non-goals` (defaults row 14) | — | a CORS header and a `CORS_ORIGIN` env var nobody asked for, on every response including 404s | remove both lines |
| major | src/services/orders.js:56 | plan `### Dependency direction` | — | `createInto` writes the response from the service layer — "writing a response stays `src/http/respond.js`'s job, and only its"; it has no caller, so it is also dead on arrival | delete `createInto` and the `respond.js` import |
| major | src/services/orders.js:2 | lint (no-restricted-imports) | — | `npm run lint` is red: the service imports `../http/respond.js`, which eslint's Convention 4 block forbids | delete the import with `createInto` |

## Coverage
`.claude/rules/` holds no files in this copy — only `.claude/hodos/config.json` exists — so the convention pass ran against the plan's design fields, `defaults.md`, and the conventions encoded in `eslint.config.js` and the `Convention N` comments in `src/routes.js` and `src/http/respond.js`. The package carries no `Mutation:` header, so no ledger comparison was made. Not reviewed: `node_modules`, `package-lock.json`, and code outside the diff apart from one grep for callers of `createInto`, `since` and `createdAt`.
