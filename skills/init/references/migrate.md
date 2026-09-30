# migrate — settle the instructions the project already has

Read on entering step 4, applied at step 8. Input: area E of the scan — one row per instruction found in `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/*.mdc`, `.cursorrules`, `.github/copilot-instructions.md`, `.windsurfrules`, `.claude/**` — **plus any tracked file that names an instruction this ledger retires** (decision **0146**), found by searching the repository for the retired command, path or marker. Output: the ledger table in the report, and after approval the edits it names.

The project has been telling models what to do for a while. Leaving that text in place puts two answers in the context for one question; deleting it loses the reason someone wrote it. The ledger settles each line on the record instead.

## The ledger

| # | Instruction | Where | Settlement | Evidence | What is lost | Approved |

`Approved` is empty at step 4 and filled at step 5, one row at a time; a step-4 table printed with six columns and the flag added on approval is the same ledger. One row per instruction — not per file. A `CLAUDE.md` of forty statements is forty rows; a row is what the developer approves, and a file-level verdict hides the three lines that mattered.

**Evidence** is the instruction's own `file:line` plus the count of places in the code that follow it and that break it. It is a **column**, not a sentence somewhere: a row with no count is a settlement with no evidence, and `delete` is the settlement that needs it most. **What is lost** is written for every settlement other than `retain`, in the developer's terms: name the statement that stops being made and who was reading it.

## The five settlements

- **retain** — the code follows it, the model does not do it unprompted, and it already loads at the right moment. Nothing moves. This is also the default for any row that is not approved.
- **rewrite** — the intent holds and the form does not: a prohibition, a nuance clause, no precedent. It is rewritten in the form of `references/rules.md`, in the home that settlement gives it, and the original retires in the same row.
- **relocate** — right content, wrong load. Always-loaded prose that governs one directory becomes a `paths:` rule; a procedure becomes a skill the developer invokes; a fact for humans becomes documentation with a link from the map. The target must itself load, or sit behind an observable trigger — a `paths:` match, a typed command, a hook. A relocation into a file nothing loads is a deletion with extra steps: record it as `delete` and say so.
- **automate** — mechanically checkable. It becomes a lint rule, a hook, or a CI step, and the prose retires when the check exists and passes — not when it is proposed.
- **delete** — the code contradicts it, or it restates what the model does anyway, or it repeats a fact that now lives in one place. The row still carries "what is lost", because the answer is sometimes "nothing" and sometimes "the only note about a production incident".

## A file that is not an instruction file

A settlement's consequences are part of the settlement. Retiring a command while a contributor doc still tells someone to run it leaves the repository worse than either state, so such a file earns a row — the file, the line, the settlement, what is lost — and the row **says in the question that the file is not init's**. It is approved on its own and **never in the batch**, whatever its settlement, because it reaches past the instruction layer into the project's own documentation.

Two bounds make that safe. The row exists only where the file names an instruction **this** ledger retires; and a file the step-4 ledger did not name is not touched at step 8, however obvious the consequence looks once the retirement lands. A consequence found late is one more row in a later run, or a report line with its `file:line`.

## Files other tools read

`AGENTS.md`, `.cursor/rules/*.mdc`, `.cursorrules`, `.github/copilot-instructions.md` and `.windsurfrules` are read by tools that are not Claude Code. Moving an instruction out of one changes that tool's behavior, and that belongs in "what is lost" before the developer decides. A `.mdc` file's frontmatter globs carry over as the new rule's `paths:` — the scoping decision was already made, and re-deriving it is how a rule silently widens.

## A relocation and its rule are one decision

A rule that relocates an existing instruction is approved with its ledger row, not separately. Approving the rule while the row stays `retain` puts the same statement in two files that both load — which is the duplication this pass exists to remove, now created by the pass itself. Ask them together, and when the developer keeps the original, the rule is dropped with it and the report says which statement stayed where.

## An instruction the developer types

The developer's own sentence is authority, not a proposal: act on it, and do not ask them to confirm what they just asked for. Then **write the row it would have been** — the instruction **quoted**, the paths it reached, the settlement, what is lost — marked `by your instruction` and placed **after** the approved rows, so a reader can see it was asked for rather than approved (decision **0149**). Its **Evidence** is the paths with their counts, exactly as an approved row's is, and its `Approved` cell carries the marker; it is inside the numbers the Completion below counts, because a row nobody counted is the state this pair of rules exists to end. The report carries the same row. A row whose quote does not account for its paths is the failure this rule exists to make visible.

## After the ledger runs

No statement stands in two files that both load. That is the whole point of the pass, and it is checkable: for each retained or relocated row, the other copies are gone.

## Approval and retirement

Rows are approved one at a time, with the proposal and its alternatives — except that **`retain` and `relocate` rows whose target is a rule in the same report may be offered as one batch**, named row by row in the option's own text, because those two change no statement and delete no file — the kernel's invariant and its Completion say the same (decision **0152**). A `delete`, a `rewrite`, an `automate` and every row reaching a file outside the instruction set are each their own approval, whatever else is offered beside them (decisions **0146**, **0152**); the developer's choice may differ from the proposal, and the choice is what is applied. Step 8 applies only approved rows: the replacement is written first, lint is green, and only then does a retirement happen. A file the developer wrote is edited down to what the row says, never removed wholesale unless the row says exactly that.

## Completion

Every instruction has a settlement with its evidence; every non-`retain` row names what is lost; every approved row is applied or listed in the report as not done with its reason.

The table's own shape is checked before the approval, by printing four numbers (decision **0150**): **columns printed, of six** — `Approved` is the seventh and step 5's *done when* is where it is checked — **rows**, **distinct `file:line` the rows name** — equal to the first, because one row per instruction is the rule — and **rows whose Evidence carries no count**, which is zero. All six columns are present, and `Approved` is added at step 5. A run that cannot print those four numbers has a ledger nobody can check, which is how a table's shape ends up being the first thing a long run compresses.

## Anti-pattern

A file-level verdict. A relocation into something nothing loads. Deleting first and writing the replacement after. Applying a row whose approval was assumed from a batch — or, one step further out, editing a file no row named at all. Reporting the ledger and then quietly leaving every row where it was.

## Bound

One pass. A row the developer defers stays `retain` and is named in the report; it is not re-litigated in the same run.
