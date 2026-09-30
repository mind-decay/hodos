# Bench fixtures

Four small projects hodos is developed against. They exist so every stage can be
tested on something that behaves like a repository — a real dependency tree, a
real test runner, a real lint pass — without touching a developer's work. Nothing
here is run against a real project before Stage 12 (`BUILD-PLAN.md`).

Each fixture carries **deliberate conventions**: rules a competent reviewer would
enforce and a careless change would break. They are what `init` has to detect
(Stage 3), what a rule's precedent cites (Stage 3), and what the seeded defects
of `bench/review/` violate (Stage 6). Where a convention can be checked by a
tool, the fixture's own `eslint.config.js` or test suite checks it, so a
violation is a failing command and not an opinion.

Fixtures ship **without** `.claude/`, except `webapp`: Stage 3 ran `/hodos:init`
against a copy of it and committed the layer that run produced — `CLAUDE.md`
(56 lines), `.claude/hodos/config.json`, six `.claude/rules/*.md`, and three
`.gitignore` lines. `.claude/settings.json` is **not** committed: its one key is
an absolute path to the machine's plugin root. `config.scanSha` names the HEAD
of the throwaway copy `init` scanned, so a fresh copy does not contain that
commit and `--refresh` there takes its "scanSha unreachable" path rather than a
delta. The fixture also carries a `.mcp.json` declaring the `chrome-devtools`
server, so the `browser` adapter the config records resolves for anyone who
clones it — without it the config would claim an adapter the project does not
have, and Stage 7's `Skip: browser unavailable` path would never be reachable
by removing one file. It is not part of the layer `--strip-claude` removes — a
project may declare MCP servers before it has ever seen hodos — so every
session started inside a `webapp` copy carries it: an interactive run gets a
trust prompt for the server, and its first use fetches `chrome-devtools-mcp`
over the network. `webapp`'s dev server answers its own `/api` (decision **0123**): `dev-api.ts` is
a pure function from a URL to a status and a body, tested beside itself, and
`vite.config.ts` is the hook that writes what it returns. Before it, every data
route rendered its error state under `npm run dev` and every route earned an
ambient failed-request row in a `verify.md`. Never run a stage test against the
checked-in tree: copy it first with
`node bench/scripts/fixture-copy.mjs <name>`, which gives a git repository with
three seeded conventional commits.

| Fixture | Stack | Test | Lint | Typecheck | Build |
|---|---|---|---|---|---|
| `webapp` | React 19, TypeScript, Vite, react-router, TanStack Query, zustand | `npm test` (vitest, jsdom) | `npm run lint` | `npm run typecheck` | `npm run build` |
| `api` | Node `node:http`, ESM JavaScript with JSDoc types | `npm test` (`node --test`) | `npm run lint` | `npm run typecheck` (`checkJs`) | — |
| `mono` | npm workspaces: `web` (TS, vitest) + `svc` (JS, `node --test`) | `npm test` (`--workspaces`) | `npm run lint` | `npm run typecheck` | — |
| `kit` | React 19 component library, TypeScript | `npm test` (vitest, `renderToStaticMarkup`) | `npm run lint` | `npm run typecheck` | `npm run build` |

Every dependency is pinned to an exact version with the lockfile committed: a
fixture whose behavior moves with an upstream release is not a fixture. Every
fixture declares `engines.node: ">=20.19"`, which is the floor the Node 20 line
CI installs satisfies — the workflow asks for `node-version: "20"`, so the patch
release is the runner's.

## `webapp` — front end

Four routes (`/`, `/orders`, `/orders/:id`, `/shift`), two feature modules —
one with a query layer and a store — and one shared library.

1. **The network is reached through `request()`.** `bench/fixtures/webapp/src/lib/http.ts:9`
   is the only place that calls `fetch`. Callers get parsed JSON or an error;
   they never see a `Response`. Enforced: `bench/fixtures/webapp/eslint.config.js:18`
   makes a bare `fetch` outside `src/lib/` an error.
2. **One error shape crosses the boundary.** `bench/fixtures/webapp/src/lib/errors.ts:6`
   defines `ApiError` with a `code`, a `status` and a message, built from the
   server's `{ error: { code, message } }` envelope — the same envelope the `api`
   fixture speaks.
3. **A feature's barrel is its public surface.** `bench/fixtures/webapp/src/features/orders/index.ts:2`
   states the rule and the exports below it are the whole surface. Another
   feature imports `features/orders`, never a file inside it.
4. **Query keys come from the feature's `api.ts`.** `bench/fixtures/webapp/src/features/orders/api.ts:16`
   owns every key. No component writes a literal key array, so an invalidation
   cannot miss a cache entry.

### `/shift` — three seeded presentation defects

`bench/fixtures/webapp/src/features/shift/ui/ShiftPage.tsx` carries one defect
per detector of `scripts/detectors.mjs`, and they are deliberate: this route is
what the bench's environment check reads, and a session that "fixes" them has
removed the measurement (decision **0096**).

| On the page | Detector | Why it fires |
|---|---|---|
| the handover banner | `overflow` | one unwrapped line in a 320px box; the box around it scrolls, so the escape stays inside the banner and the document does not side-scroll |
| the notes box | `clipped` | three lines of text in a 40px box with `overflow-y: hidden`, no ellipsis and no line clamp — truncation the page never declared |
| Save handover / Discard | `overlap` | two absolutely positioned buttons whose boxes intersect by 20×20px |

