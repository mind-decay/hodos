# The two interactive `init` sessions — 2026-09-02

Stage 10's live half, run by the user from `docs/stages/10-manual.md` in a
second terminal (`PLATFORM-NOTES.md` fact 32: no `AskUserQuestion` headless,
decision 0013). The excerpts below are what the sessions printed, verbatim,
recovered from their transcripts; the framing lines between them are the only
text written here.
Heading levels inside an excerpt are the session’s own, not this file’s.

Session A ran `/hodos:init` and then `/hodos:init --refresh` on a throwaway
copy of `bench/fixtures/webapp` seeded with the instructions a team already
keeps — seven statements in `CLAUDE.md`, two more in `.cursor/rules/old.mdc`.
Session B ran `/hodos:init` on a copy of `bench/fixtures/mono`. Both copies
lived outside the repository and are evidence, not fixtures.

The `InstructionsLoaded` probe behind platform check G is not repeated here:
its finding is `PLATFORM-NOTES.md` facts 43–45, and the probe procedure is
`docs/stages/10-manual.md` B0–B3.

---

## Session A, run 1 — full `init` (criteria 1a, 1b, 7, 8, 9, 11)

Preflight, the first thing the run printed:

> Preflight OK — 1 warning: node lives under nvm (`<home>/.nvm/.../v25.8.1`). Kernels get node fine; hooks spawned from a session started outside login shell (desktop app, launcher) may not. Run continues.

Steps 0–3 are the scan and the interview. Step 4 is the report the whole
approval hangs on, and it is reproduced whole — the rules table is criterion
1b's only evidence, and the ledger is criterion 9's.

---
Answers folded in. Step 4 — the report. Still nothing written.

## 1. `config.json` (proposed)

| Field | Value | Where it comes from |
|---|---|---|
| `language` | `"en"` | answer 5 |
| `stack` | `["typescript","react","vite","vitest"]` | lockfile |
| `commands.test` | `npm test` | ran green, 3 files / 8 tests |
| `commands.lint` | `npm run lint` | ran green, exit 0 |
| `commands.typecheck` | `npm run typecheck` | ran green, exit 0 |
| `commands.build` | `npm run build` | ran green, 81 modules |
| `commands.dev` | `npm run dev` · `http://localhost:5173` · ready `Local:` | started this session, line captured |
| `verify.recipes` | `unit` (command, `npm test`, always) · `ui` (browser, `/`, `/orders`, `/orders/:id`, when `ui`) | answer 2 — no `http` recipe, there is no backend |
| `conventions.commit` | `conventional` | 4/4 subjects, confirmed in answer 4 |
| `conventions.branch` | `feature/{slug}` | answer 4 |
| `adapters.browser` | `chrome-devtools` | `.mcp.json` — committed, so every clone has it |
| `adapters.codeIndex` · `tracker` · `design` | `null` | none present; answer 4 = no tracker |
| `models` · `autonomy` · `gates` · `tasks` | defaults (`ask`, all gates `false`, `track:false`) | not raised |
| `nested` | `[]` | single manifest |
| `scanSha` · `verifiedAt` | `8608b011…` · `2026-09-02` | `git rev-parse HEAD`, today |

## 2. Rules

