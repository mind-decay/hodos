# Review 1 — status-label-frozen-lint
Verdict: NEEDS_WORK · blockers 0 · majors 2 · minors 1

## Checks run
- test: `npm test` → 11 passed (4 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → did not run. `ESLint: 10.9.1 / Error [ERR_MODULE_NOT_FOUND]: Cannot find module '<repo>/eslint-house-rules.js' imported from <repo>/eslint.config.js`

## Spec
Missing: — · Extra: —
Misunderstood: T1 — the plan's `### Modules` puts the words in `labels.ts` and `### Dependency direction` has the `ui` files read `labels`; `OrderDetailPage.tsx:18` instead re-types the three strings as an inline object literal. The rendered word is right, so T1's third criterion passes by coincidence of two copies agreeing, not by the single source the design ordered. `### Precedent` names the same thing explicitly: "one exported object rather than inline at the call sites".

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/ui/OrderDetailPage.tsx:18 | plan design: Modules · Dependency direction · Precedent | — | the labels are duplicated inline; `../labels` is never imported here, so `statusLabels` ships with one caller and the two copies drift on the next wording change (defaults #12, #8) | `import { statusLabels } from '../labels'` and render `{statusLabels[order.data.status]}` |
| major | eslint.config.js:6 | lint (`npm run lint`) | — | the lint check cannot start — `import house from './eslint-house-rules.js'` resolves to no file, so this diff is unlinted and Convention 1's `no-restricted-globals` fetch guard (eslint.config.js:14-22) is dead repo-wide. Introduced at base 0d6a865, not by this diff; the diff correctly left the frozen config alone | restore the missing `eslint-house-rules.js`; CLAUDE.md freezes `eslint.config.js`, so the fix is the file, not the import |
| minor | src/features/orders/ui/OrderDetailPage.tsx:18 | plan T1 acceptance ("the detail view shows the same word") | — | nothing asserts the detail page's word — no `OrderDetailPage.test.tsx` exists, and T1's file list did not ask for one, so the copy at :18 is the one label with no test behind it | assert the word on the detail page, or close the gap by having it read `statusLabels` (the major above) |

Checked and clean: `Record<OrderStatus, string>` holds the invariant at both sites — a fourth `OrderStatus` member is a compile error at :18 too (verified with `tsc` on an isolated probe), so the "blank cell" failure mode does not apply. L1-L9: no answer in this diff. Barrel line and `labels.test.ts` match `### Interfaces` and the acceptance criteria.

## Coverage
Not reviewed: everything outside the six diffed files — `src/lib`, `model.ts`, `App.tsx`. The `ui` browser recipe (`/`, `/orders`, `/orders/:id`) was not run, so rendered layout is unverified. Lint-enforced conventions are unverified repo-wide while `npm run lint` cannot start. Untracked `run.err` and `run.jsonl` at the repo root are harness logs, outside the commit.
