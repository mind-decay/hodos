---
name: handoff
description: Hand an unfinished task to another person. Writes one tracked file, .claude/hodos/handoffs/<slug>.md, holding where the work stands, what is open, the branch and its shas, and the plan verbatim — the task directory is gitignored and dies with the machine, so this file is what survives it. It asks whether to commit and push it, with the exact commands, and runs the answer; /hodos:run picks it up on the other machine. Run it as /hodos:handoff [slug].
disable-model-invocation: true
argument-hint: "[slug]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

!`node ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs`

# handoff

One file, so that an unfinished task can be picked up by someone whose machine has never seen it. Nothing else about the task changes: the task directory stays, the ledger gets no line, and the branch moves only by the commit the developer picks.

`node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs find`. `notFound` → say `run /hodos:init first` and stop.

## 1. The task

The argument, or the session's own task when there is none (`ledger.mjs sessions` names it, and the digest above already printed it). No task and no argument → say which tasks exist, and stop on `Next: /hodos:handoff <the most recently active slug of those listed>`.

A task at `phase: done` is not handed off — it is finished, and what survives it is the commit bodies and the campaign node (decision **0079**). Say so and stop on `Next:` with the `next` of `node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs next` (decision **0191**).

## 2. What goes in the file

Read `plan.md`, `state.json` and `ledger.md` of the task, and write `.claude/hodos/handoffs/<slug>.md` in the shape of `FORMATS.md §16`:

- **The header** — path, type, phase, the branch with its head and base shas — read from `state.json`, not from memory of this session.
- **`Reviewed:`** — `yes` when the ledger holds a `Review <k>: ACCEPT`, otherwise `no` and the phase the loop stopped at. The next person's review will cover what happens after the pickup, so what is behind it has to be stated.
- **`## Where it stands`** — two to five sentences, and the test is the last one: *the one thing the next person would otherwise have to rediscover*. A dead end you already walked into is worth more here than a restatement of the goal.
- **`## Open`** — the ledger's unclosed lines and every `Gap:` it holds, one per line. Not a summary: the lines themselves.
- **`## Plan`** — `## Goal`, `## Design` and `## Tasks` copied verbatim from `plan.md`. The receiving machine holds no copy of the plan to read them from, and a paraphrase is a second source of truth for a plan that already exists.
- **`## Next`** — one line: the command to run or the file to open first.

## 3. What the developer does with it

The file is written and not committed, and the other person needs it and the branch both: a handoff nobody pushed is a file about work nobody else has. Ask once what happens to it (decision **0197**):

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs next <slug> --handoff .claude/hodos/handoffs/<slug>.md
```

It prints `land` the way `next --done` does (`FORMATS.md §7`): with a remote, **commit and push**, **commit**, or **leave it**; with none, **commit** or **leave it**. The commands are exact: `git add <file>`, `git commit -m "{subject}" -- <file>`, which commits the handoff alone whatever else is staged, and `git push -u <remote> <branch>`. Fill `{subject}` in `config.conventions.commit` — `chore: hand off <slug>` under `conventional` — then ask and run as `${CLAUDE_PLUGIN_ROOT}/skills/run/references/land.md` §2–§3 do: one `AskUserQuestion` showing each option's commands in full, the first *(Recommended)* because the file travels only with the branch, the answer run verbatim, one Bash call per command, and the first non-zero exit reported and never retried. `land: null`, outside a repository, or only **leave it**, with HEAD on another branch, asks nothing: print the note. A headless session asks in chat and runs nothing.

The last line is `Next:` with the `next` of the option taken: `/hodos:run <slug> on the other machine`, which finds the file and offers the pickup, once the branch is pushed, the push still to make where it is not, or `next` itself where nothing was asked.

The task directory stays where it is. Deleting it is `/hodos:status`'s question, asked after the work has actually moved.

## Completion

The file exists at `.claude/hodos/handoffs/<slug>.md`; `git status` shows it committed, or new and tracked where the answer left it, and shows nothing else new; the answer's commands ran, or the run stopped and said where; `Next:` is the last line. The ledger is exactly as long as it was.

## Anti-pattern

Writing the handoff from this session's memory instead of from `plan.md` and the ledger — the next person gets a story where the file has facts. Summarising the plan. Committing or pushing without the developer's answer to the question that shows the command. Writing the file for a task whose work is not on a branch anyone else can fetch, without saying so.
