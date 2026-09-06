# The four interactive `/hodos:adapter` steps — 2026-09-02

Stage 10b's live half, run by the user from `docs/stages/10b-manual.md`
(`PLATFORM-NOTES.md` fact 32: no `AskUserQuestion` headless, decision 0013).
Every excerpt below is what a session printed, recovered from its transcript
and quoted rather than paraphrased; where one is cut, the cut is marked with
`…` on its own line, and nothing is reordered. The framing lines between them
are the only text written here. Heading levels inside an excerpt are the
session's own.

Four throwaway copies of `bench/fixtures/webapp`, all outside the repository,
all evidence rather than fixtures. The machine artifacts beside this file are
copies of what each run left on disk:

| File | Where it came from |
|---|---|
| `m3b-playwright.md` | `/tmp/hodos-10b-m3b/.claude/hodos/adapters/browser/playwright.md` — the adapter M3b wrote |
| `m4a-devtools.md` | `/tmp/hodos-10b-project/.claude/hodos/adapters/browser/devtools.md` — the project adapter the verify loop resolved |
| `m4a-ledger.md`, `m4a-state.json`, `m4a-verify.md` | the same copy's `tasks/orders-summary/` |
| `m4b-ledger.md`, `m4b-state.json` | `/tmp/hodos-10b-null/.claude/hodos/tasks/orders-summary/` |
| `m4b-verify.md` | the same task's `verify.md`, recovered from the transcript — `finish` folds and deletes it (`finish.md §3`), so the copy on disk was already gone |

**Register.** M1, M2 and M3 ran in a session with a third-party `SessionStart`
hook enabled that rewrites the model's prose ("developer own config",
"Teammate cloning repo get nothing"). The facts, the file contents and the
commands are unaffected; the phrasing is the hook's, not hodos's.
`BACKLOG.md` carries this against Stage 11.

---

## M1 — `/hodos:adapter tracker`, no `.mcp.json` at all (criterion 4)

Copy: `/tmp/hodos-manual-10b`, seeded with no `.mcp.json`.

