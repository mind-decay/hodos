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
import { basename, dirname, join, resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { findMaps } from './campaigns.mjs';
import { activeTask, findConfig, hodosDir, sessionOf } from './config.mjs';
import { projectsDir, summarize, transcriptPath } from './usage.mjs';

const PATHS = ['quick', 'standard', 'deep'];
const TYPES = ['feature', 'bug', 'refactor', 'question', 'spike', 'upgrade'];
const SLUG_MAX = 40;
// Test-first is the default for every task; a task deviates only for one of
// these four reasons, written in the plan and repeated here (decision 0022).
const TEST_EXEMPTIONS = ['visual', 'glue', 'infra', 'no-harness'];
// A shape adds no path (FORMATS.md §3): `mechanical` is one of `refactor`, and
// `inert` one of `quick` for a change with no behaviour (decision 0183).
const SHAPES = ['inert', 'mechanical'];
// The ratchet's rungs. `inert` sits below `quick`, so leaving it is an upgrade
// and entering it is not.
const UPGRADE_RUNGS = ['inert', ...PATHS];

/** Options whose value is a count the stored form renders as a number. */
const COUNT_OPTIONS = ['net', 'tasks'];

const GRAMMAR = `Ledger grammar (FORMATS.md §6) — the CLI forms:

  init <slug> --path <quick|standard|deep> --type <feature|bug|refactor|question|spike|upgrade>
       [--shape <inert|mechanical>] [--campaign <c/n>] [--chat <xx>]
  add "Route: <path> <type> [<shape>]"
  add "Plan: approved" --tasks <n> --branch <name> [--handoff]
  add "Task <n>: started"
  add "Task <n>: test red"
  add "Task <n>: mutation" --tests <k>
  add "Task <n>: done" --sha <sha> [--tests <visual|glue|infra|no-harness> | --inert]
  add "Task <n>: red-check attempt <k>/3 — <text>"
  add "Task <n>: blocked — <question>"    (after its attempt 3/3)
  add "Ruling: <what> — <why> — <cost if wrong>"
  add "Gap: <what the plan lacked> — <resolution>"
  add "Upgrade: <from>→<to> — <why>"      (<from> is the task's rung, inert included)
  add "Simplify: done" --sha <sha> --net <n>
  add "Review <k>: <ACCEPT|NEEDS_WORK|REJECT> <b>/<m>/<mi>"
  add "Fix <k>: green"                    (in fix, once the pass's checks pass)
  add "Fix <k>: done" --sha <sha>
  add "Verify <k>: <PASS|FAIL> <n> claims, <s> skipped"
  add "Breaker: <review|verify> — <accept|manual|rollback T<n>>"
  add "Compact: session compacted"
  add "Finish: report delivered"

Em dashes are literal. --slug <slug> overrides the active task.`;

const USAGE = `Usage: node scripts/ledger.mjs <command> [options]

The one writer of ledger.md and state.json for a hodos task.

  init <slug>   create the task directory, claim it as claim does, and
                record Init. Normalizes the slug and appends -2, -3 on
                collision; prints the final slug.
                --path, --type required; --shape <inert|mechanical>,
                --campaign <campaign/node> and --chat <xx>, the language
                the developer is speaking, optional.
  claim <slug> point this session at an existing task: write
                .claude/hodos/sessions/<session-id>, or .claude/hodos/active
                where no session id is reachable (decision 0171).
                Used by the run kernel when it takes up a task; refused, with
                nothing written, in the session that approved its plan
                (decision 0190).
  next [<slug>] print one JSON line, {"slug", "step", "next"}: the step that
                continues the task and the command or words that take it
                (decision 0192). With no slug, the most recently touched task
                neither done nor manual; --done answers for a task finishing
                now and needs a slug. A done answer adds "land": null, or the
                options of the landing question, each with the exact commands
                it runs, read from git (decision 0197). --handoff <file>, with
                a slug, answers /hodos:handoff's question about committing and
                pushing that file instead. Writes nothing, not even a pointer.
  sessions      list .claude/hodos/sessions/<id> and the task each names;
                --gc deletes a pointer whose task directory is gone or whose
                session transcript is gone. Run by /hodos:status.
  add "<line>"  validate a ledger line, append it with an ISO-8601 timestamp,
                and re-derive state.json.
                --sha, --tasks, --branch, --net fill the script's parts;
                --handoff on "Plan: approved" stores no session, for an
                approval made where the work is picked up (decision 0190);
                --tests is a whole number of new tests on a mutation row and
                the plan's test-first exemption on done; --inert marks the
                done of a task whose shape is inert (decision 0183);
                --slug <slug> overrides the session's own task.

The task a session is on is .claude/hodos/sessions/<session-id>, and
.claude/hodos/active only while no session holds a pointer (decisions 0047,
0171), so two terminals on one project do not take each other's ledger.
  --help        print this and exit 0.

${GRAMMAR}

Exit codes: 0 — written, or nothing to write (no config, or no active task:
hooks rely on this); 1 — a line the grammar rejects, a missing option, or a
claim or a next on a task that does not exist; 2 — bad invocation.`;

// FORMATS.md §6, in table order. `cli` matches what the model passes, `stored`
// what lands in ledger.md, `re` re-reads the stored form during derivation with
// the same capture groups. `phase` returns the phase after the event, or null
// where the row leaves it unchanged.
const RULES = [
  {
    id: 'init',
    cli: null,
    re: /^Init: (quick|standard|deep) (feature|bug|refactor|question|spike|upgrade)(?: (inert|mechanical))?$/,
    phase: () => 'plan',
  },
  {
    id: 'route',
    cli: /^Route: (quick|standard|deep) (feature|bug|refactor|question|spike|upgrade)(?: (inert|mechanical))?$/,
    check: (m) => (m[3] ? shapeRefusal(m[1], m[2], m[3]) : null),
    stored: (line) => line,
    phase: () => 'plan',
  },
  {
    id: 'plan-approved',
    cli: /^Plan: approved$/,
    needs: ['tasks', 'branch'],
    // The session that approved the plan, so that `claim` never starts S2
    // inside it (decision 0190). `--handoff` stores none: the Pickup approves
    // in the session that runs the work, for a plan written elsewhere.
    stored: (line, o, ctx) => {
      const session = o.handoff ? null : ctx.session();
      return `Plan: approved (${ctx.headSha()}, ${o.tasks} tasks, ${o.branch}${session ? `, session ${session}` : ''})`;
    },
    re: /^Plan: approved \(([^,]+), (\d+) tasks, (.+?)(?:, session ([^)\s]+))?\)$/,
    phase: () => 'approved',
  },
  { id: 'task-started', cli: /^Task (\d+): started$/, stored: (line) => line, phase: () => 'execute' },
  { id: 'test-red', cli: /^Task (\d+): test red$/, stored: (line) => line, phase: () => 'execute' },
  {
    id: 'mutation',
    cli: /^Task (\d+): mutation$/,
    needs: ['tests'],
    // One flag, two types, told apart by the event (decision 0122): a count
    // here, the plan's exemption on `done`. The check is per rule for that
    // reason — a global count list would reject the exemption as a number.
    check: (m, o) =>
      /^\d+$/.test(o.tests)
        ? null
        : `--tests on a mutation row takes a whole number of new tests, not ${JSON.stringify(o.tests)}`,
    stored: (line, o) => `${line} (${o.tests} tests)`,
    re: /^Task (\d+): mutation \((\d+) tests\)$/,
    phase: () => 'execute',
  },
  {
    id: 'task-done',
    cli: /^Task (\d+): done$/,
    needs: ['sha'],
    stored: (line, o) => {
      if (o.inert) return `${line} (${o.sha}, inert)`;
      return o.tests ? `${line} (${o.sha}, tests: ${o.tests})` : `${line} (${o.sha})`;
    },
    re: /^Task (\d+): done \(([^,)]+)(?:, tests: [a-z-]+|, inert)?\)$/,
    phase: () => 'execute',
  },
  {
    id: 'red-check',
    cli: /^Task (\d+): red-check attempt ([1-3])\/3 — (.+)$/,
    stored: (line) => line,
    phase: () => 'execute',
  },
  // The third red check stops on one question, and the stop is a phase of its
  // own so the digest and a resumed run show it (decision 0193).
  { id: 'task-blocked', cli: /^Task (\d+): blocked — (.+)$/, stored: (line) => line, phase: () => 'blocked' },
  { id: 'ruling', cli: /^Ruling: (.+) — (.+) — (.+)$/, stored: (line) => line, phase: () => null },
  { id: 'gap', cli: /^Gap: (.+) — (.+)$/, stored: (line) => line, phase: () => null },
  {
    id: 'upgrade',
    cli: /^Upgrade: (inert|quick|standard|deep)→(inert|quick|standard|deep) — (.+)$/,
    // The ratchet of DESIGN.md §4.1 is one-way; a downgrade is a rejected line,
    // not a silent state change.
    check: (m) =>
      UPGRADE_RUNGS.indexOf(m[2]) > UPGRADE_RUNGS.indexOf(m[1])
        ? null
        : `Upgrade goes one way: ${m[1]}→${m[2]} is not an upgrade (DESIGN.md §4.1)`,
    stored: (line) => line,
    // Out of inert, the edit is reverted and the plan re-grilled, so the task is
    // back before its approval, and a resumed run says so (decision 0184).
    phase: (m) => (m[1] === 'inert' ? 'plan' : null),
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
    // An inert task has no verifier to hand over to (decision 0183).
    phase: (m, ctx) => {
      if (m[2] !== 'ACCEPT') return 'fix';
      return ctx.shape() === 'inert' ? 'finish' : 'verify';
    },
  },
  // The fix pass's checks passed, which the commit gate reads before it lets the
  // pass commit in `fix` (decision 0195). It moves no phase.
  { id: 'fix-green', cli: /^Fix (\d+): green$/, stored: (line) => line, phase: () => null },
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
    phase: (m, ctx) => {
      if (m[2] === 'manual') return 'manual';
      if (m[3] !== undefined) return 'execute'; // rollback T<n>
      // accept: on as if it had passed, which for an inert task's review is finish
      return m[1] === 'review' && ctx.shape() !== 'inert' ? 'verify' : 'finish';
    },
  },
  { id: 'compact', cli: /^Compact: session compacted$/, stored: (line) => line, phase: () => null },
  { id: 'finish', cli: /^Finish: report delivered$/, stored: (line) => line, phase: () => 'done' },
];

