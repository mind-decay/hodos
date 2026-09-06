# Router bench

Does `task`'s router put a description on the path and the type a careful
developer would? 35 labeled descriptions, three gated axes.

```
node bench/router/run.mjs --check-labels          # the set is self-consistent
node bench/router/run.mjs --verdicts <file.json>  # score a run
node bench/router/run.mjs --verdicts <old.json> \
  --verdicts <partial.json>                       # a mixed score, named as one
node bench/router/run.mjs --verdicts <dir>/verdicts.json \
  --measurements <dir>/measurements.json \
  --rows <dir>/rows.json --json                   # the labeled JSON report
```

The JSON report carries one entry per metric, each labeled `gate` or
`measurement` (`bench/report.mjs`). A gate without a threshold and a
measurement with one are both refused where the report is built, so the label
cannot drift from what the number is.

## The set

`set.json` — 35 cases, **10 quick / 10 standard / 10 deep / 5 campaign**, all four
types, phrased against the four fixtures **as they stand**: the work a case names
is work the fixture does not already ship, and every file count is one that
fixture can produce (Stage 11a, T1). Each case carries:

- `description` — what the developer would type after `/hodos:task`;
- `checklist` — the nine rows of `FORMATS.md §3`, the values a correct routing
  would fill in;
- `expect` — `path`, `type`, `campaign`.

`path` has four values, `campaign` among them, and `expect.campaign` is that
label restated (decision 0025).

**A label is derived, never chosen.** `--check-labels` re-derives every
`expect.path` from that case's own nine rows through the six verdict rules of
`FORMATS.md §3`, in order, and exits 1 on a mismatch. It runs in `npm test`. The
point is not tidiness: a bench whose labels come from the author's taste scores
the model against taste, and a disagreement then has no arbiter. Here the
arbiter is the specification, and a case that cannot be derived is a case whose
rows are wrong — or a rule that needs to change, which is a decision.

## The gates

| Axis | Threshold | Kind | Gated at |
|---|---|---|---|
| path | ≥85% | gate | Stage 11 |
| type | ≥90% | gate | Stage 11 |
| campaign flag | ≥90% | gate | Stage 11 |

`COMPONENTS.md §7`. A case with no verdict counts as wrong on every axis: a
router that answers nothing has not been accurate about it. Tool-call counts and
token costs are **measurements**, recorded beside a run and never thresholded
(decision 0019).

So is **row agreement** — `--rows <file>`, one number per checklist row, the
set's value against the value the run printed. A verdict is an aggregate of nine
judgements and the three gates score the aggregate: when a gate moves, the gate
cannot say which of the nine moved. Row agreement can, and it is the reading
that separates a router that judged differently from one that applied the rules
wrongly. It carries no threshold, because there is no number of rows a router
owes — the set's author is not a ground truth, only a second reader.

A full run costs about a quarter of a day's usage window, so Stage 4 records one
run as a measurement and the thresholds are gated at Stage 11, which owns the
bench and repairs the set (decision 0028).

`--verdicts` is repeatable for the same reason: after a specification change
only the cases the change can reach are worth re-buying, and a later file
overrides an earlier one for the ids it carries. The score is then **mixed**,
and both the table and the JSON report name how many verdicts came from which
file — a mixed number that does not say so is one a reader takes for a run.

## What produces the verdicts

`invoke.mjs`. It prepares one `fixture-copy.mjs` copy per fixture, seeds a
minimal `config.json` into the three fixtures Stage 3 left without one — the
kernel's step 0 stops at "run `/hodos:init` first" otherwise — runs one headless
session per case, and writes `verdicts.json` beside a `rows.json` — the nine
rows each case printed, with their evidence — and a `measurements.json`.

```
node bench/router/invoke.mjs --out <dir> [--only <ids>] [--concurrency <n>] [--dry-run]
node bench/router/run.mjs --verdicts <dir>/verdicts.json
```

**The arm, answering check D** (`PLATFORM-NOTES.md` fact 32, verified 2026-08-31):

```
claude -p "/hodos:task <description>" \
  --plugin-dir <repo> --strict-mcp-config \
  --permission-mode bypassPermissions \
  --output-format stream-json --verbose
```

The permission mode is load-bearing, not convenience: the plugin root sits
outside the session's working directory, so without it the kernel cannot read
`references/route.md` and stops — correctly, by its own fail-closed invariant.
The fallback arm of check D (the procedure through a general-purpose subagent)
is not used.

What is scored is the verdict the router **prints**, not `brief.md`: a headless
session has no `AskUserQuestion`, so the run prints its checklist and its three
verdict lines and ends — and printing before asking is what `route.md §5` asks
for anyway. `run.mjs` scores; `invoke.mjs` invokes; the split is what lets the
scorer be covered by tests that make no model call (decision 0019).

```json
[{ "id": "q01", "path": "quick", "type": "feature", "campaign": false }]
```

## What run 1 cost, what it found, and what T1 changed

35 cases, 8 minutes at concurrency 5, `$15.41`, and — the number that binds —
about a quarter of the subscription's 5-hour usage window. Scored
path 62.9% / type 85.7% / campaign 94.3%.

**Run 1 is a baseline, not a comparison.** It scored the set as it stood at
commit `599ff17`, and Stage 11a's T1 rewrote or re-rowed twenty-five of the 35
cases. Per case the two runs are not the same measurement; the run under
`runs/2026-08-31/` is kept so the next run has something to be read against,
and `docs/stages/11a-report.md` records what changed in each repaired case.

The diagnosis is in `docs/stages/04-report.md`, and its three findings are what
T1 acted on:

| Finding | What T1 did |
|---|---|
| Three of 35 cases described work the fixture already ships | Every description was re-read against the fixture. Four premises were false — `q02` (both screens already print `toFixed(2)`), `q03` (`list('all')` already returns everything), `q08` (`OrdersPage` already guards on `isPending`), `s07` (an `Order` carries no date to format) — and each was replaced by a true one taken from the fixture's own code. |
| Several checklists carry file counts these small fixtures cannot produce | Every count was refilled against the fixture's file list: `c01` 20 → 8 in a five-file monorepo, `d08` 12 → 7 in a six-file library, and the cases whose count had been chosen for the label rather than for the work. |
| `new module` and `contract / schema / route change` are under-defined | Decision **0068** gives each a test, in `FORMATS.md §3` and in `route.md`'s evidence table. The set's rows were refilled from the tests — which moved `s01` and `s11` to `new module: no` (a new file imported only from inside its own directory) and `s10` to `contract: no` (a new optional parameter widens nothing a caller must react to). |

Three type labels moved with them, each derived from `DESIGN.md §4.1`'s own
definition — `refactor` is "behavior stays, structure changes": `s12` (class
names built with `clsx`), `c03` (a vocabulary moved into `kit`) and `c04` (REST
calls replaced by a gateway) were labeled `feature` and are refactors. `c05`
became `bug`: a failing accessibility audit is a red-capable command, which is
the `bug` type's own test.
