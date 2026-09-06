# hodos — Artifact Formats

Exact shapes of every file hodos reads or writes. Scripts parse only the machine formats (`state.json`, `config.json`, `.claude/hodos/active` and `.claude/hodos/sessions/<id>`, the ledger grammar, campaign node lines); everything else is markdown for the model and the human.

Script invocation shorthand used in every hodos document: `ledger.mjs add …` means `node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs add …`.

## 1. Project layout

```
<repo>/
├── CLAUDE.md                       # map ≤60 lines, or existing file + managed block
├── .claude/
│   ├── rules/*.md                  # paths-scoped, precedent-cited
│   ├── settings.json               # approved hooks (project scope, committed)
│   ├── settings.local.json         # permissions.allow for hodos scripts (per machine, gitignored)
│   └── hodos/
│       ├── config.json
│       ├── active                  # slug of the active task, or absent
│       ├── sessions/<session-id>   # slug of the task that session is on
│       ├── history.jsonl           # one line per finished task; ledger.mjs only; gitignored
│       ├── adapters/<role>/<tool>.md  # tracked — this project's own, named project:<tool>
│       ├── campaigns/<slug>.md     # tracked
│       ├── handoffs/<slug>.md      # tracked — written by /hodos:handoff, deleted at pickup
│       ├── env/<layer>.json        # gitignored — what this machine raised, and how to stop it
│       ├── env/<layer>.log         # gitignored — that raise's own output, kept for the diagnosis
│       └── tasks/<slug>/           # gitignored — working state, one developer, one task
│           ├── brief.md
│           ├── research.md
│           ├── plan.md
│           ├── ledger.md
│           ├── state.json
│           ├── review.md           # transient
│           ├── verify.md           # transient
│           ├── review-input.md     # transient, script-generated
│           ├── plan-review.md      # transient, deep path only
│           ├── stop-count          # transient, stop-gate.mjs only
│           └── evidence/
└── .gitignore                      # + .claude/hodos/tasks/  .claude/hodos/active  .claude/hodos/sessions/  .claude/hodos/env/  .claude/hodos/history.jsonl  .claude/settings.local.json
```

Monorepo: root `.claude/hodos/config.json` plus nested `<subproject>/.claude/hodos/config.json`; nested extends root (deep merge, nested wins). A subproject earns a nested config when its **commands differ** from the root's, workspace member or not (decision 0060); one that runs the root's commands takes the root config, and a nested file states only what it overrides. Campaign maps are looked up from the current project upward to the git root, then `config.campaigns.external[]`.

`.claude/hodos/sessions/<session-id>` and `.claude/hodos/active` each hold one line — the slug of a task. Both are written by `ledger.mjs` only: `init` writes both, `claim <slug>` writes both when `run` takes up a task — not when it starts and stops, so a run that finds the task `done`, or its plan unapproved, leaves them to whichever session they belong to (`COMPONENTS.md §1.2` step 1). On `Finish` the script deletes every pointer that names the finished task, and `active` when it names it, regardless of whether the task directory is deleted.

**Which task a caller is on** is resolved in one order everywhere (decision 0047): the caller's session id → `sessions/<id>` → `active`. A hook takes the id from its payload's documented `session_id`; a script a kernel runs takes it from `CLAUDE_CODE_SESSION_ID`. `active` is the single-session path, the fallback when no id is reachable, and what a developer greps; a machine where the id is absent behaves exactly as it did before the pointers existed. `status` garbage-collects a pointer whose session's transcript is gone or whose task directory no longer exists. The `session_id` is not a path: a value outside `[A-Za-z0-9._-]` is treated as no id at all.

`.claude/hodos/env/<layer>.json` — one record per layer **this machine raised**, written by `env.mjs up` and deleted by `env.mjs down`: the pid of the detached process, when it started, the command, the `stop` the config declared, the directory the raise ran in, and the layer's log. `cwd` is on the record because `down` runs the `stop` where the raise ran, whatever the config's `cwd` says by then. A layer found already up never gets one, which is what makes "stop what hodos started, and never a layer it found already up" a property rather than a promise (decision 0074). Beside it, `env/<layer>.log` holds what **that** raise printed: `down` keeps the log and removes the record, so the log is started empty each time the layer is raised and a `ready` line is proof of the raise that is running. Both are gitignored, like every other per-machine file under `hodos/`.

`.claude/hodos/history.jsonl` — one JSON line per finished task, appended by `ledger.mjs` on `Finish`. Gitignored. `status` computes its rates from it, so metrics survive task-directory deletion.

```json
{ "slug": "orders-summary", "path": "standard", "type": "feature",
  "upgrades": 0, "reviewIterations": 1, "verifyIterations": 1, "gaps": 1,
  "overrode": false, "gapTexts": ["the plan did not say … — resolved by …"],
  "usage": { "sessions": 2, "missing": 0, "input": 41233, "output": 9120,
             "cacheRead": 812004, "cacheCreation": 66190 },
  "finishedAt": "2026-08-30T11:30:00Z" }
```

`overrode` is the presence of a `Route:` line in the ledger — that line is written only when the developer changed the router's proposal at confirmation — and `gapTexts` the text of its `Gap:` lines, so neither needs a CLI form of its own (decision 0046). `usage` is the token usage of the sessions that claimed the task, summed from their transcripts, and is `null` when not one of them could be read: no usage data rather than a wrong number (decision 0045). No dollar figure — the price of a token is not in the transcript.

`.claude/settings.local.json` receives, on approval at `init`, `permissions.allow: ["Bash(node <absolute plugin root>/scripts/*)"]`, because a skill's `allowed-tools` pre-approves only the invoking turn (`PLATFORM-NOTES.md` fact 14). The plugin root is written **resolved** — the value `${CLAUDE_PLUGIN_ROOT}` held when `init` ran, in full — because a project settings file has no plugin context to expand a variable in. The value names one machine's plugin root, and `settings.local.json` is the file Claude Code gitignores, so that is where it goes; the committed `.claude/settings.json` receives only what a team shares, which at `init` is an approved hook (decision 0057) — and a hook command naming `${CLAUDE_PLUGIN_ROOT}` or an absolute path — a home directory being the common case, `/opt/tools/lint` as unshared as `~/bin/lint` — is by construction not shared, because it names one machine's disk and arrives at a teammate's checkout unrunnable. The approval names the file it writes. Declining leaves one permission prompt per script call.

## 2. `config.json`

