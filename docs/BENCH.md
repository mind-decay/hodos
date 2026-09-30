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
node bench/holdout/run.mjs --check-key
node bench/noop/run.mjs   --check-scenarios

# the scored runs — these call the model
node bench/router/invoke.mjs --out <dir> --concurrency 5
node bench/review/invoke.mjs --out <dir>
node bench/holdout/invoke.mjs --out <dir>
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

Twenty-two defects — twelve convention, seven behavioral across seven of the
nine `L` codes, two of the `spec` kind and one of the `test-floor` kind — and six correctly changed files,
grouped into six review packages, so the reviewer sees a task-shaped diff rather
than one defect (decision 0037). The nineteenth is the arm that measures
`## Callers` (decision **0100**): its only evidence is a call site outside the
changed files, and the section is the one place the reviewer is shown it. The
last two are the arms that measure the **Unclaimed** word (decisions **0092**,
**0096**) and are scored on the Spec section rather than on a row:
`s-unclaimed-refund-state`, whose diff adds a three-member union its plan claims
two of, and `s-unclaimed-page-limit`, whose diff adds a branch whose failure
path no clause names. Both defects are in the claim set and not in the code.

| Axis | Threshold | Kind |
|---|---|---|
| recall, overall | ≥80% | gate |
| recall, convention | ≥80% | gate |
| recall, behavioral | ≥80% | gate |
| precision | ≥85% | gate |
| recall, spec | — | measurement |
| recall, test-floor | — | measurement |
| dispatches, cost, turns | — | measurement |

`recall, spec` carries no threshold, and Stage 11d-3's Start settled that it
stays that way (decision **0117**). The four gates were bought on the two kinds
that existed when they were set, and a third class entering their denominator
would move a threshold with no decision behind it. Nor can the class carry one
of its own yet: **two** seeded defects cannot bear an 80% bar, where a single
miss reads as 50% — the gate would either fail a stage on one row or be a number
chosen to fit two cases. Both were authored by the sessions that wrote the word
they measure, which is the same reason the four gates are read as seeded numbers
rather than as generalisation. Stage 12c-3's hold-out set, where such a
denominator was to come from, holds no `spec` defect. Its two pilot defects
that the review named only in `## Spec` are reported apart from recall
(`bench/holdout/runs/2026-09-30/`), so the class still has no denominator
worth a threshold.

The Spec section's **precision** is measured nowhere, and nothing here should be
read as measuring it: `precision` counts the Standards rows, and an Unclaimed
entry is not one, so a wrong entry — a member or a clause a claim does name —
costs nothing in any number this bench prints. It is decision **0015**'s
admission by name, carried to Stage 11d-3's *Every axis a bench reads is
measured* criterion.

The **twenty-second** defect was authored at Stage 12a by decision **0121**:
`t-deleted-list-assertion`, a diff that deletes the assertion pinning a row's
link and leaves the suite green — the shape no mechanism in the engine reads,
since mutation proves a test that **exists** and the reviewer's step 1 reports a
suite with a switched-off case green. Its first run was scored against the
package **as it stands**, and whether the reviewer caught it cold is what
decided whether a mechanism was bought for it. Its number is a **measurement**,
for `recall, spec`'s reason at n=1 (decision **0117**): one seeded case cannot
carry an 80% bar.

**It was caught cold, twice: 1/1 in each of two runs.** The first
(`bench/review/runs/2026-09-08-12a-baseline`, 6 dispatches, $4.91) had its
answer key edited **after** the dispatches went out — `names` read `getByRole`,
the matcher, where the kind's rule is that a token is the thing itself, so it
became `href` — and review 1 of Stage 12a proved that edit decision-determining:
re-scored with the pre-run key the scorer prints `recall, test-floor 0/1`, which
is 0121's *miss* branch. The number was therefore re-bought rather than argued
(`bench/review/runs/2026-09-08-12a-cold`, 6 dispatches, **$5.03**), with the key
already committed, the package shape specified, and `defaults.md` row 12 held
out of the tree so the run measured the cold catch and not the mechanism. A
fresh reviewer instance again filed it as a `major`: *"the `Ada` link-**href**
assertion was deleted; scope permits the list's tests to gain the totals case
only, `OrderList.tsx:15` still renders the link, and the test's name now claims
a route check it no longer makes"*. Two independent dispatches reached for the
same word for the same thing, which is the check the first run's post-run edit
could not supply about itself.

