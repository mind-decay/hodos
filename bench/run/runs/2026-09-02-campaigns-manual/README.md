# The two interactive sessions — 2026-09-02

Stage 9a criteria 1, 4 and 7, run by the user from `docs/stages/09a-manual.md`
in a second terminal (`PLATFORM-NOTES.md` fact 32: no `AskUserQuestion`
headless). The excerpts below are what was pasted back, verbatim. Where the
terminal wrapped a wide table the paste came back mangled; those places are
marked `[terminal wrap]` and the surrounding lines are untouched. The two
fixture copies are throwaways and are gone; the map of session A is reproduced
here in full because it is the artifact criterion 1 is about.

## Session A — the round trip (criteria 1 and 7)

`/hodos:task make the app accessible — every interactive element keyboard-reachable and labelled, and something that keeps new code honest. I do not know yet which components are wrong, and the focus-state design is not decided.`

### The router's verdict

The nine rows came back with `unknown` on rows 1, 2 and 4 and `yes` on rows 6
and 7 — `[terminal wrap]` in the evidence column of several rows. The verdict:

```
Path: campaign — rule 1: rows 6 and 7 are `yes` (fog + more than one mergeable unit)
Type: feature
Campaign: yes — an un-inventoried scope plus an undecided design mechanism is a map, not a task
```

```
⏺ User answered Claude's questions:
· Router verdict: campaign / feature. Confirm or override? → campaign, feature (Recommended)

Confirmed. Campaign verdict opens no task — no brief.md, no ledger init. Handing to the campaign skill.
```

### The two Skill-tool invocations — criterion 7

```
⏺ Skill(hodos:campaign)
Successfully loaded skill · 1 tool allowed
```

and, after the node proposal was accepted:

```
Map on disk, claim committed. Handing the node to task.

⏺ Skill(hodos:task)
Successfully loaded skill · 1 tool allowed

Node routes independently. Rows 1–5 rest on the reads already made — no new evidence calls needed.
```

The inner `task` printed its own nine rows and went on to grilling. It did not
invoke `campaign`: step 3 is skipped for a `<campaign>/<node>` argument
(`skills/task/SKILL.md:44`), which is what terminates the re-entry. Its verdict:

```
Path: standard — quick fails on rows 1–2 (9 files, a new module)
Type: bug — D4 names current wrong outputs: document.title is "Orders" on `/`, and getByRole('main') throws on all three routes
Campaign: accessibility/semantics-and-names
```

### The map — criterion 1

`cat .claude/hodos/campaigns/accessibility.md` — the machine's `cat` prints a
file header, a line-number gutter and a box border, and those are stripped here;
the wide `D1`–`D4` rows are folded back into one line each. Nothing else is
changed and nothing is elided:

```markdown
# Accessibility — keyboard reach, accessible names, and a guard
Status: active · Owners: @mind-decay

## Done-metrics
| Metric | Command | Start | Target | Current (date) |
|---|---|---|---|---|
| route pages with no `<main>` landmark | `grep -rLE '<main' src/features/*/ui/*Page.tsx \| wc -l` | 3 | 0 | 3 (2026-09-02) |
| test files asserting accessible names | `grep -rl --include='*.test.tsx' -e 'toHaveAccessibleName' -e 'noViolations' -e 'axe(' src \| wc -l` | 0 | 3 | 0 (2026-09-02) |
| files defining a `:focus-visible` style | `grep -rl ':focus-visible' src index.html \| wc -l` | 0 | 1 | 0 (2026-09-02) |

## Decisions
| # | Decision | Why |
|---|---|---|
| D1 | Scope is WCAG 2.2 AA, keyboard and name/role/value only — focus order, focus visibility, accessible names, landmarks, route announcement. Colour contrast, motion and i18n are out. | Contrast is unmeasurable: the repository has no stylesheet at all. Naming the boundary keeps a node from drifting into a redesign. |
| D2 | Semantics before ARIA — fix by reaching for the right element; add ARIA only where no element carries the meaning. | Matches the standing `error-role-alert` rule, which uses `role` only because no element means "this failed". |
| D3 | Keyboard and naming behaviour is proven in vitest/jsdom with the network stubbed at `fetch`; the browser stays for layout and error states. | CLAUDE.md pins this split, and `test-mocking-boundary` pins the stub boundary. |
| D4 | Audit result — 5 defects, none of them keyboard reachability. **A1** all three route pages sit outside any landmark; `<section>` unnamed and `<article>` are not landmarks (1.3.1) → semantics-and-names. **A2** the document title is the static `Orders` in index.html and never changes per route, so `/` and `/orders/:id` are mistitled (2.4.2) → semantics-and-names. **A3** `OrderList.tsx:16-17` status and total are bare `<span>`s with no programmatic relation to the row's link, so tabbing hears only the customer name (1.3.1) → semantics-and-names. **A4** focus is not moved on route change and lands on `<body>` (2.4.3) → focus-and-keyboard. **A5** the detail page offers no in-page route back to the list (2.4.5, low confidence) → semantics-and-names. | Read statically across `src/App.tsx`, `index.html` and all four components on 2026-09-02 — the whole interactive surface is 3 elements and 3 routes. Six things are already correct and a node must not "fix" them: every interactive element is native and keyboard-reachable; the `<label>` wrapping the select already names it `Status`; `<ul aria-label="orders">` is named; `<html lang="en">` is set; there is no repeated nav block so 2.4.1 needs no skip link; and the focus indicator is today the UA default outline, which **passes** 2.4.7/2.4.11 — so focus-state-design is a forward guard against a stylesheet that resets it, not a present failure. |

## Nodes
- [ready] enforcement-shape — decide what keeps new code honest: jsx-a11y plugin, a .claude/rules rule, or a route-level vitest assertion · deps: — · owner: — · branch: — · ref: — · metric: —
- [ready] focus-state-design — decide the focus indicator and where the project's first stylesheet lives · deps: — · owner: — · branch: — · ref: — · metric: —
- [done] a11y-audit — inventory one defect per line across three routes and every interactive element · deps: — · owner: — · branch: — · ref: sha:0f80730 · metric: —
- [active] semantics-and-names — landmarks, per-route document title, an accessible name on every interactive element, OrderList row association · deps: a11y-audit · owner: @mind-decay · branch: feature/semantics-and-names · ref: task:semantics-and-names · metric: main 3→0
- [blocked] focus-and-keyboard — visible focus on every focusable, focus moved on route change, tab order asserted · deps: focus-state-design, a11y-audit · owner: — · branch: — · ref: — · metric: focus-visible 0→1 · by: focus-state-design
- [blocked] a11y-guard — the guard lands green and is proven red against a planted violation · deps: enforcement-shape, semantics-and-names · owner: — · branch: — · ref: — · metric: a11y tests 0→3 · by: enforcement-shape, semantics-and-names
- [fog] rules-bind-humans — does a .claude/rules rule keep a human contributor honest, or only Claude · deps: — · owner: — · branch: — · ref: — · metric: —
- [fog] pending-announcement — "Loading orders…" is silent, but error-role-alert says pending is not an alert, so aria-live may contradict a standing rule · deps: — · owner: — · branch: — · ref: — · metric: —
- [fog] real-screen-reader — nothing in the loop is a real AT; jsdom cannot prove announcement order · deps: — · owner: — · branch: — · ref: — · metric: —
- [fog] contrast-when-css-lands — contrast becomes measurable, and unanswered, the moment the first stylesheet exists · deps: — · owner: — · branch: — · ref: — · metric: —

## Waits
- none — adapters.design is null and the focus design is the owner's own call, which is why it is a node
```

**3 done-metrics**, each run in the session and then re-run by
`campaigns.mjs measure` ("All three metrics survived the table and match the
hand measurement"); **D1–D4**; **10 nodes**; **4 fog items**. The counts
criterion 1 asks for are ≥3 nodes and ≥1 fog item.

`grep '\[active\]' .claude/hodos/campaigns/*.md`:

```
- [active] semantics-and-names — landmarks, per-route document title, an accessible name on every interactive element, OrderList row association · deps: a11y-audit · owner: @mind-decay · branch: feature/semantics-and-names · ref: task:semantics-and-names · metric: main 3→0
```

`cat .claude/hodos/tasks/*/state.json`:

```json
{
  "slug": "semantics-and-names",
  "path": "standard",
  "type": "bug",
  "phase": "approved",
  "campaign": "accessibility/semantics-and-names",
  "branch": "feature/semantics-and-names",
  "base": "d87edf5",
  "tasks": { "total": 6, "done": 0, "current": 1 },
  "redCheckAttempts": 0,
  "review": { "iteration": 0, "verdict": null },
  "verify": { "iteration": 0, "verdict": null },
  "lastCommit": null,
  "lastEvent": "Plan: approved (d87edf5, 6 tasks, feature/semantics-and-names)",
  "createdAt": "2026-09-02T15:48:07.978Z",
  "updatedAt": "2026-09-02T15:58:51.180Z"
}
```

`git log --oneline -3` was not captured: the machine's git pager is `delta` and
it is not installed — `fatal: unable to execute pager 'delta'`. `state.json`
carries the sha the plan approved on (`d87edf5`), which is what the row needed.

### What the session found

Closing `a11y-audit` with `node-done` left two other nodes naming it in their
`by:`, and the script had no verb for that, so the session **hand-edited two
node lines** and flagged the edit rather than hiding it. That is decision 0056,
raised as proposal M and taken the same day; the fix landed after this run.

## Session B — the empty frontier (criterion 4)

`/hodos:campaign error-envelope` on a map whose every node is done, blocked or
fog (the map is in `docs/stages/09a-manual.md` step B1).

```
Mode: advance — error-envelope matches existing slug. Step 7: re-measure, then frontier.
Metric moved 2 → 1.
Frontier empty — 0 ready. Naming the wait per §7.
```

The frontier the script printed, reproduced from the same copy:

```
error-envelope: 0 ready / 2 blocked / 1 fog
blocked: envelope-codes — the server's code list, agreed with the backend · by: the code list (SHOP-2109)
blocked: retry-policy — which codes are retried · by: the code list (SHOP-2109)
fog: toast-copy — what the user is told for each code
wait: the server's error code list — @backend, asked 2026-08-24
```

The question, as `AskUserQuestion` rendered it:

```
 ☐ Empty frontier

