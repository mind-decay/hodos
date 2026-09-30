# oracles — where a row may come from, and what decides it

1. The four sources · 2. The detectors · 3. The attacks · 4. The order · 5. The statuses · 6. `## Not covered`

The claims are the plan's. This file is the rest of what a verify run may put in the table: the sources a row is admissible from, the two catalogues that produce those rows, the order they run in, the statuses and severities a row may carry, and the block that states what the run did not cover. Nothing here is judged — every row is a command that ran or an action that was taken, and the developer reads it (`DESIGN.md §7.4`).

## 1. The four sources

A row the plan never asked for is admissible from these four, and its Command cell names the source **in italics and then what was run** — `source *console* · navigate /orders/o-1; list console messages`, never a bare `source: console` (`FORMATS.md §10`). The source says where the row is admissible from; the command beside it is still the row's evidence that something ran:

| Source | The row |
|---|---|
| *console*, *network* | a console error or a failed request on a route this run visited |
| *detector* | a detector hit (§2) |
| *attack* | a crash under one of §3's attacks |
| *pin* | a `verify.recipes[<ui>].checks[]` predicate that no longer holds — the source a project's own config produces, and a config carrying no check produces none (decision **0094**) |

These four and nothing else. A row from a fifth place is a judgement about the code, and a model's judgement of its own observation is the one signal here that has been measured and found unreliable (decision **0093**): rows come from a command's output, a detector's hit, an attack's crash, or a check the project wrote down.

An added row is a row like any other: it is numbered, it is in the header counts, it is in the fix pass, and its status and severity come out of §5 the way every other row's do. The claim cell says what was observed and on which route, because the plan named nothing for it to quote.

**A route that carries a claim row does not fold its noise into that row** (decision **0124**). A console error or a failed request there is its own added row exactly as it is on a route the plan named nothing for, and the claim row's status answers **what the row cites** — the predicate it named, printed or not. A claim whose snapshot showed what it claimed and which was marked `flaky` because the first load logged a `404` for a favicon is a claim this run proved and then lost, and the `pass · pin` `finish` would have offered goes with it (§5, decision **0094**).

## 2. The detectors

