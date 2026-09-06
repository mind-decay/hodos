# A claim that fails twice, and the breaker — 2026-09-02

Stage 7 criterion 3, second half. The only **interactive** run of this stage:
the breaker asks with `AskUserQuestion`, which a headless session does not have
(`PLATFORM-NOTES.md` fact 32). Steps in `docs/stages/07-manual.md`.
`seed.mjs orders-summary-frozen-store --at verify --defect
orders-frozen-store-and-attr`, then one `/hodos:run
orders-summary-frozen-store` session, 36 kernel tool uses.

The defect breaks two claims at once. One — the row's `data-status` — the fix
pass closes inside the task. The other lives in `src/features/orders/model.ts`,
which this plan's `## Non-goals` freeze and `D3` records why; closing it means
editing a file the plan forbids, so it is the developer's call and not the fix
pass's.

```
Verify 1: FAIL 15 claims, 0 skipped
Gap: D3 assumed model.test.ts was red from a parallel branch, but T3 itself
     changed model.ts reset() to 'open' — developer chose to leave the edit and
     report claim 13 as an open finding
Fix 1: done (0b1dcea)
Verify 2: FAIL 15 claims, 0 skipped
Breaker: verify — accept
```

`state.phase` → `finish`, `verify.iteration` 2, `verify.verdict` `FAIL`. There
is no third dispatch: the bound is two, and what follows it is a choice.

**The gap gate fired before the fix pass, and it was right to.** The kernel did
not take the plan's account of the red suite on trust. It ran the provenance
against the branch base and found the frozen module edited by `346e9b6` — T3's
own commit — not by the parallel branch `D3` names:

```
git diff --stat 46aba7e..HEAD; git log --oneline 46aba7e..HEAD -- src/features/orders/model.ts src/features/orders/model.test.ts
git diff 46aba7e..HEAD -- src/features/orders/model.ts; git log --oneline -1 346e9b6; git show 346e9b6 --stat
```

That is the fixture showing through: `--defect` applies its patch **inside the
last task commit**, so a plan whose non-goal blames an outside branch is
contradicted by `git log`. The construction still produced what the criterion
asks for — the fix cannot close the claim without contradicting the plan, so a
person decides — and it produced `verify-loop.md §7`'s gap clause as well, from
a fork nobody wrote into the fixture. See the backlog note in
`docs/stages/07-report.md`.

**Iteration 2 re-ran rows 10 and 13 and no others.** Row 10 passes: `0b1dcea`
added `data-status={order.status}`, verified live in the browser against a
`fetch`-stubbed `/orders`, all three rows carrying the right value. Row 13
fails again, unchanged. The other 13 rows carry `iteration 1` in the Command
column, the mutation row among them — `claims 15 · pass 14 · fail 1 · skip 0`
over a 15-row table.

`kernel-turns.txt` reports `git diff in a kernel command: 2`. Both are the two
commands above, run at the gap gate against the branch base. Neither reads a
review artifact, and `review-input.md` / `review.md` stay at `0 read, 0
mentioned` with two dispatches, both verifiers — criterion 4 holds here too;
the counter is a proxy with a legitimate non-review use.

Text only, as in the other runs. The three iteration-1 screenshots and
`07-orders-data-status-iter2.png` stayed in the throwaway copy.
