2026-09-07T10:20:25.077Z Init: standard feature
2026-09-07T10:45:31.435Z Ruling: Refund and RefundStatus stay out of src/features/orders/index.ts — nothing outside the feature reads them, and the barrel (index.ts:5-9) is a public surface — cost if wrong: one export line added later
2026-09-07T10:45:31.470Z Ruling: badge mounts as a dt/dd pair inside the existing dl at OrderDetailPage.tsx:16-21 — consistent with Status and Total — cost if wrong: a markup move
2026-09-07T10:45:41.279Z Ruling: the refund query carries the same enabled guard as the order query — OrderDetailPage.tsx:8 already guards an empty route id and the second query has the same hole — cost if wrong: a request to /api/orders//refund
2026-09-07T10:45:41.633Z Ruling: refund pending renders inline 'Loading refund…' with no role — OrdersPage.tsx:24 is the inline pending precedent and error-role-alert.md:22-24 says pending is not an alert — cost if wrong: one line of copy
2026-09-07T10:47:30.800Z Plan: approved (df62975, 3 tasks, feature/refund-badge)
