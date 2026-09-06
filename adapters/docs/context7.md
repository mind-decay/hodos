role: docs
server: context7
resolveLibrary: mcp__context7__resolve-library-id {libraryName, query}
getDocs:        mcp__context7__query-docs {libraryId, query}
gotchas:
- the version list is not the release history and its separators are not one shape: `/tanstack/query` answered `v5.60.5, v5.71.10, v5_84_1, v4_29_19, v5.90.3` on 2026-09-02, so the lockfile's exact version is usually absent. Pin to the nearest listed version at or below it, copied character for character from the answer, and write in `### External APIs` which one was used and that it is not the installed one
- one library comes back as several ids: a versioned one (`/tanstack/query`) and mirrors under `/websites/…` with no version list at all. The mirror answers about "current" and cannot be pinned, which is the failure the version-to-source order exists to prevent — take the id that carries versions
- rows repeat: the same id came back twice with different benchmark scores. The answer is ranked, not deduplicated, so read it as a ranking and take one id
- the server key is the install's, not the tool's: the same server is `claude_ai_Context7` on the claude.ai connector, and every operation id above changes with it. A project on such an install writes `.claude/hodos/adapters/docs/context7.md` with its own prefix through `/hodos:adapter`
