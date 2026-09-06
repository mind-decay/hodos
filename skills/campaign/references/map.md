# Campaign map — the procedure

Sections: 1 inputs and outputs · 2 grilling · 3 writing the map · 4 the frontier · 5 proposing one node · 6 starting it · 7 advance · 8 decision and research nodes · 8a the lines a close leaves behind · 9 closing · completion · anti-pattern · bound.

## 1. Inputs and outputs

In: the description or the slug from the kernel's step 1, `config.mjs find`, and the map list from `campaigns.mjs find`.

Out: `.claude/hodos/campaigns/<slug>.md` in the shape of `FORMATS.md §11` — tracked, committed with the node that changes it. Nothing else is written by this skill: a node's brief, research and plan belong to the `task` session the map hands off to.

The slug is kebab-case, derived from the goal and confirmed with the developer: it is the name every node line, every branch and every `status` line will carry.

## 2. Grilling

Campaign-level grilling, in one pass, with the developer answering. Each part below is asked, and the answer is read back before the next.

**Goal.** One sentence: the state the codebase is in when this is over. "Redux is gone from `src/features`" is a goal; "improve state management" is a wish.

**Done-metrics.** Two to four, each a shell command that prints one number today. Run each one in this session before it goes into the map — a metric nobody can run is a wish with a backtick around it. Each row carries the number it prints now (`Start`), the number that means done (`Target`), and the same current value with today's date. A metric whose target is not a number the command can print is rewritten until it is. **A metric counts only what this campaign's own nodes can move**: read what the command matches today, and narrow it until every hit is work the map owns — a `target 0` over a pattern that also catches code the campaign has no quarrel with is a number the campaign can never reach, and it will be discovered at the advance run instead of here.

**Architecture direction — `D1..Dn`.** The decisions binding every node: what replaces what, which layer owns which state, what the migration shape is (expand–contract, per-feature, strangler). Each row is the decision and why. A node may not contradict a `D`; a node that wants to comes back here.

**Decomposition.** Nodes, each a mergeable unit — a branch that could be reviewed and merged on its own. Tracer bullets where the shape is new (each node ends with something running end to end); expand–contract where an existing shape is being replaced (add the new path, move callers, delete the old). Three nodes is the floor: fewer than three means this is a task, and the router said otherwise.

**The fog.** Everything the campaign will have to face that cannot be stated precisely now. Each fog item is one line naming the question, not a plan for answering it. The fog list is where honesty about a campaign lives — a map with no fog is a map that has not been thought about.

**Waits.** What the campaign needs from someone outside it, from whom, and since when. A campaign that waits for nothing has an empty `## Waits` section — a line reading `none` is parsed as a wait and printed as one by every `frontier` from then on.

Ask for approval of all six with `AskUserQuestion` before anything is written. The developer's answer is the map.

## 3. Writing the map

Write the file at `.claude/hodos/campaigns/<slug>.md` exactly in the shape of `FORMATS.md §11`: the `# ` line, which is §2's goal in one sentence and the only place it lands; the header line (`Status: active`, `Owners:`, `Tracker:` where there is one); `## Done-metrics`, `## Decisions`, `## Nodes`, `## Waits`.

Node lines carry every field of the grammar, with `—` for the ones that are empty:

```
- [ready] orders-list — orders list to TanStack · deps: — · owner: — · branch: — · ref: — · metric: —
```

A dependency is another node's name; a node with no dependency is `deps: —`. A blocked node carries ` · by: <what it waits for>` after `metric:`. Fog items are nodes with status `fog` whose gist is the question.

A `|` inside a metric command is escaped as `\|`, because the command lives in a markdown table cell.

Then run `node ${CLAUDE_PLUGIN_ROOT}/scripts/campaigns.mjs measure <slug>`. Every cell it prints must match the number you measured by hand in §2. A cell that comes back different, or `not measured`, means the command did not survive the table — fix the escaping and run it again. This is the step that catches a metric the map cannot actually run, and it costs one command.

## 4. The frontier

`node ${CLAUDE_PLUGIN_ROOT}/scripts/campaigns.mjs frontier <slug>`.

It prints the counts, then one line per node: `ready`, `held`, `blocked`, `fog`, `active`, and the waits. **A `held` line is a disagreement between a status and a dependency** — the node says ready, the dependency is not done. Read it out and fix the map rather than proposing the node: either the dependency is genuinely open, and the node is `blocked`, or the dependency is finished and its own line is stale.

## 5. Proposing one node

One node, with the reason it is first, from the ready list. The reason is one of: it is the tracer bullet the rest hangs off, it unblocks the most nodes, it is the smallest thing that moves a done-metric, or the developer asked for it.