```json
{
  "version": 1,
  "language": "en",
  "stack": ["typescript", "react", "vite", "vitest"],
  "commands": {
    "test": "npx vitest run",
    "typecheck": "npx tsc --noEmit",
    "lint": "npm run lint",
    "build": "npm run build",
    "dev": { "cmd": "npm run dev", "url": "http://localhost:5173", "ready": "Local:" }
  },
  "verify": {
    "recipes": [
      { "name": "unit", "kind": "command", "run": "npx vitest run", "when": "always" },
      { "name": "ui", "kind": "browser", "routes": ["/"], "when": "ui" },
      { "name": "api", "kind": "http", "base": "http://localhost:3000", "when": "api" }
    ],
    "profile": "local",
    "profiles": {
      "local": { "layers": ["infra", "spa"] },
      "stand": { "layers": ["spa-stand"] }
    },
    "layers": {
      "infra": { "cwd": "../infra", "up": "./up.sh", "stop": "./stop.sh",
                 "timeout": 600,
                 "check": [{ "kind": "tcp", "target": "localhost:5432" },
                           { "kind": "http", "target": "http://localhost/health", "expect": 200 }],
                 "access": { "needs": ["Bash(sh ../infra/*)"], "grant": "permissions", "grantedAt": "2026-09-05" } },
      "spa": { "up": "npm run dev", "ready": "Local:", "url": "http://localhost:5173" },
      "spa-stand": { "up": "npm run dev:stand", "ready": "Local:", "url": "http://localhost:5173" }
    }
  },
  "conventions": {
    "commit": "conventional",
    "branch": "feature/{slug}"
  },
  "models": {
    "review": "opus", "planReview": "opus",
    "verify": "sonnet", "preparer": "sonnet",
    "research": "sonnet", "initScan": "sonnet"
  },
  "autonomy": "ask",
  "gates": {
    "denyDangerousGit": false,
    "blockCommitOnFailedReview": false,
    "stopHookLedger": false
  },
  "adapters": {
    "browser": "chrome-devtools",
    "docs": "context7",
    "codeIndex": null,
    "design": null,
    "tracker": null,
    "logs": null,
    "db": null,
    "ci": null
  },
  "review": { "generated": ["package-lock.json", "*.snap", "dist/"], "maxBytes": 1000000 },
  "campaigns": { "external": [] },
  "tasks": { "staleDays": 14 },
  "nested": [],
  "verifiedAt": "2026-08-30",
  "scanSha": "a1b2c3d"
}
```

Field notes:
- `commands.*` are the exact shell commands `init` ran successfully at `verifiedAt`. Reviewer and verifier run them verbatim. A command is `null` when the project has no such tool; the reviewer records `check: not configured` and the verifier skips the matching recipe with that reason.
- `verify.recipes[].kind`: `command` | `browser` | `http` | `a11y` | `viewport` (decision 0095). `a11y` audits the recipe's `routes` through the browser adapter's `audit` operation, or through the recipe's own `run` where the project names a tool, and its rows are grouped by the audit's `impact`; a **route** the audit could not run is a skip carrying the reason the tool gave — a `runtimeError` through `lighthouse_audit`, a non-zero exit through an axe or pa11y `run`. A **check the tool could not decide** is neither a finding nor a skip: it names work for a person, not a failed route, so the route's row carries its count and leaves it to the quadrant it belongs to (`DESIGN.md §7.4`). The two tools differ in what that count is worth. `lighthouse_audit` returns the same ten `scoreDisplayMode: "manual"` audits on every accessibility run — a fixed list, so a change in the number means the run itself changed. Axe's `incomplete` is per element and per page: it holds the nodes axe found on **this** DOM and could not judge, so it moves run to run and is read as this run's, never as a constant. Only the Lighthouse half is measured here; the axe half is written from the tool's contract. `notApplicable` is neither, and is not counted. Measured 2026-09-06 on a live run: 76 accessibility audits, `"incomplete"` zero times, `"manual"` ten, `notApplicable` 54, one carrying `impact`. `widths` belongs to `viewport` and to no other kind, and a `viewport` recipe whose `widths` or `routes` is missing or empty is a `check` error: the recipe iterates routes × widths, and an empty either side is a recipe with nothing to run. `viewport` re-visits the recipe's `routes` at each width of `widths[]` — CSS pixels, one row and one screenshot per route × width. Both are `when`-gated like every other recipe, so a project that declares neither pays nothing for them. `when`: `always` · `ui` (task touches files matching the project's UI globs) · `api` · `perf` (only when the plan declared it) · a glob.
- `verify.profile`, `profiles`, `layers`: the environment the claims are run against, raised by hodos before the verifier is dispatched (decision 0074). `profile` names the active profile; a profile names the layers a run needs, **in the order they are raised**; a layer says how it is raised (`up`, and `cwd`, `stop`) — every layer is spawned detached, because a process started inside a session dies with it, how it is proven up (`check[]`, or `ready` and `url` for the one foreground layer), how long it may take (`timeout`, **in seconds**), and what it needs to be allowed (`access`). Absent: `commands.dev` is the environment, unchanged — a project with one `spa` layer is `commands.dev` with more words. A `profile` or a layer name that resolves to nothing is a `check` error, because a layer nobody raises is discovered at the preflight otherwise. **The stack is POSIX-only today:** `env.mjs down` stops a foreground layer by signalling its process group (`process.kill(-pid, 'SIGTERM')`), which Windows has no equivalent of — `taskkill /T /PID` is its form and is unbuilt — so a project declaring `verify.env` on Windows would raise a layer it cannot stop. The command recipes and everything else in `verify` are platform-neutral.
- `verify.layers[].check[].kind`: `tcp` — `target` is `host:port` and the port opens · `cmd` — `run` exits 0 · `http` — `target` answers with `expect` (default 200). Each check's own `timeout` is the seconds one attempt is given; the layer's is the seconds every check has to go green in. `ps` listing a container is not a check: what a check asserts is that the thing answers.
- `verify.layers[].access`: `needs[]` names the `permissions.allow` entries the raise runs under, or the one-time machine grant it needs; `grant` is `permissions` | `one-time`; `grantedAt` is the date it was granted, or `null`. `null` is the only state in which hodos asks anything at all, and the question is *may I* — offering to write the entry itself — never *go and run this*. A decline degrades that layer's `browser` and `http` claims to `skip: environment not up — <layer>, access declined`, leaves the command recipes running, and is **not** persisted: the next run asks once rather than skipping in silence.
- `conventions.commit`: `conventional` | `ticket-prefix` | `custom:<pattern>`; degenerate project conventions are replaced by `conventional` on approval.
- `models.*` are passed as the `model` parameter on every subagent dispatch for that role. Planning and execution run in the main session on the session's model; there is no key for them.
- There is no key for the per-dispatch turn bound. It is `maxTurns` in the agent definition, which is a plugin file (decision 0044): the Agent tool takes no such parameter, so a project sets one only by shipping its own `.claude/agents/hodos-<role>.md`.
- `autonomy`: `ask` (default) | `rulings` — `rulings` lets the agent settle an unsettled fork itself and record it; it never removes the router verdict, the plan approval, the breaker, or a destructive action from the stops (`DESIGN.md §4.4`, decision 0030).
- `gates.denyDangerousGit`: `git-guard.mjs` denies `push --force`, `commit --no-verify`, `reset --hard`, `rm -rf` outside `.claude/hodos/tasks/`. `gates.blockCommitOnFailedReview`: denies `git commit` while `state.phase == "fix"`. `gates.stopHookLedger`: the Stop hook blocks while `state.phase` is `execute`, `review`, `fix`, or `verify`.
- `adapters.<role>`: an adapter file name under `adapters/<role>/`, or `null`. The roles are the closed set of `DESIGN.md §3.2` — `browser`, `docs`, `codeIndex`, `design`, `tracker`, `logs`, `db`, `ci` (decision 0061) — and a key outside it is an error, not a forward-compatible extension. A role hodos ships no adapter for is reached with `project:<name>` (§13).
- `review.generated[]`: globs whose files are packaged **stat-only** — named in `## Not packaged` and left out of the diff (§8, decision 0065). Absent means the default list; present means the list, so a project that wants its lockfile reviewed writes one without it. `review.maxBytes`: the size at which `review-package.mjs` refuses to write the package and names the largest files instead; absent means 1,000,000.
- `campaigns.external[]`: absolute or repo-relative paths to other repositories' `campaigns/` directories.
- `nested[]`: the repo-relative directories that carry their own config, written into the root config by `init`. A subproject is listed here because its commands differ from the root's; the file itself is what `config.mjs find` merges.
- `tasks.staleDays`: the age at which `status` and the digest name a task as stale. There is no key for committing the task directory: it is working state (`DESIGN.md §5.1`), and `tasks.track` — which validated and did nothing — is **retired**, reported by `check` as a warning so a config written against 0.1's predecessor still loads (decision 0079).
- `scanSha`: the commit `init` scanned; `--refresh` diffs from it.

