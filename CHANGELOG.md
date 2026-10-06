# Changelog

All notable changes to hodos. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [0.3.1] — 2026-10-06

After a plugin update, the scripts rule `init` wrote still named the previous version's directory, so every script call prompted again. This patch moves the rule with the installed version.

### Fixed

- **A plugin update keeps the scripts permission `init` wrote.** At each session start, resume and `/clear`, the SessionStart hook runs `state-digest.mjs --repoint`. It finds the rule `init` writes, `Bash(node <plugin root>/scripts/*)`, in `.claude/settings.local.json` at the project root, and when that rule names another version directory of the running plugin it moves the rule to the running version, several such rules converging on one. Claude Code reloads the permission in the same session. The digest says what moved in one row, `- permissions: hodos scripts rule moved 0.3.0 → 0.3.1 in .claude/settings.local.json`, or why it could not, and the cap never drops that row. Nothing is added where no rule was approved, no other entry or key changes, a session still running the version an update replaced moves nothing, and a `--plugin-dir` checkout is never taken for a version. A narrower rule the permission dialog wrote stays as it is (decision 0204).

## [0.3.0] — 2026-10-06

What a plugin install loads has changed since 0.2.2 in eleven skills, sixteen phase references, two agents, six engine scripts and the hooks manifest, which gains a hooks module. `run` can be resumed by a go-ahead in words, `ledger.mjs claim` keeps S2 out of the session that approved the plan, and `finish` now says plainly that it commits a campaign map in the same repository. Every exit the UX audit named ends on one `Next:` line, `ledger.mjs next` names what continues any task, `/hodos:task <slug>` resumes a task stopped before approval, and a third red check blocks the task on its question. Every gate the audit named leads with what the developer decides, and every option set it offers marks one recommended. Both reviewers leave a partial file when they reach their turn bound, at bounds measured from every saved dispatch, the commit gate lets a fix pass commit once it has recorded its checks green, and the Stop hook names a verify fix pass by its own number. Landing is asked rather than handed off: after the report, one question with the exact commands in each option, run on the answer, and `/hodos:handoff` asks the same way about its file. The digest, `/hodos:status` and the wait-what re-pitch each say where the work is and the one step that continues it, and an interactive session shows both in a band above the prompt. The lines the audit found printing the engine's own vocabulary now say what they mean, and the instructions the model reads keep their words. The chat speaks the developer's language in every session of a task, and what a program reads stays as written. The rest is the repository's own tooling: the UX audit, the test support, and the record of hodos building itself (`docs/BUILD-PLAN.md`, Stage 12d-3).

### Added

- **Every exit ends on one `Next:` line.** The 24 exits, gates and re-pitches the UX audit gave the `next-line` node now each end on one step: the command with its arguments filled in, or the words when no command continues it. Among them are the finish report, the run's stops, a reviewer or verifier at its bound, `init`'s report, the small skills, `status --debt` and `--cost`, and the `/hodos:wait-what` re-pitch. A campaign node's finish proposes `/hodos:campaign <campaign>`, and the go-ahead *"продолжаем"* to it now reaches the map (decision 0191).
- **`ledger.mjs next [<slug>] [--done]`** prints one JSON line naming the step that continues a task and the command or words that take it, and writes nothing. `task`, `run`, the digest and every exit that concludes no work of its own read it. For a finished task it also carries `land`, the options of the one landing question, each with its exact commands and read from git alone, and its step is the recommended option's commands (decisions 0192, 0197).
- **`/hodos:task <slug>` resumes a task stopped before approval** at the first step whose output is missing. It used to open `<slug>-2` beside it (decision 0192).
- **A third red check blocks the task on its question.** `Task <n>: blocked — <question>` moves the task to a new phase, `blocked`, and the ledger accepts it only after that task's attempt 3/3. A resumed run asks the stored question, records the answer as a `Gap:`, and restarts the task on a fresh bound (decision 0193).
- **A go-ahead in words resumes a task.** `run` no longer carries `disable-model-invocation`, so answering the digest's `resume with /hodos:run <slug>` with *"продолжаем"* invokes it. `Plan: approved` now records the session that approved the plan, and `ledger.mjs claim` refuses to start S2 in that session, naming `/clear`. The Pickup approves with `--handoff`, which records no session (decision 0190).
- **The UX audit, `bench/ux/`.** It inventories every place a developer meets hodos as a scenario, 76 of them across nine journeys, and scores each against a ten-item rubric drawn from four cited sources. `node bench/ux/run.mjs` holds the inventory to the engine text with no model call. `--report` ranks the findings by the campaign node that owns their fix. `--count` prints the broken scenarios, which is the `hodos-ux` campaign's third done-metric (decision 0188).