| Rule | `paths` | Precedents | Source | Q1 · Q2 · Q3 | Judgement | Form |
|---|---|---|---|---|---|---|
| **Cross-feature imports go through the barrel** | `src/features/**`, `src/App.tsx` | `App.tsx:3`, `App.tsx:4`; declared `features/orders/index.ts:1-9`, `features/home/index.ts:1` | — | descriptive · **incident: a model imported `features/orders/ui/OrderList` by path** (answer 7) · a lint could, but `eslint.config.js` is off-limits | keep | prose + lint proposal |
| **User-facing text is written in English** | `src/**` | `HomePage.tsx:6`, `HomePage.tsx:8`, `OrderList.tsx:10`, `OrdersPage.tsx:16`; also `http.ts:17` reaches the user via `OrdersPage.tsx:25` | — | descriptive · **incident: error text has landed in Russian** (answer 8) · nothing checks it | keep | prose |
| **Tests assert behavior, not implementation shape** | `**/*.test.ts`, `**/*.test.tsx` | `OrderList.test.tsx:23-24`, `OrderList.test.tsx:29-30`, `http.test.ts:24-29`, `model.test.ts:10-12` | testing-library guiding-principles | descriptive · developer named it (answer 1) · nothing checks it | keep | prose |
| **A new test is proven by watching it fail** | `**/*.test.ts`, `**/*.test.tsx` | none — it is a procedure, not a code shape | js-testing-best-practices | **prescriptive** · developer named it (answer 1) · nothing checks it | keep — developer settled it | prose |
| ~~Network calls go through `request()`~~ | — | `api.ts:23`, `api.ts:25` | — | descriptive · developer named it · **the check exists and passes**: `eslint.config.js:20-26`, probe → `error no-restricted-globals`, and `lint` is in the gate | **rejected on Q3** — prose would restate the lint message | — |
| ~~Query keys come from the `keys` factory~~ | — | `OrdersPage.tsx:10`, `OrderDetailPage.tsx:8` | tanstack query-keys | descriptive · **no observation** — not named, no correcting commit in a 4-commit history · no check | **rejected on Q2** | — |
| ~~Network failures are `ApiError`~~ | — | `http.ts:17`, `http.ts:19` | — | descriptive · **no observation** · no check | **rejected on Q2** | — |

Lint proposal for you, not written by me: a `no-restricted-imports` (or `eslint-plugin-boundaries`) clause banning `src/features/*/…` deep paths. It would retire the barrel rule's prose. `eslint.config.js` stays untouched per answer 3.

## 3. `CLAUDE.md`

Existing file keeps every byte at step 6; a managed block is appended below it. Ledger retirements (step 8) then edit the lines you approve.

| | |
|---|---|
| Block | `<!-- hodos:begin -->` … `<!-- hodos:end -->`, ≤60 lines |
| Contents | what the project is · the layout (`src/lib` shared, `src/features/<name>/{api,model,ui}`, `App.tsx` routes, `main.tsx` providers) · the four commands and the gate (test, lint, typecheck) · the dev fact that `/api` 404s and the app is exercised through vitest · a pointer to `.claude/rules/` |
| Not restated | "ask before adding a dependency" — it stays where it is, above the block, and the block does not repeat it |

## 4. Migration ledger

| # | Instruction | Where | Settlement | Evidence | What is lost |
|---|---|---|---|---|---|
| 1 | Every network call goes through `request()` | `CLAUDE.md:5` | **automate** — already automated | follows 2 (`api.ts:23,25`), breaks 0; probe → lint error | the statement before writing; the lint says it after, in the same words |
| 2 | Never use `any` | `CLAUDE.md:6` | **automate** — already automated | 0 occurrences in `src`; probe → `no-explicit-any` error | nothing |
| 3 | Components stay small and focused | `CLAUDE.md:7` | **delete** | largest component 29 lines (`OrdersPage.tsx`); no metric, no check | nothing (answer 8) |
| 4 | API served from `localhost:3000/api`; start it first | `CLAUDE.md:8` | **delete** | contradicted by `http.ts:3` + no proxy in `vite.config.ts` | nothing — that `/api` 404s in dev moves into the map |
| 5 | Run `npm run build` before every commit | `CLAUDE.md:9` | **rewrite** → the map's gate line: test, lint, typecheck | build passes while a test is red (answer 6) | "build before every commit"; build stays a recorded command |
| 6 | Do not edit `package-lock.json` / `eslint.config.js` | `CLAUDE.md:10` | **automate** → PreToolUse hook (below) | prose only today; hook tested green this session | prose the model may skim; the hook blocks instead of asking |
| 7 | Ask before adding a dependency | `CLAUDE.md:11` | **retain** | not checkable, already loads | — |
| 8 | A feature is imported through its barrel | `.cursor/rules/old.mdc:7-8` | **relocate** → `.claude/rules/feature-barrel-imports.md` | glob `src/features/**` carries over | **Cursor stops reading it** — the `.mdc` is Cursor's file, not Claude Code's |
| 9 | Error text a user sees is English | `.cursor/rules/old.mdc:10` | **relocate** → `.claude/rules/user-facing-text-english.md` | same file, same glob | same — Cursor stops reading it |