So decision 0121's computed section on `## Callers` was **not** bought, and what
it cost instead is `defaults.md` **row 12** and this paragraph. Two things still
bound the claim: at n=2 both instances read the same authored patch, so decision
**0117**'s reasoning does not improve — the number carries no threshold either
way — and the whole-review net can credit an incidental mention of a token.
Stage 12c-3 looked for a third instance and found none. No source the hold-out
set draws on deletes a test, and where it was looked for is in
`docs/stages/12c3-plan.md`, T17, so the count stays at n=2.

That first run also found a defect in this bench rather than in the engine, and
it is worth recording because it deflated one number: a file `clean.json` names
**and** a seeded patch edits is not clean on the lines that patch changed, and
the reviewer's correct catch was scored a false positive against it — precision
printed 97.7% before the rule was narrowed and 100% after. The scorer now
exempts only the seeded patch's own hunk, so the clean set is still six files
and a finding about the clean change itself still costs precision. The cold run
prints **97.7% (42/43)** on a false positive of its own, unrelated to any of
this: p4 filed `test/services.test.js:12` against catalogue row 11, in a clean
file no seeded patch touches.

**This is a *seeded* gate, and its recall number proves the loop runs, not that
the reviewer generalises.** Eighteen of the defects and the reviewer's prompt
were authored in the same stage by the same session, the nineteenth was authored
two stages later beside the section it measures, and the two `spec` ones at
Stages 11d-1 and 11d-2 by the sessions that wrote the word they measure: either
way the bench knows what the prompt was told to look for. A recall of 19/19 on
the gated kinds says the dispatch, the package, the answer key and the scorer
work end to end — it says nothing about a defect nobody seeded.

The `test-floor` defect is the one partial exception, and only in one direction:
it too was authored by the session that measured it, so its **selection** is
seeded like every other, but no sentence of the reviewer's prompt named the
shape when it ran, so its **catch** was not. That is a weaker claim than
hold-out and a stronger one than the rest of this set makes, and it is the whole
of what decided decision 0121. The hold-out measurement ran at Stage 12c-3,
on logic-lens's cases and on the pilot's own findings. The result is in the
next section.

## The hold-out set — `bench/holdout/`

**Question.** Does `hodos-reviewer` find a defect nobody on the authoring side chose, and stay quiet on correct code that looks like a hit?

A **measurement** and never a gate (decision **0154**). The set lives in its own directory with its own answer key, so no case of it can enter the review bench's four gated denominators. Its report is `bench/report.mjs`'s `measurementReport`, which refuses a gate, and its `--check-key` holds it to its own contract and not to the review bench's minimums.

| Axis | Kind |
|---|---|
| recall, overall; recall per source (logic-lens, pilot) | measurement |
| L code agreement, of the behavioral defects found | measurement |
| false positives on the six correct files | measurement |
| dispatches, cost, turns | measurement |

It has two sources, which are never averaged into one number:
- **logic-lens's 36-case subset** (`hyhmrright/logic-lens` at `0ea7f9b`, MIT). It holds 30 defects and 6 cases that logic-lens itself grades as correct: idiomatic code that reads like an L4, L7 or L8 hit, and the *plausible but correct* half the Stage 12 row asks for. The code is imported verbatim, comments included, and several comments point at their own defect. So this half measures recall under logic-lens's own conditions, not on a harder set.
- **The pilot's own findings**: four defects Stage 12c-2's reviews found on `ariadne_v2` and its fix passes repaired. Each is reviewed from the very package its first reviewer received. The pilot's licence is not MIT, so its cases are keyed by sha and line hash, and they run only where the checkout and the gitignored cache are. Re-finding them measures reproducibility on real defects, not recall on defects never met.

