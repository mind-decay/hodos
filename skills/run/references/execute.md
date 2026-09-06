# execute — the task loop and the simplify pass

1. Inputs and outputs · 2. The loop, per task · 3. The red phase · 4. The three attempts · 5. Mutation · 6. The commit · 6b. Two shapes that are not the loop · 7. The simplify pass · 8. Completion · 9. Anti-pattern

## 1. Inputs and outputs

**Reads.** `.claude/hodos/tasks/<slug>/plan.md` — `## Tasks` for the task under work, `## Design` for the field it touches, `## Non-goals` for what it must not grow into. `state.json` for `tasks.current`, `redCheckAttempts` and `base`. `config.commands`, `config.conventions.commit`. The project's `.claude/rules/*.md` for the precedents the code follows.

**Writes.** One commit per task on the task's branch, plus one for the simplify pass when it cut something. The ledger lines below, each through `ledger.mjs`. `hodos:` markers in the code where the pass declined a cut.

**Entered at** `state.tasks.current`, never at task 1: a task whose `done` line is in the ledger has its commit in git.

## 2. The loop, per task

For task `<n>`, in the plan's order:

1. `ledger.mjs add "Task <n>: started"`.
2. Read the task's `Files:` and `Acceptance:` lines, and the design fields they touch. The acceptance criterion is the specification; the summary line is its title.
3. The red phase (§3).
4. Implement the smallest change that turns the check green, in the modules `### Modules` names, following the precedents `### Precedent` cites and the rules whose `paths:` match the files.
5. Run the task's check — `config.commands.test`, scoped to this task's test where the runner allows it. Run `config.commands.typecheck` too when a type, a signature, or a public export changed.
6. Red → §4. Green → §5.
7. Commit (§6), then `ledger.mjs add "Task <n>: done" --sha <sha>`, with `--tests <reason>` when the task is exempt.

Then the next task, until `## Tasks` is exhausted; then §7.

## 3. The red phase

Write the acceptance check first, as a test in the project's own harness, and run it before any implementation exists. It must fail **for the reason the criterion names**: a test that errors because the module does not parse yet is broken, not red, and the run says so and fixes the test. Then `ledger.mjs add "Task <n>: test red"`, which is the line `ledger.mjs` requires before it will record `done`.

A task deviates only when its plan entry carries `Tests: <reason> — <one line> · verified by <what>` with `<reason>` one of `visual`, `glue`, `infra`, `no-harness`. That task writes no test and no `test red` line, and its `done` line carries `--tests <reason>` — the same reason twice, in the plan and in the ledger, so the reviewer compares the two records.

The reason is the plan's. A task with no `Tests:` line is test-first; deciding here that it is really glue is a `Gap:` for the chat, and the answer comes back before the code does.

## 4. The three attempts

A check that stays red after the implementation gets three attempts, and each one is recorded before the next change:

`ledger.mjs add "Task <n>: red-check attempt <k>/3 — <what the check reported and what changed in response>"`

One diagnosis, one change, one re-run. `redCheckAttempts` in `state.json` counts them and survives a killed session, so a resumed run continues the count rather than restarting it.

The third failure ends the phase. Say in chat: what the check asserts, what the code does instead, the two hypotheses already ruled out and the evidence that ruled them out, and the one question whose answer would unblock it. No fourth attempt under another name — a widened assertion, a skipped case, or a check swapped for an easier one is the failure this bound exists to catch.

## 5. Mutation

A green test is a claim; mutation is the proof. For each test written in step 3:

1. Break the one production line the acceptance criterion pins — invert the condition, change the constant, drop the call.
2. Run the task's check. It goes red. That output goes in the transcript.
3. Restore the line. Run again. Green.

A test that stays green against the broken line pins nothing: it is the test that is wrong, and it is rewritten before the commit. One line per test — the line the criterion names — not every line the diff touched.

## 6. The commit

One task, one commit, on the task's branch. The message follows `config.conventions.commit`: imperative subject, and a body that says why this shape rather than the obvious alternative. The task's test and its implementation go in the same commit — a commit that leaves the branch red splits one task across two.

Push, merge, and rebase belong to the developer. The branch stays where it is.

