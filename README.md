# hodos

> ὁδός — *the way*. μέθοδος — *following the way*.

hodos is a Claude Code plugin that installs a complete development workflow into any project: it learns the project's conventions once (`/hodos:init`), then drives every task through research → plan → execute → review → verify → finish with bounded loops, file-based state, and evidence-based verification.

The developer is the driver of ideas and decisions. hodos is the driver of the *process*: it asks the right questions, refuses to guess where the plan is silent, reviews with fresh eyes, verifies by running, and cleans up after itself.

**Status: 0.2.0.** Every phase is built and measured against four fixture projects, and 0.2 is the first release measured on a real codebase. The pilot ran on `ariadne_v2`, a Rust workspace, and covered ten tasks, five same-task pairs against bare Claude Code, one cross-repository campaign node, and three same-task pairs for the `inert` shape (`docs/PILOT.md`). The numbers below say what the pilot measured and what it does not prove.

| | hodos |
|---|---|
| **Project-aware** | `init` derives rules from the codebase's own precedents and from authoritative stack sources, filtered by a behavior-shaping test. |
| **Frugal** | Three skill descriptions in the model's listing; the diff never enters the orchestrator's context; one reviewer; model tiering. |
| **Bounded** | Two review iterations, two verify iterations, then a breaker that hands the decision to the human. |
| **Verified** | "Done" requires fresh execution evidence from the project's own commands and verify recipe — tests, typecheck, lint, browser, HTTP, accessibility, viewport. |
| **Human-gated** | The agent never decides what the plan didn't settle. A gap goes to the chat, not to a silent ruling. |

Audience: professional developers shipping business software.

## Requirements

Claude Code ≥ 2.1.232 · **Node ≥ 18 on `PATH`** · macOS, Linux, Windows.

The suite runs on all three in CI — `ubuntu-latest`, `windows-latest`, and macOS locally — with one part excluded on Windows and named here rather than skipped quietly: `verify.env`, which raises and stops a dev environment, stops a layer by signalling its POSIX process group, and the `taskkill /T` form is unbuilt. Everything else in `verify` is platform-neutral.

