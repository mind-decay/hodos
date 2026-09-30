# refund-badge
Created: 2026-09-07 · Path: standard · Type: feature · Campaign: —

## Prompt
Add a refund badge to the order detail page. A refund is requested, approved or declined, and the badge says which. The orders API answers 404 for an order that has no refund.

## Checklist
| Row | Evidence | Value |
|---|---|---|
| files touched (estimate) | `src/features/orders/api.ts` (Refund type, `keys.refund`, `getRefund`), `src/features/orders/ui/OrderDetailPage.tsx`, new `ui/RefundBadge.tsx` + `ui/RefundBadge.test.tsx`, new `ui/OrderDetailPage.test.tsx` (none exists today) | 5 |
| new module | badge lands in `src/features/orders/ui/`; only `OrderDetailPage.tsx` — same directory — imports it | no |
| contract / schema / route change | `src/features/orders/api.ts:22-25` declares every route this feature reads (`/orders`, `/orders/:id`); refund is a new route the client depends on by name, and its path + response shape are named nowhere in repo (no `/api` server, no fixture) | yes |
| new dependency | `package.json` — react-query 5.102.8, zustand 5.0.15 already there; badge needs nothing new | no |
| data migration | no migrations dir, no persisted shape; server state only | no |
| needs more than one mergeable unit | one feature directory, one branch, one review | no |
| fog | done is nameable and listable: badge says requested/approved/declined, absent on 404 | no |
| more than one developer | description says nothing | no |
| external wait | `/api` has no server here on purpose (CLAUDE.md); fetch stubbed at boundary in vitest — normal state, not a wait. Developer asserts the 404 behavior | no |

## Verdict
Path: standard — quick fails on row 3 (new route) and row 1 (5 > 3) · deep not required: rows 3–5 filled with evidence, row 2 `no`
Type: feature
Campaign: no — rows 6–9 all `no`
Confirmed by user: yes
