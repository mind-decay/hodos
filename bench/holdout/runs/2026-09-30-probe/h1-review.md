# Review 1 — h1
Verdict: REJECT · blockers 4 · majors 3 · minors 2

## Checks run
- test: not configured
- typecheck: not configured
- lint: not configured
- Behaviour below confirmed by executing each diff file inline under `python3 -B` with stub objects (no bytecode, tree unchanged): `render_year(date(2026,1,1))` → `'2026 (formatted)'`; `remove_inactive([u1✗,u2✗,u3✓])` → `[u2, u3]`; zero-amount `charge` → `TypeError`; 10 concurrent `process()` → peak `in_flight` 10 of limit 5; `upload_blob` on upload error → `NameError`, conn not closed; on empty file → `None`, conn not closed.

## Spec
Missing: T2, T3, T4. Each context names a symptom and the diff exhibits it, so "the code does what the context says it is for" is unmet (Standards rows at `users/cleanup.py:7`, `orders/service.py:7`, `orders/processor.py:9`). T1 is also unmet per `utils/formatter.py:8`. · Extra: `utils/cache.py:10-13`, an import-time demo no task asked for. · Misunderstood: — · Unclaimed: the `None` member this diff adds to the return of `charge` (`payments/gateway.py:5`), the two `return None` failure paths of `upload_blob` (`storage/uploader.py:6`, `:11`) and the back-off branch (`orders/processor.py:9-10`). No Acceptance clause names any of them. The one Invariants clause is claimed by every task's generic Acceptance. · Tests: the `no-harness` exemption holds. The README and the tree have no runner, and the diff adds none.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | users/cleanup.py:7 | L4 state mutation | two adjacent inactive users, `[u1✗,u2✗,u3✓]` → `[u2,u3]` | `users.remove(user)` inside `for user in users` shifts the list under the iterator, so the element after each removal is skipped | `users[:] = [u for u in users if u.is_active]` (keeps the in-place contract) |
| blocker | orders/service.py:7 | L6 callee contract | `order.amount == 0`: `charge` returns `None` (`payments/gateway.py:5`) | `result['transaction_id']` raises `TypeError` and the order is never marked paid. The comment at line 5 is false | give `charge` one return shape (a dict for a skipped payment), or branch on `None` here |
| blocker | orders/processor.py:9 | L7 concurrency | 6+ concurrent `process()` calls whose payment call takes >0.1 s | a single `if` plus one `sleep(0.1)`, then an unconditional `in_flight += 1`: waiters go past the limit, and `in_flight` reaches N | `asyncio.Semaphore(self.max_concurrent)` in `__init__`, `async with` around the call |
| major | orders/processor.py:13 | L6 callee contract | any call to `process()` | `_call_payment_api` is defined nowhere in the class or the repo, so every call raises `AttributeError` | define it, or inject the payment client |
| blocker | storage/uploader.py:6 | L5 / L8 resource lifecycle | empty file at `path`, `conn.upload` raising, or `open(path)` raising | `conn` (line 3) is closed only on the happy path (line 12). Both `return None`s and every exception leak it. The handle opened at line 4 is never closed explicitly | read the file under `with` before `connect()`, and put `conn.close()` in a `finally` |
| major | storage/uploader.py:9 | L6 callee contract | any exception from `conn.upload` | `UploadError` and `log` are never imported. Evaluating the `except` clause raises `NameError`, which hides the real error, and the log-and-return path never runs | import both from their modules |
| major | utils/formatter.py:8 | L1 shadow override | `render_year(date(2026,1,1))` called from any importer → `'2026 (formatted)'` | the module-level `format` (line 2) shadows the builtin. Line 8 has the builtin's call shape and a `'04d'` year spec, but it binds to the wrapper, so an importer gets the suffix even though its own `format` is the builtin | rename the wrapper. `render_year` returns `f'{year:04d}'`, or calls the renamed wrapper if the suffix is intended |
| minor | storage/uploader.py:11 | defaults #10 | — | an upload failure is swallowed into `None`, the same value as "nothing to upload" (line 6), and no invariant names that handling | let it propagate, or return a result that can be told apart |
| minor | utils/cache.py:10 | defaults #17 | — | lines 10–13 run on every import: they print `['a', 'c'] ['b'] ['a', 'c']` and bind `r1`/`r2`/`r3` as module globals | delete them, or guard them with `if __name__ == '__main__':` |

## Coverage
- Not reviewed: `util/strings.go`, `README.md`, `lib/` and `tests/`, which are outside the diff.
- There is no `Mutation:` line, so the package owns no ledger task and the comparison was skipped.
- `.claude/rules/` is empty and the config has no `conventions`, so the convention pass used only the plan's fields and `defaults.md`.
- There is no `## Callers` section, and Precedent says the repo holds no other code, so no caller checks were made beyond the diff.
- The T5 context is `—`, so its acceptance was measured against the function's name alone.
- `utils/cache.py:3-8` was reviewed with no finding. The `None` sentinel gives `r2` a fresh list, and `r3 is r1` follows the documented append-to-given-cache contract.
- Cannot verify from diff: whether the ` (formatted)` suffix is intended for `render_year`. The fix covers both cases.
