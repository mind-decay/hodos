# Reaching the breaker — 2026-09-01

Three designs, two of them beaten. What beat them is worth more than the run
that finally worked, so all three are here.

## 1. A clean seeded major — reached `ACCEPT`

`../2026-09-01-review-loop/`. The kernel fixed it and the scoped re-review
accepted, twice. Correct behaviour, and no breaker.

## 2. A plan that contradicts itself — reached the **gate**, not the breaker

`../2026-09-01-contradiction/ledger.md`. `status-label-two-sources` puts option
A in its Goal, Non-goals and D1 and option B in T1's acceptance clause. The
kernel read both, stopped **before dispatching**, and said why: *"dispatching a
reviewer now burns one of two review iterations on a diff whose target is
undecided — that's why I stopped here instead."* Its ledger ends at
`Simplify: done`; there is no `Review 1:` line at all. 8 turns, $0.40.

This is decision 0035 in the review phase: a contradiction a reader can settle
reaches the gate, and the loop bound is only reachable from a finding that
reading cannot settle.

## 3. An environmental blocker — reaches the breaker

`environment/broken-eslint-config.patch` is committed **before** the branch
base, so it is in no diff any review reads: `eslint.config.js` imports a file
that is in no commit in the repository, and `npm run lint` cannot start.
`plans/status-label-frozen-lint.md` freezes the lint configuration in its
Non-goals, so the finding is real and its fix is barred. The reviewer finds it
only by running `config.commands.lint`, which is why no reading of the plan
pre-empts it.

| Run | Autonomy | Turns | Cost | Ledger |
|---|---|---|---|---|
| `envprobe` | `ask` | 15 | $1.61 | `Review 1: NEEDS_WORK (0/2/1)`, then the fork, put to the developer with three options |
| `envprobe2` | `rulings` | 28 | $2.01 | `Review 1: NEEDS_WORK (0/2/1)` · two `Ruling:` lines · `Fix 1: done (62c3d70)` · `Review 2: NEEDS_WORK (0/1/0)` · the breaker's three options |

`envprobe2` is the whole loop: the seeded major fixed, the frozen-lint major
carried as a `Ruling:` rather than fixed, and iteration 2 still not `ACCEPT`
because the reviewer ran lint again and it is still broken. Both runs stop at
the breaker itself, which is a mandatory stop under either autonomy setting and
needs `AskUserQuestion` — absent in a headless session (fact 32). The recorded
choice comes from `docs/stages/06-manual.md`.
