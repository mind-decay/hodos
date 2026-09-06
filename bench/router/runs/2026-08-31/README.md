# Router run 1 — 2026-08-31

The scored run `docs/stages/04-report.md` reports, kept so Stage 11 inherits a
baseline rather than a paragraph. `verdicts.json` is what `run.mjs --verdicts`
scores; `measurements.json` carries the per-case tool-call counts and the
evidence-row check (decision 0019: a measurement, not a gate).

- Command: `node bench/router/invoke.mjs --out <dir> --concurrency 5`, then
  `node bench/router/run.mjs --verdicts <dir>/verdicts.json`.
- Scored: path 22/35 = 62.9% · type 30/35 = 85.7% · campaign 33/35 = 94.3%.
- Cost: `$15.41`, 8 minutes, about a quarter of the 5-hour usage window.
- Scored against `bench/router/set.json` **as it stood at commit `599ff17`**.
  `q01`, `d04` and `d05` were replaced after this run; per case those three no
  longer mean what the score says.
- `measurements.json` is **re-derived from the 35 saved streams with the parser
  as of commit `d21d4bd`** — the run's own parser plus both fixes: the
  escaped-pipe split (`599ff17`) and `none` read as an absent evidence cell
  (`d21d4bd`). The `599ff17` parser alone still returns 31/35 on these streams. It therefore reads `rowsWithEvidence: 9` on all 35; the file the run
  wrote at the time said 8 for `q07`, `q09`, `s06` and `s08` — a parser defect,
  not four thin verdicts, and the reason `docs/stages/04-report.md` criterion 2
  cites a re-measurement. `verdicts.json` is the run's own output, untouched.
- The 35 raw `stream-json` transcripts are not committed: they are ~4 MB and live
  in the session scratchpad that produced them. Every number the report and the
  gate rest on is in these two files; anything else needs the streams, which the
  next run replaces.