const STORED_RE = (rule) => rule.re ?? rule.cli;

/** Why `shape` cannot ride on this path and type, or null when it can. */
function shapeRefusal(path, type, shape) {
  if (!SHAPES.includes(shape)) return `--shape must be one of ${SHAPES.join(', ')}`;
  if (shape === 'inert' && path !== 'quick') {
    return `the inert shape is a shape of a quick verdict, and this one is ${path} (decision 0183)`;
  }
  // A bug opens with a red loop, which a change no program reads cannot have;
  // a question and a spike commit nothing; an upgrade edits a version a
  // program reads. What is left is a feature or a refactor.
  if (shape === 'inert' && type !== 'feature' && type !== 'refactor') {
    return `the inert shape rides on type feature or refactor, and this one is ${type} (decision 0183)`;
  }
  if (shape === 'mechanical' && type !== 'refactor') {
    return `the mechanical shape is a shape of type refactor, and this one is ${type} (FORMATS.md §3)`;
  }
  return null;
}

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
    shape: seed.shape ?? null,
    phase: 'plan',
    campaign: seed.campaign ?? null,
    chat: seed.chat ?? null,
    branch: null,
    base: null,
    planSession: null,
    tasks: { total: 0, done: 0, current: 1 },
    redCheckAttempts: 0,
    blockedOn: null,
    fixGreen: null,
    review: { iteration: 0, verdict: null },
    verify: { iteration: 0, verdict: null },
    lastCommit: null,
    lastEvent: events[events.length - 1] ?? null,
    createdAt: stamps[0] ?? now(),
    updatedAt: stamps[stamps.length - 1] ?? now(),
  };

  // A rollback breaker restarts the task count from T<n>: everything before it
  // is history, so the counters read only the events after it (§7). The upgrade
  // out of `inert` restarts it from T1: its edit is reverted and rebuilt
  // test-first, and judged on fresh loop bounds (decision 0184).
  let from = 0;
  let rollback = null;
  events.forEach((event, i) => {
    const m = /^Breaker: (?:review|verify) — rollback T(\d+)$/.exec(event);
    if (m) {
      from = i + 1;
      rollback = Number(m[1]);
    } else if (/^Upgrade: inert→/.test(event)) {
      from = i + 1;
      rollback = null;
    }
  });

  let lastStarted = null;
  let lastDone = null;
  let attempts = 0;

  events.forEach((event, i) => {
    const hit = matchStored(event);
    if (!hit) return; // an unknown line cannot move state; `add` never writes one
    const { rule, m } = hit;

    const phase = rule.phase(m, { lastVerdictKind: () => verdictKindBefore(events, i), shape: () => state.shape });
    if (phase) state.phase = phase;

    switch (rule.id) {
      case 'init':
      case 'route':
        state.path = m[1];
        state.type = m[2];
        state.shape = m[3] ?? null;
        break;
      case 'plan-approved':
        state.base = m[1];
        state.tasks.total = Number(m[2]);
        state.branch = m[3];
        state.planSession = m[4] ?? null;
        break;
      case 'upgrade':
        state.path = m[2];
        // `inert` exists only on `quick`: any step up the ratchet leaves it.
        if (state.shape === 'inert') state.shape = null;
        break;
      case 'task-done':
      case 'fix-done':
        state.lastCommit = m[2];
        break;
      case 'simplify':
        state.lastCommit = m[1];
        break;
      case 'task-blocked':
        state.blockedOn = m[2];
        break;
      case 'task-started':
        state.blockedOn = null;
        break;
      case 'fix-green':
        state.fixGreen = Number(m[1]);
        break;
      default:
        break;
    }
    // One meaning for its one reader: the pass now in `fix` has run green.
    if (state.phase !== 'fix') state.fixGreen = null;

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

// An inert task's edit has no line a test could pin, and the developer said so
// at the verdict (decision 0183). The shape is read from the ledger, not taken
// from the caller: a flag the model can pass on any task would be a fifth
// exemption by another name.
function inertRefusal(taskDir, n, options) {
  if (options.tests !== undefined) {
    return `--inert and --tests are two records: a change is inert or its task is exempt, not both (decision 0183)`;
  }
  const { events, stamps } = readLedger(taskDir);
  const { shape } = deriveState(events, stamps, { slug: null });
  if (shape === 'inert') return null;
  return `"Task ${n}: done" --inert needs a task whose confirmed verdict carries Shape: inert, and this one carries ${shape ?? 'no shape'} (decision 0183)`;
}

// The third red check is what earns the stop (decision 0193). Blocked at any
// other point, the line would be the Gates rule for an unsettled fork under a
// second name, and the bound of DESIGN.md §4.5 would mean nothing. The
// attempts are the task's since it last started: a restart is a fresh bound.
function blockedRefusal(taskDir, n) {
  const { events } = readLedger(taskDir);
  const since = events.lastIndexOf(`Task ${n}: started`);
  if (events.slice(since + 1).some((e) => e.startsWith(`Task ${n}: red-check attempt 3/3 — `))) return null;
  return `"Task ${n}: blocked" needs "Task ${n}: red-check attempt 3/3" before it (decision 0193)`;
}

// The green line belongs to a fix pass (decision 0195). Outside `fix` there is
// no pass whose checks it could report, and a line the gate never reads is a
// record that says something happened when nothing did.
function greenRefusal(taskDir, n) {
  const { events, stamps } = readLedger(taskDir);
  const { phase } = deriveState(events, stamps, { slug: null });
  if (phase === 'fix') return null;
  return `"Fix ${n}: green" is recorded in phase fix, once the pass's checks pass, and this task is in ${phase} (decision 0195)`;
}

/**
 * The ratchet as the ledger holds it, which a line alone cannot show. An
 * upgrade starts at the task's own rung, so a step out of `inert` is always
 * written as one and is the reset of decision 0184. `inert` is chosen at the
 * verdict and never again, so a `Route:` cannot bring it back.
 */
function ratchetRefusal(taskDir, id, m) {
  const { events, stamps } = readLedger(taskDir);
  if (id === 'upgrade') {
    const state = deriveState(events, stamps, { slug: null });
    const rung = state.shape === 'inert' ? 'inert' : state.path;
    if (rung && m[1] !== rung) {
      return `an upgrade starts where the task is, and this one is ${rung}: write "Upgrade: ${rung}→${m[2]} — <why>" (DESIGN.md §4.1)`;
    }
    return null;
  }
  if (m[3] === 'inert' && events.some((e) => e.startsWith('Plan: approved') || e.startsWith('Upgrade: '))) {
    return 'the inert shape is confirmed at the verdict, and this task is past its verdict: nothing returns to inert (decision 0184)';
  }
  return null;
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
// Windows refuses a rename onto a target another process is renaming or has
// open, with one of these, and lets go within milliseconds: the 0.2.0 release's
// windows job met EPERM on two concurrent adds. Anything else is not a wait.
const RENAME_RETRY = new Set(['EPERM', 'EACCES', 'EBUSY']);
const RENAME_ATTEMPTS = 10;
const sleepSync = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

export function writeAtomic(target, text, { rename = renameSync, sleep = sleepSync } = {}) {
  // One temporary name per process: two writers sharing `<target>.tmp` meet
  // at the rename, and the second finds its file already moved (ENOENT) after
  // its ledger line has landed — 12 to 15 of 40 concurrent adds at 12d-1.
  const tmp = `${target}.${process.pid}.tmp`;
  writeFileSync(tmp, text);
  for (let attempt = 1; ; attempt += 1) {
    try {
      rename(tmp, target);
      return;
    } catch (error) {
      if (!RENAME_RETRY.has(error.code) || attempt >= RENAME_ATTEMPTS) {
        rmSync(tmp, { force: true });
        throw error;
      }
      sleep(10 * attempt); // at most 450 ms in all
    }
  }
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
    return { slug: prev.slug, path: prev.path, type: prev.type, shape: prev.shape, campaign: prev.campaign, chat: prev.chat };
  } catch {
    return fallback;
  }
}

/** Passes of derive-and-check before a write gives up waiting for the ledger to settle. */
const DERIVE_PASSES = 5;

// The read comes first so that a refusal happens before anything is written:
// with the append first, the line is already on disk when the read that would
// derive the state from it fails (decision 0101).
//
// The state is then derived from the ledger **on disk**, not from the events
// this process read before appending: two terminals on one task each append,
// and a state derived from the earlier read drops the other's line while
// ledger.md holds it. A re-read alone still lets the earlier writer's state
// land last, so the ledger is read once more after the write, and a ledger
// that grew in between is derived again — the last writer of state.json then
// checked after every append that preceded it (Stage 12d-1, deliverable 1).
// `io` exists so a test can place the other process's write in either gap.
export function append(taskDir, stored, seed, io = {}) {
  const { appendLine = appendFileSync, writeState = writeAtomic } = io;
  readLedger(taskDir);
  appendLine(join(taskDir, 'ledger.md'), `${now()} ${stored}\n`);
  const fallback = seedOf(taskDir, seed);
  let state;
  for (let pass = 0; pass < DERIVE_PASSES; pass += 1) {
    const { events, stamps } = readLedger(taskDir);
    state = deriveState(events, stamps, fallback);
    writeState(join(taskDir, 'state.json'), `${JSON.stringify(state, null, 2)}\n`);
    if (readLedger(taskDir).events.length === events.length) break;
  }
  return state;
}

// --- what continues a task (decision 0192)
//
// One table answers "which step continues task X", so task's S1 resume, run's
// resume rows, the digest's resume line and every exit that concludes no work
// of its own read it rather than keeping copies of the rule. `nextStep` is the
// table and decides nothing from the disk; `nextFacts` collects what it reads.

/** The phases `/hodos:run` resumes. */
const RUN_PHASES = ['approved', 'execute', 'review', 'fix', 'verify', 'finish'];

/** `{ step, next }` for a task's derived state, or for no task at all; a done answer adds `land`. */
export function nextStep(state, facts = {}) {
  if (!state) return { step: 'none', next: '/hodos:task <description>' };
  const { slug, phase, branch } = state;
  if (facts.handoff) return { step: 'handoff', ...handing(state, facts) };
  if (facts.done || phase === 'done') return { step: 'done', ...landing(state, facts) };
  if (phase === 'manual') return { step: 'manual', next: `/hodos:review ${branch}` };
  if (phase === 'blocked' || RUN_PHASES.includes(phase)) {
    return { step: phase === 'blocked' ? 'blocked' : 'run', next: `/hodos:run ${slug}` };
  }

  // Phase `plan`: S1 resumes at the first step whose output is missing.
  if (facts.rerouted) return { step: 'reroute', next: '/hodos:task <the symptom, as a question or a spike>' };
  const s1 = (step) => ({ step, next: `/hodos:task ${slug}` });
  if (!facts.brief) return s1('route');
  if (state.shape === 'inert' && !facts.plan) return s1('inert');
  if (facts.upgradedFromInert) return s1('plan');
  if (state.path === 'deep' && !facts.research) return s1('research');
  if (!facts.plan || facts.openQuestions) return s1('plan');
  return s1('approve');
}

// --- what lands a finished task (decision 0197)
//
// The done answer's `land` is the one question the land phase asks: each
// option carries the commands it runs, so what the developer is shown is what
// runs. It is built from git facts alone, never from a ledger line, so a resume
// never offers a landing a reset, a push or a colleague already settled.

/** The question: the options, then leave, which runs nothing and ends on `next`. */
const question = (options, notes, next) => ({
  options: [...options, { label: 'leave it', run: [], next }],
  note: notes.length ? notes.join('; ') : null,
});
/** The paths a note names: five, then a count of the rest. */
const named = (paths) => (paths.length > 5 ? `${paths.slice(0, 5).join(', ')} +${paths.length - 5}` : paths.join(', '));

/** `{ next, land }` for a finished task: `land` is null, or `{ options, note }` with leave last. */
function landing(state, facts) {
  const { slug, branch: b, campaign, type } = state;
  const [map, nodeName] = campaign?.split('/') ?? [];
  const after = campaign ? `/hodos:campaign ${map}` : '/hodos:task <description>';
  const none = (next = after) => ({ next, land: null });
  // `options[0]` is the recommendation, and leave, last, ends on its commands —
  // or, when nothing can run, on the words of what blocks it.
  const ask = (options, notes, blocked) => {
    const next = options.length ? options[0].run.join(' && ') : blocked;
    return { next, land: question(options, notes, next) };
  };
  if (!b || type === 'question') return none();
  const words = `merge ${b} into the branch it came from`;
  if (!facts.repo) return none(type === 'spike' ? after : words);
  if (!facts.branchExists) return none();
  const d = facts.defaultBranch;
  const r = facts.remote;
  if (type === 'spike') {
    // land.md asks this only when the spike's exit was "branch deleted" (finish §8a).
    if (!d) return { next: after, land: question([], ['no default branch found'], after) };
    return { next: after, land: question([{ label: `delete ${b}`, run: [`git switch ${d}`, `git branch -D ${b}`], next: after }], [], after) };
  }
  if (facts.merged) {
    return r && facts.defaultAhead > 0 ? ask([{ label: `push ${d} to ${r}`, run: [`git push ${r} ${d}`], next: after }], []) : none();
  }
  if (facts.head !== b) {
    return ask([], [`HEAD is ${facts.head ?? 'detached'}, not ${b}`], `git switch ${b}, then /hodos:run ${slug}`);
  }
  // With remotes, a local-only merge is a guess about the project's flow.
  if (facts.remotes && !r) return ask([], ['no remote git would push to — set remote.pushDefault'], `push ${b} to its remote`);

  const { dirty } = facts;
  const moved = Boolean(d) && !facts.ffable;
  // A node's map commit rides the fast-forward; after a rebase it names a
  // commit that no longer exists, so node-done re-points it first (D7). A map
  // in another repository is committed there, never here (decisions 0090, 0137).
  const rebaseHere = !moved || !campaign || facts.mapLocal;
  const push = r && !facts.pushed ? { label: `push ${b} to ${r}`, run: [`git push -u ${r} ${b}`], next: after } : null;
  let merge = null;
  if (d && dirty.length === 0 && rebaseHere) {
    const run = moved ? [`git rebase ${d}`] : [];
    if (moved && campaign) {
      const campaigns = join(facts.pluginRoot, 'scripts', 'campaigns.mjs');
      run.push(`node "${campaigns}" node-done ${map} ${nodeName} --sha HEAD~1`, `git add .claude/hodos/campaigns/${map}.md`, 'git commit -m "{subject}"');
    }
    run.push(`git switch ${d}`, `git merge --ff-only ${b}`);
    if (r) run.push(`git push ${r} ${d}`);
    const label = moved
      ? r ? `rebase onto ${d}, land and push it` : `rebase onto ${d} and merge`
      : r ? `land on ${d} and push it` : `merge into ${d}`;
    merge = { label, run, next: after };
  }
  const elsewhere = facts.mapRepo ?? 'another repository';
  const notes = [];
  if (dirty.length) notes.push(`uncommitted changes in ${named(dirty)} — merging needs a clean tree`);
  if (!d) notes.push('no default branch found');
  if (!rebaseHere) notes.push(`${d} moved past ${b} and the map lives in ${elsewhere} — rebase by hand, then node-done`);
  const blocked = dirty.length
    ? `commit or stash ${named(dirty)}, then /hodos:run ${slug}`
    : !d
      ? words
      : `rebase ${b} onto ${d} by hand, then node-done in ${elsewhere}`;
  const order = facts.land === 'default' ? [merge, push] : [push, merge];
  return ask(order.filter(Boolean), notes, blocked);
}

/**
 * `{ next, land }` for `/hodos:handoff`'s file: commit it, push the branch, or
 * leave both. The commit names its path, so work already staged on an
 * unfinished task is not swept into it (fact 74).
 */
function handing(state, facts) {
  const { slug, branch: b } = state;
  const file = facts.handoff;
  const r = facts.remote;
  const there = `/hodos:run ${slug} on the other machine`;
  if (!facts.repo || !b) return { next: there, land: null };
  if (facts.head !== b) {
    const words = `git switch ${b}, then /hodos:handoff ${slug}`;
    return { next: words, land: question([], [`HEAD is ${facts.head ?? 'detached'}, not ${b}`], words) };
  }
  const run = [`git add ${file}`, `git commit -m "{subject}" -- ${file}`];
  const pushLater = r ? `git push -u ${r} ${b}` : facts.remotes ? `push ${b} to its remote` : `push ${b}`;
  const commit = { label: 'commit', run, next: `${pushLater}, then ${there}` };
  const options = r ? [{ label: 'commit and push', run: [...run, `git push -u ${r} ${b}`], next: there }, commit] : [commit];
  const notes = facts.remotes && !r ? ['no remote git would push to — set remote.pushDefault'] : [];
  return { next: there, land: question(options, notes, options[0].run.join(' && ')) };
}

/** stdout of a git read, or null for any non-zero exit (PLATFORM-NOTES.md fact 68). */
function gitRead(cwd, args) {
  try {
    return execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] });
  } catch {
    return null;
  }
}

