# Plan — home-shift-link
Path: quick · Type: feature · Branch: feature/home-shift-link · Campaign: — · Base: 067854c

## Goal
The landing page offers the two places a shift lead goes — the order list and the shift handover — from one navigation landmark, so neither is reached by typing a URL.

## Non-goals
- The order list and the handover pages themselves. This task changes what points at them.
- Styling the navigation. Colour, spacing and the active state are somebody else's task.
- A route this application does not have.

## Decisions
| # | Question | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|
| D1 | What carries the two links? | A — a `<nav>` landmark with a list inside it (cons: two elements where one anchor would do) · B — two bare anchors in the section (cons: no landmark, so a screen reader has nothing to jump to and the pair is not a group) | A, because a landmark is what makes the pair navigable and it is one element | A (user) |

## Design
### Modules
touched: `src/features/home/ui/HomePage.tsx` · new: `src/features/home/ui/HomePage.test.tsx` — the page had no test beside it and this task gives it one.
### Dependency direction
`home/ui` → `react-router-dom` only. The home feature imports no other feature: it links by path, which is what keeps the landing page from depending on what it points at.
### Interfaces
none new — `HomePage` keeps its signature.
### Invariants & failure modes
- The navigation landmark holds exactly the routes the router declares; a link to a path `App.tsx` does not carry is a dead link the test would not catch, so the two are named in one place and read in the test.
- No runtime failure mode: there is no data and no request on this page.
### Data & scale
Two links, resolved at render. Nothing here grows with the data.
### Precedent
`src/features/home/ui/HomePage.tsx:8` — the page already links by path through `Link` rather than by an anchor with a literal href. `src/features/orders/ui/OrderList.tsx` — a list of links is a `<ul>` of `<li>`, which is the shape a screen reader counts.
### Refactor in scope
none — the single existing link becomes one of the two, in the same expression.
### External APIs
none.
### Architecture alternatives
See D1: a landmark against two bare anchors.

## Tasks
### T1. The navigation landmark, with both destinations
Files: src/features/home/ui/HomePage.tsx, src/features/home/ui/HomePage.test.tsx
Acceptance: `/` renders a navigation landmark holding exactly two links, reading `Orders` and `Shift handover` in that order, whose hrefs are `/orders` and `/shift`; `npm test` is green.

## Verify plan
- unit: T1's tests (recipe `unit`)
- ui: / — the navigation landmark's two link texts, read in the page (recipe `ui`)

## Open questions
(empty at approval)
