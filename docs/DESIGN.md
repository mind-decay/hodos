# hodos — System Design

> ὁδός — *the way*. μέθοδος — *following the way*.

Status: approved design, v1 scope. Source of truth for every other document. Evidence base: `research/01..04`. Decision log (Russian, working): `docs/00-decisions.md`.

## 1. Purpose

hodos is a Claude Code plugin that installs a complete development workflow into any project: it learns the project's conventions once (`/hodos:init`), then drives every task through research → plan → execute → review → verify → finish with bounded loops, file-based state, and evidence-based verification.

The developer is the driver of ideas and decisions. hodos is the driver of the *process*: it asks the right questions, refuses to guess where the plan is silent, reviews with fresh eyes, verifies by running, and cleans up after itself.

**Positioning — how hodos differs from superpowers, BMAD, spec-kit, compound-engineering:**

| | hodos |
|---|---|
| **Project-aware** | `init` derives rules from the codebase's own precedents and from authoritative stack sources, filtered by a behavior-shaping test. No system in the survey does this. |
| **Frugal** | Three skill descriptions in the model's listing, and only because a kernel invokes them; diff never enters the orchestrator's context; one reviewer; model tiering; frugality is a measured acceptance criterion (§11). |
| **Bounded** | 2 review + 2 verify iterations, then a breaker that hands the decision to the human. No infinite loops by construction. |
| **Verified** | "Done" requires fresh execution evidence against the project's own verify recipe — tests, typecheck, lint, browser, HTTP, accessibility, viewport. |
| **Human-gated** | The agent never decides what the plan didn't settle. A gap goes to the chat, not to a silent ruling. |

**Beside the first-party tools.** Claude Code ships four things that touch this, and naming them is part of the claim (`research/05`). `/code-review` reviews a diff on demand; hodos's reviewer is the same idea inside a loop that cannot run forever, over a package a script builds — the project's own `commands.test` and `commands.lint` run, the call sites of the exports the diff changed named, and a scored bench behind it. `code-simplifier` refines code while preserving behavior with guidelines; hodos's simplify pass is an ordered ladder with a first-rung stop, one line per cut, a `net:` line, and a marker where a cut was declined. `claude-code-setup` recommends MCP servers, hooks and subagents and writes nothing; `init` writes rules with ≥2 `file:line` precedents, a migration ledger for the instructions a project already had, and a config whose commands were run. `session-report` and `receipts` read the same transcripts `scripts/usage.mjs` does, and `receipts` reporting no dollar figure is the caution `status --cost` copies. The difference in every case is one property: a step here leaves evidence a later step checks.

**Audience:** professional developers shipping business software. Not a vibe-coding tool.

### Non-goals (v1)

Tracker synchronization (link only) · autonomous "rulings without a human" mode (exists as a config option, off) · worktree per task · agent teams · the Workflow tool · cross-model review (config option, not core) · desktop-app verification · cross-repo rule mirroring (solved by design: the engine is shared, rules are per repo).

## 2. Principles

Binding. Every component, rule, and PR is checked against these.

1. **Phases hand off through files, never through conversation memory.** Each phase writes an artifact under a slug; the artifact is the contract.
2. **Author ≠ reviewer, mechanically.** Review and verify run in fresh subagents with no session history. Never `context: fork` for review.
3. **Every claim carries a source or is deleted.** `file:line`, a package version, a URL.
4. **External facts come from sources, not memory.** Installed package code → the `docs` role, pinned to the installed version → official docs. Versions come from the lockfile.
5. **Hooks are enforcement, prompts are requests — and hodos never breaks a project.** All enforcement is opt-in; defaults are advisory.
6. **Hooks fail open and carry their incident.** The header comment names the failure that caused the hook.
7. **Decisions are tables: question → ≥2 real alternatives with cons → one recommendation → the human chooses.** A recommendation is mandatory; "your call" without a position is evasion.
8. **The agent does not decide what the plan did not settle.** Behavior, contract, structure, or dependency forks stop and ask. Purely local choices are recorded as rulings and surfaced.
9. **Context economy is a design axis.** Files instead of pasted context; file lists instead of summaries; one reviewer; tiered models; only call targets in the skill listing.
10. **Precedents beat abstractions.** Rules cite `file:line` and the incident; plans cite how the project already solves the problem.
11. **Cleanup is part of the workflow.** `finish` folds and deletes; `status` names what is stale.
12. **Rules are reactive and evidence-sourced.** "Would the model do this without the rule?" — if yes, the rule is deleted.
13. **Quality over speed, whole scope over partial.** Silently narrowing scope is forbidden; what was not done is named.
14. **Text is written for a reader who has already read everything.** See `AUTHORING.md`: no-op test, leading words, positive recipes, completion criteria.
15. **Limits are enforced by lint, not by prose.**
16. **A check earns its channel by being right about correct files.** A finding on a file that is correct costs context twice: once for the finding, and again for every later finding in that channel the reader now skims. Every mechanism that writes to the model or the developer — hook, reviewer, lint, rule, digest — reports on what it knows the shape of and stays silent on the rest. Incidents: `lint --hook` calling every task's `brief.md` an unknown artifact, and every correctly named project skill a name mismatch (Stage 1, reviews 1 and 2).

## 3. Architecture

### 3.1 Engine and project

hodos is two layers. The **engine** is the plugin — generic, stack-agnostic, never modified per project. The **project layer** is what `init` writes into the repository — rules, config, campaign maps — and what the developer owns.