│ Frontier is empty: both blocked nodes and the fog item all trace to SHOP-2109 (@backend, asked 2026-08-24, 9 days). How should this campaign proceed?

❯ 1. Nudge @backend (Recommended)
     Ask @backend again for the error code list and update the wait's date in the map to 2026-09-02. Recommended: every blocked node and the fog item depend on the same list, so no node can be cut or started without it.
  2. Pull toast-copy from the fog
     State 'what the user is told for each code' precisely enough to become a node. Caveat: per-code copy needs the code list, so this likely lands blocked on SHOP-2109 too — unless you want copy for a code set you decide locally.
  3. Drop a blocked node as out of scope
     Mark envelope-codes (and with it retry-policy) as dropped, with a new D row recording why. This ends the campaign's dependency on @backend but abandons the server-agreed code list.
  4. Type something.
──────────────────────────────────────────────────────────────────────────────
  5. Chat about this
```

Exactly the three options of `map.md §7`, each with what it costs; options 4
and 5 are `AskUserQuestion`'s own affordances. Nothing says
"nothing to do" and nothing calls the campaign done.

The developer chose **2**. What the session then wrote — `git diff HEAD` in the
copy, run after the session was stopped at the `task` invocation, which is why
the change is uncommitted (the commit is `map.md §6` step 4):

```diff
diff --git a/.claude/hodos/campaigns/error-envelope.md b/.claude/hodos/campaigns/error-envelope.md
index 7c853d0..8206b55 100644
--- a/.claude/hodos/campaigns/error-envelope.md
+++ b/.claude/hodos/campaigns/error-envelope.md
@@ -4,18 +4,19 @@ Status: active · Owners: @you · Tracker: SHOP-2101
 ## Done-metrics
 | Metric | Command | Start | Target | Current (date) |
 |---|---|---|---|---|
-| files throwing a bare Error | `grep -rl "throw new Error(" src \| wc -l` | 2 | 0 | 2 (2026-09-02) |
+| files throwing a bare Error | `grep -rl "throw new Error(" src \| wc -l` | 2 | 0 | 1 (2026-09-02) |
 
 ## Decisions
 | # | Decision | Why |
 |---|---|---|
 | D1 | One `ApiError` with a code, built in `src/lib/http.ts` and nowhere else | two error shapes across one boundary is what this campaign exists to remove |
+| D2 | User-facing copy is chosen from `ApiError.code` in one lookup under `src/lib`, with a default for codes not yet known | the surfaces render `error.message` today; one lookup is where envelope-codes adds rows instead of reopening the components |
 
 ## Nodes
 - [done] error-type — ApiError and its code list · deps: — · owner: @you · branch: feature/error-type · ref: sha:0000000 · metric: —
 - [blocked] envelope-codes — the server's code list, agreed with the backend · deps: — · owner: — · branch: — · ref: — · metric: — · by: the code list (SHOP-2109)
 - [blocked] retry-policy — which codes are retried · deps: envelope-codes · owner: — · branch: — · ref: — · metric: — · by: the code list (SHOP-2109)
-- [fog] toast-copy — what the user is told for each code · deps: — · owner: — · branch: — · ref: — · metric: —
+- [ready] toast-copy — what the user is told for each code · deps: — · owner: — · branch: — · ref: — · metric: —
 
 ## Waits
 - the server's error code list — @backend, asked 2026-08-24
```

The status flip went through the script — "Now the node line, through the
script" — not by hand. The `D2` row was appended to the decisions table, which
is prose and not a node line.

### What the session found

Three things no criterion asked for, all fixed in this stage:

1. The metric moved 2 → 1 and stopped: the remaining `throw new Error(` is
   `src/main.tsx:13`, the `#root` guard, which the campaign has no quarrel with.
   `target 0` was unreachable from the moment the map was written. The session
   said so rather than rewriting an unrelated throw to make a number go green.
2. `campaigns.mjs set` has no `--name` and no `--gist`: `toast-copy` is a
   misnomer (both error surfaces are inline `<p role="alert">`, no toasts) and
   the session left it standing rather than break the skill's anti-pattern.
   Backlogged.
3. Pulling the only fog item left the map with **0 fog**, which `map.md §2`
   calls a map nobody has thought about, and `§7` said nothing about it.
