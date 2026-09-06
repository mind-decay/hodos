#!/usr/bin/env node
// git-guard.mjs — the opt-in PreToolUse gate on Bash (DESIGN.md §10, decision 0006).
//
// Incident behind the parser: a guard that greps the whole command string denies
// `echo "git push --force"` and misses `FOO=1 git push --force`. Substring
// matching on a shell command is the failure, so this splits the command into
// segments, strips VAR= prefixes, and looks only at the first word of each
// segment — a segment whose first word is not `git` or `rm` is not this guard's
// business.
//
// Off by default (config.gates.denyDangerousGit, config.gates.blockCommitOnFailedReview).
// Fails open: any unreadable payload, config or state exits 0 with no output,
// because a guard that breaks the session it guards is worse than no guard.

import { readFileSync } from 'node:fs';
import { join, resolve, relative, isAbsolute, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { activeTask, findConfig, readState, sessionOf } from './config.mjs';

const USAGE = `Usage: node scripts/git-guard.mjs

The PreToolUse hook of hodos. Reads the tool payload on stdin and prints a
permissionDecision (PLATFORM-NOTES.md fact 5).

  --help   print this and exit 0.

With config.gates.denyDangerousGit: denies git push --force, git commit
--no-verify, git reset --hard, and rm -rf outside .claude/hodos/tasks/.
With config.gates.blockCommitOnFailedReview: denies git commit while the
active task's phase is fix.

Exit codes: 0 — always, decision on stdout when there is one.`;

/** Split a shell command into segments on &&, ||, ; and | — outside quotes. */
export function segments(command) {
  const out = [];
  let current = '';
  let quote = null;
  for (let i = 0; i < command.length; i += 1) {
    const c = command[i];
    if (quote) {
      if (c === quote) quote = null;
      current += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      current += c;
      continue;
    }
    if (c === ';' || c === '&' || c === '|' || c === '\n') {
      out.push(current);
      current = '';
      continue;
    }
    current += c;
  }
  out.push(current);
  return out.map((s) => s.trim()).filter((s) => s !== '');
}

/** Split a segment into words, dropping one level of quoting. */
export function words(segment) {
  const out = [];
  let current = '';
  let quote = null;
  let started = false;
  for (const c of segment) {
    if (quote) {
      if (c === quote) quote = null;
      else current += c;
      continue;
    }
    if (c === '"' || c === "'") {
      quote = c;
      started = true;
      continue;
    }
    if (/\s/.test(c)) {
      if (started) out.push(current);
      current = '';
      started = false;
      continue;
    }
    current += c;
    started = true;
  }
  if (started) out.push(current);
  return out;
}

const stripAssignments = (tokens) => {
  let i = 0;
  while (i < tokens.length && /^[A-Za-z_][A-Za-z0-9_]*=/.test(tokens[i])) i += 1;
  return tokens.slice(i);
};

const has = (tokens, ...flags) => tokens.some((t) => flags.includes(t));

// git bundles short options, so -uf is -u -f. A bundle is a single dash and
// letters only, which never matches a long option.
const hasShort = (tokens, letter) =>
  tokens.some((t) => /^-[a-zA-Z]+$/.test(t) && t.slice(1).includes(letter));

// git's global options that take a separate value; that value is not the
// subcommand, so `git -C /tmp push --force` is still a force push.
const VALUE_OPTIONS = ['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path'];

/** The subcommand of a git call, read past any global options. */
function subcommandOf(rest) {
  for (let i = 0; i < rest.length; i += 1) {
    const token = rest[i];
    if (VALUE_OPTIONS.includes(token)) {
      i += 1;
      continue;
    }
    if (token.startsWith('-')) continue;
    return token;
  }
  return undefined;
}

/**
 * The reason to deny `tokens`, or null. `tokens` start at the command name.
 * `underTasks` decides whether an rm path is inside the task directory.
 */
export function denyReason(tokens, { dangerous, blockCommit, phase, underTasks }) {
  const [command, ...rest] = tokens;

  if (command === 'git') {
    const subcommand = subcommandOf(rest);
    if (blockCommit && subcommand === 'commit' && phase === 'fix') {
      return 'git commit is denied while the task is in fix: the review found blockers, and the fix commit comes after they are addressed (gates.blockCommitOnFailedReview).';
    }
    if (!dangerous) return null;
    // Exact tokens, not a prefix: --force-with-lease is the form git provides
    // for exactly the risk the reason below names, and it refuses when the
    // remote has moved. Denying it by prefix pushes the developer to --force.
    if (subcommand === 'push' && (has(rest, '--force') || hasShort(rest, 'f'))) {
      return 'git push --force is denied: it rewrites a branch other clones already have. Push without --force (gates.denyDangerousGit).';
    }
    if (subcommand === 'commit' && (has(rest, '--no-verify') || hasShort(rest, 'n'))) {
      return 'git commit --no-verify is denied: the hooks it skips are the project’s checks. Fix what fails, then commit (gates.denyDangerousGit).';
    }
    if (subcommand === 'reset' && has(rest, '--hard')) {
      return 'git reset --hard is denied: it discards work git cannot recover. Use git restore, git stash, or a new commit (gates.denyDangerousGit).';
    }
    return null;
  }

  if (command === 'rm' && dangerous) {
    const flags = rest.filter((t) => t.startsWith('-'));
    const recursive = flags.some((f) => /^-[a-zA-Z]*[rR]/.test(f) || f === '--recursive');
    const force = flags.some((f) => /^-[a-zA-Z]*f/.test(f) || f === '--force');
    if (!recursive || !force) return null;

    const paths = rest.filter((t) => !t.startsWith('-'));
    const outside = paths.filter((p) => !underTasks(p));
    if (outside.length === 0) return null;
    return `rm -rf ${outside.join(' ')} is denied: recursive force delete is allowed only inside .claude/hodos/tasks/ (gates.denyDangerousGit).`;
  }

  return null;
}

function readStdin() {
  try {
    return readFileSync(0, 'utf8');
  } catch {
    return '';
  }
}

/**
 * The phase of the task this session is on — the session's, not the project's:
 * `blockCommitOnFailedReview` used to deny a commit on whatever task `active`
 * happened to name (decision 0047).
 */
function activePhase(projectRoot, payload) {
  const slug = activeTask(projectRoot, sessionOf(payload));
  return slug ? (readState(projectRoot, slug)?.phase ?? null) : null;
}

function main() {
  let payload;
  try {
    payload = JSON.parse(readStdin());
  } catch {
    return 0; // fail open: an unparsable payload is not a decision
  }
  const command = payload?.tool_input?.command;
  if (typeof command !== 'string') return 0;

  const cwd = typeof payload.cwd === 'string' ? payload.cwd : process.cwd();
  const found = findConfig(cwd);
  if (found.notFound) return 0;

  const gates = found.config.gates ?? {};
  const dangerous = gates.denyDangerousGit === true;
  const blockCommit = gates.blockCommitOnFailedReview === true;
  if (!dangerous && !blockCommit) return 0;

  const tasksDir = join(found.projectRoot, '.claude', 'hodos', 'tasks');
  const underTasks = (path) => {
    const abs = isAbsolute(path) ? resolve(path) : resolve(cwd, path);
    const rel = relative(tasksDir, abs).split(sep).join('/');
    return rel !== '' && !rel.startsWith('..') && !isAbsolute(rel);
  };
  const phase = blockCommit ? activePhase(found.projectRoot, payload) : null;

  for (const segment of segments(command)) {
    const tokens = stripAssignments(words(segment));
    if (tokens.length === 0) continue;
    const reason = denyReason(tokens, { dangerous, blockCommit, phase, underTasks });
    if (reason) {
      process.stdout.write(
        `${JSON.stringify({
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: `hodos: ${reason}`,
          },
        })}\n`,
      );
      return 0;
    }
  }
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    process.stdout.write(`${USAGE}\n`);
    process.exitCode = 0;
  } else {
    process.exitCode = main();
  }
}
