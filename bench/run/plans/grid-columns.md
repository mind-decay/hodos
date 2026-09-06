# Plan — grid-columns
Path: quick · Type: feature · Branch: {branch} · Campaign: — · Base: {base}

## Goal
An order row lays its three parts out in columns that line up down the list — customer, status, total — instead of running together as inline text.

## Non-goals
- A `style` attribute on the row. The columns are a rule about every row, and a rule about every row belongs in a stylesheet, not repeated per element.
- Changes to `vite.config.ts` or `vitest.setup.ts`. The project's build and test configuration is somebody else's task; this one changes a component and adds a stylesheet.
- A CSS-in-JS library, a utility-class framework, or any new dependency.
- Colour, spacing, typography, or the detail view. Three columns on the list row, nothing else.
- Changing the markup beyond the class name the rule hangs on.

## Decisions
| # | Question | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|
| D1 | Where does the column rule live? | A — a stylesheet imported by the component (cons: the project's first CSS file, so the toolchain has not carried one before) · B — a `style` attribute on each row (cons: the same three values repeated once per row, and a rule about all rows written as a property of one) | A, because the rule is about the list, not about a row, and Vite has handled CSS imports since the fixture was scaffolded | A (user) |

## Design
### Modules
touched: `src/features/orders/ui/OrderList.tsx` · new: `src/features/orders/ui/OrderList.css` — the rule for the component that owns the markup, beside it.
### Dependency direction
`OrderList.tsx` → `OrderList.css`. Nothing imports the stylesheet but the component whose rows it lays out.
### Interfaces
`OrderListProps` is unchanged: `{ orders: Order[] }`. The stylesheet exports nothing; the contract between it and the component is the class name `order-row`.
### Invariants & failure modes
- Every list item carries `order-row` and nothing carries a `style` attribute.
- The three columns are declared once. A row with a longer customer name changes no column but the first.
- An empty list renders the existing "No orders match this filter." paragraph, untouched by the rule.
### Data & scale
One rule, three columns, one class. Nothing here grows with the number of orders.
### Precedent
none — no component in this project carries a stylesheet today, and `index.html` and `src/main.tsx` bring in no global one either, so there is no existing form to follow. D1 records the choice that introduces the first.
### Refactor in scope
none — the component gains a class name and an import; there is nothing inside that boundary worth improving on the way past.
### External APIs
none.
### Architecture alternatives
See D1: the stylesheet against a per-row `style` attribute.

## Tasks
### T1. Lay the row out in three columns
Files: src/features/orders/ui/OrderList.css, src/features/orders/ui/OrderList.tsx, src/features/orders/ui/OrderList.test.tsx
Acceptance: every rendered list item carries the class `order-row`; a rendered row's computed `grid-template-columns` is `1fr auto auto`, and it comes from the stylesheet rather than from a `style` attribute; the empty-list paragraph still renders.

## Verify plan
- unit: T1 tests (recipe `unit`)
- ui: /orders — the columns line up down the list (recipe `ui`)

## Open questions
(empty at approval)
