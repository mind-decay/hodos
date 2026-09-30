# The mutation count, measured — Stage 12a T3, 2026-09-08

Two dispatches, `hodos:hodos-reviewer` on `opus`, one package each, on two
copies of `bench/fixtures/webapp` seeded with `bench/run/seed.mjs
orders-summary --at review`. The question is whether decision **0122**'s
comparison fires on a disagreement and stays quiet on agreement — the arm the
mechanism was bought against, not a bench gate.

```
node bench/run/seed.mjs orders-summary --at review --into /tmp/hodos-12a-match
node bench/run/seed.mjs orders-summary --at review --into /tmp/hodos-12a-mismatch
# the mismatch arm's one edit, by hand:
sed -i '' 's/Task 1: mutation (3 tests)/Task 1: mutation (9 tests)/' \
  /tmp/hodos-12a-mismatch/.claude/hodos/tasks/orders-summary/ledger.md
# then, in each copy:
node <repo>/scripts/review-package.mjs orders-summary
claude -p '<the dispatch of bench/review/invoke.mjs commandFor, at this package>' \
  --plugin-dir <repo> --strict-mcp-config --permission-mode bypassPermissions
```

Both copies carry the same diff: three tasks, `summary.test.ts` with three `it`
declarations for T1, `OrdersPage.test.tsx` with three for T2, and T3 under the
plan's `Tests: visual` exemption adding none. The seeder wrote the counts
(`Task <n>: mutation (<k> tests)`) and `review-package.mjs` put them in the
header. The only difference between the arms is one digit in one ledger line.

| Arm | Header | Verdict | The finding |
|---|---|---|---|
| match | `Mutation: T1 3 tests · T2 3 tests · T3 0 tests` | `ACCEPT · 0/0/0` | none — and the review says so out loud: *"Mutation counts agree with the declarations the diff adds — T1 3 vs 3 `it(` in `summary.test.ts`, T2 3 vs 3 …, T3 0 with no declaration"* |
| mismatch | `Mutation: T1 9 tests · T2 3 tests · T3 0 tests` | `NEEDS_WORK · 0/2/0` | *"Mutation (major): `summary.test.ts:12` — the header records `T1 9 tests`, and the diff adds 3 `it` declarations for T1 (`ledger.md:5`). A count larger than the declarations is a number nobody ran (decision 0122)."* |

The reviews are `match-review.md` and `mismatch-review.md`; the headers the two
packages carried are beside them.

## What the arms showed beyond the pass

**The reviewer read all three rows, not the one that was wrong.** The mismatch
arm's finding names T2 as agreeing and T3 as exempt, and checks the exemption
against the diff — *"its hunk adds a `Record` lookup and a `data-status`
attribute, no branch and no new condition, so the exemption holds"*. The
comparison is per task, which is what the header's per-task shape is for.

**The finding lands in the Spec section, not in the Standards table.** Both the
`Tests:` exemption major of decision 0022 and this one are written in
`agents/hodos-reviewer.md`'s step 3, so the reviewer filed it where that step
lives: the header counted `majors 2` over one table row. That is the shape the
Spec section already has — `Unclaimed` carries no severity and no row either —
and it means `bench/review/run.mjs`'s **precision** does not see this class of
finding, the admission `docs/BENCH.md` already makes for `Unclaimed`. Recorded
here rather than changed: moving a Spec finding into the Standards table is a
`FORMATS.md §9` change and would be a decision.

**The second major is unrelated and is the arm's own control.** The mismatch
copy's reviewer also filed a `Refactor in scope` major about `toFixed(2)` in two
places; the match copy's reviewer read the same field the other way and called
it clean. Same diff, two readings, one dispatch each — a reminder that a single
dispatch is a sample, which is why the mismatch finding above is read off its
own text and not off the verdict.
