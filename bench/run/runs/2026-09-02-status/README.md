# status on a project with something wrong in it — 2026-09-02

Stage 8 criterion 2. A `fixture-copy.mjs` of `webapp` seeded with
`seed.mjs orders-summary --at approved`, then given the other three conditions
the criterion names:

- a second task `users-export` at phase `execute`, its `ledger.md` mtime set to
  2026-08-12 (21 days, over the `staleDays` 14 the config carries);
- a dead precedent appended to `.claude/rules/query-key-factory.md` — a
  `file:line` pointing at `src/features/orders/keys-legacy.ts:12`, which the
  project does not have;
- a `history.jsonl` of five finished tasks, two of them with `upgrades > 0` and
  two with `overrode: true`.

One session, 11 turns, **$0.46**.

`report.md` is the whole run. What it produced, against what the criterion asks:

| Asked | Produced |
|---|---|
| the active task | `orders-summary [approved]`, with its resume command |
| the stale task, with an action | `users-export`, 21 days, phase and last ledger line, **fold** or **delete**, deleting nothing without an answer |
| the lint violation, with an action | the lint line quoted, the dead precedent read out, a live line offered to re-point it at (`api.ts:19`), or the rule nominated for deletion |
| upgrade rate 2 of 5 → 40% | `2/5 (40%) · status-label, orders-export` |
| — (decision 0046) | override rate `2/5 (40%)` beside it, and the four gap texts newest first |

It also ran `config.mjs check` (`config: ok`) and `ledger.mjs sessions`
(`no session pointers`), and closed by naming the two answers it is waiting on.

Beyond the criterion, it read the four gap texts as a group and named what they
share — every one is a plan that did not name a default value or an owner — and
left the conclusion to the developer, which is the line `status` §6 draws.

## One contaminant, recorded rather than removed

The register of this transcript is not hodos's. A plugin enabled on this
machine (`caveman@caveman`) ships a `SessionStart` hook, and plugin hooks fire
in **every** session where the plugin is enabled, headless bench runs included
(`PLATFORM-NOTES.md` fact 9). Its stdout reaches the model as context and asks
for clipped prose, which is why the report reads "dir hold" and "not exist".

It changes no number and no section, and every claim above is checkable in the
output. It does mean this stage's live runs are not evidence about the prose a
hodos skill produces on a clean machine. Recorded as a backlog item for Stage 11,
which owns the bench and has to control for the operator's own plugins.
