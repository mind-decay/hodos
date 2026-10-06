---
name: run
description: "Session 2 of a hodos task — execute the approved plan task by task, simplify the diff, run the review loop, the verify loop, and finish. Resumes from the ledger after any interruption. Invoked by the developer as /hodos:run <slug>, or by a go-ahead in words to the resume hodos itself just proposed. Never in the session that approved the plan: there it refuses and names /clear."
argument-hint: "<slug>"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

!`node ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs`

# run

Build what the plan says, prove each piece, and leave the repository with one commit per task. Each phase's procedure is read on entering that phase from `${CLAUDE_PLUGIN_ROOT}/skills/run/references/<name>.md` — a reference that cannot be read stops the run with the reason, and is never reconstructed from memory.

## Invariants

- The plan is the contract. What it settled is built as written; what it did not settle goes to the chat before any code (*Gates*, below).
- Every event reaches the ledger through `ledger.mjs`. `ledger.md` and `state.json` are never edited by hand, and nothing else parses them.
- A diff is walked once, by its author, in the simplify pass. Judging a diff is the reviewer's and the verifier's work and never happens in this context.
- Subagents are dispatched with the `hodos-*` definitions and `config.models.<role>`, never as forks: a fork inherits this session and defends its own code.
- One commit per task, in `config.conventions.commit`. Push, merge and rebase are asked once, at land, with the exact command in each option, and run on the answer. Nothing is forced, and the branch stays.
- The bounds are 3 red-check attempts, 2 review iterations, 2 verify iterations. An exhausted bound is a stop with a diagnosis or the breaker, never a fourth attempt.
- Test-first is what a task with no `Tests:` line means. The exemption a task carries is asserted again on its `done` line, so the reviewer can compare the two records.

## Step 0 — config and state

`node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs find`. A config with `notFound` means the project has no hodos layer: say `run /hodos:init first` and stop. Everything below reads `config.commands`, `config.conventions`, `config.models`, `config.verify.recipes` and `config.autonomy` from what this step returned.

Then read `.claude/hodos/tasks/<slug>/plan.md` and `state.json`. A slug with no task directory is a question for the developer, never a new task — unless `.claude/hodos/handoffs/<slug>.md` exists, which is the one case where the answer is written down: *Pickup*, below.

## Pickup

`.claude/hodos/handoffs/<slug>.md` and no task directory: someone handed this work over (`FORMATS.md §16`). Print the header, `## Where it stands` and `## Open`, then ask with `AskUserQuestion` — pick it up here, or leave it. No is an answer: print the path and stop.

On yes, in this order:

1. `git fetch` the branch the header names, and stop if it is not reachable — the file is about work this machine cannot see, and reconstructing a task for it would open a plan with no code under it.
2. **From the default branch, before checking the work out**: `ledger.mjs init <slug> --path <path> --type <type> --chat <xx>`, with `--chat <xx>` the two letters of the language you are speaking with the developer (decision **0200**), write `plan.md` from the file's `## Plan` verbatim, then `ledger.mjs add "Plan: approved" --tasks <n> --branch <branch> --handoff`. The order is what makes `base` the fork point rather than the branch tip; a base recorded on the branch would hide every commit the handoff carried from the review that follows. `--handoff` stores no session, because this session approves a plan it did not write and must still claim it (decision **0190**).
3. Check the branch out.
4. Delete the handoff file, and say that its deletion belongs in the developer's next commit.
5. Say what the review will and will not cover: the header's `Reviewed:` line names what came before, and this session's review loop starts from the base just recorded.

Then the resume table below, from the phase the ledger now derives.

## Resume

`state.phase` decides where this session starts. The digest above already carries it.

| `state.phase` | Where the session goes |
|---|---|
| `plan` | the plan is not approved: print `Next: <next>` with the `next` of `ledger.mjs next <slug>`, which names `/hodos:task <slug>` to continue planning where it stopped, and stop |
| `approved`, `execute` | `references/execute.md`, entered at `tasks.current` |
| `blocked` | `ledger.mjs claim <slug>`, then `AskUserQuestion` with `state.blockedOn`, then `ledger.mjs add "Gap: <the question> — <the answer> (developer)"`, then `ledger.mjs add "Task <n>: started"` for `tasks.current`, then `references/execute.md` there on a fresh bound — never `started` without the `Gap:` before it (decision **0193**) |
| `review` | `references/review-loop.md` |
| `fix` | `references/review-loop.md` §5 when the last verdict was a review, `references/verify-loop.md` when it was a verify |
| `verify` | `references/verify-loop.md` |
| `finish` | `references/finish.md`, then `references/land.md` |
| `manual` | the developer took the breaker's manual option: print `You chose to finish this branch by hand.`, then `Next: <next>` with the `next` of `ledger.mjs next <slug>`, a review of the branch the developer finishes by hand, and stop |
| `done` | the task is finished: `references/land.md`, which asks to land a branch not yet landed and ends on `Next:` with the step after it, the map for a campaign node |

