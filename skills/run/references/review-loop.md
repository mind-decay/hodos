# review-loop — the package, the dispatch, the fix, the breaker

1. Inputs and outputs · 2. The package · 3. The dispatch · 4. The verdict · 5. The fix pass · 6. Iteration 2 · 7. The breaker · 8. Completion · 9. Anti-pattern

## 1. Inputs and outputs

**Reads.** `state.json` for `review.iteration`, `base` and `lastCommit`; `review.md` when the reviewer has written one; `config.models.review`, `config.commands`; the files a finding names, at the lines it names. The package's `## Projects` section is the reviewer's to read: the script writes it, this session does not compute it.

**Writes.** `review-input.md`, through the script. One commit per fix pass. The ledger lines below, each through `ledger.mjs`.

**Entered** at phase `review` — the ledger holds `Simplify: done` — or at phase `fix`, where the open findings of the last verdict are the work.

**The diff is not read here.** The package is written by a script and read by a fresh agent; this session's read of the code is the files the findings name. A session that has argued its way through the diff defends it, which is the whole reason the review is a dispatch.

## 2. The package

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/review-package.mjs <slug>
```

It prints the path it wrote. `k` is `state.review.iteration + 1`; on iteration 2 the command carries `--since <fix-sha>` (§6).

An exit 1 names what is missing — the task, the plan's `## Design`, the base the ledger never recorded. Fix that, or say it in chat and stop. The package is never assembled by hand: a diff pasted into a message is a diff this context has read.

## 3. The dispatch

One reviewer, dispatched with the Agent tool as `subagent_type: "hodos:hodos-reviewer"` — the plugin-qualified name is the one the tool takes — with `model` from `config.models.review`. The 40-turn bound is the definition's own (`agents/hodos-reviewer.md`), not this session's to pass. Never a fork: a fork inherits this session, and this session wrote the code.

The message carries paths and one-line instructions, and nothing else:

```
Review the task <slug>.
Package: <abs path>/review-input.md
Rules: <abs path>/.claude/rules/
Config: <abs path>/.claude/hodos/config.json
Defaults list: ${CLAUDE_PLUGIN_ROOT}/skills/run/references/defaults.md
Write <abs path>/review.md and return the verdict line.
```

Then wait for the completion notification. No polling, no sleep, no second dispatch while the first is out.

What the reviewer looks for is its own. A dispatch that scopes the findings — "the store is out of scope", "T2 is only styling" — buys a clean verdict and pays for it with the defect nobody was allowed to mention.

## 4. The verdict

Read `review.md`: the header line and the two tables. Then record it:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs add "Review <k>: <ACCEPT|NEEDS_WORK|REJECT> <b>/<m>/<mi>"
```

`ACCEPT` moves the phase to `verify` and this reference is done. Any other verdict moves it to `fix` and §5 runs.

A reviewer that reached its turn bound comes back with **no** verdict line and no `review.md`. Say so, name the bound, and stop — there is nothing to record, and a resumed agent is a second opinion from a context this session cannot audit (decision 0044).

A finding you believe is wrong is still a finding. The reviewer read the diff cold, and this session did not; where the fix would contradict the plan, that is a fork the plan did not settle — `AskUserQuestion`, then `ledger.mjs add "Gap: <what> — <resolution>"`, and the answer decides which of the two changes.

A `cannot verify from diff` item is a question, not a finding: run the one focused check it names, and record what it showed as a `Ruling:` line.

## 5. The fix pass

Fix every `blocker` and every `major`. Fix a `minor` when its fix is a line in a file the pass already has open; the rest are carried to the finish report, which names them as open.

Each finding: read the file at the line the row names, make the change the `Fix` column describes or a better one that closes the same item, and keep the change inside what the plan settled. A finding whose fix would grow the task is a `Gap:` for the chat (§4).

New behavior gets a test the way §3 of `execute.md` writes one: red first, then green. A fix that changes what the code does and adds no check is the class of change the next review finds again.

Where the package carried a `## Projects` section, each project it names runs its own `commands.test` before the commit, in its own directory.

One commit for the pass, in `config.conventions.commit`, then:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs add "Fix <k>: done" --sha <sha>
```

## 6. Iteration 2 — the scoped re-review

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/review-package.mjs <slug> --since <fix-sha>
```

`<fix-sha>` is the commit *before* the fix pass, so the package holds the fix diff and the previous findings table and nothing that was already judged. Read it from the ledger, not from memory: it is the sha on the last `Simplify: done (<sha>, …)` or `Task <n>: done (<sha>)` line above the `Review 1:` line. A session resumed at the fix phase has the ledger and not the value `state.lastCommit` held an hour ago.

Dispatch a fresh `hodos-reviewer` on it, the same way. Record the verdict the same way. `ACCEPT` ends the loop.

Two iterations is the bound. There is no third package: a fix that has been re-reviewed once and still fails is a decision the developer makes, not a loop the session runs again.

## 7. The breaker

Any verdict other than `ACCEPT` after iteration 2 — `REJECT` and `NEEDS_WORK` alike — reaches the breaker. It is a mandatory stop under both autonomy settings.

`AskUserQuestion` with the open findings named, and exactly three options:

- **accept with open findings** — the task moves on; the findings go to the finish report.
- **continue manually** — the task stops here and the developer takes the branch.
- **roll back to task N** — the work from task N is rebuilt; the review counter starts again (decision 0023).

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs add "Breaker: review — <accept|manual|rollback T<n>>"
```

The line is what moves the phase: `accept` → `verify`, `manual` → `manual`, `rollback` → `execute` at task N.

## 8. Completion

`Review <k>: ACCEPT` in the ledger, or a `Breaker: review — …` line. `review.md` stays on disk for `finish.md` to fold; `review-input.md` is transient and is left where it is.

## 9. Anti-pattern

Reviewing the diff in this context to save a dispatch. The reason the review is a fresh agent is that this session wrote the code.

A third iteration under another name — one more small fix, one more package. The bound is two, and what follows it is the developer's choice.

Reading `review-input.md`. It was written for the reviewer, and reading it here puts the whole diff back into the context the dispatch exists to keep clean.
