# hodos — Authoring Rules

How every skill, reference, agent prompt, rule, adapter, and source in this repository is written. Applies to the engine and to what `init` and `/hodos:rule` write into projects. Enforced by `scripts/lint.mjs` where mechanical, by PR review where not.

Evidence: `research/03 §(a)`, `research/04` ("Philosophy"), `research/02 §7`.

## 1. Two loads

Every sentence costs one of two budgets. **Context load** is paid by the model on every turn the text is present. **Cognitive load** is paid by the human who must remember the document exists and when to reach for it. Cognitive load is the price of human agency — spend it where human judgment matters, remove it where it does not. Context load is minimized without exception.

Ask of every artifact: *which budget does this pay, and is it the right one?* Always-loaded material (CLAUDE.md, unscoped rules, the SessionStart digest) is the most expensive real estate in the system; anything that applies in one context out of ten pays for the other nine.

## 2. The no-op test

For each sentence: **would the model behave differently without it?** The test is model-relative and behavioral, not aesthetic. "Use async/await for I/O" is a no-op. "A helper has ≥2 callers or is inlined" is not.

- When a sentence fails, delete the whole sentence — trimming words keeps the no-op and loses the grammar.
- Settle disagreements by running the document, not by debate (the eval harness exists for this).
- A document gets shorter as it gets better. Duplication is the most reliable sign a document was never tested.
- Agents told to "streamline" optimize for length because length is what they can see. Run the behavioral test, not `wc`.

## 3. Positive recipes

State the target shape; do not prohibit. "Don't think of an elephant" makes the elephant more available. In head-to-head tests the prohibition wording produced clearly more of the unwanted output than the recipe wording, and trended worse than the no-guidance control (`research/03 §(a)`).

- **No nuance clauses.** "Don't X unless it matters" reopens the negotiation. A recipe leaves nothing to negotiate: the output matches the shape or it doesn't.
- Prohibition is reserved for hard guardrails, and even then it is paired with the positive target: "push and merge are the human's; the branch stays."
- Variance is a metric: five interpretations across five runs means the wording is not binding. Tighten the form before adding words.

## 4. Leading words

A **leading word** is a compact concept the model already holds (`frontier`, `fog`, `tracer bullet`, `red`, `tight`, `seam`, `precedent`). Repeated as a token, never as a sentence, it anchors a region of behavior for free. Use the glossary in `DESIGN.md §14`; add to it before coining anything new. A made-up word recruits no priors — you pay in definition tokens what a pretrained word gives free.

Refactor triads into a word: "fast, deterministic, low-overhead" → *tight*. "A loop you believe in" → *red*.

## 5. Completion criteria and named anti-patterns

Every step ends on a **checkable completion criterion**. "Understanding reached" invites premature completion; "the frontier is empty and every open question has an answer or an owner" does not. Demand forces thoroughness: "every modified module accounted for" beats "produce a change list".

Pair the criterion with the **named anti-pattern**, in the form *if you catch yourself doing X, stop: that is the exact failure this step prevents*. Examples: "No red-capable command, no phase 2." "A router that goes exploring has failed." "A reviewer that reads the implementer's rationale as evidence is grading the author's homework."

## 6. Standing instructions, front-loaded

Skill bodies enter the context once and stay; Claude Code never re-reads them. Write standing instructions ("always X when Y"), not step scripts ("next, do X"). Compaction keeps only the first 5,000 tokens of each skill: invariants and the phase table go in the first 40 lines; detail goes to references.

References are one level deep from the kernel (nested references get partial `head -100` reads). A reference over 100 lines starts with a table of contents.

## 7. Size caps (lint)

| Artifact | Path pattern (what `lint.mjs` matches) | Cap |
|---|---|---|
| Kernel `SKILL.md` | `skills/{task,run,init,campaign}/SKILL.md` | 150 lines |
| Small skill `SKILL.md` | `skills/{status,rule,skill,adapter,review,handoff}/SKILL.md`; project `.claude/skills/*/SKILL.md` | 100 lines |
| `wait-what` | `skills/wait-what/SKILL.md` | 10 lines |
| Phase reference | `skills/*/references/*.md` | 200 lines |
| Agent prompt | `agents/*.md` | 150 lines |
| Project rule | `.claude/rules/**/*.md` (`--project`) | 100 lines |
| CLAUDE.md map / managed block | `CLAUDE.md` (`--project`; the managed block when markers exist) | 60 lines |
| Adapter | `adapters/*/*.md`; project `.claude/hodos/adapters/*/*.md` (`--project`) | 30 lines |
| Source index | `sources/*.md` | 60 lines |
| Skill `description` | frontmatter | 500 characters (Claude Code truncates description + `when_to_use` at 1,536) |
| SessionStart digest | `state-digest.mjs` output | 300 tokens |
| Research subagent answer | dispatch instruction | 1,500 tokens |
| Review section | `review.md` | 400 words |

