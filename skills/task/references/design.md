# design — the ten fields, and what each one forces

Read on entering step 6, with `plan.md`. Input: the research, the project's rules, the code. Output: the `## Design` section of `plan.md` and its `## Non-goals`.

An empty field means the plan is not ready. The fields are not documentation of a design already made — filling them is how the design gets made, because each one names a way plans fail.

Everything this phase needs is on this page. The specification sections named below are provenance — where the shape was decided — not a lookup: a phase that goes reading `docs/` has spent its budget on the engine instead of on the project.

## The ten

| Field | One line of guidance |
|---|---|
| `## Non-goals` | What this task explicitly does not do. Write the tempting ones — the adjacent cleanup, the second feature the first one suggests — because those are what scope creep is made of. |
| `### Modules` | `touched:` the ones that change, `new:` the ones that appear, each new one with the sentence saying why no existing module fits. |
| `### Dependency direction` | The arrows, in one line, pointing inward toward the domain. A violation is not a note, it is a decisions-table row. |
| `### Interfaces` | The actual signatures the tasks will write. A deep module is a small interface over large functionality; if the signature list is long, the module is a pass-through. |
| `### Invariants & failure modes` | What cannot break, and what happens when the thing it depends on does. One line each; a failure mode with no behavior written is a `catch` nobody designed. |
| `### Data & scale` | Volume, latency, the hot path, the unbounded list, the query inside the loop. Write the assumption as a number even when the number is "≤5k, one request" — an unwritten assumption is one the reviewer cannot check. |
| `### Precedent` | ≥2 `path:line` showing how the project already solves this. No precedent is itself a finding: it means this is a new pattern, which is a decisions-table row carrying the old pattern's cons. |
| `### Refactor in scope` | The improvements inside the boundary the tasks already open, by `path:line`. Bounded by the tasks, not by taste. |
| `### External APIs` | Library → installed version from the lockfile → the doc source **for that version** → the one thing the plan uses. |
| `### Architecture alternatives` | Points at the decisions-table rows where 2–3 real options were compared. "See D2" is the whole field when D2 does the work. |

## Precedent first

Before designing a thing, find how the project already does it. Two places make a convention; the plan follows it, and following it needs no argument.

Departing from it needs one: a decisions-table row naming the existing pattern, its cons *in this case*, and what the new pattern buys. A plan that quietly introduces a second way of doing something the project already does is the most expensive kind of correct plan — it is right once and wrong every time afterwards.

A rule in `.claude/rules/` outranks a precedent you found by reading: the rule is the precedent, already argued.

## The wrapper rule

A wrapper earns its place by adding one of three things:

- an **abstraction boundary** — callers stop knowing what is behind it
- an **invariant** — something is now true that was not enforced before
- a **type translation** — the outside shape and the inside shape genuinely differ

A wrapper adding none of them is a rename with a call in it. Keeping it anyway is fine — as a decisions-table row titled "why", so the next reader inherits the reason instead of the mystery.

## Design it twice

Every architecture decision carries 2–3 real alternatives, compared in the decisions table by **one** planner. Real means each one could be built and each one has a cons cell someone would sign.

The second design is where the first one's assumptions become visible: the first design is usually the first thing that could work, and comparing it to nothing is how it stays that. No subagent fan-out here — parallel planners produce parallel plans, not compared ones, and the comparison is the whole mechanism.

Each row states the **axis** its alternatives differ on, and one of five names it (decision **0085**):

| Axis | The fork it names |
|---|---|
| module boundary | what sits inside one unit and what has to cross a seam |
| dependency direction | which side imports which |
| where state lives | who owns the value and who reads a copy |
| what becomes an invariant | which property the design makes impossible to break |
| what fails and how | which failure the design turns into an error, and where |

Alternatives that differ on none of the five are one alternative under the skin. Say so and find a real second — the axis is what makes that sentence decidable rather than a matter of taste, and the failure it catches is three shapes drawn from one distribution: the most typical form for the problem, compared against two of its neighbours, while the option a design canon would have compared against was never a row.

## External APIs, version to source

1. The version the lockfile holds, cited by its line.
2. The documentation for **that** version — `docs.getDocs` on the id `docs.resolveLibrary` returned, pinned to the nearest listed version at or below the lockfile's; `Skip: docs unavailable` and the release's own notes when `config.adapters.docs` is `null`.
3. What the plan uses, in one line.

A library's current documentation describing a major version the project does not have is the failure this ordering exists to prevent, and it fails silently: the code compiles against a signature that changed.

## The design source, pulled once

`config.adapters.design` names an adapter → **one** `design.getFrame` on the frame the task implements, here, on plan. Spacing, colors, variants and the states that exist become numbers inside `### Interfaces` and `### Data & scale`, and the plan is what execute reads. `design.variables` answers a token question the frame did not. A dozen states pulled per component is hundreds of thousands of tokens, which is why the pull is one and its output is materialized rather than re-fetched.

`null` → `Skip: design unavailable`, and the numbers come from the developer, written into the same fields. Either way execute pulls nothing: verify pulls again when the claim is that the built thing matches the frame.

## The live schema

`config.adapters.db` names an adapter → `db.schema` for the tables the task touches, and `### Data & scale` carries what it returned: the columns, their nullability, the indexes the hot path depends on. A migrations directory records how the schema was reached, not where it arrived — a migration nobody ran, or one run only in production, is the gap this read closes.

`null` → `Skip: db unavailable`, and the field says which migration files it was inferred from, so the reviewer can check the inference rather than the conclusion.

## Completion

Ten fields, none empty, none restating its own name. A field this task genuinely has nothing under is `none` with the half-line that says why — that is what keeps a `quick` task from inventing an external API to fill a row (`DESIGN.md §4.1`). Every new module carries its reason; every precedent resolves; every architecture decision points at a table row with real alternatives.

## Anti-pattern

Filling a field with the field's own name in a sentence ("Modules: the modules this task touches"). A `### Data & scale` that says "small". Alternatives invented after the choice, to fill the column. A wrapper whose justification is that it is cleaner.

## Bound

The fields are ten and they are fixed. A design question no field holds is a decisions-table row — a new field is a change to `DESIGN.md §6.2`, which is a decision, not a plan.
