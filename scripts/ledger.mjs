#!/usr/bin/env node
// ledger.mjs — the only writer of `ledger.md` and `state.json` (FORMATS.md §6, §7).
//
// Incident behind the one-writer rule: the earlier resume system parsed its own
// prose markers with three greps and an awk that broke under a non-C locale, so
// a resumed session read the wrong state and redid finished work
// (research/01 §3). Here the model passes a CLI form, this script validates it
// against the grammar, appends the stored form, and derives state.json. No
// other script writes those two files, and no script parses prose.
//
// state.json is recomputed from the whole ledger on every append: the ledger is
// append-only and small, and a derivation that reads only the new line is a
// second source of truth waiting to drift from the table in §6.

import {
  appendFileSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
  existsSync,
} from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { activeTask, findConfig, hodosDir, sessionOf } from './config.mjs';
import { projectsDir, summarize, transcriptPath } from './usage.mjs';

const PATHS = ['quick', 'standard', 'deep'];
const TYPES = ['feature', 'bug', 'refactor', 'question', 'spike', 'upgrade'];
const SLUG_MAX = 40;
// Test-first is the default for every task; a task deviates only for one of
// these four reasons, written in the plan and repeated here (decision 0022).
const TEST_EXEMPTIONS = ['visual', 'glue', 'infra', 'no-harness'];

/** Options whose value is a count the stored form renders as a number. */
const COUNT_OPTIONS = ['net', 'tasks'];

const GRAMMAR = `Ledger grammar (FORMATS.md §6) — the CLI forms:

  init <slug> --path <quick|standard|deep> --type <feature|bug|refactor|question|spike|upgrade>
       [--campaign <c/n>]
  add "Route: <path> <type>"
  add "Plan: approved" --tasks <n> --branch <name>
  add "Task <n>: started"
  add "Task <n>: test red"
  add "Task <n>: done" --sha <sha> [--tests <visual|glue|infra|no-harness>]
  add "Task <n>: red-check attempt <k>/3 — <text>"
  add "Ruling: <what> — <why> — <cost if wrong>"
  add "Gap: <what the plan lacked> — <resolution>"
  add "Upgrade: <from>→<to> — <why>"
  add "Simplify: done" --sha <sha> --net <n>
  add "Review <k>: <ACCEPT|NEEDS_WORK|REJECT> <b>/<m>/<mi>"
  add "Fix <k>: done" --sha <sha>
  add "Verify <k>: <PASS|FAIL> <n> claims, <s> skipped"
  add "Breaker: <review|verify> — <accept|manual|rollback T<n>>"
  add "Compact: session compacted"
  add "Finish: report delivered"

Em dashes are literal. --slug <slug> overrides the active task.`;

const USAGE = `Usage: node scripts/ledger.mjs <command> [options]

The one writer of ledger.md and state.json for a hodos task.

  init <slug>   create the task directory, write .claude/hodos/active, and
                record Init. Normalizes the slug and appends -2, -3 on
                collision; prints the final slug.
                --path, --type required; --campaign <campaign/node> optional.
  claim <slug> point this session at an existing task: write
                .claude/hodos/sessions/<session-id> and .claude/hodos/active.
                Used by the run kernel when it takes up a task.
  sessions      list .claude/hodos/sessions/<id> and the task each names;
                --gc deletes a pointer whose task directory is gone or whose
                session transcript is gone. Run by /hodos:status.
  add "<line>"  validate a ledger line, append it with an ISO-8601 timestamp,
                and re-derive state.json.
                --sha, --tasks, --branch, --net fill the script's parts;
                --tests <reason> records the plan's test-first exemption;
                --slug <slug> overrides the session's own task.

The task a session is on is .claude/hodos/sessions/<session-id> first and
.claude/hodos/active second (decision 0047), so two terminals on one project
do not take each other's ledger.
  --help        print this and exit 0.

${GRAMMAR}

Exit codes: 0 — written, or nothing to write (no config, or no active task:
hooks rely on this); 1 — a line the grammar rejects, a missing option, or a
claim on a task that does not exist; 2 — bad invocation.`;

