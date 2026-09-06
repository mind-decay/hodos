I'll run the config check first, then grep for both shapes.

Config found. Now history evidence + mechanical-check evidence.

Config found. Three answers, each with its grep.

## 1. Does the code follow it?

**Yes — 4 precedents, 0 counter-instances.** Every component in `src` is exported by name; `export default` appears **zero** times anywhere under `src/`.

```
$ grep -rn "export default" src/          → 0 hits
$ grep -rn "^export \(function\|const\)" src/features/*/ui/*.tsx → 4 hits
```

- `src/features/orders/ui/OrderDetailPage.tsx:6` — `export function OrderDetailPage()`
- `src/features/orders/ui/OrdersPage.tsx:7`
- `src/features/orders/ui/OrderList.tsx:9`
- `src/features/home/ui/HomePage.tsx:3`

No drift. The only two `export default` in the repo are `eslint.config.js:5` and `vite.config.ts:4` — tool configs whose formats require it, outside `src`.

## 2. Would the model do it without the rule?

**No — you named it, twice in a month, most recently on the orders detail page.** That is the observation this question needs: a default export is React's most common house style, so the model's prior points the wrong way here and the correction cost has been paid repeatedly.

Caveat worth your call: `CLAUDE.md:33` already says *"Named exports only. There is no `export default` anywhere in `src`."* — an always-loaded line that has not held. The rule is not a duplicate of it in kind: it fires exactly when a `.tsx` under `src` is open, and carries the recipe and the barrel edit rather than a one-line assertion. But it does make `CLAUDE.md:33` redundant.

Git history here is 3 commits, so there is no fix commit to cite — your report is the evidence, not the log.

## 3. Is it mechanically checkable?

**Yes, and a lint rule would beat this prose** — `no-restricted-syntax` with selector `ExportDefaultDeclaration` over `src/**/*.{ts,tsx}`, alongside the existing `no-restricted-globals` block at `eslint.config.js:20-27`.

It is not available: `CLAUDE.md:36` freezes `eslint.config.js` by project decision. So prose, with the check named in the rule's own text — the same resolution `feature-barrel-imports.md:43-44` took.

Three answers hold. Draft:

Lint clean — 8 files.

**File:** `.claude/rules/components-exported-by-name.md`, 61 lines, scoped to `src/**/*.tsx` and `src/features/**/index.ts` — fires when a component file or a barrel is open, not on `api.ts` or `model.ts` turns.

`/hodos:status` will flag it if any of the six precedents move.

**Line for the CLAUDE.md rules table:**

```
| `components-exported-by-name` | components are exported under their own name |
```

Two follow-ups, your call:

- `CLAUDE.md:33` ("Named exports only. There is no `export default` anywhere in `src`.") is now redundant with the rule and is the line that already failed to hold. Drop it, or shorten it to a pointer.
- The lint rule stays the better fix if you ever unfreeze `eslint.config.js` — one `no-restricted-syntax` entry beside the existing `no-restricted-globals` block ends this permanently.