Scripts read this file with `JSON.parse`; unknown fields are preserved.

**The anchor** (decision 0075). A path a config or a script hands to a command resolves against the **git root** — the directory holding `.git`, which `config.mjs gitRoot` returns and `campaigns.external[]` means by "repo-relative". `projectRoot`, the directory of the nearest config that `config.mjs find` prints, addresses `.claude/hodos/` and nothing else: `config.json`, `tasks/`, `active`, `sessions/`, `env/`, `history.jsonl`, `campaigns/`, `handoffs/`, and this project's own `adapters/`. So the pathspec `review-package.mjs` hands to `git diff`, a metric command's directory (§11) and a layer's `verify.layers[].cwd` all resolve at the git root, and a path written once in a root config names one directory from every subproject that merges it. A developer's own argument on a command line is neither a config's nor a script's: it resolves where they are standing, and the script converts it. A project's own `commands.*` run **in its config's directory**, which is derived from where that file sits rather than written in it — the reason a subproject earns a config at all (decision 0060).

## 3. `brief.md`

```markdown
# orders-summary
Created: 2026-08-30 · Path: standard · Type: feature · Campaign: —

## Prompt
<the developer's message, verbatim>

## Checklist
| Row | Evidence | Value |
|---|---|---|
| files touched (estimate) | src/orders/api.ts, src/orders/OrdersPage.tsx, src/orders/summary/* (new) | 5 |
| new module | src/orders/summary is new and src/orders/OrdersPage.tsx imports it | yes |
| contract / schema / route change | src/api/orders.ts:12-40 unchanged | no |
| new dependency | package.json unchanged | no |
| data migration | none | no |
| needs more than one mergeable unit | no — one branch, one MR | no |
| fog | none | no |
| more than one developer | no | no |
| external wait | none | no |

## Verdict
Path: standard — quick fails on rows 1–2 · deep not required: rows 3–5 are `no` with evidence
Type: feature
Campaign: no — rows 6–9
Confirmed by user: yes
```

The nine rows are fixed. Each `Value` is `yes`, `no`, a number, or the literal `unknown`, and every row carries evidence.
Three of them decide the path through rules 1, 3 and 5, so each carries a test (decisions 0068, 0071):
- **new module** — `yes` when the change adds a file, directory, or package that something outside its own directory imports; `no` when everything it adds is imported only from within the directory it sits in.
- **contract / schema / route change** — `yes` when the change adds, removes, or alters an interface something outside the changed files depends on by name: an HTTP route or its request/response shape, a persisted schema or stored format, or an exported signature. Widening one of those so that every existing caller stays correct — a new variant on an exported union, a new optional parameter, a new optional field — is `no`.
- **needs more than one mergeable unit** — `yes` on any of three: the work **changes which packages or services exist** — one created, removed or split; it **spans more than one repository**; or it cannot land as one branch and one review without breaking main or losing reviewability. Editing two packages a single repository releases together is one merge and is `no`; splitting one of them into two, or moving one out to its own repository, is `yes`.
Row 1 counts **every file the change creates or edits** — the source files, the test beside each of them, the manifest and lockfile when it adds a dependency, and the declaration or barrel its public surface passes through. The list is what the rule reaches, not a closed set: a file the change has to edit is counted whether or not it is named here. On type `question` there is no change, so the row counts the files the **answer must name** to be complete — the ones a reader would have to open, not every file consulted to find them (decision 0070).
**Type** has six values, and two of them carry a test the router applies to the request and the repository, before any grilling (decision **0081**):