Rows 8 and 9 empty the `.mdc` body; the file would be left as frontmatter with nothing under it. That needs its own decision.

**Hook** (`.claude/settings.json`, committed — never in the batch). PreToolUse, matcher `Edit|Write|NotebookEdit`, exact command:

```
node -e 'let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const p=(JSON.parse(s).tool_input||{}).file_path||"";if(/(^|\/)(package-lock\.json|eslint\.config\.js)$/.test(p)){console.error("Blocked: "+p+" is a decision, not a preference — only the developer changes it (CLAUDE.md).");process.exit(2)}})'
```

Ran three cases this session: `eslint.config.js` → exit 2 blocked, `package-lock.json` → exit 2 blocked, `src/lib/http.ts` → exit 0 allowed. Known gap, stated rather than hidden: it guards the file tools, not `sed -i` through Bash.


---

### Step 5 — what was asked, and how

Four questions in the first `AskUserQuestion`, then two more after the ledger
was settled. The batch carried only the uncontested rows; every contested one
was its own question, which is what `SKILL.md` step 5 requires.

```
Q: Approve the uncontested batch — config.json as tabled (four verified commands, the two
   recipes, conventional + feature/{slug}, chrome-devtools as the browser adapter), the four
   rules, the appended CLAUDE.md block, and ledger rows 1–5 and 7?
   - Approve the batch (Recommended)          ← taken
   - Approve config + CLAUDE.md only
   - Approve, but leave CLAUDE.md alone

Q: Ledger rows 8 and 9 relocate both statements out of .cursor/rules/old.mdc into
   .claude/rules/. That leaves the .mdc as frontmatter with an empty body, and Cursor stops
   seeing either instruction. What happens to that file?
   - Relocate both, leave a pointer (Recommended)   ← taken
   - Relocate both, delete the .mdc
   - Relocate both, keep the .mdc as is
   - Keep them in the .mdc, no rules

Q: The English-text rule: the .mdc glob was src/features/**, but the message at
   src/lib/http.ts:17 reaches the user through OrdersPage.tsx:25. Carrying the glob verbatim
   would leave that file uncovered; widening it goes past the scoping decision you already made.
   - src/** (Recommended)
   - src/features/** — the glob as written
   - src/features/** and src/lib/**                 ← taken

Q: Three candidates were rejected: network-through-request() (a passing lint already holds it),
   the query-keys factory and the ApiError boundary (both real conventions, but nobody has
   observed the model breaking them here). Rejecting on Q2 is how a rule avoids costing context
   forever -- but you named direct fetch as a live failure in answer 1.
   - Confirm all three rejections (Recommended)     ← taken
   - Write the request() rule anyway
   - Write request() and the query-keys rule
```

The two rows that write outside `.claude/rules/` were asked on their own:

```
Q: Ledger row 6 — the hook that blocks edits to package-lock.json and eslint.config.js. It goes
   into .claude/settings.json, which is committed, so it runs for everyone who clones the repo.
   The exact command was shown above and ran three cases green this session.
   - Write the hook, retire the prose (Recommended) ← taken
   - Write the hook, keep the prose too
   - Also match Bash
   - No hook — row 6 stays retain

Q: hodos scripts run as `node <plugin root>/scripts/...`. Without a permissions entry that is one
   approval prompt per script call, every run. The entry names an absolute path on this machine,
   so it belongs in .claude/settings.local.json -- which is gitignored, and which I would add to
   .gitignore in the same pass.
   - Add the allow entry (Recommended)              ← taken
   - Skip it
```