- **The landing is asked, and run on the answer.** After the finish report, a new run phase, `land.md`, asks once: push the branch, fast-forward the default branch and push it, rebase first when the default moved, or leave it. Each option shows the exact commands it runs, and the one picked runs verbatim, one command at a time. The first non-zero exit stops it, a rebase that conflicts is aborted with `git rebase --abort`, and nothing is forced or retried. `/hodos:run` on a finished task whose branch has not landed asks the same question, and one whose landing is made offers nothing, because the options are read from git and never from a ledger line. A campaign node lands with its map commit, and a rebase re-points the map at the rebased commit. A spike's branch deletion is asked the same way (decision 0197).
- **`/hodos:status` closes on one `Next:` line.** `state-digest.mjs --full` ends on `Next: <command> — <why>`, ranked over the tasks and maps it read: this session's task, then the open task updated last, a map with a ready node, a stale task, a map with none, and `/hodos:task <description>` when nothing is open. The bare digest prints no such line (decision 0198).
- **A band above the prompt says where the work is and the command that continues it.** In an interactive session with a task or campaign open, hodos draws `● users-export execute → /hodos:run users-export` in magenta in the band directly above the prompt, refreshed when the session starts and after each of its turns, and gives the band up to a survey. A hooks module, `hooks/state-row.mjs`, draws what the new `state-digest.mjs --row` prints, the same command `/hodos:status` ends on, and the engine's `[-]` collapses it. Nothing is drawn with nothing open, in a `-p` session, on the VS Code and mobile surfaces, or when the run fails. The module API is early access, and deleting `modules` from `hooks/hooks.json` turns the band off (decisions 0202, 0203).
- **`conventions.land: branch | default`** chooses the landing marked recommended when the project has a remote. Unset means the branch push, for a merge request.
- **`init` asks how a finished branch lands.** Where the repository has a remote, interview question 4 asks whether a branch lands through a merge request or straight onto the default branch, and init writes the answer as `conventions.land`, so the land phase recommends the project's own landing. `--refresh` asks it once of a config without the key (decision 0201).
- **`/hodos:handoff` asks to commit and push the handoff file**: commit and push, commit, or leave it, each with its commands, run on the answer. The commit names its path, so work already staged stays out of it (decision 0197).
- **The chat follows the developer's language.** `ledger.mjs init --chat <xx>` records the language the developer is speaking as `state.json`'s `chat`, and the router and the Pickup pass it. The digest prints it under its header, `- chat: the developer reads ru — commands, slugs and paths are English, files are written in en`, so the session `/hodos:run <slug>` opens after `/clear` answers in that language too. Commands, slugs, paths, the router's checklist and verdict lines, ledger lines and quoted file text stay as written. `config.language` now means the language of the files hodos writes, init's language question says the chat follows the developer, and the `/hodos:wait-what` re-pitch asks for plain words in the developer's language where it asked for plain technical English (decision 0200).

### Changed