- **`spike`** — the output is a *decision*, not behavior. `yes` when no statement of what will be true when this is done survives as a check a command could run: the request asks whether something is possible, which of several approaches to take, or what one would cost. A request whose acceptance criterion **can** be written is `feature`, `bug` or `refactor`, whichever fits — "I don't know how yet" is not a spike, it is a plan with research in front of it. A `spike` plan carries the question, the timebox and the exit decision in place of acceptance criteria, opens no task commits, and ends in a `Ruling:` line naming which exit was taken — the scratch branch deleted, or a follow-up task opened with its slug (decision **0084**).
- **`upgrade`** — `yes` when the request names a package the project's manifest or lockfile **already carries** and the change is to its version. Adding a package that is not there is `new dependency` on row 4 and type `feature`; removing one is `refactor`. The plan's evidence loop is the project's own commands (`config.commands.test`, `build`, `lint`) run against the new version, and the red loop of `bug` does not apply.

The other four are unchanged: `feature` · `bug` · `refactor` · `question`.

`refactor` additionally has a **shape**, which adds no path and changes none of the six rules below: a refactor is **mechanical** when row 1 is above the `quick` limit **and** every touched file takes the *same* edit — one transformation statable as a single rule, so a codemod can make it and a sample can stand for it. Rule 3 still routes it to `deep` on width; what the shape changes is downstream, in `execute` and in what the reviewer is handed (the codemod plus a sample, not one diff per file).

Verdict rules, applied in this order, first match wins:
1. any `yes` or `unknown` on rows 6–9 → **campaign**;
2. `unknown` on rows 3–5 → **deep**;
3. rows 2 and 3 both `yes`, or type `refactor` with row 1 above the `quick` limit of rule 5 — more than three files → **deep**;
4. `unknown` on rows 1–2 → **standard**;
5. rows 1–5 all inside the `quick` limits (row 1 ≤3, rows 2–5 `no`) → **quick**;
6. otherwise → **standard**.

Rule 3's width is row 1, and an `unknown` there is not a count above the limit — rule 4 is what reaches it.

`Path` has four values — `quick`, `standard`, `deep`, `campaign` — and the six rules produce exactly one of them (decision 0025). The `Campaign:` line restates rule 1 for the reader: `yes` when the path is `campaign`, `no` otherwise. A campaign has no path of its own because it has no single amount of process: `DESIGN.md §9` turns each node into a task that is routed again.
The human confirms or overrides; an override is recorded as `Confirmed by user: overrode to <path>`.

**Slug:** derived by the kernel from the description (or the ticket id when present): kebab-case ASCII, ≤40 characters. `ledger.mjs init <slug>` normalizes it and, on collision with an existing task directory, appends `-2`, `-3`, printing the final slug. Resuming an existing task is `run`'s job, never `init`'s.

## 4. `research.md`

```markdown
# Research — orders-summary

## Q1. How does the project load order lists today?
- `src/orders/api.ts:14-38` — TanStack Query with `useOrders(filters)`; key `['orders', filters]`
- `src/orders/OrdersPage.tsx:22` — consumer; pagination via `nuqs`
Files to read: src/orders/api.ts, src/orders/OrdersPage.tsx

## Precedents
- Server state → TanStack Query hook per resource: `src/users/api.ts:9`, `src/orders/api.ts:14`

## External APIs
- @tanstack/react-query 5.51.1 (package-lock.json:1042) — `useQuery` options v5: Context7 /tanstack/query@5.51 → `placeholderData: keepPreviousData`

## Risks
- `OrdersPage` also reads legacy `ordersAtom` (`src/state/orders.ts:5`) — two sources of truth

## Open questions (for grilling)
- Q: keep `ordersAtom` for the summary widget, or migrate it in this task?
```

Every `path:line` is checked by `verify-citations.mjs`: the file exists, the line is inside it, and the line is not blank. A failing citation is a defect, not noise.

## 5. `plan.md`

```markdown
# Plan — orders-summary
Path: standard · Type: feature · Branch: feature/orders-summary · Campaign: — · Base: a1b2c3d

## Goal
One paragraph: what will be true when this is done.

## Non-goals
- …

## Decisions
| # | Question | Axis | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|---|
| D1 | … | where state lives | A — … (cons: …) · B — … (cons: …) | A, because … | A (user) |

## Design
### Modules
touched: … · new: `orders/summary` — why not existing: …
### Dependency direction
summary → orders/api → http. No import from ui into api.
### Interfaces
`useOrderSummary(range: DateRange): QueryResult<Summary>`
### Invariants & failure modes
- Summary never shows stale totals for a changed range (key includes range)
- API 5xx → query error state; no fallback zeros
### Data & scale
≤5k orders per range; single request; no client aggregation over pages
### Precedent
`src/users/api.ts:9`, `src/orders/api.ts:14` — hook per resource
### Refactor in scope
- `OrdersPage.tsx:40-58` — extract filter parsing shared with summary
### External APIs
- @tanstack/react-query 5.51.1 — `placeholderData` (Context7 …)
### Architecture alternatives
See D2.

## Tasks
### T1. Summary query hook
Files: src/orders/summary/api.ts, src/orders/summary/api.test.ts
Acceptance: `useOrderSummary` returns totals for a fixed range fixture; error state on 500
### T2. Summary widget
Files: …
Acceptance: renders totals; loading and error states visible at /orders
Tests: visual — layout and the three states only, no branch · verified by ui recipe /orders

## Verify plan
- unit: T1 tests
- ui: /orders — loading, totals, error (recipe `ui`)

## Open questions
(empty at approval)

## Outcome            ← appended by finish
Review: ACCEPT after 1 fix (0 blocker / 1 major fixed / 1 minor open)
Verify: PASS — evidence/01-orders.png, unit 14/14
Open minors: …
Gaps: 1 — see ledger
```

No frontmatter. The ten design fields of `DESIGN.md §6.2` are the nine `### Design` subsections plus the top-level `## Non-goals`; all ten must be non-empty at approval. An architecture row's `Axis` is one of the five of `skills/task/references/design.md` — module boundary · dependency direction · where state lives · what becomes an invariant · what fails and how — and alternatives differing on none of them are one alternative (decision **0085**). A row that settles something other than an architecture question, a library version or a scope call, carries `—`. `Open questions` must be empty at approval. Line count over 250 triggers an advisory lint message only.

A task has no `Tests:` line when it is test-first, which is the default. A task that deviates carries `Tests: <reason> — <justification> · verified by <what>` with `<reason>` one of `visual`, `glue`, `infra`, `no-harness` and both halves non-empty; `Tests: test-first` written out is also accepted. Any other value fails lint (decision 0022).

## 6. Ledger — `ledger.md`

Append-only. One event per line. Written only by `ledger.mjs`. The model passes the **CLI form**; the script validates it, fills the parts marked ⟨script⟩, prefixes an ISO-8601 timestamp, appends the **stored form**, and updates `state.json`.

