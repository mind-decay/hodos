# research — facts, fetched by subagents, cited by line

Read on entering step 5. Input: the intent and the brief, the config, the open facts grilling has hit. Output: `research.md`, every citation checked.

Research answers what *is*: how the project does this today, what the installed version of a library offers, what breaks nearby. It never answers what *should be* — that is the grilling round, and it belongs to the developer.

Everything this phase needs is on this page. The specification sections named below are provenance — where the shape was decided — not a lookup: a phase that goes reading `docs/` has spent its budget on the engine instead of on the project.

## 1. Questions

Turn the open facts into numbered questions, each answerable by reading. A question with a "should" in it is a decision wearing a question mark: move it to the grilling round.

```
Q1. How does the project load order lists today?
Q2. What does @tanstack/react-query 5.51.1 offer for keeping previous data across a key change?
Q3. Where else is a summary computed, and where does that computation live?
```

Three to six questions is the usual shape. One question per dispatch.

## 2. Dispatch

One `Explore` subagent per question, `model: config.models.research`, read-only. Dispatch runs in the background: wait for the completion notification, do not poll.

The dispatch message carries the question, the files to start from — the brief already names the area, and a subagent that has to find the project first spends its budget finding it — and the answer shape:

- ≤1,500 tokens
- every fact as `path:line`, and nothing that is not a fact
- a *files to read* list at the end: what the planner should open next

A subagent does not dispatch subagents, and does not propose a design. An answer that arrives as advice ("consider extracting the totals into a hook") is re-dispatched with the question narrowed to what it should have read.

## 3. Precedents

A convention starts at two. For every pattern the plan will follow, the answer names ≥2 places the project already does it, by `path:line`. One occurrence is an observation, and building on an observation is how a project grows its third way of doing the same thing.

Precedents belong in `research.md` under `## Precedents` and are what the plan's `### Precedent` field cites.

**The index, where the project has one.** `config.adapters.codeIndex` names an adapter → the dispatch carries its path, and the subagent answers "where else does this happen" with `codeIndex.findReferences` on the symbol the pattern hangs on and `codeIndex.outline` on the file it lands in, which returns call sites rather than string matches. Grep is still run, as §6's second search of a different shape: an index covers one project root, so an empty result from it is not a negative result. `null` → `Skip: codeIndex unavailable` in the answer, and Grep is the whole method.

## 4. External APIs

Three steps, in order, and the order is what makes the answer true:

1. The **installed** version, from the lockfile, with the lockfile line as its citation. Not the manifest's range — a range is what is allowed, a lockfile is what is there.
2. The documentation **for that version**: `config.adapters.docs` names an adapter → `docs.resolveLibrary` for the library's id, then `docs.getDocs` on the id pinned to the nearest version at or below the lockfile's (`/org/project/v5.71.10` — the pin comes from the answer's own version list, character for character). `null` → `Skip: docs unavailable`, and the source is the release's own notes, fetched by URL.
3. What the plan will actually use, one line, with the source.

`WebFetch` and `WebSearch` are reconnaissance — they find where a thing is documented. A claim about an API's behavior rests on the pinned source, not on a search result summarizing a different major version.

## 5. Risks

What the answers turned up that nobody asked about: a second source of truth, a shared mutable module, a test that pins the shape the plan is about to change. One line each with its `path:line`. A risk here becomes an invariant, a non-goal, or a task in the plan — the grilling round decides which.

## 6. Negative results

"There is no such thing in this project" is a finding only after a second search of a different shape: a different noun, a different directory, the imports of the file that would use it. A negative from one grep is a grep that missed.

Record it: `Q3. Nothing computes summaries today — searched for "summary", "total", "aggregate" across src/ and for consumers of orders/api.ts`.

## 7. Write and check

Write `.claude/hodos/tasks/<slug>/research.md`, opening with `# Research — <slug>`: one `## Q<n>` section per question with its cited facts and files-to-read, then `## Precedents`, `## External APIs`, `## Risks`, `## Open questions (for grilling)`.

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/verify-citations.mjs .claude/hodos/tasks/<slug>/research.md
```

A failing citation is fixed before the file is used — a plan built on a line that does not exist is a plan whose precedent argument is empty. Fix by re-reading the file, not by deleting the citation.

## Completion

Every question carries an answer with citations, or is moved to `## Open questions (for grilling)` with what was searched. `verify-citations.mjs` exits 0.

## Anti-pattern

A subagent that answers the design question instead of the fact question. Quoting a library's current documentation for a version the lockfile does not hold. Citing the file that would use a thing as evidence that the thing exists. Carrying a question into the plan because the search was inconvenient — an open question is written down as open, and grilling asks the developer.

## Bound

One dispatch per question, plus one re-dispatch for an answer that came back as advice or empty, starting from a different shape. A third dispatch on the same question is not run: the answer is that the repository does not hold it, and that goes into `## Open questions`.
