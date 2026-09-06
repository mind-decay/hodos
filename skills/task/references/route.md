# route — path, type, and the evidence behind them

Read on entering step 1. Input: the developer's description, the config from step 0, the repository. Output: the printed verdict, confirmed by the developer, then `brief.md` (`FORMATS.md §3`) and the `ledger.mjs init` that opens the task.

Sections: 1 intent · 2 type · 3 the nine rows · 4 the verdict · 5 print, then ask · 6 open the task · 7 `bug` — the red loop · 8 `campaign` · completion · anti-pattern · bound.

The verdict decides how much process this work gets. It is a decision made from the evidence of five calls, not an investigation — a router that goes exploring has failed, and what it wanted to know is the research phase's job.

Everything this phase needs is on this page. The specification sections named below are provenance — where the shape was decided — not a lookup: a phase that goes reading `docs/` has spent its budget on the engine instead of on the project.

## 1. Intent

One sentence, in the project's own nouns: what will be true when this is done. The description is the developer's; this sentence is what you are about to route. Where they differ, the difference is the first thing you ask about.

A ticket key in the description (`ABC-123`) is kept: it is the slug and it is the first line of the prompt in `brief.md`.

## 2. Type

| Type | What distinguishes it | What it changes downstream |
|---|---|---|
| `feature` | behavior that does not exist yet | nothing; this is the default shape |
| `bug` | behavior exists and is wrong — there is a *current* output to contradict | the plan opens with a red loop; §7 |
| `refactor` | behavior stays, structure changes | the plan carries a done-metric that is a command with a number |
| `question` | the answer is knowledge, not code | step 4: answer with sources, no plan |
| `spike` | the output is a **decision**: no statement of what will be true when this is done survives as a check a command could run | the plan carries the question, the timebox and the exit instead of acceptance criteria, and no task is committed |
| `upgrade` | the request names a package the manifest or lockfile **already carries**, and the change is to its version | the evidence loop is the project's own commands run against the new version |

A description asking "why does X happen" that ends in a fix is a `bug`, not a `question`. A `question` is one whose answer the developer will act on themselves.

**The two that are easy to over-claim.** "I don't know how yet" is not a `spike` — it is a plan with research in front of it. The test is whether an acceptance criterion *can* be written at all: "should we move to Redux Toolkit" cannot, "migrate the cart slice to Redux Toolkit" can. Adding a package that is not in the lockfile is a `feature` with row 4 `yes`, not an `upgrade`; removing one is a `refactor`. Both tests are `FORMATS.md §3` — read them there if a request sits on the line, and route the heavier of the two candidates when it still does.

**A shape, not a type.** A `refactor` is **mechanical** when row 1 is above the `quick` limit *and* every touched file takes the same edit — one transformation statable as a single rule. It is not a path and not a type: the verdict rules are unchanged and rule 3 still sends it to `deep` on width. Write `Shape: mechanical` under the verdict in `brief.md` and name the transformation in one sentence; `execute` reads it and builds a codemod instead of forty hand edits.

## 3. The nine rows

Fill every row of `FORMATS.md §3`. Each carries evidence — what you looked at — or the literal `unknown`. `unknown` is an honest answer with a cost: rules 2 and 4 below read it as weight, so the checklist you could not fill routes heavier, which is the point.