### Steps 6–8, and the closing report
`settings.local.json` correctly absent from that list — the `.gitignore` line covers it.

## Done

**Written**

| File | What |
|---|---|
| `.claude/hodos/config.json` | 5 commands, all run green this session; `unit` + `ui` recipes; `conventional` / `feature/{slug}`; `chrome-devtools` as browser adapter, three roles `null`; `scanSha 8608b011…`, `verifiedAt 2026-09-02` |
| `.claude/rules/feature-barrel-imports.md` | descriptive, 4 precedents, `src/features/**` + `src/App.tsx` |
| `.claude/rules/user-facing-text-english.md` | descriptive, 5 precedents, `src/features/**` + `src/lib/**` |
| `.claude/rules/tests-assert-behavior.md` | descriptive, 4 precedents, `**/*.test.ts(x)` |
| `.claude/rules/new-test-proven-red.md` | prescriptive on your decision, `**/*.test.ts(x)` |
| `CLAUDE.md` | managed block appended; the 6 approved rows then retired above it |
| `.cursor/rules/old.mdc` | body replaced with a pointer to `.claude/rules/` |
| `.gitignore` | 5 hodos lines |
| `.claude/settings.local.json` | `permissions.allow` merged, `enabledMcpjsonServers` kept |
| `.claude/settings.json` | the PreToolUse hook, re-tested from the JSON as stored |

4 rules, 21 citations, all resolving. 2 rules carry a source URL (testing-library, js-testing-best-practices); 2 carry an incident you named.

**Checks** — `config.mjs check` 0 · `lint.mjs --project` clean, 5 files · `verify-citations` 21/21 · `npm test` 0 · `npm run lint` 0 · `npm run typecheck` 0 · `npm run build` 0 · `npm run dev` reached `Local: http://localhost:5173/`.

**Two things I corrected mid-run**, both caught by the checks rather than by me: a citation written as `OrdersPage.tsx:3-5` instead of project-root-relative, and a map line restating retired row 6 — the same statement back in a loading file, which is exactly what `automate` retires.

**Left for you**

- The `no-restricted-imports` / `eslint-plugin-boundaries` clause banning `src/features/*/**` deep paths. It would retire `feature-barrel-imports.md`. `eslint.config.js` untouched, per your answer 3.
- The hook guards `Edit`/`Write`/`NotebookEdit`. A `sed -i` through Bash still reaches both files — you declined the Bash matcher because string-matching a shell command blocks harmless reads too.
- `src/main.tsx:13` (`'the #root element is missing from index.html'`) sits outside the English rule's paths. It is a developer-facing throw, not rendered copy, so nothing is wrong — noting it because you picked the narrower scope deliberately.

---

## Session A, run 2 — `--refresh` (criteria 2a, 2b)

Between the runs the copy gained `src/features/reports/` (3 files) and two
renames: `src/lib/http.ts` → `net.ts` with its test, and `src/lib/errors.ts` →
`api-error.ts`. The rename target was picked from what the rules actually
cite, not from what looked central.
All four commands ran green. Delta report:

## 1. Citations — 4 dead, all from 2 renames

`verify-citations.mjs` → exit 1, `citations: 4 of 21 do not resolve`

| Rule | Line | Dead citation | Re-point | Content check |
|---|---|---|---|---|
| `tests-assert-behavior.md` | 33 | `src/lib/http.test.ts:24-29` | `src/lib/net.test.ts:24-29` | identical — the `rejects.toMatchObject` block |
| `tests-assert-behavior.md` | 43 | `src/lib/http.test.ts:24-29` | `src/lib/net.test.ts:24-29` | same |
| `user-facing-text-english.md` | 22 | `src/lib/http.ts:17` | `src/lib/net.ts:17` | identical — the network `throw` |
| `user-facing-text-english.md` | 37 | `src/lib/http.ts:17` | `src/lib/net.ts:17` | same |

