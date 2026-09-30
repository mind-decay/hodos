# Hold-out set — the first run, 2026-09-30, Stage 12c-3

Nine dispatches of `hodos:hodos-reviewer` on `opus`, Claude Code 2.1.285, in two invocations scored as one set:
- the probe, `../2026-09-30-probe/`: `h1` and `pilot-outline`, one at a time. It went first so that the scorer could be read on real output before the rest was bought;
- this directory: the other seven, three in flight.

The probe showed three readings the scorer lacked:
- a finding filed under two codes;
- a defect named only in `## Spec`;
- the false positives split by kind.

Each was added test-first before this run went out, and `bench/holdout/run.test.mjs` names the probe in each test. The key and the patches are `cc44268`'s in both invocations.

What was enabled while it ran is `enabled-plugins.json`, the same list in both invocations (`docs/BENCH.md`, *What every run here is exposed to*). It includes `caveman@caveman`, whose `SessionStart` hook asks for terse prose, so the reviews' wording is not a clean-profile reviewer's.

```
node bench/holdout/run.mjs --check-key
node bench/holdout/invoke.mjs --out bench/holdout/runs/2026-09-30-probe --only h1,pilot-outline
node bench/holdout/invoke.mjs --out bench/holdout/runs/2026-09-30 \
  --only h2,h3,h4,h5,h6,pilot-ts,pilot-rust --concurrency 3
node bench/holdout/run.mjs \
  --verdicts bench/holdout/runs/2026-09-30-probe/verdicts.json --verdicts bench/holdout/runs/2026-09-30/verdicts.json \
  --measurements bench/holdout/runs/2026-09-30-probe/measurements.json --measurements bench/holdout/runs/2026-09-30/measurements.json
```

| Measurement | Found | Rate |
|---|---|---|
| recall, overall | 31/34 | 91.2% |
| recall, logic-lens | 29/30 | 96.7% |
| recall, pilot | 2/4 | 50.0% |
| L code agreement (hedged: 1) | 25/30 | 83.3% |
| named only in ## Spec | 3 | — |
| false positives on correct code, L-coded / other | 1 / 1 | — |
| findings without a location, an item or a trigger | 0 | — |

No threshold, because every row is a measurement (decision **0154**).

- **Missed:** `ll-232`, `p-outline-total`, `p-outline-heaviest`, all three named at their own `file:line` in `## Spec` only.
- **Filed under two codes:** `ll-201`, expected L8, filed `L5 / L8 resource lifecycle`.
- **Filed under another code:**
  - `ll-211`, expected L2, filed `L3 boundary blindspot`;
  - `ll-216`, expected L5, filed `L6 callee-contract mismatch`;
  - `ll-236`, expected L5, filed `L6 callee contract`;
  - `ll-213`, expected L3, filed ``plan `### Data & scale` ``.
- **False positives on correct code:**
  - `utils/cache.py:10` (`h1`, `defaults #17`): module-level demo lines that run on import;
  - `store/cache.go:25` (`h2`, `L3`): a `Store` built outside the package has `maxSize` 0. That holds on the code, and logic-lens's #250 grades only its `defer`.
- **The pilot's three packages** re-found `p-ts-comment-extra` (filed `L6`) and `p-rust-nested-attribute` (filed under the plan's `Invariants & failure modes`), each at its key line. `pilot-outline` put both of its defects in `## Spec`'s Missing entry and in no Standards row.

## Cost

Tokens are from `scripts/usage.mjs` over each dispatch's session, with subagents included and each message counted at its final usage (decisions **0166**, **0167**). Dollars are the CLI's own `total_cost_usd`.

| Package | Session | Tokens | $ | Turns | s |
|---|---|---|---|---|---|
| h1 (probe) | `d55bffa0` | 0.20M | 0.73 | 2 | 226 |
| pilot-outline (probe) | `04ebf1d7` | 1.13M | 1.37 | 2 | 400 |
| h2 | `76aee736` | 0.30M | 0.77 | 2 | 247 |
| h3 | `841a7650` | 0.21M | 0.63 | 2 | 203 |
| h4 | `b403bc17` | 0.24M | 0.67 | 2 | 221 |
| h5 | `d6ca91ac` | 0.23M | 0.68 | 2 | 205 |
| h6 | `0ffa5fd3` | 0.37M | 0.97 | 2 | 332 |
| pilot-ts | `82ab3cd9` | 1.16M | 1.51 | 2 | 464 |
| pilot-rust | `5dd73762` | 1.34M | 1.57 | 3 | 520 |
| **total** | 9 | **5.17M** | **8.90** | 2.1 mean | |

The plan forecast was 6–15M. A pilot package costs five times a snippet package: the pilot's own checks run cold in a worktree, and the package reads a real diff.

## What is not here

The pilot's three reviews and their full results are the pilot's text, and its licence is not MIT. They are in `bench/holdout/pilot-cache/runs/2026-09-30/`, which is gitignored. `verdicts.json` holds what `invoke.mjs`'s `redactPilot` keeps of them: severity, `file:line`, the item without what it quotes, the verdict, and the Spec entries as `path:line` references. The worktrees were removed after scoring.
