# Review bench — run of 2026-09-07, the re-buy for the `spec` kind

Six dispatches, one per package, `hodos:hodos-reviewer` on `opus`, three in
flight. Stage **11d-3**, T14, criterion 4 (*Every axis a bench reads is
measured, and the one no bench reads says so*). The reason for the run is
decision **0015**: the bench's input changed four times since 2026-09-06 and an
input change is re-bought rather than argued.

```
node bench/review/invoke.mjs --out bench/review/runs/2026-09-07-11d3-rebuy --concurrency 3
node bench/review/run.mjs --verdicts bench/review/runs/2026-09-07-11d3-rebuy/verdicts.json \
  --measurements bench/review/runs/2026-09-07-11d3-rebuy/measurements.json
```

| Axis | Found | Rate | Threshold | |
|---|---|---|---|---|
| recall, overall | 19/19 | 100.0% | 80.0% | PASS |
| recall, convention | 12/12 | 100.0% | 80.0% | PASS |
| recall, behavioral | 7/7 | 100.0% | 80.0% | PASS |
| precision | 40/42 | 95.2% | 85.0% | PASS |
| recall, spec | **2/2** | 100.0% | — | measurement |

**Measurements** (never thresholded, decision 0019): 6 dispatches · **$4.84** ·
2 turns each · 162–228 s. Verdicts: 5 × `REJECT`, 1 × `NEEDS_WORK` (p2).

`recall, spec` is a measurement and stays one (decision **0117**): two seeded
defects cannot carry a bar where one miss reads as 50%, which is exactly the
number this run first printed and exactly the reason it was the wrong number to
gate on.

## What changed between this run and 2026-09-06

Four things, all inputs:

- **The `Unclaimed` word** in `agents/hodos-reviewer.md` (`3b9112e`, Stage
  11d-1) — the reviewer is asked for a fourth Spec word that reads the diff
  against the plan's claims.
- **`s-unclaimed-refund-state`** in p3 (`02f923e`) — the `spec` kind's first
  patch, a union member no `Acceptance:` clause names.
- **`s-unclaimed-page-limit`** in p4 (`66ae23b`) — the negative-path class, a
  `limit <= 0` branch whose failure path no clause names. Seeded into an
  existing package rather than into a seventh (Stage 11d-2), so the dispatch
  count and every gated denominator are the ones 2026-09-06 ran against.
- **The call-shape filter** in `scripts/review-package.mjs`, which landed after
  the 2026-09-06 dispatch and is why three packages carry a different
  `## Callers` section here.

| | 2026-09-02 | 2026-09-06 | 2026-09-07 |
|---|---|---|---|
| recall, overall | 18/19 · 94.7% | 19/19 | **19/19** |
| recall, behavioral | 6/7 · 85.7% | 7/7 | **7/7** |
| precision | 41/44 · 93.2% | 41/44 · 93.2% | **40/42 · 95.2%** |
| recall, spec | not in the input | not in the input | **2/2** |
| dispatches · cost | 6 · $4.33 | 6 · $4.39 | 6 · **$4.84** |
| turns, mean | 2 | 2 | 2 |

The two `spec` rows say *not in the input* and not `0/2`. Re-scoring either
archived verdicts file against today's answer key prints `0/2`, and that number
is an artifact twice over: neither patch was applied to those copies, and
`specWords` — the reader that puts the word into `verdicts.json` — did not
exist when they were written. Their `packages[].spec` is absent, so recall and
precision are the only rows comparable across the three runs.

The $0.45 over 2026-09-06 buys a fourth Spec word on six packages and two more
seeded defects to reason about, at the same two turns each.

## What this run found: the reader dropped the word in four of six packages

The scorer first printed `recall, spec 1/2` with `Missed:
s-unclaimed-page-limit`. **p4 found that defect** and named it at the answer
key's own line:

```
**Unclaimed:** the `limit <= 0 → []` failure path at `src/services/orders.js:61` — no
`Acceptance:` clause names a non-positive limit; …
```

`s-unclaimed-page-limit`'s key: `line: src/services/orders.js:61`, `names:
limit`. The row is there and the number was not, because `specWords` matched
`/(?:^|[\s·|])(Missing|Extra|Misunderstood|Unclaimed)\s*:/` — tolerant of a
`·`-separated line, of a `|` cell and of a line of its own, and blind to the
`**` in front of the word:

```
$ node -e "…specWords(readFileSync('p4-review.md','utf8')).unclaimed"
as written  : null
de-bolded   : "the `limit <= 0 → []` failure path at `src/services/orders.js:61` — no `Acceptance:` claus…"
```

The six reviewers wrote the word in **three** forms: `Unclaimed:` (p2, p3),
`**Unclaimed:**` (p1, p4, p5) and `**Unclaimed** —` (p6). `FORMATS.md §9`
shows one `·`-separated line and calls `Unclaimed` "the fourth word of the Spec
line"; two of six wrote that, and the reader accepted exactly those two.

The fix is in the reader, where the tolerance already lived — `parseReview`'s
location cell tolerates backticks, ranges and two locations for the same reason
("reviewers write the location as they would in prose"). The word is the word
however it is emphasised, and the answer key matches tokens in the text after
the separator, never the wording around it:

```js
/(?:^|[\s·|])\*{0,2}(Missing|Extra|Misunderstood|Unclaimed)\*{0,2}\s*[:—]\s*\*{0,2}/g
```

Two tests first, red before the change (`# tests 16 · # pass 14 · # fail 2`),
then green, then four mutants, each dying on its own case: emphasis-blind again
→ both; colon only → the dash case; the trailing `\*{0,2}` dropped → the bold
case, whose text would start with `**`; the gap between word and separator
dropped → the dash case.

