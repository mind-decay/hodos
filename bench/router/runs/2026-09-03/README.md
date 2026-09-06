# Router run 2 — 2026-09-03, the gated run

The scored run of Stage 11a, made once (decision 0063) against the set as T1
repaired it. `verdicts.json` is what `run.mjs --verdicts` scores;
`measurements.json` carries the per-case tool-call counts and the
evidence-row check — measurements, never thresholded (decision 0019).

- Command: `node bench/router/invoke.mjs --out <dir> --concurrency 5`, then
  `node bench/router/run.mjs --verdicts <dir>/verdicts.json`.
- **Scored: path 28/35 = 80.0% · type 34/35 = 97.1% · campaign 34/35 = 97.1%.**
  The path gate is ≥85%: **not met.** Type and campaign are met.
- Cost `$17.81`, 35 sessions at concurrency 5, all 35 `subtype: success`, none
  without a verdict.
- Measurements: 3.51 evidence calls on average (one case, `q05`, over the five
  of decision 0029), 7.20 tool calls, 7.9 turns; every case printed all nine
  rows with evidence, 35 of 35.
- **What was enabled while it ran.** `caveman` and `hookify` were disabled for
  this run and re-enabled after it (the user's call, recorded in
  `docs/stages/11a-plan.md` D5); seven plugins stayed enabled —
  `clangd-lsp`, `claude-md-management`, `frontend-design`, `gopls-lsp`,
  `humanizer`, `rust-analyzer-lsp`, `typescript-lsp`. Run 1 (2026-08-31) ran
  with all nine, `caveman` included, so the two runs' conditions differ.
- The 35 raw `stream-json` transcripts (3.1 MB) are not committed; the numbers
  above and both JSON files are what the report rests on.

## Against run 1

Run 1 scored path 62.9% / type 85.7% / campaign 94.3% on the set as it stood at
`599ff17`. Twenty-five of the 35 cases were rewritten or re-rowed by T1, so the
two runs are **not** comparable per case, and the conditions differed as above.
What can be said is that the repaired set and the row tests of decision 0068
moved path from 22/35 to 28/35 and type from 30/35 to 34/35.

## The seven path misses, from the rows the model itself printed

In every one, the six rules were applied correctly to the rows the session
wrote — the disagreement is upstream of the rules, in what the rows should say.

| Case | Expected | Got | What the model's rows said |
|---|---|---|---|
| `q10` | quick | standard | `new module: yes` — it put the log writer in `src/http/`, which `server.js` imports from outside that directory, and said inline-in-`server.js` was "the arguable lighter reading" it declined. The set assumed the lighter one. |
| `s03` | standard | deep | `contract: unknown` — one candidate fix moves the filter to the URL, which would make `/orders` carry a search param. An unknown in rows 3–5 is rule 2, and "any unknown moves the verdict heavier" is `DESIGN.md §4.1`'s own instruction. |
| `s09` | standard | quick | `files: 0` — "answering changes no files; the answer is prose with `path:line` citations". For a `question` that is simply right; the set's `unknown` was not. |
| `d03` | deep | standard | `new module: no` — a connection file inside `src/store/`, imported only from there. Rule 3a needs rows 2 **and** 3, so a store swap carrying a new dependency and a new persisted schema routes `standard`. |
| `d04` | deep | standard | rule 3b, the wide-refactor clause: "the done-metric covers four enumerated files, not 'many'". |
| `d05` | deep | standard | rule 3b again: "the refactor's done-metric spans 2 files, not many". |
| `c01` | campaign | deep | `needs more than one mergeable unit: no` — "the svc removal and the web import rewrite must land atomically or web breaks; 6 source files, one repo". |

Two findings follow, and neither is repaired here — repairing a set against the
run that scored it is fitting the gate to the result:

1. **The fixtures are too small for rule 3b and for campaign scale.** `d04`,
   `d05` and `c01` all turn on width — "many files", "more than one mergeable
   unit" — in trees of five and six source files. A monorepo whose whole
   surface is six files honestly ships a package split on one branch. The set
   asks for a judgement the fixture cannot support.
2. **`deep` has one usable trigger, and it is narrow.** Rule 3a fires only when
   rows 2 and 3 are both `yes`; rule 2 fires on an `unknown`. `d03` — a
   persisted schema where none existed, a new dependency, changed exported
   semantics — is `standard` by the rules as written. Whether that is the
   intent is a question for `FORMATS.md §3`, which is a decision, not a repair.
