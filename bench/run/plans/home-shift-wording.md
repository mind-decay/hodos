# Plan — home-shift-wording
Path: quick · Type: feature · Branch: {branch} · Campaign: — · Base: {base}

## Goal
The landing page's two links read the way the floor says them — `Orders` and `Handover` — so the navigation matches the words on the shift board.

## Non-goals
- The pages the links point at, and the paths themselves.
- Adding or removing a destination. This task changes two words.
- The heading. `Warehouse` is the site's name and stays.

## Decisions
| # | Question | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|
| D1 | Where does the wording change? | A — the `destinations` list the page already keeps (cons: none; it is the one place the labels live) · B — a translation layer keyed by path (cons: a layer for one language, which `config.language: en` and the fixture's own non-goal both refuse) | A, because the labels are already data in one place and that is what this task edits | A (user) |

## Design
### Modules
touched: `src/features/home/ui/HomePage.tsx`, `src/features/home/ui/HomePage.test.tsx`.
### Dependency direction
unchanged — `home/ui` → `react-router-dom` only.
### Interfaces
none new.
### Invariants & failure modes
- The landmark still holds exactly the two routes the router declares; the paths are untouched, so no link can go dead by this change.
- No runtime failure mode: two string literals.
### Data & scale
Two strings. Nothing grows.
### Precedent
`src/features/home/ui/HomePage.tsx` — the labels are already a list beside the paths, which is what makes a wording change one edit.
### Refactor in scope
none.
### External APIs
none.
### Architecture alternatives
See D1: the existing list against a translation layer.

## Tasks
### T1. The floor's words for both sections
Files: src/features/home/ui/HomePage.tsx, src/features/home/ui/HomePage.test.tsx
Acceptance: `/` renders the two links reading `Orders` and `Handover` in that order, with their hrefs unchanged at `/orders` and `/shift`; `npm test` is green.

## Verify plan
- unit: T1's tests (recipe `unit`)
- ui: / — the two link texts as the page renders them (recipe `ui`)

## Open questions
(empty at approval)