- **The frontier says `waiting` where it said `held`.** A node the map marks ready whose dependency is still open prints as `waiting: <node> — <gist> · on: <dependency>`, and the counts in the digest row and the status block say `<n> waiting`. The map file is unchanged: the node line still says `[ready]`, and `fog` and `claimed` print as before. The glossary in `DESIGN.md §14` now gives each leading word that reaches a printed line its printed form (decision 0199).
- **The router's verdict names its rows.** `quick fails on files touched (5) and new module (yes)` replaces `quick fails on rows 1–2`, and `Campaign: no — one mergeable unit, no fog, one developer, no external wait` replaces `rows 6–9`. Init's rule table heads its evidence column `Evidence · Needed because · Checkable` where it said `Q1 (kind) · Q2 · Q3` (decision 0199).
- **A run's resume, simplify and finish lines say what they mean.** A task stopped before approval resumes "to continue planning", not S1, and one at `manual` opens on `You chose to finish this branch by hand.` before its `Next:`. The simplify pass prints `line <n>: not needed yet …` where it printed `L<line>: yagni …`, and closes on `<N> lines shorter` or `Nothing to simplify.`. The finish report says `Simplified:`, `Decisions the plan missed`, `Decided without asking`, `Rule citations moved:` and `Verifier on the plan's claims:` where it said `Simplify: net`, `Gaps`, `Rulings`, `Re-pointed:` and `Claim feedback:`. The ledger's lines are unchanged (decision 0199).
- **`/hodos:status` shows session records in one line.** `Session records: all point at open tasks.` when none is stale, and `<n> session records left by closed sessions — remove them?` when some are, where it listed every pointer file (decision 0199).
- **The digest prints one row per campaign map, ending on its command.** `- campaign <slug> — frontier <counts> — advance with /hodos:campaign <slug>` replaces the one joined `- campaigns:` row. Each map now names the step that advances it, as each task row names its resume, and the cap drops one map at a time (decision 0198).
- **The `/hodos:wait-what` re-pitch opens on where the work is.** The skill injects the bare digest, and the re-pitch names the hodos task, its phase and the step after it before its context, or says that no task is open (decision 0198).
- **`campaigns.mjs node-done --sha` takes a ref**, `HEAD~1` as readily as a full sha, and records the short sha git resolves it to, in the repository it runs in or else in the map's own. A ref that names no commit in either exits 1 and leaves the map as it was (decision 0197).
- **The commit gate lets a fix pass commit.** With `gates.blockCommitOnFailedReview` on, git-guard denied every commit in phase `fix`, and a fix pass commits there, so no fix pass could commit at all. Each fix pass now records `Fix <k>: green` once its checks pass, the gate allows the commit after that line, and the deny reason names the line to record. The ledger refuses the line outside phase `fix`, and `Fix <k>: done` is still accepted without it. The Stop hook now names a verify fix pass by the verify counter, where a `Gap:` or `Ruling:` line written in that pass used to make it name the review's (decision 0195).
- **A reviewer stopped at its turn bound leaves what it had done.** `hodos-reviewer` writes `review.partial.md` after its checks and again after its Spec pass, and `hodos-plan-reviewer` writes `plan-review.partial.md` before it re-reads the plan's citations, each with a `PARTIAL` verdict line no reader takes for a verdict. At the bound `run` and `/hodos:review` name the reviewer's partial and end on the step that dispatches a fresh one, and S1 folds the plan reviewer's partial and goes to approval with re-dispatching it as an option. The bounds are twice the largest of the saved dispatches: the reviewer's goes from 40 to 80 and the plan reviewer's from 20 to 50, and the verifier's and the preparer's are unchanged (decision 0196).
- **Gates lead with what the developer decides.** The router prints its three verdict lines above the nine-row table, init's approval opens on one line saying what is asked, the migration ledger's four shape numbers sit under its rows, and the finish report's second line is the review and verify verdict. The router's confirmation, the plan approval, both breakers and the empty frontier each mark one option *(Recommended)* with the line that makes it right, and the plan approval names its three options: approve, change, and stop here, which `/hodos:task <slug>` resumes (decision 0194).
- **The digest's resume line names the command for the task's phase.** A task at `plan` resumes with `/hodos:task <slug>` and one at `manual` with `/hodos:review <branch>`, where every task used to get `/hodos:run <slug>` (decision 0192).
- **`task`, `campaign` and `rule` accept a go-ahead to hodos's own proposal.** Their descriptions used to say they are "not invoked on your own reading of a request". Each now names a go-ahead in words to a step hodos itself just proposed among its callers, and leaves a request hodos did not propose to the developer's command. A `/hodos:wait-what` re-pitch that offered a choice was not such a proposal. Since decision 0191 it ends on one step, and a go-ahead to it reaches `task` (decision 0190).
- **`finish` commits a campaign map that lives in the same repository.** It makes one commit holding the map alone, right after `node-done`, which records the task's last commit as the node's sha. `finish.md` used to say this in §4 while §1 and §10 said the phase commits nothing (decision 0189).
- **`npm test` fails a run that leaves anything in its temp directory.** It points `TMPDIR`, `TMP` and `TEMP` at a sandbox of its own, names every entry left there, and removes the sandbox whatever the run did. Every test file makes its temp directories through `scripts/temp-dir.mjs`, which removes them when the file ends, a failed test's included (decision 0186).

## [0.2.2] — 2026-09-30

The fixes of 12d-2's second review. The `inert` upgrade had one path on which a line the reviewer called behaviour stayed unreviewed.

### Fixed

- **The upgrade out of `inert` now reverts every commit since the plan's base** (`git revert --no-edit <base>..HEAD`), not only the task's own. A fix-pass commit that a later review named as behaviour used to stay below the new base, where no review or test reached it (decision 0184).
- **The same upgrade returns the task to `plan`.** A `/hodos:run` resumed before the new approval now stops at the missing approval, instead of entering the fix pass on a reverted tree (decision 0184).
- **An uncommitted `inert` edit is set aside with `git stash -u`.** `git restore` left behind a file the edit had added.
- `ledger.mjs`'s grammar now says an upgrade starts at the task's rung, which is what it has enforced since 0.2.0.

## [0.2.1] — 2026-09-30

The 0.2.0 release's `windows` job failed on both remotes, and this patch is its two fixes. 0.2.0 is otherwise unchanged.

### Fixed

- On Windows, two `ledger.mjs add` running at once could fail with `EPERM` while renaming the temporary file onto `state.json`, because Windows refuses a rename onto a target another process holds. The write now retries `EPERM`, `EACCES` and `EBUSY`, up to 450 ms in all, and removes its temporary file when it gives up.
- `campaigns.test.mjs` built a regular expression from a path, and a Windows path's backslashes read as escapes. The path is now escaped.

## [0.2.0] — 2026-09-30

The first release measured on a real codebase. The pilot ran on `ariadne_v2`, a Rust workspace, and covered ten tasks, five same-task pairs against bare Claude Code, a cross-repository campaign node and three `inert` pairs. `docs/PILOT.md` has the numbers and what each one does not prove. One line per build stage, in the order they ran:

### Added

- **Stage 11d-1** — the claim set. Three rules derive the claims from the plan's contract, with plan review's seventh gap, the reviewer's **Unclaimed** row, `## Claim feedback` and the seeded data layer (decisions 0092, 0099).
- **Stage 11d-2** — the oracles.
  - The verifier's four admissible sources, the detectors, the pairwise matrix and the attack list.
  - The fail-fast pipeline order and `## Not covered`.
  - Decisions 0093, 0096, 0106, 0107 and 0109–0113.
