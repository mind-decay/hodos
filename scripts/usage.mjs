#!/usr/bin/env node
// usage.mjs — token usage of a hodos task, read from the session transcripts.
//
// Incident behind the de-duplication: Claude Code writes one assistant message
// as several lines — one per content block — and each of them carries a
// `message.usage`. Summing the lines rather than the messages roughly doubles
// the answer (measured 134 usage lines over 69 messages in one real transcript,
// 2026-09-02). A cost report that overstates is worse than none: one bad number
// discredits the rest, so this counts each message.id once and reports nothing
// at all when it can read nothing.
//
// The lines of one message do not all carry the same usage. In a subagent's
// transcript the line of a thinking block is written while the message is still
// streaming, and its output count is partial — 8 where the message's last line
// says 177. Keeping the first line seen left output up to 46 % below its final count on a
// pilot run, so each field keeps its largest value over the message's lines
// (PLATFORM-NOTES.md fact 60, decision 0167).
//
// The transcript is found by name (`<session-id>.jsonl`) under any project
// directory rather than by re-deriving the directory's slug from a path — the
// slug encoding is undocumented, the session id is unique.
//
// Incident behind the subagent directory: a subagent's messages are not in the
// session's own file. Claude Code writes each one to
// `<session-id>/subagents/agent-*.jsonl` beside it, and summing the session file
// alone left out every research, review and verify dispatch — 2.2M to 22.6M per
// task over Stage 12c-2's ten hodos runs (PLATFORM-NOTES.md fact 58).

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const USAGE = `Usage: node scripts/usage.mjs <session-id>...

Sums the token usage of one or more Claude Code sessions from their
transcripts, counting each assistant message once and including the subagent
messages the session dispatched. Prints JSON:

  { "sessions": 2, "missing": 0, "input": 41233, "output": 9120,
    "cacheRead": 812004, "cacheCreation": 66190 }

  --help   print this and exit 0.

Prints "null" when no transcript could be read — no usage data rather than a
wrong number. Token counts only: the price of a token is not in the transcript.

Exit codes: 0 — printed; 2 — bad invocation.`;

/**
 * Where Claude Code keeps session transcripts. `CLAUDE_CONFIG_DIR` is the
 * documented override; a caller that cannot read this directory knows nothing
 * about any session, which is different from knowing a session is gone.
 */
export const projectsDir = (home = homedir()) =>
  process.env.CLAUDE_CONFIG_DIR ? join(process.env.CLAUDE_CONFIG_DIR, 'projects') : join(home, '.claude', 'projects');

/** The transcript of a session, or null: `<projects>/<any>/<session-id>.jsonl`. */
export function transcriptPath(session, home = homedir()) {
  const root = projectsDir(home);
  let dirs;
  try {
    dirs = readdirSync(root);
  } catch {
    return null;
  }
  for (const dir of dirs) {
    const path = join(root, dir, `${session}.jsonl`);
    try {
      // `stat`, not a read: a transcript is megabytes, `addTranscript` reads it
      // again, and this call only has to answer whether it is there.
      statSync(path);
      return path;
    } catch {
      // not this project's directory
    }
  }
  return null;
}

const FIELDS = [
  ['input', 'input_tokens'],
  ['output', 'output_tokens'],
  ['cacheRead', 'cache_read_input_tokens'],
  ['cacheCreation', 'cache_creation_input_tokens'],
];

/**
 * Read one transcript's messages into `messages`, keyed by message id, keeping
 * each field's largest value over every line that carries the id — a count
 * only grows while a message streams, so the largest is the final one. A line
 * with no id is its own message. Returns false when the file is unreadable.
 */
function addTranscript(path, messages) {
  let text;
  try {
    text = readFileSync(path, 'utf8');
  } catch {
    return false;
  }
  for (const line of text.split('\n')) {
    if (line === '') continue;
    let row;
    try {
      row = JSON.parse(line);
    } catch {
      continue; // a partially written line is not a reason to fail
    }
    const usage = row?.message?.usage;
    if (!usage) continue;
    const id = row.message.id ?? row.requestId ?? Symbol('no id');
    const kept = messages.get(id) ?? { input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
    for (const [field, key] of FIELDS) kept[field] = Math.max(kept[field], usage[key] ?? 0);
    messages.set(id, kept);
  }
  return true;
}

/**
 * Token usage over `sessions`, or null when not one transcript could be read.
 * `missing` counts the sessions whose transcript was not there.
 */
export function summarize(sessions, home = homedir()) {
  const totals = { sessions: sessions.length, missing: 0, input: 0, output: 0, cacheRead: 0, cacheCreation: 0 };
  const messages = new Map();
  let read = 0;
  for (const session of sessions) {
    const path = transcriptPath(session, home);
    if (path === null || !addTranscript(path, messages)) {
      totals.missing += 1;
      continue;
    }
    for (const agent of subagentTranscripts(path)) addTranscript(agent, messages);
    read += 1;
  }
  for (const kept of messages.values()) for (const [field] of FIELDS) totals[field] += kept[field];
  return read === 0 ? null : totals;
}

/**
 * The transcripts of the subagents a session dispatched, at every depth:
 * `<session-id>/subagents/agent-*.jsonl` beside the session's own file
 * (PLATFORM-NOTES.md fact 58). None is not an error — a session that dispatched
 * nothing has no directory.
 */
function subagentTranscripts(sessionPath) {
  const dir = join(dirname(sessionPath), basename(sessionPath, '.jsonl'), 'subagents');
  try {
    return readdirSync(dir)
      .filter((name) => name.endsWith('.jsonl'))
      .map((name) => join(dir, name));
  } catch {
    return [];
  }
}

function main(argv) {
  if (argv[0] === '--help' || argv[0] === '-h') {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (argv.length === 0) {
    process.stderr.write(`usage: needs at least one session id\n${USAGE}\n`);
    return 2;
  }
  process.stdout.write(`${JSON.stringify(summarize(argv), null, 2)}\n`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
