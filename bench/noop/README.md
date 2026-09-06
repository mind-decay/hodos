# No-op bench

`AUTHORING.md §2` asks one question of every sentence in the engine: **would the
model do this without the line?** This bench answers it with a control.

```
node bench/noop/run.mjs                                  # the set is self-consistent
node bench/noop/run.mjs --invoke --out <dir> --dry-run   # what each arm would run
node bench/noop/run.mjs --invoke --out <dir>             # both arms, every scenario
node bench/noop/run.mjs --observations <dir>/observations.json
```

## The two arms

Each scenario names **one rule** — every file and line that states it — a prompt
that exercises it, and a check the rule is supposed to make true. The run makes
two arms against two copies of this repository as it is published, one with the
rule and one with every home of it removed, and the scenario **passes only when
the with-arm meets the check and the control does not**.

Every home, not one line, because run 1 (2026-09-03) scored 0 of 6 and the
reason was the copy rather than the model: the plugin ships its own
specification beside the skills that restate it, and one control quoted
`docs/COMPONENTS.md:47` back as the source of the rule it had just obeyed
(decision 0073). A home embedded in a line that carries other rules names a
`replaceWith` — the same line with the rule's clause taken out — so the control
loses the rule and nothing else. The copy also leaves out `docs/stages/` and
`research/`, which decision 0064 does not publish.

The without-line arm is the control, and it is *expected to fail*. That delta is
the whole signal: without it, "the behavior differed" is the reader's judgement
rather than a result, and a line that changes nothing reads as a line that
works (decision 0019). A control that also passes is reported as a **failed
scenario**, not as a scenario with no opinion.

## A scenario

```json
{
  "id": "route-value-grammar",
  "lines": [
    { "file": "skills/task/references/route.md", "line": "**Values.** Each value is `yes`, `no`, a single number, …" },
    { "file": "docs/FORMATS.md", "line": "The nine rows are fixed. Each `Value` is …", "replaceWith": "The nine rows are fixed, and every row carries evidence." }
  ],
  "probe": "is `yes`, `no`,? (a )?(single )?number",
  "behavior": "every Value cell the router prints is one of the four forms the rules can read",
  "incident": "router run 1 produced `1–2`, `~12` and `yes, if acted on`",
  "setup": { "kind": "fixture", "fixture": "webapp", "config": true },
  "prompt": "/hodos:task Add an order summary widget above the order list: …",
  "check": { "kind": "rows", "pattern": "^(yes|no|unknown|[0-9]+)$" }
}
```

`--check-scenarios` (the default) holds the set to what makes it measurable:
every named line is in its file **exactly once** — a line the file carries twice
would take two behaviors with it — a `replaceWith` is never the line itself, the
check is one of the six kinds below, and the **probe sweep** builds the control
copy and reads every prose file of it for `probe`. A statement of the rule the
scenario has not declared in `probeAllows` is a problem *before a session is
bought*: that check costs nothing and it is what found `skills/init/SKILL.md`'s
own `description` restating `task-preflight-stop`'s whole rule.

Two things are outside the sweep by choice. `DECISIONS.md` records how the
engine came to say what it says, and deleting the reasoning removes a reader's
history and no behavior. And **the harness deletes prose, never code**: a rule a
script enforces stays enforced, and a control that passes for that reason has
answered `AUTHORING.md §2`'s question — the prose is redundant with the script.

| Check | True when |
|---|---|
| `transcript` | the pattern is in what the session printed |
| `transcript-absent` | it is not |
| `file` | the pattern is in a file the arm collected; `@git-status` is collected for every arm |
| `rows` | every `\| row \| evidence \| value \|` cell the session printed matches the pattern, and at least one row was printed |
| `metric` | a number the arm measured (`evidenceCalls`, `toolCalls`, `turns`) is at or under `max` |
| `path-absent` | the run left nothing at that path in the workspace |

Patterns are read line by line; a check that has to hold for a whole string sets
`"flags": ""` and anchors it.

**What a scenario may test.** A line whose removal is checkable from what the run
left behind: a refusal that must fire, a file that must be written, a value that
must be in a grammar, a budget that must hold. A line whose effect is register or
thoroughness is not a scenario here — the control cannot fail it, and a control
that cannot fail is the objection decision 0019 was written against.

## The six

| Scenario | Homes | What the rule is for |
|---|---|---|
| `route-value-grammar` | 2 | the four value forms the verdict rules can read |
| `route-print-then-ask` | 2 | the verdict is printed before the confirmation is asked for |
| `route-evidence-budget` | 7 | ≤5 evidence calls (decision 0029) |
| `task-preflight-stop` | 8 | no hodos layer → say `run /hodos:init first` and stop |
| `reviewer-writes-one-file` | 3 | the reviewer writes `review.md` and leaves the tree as it found it |
| `run-unknown-slug` | 1 | an unknown slug is a question, never a new task directory |

Three of the six are rules `route.md` carries: it is the file with the most
recorded incidents, and each of the three names its own. The spread of homes —
one rule stated in seven places, another in one — is itself the finding run 1
paid for.

`task-preflight-stop` is **unmeasurable and the set says so**: Claude Code lists
every skill's `description` to every session, and `skills/init/SKILL.md`'s says
"Run before the first `/hodos:task`". No control can take that away. It is kept
with its `probeAllows` and the reason, because a scenario that records why it
cannot be measured is worth more than a scenario quietly deleted.

## The gate

| Axis | Threshold | Kind | Set at |
|---|---|---|---|
| scenarios showing a delta | *unset* | gate | not yet — two runs could not set one |
| turns and evidence calls per arm | — | measurement | recorded per run |

`COMPONENTS.md §7`, decision 0019: the threshold is set from the first real run
and cites the run it came from, rather than being invented before there is data.
Stage 11a bought two runs and neither could set one. Both read **0 of 6**, the
second with a control that provably removes the rule from every prose home it
has, and the arms differed only in effort — `task-preflight-stop` took 2 turns
with its rule and 18 without. Turns and cost are measurements decision 0019
forbids gating, so the delta the bench can see is not one it may gate on. A
threshold of zero is a gate that cannot fail, which is worse than none because
it looks like one.

Until it is set, `--observations` reports the rate and gates nothing, and
`--json` is refused — a report carrying a gate nobody decided is worse than no
report. `runs/2026-09-03/` and `runs/2026-09-03-2/` carry both runs.

## What it costs, and how it is run

Twelve headless sessions, two per scenario — `$5.94` for run 1 and `$6.12` for
run 2. Two of them stop almost immediately by design (`task-preflight-stop`,
`run-unknown-slug`), and one pair dispatches the reviewer through the review
bench's own package copy.

There is **no clean-profile arm**: a fresh `CLAUDE_CONFIG_DIR` is
unauthenticated rather than clean, `--settings '{"enabledPlugins":{}}'` does not
suppress a plugin's `SessionStart` hook, and `--bare` bills the API instead of
the subscription window these costs are written against
(`docs/stages/11a-plan.md` D5). Each run's README records what was enabled while
it ran instead, and a comparison between two runs states whether that list was
the same.

The scorer makes **no model call** — `run.test.mjs` is the proof — and
`--invoke` is the only half that does (decision 0019).
