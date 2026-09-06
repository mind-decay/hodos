# prune — the rules as facts, and one question per rotted citation

Read on entering `/hodos:status --prune`. Input: the project's `.claude/rules/`. Output: the facts printed, and whatever the developer decided about the rules whose precedents have rotted. Nothing else in the project changes.

Sections: 1 what is knowable · 2 the run · 3 the three answers · completion · anti-pattern.

## 1. What is knowable, and what is not

A rule earns its place by changing what gets written. Nothing in the repository measures that, and the three things that look like they might do not (decision **0082**):

- **Rot** — a precedent citation that no longer resolves, or an anchor whose text has moved out from under it — is provable, and it measures the *code* moving, not the rule failing. Its answer is usually to re-point the citation, not to delete the rule.
- **Loads.** Only the `InstructionsLoaded` hook observes a rule loading, and by `PLATFORM-NOTES.md` fact 43 a `paths:` rule loads on a matching **Read** — while the reviewer and the verifier reach files through commands. A rule that governs the phase that judges the code would count as never loaded.
- **Citations in findings** are inverted: a rule that works prevents the finding that would have cited it. Zero citations is what the best rule in the layer and the deadest rule in the layer both produce.

So this run prints facts and asks. It never says a rule is dead, never sorts by "least useful", and never proposes a deletion the facts do not support.

## 2. The run

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/lint.mjs --rules
```

Per rule: its **age**, its size in lines, how many precedents its `## Precedents` block carries and how many paths it cites in all, which of them have rotted and how — a citation that no longer resolves, or an anchor whose text has moved out from under it, each on its own line prefixed with the rule's line — then one closing line with the layer's token cost. The two counts differ when the rule names a path in its prose as well as in its block, and the first is the one `AUTHORING.md §10` question 1 asks for. The four facts decision **0082** names, with 0078's anchor inside the third. Print it as it comes.

The age is **first arrival**, from git: how long this convention has been in the project, followed through renames and through a delete-and-restore. A re-pointed precedent does not make a rule younger, and mtime is not usable at all — a clone rewrites every file's to the checkout, which would report a whole layer as written today. A rule git has no record of prints `age unknown — not committed`, which is a fact about the repository, not about the rule.

The layer's cost is the number worth saying out loud once: every `paths:` rule is read on every turn its glob matches, so ten rules of eighty lines is a standing charge on the project, not a library. The developer decides whether it is worth it; this run makes it visible.

## 3. The three answers

For each rule with a rotted precedent — and **only** those — one `AskUserQuestion`, one rule at a time:

| Answer | What happens |
|---|---|
| **keep** | nothing. The citation stays as it is, and the run says the rule was kept with a rotted precedent so the next run asks again |
| **re-point** | the anchor has already found the code: the finding names the line its text is now on, and that line is what the citation is rewritten to, a range's end shifting by the same delta. **Every citation of that same `path:line`** moves with it — the `## Precedents` entry and any mention of it in the prose, which the line-exists check cannot see rot and would leave pointing at whatever now sits there. The rule's *statement* is not touched: a citation that moved is a citation, not a new rule |
| **delete** | remove the file, after naming it, its precedents, and what it says. It is the developer's file; deleting one is the destructive act of this skill, and it happens on an explicit answer and no other way |

A rule whose precedents all resolve, anchors included, is printed and not asked about. A rule that cites nothing is printed with `no precedent cited` — that is an `AUTHORING.md §10` finding to raise in one line, not a deletion candidate.

Re-pointing needs the code the citation pointed at to be findable, and the anchor is what finds it (`AUTHORING.md §10`). Two findings offer no line, and neither is re-pointed here: the anchor is gone from the file, and the anchor matches several lines. Say which of the two it is and offer the two real answers — delete the rule, or keep it and re-point by hand later. Inventing a plausible line number is the failure this whole run exists to catch.

## Completion

The facts printed, one question asked per rotted rule and no others, and every change made on an explicit answer. A run where the developer answered **keep** to everything has done its job: the layer's cost is on screen and nothing was deleted by a script's opinion.

## Anti-pattern

Calling a rule dead. Ranking rules by usefulness. Deleting a rule because its citation rotted — the citation is what rotted. Re-pointing to a line that merely looks right. Asking about rules whose citations resolve, which trains the developer to answer without reading.