Presentation defects — text cut off, a box escaping its column, two controls on top of each other, a focus ring nobody can see. `scripts/detectors.mjs` is two halves, and both are run per route:

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/detectors.mjs source      # the collector, one expression
<the adapter's evaluate, with that expression>               # returns the page as JSON
node ${CLAUDE_PLUGIN_ROOT}/scripts/detectors.mjs decide --allow <every verify.detectors.allow entry>
```

The collector reads properties and compares nothing; the decider is pure and holds every threshold. That split is why the numbers below can be argued with: they are in one function, tested on fixtures, and mutated one at a time.

| Detector | Fires on |
|---|---|
| `overflow` | content wider than its box, in a box that offers no way to scroll to it |
| `clipped` | text cut short with no ellipsis and no line clamp — truncation the page never declared |
| `overlap` | two interactive elements covering each other, which removes one of them from the route |
| `focus` | a control that looks the same focused as unfocused |
| `axe` | the accessibility audit's own violations, passed through with the `impact` it gave them |

**The thresholds**, measured on `bench/fixtures/webapp`'s `/shift` page through the adapter (decision **0109**, the table in `DESIGN.md §7.4`): `overflow`, `clipped` and `overlap` fire past **1px** — the escapes are integers, the rects are not, and 1 is what excludes a rounding and a sub-pixel touch — and `focus` fires below a **2px** ring. `axe` needs none: `lighthouse_audit`'s accessibility category is axe underneath, so the vocabulary is the audit's. Four numbers measured on one page are four numbers measured on one page, and the pilot is where they are read again.

**Rows.** One `fail` row per hit, its Command cell naming the source and its Evidence cell the detector, the element and the pixels. A route the detectors swept with no hit leaves its own trace: the route's `browser` or `viewport` row carries `detectors: 0 hits` in its evidence, so a sweep that ran and found nothing is visible rather than absent.

**Intended defects** are the project's to declare in `verify.detectors.allow` (`FORMATS.md §2`, decision **0107**): `"<detector>:<route glob>"`, `*` as the id standing for all five. A hit an entry matches produces no row and comes back under `allowed`, which is what the route's evidence cell reports as `detectors: 0 hits, 2 allowed`. A hit nobody expected on a page nobody meant to change is what the allowlist exists to make visible by contrast.

## 3. The attacks

The plan-independent class: on the routes the diff resolves to, the application does not crash. The list is closed — these five, in this order, and no sixth invented on the route:

| Attack | How |
|---|---|
| invalid input in every field | `snapshot`, then `fill` each field with a value outside what it takes — a letter in a number, three hundred characters in a short text, an empty required field — then submit |
| permission denied | `stub` the route with an `initScript` that answers the project's own fetch boundary with 403 |
| the network killed, then throttled | `emulate {networkConditions: "offline"}`, reload, then `"Slow 3G"`, reload, then `emulate` back to no throttling |
| a double submit | `snapshot`, then `click` the submit control twice with no wait between the calls |
| a back-and-forward round-trip | `evaluate` `history.back()`, snapshot, `evaluate` `history.forward()`, snapshot — uids expire on every one of those navigations |

**It passed** when all six of these hold: no uncaught exception, no console error, no unhandled rejection, no 5xx, a snapshot that still answers, and exactly one request where one was sent. Any one of them broken is a `fail` row with source *attack*, carrying the attack's name, the route, and the console or network output that shows it.

**Where a route has no form and no submit control**, the first, second and fourth attacks have nothing to act on: the row is `skip: no form on the route`. A skip here is one row per route, not one per attack.

**The surface** is the diff's, not the sweep's (decision **0112**). A route is attacked when the diff touches a file that route renders — the component the project's route table names, or a file that component imports. The direction is **downward from the route's own component and never upward**: a barrel or an entry file that imports the component resolves to no route by itself, or one changed re-export would attack every route in the application. Read the diff, do not predict it: the plan header's `Base: <sha>` and `git diff --name-only <base>..HEAD` give the files, and the route table maps them to routes. A route the sweep visits and the diff does not reach is swept by the detectors of §2 and not attacked: `skip: not attacked — the diff does not reach this route`, one row per route. Where nothing resolves — no route table a reader can follow, or a diff that reaches none of the routes swept — every visited route gets that row and §6 says so. The fallback is never attacking every route: five attacks on four routes is 20 attacks behind a 64-operation sweep, which is the bound this rule exists to set. The argument is the one `when`-gating already makes for recipes: a crash on a route this task never touched is not this task's news.

## 4. The order

Fail fast, and say what did not run. The stages run in this order, and a stage runs only when every stage before it is green:

1. **`command` recipes** — the project's own test, typecheck, lint and build, plus the mutation check on a test the diff added, or on a test line it changed where it added none (decision **0173**).
2. **`http` recipes** — the requests the claims are about.
3. **The browser sweep** — `browser`, `a11y` and `viewport` recipes, the detectors of §2 on every route swept, and the attacks of §3 on the routes §3 resolves from the diff.

A stage behind a red one is not run, and its claims are rows all the same: `skip: not run — <recipe> red`, naming the recipe that went red. The counts still equal the rows, and the verdict is `FAIL` on the red row rather than on the skips.

The reason is arithmetic. A browser sweep is the most expensive thing a verify run does, and a project whose unit tests are red has a defect that the sweep would report as ten confusing rows. The cost of running it anyway is paid on every red run; the cost of skipping it is one line per row saying so.

**`verify.md` is written before the attacks** and rewritten after them (decision **0112**): the attacks are the last and most expensive thing the sweep does, and a table already on disk is what makes a turn bound reached there cost the attacks rather than the whole dispatch. The first write's §6 names them as not yet run.

**The sweep's size** is `scripts/matrix.mjs`: the routes, the states and the widths a recipe declares, covered pairwise rather than crossed.

```
node ${CLAUDE_PLUGIN_ROOT}/scripts/matrix.mjs '{"routes":["/orders"],"states":["empty","many"],"widths":[375,1280]}'
```

Every pair of values appears in some row, which is the stopping point NIST's interaction rule justifies: observed failures come from one parameter or from two interacting. The rows it prints are the rows to run, and its counts go in §6's first line.

## 5. The statuses

Five, and the Status cell carries one of them and then at most one word: `fail · <severity>`, `pass · pin`, or the status alone.

| Status | The row |
|---|---|
| `pass` | the check ran in this message and printed what the row cites |
| `fail` | it ran and did not |
| `flaky` | it failed, passed on **exactly one** retry, and **nothing explains why** — both outputs in the Evidence cell. A failure whose mechanism you can name is a `fail` at its severity, whatever the retry did (decision **0126**) |
| `pre-existing` | a row that fails at head and at the base sha alike, both outputs in evidence (§5.2) — a **command** row by a re-run, a **browser** row by §5.2's bounded `git` proof (decision **0127**) — the plan's own claims included |
| `skip` | it did not run, and the cell says why |

**`pass · pin`** marks a `browser` row whose predicate is worth keeping, and the row has to carry what a pin is made of: the **route** and the `evaluate` predicate in the Command cell, and the **value it returned** quoted in the Evidence cell before the screenshot. Over a role or text, never a class or an id, reaching every element by a query and never by a walk from one — a sibling or child step is what an inserted element breaks (decision **0129**) — and written as a function, `() => (…)`, which is what the adapter runs (decision **0130**). That is what survives a redesign, and `config.mjs check` warns on each of the three (decisions **0118**, **0129**, **0130**). Mark it and nothing more: `finish` is what asks the developer and writes it into `verify.recipes[<ui>].checks[]` (decision **0094**), and a marked row missing one of the three is reported rather than written. A row produced *from* a pin is source *pin* and is not marked again.

**The verdict.** Any `fail` or `flaky` → `FAIL`. A `pre-existing` row fails it too **where the row is a claim the plan made**, and not where nobody claimed it (decision **0120**): the verdict answers for the plan's contract, so a claim that has never passed is unmet whoever broke it, while an added row is news rather than a contract. `skip` never moves it — a skip with a reason is a claim nobody could run. A `flaky` row fails it because a flaky claim recorded as `pass` on its retry is the one outcome that actively misinforms; accepting either is the developer's at the breaker, and that is a recorded choice rather than a status.

### 5.1 Severity, which is read and not chosen

A `fail` row carries `blocker | major | minor` from the row's own source. The same six rows are `FORMATS.md §10`'s — one table in two files, so a change to it is a change to both:

| The row | Severity |
|---|---|
| a claim the plan made — a task's `Acceptance:` clause or a `## Verify plan` line | `blocker`: the plan's contract is unmet |
| an uncaught exception, an unhandled rejection or a 5xx under an attack (source *attack*) | `blocker` |
| a console error or a failed request on a visited route (source *console*, *network*) | `major` |
| a pin that no longer holds (source *pin*) | `major` |
| a detector hit (source *detector*) | `minor` — except overlapping interactive elements and focus not visible, which are `major`, because they remove a control the route offers |
| an `a11y` row, which keeps the audit's own vocabulary | `critical`, `serious` → `major` · `moderate`, `minor` → `minor` |

