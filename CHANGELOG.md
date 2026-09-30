# Changelog

All notable changes to hodos. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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
  - `quick` gains the `inert` shape for a change no program reads: one session, one fresh reviewer and no verifier, priced on three same-task pairs (decision 0183).

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

[Unreleased]: https://github.com/mind-decay/hodos/compare/v0.2.1...HEAD
[0.2.1]: https://github.com/mind-decay/hodos/compare/v0.2.0...v0.2.1
[0.2.0]: https://github.com/mind-decay/hodos/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/mind-decay/hodos/releases/tag/v0.1.0