// FORMATS.md §6, in table order. `cli` matches what the model passes, `stored`
// what lands in ledger.md, `re` re-reads the stored form during derivation with
// the same capture groups. `phase` returns the phase after the event, or null
// where the row leaves it unchanged.
const RULES = [
  {
    id: 'init',
    cli: null,
    re: /^Init: (quick|standard|deep) (feature|bug|refactor|question|spike|upgrade)$/,
    phase: () => 'plan',
  },
  {
    id: 'route',
    cli: /^Route: (quick|standard|deep) (feature|bug|refactor|question|spike|upgrade)$/,
    stored: (line) => line,
    phase: () => 'plan',
  },
  {
    id: 'plan-approved',
    cli: /^Plan: approved$/,
    needs: ['tasks', 'branch'],
    stored: (line, o, ctx) => `Plan: approved (${ctx.headSha()}, ${o.tasks} tasks, ${o.branch})`,
    re: /^Plan: approved \(([^,]+), (\d+) tasks, (.+)\)$/,
    phase: () => 'approved',
  },
  { id: 'task-started', cli: /^Task (\d+): started$/, stored: (line) => line, phase: () => 'execute' },
  { id: 'test-red', cli: /^Task (\d+): test red$/, stored: (line) => line, phase: () => 'execute' },
  {
    id: 'task-done',
    cli: /^Task (\d+): done$/,
    needs: ['sha'],
    stored: (line, o) => (o.tests ? `${line} (${o.sha}, tests: ${o.tests})` : `${line} (${o.sha})`),
    re: /^Task (\d+): done \(([^,)]+)(?:, tests: [a-z-]+)?\)$/,
    phase: () => 'execute',
  },
  {
    id: 'red-check',
    cli: /^Task (\d+): red-check attempt ([1-3])\/3 — (.+)$/,
    stored: (line) => line,
    phase: () => 'execute',
  },
  { id: 'ruling', cli: /^Ruling: (.+) — (.+) — (.+)$/, stored: (line) => line, phase: () => null },
  { id: 'gap', cli: /^Gap: (.+) — (.+)$/, stored: (line) => line, phase: () => null },
  {
    id: 'upgrade',
    cli: /^Upgrade: (quick|standard|deep)→(quick|standard|deep) — (.+)$/,
    // The ratchet of DESIGN.md §4.1 is one-way; a downgrade is a rejected line,
    // not a silent state change.
    check: (m) =>
      PATHS.indexOf(m[2]) > PATHS.indexOf(m[1])
        ? null
        : `Upgrade goes one way: ${m[1]}→${m[2]} is not an upgrade (DESIGN.md §4.1)`,
    stored: (line) => line,
    phase: () => null,
  },
  {
    id: 'simplify',
    cli: /^Simplify: done$/,
    needs: ['sha', 'net'],
    stored: (line, o) => `Simplify: done (${o.sha}, net -${o.net})`,
    re: /^Simplify: done \(([^,]+), net -(\d+)\)$/,
    phase: () => 'review',
  },
  {
    id: 'review',
    cli: /^Review (\d+): (ACCEPT|NEEDS_WORK|REJECT) (\d+)\/(\d+)\/(\d+)$/,
    stored: (line, o, ctx, m) => `Review ${m[1]}: ${m[2]} (${m[3]}/${m[4]}/${m[5]})`,
    re: /^Review (\d+): (ACCEPT|NEEDS_WORK|REJECT) \((\d+)\/(\d+)\/(\d+)\)$/,
    phase: (m) => (m[2] === 'ACCEPT' ? 'verify' : 'fix'),
  },
  {
    id: 'fix-done',
    cli: /^Fix (\d+): done$/,
    needs: ['sha'],
    stored: (line, o) => `${line} (${o.sha})`,
    re: /^Fix (\d+): done \(([^)]+)\)$/,
    // §6: review if the last verdict event was a review, verify if it was a verify.
    phase: (m, ctx) => (ctx.lastVerdictKind() === 'verify' ? 'verify' : 'review'),
  },
  {
    id: 'verify',
    cli: /^Verify (\d+): (PASS|FAIL) (\d+) claims, (\d+) skipped$/,
    stored: (line) => line,
    phase: (m) => (m[2] === 'PASS' ? 'finish' : 'fix'),
  },
  {
    id: 'breaker',
    cli: /^Breaker: (review|verify) — (accept|manual|rollback T(\d+))$/,
    stored: (line) => line,
    phase: (m) => {
      if (m[2] === 'manual') return 'manual';
      if (m[3] !== undefined) return 'execute'; // rollback T<n>
      return m[1] === 'review' ? 'verify' : 'finish'; // accept: on as if it had passed
    },
  },
  { id: 'compact', cli: /^Compact: session compacted$/, stored: (line) => line, phase: () => null },
  { id: 'finish', cli: /^Finish: report delivered$/, stored: (line) => line, phase: () => 'done' },
];

