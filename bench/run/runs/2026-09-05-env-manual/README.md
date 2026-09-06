# The two interactive steps, live — 2026-09-05

Stage 11b-2 criteria 3 and 4, the halves `AskUserQuestion` makes unreachable headless (`PLATFORM-NOTES.md` fact 32). Both were run by the developer in a second terminal, `claude --plugin-dir <repo>` inside a seeded copy; the steps are `docs/stages/11b2-manual.md`. The copies live in `/tmp` and do not survive it, so what they produced is here.

| File | What it is |
|---|---|
| `env-calls.txt` | every `env.mjs` call, agent dispatch and question of both sessions, in order, from their transcripts |
| `m1-env.md` | the `env.md` the one `hodos-preparer` wrote at M1 |
| `m1-infra.log` | what the failing layer printed, the file the preparer was given |
| `m1-ledger-tail.txt` | M1's last three ledger lines |
| `m2-verify-1.md` | M2's `verify.md`, recovered from the transcript — `finish.md §3` deletes it after folding |
| `m2-outcome.md` | the fold of it into `plan.md#Outcome`, which is what survives on disk |
| `m2-ledger-tail.txt` | M2's last three ledger lines |

## M1 — the layer that cannot come up

`env.mjs up` first, **one** `hodos-preparer`, `env.mjs probe` by the kernel rather than the agent's word, the breaker, `env.mjs down` on the way out. One agent in the whole session and it is not the verifier — `Verify` never appears in the ledger, whose last line is `Breaker: verify — manual`, and `state.json` reads `phase: manual`, `verify.iteration: 0`. `.claude/hodos/env/` kept `infra.log` and no `infra.json`: `down` found the recorded pid dead and cleared the record, which is the `stale` path of criterion 2 seen from the outside.

**A finding, not a pass: the cause in `m1-env.md` is wrong.** The fixture's layer is `printf 'raising the fixture stack\npull access denied for registry.example/db\n'; exit 1` — no registry is contacted and the pull-denied line is a string the shell prints. The preparer's own bullets establish exactly that (`the up command … is the entire definition, an inline shell string that prints the pull-denied message and exits 1 unconditionally`, `docker ps -a` clean, no compose file, no Dockerfile) and its *cause* still reads the string as a registry's answer, closing with `docker login registry.example`, which fixes nothing. The conclusion contradicts the evidence the same file gathered. `agents/hodos-preparer.md` answers it in step 3 and in its anti-pattern list — a line a command printed is a claim about what it did, and what was found outranks it.

## M2 — access declined

One question about access, and the raise is hodos's under either answer — no option asks the developer to run anything. `verify.md`'s header is `# Verify 1 — orders-summary · env: local`, its counts are `claims 15 · pass 11 · fail 0 · skip 4`, and the four skips are rows 10, 11, 12 and 14 with the exact reason `skip: environment not up — hosts, access declined`. The `unit` recipe ran in full beside them: rows 1–9 and 13 carry vitest's own output, and row 15 is the mutation, restored byte-identical. `access.grantedAt` is still `null` and `git status --short` shows only the change the setup made, so a decline is not persisted and the next run asks again.

**A finding: the question offered three answers, not two.** `verify-loop.md §3` prescribes *grant* and *decline*; this session added *drop `hosts` from the profile* and put it first, with the grant third. Nothing was written — the developer declined — but a run that edits `verify.layers` to get past its own question changes the next run's environment without a decision. §3 now says the config is not one of the answers.
