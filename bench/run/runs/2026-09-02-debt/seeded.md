**Debt — `hodos:` markers**

```
src/features/orders/model.ts:1, the filter is a single string. ceiling: a single string. upgrade: a second facet joins it.
src/features/orders/ui/OrderList.tsx:9, renders the whole array. ceiling: the whole array. upgrade: a page exceeds 200 rows.
src/lib/http.ts:9, one base URL, taken from the same origin. ceiling: one base URL, taken from the same origin. upgrade: — no-trigger
```

3 markers, 1 with no trigger.
