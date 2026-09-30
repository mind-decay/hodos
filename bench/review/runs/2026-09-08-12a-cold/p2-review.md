# Review 1 — p2
Verdict: NEEDS_WORK · blockers 0 · majors 5 · minors 1

## Checks run
- test: `npm test` → 18 passed (4 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems
- (package carries no `Mutation:` header line — no ledger comparison, per `FORMATS.md §8`)

## Spec
**Missing:** T1's acceptance "an unknown one falls back to `all`" — `src/features/orders/ui/useStatusParam.ts:8` casts rather than validates, so an unknown status is returned unchanged.

**Extra:** —

**Misunderstood:** T2 — `src/features/home/ui/HomePage.tsx:6` names the *zustand* filter (`useOrdersFilter`), the shape the plan's `### Architecture alternatives` identifies as the pre-task state that "cannot be linked to, which is the goal". `useStatusParam` has no caller anywhere in `src` (grep: only its own declaration), so no page names the URL's filter.

**Unclaimed:** the `### Invariants & failure modes` clause "*falls back to `all` rather than rendering an empty list with no explanation*" — the rendering half is in no `Acceptance:` clause; no task names a page that reads the URL status, and none does.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/ui/useStatusParam.ts:8 | L2 type-contract breach | `/orders?status=bogus`; also `/orders?status=` — `get` returns `''`, so `??` never fires | the cast hands back a value outside `StatusFilter`; the fallback branch does not exist | check membership of the union, return `'all'` otherwise |
| major | src/features/home/ui/HomePage.tsx:3 | rules/feature-barrel-imports.md | — | `'../../orders/model'` is a deep import across a feature boundary; the barrel already exports `useOrdersFilter` (`src/features/orders/index.ts:7`), and the plan's `### Dependency direction` asks for the public surface | `import { useOrdersFilter } from '../../orders';` |
| major | src/features/orders/api.ts:26 | rules/api-error-propagation.md | a 404 from `/api/orders`: the `ApiError` becomes a plain `Error`, so `orders.error` at `src/features/orders/ui/OrdersPage.tsx:10` has no `code`/`status` | the catch invents a new error type at the boundary the rule reserves for `ApiError` | re-throw the caught `ApiError`, or carry the wording as its `message` |
| major | src/features/orders/ui/useStatusParam.test.ts | CLAUDE.md conventions — a test sits beside the file it covers | — | new module with a branch and no test file; T1's acceptance is unproven | add the file: known status, unknown status, absent param |
| major | src/features/orders/api.ts:22 | CLAUDE.md conventions — test beside the file; defaults #11 | — | the added catch path is uncovered; T3's only new test (`src/lib/http.test.ts:37`) asserts the `accept` header — the `### Refactor in scope` extra, not T3's acceptance | assert the message a failed list request produces |
| minor | src/features/orders/ui/useStatusParam.ts:6 | defaults #8, #17 | — | the ordered hook has zero consumers, so the URL half changes no behaviour | wire it into `OrdersPage`, or drop it |

## Coverage
Not reviewed: files the diff does not touch — `dev-api.ts`, `vite.config.ts`, `eslint.config.js`, `src/App.tsx`. The `ui` browser recipe in `.claude/hodos/config.json` was not run; the home page's new line and the URL fallback were checked by reading only. `defaults.md` read at the dispatched path.
