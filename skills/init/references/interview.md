# interview — buy recall, not facts

Read on entering step 3, after the scan. Input: the inventory, the five briefs, the convention candidates. Output: answers held in this session, each one attached to a config field, a rule candidate, or a ledger row. Nothing is written here.

## Delivery

One numbered message per batch, at most eight questions, prose answers. Then wait, fold the answers into the candidates, and recompute what is still open before asking again. Decisions — approving a rule, settling a ledger row, choosing a convention — are not asked here; they are `AskUserQuestion` calls at step 5, each with real alternatives and a recommendation.

Every question carries the finding that raised it ("the scan found two error shapes; which is the target?"). A question whose answer changes nothing hodos writes is deleted before it is asked.

## Batch 1 — the standing questions

1. What does Claude get wrong in this project? The concrete cases, not a category.
2. How is the app run so a change can be seen working — command, port, auth, seeded data, the routes or endpoints that matter?
3. What must not be touched — generated files, vendored code, a module under migration, anything with a story behind it?
4. Which tracker, which branch naming, which commit convention? (The scan proposes one from `git log`; this confirms or overrides it.)
5. In which language are rules, plans and reports written? (English identifiers and commands regardless.)

## Batch 2 — what the scan raised

One question per contested finding, and only those:

- A convention candidate headed for a rule: why this shape and not the language's default, and where the exceptions are. An answer that names no default it beats is the candidate failing question 2 early.
- A convention with fewer than two precedents: is it the target state, or an accident? Both answers are useful — it becomes a rule with the developer as its precedent, or it disappears.
- A pattern the code follows in two shapes: which shape is the target? Show both with their `file:line` and their counts first. The answer is a drift decision, never "either is fine".
- An instruction found in an existing AI file that the code does not follow: was it aspirational, is it obsolete, or is the code wrong?
- A command CI runs that the manifest does not declare, or the reverse.

## When the repository contradicts the developer

Show the evidence — the `file:line`, the counts on each side — and then ask which is the target state. The developer's answer wins, and the count survives as the drift number a migration node would use.

## Never asked

Anything the scan answered. The test command, the framework, the folder layout, the lockfile's versions, the commit history's shape, whether a directory exists. Asking for one of these tells the developer the scan was not read, and the interview's remaining questions are answered accordingly.

## Completion

Every open question has an answer or a named owner, and every answer is attached to something that will be written — a config field, a rule candidate, a ledger row. An answer attached to nothing means the question should not have been asked; the pair is dropped and the reason recorded.

## Anti-pattern

Collecting preferences nothing will read. Asking a fact the repository holds. A leading question that carries its own answer. Correcting the developer, or quietly taking the code's side, instead of showing the evidence and asking. A second batch that repeats the first because the answers were not folded in.

## Bound

Batch 1, then at most two batches of what the scan raised. Anything still open after that goes into the report as an open question with an owner, and the run continues — an interview that cannot end is a scan that was not done.