**The first run** is `bench/holdout/runs/2026-09-30/`. It covers nine dispatches over two invocations, a probe of two packages and then the other seven, scored as one set. The cost was **5.17M tokens, $8.90**.

| Measurement | Value |
|---|---|
| recall, logic-lens | **29/30** — `ll-232` missed as a row, named in `## Spec` |
| recall, pilot | **2/4** — both `pilot-outline` defects named only in `## Spec`, at their own lines |
| L code agreement, found behavioral defects | **25/30**, 1 hedged (`L5 / L8`) |
| false positives on the six correct files | 1 L-coded, 1 other |
| findings without a location, an item or a trigger | 0 |

- **What the misses have in common.** All three are the review naming the defect in Spec and not in a Standards row. The review bench's rule reads rows only, so they count as missed, and `named only in ## Spec` reports them beside recall rather than in it.
- **The code disagreements.** Two `L5` defects were filed `L6`. An `L2` was filed `L3`. An `L3`, an N+1 query, was filed under the plan field `### Data & scale`, which is the move `b-l6-callee-contract` makes (`BACKLOG.md`).
- **The L-coded false positive.** It sits on `store/cache.go:25`, logic-lens's #250, which grades the `defer` on every path as correct. The reviewer filed something else, and it holds on the code: the fields are unexported and there is no constructor, so a `Store` built outside the package has `maxSize` 0 and every `Set` returns `cache full`. It is scored as the key says. That the key grades one property of the file, and not the whole file, is a limit of the case, not of the reviewer.

`bench/holdout/README.md` has the layout, the provenance of every case, and what each number does not prove.

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

## The two-repository pair — `bench/scripts/pair-seed.mjs`

Not a bench either, and not a fixture: an arrangement of two of them. It seeds
the workspace Stage 9b is exercised against — `mono/` as the home repository
where the map lives, `kit/` as the external one, and a bare clone of each as its
`origin` — and prints the four paths as JSON.

```
node bench/scripts/pair-seed.mjs [--into <dir>] [--no-modules]
```

The names are fixed, because a node's `repo: kit` resolves to the repository
root's own directory name (decision **0134**). The three properties decision
**0040** refused `kit` for are what the seed supplies (decision **0077**): the
map on `main` is written and committed by a teammate before any session opens
the pair; the claim on `mono-lint-badge` is committed by that teammate on
`feature/mono-lint-badge`; and that branch exists **only in the bare origin**,
so a session sees the claim after a `git fetch` and not before. The two a
fixture imitates rather than reproduces — a foreign owner who is a person, and a
race two people settle — are named as unmeasured in `docs/stages/09b-report.md`
and answered by Stage 12.

## The assertion instrument — `bench/scripts/assert-audit.mjs`

Not a bench, and not a harness either: an **instrument**. It measures a project,
not the engine, so it scores nothing and carries neither gate nor measurement.

```
node bench/scripts/assert-audit.mjs [<repository root>]   # --help states the definition
```

It prints `<bare>\t<total>\t<file>` for every file under
`<root>/crates/**/tests/**.rs` with at least one bare assertion, worst first,
then `bare <n> of <m> in <k> files`. A call is `assert!`, `assert_eq!` or
`assert_ne!` reached as a whole macro name, and it is **bare** when its argument
list holds no message argument. Comments, strings, char literals and raw strings
are skipped by one shared reader, and arguments split at top-level commas only —
a turbofish comma included, since `assert!(HashMap::<K, V>::new().is_empty())`
is bare and reading it as two arguments would score it as carrying a message.

Stage 12c-1 uses it to pick the pilot's second `quick` family, because that
family had first been read out of the project rule that also targets those files
and a measurement may not take its own sample from the treatment (decision
**0155**). Its output on the pilot is in `docs/PILOT.md §3` with the two limits
the header states. `node --test bench/scripts/assert-audit.test.mjs` is its
nineteen cases; twenty mutants die against them, and the two that survive are
argued equivalent in `docs/stages/12c1-report.md` rather than fitted with a test.

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
