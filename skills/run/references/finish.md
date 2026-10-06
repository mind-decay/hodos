# finish — the fold, the report, the proposals, the deletion

1. Inputs and outputs · 2. What the ledger says happened · 3. The fold into `plan.md#Outcome` · 3a. The pins · 4. The campaign node · 5. Rule and hook proposals · 5a. The tracker link · 5b. Anchors this branch moved · 5c. The one offer · 6. The report · 7. The ledger line · 8a. A spike ends here · 9. Completion · 10. Anti-pattern

## 1. Inputs and outputs

**Reads.** `plan.md`; `ledger.md` and `state.json`; `review.md` and `verify.md` as the last loop left them — including `verify.md`'s `## Claim feedback` and its `pass · pin` rows, both copied out in §3 before that section's own deletion step, printed by §6 and written by §3a; `env.md` where a layer of the environment would not come up; `config.conventions`; `.claude/rules/*.md` and what `verify-citations.mjs` prints over them (§5b).

**Writes.** `plan.md`, one appended `## Outcome` section. `verify.recipes[<ui>].checks[]` in the project's own `config.json`, on the developer's approval and nowhere else (§3a). The transient files, deleted. One ledger line. The report, in chat. For a campaign node whose map is in this repository, one commit holding the map alone (§4). Nothing in the code, and nothing in `.claude/rules/` except through the `rule` skill or as a precedent re-pointed on the developer's approval (§5b).

**Entered** at phase `finish`: the ledger holds `Verify <k>: PASS`, or a `Breaker: … — accept`, or, on an `inert` task, `Review <k>: ACCEPT`, whose verify fields read as `skills/task/references/inert.md` §6 says (decision **0183**).

**Nothing is fixed here.** A minor still open at this point is reported open. Fixing it now is an unreviewed, unverified commit made after the loops that would have judged it have closed, and the report would be describing a diff nobody read.

## 2. What the ledger says happened

One read of `ledger.md` supplies every line of the report. Nothing below is recalled from the session — a task that was compacted twice has the same report as one that was not.

| What the report names | Where it comes from |
|---|---|
| what was done | `Task <n>: done (<sha>)`, one line per task, and the plan's task titles |
| the simplify pass | `Simplify: done (<sha>, net -<n>)` |
| gaps | every `Gap:` line, in order |
| rulings | every `Ruling:` line |
| upgrades | every `Upgrade:` line |
| the loops | `Review <k>:`, `Verify <k>:`, `Fix <k>:`, `Breaker:` |
| open minors | the `minor` rows of `review.md` the fix pass did not close |

The `hodos:` markers the simplify pass wrote are in the code, not the ledger: `git diff <base>..HEAD -U0 | grep '^+.*hodos:'`, `<base>` being `state.base`. This is an extraction, not a reading: it returns the marker lines and nothing around them, and the invariant it must not break is that this session never judges the diff.

## 3. The fold into `plan.md#Outcome`

Read `review.md` and `verify.md` — the headers carry the counts, the tables carry what is still open. Append one `## Outcome` section to `plan.md`, in the shape of `FORMATS.md §5`:

```markdown
## Outcome
Review: <verdict> after <n> fix passes (<b> blocker / <m> major fixed / <mi> minor open)
Verify: <verdict> — <n> claims, <s> skipped, <b>/<m>/<mi> by severity, flaky <n>, pre-existing <n>; evidence/<file>, <command claim> <result>
Open minors: <sev> <file:line> <item> — <finding>   (or: —)
Environment: <layer> <still red — the cause env.md named | left down — access declined>, <skip> of <claims> claims skipped   (only when a layer was not up at the preflight)
Gaps: <n> — see ledger
```

The numbers are the two headers' own, copied rather than recomputed: `review.md`'s `blockers/majors/minors` and `verify.md`'s `claims / pass / fail / flaky / pre-existing / skip`. The severities come off the `fail` rows the same way — each was read out of a table rather than chosen (decision **0108**) — and a number that disagrees with its file is a number this session invented. The **pins** are not in this section and are not lost by it: what records a pin is the `checks[]` line §3a wrote into the committed config, which outlives the task directory by design, and §6 names it in the chat where the developer is looking.

Copy `verify.md`'s `## Claim feedback` out first — three lines, verbatim — because §6 prints them and the next paragraph is where the file they are in stops existing (decision **0092**). Copy the `pass · pin` rows out with them, route and predicate and value each: §3a is what puts them to the developer, and it runs before the deletion for the same reason.

