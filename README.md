# hodos

> ὁδός — *the way*. μέθοδος — *following the way*.

hodos is a Claude Code plugin that installs a complete development workflow into any project: it learns the project's conventions once (`/hodos:init`), then drives every task through research → plan → execute → review → verify → finish with bounded loops, file-based state, and evidence-based verification.

The developer is the driver of ideas and decisions. hodos is the driver of the *process*: it asks the right questions, refuses to guess where the plan is silent, reviews with fresh eyes, verifies by running, and cleans up after itself.

**Status: 0.1.0.** Every phase is built and measured against four fixture projects. It has never been run against a real codebase — that is the pilot, and the numbers below say which claims have evidence and which are still hypotheses.

| | hodos |
|---|---|
| **Project-aware** | `init` derives rules from the codebase's own precedents and from authoritative stack sources, filtered by a behavior-shaping test. |
| **Frugal** | Three skill descriptions in the model's listing; the diff never enters the orchestrator's context; one reviewer; model tiering. |
| **Bounded** | Two review iterations, two verify iterations, then a breaker that hands the decision to the human. |
| **Verified** | "Done" requires fresh execution evidence against the project's own verify recipe — tests, typecheck, lint, browser, HTTP, accessibility, viewport. |
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

The router puts the request on a path — `quick`, `standard`, `deep`, or `campaign` — from nine checklist rows, each with evidence, and shows you the verdict before it acts. Then research, then the design grilling, then a plan you approve. Nothing is written to the repository in this session.

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

**The number that matters most is not measured yet:** what a whole task costs with hodos against the same task without it. The targets are `quick` ≤ 1.3× and `standard` ≤ 2× bare Claude Code, and they are *hypotheses to be corrected by the pilot*, not results. `scripts/usage.mjs` sums a task's token usage from its own transcripts and `/hodos:status --cost` reads it, so the multiplier is measured per task rather than estimated once. Token counts only — the price of a token is not in the transcript, and one bad number discredits the rest of the report.

**What the benches gate, and where one is red.** The reviewer finds 19 of 19 seeded defects at 93.2% precision, against gates of 80% and 85%. The router puts 95.1% of descriptions on the right type and 97.6% on the right campaign flag, against gates of 90%; its **path** accuracy is **82.9% against a gate of ≥85% — not met**, disclosed rather than lowered. A seeded recall number says the loop works end to end; it says nothing about a defect nobody seeded. `docs/BENCH.md` states what each number does not prove.

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
