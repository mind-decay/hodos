# Plan — cross-cut
Path: standard · Type: feature · Branch: {branch} · Campaign: — · Base: {base}

## Goal
One counting helper on each side of the monorepo, each covered where it lives.

## Non-goals
Sharing the two helpers through a package.

## Decisions
| # | Decision | Alternatives | Why |
|---|---|---|---|
| D1 | Each side keeps its own helper | one shared util in svc, imported by web | the two shapes differ: web counts quantities, svc sums cents |

## Design
### Modules
`web/src/basket.ts` — `basketCount`. `svc/src/index.js` — `totalCents`.
### Dependency direction
Neither helper imports the other; web already depends on svc, and this change adds no import.
### Interfaces
`basketCount(items: { qty: number }[]): number` · `totalCents(lines: { cents: number }[]): number`
### Invariants & failure modes
Both return 0 for an empty list.
### Data & scale
Baskets and invoices of tens of lines.
### Precedent
`web/src/basket.ts` `basketTotal`; `svc/src/index.js` `applyTax`.
### Refactor in scope
None.
### External APIs
None.
### Architecture alternatives
D1 above.

## Tasks
### T1. basketCount
Files: `web/src/basket.ts`, `web/src/basket.test.ts`
Acceptance: `basketCount([{ qty: 2 }, { qty: 3 }])` is 5, proven by a test beside it.
### T2. totalCents
Files: `svc/src/index.js`, `svc/src/index.test.js`
Acceptance: `totalCents([{ cents: 120 }, { cents: 80 }])` is 200, proven by a test beside it.

## Verify plan
- unit: both workspaces' tests pass.

## Open questions
None.
