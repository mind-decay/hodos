---
paths:
  - "src/**/*.tsx"
  - "src/features/**/index.ts"
---

# Components are exported by name

A component is declared and exported in one statement, under its own name:

```tsx
export function OrderDetailPage() {
  const { id = '' } = useParams<{ id: string }>();
  // …
}
```

The file has no `export default`. There is none anywhere in `src` — the two in
the repo, `eslint.config.js` and `vite.config.ts`, are tool config formats that
require one.

A new component reaches the rest of the app through its feature's barrel, which
names it:

```ts
export { OrderDetailPage } from './ui/OrderDetailPage';
export { OrdersPage } from './ui/OrdersPage';
```

and callers destructure that name:

```tsx
import { OrderDetailPage, OrdersPage } from './features/orders';
```

## Precedents

- `src/features/orders/ui/OrderDetailPage.tsx:6` — the page component.
- `src/features/orders/ui/OrdersPage.tsx:7` — the list page.
- `src/features/orders/ui/OrderList.tsx:9` — a component taking props.
- `src/features/home/ui/HomePage.tsx:3` — the same shape in another feature.
- `src/features/orders/index.ts:8` — the barrel re-export, by name.
- `src/App.tsx:6` — `App` itself, exported the same way.

## Incident

Twice in the month to 2026-09-02 a new component was written with a default
export and the developer changed the importing line back by hand, most recently
on the orders detail page. React's prevailing house style is the default export;
this project's is not, and the difference costs an edit every time.

## What it prevents

A default export lets each caller pick the local name, so the same component is
`OrderDetailPage` in one file and `Detail` in the next, and grep for the symbol
stops finding its uses. It also breaks the barrel: `index.ts` re-exports by
name, so a defaulted component needs a rename hop that nothing else in `src` has.

`eslint.config.js` could catch this with `no-restricted-syntax` on selector
`ExportDefaultDeclaration` for `src/**/*.{ts,tsx}`. The file is frozen by
project decision, so the rule is prose.
