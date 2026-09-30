# `run` harness

Approved plans the `run` kernel is exercised against, and the seeder that
installs one into a throwaway fixture copy.

```
node bench/run/seed.mjs <plan> [--fixture webapp|mono] [--gap] [--autonomy ask|rulings]
                               [--into <dir>] [--at approved|review|verify|finish]
                               [--defect <id>]… [--rule-arm one|two]
```

It prints `{ copy, slug, branch, base, tasks }`. The copy is at
`state.phase == "approved"` with the branch checked out, so
`claude -p "/hodos:run <slug>"` inside it starts where session 2 starts.

**Every headless arm that reaches the verify phase sets `CLAUDE_CODE_PRINT_BG_WAIT_CEILING_MS=0`.** Print mode kills a background task at 600 s and still reports `result.subtype: "success"` with `is_error: false` (`PLATFORM-NOTES.md` fact 52), and a verifier dispatch is a background task: Stage 11d-2's arm 2 was terminated after 68 browser operations, wrote no `verify.md`, and cost $2.79 to say so. A record whose ledger carries no `Verify` line is a stop, whatever the result line says.

**Release the browser before a browser arm.** One `chrome-devtools` MCP server
runs at a time — they share `~/.cache/chrome-devtools-mcp` — so an arm launched
while the operator's own session holds the adapter reports
`chrome-devtools MCP adapter failed to connect (CONNECT_TIMEOUT), retried once`
and puts every browser claim in `skip`. The verdict that comes back is green over
the rows that could run, which is correct and is not the arm you bought
(`PLATFORM-NOTES.md` fact 53).

**Read an arm's artifact for a marker before you read its numbers.** Until
2026-09-07 the marketplace build of this plugin (`hodos@hodos`, **0.1.0**,
commit `686b8d9`) was installed and enabled in the user's settings, so a
session started with `--plugin-dir` at this repository had two builds of it
available and the resolution order decided which answered. It is uninstalled
and its marketplace removed — `claude plugin list` names no hodos — so an arm
run after that date has one build to find. The marker check stays because it
costs nothing and answers the question from the artifact rather than from the
invocation: 0.1.0's verifier contains `pre-existing`, `flaky`, `attack` and
`Claim feedback` zero times each and ships no
`skills/run/references/oracles.md`, and its reviewer contains `Unclaimed` zero
times. A `verify.md` whose header has no `flaky` column, or a `review.md` with
no `Unclaimed` word, is not a run of this tree. Re-installing it for the pilot
brings the two-build condition back.

**The `webapp` copy serves its own `/api`** (decision **0123**): three orders —
`o-1` Ada 10.10 open, `o-2` Grace 20.20 paid, `o-3` Alan 31.20 cancelled — so
`/orders` renders `3 orders · 61.50` and `/orders/o-1` renders a detail. A route's
failed-request row in an arm's `verify.md` is therefore about the task's own
code; before this the fixture produced one on every route. An error state is
reached by asking for an order that is not there.

**A harness, not a bench** (decision 0033). It produces inputs and scores
nothing: no gate, no measurement, no threshold. `router/`, `review/` and
`noop/` are the scored sets.

## The plans

