# A seeded data state as a layer, live — 2026-09-07

Stage 11d-1 criterion 2 (`BUILD-PLAN.md` Stage 11d, *A seed is a layer, and no key was added*), decision **0099**.

A `webapp` copy declares one layer whose `up` seeds data, whose `check.kind: cmd` proves the data is there, and whose `stop` takes it away. Nothing in `scripts/config.mjs` or `scripts/env.mjs` was changed for it: the question the decision asked was whether 0074's grammar already holds a seed, and this run is the answer.

## What was set up

```
node bench/scripts/fixture-copy.mjs webapp --into <copy> --no-modules
```

`seed.mjs` (in this directory, copied into the copy's root) writes three overdue orders into `.seed/overdue.json` on `up`, prints the count and exits non-zero below three on `count`, and removes the directory on `reset`. The copy's `.claude/hodos/config.json` gained `config-fragment.json` — the whole of the declaration:

```json
{ "verify": { "profile": "local",
              "profiles": { "local": { "layers": ["seed-overdue"] } },
              "layers": { "seed-overdue": { "up": "node seed.mjs up",
                                            "stop": "node seed.mjs reset",
                                            "timeout": 60,
                                            "check": [{ "kind": "cmd", "run": "node seed.mjs count" }] } } } }
```

`node scripts/config.mjs check <copy>` → `config: ok`, exit 0. No new key: `profile`, `profiles`, `layers`, `up`, `stop`, `timeout` and `check[].kind: cmd` are all decision 0074's, and the schema accepted the file unchanged.

## The run — `env-calls.txt`, verbatim

| Step | Command | What it printed | Exit |
|---|---|---|---|
| 1 | `env.mjs probe` | `state: down` · check `0 overdue orders`, `ok: false` | 1 |
| 2 | `env.mjs up` | `state: raised` · `raisedByHodos: true` · check `3 overdue orders`, `ok: true` | 0 |
| 3 | `node seed.mjs count` in the copy | `3 overdue orders` | 0 |
| 4 | `env.mjs up` again | `state: up` — **not raised a second time** | 0 |
| 5 | `env.mjs down` | `state: stopped` · `detail: node seed.mjs reset` | 0 |
| 6 | `env.mjs probe` | `state: down` · check `0 overdue orders` | 1 |
| 7 | `ls -a <copy> \| grep '\.seed'` | `(nothing)` — the directory is gone | — |

## What it settles, and what it does not

**Settles.** A seed is a layer under 0074's grammar with no field added. Step 4 is the half worth naming: a seeding `up` **exits** when it is done, and the layer is still `up` at the next call — because what says a layer is up is its `check`, never a live pid (`PLATFORM-NOTES.md` fact 46, from Stage 11b-2). So `up` run twice seeds once, and step 5 proves the reset runs from the record rather than from memory. Step 6's exit 1 is the format doing its job: after `down`, the state the claims rested on is provably not there any more.

**Does not settle.** Who the user is. `verify.personas` is deferred to Stage 12 by the same decision, and `BACKLOG.md` carries it: none of the four fixtures has authentication, so a persona format written here would be written against nothing.

The data lives in a file because this fixture has no store. On a project with one, `up` is that project's own seed command and `check` is a query — the shape is the same, and it is the reason `check.kind: cmd` exists beside `tcp` and `http`.

## Correction after review 1

`seed.mjs` used `process.exit()` for its two non-zero codes, which `scripts/cli-exit.test.mjs` — the Stage 11b-4 pipe-truncation gate — forbids for every shipped `.mjs`, this directory included. The suite was red at the head this record was committed under. Both calls are now `process.exitCode`, and the sequence above reproduces unchanged: `count` exits 1 below three, 0 at three, and a bad verb exits 2.
