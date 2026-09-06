---
paths:
  - "src/**"
---

# A feature is entered through its barrel

`src/features/<name>/index.ts` is that feature's public surface. Code outside
the feature imports the directory, and gets what the barrel chose to export:

```ts
import { HomePage } from './features/home';
import { OrderDetailPage, OrdersPage } from './features/orders';
```

Inside a feature, relative imports are the normal way to reach its own files —
`../api`, `./OrderList` (`src/features/orders/ui/OrdersPage.tsx:3-5`). The
barrel governs the boundary, not the interior.

Making something available to another feature is one edit to the barrel:

```ts
export type { Order, OrderStatus } from './api';
export { keys as orderKeys } from './api';
export { useOrdersFilter } from './model';
export { OrderDetailPage } from './ui/OrderDetailPage';
export { OrdersPage } from './ui/OrdersPage';
```

## Precedents

- `src/App.tsx:3-4` — `import { HomePage } from './features/home';`
- `src/features/orders/index.ts:5-9` — `export type { Order, OrderStatus } from './api';`
- `src/features/home/index.ts:1` — `export { HomePage } from './ui/HomePage';`

## What it prevents

An import of `features/orders/ui/OrderList` pins another feature to a file path
inside it. The file then cannot be renamed or moved without breaking a caller
that the feature's own barrel never promised anything to.

`eslint.config.js` has no `no-restricted-imports` for this; the file is frozen
by project decision, so the rule is prose.
