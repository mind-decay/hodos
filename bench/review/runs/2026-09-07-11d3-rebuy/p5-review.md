# Review 1 — p5
Verdict: REJECT · blockers 1 · majors 4 · minors 0

## Checks run
- test: `npm test` → 16 passed, 0 failed (3 suites)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → **exit 1**, 1 error (`src/services/orders.js:2` no-restricted-imports: `'../http/respond.js'` import is restricted from being used by a pattern)

## Spec
**Missing:** T2's second clause — "`since` returns exactly the orders at or after it — seeded and created alike" — is not met: a created order's stamp is not comparable with a seed's (see the blocker). T2's `since` logic is also exercised by no test; `test/routes.test.js` gained only T3's case.

**Extra:** `createInto` (`src/services/orders.js:51-58`) — no task asked for it. CORS header and `CORS_ORIGIN` (`src/server.js:8,32`) — no task asked for them, and `src/server.js` is in no task's `Files:` line.

**Misunderstood:** —

**Unclaimed:** the `### Invariants & failure modes` clause "`createdAt` is one format everywhere it is written or compared" — no `Acceptance:` clause names the format or its sameness across seeded and created orders; that is exactly where the defect landed. The empty-value path `?since=` (`src/routes.js:14`: `?? undefined` catches `null`, not `''`, so `''` reaches the filter) is in no claim.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | src/services/orders.js:48 | L9 time and locale (plan `### Invariants & failure modes`) | `create({customer:'Zoe',total:5})` then `list(null,'2026-12-01')` returns `['o-4']` — verified; a future `since` must return `[]` | `toLocaleDateString()` writes `9/7/2026` while seeds are ISO `2026-01-05`, so `createdAt >= since` compares two formats. Under `en-GB` it writes `07/09/2026` and the same order is wrongly *excluded*; the stamp is also local-TZ (`9/8/2026` at UTC+14) | `new Date().toISOString().slice(0, 10)` |
| major | src/services/orders.js:2 | lint `no-restricted-imports` (Convention 4; plan `### Dependency direction`) | — | the service imports `../http/respond.js`; lint exits 1 | drop the import |
| major | src/services/orders.js:56 | plan `### Dependency direction`; defaults #8, #16 | — | `createInto` writes the response from the service layer — "only its" job is respond.js's — and has zero callers | delete the function |
| major | src/server.js:8 | plan `### Non-goals`; defaults #13 | — | `CORS_ORIGIN` env var (line 8) and the CORS header (line 32); the plan excludes CORS and any new environment variable by name | remove both lines |
| major | test/services.test.js | decision 0022 test-first | — | T2's `since` filter ships with no test; every other service behaviour in this file has one, and a test would have caught the blocker | add the seeded-and-created `since` case |

## Coverage
No `.claude/rules/*.md` exists in this copy; conventions were read from the plan's design fields, `eslint.config.js` (Conventions 1-4) and `defaults.md`. Not reviewed: `node_modules`, `package-lock.json`, and files outside the diff except `src/http/respond.js`, `src/errors.js` and `test/services.test.js`, read to judge the callers and the layering.
