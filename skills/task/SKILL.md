---
name: task
description: Session 1 of a hodos task — route the request, research what is unknown, grill the design into a plan, get it approved, hand off to /hodos:run. The developer runs it as /hodos:task <description>; the campaign skill invokes it as <campaign>/<node> to open one node of a map. Opening a task is the developer's decision, so it is not invoked on your own reading of a request.
argument-hint: "<description> | <campaign>/<node>"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

!`node ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs`

# task

Decide what will be built and why, and write it down so session 2 can build it without this conversation. Each phase's procedure is read on entering that phase from `${CLAUDE_PLUGIN_ROOT}/skills/task/references/<name>.md` — a reference that cannot be read stops the run with the reason, and is never reconstructed from memory.

## Invariants

- No code is written here. This session produces `brief.md`, `research.md`, `plan.md`, a ledger and a branch; the first line of implementation belongs to `/hodos:run`.
- The router spends ≤5 evidence calls before its verdict — the searches and reads that fill the checklist; the digest, the config lookup and this reference are procedure. What it wanted to look up is the research phase's job, and "this needs research" is itself a verdict.
- Facts are dispatched, decisions are asked. An Explore subagent fetches what the repository knows; every fork the plan does not settle goes to the developer, in one round, numbered, each with a recommended answer.
- Nothing is assumed silently. `## Open questions` is empty at approval, or the plan is not approved.
- Test-first is what a task with no `Tests:` line means. A task deviates only as `Tests: <reason> — <one line> · verified by <what>`, `<reason>` one of `visual`, `glue`, `infra`, `no-harness`.
- Every event reaches the ledger through `ledger.mjs`. `brief.md`, `research.md` and `plan.md` are written directly; `ledger.md` and `state.json` never are.
- The path ratchets one way. A task upgrades mid-flight — `ledger.mjs add "Upgrade: <from>→<to> — <why>"` — and never downgrades.

## Phases

| # | Step | Reads | Done when |
|---|---|---|---|
| 0 | Config | — | `config.mjs find` returned a config |
| 1 | Route | `references/route.md` | nine rows with evidence, a verdict from the rules, confirmed by the developer |
| 2 | Open | — | every verdict but `campaign`: `ledger.mjs init` printed the slug; `brief.md` written |
| 3 | Campaign | *Campaign*, below | a campaign verdict hands the description to the `campaign` skill |
| 4 | Question | *Question*, below | the answer is delivered with sources and the ledger ends with `Finish` |
| 4b | Reproduce | `references/reproduce.md` | type `bug` whose red-loop candidates are not commands that fail today: a red-capable command in `brief.md`, or a `Ruling:` that says it is not reproducible here |
| 5 | Research | `references/research.md` | every question carries citations, or is marked open for grilling |
| 6 | Grill and plan | `references/plan.md`, `references/design.md` | the frontier is empty, ten design fields non-empty, every task a tracer bullet with an acceptance criterion — a `spike` carries the question, the timebox and the exit instead of tasks (`references/plan.md §4`) |
| 7 | Plan review | — | `deep` only: `plan-review.md` folded, then deleted |
| 8 | Approve | *Approval*, below | `state.phase == approved` and the handoff line printed |

Step 4b runs only for a `bug` the router left with no command that fails today (`references/route.md §7`), and its second exit ends the session: a symptom nothing here can contradict is not a `bug` the red loop can carry, and re-routing it is the developer's call. Step 4 is an exit: it ends the session on its own terms. Step 3 is a handoff — the `campaign` skill takes over in this session and may invoke this one back for a node. Step 5 runs when the path is `deep`, and whenever grilling hits a fact — a question about what the code or a library already does, rather than about what to build.

## Step 0 — config

`node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs find`. A config with `notFound` means the project has no hodos layer: say `run /hodos:init first` and stop. Everything below reads `config.commands`, `config.conventions`, `config.models`, `config.verify.recipes` and `config.autonomy` from what this step returned.

Invoked as `<campaign>/<node>`, the argument is already a scoped node: step 1 routes it like any description, and step 3 is skipped — a node that re-entered the campaign skill would loop.

## Step 3 — campaign

A campaign verdict is a map, not a task, and it opens none: `ledger.mjs init` records a path out of `quick`, `standard`, `deep`, and a campaign's nodes are routed one by one as their own tasks (`DESIGN.md §9`). Step 2 is skipped — no task directory, no `brief.md`.

Call the Skill tool with `campaign` and the description this session routed. What crosses over is the checklist and the verdict of step 1, confirmed by the developer; the goal, the done-metrics and the nodes are that skill's own grilling, and anticipating them here would be the second source of truth `DESIGN.md §9` exists to prevent.

That skill invokes this one back, as `<campaign>/<node>`. A node is not a campaign: step 0 skips this step for it, and that is what terminates the re-entry (decision 0016).

## Step 4 — question

Type `question` answers in chat and writes no plan: the answer, then the sources it rests on — `path:line` for the repository, a URL with its version for a library. Close with `ledger.mjs add "Finish: report delivered"`. A question that turns out to need code is re-routed, not answered: say so and start again with the work as the description.

## Step 8 — approval

1. Present the summary: the goal in one paragraph, the decisions with their choices, the tasks with their acceptance criteria, and what the plan explicitly does not do.
2. Ask for approval with `AskUserQuestion`. A plan with a non-empty `## Open questions` is not presented — those questions are the round that has not been asked yet.
3. On approval, create the branch from `config.conventions.branch` with the slug substituted. A branch that already exists is a question, never a checkout.
4. `ledger.mjs add "Plan: approved" --tasks <n> --branch <name>` — the script records `base` from HEAD and moves the phase to `approved`.
5. Print exactly, as the last two lines of the session:

```
/clear
/hodos:run <slug>
```

`/clear` is what gives session 2 a context holding the plan and the code and nothing else. Typing it is the developer's; printing it is this session's last act.

## Gates

Three of the mandatory stops of `DESIGN.md §4.4` fall in this session: the router verdict, the plan approval, and every fork that changes behavior, contract, structure, or a dependency. Those forks are the decisions table, so at `config.autonomy: "ask"` a row in it is asked, never ruled. At `"rulings"` the row stays a row and is settled here, with `A (ruling)` as its choice (decision 0030). Either way the purely local choice — a name, an order — is decided and recorded, and every ruling carries `ledger.mjs add "Ruling: <what> — <why> — <cost if wrong>"`. The router verdict and the plan approval stop under every setting.

## Completion

`state.phase == approved`, the handoff line printed, and every artifact the path calls for on disk: `brief.md` on every path that opens a task; `research.md` where research ran; `plan.md` with ten non-empty design fields and an empty `## Open questions` — on a `spike`, with the question, the timebox and the exit in place of its tasks.

Step 4 completes on its own terms: a delivered answer and a `Finish` line. Step 3 completes when the `campaign` skill has been invoked with the confirmed verdict; what happens after that is that skill's own completion criterion, and this one writes nothing.

## Anti-pattern

Starting to implement because the plan looks small. A router that opens files to decide. A plan approved with an open question, or with a task whose acceptance criterion is "works". Answering a grilling question you were about to ask the developer.
