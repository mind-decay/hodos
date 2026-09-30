# Review 1 — kit-badge
Verdict: ACCEPT · blockers 0 · majors 0 · minors 1

## Checks run
- test: `npm test` → 8 passed
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → 0 problems

## Spec
Missing: — · Extra: — · Misunderstood: —

T1 adds the component, its suite and the two barrel exports the plan names, and `Badge.tsx` is untouched as D1 requires. A count of 0 renders `0`, which is the invariant the plan states.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| minor | src/components/BadgeCount.tsx:7 | convention | — | the tone union is spelled a second time here, beside `Badge.tsx:6`; a fourth tone would have to be added in both, and `src/index.ts` exports both types as the library's contract | one exported `Tone` type in `src/components/tone.ts`, imported by both components |

## Coverage
Not reviewed: `src/components/Stack.tsx` and its suite — outside `base..HEAD`.
