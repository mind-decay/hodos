# Review 1 — h2
Verdict: REJECT · blockers 1 · majors 4 · minors 1

## Checks run
- test: not configured
- typecheck: not configured
- lint: not configured

## Spec
Missing: T4 — `check_signup` never returns a result for the input its own comment at `signup/eligibility.py:6` says it receives (`str` or `None`); see the blocker below · Extra: — · Misunderstood: T1 — `booking/slots.py:5` reads the task as "exactly 24 hours later", but the context says the correct next slot is 01:30, the same wall-clock time, which is 23 elapsed hours across the 2026-03-08 DST start · Unclaimed: the unauthorized `return` at `api/handler.py:4` and the `BadRequest` raise at `api/handler.py:6` — T5's context is `—`, so no `Acceptance:` clause names either failure path

The `Tests: no-harness` claim on all six tasks holds: `README.md` says the repository has no build and no test runner, and the diff adds none.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | signup/eligibility.py:7 | L2 type-contract breach | `form = {'age': '21'}`; a form with no `age` (`None`) | `is_eligible` compares `age >= min_age` against an `int`. Python 3 raises `TypeError: '>=' not supported between instances of 'str' and 'int'` | parse in `check_signup`: `int(age)`, with `None`/`ValueError` mapped to ineligible or a validation error |
| major | fetch/fanout.go:7 | L7 concurrency | a `go` directive below 1.22 (no `go.mod` exists) | every goroutine reads the one loop variable `u` (:3) while the loop keeps writing it. Repro with `go 1.21`: `fetch …/d` logged 4×, `a`, `b`, `c` never, the reported symptom. `go vet`: `loop variable u captured by func literal` at :7 and :9 | `go func(u string) { … }(u)`, or pin `go 1.22`+ in a `go.mod` |
| major | booking/slots.py:7 | L9 time and locale | offset-bearing input `'2026-03-08T01:30:00-08:00'` or `'2026-03-08T09:30:00+00:00'` | the fixed offset is kept, so `+ timedelta(hours=24)` is elapsed time: `2026-03-09T01:30:00-08:00`, which is 02:30 PDT in Los Angeles. Naive input gives 01:30, hence "sometimes". Naive `'2026-03-07T02:30:00'` returns `2026-03-08T02:30`, nonexistent in LA | convert to `ZoneInfo('America/Los_Angeles')`, add `timedelta(days=1)`, resolve gap times explicitly, correct the comment at :5 |
| major | checkout/discount.js:6 | L2 type-contract breach | `formData.price = ""` → `You pay: 0` | strings reach arithmetic that is correct only through `-`/`*` coercion: blank becomes 0 (a free order), `"abc"` or a missing field gives `NaN`, `discount = "150"` gives `-50`, `"19.99"`/`"15"` gives `16.9915` | `Number()` at :6, reject non-finite values and percentages outside 0–100, round to cents |
| major | api/handler.py:4 | L5 control-flow escape | a request with `is_authorized()` false; at :6, one not well-formed | the `return` at :4 and the `raise` at :6 sit above `audit_log.record(req)` at :7, so denied and malformed requests leave no audit record; no plan clause limits auditing to accepted requests | record before the checks, with the outcome |
| minor | store/cache.go:25 | L3 boundary blindspot | `var s store.Store`, the only value an outside caller can build | `maxSize` is 0, so `len(s.data) >= s.maxSize` holds on an empty cache and every `Set` returns `cache full`. In-package `Store{maxSize: n}` without `data` panics at :28 | add `NewStore(maxSize int) *Store` that makes the map |

## Coverage
- `.claude/rules/` is empty: there are no project rules to review against. The convention pass ran on the plan's design fields and `defaults.md` (readable) and found nothing.
- The package has no `Mutation:` line and owns no ledger task, so the count comparison was skipped. It has no `## Callers` or `## Projects` section.
- T6's L8 question: no lock leak. `defer s.mu.Unlock()` at `store/cache.go:24` runs on the early return at :26, and `Get` defers at :17. No finding.
- Cannot verify from diff: `fetch/fanout.go` has no `package` clause or imports. `api/handler.py` uses `BadRequest`, `_unauthorized` and `_process`, which nothing in the repository defines. `checkout/discount.js` reads an undeclared `formData`. As committed, none of the three runs. They were reviewed as excerpts, per `README.md`.
- Behavior was confirmed in scratch directories outside the repository: `python3` (slots, eligibility), `node` (discount), go 1.26.4 under `go 1.21` and `go 1.22` directives (fanout).
- Not reviewed: `util/strings.go`, which is outside the diff.
