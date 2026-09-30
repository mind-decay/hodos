# webapp-fixture

A React front end for a warehouse order list — three routes, and a dev server
that answers its own `/api` from a fixture list. Server state is TanStack Query,
client state is zustand, and every network call goes through one wrapper.

## Commands

| What | Command |
|---|---|
| test | `npm test` — vitest, jsdom |
| typecheck | `npm run typecheck` |
| lint | `npm run lint` |
| build | `npm run build` |
| dev | `npm run dev` — http://localhost:5173, serving `/api` from `dev-api.ts` |

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
- `/api` is answered in dev by `dev-api.ts`, wired into `vite.config.ts`: three
  orders, one per status, adding to 61.50, and one order by id. The decision of
  what to answer is a pure function with its own tests; the config is the hook.
  An error state is reached by asking for something that is not there —
  `/orders/o-9` — rather than by the server being absent. Behaviour is still
  covered by vitest with the network stubbed at the `fetch` boundary.
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