A task whose `state.shape` is `inert` resumes in `${CLAUDE_PLUGIN_ROOT}/skills/task/references/inert.md` instead, because the shape has no simplify pass and no verify (decision **0183**). The section follows the phase. It is §3 for `approved`, and for `execute` while a task lacks its `done`. It is §5 for `execute` once every task has its `done`, and for `review` and `fix`. It is §6 for `finish`.

Resume is a read, not a replay: `tasks.current` names the task to execute next and `redCheckAttempts` how many of the three are already spent. A task whose `done` line is in the ledger has its commit in git — never build it again.

On every row that does not stop, but `done`, run `ledger.mjs claim <slug>` first, before the row writes a ledger line and before the phase's reference is read. That writes the pointer this session's hooks and `ledger.mjs add` calls find the task by. A session with no pointer of its own is on no task while another session holds one (decision **0171**), and its `add` prints `no active task`, exits 0 and writes nothing. So a session taking up work claims it, every time, without checking. A session that stops claims nothing: it is doing nothing this task's ledger should record, and the pointers may belong to a session that is. Nor does `done`: `land.md` reads git and writes no ledger line, and a pointer to a finished task is one nothing deletes. `ledger.mjs` writes them on `init` and deletes them on `Finish: report delivered`.

A `claim` that refuses is printed as it is, and the session stops there. The refusal in the session that approved the plan names `/clear`: S2 starts clean, and the script, not this session, decides whether it is clean (decision **0190**).

## Phases

| # | Step | Reads | Done when |
|---|---|---|---|
| 1 | Execute | `references/execute.md`, `references/defaults.md` | every task has `Task <n>: done (<sha>)` and the pass has `Simplify: done` |
| 2 | Review | `references/review-loop.md` | `Review <k>: ACCEPT`, or a `Breaker:` line |
| 3 | Verify | `references/verify-loop.md`, `references/oracles.md` | `Verify <k>: PASS`, or a `Breaker:` line |
| 4 | Finish | `references/finish.md` | `Finish: report delivered` and the report in chat |
| 5 | Land | `references/land.md` | the landing answered and run, the directory answered, `Next:` printed |

## Gates

Three of the mandatory stops of `DESIGN.md §4.4` fall in this session.

- **A fork the plan did not settle** that changes behavior, a contract, structure, or a dependency: `AskUserQuestion` with the options and a recommendation, then `ledger.mjs add "Gap: <what the plan lacked> — <resolution>"`. Where the resolution contradicts an `Acceptance:` clause, rewrite that clause in `plan.md` in the same step, and keep the old one below it as `Amended <date> by Gap: <the clause as it was>` (decision **0176**): the verifier reads its claims from the plan, and a settled clause left as written is failed as written. Under `config.autonomy: "rulings"` this class is settled here instead and recorded as a `Ruling:`.
- **A purely local choice** — a name, an order, a file's position — is decided and recorded: `ledger.mjs add "Ruling: <what> — <why> — <cost if wrong>"`. This holds under both autonomy settings.
- **The breaker**, and every destructive or outward-facing action, stops under every setting.

`Gap:` lines are the plan's quality metric and the finish report names them all. A gap answered by re-reading the plan was never a gap.

## Completion

`Finish: report delivered` in the ledger, the report in chat, `## Outcome` in `plan.md`, and this session's pointers removed by that same line. Then the landing answered and run, the task directory answered, and `Next:` last (`references/land.md`). A run that stops earlier — at a breaker's `manual`, at an exhausted bound — says which phase it stopped before, leaves the ledger as the record of where to resume, and ends on the `Next:` line of the stop that ended it (decision **0191**).

## Anti-pattern

Continuing past a red check with a small workaround. Reviewing the diff here to save a dispatch. Two tasks in one commit. Declaring the task done without the verify table.
