# Review input — status-label
Base: ddc53eb · Head: fd78e91 · Commits: 1

## Previous findings
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/ui/OrderDetailPage.tsx:18 | plan design — `Dependency direction` / `Precedent` ("the feature keeps its constant data in one exported object rather than inline at the call sites"); defaults #2, #4 | edit a word in `labels.ts` — e.g. `open: 'Awaiting payment (net 30)'` — and the list shows the new word while the detail page silently keeps the old one: `labels.test.ts` and `OrderList.test.tsx:33` both stay green, and there is no detail-page test at all | the status word is duplicated as an inline literal instead of read from `statusLabels`; `labels.ts` has one production consumer where the plan ordered two | `import { statusLabels } from '../labels';` and render `{statusLabels[order.data.status]}` |

## Design (from plan)
### Modules
touched: `src/features/orders/index.ts`, `src/features/orders/ui/OrderList.tsx`, `src/features/orders/ui/OrderDetailPage.tsx` · new: `src/features/orders/labels.ts` — the words are data, and `api.ts` is the module that owns the status union they key on.
### Dependency direction
`labels` → `api` (types only). `ui` reads `labels` through the feature's own files; nothing outside the feature imports it except through the barrel.
### Interfaces
`export const statusLabels: Record<OrderStatus, string>`
### Invariants & failure modes
- Every member of `OrderStatus` has a label; adding a status without a label is a compile error, which is why the type is `Record` over the union and not `Partial`.
- No runtime failure mode: the lookup is total by construction and there is no fallback string to keep true.
### Data & scale
Three statuses, three strings, resolved at module load. Two call sites. Nothing here grows with the data.
### Precedent
`src/features/orders/api.ts:16` — the feature keeps its constant data in one exported object rather than inline at the call sites. `src/features/orders/index.ts:6` — that object is re-exported from the barrel under a name that says whose it is.
### Refactor in scope
none — the two views each render the raw status in one expression, and replacing that expression is the task itself, not a refactor beside it.
### External APIs
none.
### Architecture alternatives
See D1: the checked `Record` against a `switch` per component.

## Tasks (from plan)
### T1. The three status labels, read by both views
Files: src/features/orders/labels.ts, src/features/orders/labels.test.ts, src/features/orders/index.ts, src/features/orders/ui/OrderList.tsx, src/features/orders/ui/OrderList.test.tsx, src/features/orders/ui/OrderDetailPage.tsx
Acceptance: `statusLabels.open` is `Awaiting payment`, `statusLabels.paid` is `Paid`, `statusLabels.cancelled` is `Cancelled`, and the object has exactly three keys; a list rendering an open order shows `Awaiting payment` where it showed `open`; the detail view shows the same word for the same order; `npm run typecheck` passes with the `Record<OrderStatus, string>` annotation in place.

## Diff stat
 src/features/orders/ui/OrderDetailPage.test.tsx | 37 +++++++++++++++++++++++++
 src/features/orders/ui/OrderDetailPage.tsx      |  3 +-
 2 files changed, 39 insertions(+), 1 deletion(-)

## Diff
diff --git a/src/features/orders/ui/OrderDetailPage.test.tsx b/src/features/orders/ui/OrderDetailPage.test.tsx
new file mode 100644
index 0000000..05e04d9
--- /dev/null
+++ b/src/features/orders/ui/OrderDetailPage.test.tsx
@@ -0,0 +1,37 @@
+import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
+import { render, screen } from '@testing-library/react';
+import { MemoryRouter, Route, Routes } from 'react-router-dom';
+import { afterEach, describe, expect, it, vi } from 'vitest';
+
+import type { Order } from '../api';
+import { statusLabels } from '../labels';
+import { OrderDetailPage } from './OrderDetailPage';
+
+const order: Order = { id: 'o-1', customer: 'Ada', total: 12.5, status: 'open' };
+
+const jsonResponse = (body: unknown) =>
+  new Response(JSON.stringify(body), { status: 200, headers: { 'content-type': 'application/json' } });
+
+const renderDetail = () =>
+  render(
+    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
+      <MemoryRouter initialEntries={['/orders/o-1']}>
+        <Routes>
+          <Route path="/orders/:id" element={<OrderDetailPage />} />
+        </Routes>
+      </MemoryRouter>
+    </QueryClientProvider>,
+  );
+
+afterEach(() => {
+  vi.unstubAllGlobals();
+});
+
+describe('OrderDetailPage', () => {
+  it('shows the reader the same status word the list reads, not the status', async () => {
+    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse(order)));
+    renderDetail();
+    expect(await screen.findByText(statusLabels.open)).toBeDefined();
+    expect(screen.queryByText('open')).toBeNull();
+  });
+});
diff --git a/src/features/orders/ui/OrderDetailPage.tsx b/src/features/orders/ui/OrderDetailPage.tsx
index 4e02c16..d412a1f 100644
--- a/src/features/orders/ui/OrderDetailPage.tsx
+++ b/src/features/orders/ui/OrderDetailPage.tsx
@@ -1,24 +1,25 @@
 import { useQuery } from '@tanstack/react-query';
 import { useParams } from 'react-router-dom';
 
 import { getOrder, keys } from '../api';
+import { statusLabels } from '../labels';
 
 export function OrderDetailPage() {
   const { id = '' } = useParams<{ id: string }>();
   const order = useQuery({ queryKey: keys.detail(id), queryFn: () => getOrder(id), enabled: id !== '' });
 
   if (order.isPending) return <p>Loading order…</p>;
   if (order.isError) return <p role="alert">{order.error.message}</p>;
 
   return (
     <article>
       <h1>{order.data.customer}</h1>
       <dl>
         <dt>Status</dt>
-        <dd>{{ open: 'Awaiting payment', paid: 'Paid', cancelled: 'Cancelled' }[order.data.status]}</dd>
+        <dd>{statusLabels[order.data.status]}</dd>
         <dt>Total</dt>
         <dd>{order.data.total.toFixed(2)}</dd>
       </dl>
     </article>
   );
 }
