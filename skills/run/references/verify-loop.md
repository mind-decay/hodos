# verify-loop — the recipes, the dispatch, the fix, the breaker

1. Inputs and outputs · 2. The recipes that match · 3. The environment · 4. The adapter · 5. The dispatch · 6. The verdict · 7. The fix pass · 8. Iteration 2 · 9. The breaker · 10. Completion · 11. Anti-pattern

## 1. Inputs and outputs

**Reads.** `state.json` for `verify.iteration`; `plan.md` for the tasks and the `## Verify plan` lines; `config.verify.recipes`, `config.commands.dev`, `config.adapters.browser`, `config.models.verify` and `config.models.preparer`; the environment through `env.mjs`, never by reading `config.verify.layers` here; `verify.md` when the verifier has written one.

**Writes.** The ledger lines below, each through `ledger.mjs`. One commit per fix pass. `evidence/` and `verify.md` are the verifier's, never this session's.

**Entered** at phase `verify` — the ledger holds `Review <k>: ACCEPT` or `Breaker: review — accept` — or at phase `fix` where the last verdict line was a `Verify`.

**The claims are not checked here.** They are run by a fresh agent that did not write the code and did not argue for it. A session that has just fixed a review's findings believes the code works, and belief is what the Iron Law of `DESIGN.md §7.4` exists to replace.

## 2. The recipes that match

`config.verify.recipes[]` each carry a `when`:

| `when` | Matches when |
|---|---|
| `always` | every task |
| `ui` | the task's files include the project's UI files — the `Files:` lines of `plan.md`'s tasks |
| `api` | the task's files include its API surface |
| `perf` | `## Verify plan` names a performance claim; otherwise the recipe does not run |
| a glob | a task file matches it |

Collect the names that match and pass **the names**. The verifier reads the recipes themselves from the config path; a recipe pasted into the dispatch is a second copy of a file that already has one.

The projects that answer are the ones `review-input.md`'s `## Projects` section names (`FORMATS.md §8`) — the script wrote them from **the diff**, which is what decision 0076 chose over a set predicted from the plan's `Files:` lines before the code existed. Where a breaker skipped the review and no package exists, `git diff --name-only -z <base>..HEAD | xargs -0 node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs for-files` answers the same question — `-z` and `xargs -0` because a path with a space in it splits into two arguments otherwise, and `for-files` would answer for both halves. Then the recipe names are collected per project against that project's own `verify.recipes`, and the dispatch carries one `Config:` and one `Recipes that match:` line per project, each prefixed with its directory. No section, and the two lines are what they were.

Recipes are how a claim is run, not which claims exist. Every acceptance clause and every `## Verify plan` line reaches the table whatever matched — a claim with no recipe is a `skip` with a reason, which is the verifier's row to write.

## 3. The environment

