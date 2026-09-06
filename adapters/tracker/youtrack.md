role: tracker
server: youtrack
link: mcp__youtrack__link_issues   # two issue ids and the link type; the server publishes no parameter names, so read them from the tool's own schema at call time
gotchas:
- v1 links, and nothing else: creating, transitioning, commenting on or closing an issue stays the developer's
- the issue id comes from the branch or the task description, never from a search the model runs to guess which issue was meant
