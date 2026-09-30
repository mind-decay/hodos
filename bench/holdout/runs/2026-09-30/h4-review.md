# Review 1 — h4
Verdict: REJECT · blockers 3 · majors 3 · minors 3

## Checks run
- test: not configured
- typecheck: not configured
- lint: not configured
- note: no check is configured, so I reproduced two findings in a temp dir outside the repo. `rustc -O` on `network/checksum.rs` with `validate_packet(&[200,100,50,94])` printed `true`. The same file built without `-O` panicked `attempt to add with overflow` at line 5. Under ruby 2.6, `Payment::Service.new.process(10)` raised `NoMethodError: undefined method 'info' for #<Payment::Logger>`, and `::Logger.new` raised `ArgumentError (given 0, expected 1..3)`.

## Spec
Missing: T2 — the worker cannot be stopped with Ctrl+C (`jobs/processor.py:11`). T3 — `Service#process` cannot log through stdlib `Logger` and raises on every call (`lib/payment/service.rb:8`). T4 — the counter is wrong under the concurrent use the context describes (`tracking/RequestTracker.kt:8`). T1 meets its release case (`[200,100,50]` wraps to 94). It only panics in debug builds; see Standards. T6 meets its acceptance: `with` runs `__exit__` on `return`, so the file is closed, and the reviewer comment quoted in the context is mistaken.
Extra: —
Misunderstood: —
Unclaimed: these failure paths are named by no acceptance clause, because every clause defers to its context line: the empty-packet `return false` (`network/checksum.rs:11`); what happens to a failed job (`jobs/processor.py:11`); the open-failure `RuntimeException` (`src/CsvParser.php:7`); the `finally` decrement when `block()` throws (`tracking/RequestTracker.kt:11`).

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | jobs/processor.py:11 | L6 callee-contract mismatch | SIGINT arrives while the worker waits in `get(timeout=1)` | A bare `except:` catches `BaseException`. `KeyboardInterrupt` and `SystemExit` are swallowed with `pass`, and the loop continues. | `except queue.Empty: continue`; `except Exception: log.exception(...)` |
| blocker | lib/payment/service.rb:8 | L1 shadow override | any `Service.new.process(x)` | Inside `module Payment`, `Logger` resolves to `Payment::Logger` (`logger.rb:3`), which has only `log`. `.info` raises `NoMethodError`. | `::Logger.new($stdout)`; with no argument, `::Logger.new` raises `ArgumentError` |
| blocker | tracking/RequestTracker.kt:8 | L7 concurrency | two coroutines on different `Dispatchers.Default` threads call `trackRequest` together | `++` and `--` (line 12) on a plain public `var Int` are non-atomic and have no visibility guarantee. Lost updates are permanent, so `isOverloaded()` (line 16) stays wrong. | `private val activeRequests = AtomicInteger()`; `incrementAndGet`/`decrementAndGet`/`get()` |
| major | jobs/processor.py:9 | L6 callee-contract mismatch | any job put on the queue | `execute_job` is defined and imported nowhere: `git grep` finds only this call, and the plan allows only the standard library. Every job raises `NameError`, line 11 swallows it, and the job is silently dropped. | define or import it, or take it as a parameter |
| major | jobs/processor.py:10 | L5 control-flow escape | `execute_job` raises (so far, every job does) | `task_done()` is skipped when a job fails, so `job_queue.join()` blocks forever. | call `task_done()` in `finally` after a successful `get` |
| major | network/checksum.rs:5 | L3 boundary blindspot | payload bytes summing past 255 in a debug build, a `cargo test` run, or any build with `overflow-checks` | `u8` addition wraps only when overflow checks are off (release). Otherwise it panics. | `sum = sum.wrapping_add(byte)` |
| minor | src/CsvParser.php:13 | L8 resource lifecycle | a row that does not have 3 columns | The throw skips `fclose` (line 21). PHP frees `$handle` when the frame unwinds, so nothing leaks, but the release is implicit. The comment at line 16 is false and sits after the throw. | `try { … } finally { fclose($handle); }`; drop the comment |
| minor | src/CsvParser.php:12 | L3 boundary blindspot | a blank line in the file | `fgetcsv` returns `[null]` for a blank line. The code reports "got 1" and rejects the whole file. | skip `[null]` rows |
| minor | tracking/RequestTracker.kt:2 | defaults #17 | — | `import kotlinx.coroutines.*` is unused (`suspend` is a keyword). | remove |

## Coverage
- `.claude/rules/` is empty, so no project rules were checked.
- The package has no `Mutation:` line. All six tasks claim `no-harness`, `README.md` confirms there is no runner, and the diff adds no test declarations, so there was nothing to compare.
- I did not run the Kotlin, PHP or Python code (no `kotlinc` or `php` on the host); those findings rest on language semantics.
- I did not review `util/strings.go`. It is outside the diff, but its presence contradicts the plan's `Precedent` field ("the repository holds no other code").
