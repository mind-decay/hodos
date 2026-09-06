# Router run 4 (partial) — 2026-09-03, Stage 11c

Fourteen of the 41 cases, re-bought because Stage 11c added two types to the
router. The other 27 keep the verdicts runs 2 and 3 paid for, so **every number
here is a mixed score and is printed as one**:

```
node bench/router/run.mjs \
  --verdicts bench/router/runs/2026-09-03/verdicts.json \
  --verdicts bench/router/runs/2026-09-03-partial/verdicts.json \
  --verdicts bench/router/runs/2026-09-03-11c/verdicts.json
mixed: 14 of 41 verdicts from …-11c/verdicts.json, the rest carried over —
15 from …/2026-09-03/verdicts.json, 12 from …-partial/verdicts.json
```

| Axis | Mixed score | Threshold | Gate |
|---|---|---|---|
| path | 34/41 — **82.9%** | ≥85% | **FAIL** |
| type | 39/41 — **95.1%** | ≥90% | PASS |
| campaign flag | 40/41 — **97.6%** | ≥90% | PASS |

`$6.89`, fourteen cases, every one a verdict; mean 7.6 turns and 3.3 evidence
calls, none over the budget of five, and 126 of 126 rows carried evidence.

## Which fourteen, and why

Six new — `sp1`–`sp3` and `up1`–`up3`, which have no carried verdict — and eight
existing cases whose text can be attracted to a new type, chosen by reading the
set rather than run 2's misses (decision **0081**): `s07`, `s12`, `d03` each
**add** a package, the shape most easily miscalled `upgrade`; `q05` and `s09`
are questions, and a question and a spike both end in an answer; `c05`, `d08`
and `d02` are open-ended, the shape most easily miscalled `spike`.

**Not one of the eight moved.** Every re-bought existing case produced the same
path and type it produced before, so nothing this stage changed moved a verdict
the router had already given — which is the evidence behind "the path axis was
not re-bought".

## What the new types scored

**Type 6/6.** `sp1` `sp2` `sp3` all came back `spike`, `up1` `up2` `up3` all
came back `upgrade`, and no existing case was pulled into either — the two type
misses in the mixture, `c04` and `c05`, are carried from earlier runs and are
`refactor`→`feature` and `bug`→`feature`, neither of them a new type.

**Path 4/6**, and both misses are cases where the router's rows are better
evidenced than the set's label:

- **`sp2`** (SQLite or Postgres, we need a number) — labeled `deep` from nine
  `unknown` rows, on the theory that a spike cannot know its own size. The run
  filled five of them with evidence: the throwaway harness is three files plus
  the manifest and lockfile, `src/store/orders.js:1` shows no persisted schema
  and `package.json` no driver. Rows 2–5 are then `no/yes/yes/no`, which is rule
  6 — `standard`.
- **`up1`** (react-router-dom 7.18.3 → 8) — labeled `standard` on row 1 = 5. The
  run counted eight files and answered `dependency: yes` with the reason that
  v8 is a rename rather than a bump ("`react-router-dom` leaves the manifest"),
  and `contract: unknown` because nothing it read establishes whether v8 keeps
  the `<Routes>/<Route element>` declaration. `unknown` on rows 3–5 is rule 2 —
  `deep`.

**The set is not corrected here.** Both labels were written by the author before
the run and both are arguably wrong, but rewriting a case's rows after seeing
its verdict is fitting the bench to the run. The two rows are a `BACKLOG.md`
line against the pilot, with this run's evidence as the argument, and the score
above is the score as measured (decision **0063**: one run, no re-runs to chase
a number).

## Row agreement, this run's fourteen

| Row | Agreement |
|---|---|
| files touched (estimate) | 4/14 — 28.6% |
| new module | 11/14 — 78.6% |
| contract / schema / route change | 10/14 — 71.4% |
| new dependency | 11/14 — 78.6% |
| data migration | 13/14 — 92.9% |
| needs more than one mergeable unit · fog · developers · wait | 13–14/14 |

Row 1 is a measurement, not a gate (decision **0028**), and 28.6% is the number
Stage 11a already recorded for it: two honest estimates of "every file this
change touches" differ, and the rules read the count through thresholds, which
is why the path axis is scored and the row is not.