Re-derived with **no dispatch**, which is what `--reparse` is for:

```
node bench/review/invoke.mjs --reparse bench/review/runs/2026-09-07-11d3-rebuy
```

`verdicts.as-dispatched.json` is the file the run wrote, kept beside the fixed
one so the claim is checkable; `score.txt` carries both scores.
**Sixteen words** were recovered across p1, p4, p5 and p6 — every one of the
four in each — and nothing but `packages[].spec` differs between the two files.
p1's is not a token but three bulleted entries: a failure path, an unclaimed
`### Invariants & failure modes` clause, and a prop widening `StatusFilter` to
`string`.

Recall and precision are **unchanged** by the fix. Only the `spec` axis reads
those words, and it was the one axis this run was bought to measure.

## The call-shape filter, predicted with `--dry-run` and confirmed by dispatch

The 2026-09-06 record re-derived what the filter would do to three packages
without buying a run. All three predictions hold in the packages actually
dispatched here:

- **p4** carries no `## Callers` section at all — its only match was `list` in a
  test title.
- **p5** keeps three of four: `list(null)`, `list('paid')` and
  `list('archived')` in `test/services.test.js`, and drops the title.
- **p6** is unchanged: `listOrders(status)` at `OrdersPage.tsx:10`, the arm for
  `b-l6-callee-contract`.

p2's section is the same one line as p6's. p1 and p3 carry none.

## The nineteenth defect is still filed under the wrong item

`b-l6-callee-contract` is found again and again filed against the plan's
`### Non-goals` / `### Data & scale` rather than as an `L6` callee-contract
mismatch — the same reading as 2026-09-06, from a different dispatch. The
scorer credits the row on location and reports the mismatch under
`miscategorised`; the bench does not gate the item, and two runs saying the same
thing is a reason to keep saying it out loud rather than to tighten the key
against one row.

## Two wrong rows, and five located by path alone

- **False positive**, p4 `test/services.test.js:12`, major, decision 0022
  test-first: the file is p4's clean file. Every full run so far has had one or
  two of this exact shape — two on 2026-09-02, one on 2026-09-06, one here.
- **Invalid**, p5 `test/services.test.js` with no line, major, the same
  test-first shape: `FORMATS.md §9` admits a location with no line only for a
  path that does not exist, and this one exists. 2026-09-06 had this too, in
  the same package and about the same file.
- **Located by path alone: 5 of 42** — up from 6 of 44 in share terms and worth
  nothing more than a count until a decision says what it should be.

Both wrong rows are about a clean file's missing tests, in the two packages
whose fixture is `api`. Neither cites a `## Callers` line.

## A `major` in a section no count reads

p1 wrote a fifth Spec word of its own — `**Tests exemption (decision 0022,
major):**` — against T3's `Tests: visual — one line of text and its numbers, no
branch`, naming `OrdersSummary.tsx:14` (`if (!orders.data) return null`) as the
branch that contradicts it. That is the agent's own instruction: step 3 of the procedure in
`agents/hodos-reviewer.md:31` says such a task "is a `major` **here**", *here*
being the Spec section.

Nothing counts it. p1's header reads `blockers 1 · majors 6 · minors 1` and its
Standards table has exactly eight rows, so the eighth finding is outside the
counts the verdict rule reads; `precision` counts Standards rows, so a wrong one
here would cost nothing either — decision **0015**'s admission, live. The
verdict was `REJECT` from a blocker regardless. `BACKLOG.md` carries it.

One consequence for the reader, left as it is on purpose: a word's text runs to
the next of the **four** words, so p1's `misunderstood` is `—` followed by that
fifth paragraph. Ending a slice at any bolded lead-in would truncate a reviewer
who bolds a bullet, which loses content instead of misplacing it, and no number
reads `misunderstood`.

## What the run was exposed to

Ten plugins enabled in the user settings: the nine of 2026-09-06 — `caveman`,
`claude-md-management`, `clangd-lsp`, `frontend-design`, `gopls-lsp`,
`hookify`, `humanizer`, `rust-analyzer-lsp`, `typescript-lsp` — and
**`hodos@hodos` itself**, the marketplace build of the thing under test:
version **0.1.0**, commit `686b8d9`, installed 2026-09-06 20:22 from
`mind-decay/hodos`, so it was enabled for the 2026-09-06 run too. Each dispatch
passes `--plugin-dir` at the repository, and the reviews prove which tree
answered: 0.1.0's `agents/hodos-reviewer.md` contains the word `Unclaimed`
**zero** times, and all six reviews here carry it. `chrome-devtools-mcp`
disabled.

The two builds were loadable at once **for this run**, and that is part of its
profile: `hodos@hodos` was uninstalled and its marketplace removed later the
same day, so a re-buy after 2026-09-07 runs under a profile this one did not
have. What did not change is which tree answered here, and the reviews say so.

What removes the guessing in general is a **marker** — a
string the current tree produces and the installed build cannot — checked in
the artifact after every arm. For a reviewer dispatch it is `Unclaimed`; for a
verifier it is the `flaky`/`pre-existing` header, an `*source attack*` row or
`## Claim feedback`, none of which 0.1.0's verifier can write.

The six `stream-json` transcripts are not committed, and neither are the
package copies (`bench/review/runs/*/copies/` is gitignored).
`verdicts.json`, `verdicts.as-dispatched.json`, `measurements.json`,
`score.txt` and the six `p*-review.md` files are what the numbers rest on; the
copies are rebuildable with `--dry-run`.