const STORED_RE = (rule) => rule.re ?? rule.cli;

// Milliseconds are kept: state.updatedAt is the key stop-gate.mjs uses to tell
// "the task moved" from "the same stop again", and two events inside one second
// left its counter running.
const now = () => new Date().toISOString();

/** `Orders Summary!` → `orders-summary` (FORMATS.md §3: kebab ASCII, ≤40). */
export function normalizeSlug(raw) {
  return raw
    .normalize('NFKD')
    .replace(/[^\x20-\x7E]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '');
}

/** The stored form of a line, without its timestamp prefix. */
export function eventOf(storedLine) {
  const space = storedLine.indexOf(' ');
  return space === -1 ? storedLine : storedLine.slice(space + 1);
}

function matchCli(line) {
  for (const rule of RULES) {
    if (!rule.cli) continue;
    const m = rule.cli.exec(line);
    if (m) return { rule, m };
  }
  return null;
}

function matchStored(event) {
  for (const rule of RULES) {
    const m = STORED_RE(rule).exec(event);
    if (m) return { rule, m };
  }
  return null;
}

/** `review` or `verify` — which verdict event came last before index `i`. */
function verdictKindBefore(events, i) {
  for (let k = i - 1; k >= 0; k -= 1) {
    if (/^Review \d+: /.test(events[k])) return 'review';
    if (/^Verify \d+: /.test(events[k])) return 'verify';
  }
  return 'review';
}

/**
 * state.json for a task, derived from its ledger exactly by the tables in
 * FORMATS.md §6 (phase) and §7 (counters). `events` are stored forms without
 * timestamps; `stamps` are their timestamps, in the same order.
 */
