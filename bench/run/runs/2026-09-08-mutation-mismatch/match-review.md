# Review 1 — orders-summary
Verdict: ACCEPT · blockers 0 · majors 0 · minors 0

The three acceptance sets land exactly as written, and the two decisions are
honoured where they were made: D1's pure function reads the array the list
receives (`OrdersPage.tsx:12`, `:33`), and D2's colour map stays inline at its
one call site (`OrderList.tsx:9-13`). The empty result is a summary of zeros
rather than a hidden line, which is the invariant that was easiest to lose.

## Checks run
- test: `npm test` → 23 passed (6 files)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → clean, 0 problems
- build (extra, requested by the dispatch): `npm run build` → built, 85 modules

## Spec
Missing: — · Extra: — · Misunderstood: —

Unclaimed:
- The failure path of `orders.data ? summarizeOrders(orders.data) : null` at
  `src/features/orders/ui/OrdersPage.tsx:12`, and the `null` member of the
  `OrderSummary | null` state it produces: T2's acceptance names the pending
  case only (`the line is absent while the query is pending`), so no
  acceptance clause names what the summary line does when the query rejects —
  the same `null` reaches `{summary && …}` at `:28` on error.
- `### Invariants & failure modes`, clause 2, second half: *an unknown status is
  impossible because `OrderStatus` is a closed union*. Nothing in T1–T3's
  acceptance names it; it rests on the type at `summary.ts:18` and on
  `request<Order[]>` returning unvalidated JSON (`api.ts:22-23`).

Read as claims, not defects: no task's acceptance criterion exercises those two
paths. Mutation counts agree with the declarations the diff adds — T1 3 vs 3
`it(` in `summary.test.ts`, T2 3 vs 3 in `OrdersPage.test.tsx`, T3 0 with no
declaration. T3's `Tests: visual` exemption holds against the diff: its hunk
adds a `Record` lookup and a `data-status` attribute, no branch and no new
condition.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| — | — | — | — | none | — |

Checked and clean: `Refactor in scope` — the summary line reuses the row's own
`toFixed(2)` spelling (`OrdersPage.tsx:30`, `OrderList.tsx:27`), introducing no
second formatting, which is what the field barred; no shared formatter was
ordered by `### Modules` or `### Interfaces`. Dependency direction holds —
`summary.ts:1` imports types from `./api` only, and nothing outside the feature
imports `summary` (grep: `summarizeOrders` appears in the barrel, the page and
its own test alone). `test-mocking-boundary`: `OrdersPage.test.tsx` stubs
`fetch` and unstubs it, resets the real zustand store via its own `reset()`,
and renders a real `QueryClient` and `MemoryRouter` — no `vi.mock`.
`error-role-alert`, `api-error-propagation`, `query-key-factory`,
`network-through-request`: the diff adds no error surface, no `catch`, no key
literal and no `fetch` in `src`. Named exports only; each new module has its
test beside it. L1–L9 produced no finding with a nameable trigger:
`summarizeOrders` mutates neither its argument nor a shared object, `[]` is
covered on both sides of the boundary, and `toFixed` is locale-invariant.

## Coverage
Not reviewed: T3's last clause — *the three colours are distinguishable in the
ui recipe's screenshot of /orders* — is a browser assertion the diff cannot
answer; it belongs to the `ui` recipe. Runtime behaviour of the dev `/api`
(`dev-api.ts`, `vite.config.ts`) is untouched by this diff and was not
re-reviewed. The package carried no `## Callers` section; a repo-wide grep
confirmed the two new barrel exports have no call site outside the feature.