## 6b. Two shapes that are not the loop

**`mechanical`** (the shape `brief.md` carries under the verdict). One edit repeated across more files than anyone reads: the artifact is the **codemod**, not the forty diffs that follow from it.

1. Write the codemod as a file in the repository — a script the project can run, in the project's language, with the transformation stated at the top in one sentence. It is committed with the change it makes.
2. The red phase applies to the codemod, not to each file: a test that runs it over a fixture holding one instance of the shape, asserting the rewritten text. That is `Task <n>: test red` like any other.
3. Run it, review the diff yourself first, and commit the codemod and every file it touched as one task.
4. Package the review with `review-package.mjs <slug> --mechanical <path-to-codemod>`: the codemod and a three-file sample enter the diff, and every other file is named under `## Not packaged` with its churn. The reviewer's Coverage line names what it did not read — that is the trade, and it is written down rather than assumed.

A file the codemod could not handle is not a hand edit hidden in the same commit: it is its own task, with its own acceptance criterion, and the codemod's sentence says which cases it does not cover.

**`spike`** (the type). The plan carries a question, a timebox and an exit instead of tasks (decision **0084**), so this loop does not run: there is no red phase, no per-task commit, and no review or verify to follow — a spike merges nothing.

1. Work on the branch the approval created, against the timebox. Keep what you learn in the chat and in the ruling below, not in a plan that has no tasks to hold it.
2. At the answer or at the timebox, whichever comes first, take the exit the plan named: **delete** the branch, or **open a follow-up task** and record its slug.
3. `ledger.mjs add "Ruling: spike <question, in five words> — <the answer>, <the exit taken: branch deleted, or follow-up <slug> opened> — <what it costs if the answer is wrong>"`, then `finish.md`, whose report is the answer and the exit rather than a diff. The exit rides in the answer segment because the ledger grammar is closed at three (`FORMATS.md §6`, decision **0084**) — and it is not optional: the ruling is the only record that outlives the task directory, so an answer without its exit leaves nobody able to say what happened to the code.

A spike that starts committing tasks has stopped being a spike: the answer arrived, and what follows it is the follow-up task, routed on its own.

## 7. The simplify pass

After the last task's `done` line, once, over `git diff <state.base>..HEAD`.

Walk each hunk down the ladder in `defaults.md` and stop at the first rung that holds. The ladder shortens the solution, never the reading: it runs after the change is understood, and the smallest change in the wrong place is a second defect. A cut that changes behavior is not a cut — it is the next task, or a `Gap:`.

Emit one line per cut, to the transcript, in the `L<line>: <tag> <what>. <replacement>.` form `defaults.md` fixes, and close with `net: -<N> lines` — or with `Lean already.` when the walk cut nothing.

A cut the pass declines because the simpler form is *correct but bounded* is recorded in the code as the `hodos:` marker `defaults.md` fixes, both halves mandatory. Unfinished work is a `Gap:` instead; a known defect is a review finding. The marker outlives the task directory, and `/hodos:status --debt` is what reads it later.

Then commit what was cut, and record the pass either way:

`ledger.mjs add "Simplify: done" --sha <sha> --net <n>`

`<n>` is how many lines the pass removed, written as a count — the stored line writes the minus sign itself.

A pass that cut nothing makes no commit and passes the head it examined with `--net 0`: the transcript says `Lean already.` and the ledger says `net -0`. They are two channels, not two alternatives.

## 8. Completion

Every task in `## Tasks` has a `Task <n>: done (<sha>)` line, every test-first one has its `test red` line before it, and the ledger's last line is `Simplify: done`. `state.phase` reads `review`, which is where the run goes next.

A `spike` satisfies none of those three and is finished anyway: it has no `## Tasks`, makes no simplify commit, and goes to `finish` from `approved`. Its completion is §6b's — the exit taken and the `Ruling:` written, naming the answer and the exit both.

## 9. Anti-pattern

Two tasks in one commit. A `TODO`, or an `any` that is "temporary". `--tests glue` on a task the plan did not exempt. A fourth attempt at a red check wearing a different name. A simplify pass reported as done with no cut lines and no `Lean already.` — the pass is the emitted lines, not the claim.