Read the row, read the table, write the word. A severity argued from how bad the defect looks is the judgement decision **0093** refused one phase earlier, and the fix pass takes the rows in this order (`verify-loop.md §7`), so the word decides what is fixed first.

### 5.2 `pre-existing`, earned at the base sha

A `command`, `typecheck`, `lint` or `http` row that fails may already have failed before this task. Prove it:

```
git worktree add "$TMPDIR/base-<slug>" <the plan header's Base: sha>
ln -s "$PWD/node_modules" "$TMPDIR/base-<slug>/node_modules"   # or the project's own install dir
cd "$TMPDIR/base-<slug>" && <the same command>      # record this output too
cd - && git worktree remove --force "$TMPDIR/base-<slug>"
```

A fresh worktree has **no installed dependencies**, so without the link the command fails for want of a binary and not for the defect — measured 2026-09-07: `npm run lint` in a bare worktree of the `webapp` fixture exits non-zero on the module loader before it reads one file. Link the working tree's install in, and where the command still cannot run, that is **no base run**. Where the diff touches the manifest or the lockfile the link makes the base run incomparable — head's dependencies against base's code — and the row stays a plain `fail` saying so.

Red there as well → `pre-existing`, with **both** outputs in the Evidence cell and the base sha named. Green there → the change broke it, and the row is `fail`. No base run at all → a plain `fail`: no output, no status, which is what keeps this from becoming the excuse column.