- **Stage 11d-3** — the statuses and the pins: a claim proved once is pinned as an assertion, a failing row's severity is derived from its source, `pre-existing` is earned at the base sha, every numeric claim names its statistic, and a pass on retry is `flaky` (decisions 0094, 0097, 0098, 0108).
- **Stage 9b** — campaigns across repositories.
  - A lookup across `external[]`, `repo:` resolution and a per-row metric anchor.
  - Claims read from the refs, with a `claimed` frontier.
  - `/hodos:status`'s bounded fetch, `set --gist` and the release node.
  - Decisions 0134–0139.
- **Stage 12a** — two review mechanisms, measured on fixtures: the deleted-test measurement, and the mutation count recorded where a fresh reader can check it (decisions 0121, 0122, 0140, 0143).
- **Stage 12b** — `init` on a real project.
  - A migration ledger for an existing `.claude/`, with rules whose guard is "not about `.claude/`".
  - A recipe that has not run says so.
  - An instruction typed in chat becomes a ledger row that quotes it.
  - Decisions 0144–0152.
- **Stage 12c-1** — the pilot's protocol, in `docs/PILOT.md`, and its second repository, made by extracting a crate (decisions 0142, 0153–0155).
- **Stage 12c-2** — the pilot's runs: ten tasks, and five duplicate pairs in which one task runs in both arms from one base on one model. The objective bar is the project's own two commands (decisions 0156–0166).
- **Stage 12c-3** — the measurements.
  - The structural shape of what each arm shipped (decision 0158).
  - A blind rubric over the duplicate pairs.
  - The hold-out reviewer measurement in `bench/holdout/` (decision 0154).
  - Stage 9b's node, run live across two repositories.
  - Decision 0167.
