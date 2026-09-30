# Review 1 — h3
Verdict: REJECT · blockers 1 · majors 4 · minors 3

## Checks run
- test: not configured
- typecheck: not configured
- lint: not configured
- (information) `python3 -c` on T2's expression, outside the repository: `1.0 - 1.0*(1-0.1)` → `0.09999999999999998`, `== 0.1` → `False`, return → `0.9720000000000001`

## Spec
Missing: T1: the `{ error: 'not found' }` response named in the context is not handled (`api/client.ts:11`). T2: the $0.10 tax waiver in the docstring does not fire for the file's own example `apply_discount(1.0, 0.1)` (`billing/tax.py:6`). T3: yes, the A/B concurrent calls in the context deadlock (`store/state.go:15`, `:24`). T4: 10,000 orders cost 10,001 queries (`reports/orders.py:11`). T5: `sendWelcome(99999L)` throws `NoSuchElementException` (`service/UserService.java:10`). T6 is met. `let i` gives every iteration its own binding, so each `onClick` alerts its own label. The junior developer's concern is not valid. · Extra: — · Misunderstood: — · Unclaimed: the tax-waiver branch at `billing/tax.py:6-7`. T2's context is `—`, so no acceptance clause names this branch. The plan's single invariant ("each task's context line states what its code is for") says nothing for T2, which leaves the docstring as the only statement of purpose.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| blocker | store/state.go:15 | L7 concurrency and async | Goroutine A in `Write` holds `c.mu` (line 13) and waits on `logger.mu`. At the same time goroutine B in `Flush` holds `l.mu` (line 22) and waits on `cache.mu` (line 24). | Lock-order inversion: `Write` locks Cache then Logger, `Flush` locks Logger then Cache. Both goroutines block forever. | Use one lock order in both methods (Cache, then Logger), or release one lock before taking the other. |
| major | api/client.ts:11 | L2 type-contract breach | `displayUser(id)` for a missing user; the body is `{ error: 'not found' }` | `as User` claims a shape the body does not have, and `response.ok` is never checked. At line 16 `user.email` is `undefined`, so `.toUpperCase()` throws `TypeError`. | In `fetchUser`, check `response.ok` / `'error' in data` and return `User \| null` or throw a not-found error. Narrow the result in `displayUser`. |
| major | billing/tax.py:6 | L3 boundary blindspot | `apply_discount(1.0, 0.1)`, the call at line 11 | Exact float equality fails at the very $0.10 the branch exists for. The result is `0.9720000000000001`, not the tax-free `0.9`. | Compute in `decimal.Decimal` (or integer cents) and compare to `Decimal('0.10')`. |
| major | reports/orders.py:11 | plan `### Data & scale` | 10,000 order ids (T4 context) | One `query_one` per order inside the loop: 1 + N round trips. Fine with 5 orders, 10,001 queries with 10,000. | Use one query: `orders LEFT JOIN customers ON c.id = o.customer_id WHERE o.id = ANY(%s)`. Or fetch all customers once with `id = ANY(%s)` into a dict. |
| major | service/UserService.java:10 | L6 callee-contract mismatch | `sendWelcome(99999L)`; `repo.findById` returns `Optional.empty()` | `user.get()` throws `NoSuchElementException: No value present`. It escapes through line 14, no email is sent, and the error does not name the user id. | Use `findById(id).map(User::getEmail)` and skip on empty in `sendWelcome`, or `orElseThrow(() -> new UserNotFoundException(id))`. |
| minor | store/state.go:1 | plan `### External APIs` | — | The file has no `package` clause and uses `sync` without `import "sync"`, so it does not parse as Go. The precedent `util/strings.go:2-6` has both. | Add `package store` and `import "sync"`. |
| minor | service/UserService.java:5 | plan `### Interfaces` | — | The `final` fields `repo` and `emailService` are never assigned and there is no constructor. javac rejects the class ("variable repo not initialized in the default constructor"). | Add a constructor that takes both dependencies. |
| minor | service/UserService.java:10 | defaults #9 | — | The comments `// line 9` (on line 10) and `// line 13` (on line 14) point at the wrong lines. A stack trace will report `:10`. | Delete both comments. |

## Coverage
- All three commands are `null` in the config. Nothing was compiled or run in the repository, and the Go, Java and TypeScript findings come from reading the code.
- The package has no `Mutation:` line, so the count comparison was skipped. All six tasks claim `no-harness`, the diff adds no test declarations, and `README.md` confirms there is no runner. Nothing contradicts the exemption.
- `.claude/rules/` is empty, so no project rule was applied. Conventions were reviewed against the plan's fields and `defaults.md` only.
- The package has no `## Callers` section, and every declaration is new.
- Plan `### Precedent` says the repository holds no other code, but `util/strings.go` exists. It was used only as the Go precedent above.
- Could not verify from the diff:
  - what `db.query_one` returns when no row matches (`reports/orders.py:17` would index `None`)
  - where `User`, `UserRepository` and `EmailService` are defined (nowhere in the repository)
  - how a `Cache` gets built: on the zero value, `data` is a nil map and the writes at lines 17 and 26 panic
- `ui/buttons.js` was reviewed; no finding.
