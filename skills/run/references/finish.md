# finish — the fold, the report, the proposals, the deletion

1. Inputs and outputs · 2. What the ledger says happened · 3. The fold into `plan.md#Outcome` · 4. The campaign node · 5. Rule and hook proposals · 5a. The tracker link · 5b. The one offer · 6. The report · 7. The ledger line · 8. The task directory · 8a. A spike ends here · 9. Completion · 10. Anti-pattern

## 1. Inputs and outputs

**Reads.** `plan.md`; `ledger.md` and `state.json`; `review.md` and `verify.md` as the last loop left them, and `env.md` where a layer of the environment would not come up; `config.conventions`.

**Writes.** `plan.md`, one appended `## Outcome` section. The transient files, deleted. One ledger line. The report, in chat. Nothing in the code, and nothing in `.claude/rules/` except through the `rule` skill.

**Entered** at phase `finish`: the ledger holds `Verify <k>: PASS`, or a `Breaker: … — accept`.

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

The `hodos:` markers the simplify pass wrote are in the code, not the ledger:

```
git diff <base>..HEAD -U0 | grep '^+.*hodos:'
```

`<base>` is `state.base`. This is an extraction, not a reading: it returns the marker lines and nothing around them, and the invariant it must not break is that this session never judges the diff.

## 3. The fold into `plan.md#Outcome`

Read `review.md` and `verify.md` — the headers carry the counts, the tables carry what is still open. Append one `## Outcome` section to `plan.md`, in the shape of `FORMATS.md §5`:

```markdown
## Outcome
Review: <verdict> after <n> fix passes (<b> blocker / <m> major fixed / <mi> minor open)
Verify: <verdict> — <n> claims, <s> skipped; evidence/<file>, <command claim> <result>
Open minors: <sev> <file:line> <item> — <finding>   (or: —)
Environment: <layer> <still red — the cause env.md named | left down — access declined>, <skip> of <claims> claims skipped   (only when a layer was not up at the preflight)
Gaps: <n> — see ledger
```

The numbers are the two headers' own, copied rather than recomputed: `review.md`'s `blockers/majors/minors` and `verify.md`'s `claims / pass / fail / skip`. A number that disagrees with its file is a number this session invented.

Then delete the transient files of `DESIGN.md §5.1` — `review.md`, `verify.md`, `env.md`, `review-input.md`, `plan-review.md`, `stop-count` — from the task directory. `evidence/` stays: the Outcome cites it. This deletion needs no confirmation; those files have just been folded, and `plan.md` is where they now live.

## 4. The campaign node

`state.campaign` is `null` for a standalone task, and this section is skipped.

For a campaign node — `state.campaign` is `<campaign>/<node>` — close the node on the map:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/campaigns.mjs node-done <campaign> <node> --sha <the sha of the finish commit>
```

It sets the node `done`, points its `ref:` at that sha, and re-measures the campaign's done-metrics — the one place a campaign's numbers move on their own. Report the metric that moved and by how much: that number is what the campaign is for, and the node is the evidence it moved.

Then commit the map with the finish commit. A node closed in a file nobody pushed is closed for one machine.

A `node-done` that fails — no map, a node the map does not carry, a map that reaches into another repository — is one reported line and the finish continues. A finished task is finished whether or not its index could be updated.

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

## 5b. The one offer

The second channel of decision **0081**, under the same contract as the digest's: **at most one**, computed from files, and nothing at all when no precondition holds. A phase boundary a developer reaches with everything in order costs them a line they have to read and dismiss, which is the failure principle 16 names.

Run `state-digest.mjs` and read its offer line, if it printed one. Where it did, carry it here in one sentence, in the register of this report — a fact and the command, never an instruction. Where it did not, this section produces nothing, and the report does not mention that it produced nothing.

The offer this boundary most often carries is `prune`: a finding that named a rule, and a layer whose citations have started to rot, arrive in the same session. It is still the developer's call and still one line.

## 6. The report

To chat, in this order, every section present even when empty:

```
<slug> — <n> tasks, <n> commits, branch <name>
Done: <one line per task, from the plan's titles>
Simplify: net -<n> lines · markers: <hodos: lines, or none>
Gaps (<n>): <each Gap: line>
Rulings (<n>): <each Ruling: line>
Upgrades (<n>): <each Upgrade: line>
Review: <verdict> after <n> fix passes · Verify: <verdict>, <n> claims, <s> skipped
Tracker: <the link written, or Skip: tracker unavailable>
Fixed after the last review: <the verify fix passes, which no reviewer saw>
Open minors (<n>): <each>
Proposals: <rule or convention proposals with both counts, hook proposals, observations — or none>
```

`Fixed after the last review` is not optional: a verify fix is committed after the review that would have judged it, by design (`DESIGN.md §4.5`), and this line is the only place the developer sees it.

An empty section is written as `—`. A section left out because it was empty reads, to the developer, as a section nobody checked.

## 7. The ledger line

After the report and after any accepted proposal has been written:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs add "Finish: report delivered"
```

