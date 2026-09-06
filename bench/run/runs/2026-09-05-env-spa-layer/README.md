# The verify environment as one `spa` layer, live — 2026-09-05

Stage 11b-2 criterion 5, the run half (`11b2-plan.md` Q4, answer (a)). `bench/run/seed.mjs orders-summary --fixture webapp --at verify`, the copy's config rewritten so the dev server is a **layer** instead of `commands.dev` —

```json
"verify": { "profile": "local", "profiles": { "local": { "layers": ["spa"] } },
            "layers": { "spa": { "up": "npm run dev", "ready": "Local:",
                                 "url": "http://localhost:5173", "timeout": 60 } } }
```

— then `claude -p "/hodos:run orders-summary" --plugin-dir <repo> --permission-mode bypassPermissions --max-turns 45 --output-format stream-json --verbose` inside the copy. One session, 11 kernel turns, **$1.47**, `result.subtype: success`.

The baseline is `2026-09-02-verify-live/`, the same fixture task with `commands.dev`, from Stage 7 criterion 1.

| | Stage 7, `commands.dev` | here, one `spa` layer |
|---|---|---|
| verdict | `Verify 1: PASS 12 claims, 0 skipped` | `Verify 1: PASS 15 claims, 0 skipped` |
| screenshots | `01-orders-three.png` (93K), `02-orders-empty.png` (79K) | the same two files, the same sizes |
| dev server | started by the kernel, stopped by it | `env.mjs up` raised it detached; `env.mjs down` stopped it by its process group |
| base URL in the dispatch | `http://localhost:5173` | `http://localhost:5173`, from the layer's `url` |

**The verdict is the same and the claim count is not.** Stage 7's own report records that the row count varies between runs on one plan — 12, 13 and 15 rows from the same plan across its four runs — because splitting a compound acceptance clause into separately checkable halves is a judgement the verifier prompt leaves open (`docs/stages/07-report.md`, *Where the prompt would have to say more*). 15 is inside that range and is what runs 3a and 3b produced there. What criterion 5 asks for is the verdict, and `PASS` is `PASS`.

**What the run proves beyond the verdict**, all of it in `env-calls.txt`:

- `env.mjs up` ran **before** the dispatch and reported the layer `raised`, proven by its own `ready` line.
- The dispatch carried `Base URL: http://localhost:5173` and `Environment: local`.
- `verify.md`'s first line reads `# Verify 1 — orders-summary · env: local`, so a screenshot says which back end it saw (`FORMATS.md §10`).
- `env.mjs down` ran on the way out and reported `spa` `stopped` by `pid 29949`. Afterwards nothing was listening on 5173 and `.claude/hodos/env/spa.json` was gone, while `spa.log` stayed.

`verify.md` here is recovered from the run's transcript: `finish.md` folds it into `plan.md#Outcome` and deletes it, and this run went all the way to `Finish: report delivered`. `outcome.md` is that fold.