| Plan | Path · tasks | What it is for |
|---|---|---|
| `orders-summary` | standard · 3 | The whole task loop: two test-first tasks and one `visual` exemption, and a diff wide enough for the simplify pass to have something to walk. Also the resume case (kill after `Task 1: done`) and, with `--gap`, the plan hole. Its `## Verify plan` is the only one with browser claims, so it is what `--at verify` seeds for the verify loop. |
| `duplicate-customers` | quick · 1 | A correct-but-bounded form. `D1` chooses the quadratic scan against the list's ceiling, so the pass declines the cut and writes the `hodos:` marker. |
| `status-label` | quick · 1 | A diff with nothing to cut: three strings in a checked `Record`, read by the two views that spelled the status themselves. The pass closes with `Lean already.` |
| `status-label-two-sources` | quick · 1 | A plan that contradicts itself: Goal, Non-goals and D1 choose the service's field, T1's acceptance clause requires a front-end table. Built to exhaust the review loop; the kernel reads both and stops at the gate instead, which is `runs/2026-09-01-breaker/` §2. |
| `status-label-frozen-lint` | quick · 1 | `status-label` with the project's lint configuration frozen in its Non-goals. With `environment/broken-eslint-config.patch` committed before the base, the reviewer finds a major no reading of the plan predicts and no fix inside the task closes, and iteration 2 comes back not-`ACCEPT`. The route to the breaker. |
| `orders-summary-frozen-store` | standard · 3 | `orders-summary` with `src/features/orders/model.ts` and its suite frozen in `## Non-goals`, and `D3` recording why: a parallel branch is rewriting the module. Its `## Verify plan` asks for a green test command rather than two named suites. With `--defect orders-frozen-store-and-attr` two claims break at once — one the fix pass closes inside the task, one whose fix the plan bars — which is the route to two `Verify … FAIL` lines and the breaker. |
| `grid-columns` | quick · 1 | An acceptance check that cannot pass, and whose impossibility no reading of the plan reveals: vitest's default `css: false` means an imported stylesheet never reaches jsdom, so `getComputedStyle` returns nothing, and `## Non-goals` closes the two ways out — an inline style and a change to `vite.config.ts`. The plan is internally consistent; only running it finds the wall. The three red-check attempts and the stop. |
| `home-shift-link` | quick · 1 | The pin's first task (decision **0094**): the landing page gains a navigation landmark, and its `## Verify plan` browser claim is over the two link texts — a predicate the verifier can prove, mark `pass · pin`, and hand to `finish` to write into `verify.recipes[ui].checks[]`. `/` needs no API, which is why the claim can actually pass in this fixture (`BACKLOG.md`: every data route renders its error state). Added at Stage 11d-3. |
| `home-shift-wording` | quick · 1 | The pin's second task: the same two links, reworded to the floor's words, which is what breaks the predicate `home-shift-link` pinned. Seeded onto **the same copy** after that task's finish commits the pin, so the `fail` row with source *pin* is a regression a later task caused and not a defect anybody patched in. Added at Stage 11d-3. |
| `home-site-name` | quick · 1 | The `pre-existing` arm (decisions **0097**, **0119**, **0120**): a one-string task whose acceptance **claims the project's lint is clean**, run on a copy where `environment/broken-eslint-config.patch` was committed before the base. Lint is red at head and at base alike, which is the only shape the status can hold — a command check, and its claim is the plan's own. Its `## Non-goals` freezes the lint configuration, so the fix is barred inside the task the way a real project bars it. Added at Stage 11d-3. |
| `detail-timing` | quick · 1 | The statistics and `flaky` arm (decision **0098**): its `## Verify plan` asks for `/orders`' DOMContentLoaded as the **median and p95 of five loads** — a number that has to name its statistic — and its browser claim is that `/orders/:id` loads with a clean console, which `--defect detail-flaky-every-other-load` breaks on every second load. Added at Stage 11d-3. |
| `kit-badge` | standard · 1 · `--fixture kit` · `--campaign` | The cross-repository finish (Stage 9b, criterion 1): one task in the **external** repository of the seeded pair, whose campaign node lives in `mono`'s map. Seeded with `--campaign badge-rollout/kit-badge` — `state.campaign` is all `finish.md §4` reads — and at `--at finish`, because that phase runs no project command and the question is what it does with a map in another repository: write it, print the repository, the file and the `git -C … commit` line, and commit nothing there (decision **0137**). Its verify is command-only, which is why this plan is the one with no `evidence/` directory. Added at Stage 9b. |
| `cross-cut` | standard · 2 · `--fixture mono` | One counting helper on each side of the monorepo, each covered where it lives. The only plan whose change spans two workspaces, so two configs with different test commands answer for one diff (decision 0076): `config.mjs for-files` returns `svc` and `web`, and the review package names both under `## Projects`. Added at Stage 11b-1. |

## `--at review`, `--at verify` and `--at finish`

The default endpoint is `phase: approved`, where session 2 starts. `--at review`
continues past it, for the stages that exercise a phase the run reaches later
(decision 0036): for each task it writes `Task <n>: started` and `test red`,
copies that task's files from `plans/<plan>.impl/T<n>/`, commits them in the
project's convention, and writes `Task <n>: done --sha`; then
`Simplify: done --sha --net 0`, which is what a pass that cut nothing records
(decision 0034). Every line goes through `ledger.mjs`, so `state.json` is
derived by the one script allowed to write it and the copy arrives at
`phase: review` the way a run would have left it.

A task whose plan carries a `Tests:` exemption gets no `test red` line — there
was no red run to record — and its `done` line asserts the exemption instead,
which is the record `hodos-reviewer` compares against the plan (decision 0022).