Plus prose, `tests-assert-behavior.md:31`: "`http.test.ts` stubs the global `fetch`" → `net.test.ts`. Not a citation, same rename.

Renames: `a6eba35` (`http.ts`→`net.ts`, `http.test.ts`→`net.test.ts`), `5c00d35` (`errors.ts`→`api-error.ts`). No rule retires — every claim still holds, only the paths moved.

## 2. Drift — none

| Rule | Violations | Checked by |
|---|---|---|
| `feature-barrel-imports` | 0 | only `App.tsx:3-4` crosses a feature boundary, both off barrels |
| `tests-assert-behavior` | 0 | 4 test files, all assert observable output |
| `user-facing-text-english` | 0 | no Cyrillic in `src` |
| `new-test-proven-red` | — | procedure, nothing can check it |

## 3. New area — `src/features/reports/` (3 files, since `scanSha`)

Covered by existing `paths:` globs (`src/features/**`, `**/*.test.ts`). No `ui/`, no `api.ts` — nothing uncovered, no new rule candidate. `src/features/reports/index.ts:1-5` is a third barrel — an optional 5th precedent for `feature-barrel-imports`.

## 4. CLAUDE.md — 2 dead rows in the managed block

| Line | Now | Should read |
|---|---|---|
| 20 | `src/lib/http.ts` | `src/lib/net.ts` |
| 21 | `src/lib/errors.ts` | `src/lib/api-error.ts` |

Text above `<!-- hodos:begin -->` untouched.

## 5. config.json

Commands all green this session: `npm test` (10 passed), `npm run lint`, `npm run typecheck`, `npm run build`. `scanSha` `8608b01` → `a6eba35`; `verifiedAt` stays `2026-09-02`. Nothing else changes.

## 6. Ledger

| # | Instruction | Where | Settlement | Evidence | What is lost |
|---|---|---|---|---|---|
| 1 | pointer to `.claude/rules/` | `.cursor/rules/old.mdc:7-8` | retain | prior run's relocation, still accurate | — |

## 7. Proposal — not a write

`eslint.config.js:14` and `:20` still name `src/lib/http.ts` in the comment and the lint message. That file is the developer's and the `PreToolUse` hook blocks writes to it. Yours to change.


### The closing report
Refresh done. Self-check green.

## Written

| File | Change |
|---|---|
| `.claude/rules/tests-assert-behavior.md` | 2 citations + 1 prose mention → `src/lib/net.test.ts` |
| `.claude/rules/user-facing-text-english.md` | 2 citations → `src/lib/net.ts` |
| `CLAUDE.md` (managed block) | map rows → `src/lib/net.ts`, `src/lib/api-error.ts` |
| `.claude/hodos/config.json` | `scanSha` → `a6eba35`, `verifiedAt` `2026-09-02` |

Nothing else moved. Text above `<!-- hodos:begin -->` byte-identical.

## Self-check

| Check | Result |
|---|---|
| `config.mjs check` | `config: ok` — exit 0 |
| `lint.mjs --project` | `lint: clean — 5 files` — exit 0 |
| `verify-citations.mjs` | `citations: 21 resolve` — exit 0 (was 4 of 21 dead) |
| `npm test` | 4 files, 10 tests passed |
| `npm run lint` | exit 0 |
| `npm run typecheck` | exit 0 |
| `npm run build` | exit 0, 81 modules |

4 rules, 3 with sources (`testing-library.com`, `javascript-testing-best-practices`), 1 procedural with no source.

## Declined

`src/features/reports/index.ts:1-5` as a 4th precedent for `feature-barrel-imports` — skipped, rule already carries enough.

## Left in place

- **`eslint.config.js:14,20`** still names `src/lib/http.ts` in the comment and the lint message `"Call the network through request() in src/lib/http.ts."`. Developer's file, and the `PreToolUse` hook blocks writes to it. Yours to fix.
- **`.cursor/rules/old.mdc`** — `retain`. Pointer to `.claude/rules/`, still accurate.

