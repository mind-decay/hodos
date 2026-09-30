# Review 1 — h5
Verdict: REJECT · blockers 3 · majors 2 · minors 0

## Checks run
- test: not configured
- typecheck: not configured
- lint: not configured
- Evidence runs, each on a scratch copy under `/tmp`, removed afterwards (tree left as found):
  - `clang++ -fsanitize=address` on `vector_utils.cpp`: input `{1,2,3}` → `heap-buffer-overflow`, `READ of size 4 … 4 bytes before 12-byte region`. Input `{}` → `SEGV`.
  - `node billing/invoice.js` → `108`.
  - `go build ./util`, with the import stubbed under module `github.com/x` → `util/strings.go:11:12: use of package len not in selector`, `util/strings.go:16:8: use of package len not in selector`.
  - `LANG=fr_FR.UTF-8 python3`: `parse_report_date('Monday, 03 March 2025')` → `2025-03-03` by default. After `locale.setlocale(locale.LC_ALL, '')` → `ValueError: time data 'Monday, 03 March 2025' does not match format '%A, %d %B %Y'`.

## Spec
Missing:
- T1: the backward search reads out of bounds when the input has no negative number.
- T2: `new Invoice(100, true).total()` returns `108`, not `100`.
- T3: the file no longer compiles.
- T4: the "last 24 hours" window moves with the session's time zone.
- T5: the parse depends on the process `LC_TIME`.
- T6 is met: both queries bind their values with `%s` and a parameter tuple. Nothing is interpolated, so there is no injection.

Extra: `console.log(new Invoice(100, true).total())` at `billing/invoice.js:17` prints every time the module loads. No task asked for it.

Misunderstood: —

Unclaimed: the no-negative path `return 0` at `search/vector_utils.cpp:8`. No acceptance clause says what the function returns when nothing is found, or that `0` is the sentinel.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | search/vector_utils.cpp:5 | L3 boundary blindspot | any vector with no negative, e.g. `{1,2,3}`; or `{}` | `i` is `size_t`, so `i >= 0` is always true. At `i == 0`, `i--` wraps to `SIZE_MAX` and `nums[i]` reads out of bounds. On an empty vector, `size() - 1` is already `SIZE_MAX`. This is undefined behaviour (ASan: overflow / SEGV) | `for (size_t i = nums.size(); i-- > 0; )`, or iterate with `rbegin()`/`rend()` |
| blocker | billing/invoice.js:6 | L1 shadow override | `new Invoice(100, true).total()` → `108` | The local `const TAX_RATE` shadows the module constant and dies with the constructor. `total()` at :13 reads the module `0.08`, so tax-exempt invoices are taxed | `this.taxRate = taxExempt ? 0 : TAX_RATE;` in the constructor; `this.subtotal * (1 + this.taxRate)` in `total()` |
| blocker | util/strings.go:6 | L1 shadow override | any build of package `util` | The import alias `len` shadows the builtin across the file. `len(words)` at :11 and :16 now names a package, and the build fails with `use of package len not in selector` | Drop the alias, call `constraints.Check(count, limit)` at :23, and leave builtin `len` alone |
| major | db/schema.sql:5 | L9 time and locale | rows written under `America/New_York` (EDT, UTC−4), queried from a `Europe/London` session in BST | `TIMESTAMP` without a zone stores `NOW()` as the inserting session's wall clock. The comparison at :10 reads that value in the querying session's zone, so the London session's "last 24 hours" covers only the last 19 hours. At the New York fall-back hour the stored values repeat | `created_at TIMESTAMPTZ NOT NULL DEFAULT now()`, and compare against `now()` |
| major | reports/parser.py:6 | L9 time and locale | in the `fr_FR.UTF-8` container, once anything in the process calls `locale.setlocale(locale.LC_ALL, '')` | `%A`/`%B` only match the current `LC_TIME` day and month names, so English report dates raise `ValueError`. It works on startup only because Python leaves `LC_TIME` at `C` | Parse the English names against a fixed month table, with `%d`/`%Y` taken from the split string, and use no locale-dependent directive |

## Coverage
- `.claude/rules/` is empty. Conventions were reviewed against the plan's design fields and the defaults list only.
- The package has no `Mutation:` line, so the count comparison was skipped. All six tasks claim `no-harness`. That is consistent with `README.md` ("no build and no test runner") and with the plan's Non-goals.
- The package has no `## Callers` section. The plan's Precedent field says the repository holds no other code.
- Cannot verify from the diff: whether `github.com/internal/constraints` exists and exports `Check(int, int) bool` (L6). There is no `go.mod`. The `internal` path element also makes the import legal only from a module rooted under `github.com/`. Built under `example.com/x`, it fails with `use of internal package … not allowed`.
- Cannot verify from the diff: which driver `conn` is in `db/orders.py`. The `%s` paramstyle suits psycopg2 and MySQLdb, but not the standard-library `sqlite3`, which uses `?`.
- Not reopened: `TruncateWords` (`util/strings.go:19`, a context line from the base) panics when `max` is negative.
