# BENCH — how hodos is measured, and what each number does not prove

Four directories under `bench/`. Three of them score something; the fourth
produces inputs and scores nothing. The name is `bench/` and not `evals/` to
stay clear of the platform's own `claude plugin eval` layout (`PLATFORM-NOTES.md`
check K, decision 0005).

## Gate or measurement

Every number here is labeled. A **gate** carries a threshold and a failing run
fails the stage. A **measurement** is recorded and read, never thresholded.

The split is not bookkeeping. A shorter diff, a cheaper run and a smaller
package are all numbers that improve while the behavior behind them breaks, and
a threshold on one of them buys the improvement at the price of the behavior
(decision 0019). So sizes, costs, tool-call counts and turn counts are
measurements, and only accuracy, recall, precision and the no-op delta are
gates.

`bench/report.mjs` is where the label is applied, and it refuses the two ways a
label can drift: a gate built without a threshold, and a measurement built with
one. Every scorer's `--json` goes through it.

## Running them

```
# the sets are self-consistent — no model call, runs in npm test
node bench/router/run.mjs --check-labels
node bench/review/run.mjs --check-key
node bench/noop/run.mjs   --check-scenarios

# the scored runs — these call the model
node bench/router/invoke.mjs --out <dir> --concurrency 5
node bench/review/invoke.mjs --out <dir>
node bench/noop/run.mjs --invoke --out <dir>

# scoring what a run wrote — no model call
node bench/router/run.mjs --verdicts <dir>/verdicts.json --measurements <dir>/measurements.json --json
node bench/review/run.mjs --verdicts <dir>/verdicts.json --measurements <dir>/measurements.json --json
node bench/noop/run.mjs --observations <dir>/observations.json
```

`--json` on the `noop` scorer **exits 2 while its threshold is unset**: a report
with no gate reports nothing (`bench/report.mjs`), and the `noop` gate has no
threshold. The refusal is at `bench/noop/run.mjs:592-594`; the invariant it
protects is `bench/report.mjs:46`.

The invoking half and the scoring half are separate on purpose (decision 0027):
the scorer is covered by `node:test` tests that make no model call, which is
what lets a scoring change be re-run against a saved run instead of re-bought.

## The router bench — `bench/router/`

**Question.** Does the router put a description on the path and the type a
careful developer would?

35 cases, ten quick / ten standard / ten deep / five campaign (decision 0025, its counts amended by 0072), phrased
against the four fixtures as they stand. Each case carries the nine checklist
rows of `FORMATS.md §3` that produce its path, and `--check-labels` re-derives
every label from those rows through the six verdict rules: a label the
specification cannot produce is a label its author preferred, and a bench that
scores taste has no arbiter (decision 0025).

| Axis | Threshold | Kind |
|---|---|---|
| path accuracy | ≥85% | gate |
| type accuracy | ≥90% | gate |
| campaign flag | ≥90% | gate |
| row agreement, one number per checklist row | — | measurement |
| cost, tool calls, evidence calls, turns | — | measurement |

**Row agreement is the reading the gates cannot give.** A verdict is an
aggregate of nine judgements, so a gate that moves cannot say which of the nine
moved with it. `invoke.mjs` writes `rows.json` — the nine rows each case
printed, with their evidence — and `run.mjs --rows` scores each row against the
set's own. It carries no threshold: the set's author is a second reader, not a
ground truth, and there is no number of rows a router owes.

It is what turned run 2's failing path gate into a diagnosis. The eight
judgement rows agreed 83–100%; row 1, the file estimate, agreed 43%, and its
disagreements were ±1–2 files over whether a test or a manifest counts — while
rule 5 turns that row into a hard cut at three. Reading the aggregate alone,
the obvious repair was the aggregator; reading the rows, the repair was owed to
the row's own counting sentence and to two clauses the specification had left
undefined (decisions 0069, 0070, 0071).

**What the numbers do not prove.** That the router is right about a *real*
project. The fixtures are four small trees with three or four conventions each;
a case's file count is one those trees can produce, which is a smaller range
than any working repository has. Row 1 is the row to watch there: it is an
estimate made before design, it is the least reproducible of the nine, and it
is the one rule 5 reads as a hard limit. Stage 12 is where a router verdict
meets code nobody wrote for it.

## The review bench — `bench/review/`

**Question.** Does `hodos-reviewer` find a seeded defect, and does it stay quiet
where there is nothing to find?

Nineteen defects — twelve convention, seven behavioral across seven of the nine
`L` codes — and six correctly changed files, grouped into six review packages,
so the reviewer sees a task-shaped diff rather than one defect (decision 0037).
The nineteenth is the arm that measures `## Callers` (decision **0100**): its
only evidence is a call site outside the changed files, and the section is the
one place the reviewer is shown it.