Files under `skills/`, `agents/`, `adapters/`, `sources/` that match no pattern are reported as "unknown artifact" — a new kind of file is a decision.

A cap hit is a signal to split or delete, never to compress prose into a denser paragraph. This table is the only one `lint.mjs` enforces; `COMPONENTS.md` may state a tighter *target* for a specific file, which is advice, not a check.

## 8. Frontmatter

Only these fields, in this order, flat `key: value`; lists as `- item` lines. Skills: `name`, `description`, `disable-model-invocation`, `argument-hint`, `allowed-tools`. Agents: `name`, `description`, `model`, `maxTurns`, `tools`, `disallowedTools`. Rules: `paths`. The lint parses exactly this subset and warns on anything else — a YAML edge case (`: ` inside a plain scalar) makes Claude Code load the skill with empty metadata and no error.

Skills:
```yaml
---
name: run
description: Execute an approved hodos task — implement, simplify, review, verify, finish.
disable-model-invocation: true
argument-hint: "<slug>"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---
```
`disable-model-invocation: true` on every skill **except** the call targets `task`, `campaign`, `rule`, which another skill invokes through the Skill tool and which therefore must be model-invocable (decision 0016). Those three omit the field and their `description` names the caller and states that the skill is not to be invoked on the model's own initiative. The lint enforces the list, not a blanket rule; adding a skill to it is a decision. `context: fork` is never used for review or verify. Every kernel that calls scripts or injects state with `` !`…` `` carries `allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)` — an unmatched permission aborts the invocation silently (`PLATFORM-NOTES.md` fact 14).

Agents:
```yaml
---
name: hodos-reviewer
description: Fresh-context reviewer for a hodos task; reads review-input.md, runs checks, writes review.md.
model: opus
maxTurns: 40
tools: Read, Grep, Glob, Bash, Write
---
```
Every agent name starts with `hodos-`. No `hooks`, `mcpServers`, `permissionMode` (plugin agents cannot declare them). `maxTurns` is a positive whole number and is the **only** place a dispatch bound can live: the Agent tool takes no such parameter, so a project cannot set one through `config.json` (decision 0044). A dispatch that reaches it comes back with no output at all, which the kernel reports as a stop rather than a verdict.

Project rules (written by `init` / `/hodos:rule`):
```yaml
---
paths:
  - "src/**/*.{ts,tsx}"
---
```
No `paths` means always loaded — allowed only when the rule genuinely applies to every file the project has.

## 9. Language

Engine: English. Project artifacts written by `init`: `config.language` — detected from existing docs and the developer's prompts, confirmed in the interview. Identifiers, commands, and skill descriptions are English everywhere.

## 10. Writing a rule — the three-question test

A rule earns its place only with evidence on all three:

1. **What evidence does the rule carry?** Grep before writing, for the shape the rule requires *and* the shape it would replace, and count both. Two forms of evidence are admissible, and the rule says which one it carries (decision 0050):
   - **Descriptive** — ≥2 precedents of the target → cite them by `file:line`. The rule writes down a convention the project already keeps.
   - **Prescriptive** — fewer than two precedents, plus an **explicit decision by the developer** that this is the target: a new stack, a replaced data layer, a shape the engine judges wrong and the developer agrees to move off. The rule states the target; a `## Migration` section counts the old shape and cites it.

   A precedent count is evidence that a convention **exists**, never that it is **good**. A project can arrive with a bad pattern in twenty files, and frequency is not a reason to load it into every matching turn — where the established shape is wrong, propose the target as a prescriptive rule, say the judgement is a judgement, and let the developer decide. Both shapes present in comparable numbers → drift: choose one form, count the other, open a migration node. Never "either X or Y", which is zero signal.

   The decision behind a prescriptive rule is the developer's and never the model's. No answer, no file.
2. **Would the model do it without the rule?** Check the defaults list (`DESIGN.md §7.2`) and the developer's observations. Yes → no rule.
3. **Is it mechanically checkable?** Yes → propose a hook, a lint rule, or a CI check. Prose is the fallback, not the default.

Form: lead with the rule; one concept per rule; a code example over a paragraph; the precedent and, where the rule came from a source, the URL; the incident if there was one. Rules describe the target state — no legacy clauses ("X for new code, Y for old" confuses the model). One fact lives in one file; cross-reference by link, never by restatement.

The old shape lives in a `## Migration` section, never in the rule's own sentence: how many places still carry it, cited by `file:line`, and that the target is written above. That keeps a prescriptive rule readable as one instruction while the gap it opens stays counted — a rule whose migration section never shrinks is a rule the project did not mean.

A rule's precedents live in a `## Precedents` block below its text, beside `## Migration` (decision **0078**). One entry per line: the citation, an em dash with a space on each side, and the text of that line trimmed and in backticks.