/** Whether `plan.md`'s `## Open questions` holds anything but blank lines. */
function openQuestionsIn(planFile) {
  let text;
  try {
    text = readFileSync(planFile, 'utf8');
  } catch {
    return false;
  }
  const m = /^## Open questions[ \t]*\n([\s\S]*?)(?=^## |(?![\s\S]))/m.exec(text);
  return m !== null && m[1].trim() !== '';
}

/** The plugin's own root: the node-done a land option runs is this checkout's. */
const PLUGIN_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/**
 * The branch a landing goes to (decision 0197): the one `<remote>/HEAD` names,
 * when a local branch carries it, and otherwise `init.defaultBranch`, main,
 * then master, each only when it exists here.
 */
function defaultOf(read, remote, heads) {
  if (remote) {
    // Only a clone or `remote set-head` writes `<remote>/HEAD` (fact 72).
    const named = read(['symbolic-ref', '--short', `refs/remotes/${remote}/HEAD`])?.trim();
    const name = named?.startsWith(`${remote}/`) ? named.slice(remote.length + 1) : null;
    if (heads.has(name)) return name;
  }
  // An unset `init.defaultBranch` exits 1 (fact 68), and main, then master, follow.
  const configured = read(['config', 'init.defaultBranch'])?.trim();
  return [configured, 'main', 'master'].find((name) => heads.has(name)) ?? null;
}