The claims run against something, and raising it belongs to this session: a process started inside an agent is orphaned when that agent ends, and an agent that raises what it then grades has an interest in the result.

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/env.mjs up
```

It prints JSON, and each of its four answers has one path.

**`declared: false`, or `notFound`** — this project's environment is `commands.dev`, exactly as it was before layers existed. `config.mjs find` gave it as `{ cmd, url, ready }`: start `cmd` in the background, wait for `ready` on its output, and `url` is the base URL the dispatch carries. `commands.dev` is `null` and a `browser`, `a11y` or `viewport` recipe matched: say `browser claims need commands.dev — run /hodos:init first`, pass no base URL, and tell the dispatch that browser claims are `skip: dev command not configured`. The run continues; the command recipes are the ones that answer for behavior.

**Every layer up** — `url` is the base URL, and `profile` is what the dispatch carries and what `verify.md`'s header records, so a screenshot says which back end it saw (`FORMATS.md §10`). `url` is `null` wherever the layer that declares it did not come up: the dispatch carries no base URL then, and the browser claims are the skips the paths below name.

**`blocked`** — a layer needs access this machine has not granted. `AskUserQuestion`, once, naming the layer, the exact entries its `needs` lists, and what they change on the machine:

- *grant* — write the `permissions.allow` entries into `.claude/settings.local.json`, which is the gitignored file an entry naming one machine belongs in (decision 0057); stamp `access.grantedAt` with today's date in the config that declares the layer; run `env.mjs up` again.
- *decline* — that layer stays down. Its `browser` and `http` claims go into the dispatch as `skip: environment not up — <layer>, access declined`, the command recipes run unchanged, and the finish report carries the decline. Nothing is written to the config, so the next run asks once rather than skipping in silence.

The question is *may I*, and neither answer hands the raise back: the grant runs it here, the decline drops the layer and degrades its claims. Two answers: `verify.layers` and the profile are the developer's declaration of what this project needs to be verified, and a layer that does not belong in the profile is a line in the finish report.

**`failed`** — a layer was waited out to its own timeout and its check is still red. One `hodos-preparer`, dispatched from here with `model` from `config.models.preparer`, given that layer and nothing else:

```
Raise the layer <name> for task <slug>.
Config: <abs path>/.claude/hodos/config.json
Layer: <name> · cwd <the cwd the JSON printed> · failing check <the check it printed>
Log: <abs path>/.claude/hodos/env/<name>.log
Write <abs path>/.claude/hodos/tasks/<slug>/env.md and return the verdict line.
```

Then run `env.mjs probe` here: whether the layer is up is a fact this session checks, not a claim it reads from an agent's answer. Green → run `env.mjs up` once more and read it as `Every layer up` above: the layers behind the failed one were reported `skipped` and never started, so the profile is finished by the script that raises it rather than by the agent that fixed one layer. A re-run that comes back `failed` or `blocked` goes to the breaker of §9 with that layer — the one dispatch this entry allows is spent. Still red — or a preparer that returned nothing because it reached its bound — → the breaker of §9, with the layer, its failing check and `env.md`'s path in place of the failing rows. `accept` dispatches the verifier with that layer's `browser` and `http` claims degraded the way a declined grant degrades them; `manual` and `rollback` are what §9 says they are.

**One dispatch per entry into this reference.** A second preparer for the same layer here is the loop decision 0074 refused; a session that resumes at phase `verify` later probes first, and dispatches only if the layer is still red.

**Stop what this session raised, on every path out of this reference** — after the verdict is recorded, after the breaker's line, and after a stop:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/env.mjs down
```

It stops the layers hodos raised and leaves the ones it found already up, so the stack a developer had running this morning survives the run. A dev server left running holds the port the next task needs.

## 4. The adapter

`config.adapters.browser` names a file in one of two directories, and the value says which: a bare name is `${CLAUDE_PLUGIN_ROOT}/adapters/browser/<name>.md`, and `project:<name>` is `<project root>/.claude/hodos/adapters/browser/<name>.md` — the project's own, written by `/hodos:adapter`. Read it here, once, to confirm it exists; its content is the verifier's to use.

Absent — `null`, or a file that cannot be read — the dispatch carries no adapter path and says `browser, a11y and viewport claims are skip: no browser adapter configured` — except an `a11y` recipe that names its own `run`, which runs the tool the project named. The command and http recipes run unchanged, and the verdict is a real verdict over the claims that could be run.

A background agent keeps every MCP tool (`PLATFORM-NOTES.md` fact 13), so the browser reaches the verifier wherever the session has the server. What the absence covers is a project with no server configured, not a tool filtered away.

**The tests the change reaches** (decision **0091**). `config.adapters.codeIndex` names an adapter → one `codeIndex.affectedTests` on the paths this task changed, here, before the dispatch. A test it returns that **no matched recipe runs** is a gap in the verify plan, not a claim the verifier may invent: say which tests in one line and record `ledger.mjs add "Gap: <n> tests the change reaches run in no recipe — <what was done>"`. The two things to do about it are running the project's test command over those paths in this session and quoting the output, or leaving them and letting `finish` carry the gap. `null`, or a page whose cursor was not followed → `Skip: codeIndex unavailable` and nothing is said about coverage; silence about a test nobody ran is what this call replaces.

## 5. The dispatch

One verifier, dispatched with the Agent tool as `subagent_type: "hodos:hodos-verifier"`, with `model` from `config.models.verify`. The 60-turn bound is the definition's own (`agents/hodos-verifier.md`), not this session's to pass. Never a fork: a fork inherits this session, and this session built the thing under test.

The message carries paths and one-line instructions, and nothing else:

```
Verify the task <slug>, iteration <k>.
Plan: <abs path>/plan.md
Config: <abs path>/.claude/hodos/config.json
Recipes that match: unit, ui
Adapter: <the path §4 resolved — the plugin's or this project's>
Evidence: <abs path>/evidence/
Base URL: http://localhost:5173
Environment: local
Write <abs path>/verify.md and return the verdict line.
```

