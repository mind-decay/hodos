# No-op run 2 — 2026-09-03

The first run whose control removes the **rule** rather than one line: six
scenarios, 24 homes across 14 files, sixteen of them rewritten rather than
deleted (decision 0073). Twelve arms, `$6.12`, every arm `subtype: success`.

```
node bench/noop/run.mjs --check-scenarios
node bench/noop/run.mjs --invoke --out <dir>
node bench/noop/run.mjs --observations <dir>/observations.json
```

**0 of 6 scenarios showed a delta** — the same score as run 1, from a control
that is not the same control.

| Scenario | With | Without | Why the scenario failed |
|---|---|---|---|
| `route-value-grammar` | pass | pass | nine legal values in both arms |
| `route-print-then-ask` | pass | pass | the verdict lines printed in both |
| `route-evidence-budget` | pass | pass | 4 evidence calls with the rule, 5 without — the control sat on the limit it had never been told |
| `task-preflight-stop` | pass | pass | both arms stopped and said `run /hodos:init first` |
| `reviewer-writes-one-file` | pass | pass | `review.md` and nothing else, in both |
| `run-unknown-slug` | pass | pass | no task directory in either |

## What the run does say

The arms differ, and the difference is entirely in what the work cost:

| Scenario | Turns, with | Turns, without |
|---|---|---|
| `task-preflight-stop` | **2** | **18** |
| `run-unknown-slug` | 4 | 8 |
| `route-evidence-budget` | 9 | 10 (and 4 → 5 evidence calls) |
| `route-value-grammar` | 8 | 7 |
| `route-print-then-ask` | 8 | 7 |
| `reviewer-writes-one-file` | 2 | 2 |

Run 1 measured 2 vs 11 on `task-preflight-stop`; with every home of the rule
gone it is 2 vs 18. Removing the rule did not change where the model arrived.
It changed how far it had to walk — and turns and cost are **measurements**,
which decision 0019 forbids thresholding. So the delta the bench can see is not
one it is allowed to gate on, and the delta it gates on is not there.

## The finding: one scenario is structurally unmeasurable, and the harness now says so

`task-preflight-stop`'s control stated where it got the rule:

> A sibling script states the prerequisite outright — `scripts/review-package.mjs:196`:
> `no hodos config found — run /hodos:init first` — as does the init skill's own
> description: *"Run before the first /hodos:task."*

`skills/init/SKILL.md`'s frontmatter `description` is the decisive one. Claude
Code lists **every** skill's description to **every** session, whether or not
anything reads the file, and a skill without a description is not a skill. The
rule is therefore in context in both arms and no control can take it away.

That was found by paying for a run. It will not be found that way again:
`--check-scenarios` now takes a `probe` per scenario — a pattern matching any
statement of the rule — builds the control copy and reads every prose file of
it, and a hit the scenario has not declared in `probeAllows` is a problem
**before a session is bought**. Run against this set it finds
`skills/init/SKILL.md:3` on its own, along with two lines that share the words
for different rules. No model call, no cost.

Two limits stay by choice and each is written into the scenario that meets it:
`DECISIONS.md` is not swept, because deleting the reasoning removes a reader's
history and no behavior; and **the harness deletes prose, never code**, so
`ledger.mjs` refusing `claim` for an unknown slug and `review-package.mjs`
printing the init prerequisite both survive every control. A scenario whose
control passes because a script enforces the rule has answered `AUTHORING.md
§2`'s question: the prose is redundant with the script.

## The threshold

**Not set.** `COMPONENTS.md §7` asks for it to come from the first real run;
two real runs now read 0 of 6, the second with a control that provably removes
the rule from every prose home it has. A threshold of zero is a gate that
cannot fail, which is worse than none because it looks like one.

What the two runs establish is narrower and more useful than a number: for
these six rules, the behavior the check asks about happens either way, and what
the rule buys is the length of the road. Both readings a threshold could be
built on — gate the delta, or gate the cost — are decisions rather than
repairs, and the second is one decision 0019 has already refused.

## What the run was exposed to

`caveman` and `hookify` disabled for its duration and re-enabled after — the
same condition run 1 ran under. Seven plugins stayed enabled: `clangd-lsp`,
`claude-md-management`, `frontend-design`, `gopls-lsp`, `humanizer`,
`rust-analyzer-lsp`, `typescript-lsp`.

`observations.json` carries every arm's transcript, files, paths and metrics,
which is what the tables above rest on.
