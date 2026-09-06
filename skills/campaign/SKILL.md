---
name: campaign
description: Create or advance a hodos campaign map — work bigger than one mergeable unit. The developer runs it as /hodos:campaign <idea> to open one and /hodos:campaign <slug> to advance it; the task skill invokes it on a campaign verdict. A map is the developer's decision, so it is not invoked on your own reading of a request.
argument-hint: "<idea> | <slug>"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

!`node ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs`

# campaign

Hold work that is bigger than one mergeable unit, longer than one session, or shared by a team, in a map the team can read: the goal, the numbers that say it is done, the decisions binding every node, the nodes themselves, and what is being waited for. The procedure is read on entering the phase from `${CLAUDE_PLUGIN_ROOT}/skills/campaign/references/map.md` — a reference that cannot be read stops the run with the reason, and is never reconstructed from memory.

## Invariants

- **A node is one mergeable unit** — one branch, one merge request. A node swallows plan → execute → review → verify whole, so a map above a task never lengthens the chain.
- **The map is an index, not a store.** Details live in task artifacts and merge requests. A map that retells a plan is two sources of truth, and the copy is the one that goes stale.
- **One node per session.** A decision node or a research node resolves in this session and appends a `D` row; a code node is started and this session ends.
- **Fog stays fog.** A question that cannot be stated precisely now is a fog item, not a node. The test is whether the question can be *stated*, never whether it can be answered.
- **Campaign decisions change here.** A node that wants a different `D` comes back to the map; a node that changes one silently leaves the map lying.
- **The map is written once the developer has approved it**, and every later change to a node line goes through `campaigns.mjs` — a hand-edited node line is machine state written by hand.
- **An empty frontier is not "done".** Name the wait and its owner, and propose one of: nudge the external party, pull a node out of the fog, declare it out of scope.
- **One repository.** A map that reaches into another — `repo:`, `path:`, a metric with `· repo:`, or `config.campaigns.external[]` — stops with `cross-repository campaigns are Stage 9b`.

## Phases

| # | Step | Reads | Done when |
|---|---|---|---|
| 0 | Config | — | `config.mjs find` returned a config; `campaigns.mjs find` listed the maps |
| 1 | Mode | — | the argument resolved to *create* or *advance* |
| 2 | Grill | `references/map.md §2` | goal, done-metrics measured now, `D1..Dn`, the nodes, the fog list, the waits — all confirmed |
| 3 | Write | `references/map.md §3` | `.claude/hodos/campaigns/<slug>.md` on disk in the shape of `FORMATS.md §11` |
| 4 | Frontier | `references/map.md §4` | `campaigns.mjs frontier <slug>` printed, and its held rows read |
| 5 | Propose | `references/map.md §5` | one node proposed with its reason, and the developer's answer |
| 6 | Start | `references/map.md §6` | the node claimed and the `task` skill invoked as `<slug>/<node>` |
| 7 | Advance | `references/map.md §7` | re-measured, frontier shown, one node started or one wait named with its three options |

*Create* runs 0 → 6. *Advance* runs 0, 1, 7, then 5 → 6 when the frontier has something on it.

## Step 0 — config

`node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs find`. A config with `notFound` means the project has no hodos layer: say `run /hodos:init first` and stop. Then `node ${CLAUDE_PLUGIN_ROOT}/scripts/campaigns.mjs find`, whose output is the map list this session works from.

## Step 1 — mode

An argument that matches a slug `find` printed is **advance**. Anything else is **create**: a description of the work, from the developer or from a `task` session whose router returned `campaign`. A description that matches no map and reads like a slug is asked about rather than guessed — creating a second map for a campaign that exists is the mistake that splits a team's state in two.

## Completion

*Create*: the map is on disk with a done-metric measured now for every metric, at least three nodes, at least one fog item, and the first node either claimed and handed to `task`, or explicitly left for later at the developer's word.

*Advance*: the metrics are current, the frontier is on screen, and the session ends on one of — a node started, a wait named with its owner and the three options put to the developer, or the campaign closed because every node is done or dropped and the metrics are met.

## Gates

Two of the mandatory stops of `DESIGN.md §4.4` fall here: the map itself, which is a design decision at campaign scale, and the node proposal, which opens a task. Both are `AskUserQuestion` with the options named and one recommended. Closing a campaign is a third — the file stays for the team either way, and deleting it is the developer's own.

## Anti-pattern

Cutting fog into nodes so the map looks complete. A map that retells a task's plan. Resolving two nodes in one session. Writing the map before the developer has seen the metrics, which turns an approval into a review of something already done. Proposing a node the frontier reported as held — the dependency is open, and the status that says otherwise is the thing to fix.
