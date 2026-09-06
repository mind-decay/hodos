# `run` harness

Approved plans the `run` kernel is exercised against, and the seeder that
installs one into a throwaway fixture copy.

```
node bench/run/seed.mjs <plan> [--fixture webapp|mono] [--gap] [--autonomy ask|rulings]
                               [--into <dir>] [--at approved|review|verify|finish]
                               [--defect <id>] [--rule-arm one|two]
```

It prints `{ copy, slug, branch, base, tasks }`. The copy is at
`state.phase == "approved"` with the branch checked out, so
`claude -p "/hodos:run <slug>"` inside it starts where session 2 starts.

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

`--defect <id>` works with either endpoint and applies `defects/<id>.patch`
inside the **last** task's commit,
so the seeded defect is inside `base..HEAD` — the range the review reads — and
the tree is clean. The patches carry their own metadata header, as the review
bench's do:

| Defect | Plan | Severity | What it is |
|---|---|---|---|
| `detail-inline-labels` | `status-label` | major | the detail view spells the three words again instead of reading `statusLabels` — the two-places-to-change shape the plan's D1 chose option A to remove |
| `orders-no-data-status` | `orders-summary` | major | the row drops the `data-status` T3's acceptance clause names. Test, typecheck and lint stay green and the seeded review accepts it: only the verifier runs that claim |
| `orders-frozen-store-and-attr` | `orders-summary-frozen-store` | major | the same dropped attribute **and** a filter-store `reset` that returns `open` instead of `all`, turning the test command red from a module the plan freezes. Two claims, one fixable here and one not |

`plans/status-label.impl/T1/` is the clean implementation of that plan: 11 tests
pass, typecheck and lint are green without the defect, so a review of the
undefected copy has nothing to report and the loop's first iteration is measuring
the seeded major and not the harness.

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
