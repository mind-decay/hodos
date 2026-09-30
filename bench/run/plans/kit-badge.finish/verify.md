# Verify 1 — kit-badge
Verdict: PASS · claims 3 · pass 3 · fail 0 · skip 0

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | the markup carries the tone class, both data attributes and the number | `npm test -- BadgeCount` | 2 passed | pass |
| 2 | a count of 0 renders `0` inside the span | `npm test -- BadgeCount` | 2 passed | pass |
| 3 | mutation: BadgeCount.test pins the markup, so a changed class fails | dropped `badge--count` from the className → suite red → restored; tree clean | vitest output | pass |

## Not covered
Nothing. Every claim in the plan's verify section is a command, and all three ran.

## Notes
The library renders to a string in its own tests (`bench/fixtures/README.md`), so there is no browser row here and no screenshot to keep — this task's verify has no `evidence/` directory.
