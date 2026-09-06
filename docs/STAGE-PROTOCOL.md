# Stage Protocol

How one stage of `BUILD-PLAN.md` runs from start to "done" with no architect in the loop. The protocol is hodos applied to building hodos: plan before code, evidence before claims, a fresh reviewer, bounded fix loops, a human at the breaker.

## 1. Start

0. `git tag stage-NN-base` on HEAD — `NN` is two digits, `00`–`12`; this tag is `<stage-base>` for the review diff. Stage 0 creates the repository first (`BUILD-PLAN.md` Stage 0, deliverable 1) and tags after the base commit.
1. Read `CLAUDE.md`, `docs/README.md`, this file, the stage entry in `BUILD-PLAN.md`.
2. Read completely every specification section the stage names (`COMPONENTS.md` entries, `FORMATS.md` sections, `DESIGN.md` sections, `AUTHORING.md`, `PLATFORM-NOTES.md` open checks that the stage resolves).
3. Read `DECISIONS.md` *Proposed*. A proposal the stage entry names, or one whose *Where it lands* is this stage, is **settled at Start** — put its options and recommendation to the user with the rest of the stage's questions. A proposal aimed at a later stage is left alone. Nothing is built from a *Proposed* entry, so an unsettled one that the stage needs is a blocked stage, not a judgement call.
4. Write `docs/stages/NN-plan.md`: the stage's deliverables as tasks (tracer bullets — each produces something runnable), each with files and an acceptance check taken from the stage's criteria; the open platform checks the stage will verify; questions for the user if any spec section is ambiguous. Ask them now, with options and a recommendation, before writing code. Do not guess.

Completion of Start: the plan file exists, no task lacks an acceptance check, no question is open, and every proposal this stage names is taken or declined.

## 2. Build

Task by task: acceptance check first where it is a test → implement → run the check → commit (conventional, "why" in body) → tick the task in the plan file. Three failed attempts on one check → stop, write the diagnosis into the plan file, ask the user.

While building:
- Apply `AUTHORING.md` to every skill, reference, agent, rule. Run the no-op test on each sentence.
- Run `node scripts/lint.mjs` after every skill/reference/agent edit.
- Anything discovered outside the stage → one line in `docs/BACKLOG.md` with evidence. Not into the code.
- A platform fact you verified → `PLATFORM-NOTES.md`, dated, with the command that verified it.
- A design change you need → `DECISIONS.md` *Proposed* + ask the user. Wait for the answer.

## 3. Self-verify

For every acceptance criterion in the stage entry, run the check now and record: the command, the output excerpt, PASS/FAIL. Write them into `docs/stages/NN-report.md` as a table. A criterion you cannot run is FAIL with the reason — never "should work".

No completion claim without a fresh run in this session. "Great, done" before the table is the named anti-pattern.

Criteria that need an interactive Claude Code session (`/plugin`, `/context`, `AskUserQuestion`, session kill and resume, transcript review) are run by the user from `docs/stages/NN-manual.md`, which you write: numbered steps, exact commands, the fixture copy to use, what to paste back. Their evidence is the pasted excerpt, labeled `manual` in the table. Write the manual file before asking; ask once, with all steps.

## 4. Fresh review

Dispatch a fresh subagent (general-purpose, `model: opus`, no conversation history) with `docs/STAGE-REVIEW-PROMPT.md` and the paths: the stage entry, the report, the changed files (`git diff <stage-base>..HEAD --stat`). It re-runs the acceptance checks, audits the text against `AUTHORING.md`, runs lint, and writes `docs/stages/NN-review.md` with a verdict `ACCEPT` / `NEEDS_WORK` / `REJECT` and findings (`file:line`, item, fix).

The review is scored on evidence: a criterion the reviewer could not reproduce is a finding regardless of what the report says.

Fix blockers and majors → commit → dispatch a scoped re-review (findings list + fix diff). Two iterations. Still blockers → **breaker**: present the open findings to the user with options — accept with open findings / continue manually / roll back — and record the choice in the report.

## 5. Report and tick

`docs/stages/NN-report.md` final shape:

```
# Stage NN — <title>
Base: <sha> · Head: <sha> · Commits: <n>
## Acceptance
| # | Criterion | Command | Evidence | Status |
## Fresh review
Iteration 1: <verdict> (<b>/<m>/<mi>) · Iteration 2: <verdict> · Breaker: —
## Platform checks resolved
- <fact> — verified by <command> → PLATFORM-NOTES.md fact <n> / check <letter>
## Backlog added
- …
## Decisions proposed / taken
- …
## Not done
- <anything from the stage entry that is not done, and why>   ← never empty by omission
```

Tick the stage in the **Progress** checklist of `BUILD-PLAN.md` only when every criterion is PASS and the last review verdict is ACCEPT, or the user chose "accept with open findings" at the breaker (record it). Commit the report and the tick together.

## 6. Session boundaries

One stage per session. If the context is compacted mid-stage, `docs/stages/NN-plan.md` is the ledger: trust it and `git log` over memory; continue from the first unticked task. Never re-do a task whose commit exists.

## 7. What the user decides, and only the user

Design changes; new thresholds; accepting a stage with open findings; anything destructive outside this repository; running hodos against a real project (Stage 12). The user also **runs** the interactive steps in `NN-manual.md` — that is an evidence request, not a decision. Everything else is the builder's, and is recorded.