Then delete the transient files of `DESIGN.md §5.1` — `review.md`, `review.partial.md`, `verify.md`, `env.md`, `review-input.md`, `plan-review.md`, `plan-review.partial.md`, `stop-count` — from the task directory. `evidence/` stays: the Outcome cites it. This deletion needs no confirmation; those files have just been folded, and `plan.md` is where they now live.

## 3a. The pins

A `pass · pin` row is a claim this run **proved** and the verifier thought worth keeping (decision **0094**). It becomes an assertion the project runs from now on, or it does not — and that is the developer's, because `config.json` is the committed declaration a team is verified against.

`AskUserQuestion`, once, whatever the number of marked rows: name each one's route, its predicate and the value it returned, and say what the write does — a later `ui` run checks it, and a check that stops holding is a `fail` row with source *pin* rather than a silence. Two answers: **pin them** — or **pin these**, where the developer names a subset — and **none**.

On yes, one edit per accepted row, appended to `checks[]` of the `browser` recipe **in the config the recipe was read from** — a subproject's own file where the recipe was that subproject's (§2's projects), never the root's by default:

```json
{ "route": "/orders", "evaluate": "() => document.querySelector('[role=\"status\"]').textContent.trim()", "expect": "Total 3" }
```

Then prove the file still loads:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs check
```

An **error** means the edit malformed the file: revert it, report that, and pin nothing — a config that does not load takes the next task's whole run with it. A **warning** naming the predicate is one of three: the row reached for a class or an id (decision **0118**), it walked to an element instead of querying it (**0129**), or `evaluate` is a bare expression where the adapter runs a function (**0130**). The config loads in each case — the run wraps a bare expression — and the report carries the warning so the developer can replace the predicate or delete the line. The edit is left in the working tree for the developer's own commit, like everything else this phase leaves; §6 names what was written.

A row marked `pin` that does not carry all three of route, predicate and value (`FORMATS.md §10`) is reported in §6 and written nowhere. Nothing here is fixed and nothing is guessed: a predicate this phase writes from its own reading of the page is an assertion nobody proved.

## 4. The campaign node

`state.campaign` is `null` for a standalone task, and this section is skipped.

For a campaign node — `state.campaign` is `<campaign>/<node>` — close the node on the map:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/campaigns.mjs node-done <campaign> <node> --sha <HEAD: the task's last commit>
```

It sets the node `done`, points its `ref:` at that sha, and re-measures the campaign's done-metrics — the one place a campaign's numbers move on their own. Report the metric that moved and by how much: that number is what the campaign is for, and the node is the evidence it moved. A row whose ` · repo:` names a repository nothing here resolves keeps its previous number with the date it was true on and says `no repository named <name> — known: <the names it does know>`: report that row as unmeasured rather than as a move, carry the known names into the report because they are what the correction is made from, and the close itself is unaffected (decision **0139**).

**Where the map lives decides who commits it.** A map in *this* repository is committed by this phase, right after `node-done`: one commit in `config.conventions.commit` holding the map alone, whose subject names the node closed. The sha `node-done` records is the task's last commit, the one this commit sits on, because a commit cannot carry its own sha. A node closed in a file nobody committed is closed for one machine. A map in **another** repository — the home repository of a cross-repository campaign (`DESIGN.md §9`) — is written by `node-done`, which then prints that repository, the file and what to run there: the `git -C … add`, and the `git -C … commit` with an unscoped `chore: …` subject where that repository's `conventions.commit` is `conventional` or unstated, or its convention named where it is not (decisions **0174**, **0181**). Carry that line into the report as it came and run nothing from it: this phase does not commit in a repository the task was not opened in, whatever the state of its tree, and no config key makes it (decisions **0137**, **0090**).

A `node-done` that fails — no map, or a node the map does not carry — is one reported line and the finish continues. A finished task is finished whether or not its index could be updated. Which node comes next is not this phase's to pick: the `Next:` that `land.md` prints after the landing proposes `/hodos:campaign <campaign>`, whose frontier, claim and question decide it (decision **0191**).

## 5. Rule and hook proposals

A rule proposal is earned by evidence on two questions, both answered in the report:

1. **Does a finding trace to a missing convention?** A finding whose `Item` column names a project rule is a rule that already exists and was broken. A finding whose item is a `defaults.md` entry or a behavioral code `L1`..`L9` is not a convention gap — it is what a model writes by default, and `AUTHORING.md §10` question 2 refuses a rule for it.
2. **How does the code stand to it?** `Grep` **twice** — once for the target shape the rule would require, once for the shape the finding flagged — and cite every occurrence by `file:line`. The finding's own location is one of the second count. The two counts decide what kind of proposal this is (decision 0050):

| target | flagged shape | What the report proposes |
|---|---|---|
| ≥2 | any | a **rule proposal** — the project already keeps this convention and has not written it down |
| 0–1 | ≥2 | a **convention proposal** — the code does this nowhere; what is proposed is a target, so accepting it is a decision rather than a confirmation, and the report says so in those words |
| 0–1 | 0–1 | neither: **an observation line** in the report and in `## Outcome`, and nothing else |

Both counts go in the report beside the proposal, because they are what the developer is answering about. A rule proposal cites its precedents; a convention proposal cites the places that would have to move.

On acceptance of either kind, invoke the `rule` skill through the Skill tool with the finding, both counts and which kind it is — it runs its own test again and writes the file, descriptive or prescriptive. `.claude/rules/` is never written from here by hand.

One occurrence of both shapes is one incident, not a convention, and a rule written from one is a rule the next task argues with.

A **hook proposal** is the same shape for a different signal: one project rule broken ≥2 times inside this task's commits, where the check is mechanical (`AUTHORING.md §10` question 3). Propose the hook, name the rule and the occurrences, and leave the writing to the developer.

## 5a. The tracker link

`config.adapters.tracker` names an adapter → `tracker.link` once, joining the issue to this task's work. The issue id comes from the branch name or from the ticket key `brief.md` kept as the first line of the prompt, and from nowhere else: an id from a search is a guess about which issue was meant, applied to someone's tracker.

Writing into the tracker is outward-facing, so it is a mandatory stop under every autonomy setting (`DESIGN.md §4.4`): `AskUserQuestion` with the issue id, where it came from, and the link about to be made. Declined, or `null`, or neither the branch nor the brief carries an id → `Skip: tracker unavailable` in the report, naming which of the three it was. Creating, transitioning, commenting on or closing an issue stays the developer's — v1 links, and nothing else.

## 5b. Anchors this branch moved

Run `node ${CLAUDE_PLUGIN_ROOT}/scripts/verify-citations.mjs .claude/rules/*.md`. A precedent whose anchor moved **in a file this branch changed** is this task's to re-point (decision **0180**): the change that moved the line carries its repair, the way it carries the tests it updates, so the merge leaves every rule resolvable. `AskUserQuestion` once, naming each rule, its `file:line` and the line the anchor is on now. On yes, rewrite each citation to the line the anchor is on now, a range's end shifting by the same delta, and move every mention of that `path:line` in the rule's prose with it; leave the edit for the developer's single `docs(rules)` commit on the branch, before the merge; §6 names it. A finding in a file the branch did not change is rot this task did not cause, and it stays with `/hodos:status --prune` — §5c's offer.

## 5c. The one offer

The second channel of decision **0081**, under the same contract as the digest's: **at most one**, computed from files, and nothing at all when no precondition holds. A phase boundary a developer reaches with everything in order costs them a line they have to read and dismiss, which is the failure principle 16 names.

Run `state-digest.mjs` after §5b, so an anchor it has just re-pointed is not counted as rot, and read its offer line, if it printed one. Where it did, carry it here in one sentence, in the register of this report — a fact and the command, never an instruction. Where it did not, this section produces nothing, and the report does not mention that it produced nothing.

The offer this boundary most often carries is `prune`: a finding that named a rule, and a layer whose citations have started to rot, arrive in the same session. It is still the developer's call and still one line.

## 6. The report

To chat, in this order, every section present even when empty:

```
<slug> — <n> tasks, <n> commits, branch <name>
Review: <verdict> after <n> fix passes · Verify: <verdict>, <n> claims, <s> skipped
Verify failures by severity: <b> blocker / <m> major / <mi> minor · flaky <n> · pre-existing <n>   (or: —)
Done: <one line per task, from the plan's titles>
Simplified: <n> lines shorter · limits marked in code: <hodos: lines, or none>
Decisions the plan missed (<n>): <each Gap: line>
Decided without asking (<n>): <each Ruling: line>
Upgrades (<n>): <each Upgrade: line>
Pinned: <route> — <predicate> = <value>, one line each, and any check warning against it (or: —)
Rule citations moved: <rule> <file:line> → :<line>, one per line, for the developer's docs(rules) commit (or: —)
Verifier on the plan's claims: <verify.md's three lines, verbatim>
Tracker: <the link written, or Skip: tracker unavailable>
Fixed after the last review: <the verify fix passes, which no reviewer saw>
Open minors (<n>): <each>
Proposals: <rule or convention proposals with both counts, hook proposals, observations — or none>
Next: printed by land.md after the landing — the next of the option taken
```

`Verifier on the plan's claims` is copied from `verify.md`'s `## Claim feedback`, verbatim and unranked (decision **0092**): the verifier's reading of the claim *set* — unfalsifiable, redundant, absent — which moved no row and no verdict and would otherwise go with the file this phase deletes. It is not a finding and gets no proposal of its own: what it can earn is a claim in the next plan, and §5's two `Grep` counts are what turn a repeat into a rule.

`Verify failures by severity` is copied from the rows, not recounted from an impression: the word on each `fail` row came out of a table (decisions **0097**, **0108**), and a `pre-existing` row is a defect this task **found and did not introduce**, which is the one line that says so before `verify.md` is deleted (decision **0119**). `Pinned` names what §3a wrote, or `—` where the developer declined or nothing was marked.

`Fixed after the last review` is not optional: a verify fix is committed after the review that would have judged it, by design (`DESIGN.md §4.5`), and this line is the only place the developer sees it.

An empty section is written as `—`. A section left out because it was empty reads, to the developer, as a section nobody checked. The verdict is the second line because whether the work passed is what the report is read for (decision **0194**). The report's last line is not printed here: `land.md` asks the landing first, with the exact commands in each option, and prints `Next:` after it (decision **0197**). It names one step, `/hodos:campaign <campaign>` for a campaign node, so a go-ahead in words reaches the map, and `/hodos:task <description>` otherwise (decision **0191**).

## 7. The ledger line

After the report and after any accepted proposal has been written:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs add "Finish: report delivered"
```

That one line moves the phase to `done`, appends this task's summary to `.claude/hodos/history.jsonl` — counts, the router override, the gap texts and the token usage of the sessions that worked it — and deletes the task's session pointers and `active`. It is written once, and only after the report is in the chat: it is the record that the report was delivered. Then read `${CLAUDE_PLUGIN_ROOT}/skills/run/references/land.md` and run it: the landing, the task directory and the `Next:` line are its.

## 8a. A spike ends here, and merges nothing

A task of type `spike` reaches this phase from `approved` — there is no review and no verify to have passed, because there are no tasks (decision **0084**). Sections 3, 4, 5a and 5c run as they do for any task; sections 2 and 6 read differently:

1. **The exit is the outcome.** `## Outcome` carries the question, the answer, and which of the two exits the plan named was taken: the scratch branch **deleted**, or a **follow-up task opened** with its slug. One of the two, named — "we learned a lot" is not an exit.
2. `ledger.mjs add "Ruling: spike <question, in five words> — <the answer>, <the exit taken: branch deleted, or follow-up <slug> opened> — <what it costs if the answer is wrong>"` before the `Finish` line, so the answer **and its exit** survive the task directory. It is the only durable record a spike leaves besides the commits it did not make, and `## Outcome` — where step 1 also names the exit — lives inside the directory `land.md §4` offers to delete. The exit rides in the answer segment: the grammar is closed at three (`FORMATS.md §6`, decision **0084**), so this form adds no fourth.
3. **The branch:** `land.md` asks to delete it, with the command, and its `Next:` names what follows. That is the `delete <branch>` option where the exit deleted it, and `Next: /hodos:task <the follow-up>` where the exit opened one.
4. A rule proposal from a spike is possible and rare: it needs the same two counts as any other (§5), and "we tried X and it did not work" is an observation line, not a convention.

## 9. Completion

`Finish: report delivered` in the ledger, the report in the chat, `## Outcome` in `plan.md`, a campaign node's map committed where it lives in this repository, every accepted pin in the config with `config.mjs check` run after it, every accepted re-point in its rule, and the transient files gone. Then `land.md`.

## 10. Anti-pattern

"Great, all done!" before the report. The report *is* the deliverable of this phase.

A proposal from one occurrence of everything. Two is the threshold on one side or the other, `Grep` is the evidence, and both counts go in the report where the developer can check them.

Offering a convention proposal as though the code already agreed with it. It is a target the code contradicts, and the developer answering it is deciding, not confirming.

Fixing an open minor here, or committing code. The loops that judge code have closed, and the one commit this phase makes is a map in this repository (§4).

Writing a pin the developer was not asked about, or one whose row does not carry its own value. The config is the team's declaration, and a pin is an assertion that outlives this task.
