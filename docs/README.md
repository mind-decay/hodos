# hodos — documentation index

| Document | Role | Read when |
|---|---|---|
| `STAGE-PROTOCOL.md` | How a build stage runs: start → build → self-verify → fresh review → report → tick | every session |
| `BUILD-PLAN.md` | 12 stages, deliverables, acceptance criteria, **Progress** checklist | every session |
| `DESIGN.md` | The system: principles, architecture, workflow, state, quality mechanisms, hooks, tokens, glossary | the sections the stage touches |
| `COMPONENTS.md` | Contract of every skill, reference, agent, script, hook, adapter, source, eval | when building that component |
| `FORMATS.md` | Exact file shapes: config, brief, research, plan, ledger grammar, state, review, verify, campaign map, digest, adapter, source, handoff, environment diagnosis | when writing or parsing that file |
| `AUTHORING.md` | How text is written: no-op test, positive recipes, leading words, caps, frontmatter, rule test, evidence policy | before writing any skill/reference/agent/rule |
| `PLATFORM-NOTES.md` | Verified Claude Code facts, open checks with fallbacks, dated | when a component depends on platform behavior |
| `DECISIONS.md` | Append-only decision record (English); *Proposed* section for changes awaiting the user | when a design change is needed |
| `00-decisions.md` | The approved decision log from the design phase (Russian) | for rationale behind a rule |
| `BACKLOG.md` | One-line items with evidence, discovered outside the current stage | when you find something out of scope |
| `STAGE-REVIEW-PROMPT.md` | The prompt for the fresh stage reviewer | when dispatching the stage review |
| `stages/NN-plan.md`, `NN-report.md`, `NN-review.md` | Stage plan (the stage's ledger), report with evidence, fresh-review verdict | during and at the end of each stage |
| `BENCH.md` (Stage 11), `PILOT.md` (Stage 12) | How to run the bench and its thresholds; pilot measurements | those stages |
| `../research/01..04` | Evidence base: prior attempts, official docs, community systems, Pocock's skills | when a design choice needs its source |
| `../research/05-architecture-review.md` | Architecture review at Stage 6 (2026-09-01): findings with `file:line`, platform delta, ecosystem comparison, ranked proposals P1–P20 | when planning Stages 7–12 or pulling an item into `BACKLOG.md` / `DECISIONS.md` |
| `../research/06..09` | Outside systems read against the design: Greptile (review), basemode (state and hooks), codesight (generated text), and QA practice against the verify phase | when a proposal cites one |

## Where these files live

Two of the rows above resolve only in the **build repository**, `mind-decay/hodos-build` (decisions **0064**, **0102**): `../research/` and `stages/`. A marketplace install clones the public repository onto every installing machine, and neither the evidence base nor seventeen stage records is something an installer reads — while the evidence base is a survey of repositories that are not this project's to publish. Everything else in this table is public, and nothing in the **engine** cites what is not: a citation from a skill, a reference or an agent into `docs/stages/` fails `node scripts/lint.mjs` **in the exported tree**, where that path resolves to nothing — which is why the `export` job runs lint there and not only here.

The public history begins at `v0.1.0` and is written by an export the build repository runs at each release — `tools/`, which is itself not exported. The export refuses to write a tree carrying one of the names the scrub removed, an absolute path into somebody's home, or a tracker id written with an uppercase prefix (decisions **0064**, **0104**) — which is what makes the scrub a check rather than a promise. A lowercase prefix is out of the pattern on purpose, because it cannot be told from an ordinary hyphenated word.

## Current stage

See the **Progress** checklist at the top of `BUILD-PLAN.md`. The first unchecked stage is the current one. A stage is checked only after its report in `stages/` shows every acceptance criterion PASS with evidence and the fresh review verdict is ACCEPT — or the user chose *accept with open findings* at the breaker, which the report records along with the criteria left open and what would close them (`STAGE-PROTOCOL.md §4–5`). A checked stage with open criteria carries them in its Progress line.

## Reading discipline

Read a specification section completely when the stage enters it; a skim made earlier does not count. If a section is missing something you need, that is a decision (see `DECISIONS.md`), not a guess.