Nothing else on the route fires: `index.html` gives every control a 3px focus
outline, so the `focus` detector stays quiet, and `axe` runs only where an
`a11y` recipe declares it. Three hits and no fourth is the check
(`BUILD-PLAN.md` Stage 11d, *The environment is verified, not tested, in the
bench*), and the fourth detector staying quiet is half of what it proves.

**jsdom cannot see any of it.** `scrollWidth`, `clientHeight` and
`getBoundingClientRect` are all zero without a layout engine, so a unit test of
this page would pass whatever the CSS said. That is the whole reason the
detector logic is tested against a stub of the properties it reads and this page
verifies the environment instead — the page is not where the logic is tested.

## `api` — service

A `node:http` service in plain JavaScript, typed by JSDoc and checked with
`tsc --noEmit`. Deliberately unlike `webapp`: a different language, a different
runner, a different typecheck — so `init`'s scan has more than one shape to find.

1. **Every route is in one table.** `bench/fixtures/api/src/routes.js:13` lists
   method, pattern, status and handler. A handler that is not in the table is not
   reachable, so one file answers "what does this API do".
2. **Only `src/http/respond.js` writes a response.** Its two writers are
   `ok()` at `bench/fixtures/api/src/http/respond.js:9` and `fail()` at
   `bench/fixtures/api/src/http/respond.js:19`; handlers return data and throw.
   Enforced: `bench/fixtures/api/eslint.config.js:16` denies `res.end`,
   `res.write` and `res.writeHead` in routes, services and store.
3. **Every failure is an `AppError`.** `bench/fixtures/api/src/errors.js:5` — the
   code is the client's contract, the status is HTTP's, the message is for a
   human; `fail()` serializes all three into one envelope.
4. **`routes → services → store`, one way.** `bench/fixtures/api/eslint.config.js:29`
   denies a service importing routes or the HTTP layer, and
   `bench/fixtures/api/eslint.config.js:38` denies the store importing anything
   above it.

## `mono` — monorepo

A root `package.json` with two workspaces, for nested configuration (Stage 10)
and the campaign map's root-upward lookup (Stage 9).

It carries a **committed hodos layer of three configs** — the root's
`npm test --workspaces`, `web`'s `npm test`, `svc`'s `node --test src/*.test.js`
— which is decision 0060's case: each workspace earns a config because its
commands differ. `web`'s command is the npm-script form and not the bare
`vitest run` its `package.json` script holds, because a nested config's commands
run in **its own** directory (decision 0060) and a workspace's binaries are
installed only under the root: `vitest` is not on `PATH` in `web/`, and `npm`
puts it there. Added at Stage 11b-1, which needs a project where two configs
answer for one diff (decision 0076); `fixture-copy.mjs --strip-claude` gives
back the project hodos has not seen.

1. **`web` reaches `svc` by package name.** `bench/fixtures/mono/web/src/basket.ts:1`
   imports `@mono/svc`. Enforced: `bench/fixtures/mono/eslint.config.js:18`
   denies the relative path across the workspace boundary — it compiles today and
   breaks the day `svc` is published.
2. **One shared TypeScript base.** `bench/fixtures/mono/web/tsconfig.json:2`
   extends `tsconfig.base.json` at the root; a workspace overrides, it does not
   restate.
3. **The root fans out, it does not duplicate.** `bench/fixtures/mono/package.json:9`
   delegates with `--workspaces`; no root script repeats a workspace's command.

## `kit` — component library

The "second repository" of the cross-repository campaign criteria
(`DESIGN.md §9`). Tests render to a string, so the library carries no DOM
harness.

1. **The barrel is the whole public surface.** `bench/fixtures/kit/src/index.ts:6`
   re-exports every shipped component. Enforced by a test:
   `bench/fixtures/kit/src/index.test.ts:13` fails when a component file is not
   re-exported.
2. **A component's props type is named after it.** `bench/fixtures/kit/src/components/Badge.tsx:5`
   exports `BadgeProps` beside `Badge`, and the same test checks the pairing for
   every component.
3. **Named exports only.** `bench/fixtures/kit/eslint.config.js:21` makes a
   default export an error: a default export is renamed at every call site, and a
   library's names are its contract.

## The pair — `mono` beside `kit`

The two fixtures above are also one arrangement: a component library published
as a package beside the monorepo that consumes it, which is the live shape
decision **0077** names for cross-repository campaigns.
`bench/scripts/pair-seed.mjs` seeds it — sibling checkouts `mono/` and `kit/`
under one workspace, a bare clone of each as its `origin`, each config naming
the other's maps in `campaigns.external[]`, and the `badge-rollout` map in
`mono` with a node in `kit`, a release node, a metric measured in `kit`, and a
claim committed by a teammate on a branch only the origin holds. `docs/BENCH.md`
says what each seed stands for.

## Checking this file

`node scripts/verify-citations.mjs bench/fixtures/README.md` — every `file:line`
above must resolve to a line that exists and is not blank. A convention whose
citation has drifted is a convention nobody can check.
