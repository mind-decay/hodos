# Review 2 — status-label
Verdict: ACCEPT · blockers 0 · majors 0 · minors 0

The fix picked the assertion that carries the coupling rather than the one that
restates it: `OrderDetailPage.test.tsx:33` asserts against `statusLabels.open`,
so it fails when the detail page drifts from the labels module, while the word
itself stays pinned as a literal at `labels.test.ts:7`. Neither test can go
green on a broken page, and neither duplicates the other's job.

## Checks run
- test: `npm test` → 5 files, 12 passed (was 4 files, 11 — the new detail test runs)
- typecheck: `npm run typecheck` → 0 errors
- lint: `npm run lint` → clean

## Previous findings
| Sev | Location | Status |
|---|---|---|
| major | src/features/orders/ui/OrderDetailPage.tsx:18 | closed — the inline object literal is gone; the line now reads `{statusLabels[order.data.status]}` behind `import { statusLabels } from '../labels'` (OrderDetailPage.tsx:5). `labels.ts` has the two production consumers the plan's `Dependency direction` ordered. Trigger retired: editing `open` in `labels.ts` now moves both views, and `OrderDetailPage.test.tsx:33` fails if the detail page stops reading the module. |

## Spec
Missing: — · Extra: — · Misunderstood: —

`OrderDetailPage.test.tsx` is outside T1's `Files:` list, but it is the recorded
ruling of 14:57:05 and it covers T1's own acceptance clause ("the detail view
shows the same word for the same order"), which had no test before. Not Extra.

## Standards
No findings.

Checked and clean on the fix diff: `test-mocking-boundary` — only `fetch` is
stubbed (`:31`), released by `vi.unstubAllGlobals()` in `afterEach` (`:26-28`),
with a real `MemoryRouter`, a real `QueryClient` and the real `api` module; no
`vi.mock()` of a project module. `feature-barrel-imports` — `../api`, `../labels`
and `./OrderDetailPage` are intra-feature relatives, which the rule permits.
`error-role-alert` — the error early return at `OrderDetailPage.tsx:12` is
untouched and keeps its `role="alert"`. L2 — the lookup is total over
`Record<OrderStatus, string>`, typecheck green. L7 — `await findByText` settles
the query before `queryByText('open')` reads (`:33-34`). L8 — the stub is the
only acquired resource and every path releases it.

## Coverage
Re-review: only the fix diff was read, per the package. The rest of the
implementation — `labels.ts`, `index.ts`, `OrderList.tsx` and their tests — was
judged in Review 1 and is not reopened here; `labels.test.ts:7` and
`OrderList.test.tsx:35` were read only to confirm the literal `Awaiting payment`
is still pinned somewhere, which it is. Browser routes were not exercised.