`Environment:` is the profile §3 printed, and it is absent where no profile is declared. A layer §3 left down adds one line naming the claims it takes with it — `Skip browser and http claims: environment not up — <layer>, access declined` — and the verifier writes those rows as skips with that reason instead of running them.

Where §2 named projects, the two config lines are **prefixed with the directory** — the prefix is the only signal the verifier has that a project answered, because the package it was computed from never reaches the agent:

```
web · Config: <abs path>/web/.claude/hodos/config.json
web · Recipes that match: unit
```

one such pair per project, and nothing else in the message changes.

Then wait for the completion notification. No polling, no sleep, no second dispatch while the first is out.

## 6. The verdict

Read `verify.md`: the header line and the table. Then record it:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs add "Verify <k>: <PASS|FAIL> <n> claims, <s> skipped"
```

`PASS` moves the phase to `finish` and this reference is done. `FAIL` moves it to `fix` and §7 runs.

**A verifier that reached its turn bound** comes back with no verdict line and no `verify.md`. There is nothing to record: say that the bound was reached, name it, stop what §3 raised, and stop. The developer raises the bound in the definition or runs the claims by hand; a resumed agent is a second opinion from a context this session cannot audit (decision 0044).

## 7. The fix pass

Every `fail` row. The row names the claim, what was run, and what it produced — that is the whole input; the verifier's transcript is not read.

A failing row whose cause is the test rather than the code is still a fix: a mutation row that stayed green means the test pins nothing, and the fix is the assertion it should have made.

New behavior gets a test the way §3 of `execute.md` writes one: red first, then green.

Run `config.commands.test` before committing — every project §2 named, each in its own directory. Iteration 2 re-runs the rows that failed and carries the rest forward (§8), so a fix that breaks a claim which had passed is not seen there — this is where it is seen.

One commit for the pass, in `config.conventions.commit`, then:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs add "Fix <k>: done" --sha <sha>
```

**This fix is not re-reviewed.** The review loop is closed; its verdict was given on the diff it saw. The fixes made here are named in the finish report instead, which is where the developer sees what changed after the review (`DESIGN.md §4.5`).

A finding the fix would have to contradict the plan to close is a fork the plan did not settle: `AskUserQuestion`, then `ledger.mjs add "Gap: <what> — <resolution>"`.

## 8. Iteration 2 — the failed claims

Dispatch a fresh `hodos-verifier` the same way, with two lines more:

```
Previous verify: <abs path>/verify.md
Re-run claims: 3, 5
```

The table it writes still answers for every claim — a claim missing from it is a failure under `FORMATS.md §10` whichever iteration wrote it. The rows that passed carry their iteration-1 evidence and `iteration 1` in the command column; only the named rows are run again.

Two iterations is the bound. There is no third dispatch: a claim that failed, was fixed, and failed again is a decision the developer makes.

## 9. The breaker

`FAIL` after iteration 2 reaches the breaker. It is a mandatory stop under both autonomy settings.

`AskUserQuestion` with the failing rows named, and exactly three options:

- **accept with open findings** — the task moves to finish; the failing claims go into the report.
- **continue manually** — the task stops here and the developer takes the branch.
- **roll back to task N** — the work from task N is rebuilt; the verify counter starts again (decision 0023).

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs add "Breaker: verify — <accept|manual|rollback T<n>>"
```

The line is what moves the phase: `accept` → `finish`, `manual` → `manual`, `rollback` → `execute` at task N.

## 10. Completion

`Verify <k>: PASS` in the ledger, or a `Breaker: verify — …` line; what §3 raised stopped, by `env.mjs down` where a profile raised it and by stopping the process where `commands.dev` did. `verify.md` and `evidence/` stay on disk for `finish.md` to fold and to cite.

## 11. Anti-pattern

Running the claims in this context to save a dispatch. This session built the code, and a claim it checks itself is a claim graded by its author.

Sending the verifier back for a third pass under another name — one more fix, one more dispatch. The bound is two, and what follows it is the developer's choice.

Re-reviewing a verify fix. The review loop closed at `ACCEPT`; reopening it here is a third review iteration wearing a different label.

Telling the developer to raise a layer and come back. hodos raises; where it cannot, what it asks for is access, once — and a layer left down is a skip with a reason, not a task handed back.

Editing `verify.layers` or the profile to get past the access question. The config is the declaration the run is verified against, and a run that rewrites it answers its own question with a different project.

Reading `verify.md`'s evidence column to decide a claim really passed. The verdict line and the table are the interface; a session that re-derives them has re-run the verification in the context that was supposed to stay out of it.
