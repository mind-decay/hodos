# The seventh plan-review gap, two arms — 2026-09-07

Stage 11d-1, T2 (`BUILD-PLAN.md` Stage 11d, *The derivation is checked where the inputs are* — "the same plan on `deep` trips the **seventh** gap in `plan-review.md`"; that criterion read "gap 6" when this run was made and was corrected after review 1 filed it, and `11d-plan.md §2` records why decision **0092**, which is append-only, still calls it the sixth).

Two `deep` plans for the same feature, differing in **one claim, written in the two
places a claim is written** — the task's `Acceptance:` line and the `## Verify plan` row
it is verified by. `arms.diff` carries both hunks and is the whole difference; this was
first written here as "one clause", which review 1 of Stage 11d-1 corrected:

```
49c49
< Acceptance: … "Refund requested" for `requested`; … "Refund approved" for `approved`; it renders nothing when …
> Acceptance: … "Refund requested" for `requested`; … "Refund approved" for `approved`; it reads "Refund declined" for one whose state is `declined`; it renders nothing when …
56c56
< - ui: /orders/:id — the badge for a requested refund, the badge for an approved one, and the page for an order with no refund (recipe `ui`)
> - ui: /orders/:id — the badge for a requested refund, an approved one and a declined one, and the page for an order with no refund (recipe `ui`)
```

Arm A's own row 1 cites both lines — "`plan.md:49` (T2), `plan.md:56` (ui row)" — so the
gap fired on the claim's absence from both places a claim can be, which is what the rule
in `agents/hodos-plan-reviewer.md` reads (it holds `plan.md` whole).

The code both arms are read against already carries the union — `src/features/orders/refund.ts:2`, `RefundState = 'requested' | 'approved' | 'declined'`, committed into the copy before either plan was written, because at plan time the type is what a reviewer can read and the diff does not exist yet.

```
node bench/scripts/fixture-copy.mjs webapp --into <copy> --no-modules
# refund.ts committed into the copy, then per arm:
sh dispatch.sh A <copy> <plugin root>      # the same shape references/plan.md §9 dispatches
sh dispatch.sh B <copy> <plugin root>
```

Arm A: 2 turns, **$0.60**, 128 s. Arm B: 2 turns, **$0.77**, 161 s. Both `subtype: success`.

## The result

| | Arm A — two of three claimed | Arm B — all three claimed |
|---|---|---|
| Verdict | `GAPS 4` | `GAPS 4` |
| A row naming `declined` | **yes** — row 1: "`RefundState` has three members (`src/features/orders/refund.ts:2` …); only two are claimed. Whether `declined` renders "Refund declined", renders nothing, or crashes on a missing label is untested — that path reaches no row in `verify.md` and ships unexercised" | **no** — `grep -c declined` is **0** |
| Other gap-7 rows | row 2: the `### Invariants & failure modes` clause "a refund request that fails must not blank the order" has no claim | row 1 (same clause, labeled "(gap 7)") · row 3: `pending: boolean` — a typed state in the hook's own return whose `true` case no claim names |

**The verdict is not the discriminator; the row is.** Both plans have four gaps, because both leave the failure-mode clause unclaimed and both phrase T2's acceptance in a way `test-mocking-boundary.md` refuses. What the arms separate is the one row this gap was added for: it is in A, naming the member and the line the type sits on, and it is absent from B.

Arm B's row 3 is the finding worth keeping: **nothing seeded it**. `useRefund` returns `{ refund, pending }`, and no clause in either plan says what the badge renders while `pending` is true — so the rule fired on a typed state the plan itself introduced two lines earlier, in its `Interfaces` field. That is the derivation rule generalising past the case it was written against, and it is the arm's own evidence that the gap is not a keyword match on the word "union".

## What this run does not say

Both plans were written by the session that wrote the gap. It says the gap fires on the input it names and stays off the member that is claimed; it says nothing about a plan written by somebody who had never read the rule — which is Stage 12's, on `ariadne_v2`, and `docs/stages/11d1-manual.md` M1's positive half in the meantime.