| Axis | Threshold | Kind |
|---|---|---|
| recall, overall | ≥80% | gate |
| recall, convention | ≥80% | gate |
| recall, behavioral | ≥80% | gate |
| precision | ≥85% | gate |
| dispatches, cost, turns | — | measurement |

**This is a *seeded* gate, and its recall number proves the loop runs, not that
the reviewer generalises.** Eighteen of the defects and the reviewer's prompt
were authored in the same stage by the same session, and the nineteenth was
authored two stages later beside the section it measures: either way the bench
knows what the prompt was told to look for. A recall of 19/19 says the dispatch, the package, the
answer key and the scorer work end to end — it says nothing about a defect
nobody seeded. The hold-out measurement is Stage 12's, built from the pilot's
own findings on a repository this engine has never seen.

## The no-op bench — `bench/noop/`

**Question.** Would the model do it without the line?

`AUTHORING.md §2` asks this of every sentence in the engine, and this bench
answers it with a control. Each scenario names one **rule** — every file and
line that states it — a prompt that exercises it, and a check the rule is
supposed to make true. Two arms run against two copies of the repository as it
is published, one with the rule and one with every home of it removed, and a
scenario passes **only when the with-arm meets the check and the control does
not**.

Every home, not one line, because run 1 (2026-09-03) scored 0 of 6 and the
reason was the copy rather than the model: the plugin ships its own
specification beside the skills that restate it, so deleting a skill's line left
the rule in `docs/`, and one control quoted `docs/COMPONENTS.md:47` back as the
source of the rule it had just obeyed. A home embedded in a line that carries
other rules is rewritten rather than deleted, so the control loses the rule and
nothing else (decision 0073). Two limits are deliberate and recorded in the
scenarios that meet them: `DECISIONS.md` is not swept, and the harness deletes
prose, never code — a control that still behaves because a script enforces the
rule has answered that the prose is redundant with the script, which is the
answer `AUTHORING.md §2` asked for.

The without-line arm is expected to fail. That delta is the whole signal:
without it, "the behavior differed" is the reader's judgement, and a line that
changes nothing reads as a line that works. A control that also passes is
reported as a failed scenario.

| Axis | Threshold | Kind |
|---|---|---|
| scenarios showing a delta | **not set** — see below | gate, once one can be set |
| turns and evidence calls per arm | — | measurement |

**No threshold, after two runs that could set one.** Run 1 (2026-09-03) read
0 of 6 with a control that removed one line; run 2 read 0 of 6 with a control
that removes every prose home of the rule. What the two establish is not a
number: for these six rules the behavior the check asks about happens in both
arms, and what the rule buys is the length of the road — `task-preflight-stop`
took 2 turns with its rule and 18 without. Turns and cost are measurements and
decision 0019 forbids thresholding them, so the delta the bench can see is not
one it may gate, and the delta it gates is not there. A threshold of zero is a
gate that cannot fail, which is worse than none because it looks like one.

**One scenario is structurally unmeasurable, and the harness proves it without
a run.** Claude Code lists every skill's `description` to every session, so a
rule stated in a description is in context in both arms —
`skills/init/SKILL.md` says "Run before the first `/hodos:task`", which is
`task-preflight-stop`'s whole rule. `--check-scenarios` takes a `probe` per
scenario, builds the control copy, reads every prose file of it, and reports a
statement of the rule the scenario has not declared. That check costs nothing
and is what found this.

**What it does not prove.** That a line is *well written*, or that the behavior
it produces is the right one. It proves the line is load-bearing. A line that
fails its scenario is a candidate for deletion, not a proven mistake — and a
line whose effect is register or thoroughness cannot be a scenario here at all,
because its control cannot fail.

## The run harness — `bench/run/`

Not a bench. `seed.mjs` turns a fixture copy into a task directory at a chosen
phase — approved, review, verify or finish — by running `ledger.mjs` for every
event, so a copy arrives at its phase through the same script that would have
written it live (decision 0036). It scores nothing and carries neither gate nor
measurement (decision 0033); Stages 5 to 10b used it to seed the inputs their
criteria were run against.

## What every run here is exposed to

A headless bench run is a Claude Code session, and the operator's own enabled
plugins fire their `SessionStart` hooks inside it. There is no clean-profile arm
today: a fresh `CLAUDE_CONFIG_DIR` is unauthenticated rather than clean,
`--settings '{"enabledPlugins":{}}'` does not suppress a plugin's hooks, and
`--bare`, which does skip hooks, reads `ANTHROPIC_API_KEY` alone and bills the
API rather than the subscription window these costs are written against.

So each scored run records what was enabled while it ran, in its own
`runs/<date>/README.md`, and a comparison between two runs states whether that
list was the same. Nothing here assumes it.

## What a run costs

Recorded per run, never budgeted from memory. See each run's README under
`bench/*/runs/<date>/`.
