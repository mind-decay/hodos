# webapp-fixture

A React front end for a warehouse order list — three routes, no backend in this
repository. Server state is TanStack Query, client state is zustand, and every
network call goes through one wrapper.

## Commands

| What | Command |
|---|---|
| test | `npm test` — vitest, jsdom |
| typecheck | `npm run typecheck` |
| lint | `npm run lint` |
| build | `npm run build` |
| dev | `npm run dev` — http://localhost:5173 |

All five ran green on 2026-08-31.

## Where things live

- `src/main.tsx` — the composition root: QueryClient, BrowserRouter, App.
- `src/App.tsx` — every route, declared in one place.
- `src/features/<name>/` — one directory per feature:
  - `index.ts` — the barrel, the feature's only public surface
  - `api.ts` — types, the query-key factory, the request functions
  - `model.ts` — the zustand store
  - `ui/*.tsx` — the components
- `src/lib/` — what every feature shares: `http.ts` (the project's only `fetch`)
  and `errors.ts` (`ApiError`).

## Conventions

- Named exports only. There is no `export default` anywhere in `src`.
- A test sits beside the file it covers — `model.ts` next to `model.test.ts`.
- `/api` is served by nobody in dev and 404s on purpose. The browser is for
  layout and error states; behaviour is covered by vitest with the network
  stubbed at the `fetch` boundary.
- `eslint.config.js` carries conventions, not preferences — do not weaken or
  edit it. `package-lock.json` and the pinned versions are likewise fixed.
- Commits are conventional. Branches are `feature/{slug}`.
- Pending and error states are rendered inline on the list page, so its filter
  stays mounted, and as an early return on the detail page, which has nothing to
  keep. Both are deliberate; neither is a rule.

## Rules

`.claude/rules/` holds what loads by path match:

| Rule | Covers |
|---|---|
| `network-through-request` | reach the network through `request()` |
| `query-key-factory` | query keys come from the feature's `api.ts` |
| `feature-barrel-imports` | a feature is entered through its `index.ts` |
| `api-error-propagation` | a network failure stays an `ApiError` |
| `error-role-alert` | every error surface carries `role="alert"` |
| `test-mocking-boundary` | stub `fetch`; use the real collaborators |