| CLI form (what the kernel passes) | Stored form | Phase after |
|---|---|---|
| `init <slug> --path <p> --type <t> [--campaign <c/n>]` (command, not a line) | `Init: <path> <type>` | `plan` |
| `add "Route: <path> <type>"` (only if the path changed at confirmation) | same | `plan` |
| `add "Plan: approved" --tasks <n> --branch <name>` | `Plan: approved (⟨base-sha⟩, <n> tasks, <name>)` | `approved` |
| `add "Task <n>: started"` | same | `execute` |
| `add "Task <n>: test red"` | same | `execute` |
| `add "Task <n>: done" --sha <sha> [--tests <reason>]` | `Task <n>: done (<sha>)`, or `Task <n>: done (<sha>, tests: <reason>)` | `execute` |
| `add "Task <n>: red-check attempt <k>/3 — <text>"` | same | `execute` |
| `add "Ruling: <what> — <why> — <cost if wrong>"` | same | unchanged |
| `add "Gap: <what the plan lacked> — <resolution>"` | same | unchanged |
| `add "Upgrade: <from>→<to> — <why>"` | same | unchanged |
| `add "Simplify: done" --sha <sha> --net <n>` | `Simplify: done (<sha>, net -<n>)` | `review` |
| `add "Review <k>: <ACCEPT\|NEEDS_WORK\|REJECT> <b>/<m>/<mi>"` | `Review <k>: … (<b>/<m>/<mi>)` | `ACCEPT` → `verify`; else `fix` |
| `add "Fix <k>: done" --sha <sha>` | `Fix <k>: done (<sha>)` | `review` if last event was a review; `verify` if it was a verify |
| `add "Verify <k>: <PASS\|FAIL> <n> claims, <s> skipped"` | same | `PASS` → `finish`; `FAIL` → `fix` |
| `add "Breaker: <review\|verify> — <accept\|manual\|rollback T<n>>"` | same | `accept` → next phase as if passed; `manual` → `manual`; `rollback` → `execute` |
| `add "Compact: session compacted"` | same | unchanged |
| `add "Finish: report delivered"` | same | `done` |

`Task <n>: done` is refused with exit 1 unless the ledger already holds `Task <n>: test red` or `--tests` names one of `visual`, `glue`, `infra`, `no-harness` — the exemption the plan gave that task (decision 0022). The script does not read `plan.md`; the reviewer compares the two records. Any other line is rejected with exit 1 and the grammar printed. `--net` and `--tasks` take a whole number of 0 or more: the stored form writes the sign, so `--net -2` is rejected rather than stored as `net --2`, which the derivation's own pattern cannot read. `add` acts on the task this session is on (`sessions/<id>`, then `active`); `--slug <slug>` overrides. With no config, or no active task and no `--slug`, `add` prints `no active task` and exits 0 — hooks rely on this. `Finish: report delivered` also appends the task's summary line to `.claude/hodos/history.jsonl` and removes the task's session pointers and `active`.

## 7. `state.json`

```json
{
  "slug": "orders-summary",
  "path": "standard",
  "type": "feature",
  "phase": "execute",
  "campaign": null,
  "branch": "feature/orders-summary",
  "base": "a1b2c3d",
  "tasks": { "total": 2, "done": 1, "current": 2 },
  "redCheckAttempts": 0,
  "review": { "iteration": 0, "verdict": null },
  "verify": { "iteration": 0, "verdict": null },
  "lastCommit": "d4e5f6a",
  "lastEvent": "Task 1: done (d4e5f6a)",
  "createdAt": "2026-08-30T10:00:00Z",
  "updatedAt": "2026-08-30T11:30:00Z"
}
```

`phase` ∈ `plan · approved · execute · review · fix · verify · finish · manual · done`, derived exactly by the table in §6. `branch` comes from `--branch`; `tasks.total` from `--tasks`; `tasks.done` counts `Task n: done` lines after the most recent `Breaker: … rollback` (or all of them if none); `tasks.current` is the task to execute next — the last started task if it has no `done`, otherwise the last done task + 1, capped at `total`; after a rollback to `T<n>` it is `n`. `redCheckAttempts` counts attempts for the current task and resets on `done`. `review.iteration` / `verify.iteration` count their events — the number written in the line is the model's and is not read — and, like `tasks.done`, they count only the events after the most recent `Breaker: … rollback`: rebuilt work is judged on a fresh loop bound, and its `verdict` is `null` until the first review of that work (decision 0023). Never edited by hand.

## 8. `review-input.md`

Generated by `review-package.mjs`:

```markdown
# Review input — orders-summary
Base: a1b2c3d · Head: d4e5f6a · Commits: 3

## Projects
<one line per config that answers for this diff: its directory and its config path>

## Design (from plan)
<verbatim design section>

## Tasks (from plan)
<verbatim>

## Not packaged
<one line per generated file: its path, its churn, and the glob that matched>

## Callers
<one line per call site of a symbol whose exported declaration the diff changed>

## Diff stat
<git diff --stat base..head — every changed file, generated ones included>

## Diff
<git diff -U10 base..head — the packaged files only>
```

`## Projects` names the configs that answer for the diff — `config.mjs for-files` over the changed files (decision 0076). One line each, `- <dir> · config: <path>`, both git-root-relative — the git root itself is `.` — root first and then by depth and name:

```markdown
## Projects
- svc · config: svc/.claude/hodos/config.json
- web · config: web/.claude/hodos/config.json
```

The reviewer runs each project's `commands.*` — read from the config named here, not pasted into this file — and its `## Checks run` rows carry ` · project: <dir>` (§9). It is written when those projects are **not** the one project whose config the package was built from: two subprojects touched name two, and one subproject touched from a package built at the root names that one — the case decision 0060 argues against is a change confined to `web/` reviewed with the root's `npm test --workspaces`. A project that answers for its own change alone names nothing, which is every project with an empty `nested[]` and also a session standing in the subproject its task belongs to.

**`## Callers`** answers the three questions the diff cannot (decision **0100**). `review-package.mjs` reads the exported symbols whose **declaration** the diff changed — added and removed alike, since a deleted export breaks a caller as surely as a changed signature — greps the repository for each, and writes the call sites that are **outside** the changed files:

```markdown
## Callers
- `listOrders` · src/features/orders/ui/OrdersPage.tsx:12 — `const orders = useQuery({ queryKey: keys.list(status), queryFn: () => listOrders(status) });`
- `listOrders` — 5 of 9 call sites listed (cap)
```

