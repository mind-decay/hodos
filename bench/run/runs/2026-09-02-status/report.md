## 1. Digest

```
hodos: config verified 2026-08-31 · 1 active task · 1 stale task
- orders-summary [approved] last: "Plan: approved (9b5fac6, 3 tasks, feature/orders-summary)" — resume with /hodos:run orders-summary
- stale: users-export (21 days) — /hodos:status to fold or delete
```

## 2. Config

`config: ok` — no findings. All keys read by scripts.

## 3. Rules

```
.claude/rules/query-key-factory.md:46: error: src/features/orders/keys-legacy.ts:12 — no such file (AUTHORING.md §13)
lint: 1 errors, 0 warnings — 8 files
```

Precedent dead. Line 46: `Added 2026-09-02: the same shape guards the detail route (src/features/orders/keys-legacy.ts:12).` No `keys-legacy.ts` in `src/features/orders/` — dir hold `api.ts`, `index.ts`, `model.ts`, `model.test.ts`, `ui/`.

Live match: `src/features/orders/api.ts:19` — `detail: (id: string) => [...keys.all, 'detail', id] as const`. Same shape, detail route.

Two options, pick one: **re-point** line 46 to `src/features/orders/api.ts:19`, or **nominate rule for deletion**. Neither happen without your answer. (File already `M` in git — uncommitted edit sit there.)

## 4. Stale tasks

**users-export** — phase `execute`, 21 days (ledger last touched 2026-08-12), path quick, type feature, branch null, 0/0 tasks. Last ledger line:

```
2026-09-02T11:30:46.707Z Task 1: started
```

Task never got past task 1 — no branch, no commit, no plan artifacts. Dir hold only `state.json` and `ledger.md`.

This session has no `AskUserQuestion` tool, so I am asking in chat and deleting nothing. Two choices for `users-export`:

- **Fold it** — run `/hodos:run users-export` to carry the task to the end.
- **Delete it** — remove `.claude/hodos/tasks/users-export/`. That permanently removes the ledger and `state.json` (this task has no plan, no Outcome, and no evidence files). `history.jsonl` and all commits are untouched either way. Irreversible; tell me explicitly and I will do it.

## 5. Session pointers

`no session pointers` — `.claude/hodos/sessions/` not exist. Nothing dead, nothing to gc.

## 6. Rates

5 finished tasks in 30-day window (2026-08-03 → 2026-09-02). Enough to read.

- **upgrade rate** — 2/5 (40%) · `status-label`, `orders-export`
- **override rate** — 2/5 (40%) · `status-label`, `orders-export`

Last gaps, newest first:

| slug | gap |
|---|---|
| customer-search | the plan did not say whether search is debounced — 300ms, ruled here |
| orders-export | the plan named no page size for the export — 500 rows, ruled here |
| orders-export | the plan did not say what a failed export shows — the list error surface, asked |
| status-label | the plan did not say which view owns the label — the list, ruled here |

4 gaps total (duplicate-customers and grid-columns clean). Pattern: every gap is a plan not naming a **default value or owner** — debounce ms, page size, error surface, owning view. Your call whether that become a `references/plan.md` sentence.

---

Waiting on two answers: rule precedent (re-point / delete), stale task (fold / delete).