- **Stage 12d-1** — several terminals on one project.
  - Each session claims its task, a verify layer is shared by the sessions on it and stopped by the last one out, and a claim over a claim the refs carry is refused without `--force`.
  - Seven fixes the pilot's runs asked for.
  - Decisions 0168–0181.
- **Stage 12d-2** — the numbers and the `inert` shape.
  - Every `DESIGN.md §13` number was read against the pilot, and the multiplier's thresholds were withdrawn (decision 0182).
  - `quick` gains the `inert` shape for a change no program reads: one session, one fresh reviewer and no verifier, priced on three same-task pairs (decision 0183). An upgrade out of the shape reverts the edit and rebuilds it test-first, and the ledger refuses any way back into it (decision 0184).

### Changed

- **`/hodos:status --cost` reads higher than it did under 0.1, because it now counts correctly.** `usage.mjs` includes the subagent transcripts beside a session, and counts each message at its final usage rather than its first streamed line (decisions 0166, 0167).
- **The multiplier is a reported price with no threshold.** `DESIGN.md §11` and `§13` give the pilot's figures in place of the `quick` ≤1.3× and `standard` ≤2× targets (decisions 0158, 0182).
- **Every session takes up a task with `ledger.mjs claim`.** The claim writes the session's own pointer, and a session with no pointer is on no task while another session holds one (decisions 0169–0171).
- **The grilling round asks through `AskUserQuestion`**, four questions per call with the recommended answer first (decision 0178).
- **Plans settle three things they used to leave open.**
  - A `Gap:` that overrides an acceptance clause rewrites the clause in `plan.md` (decision 0176).
  - A claim that compares a number names its tolerance (decision 0177).
  - The task that moves a rule's anchor re-points it before the merge (decision 0180).
- **The digest's session log is gone**, since its number is recorded (decision 0141).

### Fixed

- `usage.mjs` never counted a subagent transcript, so every multiplier was low (decision 0166).
- Every writer of `state.json` shared one `state.json.tmp`, so two `ledger.mjs add` running at once failed with `ENOENT … rename 'state.json.tmp'`. It was found by running them concurrently, not by reading the code.
- The digest offered to hand off a task that was already done (decision 0179).
- A Spec `major` closed by a `Ruling:` never reached a second reader, because the re-review copied only `## Standards`. It now receives `## Spec` too (decision 0175).
- On `claude-opus-5-5`, the router asked its question without printing the checklist above it, in every session on record. `route.md` now names that failure.

