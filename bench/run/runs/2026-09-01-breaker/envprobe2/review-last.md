# Review 2 — status-label-frozen-lint
Verdict: NEEDS_WORK · blockers 0 · majors 1 · minors 0

Both code findings from Review 1 were fixed as prescribed, and the fix diff introduced nothing new. The single open row is the pre-existing lint breakage, which this task cannot close.

## Checks run
- test: `npm test` → 11 passed (4 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → **fails to start**: `ERR_MODULE_NOT_FOUND` — `eslint.config.js` imports `./eslint-house-rules.js`, which does not exist

## Previous findings
| Sev | Location | Status |
|---|---|---|
| major | src/features/orders/ui/OrderDetailPage.tsx:18 | **closed** — line 19 is now `{statusLabels[order.data.status]}` with the import at line 5. `grep` confirms `labels.ts:8` is the only definition of `Awaiting payment` in `src`; `OrderList.tsx:17` and `OrderDetailPage.tsx:19` are two real consumers (defaults #8, #12). The trigger is dissolved: editing `labels.ts:8` now moves both views, since no second literal survives |
| major | eslint.config.js:6 | **open** — re-ran `npm run lint`; still cannot start. `eslint-house-rules.js` is absent and untracked; `git log` confirms `9254a6c` added the import and never the file. Carried at severity per re-review |
| minor | src/features/orders/labels.test.ts:13 | **closed** — now `Object.keys(statusLabels).sort()` against `['cancelled','open','paid']`, the exact fix prescribed. Still pins the key count at three, so T1's "exactly three keys" holds |

## Spec
Missing: — · Extra: — · Misunderstood: —

Every T1 acceptance clause now holds: the three labels (`labels.ts:8-10`, asserted `labels.test.ts:7-9`), exactly three keys (`labels.test.ts:13`), the list showing `Awaiting payment` (`OrderList.tsx:17`, covered `OrderList.test.tsx:35`), the detail view showing the same word from the same map (`OrderDetailPage.tsx:19`), and typecheck green with the `Record<OrderStatus, string>` annotation. T1 carries no `Tests:` line, so decision 0022 has nothing to bite on.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | eslint.config.js:6 | `commands.lint` (config.json); CLAUDE.md → Commands | run `npm run lint` on any tree | the lint gate cannot start, so nothing in this diff was linted and `no-restricted-globals: fetch` is unenforced repo-wide. Pre-existing at base, not a regression of this diff | restore `eslint-house-rules.js` — outside this task's scope, escalate. CLAUDE.md freezes `eslint.config.js`, so do not delete the import to make the command pass |

L1–L9 over the fix diff: no finding. `.sort()` at `labels.test.ts:13` mutates only the fresh array `Object.keys` returns, so no L4 holder exists; the default comparator is code-unit order, not locale-sensitive, so the three ASCII keys sort alike everywhere (no L9). `statusLabels[order.data.status]` is total over the checked union, so no L2. `../labels` is an intra-feature relative import, which `feature-barrel-imports` explicitly permits ("the barrel governs the boundary, not the interior") and the plan's Dependency direction orders.

## Coverage
Not reviewed: everything outside the fix diff, already covered by Review 1 — `labels.ts`, `index.ts:7`, `OrderList.tsx`, `OrderList.test.tsx`. Not verifiable here: whether the diff is lint-clean, since the linter cannot run; that verdict is deferred until `eslint-house-rules.js` is restored. `OrderDetailPage.tsx` still has no test file of its own — T1's file list never asked for one, and its acceptance clause now holds by construction through the shared map rather than by assertion.
