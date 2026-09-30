# Hold-out set

Does `hodos-reviewer` find a defect nobody on the authoring side chose, and does it stay quiet on correct code that looks like a hit? Decision **0154** gives the set this directory, apart from the review bench. So no case here can enter the review bench's four gates, and every number the set prints is a **measurement**: `bench/report.mjs`'s `measurementReport` refuses a gate, and nothing here carries a threshold.

```
node bench/holdout/run.mjs --check-key                  # the set is self-consistent — runs in npm test
node bench/holdout/invoke.mjs --out <dir> --dry-run     # every package builds — run this first
node bench/holdout/invoke.mjs --out <dir>               # dispatch the reviewer, write verdicts
node bench/holdout/run.mjs --verdicts <dir>/verdicts.json
node bench/holdout/run.mjs --verdicts <dir>/verdicts.json \
  --measurements <dir>/measurements.json --json         # the labeled JSON report
```

## Two sources, never averaged together

**hyhmrright/logic-lens, MIT** — the 36 `mode: "logic-review"` cases of `evals/content/v2/evals-v2.json` at `0ea7f9b`. This is the "36-case subset" `docs/BACKLOG.md` has named since Stage 6. Their copyright and permission notice is `LICENSE.logic-lens`, copied from that commit, and it covers every file under `seeded/`, `clean/` and `fixtures/snippets/` that a patch adds.
- The 30 cases with a defect are `seeded/ll-<id>.patch`. The 6 that logic-lens itself grades as correct (249–253, 284) are `clean/ll-<id>.patch` and `clean.json`. They are idiomatic code that reads like an L4, L7 or L8 hit, and this set's *plausible but correct* half.
- Each case's code is a file its patch adds to `fixtures/snippets/`. The one exception is #233, which modifies a fixture file.
- The files are grouped five defects and one correct file to a package, in id order, as `packages/h1.md`–`h6.md`.
- The defect's line and its L code come from the case's own `expected_output`. The patch header carries that text as its trigger.
- Paths are neutral, so no file name points at its defect.
- The code is logic-lens's **verbatim**, comments included. Several of those comments point at the defect: `# which Logger?`, `// plain addition`, `-- no timezone`. So this half measures recall under logic-lens's own conditions, not on a harder set.
- The four `zh-` cases' prompts are Chinese. Their code and their context lines are kept as they are.

**The pilot's own reviews** — `key.json`. These are defects that `hodos-reviewer` found on `ariadne_v2` at Stage 12c-2 and that the fix pass then repaired. Each is keyed as that review filed it, so the key's item is the pilot reviewer's own:
- `p-ts-comment-extra`, filed `L6`;
- `p-rust-nested-attribute`, filed `plan Invariants`;
- `p-outline-total` and `p-outline-heaviest`, filed `plan T3 Acceptance`.

The verify failures a review had passed are not here either. Six are on record, and no review filed any of them, so there is no filing to take a case's item and line from. Choosing one would make the case the author's (`docs/stages/12c3-plan.md §6`). Two majors of the same stage are **not** here, D1's and D5's. Both were `## Spec` findings about the ledger's mutation counts, which a package with no ledger cannot reproduce. The pilot is `PolyForm-Noncommercial-1.0.0`, not MIT, so no line of it is stored in this tree:
- the key holds the two shas, the defect's `file:line`, and the sha-256 of that line trimmed, which is what re-points the anchor;
- the package reviewed is the very one the first reviewer received. It was recovered from that reviewer's transcript into `pilot-cache/`, which is gitignored, and is checked against the key's `packageSha256`. The package is not rebuilt from the plan because the fix pass the finding caused amended that plan.

`invoke.mjs` builds each pilot package as a worktree of the checkout at that head. Without the checkout (`--pilot <dir>`, default `../ariadne_v2`) or without the cache, the pilot packages are skipped, and `verdicts.json`'s `skipped` says which.

A pilot package's worktree runs the pilot's own checks when the reviewer does. That means a cold `cargo` build: minutes, and a `target/` of several GB until the run's copies are removed with `git -C <checkout> worktree remove --force <copy>`.

## What it measures

| Measurement | What it reads |
|---|---|
| recall, overall; recall, logic-lens; recall, pilot | a defect is found when a finding sits at its file within five lines, the review bench's own rule |
| L code agreement | of the behavioral defects found, how many the reviewer filed under the defect's own code — the question `b-l6-callee-contract` has waited on |
| false positives on correct code | findings on the six correct files |
| findings without a location, an item or a trigger | the review bench's `invalid` count |
| dispatches, cost, turns | per run, from `measurements.json` |

## What it does not prove

- **Six correct files are still few.** A false-positive count of zero on them is not a precision number, and it carries no denominator a threshold could stand on.
- **The pilot's four were found by this reviewer once already.** Re-finding them is reproducibility on real defects. It is not recall on defects it never met, and it is reported apart from logic-lens's for that reason.
- **The snippets hint.** Where a logic-lens comment names its own defect, a catch says the reviewer reads comments, and that is logic-lens's condition as much as this one's.
- **There is no test-floor case.** No source here deletes a test. Where one was looked for is in `docs/stages/12c3-plan.md`.

## Runs

`runs/<date>/`, each with its own `README.md`: what was enabled while it ran (`docs/BENCH.md`, *What every run here is exposed to*), the command, and the numbers. The `copies/` inside a run are gitignored.
