---
name: init
description: Learn this project once and write its hodos layer, with the developer approving every write — a scan and an interview, rules that cite precedents, a config whose commands were run, a CLAUDE.md map or a managed block inside the existing file, and a migration ledger for the AI instructions already in the repository. Run before the first /hodos:task. With --refresh, re-verify an existing layer against everything that changed since it was written.
disable-model-invocation: true
argument-hint: "[--refresh]"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

!`node ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs`

# init

Learn the project once; write the layer every later phase reads. Each phase's procedure is read on entering that phase from `${CLAUDE_PLUGIN_ROOT}/skills/init/references/<name>.md` — a reference that cannot be read stops the run with the reason, and is never reconstructed from memory.

## Invariants

- init owns `CLAUDE.md` — a map, or a managed block inside the developer's own file — `.claude/rules/*.md`, `.claude/hodos/config.json`, the `.gitignore` lines it appends, `permissions.allow` in `.claude/settings.local.json`, and any approved hook in `.claude/settings.json`. Every other file in the repository stays exactly as it is.
- Steps 0–4 read and report. The first write happens after the developer approves at step 5.
- An existing `CLAUDE.md` keeps every byte it has: hodos appends a block between `<!-- hodos:begin -->` and `<!-- hodos:end -->` and proposes trims through the ledger.
- A rule ships with ≥2 precedents cited `file:line`, or as a drift decision carrying its violation count, or not at all.
- A question the scan answered is not asked. The interview buys recall — intent, exceptions, incidents, how the app is run — which is what reading cannot produce.
- A command reaches `config.json` after it ran green in this session; `verifiedAt` is the day it ran.
- Every fact carries `path:line`. One occurrence is an observation; a convention starts at two.
- Existing instructions are settled one row at a time in the ledger. Nothing is deleted, moved, or rewritten without its own approval.

## Phases

| # | Step | Reads | Done when |
|---|---|---|---|
| −1 | Preflight — `node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs preflight`, on a refresh too | — | an **error** stops the run with the prerequisite: a layer whose hooks cannot run is worse than none. A **warning** is reported in this session's own words and the run continues (decision 0058) |
| 0 | Inventory | `references/scan.md` | every inventory line has a value or the word `absent` |
| 1 | Scan by area | `references/scan.md` | five area briefs answered, each fact with `path:line` |
| 2 | Best practice | `references/rules.md` | the detected stacks' `sources/*.md` fetched; candidates carry their URL |
| 3 | Interview | `references/interview.md` | every open question has an answer or an owner |
| 4 | Report | `references/rules.md`, `references/migrate.md` | four tables shown: config, rules, CLAUDE.md, migration ledger |
| 5 | Approval | — | every row approved, deferred, or dropped; contested rules asked one at a time |
| 6 | Write | *Write*, below | the approved rows are on disk and nothing else moved |
| 7 | Self-check | *Self-check*, below | lint exits 0 and every recorded command ran green |
| 8 | Retire | `references/migrate.md` | each approved settlement applied, or named as not done with its reason |

The warning is for the colleague who starts Claude Code from a launcher rather than a login shell: their kernels find node and their hooks do not. Steps 0–2 are reading and can run in any order once the inventory names the stack. Step 3 waits for them: its whole value is asking what they could not answer.

## Approval (step 5)

Present the four tables, then ask. `AskUserQuestion` carries the decisions — the batch, then each contested rule on its own with the three questions of `references/rules.md`. A row the developer defers is dropped from this run and named in the report; a row they reject is not asked again.

## Write (step 6)

Exact shapes: `references/config.md` for the config, and `${CLAUDE_PLUGIN_ROOT}/docs/FORMATS.md` §1 for the layout. The specification behind the reference is `FORMATS.md §2`, read when the reference does not answer (decision **0066**).

