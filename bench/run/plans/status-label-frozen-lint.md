# Plan — status-label-frozen-lint
Path: quick · Type: feature · Branch: {branch} · Campaign: — · Base: {base}

## Goal
An order's status reaches the reader as a word chosen for them — "Awaiting payment" rather than `open` — and both order views read that word from the same place.

## Non-goals
- Translation or a locale layer. `config.language` is `en` and the fixture ships no i18n.
- Changing `OrderStatus` or what the API returns.
- Styling the label. Colour, weight and spacing are somebody else's task; this one changes the word.
- A label for a status the union does not have.
- **The project's lint configuration.** `eslint.config.js` is frozen by project decision; a lint failure that predates this branch belongs to whoever broke it, and repairing it here would put an unrelated change in this task's diff.

## Decisions
| # | Question | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|
| D1 | Where do the three words live? | A — a `Record<OrderStatus, string>` beside the type (cons: a second export from the feature) · B — a `switch` in each component (cons: two places to change, which is the shape this task exists to remove) | A, because the compiler checks a `Record` over a closed union and cannot check a `switch` in two files | A (user) |

## Design
### Modules
touched: `src/features/orders/index.ts`, `src/features/orders/ui/OrderList.tsx`, `src/features/orders/ui/OrderDetailPage.tsx` · new: `src/features/orders/labels.ts` — the words are data, and `api.ts` is the module that owns the status union they key on.
### Dependency direction
`labels` → `api` (types only). `ui` reads `labels` through the feature's own files; nothing outside the feature imports it except through the barrel.
### Interfaces
`export const statusLabels: Record<OrderStatus, string>`
### Invariants & failure modes
- Every member of `OrderStatus` has a label; adding a status without a label is a compile error, which is why the type is `Record` over the union and not `Partial`.
- No runtime failure mode: the lookup is total by construction and there is no fallback string to keep true.
### Data & scale
Three statuses, three strings, resolved at module load. Two call sites. Nothing here grows with the data.
### Precedent
`src/features/orders/api.ts:16` — the feature keeps its constant data in one exported object rather than inline at the call sites. `src/features/orders/index.ts:6` — that object is re-exported from the barrel under a name that says whose it is.
### Refactor in scope
none — the two views each render the raw status in one expression, and replacing that expression is the task itself, not a refactor beside it.
### External APIs
none.
### Architecture alternatives
See D1: the checked `Record` against a `switch` per component.

## Tasks
### T1. The three status labels, read by both views
Files: src/features/orders/labels.ts, src/features/orders/labels.test.ts, src/features/orders/index.ts, src/features/orders/ui/OrderList.tsx, src/features/orders/ui/OrderList.test.tsx, src/features/orders/ui/OrderDetailPage.tsx
Acceptance: `statusLabels.open` is `Awaiting payment`, `statusLabels.paid` is `Paid`, `statusLabels.cancelled` is `Cancelled`, and the object has exactly three keys; a list rendering an open order shows `Awaiting payment` where it showed `open`; the detail view shows the same word for the same order; `npm run typecheck` passes with the `Record<OrderStatus, string>` annotation in place.

## Verify plan
- unit: T1 tests (recipe `unit`)
- ui: /orders and /orders/:id — the status word both views render (recipe `ui`)

## Open questions
(empty at approval)
