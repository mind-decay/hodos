---
name: rule
description: Write one project rule into .claude/rules/ with evidence for all three questions of the rule test. The developer runs it as /hodos:rule <what the rule should say>; the finish phase invokes it for a rule proposal the developer accepted. Writing a rule is the developer's decision, so it is not invoked on your own reading of a session.
argument-hint: "<what the rule should say>"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

# rule

One rule, one file, three questions answered with evidence before a line is written. A rule is read on every turn its `paths` match, which is the most expensive real estate the project has.

`node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs find`. `notFound` → say `run /hodos:init first` and stop: rules live in a project layer this one does not have.

`init` applies the same test in batch, through `skills/init/references/rules.md`. What changes here changes there.

## 1. Grep first

Before anything is drafted, find what the code already does. `Grep` for the pattern the rule would require **and** for the shape it would forbid, and count both. That count is the input to questions 1 and 3 and it is printed in the answer, not summarised as "common".

A rule about a stack the project does not use is refused here, with the grep that shows it.

## 2. The three questions, aloud

Answer all three in the chat, each with its evidence, before the draft (`AUTHORING.md §10`).

**1. What evidence does the rule carry?** Two forms are admissible; the answer names which one.
- **Descriptive** — ≥2 precedents of the target → cite them `file:line`, anchored. Those citations become the rule's evidence, and `/hodos:status` later checks they still resolve and that their anchors have not moved.
- **Prescriptive** — fewer than two precedents, and the developer has decided this *is* the target: a new stack, a replaced layer, an established shape they agree is wrong. Cite the old shape's occurrences and carry them into `## Migration`. Without that decision in hand — their own words, or a proposal from the finish phase they accepted — ask for it before drafting. This skill never decides a target on its own reading.
- **Both shapes present** → drift. Count each side, ask which is the target, write the rule for the target only, and count the other in `## Migration`. "Either X or Y" carries zero signal and is never written.

A count is not a justification. Twenty files doing the same wrong thing is a convention that exists, not one worth loading on every matching turn — where the established shape is the problem, the rule proposed is the target, and the judgement is said aloud as a judgement.

**2. Would the model do it without the rule?** This is the question that refuses. Answer it with an observation, never an opinion: the developer named it as something Claude gets wrong here, or the history shows it written the other way and corrected — a fix commit, a revert, a review comment. A rule the model would follow anyway costs context on every matching turn forever and changes nothing.

**No observation → refuse.** Say which question failed, why (`the model already does this by default`), and what would change the answer: an instance where it did not. Write nothing. `use async/await`, `write tests`, `handle errors` all end here.

**3. Is it mechanically checkable?** A lint rule, a hook or a CI step beats prose, because it holds when nobody is reading. Say which one would do it and propose that instead; prose is what remains when nothing can check it. If the developer wants the prose anyway, it is written — with the check named in the rule's own text.

## 3. The draft

Show the file before writing it:

- One concept, named after the rule rather than the area.
- Lead with the target shape as a positive recipe. No prohibition, no "unless it matters" — a nuance clause reopens exactly what the rule closed.
- A code example over a paragraph, copied from a precedent rather than invented — and for a prescriptive rule, which has none, from the target's own documentation, with the URL.
- The precedents in a `## Precedents` block: `file:line`, an em dash, and the text of that line in backticks — the anchor `/hodos:status --prune` re-points from when the code moves (`AUTHORING.md §10`). The URL, when the rule came from a source, stays in the prose.
- The incident, where there was one.
- No legacy clause. A rule describes the target state; "X for new code, Y for old" is two rules and the model picks the wrong one.
- A `## Migration` section when the rule is prescriptive or resolves a drift: how many places carry the old shape, cited by `file:line`. It goes below the rule, never inside its sentence.

`paths:` scopes it, as a list — the documented shape:

```yaml
---
paths:
  - "src/features/**/*.{ts,tsx}"
---
```

No `paths` means loaded on every turn, and is written only when the rule genuinely governs every file.

## 4. Confirm, write, check

`AskUserQuestion` with the drafted file and the three answers. On approval, write `.claude/rules/<name>.md` — kebab-case, named for the rule — then:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/lint.mjs --project
```

It checks the cap (100 lines), the frontmatter subset, that every `file:line` in the rule resolves, and that every anchor still sits on the line its entry names. Findings are fixed before this skill returns. Say where the file went, and that `/hodos:status` will report it if its precedents move.

Then say one line for the CLAUDE.md map: the rules directory is listed there, and a rule nobody can find is a rule nobody applies.

## Completion

Either a file under `.claude/rules/` with lint green and the three answers in the chat, or a refusal naming the question that failed and no file at all.

## Anti-pattern

Writing the rule and then justifying it. The three answers come first and one of them can refuse.

One occurrence offered as a convention, or a rule from this session's own annoyance. A prescriptive rule needs the developer's decision, not a small count and confidence.

Restating a default the model already follows — the failure mode this skill exists to catch.

Two concepts in one file, so that half of it is loaded for files the other half does not govern.
