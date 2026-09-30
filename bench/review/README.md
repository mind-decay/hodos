# Review bench

Does `hodos-reviewer` find a seeded defect, and does it stay quiet where there
is nothing to find? Twenty-two seeded defects and six clean files, grouped into
six review packages.

```
node bench/review/run.mjs --check-key                 # the set is self-consistent
node bench/review/invoke.mjs --out <dir> --dry-run    # every package applies — run this first
node bench/review/invoke.mjs --out <dir>              # dispatch the reviewer, write verdicts
node bench/review/run.mjs --verdicts <dir>/verdicts.json
node bench/review/run.mjs --verdicts <dir>/verdicts.json \
  --measurements <dir>/measurements.json --json    # the labeled JSON report
```

These packages own **no task directory and no ledger**: `invoke.mjs` calls
`render` directly on a fixture copy. So they carry no `Mutation:` header, which
is the specified shape for a package built over a diff that owns no task
(`FORMATS.md §8`), and the reviewer skips the comparison on it with no finding
and no Coverage sentence (`agents/hodos-reviewer.md`). The consequence is the
one this file states about every section it does not build: **this bench
measures nothing about decision 0122's mutation-count comparison.** That
comparison was measured on its own two arms instead, in
`bench/run/runs/2026-09-08-mutation-mismatch/`. Inventing a count here so the
header existed would have the bench score the reviewer against a number the
bench made up.

The JSON report carries one entry per metric, each labeled `gate` or
`measurement` (`bench/report.mjs`): the four thresholds above are gates, and
the dispatch count, the cost and the mean turn count are measurements.

## The set

`seeded/<id>.patch` — one defect each, applied to a `fixture-copy.mjs` copy.
Every patch carries its own metadata above the diff, which `git apply` ignores
and the scorer reads:

```
# id: b-l4-mutating-sort
# fixture: webapp
# package: p1
# kind: behavioral
# item: L4
# line: src/features/orders/model.ts:21
# anchor: <the text of that line, which is what a re-point compares>
# trigger: <the input or state under which it manifests>
# what: <the defect in one line>
```

`line` is where the defect sits **once the whole package is applied** — two
patches in one package can move each other's lines, and the scorer measures
against the copy the reviewer saw. `kind` is `convention` for a defect against a
project rule, a `defaults.md` entry or a plan field, and `behavioral` for one of
the nine risk codes (`L1`–`L9`, `agents/hodos-reviewer.md`). Twelve are
convention and seven are behavioral across seven distinct codes — the split
decision 0015 requires, reported per kind.

`spec` is the third kind (decisions **0092**, **0096**), and it is scored on a
different section of the same file. Two of the five uncovered classes of
decision **0096** are derivation gaps and land here — **state coverage** as
`s-unclaimed-refund-state`, a union member no `Acceptance:` clause names, and
**negative paths** as `s-unclaimed-page-limit`, a branch a task adds whose
failure path no clause names. The other three are not seedable here, and that is
a property of the roles rather than a gap in this set: the plan derives, the
review checks the derivation statically, and the verifier runs. A **presentation**
defect has no clause to be unclaimed against — its oracle is a threshold in
`scripts/detectors.mjs`, so it is seeded where that runs, as
`bench/run/defects/summary-clipped-line.patch`; **regression** needs a pin from
an earlier task, and the **state sweep** needs routes and forced states. A
patch seeding one of those three here would seed a defect the reviewer is
specified not to report. A derivation defect — a member of a typed state, a
branch's failure path or a clause of `### Invariants & failure modes` that no
`Acceptance:` clause of the package names — is reported in the **Spec** section's `Unclaimed`
word, not as a row of the Standards table. So its patch carries one more header
key, `names`, holding the tokens that text has to contain, and the member's own
name is what a token is:

```
# kind: spec
# item: Unclaimed
# names: declined
```

A spec patch carries no `trigger`, like a convention one: its location is its
instance. Its recall is a **measurement** and not a gate, and Stage 11d-3's
Start settled that it stays one (decision **0117**): the four thresholds were
bought on twelve convention and seven behavioral defects, a new class entering
their denominator would move a threshold with no decision behind it, and two
seeded defects cannot carry a bar of their own — one miss of two reads as 50%.
Stage 12's hold-out set is where a denominator worth thresholding comes from.
Its **precision** is measured by nothing: `precision` counts the Standards rows,
so a wrong Unclaimed entry costs no number here (`docs/BENCH.md`), which is
decision **0015**'s admission and is carried by name to Stage 12.

`test-floor` is the fourth kind (decision **0121**), and it is the one defect
in this set that **nothing in the reviewer's prompt names**. A diff that deletes
an assertion and leaves the suite green is invisible to every mechanism the
design has: `ledger.mjs` reads a test that exists, the `Tests:` comparison reads
an exemption the plan gave, mutation proves a test the diff **added**, and
`commands.test` reports green because green is what a suite reports when a case
is gone. So its first run is scored against the package as it stands, and the
mechanism decision 0121 describes is bought only if that run misses.

Three things about it are fixed **before** the baseline, because a measurement
whose rule moves between two runs cannot be compared with itself:

- **No line, no anchor.** A deletion adds no line, so there is nothing for an
  anchor to be and no five-line window to measure against — it is matched on its
  `names` tokens, like `spec`, and `checkKey` skips the line checks for it.
