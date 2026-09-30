# The four sources — 2026-09-07 · three arms, and the third one is the table

Stage 11d-2, T12, T13 and T15 (criteria 3, 4 and 6). Three arms on one shape, because the first two hit walls that had nothing to do with what was being measured. Arm 3 is the run the criteria read; arms 1 and 2 are kept because what they cost bought two diagnoses, and both are now fixed in the engine rather than worked around here.

```
node bench/run/runs/2026-09-07-four-sources/setup.mjs <dir>
cd <dir> && CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0 claude -p "/hodos:run orders-summary" \
  --plugin-dir <repo> --permission-mode bypassPermissions \
  --max-turns 60 --output-format stream-json --verbose
```

The copy (`setup.mjs` says why each piece is where it is): `/shift` in the `ui` recipe's routes, `verify.detectors.allow: ["overflow:/shift"]` and `detail-console-throw` in the **base**; `summary-clipped-line` and `shift-double-submit` in the **task's diff**, which is where decision **0112** requires a defect to be for the attacks to reach its route.

| Arm | Cost | Browser ops | `verify.md` | What stopped it |
|---|---|---|---|---|
| 1 | **$2.50** | 64 | no | the verifier's own 60-turn bound, three operations into its first attack |
| 2 | **$2.79** | 68 | no | `claude -p` killed the dispatch at 600 s and reported success (fact **52**) |
| 3 | ~**$3.5–4.0** | **95** | **yes** | nothing — the table was written, `Verify 1: FAIL` recorded, and the run was then stopped by hand rather than pay for a fix pass this criterion set does not read |

Arm 3's cost is an estimate and says so: the result line never arrived, because the run was stopped after its ledger line. Its tokens against arm 2's, from `scripts/usage.mjs`: output 8,469 against 4,125, cache read 430,433 against 371,493, cache creation 45,202 against 38,285.

## What the criteria read, by row of `arm-3-verify.md`

`Verdict: FAIL · claims 27 · pass 15 · fail 8 · skip 4` — 15 + 8 + 4 = 27, and the table has 27 rows.

**Criterion 3 — a defect nobody claimed becomes a row, and only from the four sources.**

| Row | Source | What it is |
|---|---|---|
| 17 | *console* | `Uncaught TypeError: Cannot read properties of undefined (reading 'text')` on `/orders/:id`, the seeded `detail-console-throw`. The row names the route, the effect and that the diff does not touch `OrderDetailPage.tsx` |
| 14 | *detector* | `clipped` on the Notes box, text cut 34px short — and it says in the row that only `overflow:/shift` is allowed |
| 15 | *detector* | `overlap`, Save handover over Discard by 20×20px |
| 16 | *detector* | `landmark-one-main`, moderate, the same hit on all four swept routes — the axe pass-through of decision 0109 |
| 24 | *attack* | the double submit, below |

**The allowlist produced no row.** `/shift`'s seeded banner overflow is in `verify.detectors.allow`, and there is no row for it anywhere in the 27 — while the two hits on the same route that are *not* allowlisted are rows 14 and 15. That is decision **0107** doing exactly what it is for, and it is the half of an allowlist that a passing run cannot show.

**Criterion 4 — the plan-independent oracles catch a crash the plan did not mention.** Row 24: `attack: /shift — double submit`, source *attack*, `fail`. The evidence is the count, not an impression — the attack stubbed `/api/handover` with a call counter and a 200 ms delay, clicked Save twice with no wait, and read `window.__handoverCalls === 2` with the button reading `Save handover (2)`. Two requests where one was sent, which is the sixth of `oracles.md §3`'s pass conditions. No claim of `orders-summary` names `/shift`; `## Claim feedback`'s *absent* line says so in the agent's own words.

**Criterion 6 — `## Not covered` is in every report, and its residue line is fixed.** All three lines present: the matrix that ran (`routes 4 × (no other axes declared) → 4 rows, of 4 in the product`), every skip by number with its reason (`18`, `21`, `26`, `27`), and the residue verbatim. `node scripts/lint.mjs --project <copy>` → `lint: clean — 1 files`, which is T9's `verify.md` check reading this file.

**Decision 0112, visible in the table.** Rows **26** and **27** are `skip: not attacked — the diff does not reach this route`, and their evidence cites the resolution itself: `git diff --name-only ee9d22f..HEAD` touches no file `HomePage` renders, and none that `OrderDetailPage` renders or imports. `/orders` and `/shift` were attacked; `/` and `/orders/:id` were swept by the detectors and not attacked. The narrowing is two rows in the table rather than a silence, which is what the decision asked for.

**The write order held.** `verify.md` was on disk before the attacks. Arm 2 is the control that makes the point: the same rule was stated only in the agent's `## Output` section then, the agent ran the attacks first, and the harness killed it with 68 browser operations spent and no table. The rule now sits in the paragraph that orders the work.

## What the attacks actually cost

Decision 0112 estimated 28 operations for five attacks on a route, and 134 turns for the whole run. The measurement is **95** browser operations for four swept routes and two attacked ones, because three of the five attacks have nothing to act on where there is no form: row 18 is one skip covering attacks 1, 2 and 4 on `/orders`, and row 21 is attack 1 on `/shift`. The verifier finished the table well inside its 150-turn bound, so the number is now bounded from both sides — 60 was not enough on arm 1, and 150 was not reached on arm 3.

## Two things this arm found that were nobody's plan

**The fixture serves no API.** `GET /api/orders` answers 404 under `npm run dev`, so `/orders` renders `Not Found` until something stubs `fetch`. The verifier worked around it on its own — rows 7, 8 and 9 stub three states — and rows 19 and 23 report the app's error state under Slow 3G as a pass, which it is. It is a backlog line with the measurement behind it, because it is the bench's weakness and not the code's.

**A file in the diff that no task's `Files:` line names.** The kernel said so before the verifier ran, and the verifier's `## Claim feedback` *absent* line says it again: `ShiftPage.tsx` is in T3's commit because the seed put it there, and no acceptance clause names it. That is the arm's own construction showing through, and it is also exactly the shape decision **0092** wants reported — a thing the diff carries that no claim names.

## Files

| File | What |
|---|---|
| `setup.mjs` | the copy: the base's three pieces and the diff's two, with why each is where it is |
| `arm-3-verify.md` | **the table** — 27 rows, the four sources, the attacks, `## Claim feedback` and `## Not covered` |
| `arm-3-ledger.md` | the task's ledger, ending `Verify 1: FAIL 27 claims, 4 skipped`, with the port ruling above it |
| `arm-3-counts.txt`, `arm-2-counts.txt`, `counts.txt` | `kernel-turns.mjs` over each arm, including the browser-operation counter of decision 0111 (`counts.txt` is arm 1's) |
| `ledger.md` | arm 1's ledger, ending at `Review 1: ACCEPT` — no `Verify` line was written |
| `streams/*.jsonl` | the stream-json logs — **on disk, not in the repository.** A raw transcript carries the home path and the employer name in every `cwd` and every tool result, and `tools/export-public.test.mjs` gates the public tree against exactly that: arm 1's, committed once, turned it red with 38 hits. `.gitignore` covers `bench/run/runs/*/run.jsonl` and `*/streams/` |
| `verifier-collected-shift.json` | arm 1's collector output for `/shift`, as its `evaluate` returned it |
| `verifier-decided-orders.json` | arm 1's `decide` output for `/orders` — the seeded `summary-clipped-line` hit, 20px |
