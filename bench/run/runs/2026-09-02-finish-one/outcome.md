## Outcome
Review: ACCEPT after 0 fix passes (0 blocker / 0 major fixed / 1 minor open)
Verify: PASS — 6 claims, 1 skipped; evidence/01-orders.png, evidence/02-orders-empty.png, `npm test -- summary` 4 passed
Open minors: minor src/features/orders/ui/OrderDetailPage.tsx:8 convention — the detail query is guarded with `enabled: id !== ''` and nothing in the project says what a route-parameter-keyed query does before the parameter arrives
Observation: the `enabled` guard on a route-parameter query occurs once (src/features/orders/ui/OrderDetailPage.tsx:8) — one incident, no rule proposed
Gaps: 1 — see ledger