/**
 * What `nextStep` reads from the task directory, its ledger and git. Git is
 * read only for a `done` answer, and `git: false` skips it there too: the
 * digest lists no finished task and spawns nothing per row. The reads stop at
 * the first row of the landing table they settle, so a fact a later row needs
 * keeps its default where an earlier row already answered.
 */
export function nextFacts(taskDir, state, { done = false, git = true, handoff = null } = {}, { gitRead: read = gitRead } = {}) {
  const { events } = readLedger(taskDir);
  const facts = {
    brief: existsSync(join(taskDir, 'brief.md')),
    research: existsSync(join(taskDir, 'research.md')),
    plan: existsSync(join(taskDir, 'plan.md')),
    openQuestions: openQuestionsIn(join(taskDir, 'plan.md')),
    rerouted: events.some((e) => e.startsWith('Ruling: not reproducible here — ')),
    upgradedFromInert: events.some((e) => e.startsWith('Upgrade: inert→')),
    remote: null,
    remotes: 0,
    defaultBranch: null,
    done,
    handoff,
    repo: false,
    branchExists: false,
    head: null,
    dirty: [],
    ffable: false,
    merged: false,
    pushed: false,
    defaultAhead: 0,
    land: null,
    mapLocal: false,
    mapRepo: null,
    pluginRoot: PLUGIN_ROOT,
  };
  if (!git || !(done || handoff || state.phase === 'done')) return facts;
  const at = (args) => read(taskDir, args);

  // No remote prints nothing and exits 0 (fact 54); outside a repository it
  // exits 128 (fact 68), and nothing else is read.
  const listed = at(['remote']);
  if (listed === null) return facts;
  facts.repo = true;
  const remotes = listed.split('\n').map((name) => name.trim()).filter((name) => name !== '');
  facts.remotes = remotes.length;
  if (remotes.length) {
    // `git remote` sorts the names, so the remote is the one git pushes a new
    // branch to: `remote.pushDefault`, then origin, then the only one (fact 68).
    const pushDefault = at(['config', 'remote.pushDefault'])?.trim();
    facts.remote = pushDefault || (remotes.includes('origin') ? 'origin' : remotes.length === 1 ? remotes[0] : null);
  }
  const b = state.branch;
  if (!b) return facts;
  // Detached, `symbolic-ref -q` exits 1 (fact 72).
  facts.head = at(['symbolic-ref', '--short', '-q', 'HEAD'])?.trim() ?? null;
  if (handoff) return facts;
  // One read lists the local branches, which the default's chain and the
  // branch itself are looked up in, so the call stays at ten reads (fact 72).
  const heads = new Set(
    (at(['for-each-ref', '--format=%(refname)', 'refs/heads']) ?? '')
      .split('\n')
      .filter((ref) => ref.startsWith('refs/heads/'))
      .map((ref) => ref.slice('refs/heads/'.length)),
  );
  facts.branchExists = heads.has(b);
  if (!facts.branchExists) return facts;
  const root = resolve(taskDir, '..', '..', '..', '..');
  const found = findConfig(root);
  facts.land = found.config?.conventions?.land ?? null;
  facts.defaultBranch = defaultOf(at, facts.remote, heads);
  const d = facts.defaultBranch;
  if (state.type === 'spike') return facts;

  // `merge-base --is-ancestor` exits 0 for yes and 1 for no (fact 72).
  const isAncestor = (a, z) => at(['merge-base', '--is-ancestor', a, z]) !== null;
  // `rev-list --count` over a ref that is not there exits 128 (fact 72).
  const ahead = (range) => at(['rev-list', '--count', range])?.trim() ?? null;
  if (d) facts.merged = isAncestor(b, d);
  if (facts.merged) {
    if (facts.remote) facts.defaultAhead = Number(ahead(`${facts.remote}/${d}..${d}`) ?? 1);
    return facts;
  }
  if (facts.head !== b || (facts.remotes && !facts.remote)) return facts;

  // Tracked changes only, each path from the repository root and a rename's
  // new name (fact 72): an untracked file blocks neither switch nor rebase.
  const status = at(['status', '--porcelain', '--untracked-files=no']) ?? '';
  facts.dirty = status.split('\n').filter((line) => line !== '').map((line) => line.slice(3).split(' -> ').at(-1));
  if (d) facts.ffable = isAncestor(d, b);
  if (facts.remote) facts.pushed = ahead(`${facts.remote}/${b}..${b}`) === '0';
  if (state.campaign) {
    const map = state.campaign.split('/')[0];
    facts.mapLocal = existsSync(join(root, '.claude', 'hodos', 'campaigns', `${map}.md`));
    if (!facts.mapLocal && d && !facts.ffable) {
      const entry = findMaps(root, found.config ?? {}).find((m) => m.slug === map);
      facts.mapRepo = entry ? basename(entry.root) : null;
    }
  }
  return facts;
}

