# `campaigns.mjs` against a fixture — 2026-09-02

Stage 9a criteria 1, 3, 5 and 6, on one `fixture-copy.mjs` copy of `mono` —
the nested layout, because criterion 5 is the only one that needs a
subproject and the other three run the same map. No model spend: every line
below is a script run.

The copy carries a root `.claude/hodos/config.json`, a nested one under
`web/`, and one map, `error-envelope`, committed like the tracked file it is
(`FORMATS.md §1`). Its nodes: one `done`, three `ready` — one of which,
`shared-codes`, depends on the two others — one `blocked` with a `by:`, one
`fog`.

## Criterion 5 — a session in a subproject finds the root map

```
$ cd web && node scripts/campaigns.mjs find
error-envelope — /private/var/.../hodos-mono-sMbrTV/.claude/hodos/campaigns/error-envelope.md
$ cd svc && node scripts/campaigns.mjs find
error-envelope — /private/var/.../hodos-mono-sMbrTV/.claude/hodos/campaigns/error-envelope.md
```

One repository, one `.git`, so the walk ends at the root that holds the map.
The digest a session in `web/` starts with carries it:

```
hodos: config verified 2026-09-02 · 0 active tasks · 1 campaign
- campaigns: error-envelope — frontier 2 ready / 1 held / 1 blocked / 1 fog
```

`frontier` from the same directory, with decision 0053 doing its work:

```
error-envelope: 2 ready / 1 held / 1 blocked / 1 fog
ready: web-errors — web throws AppError
ready: svc-errors — svc throws AppError
held: shared-codes — one code list both read · by: web-errors, svc-errors
blocked: client-mapping — the generated client maps codes · by: the client generator upgrade (OPS-31)
fog: retries — whether a retryable code is part of the envelope
wait: the client generator upgrade — @infra, asked 2026-08-30
```

`shared-codes` is written `[ready]` in the map and is **held**: its two
dependencies are open. Under option (b) — the status is the truth — it would
have been proposed.

## Criterion 1 — the claim

```
$ node scripts/campaigns.mjs claim error-envelope web-errors @you feature/web-errors --ref task:web-errors-2
error-envelope/web-errors — active, @you, feature/web-errors, task:web-errors-2

-- [ready] web-errors — web throws AppError · deps: error-type · owner: — · branch: — · ref: — · metric: —
+- [active] web-errors — web throws AppError · deps: error-type · owner: @you · branch: feature/web-errors · ref: task:web-errors-2 · metric: —
```

One line, four fields, `--ref` carrying a task slug that is not the node name
(decision 0054).

## Criterion 3 — `node-done` rewrites one line and re-measures

The node's work is one file — `web/src/lib/AppError.ts` — committed as
`c7893af`, which moves the map's one done-metric from 0 to 1.

```
$ node scripts/campaigns.mjs node-done error-envelope web-errors --sha c7893af
measure: files on AppError → grep -rl "AppError" web/src svc/src | wc -l
  files on AppError: 0 (2026-09-02) → 1
error-envelope/web-errors — done, sha:c7893af

 .claude/hodos/campaigns/error-envelope.md | 4 ++--
 1 file changed, 2 insertions(+), 2 deletions(-)

-| files on AppError | `grep -rl "AppError" web/src svc/src \| wc -l` | 0 | 4 | 0 (2026-09-02) |
+| files on AppError | `grep -rl "AppError" web/src svc/src \| wc -l` | 0 | 4 | 1 (2026-09-02) |
-- [active] web-errors — … · ref: task:web-errors-2 · metric: —
+- [done] web-errors — … · ref: sha:c7893af · metric: —
```

Two lines changed in a 25-line file: the node's and the cell whose number
moved. The escaped pipe inside the command survived both rewrites, which is
the case the parser has to get right to leave a map alone.

The frontier afterwards, with the dependency closed:

```
error-envelope: 1 ready / 1 held / 1 blocked / 1 fog
ready: svc-errors — svc throws AppError
held: shared-codes — one code list both read · by: svc-errors
```

## Criterion 6 — the Stage 9b stop (decision 0052)

`client-mapping` gains ` · repo: generated-client`, committed:

```
$ campaigns.mjs find                                          exit 1
$ campaigns.mjs frontier error-envelope                       exit 1
$ campaigns.mjs measure error-envelope                        exit 1
$ campaigns.mjs claim error-envelope svc-errors @you f/svc    exit 1
$ campaigns.mjs node-done error-envelope svc-errors --sha …   exit 1
  campaigns: cross-repository campaigns are Stage 9b — node client-mapping carries repo: generated-client
```

With the field removed and `config.campaigns.external[]` set instead:

```
campaigns: cross-repository campaigns are Stage 9b — config.campaigns.external[] names another repository (../generated-client/.claude/hodos/campaigns)
```

`git status --porcelain` after all six stops: empty. The digest fails open
rather than losing the session its state:

```
hodos: config verified 2026-09-02 · 0 active tasks · 1 campaign
- campaigns: error-envelope — cross-repository (Stage 9b)
```

## What this run does not cover

Criterion 2 is the round trip over **every** node line of `FORMATS.md §11`,
which is `scripts/campaigns.test.mjs` — a fixture map carries the six lines
of the specification, and the assertion is that exactly one line differs.
Criteria 4 and 7 need `AskUserQuestion` and the Skill tool, so they are
`docs/stages/09a-manual.md`.
