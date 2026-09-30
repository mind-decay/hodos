# Research — refund-badge

## Q1. How does the project render pending, error and absent states today?

- Detail page, early return: `src/features/orders/ui/OrderDetailPage.tsx:10` pending (`<p>`, no role), `src/features/orders/ui/OrderDetailPage.tsx:11` error (`<p role="alert">{order.error.message}</p>`).
- List page, inline so the filter stays mounted: `src/features/orders/ui/OrdersPage.tsx:24` pending, `src/features/orders/ui/OrdersPage.tsx:25` error, `src/features/orders/ui/OrdersPage.tsx:26` data.
- Ordinary "nothing here" copy, no `role`: `src/features/orders/ui/OrderList.tsx:10` — `if (orders.length === 0) return <p>No orders match this filter.</p>;`
- `src/features/home/ui/HomePage.tsx:6-9` — static, no query.

Rules, verbatim:

- `.claude/rules/error-role-alert.md:6` — "# Every error surface carries `role="alert"`"
- `.claude/rules/error-role-alert.md:22-24` — "This is the error surface only. Pending text is not an alert (`src/features/orders/ui/OrdersPage.tsx:24`), and an empty result is ordinary copy, not a failure (`src/features/orders/ui/OrderList.tsx:10`)."
- `.claude/rules/api-error-propagation.md:6` — "# A failure that crossed the network is an `ApiError`"
- `.claude/rules/api-error-propagation.md:22-24` — "When a `catch` is genuinely needed, the caught `ApiError` is re-thrown or its `code` is branched on. A new local error type, a string, or a `null` return throws away the status and code that everything above depends on."
- `.claude/rules/api-error-propagation.md:15-19` — feature code lets the error travel; a component reads what it needs off the error it was handed.

**Negative result.** No component renders an absent / "fetched but missing" state as distinct from pending or error. `src/features/orders/ui/OrderList.tsx:10` is the only no-content copy and the rule itself classifies it as ordinary copy, not a failure. Searched (1) `empty|no orders|not found|nothing here|no data|no results` across `src/features/**/*.tsx`, (2) `isPending|isError|\.data|\.length === 0` across the same — no third state anywhere.

Files to read: `src/features/orders/ui/OrderDetailPage.tsx`, `src/features/orders/ui/OrdersPage.tsx`, `src/features/orders/ui/OrderList.tsx`, `.claude/rules/error-role-alert.md`, `.claude/rules/api-error-propagation.md`.

## Q2. How do the existing tests mount a query-driven component, and how is the network stubbed?

**Negative result — no precedent for mounting a `useQuery` component.** Three test files exist: `src/lib/http.test.ts`, `src/features/orders/model.test.ts`, `src/features/orders/ui/OrderList.test.tsx`. `OrderList.tsx` takes `orders` as a plain prop (`src/features/orders/ui/OrderList.test.tsx:16`) and runs no query. The two components that do call `useQuery` — `src/features/orders/ui/OrdersPage.tsx:10`, `src/features/orders/ui/OrderDetailPage.tsx:8` — have no test file. Searched (1) `find` for every `*.test.ts`/`*.test.tsx` outside `node_modules` → the three above, (2) `grep -l QueryClientProvider` across test files → nothing. No `src/test` directory and no shared render wrapper (searched `renderWithClient|createTestQueryClient|renderWithProviders|TestProviders|renderWithRouter` → nothing); `vitest.setup.ts:1-4` registers `afterEach(cleanup)` and nothing else.

What does exist:

- fetch stub, resolved: `src/lib/http.test.ts:15` — `vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([{ id: 'o-1' }])));`
- fetch stub, rejected: `src/lib/http.test.ts:33` — `vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed to fetch')));`
- teardown: `src/lib/http.test.ts:9-11` — `afterEach(() => { vi.unstubAllGlobals(); });`
- render helper for a props-only component: `src/features/orders/ui/OrderList.test.tsx:13-18` (wraps in `MemoryRouter`), assertions at `src/features/orders/ui/OrderList.test.tsx:23-24` and `:29-30`.
- `.claude/rules/test-mocking-boundary.md:9-10` — "The only thing a test replaces is the global `fetch`, stubbed per test and unstubbed afterwards"; `.claude/rules/test-mocking-boundary.md:43-45` — "No `vi.mock()` of a project module exists anywhere in this repository, which is the other half of the evidence."
- harness: `vite.config.ts:1-11` — jsdom, `setupFiles: ['./vitest.setup.ts']`, `globals: true`; `package.json:10` — `"test": "vitest run"`.

Files to read: `src/lib/http.test.ts`, `src/features/orders/ui/OrderList.test.tsx`, `vitest.setup.ts`, `vite.config.ts`, `.claude/rules/test-mocking-boundary.md`.

## Q3. What does the installed react-query offer for a 404 that means "absent"?

Installed, from the lockfile: `@tanstack/react-query` **5.102.8** — `package-lock.json:11`, resolved entry `package-lock.json:750`. `react` **19.2.8** — `package-lock.json:12`, resolved entry `package-lock.json:2351`. Both pinned exact; declared equals resolved.

