# Plan — status-label-frozen-api
Path: quick · Type: feature · Branch: {branch} · Campaign: — · Base: {base}

## Goal
An order's status reaches the reader as a word chosen for them — "Awaiting payment" rather than `open` — and both order views read that word from the same place.

## Non-goals
- Translation or a locale layer. `config.language` is `en` and the fixture ships no i18n.
- Changing `OrderStatus` or what the API returns.
- Styling the label. Colour, weight and spacing are somebody else's task; this one changes the word.
- A label for a status the API cannot return.
- **Any import of `src/features/orders/api.ts` from `labels.ts` or from `labels.test.ts`, and any edit to that file.** `api.ts` is being split on `refactor/orders-api-split`, where `OrderStatus` moves to `api/types.ts`. An import written here points at a path that will not exist at merge, and an edit here is a conflict in a file somebody else is rewriting. This task waits for the split; it does not anticipate it.

## Decisions
| # | Question | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|
| D1 | The labels are keyed by a status. Where does the key type come from while `api.ts` is being split? | A — `import type { OrderStatus } from './api'`, in the module or in its test (cons: the path moves under the split, and this task merges after it) · B — write the three keys out in `labels.ts`, and let the test name the same three literally (cons: nothing compares the two lists, so a status added while the split is in flight leaves the map stale and no check says so) | B, because the split is a week out and a path that moves under it costs more than the check does. The check comes back in the follow-up task that lands the import after the split | B (user) |

## Design
### Modules
touched: `src/features/orders/index.ts`, `src/features/orders/ui/OrderList.tsx`, `src/features/orders/ui/OrderDetailPage.tsx` · new: `src/features/orders/labels.ts` — the words are data, and they live beside the feature they belong to.
### Dependency direction
`labels` imports nothing (D1). `ui` reads `labels` through the feature's own files; nothing outside the feature imports it except through the barrel.
### Interfaces
`export type LabelKey = 'open' | 'paid' | 'cancelled'` · `export const statusLabels: Record<LabelKey, string>`
### Invariants & failure modes
- Every status the API can return has a label. While D1 holds, nothing checks it: the map and the test name the same three strings and neither is derived from `OrderStatus`. The follow-up task after the split restores the compile error. This is the cost D1 accepted, written where a reader meets it.
- No runtime failure mode: the lookup is total over `LabelKey` and there is no fallback string to keep true.
### Data & scale
Three statuses, three strings, resolved at module load. Two call sites. Nothing here grows with the data.
### Precedent
`src/features/orders/api.ts:16` — the feature keeps its constant data in one exported object rather than inline at the call sites. `src/features/orders/index.ts:6` — that object is re-exported from the barrel under a name that says whose it is.
### Refactor in scope
none — the two views each render the raw status in one expression, and replacing that expression is the task itself, not a refactor beside it.
### External APIs
none.
### Architecture alternatives
See D1: the imported union against the local one, decided by the split's timing rather than by taste.

## Tasks
### T1. The three status labels, read by both views
Files: src/features/orders/labels.ts, src/features/orders/labels.test.ts, src/features/orders/index.ts, src/features/orders/ui/OrderList.tsx, src/features/orders/ui/OrderList.test.tsx, src/features/orders/ui/OrderDetailPage.tsx, src/features/orders/ui/OrderDetailPage.test.tsx
Acceptance: `statusLabels.open` is `Awaiting payment`, `statusLabels.paid` is `Paid`, `statusLabels.cancelled` is `Cancelled`; a list rendering an open order shows `Awaiting payment` where it showed `open`; the detail view shows the same word for the same order; `npm run typecheck` passes with the `Record<LabelKey, string>` annotation in place.

## Verify plan
- unit: T1 tests (recipe `unit`)
- ui: /orders and /orders/:id — the status word both views render (recipe `ui`)

## Open questions
(empty at approval)
