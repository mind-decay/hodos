---
paths:
  - "src/**"
---

# The network is reached through `request()`

`src/lib/http.ts` holds the application's single `fetch` (`src/lib/http.ts:12`).
Everything above `src/lib` reaches the network by calling `request<T>()`, which
returns parsed JSON or throws an `ApiError` — a caller never sees a `Response`
(`src/lib/http.ts:9-21`).

A feature's calls are one line each, declared in its `api.ts`:

```ts
export const listOrders = (status: string) =>
  request<Order[]>(`/orders?status=${encodeURIComponent(status)}`);

export const getOrder = (id: string) => request<Order>(`/orders/${encodeURIComponent(id)}`);
```

`request()` prefixes `/api` itself (`src/lib/http.ts:3`), so a path passed to it
starts at the resource: `/orders`, not `/api/orders`.

## Precedents

- `src/lib/http.ts:9-21` — `export async function request<T>(path: string, init?: RequestInit): Promise<T> {`
- `src/features/orders/api.ts:22-23` — `export const listOrders = (status: string) =>`
- `src/features/orders/api.ts:25` — `` export const getOrder = (id: string) => request<Order>(`/orders/${encodeURIComponent(id)}`); ``

## What the check already covers

`eslint.config.js:14-22` reports the bare global as an error. It does not see
`window.fetch` or `globalThis.fetch`, and it reports at lint time rather than at
write time — which is why this rule is written out as well as checked.