| Row | Where its evidence comes from |
|---|---|
| files touched (estimate) | Glob or Grep for the nouns of the intent, then count **every file the change creates or edits**: the source files, the test beside each of them, the manifest and lockfile when it adds a dependency, and the declaration or barrel its public surface passes through. The list is what the rule reaches, not a closed set — a file the change has to edit is counted whether or not it is named here. On type `question` there is no change: count the files the answer must **name** to be complete — the ones a reader would have to open — not every file you read to find them |
| new module | `yes` when the change adds a file, directory, or package that something outside its own directory imports; `no` when everything it adds is imported only from within the directory it sits in. Name the directory either way |
| contract / schema / route change | `yes` when the change adds, removes, or alters an interface something outside the changed files depends on by name — a route or its request/response shape, a persisted schema or stored format, an exported signature. Widening one so every existing caller stays correct — a new union variant, a new optional parameter, a new optional field — is `no` |
| new dependency | the manifest and the lockfile: is the library already there? |
| data migration | a migrations directory, a persisted shape, a stored format the intent changes |
| needs more than one mergeable unit | `yes` on any of three: the work **changes which packages or services exist** — one created, removed or split; it **spans more than one repository**; or it cannot land as one branch and one review without breaking main or losing reviewability. Editing two packages a single repository releases together is one merge and is `no`; splitting one of them into two, or moving one out to its own repository, is `yes`. |
| fog | can you state what "done" looks like *and list the work*? A goal that is nameable over a scope nobody has inventoried — "make it accessible", "find and fix every X" — is fog |
| more than one developer | the description says so, or the work splits across owners who would each need a branch |
| external wait | the intent depends on something not ready — a backend, a design, a decision elsewhere |

Rows 6–9 are read from the description and from what the developer said, not from files. Rows 1–5 are what the tool budget is for.

**Values.** Each value is `yes`, `no`, a single number, or the literal `unknown`. A range (`1–2`), a hedge (`yes, if acted on`), or a sentence is not a value the rules can read — pick one, and put the reasoning in the evidence cell where it belongs.

**The burden of proof is on the lighter path.** Where a row is genuinely arguable, write the value that routes heavier, or write `unknown`. The cost of routing a two-file change as `standard` is one grilling round; the cost of routing a contract change as `quick` is a plan nobody reviewed. The ratchet is one-way — a task upgrades mid-flight and never downgrades — so the light answer is the one that has to be earned.

**Calibration.** This is how the specification fills the rows for "add an order summary widget above the order list", and it is the granularity to match — the new `summary/` directory is a module because the page outside it imports it, and the file count includes the files the change creates:

| Row | Evidence | Value |
|---|---|---|
| files touched (estimate) | src/orders/api.ts, src/orders/OrdersPage.tsx, src/orders/summary/* (new) | 5 |
| new module | src/orders/summary is new and src/orders/OrdersPage.tsx imports it | yes |
| contract / schema / route change | the orders endpoint's shape, read at src/api/orders.ts — unchanged | no |
| new dependency | package.json unchanged | no |
| data migration | none | no |

**Budget: ≤5 evidence calls** (decision 0029) — the searches and reads that fill rows 1–5. Step 0's `config.mjs find` and the read of this page are the procedure, not the investigation, and are not among the five. Spend them widest first — one Glob for the area, one Grep for the concern, and stop. A row the budget did not reach is `unknown`, and that is a better answer than a guess wearing a file path.

## 4. The verdict

`FORMATS.md §3`, applied in this order, first match wins:

1. any `yes` or `unknown` on rows 6–9 → **campaign**
2. `unknown` on rows 3–5 → **deep**
3. rows 2 and 3 both `yes`, or type `refactor` with row 1 above the `quick` limit of rule 5 — more than three files → **deep**
4. `unknown` on rows 1–2 → **standard**
5. rows 1–5 all inside the `quick` limits (row 1 ≤3, rows 2–5 `no`) → **quick**
6. otherwise → **standard**

An `unknown` row 1 is not a count above rule 3's limit: rule 4 is what reaches it.

`Path` is one of `quick`, `standard`, `deep`, `campaign`; `Campaign:` restates rule 1 for the reader.

## 5. Print, then ask

Print the checklist and the verdict before asking anything. The developer confirms against what you saw, not against a conclusion:

```
| Row | Evidence | Value |
|---|---|---|
| files touched (estimate) | src/orders/api.ts, src/orders/OrdersPage.tsx | 2 |
| … | … | … |

Path: standard — quick fails on rows 1–2 · deep not required: rows 3–5 are `no` with evidence
Type: feature
Campaign: no — rows 6–9
```

Then `AskUserQuestion`: the proposed path and type as the first option, each real alternative as its own option with the one line that would make it right ("deep, if the summary endpoint is a new contract rather than a query on the existing one"). The developer's override is recorded in `brief.md` as `Confirmed by user: overrode to <path>`.

## 6. Open the task

Every verdict but `campaign`, which opens no task — §8.

1. Slug: kebab-case ASCII, ≤40 characters, from the ticket key when there is one, otherwise from the intent. `ledger.mjs init` normalizes it and appends `-2` on collision, then prints the slug it used — that printed slug is the one every later step passes.
2. `node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs init <slug> --path <path> --type <type>`, plus `--campaign <campaign>/<node>` when the argument was a node.
3. Write `.claude/hodos/tasks/<slug>/brief.md` — the printed table and verdict block, with the prompt above them:

   ```markdown
   # <slug>
   Created: <YYYY-MM-DD> · Path: <path> · Type: <type> · Campaign: <campaign/node or —>

   ## Prompt
   <the developer's message, verbatim>

   ## Checklist
   <the nine-row table, exactly as printed>

   ## Verdict
   <the three lines, exactly as printed>
   Confirmed by user: yes
   ```

   An override is `Confirmed by user: overrode to <path>`. For a `bug`, the red-loop candidates of §7 go under the verdict.
4. A path the developer changed at confirmation is also a ledger line: `ledger.mjs add "Route: <path> <type>"`.

## 7. `bug` — the red loop

Before leaving this phase, name the commands that could go red on this bug: a failing test, a `curl` against a running service, a CLI invocation, a browser route with the console open. Write the candidates into `brief.md`. The plan opens with one of them, and no red-capable command means no phase 2 — that is the finding, and it is worth more than a plan built on a hypothesis nobody can contradict.

**No candidate is a command that fails today → `reproduce`.** When the description names none, the adapters below return none, and nothing in the repository fails on this symptom as it stands, the next phase is not the plan: it is `references/reproduce.md`, which either produces a red-capable command or stops with the finding that the symptom is not reproducible here. The condition is decidable and is checked once, after the two reads below: a candidate that exists is a command someone could run now, not one that could be written.

**The machine's account of the failure**, where the project has one. The verdict is already printed, so these two reads cost nothing the budget of §3 is holding:

- `config.adapters.ci` names an adapter → `ci.failedRun` for the branch or the commit the report names, and the failing job's own command is a red-loop candidate that already exists. A pipeline that fails is a command someone can run.
- `config.adapters.logs` names an adapter → `logs.trace` for the error the report describes, and the stack frame it returns names the file the red loop has to reach.

Each is `Skip: <role> unavailable` when the role is `null` or when the read finds nothing for this failure, and the candidates then come from the description — which is where they come from today, and which is what these two replace only when they are configured. Whatever they return is a candidate written into `brief.md` like the others, never a diagnosis: a trace says where it broke, and why is the plan's question.

## 8. `campaign`

Rule 1 fired: the work is a map, not a task, and no task is opened for it: `ledger.mjs init` records a path out of `quick`, `standard`, `deep`, and a campaign's nodes are routed one by one as their own tasks (`FORMATS.md §3`, `DESIGN.md §9`). Confirm the verdict and return to the kernel's step 3, which hands the description to the `campaign` skill. The printed checklist and verdict are this phase's whole output, and the map they feed is that skill's file.

## Completion

Nine rows with evidence or `unknown`, a verdict the rules produce from those rows, the developer's confirmation, `brief.md` on disk, and `ledger.mjs init` run. On a campaign verdict this phase writes nothing: the confirmed verdict is what step 3 carries into the `campaign` skill. The verdict was reached in ≤5 evidence calls.

## Anti-pattern

Exploring instead of deciding. Reading a file to break a tie between `standard` and `deep` — the tie is what rule 6 is for. Filling a row from the description when the description does not say it: that row is `unknown`. Proposing a path with no alternative, which turns a decision into a notification.

## Bound

Five evidence calls. The sixth is the verdict `deep` with `unknown` in the rows it could not reach.