---

## Session B — full `init` on the monorepo (criteria 3, 10, 11)

Preflight, again the first thing printed:

> Preflight: warning only (node under nvm — hooks may miss node if session launched outside shell). Run continues.

A fixture with no existing AI instructions and no observation to carry a rule.
The interesting half is what it refused to write.
# Step 4 — Report

## Table 1 — `config.json` (3 files)

**Root** `/private/tmp/hodos-manual-10b/.claude/hodos/config.json`

| Field | Value | Where it came from |
|---|---|---|
| `stack` | `["node","javascript","typescript","eslint","vitest"]` | `package.json:14-20`, lockfile |
| `commands.test` | `npm test` | `package.json:9` · ran green |
| `commands.lint` | `npm run lint` | `package.json:10` · ran green |
| `commands.typecheck` | `npm run typecheck` | `package.json:11` · ran green |
| `commands.build` / `dev` | `null` / `null` | no such script — reviewer reads `not configured` |
| `verify.recipes` | one: `unit`, `command`, `npm test`, `when:"always"` | your answer 2 |
| `conventions` | `commit: conventional`, `branch: feature/{slug}` | 3/3 commits · your answer 4 |
| `adapters` | all four `null` | no `.mcp.json` |
| `nested` | `["web","svc"]` | both override commands |
| `scanSha` / `verifiedAt` | `660b327…f30a77` / `2026-09-02` | `git rev-parse HEAD` / today |

**`svc/.claude/hodos/config.json`** — overrides only

| Field | Value | Why it overrides |
|---|---|---|
| `stack` | `["node","javascript","eslint"]` | no TypeScript, no vitest in svc |
| `commands.test` | `node --test src/*.test.js` | `svc/package.json:15` · ran green |
| `commands.lint` | `npx eslint .` | svc has no `lint` script; verified it lints all 3 svc files |
| `commands.typecheck` | `null` | no `svc/tsconfig.json`; root's `--if-present` skips svc |
| `verify.recipes` | `unit` → `node --test src/*.test.js` | arrays replace on merge |

**`web/.claude/hodos/config.json`** — overrides only

| Field | Value | Why it overrides |
|---|---|---|
| `stack` | `["node","typescript","eslint","vitest"]` | — |
| `commands.test` | `npx vitest run` | `web/package.json:10` · ran green |
| `commands.typecheck` | `npx tsc --noEmit` | `web/package.json:11` · ran green |
| `commands.lint` | `npx eslint .` | web has no `lint` script; verified it lints both web files |
| `verify.recipes` | `unit` → `npx vitest run` | — |

## Table 2 — Rules: six candidates, zero written

| Candidate | Precedents | Q1 kind · Q2 · Q3 | Verdict |
|---|---|---|---|
| web imports svc by package name, never a relative path | `web/src/basket.ts:1`; rationale at `eslint.config.js:14-15` | descriptive · — · **a lint holds it** | **reject at Q3** — `no-restricted-imports`, `eslint.config.js:18-25`. Prose would restate a check that already fails the build |
| svc stays JavaScript with a hand-written `.d.ts` | `svc/src/index.js:1-4`, `svc/src/index.d.ts:1-2`, `svc/package.json:6-12` | descriptive, 3 · **no observation** · no | **reject at Q2** |
| Test runner per workspace: node:test in svc, vitest in web | `svc/package.json:15`, `svc/src/index.test.js:2`, `web/package.json:10`, `web/src/basket.test.ts:1` | descriptive, 4 · **no observation** · no | **reject at Q2** — and `config.json` records both runners anyway, so the fact survives without prose |
| Money rounded to 2dp via `Math.round(x*100)/100` | `svc/src/index.js:17`, `web/src/basket.ts:13` | descriptive, 2 · **no observation** · no | **reject at Q2** |
| Tests colocated as `*.test.*` siblings | `svc/src/index.test.js`, `web/src/basket.test.ts` | descriptive, 2 · **model does this unprompted** · no | **reject at Q2** |
| Errors name the offending value; tests assert the message | `svc/src/index.js:16` | **1 precedent** — an observation, not a convention | **reject at Q1** |