- A queryFn may resolve `null` and that is a **success**: "the resolved value may be anything except `undefined`. Queries that resolve to `undefined` will be treated as failed… To store 'nothing' as a successful result in the query cache, resolve `null` instead." — https://tanstack.com/query/v5/docs/framework/react/guides/query-functions (v5). A query resolving `null` therefore settles `status: 'success'`, `isPending: false`, `isError: false`, `data: null`.
- Default `retry` is 3 with exponential backoff — https://tanstack.com/query/v5/docs/framework/react/guides/query-retries (v5) — and it is **not** disabled in tests by default: "The library defaults to three retries with exponential backoff, which means that your tests are likely to timeout if you want to test an erroneous query" — https://tanstack.com/query/v5/docs/framework/react/guides/testing (v5). An explicit per-query `retry` takes precedence over the client default.
- `throwOnError` (v4's `useErrorBoundary`, renamed — https://tanstack.com/query/v5/docs/framework/react/guides/migrating-to-v5): `undefined | boolean | (error, query) => boolean`; default `false` keeps the failure as query state rather than throwing to a boundary.
- **This repo already sets `retry: false`**: `src/main.tsx:8-10` — `new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: 30_000 } } })`. No `throwOnError` default. A test that builds its own `QueryClient` gets the library default (3 retries) unless it repeats `retry: false`.

Files to read: `package-lock.json` (11, 750), `src/main.tsx`, `src/lib/http.ts`.

## Q4. Does anything already branch on an `ApiError`'s status or code?

**Negative result — nothing does.** Searched (1) `instanceof ApiError` across `src/` → nothing, (2) broad `ApiError` across `src/` → only the class at `src/lib/errors.ts`, its throw sites in `src/lib/http.ts`, and `src/lib/http.test.ts`; plus (3) `switch (` across `src/` → nothing, (4) `\.status\b` / `\.code\b` across `src/` → the only `ApiError` touches are its own constructor and factory, `src/lib/errors.ts:13-14` and `src/lib/errors.ts:22-23`. Every other `.status` read is the domain field: `src/features/orders/ui/OrderDetailPage.tsx:18`, `src/features/orders/ui/OrderList.tsx:16`, `src/features/orders/ui/OrdersPage.tsx:8`.

- Every `catch` in `src/`: `src/lib/http.ts:11` / `src/lib/http.ts:16` (the fetch rejection), `src/lib/errors.ts:18` (`response.json().catch(() => null)`), `src/lib/http.test.ts:34` (a test).
- `ApiError` construction: `src/lib/errors.ts:6-15`, `src/lib/errors.ts:17-26` (`fromResponse`), `src/lib/http.ts:17`, `src/lib/http.ts:19`.
- `request()` tolerates no non-ok response: its only parameters are `path: string` and `init?: RequestInit` (`src/lib/http.ts:9`), and `src/lib/http.ts:19` — `if (!response.ok) throw await ApiError.fromResponse(response);` — is unconditional. There is no options flag and no bypass.
- `.claude/rules/network-through-request.md:9-11` — "Everything above `src/lib` reaches the network by calling `request<T>()`, which returns parsed JSON or throws an `ApiError` — a caller never sees a `Response` (`src/lib/http.ts:9-21`)."
- `.claude/rules/query-key-factory.md:8-10` — "Every query key a feature uses is built in that feature's `api.ts`, beside the request functions. A component reads a key off the factory; it never writes a key array (`src/features/orders/api.ts:16-20`)."

Files to read: `src/lib/errors.ts`, `src/lib/http.ts`, `src/features/orders/api.ts`, `.claude/rules/api-error-propagation.md`, `.claude/rules/network-through-request.md`, `.claude/rules/query-key-factory.md`.

## Precedents

- Feature query in a component: `src/features/orders/ui/OrdersPage.tsx:10`, `src/features/orders/ui/OrderDetailPage.tsx:8`.
- Request function over `request<T>()`: `src/features/orders/api.ts:22`, `src/features/orders/api.ts:25`.
- Query key off the factory: `src/features/orders/api.ts:16-20` (built), `src/features/orders/ui/OrdersPage.tsx:10` and `src/features/orders/ui/OrderDetailPage.tsx:8` (read).
- Error surface with `role="alert"`: `src/features/orders/ui/OrdersPage.tsx:25`, `src/features/orders/ui/OrderDetailPage.tsx:11`.
- Props-only component plus its test beside it: `src/features/orders/ui/OrderList.tsx:10`, `src/features/orders/ui/OrderList.test.tsx:13-18`.
- Barrel as the feature's only public surface: `src/features/orders/index.ts:5-9`.
- fetch stubbed per test, unstubbed after: `src/lib/http.test.ts:15`, `src/lib/http.test.ts:33`, `src/lib/http.test.ts:9-11`.

**No precedent, so a new pattern and a decisions row each:** absence as a rendered state (Q1), branching on an `ApiError` status or code (Q4), mounting a query-driven component under test (Q2).

## External APIs

`@tanstack/react-query` → 5.102.8 (`package-lock.json:11`, `package-lock.json:750`) → v5 docs, `query-functions` and `testing` guides → the plan uses: a queryFn may resolve `null` as a success, and a test's own `QueryClient` must set `retry: false` because the library default of 3 retries is not disabled in tests.

## Risks

- `src/main.tsx:9` sets `retry: false` for the app but not for any test-local `QueryClient`; a test that omits it inherits 3 retries and exponential backoff (https://tanstack.com/query/v5/docs/framework/react/guides/testing).
- `.claude/rules/api-error-propagation.md:22-24` names a `null` return from a `catch` as the thing it prevents — the shape a "404 means absent" query function reaches for first.
- `src/features/orders/ui/OrderDetailPage.tsx:11` replaces the whole page on any error; a second query on that page inherits that behavior unless the plan says otherwise.
- `src/features/orders/index.ts:5-9` is the feature's whole public surface; anything the badge exports widens it (`.claude/rules/feature-barrel-imports.md`).
- `src/features/orders/ui/OrderDetailPage.tsx` has no test today, so the first test written for it also establishes the query-component test pattern for the project.

## Open questions (for grilling)

- None. Every question above is answered with citations; the three "no precedent" findings are decisions-table rows, not open facts.
