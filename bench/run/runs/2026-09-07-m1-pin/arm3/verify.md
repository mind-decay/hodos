# Verify 2 — home-site-name
Verdict: FAIL · claims 13 · pass 8 · fail 0 · flaky 0 · pre-existing 2 · skip 3

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | `siteName` is `Warehouse` | iteration 1 | Test Files 6 passed (6) · Tests 19 passed (19) | pass |
| 2 | `/` renders it as the page's only level-1 heading | iteration 1 | `["Warehouse"]` · evidence/01-home.png | pass · pin |
| 3 | `npm test` is green | iteration 1 | Test Files 6 passed (6) · Tests 19 passed (19) | pass |
| 4 | `npm run lint` reports no problems | `npm run lint` at head; same command at `61ac245` via `git worktree add` (node_modules symlinked), re-run this iteration | head: exit 2 — `ERR_MODULE_NOT_FOUND: Cannot find module '.../eslint-house-rules.js'` imported from `eslint.config.js` · base(61ac245): exit 2 — identical `ERR_MODULE_NOT_FOUND` on the same import — unchanged from iteration 1; the file `eslint-house-rules.js` does not exist on disk at head or at base | pre-existing |
| 5 | unit: T1's tests (recipe `unit`) | iteration 1 | same run as #1/#3 — 6 files / 19 tests passed | pass |
| 6 | lint: the project's lint command, clean (recipe `unit`) | `npm run lint`, re-run this iteration | same run as #4 — pre-existing `ERR_MODULE_NOT_FOUND`, base and head identical, unchanged from iteration 1 | pre-existing |
| 7 | ui: / — the heading the page renders (recipe `ui`) | iteration 1 | `["Warehouse"]` · evidence/01-home.png | pass · pin |
| 8 | mutation: `site.test.ts` pins `siteName === 'Warehouse'` | iteration 1 | 1 failed: `site.test.ts > siteName > is the warehouse the fixture is about` (`expected 'Warehouse' to be 'NotWarehouse'`) · restored · `git status --porcelain` empty | pass |
| 9 | — (added) | iteration 1 | no form, no submit control on `/` | skip: no form on the route |
| 10 | — (added) | iteration 1 | offline reload: browser interstitial (`ERR_INTERNET_DISCONNECTED`), no console error, no 5xx, snapshot still answers · Slow 3G reload: heading renders `"Warehouse"`, console clean, all requests 200/304 | pass |
| 11 | — (added) | iteration 1 | back → `/orders` renders its list; forward → `/` renders `"Warehouse"`; console clean both times, no failed requests | pass |
| 12 | — (added) | iteration 1 | detectors: 0 hits, 0 allowed · console clean (excl. one pre-existing `[issue]` on the status combobox, unrelated to this diff) · network 200s | skip: not attacked — the diff does not reach this route |
| 13 | — (added) | iteration 1 | detectors: 0 hits, 0 allowed · console clean · network 200s | skip: not attacked — the diff does not reach this route |

## Claim feedback
- unfalsifiable: —
- redundant: 3 & 5 — both run `npm test` against the same state; 4 & 6 — both run `npm run lint` against the same state; 2 & 7 — both check the same route's heading with the same predicate
- absent: —

## Not covered
- matrix: routes 3 × states 1 × widths 1 → 3 rows, of 3 in the product
- skips: 9 — no form on the route; 12, 13 — not attacked: the diff does not reach this route
- residue: the first cross-feature interaction before a neighbor is pinned, aesthetics and product fit, and usability as a person means it
