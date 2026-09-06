# Plan — duplicate-customers
Path: quick · Type: feature · Branch: {branch} · Campaign: — · Base: {base}

## Goal
The orders list marks the rows whose customer appears more than once in the current result, so a reader spots a repeat buyer without sorting anything.

## Non-goals
- A customer index, a lookup map, or any structure kept in sync with the list. D1 settles this.
- Matching customers across filters or across pages — the mark is about the rows on screen.
- Normalising names (case, whitespace); the fixture's customers are exact strings.
- Any change to `api.ts` or to what the server returns.

## Decisions
| # | Question | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|
| D1 | How are repeats found? | A — a nested scan over the rendered array, no auxiliary structure (cons: quadratic; a list an order of magnitude larger than today's would be felt) · B — a `Map` from customer to count, built in one pass (cons: a second structure to build, and a second thing to keep true as the shape of an order changes) | A, because the list is what the page already holds and the fixture's data is three orders; B buys asymptotics the data does not need and costs a structure every future reader has to check | A (user) |

## Design
### Modules
touched: `src/features/orders/ui/OrderList.tsx` · new: `src/features/orders/duplicates.ts` — a pure predicate over the array, kept out of the component for the same reason `model.ts` keeps state out of it. No barrel export: the predicate is internal to the feature, `OrderList` is its only caller, and a public symbol with no outside consumer is surface that has to be defended for nothing.
### Dependency direction
`ui` → `duplicates` → `api` (types only). `duplicates` is reached by a relative import from inside the feature, the way `ui/OrdersPage.tsx` reaches `api` and `model` today, and it is not re-exported.
### Interfaces
`export function duplicateCustomers(orders: Order[]): Set<string>`
### Invariants & failure modes
- A customer appearing once is never in the set; a customer appearing twice or more is always in it.
- The empty list gives the empty set — never `undefined`, never a thrown error.
- The set is derived, never stored: it is recomputed from the array the list renders.
### Data & scale
The list is whatever `/api/orders` returned for the chosen status — the fixture's own data is three orders, and the endpoint is not paginated. D1 chose the quadratic scan against that ceiling, so the ceiling belongs in the code where the next reader meets it.
### Precedent
`src/features/orders/model.ts:11` — a feature's own logic lives beside its components rather than inside them. `src/features/orders/ui/OrdersPage.tsx:3` — a component reaches its feature's own modules by relative import; the barrel is for the way in from outside.
### Refactor in scope
none — the task adds one file and one attribute to an existing component; nothing inside its boundary is worth improving on the way past.
### External APIs
none — no library is added and none is used differently.
### Architecture alternatives
See D1: the nested scan against a `Map` index.

## Tasks
### T1. Mark the repeated customers
Files: src/features/orders/duplicates.ts, src/features/orders/duplicates.test.ts, src/features/orders/ui/OrderList.tsx
Acceptance: `duplicateCustomers([])` is an empty set; for orders from Ada, Bob and Ada it is a set holding exactly `Ada`; a list where every customer differs gives the empty set; each list item whose customer is in the set carries `data-repeat="true"` and no other item carries the attribute.

## Verify plan
- unit: T1 tests (recipe `unit`)
- ui: /orders — the repeated row carries the attribute (recipe `ui`)

## Open questions
(empty at approval)
