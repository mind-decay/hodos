# /hodos:rule — the refusal and the rule — 2026-09-02

Stage 8 criterion 3, both halves, against one `fixture-copy.mjs` of `webapp`.

## The refusal — `refuse.md`

`/hodos:rule use async/await`. 5 turns, **$0.30**. Nothing written; the six
fixture rules are still six.

It grepped first, as §1 asks, and printed the counts: `await` 7, `async` 5,
`.then(` 0, `.catch(` 0, `new Promise` 0. Question 1 passes on the precedents.
Question 2 is the one that refuses, and it refused on evidence rather than on a
judgement: three commits in the repository, no fix commit, no revert, no review
comment turning a promise chain into `await`, and no observation from the
developer's own prompt. It closed with what would change the answer — "an
instance where Claude wrote `.then()` in this repo and you corrected it" — and
named `eslint-plugin-promise`'s `prefer-await-to-then` as the mechanical form
question 3 prefers.

## The rule — `write.md`, `written-rule.md`

The second invocation carries the observation question 2 needs, in the
developer's own words: Claude keeps giving new components a default export here,
and the import was changed back twice in the last month. 8 turns, **$0.47**.

`.claude/rules/components-exported-by-name.md` was written with `paths:` scoping
it to `src/**/*.tsx` and the feature barrels, six precedents by `file:line`, the
incident, and the `no-restricted-syntax` selector that would enforce it
mechanically if `eslint.config.js` were not frozen by the fixture's own CLAUDE.md.
`lint.mjs --project` is clean on the result — the citations resolve.

## The approval was pre-given

`AskUserQuestion` does not exist in a headless session (`PLATFORM-NOTES.md` fact
32), and §4 of the skill writes only on approval. The invocation therefore says
so and gives the approval in advance. That is the same shape `BACKLOG.md` records
from the Stage 4 manual run — a mandatory stop answered inside the invocation is
taken as the confirmation — and it is what makes this half runnable without a
person. The refusal half needed no such thing: it stops before the gate.
