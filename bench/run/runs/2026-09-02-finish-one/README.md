# Finish, the observation arm — 2026-09-02

Stage 8 criterion 1, the `one occurrence` half. `seed.mjs orders-summary --at
finish --rule-arm one`, then `/hodos:run orders-summary` headless.

One session, 17 turns, **$0.70**.

Same phase, same plan, same code — only the seeded review differs. Its minor
names the `enabled: id !== ''` guard on the detail query, which is the feature's
only route-parameter-keyed query, and the phase wrote:

```
Observation — the `enabled` guard on a route-parameter query occurs once
(src/features/orders/ui/OrderDetailPage.tsx:8). One incident, not a convention.
No rule proposed.
```

`outcome.md` carries the same line: decision 0049 sends a single-occurrence
observation to the report **and** to `plan.md#Outcome`, and not to the ledger,
whose grammar has no form for it.

## Why this arm is not about money

The arm's first finding was the inline `Math.round(value * 100) / 100` in
`summary.ts`, which occurs once. The phase proposed a rule anyway, and its
reasoning was sound: it widened the pattern from that one spelling to *money
precision*, found four call sites, cited all four, and noted that two predate
the task. The threshold was applied with a real grep — the fixture simply has a
genuine money-formatting convention gap, so any money finding clears it.

A finding whose concern truly appears once is what tests the other branch, and
`enabled:` is the feature's only one. Recorded here because the widening is a
property of the design worth knowing: the pattern the phase greps is the one it
can defend, not the literal string in the finding, and a wider pattern that
clears the threshold produces the better rule.
