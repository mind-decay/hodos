role: browser
server: playwright
navigate:   mcp__playwright__browser_navigate {url}
snapshot:   mcp__playwright__browser_snapshot                    # refs for click/fill live here
find:       mcp__playwright__browser_find {text}                 # one ref, cheaper than a whole snapshot
click:      mcp__playwright__browser_click {target, element}
fill:       mcp__playwright__browser_type {target, element, text}
stub:       mcp__playwright__browser_run_code_unsafe {code}      # async (page) => …, raw Playwright
screenshot: mcp__playwright__browser_take_screenshot {filename, scale}
evaluate:   mcp__playwright__browser_evaluate {function}
console:    mcp__playwright__browser_console_messages {level}
network:    mcp__playwright__browser_network_requests {static}
gotchas:
- navigate returns URL, title and console counts only — it writes the snapshot to `.playwright-mcp/page-<ts>.yml` and the console to `.playwright-mcp/console-<ts>.log` under the project root, untracked and absent from `.gitignore`. `snapshot` is the operation that returns the tree inline
- a screenshot `filename` must resolve inside the project root — an absolute path elsewhere answers `File access denied … Allowed roots: <root>/.playwright-mcp, <root>` — and the directory is not created: `mkdir -p` the task's `evidence/` first or the call is ENOENT. With a filename the response carries a link, not the image, so it costs no image tokens
- refs come from `snapshot` or `find` and go stale on navigation and on reload: `[ref=e3]` was `[ref=f1e3]` after one reload (2026-09-02)
- `/api` is served by nobody in dev, so a loaded-list claim needs `stub`: `page.route('**/api/orders*', r => r.fulfill({status, contentType, body}))` then `page.reload()` — a route registered after load leaves the request already made untouched. That is the same `fetch` boundary the vitest suite stubs, never the module the claim is about
- the fixture's own `/api/*` and `/favicon.ico` 404s are its design (CLAUDE.md), not a console finding
- `--isolated` in `.mcp.json` gives a fresh profile every session: no cookie, storage or login survives between runs
- `npm run dev` takes 5174 when 5173 is busy — read the URL out of the dev log, do not assume `commands.dev.url`
