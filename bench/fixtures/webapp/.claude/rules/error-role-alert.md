---
paths:
  - "src/features/**/ui/**"
---

# Every error surface carries `role="alert"`

Text that appears because something failed is announced. The element that holds
the message gets `role="alert"`, so a screen reader speaks it at the moment it
renders:

```tsx
{orders.isError && <p role="alert">{orders.error.message}</p>}
```

The same holds for the early-return form:

```tsx
if (order.isError) return <p role="alert">{order.error.message}</p>;
```

This is the error surface only. Pending text is not an alert
(`src/features/orders/ui/OrdersPage.tsx:24`), and an empty result is ordinary
copy, not a failure (`src/features/orders/ui/OrderList.tsx:10`).

## Precedents

- `src/features/orders/ui/OrdersPage.tsx:25` — `{orders.isError && <p role="alert">{orders.error.message}</p>}`
- `src/features/orders/ui/OrderDetailPage.tsx:11` — `if (order.isError) return <p role="alert">{order.error.message}</p>;`

## What it prevents

`<p>{error.message}</p>` renders the message silently: sighted users see the
failure and a screen-reader user gets nothing. This has been added by hand
repeatedly.