export function deriveState(events, stamps, seed) {
  const state = {
    slug: seed.slug,
    path: seed.path ?? null,
    type: seed.type ?? null,
    phase: 'plan',
    campaign: seed.campaign ?? null,
    branch: null,
    base: null,
    tasks: { total: 0, done: 0, current: 1 },
    redCheckAttempts: 0,
    review: { iteration: 0, verdict: null },
    verify: { iteration: 0, verdict: null },
    lastCommit: null,
    lastEvent: events[events.length - 1] ?? null,
    createdAt: stamps[0] ?? now(),
    updatedAt: stamps[stamps.length - 1] ?? now(),
  };

  // A rollback breaker restarts the task count from T<n>: everything before it
  // is history, so the counters read only the events after it (§7).
  let from = 0;
  let rollback = null;
  events.forEach((event, i) => {
    const m = /^Breaker: (?:review|verify) — rollback T(\d+)$/.exec(event);
    if (m) {
      from = i + 1;
      rollback = Number(m[1]);
    }
  });

  let lastStarted = null;
  let lastDone = null;
  let attempts = 0;

  events.forEach((event, i) => {
    const hit = matchStored(event);
    if (!hit) return; // an unknown line cannot move state; `add` never writes one
    const { rule, m } = hit;

    const phase = rule.phase(m, { lastVerdictKind: () => verdictKindBefore(events, i) });
    if (phase) state.phase = phase;

    switch (rule.id) {
      case 'init':
      case 'route':
        state.path = m[1];
        state.type = m[2];
        break;
      case 'plan-approved':
        state.base = m[1];
        state.tasks.total = Number(m[2]);
        state.branch = m[3];
        break;
      case 'upgrade':
        state.path = m[2];
        break;
      case 'task-done':
      case 'fix-done':
        state.lastCommit = m[2];
        break;
      case 'simplify':
        state.lastCommit = m[1];
        break;
      default:
        break;
    }

    if (i < from) return; // counters read only what follows the last rollback

    // FORMATS.md §7: an iteration counts its events, and a rollback breaker
    // restarts that count with the task (decision 0023). The number in the line
    // is the model's; a miscounted "Review 3:" must not become the loop bound
    // of DESIGN.md §4.5, and rebuilt work is judged on a fresh bound.
    if (rule.id === 'review') state.review = { iteration: state.review.iteration + 1, verdict: m[2] };
    else if (rule.id === 'verify') state.verify = { iteration: state.verify.iteration + 1, verdict: m[2] };

    if (rule.id === 'task-started') {
      lastStarted = Number(m[1]);
      attempts = 0;
    } else if (rule.id === 'task-done') {
      lastDone = Number(m[1]);
      state.tasks.done += 1;
      attempts = 0;
    } else if (rule.id === 'red-check') {
      attempts = Number(m[2]);
    }
  });

  state.redCheckAttempts = attempts;

  if (lastStarted !== null && lastStarted !== lastDone) state.tasks.current = lastStarted;
  else if (lastDone !== null) state.tasks.current = lastDone + 1;
  else if (rollback !== null) state.tasks.current = rollback;
  if (state.tasks.total > 0) state.tasks.current = Math.min(state.tasks.current, state.tasks.total);

  return state;
}

// Test-first is the default for every task (DESIGN.md §6.2): the red phase is
// evidence in the ledger, not a claim in the transcript. A task that deviates
// carries its plan exemption on `done`, where the reviewer reads it.
function testFirstRefusal(taskDir, n, tests) {
  if (tests !== undefined) {
    return TEST_EXEMPTIONS.includes(tests)
      ? null
      : `--tests ${tests} is not one of ${TEST_EXEMPTIONS.join(', ')} (DESIGN.md §6.2)`;
  }
  const { events } = readLedger(taskDir);
  if (events.includes(`Task ${n}: test red`)) return null;
  return `"Task ${n}: done" needs "Task ${n}: test red" before it, or --tests <${TEST_EXEMPTIONS.join('|')}> naming the exemption the plan gave this task (decision 0022)`;
}

/**
 * A ledger this script could not read (decision 0101). Carried as its own error
 * so that main turns it into a refusal with a message, and never into a stack.
 */
class UnreadableLedger extends Error {
  constructor(file, cause) {
    super(
      `ledger: cannot read ${file} (${cause.code ?? cause.message}) — nothing was written. ` +
        'Fix or move the file and run the command again.',
    );
    this.file = file;
  }
}

/**
 * Replace a file rather than truncate it (decision 0101). A process killed
 * inside writeFileSync leaves a partial file where the task's phase used to be;
 * a rename is atomic, so a reader sees the old state or the new one.
 */
function writeAtomic(target, text) {
  const tmp = `${target}.tmp`;
  writeFileSync(tmp, text);
  renameSync(tmp, target);
}