```markdown
## Precedents

- `src/lib/http.ts:17-19` — `if (!res.ok) throw ApiError.fromResponse(res);`
- `src/features/orders/api.ts:25` — ``const url = `/orders/${id}`;``
```

The anchor's wrapper is as many backticks as the line needs, so a line carrying one of its own is written in two. The check strips the wrapper and compares what is left, trimmed; a range entry keeps its whole span in the citation and anchors on the first line.

The block carries the rule's **evidence** — the ≥2 precedents question 1 asks for. A path the prose names to explain the rule stays in the prose, where the line-existence check already covers it.

The anchor is what turns rot into repair. `verify-citations.mjs` asserts the quoted text is still on the cited line and reports three ways: the text is there → nothing; the text is elsewhere in the file → the line it is now on, which `/hodos:status --prune` and `init --refresh` re-point the citation to; the text is nowhere in the file → the anchor is gone, and no re-point is offered. A range entry anchors on its **first** line and shifts with it. An anchor matching several lines is reported with the count and re-pointed to none of them: choosing one is the plausible line number `skills/status/references/prune.md` exists to refuse.

The same pass checks the **bare paths** a rule or the map names — not citations, and most of what the map is made of. A code span naming a directory (it ends in `/`) or a file (it carries an extension) has to exist under the project root; `lint --project` reports the ones that do not. A placeholder (`<name>`, `{slug}`), a glob, a URL, a command, a module specifier with no extension, a path relative to the file that names it, and anything inside a fenced example are not paths this check reads, and neither is a bare filename, which resolves against whatever directory the reader is standing in. A detector that fires on a correct map is one the developer learns to skim.

Every new rule is registered where it is discovered: the CLAUDE.md map lists the rules directory; `status` lints that every rule's precedents still resolve and that every anchor still sits where its entry says.

## 11. Writing a skill or reference

- Kernel: what it owns, the phase table, the invariants, where each phase's reference lives, the completion criterion of the whole. Nothing else.
- Reference: the procedure for one phase, its inputs and outputs by path, its completion criterion, its anti-pattern, its loop bound. It is read on entering the phase and never before — a read made earlier does not satisfy it.
- Fail-closed: a kernel that cannot read its reference stops and reports. It does not reconstruct the mechanism from memory.
- Composition: a skill another skill invokes is model-invocable, and no skill reproduces another skill's procedure inline (decision 0016). Compose it with *Call the Skill tool with "<name>"* — never a bare `/name` for the model to interpret. A gated skill (`disable-model-invocation: true`) cannot be invoked this way (`PLATFORM-NOTES.md` facts 1 and 26): its caller prints the handoff line the developer types.
- Dependencies on `init`: **hard** (verify needs the recipe) → an explicit one-liner "run `/hodos:init` first" at the point of failure; **soft** (research prefers a code index) → vague prose, degrade gracefully. Do not cargo-cult the setup pointer into files where it is not load-bearing.
- Register the skill in `COMPONENTS.md` and in the `status` map; a skill the router does not know about is never proposed.

## 12. Writing an adapter or a source

Adapter `adapters/<role>/<tool>.md` (≤30 lines): the role, one line per operation `operation: mcp__server__tool` with the minimal argument shape, and the gotchas that cost tokens or break flows. No prose about what the tool is.

`lint.mjs` checks the shape of `FORMATS.md §13`: `role:` matching the directory, `server:` under it, every operation's `mcp__<server>__` prefix matching that `server:`, and at least one gotcha. A project's own adapter lives at `.claude/hodos/adapters/<role>/<tool>.md`, is checked by `--project`, and additionally has to name a server the project's `.mcp.json` declares. Every tool id comes from a live schema — an id written from memory turns an explicit `Skip` into a failed call, which is the one outcome worse than having no adapter.

Source `sources/<stack>.md`: one line per pointer — `URL — what it covers — why authoritative`. Pointers only; content is fetched at init.

## 13. Evidence policy for changes

- A wording change to a skill, reference, agent prompt, or engine rule is accepted only with evidence: an eval result, or a reproducible scenario showing the behavior before and after.
- Restructuring to "comply" with a style guide is not evidence.
- Lint must be green. New caps or new fields go through `DESIGN.md` first.
- Every hook change names its incident in the header comment.

## 14. Checklist before opening a PR

- [ ] No-op test run on every changed sentence; deleted rather than trimmed
- [ ] Positive form; no nuance clauses
- [ ] Leading words from the glossary; no new coinages without a glossary entry
- [ ] Each step has a completion criterion and a named anti-pattern
- [ ] Invariants in the first 40 lines; references one level deep
- [ ] Within caps; frontmatter in the allowed subset
- [ ] Citations resolve (`node scripts/lint.mjs`)
- [ ] Evidence attached for behavior claims
