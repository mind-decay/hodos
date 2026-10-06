# land — the landing asked, the answer run, the directory, the last line

1. Inputs and outputs · 2. The question · 3. The run · 4. The task directory · 5. A spike's branch · 6. `Next:` · 7. Completion · 8. Anti-pattern

## 1. Inputs and outputs

**Entered** after `finish.md` has delivered its report and written `Finish: report delivered`, and from the resume table at phase `done`. The phase is `done` either way, and this reference writes no ledger line: whether the branch landed is read from git every time, never recorded (decision **0197**). A session that enters here claims nothing.

**Reads.** Once, on entering:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs next <slug> --done
```

It prints `{"slug", "step", "next", "land"}` (`FORMATS.md §7`). `land` is `null` when nothing is left to land, or `{options, note}`. Each option is `{label, run, next}`, where `run` is the exact commands it runs, `options[0]` is the recommendation, and the last option is always `leave it`, with nothing to run. The options are a function of git and `config.conventions.land` alone, so a resume after a landing offers nothing, and one after a push offers what is left. For a spike, also read the exit from its `Ruling: spike …` line now, before §4 can delete the ledger that holds it.

**Writes.** What the option the developer picked runs, and nothing else. The task directory, deleted on the developer's answer. The `Next:` line, last.

## 2. The question

A spike's landing is §5's, after the directory. For every other task:

- **`land` is `null`.** Nothing to land. Go to §4.
- **Only `leave it` is left.** Print the note, which says what blocks the landing — uncommitted changes, HEAD on another branch, no remote git would push to, no default branch, a map in another repository — and go to §4. A question with one answer asks nothing.
- **Otherwise, ask once.**

First fill `{subject}`, wherever a command carries it, in `config.conventions.commit`. The one commit an option makes is a campaign node's map, re-pointed after a rebase, and its subject names that node: `chore: <node> re-pointed in campaign <campaign>` under `conventional`, the project's own form under `ticket-prefix` or `custom:`. What the developer is shown is then exactly what runs.

Print the note above the question when there is one. Then one `AskUserQuestion` that leads with the decision (decision **0194**): land `<branch>`, and where it stands, in one line. One option per entry of `options`, in their order. The label is the option's `label`, and the description is its commands in full, one per line, in the order they run. `options[0]` is marked *(Recommended)* with the one line that makes it right:
- `conventions.land` names it;
- unset, the branch push leaves the merge to a merge request;
- with no remote, the fast-forward is the landing;
- the branch is in `<default>` already, and the remote is behind.

`leave it` says that nothing runs and that `Next:` will carry the commands.

The question is a mandatory stop under both autonomy settings (`DESIGN.md §4.4`): `config.autonomy: "rulings"` settles forks, never an outward-facing action. An answer in other words that names no option is `leave it`.

A session with no `AskUserQuestion` — a headless run — asks in chat, with the same options and commands, runs nothing, and goes to §4 with `leave it`'s `next`.

## 3. The run

Each command of the picked option runs **verbatim and in order, one Bash call each** — never joined with `&&`, so the first failure is the one reported and nothing after it runs. `run` and `handoff` allow only the plugin's scripts, so in a default permission mode each git command meets the platform's prompt too. That is a second check the developer configures, and a decline there stops the run like a non-zero exit.

**At the first non-zero exit,** print the command, its exit code and the first line it wrote on stderr, and stop. Nothing is retried, and no other option is tried in its place. A push the remote rejects, a protected branch or a default that moved since §1, is reported as git said it.

**A `git rebase` that exits non-zero** has stopped on a conflict. Run `git rebase --abort` once and report the rebase as aborted, with the branch as it was before it (PLATFORM-NOTES.md fact 73). A conflict is never resolved here.

**Nothing is forced.** No option carries `--force`, `-f`, `reset` or a substitution, and none is added: `git merge --ff-only` refuses a default that moved rather than making a merge commit.

A run that stopped keeps the task directory, because the landing is not made and `/hodos:run <slug>` asks again from what git says then. Skip §4 and end on `Next: /hodos:run <slug>`. A spike's delete runs after §4, which may already have deleted that directory, so its stopped run ends on the delete's commands instead, joined by ` && `, for the developer to type.

## 4. The task directory

The directory is deleted **only on the developer's confirmation** — it is a destructive action, and `DESIGN.md §4.4` stops on those under every autonomy setting. `AskUserQuestion`: delete `.claude/hodos/tasks/<slug>/`, or keep it. Name what goes with it: the plan and its Outcome, the ledger, the evidence. What survives either way is `history.jsonl` and the commits.

A session with no `AskUserQuestion` — a headless run — asks in chat, deletes nothing, and says the directory is kept for want of an answer. The branch stays in both cases; its landing was §2's question.

## 5. A spike's branch

A spike merges nothing (decision **0084**), and its `land` offers `delete <branch>`: `git switch <default>` and `git branch -D <branch>`.

- **The exit was "branch deleted".** Ask as §2 does, with the answer recorded in the ruling and in `## Outcome` named above the options, and run the answer as §3 does. `delete` is recommended, because it is the exit the plan named.
- **The exit opened a follow-up.** Nothing is asked: the branch is the follow-up's history. `Next:` is `/hodos:task <the follow-up>`.
- **Only `leave it`,** where no default branch was found: print the note, and the branch stays.

## 6. `Next:`

The last line, naming one step (decision **0191**):
- the `next` of the option taken. Every option but `leave it` has the step that follows the landing: `/hodos:campaign <campaign>` for a campaign node, so a go-ahead in words reaches the map, and `/hodos:task <description>` otherwise;
- `leave it`'s, declined or headless: the recommended commands, joined by ` && `, for the developer to type;
- `next` itself where nothing was asked — what follows, or the words of what blocks the landing;
- `/hodos:run <slug>` after a run that stopped (§3), and a spike's delete commands after its delete stopped;
- a spike's follow-up, `/hodos:task <the follow-up>`.

## 7. Completion

The landing answered and its commands run, declined, or stopped and reported; the task directory deleted or explicitly kept; `Next:` printed last. One question, one run, no retry: a run that failed is reported, not attempted again in this session.

## 8. Anti-pattern

Running a command the option did not show, or the shown ones joined into one call. Retrying a rejected push or a conflicted rebase, or reaching for `--force`. Resolving a rebase conflict instead of aborting it. Asking before the report is delivered, or asking a second time about the same landing. Recording the landing in the ledger: git is where it lives. Deleting the task directory because the task is finished: finished is why it is offered, not why it is done.
