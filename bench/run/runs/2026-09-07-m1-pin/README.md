# M1 — the first live run of the pin, 2026-09-07

Stage **11d-3**, criterion 1 (*A pin outlives its task, and a broken pin says
who broke it*). One `/hodos:run home-shift-link` from phase `verify` in a
seeded `webapp` copy, run by the developer because `finish`'s pin question
needs `AskUserQuestion` and a `claude -p` session has none
(`PLATFORM-NOTES.md` fact 32).

**It delivered no pin.** `task/` is what it wrote — `verify.md`, `plan.md`,
`ledger.md`, `state.json` and three screenshots — kept because the table is
the result. The run stopped at the fix pass, so no `Fix` or `Verify 2` line
is in the ledger.

```
Verdict: FAIL · claims 12 · pass 6 · fail 2 · flaky 1 · pre-existing 0 · skip 3
```

## The claim was proved and then lost

Row 4 is the `ui` claim on `/` — "the navigation landmark's two link texts,
read in the page". Its evidence records the predicate correct on **both**
loads: `navigation "Sections"` → `link "Orders"`, `link "Shift handover"`. It
is `flaky`, and the reason is in the same cell: load 1's console carried
`[error] Failed to load resource: 404 (favicon.ico)`.

`finish.md §3a` puts a pin to the developer for a `pass · pin` row. There was
none, so the question this step exists to ask was never reached — by a favicon.

Rows 6 and 7 are `*source console/network*` **added** rows for the 404s on
`/orders` and `/orders/:id`. The same source, in the same table, treated two
ways: it became its own row on the routes that carried no claim, and was
folded into the claim on the route that did. Decision **0124** settles which
governs, in `oracles.md §1`.

## The fixture failed its own verdict

Rows 6 and 7 are `fail · major` for `GET /api/orders?status=all [404]` and
`GET /api/orders/o-1 [404]`, on a diff that touches `HomePage.tsx` and its
test. `BACKLOG.md` had carried that since the morning; what this run added was
the price. **M3's seeded defect could not render**: `summary-clipped-line`
puts the summary line in an 80px `overflow: hidden` box inside
`{summary && (…)}`, and with no API there is no summary, no clipped line and
nothing for the detector to hit — criterion 2 was unbuyable. Decision **0123**:
the fixture serves its own API in dev.

## What the run got right, and it is the stage's open question

Decision **0116** put four rules in `oracles.md` and the local half admitted
that nothing showed a rule there reaching an agent. This run's added rows carry
`*source console/network*` **and the command beside them** —
`navigate /orders; snapshot; console; network; detectors` — against Stage
11d-2's bare `source: detector` with no command at all. The exact shape
`FORMATS.md §10` asks for is italics on the source word alone
(`source *console* ·`), which did not take. Both halves of `oracles.md §1`'s
correction did.

The verifier also read `pre-existing` correctly by not using it: all three
non-passing rows are browser rows, and decision **0119** says a browser row has
no base run. It reported the base state in prose instead, quoting the fixture's
own `CLAUDE.md` line — the one decision 0123 has now changed.

## Which build answered

`hodos@hodos` **0.1.0** (commit `686b8d9`, 2026-09-06 21:59) is installed from
the marketplace and enabled in the user's settings, so an interactive session
started with `--plugin-dir` at the repository has two builds of this plugin
available to it. This run's own output says which answered, in four places
0.1.0 cannot reach: its `agents/hodos-verifier.md` contains `pre-existing`,
`flaky`, `attack` and `Claim feedback` **zero** times each, and it ships no
`skills/run/references/oracles.md` at all. `verify.md` here carries the header
`flaky 1 · pre-existing 0`, five `*source attack*` rows, a `## Claim feedback`
block, and added rows written in `oracles.md §1`'s form.

The check is the record, not the assumption: an arm's artifact is read for a
marker the installed build cannot produce, and this file names the four.

`hodos@hodos` was uninstalled and its marketplace removed later the same day,
so M1's re-run has one build to find. The marker check stays: it is cheaper
than the question.

## Cost

One verifier dispatch on `sonnet`, 10 m 12 s, inside M1's `$1-2` quote.

## The re-run, on the fixed fixture

The step was re-run on a fresh copy once decisions **0123** and **0124** were
built, and that run is what bought criterion 1's first half. Its copy is gone;
what it produced is below, and the pin itself survives in two other records —
its content in `../2026-09-07-m2-prune/config.diff`, which is the entry
`init --refresh` later pruned, and its *firing* in `arm2/verify-1.md` row 6,
where the next task's change breaks it.

```
Verify: PASS — 12 claims, 3 skipped, 0/0/0 by severity, flaky 0, pre-existing 0
```

The pin question named the route, the predicate and the value the row proved,
and said a later `ui` run checks it; the developer answered **pin them**, and
then **keep it** to the directory question. The row behind it was
`pass · pin` — route `/`, the `nav[aria-label="Sections"]` predicate in the
Command cell, the serialised value in the Evidence cell before the screenshot,
which is the three things `FORMATS.md §10` requires of a marked row.

```
Pinned: / — nav[aria-label="Sections"] … · config.mjs check: ok
$ git commit -qam "chore: pin the navigation claim the verify phase proved"
1787617
```

**What was not kept, and it should have been.** `11d3-manual.md`'s Report line
for M1 asked for five things — the question's own text, the `pass · pin` row's
three cells, the config diff, `config.mjs check`'s output and the commit line —
and none was copied out of the session before the copy went. The quotations
above are the run's, transcribed; the config diff is recoverable from
`m2-prune/config.diff` read backwards and nothing else here is. Review 1 filed
this as a minor (`11d3-review.md`), and it is the reason `m2-prune/`,
`m3-severity/` and `m4-statistics/` each copy their artefacts at the time.