> **Refuse. Question 1 failed — no tracker server exists.**
>
> ## 1. Is server there?
>
> Both facts checked, both negative:
>
> - **`.mcp.json`** — file does not exist. `find . -name '.mcp.json'` → nothing; `git ls-files .claude` → only `config.json` + 6 rules. Last commit says it plain: `chore: no mcp servers yet`.
> - **Session tool list** — no issue tracker. Live servers: `chrome-devtools`, `claude_ai_Context7`, `claude_ai_Figma`, `claude_ai_Gmail`, `claude_ai_Google_Calendar`, `claude_ai_Google_Drive`, `claude_ai_Notion`. No YouTrack, no Linear, no Jira, no GitHub-issues, no Asana.
>
> Shipped adapter `adapters/tracker/youtrack.md` maps `link` → `mcp__youtrack__link_issues`. That tool id is not in this session. Writing it into config = adapter pointing at tool nobody can call.
>
> Notion is only candidate that could stand in, and it fails twice: session-only (developer's own claude.ai connector, teammate cloning repo gets nothing), and `tracker.link` means *join two issue ids with a link type* — Notion publishes no such operation. Even the "ask to add it to `.mcp.json` first" branch needs `.mcp.json` to exist.
>
> Questions 2 and 3 not reached — no server to write file about.
>
> ## What happens instead
>
> `adapters.tracker` stays `null`. Nothing written under `.claude/hodos/adapters/`.
>
> Phase that reads role: **finish** (`skills/run/references/finish.md:92-94`, §5a). With `null` it reports:
>
> ```
> Skip: tracker unavailable
> ```
>
> naming `null` as the reason. Branch name and `brief.md` ticket key are untouched — commit trailers and branch `feature/{slug}` still carry the issue reference, just no link written into a tracker.
>
> Checks green on untouched config:
>
> ```
> config: ok — /private/tmp/hodos-manual-10b/.claude/hodos/config.json
> lint: clean — 7 files
> ```

`/tmp/hodos-manual-10b/.claude/hodos/adapters` does not exist and
`adapters.tracker` is `null`, checked again after the run.

---

## M2 — `/hodos:adapter I want the finish phase to post a summary to our Slack channel` (criterion 5)

The same copy. The refusal is what the criterion asks for; the **third**
alternative it offered is the stage's one major finding — see below.

> **Refuse. No adapter written.** Two of three questions fail.
>
> **1. Is server there?** No.
> - `/private/tmp/hodos-manual-10b/.mcp.json` — does not exist (matches commit `e23e9dc chore: no mcp servers yet`).
> - Session tool list — no `mcp__*slack*` anything. Live servers here: chrome-devtools, Context7, Figma, Gmail, Google Calendar, Google Drive, Notion.
>
> Slack in neither place. Any tool id I wrote would be invented — the anti-pattern this skill exists to stop.
>
> **2. Does a phase call this role?** No. `DESIGN.md §3.2` closes roles at eight — `browser`, `docs`, `codeIndex`, `design`, `tracker`, `logs`, `db`, `ci`. Finish calls exactly one of them:
>
> | Role | Operations | Phase |
> |---|---|---|
> | `tracker` | `link` | finish |
>
> `link` attaches the task to a tracker issue. Not "post message to channel". No role covers Slack, and `config.adapters` has no key to write it into.
>
> **3. What does schema not say?** Not reached. No schema exists to read.
>
> ## Where this belongs
>
> Of the three homes, yours is the third: **a phase that should call a new role → change `docs/DESIGN.md §3.2`**. That means adding a ninth role (`notify` or similar, operation `post`), and updating the finish phase reference to call it. Developer's decision, not mine to assume.
>
> Not the other two:
> - `verify.recipes[]` `kind: command` — wrong phase, and a Slack post is not a verification.
> - `/hodos:skill` — a skill is invoked, never auto-called by finish.

The last three paragraphs are the major of `docs/stages/10b-review.md`: the
third alternative was in the skill but not in decision 0062, and it told a
project developer to edit a file that belongs to the installed plugin. It was
removed from `skills/adapter/SKILL.md §2` and raised as proposal **O** in
`DECISIONS.md`, which is where a ninth role has to be settled.

---

## M3 — `/hodos:adapter docs`, against the claude.ai Context7 connector

Superseded by M3b for criterion 6. The scenario, not the skill, is what made
the row unmeasurable: the connector's server key is `claude_ai_Context7`, so
its tool ids diverge from the shipped adapter's — and the session found the
cheaper answer itself, without a line in the skill telling it to.

> Add context7 to `.mcp.json` as project server:
>
> ```json
> "context7": {
>   "type": "stdio",
>   "command": "npx",
>   "args": ["-y", "@upstash/context7-mcp@latest"],
>   "env": {}
> }
> ```
>
> Then tool ids become `mcp__context7__*` — matches shipped adapter character for character. **No project adapter needed at all**: set `"docs": "context7"` (unprefixed = plugin layer), run both checks, done.

The developer said do it. The next reply, after the write:

> **No adapter file written.** Unprefixed value = plugin layer: hodos ships `adapters/docs/context7.md` with ops `mcp__context7__resolve-library-id {libraryName, query}` / `mcp__context7__query-docs {libraryId, query}` — exactly the ids the `.mcp.json` install produces. Writing a project copy would duplicate team knowledge that already lives upstream.
>
> ```
> config: ok — /private/tmp/hodos-manual-10b/.claude/hodos/config.json
> lint: clean — 7 files
> ```

Those two ids are the standalone server's own, confirmed by a JSON-RPC
`tools/list` against `npx -y @upstash/context7-mcp@latest` (v4.0.4):

```
server: {"name":"Context7","version":"4.0.4", …}
resolve-library-id  required: query, libraryName
query-docs          required: libraryId, query
```

---

## M3b — `/hodos:adapter browser — this project drives its browser with playwright, not chrome-devtools` (criterion 6)

Copy: `/tmp/hodos-10b-m3b`, whose `.mcp.json` declares `playwright` and not
`chrome-devtools`, and whose config starts at `"browser": null`. The written
file is `m3b-playwright.md` beside this one.

> Done. `.claude/hodos/adapters/browser/playwright.md` written, `adapters.browser` = `"project:playwright"`, `config.mjs check` and `lint.mjs --project` both exit 0.
>
> **1. Is server there?** Both places. `playwright` is a key in the repo's `.mcp.json` (`npx @playwright/mcp@latest --isolated`) *and* live in this session. Adapter is safe for teammates. chrome-devtools is the opposite case — live in this session only, absent from `.mcp.json` — so it would have been the wrong file to write.
>
> **2. Does phase call role?** Yes. `skills/run/references/verify-loop.md` reads `config.adapters.browser`; config's `verify.recipes[]` has `ui` of `kind: browser` over `/`, `/orders`, `/orders/:id`. That phase said `browser claims are skip: no browser adapter configured` until now.
>
> **3. What schema not say?** Seven gotchas, each from a call made against the running fixture minutes ago:
>
> - `browser_navigate` returns URL/title/console-counts only — snapshot goes to a `.playwright-mcp/page-<ts>.yml` file. `browser_snapshot` is what returns the tree inline.
> - screenshot absolute path outside root → `File access denied … Allowed roots: <root>/.playwright-mcp, <root>`; dir not auto-created → ENOENT. `mkdir -p` evidence dir first.
> - refs stale on reload: `[ref=e3]` → `[ref=f1e3]`.
> - `/api` 404s in dev, so a loaded-list claim needs `page.route(...)` via `browser_run_code_unsafe` **then `page.reload()`** — route registered after load misses the request already made. Verified: stubbed list rendered `Probe Co open 42.00`.
> - fixture's own `/api/*` + `/favicon.ico` 404s are design, not findings.
> - `--isolated` = fresh profile per session.
> - dev took **5174** because 5173 was busy — read URL from dev log, not `commands.dev.url`.

Live calls the transcript records: `browser_navigate`, `browser_snapshot`,
`browser_run_code_unsafe`, `browser_take_screenshot` ×3. Every tool id in the
file is one of the 24 the running server published.

---

## M4a — `/hodos:run orders-summary` with `"browser": "project:devtools"` (criterion 2c)

Copy: `/tmp/hodos-10b-project`. The verify loop resolved the project
directory, not the plugin's — the dispatch line, four times in the transcript:

```
Adapter: /private/tmp/hodos-10b-project/.claude/hodos/adapters/browser/devtools.md
```

`m4a-ledger.md` reads `Verify 1: FAIL 15 claims, 0 skipped` — nothing skipped
for want of an adapter, and `m4a-verify.md` rows 10–12 and 14 are real browser
work against `http://localhost:5173/orders`, with
`evidence/01-orders-error-state.png` and `GET /api/orders?status=all → 404`.
The FAIL is the fixture's, not the loop's: `bench/run/plans/orders-summary.md`
T3 pins its claims to the `ui` recipe alone and the fixture serves no `/api`
by design (`BACKLOG.md`, Stage 11).

The transcript also carries
`Adapter: ${CLAUDE_PLUGIN_ROOT}/adapters/browser/chrome-devtools.md` twice —
that was the template line the session read out of `verify-loop.md §5`, not a
path it resolved. `docs/stages/10b-review.md` raised it as a minor, and the
template now reads `Adapter: <the path §4 resolved …>`.

---

## M4b — the same task with `"browser": null` (criterion 7, the Stage 7 regression)

Copy: `/tmp/hodos-10b-null`. `m4b-ledger.md`:

```
Ruling: no dev server started for verify 1 — the only browser recipe (ui) is skipped, adapters.browser is null, so nothing would drive the URL — cost if wrong: a browser claim reported skip that could have run
Verify 1: PASS 16 claims, 6 skipped
```

(the two lines' leading ISO timestamps stripped; the file has them)

**Five** rows of `m4b-verify.md` open with the Stage 7 string, unchanged:
`skip: no browser adapter configured` — rows 8, 11, 12, 13 and 15, which the
file's own Notes name. Two of them, 11 and 12, extend it with the plan's `Tests`
line for T3. The unit recipe ran for real (`evidence/01-npm-test.txt`,
`02-mutation-run.txt`).

**The `6 skipped` in the ledger is the verifier's own arithmetic, not the
table's.** `m4b-verify.md`'s header reads `claims 16 · pass 10 · fail 0 ·
skip 6` while its table is 11 pass and 5 skip, also 16. `finish.md §3` copies
the header's numbers rather than recomputing them — deliberately, so the fold
cannot invent a count — so the wrong one reached `ledger.md`, `plan.md#Outcome`
and the finish report, and stayed there. Nothing cross-checks a verify header
against its own rows. `BACKLOG.md` carries it against Stage 11. Criterion 7 is
unaffected: the skip string is Stage 7's, unchanged, and every skipped row
names the right reason.

The finish report printed the line `finish.md §5a` added this stage, which no
criterion asked for and which shows the new call site executing rather than
merely existing:

```
Review: ACCEPT after 0 fix passes · Verify: PASS, 16 claims, 6 skipped
Tracker: Skip: tracker unavailable (config.adapters.tracker is null)
Fixed after the last review: — (no verify fix pass; verify 1 passed)
```