`--at verify` continues one line further with `Review 1: ACCEPT 0/0/0`
(decision 0043): the review a clean implementation of a committed plan earns.
A stage that needs findings in the ledger seeds them with `--defect` and runs
the loop instead.

`--at finish` continues to `phase: finish` (decision 0048). It copies
`plans/<plan>.finish/review-<arm>.md` and `verify.md` into the task directory
with the `evidence/` the verify table cites, reads the counts out of those two
headers so the `Review 1:` and `Verify 1:` lines cannot disagree with the files
they describe, and writes one `Gap:` and one `Ruling:` — what a run leaves in
the ledger that no artifact carries, and what the finish report has to name.

`--rule-arm` picks the review. The `two` arm's minor names the raw server
message rendered inside `role="alert"`, which two views do (`grep -c 'role="alert"'`
→ 2), so the finish phase's grep clears the ≥2 threshold and a proposal is
earned. The `one` arm's names the `enabled: id !== ''` guard on the detail
query — the feature's only route-parameter-keyed query, one place — so the same
phase writes an observation and no proposal. The arms differ in the review,
never in the code: the count the phase greps for is real.

Both arms started elsewhere and were retargeted (`878fc0d`). The first `two`
arm named `.toFixed(2)`; the phase proposed nothing and was right, because the
plan's `### Refactor in scope` names that exact line, so the finding traces to a
refactor the plan put in scope and question 1 refuses before any count. The
first `one` arm named the inline cent rounding, and the phase widened it to
*money precision*, found four call sites and proposed a rule — soundly. A
finding is a seed for the pattern the phase can defend, not a literal string, so
an arm has to be a shape that is genuinely alone in the fixture.

`environment/<id>.patch` is the other half of the shape: a patch applied and
committed **before** `seed.mjs` records the base, so what it breaks is in no
diff any review reads. `broken-eslint-config` is the one this repository has —
`eslint.config.js` importing a file that is in no commit, so `npm run lint`
cannot start. It is applied by hand, in two commands, because a breakage that
predates the branch should be visible in the setup rather than hidden in a flag:

```
node bench/scripts/fixture-copy.mjs webapp --into <dir>
git -C <dir> apply bench/run/environment/broken-eslint-config.patch
git -C <dir> commit -qam "chore: split the house rules out of the lint config"
node bench/run/seed.mjs status-label-frozen-lint --copy <dir> --at review --defect detail-inline-labels
```

The same three commands with `home-site-name --at verify` at the end are the
`pre-existing` arm of Stage 11d-3: that plan's acceptance claims lint is clean,
and with this patch behind the base the claim is red at head and at base alike,
which is what the status is proved by (decisions **0097**, **0119**). Measured
2026-09-07: `npm run lint` exits **2** in the copy and **2** again in a
`git worktree` at the base sha — with the working tree's `node_modules` linked
in, because a bare worktree has no install and the command would otherwise fail
for want of a binary rather than for the defect.

`--defect <id>` works with either endpoint and applies `defects/<id>.patch`
inside the **last** task's commit,
so the seeded defect is inside `base..HEAD` — the range the review reads — and
the tree is clean. It is **repeatable**: every patch given lands in that one
commit. That is how an arm seeds two surfaces in one diff, which decision
**0112** made necessary — the attacks reach only the routes the diff resolves
to, so a defect committed to the copy's base is on no route they see. The patches carry their own metadata header, as the review
bench's do:

| Defect | Plan | Severity | What it is |
|---|---|---|---|
| `detail-inline-labels` | `status-label` | major | the detail view spells the three words again instead of reading `statusLabels` — the two-places-to-change shape the plan's D1 chose option A to remove |
| `orders-no-data-status` | `orders-summary` | major | the row drops the `data-status` T3's acceptance clause names. Test, typecheck and lint stay green and the seeded review accepts it: only the verifier runs that claim |
| `orders-frozen-store-and-attr` | `orders-summary-frozen-store` | major | the same dropped attribute **and** a filter-store `reset` that returns `open` instead of `all`, turning the test command red from a module the plan freezes. Two claims, one fixable here and one not |
| `summary-clipped-line` | `orders-summary` | minor | the summary line sits in an 80px box with `nowrap` and `overflow: hidden`, so its numbers are cut off with nothing saying so. No claim names the layout and every command stays green: the presentation detector is the only thing that reports it (decision **0096**) |
| `detail-console-throw` | `orders-summary` | major | `/orders/:id` schedules work that reads a field of a global the application never sets, so mounting it throws a `TypeError` out of a timer. The page still renders, no suite mounts the component, and the double cast keeps typecheck green. It is the *console* source of decision 0093, and it is applied to a copy's **base**: a console read happens on every route the sweep visits, so it needs none of the attack surface decision 0112 defines |
| `detail-flaky-every-other-load` | `detail-timing` | — | `/orders/:id` throws out of render on every **second page load**, so a browser row fails and then passes on one retry. **It does not produce `flaky`, and M4 is what showed why** (decision **0126**): the mechanism is readable in the diff, the verifier read it and wrote `fail · blocker` with the parity named, which is the better answer because `flaky` carries no severity. A defect that produces the status has to be one nobody can explain — a race, not a counter — and every seeded defect is in the diff. The counter is in `sessionStorage`, so it survives a reload, and it advances once per module evaluation so StrictMode's second render pass does not move it. It counts only where `performance.getEntriesByType('navigation')` reports an entry — jsdom reports none, so **the unit suite cannot see it** and the verify phase is the only place it appears, which is what a flake is. Verified in a real browser on 2026-09-07: loads 1 and 3 rendered, loads 2 and 4 left the page empty with `Uncaught Error: the order detail failed to render on this load` in the console. It carries no severity of its own: `flaky` is a status and not a `fail` |
| `shift-double-submit` | `orders-summary` | blocker | `Save handover` posts with nothing holding the button while the call is in flight, so two clicks send two POSTs. The route is one no claim of the plan names, and the closed attack list is what finds it. Registering `/shift` in the `ui` recipe's routes is the arm's setup, not the patch's, and the patch belongs in the task's own commit: decision **0112** runs the attacks only on the routes the diff resolves to |

`plans/status-label.impl/T1/` is the clean implementation of that plan: 11 tests
pass, typecheck and lint are green without the defect, so a review of the
undefected copy has nothing to report and the loop's first iteration is measuring
the seeded major and not the harness.

### What `.finish` carries

`plans/<plan>.finish/` holds `review-one.md` and `review-two.md` (decision
0048's two arms — a plan needs at least the one the run asks for),
`verify.md`, and optionally `evidence/` and `events.txt`. **`evidence/` is
optional**: a verify whose every claim is a command leaves no artifact, which
is `kit-badge`'s shape. **`events.txt`** is the gap and the ruling a run of
*this* plan would have left, one per line; a plan without it gets
`orders-summary`'s pair, which is what every arm before Stage 9b used.

## `--setup`

`--setup <id>` applies `environment/<id>.patch` **before the base commit**, so
the arm's own preparation is in the tree the task branches from and never in
`base..HEAD`. Repeatable; an id with no patch is refused by name, and the
message says which directory it looked in.

The distinction against `--defect` is the whole point. A **defect** is what the
run is meant to find, so it goes inside the last task's commit, in the diff the
review and the verify phase read. A **setup** is what the arm needed in order to
ask its question at all — a route added to a recipe, a config the fixture does
not ship — and a run that meets it in the reviewed range reports it as work the
plan never named. Stage 11d-3's **M3** is the measurement: `/shift` was
registered by a commit on top of `HEAD`, and the run opened with *"The config
was edited after the review closed"* and a `Gap:` line, both true of the harness
and neither true of anything the fixture meant to say
(`runs/2026-09-07-m3-severity/`).

| id | fixture | what it prepares |
|---|---|---|
| `ui-sweeps-shift` | `webapp` | `/shift` in the `ui` recipe's `routes`, so a browser arm reaches the page and its three deliberate presentation defects |

## `--gap`

A plan may mark lines with a trailing `<!-- gap -->`; `--gap` installs the plan
without them. The marker itself never reaches a copy either way — only the
lines it marks depend on the flag — because a plan that ships its harness
annotations tells the run it is a bench fixture, which is what Stage 5's run 1
read off the page. `orders-summary` marks both lines of its `### Interfaces` field,
so the gap variant keeps the heading and loses the shape T1's acceptance
criterion points at — a hole the kernel has to notice and take to the chat,
rather than an empty field any lint would catch.

## Why the plans are committed rather than produced by `/hodos:task`

Two of them are plans S1 exists to prevent: one has an acceptance criterion
that cannot pass, and the `--gap` variant of a third has a hole in its design.
Asking the planner for them would measure the planner. The other reason is
reproducibility — a fresh reviewer re-runs the same input, not a new plan
(decision 0033).