1. `.claude/hodos/config.json` — every field of `references/config.md`, read on entering this step. `adapters.<role>` names a file under `${CLAUDE_PLUGIN_ROOT}/adapters/<role>/` whose server key appears in `.mcp.json`, or `project:<name>` for one under `.claude/hodos/adapters/<role>/`, else `null`. In a monorepo: one config per subproject whose commands differ from the root's (`references/scan.md`), each holding only its overrides, and the root's `nested[]` naming them.
2. `.claude/rules/<name>.md` — one rule per file, `paths:` frontmatter, ≤100 lines, precedents anchored in a `## Precedents` block (`references/rules.md`, `AUTHORING.md §10`).
3. `CLAUDE.md` — no file yet → a map ≤60 lines: what the project is, where things live, the commands, the conventions that hold everywhere, and a line pointing at `.claude/rules/`. A file already there → append the managed block; the text above `<!-- hodos:begin -->` is byte-identical afterwards.
4. `.gitignore` — append `.claude/hodos/tasks/`, `.claude/hodos/active`, `.claude/hodos/sessions/`, `.claude/hodos/env/`, `.claude/hodos/history.jsonl` and `.claude/settings.local.json` once, only the lines it lacks. The last one is what keeps step 5's machine-specific path out of the team's history.
5. `.claude/settings.local.json` — on approval, merge `permissions.allow: ["Bash(node <plugin root>/scripts/*)"]` with the plugin root **resolved**: the value `${CLAUDE_PLUGIN_ROOT}` holds in this session, written out in full, because a project settings file has nowhere to expand a variable. The approval says which file is written. Keep every key already there. Declining costs one permission prompt per script call and nothing else, so it is offered, never assumed.
6. `.claude/settings.json` — the committed file, and it receives only what a team shares: a hook that came out of question 3 of `references/rules.md` or an `automate` row of `references/migrate.md`, each approved on its own row, never in the batch. The event, the matcher and the **exact command** are shown before the approval and written as approved; `${CLAUDE_PLUGIN_ROOT}/hooks/hooks.json` is the worked example of the shape. A hook whose command this session has not run once is a proposal in the report, not a write. The shared form is **project-relative** — the tool the project already runs, or a path under the repository. A command naming `${CLAUDE_PLUGIN_ROOT}` or an **absolute** path names one machine's disk — a home directory is the common case, `/opt/tools/lint` is no more shared — so a teammate who pulls the file runs nothing: that row is refused with that reason at its own approval and stays a report line.

## Self-check (step 7)

- `node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs check` → exit 0. It validates what was just written against the schema: an error is a key the scripts do not read, so the feature it names — a gate, a recipe, an adapter — is off in silence. An adapter the project already had, mapping fewer operations than its role names, fails here too (decision **0091**): map the operation, or take that role's mapping out of the config and say so in the report. Deleting someone else's adapter file is not one of the two.
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/lint.mjs --project` → exit 0. A finding is fixed here, not reported as a caveat.
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/verify-citations.mjs .claude/rules/*.md` → every precedent resolves.
- Run each recorded command once in this session. One that fails is corrected or recorded as `null` — never recorded unrun.
- Report: what was written, what the developer declined, what step 8 left in place, and the count of rules with their sources.

## --refresh

The layer exists; this run re-verifies it against everything that changed since `config.scanSha`. A plain `/hodos:init` in a project that already has a `config.json` runs this procedure and says so: re-deriving settled facts and re-asking answered questions is the anti-pattern below. A full re-scan happens when the developer asks for one.

1. `git log --diff-filter=DR --name-only <scanSha>..HEAD` — deletions and renames are what kills a precedent. A `scanSha` this repository does not contain means the recorded scan is unreachable: say so and run the full scan instead of a delta.
2. `verify-citations.mjs .claude/rules/*.md`, then `lint.mjs --project` — a dead citation, an anchor whose text has moved, and a bare path that no longer exists are each a proposal: re-point it, or retire the rule. A rename kills more than citations, so the same pass covers the prose inside a rule that names a path and the map's own rows inside the managed block. The anchor is what makes a re-point decidable: the check names the line the quoted text is now on, and that line is what the re-point writes, a range's end shifting by the same delta. Where it names none — the anchor is gone from the file, or it matches several lines — the proposal is to retire the rule or to keep it and re-point by hand, never a line number that merely looks right.
3. Drift: for each rule, count the places the code no longer follows it. A rule the code has left is a decision for the developer, never a silent edit.
4. New areas: directories added since `scanSha` that no rule and no precedent covers → candidates, through the same three-question filter.
5. Present the delta as the step-4 report and write only what is approved. `scanSha` and `verifiedAt` move only after the commands ran again.

## Completion

`config.json` holds commands that ran green in this session, `lint.mjs --project` exits 0, every write was approved one row at a time, and the report names what was not done.

## Anti-pattern

A rule that restates what the model already does without being told. Asking the developer something `git log` answers. Rewriting the developer's `CLAUDE.md`. Recording a command nobody ran. Applying a ledger row that was never approved.
