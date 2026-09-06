---
name: handoff
description: Hand an unfinished task to another person. Writes one tracked file, .claude/hodos/handoffs/<slug>.md, holding where the work stands, what is open, the branch and its shas, and the plan verbatim — the task directory is gitignored and dies with the machine, so this file is what survives it. The developer commits it; /hodos:run picks it up on the other machine. Run it as /hodos:handoff [slug].
disable-model-invocation: true
argument-hint: "[slug]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

!`node ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs`

# handoff

One file, so that an unfinished task can be picked up by someone whose machine has never seen it. Nothing else about the task changes: the branch stays, the task directory stays, the ledger gets no line.

`node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs find`. `notFound` → say `run /hodos:init first` and stop.

## 1. The task

The argument, or the session's own task when there is none (`ledger.mjs sessions` names it, and the digest above already printed it). No task and no argument → say which tasks exist, and stop.

A task at `phase: done` is not handed off — it is finished, and what survives it is the commit bodies and the campaign node (decision **0079**). Say so and stop.

## 2. What goes in the file

Read `plan.md`, `state.json` and `ledger.md` of the task, and write `.claude/hodos/handoffs/<slug>.md` in the shape of `FORMATS.md §16`:

- **The header** — path, type, phase, the branch with its head and base shas — read from `state.json`, not from memory of this session.
- **`Reviewed:`** — `yes` when the ledger holds a `Review <k>: ACCEPT`, otherwise `no` and the phase the loop stopped at. The next person's review will cover what happens after the pickup, so what is behind it has to be stated.
- **`## Where it stands`** — two to five sentences, and the test is the last one: *the one thing the next person would otherwise have to rediscover*. A dead end you already walked into is worth more here than a restatement of the goal.
- **`## Open`** — the ledger's unclosed lines and every `Gap:` it holds, one per line. Not a summary: the lines themselves.
- **`## Plan`** — `## Goal`, `## Design` and `## Tasks` copied verbatim from `plan.md`. The receiving machine holds no copy of the plan to read them from, and a paraphrase is a second source of truth for a plan that already exists.
- **`## Next`** — one line: the command to run or the file to open first.

## 3. What the developer does with it

Say it in three lines: the path written, that it is **tracked and uncommitted**, and the commit that carries it — hodos does not commit for the developer here any more than anywhere else. Then name the two things the other person needs: the branch (pushed, or the handoff is a file about work nobody else has) and `/hodos:run <slug>`, which finds the file and offers the pickup.

The task directory stays where it is. Deleting it is `/hodos:status`'s question, asked after the work has actually moved.

## Completion

The file exists at `.claude/hodos/handoffs/<slug>.md`, `git status` shows it as a **new tracked file** and shows nothing else new, and the developer has been told what to commit and what to push. The ledger is exactly as long as it was.

## Anti-pattern

Writing the handoff from this session's memory instead of from `plan.md` and the ledger — the next person gets a story where the file has facts. Summarising the plan. Committing or pushing on the developer's behalf. Writing the file for a task whose work is not on a branch anyone else can fetch, without saying so.
