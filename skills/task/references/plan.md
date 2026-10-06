# plan — grill until the frontier is empty, then write it down

Read on entering step 6, together with `design.md`. Input: the brief, the research, the project's rules, the config. Output: `plan.md`, approved, with `## Open questions` empty.

Sections: 1 grilling rounds · 2 the decisions table · 3 tasks — tracer bullets · 4 type-specific shapes · 5 verify plan · 6 refactor in scope · 7 prototype · 8 write the plan · 9 plan review (`deep` only) · completion · anti-pattern · bound.

A plan is what session 2 gets instead of this conversation. Everything the grilling settled has to survive in the file, because nothing else will.

Everything this phase needs is on this page. The specification sections named below are provenance — where the shape was decided — not a lookup: a phase that goes reading `docs/` has spent its budget on the engine instead of on the project.

## 1. Grilling rounds

Map the design as a tree. The **frontier** is every decision whose prerequisites are already settled — not the whole tree, and not one question at a time.

Each round:

1. Compute the frontier.
2. Ask it through `AskUserQuestion`, up to four questions per call, each with the **recommended answer** as its first option marked *(Recommended)* and the one line that makes it right. A frontier of more than four is consecutive calls in the same turn; an answer the options do not hold arrives through *Other* (decision **0178**). A question without a recommendation asks the developer to do the design.
3. Facts in the frontier are not asked — they are dispatched (`references/research.md`) while the developer answers the decisions.
4. Wait. Then recompute: an answer settles prerequisites and opens the next layer.

Done when the frontier is empty. Every settled decision goes into the decisions table with its options and their cons — including the option that lost, because session 2 will meet the same fork and needs to know it was already taken.

## 2. The decisions table

| # | Question | Axis | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|---|

One row per fork that changes behavior, contract, structure, or a dependency — which is `DESIGN.md §4.4`'s mandatory-stop class, so at `config.autonomy: "ask"` every row is asked and `Choice` reads `A (user)`. At `config.autonomy: "rulings"` that class is the one the setting downgrades (decision 0030): the row is settled here, `Choice` reads `A (ruling)`, and it carries `ledger.mjs add "Ruling: <what> — <why> — <cost if wrong>"`. A choice that is purely local — a name, an order — is not a row under either setting: it is ruled and recorded the same way, and the finish report lists every ruling. Where a fork is a row is where the setting decides who settles it; moving a fork out of the table to escape the question is the failure this line prevents.

Architecture decisions carry 2–3 real alternatives, from one planner, per `design.md`, and the `Axis` cell names which of that file's five the alternatives differ on (decision **0085**). A row whose options are the choice and a straw man is a row that settled nothing, and a row whose alternatives differ on no axis is one alternative wearing two names. A row that is not an architecture question — a library version, a scope call — carries `—`.

## 3. Tasks — tracer bullets

Each task is a vertical slice that leaves the project working: something runs at the end of it. Not a layer, not "add the types".

```
### T2. Summary widget
Files: src/features/orders/ui/OrderSummary.tsx, src/features/orders/ui/OrderSummary.test.tsx
Acceptance: renders totals from a fixed fixture; loading and error states visible at /orders
```

- **Files** — what it opens, tests included. A task with no files named is a task nobody sized.
- **Acceptance** — written before any code and checkable by someone who did not write it: a command, an observable state, a fixture. "Works" is not an acceptance criterion; neither is "is clean". A clause that compares a number — *no regression*, *not slower*, *within* — names its statistic and its tolerance now, before the numbers exist: `p95 of the list route over seven runs ≤ the base's p95 + 15 %`. A bare *no regression against the base* fails on a difference inside the base's own run-to-run noise (decision **0177**).
- **Order** — a task depends only on tasks above it.

**The claim set is derived, not remembered** (decision **0092**). An `Acceptance:` clause is what the verifier runs, so the clauses are read off the plan's own contract rather than off what the task felt like claiming. Three rules, applied to each task before its clause is written:

1. **The contract field yields claims by clause kind.** `### Invariants & failure modes` is the input: every **postcondition** in it is one claim; every **invariant** is one property — a claim that holds over inputs rather than for one of them; every **precondition** is one negative claim, naming the call that violates it and what happens instead. A field with no clause of a kind yields no claim of it, and a field that yields none at all is a design section that says nothing about behavior.
2. **Every member of a typed state the tasks touch is a claim.** A union, an enum, a discriminated status: one claim per member, whichever member the feature was designed around. A state that is **not** a type — three booleans, a nullable string standing for four cases — cannot be enumerated by anyone reading the code, so the plan enumerates it by hand and says so in one line: `States: idle | loading | error | empty — not a type; enumerated by hand.` That line is what the review checks the claims against.
3. **A task that adds a branch claims its failure path.** The `catch`, the `else`, the early return, the timeout: the path taken when the thing the branch guards against actually happens. A branch whose failure path no claim names is the path that ships unexercised.

The rules produce claims, never tasks. A derived claim no recipe covers is §5's problem and is written there.

**Blast radius, before the file lists are written.** `config.adapters.codeIndex` names an adapter → one `codeIndex.blastRadius` per symbol the tasks change. It answers in two lists and they sort differently: every `must_touch` path belongs in the `Files:` of the task that changes that symbol, and every `may_touch` path belongs there too or in `## Non-goals` with the reason it is out (decision **0091**). `null` → `Skip: codeIndex unavailable`, and the file lists rest on the research answers and Grep. A result of nothing is read as nothing only after a Grep agrees: the index covers one project root, a sibling workspace of a monorepo is outside it, and a page carrying a cursor is not the whole answer.

**Tests.** Test-first is the default and is written as no `Tests:` line at all. A task deviates only as `Tests: <reason> — <one line> · verified by <what>`, with `<reason>` one of:

| Reason | What it means |
|---|---|
| `visual` | styling, layout, cascade — no branch |
| `glue` | wiring an already-tested unit into an existing call site — no new branch or condition |
| `infra` | config, manifest, or build file with no runtime branch |
| `no-harness` | `config.commands.test` is `null` |

Both halves are mandatory, and the reviewer checks the stated reason against the diff. A branch under `glue` or logic under `visual` is a finding, so the honest line is the cheap one.

## 4. Type-specific shapes

- **`bug`** — T1 is the red loop: the command from the brief that fails on this bug today, with its current output written into the acceptance criterion. No red-capable command, no phase 2.
- **`refactor`** — the goal carries a done-metric that is a command and a number (`rg -c "fetch\(" src/ → 0`), measured now and written down. Wide changes go expand–contract, and the contract half is its own task.
- **`feature`** — the default shape.
- **`question`** — never reaches this phase.
- **`upgrade`** — T1 is the **baseline**: the project's own commands (`config.commands.test`, `build`, `lint`) run and recorded on the current version, so that what the bump breaks is separable from what was already broken. T2 is the bump itself, lockfile included. Every failure the commands then surface is its own task, with the failing output as its acceptance criterion; a major bump whose changelog names a removal the project uses gets one task per removal, named after it.
- **`spike`** — no tasks and no acceptance criteria; the shape below.

**The `spike` plan.** Three fields carry it (decision **0084**):

```
## Question   the one thing this spike answers, stated so that an answer to it can be wrong
## Timebox    a number of hours, and what is done when it runs out — the exit, taken with what is known by then
## Exit       the two ways this ends, chosen in advance: the scratch branch deleted with the answer written into the ruling, or a follow-up task opened and its slug recorded
```

A numeric bar in `## Question` names the **statistic** it is read on — median, worst, p75, or *n of m samples over* — chosen before the numbers exist, which is what `## Exit` already rests on (decision **0088**). "Does the plain list cross ~100 ms at N = 1000" is not falsifiable: seven samples at 78.5 median and 241.5 worst answer it both ways, and the spike then asks the developer the question its own exit was for. A bar without a statistic is not approvable; the `Gap:` route stays open beneath it for the reading nobody anticipated.

The ten design fields stay and are filled `none — <reason>` wherever the spike has nothing to say (decision 0032). A spike that can fill `Modules` and `Interfaces` has a design already and is a `feature` that skipped its grilling. `## Verify plan` is `none — a spike merges nothing`.

There is no `## Tasks` section, so there is no `Tests:` line and the four exemptions of decision **0022** are untouched: a spike commits nothing that needs one. The work still runs in session 2 on the branch the approval created — the timebox, then the exit — and `finish` records which exit was taken. A `spike` that reaches the timebox with the question answered and wants to build the answer does not keep going: that is the follow-up task, opened with its own routing.

## 5. Verify plan

Map every acceptance claim to a recipe from `config.verify.recipes` by name:

```
## Verify plan
- unit: T1, T2 tests (recipe `unit`)
- ui: /orders — loading, totals, error (recipe `ui`)
```

A claim that rests on a **data state** names the layer that provides it (decision **0099**):

```
- ui: /orders with three overdue orders — the badge and the empty state (recipe `ui`, layer `seed-overdue`)
```

The layer is one of `config.verify.layers`, raised by `env.mjs up` before the verifier is dispatched, and a seed is a layer like any other: `up` seeds, `check` proves the state, `stop` resets it. A claim that needs a state no layer provides is a missing layer — say so, it is an `init` finding, the way a missing recipe is.

A claim no recipe covers is either a missing recipe — say so, it is an `init` finding — or a claim nobody can check, which is a task whose acceptance criterion needs rewriting. `perf` recipes run only when the plan declares them here.

## 6. Refactor in scope

The improvements to make inside the boundary the tasks already touch, listed by `path:line`. Boy-scout, bounded: code the task opens anyway. Everything else is a non-goal, and a non-goal is written down — `## Non-goals` is one of the ten mandatory fields.

## 7. Prototype

Only when grilling reaches "we will not know until we try": throwaway code answering exactly one design question, labeled as a prototype, deleted before execute. It is not a task, it does not get an acceptance criterion, and its result is a row in the decisions table. A prototype is one question inside a plan that has other content; when the *whole* task is that question, it is a `spike` and the shape above applies.

## 8. Write the plan

`.claude/hodos/tasks/<slug>/plan.md`, in this order, no frontmatter:

```markdown
# Plan — <slug>
Path: <path> · Type: <type> · Branch: <branch> · Campaign: <campaign/node or —> · Base: <sha>

## Goal            one paragraph: what will be true when this is done
## Non-goals       the first of the ten fields
## Decisions       the table of §2
## Design          ### Modules · Dependency direction · Interfaces · Invariants & failure modes ·
                   Data & scale · Precedent · Refactor in scope · External APIs ·
                   Architecture alternatives      (design.md: one line of guidance per field)
## Tasks           ### T1, T2, … as in §3
## Verify plan     as in §5
## Open questions  empty at approval
```

`## Outcome` is appended later, by the finish phase of session 2.

The header's `Branch:` and `Base:` are filled at approval, when the branch exists and `ledger.mjs` has recorded the base.

Check it before presenting:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/lint.mjs --project
```

Over 250 lines is an advisory: check whether this is one mergeable unit. It is never a reason to cut detail session 2 needs.

## 9. Plan review — `deep` only

Dispatch `hodos:hodos-plan-reviewer` — the plugin-qualified name the Agent tool takes — with `model: config.models.planReview`, passing the paths: the plan, the research, the rules directory. Wait for the notification; read `plan-review.md`, not the transcript.

Fold each gap: a gap is a change to the plan, or a line saying why the plan is right and the reviewer read it otherwise. Then delete `plan-review.md`, and `plan-review.partial.md` where it is there. One repeat at most — a second `GAPS` verdict is presented to the developer with the plan, and they decide.

A plan reviewer that reached its turn bound returns no verdict line, and may have left `plan-review.partial.md`, written before its citation reads (decision **0196**). Fold its gaps the same way and delete it. At approval, say the review stopped at its 50-turn bound after what its `Read` line names, and give re-dispatching the plan reviewer — the one repeat — as an option. No partial: the same, with nothing to fold.

## Completion

The frontier is empty, the ten design fields are non-empty, every task has files and an acceptance criterion **derived by the three rules of §3**, every acceptance claim maps to a recipe and — where it rests on a data state — to a layer, `## Open questions` is empty, and `lint.mjs --project` exits 0 on the plan. Approval itself is the kernel's step 8.

## Anti-pattern

A plan with "TBD". A task whose acceptance criterion is "works". A claim set that is the happy path: the union's other two members, the `catch` and the precondition were in the design section, and the clause that omits them is what the verifier will not run. An exemption reason invented outside the four. Asking one question, waiting, asking the next — a round is the whole frontier. Answering a frontier question yourself because the recommendation is obvious: the recommendation is what you contribute, the choice is what the developer contributes.

## Bound

Rounds run until the frontier is empty; there is no round budget, because a frontier that keeps growing is a task that should have routed to `campaign` — and noticing that is an upgrade, not a failure. One plan-review dispatch, plus one repeat.
