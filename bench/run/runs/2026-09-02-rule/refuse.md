**Refused. Question 2 failed.**

**Grep first**

| Shape | Count |
|---|---|
| `await` | 7 |
| `async` | 5 |
| `.then(` | **0** |
| `.catch(` | **0** |
| `new Promise` | **0** |

No counter-shape anywhere in `src`. Code is 100% async/await already.

**1. Does the code follow it? — yes**
- `src/lib/http.ts:9` — `export async function request<T>(path: string, init?: RequestInit): Promise<T>`
- `src/lib/errors.ts:17` — `static async fromResponse(response: Response): Promise<ApiError>`
- Three async test bodies in `src/lib/http.test.ts:14,19,32`

Passes. Not drift — zero promise chains to compete with.

**2. Would model do it without rule? — yes. This kills it.**

No observation exists. History is three commits (`5eb056f`, `8dd9f95`, `412f533`) — scaffold, modules, tests. No fix commit, no revert, no review comment turning a `.then` chain into `await`. You named no incident either. And every async site in repo already reached for `await` unprompted on first write.

Rule would cost context on every matching turn forever and change nothing.

**3. Mechanically checkable? — moot, but yes**

`eslint-plugin-promise`'s `prefer-await-to-then` does it exactly. Prose loses to lint here anyway. `eslint.config.js` is fixed per CLAUDE.md, so that stays a proposal, not an edit.

**Wrote nothing.** `.claude/rules/` unchanged — still six files.

**What would flip it:** an instance where Claude wrote `.then()` in this repo and you corrected it. Bring that — commit sha, or the diff — and question 2 has an answer.

