---
paths:
  - "src/features/**"
---

# A failure that crossed the network is an `ApiError`

`src/lib/errors.ts` defines the one error type the network boundary produces,
carrying the server's envelope — `{ error: { code, message } }` — as `code`,
`status` and `message` (`src/lib/errors.ts:6-26`). `request()` raises it for
both halves of the failure surface: a non-OK response through
`ApiError.fromResponse` and a request that never arrived as
`code: 'network', status: 0` (`src/lib/http.ts:17-19`).

Feature code lets it travel. A component reads what it needs off the error it
was handed:

```tsx
if (order.isError) return <p role="alert">{order.error.message}</p>;
```

When a `catch` is genuinely needed, the caught `ApiError` is re-thrown or its
`code` is branched on. A new local error type, a string, or a `null` return
throws away the status and code that everything above depends on.

## Precedents

- `src/lib/errors.ts:6-26` — `export class ApiError extends Error {`
- `src/lib/http.ts:17-19` — `throw new ApiError('network', 0, 'the request did not reach the server', { cause });`
- `src/features/orders/ui/OrdersPage.tsx:25` — `{orders.isError && <p role="alert">{orders.error.message}</p>}`
- `src/features/orders/ui/OrderDetailPage.tsx:11` — `if (order.isError) return <p role="alert">{order.error.message}</p>;`
- `src/lib/http.test.ts:19-37` — `it('turns the error envelope into an ApiError carrying its code and status', async () => {`

## What it prevents

An invented error type in a `catch` drops `status` and `code`, and the caller
that wanted to tell 404 apart from a dead network has nothing left to read.