It is a **pointer list the reviewer judges**, never a finding: a grep by name misses a symbol reached through a re-export or a dynamic key, and a common name resolves into unrelated modules. The declaration families it reads are JavaScript and TypeScript's `export` and Rust's `pub`; a language that spells its public surface otherwise gets no section. An import line is not a call site, and neither is a line in a document — a project rule quoting the shape it requires is not a caller — and neither is the name inside a string or a comment: a match has to be **shaped like a call**, the name and then `(`. The run of 2026-09-06 is why the shape is required and not merely hoped for; it packaged `` `list` · test/server.test.js:31 — `it('answers the list route with JSON', async () => {` `` for two packages, and a title is not a caller (`bench/review/runs/2026-09-06/README.md`). The price of the shape is a symbol passed as a value — `useEffect(fetchOrders)` — which reads as a dependency and is dropped with the titles. The caps are **10 symbols** and **5 call sites each**, constants in the script rather than config keys, and a cap that bites says so on its own line — the shape `## Not packaged` uses. Nothing exported changed, or nothing outside the diff names it: no section.

`## Not packaged` is written only when a changed file matches `config.review.generated` (default: the lockfiles, `*.snap`, `dist/`, `build/`, `generated/`, `__generated__/`). Those files are named with their churn and left out of the diff, and the section tells the reviewer to name them in its Coverage line, so the omission is in the review rather than silent. The stat stays complete: what changed is not what was packaged, and the reviewer sees both (decision 0065).

A package over `config.review.maxBytes` (default 1,000,000) is not written: the script exits 1 naming the five largest packaged files. The rule handles the routine lockfile bump; the cap is the second guard, for a source change past the size at which one reviewer's finding rate means anything.

For iteration 2 the script takes `--since <fix-sha>` and includes the previous `review.md` findings table plus the fix diff only.

**Two variants** (Stage 11c). `--mechanical <path>` packages a one-shape change as what it is: the codemod at `<path>` — which must be one of the changed files, or the script exits 1 — plus a three-file sample of what it rewrote, with every other rewritten file named under `## Not packaged` beside the generated ones, each carrying its churn and the reason `the codemod makes this edit`. `--target <ref|range|path>` packages a diff no task owns: a branch against its merge-base with the default branch, an explicit `a..b`, or the working-tree changes under a path. It takes no slug and writes nothing into the project — the file goes to a temporary directory whose path is printed, and no task, ledger line or state is created. There is no plan, so `## Design (from plan)` and `## Tasks (from plan)` are replaced by one section:

```markdown
## Intent (from commit messages)
- 4f2a1c9 feat: their work
```

A `--target` naming a branch that an unfinished hodos task's `state.branch` records exits 1 and names `/hodos:run <slug>`: that diff has a plan to be reviewed against, and reviewing it without one is a second, weaker review of work the engine already owns.

## 9. `review.md`

```markdown
# Review 1 — orders-summary
Verdict: NEEDS_WORK · blockers 0 · majors 2 · minors 1

## Checks run
- test: `npx vitest run` → 14 passed
- typecheck: `npx tsc --noEmit` → 0 errors
- lint: `npm run lint` → 1 warning (src/orders/summary/Widget.tsx:31 no-unused-vars)

## Spec
Missing: — · Extra: — · Misunderstood: —
(≤400 words)

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/orders/summary/api.ts:22 | rules/http.md §2 | — | raw `fetch` instead of project `http` client | use `http.get` |
| major | src/orders/summary/total.ts:14 | L4 state mutation | `items` is the caller's array, reused after the call | `sort()` mutates the argument; the caller's order changes silently | sort a copy |
| minor | src/orders/summary/Widget.tsx:31 | lint | — | unused `range` | remove |
(≤400 words)

## Coverage
Not reviewed: test fixtures under src/orders/summary/__fixtures__ (generated)
```

Where the package carried a `## Projects` section (§8), each of the three roles runs once per project and its row carries ` · project: <dir>` — ``- test: `dotnet test` → 31 passed · project: svc`` — the same suffix `Done-metrics` rows use one level up for another repository (§11). The suffix belongs to the rows that report a project's configured command, including the `not configured` ones; a line the reviewer adds for information — a recovery path it tried, a note on the whole diff — answers for no single project and carries none. No `## Projects` section, no suffix.

Verdict rule: any blocker → `REJECT`; any major → `NEEDS_WORK`; else `ACCEPT`. A row without a location and an item is invalid and is dropped by the reviewer before writing. A finding whose subject is a file that does not exist — a module shipped with no test beside it — is located by the path of **that** file: the one that is missing, named in full, with no line. Not the directory it would sit in, and not the neighbour that does exist. That is the one case where a location has no `:<line>` (decision 0038).

`Item` names the source of the judgement: a project rule, a lint result, a plan design field, a `defaults.md` entry, or a behavioral risk code `L1`..`L9` (the checklist in `agents/hodos-reviewer.md`). `Trigger` is the concrete input or state under which the defect manifests: mandatory for a behavioral finding at `blocker` or `major`, `—` for a convention finding, whose instance is the location itself. A behavioral finding at those severities whose trigger cannot be named is invalid and is dropped with the rows that lack a location or an item (decision 0015).

## 10. `verify.md`

```markdown
# Verify 1 — orders-summary
Verdict: PASS · claims 5 · pass 4 · fail 0 · skip 1

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | T1 totals for fixture range | `npx vitest run summary` | 3 passed | pass |
| 2 | /orders shows totals | browser.navigate /orders; screenshot | evidence/01-orders.png | pass |
| 3 | error state on 500 | browser: mock 500 via devtools → screenshot | evidence/02-error.png | pass |
| 4 | mutation: api.test pins range key | broke key line → test red → restored | vitest output | pass |
| 5 | perf: ≤5k orders single request | — | Skip: plan did not declare perf | skip |
```

Every `skip` has a reason. A claim from the plan that does not appear in the table is a verify failure. The header counts must equal the table.

Where a profile raised the environment (§2), the first line carries it — `# Verify 1 — orders-summary · env: local` — because the same claims run against a locally raised back end and against a remote stand produce the same table and different evidence, and a screenshot that does not say which is evidence of nothing (decision 0074). No profile, and the line is what it was.

