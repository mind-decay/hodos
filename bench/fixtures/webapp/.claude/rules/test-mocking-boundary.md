---
paths:
  - "src/**/*.test.ts"
  - "src/**/*.test.tsx"
---

# Mock the network boundary; use the real collaborators

The only thing a test replaces is the global `fetch`, stubbed per test and
unstubbed afterwards:

```ts
afterEach(() => {
  vi.unstubAllGlobals();
});

it('returns the parsed body of a successful response', async () => {
  vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([{ id: 'o-1' }])));
  await expect(request<{ id: string }[]>('/orders')).resolves.toEqual([{ id: 'o-1' }]);
});
```

Everything else in the test is the real thing. A component renders inside a real
router:

```tsx
const renderList = (given: Order[]) =>
  render(
    <MemoryRouter>
      <OrderList orders={given} />
    </MemoryRouter>,
  );
```

A zustand store is reset, not replaced — `useOrdersFilter.getState().reset()` in
`beforeEach` (`src/features/orders/model.test.ts:5-7`). That is the store's own
reset mechanism, and it is why no store needs a mock.

Assertions go through what the user perceives: roles and accessible names
(`src/features/orders/ui/OrderList.test.tsx:23-24`), the rendered text
(`src/features/orders/ui/OrderList.test.tsx:29`).

No `vi.mock()` of a project module exists anywhere in this repository, which is
the other half of the evidence: the shape below is what the tests do, and the
shape this rule refuses is what they have never done.

## Precedents

- `src/lib/http.test.ts:9-11` — `afterEach(() => {`
- `src/lib/http.test.ts:15` — `vi.stubGlobal('fetch', vi.fn().mockResolvedValue(jsonResponse([{ id: 'o-1' }])));`
- `src/lib/http.test.ts:20-23` — `vi.stubGlobal(`
- `src/lib/http.test.ts:33` — `vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('failed to fetch')));`
- `src/features/orders/ui/OrderList.test.tsx:13-18` — `const renderList = (given: Order[]) =>`
- `src/features/orders/model.test.ts:5-7` — `beforeEach(() => {`

## What it prevents

`vi.mock('../api')` to cover a page pins the test to the implementation it
mocked: the test then passes while the page is broken, and fails when the module
is refactored without the behaviour changing.

Source: https://testing-library.com/docs/guiding-principles/ — the more a test
resembles the way the software is used, the more confidence it gives.
