#!/usr/bin/env node
// stop-gate.mjs — the opt-in Stop hook: a task in flight has an open item.
//
// Incident behind the counter: a Stop hook that blocks on every stop turns a
// session the developer wants to end into a fight, and Claude Code overrides a
// hook after 8 consecutive blocks (PLATFORM-NOTES.md fact 6) — an override the
// developer never asked for and cannot see. This gate stops at 6 on its own, so
// the last word is the developer's, and it keeps its count in its own file
// rather than in state.json, which is derived from the ledger alone
// (decision 0011).
//
// Off by default (config.gates.stopHookLedger).

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { activeTask, findConfig, hodosDir, readState, sessionOf } from './config.mjs';

const BLOCK_LIMIT = 6; // Claude Code overrides at 8 (PLATFORM-NOTES.md fact 6)
const OPEN_PHASES = ['execute', 'review', 'fix', 'verify'];

const USAGE = `Usage: node scripts/stop-gate.mjs

The Stop hook of hodos. With config.gates.stopHookLedger on and the active
task in execute, review, fix or verify, it exits 2 and names the open ledger
item; Claude Code shows that text and the session continues.

  --help   print this and exit 0.

It blocks at most ${BLOCK_LIMIT} times in a row for one state of the task; the count lives
in tasks/<slug>/stop-count and resets when state.updatedAt changes.

Exit codes: 0 — nothing to block (no config, gate off, no active task, a phase
with no open item, or the block limit reached); 2 — blocked, item on stderr.`;

/** The open item of a task, derived from state.json only (never from prose). */
export function openItem(state) {
  switch (state.phase) {
    case 'execute':
      return `Task ${state.tasks?.current ?? 1}`;
    case 'review':
      return `Review ${(state.review?.iteration ?? 0) + 1}`;
    case 'verify':
      return `Verify ${(state.verify?.iteration ?? 0) + 1}`;
    case 'fix': {
      const kind = String(state.lastEvent ?? '').startsWith('Verify') ? 'verify' : 'review';
      const iteration = kind === 'verify' ? state.verify?.iteration : state.review?.iteration;
      return `Fix ${iteration ?? 1}`;
    }
    default:
      return null;
  }
}

function readCount(path) {
  try {
    const [count, stamp] = readFileSync(path, 'utf8').trim().split(' ');
    return { count: Number(count) || 0, stamp: stamp ?? '' };
  } catch {
    return { count: 0, stamp: '' };
  }
}

/** The Stop payload, or null — an unreadable one is not a reason to block. */
function readPayload() {
  if (process.stdin.isTTY) return null;
  try {
    return JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return null;
  }
}

function main() {
  const payload = readPayload();
  const found = findConfig(typeof payload?.cwd === 'string' ? payload.cwd : process.cwd());
  if (found.notFound) return 0;
  if (found.config.gates?.stopHookLedger !== true) return 0;

  // The session's own task: two terminals on one project used to block each
  // other on the other's open item (decision 0047). `session_id` is documented
  // on the payload (PLATFORM-NOTES.md fact 38).
  const slug = activeTask(found.projectRoot, sessionOf(payload));
  if (!slug) return 0;

  const taskDir = join(hodosDir(found.projectRoot), 'tasks', slug);
  const state = readState(found.projectRoot, slug);
  if (!state) return 0;
  if (!OPEN_PHASES.includes(state.phase)) return 0;

  const countFile = join(taskDir, 'stop-count');
  const previous = readCount(countFile);
  // A changed updatedAt means the task moved since the last block, so this is a
  // new reason to stop, not the same one repeated.
  const count = (previous.stamp === state.updatedAt ? previous.count : 0) + 1;
  writeFileSync(countFile, `${count} ${state.updatedAt}\n`);
  if (count > BLOCK_LIMIT) return 0;

  const item = openItem(state);
  process.stderr.write(
    // `/` on every platform, like the digest's line: it is quoted in
    // COMPONENTS.md §4 and a reader types it into a shell (decision 0103).
    `hodos: ${slug} [${state.phase}] — open: ${item}. Ledger: .claude/hodos/tasks/${slug}/ledger.md\n`,
  );
  return 2;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    process.stdout.write(`${USAGE}\n`);
    process.exitCode = 0;
  } else {
    process.exitCode = main();
  }
}