Where the package named projects (§8), a row that **reports a command that ran or an action that was taken** carries ` · project: <dir>` — `` `dotnet test` · project: svc `` — and each project's recipes run in its own directory. **The mutation row too**: its cell summarizes the commands it ran, one project's test command on one of that project's files, so it answers for that project like any other row. A row where nothing ran and nothing was done — a `skip`, a `—` — carries none. A row **copied forward** on iteration 2 keeps the suffix it had, because the claim still answers for that project even though this message ran nothing for it. The table above is the no-section case, so none of its rows carries one; mixing the two cases in one table would make it an invalid instance of this rule. No section, no suffix, and the table is what it was.

## 11. Campaign map — `campaigns/<slug>.md`

```markdown
# State migration — Redux → TanStack Query + zustand
Status: active · Owners: @you, @teammate · Tracker: SHOP-1042
Home: shop.example/Shop.Web/spa

## Done-metrics
| Metric | Command | Start | Target | Current (date) |
|---|---|---|---|---|
| redux slices | `grep -rl createSlice src \| wc -l` | 24 | 0 | 9 (2026-08-28) |
| connect() usages | `grep -rn "connect(" src \| wc -l` | 96 | 0 | 31 (2026-08-28) |

## Decisions
| # | Decision | Why |
|---|---|---|
| D1 | Server state → TanStack Query; client-only → zustand; URL → nuqs | … |
| D2 | Migrate per feature slice, expand–contract; no big-bang | … |

## Nodes
- [done] orders-list — orders list to TanStack · deps: — · owner: @you · branch: feature/orders-list · ref: sha:a1b2c3d · metric: slices 24→21
- [active] orders-summary — summary widget · deps: orders-list · owner: @you · branch: feature/orders-summary · ref: task:orders-summary · metric: —
- [ready] users-list — users list to TanStack · deps: — · owner: — · branch: — · ref: — · metric: —
- [blocked] billing — billing screens · deps: — · owner: — · branch: — · ref: — · metric: — · by: backend billing API (SHOP-1049)
- [fog] reporting-page — depends on whether reports move to the new backend · deps: — · owner: — · branch: — · ref: — · metric: —
- [dropped] legacy-export — out of scope, D3 · deps: — · owner: — · branch: — · ref: — · metric: —

## Waits
- backend billing API — @backend-team, asked 2026-08-27
```

**Node line grammar** (parsed by `campaigns.mjs`): `- [<status>] <name> — <gist> · deps: <v> · owner: <v> · branch: <v> · ref: <v> · metric: <v>` followed by optional ` · by: <v>`, ` · repo: <v>`, ` · path: <v>`. Fields are separated by ` · ` (space, middle dot, space); the first segment is `[status] name — gist` with `name` a kebab-case token and `gist` free text without ` · `; every other segment is `key: value`; an empty value is `—`. `deps` is a comma-separated list of node names. `ref` is `task:<slug>` while active, `sha:<sha>` when done. `status` ∈ `fog · ready · blocked · active · review · done · dropped`. `campaigns.mjs` rewrites only the line whose `name` matches and only the fields it was told to change; unknown keys are preserved.

Metric rows in `Done-metrics` may carry ` · repo: <name>` after the command when the command runs in another repository.

## 12. SessionStart digest (hook output)

Plain text, ≤300 tokens, phrased as state:

```
hodos: config verified 2026-08-30 · 1 active task · 1 stale task · 2 campaigns
- orders-summary [execute] last: "Task 1: done (d4e5f6a)" — resume with /hodos:run orders-summary
- stale: users-export (21 days) — /hodos:status to fold or delete
- campaigns: state-migration — frontier 1 ready / 1 blocked / 1 fog · mui-cleanup — frontier 2 ready
- decay: 3 cited paths renamed or deleted since the scan (441be53) — /hodos:init --refresh
```

The campaign line is produced only when `campaigns.mjs` is available (Stage 9a); before that the digest omits it. A count that is zero is not printed, so a map with nothing blocked reads `frontier 2 ready`; a map with nothing in any of the four reads `frontier nothing open`, whether its remaining nodes are claimed or finished. The row's whole vocabulary is `ready · held · blocked · fog · nothing open`. `--full` adds one `campaigns.mjs frontier` block per map after the rows, which is what `status` reports; a map that reaches into another repository is one line — `<slug> — cross-repository (Stage 9b)` — and no block.

### The decay row

The layer's own rot, reported by the layer (decision **0078**). `config.scanSha` records the commit `init` scanned and nothing compared it to HEAD, so a project whose code moved under its rules said nothing until someone remembered `--refresh` exists. One row, and only when there is something to say: the paths the rules and the map cite, intersected with what `git log --diff-filter=RD --name-status <scanSha>..HEAD` renamed or deleted. A rename is counted by its **old** name, which is the one the layer cites. No `scanSha`, a `scanSha` this repository does not contain, or no git at all → no row at all; what to do about an unreachable scan is `--refresh`'s sentence to say, not the digest's. The row sits after the campaign row and before the offer, so the cap drops the offer first and this second — and the count is of paths, never of rules: which rules those paths belong to is what `/hodos:status --prune` prints.

### The offer line

The digest's one assistive line (decision **0081**). Form:

```
- offer: <verb> — <the fact that holds, with its number> — <the command>
```

At most **one** offer per digest, and none at all when no precondition holds — silence is the default, and the ≤300-token cap is not raised for it. The offer is written **last**, after the campaign row, so it is the first line the cap drops: an offer never costs a row of state. Every precondition is decidable and computed by the script from files, or from one local git call that fails open — never from a model's reading of the session.

| Priority | Verb | Precondition | The line it produces |
|---|---|---|---|
| 1 | `review` | HEAD is on a branch other than the repository's default, it is ahead of its upstream, and no hodos task is on it (no `state.branch` names it) | `- offer: review — feat/orders is 2 commits ahead of origin/main with no hodos task — /hodos:review feat/orders` |
| 2 | `handoff` | at least one **stale** task — its `ledger.md` has not changed for `config.tasks.staleDays` — exists | `- offer: handoff — users-export has been open 21 days — /hodos:handoff users-export` |
| 3 | `prune` | at least one precedent in `.claude/rules/*.md` has rotted — a citation that no longer resolves, or an anchor whose text has moved out from under it (decisions **0082**, **0078**) | `- offer: prune — 3 rule precedents have rotted — /hodos:status --prune` |

Priority is by **how long the precondition will keep holding**, not by importance. The `review` offer is transient — it holds only while that branch is ahead and unreviewed — while a stale task and a rotted precedent are chronic and will still be true tomorrow: a transient offer that loses the slot is lost, a chronic one is not. The `handoff` offer names the third verb for a stale task that its own row does not carry; the row still reads `fold or delete`, unchanged.