**A browser row has no base run** (decision **0119**): a predicate is asserted against a running application, and nothing here raises a second one on the base tree — the environment is the kernel's (`DESIGN.md §7.4`) and a layer's `url` is one port. **It can still have a base proof from `git`** (decision **0127**): `git show <base>:<path>` the files behind the elements the row names, and where their bytes are unchanged *and* the diff touches nothing their render depends on — no shared stylesheet, no shared layout component on the path — the row is `pre-existing`, its evidence naming the base sha, those files, and that the proof was `git` and not a re-run. Where the bound does not hold — the diff moved a stylesheet, or the path runs through a component it changed — the row is `fail · major` and its evidence says `no base run — a browser check needs a second environment`, naming the base sha so the developer can tell a pin this task broke from one the last task did.

**A claim the plan made may hold it**, and it is the sharpest case: a task claims the project's lint is green, lint has been red for a year, and the row can now say whose failure it is instead of only that it failed. §5.1's table still gives that row's severity `blocker`, because severity is a column and not a status, and the verdict fails on it for the reason above. What the status buys is the base output beside the head's, in the row, before the developer decides at the breaker.

### 5.3 A number names the statistic it was read on

A claim whose evidence is a number says which number that is. A **timing** claim runs at least **five** times and reports **median and p95** — never a mean, which one slow run moves and no percentile does (decision **0098**, generalizing **0088**'s rule for a spike's `## Question`). `median 41 ms · p95 63 ms` over seven runs is a row; `41 ms` is a measurement of one run wearing a claim's clothes. A claim that compares two numbers is read against the tolerance the plan names for it, and never against one chosen here (decision **0177**).

## 6. `## Not covered`

The last block of `verify.md` (`FORMATS.md §10`), three lines, always all three, `—` where there is nothing to say:

```markdown
## Not covered
- matrix: routes 1 × states 2 × widths 2 → 4 rows, of 4 in the product
- skips: 7 — no form on the route; 11, 12 — not run: unit red
- residue: the first cross-feature interaction before a neighbor is pinned, aesthetics and product fit, and usability as a person means it
```

**matrix** is what §4's sweep ran: the dimensions, the rows, and the product they were taken from. **skips** names every `skip` row of the table by number with its reason, which is what makes a run's blind spots countable without reading the table. **residue** is fixed text, written exactly as it stands above on every run, and it is the honest part: those three are what this engine does not check by construction, and a report that omits them reads as if it had.

## Completion

Every added row names its source; every hit that produced no row is in an `allowed` count; the block above carries its three lines with the residue verbatim.

## Anti-pattern

A row that says the code looks wrong. The four sources are what may be added, and each of them is something that ran.

A detector threshold argued in the row instead of in `decide`. The number is in one function on purpose; a row that reasons about pixels is a judgement wearing a measurement.

A sixth attack, invented because the route looked interesting. The list is closed, and what is not on it is the developer's to ask for.

Running the browser sweep with a command recipe red, because the sweep is the interesting part. It is also the expensive part, and its rows would be about the red stage.
