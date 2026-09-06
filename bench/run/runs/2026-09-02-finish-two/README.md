# Finish, the rule-proposal arm — 2026-09-02

Stage 8 criterion 1, the `≥2 occurrences` half. `seed.mjs orders-summary --at finish
--rule-arm two`, then `/hodos:run orders-summary` headless.

One session, 21 turns, **$0.84**.

What the phase did, in order: claimed the task, read `finish.md`, folded
`review.md` and `verify.md` into `plan.md#Outcome` from their own headers,
deleted both, greped for the finding's pattern, proposed one rule with two
`file:line`s, wrote `Finish: report delivered`, and stopped at the deletion
gate without deleting anything.

- `outcome.md` — the appended section. The counts are the two headers' own.
- `report.md` — the chat report, every section present, `Upgrades (0): —` and
  `Fixed after the last review: —` written rather than omitted.
- `history.jsonl` — `overrode: false`, one `gapTexts` entry, and `usage` over
  **one** session: the seeder hands `ledger.mjs` no session id, so the seeding
  session is not counted as one that worked the task.
- `state.json` — `phase: done`.

The proposal names both occurrences and checks the rules the project already
has: "Not covered by `api-error-propagation` (the error stays an ApiError) or
`error-role-alert` (the surface carries role="alert") — neither says what the
surface shows." Nothing was written to `.claude/rules/`: the accepted-proposal
path invokes the `rule` skill, and no acceptance is possible headless.

`git status --porcelain` in the copy is empty afterwards.

## The arm this replaced

The first run of this arm used a finding about `.toFixed(2)` and correctly
proposed **nothing** — the plan's `### Refactor in scope` names that exact line,
so the finding traces to a refactor the plan put in scope rather than to a
missing convention, and question 1 of `finish.md §5` refuses before the count is
reached. The kernel said so with the plan section quoted. The arm was retargeted
at a pattern no plan section mentions; the phase was not changed.