You said no rule without an observation. There is no observation: you named no case, and the history has no correction to point at. **Zero rules written.** `.claude/rules/` is created empty so later runs have a home.

Two things stay recorded as observations, not rules, so a later `--refresh` can pick them up if a case appears: svc's `exports` map (`svc/package.json:8-13`) blocks `@mono/svc/src/index.js` but *not* `../svc/src/index.js` — the eslint rule covers exactly that gap; and `applyTax` rounds, then `basketTotal` rounds the sum again (`svc/src/index.js:17` → `web/src/basket.ts:13`).

## Table 3 — `CLAUDE.md`

| Row | State | Action |
|---|---|---|
| `CLAUDE.md` | **absent** | write a fresh map, ≤60 lines: what it is, the two workspaces, the commands per scope, a pointer to `.claude/rules/` |

No existing file → no managed block, no byte of yours at risk.

## Table 4 — Migration ledger

**Empty.** No `CLAUDE.md`, `AGENTS.md`, `.cursor/rules/`, `.cursorrules`, `.github/copilot-instructions.md`, `.windsurfrules`, or `.claude/`. Nothing to settle.

---

Step 5 — approval:


### The closing report
All eight commands green. Step 8 — ledger was empty, nothing to retire.

---

# Done

**Written** (8 paths, all new except `.gitignore`):

| Path | What |
|---|---|
| `.claude/hodos/config.json` | root — commands, one always-on unit recipe, `nested: ["web","svc"]`, `scanSha 660b327`, `verifiedAt 2026-09-02` |
| `svc/.claude/hodos/config.json` | overrides only: node:test runner, `npx eslint .`, `typecheck: null` |
| `web/.claude/hodos/config.json` | overrides only: vitest, `npx tsc --noEmit`, `npx eslint .` |
| `CLAUDE.md` | new file, 54 lines — layout, per-scope command table, conventions, pointer to `.claude/rules/` |
| `.claude/rules/` | created empty |
| `.gitignore` | +5 lines, appended; the original 4 byte-identical |
| `.claude/settings.local.json` | `permissions.allow` with the plugin root resolved; gitignored by the line above |
| `.claude/settings.json` | **not written** — nothing earned it. No hook came out of the rule filter, and the ledger was empty |

**Self-check.** `config.mjs check` exit 0 from all three project roots. `lint.mjs --project` clean. `verify-citations.mjs CLAUDE.md` → 3 resolve. Every one of the 8 recorded commands re-run green after the writes.

**Rules: 0 written, 6 candidates rejected.** Sources fetched: `typescript.md` → the handbook's declaration-file do's and don'ts; `node.md` → the packages/`exports` encapsulation page. Neither produced a candidate that cleared the filter. One rejection was at Q3 (eslint already enforces the package-name import), one at Q1 (single precedent), four at Q2 — no observation. You set that bar and the repo met none of it.

**Not done, and why:**

- `commands.build` and `commands.dev` are `null`. No such script exists; the reviewer will read `not configured` rather than a failure.
- All four adapter roles `null` — there is no `.mcp.json`. `chrome-devtools` and `Figma` are live in your session but come from your own config; a teammate cloning this repo would not have them. Commit a `.mcp.json` if you want either recorded.
- `.claude/rules/` is an empty directory, so git will not carry it. It appears for teammates on the first rule written.

**One caveat from preflight, still true:** node lives at `~/.nvm/versions/node/v25.8.1/bin/node`. Kernels get it from your shell's PATH; a hook spawned by a session launched outside that shell would not. Nothing here depends on it yet — no hooks were written — but it will matter if you later turn on a gate.

