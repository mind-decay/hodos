# The fail-fast pair — 2026-09-07 · 0 browser operations against 95

Stage 11d-2, T14 (criterion 5, decisions **0096**, **0110** and **0111**). One copy shape, two arms, one difference: this arm's `summary.test.ts` expects `0.4` where the sum is `0.3`, committed on the task's branch. The green arm is the four-sources arm itself (`../2026-09-07-four-sources/`, arm 3) rather than a third purchase — an arm bought twice is an arm paid for twice, and the counts of a run that already happened read the same as the counts of a run bought to be its control.

```
node bench/run/runs/2026-09-07-fail-fast/setup.mjs <dir>
cd <dir> && CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 claude -p "/hodos:run orders-summary" \
  --plugin-dir <repo> --permission-mode bypassPermissions \
  --max-turns 60 --output-format stream-json --verbose
```

## The gate

| | red arm (unit fails) | green arm (arm 3) |
|---|---|---|
| **browser operations** | **0** | **95** |
| claims · pass · fail · skip | 15 · 9 · 2 · 4 | 27 · 15 · 8 · 4 |
| rows in the table | 15 | 27 |
| dispatches | 1 | 1 |
| kernel tool uses | 21 | 16 |

**Strictly fewer browser operations in the red arm: 0 against 95.** Counted by `bench/run/runs/kernel-turns.mjs` over each arm's transcript, with the sidechain counter decision **0111** added — the operations are the verifier's, on its own branch of the transcript, and neither arm's kernel made one.

**Every claim is still on a row, and the header counts equal the rows.** The red arm's `15 · 9 · 2 · 4` sums to 15 and the table has 15 rows; rows **10, 11, 12** and **14** read `skip: not run — unit red`, which is the phrase `oracles.md §4` fixes, and the `## Not covered` block names all four by number with that reason. Nothing was dropped to make the run cheap: the `ui` recipe's claims are in the table saying why they did not run.

**The dispatch counts tie at 1 each**, which is what decision **0111** predicted and what decision **0110** had asked to be a gate. The order writes a row for every claim, so the agent that writes the skips is dispatched either way. Reporting the tie is the point: it is a fact about the design, not a threshold anyone could pass or fail.

## The cost, as a measurement and not a gate

`scripts/usage.mjs` over the two sessions:

| | red arm | green arm |
|---|---|---|
| output | 11,099 | 8,469 |
| cache read | 658,454 | 430,433 |
| cache creation | 51,024 | 45,202 |
| input | 30 | 22 |

**The red arm did not cost less**, and decision **0110** is why that is reported rather than hidden: it made the comparison a measurement precisely because two runs do not bound it. Two things are in the numbers. The work the order skips is the **verifier's** browser sweep, which is a sidechain and cheap in the kernel's own context; the work the red arm adds is the **kernel's** fix pass on a genuinely failing test, which the green arm does not do. And the comparison is confounded by where each run was stopped: both were stopped by hand at their `Verify 1: FAIL` ledger line to avoid paying for a fix pass these criteria do not read, and the red arm had gone further into that pass — `git diff` four times against the green arm's three. The gate does not rest on any of it.

## What the order actually bought

95 browser operations not made: four routes navigated, snapshotted, screenshotted, read for console and network, audited through `lighthouse_audit`, swept at two forced states, and attacked on the two routes the diff resolves to. On a project whose unit tests are red, that is a browser sweep of a build that does not pass its own tests, and its rows would have been the confusing kind — the green arm's own rows 7, 8 and 13 are a summary line that is correct in the DOM and clipped on screen, which is a defect worth reporting only once the code compiles and passes.

## Files

| File | What |
|---|---|
| `setup.mjs` | the red copy: the four-sources setup, then one expectation flipped and committed |
| `red-verify.md` | the table — 15 rows, four of them `skip: not run — unit red` |
| `red-ledger.md` | the ledger, ending `Verify 1: FAIL 15 claims, 4 skipped` |
| `red-counts.txt` | `kernel-turns.mjs` over the red transcript — `browser operations: 0` |
| `streams/red.jsonl` | the stream-json log — on disk, not in the repository (`.gitignore`, and `PLATFORM-NOTES.md` fact 52's reason for the env var above) |

The green arm's own files are in `../2026-09-07-four-sources/`: `arm-3-verify.md`, `arm-3-counts.txt`, `arm-3-ledger.md`.
