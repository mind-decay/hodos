# reproduce — a command that fails today, or the finding that there is none

Read on entering step 4b: the type is `bug` and no candidate from `route.md §7` is a command that fails **as the repository stands** — the description named none, and `ci.failedRun` and `logs.trace` returned none or were unavailable. Input: the symptom as the developer described it, `brief.md`, the config from step 0. Output: either a red-capable command written into `brief.md`, with the output that proves it red, or a stop that says the symptom is not reproducible here and what would make it so.

Sections: 1 the symptom as an observable · 2 where a failure can be made to show · 3 the attempts · 4 exit A — red · 5 exit B — not here · completion · anti-pattern · bound.

`DESIGN.md §4.1` makes a red-capable command the precondition of the `bug` path — "no red-capable command, no phase 2" — and until this phase existed nothing supplied one: the plan was written against a hypothesis nobody could contradict. This phase is that supply, and its second exit is worth as much as its first.

## 1. The symptom as an observable

One sentence with three parts: **what is seen**, **where**, and **what was expected instead**. "The total is wrong" is not an observable; "the order detail page shows `$1,234.5` where the API returns `1234.50`, and the list shows `$1,234.50`" is. Write it into `brief.md` under the verdict, above the candidates.

Where the developer's description does not carry all three, ask — one question, with what you have filled in and the part you cannot. A symptom nobody can state is not reproduced by trying harder.

## 2. Where a failure can be made to show

The cheapest harness that can carry this symptom, in this order, and no further down the list than the symptom requires:

| Harness | When it fits | What red looks like |
|---|---|---|
| an existing test | a test already covers the unit or the route the symptom names | `config.commands.test` fails on it after the assertion is corrected to the expected value |
| a new test beside its neighbours | the unit is testable and has a test file next to it | a new case, written to the *expected* value, fails on the current code |
| a command against a running service | the symptom is an HTTP response, a status, a shape | `curl` (or the project's client) prints the wrong body, with the request beside it |
| the CLI the project ships | the symptom is a command's output or exit code | the invocation and its output, quoted |
| a browser recipe | the symptom is rendered, and no layer below it shows the fault | `config.verify.recipes` names one; the adapter drives it and the console is part of the evidence |

A test written to the *current* wrong value is green and proves nothing. The assertion states what the developer expected; red is the gap between them.

Row 2 writes a file, and every row leaves the project as it was found: the harness is **reverted** at exit A and its output kept (decision **0087**). No code is written in this session, and a project left red for a reason that is not the developer's — with `git status` dirty at the moment the phase hands back a routing decision — is the cost that rule exists to prevent.

## 3. The attempts

**Three, and each is one command.** Attempt 1 is the top row of §2 that fits. Where it does not go red, the failure is information: the symptom is not where you looked, and attempt 2 moves one row down or one layer in — not the same command with a different argument.

Record each attempt in `brief.md`, under the observable, as `- attempt <k>: <what was run> → <what it printed>`. **Not in the ledger:** the `red-check attempt` form belongs to a task the plan has approved, and `state.json` derives `phase: execute` from it — a task that has not been planned yet would be reported as being built. The one ledger line this phase writes is exit B's `Ruling:`, which leaves the phase where it is.

Do not read the implementation to work out why it fails. A cause found here is a hypothesis the plan has not earned yet, and the phase after this one is what tests it. What this phase needs from the code is only where the boundary is that the symptom crosses.

## 4. Exit A — red

A command that fails, and its output. Write into `brief.md`:

```markdown
## Reproduction
Command: <the exact command>
Red: <the output that proves it, trimmed to the assertion or the wrong value>
Harness: <which row of §2>
```

That command is **T1 of the plan** — the red loop the `bug` path opens with — and it is written into `plan.md` verbatim, not paraphrased. The phase ends; step 5 or step 6 follows as the path calls for.

Where the harness was a file this phase wrote, revert that one path — nothing else — and say so in the block:

```markdown
Harness: a new test beside its neighbours — reverted; T1 writes it back, and the command runs then
```

The output above is the evidence and it stays; the file does not, so the project is as it was found and the command becomes runnable again at T1 (decision **0087**). A harness that only corrected an assertion in an existing test is reverted the same way.

## 5. Exit B — not reproducible here

Three attempts, nothing red. This is a finding, not a failure of the phase: it says the symptom needs something this environment does not have — production data, a credential, a scale, a race, a browser the fixtures do not run — or that the symptom as stated is not what is happening.

1. `ledger.mjs add "Ruling: not reproducible here — <what was tried, in one line> — <what would make it reproducible>"`.
2. Say it to the developer with the three attempts and their output, and offer the two ways forward: **get what is missing** (a dump, an account, a failing pipeline to point `ci.failedRun` at) and come back, or **re-route** — a symptom that cannot be contradicted is not a `bug` the red loop can carry, and the honest types are `question` (find out what is happening) or `spike` (what would it take to observe this at all).
3. Write no plan. A `bug` plan with no red loop is the thing `DESIGN.md §4.1` forbids, and it is what this exit exists to stop.

## Completion

`brief.md` carries a `## Reproduction` block whose command someone else can run once T1 writes its harness back, or the ledger carries the `Ruling:` and the developer has the choice in front of them. Every attempt is in `brief.md` either way, with what it printed, and the working tree is as this phase found it.

## Anti-pattern

Fixing it. Explaining it. A test written to the current behavior so that something is green. A fourth attempt because the third nearly worked — the bound is where the finding is, and "nearly" is the phase telling you the symptom is not where you are looking.

## Bound

Three attempts. The fourth is exit B.
