# Router run 3 (partial) — 2026-09-03

Fifteen of the 35 cases, re-bought after three decisions changed what the router
reads. The other twenty keep the verdicts run 2 paid for, so **every number here
is a mixed score and is printed as one**:

```
node bench/router/run.mjs \
  --verdicts bench/router/runs/2026-09-03/verdicts.json \
  --verdicts bench/router/runs/2026-09-03-partial/verdicts.json \
  --rows bench/router/runs/2026-09-03-partial/rows.json
mixed: 15 of 35 verdicts from …-partial/verdicts.json, the rest carried over — 20 from …/2026-09-03/verdicts.json
```

**The table below is what this run measured, against the set as it stood on the
day.** Decision 0072 landed afterwards and re-derived `s11` and `s12`, which
makes `s12` a hit: the command above now prints **path 30/35 — 85.7% — PASS**.
The diagnosis further down is what moved it.

| Axis | Score, as measured | Threshold | Gate, as measured |
|---|---|---|---|
| path | 29/35 — **82.9%** | ≥85% | **FAIL** (30/35 — 85.7% — PASS after 0072) |
| type | 33/35 — 94.3% | ≥90% | PASS |
| campaign flag | 34/35 — 97.1% | ≥90% | PASS |

`$7.66`, fifteen cases, every one a verdict; mean 8.1 turns and 3.5 evidence
calls, none over the budget of five, no row without evidence.

## Why these fifteen

Not "the ones that failed" — the ones the three decisions can reach, derived
from what each decision changed rather than from run 2's misses:

- **0069** (rule 3's width is row 1 above the `quick` limit) reads
  `type === 'refactor'`: `q07`, `q09`, `s06`, `s11`, `s12`, `d04`, `d05`, `c01`,
  `c03`, `c04`.
- **0070** (row 1 sizes a question by what its answer rests on): `q05`, `q06`,
  `s09`.
- **0071** (row 6 names the crossings that force a second merge): `s05`, `s10` —
  the monorepo cases the new wording explicitly rules *out*, which had to be
  checked because the previous wording of `route.md` said crossing a service is
  a `yes`.

Set changes do not need a re-run: the model never reads `set.json`, so T8's five
row-1 corrections were re-scored against the verdicts already bought.

## What moved

| Case | Run 2 | Run 3 | Reading |
|---|---|---|---|
| `s09` | quick (miss) | **standard** | decision 0070 — the question is sized by its reading surface |
| `d04` | standard (miss) | **deep** | decision 0069 — run 2 said "four enumerated files, not `many`" |
| `d05` | standard (miss) | **deep** | decision 0069 — run 2 said "spans 2 files, not many" |
| `s05`, `s10` | standard | standard | decision 0071 held: two packages of one monorepo are one merge |
| `s11` | standard | **quick (new miss)** | row 1: the session counted 3, the set counts 4 |
| `s12` | standard | **deep (new miss)** | rule 3's *metric* half is undefined, as its width half was |
| `c01` | deep (miss) | deep (miss) | the carve-out in `route.md` swallowed the rule it qualified |
| `c04` type | refactor | **feature (new miss)** | nothing this stage changed touches type |

Three of run 2's seven path misses are gone and two new ones arrived, so the
path gate moved 28/35 → 29/35 and was one case under its threshold when scored,
and 30/35 after decision 0072 re-derived `s11` and `s12`.

## The four that are worth reading

**`c01` — a copy drift, and the session named it.** Decision 0071 gave row 6 a
carve-out for the monorepo case. `FORMATS.md §3` scopes it — "**Touching** two
packages a single repository releases together is one merge" — and the copy in
`route.md`, which is the one the router actually reads, lost that word: "Two
packages one repository releases together are one merge, not a crossing." The
session applied the unscoped reading and said so in its own words:

> Row 6 is the one I want you to check me on — the rule names "one created,
> removed or split" as a crossing, and this splits `svc`; I read the following
> sentence … as the carve-out that applies here.

`AUTHORING.md §10` is about exactly this shape, and the defect is one this
stage introduced. It is fixed in `route.md` and **the fix is not measured**: a
re-run to bank one case is the thing the spend rule refuses.

**`s12` — the same defect as 0069, one clause over** (settled after this run as decision **0072**, which is why `s12` now scores as a hit). 0069 defined the width of
rule 3's second clause and left its other half alone. The session invented a
countable done-metric — "template-literal classNames in `src/` → 0" — and was
right to: `route.md`'s own type table says a `refactor` is "target-first,
done-metric", so *every* refactor has one. After 0069 the clause therefore reads
"any refactor above three files is `deep`". The set disagrees only because it
stores the author's narrower reading in a boolean, `wideCountableMetric`, set on
the three descriptions that state a metric ("until no `band: string` is left").
The prose gives the router no way to reach that reading. Raised as proposal S, settled as decision
**0072** after this run: the clause now reads the type and row 1, and the field
is gone.

**`s11` — the `≤3` cut, third instance.** The session counted three files and
justified the third: `src/lib/errors.ts` ships without a test beside it, so a
`lib` module is covered through its consumer's test. The set counts four. Both
readings are defensible and rule 5's hard limit sits between them.

**`c04`'s type — run-to-run variance.** Nothing this stage changed touches type
classification, and the same case answered `refactor` in run 2 and `feature` in
run 3. That is the width of the noise on a single scored run, measured rather
than assumed.

## Row agreement (measurement, no threshold)

Over the fifteen fresh cases:

| Row | Agreement |
|---|---|
| files touched (estimate) | **8/15 — 53.3%** |
| contract / schema / route change | 12/15 — 80.0% |
| new module · new dependency · needs more than one mergeable unit | 13/15 — 86.7% |
| data migration · more than one developer · external wait | 14/15 — 93.3% |
| fog | 15/15 — 100% |

The shape run 2 showed holds on a fresh fifteen: the eight judgement rows agree
80–100%, and the one "objective" row agrees about half the time. Row 1 is an
estimate made before design, and rule 5 reads it as a hard cut at three.

## What the run was exposed to

`caveman` and `hookify` disabled for its duration and re-enabled after — the
same condition run 2 ran under, which is what makes the two comparable. Seven
plugins stayed enabled: `clangd-lsp`, `claude-md-management`, `frontend-design`,
`gopls-lsp`, `humanizer`, `rust-analyzer-lsp`, `typescript-lsp`.

The fifteen raw `stream-json` transcripts are not committed; `verdicts.json`,
`rows.json` and `measurements.json` are what the numbers above rest on, and
`rows.json` carries every printed row with its evidence.
