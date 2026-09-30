# Verify 1 — orders-summary
Verdict: FAIL · claims 27 · pass 15 · fail 8 · skip 4

| # | Claim (from plan) | Command / action | Evidence | Status |
|---|---|---|---|---|
| 1 | T1: `summarizeOrders` returns the shape `### Interfaces` declares | `npx vitest run summary.test.ts` | `summarizeOrders > counts the orders, adds the totals, and counts each status` — `toEqual({count,total,byStatus})` passed | pass |
| 2 | T1: for `[]` every number in the summary is 0 | `npx vitest run summary.test.ts` | `summarizeOrders > summarizes an empty list as zeros rather than as nothing` passed | pass |
| 3 | T1: 3 orders (10.10 open, 20.20 paid, 31.20 cancelled) → count 3, total 61.5, each status counts 1 | `npx vitest run summary.test.ts` | `summarizeOrders > counts the orders, adds the totals, and counts each status` passed | pass |
| 4 | T1: 0.1 + 0.2 rounds to 0.3 at cent precision | `npx vitest run summary.test.ts` | `summarizeOrders > adds 0.1 and 0.2 to 0.3 at cent precision` passed | pass |
| 5 | mutation: `summary.test.ts` pins the cent-precision total | mutated `summary.test.ts:34` `toBe(0.3)` → `toBe(0.4)`; `npx vitest run summary.test.ts` → 1 failed (`expected 0.3 to be 0.4`); restored; `git status --porcelain` empty | vitest output above | pass |
| 6 | Verify plan: unit — T1 and T2 tests (recipe `unit`) | `npm test` | `Test Files 5 passed (5)` / `Tests 14 passed (14)` | pass |
| 7 | T2: with 3 orders resolved, `/orders` renders a summary line reading `3 orders · 61.50` above the list | stub `fetch` → 3 orders; navigate `/orders`; snapshot; screenshot | DOM text is correct (`3`, `" orders · "`, `61.50` — snapshot), but the browser renders it clipped to **"3 orders · 61"**: `evidence/01-orders-many.png`; detector `overflow` on `p[11]` — content 20px wider than the box (`width:80, overflow:hidden, white-space:nowrap`) | fail |
| 8 | T2: with an empty result the line reads `0 orders · 0.00` | stub `fetch` → `[]`; navigate `/orders`; snapshot; screenshot | DOM text is correct, but clipped to **"0 orders · 0.0"** in the browser: `evidence/02-orders-empty.png`; detector `overflow` on `p[11]` — content 12px wider than the box | fail |
| 9 | T2: the line is absent while the query is pending | stub `fetch` → never-resolving promise; navigate `/orders`; snapshot | only "Loading orders…" renders, no summary text; `evidence/03-orders-pending.png`; console clean | pass |
| 10 | T3: every list item carries `data-status` with the order's status | `evaluate`: read `data-status` off each `li` (many state) | `[{"status":"open",...},{"status":"paid",...},{"status":"cancelled",...}]` | pass |
| 11 | T3: the status word is rendered in the colour mapped to it | `evaluate`: `getComputedStyle(span).color` per row | `open` rgb(26,127,55), `paid` rgb(9,105,218), `cancelled` rgb(207,34,46) — matches `statusColour` map exactly | pass |
| 12 | T3: the three colours are distinguishable in the ui recipe's screenshot of `/orders` | screenshot (many state) | `evidence/01-orders-many.png` — green/blue/red rows visibly distinct | pass |
| 13 | Verify plan: ui — /orders summary line, empty result, three row colours (recipe `ui`) | navigate `/orders` in many/empty states; screenshot | same defect as rows 7 and 8 — the summary line this line asks about is clipped in both states; colours (row 12) are fine | fail |
| 14 | added — presentation defect on `/shift`, no claim names it | source: detector | `clipped` on `div[8]` (Notes box) — text cut 34px short, `overflow-y:hidden`, no ellipsis; not in `verify.detectors.allow` (only `overflow:/shift` is allowed) | fail |
| 15 | added — presentation defect on `/shift`, no claim names it | source: detector | `overlap` — `button[10]` (Save handover) overlaps `button[11]` (Discard) by 20×20px; not in `verify.detectors.allow` | fail |
| 16 | added — accessibility defect, no claim names it | source: detector (`lighthouse_audit` accessibility category, `axe` underneath) | `landmark-one-main`, impact **moderate**, 1 node — identical hit on all 4 swept routes (`/`, `/orders`, `/orders/:id`, `/shift`): the document has no `<main>` landmark | fail |
| 17 | added — console error on `/orders/:id`, no claim names it | source: console | `Uncaught TypeError: Cannot read properties of undefined (reading 'text')` — `OrderDetailPage`'s effect reads `window.__banner.text`, which is unset; route pre-dates this diff (introduced at base `ee9d22f`) and the diff does not touch `OrderDetailPage.tsx`; `evidence/05-order-detail.png` | fail |
| 18 | attack surface: `/orders` | source: attack | no fillable fields and no submit control on `/orders` (a live-updating `<select>` only) — attacks 1 (invalid input), 2 (permission denied), 4 (double submit) have nothing to act on | skip: no form on the route |
| 19 | attack: `/orders` — network killed, then throttled | `emulate {offline}` → reload (browser's own offline page, nothing of the app loaded); `emulate {Slow 3G}` → reload; restored | app rendered its normal `Not Found` error state under Slow 3G, no uncaught exception/console error/5xx | pass |
| 20 | attack: `/orders` — back-and-forward round trip | navigate `/`→`/orders`; `history.back()`; snapshot; `history.forward()`; snapshot | both snapshots answer correctly, console clean at each step | pass |
| 21 | attack surface: `/shift` — invalid input in every field | source: attack | no input fields exist on `/shift` (two buttons only) | skip: no input fields on the route |
| 22 | attack: `/shift` — permission denied | stub `/api/handover` → 403; click Save handover | `role="alert"` "The handover could not be saved." rendered, no console error, no uncaught exception | pass |
| 23 | attack: `/shift` — network killed, then throttled | `emulate {offline}` → reload; `emulate {Slow 3G}` → reload; restored | loads cleanly under Slow 3G, console clean | pass |
| 24 | attack: `/shift` — double submit | stub `/api/handover` (200, 200ms delay, call-counted); click Save handover twice with no wait | `window.__handoverCalls === 2` and button reads "Save handover (2)" — **two** requests were sent, not one; no debounce/disable-while-pending guard on the Save button | fail |
| 25 | attack: `/shift` — back-and-forward round trip | navigate `/`→`/shift`; `history.back()`; snapshot; `history.forward()`; snapshot | both snapshots answer correctly, console clean at each step | pass |
| 26 | route swept: `/` | — | the diff (`git diff --name-only ee9d22f..HEAD`) touches no file `HomePage` renders | skip: not attacked — the diff does not reach this route |
| 27 | route swept: `/orders/:id` | — | the diff touches no file `OrderDetailPage` renders or imports | skip: not attacked — the diff does not reach this route |

## Claim feedback
- unfalsifiable: 12 — "the three colours are distinguishable" names no contrast measure; it ran as a screenshot, which cannot fail it short of the colours being visually identical
- redundant: 6 duplicates 1–4 (the same `npm test` run); 13 duplicates 7, 8 and 12 (the same `/orders` states already screenshotted under T2/T3)
- absent: `src/features/shift/ui/ShiftPage.tsx`'s Save-handover flow — the `POST /handover` call, its permission-denied handling, and the visible saved-count — is in the diff (same commit as T3) but named by no task's Files or Acceptance, which is why its double-submit weakness (row 24) surfaced only through the attack list

## Not covered
- matrix: routes 4 × (no other axes declared) → 4 rows, of 4 in the product
- skips: 18 — no form on the route; 21 — no input fields on the route; 26, 27 — not attacked: the diff does not reach this route
- residue: the first cross-feature interaction before a neighbor is pinned, aesthetics and product fit, and usability as a person means it
