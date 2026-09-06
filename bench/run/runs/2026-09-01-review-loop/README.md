# The review loop, run twice — 2026-09-01

`status-label` seeded at `phase: review` with `detail-inline-labels`, then
`/hodos:run status-label` headless, CLI 2.1.252, `--max-turns 60`.

```
node bench/run/seed.mjs status-label --at review --defect detail-inline-labels --into <dir>
claude -p "/hodos:run status-label" --plugin-dir <repo> --strict-mcp-config \
  --permission-mode bypassPermissions --output-format stream-json --verbose --max-turns 60
```

| Run | Turns | Cost | Review 1 | Fix | Review 2 |
|---|---|---|---|---|---|
| `loop1` | 26 | $1.85 | `NEEDS_WORK (0/1/0)` | `Fix 1: done (fd78e91)` | `ACCEPT (0/0/0)` |
| `loop2` | 30 | $2.03 | `NEEDS_WORK (0/1/0)` | `Fix 1: done (2efa1aa)` | `ACCEPT (0/0/1)` |

Both found the seeded major and nothing else at that severity, both fixed it,
both re-reviewed the fix diff alone, both ended at `phase: verify` on the
verify stub's line. `review-input-2.md` is each run's iteration-2 package: the
previous findings table, and a diff of the two files the fix touched.

**`loop2` is the same run against a variant wording** of `review-loop.md` §2
and §9, written when the first run's transcript appeared to show the kernel
reading the package. It did not: both `cat review-input.md` calls carry a
`parent_tool_use_id` pointing at the dispatch, so they are the **reviewer**
reading its own input, which is its job. The variant was reverted — a wording
change needs evidence, and there was none (`AUTHORING.md §13`). What the two
runs jointly establish is that the kernel reads the package in neither.

**Counted on the kernel's own turns** (`parent_tool_use_id: null`):

| Run | Kernel tool uses | Kernel reads of `review-input.md` | Kernel `git diff` |
|---|---|---|---|
| `loop1` | 25 | 0 | 2 — its own uncommitted fix, before the commit |
| `loop2` | 29 | 0 | 1 — `git diff --stat` of the same |

Both dispatches in both runs: `subagent_type: "hodos:hodos-reviewer"`,
`model: "opus"` — fact 33 and fact 34 in use.

## Criterion 3, reproducible

`loop1/kernel-turns.txt` and `loop2/kernel-turns.txt` are the output of

```
node bench/run/runs/kernel-turns.mjs <run.jsonl>
```

over each run's stream. The script counts only turns with
`parent_tool_use_id: null` — the kernel's own — and separates a *read* of a path
from a *mention* of it, because the two dispatches name the package in their
prompt and naming is what §3 of `review-loop.md` asks for. Both runs read
`review-input.md` zero times. The `run.jsonl` streams themselves are session
scratch and are not in the repository; these two files are what survives them.