That one line moves the phase to `done`, appends this task's summary to `.claude/hodos/history.jsonl` — counts, the router override, the gap texts and the token usage of the sessions that worked it — and deletes the task's session pointers and `active`. It is written once, and only after the report is in the chat: it is the record that the report was delivered.

## 8. The task directory

The directory is deleted **only on the developer's confirmation** — it is a destructive action, and `DESIGN.md §4.4` stops on those under every autonomy setting. `AskUserQuestion`: delete `.claude/hodos/tasks/<slug>/`, or keep it. Name what goes with it: the plan and its Outcome, the ledger, the evidence. What survives either way is `history.jsonl` and the commits.

A session with no `AskUserQuestion` — a headless run — asks in chat, deletes nothing, and says the directory is kept for want of an answer. The branch stays in both cases; push and merge are the developer's.

## 8a. A spike ends here, and merges nothing

A task of type `spike` reaches this phase from `approved` — there is no review and no verify to have passed, because there are no tasks (decision **0084**). Sections 3, 4, 5a and 5b run as they do for any task; sections 2 and 6 read differently:

1. **The exit is the outcome.** `## Outcome` carries the question, the answer, and which of the two exits the plan named was taken: the scratch branch **deleted**, or a **follow-up task opened** with its slug. One of the two, named — "we learned a lot" is not an exit.
2. `ledger.mjs add "Ruling: spike <question, in five words> — <the answer>, <the exit taken: branch deleted, or follow-up <slug> opened> — <what it costs if the answer is wrong>"` before the `Finish` line, so the answer **and its exit** survive the task directory. It is the only durable record a spike leaves besides the commits it did not make, and `## Outcome` — where step 1 also names the exit — lives inside the directory §8 offers to delete. The exit rides in the answer segment: the grammar is closed at three (`FORMATS.md §6`, decision **0084**), so this form adds no fourth.
3. **The branch.** Deleting it is the developer's, like every other git action here: name it, say the answer is recorded in the ruling and in `## Outcome`, and leave the command to them.
4. A rule proposal from a spike is possible and rare: it needs the same two counts as any other (§5), and "we tried X and it did not work" is an observation line, not a convention.

## 9. Completion

`Finish: report delivered` in the ledger, the report in the chat, `## Outcome` in `plan.md`, the transient files gone, and the task directory deleted or explicitly kept.

## 10. Anti-pattern

"Great, all done!" before the report. The report *is* the deliverable of this phase.

A proposal from one occurrence of everything. Two is the threshold on one side or the other, `Grep` is the evidence, and both counts go in the report where the developer can check them.

Offering a convention proposal as though the code already agreed with it. It is a target the code contradicts, and the developer answering it is deciding, not confirming.

Fixing an open minor here, or committing anything. The loops that judge code have closed.

Deleting the task directory because the task is finished. Finished is why it is offered, not why it is done.