function readLedger(taskDir) {
  const file = join(taskDir, 'ledger.md');
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch (error) {
    // Absent is the first line of a task and is legitimate. Anything else is a
    // file no state may be derived from: zero events derive a state that says
    // the task is at its beginning, which parses cleanly and is wrong, and a
    // resume trusts it (decision 0101).
    if (error.code === 'ENOENT') return { events: [], stamps: [] };
    throw new UnreadableLedger(file, error);
  }
  const lines = text.split('\n').filter((l) => l.trim() !== '');
  return { events: lines.map(eventOf), stamps: lines.map((l) => l.slice(0, l.indexOf(' '))) };
}

function seedOf(taskDir, fallback) {
  try {
    const prev = JSON.parse(readFileSync(join(taskDir, 'state.json'), 'utf8'));
    return { slug: prev.slug, path: prev.path, type: prev.type, campaign: prev.campaign };
  } catch {
    return fallback;
  }
}

// The read comes first so that a refusal happens before anything is written:
// with the append first, the line is already on disk when the read that would
// derive the state from it fails (decision 0101).
function append(taskDir, stored, seed) {
  const before = readLedger(taskDir);
  const stamp = now();
  appendFileSync(join(taskDir, 'ledger.md'), `${stamp} ${stored}\n`);
  const events = [...before.events, stored];
  const stamps = [...before.stamps, stamp];
  const state = deriveState(events, stamps, seedOf(taskDir, seed));
  writeAtomic(join(taskDir, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
  return state;
}

/** Options that take no value; everything else needs one. */
const BOOLEAN_OPTIONS = new Set(['gc']);

function parseOptions(argv) {
  const options = {};
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (BOOLEAN_OPTIONS.has(key)) {
        options[key] = true;
        continue;
      }
      const value = argv[i + 1];
      if (value === undefined || value.startsWith('--')) return { error: `--${key} needs a value` };
      options[key] = value;
      i += 1;
      continue;
    }
    rest.push(arg);
  }
  return { options, rest };
}


// --- claiming a task (decision 0047)
//
// `.claude/hodos/active` is one pointer per project, and two terminals on one
// repository is the normal mode: the loser of the race gets another task's
// ledger line, Stop block or denied commit, silently. The pointer is now per
// session, and `active` stays as the single-session path and the fallback.

function claimFor(projectRoot, slug) {
  const dir = hodosDir(projectRoot);
  writeAtomic(join(dir, 'active'), `${slug}\n`);
  const session = sessionOf();
  if (!session) return; // no id reachable: `active` alone, which is the old behaviour
  mkdirSync(join(dir, 'sessions'), { recursive: true });
  writeAtomic(join(dir, 'sessions', session), `${slug}\n`);
}

/** Every pointer that names `slug` goes, and `active` with it when it does. */
function releaseClaims(projectRoot, slug) {
  const dir = hodosDir(projectRoot);
  const activeFile = join(dir, 'active');
  try {
    if (readFileSync(activeFile, 'utf8').trim() === slug) rmSync(activeFile, { force: true });
  } catch {
    // no active file: nothing to release
  }
  const sessionsDir = join(dir, 'sessions');
  let entries;
  try {
    entries = readdirSync(sessionsDir);
  } catch {
    return;
  }
  for (const name of entries) {
    const path = join(sessionsDir, name);
    try {
      if (readFileSync(path, 'utf8').trim() === slug) rmSync(path, { force: true });
    } catch {
      // a pointer that cannot be read is not this task's to delete
    }
  }
}

/**
 * Every session id whose pointer names `slug`, plus `own` when the caller is
 * itself working the task. A session that names another task with `--slug` has
 * not claimed it, and `usage` is defined as the usage of the sessions that did.
 */
function sessionsFor(projectRoot, slug, own = null) {
  const ids = new Set();
  if (own) ids.add(own);
  const sessionsDir = join(hodosDir(projectRoot), 'sessions');
  let entries;
  try {
    entries = readdirSync(sessionsDir);
  } catch {
    return [...ids];
  }
  for (const name of entries) {
    try {
      if (readFileSync(join(sessionsDir, name), 'utf8').trim() === slug) ids.add(name);
    } catch {
      // an unreadable pointer names nobody
    }
  }
  return [...ids];
}

