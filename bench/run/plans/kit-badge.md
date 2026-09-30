# Plan — kit-badge
Path: standard · Type: feature · Branch: {branch} · Campaign: {campaign} · Base: {base}

## Goal
The library ships a count badge — a `BadgeCount` beside `Badge` — exported from the barrel with its props type, so the application beside it can show "3" on a badge without writing the markup itself.

## Non-goals
- Changing `Badge`. The count is a component of its own; a `count` prop on `Badge` would make one component two.
- A pluralisation or locale rule for the number. The consumer passes what it wants shown.
- Styling beyond the class the library already uses for tone. The application owns the stylesheet.
- Publishing. The release is its own campaign node (`badge-rollout/kit-release`).

## Decisions
| # | Question | Options (cons) | Recommendation | Choice |
|---|---|---|---|---|
| D1 | A new component, or a `count` prop on `Badge`? | A — `BadgeCount`, its own file and its own props type (cons: a second component to keep in step with `Badge`'s tones) · B — `Badge` takes an optional `count` (cons: `Badge`'s markup grows a branch, and every consumer's snapshot of it changes) | A, because the campaign's own metric counts barrel exports and D1 of the map says one owner per piece of markup | A (user) |
| D2 | What the badge shows above a ceiling? | A — the number as given, whatever it is (cons: a four-digit count breaks the layout the application chose) · B — a `max` prop that renders `99+` (cons: a formatting rule in a library nobody asked for one from) | A, because the consumer knows its own layout and can pass `99+` as text if it wants it | A (user) |

## Design
### Modules
touched: `src/index.ts` — the barrel is the library's whole public surface (convention 1) · new: `src/components/BadgeCount.tsx`, `src/components/BadgeCount.test.tsx` — one component per file, beside `Badge.tsx`.
### Dependency direction
`index.ts` → `components/BadgeCount`. The component imports nothing from the library's own barrel, which would be a cycle.
### Interfaces
`export interface BadgeCountProps { tone: 'neutral' | 'success' | 'danger'; count: number }`
`export function BadgeCount(props: BadgeCountProps): JSX.Element`
### Invariants & failure modes
- The tone union is `Badge`'s own, spelled once here and not widened: a tone the stylesheet has no class for renders a class nothing styles.
- A count of 0 renders `0`, not nothing: an empty badge is a layout hole the consumer cannot explain.
- The component is pure markup — no state, no effect, no clock.
### Data & scale
One number and one tone per render; the library renders to a string in its own tests.
### Precedent
`src/components/Badge.tsx:5` — the props type is named after the component and exported beside it. `src/index.ts:6` — a component reaches consumers only through the barrel, and `src/index.test.ts:13` fails when one does not.
### Refactor in scope
- none. `Badge.tsx` is untouched by D1.
### External APIs
none. `react` is a peer dependency already (`package.json:29`).
### Architecture alternatives
See D1 and D2.

## Tasks
### T1. The count badge, exported from the barrel
Files: src/components/BadgeCount.tsx, src/components/BadgeCount.test.tsx, src/index.ts
Acceptance: `renderToStaticMarkup(<BadgeCount tone="success" count={3} />)` is `<span class="badge badge--success badge--count" data-tone="success" data-count="3">3</span>`; a count of 0 renders `0` inside the span; `src/index.test.ts` passes, which is what asserts the barrel exports the component and its props type together.

## Verify plan
- unit: T1's own suite and `src/index.test.ts` (recipe `unit`)

## Open questions
(empty at approval)