- **The net is three places, not one.** At the baseline the reviewer has no
  section to file a removal under, so a hit counts from a Standards row, a Spec
  word, or the Coverage line. That is why `parseReview` keeps the Coverage
  **text** and not only its word count.
- **Every token, not any.** A review that names the file but not what left it is
  a miss, and `missed` says so by id.

Its **precision** is measured by nothing, for the reason `spec`'s is: precision
counts Standards rows, and a wrong removal claim filed in Spec or Coverage costs
no number here. Decision **0015**'s admission again, carried to the hold-out set.

`clean/<id>.patch` and `clean.json` — six files changed **correctly** in the
same packages. A finding located in one of them is a false positive, and that is
the whole of the precision measurement.

One exception, and it is a line rule and not a file rule: where a **seeded**
patch of the same package also edits a clean file, findings on the lines that
patch changed are not false positives — `clean.json` says its files are "changed
correctly" and that stops being true exactly there, and nowhere else in the
file. `p3` is the case: `t-deleted-list-assertion` deletes a line from
`OrderList.test.tsx`, which `c-list-total-format` also extends. The clean set is
still six files, and a finding about the clean change itself still costs
precision.

**`--dry-run` before a scored run, always.** `--check-key` reads each patch's
own metadata and cannot tell whether the package's patches apply *together*:
seeded patches apply in filename order and then the clean ones, so a seeded
patch that changes a line a clean patch quotes as context breaks the package.
That cost two dispatches at Stage 12a before `t-deleted-list-assertion` was
moved off the line `c-list-total-format` quotes. `--dry-run` builds every copy
and dispatches nothing, so the same failure is free.

`packages/<id>.md` — the plan each package is reviewed against: the `## Design`
and `## Tasks` sections `review-package.mjs` copies into `review-input.md`, plus
the `## Non-goals` two of the defects are seeded against. The package's patch
list is not written here: every patch names its own package, so the grouping has
one source.

## The packages

| Package | Fixture | What the plan asks for | Seeded | Checks after the package applies |
|---|---|---|---|---|
| `p1` | webapp | a summary line above the order list | `w-literal-query-key` · `w-bare-fetch` · `b-l4-mutating-sort` | lint fails |
| `p2` | webapp | the status filter in the URL | `w-barrel-bypass` · `w-api-error-shape` · `b-l2-type-contract` | all pass |
| `p3` | webapp | two actions on an order, and a refund's state | `w-error-role-alert` · `w-test-mocking-boundary` · `b-l5-control-flow-escape` · `s-unclaimed-refund-state` · `t-deleted-list-assertion` | all pass |
| `p4` | api | a minimum-total filter and paging | `a-route-not-in-table` · `a-plain-error` · `b-l3-boundary` · `s-unclaimed-page-limit` | all pass |
| `p5` | api | a creation date and a `since` filter | `a-service-imports-http` · `a-nongoal-config-knob` · `b-l9-time-locale` | lint fails |
| `p6` | webapp | a refresh control and per-status rows | `w-refactor-out-of-scope` · `w-silenced-rule` · `b-l7-race` · `b-l6-callee-contract` | all pass |

**A new defect joins a package rather than making one** (Stage 11d-2). Two
patches of one package may share a file — `a-plain-error` and `b-l3-boundary`
already do — and a package is what the reviewer sees in one dispatch, so a
seventh would add a seventh dispatch and, through the partial-run gate, turn
every archived full-set verdicts file into a run of six of seven. Sharing costs
one constraint instead: patches apply in **filename order**, so a patch that
edits what another one adds sorts after it. `s-unclaimed-page-limit` edits the
`page` helper `b-l3-boundary` adds, and `s-` sorts after `b-`.

Four of the six packages leave `test`, `typecheck` and `lint` green, which is
the point: a bench whose defects are all reachable by the tooling measures the
tooling. The two that fail lint do so on one seeded defect each, and the
reviewer is expected to report the other two of that package anyway.

## The gates

| Axis | Threshold | Kind | Gated at |
|---|---|---|---|
| recall, overall | ≥80% | gate | Stage 6 |
| recall, convention | ≥80% | gate | Stage 6 |
| recall, behavioral | ≥80% | gate | Stage 6 |
| precision | ≥85% | gate | Stage 6 |
| recall, spec | — | measurement | Stage 11d-1; kept a measurement at 11d-3 (decision **0117**) |
| recall, test-floor | — | measurement | Stage 12a (decisions **0121**, **0117** at n=1) |

`COMPONENTS.md §7`, decision 0015. A defect is found when a finding names its
file, sits within five lines of the defect's anchor, and carries an item of the
right kind — the answer key is derived from the patch, never from a reading of
the review (`run.mjs --check-key`).

The five lines are `TOLERANCE` in `run.mjs`, and the window is around the
anchor rather than the seeding hunk's bounds: a reviewer reports the line it
read the defect on, and the line a patch seeded shifts when a second patch in
the same package lands above it. In the run of 2026-09-01 every crediting
finding was within three lines and all eighteen were inside their own patch's
hunk, so the window bought nothing that run — it is there to stop a one-line
drift from reading as a miss. Dispatch counts and token costs are
**measurements**, recorded beside a run and never thresholded (decision 0019).

Six dispatches per scored run, not twenty-one: the patches are grouped so the
reviewer sees a task-shaped diff, which is both the realistic input and the one
that can be re-measured after a prompt change (decision 0037).