Put it with `AskUserQuestion`: the proposed node, the two next-best from the ready list, and — where the ready list is thin — pulling one item out of the fog. On any answer but the proposal, the chosen node is the one that starts.

## 6. Starting the node

1. The branch name comes from `config.conventions.branch` with the node's name substituted; the owner from `git config user.name` as `@<name>`, confirmed in the same question as the node.
2. Call the Skill tool with `task` and the argument `<slug>/<node>`. That session routes the node, opens the task, and prints the slug `ledger.mjs init` gave it — which is the node's name unless the project already had a task by that name.
3. `node ${CLAUDE_PLUGIN_ROOT}/scripts/campaigns.mjs claim <slug> <node> <owner> <branch> --ref task:<the slug from step 2>`.
4. Commit the map: `git add .claude/hodos/campaigns/<slug>.md`, one commit whose subject names the node claimed. A claim nobody pushed is a claim nobody can see, and races are resolved socially.

The `task` session ends on its own handoff (`/clear`, `/hodos:run <slug>`). This session ends there too: one node per session.

## 7. Advance

`campaigns.mjs measure <slug>`, then `campaigns.mjs frontier <slug>`. Read out: what moved since the last measurement, what is active and who has it, what is blocked and by what, what is held, what the waits are.

**Frontier not empty** → §5, then §6.

**Frontier empty** → name the wait: which node is blocked, on what, from whom, and since when, taken from the blocked nodes' `by:` and the `## Waits` lines. Then put exactly three options with `AskUserQuestion`:

- **Nudge** — the external party is asked again; the wait's date is updated in the map.
- **Pull from the fog** — one fog item is stated precisely enough to become a node; it is cut into one node, not the whole fog list. The precise statement goes into a new `D` row and the node's status moves with `campaigns.mjs set <slug> <node> --status ready`; a node's gist has no verb, so the `D` row is where the sentence lives. When the pull empties the fog, say so — `§2` calls a map with no fog a map nobody has thought about, and the question that survived the cut is the next fog item.
- **Out of scope** — the blocked node becomes `dropped` with the `D` row that says why.

"Nothing to do" is not one of them. A campaign whose frontier is empty and whose waits are all nudged is a campaign the developer should know is stalled, which is what saying it does.

## 8. Decision and research nodes

A node whose output is an answer rather than a diff resolves in this session: the question is grilled or researched here, the answer becomes a new `D` row appended to `## Decisions`, and the node goes `[done]` through `campaigns.mjs node-done <slug> <node> --sha <sha>` with the sha of the commit that carried the map change. No task is opened and no branch is created — the artifact is the `D` row.

This is the one exception to *one node per session*: resolving a decision node leaves the frontier different, so the session continues into §4.

## 8a. The lines a close leaves behind

`node-done` closes one node and then names the others whose `deps:` or `by:` still mention it:

```
node-done: focus-and-keyboard, a11y-guard still name a11y-audit in deps: or by: — 2 lines may be stale
```

It changes none of them, because a `[blocked]` a person wrote outranks a dependency list that has just been satisfied. Read each named line and answer it with `campaigns.mjs set`:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/campaigns.mjs set <slug> <node> --by "<what is still open>"
node ${CLAUDE_PLUGIN_ROOT}/scripts/campaigns.mjs set <slug> <node> --status ready --by —
```

A node still waiting on something else keeps its status and loses only the finished name from its `by:`. A node whose last reason is gone becomes `ready`. Either way the write goes through the script: `set` exists so that correcting a map is never a hand edit (decision 0056).

## 9. Closing

Every node `done` or `dropped`, every metric at its target, and the developer confirms → set `Status: done` in the header and commit. The file stays for the team; deleting it is the developer's own action, never this skill's.

## Completion

The map on disk in the shape of `FORMATS.md §11`, its metrics measured by `campaigns.mjs measure` in this session, its frontier printed, and the session ended on one of: a node claimed and handed to `task`, a wait named with its owner and three options put, a decision node resolved into a `D` row, or the campaign closed.

## Anti-pattern

Cutting the fog into nodes so the map looks finished. A node line that retells the task's plan — the map is an index, and the plan is the task's own file. Proposing a node the frontier reported as `held`. Writing the map before the developer has seen the metrics. Editing a node line by hand: `campaigns.mjs set` owns those lines, and a hand-edited one is machine state written by hand. Leaving a `by:` that names a node already done — `node-done` printed the list, and §8a is what to do with it.

## Bound

One map per session. Grilling is one pass with one approval round; a second round means the goal is not agreed, and that is the thing to say. Measuring is one `measure` call per advance, and a metric that times out is reported, never retried in a loop.
