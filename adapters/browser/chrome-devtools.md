role: browser
server: chrome-devtools
navigate:   mcp__chrome-devtools__navigate_page {type: "url", url}
stub:       mcp__chrome-devtools__navigate_page {type: "url", url, initScript}
snapshot:   mcp__chrome-devtools__take_snapshot            # uids for click/fill live here
click:      mcp__chrome-devtools__click {uid}
fill:       mcp__chrome-devtools__fill {uid, value}
screenshot: mcp__chrome-devtools__take_screenshot {filePath}
evaluate:   mcp__chrome-devtools__evaluate_script {function}   # `() => …`, JSON-serializable return
console:    mcp__chrome-devtools__list_console_messages
network:    mcp__chrome-devtools__list_network_requests
resize:     mcp__chrome-devtools__resize_page {width, height}
emulate:    mcp__chrome-devtools__emulate {networkConditions?, viewport?, cpuThrottlingRate?, colorScheme?}
audit:      mcp__chrome-devtools__lighthouse_audit {device?, mode?}   # accessibility, SEO, best practices
gotchas:
- take_snapshot before any click/fill; uids expire on navigation
- screenshots go to tasks/<slug>/evidence/<nn>-<name>.png; a call without filePath attaches the image to the response and is paid for in tokens
- console and network answer for the current page since the last navigation; read them before navigating away, or ask for includePreservedMessages / includePreservedRequests to reach the last three
- a computed-style or cascade question is `evaluate` — `() => getComputedStyle(el).color` — not a screenshot a reader has to squint at
- lighthouse_audit excludes performance by design; a budget claim is performance_start_trace, and its accessibility category is axe underneath
- lighthouse never returns "incomplete"; the checks it does not automate are the same ten scoreDisplayMode manual audits every run, so they are a count in the row, not skips — a skip is runtimeError, the whole route
- resize_page sets the window size and nothing else; a claim about a phone needs emulate {viewport: "390x844x3,mobile,touch"}, which carries the pixel ratio and the touch surface with it
- initScript runs before the page's own scripts, so a project whose API is not served in dev reaches its states by stubbing `window.fetch` there — the same boundary its tests stub, and never the module the claim is about
