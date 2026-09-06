# rules — what earns a place in the always-loaded budget

Read on entering step 2 and again at step 4. Input: the scan's convention candidates, the stacks it detected, the developer's answers. Output: the rule table of the step-4 report, and after approval the files under `.claude/rules/`.

A rule is read on every turn its `paths` match. That is the most expensive real estate the project has, so a rule is written when the evidence says the model gets this wrong here, and deleted otherwise.

## Three sources of candidates

1. **Code precedents** — area C of the scan: a pattern with ≥2 `file:line`.
2. **Best practice for the detected stack** — `${CLAUDE_PLUGIN_ROOT}/sources/<stack>.md`, fetched at step 2.
3. **The developer's observations** — what Claude gets wrong here, from the interview's first batch.

All three enter the same filter. A candidate's origin changes the evidence it carries, never the bar it clears.

## Fetching a source (step 2)

Read `sources/<stack>.md` for every stack the scan detected, then fetch only the pointers that bear on what the scan found: a project that uses effects and a query cache fetches those two pages, not the index. `config.adapters.docs` names an adapter → `docs.getDocs`, pinned to the version the lockfile records; WebFetch the URL when it is the framework's own documentation, and when the role is `null`. A candidate from a source carries that URL into its row.

## The filter — three questions, each with its evidence

**1. What evidence does the rule carry?** Grep both shapes before writing; two forms are admissible and the row names one (`AUTHORING.md §10`, decision 0050).
- **Descriptive** — ≥2 precedents → cite them `file:line`, anchored. Those citations are the rule's evidence, and `status` later checks that they still resolve and that their anchors have not moved.
- **Prescriptive** — fewer than two precedents, and the developer settles in the interview that this is the target: a stack they are moving to, or an established shape they agree is wrong. The old shape is counted in `## Migration`, never hedged inside the rule.
- **Both forms present** → drift. Count each side, settle the target with the developer, and open a migration node for the rest. "Either X or Y" carries zero signal and is never written.

A precedent count says a convention exists, not that it is worth keeping. A project can arrive with the same mistake in twenty files, and this step is where it would be written into the always-loaded budget — so every candidate carries the judgement in its own column of the step-4 table, and the answer is one of two words:

- **keep** — the precedents *are* the target. The count is the evidence and the rule writes it down.
- **target** — the count is the problem. The rule proposes the shape to move to, the established one is counted in `## Migration`, and the row is contested by construction: it goes to the developer on its own at step 5, never in the batch.

A `target` judgement needs a reason that is not the model's taste: the stack's own source says so with its URL, the developer named it in the interview, or the repository shows the shape being corrected — a fix commit, a revert, a review comment. Without one of the three the judgement is `keep`, because "twenty files are wrong and I know better" with no citation is exactly the opinion question 2 exists to refuse.

**2. Would the model do it without the rule?** Answered with an observation, never an opinion: the developer named it, or the repository shows it was written the other way and corrected — a fix commit, a revert, a review comment in the history. No observation, no rule: the model already does this, and the sentence would cost context on every matching turn forever.

**3. Is it mechanically checkable?** A rule a lint rule, a hook, or a CI step can enforce becomes that check, and the prose goes. Prose is what remains when nothing can check it. The check goes in the same row as a proposal: init writes a hook into `.claude/settings.json` on approval, in the shared form step 6 of the kernel requires, and a lint or CI change lives in the developer's own files, so there it stays a proposal in the report and nothing more.

## The rule form

- One concept per file, named after the rule rather than the area.
- Lead with the target shape as a positive recipe. No prohibition, no nuance clause — "unless it matters" reopens exactly what the rule closed.
- A code example beats a paragraph, copied from the precedent rather than invented — and for a prescriptive rule, which has no precedent to copy, from the source's documentation with its URL.
- `paths:` scopes it to the files it governs, as a list — that is the documented shape, and a scalar there is a form nothing has verified:

  ```yaml
  ---
  paths:
    - "src/features/**"
  ---
  ```

  Omitting `paths` loads the rule at every launch, which is for a rule true of every file the project has.
- Carry the precedents in a `## Precedents` block, one entry per line: the `file:line` resolved from the project root — never as the path reads from the rule's own directory — an em dash, and the text of that line in backticks (`AUTHORING.md §10`). The quoted line is the anchor: it is what tells `--refresh` and `/hodos:status --prune` where the code went when it moves. The source URL and the incident, where there are any, stay in the rule's prose.
- Target state only. "X for new code, Y for old" hands the model the choice the rule existed to remove.
- ≤100 lines. A rule that needs more is two rules, or it is documentation.

## The report (step 4)

One row per candidate, the rejected ones included. The `Q1` cell names the kind, and the `Judgement` cell is `keep` or `target` with what carries it — the source URL, the developer's sentence, or the correcting commit:

| Rule | `paths` | Precedents | Source | Q1 (kind) · Q2 · Q3 | Judgement | Form |
|---|---|---|---|---|---|---|
| Network calls go through the wrapper | `src/features/**` | 6, cited in the file | — | descriptive · developer named it · no lint covers it | keep | prose |
| A catch that swallows the error | `src/features/**` | 9 of the old shape, 1 of the target | the stack's own page, URL in the row | prescriptive · developer settled it · a lint could | target — the source says so and the developer agreed | prose + a lint proposal, old shape counted in `## Migration` |

## Contested rules (step 5)

Asked one at a time, with three questions: why this and not the default? where are the exceptions? what mistake does it prevent? An answer that names no mistake is question 2 failing late — drop the rule and say so.

Every `target` row is contested, whatever its precedent count: it asks the developer to move the code, and that decision is theirs. Show both shapes with their counts and their `file:line` before asking.

## Completion

Every candidate has a verdict carrying its evidence; every candidate has a `keep` or `target` judgement with what carries it; every accepted rule is descriptive with ≥2 precedents, or prescriptive with the developer's decision on the record; every rejection names the question it failed.

## Anti-pattern

A rule the model already follows. One precedent plus confidence. A rule that says "either". Prose where a lint rule would hold. A source-derived rule the code shows nowhere written up as though the project already kept it — it is prescriptive, it needs the developer's decision, and calling it a convention makes every other rule cheaper to ignore.

The project's most frequent pattern written down because it is frequent. Question 1 counts; it does not endorse.

## Bound

Each stack's source list is fetched once per run. A candidate rejected at step 5 is not raised again in the same run.
