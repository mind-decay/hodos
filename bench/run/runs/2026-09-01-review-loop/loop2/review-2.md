# Review 2 — status-label
Verdict: ACCEPT · blockers 0 · majors 0 · minors 1

The fix closed the finding at its root rather than at its symptom: the second copy of the words is gone, and the new test renders the real page through a real router and a real `QueryClient` with only `fetch` stubbed, so the next edit to `labels.ts` that misses a call site now fails a test instead of shipping.

## Checks run
- test: `npm test` → 12 passed (5 files), exit 0
- typecheck: `npm run typecheck` → 0 errors, exit 0
- lint: `npm run lint` → 0 problems, exit 0

## Previous findings
| Sev | Location | Status |
|---|---|---|
| major | src/features/orders/ui/OrderDetailPage.tsx:18 | **Closed.** Line 18 is now `{statusLabels[order.data.status]}` with `import { statusLabels } from '../labels';` at line 5 — the fix prescribed, verbatim. `grep -rn 'Awaiting payment' src` returns one definition (`labels.ts:8`) and two assertions about it (`labels.test.ts:7`, `OrderList.test.tsx:35`); no second definition remains. The mutation the finding described now fails: `OrderDetailPage.test.tsx:36` asserts `findByText(statusLabels.open)` against the rendered page, so editing `labels.ts` alone can no longer leave the detail view stale and green. The per-render object literal is gone with it, satisfying `### Data & scale` ("resolved at module load"). |

## Spec
Missing: — · Extra: — · Misunderstood: —

`OrderDetailPage.test.tsx` is not on T1's `Files` line, but it is the direct evidence for T1's acceptance criterion "the detail view shows the same word for the same order", whose absence the previous pass cited as why the drift went unseen. Not counted as Extra. T1 carries no `Tests:` line, so no exemption is claimed and decision 0022 does not apply.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| minor | src/features/orders/ui/OrderDetailPage.test.tsx:11 | defaults catalogue #16 (dead code) | — | `jsonResponse` is copied from `src/lib/http.test.ts:6` with its `status = 200` parameter, which no call in this file overrides — the one call at line 34 passes a body only | drop the parameter: `new Response(JSON.stringify(body), { headers: { 'content-type': 'application/json' } })` |

The copy itself is not a finding: `rules/test-mocking-boundary.md` shows this exact helper as the precedent form, the original is file-local and unexported, and the repository has no shared test-util module to reach for.

`rules/test-mocking-boundary.md` holds — only `fetch` is stubbed (`:34`), unstubbed in `afterEach` (`:28-30`) per the `http.test.ts:9-11` precedent, with real `QueryClient`, real `MemoryRouter`, real `api` and `labels`, no `vi.mock()` of a project module, and assertions on rendered text. Cleanup is covered globally by `vitest.setup.ts` (`afterEach(cleanup)` under `globals: true`), so the per-test `QueryClient` at `:15` leaks nothing (L8). L1–L9 otherwise produce no answer on this diff: the production change is a total `Record` lookup over a closed union on an already-narrowed `order.data`, with no index, mutation, early return, await, or locale in it. An unknown status arriving from the server would render blank, but the plan's `### Invariants & failure modes` owns that decision explicitly ("no fallback string to keep true"), so it is not a finding here.

## Coverage
Not reviewed: everything outside the fix diff — `labels.ts`, `index.ts`, `OrderList.tsx` and their tests were judged in Review 1 and are not reopened. Not run: `npm run build` and the `ui` browser recipe (`/`, `/orders`, `/orders/:id`) — outside the three checks, and the detail page's rendering is now covered by vitest at the `fetch` boundary. Untracked `run.err` and `run.jsonl` sit at the repository root; they are not part of the diff and were left as found.
