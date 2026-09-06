role: browser
server: chrome-devtools
navigate:   mcp__chrome-devtools__navigate_page {type: "url", url}
snapshot:   mcp__chrome-devtools__take_snapshot
click:      mcp__chrome-devtools__click {uid}
fill:       mcp__chrome-devtools__fill {uid, value}
screenshot: mcp__chrome-devtools__take_screenshot {filePath}
console:    mcp__chrome-devtools__list_console_messages
gotchas:
- take_snapshot before any click or fill; uids expire on navigation
- screenshots go to tasks/<slug>/evidence/<nn>-<name>.png; a call without filePath is paid for in tokens