/** `sessions` and `sessions --gc` — the garbage collection `status` runs. */
function cmdSessions(options, rest, projectRoot) {
  const dir = join(hodosDir(projectRoot), 'sessions');
  let entries;
  try {
    entries = readdirSync(dir).sort();
  } catch {
    return { code: 0, out: 'no session pointers' };
  }

  // A machine whose transcripts this process cannot see knows nothing about
  // any session, which is not the same as knowing a session is gone.
  let transcriptsReadable = true;
  try {
    readdirSync(projectsDir());
  } catch {
    transcriptsReadable = false;
  }

  const lines = [];
  for (const id of entries) {
    const path = join(dir, id);
    let slug;
    try {
      slug = readFileSync(path, 'utf8').trim();
    } catch {
      slug = '';
    }
    // An empty or unreadable pointer is dead before any other test: `join(dir,
    // 'tasks', '')` is the existing tasks directory, so the check below would
    // call it live and no run would ever collect it.
    const reason = slug === ''
      ? 'the pointer names no task'
      : !existsSync(join(hodosDir(projectRoot), 'tasks', slug))
        ? `${slug} has no task directory`
        : transcriptsReadable && transcriptPath(id) === null
          ? 'its session transcript is gone'
          : null;
    if (options.gc && reason) {
      rmSync(path, { force: true });
      lines.push(`removed ${id} — ${reason}`);
      continue;
    }
    lines.push(`${id} ${slug}${reason ? ` — ${reason}` : ''}`);
  }
  if (!transcriptsReadable) lines.push('note: transcripts unreadable — no pointer removed for a dead session');
  return { code: 0, out: lines.join('\n') };
}

function cmdClaim(options, rest, projectRoot) {
  const slug = rest[0];
  if (!slug) return { code: 2, err: `ledger: claim needs a slug\n${USAGE}` };
  if (!existsSync(join(hodosDir(projectRoot), 'tasks', slug))) {
    return { code: 1, err: `ledger: ${slug} has no task directory` };
  }
  claimFor(projectRoot, slug);
  return { code: 0, out: slug };
}

function cmdInit(options, rest, projectRoot) {
  const raw = rest[0];
  if (!raw) return { code: 2, err: `ledger: init needs a slug\n${USAGE}` };
  if (!PATHS.includes(options.path)) return { code: 1, err: `ledger: --path must be one of ${PATHS.join(', ')}` };
  if (!TYPES.includes(options.type)) return { code: 1, err: `ledger: --type must be one of ${TYPES.join(', ')}` };

  const base = normalizeSlug(raw);
  if (base === '') return { code: 1, err: `ledger: "${raw}" normalizes to an empty slug` };

  const tasksDir = join(hodosDir(projectRoot), 'tasks');
  let slug = base;
  for (let n = 2; existsSync(join(tasksDir, slug)); n += 1) slug = `${base}-${n}`;

  const taskDir = join(tasksDir, slug);
  mkdirSync(taskDir, { recursive: true });
  claimFor(projectRoot, slug);
  append(taskDir, `Init: ${options.path} ${options.type}`, {
    slug,
    path: options.path,
    type: options.type,
    campaign: options.campaign ?? null,
  });
  return { code: 0, out: slug };
}