```
engine (plugin, ~/.claude/plugins/…/hodos)      project (.claude/ in the repo)
├── skills/        kernels; 3 of 11 invocable     ├── CLAUDE.md          map ≤60 lines / managed block
│   └── */references/  phase procedures         ├── rules/*.md         path-scoped, precedent-cited
├── agents/        hodos-reviewer, -verifier     └── hodos/
├── hooks/         advisory by default               ├── config.json    stack, commands, recipe, models, gates
├── scripts/       zero-dep Node .mjs                ├── campaigns/     tracked — team-visible
├── adapters/      role → MCP tools                  ├── adapters/      tracked — this project's own
│                                                    └── tasks/<slug>/  gitignored — one dev, one task
├── sources/       best-practice pointers per stack
└── bench/         fixtures, router set, seeded defects, no-op scenarios
```

**Plugin-first (D1).** Distribution is the Claude Code plugin, and at 0.1 it is the only channel. The repository is skills.sh-shaped (`skills/*/SKILL.md`) and `npx skills add mind-decay/hodos` does install all eleven — and what it installs cannot run. It copies `skills/<name>/` and nothing else: `scripts/`, `hooks/`, `agents/` and `adapters/` are not part of a skill, while every kernel's first line is `` !`node ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs` `` and that variable is set by a plugin install and by nothing else (fact 14). Probed once and dropped rather than rescued by a prose-only arm of the kernels, which decision **0064** forbids: fact 51. Local installation is a fallback reserved for a concrete, unavoidable blocker; none is known.

**Plugin-system constraints honored** (see `research/02`):
- A plugin cannot ship `CLAUDE.md` or `.claude/rules/` → `init` writes them.
- Plugin agents cannot declare `hooks`, `mcpServers`, `permissionMode` → hooks live in `hooks/hooks.json`, MCP access is inherited from the session.
- Plugin agents lose name collisions to project agents → every agent is `hodos-*`.
- Plugin hooks fire in every project where the plugin is enabled → every hook exits 0 immediately when no `.claude/hodos/config.json` is found walking up to the git root.
- `skillOverrides` does not apply to plugin skills → the listing carries only the three skills a kernel must be able to invoke: `task`, `campaign`, `rule` (decision 0016). The other eight are `disable-model-invocation: true`.
- Compaction re-attaches only the first 5,000 tokens of each invoked skill → kernels are ≤150 lines and phase procedures are re-read from disk.

**Runtime:** every script is zero-dependency Node `.mjs`. No bash (Windows), no Python (not guaranteed). The suite runs on `ubuntu-latest` and `windows-latest` in CI: a path hodos **prints** is written with `/` on every platform — it is quoted in these documents, in the kernels and in the tests, and a reader types it into a shell — while a path it **returns for a caller to open** keeps the platform's separator, and a path it **compares** is compared separator-agnostically (decision 0103). `verify.env` is the one POSIX-only part, named in `FORMATS.md §2`. A script **returns** its exit code and the CLI tail assigns `process.exitCode`; `process.exit` is in none of them, because on Node 20 it truncates a pending write to a pipe and every phase reads a script through one (`PLATFORM-NOTES.md` fact 48). The original reason — "Claude Code requires Node ≥18" — was true on 2026-08-30 and is not: the platform ships a binary and the npm install's `claude` "does not itself invoke Node" (fact 18, corrected 2026-09-02). So **Node is a prerequisite hodos declares**: without it every hook fails and every kernel aborts on its `!` injection. Zero-dependency remains the rule for the reason that outlives the premise: a plugin install must not run a package manager to work. Decision 0041 states the prerequisite where a user meets it — `README.md` Requirements, the `plugin.json` description, and an `init` preflight at Stage 10 — and the failure was measured rather than inferred (fact 42): without `node` both `SessionStart` hooks error by name and the kernel's `!` injection aborts the invocation at turn 0, so the plugin does not start and says why.

**Self-sufficiency:** hodos bundles no stack knowledge skills and recommends none. Stack knowledge reaches the model through project rules (init) and task-time research (the `docs` role, installed package source).

### 3.2 Adapters

Phases call **roles**, never tools. The set is closed at eight, and every one of them is read by a phase — a role no phase calls is a config key that turns nothing on and is still reported to the developer as a capability (decision 0061):

| Role | Operations | The phase that calls it |
|---|---|---|
| `browser` | `navigate`, `stub`, `snapshot`, `click`, `fill`, `screenshot`, `evaluate`, `console`, `network`, `resize`, `emulate`, `audit` | verify |
| `docs` | `resolveLibrary`, `getDocs` | research, design, init's rule pass |
| `codeIndex` | `findReferences`, `outline`, `readSymbol`, `blastRadius`, `affectedTests` | research (precedents), plan (blast radius), verify (the tests the change reaches) |
| `design` | `getFrame`, `variables`, `screenshot` | plan, once; verify for fresh numbers |
| `tracker` | `link` | finish |
| `logs` | `trace` | the `bug` red loop |
| `db` | `schema` | plan's `### Data & scale` |
| `ci` | `failedRun` | the `bug` red loop |

The operations are the contract, and both adapter checks read it: a **project** adapter — one the `project:<tool>` branch resolves, the only kind a project writes — that maps fewer than its role names **fails `config.mjs check`**, naming the role and the operation, and is a **warning** in `lint --project`, because a phase calling the one it omits gets nothing and is told nothing (decision **0091**). The split is the two runs' jobs: `config.mjs check` closes `/hodos:adapter`, the skill that wrote the file and can fix it in one line, while `lint --project` reads every rule and map of a project besides and reports them all rather than stopping on an adapter it did not write. An adapter is a file ≤30 lines under `adapters/<role>/<tool>.md` mapping the role's operations to concrete MCP tool names plus the tool's gotchas (e.g. Figma: pull a node once, on plan — a dozen states is hundreds of thousands of tokens). `config.adapters` selects one adapter per role; `init` detects candidates from `.mcp.json`.