## [0.1.0] — 2026-09-06

First release. The engine is complete and measured against the four projects in
`bench/fixtures/`; it has never been run against a real codebase, which is what
0.2 is for. One line per build stage, in the order they ran:

### Added

- **Stage 0** — repository skeleton: plugin and marketplace manifests, package scripts, CI, MIT license, and `scripts/lint.mjs` v0 (frontmatter subset, size caps, the `hodos-` agent prefix).
- **Stage 1** — the scripts every phase calls and the hooks that fire around them: `config.mjs`, `ledger.mjs`, `state-digest.mjs`, `verify-citations.mjs`, `stop-gate.mjs`, `git-guard.mjs`, `hooks/hooks.json`, and `lint.mjs` completed.
- **Stage 2** — four fixture projects (`webapp`, `api`, `mono`, `kit`), the fixture-copy harness, and the labeled bench sets the later gates score against.
- **Stage 3** — `/hodos:init` v0: the scan, the interview, and the first config a project can be checked against.
- **Stage 4** — the `task` kernel: the router's nine checklist rows, research, the design grilling, and a plan the developer approves.
- **Stage 5** — the `run` kernel: execute task by task, the simplify ladder, and resume from the ledger after any interruption.
- **Stage 6** — the review loop: `review-package.mjs`, `hodos-reviewer` in a fresh context, two iterations, and the breaker.
- **Stage 7** — the verify loop: `hodos-verifier`, evidence on disk, the mutation check, and `verify.md`.
- **Stage 8** — `finish`, `/hodos:status`, and the small skills (`rule`, `skill`, `review`, `handoff`, `wait-what`).
- **Stage 9a** — campaigns inside one repository: the map grammar, the frontier, and the node a task claims.
- **Stage 10** — `init` in full, plus `--refresh`: the migration ledger for instructions a project already had, and rules that cite `file:line` precedents.
- **Stage 10b** — the eight adapter roles wired to the phases that call them, and `/hodos:adapter` so a project can write its own.
- **Stage 11a** — the bench harness: three gates, the no-op bench, `bench/report.mjs`, and `docs/BENCH.md` saying what each number does not prove.
- **Stage 11c** — eight recurring needs entered through mechanisms that already run: the `spike` and `upgrade` router types, the `mechanical` refactor shape, the `reproduce` phase, the digest's offer line, `/hodos:review <branch|ref|path>` and `/hodos:handoff` — with the model-invocable set still at three.
- **Stage 11b-1** — the git-root path anchor, the touched-subproject command set (`config.mjs for-files`), and the ` · project: <dir>` column a monorepo's rows carry.
- **Stage 11b-2** — the verify environment: the `verify.env` grammar, `scripts/env.mjs`, the preflight, and `hodos-preparer` for a layer that will not come up.
- **Stage 11b-3** — precedent anchors that survive a moved line, the plan's prose decisions, the widened `codeIndex` contract, and the review package's `## Callers` section.
- **Stage 11b-4** — this release: the README, `CONTRIBUTING.md`, the publication scrub, and the `a11y` and `viewport` recipe kinds with the adapter operations they call.

### Fixed

- `state.json` and the two claim pointers are written through a temp file and a rename, and a write refuses a ledger it could not read instead of deriving a beginning state from zero events (decision 0101).

[Unreleased]: https://github.com/mind-decay/hodos/compare/v0.3.1...HEAD
[0.3.1]: https://github.com/mind-decay/hodos/compare/v0.3.0...v0.3.1
[0.3.0]: https://github.com/mind-decay/hodos/compare/v0.2.2...v0.3.0
[0.2.2]: https://github.com/mind-decay/hodos/compare/v0.2.1...v0.2.2
[0.2.1]: https://github.com/mind-decay/hodos/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/mind-decay/hodos/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/mind-decay/hodos/releases/tag/v0.1.0
