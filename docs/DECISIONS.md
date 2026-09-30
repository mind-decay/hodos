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
**Applied in.** `DESIGN.md §12` · `BUILD-PLAN.md` Progress line and Stage 12 · supersedes the pilot half of `00-decisions.md` T-1 and P-3. The rule guard this decision states as "cites a `file:line` precedent in `.rs` source" was reworded at Stage 12b by decision **0147** to the property it was a proxy for: no precedent under `.claude/`, and a `.rs` precedent for every rule whose `paths:` name `.rs` files.

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
**Applied in.** `DESIGN.md §4.1` (the path table) · `skills/task/references/design.md` · `docs/stages/04-plan.md` D14. **Amended by 0183** (Stage 12d-2): an `inert` task's plan carries no design fields, because a change no program reads leaves them nothing to hold. The pilot measured this decision's *cost if wrong*: the three `quick` plans ran up to 248 lines at approval.

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

**Cost if wrong.** A pointer in `sources/rust.md` that is stale or wrong is discovered at the pilot, where a source file is one edit and no code. The stage report records the row under *Not done* with this reason. **Applied in.** `BUILD-PLAN.md` Stage 10 and Stage 12, `sources/rust.md`, `COMPONENTS.md §6`. The rejection half of the Stage 12 row — "by question 2" — was reworded to any of the three questions by decision **0151** at Stage 12b, where the pilot rejected a source candidate at question 3 and a code candidate at question 2.

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

**Applied in.** `FORMATS.md §2` and `scripts/config.mjs` (`RECIPE.checks[]`); `FORMATS.md §10` (the `pin` marker); `agents/hodos-verifier.md`; `skills/run/references/finish.md` (the approval and the write); `skills/run/references/verify-loop.md` (the surface; running `checks[]`); `skills/init/SKILL.md` and `references/scan.md` (`--refresh` prunes, and **0131**, which stops a routes refresh retiring a pin in silence); `COMPONENTS.md §1.2`; `DESIGN.md §7.5` (what survives finish now names the pins). Stage **11d**.

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

**Applied in.** `agents/hodos-verifier.md` (the runs, the statistics, the retry rule); `FORMATS.md §10` (`flaky`, its treatment); `skills/run/references/verify-loop.md §9` (the breaker may accept `flaky`); decision **0088** carries the generalization line. **Amended by 0126**: the retry rule is the observation, and the status needs the explanation to be missing. Stage **11d**.

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

### 0105 — Stage 11d runs as three parts, and the last of them leaves the shape the pilot measures (2026-09-07, proposal UU, Stage 11d Start)

**Context.** Stage 11d carries seven decisions, eleven acceptance criteria, two new scripts with their tests, a new class of seeded bench defect, a fixture page with seeded presentation defects, eight live runs, and edits to fifteen engine files. The four parts of Stage 11b ran at eighteen, twenty-five, twenty and twenty-six commits, and decision **0089** split 11b for less. Against a split stood `BUILD-PLAN.md`'s own argument for landing the eight decisions of `research/09` together: "so that `verify.md` takes one shape rather than eight."

**Options as they were put.** (a) One stage — the plan file is the ledger and `STAGE-PROTOCOL.md §6` covers a compacted session; one fresh review over one diff. (b) **Three parts, run back to back**: 11d-1 the claim set (**0092**, **0099**), 11d-2 the oracles (**0093**, **0096**), 11d-3 the statuses and the pins (**0094**, **0097**, **0098**) with the re-bought bench arm. (c) Two parts — 11d-1, then everything the verifier reads.

**Taken (user, option b, as recommended).** The seam is not arbitrary: 11d-1 changes what the *plan* and the *reviewer* write and touches the verifier's output only by adding a section to it; 11d-2 gives the verifier its oracles; 11d-3 gives its rows their statuses and its passes a durable form. `BUILD-PLAN.md`'s argument survives the split because parts that run back to back do not spread a format across stages separated by other work: each part's edits to `FORMATS.md §10` are additive to the last, and **11d-3 is the part every "the pilot measures the verify a project gets" cross-reference resolves through**. (a) is declined for the review, not the build: a reviewer re-running eleven criteria including two live browser runs is the pass most likely to come back with criteria it could not reproduce. (c) is the stage the proposal was raised about. The bench arm of the last criterion is placed in 11d-3 because it needs 11d-2's defect classes to exist before it can be measured. The parts are `11d1`–`11d3` in file and tag names and `11d-1` in prose, as 11b's were.

**Cost if wrong.** Two extra base tags, two extra reports, two extra fresh reviews — the cost decision 0089 paid three times. `stage-11d-base` stays as the whole stage's base, which is what the `scripts/config.mjs` criterion of the stage entry reads.

**Applied in.** `BUILD-PLAN.md` (the Progress lines and the order rationale); `docs/stages/11d-plan.md` (the inventory) and `11d1`–`11d3-plan.md`. Stage **11d**.

### 0106 — The oracle catalogues live in a phase reference the dispatch names (2026-09-07, proposal VV, Stage 11d Start)

**Context.** Decisions **0093**, **0096**, **0097** and **0098** all land in two files, and both are nearly full against `AUTHORING.md §7`: `agents/hodos-verifier.md` is 113 lines against a 150-line cap and `skills/run/references/verify-loop.md` is 194 against 200. What they add — the four admissible sources, the closed attack list, the detector contract, the pipeline order with its skip reason, `## Not covered`, the severity table, the `pre-existing` worktree procedure, the statistics and retry rules, the `pin` marker — is some ninety lines. `AUTHORING.md §7` says what a cap hit means: "a signal to split or delete, never to compress prose into a denser paragraph."

**Options as they were put.** (a) **A new phase reference**, `skills/run/references/oracles.md`, named by `skills/run/SKILL.md` so `lint.mjs`'s uncited-reference check passes, and handed to the verifier **by path in the dispatch** the way `defaults.md` is already handed to the reviewer. (b) Raise the two caps to 200 and 250. (c) Split `verify-loop.md` and cut something out of the agent file. (d) Put the catalogues in `DESIGN.md §7.4` and have the verifier read `docs/`.

**Taken (user, option a, as recommended).** It is the shape the engine already has for this problem: a catalogue too long for a prompt, read by an agent from a path the kernel names. The attack list and the detector thresholds are `defaults.md`'s kind of content — enumerable, stable, read by more than one component — and the division of labour stays where the decisions put it: the catalogues are in the file both halves read, the rules that decide a row's status are in the agent. (b) is declined because the cap is the mechanism that forces the split, and raising it for the stage that needs it is the box-ticking `AUTHORING.md §7` warns about. (c) would split a file to free lines rather than to separate concerns. (d) contradicts `skills/task/references/plan.md`: "a phase that goes reading `docs/` has spent its budget on the engine instead of on the project."

**Cost if wrong.** One file to delete and two paragraphs to move back, plus one line of the dispatch. A reference nothing reads is caught by `lint.mjs`.

**Applied in.** `skills/run/references/oracles.md` (new); `skills/run/SKILL.md` (names it); `skills/run/references/verify-loop.md §5` (the dispatch line); `agents/hodos-verifier.md` (Inputs); `docs/COMPONENTS.md §1.2`; `docs/AUTHORING.md §7` is untouched — the caps stand. Stage **11d-2**.

### 0107 — An allowlist entry names its detector and its route (2026-09-07, proposal WW, Stage 11d Start)

**Context.** Decision **0093** named `verify.detectors.allow` and gave it "the `review.generated` shape of decision **0065**" — a flat array of glob strings — and stopped there. A detector hit has three coordinates: which detector fired, which route it fired on, and which element it was about. Decision **0094** rules the third out as an identity: a predicate over a CSS selector is what it refused for pins, and an element's text is no more stable when the intended overflow is a banner that gets rewritten.

**Options as they were put.** (a) A route glob — `"/marketing/*"`, literally 0065's shape. (b) **A detector-qualified route glob** — `"overflow:/marketing/*"`, the detector id before the colon, `*` admitted as the id. (c) A triple, `{ detector, route, text }`.

**Taken (user, option b, as recommended).** The field stays one flat array of strings and one `split(':')` to read; four detectors stay live on a route that allowlists one; no element identity is needed. `"*:/marketing/*"` is (a)'s behaviour for a project that wants it, written by the project rather than built into the field. (c) is 0094's refused identity and would make the field an object array where its sibling is a string array.

**Cost if wrong.** One line per intended case instead of one per route. A malformed entry is a `check` error naming the form, like every other closed value in `FORMATS.md §2`.

**Applied in.** `scripts/config.mjs` and `scripts/config.test.mjs` (the schema, test-first); `docs/FORMATS.md §2` (the field note); `skills/init/references/config.md` (the key row); `scripts/detectors.mjs` (the decider reads it); `agents/hodos-verifier.md` and `skills/run/references/oracles.md` (a hit that is allowlisted produces no row). Stage **11d-2**.

### 0108 — A failing row's severity is derived from its source, not judged (2026-09-07, proposal XX, Stage 11d Start)

**Context.** Decision **0097** puts `blocker | major | minor` on a `fail` row, reusing the review's vocabulary. Decision **0093**, taken the same day, is why that needs an answer: the verifier does not judge, because "a model's judgement of its own observation is the one signal here that has been tested and found unreliable". A severity chosen row by row is a judgement wearing a mechanical column.

**Options as they were put.** (a) **Derived from the row's own source**, in a table the verifier reads rather than a call it makes. (b) The verifier assigns severity with one line of guidance. (c) Two words: a plan claim is a `blocker`, an added row is a `minor`.

**Taken (user, option a, as recommended).** The table, which is `FORMATS.md §10`'s:

| The row | Severity |
|---|---|
| a claim the plan made — a task's `Acceptance:` clause or a `## Verify plan` line | `blocker`: the plan's contract is unmet |
| an uncaught exception, an unhandled rejection or a 5xx under an attack (source *attack*) | `blocker` |
| a console error or a failed request on a visited route (source *console*, *network*) | `major` |
| a pin that no longer holds (source *pin*) | `major` |
| a detector hit (source *detector*) | `minor` — except overlapping interactive elements and focus not visible, which are `major`, because they remove a control the route offers |
| an `a11y` row, which keeps the audit's own vocabulary | `critical`, `serious` → `major` · `moderate`, `minor` → `minor` |

Mechanical, auditable from the row itself, and usable by the fix pass as an order. (b) is what 0093 refused, one phase later. (c) flattens a 5xx under an attack and a two-pixel overflow into one word, which is the reason severity was added. The cost the table names is real and is the right one to pay: a plan claim that fails is the contract failing, and a developer who thinks that trivial says so at the breaker, where the counts by severity are stated (0097).

**Cost if wrong.** One word per row read as wrong by the developer who reads it, and the fix order it drives is visible in the commits. Six rows in `FORMATS.md §10`.

**Applied in.** `docs/FORMATS.md §10` (the table and the severity column); `agents/hodos-verifier.md` (it reads the table, it does not choose); `skills/run/references/oracles.md` (the sources that feed it); `skills/run/references/verify-loop.md §7` (the fix order) and `§9` (the breaker's counts); `skills/run/references/finish.md` (the counts in the report); `docs/DESIGN.md §7.4` (the sentence that says the engine derives and does not judge, now covering severity too). Stage **11d-3**.
### 0109 — The detector thresholds are measured on a real DOM before they are written (2026-09-07, proposal YY, Stage 11d-2 Start)

**Context.** Decision **0096** put "every threshold" in the decider — the pure half of `scripts/detectors.mjs` — and named none of them. The stage's first criterion tests four with a mutant per threshold: overflow, clipped text, overlapping interactive elements, focus not visible. The fifth detector needs no number, and that is settled here rather than left implicit: `adapters/browser/chrome-devtools.md` states that `lighthouse_audit`'s accessibility category "is axe underneath", so the axe detector is a **pass-through** of the `impact` grouping `FORMATS.md §2` already declares for an `a11y` recipe, and decision **0108** already maps that vocabulary to severities. A number written into a script by the session that wrote the script is a design value with nothing behind it, which is what `BACKLOG.md` records about a spike's numeric bar (decision **0088**).

**Options as they were put.** (a) A threshold table in `DESIGN.md §7.4` now, four numbers each with its reason and reference. (b) **Measure first on the fixture page the criterion already requires, then write the table from what the page returned.** (c) `verify.detectors.thresholds` in the config, beside `verify.detectors.allow`. (d) No thresholds: the decider reports every difference and the allowlist absorbs the noise.

**Taken (user, option b, as recommended, with (a)'s table as its output).** The order is what makes it honest: build the seeded page, run the collector through the adapter, keep the JSON the criterion already asks to be kept, and write the four numbers into a `DESIGN.md §7.4` table that **cites that run**. The objection — a threshold tuned to one page is tuned to one page, which is the pesticide paradox in a single file — is not answered by argument but by labelling: the four numbers are a **measurement carried to Stage 12**, and the pilot on a repository this engine has never seen is what says whether they generalise. (c) is a config key with no caller, and decision **0107** deliberately kept its sibling field one flat array of strings. (d) makes `verify.detectors.allow` the threshold and charges every project every run for it.

**Cost if wrong.** Four numbers a real project's DOM disagrees with, each one line of the decider and one row of the table, and the allowlist absorbs the interval until they are re-measured. The pilot is where they are read again.

**Applied in.** `scripts/detectors.mjs` (the decider's defaults) and `scripts/detectors.test.mjs` (the mutant per threshold); `docs/DESIGN.md §7.4` (the table, citing the run); `bench/fixtures/webapp` (the seeded page) and `bench/run/runs/` (the collector JSON the numbers were read off); `docs/BACKLOG.md` (the numbers are carried to Stage 12). Stage **11d-2**.

### 0110 — The fail-fast order gates work not done, and reports what it cost (2026-09-07, proposal ZZ, Stage 11d-2 Start)

**Context.** Decision **0096**'s pipeline order runs command recipes first and writes rows behind a red stage as `skip: not run — <stage> red`. The criterion for it ended "and the run cost … is below the same fixture's cost with the unit test passing" — a comparison with no margin, which is a gate at margin zero. Stage 11d-1's four paid dispatches came in at $0.60, $0.77, $0.87 and $2.18, and the two arms of one A/B pair on the same task differed by 28%, so noise of that size is inside the measurement. `DESIGN.md §6.4` (decisions **0015**, **0019**) admits two labels and this was neither: a gate carries a stated threshold, a measurement carries none.

**Options as they were put.** (a) A gate with a stated margin, *N*% written into the criterion. (b) A measurement, both arms and the delta, with the deterministic half kept as the gate. (c) A gate on the token count from `usage.mjs`. (d) **A gate on mechanical counts** — strictly fewer dispatches and strictly fewer browser operations, countable from the transcript with `bench/run/runs/kernel-turns.mjs` — with cost reported beside them as a measurement.

**Taken (user, option d, as recommended).** It gates what the order promises, which is work not done, with counts that cannot move by noise, and it keeps the dollar figure where a reader wants it without pretending two runs bound it. (a) and (c) both name a number no run has produced. (b) drops the protection against a fail-fast that costs more, which is the failure mode the order exists to prevent. If the counts ever tie while cost diverges, that is a finding about the order rather than about a threshold.

**Cost if wrong.** A cheaper-looking arm that is not cheaper in dollars, visible because the cost is printed beside the counts. One line of the criterion.

**Applied in.** `docs/BUILD-PLAN.md` Stage 11d's *The order fails fast* criterion (the counts gated, the cost measured); `skills/run/references/verify-loop.md` (the order and its skip reason); `bench/run/runs/` (the two arms, their counts and their costs). Stage **11d-2**.

### 0111 — The fail-fast criterion gates work not done, and the dispatch tie is reported (2026-09-07, proposal AAA, Stage 11d-2)

**Context.** Decision **0110** rewrote Stage 11d's *The order fails fast* criterion to gate "strictly fewer dispatches and strictly fewer browser operations" in the red arm. Reading `bench/run/runs/kernel-turns.mjs` before buying the arm found the dispatch half unmeetable, for a reason that has nothing to do with the order: the order writes a row for every claim, so a red unit recipe still dispatches one verifier — it is the agent that writes the `skip: not run — unit red` rows — and over a whole run the red arm dispatches **twice**, because its `Verify 1: FAIL` opens a fix pass. Over one iteration the two arms tie at one dispatch each. The same reading found that the script counts only tool uses whose `parent_tool_use_id` is null, which is the kernel's own by design (Stage 6, criterion 3), so every browser operation — the verifier's, on the sidechain — is dropped.

**Options as they were put.** (a) **Gate the browser operations and the rows**: strictly fewer `mcp__chrome-devtools__*` calls in the red arm, zero against N, **and** every claim still on a row with the header counts equal — the second half of the criterion's own title — with the dispatch counts reported beside them and a tie the expected value. (b) (a) plus a second gate asserting the dispatch counts are equal. (c) Gate the verifier's total tool uses instead of its browser operations. (d) Leave 0110 as it stands and record the arm as a FAIL against its own criterion.

**Taken (user, option a, as recommended).** It gates what the order promises — work not done — with a count that cannot move by noise, and it keeps 0110's shape: a mechanical gate with cost beside it as a measurement. (b) makes a gate out of `1 == 1`, which is a fact about the design rather than a risk. (c) is looser for no gain: the verifier's non-browser tool uses move with the number of claims. (d) spends a dispatch to document a one-line defect in a criterion, and 0110's own text already contemplates a tie as "a finding about the order rather than about a threshold".

**Cost if wrong.** One line of the criterion and one counter in a bench script. Nothing about the arm changes — two runs on one copy, one with a red unit test — only whether its result can be read as a PASS.

**Applied in.** `docs/BUILD-PLAN.md` Stage 11d's *The order fails fast* criterion (amends **0110**); `bench/run/runs/kernel-turns.mjs` and its test (the sidechain browser-operation counter, test-first); `bench/run/runs/` (the two arms, their counts and their costs). Stage **11d-2**.

### 0112 — The attacks run on the routes the diff resolves to, and the table is written before them (2026-09-07, proposal BBB, Stage 11d-2)

**Context.** Decision **0096** gives the verify phase three bounds — pairwise over routes × states × widths, `when`-gating to the surface the diff touched, and the fail-fast stage order — and none of them bounds the attacks. The plan-independent class was "on every route this run visited", five attacks each costing a snapshot, an action, a console read and a network read. The first arm bought for criterion 3 measured what that costs: four routes in the fixture's `ui` recipe, 64 browser operations for the sweep alone, and 20 attacks behind it against a 60-turn bound. The verifier reached the bound three operations into the first attack and came back with nothing — **$2.50 for a dispatch that wrote no table** (`bench/run/runs/2026-09-07-four-sources/`). The kernel handled it exactly as `verify-loop.md §6` specifies, so this is a bound the design never set, not a defect in the code.

**Options as they were put.** For the attacks: (a) **the attacks run on the routes the diff resolves to**, the same surface decision 0094 defines for regression; (b) a per-run cap of *N* routes, the first *N* of the sweep; (c) the attacks become their own dispatch, each half inside its own bound; (d) leave the attacks unbounded and raise `maxTurns` instead. For the bound: (i) leave it at 60; (ii) raise it to a number the measured sweep fits in; (iii) **raise it and make the agent write `verify.md` before the attacks**, so a bound reached late costs the attacks and not the table.

**Taken (user, options a and iii, as recommended).** The attacks run on a route when the diff touches a file that route renders — the component the project's route table names, or something that component imports. The diff is the authority and the agent reads it itself: the plan header carries `Base: <sha>` (`FORMATS.md §9`), so `git diff --name-only <base>..HEAD` is one command against a sha the dispatch already hands over, and no new input is added. Predicting the surface from the plan's `Files:` lines instead would repeat the mistake decision **0076** corrected for projects — the plan says what a task meant to touch, and the diff says what it touched. A route the sweep visits and the diff does not reach is still swept by the detectors and is **not** attacked: its attack row is `skip: not attacked — the diff does not reach this route`, so the narrowing is one visible row per route rather than a silent omission, and the header counts still equal the rows. Where no route resolves at all — no route table a reader can follow, or a diff that touches none of the routes swept — every visited route gets that skip and `## Not covered` says so; the fallback is never "attack everything", which is the cost this decision exists to bound. Criterion 4's seeded defect has to **move**, which is the cost option (a) was chosen with. `bench/run/runs/2026-09-07-four-sources/setup.mjs` applies `defects/shift-double-submit.patch` to the copy's **base**, deliberately — its own comment says "a defect on a route no claim covers and that this task's diff did not introduce" — and under this decision a base-only defect is on no route the attacks reach. It moves into the task's last commit, where `src/features/shift/ui/ShiftPage.tsx` is in the diff and `src/App.tsx:13` renders it at `/shift`. The criterion's property is preserved, because the property is **plan-independence and not base-ness**: no claim of `orders-summary` names `/shift`, so the attack list is still the only thing that finds the double submit. `bench/run/seed.mjs`'s `--defect` becomes repeatable to allow it — the arm needs two patches in one commit — which is one option list and one loop, test-first like every other bench change.

`maxTurns` goes 60 → **150**, from the arithmetic this fixture measures rather than from a round number. The sweep is unchanged by this decision and cost **64** browser operations over four routes (`bench/run/runs/2026-09-07-four-sources/counts.txt`). The five attacks of `oracles.md §3`, counted off their own recipes, cost some **28** operations on a route: snapshot, the fills and the submit, console and network for the first; `stub`, reload, snapshot, console and network for the second; two `emulate`s with a reload each, the restore, console and network for the third; snapshot, two clicks, console and network for the fourth; `history.back()`, snapshot, `history.forward()`, snapshot and console for the fifth. The fixture's diff resolves to **two** routes — `/orders` and `/shift` — which is 56, and the command recipe, the matrix call, the plan and adapter reads, the mutation check's five steps and the two writes are some 14 more: **134**. 150 is that with headroom, and it is a **ceiling rather than a budget**: a diff that resolves to five routes reaches it, loses the last routes' attacks, and keeps the table, which is what the write order is for. What the ceiling costs is the other half of the trade: the arm spent **$2.50** for a dispatch that reached 60 turns, and a verifier that runs to 150 costs more than 2.5 times that, because its context grows with every operation it records.

The write order is the half worth more than the number. The agent writes `verify.md` complete for everything but the attacks — every claim, the detector rows, the mutation row, `## Claim feedback`, and a `## Not covered` whose `skips:` line says the attacks had not run — then runs the attacks, then rewrites the file with their rows and updated counts. The file is valid at both points, which is the property that makes an early write worth having: a bound reached during the attacks leaves a table on disk instead of nothing. The kernel's bound path therefore changes too — a stop names `verify.md` where the file exists, so the developer reads what did run — and it stays a **stop**, with no verdict recorded from a partial table, because decision **0044** rests on a platform fact that has not moved: what the *dispatch* returns at its bound is nothing.

(c) doubles the dispatch count on every project's every verify run to solve with an agent what (a) solves with a route table. (d) pays for unbounded work forever and has no answer when a project declares twelve routes. (b) is (a) with no argument for which routes, and the argument is the whole value: an attack is a claim about the code this task changed, and a crash on a route the diff never reaches is not this task's news — which is what `when`-gating already accepts for every recipe. (ii) alone moves the wall without changing what happens at it.

**Cost if wrong.** A crash on an untouched route goes unfound until a task touches that route — the trade `when`-gating already makes, now visible as a skip row rather than assumed. The write order risks a table written early and then contradicted by an attack, which the agent already handles for iteration 2 by rewriting rows. Reversible in one paragraph of `oracles.md`, two sentences of the agent, and one number.

**Applied in.** `skills/run/references/oracles.md §3` (the surface, and the skip row) and `§4` (the stage-3 line and the write order); `agents/hodos-verifier.md` (`maxTurns: 150`, the order line, the write order in both the order paragraph and `## Output`); `skills/run/references/verify-loop.md §5` (the bound's number) and `§6` (a stop names the file where it exists); `docs/DESIGN.md §7.4` (three bounds → four, and the class's own sentence); `docs/COMPONENTS.md §2` (dispatch semantics: the verifier is the one agent that may leave a file behind at its bound) and `§2.2` (the fourth bound, resolved in the agent because it needs the route table); `docs/PLATFORM-NOTES.md` fact 40's implication. Stage **11d-2**.

### 0113 — Criterion 4's red-first control is the static one, and the criterion says so (2026-09-07, Stage 11d-2, review 1's blocker)

**Context.** Stage 11d's criterion 4 ends "Written as a seeded patch first, **red against today's verifier, which has no attack list**". T5 gave the verifier an attack list, so "today's verifier" stopped being the control the day the clause was written — the control became an arm at `stage-11d2-base`, one dispatch on the copy `setup.mjs` already builds, with `--plugin-dir` at a worktree of that tag, expected to produce **no** `source: attack` row. It was not bought. Review 1 filed that as its blocker and named the two ways out: buy the dispatch, or narrow the criterion by a decision, "the second is a design change and therefore the developer's".

The arithmetic behind the ask: Phase 2 had spent **$8.8–9.3** against a $5.90–8.10 quote, on four arms of which three measured walls rather than criteria — decision **0112**'s unbounded attack list, platform fact **52**'s 600-second ceiling, and a prompt-order defect the second exposed.

**Options as they were put.** (a) **Accept the static proof**: at `stage-11d2-base` the verifier's definition contains the word *attack* **0** times against **4** at HEAD, and `skills/run/references/oracles.md` does not exist at that tag, so the base engine carried no attack list for an agent to follow; the report states that as the narrower claim it is, and the live control stays on the record as unbought. (b) **Buy the control arm**, ~$2.50–3.00, taking Phase 2 to ~$11.50–12.50.

**Taken (user, option a).** The criterion's last clause is amended to ask for what was done: the patch is written first, and the control is the engine's own text at the stage's base tag rather than a run of it. What that proves is narrower and the amendment says which — that the **engine** carried no instruction, not that an agent at that tag, told to verify this copy, would not have clicked twice by itself. The live control moves to `BACKLOG.md`, where Stage 12 can take it against a real project for the price of an arm it is buying anyway.

The reason the narrower proof is worth taking rather than merely cheaper: the attack row this stage produced cites the recipe it followed — `arm-3-verify.md`'s row 24 stubs `/api/handover` with a counter and reads `window.__handoverCalls === 2`, which is `oracles.md §3`'s fourth attack and its sixth pass condition, both by name. An agent with no attack list has no such list to name. That is evidence about where the behaviour came from; it is not the same as a run that declines to produce it, and this decision does not pretend otherwise.

**Cost if wrong.** If a base-tag agent would have found the double submit on its own, then the attack list is not what earned row 24 and the criterion measured the wrong thing. What that costs is one arm at Stage 12 and a line in that stage's report; nothing in the engine rests on it, because the attack list is decision 0096's and is argued from `research/09 §2.2` rather than from this criterion.

**Applied in.** `docs/BUILD-PLAN.md` Stage 11d's criterion 4 (its last clause); `docs/stages/11d2-report.md` (criterion 4's row and `## Not done`); `docs/BACKLOG.md` (the live control, carried to Stage 12). Stage **11d-2**.

### 0114 — A class whose oracle is a detector is seeded where the detector runs (2026-09-07, proposal CCC, Stage 11d-3 Start)

**Context.** Stage 11d's Deliverables sentence names "seeded defects of the state, negative and presentation classes in `bench/review/seeded/`" (decision **0096**). Two landed there; the presentation one landed in `bench/run/defects/summary-clipped-line.patch`, because the review bench scores a **reviewer** against an item a rule or a plan clause gives it and a clipped line has no such item — nothing in the project's rules says a summary line may not be 20px wider than its box. Review 1 of Stage 11d-2 filed the location as a minor: the argument is good and the record did not say the class moved by a decision.

**Options as they were put.** (a) **Amend the Deliverables sentence** — a class whose oracle is a detector is seeded where the detector runs, with the reason. (b) Seed it in `bench/review/seeded/` as well, with a fixture rule that gives the reviewer an item. (c) Move it and drop the detector's own seeded defect. (d) Leave the tree and the sentence disagreeing, with 11d-2's report paragraph as the record.

**Taken (user, option a, as recommended).** The rule the argument rests on is already in the repository — `bench/review/README.md` says a seeded review defect needs an item a reviewer could have read — and 0096's sentence was written before that rule met a class with no item. (b) is the one option that would corrupt a measurement: the review bench's precision is meaningful only while every seeded defect is one a reviewer could be expected to find, and a rule invented for the bench makes the bench score itself. (c) would leave criterion 3's detector source with nothing on a real page to find. (d) is what the proposal exists to avoid.

**Cost if wrong.** One sentence in `BUILD-PLAN.md` and one here. If a later stage finds a reviewer-visible presentation item — a project rule about layout, which a real project may carry — the class can be seeded in the review bench then, and this decision does not forbid it.

**Applied in.** `docs/BUILD-PLAN.md` Stage 11d's Deliverables sentence; `bench/review/README.md` (already carries the argument). Stage **11d-3**.

### 0115 — An attack's own counter is evidence, where a stub is what makes the attack deterministic (2026-09-07, proposal DDD, Stage 11d-3 Start)

**Context.** Stage 11d's criterion 4 asks for "a `fail` row with source *attack*, **both requests in evidence**". The attack that finds a double submit is `oracles.md §3`'s fourth, and the run that produced the row got its evidence from a call counter: it stubbed `/api/handover` with a 200 ms delay and a counter, clicked Save twice with no wait, and read `window.__handoverCalls === 2` with the button showing `Save handover (2)`. The stub is what makes the attack deterministic — without a held-open response there is no in-flight window for a second click to land in. A stubbed call reaches no network, so `evidence/` holds no request listing. Stage 11d-2 amended the clause to name the counter; review 2 filed that as out of scope, the clause was restored, and the mismatch came here.

**Options as they were put.** (a) **The counter is the evidence, and the criterion says so** — a count read out of the page under a stub the attack installed, with the stub's own script in `evidence/`. (b) The attack does not stub: it clicks twice against the real endpoint and reads `list_network_requests`. (c) Both: a stubbed pass for the verdict and one unstubbed pass for the listing. (d) Drop the clause.

**Taken (user, option a, as recommended).** The closed list of decision 0096 exists so that an attack is the same attack on every project, and (b) makes this one's outcome depend on a response time. What the clause was defending is that a row saying "two requests" shows the two rather than asserting them, and a counter installed by the attack and read out of the page does show them — arriving, which a listing does not. (c) buys the listing for a second dispatch's worth of operations on every run that reaches the attacks; (d) gives up the defence rather than restating it.

**Cost if wrong.** One clause of one criterion and one paragraph of `oracles.md §3`. If the counter is the weak half — a stub answering 200 where the app expected 201, changing what the page does between the clicks — the fix is (c) on this one attack, and the run that would show it is the arm Stage 12 buys anyway.

**Applied in.** `docs/BUILD-PLAN.md` Stage 11d's criterion 4 (the evidence clause); `skills/run/references/oracles.md §3` (the fourth attack names its counter and its stub); `docs/stages/11d2-report.md`'s `## Not done` entry, which this decision closes. Stage **11d-3**.

### 0116 — An enumerable status rule belongs in the oracles file; the row's decision stays in the agent (2026-09-07, proposal EEE, Stage 11d-3 Start)

**Context.** `agents/hodos-verifier.md` stood at **146 lines against its 150-line cap** and `skills/run/references/verify-loop.md` at **197 against 200** (`AUTHORING.md §7`) with four decisions still to land: the `pin` marker and the run of `verify.recipes[<ui>].checks[]` (**0094**), the `git worktree` proof for `pre-existing` (**0097**), the median/p95 and one-retry rules (**0098**), and the severity table the verifier reads rather than chooses (**0108**) — ~14–16 lines in the agent and ~5–7 in the loop reference. `AUTHORING.md §7` forbids the third way out in its own words: "a cap hit is a signal to split or delete, never to compress prose into a denser paragraph." Decision **0106** met the same wall once and answered it with `oracles.md`, whose boundary `COMPONENTS.md §1.2` records as "the rules that decide a row's status stay in the agent; the enumerable, stable content that both halves read is here" — and two of this part's rules are statuses, so the line had to be redrawn or the caps had to move.

One measurement bears on it and cuts the other way: 11d-2's `## Not done` records that the Command cell's italic source form, stated in `FORMATS.md §10` and not in the agent, **did not take** in arm 3's 27 rows. The agent's own text is the channel measured working; the oracles file's has not been shown to move behaviour yet.

**Options as they were put.** (a) **The enumerable half into `oracles.md §6`** — 0108's six-row table, the worktree recipe, the retry count, the statistic rule — the agent keeping the per-row rules and one pointer each, and `COMPONENTS.md §1.2`'s boundary sentence amended. (b) Raise the caps in `AUTHORING.md §7` and `lint.mjs`. (c) Delete from the agent what `oracles.md` duplicates (~12–16 lines by count) and spend the room. (d) Split the verifier into two agents.

**Taken (user, option a, as recommended).** The content divides on 0106's own line: a six-row table, a two-command worktree recipe, a retry count and a statistic are enumerable and stable, while *which* status this row gets stays a rule in the agent. `COMPONENTS.md`'s target for that file is ≤150 lines and it stood at 113, so the enumerable half fits the advice as well as the cap. It also puts the untested channel under test in the same stage: criteria 1 and 3 both read rows whose rules now live in `oracles.md`, so this part's own arms are what say whether a pointer moves behaviour. (b) buys room for every agent and reference at once, and the cap is what stops a prompt nobody reads from growing — it is the fallback if the arms show the pointer did not take. (c) deletes text measured working (11d-2's criterion 6 was met with the `## Not covered` block in the agent) to make room for text that is not. (d) is a new component, a second dispatch, and decision 0044's one-pass rule argued away for line count.

**Cost if wrong.** A row comes back without a severity or without its base-sha proof because the rule was in a file the agent skimmed. Visible in the arms of criteria 1 and 3, and the repair is (b) on one cap.

**Applied in.** `skills/run/references/oracles.md` (the new section); `agents/hodos-verifier.md` (the per-row rules and the pointers); `docs/COMPONENTS.md §1.2` (the boundary sentence, and the oracles entry's contents); `docs/DESIGN.md §7.4`. Stage **11d-3**.

### 0117 — `recall, spec` stays a measurement until a denominator worth thresholding exists (2026-09-07, proposal FFF, Stage 11d-3 Start)

**Context.** `bench/review/seeded/` carries twenty-one defects: twelve convention, seven behavioral, and two of the `spec` kind — `s-unclaimed-refund-state` (Stage 11d-1) and `s-unclaimed-page-limit` (Stage 11d-2). The four gates were bought at Stage 6 on the two kinds that existed then, and `recall, spec` has been reported beside them as a measurement since 11d-1. Both `docs/BENCH.md` and `bench/review/README.md` say in those words that whether it joins them is this Start's question, and criterion 4 re-buys the set, so the answer is needed before the run.

**Options as they were put.** (a) **It stays a measurement** until Stage 12's hold-out set, and both files say so instead of deferring. (b) A fifth gate at ≥80% over the two spec defects. (c) The spec defects join the overall recall denominator. (d) A lower threshold bought for a denominator of two.

**Taken (user, option a, as recommended).** A denominator of two cannot carry an 80% threshold: one miss is 50%, so the gate would either fail a stage on one row or be a number chosen to fit two cases. Both spec defects were authored by the sessions that wrote the word they measure, which is the property `BENCH.md` already names as making this a seeded number rather than a generalisation. (c) is worse than (b): it moves a threshold bought on nineteen defects by changing what it is over, which is the objection recorded when `recall, spec` was first reported apart. (d) is a number with no argument behind it.

The **Spec section's precision** is a separate hole and this decision does not close it: `precision` counts Standards rows, so a wrong `Unclaimed` entry costs no number this bench prints. That is decision **0015**'s admission, and criterion 4 carries it by name to Stage 12 either way.

**Cost if wrong.** A class of defect whose recall nobody gates, reported beside four that are gated — visible in every run's table, and reversible in one line of the scorer once Stage 12's hold-out gives a denominator worth thresholding.

**Applied in.** `docs/BENCH.md` (the review bench's gate table and the deferring sentence); `bench/review/README.md` (the same two places); `docs/BUILD-PLAN.md` Stage 11d's criterion on the axes. Stage **11d-3**.

### 0118 — A pinned predicate written on a class or an id warns, and loads (2026-09-07, proposal GGG, Stage 11d-3 Start)

**Context.** Decision **0094** says the pinned predicate is "over a role or text, never a CSS selector", and `RECIPE.checks[]` is the field that carries it. What `config.mjs check` does about a predicate that uses one was unstated, and the rule's own words do not settle it: `document.querySelector('[role="alert"]')` is a selector query that satisfies the rule, while `document.querySelector('.summary-total')` is the brittleness the rule is about.

**Options as they were put.** (a) **A warning naming the form** when `evaluate` reaches for a class or an id — `.foo`, `#bar`, `getElementsByClassName` — with role and text queries passing. (b) An error on any `querySelector`/`getElementsBy*` call. (c) Prose only, no check: the schema checks shape, and the rule lives where the predicate is written. (d) An error on a class or id, a warning on any other selector call.

**Taken (user, option a, as recommended).** `config.mjs`'s errors are about a config that cannot be run — a missing member, a wrong type, a layer nobody raises — and a brittle predicate runs fine and fails later, which is a different thing. 0094 already answers brittleness with the mechanism rather than with a refusal: a rotted pin is a `pre-existing` row with a base-sha proof, "deletable one line at a time". A warning names the form at the moment it is written and lets the config load. (b) rejects a predicate the rule allows. (c) leaves nothing mechanical between a brittle pin and a committed config. (d) makes one rule speak in two severities.

**Cost if wrong.** A warning developers pass over, and pins written on classes that rot on the next redesign — visible as `pre-existing` rows, and the escalation to (b) or (d) is one branch in `config.mjs` with its own test.

**Applied in.** `scripts/config.mjs` and `scripts/config.test.mjs` (the `checks[]` validation); `docs/FORMATS.md §2` (the field note); `skills/init/references/config.md`; `docs/COMPONENTS.md` (the `init --refresh` and finish entries); `skills/status/SKILL.md` (what a `warning` is); `scripts/config.mjs`'s `checkRecipeChecks` comment. **Widened by 0129**: the warning covers a walk from a queried element, not only a class or an id. Stage **11d-3**.

### 0119 — The base-sha proof is a command's; a browser check is the case 0097's escape clause was written for (2026-09-07, proposal HHH, Stage 11d-3)

**Context.** Decision **0097** earns `pre-existing` with a re-run at the task's base sha in a `git worktree`, and ends "a check that cannot run at base stays a plain `fail`". A browser check is that case and nothing in the engine had noticed: a predicate is asserted against a *running* application, so a base run needs a second environment serving the base tree — which `DESIGN.md §7.4` and decision **0074** forbid the verifier from raising, and which the config cannot address anyway, because a layer's `url` is a fixed port that a second raise collides with. Stage 11d's criterion 1 asked for the hardest form of it: a passing base run of a **pin's** predicate.

**Options as they were put.** (a) **The base-sha proof is a command-level proof** — a `command`, `typecheck`, `lint` or `http` row is re-run in a worktree at `Base:`; a browser row, pin included, stays a plain `fail` whose evidence names why, and criterion 1's arm 2 says that instead. (b) The kernel raises a base environment on a worktree under an offset port and re-labels the row. (c) The verifier raises it. (d) A *pin* row is never `pre-existing`.

**Taken (user, option a, as recommended).** It is what 0097 already says, applied to the one kind of check that cannot answer. The proof stays honest where it exists — a command re-run at base is a real second run with a real output — instead of buying a mechanism whose first cost is a config field for a port. (b) is the right shape eventually and is a stage's worth of work: the offset, a second `env.mjs` lifecycle, and an answer for a project whose layers are containers; it goes to `BACKLOG.md` for Stage 12, where a real project meets a pin the previous task broke. (c) is against 0074 for the reason 0074 gives. (d) is one evidence clause cheaper and gives up the distinction the status exists for.

**What this costs, stated plainly.** A pin broken by the *previous* task is reported as this task's `fail · major`. The developer reads the source, the route and the base sha in the row and says so at the breaker. What it does not cost is a wrongly claimed `pre-existing`, because the status is never written without a base output.

**Applied in.** `docs/BUILD-PLAN.md` Stage 11d's criterion 1 (arm 2's clause); `docs/FORMATS.md §10` (which rows may hold `pre-existing`, and the evidence a browser row carries instead); `skills/run/references/oracles.md §5` (the worktree recipe and its scope); `agents/hodos-verifier.md`; `docs/BACKLOG.md` (the browser base run, Stage 12). **Amended by 0127**: a browser row has no base *run* and can still have a base *proof*, from `git`, inside a bound. Stage **11d-3**.

### 0120 — A `pre-existing` claim fails the verdict; a `pre-existing` row nobody claimed does not (2026-09-07, proposal III, Stage 11d-3)

**Context.** Decisions **0097** and **0119** left the status reachable by nothing, which building criterion 1's third arm is what showed: 0119 limits the base-sha proof to a **command**-level check, all four sources a row may be added from (decision **0093**) are browser-side, and `FORMATS.md §10` had been written to bar the plan's own claims from the status — read off decision **0108**'s first table row. That over-reading is identifiable: 0108's table assigns the **severity** on a `fail` row, and `pre-existing` is a value of the **status** column. The case 0097 actually describes is a plan claim: a task claims `commands.lint` is green, lint has been red for a year, and the row could say only `fail`.

**Options as they were put.** (a) **It fails the verdict where the row is a claim the plan made and not where nobody claimed it**, and the fix pass touches neither. (b) It never fails the verdict. (c) It always fails the verdict. (d) The fix pass fixes it, after the claims.

**Taken (user, option a, as recommended).** The verdict answers for the plan's contract, which is why `skip` is the one status that does not fail it — nobody could run that claim, which is not true here. An added row nobody claimed is news rather than a contract, so it is reported and does not stop the run; that half is browser-side today and is written for the source that may one day be command-side. Neither is fixed in the fix pass: the defect is outside this task's diff, and a fix there is an unreviewed change to code the plan never named, one phase after the review closed. What the row does instead is reach the breaker with its base output and go into the finish report. (b) is the one option that misinforms — a green verdict over an unmet claim is the failure the Iron Law exists to prevent. (c) turns one stale detector hit on a neighbouring route into a breaker on every task. (d) is what the fix pass is bounded away from.

**Cost if wrong.** A project carrying a genuinely red check meets the breaker on every task until it fixes the check or drops the claim — a true statement about that project, made once per run with the base output beside it. If that reads as noise rather than news, the repair is (b) for an added row plus a `## Outcome` line for a claim, and Stage 12 is where a real project says which.

**Applied in.** `docs/FORMATS.md §10` (the status, the verdict rule, and the sentence that had barred a plan claim); `skills/run/references/oracles.md §5`; `agents/hodos-verifier.md` (the verdict sentence); `skills/run/references/verify-loop.md §7` and `§9`; `docs/DESIGN.md §7.4`. **Amended by 0125** (the fix pass is bounded by the diff, not by this status) and **0127** (a browser row can reach the status, so the verdict rule now applies to one). Stage **11d-3**.

### 0121 — The reviewer is measured on a deleted test before a mechanism is bought for it (2026-09-07, proposal JJJ, Stage 12)

**Context.** Decision **0022** built the test floor and named one risk against it. This is the gap beside that one: every mechanism the design has reads a test that **exists** — `ledger.mjs` refuses `Task <n>: done` without a `test red` line before it, the reviewer compares a `Tests:` exemption against the diff (`agents/hodos-reviewer.md:31`), mutation proves that a test the diff **added** pins a production line (`docs/DESIGN.md:262`) — and none of them reads a test the diff took away, where there is nothing to mutate. The reviewer's step 1 runs `commands.test` and reports it green, which is what a suite reports when a case is `it.skip`, `xit`, `test.todo` or `#[ignore]`; its four Spec words read the plan against the diff and the claims against the state, so a deleted assertion is a claim nobody makes rather than a claim nobody checks; no row of `defaults.md` names the shape, the two nearest being about a **new** test's assertion; and `*.snap` is stat-only by `config.review.generated` (`docs/FORMATS.md:416`), so an obliterated snapshot is not in the diff at all. The one sentence that names the shape bounds a single task's red loop and is policed by its own author (`skills/run/references/execute.md:43`).

**Options as they were put.** (a) A **computed section** on the `## Callers` contract (decision **0100**) — `git diff --name-status` for deleted and renamed test files plus removed lines shaped like a test declaration or like one being switched off, a pointer list the reviewer judges, and one reviewer sentence making a removal no `Refactor in scope` clause names a `major`. (b) **Prose only**: one `defaults.md` row and one reviewer sentence. (c) **A gate** refusing a diff that removes a test declaration without a `Ruling:`. (d) **Leave it** to the developer reading the diff at the finish report.

**Taken (user: measure first, then (a), as recommended).** Decision **0015**'s rule with a bench to discharge it on. A twenty-second defect is authored into `bench/review/seeded/` — a diff that deletes an assertion and leaves the suite green — and its first run is scored against the package **as it stands**. Catch it cold and (b) is the whole answer, because (a) would buy a section for a job the prompt already does; miss it and (a) is bought with a baseline behind it rather than on an argument, and the same arm scores the mechanism afterwards. (c) is the only option that would certainly catch the case, and it is the one that breaks principle 5 to do it: a test deleted in a refactor is routine, and a gate that stops it is the engine breaking a project's own work. (d) leaves the floor resting on a reader.

**What this costs, stated plainly.** A third run of the review bench: the recorded one is six dispatches and $4.33 (2026-09-02), and the set was already re-bought once at Stage 11d-3. The defect carries **no threshold** — one seeded case cannot bear an 80% bar, which is decision **0117**'s reasoning at n=1 — so it reports as a measurement beside the four gates either way. And it is a *seeded* measurement authored beside the mechanism it judges, with the admission `BENCH.md` already makes about its siblings.

**Cost if wrong.** If the arm is bought and (a) follows, a section that fires on every refactor's routine deletion costs context twice, which is principle 16's own arithmetic; the repair is the narrowing (a) starts from — deletions no `Refactor in scope` clause and no `## Non-goals` line names — so the failure would be in the glob and not in the shape. If the reviewer catches the defect cold, what this decision cost is one bench run and one `defaults.md` row.

**Applied in.** `docs/BUILD-PLAN.md` Stage 12 (the acceptance row: the seeded defect, the baseline score, and the mechanism conditional on it); `docs/BENCH.md` (the review-bench section, which names the twenty-second defect as Stage 12's and its number as a measurement). The mechanism's own homes — `scripts/review-package.mjs`, `docs/FORMATS.md §8`, `agents/hodos-reviewer.md`, `defaults.md` — are named by (a) and written only if the baseline says so. Stage **12**.

### 0122 — The mutation count is recorded where a fresh reader can check it, and the row names its sample (2026-09-07, proposal KKK, Stage 12)

**Context.** Mutation is the ceiling decision **0022** rests its floor against, and the ceiling is thinner than that sentence reads. `skills/run/references/execute.md:45-51` asks for it on every test written in the red phase, and the only record of that run is the transcript: the ledger grammar of `docs/FORMATS.md §6` has rows for `test red`, for `red-check attempt <k>/3` and for `done`, and none for a mutation, so a resumed session cannot tell whether the mutations were run and the finish report carries no count. What is independently proven is one test — `docs/COMPONENTS.md:189` says "Sample ≥1 new test for mutation", `docs/DESIGN.md:321` says "Sampled mutation checks on new tests", and the verifier gives that sample its own numbered row on **a** test the diff added. With `k` new tests, one is evidence and `k-1` rest on the author's own account, which the reviewer's own opening sentence rules out as a source: its report is testimony, and belief is not evidence. The defect a reader suffers is in the table rather than in the code — one `pass` mutation row reads as the diff's tests being proven, because nothing beside it says how many there were.

**Options as they were put.** (a) **Record the count and compare it statically**: `add "Task <n>: mutation" --tests <k>` stored as `Task <n>: mutation (<k> tests)`, the reviewer comparing `<k>` against the test declarations the diff adds and a mismatch being a `major`. (b) **The verifier mutates every test the diff adds**, under a cap. (c) **Stop the overclaim in the row itself**: the mutation row's Evidence cell names its sample — `· 1 of <k> new tests` — and not the `## Not covered` residue line, which is three named lines that take no fourth and whose text is fixed. (d) **(a) and (c)**.

**Taken (user, option d, as recommended).** (c) is the honest floor and is nearly free: one cell in a row that already exists, and it fixes the half that actually misinforms. (a) adds the only cheap check available — the number of tests the diff adds is derivable from the diff the reviewer already holds, so the comparison needs no new input, and a task that mutated nothing and typed a number becomes a `major` on a diff rather than a silence. It is decision 0022's own device, an assertion made twice and compared by a fresh reader, reused one layer up. (b) is the option that would make the ceiling real, and it spends turns out of the budget the attack sweep now owns — the 60-turn bound has already bitten once, at Stage 11d-2's T12, which decision **0112** exists to answer — so what Stage 12 buys instead is the number that prices it: how many tests a real project's task-sized diff adds.

**The risk named.** A count is as writable as `test red` is. This extends 0022's named risk one layer up rather than closing it, and what stands under both is unchanged: the sampled mutation the verifier runs itself. What (a) adds is a second record a fresh reader can contradict from the diff, and what (c) adds is a table that stops claiming more than it measured.

**Cost if wrong.** (a) invites a number nobody ran — visible as a reviewer `major` where the count disagrees with the diff, and reversible by deleting one grammar row, one branch and one sentence. (c) costs one cell of an existing row, and a wrong `k` there is contradicted by a diff anybody can count. If (b) turns out to be affordable on the pilot's real diffs, both survive it: the count becomes the verifier's own denominator.

**Applied in — at Stage 12, in one commit.** `docs/FORMATS.md §6` (the grammar row) and `§10` (the mutation row's Evidence cell); `docs/DESIGN.md §7.1`; `docs/COMPONENTS.md §1.2` and `§2.2`; `scripts/ledger.mjs` + tests, test-first; `skills/run/references/execute.md §5`; `agents/hodos-reviewer.md` (the comparison and its severity); `agents/hodos-verifier.md` (the evidence cell). **Not now, and the reason:** `FORMATS.md §10` grades the `verify.md` files Stage 11d-3 is producing, and a format clause the verifier has not been given is a divergence its own review reads as a defect — the two halves land together or the stage in flight pays for the gap. What lands with this record is `docs/BUILD-PLAN.md` Stage 12's acceptance row. Stage **12**.

### 0123 — The `webapp` fixture serves its own API in dev (2026-09-07, proposal LLL, Stage 11d-3)

**Context.** `npm run dev` in `bench/fixtures/webapp` is Vite alone, so `GET /api/orders` answers **404**, every data route renders its `role="alert"` "Not Found" state, and every route earns an ambient *network*-source row. `BACKLOG.md` has carried that since 2026-09-07 with the measurement behind it and called the repair a proposal rather than a fix, because a fixture is what the bench measures against. Stage 11d-3's **M1** priced it: the run's `verify.md` carries rows 6 and 7 as `fail · major` for `GET /api/orders?status=all [404]` and `GET /api/orders/o-1 [404]`, on a diff that touches `HomePage.tsx` and its test only, and the verdict is `FAIL` on two rows that are the bench's own. Sharper, and the reason this could not wait: **M3's seeded defect never renders.** `summary-clipped-line` puts the summary line in an 80px `overflow: hidden` box inside `{summary && (…)}`, so with the API down there is no summary, no clipped line, and nothing for the detector to hit — criterion 2, the severity that orders the fix pass, cannot be shown on this fixture at all.

**Options as they were put.** (a) **Serve the two endpoints in dev** — a middleware in `vite.config.ts` reading a fixture JSON, plus the `rel="icon"` `index.html` has never had — so a claim about data is passable and a *console* row means something. (b) Leave it and carry the noise to Stage 12: criterion 2 goes to `## Not done`, and M1 and M4 each run with two noise `fail · major` rows. (c) Patch it at seed time in `bench/run/seed.mjs`, leaving the fixture as Stage 12 will find it.

**Taken (user, option a, as recommended).** A bench fixture is a stand-in for a project, and a project serves its own API in development; a fixture that does not is measuring the engine against a condition no developer has. The arms then read what they were written to read: an added *network* row means a request the application actually got wrong, and the absence of one is a clean route rather than a fixture. (b) costs the stage a criterion for a defect nobody claims is real. (c) is the worst of both — the arms measure a tree that is not in `bench/fixtures/`, so a Stage 12 run on the fixture itself would disagree with every arm this stage bought, and the disagreement would look like a regression.

**Cost if wrong.** A fixture that answers is a fixture whose error paths need seeding on purpose: the `role="alert"` state that used to be free is now something a defect patch has to produce. That is the right way round — an error state nobody asked for is not a test of one — and the two endpoints stay small enough that a defect can still break them by hand.

**Applied in.** `bench/fixtures/webapp/dev-api.ts` and `dev-api.test.ts`, `vite.config.ts`, `tsconfig.json`, `index.html`; **`bench/fixtures/webapp/CLAUDE.md`**, whose conventions list said `/api` "is served by nobody in dev and 404s on purpose" — the sentence M1's run quoted back as its base-state evidence, and the reason this list names it first; `bench/fixtures/README.md`; `bench/run/README.md`; the `BACKLOG.md` line it retires. Stage **11d-3**.

### 0124 — A claim row's status answers what the row cites (2026-09-07, proposal MMM, Stage 11d-3)

**Context.** Stage 11d-3's **M1** produced a table where the same source got two treatments. Rows 6 and 7 are `*source console/network*` added rows for the 404s on `/orders` and `/orders/:id`. Row 4 is the `ui` **claim** on `/` — "the navigation landmark's two link texts, read in the page" — and its evidence records the predicate correct on **both** loads: `navigation "Sections"` → `link "Orders"`, `link "Shift handover"`. It is marked `flaky`, because the first load's console carried a `404 (favicon.ico)`. Two rules were each right and neither governed: `oracles.md §1` makes a console error on a visited route an **added** row, and `agents/hodos-verifier.md:42` lists `console` and `network` inside the `browser` row's own pipeline. Where the route carried no claim the ambient error became its own row; where it carried one, the claim absorbed it. Both definitions of `pass` give `pass` here — the Iron Law's ("a browser action was taken in this message and its screenshot is on disk", `evidence/01-home.png`) and `§5`'s ("printed what the row cites"). The consequence is not cosmetic: `finish.md §3a` offers a pin for a `pass · pin` row, so a claim failed on ambient noise cannot be pinned, and **M1's whole deliverable was unreachable**.

**Options as they were put.** (a) **One sentence in `oracles.md §1`**: a console error or a failed request on a route that also carries a claim row is its own added row, and the claim row's status answers what the row cites. (b) The same sentence in the agent's pipeline line, which is where the ambiguity is — but that file is at **150/150** and would need decision **0116**'s option (b) first. (c) Leave it and record that a pin is unreachable on any route with console noise.

**Taken (user, option a, as recommended).** It resolves which of two shipped rules governs rather than adding a third, and it lands in the file whose channel this same run measured working: 11d-2's arm wrote `source: detector` with no command beside it, and this one wrote `*source console/network*` **with** the command, which is `oracles.md §1`'s own correction taking effect. (b) is the more direct channel and costs a cap negotiation to say one sentence. (c) leaves the engine reporting a proved claim as `flaky` and losing the pin, which is decision 0094's mechanism disabled by an unrelated 404.

**Cost if wrong.** A claim row now passes on a route whose console is dirty, and the dirt is one row further down instead of on the claim. That is the intended reading — severity comes from the source, and a `major` added row still fails the verdict — but it does mean a developer scanning only claim rows sees green where the route is noisy. The `## Not covered` block and the added rows are what answer for that, and a run whose added rows nobody reads is a `verify.md` nobody reads.

**Applied in.** `skills/run/references/oracles.md §1`. Stage **11d-3**.

### 0125 — The fix pass is bounded by the diff, not by a status (2026-09-08, proposal QQQ, Stage 11d-3)

**Context.** `verify-loop.md §7` kept the fix pass inside the reviewed diff with one clause keyed on the **`pre-existing`** status. Decision **0119**, taken the day before, made that status unreachable for every browser row, and every addable row of decision 0093 is browser-side. Stage 11d-3's **M3** and **M4** both met the hole the same day: M4's row 8 (axe `landmark-one-main`, app-wide in `App.tsx`) is a `fail · minor` and §7 opens *"Every `fail` row"*; M3's rows 22–24 were left with the words *"So §7 keeps them out of the fix pass"*, citing the `pre-existing` clause about three rows the same run had graded `fail`. Both reached the right behaviour through a rule that does not cover it.

**Options as they were put.** (a) **Re-key the clause on the diff** — a row whose defect is outside this task's diff is not fixed here whatever its status, and the row says how that was established. (b) Make the status reachable so the existing clause covers them, which is decision **0127**. (c) Both. (d) Nothing.

**Taken (user, option a, and (c) in effect because 0127 was taken too).** The bound the sentence exists to enforce is *outside the diff*; `pre-existing` was the label that happened to carry it until 0119 took the label away. Re-keying is one clause and holds whichever way 0127 goes — which matters, because 0127's proof is bounded and a row it cannot prove would otherwise fall back through the same hole. (d) is two runs' evidence that the reasoning is reachable and one run's worth of luck.

**Cost if wrong.** A row inside the diff that a run misjudges as outside it goes unfixed and rides to the breaker. The row now names how provenance was established, so a developer reading the table can say the run was wrong — which is not true today, where the same row rides to the breaker with no statement at all.

**Applied in.** `skills/run/references/verify-loop.md §7`; `docs/FORMATS.md §10`; `docs/COMPONENTS.md` (the verify phase entry); `docs/DECISIONS.md` 0120's *Applied in*. Stage **11d-3**.

### 0126 — `flaky` describes a failure nobody could explain (2026-09-08, proposal RRR, Stage 11d-3)

**Context.** Decision **0098** defined `flaky` by observation: a row that fails and passes on one retry, both outputs in evidence. Stage 11d-3's **M4** produced exactly that observation — `evidence/10-crash-console.txt` records `ok, CRASH, ok, CRASH` over four real navigations — and the verifier wrote `fail · blocker` instead, naming the mechanism line by line: a `sessionStorage` counter keyed on navigation-entry parity, invisible to jsdom, unmounting the tree through a missing `ErrorBoundary`.

The verifier's choice is the better one, and the bench says why: `bench/run/README.md:153` records that `flaky` *"carries no severity of its own"*. Writing it there would have dropped the row's `blocker`, and with it its place in `verify-loop.md §7`'s order and its weight at the breaker — trading a diagnosis for an observation. What `flaky` is for is a claim nobody can rely on **because nobody knows why it fails**.

**Options as they were put.** (a) **`flaky` is a row that failed, passed on retry, and whose failure the verifier could not explain**; a failure with a named mechanism is a `fail` at its severity, and the retry that passed is in the evidence cell either way. (b) Observation wins and M4 is an engine defect. (c) `flaky · <severity>`. (d) Leave 0098 and record that no run has ever written `flaky`.

**Taken (user, option a, as recommended).** It is what the better of two behaviours already did, and it keeps the severity that orders the fix. The evidence cell still carries both outputs, so nothing a reader needs is lost — only the label changes, and toward the more specific claim. (b) makes the engine write the weaker word whenever it does the better work. (c) changes the status grammar for one case. (d) leaves a status the design cannot produce.

**What this costs, stated plainly.** Criterion 3's second half stays unbought: no hodos run has written `flaky`, and the seeded defect cannot produce it, because a defect readable in the diff is never unexplained and every seeded defect is readable in the diff. A genuine race is what would produce it, and Stage 12's real project is where one is likely to appear. The user took this knowingly, against re-seeding and re-buying the arm at `$5–9`.

**Cost if wrong.** A verifier that thinks it has explained a genuine race writes `fail · blocker` and the fix pass chases it. The evidence cell holds both runs, so the alternation is visible; and a `blocker` chased and not reproduced comes back at iteration 2, which is where a wrong explanation shows.

**Applied in.** `docs/FORMATS.md §10`; `skills/run/references/oracles.md §5` (the status table and its prose); `agents/hodos-verifier.md`; `docs/DESIGN.md §7.4`; `docs/COMPONENTS.md` (the verify component and the oracles entry); **`docs/BUILD-PLAN.md` Stage 11d's criterion 3**, which had demanded the behaviour this decision forbids; `docs/DECISIONS.md` 0098's *Applied in*; `bench/run/README.md` (the defect's row, which claimed a status it cannot produce); `docs/stages/11d-plan.md` T26 and `docs/stages/11d3-manual.md` M4, both of which sent a reader after the status; `docs/BACKLOG.md` (a race that produces `flaky`, Stage 12). Stage **11d-3**.

### 0127 — `git` proves "not introduced here" where a second environment cannot (2026-09-08, proposal SSS, Stage 11d-3)

**Context.** Decision **0119** ruled that a browser row can never be `pre-existing`, because 0097's proof is a re-run at the base sha and a browser predicate needs a second running environment nothing raises. Stage 11d-3's **M3** proved the same thing without one: rows 22–24 are detector hits on `/shift`, and the kernel established from the object store that the banner, the notes box and the two absolutely-positioned buttons are *byte-identical at base `e00ff45`*, that the diff renamed one identifier and added one handler, and that neither touches geometry. 0119 considered the re-run and never considered the diff.

The cost of not having it was on M3's branch and its own report named it: *"every future `ui` run re-surfaces rows 22-24"*. Decision **0120** says a row nobody claimed does not fail the verdict; 0119 stopped these rows reaching the status that would let 0120 apply; the two together give a permanent `FAIL` on defects the task did not make — which is the outcome 0120's option (c) was rejected for, arriving through a different door.

**Options as they were put.** (a) **A browser row earns `pre-existing` on a bounded `git` proof**: the row's evidence names the base sha and the files whose bytes are unchanged, and the proof is admissible only where the diff touches nothing the route's render depends on — no shared stylesheet, no shared layout component on the path. The report says the proof was `git` and not a re-run. (b) Any browser row on code the diff did not touch, with no dependency bound. (c) Only a re-run counts, which is 0119 today. (d) Defer to Stage 12.

**Taken (user, option a, as recommended).** It buys back most of what 0119 gave up for the price of a bounded evidence sentence, and it makes the counts mean what they say: `pre-existing 0` in M3's report is a true statement about the proof available and a false impression of the branch. The bound is what separates it from (b) — a source file unchanged under a changed stylesheet renders differently, and that is the one case where the cheap proof lies. (c) is the status quo with the cost now measured. (d) is 0119's option (b), a stage of work, and stays in `BACKLOG.md`.

**What this changes about a verdict, stated plainly.** Under 0120 a `pre-existing` row nobody claimed does not fail the verdict. So M3 and M4 would both have ended `PASS` with no breaker, and the deliberate `/shift` defects would be reported rather than blocking. That is the intended reading — they are not those tasks' defects — and it means a developer who wants them to block must claim them in a plan, which is what a claim is for.

**Cost if wrong.** A defect introduced by a change the bound failed to catch is labelled `pre-existing`, does not fail the verdict, and reaches the developer as a reported row rather than a breaker. The evidence names the base sha and the files, so the mistake is visible in the row; and decision **0125** means the fix pass leaves it either way, so the error is in the verdict and the label rather than in what the engine edits.

**Applied in.** `docs/FORMATS.md §2` (the `checks[]` field note) and `§10` (which rows may hold `pre-existing`, and the evidence a `git`-proved row carries); `skills/run/references/oracles.md §5`'s status table and `§5.2`; `skills/run/references/verify-loop.md §7`; `agents/hodos-verifier.md`; `docs/DESIGN.md §7.4`; `docs/COMPONENTS.md` (the verify component and the oracles entry); `docs/stages/11d-plan.md` T24; `docs/DECISIONS.md` 0119's and 0120's *Applied in*. Stage **11d-3**.

### 0128 — The fix pass records the order it took (2026-09-08, proposal TTT, Stage 11d-3)

**Context.** `verify-loop.md §7` orders the fix pass — `blocker`, then `major`, then `minor` — and requires one commit for the pass. One commit records no order. Stage 11d-3's **M3** is criterion 2's own arm, whose acceptance sentence is *"Severity orders the fix"*, and nothing it wrote can answer whether the order was taken: the commit body names row 19 (`minor`) before rows 20–21 (`major`), the finish report's *Fixed after the last review* line does the same, and both readings — narrating by row number, and fixing in the wrong order — fit the artifact equally. The kernel's own words were *"Fix pass, in severity order"*, a claim with no artifact behind it, which is the shape the verifier's `unfalsifiable:` category names in the plan's claims and not in the engine's.

**Options as they were put.** (a) **The commit body lists the rows in the order they were taken**, one line each, severity first. (b) A ledger line per row fixed, in a file whose grammar is closed at three (decision 0084). (c) One commit per row, against §7's own rule. (d) Nothing.

**Taken (user, option a, as recommended).** One sentence in §7, the record lives with the change, and it makes the stage's own criterion measurable by an artifact the task already produces. (b) buys durability the commit already has and costs a grammar change. (c) trades a rule for a rule. (d) leaves a specified order no run can be held to, on a stage that bought an arm to check it.

**Cost if wrong.** A pass that fixes nine rows has a nine-line commit body. That is a body that says what happened.

**What it does not buy, and Review 1 is why this sentence exists.** The repair landed and the *measurement* did not: the criterion was first amended to demand the ordered commit body, which no run has produced, and a stage entry that asks for an unbought artefact is a blocker. Criterion 2 was then amended to the counts half M3 bought, and the order's measurement went to `BACKLOG.md` for Stage 12 — the shape decisions **0113** and **0126** both used. Closing it needs one re-buy of M3's own arm under this decision: two severities suffice, because M3's row numbers already ran counter to severity order — the `minor` at row 19, the `major`s at 20–21 — so an ordered body and a row-number narration stop fitting the same artefact. A table with **three** severities is the fuller measurement and this fixture cannot seed one: 0108 gives `blocker` to a failing plan claim or a crash under an attack, and both of M3's defects were presentation.

**Applied in.** `skills/run/references/verify-loop.md §7`; `docs/stages/11d3-manual.md` M3's Report line (corrected already, against `git log --oneline`); `docs/BUILD-PLAN.md` Stage 11d criterion 2, amended to what the arm showed; `docs/stages/11d-plan.md` T25; `docs/BACKLOG.md` (the fix order, Stage 12). Stage **11d-3**.

### 0129 — A pinned predicate reaches by query, never by position (2026-09-08, proposal UUU, Stage 11d-3)

**Context.** Decision **0118** made `config.mjs check` warn on a pinned predicate written over a class or an id. Stage 11d-3's **M3** wrote one the check passed in silence: `document.querySelector('h1').nextElementSibling.nextElementSibling.textContent`. It reaches by sibling position from the page's heading, so an element inserted between them breaks it — a smaller change than renaming a class. The finish report **said so in prose** while the mechanism written to say it stayed quiet. `FORMATS.md §10` and `oracles.md §5.2` both phrase the rule positively — *over a role or text and never a class or an id* — and a positional walk is neither of the two forms named and not the thing asked for either.

**Options as they were put.** (a) **Widen the warning to any predicate not anchored on a query**: an element is reached by a selector, and a selector is not a class or an id; a positional walk from a queried node is what makes it unanchored. (b) Add positional traversal to the enumerated list beside class and id. (c) Error rather than warn. (d) Nothing.

**Taken (user, option a, as recommended).** It makes the check say what `FORMATS.md §10` already says. There are exactly two ways a predicate reaches an element — a query or a walk from something queried — so *"reached by a query whose selector is not a class or an id"* is the positive rule made decidable, and an enumeration of bad shapes is a list the next brittle predicate is not on. (c) breaks 0118's own reasoning, that a brittle predicate is a config that runs and fails later rather than one that cannot run at all.

**Cost if wrong.** A predicate that walks the DOM for a good reason gets a warning it does not deserve. It loads, the developer reads one line, the pin works. That is the cost 0118 already priced for class and id.

**Applied in.** `scripts/config.mjs` and `scripts/config.test.mjs`; `docs/FORMATS.md §2`; `skills/run/references/oracles.md §5`; `skills/run/references/finish.md §3a`; `skills/init/SKILL.md` and `skills/init/references/config.md`; `agents/hodos-verifier.md`; `docs/COMPONENTS.md` (the finish phase and `init --refresh` entries); `skills/status/SKILL.md` (what a `warning` is); `docs/DECISIONS.md` 0118's *Applied in*. Stage **11d-3**.

### 0130 — `evaluate` is a function, and a bare expression warns and is wrapped (2026-09-08, proposal VVV, Stage 11d-3)

**Context.** `docs/FORMATS.md`'s adapter table maps the field to `mcp__chrome-devtools__evaluate_script {function}` — the operation takes a function — while `FORMATS.md §10`'s worked example and `finish.md §3a`'s both give a bare expression. Two runs of the same phase on the same day wrote both shapes. **M1**'s pin is `"() => { const nav = …; return JSON.stringify({…}); }"`, and has to be a function, because the predicate reads three things and serialises them. **M3**'s is `"document.querySelector('h1').nextElementSibling.nextElementSibling.textContent"`, copied from the example. Each followed a different sentence of one specification, and a bare expression handed to `evaluate_script` as a function is a pin that never fires — the silence decision **0094** built the prune proposal to prevent, arriving before the route ever rots.

**Options as they were put.** (a) **The function is canonical**: both examples become `() => (…)`, and `config.mjs check` **warns** where the string does not parse as a function while the run wraps it — warn rather than error, on 0118's reasoning, so the two configs already written keep working. (b) The expression is canonical and the adapter line is fixed. (c) Accept both and normalise at run time. (d) Nothing.

**Taken (user, option a, as recommended).** It matches the operation the format already declares, it is the shape the harder of the two live pins needed, and the warning-plus-wrap means nothing on disk breaks. (b) makes the format's own adapter line wrong and cannot carry a multi-statement predicate without an IIFE. (c) is (a) without the nudge and leaves two shapes in the wild for good. (d) is the state that produced this.

**Cost if wrong.** A developer who prefers the expression gets a warning on a pin that works, because the wrap runs it either way, and the warning names the shape to write instead.

**Applied in.** `scripts/config.mjs` and `scripts/config.test.mjs`; `docs/FORMATS.md §2` and its adapter table; `skills/run/references/finish.md §3a`; `skills/run/references/oracles.md §5`; `skills/init/SKILL.md` and `skills/init/references/config.md`; `agents/hodos-verifier.md`; `docs/COMPONENTS.md` (the finish phase and `init --refresh` entries); `skills/status/SKILL.md` (what a `warning` is). Stage **11d-3**.

### 0131 — A route does not leave the sweep while a pin names it (2026-09-08, proposal NNN, Stage 11d-3)

**Context.** Stage 11d-3's **M2** ran `init --refresh` on a copy where the landing route was deleted from `src/App.tsx` while a `checks[]` entry still named it, and produced two proposals about the same route: `C1`, prune the pin on `/`, on its own row because `SKILL.md` step 4 says a prune is never batched; and `C2`, refresh `verify.recipes[ui].routes`, **inside** the five-row batch. Nothing ordered them.

That order is not neutral. `routes[]` is what the `ui` sweep visits, and a `checks[]` entry is evaluated on the route it names when the sweep gets there. Drop `/` from `routes[]` while `checks[0].route` is `/` and the pin is never read again — not removed, not proposed for removal, not reported: the silence decision **0094** put the prune proposal in the way of, reached from the other side and leaving no proposal behind. The reverse order is harmless. The run agreed once asked and then over-corrected, offering both as one edit, which would have let a decline of the routes refresh take the approved prune with it.

**Options as they were put.** (a) **A route may not leave `routes[]` while a `checks[]` entry names it** — the prune is presented first, the routes row states its dependency, and a routes row approved without its prune is refused with that reason and stays a report line. (b) Bundle them into one row. (c) Both rows carry the other's number and the developer sequences them. (d) Nothing.

**Taken (user, option a, as recommended).** It keeps the prune its own approvable row, which is 0094's whole mechanism, and it makes the dependency the engine's to enforce rather than the developer's to notice at the moment they are being asked five things. (b) is what the run reached for on its own and is what 0094 already rules out. (c) is the status quo with better labels: the row that does harm is still approvable alone. (d) leaves a documented way to disable a pin without a proposal, in the procedure whose job is proposing.

**Cost if wrong.** A developer who wants only the routes refresh — a route genuinely renamed, the pin to be re-pointed by hand later — is refused once, with a reason, and can edit `config.json` themselves. That is one refusal against a pin that stops being read with no record anywhere.

**Applied in.** `skills/init/SKILL.md` step 4 of `--refresh`; `docs/DECISIONS.md` 0094's *Applied in*. Stage **11d-3**.

### 0132 — `verifiedAt` answers for the commands, `scanSha` for the delta (2026-09-08, proposal OOO, Stage 11d-3)

**Context.** `skills/init/SKILL.md` gave both fields one rule: *"`scanSha` and `verifiedAt` move only after the commands ran again."* At Stage 11d-3's **M2** five commands ran green and the run refused to move either, gating instead on `lint.mjs --project` exiting 0 — the **Completion** condition for the whole procedure, not step 6's condition on these two fields. It named the substitution rather than hiding it.

The substitution is not what the sentence says, and the sentence is the thinner of the two. The fields answer different questions. `verifiedAt` answers *when were the recorded commands last seen green*, and step 6's condition is exactly right for it. `scanSha` answers *how much history has been examined* — it is the left end of the next `--refresh`'s delta. Move it to `HEAD` while a proposal from this delta is unresolved and the next run computes `git log <newSha>..HEAD` and never looks at the rot again: the finding is buried by the pointer whose job was to record that it had been looked at. A declined proposal is the common case, because a decline is a first-class outcome of step 5.

**Options as they were put.** (a) **Split the condition** — `verifiedAt` moves when the recorded commands ran green in this session whatever else was left undone; `scanSha` moves only when the delta it closes leaves no unresolved proposal, and the report names the row holding it. (b) One rule, the stricter one, which is what the run did. (c) One rule, the looser one, which is what the file said. (d) Move `scanSha` and record the unresolved rows in the config, which is a new field.

**Taken (user, option a, as recommended).** Each field gets the condition its own meaning implies, and the expensive half — burying a finding — is the one that gets the guard. It also matches what M2 needed to say: the commands *were* green, and the reason to hold the pointer was the declined `R1`. (b) makes `verifiedAt` lie about a session in which the commands did run. (c) is the reading that produced this. (d) buys a config field for state the git history and the rules already carry.

**Cost if wrong.** A project with one long-declined proposal never advances `scanSha`, so every `--refresh` re-scans a growing delta and re-proposes the same row. The procedure already says a row the developer **rejects** is not asked again; holding that apart from a row they *deferred* would have to be carried on disk, and today it is not. Stage 12, with a real project and a stale rule, is where that bites or does not.

**Applied in.** `skills/init/SKILL.md` step 6 of `--refresh` and its Completion line. Stage **11d-3**.

### 0133 — A declined fix is a caveat, and step 7 says so (2026-09-08, proposal PPP, Stage 11d-3)

**Context.** Two sentences of `skills/init/SKILL.md` meet and cannot both hold. Step 7: *"`lint.mjs --project` → exit 0. A finding is fixed here, not reported as a caveat"*, with the phases table making step 7 *done when* lint exits 0. Step 6 of `--refresh`: *"write only what is approved."* At Stage 11d-3's **M2** the developer declined `R1`, the re-point of a rule precedent that a commit in the delta had killed, so `lint --project` exits 1 and step 7 cannot be completed by any action the run is allowed to take.

The run resolved it correctly — the approval wins, the finding becomes a caveat — and said so. But a reader of step 7 alone would call the run non-compliant, and a run less inclined to explain itself could read the same sentence as authority to write the un-approved fix. The sentence was written against a different failure: an `init` that finds a lint error and files it as a known issue rather than repairing it.

**Options as they were put.** (a) **Name the exception where the rule is** — a finding the developer declined to fix is a caveat named in the report with the row that declined it; every other finding is fixed at step 7, and its *done when* becomes "lint exits 0, or every remaining finding traces to a declined row". (b) Step 7 re-presents the finding as a blocking question. (c) Step 7 writes the fix regardless. (d) Leave both sentences and rely on the run to reconcile them.

**Taken (user, option a, as recommended).** It states the resolution the run reached, in the sentence a reader consults, and keeps the original teeth for the case the sentence was written for. (b) turns a decline into a loop the developer can only leave by agreeing. (c) writes an un-approved change to a project file, which is the anti-pattern this skill is shaped against. (d) is a coin flip on the next run's disposition, and the two readings differ by whether the engine edits a file it was told not to.

**Cost if wrong.** A run can complete with `lint --project` red, so "the layer is healthy" no longer follows from "init finished". The report carries it — the caveat, the declined row, the finding — and a developer who does not read the report is where they were with a run that stopped instead.

**Applied in.** `skills/init/SKILL.md` step 7 and its phases-table row. Stage **11d-3**.

### 0134 — A `repo:` name is the repository root's own directory name, taken from `external[]` (2026-09-08, Stage 9b, Q1) — the failure-mode clause of its *cost* paragraph superseded by 0139

**Context.** `DESIGN.md §9` gives a node `repo:` and `path:` and a `Done-metrics` row ` · repo: <name>`, and says a metric "carries `repo:`" — and nothing anywhere says what that name is measured against. Stage 9b's criteria 1 and 3 both need the answer: criterion 3 asks that a metric row carrying ` · repo:` measure **in that repository**, its path resolving against that repository's git root (decision **0075**), which is a directory the script has to find from a name a human wrote in a committed file.

`config.campaigns.external[]` is already the one place a sibling checkout is named — "absolute or repo-relative paths to other repositories' `campaigns/` directories" (`FORMATS.md §2`) — and repo-relative there means the git root, by the anchor 0075 states.

**Options as they were put.** (a) The repository root's own directory name, derived from each `external[]` entry by stripping `.claude/hodos/campaigns`: `../kit/.claude/hodos/campaigns` → root `../kit` → the name `kit`; the map's own repository answers to its root's name too, and a node's `path:` is a repo-relative directory **inside** the named repository. (b) A new config key `campaigns.repos: {"kit": "../kit"}`. (c) `repo:` is a label with no resolution rule, and the node's `path:` carries the directory.

**Taken (user, option a, as recommended).** It adds no key and no second source of truth: the path is written once, in the list that already exists because the maps have to be found through it. (b) buys explicitness at the price of two places that can disagree about where `kit` is, in a file no 0.1 project carries. (c) puts a machine path into a file the whole team commits and reads — different in every checkout, so the map stops being readable by anyone but its author, which is the property `DESIGN.md §9` calls the map's whole point.

**What it costs to be wrong about.** A repository whose directory is renamed on disk stops answering to the name its map uses, and the map's own `external[]` entry is stale in the same breath — one edit, and the failure is loud: a name that resolves to nothing stops the command and prints the names it does know. A checkout deliberately named something else (`kit-2`, a worktree) needs its own `external[]` entry, which is what a second checkout needs anyway.

**Applied in.** `docs/FORMATS.md §2` and `§11`, `docs/COMPONENTS.md §3`, `scripts/campaigns.mjs`, `scripts/campaigns.test.mjs`, `skills/campaign/references/map.md`. Stage **9b**.

### 0135 — A claim is read from the refs, and a node another branch holds leaves the frontier (2026-09-08, Stage 9b, Q2)

**Context.** `DESIGN.md §9` resolves races socially and has `status` "show claims from known branches", and a claim is "`[active] … @owner` committed on the node's branch". Nothing in the engine reads a ref: `frontier` parses the map in the working tree, so a claim committed on a colleague's branch — the only place `map.md §6` step 4 puts it before a merge — is invisible to the session that is about to be offered the same node. Decision **0080** put a `git fetch` in front of the report for exactly this reason and stopped there: it updates remote-tracking refs, and nothing was reading them.

Stage 9b's criterion 2 asks for two things at once: the claim reported with its branch name, and the second session **not silently given** the node.

**Options as they were put.** (a) `campaigns.mjs frontier` reads the map from every ref that carries it — local branches and remote-tracking — prints `claimed: <node> — <gist> · owner: <owner> · branch: <branch>`, and keeps that node **out of** `ready`; the digest row's vocabulary gains `claimed`; git-only, capped, fail-open. (b) A separate `campaigns.mjs claims <slug>`, `frontier` unchanged, `status` and the campaign skill calling both. (c) `frontier` reads the refs but leaves the node in `ready`, printing the claim as a warning beside it.

**Taken (user, option a, as recommended).** The frontier is what the campaign skill proposes from (`map.md §5`), so a claim the frontier does not know is a claim the proposal cannot honour. (b) leaves the ready list ignorant and makes "not silently given the node" a rule with no mechanism — the same shape decision **0053** refused for a `ready` node with an open dependency, answered there by `held`. (c) is the silence the criterion exists to close, reached from the other side: the warning is printed beside the offer it contradicts.

**The shape.** `claimed` is a line in the script's output and a segment of the digest row, never a status written into a map — the rule `held` follows (decision **0053**). A node is `claimed` when the working tree calls it `ready` and some other ref calls it `active` or `review`; a claim that agrees with the working tree is the `active` line it already was. The read is two processes per repository per run whatever the number of branches — one `git for-each-ref refs/heads refs/remotes`, one `git cat-file --batch` fed `<ref>:<map path>` — capped at 50 refs with 1-second timeouts and failing open to no claims, which is the class the decay row and the offer line of `FORMATS.md §12` already run in. It runs in the `SessionStart` digest too: it makes no network call, and a digest whose `ready` count disagrees with `/hodos:status`'s is worse than the calls cost. What the digest does **not** do is fetch (decision **0080**).

**Cost if wrong.** A repository with dozens of stale branches pays two git calls and reports a claim from a branch nobody has touched in a month — a claim whose owner is named and whose branch a developer can look at, which is what "resolved socially" means. Visible at Stage 12 as noise on a real repository's ref list, in which case the cheap correction is a filter on the refs read (merged branches, an age bound), not a retreat to the working tree.

**Applied in.** `docs/DESIGN.md §9`, `docs/FORMATS.md §11` and `§12`, `docs/COMPONENTS.md §3` and `§1.5`, `scripts/campaigns.mjs`, `scripts/campaigns.test.mjs`, `scripts/state-digest.mjs`, `scripts/state-digest.test.mjs`, `skills/campaign/references/map.md §4–5`. Stage **9b**.

### 0136 — `set --gist` writes the sentence; a node is renamed by being replaced (2026-09-08, Stage 9b, Q3)

**Context.** `BACKLOG.md:38`, found by Stage 9a's session B and delegated to this stage: `campaigns.mjs set` writes any of `--status --deps --owner --branch --ref --metric --by` and neither the node's **name** nor its **gist**, while `map.md`'s anti-pattern list forbids editing a node line by hand. So a node whose name is wrong and a node whose gist is wrong are both uncorrectable by any means the engine offers, and session B put a pulled fog item's precise statement into a `D` row rather than break the rule.

The two halves are not the same problem. A gist is free text nothing points at. A name is a reference target: other nodes' `deps:`, a `by:` sentence, `ref: task:<slug>` and the task directory it names, and the branch `config.conventions.branch` derived from it.

**Options as they were put.** (a) `set --gist` is added — one field, nothing to move — and a **rename is a replacement**: the old node goes `dropped` with a `D` row saying why, and the new name is a new node. (b) `set --name`, which rewrites every `deps:`/`by:` mention and reports the `ref:` and the branch it cannot move. (c) Neither: document the replacement rule and leave the gist gap open.

**Taken (user, option a, as recommended).** It closes the half that has no workaround with the one-line write the script is built for, and answers the other half with the rule the references themselves imply: a name that appears in a task directory and a branch cannot be corrected by editing a map. (b) makes one command edit many lines — the property `campaigns.mjs` was written to avoid ("rewrite one field, nothing else moves") — and still leaves the task directory and the branch carrying the old name, so the rename is half-done by a command that reports it as done. (c) leaves the reported gap exactly as reported.

**The shape.** `--gist` rewrites the third part of the head segment and nothing else. A value containing ` · ` is refused with exit 2 and the file is left byte-identical: the separator would forge a field, which is the one way free text can corrupt the grammar. A replacement is written in `map.md` as a procedure — `set <old> --status dropped`, the `D` row, the new node line — because a `[dropped]` node with a `D` row beside it is the record a team reads, and a name silently swapped is a map whose history disagrees with its merge requests.

**Cost if wrong.** A campaign that renames often accumulates `[dropped]` lines. That is the map's own history, which `DESIGN.md §9` keeps for the team on purpose, and `[dropped]` is already the status the grammar has for a node that is not being done under that name.

**Applied in.** `scripts/campaigns.mjs`, `scripts/campaigns.test.mjs`, `docs/COMPONENTS.md §3`, `skills/campaign/references/map.md`, `docs/BACKLOG.md` (the line is closed with what settled it). Stage **9b**.

### 0137 — The home map is edited by the run and committed by the developer; there is no key (2026-09-08, Stage 9b, Q4)

**Context.** `DESIGN.md §9`: "`finish` in a foreign repo edits the home map and asks the human to commit it; auto-commit is opt-in." Nothing names the key that opt-in is expressed in, and `finish.md §4` today closes the node and commits the map with the finish commit — right while the map is in the same repository, and impossible when it is not: the map's repository is a different working tree, with a different branch, a different index and possibly a different developer's uncommitted work in it.

**Options as they were put.** (a) No key. The run edits the home map through `node-done` and prints the repository, the file and the exact command; the developer commits it, which is what "opt-in" is. (b) A new config key `campaigns.commitHomeMap: false` a project may turn on. (c) The run commits it when the home repository's tree is clean.

**Taken (user, option a, as recommended).** Decision **0090**'s rule — no dormant key ships — applies exactly: (b) writes a key into every 0.2 config for a behaviour nothing has measured, and the behaviour it enables is a commit in a repository the session was never asked to touch. (c) needs no instruction and no key and is the worst of the three: "clean" is also true of a colleague's checkout mid-review, and a commit that appears in someone's other repository from a run they did not watch is the class `STAGE-PROTOCOL.md §7` reserves for the user.

**The shape.** One reported line, in the form the phase's other writes take: the repository, the path, and `git -C <repo> add <path> && git -C <repo> commit -m "<node> done"` for the developer to run. A `node-done` that could not write at all is already one reported line and a finish that continues (`finish.md §4`), and this is the same rule for the write that succeeded and the commit that is not this run's to make.

**Cost if wrong.** A node closed in a map nobody committed is closed for one machine — the failure `map.md §6` names for a claim, now possible for a close. The instruction is printed where the developer is looking, and `/hodos:status` reports the map as it stands; if the pilot finds the map routinely left uncommitted, the correction is a digest row for a dirty home map, not a commit the engine makes on its own.

**Applied in.** `skills/run/references/finish.md §4`, `docs/DESIGN.md §9`, `docs/COMPONENTS.md §1.2`. Stage **9b**.

### 0138 — The fetch is bounded at five seconds (2026-09-08, Stage 9b, Q5)

**Context.** Decision **0080** put `git fetch --no-tags --quiet` in front of `/hodos:status`'s report "under a timeout" and named no number. The one network call the engine makes is also the only one whose failure mode a developer feels as a hang, and the number is what decides whether a credentialed or dead remote costs a hiccup or a wait.

**Options as they were put.** (a) 5 seconds. (b) 3 seconds. (c) 10 seconds.

**Taken (user, option a, as recommended).** Long enough for a normal remote over a slow link, short enough that an unreachable one costs one pause. The digest's own git calls are bounded at 1 second (`state-digest.mjs`), which is right for a local call and not for a round trip. (b) prints `fetch failed — the map is as of your last pull` on remotes that were in fact reachable, which is fail-open but wrong more often; (c) makes every `/hodos:status` on a repository whose remote wants credentials pause ten seconds, the cost 0080 recorded as its taken option's risk.

**Cost if wrong.** One number, in one script, read by one flag. Visible at Stage 12 as either a stale-map line on a repository that was reachable or a pause a developer complains about, and each has the other option as its correction.

**Applied in.** `scripts/state-digest.mjs`, `scripts/state-digest.test.mjs`, `docs/FORMATS.md §12`, `skills/status/SKILL.md §1`, `docs/COMPONENTS.md §1.5`. Stage **9b**.

### 0139 — An unreadable metric row is reported in place, whatever made it unreadable (2026-09-08, Stage 9b, proposal WWW)

**Context.** Decision **0134** settled what a `repo:` name resolves against. Its *cost* paragraph then added a failure mode nobody had put as an option — "a name that resolves to nothing stops the command and prints the names it does know" — and Stage 9b built the other one, citing decision **0055**, which the user took at Stage 9a for a metric command that times out: the cell keeps its previous number with the date it was true on, the reason is said, and the run continues. Both documents 0134's own *Applied in* names were written that way; only `campaigns.mjs`'s `--help` carried 0134's letter, documenting an exit code that never happens. Stage 9b's review 1 filed that contradiction as a blocker, which is what raised this.

**Options as they were put.** (a) Fail-soft as built: the row is reported unmeasured with `no repository named <name> — known: <the roots it walked>`, the command exits 0, and this decision records that 0055 governs an unreadable metric row whatever made it unreadable. (b) 0134's letter: `measure` exits 1 when a row's `repo:` resolves to nothing, and three documents move to match. (c) Split it — `measure` stops, the re-measure inside `node-done` does not.

**Taken (user, option a, as recommended).** 0055 is the engine's own precedent for this exact condition and its reasoning applies unchanged: nothing is silently wrong, because the number carries the date it was last true on. (b) lets an unrelated stale `external[]` entry refuse to close a node — a campaign's bookkeeping held hostage to a metric — and loses the number of the row that did measure. (c) buys precision at the price of one command whose exit code depends on which caller is inside it.

**What it costs to be wrong about.** A `repo:` broken by a rename is a line in a report rather than a stop, so a developer who reads past it works from a number with an older date beside it. The mitigation is the message's second half, which decision 0134 asked for and this stage built: the names the lookup does know are printed beside the one it does not, so the fix is one edit and the reader can see what to type. **This supersedes 0134's cost paragraph on that one clause and nothing else** — what 0134 settled, the resolution rule, stands.

**Applied in.** `scripts/campaigns.mjs` (`--help`, `knownRepos`, `measureMap`'s `known`), `scripts/campaigns.test.mjs`, `docs/FORMATS.md §11`, `docs/COMPONENTS.md §3`, `skills/run/references/finish.md §4` · supersedes **0134**, and only the one clause of its *cost* paragraph that says an unresolvable name stops the command — 0134's resolution rule, which is what it settled, stands. Stage **9b**.

### 0140 — Stage 12 is four parts, and the engine is finished before the project is touched (2026-09-08, Stage 12, Q1)

**Context.** Stage 12 as `BUILD-PLAN.md` writes it is one entry with eight acceptance rows: `init` and a migration ledger on a real Rust workspace, twenty real tasks with a cost figure each, a hold-out reviewer measurement, Stage 9b's live-pair confirmation, a source-derived rule, decision **0121**'s seeded defect with the mechanism conditional on its number, decision **0122**'s grammar row landing in one commit across seven files, `DESIGN.md §13` revised, `0.2.0` tagged, dogfooding switched on. Two of those rows are engine changes; the rest are measurements of the engine those changes leave behind. Stage 11b split into four at its own Start (decision **0089**) and Stage 11d into three (decision **0105**), both for a smaller version of the same problem, and both so that one format took one shape rather than several.

**Options as they were put.** (a) Four parts, engine first. (b) Three — the mechanisms and `init` together, then the tasks, then the release. (c) Two — everything but the release, then the release. (d) No split.

**Taken (user, option a, as recommended).** The parts, in run order:

- **12a — the two mechanisms, on fixtures.** Decision **0121**'s twenty-second seeded defect scored against the review package as it stands, and its computed section bought or not on that number; decision **0122**'s `Task <n>: mutation (<k> tests)` in one commit across the seven files its *Applied in* names, `ledger.mjs` test-first.
- **12b — `init` on `ariadne_v2`.** The migration ledger for its existing `.claude/`, every rule carrying a `file:line` precedent in `.rs` source, one rule from `sources/rust.md` with the URL it came from, one source candidate rejected at question 2 with the reason shown.
- **12c — the twenty tasks.** 5 `quick` + 5 `standard` with hodos and the same counts without, the cost figure per task, `docs/PILOT.md`, the hold-out reviewer measurement, the cross-repository node of decision **0142**, and the digest sample decision **0141** gates on.
- **12d — the numbers and the release.** `DESIGN.md §13` revised by decision, decision **0141**'s build-or-not, `0.2.0`, dogfooding on this repository.

The order is the argument for the split: a real project must meet the engine in its finished shape, or every number 12c takes is a number about a version nobody released. (b) puts a fixture measurement and a real-project interview in one report, and their evidence is not comparable. (c) and (d) leave one plan file carrying many sessions — which the ledger can do and the report cannot: one report over twenty tasks and two mechanisms has no single base sha its reviewer can diff.

**Cost if wrong.** Four Starts and four fresh reviews rather than one, on a stage whose parts are sequential anyway. The compensation is the property that made 11b-1's four review iterations affordable: a part's review is scoped to what that part changed.

**Naming.** **12a**–**12d** in file and tag names as in prose, unlike 11b and 11d whose parts are numbered. `121` beside `12` reads as a different stage number, and the letter suffix is already this plan's convention at 9a, 9b and 11a–11d.

**Applied in.** `docs/BUILD-PLAN.md` (the Progress checklist, the Stage 12 heading and its parts paragraph, the order rationale), `docs/stages/12-plan.md`. Stage **12**.

### 0141 — The digest's repetition is measured on the pilot, and suppressed above half (2026-09-08, proposal II, Stage 12)

**Context.** The `SessionStart` digest is prepended to every session in a hodos project (`PLATFORM-NOTES.md` fact 3), capped at 300 tokens, and is the same text every session while the state behind it does not move. Principle 16 is the argument against paying for that twice. `research/07-basemode.md §2.1` has the mechanism and, more usefully, its exception: novelty suppression is for what a session can re-derive, and anything that must be **dismissed** rather than merely read is exempt. What proposal **II** could not supply was the number — nobody has measured what the digest costs per session on a real project, or how often two consecutive sessions get byte-identical text.

**Options as they were put.** (a) Leave it — 300 tokens is a cap, not a typical. (b) Per-class novelty suppression with an exempt class, hashed into `.claude/hodos/.digest-state`. (c) One hash for the whole digest. (d) Measure at the pilot and build nothing.

**Taken (user, option b gated on (d)'s number, as recommended).** The threshold, which the proposal left unnamed and this decision sets: **one half**. The statistic is the share of session starts in a hodos project whose digest text is byte-identical to that project's previous session's, over the pilot's own sessions in **12b** and **12c**. At or above one half, (b) is built at **12d**, before the tag: per-class hashes for the stale list, the campaign frontier and `verifiedAt`, with the active task's row and the single offer line exempt because they are what a session must act on. Below one half, **(a) stands and the number is recorded as the reason** — the mechanism would be machinery for a saving that is not there, and a threshold nobody wrote down before the measurement is a threshold fitted to it afterwards.

The instrument is option (d)'s and lands at **12b**, so both parts' sessions are in the sample: `scripts/state-digest.mjs` appends one `<sha256>\t<iso8601>` line per emission to `.claude/hodos/.digest-log`. Engine-internal state with no config surface, which is the same argument proposal II makes for `.digest-state` and the reason neither is a format 0.1 had to ship — decision **0040**'s breaking-change rule does not reach a file no project configures. The log is superseded by `.digest-state` if (b) is built and deleted with its measurement recorded if it is not.

(c) is all-or-nothing in both directions: one changed campaign count re-prints every row, and a session opened after `/clear` — the session with the least context and the most need of the digest — gets nothing. `lint --hook` is deliberately out of scope, though the same mechanism exists there: a lint finding is true until it is fixed and a repeat is the pressure to fix it, which is a different trade and needs its own argument.

**Cost if wrong.** Above the threshold and wrong: a digest omits a row whose state moved in a way its class hash did not see; the row returns the next time its text differs, and `/hodos:status` prints the whole thing uncapped on demand meanwhile. Reversible completely — one function, one file, and deleting `.digest-state` restores the previous behaviour byte for byte. Below the threshold and wrong: the pilot's twenty tasks are a heavier session mix than ordinary use, so a sample taken there under-counts repetition rather than over-counting it, and the measurement can be re-taken at 0.3 with dogfooding's own sessions.

**Applied in.** `docs/BUILD-PLAN.md` Stage 12b and 12d rows; `scripts/state-digest.mjs` and `scripts/state-digest.test.mjs` (the log at 12b, the suppression at 12d if the number says so); `docs/PILOT.md` (the share, with its denominator); `docs/DESIGN.md §11` and `docs/FORMATS.md §12` at 12d, only if it is built. Two things this list was short by, both settled at Stage 12b's Start: the log is a file in the developer's repository and no `.gitignore` list carried it — decision **0144**, which puts the line in the pilot's own file and leaves the engine's row to 12d; and the two-field line above cannot tell a session start from a kernel's own injection of the same script — decision **0145**, which adds the session id as a third field and reads the statistic off the first line of each session. Stage **12**.

### 0142 — The pilot's second repository is made, not found (2026-09-08, Stage 12, Q4)

**Context.** Stage 9b built campaigns across repositories on a seeded fixture pair and named two properties a fixture only imitates — a foreign owner who is a person, a race resolved socially — carrying both to Stage 12's confirmation row (decision **0077**). That row also has a mechanical half: one cross-repository node closed end to end across a pair. `ariadne_v2` is one repository, a Cargo workspace of twelve crates. There is no second one and no `external[]` entry to write.

**Options as they were put.** (a) Name a real second repository the pilot's project already pairs with. (b) Answer the row as unmeasured — one repository, one developer — and put the criterion in `## Not done` with the reason, extending to the repository half the escape clause the stage entry already grants the developer half. (c) Extract one crate into its own repository and pair it back.

**Taken (user, option c. My recommendation was (b) where no real pair exists; the user chose to make one.)**

**The risk, named because it is the one I raised.** Decision **0021** put the pilot on `ariadne_v2` and named this failure mode by name: the pilot's tasks being workflow work rather than ordinary feature work, which would not measure what T-1 measures. A crate extraction performed so that Stage 9b has a pair is that shape — work the engine's own build asked for. Two things bound it.

First, **the crate is chosen at 12c's Start by whether it has a reason to leave the workspace**, stated in one sentence a Rust developer would accept without hodos in the room: a consumer outside this project, a release cadence of its own, or a dependency surface the workspace should not carry. If no crate has one, this decision falls back to **(b)** and says so in the report. That keeps the line decision 0021 actually draws — the work is on `.rs` code and has its own engineering argument — rather than the weaker line that any Rust edit qualifies.

Second, **the extraction is not one of the twenty T-1 tasks and its cost is not in the multiplier.** It is the pair's setup, recorded in `docs/PILOT.md` under its own heading with its own cost figure, so a reader can see what the pair cost without it moving the number the thresholds are read against.

**What stays unmeasured either way.** One developer. A foreign owner who is a person and a race resolved socially are properties of two people, not of two repositories, and extracting a crate produces neither. Those two rows are answered by saying so — which the stage entry already calls a finding about the measurement and not a pass.

**Cost if wrong.** A crate leaves the workspace and the project's own tooling — `cargo nextest run --workspace`, the architecture test, `cargo-deny` — stops covering it from one root, which is a cost the pilot pays after the pilot ends. The repair is a revert of a split git records as a move. If no crate earns the split at 12c's Start, this decision cost the reading and (b) stands with its reason recorded.

**Applied in.** `docs/BUILD-PLAN.md` Stage 12c row; `docs/stages/12-plan.md`; the crate itself is named at **12c**'s Start — **`ariadne-scip`**, chosen on 2026-09-09 from the reading in `docs/stages/12c1-plan.md §4`: a leaf with one consumer inside the workspace, needing `ariadne-core` for a single enum, that vendors the whole protobuf surface — `prost`, `prost-build`, `protoc-bin-vendored` — which every build of the workspace pays for, and whose cadence follows an external index schema rather than Ariadne's. **The split did not remove that build cost** — `ariadne-cli` still depends on the crate, so `protoc` enters the workspace build transitively; what it bought is the boundary and the cadence, and `docs/PILOT.md §5` says so beside the claim. Stage **12**.

### 0143 — The count travels in the package, and the verifier's contract names the ledger (2026-09-08, proposal XXX, Stage 12a)

**Context.** Decision **0122** was taken as option (d): the ledger records `Task <n>: mutation (<k> tests)`, the verifier's mutation row names its sample, and the reviewer compares `<k>` against the test declarations the diff adds. Building the writer's half proved it green — `scripts/ledger.mjs`, 56 tests, three mutations — and building the readers' half found there is no route. The reviewer's inputs are a closed enumerated list and none is the ledger (`agents/hodos-reviewer.md`, `COMPONENTS.md §2.1`); `FORMATS.md §8`'s package has no section that could carry it. 0122's own sentence — "the number of tests the diff adds is derivable from the diff the reviewer already holds, so the comparison needs no new input" — answers for the diff side of the comparison and is silent about `<k>`. The verifier can reach `ledger.md` by sibling path from the plan path its dispatch names, and reaching a file the contract does not name is what a closed list exists to prevent. Neither `FORMATS.md §8`, nor `scripts/review-package.mjs`, nor either agent's *Inputs* is in 0122's *Applied in* list: the list was short by the one hop the mechanism travels.

**Options as they were put.** (a) The package carries the count in its header and the verifier's Inputs name the ledger path. (b) Give the reviewer the ledger path as a fourth dispatch input. (c) A `## Mutation` section carrying both sides, the script counting the diff's declarations too. (d) Drop the reviewer half and keep the verifier's cell.

**Taken (user, option a, as recommended).** `review-package.mjs` reads `tasks/<slug>/ledger.md` — it already computes `taskDir` — and writes one header line: `Mutation: T1 3 tests · T2 0 tests`, in **task** order and not ledger order, the latest row for a task winning because a re-run of the check is the later of two records of one thing. `Mutation: —` where the ledger holds no such row, which is the load-bearing half: a diff that adds three test declarations under a dash is exactly the silence 0122 exists to end, and it is readable by the reviewer with no new grammar. The `--target` variant carries no line at all, as it already carries no plan sections — it owns no task and no ledger. The verifier's Inputs gain **ledger path** on the line that already names the plan path.

(b) is one dispatch argument cheaper and costs the property that makes a review reproducible: `review-input.md` is the whole subject, and a reviewer that reads a second file no longer has one. (c) moves the comparison into a grep, where decision **0100** deliberately keeps `## Callers` to pointers a reviewer judges. (d) keeps 0122's honest floor and gives up the second reader that made its option (a) worth taking.

**Fail-soft, and why it is not silence.** A header cell is never a reason to refuse a review of real code, so an absent ledger renders `—` and an **unreadable** one renders `— (ledger.md unreadable)`. That distinction is decision **0139**'s rule one layer down: a dash alone would read as "this task mutated nothing", which is a different claim from "nobody could read the record". Both branches are tested and both tests are proven by mutation.

**Cost if wrong.** One generated header line and one word in one Inputs list. A `Mutation:` line nobody reads costs one line of package; a wrong `<k>` is contradicted by the diff printed beneath it, which is the mechanism. Reversible by deleting the line, the reader and the two sentences that read it.

**Applied in.** `scripts/review-package.mjs` (`readLedger`, `mutationCounts`, the header) and `scripts/review-package.test.mjs`, test-first; `docs/FORMATS.md §8` (the header line and the `--target` exception); `agents/hodos-verifier.md` (the ledger path in *Inputs*); `agents/hodos-reviewer.md` (the comparison and its severity); `docs/COMPONENTS.md §2.1`, `§2.2` and `§3`. Together with decision **0122**'s own list, in one commit. Stage **12a**.

### 0144 — The digest log is ignored in the pilot only, and the line is the builder's write (2026-09-08, proposal YYY, Stage 12b)

**Context.** Decision **0141** puts `.claude/hodos/.digest-log` into every hodos project from 12b on and calls it engine-internal state with no config surface, while its *Applied in* list names only `scripts/state-digest.mjs` and that script's test. A file written into a project is not covered by the two files that write it: `FORMATS.md:38` enumerates the lines `init` appends to `.gitignore` and `skills/init/SKILL.md` step 6.4 writes exactly that list, and `.digest-log` is in neither. Untracked, it can be committed by the same hand that commits the layer, and a committed log mixes another machine's session starts into the sample that gates 12d's build.

**Options as they were put.** (a) `init` teaches every project to ignore it — one row into `FORMATS.md:38`, one into `SKILL.md` step 6.4. (b) The pilot's own `.gitignore` gets the line and the engine grows nothing until 12d. (c) Leave it visible and explain it in T9's paste. (d) Write the log outside the repository.

**Taken (user, option b, with the write assigned).** The line goes into `ariadne_v2`'s `.gitignore` and no engine format grows a row before 12d, which adds one **once** for whichever file survives — `.digest-state` if the number buys suppression at or above one half, nothing at all if it does not. The developer's change to the option: the line is **written by the builder**, not left to their hand. That makes it a pilot-local commit of its own, made **before** the first `init`, so three changes to one file stay readable apart — this line, `init`'s own documented append at step 6.4, and anything a later part adds — and T9's diff has no third party in it. `12b-report.md` names the commit as the builder's and pilot-local, because a `.gitignore` line inside the criterion's diff that `init` did not write is exactly the kind of thing a fresh reviewer is right to call an unexplained write.

(a) is the same work done earlier against a file that may not exist in a week, and edited twice in the specification every installer reads. (c) trades the sample's integrity for nothing, silently and one commit away. (d) moves the log away from the state it measures, and `.digest-state` has to live in the project anyway.

**Cost if wrong.** A project other than the pilot runs 0.2's `init` between 12b and 12d and carries one untracked file it did not ask for; the fix is the line, which is what (a) would have written. Reversible in one edit either way.

**Applied in.** `ariadne_v2`'s `.gitignore` (pilot-local, its own commit, before the first `init`); `docs/stages/12b-plan.md` §1 and T7; `docs/stages/12b-report.md`; decision **0141**'s *Applied in* list. The engine row, if there is one, is **12d**'s. Stage **12b**.

### 0145 — The log carries the session id, and the statistic reads the first line of each session (2026-09-08, proposal ZZZ, Stage 12b)

**Context.** Decision **0141** fixed the log's line at `<sha256>\t<iso8601>` and defined the statistic as the share of session starts whose digest is byte-identical to that project's previous session's. The bare digest has two callers: the `SessionStart` hook (`hooks/hooks.json:11`) and the `` !`node ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs` `` injection at the top of every kernel (`COMPONENTS.md:38`). Both invoke the script with no arguments, and the injection fires inside a session whose `SessionStart` emitted the same text minutes earlier — the common case across the pilot's twenty tasks. A two-field line cannot tell them apart, so the instrument would inflate its own numerator in the direction of building. Reading stdin is not the way out: the hook's payload carries `session_id` (fact 38), and the same script is a `` !`…` `` injection where stdin belongs to the shell and a blocking read aborts the invocation at turn 0 (fact 14).

**Options as they were put.** (a) A `--log` flag the hook passes, keeping the two-field line. (b) Log every bare emission, two fields. (c) A third field carrying the session id. (d) Infer the session boundary from the text.

**Taken (user, option c, as recommended).** The line is `<sha256>\t<iso8601>\t<session-id>` — `CLAUDE_CODE_SESSION_ID`, set per session in both the injection and a Bash call and unchanged across `--resume` (fact **37**), with fact **39** as its documented fallback. The **primary** statistic is read off the **first** line of each session id in timestamp order, which is that session's `SessionStart` emission whichever caller ran first, and it is exactly what 0141 defined. The lines after it under the same id are within-session re-emissions: reported in `docs/PILOT.md` beside the primary number as a second measurement, because the suppression 12d would build lives in the script **both** callers run, so it is the saving that mechanism actually collects — and 0141 asked only the first question.

Three readings this decision states rather than leaves to the build. **`--full` is not an emission**: `/hodos:status` prints the digest because the developer asked for it in that moment. **`--compact` is not an emission**: `SessionStart(compact)` emits one ledger pointer, not the digest, and comparing it against digest texts in one file would make a compaction read as a changed digest. **A log write never fails a hook**: the text is computed first and an unwritable or unreadable log is silence — no output, no changed exit code — which is the failing-open rule the campaign fetch and the decay row already follow.

(a) is correct and narrower, and pays a documented CLI flag in three places for an instrument 12d deletes or replaces. (b) hands 12d a number biased toward its own build. (d) replaces a verified environment fact with a guess.

**Cost if wrong.** A third field in a per-machine file nothing but its own reader parses. `CLAUDE_CODE_SESSION_ID` is undocumented and under the re-probe rule: if it is gone the field is empty and the log degrades to option (b)'s reading — 0141's number with the bias named in the report, not a broken instrument. Reversible by deleting the file.

**Applied in.** `scripts/state-digest.mjs` and `scripts/state-digest.test.mjs` (test-first, at T7); `docs/stages/12b-plan.md` §2 and T7; `docs/PILOT.md` (both numbers, each with its denominator) at 12c; decision **0141**'s *Applied in* list, whose two-field line this revises — and, amended 2026-09-08 after Stage 12b's review 1, the two other files that stated that line: `docs/BUILD-PLAN.md` Stage 12's acceptance and `docs/stages/12-plan.md` §4's T7. Stage **12b**.

### 0146 — A ledger row may name a file outside the instruction set, on its own approval (2026-09-08, proposal AAAA, Stage 12b)

**Context.** `skills/init/SKILL.md`'s first invariant said init owns six things and *"every other file in the repository stays exactly as it is"*, and `references/migrate.md`'s input list is AI-instruction files only. The pilot's first `init` modified two files outside both: `CONTRIBUTING.md` (−14 lines, `## Spec lifecycle` and `## Audit gate`, both describing commands the same run retired), asked on its own `AskUserQuestion` row with the ownership stated in the question and approved as *Delete both sections*; and `.github/PULL_REQUEST_TEMPLATE.md` (−1 line, the audit-verdict checkbox), which **no ledger row named** — rows 1–20 do not mention it, none of the three approval calls does, and it was found and edited during step 8 and reported afterwards.

**Options as they were put.** (a) The invariant is absolute and such a file is a report line. (b) Widen the list to a file that names an instruction this ledger retires, one approval row each. (c) Status quo.

**Taken (user, option b, as recommended).** A settlement's **consequences** are part of the settlement: retiring `/spec-audit` while `CONTRIBUTING.md` still tells a contributor to run it leaves the repository worse than either state. So `migrate.md`'s input list gains *any tracked file that names an instruction this ledger retires* — found by searching for the retired command, path or marker, not by taste — and every such row is **its own approval, never in the batch**, carrying its `file:line` and what is lost. What M1 did for `CONTRIBUTING.md` is now the documented shape, including the sentence that says the file is not init's.

**The PR template is a defect under every option, and stays one.** No row, no approval, a write. `migrate.md`'s anti-pattern list already forbids *"applying a row whose approval was assumed from a batch"*; this is the case one step further out — a write with no row to assume from. The report records it as T9's failure, and step 8 gains the clause that closes it: a file the ledger did not name at step 4 is not edited at step 8, however obvious the consequence; it is one more row, or it is a report line.

**Cost if wrong.** A run can now propose an edit to any tracked file, and a developer approving quickly approves wider than they read. Three bounds hold it: the row must name the retired instruction it follows from, it is never batched, and "what is lost" is a column.

**Applied in.** `skills/init/SKILL.md` invariant 1 and step 8; `skills/init/references/migrate.md` (the input list, the approval rule, the anti-pattern); `docs/BUILD-PLAN.md` Stage 12's criterion; `docs/stages/12b-plan.md` §2's **superseded note** — cited by its name rather than by a number, which is why the note itself is not numbered; `docs/stages/12b-report.md`'s T9 row. The invariant's **second** route out is decision **0149**'s, taken the same day from the same review. Stage **12b**.

### 0147 — The rule guard is "not about `.claude/`", not "cites `.rs`" (2026-09-08, proposal BBBB, Stage 12b)

**Context.** Decision **0021** guarded the pilot's own failure mode — rules describing the retired workflow instead of the code — with *"every rule `init` writes must cite a `file:line` precedent in `.rs` source"*, carried into `BUILD-PLAN.md` Stage 12 as acceptance. M1 wrote seven rules; five cite `.rs`. The two that do not are right not to: `adr-format.md` governs `docs/adr/**` and cites `docs/adr/_template.md:4` with two ADRs; `commit-scope-coupling.md` governs `cog.toml` and `.github/workflows/ci.yml` and cites `cog.toml:3` and `docs/folder-layout.md:55`. All 23 citations and 18 anchors resolve (`verify-citations.mjs`, exit 0) and no rule cites anything under `.claude/`.

**Options as they were put.** (a) Reword the guard to what it guards. (b) Keep the letter and record two failures on correct rules. (c) Forbid rules outside `.rs`.

**Taken (user, option a, as recommended).** The criterion becomes two mechanical halves: **no precedent resolves under `.claude/`**, and **every rule whose `paths:` name `.rs` files cites at least one `.rs` precedent**. The file-type test was a proxy for the property, and the pilot is the first project where proxy and property differ — a rule about an ADR template or a commit-scope coupling is about the project's code in every sense that matters, and a `.rs` line invented for it would be the fabrication the guard exists to prevent.

**Cost if wrong.** A rule about a non-`.rs` file could describe the retired lifecycle while citing `docs/`. The `.claude/` clause closes the direct route, and every rule's precedents are quoted in the report.

**Applied in.** `docs/BUILD-PLAN.md` Stage 12's acceptance line; decision **0021**'s *Applied in* list; `docs/stages/12b-plan.md` T10; the report's T10 row. Stage **12b**.

### 0148 — A recipe that has not run says so, and `verifiedAt` stops speaking for it (2026-09-08, proposal CCCC, Stage 12b)

**Context.** `references/config.md` requires a command to have **run green in this session** before it reaches `config.json`, and names *"a command recorded unrun"* as an anti-pattern; `SKILL.md`'s Completion repeats it. The pilot met a command that cannot run in a session — `slo_release_gate` is `#[ignore]`d because it clones a multi-GB corpus (`crates/ariadne-e2e/tests/slo.rs:57`) — and it is the only mechanism that would catch the performance regressions the interview's first answer named. The run asked with the anti-pattern named; the developer chose *Record it, flagged unrun*. The flag had nowhere to go: `config.mjs check` passes, and `verifiedAt: 2026-09-08` asserts the recorded commands ran.

**Options as they were put.** (a) A per-recipe marker plus a `check` warning. (b) `verifiedAt` per command. (c) Report only. (d) Refuse to write it.

**Taken (user, option a, as recommended).** A `verify.recipes[]` entry may carry **`"unrun": true`**, and it means: this recipe's command has never been observed green by the layer, so `verifiedAt` does not cover it. `config.mjs check` reports it as a **warning** naming the recipe — a warning and not an error, because the field is the honest record of a developer's decision rather than a mistake. The verify phase's row for such a recipe reads `not verified in this session` rather than resting on the config's claim, so a red row on it is read as *never green here* and not as a regression. `init` writes the field only on the approval that answered this question, and `--refresh` clears it the first time that command runs green.

(b) is the fuller answer and moves a field every reader of the config already reads, for one recipe's honesty. (c) is the state that produced this proposal: the fact lives in a report nothing reads later. (d) makes the developer's answer unavailable on the project where it is the true one.

**Cost if wrong.** A project marks a recipe unrun and forgets, keeping the marker on a command that has long been runnable. The `check` warning is what keeps it visible, and `--refresh` re-runs the recorded commands anyway.

**Applied in.** `docs/FORMATS.md §2` (`verify.recipes[]`); `skills/init/references/config.md`; `scripts/config.mjs` `check` and `scripts/config.test.mjs`, test-first; `skills/run/references/verify-loop.md`; **`skills/init/SKILL.md`** — its invariant, its self-check line, step 7's *done when* and its Completion, all four of which stated the pre-0148 rule and one of which forbade the field outright (added 2026-09-08 after Stage 12b's review 1, which found the kernel a project runs to be the one document still saying no); `ariadne_v2`'s own `config.json`, whose `perf` recipe is what the field was bought for. Stage **12b**.

### 0149 — An instruction typed in the chat is applied, then recorded as a row that quotes it (2026-09-08, proposal DDDD, Stage 12b)

**Context.** Decision **0146** gave `init` one route past its invariant: a file naming an instruction the ledger retires, through its own approved row. Stage 12b's review 1 found a fourth authority in the same run and no document describing it. Five `.claude/skills/*/SKILL.md` (−587 lines) were deleted because the developer asked in a message — *«Удали проектные скиллы, они по сути копируют твоё поведение»* — after `init` had declared them kept in row 1's option text and reported *"Nothing else in the repo moved"*. The outcome is right: their files, their instruction, and the run said what it did. The record is what was missing, and the record is what an acceptance criterion reads.

**Options as they were put.** (a) The instruction becomes a row, is shown, and is applied on the confirmation. (b) Apply immediately, then append the row marked `by your instruction, <quote>`. (c) Name the route in the invariant and leave the fact to the report's prose. (d) Nothing.

**Taken (user, option b, as recommended).** A developer's instruction is authority, not a proposal — asking them to confirm what they just asked for is the loop decision **0133** refused for a decline. So the run acts, and then writes the ledger row it would have written: the instruction **quoted**, the paths, the settlement, what is lost, and the marker `by your instruction`. The row sits **after** the approvals rather than among them, so the ordering is visible: this was done because it was asked for, not because a row was approved. The report carries the same row, which is what makes criterion 6 answerable for those files.

(a) buys a confirmation exchange for a decision already made in plain words. (c) puts the fact in the one place the criterion cannot read. (d) leaves five files with no account anywhere.

**Applied retroactively to this run**, which is the shape option (b) prescribes: `12b-report.md`'s criterion 6 cell now carries the quote, the five paths and the `by your instruction` marker, so the layer's account is complete even though the row was written after the fact by the builder rather than by the run.

**Cost if wrong.** A row appended after the write reads as a rationalisation. The quote is what keeps it honest — it is in the transcript, and a row whose quote does not support its paths is a finding at the next review.

**Applied in.** `skills/init/SKILL.md` invariant 1 (its second route); `skills/init/references/migrate.md`'s new section **`## An instruction the developer types`** — not the settlements list and not the approval section, which carry no text of this decision; `docs/BUILD-PLAN.md` Stage 12's acceptance line, which admits the route as a third one beside 0146's (added after Stage 12b's review 2, whose blocker was this list being short by the sentence the criterion is checked against); decision **0146**'s *Applied in*, which names this decision as the second route beside its own; `docs/stages/12b-report.md`'s criterion 6 cell. Stage **12b**.

### 0150 — The ledger's shape is checked by three numbers the run prints (2026-09-08, proposal EEEE, Stage 12b)

**Context.** `references/migrate.md:9` gives the step-4 ledger six columns plus `Approved` at step 5; `COMPONENTS.md:126` names "evidence, what is lost, approval flag"; `DESIGN.md:367` says "each with evidence". The pilot's Table 4 printed five columns — no `Evidence`, no `Approved` anywhere in the run — rows 16–18 carried no count, and three rows were file-level verdicts, `migrate.md:51`'s own first anti-pattern: row 19 bundled five instructions, row 15 three ranges, row 2 five invariants. The settlements themselves were argued and approved; what failed is that a table's shape is prose, and prose is the first thing a long run compresses. Every comparable contract in the engine has a check behind it — `lint.mjs` for caps and frontmatter, `config.mjs check` for the config, `verify-citations.mjs` for precedents. The ledger had none.

**Options as they were put.** (a) A step-4 completion check the run must state, as three printed numbers. (b) A script parsing the table. (c) Narrow the contract to what a run needs. (d) Nothing; the backlog line stands.

**Taken (user, option a, as recommended).** `migrate.md`'s Completion gains the check, and the run **prints three numbers before the approval**: rows, distinct `file:line` the rows name, and rows whose Evidence carries no count. All six columns present, one row per `file:line`, a count in every row's Evidence. The numbers are what turn a shape a reader has to remember into an assertion a reviewer can check with one grep against the transcript — and the third number is the one this pilot would have failed loudly rather than quietly.

(b) invents a file to check a table that lives in a session. (c) trades evidence-beside-a-claim for the convenience of the run that skipped it, and `migrate.md:13` defines Evidence as exactly those counts. (d) is the state review 1 filed as a blocker.

**Cost if wrong.** Three numbers printed before every approval and read by nobody, with a run that prints them and bundles a row anyway. The reviewer's check is what catches that, and the numbers make it one grep rather than a re-reading of twenty rows.

**Applied in.** `skills/init/references/migrate.md` (the ledger section and its Completion); `docs/stages/12b-report.md`'s account of the run. Stage **12b**.

### 0151 — A source candidate rejected at any of the three questions answers decision 0059's row (2026-09-08, Stage 12b, review 1's third blocker)

**Context.** Decision **0059** moved the Rust rule row to Stage 12 and asked for two things: a rule originating from `sources/rust.md` carrying its URL, and *"at least one source candidate rejected by question 2 with the reason shown"*. The first is met — `adapter-type-boundary.md:38` cites the api-guidelines checklist, fetched at step 2. The second is not, and review 1 confirmed it independently: the run rejected a **source** candidate at **question 3** with evidence (`clippy::exhaustive-enums` — *"it fires on every exported enum, incl. `DeclKind`, matched exhaustively at `cli/src/commands/index.rs:623`"*) and rejected **code** candidates at question 2 (the `lib.rs` façade candidate: *"11/11 already carry an in-file comment stating it — the comment is the trigger, a rule adds nothing"*). The one combination the sentence names did not occur.

**Options as they were put.** (a) Reword to a source candidate rejected at any of the three questions, with the reason shown. (b) Carry the criterion to 12c as a FAIL. (c) Re-run `init --refresh` to obtain the missing combination.

**Taken (user, option a, as recommended).** What decision 0059 bought is that `sources/rust.md` **works** on a real project and that a source-derived candidate goes through the three-question filter with its evidence — the filter demonstrably carried one through to a written rule and threw one out with a citation. Which of the three questions does the throwing is a property of the candidate, not of the mechanism: question 2 is answered by an observation about the model, question 3 by a mechanical check that already exists, and a lint the project's own CI would fire on every enum is question 3's answer by construction. The criterion becomes: **at least one source candidate rejected at any of the three questions, with the reason shown**.

(b) would tick 12b with an open row and hand 12c a criterion its own work cannot meet — 12c runs tasks, not `init`, so a second step 2 happens there only through a `--refresh`. (c) buys an interactive session at `$8–15` to produce a rejection for a checkbox, which is a measurement made for the criterion rather than for the project, and `CLAUDE.md`'s standing rule against fitting a fix to a failing case applies to criteria too.

**Cost if wrong.** The row stops proving that question 2 in particular can reject a source candidate — the case where a source recommends what the model does unprompted. That case is what the *defaults list* exists for (`DESIGN.md §7.2`), and the reviewer bench already measures it; the pilot was never the only witness.

**Applied in.** `docs/BUILD-PLAN.md` Stage 12's acceptance line; decision **0059**'s *Applied in* list; `docs/stages/12b-report.md`'s criterion 9 row; `docs/stages/12b-plan.md`'s T11 and `docs/stages/12-plan.md §4`'s T11, both of which stated the retired clause (added after Stage 12b's review 2, which found the reword one line short of where the stage reads its own task). Stage **12b**.

### 0152 — The batch is `retain` and `relocate` and nothing else, and the kernel says so too (2026-09-08, Stage 12b, review 2's major)

**Context.** Review 1's minor m7 found `migrate.md`'s "never in the batch" bounding nothing: the same file said flatly that rows are approved one at a time, so there was no batch for a row to be outside of. The fix defined one — `retain` and `relocate` rows whose target is a rule in the same report — and review 2 found that this did not only define a batch, it **created** a permission the kernel contradicts twice: `skills/init/SKILL.md`'s invariant, *"Existing instructions are settled one row at a time in the ledger. Nothing is deleted, moved, or rewritten without its own approval"*, and its Completion, *"every write was approved one row at a time"*. A `relocate` moves an instruction, so the two documents answered the same row differently — and the kernel is the document that survives compaction.

The pilot is the measurement behind the question. Its ledger had twenty rows; the run offered a nineteen-row batch with *Walk every row* beside it, and the developer chose **Approve all**. Eleven of those nineteen were `delete`, `rewrite` or `automate`.

**Options as they were put.** (a) Keep the batch as defined and make the kernel carry it. (b) Narrow back to one row at a time and record the pilot's batch as the violation it then is. (c) A wider batch — everything but `delete`.

**Taken (user, option a, as recommended).** The batch is **`retain` and `relocate` into a rule in the same report**, named row by row in the option's own text, and every `delete`, `rewrite`, `automate` and every row reaching a file outside the instruction set is its own approval. `SKILL.md`'s invariant, its step-5 *done when* and its Completion carry the same sentence, so the kernel and the reference answer one row identically.

The reason is the shape a real project has: a `CLAUDE.md` of forty statements is forty rows, and forty approvals is an interview nobody finishes — which is how a pass that exists to remove duplication ends up abandoned with the duplication in place. What earns the batch is that neither settlement changes a statement or deletes a file: a `retain` moves nothing, and a `relocate` puts the same statement in the home the developer just approved a rule for. (b) is the conservative reading and would have refused the pilot's own approval outright. (c) is closest to what the run did and puts a `rewrite` — which changes what a statement says — and an `automate` — which installs a hook — inside a single click.

**What this does not excuse.** The pilot's batch was wider than this decision permits: six `delete`, two `rewrite` and three `automate` rows were inside it. That is recorded in `12b-report.md`'s criterion 5 as the run's own deviation from the rule this stage wrote, in the same way criterion 6's (ii) records the step-8 clause landing after the run it would refuse.

**Cost if wrong.** A developer approves a nineteen-row `retain`/`relocate` batch without reading it and a statement they wanted keeps its old home — recoverable, because a `relocate` writes the replacement before the retirement and every row is in the report. The expensive settlements are the ones that stayed one-at-a-time.

**Applied in.** `skills/init/SKILL.md` invariant 1, step 5's *done when* and Completion; `skills/init/references/migrate.md`'s approval section; `docs/stages/12b-report.md`'s criterion 5 cell. Stage **12b**.

### 0153 — Stage 12c runs as three parts, and the review lands where it can still change a run (2026-09-09, proposal FFFF, Stage 12c Start)

**Context.** Decision **0140** split Stage 12 into four parts and left 12c's own eight tasks as one part: the task list, the crate extraction, twenty interactive runs, the tests-per-task count, the digest share, the hold-out measurement, Stage 9b's live node, and the findings pass. The Start priced it against the only measured precedent for a session on this workspace — `scripts/usage.mjs` on 12b's `init` session, 14.18M cache-read and 107k output tokens, about $30–35 — and read the part as ten to twenty sessions, $280–590, plus twenty interactive sessions of the developer's own working time. `STAGE-PROTOCOL.md §6` already lets a part run across sessions with its plan file as the ledger, so the question was never whether the work fits one session. It is how many verdicts the spend gets.

**Options as they were put.** (a) Three parts — 12c-1 the setup and the pair, 12c-2 the twenty runs, 12c-3 the measurements and `PILOT.md`. (b) Two parts — setup plus the `quick` arm, then the `standard` arm plus every measurement. (c) One part, the plan file as the ledger, one report, two reviews.

**Taken (user, option a, as recommended).** The parts are `12c1`–`12c3` in file and tag names and `12c-1` in prose, as 11b's and 11d's parts are, and each tags its own base and writes its own plan, report and fresh review. `stage-12c-base` stays the whole part's base; `stage-12c1-base` was already on the same commit when this decision was taken.

The argument is where a verdict can still change what happens next. A wrong comparability rule or a wrong crate is cheap to repair at the end of 12c-1 and worthless to discover after the runs; the runs' own failure mode — a session whose id nobody recorded, an arm carrying a plugin the other did not — is invisible in a report and visible in a transcript, which is what a fresh reviewer re-reads; and the measurements are where thresholds get read against numbers, which is the part most in need of a sceptical reader. (b) puts the ten cheapest runs behind the boundary least in need of one. (c) buys a single verdict on $280–590 already spent, which is the shape decisions **0089** and **0105** refused for 11b and 11d over smaller spans.

**Bought with it, and not a separate decision:** the `quick` arm is run first, all ten of it, and the `standard` arm is bought on that number. It changes no threshold and no denominator — T-1 stays 5 + 5 per arm — so it is sequencing, recorded in `12c2-plan.md` and in `PILOT.md`'s own account of the order.

**Cost if wrong.** Three Starts, three reports and three reviews — about $60–120 and three builder sessions of overhead. Nothing in the engine changes with the split, and the numbering resolves the way every other part's does.

**Applied in.** `docs/BUILD-PLAN.md`'s Progress line for Stage 12c and Stage 12's *four parts* paragraph; `docs/stages/12c-plan.md` re-filed as `12c1-plan.md` with the runs and the measurements carried into `12c2-plan.md` and `12c3-plan.md` at their own Starts; the tags `stage-12c1-base`–`stage-12c3-base`. Stage **12c**.

### 0154 — The hold-out set gets a directory of its own, and no threshold (2026-09-09, proposal GGGG, Stage 12c Start)

**Context.** `BUILD-PLAN.md`'s Stage 12 row asks for a hold-out measurement of the reviewer built from three sources its prompt's author never seeded — the pilot's own findings, the logic-lens 36-case subset (`docs/BACKLOG.md:10`), and at least one *plausible but correct* package — and `docs/BENCH.md` names it twice as where a denominator worth thresholding eventually comes from. No document said where it lives. `bench/review/` is a **seeded gate** by its own README's account, and its four thresholds are applied by a scorer to whatever set it is pointed at, so adding hold-out patches to `bench/review/seeded/` would move four gates with no decision behind them — decision **0117**'s objection to a third class entering their denominator, made again by a directory.

**Options as they were put.** (a) `bench/holdout/` of its own, with its own patch directory, answer key and `runs/`, scored by the review bench's scorer with the gates off. (b) A second key inside `bench/review/`, selected by a scorer flag. (c) No directory — one-off runs recorded in `PILOT.md` with their patches attached. (d) Defer to 0.3.

**Taken (user, option a, as recommended).** The set is a **measurement** and stays one in this stage: `bench/report.mjs` refuses a gate built without a threshold and a measurement built with one, and that refusal is the check the criterion is read on. The two answer keys are checked separately, so a case cannot be promoted from measurement to gate by a forgotten flag — which is exactly what (b) makes invisible by putting both sets in one directory. (c) forfeits re-runnability, the property decision **0027** separated the scoring half to get: a number that cannot be re-taken against a changed reviewer is testimony. (d) leaves `BENCH.md`'s own sentence unanswered at the release.

What the set is for, said in the negative: it does not raise the review bench's recall, and a hold-out miss is not a stage failure. It is the first number in this project about a defect nobody on the authoring side chose, and its use at 0.3 is to say whether a threshold can be argued at all.

**Cost if wrong.** One more directory and one more `--check-key` in `npm test`. If the set never grows past its first dozen cases, the overhead is a `README.md`; if it does, the argument for a threshold will need the set to have been kept apart from the gate from the beginning.

**Applied in.** `bench/holdout/` with its key, its `README.md` and its `runs/`; `docs/BENCH.md` (a section beside the review bench, and the two sentences that defer to this stage); `docs/COMPONENTS.md §7`; `docs/PILOT.md`; `package.json`'s `test` script for the self-consistency check. Stage **12c**, part **12c-3**.

### 0155 — The pilot's second `quick` family is selected by a script over the tree, and rule visibility is the treatment (2026-09-10, proposal HHHH, Stage 12c-1, review 2's N2)

**Context.** Stage 12c-1's first task list drew ten `quick` tasks from one family; measurement cut it to five, and the developer chose to fill the arm with a second family — assertion messages in the project's Rust tests. Review 2 found the provenance wrong: the family was read out of the migration section of `.claude/rules/assert-message.md`, a rule hodos's own `init` wrote, while `BUILD-PLAN.md` Stage 12 and `12c1-plan.md` T13 both require the twenty tasks to be *"drawn from the Rust code (not from `.claude/`)"*, and decision **0021** gives the reason — a pilot whose tasks are workflow work does not measure what T-1 measures. It also named a second half: `.claude/rules/` reaches the hodos arm and not the bare one, so on those tasks one arm is handed the rule's instruction and its precedents.

**Options as they were put.** (a) Keep the family, but select it with an instrument over the tree rather than out of the rule, and disclose rule visibility for what it is. (b) Replace it with other `.rs`-sourced work — measured as thin: three tools lack a dedicated test file and two of those are already `standard` tasks, the code carries one `TODO`, and `cargo clippy -D warnings` is clean, so the five pairs would have to be named by the developer one at a time. (c) `quick` becomes the cap family alone, two pairs, and the 1.3× threshold is read at n=2 per arm against `DESIGN.md §11`.

**Taken (user, option a, as recommended).** The instrument is `bench/scripts/assert-audit.mjs`, written test-first at this part: one stated definition — `assert!`, `assert_eq!`, `assert_ne!` reached as a whole macro name, bare when the argument list carries no message, arguments split at top-level commas only, comments, strings and char literals skipped by one shared reader — **nineteen** tests and **twenty** mutants killed. Two mutants survive and both are argued equivalent rather than fitted with a test, and two guards that proved unreachable were **deleted** rather than propped up; `docs/stages/12c1-report.md` criterion 11 carries the arguments. It reports **390 bare of 1165 calls in 139 files** on the pilot, and the **six** task files — three pairs, two arms — are the rows it ranks, excluding every file another task of the twenty already touches. The numbers in this paragraph are the third set it carried: two fix passes found real defects in the reader (raw strings, then char literals, nested block comments, commas inside comments and the turbofish comma), and neither the bare count nor any of the six rows moved under any of them.

**The two halves, separated.** *Selection* must be independent of hodos, and now is: a script over `crates/**/tests` names the files, and the same script would name them in a repository that had never seen the engine. *Rule visibility* is *not* contamination and must not be designed out: a hodos project has rules and a bare session does not, so on any task whose files a rule's `paths:` cover, the hodos arm receives that rule — which is part of what the multiplier is measuring, not an error in it. `docs/PILOT.md §2` states it in the disclosure list beside the shares, so a reader sees which arm reads what.

**Cost if wrong.** The `quick` number is an average over two shapes of work — a bound with its test, and messages in one test file — and a reader who wants either alone has to take it from the per-task table. Recorded in `PILOT.md §6`. If the family turns out to measure the second shape only, the cap pairs are still there per task and the number can be re-read from them at n=2 without re-running anything.

**Applied in.** `bench/scripts/assert-audit.mjs` and its tests; `docs/COMPONENTS.md §7`'s bullet with the instrument's label and `docs/BENCH.md`'s section with the command; `docs/PILOT.md §2` items 2 and 8 — item 8 carrying the rule-reach table derived from all seven `paths:` blocks — `§3`, `§6`; `docs/stages/12c1-plan.md` T13's deviation row; `docs/stages/12c1-report.md`. Stage **12c-1**.


### 0156 — Both arms of the pilot stop at the same objective bar, and the bar is the project's own two commands (2026-09-10, proposal LLLL, Stage 12c-2 Start)

**Context.** `docs/PILOT.md §2` fixes eight things about the two arms before the first run — the alternation, the shares and their direction, the session ids, the enabled plugin set, the path labels, the three costs outside the multiplier, what the thresholds are, and which rules reach which arm. It never says when one task is **finished**. The hodos arm has an answer by construction: `run`'s completion is `Finish: report delivered`, which sits behind a review `ACCEPT`, a verify `PASS` and a green `config.commands.test` at every task's own red loop. The bare arm has none — a plain `claude` session ends when the developer stops typing. T-1 divides one by the other, so with the stop unstated the multiplier is a ratio between a finished task and a task of unknown completeness, in whichever direction the developer's patience ran that afternoon.

**Options as they were put.** (a) The same objective bar in both arms: `cargo nextest run --workspace` green, `cargo clippy --workspace --all-targets --all-features -- -D warnings` green, the commit accepted by the project's own `commit-msg` hook, and the developer's acceptance of the change — with the hodos arm's review, verify and mutation phases counted **inside its cost** rather than imposed on the bare arm as a second bar. (b) (a) plus a wall-clock cap per task, after which a task is recorded unfinished with its cost. (c) Nothing written: the developer's acceptance is the whole stop.

**Taken (user, option a, as recommended).** The bar is the project's own quality layer, already named in `PILOT.md §1` and already `config.commands.test` and `config.commands.lint` in the pilot's config, so neither arm meets a standard invented for the measurement. (b) buys a censoring rule the multiplier would then have to state and read — a number with a survival analysis behind it, over ten tasks. (c) is the status quo and is what makes the two numbers incomparable; it also puts the fresh reviewer in the position of being unable to tell whether the arms stopped at the same place, which `STAGE-PROTOCOL.md §4` scores as a finding.

**Which arm the bar binds, and which way that moves the number.** It binds the **bare** arm: the hodos arm's own phases already require the same commands green, so the bar adds nothing to it, while a bare session that would have stopped at "looks right" now runs the workspace suite and clippy to green. That raises the bare cost, which is the denominator, and **lowers** the multiplier — the direction that flatters hodos, and the opposite of the direction `PILOT.md §2` item 2 arranges for the shares. It is taken anyway because the alternative is not a conservative measurement but an incomparable one, and it is disclosed in `PILOT.md §6` beside the other four things the pilot does not measure. What the bar does **not** equalise is quality past the two commands: the bare arm ships no review, no verify and no mutation check, which is `§6`'s existing sentence and decision **0045**'s whole reason for reporting the second number beside the first.

**Cost if wrong.** If a bare task turns out to need hours of clippy work that the hodos arm's own loop would have absorbed cheaply, the bare cost carries it and the multiplier reads low — and the per-task table is what a reader corrects it from, because every run's cost is published per task rather than only as an average. If the bar instead proves unreachable on some task, that task is recorded unfinished with its cost and its reason, which is (b)'s censoring applied once by name rather than as a standing rule.

**Applied in.** `docs/PILOT.md §2` (item 9) and `§6` (the direction disclosure); `docs/stages/12c2-plan.md` §3 and T21; `docs/stages/12c2-manual.md`, where the bar is what each run's last step checks. Stage **12c-2**.

### 0157 — A cross-arm leak voids a run only when it moves the multiplier toward hodos (2026-09-12, proposal MMMM, Stage 12c-2)

**Context.** `docs/stages/12c2-manual.md` lists four things that void a run, the fourth being "the bare half told anything that came out of the hodos half's plan, review or verify". `PILOT.md §2` item 2 arranges the same flow deliberately: every unavoidable share is ordered so **hodos pays first**, because a cost the bare task inherits raises the denominator and *lowers* nothing — it raises the multiplier against hodos, which is the conservative direction. M1's own *Why this half runs first* states it outright. The two sentences describe the same event and disagree about what to do with it.

Pair 1's bare session made the disagreement concrete. At tool call 17 of 89 — before its first edit, at call 41 — it ran `sed -n '1,120p' .claude/hodos/tasks/api-surface-diff-caps/plan.md` (*Read precedent task plan*), and at call 52 read `.claude/hodos/config.json` (*Read hodos verify recipes*). The engine did not fire: `.claude/hodos/.digest-log` is unchanged at 14 lines, and the bare slug's directory holds no `brief.md`, `research.md`, `ledger.md` or `state.json` — against six entries in the hodos half's. It does hold a `plan.md`, which the bare session wrote itself twenty calls after its first edit to give its own citations a target; decision **0159** measures that and keeps the run. It was led there by the trunk, not by the developer — the hodos half merged four `[src: .claude/hodos/tasks/api-surface-diff-caps/plan.md …]` citations into shared code, the first of them on `crates/ariadne-graph/src/economy.rs:421`, the exact function the bare task had to extend. `.claude/hodos/tasks/` is gitignored, so it survives every checkout and no choice of branch point would have hidden it.

**Options as they were put.** (a) Record it as an inherited share under §2 item 2 and narrow the void clause: a leak voids a run when it moves the multiplier **toward** hodos, and a leak in the conservative direction is recorded in the pair's row with its direction named. (b) Void pair 1's bare half and re-run it with `.claude/hodos/tasks/` moved aside. (c) Void and re-run in a second clone carrying no `.claude/hodos/` at all.

**Taken (user, option a, as recommended).** The pilot's own conservatism rule already decides the case. Reading a sibling task's plan makes the bare arm cheaper, which shrinks the denominator and raises the multiplier against hodos; item 2 says a share in that direction is reported with its direction named rather than removed. (b) and (c) both spend a second bare session to buy a **larger** denominator — that is, a number more favourable to the thing being measured — which is the one direction this protocol refuses everywhere else; and neither removes the cause, since the four citations stay in the trunk and the fencing would have to be repeated by hand for nine more runs. (c) additionally puts the two arms in different environments, which `§2` item 4 exists to prevent.

**What it costs, named rather than argued away.** Pair 1's bare arm is *bare, holding a sibling task's plan*, not *bare*. Its multiplier is therefore an upper bound rather than an estimate, and pair 1's row says so. The second number is untouched: the bare arm produces no `review.md` and no `verify.md` under either reading. All four token readings of pair 1 agree and none is near the boundary — unweighted sum **2.21×**, output alone **2.29×**, cache reads alone **2.21×**, published price ratios as weights **2.24×** — so the leak does not decide the verdict against `standard`'s ≤2× hypothesis either way.

**Cost if wrong.** If pairs 2–5 come in materially lower, pair 1 is the outlier a reader has to explain, and the reason is already in its row. The narrowed clause still voids what it was written for: a leak that would make hodos look cheaper — the hodos arm handed something the bare arm produced, or the arms run out of order — remains a void with both attempts' costs reported.

**Applied in.** `docs/stages/12c2-manual.md` (the void list), `docs/PILOT.md §2` item 2 and `§6`, `docs/stages/12c2-plan.md` §9. The mechanism behind the leak — citations into a gitignored directory — is proposal **NNNN**, open for Stage **12d**. Stage **12c-2**.

### 0158 — The pilot reports a third number: the shape of what each arm shipped (2026-09-13, proposal OOOO, Stage 12c-2, measured at 12c-3)

**Context.** `README.md:12-18` claims *Frugal* as context discipline — three skill descriptions in the model's listing, the diff never in the orchestrator's context, one reviewer, model tiering — and nowhere as *cheaper than a bare session*. `DESIGN.md:18` turns the same word into "a measured acceptance criterion (§11)", and §11 makes that criterion a **ratio against bare Claude**. The acceptance criterion is named after a claim the tool does not make.

Of the four other claims, three have instruments and none of them looks at the code that shipped. The router bench scores routing. The review bench scores the reviewer, and `BUILD-PLAN.md`'s Stage 6 entry records that it is *seeded* — its defects and the reviewer prompt were written in the same stage by the same session, so "its recall number proves the loop runs, not that the reviewer generalises"; T17's hold-out is the repair for that and has not run. T-1's second number counts what hodos caught **in its own work**, which `PILOT.md §6` already discloses as leaving the bare arm's quality unmeasured. Whether the abstraction landed in the right layer, whether the change widened the public contract more than it had to, whether coupling or complexity moved, whether the same logic now exists twice — the pilot's only instrument for those is the developer's acceptance, one unrecorded judgement per task.

**Options as they were put.** (a) A third number, the shape of what each arm shipped: per run, the deltas the pilot project's own tools give — fitness violations introduced, public surface added, complexity and coupling movement, duplication and dead code — reported beside the cost ratio and the findings count, and the multiplier demoted from *acceptance criterion* to *reported price*. (b) (a) plus a **blind comparative review**: the two diffs of a pair stripped of branch names and commit messages, ranked by a fresh reviewer against a written rubric. (c) The blind comparative review alone, no structural deltas. (d) Nothing: T-1 stays two numbers and the quality claim rests on a seeded bench and on T17.

**Taken (user, option a, as recommended).** It costs no model call, it is objective, and it measures the property the machinery exists to protect rather than the one number the tool never claimed. It also uses the pilot project for what makes it a good pilot: `ariadne_v2` **is** an architecture-analysis tool, so its own CLI reports every reading over any ref without an agent in the loop. (b) puts hodos's own reviewer in the position of scoring work produced without hodos — judge and party — and adds a soft number beside hard ones; it is worth buying **after** (a) reports, and only if the structural deltas come in flat, because flat deltas are then the argument for it. (c) puts the whole quality claim on one model's judgement, which is the thing the seeded review bench is already criticised for.

**What it measures, exactly.** Per run, at the arm's branch base and at its merged tip, all from the project's own CLI: `ariadne fitness check` — forbidden-dependency violations and cycles, with `ok` and the violation count; `ariadne api-diff <base>..<tip>` — the public surface the range added, removed and changed with its SemVer classification, which takes a ref range and so needs no checkout; and `ariadne query` over `complexity`, `coupling_report`, `weak_spots` (cycles ∪ god-modules ∪ dead-code top-N) and `refactor_suggestions`, each read against an index built at that point. Reported as a delta per run and beside its pair, never summed across pairs, and with the base's absolute values printed beside every delta so that a zero is distinguishable from a measurement that did not run.

**The multiplier is demoted with it.** From *acceptance criterion* to *reported price*, read against the two hypotheses — which is what `PILOT.md §2` item 7 already treats it as: a miss is reported with its numbers and corrects the threshold at 12d, it does not fail the stage. The sentences that still call it a criterion are `DESIGN.md:18` (the *Frugal* row), `§11`'s measured-frugality paragraph and `§13`'s number line. They are revised at Stage **12d**, with the pilot's numbers in hand rather than before them, and `BUILD-PLAN.md`'s 12d entry carries that revision.

**What it does not fix.** The two arms of a pair do **different tasks** — pair 1 capped `api_surface_diff` in the hodos arm and `fitness_report` in the bare one — so a structural delta compares the shape of one task's answer with the shape of another's, and it rests on the pairing's claim of comparable size exactly as the cost ratio already does. Nor does it reach quality that leaves no structural trace: naming, test strength past the mutation count, and whether a cap's default is the right number are all invisible to it.

**Cost if wrong.** On tasks this size — a cap on a wire list, or messages added to a test file's assertions — the architecture may not move at all and every delta reads zero on both arms. That result is worth having: it says the pilot's task selection cannot separate the arms on shape, which is a finding about `PILOT.md §3`'s selection and the argument for buying (b), not a wasted measurement. The six assertion-message tasks are the clear case — one test file, no new module, no widened type — and they are expected to read zero before they run, which is written here rather than after the numbers arrive.

**Applied in.** `docs/PILOT.md §2` (item 7's demotion and a new item 10 defining the instrument), `§6` (the bare-arm quality bullet) and `§7` (the number's place in the list); `docs/stages/12c2-plan.md §6` (carried to 12c-3); `docs/BUILD-PLAN.md` (the 12c-3 and 12d entries). `DESIGN.md:18`, `§11` and `§13` are revised at Stage **12d**. *Applied at 12d-2, with decision **0182**:* `DESIGN.md:18`, `§11`'s measured-price paragraph and `§13`'s line and reading table, `README.md`'s *What it costs*, and `skills/status/SKILL.md §8`'s multiplier sentence. Stage **12c-2**, measured at **12c-3**.

### 0159 — A leak is voided by direction **and** measured magnitude, and pair 1's bare half stands (2026-09-13, proposal PPPP, Stage 12c-2)

**Context.** Writing decision **0158** required reading 0157's evidence again, and half of one sentence in it is wrong by omission. 0157 offers "no *engine-written* task directory exists for the bare slug" as proof that the engine never fired in pair 1's bare session. The engine indeed never fired — `.claude/hodos/.digest-log` is unchanged and the directory holds no `brief.md`, `research.md`, `ledger.md` or `state.json`, against six entries in the hodos half's own — but `.claude/hodos/tasks/cap-fitness-report/plan.md` exists all the same, 123 lines, and the **bare session wrote it**: transcript `ccafe198`, tool call **58 of 92**, `mkdir -p` then `cat > … <<'EOF'`, described by the session as *"Write task plan referenced by citations"*, carrying the engine's header line (`Path: standard · Type: feature · Branch: feat/cap-fitness-report · Campaign: — · Base: 046be62`) and the engine's section order.

It is a **back-fill**, and the order proves it: the first code edit is call **38**, twenty calls earlier. The session had taken the `[src:]` convention out of the plan it read at call 17, written **six** such citations into tracked source — `crates/ariadne-cli/src/commands/fitness.rs:30`, `crates/ariadne-cli/tests/fitness.rs:9`, `crates/ariadne-graph/src/economy.rs:454`, `crates/ariadne-mcp/src/tools/fitness_report.rs:23`, `crates/ariadne-mcp/src/types.rs:1397`, `crates/ariadne-mcp/tests/tools_fitness_report.rs:10`, naming D1, D2, D3, D5 and T1 — and then manufactured a document containing those ids. At call **89** it ran `git check-ignore -v` on the file it had just written.

**The problem this creates for 0157's own clause.** That clause voids a run when the leak moves the multiplier **toward** hodos. Writing a plan the bare arm would not otherwise write raises the bare cost, which is the denominator, and lowers hodos ÷ bare — toward hodos. Read literally, 0157 voids the very run it was written to keep.

**Options as they were put.** (a) Record it and keep the run: a second leak in the opposite direction with its magnitude published as a bound, 0157's evidence sentence corrected, the six citations and their fabricated target added to proposal **NNNN**'s evidence as a new class, and the case stated in pair 1's row and in `PILOT.md §6`. (b) Void pair 1's bare half and re-run it with `.claude/hodos/` moved aside — about 13.3M tokens and 25 minutes of the developer's time. (c) Keep the run and subtract the plan write's tokens from the bare cost.

**Taken (user, option a, as recommended).** The magnitude is measured, not argued: the assistant message carrying call 58 cost **3 454 output tokens** — and it also carried an unrelated `CLAUDE.md` edit, so that is an upper bound on the plan alone — against the session's **118 885** output tokens and pair 1's bare total of **13.3M** across all four counts. Removing it entirely moves the pair's published ratio from **2.2105×** to **2.2111×**: 0.026 %, four decimal places below the two the ratios are published to. (b) spends a full session to buy a change smaller than the rounding, and buys it for one arm of one pair, which would make pair 1 the only pair measured under a different protocol while leaving the cause — six citations in the trunk — in place for the six runs that remain. (c) publishes a denominator no instrument read, and adjusts it by less than the rounding it is published with.

**The rule 0157 needed and did not have.** A leak voids a run when it moves the multiplier toward hodos **and** its measured magnitude moves the pair's ratio at the precision the ratio is published to — two decimals. Below that it is recorded with its bound and the run stands. The direction test alone cannot separate a session that adopts the other arm's method from a session that spends three thousand tokens tidying up after itself, and every unavoidable share in this pilot is small enough that the second question is the one that decides. Where the magnitude cannot be measured at all — the call-17 *read*, whose saving no transcript prices — the run is recorded as an upper bound on how cheap bare is, which is what `§6` already says.

**What it does not excuse.** The bare arm's shipped code carries six citation anchors taken from hodos's convention, pointing into a gitignored directory, at a file that exists only in the developer's checkout. Decision **0158**'s third number cannot see them — fitness, `api-diff`, complexity, coupling and dead code are blind to a doc comment — so they are named in pair 1's row instead. And they are proposal **NNNN**'s evidence in a class the proposal did not have: the engine's citation convention reproduced by a session with no engine loaded, pointing at a file that session fabricated to satisfy it. NNNN's count is **eleven**, not four: four from pair 1's hodos half, one from pair 2's, six here.

**Cost if wrong.** If a later pair shows a bare session copying the method *before* it works — planning like hodos rather than back-filling a citation — that run's contamination is real, the magnitude is no longer at the noise floor, and (b) is the answer for it. Pair 1's row is written in the vocabulary that says why this one is different, so the comparison is available rather than needing to be reconstructed.

**Applied in.** `docs/DECISIONS.md` (decision **0157**'s evidence sentence, and proposal **NNNN**'s count and evidence); `docs/PILOT.md §2` item 2 (the magnitude test beside the direction test) and `§6` (the bare-arm bullet); `docs/stages/12c2-plan.md §9` (pair 1's row). Stage **12c-2**.

### 0160 — The `standard` arm becomes five duplicate pairs: the same task in both arms, judged blind (2026-09-14, the developer's instruction at Stage 12c-2, measured at 12c-3)

**Context.** The ten `quick` runs produced a cost ratio and nothing else about the work. The developer's instruction, in their own words: the spend of a plain Claude session is obviously lower and *"это значит ровное ничего, расход токенов не характеризует качество, а hodos — это не инструмент экономии"*; what the stage must leave behind is data on **how hodos works** — architecture, case coverage, code quality, maturity of reasoning — and whether anything needs repair. Useless overspend matters, and T24's audit answers that part: one candidate, the verify phase on a no-behaviour change.

Quality has no instrument in this pilot, and the reason is structural. `PILOT.md §2` item 1 alternates the arms so that **each task runs in exactly one arm**, which is what keeps the two costs independent — and it means no task in the twenty exists in two versions. A blind comparison of a pair's two diffs would rank two *different* tasks and call the difference quality. Decision **0158**'s structural deltas have the same problem plus a second one: six of the ten tasks are assertion messages, where fitness, `api-diff`, complexity and coupling all read zero on both arms by construction.

**Options as they were put.** (a) The structural deltas alone (0158, already taken) — free, objective, and blind to everything the developer named. (b) A blind comparative review of the ten pairs as they stand — confounded by the arms doing different tasks. (c) **Duplicate pairs**: the same task run in both arms from the same base, the bare arm in a clone with no `.claude/`, then a blind rubric ranking plus the structural deltas, which on one task are finally comparable. (d) Read hodos's own artifacts — plans, rulings, gaps — as evidence of reasoning; but that scores the process, and only one arm has one.

**Taken (developer, option c, for all five remaining pairs).** `PILOT.md §4`'s five `standard` pairs stop being ten different tasks and become **five tasks done twice**. Each pair: the bare arm first in a throwaway clone, then the hodos arm in the pilot, both from the same base commit; the hodos branch merges as real work and the bare branch is discarded once measured. The project gets five of the ten §4 tasks rather than all ten — the price of the measurement, named here rather than discovered later — and every pair yields a like-for-like comparison instead of a second cost ratio between unlike things.

**What the duplicate pairs measure that the ten could not.**
1. **A same-task cost ratio.** Two sessions divided over one task rather than over two tasks argued to be of comparable size. It replaces §11's pairing assumption with an identity.
2. **The structural deltas of decision 0158, made comparable.** Same base, same task, two tips: fitness violations, public surface, complexity, coupling, dead code, duplication — differences now attributable to the arm and not to the task.
3. **A blind rubric ranking**, which is the only instrument for what the developer named. The rubric, fixed here before any duplicate runs: *where the change lives* (layer placement, and whether the public contract widened more than the task required); *case coverage* (which edge cases the change names and handles); *code quality* (duplication, naming, error handling, the shape of the API); *test strength* (whether a test pins behaviour or restates the implementation, and whether it would fail if the logic were wrong); *recorded reasoning* (what a later reader can reconstruct from the diff alone); *scope discipline* (what was done beyond the task). Each criterion is scored on both diffs with a stated reason, and the ranking is per criterion, not one overall verdict.
4. **A control arm that is actually bare.** All three `quick` bare halves read the treatment's rules unprompted — twice `assert-message.md`, twice `commit-scope-coupling.md` — because they are tracked files in a repository hodos initialised. The clone has no `.claude/`, so the duplicate pairs' bare arm cannot do this, and the ten runs' disclosure becomes a measurable difference rather than a caveat.

**How the judge stays a judge.** The two diffs are presented squashed, with no commit messages, no branch names and no file paths that name an arm, labelled A and B with the order randomised per pair; the judge is a fresh general-purpose agent that is not told hodos exists and is not one of the `hodos-*` agents — decision **0158** rejected option (b) partly because hodos's own reviewer scoring work produced without hodos is judge and party, and that objection applies to the judge here too. The rubric above goes to the judge verbatim. The ranking is recorded with its reasons beside the structural deltas, and where the two instruments disagree the disagreement is published rather than resolved.

**Cost if wrong.** If the rubric cannot separate the arms on tasks of this size, that is the finding: hodos's machinery does not change the shipped artifact on an eight-file capped-surface change, and the claim it exists for has to be made about something else — larger changes, or the process record rather than the product. Five pairs is the smallest number on which a flat result reads as a result rather than as noise, which is why the developer took all five rather than two.

**What it costs the project, stated plainly.** Five §4 tasks are not done by anyone: the wrapper-family captures, the C family, `go.scm`/`csharp.scm`, the `search_code`/`list_symbols` cursor, and `doc_for`'s cursor and concise mode. They stay in `PILOT.md §4` as unrun rows rather than being deleted, so a later session can pick them up.

**Applied in.** `docs/PILOT.md §4` (the five pairs rewritten as duplicates, the five unrun rows kept), a new `§8` (the protocol, the rubric and the judge), `§6` (the quality bullet) and `§7` (the numbers list); `docs/stages/12c2-plan.md` (T15e's answer, T25); `docs/BUILD-PLAN.md` (12c-3's entry). Stage **12c-2**, measured at **12c-3**.


### 0161 — The duplicate pairs' control is the project without hodos, not a bare tree (2026-09-14, proposal RRRR, Stage 12c-2)

**Context.** Decision **0160** fixed the duplicate-pair protocol in `PILOT.md §8` on the morning of 2026-09-14, and its item 2 told the developer to **"delete `.claude/` entirely — no rules, no hodos directory, no project hooks, no MCP config"**. The manual block implementing it, `12c2-manual.md` M11, was written later the same day and removes only what `init` wrote: `.claude/rules/`, `.claude/hodos/` and `CLAUDE.md`'s `<!-- hodos:begin -->` block, then re-indexes. Two specifications of one control tree, differing on four tracked things — `.claude/plans/`, `.claude/hooks/`, `.claude/settings.json` and `.mcp.json` — and three of those are the pilot project's own: the developer's planning tree, the hooks `ariadne setup` generates, and the ariadne MCP server, which the **hodos** arm reaches through the same file.

Found before M11 was typed, which is the only time it could be settled: after a run the control tree cannot be changed without re-buying the session, and the control tree is the whole definition of what decision 0160 bought.

**Options as they were put.** (a) The control is **the project without hodos** — remove exactly what `init` wrote, leave everything that predates it; M11 as written and `§8` item 2 repaired. (b) The control is a **bare tree** — `.claude/` and `.mcp.json` both gone; `§8` item 2 as written and M11 rewritten. (c) (a) plus `settings.local.json`, on the grounds that a per-machine permissions file is not part of the project either.

**Taken (developer, option a, as recommended).** The treatment under test is hodos, and nothing else in that tree is hodos. Removing the ariadne MCP server from the control would measure *with ariadne against without ariadne* on top of the thing being measured, and it moves all three of `§8`'s readings — cost, structure and rubric — in hodos's favour for a reason that has nothing to do with hodos; the same argument covers the generated hooks and `.claude/plans/`. What `§8` item 2 was reaching for is the leak the ten runs measured — three of three `quick` bare halves read `.claude/rules/` unprompted and two of three also read `commit-scope.md` — and (a) closes exactly that, because the rules are gone from the tree. (c) is defensible and was declined for its own mirror-image risk: a control that must approve every tool call is slower and costlier for a reason that is not the treatment.

**The control tree, stated once.** `git clone` the pilot outside it, branch from the pair's base, then `git rm -r .claude/rules .claude/hodos`, strip the `CLAUDE.md` block, commit — the strip commit is the branch's base, so it is outside every measured diff — and `ariadne index` so the MCP tools answer. What stays: `.claude/plans/`, `.claude/hooks/`, `.claude/settings.json`, `.mcp.json`, and `CLAUDE.md`'s own ARIADNE block. `.claude/settings.local.json` is **untracked** (`git ls-files .claude` returns `hodos/config.json`, two hooks, 222 plan files, seven rules and `settings.json`), so a clone carries none and the control session starts with no stored approvals — option (c)'s effect arrives by construction rather than by choice, and it is recorded here rather than counted as a decision.

**What this costs, published rather than hidden.** The duplicate pairs' bare arm has **no** `.claude/rules/` at all, where the ten runs' bare halves had the whole rule layer in the tree and read it unprompted in three runs of three. So `§8`'s three readings and `§3`'s ten are not the same control and are not comparable on that axis — which is the point of the duplicate pairs, since they answer a different question. It belongs in each pair's row.

**Cost if wrong.** If something left in the control is in fact hodos's, the bare arm is helped and the ratio reads low — the conservative direction, and checkable because the strip commit's diff names every file removed.

**Applied in.** `docs/PILOT.md §8` item 2 (the sentence repaired to the tree above, with the *not comparable to §3* clause), `docs/stages/12c2-manual.md` M11 (already written this way; the header gains the decision number), `docs/stages/12c2-plan.md` §6 T25 and §7.

### 0162 — In the control tree, what instructs is removed and what the code says is kept (2026-09-14, the developer's answer at Stage 12c-2, before M11)

**Context.** Decision **0161** named three things to remove from the duplicate pairs' control tree — `.claude/rules/`, `.claude/hodos/` and `CLAUDE.md`'s managed block. Building the tree and reading every tracked file for the string showed the enumeration is short: **ten merged tasks have written hodos into the trunk**, and none of it is inside those three.

- `CLAUDE.md:6`, **outside** the managed block: *"Task lifecycle: `/hodos:task` → `/hodos:run`."* Written by `bbf93c3`, the pilot's layer commit, replacing six lines that described the retired `/spec-*` lifecycle.
- `.claude/plans/data-fidelity-arc/block-3-…md:8` and `block-4-…md:8`, frontmatter: `expand_with: /hodos:task …`, the same commit, each replacing `expand_with: /spec-plan …`.
- **Twelve `[src: .claude/hodos/tasks/<slug>/plan.md D<n>]` citations in live source** — `economy.rs` ×4, `plan_assist.rs` ×3, `api_diff.rs`, `fitness.rs`, `tests/api_diff.rs`, `tests/fitness.rs`, `fitness_report.rs`, `types.rs` — written by the ten runs of `§3` and merged, plus `advisory.rs:331`, a test string naming `config.json`, and seven `.gitignore` lines.

So the control cannot be made hodos-free without editing the code both arms work on. That is proposal **NNNN** arriving as a consequence rather than as a prediction: the engine's citations outlive the engine's removal.

**Options as they were put.** (a) **Remove what instructs, keep what the code says** — the `CLAUDE.md` sentence and the two `expand_with:` values; leave the citations and `.gitignore`. (b) Remove only 0161's three, leaving a live instruction naming a command the control does not have. (c) Remove everything including the twelve citations and the `.gitignore` lines.

**Taken (developer, option a, as recommended).** An instruction changes what a session does; a doc comment does not. Cutting the twelve citations would make the two arms' bases differ in `.rs` files, and one base per pair is `PILOT.md §8` item 1 — the property the duplicate pairs exist to have. (b) leaves the control reading a task lifecycle it cannot run.

**How it was done — restored, not invented.** Both `expand_with:` values were put back to the `/spec-plan …` they held before `bbf93c3`, which also makes each file agree with its own line 7 (`status: seed   # seed → expand via /spec-plan into tiers`). `CLAUDE.md:6` kept its **second** sentence — *"`.claude/plans/` is the historical spec record from the retired `/spec-*` lifecycle — read it for why a decision was made, never as a live procedure"* — because it is true with or without hodos; restoring the full pre-hodos paragraph would have handed the control a lifecycle that no longer exists. All of it sits in the strip commit, which is the branch's base and outside every measured diff.

**What stays, and it is published rather than tidied away.** The control's source carries twelve anchors into a directory it does not have. A blind judge reading the bare arm's diff may meet one; `§8`'s rubric row *recorded reasoning* is the row where that shows. It is **NNNN**'s evidence and it is now a property of the measurement, not only of the trunk.

**Cost if wrong.** If a kept citation informs the control, the bare arm is helped and the ratio reads low — the conservative direction, and visible in the strip commit's diff, which names every file it touched.

**Applied in.** `docs/PILOT.md §8` item 2, `docs/stages/12c2-manual.md` M11 (the recipe every later pair repeats), `docs/stages/12c2-plan.md` §7.

### 0163 — Both arms of a duplicate pair run on one model, the session default, unpinned — and D1's bare arm is re-bought (2026-09-22, the developer's answer at Stage 12c-2, before M12)

**Context.** M11, D1's bare arm, ran on 2026-09-13 as session `f4751ba8` on **`claude-opus-5`** at effort `xhigh` — the model every one of `PILOT.md §3`'s ten runs used: all eighteen main sessions, and every subagent dispatched as `opus`, with the `sonnet` dispatches on `claude-sonnet-5` (read from each transcript's `message.model` and from every file under its `subagents/`). On 2026-09-22, before M12, the developer moved the default to Opus 5.5: `~/.claude/settings.json` holds `model: "opus[1m]"`, which now resolves to **`claude-opus-5-5`**, and the pilot's config dispatches review, plan review and verify as `opus`, the same alias. M12 started with defaults would run the treatment on a newer model than its control, and the pair would differ in the one respect decision **0160** built duplicate pairs to hold fixed besides the task — in hodos's favour, by an amount nothing in the pilot can separate from the engine.

**Options as they were put.** First, whether to pin: hold `claude-opus-5` for every remaining run, main session and alias both. **Declined by the developer** — *"Не нужно закреплять, пусть будет 5.5"*. Then, for D1 alone: (a) **re-run M11 on 5.5** in a fresh clone at the same base, keeping the first run as data; (b) keep M11 on Opus 5 and read D1 as a mixed-model pair, apart from D2–D5.

**Taken (developer, no pin, then option a, as recommended).** The remaining runs use whatever the session default is when they start, and nothing is passed to fix it. What is fixed is the **pair**: both arms of a duplicate pair run on one main-session model at one effort, the harvest reads `message.model` from each arm's transcript and from every subagent transcript the hodos arm dispatched, and a pair whose two main models differ is re-run rather than read. M11 is re-bought on that rule, at about its own measured price — 23.5M tokens, roughly thirty minutes.

**How the re-run keeps its base.** The first control's strip commit `0327bd8` is a commit of that clone and of no other, so a second recipe run would produce a different sha for the same tree. The new clone, `ariadne-control-doc-project-budget`, is cloned from the pilot as the first was — so its `origin` refs are the same — and then receives `0327bd8` alone, fetched through a transfer branch deleted straight afterwards; `8becc8a` is not an object in it (`git cat-file -e` fails), and nothing reachable from any of its refs is the first run's work. Indexed from the same `.ariadne/config.toml`, it reads 371 files, 3914 symbols, 12567 edges, revision 2 and no parse failures — the pilot's numbers and the first control's.

**What the first M11 becomes.** Not an arm of D1, and not discarded: the same bare task, from the same base, on the previous model — so D1 carries, at no further cost, a measurement of what the model alone moves on the bare arm. It is recorded in `12c2-plan.md §15` with its full row and read at 12c-3 beside the pair, never inside the pair's ratio. Its branch stays unmerged in the first clone.

**What this costs, published.** The five duplicate pairs run on `claude-opus-5-5` where `§3`'s ten ran on `claude-opus-5`, so the two sets differ on a **second** axis besides decision **0161**'s control tree, and no number from one is read against the other without saying so. Inside a pair nothing moves. The subagents' `opus` alias is whatever it resolves to at the hodos arm's run time and is recorded, not assumed; the bare arm dispatches none.

**Cost if wrong.** If the default moves again between a pair's two arms, the pair is re-run under this rule and both costs are reported — the check is a field read from two transcripts, so it cannot be missed quietly.

**Applied in.** `docs/PILOT.md §8` item 7; `docs/stages/12c2-manual.md` M11 (the re-run in the new clone) and M12; `docs/stages/12c2-plan.md` §6 T25's check, §7 and the new §15. Stage **12c-2**.

### 0164 — Engine time subtracts the developer's answers, not every long gap (2026-09-23, proposal SSSS, Stage 12c-2)

**Context.** `PILOT.md §8` item 6 defined engine time as the session span less every gap over 90 seconds, written at pair 3 to take the developer's latency at the gates out of a span. Harvesting D1 read each gap for what it was waiting on, which the transcript records, and found the rule removing the engine's own waits: in D1's hodos S2 it removed 89.1 of 116.6 minutes, and the developer's two answers in that session took 37 seconds — the rest was `cargo clippy`, `cargo build`, the reviewer's and the verifier's runs and a background task. Re-derived over every run the part had timed, it was wrong in both directions: pair 4's hodos half 39.6 → 76.7 minutes, pair 5's bare half 1.0 → 2.6.

**Options as they were put.** (a) Replace the rule with the classified reading and re-derive every published figure; (b) keep the rule and publish the classified reading beside it; (c) keep the rule alone, applied to both arms.

**Taken (developer, option a, as recommended).** Developer time is every `AskUserQuestion` wait — from the call to its answer — plus the gap before each message a person typed, where a task notification, a subagent's hand-back and a meta line are not a person. Engine time is the span to the last assistant message less that. The fault was readable without any result: a gap that ends in a command's return is not the developer's whichever arm it helps. The rule was also not even-handed — it removed most from the arm that runs subagents and long commands — so (c)'s *applied evenly* did not hold, and (b) would have left a known-wrong number beside the right one.

**What moved.** Every engine time in `12c2-plan.md`: pair 3 hodos 24.2 → 34.9 min and bare 1.8 → 1.7; pair 4 39.6 → 76.7 and 4.4 → 4.3; pair 5 14.9 → 23.7 and 1.0 → 2.6; the first M11 20.8 → 28.4. Pairs 1 and 2, never timed, are timed: 98.4 ÷ 22.9 and 98.8 ÷ 18.8 minutes. The time ratios for pairs 1–5 read 4.3×, 5.3×, 20.5×, 17.8×, 9.1×. No threshold is attached to any of them (`PILOT.md §2` item 7), so no verdict moves.

**The limit that stays.** A permission prompt in a session not in `auto` or `bypassPermissions` mode cannot be told from a slow tool call in the transcript, so it counts as engine time. Every timed session ran in one of those two modes except `8caedc32`, which records no mode; each row names its mode.

**Cost if wrong.** If the classification misses a kind of developer input, engine time reads high for the arm that asks more questions — hodos — which is the conservative direction; the instrument is a script over transcripts already on disk and re-runs at no cost.

**Applied in.** `docs/PILOT.md §8` item 6; `docs/stages/12c2-plan.md` §10 (every row and paragraph stating a time, and pair 3's method paragraph), §11 (the time column and its note), §15 (both D1 rows and the first M11's). Stage **12c-2**.

### 0165 — S0 runs on `go.scm`, and turns the fact path on for Go alone (2026-09-23, proposal TTTT, Stage 12c-2, before D2)

**Context.** `PILOT.md §4` put S0 — the bare session that builds the path from the parser's declarations to `SymbolRecord`'s five v8 parse facts, outside every arm — on `svelte.scm`, the grammar no task touched. Read against the code before the session was written, that grammar declares nothing: `svelte.scm` has no `@def` capture, and its header routes every `<script>` declaration to the injected JavaScript/TypeScript layer (`:3-5`) — D2's grammars. The path S0 exists to build could not be proven on it without reaching into the pair it was meant to stay out of.

**Options as they were put.** (a) Run S0 on `go.scm`; (b) drop S0 and fold the path into D2's task, which a duplicate pair makes fair to both arms; (c) keep `svelte.scm`.

**Taken (developer, option a, as recommended).** S0 runs bare in the pilot on `go.scm`. Go's `function_declaration` and `method_declaration` carry `name`, `parameters`, `result` and `body` (tree-sitter-go 0.25.0, the version `Cargo.lock` pins); its doc comment is the `//` block directly above a declaration; and it nests — `type_declaration` is a statement, so a type declared inside a function body is a declaration with a parent, which gives `parent` a non-empty case to prove. It also carries the edge cases a parameter reader has to decide — several names in one `parameter_declaration` (`a, b int`), an unnamed parameter, a `result` that is itself a parameter list. No remaining task touches the grammar.

**What S0 must leave alone, and why it is written into the task.** A path built on field names reads the same fields in most grammars — Rust, Python and TypeScript all name theirs `parameters` and `return_type` — so a generic S0 would fill D2–D4's facts on its way through and leave those pairs a doc capture each. S0's description therefore turns the path on **for Go alone** and makes the rest checkable: every other language keeps producing empty facts, so the thirteen other fact snapshots may change only by gaining the new fields at their empty values. That keeps the predictions §4 fixed for D2–D4 describing the work their arms will actually do.

**Cost if wrong.** A bare session outside every arm on a grammar nobody asked for; the Go half of §4's unrun S3-bare row is done as a side effect and stays usable. If S0's diff turns out to fill another language's facts, D2–D4's row-1 predictions no longer hold, and that is read off the snapshot diff before D2's base is recorded — not discovered after both of its arms have run.

**Applied in.** `docs/PILOT.md §4` (S0's paragraph); `docs/stages/12c2-manual.md` (the duplicate pairs' S0 line and the M13 block); `docs/stages/12c2-plan.md` §4 (the cost table's S0 cell) and §6 (T26). `docs/stages/12c1-report.md:121` names `svelte.scm` as 12c-1's record of what it carried and is not edited. Stage **12c-2**.

### 0166 — `usage.mjs` reads the subagent transcripts beside a session, and every hodos cost of Stage 12c-2 is re-harvested with them (2026-09-29, the developer's answer at Stage 12c-2, T24)

**Context.** Decision **0045** built the cost telemetry on a platform fact written into its own context: *"a subagent's messages are in the same file with `parent_tool_use_id`, so one session's file already contains its dispatches."* `usage.mjs` sums the session's own file and nothing else, and its test models a dispatch as an `isSidechain: true` line inside that file. T24 re-derived §12's phase table, whose totals added the files under `<session-id>/subagents/`. Those totals exceeded `usage.mjs`'s by 2.2–22.6M on every hodos run, while §12 said the ratio column was unaffected *"because both arms are measured the same way"*. That was wrong: no bare arm dispatched a subagent in fifteen runs, so a reading that leaves dispatches out leaves out only the treatment's. Over every transcript on the machine, CLI 2.1.267 to 2.1.284, not one session file holds a sidechain line or a `parent_tool_use_id` (`PLATFORM-NOTES.md` fact 58). So `usage.mjs` has never counted a dispatch on the versions the pilot ran. `ledger.mjs` writes its number into `history.jsonl` at `Finish`, so hodos's own report of its price was low by the same amount.

**Options as they were put.** (a) Repair `usage.mjs` now, test-first, and re-harvest every cost of §9–§16 with it, keeping the first figures beside the new. (b) Publish corrected costs from a scratch script and repair the tool at 12d. (c) Publish both columns and repair at 12d.

**Taken (developer, option a, as recommended).** `usage.mjs` reads `<session-id>/subagents/*.jsonl` after the session's own file, counting each message id once across all of them; a session with no such directory reads as before. The directory is flat at every spawn depth, so reading one level is complete. The test that failed first is `usage.test.mjs`'s *subagent messages count: Claude Code writes each subagent beside the session* — `input 10` against `4210` before the repair. Removing the one line that reads the directory turns it red again. The test that modelled the old premise stays, renamed to what it proves: a sidechain line inside the session file is counted like any other. Option (b) would have published the pilot's numbers from an instrument `PILOT.md §2` item 6 does not name, and left 12c-3's T17 and T18 runs recording their own cost low. Option (c) would have kept a known-wrong figure in the column the thresholds are read from.

**What moved.** Every hodos cost moved, and no bare cost moved by this decision, because no bare arm has a `subagents/` directory. Pair 1 moved on both sides for a second reason, found by the part's review 1 (B1): its first harvest had cut both arms before decision **0156**'s bar, leaving out 1.35M of the hodos arm's bar run and merge and 0.88M of the bare arm's commit. Its figures below are the whole run as `usage.mjs` reads it.
- **Same-task ratios, D1–D5:** 3.37× → **5.28×**, 3.23× → **5.13×**, 2.58× → **3.78×**, 1.89× → **2.40×**, 2.60× → **3.31×**. The median goes 2.60× → **3.78×** and the pooled ratio 2.65× → **3.81×**.
- **The ten runs, pairs 1–5:** 2.21× → 2.52×, 4.81× → 5.70×, 18.26× → 21.68×, 15.33× → 18.04×, 8.97× → 12.00×. By bucket, `quick` goes 14.41× → **17.37×** and `standard` 3.21× → **3.70×**. Against `DESIGN.md §13`'s hypotheses, `standard` is now missed by 1.9× rather than 1.6×, and `quick` by 13× rather than 11×.
- **Engine time** does not move, because the dispatches run inside the span it is measured on.
- **The price-weighted D-pair readings** read high, because they price the research dispatches' sonnet tokens at the main model's ratios. Leaving those dispatches out altogether gives a floor for the summed ratio: 4.79×, 4.19×, 3.28×, 2.34× and 3.21×.
- **12b's `init`**, the anchor 12c-1's price quotes were read from, was 17.82M rather than 14.57M. The quotes are 12c-1's record and are not rewritten, and neither are the `history.jsonl` rows the pilot's engine wrote.

**Cost if wrong.** If a later CLI writes dispatches into the session file again, each is still counted once, because the message id is the key across all files. If a later CLI moves them somewhere else, the reading goes low again silently. That is the failure this decision repairs, and nothing in the engine would report it; fact 58's observation is the check to re-run.

**Applied in.** `scripts/usage.mjs` and `scripts/usage.test.mjs`; `docs/PLATFORM-NOTES.md` fact 58; `docs/COMPONENTS.md`, `usage.mjs`'s row; `docs/stages/12c2-plan.md`:
- §6: T15e's, T24's and T25's notes;
- §7;
- §9–§11: every hodos cost row, every ratio table, §11's two tables, and every paragraph that states a hodos cost or a ratio — §9's items 2 and 3, §10's pair paragraphs and §11's two;
- §12;
- §15: every hodos cost row, every ratio table, D1–D5's closing paragraphs, D1's model comparison and *T25 closed*;
- `docs/PILOT.md §7`; `docs/stages/12c2-report.md`; `docs/BACKLOG.md`, the `Finish`-snapshot line.

Decision **0045**'s context sentence is its own record and is not edited. Stage **12c-2**.

### 0167 — `usage.mjs` counts a message at its final usage, not its first streamed line (2026-09-30, the developer's answer at Stage 12c-3, T26)

**Context.** Decision **0166** added the subagent transcripts, and took from 0045 the rule that every line of one message carries the same `usage`, so the first line seen could stand for the message. That holds in a session's own file and not in a subagent's. There, a thinking block's line is written while the message is still streaming, so its `output_tokens` is partial: 8 against the final 177, and 4 against 28 726 (`PLATFORM-NOTES.md` fact 60). Found while measuring T26's first judge. `usage.mjs` read its output as 515 tokens; the transcript's last lines sum to 29 680.

**Options as they were put.** (a) Repair `usage.mjs` now, test-first, and correct the figures in `PILOT.md §7`, keeping the first-written ones beside them. Stage 12c-2's accepted plan and report would get one pointer each, not a re-edit. (b) The same repair, re-harvested through every figure of 12c-2's plan, report and `PILOT.md`, as decision 0166 was. (c) Repair it and leave the published numbers, with 12c-3's reading printing a correction table once. (d) Defer to 12d, with a `BACKLOG.md` line.

**Taken (developer, option a, as recommended).** Each field of a message keeps its largest value over the message's lines, because a count only grows while a message streams. A line with no id is still its own message. The cross-file rule of 0166 is unchanged: one message id is one message, in whichever file it is found.

**What moved.** Only output tokens moved, and only on the hodos side, since no bare arm dispatched a subagent. The ten runs' hodos output rose by 31–86 % per run, the pairs' by 0.1–14 %.
- **Summed ratios** move at the second decimal or not at all. The ten runs read 2.52×, 5.71×, 21.74×, 18.10× and 12.05×; `quick` reads **17.42×** (was 17.37×) and `standard` 3.70× (unchanged). D1–D5 and their median of **3.78×** are unchanged.
- **The weighted column** moves more, because it prices output at five times input. `quick` goes 12.53× → **13.75×** and `standard` 3.82× → **4.05×**; the pairs move by at most 0.07×.
- **The research-dispatch floor** of the pairs is unchanged at two decimals: 4.79×, 4.19×, 3.28×, 2.34× and 3.21×.

**Cost if wrong.** If a later CLI writes a larger count on an earlier line, the largest value is still the one kept. If it ever writes a *smaller* final count than a partial one, which no transcript here shows, this overstates by the difference. The same test-first shape would catch that.

**Applied in.** `scripts/usage.mjs` (the header's incident note and `addTranscript`) and `scripts/usage.test.mjs`; `docs/PLATFORM-NOTES.md` fact 60; `docs/COMPONENTS.md`, `usage.mjs`'s row; `docs/PILOT.md §7`, both cost tables and the paragraph under the second; a pointer in `docs/stages/12c2-plan.md` and in `docs/stages/12c2-report.md`, whose figures stay as they were accepted. Stage **12c-3**.

### 0168 — Stage 12d runs as three parts, and the release sits between the engine and the dogfood (2026-09-30, Stage 12d Start, Q1)

**Context.** Decision **0140** left 12d as one part holding `DESIGN.md §13` revised by decision, decision **0141**'s build-or-not, `0.2.0` and dogfooding. The concurrency half added five items on 2026-09-10, three of them proposals. The pilot then added two more proposals landing here (**NNNN**, **QQQQ**) and fourteen backlog lines naming 12d. These are three kinds of work with three kinds of evidence: test-first engine changes on fixtures; a reading of the pilot's records that ends in a public, irreversible release; and a live `init` on this repository with the developer present.

**Options as they were put.** (a) Three parts: 12d-1 the engine, 12d-2 the numbers and `0.2.0`, 12d-3 dogfooding. (b) Two parts: the engine and the numbers, then the release and dogfooding. (c) One part.

**Taken (developer, option a, as recommended).** The parts are `12d1`–`12d3` in file and tag names and `12d-1` in prose, as 12c's are. Each part tags its own base and writes its own plan, report and fresh review, and `stage-12d-base` stays the whole part's base. The order is the argument:
- The release follows an accepted engine review, because a tag on the public repository cannot be withdrawn.
- Dogfooding follows the release. `DESIGN.md §12` says *"from v0.2"*, and the concurrency fixes exist because dogfooding is the first time several hodos sessions on one checkout are the normal way this project is built.

(b) puts a public act and a live session in one report. (c) buys one verdict over three kinds of evidence, which is the shape decisions **0140** and **0153** refused.

**Cost if wrong.** Three Starts and three reviews instead of one, roughly 45–95M tokens of review. Nothing in the engine depends on the split.

**Applied in.** `docs/BUILD-PLAN.md`'s Progress line for Stage 12d and its 12d entry; `docs/stages/12d-plan.md`; the tags `stage-12d1-base`–`stage-12d3-base`. Stage **12d**.

### 0169 — A layer is shared by the sessions on it, and the last one out stops it (2026-09-30, proposal IIII, Stage 12d Start)

**Context.** Proposal **IIII**: the record `.claude/hodos/env/<layer>.json` says which machine raised a layer and not which session. The guard against a second raise is sequential. Two terminals defeat it three ways: two concurrent raises spawn twice and orphan one process; terminal B's `down` stops the layer terminal A is verifying against; and the truncated log belongs to whichever raise was last. Every session runs `env.mjs up` before its verifier and `env.mjs down` on every path out (`skills/run/references/verify-loop.md` §3), so two sessions verifying at once is the ordinary case, not a misuse.

**Options as they were put.** (a) An owner on the record: `up` refuses a live pid from another session, `down` stops only this session's layers, and `--all` stops every layer. (b) A lock per layer. (c) A re-read before `spawn` and a refusal, with no ownership. (d) A sentence in `DESIGN.md §7.4`. The recommendation was (a) with (c)'s re-read.

**The developer's answer, and the options re-put.** *"Мы должны иметь возможность запускать несколько сессий, это не запрещено"*: several sessions are allowed, so a second session's `up` must not be refused. The refusal in (a) read as exactly that. Re-put the same day: a layer **shared** by a list of sessions; **one owner**, with others attaching without owning it; or a **layer per session**, which needs a port field in the project's config.

**Taken (developer, the shared layer, as recommended).**
- **Several sessions share one layer, and none is refused.** A session whose `up` finds a live, proven layer attaches to it and spawns nothing.
- **The users are one file per session**, in `.claude/hodos/env/<layer>.users/<session-id>`. A list rewritten by two processes at once loses one of them, while creating and removing a file are each atomic. `up` registers before it probes. `down` unregisters before it counts.
- **One process per layer.** The record is created exclusively (`wx`) before `spawn`. The session that loses the create spawns nothing: it waits on the layer's own proof and attaches. A record whose pid is still null past the layer's declared timeout is a crashed raise; it is removed and the raise retried. That is the lifetime rule option (b)'s lock lacked, taken from a timeout the layer already declares.
- **`down` detaches this session.** It stops the process only when no user file remains. Otherwise it leaves the layer up and prints the sessions still on it. `down --all` stops every layer regardless.
- **Without a session id,** `up` registers no user. A record with no users is stopped by any `down`, as today. A caller with no id never stops a layer that has users: it prints them and leaves the layer running, which is decision **0171**'s direction.
- **The log.** With one spawn per layer, truncating the log at each raise is correct again, because the log belongs to the process that is running.

(Owner-only) moves the failure to the other side: the owner's teardown stops a layer that another session is still verifying against. (A layer per session) is a field every project would have to write, and it does not fit a stack whose `up` fixes the port.

**What it does not do.** A seeded layer's data is shared by every session on it, and a `stop` that resets state runs only when the last session leaves. That is the same boundary as the working tree two terminals share, which `DESIGN.md §5` states (this stage's deliverable 2).

**Cost if wrong.** A session that died without `down` keeps a layer up until `--all`. `down` names it, so the developer can see it and act. There is a residual window of milliseconds, where one session registers while the last one out is already stopping; the second then meets a layer going down and raises it again. That is far narrower than today's, where the window is the whole run.

**Applied in.** `scripts/env.mjs` (`up`, `down`, `writeRecord`, `spawnLayer` and `USAGE`) and `scripts/env.test.mjs`; `docs/FORMATS.md §1` (the record, and the users directory); `docs/COMPONENTS.md §3`, `env.mjs`'s row; `docs/DESIGN.md §7.4`; `skills/run/references/verify-loop.md` §3, where a `down` that leaves a layer up for another session is not a failure. Stage **12d-1**. Review 1 of 12d-1 found *What it does not do* in none of those homes: the seed's reset is now stated as the last session's in `verify-loop.md` §3 and in `FORMATS.md §2`'s seed paragraph.

### 0170 — A claim over a claim the refs carry is refused, and `--force` writes it (2026-09-30, proposal JJJJ, Stage 12d Start)

**Context.** Proposal **JJJJ**: `frontier` reads claims off the refs (decision **0135**) and reports a node another ref holds as `claimed`. But `campaigns.mjs claim` (`cmdClaim`) reads none of it, so it writes `[active] … @owner` over a node held on another branch and prints success. The rule that a second session is not silently given the node lives in `skills/campaign/SKILL.md` and nowhere in the script that skill calls.

**Options as they were put.** (a) `claim` reads `claimsOnRefs` and refuses, naming the owner, the branch and the ref; `--force` writes anyway. (b) Warn and write. (c) Prose only. (d) Nothing.

**Taken (developer, option a, as recommended), with one exception the Start found.** `claimsOnRefs` reads every local ref, including the current branch. A re-run of the **same** claim, for example `map.md §6` resumed after an interruption, would be refused by its own earlier write. So the refusal applies to a claim whose owner **or** branch differs from the one being written. A claim identical in both is written again, and that write is a no-op. The refusal exits non-zero and leaves the map byte-identical. `--force` writes and prints the claim it overrode. The reads stay fail-open (`campaigns.mjs`'s `git`, `refsOf`'s cap of 50): a repository git cannot answer for is written, as today.

It does not close the window `DESIGN.md §9` names, since a claim reaches another checkout only once it is committed. What it closes is a claim written over a claim the refs already carry.

**Cost if wrong.** A stale claim on an abandoned branch blocks a real one until `--force`. The refusal names the branch, and that is what tells the developer to prune it.

**Applied in.** `scripts/campaigns.mjs` (`cmdClaim` and `USAGE`) and `scripts/campaigns.test.mjs`; `docs/COMPONENTS.md §3`, `campaigns.mjs`'s row; `skills/campaign/SKILL.md`'s claim step, and `references/map.md §6` wherever it states the claim command. Decision **0135**'s reach extends from the read to the write. Stage **12d-1**. Review 1 of 12d-1 found only the first ref's claim compared: every claim the refs carry is compared, and each one is named (`claimsOnRefs`'s `all`, `foreignClaims`).

### 0171 — `active` is the path of a claim with no session id, written and read only as that (2026-09-30, proposal KKKK, Stage 12d Start)

**Context.** Proposal **KKKK**: decision **0047** made the claim pointer per session, with `.claude/hodos/sessions/<id>` first and `.claude/hodos/active` second. `claimFor` writes both on every claim (`ledger.mjs`), so `active` names whichever session claimed last. The proposal named the caller with no id. The Start found the wide case in `activeTask` (`config.mjs`). **Any** session whose own pointer is missing falls back to `active`, including a session that has an id and has claimed nothing — a `/hodos:status` terminal, or plain work beside a running task. That session's Stop is blocked on the other task's open item. It advances that task's `stop-count`, and its commits can be denied on that task's review.

**Options as they were put.** (a) Write `active` only for a claim with no id. (b) Read `active` only while `sessions/` holds no pointer at all, so an ambiguous caller gets no gate. (c) Both. (d) Nothing.

**Taken (developer, option c, as recommended).** A session with an id writes only its own pointer. `activeTask` returns the session's own pointer when there is one, `active` only while `sessions/` is empty, and otherwise null, so the gate stays open. Option (a) alone closes the wide case wherever every claim carries an id. Option (b) alone closes it wherever one does not. Together they cover both. The acceptance criterion gains the wide case: an id that names no pointer while another session holds one leads to no block and no denial.

**Cost if wrong.** On a machine where the id is unreachable, a **second** terminal gets no gate rather than the wrong one. That is a weaker guard, not a wrong action, and `ledger.mjs sessions` names it.

**Applied in.** `scripts/ledger.mjs` (`claimFor`, the header comment at the claiming section, and the module comment that names the two pointers) and `scripts/ledger.test.mjs`; `scripts/config.mjs` (`activeTask` and the comment above it) and `scripts/config.test.mjs`; `scripts/stop-gate.test.mjs` and `scripts/git-guard.test.mjs` for the two callers; `docs/DESIGN.md §5`'s sentence naming the two pointers; `docs/COMPONENTS.md`, wherever it states the fallback. Decision **0047**'s reach is restated here, and 0047 itself is left as written. Stage **12d-1**.

### 0172 — A tracked line that names a task directory is computed from the diff, and it is a `major` (2026-09-30, proposal NNNN, Stage 12d Start)

**Context.** Proposal **NNNN**: `init` gitignores `.claude/hodos/tasks/` (decision **0144**). Yet a task that obeys a project's own citation rule cites its plan in shared code, and the citation ships. `ariadne_v2` carries 32 such paths across 12 files. Seventeen of them are in two ADRs, so citing a decision record instead did not close the hole. `verify-citations.mjs` skips them, because they carry a decision id and not a `file:line`.

**Options as they were put.** (a) `config.mjs check` refuses such a `[src:]`, and the writing phases inline the fact. (b) Track the task directory. (c) Cite an ADR instead. (d) A backlog line and a sentence. The Start found that (a) names a script that cannot do it: `config.mjs check` validates `config.json` and reads no source. And `[src:]` is the project's rule, not the engine's. Re-put as (a′): the mechanism moves to where the diff is.

**Taken (developer, a′, as recommended).**
- **The package computes it.** `review-package.mjs` computes, with no model call and in the way decision **0100** computes `## Callers`, the added lines in the diff that name a concrete task directory. The pattern is `.claude/hodos/tasks/<slug>` with a real slug, not the `<slug>` placeholder, and `.gitignore` is excluded, since `init` writes its own line there. A placeholder is how the engine's own documentation names the path, and this repository is dogfooded from 12d-3 on.
- **The reviewer files each line as a `major`**: a tracked file naming a path no other checkout has. The one exception is a line that quotes the path as its subject, not as a source, and the reviewer then says so in the row.
- **The writers get one sentence**: a tracked file carries the fact itself, the decision's sentence, never the task directory's address. It goes in `skills/run/references/execute.md`, the two rule writers and `AUTHORING.md`.

Decision 0144's gitignore and the project's citation rule both stay. (b) reverses decisions **0079** and **0144**. (c) is measured not to close. (d) stops nothing, including a bare session copying the convention (decision **0159**).

**What happens to the 32 already in `ariadne_v2`.** At Stage 12d's Start the developer asked the builder to repair them (Q8). Each one is replaced by the sentence it pointed at, where the plan is still on disk. Where the plan is gone, the path is listed in the report. Each is a pilot-local commit whose diff is shown before it is made.

**Cost if wrong.** A doc comment carries a sentence instead of a pointer and grows by a line or two. A quoted path the reviewer judges as a citation costs one `Ruling:`.

**Applied in.** `scripts/review-package.mjs` and `scripts/review-package.test.mjs`; `docs/FORMATS.md §8` (the block); `agents/hodos-reviewer.md` (one sentence); `skills/run/references/execute.md`; `skills/init/references/rules.md`; `skills/rule/SKILL.md`; `docs/AUTHORING.md`; `docs/COMPONENTS.md`, `review-package.mjs`'s row. In `ariadne_v2`: the 32 citations, as pilot-local commits. Stage **12d-1**. The form was put to the developer when the commits were prepared: the code tags cite the commit that carries the fact, `[src: commit <sha>]`, which the pilot's `src-citations.md` now admits, and the ADR tags became the ADR's own dated measurements (`12d1-plan.md §6`).

### 0173 — The mutation row names the zero case, and says which line it mutated (2026-09-30, proposal QQQQ, Stage 12d Start)

**Context.** Proposal **QQQQ**: the mutation row's Evidence cell ends ` · 1 of <k> new tests` (decision **0122**). Three of the pilot's five hodos tasks added no test, and their rows summed to `k = 0`. Two verifiers wrote `1 of 0 new tests`, and the third refused the format and wrote its own. All three mutated a line the diff had **modified**, came back red, restored clean, and passed.

**Options as they were put.** (a) Name the zero case: ` · 1 of 0 new tests — mutated <file>:<line>, a line this diff changed`. (b) A `skip` where `k` is 0. (c) A second denominator of lines changed in test files. (d) Leave it.

**Taken (developer, option a, as recommended).** Where the ledger's rows sum to zero and the diff adds no test declaration, the verifier mutates a line the diff changed in a test file, and the cell names it. The row keeps the only behavioural oracle a message-only task has. Pair 5's mutation is what showed the new message actually prints on failure. (b) throws that away. (c) adds a second denominator to a cell whose first denominator is always zero here. (d) is what produced two formats in three runs.

**Cost if wrong.** The row says it mutated a changed line where the developer expected a new test. The cell names the file and the line, and one clause reverts it.

**Applied in.** `docs/FORMATS.md §10` (the sentence on the mutation row's Evidence cell); `agents/hodos-verifier.md` (the same rule, at the mutation row); `docs/COMPONENTS.md`, `hodos-verifier`'s procedure. Stage **12d-1**.

### 0174 — The home-map commit is written in the home repository's convention (2026-09-30, proposal UUUU, Stage 12d-1 Start)

**Context.** Proposal **UUUU**: `noteHomeMap` prints a subject `cog` refused, because it never reads `conventions.commit`. **Options as they were put.** (a) Read the home repository's `conventions.commit`: `conventional` gives `chore(campaign): <slug> <node> claimed|updated|done`, and `ticket-prefix` or `custom:` gives the `add` plus the convention's name. (b) Print the `add` and the name, and let the model compose the subject. (c) Always `chore(campaign): …`. (d) Nothing.

**Taken (developer, option a, as recommended).** The config read is the home repository's, the one where the commit happens and whose hooks check it. With no config there, the convention is `conventional`, the default `FORMATS.md §2` states. (b) hands a deterministic string to a model. (c) is wrong for `ticket-prefix`.

**Cost if wrong.** A project with its own type list rejects `chore`. The printed line names the convention it read.

**Applied in.** `scripts/campaigns.mjs` (`noteHomeMap` and its three callers) and `scripts/campaigns.test.mjs`; `skills/run/references/finish.md §4` and `skills/campaign/references/map.md §6`, wherever the command is quoted; decision **0137**'s shape, extended from *what* is printed to *in which convention*. Stage **12d-1**. **Amended by 0181**: the subject carries no scope.

### 0175 — The re-review receives the previous `## Spec` section too (2026-09-30, proposal VVVV, Stage 12d-1 Start)

**Context.** Proposal **VVVV**: `previousFindings` copies only `## Standards`, so a Spec `major` closed by a `Ruling:` reaches no second reader, as on D5. **Options as they were put.** (a) Copy the previous `## Spec` section verbatim beside the table. (b) The reviewer writes a Spec finding that carries a severity as a Standards row. (c) Copy only the Spec lines that name a severity.

**Taken (developer, option a, as recommended).** The re-review's walk-first rule then covers every finding the verdict counted. Copying a section is not parsing prose, which (c) would be. (b) breaks the reviewer's *"two sections and they stay two"*.

**Cost if wrong.** A re-review package grows by at most 400 words.

**Applied in.** `scripts/review-package.mjs` (`previousFindings` and the package's `## Previous findings`) and `scripts/review-package.test.mjs`; `docs/FORMATS.md §8`'s iteration-2 sentence; `agents/hodos-reviewer.md` `## Re-review`; `skills/run/references/review-loop.md §6`; `docs/COMPONENTS.md`, wherever the re-review package is described. Stage **12d-1**.

### 0176 — A `Gap:` that overrides an acceptance clause amends it in the plan (2026-09-30, proposal WWWW, Stage 12d-1 Start)

**Context.** Proposal **WWWW**: on D5, a `Gap:` the developer settled left the clause it overrode in `plan.md`, and the verifier failed that clause as written. **Options as they were put.** (a) The Gap step amends the clause in the same step, with a dated note naming the Gap. (b) The verifier reads `Gap:` lines as amendments to the claims. (c) Nothing.

**Taken (developer, option a, as recommended).** `plan.md` stays the one place both agents read claims from, and the note keeps the original clause visible. (b) moves a reconciliation of prose against clauses into the verifier, and the reviewer would then need it too.

**Cost if wrong.** An approved plan changes after approval. The note says when and why, and the finish report already lists every `Gap:`.

**Applied in.** `skills/run/SKILL.md` (`## Gates`); `docs/FORMATS.md §5`, the note's form; `docs/DESIGN.md §4.4` and `§5.1`, wherever they state what a Gap writes and who writes `plan.md`. Stage **12d-1**. Review 1 of 12d-1 added the three phases a `Gap:` arises in: the *Writes* of `execute.md`, `review-loop.md` and `verify-loop.md`.

### 0177 — A claim that compares a number names its tolerance in the plan (2026-09-30, proposal XXXX, Stage 12d-1 Start)

**Context.** Proposal **XXXX**: on D3, *"no parse-phase regression against the base"* carried no tolerance. It failed on a difference inside base's own noise and cost 4.26M before the breaker. **Options as they were put.** (a) At the plan: a comparative numeric claim names its tolerance and statistic when written, and the plan reviewer's gap 6 widens to every numeric bar. (b) At the verifier: judged against the base's own spread. (c) Both. (d) Nothing.

**Taken (developer, option a, as recommended).** The tolerance is a judgement the developer makes before the numbers exist, which is decision **0088**'s argument extended from a spike's bar to every comparison. (b) is arithmetic standing in for that judgement, and a p95 rule would be fitted to D3.

**Cost if wrong.** A plan names a tolerance too loose to catch a real regression. It is visible in the plan the developer approves.

**Applied in.** `skills/task/references/plan.md` (the claim-writing clause); `agents/hodos-plan-reviewer.md` gap 6; `skills/run/references/oracles.md §5.3` (one sentence); `docs/COMPONENTS.md`, wherever gap 6 is restated. Stage **12d-1**.

### 0178 — The grilling round asks through `AskUserQuestion` (2026-09-30, proposal YYYY, Stage 12d-1 Start)

**Context.** Proposal **YYYY**: `plan.md §1` names no medium for the round. D5 asked in a markdown list, and the developer asked for `AskUserQuestion` by name. **Options as they were put.** (a) `AskUserQuestion`, up to four questions per call, with the recommended answer first and marked *(Recommended)*; a larger frontier becomes consecutive calls in one turn. (b) A numbered list. (c) The medium chosen by the number of questions.

**Taken (developer, option a, as recommended).** It is the medium the router and the plan's approval already use. `init`'s interview (`skills/init/references/interview.md`) keeps its prose batch, and this decision does not reach it.

**Cost if wrong.** A question needing a long answer is squeezed through *Other*.

**Applied in.** `skills/task/references/plan.md §1`; `docs/COMPONENTS.md`, the plan phase's procedure; `docs/DESIGN.md §6.1`, wherever it states how the round is asked. Stage **12d-1**.

### 0179 — The handoff offer skips a task that is done (2026-09-30, proposal ZZZZ, Stage 12d-1 Start)

**Context.** Proposal **ZZZZ**: `handoffOffer` offered *"has been open <n> days"* for a task at `phase: done`. **Options as they were put.** (a) The offer skips `phase: done`, and the `stale:` row stays. (b) `stale` excludes done tasks altogether. (c) Nothing.

**Taken (developer, option a, as recommended).** A done task is not open, and the offer says *open*. Its directory is still named by the `stale:` row, whose *"fold or delete"* is the right action for it. (b) would hide the garbage collection `DESIGN.md §5` asks the digest to name.

**Cost if wrong.** Nothing a reader would see: the directory is still named.

**Applied in.** `scripts/state-digest.mjs` (`handoffOffer`) and `scripts/state-digest.test.mjs`; `docs/FORMATS.md §12`, wherever the offer's condition is stated. Stage **12d-1**.

### 0180 — The task that moves a rule's anchor re-points it before the merge (2026-09-30, proposal AAAAA, Stage 12d-1 Start)

**Context.** Proposal **AAAAA**: across the pilot's 16 merges, five precedents moved. Three were repaired, each in a different place, and two are still open. **Options as they were put.** (a) `finish` runs `verify-citations.mjs .claude/rules/*.md`. An anchor this branch's diff moved is re-pointed on the developer's approval, in one `docs(rules)` commit on the branch before the merge. Rot the diff did not cause stays with `/hodos:status --prune`. (b) Always a separate commit by `status --prune`. (c) A command for the developer, in decision **0137**'s shape. (d) Nothing.

**Taken (developer, option a, as recommended).** The change that breaks an anchor carries its repair, the way it carries the tests it updates, so every merge leaves the rules resolvable. *Moved by this diff* means the cited file is one the branch changed. Any other finding is rot the task did not cause.

**Cost if wrong.** One more approval at `finish`, and a commit the reviewer never saw, whose content `verify-citations` proves.

**Applied in.** `skills/run/references/finish.md` (the step and its report line); `skills/status/references/prune.md §3`; `docs/DESIGN.md §7.5`; `docs/COMPONENTS.md`, `finish`'s procedure. Stage **12d-1**. Review 1 of 12d-1 moved the step ahead of the one offer, so the digest does not count an anchor the step has just re-pointed, and removed `prune.md §3`'s sentence about it, which changed nothing that run asks.

### 0181 — The home-map subject carries no scope (2026-09-30, Stage 12d-1, found while repairing the pilot)

**Context.** Decision **0174** fixed the `conventional` subject at `chore(campaign): <slug> <node> <verb>`. The test checked it against the conventional header shape. The project that motivated the decision was not checked. Preparing Stage 12d-1's commits in `ariadne_v2` read its `cog.toml`, which carries a scope allowlist, and `cog verify "chore(campaign): scip-boundary scip-arch-test done"` exits 1 with *"Commit scope `campaign` not allowed"*. The fix for the first project that checks its messages was still refused by it.

**Options as they were put.** (a) No scope: `chore: <node> <verb> in campaign <slug>`. The convention makes a scope optional, so the form passes a checker with an allowlist and one without. (b) A scope only where the project allows any: the script reads `cog.toml` or a commitlint config, which means a script parsing other tools' formats. (c) Keep `chore(campaign)`.

**Taken (developer, option a, as recommended).** `cog verify` on the pilot exits 0 for `chore: scip-arch-test done in campaign scip-boundary`, 1 for the scoped form, and 1 for the form 0174 replaced. The subject reads like the one the developer typed by hand for `9e512b7`. The test's header shape now admits no scope.

**Cost if wrong.** A project whose checker *requires* a scope refuses the line. The printed command names the file, so the developer adds one word.

**Applied in.** `scripts/campaigns.mjs` (`noteHomeMap`) and `scripts/campaigns.test.mjs`; `docs/COMPONENTS.md`, `campaigns.mjs`'s row; `skills/run/references/finish.md §4`; decision **0174**'s *Applied in*, which carries the amendment. Stage **12d-1**.

### 0182 — The multiplier carries no threshold, and `§13` reports its measured price (2026-09-30, Stage 12d-2 Start, Q1)

**Context.** Decision **0158** demoted the multiplier from acceptance criterion to reported price, and left the two thresholds for Stage 12d to revise with the pilot's numbers in hand. `DESIGN.md §11` still calls `quick` ≤1.3× and `standard` ≤2× *starting thresholds*, `§13` lists `1.3× / 2×`, and `README.md:93` states them as the targets. The pilot missed both on every set it measured (`PILOT.md §12`):
- `quick`: 17.42×, over pairs 3–5, three different tasks per arm, on `claude-opus-5`;
- `standard`: 3.70× over pairs 1–2, and 3.49× over D2–D5, the same task in both arms, on `claude-opus-5-5`;
- `deep`: 5.28×, D1 alone.

**Options as they were put.** (a) No threshold. `§11` and `§13` report the measured price with its set, its model and its date, and `status --cost` reports each task's. (b) New hypotheses named by model, for example `standard` ≤4× on `claude-opus-5-5`, as a guard for the next pilot. (c) Keep 1.3× and 2× as targets, marked *not met at 0.2* with the numbers.

**Taken (developer, option a, as recommended).**
- A threshold on a price brings back, under another name, the criterion 0158 removed.
- Any number set now would be read off the three and four pairs it would then judge, so it would pass by construction.
- The denominator moves with the model: one re-run of D1's bare arm cost 1.99× less on `claude-opus-5-5`, with no variance beside it.

(b) is honest only if a later pilot re-buys the arms to test it. (c) keeps a target the design has no mechanism to approach, which is what decision **0183** changes for one shape of `quick`.

**Cost if wrong.** A later release has no number to regress against. The published figures name their set, model and date, so the next pilot compares against them rather than against nothing.

**Applied in.** `docs/DESIGN.md:18` (the *Frugal* row), `§11`'s measured-price paragraph, `§13`'s line and its reading table; `README.md`'s status line and *What it costs*; `bench/noop/scenarios.json`, whose router-budget scenario quotes `§13`'s line and its budget row; `skills/status/SKILL.md §8`, whose multiplier sentence named T-1; `docs/PILOT.md §12`'s note; `CHANGELOG.md` 0.2.0's *Changed*; decision **0158**'s *Applied in*. Stage **12d-2**.

### 0183 — An `inert` shape of `quick`: one session, one review, no verifier (2026-09-30, proposal BBBBB, Stage 12d-2 Start)

**Context.** Proposal **BBBBB**. The pilot's three `quick` runs changed no behaviour and cost 17.42× their bare arms. The whole kernel ran on each of them: ten design fields over message text, a second session, a simplify pass, a reviewer and a verifier deriving seventeen claims from clauses that said the suite is green. Pair 4's reviewer found two real majors on exactly that kind of change.

**Options as they were put.** (a) `quick` keeps every phase and loses the verifier when every task is exempt, projected at about 14×. (b) An `inert` shape of `quick`, projected at 2.7–4× per run when the review accepts. (c) A path below `quick` with no reviewer, projected at about 1.4×. (d) Nothing in 0.2. The projections are arithmetic on `12c2-plan.md §12`'s phase table, not measurements.

**Taken (developer, option b, as recommended).**
- **The shape.** `inert` adds no path and changes none of `FORMATS.md §3`'s six rules, as `mechanical` does for `refactor`.
  - `yes` when every line the change edits is text no program reads to decide anything: a comment, documentation, a message that reaches only a human (an assertion's text, a log's text, or an error's text that no caller or test matches on), or whitespace.
  - `no` when any edited line is branched on, returned, stored or compared, including a message a test matches by content.
  - It applies only to a `quick` verdict.
- **The stop.** The router shows the shape with its verdict. The developer confirms both, and the short plan, in one question, so the verdict and the plan approval are one stop for this shape. The short plan names the files, the edit and the commit subject.
- **The flow**, in the same session:
  1. the edit;
  2. `commands.test` and `commands.lint`, run once, with their output kept as evidence;
  3. one commit in the project's convention;
  4. one fresh reviewer on the task's package, with review, fix and re-review under the bounds of `review-loop.md`;
  5. `Finish`, with its history line.
- **What it drops.** No second session, no design fields, no simplify pass, no verifier.
- **The ratchet.** An edit that turns out to touch behaviour stops the flow and upgrades the task to `quick`, and the upgrade is a ledger event.

**Two forks the Start found after the choice, both answered as recommended.**
1. **The ledger form.** The task is recorded as `Task <n>: done (<sha>, inert)`. `ledger.mjs` accepts that form only when the brief's confirmed verdict carries `Shape: inert`.
   - The four exemptions stay four. This is not a task deviating from test-first. It is a change whose shape says no line a test could pin was edited, and the developer stamps that at the verdict.
   - The reviewer checks the claim: an edited line that a program reads is a `major`, and the task upgrades to `quick`.
   - The two rejected alternatives were one of the four exemptions with a reason, which names a reason the project never had, as the pilot's `tests: infra` did, and a fifth exemption, `text`, which reopens the list decision **0084** kept closed.
2. **The history field.** `history.jsonl` gains `shape`: `inert`, or `mechanical` where a `refactor` carries it. A line without the field has no shape, so older lines read as before. Without it, once the task directory is deleted, an `inert` task's cost cannot be told from a `quick` one's.

**The build's reading, not a further question.** The short plan the developer confirms is written to `plan.md`: the shape, a `## Goal`, one task per commit with its `Files` and `Acceptance` (the two commands green), and `## Non-goals`. So `review-package.mjs` and the reviewer's Spec section read it as they read any plan. The nine design subsections are not written, which amends decision **0032** for this shape and no other.

**Found by the build, and derivable without a question.** The shape rides on type `feature` or `refactor` only:
- a `bug` opens with a red loop (`DESIGN.md §4.1`), which a change no program reads cannot have;
- a `question` and a `spike` commit nothing;
- an `upgrade` edits a version a program reads.

`ledger.mjs` refuses the other four at `init`. The `task` kernel's first invariant, *"No code is written here"*, gains the one named exception, because `run` is not model-invocable and the flow has to live in `task`. `DESIGN.md §1`'s *Verified* row, and `README.md`'s, now read *"from the project's own commands and verify recipe"*: *"against the project's own verify recipe"* would have been false for this shape.

**The measurement.** Three same-task pairs, bare arm and `inert` arm on one base and one model, on members of the class the pilot did not see: a doc comment, a documentation section, and a log or error message. The result is reported in `§13` and `README.md` beside the `quick` figure, never folded into it.

**Cost if wrong.** A change classed `inert` touches behaviour and ships with no verifier. The ratchet catches it only if the edit reveals it, and the reviewer is the check left. It shows up as an `inert` task whose review files a behaviour finding, which is the signal to narrow the test.

**Applied in.**
- **Scripts:** `scripts/ledger.mjs` (`--shape`, `state.shape`, `done --inert`, the phase after an accepted review or an accepted review breaker, `Upgrade: inert→…`, the history line's `shape`, and the type constraint) and its tests; `scripts/review-package.mjs` (a plan with no design, only under the shape, and the `## Shape: inert` section) and its tests.
- **Formats:** `docs/FORMATS.md` §1 (the history line), §3 (the shape test and the verdict's fourth line), §5 (the inert form), §6 (the grammar rows and the refusal sentence), §7 (`shape`) and §8 (the package).
- **Design:** `docs/DESIGN.md` §1 (*Verified*), §4.1 (the path table and the shape), §4.2, §4.4, §6.2, §7.1 (the refusal sentence), §13 and §14 (*shape*).
- **Skills:** `skills/task/SKILL.md` (the invariants, step 2i, completion), `skills/task/references/route.md` (the judgement, the one stop, `--shape`, the `Route:` line), the new `skills/task/references/inert.md`, `skills/run/SKILL.md` (the resume), `skills/run/references/review-loop.md` (§1, §4, §7) and `skills/run/references/finish.md` §1.
- **Agents and docs:** `agents/hodos-reviewer.md` (the input and the shape check); `docs/COMPONENTS.md` (the registry, `task`'s procedure, invariants and completion, `references/inert.md`, `run`'s resume, the `ledger.mjs` and `review-package.mjs` rows); `README.md` (*Verified*).
- **Bench:** `bench/noop/scenarios.json`, whose two scenarios quote the invariant and the route completion lines.
- **Found by review 1** (`docs/stages/12d2-review.md`), homes the Start's list missed:
  - `README.md`'s *Nothing is written to the repository in this session*;
  - `skills/task/SKILL.md`'s description and its purpose line, and step 2i's *Reads* cell;
  - `docs/COMPONENTS.md §1.1`'s Purpose, Outputs and Depends on, `§2.1`'s Inputs and Procedure, and the `finish.md` row;
  - `docs/FORMATS.md §5`'s `Verify:` form and `§9`'s `Item` list;
  - `agents/hodos-reviewer.md`'s description and its `Item` list;
  - `docs/DESIGN.md §4.1`'s `quick` Verify cell;
  - `skills/run/SKILL.md`'s resume mapping;
  - `skills/task/references/inert.md`'s header `Base:`, `git stash -u` and Bound;
  - `route.md §5`'s read order.
- **Measurement:** `docs/PILOT.md §13` (the three same-task pairs), `docs/DESIGN.md §11`'s figure, `README.md`'s status line and *What it costs*, `CHANGELOG.md` 0.2.0, and `docs/BACKLOG.md`'s line on `status --cost` not showing the shape.
- **Records:** decision **0032**'s *Applied in*, which carries the amendment.

Stage **12d-2**.

### 0184 — The upgrade out of `inert` reverts the edit and restarts the task's counts (2026-09-30, proposal CCCCC, Stage 12d-2, review 1's first major)

**Context.** Proposal **CCCCC**. Decision **0183**'s ratchet wrote `Upgrade: inert→quick` and made *"the committed edit"* the full plan's T1. The ledger then did three things (reproduced by review 1 and by the builder):
- the next `Plan: approved` recorded the edit's own commit as `base`;
- `tasks` stayed `{"total":1,"done":1,"current":1}`;
- `review.iteration` stayed at 1.

So the line the reviewer called behaviour was never packaged again, never tested, and never rebuilt by `run`.

**Options as they were put.** (a) The upgrade is a reset point, like `Breaker: … rollback`, and the edit is reverted and rebuilt test-first. (b) Keep the first base, and the edit as T1. (c) No ratchet: the task stops and a new one is opened.

**Taken (developer, option a, as recommended).**
- **The reset.** `Upgrade: inert→<path>` is a reset point of the derivation. `tasks.done`, both loop iterations and `redCheckAttempts` count only the events after it, and `tasks.current` restarts at 1, whatever an earlier rollback named.
- **The rebuild.** `inert.md §7` reverts each inert commit with `git revert --no-edit` (and restores an uncommitted edit), so that the full plan's T1 rebuilds the change test-first. The task keeps its branch, and `Plan: approved` records the revert as the base the rebuild starts from.
- **The ratchet, in the ledger.** Two things 0183's text stated and the script did not hold are refused. An `Upgrade:` whose `<from>` is not the task's rung is refused: that rung is `inert` while the task carries it, and its path otherwise. A `Route:` carrying `inert` is refused once `Plan: approved` or an `Upgrade:` is in the ledger.
- **Why (a).** (b) leaves a behaviour line `done` with no red phase, a fifth exemption that decision **0022** closes. (c) drops the ratchet and the router's brief, and has no ledger ending for a task in `fix`.

**Cost if wrong.** The branch keeps the edit and its revert below the new base. They net to nothing, and no review reads them.

**Applied in.** `scripts/ledger.mjs` (the reset in `deriveState`, and `ratchetRefusal` for `Upgrade:` and `Route:`) and `scripts/ledger.test.mjs` (four tests, red first, seven mutants); `skills/task/references/inert.md` §7 and its Completion; `docs/FORMATS.md` §5 (the inert form's upgrade), §6 (the `Upgrade` row and the shape paragraph) and §7 (the reset point); `docs/DESIGN.md §4.1`'s `inert` paragraph; `docs/COMPONENTS.md` (`task`'s Outputs, step 8 and Completion, `references/inert.md`, the `ledger.mjs` row). Stage **12d-2**.

## Proposed

**AAA**, raised at Stage 11d-2's T14 on 2026-09-07 by reading the counter before buying the arm — decision **0110**'s dispatch half cannot be met, because the order dispatches one verifier either way and a red arm's `FAIL` opens a second — was settled the same day as decision **0111**. **CCC** and **DDD**, raised by Stage 11d-2's two reviews on 2026-09-07 — where the presentation class is seeded, and what "both requests in evidence" means when the attack stubs the endpoint — were settled at Stage 11d-3's Start as decisions **0114** and **0115**. **BBB**, raised at Stage 11d-2's T12 on 2026-09-07 by the first arm bought for it — the attack list was five attacks on every visited route and no bound of decision 0096 covered it, so the verifier reached its 60-turn bound before writing a table — was settled the same day as decision **0112**. **EEE**, **FFF** and **GGG**, raised at Stage 11d-3's own Start on 2026-09-07 — where that part's new prose lives against two nearly-full caps, whether the review bench's `recall, spec` joins its four gates, and what `config.mjs check` does about a pinned predicate written on a class — were settled the same day as decisions **0116**, **0117** and **0118**. **HHH**, raised at Stage 11d-3's T3 on 2026-09-07 by writing the recipe and finding a browser check cannot run at the base sha, was settled the same day as decision **0119**. **III**, raised at Stage 11d-3's T7 the same day by building the arm that reads the status and finding it unreachable — 0119 limits the base proof to a command check, every addable row is browser-side, and `FORMATS.md §10` had barred the plan's own claims from the status — was settled the same day as decision **0120**. **LLL** and **MMM**, raised at Stage 11d-3's M1 on 2026-09-07 by the first live run of the pin — the fixture serves no API, so criterion 2's seeded defect never renders, and the claim row on `/` absorbed an ambient 404 instead of giving it its own added row — were settled the same day as decisions **0123** and **0124**. **NNN**, **OOO** and **PPP**, raised at Stage 11d-3's **M2** on 2026-09-07 by the first live `init --refresh` over a rotted pin, were settled the next day as decisions **0131**–**0133**. **QQQ** through **VVV**, the six raised at Stage 11d-3's **M3** and **M4** on 2026-09-07 by the two live verify arms, were settled the next day as decisions **0125**–**0130**. **WWW**, raised at Stage 9b's review 1 on 2026-09-08 — `--help` documented an exit for an unresolvable `repo:` that the build does not take, against decision 0055's treatment of the same condition — was settled the same day as decision **0139**. **II**, raised on 2026-09-06 from `research/07-basemode.md` — the digest is the same text every session while the state behind it does not move — was settled at Stage 12's Start on 2026-09-08 as decision **0141**, which sets the threshold the proposal left unnamed and gates the build on a number the pilot takes. **JJJ** and **KKK**, raised on 2026-09-07 by reading decision 0022's rules against the mechanisms that carry them — a test the diff removes, which no mechanism looks at, and how much of a diff the mutation ceiling actually covers — were settled the same day as decisions **0121** and **0122**, both landing at Stage 12. **YY** and **ZZ**, raised at Stage 11d-2's Start on 2026-09-07 — where the four detector thresholds come from, and whether the fail-fast criterion's cost comparison is a gate — were settled the same day as decisions **0109** and **0110**. **UU** through **XX**, the four raised at Stage 11d's Start on 2026-09-07 — the stage's own split, where the verifier's new prose lives against the caps, and the two things decisions 0093 and 0097 left for the stage to state — were settled the same day as decisions **0105**–**0108**. **TT**, raised the same day by CI's first Windows run, was settled the same day as decision **0103**. **JJ**, raised the same day from the same file, was settled at Stage 11b-4's Start as decision **0101**. **GG**, raised on 2026-09-05 from `research/06-greptile.md`, was settled at Stage 11b-3's Start as decision **0100**. **LL** through **SS**, all eight raised on 2026-09-06 from `research/09-qa-verify.md` and revised the same day after the user's review, were settled the same day as decisions **0092**–**0099**; seven land in a new Stage 11d and **0095** in 11b-4, by the user's choice. **KK**, raised the same day from `research/08-codesight.md`, was settled on the day it was raised as decision **0091**. **HH**, raised by Stage 11b-2's second review, was settled the next day as decision **0090**. **BB**, **CC**, **DD**, **EE** and **FF** were the five before it, all settled at Stage 11b's Start on 2026-09-04 — decisions **0085**–**0089**. The seven proposals raised by `research/05-architecture-review.md` (the Stage 6 architecture review) and carried here on 2026-09-02 are settled, and so is every one raised since: **XXX**, raised at Stage 12a's build on 2026-09-08 by writing decision 0122's reader half and finding the count has no route to either agent that reads it, was settled the same day as decision **0143**. **YYY** and **ZZZ**, raised at Stage 12b's own Start on 2026-09-08 by reading decision 0141's *Applied in* list against the instrument it names — the log is a file in the developer's repository that no `.gitignore` list carries, and the digest has two callers that one two-field line cannot tell apart — were settled the same day as decisions **0144** and **0145**. **AAAA**, **BBBB** and **CCCC**, raised the same day by the pilot's first `init` on a real project — two files written outside init's own invariant and one of them with no ledger row, a rule guard whose file-type proxy met two rules that are right to cite something else, and a command recorded unrun with the developer's approval and nowhere in the format to say so — were settled the same day as decisions **0146**, **0147** and **0148**. **DDDD** and **EEEE**, raised by Stage 12b's **review 1** the same day — a fourth route into a file that no document names, the developer's own instruction typed mid-run; and a ledger that printed five of its seven columns and bundled instructions into rows with nothing in the engine to notice — were put to the developer by Stage 12b's fix pass the same day and settled as decisions **0149** and **0150**; the third of review 1's blockers, decision **0059**'s question-2 clause, was settled with them as decision **0151**. Review 2's own **major** — the m7 fix that defined a batch and by defining it created one the kernel contradicts twice — was settled the same day as decision **0152**. **FFFF** and **GGGG**, raised at Stage 12c's own Start on 2026-09-09 — whether that part runs as one or as three against ten to twenty sessions of spend, and where a hold-out set lives so that its cases never enter a gated denominator — were settled the same day as decisions **0153** and **0154**. **HHHH**, raised by Stage 12c-1's **review 2** on 2026-09-10 — half the `quick` arm was selected out of a rule hodos's own `init` wrote, against the stage's own *not from `.claude/`* clause — was settled the same day as decision **0155**. **LLLL**, raised at Stage 12c-2's own Start on 2026-09-10 — the two arms' stop condition, which `PILOT.md §2` fixed eight things about the measurement without ever stating — was settled the same day as decision **0156**. **IIII**, **JJJJ** and **KKKK**, raised on 2026-09-10 by the developer's question — does the system work when several hodos sessions run at once — and by the audit of the engine's shared state that answered it, were settled at Stage **12d**'s Start on 2026-09-30 as decisions **0169**, **0170** and **0171**, so that the fixes ship in 0.2.0. **IIII** was re-put the same day, after the developer's answer that several sessions are allowed: a second raise now attaches to the layer rather than being refused. **MMMM** and **NNNN**, raised on 2026-09-12 by pair 1's bare half — a bare session that read the hodos arm's plan because the hodos arm's own citations point at it, and the engine rule that puts those citations into shared code while gitignoring what they point at — were put to the developer at pair 1's checkpoint the same day: the first was settled as decision **0157**, and the second was settled at Stage **12d**'s Start on 2026-09-30 as decision **0172**. It was re-put there because its option (a) named a script that reads no source. **OOOO**, raised on 2026-09-12 by the developer reading T-1 against `README.md`'s own five claims — the acceptance criterion measures a cost ratio the tool never claims to win, and nothing in the build looks at the shape of what either arm shipped — was settled the next day as decision **0158**, which buys the third number and demotes the multiplier. **PPPP**, raised on 2026-09-13 by auditing decision 0157's own evidence before writing 0158 — pair 1's bare session did not only read the hodos arm's plan, it wrote one of its own into hodos's directory at tool call 58 to give six `[src:]` citations it had already written a target — was settled the same day as decision **0159**, which keeps the run and gives the void clause the magnitude test it lacked. **QQQQ**, raised on 2026-09-14 by Stage 12c-2's T16 — three of the pilot's five hodos tasks added no test, so the mutation row's evidence cell had to say `1 of 0 new tests`, which two verifiers printed and a third refused — was settled at Stage **12d**'s Start on 2026-09-30 as decision **0173**. **RRRR**, raised on 2026-09-14 by reading the manual block that implements decision 0160 against the protocol it implements — `PILOT.md §8` item 2 strips the control tree of the project's own hooks and MCP config and `12c2-manual.md` M11 strips only what `init` wrote — was settled the same day as decision **0161**, before the first duplicate pair ran. The question decision 0161 left short — the trunk names hodos in twelve source citations and three instruction lines that none of 0161's three removals reach — was put to the developer the same day while the tree was being built, and settled as decision **0162**. The model the pairs run on — M11 had run on `claude-opus-5` and the default moved to `claude-opus-5-5` before M12 — was put to the developer on 2026-09-22 and settled the same day as decision **0163**, which re-buys M11. **SSSS**, raised on 2026-09-23 while harvesting D1 — the engine-time rule subtracted the engine's own waits on commands and subagents as if they were the developer's — was settled the same day as decision **0164**. **TTTT**, raised on 2026-09-23 while preparing S0 — `svelte.scm` declares no symbol, so S0 could not build on it what it existed to build — was settled the same day as decision **0165**. **UUUU** through **ZZZZ** and **AAAAA** were raised at Stage 12d-1's own Start on 2026-09-30 from the seven *group A* lines of `BACKLOG.md`, the ones the developer pulled into 12d-1 at 12d's Start. Each is a case where an engine instruction fails, or a gate acts on something already settled. They were settled at that Start the same day, all seven as recommended, as decisions **0174**–**0180**. Nothing is open. Lettered rather than numbered: a proposal that is taken gets the next free number then, and one that is declined burns none. Each settling decision restates the options it was chosen from, so nothing this file recorded is lost by the move.

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
| **UU**–**XX** | Stage 11d's own Start, 2026-09-07 | Stage 11d Start, the same day — decisions **0105**–**0108** |
| **YY**, **ZZ** | Stage 11d-2's Start, 2026-09-07 | Stage 11d-2 Start, the same day — decisions **0109**, **0110** |
| **AAA** | Stage 11d-2's T14, 2026-09-07 | Stage 11d-2, the same day — decision **0111** |
| **BBB** | Stage 11d-2's T12, 2026-09-07, from the arm's transcript | Stage 11d-2, the same day — decision **0112** |
| **CCC** | Stage 11d-2's review 1, 2026-09-07 | Stage 11d-3 Start, 2026-09-07 — decision **0114** |
| **DDD** | Stage 11d-2's review 2, 2026-09-07 | Stage 11d-3 Start, the same day — decision **0115** |
| **EEE**–**GGG** | Stage 11d-3's own Start, 2026-09-07 | Stage 11d-3 Start, the same day — decisions **0116**–**0118** |
| **HHH** | Stage 11d-3's T3, 2026-09-07 | Stage 11d-3, the same day — decision **0119** |
| **III** | Stage 11d-3's T7, 2026-09-07 | Stage 11d-3, the same day — decision **0120** |
| **JJJ**, **KKK** | a reading of decision 0022 against its mechanisms, 2026-09-07 | the same day — decisions **0121**, **0122**; both land at Stage 12 |
| **II** | `research/07-basemode.md`, 2026-09-06 | Stage 12 Start, 2026-09-08 — decision **0141** |
| **XXX** | Stage 12a's build, 2026-09-08, from decision 0122's own reader half | Stage 12a, the same day — decision **0143** |
| **YYY**, **ZZZ** | Stage 12b's own Start, 2026-09-08, from decision 0141's *Applied in* list | Stage 12b Start, the same day — decisions **0144**, **0145** |
| **AAAA**, **BBBB**, **CCCC** | Stage 12b's M1, 2026-09-08, from the pilot's first `init` | Stage 12b, the same day — decisions **0146**, **0147**, **0148** |
| **DDDD**, **EEEE** | Stage 12b's review 1, 2026-09-08 | Stage 12b's fix pass, the same day — decisions **0149**, **0150** (and **0151** for the same review's third blocker) |
| **FFFF**, **GGGG** | Stage 12c's own Start, 2026-09-09 | Stage 12c Start, the same day — decisions **0153**, **0154** |
| **HHHH** | Stage 12c-1's review 2, 2026-09-10 | Stage 12c-1's fix pass, the same day — decision **0155** |
| **IIII**, **JJJJ**, **KKKK** | the developer's question about several sessions at once, 2026-09-10, and the audit of the engine's shared state | Stage 12d Start, 2026-09-30 — decisions **0169**, **0170**, **0171** (IIII re-put after the developer's answer) |
| **LLLL** | Stage 12c-2's own Start, 2026-09-10 | Stage 12c-2's Start, the same day — decision **0156** |
| **MMMM** | pair 1's bare half, 2026-09-12, read out of its own transcript | Stage 12c-2's checkpoint, the same day — decision **0157** |
| **NNNN** | the same transcript, 2026-09-12, and the four citations the hodos half merged | Stage 12d Start, 2026-09-30 — decision **0172** (option a re-put: the mechanism moved to the diff) |
| **OOOO** | the developer's reading of T-1 against `README.md`'s own claims, 2026-09-12 | Stage 12c-2, 2026-09-13 — decision **0158** |
| **PPPP** | the audit of decision 0157's evidence, 2026-09-13, out of transcript `ccafe198` | Stage 12c-2, the same day — decision **0159** |
| **QQQQ** | Stage 12c-2's T16, 2026-09-14, from the three zero-test verify rows | Stage 12d Start, 2026-09-30 — decision **0173** |
| **RRRR** | reading `12c2-manual.md` M11 against `PILOT.md §8` item 2, 2026-09-14 | Stage 12c-2, the same day — decision **0161** |
| **SSSS** | harvesting D1's hodos S2, 2026-09-23, gap by gap | Stage 12c-2, the same day — decision **0164** |
| **TTTT** | preparing S0 against the pilot's code, 2026-09-23, before any session | Stage 12c-2, the same day — decision **0165** |
| **UUUU**–**ZZZZ**, **AAAAA** | the seven *group A* lines of `BACKLOG.md`, pulled into 12d-1 at 12d's Start, 2026-09-30 | Stage 12d-1 Start, the same day — decisions **0174**–**0180** |
| **BBBBB** | Stage 12d-2's own Start, 2026-09-30, from the developer's answer to Q3 and `12c2-plan.md §12`'s phase table | Stage 12d-2 Start, the same day — decision **0183** |
| **CCCCC** | Stage 12d-2's review 1, 2026-09-30, reproduced by the builder in a scratch repository | Stage 12d-2, the same day — decision **0184** |

A new proposal is appended below this table, with the stage it lands in named in its own last line (`STAGE-PROTOCOL.md §1.3`).

### CCCCC — The upgrade out of `inert` leaves the edit outside every later review (raised 2026-09-30 by Stage 12d-2's review 1, lands in Stage 12d-2)

**Context.** Review 1's first major, which the builder reproduced in a scratch repository (`12d2-review.md`).

Decision **0183**'s ratchet runs in four steps:
1. A review `major` on the shape goes to `inert.md §7`.
2. The task is upgraded with `Upgrade: inert→quick`.
3. The plan is grilled into the full form, and *"the committed edit is that plan's T1"*.
4. Step 8's `Plan: approved` approves it.

The script does three things with that sequence.
- **The base moves.** `Plan: approved` records `base` from HEAD, and the last approval wins. The base therefore lands on the edit's own commit: `state.base` is the edit's sha, and the package reads `Base = Head · Commits: 0`.
- **The task stays done.** `tasks` stays `{"total":1,"done":1,"current":1}`, so `run` never rebuilds T1. T1 is still recorded as `done (sha, inert)`, with no red phase and no exemption.
- **The review loop starts one short.** `review.iteration` stays at 1, so the `quick` loop is one iteration from the breaker.

The line the reviewer called behaviour is therefore never reviewed again and never tested. That is the one case 0183's *Cost if wrong* names *"the reviewer is the check left"* for.

**Options.**
(a) **The upgrade is a reset point, and the edit is rebuilt.**
   - The derivation treats `Upgrade: inert→<path>` the way it treats `Breaker: … rollback`: `tasks.done`, both loop iterations and `redCheckAttempts` count only the events after it.
   - `inert.md §7` reverts the edit with `git revert --no-edit <sha>` before step 6, so the full plan's T1 builds it test-first, and the next `Plan: approved` records a base the rebuild alone sits on.
   - Built test-first, with a mutant on each count.
   - Cons: the branch keeps the edit and its revert, both below the new base. They net to nothing, and nothing reviews them.
(b) **Keep the first base and the edit as T1.** `Plan: approved` after an upgrade keeps the base it had, and the review count resets. Cons: the line that carries behaviour stays `done` with no red phase. That is a fifth exemption by another road, which decision **0022** closes.
(c) **No ratchet.** An `inert` task whose review finds behaviour stops. The developer reverts it and opens a new task. Cons: it drops 0183's ratchet and the brief the router already wrote, and the ledger has no way to end a task in `fix` short of the breaker.

**Recommendation: (a).** It is the only option under which the line the reviewer flagged gets a red test before it lands, which is what the upgrade exists for. It reuses a rule the derivation already has (the rollback's) rather than inventing one, and it leaves 0183's four stops as they are.

**Stage.** Stage **12d-2**, before the release.

### BBBBB — `quick` pays the whole kernel on a change with no behaviour (raised 2026-09-30 at Stage 12d-2's Start, lands in Stage 12d-2)

**Context.** The pilot's three `quick` runs, pairs 3–5 (`PILOT.md §7`), cost 14.39M, 28.42M and 8.82M. Their bare arms cost 0.66M, 1.57M and 0.73M, so the bucket reads **17.42×**. None of the three changed behaviour: each edited assertion-message literals in one test file, every task was `tests: infra`, and no test was added.

`12c2-plan.md §12` splits the cost by phase:
- execute is 21–29 %;
- research, plan and grill are 13–18 %;
- review is 10–35 %;
- verify is 13–32 %, and on pair 5 it cost more than the edit: 2.78M against 2.56M, for 17 claims over message text;
- finish and what came after it are 11–25 %.

The router's own share, up to the confirmed verdict, is 0.32–0.57M in the three S1 transcripts. The three plans run 167, 191 and 271 lines today before their `## Outcome`, and the 271 was 248 at approval. Each carries all ten design fields. Decision **0032** named that cost *"a few `none` lines"*, visible in the pilot's plan sizes. Nothing in the kernel shrinks with the task, so the smaller the change, the larger the ratio.

What the machinery bought on these three runs:
- On pair 4, review filed two majors, and both were fixed before merge. A counter had read `assert!(c,)` as messaged, so the rule's migration figures were wrong. And a fold the plan asked for had been missed by the first pass.
- Pairs 3 and 5 went `ACCEPT 0/0/0` and verify `PASS`.

**The arithmetic.** It comes from the phase table, not from a run. Each figure removes a phase's measured share and substitutes the bare arm's cost for the edit. It cannot see what a changed flow would add back.
- Without the verifier: 51.49M → 42.14M, **14.2×**.
- With the router, the edit, and one fresh review at the 0.91–1.58M the two accepting runs spent on review: **2.7×** (pair 5) to **4.0×** (pair 3). A run whose review finds something pays its fix loop on top, as pair 4 did.
- With the router and the edit alone: (1.29M + 2.96M) ÷ 2.96M, **1.44×**.

**Options.**
- **(a) `quick` keeps every phase, and loses the verifier when every task is exempt.** The kernel runs the recipe's commands itself and keeps their output as evidence, with no claim derivation. Projected at about 14×. The plan, the second session and the review stay.
- **(b) An `inert` shape of `quick`.** Like `mechanical` for `refactor`, it adds no path and changes none of the six rules.
  - **The test.** `yes` when every line the change edits is text no program reads to decide anything: a comment, documentation, a message that reaches only a human (an assertion's text, a log's text, an error's text that no caller or test matches on), or whitespace. `no` when any edited line is branched on, returned, stored or compared, including a message a test matches by content.
  - **The stop.** The router shows the shape with its verdict, and the developer confirms both, together with a short plan, in one question. The plan names the files, the edit and the commit subject.
  - **The flow**, all in the same session:
    1. the edit;
    2. `commands.test` and `commands.lint`, run once, with their output kept as evidence;
    3. one commit in the project's convention;
    4. one fresh reviewer on the task's package;
    5. `Finish`, with its history line.
  - **What it drops.** No second session, no design fields, no simplify pass, and no verifier.
  - **The ratchet.** An edit that turns out to touch behaviour stops and upgrades to `quick`, and the upgrade is recorded. Projected at about 2.7–4× per run when the review accepts.
- **(c) A path below `quick` with no reviewer.** This is (b) without the review. Projected at about 1.4×, and pair 4's two majors would have shipped.
- **(d) Nothing in 0.2.** `README.md` publishes 17.42× with its cause, and the line goes to `BACKLOG.md`.

**Recommendation: (b).** A change with no behaviour still needs three things, and (b) keeps all three:
- a human at the verdict;
- execution evidence;
- a fresh reviewer, which is what found pair 4's majors on exactly this kind of change.

It drops what has nothing to act on: design fields written over text, a verifier deriving claims from clauses that say only *"the suite is green"*, and a second session that re-reads the kernel. It follows the `mechanical` precedent, so the router's six rules and the router bench's labels stay as they are, because that bench scores path, type and campaign and no shape.

Against the others:
- (a) keeps the order of magnitude.
- (c) is a bare session with a router in front of it, and the pilot's one finding on a no-behaviour change argues against it.

**Fitting, named before the build.** The three runs are one family: assertion messages in one test file. So every projection above is that family's.
- (b)'s test is written by what the change does not do, not by that family.
- Its measurement uses members of the class the pilot did not see: a doc comment, a documentation section, a log or error message.
- Until those runs exist, (b)'s 2.7–4× is arithmetic and not a measurement.

**What it costs to take (b).**
- **The build**, read at 40–70M of builder session and a 15–25M review:
  - `FORMATS.md §3`'s shape test and `skills/task/references/route.md`;
  - `skills/task/SKILL.md` and a new `references/inert.md`;
  - `scripts/ledger.mjs` for the shape and its `Finish`, test-first;
  - `scripts/review-package.mjs`, which today refuses a task without `plan.md` (`:600`), test-first;
  - `DESIGN.md §4.1`, `§4.2` and `§4.4`, because for this shape the verdict and the plan approval become one stop;
  - `COMPONENTS.md` and `README.md`.
- **The measurement**, read at 8–17M: three same-task pairs on members of the class the pilot did not see. Each pair is a bare arm and an `inert` arm, on one base and one model. The sessions are interactive: about six short ones for the developer.
- **The release** waits for both.

**Cost if wrong.** A change classed `inert` touches behaviour and ships with no verifier. The ratchet catches it only if the edit reveals it, and the reviewer is the check left. It is visible as an `inert` task whose review files a behaviour finding, which is the signal to narrow the test.

**Where it lands.** Stage **12d-2**, before the release, by the developer's answer at its Start.

### UUUU — The home-map commit `campaigns.mjs` prints is refused by a project that checks its messages (raised 2026-09-30 from `BACKLOG.md`, lands in Stage 12d-1)

**Context.** `noteHomeMap` (`scripts/campaigns.mjs`) prints `git -C <home> add <map> && git -C <home> commit -m "campaign <slug>: <node> claimed"`, with `updated` or `done` in place of `claimed`. It never reads `conventions.commit`. On the pilot's live node the home repository was `conventional`, checked by `cog verify` in a `commit-msg` hook, and it refused the command verbatim: *"Missing commit type separator `:`"*. Decision **0137** makes this command the one thing the engine hands the developer about a home map, so the one instruction fails on the first project that checks.

**Options.** (a) The script reads the **home** repository's `conventions.commit`. For `conventional` it prints `chore(campaign): <slug> <node> claimed` (or `updated`, `done`). For `ticket-prefix` and `custom:` it prints the `add` and names the convention, and the subject is left to whoever commits, since no script can invent a ticket id or fill a pattern. (b) The script prints the `add` and the convention's name only, and the model composes the subject as it does for every other commit (`execute.md:59`). (c) Always print `chore(campaign): …`, reading no config. (d) Nothing.

**Recommendation: (a).** It gives a command that passes on the common convention and is honest about the two it cannot compose. `chore` is the type the pilot's own session chose. (b) moves a deterministic string into a model's hands. (c) is wrong for `ticket-prefix`.

**Cost if wrong.** A project with its own type list rejects `chore`. The printed line names the convention it read, so the developer changes one word.

**Where it lands.** Stage **12d-1**: `scripts/campaigns.mjs` (`noteHomeMap` and its three callers) and `scripts/campaigns.test.mjs`; `skills/run/references/finish.md §4` and `skills/campaign/references/map.md §6`, wherever the command is quoted.

### VVVV — A Spec `major` closed by a ruling reaches no second reader (raised 2026-09-30 from `BACKLOG.md`, lands in Stage 12d-1)

**Context.** `previousFindings` (`scripts/review-package.mjs`) copies only the `## Standards` table of the last `review.md` into the re-review package. Some majors live in `## Spec`: decision **0122**'s mutation-count mismatch, and a `Tests:` exemption the diff contradicts. On the pilot's D5, review 1's two majors were both Spec lines. Review 2 received only the two Standards minors and returned ACCEPT 0/0/1. Of the majors it said *"not re-checked, because it wasn't in the list of earlier findings this pass was given"*. The fix pass had closed them with a `Ruling:`, and nobody independent read that closure.

**Options.** (a) `## Previous findings` carries the previous `## Spec` section verbatim, beside the Standards table. The re-review walks both. Copying a section is not parsing prose. (b) The reviewer writes a Spec finding that carries a severity as a Standards row, `Item: spec`. (c) The script copies only the Spec lines that name a severity.

**Recommendation: (a).** It is one section more in a package that already copies one, and the re-review's walk-first rule then covers every finding the verdict counted. (b) breaks the reviewer's own anti-pattern, *"two sections and they stay two"*. (c) is a script parsing prose, which `DESIGN.md §5` rules out.

**Cost if wrong.** A re-review package grows by at most 400 words.

**Where it lands.** Stage **12d-1**: `scripts/review-package.mjs` (`previousFindings`) and its tests; `docs/FORMATS.md §8`'s iteration-2 sentence; `agents/hodos-reviewer.md` `## Re-review`; `skills/run/references/review-loop.md §6`.

### WWWW — A `Gap:` that overrides an acceptance clause leaves the clause in the plan, and the verifier fails it as written (raised 2026-09-30 from `BACKLOG.md`, lands in Stage 12d-1)

**Context.** A fork the plan did not settle goes to `AskUserQuestion`, then `ledger.mjs add "Gap: <what the plan lacked> — <resolution>"` (`skills/run/SKILL.md`, `## Gates`). The plan is not touched, and the verifier reads its claims from `plan.md`'s `Acceptance:` clauses. On the pilot's D5, the developer ruled that a doc-comment rewrite wins over T2(e)'s *"`tools_list` entry byte-unchanged"*. Review 1 read the Gap and did not count the clause. Verify 1 failed two rows on it at `blocker`, quoting the Gap in its own Evidence cell. Fix 2 amended the clause by hand. The cost was one more `AskUserQuestion`, a 1.21M verifier dispatch and a `FAIL` in the ledger, all for something the developer had already settled.

**Options.** (a) A `Gap:` whose resolution contradicts an `Acceptance:` clause amends that clause in `plan.md` in the same step, with a dated note naming the Gap. It is what Fix 2 did by hand, made the kernel's step. (b) The verifier reads `Gap:` lines as amendments to the claims. (c) Nothing.

**Recommendation: (a).** The plan stays the one place both agents read claims from. The edit sits where the contradiction is, and the note keeps the original visible. (b) puts a reconciliation of prose against clauses into the verifier, which the reviewer would then need too.

**Cost if wrong.** The approved plan changes after approval, and the note says when and why. The finish report already lists every `Gap:`.

**Where it lands.** Stage **12d-1**: `skills/run/SKILL.md` (`## Gates`); `docs/FORMATS.md §5`, if the note needs a form; `docs/DESIGN.md §4.4`, if it states what a Gap writes.

### XXXX — A comparative timing claim reaches the verifier with no tolerance (raised 2026-09-30 from `BACKLOG.md`, lands in Stage 12d-1)

**Context.** Decision **0098** (`oracles.md §5.3`) makes a timing claim run at least five times and report median and p95. Decision **0088** makes a spike's numeric bar name its statistic before the numbers exist. Neither asks a **comparison** for its tolerance. On the pilot's D3, the plan claimed *"per-phase timings show no parse-phase regression against the base"*. Verify 1 failed it as a blocker, on 129 ms against base's 124.5 ms. The fix window then spent 4.26M, 11 % of the run, profiling a difference inside base's own run-to-run range, before the developer accepted at the breaker. `grep -rni toleran agents/ skills/` finds nothing.

**Options.** (a) **At the plan.** A claim that compares a number — *no regression*, *not slower*, *within* — names its tolerance and its statistic when it is written (`skills/task/references/plan.md`). The plan reviewer's gap 6 widens from a spike's bar to every numeric bar in the claims. (b) **At the verifier.** A comparison with no tolerance is judged against the base's own spread: head median at or below base p95. (c) Both. (d) Nothing.

**Recommendation: (a).** The tolerance is a judgement, and it belongs to the developer before the numbers exist. That is 0088's own argument. (b) replaces that judgement with arithmetic, and a p95 rule would be fitted to D3's noise.

**Cost if wrong.** A plan names a tolerance too loose to catch a real regression. It is visible in the plan the developer approves.

**Where it lands.** Stage **12d-1**: `skills/task/references/plan.md` (the claim-writing clause); `agents/hodos-plan-reviewer.md` gap 6; `skills/run/references/oracles.md §5.3`, one sentence pointing back.

### YYYY — The grilling round names no medium (raised 2026-09-30 from `BACKLOG.md`, lands in Stage 12d-1)

**Context.** `skills/task/references/plan.md` §1 says *"Ask it in one message, numbered, each question with a recommended answer"*. The router's confirmation and the plan's approval name `AskUserQuestion`, and the round does not. On the pilot, D2–D4 asked through `AskUserQuestion`. D5 wrote eight questions as a markdown list, and the developer came back twenty minutes later with *"Ты спросил не через user ask question"*. The model then re-asked the same eight in two calls.

**Options.** (a) `AskUserQuestion`, up to four questions per call, each with the recommended answer as the first option marked *(Recommended)*. A frontier of more than four becomes consecutive calls in one turn, and a free-text answer arrives through *Other*. (b) A plain numbered list, any length, prose answers. (c) `AskUserQuestion` up to four questions, and a list beyond that.

**Recommendation: (a).** It is the medium the developer asked for by name, and the one the router and the approval already use. (c) makes the medium depend on a count, which a developer should not have to predict. `init`'s interview keeps its own prose batch (`skills/init/references/interview.md`), which this proposal does not reach.

**Cost if wrong.** A question needing a long free-text answer is squeezed through *Other*.

**Where it lands.** Stage **12d-1**: `skills/task/references/plan.md` §1; `docs/COMPONENTS.md`, the plan phase's procedure.

### ZZZZ — The digest offers a handoff for a task that is done (raised 2026-09-30 from `BACKLOG.md`, lands in Stage 12d-1)

**Context.** `state-digest.mjs` builds `stale` from every task directory past `staleDays`, including one at `phase: done` whose directory the developer kept after `finish`. `handoffOffer` then prints *"handoff — <slug> has been open <n> days — /hodos:handoff <slug>"* for the first stale task. At `ariadne_v2` it offered that for `api-surface-diff-caps` at `phase: done`, and the status session noted that the offer did not apply. The `stale:` row itself says *"fold or delete"*, which is right for a done task.

**Options.** (a) `handoffOffer` skips a task at `phase: done`. The `stale:` row stays, because deleting that directory is the right action for it. (b) `stale` excludes done tasks altogether. (c) Nothing.

**Recommendation: (a).** The offer's own text says *open*, and a done task is not open. (b) hides a directory that is waiting to be deleted, which is the garbage collection `DESIGN.md §5` asks the digest to name.

**Cost if wrong.** None that can be seen: a done task's directory is still named by its row.

**Where it lands.** Stage **12d-1**: `scripts/state-digest.mjs` (`handoffOffer`) and `scripts/state-digest.test.mjs`; `docs/FORMATS.md §12`, if it states the offer's condition.

### AAAAA — A rule-anchor repair lands wherever a run happened to notice it (raised 2026-09-30 from `BACKLOG.md`, lands in Stage 12d-1)

**Context.** Over the pilot's 16 merges, five rule precedents moved, about one per three merged tasks. All five cite a line in a file the tasks grow. Three were repaired, each in a different place: by the builder outside both arms (`72951ab`), by a session after `Finish` inside the branch (`1f46611`), and as a planned task commit inside a measured diff (`e5325f8`). Two are still open. No document says whose commit a repair is. The digest's prune offer caught every repaired one, but only after the merge that caused it.

**Options.** (a) **The task that moves the line repairs it.** `finish` runs `verify-citations.mjs .claude/rules/*.md`. An anchor this branch's diff moved is re-pointed on the developer's approval in one `docs(rules)` commit on the branch, before the merge, and the report names it. Rot the diff did not cause stays with `/hodos:status --prune`. (b) **Always a separate commit** by `status --prune` on approval, never inside a task's range. (c) **The developer's**, printed as a command, as decision **0137** does for a home map. (d) Nothing.

**Recommendation: (a).** The change that breaks an anchor carries its repair, the way a change carries the tests it updates. Every merge then leaves the rules resolvable, where today rot builds up until someone prunes. (b) keeps task diffs clean and lets the rot build up. (c) is 0137's shape for a repository the session was never asked to touch, and here the session is in it.

**Cost if wrong.** One more approval at `finish`, and a `docs(rules)` commit in the branch that the reviewer never saw. Its whole content is a line-number change that `verify-citations` proves.

**Where it lands.** Stage **12d-1**: `skills/run/references/finish.md` (the step and the report line); `skills/status/references/prune.md §3`, a sentence on what `finish` already repaired; `docs/DESIGN.md §7.5`.

### TTTT — S0's grammar declares no symbol, so S0 cannot build what it exists to build (raised 2026-09-23, lands in Stage 12c-2)

**Context.** `PILOT.md §4` sets **S0** before the first capture pair: a bare session that pays *"whatever threading P3 needs between `facts.rs`, the record and salsa"*, run on **`svelte.scm`** because it is *"the one grammar no task of the twenty touches"*. Read against the pilot's code before writing its description, the grammar cannot carry that work:

- `crates/ariadne-parser/src/adapters/treesitter/queries/svelte.scm` holds **no `@def` capture**. Its two patterns are `@render.component` on `start_tag` and `self_closing_tag`, and its header says why (`:3-5`): the `.svelte` host layer is HTML-shaped, and *"the `<script>` block's decls/imports/calls/hooks come from the injected JS/TS layer's own query"*. `astro.scm` and `vue.scm` are the same shape — 0 `@def` each.
- The facts S0 threads are per **declaration**: a signature span, the parameters, a return span, a doc span and a parent, all empty today — `SymbolRecord` carries the five v8 fields (`crates/ariadne-core/src/domain/records.rs:81-97`) and the one materialization writes `None` into every one (`crates/ariadne-salsa/src/db.rs:321-325`), because the parser's `Decl` (`crates/ariadne-parser/src/adapters/treesitter/facts.rs:90`) has nowhere to put them.

So a Svelte file's functions are extracted by `javascript.scm` and `typescript.scm` — D2's grammars. S0 on `svelte.scm` either produces no fact at all, and the thread is built with nothing to prove it end to end, or it reaches into the grammars D2 is about, which is the share S0 exists to keep out of every arm. Readable from two files; no run found it.

**Options.**
(a) **Run S0 on `go.scm`.** `function_declaration` and `method_declaration` carry exactly the fields the mechanism reads — `name`, `parameters`, `result`, `body` (tree-sitter-go **0.25.0**'s `node-types.json`, the version `Cargo.lock` pins) — and Go's doc convention is a plain `//` block directly above the decl. No remaining task touches it: D2–D5 are TypeScript/Tsx/JavaScript, Java/Kotlin, Rust/Python and `doc_for_module`, and `go.scm`/`csharp.scm` is §4's unrun S3-bare row. Everything else about S0 stays as §4 wrote it — bare, outside every arm, merged into `hodos-pilot` before D2's base is recorded.
(b) **Drop S0 and fold the thread into D2's task.** §4 split it out because S1's two halves were *different* tasks and whichever ran first would have paid it; in a duplicate pair both arms run one task from one base (decision **0160**), so both pay it and neither is flattered. D2 becomes the pilot's largest task, and §4's row-1 prediction for it (13) no longer describes it.
(c) **Keep `svelte.scm`** and let the session decide what a host layer with no declarations can carry.

**Recommendation: (a).** It changes one word of §4 and the reason is a reading, not a result. It keeps the prediction §4 fixed for D2–D4 before any of them ran — a capture task on an existing mechanism — which (b) discards for D2 after it was written. And (b) pays the thread twice, once at the hodos arm's multiple, to buy a comparison D1 already provides: D1 is the pair §8 chose for design latitude. (c) is not a task.

**Cost if wrong.** One bare session outside every arm spent on a grammar nobody asked for — the go half of an unrun §4 row, which stays usable. What (a) cannot recover if it is the wrong choice is (b)'s larger D2; that would need a sixth pair.

**Where it lands.** Stage **12c-2**, before D2 — S0 is its prerequisite and nothing is run until this is settled.

### SSSS — "Engine time" subtracts the engine's own waits as if they were the developer's (raised 2026-09-23, lands in Stage 12c-2)

**Context.** `PILOT.md §8` item 6 defines a run's engine time as *the session span less every gap over 90 seconds*, and `12c2-plan.md §10`'s pair-3 paragraph, which introduced it, says why: the gaps are *"developer latency at the gates"*. The rule never asks what the session was waiting on, and a transcript says exactly that — every gap either ends in a developer's input (an `AskUserQuestion` answer, a typed message) or in the engine's own return (a command's result, a subagent's hand-back, a background task's notification). Harvesting D1 read them one by one:

- **D1's hodos S2, `bcb49b85`**: 116.6 min of span; the rule removes **89.1** of them. The developer's two answers in the session took **35 s and 2 s**. The fifteen removed gaps are `cargo clippy` (305 s), `cargo build` (311 s), a 602-second script, the reviewer's run (806 s), the verifier's runs, and a background task's 978 s — all engine.
- **Pair 5's bare half, `58d92147`**: published as *"one 102-second gap of developer latency — engine time 1.0 min"*. The gap is a command; the developer's only input is the task description. Engine time **2.6**.
- **Pair 3's hodos S2, `ac344504`**: the 36.5-minute gap at the plan approval is genuinely the developer's, and the classified reading keeps it as such — the rule was right there by coincidence of size.

Re-derived for every run the part has timed, the rule is wrong in both directions: pair 3 hodos 24.2 → **34.9** min, pair 4 hodos 39.6 → **76.7**, pair 5 hodos 14.9 → **23.7** and bare 1.0 → **2.6**; the time ratios move 13.4× → 20.5×, 9.0× → 17.8×, 14.9× → 9.1×.

**Options.**
(a) **Replace the rule with the classified reading.** Developer time is every `AskUserQuestion` wait (its `tool_use` to its `tool_result`) plus the gap before each message a person typed — not a task notification, a subagent hand-back or a meta line; engine time is the span to the last assistant message less that. Every engine time published in `12c2-plan.md` is re-derived, pairs 1 and 2 — never timed — are timed, and the two sentences that state the rule are repaired.
(b) **Keep the rule and publish the classified reading beside it**, so every number already written stays and gains a second one.
(c) **Keep the rule alone**, applied to both arms as written, on the grounds that a biased instrument applied evenly is still comparable.

**Recommendation: (a).** The fault is readable from the transcript without looking at any result — a gap that ends in `R[Bash: cargo clippy …]` is not the developer, whichever arm it helps — so this is a repair of the instrument and not a rule fitted to a number. It is not even: it removes more from the arm that runs subagents and long commands, which is hodos, so (c)'s *applied evenly* does not hold. (b) keeps a number the part now knows to be wrong beside the right one, and a reader takes whichever they see first. One limit (a) does not remove: a permission prompt in a session not in `auto` mode is indistinguishable in the transcript from a slow tool call and is counted as engine time; every run D1 timed was in `auto` mode, and each row says which mode it ran in.

**Cost if wrong.** Engine time is a measurement with no threshold (`PILOT.md §2` item 7), so no verdict moves; what moves is every time figure in `§10`–`§11` and D1's row, and the instrument is a script over transcripts already on disk that re-runs at no cost.

**Where it lands.** Stage **12c-2**, now — D1's row is the first one written after it was found, and D2–D5 are timed after it.

### QQQQ — The mutation row has no cell for a task that added no test (raised 2026-09-14, lands in Stage 12d)

**Context.** `FORMATS.md:501` fixes the mutation row's evidence cell at two values: ` · 1 of <k> new tests`, `<k>` summed from the ledger's `Task <n>: mutation (<k> tests)` rows, or ` · 1 of an unrecorded count` where the ledger holds no such row. `agents/hodos-verifier.md:69` says the row is written *"on a test the diff added"*, and `COMPONENTS.md:189` restates both. Nothing covers the case where the rows exist and **sum to zero** — a task that added no test, declared its exemption, and recorded `mutation (0 tests)` for each of its tasks, which is what decision **0022** asks an exempt task to do.

It is not a corner. **Three of the pilot's five hodos tasks are exactly that** (`12c2-plan.md §13`): `parser-complexity-assert-messages`, `outline-assert-messages` and `call-shape-assert-messages`, three runs of the assertion-message family whose whole diff is message literals in existing tests. All three verifiers mutated a line the diff **modified** rather than a test it added, all three came back red and restored clean, and all three rows passed. What they wrote in the cell differs:

- `· 1 of 0 new tests — the ledger records `mutation (0 tests)` …` (pair 3)
- `· 1 of 0 new tests — the diff added none (ledger: `Task 1: mutation (0 tests)`), so the mutated line is one of the 20 assertions it modified` (pair 5)
- `· 1 of the 34 assertions the diff re-messaged, not 1 of k new tests` (pair 4) — the verifier refused the format and wrote its own

So the format produced arithmetic that is false on its face twice, and was overridden once. Decision **0122** exists because *"one `pass` row with no number beside it reads as the diff's tests being proven, when what ran is one of them"*; `1 of 0` is the same defect with a number in front of it, and a cell each agent invents is not a format at all.

**Options.**
(a) **Name the zero case in the three files that state the rule.** Where the diff adds no test declaration and the ledger's rows sum to zero, the verifier mutates a line the diff **modified** in a test file and the cell reads ` · 1 of 0 new tests — mutated <file>:<line>, a line this diff changed`. The row stays, and it says what it sampled.
(b) **The row becomes a skip where `k` is 0** — `skip: no test added — nothing to mutate` — counted in `## Not covered`'s `skips:` line like every other.
(c) **A second denominator**: where `k` is 0 the cell reads ` · 1 of <n> lines the diff changed in test files`, `<n>` derived from the diff.
(d) **Leave it.** Each verifier writes what it saw, which is the measured state.

**Recommendation: (a).** It is one clause in `FORMATS.md §10`, one in `agents/hodos-verifier.md` and one in `COMPONENTS.md:189` — the three sentences that state this rule — and it keeps a check that fired three times and passed three times. (b) throws away the only behavioural oracle a message-only task has: pair 5's mutation is what demonstrated that the new message actually prints on failure, which that run's own `## Claim feedback` names as absent from every acceptance clause the plan wrote. (c) is the most accurate cell and it costs a second denominator inside a cell that already carries a sample, for a case where the first denominator is always zero. (d) is what produced two formats in three runs.

**Cost if wrong.** A row that says it mutated a line the diff changed where the developer expected a new test — visible in the cell, which names the file and the line, and reversible by deleting one clause. The reverse risk is the one the pilot measured: a reader who takes `1 of 0 new tests` at face value learns nothing from a row that did real work.

**Where it lands.** Stage **12d**'s Start, with **IIII**, **JJJJ**, **KKKK** and **NNNN**. It is a format change and Stage 12c-2 buys runs, so nothing was repaired when it was found.

### PPPP — Pair 1's bare half wrote a hodos plan to satisfy citations it had already written (raised 2026-09-13, lands in Stage 12c-2)

**Context.** Decision **0157** records pair 1's bare session reading the hodos arm's plan at tool call 17 of 92, and offers as part of its evidence that "`.claude/hodos/.digest-log` is unchanged at 14 lines and no engine-written task directory exists for the bare slug". The first half stands. The second is true only of the word *engine-written*: `.claude/hodos/tasks/cap-fitness-report/plan.md` exists, 123 lines, and the **bare session wrote it itself** — transcript `ccafe198`, tool call **58 of 92**, `mkdir -p .claude/hodos/tasks/cap-fitness-report` followed by `cat > …/plan.md <<'EOF'`, described by the session in its own words as *"Write task plan referenced by citations"*. It carries the engine's header line (`Path: standard · Type: feature · Branch: feat/cap-fitness-report · Campaign: — · Base: 046be62`) and the engine's section order — *Goal · Non-goals · Decisions · Design · Tasks*. The directory holds that one file: no `brief.md`, `research.md`, `ledger.md` or `state.json`, which is what an engine run leaves beside a plan (compare `api-surface-diff-caps/`, six entries).

The order is what makes it a **back-fill** rather than a plan. The session's first code edit is call **38**, twenty calls before the plan. It had taken the `[src:]` anchor convention out of the plan it read at call 17, written **six** such citations into tracked source — `crates/ariadne-cli/src/commands/fitness.rs:30`, `crates/ariadne-cli/tests/fitness.rs:9`, `crates/ariadne-graph/src/economy.rs:454`, `crates/ariadne-mcp/src/tools/fitness_report.rs:23`, `crates/ariadne-mcp/src/types.rs:1397`, `crates/ariadne-mcp/tests/tools_fitness_report.rs:10`, naming decisions D1, D2, D3, D5 and task T1 — and then manufactured a document that contains those ids. At call **89** it ran `git check-ignore -v` on the file it had just written, so it also knew the target of its six citations would not be committed.

**Direction, and its magnitude.** 0157's narrowed clause voids a run when the leak moves the multiplier **toward** hodos. Writing a plan the bare arm would not otherwise have written raises the bare cost, which is the denominator, and lowers hodos ÷ bare — toward hodos, the direction that clause voids. The magnitude is measurable and it is small: the assistant message carrying that call cost **3 454 output tokens**, and it also carried an unrelated `CLAUDE.md` edit, against the session's **118 885** output tokens and pair 1's bare total of **13.3M** over all four counts — ≤2.9 % of output and ≈0.03 % of the number T-1 divides. The read at call 17 pushes the same ratio the other way by an amount nobody can measure.

**What it means for decision 0158's third number.** The bare arm's shipped code carries six citation anchors it took from hodos's convention, and they point into a gitignored directory. That is a property of the artifact, and it is one no structural reading sees: fitness, api-diff, complexity, coupling and dead code are all blind to a doc comment. A reader of the diff is not.

**Options.**
(a) **Record it, keep the run.** A second leak in the opposite direction, with its magnitude published as the bound above; correct 0157's evidence sentence to say what exists and who wrote it; add the six citations and the fabricated target to proposal **NNNN**'s evidence as a new class — written by the *bare* arm, pointing at a file the bare arm made to satisfy them; and state it in pair 1's row and in `PILOT.md §6`.
(b) **Void pair 1's bare half and re-run it** with `.claude/hodos/` moved aside. Cost: one bare session — pair 1's was ~13.3M tokens and about 25 minutes — and it would move the number *against* hodos, which is the conservative direction. Cons: it contradicts the reasoning 0157 was taken on for the same session; it does not remove the cause for the six runs left, since the citations stay in the trunk; and re-running one arm of one pair makes pair 1 the only pair measured under a different protocol.
(c) **Keep the run and subtract the 3 454 output tokens** from the bare cost. Cons: a hand-adjusted denominator is no longer what the instrument read, and the adjustment is smaller than the rounding in every published ratio.

**Recommendation: (a).** The magnitude is bounded, measured and three orders below the ratio it could move; 0157's rule exists to stop a leak that flatters hodos *materially*, and this one is at the noise floor in the direction it disfavours anyway once the call-17 read is set beside it. What the case does prove is that the void clause needs a magnitude test and not only a direction test — which is (a)'s sentence to write into `PILOT.md §2` item 2, not a new decision of its own.

**Cost if wrong.** If a later pair shows a bare session copying the method *before* it works rather than after — planning like hodos rather than back-filling a citation — then that run's contamination is real and (b) is the answer for it, and pair 1's row is already written in the vocabulary that says why this one is different.

**Where it lands.** Stage **12c-2**: pair 1's row in `12c2-plan.md §9`, decision **0157**'s evidence sentence, `PILOT.md §2` item 2 and `§6`, and proposal **NNNN**'s evidence for Stage 12d.

### OOOO — T-1 measures the one thing hodos does not claim, and nothing measures the shape of what it ships (raised 2026-09-12, lands in Stage 12c-3)

**Context.** `README.md:12-18` makes five claims: *Project-aware*, *Frugal*, *Bounded*, *Verified*, *Human-gated*. **Frugal** is defined there as context discipline — three skill descriptions in the listing, the diff never in the orchestrator's context, one reviewer, model tiering — and nowhere as *cheaper than a bare session*. `DESIGN.md:18` nonetheless turns that word into "a measured acceptance criterion (§11)", and §11 makes the criterion a **ratio against bare Claude**. The acceptance criterion is named after a claim it does not measure.

What measures the four remaining claims: the **router bench** (path ≥85%, type ≥90%, campaign ≥90%) scores routing; the **review bench** (recall ≥80% ×3, precision ≥85%) scores the reviewer, and `BUILD-PLAN.md:220` records that it is *seeded* — its defects and the reviewer prompt were written in the same stage by the same session, so "its recall number proves the loop runs, not that the reviewer generalises"; **T17**'s hold-out is the repair for that and has not run; T-1's second number counts what hodos caught **in its own work**, and `PILOT.md §6` states in its own words that "the bare arm's quality is unmeasured".

So nothing in the build looks at the **artifact**: whether the abstraction landed in the right layer, whether the change widened the public contract more than it had to, whether coupling or complexity moved, whether the same logic now exists twice. Those are the properties the research → plan → grill → review → verify machinery exists to protect, and the pilot's instrument for them is the developer's acceptance, which is one unrecorded judgement per task.

The pilot project makes this cheap to fix. `ariadne_v2` **is** an architecture-analysis tool: `ariadne fitness check` reports forbidden-dependency violations and cycles, `api-diff` reports the public surface a range added, removed and changed, and `ariadne query` reaches `complexity`, `coupling_report`, `weak_spots`, `refactor_suggestions` and the dead-code roots. All of them run over any branch from the CLI, cost **no tokens**, and produce deltas rather than opinions. Four task branches are merged and measurable today.

**Options.**
(a) **A third number: the shape of what each arm shipped.** Per pair, index each arm's merged tip and report the deltas the project's own tools give — fitness violations introduced, public surface added, complexity and coupling movement, duplication and dead code — beside the cost ratio and the findings count. And demote the multiplier from *acceptance criterion* to *reported price*, which is what `PILOT.md §2` item 7 already treats it as.
(b) (a) plus a **blind comparative review**: the two diffs of a pair stripped of branch names and commit messages, ranked by a fresh reviewer against a written rubric, with the ranking recorded beside the structural deltas. Cons: judge and party — hodos's own reviewer scoring work produced without it — and a soft number next to hard ones.
(c) **The blind comparative review alone**, no structural deltas. Cheapest to build, and it puts the whole quality claim on one model's judgement.
(d) **Nothing.** T-1 stays two numbers; the quality claim rests on a seeded bench and on T17's hold-out. Cons: the seeded bench says of itself that it does not generalise, and T17 scores the *reviewer*, not the shipped code.

**Recommendation: (a).** It is free in tokens, it is objective, and it measures the thing the developer actually asked about. It also uses the pilot project for what makes it a good pilot rather than only as a place to run tasks. (b) is worth buying **after** (a) reports: if the structural deltas separate the arms, the soft ranking adds little; if they are flat, (b) is the only instrument left and the flat deltas are what justify its caveats.

**Cost if wrong.** On tasks this size — a cap on a wire list — the architecture may not move at all, and every delta reads zero on both arms. That result is worth having: it says the pilot's task selection cannot separate the arms on shape, which is a finding about `PILOT.md §3`'s selection and an argument for (b) rather than a wasted measurement. Cost to learn it is one indexing pass per branch and no model call.

**Where it lands.** Stage **12c-3** for the measurement (beside T17 and the digest share), and Stage **12d** for the revision of `DESIGN.md §11` and `§13` the demotion implies.

### MMMM — The bare arm read the hodos arm's plan, and the protocol says two opposite things about it (raised 2026-09-12, lands in Stage 12c-2)

**Context.** `docs/stages/12c2-manual.md` voids a run in which "the bare half told anything that came out of the hodos half's plan, review or verify". `PILOT.md §2` item 2 arranges the opposite on purpose: every unavoidable share is ordered so **hodos pays first**, because a cost paid by the bare task raises the denominator and lowers the multiplier — the conservative direction — and M1's own *Why this half runs first* says in as many words that what the hodos half learns "then flows into the bare half".

Pair 1's bare session took the flow literally. At tool call 17 of 89 — before its first edit, at call 41 — it ran `sed -n '1,120p' .claude/hodos/tasks/api-surface-diff-caps/plan.md`, described as *Read precedent task plan*; at call 52 it read `.claude/hodos/config.json`, described as *Read hodos verify recipes*. It then wrote `.claude/hodos/tasks/cap-fitness-report/plan.md` in the same shape (7 981 bytes, `plan.md` alone — no `state.json`, no `brief.md`, no `ledger.md`, so no engine produced it).

The developer did not lead it there. The hodos half wrote four `[src: .claude/hodos/tasks/api-surface-diff-caps/plan.md …]` citations into the merged trunk — `crates/ariadne-graph/src/economy.rs:421`, `crates/ariadne-cli/src/commands/api_diff.rs:25`, `crates/ariadne-cli/tests/api_diff.rs:8`, `crates/ariadne-mcp/tests/tools_api_surface_diff.rs:8` — and the first sits on `dropped_note`, the exact function pair 1's bare task had to extend. `.claude/hodos/tasks/` is gitignored (`.gitignore:21`) and therefore survives every checkout, so branching the bare arm off an earlier commit would not have removed it either. The plugin itself did not fire: `.claude/hodos/.digest-log` is unchanged at 14 lines, and the engine wrote no task directory.

The direction is the conservative one. Reading a sibling task's plan makes the bare arm cheaper, which lowers the denominator and **raises** the multiplier against hodos. Every reading of pair 1 agrees and none is near the boundary: unweighted token sum **2.21×**, output tokens alone **2.29×**, cache reads alone **2.21×**, and the published price ratios applied as weights **2.24×** — against `standard`'s ≤2× hypothesis.

**Options.**
(a) **Record it as an inherited share under §2 item 2 rather than voiding the run**, and narrow the manual's void clause to what it was aimed at: a leak voids a run when it moves the multiplier **toward** hodos, and a leak in the conservative direction is recorded in the pair's row with its direction named. Pairs 2–5 keep the hodos-first order, which keeps every leak on the conservative side.
(b) **Void pair 1's bare half and re-run it**, with `.claude/hodos/tasks/` moved aside for the duration. Cons: a second bare session (the void one is output 57 009, cacheRead 13 100 582) bought to produce a **larger** denominator — that is, a multiplier more favourable to hodos — and the four merged citations still point into that directory, so the fencing has to be repeated by hand for nine more runs.
(c) **Void and re-run in a second clone** with no `.claude/hodos/` at all. Cleanest isolation, the same flattering direction as (b), plus a second checkout's build, and it makes the bare arm a different environment from the hodos arm — which item 4 exists to prevent.
(d) **Accept it and say nothing.** Cons: the fresh reviewer finds `sed -n '1,120p' … plan.md` in the transcript and the void clause in the manual, and the two do not agree.

**Recommendation: (a).** The pilot's own conservatism rule already decides this case: the bias runs against hodos, and item 2 says such a share is reported with its direction named rather than removed. (b) and (c) spend real money to move the number in hodos's favour, the one direction this protocol has refused everywhere else. What (a) costs is comparability — pair 1's bare arm is *bare, holding a sibling task's plan*, not *bare* — and that is what its row has to say.

**Cost if wrong.** Pair 1's multiplier is an upper bound rather than an estimate; if pairs 2–5 come in materially lower, pair 1 is the outlier to explain and its row already carries the reason. The second number is untouched: the bare arm produces no `review.md` and no `verify.md` either way.

**Where it lands.** Stage **12c-2**: `docs/stages/12c2-manual.md` (the void list), `docs/PILOT.md §2` item 2 and `§6`, `docs/stages/12c2-plan.md` §9.

### NNNN — hodos writes citations into shared code that point at a path no other checkout has (raised 2026-09-12, lands in Stage 12d)

**Context.** `init` writes `.claude/rules/src-citations.md` over `crates/**`: every external API, magic number or architectural choice carries an inline `[src: …]` naming where the fact came from, because "a claim with no `[src:]` is a claim nobody can check later". The same `init` appends `.claude/hodos/tasks/` to `.gitignore` (`skills/init/SKILL.md:54`, decision **0144**). A task that obeys the rule therefore cites its own plan, and the citation ships in the commit: pair 1's hodos half put four of them into `ariadne_v2`'s trunk, one of them on `crates/ariadne-graph/src/economy.rs:421`. For anyone else who clones the repository those four resolve to nothing.

The project's pre-hodos convention has no such hole — `.claude/plans/` is tracked, and the rule's own third precedent cites `plan.md R-C2` out of a tracked file. `verify-citations.mjs` does not catch it either: these citations carry a decision id (`D1,D5`), not a `file:line`, so the detector that would have named them deliberately skips them.

This is also the mechanism behind proposal **MMMM** — the citations are what led pair 1's bare session to the hodos arm's plan. And it reproduces itself outside the engine: that same bare session, with no plugin loaded, copied the convention into six citations of its own and then wrote the plan they point at (decision **0159**). Eleven dangling citations are in the tree — four from pair 1's hodos half, one from pair 2's, six from a session that had no hodos at all.

**The count at Stage 12c-2's T25 (2026-09-29).** `git grep -o '\.claude/hodos/tasks/[a-z0-9-]\+' <rev> -- . ':!.gitignore'` in `ariadne_v2` counts **15** at D1's base `d133bed`, **23** after D1 and **32** after D5, across 12 files. The five duplicate pairs' bare arms added none. The 17 the pairs added all come from the two tasks that wrote an ADR: eight in `docs/adr/0035-doc-project-token-budget.md` and nine in `0036-doc-module-token-budget.md`. So option (c) below is what already happened, and it did not close the hole. Each ADR cites the plan it records, for example `[src: .claude/hodos/tasks/doc-module-token-budget/plan.md D1]` at `0036:63`. D5's reviewer raised the nine as a minor against the project's own `adr-format.md` reachability rule. D5's finish proposed a hook that checks every `[src:]` path is tracked, and it recommended keeping the task directory *because* the ADR cites it. D5's bare arm wrote the same ADR with every `[src:]` pointing at a tracked file or a dated measurement.

**Options.**
(a) **A guard in the engine**: `config.mjs check` refuses a `[src:]` that points inside `.claude/hodos/tasks/`, and the writing phases inline the fact instead — the decision's sentence, not its address.
(b) **Track the task directory.** Drop `.claude/hodos/tasks/` from what `init` ignores, so the citations resolve for everyone. Cons: decision **0144** put it there deliberately, and plan, research, ledger and evidence then land in every reviewer's diff.
(c) **Cite a decision record, not the plan.** A task needing a citable fact writes an ADR in the project's own `adr-format.md` and cites that. Cons: it turns every capped-list decision into a document the developer must approve, and on its own it moves the dangling citation into the ADR rather than removing it (the count above).
(d) **Nothing, documented.** A `BACKLOG.md` line and a sentence in `AUTHORING.md`. Cons: thirty-two dangling citations are already in a real repository (the count above), and nothing in the engine stops the next task writing more — or, as decision **0159** shows, the next bare session copying the convention.

**Recommendation: (a).** It keeps decision 0144's gitignore and keeps the citation rule, and it moves the fact to where the reader is — the same repair `PILOT.md §5` records for `adapter-type-boundary.md` after the crate split, where a citation to a moved path was replaced rather than followed.

**Cost if wrong.** A doc comment carries a sentence instead of a pointer and grows a line or two; the plan still holds the full reasoning for whoever has the checkout.

**Where it lands.** Stage **12d**: `scripts/config.mjs` and its tests, `skills/init/references/rules.md`, `skills/rule/SKILL.md`, `docs/AUTHORING.md`, and the thirty-two citations already in `ariadne_v2` (counted 2026-09-29).

### LLLL — The multiplier divides two numbers whose stop conditions are unstated (raised 2026-09-10, lands in Stage 12c-2)

**Context.** `docs/PILOT.md §2` is the protocol written before the runs, and it fixes eight properties of the two arms. When a task is **finished** is not among them. The hodos arm stops at `Finish: report delivered`, behind a review `ACCEPT`, a verify `PASS` and a green `config.commands.test`; the bare arm is a plain `claude` session with no stop written anywhere. T-1 is the ratio of the two, so the unstated half decides the number.

**Options.**
(a) **The same objective bar in both arms** — the project's own `cargo nextest run --workspace` and `cargo clippy --workspace --all-targets --all-features -- -D warnings` green, the commit accepted by its `commit-msg` hook, and the developer's acceptance — with the hodos arm's review, verify and mutation phases counted inside its cost rather than imposed on the bare arm.
(b) (a) plus a wall-clock cap per task, after which the task is recorded unfinished with its cost. Cons: a censoring rule the multiplier then has to state and read.
(c) **Nothing.** The developer's acceptance is the stop. Cons: the fresh reviewer cannot tell whether the two arms stopped at the same place, which is a finding by `STAGE-PROTOCOL.md §4`'s own scoring.

**Recommendation: (a).** It is the project's own quality layer rather than a standard invented for the measurement, and it is already `config.commands.test` and `config.commands.lint` in the pilot's config. The direction it biases is disclosed rather than argued away: the bar binds the bare arm, raising the denominator and lowering the multiplier, which flatters hodos — taken because the alternative is not a conservative number but an incomparable one.

**Cost if wrong.** A bare task that meets the bar expensively reads as a cheap multiplier, and the per-task table is what a reader corrects it from. A task that cannot reach the bar is recorded unfinished with its reason, which is (b) applied once by name instead of as a standing rule.

**Where it lands.** Stage **12c-2**, before the first run: `docs/PILOT.md §2` and `§6`, `docs/stages/12c2-plan.md`, `docs/stages/12c2-manual.md`.

### IIII — Two terminals raise one environment, and the record cannot say whose raise it is (raised 2026-09-10, lands in Stage 12d)

**Context.** Decision **0074** gives the raise to the kernel and the teardown to a record on disk: `.claude/hodos/env/<layer>.json` holds the pid, the command, the `stop` and the `cwd`, and `env.mjs down` stops "the layers this machine raised, and only those" (`FORMATS.md §1`, `COMPONENTS.md §3`). The record says *this machine*. It does not say *which session*, and the guard built on it is sequential: `up` reads the records, finds a live pid, re-reads the layer's own proof and leaves the layer alone (`env.mjs:317-320`), which is why running `up` twice raises once.

Two terminals defeat it three ways. **Concurrently:** both probe the layer `down` before either has written a record (`env.mjs:304`, `:351`), both spawn, the second `writeRecord` overwrites the first pid, and `down` then stops one process and orphans the other — the shape `BACKLOG.md:91` already found in the wild, two `vite` servers on 5174/5175 alive for days in a fixture copy with no `.claude/hodos/env/` for `down` to find them by. **On teardown:** `env.mjs down` in terminal B stops the layer terminal A is verifying against, and A's browser rows go red for a reason that is not the code's — `BACKLOG.md:42`'s failure from the other end. **In the log:** `spawnLayer` truncates `<layer>.log` at every raise on purpose (`env.mjs:244`), so the diagnosis a preparer reads belongs to whichever raise was last rather than to the one that failed.

**Options.**
(a) **An owner on the record, and both commands read it.** The record gains `session` from `sessionOf()` — the id decision **0047**'s claim pointers already resolve (`PLATFORM-NOTES.md` facts 37 and 39); `up` refuses to spawn a layer whose record names a **live** pid from another session, naming that session and the pid; `down` stops the layers whose record names this session, with `--all` for the developer who means every one of them. An ownerless record — the id unreachable — is stopped by `down` as it is today.
(b) **A lock per layer.** `openSync(<layer>.lock, 'wx')` around probe-and-spawn; the loser waits for green or reports the holder. Cons: a crashed holder leaves a lock with no lifetime rule, which is the problem (a) answers with the pid it already stores.
(c) **Refuse only, no ownership.** `up` re-reads the record immediately before `spawn` and refuses on a live pid; `down` unchanged. Cheapest, no format change — and it leaves the worst of the three, B's `down` killing A's server.
(d) **Nothing, documented.** "One terminal raises the environment for a project" in `DESIGN.md §7.4` plus a `BACKLOG.md` line. Costs nothing and is checkable by nobody.

**Recommendation: (a), with (c)'s re-read inside it.** The owner is the only field that makes the third failure — a teardown that hits somebody else's run — decidable at all, and it is one key in a file no project writes: `.claude/hodos/env/<layer>.json` is the engine's own gitignored record, so the format cost stays inside the engine. The re-read immediately before `spawn` narrows the concurrent window without buying a lock's lifetime problem.

**Cost if wrong.** A developer who raises in one terminal and tears down in another meets a refusal and needs `--all`; the refusal names the session and the pid, so what to type is on the screen. Where the session id is unreachable (fact 39) records are ownerless and the behaviour is exactly today's — which the acceptance criterion runs rather than assumes.

**Where it lands.** Stage **12d**: `scripts/env.mjs` (`writeRecord`, `up`, `down`), `scripts/env.test.mjs`, `FORMATS.md §1` (the record's fields), `COMPONENTS.md §3`'s `env.mjs` row, `DESIGN.md §7.4`.

### JJJJ — A campaign claim is written without reading the claims that already exist (raised 2026-09-10, lands in Stage 12d)

**Context.** Decision **0135** reads claims off the refs — `claimsOnRefs` (`campaigns.mjs:238`), two git processes whatever the number of branches — and `frontier` reports a node another ref holds as `claimed` rather than `ready`. Stage 9b's criterion is that "the second session is not silently given the node", and `skills/campaign/SKILL.md:60` tells the model not to propose one the frontier reported as claimed. The **write** reads none of it: `cmdClaim` (`campaigns.mjs:622`) rewrites the node to `[active] … @owner` with no claim check at all (`:629`), so `campaigns.mjs claim <slug> <node> <owner> <branch>` on a node held on another branch succeeds and prints its own success. The criterion is carried by a sentence in a skill and by nothing in the script that skill calls — the asymmetry decision **0091** and `config.mjs check` exist to close elsewhere: a rule stated only in prose is off wherever the prose is not read.

**Options.**
(a) **`claim` reads `claimsOnRefs` and refuses**, printing the owner, the branch and the ref that carries the claim; `--force` writes anyway, for the race the developers settled between themselves (`DESIGN.md §9`).
(b) **Warn and write.** The foreign claim is printed, the node is taken. Cons: for everything downstream this is today — two `[active]` lines on one node in two refs, and the merge decides.
(c) **Prose only.** The skill's sentence stays the whole mechanism and the script stays a writer.
(d) **Nothing.**

**Recommendation: (a).** The read exists and is already paid for by `frontier`; what is missing is one call at the write. `--force` keeps "races resolved socially" available and leaves the settlement in a command the developer typed rather than in a silence. It does not close the window `DESIGN.md §9` names — a claim reaches another checkout only once committed — and the decision says so: what it closes is a claim written over a claim the refs already carry.

**Cost if wrong.** A stale claim on an abandoned branch blocks a legitimate one until `--force`, and the refusal names the branch, which is what tells the developer to prune it. `refsOf`'s cap of 50 and the fail-open `git` reads (`campaigns.mjs:200-215`) bound the rest: a claim in a repository git cannot answer for is written, as today.

**Where it lands.** Stage **12d**: `scripts/campaigns.mjs` (`cmdClaim`, `USAGE`), `scripts/campaigns.test.mjs`, `COMPONENTS.md §3`'s `campaigns.mjs` row, `skills/campaign/SKILL.md`'s claim step, and decision 0135's reach restated in the settling decision's *Applied in*.

### KKKK — `active` is written by every claim, so a caller with no session id reads whoever claimed last (raised 2026-09-10, lands in Stage 12d)

**Context.** Decision **0047** made the claim pointer per session — `.claude/hodos/sessions/<id>` first, `.claude/hodos/active` second (`config.mjs:240`) — so that two terminals on one repository do not take each other's ledger line, Stop block or denied commit. `claimFor` writes **both**, unconditionally (`ledger.mjs:482`), which leaves `active` naming whichever session claimed last. A caller whose id is unreachable then reads a stranger's task: `sessionOf()` is a hook payload's `session_id` or the **undocumented** `CLAUDE_CODE_SESSION_ID` (facts 37 and 39), and where neither is there the fallback is the whole resolution. What 0047 settled is that a session with an id gets its own pointer; what it did not settle is what `active` means once a second session has claimed.

**Options.**
(a) **Write `active` only for an id-less claim.** A session with an id writes its own pointer and leaves `active` alone, so the fallback file keeps meaning what it exists for — the single-session path.
(b) **Bound the fallback read.** `activeTask` uses `active` only where `sessions/` holds no pointer at all; where it holds one, a caller with no id reports that this session has no claim and the gate stays open — the direction `git-guard.mjs` already takes on an unparsable payload (`:186`, "fail open: an unparsable payload is not a decision").
(c) **Both.**
(d) **Nothing.** `active` keeps the last claim, and the ambiguity stays in the two hooks that read it.

**Recommendation: (c).** (a) makes the file mean what its own fallback needs; (b) makes the ambiguous case fail open rather than act on another session's task, which for a Stop block and a commit denial is the safe direction. Together they are a few lines in the two places 0047 already touched, and `ledger.mjs sessions` already prints the state a developer would ask about.

**Cost if wrong.** On a machine where the id is unreachable, a **second** terminal gets no gate rather than the wrong one: a Stop that does not block, a commit that is not denied, the ledger unchanged. That is a weaker guard, not a wrong action, and `ledger.mjs sessions` names the machine it happens on.

**Where it lands.** Stage **12d**: `scripts/ledger.mjs` (`claimFor`), `scripts/config.mjs` (`activeTask`), `scripts/ledger.test.mjs` and `scripts/config.test.mjs`, `DESIGN.md §5`'s sentence naming the two pointers, and decision 0047's reach restated in the settling decision's *Applied in* — 0047 itself is append-only.

### DDDD — The developer's own instruction is a fourth route into a file, and no document names it (raised 2026-09-08, lands in Stage 12b)

**Context.** Decision **0146** gave `init` one route past its invariant: a file that names an instruction the ledger retires, edited through its own approved row. Stage 12b's review 1 found a **fourth** authority in the same run, which neither the invariant nor 0146 describes. Five `.claude/skills/*/SKILL.md` (−587 lines) were deleted because the developer **said so in a message** mid-run — after `init` had declared them kept in row 1's own option text (*"The five SKILL.md files still load when you type /spec-plan"*), declared them off-limits earlier in the run, and reported *"Nothing else in the repo moved"*. No step-4 row named them and no approval call asked about them.

Nothing about the outcome is wrong: they are the developer's files, the developer asked, and the run did it and reported it. What is missing is the record. An `AskUserQuestion` answer is captured in the ledger's `Approved` column and in the report; a sentence typed into the chat is captured nowhere, so the layer's own account of what moved and why is short by five files — and that account is what a teammate reads six months later, and what an acceptance criterion is checked against.

**Options.**
(a) **A chat instruction becomes a row before it becomes a write.** The run writes the row — instruction, `file:line`, settlement, what is lost — shows it, and applies it on the confirmation. One extra exchange, and the ledger stays the complete account of what moved.
(b) **Record it after the fact**: apply immediately, then append the row to the ledger and the report marked `by your instruction, <quote>`. No extra exchange; the record is written by the same agent that acted, with nothing standing between the ask and the write.
(c) **Name it in the invariant and leave the record to the report's prose.** Cheapest, and the report's prose is exactly what criterion 6 could not check.
(d) **Nothing.** The developer's word is authority enough, and a run that asks them to confirm what they just asked for is the pedantry principle 16 warns about.

**Recommendation: (b).** The gap is a record, not a permission: (a) buys a confirmation for a decision already made in plain words, which is the loop decision **0133** refused for a decline. (b) closes the record at the cost of one appended row, and the row is falsifiable — the quote is in the transcript. (c) puts the fact in the one place the criterion cannot read. (d) leaves an acceptance criterion permanently unable to account for five files.

**Cost if wrong.** A row appended after the fact reads as a rationalisation rather than a decision, since the write already happened. The quote is what keeps it honest, and the ordering is visible in the ledger — a `by your instruction` row sits after the approvals, not among them.

**Where it lands.** Stage **12b**: `skills/init/SKILL.md` invariant 1, `skills/init/references/migrate.md` (the settlement list and the approval section), decision **0146**'s *Applied in*, and criterion 6's cell in `docs/stages/12b-report.md`.

### EEEE — The migration ledger dropped two columns and bundled instructions, and nothing noticed (raised 2026-09-08, lands in Stage 12b)

**Context.** `references/migrate.md:9` gives the step-4 ledger six columns — `# | Instruction | Where | Settlement | Evidence | What is lost` — plus `Approved` at step 5; `COMPONENTS.md:126` names "evidence, what is lost, approval flag"; `DESIGN.md:367` says "each with evidence". The pilot's Table 4 printed **five**: `# | Instruction | Where | Settlement | What is lost`. No `Evidence` column and no `Approved` column exist anywhere in the run, and rows 16–18 carry no count at all — which is what `migrate.md:13` defines Evidence to be: the instruction's `file:line` **plus** the places the code follows it and breaks it. Three rows are also file-level verdicts, `migrate.md:51`'s own first anti-pattern: row 19 bundles five instructions, row 15 three ranges, row 2 five invariants, each under one `delete`.

The run's own quality is not the question — the settlements were argued and the developer approved them. The question is that a reference's table shape is prose, and prose is what a run under budget compresses first. Every other contract in the engine that matters this much has a check behind it: `lint.mjs` for the caps and the frontmatter, `config.mjs check` for the config, `verify-citations.mjs` for the precedents. The ledger has none.

**Options.**
(a) **A step-4 completion check the run must state.** `migrate.md`'s Completion gains: the table has all six columns, one row per `file:line`, and every row's Evidence carries a count for the follows/breaks pair — with the run printing the three numbers (rows, distinct `file:line`, rows missing a count) before the approval. Prose, but falsifiable prose the reviewer can check against the transcript.
(b) **A script.** `ledger-check.mjs` parses the printed table out of the run's own file and fails on a missing column or a bundled row. Cons: the ledger is not written to disk at step 4 — it is a table in the session — so the script would need a file that does not exist, which is a new artefact and a new format.
(c) **Narrow the contract to what a run actually needs.** Drop `Evidence` as a column and keep it inside `Where`; drop `Approved` and let the report carry the approvals. Cons: `migrate.md:13`'s definition of Evidence is the counts, and the counts are what make a `delete` defensible; the pilot's rows 16–18 show what their absence reads like.
(d) **Nothing.** Record the deviation in `BACKLOG.md` — already done — and let 12c's twenty tasks say whether it recurs.

**Recommendation: (a).** It puts the check where the reference already speaks, costs no new artefact, and turns "the table has six columns" from a shape a reader must remember into three numbers a run must print. (b) invents a file to check a table. (c) trades the mechanism decision 0022's spirit asks for — evidence beside a claim — for the convenience of the run that skipped it. (d) is the state review 1 filed as a blocker.

**Cost if wrong.** Three numbers printed before every approval that nobody reads, and a run that prints them and still bundles a row. The reviewer's own check is what catches the second case, and the numbers are what makes that check one grep rather than a re-reading of twenty rows.

**Where it lands.** Stage **12b**: `skills/init/references/migrate.md` (the ledger section and its Completion), and `docs/stages/12b-report.md`'s account of the run.

### AAAA — `init` wrote two files it does not own, and one of them had no row (raised 2026-09-08, lands in Stage 12b)

**Context.** `skills/init/SKILL.md`'s first invariant is absolute: init owns `CLAUDE.md`, `.claude/rules/*.md`, `.claude/hodos/config.json`, the `.gitignore` lines it appends, `permissions.allow` in `.claude/settings.local.json` and any approved hook in `.claude/settings.json` — *"Every other file in the repository stays exactly as it is."* `references/migrate.md` names the files a ledger row may act on, and they are AI-instruction files: `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/*.mdc`, `.cursorrules`, `.github/copilot-instructions.md`, `.windsurfrules`, `.claude/**`.

M1 modified two files outside both lists. **`CONTRIBUTING.md`** (−14 lines: `## Spec lifecycle`, `## Audit gate`) was asked on its own `AskUserQuestion` row, with the ownership stated in the question — *"It is a human-facing committed doc, not one init owns, so this is your call"* — and the developer chose *Delete both sections*. **`.github/PULL_REQUEST_TEMPLATE.md`** (−1 line, the audit-verdict checkbox) was **not in the step-4 ledger** at all: rows 1–20 never name it, none of the three approval calls mentions it, and it was found and edited during step 8, then reported afterwards in the final table. Evidence: the harvested transcript's edit at the `PULL_REQUEST_TEMPLATE` write and the report row *"removed the audit-verdict checkbox — it had become untickable on every PR"*; `git diff 7673512 -- .github/PULL_REQUEST_TEMPLATE.md`.

Both are also what `BUILD-PLAN.md` Stage 12's criterion reads on: *"no `ariadne_v2` file outside `.claude/` and `CLAUDE.md` modified by init"*. `12b-plan.md §2.1` had already corrected that wording for `.gitignore`, on the invariant's own authority. These two are not in the invariant, so the criterion **fails as worded** and the reading that would save it does not exist yet.

**Options.**
(a) **The invariant is absolute, and a file outside it is a report line.** A retired instruction leaving a dangling reference in a human doc is reported with its `file:line` and the developer edits it — or asks for the edit in a later session where the file is theirs to name. `migrate.md`'s input list stays what it is, and step 8 gains one sentence: a settlement whose consequence lands outside the list is reported, never written.
(b) **Widen the list to "any file naming a retired instruction", one approval row each.** What M1 did for `CONTRIBUTING.md` becomes the documented shape, and the PR-template write becomes the only defect. Cons: init's blast radius becomes any file in the repository, decided per run by what it greps.
(c) **Status quo.** Neither list changes and the invariant keeps saying "every other file stays exactly as it is" while a run writes past it with an approval. Cons: the sentence is then untrue and the criterion unenforceable.

**Recommendation: (b) for the reach, (a) for the default, and the defect named either way.** The developer's own row is the mechanism working — the question stated the ownership and the answer decided it — and a dangling `/spec-audit` in a contributor doc is a real cost of a migration hodos performed. So the list widens to *a file that names an instruction this ledger retires*, with its own row and never in the batch. What is not defensible under any option is the PR template: no row, no approval, a write. That is the finding, and it stands in the report as a criterion failure whatever the wording becomes.

**Cost if wrong.** Under (b) a run can propose an edit to any tracked file, and a developer who approves fast approves a wider change than they read. The bound is the same one that already holds: one row, one approval, never in the batch, with "what is lost" filled in.

**Where it lands.** Stage **12b**: `skills/init/SKILL.md` invariant 1 and step 8, `skills/init/references/migrate.md`'s input list, `docs/BUILD-PLAN.md` Stage 12's criterion, `docs/stages/12b-plan.md §2.1`, and the report's T9 row.

### BBBB — "every rule cites `.rs`" is the wrong shape of the guard decision 0021 wanted (raised 2026-09-08, lands in Stage 12b)

**Context.** Decision **0021** guards against the pilot's own failure mode — rules that describe the retired workflow instead of the code — with the sentence *"every rule `init` writes must cite a `file:line` precedent in `.rs` source"*, and `BUILD-PLAN.md` Stage 12 carries it as an acceptance criterion. M1 wrote seven rules. Five cite `.rs`. Two do not, and both are right not to: `adr-format.md` governs `docs/adr/**` and cites `docs/adr/_template.md:4` and two ADRs; `commit-scope-coupling.md` governs `cog.toml` and `.github/workflows/ci.yml` and cites `cog.toml:3` and `docs/folder-layout.md:55`. A `.rs` precedent for either would be a fabrication. All 23 citations and 18 anchors resolve (`verify-citations.mjs`, exit 0), and no rule cites anything under `.claude/`.

So the criterion fails on two rules whose evidence is exactly what their subject demands, while the property 0021 actually wanted — no rule is about the old workflow — holds completely.

**Options.**
(a) **Reword the guard to what it guards.** No precedent under `.claude/`, and every rule whose `paths:` name `.rs` files cites `.rs`. Both halves are mechanical, and `lint.mjs --project` already resolves citations.
(b) **Keep the letter and record two criterion failures**, with the note that the two rules are correct. Cons: a criterion that a correct run cannot pass is a criterion nobody will read twice.
(c) **Forbid rules outside `.rs` on this project**, so the letter becomes satisfiable. Cons: it deletes two rules the developer approved, on evidence, to protect a sentence.

**Recommendation: (a).** The precedent-file-type test was a proxy for "not about `.claude/`", and the proxy has now met a project where the two differ. The reworded pair says the same thing and is checkable on any stack — which is what a criterion carried into 0.2 needs.

**Cost if wrong.** A rule about a non-`.rs` file could describe the retired lifecycle while citing, say, `docs/`. The `.claude/` clause is what closes that, and the report names every rule's precedents anyway.

**Where it lands.** Stage **12b**: `docs/BUILD-PLAN.md` Stage 12's criterion, decision **0021**'s *Applied in* list, and the report's T10 row.

### CCCC — an unrun command was recorded with the developer's approval, and the format cannot say so (raised 2026-09-08, lands in Stage 12b)

**Context.** `references/config.md` is unambiguous: a command reaches `config.json` after it **ran green in this session**, and *"a command recorded unrun"* is the reference's own anti-pattern. `SKILL.md`'s Completion repeats it. M1 met a command that cannot run in a session — `slo_release_gate` is `#[ignore]`d because it clones a multi-GB corpus (`crates/ariadne-e2e/tests/slo.rs:57`) — asked the developer with the anti-pattern named, and the developer chose *"Record it, flagged unrun"*. It is now `verify.recipes[]`'s `perf` entry, and **nothing in the file marks it**: `config.mjs check` passes, `verifiedAt: 2026-09-08` asserts that the recorded commands ran, and the one recipe that never ran is indistinguishable from the two that did.

The developer's answer is the right one for the project — that recipe is the only mechanism that would catch the performance regressions the interview's first answer named — and the format has nowhere to put it.

**Options.**
(a) **A per-recipe marker.** `"verifiedAt": null` on a recipe that has not run, or a `"unrun": true` flag; `config.mjs check` reports it as a **warning** naming the recipe, and the verify phase's row for it says `not verified in this session` rather than resting on the config's claim.
(b) **`verifiedAt` becomes per-command**, so the top-level date stops speaking for entries it never covered. Broader, and it touches every reader of the field.
(c) **Report-only.** The recipe is written and the fact that it never ran lives in `init`'s report, which nothing reads later. Cons: it is the state we are in, and it is why this proposal exists.
(d) **Refuse to write it.** The command stays out of the config until a session runs it. Cons: it makes the developer's answer unavailable, on a project where the honest answer is "this one cannot run here".

**Recommendation: (a).** One optional field, one warning, and the claim `verifiedAt` makes stays true. It also gives the verify phase the sentence it needs when that recipe fails: a row that has never been green is a different fact from a row that regressed.

**Cost if wrong.** A field a project can set and forget, marking a recipe unrun forever while it has long been runnable. The warning is what keeps it visible, and `--refresh` re-runs the recorded commands anyway.

**Where it lands.** Stage **12b**: `docs/FORMATS.md §2` (`verify.recipes[]`), `skills/init/references/config.md`, `scripts/config.mjs` `check` and its tests, `skills/run/references/verify-loop.md`, and the report's T8 row.

### YYY — The instrument writes a file into the developer's repository, and nothing says whether git sees it (raised 2026-09-08, lands in Stage 12b)

**Context.** Decision **0141** puts `.claude/hodos/.digest-log` in every hodos project from 12b on, and calls it "engine-internal state with no config surface". Its *Applied in* list names `scripts/state-digest.mjs` and `scripts/state-digest.test.mjs` — and a file written into a project is not covered by the two files that write it. `FORMATS.md:38` enumerates the lines `init` appends to `.gitignore` — `tasks/`, `active`, `sessions/`, `env/`, `history.jsonl`, `.claude/settings.local.json` — and `skills/init/SKILL.md` step 6.4 writes exactly that list. `.digest-log` is in neither, so on the pilot it appears as an untracked file in `git status` from the first session after `init`, and can be committed by the same hand that commits the layer. A committed log mixes another machine's lines into a sample whose whole content is one machine's session starts. `FORMATS.md §2` already states the general rule for the neighbouring case — the `env/` records are "gitignored, like every other per-machine file under `hodos/`" — which is the sentence this file's absence from the list contradicts.

**Options.**
(a) **`init` teaches the project to ignore it.** One line appended to `FORMATS.md:38`'s list, one to `SKILL.md` step 6.4, and one to 0141's *Applied in*. Every project initialised from 0.2 on ignores the log. Cons: a released format grows a row for a file decision 0141 says is deleted or replaced at 12d — and if it is replaced, the row has to be edited again in the same stage that would have added it.
(b) **The pilot's `.gitignore` gets the line by hand, and the engine grows nothing.** One line the developer adds to `ariadne_v2`'s own `.gitignore` in the same commit as the layer, named in `12b-report.md` as a pilot-local write. 12d then adds the engine row **once**, for whichever file survives: `.digest-state` if the number buys suppression, nothing at all if it does not. Cons: `.gitignore` is a file the criterion's diff reads, so the line has to be stated in the report as the pilot's and not `init`'s; and a second project running 0.2's `init` before 12d would see the untracked file.
(c) **Leave it visible.** The log shows up untracked, the developer ignores it, and T9's paste explains it. Cons: the failure it invites is silent and one commit away — a log with two machines' lines in it does not announce itself, and the statistic it feeds is the gate on 12d's build.
(d) **Write the log outside the repository** — under the plugin's own directory or a temp path keyed by project. Cons: it stops being per-project state, and the file that decision 0141 replaces it with (`.digest-state`) has to live in the project because it is read on every session start of that project.

**Recommendation: (b).** The engine gains a documented row only for a file that outlives the measurement, and 12d is where that is known. The pilot is the only project that has the log before then, one line covers it, and the report says whose line it is. (a) is the same work done earlier against a file that may not exist in a week, and edited twice. (c) trades the sample's integrity for nothing. (d) moves the log away from the state it is a measurement of.

**Cost if wrong.** Under (b), a project other than the pilot runs 0.2's `init` between 12b and 12d and carries one untracked file it did not ask for; the fix is the line, which is what (a) would have written. Under (a), the row is written twice or removed at 12d, in the specification file every installer reads.

**Where it lands.** Stage **12b**: `docs/stages/12b-plan.md` T7, `ariadne_v2`'s `.gitignore` or `docs/FORMATS.md:38` + `skills/init/SKILL.md` step 6.4 by the option taken, and decision **0141**'s *Applied in* list either way.

### ZZZ — The digest has two callers and one line format, so the log cannot say what a session start was (raised 2026-09-08, lands in Stage 12b)

**Context.** Decision **0141** fixes the log's line at `<sha256>\t<iso8601>` and defines the statistic as "the share of session starts in a hodos project whose digest text is byte-identical to that project's previous session's". The bare digest has **two** callers, not one: the `SessionStart` hook (`hooks/hooks.json:11`) and the `` !`node ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs` `` injection at the top of **every kernel** (`COMPONENTS.md:38`). Both invoke the same script with no arguments, so a two-field line cannot tell them apart — and the kernel injection fires inside a session whose SessionStart already emitted the same text minutes earlier. On the pilot's own twenty tasks that is the common case, and every one of those pairs reads as a repeated session start: the number 12d's build is gated on would be inflated by the instrument, in the direction of building.

Reading stdin is not the way out. The hook receives `session_id` in its payload (fact 38), but the same script is a `` !`…` `` injection where stdin belongs to the shell and a blocking read aborts the invocation at turn 0 (fact 14) — the comment above `compactLine` is that finding.

**Options.**
(a) **An explicit flag the hook passes.** `hooks/hooks.json` calls `state-digest.mjs --log`, and only that caller writes. Keeps 0141's two-field line. Cons: a new documented CLI surface — `--help`, the `state-digest.mjs` row of `COMPONENTS.md §4` — for a script whose flags are enumerated in three places, added for an instrument that is deleted or replaced at 12d; and it measures nothing about the second caller.
(b) **Log every bare emission, two fields.** Nothing new anywhere. Cons: it is the inflation above, in the gate's own numerator.
(c) **A third field: the session id.** `<sha256>\t<iso8601>\t<CLAUDE_CODE_SESSION_ID>` — set per session in both the injection and a Bash call, unchanged across `--resume`, verified as fact **37**, with fact **39** as its documented fallback. The statistic is read off the **first** line of each session id, in timestamp order, which is the `SessionStart` emission whichever caller ran first; the lines after it in the same session are the kernel injections, which is the second question 0141 did not ask and 12d's suppression would also answer. Touches exactly the two files 0141's *Applied in* names, and adds no CLI surface. Cons: it deviates from the line format the decision wrote, and it writes a session identifier into a file in the project — local, per-machine, and deleted at 12d, but written.
(d) **Log only where the id is absent from the previous line** — infer the session boundary from the text. Cons: an inference where an environment variable states the fact.

**Recommendation: (c).** It is the option that keeps the number honest without buying a flag: the primary statistic is computed from one line per session, exactly as 0141 defines it, and the same log answers what a within-session re-emission costs — which is the saving 12d's mechanism would actually collect, since the suppression lives in the script both callers run. (a) is correct and narrower, and pays a documented flag for it. (b) hands 12d a number biased toward its own build. (d) replaces a verified fact with a guess.

**Cost if wrong.** A third field in a per-machine file that no script but its own reader parses; if `CLAUDE_CODE_SESSION_ID` is ever gone (it is undocumented, fact 37, and under the re-probe rule) the field is empty and the log degrades to option (b)'s reading — which is the number 0141 asked for with the bias named in the report, not a broken instrument. Reversible by deleting the file.

**Where it lands.** Stage **12b**: `scripts/state-digest.mjs` and its test at T7, `docs/stages/12b-plan.md §2`, and decision **0141**'s *Applied in* list.

### XXX — Decision 0122's count has no route to either agent that reads it (raised 2026-09-08, lands in Stage 12a)

**Context.** Decision **0122** was taken as option (d): the ledger records `Task <n>: mutation (<k> tests)`, the verifier's mutation row carries `· 1 of <k> new tests` in its Evidence cell, and the reviewer compares `<k>` against the test declarations the diff adds, calling a mismatch a `major`. The writer's half is built and green (`scripts/ledger.mjs`, 56 tests, three mutations proven). The readers' half cannot be written as the decision's *Applied in* list stands.

The reviewer's inputs are closed and enumerated — "The dispatch names paths, and nothing else arrives with it": `review-input.md`, the rules directory, `config.json`, `defaults.md`, and on a re-review the previous findings (`agents/hodos-reviewer.md:15-23`, `COMPONENTS.md §2.1`). None of them carries a ledger line, and `FORMATS.md §8`'s package has no section that could. The decision's own sentence — "the number of tests the diff adds is derivable from the diff the reviewer already holds, so the comparison needs no new input" — is true of the **diff** side of the comparison and silent about the other side: `<k>` is in `ledger.md`, which the reviewer never sees.

The verifier is one step better and still not covered. Its inputs name a **plan path** under `tasks/<slug>/` and an **evidence path** under the same directory (`agents/hodos-verifier.md:18-27`), so it can reach `ledger.md` by sibling path — but reaching a file the contract does not name is exactly the kind of inference that closed list exists to prevent, and an agent that reads an unnamed file is a finding at its own review.

Neither `docs/FORMATS.md §8` nor `scripts/review-package.mjs` nor the two agents' *Inputs* contracts appear in decision 0122's *Applied in* list. This is the applied-in list being short by the one hop the mechanism travels, not a change to what 0122 decided.

**Options.**
(a) **The package carries the count; the verifier's contract names the ledger.** `review-package.mjs` reads `tasks/<slug>/ledger.md` — it already computes `taskDir` (`scripts/review-package.mjs:500`) — and writes one header line, `Mutation: T1 3 tests · T2 0 tests`, or `Mutation: —` where the ledger holds no such row; the `--target` variant, which owns no task and no ledger, carries none, as it already carries no plan sections. The verifier's Inputs gain **ledger path** in the line that already names the plan path. Two contracts widen by one line each, and the reviewer compares what its own subject states.
(b) **Give the reviewer the ledger path** as a fourth dispatch input and let it read the row itself. No format change to the package. Cons: the reviewer gains a file whose whole grammar it must then hold, and `review-input.md` stops being the complete subject of the review — which is the property that makes a package reproducible and a review re-runnable from one file.
(c) **The script does the comparison.** A `## Mutation` section carrying both sides — the ledger's `<k>` and the count of test declarations the diff adds — with the reviewer only judging the verdict. Cons: it makes the script the counter of the diff side, where decision **0100** deliberately keeps `## Callers` to pointers a reviewer judges; and a computed disagreement in the package is a finding written by a grep.
(d) **Drop the reviewer half.** Keep the ledger row and the verifier's Evidence cell; let the count stand as a record a human reads in the finish report. Cons: option (a) of 0122 was taken *because* a count is as writable as `test red` is, and its whole value is a second reader who can contradict it from the diff. Without that reader the row is one more self-report.

**Recommendation: (a).** The package is the reviewer's subject and a claim the reviewer is asked to check belongs in it; the line is computed from a file the script already sits beside, and it fails visibly — `Mutation: —` on a diff that adds three test declarations is the silence decision 0122 exists to end, readable by the reviewer with no new grammar. (b) is one dispatch argument cheaper and breaks the one-file property. (c) buys precision by moving a judgement into a script. (d) keeps the honest half — the verifier's cell, which is decision 0122's option (c) — and gives up the check that made option (a) worth taking.

**Cost if wrong.** One header line in a generated file and one word in two Inputs lists. A `Mutation:` line nobody reads costs one line of package; a wrong `<k>` is contradicted by the diff beside it, which is the point. Reversible by deleting the line and the sentence that reads it.

**Stage.** Stage 12a, settled at this part's build — the writer's half is in the tree unco-committed and waiting on the answer, because decision 0122's *Applied in* says the two halves land in one commit: a format clause an agent has not been given reads to its own review as a defect, which is what Stage 11d-3 paid for.


### NNN — A pin and the route list that decides whether it is read (raised 2026-09-07, lands in Stage 11d-3)

**Context.** Stage 11d-3's **M2** ran `init --refresh` on a copy where the landing route was deleted from `src/App.tsx` while a `checks[]` entry still named it. The run produced two proposals about the same route: `C1`, prune the pin on `/`, put on its own row because `SKILL.md:73` says a prune is never batched; and `C2`, refresh `verify.recipes[ui].routes` from `["/", "/orders", "/orders/:id"]` to the current table, put **in** the five-row batch. Nothing in the file orders them, and the batch could have been approved alone.

That order is not neutral. `routes[]` is what the `ui` sweep visits, and a `checks[]` entry is evaluated on the route it names when the sweep gets there. Drop `/` from `routes[]` while `checks[0].route` is `/` and the pin is never read again — not removed, not proposed for removal, not reported: the exact silence decision **0094** put the prune proposal in the way of, arrived at from the other side and leaving no proposal behind. The reverse order is harmless: prune first and the routes row is an ordinary refresh.

The run agreed once asked and then went too far, offering `C1` and `C2` as one edit — which trades the silence for a loss of `SKILL.md:75`'s one-row-at-a-time approval, and would have let a decline of the routes refresh take the approved prune down with it.

**Options.** (a) **A route may not leave `routes[]` while a `checks[]` entry names it.** Step 4 gains the clause: where both rows exist, the prune is presented first and the routes row states its dependency; a routes row approved without its prune is refused with that reason and stays a report line. Two rows, two approvals, one order. (b) **Bundle them**: one row, one approval, "prune the pin and refresh the routes". Simplest to present, and it puts a check removal inside a batch, which is what 0094 forbids. (c) **Leave it to the reader**: both rows carry the other's number in their evidence cell and the developer sequences them. (d) **Nothing**: record that approving a routes refresh without its prune silently retires a pin.

**Recommendation: (a).** It keeps the prune its own approvable row, which is 0094's whole mechanism, and it makes the dependency the *engine's* to enforce rather than the developer's to notice at the moment they are being asked five things. (b) is the option this run reached for on its own and is the one 0094 already ruled out. (c) is the status quo with better labels: the row that does harm is still approvable alone. (d) leaves a documented way to disable a pin without a proposal, in the procedure whose job is proposing.

**Cost if wrong.** A developer who wants only the routes refresh — a route genuinely renamed, the pin to be re-pointed by hand later — is told no and has to approve the prune, or edit `config.json` themselves. That is one refusal with a reason, against a pin that stops being read with no record anywhere.

**Where it lands.** Stage **11d-3**: `skills/init/SKILL.md` step 4, and `DECISIONS.md` 0094's *Applied in* list.

### OOO — `verifiedAt` and `scanSha` answer different questions and share one condition (raised 2026-09-07, lands in Stage 11d-3)

**Context.** `skills/init/SKILL.md:75` gives both fields one rule: *"`scanSha` and `verifiedAt` move only after the commands ran again."* At Stage 11d-3's **M2** five commands ran green and the run still refused to move either, gating instead on `lint.mjs --project` exiting 0 — the **Completion** condition at `SKILL.md:79`, which is about the run and not about these fields. It named the substitution rather than hiding it: *"they depend on R1, and I batched them as if they did not."*

The substitution is not what the sentence says, and the sentence is the thinner of the two. The fields answer different questions. `verifiedAt` answers *when were the recorded commands last seen green*, and step 6's condition is exactly right for it. `scanSha` answers *how much history has been examined* — it is the left end of the next `--refresh`'s delta. Move it to `HEAD` while a proposal from this delta is unresolved and the next run computes `git log <newSha>..HEAD` and never looks at the rot again: the finding is buried by the pointer whose job was to record that it had been looked at. A declined proposal is the common case, because a decline is a first-class outcome of step 5.

**Options.** (a) **Split the condition.** `verifiedAt` moves when the recorded commands ran green in this session, whatever else the run left undone. `scanSha` moves only when the delta it closes leaves no unresolved proposal — a declined or unfixed row holds it where it is, and the report says which row is holding it. (b) **Keep one rule and make it the stricter one**: neither field moves unless `lint --project` exits 0, which is what the run did. Simple, and it makes `verifiedAt` — a fact about commands — hostage to a rule citation. (c) **Keep one rule and make it the looser one**: both move when the commands ran, and a declined proposal is re-found by the full-scan path or not at all. (d) **Move `scanSha` and record the unresolved rows in the config** so the next run reads them back, which is a new field.

**Recommendation: (a).** Each field gets the condition its own meaning implies, and the expensive half — burying a finding — is the one that gets the guard. It also matches what M2 actually needed to say: the commands *were* green, and the reason to hold the pointer was the declined `R1`, not the commands. (b) makes `verifiedAt` lie about a session in which the commands did run, and it is the merge that made this proposal necessary. (c) is the reading `SKILL.md:75` has today, and M2 is the run that shows what it costs. (d) buys a config field to carry state that the git history and the rules already carry.

**Cost if wrong.** A project with one long-declined proposal never advances `scanSha`, so every `--refresh` re-scans the same growing delta and re-proposes the same declined row. The mitigation is already in the procedure — a row the developer *rejects* is not asked again (`SKILL.md`, Approval) — but the distinction between rejected and deferred would have to be carried on disk to hold, and today it is not. Stage 12 is where a real project with a stale rule says whether that bites.

**Where it lands.** Stage **11d-3**: `skills/init/SKILL.md` step 6 of `--refresh`, and its Completion line.

### PPP — What step 7 does when the fix it must make was declined (raised 2026-09-07, lands in Stage 11d-3)

**Context.** Two sentences of `skills/init/SKILL.md` meet and cannot both hold. Step 7: *"`node .../lint.mjs --project` → exit 0. A finding is fixed here, not reported as a caveat"* (`:61`), with the phases table making step 7 *done when* lint exits 0. Step 6 of `--refresh`: *"write only what is approved"* (`:75`). At Stage 11d-3's **M2** the developer declined `R1`, the re-point of a rule precedent that `1e80b1d` had killed, so `lint --project` exits 1 and step 7 cannot be completed by any action the run is allowed to take.

The run resolved it correctly — the approval wins, the finding becomes a caveat — and said so in the report: *"Step 7 normally fixes a finding rather than record a caveat because you declined the fix, not because it could not be made."* But a reader of `:61` alone would call the run non-compliant, and a run less inclined to explain itself could instead read `:61` as authority to write the un-approved fix. The sentence was written against a different failure: an `init` that finds a lint error and files it as a known issue rather than repairing it.

**Options.** (a) **Name the exception where the rule is.** `:61` gains: *a finding the developer declined to fix is a caveat, named in the report with the row that declined it; every other finding is fixed here.* Step 7's *done when* becomes "lint exits 0, or every remaining finding traces to a declined row". (b) **Make the decline re-ask**: step 7 re-presents the finding as a blocking question, since the run cannot complete without it. Buys a second prompt for a decision the developer already made. (c) **Let step 7 write the fix regardless**, on the argument that a rule citation is the engine's own file. It is not — `.claude/rules/` is the project's, and a write past a decline is the anti-pattern this whole skill is shaped against. (d) **Leave both sentences and rely on the run to reconcile them**, which is what happened, once.

**Recommendation: (a).** It states the resolution the run reached, in the sentence a reader consults, and it keeps the original teeth for the case the sentence was written for. (b) turns a decline into a loop the developer can only exit by agreeing. (c) writes an un-approved change to a project file. (d) is a coin flip on the next run's disposition, and the two readings differ by whether the engine edits a file it was told not to.

**Cost if wrong.** A run can now complete with `lint --project` red, so "the layer is healthy" no longer follows from "init finished". The report is what carries it — the caveat, the declined row, and the finding — and a developer who does not read the report is in the same place they were with a run that stopped instead.

**Where it lands.** Stage **11d-3**: `skills/init/SKILL.md` step 7 and its phases table row.

### QQQ — The fix pass is bounded by the diff, and the clause that bounds it names a status (raised 2026-09-07, lands in Stage 11d-3)

**Context.** `verify-loop.md:138` keeps the fix pass inside the reviewed diff with one clause: *"a `pre-existing` row is **not** fixed here: it names a defect outside this task's diff, so a fix would be an unreviewed change to code the plan never named, one phase after the review closed."* Decision **0119**, taken this same stage, made `pre-existing` unreachable for every browser row — no base environment, no base run, no status. Every one of decision 0093's addable sources is browser-side. So the clause that keeps the fix pass out of code the plan never named is keyed on a status the rows in question cannot hold.

Two runs met it the same day. M4's row 8 — axe `landmark-one-main`, app-wide in `App.tsx`, `fail · minor` — is a `fail` row, and §7 opens *"Every `fail` row"*. The kernel asked the developer instead of fixing it, through `verify-loop.md:152`. M3's rows 22–24 — three deliberate `/shift` defects, byte-identical at base — were left with the words *"So §7 keeps them out of the fix pass"*, citing the `pre-existing` clause about rows the same run had just graded `fail`.

Both reached the right behaviour. Neither could cite a rule that covers it, and a run less inclined to reason from intent reads *"Every `fail` row"* and edits `App.tsx`.

**Options.** (a) **Re-key the clause on the diff rather than on the status**: a row whose defect is outside this task's diff is not fixed here, whatever its status, and the row says how that was established. (b) **Make the status reachable** so the existing clause covers these rows — that is proposal **SSS**, and it changes the verdict as well as the fix pass. (c) **Both**: SSS restores the status, and the clause is re-keyed anyway so the bound does not depend on a status being reachable. (d) **Nothing**: the fix pass keeps asking, and each run reasons it out again.

**Recommendation: (a), and (c) if SSS is taken.** The bound the sentence exists to enforce is *outside the diff*; `pre-existing` was the label that happened to carry it, and 0119 took the label away. Re-keying is one clause and costs nothing whichever way SSS goes. (b) alone leaves the clause depending on a status whose proof is bounded — a row outside the diff that SSS cannot prove would fall back through the same hole. (d) is two runs' worth of evidence that the reasoning is reachable and one run's worth of luck.

**Cost if wrong.** A row inside the diff that a run misjudges as outside it goes unfixed and rides to the breaker. The row names how provenance was established, so a developer reading the table can say the run was wrong — which is not true today, when the same row rides to the breaker with no statement at all.

**Where it lands.** Stage **11d-3**: `skills/run/references/verify-loop.md §7`, and `DECISIONS.md` 0120's *Applied in* list.

### RRR — `flaky` describes a failure nobody could explain (raised 2026-09-07, lands in Stage 11d-3)

**Context.** Decision **0098** defines `flaky` by observation: a row that fails and passes on one retry, both outputs in evidence. Stage 11d-3's **M4** produced exactly that observation and the verifier wrote `fail · blocker` instead, with the mechanism named line by line — a `sessionStorage` counter keyed on navigation-entry parity, invisible to jsdom, unmounting the tree through a missing `ErrorBoundary`. The sequence in `evidence/10-crash-console.txt` is `ok, CRASH, ok, CRASH`.

The verifier's choice is the better one and the file says why: `bench/run/README.md:153` records that `flaky` *"carries no severity of its own"*. Writing it there would have dropped the row's `blocker`, and with it its place in `verify-loop.md:134`'s order and its weight at the breaker — trading a diagnosis for an observation. What `flaky` is *for* is a claim nobody can rely on because nobody knows why it fails; a failure with a named mechanism is not that, however it alternated.

The consequence for the bench is that criterion 3's second half may not be reachable as seeded: every seeded defect is in the diff, and a verifier that reads the diff can explain any of them.

**Options.** (a) **`flaky` is a row that failed and passed on retry and whose failure the verifier could not explain**; a failure with a named mechanism is a `fail` at its severity, and the retry that passed goes in the evidence cell either way. (b) **Observation wins**: the verifier writes `flaky` whenever a retry passed, mechanism or not, and M4 is an engine defect. (c) **Both statuses**: `flaky · <severity>`, which gives the status a severity column it was defined not to have. (d) **Leave 0098 and record that no hodos run has ever written `flaky`.**

**Recommendation: (a).** It is what the better of two behaviours already did, and it keeps the severity that orders the fix. The evidence cell still carries both outputs, so nothing a reader needs is lost — only the label changes, and it changes toward the more specific claim. (b) makes the engine write the weaker word whenever it does the better work. (c) is a change to the status grammar for one case. (d) leaves a status in the specification that the design cannot produce, which is the kind of clause `FORMATS.md` exists to prevent.

**Cost if wrong.** A verifier that thinks it has explained a genuine race writes `fail · blocker` for something that is really nondeterministic, and the fix pass chases it. The evidence cell holds both runs, so the fix pass sees the alternation; and a `blocker` chased and not reproduced is a row that comes back at iteration 2, which is where a wrong explanation shows.

**Where it lands.** Stage **11d-3**: `DECISIONS.md` 0098, `docs/FORMATS.md §10`, `skills/run/references/oracles.md §5`, and `bench/run/defects/detail-flaky-every-other-load.patch` if criterion 3's second half is re-bought.

### SSS — `git` can prove "not introduced here" where a second environment cannot (raised 2026-09-07, lands in Stage 11d-3)

**Context.** Decision **0119** ruled that a browser row can never be `pre-existing`, because the proof decision 0097 requires is a re-run at the base sha and a browser predicate needs a second running environment nothing raises. Stage 11d-3's **M3** proved the same thing without one: rows 22–24 are detector hits on `/shift`, and the kernel established from the object store that the banner, the notes box and the two absolutely-positioned buttons are *byte-identical at base `e00ff45`*, that the diff renamed one identifier and added one handler, and that neither touches geometry. 0119 considered the re-run and never considered the diff.

The consequence of not having it is on the branch. Decision **0120** says a row nobody claimed does not fail the verdict; 0119 stops these rows reaching the status that would let 0120 apply; so a swept route with three old presentation defects fails every task forever, and M3's own report says so — *"every future `ui` run re-surfaces rows 22-24"*. That is the outcome 0120's option (c) was rejected for, arriving through a different door.

**Options.** (a) **A browser row earns `pre-existing` on a `git` proof, bounded**: the row's evidence names the base sha and the files whose bytes are unchanged, and the proof is admissible only where the diff touches nothing the route's render depends on — no shared stylesheet, no shared layout component on the path. The report says the proof was `git` and not a re-run, so a reader can disagree with it. (b) **Only a re-run counts**, which is 0119 today, and the permanent-`FAIL` case is accepted. (c) **Any browser row on code the diff did not touch is `pre-existing`**, with no dependency bound — cheapest, and it excuses a defect a shared change introduced. (d) **Raise the base environment** — 0119's option (b), a stage of work, already in `BACKLOG.md` for Stage 12.

**Recommendation: (a).** It buys back most of what 0119 gave up for the price of a bounded evidence sentence, and it makes the counts mean what they say: `pre-existing 0` in M3's report is a true statement about the proof available and a false impression of the branch. The bound is what separates it from (c): a source file unchanged under a changed stylesheet renders differently, and that is the one case where the cheap proof lies. (b) is the status quo with the cost now measured. (d) is right eventually and is not this stage.

**Cost if wrong.** A defect introduced by a change the bound failed to catch is labelled `pre-existing`, does not fail the verdict under 0120, and reaches the developer as a reported row rather than a breaker. The evidence names the base sha and the files, so the mistake is visible in the row; and taking **QQQ** as well means the fix pass leaves it either way, so the error is in the verdict and the label rather than in what the engine edits.

**Where it lands.** Stage **11d-3**: `DECISIONS.md` 0119 and 0120, `docs/FORMATS.md §10`, `skills/run/references/oracles.md §5`, `agents/hodos-verifier.md`.

### TTT — The fix pass is ordered by a rule that leaves no record (raised 2026-09-07, lands in Stage 11d-3)

**Context.** `verify-loop.md:134` orders the fix pass — *"Every `fail` row, in severity order — `blocker`, then `major`, then `minor`"* — and `:146` requires *"One commit for the pass"*. One commit records no order. Stage 11d-3's **M3** is criterion 2's own arm, whose acceptance sentence is *"Severity orders the fix"*, and nothing it wrote can answer whether the order was taken: the commit body names row 19 (`minor`) before rows 20–21 (`major`), the report's *Fixed after the last review* line does the same, and both are consistent with narrating by row number. The kernel's own words were *"Fix pass, in severity order"* — a claim with no artifact behind it, which is the shape the verifier's `unfalsifiable:` category exists to name in the plan's claims.

**Options.** (a) **The commit body lists the rows in the order they were taken**, one line each, severity first — the record costs nothing, lives with the change, and survives the task directory. (b) **A ledger line per row fixed**, which is the most durable record and the noisiest: a five-row pass writes five lines into a file whose grammar is closed at three (`FORMATS.md §6`, decision 0084). (c) **One commit per row**, which records the order in `git log` and contradicts `:146`. (d) **Nothing**: the rule stays, unobservable, and criterion 2 is accepted on the half that is.

**Recommendation: (a).** It is one sentence in `§7`, it puts the record where the change is, and it makes the stage's own criterion measurable by the artifact the task already produces. (b) buys durability the commit already has and costs a grammar change. (c) trades a rule for a rule. (d) leaves a specified order that no run can be held to — and this stage bought an arm to check it.

**Cost if wrong.** The commit body grows by one line per fixed row, and a pass that fixes nine rows has a nine-line body. That is a body that says what happened.

**Where it lands.** Stage **11d-3**: `skills/run/references/verify-loop.md §7`, `docs/BUILD-PLAN.md` Stage 11d criterion 2's arm, and `docs/stages/11d3-manual.md`'s M3 Report line, which asked `git log --oneline` for something `:146` forbids it to hold.

### UUU — A predicate that reaches by DOM position is brittler than the two 0118 warns about (raised 2026-09-07, lands in Stage 11d-3)

**Context.** Decision **0118** makes `config.mjs check` warn on a pinned predicate written over a class or an id, because those do not survive a redesign. Stage 11d-3's **M3** wrote a pin the check passed silently:

```
"evaluate": "document.querySelector('h1').nextElementSibling.nextElementSibling.textContent"
```

It reaches by sibling position from the page's heading. An element inserted between them breaks it, which is a smaller change than renaming a class, and the finish report **said so in prose** — *"The predicate reaches by DOM position, so an element in[serted]… fails the check"* — while the mechanism written to say it stayed quiet. `FORMATS.md:143` and `oracles.md:102` both phrase the rule positively — *"over a role or text and never a class or an id"* — and a positional walk is neither of the two things named and not the thing asked for either.

**Options.** (a) **Widen the warning to any predicate that is not anchored on a role, a label or text**: `nextElementSibling`, `previousElementSibling`, `children[n]`, `:nth-child`, `parentElement` chains. The rule's positive form already says this; the check implements the negative one. (b) **Add positional traversal to the list of warned forms** beside class and id, leaving the check enumerating bad shapes rather than requiring a good one. (c) **Error rather than warn**, which stops a config loading over a predicate that runs fine today. (d) **Nothing**: the report says it in prose when a run notices.

**Recommendation: (a).** It makes the check say what `FORMATS.md:143` already says, and an enumeration of bad shapes is a list that the next brittle predicate is not on. (b) is one more entry and the same hole. (c) breaks 0118's own reasoning — *"a brittle predicate is a config that runs and fails later rather than one that cannot run at all"*. (d) makes the warning depend on the run's prose.

**Cost if wrong.** A legitimate predicate that walks the DOM for a good reason gets a warning it does not deserve. It loads, the developer reads one line, and the pin works. That is the cost 0118 already priced for class and id.

**Where it lands.** Stage **11d-3**: `scripts/config.mjs`, `DECISIONS.md` 0118's *Applied in* list, `docs/FORMATS.md §10`.

### VVV — `evaluate` has two shapes in the specification, and both are now in committed configs (raised 2026-09-07, lands in Stage 11d-3)

**Context.** `FORMATS.md:619` maps the field to its operation as `evaluate: mcp__chrome-devtools__evaluate_script {function}` — the adapter takes a function. `FORMATS.md:83` and `finish.md:65` both give the worked example as a bare expression:

```
"evaluate": "document.querySelector('[role=\"status\"]').textContent.trim()"
```

Two runs of the same phase on the same day wrote both shapes. **M1**'s pin is `"() => { const nav = …; return JSON.stringify({…}); }"` — a function, and it has to be, because the predicate reads three things and serialises them. **M3**'s is the bare expression above, copied from the example. Each followed a different sentence of one specification, and a bare expression handed to `evaluate_script` as a function is a pin that never fires — the failure mode 0094 built the whole prune proposal to prevent, arriving before the route ever rots.

**Options.** (a) **The function is canonical**: fix both examples to `() => (…)`, and `config.mjs check` **warns** where the string does not parse as a function while the run wraps it — warn rather than error, on 0118's reasoning, so the two configs already written keep working. (b) **The expression is canonical**: fix `:619`, and whatever runs the check wraps it. Friendlier to a developer editing by hand and unable to express M1's own pin without an IIFE. (c) **Accept both, normalise at run time, say so in `FORMATS.md`** — no config is wrong and the rule is "either". (d) **Nothing**: the field keeps two shapes and a pin's firing depends on which sentence its run read.

**Recommendation: (a).** It matches the operation the format already declares, it is the shape the harder of the two live pins needed, and the warning-plus-wrap means nothing on disk breaks. (b) makes the format's own adapter line wrong and cannot carry a multi-statement predicate. (c) is (a) without the nudge, and leaves two shapes in the wild forever. (d) is the state that produced this.

**Cost if wrong.** A developer who prefers the expression gets a warning on a pin that works. The wrap means it still runs, and the warning names the shape to write instead.

**Where it lands.** Stage **11d-3**: `docs/FORMATS.md §10` and its adapter table, `skills/run/references/finish.md §3a`, `scripts/config.mjs`.

### JJJ — A removed or disabled test is invisible to every mechanism that guards the test floor (raised 2026-09-07, lands in Stage 12)

**Context.** Decision **0022** built a floor and named its own gap; this is the gap next to it, and it is unnamed. Every mechanism the design has points at a test that **exists**: `ledger.mjs` refuses `Task <n>: done` without a `test red` line before it, the reviewer compares a `Tests:` exemption against the diff (`agents/hodos-reviewer.md:31`), and mutation proves that a test the diff **added** pins a production line (`docs/DESIGN.md:262`, `skills/run/references/execute.md:45-51`, `agents/hodos-verifier.md:67-79`). None of them reads a test the diff **took away**, and there is nothing to mutate where an assertion has been deleted.

What that leaves open, mechanism by mechanism. The reviewer's step 1 runs `commands.test` and reports it green, which is exactly what a suite reports when a case is `it.skip`, `xit`, `test.todo` or `#[ignore]`. Its Spec section has four words and none of them covers it: `Missing`, `Extra` and `Misunderstood` read the plan against the diff, and `Unclaimed` (decision **0092**) reads a typed state's members and a branch's failure paths against the plan's `Acceptance:` clauses — a deleted assertion is a claim nobody makes rather than a claim nobody checks. Its convention pass reads the project's rules, the plan's design fields and `defaults.md`, and no row of `defaults.md` names this: the two nearest, row 11 and the rationalization line `"the test is basically right" → Prove it with mutation`, are both about a **new** test's assertion. The one sentence in the engine that does name the shape bounds a single task's red loop and is policed by its own author — "No fourth attempt under another name — a widened assertion, a skipped case, or a check swapped for an easier one" (`skills/run/references/execute.md:43`). And `config.review.generated`'s default globs make `*.snap` stat-only (`docs/FORMATS.md:416`), so an obliterated snapshot is named in `## Not packaged` with its churn and is not in the diff at all.

So the diff does carry a deleted test file at ten lines of context, and a reviewer may notice it. Nothing directs the attention, nothing gives it a severity, and the channel that would have to carry it unaided is the one Stage 11d-2's `## Not done` recorded failing: the Command cell's italic source form was stated in `FORMATS.md §10` and not in the agent, and it **did not take** in arm 3's 27 rows.

**Options.** (a) **A computed section, on the `## Callers` contract** (decision **0100**): `review-package.mjs` already runs `git diff --numstat`, and one `--name-status` call adds the deleted and renamed files matching the project's test globs, plus the removed lines in surviving files that are shaped like a test declaration or like one being switched off — under the caps-that-say-so shape `## Callers` and `## Not packaged` both use. It is a pointer list the reviewer judges and never a finding on its own, and the reviewer's convention pass gains one sentence: a removed or disabled test that no task's `Refactor in scope` clause and no `## Non-goals` line names is a `major`. Cons: it needs a way to know which files are tests — either a new `review.tests[]` config field with default globs, or derivation from `commands.test`, which is a string and not a glob; a rename-heavy refactor produces a long pointer list; and a language that spells its tests otherwise gets no section, the same admission `## Callers` already carries for its declaration families. (b) **Prose only**: one `defaults.md` row and one reviewer sentence, nothing computed, no new field. Cons: it is a request rather than a mechanism, and it rests on the reviewer finding the deletion in the diff unaided — the failure mode of the previous paragraph. (c) **A gate**: a hook, or `ledger.mjs`, refuses a task whose diff removes a test declaration without a `Ruling:` naming it. Cons: enforcement is opt-in by principle 5 and "hodos never breaks a project" — a legitimate deletion is routine in a refactor, and a gate that stops it is the engine breaking a project's own work. (d) **Leave it**: the developer reads the diff at the finish report.

**Recommendation: measure first, then (a).** Decision **0015**'s rule applies and there is a bench to discharge it on: seed one defect into `bench/review/seeded/` whose diff deletes an assertion and leaves the suite green, and score it against the package **as it is today**. If the reviewer catches it cold, (b) is the whole answer and (a) buys a section for a job the prompt already does. If it does not, (a) is bought with a baseline behind it rather than on this paragraph's argument, and the same arm scores the mechanism afterwards. The price is honest and it is the reason this is a proposal rather than a build step: the recorded review-bench run is six dispatches and $4.33 (2026-09-02), the set has already been re-bought once at Stage 11d-3, and the twenty-second defect makes it a third run. (c) is the only option that would have caught the case the design fears, and it is the one that violates a principle to do it.

**Cost if wrong.** A section that fires on every refactor's routine test deletion costs context twice, which is principle 16's own arithmetic, and the repair is to narrow it to deletions no `Refactor in scope` clause names — which is where (a) starts, so the failure would be the glob and not the shape. If instead the seeded arm shows the reviewer catches it cold, what this proposal costs is one bench run and one row in `defaults.md`.

**Where it lands.** Stage **12**, at its Start: the mechanism is a change to the review package and the reviewer's prompt, and the pilot is what measures a reviewer that has never seen the seeded set. The seeded defect and its baseline arm are the half that could ride Stage 11d-3's already-planned re-buy instead of paying for a third run, and that is a scope call for the developer, not for this entry.

### KKK — The mutation ceiling is one sample and one self-report (raised 2026-09-07, lands in Stage 12)

**Context.** Mutation is what decision **0022** calls the ceiling over its own floor — "the **mutation check** (`§7.1`) is what establishes a test pins a production line, and it is unchanged" — and the ceiling is thinner than that sentence reads. `execute.md §5` asks for it on every test written in the red phase, and that run's only record is the transcript: the ledger grammar of `FORMATS.md §6` has a row for `test red`, for `red-check attempt <k>/3` and for `done`, and none for a mutation, so a resumed session cannot tell whether the mutations were run, and the finish report carries no count. What is independently proven is one test: `docs/COMPONENTS.md:189` says "Sample ≥1 new test for mutation", `docs/DESIGN.md:321` says "Sampled mutation checks on new tests", and `agents/hodos-verifier.md:67-79` gives that sample its own numbered row on **a** test the diff added. With `k` new tests, one is evidence and `k-1` rest on the author's own account — which the reviewer's opening sentence already rules out as a source: "Its report is testimony: it says what the author believed, and belief is not evidence."

The defect a reader suffers is in the verify table rather than in the code: one row reading `mutation: api.test pins the range key · pass` is read as the diff's tests being proven, because nothing beside it says how many there were.

**Options.** (a) **Record the count and compare it statically**: one ledger row, `add "Task <n>: mutation" --tests <k>` stored as `Task <n>: mutation (<k> tests)`, and the reviewer compares `<k>` against the test declarations the diff adds, a mismatch being a `major`. It is decision 0022's own device — an assertion made twice and compared by a fresh reader — reused one layer up, and it costs a grammar row, a `ledger.mjs` branch and a reviewer sentence, with no new dispatch. Cons: a count is as writable as `test red` is, so this extends 0022's named risk rather than closing it, and it adds an event to a grammar the resume path derives `state.phase` from. (b) **The verifier mutates every test the diff adds**, under a cap: it is the only option that raises the ceiling with evidence. Cons: rows scale with the diff, and the 60-turn bound has already bitten once — Stage 11d-2's T12, which decision **0112** exists to answer — so this buys proof out of the budget the attack sweep now owns. (c) **Stop the overclaim in the row itself**: the mutation row's Evidence cell names its sample — `broke the key line → 1 failed → restored · 1 of <k> new tests`. Not the `## Not covered` residue line, which is three named lines that take no fourth and whose text is fixed and written exactly as it stands. Cons: it buys no proof at all; it makes the table say what it actually measured. (d) **(a) and (c)**: the count is recorded where a fresh reader can check it, and the row stops reading as though the sample covered the diff.

**Recommendation: (d).** (c) alone is the honest floor and is nearly free — one cell in one row, and the sentence that describes it — and it fixes the thing that actually misinforms. (a) adds the only cheap check available: the number of tests the diff adds is derivable by grep from the diff the reviewer already holds, so the comparison needs no new input, and a task that mutated nothing and typed a number is a `major` on a diff rather than a silence. Together they cost one grammar row, one branch, one reviewer sentence and one evidence cell, and no turns. (b) is the option that would make the ceiling real, and Stage 12 is the place to price it against a real project's diff rather than against a fixture's three tests. (a) alone leaves `verify.md` overclaiming; (c) alone leaves `k-1` tests unproven with a sentence admitting it.

**Cost if wrong.** (a) invites a number nobody ran, which is 0022's named risk one layer up — visible as a reviewer `major` where the count disagrees with the diff, and reversible by deleting one grammar row and one sentence. (c) costs one cell of a row that is already there, and if `k` is wrong the row says so against a diff anybody can count.

**Where it lands.** Stage **12**, at its Start, with the whole of (b)'s pricing: what a real project's task-sized diff adds in tests is the number that says whether mutating all of them is turns worth spending. (c)'s single evidence cell is the one half that touches a file Stage 11d-3 is writing now, so if the developer takes (c) or (d) it is cheapest to land there — again a scope call for the developer.

### III — What a `pre-existing` row does to the verdict, and whether the fix pass touches it (raised 2026-09-07, lands in Stage 11d-3)

**Context.** Two rules landed this stage and together they left the status **unreachable**, which building criterion 1's third arm is what showed. Decision **0119** limits the base-sha proof to a **command**-level check, because a browser predicate needs a second environment nothing raises. And `FORMATS.md §10` was written to say a claim **the plan made** is never `pre-existing` — read off decision **0108**'s first table row, which gives a plan claim `blocker` unconditionally. But every row a verifier may **add** comes from the four sources of decision 0093, and all four are browser-side: console, network, detector, attack, pin. So the only command rows in the table are the plan's own claims and the mutation row, and if those cannot hold the status either, nothing can.

The over-reading is identifiable: 0108's table is about the **severity** column on a `fail` row, and `pre-existing` is a value of the **status** column. What 0097 actually describes is the case a real project meets — "a bug that exists in the codebase but was not introduced by this PR" — and the sharpest instance of it is exactly a plan claim: a task claims `commands.lint` is green, lint has been red for a year, and the row today reads `fail` with no way to say whose failure it is.

So a plan claim may hold `pre-existing`. What neither decision settles is the consequence, and the two readings differ in what a run *reports*: (i) the claim is still unmet, so the verdict is `FAIL` and the developer meets the breaker; (ii) the defect is not this task's, so the verdict is unmoved and the row is reported.

**Options.** (a) **`pre-existing` fails the verdict where the row is a claim the plan made, and not where nobody claimed it.** The verdict answers for the plan's contract: a claim that has never passed is unmet whoever broke it, and the developer settles it at the breaker, where the counts already name it. An added row nobody claimed — browser-side today, and a command-side source if one is ever admitted — is news and not a contract. Either way the fix pass does **not** fix it: the defect is outside this task's diff, and a fix there is an unreviewed change to code the plan never named, so the row goes to the breaker and into the finish report with its base output. (b) **It never fails the verdict**: the status means "not mine", the run reports `PASS` with the row in the table, and a task whose claim never passed still reads green. (c) **It always fails the verdict**, claim or not, which makes an ambient pre-existing defect on a swept route stop every task. (d) **The fix pass fixes it after the claims**, on the argument that a red check is a red check.

**Recommendation: (a).** It is the reading the verdict rule already has for everything else — the table answers for the plan's contract, and `skip` is the one status that does not fail it because nobody could run the claim, which is not true here. (b) is the one option that misinforms: a green verdict over an unmet claim is the failure the Iron Law exists to prevent, and it would arrive with the evidence sitting in the row. (c) turns one stale detector hit on a neighbouring route into a breaker on every task, which is what `when`-gating and the attack surface were bounded to avoid. (d) makes the fix pass edit code outside the diff the review accepted, one phase after the review closed.

**Cost if wrong.** A project carrying a genuinely red check meets the breaker on every task until it fixes it or drops the claim — which is a true statement about that project, made once per run, with the base output beside it. If that reads as noise rather than as news, the repair is (b) for an added row and a `## Outcome` line for a claim, and Stage 12 is where a real project says which.

**Where it lands.** Stage **11d-3**, during its build: `FORMATS.md §10`, `oracles.md §5`, the agent's verdict sentence and `DESIGN.md §7.4` all state a verdict rule that has to be one rule.

### HHH — What "the same check at the base sha" means for a browser check (raised 2026-09-07, lands in Stage 11d-3)

**Context.** Decision **0097** earns `pre-existing` with a re-run: "the same check re-run at the task's base sha in a `git worktree`, that run's output in the evidence column; a check that cannot run at base stays a plain `fail`." For a command check that is self-contained — `git worktree add`, run the command, `git worktree remove`. For a **browser** check it is not: a predicate is asserted against a *running* application, so re-running it at base needs a second environment serving the base tree. `DESIGN.md §7.4` and decision **0074** forbid the verifier from raising one — "an agent that raises what it then grades has an interest in the result" — and the layer's `url` is a fixed port in the config, so a second raise collides with the first. Nothing in the engine raises a base environment today.

Stage 11d's criterion 1 asks for exactly that, on the row where it is hardest: "Task 2 whose change breaks the predicate: a `fail` row with source *pin*; **the same check run in a worktree at task 2's base sha passes**, so the row is `fail`, not `pre-existing`." Its third arm — "a third change that breaks a check at base and head alike: `pre-existing`" — says *a check*, not *the pin*, so that half is satisfiable by a command check either way.

**Options.** (a) **The base-sha proof is a command-level proof.** A row whose check is a command — a test, a typecheck, a lint, an `http` request — is re-run by the verifier in a `git worktree` at the `Base:` sha. A **browser** row, pin included, is what 0097's own escape clause covers: it stays a plain `fail` and its evidence names why — `no base run — a browser check needs a second environment`. Criterion 1's arm 2 says that instead of a passing base run, and arm 3 demonstrates the proof where it exists. A `BACKLOG.md` line carries the browser half to Stage 12, where a real project meets a pin that broke two tasks ago. (b) **The kernel raises a base environment** when a *pin* row failed: a worktree at base, `env.mjs up <worktree>` under an offset port, the predicate re-run through the adapter, the row re-labelled. It needs a port-offset convention the config has no field for, a second raise-and-stop on every task with a broken pin, and a row rewritten by the kernel, which today never writes `verify.md`. (c) **The verifier raises it**, against `DESIGN.md §7.4` and decision 0074. (d) **A *pin* row is never `pre-existing`** — the project asked for that check, so its failure is always news, and the status is for command rows only. Simpler than (a) and it loses the distinction the criterion is about: a pin the *previous* task broke reads as this task's failure.

**Recommendation: (a).** It is what decision 0097 already says, applied to the one kind of check that cannot answer: the escape clause exists, and a browser check is the case it was written for. It also keeps the proof honest where it is available — a command re-run at base is a real second run with a real output — rather than buying a mechanism (b) whose first cost is a config field for a port. (b) is the right shape eventually and is a stage's worth of work, not a task's: it needs the offset, a second `env.mjs` lifecycle, and an answer for a project whose layers are containers. (d) is cheaper than (a) by one evidence clause and gives up what the status is for.

**Cost if wrong.** A broken pin that the previous task caused is reported as this task's `fail · major`, and the developer reads the base sha in the evidence and says so at the breaker. What that costs is one fix pass looking at the wrong task's change; what it does not cost is a wrong `pre-existing`, because the status is not written without an output.

**Where it lands.** Stage **11d-3**, during its build: T3 cannot write the recipe without it, and criterion 1's arm 2 is a clause only the developer may amend (the rule decision **0113** was taken under).

### EEE — Where Stage 11d-3's new prose lives, against two caps with nothing left (raised 2026-09-07, lands in Stage 11d-3)

**Context.** The four decisions this part builds name two files for most of their rules. `agents/hodos-verifier.md` is **146 lines against its 150-line cap** and `skills/run/references/verify-loop.md` **197 against 200** (`AUTHORING.md §7`). What has to land: in the agent, the `pin` marker and the run of `verify.recipes[<ui>].checks[]` (**0094**), the `git worktree` proof for `pre-existing` (**0097**), the median/p95 rule and the one-retry `flaky` rule (**0098**), and the severity table it reads rather than chooses (**0108**) — honestly written, ~14–16 lines. In the loop reference, the fix pass in severity order, the breaker's counts and its `flaky` acceptance, and the pins' regression surface — ~5–7 lines. `AUTHORING.md §7`'s own sentence forbids the third way out: "a cap hit is a signal to split or delete, never to compress prose into a denser paragraph."

Decision **0106** met this once already and answered it with `skills/run/references/oracles.md`, which is 113/200 and is handed to the verifier by path. `COMPONENTS.md §1.2` records where it drew the line: "The rules that decide a row's status stay in the agent; the enumerable, stable content that both halves read is here." Two of this part's four rules are statuses — `flaky` and `pre-existing` — so the line has to be redrawn or the caps have to move.

There is one measurement bearing on it, and it cuts against the move: Stage 11d-2's `## Not done` records that the Command cell's italic source form, stated in `FORMATS.md §10` but not in the agent, **did not take** in arm 3's 27 rows, and the fix was to state it in `oracles.md §1` — "which is untested against a run". What is on the record is that the agent's own text produced the behaviour the criteria read, and that the oracles file's has not yet been shown to.

**Options.** (a) **The enumerable half into `oracles.md §6`**: 0108's six-row table, the worktree recipe, the retry count, the statistic rule — each of them a table or a recipe, which is 0106's own criterion for what belongs there — with the agent keeping the per-row rules and one pointer sentence each (~4–5 lines), and `COMPONENTS.md §1.2`'s boundary sentence amended to say that an enumerable status *rule* is the file's and the row's decision is the agent's. (b) **Raise the caps**: `agents/*.md` and `skills/*/references/*.md` in `AUTHORING.md §7` and in `lint.mjs`, and the rules stay where the measured behaviour came from. (c) **Delete from the agent what `oracles.md` already duplicates** — the four sources, the stage order, the `## Not covered` block and one anti-pattern, ~12–16 lines by count — and spend the room on the new rules. (d) **Split the verifier into two agents**, one for the plan's claims and one for the sweep.

**Recommendation: (a).** It is decision 0106 applied to the same problem for the same reason, and the content divides cleanly on 0106's own line: a six-row table, a two-command worktree recipe, a retry count and a statistic are enumerable and stable, while *which* status this row gets stays a rule in the agent. `COMPONENTS.md`'s own *target* for that file is ≤150 lines and it stands at 113, so the enumerable half fits the advice as well as the cap. It also puts the untested channel under test in the same stage: criteria 1 and 3 both read rows whose rules would live in `oracles.md`, so this part's own arms are what say whether the pointer moves behaviour — which is more than the caps question would otherwise get. (b) buys room for every agent and every reference at once, and the cap is what stops a prompt nobody reads from growing; it is the fallback if (a)'s arms show the pointer did not take. (c) deletes text that has been measured working — 11d-2's criterion 6 was met with the block in the agent — to make room for text that has not. (d) is a new component, a second dispatch, and decision 0044's one-pass rule argued away for line count.

**Cost if wrong.** The verifier reads a rule from a file instead of from its own prompt, and a row comes back without a severity or without the base-sha proof. Visible in the same arms this part buys, and the repair is (b) on one cap.

**Where it lands.** Stage **11d-3**, at its Start: T3 and T4 cannot be written until it is settled.

### FFF — Whether `recall, spec` joins the review bench's gates (raised 2026-09-07, lands in Stage 11d-3)

**Context.** `bench/review/seeded/` carries twenty-one defects: twelve convention, seven behavioral, and **two** of the `spec` kind — `s-unclaimed-refund-state` (a union member no `Acceptance:` clause names, Stage 11d-1) and `s-unclaimed-page-limit` (a branch's failure path, Stage 11d-2). The four gates — overall, convention and behavioral recall at ≥80%, precision at ≥85% — were bought at Stage 6 on the two kinds that existed then, and `recall, spec` has been reported beside them as a **measurement** since 11d-1. Both `docs/BENCH.md` and `bench/review/README.md` say, in those words, that whether it joins them is this Start's question. Criterion 4 of this part re-buys the whole set, so the answer is needed before the run rather than after it.

Two separate things are unmeasured and only one of them is this question. The Spec section's **precision** is measured by nothing at all — `precision` counts Standards rows, so a wrong `Unclaimed` entry costs no number this bench prints — and that is decision **0015**'s admission, which the criterion carries by name to Stage 12 whichever way this goes.

**Options.** (a) **It stays a measurement** until Stage 12's hold-out set, and the two files say so instead of deferring. (b) **It becomes a fifth gate at ≥80%** over the two spec defects. (c) **The spec defects join the overall recall denominator**, so the existing gate covers them. (d) A lower threshold bought for a denominator of two.

**Recommendation: (a).** A denominator of two cannot carry an 80% threshold: one miss is 50%, so the gate would either fail the stage on a single row or be a threshold chosen to fit two cases. Both spec defects were authored by the sessions that wrote the word they measure, which is the property `BENCH.md` already says makes this a seeded number rather than a generalisation. (c) is worse than (b): it moves a threshold that was bought on nineteen defects by silently changing what it is over, which is the exact objection recorded when `recall, spec` was first reported apart. (d) is a number with no argument behind it.

**Cost if wrong.** A class of defect whose recall nobody gates, reported beside four that are gated — visible in every run's table, and reversible in one line of the scorer once Stage 12's hold-out gives a denominator worth thresholding.

**Where it lands.** Stage **11d-3**, at its Start, before criterion 4's run is bought.

### DDD — What "both requests in evidence" means when the attack stubs the endpoint (raised 2026-09-07, lands in Stage 11d-3)

**Context.** Stage 11d's criterion 4 asks for "a `fail` row with source *attack*, **both requests in evidence**". The attack that finds a double submit is `oracles.md §3`'s fourth, and the run that produced the row (`bench/run/runs/2026-09-07-four-sources/arm-3-verify.md`, row 24) got its evidence from a **call counter**: it stubbed `/api/handover` with a 200 ms delay and a counter, clicked Save twice with no wait, and read `window.__handoverCalls === 2` with the button showing `Save handover (2)`. The stub is what makes the attack deterministic — without a held-open response there is no in-flight window for a second click to land in, and the attack becomes a race the run either wins or does not. But a stubbed call never reaches the network, so `evidence/` holds no request record: six screenshots, five collector JSONs, and no listing.

Stage 11d-2 amended the clause to name the counter, and review 2 filed that as out of scope: the criterion is the developer's, decision **0113** settles only the control, and a builder rewriting what a criterion demands is the thing `CLAUDE.md`'s standing rule forbids. The clause is restored and the mismatch is here instead.

**Options.** (a) **The counter is the evidence, and the criterion says so**: a count read out of the page under a stub the attack itself installed, with the stub's own script in `evidence/`. It is stronger than a listing in one way — a listing shows two requests left the page, a counter shows two requests *arrived* — and weaker in another: it trusts a stub the same agent wrote. (b) **The attack does not stub**: it clicks twice against the real endpoint and reads `list_network_requests`, which gives the listing the clause asks for and makes the attack non-deterministic, because whether the second click lands in flight depends on how fast the endpoint answers. (c) **Both**: stub for the deterministic verdict, then one unstubbed pass whose listing goes in evidence — two attacks where the list says five, and it doubles this attack's cost. (d) **The clause is dropped** and the criterion asks only for the `fail` row with its source, leaving what counts as evidence to `FORMATS.md §10`'s general rule.

**Recommendation: (a).** The closed list of decision 0096 exists so that an attack is the same attack on every project, and (b) makes this one's outcome depend on a response time. What the clause was defending is that a row saying "two requests" shows the two rather than asserting them, and a counter installed by the attack and read out of the page does show them. (c) buys the listing for a second dispatch's worth of operations on every verify run that reaches the attacks; (d) gives up the defence rather than restating it.

**Cost if wrong.** One clause of one criterion and one paragraph of `oracles.md §3`. If the counter turns out to be the weak half — a stub that answers 200 where the app expected 201, say, changing what the page does between the clicks — the fix is (c) on this one attack, and the run that would show it is the same arm Stage 12 buys anyway.

**Where it lands.** Stage **11d-3**, at its Start, beside proposal **CCC**: both are one sentence of a criterion or a deliverable, and 11d-3 is the part that leaves `verify.md` in its final shape.

### CCC — Where the presentation class is seeded (raised 2026-09-07, lands in Stage 11d-3)

**Context.** Stage 11d's Deliverables sentence names "seeded defects of the state, negative and presentation classes in `bench/review/seeded/`" (decision **0096**). Two of the three landed there — `s-unclaimed-refund-state.patch` (state coverage) and `s-unclaimed-page-limit.patch` (the negative path). The presentation class landed in `bench/run/defects/summary-clipped-line.patch` instead, and the argument for the move is in `11d2-report.md`'s *Where the classes are seeded, and where they are not* and in `bench/review/README.md`: the review bench scores a **reviewer** against an item a rule or a plan clause gives it, and a clipped line has no such item — nothing in the project's rules says a summary line may not be 20px wider than its box, so a reviewer that reported it would be scoring against a standard nobody wrote. The detector is what finds it, and the detector runs in the verify phase, whose bench is `bench/run/`.

Review 1 filed the location as a minor: the argument is good and the record does not say the class moved by a decision. `CLAUDE.md`'s standing rule is that a design change is a proposal the developer settles, and this stage raised three others that way (**0111**, **0112**, **0113**).

**Options.** (a) **Amend the Deliverables sentence**: the presentation class is seeded in `bench/run/defects/` and the sentence says so, with the reason — a class whose oracle is a detector is seeded where the detector runs. Nothing moves; the record catches up with the tree. (b) **Seed it in `bench/review/seeded/` as well**, with a project rule that gives the reviewer an item to find it by — which is a new fixture rule, and it makes the review bench score a standard invented for the bench. (c) Move the class out of `bench/run/defects/` into `bench/review/seeded/` and drop the detector's own seeded defect, which would leave criterion 3's detector source with nothing on a real page to find. (d) Leave both the sentence and the tree as they are and let the report's paragraph stand as the record.

**Recommendation: (a).** The rule the argument rests on is already in the repository — `bench/review/README.md` says a seeded review defect needs an item a reviewer could have read — and 0096's sentence was written before that rule met a class with no item. (b) is the one option that would corrupt a measurement: the review bench's precision is only meaningful while every seeded defect is one a reviewer could be expected to find. (d) is what this proposal exists to avoid: the tree and the decision disagree, and the report is not where that is settled.

**Cost if wrong.** One sentence in `BUILD-PLAN.md` and one in this file. If a later stage does find a reviewer-visible presentation item — a project rule about layout, which a real project may well carry — the class can be seeded in the review bench then, and this decision does not forbid it.

**Where it lands.** Stage **11d-3**, at its Start: it is 11d-3 that re-buys the review bench's recall and precision with the new defect classes, so the sentence should be settled before that measurement is taken.

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

