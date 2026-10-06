# UX audit

**Where does a developer meet hodos, and which of those places are broken?**
This directory answers it without a model call: `scenarios.json` inventories
every touchpoint, and `run.mjs` holds the inventory to the engine as it stands.

```
node bench/ux/run.mjs                        # every scenario resolves (the default)
node bench/ux/run.mjs --count                # the broken scenarios, one number
node bench/ux/run.mjs --count --node <owner> # the ones an owner node's findings break
node bench/ux/run.mjs --report               # the findings by owner, worst first
```

It is an audit, not a bench (`docs/BENCH.md`): it reads the engine's text, runs
no engine script and calls no model, so it has no arms, no gate and no
measurement. Engine files are read relative to the current directory, which is
the repository root for every caller. Exit 0 means every scenario resolves, 1 a
problem or a set that cannot be read, 2 a bad invocation. Under `--count` and
`--report` a problem goes to stderr and stdout stays empty, so the campaign's
measure keeps its previous value and no ranking is printed over evidence lines
that no longer stand.

## A scenario

A scenario is one **journey** crossed with one **touchpoint**: an exit, a gate,
a message a hook or a script prints, or a proposal of the next step.

```json
{
  "id": "run-finish-report", "journey": "continue", "touchpoint": "the finish report",
  "trigger": "a run session delivers its report", "channel": "screen",
  "where": { "file": "skills/run/references/finish.md", "section": "## 6. The report" },
  "findings": [{
    "id": "finish-no-next", "rubric": "R2", "severity": "blocker", "owner": "next-line",
    "says": "the report ends without the command that continues …",
    "evidence":  { "file": "skills/run/references/finish.md", "line": "Proposals: <rule or convention proposals …>" },
    "fixedWhen": { "file": "skills/run/references/finish.md", "section": "## 6. The report", "present": "^Next: " } }] }
```

- **journey** — `set-up`, `start`, `continue`, `recover`, `orient`, `hand-over`,
  `review`, `campaign` or `lost-thread`.
- **channel** — `screen` when the model prints it in chat; `context` when it
  reaches only the model, which acts on it; `both`; `unverified` when it reaches
  the model and no platform fact says whether the developer's screen shows it
  (`docs/PLATFORM-NOTES.md`, check O).
- **owner** — the `hodos-ux` node that fixes the finding, or `unowned`, which the
  campaign's advance decides.
- **severity** — `blocker`, the flow leaves hodos or dead-ends; `major`, the
  developer must recall or decode something; `minor`, wording.

A scenario with no findings is a touchpoint that was looked at and holds.

## What the checker holds

A finding is **judged** when `fixedWhen` is null, **fixed** when it holds, and
**open** otherwise. A scenario is **broken** when it has an open finding, and
`--count` counts broken scenarios only — a judged finding is kept and never
counted, so the number moves when the engine changes and never when a label is
edited.

- **Evidence.** For an open or a judged finding, `evidence.file` carries
  `evidence.line` exactly once, compared trimmed. An engine edit that moves the
  line fails `npm test` until the inventory moves with it. A fixed finding's
  evidence is history and is not checked: its fix may have rewritten the line.
