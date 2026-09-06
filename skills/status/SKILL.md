---
name: status
description: Show the hodos state of this project and its hygiene — active and stale tasks, config validity, rule lint, session pointers, and the rates history.jsonl has accumulated. Read-only until the developer confirms an action. Run it as /hodos:status, with --debt for the simplify markers left in the code, --cost for token usage, or --prune for the rules and whether their anchored precedents still resolve.
disable-model-invocation: true
argument-hint: "[--debt|--cost|--prune]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

# status

Report what this project's hodos layer holds and what has gone stale in it. Every section is a script's output plus what to do about it. Nothing is deleted, moved or rewritten until the developer says so, and `--debt` changes nothing at all.

`node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs find` first. `notFound` → say `run /hodos:init first` and stop: there is no hodos layer to report on.

`--debt`, `--cost` and `--prune` are each a run of their own — §7, §8 and §3's reference — and skip everything above them.

## 1. The digest

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs --full
```

The same content the `SessionStart` hook prints, uncapped: the header, one line per active task with its phase and last event, one per stale task with its age, then one block per campaign map — its frontier counts, its ready and held nodes, its blocked ones with what they wait for, its fog, its active ones with the owner and branch each is claimed on, and its waits. Print it as it comes; its resume line already names the command for each task. A `held` node is a status and a dependency disagreeing: name the map and the node, and offer to fix the map, which is where node lines are changed. A map that reads `cross-repository (Stage 9b)` reaches into another repository, which 0.1 does not resolve — report the line and carry on.

## 2. The config

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs check
```

Exit 0 and `config: ok` → one line saying so. Findings → print them: an `error` is a key the scripts do not read, so the feature it names is off, which is what this check exists for — a misspelled gate is off in silence. A `warning` is a key hodos does not know, which a newer version may.

## 3. The rules

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/lint.mjs --project
```

Checks `CLAUDE.md`, `.claude/rules/` and `.claude/skills/` of this project: over-cap files, frontmatter outside the subset, rule precedents whose `file:line` no longer resolves or whose anchor has moved, and bare paths the map or a rule names that are gone. `--prune` is this section run on its own, over the whole layer and with its cost — read `references/prune.md` and follow it there; nothing in that run says a rule is dead, because nothing measures that (decision **0082**).

## 4. Stale tasks

A task whose `ledger.md` has not changed for `config.tasks.staleDays` days (14 by default) is stale. For each: the slug, the phase, the age, and the last ledger line. Then one question per task — **fold** it by running `/hodos:run <slug>` to the end, or **delete** `.claude/hodos/tasks/<slug>/`.

Deleting a task directory is destructive: `AskUserQuestion`, one task at a time, naming what goes with it — the plan and its Outcome, the ledger, the evidence. `history.jsonl` and the commits survive either way. A run with no `AskUserQuestion` asks in chat and deletes nothing.

## 5. Session pointers

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs sessions
```

One line per `.claude/hodos/sessions/<id>`, with the task it names and a reason when it is dead — it names no task, its task directory is gone, or the session's transcript is. Nothing dead → say so and move on. Something dead → offer `ledger.mjs sessions --gc`, which removes exactly those, and run it on confirmation.

`note: transcripts unreadable` in that output means this machine keeps its transcripts where this process cannot see them, so no pointer was judged by that test. Report the line rather than dropping it: it says the check did not run, not that everything is live.

## 6. The rates

Read `.claude/hodos/history.jsonl` — one JSON line per finished task. Over the tasks finished **in the last 30 days**:

- **upgrade rate** — tasks with `upgrades > 0` over the total, as `n/N (p%)`.
- **override rate** — tasks with `overrode: true` over the total: how often the router's proposal was changed at the verdict.
- **the last five gaps** — the `gapTexts` of the most recent tasks, newest first, each with its slug.

Fewer than three tasks in the window → print the counts and say the rates are not yet worth reading (decision 0051: two of two reads as 100%). Nothing in the file → `no finished tasks yet`.

These are the developer's numbers to read, not a prompt's to consume. A gap that appears four times is a sentence for `references/plan.md`, written by a person with this list in front of them.

## 7. `--debt` — the `hodos:` markers

A read-only run (decision 0017). `Grep` the project for `hodos:`, excluding `node_modules/`, `.git/`, `dist/`, `build/`, `out/`, `coverage/` and `.next/`. Each marker was written by a simplify pass as `hodos: <ceiling> — upgrade when <trigger>`.

One row per marker, sorted so a file's markers are together:

```
<file>:<line>, <what was simplified>. ceiling: <the limit>. upgrade: <the trigger>.
```

A marker with no `upgrade when` half is tagged `no-trigger` at the end of its row — a ceiling nobody can act on is the half of the form that decays. Close with `<N> markers, <M> with no trigger.` — or, when there are none, with `No hodos: debt.` and that line alone; the two closers are alternatives, and printing both says the same nothing twice. Then stop: this run proposes nothing and writes nothing.

## 8. `--cost` — what the tasks cost

Read `history.jsonl`. For each finished task with a `usage` object: the slug, `input`, `output`, `cacheRead`, `cacheCreation`, and how many sessions it covers. Then the totals.

`"usage": null` → `no usage data` for that row: no transcript could be read when it finished. Never a substituted number.

Token counts only. hodos prints no dollar figure — the price of a token is not in the transcript — and the T-1 multiplier needs the paired runs of the pilot (`DESIGN.md §11`), so say that rather than dividing by something this file does not hold.

## Completion

Every section printed; every stale task and every dead pointer carrying a proposed action; nothing deleted without an answer. `--debt` prints its rows and its count; `--cost` prints its table; `--prune` prints every rule and asks only about the ones whose citations have rotted.

## Anti-pattern

Deleting a stale task because it is stale. Staleness is why it is offered.

Reporting a rate over two tasks as if it meant something.

Fixing what the lint found. This skill reports; the fix is a task.
