# config.json — what init writes, and what each key may hold

Read on entering the write step. Input: the scan and the interview answers. Output: `<project root>/.claude/hodos/config.json`, one approved row at a time. The specification is `FORMATS.md §2`; this is the field list a write needs, and nothing else. A key not here is not a key: `config.mjs check` is what says so.

## The four fields init computes

Everything else is an answer copied down. These four are derived, and each is wrong in a way that outlives the run:

| Field | Where the value comes from |
|---|---|
| `commands.*` | the command that **ran green in this session**, verbatim, including its runner (`npx vitest run`, not `vitest`). A tool the project does not have is `null`, never a guess. |
| `verifiedAt` | today's date, written only after those commands ran — it is the claim the reviewer and the verifier rest on. |
| `scanSha` | `git rev-parse HEAD` at the scan, so `--refresh` can diff from it. |
| `nested[]` | the repo-relative directories the scan found carrying their own commands (`DESIGN.md §3.1`). A subproject earns a config because its commands differ; listing one whose commands are the root's costs a merge and buys nothing. |

## The keys, and what each admits

| Key | Value |
|---|---|
| `version` | `1` |
| `language` | the interview language, two letters |
| `stack[]` | the scan's stack tokens, lowercase |
| `commands` | `test` · `typecheck` · `lint` · `build`: a string or `null`; `dev`: `{ cmd, url, ready }` |
| `verify.recipes[]` | `{ name, kind, when, … }`; `kind` is `command` · `browser` · `http` · `a11y` · `viewport`; `when` is `always` · `ui` · `api` · `perf` · a glob. `viewport` carries `widths[]` in CSS pixels |
| `verify.profile` · `profiles` · `layers` | the environment stack of decision **0074**; `check[].kind` is `tcp` · `cmd` · `http`, `timeout` is **seconds**, `access.grant` is `permissions` · `one-time`. Omit all three where `commands.dev` is the whole environment |
| `conventions.commit` | `conventional` · `ticket-prefix` · `custom:<pattern>` |
| `conventions.branch` | the project's pattern, `{slug}` for the task's slug |
| `models.*` | `review` · `planReview` · `verify` · `preparer` · `research` · `initScan`; a model name each. No key for plan or execute, which run in the session |
| `autonomy` | `ask` (default) · `rulings` |
| `gates.*` | `denyDangerousGit` · `blockCommitOnFailedReview` · `stopHookLedger`, booleans, `false` unless the developer asked |
| `adapters.<role>` | the eight roles of `DESIGN.md §3.2` and no others; an adapter file name, `project:<name>`, or `null` |
| `review.generated[]` · `review.maxBytes` | globs packaged stat-only, and the size at which the package refuses; omit both for the defaults |
| `campaigns.external[]` | paths to other repositories' `campaigns/` directories |
| `tasks.staleDays` | the age at which a task reads as stale; `14` unless asked |

Paths inside a value resolve against the **git root** (`FORMATS.md §2`, decision **0075**), and a project's own commands run in its config's directory.

## The two recipes proposed to a project with a UI

Decision **0095**: a project that has a `browser` recipe is offered these two beside it, one approved row at a time like every other. A project that declines gets neither, and pays nothing for the kinds.

```json
{ "name": "a11y",     "kind": "a11y",     "routes": ["/"], "when": "ui" }
{ "name": "viewport", "kind": "viewport", "routes": ["/"], "widths": [360, 768, 1280], "when": "ui" }
```

`routes` is the `browser` recipe's own list, not a new one: the routes a project already verifies are the routes it wants audited and re-visited. The widths are the three the interview offers — a phone, a tablet, a desktop — and the developer's own breakpoints replace them where the project has them written down.

## Completion

`node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs check` exits 0, every command in the file has been run in this session, and every row was approved before it was written.

## Anti-pattern

A command recorded unrun. A `null` where the developer was never asked. A key invented for a feature that has no reader — `check` reports it, and the capability it names is off in silence.
