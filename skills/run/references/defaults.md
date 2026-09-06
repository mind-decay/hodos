# defaults — the ladder, the catalogue, and what the pass writes

The simplify pass reads this file with `execute.md §7`. The ladder is the order; the catalogue is what each rung consults; the forms are what the pass emits.

## The ladder

Consult the rungs in order and stop at the first one that holds. The ladder shortens the solution, never the reading — it runs after the change is understood.

1. Does this need to exist at all?
2. Is it already in this codebase? Search before writing: the most common re-implementation is of a helper a few files over.
3. Does the standard library do it?
4. Does a native platform feature cover it?
5. Does an already-installed dependency solve it?
6. Can it be one line?
7. Only then: the minimum that works.

A bug fix takes the same route to the root cause, because that is also the smaller diff: one guard in the shared function every caller routes through beats one guard per caller, and it is the only one that leaves no sibling caller broken.

## The catalogue

The seventeen shapes a model produces unprompted, each as the target form.

| # | The target form |
|---|---|
| 1 | A framework's own documented pattern wins over the shape the model reaches for first; the project's rule names which, with its precedent |
| 2 | A new responsibility is a new module — the one `### Modules` named |
| 3 | The cheap refactor inside the task's boundary is done here; `### Refactor in scope` says which |
| 4 | The project's architecture and conventions hold; a rule violation is a `major` finding |
| 5 | A library call matches the docs for the installed version, which `### External APIs` cites |
| 6 | The version comes from the lockfile, and the docs are that version's |
| 7 | A rule that does not fit is a `Gap:` for the chat, not a silent exception |
| 8 | A helper has ≥2 callers, or it is inlined; an abstraction has ≥2 consumers |
| 9 | A comment carries a business nuance the code cannot; the code carries the rest |
| 10 | An error is handled per an invariant `### Invariants & failure modes` names, or it propagates |
| 11 | Types are inferred or declared, and a green test is proved by mutation |
| 12 | The project's own utility is used; the precedent search is what finds it |
| 13 | What `## Non-goals` excludes is not built — no shim, flag, or config nobody asked for |
| 14 | A name states the role; a function does one thing |
| 15 | A dependency is a decision, and ten lines are usually cheaper |
| 16 | Dead code dies in this pass |
| 17 | A deliberate cut with a known ceiling is a `hodos:` marker; a `TODO` is a `Gap:` for the chat |

## Red flags

Four sentences that mean the walk is being talked out of a cut. Each is answered, not argued with.

| The thought | The answer |
|---|---|
| "this case is simple" | Simple cases are where unexamined assumptions cost most |
| "the rule doesn't fit here" | A rule that doesn't fit is a `Gap:` for the chat, not a silent exception |
| "I'll clean it up later" | Later is the simplify pass, and it is running now |
| "the test is basically right" | Prove it with mutation |

## What the pass writes

One line per cut, to the transcript:

```
L<line>: <tag> <what>. <replacement>.
```

`<tag>` is one of `delete`, `stdlib`, `native`, `yagni`, `shrink`. Prefix the line with the file when the diff spans more than one. Close the pass with:

```
net: -<N> lines
```

or with `Lean already.` when the walk cut nothing. The count is descriptive: hodos values a readable diff, not a short one, and no threshold reads this number.

A cut declined because the simpler form is correct but bounded is recorded in the code, on its own comment line, in the project's comment syntax:

```
hodos: <ceiling> — upgrade when <trigger>
```

Both halves are mandatory. The marker is for work that is **complete and correct at the stated ceiling** — a global lock where per-account locks are not yet justified, a linear scan over a list the plan's `### Data & scale` field caps. Unfinished work stays a `Gap:`; a known defect is a review finding. Without that fence the markers become deferred work under a nicer name, which is the row 17 the catalogue already refuses.

## Admission and retirement

`DESIGN.md §7.2` states the criterion once — *what LLMs do without being told* — and nothing said how a row gets in or out (decision **0086**). The seventeen above are **grandfathered**: they are the author's reading of that criterion, carried on that footing and not on evidence per row, which is what a source column beside them would have manufactured.

An eighteenth row is admitted on one cited instance of the shape it refuses: a review package in `bench/review/`, a finding from the pilot, or a `hodos-reviewer` finding in `history.jsonl`, cited where it sits. The row is written as the target form, never as the shape it replaces.

A row is nominated for **retirement** when no finding cites it across a task set — the shape `finish` already uses for a rule that never fires. A model that stopped producing a shape unprompted is the reason the list must be able to shrink: every row of it is a claim about a model, and models change.

## Completion

Every hunk of the diff has been down the ladder once, and the pass has emitted either its cut lines and a `net:` line or `Lean already.`

## Anti-pattern

Re-scanning the catalogue against a hunk after a rung already held. Cutting something whose behavior the plan asked for — that is a `Gap:`, not a simplification. A marker on work that is not finished.
