# The frozen-lint design, run interactively — and beaten

Session A of `docs/stages/06-manual.md` as it stood on 2026-09-01: the webapp
fixture with `eslint.config.js` broken one commit *before* the branch base, the
plan freezing the lint configuration in its Non-goals, and
`detail-inline-labels` seeded into the task commit. Run by the user in an
interactive session; only the excerpts below came back, which is why this
directory holds no transcript.

```
2026-09-01T15:45:52.153Z Fix 1: done (64f5481)
2026-09-01T15:50:29.384Z Review 2: ACCEPT (0/0/1)
2026-09-01T15:50:47.955Z Ruling: lint unrunnable since base 2c658ed (eslint.config.js imports absent
  eslint-house-rules.js), so the branch's no-restricted-globals check was run by grep instead — every
  'fetch' outside src/lib/http.ts is a string literal passed to vi.stubGlobal, no bare identifier call
  — cost if wrong: a fetch outside request() ships unlinted
```

`state.phase` reached `verify` with `review.iteration` 2 and verdict `ACCEPT`.

**What happened.** Review 1 returned `NEEDS_WORK (0/2/1)`. The fix pass closed
both majors — the detail view reading its own inline literal, and the missing
sibling test — with a mutation proof (breaking `statusLabels.open` reddens three
tests, restore gives 12 passed). Review 2 returned `ACCEPT (0/0/1)`, the minor
being the broken lint config, carried to the finish report as an open finding
needing its own task against `2c658ed`.

**Why the design was beaten, and why nothing here is a defect.** The unfixable
finding was *environmental*, and the kernel routed around the broken tool rather
than the broken code: it ran the rule by `grep`, recorded a `Ruling:` naming the
cost if wrong, and moved on. The reviewer then graded the residue a **minor** —
correctly, by `FORMATS.md §9`'s verdict rule: the defect predates the base, sits
outside the diff, and the plan freezes the file. A minor does not reach the
breaker.

Headlessly the same design *did* reach it (`../2026-09-01-breaker/envprobe2/`,
`Review 2: NEEDS_WORK (0/1/0)` with the three options printed). The difference
is the workaround, which is a judgement the kernel is free to make.

The fourth design (`status-label-frozen-api`) moves the unfixable finding into
the diff, in code, where no tool substitution reaches it.

Also recorded here: the kernel did **not** ask about the lint fork. It read the
Non-goals as settling it and wrote a `Ruling:` — which is what
`references/review-loop.md §4` asks for when the plan already answers, and one
of the two variants `06-manual.md` said to report rather than retry.