The second offer channel is a **phase boundary**, not a second line in this file: `finish` already proposes a rule, and a `handoff` or `prune` offer belongs there under the same contract — one, computed, silent when nothing holds.

## 13. Adapter file — `adapters/browser/chrome-devtools.md`

```markdown
role: browser
server: chrome-devtools
navigate:   mcp__chrome-devtools__navigate_page {url}
stub:       mcp__chrome-devtools__navigate_page {type: "url", url, initScript}
snapshot:   mcp__chrome-devtools__take_snapshot            # uids for click/fill live here
click:      mcp__chrome-devtools__click {uid}
fill:       mcp__chrome-devtools__fill {uid, value}
screenshot: mcp__chrome-devtools__take_screenshot {filePath}
evaluate:   mcp__chrome-devtools__evaluate_script {function}
console:    mcp__chrome-devtools__list_console_messages
network:    mcp__chrome-devtools__list_network_requests
resize:     mcp__chrome-devtools__resize_page {width, height}
emulate:    mcp__chrome-devtools__emulate {networkConditions?, viewport?}
audit:      mcp__chrome-devtools__lighthouse_audit {device?, mode?}
gotchas:
- take_snapshot before any click/fill; uids expire on navigation
- screenshots go to tasks/<slug>/evidence/<nn>-<name>.png
```

**The shape**, which `lint.mjs` checks on every adapter it can see (decision 0062): `role:` first and matching the directory; `server:` second; then one `<operation>: mcp__<server>__<tool> [{args}]` line per operation, the prefix matching the file's own `server:`; then `gotchas:` with one `- ` line each. **Every operation `DESIGN.md §3.2` names for the role**, which is why the example above carries all twelve of `browser`'s: a file that maps fewer fails `config.mjs check` and warns in `lint --project` (decision **0091**), and an example a project copies had better pass the checks the project will run. A file that states a shape nothing checks is a file a verifier can silently get nothing from.

**A project's own adapters** live at `.claude/hodos/adapters/<role>/<tool>.md`, tracked in git like `campaigns/` — an adapter is team knowledge — and are named in the config as `"project:<tool>"`. The prefix is what makes shadowing impossible: the value says which of the two directories the file came from, and `config.mjs check` validates each branch against that directory with its own error. On a project adapter lint additionally requires the `server:` value to be a key of the project's `.mcp.json`, because an operation whose server exists nowhere turns an explicit `Skip` into a failed call. `/hodos:adapter` writes them.

## 14. Source file — `sources/testing.md`

```markdown
- https://github.com/goldbergyoni/javascript-testing-best-practices — test design, mocking, what a test must assert — widely adopted, language-agnostic despite the name
- https://react.dev/learn/you-might-not-need-an-effect — effect misuse catalogue — the framework's own documentation
```

## 15. Stage files — `docs/stages/`

`NN-plan.md`, `NN-report.md`, `NN-review.md` with `NN` two digits (`00`–`12`). A stage a decision has split carries the letter its half is named by — `09a-plan.md`, `09b-plan.md` — and its base tag matches (`stage-09a-base`); two halves cannot share one `NN` without overwriting each other's evidence (decision 0040). Shapes in `STAGE-PROTOCOL.md §5` and `STAGE-REVIEW-PROMPT.md`.

## 16. Handoff file — `.claude/hodos/handoffs/<slug>.md`

Written by `/hodos:handoff`, committed by the developer, read by `/hodos:run <slug>` on the machine that picks the work up, and deleted by that pickup (decision **0083**). It is **tracked**: the task directory is gitignored and deleted at finish, and `history.jsonl` is per-machine, so this file is the only thing an unfinished task can hand to another person.

```markdown
# Handoff — orders-summary
Path: standard · Type: feature · Phase: execute · Written: 2026-09-03
Branch: feature/orders-summary · Head: d4e5f6a · Base: a1b2c3d
Reviewed: no — the review loop has not run on this branch

## Where it stands
<two to five sentences: what works, what does not, and the one thing the next
person would otherwise have to rediscover>

## Open
- T3. Error state for the summary widget — not started
- Gap: the /api route 404s in the dev server; T3's claim needs a stub

## Plan
<the plan's ## Goal, ## Design and ## Tasks sections, verbatim>

## Next
<one line: the command or the file to start from>
```

The header's four facts are read from `state.json`; `## Open` is the ledger's unclosed lines and every `Gap:` it holds; `## Plan` is copied, not summarised — the receiving machine holds no copy of the plan to read it from. `Reviewed:` says whether the branch's commits have been through the review loop, because the pickup's own review will cover only what happens after it.

**The pickup** (`skills/run/SKILL.md`): a slug with no task directory but a handoff file is an offer, never an automatic restore. On the developer's yes, `run` writes `plan.md` from `## Plan`, records `Init:` and `Plan: approved --tasks <n> --branch <name>` — from the default branch, so `base` is the fork point rather than the branch tip — checks the branch out, and deletes the handoff file, which is part of the same commit the developer makes next. On no, it prints the file's path and stops.

## 17. Environment diagnosis — `env.md`

Written by `hodos-preparer` into the task directory when a layer of the verify environment would not come up (`§2`, decision 0074). One layer per file, overwritten by the next dispatch that names the same task.

```markdown
# Environment — infra
Verdict: still red · layer infra · profile local · attempted 2

| Check | Kind | State | What it printed |
|---|---|---|---|
| localhost:5432 | tcp | red | ECONNREFUSED |
| localhost:80 | tcp | green | accepts a connection |

## What was tried
- `./up.sh` re-run in ../infra → exited 1: `pull access denied for registry.example/db`

## The cause
The database image has never been pulled on this machine and the registry needs a credential this session does not hold.

## What would close it
`docker login registry.example`, once, by the developer — then this layer comes up on its own.
```

`Verdict:` is `raised` or `still red`, and it is the line the agent returns to the kernel. The table carries **every** check the layer declares, the green ones included, because a check that passed is what narrows the cause to the one that did not. `## The cause` names one; a cause the preparer cannot fix from where it stands is a complete answer, and `## What would close it` is what the developer reads at the breaker.

The kernel re-probes the layer itself rather than reading `Verdict:` as the state of the world (`skills/run/references/verify-loop.md §3`): this file is a diagnosis, and whether the layer is up is a fact with a command behind it. The file stays on disk for `finish.md` to fold like `review.md` and `verify.md`.
