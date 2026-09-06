# Contributing to hodos

hodos is mostly prose. The skills, the references, the agent prompts and the rules **are** the engine, and a sentence in them is a behavior change the same way a line of code is. So the bar here is not style — it is evidence.

## Read this first

1. `docs/README.md` — the index.
2. `docs/DESIGN.md` — what the system is and why each mechanism exists.
3. `docs/AUTHORING.md` — how every sentence in the engine is written. Read it completely before changing one.
4. `docs/COMPONENTS.md` and `docs/FORMATS.md` — the contract of the component you are touching, and the exact shape of the file it writes.

## The evidence policy

This is `AUTHORING.md §13`, and it is the rule a pull request is judged on:

- **A wording change to a skill, a reference, an agent prompt, or an engine rule is accepted only with evidence:** an eval result, or a reproducible scenario showing the behavior before the change and after it.
- **Restructuring to comply with a style guide is not evidence.** Neither is "this reads better".
- **Lint must be green.** `node scripts/lint.mjs`.
- **A new cap or a new field goes through `docs/DESIGN.md` first** — see *When it is a decision*, below.
- **Every hook change names its incident** in the file's header comment. The hooks exist because something went wrong once; the comment is where that is kept.

The reason is `AUTHORING.md §2`, the no-op test: *would the model do this without the line?* A sentence that changes nothing is a sentence every later sentence in the same file is read past. `bench/noop/` is the mechanised form of that question — two arms, one with the rule and one with every prose home of it removed, and a line earns its place only when the arms differ.

## Before you open a pull request

`AUTHORING.md §14`, in full:

- [ ] No-op test run on every changed sentence; deleted rather than trimmed
- [ ] Positive form; no nuance clauses
- [ ] Leading words from the glossary; no new coinages without a glossary entry
- [ ] Each step has a completion criterion and a named anti-pattern
- [ ] Invariants in the first 40 lines; references one level deep
- [ ] Within caps; frontmatter in the allowed subset
- [ ] Citations resolve (`node scripts/lint.mjs`)
- [ ] Evidence attached for behavior claims

## Running the checks

```
npm test                      # every script's node:test suite; no model call
node scripts/lint.mjs         # caps, frontmatter, citations, adapters, the hodos- prefix
```

Both are what CI runs, plus `claude plugin validate --strict .` and the fixture jobs. Neither costs a token.

Your machine is not the runner: it has a git identity in `~/.gitconfig` and the
runner has none, so a test that commits can pass here and fail there. Run the
suite the way CI does before you claim it green:

```
GIT_CONFIG_GLOBAL=/nonexistent GIT_CONFIG_NOSYSTEM=1 npm test
```

The benches do cost tokens, and their scoring half does not:

```
node bench/router/run.mjs --check-labels      # the set is self-consistent — free
node bench/review/run.mjs --check-key         # free
node bench/noop/run.mjs   --check-scenarios   # free

node bench/router/invoke.mjs --out <dir> --concurrency 5   # calls the model
node bench/review/invoke.mjs --out <dir>                   # calls the model
```

`docs/BENCH.md` says what each number is, which of them are gates and which are measurements, and what none of them prove. Read it before quoting one.

Every script is zero-dependency Node `.mjs` with `node:test` tests beside it, and the test is written **before** the implementation: the failing run is part of what a change is judged on. There is no bash and no Python in the engine.

## When it is a decision, not a change

A new field, cap, phase, file, threshold, or dependency — or a deviation from a component contract — is a **decision**, and decisions are recorded before they are built:

1. Write a *Proposed* entry in `docs/DECISIONS.md`: context, options with their costs, a recommendation, and what it costs if the choice is wrong.
2. Open it for discussion. Nothing is implemented from a *Proposed* entry.
3. When it is settled it becomes a numbered entry with the date, and `DESIGN.md` / `COMPONENTS.md` / `FORMATS.md` are updated in the same commit.

Every decision carries an **Applied in** line naming every file the change touches. That line is the checklist: a condition changed in one place and left standing in another is the failure the line exists to prevent.

## Commits

Conventional commits, imperative subject, and the **why** in the body — not a restatement of the diff. No trailers of any kind.

## Testing against a project

Use `bench/fixtures/`. `node bench/scripts/fixture-copy.mjs <fixture>` gives you a throwaway git repository seeded with three commits, and `claude --plugin-dir /path/to/hodos` inside it runs your checkout. Do not develop against a repository whose loss would matter.

## License

By contributing you agree that your contribution is licensed under the MIT license, like the rest of the repository.