/** Rule W: the most recently touched task neither done nor manual, or null. */
export function latestTask(projectRoot) {
  const tasksDir = join(hodosDir(projectRoot), 'tasks');
  let names;
  try {
    names = readdirSync(tasksDir);
  } catch {
    return null;
  }
  let latest = null;
  for (const name of names) {
    let state;
    try {
      state = JSON.parse(readFileSync(join(tasksDir, name, 'state.json'), 'utf8'));
    } catch {
      continue; // no state is no task in flight
    }
    if (state.phase === 'done' || state.phase === 'manual') continue;
    if (!latest || state.updatedAt > latest.updatedAt) latest = { slug: name, updatedAt: state.updatedAt };
  }
  return latest?.slug ?? null;
}

/** Options that take no value; everything else needs one. */
const BOOLEAN_OPTIONS = new Set(['done', 'gc', 'handoff', 'inert']);
/** Per command, a boolean elsewhere that takes a value here: `next --handoff <file>` (decision 0197). */
const VALUED = { next: new Set(['handoff']) };

function parseOptions(argv, command) {
  const valued = VALUED[command] ?? new Set();
  const options = {};
  const rest = [];
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') return { help: true };
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      if (BOOLEAN_OPTIONS.has(key) && !valued.has(key)) {
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


// --- claiming a task (decisions 0047, 0171)
//
// `.claude/hodos/active` is one pointer per project, and two terminals on one
// repository is the normal mode: with one pointer, the loser of the race gets
// another task's ledger line, Stop block or denied commit, silently. The
// pointer is per session, and `active` is the path of a claim made with no
// id — written only by one, and read only while no session holds a pointer
// (config.mjs, `resolveTask`). That isolates hodos's own state and not the git
// working tree the terminals share (DESIGN.md §5.1).

function claimFor(projectRoot, slug) {
  const dir = hodosDir(projectRoot);
  const session = sessionOf();
  // `active` is written only by a claim that has no id to key a pointer by:
  // written by every claim, it named whoever claimed last, and a session with
  // no pointer of its own read a stranger's task through it (decision 0171).
  if (!session) {
    writeAtomic(join(dir, 'active'), `${slug}\n`);
    return;
  }
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
  const taskDir = join(hodosDir(projectRoot), 'tasks', slug);
  if (!existsSync(taskDir)) return { code: 1, err: `ledger: ${slug} has no task directory` };
  // S2 starts clean, so never in the session that approved the plan: `/clear`
  // starts a new id (PLATFORM-NOTES.md fact 65) and the id is the session's
  // own (fact 37), so an equal one is S1's context still open, resumed or not.
  // With no id there is nothing to compare, and the claim goes ahead as a
  // typed command always did (decision 0190). An unreadable ledger throws
  // here, before any pointer is written (decision 0101).
  const session = sessionOf();
  const { events, stamps } = readLedger(taskDir);
  if (session && session === deriveState(events, stamps, { slug }).planSession) {
    return { code: 1, err: `ledger: ${slug} was planned in this session — /clear, then /hodos:run ${slug}` };
  }
  claimFor(projectRoot, slug);
  return { code: 0, out: slug };
}

/** `next [<slug>] [--done | --handoff <file>]`: one JSON line naming what continues the task, and no write (decision 0192). */
function cmdNext(options, rest, projectRoot) {
  if (options.done && options.handoff) return { code: 2, err: `ledger: next takes --done or --handoff <file>, not both\n${USAGE}` };
  let slug = rest[0];
  if (!slug) {
    if (options.done || options.handoff) {
      return { code: 2, err: `ledger: next ${options.done ? '--done' : '--handoff'} needs a slug\n${USAGE}` };
    }
    slug = latestTask(projectRoot);
    if (!slug) return { code: 0, out: JSON.stringify({ slug: null, ...nextStep(null) }) };
  }
  const taskDir = join(hodosDir(projectRoot), 'tasks', slug);
  if (!existsSync(taskDir)) return { code: 1, err: `ledger: no task ${slug}` };
  const { events, stamps } = readLedger(taskDir);
  const state = deriveState(events, stamps, seedOf(taskDir, { slug }));
  const step = nextStep(state, nextFacts(taskDir, state, { done: options.done === true, handoff: options.handoff ?? null }));
  return { code: 0, out: JSON.stringify({ slug, ...step }) };
}

function cmdInit(options, rest, projectRoot) {
  const raw = rest[0];
  if (!raw) return { code: 2, err: `ledger: init needs a slug\n${USAGE}` };
  if (!PATHS.includes(options.path)) return { code: 1, err: `ledger: --path must be one of ${PATHS.join(', ')}` };
  if (!TYPES.includes(options.type)) return { code: 1, err: `ledger: --type must be one of ${TYPES.join(', ')}` };
  if (options.shape !== undefined) {
    const refusal = shapeRefusal(options.path, options.type, options.shape);
    if (refusal) return { code: 1, err: `ledger: ${refusal}` };
  }
  if (options.chat !== undefined && !/^[a-z]{2}$/.test(options.chat)) {
    return { code: 1, err: 'ledger: --chat must be two lowercase letters, as config.language is' };
  }

  const base = normalizeSlug(raw);
  if (base === '') return { code: 1, err: `ledger: "${raw}" normalizes to an empty slug` };

  const tasksDir = join(hodosDir(projectRoot), 'tasks');
  let slug = base;
  for (let n = 2; existsSync(join(tasksDir, slug)); n += 1) slug = `${base}-${n}`;

  const taskDir = join(tasksDir, slug);
  mkdirSync(taskDir, { recursive: true });
  claimFor(projectRoot, slug);
  const shape = options.shape ? ` ${options.shape}` : '';
  append(taskDir, `Init: ${options.path} ${options.type}${shape}`, {
    slug,
    path: options.path,
    type: options.type,
    shape: options.shape ?? null,
    campaign: options.campaign ?? null,
    chat: options.chat ?? null,
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
  if (options.handoff && rule.id !== 'plan-approved') {
    return { code: 1, err: 'ledger: --handoff belongs to "Plan: approved" only' };
  }

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
  const invalid = rule.check?.(m, options);
  if (invalid) return { code: 1, err: `ledger: ${invalid}` };
  const unratcheted = rule.id === 'upgrade' || rule.id === 'route' ? ratchetRefusal(taskDir, rule.id, m) : null;
  if (unratcheted) return { code: 1, err: `ledger: ${unratcheted}` };

  if (rule.id === 'task-done') {
    const refusal = options.inert ? inertRefusal(taskDir, m[1], options) : testFirstRefusal(taskDir, m[1], options.tests);
    if (refusal) return { code: 1, err: `ledger: ${refusal}` };
  }
  if (rule.id === 'task-blocked') {
    const refusal = blockedRefusal(taskDir, m[1]);
    if (refusal) return { code: 1, err: `ledger: ${refusal}` };
  }
  if (rule.id === 'fix-green') {
    const refusal = greenRefusal(taskDir, m[1]);
    if (refusal) return { code: 1, err: `ledger: ${refusal}` };
  }

  const ctx = {
    headSha: () =>
      execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: projectRoot, encoding: 'utf8' }).trim(),
    session: sessionOf,
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
      // Only where there is one, so a line for a task with no shape is the line
      // it always was (decision 0183).
      ...(state.shape ? { shape: state.shape } : {}),
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
  const parsed = parseOptions(argv.slice(1), argv[0]);
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h' || parsed.help) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (parsed.error) {
    process.stderr.write(`ledger: ${parsed.error}\n${USAGE}\n`);
    return 2;
  }
  const command = argv[0];
  if (!['init', 'add', 'claim', 'sessions', 'next'].includes(command)) {
    process.stderr.write(`ledger: unknown command: ${command}\n${USAGE}\n`);
    return 2;
  }

  const found = findConfig(process.cwd());
  if (found.notFound) return 0; // silent: the plugin is enabled in projects that never ran init

  const commands = { init: cmdInit, add: cmdAdd, claim: cmdClaim, sessions: cmdSessions, next: cmdNext };
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
