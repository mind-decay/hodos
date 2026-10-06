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

- init owns `CLAUDE.md` — a map, or a managed block inside the developer's own file — `.claude/rules/*.md`, `.claude/hodos/config.json`, the `.gitignore` lines it appends, `permissions.allow` in `.claude/settings.local.json`, and any approved hook in `.claude/settings.json`. Every other **tracked** file stays exactly as it is — untracked artefacts the step-7 commands produce, a build directory or a tool's cache, are those commands' and not this skill's — with two routes out: a file that **names an instruction this run retires** is edited through its own ledger row, approved on its own (decision **0146**), and a file the **developer asks for by name in the session** is edited when they ask and then recorded as a row quoting them, `by your instruction` (decision **0149**) — both in `references/migrate.md`.
- Steps 0–4 read and report. The first write happens after the developer approves at step 5.
- An existing `CLAUDE.md` keeps every byte it has: hodos appends a block between `<!-- hodos:begin -->` and `<!-- hodos:end -->` and proposes trims through the ledger.
- A rule ships with ≥2 precedents cited `file:line`, or as a drift decision carrying its violation count, or not at all.
- A question the scan answered is not asked. The interview buys recall — intent, exceptions, incidents, how the app is run — which is what reading cannot produce.
- A command reaches `config.json` after it ran green in this session, or carries `unrun: true` from the approval that answered for one which cannot run here (decision **0148**); `verifiedAt` is the day the others ran, and it does not speak for a marked one.
- Every fact carries `path:line`. One occurrence is an observation; a convention starts at two.
- Existing instructions are settled in the ledger, and every settlement that **changes a statement or deletes a file** — `delete`, `rewrite`, `automate`, and any row reaching a file outside the instruction set — is its own approval. `retain` and `relocate` into a rule in the same report may be offered as one batch, named row by row in its own text (decision **0152**). Nothing is deleted, moved, or rewritten outside a row the developer answered.

## Phases

| # | Step | Reads | Done when |
|---|---|---|---|
| −1 | Preflight — `node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs preflight`, on a refresh too | — | an **error** stops the run with the prerequisite: a layer whose hooks cannot run is worse than none. A **warning** is reported in this session's own words and the run continues (decision 0058) |
| 0 | Inventory | `references/scan.md` | every inventory line has a value or the word `absent` |
| 1 | Scan by area | `references/scan.md` | five area briefs answered, each fact with `path:line` |
| 2 | Best practice | `references/rules.md` | the detected stacks' `sources/*.md` fetched; candidates carry their URL |
| 3 | Interview | `references/interview.md` | every open question has an answer or an owner |
| 4 | Report | `references/rules.md`, `references/migrate.md` | four tables built: config, rules, CLAUDE.md, migration ledger; step 5 prints them, under its `Approve:` line (decision **0194**) |
| 5 | Approval | — | every row approved, deferred, or dropped; the batch is `retain` and `relocate` only (decision **0152**), each of its rows named in the option's text; every other settlement and every contested rule asked on its own |
| 6 | Write | *Write*, below | the approved rows are on disk and nothing else moved |
| 7 | Self-check | *Self-check*, below | lint exits 0 — or every finding still standing traces to a row the developer declined (decision **0133**) — and every recorded command ran green, bar those carrying `unrun: true` (decision **0148**) |
| 8 | Retire | `references/migrate.md` | each approved settlement applied, or named as not done with its reason. A file the step-4 ledger did not name is **not** edited here, however plainly the settlement implies it: it is one more row at step 4, or a report line (decision **0146**) |

The warning is for the colleague who starts Claude Code from a launcher rather than a login shell: their kernels find node and their hooks do not. Steps 0–2 are reading and can run in any order once the inventory names the stack. Step 3 waits for them: its whole value is asking what they could not answer.

## Approval (step 5)