function cmdAdd(options, rest, projectRoot) {
  const line = rest[0];
  if (line === undefined) return { code: 2, err: `ledger: add needs a line\n${USAGE}` };

  let slug = options.slug;
  if (!slug) {
    // Hooks call `add` in every session; a project with no task in flight is
    // the normal case, not a failure.
    slug = activeTask(projectRoot);
    if (!slug) return { code: 0, err: 'no active task' };
  }
  const taskDir = join(hodosDir(projectRoot), 'tasks', slug);
  if (!existsSync(taskDir)) return { code: 0, err: `no active task (${slug} has no task directory)` };

  const hit = matchCli(line);
  if (!hit) return { code: 1, err: `ledger: line rejected: ${line}\n\n${GRAMMAR}` };
  const { rule, m } = hit;

  for (const need of rule.needs ?? []) {
    if (options[need] === undefined) return { code: 1, err: `ledger: "${line}" needs --${need}\n\n${GRAMMAR}` };
  }
  // A count is a count. `--net -2` stored `net --2`, which this file's own
  // `net -(\d+)` pattern cannot match: the phase never moved to review and the
  // append-only ledger kept an inert line no reader could act on. Found on the
  // first Stage 5 run of the `run` kernel.
  for (const key of COUNT_OPTIONS) {
    if (options[key] !== undefined && !/^\d+$/.test(options[key])) {
      const got = JSON.stringify(options[key]);
      return { code: 1, err: `ledger: --${key} takes a whole number of 0 or more, not ${got}` };
    }
  }
  const invalid = rule.check?.(m);
  if (invalid) return { code: 1, err: `ledger: ${invalid}` };

  if (rule.id === 'task-done') {
    const refusal = testFirstRefusal(taskDir, m[1], options.tests);
    if (refusal) return { code: 1, err: `ledger: ${refusal}` };
  }

  const ctx = {
    headSha: () =>
      execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim(),
  };

  let stored;
  try {
    stored = rule.stored(line, options, ctx, m);
  } catch (error) {
    return { code: 1, err: `ledger: cannot fill the script's part of "${line}": ${error.message}` };
  }

  const state = append(taskDir, stored, { slug, path: null, type: null, campaign: null });

  if (rule.id === 'finish') {
    const { events } = readLedger(taskDir);
    const history = {
      slug,
      path: state.path,
      type: state.type,
      upgrades: events.filter((e) => e.startsWith('Upgrade: ')).length,
      reviewIterations: state.review.iteration,
      verifyIterations: state.verify.iteration,
      gaps: events.filter((e) => e.startsWith('Gap: ')).length,
      // Both derived from lines the ledger already holds (decision 0046): a
      // `Route:` line is written only when the developer changed the router's
      // proposal at confirmation, so its presence is the override.
      overrode: events.some((e) => e.startsWith('Route: ')),
      gapTexts: events.filter((e) => e.startsWith('Gap: ')).map((e) => e.slice('Gap: '.length)),
      finishedAt: state.updatedAt,
      // Token counts only, and null rather than a number it cannot stand
      // behind (decision 0045). Collected before the pointers are released.
      usage: summarize(sessionsFor(projectRoot, slug, options.slug ? null : sessionOf())),
    };
    appendFileSync(join(hodosDir(projectRoot), 'history.jsonl'), `${JSON.stringify(history)}\n`);
    releaseClaims(projectRoot, slug);
  }

  return { code: 0, out: stored };
}

function main(argv) {
  const parsed = parseOptions(argv.slice(1));
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || parsed.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (parsed.error) {
    process.stderr.write(`ledger: ${parsed.error}\n${USAGE}\n`);
    return 2;
  }
  const command = argv[0];
  if (!['init', 'add', 'claim', 'sessions'].includes(command)) {
    process.stderr.write(`ledger: unknown command: ${command}\n${USAGE}\n`);
    return 2;
  }

  const found = findConfig(process.cwd());
  if (found.notFound) return 0; // silent: the plugin is enabled in projects that never ran init

  const commands = { init: cmdInit, add: cmdAdd, claim: cmdClaim, sessions: cmdSessions };
  let result;
  try {
    result = commands[command](parsed.options, parsed.rest, found.projectRoot);
  } catch (error) {
    if (!(error instanceof UnreadableLedger)) throw error;
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  if (result.out) process.stdout.write(`${result.out}\n`);
  if (result.err) process.stderr.write(`${result.err}\n`);
  return result.code;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
