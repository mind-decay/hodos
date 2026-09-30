# `## Claim feedback`, live — 2026-09-07

Stage 11d-1, T5 (`BUILD-PLAN.md` Stage 11d: "A `verify.md` from a run on the fixture carries `## Claim feedback`, and the counts in its header are unchanged by it"), decision **0092**'s second half.

```
node bench/run/seed.mjs orders-summary --fixture webapp --at verify --into <copy>
cd <copy> && claude -p "/hodos:run orders-summary" \
  --plugin-dir <plugin root> --permission-mode bypassPermissions \
  --max-turns 45 --output-format stream-json --verbose
```

One session, **26 kernel tool uses**, one dispatch (`hodos:hodos-verifier` ×1, `bench/run/runs/kernel-turns.mjs`), 11 turns on the final result line, **$2.18**, `subtype: success`. It ran `verify` and then `finish`, so both halves of the change are in one run: the verifier writes the section, and `finish` copies it into the report before the file it is in is deleted.

## The section, verbatim — `verify.md`

```markdown
## Claim feedback
- unfalsifiable: —
- redundant: 13 and 14 — the Verify plan's `unit` line reruns the identical `npm test` that rows 1–9
  already cite by test name, and its `ui` line revisits the identical `/orders` navigations and
  colour check that rows 7, 8, and 10–12 already cover
- absent: `src/features/orders/index.ts`'s new re-export of `OrderSummary`/`summarizeOrders` through
  the feature barrel (the plan's own Precedent: "the barrel is the only public surface") — every test
  reaches `summary.ts` by its direct relative path, so no claim exercises the barrel export itself
```

**The counts are unchanged by it.** The header reads `claims 15 · pass 15 · fail 0 · skip 0`; the table holds **15** numbered rows; `pass + fail + skip = 15`. The section sits outside the table, and the verdict is `PASS` — which is the point of the rule that it is a section and never a row.

Both of the two things it found are real and neither is a defect in the code:

- **redundant** — the plan's `## Verify plan` lines re-state what the tasks' own acceptance clauses already claim, so two of fifteen rows re-ran what nine others had run. That is a *plan* shape, and the plan phase is where it is fixed.
- **absent** — the diff put the new functions through the feature barrel, which the plan's `Precedent` field calls the only public surface, and no claim goes through it. Nobody seeded this: the section found it by reading the claim set against the diff.

## `finish` carried it — `report.md`

The report printed `**Claim feedback:**` with the three lines verbatim, then, under Proposals:

> none — the review returned 0/0/0, so no finding exists to trace to a missing convention. The claim feedback's `absent` item is the verifier's reading of the claim set, not a finding; what it can earn is a claim in the next plan.

That is the rule `skills/run/references/finish.md` states, applied by a session that had only the reference to go on. `plan-with-outcome.md` is the plan the run left behind: `## Outcome` carries the counts and the evidence, and `verify.md` was deleted with the rest of the transient files — which is why this directory keeps a copy of it.

## What it does not say

One task, one fixture, one run. Whether the section is *useful* — whether a developer acts on it — is decision **0015**'s admission by name, and it is judged at Stage 12 (`BUILD-PLAN.md` Stage 11d, last criterion, carried to 11d-3's report).