Adapters come from two places. The plugin ships one per tool it knows (`COMPONENTS.md §5`); a project writes its own into `.claude/hodos/adapters/<role>/<tool>.md` through `/hodos:adapter` and names it `"project:<tool>"` in the config (decision 0062). Three of the eight roles ship no adapter at all, so the project layer is how they are reached from day one — and a project whose MCP server hodos has never heard of is the common case, not the exception.

Degradation: adapter configured → deterministic calls. No adapter, MCP present → the phase may discover tools via ToolSearch. Nothing → explicit `Skip: <role> unavailable` in the report, never silent.

### 3.3 Sources

`sources/<stack>.md` is a list of pointers (URL + one line: what it covers, why it is authoritative) to best-practice material per language/framework. `init` fetches relevant pages (the `docs` role, or WebFetch) and extracts rule candidates. The engine stores pointers, not content; the community extends it one line per PR.

## 4. The Workflow

### 4.1 Entry, paths, types

Work enters through one command: `/hodos:task <description>`. The other commands — `init`, `run`, `campaign`, `status`, `rule`, `skill`, `review`, `handoff`, `wait-what` — are setup, continuation, and maintenance; the last two of those were added by decision **0081** for the two needs whose entry is not a task at all, reviewing a diff hodos did not write and handing an unfinished one over. `task`, `campaign` and `rule` are additionally model-invocable so a kernel can call them instead of reproducing their procedure (decision 0016); the model may therefore open a task on its own reading of a request. The mandatory stops of §4.4 are unchanged and still gate every consequential step. The router classifies the task on two axes and **proposes**; the human decides.

**Path** — how much process:

| Path | Research | Plan | Review | Verify |
|---|---|---|---|---|
| `quick` | none (one Explore call if needed) | short plan in chat + `plan.md` with all ten design fields, a field with nothing under it written as `none` plus its reason (decision 0032) | one fresh reviewer, both axes | recipe-driven |
| `standard` | on demand — when grilling hits a fact | full grilling, 2–3 architecture options, all design fields | one fresh reviewer | recipe-driven |
| `deep` | mandatory | full grilling + plan review by a fresh subagent before approval | one fresh reviewer | recipe-driven, perf if declared |

