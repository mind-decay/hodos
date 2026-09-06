---
name: review
description: Review a diff hodos did not write — a teammate's branch, a range, or the working tree under a path — with the same fresh reviewer /hodos:run uses. It writes no task, no ledger and nothing into the project; the package and the review go to a temporary directory, and the findings are printed. Run it as /hodos:review [branch|ref|range|path], or with no argument to review the branch you are on.
disable-model-invocation: true
argument-hint: "[branch|ref|a..b|path]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

!`node ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs`

# review

One fresh reviewer against a diff this session did not write, and a printed verdict. Nothing is created in the project — no task is opened, no ledger line is written, no branch, no commit. What this run leaves behind is a file in a temporary directory and what the developer does with the findings.

`node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs find`. `notFound` → say `run /hodos:init first` and stop: the reviewer reads this project's rules and config, and there are none.

## 1. The target

The argument, or the current branch when there is none. Four forms, and the script decides between them:

| Form | What is reviewed |
|---|---|
| a branch or ref | its merge-base with the default branch, to its tip |
| `a..b` | exactly that range |
| a path | the working-tree changes under it, committed or not |
| (nothing) | the branch HEAD is on, as the first row |

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/review-package.mjs --target <target>
```

It prints the path it wrote. Exit 1 is the answer, not an obstacle to work around:

- **the target names a branch an open hodos task is on** — the message names the slug. Say so and stop: that diff has a plan, and `/hodos:run <slug>` reviews it against that plan, which is a stronger review than this one. Offering to do it here anyway is offering the weaker of the two.
- **the target is the default branch itself** — the message names it and suggests a range (`main~3..main`). This is what a bare `/hodos:review` on the default branch hits, so it is the likeliest of them: there is no fork point to compare against, and "everything since the beginning" is not a review.
- **the target changes nothing**, is not a ref, or the repository has no default branch to compare against — say which, and ask for the range.

## 2. The dispatch

One reviewer, dispatched with the Agent tool as `subagent_type: "hodos:hodos-reviewer"`, `model` from `config.models.review`. The message carries paths and nothing else — the same shape `run` uses, minus the plan, which does not exist here:

```
Review the diff in this package. There is no plan: its Intent section is the
author's commit messages, and a finding that the intent is unclear is a finding.
Package: <the path the script printed>
Rules: <abs path>/.claude/rules/
Config: <abs path>/.claude/hodos/config.json
Defaults list: ${CLAUDE_PLUGIN_ROOT}/skills/run/references/defaults.md
Write <same directory>/review.md and return the verdict line.
```

Then wait for the completion notification. Never a fork, and never a second reviewer to break a tie: two reviewers on one diff is two opinions, and the developer already has one.

**Do not read the diff yourself before the dispatch.** A session that has read the diff argues with the reviewer instead of reporting it, which is the reason the package is a file and the reviewer is a subagent (`DESIGN.md §7.3`).

## 3. What is reported

Read `review.md` and print, in the chat:

1. The verdict line as the reviewer wrote it — `ACCEPT` / `NEEDS_WORK` / `REJECT` with the blocker/major/minor counts.
2. Every blocker and major, one line each: `<severity> · <file>:<line> — <finding> → <fix>`.
3. The reviewer's Coverage line verbatim, including what it did not read. A package of a mechanical change or a generated file leaves things out by design, and the developer needs to know which.
4. The path to `review.md`, so it can be kept, pasted into a merge request, or thrown away with the temporary directory.

Minors go in a count, not a list, unless the developer asks for them.

## 4. What this run does not do

Fix anything. The code belongs to whoever wrote it, and a finding on a teammate's branch is theirs to accept or refuse. If the developer asks for the fixes, that is a task — `/hodos:task` with the finding as the description, routed like any other work — and it is opened on their word, not on this session's reading of the review.

No ledger line is written, no `history.jsonl` entry, and no rate this reports feeds. `/hodos:status` counts what hodos built; this reviewed something it did not.

## Completion

A verdict printed with its blockers and majors, the Coverage line, and the path to `review.md`. `git status` is what it was before the run, and `.claude/hodos/tasks/` holds exactly the directories it held.

## Anti-pattern

Opening a task for the branch under review. Reading the diff to "get context" before dispatching. Softening the dispatch — "only the store matters", "ignore the tests" — which buys a clean verdict with the finding nobody was allowed to make. Reviewing a branch that has a hodos task instead of running `/hodos:run` on it.
