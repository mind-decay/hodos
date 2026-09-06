---
name: adapter
description: Write one project adapter into .claude/hodos/adapters/ so a phase's role reaches this project's MCP server. The developer runs it as /hodos:adapter <role or what the phase needs>.
disable-model-invocation: true
argument-hint: "<role or what the phase needs>"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

# adapter

One role, one server, one file — so a phase that would report `Skip: <role> unavailable` makes deterministic calls instead. An adapter is the smallest artifact hodos has and the only one that steers a background agent's tool calls, which is why all three questions below are answered before a line is written.

`node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs find`. `notFound` → say `run /hodos:init first` and stop: an adapter is selected by a config this project does not have.

`init` applies the same test in batch, through `skills/init/references/scan.md`.

## 1. Is the server there?

Read the project's `.mcp.json` and the session's own tool list, and say which of the two the server came from — they are not the same fact. A key in `.mcp.json` is one everybody who clones the repository has; a server merely live in this session is the developer's own configuration, and a teammate running the same phase gets nothing.

**In neither → refuse.** Say so, leave the role `null`, and name what the phase will do instead: report `Skip: <role> unavailable` and carry on. A tool id invented to fill the gap turns an explicit skip into a failed call, which is the one outcome worse than having no adapter.

**Live in the session, absent from `.mcp.json` → ask for it to be added first**, and say why: `lint.mjs --project` reads `.mcp.json` to check that every operation names a server that exists, so an adapter written before the file is one the project's own lint rejects.

Every tool id and every argument name is copied from the live schema, never recalled. Where the schema is not in this session's tool list, read it once before writing the line.

## 2. Does a phase call this role?

The roles are closed at eight — `browser`, `docs`, `codeIndex`, `design`, `tracker`, `logs`, `db`, `ci` (`DESIGN.md §3.2`) — because each one is read by a phase reference. A need outside them is a real need, and this project owns two homes for one:

- a command a verifier should run → a `verify.recipes[]` entry of `kind: command` in `config.json`, which needs no adapter at all
- a procedure this project performs the same way every time → `/hodos:skill`

**Outside the eight → refuse**, name which of the two fits, and write nothing. Neither fitting is an answer too — the set is closed, and this skill is not where it opens. Where a ninth role is what the project actually needs, the channel is an issue against hodos naming the role, the operations it would carry and the phase that would call it (decision **0067**): the set opens in the engine, on that evidence, and never by a project editing the plugin's files.

## 3. What does the tool's schema not say?

The no-op test (`AUTHORING.md §2`) applied to an adapter: a line that restates the signature is what ToolSearch already gives free. What earns the file is what a caller learns only by having called it — an argument whose absence costs tokens, a result that is ranked rather than complete, a handle that expires, a limit the description does not carry.

Three sources, in this order: the server's own documentation; the developer, who has hit it; and one **read-only** operation called once, with what it printed recorded. A gotcha with no source is left out.

No gotcha at all → the file is written only when determinism or token cost carries it alone, and the answer says which of the two it is: the phase stops discovering tools by search on every run, or the operation has a cheaper argument shape than the one a model picks by default.

## 4. Confirm, write, check

`AskUserQuestion` with the drafted file and the three answers. On approval write `.claude/hodos/adapters/<role>/<tool>.md`, in the shape of `FORMATS.md §13`:

```
role: browser
server: playwright
navigate: mcp__playwright__browser_navigate {url}
gotchas:
- the ref comes from browser_snapshot and goes stale on navigation
```

Then set the config's entry to the **prefixed** value — `"<role>": "project:<tool>"` — so the value says which directory the file came from, and run both checks:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs check
node ${CLAUDE_PLUGIN_ROOT}/scripts/lint.mjs --project
```

`check` resolves the entry against `.claude/hodos/adapters/<role>/` and **fails on an operation the role names that this file maps to nothing** (decision **0091**): the phase that calls it would take its `Skip:` branch and report nothing, so this run is where the absence is loud. Map it — the tool exists in the session or the operation does not — or, where the server genuinely cannot answer it, say so in `gotchas:` and take the role's mapping out of the config rather than shipping a file that claims the role. The lint checks the shape, the 30-line cap, and that `server:` names a server `.mcp.json` declares. Findings are fixed before this skill returns.

Say that the file is tracked in git — an adapter is team knowledge, like a campaign map — and name the phase that now makes calls instead of reporting `Skip`.

## Completion

Either a file under `.claude/hodos/adapters/`, its config entry written as `project:<tool>`, both checks exit 0, and the three answers in the chat — or a refusal naming the question that failed, with the role left `null` and no file at all.

## Anti-pattern

A tool id from memory. It is the failure this skill exists to prevent: the phase stops saying `Skip` and starts failing, and the failure is inside a background agent nobody is watching.

An adapter written for a server only this developer has, with `.mcp.json` untouched — green here, empty for everyone else on the team.

Gotchas copied out of the schema. The schema is already in the caller's context; the file is for what is not.

A role invented to fit the server. The eight are what phases read, and a ninth turns nothing on until a phase names it.
