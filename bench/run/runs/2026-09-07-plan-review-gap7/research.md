# Research — refund-badge

## Q1. What does the orders API answer for a refund?
`GET /orders/:id/refund` answers `{ orderId, state, amount }` where `state` is one of the three
values `src/features/orders/refund.ts:2` declares, and **404** for an order that has never had a
refund asked for. Source: the fixture's own handler and the type beside it.

## Precedents
- `src/features/orders/ui/OrderDetailPage.tsx:11` — how the detail page holds a query and where its
  error surface is.
- `src/features/orders/api.ts:16` — every query key of the feature is built in one place.
- `src/lib/http.ts:9` — `request()` is the only way out to the network.

## External APIs
TanStack Query v5 `useQuery`, as the detail page already calls it.

## Risks
A 404 is the ordinary answer here rather than an error, so a client that treats every non-2xx the
same will show an error surface on the majority of orders.

## Open questions (for grilling)
none — the three states and the 404 are settled by the type and the handler.
