---
name: status
description: Show the hodos state of this project and its hygiene — active and stale tasks, config validity, rule lint, session pointers, and the rates history.jsonl has accumulated. It writes nothing to the project until the developer confirms an action; §1's git fetch updates remote-tracking refs and nothing else. Run it as /hodos:status, with --debt for the simplify markers left in the code, --cost for token usage, or --prune for the rules and whether their anchored precedents still resolve.
disable-model-invocation: true
argument-hint: "[--debt|--cost|--prune]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

# status

Report what this project's hodos layer holds and what has gone stale in it. Every section is a script's output plus what to do about it. Nothing is deleted, moved or rewritten until the developer says so, and `--debt` changes nothing at all. The one call that reaches outside this machine is §1's fetch, which updates remote-tracking refs and nothing else (decision **0080**).

`node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs find` first. `notFound` → say `run /hodos:init first` and stop: there is no hodos layer to report on.

`--debt`, `--cost` and `--prune` are each a run of their own — §7, §8 and §3's reference — and skip everything above them.

## 1. The digest

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs --full --fetch
```

`--fetch` is `git fetch --no-tags --quiet` under five seconds in each repository a campaign map lives in, so a claim committed on somebody else's branch is read from a current ref (decisions **0080**, **0138**). No merge, no rebase, no working-tree change; no hook passes the flag. Then the same content the `SessionStart` hook prints, uncapped: the header, one line per active task with its phase and last event, one per stale task with its age, then one block per campaign map — its frontier counts, its ready and waiting nodes, its blocked ones with what they wait for, its fog, its active ones with the owner and branch each is claimed on, and its waits. Print it as it comes, all but its last line; its rows already name the command for each task and each map. That last line is `Next:`, the one step the script ranks first over the tasks and maps it read (decision **0198**): hold it while §2–§6 print, and close the report with it, after every action they offer. A `waiting` node is a status and a dependency disagreeing: name the map and the node, and offer to fix the map, which is where node lines are changed. A map may live in another repository — `config.campaigns.external[]` names it, and its block reads like any other. A `claimed` node is one another branch holds: name the owner and the branch, and say that it is not on this session's frontier (decision **0135**). `fetch failed — the map is as of your last pull` means the claims below it are as fresh as the developer's last pull and no fresher — report the line and the frontier both, and never a retry loop.

## 2. The config

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs check
```

Exit 0 and `config: ok` → one line saying so. Findings → print them: an `error` is a key the scripts do not read, so the feature it names is off, which is what this check exists for — a misspelled gate is off in silence. A `warning` is a config that loads carrying something that will not do what it looks like: a key hodos does not know, which a newer version may; a key it has retired; or a pinned predicate written on a shape that rots — a class or an id, a walk to an element rather than a query for it, a bare expression where the adapter runs a function (decisions **0118**, **0129**, **0130**).

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

Its rows are the engine's bookkeeping, and who is on which task is already in §1's task rows, so print one line of them (decision **0199**). A row is dead when it names no task, its task directory is gone, or the session's transcript is. Nothing dead → `Session records: all point at open tasks.` and move on. Something dead → `<n> session records left by closed sessions — remove them?`, offering `ledger.mjs sessions --gc`, which removes exactly those, and run it on confirmation.

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

A marker with no `upgrade when` half is tagged `no-trigger` at the end of its row — a ceiling nobody can act on is the half of the form that decays. Close with `<N> markers, <M> with no trigger.` — or, when there are none, with `No hodos: debt.` and that line alone; the two closers are alternatives, and printing both says the same nothing twice. Then end on one `Next:` line and stop, writing nothing: `/hodos:task <lift the marker at <file:line>>` for the first marker, or the `next` of `node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs next` when there is none.

## 8. `--cost` — what the tasks cost

Read `history.jsonl`. For each finished task with a `usage` object: the slug, `input`, `output`, `cacheRead`, `cacheCreation`, and how many sessions it covers. Then the totals.

`"usage": null` → `no usage data` for that row: no transcript could be read when it finished. Never a substituted number.

Token counts only. hodos prints no dollar figure — the price of a token is not in the transcript — and the multiplier, hodos ÷ bare on the same task, needs a bare run of that task, which this file does not hold (`DESIGN.md §11`). Say that rather than dividing by anything else, and end on `Next:` with the `next` of `node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs next`.

## Completion

Every section printed, and the report closed on the digest's `Next:` line; every stale task and every dead pointer carrying a proposed action; nothing deleted without an answer. `--debt` prints its rows and its count; `--cost` prints its table; `--prune` prints every rule and asks only about the ones whose citations have rotted.

## Anti-pattern

Deleting a stale task because it is stale. Staleness is why it is offered.

Reporting a rate over two tasks as if it meant something.

Fixing what the lint found. This skill reports; the fix is a task.