Open with one line that says what is asked — `Approve: <n> in one batch · <k> asked one at a time` — then the four tables it rests on, then ask (decision **0194**). `AskUserQuestion` carries the decisions — the batch, then each contested rule on its own with the three questions of `references/rules.md`. A row the developer defers is dropped from this run and named in the report; a row they reject is not asked again.

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
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/lint.mjs --project` → exit 0. A finding is fixed here, not reported as a caveat — **unless the developer declined the fix**, and then it is a caveat named in the report beside the row that declined it, because step 6 writes only what is approved and a decline is a first-class answer there (decision **0133**). Any other finding is fixed.
- `node ${CLAUDE_PLUGIN_ROOT}/scripts/verify-citations.mjs .claude/rules/*.md` → every precedent resolves.
- Run each recorded command once in this session. One that fails is corrected or recorded as `null`. A command that **cannot** run in a session — gated behind a corpus download, a device, a paid account — is recorded with `unrun: true` on the approval that says so, and `config.mjs check` warns about it by name (decision **0148**, `references/config.md`); recorded unrun and **unmarked** is what stays forbidden.
- Report: what was written, what the developer declined, what step 8 left in place, and the count of rules with their sources. It ends on `Next: /hodos:task <the first change to build>`, with the change filled in where the developer named one: a set-up exists for the first task (decision **0191**).

## --refresh

The layer exists; this run re-verifies it against everything that changed since `config.scanSha`. A plain `/hodos:init` in a project that already has a `config.json` runs this procedure and says so: re-deriving settled facts and re-asking answered questions is the anti-pattern below. A full re-scan happens when the developer asks for one.

1. `git log --diff-filter=DR --name-only <scanSha>..HEAD` — deletions and renames are what kills a precedent. A `scanSha` this repository does not contain means the recorded scan is unreachable: say so and run the full scan instead of a delta.
2. `verify-citations.mjs .claude/rules/*.md`, then `lint.mjs --project` — a dead citation, an anchor whose text has moved, and a bare path that no longer exists are each a proposal: re-point it, or retire the rule. A rename kills more than citations, so the same pass covers the prose inside a rule that names a path and the map's own rows inside the managed block. The anchor is what makes a re-point decidable: the check names the line the quoted text is now on, and that line is what the re-point writes, a range's end shifting by the same delta. Where it names none — the anchor is gone from the file, or it matches several lines — the proposal is to retire the rule or to keep it and re-point by hand, never a line number that merely looks right.
3. Drift: for each rule, count the places the code no longer follows it. A rule the code has left is a decision for the developer, never a silent edit.
4. Pins: every `verify.recipes[].checks[]` entry whose `route` no longer resolves — the project's route table does not carry it, or the component it named is gone — is a **prune proposal** naming the route, the predicate and when it was written (decision **0094**). A pin whose route resolves is left alone whatever the predicate looks like: whether it still holds is the verify phase's answer, not this one's, and a check removed here is a regression nobody will notice. A `checks[]` entry `config.mjs check` warns about — a predicate over a class or an id, a walk from a queried element, or a bare expression where the adapter runs a function (decisions **0118**, **0129**, **0130**) — is reported beside the prunes as a re-point proposal, in the same words a rotted citation gets. **A route does not leave `verify.recipes[].routes` while a `checks[]` entry names it** (decision **0131**): the sweep is what evaluates a pin, so dropping the route retires the check in silence instead of proposing it. The prune is presented first, the routes row names its dependency, and a routes row approved without its prune is refused with that reason and stays a report line.
5. New areas: directories added since `scanSha` that no rule and no precedent covers → candidates, through the same three-question filter.
6. Landing: a config whose repository lists a remote and carries no `conventions.land` predates the question (decision **0201**). Ask the landing half of interview question 4 once, and the answer is a row of the delta's config table, recommended as step 5 recommends it.
7. Present the delta as the step-4 report and write only what is approved. The two pointers answer different questions and move on different conditions (decision **0132**): **`verifiedAt`** is the day the recorded commands last ran green, so it moves when they did, whatever else this run left undone; **`scanSha`** is the left end of the next delta, so it moves only where this delta leaves **no unresolved proposal** — a declined or unfixed row holds it, and the report names the row holding it. Moving it past a finding buries the finding, because the next `--refresh` starts after it.

## Completion

`config.json` holds commands that ran green in this session — or `unrun: true` beside each that cannot run here (decision **0148**) — `lint.mjs --project` exits 0, every write traces to a row the developer answered — one at a time, bar the `retain`/`relocate` batch decision **0152** defines — and the report names what was not done.

## Anti-pattern

A rule that restates what the model already does without being told. Asking the developer something `git log` answers. Rewriting the developer's `CLAUDE.md`. Recording a command nobody ran. Applying a ledger row that was never approved.