**Type** — what shape the plan takes: `feature` · `bug` (plan starts with a **red loop**: a command that fails on this bug, before any hypothesis — "no red-capable command, no phase 2"; the `reproduce` phase is what supplies one when the request names none) · `refactor` (target-first, done-metric, expand–contract for wide changes; **mechanical** when the change is wide and every file takes the same edit, where the codemod is the artifact and the reviewer sees it plus a sample) · `question` (answer with sources, no code, no artifacts beyond the brief) · `spike` (the output is a decision: no acceptance criterion can be stated, so the plan carries the question, the timebox and the exit, and no task is committed) · `upgrade` (the request names a package the lockfile already carries; the evidence loop is the project's own commands against the new version). The tests that decide the two new ones are in `FORMATS.md §3` (decisions **0081**, **0084**).

**Guarding against the router preferring speed.** The burden of proof is on the lighter path: the router fills a "why not deep" checklist with evidence (files touched, contracts, dependencies, migrations); any unknown moves the verdict heavier; an empty checklist is `deep`. The ratchet is one-way — a task upgrades mid-flight and never downgrades; every upgrade is a ledger event. `/hodos:status` reports the upgrade rate so the criteria are tuned by measurement, not belief.

`quick` eligibility (hypothesis, tuned on the pilot): ≤3 files, no new module, no contract/schema/route change, no new dependency, no data migration. The two rows that carry a judgement — new module, contract/schema/route change — are defined by test in `FORMATS.md §3` (decision 0068).

**Campaign verdict.** The router routes to a campaign — semantic criteria, never line counts — when any holds: the work cannot ship as one mergeable unit without breaking main or losing reviewability — which **crossing a repository, or creating, removing or splitting a package or service**, does on its own (row 6 carries both halves; decision 0071) · more than one developer · **fog** (work visible but not yet formulable) · external waits (backend not ready, design pending). A wide refactor is **deep**, not a campaign: it is rule 3's second clause in `FORMATS.md §3`, which is where the reference implementation has read it since Stage 2, and it reads the type and row 1 — a done-metric is part of what a `refactor` plan always has, so naming one selected nothing (decisions 0069, 0071, 0072).

Router budget: ≤5 **evidence** calls before a verdict — the searches and reads that fill checklist rows 1–5. The procedure around them is outside the budget: the `!` state digest, `config.mjs find`, and the read of the phase reference, which `PLATFORM-NOTES.md` fact 32 makes unskippable. A router that goes exploring has failed — the verdict is "research", not a private investigation (decision 0029).

### 4.2 Two sessions

```
S1  /hodos:task ──► route ──► [research] ──► grill + plan ──► approve ──► prints: /clear → /hodos:run <slug>
S2  /hodos:run  ──► execute (task by task, commit each) ──► simplify ──► review ⇄ fix (≤2) ──► verify ⇄ fix (≤2) ──► finish
```

S1 is one unbroken context: grilling, decisions, and the plan build on the same thinking. S2 starts clean: it knows only `plan.md`, `ledger.md`, the rules, and the code. The planning dialogue never pollutes execution, and execution never leaks into review.

**Phases are not skills.** `task` and `run` are kernels (≤150 lines each, user-invoked, zero listing cost). Each phase is a reference file under `skills/<kernel>/references/`, read from disk **on entering the phase**, completely, fail-closed: if the reference cannot be read, the kernel stops and reports rather than reconstructing the procedure from memory. After compaction the kernel survives (≤5k tokens) and the phase is re-read.

**Why not one skill per phase:** a chained skill must be model-invocable, so fifteen phase-skills would put fifteen descriptions into the listing — the cost hodos refuses. References cost nothing until read.

### 4.3 Who runs where

| Role | Where | Context it receives | Model (default) |
|---|---|---|---|
| Router, grilling, planning | S1 main context | conversation | opus |
| Research | `Explore` subagents (read-only, cannot spawn) | question + repo | sonnet |
| Plan review (`deep` only) | `hodos-plan-reviewer`, fresh | plan, rules, research | opus |
| Execute, simplify, fix | S2 main context | plan, ledger, rules, code | opus |
| Review | `hodos-reviewer`, fresh, read-only tree, runs checks | review-input.md, rules, config | opus |
| Verify | `hodos-verifier`, fresh | plan acceptance criteria, recipe, adapter | sonnet |
| Init scan | `Explore` subagents | area brief | sonnet |
| Init synthesis, interview | main context | scan results | opus |

Subagent models come from `config.models` (`review`, `planReview`, `verify`, `research`, `initScan`) and are passed per dispatch. Planning and execution run in the main session on the session's model. The reviewer performs its own confidence pass; a separate cheap triage model is a post-v1 option, taken only if reviewer precision proves insufficient on the bench.

Fresh subagents never see the conversation. Forks are forbidden for review and verify — a fork inherits the session history, which is exactly what makes a reviewer defend the author's work.

### 4.4 Human gates and autonomy

Mandatory stops: router verdict (path/type/campaign) · plan approval · a fork the plan did not settle that changes behavior, contract, structure, or dependency · the breaker · destructive or outward-facing actions (push, merge, deleting tracked files).

Not stops: purely local choices (a name, an order) — the agent decides and records `Ruling: <what> — <why> — <cost if wrong>` in the ledger; all rulings appear in the finish report.

Every plan gap that reached the chat is recorded as `Gap:` — the plan quality metric.

`config.autonomy: "ask"` (default) | `"rulings"` (superpowers-style: decide, record, continue). `"rulings"` downgrades **one** class of stop — the fork the plan did not settle — into a recorded `Ruling:`; the router verdict, the plan approval, the breaker and destructive or outward-facing actions stop under every setting (decision 0030). Off by default because the audience is business software.

### 4.5 Loop bounds

| Loop | Bound | On exhaustion |
|---|---|---|
| Reproduce (`bug` with no failing command) | 3 attempts, one command each | exit B: a `Ruling:` that the symptom is not reproducible here, the three attempts, and the two ways forward — get what is missing, or re-route |
| Task check red | 3 attempts | stop, diagnose in chat |
| Review → fix | 2 iterations; iteration 2 is a scoped re-review of the fix diff only; any verdict other than `ACCEPT` after iteration 2 exhausts the loop | **breaker**: human chooses *accept with open findings* / *continue manually* / *roll back to task N* |
| Verify → fix | 2 iterations; verify fixes are re-verified, not re-reviewed; `FAIL` after iteration 2 exhausts the loop | breaker |
| Campaign node | one node per session (research/decision nodes excepted) | — |
| Stop hook (opt-in) | Claude Code overrides after 8 blocks | message must converge: name the exact remaining item |

Order is review → verify: static checks are cheaper and verify runs on already-cleaned code.

## 5. State

### 5.1 Task directory — `.claude/hodos/tasks/<slug>/`

Gitignored: working state, one developer, one task.

**What a team keeps of a finished task** is the commit bodies (`conventions.commit` requires the why), the campaign node's `ref: sha:`, and any rule a finding earned. The task directory is not that record — `ledger.md` is append-only, so two parallel tasks conflict in it by construction, `state.json` is machine state, and `finish` deletes the directory — which is why there is no switch for committing it (decision 0079).

| File | Written by | Lifetime |
|---|---|---|
| `brief.md` | router | until finish |
| `research.md` | research | until finish |
| `plan.md` | planner; `Outcome` section appended by finish | until finish |
| `ledger.md` | `scripts/ledger.mjs` only | until finish |
| `state.json` | `scripts/ledger.mjs` only | until finish |
| `review.md`, `verify.md` | subagents | folded into `plan.md#Outcome`, then deleted |
| `review-input.md`, `plan-review.md` (`deep`), `stop-count` | scripts / plan reviewer / stop-gate | transient |
| `env.md` | `hodos-preparer`, when a layer would not come up | folded into `plan.md#Outcome` with the rest |
| `evidence/` | verifier | until finish |

**One writer for machine state.** The model calls `ledger.mjs add "<line>"` (shorthand for `node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs …`); the script validates the line against the grammar (`FORMATS.md §6`), reads `ledger.md`, appends to it, and derives `state.json`. The read comes first and an unreadable ledger is a refusal — the file named, nothing written, a non-zero exit — because a state derived from zero events parses cleanly and says the task is at its beginning; and `state.json` and the two claim pointers are **replaced by a rename**, so a kill mid-write leaves the old file rather than half of the new one (decision 0101). An absent ledger is the first line of a task and is not that failure. `.claude/hodos/sessions/<session-id>` names the task **that session** works on and `.claude/hodos/active` the project's, in that order of preference, so hooks need no arguments and two terminals on one repository do not take each other's ledger (decision 0047). Hooks and `status` read only JSON. The model never edits the ledger by hand, and no script parses prose. (Incident: the resume-system's three-grep marker parser and the awk locale bug — `research/01 §3`.)

**Resume.** `run` reads `state.json` + `ledger.md` and continues from the first open line. After compaction, the `SessionStart(compact)` hook re-injects the ledger path. The ledger names commits; git has them even when context does not.

**Garbage collection.** `finish` proposes deleting the task directory; `status` and the SessionStart digest name tasks older than `config.tasks.staleDays` (14).

### 5.2 Campaign map — `.claude/hodos/campaigns/<slug>.md`

Tracked. See §9.

### 5.3 Formats

All artifact formats, the ledger grammar, `state.json` schema, and `config.json` schema are specified in `FORMATS.md`.

## 6. Quality of decisions

Restating SOLID/KISS/DRY in a rule is a no-op — the model knows them. Quality comes from four mechanisms: the right questions before code, plan fields that cannot be skipped, a list of what the model gets wrong *by default*, and a reviewer that checks the fields and the list by `file:line`.

### 6.1 Grilling

Map the design as a tree; the **frontier** is every decision whose prerequisites are settled. Ask the whole frontier in one round, numbered, each with a recommended answer. Facts are the agent's job (dispatch Explore); decisions are the human's. Done when the frontier is empty — nothing silently assumed. Merged with the decisions table (Principle 7).

### 6.2 Design section — mandatory plan fields

An empty field means the plan is not ready.

| Field | What it forces |
|---|---|
| Modules touched / new | A new module needs a reason the existing ones don't fit |
| Dependency direction | Arrows point inward (toward domain); a violation is a decision |
| Interfaces (signatures) | Deep modules: small interface, large functionality |
| Invariants and failure modes | What cannot break; what happens when it does |
| Data and scale | Volume, latency, hot paths, N+1, unbounded lists — assumptions written, reviewer checks |
| Precedent | How the project already solves this (≥2 `file:line`); a new pattern only via a decision with the old pattern's cons |
| Refactor in scope | What to improve in the code the task touches — boy-scout inside the task's boundary |
| External APIs | Library → installed version (lockfile) → doc source for that version |
| Architecture alternatives | 2–3 real options from one planner (design-it-twice at minimum), compared in the decisions table; no subagent fan-out |
| Non-goals | What is explicitly not done |

A wrapper is justified only if it adds an abstraction boundary, an invariant, or a type translation; otherwise it is a decision titled "why".

**Prototype:** throwaway code answering exactly one design question, labeled, deleted before execute; only when grilling reaches "we won't know until we try".

**Plan review (`deep`):** a fresh subagent reads the plan for gaps, ambiguities, and rule conflicts before approval. Approve unless there are serious gaps. Read-only.

**Tasks** are tracer bullets — vertical slices — each with files, an acceptance criterion written before code, and a test strategy that is **not a free choice: test-first is the default**, and a task without a `Tests:` line means exactly that. A task deviates only for one of four reasons — `visual` (styling, layout, cascade; no branch), `glue` (wiring an already-tested unit into an existing call site; no new branch or condition), `infra` (config, manifest, or build file with no runtime branch), `no-harness` (`config.commands.test` is `null`) — written as `Tests: <reason> — <one line> · verified by <what>`, both halves mandatory. Any other value is a lint failure (decision 0022).

Plan size is an advisory lint (>250 lines: "check whether this is one mergeable unit"), never a criterion — a plan squeezed to fit loses the details the executor needs.

## 7. Quality of code

### 7.1 Execute

Task by task in the S2 main context: acceptance criterion → the test that pins it, run first and red (`Task N: test red`), unless the task carries one of the four exemptions of §6.2 → code → run the task's check → **commit per task** → `Task N: done (<hash>)`. The red phase is evidence, not a claim: `ledger.mjs` refuses `Task N: done` for a task with no `Task N: test red` before it unless `done` names the exemption (decision 0022). Commit messages are exemplary and project-aware: `init` detects the convention; a real one is followed, a degenerate one ("fix", two letters) is replaced by the engine default (conventional commits, imperative subject, "why" in body, no trailers).

Test proof is **mutation**: break the production line the test must pin; the test must go red; restore. Re-reading a test is not proof.

After all tasks: a **simplify pass** — the author walks its own diff against the defaults list (§7.2) and cuts. Cheap (same context), and it leaves the reviewer with defects rather than helpers. The walk is ordered by the ladder of §7.2 and stops at the first rung that holds, so the pass terminates instead of re-scanning the catalogue against every hunk. It emits to the transcript one line per cut — `L<line>: <tag> <what>. <replacement>.` over the tags `delete/stdlib/native/yagni/shrink`, prefixed with the file on a multi-file diff — and closes with `net: -<N> lines`, or `Lean already.` when nothing was cut. The ledger's line is `Simplify: done (<sha>, net -<n>)` either way: a pass that cut nothing makes no commit and records `net -0` against the head it examined. The transcript and the ledger are two channels, not two alternatives (decision 0034). The net count is reported, never optimized: a readable diff beats a short one, and the count carries no threshold and appears in no bench with a target attached to it (decision 0018).

A cut the pass declines because the simpler form is correct but bounded is recorded in the code, not in the chat: `hodos: <ceiling> — upgrade when <trigger>`, both halves mandatory. The marker is only for work that is complete and correct at the stated ceiling — unfinished work stays a `Gap:`, a known defect is a review finding — and it is the one artifact of a task that outlives the task directory (decision 0017).

### 7.2 The defaults list

What LLMs do without being told — this is the behavior-shaping content worth tokens. Lives in `skills/run/references/defaults.md` and in the reviewer prompt; project rules add their own. Each entry is written as the positive form.

The table is the catalogue; the **ladder** is the order the simplify pass consults it in, stopping at the first rung that holds:

1. Does this need to exist at all?
2. Is it already in this codebase? (precedent-first — the most common re-implementation is of a helper a few files over)
3. Does the standard library do it?
4. Does a native platform feature cover it?
5. Does an already-installed dependency solve it?
6. Can it be one line?
7. Only then: the minimum that works.

The ladder shortens the solution, never the reading. It runs after the change is understood, not instead of understanding it: the smallest change in the wrong place is a second defect, not a simplification. The same reasoning makes a bug fix a root-cause fix — one guard in the shared function every caller routes through is a smaller diff than one guard per caller, and it is the only one that leaves no sibling caller broken. Prior art: `DietrichGebert/ponytail` (MIT), decision 0018.

| Default | Positive form / mechanism |
|---|---|
| Framework anti-pattern the framework's own docs forbid (e.g. everything in `useEffect`) | Rule from init with source + precedent; reviewer checks |
| Everything in one file | New responsibility = new module; the plan's module field |
| Skips a cheap refactor that would improve the implementation | Plan field "refactor in scope"; reviewer: missed cheap refactor inside the boundary is `minor`, changes outside it are a finding |
| Violates project architecture/conventions | Rules with precedents; precedent-first; a rule violation is `major` |
| Guesses library APIs | External facts from sources; plan field; no source → plan not ready |
| Uses library versions from training data | Version from lockfile → docs for that version |
| Rationalizes around rules | Rules as recipes without nuance clauses; short red-flags table in the kernel; opt-in hook where checkable; `finish` proposes a hook on repeat violation |
| Helper/wrapper with one caller; abstraction without ≥2 consumers | A helper has ≥2 callers or is inlined |
| Comments that narrate the code | Comments only for a non-obvious business nuance |
| `try/catch` that swallows; `?? default` that hides a bug | An error is handled per a plan invariant or propagates |
| `any`/casts; weakened asserts to go green | Types are inferred or declared; mutation check |
| Re-implements a utility the project has | Precedent search is mandatory |
| Shims, flags, configs nobody asked for | Plan non-goals; YAGNI concretely |
| `data/utils/helper/manager/Enhanced*`; god functions | A name states the role; a function does one thing |
| New dependency instead of ten lines | A dependency is a decision |
| `TODO` instead of a decision; dead code | TODO → `Gap:` to chat; dead code dies in simplify; a deliberate cut with a known ceiling → a `hodos:` marker naming the ceiling and its trigger |

### 7.3 Review contract

One fresh `hodos-reviewer` (opus). Read-only on the tree; **runs** the project's tests, typecheck, and lint from `config.commands` — failures are findings. Review is static analysis plus automated checks; verify is behavior.

Input is a file produced by `scripts/review-package.mjs`: the plan's design section, the task list, and `git diff <base>..HEAD`. The orchestrator never reads the diff; it reads the verdict and the findings list.

The prompt states as fact, not role: the code was written by another agent; the implementer's report is testimony, not evidence; a stated rationale never lowers a finding's severity; inspect code outside the diff only for one named risk with one focused check; do not dispatch subagents.

Output — two sections that are never merged or re-ranked against each other: **Spec** (Missing / Extra / Misunderstood against the plan) and **Standards** (findings with severity `blocker/major/minor`, `file:line`, and the violated item: a rule, a plan field, or a concrete defect). A finding without `file:line` and an item is dropped; "would look cleaner" is not a finding. Coverage — what was not reviewed — is stated. ≤400 words per section.

Iteration 1 fixes blockers and majors (minors if cheap); iteration 2 is a scoped re-review of the fix diff; any verdict other than `ACCEPT` after iteration 2 → breaker.

### 7.4 Verify contract

Fresh `hodos-verifier` (sonnet). Input: the plan's acceptance criteria, `config.verify.recipes`, the browser adapter, and the profile whose layers the kernel raised before dispatching it. The environment is raised by `scripts/env.mjs` from the run session and never by the verifier: an agent that raises what it then grades has an interest in the result, and a process started inside an agent is orphaned when that agent ends (decision 0074).

**Iron law:** no completion claim without a verification command run in this message. Output is a table claim → command → evidence (output excerpt or `evidence/<n>.png`) → status. Every `Skip` carries a reason; a route dropped from the summary is a named failure.

Boundaries: the browser is for CSS variables, layout, cascade, animations, hover/focus, breakpoints — not for logic jsdom already covers; a logic bug found in the browser becomes a finding "+ cover with a test". Sampled mutation checks on new tests. Performance checks only when the plan declared them.

### 7.5 Finish

Report to chat: what was done; the simplify pass's `net:` line and any `hodos:` markers written during the task; `Gap:` lines; `Ruling:` lines; open minors; proposals — only where a finding traces to a missing convention, and then of the kind the two `Grep` counts earn (decision 0050): a **rule proposal** where the target shape has ≥2 precedents, a **convention proposal** where it has fewer than two but the flagged shape occurs ≥2 times — a target the code contradicts, so the developer decides it rather than confirms it — and neither where both counts are under two (→ an observation in the report and in `plan.md#Outcome`, decision 0049); a hook proposal on a repeated rule violation. `review.md`/`verify.md` fold into `plan.md#Outcome` and are deleted; the task directory is deleted on confirmation. If the task is a campaign node: the node line → `done` + sha, and the done-metric is re-measured. The branch stays; push and merge never happen.

## 8. Init

`/hodos:init` learns the project once, with the human approving every write.

**Three sources of rule candidates:** (1) code precedents — the project already does X in ≥2 places; (2) best practices for the detected stack from `sources/`, fetched at init; (3) the developer's observations — "what does Claude get wrong here?". A precedent count is evidence that a convention exists, never that it is worth keeping: a project can arrive with the same mistake in twenty files, and a rule proposing the target instead is prescriptive and needs the developer's decision (decision 0050).

**Filter — three questions, each with evidence:** (a) What evidence does the rule carry? → **descriptive**, ≥2 precedents cited; **prescriptive**, fewer than two precedents plus the developer's explicit decision that this is the target, the old shape counted in a `## Migration` section; both shapes present → a drift decision (`AUTHORING.md §10`, decision 0050). Frequency is not endorsement: a count says a convention exists, not that it is worth keeping. (b) Would the model do it without a rule? → checked against the defaults list and the developer's answer. (c) Is it mechanically checkable? → propose a hook or lint instead of prose. A rule cites its source; `finish` later confirms it by findings or nominates it for deletion.

**Steps:** 0 inventory (git, manifests, lockfiles, CI, test/lint configs, workspaces, existing AI instructions, `.mcp.json`) → 1 scan by area with Explore subagents (stack & commands · architecture · conventions · tests · existing instructions), facts with `path:line` → 2 best-practice pull → 3 interview: recall questions in batches ≤8, never asking what the scan answered; how to run the app for verify; what not to touch; tracker/branch/commit conventions; artifact language → 4 **report before write**: CLAUDE.md map, rules (text, `paths`, precedent, source, three-question justification, the `keep`/`target` judgement, form), config, the **migration ledger** for existing instructions (`retain / rewrite / relocate / automate / delete`, each with evidence and "what is lost"), opt-in hooks, adapters → 5 batch approval, contested rules one at a time ("why not the default / exceptions / common mistake") → 6 write → 7 self-check: `config.mjs check` on the config just written, then lint, then run the recipe commands once and record `verifiedAt` → 8 retire old instructions per the ledger, on approval.

Existing `CLAUDE.md` is never rewritten: hodos adds a managed block between markers and proposes trims through the ledger. Rules go to `.claude/rules/` with `paths:`. Monorepos get a root config plus nested `.claude/` per subproject. `--refresh` re-verifies precedents, detects drift, and scans new areas since the recorded SHA.

## 9. Campaigns

Work that is bigger than one mergeable unit, longer than one developer-session, or shared by a team.

**Node = one mergeable unit** (branch/MR). A node swallows plan → execute → review → verify whole; the map knows nothing about phases, so a map above a task never lengthens the chain.

**Creation:** the router says "campaign" → campaign-level grilling: goal, done-metrics as runnable commands with expected numbers, architecture direction as decisions `D1..Dn` binding for every node, decomposition into nodes (tracer bullets, or expand–contract for wide refactors), the fog list → the map is written → the first frontier node becomes a task with `campaign: <slug>/<node>`.

**Map** (format in `FORMATS.md`): header (goal, done-metrics with current values, owners, tracker link) · decisions · nodes, one line each: `- [status] name — gist · deps: <v> · owner: <v> · branch: <v> · ref: <v> · metric: <v>` (grammar in `FORMATS.md §11`) · waits (what we are waiting for, from whom).

**Statuses:** `fog · ready · blocked · active · review · done · dropped`. Decision nodes and research nodes are resolved by a grilling or research session and produce a `D` entry, not code.

**Invariants:** the map is an index, not a store — details live in task artifacts and MRs; retelling is two sources of truth. One node per session (research/decision excepted). Campaign decisions change only through the map, never silently inside a node. An empty frontier is not "done": name the wait and its owner, and propose one of *nudge the external party / pull a node out of the fog / declare it out of scope*. Fog is not cut into nodes in advance — the test is whether the question can be stated precisely now, not whether it can be answered.

**Multiple developers:** a claim is `[active] … @owner` committed on the node's branch; races are resolved socially in v1; `status` shows claims from known branches. A tracker adapter (assignment as claim) is post-v1.

**Multiple repositories:** the map lives in the home repo; a node carries `repo:` and `path:`. Map lookup: current project → upward to the git root (a session in `spa/` sees the monorepo root's maps) → `config.campaigns.external[]`. `finish` in a foreign repo edits the home map and asks the human to commit it; auto-commit is opt-in. Done-metrics carry `repo:`.

**Close:** all nodes done/dropped, metrics met, human confirms → `status: done`; the file stays for the team; deletion is manual.

## 10. Hooks

Every hook: first line looks for `config.json` upward to the git root, exits 0 if absent · fails open · header names the incident · exec form with `${CLAUDE_PLUGIN_ROOT}` · Node `.mjs`.

| Event | Behavior | Mode |
|---|---|---|
| `SessionStart` startup/resume/clear | State digest ≤300 tokens: active tasks (slug, phase, last ledger line), stale tasks, campaign frontier counts, `verifiedAt`, and at most **one** offer line when a script-decidable precondition holds (`FORMATS.md §12`). Phrased as state, not instruction | advisory, always |
| `SessionStart` compact | Ledger path of the active task + "continue from the first open line" | advisory, always |
| `PreCompact` | `Compact: session compacted` appended to the active task's ledger (timestamp added by the script) | always |
| `PostToolUse` Write\|Edit on `.claude/**/*.md`, `SKILL.md` | Lint: frontmatter parses (catches the silent `BLOCK_AS_IMPLICIT_KEY` death of a skill), size caps, citations resolve | advisory |
| `PreToolUse` Bash | Deny `push --force`, `--no-verify`, `reset --hard`, `rm -rf` outside `.claude/hodos/tasks/`; deny `git commit` while `state.phase` is `fix`. Command is split on `&&`/`;`/`\|`/`\|\|`, `VAR=` prefixes stripped, first word must be `git` or `rm` — never substring matching | **opt-in**, off |
| `Stop` | S2 with an open ledger → block with the exact remaining item | **opt-in**, off |
| `UserPromptSubmit` | nothing — it costs every turn | — |

Project-specific hooks (formatters, save-time lint) are not the engine's; `init` may propose them and writes to `.claude/settings.json` only on approval.

## 11. Context and tokens

**Caps** — the normative table is `AUTHORING.md §7`, enforced by `lint.mjs`. In short: kernel ≤150 lines · phase reference ≤200 · agent prompt ≤150 · rule ≤100 · CLAUDE.md map ≤60 · skill `description` ≤500 chars · SessionStart digest ≤300 tokens · research subagent answer ≤1.5k tokens · review ≤400 words per section.

**By construction:** the diff never enters the main context; subagent outputs are files, the context gets the verdict; nothing in the skill listing; research returns file lists, not retellings; one reviewer; tiered models; three skill descriptions in the listing rather than eleven — the assistive capabilities of decision **0081** enter through the router, the phases and one conditional digest line, so eleven commands still cost three descriptions; the ledger plus `SessionStart(compact)` make auto-compaction safe (a skill cannot invoke `/compact`; the design assumes auto-compaction will happen).

**Measured frugality — acceptance criterion for v1 (T-1), reported as two numbers** (decision 0045). The **multiplier**: on the pilot project, 5 `quick` and 5 `standard` tasks with and without hodos; starting thresholds `quick` ≤1.3× bare Claude, `standard` ≤2×. And the **findings caught before human review**: blockers and majors from `review.md`, failed claims from `verify.md`. The multiplier alone compares a run that reviews, verifies and mutation-checks against one that does none of it, so it is a ratio between unequal things and rejecting a system on it is Goodhart; the second number is what the first is paid for.

The multiplier is not measured by hand once at the pilot. `scripts/usage.mjs` sums the token usage of a task's sessions from their transcripts — free, no model call — `ledger.mjs` writes it into `history.jsonl` on `Finish`, and `status --cost` reads it. Token counts only: the price of a token is not in the transcript, and one bad number discredits the rest of the report. The pilot corrects the thresholds; without the measurement "frugal" is belief.

## 12. Plugin quality

`scripts/lint.mjs` (zero-dep; the same script runs in the PostToolUse hook and in CI): strict YAML subset for frontmatter (anything outside the subset is a warning, never a silent failure); the caps in §11; references one level deep and every reference cited by a kernel (no sediment); agents prefixed `hodos-`; `file:line` citations resolve — in the engine and, via `status`/`init`, in the project's `.claude/rules`. Plus `claude plugin validate --strict` in CI.

**Bench** (`bench/`; manual/nightly, it costs tokens): router — 30 labeled task descriptions → path/type accuracy; reviewer — seeded-defect patches over a fixture → recall/precision; no-op tests for contested lines. `bench/fixtures/`: a small React+TS front end and a Node back end with conventions and tests. (The directory is not named `evals/` to stay clear of the platform's own `claude plugin eval` layout.)

**Pilot:** `ariadne_v2` (a Rust workspace, ~60k lines, with an existing `.claude/` to migrate and one MCP server — decision 0021). **Dogfooding** from v0.2. **PR policy:** wording changes to skills or rules require evidence (an eval or a reproducible scenario); lint must be green — the only defense against corpus bloat (superpowers, CE, BMAD all fight their own). Releases: semver, CHANGELOG, tag → `marketplace.json` → `claude plugin update`. The name never changes.

## 13. Numbers (hypotheses, corrected by the pilot)

250 plan lines (advisory) · 3 attempts on a red check · 2 + 2 iterations · `staleDays` 14 · 1.3× / 2×, reported beside the findings caught before human review (§11) · ≤5 router evidence calls · ≤8 interview questions per batch · `quick` criteria (§4.1).

## 14. Glossary — leading words

Use these tokens consistently; they recruit the concept without a sentence.

- **path** — `quick / standard / deep`; **ratchet** — path moves up only.
- **frontier** — decisions whose prerequisites are settled (grilling); nodes whose deps are done (campaign).
- **fog** — work visible but not yet formulable.
- **node** — one mergeable unit in a campaign.
- **ledger** — append-only task history; the orchestrator's memory.
- **ruling** — a local decision the agent made and recorded. **gap** — a decision the plan should have made.
- **breaker** — the loop cap that hands the decision to the human.
- **red loop** — a command that fails on this bug.
- **tracer bullet** — a vertical slice that works end to end.
- **precedent** — how the project already does it, by `file:line`.
- **evidence** — a fresh command output, a screenshot, a citation. Testimony is not evidence.
- **adapter** — role → tools. **source** — a pointer to authoritative material.
- **kernel** — a ≤150-line skill that owns a session; **reference** — a phase procedure read on entry.
