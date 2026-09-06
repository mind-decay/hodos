# No-op run 1 — 2026-09-03

The first real run of this bench, made once (decision 0063). Twelve arms, six
scenarios, `$5.94`, every arm `subtype: success`.

```
node bench/noop/run.mjs --invoke --out <dir>
node bench/noop/run.mjs --observations <dir>/observations.json
```

**0 of 6 scenarios showed a delta.** In every one the control — the arm with the
line deleted — met the check the line was supposed to make true.

| Scenario | With | Without | Why the scenario failed |
|---|---|---|---|
| `route-value-grammar` | pass | pass | nine legal values in both arms |
| `route-print-then-ask` | pass | pass | the verdict lines printed in both |
| `route-evidence-budget` | pass | pass | three evidence calls without the budget line |
| `task-preflight-stop` | pass | pass | both arms said `run /hodos:init first` and stopped |
| `reviewer-writes-one-file` | pass | pass | the reviewer wrote `review.md` and nothing else in both |
| `run-unknown-slug` | pass | pass | no task directory was created in either |

The arms did differ, and the difference is visible in the measurements rather
than in the checks: `task-preflight-stop` took 2 turns with the line and 11
without, `run-unknown-slug` 4 and 8. The model reached the same behavior by a
longer road.

## The finding: the plugin ships its own specification

The `task-preflight-stop` control says where it got the rule, in its own words:

> The task kernel's phase 0 is done only when `config.mjs find` returned a
> config, and the plugin spells out the missing-config case as a hard
> dependency: `docs/COMPONENTS.md:47` — *"`config.mjs find`; `notFound` → say
> 'run `/hodos:init` first' and stop (hard dependency)"*

`docs/` is inside the plugin, so **every rule in a skill has a second home the
model can read**: the value grammar is in `FORMATS.md §3`, the evidence budget
is decision 0029 in `DECISIONS.md`, the unknown-slug rule is in
`COMPONENTS.md`. Deleting one line from one skill does not remove the rule from
the artifact under test.

That is a result about the product, not a defect in the harness — `AUTHORING.md
§2` asks whether the model would do it *without the line*, and in the plugin as
shipped it does. Two readings follow, and they are not the same measurement:

1. **The shipped-artifact reading.** These lines are no-ops in the product, and
   the specification is what carries the behavior. Then the question is whether
   `docs/` belongs inside the plugin at all — which is decision 0064's territory
   and 11b's to settle.
2. **The authored-line reading.** A scenario should remove *every* copy of the
   rule, which makes a scenario a list of lines rather than one, and measures
   the author's sentence rather than the artifact.

Nothing is repaired here on the strength of this run: choosing between those two
readings changes what the bench means, which is a decision.

## What the run was exposed to

`caveman` and `hookify` were disabled for it and re-enabled after (the user's
call, `docs/stages/11a-plan.md` D5). Seven plugins stayed enabled: `clangd-lsp`,
`claude-md-management`, `frontend-design`, `gopls-lsp`, `humanizer`,
`rust-analyzer-lsp`, `typescript-lsp`.

## Two harness defects this run found, both fixed after it

- The `reviewer-writes-one-file` check read `@git-status` and allowed only
  `review.md`, while the harness itself writes `review-input.md` into the same
  copy. The reviewer had behaved correctly in both arms; the check had not. Its
  pattern now allows the package file and nothing else.
- `route-print-then-ask` carried an inline `(?m)`, which JavaScript does not
  accept, and the scorer threw on a run already paid for.
  `--check-scenarios` now compiles every pattern.

The scores above are after both fixes, re-scored from the same observations.
