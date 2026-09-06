# scan — what the repository answers before anyone is asked

Read on entering step 0. Input: the repository, `.mcp.json`, `git log`. Output: the inventory and five area briefs, held in this session and spent at step 4. Nothing is written here, and nothing on this page is a question for the developer.

## Step 0 — the inventory

One pass, no subagents. Every line gets a value or the word `absent`.

| Line | Where it comes from |
|---|---|
| git root, branch, HEAD | `git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse HEAD` |
| manifests | `git ls-files` filtered to `package.json`, `*.csproj`, `Cargo.toml`, `pyproject.toml`, `go.mod`, `build.gradle*`, `Gemfile` |
| lockfiles | `package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `Cargo.lock`, … — every dependency version quoted later comes from here |
| workspaces | `workspaces` in the manifest, `pnpm-workspace.yaml`, `[workspace]`, `*.sln` |
| scripts | the manifest's script block, `Makefile` targets, `justfile` |
| CI | `.github/workflows/*`, `.gitlab-ci.yml`, `azure-pipelines.yml` — what CI runs is what works |
| test · lint · typecheck config | the runner's config, the linter's config, `tsconfig*.json`, `.editorconfig` |
| existing AI instructions | `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/*.mdc`, `.cursorrules`, `.github/copilot-instructions.md`, `.windsurfrules`, `.claude/**` |
| MCP | the server keys of `.mcp.json` |
| size | `git ls-files | wc -l`, and the five directories holding the most of them |

Close it with the top-level directories, one line each: what lives there. That line is what the CLAUDE.md map is built from.

## Step 1 — the five area briefs

One Explore subagent per area (`model: config.models.initScan`, or `sonnet` before a config exists). Each brief carries the question, the files to start from — the inventory already answers that, and a subagent that has to find the project first spends its budget finding it — the answer shape, and the cap: ≤1,500 tokens, every fact as `path:line`, facts only.

**A. Stack & commands.** Languages and frameworks with the version from the lockfile; the test, lint, typecheck, build and dev commands as exact strings, each with where it is declared; the runtime floor (`engines`, `rust-toolchain`, target framework).

**B. Architecture.** The module layout and what each top-level directory owns; the import direction between layers and any place that breaks it; how dependencies are provided (DI container, factory, module import); where the process starts.

**C. Conventions.** 5–10 representative files per area, hunting patterns that are **Unusual** (a competent developer would not guess it), **Opinionated** (a fork was taken and one side won), **Tribal** (it lives in review comments, not in a file), or **Consistent** (the code does it every time). Each candidate returns with ≥2 `file:line` precedents, or it returns as an observation. A pattern that is none of the four is what any model writes unprompted, and it is not a candidate.

**D. Tests.** The framework and runner; where a test lives relative to the code it covers; what is mocked and by what mechanism; what a typical test asserts — behavior, or the shape of the implementation; whether a failure message names the behavior that broke.

**E. Existing instructions.** One row per instruction in the files step 0 listed: the instruction, its `file:line`, and whether the code actually follows it. This row set is the input to `references/migrate.md`; settling it happens there, not here.

## Commands

Candidates come from the manifest's scripts and from CI. Run each once, in the project, before it is recorded — the recorded string is the one that ran. A command that needs an install first is reported and asked about: installing is the developer's, not hodos's. A tool the project does not have stays `null`, which the reviewer reads as `check: not configured` rather than as a failure.

## Commit convention

`git log -50 --format=%s`. Count the subjects matching `^(feat|fix|chore|docs|refactor|test|perf|build|ci|style)(\(.+\))?!?: ` and those opening with a tracker key (`^[A-Z][A-Z0-9]+-\d+`). The majority form is the proposal and the count is its evidence. No majority is a degenerate convention: the proposal is then `conventional`, shown with both counts, and the developer decides.

## Nested projects

A manifest below the root is a nested project when its commands differ from the root's — workspace member or not. A workspace declaration says how dependencies resolve; it says nothing about which command verifies a change, and the command is what `config.json` exists to record (decision 0060).

List every manifest below the root with the test, lint and typecheck command it declares, and compare each with the root's. A subproject that runs the root's commands takes the root config. One that declares its own test command earns a `.claude/hodos/config.json` of its own, stating **only what it overrides** — `config.mjs find` deep-merges root then nested with nested winning key by key, so a repeated key is a second place to update and a third to forget. The root config lists each one in `nested[]` as a repo-relative directory.

## Adapter candidates

Two sources, and the difference between them is reported rather than smoothed over: a server key in the project's `.mcp.json` is one everybody who clones the repository has, while a server that is merely live in this session comes from the developer's own configuration and a teammate will not have it. Offer both, say which is which, and let the developer commit a `.mcp.json` or leave the role `null`.

Each key is matched against `${CLAUDE_PLUGIN_ROOT}/adapters/<role>/<tool>.md`, and against `.claude/hodos/adapters/<role>/` where the project already wrote its own — those are reported as candidates too, with the value `project:<tool>` the config takes for them.

A tool id in an adapter is prefixed with the server key (`mcp__<server key>__<tool>`), so a server this project named differently is not the shipped adapter with a note attached: it is a project adapter, and `/hodos:adapter` is what writes one. Report it as that, and leave the role `null` until it exists.

A role with no server is `null`: the phase that needs it then reports `Skip: <role> unavailable` rather than improvising.

## Completion

No inventory line is empty, the five briefs are answered, every convention candidate carries ≥2 precedents or is marked an observation, and every recorded command has been run.

## Anti-pattern

A scan that reads the project's documentation instead of its code — docs state intent, the code states what is true. A subagent that returns advice ("consider extracting…") instead of facts. Asking the developer anything this page can answer.

## Bound

One dispatch per area, plus one repeat for an area that came back empty, starting somewhere else. A third dispatch is not run: the area has no convention to find, and that is the finding.
