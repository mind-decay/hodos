# Plan — home-site-name
Path: quick · Type: feature · Branch: feature/home-site-name · Campaign: — · Base: 61ac245

## Goal
The warehouse's name is written once, so the landing page and whatever names it next cannot disagree about it.

## Non-goals
- The navigation and the order list. This task changes where one word comes from.
- The document title and the browser tab, which no route sets today.
- **The project's lint configuration.** `eslint.config.js` is frozen by project decision; a lint failure that predates this branch belongs to whoever broke it, and repairing it here would put an unrelated change in this task's diff.

## Decisions
| # | Question | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|
| D1 | Where does the name live? | A — `src/site.ts`, one module above the features (cons: a new top-level file for one string) · B — the home feature's own module (cons: the next place that names the site would import from a feature it has nothing else to do with) | A, because the name is the application's and not the home page's | A (user) |

## Design
### Modules
touched: `src/features/home/ui/HomePage.tsx` · new: `src/site.ts`, `src/site.test.ts`, `src/features/home/ui/HomePage.test.tsx`.
### Dependency direction
`features/home/ui` → `site`. `site` imports nothing: it is a leaf, which is what lets any feature read it without a cycle.
### Interfaces
`export const siteName: string`
### Invariants & failure modes
- The name is a single exported constant, so two renderings of it cannot drift.
- No runtime failure mode: a string resolved at module load.
### Data & scale
One string, one call site today. Nothing grows with the data.
### Precedent
`src/features/orders/api.ts:16` — the project keeps constant data in one exported binding rather than inline at the call sites.
### Refactor in scope
none — the heading's literal becomes the constant, in the same expression.
### External APIs
none.
### Architecture alternatives
See D1: a leaf module against the home feature's own.

## Tasks
### T1. The site's name, in one module
Files: src/site.ts, src/site.test.ts, src/features/home/ui/HomePage.tsx, src/features/home/ui/HomePage.test.tsx
Acceptance: `siteName` is `Warehouse`; `/` renders it as the page's only level-1 heading; `npm test` is green; `npm run lint` reports no problems.

## Verify plan
- unit: T1's tests (recipe `unit`)
- lint: the project's lint command, clean (recipe `unit`)
- ui: / — the heading the page renders (recipe `ui`)

## Open questions
(empty at approval)
