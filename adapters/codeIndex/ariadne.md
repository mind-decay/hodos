role: codeIndex
server: ariadne
findReferences: mcp__ariadne__find_references {symbol, limit?, cursor?}
outline:        mcp__ariadne__read_outline {path, include_private?}
readSymbol:     mcp__ariadne__read_symbol {symbol, file?, mode?: signature|full|context}
blastRadius:    mcp__ariadne__blast_radius {symbol, depth?, kinds?, limit?, cursor?}
affectedTests:  mcp__ariadne__affected_tests {spec, depth?, kinds?, limit?, cursor?}
gotchas:
- an empty result is not "no risk": the index covers one project root, so a call site in a sibling workspace of a monorepo is outside it — confirm with a grep before concluding nothing uses the symbol
- find_references, blast_radius and affected_tests all answer one page (50 rows by default); a page carrying a cursor is not the whole answer, and a truncated blast radius reads as a small one
- blast_radius answers over resolved edges: must_touch is what the change breaks, may_touch is what it reaches. The two are separate lists, and a may_touch nobody sorted is the plan's `## Non-goals` line that was never written
- affected_tests takes a spec — the symbol or the path the change sits on — not a diff: it is asked once per changed symbol, against the working tree
- read_symbol reads the live file against the recorded span: stale: true means the file moved under the index, so the range is clamped and the symbol is re-read, not trusted
