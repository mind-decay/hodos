---
name: skill
description: Write one project-specific skill into .claude/skills/ — a procedure this project needs that hodos does not ship, such as regenerating an API client or cutting a release. The developer runs it as /hodos:skill <what the procedure does>.
disable-model-invocation: true
argument-hint: "<what the procedure does>"
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

# skill

One procedure this project performs the same way every time, written down where the model will find it. Not a rule — a rule says what the code must look like, a skill says what to do — and not a hodos phase.

`node ${CLAUDE_PLUGIN_ROOT}/scripts/config.mjs find`. `notFound` → say `run /hodos:init first` and stop.

## 1. Is it a skill at all

Three answers before a draft, each in the chat:

- **Is it a procedure with steps that have an order?** A fact about the code is a rule. A convention is a rule. A sequence of commands and decisions is a skill.
- **Does the project do it more than once?** A one-off is a task. A release, a client regeneration, a data migration, a fixture refresh — those recur, and each recurrence pays for the file.
- **Does hodos already own it?** Routing, planning, execution, review, verify, finish, init, status, campaigns are the engine's. A project skill that wraps one of them drifts from it on the next plugin upgrade. Say so and stop.

Any of the three failing → say which, and write nothing.

## 2. Learn the procedure before writing it

The developer knows it; the repository proves it. Read the scripts, the CI workflow, the Makefile targets and the recent commits that performed it, and cite what you found by `file:line`. Then ask only what the repository could not answer — the ordering that is not in a script, the thing that goes wrong, the step someone always forgets.

A step written from a guess is the step that fails at 2am. Where a command is uncertain, run it once, in a way that changes nothing, and record what it printed.

## 3. The form

`.claude/skills/<name>/SKILL.md`, kebab-case, named for the procedure. Frontmatter is the subset of `AUTHORING.md §8` and nothing else:

```yaml
---
name: regenerate-api-client
description: Regenerate the typed API client from the OpenAPI schema and land the diff. Run it as /regenerate-api-client after the backend schema changes.
disable-model-invocation: true
---
```

The body, in this order and nothing more:

1. **What it owns**, in one sentence — and what it does not.
2. **Inputs by path**: the files and commands it reads, exactly as they are spelled.
3. **The steps**, numbered, each with its command and how to tell it worked. A step whose success cannot be checked is a step that silently did nothing.
4. **The completion criterion**: one checkable sentence.
5. **The anti-pattern**: what goes wrong when someone does this from memory.

Positive recipes throughout — what to do, not what to avoid. 100 lines is the cap; a procedure that does not fit is two procedures.

## 4. Confirm, write, register, check

`AskUserQuestion` with the drafted file. On approval write it, then add one line to the project's `CLAUDE.md` map under the skills it lists — a skill nobody knows about is never invoked — and run:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/lint.mjs --project
```

Cap, frontmatter subset, and every `file:line` in the file. Fix what it finds before returning.

## Completion

A file under `.claude/skills/<name>/`, a line for it in the CLAUDE.md map, lint green — or a refusal naming which of the three questions failed, and no file.

## Anti-pattern

A skill that restates what the model already does: "write clean code", "run the tests".

A skill wrapping a hodos phase. It forks the engine's procedure into the project and stops receiving its fixes.

Steps without checks. The procedure exists because someone got it wrong once.