- **`fixedWhen`.** One of `present` or `absent`, a regex compiled with the `m`
  flag. With `section`, it reads the lines under that heading, up to the next
  heading of the same or a higher level. A heading is a line matching
  `^#{1,6} \S` at column 0 and outside a fence; a fence opens and closes on a
  line matching `^\s*(```|~~~)`. Engine references quote whole documents in
  fences, headings included, and a quoted heading ends no section.
- **Every file.** Each `skills/**/*.md`, `agents/*.md`, `hooks/hooks.json` and
  non-test `scripts/*.mjs` is a scenario's `where.file`, or is in `exempt[]`
  with a reason no developer meets it there. A new file fails the check until
  someone decides which.
- **The lists.** Ids are unique; every journey, channel, rubric item, severity
  and owner comes from its list.
- **The keys.** A finding and a `fixedWhen` carry only their own keys, and a
  finding always carries `fixedWhen` — `null` when it is judged. A misspelled
  key read as a default would move the count with no engine change: a missing
  `fixedWhen` would turn an open finding judged, and a misspelled `section`
  would widen the regex to the whole file.

## Writing a finding

**A `fixedWhen` states a property a binding row of the `hodos-ux` map already
states**, never a mechanism a node has not chosen. Today that is D1's `Next:`
line at an exit, D3's verdict above its evidence at a gate, D4's chat in the
developer's language with what a program reads left as written, D7's landing
asked with its commands rather than printed, D8's recommended option, D9's
file and next step at a bound or a guard, D10's place in the flow and its
command wherever hodos state is shown, and D11's plain words on a printed
line, in the printed form `DESIGN.md §14` gives a leading word. A property
only behaviour can show — the model invoking a skill on a go-ahead — makes the
finding judged. A regex can be met formally; the review is what catches it.
A judged finding is removed when its node's evidence shows it fixed — a saved
transcript the node records as a platform fact — and until then it stays, with
its evidence line moved whenever the engine moves it.

**On an `unverified` channel, a finding holds whether or not the developer sees
the text.** An offer that names no command is wrong either way; a word the
developer may never read is not a finding there. The checker never reads
`channel` to decide `broken` or `--count`.

## The rubric

Ten items, each drawn from the sources it cites. The synthesis is this
directory's and can drift from them; the sources are what to re-read.

| # | Item | Sources |
|---|---|---|
| R1 | state is visible | Nielsen 1; clig.dev *Make it easy to see the current state of the system.* |
| R2 | next step named | Nielsen 6; clig.dev *Suggest commands the user should run.*; decision 0081 |
| R3 | plain words | Nielsen 2; clig.dev *Human-first design* |
| R4 | answer first | Nielsen 8; clig.dev *Consider where the user will look first.*, *Saying (just) enough* |
| R5 | consistent | Nielsen 4; clig.dev *Consistency across programs* |
| R6 | recover from errors | Nielsen 9, 3; clig.dev *Catch errors and rewrite them for humans.* |
| R7 | cheap invoke, dismiss, correct | Amershi G7–G9; Horvitz 6 |
| R8 | act on clear intent, ask when unsure | Horvitz 2, 5, 8; Amershi G10 |
| R9 | remember recent interactions | Amershi G12; Horvitz 11 |
| R10 | say why and what changed | Amershi G11, G16; clig.dev *If you change state, tell the user.* |

- **Nielsen**, *10 Usability Heuristics for User Interface Design* —
  https://www.nngroup.com/articles/ten-usability-heuristics/ (published
  1994-04-24, last reviewed 2024-01-30; fetched 2026-10-04).
- **Amershi et al.**, *Guidelines for Human-AI Interaction*, CHI 2019, Table 1 —
  https://www.microsoft.com/en-us/research/wp-content/uploads/2019/01/Guidelines-for-Human-AI-Interaction-camera-ready.pdf
  (fetched 2026-10-04).
- **Horvitz**, *Principles of Mixed-Initiative User Interfaces*, CHI 1999, the
  twelve critical factors — https://erichorvitz.com/chi99horvitz.pdf (fetched
  2026-10-04).
- **Command Line Interface Guidelines** — https://clig.dev (no version shown).
  Every quotation above was re-read on the page on 2026-10-04. One reads against
  R4's name: after *Consider where the user will look first.* the page goes on,
  *Put the most important information at the end of the output.* — for a
  terminal, the end is where the eye lands. R4 cites it for the principle, and
  D1's `Next:` line at the end of an exit is the same reading.

## The metric

`--count` is the third done-metric of the `hodos-ux` campaign (map D5,
decision 0188), and `--count --node <owner>` is each owner node's share of it.
`campaigns.mjs measure` takes the command's whole stdout as the value, which is
why `--count` prints one integer and nothing else.
