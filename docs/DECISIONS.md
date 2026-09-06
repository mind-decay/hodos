# Decisions

Append-only. The design phase decisions are in `00-decisions.md` (Russian, approved 2026-08-30) and are binding; `DESIGN.md` is their English normative form. New decisions are recorded here.

## Process

1. A builder who needs a design change (a new field, cap, phase, file, threshold, dependency, or a deviation from a component contract) writes a *Proposed* entry: context, options with cons, recommendation, what it costs if wrong.
2. The builder asks the user with the same options and recommendation and waits.
3. The user's choice is recorded as *Taken* with the date; `DESIGN.md` / `COMPONENTS.md` / `FORMATS.md` are updated in the same commit.
4. Nothing is implemented from a *Proposed* entry.
5. A *Proposed* entry names the stage it lands in, and is settled at that stage's Start (`STAGE-PROTOCOL.md §1`) — not whenever it is convenient. A stage that needs an unsettled proposal is blocked, not free to choose.

## Taken

### 0001 — Adopt the approved design log (2026-08-30)
`00-decisions.md` sections 0–20 are binding (section 20 is the process, superseded by this file's process). `DESIGN.md`, `COMPONENTS.md`, `FORMATS.md`, `AUTHORING.md`, `BUILD-PLAN.md` are its normative English form; on conflict, `DESIGN.md` wins and the conflict is recorded here.

### 0002 — Campaign creation runs inline in `task` (2026-08-30) — superseded by 0016
Because a user-invoked skill cannot be invoked via the Skill tool (`PLATFORM-NOTES.md` fact 1, check H), the campaign verdict in `task` reads `skills/campaign/references/map.md` and performs the campaign procedure inline; `/hodos:campaign` remains the standalone command for creating or advancing a campaign directly. `COMPONENTS.md §1.1 step 3` is read with this decision.

### 0003 — Config normalization against the Russian log (2026-08-30)
`verify.browser` removed (the browser is selected by `adapters.browser`); `models.triage` removed (the reviewer runs its own confidence pass; a cheap triage model is post-v1 if bench precision demands it); `models.plan`/`models.execute` removed (the main session's model cannot be set per skill); `models.planReview` and `models.initScan` added; `scanSha` added for `--refresh`. `FORMATS.md §2` is normative.

### 0004 — Active-task file and ledger CLI (2026-08-30)
`.claude/hodos/active` names the task a session works on; `ledger.mjs add` acts on it by default (`--slug` overrides), so hooks need no arguments. The CLI form and the stored form of each ledger line are the table in `FORMATS.md §6`; `state.phase` is derived exactly by that table.

### 0005 — Bench directory (2026-08-30)
The evaluation assets live in `bench/`, not `evals/`, to avoid the platform's `claude plugin eval` layout (`evals/**/case.yaml`).

### 0006 — `git-guard.mjs` also guards `rm` (2026-08-30)
The first word of a command segment must be `git` or `rm` to be considered by the guard; `rm -rf` is denied unless every path resolves under `.claude/hodos/tasks/`. `DESIGN.md §10` updated.

### 0007 — Breaker on any non-ACCEPT (2026-08-30)
After the second review iteration any verdict other than `ACCEPT` (and after the second verify iteration any `FAIL`) reaches the breaker. The loop bound of two is binding; severity does not extend it.

### 0008 — `history.jsonl` (2026-08-30)
`ledger.mjs` appends one JSON line per finished task to `.claude/hodos/history.jsonl` (gitignored) so `status` can compute the upgrade rate and other rates after task directories are deleted.

### 0009 — Brief checklist row 6 is "needs more than one mergeable unit" (2026-08-30)
Its healthy value is `no`, so the campaign rule "any `yes`/`unknown` on rows 6–9" reads correctly. Verdict rules are ordered, first match wins (`FORMATS.md §3`).

### 0010 — Script permissions via project `permissions.allow`, not `enabledPlugins` (2026-08-30)
A skill's `allowed-tools` covers only the invoking turn, so `init` writes `permissions.allow: ["Bash(node <plugin root>/scripts/*)"]` into `.claude/settings.json` on approval. `init` no longer writes `enabledPlugins` (the plugin id is not reliably known at runtime); team enablement is documented in the README.

### 0011 — Stop-gate counter file (2026-08-30)
`stop-gate.mjs` keeps its consecutive-block count in `tasks/<slug>/stop-count`, its own file; `state.json` stays derived from the ledger only.

### 0012 — Fixture copies are git repositories; `mono` and `kit` fixtures (2026-08-30)
`bench/scripts/fixture-copy.mjs` copies a fixture to a temp dir, `git init`s it and seeds three conventional commits. `bench/fixtures/mono/` (two workspaces) and `bench/fixtures/kit/` (second repository) are added for the monorepo and cross-repo criteria.

### 0013 — The user runs interactive acceptance steps (2026-08-30)
Criteria needing an interactive session are executed by the user from `docs/stages/NN-manual.md` written by the builder; the pasted excerpts are evidence labeled `manual`. Headless `claude -p` serves the bench only.

### 0014 — `state.branch` from `--branch`; `tasks.current` is the next task (2026-08-30)
`Plan: approved` carries `--branch`; `tasks.current` is defined as the task to execute next, with the rollback rule in `FORMATS.md §7`.

### 0015 — Behavioral-risk axis in review (2026-08-30)

**Context.** A `review.md` finding (`FORMATS.md §9`) was `Sev | Location | Item | Finding | Fix`, where `Item` cites a project rule, a lint result, or the defaults list. `COMPONENTS.md §2.1` scoped the Standards section to project rules, the plan's design fields, and `defaults.md` — all conventions and architecture. Behavioral defects (aliasing, mutation during iteration, an early return that skips required work, a callee-contract assumption, a race, an unbalanced acquire/release) had neither procedure nor vocabulary. `defaults.md` answers "what does an LLM write by default"; nothing answered "what does an LLM fail to see". The two axes are orthogonal.

**Prior art.** `hyhmrright/logic-lens` — logic-first review by semi-formal execution tracing. Finding shape Premises → Trace → Divergence → **Trigger** → Remedy; risk taxonomy L1–L9 (L1–L6 from Ugare & Chandra 2026, *Agentic Code Reasoning*; L7–L9 for concurrency, resource lifecycle, time/locale). Its published 78.3% against a 53.9% baseline on a 36-case subset is its own bench and its own scorer — taken as a direction, not as a number. The plugin itself is not adopted: six model-invocable skills and review in the main context contradict §11 frugality and Principle 2.

**Taken — all three parts.**
1. `FORMATS.md §9` gains a `Trigger` column: the concrete input or state under which the finding manifests. Mandatory for a behavioral finding at `blocker`/`major`, `—` for a convention finding whose instance is the location itself. This makes the reviewer's confidence pass checkable — a finding whose trigger cannot be named is dropped. Principle 3 applied to review output.
2. `agents/hodos-reviewer.md` carries a nine-row behavioral checklist, run over the diff after the convention pass. About 15 lines against the 150-line cap.
3. `bench/review/seeded/` carries behavioral defects (≥6 across distinct `L` codes) beside the convention ones, and Stage 6 reports recall per kind with ≥80% required for each. An axis added to the prompt and not to the bench is unmeasured.

**Cost if wrong.** The `Trigger` column pushes the reviewer toward invention on findings that are real but hard to trigger; visible as a precision drop on the Stage 6 bench, reversible by making the column advisory.
**Applied in.** `FORMATS.md §9` · `COMPONENTS.md §2.1` · `BUILD-PLAN.md` Stage 6 · `BACKLOG.md` (logic-lens bench cases as a source for the behavioral patches).

### 0016 — Skills invoke skills; inline procedures are forbidden (2026-08-30)

**Context.** The design had two inline edges, both caused by `PLATFORM-NOTES.md` fact 1 (a skill with `disable-model-invocation: true` cannot be invoked by the model or by another skill) combined with D2, which put that flag on all eight skills: decision 0002 had `task` read `skills/campaign/references/map.md` and run the campaign procedure inline, and `COMPONENTS.md §1.4` had `campaign` run the `task` procedure inline to start a node. Inline duplicates the invocation contract at the call site, the copy drifts from the callee, and there is no single source of truth for how a phase runs.

**The user's decision, in their terms:** a step the model cannot invoke is a step the human must type, and the pipeline stalls there. Cognitive load on the developer is the cost being removed. The rule that follows is therefore not a list of exceptions but a criterion:

> **A skill that another skill invokes is model-invocable. No skill reproduces another skill's procedure inline.**

**Derived set.** Model-invocable: `task` (called by `campaign` to start a node), `campaign` (called by `task` on a campaign verdict), `rule` (called by the finish phase for an accepted rule proposal). Gated: `run` — model invocation would run S2 inside S1's context and destroy the fresh-context guarantee of Principle 2; `init` — it rewrites the project's instruction files, config and settings, and must not fire on the model's initiative; `status`, `skill`, `wait-what` — no caller, so a listing entry buys nothing.

**Re-entry.** `task` → `campaign` → `task` terminates because `task` invoked as `<campaign>/<node>` skips the campaign-verdict step; that guard is part of `COMPONENTS.md §1.1 step 3`.

**What this does not change.** The mandatory stops of `DESIGN.md §4.4` — router verdict, plan approval, an unsettled fork, the breaker, destructive or outward actions — are `AskUserQuestion` calls inside a procedure and are unrelated to skill invocation. The S1 → S2 seam also stays: it needs `/clear`, which is a human action, and a fresh S2 context is the point.

**Platform dependency.** Fact 1 states only the negative, for gated skills. That a model-invocable plugin skill can be invoked from another skill's body through the Skill tool is unverified, and this decision rests on it. Check H is re-scoped to confirm the positive and moved from Stage 9 to **Stage 0** — two throwaway skills, before anything depends on it. Fallback if it fails: a printed handoff line on both edges (`/hodos:campaign <slug>`, `/hodos:task <campaign>/<node>`), never an inline copy.

**Cost.** Three descriptions in the model's listing instead of zero, against the ~1% shared budget of fact 16; §11 records three rather than eight. The model may open a task on its own reading of a request — the `description` of each of the three names its caller and states that it is not to be invoked on the model's own initiative, which is advisory, not enforced. A spurious `campaign` invocation costs a map-grilling session the developer did not ask for; recoverable and visible in the ledger.
**Applied in.** `DESIGN.md` §1, §2 (Principle 9), §3.1, §4.1, §4.2, §11 · `COMPONENTS.md` §0, §1, §1.1, §1.2, §1.4, §1.6 · `AUTHORING.md §8` · `PLATFORM-NOTES.md` fact 1 and check H · `BUILD-PLAN.md` Stage 0 and Stage 9 · supersedes 0002.

### 0017 — A marker for deliberate simplifications with a known ceiling (2026-08-31)

**Context.** `DESIGN.md §7.1` ends execute with a simplify pass that *cuts*; `§7.2` sends a `TODO` to chat as a `Gap:` line; `§7.5` reports `Gap:` lines at finish. Nothing recorded the third case: a simplification that is deliberate, correct for the current load, and has a named ceiling — a global lock instead of per-account locks, an O(n^2) scan over a list that is small today, a naive heuristic where the real model is not yet justified. `FORMATS.md §6` does have a `Gap:` ledger line, but `§7.5` deletes the task directory on confirmation and only the summary line reaches `history.jsonl`, so the ceiling and its upgrade trigger survived nowhere in the repository. The next task re-derived the ceiling from scratch, or did not notice it.

**Prior art.** `DietrichGebert/ponytail` (MIT, v4.9.0) marks such a cut in the code with `ponytail: <ceiling>, <upgrade path>` and harvests them with `grep -rnE '(#|//) ?ponytail:' .` into a ledger (`skills/ponytail-debt/SKILL.md`), tagging any marker that names no trigger as `no-trigger` — "those are the ones that silently rot". The comment prefix keeps prose that merely mentions the convention out of the ledger.

**Taken — marker plus harvest.** The simplify pass, and only it, writes `hodos: <ceiling> — upgrade when <trigger>` into the code; both halves are mandatory. `status --debt` harvests them: grep, read-only, one row per marker grouped by file, any marker without a trigger tagged `no-trigger`, closing with a count. The marker is the only artifact of a task that survives task-directory deletion, and the trigger half is what makes it checkable.

**The fence.** A `hodos:` marker is a laundered `TODO` unless it is fenced, so it is permitted only for a simplification that is *complete and correct at the stated ceiling*. Unfinished work stays a `Gap:`; a known defect is a review finding. Without the fence the markers accumulate as deferred work under a nicer name and `§7.2`'s anti-`TODO` row is defeated by the engine itself.

**Cost if wrong.** Visible as markers with no trigger in the first `--debt` run on a real project (Stage 12), and as markers describing incomplete work rather than a ceiling. Reversible: the convention is a paragraph in `defaults.md` plus a grep, and removing it removes both.
**Applied in.** `DESIGN.md §7.1`, `§7.2` (last row), `§7.5` · `COMPONENTS.md §1.2` (`execute.md`, `defaults.md`), `§1.5` · `BUILD-PLAN.md` Stage 5, Stage 8.

### 0018 — The simplify pass gets an ordered ladder, an output format, and a net-lines line (2026-08-31)

**Context.** `DESIGN.md §7.1` said the simplify pass "walks its own diff against the defaults list and cuts". `§7.2` was a flat 17-row table with no ordering, `COMPONENTS.md §1.2` gave `defaults.md` a ≤80-line target, and neither stated what the pass *emits*. Three consequences: no stop rule, so every row was considered against every hunk; no way to tell a pass that ran from one that was claimed; and `FORMATS.md §6`'s `Simplify: done (<sha>)` as the only evidence — a sha, which proves a commit happened, not that anything was examined.

**Prior art.** `DietrichGebert/ponytail` (MIT) states its rules as an ordered ladder with a first-match stop: does this need to exist at all → is it already in this codebase → does the standard library do it → does a native platform feature cover it → does an already-installed dependency solve it → can it be one line → only then the minimum that works. Two framings from it are load-bearing and were not in `§7.2`: the ladder runs *after* the problem is understood, not instead of it ("the smallest change in the wrong place isn't lazy, it's a second bug"), and a bug fix is the root cause because that is also the smaller diff — one guard in the shared function beats one per caller. Its `ponytail-review` skill emits one line per finding, `L<line>: <tag> <what>. <replacement>.` over the tags `delete/stdlib/native/yagni/shrink`, and closes with `net: -<N> lines possible.` or `Lean already. Ship.`

**Taken — all three parts.**
1. The ladder becomes the *ordering* of the simplify pass, stopping at the first rung that holds; the 17 defaults stay as the catalogue the ladder consults. `defaults.md`'s target rises from ≤80 to ≤100 lines (lint's phase-reference cap of 200 is untouched).
2. The pass emits one line per cut in the tag form above and closes with `net: -<N> lines`, or `Lean already.` when nothing was cut.
3. `FORMATS.md §6` gains `--net <n>`: `Simplify: done (<sha>, net -<n>)`. The count is in the ledger, where resume and the finish report already read.

**The risk named.** `net: -N lines` is a golfable metric. hodos values a readable diff, not a short one, and `§7.2` already forbids clever-over-boring, so the line is descriptive output, carries no threshold, and appears in no bench with a target attached to it.

**Cost if wrong.** The pass over-cuts and the reviewer's Spec section starts reporting Missing items after simplify — measurable on the Stage 6 bench as a rise in spec findings on tasks that passed their checks before the pass. Reversible by dropping the net line and demoting the ladder to advisory.
**Applied in.** `DESIGN.md §7.1`, `§7.2` (ladder preamble) · `COMPONENTS.md §1.2` (`execute.md`, `defaults.md`) · `FORMATS.md §6` · `BUILD-PLAN.md` Stage 5.

### 0019 — Bench: gates separated from measurements, and a control arm for `noop/` (2026-08-31)

**Context.** `COMPONENTS.md §7` gave `router/` and `review/` numeric thresholds and gave `noop/` none: "No threshold; the output is evidence for the PR policy in `AUTHORING.md §13`". Two gaps followed. Every bench number was the same kind of thing — a score with a threshold — so a run could not distinguish "this must not regress" from "record this and look at it". And `noop/run.mjs` ran a fixture prompt with and without a line and "reports whether the behavior differed", which is a judgement made by whoever reads the report: a line that changes nothing and a line whose effect the reader failed to see produced the same output.

**Prior art.** `DietrichGebert/ponytail` (MIT) splits its metrics explicitly: `loc.js` is a *measurement* that always passes and only records, `correctness.js` is a *gate* that fails when the generated code does not run — "a broken one-liner that scores great on LOC will fail on correctness". Its `benchmarks/behavior.yaml` adds a control: probes run against a baseline arm with no skill and against the skill arm, and the baseline arm is *expected to fail* them — "that delta is the point". Its grader is proven by tests that need no API key, separately from the graded run that does. Its README also states plainly which of its own numbers overstate the effect, and why.

**Taken — the structure now, every number at Stage 11.** `COMPONENTS.md §7` labels each bench metric `gate` or `measurement`. `noop/` becomes a gate with a control arm: each scenario declares the behavior the line should change as a checkable direction, the run scores a with-line and a without-line arm, and a scenario passes only when the arms differ in that direction — the without-line arm is expected to fail, and that delta is the signal. Its scorer is covered by `node:test` tests that make no model call, separately from the scored run that does. Thresholds are set in Stage 11 from the first real run: inventing them ten stages ahead of any data would produce exactly the kind of number `DESIGN.md §13` already marks as a hypothesis.

**Cost if wrong.** The control arm turns out non-deterministic enough that scenarios flap and the bench reports sampling noise as failures. Visible on the first Stage 11 run; reversible by returning `noop/` to an unscored report, which is the text this decision replaces.
**Applied in.** `COMPONENTS.md §7` · `BUILD-PLAN.md` Stage 11.

### 0020 — `SubagentStart`: record the check, ship no hook (2026-08-31)

**Context.** `PLATFORM-NOTES.md` fact 11 states that a non-fork subagent receives no conversation history, so everything `hodos-reviewer` and `hodos-verifier` need must be placed in their input. `research/02-anthropic-docs.md:249` lists `SubagentStart` among the hook events, but `COMPONENTS.md §4` does not use it and `PLATFORM-NOTES.md` carried no fact or open check for it.

**Prior art.** `DietrichGebert/ponytail` (MIT, v4.9.0) ships a `SubagentStart` entry in its production `hooks/claude-codex-hooks.json`, invoking `hooks/ponytail-subagent.js` to re-inject its ruleset into every subagent — evidence that the event fires for a plugin-shipped hook, though not verification by us. The same file uses the string form for its hook commands rather than the exec form `COMPONENTS.md §4` mandates, and carries `statusMessage`; both work in a shipped plugin.

**Taken — an open check, no hook.** `PLATFORM-NOTES.md` gains check L, scheduled at Stage 6, and the answer is recorded whether or not anything uses it. No hook is added by it either way. hodos's own agents already receive their full input by file — the reviewer reads the package `scripts/review-package.mjs` builds, the verifier reads the plan's acceptance criteria and `config.verify.recipes` — so the hook would buy them nothing while firing for *every* subagent in a hodos project, prepending the state digest to a developer's own `Explore` agent: context nobody asked for and tokens `DESIGN.md §11` counts. The event is still worth a recorded fact, because it is the only mechanism that could carry project rules into a subagent if a later stage needs one. Fact 10 is amended in the same pass: the exec form is a house rule, not a platform constraint.

**Cost if wrong.** Zero: nothing is built. If the check comes back positive and a later stage wants injection, that is a new decision with the fact already on file.
**Applied in.** `PLATFORM-NOTES.md` fact 10, check L · `BUILD-PLAN.md` Stage 6.

### 0021 — The pilot project is `ariadne_v2`, not the monorepo the design log named (2026-08-31)

**Context.** `00-decisions.md` §T-1 and §P-3 named an internal monorepo as the pilot — a React+TS SPA inside a .NET monorepo, one of the prior attempts hodos is a reaction to. `DESIGN.md §12` and `BUILD-PLAN.md` Stage 12 carried that name.

**The user's decision.** The pilot is `~/Documents/Projects/ariadne_v2`: a Rust workspace, 366 `.rs` files / ~60k lines outside `target/`, with an existing `.claude/` (three hook shell scripts, `settings.json`, `skills/`, and fourteen plan directories under `.claude/plans/`), a `CLAUDE.md`, a `.mcp.json` declaring one server (`ariadne`), and no `.cursor/` or `AGENTS.md`.

**What changes with it.**
- **Stack.** The pilot is no longer the stack `bench/fixtures/` mirrors (React+TS front end, Node back end). That is a gain, not a mismatch to fix: `init` and the router are stack-agnostic by design (`DESIGN.md §2`), and a pilot on a language no fixture covers is the first real test of that claim. The fixtures stay as they are.
- **Migration ledger.** `.claude/plans/` (fourteen directories of a superseded spec lifecycle, one of them with an `audit/`) is a harder migration case than that monorepo's, and exactly the artifact-GC failure `research/01` records. `.cursor/` is absent, so that half of the ledger goes untested at Stage 12 and stays a fixture case.
- **Adapters.** Only `codeIndex/ariadne` is present. `browser/chrome-devtools`, `design/figma` and `tracker/youtrack` have no server there, so Stage 12 exercises the explicit `Skip` path (`00-decisions.md` I-5) rather than the adapter path for three of the four roles. The starter adapter set is unchanged.
- **T-1 unchanged.** 5 `quick` + 5 `standard` with and without hodos, `/cost` per task, `quick` ≤1.3× / `standard` ≤2×. The numbers were always hypotheses to be corrected by whichever project ran the pilot.
- **Dogfooding (P-3) unchanged** — from v0.2, on this repository.

**The risk to name.** ariadne_v2 is the user's own prior attempt at this problem and its `.claude/` encodes a competing workflow. Two failure modes follow: `init` writing rules that describe the old system rather than the code, and the pilot's tasks being workflow work rather than ordinary feature work, which would not measure what T-1 measures. Stage 12 therefore picks its 5+5 tasks from the Rust code, not from `.claude/`, and every rule `init` writes must cite a `file:line` precedent in `.rs` source.

**Cost if wrong.** The pilot measures a Rust project and the numbers do not transfer to the front-end work hodos was designed around. Visible at Stage 12 as router or reviewer behavior that depends on the language; recoverable by running the 5+5 again on a front-end repository before 0.2 is tagged, since nothing but the project name changes in the procedure.
**Applied in.** `DESIGN.md §12` · `BUILD-PLAN.md` Progress line and Stage 12 · supersedes the pilot half of `00-decisions.md` T-1 and P-3.

### 0022 — Test-first is the default for every task (2026-08-31)

**Context.** `DESIGN.md §6.3` made the test strategy a per-task field chosen by the planner — "test-first for logic; test-after or browser verify for UI glue" — and `COMPONENTS.md §1.2` gated the red phase on it: "write the acceptance check first **if the plan says test-first**". So the only hard invariant was *mutation* (`§7.1`): a test must be proven to pin a production line. Nothing forced a test to exist before the code, and nothing recorded that one ever went red. `test-after` cost nothing to choose and produces the failure `research/01` documents — a test written against code that is already green, pinning the implementation rather than the acceptance criterion.

**The user's decision.** TDD is the default for any code the system writes.

**Taken — four parts.**
1. **Default with a closed exemption list.** Test-first needs no line in the plan; it is what a task without a `Tests:` line means. A task deviates only as `Tests: <reason> — <one line> · verified by <what>`, `<reason>` one of four: `visual` (styling, layout, cascade — no branch), `glue` (wiring an already-tested unit into an existing call site — no new branch or condition), `infra` (config, manifest, or build file with no runtime branch), `no-harness` (`config.commands.test` is `null`). Both halves are mandatory; any other value is a lint failure. The closed list is the load-bearing part — an open reason field is the design this replaces.
2. **The red phase is evidence, not a claim.** `Task <n>: test red` goes in the ledger before the implementation commit, and `ledger.mjs` refuses `Task <n>: done` without it unless `done` carries `--tests <reason>` from the same list, stored as `Task <n>: done (<sha>, tests: <reason>)`. The ledger stays self-contained — it does not parse `plan.md` (decision 0011's principle) — so the exemption is asserted twice and the reviewer compares the two.
3. **The reviewer checks the exemption.** Its Spec section gains one row: an exemption whose stated reason does not hold on the diff is a `major`.
4. **Scope includes hodos's own build.** Every `scripts/*.mjs` change is written test-first and the red run before the implementation is part of the stage report. The rule is proven on this repository before it reaches the pilot.

**The risk named.** `Task <n>: test red` is a line a model can write without running anything, and `--tests glue` is cheaper to type than a test. Neither weakens the proof that already exists: the **mutation check** (`§7.1`) is what establishes a test pins a production line, and it is unchanged. This decision adds a floor — a test exists and failed first — not a replacement for that ceiling.

**Cost if wrong.** The exemption list is too narrow and planners file `glue` for tasks that deserve a test, visible as review findings on untested branches; or too wide and the default erodes. Both surface on the Stage 6 bench and are reversible by editing one list. If the ledger refusal proves obstructive in practice, dropping it leaves parts 1, 3 and 4 standing.
**Applied in.** `DESIGN.md §6.2`, `§7.1` · `COMPONENTS.md §1.1` (`references/plan.md`), `§1.2` (`execute.md`), `§2.1` · `FORMATS.md §5`, `§6` · `scripts/ledger.mjs` + tests, `scripts/lint.mjs` + tests · `BUILD-PLAN.md` working agreement, Stages 1, 4, 5 · `CLAUDE.md`.


### 0023 — A rollback breaker restarts the review and verify counters (2026-08-31)

**Context.** `FORMATS.md §7` writes the rollback clause for one field only: "`tasks.done` counts `Task n: done` lines after the most recent `Breaker: … rollback`". `review.iteration` and `verify.iteration` are defined as "count their events", with no rollback clause, so they survive it. Found by the Stage 1 review 2 (`docs/stages/01-review-2.md`, minor 1) and reproduced live: `Review 1: NEEDS_WORK` → `Fix 1` → `Review 2: NEEDS_WORK` → `Breaker: review — rollback T1` → the work rebuilt → the next review reads `iteration: 3`. The loop bound of `DESIGN.md §4.5` is two, so the first review of the rolled-back work is already past it and the breaker fires again immediately. The code is spec-literal; the gap is in the specification.

**Taken — the counters restart, like `tasks.done`.** Both increments move below the "events after the rollback" guard in `deriveState`, and `FORMATS.md §7` states the clause for all three fields; `verdict` is `null` until the first review of the rebuilt work. A rollback is the human choosing to rebuild from `T<n>`, so what the reviewer sees next is new code, and judging new code against a spent budget makes the chosen remedy a dead end. Capping total attention per task rather than per attempt was the alternative, and that cap already exists in the breaker itself.

**Cost if wrong.** A task can cycle rollback → two reviews → rollback without ever reaching the breaker's `manual` or `accept`, spending review budget the frugality of `DESIGN.md §11` counts. Visible as tasks with three or more rollbacks in `history.jsonl`; reversible by returning to cumulative counting, which is one guard's position in `deriveState`.
**Applied in.** `FORMATS.md §7` · `scripts/ledger.mjs` (`deriveState`) + tests.

### 0024 — A false finding is a design defect, not a rough edge (2026-08-31)

**Context.** Stage 1's two reviews found the same defect three times, in three mechanisms. `lint --hook` reported `.claude/hodos/tasks/<slug>/brief.md` and `research.md` — written on every task by `COMPONENTS.md §1.1` — as `unknown artifact`, and reported every correctly named project skill as a name mismatch against the directory "skills". Both put a finding into the model's context about a file hodos itself had written correctly, through the very channel fact 29 confirms reaches the model verbatim. The third instance was already handled by hand in `scripts/verify-citations.mjs:11`, whose header explains that a branch name reported as a dead citation "would train the reader to ignore this output". Three instances, one class, and nothing in the design named it — so the next mechanism would have repeated it.

**The user's position.** The lesson belongs in the principles, not in a hook's comment.

**Options.**
1. **A principle in `DESIGN.md §2`.** It governs every channel at once — hooks, reviewer, lint, rules, digest — and §2 is read at the start of every stage. Cost: a sixteenth line in a list whose value is its shortness.
2. **A line in `§10` plus one in the reviewer's contract.** Cheaper and narrower; the same defect in a rule's precedent or in the digest stays uncovered.
3. **A `BACKLOG.md` line** to revisit at Stage 6 with the reviewer and the bench in hand. Changes nothing now.

**Taken — option 1**, as principle 16: a check earns its channel by being right about correct files, and every mechanism that writes to the model or the developer reports on what it knows the shape of and stays silent on the rest. The two incidents are named in the principle, per Principle 10 — precedents beat abstractions.

**The risk named.** A principle that reads as "be careful" is a no-op sentence (`AUTHORING.md §2`). This one is not: it states what a mechanism does with a file whose shape it does not know — stay silent — which is a checkable behavior, and it is what `lintHook` now implements.

**Cost if wrong.** Silence becomes the reflex and a real finding is dropped because its file was unclassified — the opposite failure. It would show as a defect the bench's seeded patches catch while the hook does not, and `bench/noop/` (decision 0019) is where a principle that changes nothing becomes visible.
**Applied in.** `DESIGN.md §2` (principle 16) · already implemented in `scripts/lint.mjs` (`lintHook`, `checkSkill`) by the Stage 1 review fixes.

### 0025 — `campaign` is the fourth value of `Path`, and the router set holds 35 cases (2026-08-31)

**Context.** `BUILD-PLAN.md` Stage 2 asks for `bench/router/set.json` with "30 labeled descriptions (10 quick / 12 standard / 8 deep; all four types; 5 campaign cases, labeled with the nine-row checklist values so labels follow `FORMATS.md §3` rules)". Two things in that sentence do not fit together. 10 + 12 + 8 is already 30, so the five campaign cases have no room. And `FORMATS.md §3` applies its six verdict rules in order, first match wins: rule 1 (`any yes or unknown on rows 6–9 → campaign`) fires before the rules that produce `quick`, `standard` and `deep`, so a campaign case never reaches a path — while `COMPONENTS.md §7` labels every case with a path, a type **and** a campaign flag, and gates all three separately. `brief.md` prints all three lines on every task. The bench cannot be written until it is settled what a campaign case's `path` label is.

Deriving a path for a campaign anyway does not work: `DESIGN.md §9` turns each node into its own task with its own routing, so the campaign as a whole has no single amount of process to name.

**Options.**
1. **`Path: campaign` is the fourth value; the set grows to 35** — 10 quick / 12 standard / 8 deep / 5 campaign. `FORMATS.md §3` gains one sentence saying rules 1–6 produce one `Path` whose values are the four, and `Campaign: yes` is the `Path: campaign` case restated for the reader. The three thresholds of `COMPONENTS.md §7` stay; the campaign gate becomes a yes/no reading of the same label. Cost: five more descriptions to author, and one number in the stage entry changes.
2. **`Path: campaign` is the fourth value; the set stays at 30** — rebalanced to 8 quick / 10 standard / 7 deep / 5 campaign. Costs nothing to author, but cuts the deep cases from 8 to 7 and the quick from 10 to 8 — and `DESIGN.md §4.1` puts the burden of proof on the lighter path, so the deep cases are the ones that exercise the ratchet the gate exists to protect.
3. **Two independent axes** — a campaign case also carries one of the three paths, and rule 1 sets only the campaign flag. Keeps 10 / 12 / 8 and 30 literally, and keeps `FORMATS.md §3` unedited. But the path it labels is a number nobody can derive: the work does not ship as one unit, which is what row 6 said, so "how much process" has no answer until the nodes exist. The bench would score the model against a label the specification cannot justify.

**Amended by decision 0072 (2026-09-03):** the composition is **10 quick / 10 standard / 10 deep / 5 campaign**. Rule 3's second clause stopped reading a per-case boolean and started reading row 1, and `s11` and `s12` re-derived to `deep`. The set is 35 cases with all four types and all four paths, which is what this decision fixed; the per-path counts moved because a label follows its rows, which is what decision 0025 is *for*.

**Taken — option 1.** It is the reading both other documents already assume — `COMPONENTS.md §7`'s three thresholds and `brief.md`'s three lines are satisfied by one label plus its restatement — and it keeps every per-path count the stage entry chose. The five extra descriptions are the cheapest part of this stage.

**Cost if wrong.** If `campaign` turns out to need a path after all (say, `campaign` + `deep` grilling for the map itself), the set's five campaign cases need a second label and `run.mjs` a second column; both are additive and neither invalidates a scored run. Reversible.
**Applied in.** `FORMATS.md §3` (verdict rules) · `COMPONENTS.md §7` (`router/set.json`) · `BUILD-PLAN.md` Stage 2 · `bench/router/{set.json,run.mjs,README.md}`.

### 0026 — Stage 4's `/context` criterion reads "exactly `task`", not "zero" (2026-08-31)

**Context.** `BUILD-PLAN.md` Stage 4 asks that `/context` in a session with `--plugin-dir .` show **zero** hodos entries in the skill listing. That sentence was written under D2 of the design phase, which put `disable-model-invocation: true` on all eight skills. Decision 0016 replaced that blanket with a criterion and derived a set of three call targets — `task`, `campaign`, `rule` — which omit the flag and therefore appear in the listing; `scripts/lint.mjs:65` enforces the omission, so a `task` kernel that satisfied the criterion as written would fail lint. `DESIGN.md §11` already counts three descriptions rather than zero. The criterion was not updated in the same pass and is stale, not wrong about anything that is still true.

**Options.**
1. **Reword the criterion**: the listing shows exactly the model-invocable skills that exist at this stage — `task` — and no other hodos entry. Cost: one sentence in `BUILD-PLAN.md`, and every later stage's listing count becomes a number that grows as `campaign` and `rule` are built.
2. **Keep "zero" and gate `task`**: reverses decision 0016's derived set, turns the `campaign` → `task` edge back into a line the developer types, and reintroduces the cognitive load 0016 removed.
3. **No edit; record the deviation in the Stage 4 report.** Cheapest now, and leaves a criterion the fresh reviewer must be told to disregard — the failure mode `STAGE-PROTOCOL.md §4` exists to prevent.

**Taken — option 1.** The measurement the criterion protects is the listing cost of `PLATFORM-NOTES.md` fact 16, and that measurement is "one entry, and it is the one decision 0016 named" exactly as well as it was "zero". Stage 8 and Stage 9 read the same criterion as two and three.

**Cost if wrong.** The listing grows past the three of decision 0016 without anyone noticing, because the criterion now names a moving number instead of a fixed one. Visible in `/context` at every stage that adds a skill, and the guard is that each stage's criterion names its own expected set, not a count.
**Applied in.** `BUILD-PLAN.md` Stage 4 acceptance.

### 0027 — `bench/router/invoke.mjs` drives the scored router run (2026-08-31)

**Context.** `bench/router/run.mjs` scores a verdicts file and states in its own header that what produces that file is Stage 4's question. `COMPONENTS.md §7` names `set.json`, `run.mjs` and `README.md` and no third file. The scored run is 35 model invocations against four fixtures, each needing its own copy, a seeded config for the three fixtures Stage 3 left without one, a captured verdict and a tool-call count. Assembling that by hand produces a `verdicts.json` nobody can re-run, and Stage 11 re-runs the bench by definition.

**Options.**
1. **Add `bench/router/invoke.mjs`**, zero-dep `.mjs` with `node:test` tests: prepare a fixture copy per case, invoke the chosen arm, parse `--output-format stream-json` for the printed verdict and the tool-call count, write `verdicts.json` plus a measurements file. The model call is not unit-tested; the parsing and the collection are (decision 0019's split). Cost: one file `COMPONENTS.md §7` has to name.
2. **Ad hoc**: a shell loop in the stage, `verdicts.json` assembled with `node -e`, the commands pasted into the report. No new file now; Stage 11 writes the runner when it needs one, and the Stage 4 number is not reproducible in between.

**Taken — option 1.** A gate whose run cannot be repeated is a measurement of one afternoon. The file is written test-first, per decision 0022 part 4, and its red run goes into the Stage 4 report.

**Cost if wrong.** The invocation arm changes at Stage 11 — a different flag, a different output format — and the runner is rewritten rather than reused. Cheap: the parsing it holds is the part that would have been rewritten anyway, and the tests move with it.
**Applied in.** `COMPONENTS.md §7` · `BUILD-PLAN.md` Stage 4 deliverables · `bench/router/README.md`.

### 0028 — The router bench is a measurement at Stage 4; its gate runs once, at Stage 11 (2026-08-31)

**Context.** `BUILD-PLAN.md` Stage 4 gates the stage on the router bench: path ≥85%, type ≥90%, campaign ≥90%. Measuring it costs one full run — 35 headless sessions, `$15.41`, 8 minutes wall-clock, and the cost that actually binds: **about a quarter of the subscription's 5-hour usage window** for the one scored run. (Corrected 2026-09-01 — the original text said two scored runs and half the window; the stage ran one, plus two one-case probes and a two-case smoke. Review 1 minor 2. The decision stands on the quarter.) A gate whose measurement costs a quarter of the day's capacity cannot be iterated, and a criterion nobody can re-measure after a fix is not a criterion.

Run 1 scored path 62.9% / type 85.7% / campaign 94.3% and its diagnosis is what makes the number hard to read as the router's:

- In **every** miss the router applied the six rules correctly to the rows it had written. The mechanism works; the disagreement is in the row values.
- Three of 35 cases described work the fixture already ships (`q01`, `d04`, `d05` — the webapp already routes every query key through the factory, `mono/web` holds no rate literal). The router answered "premise already true", which is right and is not routing.
- Several checklists carry file counts the fixtures cannot produce: `mono` has five source files, and one case's checklist says twenty. The set was authored against imagined projects; the router fills the rows from the repository in front of it.
- The rows `new module` and `contract / schema / route change` are under-defined in `DESIGN.md §4.1` and `FORMATS.md §3`. Where the set and the router disagreed on those, both readings are defensible.

**Options.**
1. **Keep the gate at Stage 4.** Every iteration of one reference file costs a run. The set's own defects are inside the number, so the first thing the gate would buy is a rewrite of the set — at a run per attempt.
2. **Measurement at Stage 4, gate at Stage 11.** Run 1 and its diagnosis go into the report as evidence; Stage 4 ticks on what it can establish without a paid run — lint, caps, the interactive criteria, the fail-closed invariant, check D. Stage 11 owns the bench as its deliverable and runs the scored gate once, on a set repaired there.
3. **Shrink the set.** Cheaper per run and a weaker number, and the defects stay.

**Taken — option 2.** `COMPONENTS.md §7`'s split already says what to do with a number that cannot be re-measured on demand: it is a measurement. The thresholds are unchanged and move with the gate to Stage 11, where repairing the set is in scope rather than a detour.

**What is not deferred.** The three defects run 1 exposed are fixed in Stage 4, because they are defects and not thresholds: the two remaining already-done cases, the value grammar and calibration `references/route.md` had dropped from the specification, and the escaped-pipe bug in `invoke.mjs`.

**Cost if wrong.** A routing regression ships unmeasured until Stage 11 — the risk is bounded by the router's verdict being a mandatory human stop (`DESIGN.md §4.4`): a wrong proposal costs an override, not a wrong plan. Reversible by running the gate at any stage that has the budget for it.
**Applied in.** `BUILD-PLAN.md` Stage 4 and Stage 11 · `COMPONENTS.md §7` · `bench/router/README.md`.

### 0029 — What the router's "≤5 tool calls" counts (2026-09-01)

*Raised by review 1 major 1 (`docs/stages/04-review.md`), answered by the user 2026-09-01.*

**Context.** `DESIGN.md:114` and `:371`, and `COMPONENTS.md:55`, say the router spends **≤5 tool calls** before its verdict. `bench/router/invoke.mjs` scores something narrower: *evidence* calls — the searches and reads that fill checklist rows 1–5 — excluding `config.mjs find`, the read of `references/route.md`, `ToolSearch`, and the `!` digest injection. Measured over the 35 saved streams: evidence calls max **5**, mean **3.20**; raw transcript calls max **9**, mean **6.83**. Stage 4's acceptance criterion originally read "(transcript count)" and was rewritten to the narrower count during the stage, attributed to decision 0028, which says nothing about it. Under the criterion as approved, the run **fails**.

**Options.**
1. **Ratify the narrow count.** The budget is ≤5 evidence calls; the procedure calls (config, the reference read, the digest) are named as outside it. Amend `DESIGN.md:114`, `:371`, `COMPONENTS.md:55`, and `04-plan.md` D9 to say what `invoke.mjs` counts. The number that binds behavior — how much the router explores — is unchanged at 5.
2. **Keep the literal count.** ≤5 transcript calls including the reference read and `config.mjs find`. Two of the five are then spent before the router looks at anything, leaving three for nine rows; `references/route.md` is rewritten to that budget and run 1 is recorded as failing the criterion.
3. **Two numbers.** ≤5 evidence calls and a transcript ceiling (say 9, the measured max). Adds a threshold, and a second number to maintain against one behavior.

**Taken — option 1.** The rule the number encodes is "a router that goes exploring has failed"; a mandatory reference read and a config lookup are not exploration, and fact 32 makes the reference read unskippable. Option 2 shrinks the evidence budget to 3 for a checklist of nine rows, which the run shows is not enough. Option 3 buys a number nobody acts on.
**Cost if wrong.** A router that spends nine turns feels slower than "≤5" promises, and the honest total is only visible in `measurements.json`. Reversible: the measurement is already recorded per case.
**Applied in.** `DESIGN.md §4.1`, `§13` · `COMPONENTS.md §1.1` · `BUILD-PLAN.md` Stage 4 · `skills/task/references/route.md` · `docs/stages/04-plan.md` D9.

### 0030 — What `config.autonomy: "rulings"` may skip (2026-09-01)

*Raised by review 1 major 2 (`docs/stages/04-review.md`), answered by the user 2026-09-01.*

**Context.** `DESIGN.md:146` lists five mandatory stops: the router verdict, the plan approval, a fork that changes behavior/contract/structure/dependency, the breaker, and destructive or outward-facing actions. `DESIGN.md:154` then defines `"rulings"` as "decide, record, continue; **stops only for destructive/outward actions**" — which, read literally, removes the router verdict and the plan approval as well. The Stage 4 kernel asserted the opposite (both stops hold under `rulings`) with nothing behind it; that sentence is now deleted, and the setting is undefined for S1 until this is settled.

**Options.**
1. **`rulings` downgrades one class only** — the unsettled fork. The router verdict, the plan approval, the breaker, and destructive actions always stop. Amend `DESIGN.md:154`.
2. **Literal reading.** `rulings` skips the router verdict and the plan approval too: the agent routes, plans, approves itself and reports. Amend nothing; the kernel gates on the setting.
3. **Drop `rulings` from v1.** The field stays in `config.json` and is unimplemented; every stop is mandatory until the pilot says otherwise.

**Taken — option 1.** "The router **proposes**; the human decides" (`DESIGN.md §4.1`) is the load-bearing sentence of the whole entry design, and a plan nobody approved is the failure mode the two-session split exists to prevent. Option 2 turns hodos into an autonomous planner for anyone who flips one config key; option 3 leaves a config field the engine ignores, which is worse than a defined one.
**Cost if wrong.** A developer who wanted full autonomy still confirms twice per task. Cheap and visible; the setting can widen after the pilot.
**Applied in.** `DESIGN.md §4.4` · `FORMATS.md §2` (the field's description) · `skills/task/SKILL.md` (Gates) · Stage 5's `run` kernel, which owns the execution-side rulings.

### 0031 — A campaign verdict opens no task (2026-09-01)

*Raised by review 1 major 3 (`docs/stages/04-review.md`), answered by the user 2026-09-01.*

**Context.** `COMPONENTS.md:47-48` has the kernel run `ledger.mjs init` and write `brief.md` (step 2) before step 3 hands a campaign verdict to the `campaign` skill. `scripts/ledger.mjs:22` accepts `--path quick|standard|deep` only, so that sequence exits 1; `FORMATS.md:143` says a campaign "has no path of its own", and `DESIGN.md §9` turns each node into its own task, routed again. Stage 4 settled this in its own ledger (D13) and the kernel now skips step 2 on a campaign verdict — but `COMPONENTS.md` still describes the old order, and Stage 9 will build `campaign` against it.

**Options.**
1. **Ratify the skip.** A campaign verdict prints its checklist and verdict, is confirmed, and opens nothing; the map is the campaign skill's file. Amend `COMPONENTS.md §1.1` steps 2–3.
2. **Give a campaign a task directory.** Extend the ledger grammar with a fourth path value, so `Init: campaign <type>` is legal and `brief.md` lands on disk. Touches `FORMATS.md §6`, `scripts/ledger.mjs`, phase derivation and its tests, and leaves a task directory that never becomes a task.
**Taken — option 1.** The script, `FORMATS.md §3` and `DESIGN.md §9` already agree; only the `COMPONENTS.md` summary is stale. Option 2 invents state for a thing the design says is not a task.
**Cost if wrong.** A campaign verdict leaves nothing on disk, so a session that dies between the verdict and the map loses the checklist — five tool calls to redo.
**Applied in.** `COMPONENTS.md §1.1` (steps 2–3) · `docs/stages/04-plan.md` D13.

### 0032 — Ten design fields, always (2026-09-01)

*Raised by review 1 major 3 (`docs/stages/04-review.md`), answered by the user 2026-09-01.*

**Context.** `DESIGN.md:102` gives a `quick` task "`plan.md` with the design fields that apply"; `DESIGN.md §6.2` makes all ten mandatory and says an empty field means the plan is not ready. Stage 4 settled this in its ledger (D14): ten always, a field with nothing under it written as `none` plus the half-line that says why. The session-A plan did exactly that — `### Refactor in scope` reads `none`, with the reason.

**Options.**
1. **Ten always, `none` is a value.** Amend `DESIGN.md:102`. The reviewer and the plan-reviewer agent can check for ten sections; a `quick` task pays a few lines.
2. **Fields that apply, on `quick`.** `design.md` reverts; "applies" is the planner's judgement, and neither the lint nor the reviewer can tell a skipped field from a forgotten one.
**Taken — option 1.** A checkable completion criterion is worth more than the four lines it costs on a small task, and `none` with a reason is itself information — it is how `### External APIs` says "this touches no library".
**Cost if wrong.** `quick` plans carry a few `none` lines. Visible in the pilot's plan sizes.
**Applied in.** `DESIGN.md §4.1` (the path table) · `skills/task/references/design.md` · `docs/stages/04-plan.md` D14.

### 0033 — A `bench/run/` set: approved fixture plans and a seeder (2026-09-01)

**Context.** Every acceptance criterion of Stage 5 begins "on the approved fixture plan". Nothing in the repository holds one: `bench/fixtures/webapp/` ships a project layer (`config.json`, six rules, a `CLAUDE.md`) but no `.claude/hodos/tasks/<slug>/`, and the plans Stage 4's manual sessions produced lived in throwaway copies under the scratchpad and are gone. Four of the five criteria need a plan shaped for the behavior under test — one with a `visual` exemption and something for the ladder to cut, one whose correct form is bounded, one with nothing to cut, one whose acceptance check cannot pass — and `/hodos:task` cannot be asked to produce a deliberately impossible check. Stages 6, 7 and 8 need the same inputs: a reviewer needs an executed task, a verifier needs one that was reviewed.

**Options.**
1. **`bench/run/`** — `plans/<name>.md` (the four approved plans), `seed.mjs` (turn a `fixture-copy.mjs` copy into a task directory at `phase: approved`), `README.md`. Registered in `COMPONENTS.md §7` as a **harness with no gate**: it produces inputs, it scores nothing, so decision 0019's gate/measurement split is not touched. Cons: a fifth thing under `bench/` that the specification did not foresee, and four plans to keep true as `FORMATS.md §5` moves.
2. **Inside `docs/stages/05-manual.md`** as heredocs the user pastes. Cons: ~250 lines of plan text inside a procedure file, unlintable, and Stage 6 rewrites all of it because a stage file is not an input other stages read.
3. **Produce each plan by running `/hodos:task` first.** Cons: doubles the stage's model cost, cannot produce the impossible-check or gap-injected plans at all, and makes every acceptance run non-reproducible for the fresh reviewer.

**Taken — option 1.** The plans are fixtures in the sense `bench/fixtures/README.md` already uses: small, committed, deliberately shaped, never run against a real project. A seeder that writes them through `ledger.mjs` rather than by hand also exercises the one-writer rule (`DESIGN.md §5.1`) on every stage that uses it.

**Cost if wrong.** Four plan files drift from `FORMATS.md §5` and a later stage seeds a plan the current `lint.mjs --project` rejects. Visible the first time a seeded copy fails its own lint check, which T5's acceptance check runs. Reversible: the directory is inputs only, and deleting it costs the stages that use it nothing but the plans themselves.
**Applied in.** `COMPONENTS.md §7` · `BUILD-PLAN.md` Stage 5 · `bench/run/`.

### 0034 — What the simplify pass emits when it cuts nothing (2026-09-01)

**Context.** `DESIGN.md §7.1` and decision 0018 give the pass two closing forms and an "or": one line per cut and `net: -<N> lines`, **or** `Lean already.` when nothing was cut. `BUILD-PLAN.md` Stage 5's second criterion asks a task with nothing to cut to produce `Lean already.` **and** `net: -0 lines`. `FORMATS.md §6` makes the ledger line `Simplify: done --sha <sha> --net <n>`, so a pass that cut nothing still has to name a sha and a number, and there is no commit to name.

**Options.**
1. **The chat says `Lean already.`; the ledger records `net -0` against HEAD.** The two forms are not alternatives at all — one is what the transcript prints, the other is what `ledger.mjs` stores — and the criterion's "and" is satisfied by two different channels. No commit is made when nothing changed; `--sha` carries the head the pass examined, which is the same sha the last task's `done` line carries.
2. **An empty commit** so `Simplify: done` names a commit of its own. Cons: a commit that changes nothing in a history the reviewer reads, to satisfy a field's shape.
3. **Make `--sha` optional on `Simplify: done`.** Cons: a `scripts/ledger.mjs` change and a `FORMATS.md §6` grammar change to encode "nothing happened", where option 1 already has a truthful sha.

**Taken — option 1**, with `DESIGN.md §7.1` amended to say which channel each form belongs to, since the "or" is what made them look exclusive.

**Cost if wrong.** `net -0` lines accumulate in ledgers and say nothing. Visible at Stage 12 as the share of tasks whose simplify pass cut nothing — which is a number worth having, and is the argument for recording it rather than for the "or".
**Applied in.** `DESIGN.md §7.1` · `skills/run/references/{execute,defaults}.md` · `BUILD-PLAN.md` Stage 5.

### 0035 — The red-check loop is not reachable from an unachievable acceptance criterion (2026-09-01)

**Context.** `BUILD-PLAN.md` Stage 5's fifth criterion reads: *a deliberately impossible acceptance check produces exactly three `red-check attempt` lines and a stop with a diagnosis.* Three plans were built to trigger it, and all three stopped at the **gate** instead, before any code:

| Plan | The impossibility | What the run did | Turns · cost |
|---|---|---|---|
| `exact-float-total` | `0.1 + 0.2` asserted to be exactly `0.3`, every escape closed by `## Non-goals` | proved the contradiction from the plan alone, printed three options, stopped | 10 · $0.42 |
| `wrong-total` | the expected total one cent off the sum of the three totals the criterion itself gives | added them in node, found `61.50` against the line's `61.51`, stopped | 10 · $0.43 |
| `grid-columns` | a computed `grid-template-columns` from a stylesheet, which vitest's default `css: false` keeps out of jsdom, with the inline style and the `vite.config.ts` change both barred | ran four probes, established that jsdom *can* compute the value but vitest never loads the sheet, found a legal way to satisfy the criterion, and stopped to ask which | 18 · $0.83 |

The kernel is doing what `DESIGN.md §4.4` tells it to: a plan that does not settle something goes to the chat before code. An acceptance criterion that cannot be met **as written** is exactly that. The red-check loop of `§4.5` is for an implementation that fails a check the plan did settle — and a competent implementer that reads the plan as its contract finds the contradiction first, every time. Forcing the loop would mean rewarding the behaviour `execute.md §9` names as its anti-pattern.

**Options.**
1. **Split the criterion.** The live half becomes what the runs actually establish, in triplicate: an acceptance criterion that cannot be met as written stops with a diagnosis and the options, before any code, and records nothing but the stop. The loop's own half is checked where it is already checkable without a model call — `ledger.mjs` accepts exactly `Task <n>: red-check attempt <k>/3`, `state.redCheckAttempts` counts and resets on `done` (both covered by `scripts/ledger.test.mjs`), and `execute.md §4` states the bound, the one-diagnosis-one-change rule, and the stop. Cons: the loop is never observed end to end on a live run until a real project produces a genuinely stubborn check (Stage 12).
2. **Keep hunting for a plan that triggers it.** Cons: three designs are already beaten, each by a different faculty — arithmetic, reading, probing — and the next design has to defeat a model that runs experiments. Each attempt costs about $0.5–0.9, and a plan contrived enough to win measures the contrivance.
3. **Change the kernel so a failing check is retried three times before the gate.** Cons: this is the named anti-pattern — continuing past a red check with a small workaround — and it would make the executor worse in exactly the way `research/01` documents.

**Taken — option 1**, with `BUILD-PLAN.md` Stage 5's fifth criterion rewritten and the three runs recorded in the stage report as its evidence.

**Cost if wrong.** The three-attempt loop ships unobserved, and a defect in it surfaces first on a real project rather than on the bench. Visible at Stage 12 as a task that loops past three attempts or stops at one; cheap to catch, because `redCheckAttempts` is in `state.json` and every attempt is a ledger line.
**Applied in.** `BUILD-PLAN.md` Stage 5 (criterion 5) · `scripts/ledger.test.mjs` (the fourth attempt is rejected by the grammar) · `docs/stages/05-report.md`.

### 0036 — The `run` seeder also seeds `phase: review` (2026-09-01)

**Context.** `COMPONENTS.md §7` gave `bench/run/seed.mjs` one endpoint: a task directory at `phase: approved`, which is where session 2 starts. Stage 6's second criterion starts a phase later — it needs a copy whose tasks are committed, whose simplify pass is recorded, and whose diff carries one known defect, so that the review loop has something to review. Three ways to get there were on the table: extend the seeder, drive `/hodos:run` through execute before every loop run, or commit prepared task directories.

**Taken — extend the seeder.** `--at approved|review` (default `approved`, so every Stage 5 invocation is unchanged) and `--defect <patch>`. At `--at review` the seeder commits each task's implementation from `plans/<name>.impl/`, applies the named seeded patch inside the task commit its metadata points at, and runs `ledger.mjs` for every event — `Task n: started`, `test red`, `done --sha`, `Simplify: done --sha --net` — so the copy arrives at `phase: review` through the one script `DESIGN.md §5.1` allows to write machine state. Nothing is hand-built and nothing is committed that `ledger.mjs` would otherwise derive.

**Why not the other two.** Driving the kernel through execute for each loop run costs about a third of a five-hour window for three runs, and it cannot guarantee the defect the criterion needs: Stage 5's runs 4 and 4a are the record of an executor that reads the plan and declines to write what it is told to write (decision 0035). It also makes the scoped re-review unreproducible — a fresh reviewer would be handed a different diff each time. Committing prepared task directories would put `state.json` and `ledger.md` in git, where they drift from the derivation in `ledger.mjs` that is supposed to be their only author.

**Cost if wrong.** The loop is exercised on an implementation the kernel did not write, so a defect in the handoff from execute to review — a ledger line the executor would have written differently — would not show here. Visible at Stage 8, where finish reads the whole ledger, and at Stage 12 on a real project.
**Applied in.** `COMPONENTS.md §7` · `bench/run/seed.mjs`, `seed.test.mjs`, `README.md` · `docs/stages/06-plan.md` D-table and T8.

### 0037 — The review bench batches its patches, and splits invocation from scoring (2026-09-01)

**Context.** `COMPONENTS.md §7` listed `review/seeded/<id>.patch`, `review/clean.json` and `review/run.mjs`, and left open how the patches reach the reviewer. One package per patch means about 24 dispatches per scored run — 20–25% of a five-hour window — and a prompt fix means paying it again, which is the situation decision 0028 named when it declined to gate a number nobody can re-measure. `BUILD-PLAN.md` Stage 6 states the thresholds as acceptance criteria, so the number has to stay a gate here.

**Taken — both parts.**
1. **Packages of three or four.** The 18 patches are grouped into six review packages, each a diff carrying three or four seeded defects plus some of the six `clean.json` files. Six dispatches, 6–8% of a window, re-runnable after a prompt fix — and the input is the one the reviewer sees in production: a whole task diff, not a single defect with a spotlight on it. Attribution is unaffected because the patches in a package touch distinct files and lines, and `run.mjs` scores a finding against the hunk it lands in.
2. **`review/invoke.mjs` beside `review/run.mjs`**, the shape decision 0027 gave the router: the driver prepares the copies, builds the packages, dispatches the reviewer and writes the verdicts file; the scorer reads that file, makes no model call, and is unit-tested against hand-written finding sets (decision 0019). One file holding both would put the expensive path and the free one behind the same `--help`.

**Cost if wrong.** A crowded diff hides a defect the reviewer would have found alone, and recall reads low for a reason that is the bench's and not the prompt's. Visible as a miss clustered in the largest package; the fix is to re-run that package's patches singly, which costs three dispatches, not a re-design.
**Applied in.** `COMPONENTS.md §7` · `bench/review/` · `docs/stages/06-plan.md` T4, T5, T7.

### 0038 — A finding whose subject is a file that does not exist (2026-09-01)

**Context.** `FORMATS.md §9` requires every finding to carry `file:line`, and the reviewer drops a row that cannot. The Stage 6 bench run produced three findings of one shape the rule cannot express: *this module ships with no test beside it*. The reviewer located them as `src/features/orders/ui/`, `test/services.test.js (untouched)` and `src/features/orders/ui/useStatusParam.ts` — a directory, an untouched file, and a file whose missing neighbour is the point. All three are real, all three were dropped by the scorer's validity rule, and they are the whole of the precision loss in that run (31/34, 91.2%).

**Taken (user, option 1).** A bare path is a location when the finding is an absence. `FORMATS.md §9` gains one sentence naming the single case — a file that does not exist — so the exception cannot widen to a paragraph about the architecture: the row carries the path the file *should* exist at, and no line. Everything else without a location is still dropped, by the reviewer and by the scorer.

The alternatives were: file the finding against the line of the untested behaviour, which sends a reader to correct code; or a third section for absences, which `DESIGN.md §7.3` forbids by saying its two sections are never merged.

**Narrowed the same day, by the stage review.** The first implementation credited any bare path, and the three findings that prompted the decision were then re-scored as valid — wrongly. None of them names a file that does not exist: `test/services.test.js` exists untouched (what is missing is a case in it), `useStatusParam.ts` is the module the diff adds (what is missing is its test), and `src/features/orders/ui/` is a directory. The rule is the narrow one: the row names **the missing file's own path**, in full. The scorer now proves it — `invoke.mjs` records each package's file list from the copy it built, and a bare path counts as a location only when it names a file (a last segment with an extension) that the package does not ship. Where no list exists the row is invalid, because an unprovable location is not one. The shipped run scores 31/34 (91.2%) under that rule, which is what it scored before the decision: the decision changes what a *future* review may write, and re-reading old reviews under it was the error.

**Cost if wrong.** Locations get vaguer over time. The scorer counts the rows located by path alone and prints the count, so drift shows as that number rising rather than as silence. Reversible by deleting the sentence.
**Applied in.** `FORMATS.md §9` · `agents/hodos-reviewer.md` step 6 and the Item/Trigger paragraph, Anti-pattern · `bench/review/run.mjs` (the absence rule, `precision.absences`) · `bench/review/invoke.mjs` (`parseReview`, `prepare` file list, `--reparse`).

### 0039 — Criterion 2b: an unfixable finding, not a seeded blocker (2026-09-02, Stage 6)

**Context.** `BUILD-PLAN.md` Stage 6 asked for "seeded unfixable **blocker** → two iterations → breaker question with the three options → `Breaker:` line". Everything after the first arrow is evidenced live (`bench/run/runs/2026-09-01-breaker-live/`); the first clause is not. Five designs were built for it and three were run live, and what they found is a property of the loop rather than a gap in the bench: the kernel fixes what the plan permits and the reviewer grades what the diff leaves, so **a finding survives a fix pass only when a person declines its fix**. A seeded defect the pass can close is closed in iteration 1; one it cannot close is a `Gap:` for the chat, and the answer is the developer's. Severity follows the same logic — a blocker is what the reviewer refuses the diff over, and the fix pass fixes blockers first.

**Taken (user, option 1).** Criterion 2b reads "an unfixable finding at `major` or above, seeded or raised → two iterations → breaker question with the three options → `Breaker:` line". The severity floor stays; what goes is the requirement that the bench author it. The stage's own live run meets the amended text: `Review 1: NEEDS_WORK (0/1/2)` · `Fix 1: done (ea0dfbf)` · `Review 2: NEEDS_WORK (0/1/1)` · the three options · `Breaker: review — accept` · `state.phase` derives `verify`.

The alternatives were a sixth design aimed at a blocker — one more plan and one more live session, still dependent on a person declining the fix, with the severity being the reviewer's judgement rather than the bench's — or leaving the stage open on the one clause its own design makes hard to reach.

**What this costs, named rather than renamed away.** The `REJECT`-reaches-the-breaker branch of `review-loop.md §7` stays evidenced by `scripts/ledger.test.mjs:346` and by no run. Stage 12 puts the loop on a real project, which is where a blocker appears if it appears at all; if one does, the branch is exercised then, and the breaker code it reaches is the same code either way.
**Applied in.** `BUILD-PLAN.md` Stage 6 acceptance · `docs/stages/06-report.md` row 2b.

### 0040 — Stage 9 splits into 9a (single repository) and 9b (across repositories, after the pilot) (2026-09-02)

**Context.** `research/05` F7. Campaigns are the largest unvalidated surface in the design, and campaign failures are two of `research/01`'s "never solved" list (#3 artifact GC, #8 ticket state across layers). `BUILD-PLAN.md` Stage 9 carried seven acceptance rows, two of them multi-repo, and the multi-repo half can only be exercised against a second fixture — `kit` — that has none of the properties (a foreign owner, a branch someone else holds, a map nobody in this session wrote) that make cross-repository campaigns hard. Brooks's second-system effect is the risk to name: hodos is the seventh attempt and carries a feature from each predecessor; Stage 9 is where the decision log's antidote is least tested.

**Taken (user, option b).** 9a — map, frontier, the `task` → `campaign` → `task` round trip, node finish, GC, nested-monorepo lookup — ships in 0.1. 9b — cross-repository lookup, `external[]` resolved, claims by branch — runs after Stage 12, written against the second repository the pilot names. Decision 0010 stands: campaigns are v1 core, and dropping them was never an option. `external[]` stays in the `FORMATS.md §11` grammar and is round-tripped by `campaigns.mjs` in 9a; what 9a lacks is the lookup, and a non-empty `external[]` stops with "cross-repository campaigns are Stage 9b" rather than half-resolving.

The stages are **not renumbered**: 9b sits after 12 in the Progress checklist, so every existing cross-reference to Stages 10, 11 and 12 in `docs/`, `skills/` and the stage reports still resolves. Renumbering to keep the list monotonic would have been the drift class `research/05` F1 already charges three majors to.

**Cost if wrong.** 0.1 ships without cross-repository campaigns, so a user with a real multi-repo campaign has to wait for 0.2. Visible at Stage 12 if the pilot's work turns out to be inherently multi-repo, in which case 9b is pulled forward and run inside the pilot. Reversible: 9b's deliverables are unchanged, only their position moved.
**Applied in.** `BUILD-PLAN.md` Progress, Stage 9a, Stage 9b, Stage 4 deliverables (the stub now names 9a).

### 0041 — Node is a prerequisite hodos declares, and the machine without it was probed (2026-09-02, Stage 7, proposal A)

**Context.** Fact 18 was corrected on 2026-09-02: `code.claude.com/docs/en/setup` lists no Node in the system requirements, ships a binary through five install channels, and states that even the npm install's `claude` binary "does not itself invoke Node". `DESIGN.md §3.1` had derived "so scripts are zero-dep `.mjs`" from a premise that is gone. On a machine without `node` on `PATH`, every hodos hook fails on every event and every kernel's `` !`node …` `` injection aborts the invocation by fact 14.

**Options as they were put.** (a) Nothing — the failure mode lands on whoever installs hodos on a fresh machine. (b) Declare it: `README.md` Requirements, the `plugin.json` description, and an `init` preflight that runs `node --version` and stops with the prerequisite rather than writing a project layer whose hooks cannot run. (c) (b) plus a probe: install hodos on a machine with no Node and record what Claude Code actually shows — six hook errors, one abort, or a silent skip — as an `observed` fact.

**Taken (user, option c).** hodos declares the prerequisite in the three places a user meets it — `README.md` Requirements (already written), the `plugin.json` description, and `DESIGN.md §3.1`, whose closing sentence stops pointing at an open proposal and states the decision. The failure mode is **probed rather than inferred**: a `claude --plugin-dir .` run on a `PATH` with no `node`, recorded as an `observed` fact in `PLATFORM-NOTES.md` with what Claude Code actually shows. The `init` preflight — `node --version` before the project layer is written — stays Stage 10, where `init` is completed.

Zero-dependency `.mjs` survives its original premise as a house rule with its own reason: a plugin install must not run a package manager to work. `CLAUDE.md` already carries it as a standing rule.

**Cost if wrong.** If the probe shows Claude Code already names a missing interpreter clearly, the Stage 10 preflight is one redundant check and one commit to delete; the README sentence is corrected to what the probe showed either way, which is the point of running it. **Applied in.** `.claude-plugin/plugin.json`, `DESIGN.md §3.1`, `PLATFORM-NOTES.md` fact 18 and the new observed row, `BUILD-PLAN.md` Stage 10.

### 0042 — `maxTurns` on every dispatch, configurable as `config.agents.<role>.maxTurns` (2026-09-02, Stage 7, proposal D) — **amended the same day by 0044**

**Context.** `DESIGN.md`'s 3 / 2 / 2 bound the *kernel*'s loops. Nothing bounded a single agent: a reviewer or verifier that loops inside its own dispatch runs until the platform stops it, and the kernel sees a hang. Fact 36 (docs, 2026-09-02): the Agent tool takes a per-dispatch `maxTurns`, returns partial output when it is reached, and the caller may resume. Principle 15 — a limit enforced by machine rather than by prose — available for free.

**Options as they were put.** (a) Nothing; the loops that matter are the kernel's. (b) A single `maxTurns` constant per role in the dispatch, not configurable. (c) `config.models`-adjacent config (`config.agents.<role>.maxTurns`) with defaults, so a project with a slow verifier can raise it. The recommendation was (b).

**Taken (user, option c).** Every `hodos:*` dispatch carries `maxTurns` from `config.agents.<role>.maxTurns`, with defaults `verify: 60`, `review: 40`, `planReview: 20` used whenever the key, the role, or the whole `agents` object is absent — an older `config.json` needs no migration. The role names are the ones `config.models` already uses, so one project file names one role once.

A dispatch that reaches the bound is a `cannot verify` / `cannot review` verdict with the partial output attached — **never** a silent pass, and **never** a resume: a resumed agent is a second opinion from a context the kernel cannot audit.

The recommendation had been the constant (option b), on the ground that a new config key is a new thing to document, validate and support. The user took the key: the number that is right for a three-route fixture is not the number that is right for a repository whose test command takes ten minutes, and a project that discovers this should not have to fork the engine to say so.

**Cost if wrong.** A bound set too low turns a legitimate long review into one wasted dispatch and a `cannot review` verdict, visible immediately in the stage's own runs. A key nobody sets costs one field in `FORMATS.md §2` and the defaults path, which is the path every existing config already takes. **Applied in.** `FORMATS.md §2`, `COMPONENTS.md §2` dispatch semantics, `skills/run/references/review-loop.md`, `skills/run/references/verify-loop.md`, `agents/hodos-verifier.md`.

### 0043 — The `run` seeder also seeds `phase: verify` (2026-09-02, Stage 7)

**Context.** Decision 0036 gave `seed.mjs` an `--at review` endpoint so Stage 6 could exercise a phase the run reaches after execute. Stage 7's first acceptance criterion needs the phase after *that*, on the one committed plan whose verify plan has browser claims (`orders-summary`), and `COMPONENTS.md §7` enumerates the seeder's flags — so extending them is a spec change rather than a build step.

**Taken (user).** `--at verify` continues past `--at review` by writing `Review 1: ACCEPT 0/0/0` through `ledger.mjs`, so `state.json` is derived by the one script allowed to write it and the copy arrives at `phase: verify` the way a run would have left it. `plans/orders-summary.impl/T1..T3` is written with it — the implementation `--at review` and `--at verify` both need, and the fixture UI the browser recipe drives.

The alternative was two commands by hand in the stage report, the way the `broken-eslint-config` environment patch is applied. It was declined for the reason 0036 gives: a phase the harness can reach in one command is a phase every later stage can re-enter, and Stage 8 needs `--at finish` on the same path.

**Cost if wrong.** One flag value and one `ledger.mjs` call. A seeded `Review 1: ACCEPT 0/0/0` is a review that found nothing, which is what a clean implementation of a committed plan earns; a stage that needs findings in the ledger seeds them with `--defect`. **Applied in.** `bench/run/seed.mjs`, `bench/run/README.md`, `COMPONENTS.md §7`.

### 0044 — Amends 0042: the dispatch bound is the agent definition's, and a bound reached is a stop (2026-09-02, Stage 7)

**Context.** 0042 was taken on fact 36, which read "the Agent tool takes a per-dispatch `maxTurns`". It does not. The same page, re-read on 2026-09-02, lists `maxTurns` under *Supported frontmatter fields* of a subagent **definition** and names `model`, `name` and `isolation` as the per-dispatch parameters; a live dispatch that passed `maxTurns` reported back "Agent tool have no `maxTurns` param — dispatched without it". `config.agents.<role>.maxTurns` — the form the user chose in 0042, over a recommendation of the constant — has no channel to the platform, so it was built for one commit and is removed in this one.

What the frontmatter field does was probed in two arms on one prompt (fact 40, throwaway `tprobe` plugin, CLI 2.1.257). Bounded at 2: two tool uses, **no report text at all**, and the caller got `NOTE: this agent stopped at its 2-turn limit before finishing … had produced no report`. Unbounded control, same prompt: five tool uses, the expected final line, no marker. The delta is the bound.

**Options as they were put.** (a) The bound moves into each `hodos-*` definition's frontmatter; `AUTHORING.md §8` and `lint.mjs`'s agent key list admit the field; `config.agents` comes out of `FORMATS.md §2`; a project that needs another number ships its own `.claude/agents/hodos-<role>.md`, which wins the bare-name collision. (b) Keep `config.agents.<role>.maxTurns` and have `init` write project-level agent files carrying it — the project gets its number and every project gets a frozen copy of the engine's prompts that a plugin upgrade never reaches. (c) Decline the bound: revert 0042, and a dispatch that loops stays a hang the kernel cannot distinguish from slow work. Offered alongside (a) and declined: raising the declared CLI minimum to 2.1.246.

**Taken (user, option a).** `maxTurns` is a field of each `hodos-*` definition — `hodos-verifier: 60`, `hodos-reviewer: 40`, `hodos-plan-reviewer: 20` — admitted by `AUTHORING.md §8`'s frontmatter subset and checked by `lint.mjs` as a positive whole number. `config.agents` is out of `FORMATS.md §2`. A project that needs another number ships its own `.claude/agents/hodos-<role>.md`, which wins the bare-name collision (fact 7); that is a real escape hatch and a heavy one, because it forks the prompt away from plugin upgrades.

**What arrives at the bound is nothing**, and that is the half 0042 got wrong in a second way. There is no partial table to read counts from, no verdict line, no `review.md` and no `verify.md`. So a bound reached is a **stop with a diagnosis** — the class of the third red check — and not a `FAIL` recorded in the ledger. `D9` of `docs/stages/07-plan.md` described a table that does not exist and is amended with this decision.

The declared minimum stays **2.1.232**. The partial marker needs 2.1.246, and the version bump was offered and declined: below 2.1.246 the agent still stops and still returns nothing, and "no verdict line and no output file" is the same stop with or without the marker, so the fourteen-patch window buys nothing.

**Cost if wrong.** A bound set too low costs one wasted dispatch and one integer in one file. If a project turns out to need its own number often, the escape hatch is already there and the evidence for a better mechanism arrives with it. **Applied in.** `agents/hodos-verifier.md`, `agents/hodos-reviewer.md`, `agents/hodos-plan-reviewer.md`, `AUTHORING.md §8`, `scripts/lint.mjs`, `FORMATS.md §2`, `COMPONENTS.md §2`, `skills/run/references/review-loop.md`, `skills/run/references/verify-loop.md`, `skills/run/SKILL.md`, `PLATFORM-NOTES.md` facts 36 and 40.

### 0045 — Cost telemetry from the transcripts, and T-1 reported as two numbers (2026-09-02, Stage 8, proposal B)

**Context.** `DESIGN.md §11` made T-1 — `quick` ≤1.3×, `standard` ≤2× "bare Claude" — a threshold measured once, by hand, with `/cost`, at Stage 12. It is measured once, so the frugality claim has no continuous evidence until the last stage of the build; and it compares unequal things, because a bare run performs no fresh review, no verifier, no mutation check, while a `standard` task pays an opus review, a sonnet verify and the grilling rounds. The data for a continuous measurement already exists and is free: every message in `~/.claude/projects/**/*.jsonl` carries a `usage` block, and a subagent's messages are in the same file with `parent_tool_use_id`, so one session's file already contains its dispatches.

**Options as they were put.** (a) Keep the manual `/cost` at Stage 12. (b) `scripts/usage.mjs` summing S1 + S2 + subagent usage per task, written into `history.jsonl` on `Finish`, read by `status --cost`. (c) (b) plus the T-1 reframe.

**Taken (user, option c).**

`scripts/usage.mjs <session-id>…` sums the `usage` blocks of each session's transcript. It locates a transcript by **globbing `~/.claude/projects/*/<session-id>.jsonl`** rather than by re-deriving the directory name from the cwd: the session id is unique, and the directory's slug encoding is undocumented. A session whose file is absent contributes nothing and is counted in `missing`.

`ledger.mjs` writes the result on `Finish: report delivered`. The sessions that worked the task are exactly the pointers decision 0047 records, so `history.jsonl` gains

```json
"usage": { "sessions": 2, "missing": 0, "input": 41233, "output": 9120, "cacheRead": 812004, "cacheCreation": 66190 }
```

and `usage: null` whenever no transcript could be read — **"no usage data" rather than a wrong number**. Token counts only: `status --cost` prints them and, where a baseline exists, a multiplier. It prints no dollar figure, because the price of a token is not in the transcript and one bad number discredits the rest of the report.

**T-1 becomes two numbers** in `DESIGN.md §11` and `§13`: the raw multiplier against a bare run, **and** the findings caught before human review (blockers and majors from `review.md`, failed claims from `verify.md`). The multiplier alone is Goodhart on a ratio between a run that reviews and a run that does not; the pilot may then reject the threshold, but it cannot reject a working system on the comparison alone.

**Cost if wrong.** One script, one field, one `status` flag, all deletable in one commit; if the transcript format changes, `usage.mjs` reports no data instead of a wrong sum. **Applied in.** `scripts/usage.mjs`, `scripts/ledger.mjs`, `skills/status/SKILL.md`, `FORMATS.md §1`, `COMPONENTS.md §1.5` and `§3`, `DESIGN.md §11` and `§13`.

### 0046 — `history.jsonl` records the router override and the gap texts; `status` reports both (2026-09-02, Stage 8, proposal E)

**Context.** Two signals the design produces and then discards. `references/route.md §3` puts the burden of proof on the lighter path, so unknowns route heavier and a heavy proposal costs the developer an override at a mandatory stop — but `brief.md` records the override and dies with the task directory, and `history.jsonl` records nothing, so the router's accuracy on real work is unmeasurable. And the finish report's `Gap:` lines are the plan-quality metric — what the planner keeps failing to specify — which `history.jsonl` counts and never keeps the text of.

**Options as they were put.** (a) Nothing. (b) `overrode: bool` and the rate in `status`. (c) (b) plus the text of the last N gaps.

**Taken (user, option c).** `history.jsonl` gains `overrode: boolean` and `gapTexts: string[]`. Neither needs a new CLI form: the ledger already holds `Route: <path> <type>`, written **only when the path changed at confirmation** (`FORMATS.md §6`), so `overrode` is the presence of that line, and `gapTexts` is the text of the `Gap:` lines the ledger already carries. `status` reports the override rate over the finished tasks of the last 30 days beside the upgrade rate, and lists the five most recent gap texts with their slug.

This is **not** a learnings store. Nothing reads these fields back into a prompt. They show the developer data they already own; a gap that appears four times is a sentence a person writes into `references/plan.md`, with the evidence in front of them.

**Cost if wrong.** Two fields and one `status` section. If the gap texts turn out to be noise the section goes and the override rate stays. **Applied in.** `scripts/ledger.mjs`, `skills/status/SKILL.md`, `FORMATS.md §1`, `COMPONENTS.md §1.5`.

### 0047 — The active task is keyed by session; `active` stays as the fallback (2026-09-02, Stage 8, proposal G)

**Context.** `.claude/hodos/active` is one pointer per project, and `run` claims it "every time, without checking" (`skills/run/SKILL.md:48`). `PreCompact`, `stop-gate.mjs` and `git-guard.mjs` all read that one file. Two terminals on one project is the normal mode of this build — a builder session beside a manual session — and Stage 5's two reviews found the capture race twice. The consequence is not a crash but silent misattribution: a `Compact:` line in another task's ledger, the Stop gate blocking the wrong session, `blockCommitOnFailedReview` denying a commit on a task that is not in `fix`.

**Options as they were put.** (a) Document "one hodos session per checkout". (b) `.claude/hodos/sessions/<session-id>` → slug, with `active` as the fallback. (c) `--slug` on every kernel call, leaving the race on hook events.

**Taken (user, option b).** The probe of 2026-09-02 (facts 37–39) closed the question by two independent paths: `CLAUDE_CODE_SESSION_ID` holds the session's **own** id in a `Bash` call and in the `` !`…` `` injection, is present interactively, and is unchanged across `--resume`; and the hooks need no variable at all, because `SessionStart` and `PreToolUse` payloads carry the same `session_id` and that half is documented.

- **Written** by `ledger.mjs`, the one writer of machine state: `init` writes `sessions/<id>` beside `active`, and a new `ledger.mjs claim <slug>` writes both — which is what `run` calls at the step where it used to write `active` itself.
- **Read** by resolution order, everywhere: the caller's session id (`session_id` from the hook payload, `CLAUDE_CODE_SESSION_ID` otherwise) → `sessions/<id>` → `active`. A machine where the id is unreachable takes exactly today's path.
- **Removed** on `Finish: report delivered` for the finishing session, next to `active`; and garbage-collected by `status`, which deletes a pointer whose transcript is gone or whose task directory no longer exists.

`active` is not deprecated. It is the single-session path, the fallback, and what a developer greps.

**Cost if wrong.** A directory of one-line files and one GC path. The failure mode of the undocumented half is a **fallback to today's behaviour**, not a wrong answer, because a missing id is detectable. Fact 37 is re-checked on every CLI minor upgrade under the re-probe rule. **Applied in.** `scripts/ledger.mjs`, `scripts/state-digest.mjs`, `scripts/stop-gate.mjs`, `scripts/git-guard.mjs`, `skills/run/SKILL.md`, `skills/status/SKILL.md`, `FORMATS.md §1`, `DESIGN.md §5.1`, `COMPONENTS.md §1.1`, `§1.2`, `§1.5`, `§3` and `§4`.

**Correction (Stage 8, review 1, minors 8 and 10).** This list first named `skills/task/SKILL.md`, which the change never touched and never needed to: `task` claims through `ledger.mjs init`, and the file mentions neither `active` nor the pointers. It also stopped at `COMPONENTS.md §1.5` and `§3`, leaving the contract in `§1.1`, `§1.2` and the `§4` `PreCompact` row still telling a kernel to write `.claude/hodos/active` itself — the race this decision removed, waiting for the next reader. Both are corrected above.

### 0048 — The `run` seeder also seeds `phase: finish`, with committed review and verify artifacts (2026-09-02, Stage 8)

**Context.** Stage 8's first criterion runs the finish phase, which folds `review.md` and `verify.md` into `plan.md#Outcome` and deletes them — so both files must exist in the seeded copy, and `--at verify` (decision 0043) writes neither. The criterion also needs `Gap:` and `Ruling:` lines and an open minor to report, and two arms for the rule-proposal rule: a pattern occurring twice earns a proposal, once earns an observation line. `COMPONENTS.md §7` enumerates the seeder's flags, so extending them is a spec change rather than a build step.

**Options as they were put.** (a) Committed artifacts beside the plan, plus `--at finish`. (b) Reach finish by running the review and verify loops live — two dispatches per arm and artifacts that vary between runs. (c) Hand-build the artifacts inside the test and the manual file, with no seeder endpoint.

**Taken (user, option a).** `bench/run/plans/<plan>.finish/{review,verify}.md` are committed beside the `.impl/` tree the same way; `--at finish` continues past `--at verify` by copying them into the task directory and writing the `Gap:`, `Ruling:` and `Verify 1: PASS …` lines through `ledger.mjs`. The finish phase is what the stage builds, and the arm that varies between runs would be the reviewer's judgement rather than the phase under test. `--rule-arm <one|two>` selects which review artifact is installed, so the ≥2-occurrences rule is exercised in both directions against the same plan.

**Cost if wrong.** One flag, two committed markdown files per plan. A seeded review that a real reviewer would not have written makes the finish report wrong in one direction only — it is the finish phase's *input*, and every claim the phase makes about it is checkable against the file. **Applied in.** `bench/run/seed.mjs`, `bench/run/README.md`, `COMPONENTS.md §7`.

### 0049 — A single-occurrence observation goes to the finish report and `plan.md#Outcome`, not the ledger (2026-09-02, Stage 8, proposal I)

**Context.** `DESIGN.md §7.5` scoped rule proposals — "only where a finding traces to a missing convention **and** the pattern occurs ≥2 times in the code (once → an observation in the ledger)" — and `FORMATS.md §6` is a closed grammar of sixteen forms with no observation among them. `ledger.mjs` rejects anything else with exit 1 and prints the grammar, so the parenthesis named a write that cannot happen. Found while writing `references/finish.md`, which had to choose.

**Options as they were put.** (a) Add a `Note: <text>` row to the grammar. (b) Reword `§7.5`: the observation goes to the finish report and to `plan.md#Outcome`. (c) Drop the observation entirely.

**Taken (user, option b).** The ledger's value is that every line in it derives a phase or a counter — sixteen forms a script parses, not a place for prose. An observation derives nothing; it is a sentence for a person, and `## Outcome` is the file that already holds sentences for a person and survives until the task directory is deleted. `DESIGN.md §7.5` says so now, and `references/finish.md §5` is written to it.

**Cost if wrong.** If observations turn out to be worth keeping past the task directory, they belong in `history.jsonl` beside `gapTexts` (decision 0046 built that shape), not in the ledger — so this is a step towards the field that would actually be read. **Applied in.** `DESIGN.md §7.5`, `skills/run/references/finish.md`.

### 0050 — A rule may be prescriptive: question 1 takes precedents **or** a decided target (2026-09-02, Stage 8, proposal J)

**Context.** Three files state question 1 of the rule test differently. `AUTHORING.md §10` — "≥2 precedents → cite them … Code violates it → this is a drift decision (choose one form, count violations, open a migration node)". `skills/init/references/rules.md:61` — "every accepted rule has ≥2 precedents **or an explicit drift decision**". `skills/rule/SKILL.md:28` — "None → not a rule yet", the only one of the three with no second branch, and the one the engine runs. (Both line citations are as the files read at `93a2412`; this decision rewrote both.) Meanwhile `finish.md §5` question 2 counts **occurrences of the violation** ("the finding's own location is one of them"). A reviewer finding is by construction a place the code does not follow the rule, so whenever the target shape has no exemplar the finish phase proposes, the developer accepts, and `rule` must refuse.

Observed live, Stage 8's manual run (`docs/stages/08-manual.md §5`): the developer answered *Write it* and nothing was written. `COMPONENTS.md §1.2`'s "an accepted proposal is written by invoking the `rule` skill … never by hand" was unreachable for the ordinary case. Raised as proposal J and put to the user, who rejected the framing of all three options and named the class they missed: **a rule is not only a record of what the code does, it is also a statement of what the code should do.** Introducing a new stack, replacing a data layer, correcting an architecture the engine judges wrong — all have zero precedents by definition, and all are exactly when a rule earns its context budget.

**Options as they were put.** (a) Leave it — the downstream gate held, at the cost of one unhonourable confirmation per finding. (b) `finish.md §5` counts precedents like `rule` does; zero → decision 0049's observation line. (c) Two counts, two outcomes: ≥2 precedents → a rule proposal routed to the skill, ≥2 violations with no precedent → a *convention proposal* reported and left with the developer, never routed. (d) Question 1 admits two forms of evidence — **descriptive**, ≥2 precedents cited; **prescriptive**, fewer than two precedents plus an explicit decision by the developer — and the report names which kind a proposal is.

**Taken (user, option d with (c)'s reporting split).** Question 1 stops being a gate on the code's past and becomes a gate on *what kind of evidence the rule carries*. The refusal stays where it always did the work: question 2, "would the model do it without the rule" — which a stack migration passes, because the model copies the code in front of it, which is the old stack.

Two guards keep this from becoming a licence to write wishes. **The decision is the developer's, never the model's**: a prescriptive rule is written only behind an explicit answer, and the finish phase's `AskUserQuestion` is that answer. And the form of `AUTHORING.md §10` does not move — the rule text describes the target and nothing else; the old shape is counted in a `## Migration` section of the rule, not hedged inside it as a legacy clause.

**The user's second point, which is larger than the proposal.** The engine will meet projects whose existing code is bad. Counting ≥2 precedents proves a convention *exists*, never that it is *good*, and a rule miner that treats frequency as justification writes the project's mistakes into the file that is loaded on every matching turn. So `§10` question 1 now says it: a precedent count is evidence of a convention, not a justification for one, and where the engine judges the established shape wrong it proposes the target instead — as a prescriptive rule, with the judgement stated as a judgement and the developer deciding. This lands hardest on `init`, whose scan area C mines rules from precedent counts alone; the alignment is Stage 10's, and it is in the backlog.

**Cost if wrong.** Prescriptive rules are cheaper to write than descriptive ones, so the failure mode is a `.claude/rules/` of aspirations the code contradicts everywhere. Three things make that visible rather than silent: the `## Migration` section carries the violation count, `lint.mjs --project` resolves its `file:line`s, and `status` reports rules whose precedents have moved. If it still happens, the next lever is a cap on prescriptive rules per project, not a return to the refusal. **Applied in.** `AUTHORING.md §10`, `DESIGN.md §7.5` and `§8`, `skills/rule/SKILL.md §2–3`, `skills/run/references/finish.md §5–6` and `§10`, `skills/init/references/rules.md`, `COMPONENTS.md §1.2`.

### 0051 — Rates need three finished tasks before they are printed as percentages (2026-09-02, Stage 8, review 1 minor 4)

**Context.** `skills/status/SKILL.md` prints the upgrade and override rates over a 30-day window and falls back to bare counts under three tasks. The number **3** appears in no decision, in neither `COMPONENTS.md §1.5` nor `DESIGN.md §13`'s numbers line: the builder introduced a threshold, which `CLAUDE.md` reserves for the user. Found by Stage 8's fresh review.

**Options as they were put.** (a) Keep 3 and record it as a decision. (b) Drop the branch — `2/5 (40%)` already carries both numbers, and the reader can see a small sample.

**Taken (user, option a).** One task out of two reads as 50% and two out of two as 100%, and a percentage invites a conclusion a two-task sample cannot support. The counts are printed either way; below three the percentage is withheld and the reason said.

**Cost if wrong.** A developer whose first three tasks are the ones they most want measured waits a task longer for a number they can already compute from the counts on screen. **Applied in.** `skills/status/SKILL.md` (the rates section), `COMPONENTS.md §1.5`.

### 0052 — The 9b stop is tripped by the map's own cross-repository fields as well as by the config (2026-09-02, Stage 9a, Q1)

**Context.** `BUILD-PLAN.md` Stage 9a asks that "a map whose `external[]` is non-empty" stop with `cross-repository campaigns are Stage 9b`. `external[]` is a **config** key (`FORMATS.md §2`, `campaigns.external[]`: paths to other repositories' `campaigns/` directories); a map carries its cross-repository markers in the node fields `repo:` and `path:` and in a `Done-metrics` row's ` · repo:` (`FORMATS.md §11`). Decision 0040 wrote "`external[]` stays in the `FORMATS.md §11` grammar", which is true of the fields but not of the key's name. Read literally, a map full of `repo:` nodes is processed by 9a with a lookup that does not exist — the half-resolution 0040 exists to forbid.

**Options as they were put.** (a) Config `external[]` non-empty, **or** any node line with a non-empty `repo:`/`path:`, **or** any metric row with ` · repo:` — all three fields still round-tripped byte-identically. (b) Config `external[]` only, the literal reading. (c) The map's own fields only, the configured directory silently unused.

**Taken (user, option a).** The stop is about whether a lookup would have to cross a repository boundary, and three things say it would. The grammar of `FORMATS.md §11` does not change and the fields are preserved on every rewrite, exactly as 0040 requires; what 9a refuses is to *act* on them.

**Cost if wrong.** A single-repository map that carries a decorative `repo:` field stops for nothing; the developer removes the field or waits for 9b. Visible immediately — the stop names the line it read. **Applied in.** `COMPONENTS.md §3` (`campaigns.mjs`), `BUILD-PLAN.md` Stage 9a acceptance, `scripts/campaigns.mjs`, `skills/campaign/references/map.md`.

### 0053 — The frontier is `ready` **and** dependencies met; a ready node with an open dependency is reported as held (2026-09-02, Stage 9a, Q2)

**Context.** A node line carries both a human-written status (`FORMATS.md §11`: `fog · ready · blocked · active · review · done · dropped`) and a `deps:` list of node names. Nothing keeps the two in step: a node marked `[ready]` before its dependency was cut can stay `[ready]` after the dependency is added. `campaigns.mjs frontier` feeds `status`, the digest, and the node the `campaign` skill proposes, so a drifted status proposes work whose dependency is not done.

**Options as they were put.** (a) Frontier = `ready` nodes whose `deps` are all `done` or `dropped`; a ready node with an open dependency prints as `held by <dep>` and is not proposed. (b) The status is the truth, `deps` ignored. (c) `deps` are the truth, statuses advisory.

**Taken (user, option a).** Two sources of truth exist whether or not the script reads both; reading both is how the disagreement becomes visible instead of silent. `held` is a line in the script's output, **not** a status in the map's grammar — nothing new is written into a map, and `FORMATS.md §11`'s status set is unchanged. Option (c) was refused for the reason (a) exists: a deliberate `[blocked]` is a human's judgement and outranks a satisfied dependency list.

**Cost if wrong.** A campaign whose `deps` are stale sees its frontier under-report, and the developer edits the map — one line, visible, versus starting a node whose dependency is open. **Applied in.** `COMPONENTS.md §3`, `scripts/campaigns.mjs`, `skills/campaign/references/map.md`, `skills/status/SKILL.md`.

### 0054 — `campaigns.mjs claim` takes the task slug as an optional `--ref` (2026-09-02, Stage 9a, Q3)

**Context.** `COMPONENTS.md §3` gives `claim <slug> <node> <owner> <branch>`, which writes no `ref:`. `FORMATS.md §11` requires an active node to carry `ref: task:<slug>`, and the task slug is not the node name by construction: `ledger.mjs init` normalizes and de-duplicates, so a second node named `orders-summary` opens the task `orders-summary-2`. Assuming slug = node writes a `ref:` pointing at a task directory that does not exist, and nothing reads it closely enough to notice.

**Options as they were put.** (a) `claim <campaign> <node> <owner> <branch> [--ref task:<slug>]`, defaulting to `task:<node>`. (b) Always `task:<node>`. (c) Replace `claim` with a generic `set <campaign> <node> --<field> <value>`.

**Taken (user, option a).** One optional flag on an existing row of `COMPONENTS.md §3`; the caller that knows the real slug — the `campaign` skill, which has just watched `ledger.mjs init` print it — passes it, and a call that does not know it gets the name it asked for. Option (c) was refused because the campaign procedure calls a named operation, and a generic setter moves the meaning of "claim" into the call site.

**Cost if wrong.** A caller that forgets the flag writes a `ref:` one de-duplication away from the truth, which is where (b) starts. Visible in `status`, which prints the node's `ref:` beside the task list. **Applied in.** `COMPONENTS.md §3`, `scripts/campaigns.mjs`, `skills/campaign/references/map.md`.

### 0055 — `measure` echoes each metric command and runs it under a 60-second timeout (2026-09-02, Stage 9a, Q4)

**Context.** The `Done-metrics` table of `FORMATS.md §11` holds shell commands — `grep -rl createSlice src | wc -l` — and `campaigns.mjs measure` runs them to refresh the `Current (date)` cells. The map is a tracked file: the command may have been written and committed by a teammate, and it runs on every advance and every node finish. The realistic failure is not a hostile command but a `grep -r` over a repository large enough to hang the run with no output.

**Options as they were put.** (a) Print each command before running it, run with a 60-second per-command timeout, no confirmation; a timed-out metric's cell says so with the reason. (b) Run as specified — the map is a repository file like any script, and hodos already runs `config.commands.test`. (c) Ask the developer to confirm the metric block the first time a map is measured in a session.

**Taken (user, option a).** The echo makes what ran readable in the transcript, which is what a developer needs when a number moves unexpectedly; the timeout bounds the one failure that otherwise has no floor. **60 seconds** is the threshold, recorded here because `CLAUDE.md` reserves thresholds for the user: a metric that cannot be measured in a minute is a metric to rewrite, not to wait for. Option (c) was refused for putting a stop on every advance run, against `DESIGN.md §4.4`'s list of what earns one.

**Cost if wrong.** A legitimately slow metric on a large repository reports `not measured (timed out after 60s)` and its previous value stays in the cell with its old date, so nothing is silently wrong. Reversible: the number is one constant, and a config key for it is a later decision if a real project needs one. **Applied in.** `COMPONENTS.md §3`, `scripts/campaigns.mjs`, `FORMATS.md §11`.

### 0056 — `campaigns.mjs set`, and a `node-done` that names the lines it just made stale (2026-09-02, Stage 9a, proposal M)

**Context.** Session A of `docs/stages/09a-manual.md` closed the research node `a11y-audit` with `node-done`. Two other nodes read `[blocked] … · by: focus-state-design, a11y-audit` and `[blocked] … · by: enforcement-shape, semantics-and-names`; after the close, both `by:` fields named a node that was done and neither status moved. The script's verbs were `find`, `frontier`, `claim`, `node-done`, `measure` — none writes a `by:` or a status outside those two transitions — so the session **edited two node lines by hand**, which is the anti-pattern `skills/campaign/references/map.md` names in its own last paragraph. The session flagged the edit rather than hiding it (commit `d87edf5` of the manual copy), which is the run working; the gap is real either way.

Decision 0053 is why this cannot simply be automatic: a deliberate `[blocked]` is a human's judgement and outranks a satisfied dependency list, so a script that flips `blocked → ready` on its own overrules the person who wrote the map.

**Options as they were put.** (a) `node-done` clears the closed node out of every other node's `by:` and flips those whose `by:` empties. (b) A general `set <campaign> <node> --status|--by|--deps|--owner|--branch|--ref|--metric <value>` verb. (c) (b) plus a report line from `node-done` naming the nodes whose `by:` or `deps:` mention the node just closed. (d) Leave it.

**Taken (user, option c).** The script finds what a reader scanning a ten-node map misses, and the human keeps the judgement 0053 reserves for them. (a) overrules that judgement and breaks wherever `by:` is free text, which `FORMATS.md §11`'s own example (`by: backend billing API (SHOP-1049)`) is. (b) alone leaves the discovery to whoever remembers to look. (d) leaves the skill's own anti-pattern with no correct way to be obeyed, which is the worst of the four: a rule nobody can follow is a rule that teaches the reader to ignore rules.

`set` writes nothing it was not given and guesses no semantics; `node-done`'s report is text, and changes no line.

**Cost if wrong.** One more verb in a five-verb CLI and one more line after every `node-done`. **Applied in.** `COMPONENTS.md §3`, `scripts/campaigns.mjs`, `skills/campaign/references/map.md`.

### 0057 — `permissions.allow` is written to `.claude/settings.local.json`, resolved (2026-09-02, Stage 10, proposal F)

**Context.** `FORMATS.md §1` had `init` write `permissions.allow: ["Bash(node <absolute plugin root>/scripts/*)"]` into `.claude/settings.json` — the file a project commits and shares — while `skills/init/SKILL.md:54` wrote the **literal** `${CLAUDE_PLUGIN_ROOT}`, which a project settings file has no context to expand. Both halves are the same mistake seen from two sides: the value is machine-specific, and the file was the shared one. `BACKLOG.md` carried the literal-vs-resolved half; proposal F carried the other.

**Options as they were put.** (a) Keep it in `settings.json` and document that each developer fixes the path. (b) `permissions.allow` goes to `.claude/settings.local.json` — the file Claude Code gitignores — the approval names the file it writes, and `settings.json` keeps only what is genuinely shared: an approved hook.

**Taken (user, option b).** The allow rule names one machine's plugin root, and the file whose name says so already exists. The path is written **resolved**, because that is the form the rule has to carry and a local file is where a resolved path belongs. Declining still costs one permission prompt per script call and nothing else, so it stays offered rather than assumed.

`init` also appends `.claude/settings.local.json` to `.gitignore` beside the four hodos entries it already writes, because a decision that rests on a file being untracked is worth one line of guarantee.

**Cost if wrong.** A developer who wanted the rule shared writes it into `settings.json` by hand. **Applied in.** `FORMATS.md §1`, `COMPONENTS.md §1.3`, `skills/init/SKILL.md`.

### 0058 — The `init` preflight is `config.mjs preflight`: the version floor and the version-manager warning (2026-09-02, Stage 10, amends 0041)

**Context.** Decision 0041 deferred an `init` preflight — `node --version`, stop with the prerequisite — to this stage. Fact 42 then measured the failure it was written for: on a machine with no `node`, both `SessionStart` hooks report `Executable not found in $PATH: "node"`, the kernel's `` !`node …` `` injection aborts the invocation, and the run ends at **turn 0** with the missing executable named. A preflight in the skill body is unreachable in exactly that case. Fact 42's second half is the one nothing catches: nvm defines `node` as a shell function, the Bash tool and the `!` injection both go through the user's login shell, and the hooks are spawned without it — so a machine can have `node` for every kernel and for no hook.

**Options as they were put.** (a) The presence check as 0041 wrote it, as prose in the kernel. (b) `config.mjs preflight`: `node` present, its version at or above the floor `package.json` declares, and a **warning** when `node` resolves under a version manager's directory (`$NVM_DIR`, `~/.nvm`, `~/.fnm`, an `asdf` shim), naming what it means for hooks. (c) Build nothing and amend 0041 with fact 42's finding.

**Taken (user, option b).** The two failures a preflight can still reach are a version below the floor and the nvm shadow, and the second is invisible until six hooks fail quietly in someone else's session. A script rather than prose, so the check is test-first and mutation-proven (decision 0022) and `status` can call it later; the warning does not stop `init`, because a machine where the kernels work is a machine where the layer is worth writing.

**Cost if wrong.** One subcommand and its tests; a false warning names a directory the developer recognises and costs one sentence to ignore. **Applied in.** `COMPONENTS.md §3`, `scripts/config.mjs`, `skills/init/SKILL.md`, `PLATFORM-NOTES.md` fact 42's consequence, and `BUILD-PLAN.md` Stage 10, whose acceptance row still described the presence check this decision replaced.

### 0059 — The Rust rule row moves to Stage 12; `sources/rust.md` ships here with its URLs checked live (2026-09-02, Stage 10)

**Context.** Stage 10's acceptance asks that at least one rule on the pilot's language originate from `sources/rust.md` with its URL. There is no Rust fixture — `bench/fixtures/` is `webapp`, `api`, `mono`, `kit`, all JavaScript — and `CLAUDE.md`'s standing rule forbids running hodos against a real project before Stage 12.

**Options as they were put.** (a) Two manual sessions, the Rust row moved to Stage 12; `sources/rust.md` ships now and every URL is fetched live here. (b) A fifth fixture `bench/fixtures/rust/` with its own crate, conventions and CI toolchain step, and a third manual session against it. (c) A throwaway crate outside `bench/fixtures/`.

**Taken (user, option a).** What the row is worth is that `sources/rust.md` works on the pilot, and the pilot is Stage 12's real Rust repository. The mechanism the row tests — a source-derived candidate through the three-question filter, carrying its URL — is proven here on `sources/testing.md` against `webapp`; a synthetic crate would prove the same mechanism a second time and the pointers not at all. (b) also costs a spec change to `COMPONENTS.md §7`, a CI toolchain step, and about 10% more of a five-hour window. (c) breaks the letter of a standing rule for the same synthetic evidence.

**Cost if wrong.** A pointer in `sources/rust.md` that is stale or wrong is discovered at the pilot, where a source file is one edit and no code. The stage report records the row under *Not done* with this reason. **Applied in.** `BUILD-PLAN.md` Stage 10 and Stage 12, `sources/rust.md`, `COMPONENTS.md §6`.

### 0060 — A subproject earns a nested config when its commands differ from the root's, workspace member or not (2026-09-02, Stage 10)

**Context.** `skills/init/references/scan.md` defined a nested project as "a manifest below the root that no workspace declaration covers". `bench/fixtures/mono` declares `workspaces: ["web", "svc"]`, so under that sentence neither subproject is nested and Stage 10's criterion — root **plus** nested configs, `config.mjs find` from a subproject returning the merge — is unreachable on the one fixture built for it. The commands genuinely differ: the root runs `npm test --workspaces`, `web` runs `vitest run`, `svc` runs `node --test src/*.test.js`.

**Options as they were put.** (a) Amend the sentence: what earns a nested config is commands that differ from the root's, workspace member or not. (b) Keep the sentence, rewrite the criterion, and verify check G on a subproject outside `workspaces`.

**Taken (user, option a).** A workspace declaration says how dependencies resolve; it says nothing about which command verifies a change, and the command is what `config.json` exists to record. A reviewer handed `npm test --workspaces` for a change inside `svc` runs the whole monorepo to check one package. (b) also costs an edit to `BUILD-PLAN.md`'s criterion and leaves the `mono` fixture not covering the thing it was built for.

**Cost if wrong.** A monorepo whose members share one command gets one config, which is what the "only when they differ" half already said. **Applied in.** `skills/init/references/scan.md`, `skills/init/SKILL.md`, `FORMATS.md §1`.

### 0061 — The role set is widened to eight, and every one of them is read by a phase in this stage (2026-09-02, Stage 10b, proposal K)

**Context.** `DESIGN.md §3.2` says phases call **roles**, never tools, and `config.adapters` selects one adapter per role. Four roles were declared and closed (`config.mjs:236`); exactly one was read by a phase — `skills/run/references/verify-loop.md:7,46` reads `config.adapters.browser`. `codeIndex`, `design` and `tracker` appeared in no skill and no reference. A role that is configured and never read is the incident `config.mjs check` exists to catch one level up: the key is spelled correctly and still turns nothing on, and `init` reports it to the developer as a capability. The converse held too — `Context7` was named by vendor inside engine text at `skills/task/references/research.md:44`, `skills/task/references/design.md:53`, `skills/init/references/rules.md:17` and `DESIGN.md:36`, which is the coupling §3.2 exists to prevent.

**Options as they were put.** (a) Wire the three declared roles and add `docs` for the four call sites that already exist; every further role admitted only with its call site in the same commit. (b) Wire the three, add nothing — `Context7` stays hard-coded. (c) Widen the closed set now to cover common project needs (`docs`, `logs`, `db`, `ci`) and wire as demand appears. (d) Drop `codeIndex`, `design` and `tracker` until a phase needs them, leaving the set honest at one. The recommendation put to the user was (a), on the ground that a role admitted without a call site costs a config key forever, is reported to developers as a feature, and is not reversible after 0.1.

**Taken (user, option c), with a second question the choice forced.** The closed set is eight: `browser`, `docs`, `codeIndex`, `design`, `tracker`, `logs`, `db`, `ci`. Because the stage's own acceptance criterion 1 — *every role in the settled list is read by a phase; a role with no hit fails the stage* — was written for option (a), the user was asked which roles get a call site in this stage. **Option (ii): all eight.** Criterion 1 therefore stands unchanged, and the three roles that had no call site get one written here:

| role | the call site written in this stage | what it reads |
|---|---|---|
| `logs` | `route.md §7`, the `bug` red loop | production's account of the failure, instead of the developer's retelling |
| `ci` | `route.md §7`, the same section | the failing pipeline run's log, which is where a red-capable command usually already exists |
| `db` | `design.md`, beside `### Data & scale` | the live schema, once, materialized into the field, instead of inferred from a migrations directory |

Both `route.md` additions sit **after** the verdict, so neither spends the router's ≤5 evidence calls (decision 0029).

**What this decision knowingly costs.** Eight keys are published at 0.1 and none is removable afterwards without a breaking change to a file projects commit. Three of the eight get a phase step written with no incident behind it, which is the opposite of the evidence policy `AUTHORING.md §13` applies to a wording change; the option's own preview said so before it was chosen. The mitigation inside the stage is that each new step is written so the absence of the role is the normal case: the role is `null` by default, the step reports `Skip: <role> unavailable`, and nothing downstream depends on it. Whether the three earn their place is a Stage 12 measurement, not a claim this stage makes.

**Cost if wrong.** A role that stays dead is a config key hodos carries and a paragraph in a phase reference that always reports `Skip`. Removing one after 0.1 is the breaking change the asymmetry above names, so the recovery is to leave the key and delete the paragraph. **Applied in.** `DESIGN.md §3.2`, `COMPONENTS.md §5`, `FORMATS.md §2`, `scripts/config.mjs`, `skills/task/references/route.md`, `research.md`, `design.md`, `plan.md`, `skills/run/references/finish.md`, `skills/init/references/rules.md`, and `adapters/docs/context7.md`.

### 0062 — Projects extend the adapter set: `.claude/hodos/adapters/`, the `project:` prefix, and `/hodos:adapter` (2026-09-02, Stage 10b, proposal L)

**Context.** Every adapter shipped with the plugin. `config.mjs` rejected any value it could not find under `<plugin>/adapters/<role>/` with `no adapters/<role>/<value>.md ships with hodos`, and all three resolution sites hard-coded the plugin root (`verify-loop.md:46,63`, `init/SKILL.md:50`, `init/references/scan.md:54`). A project whose MCP server hodos ships no adapter for got `null` and a permanent `Skip` — which is most projects, and after decision 0061 it is three of the eight roles by construction. The project layer already mirrored the engine for two artifact kinds, each with a writing skill and a `--project` lint row: rules (`/hodos:rule`) and skills (`/hodos:skill`). Adapters are the third row of a table that already existed. It also settles a broken instruction rather than adding one: `scan.md:54` told the model that a project which named its server differently should keep the adapter's operations and "record that in the config's adapter entry", where the entry is a bare filename string with nowhere to record a prefix.

**Options as they were put, and what the user chose on 2026-09-02 in the design session that raised the proposal.** *Where the file lives:* (a) `.claude/hodos/adapters/<role>/<tool>.md`, tracked in git like `campaigns/`; (b) `.claude/adapters/`, outside the hodos layer. **Chosen (a).** *How the config names it:* (a) a `"project:<name>"` prefix; (b) search order, project before plugin, which lets a project shadow a shipped adapter invisibly; (c) a path relative to `.claude/hodos/`, which invites paths out of the layer. **Chosen (a).** *Who writes it:* (a) a new small skill `/hodos:adapter`, `disable-model-invocation: true`, cap 100, mirroring `rule` and `skill`; (b) fold into `/hodos:skill`, refused by that skill's own first question since an adapter is not a procedure with ordered steps; (c) `init` only, which runs once while a server arrives later. **Chosen (a).** *What lint checks:* (a) the `FORMATS.md §13` shape, and that every operation's `mcp__<server>__` prefix names a server in the project's `.mcp.json`; (b) the prefix only; (c) the 30-line cap alone, as before. **Chosen (a)**, for shipped and project adapters alike.

**Taken (user, all four as recorded), and built in Stage 10b.** What was open at this stage's Start was not the shape but the timing, and the answer was to build it here: the format of `config.adapters.<role>` is published at 0.1, so an extension point added afterwards is a breaking change to a file projects commit.

The lint check is two checks and one rule. Every adapter: each operation's `mcp__<server>__` prefix matches the file's own `server:` field, which catches a shipped `browser/chrome-devtools.md` naming a playwright tool. Project adapters additionally: the `server:` value is a key of the project's `.mcp.json`. The second is what proposal L asked for; the first is what makes it apply to the files the plugin ships, which have no `.mcp.json` to check against.

The skill's three questions keep the shape `rule` and `skill` established — the first refuses, the third decides the content. **1. Is the server there?** Read the project's `.mcp.json` and the session's tool list; no server in either → refuse, the role stays `null`, the phase reports `Skip`. An invented tool id is worse than no adapter: it turns an explicit skip into a failed call. A server live in the session but absent from `.mcp.json` is named as such and added to `.mcp.json` before the file is written, which is the distinction `scan.md` already drew for candidates and the condition the lint check depends on. **2. Does a phase call this role?** Not one of the eight → refuse and name the alternative: a verify recipe of `kind: command`, or `/hodos:skill` — and, since decision **0067**, the channel a ninth role goes through: an issue against hodos naming the role, its operations and the phase that would call it, built at Stage 11b-3. **3. What does the tool's schema not say?** The no-op test applied to an adapter: one that restates the signature is what ToolSearch gives free. Gotchas come from the server's documentation, from the developer, or from calling one read-only operation once and recording what it printed.

**Cost if wrong.** The `project:` prefix is one token in a value and one branch in `config.mjs`; if it proves wrong the search-order form is reachable from it, not the other way round. The skill is ≤100 lines beside two that already work. **Applied in.** `DESIGN.md §3.1–3.2`, `COMPONENTS.md §1` and `§5`, `FORMATS.md §2` and `§13`, `AUTHORING.md §7` and `§12`, `scripts/config.mjs`, `scripts/lint.mjs`, `skills/adapter/SKILL.md`, `skills/init/SKILL.md`, `skills/init/references/scan.md`, `skills/run/references/verify-loop.md`.

### 0063 — Stage 11 splits into 11a (the bench) and 11b (the release), and each scored run runs once (2026-09-03, Stage 11a Start, Q1 and Q8)

**Context.** Stage 11's entry carries two bodies of work that share only a stage number: bringing three benches to a gated, scored state, and the release pass — scrub, documentation, CI, publication, 0.1.0. Fourteen tasks, two of them scored model runs. `STAGE-PROTOCOL.md §6` puts one stage in one session, and `§4` sends one fresh reviewer at the whole diff; a fourteen-task diff is a reviewer who re-runs everything or samples, and sampling is what the review exists to prevent. The release half also *depends* on the bench half: README's "cost expectations" and `BENCH.md`'s numbers do not exist until the runs are made.

**Options.** (a) Split into 11a and 11b, as decision 0040 split 09 and 10b split 10. (b) One stage across two or three sessions, with `11-plan.md` as the ledger. (c) Move the release pass into Stage 12, which already runs with the user present.

**Taken: (a).** The lettering rule of `FORMATS.md §15` already exists for exactly this, the base tag follows it (`stage-11a-base`), and every cross-reference to "Stage 11" elsewhere in `docs/` resolves to the pair. (c) was declined because Stage 12 runs against a real repository and its findings must be attributable to the engine, not to a release pass happening in the same session.

**The spend rule, restated for a stage with two scored runs (Q8).** The router bench and the `noop` bench each run **once**. Run 1 of the router cost `$15.41` and about a quarter of a five-hour usage window; `noop`'s first run is estimated at `$5–10`. A gate that comes back under its threshold is a result with a diagnosis, not a reason to re-dispatch: re-running until a number arrives is fitting the gate to the run, which is the objection Stage 6 already recorded against its own `1c`. The review bench is **not** re-run — see 0064's neighbour in this stage's plan, D3.

**Cost if wrong.** Two report files and two review passes instead of one. **Applied in.** `BUILD-PLAN.md` (Progress and the Stage 11 entry), `docs/stages/11a-plan.md`, `docs/README.md`.

### 0064 — What is published, and when: the specification ships, the build record does not (2026-09-03, Stage 11a Start, Q2, Q3 and Q4)

**Context.** `plugin.json` names `https://github.com/minddecay/hodos`; no such repository exists and the checkout has no remote. Three acceptance criteria depend on one: `claude plugin install hodos@hodos` from a clean machine, CI actually running `claude plugin validate --strict .` on a runner, and — after this stage's proposal O — a public channel a developer can be pointed at. A marketplace install **clones the repository**, so whatever the repository holds lands on every installing machine: `research/01` is a survey of the user's employer's repositories (~15 name hits), and `docs/stages/` is 17 stage records that no installer reads.

**Options, in the order they were put.** *When:* (a) create the repository public at the start of 11b, after the scrub; (b) public now, so CI runs from the first push; (c) private now, public at 0.1.0; (d) no repository, three criteria FAIL. **Chosen (a)** — git history keeps whatever the first push contained, so the scrub decides before anything is pushed rather than after. *What:* (a) move `research/` and `docs/stages/` to a private sibling `hodos-build`, leaving the specification (`docs/*.md`) in the public repository; (b) redact and ship everything; (c) ship as is. **Chosen (a)** — (b) costs a redaction of ~15 hits plus `FORMATS.md §11`'s example, `DECISIONS.md` 0021, `00-decisions.md` and every stage manual, and is irreversible once cloned; (c) fails the stage's own publication criterion on purpose. *The skills.sh channel:* (a) one probe in 11b after publication, and the claim leaves `README.md` and `DESIGN.md` if it fails; (b) drop it now without a probe; (c) build a prose-only arm of every kernel so the channel works. **Chosen (a)** — (c) is a second implementation of every kernel, and two texts for one phase diverge at the first change.

**What this decision knowingly costs.** The evidence base and the build record stop being one clone away from the specification that cites them. `docs/README.md` keeps pointing at `research/01..05` and `docs/stages/`, and those pointers resolve only for someone with the second repository — the specification says so in the line that names them rather than leaving a reader to discover it. The mitigation is that nothing in the *engine* cites a stage file: `lint.mjs` resolves `` `DOC.md §N` `` citations, and a citation into `docs/stages/` from a skill or reference would be a lint failure today.

**Cost if wrong.** Moving two directories back is a commit; publishing them was the irreversible direction, which is why the reversible one is taken first. **Applied in.** `docs/README.md`, `BUILD-PLAN.md` Stage 11b, `README.md`, `DESIGN.md §1`, and the 11b scrub.

### 0065 — The review package is stat-first for generated files, with a hard cap behind it (2026-09-03, Stage 11a Start, proposal C)

**Context and options:** proposal **C** above, raised from `research/05` P5 and deferred by `06-plan.md` D2 on the correct ground that a threshold is a decision. `scripts/review-package.mjs` runs with `maxBuffer: 256 MB` and no rule for generated content; a `Cargo.lock`, a `package-lock.json`, a snapshot file or a generated client enters an opus context whole at `-U10`, and the reviewer's recall on the real hunks drops with nothing reporting it. Stage 12's pilot is Rust.

**Taken: (b) with (c) behind it.** Full hunks for source; stat-only lines for files matching `config.review.generated` (default globs: lockfiles, `*.snap`, `dist/`, `generated/`); a `## Not packaged` section the reviewer copies into its Coverage line, so the omission is visible **in the review** rather than silent; and a hard byte cap that exits 1 naming the offending files. (b) alone leaves a genuinely huge source change unbounded; (c) alone turns a routine lockfile bump into a stopped run.

**Cost if wrong.** A default glob that is too eager hides a file the reviewer should have seen — visible as a Coverage line naming it, which is why `## Not packaged` is part of the mechanism and not an extra. Reversible per project through `config.review.generated`. **Applied in.** `FORMATS.md §2` and `§8`, `COMPONENTS.md §3`, `scripts/review-package.mjs`, `scripts/config.mjs`.

**Why `agents/hodos-reviewer.md` is not among them.** The instruction to name the omission lives in the `## Not packaged` section itself, which is an input the reviewer reads whole, and step 7 of the prompt already says *"Coverage, then write. Name what you did not review."* Putting it in the agent definition as well would edit the reviewer's prompt after the review-bench run this stage cites (2026-09-02) — a second prompt delta on a number nobody re-measured, for a sentence the package can carry itself. The cap is 1,000,000 bytes, chosen inside this decision rather than by it: generous by construction, since the rule above handles the routine case, and per-project through `config.review.maxBytes`.

### 0066 — `skills/init/references/config.md`: the write step reads a reference, not the specification (2026-09-03, Stage 11a Start, proposal N)

**Context and options:** proposal **N** above, raised at Stage 10's Start from `research/05` I2. `skills/init/SKILL.md`'s write step sends the model to `docs/FORMATS.md §1–2` at runtime, which makes a 460-line specification written for a human building the engine an input of every `init` run.

**Taken: (a).** A `references/config.md` of ≤60 lines: the field list, the value ranges, and the four fields `init` computes (`commands.*`, `scanSha`, `verifiedAt`, `nested[]`), with `FORMATS.md §2` staying the specification it is derived from. `config.mjs check` stays where it is at step 7 — a schema says which keys are legal, not which four `init` has to compute or where their values come from, so the two are not alternatives. The risk is the one every derived document carries, drift, and the mitigation is the one this repository already runs: the lint resolves every `` `DOC.md §N` `` citation and the reference cites its section.

**Cost if wrong.** One file under `references/` and one line in `COMPONENTS.md §1.3`; deleting it restores the read it replaced. **Applied in.** `COMPONENTS.md §1.3`, `skills/init/SKILL.md`, `skills/init/references/config.md`.

### 0067 — The closed role set names its channel: one sentence, pointing at the issue tracker (2026-09-03, Stage 11a Start, proposal O)

**Context and options:** proposal **O** above, raised by Stage 10b's manual run M2. `/hodos:adapter`'s question 2 refuses a need outside the eight roles and stops there. The skill as first built filled that silence itself with a third bullet — "a change to `DESIGN.md §3.2`" — that no decision authorized and that a project developer cannot act on, since `DESIGN.md` belongs to the installed plugin. The bullet was removed at review; what stayed missing is the answer to "then what?".

**Taken: (b).** One sentence in the refusal: open an issue against hodos naming the role, its operations, and the phase that would call it. It is a pointer, never an instruction to edit the plugin's files, and it lands in 11b because the channel it names has to exist first (0064). (c), a `config.adapters.custom{}` escape hatch, reopens what decision 0061 closed: a role no phase reads is a config key that turns nothing on.

**Cost if wrong.** One line in `skills/adapter/SKILL.md §2` and one clause in decision 0062's question-2 paragraph; deleting it restores the silence. **Applied in.** `skills/adapter/SKILL.md`, `DECISIONS.md` 0062, `BUILD-PLAN.md` Stage 10b criterion 5.

### 0068 — Rows 2 and 3 of the router checklist get a decidable test (2026-09-03, Stage 11a, proposal P)

**Context.** `04-report.md`'s diagnosis of router run 1, read off the 35 saved streams: in every miss the router applied the six rules correctly to its own rows, and seven of the thirteen path misses turn on what a row *means* — four on whether a new file inside an existing feature is a new module, three on whether adding a variant to an exported union is a contract change. Both rows feed rule 3 (`rows 2 and 3 both yes` → **deep**) and rule 5 (`quick` requires rows 2–5 `no`), so the reading decides the path. `FORMATS.md §3` named the rows and defined neither. Repairing `set.json` alone would have left the set's author and the router reading the same row two ways, with the gate measuring the ambiguity.

**Options.** (a) Define both, row 3 **narrow**: a change an existing caller must react to. (b) Define both, row 3 **broad**: any change to a published surface, additive widening included. (c) Repair the set only, leaving the rows undefined. (d) Drop rows 2–3 from rule 3.

**Taken: (a).** The two tests, as they now stand in `FORMATS.md §3`:

- **new module** — `yes` when the change adds a file, directory, or package that something outside its own directory imports; `no` when everything it adds is imported only from within the directory it sits in.
  *Amended the same day, before any label was derived from it:* the first wording spoke of a new **directory, package, or entry point**, which left a single new file inside an existing directory — `src/http/body.js`, imported by `server.js` — answerable neither `yes` nor `no`. The test above is total.
- **contract / schema / route change** — `yes` when the change adds, removes, or alters an interface something outside the changed files depends on by name: an HTTP route or its request/response shape, a persisted schema or stored format, or an exported signature. Widening one of those so that every existing caller stays correct — a new variant on an exported union, a new optional parameter, a new optional field — is `no`.

(b) is the "burden of proof on the lighter path" reading, and it is the one that kills the row: in a typed codebase almost every feature touches an exported type, so row 3 becomes `yes` for nearly everything and `quick` stops being reachable. Row 1 already carries size and rows 4–5 carry the two irreversible kinds. (c) leaves the disagreement to reappear on the pilot, where there is no set author to blame it on. (d) removes the only trigger that reads "wide **and** new".

**The honesty risk, recorded before the run.** These are the readings the model used in run 1, chosen after seeing which way it read them — the shape of fitting a rule to a result. Two things hold against it: each test is derived from the row's stated purpose (blast radius — does something outside this change have to be considered), and the effect on the set's labels was written down before the scored run rather than after. Under this decision `q04` (a `warning` tone on `Badge`'s exported union) stays `quick`, `s06` (a body reader moved into `src/http/`) is `standard` with `new module: yes`, and `s10` (a `roundTo` option threaded through `applyTax`) loses its `contract: yes` and stays `standard` on its file count. Whether the gate passes is the run's answer, not this decision's.

**Cost if wrong.** Two sentences in `FORMATS.md §3` and their evidence rows in `route.md`; a wrong reading surfaces as a routing complaint on the pilot and is one commit to change, with the set re-derived by `--check-labels`. **Applied in.** `FORMATS.md §3`, `DESIGN.md §4.1`, `skills/task/references/route.md`, `bench/router/set.json`.

### 0069 — Rule 3's "many files" is row 1 above the `quick` limit (2026-09-03, Stage 11a, T9)

**Context.** Rule 3 of `FORMATS.md §3` has a second clause — "type `refactor` with a countable metric across many files" — and never said what "many" is. `bench/router/run.mjs` has had to answer since Stage 2: `isWide` reads it as more than row 1's `quick` limit, and `02-plan.md` D8 recorded that reading while `02-review.md`'s minor 3 recorded that no `DECISIONS.md` entry was opened for it, "which the standing rule requires of a threshold nobody has decided". The gap stayed open for nine stages because nothing measured it.

Router run 2 measured it. Two of the seven path misses are this word, and the transcripts say so in their own printed rationale: `d04` — "the done-metric covers four enumerated files, not `many`" — and `d05` — "the refactor's done-metric spans 2 files, not many". Both sessions applied rule 3, reached the undefined word, and declined it. `d05` also shows the second ambiguity: it measured the *done-metric's* span (two components under `ui/`) where the scorer measures the change's row 1 (five files). One sentence, two readings, two wrong verdicts.

**Options.** (a) Row 1's `quick` limit — the clause is wide when row 1 is above 3. (b) A number of rule 3's own, decided here. (c) Leave "many" to judgement and drop the clause from the scorer, so the bench stops scoring a word the specification does not define. (d) Delete the clause: a wide countable refactor routes `standard` on its file count like anything else.

**Taken: (a).** It introduces no threshold — it names the one file count the specification already decided, and it is what the reference implementation has computed since Stage 2, so the fix removes a disagreement inside the mechanism rather than adding a rule. (b) is a second number to tune where one already exists, and nothing in the run says the boundary belongs anywhere else. (c) makes the clause unscoreable and hands the pilot the same ambiguity. (d) removes the only trigger that reads "wide **and** countable", which `DESIGN.md §4.1` puts the burden of proof behind.

**What this is not.** It is not a rule widened to make a case pass. The inconsistency is between `FORMATS.md §3` and `bench/router/run.mjs:82`, readable in the repository without any run; run 2 is the evidence that it costs verdicts, not the source of the fix. The re-run measures it; whether `d04` and `d05` move is the run's answer, not this decision's.

**Cost if wrong.** One clause in `FORMATS.md §3` and its copy in `route.md`; the scorer is unchanged, so a different limit is one edit and `--check-labels`. **Applied in.** `docs/FORMATS.md §3`, `skills/task/references/route.md §4`, `bench/router/run.mjs`, `bench/router/README.md`.

### 0070 — Row 1 sizes a `question` by what its answer rests on (2026-09-03, Stage 11a, proposal Q)

**Context.** The six verdict rules read the shape of the **change**. A `question` produces no change, so row 1 is 0, rows 2–5 are `no`, and rule 5 makes every question `quick` — whatever it takes to answer. `bench/router/set.json` needed one `standard` question and could only reach it by writing `files: unknown` into `s09`, a value the fixture contradicts and which the run's own session filled with `0` and the evidence "answering changes no files". `s09` is one of run 2's seven path misses and it is this and nothing else: the set had to write a row it cannot defend to hold a composition.

**Options.** (a) Accept it — a question is always `quick` unless rows 6–9 fire, and decision 0025's composition becomes 11/11/8/5. (b) Give the type its own sizing input. (c) Re-author `s09` as a case that is not a question.

**Taken: (b),** in the cheapest of its three forms. The two put to the user were a tenth checklist row and a rule of rule 3's kind; the one built is neither, and the difference is recorded here rather than glossed: **row 1 keeps its place and changes what it counts when the type is `question` — the files the answer rests on.** A tenth row costs a Glob and an evidence cell on every routing to serve one type in four; a seventh rule adds a branch to a list whose whole virtue is that it is six lines a human can hold. Row 1 already exists, already carries evidence, and already asks the estimator to Glob for the nouns of the intent — for a question that Glob returns the reading surface, which is the only size a question has.

Applied to the three question cases the reading is uniform, which is what keeps it from being a fix for `s09`: `q05` (which of two components decides field order) is `2` and stays `quick`, `q06` (where the 404 body is produced and what sets its code) is `3` — `server.js`, `respond.js`, `errors.js` — and stays `quick`, `s09` (what would have to change if the orders endpoint moved to cursor pagination) is `5` — `api.ts`, `model.ts`, `OrdersPage.tsx`, `OrderList.tsx`, `index.ts` — and is `standard` by rule 6. The composition holds at 10/12/8/5 and `--check-labels` re-derives every label.

**The exposure, recorded.** `q05` sits one file from rule 5's cut and its count is arguable between 2 and 4 — the run's own session listed four. Row 1 agrees between set and run 54.3% of the time, and this decision puts a fourth kind of task on that row. It is the cheapest form of what the user chose, not a repair of the row; the row's reliability is the open question this stage hands to Stage 12.

**Bounded after review 1.** The first wording — "the files the answer rests on" — had no bound, and review 1 was right that `s09`'s 5 was simultaneously the value that clears run 2's miss and the value that keeps decision 0025's composition. Both homes now say the files the answer **must name** to be complete, the ones a reader would have to open, rather than every file consulted to find them. `s09`'s five (`api.ts`, `model.ts`, `OrdersPage.tsx`, `OrderList.tsx`, `index.ts`) are all named by its answer; `q05`'s two are the two modules its question puts in the alternative. **The bound is unmeasured** — no run has been bought since — and the row's reliability goes to Stage 12 with the rest of row 1's, which agrees about half the time on three independent measurements.

**Cost if wrong.** One sentence in `FORMATS.md §3`, one table cell in `route.md`, three counts in the set. A tenth row remains available and is one commit. **Applied in.** `docs/FORMATS.md §3`, `skills/task/references/route.md §3`, `bench/router/set.json`, `bench/router/run.test.mjs`.

### 0071 — Row 6 names the two crossings that force a second merge; a wide countable refactor is `deep` (2026-09-03, Stage 11a, proposal R)

**Context.** `DESIGN.md §4.1` lists six campaign criteria and rows 6–9 of `FORMATS.md §3` carry four. Of the two left over: the **wide refactor with a countable done-metric** became rule 3's `deep` clause in Stage 2 and `DESIGN.md` went on calling it a campaign trigger, so two documents of one specification gave one criterion two verdicts; and **crossing bounded contexts, services, or repositories** had no row at all. `route.md` carried a sentence for it — "work that crosses a bounded context, a service, or a repository is a `yes`" — that `FORMATS.md §3` did not, which is a third home for a rule and the shape `AUTHORING.md §10` refuses.

Run 2's `c01` is that criterion word for word: "split `svc` into two packages, `tax` and `pricing`, and move `web` onto both". The set recorded it as `units: yes` for want of anywhere else to put it; the session read row 6 as written and answered `no` — "one branch: the `svc` removal and the `web` import rewrite must land atomically or `web` breaks; 6 source files, one repo". It was right about the row, the set was right about the work, and the row was what was missing.

**Options, for the missing criterion.** (a) A tenth row joining rule 1. (b) Widen row 6. (c) Drop the criterion from `DESIGN.md`. **Options, for the contradiction.** (i) `DESIGN.md` corrected to `deep`. (ii) `FORMATS.md §3` corrected to campaign.

**Taken: (b) and (i).** Row 6 now carries the two crossings that force a second merge on their own — work spanning **repositories**, and work that changes **which packages or services exist** (one created, removed, or split) — with the monorepo case ruled out in the same sentence: two packages one repository releases together are one merge, not a crossing.

That last clause is the decision's real content and it was written against the set rather than against `c01`. The first wording taken from the proposal — "spans more than one separately deployable or publishable unit" — is what the criterion says in `DESIGN.md`, and it is too broad: `s05`, `s10` and `d04` each touch `svc` and `web`, two packages of one monorepo, and all three would have become campaigns. A five-file change that lands in one branch and one review is not a campaign, and a criterion that says it is has stopped measuring merges. What separates `c01` from them is that it changes the set of packages rather than editing two of them.

(i) rather than (ii) because `DESIGN.md §9`'s campaign machinery — a node per task, each routed again — is heavier than a wide refactor needs, because rule 3 and the reference implementation have read it as `deep` since Stage 2, and because inverting it would send every refactor with a done-metric to a path that opens no task.

**Amended the same day, after run 3.** The carve-out was written into the two copies with different scope: `FORMATS.md §3` said "**Touching** two packages a single repository releases together is one merge", and the copy in `route.md` — the one the router reads — said "Two packages one repository releases together are one merge, not a crossing", with the limiting word gone. `c01`'s session applied the unscoped reading and named it as the thing to check: "the rule names 'one created, removed or split' as a crossing, and this splits `svc`; I read the following sentence … as the carve-out that applies here." It was reading what was written. Both copies now say **editing** two packages is one merge and creating, removing or splitting one is a crossing whatever the repository. The correction is a copy drift of the kind `AUTHORING.md §10` names, introduced by this decision and fixed within it; **it is not measured** — a re-run to bank one case is what the spend rule refuses, and every number that cites `c01` says the fix is unmeasured.

**A third crossing is dropped, and this decision is where that is recorded.** `DESIGN.md §4.1` said "crosses bounded contexts, services, or repositories". Row 6 takes over *services* and *repositories*; **bounded contexts** is not carried, and after this decision the phrase appears nowhere in the specification. It is dropped on purpose: a bounded context is a modelling judgement with no test the router can apply against a repository it has just met, and the two crossings that replace it — the set of packages or services changing, and more than one repository — are the ones that actually force a second merge. If the pilot shows a context boundary that neither reaches, the fix is a fourth positive test in row 6, not the phrase back.

**Restated after review 1.** The first form gave the rule and then carved out of it in the same cell, which is the shape `AUTHORING.md §14` refuses and the shape that misled `c01`'s session. Row 6 is now three positive tests with the monorepo case as an example rather than an exception, in the same words in both homes. **The restatement is unmeasured** — no run has been bought since.

**Cost if wrong.** Row 6's test in `FORMATS.md §3` and its cell in `route.md`, one sentence in `DESIGN.md §4.1`; no set label moves and no code changes. **Applied in.** `docs/FORMATS.md §3`, `docs/DESIGN.md §4.1`, `skills/task/references/route.md §3`.

### 0072 — Rule 3's second clause reads the type and row 1, and nothing else (2026-09-03, Stage 11a, proposal S)

**Context.** Decision 0069 defined the clause's width and left its other half — "a countable done-metric" — alone. Router run 3 priced it. `s12` ("build the class names with `clsx` instead of template strings", four files, a refactor) routed `deep`, and the session's rationale is unanswerable on the text as written: it supplied a countable done-metric of its own, "template-literal classNames in `src/` → 0". It was entitled to. `DESIGN.md §4.1` defines the `refactor` type as "target-first, **done-metric**, expand–contract for wide changes", so a done-metric is part of what the type *is* and the phrase selected nothing. After 0069 the clause therefore read: any refactor above three files is `deep`.

`bench/router/set.json` disagreed, but only through `wideCountableMetric`, a per-case boolean the set's author set on the three descriptions that state a metric in words ("until no `band: string` is left"). That reading appears nowhere in the specification, so the bench held a judgement the router had no way to reach — the same shape as the two defects 0069 and 0071 repaired: an input the nine rows do not hold, whose value the bench decides and the prose leaves open.

**Options.** (a) Say whose metric it is: the clause fires when the *intent states* one. (b) Accept the tautology: the clause reads the type and row 1, `wideCountableMetric` is deleted from the set and the scorer, `s11` and `s12` re-derive to `deep`. (c) Drop the clause entirely.

**Taken: (b).** The clause exists because a mechanical change across many files can alter behavior where nobody looked, and that is true whether or not the developer happened to phrase the request with a metric in it — (a) makes the path depend on the one input the developer controls and the router cannot check. (b) also deletes the side input, which is the defect itself: rule 3 now reads rows the checklist actually carries, and `--check-labels` reports any case that still carries the field so the old branch cannot come back silently. (c) removes the only trigger that reads "wide **and** mechanical", against `DESIGN.md §4.1`'s burden of proof on the lighter path.

**What it costs, stated plainly.** A `refactor` is now categorically heavier than a `feature` at the same width: four files of feature work is `standard`, four files of refactor work is `deep`. Two set labels moved (`s11`, `s12` → `deep`) and decision 0025's composition is amended to 10/10/10/5. The labels moved because their rows produce a different verdict under a changed rule, which is the mechanism decision 0025 exists to enforce, not an exception to it.

**The gate, and a correction the user is owed.** The proposal put to the user claimed that (a) would read 30/35 and (b) 29/35, and offered "the recommendation is the option that does *not* pass the gate" as an argument for it. **That was arithmetic backwards, and it was the builder's error.** Measured against the same verdicts: (a) leaves `s11` and `s12` at `standard`, the router answered `quick` and `deep`, both are misses, and the path score is **29/35 — 82.9%, FAIL**. (b) re-derives both to `deep`, `s12` becomes a hit and `s11` stays a miss, and the score is **30/35 — 85.7%, PASS**. So the option taken is the one that carries the gate over its threshold, by one case, and the user chose it on a false statement of that fact.

The choice was put again once the error was found. What survives the correction is the argument that has nothing to do with the score: `wideCountableMetric` is an input the nine rows do not hold, whose value the bench decided and the specification left open — the same defect 0069 and 0071 repaired, and the reason (b) was recommended before the number was computed. What does not survive is any claim that this decision was measured to be gate-neutral. It moved the gate, and the report says so beside the number.

**Cost if wrong.** One clause in `FORMATS.md §3` and its copy in `route.md`, one branch in `deriveVerdict`, one field across ten set cases, two labels. **Applied in.** `docs/FORMATS.md §3`, `docs/DESIGN.md §4.1`, `skills/task/references/route.md §4`, `bench/router/run.mjs`, `bench/router/set.json`, `bench/router/README.md`.

### 0073 — A no-op scenario names every home of its rule, and the control loses all of them (2026-09-03, Stage 11a, proposal T)

**Context.** `bench/noop/` run 1 scored **0 of 6**: in every scenario the arm with the line deleted met the check the line was supposed to make true. One mechanism explains it and the `task-preflight-stop` control stated it in its own words, quoting `docs/COMPONENTS.md:47` back as the source of the rule it had just obeyed. **`docs/` ships inside the plugin**, so every rule in a skill has a second home the model can read, and deleting one line from one skill did not remove the rule from the artifact under test. The arms did differ, in the measurements rather than the checks — `task-preflight-stop` took 2 turns with the line and 11 without — but turns and cost are measurements and decision 0019 forbids thresholding them.

`COMPONENTS.md §7` says the threshold is "set from the first real run". A run in which the control cannot fail sets nothing.

**Options.** (a) No threshold this stage; record the finding; criterion 3 reported not done. (b) Repair the scenarios to the authored-line reading and re-run: a scenario names every home of its rule, and the control loses all of them. (c) Take the shipped-artifact reading as the answer — five of six lines are not load-bearing as shipped, and the question becomes whether `docs/` belongs in the plugin, which is 11b's.

**Taken: (b).** `AUTHORING.md §13` requires an eval result or a reproducible before/after before any wording change to the engine, and the question it needs answered is whether *the rule* does anything. Under (a) or (c) the engine has no mechanism for that requirement at all and §13 becomes unenforceable for the rest of the project's life. The spend is not a re-run chasing a number: the scenarios were wrong about what they delete, which is readable in the run's own transcripts.

**What the repair is.** A scenario's `file` and `line` become `lines`, a list of `{ file, line, replaceWith? }`, and the without-arm removes every one. `replaceWith` exists because a rule's other homes are often embedded in a line that carries other rules — `COMPONENTS.md`'s Invariants paragraph states the router's evidence budget in the middle of four unrelated invariants — and deleting such a line whole would remove behaviors the scenario is not measuring. `--check-scenarios` requires every named line to be in its file exactly once and refuses a `replaceWith` equal to its line, which would leave the rule in place while looking like a control. The six scenarios now name **24 homes across 14 files**, sixteen of them rewritten rather than deleted.

The plugin copy also stops carrying `docs/stages/` and `research/`, for the reason decision 0064 will stop publishing them: a stage report quoting a rule is a home no installing machine has, so a control that failed on one would be measuring this repository rather than the product.

**Two limits, recorded rather than swept.** `DECISIONS.md` is not swept — it records how the engine came to say what it says, and deleting the reasoning would leave a reader with the rule's history missing and no behavior changed. And **the harness deletes prose, never code**: `scripts/ledger.mjs` refuses `claim` for a slug with no task directory, so `run-unknown-slug`'s control keeps that enforcement. A control that passes there says the prose is redundant with the script, which is a true answer and the one `AUTHORING.md §2` is asking for.

**What run 2 found, and what it costs to have found it.** Run 2 (`$6.12`, twelve arms) scored **0 of 6 again**, from a control that provably removes the rule from every prose home it has. The arms differ only in effort — `task-preflight-stop` took 2 turns with the rule and **18** without, against run 1's 2 and 11 — and effort is a measurement decision 0019 forbids gating. And one scenario turns out to be structurally unmeasurable: its control quoted `skills/init/SKILL.md`'s frontmatter `description` ("Run before the first `/hodos:task`") as the source of the rule it had just obeyed, and Claude Code lists every skill's description to every session whether or not anything reads the file. No control can take that away.

So **the threshold is still not set**, and the option this decision declined — (a), no threshold, record the finding — is where the work arrives after doing (b) in full. That is not (b) failing: (a) could not have been justified before, and now it can, for a reason nobody could state without the run.

**The mechanism the run bought.** `--check-scenarios` takes a `probe` per scenario — a pattern matching any statement of the rule — builds the control copy, reads every prose file of it, and reports a hit the scenario has not declared in `probeAllows`. Run against the repaired set it finds `skills/init/SKILL.md:3` by itself, with no model call. The defect that cost two runs is now caught by reading, which is the part of this that outlives the threshold question.

**Cost if wrong.** The scenario schema, `pluginFor`, and the probe sweep; two runs. **Applied in.** `bench/noop/scenarios.json`, `bench/noop/run.mjs`, `bench/noop/run.test.mjs`, `bench/noop/README.md`, `bench/noop/runs/2026-09-03-2/`, `docs/BENCH.md`, `docs/COMPONENTS.md §7`.

### 0074 — The verify environment is a declared stack; hodos raises it, and asks only for access (2026-09-03, proposal U, settled ahead of Stage 11b)

**Context.** `config.commands.dev` is one object — `{ cmd, url, ready }` (`FORMATS.md §2`) — and `skills/run/references/verify-loop.md §3` is written against it: start `cmd` in the background, wait for `ready` on its output, hand `url` to the verifier, stop the process on every path out. That is everything hodos knows about running the thing it verifies. It is exactly right for `bench/fixtures/webapp`, and it is the shape of a single-process SPA.

The reference for the format is a **.NET monorepo whose SPA is a React application**, with a sibling repository holding the infrastructure that raises it. Not as a pilot: decision **0021** settled that the pilot is `ariadne_v2`, and nothing here reopens it. It is the reference because raising it locally is a **four-layer** procedure that its own repositories already script, and every layer names something `commands.dev` cannot say:

| Layer | What raises it | What it breaks |
|---|---|---|
| machine prerequisites | `docker login` against the private registry; dotnet SDK 6; `nvm use 24`; `infra/setHosts.sh`, which writes `/etc/hosts` under sudo | credential-bearing and host-mutating: no background agent can answer a sudo password |
| shared infrastructure | `infra/up.sh` — two compose files (Postgres, Redis, RabbitMQ, Elasticsearch, Consul, Jaeger, Traefik, dnsmasq), plus a one-time `consul/load_data.sh` | lives in **another repository**, and `docker compose up -d` returns before anything is ready |
| this repository's services | `cli/pre-up.sh` (migrations, then the mock), `cli/up-web.sh`, `up-worker.sh`, `up-automation.sh` — or the interactive `cli/control.sh` | ordered, minutes long, and one entry point **prompts** |
| the SPA | `npm run dev:local`, which proxies to the locally raised back end | one of a family: `dev0`…`devN` point the same SPA at N remote stands |

Five gaps follow, and each is in the specification rather than in an implementation.

1. **No plural, therefore no order.** Layers two and three have nowhere in `config.json` to live at all.
2. **The environment is a choice, not a constant.** `dev:local` and `dev:stand` produce the same screenshots against different back ends. `verify.md` (`FORMATS.md §10`) has no column that records which, so a browser claim's evidence does not say what it was evidence of.
3. **The base URL is not the dev server's.** The SPA answers on `localhost:5173`; the API it proxies to is another host and port; the rest is reached by Host header through Traefik. `verify-loop.md §3` hands the verifier `commands.dev.url`, which is one of those and not the others — the same wound `BACKLOG.md` records for Vite's port drift, wider.
4. **Readiness is not a substring.** `up.sh` ends in `docker compose up -d`, which returns while Postgres is still starting, and the mock must not start before the migrations land. `ready` matches one line of one process's stdout.
5. **Teardown is not a PID.** `verify-loop.md §3` stops the process it started; killing a wrapper shell leaves the containers up. `infra` separates `stop.sh` (keep the volumes) from `down.sh` (remove them) — a distinction hodos has no word for.

The reference also answers half the problem before it is asked. `infra` ships `up.sh`, `stop.sh`, `down.sh` and `ps.sh`; the monorepo ships one script per service under `cli/`. **The verbs already exist as scripts.** What no layer ships is an *assertion*: `ps.sh` runs `docker-compose ps`, which lists containers and proves nothing about whether Postgres accepts a connection or the migrations ran. The part hodos has to write is the probe; the rest it only has to name.

**Options.** All three raise the environment themselves and none of them hands the raise back to the developer; they differ in what executes it.

(a) **`scripts/env.mjs` alone.** `probe` · `up` · `down` · `status`, zero-dependency Node like every other script, reading `verify.env`. `verify-loop` runs `env.mjs up` before the dispatch: layers in order, each raised only when its own `check[]` is red, each waited out to its `timeout`. Deterministic, no tokens, no turn bound, idempotent by construction. A layer still red at its timeout stops the run with the layer, its failing check, and the last lines of its output.

(b) **`hodos-preparer` alone.** A new agent the kernel dispatches before the verifier on every run: it reads `verify.env`, raises the layers, probes, retries, and writes `env.md`. Handles a messy raise natively — reading a compose file, tailing a container's log, noticing that the migration failed rather than the port — and keeps that output out of the kernel's context. Costs a model dispatch on every verify, is bounded by `maxTurns`, and at that bound returns **nothing** (`PLATFORM-NOTES.md` fact 40): halfway through a raise, containers up, no record of which.

(c) **`env.mjs` first, `hodos-preparer` as the escalation.** The script is the normal path and pays nothing. A layer still red after its `timeout` escalates to **one** bounded `hodos-preparer` dispatch, given that layer only: it diagnoses, may fix and re-raise, re-probes, and writes `env.md`. Green → the verifier is dispatched as usual. Still red → the breaker, with `env.md` as the diagnosis the developer reads. One escalation, not a loop.

**Taken: (c).** The raise is deterministic while it is declared and exploratory only when it fails, and those want different machinery. Paying a model dispatch to learn whether a port is open is principle 16 inverted — a channel that reports what it already knows the shape of. Stopping a run because a container needed forty more seconds is the same error from the other side, a script exercising judgement it does not have. (c) puts the model where judgement starts and nowhere earlier, and it is the only one of the three in which the common case — everything already up from the developer's own morning, every probe green — costs one script call and no dispatch at all.

**hodos raises; it never delegates the raise.** Where it cannot, what it asks for is **access, once** — not for the developer to perform the raise again on the next task. The reference separates the two cleanly:

- **Per-run raising** — the `up` scripts, the migrations, the dev command. Ordinary commands. hodos needs one `permissions.allow` entry per family (`Bash(docker compose:*)`, `Bash(sh cli/*)`) and then runs them every time, unattended. `init` already writes such entries on approval (decision **0057**), so the mechanism exists and only its scope grows.
- **One-time machine grants** — a `docker login` credential hodos does not hold, and a script that writes `/etc/hosts` under sudo. Asked **once**, with the exact command and what it changes on the machine, recorded with `grantedAt`. After the grant they never appear again.

A layer therefore carries `access`, never an `owner`. `access.grantedAt: null` is the only state in which hodos asks anything at all, and the question is *may I* — offering to write the permission entry itself — never *go and run this*. Declined: that layer's `browser` and `http` claims degrade to `skip: environment not up — <layer>, access declined`, the command recipes still answer for behavior, and the decline is recorded so the next run asks once rather than skipping in silence.

**The shape.** A `profiles` map selects which layers a run needs; each layer declares how it is raised, how it is proven up, and what it needs to be allowed:

```json
"verify": {
  "profile": "local",
  "profiles": {
    "local": { "layers": ["infra", "backend", "spa"] },
    "stand": { "layers": ["spa-stand"] }
  },
  "layers": {
    "infra":   { "cwd": "../infra", "up": "./up.sh", "stop": "./stop.sh",
                 "detached": true, "timeout": 600,
                 "check": [{ "kind": "tcp", "target": "localhost:5432" },
                           { "kind": "tcp", "target": "localhost:80" }],
                 "access": { "needs": ["Bash(sh ../infra/*)", "Bash(docker compose:*)"],
                             "grant": "permissions", "grantedAt": "2026-09-03" } },
    "hosts":   { "up": "../infra/setHosts.sh",
                 "check": [{ "kind": "cmd", "run": "grep -q <dev host> /etc/hosts" }],
                 "access": { "needs": ["sudo: writes /etc/hosts"], "grant": "one-time", "grantedAt": null } },
    "backend": { "up": "sh cli/pre-up.sh && sh cli/up-web.sh",
                 "detached": true, "timeout": 300,
                 "check": [{ "kind": "tcp", "target": "<dev host>:8080" }],
                 "access": { "needs": ["Bash(sh cli/*)"], "grant": "permissions", "grantedAt": "2026-09-03" } },
    "spa":     { "up": "npm run dev:local", "ready": "Local:", "url": "http://localhost:5173" },
    "spa-stand": { "up": "npm run dev:stand", "ready": "Local:", "url": "http://localhost:5173" }
  }
}
```

`verify.md`'s header carries the profile name, so a screenshot says which back end it saw. Layers merge through `config.mjs find` like everything else, so a monorepo's two SPAs keep their own profiles in their own `nested[]` configs while `infra` is written once at the root. `commands.dev` is unchanged and keeps working: a project with one `spa` layer is `commands.dev` with more words.

**Two constraints the answer respects**, both already in the specification:

1. **Agents do not dispatch agents** (`COMPONENTS.md §2`). `hodos-preparer` is dispatched by the **kernel**, before the verifier, never by the verifier. The verifier stays what `DESIGN.md §7.4` made it: a fresh agent that did not build the code and does not argue for it. An agent that raises the environment and then grades what runs in it has an interest in the result.
2. **A foreground process started inside an agent is orphaned when the agent ends** — `verify-loop.md §3`'s own stated reason for keeping the dev server in the session. The reference makes the line visible: `docker compose up -d`, a daemonized service and a one-shot migration all **survive** the process that launched them; only the dev server does not. So `detached: true` layers are safe for anything to start, and the one foreground layer is spawned detached with a PID file — which also replaces today's teardown, where stopping depends on the session still remembering what it started.

**Amended by decision 0090 (2026-09-06):** `detached` is not a field. Every layer is spawned detached, because the reason this constraint gives applies to all of them equally — a layer that is not detached is one the next command orphans — so the key described no choice and no code read it. The example above keeps it as the decision was written; `FORMATS.md §2` is where the grammar lives, and it says every layer is spawned detached.

Two things this settles as a side effect. `init`'s standing interview question — *how to run for verify: ports, auth, test data* (`COMPONENTS.md §1.6`) — has no field to write its answer into today, and gets one, along with the permission entries the answer implies. And the `BACKLOG.md` item on Vite's port drift stays inside the `spa` layer, where `ready` and `url` still belong to one process and can be parsed from its output.

**Cost if wrong.** Three new surfaces before a project has filled any of them: a config section, a script, and an agent. Visible at Stage 12 as `verify.env` written once and never re-read, or as a preparer that escalates on every run because the timeouts were guessed. Recoverable in both directions — the section is additive and `commands.dev` keeps working untouched, and the preparer is one dispatch to delete if the script turns out to be enough. That asymmetry is the argument for naming the shape before 0.1 rather than after: a key added to a committed `config.json` after the release is a breaking change, which is the argument `BUILD-PLAN.md` already makes for Stage 10b's ordering.

**Applied in.** `BUILD-PLAN.md` Stage 11b deliverables and acceptance, including this entry on the publication scrub list — it names an employer's repositories, hosts and registry the way `DECISIONS.md` 0021 does. `FORMATS.md §2`, `COMPONENTS.md`, `DESIGN.md §7.3` and `verify-loop.md` are edited at Stage 11b, not here: a decision taken ahead of its stage is recorded, and the specification is written by the stage that builds it.


### 0075 — A path a config or a script hands to a command resolves against the git root; `projectRoot` anchors the state directory only (2026-09-03, proposal V, settled ahead of Stage 11b)

**Context.** `config.mjs find` returns `projectRoot` = the directory of the **nearest** config (`scripts/config.mjs:111`), which in a monorepo with `nested[]` is a subproject and not the git root. Two things already depend on which of the two anchors a path uses, and the specification names neither. Only `campaigns.external[]` answers it, for itself, in passing: "absolute or repo-relative" (`FORMATS.md §2`).

**`review-package.mjs` is broken there today.** It runs every git call with `cwd: projectRoot` (`scripts/review-package.mjs:157`). `git diff --name-only` ignores cwd and returns **root-relative** paths (`:239–241`); the same paths are handed straight back as a **pathspec** (`:265`), and git resolves a pathspec **against cwd**. When `projectRoot` is not the git root the pathspec names `<subproject>/<subproject>/…`, matches nothing, and git exits **0** with an empty diff.

Reproduced 2026-09-03 on a two-subproject monorepo — root config plus `web/.claude/hodos/config.json`, changes in `web/src/a.ts` and `admin/src/b.ts`, `review-package.mjs demo` run from `web/`: `## Diff stat` lists both files, `## Diff` is empty, `exit=0`, the package 17 lines. The same task directory at the git root renders both hunks. The reviewer is handed a package that says two files changed and shows no code, and nothing fails. `scripts/review-package.test.mjs` has no nested case and `bench/fixtures/mono` ships no config, which is why Stage 10 — which tested `config.mjs find` from a subproject — did not reach it.

**Decision 0074 was about to repeat the class.** Its `verify.layers[].cwd` — `"cwd": "../infra"` in its own example — does not say what it is relative to, and Stage 11b builds it. Under `projectRoot` a layer written once at a monorepo root resolves to a different directory for every subproject session that merges it, which is the one thing 0074 says layers must not do ("layers merge through `config.mjs find` like everything else").

**Options as they were put.** (a) One rule: every path a config or a script hands to a command resolves against the **git root**; `projectRoot` keeps only what it is for — `.claude/hodos/` state, `active`, `sessions/`, `project:<name>` adapters. (b) Fix `review-package.mjs` alone with a `:(top)` pathspec prefix, leaving `layers[].cwd` to Stage 11b's own judgement. (c) Anchor everything at `projectRoot`, `review-package.mjs` rewriting the file list into projectRoot-relative paths.

All three fixes were run against the reproduction before the question was put: `:(top)`, `:(top,literal)` and `cwd = git root` each return both files; today's form returns nothing.

**Taken (user, option a).** The defect and 0074's silence are one question, and answering it once costs less than answering it twice differently. (b) fixes what is measured and leaves the class open in the very stage that builds the field whose reference case (`../infra`) is exactly it. (c) fails on its own terms: decision **0071** rules that a task in a monorepo legitimately touches files outside its own subproject, and those have no projectRoot-relative name that is not `../` — an anchor that cannot name half its inputs.

**Cost if wrong.** One sentence in `FORMATS.md §2`, one in `COMPONENTS.md`, one script changed, one test added. Visible immediately: a path resolved against the wrong root fails loudly everywhere except the one place it currently fails silently, and removing that silence is the fix.

**Applied in.** `BUILD-PLAN.md` Stage 11b deliverables and acceptance. `FORMATS.md §2`, `COMPONENTS.md §3` and `scripts/review-package.mjs` are edited at Stage 11b, not here: a decision taken ahead of its stage is recorded, and the specification is written by the stage that builds it (the rule 0074 states and follows).

### 0076 — The commands that answer for a task are those of every subproject the diff touches (2026-09-03, proposal W, settled ahead of Stage 11b)

**Context.** Decision **0060** gave a subproject its own config when its commands differ, arguing that "a reviewer handed `npm test --workspaces` for a change inside `svc` runs the whole monorepo to check one package". Decision **0071** ruled that editing two packages of one repository is **one merge, not a crossing** — so one task legitimately changes `web` and `svc`.

The two meet at a gap neither names. `config.mjs find` merges from **cwd** upward, so `commands.*` and `verify.recipes` are the ones belonging to the subproject the session started in, while the diff `review-package.mjs` builds is whole-repo (`git diff` with no pathspec, from any depth). A session started in `web/` that also changed `svc` runs `web`'s test command over both halves and reports green. It is 0060's own error from the other side: 0060 refused to check one package with the whole monorepo's command, and today hodos checks the whole change with one package's command. The reviewer, the verifier, and `verify-loop.md §7`'s pre-commit run of `config.commands.test` inside the fix loop are all affected.

**Options as they were put.** (a) A rule instead of a mechanism: monorepo sessions start at the git root. (b) Derive the set from the diff — `config.mjs for-files <path…>` returns every config whose `projectRoot` contains at least one of the paths; the reviewer and the verifier run each one's commands, and each row carries ` · project: <dir>`. (c) The plan declares it — `plan.md`'s header gains `Projects:`, filled by the planner from the `Files:` lines it already writes and approved at the plan gate, with `review-package.mjs` naming a mismatch against the actual diff.

**Taken (user, option b).** It is the only option that answers 0060's argument in both directions. The format idiom it needs already exists for the cross-repository case — `Done-metrics` rows carry ` · repo: <name>` when a command runs in another repository (`FORMATS.md §11`), and ` · project: <dir>` is that shape one level down. (a) prescribes the command 0060 refused, and a monorepo of a .NET back end plus two SPAs may have no root `test` at all, so the rule would require inventing one. (c) is cheaper and stays the fallback if 11b's cost turns out higher than estimated: its set is a prediction written before the code, and it asks a human to approve what the engine can compute.

**Inert until a project has two configs.** `for-files` returns one entry when `nested[]` is empty, which is every project the bench measures today, and no row gains the column. That is the regression bound and it is an acceptance row rather than a hope.

**Cost if wrong.** A script command and one column in two formats. Visible at Stage 12 as a project that lists four subprojects for a two-file change, which is a filter on the path list, not a redesign.

**Applied in.** `BUILD-PLAN.md` Stage 11b deliverables and acceptance. `COMPONENTS.md` (`config.mjs`, `hodos-reviewer`, `hodos-verifier`), `FORMATS.md §8` and `§10`, `skills/run/references/review-loop.md` and `verify-loop.md` are edited at Stage 11b, not here, for the reason 0075 gives.

### 0077 — A published component library is the second repository; Stage 9b moves before the pilot and is written against a seeded fixture pair (2026-09-03, user, ahead of Stage 11b)

**Context.** A design session on multi-repository work: the user's cases run across a monorepo holding two SPAs and a back end, and a component library that lives in its own repository and is consumed as a published package. Decision **0040** put Stage 9b after Stage 12 so that cross-repository campaign grammar would be "written against a real second repository, not against `kit`", and `BUILD-PLAN.md` Stage 12 carried the row that made the pilot name it. The user named it now, so 9b's dependence on the pilot was only ever for the name, and the name exists.

Moving 9b before Stage 12 crosses a standing rule: `CLAUDE.md` says "test only against `bench/fixtures/` until Stage 12; never run hodos against a real project earlier", and `STAGE-PROTOCOL.md §7` puts a real-project run among the things only the user decides. So the move forces a second question — what 9b is exercised against — which is the one that was put.

**Options as they were put.** (a) The seeded fixture pair `mono` + `kit`, with the acceptance naming the live monorepo-plus-library pair as the shape it models, and one confirmation row added to Stage 12 on that pair. (b) The live pair itself, the fixtures-only rule lifted for this stage. (c) 9b run as a second pilot on the live pair with the user present, inheriting Stage 12's "nothing here happens without the user present" instead of lifting anything.

**Taken (user, option a).** It answers decision 0040 on 0040's own terms rather than around them. What 0040 refused was `kit` **as it stands**, for three named properties it lacks — "a foreign owner, a branch someone else holds, a map nobody in this session wrote". All three are seedable: `bench/scripts/fixture-copy.mjs` already seeds commits, and a seed step that creates the branch, commits the foreign claim on it and installs a map the session under test did not write supplies exactly what was missing. `bench/fixtures/README.md:104` already calls `kit` "the second repository of the cross-repository campaign criteria", and `mono` (root config plus nested) beside `kit` (a published component library) **is** the shape of the live pair. (b) would have hodos touch an employer's repositories before it has ever run against any real project, which is the stage the rule exists to reserve; (c) buys the same evidence at the price of two pilots and reopens nothing that needed reopening.

**What moves and what does not.** The Progress order becomes `11b → 9b → 12`. The stages are still **not renumbered** — 0040's rule stands and every cross-reference to Stages 10–12 still resolves. The 0.1 scope is unchanged: Stage 11b is the release, so 9b remains 0.2, exactly as 0040 left it. Decision **0021** is untouched — the pilot is `ariadne_v2`. The Stage 12 row that asked the pilot to name the second repository is spent and is replaced by one that closes a cross-repository node on the live pair.

**What a fixture cannot show, named rather than assumed.** A foreign owner who is a person, and a race resolved socially, are the two properties a seed imitates and does not reproduce. Stage 9b's report says so, and Stage 12's confirmation row is where they are answered — which is the honest version of what (a) buys: the grammar is proven early, the human half is proven on the pilot.

**Cost if wrong.** A seed step in `bench/`, a stage order, and one acceptance row moved between two stages. Visible at Stage 12 as a seeded assumption the live pair contradicts, in which case the correction is a 9b fix inside the pilot — which is what 0040's own escape clause already provides for.

**Applied in.** `BUILD-PLAN.md` Progress and its rationale paragraph, Stage 9b (moved, retitled, deliverables and acceptance), Stage 12 acceptance.

### 0078 — A rule's precedent carries an anchor, and the layer reports its own decay (2026-09-03, proposal X, settled ahead of Stage 11b)

**Context.** `init` writes a layer whose authority rests on citations into code that keeps moving, and the three mechanisms that should say when it has rotted do not. **No trigger:** `config.json` records `scanSha` — "the commit `init` scanned; `--refresh` diffs from it" (`docs/FORMATS.md:125`) — and no script but `config.mjs` reads it; the digest prints `config verified <date>` (`scripts/state-digest.mjs:108`) and never compares it to HEAD, so the whole reconcile path waits on a developer remembering `--refresh` exists. **The wrong event is watched:** the `PostToolUse` lint fires on writes under `.claude/**/*.md`, which is when the *rule* is edited, while a rule rots when the *code* moves. **The check is weaker than the claim it protects:** `scripts/verify-citations.mjs:19` requires `:line` and asserts only that the line exists and is non-blank, so an edit above the cited line leaves the citation resolving to the wrong code and the lint green — and the `CLAUDE.md` map, which loads on every session where a `paths:` rule loads only on a matching `Read` (fact 43), names bare paths (`bench/fixtures/webapp/CLAUDE.md:24-31`) that are not citations to that regex at all.

**Options as they were put.** (a) Leave the mechanisms as they are and let `README.md` prescribe a cadence for `/hodos:status` and `init --refresh`. (b) A signal and a wider detector, no format change: one conditional digest line from `git log --diff-filter=RD --name-only <scanSha>..HEAD` intersected with the paths the rules and the map cite, and `verify-citations.mjs` widened to bare paths under its own narrowness discipline. (c) (b) plus an **anchor** — each precedent carries the text of the line it cites, in a `## Precedents` block below the rule, so the check asserts the anchor is still at that line and reports where it moved; `/hodos:status` and `init --refresh` re-point the citation instead of only naming it.

**Taken (user, option c).** The rule form is published at 0.1 and a rule file is committed by every project, so this is the same argument decision **0040** used to put Stage 10b before the release — an extension point added after the release is a breaking change to a file projects commit — applied to the artifact `init` writes most of. The anchor is the only one of the three that turns detection into repair, and repair is the whole content of the worry that raised this: without it, a project that refactors weekly is told to re-run a scan weekly. (b) alone catches renames and deletes and misses the common case, an edit above the cited line, which is exactly what the current check already fails at. (a) leaves the layer's authority resting on a check that asserts a line is not blank.

**The shape.** A precedent is `- <path>:<line> — <the text of that line, trimmed>`, one per line in a `## Precedents` block below the rule's text, beside `## Migration` rather than inside the prose. The check reads what it already read and adds one comparison: anchor at that line → pass; anchor found elsewhere in the file → the line it moved to, which is what `--refresh` and `/hodos:status` re-point to; anchor absent from the file → the finding the current check would have missed.

**Cost if wrong.** The anchor becomes a second source of truth for the code, or the block reads as noise in a ≤100-line rule. Bounded: one line per precedent, read by the check that already reads the citation. Visible at Stage 12 as rules whose anchors need re-pointing every week — which is evidence that the rule cites too fine a line, not that the anchor was the wrong mechanism.

**Applied in.** `BUILD-PLAN.md` Stage 11b deliverables and acceptance. `AUTHORING.md §10`, `FORMATS.md §12`, `COMPONENTS.md §1.3`, `scripts/verify-citations.mjs`, `scripts/lint.mjs`, `scripts/state-digest.mjs`, `skills/rule/SKILL.md`, `skills/init/references/rules.md`, `skills/status/SKILL.md §3` and the six `bench/fixtures/webapp` rules are edited at Stage 11b, not here: a decision taken ahead of its stage is recorded, and the specification is written by the stage that builds it (the rule 0074 states and 0075 follows).

### 0079 — `config.tasks.track` is deleted; a team's durable record is the commit body, the campaign node and the rules (2026-09-03, proposal Y, settled ahead of Stage 11b)

**Context.** `DESIGN.md §5.1` offers a team one switch — "gitignored by default (`config.tasks.track: true` for teams that want it)" — and `docs/FORMATS.md:23` repeats it. `scripts/config.mjs:259` validates it as a boolean and nothing reads it: `skills/init/SKILL.md:54` appends `.claude/hodos/tasks/` to `.gitignore` unconditionally, and no other skill or script names it. It is the failure `DESIGN.md §3.2` names and decision **0061** refused for roles — a config key that turns nothing on — sitting in the only feature the design offers a team. What `track: true` would commit is also not shareable as the format stands: `ledger.md` is append-only, so two parallel tasks conflict in it by construction; `state.json` is machine state; `evidence/` holds run output; and `finish` deletes the directory, so the tracked history would be files added and then removed.

**Options as they were put.** (a) Implement it: `init` asks the question and omits the `tasks/` line when the answer is yes, and `finish`'s deletion asks differently for a tracked directory. (b) Delete the key from `FORMATS.md §2`, `DESIGN.md §5.1` and `config.mjs`, and state in one sentence where a team's durable record actually lives. (c) Keep the key and have `config.mjs check` report it as declared-but-unread.

**Taken (user, option b).** The config format is published at 0.1 and a key removed after that is a breaking change to a file every project commits, so this is the last stage where deleting it is free. (a) is not a five-line change: it makes `ledger.md` and `state.json` shared files, which is a merge problem the format has no answer for, and it contradicts "one developer, one task" in the sentence beside it. (c) is honest and leaves `DESIGN.md` promising a team a feature that does not exist.

**What replaces it, in one sentence.** A team's durable record of a finished task is the commit bodies (`conventions.commit` requires the why), the campaign node's `ref: sha:`, and any rule the finding earned; task artifacts are working state and are private by construction. That sentence is untested — nobody but the author has ever read a hodos task's record — which is a `BACKLOG.md` line against Stage 12, not a reason to keep a key that does nothing.

**Cost if wrong.** A team that wants shared task artifacts keeps them itself, and the key returns in 0.2 with the merge question answered — the question (a) skips. Visible at Stage 12 if the pilot's own team asks for it.

**Applied in.** `BUILD-PLAN.md` Stage 11b deliverables and acceptance. `DESIGN.md §5.1`, `FORMATS.md §1` and `§2` and `scripts/config.mjs` are edited at Stage 11b, not here, for the reason 0075 gives.

### 0080 — `/hodos:status` fetches before it reports a claim (2026-09-03, proposal Z, settled ahead of Stage 9b)

**Context.** `DESIGN.md §9` resolves races socially and has `status` "show claims from known branches". Every claim is read from `.claude/hodos/campaigns/<slug>.md` in the working tree, and neither `campaigns.mjs` nor `state-digest.mjs` consults git at all. A developer who has not pulled sees a frontier that looks current, claims a node someone took on Monday, and the social protocol runs against stale data with nothing on screen saying so. Stage 9b's acceptance — "a claim on a node held by another branch is reported with the branch name" — is satisfied by a map that arrived a week ago.

**Options as they were put.** (a) Nothing in the engine; `README.md`'s team section says the map is as fresh as the last pull. (b) A local freshness line per map, from git calls that touch no network: the map file's last commit date and how far the branch is behind its already-fetched upstream. (c) `status` runs `git fetch` before reading the map.

**Taken (user, option c), against the recommendation, which was (b).** The reasoning recorded for (b) — that a network call sits badly in a skill documented "read-only until the developer confirms an action", and hangs on a repository whose remote wants credentials — is not withdrawn; it becomes the list of guardrails the taken option carries:

- The fetch runs in `/hodos:status` §1 only, never in the `SessionStart` digest: a hook that reaches the network on every session start is a cost every session pays for a number most sessions do not read.
- `git fetch --no-tags --quiet` under a timeout, in the repository the map lives in — the home repository for a cross-repository map (`DESIGN.md §9`).
- It updates remote-tracking refs and nothing else. No merge, no rebase, no working-tree change; the skill's promise that it writes nothing to the project is unchanged.
- Failure is not an error. A timeout, a missing remote or a credential prompt yields `fetch failed — the map is as of your last pull`, and the report continues with the local map. The fail-open rule the hooks live by (`DESIGN.md §2` principle 6) applies to the one network call the engine makes.
- `skills/status/SKILL.md`'s "read-only until the developer confirms an action" is restated so that the fetch is named rather than contradicted.

**Cost if wrong.** A `status` run that pauses behind a slow or credentialed remote — bounded by the timeout and the fail-open path. If the pilot finds the pause worse than the staleness, the fallback is (b), which is a subtraction from what this builds and needs no format change.

**Applied in.** `BUILD-PLAN.md` Stage 9b deliverables and acceptance. `skills/status/SKILL.md §1`, `scripts/state-digest.mjs` and `FORMATS.md §12` are edited at Stage 9b, not here, for the reason 0075 gives.

### 0081 — Assistive capabilities enter through the router, the phases and the digest; two commands are added, and the developer remembers nothing (2026-09-03, proposal AA, user, ahead of Stage 11b)

**Context.** hodos ships nine commands. Eight developer needs recur in ordinary project work and none of them covers: reviewing a **teammate's** diff (`run` reviews only the diff it wrote); **reproducing** a production symptom before a red-capable command exists, which `DESIGN.md §4.1` makes the precondition of the `bug` path and never supplies; **handing off** an unfinished task to another person (`BACKLOG.md`, 2026-09-03: the task directory is deleted at finish and `history.jsonl` is gitignored, so nothing team-visible survives); **explaining** a subsystem read-only; a **spike** whose acceptance criterion cannot be stated in advance, which a plan that forbids "TBD" has no home for; a **mechanical change across many files**, where a per-file plan is theatre; a **dependency upgrade**, which has its own evidence loop; and **pruning** the layer's dead rules, which `init --refresh` reconciles against the code but never against whether a rule ever fired.

The gap is not only the capability. It is the **entry**: a capability the developer must remember by name is one most developers never use, and nine names is already at the edge of that. The requirement as the user put it is that the system detects the moment and proposes, and that every capability has both an in-flow and a standalone form.

`DESIGN.md §4.1` already holds the shape — one entry, a router that classifies and **proposes**, the human decides — and §11 forbids the obvious alternative: "three skill descriptions in the listing rather than eight" is a measured acceptance criterion (T-1), and eight more model-invocable skills is eight more descriptions on every turn of every project forever.

**Options as they were put.** (a) **Eight new user-invoked commands**, `disable-model-invocation: true` like `init` and `status`. Zero listing cost; the entry is the developer's memory — the load this proposal was raised to remove, multiplied by eight. (b) **Eight new model-invocable skills**: the model proposes them because it can see them, at the cost of eight `description`s in the listing every turn of every project, against the one frugality number v1 is accepted or rejected on, and with the trigger moved into model judgement where principle 16 wants a decidable check. (c) **The capabilities enter through the mechanisms that already run** — two new router types, one new `refactor` shape, two new kernel phases, script-computed offers in the digest and at phase boundaries, and two new commands only where the entry is not a task at all.

**Taken (user, option c).** It is the only option that satisfies both halves of the requirement: the system proposes, and the proposal costs nothing per turn. It also shrinks what the developer must know from eight names to zero — they type `/hodos:task <anything>`, or type nothing and read one offer line in the digest. (a) is the load restated. (b) spends the frugality budget v1 is measured on, to buy a trigger that is less reliable than a script reading files.

**The shape.**

| Need | Where it lands | In-flow trigger (decidable) | Standalone entry |
|---|---|---|---|
| review a teammate's diff | new command, reusing `hodos-reviewer` and `review-package.mjs` | branch ≠ default, ahead of upstream, no active hodos task on it | `/hodos:review <target>` |
| reproduce before the red loop | `skills/task/references/reproduce.md` | router type `bug` **and** the request names no command that fails today | `/hodos:task` (the router routes) |
| hand off unfinished work | new command + digest offer | active task, ledger open, last event older than `staleDays` | `/hodos:handoff [slug]` |
| explain a subsystem | nothing is built — `type: question` already answers with sources and no code | router | `/hodos:task` |
| spike | new router type | grilling produces a `Gap:` on the goal itself — the acceptance criterion cannot be stated | `/hodos:task` |
| mechanical change, many files | a `refactor` **shape**, not a new path | checklist row 1 above the `quick` limit **and** one edit shape | `/hodos:task` |
| dependency upgrade | new router type | the request names a package the lockfile carries | `/hodos:task` |
| prune the layer | a `skills/status/` section + digest offer | a rule with no recorded fire in `staleDays × k`, or precedent decay > 0 (decision **0078**) | `/hodos:status --prune` |

**The offer contract.** An offer is computed by a script from files, never from a model's reading of the conversation. Its precondition is decidable and is stated in `FORMATS.md §12` beside the line it produces. At most **one** offer per digest, highest-priority first, and no line at all when no precondition holds — the ≤300-token cap is not raised, and principle 16 governs: a channel that offers on a session where nothing is wrong costs twice. Decision **0078**'s conditional decay line is the precedent for the mechanism and for the silence. The second channel is a phase boundary: `finish` already proposes a rule, and that is where a `handoff` or `prune` offer belongs when the state says so.

**The bench is re-scored partially, not re-bought (user).** A full set is `$17.81` for 35 cases (run 2, `bench/router/runs/2026-09-03/README.md`); the partial mechanism run 3 already used — `invoke.mjs --only <ids>` plus a repeatable `run.mjs --verdicts`, which prints the mixture in the report — cost `$7.66` for 15 (`…-partial/README.md`). Stage 11c re-buys only the cases the change can reach: the new `spike` and `upgrade` cases, which have no carried verdict, and the existing cases whose text could be attracted to either type, derived from the set rather than from run 2's misses. Two things hold that number down: `mechanical` is a `refactor` shape and not a new path, so the six path rules and the path axis are untouched, and `run.mjs --check-labels` re-derives every new case's label from its nine rows for free before any session is spawned.

**Cost if wrong.** The digest becomes a nag, and developers learn to skim the one channel that also carries the active task's state — the failure principle 16 names, and the reason the cap is one line and the preconditions are decidable rather than heuristic. Two new types widen the classifier's confusion surface — `spike` against `deep`, `upgrade` against `feature` — which is why the type axis is re-scored in the stage that adds them rather than at the pilot.

**Applied in.** `BUILD-PLAN.md` gains **Stage 11c**, run before Stage 11b, positioned the way decision **0077** positioned Stage 9b; the numbering is not renumbered, so every existing cross-reference still resolves. `DESIGN.md §4.1`, `§4.5`, `§10` and `§11`, `FORMATS.md §3` and `§12`, `COMPONENTS.md §1`, the `task` and `run` references, `skills/status/SKILL.md`, `scripts/state-digest.mjs` and `bench/router/set.json` are edited at Stage 11c, not here: a decision taken ahead of its stage is recorded, and the specification is written by the stage that builds it (the rule 0074 states).

### 0082 — `--prune` reports what it can prove and asks; "dead rule" is not detected, because nothing detects it honestly (2026-09-03, Stage 11c Start, user)

**Context.** Decision **0081**'s table gives `/hodos:status --prune` a precondition — "a rule with no recorded fire in `staleDays × k`, or precedent decay > 0 (decision **0078**)" — and neither half survives contact with this stage. The decay half is built at Stage **11b**, which runs *after* 11c, so it does not exist here. The fire half has no honest mechanism at all, and the three candidates each measure something other than what the row wants:

- **Rot** — a precedent citation that no longer resolves — is decidable today (`lint.mjs --project`, reported by `status §3`). It measures that the *code* moved, not that the *rule* is unused, and 0078's answer to it is to **re-point**, not to delete.
- **Loads**, via the `InstructionsLoaded` hook (`BACKLOG.md`, from `research/05 §5`), undercounts by construction: fact 43 makes a `paths:` rule load only on a matching **Read**, and `hodos-reviewer` and `hodos-verifier` reach files through commands. A rule that governs the phase that judges the code would be counted dead. It also costs a hook every session and a per-machine counter file — the state shape decision **0079** had just removed.
- **Citations in findings** are inverted. A rule that works **prevents** the finding that would have cited it, so zero citations is what the best rule in the layer and the deadest rule in the layer both produce. `history.jsonl` is also gitignored and per-machine, so a teammate's citations are invisible.

**Options as they were put.** (a) Nominate on rot, with the check that exists. (b) The `InstructionsLoaded` hook. (c) A citation record in `history.jsonl`. (d) Build no `--prune` before the pilot. Put again after the user's answer — "I am not sure a mechanism exists that detects this correctly", which is the finding above: (a′) a review with facts and no verdict; (d); (a′) plus an off-engine measurement at the pilot.

**Taken (user, a′).** `--prune` claims nothing. It prints, per rule, only what a script can stand behind — the rule's age, the resolution status of each precedent (`resolves` · `moved to <line>` · `absent`), its size in lines, and the token cost of the layer as a whole — and asks about one rule at a time: **keep · re-point · delete**. The judgement is the developer's and the facts are the script's, which is the shape `DESIGN.md §4.1` already uses for the router: the system proposes from evidence, the human decides. Nothing is deleted without an answer, as `status §4` already requires for a task directory.

**What this amends.** 0081's `prune` row loses its first half by name: **"no recorded fire in `staleDays × k`" is not built, and no version of it ships in 0.1**, because the three ways to measure it are undercounted, inverted, or both. The second half stands: the digest offer's precondition is **precedent decay > 0** — at this stage the citation that no longer resolves, sharpened to 0078's moved/absent distinction when 11b lands the anchors, with no change to this surface.

**Cost if wrong.** A layer that only grows: `--prune` surfaces the facts and a developer who reads them still keeps every rule. That is a worse outcome than a detector would give and a better one than a detector that names a working rule dead, which is what (b) and (c) would do. Visible at Stage 12 as a rules file nobody has ever pruned — and the pilot is where a real fire measurement can be taken off-engine, against a real project, before 0.2 decides whether a detector is worth a hook.

**Applied in.** `skills/status/SKILL.md` (the `--prune` section), `scripts/state-digest.mjs` (the offer's precondition), `FORMATS.md §12`, at Stage 11c.

### 0083 — A handoff is a tracked file the developer commits, and `run` picks the task up from it (2026-09-03, Stage 11c Start, user)

**Context.** Decision **0081** gives `/hodos:handoff` no landing place and decision **0079** has just removed the one the config offered: `config.tasks.track` is deleted, the task directory is gitignored and deleted at finish, and `history.jsonl` is gitignored — so nothing resumable survives the machine that ran the task (`BACKLOG.md`, 2026-09-03). The stage's acceptance criterion is negative — a handoff introduces no per-machine state — and says nothing about what it introduces instead.

**Options as they were put.** (a) A tracked file plus a pickup that reads it. (b) The commit body, which is the record 0079 names. (c) Print only: hodos writes nothing and the developer pastes the text into the MR, the ticket or chat. (d) A campaign node.

**Taken (user, option a).** `/hodos:handoff [slug]` writes `.claude/hodos/handoffs/<slug>.md` — a path `init` does not add to `.gitignore`, so it is tracked by default and the acceptance criterion holds by construction — carrying the goal, the path and type, the open ledger lines, the branch and its head sha, and the next step. hodos does not commit it; the developer does, which is the same gate every other write passes. `/hodos:run <slug>` on a machine with no task directory but a handoff file offers to reconstruct the directory from it, and the pickup deletes the file it consumed. (b) needs a commit to exist and cannot be amended after a push (`git-guard` denies `--force`), and gives the receiver prose rather than a task. (c) satisfies the criterion by producing no state at all, which is a different feature. (d) covers only campaign tasks, and `campaigns.mjs set` writes no free text.

**Cost if wrong.** A stale handoff file sits in the tree after work resumed some other way — visible, one file, deletable, and named in the pickup path. The alternative failure — a handoff nobody can act on — is the one 0081 raised this capability to fix.

**Applied in.** `FORMATS.md §1` (the path) and a `handoff.md` section, `skills/handoff/SKILL.md`, `skills/run/SKILL.md` (the pickup), at Stage 11c.

### 0084 — A `spike` opens no task commits; its exit is a `Ruling:` line, and the four test exemptions are untouched (2026-09-03, Stage 11c Start, user)

**Context.** Stage 11c's acceptance says a `spike` plan carries no acceptance criteria — the question, the timebox and the exit decision instead — and that `finish` records which of two exits was taken. `ledger.mjs` refuses `Task <n>: done` unless the ledger holds `Task <n>: test red` or `--tests` names one of exactly four exemptions (decision **0022**), and `CLAUDE.md` calls that list closed. A spike that commits tasks therefore needs a fifth exemption or a false one.

**Options as they were put.** (a) A spike opens no task commits: the code lives on a scratch branch, and the exit is recorded as a `Ruling:` line, a form the ledger grammar already accepts. (b) A fifth exemption, `spike`. (c) Reuse `no-harness` or `glue`.

**Taken (user, option a).** The exemption list stays four, `FORMATS.md §6` gains no form, and the exit is `Ruling: <what> — <why> — <cost if wrong>` naming which of the two happened: the scratch branch deleted, or a follow-up task opened with its slug. (b) reopens a list two documents call closed and gives every future path an argument for a sixth. (c) records a reason the project never had, which `history.jsonl` would then report as an exemption rate.

**Cost if wrong.** A spike whose evidence a reader wants to open has a ruling's text and a branch name rather than a sha — thin, and the honest amount for work whose whole output is a decision. Visible at Stage 12 as spikes whose ruling nobody can reconstruct, which would be an argument for the follow-up task carrying the branch, not for the exemption list.

**Applied in.** `skills/task/references/route.md` and `plan.md`, `skills/run/references/finish.md`, at Stage 11c.


### 0085 — An architecture decision states the axis its alternatives differ on (2026-09-04, proposal BB, Stage 11b Start)

**Context.** `skills/task/references/design.md:42–48` requires 2–3 real alternatives per architecture decision and checks them with one sentence — "Alternatives that turn out identical under the skin are one alternative" — which hands the judgement back to the session that generated the sample. The failure it does not reach is three shapes drawn from one distribution: the most typical form for the stated problem, compared against two of its neighbours. The comparison is then real and the option a design canon would have compared against was never a row. Alternative *generation* was the one step in the phase with neither a criterion nor an anchor, while the rest of the file is criteria throughout — deep modules against pass-throughs (`:19`), dependency direction inward (`:17`), the three things a wrapper must add (`:50–56`).

**Options as they were put.** (a) Leave it, the self-judgement stays. (b) **Axes of difference** — the decisions-table row states which axis its alternatives differ on: module boundary · dependency direction · where state lives · what becomes an invariant · what fails and how; alternatives differing on none are one alternative. (c) **A provenance axis** — at least one alternative derived from a named principle, recorded in the row. (d) **A canon pointer file**, `sources/_design.md`, fetched at plan time.

**Taken (user, option b).** It makes the sentence `:48` already carries decidable, which is the most the phase file can do at plan time. (c) is unverifiable after the fact and invites a citation to stand in place of an argument — the failure `AUTHORING.md §10` guards against for rules. (d) spends the plan's budget on the engine, which `design.md:7` forbids in its own preamble, and the material is books, so the pointers would resolve to restatements weaker than the prose already is.

**Stated rather than hidden.** It is weaker than it looks: it makes the check decidable, not the alternatives good. And it is **unmeasured by construction** — the bench covers the router, the reviewer and the no-op arms, there is no plan bench, so decision **0015**'s rule (an axis added to a prompt and not to a bench is unmeasured) applies with no way to discharge it here. It ships as prose and is confirmed or corrected **by name** at Stage 12, the way decision **0077** carries its seeded assumptions.

**Cost if wrong.** A row gains a label filled to be filled — visible at Stage 12 as axis labels that repeat the option's own name, the anti-pattern `design.md:76` already names for the ten fields. Reversible: one sentence in one reference file, one column in one form.

**Applied in.** `skills/task/references/design.md` and the `## Decisions` form of `FORMATS.md §5`, at Stage **11b-3** (decision **0089**).

**Amended by decision 0089's stage (2026-09-06):** the applied-in list gains two homes the build reached and this list did not name — the `Axis` column of the `## Decisions` table in `skills/task/references/plan.md §2`, and gap 5 plus procedure step 2 of `agents/hodos-plan-reviewer.md`, which is where the stage entry's "the plan review checks the axis the way it checks the ten design fields" lands. Recorded because the list is the checklist a later change to the axis rule is read against (Review 1, Stage 11b-3).

### 0086 — The defaults list gets an admission rule and a retirement rule; the seventeen rows are grandfathered (2026-09-04, proposal CC, Stage 11b Start)

**Context.** `DESIGN.md:264` states the list's criterion once — "What LLMs do without being told" — and `skills/run/references/defaults.md:21` carries seventeen rows, none with evidence that the criterion was met for it. Everywhere else the design requires evidence per unit: ≥2 anchored precedents for a rule (`AUTHORING.md §10`, decision **0078**), a trigger for a behavioral finding at `blocker`/`major` (`FORMATS.md §9`, decision **0015**), a command's output for a stage claim (`AUTHORING.md §13`). Two consequences, both about the mechanism: there is no procedure for an eighteenth row, so a candidate is judged by taste, and none for retiring one — the live risk, because the list describes a model's defaults and models change.

**Options as they were put.** (a) Leave it. (b) **A source per row.** (c) **Admission and retirement, no per-row change** — what evidence admits a row (an instance in a bench package, a pilot finding, or the reviewer's own findings in `history.jsonl`, cited) and what retires one (a row no finding has cited across the pilot's task set is nominated for deletion, the shape `finish` already uses for a rule that never fires), with the seventeen grandfathered and the section saying so. (d) (b) and (c).

**Taken (user, option c).** It is the honest half of (d): new rows carry evidence by construction, the existing ones are named as the author's reading rather than dressed in manufactured provenance — which for most of the seventeen is what a source column would be, the conflict with `AUTHORING.md §13` — and the list gains the one thing it cannot do today, which is shrink. The precedent for saying it out loud is Stage 11a's own acceptance line about the seeded review bench.

**Cost if wrong.** The section reads as bureaucracy and nothing is ever admitted or retired through it — visible at Stage 12 as a pilot that produces defaults-list findings and nominates nothing. Bounded: a paragraph inside the ≤100-line cap (decision **0018**), which the file uses 84 lines of.

**Applied in.** `skills/run/references/defaults.md`, at Stage **11b-3** (decision **0089**).

### 0087 — Exit A of `reproduce` reverts its harness and keeps its output (2026-09-04, proposal DD, Stage 11b Start)

**Context.** `skills/task/references/reproduce.md §2` lists five harnesses, and row 2 — "a new test beside its neighbours" — **writes a file**; §4 says what to record and that the command becomes T1 of the plan verbatim, and says nothing about the file. Stage 11c's manual runs hit both sides of that silence against the same fixture copy: M3's exit A left `src/features/orders/ui/OrderDetailPage.test.tsx` untracked with `npm test` red before any plan existed, and flagged it as brushing the kernel's "no code is written here"; M4, one row of the same table away, wrote its scale test and removed it after reading the number, unprompted. Two runs, two answers, because the reference has none. The cost is the state the developer is left in: the project is red for a reason that is not theirs, and `git status` is dirty at the moment the phase hands back a routing decision.

**Options as they were put.** (a) Leave it, each run decides. (b) **Revert the harness, keep the output** — exit A records the block and restores the one path it touched, and the `## Reproduction` block names that the command becomes runnable when T1 writes the harness back. (c) **The harness survives and T1 becomes the fix** rather than the test. (d) **Commit the harness on the task's own branch** as its first commit.

**Taken (user, option b).** It keeps the kernel's boundary, leaves the project as found, and codifies observed behavior rather than imposing new behavior — M4 chose it for a green attempt with no instruction. (c) writes code before a plan exists, which the kernel forbids and M3 itself named, and would make T1's shape depend on which harness row was used. (d) invents a pre-plan commit for a `bug` that has no branch until `Plan: approved` records one, and `FORMATS.md §6` has no form for it.

**Cost if wrong.** The `Command:` line is not runnable until T1, and someone reading `brief.md` cold re-creates a test file from its own `Red:` output. Reversible: one sentence in one reference file.

**Applied in.** `skills/task/references/reproduce.md` §2 and §4, at Stage **11b-3** (decision **0089**).

### 0088 — A numeric bar in a spike's `## Question` names the statistic it is read on (2026-09-04, proposal EE, Stage 11b Start)

**Context.** `skills/task/references/plan.md §4`'s spike block requires `## Question` to be falsifiable, `## Timebox` to say what happens at the bell, and `## Exit` to state both outcomes in advance. Stage 11c's M5 satisfied all three and could not answer its own question: the bar read "does the plain list cross ~100 ms interaction latency at N = 1000", and the seven samples at N = 1000 were 235.6, 78.5, 73.3, 217.9, 69.5, 71.9 and 241.5 ms — median **78.5 ms** under the bar, worst **241.5 ms** over it, 3 of 7 over, and the distribution bimodal rather than noisy, so no further sampling collapses the two readings. The phase stopped, recorded its one `Gap:` and asked; the developer chose the worst interaction on the INP convention. The exit was taken correctly, and the decision the spike exists to produce was made outside the plan the developer had already approved — the one thing `## Exit` is for.

**Options as they were put.** (a) Leave it; a spike that hits this asks, as M5 did. (b) **The bar names its statistic, or the plan is not approvable** — median, worst, p75, "n of m samples over" — with the plan review checking it the way it checks the ten design fields. (c) **A default statistic**: a bar with no statistic is read on the worst sample. (d) (b) plus a required sample count.

**Taken (user, option b).** It is one clause in the field that already has to be falsifiable, and a number without a statistic is exactly what "falsifiable" is not. The statistic is chosen before the numbers exist, which is the argument `## Exit` already rests on. (c) is cheaper and worse for the reason M5 makes concrete: the same run measured 0 dropped frames of 80 at every N in both modes, so a worst-sample default would have answered a scroll question nobody asked. (d) bounds with a count what the timebox already bounds, and M5's seven samples per cell were not the problem — the reading was.

**Cost if wrong.** A spike plan gains a word filled in as "median" without thought, and a run measures the wrong statistic confidently instead of stopping to ask. Visible at Stage 12 as a spike whose `Gap:` count is zero and whose verdict the developer disagrees with. Reversible: one clause, and the `Gap:` route stays open underneath it either way.

**Applied in.** `skills/task/references/plan.md §4`, at Stage **11b-3** (decision **0089**).

**Amended by decision 0089's stage (2026-09-06):** the taken option's second half — "with the plan review checking it the way it checks the ten design fields" — has a home now, and this list names it: gap 6 and procedure step 2 of `agents/hodos-plan-reviewer.md`, built beside 0085's at Stage 11b-3's Review 1, which found the two decisions asymmetric where the option text was not, and the gap kinds of `COMPONENTS.md §2.3`'s `hodos-plan-reviewer` entry, which enumerates them.

### 0089 — Stage 11b runs as four parts, and the release is the last of them (2026-09-04, proposal FF, Stage 11b Start)

**Context.** The Stage 11b entry carried the deliverables of seven decisions settled ahead of it — **0066**, **0067**, **0074**, **0075**, **0076**, **0078**, **0079** — plus the release (README complete, `CONTRIBUTING.md`, CHANGELOG 0.1.0, the CI that installs the CLI and runs on Windows, the publication scrub, the public repository, `v0.1.0`), plus proposals **BB**–**EE**, scored by twenty-one acceptance bullets. None of the seven was built at Start: `grep -rln 'verify\.env|env\.mjs|hodos-preparer|for-files' scripts skills agents` found them in `docs/` only. Four of the eight builds are stage-sized alone — the `verify.env` stack, the precedent anchors, the touched-subproject command set with the monorepo package fix, and the release. `STAGE-PROTOCOL.md §6` is one stage per session, and §4 gives a stage one fresh review of one diff and two fix iterations.

**Options as they were put.** (a) One stage across as many sessions as it takes, `11b-plan.md` as the ledger. (b) **Four parts:** 11b-1 paths and subprojects (**0075**, **0076**, **0079**), 11b-2 the verify environment (**0074**), 11b-3 precedent anchors and the plan's prose (**0078**, **0085**–**0088**, **0066**, **0067**), 11b-4 the release. (c) Two parts, engine then release. (d) Move **0074** and **0078** out of 0.1.

**Taken (user, option b).** (a) hands the fresh review one diff of seven decisions and brings the breaker once, at the end, where "roll back" means rolling back the release with the engine inside it; (c) is that at three-quarters scale. (d) reverses one stage later the reasoning that put 11c before the release: a format published at 0.1 that no phase reads is the dead key `DESIGN.md §3.2` forbids, and an extension point added after the release is a breaking change to what projects install (decisions **0040**, **0081**).

**Order, and why it is that order.** 0075's git-root anchor lands in 11b-1 because one of 0074's own criteria — a layer raising the same directory from every depth — is scored against it, and 0076's `for-files` shares the config-merge code the same part touches. 11b-3 is prose in reference files, so its review is a text audit against `AUTHORING.md`. 11b-4 is the release: every cross-reference reading "11b is the release" resolves through it, and it is the tick Stage 9b's entry and the order rationale point at.

**Naming.** The parts are `11b1`–`11b4` in file and tag names — `docs/stages/11b1-plan.md`, `stage-11b1-base` — so the `NN` token of `STAGE-PROTOCOL.md` stays one word, and `11b-1` in prose. The `stage-11b-base` tag created at this Start is deleted in favour of `stage-11b1-base` on the same commit; no part is renumbered, as decision **0040**'s rule requires.

**Cost if wrong.** Three fresh-review dispatches and three report files a single stage would not have spent, and four Progress lines for one planned stage. Reversible in the direction that matters: a part whose plan file is not yet written folds into the part before it, so the split can be abandoned mid-way without undoing anything reviewed.

**Applied in.** `BUILD-PLAN.md` Progress and the Stage 11b entry, split into 11b-1…11b-4 with the acceptance bullets distributed; `docs/README.md` needs no change (it points at the Progress checklist).


### 0090 — Every layer is spawned detached, and `detached` is not a field (2026-09-06, proposal HH, Stage 11b-2)

**Context.** Decision **0074** wrote `"detached": true` on two of its five example layers and argued the key in its second constraint: a foreground process started inside an agent is orphaned when the agent ends, so *"`detached: true` layers are safe for anything to start"*. The grammar shipped the key, `config.mjs` validated it and `FORMATS.md` documented it — and no code read it. `spawnLayer` passes `detached: true` to every layer unconditionally, because the reason the key exists applies to all of them equally: a layer that is not detached is a layer the next command orphans. Stage 11b-2's first review filed it under criterion 1's own closing sentence — a format published at 0.1 that no phase reads — and its second review answered that removing a field a taken decision writes into its own example is a design change, not a build step.

**Options as they were put.** (a) **Amend 0074 and keep the key out**: `LAYER` no longer accepts it, the example and the field note say every layer is spawned detached, and a config still declaring it gets `unknown key in a closed object`. (b) Give the key a reader: `detached: false` means a one-shot `up` the script waits out in the foreground, its exit code standing in as the check where the layer declares none. (c) Restore it as advisory documentation — validated, ignored, described. Option (a) was then put a second time in two forms, after the stage's third review named the second: the key out and a config still writing it **errors**, or the key out with a `RETIRED` line (decision **0079**) that **warns** naming what replaced it, as `tasks.track` does.

**Taken (user, option a).** The key never described a choice. Every layer is spawned detached because the alternative is an orphan, and 0074 says so one clause after writing the key. (c) is the state both reviews called a defect, by name. The error form of (a) was taken over the `RETIRED` one because 0079's premise is a key that shipped in a released version — *"a project's config is a committed file, so a deleted key must not turn into an error on the next pull"* — and this key never left the build: no config can contain it yet, and `RETIRED` is looked up by a literal path (`config.mjs:453`), which a layer's `verify.layers.<name>` is not. `tasks.track` is the precedent for the warning form and would need that lookup widened. (b) is a different feature wearing this key's name — a foreground one-shot layer is worth its own decision if a project needs one, and it would open a state, a failure mode and a test surface in a part whose deliverable is already built and twice reviewed.

**Cost if wrong.** A project that wants a foreground one-shot layer writes it as a layer whose `up` exits and whose `check` reads what it did — which is what the `hosts` layer of 0074's own example already does. Recovering the field later is a schema key and a branch in one function; nothing is released, so no config has to be migrated.

**Applied in.** `scripts/config.mjs`'s `LAYER`; `FORMATS.md §2`'s example and its `verify.profile / profiles / layers` field note; `docs/COMPONENTS.md`'s `env.mjs` row, which already stated the unconditional behavior; `scripts/config.test.mjs`'s four-layer stack. Decision **0074** carries the amendment line. All of it at Stage **11b-2**.

### 0091 — The `codeIndex` role names blast radius and affected tests, and an adapter that omits one fails the check (2026-09-06, proposal KK, Stage 11b-3)

**Context.** `DESIGN.md:91` gives the role three operations — `findReferences`, `outline`, `readSymbol` — and two callers, research (precedents) and plan (blast radius). The shipped adapter maps exactly those three (`adapters/codeIndex/ariadne.md`, nine lines against the thirty-line cap of `scripts/lint.mjs:32`). The server behind it exposes twenty-three read-only tools, and two of them are the finished form of work a phase composes by hand today. `skills/task/references/plan.md:47` calls `findReferences` per changed symbol and asks the planner to sort every call site into the task's `Files:` or into `## Non-goals`; `blast_radius {symbol, depth?, kinds?, limit?, cursor?}` (`ariadne_v2 crates/ariadne-mcp/src/types.rs:338`) answers that in one call with the sort already made, `must_touch` and `may_touch` as separate lists over resolved edges. Nothing in the verify loop asks which tests the change reaches — `## Verify plan` maps the plan's claims onto `config.verify.recipes` and the verifier runs those; `affected_tests {spec, depth?, kinds?, limit?, cursor?}` (`types.rs:1195`) answers it against the working tree, which makes *a test the diff reaches that no recipe ran* a nameable finding instead of an absence nobody looks for. Evidence and the comparison that raised it: `research/08-codesight.md`.

**Why before the release.** `BUILD-PLAN.md:189` already states the rule for this surface — the format of `config.adapters.<role>` is published at 0.1, and an extension point added after the release is a breaking change to a file projects commit. The operation names are part of that surface *although nothing validates them*: `scripts/lint.mjs:432`'s `adapterFindings` checks `role:`, `server:`, the `mcp__<server>__` prefix and the presence of `gotchas:`, and never the operation names. A project adapter written against 0.1's three operations passes lint forever and answers nothing when a phase added at 0.2 calls a fourth — no error, just a capability that stops being reported. The same silent-key failure decision **0090** closed from the other side.

**Options as they were put.** Two, separable. *Scope:* (a) `blastRadius` only — one operation, one reader, the smallest change that is not nothing. (b) `blastRadius` + `affectedTests` — two operations, two readers. (c) (b) plus `diffBlastRadius` and `apiSurfaceDiff`. *Binding, for an adapter that is not this one:* (i) required, and checked — `DESIGN.md:91` is the contract, `lint.mjs` gains a per-role required-operation check, and a project adapter missing one fails `config.mjs check` by name. (ii) optional, with a named fallback in the phase sentence — "`blastRadius`, or `findReferences` per symbol where the adapter has none".

**Taken (user, scope (b), binding (i)).** Both operations pass the test `DESIGN.md §3.2` applies at role granularity: a phase computes that answer today, by hand, from a weaker input. (a) declines the half of the move that costs the same review pass. (c) fails the test outright on both additions, and one of them is refused by the tool layer rather than by taste — `diffBlastRadius`'s natural caller is `review-package.mjs`, a **script**, which cannot call an MCP tool at all, and `apiSurfaceDiff`'s would be finish, which asks no SemVer question today, so giving it one is a phase behavior change wearing an operation's name. (ii) is the silence this decision exists to prevent, written down as a feature: an adapter without the operation quietly behaves like 0.1 and nobody is told. Making absence loud costs one function in `lint.mjs` while nothing is released and no project has an adapter to migrate; after 0.1 it costs every project that wrote one. The duplication cons of (i) — a required-operations table beside `DESIGN.md:91` — is answered the way `FORMATS.md §13` answers it for the file shape: a contract nothing checks is a contract a verifier can silently get nothing from.

**Why this does not disturb proposal GG.** GG's option (d) — the reviewer calling `codeIndex` itself — was refused because `agents/hodos-reviewer.md:6` is an allowlist (`tools: Read, Grep, Glob, Bash, Write`) and no MCP tool can reach that agent. This decision's two readers are plan, which runs in the main session, and the verifier, whose frontmatter is a denylist (`disallowedTools: Edit, NotebookEdit`) and which already calls MCP tools through `config.adapters.browser` (`skills/run/references/verify-loop.md:78`). Both are settled at the same Start, so the overlap is decided in one sitting.

**Not taken, and named so it is not re-raised as a build step.** The framework layer of `research/08-codesight.md §3` — routes, ORM schema, env vars. It is a real gap in the index (verified: `ariadne_v2` has no route, endpoint, schema or env concept in its documentation) but it is the index's gap to close, and no hodos phase asks for it. An operation no phase calls is the dead key of `DESIGN.md §3.2`.

**Cost if wrong.** The plan's blast radius returns a `must_touch` / `may_touch` split the planner sorts no better than it sorted a flat reference list, and verify gains a line naming tests the recipes did not run that is noise on every real task. Both are unmeasured until Stage 12 — no fixture in `bench/` runs an index server, so each path is proven by its `Skip:` branch and by prose, exactly as `design.getFrame` and `tracker.link` were (`docs/stages/10b-report.md:78`), and this decision carries decision **0015**'s admission by name. Reversible: two rows of prose, two adapter lines, one lint table. The irreversible half is the one being bought — operation names inside a released role contract.

**Applied in.** `DESIGN.md:91`'s row, both the Operations and the phase columns; `COMPONENTS.md:252`'s `codeIndex/ariadne.md` clause; `COMPONENTS.md:74`'s plan entry, whose blast-radius clause names `findReferences` today; `adapters/codeIndex/ariadne.md`, two operation lines plus the gotchas pagination and the `spec` default need, inside the thirty-line cap; `skills/task/references/plan.md:47`; a new clause in `skills/run/references/verify-loop.md` beside the `config.adapters.browser` one; `scripts/lint.mjs` and `scripts/lint.test.mjs` for the required-operation check. `skills/task/references/research.md:39` keeps `findReferences` and `outline` unchanged — "where else does this happen" is a reference question, not a blast-radius one. `skills/adapter/SKILL.md:29` is unchanged: the roles stay eight. All of it at Stage **11b-3**.

**Amended by decision 0089's stage (2026-09-06):** binding (i) has two surfaces, not one, and the applied-in list names both. `config.mjs check` **fails** by name on a project adapter that omits an operation — the surface this decision named, and the one that closes `/hodos:adapter` — with the role table and the operation reader exported from `scripts/config.mjs` so the two checks cannot drift. `lint --project` reports the same absence as a **warning**: `init` completes on its exit 0 and reads every rule and map of the project besides, so a run that stopped on an adapter it did not write would report nothing else it found. The homes the split reached, beyond `DESIGN.md:91`'s row: `scripts/config.mjs` (the table, the operation reader and the check), `scripts/lint.mjs` (which imports all three), `scripts/config.test.mjs`, `DESIGN.md:98`'s paragraph, `COMPONENTS.md §3`'s `config.mjs` row, `skills/adapter/SKILL.md`'s two-checks step and `skills/init/SKILL.md`'s self-check — the original list's "`skills/adapter/SKILL.md:29` is unchanged" is still true of `:29` and of nothing else in that file. Shipped as a warning on both surfaces at first; Review 1 read the decision's own title against it, and the user settled it here.

### 0092 — The claim set is derived from the plan's contract, checked in review, and the verifier may call it weak (2026-09-06, proposal LL, Stage 11d)

**Context.** Claims reach the verifier from the tasks' `Acceptance:` clauses and `## Verify plan` (`skills/task/references/plan.md §3`, `§5`), both written by the conversation that designed the change; `agents/hodos-verifier.md` forbids judging them, and `hodos-plan-reviewer`'s gap 2 checks that a criterion is runnable, never that the set is complete, on `deep` only. The ceiling of verify was the plan's imagination. Three sources say what to do instead: `skill-creator`'s grader is required to call a weak assertion weak and `grading.json` has the field for it, `eval_feedback` (`research/09 §3.2`); Design by Contract derives a claim from every postcondition, a property from every invariant and a negative claim from every precondition, and the plan's `### Invariants & failure modes` was read by nothing (`§2.1`); and "two domain experts would independently reach the same pass/fail verdict" is a criterion's testable property (`§3.4`).

**Options as they were put.** (a) Leave it — the plan review on `deep` and the reviewer's `L1`–`L9` are the coverage. (b) **Derive at plan time, check in review**: three rules in `plan.md §3` — the contract field yields claims by clause kind; every member of a typed state the tasks touch is a claim, and a state that is not a type is named by hand with one line saying so; a task that adds a branch claims its failure path — plus a sixth plan-review gap on `deep` and an **Unclaimed** row in the reviewer's Spec section on every path, over the diff and the plan it already holds. Cons: a longer plan phase, nominal claims satisfying rule 3, boolean-soup projects getting rule 2's admission and nothing more. (c) **Critique at verify time**: `## Claim feedback` in `verify.md` — unfalsifiable, redundant or absent claims — carried to the finish report, never into the verdict. Cons: the wrong end of the loop for a missing claim, and a widening of the narrow agent. (d) Both.

**Taken (user, option d, as recommended).** (b) is the load-bearing half: spec-provable, mechanical, checked on every path because the reviewer holds both inputs, and placed where a missing claim is still cheap. (c) is first-party in form and free in mechanism, bounded as the grader's is — a section, never a row, never a count. Independence here is bought by mechanism, not by a second opinion: a union member is a member whoever lists it, and the reviewer's check is over the code rather than the author's intent. The QA-style independence — a check that holds whatever the plan said — is decision **0096**'s plan-independent oracles, not this one.

**Cost if wrong.** A plan paragraph nobody reads, an empty Spec row on most diffs, a `verify.md` section the report repeats — one block each. Box-ticking under (b) surfaces where every nominal field does: the plan review's gap 1.

**Applied in.** `skills/task/references/plan.md §3` (the three rules) and `§5`; `agents/hodos-plan-reviewer.md` (gap 6); `agents/hodos-reviewer.md`, `DESIGN.md §7.3` and `COMPONENTS.md §2.1` (the Unclaimed row); `FORMATS.md §9` (its shape); `FORMATS.md §10` and `agents/hodos-verifier.md` (`## Claim feedback`); `skills/run/references/finish.md` (carries it). Stage **11d**.

### 0093 — What the verifier may add, and where it must come from (2026-09-06, proposal MM, Stage 11d)

**Context.** "Claims are run, not judged" left the verifier unable to report anything the plan did not name — a console error on an unclaimed route was a note, never a row. The proposal's first version answered with the testing literature's named oracles (HICCUPPS, `research/09 §2.4`): a row may be added when it cites the oracle it was judged by. The user's review put the objection in one sentence — a label on a judgement is still a judgement — and the evidence agreed: the Agent SDK ranks LLM-as-judge last and "generally not a very robust method" (`§3.4`), Greptile measured its own judge as "nearly random" (`research/06 §1.3`), and the evaluation docs require a model grader to be calibrated against people first.

**Options as they were put.** (a) Leave it — nothing is added. (b) **Rows from four sources, and nothing else**: a console error or failed request on a visited route; a detector hit (decision **0096**); a crash under an attack (**0096**'s plan-independent oracles); a pin that no longer holds (decision **0094**). Ordinary `pass`/`fail` rows naming their source in the Command column, in the counts and the fix pass; intended cases allowlisted in `verify.detectors.allow`, the `review.generated` shape of decision **0065**. (c) Oracle-named judgement rows — the first version. (d) A judged status beside the mechanical one on every row.

**Taken (user, option b, as recommended).** The `finding` status of the first version is withdrawn: a detector row is a run row. (c) and (d) fall to the same measured fact — a model's judgement of its own observation is the one signal here that has been tested and found unreliable. The position this leaves the engine in is one sentence, and `DESIGN.md §7.4` carries it: hodos derives, runs and shows evidence; it does not judge, and the judgement is the developer's.

**Cost if wrong.** Detector rows fire on intended layouts until the allowlist catches up — one config line per case, the cost `review.generated` already charges. A source-4 row that is a rotted pin rather than a broken change is told apart by decision **0097**'s `pre-existing` proof.

**Applied in.** `agents/hodos-verifier.md` (the four sources; the anti-pattern rewritten from "never add" to "add from these and nothing else"); `DESIGN.md §7.4` (the sentence); `FORMATS.md §10` (source in the Command column); `FORMATS.md §2`, `scripts/config.mjs` and `skills/init/references/config.md` (`verify.detectors.allow`). Stage **11d**.

### 0094 — A claim proved once is pinned as an assertion, or it was not proved (2026-09-06, proposal NN, Stage 11d)

**Context.** `verify.md` and `evidence/` fold into `plan.md#Outcome` and are deleted at finish (`DESIGN.md §7.5`); recipe `routes` are static. A browser claim was a one-shot, and `BACKLOG.md` already held the narrow form — iteration 2 is blind to a browser claim that regressed. Beizer's pesticide paradox and Google's Beyoncé rule (`research/09 §2.3`) name it; Playwright's generator, which writes a suite rather than a URL list (`§4.1`), shows the durable shape. The proposal's first version promoted the **route**; the user's review found that a re-visit has no oracle — a smoke check, not a regression — so decision **0096**'s regression class had no content.

**Options as they were put.** (a) Leave it — the project's suite is the durable artifact. (b) Promote the route. (c) Generation by the verifier into the project's e2e suite. (d) **Promote the claim as an assertion**: a `pass` browser row already holds route, `evaluate` predicate and the value seen; the verifier marks it `pin`; finish, on approval, writes `{route, evaluate, expect}` into `verify.recipes[ui].checks[]` — one additive `RECIPE` field — or into the project's e2e suite where one is declared; later `ui` runs execute the checks, a check returning something else is a `fail` row with source *pin*, and **0097**'s base-sha proof says whether the pin rotted or the change broke it. Predicates over roles and text, never CSS selectors; a check whose route no longer resolves is pruned at `init --refresh`; no visual baseline, because it needs an approval workflow hodos has no surface for. Plus the regression **surface**: the diff's files together with proposal **GG**'s `## Callers`, resolved through the `ui` recipe's `when` globs to routes, join the sweep — under **0096**'s oracles where no pin exists yet.

**Taken (user, option d, as recommended).** (b) is declined for the reason the review found. (c) is declined on separation, not cost — the grading phase would write code, and `disallowedTools: Edit` exists for that. (d) reuses the row the verifier already writes, keeps the separation (the verifier proposes, the kernel writes), and puts the durable record in a committed file. Decision **0079** is undisturbed: its list is of *task* records, and `config.json` was already the team's committed declaration. Where **GG** is declined, the surface degrades to the diff's files alone, and this decision does not depend on it.

**Cost if wrong.** `checks[]` fills with brittle predicates that fail on redesign — visible as `pre-existing` rows with a base-sha proof, deletable one line at a time. The field and its reader land in the same stage, so 0.1 carries no dormant key (decision **0090**).

**Applied in.** `FORMATS.md §2` and `scripts/config.mjs` (`RECIPE.checks[]`); `FORMATS.md §10` (the `pin` marker); `agents/hodos-verifier.md`; `skills/run/references/finish.md` (the approval and the write); `skills/run/references/verify-loop.md` (the surface; running `checks[]`); `skills/init/SKILL.md` and `references/scan.md` (`--refresh` prunes); `COMPONENTS.md §1.2`; `DESIGN.md §7.5` (what survives finish now names the pins). Stage **11d**.

### 0095 — Two non-functional recipe kinds, and the adapter operations they need, ship with 0.1 (2026-09-06, proposal OO, Stage 11b-4)

**Context.** `scripts/config.mjs:302` closed the recipe kinds at `command`, `browser`, `http`; `perf` is a `when` that runs only where the plan declared it. The whole of Q4 — accessibility, responsive behavior, budgets, schema conformance — was absent or hand-written per plan, and it is the class a QA does by hand and would rather not. First-party offers nothing to copy: `webapp-testing` has no accessibility, viewport or error-state content (`research/09 §3.1`). The substrate's vocabularies are settled: axe's `impact` (`minor | moderate | serious | critical`) with an `incomplete` bucket meaning "needs review"; pa11y's exit-code levels; Lighthouse CI's assertion format; schemathesis's named checks (`§4.4`); WCAG 2.1 AA with zero critical as the community bar (`§4.2`).

**Options as they were put.** (a) Leave it. (b) **Two kinds**: `a11y` — the recipe's routes audited through the adapter's `audit` operation where the adapter declares one, or through the project's own `run` where it names a tool, rows by `impact`, `incomplete` a skip with its reason — and `viewport` — an existing `ui` recipe's routes re-visited at a declared `widths[]`. Both `when`-gated, so an undeclared kind costs nothing. (c) Four kinds, adding `budget` and `schema`. (d) One generic `tool` kind that runs a command and parses an exit code.

**Taken (user, option b, and placed in Stage 11b-4 by the user's choice).** Accessibility and responsive behavior are universal to the projects hodos targets, mechanically answerable and cheap to skip. (c)'s two extra kinds wait for evidence: `perf` stays a `when` until the pilot shows a project that declares a budget, and `schema` waits on the same rule — a format adopted before anyone has an instance is a format written against nothing. (d) discards the vocabulary that makes a row readable. **The placement:** adding an enum member is additive and would have been safe after the release; the user took the alternative anyway, so that the config a project installs at 0.1 already carries the five kinds and `init` proposes them from the first run. The two kinds ship **with their reader** — the verifier produces rows for them — because a kind nothing reads is decision **0090**'s dormant key. Folded in by the same review: the adapter file declares no operation that changes the viewport or the network, so `adapters/browser/chrome-devtools.md` gains `resize` (`resize_page`), `emulate` (`emulate`, for throttled and offline network — decision **0096**'s attacks) and `audit` (`lighthouse_audit`, whose accessibility category is axe underneath), and `FORMATS.md §13`'s operation list gains the three rows.

**Cost if wrong.** Two kinds nobody declares — two branches in the verifier's recipe table and two schema entries. Declared with the tool absent, every row is a skip with a reason, which is what the format already does for an unconfigured command.

**Applied in.** `scripts/config.mjs` (`RECIPE.kind`, `widths[]`) and `scripts/config.test.mjs`, test-first — the existing `kind: 'shell'` case at `:352` stays red; `FORMATS.md §2` (the recipe note) and `§13` (three operations); `adapters/browser/chrome-devtools.md`; `agents/hodos-verifier.md` (the two kinds' rows); `skills/init/references/config.md` (proposed defaults); `COMPONENTS.md §2.2`. Stage **11b-4**.

### 0096 — The five uncovered classes are derived claims and plan-independent oracles, not an exploration (2026-09-06, proposal PP, Stage 11d)

**Context.** Five things a tester does and hodos did not, each a tour of Whittaker's (`research/09 §2.4`): the end-to-end flow (*Money*), state transitions in an unscripted order (*Landmark*), negative paths (*Saboteur*), the sweep of every empty and error state (*Garbage Collector*), presentation defects (*Supermodel*). The proposal's first version answered all five with an exploratory agent — a tour, a timebox, findings. The user's review: that is trusting a model that orients on nothing but its own judgement. The evidence had said so — no reference implementation exists (`§4.5`), LLM-as-judge ranks last (`§3.4`), and the bench had nothing to score (decision **0015**).

**Options as they were put.** (a) Leave it, and the README names Q3 as uncovered. (b) The exploratory dispatch. (c) **The derivation contract**: each tour is a class of claims with a derivation rule and a decidable oracle — regression from the pins (**0094**) over a surface of the diff's files and callers; state coverage from typed state (**0092** rule 2); negative paths from preconditions, schema and property where a runner exists; the state sweep as **0092**'s claims × routes with states forced through `initScript`; presentation defects from detectors. Plus a **plan-independent** class, the one that finds what nobody wrote: under a closed attack list on every visited route — invalid input in every field, permission denied through `stub`, network killed and throttled through `emulate`, a double submit, a back-and-forward round-trip — the application does not crash: no uncaught exception, no console error, no unhandled rejection, no 5xx, a snapshot that still answers, exactly one request where one was sent. Detectors as two halves of one zero-dependency script, `scripts/detectors.mjs`: a **collector** the adapter's `evaluate` runs, reading properties and returning JSON with no comparison in it, and a **decider**, a pure function from that JSON to hits where every threshold lives — both `node:test`ed first, the decider on JSON fixtures, the collector against a duck-typed `document` carrying exactly the properties it reads; `scripts/matrix.mjs` prints the pairwise covering set the same way. Roles unchanged: the plan derives, the review checks the derivation statically, the verifier runs and reads no code. Three bounds: pairwise by the NIST interaction rule; `when`-gating to the surface; pipeline order with fail-fast — command recipes first, and rows behind a red stage written `skip: not run — <stage> red`. And one report block, `## Not covered`: the matrix that ran, every skip with its reason, and a fixed residue line naming what the engine does not check by construction. (d) (c) plus a small (b) for the residue.

**Taken (user, option c, as recommended).** It keeps every reason the proposal was raised — the gaps are real and are the work a QA does by hand — and removes every reason it was declined: no row is judged, every row is run, every class is seedable into `bench/review/seeded/`, and the residue is stated rather than imitated. (d) inherits every objection to (b) for the part with no oracle. **Test-first holds with no exemption** — the user refused the bench-arm deviation the proposal's second draft asked for, and the collector/decider split is the answer: the only environment-bound code is a property reader, tested against a stub of what it reads; the bench's fixture page with seeded overflow, truncation and overlap **verifies the environment** and is not where the logic is tested. The residue, honestly: the first cross-feature interaction before a neighbor is pinned, aesthetics and product fit, usability as a person means it — Q3 proper, named in every report's residue line.

**Cost if wrong.** Claim counts grow until the bounds bite, which they exist to do; detectors fire on intended layouts until `verify.detectors.allow` catches up; the pipeline order hides browser rows behind a red unit stage by design, and the rows say so.

**Applied in.** `DESIGN.md §7.4` (the classes, the oracles, the bounds — the contract itself); `COMPONENTS.md §1.2` and `§2.2`; `agents/hodos-verifier.md` (attacks, detectors, order, `## Not covered`); `skills/run/references/verify-loop.md` (order, matrix, surface); `scripts/detectors.mjs`, `scripts/matrix.mjs` and their tests; `adapters/browser/chrome-devtools.md` (one gotcha naming the two commands); `FORMATS.md §10` (`## Not covered`, the `skip: not run` reason); `bench/review/seeded/` (defects of the state, negative and presentation classes) and a fixture page under `bench/fixtures/webapp`; `BACKLOG.md`'s codesight item, pulled in. Stage **11d**.

### 0097 — Severity on a failing row, and `pre-existing` earned at the base sha (2026-09-06, proposal QQ, Stage 11d)

**Context.** A verify row was `pass`, `fail` or `skip` where the review one phase earlier had `blocker | major | minor`; the fix pass took failures in table order and the breaker handed the developer one bundle. Code Review grades Important / Nit / **Pre-existing** — "a bug that exists in the codebase but was not introduced by this PR" — and `/security-review` reports nothing below a confidence of 0.7 (`research/09 §3.3`); Kaner separates severity from priority (`§2.5`).

**Options as they were put.** (a) Leave it. (b) Severity on `fail` rows, reusing the review's vocabulary. (c) **(b) plus `pre-existing`**, earned: the same check re-run at the task's base sha in a `git worktree`, that run's output in the evidence column; a check that cannot run at base stays a plain `fail`. (d) (b) plus priority as a second field.

**Taken (user, option c, as recommended).** Severity is free vocabulary reuse and makes the finish report speak one language across both loops. `pre-existing` is the status the verifier meets on almost every real project and could not express, and the proof rule keeps it from becoming the excuse column. (d) is declined on the boundary between what the verifier knows and what the developer decides at the breaker.

**Cost if wrong.** Severities a developer reads differently, visible in the fix order, one word per row to ignore. A wrongly claimed `pre-existing` is the dangerous half, and the base-sha proof is the guard: no base output, no status.

**Applied in.** `FORMATS.md §10` (severity on `fail`, the `pre-existing` status and its proof rule); `agents/hodos-verifier.md` (the worktree run); `skills/run/references/verify-loop.md §7` (fix pass by severity) and `§9` (the breaker names the counts); `skills/run/references/finish.md`. Stage **11d**.

### 0098 — Every numeric claim names its statistic, and a pass on retry is `flaky` (2026-09-06, proposal RR, Stage 11d)

**Context.** One green run was a pass, and a numeric claim reported its number once. Decision **0088** settled half of it for a spike's `## Question` after Stage 11c's M5 measured a bimodal distribution against a "~100 ms" bar. `benchmark.json` reports mean, stddev, min and max per configuration (`research/09 §3.2`); Playwright buckets a pass-on-retry as `flaky`, apart from `passed` (`§4.1`); Google treats a flake as a defect in the test, quarantined and budgeted (`§2.3`); Kleppmann: percentiles, never the mean.

**Options as they were put.** (a) Leave it. (b) **Generalize 0088**: a claim whose evidence is a number names its statistic; a timing claim runs at least five times and reports median and p95. (c) **(b) plus `flaky`**: a browser or command row that fails and passes on exactly one retry is `flaky`, both outputs in evidence, treated as a failure by the verdict unless accepted at the breaker. (d) A quarantine ledger across tasks.

**Taken (user, option c, as recommended).** (b) closes the gap 0088 left open at the cost of a sentence. `flaky` is worth its retry because the alternative — a flaky claim recorded as `pass` on the retry — is the one outcome that actively misinforms. (d) is a v2 shape named so it is not re-derived: it needs a home that survives the task directory, which decision **0079** deliberately did not give task records.

**Cost if wrong.** Longer timing rows, and a shaky environment producing `flaky` rows read as noise — one column and one retry rule, and the verdict arithmetic changes by one sentence.

**Applied in.** `agents/hodos-verifier.md` (the runs, the statistics, the retry rule); `FORMATS.md §10` (`flaky`, its treatment); `skills/run/references/verify-loop.md §9` (the breaker may accept `flaky`); decision **0088** carries the generalization line. Stage **11d**.

### 0099 — A seeded data state is a layer under 0074's grammar; personas wait for the pilot (2026-09-06, proposal SS, Stage 11d)

**Context.** `verify.layers` (decision **0074**) raises processes and no data, so every claim runs as whatever user the dev fixture serves, and a role-dependent feature is verified in one of its states. Meszaros' fixture strategies name the trade (`research/09 §2.2`); the NIST interaction rule bounds a role × state matrix to pairwise (`§2.1`).

**Options as they were put.** (a) Leave it. (b) `verify.personas` — named logins or seed commands, a claim naming a persona run once per persona. (c) **A seed as a layer** — data raised and torn down like any other layer, with its own `check` and `access`, leaving who the user is to the project. (d) Both, pairwise.

**Taken (user, option c now, option b deferred to Stage 12, as recommended).** Reading (c) against 0074's grammar shows it needs **no new field**: a seed is a layer whose `up` runs the seed, whose `check.kind: cmd` proves the state, and whose `stop` resets it — the lesson of decision **0090** applied before the key is written. What this decision adds is the documented shape, an example layer in `FORMATS.md §2`, and the rule that a claim naming a data state names the layer that provides it. (b) is not designed against `bench/fixtures/`: none of the four fixtures has authentication, so a persona format written now is written against nothing, and its failure mode — a credential in a committed file — deserves a real project's answer. `ariadne_v2` at Stage 12 is where it exists; a `BACKLOG.md` line carries it there.

**Cost if wrong.** A documented layer shape nobody uses. Deferring (b) costs a pilot task the ability to verify a role-dependent claim automatically, which the pilot records as a finding — the outcome that teaches the format anyway.

**Applied in.** `FORMATS.md §2` (the seed layer's shape and example, in the `verify.profile / profiles / layers` note); `skills/task/references/plan.md §5` (a claim names its data layer); `skills/run/references/verify-loop.md §3` (nothing new to raise — `env.mjs up` already does); `BACKLOG.md` (personas, Stage 12). Stage **11d**.

### 0100 — The review package names the call sites of the symbols the diff changed (2026-09-06, proposal GG, Stage 11b-3 Start)

**Context.** Three of the nine behavioral codes the reviewer runs ask a question the diff cannot answer — `L1` "which caller still expects the outer value?", `L4` "who else holds that reference after the call?", `L6` "what does the callee actually do on failure at this line?" (`agents/hodos-reviewer.md:39`, `:42`, `:44`) — and the prompt gives the reviewer one escape from its input boundary for all three: "Inspect outside it for **one** named risk with **one** focused check" (`:96`). hodos computes that information one phase earlier and throws it away: `skills/task/references/plan.md:47` calls `codeIndex.findReferences` on the symbols the tasks *intend* to change, before the diff exists. Decision **0076** settled the same shape of question for the projects list — the package computes over the diff and does not predict from the plan's `Files:` lines — and the argument carries to symbols unchanged. The outside evidence is `research/06-greptile.md`: reading a change together with its callers is the one mechanism a well-funded reviewer positions its whole product on (`§1.1`), and the only one of the seven hodos has no review-time answer to (`§4.3`).

**Options as they were put.** (a) Leave it: the plan's blast radius, the reviewer's one focused check and the project's tests are what stands between a change and a caller it broke. (b) **A computed `## Callers` section** — `review-package.mjs` derives the exported symbols whose declarations the diff changed, greps the repository for each outside the changed files, and writes up to N call sites per symbol as `path:line` plus that line's text, under a cap reported when it bites, the shape `## Not packaged` already uses. Cons: a grep by name is imprecise — a common method name resolves to unrelated modules, a symbol reached through a re-export or a dynamic key is missed — so the section is a pointer list the reviewer judges and never a finding; and the bytes are spent on every package while the value lands only on diffs that change a caller-facing symbol. (c) **Widen the prompt instead**: replace the single focused check with a budget of K greps. Cons: it spends the reviewer's turns on discovery a script does once, weakens the one sentence that keeps the reviewer out of the codebase, and records nothing on disk, so the axis is unmeasurable outside `## Coverage`. (d) **Adapter-fed at review time**, the reviewer calling `codeIndex.findReferences` itself.

**Taken (user, option b).** It is a **context** change, not a prompt change: the reviewer already asks the caller questions and the section answers them, so `agents/hodos-reviewer.md` gains one sentence naming the new input and no instruction. (d) is foreclosed by the tool layer rather than by taste — `agents/hodos-reviewer.md:6` is an allowlist (`tools: Read, Grep, Glob, Bash, Write`) that no MCP tool can reach, which decision **0091** records from the other side — and it would make the reviewer's input differ by project, which is the input the bench scores. (a) ships the gap in 0.1, and `review-input.md`'s shape is not a thing to change after a release. (c) buys the same answer with the reviewer's context and leaves nothing measurable behind.

**The cap is two constants in the script, not a config key** (settled with the option, at the same Start). `config.review` is a closed object of two keys and 0.1 freezes it; a third key that no project has yet needed is the dead key `DESIGN.md §3.2` refuses. The numbers are stated in `FORMATS.md §8` and printed in the section when they bite, which is the evidence that would earn a key in 0.2.

**Measured, not asserted.** Decision **0015**'s rule applies with a bench to discharge it on: `bench/review/seeded/` holds eighteen defects with no cross-file defect among them, so this earns a nineteenth — behavioral, an `L1` whose only evidence is a caller outside the changed files — and the review bench is re-bought with it. `precision` (≥85% gated, 41/44 = 93.2% on the run of 2026-09-02) is the number that says whether the section adds noise. The price is honest: the recorded run was six dispatches and $4.33, and this adds packages rather than replacing them.

**Cost if wrong.** Every package grows a list of pointers to call sites nothing was wrong with, the reviewer reads them, and precision falls — which the gate catches, in the same run that would have justified the section. Reversible: one function and one section in `review-package.mjs`, one block in `FORMATS.md §8`, one sentence in the reviewer prompt, one seeded patch; none of them load-bearing for anything else.

**Applied in.** `scripts/review-package.mjs` and `scripts/review-package.test.mjs`; `FORMATS.md §8` (the `## Callers` block, its two constants and the line it prints when a cap bites); `agents/hodos-reviewer.md` (one sentence naming the input); `bench/review/seeded/` (the nineteenth patch), `bench/review/README.md` and `docs/BENCH.md` (the counts, twelve convention and seven behavioral across seven codes), `bench/review/packages/` (the package it joins); `BUILD-PLAN.md` Stage 11b-3 deliverables and acceptance. Stage **11b-3**.

### 0101 — Machine state is written atomically, and a write refuses a ledger it could not read (2026-09-06, proposal JJ, Stage 11b-4 Start)

**Context.** `DESIGN.md §5.1` gives machine state one writer, and resume rests on it. Two ways that writer loses the state it is trusted for: `writeFileSync(join(taskDir, 'state.json'), …)` (`scripts/ledger.mjs:379`) truncates before it writes, so a process killed in that window leaves a truncated file where the task's phase used to be, and the two claim pointers of decision **0047** are written the same way (`:419`, `:423`); and `readLedger` fails open to zero events on any read error (`:355-361`), after which `append` derives a state from those zero events and overwrites a good `state.json` with it. The second failure is the worse of the two — a truncated `state.json` is visibly broken, while a state derived from an empty ledger parses cleanly and says the task is at its beginning. `ChristopherKahler/base` names both rules and the incident behind the second (`research/07-basemode.md §2.3`, `§4.2`).

**Options as they were put.** (a) Leave it. (b) **Atomic write only** — serialize to a temp beside the target and `renameSync` into place, for `state.json` and both claim pointers. (c) **(b) plus a strict write** — `readLedger` separates absent, which is legitimate on the first line, from unreadable, and `append` refuses rather than deriving a state from events it could not read: it names the file, writes nothing, and exits non-zero. (d) The full durability set: (c) plus a snapshot before every state write and a restore path.

**Taken (user, option c).** (b) alone leaves the failure a resume trusts. (d) buys a backup for a file that is derived — `state.json` is rebuilt from `ledger.md` by the same function that wrote it — and the thing actually worth snapshotting, the ledger, is append-only and never rewritten. Re-parse validation, the third clause of their rule, is deliberately not taken and the reason is recorded so it is not raised again: their serializer is hand-written NQuads and can emit text its own parser rejects, while ours is `JSON.stringify`, which cannot.

**Cost if wrong.** A hodos command gains a failure mode where it used to continue. It exits before touching anything and the ledger it could not read is unchanged, so the failure is loud and lossless, which is the trade. A process that dies between write and rename leaves a `.tmp` beside `state.json`; the next write replaces it and `finish` deletes it with the directory. Reversible: three functions and their tests, no format change, no config key, nothing a project sees.

**Applied in.** `scripts/ledger.mjs` (`writeAtomic`, `readLedger`, `append`) and `scripts/ledger.test.mjs`, test-first (decision **0022**); `DESIGN.md §5.1`, the sentence that gives machine state one writer. Stage **11b-4**.

### 0102 — The public tree is exported from the build repository, and its history begins at 0.1.0 (2026-09-06, Stage 11b-4 Start, amends 0064)

**Context.** Decision **0064** settled *what* is published — the specification public, `research/` and `docs/stages/` private in a sibling `hodos-build` — and *when*: after the scrub, before any push, because a marketplace install clones the repository and git history keeps whatever the first push contained. It did not settle two mechanics the release runs into. First, this checkout has no remote and the machine has no `gh` CLI, so the repositories are created by the user. Second, "move to a private sibling" reads two ways, and one of them costs the build its own record: `CLAUDE.md`'s read order, `STAGE-PROTOCOL.md` and every `docs/stages/NN-report.md` point at `docs/stages/`, and Stages 11d, 9b and 12 are still to run.

**Options as they were put.** *The history:* (a) a single scrubbed commit tagged `v0.1.0` in the public repository, the full history staying private; (b) the full history rewritten with `git-filter-repo`, dropping the two directories and replacing the employer strings across every commit; (c) publication deferred with its criteria left open. *The build record:* (a) this checkout stays the build repository and the public tree is exported from it; (b) the two directories physically move to a sibling checkout and this one becomes the public tree.

**Taken (user, (a) and (a)).** The public history begins at 0.1.0 and is regenerated by an export at each release; this checkout is `hodos-build`, private, with everything in it. (b) on the history buys a real commit history at the price of one irreversible rewrite and a re-verification that no old blob still carries a name — and buys it for a reader who has the tag and the CHANGELOG either way. (b) on the build record satisfies 0064's wording and takes the stage protocol's own ledger out of the repository the stages run in.

**What follows, and is not negotiable after it.** The employer names are scrubbed **at source**, in the build repository, not in the export: one text per file, and the export is a pure file copy over a path allowlist. So the check is a `grep` over the exported tree that returns nothing, rather than a replacement table two texts can drift across. The names are replaced by what the sentence needed them for — a shape, never an owner — so `DECISIONS.md` 0074 keeps its four-layer procedure and loses the repositories, hosts and registry that identify whose it is. `research/` keeps its names and stays private.

**Cost if wrong.** The public repository shows one commit where a reader might have wanted a history; the history is one repository away and the tag names the release it belongs to. If a name survives the scrub it is in a public clone, which is why the export's test is the grep and why it runs before the push rather than after. Reversible in the direction that matters: the private repository holds everything, and a second export replaces the public tree.

**The owner, corrected.** The handle is **`mind-decay`**, and every manifest, install line and link carried `minddecay` from Stage 0 to this one — a typo nobody could catch while the URL resolved to nothing. Decision **0064**'s context quotes the wrong form because that is what `plugin.json` held when it was written, and this file is append-only.

**Applied in.** `tools/export-public.mjs` and `tools/export-public.test.mjs`; the scrub across `docs/DECISIONS.md`, `docs/00-decisions.md`, `docs/BUILD-PLAN.md`, `docs/BACKLOG.md`, `docs/FORMATS.md §11` and `scripts/campaigns.test.mjs`; `docs/README.md`, which says which pointers resolve only in the build repository; `docs/stages/11b4-manual.md`, where the user creates the two repositories. Stage **11b-4**. Corrected by review 1: `docs/PLATFORM-NOTES.md` fact 23, whose consequence column carried a copyable `claude plugin marketplace add minddecay/hodos`, and `LICENSE:3`, whose copyright line read `minddecay` against `plugin.json`'s author. Neither file is append-only.

### 0103 — 0.1 runs on Windows, and the port is part of the release (2026-09-06, proposal TT, Stage 11b-4)

**Context.** `DESIGN.md §3` justifies the Node-only rule with "no bash (Windows)", and the `windows` job added at this stage is the first time the suite has ever run there. It was red on **30 tests**, in six causes: CRLF from the runner's checkout, `\` in a path the engine prints or a test asserts on, a package id built from a path split on `/`, a redirected home that a test set through `HOME` while `homedir()` on Windows reads `USERPROFILE`, two POSIX-only fixtures inside the tests, and one path interpolated into a regular expression. Two of the six are product behaviour rather than test text.

**Options as they were put.** (a) **Port before 0.1** — fix all six classes now. (b) 0.1 is macOS and Linux, the job is dropped, the six classes become a backlog item and the port a later stage. (c) Keep the job with `continue-on-error: true`.

**Taken (user, option a).** The recommendation was (b) and the user chose the port. What (a) settles by taking it, and what the reviewer should read as decided rather than assumed:

- **A path hodos prints is written with `/` on every platform.** Seven of the nine `relative()` call sites already did it; the rule was the engine's before it was checked, and `scripts/posix-paths.test.mjs` now checks it on any platform. A path hodos *returns for a caller to open* keeps the platform's separator, because `readFileSync` takes it: `transcriptPath` is that case, and the test that pins it matches either separator.
- **A path hodos compares is compared separator-agnostically.** `managerDir` reads a version manager directory written either way, so a node under `C:\Users\…\.nvm` is recognized the way one under `~/.nvm` is.
- **The repository's own files are LF, in the working tree, on every platform** (`.gitattributes`). CRLF tolerance in the parsers is a separate question about a *user's* files, and is not settled here.

**Applied in.** `scripts/posix-paths.test.mjs` (new), `bench/noop/run.mjs`, `scripts/git-guard.mjs`, `scripts/config.mjs` and `scripts/config.test.mjs`, `scripts/state-digest.mjs`, `scripts/ledger.test.mjs`, `scripts/usage.test.mjs`, `bench/scripts/fixture-copy.test.mjs`, `.gitattributes`, and the `windows` job of `.github/workflows/ci.yml`, which stays a gate. Stage **11b-4**.

### 0104 — The export gate refuses a private home path, not only an employer name (2026-09-06, Stage 11b-4, amends 0064)

**Context.** Decision **0064**'s scrub is a list of employer identifiers, and `tools/export-public.mjs` greps the exported tree for them. A bench run log is verbatim output of a run on the author's machine, and sixteen of them carried that machine's home — 104 hits, including the encoded form a transcript directory takes under `~/.claude/projects/`, which no list of employer names would ever match.

**Options as they were put.** (a) Leave them: they are measurement artefacts and editing one edits evidence. (b) **Replace the paths with `<repo>` and `<home>` at source in the build repository, and teach the gate to refuse them**, so no later export can ship one.

**Taken (user, option b).** The numbers, the verdicts and the transcripts are untouched; only the paths around them are. The gate allows the homes that are documentation — `dev`, `someone`, `runner`, `you`, `user` — by name, and a lookbehind keeps `src/features/home/index.ts` out of it.

**Widened the same day, by review 1.** The stage entry's scrub reads "no employer repository name **or ticket id**", and the id half had never been implemented: five real tracker ids shipped in the published tree — two of them in `FORMATS.md §11`'s example, on the line whose employer host had *been* scrubbed. A list of names cannot see that class either. `scan` now reads a third pattern, `TICKET_RE`, with the prefixes this repository writes on purpose allowed by name. The ids were replaced at source with invented ones that do not map back.

**Narrowed again by review 3.** The allowlist opened with twenty prefixes and the tree earned four of them; the rest were holes in a gate whose whole value is being total. It is now the eight the tree carries, each with the line that earns it — the invented tracker `SHOP` and `OPS`, the format example's `ABC`, `ISO`, and the four licence identifiers the fixtures' dependency metadata writes. The cost is the other direction and it is deliberate: `UTF-8`, `RFC-7231`, `WCAG-2` and `GPL-3` are all this shape, so a document that writes one fails the export until its prefix is added here, and the failure says so rather than leaving the author to guess. The pattern reads an **uppercase** prefix only: a lowercase one cannot be told from an ordinary hyphenated word, so `site-25470` passes — stated here and in `docs/README.md` rather than only in the source.

**Applied in.** `tools/export-public.mjs` (`HOME_RE`, `HOMES_ALLOWED`, `TICKET_RE`, `TICKETS_ALLOWED`, `scan`), `tools/export-public.test.mjs`, thirty files under `bench/*/runs/`, and the ticket scrub across `docs/FORMATS.md §11`, `docs/DECISIONS.md`, `scripts/campaigns.test.mjs`, `bench/run/runs/2026-09-02-campaigns{,-manual}/README.md` and `docs/stages/09a-{manual,report}.md`. Stage **11b-4**.

## Proposed

**II** is open, raised on 2026-09-06 from `research/07-basemode.md`. **TT**, raised the same day by CI's first Windows run, was settled the same day as decision **0103**. **JJ**, raised the same day from the same file, was settled at Stage 11b-4's Start as decision **0101**. **GG**, raised on 2026-09-05 from `research/06-greptile.md`, was settled at Stage 11b-3's Start as decision **0100**. **LL** through **SS**, all eight raised on 2026-09-06 from `research/09-qa-verify.md` and revised the same day after the user's review, were settled the same day as decisions **0092**–**0099**; seven land in a new Stage 11d and **0095** in 11b-4, by the user's choice. **KK**, raised the same day from `research/08-codesight.md`, was settled on the day it was raised as decision **0091**. **HH**, raised by Stage 11b-2's second review, was settled the next day as decision **0090**. **BB**, **CC**, **DD**, **EE** and **FF** were the five before it, all settled at Stage 11b's Start on 2026-09-04 — decisions **0085**–**0089**. The seven proposals raised by `research/05-architecture-review.md` (the Stage 6 architecture review) and carried here on 2026-09-02 are settled, and so is every one raised since but **II**. Lettered rather than numbered: a proposal that is taken gets the next free number then, and one that is declined burns none. Each settling decision restates the options it was chosen from, so nothing this file recorded is lost by the move.

| Proposal | Raised | Settled |
|---|---|---|
| **A**, **D** | `research/05` | Stage 7 Start — decisions **0041**, **0042** (amended by **0044**, which restates the options **H** raised) |
| **B**, **E**, **G** | `research/05` | Stage 8 Start — decisions **0045**, **0046**, **0047** |
| **F** | `research/05` | Stage 10 Start — decision **0057** |
| **C** | `research/05` P5, deferred by `06-plan.md` D2 | Stage 11a Start — decision **0065** |
| **I** | Stage 8's build | decision **0049** |
| **J** | Stage 8's manual run | decision **0050** |
| **M** | Stage 9a's manual run | decision **0056** |
| **K**, **L** | a design session with the user, 2026-09-02 | Stage 10b Start — decisions **0061**, **0062** |
| **N** | Stage 10 Start | Stage 11a Start — decision **0066** |
| **O** | Stage 10b's manual run M2 | Stage 11a Start — decision **0067** |
| **P** | Stage 11a's T1, from run 1's diagnosis | Stage 11a — decision **0068** |
| **Q**, **R** | Stage 11a's T8–T10, from run 2's diagnosis | Stage 11a — decisions **0070**, **0071** |
| **S** | Stage 11a's T11, from run 3's `s12` | Stage 11a — decision **0072** |
| **T** | Stage 11a's T5, from no-op run 1 | Stage 11a — decision **0073** |
| **U** | a design session with the user, 2026-09-03 | ahead of Stage 11b — decision **0074** |
| **V**, **W** | a design session with the user, 2026-09-03 | ahead of Stage 11b — decisions **0075**, **0076** |
| **X**, **Y** | the multi-developer design session, 2026-09-03 | ahead of Stage 11b — decisions **0078**, **0079** |
| **Z** | the multi-developer design session, 2026-09-03 | ahead of Stage 9b — decision **0080** |
| **AA** | a design session with the user, 2026-09-03 | ahead of Stage 11b — decision **0081** |
| **BB**, **CC** | a design session with the user, 2026-09-03 | Stage 11b Start — decisions **0085**, **0086** |
| **DD**, **EE** | Stage 11c's manual runs M3–M5, 2026-09-04 | Stage 11b Start — decisions **0087**, **0088** |
| **FF** | Stage 11b's own Start, 2026-09-04 | Stage 11b Start — decision **0089** |
| **HH** | Stage 11b-2's second review, 2026-09-05 | Stage 11b-2, 2026-09-06 — decision **0090** |
| **KK** | `research/08-codesight.md`, 2026-09-06 | the same day, ahead of Stage 11b-3 — decision **0091** |
| **LL**–**SS** | `research/09-qa-verify.md`, 2026-09-06, revised after the user's review the same day | the same day — decisions **0092**–**0099**; **0095** lands in 11b-4, the rest in a new Stage 11d |
| **GG** | `research/06-greptile.md`, 2026-09-05 | Stage 11b-3 Start, 2026-09-06 — decision **0100** |
| **JJ** | `research/07-basemode.md`, 2026-09-06 | Stage 11b-4 Start, 2026-09-06 — decision **0101** |
| **TT** | CI's first Windows run, 2026-09-06 | Stage 11b-4, the same day — decision **0103** |

A new proposal is appended below this table, with the stage it lands in named in its own last line (`STAGE-PROTOCOL.md §1.3`).

### II — The `SessionStart` digest reports what changed, and what must be dismissed (raised 2026-09-06, lands in Stage 12)

**Context.** The digest is prepended to every session in a hodos project (`PLATFORM-NOTES.md` fact 3), capped at 300 tokens (`scripts/state-digest.mjs:23`, `AUTHORING.md §7`), and it is the same text every session while the state behind it does not move: the rows are derived from `state.json`, the stale list and the campaign frontier, none of which changes between two sessions opened an hour apart. Principle 16 is the argument against paying for that twice — a channel that repeats itself is a channel the reader learns to skim, and the cost is charged again to every later line in it.

`ChristopherKahler/base` does the mechanism, and the useful half is its exceptions: signal output is hashed per signal and re-printed only when the hash changes, with the state file deliberately not cleared at session start — but handoffs, reminders and forks bypass suppression entirely "because they must surface EVERY session until acted on" (`research/07-basemode.md §2.1`). The rule that falls out is not "print less"; it is **novelty suppression is for what a session can re-derive, and anything that must be dismissed rather than merely read is exempt**.

What is missing is the number. Nobody has measured what the digest costs per session on a real project, or how often two consecutive sessions get byte-identical text. `scripts/usage.mjs` already sums a task's sessions from their transcripts and `ledger.mjs` writes the total into `history.jsonl` (`DESIGN.md §11`); the instrument exists and has never been pointed at this row.

**Options.**
(a) Leave it. 300 tokens is a cap, not a typical, and a resumed session re-reading where it is may be exactly what the digest is for. Cheapest, and the state that raised this.
(b) **Per-class novelty suppression with an exempt class.** Hash each row class — stale list, campaign frontier, `verifiedAt` — into `.claude/hodos/.digest-state` and print a class only when its hash differs from the last session's. Exempt what must be acted on rather than read: an open task's row and the one offer line. A session that changed nothing then gets its active-task row and nothing else. Cons: a row whose meaning changed without its text changing is not re-printed, and the state file is one more thing that can be stale.
(c) One hash for the whole digest: print it or do not. One line of state, no classes. Cons: all-or-nothing in both directions — a single changed campaign count re-prints every row, and a session that follows a `/clear` gets nothing at all, which is the session with the least context and the most need of it.
(d) Measure and build nothing: instrument the digest during the pilot and let the number decide whether any of this is worth a file.

**Recommendation: (b), built at Stage 12 and gated on (d)'s number** — the share of sessions whose digest is byte-identical to the previous one, taken from the pilot. Below a threshold the mechanism is machinery for a saving that is not there, and (a) stands.

Two things are settled now rather than discovered later. First, `.claude/hodos/.digest-state` is engine-internal state with no config surface, so this is not a format 0.1 has to ship and decision **0040**'s breaking-change argument does not reach it — which is why it can wait for the measurement instead of being rushed into the release.

Second, `lint --hook` is deliberately **not** in scope, though the same mechanism exists there (`research/07-basemode.md §2.5`). Their nudge is a static message with no truth condition, so repeating it can only cost. A lint finding is true until it is fixed, and a repeat is the pressure to fix it; suppressing a live error because it was already reported once is a different trade and would need its own argument.

**Cost if wrong.** A digest omits a row whose state moved in a way the hash did not see; the row returns the next time its text differs, and `/hodos:status` prints the whole thing uncapped on demand at any point. Reversible completely: one function, one file, and deleting `.digest-state` restores today's behaviour byte for byte.

**Stage.** Stage 12, settled at its Start: the pilot is where `DESIGN.md §11`'s frugality numbers are taken, and this is the one proposal whose value is a number that stage produces anyway.

### TT — What 0.1 claims about Windows (raised 2026-09-06, lands in Stage 11b-4)

**Context.** `DESIGN.md §3` justifies the Node-only rule with "no bash (Windows)", and the `windows` job of `.github/workflows/ci.yml` was added at this stage as the evidence for it. Its runs are the first time the suite has ever run on Windows, and it is red: **30 tests**, after the two causes that masked everything behind them — `process.exit` truncating a pipe, and a test sweeping an absent `tools/` — were cleared, and the fixture copy's missing git identity after that. Nothing about Windows was ever measured before; §3's promise is about what the engine *requires*, and it has been read as a claim about where it runs.

What the 30 are, by cause, from run 3's log:

- **CRLF** (~5). The runner checks out under git's `core.autocrlf`, so `plans/*.md` arrive with `\r\n` and the plan parser's `/### Interfaces\n### Invariants/` stops matching. `orders-summary: approved plans have no open questions` is the same cause one layer up.
- **`\` in a path a test asserts on** (~12). The engine prints `.claude\hodos\tasks\<slug>\ledger.md`, and every assertion, every skill and every document says `/`.
- **`bench/review/packages/undefined.md`** (3). A package id built from a path by a split that assumes `/`.
- **The transcript directory's encoding** (4). `-Users-someone-repo` is a POSIX path with its separators replaced; on Windows `transcriptPath` finds nothing and its caller reads `null.sessions`.
- **POSIX-only fixtures inside the tests** (2). The `$NVM_DIR` preflight cases assert `/Users/dev/.nvm/...`.
- **One unescaped `\` in an expected message** (1), and **two downstream of the CRLF class**.

`FORMATS.md §2` already records that `verify.env` is POSIX-only, for a reason that does not go away: `env.mjs down` signals a process group and Windows has no equivalent.

**Options.**
(a) **Port before 0.1.** Fix all six classes now. A `.gitattributes` carrying `* -text` kills the CRLF class at the root, the path class is one formatter applied where the engine prints a path, and the rest is small. Cons: two of the classes are product behaviour rather than test text — how hodos prints a path, and how it encodes a transcript directory — and settling those under release pressure is how a format ends up decided by whichever assertion was easiest to satisfy. It is also outside this stage's scope, which is documentation and publication.
(b) **0.1 is macOS and Linux, and says so.** Drop the `windows` job, state the support in `README.md` Requirements and in `DESIGN.md §3` — where the Node-only rule keeps its reason, which is that the engine must not *require* bash — and open a backlog item carrying the six classes above, so the port starts from a measured list instead of from a fresh run. Cons: a plugin that would nearly run on Windows ships saying it does not, and a Windows user waits for a stage that is not scheduled.
(c) **Keep the job with `continue-on-error: true`.** The failures stay visible on every push and gate nothing. Cons: a check that cannot fail is not a check — this stage wrote that sentence about the `validate` step it had just repaired.

**Recommendation: (b).** The release's whole claim is that what it states is measured. Windows was not, and now the list of what breaks is. (b) turns an unstated assumption into a stated boundary plus a named backlog item, and leaves the two format questions to be settled as decisions rather than as fixes.

**Stage.** Stage **11b-4**, settled before the release is re-cut.

