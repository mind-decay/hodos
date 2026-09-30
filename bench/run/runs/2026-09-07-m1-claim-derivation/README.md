# M1 — the claim set a plan writes with the rules in front of it, 2026-09-07

Stage 11d-1, criterion **1d**, the *positive* direction of decision **0092**: that the three
derivation rules of `skills/task/references/plan.md §3` change what the plan phase writes.
Run by the developer in an interactive session, because nothing headless reaches it —
the grilling rounds wait for a person and `AskUserQuestion` is absent under `claude -p`
(`PLATFORM-NOTES.md` fact 32, `docs/stages/11d1-plan.md` deviation 1).

```
node bench/scripts/fixture-copy.mjs webapp          # → /var/folders/.../hodos-webapp-wxVLku
claude --plugin-dir <plugin root>
/hodos:task Add a refund badge to the order detail page. A refund is requested, approved
  or declined, and the badge says which. The orders API answers 404 for an order that has
  no refund.
```

Router: `standard` — quick fails on row 3 (a new route) and row 1 (5 files > 3); `deep` not
required with rows 3–5 filled and row 2 `no`. Confirmed as proposed. Seven decision forks,
four rulings, four research agents, `plan.md` 143 lines, `research.md` 86 lines with 17
resolved URLs. This directory holds `brief.md`, `plan.md`, `research.md` and `ledger.md`
as the session left them; the run itself was approved and stopped at `phase: approved`,
which is where the step ends.

## The discriminator

`States:` **did not exist in the plan format before this stage**:

```
$ git show stage-11d1-base:skills/task/references/plan.md | grep -n "States"
(none)
$ grep -n "^States:" plan.md
87:States: badge | absent | alert | pending — not a type; enumerated by hand, since the page
   derives them from `isPending`, `isError` and an `instanceof` narrowing rather than from a union.
```

Rule 2's own sentence gives the grammar — `States: idle | loading | error | empty — not a
type; enumerated by hand.` — and the plan wrote it, with the reason the state is not a type
appended. A session that had only the reference to go on produced the line the rule asks for,
on a page whose four states really are derived from two booleans and an `instanceof`.

## The four questions the step is read against

**1. All three refund states, not the two the description leads with — yes.** T1's clause:
"renders the badge for each of `requested`, `approved` and `declined` and asserts each renders
its own distinct text". The contract field says it twice over: "Postcondition: a refund read
resolving `{ status: 'requested' }` renders the requested badge; `'approved'` … `'declined'` …".
Rule 2's typed half, on a union the plan itself introduced in `### Interfaces`.

**2. A claim for the 404 path — yes.** T3 case (a): "the refund route answering 404 with the
error envelope renders the text 'No refund' and `queryByRole('alert')` is null". Rule 3, and
the plan claims three more failure paths beside it: the 500 envelope, the network rejection of
`http.ts:17`, and the pending state.

**3. A clause traced back to `### Invariants & failure modes` — yes, and mapped.** The
`## Verify plan` names its inputs by kind: "the postcondition … and the precondition (empty id
issues no fetch): T2", "the key-factory invariant: T2's key assertion", "the 404 branch, the
non-404 branch, the network branch and the pending branch: T3". The precondition arrived as
rule 1 asks — a **negative** claim: "a second case asserts that with an empty route id `fetch`
is not called at all".

**4. Nothing was asked that the rules should have derived.** Seven forks, all on the four
sanctioned axes (D1 an endpoint the repository names nowhere; D2, D6, D7 module boundaries;
D3, D4, D5 what fails and how). The four purely local choices were ruled and recorded, not
asked — the barrel, the `dt`/`dd` pair, the repeated `enabled` guard, the pending copy. No
question asked which states exist or which paths get claimed.

Worth its own line: **D3's first recommendation was retracted by the session's own research.**
The round-1 recommendation was `catch` → `null`; Q4 came back with
`.claude/rules/api-error-propagation.md:22-24`, which names a `null` return from a catch as the
thing it prevents. The session said so — "Rule outranks precedent and outranks my
recommendation, so that recommendation was wrong" — and re-raised the fork with rule-compliant
options only. That is `DESIGN.md §4.4`'s stop working, not this stage's rule, and it is
recorded here because it happened in the same session.

## What the run also found — one clause with no claim

Nine clauses stand in `### Invariants & failure modes`. Eight reach an `Acceptance:` line.
The ninth does not:

> - Failure mode, not an `ApiError`: a rejection that fails the `instanceof` narrowing takes
>   the alert path, not the absent path. Absence is claimed only by a 404.

T3 claims four cases — 404, 500, a rejected `fetch`, unresolved — and all four arrive as an
`ApiError`, because `request<T>()` throws only that (`src/lib/http.ts:17` and `:19`). The
clause is **not** unfalsifiable, though: `await response.json()` at `src/lib/http.ts:20` sits
outside the `try`, so a 200 answering with a malformed body rejects with a `SyntaxError` and
takes exactly the path the clause describes. Reachable, stated, and claimed by nobody.

This is the mechanism's own case, and it is why decision **0092** put the check in two places:

- `agents/hodos-plan-reviewer.md` gap 7 would have caught it **before** the code — but step 7
  of `skills/task/SKILL.md` is "`deep` only", and this task routed `standard`.
- `agents/hodos-reviewer.md`'s **Unclaimed** word catches it at review time on every path,
  which is the sentence that reference already carries: "this is derived, not judged … which
  is why it is checked on every path and not only where a plan review ran".

The second net is **unproven here**: the run stopped at `phase: approved`, so no reviewer ran
on it. Proving it costs a full `/hodos:run` of three tasks and is not this step's scope; the
mechanical proof of the same word firing on a diff is criterion 1a's p3 dispatch.

## Unseeded corroboration for criterion 2

The plan's `## Verify plan` ends with a paragraph nobody asked it for:

> **Missing layer — an `init` finding, not a task.** … `config.verify` declares `recipes` and
> no `layers`, so there is no layer that seeds `/api`. Every badge claim is therefore carried
> by the `unit` recipe alone, and the `ui` recipe proves only that the route still mounts.

The plan phase reached decision **0099**'s conclusion from the other end: a browser claim about
seeded data needs a **layer**, and a config with none cannot carry it. Nothing in the task's
description or in the fixture's config mentions layers.

## What this run does not say

One description, one fixture, one developer, one plan. It says the rules changed what a plan
writes and that the session applied them without being reminded; it says nothing about the
frequency of the unclaimed-clause case, and nothing about a plan written by somebody who has
never read the rule — Stage 12's, on `ariadne_v2`.
