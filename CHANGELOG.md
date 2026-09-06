# Changelog

All notable changes to hodos. The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/);
versions follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

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

[Unreleased]: https://github.com/mind-decay/hodos/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/mind-decay/hodos/releases/tag/v0.1.0
