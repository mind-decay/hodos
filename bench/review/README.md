# Review bench

Does `hodos-reviewer` find a seeded defect, and does it stay quiet where there
is nothing to find? Nineteen seeded defects and six clean files, grouped into
six review packages.

```
node bench/review/run.mjs --check-key                 # the set is self-consistent
node bench/review/invoke.mjs --out <dir>              # dispatch the reviewer, write verdicts
node bench/review/run.mjs --verdicts <dir>/verdicts.json
node bench/review/run.mjs --verdicts <dir>/verdicts.json \
  --measurements <dir>/measurements.json --json    # the labeled JSON report
```

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

`clean/<id>.patch` and `clean.json` — six files changed **correctly** in the
same packages. A finding located in one of them is a false positive, and that is
the whole of the precision measurement.

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
| `p3` | webapp | two actions on an order | `w-error-role-alert` · `w-test-mocking-boundary` · `b-l5-control-flow-escape` | all pass |
| `p4` | api | a minimum-total filter and paging | `a-route-not-in-table` · `a-plain-error` · `b-l3-boundary` | all pass |
| `p5` | api | a creation date and a `since` filter | `a-service-imports-http` · `a-nongoal-config-knob` · `b-l9-time-locale` | lint fails |
| `p6` | webapp | a refresh control and per-status rows | `w-refactor-out-of-scope` · `w-silenced-rule` · `b-l7-race` · `b-l6-callee-contract` | all pass |

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

Six dispatches per scored run, not twenty-four: the patches are grouped so the
reviewer sees a task-shaped diff, which is both the realistic input and the one
that can be re-measured after a prompt change (decision 0037).