Claude Code itself no longer needs Node — the native, Homebrew, WinGet and Linux-package installs ship a binary, and even the npm install "does not itself invoke Node" ([system requirements](https://code.claude.com/docs/en/setup)). hodos does: every hook and every skill runs `node scripts/*.mjs`. Without `node` on `PATH` the hooks fail on each event and the skills abort before they load — measured, not inferred: the `SessionStart` hooks report `Executable not found in $PATH: "node"` and the kernel's state injection aborts the invocation before the model sees the skill. Check with `node --version` before installing. If you manage Node with nvm, check it in a **non-interactive** shell (`env -i PATH=$PATH sh -c 'node --version'`): hooks are spawned without your login shell, so an nvm-only `node` leaves them failing while the skills still work.

## Install

```
claude plugin marketplace add mind-decay/hodos
claude plugin install hodos@hodos
```

To develop against a checkout:

```
claude --plugin-dir /path/to/hodos
```

## Quickstart

**1. Teach it the project — once.**

```
/hodos:init
```

A scan and an interview. You approve every write, one row at a time. What lands: a `CLAUDE.md` map of the repository, `.claude/rules/*.md` whose every rule cites at least two `file:line` precedents from your own code, and `.claude/hodos/config.json` holding the commands `init` actually **ran green in that session** — no guessed test command. It ends with `node scripts/config.mjs check` exiting 0.

**2. Open a task.**

```
/hodos:task add a totals row to the orders summary
```

The router puts the request on a path — `quick`, `standard`, `deep`, or `campaign` — from nine checklist rows, each with evidence, and shows you the verdict before it acts. Then research, then the design grilling, then a plan you approve. Nothing is written to the repository in this session. The exception is a change no program reads, such as a comment, documentation or a message text. That change takes the `inert` shape: you confirm it with the verdict, and the edit, its two commands, one commit and one fresh review all run here, with no second session.

**3. Execute it.**

```
/hodos:run
```

Task by task from the approved plan, test-first. Then the simplify pass, then a fresh reviewer that never saw the code being written, then a verifier that turns every claim the plan made into a command run *now* or a browser action taken *now*, with the output kept on disk. Two review iterations, two verify iterations, and then the breaker: the decision comes to you.

Interrupt it, close the terminal, let the context compact — `/hodos:run` resumes from the ledger. The ledger names commits, and git has them even when context does not.

**4. See where things stand.**

```
/hodos:status
```

Active and stale tasks, config validity, rule lint, and the rates accumulated across finished tasks.

The rest: `/hodos:campaign` for work bigger than one mergeable unit, `/hodos:review` for a diff hodos did not write, `/hodos:rule` and `/hodos:skill` and `/hodos:adapter` to extend the project layer, `/hodos:handoff` to give an unfinished task to someone else, and `/hodos:wait-what` when you have lost the thread.

## What hodos will and will not do

**It will** refuse to mark a task done without execution evidence; stop and ask when the plan is silent rather than ruling on your behalf; cap every loop and hand you the breaker; keep the diff out of the orchestrator's context; and delete its own working state when the task is finished.

**It will not**, in v1: synchronize with your issue tracker (it links, and nothing more); run without a human at the router verdict, the plan approval, the breaker, and any destructive action — there is an `autonomy: rulings` option, it is off, and it never removes those four; open a worktree per task; run agent teams; review with a second model; or verify a desktop application. Those are the recorded non-goals, not oversights.

## What it costs

Two numbers are measured, both against this repository's own fixtures and both in a subscription window:

- **A review dispatch:** six task-shaped packages reviewed by `opus` cost **$4.39**, about **$0.73 each**, at two turns per dispatch (`bench/review/runs/2026-09-06/`).
- **A routing verdict:** fourteen headless router sessions cost **$6.89**, about **$0.49 each**, at 7.6 turns and 3.3 evidence calls on average (`bench/router/runs/2026-09-03-11c/`).

**What a whole task costs, against the same work without hodos**, was measured on the pilot. The figures are tokens from each session's transcripts, subagents included (`docs/PILOT.md §12–§13`):

| Set | hodos ÷ bare | Model |
|---|---:|---|
| `quick`, three tasks per arm, different tasks | **17.42×** | `claude-opus-5` |
| `standard`, the same task in both arms (D2–D5) | **3.49×** | `claude-opus-5-5` |
| `deep`, one task (D1) | **5.28×** | `claude-opus-5-5` |
| the `inert` shape, three same-task pairs | **4.39×**, the median | `claude-opus-5-5` |

This multiplier is a price, not a target. The design's starting thresholds missed on every set, and they were withdrawn rather than reset (`DESIGN.md §11`).
- **`quick`.** Its figure is hodos's fixed overhead (route, plan, review, verify) set against one-file edits whose bare arms cost 0.66–1.57M.
- **`inert`.** A change no program reads now takes the `inert` shape instead, with one session, one reviewer and no verifier.

**What the price bought** (`PILOT.md §12`).
- Review filed majors on five of the ten hodos runs that ran it, and each was fixed before merge.
- Verify failed five: two on the run's own plan text rather than the product, and two sent to the breaker.
- Against that, a blind rubric could not tell the two arms' code apart (`§10`).

**Your own tasks.** `scripts/usage.mjs` sums a task's tokens from its own transcripts, and `/hodos:status --cost` reads them, so each project reads what its own tasks cost. The multiplier also needs a bare run of the same task, which a project does not make. The figures are token counts only: the price of a token is not in the transcript, and one bad number discredits the rest of the report.

**What the benches gate, and where one is red.** The reviewer finds 19 of 19 seeded defects at 93.2% precision, against gates of 80% and 85%. The router puts 95.1% of descriptions on the right type and 97.6% on the right campaign flag, against gates of 90%; its **path** accuracy is **82.9% against a gate of ≥85% — not met**, disclosed rather than lowered. A seeded recall number says the loop works end to end, and says nothing about a defect nobody seeded. Those defects are measured separately. On logic-lens's cases the reviewer found **29/30**, and on the pilot's own reviewed packages **2/4**, naming the other two in its Spec section only (`docs/PILOT.md §11`). `docs/BENCH.md` states what each number does not prove.

## Beside the first-party tools

Claude Code ships work that overlaps this, and hodos is not a replacement for any of it. `/code-review` reviews a diff on demand; hodos's reviewer is the same idea placed inside a loop that cannot run forever, run against a package a script builds — with the project's own `commands.test` and `commands.lint` executed, the call sites of the exports the diff changed named, and a bench that scores its recall. `code-simplifier` refines code while preserving behavior; hodos's simplify pass is an ordered ladder that stops at the first rung that applies, emits one line per cut and a `net:` line, and leaves a marker where it declined one. `claude-code-setup` recommends MCP servers, hooks and subagents and writes nothing; `/hodos:init` writes — rules with precedents, a migration ledger for instructions you already had, and a config whose commands were run in front of you. The difference in every case is the same one: a step here has to leave evidence a later step can check.

## Working in a team

The project layer is split on purpose, and the split is what makes it shareable.

**Committed, and reviewed like any other file:** `CLAUDE.md`, `.claude/rules/`, `.claude/hodos/config.json`, `.claude/hodos/campaigns/`, `.claude/hodos/adapters/`, `.claude/hodos/handoffs/`, and `.claude/settings.json`.

**Per machine, and gitignored:** `.claude/hodos/tasks/`, `active`, `sessions/`, `env/`, `history.jsonl`, and `.claude/settings.local.json`.

**A second developer**, on their own machine, installs the plugin and approves the `permissions.allow` entry themselves. That entry names one machine's plugin root, so it lives in `settings.local.json`, which Claude Code gitignores — it does not arrive with a pull, and declining it costs one permission prompt per script call rather than breaking anything.

**A teammate without hodos** still gets the rules and the map: `.claude/rules/*.md` load from a plain Claude Code session with no plugin at all, and they load when a file matching their `paths:` is opened with the Read tool. What that teammate does not get is every command, and every hook the plugin ships — those exit 0 wherever no `config.json` is found, so the repository behaves for them exactly as it did before.

**The rules are one developer's answers to `init`'s interview.** They are committed files: read them in review like any other committed file, and change them with `/hodos:rule` or by hand when they are wrong. A rule whose cited line has moved or gone is reported by `/hodos:status`, and `/hodos:status --prune` offers to re-point it.

## Documentation

`docs/README.md` is the index: the design, the component contracts, the file formats, the authoring rules, and the build plan.

## Contributing

`CONTRIBUTING.md`. The short version: a wording change to a skill, a reference, an agent prompt or a rule needs evidence — an eval result or a reproducible scenario showing the behavior before and after. Restructuring to comply with a style guide is not evidence.

## License

MIT — see `LICENSE`.
