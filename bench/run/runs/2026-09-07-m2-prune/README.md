# M2 — `init --refresh` over a rotted pin, 2026-09-07

Stage **11d-3**, criterion 1 (*A pin outlives its task, and a broken pin says
who broke it*), last part. One `/hodos:init --refresh` exchange in a prepared
`webapp` copy, run by the developer because the prune is an `AskUserQuestion`
and a `claude -p` session has none (`PLATFORM-NOTES.md` fact 32). No subagent,
no dispatch.

**The setup.** The pin was written by M1's real `finish` at `1787617` and
re-worded at `163495f`; the landing route it names was deleted from
`src/App.tsx` at `1e80b1d`, together with its now-unused `HomePage` import —
the route alone leaves `noUnusedLocals` red, and a copy that fails its own
typecheck is not this step's subject. `scanSha` was pointed at `3decb19`, a
commit this clone contains, so the delta path runs rather than the
unreachable-scan full re-scan.

**The result.** The prune was proposed on its own row with all three of the
route, the predicate and when it was written (`skills/init/SKILL.md:73`,
decision **0094**), approved, and written alone. `config.diff` is the whole
write: the one `checks[]` entry, plus the `when` line losing a trailing comma
because `checks` was the recipe's last key. `config.mjs check` → ok, exit 0.

**Everything else was declined and the run named it on disk:** `routes[]` still
carries `/` and still omits `/shift`; `.claude/rules/feature-barrel-imports.md`
lines 32 and 11–14 still name the import removed at `1e80b1d`, so
`lint.mjs --project` exits 1; `verifiedAt` stays 2026-08-31 and `scanSha` stays
`3decb19`, so the next `--refresh` re-reads this same delta.

## What it found

Three sentences of `skills/init/SKILL.md` that the run had to walk between, all
three raised as proposals the same day:

- **NNN** — the routes row and the prune are coupled and step 4 does not say
  so. `C2` sat in the batch while `C1` stood alone; approving `C2` alone would
  have stopped the pin being evaluated instead of removing it, with no proposal
  left behind to notice by.
- **OOO** — `scanSha` and `verifiedAt` share one condition at `:75` and answer
  different questions. The run gated both on `lint --project`, which is the
  Completion line at `:79`, and was right to hold `scanSha` and wrong to hold
  `verifiedAt`.
- **PPP** — step 7 is *done when* `lint --project` exits 0 and `:61` says a
  finding is fixed there, not filed as a caveat; `:75` says write only what is
  approved. A declined fix makes step 7 uncompletable, and the run named the
  conflict rather than writing past the decline.

The full write-up, with the quotes and the diff, is `docs/stages/11d3-report.md`
rows **1s–1z**.

## Files

| File | What it is |
|---|---|
| `config.diff` | the whole write, `git diff -- .claude/hodos/config.json` |
| `config-after.json` | the config as the run left it, `checks` gone, `routes` untouched |
| `route-drop.txt` | `1e80b1d`, the commit that killed the pin |
