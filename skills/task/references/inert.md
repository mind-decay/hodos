# inert — one session, one reviewer, for a change with no behaviour

Read on entering step 2i, after `route.md` §5 had the developer confirm a `quick` verdict with `Shape: inert` and the short plan in one question (decision **0183**). Input: `brief.md`, the short plan as confirmed, the config from step 0. Output: `plan.md` in its inert form, a branch, one commit per task, `evidence/`, `review.md`, the ledger through `Finish`, and the report.

Sections: 1 the shape · 2 the plan and the branch · 3 the edit · 4 the commands, then the commit · 5 the review · 6 finish · 7 the ratchet · completion · anti-pattern · bound.

The whole task runs in this session. No step waits for `/hodos:run`, and no handoff line is printed.

## 1. The shape

`inert` holds when every line the change edits is text no program reads to decide anything (`FORMATS.md §3`). That covers:

- a comment;
- documentation;
- a message that only a human reads: an assertion's text, a log's text, or an error's text that no caller or test matches on;
- whitespace.

A line the program branches on, returns, stores or compares is behaviour. So is a message a test or a caller matches by content. The developer confirmed the shape at the verdict. This reference keeps it true, or ends it (§7).

## 2. The plan and the branch

Write `.claude/hodos/tasks/<slug>/plan.md` in the inert form of `FORMATS.md §5`, from the short plan the developer confirmed and from nothing else:

```markdown
# Plan — <slug>
Path: quick · Type: <type> · Shape: inert · Branch: <name> · Campaign: <c/n or —> · Base: <sha>

## Goal
<one paragraph: what will read differently when this is done>

## Non-goals
- No line a program reads.

## Tasks
### T1. <title>
Files: <every file the edit touches>
Acceptance: `commands.test` and `commands.lint` green; <what the text says afterwards>

## Open questions
(empty)
```

The plan has no `## Decisions`, no `## Design` and no `## Verify plan`, because the shape leaves them nothing to hold. There is one task per commit, and an inert change is nearly always one task.

Create the branch from `config.conventions.branch`. A branch that already exists is a question, never a checkout. Then run `ledger.mjs add "Plan: approved" --tasks <n> --branch <name>`, and write the base it prints into the header's `Base:`.

## 3. The edit

For each task, run `ledger.mjs add "Task <n>: started"`, then make the edit the plan names, in the files it names. The project's rules for those files apply to the text as they do to any other line.

If the edit needs a line a program reads, the change is no longer this shape. Go to §7 before writing that line.

## 4. The commands, then the commit

After the last edit of a task, run `config.commands.test` and `config.commands.lint` once each, and write each one's output to `evidence/<nn>-<name>.txt`. A `null` command writes the line `<command>: not configured` in its file. This output is the task's execution evidence, and it is the whole of the shape's verify.

Both green: make one commit in `config.conventions.commit`, then record it:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs add "Task <n>: done" --sha <sha> --inert
```

`--inert` stands where a red phase or an exemption stands on any other task, and the ledger accepts it only because the verdict carried the shape.

A command that comes back red: run it again with the edit stashed (`git stash -u`, the command, `git stash pop`). The `-u` matters: an edit that adds a file would otherwise stay in the tree for the re-run.
- **Red there too.** The tree was red before this change. Say so, ask the developer through `AskUserQuestion` whether to continue, and record the answer as a `Gap:`.
- **Green there.** This edit changed what a program does. Go to §7.

## 5. The review

On entering this section, read `${CLAUDE_PLUGIN_ROOT}/skills/run/references/review-loop.md` and run its §2–§7 as written: the package, one `hodos-reviewer` dispatch, the verdict, the fix pass, the scoped re-review, and the breaker. The package carries `## Shape: inert` in place of a design, and the reviewer checks that claim.

That reference sends `ACCEPT` to `verify`. The ledger sends an inert task to `finish` instead, and this section follows the ledger.

A review `major` on the shape, meaning an edited line that a program reads, goes to §7 and is not fixed.

## 6. Finish

Read `${CLAUDE_PLUGIN_ROOT}/skills/run/references/finish.md` and run it. The shape has no `verify.md`. The Outcome's `Verify:` line and the report's `Verify:` field both read `— inert: commands.test and commands.lint green, evidence/<files>`, and there is no claim feedback and no pin. `Finish: report delivered` writes the history line with its `shape`.

## 7. The ratchet

The shape ends as soon as the change needs a line a program reads. Three things show it: the edit calls for one (§3), a command went red on this edit alone (§4), or the review names one (§5).

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs add "Upgrade: inert→quick — <the line, and what reads it>"
```

The ledger restarts its task count and both loops at this line and returns the task to `plan` (decision **0184**). The work is rebuilt, not carried: a line a program reads gets its red test before it lands. Then, in order:
1. **Take the edit out of the tree.** Run `git revert --no-edit <base>..HEAD`, with `<base>` from the `Plan: approved` line. That reverts every commit the task made, newest first: its `Task <n>: done (<sha>, inert)` commits, and the commits of any fix pass the review loop ran. An edit not yet committed is this session's own, so `git stash -u` and then `git stash drop`, which takes a file the edit added as well. Say in chat what was reverted.
2. **Re-plan.** Return to the kernel's step 6. The plan is grilled into a full `quick` plan with its ten design fields, and what the reverted edit did becomes its T1, built test-first like any other task.
3. **Approve on the same branch.** At step 8 the task keeps the branch it has, so no branch is created and there is no question about an existing one. `Plan: approved` records the base the rebuild starts from, which is the revert, and the task continues in `/hodos:run`.

The ratchet is one way. The ledger refuses a `Route:` that brings `inert` back after the verdict, and refuses an upgrade that does not start at `inert` while the task carries it.

## Completion

One of two endings:
- `Finish: report delivered` in the ledger and the report in chat, after one `hodos-reviewer` dispatch per review iteration and no `hodos-verifier` dispatch;
- an `Upgrade: inert→quick` line, with the edit reverted and the kernel back at step 6.

## Anti-pattern

- Classing a change `inert` in order to skip the verifier.
- A doc comment edit that also renames the parameter it documents.
- Running a verifier to be safe. The commands are the evidence, and the reviewer is the second reader.
- Reading the diff before the review dispatch.

## Bound

The review loop's two iterations, then the breaker (`review-loop.md §7`). The commands run once per task. The exceptions are the one diagnostic re-run with the edit stashed (§4), and a re-run belonging to the fix pass that caused it.
