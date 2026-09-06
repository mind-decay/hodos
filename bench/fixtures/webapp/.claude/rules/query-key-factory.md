---
paths:
  - "src/features/**"
---

# Query keys come from the feature's key factory

Every query key a feature uses is built in that feature's `api.ts`, beside the
request functions. A component reads a key off the factory; it never writes a
key array (`src/features/orders/api.ts:16-20`):

```ts
export const keys = {
  all: ['orders'] as const,
  list: (status: string) => [...keys.all, 'list', status] as const,
  detail: (id: string) => [...keys.all, 'detail', id] as const,
};
```

The call site names the factory entry, and every variable the query function
reads is an argument to it:

```ts
const orders = useQuery({ queryKey: keys.list(status), queryFn: () => listOrders(status) });
```

A new query gets a new entry on the factory first, then the call site. The
factory is re-exported from the barrel under the feature's name
(`src/features/orders/index.ts:6`) so another feature can invalidate against it.

## Precedents

- `src/features/orders/api.ts:16-20` — `export const keys = {`
- `src/features/orders/ui/OrdersPage.tsx:10` — `const orders = useQuery({ queryKey: keys.list(status), queryFn: () => listOrders(status) });`
- `src/features/orders/ui/OrderDetailPage.tsx:8` — `const order = useQuery({ queryKey: keys.detail(id), queryFn: () => getOrder(id), enabled: id !== '' });`

## What it prevents

A literal key array written at the call site drifts from the factory's shape by
one element, and an invalidation on `['orders']` then misses that cache entry.

Source: https://tanstack.com/query/latest/docs/framework/react/guides/query-keys
— keys are the cache's identity, array item order is part of it, and every
variable a query function depends on belongs in the key.
