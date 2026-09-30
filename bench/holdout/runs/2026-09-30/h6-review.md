# Review 1 — h6
Verdict: REJECT · blockers 4 · majors 5 · minors 3

## Checks run
- test: not configured
- typecheck: not configured
- lint: not configured
- info: `javac -d /tmp/h6-javac config/ConfigCache.java` → "Unable to locate a Java Runtime" (no JDK on the host). The Python snippets were run in memory with `python3 -B` (no files written): `quicksort(list(range(999)))` → `RecursionError`; `quicksort([7]*1500)` → `RecursionError`; `quicksort(xs) is xs` → `True`; `BoundedLruCache` eviction order and a `''` value both correct.

## Spec
Missing: T1 — the context says `|| true` is there "so the script can report" migration failures, but nothing in `deploy/deploy.sh` reports one, and line 12 announces success (Standards, `deploy/deploy.sh:6`) · T2 — the double-checked locking is wrong, so the lazy singleton is not safe (`config/ConfigCache.java:9`, `:2`) · T3 — the wait/notify protocol is wrong (`sync/Buffer.java:16`, `:19`) · T5 — the fire interlock does not hold across the two threads (`control/beam.cpp:2`, `:18`)
Extra: — (six files for six tasks; no test runner was built, as Non-goals requires)
Misunderstood: —
Unclaimed: `control/beam.cpp:16-20` — the implicit fall-through when neither branch holds (fire pressed while `electron_mode == false && beam_filter_in_place == true`, the ~8 s retraction window) · `sync/Buffer.java:17` — the `InterruptedException` path out of `wait()` · `cache/lru.py:7` — `ValueError('capacity must be positive')`; T6's context is `—`, so no claim names it

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | deploy/deploy.sh:6 | L6 callee contract | `migrate` exits non-zero (a failed migration, or no `./manage.py` in the cwd → 127) | `\|\| true` drops the status and nothing reports it; line 12 posts "Deploy successful" | `migrate \|\| rc=$?`; report `rc`; send success only when it is 0 |
| blocker | config/ConfigCache.java:9 | L7 concurrency | B calls `getInstance()` while A is in `loadFromDisk()` | published before loaded: line 6 hands B an instance with `data == null` | load a local, then assign; or the holder idiom |
| blocker | control/beam.cpp:2 | L7 concurrency | line 7 writes while line 16 reads | unsynchronised shared `bool`s: a data race, undefined behaviour | `std::atomic`, or one mutex |
| blocker | control/beam.cpp:18 | L7 concurrency | line 18 passes, then lines 7–9 run before line 19 | the electron beam fires after the mode switched, with the filter moving; the flag reads `true` through the ~8 s transit | one state enum with `transitioning`; check and fire under the operator's mutex |
| major | config/ConfigCache.java:2 | L7 concurrency | an unlocked read at line 6 on another core | not `volatile`: no happens-before with the locked write | `volatile`, or the holder idiom |
| major | sync/Buffer.java:16 | L7 concurrency | a spurious wakeup | `if`, not `while`: returns `null` with nothing produced | `while (!ready)` |
| major | sync/Buffer.java:19 | L7 concurrency | `produce("a"); produce("b"); consume()` | `ready` is never cleared and `produce` never waits: "a" is lost, and later calls repeat the payload without blocking | clear `ready`; `produce` waits while `ready`; `notifyAll()` |
| major | sort/quicksort.py:5 | L3 boundary | `quicksort(list(range(999)))` → ran: `RecursionError` | last-element pivot: recursion n levels deep on sorted, reversed or all-equal input | median-of-three pivot, recursing on the smaller side; or `sorted()` |
| major | sort/quicksort.py:14 | L4 state mutation | `ranked = quicksort(scores)`, then `scores` reused | mutates the argument and returns it, so the result looks like a copy | return `None`, or sort a copy |
| minor | config/ConfigCache.java:3 | plan: External APIs | — | `Map` with no `import java.util.Map;`: does not compile | add the import |
| minor | control/beam.cpp:18 | defaults #10 | — | a press that matches neither branch is dropped with no error | an `else` that reports it |
| minor | deploy/deploy.sh:12 | L6 callee contract | webhook returns 404 | `curl -s` without `--fail` exits 0 on 4xx/5xx | `curl -fsS` |

## Coverage
- `.claude/rules/` is empty, so there are no project rules. Conventions were reviewed against the plan's design fields and `defaults.md` only.
- The package has no `Mutation:` line. All six tasks are exempted `no-harness` and add no test declarations, so there is nothing to compare. The exemption matches the repo: every `commands` entry is `null` and `README.md` says it has no runner.
- Not compiled: the Java (no JDK) and the C++. `beam.cpp` calls undeclared hardware functions (`user_pressed_xray`, `retract_filter_async`, `fire_*`) that live outside the repository.
- Cannot verify from diff: whether `retract_filter_async()` clears `beam_filter_in_place` from a position sensor or on a timer; and whether the hardware needs the filter out for X-ray, as line 16 assumes. In linac designs X-ray mode puts a flattening filter in the beam, so that condition may be inverted.
- `cache/lru.py`: T6 has no context, so it was reviewed as a bounded, thread-safe LRU cache, as its name says. It was run and gave no finding.
- Not raised: `$SLACK_WEBHOOK` unset under `set -u` stops the script after the restart, loudly.
- Not reviewed: files outside the diff (`util/strings.go`, `README.md`).
