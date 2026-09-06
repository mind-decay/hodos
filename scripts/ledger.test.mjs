// Task directories are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, existsSync, realpathSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { deriveState, normalizeSlug, eventOf } from './ledger.mjs';

const LEDGER = fileURLToPath(new URL('./ledger.mjs', import.meta.url));

/** A project with a config and a git repository — `Plan: approved` reads HEAD. */
function project() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-ledger-')));
  mkdirSync(join(root, '.claude', 'hodos'), { recursive: true });
  writeFileSync(join(root, '.claude', 'hodos', 'config.json'), JSON.stringify({ version: 1 }));
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q');
  git('-c', 'user.email=t@example.com', '-c', 'user.name=t', 'commit', '--allow-empty', '-q', '-m', 'base');
  return root;
}

// Without a session id every reader takes the `active` path, which is what a
// machine that cannot see CLAUDE_CODE_SESSION_ID does (decision 0047). The
// default run asserts exactly that; runAs asserts the pointer path.
const withoutSession = () => {
  const env = { ...process.env };
  delete env.CLAUDE_CODE_SESSION_ID;
  return env;
};

const run = (root, ...args) =>
  spawnSync(process.execPath, [LEDGER, ...args], { cwd: root, encoding: 'utf8', env: withoutSession() });

const runAs = (root, session, ...args) =>
  spawnSync(process.execPath, [LEDGER, ...args], {
    cwd: root,
    encoding: 'utf8',
    env: { ...withoutSession(), CLAUDE_CODE_SESSION_ID: session },
  });

/** Like runAs, with HOME pointed at a fake ~/.claude/projects. */
const runIn = (root, home, session, ...args) =>
  spawnSync(process.execPath, [LEDGER, ...args], {
    cwd: root,
    encoding: 'utf8',
    // `homedir()` reads USERPROFILE on Windows and HOME elsewhere; a test
    // that redirects one of them redirects the home on one platform only.
    env: { ...withoutSession(), CLAUDE_CODE_SESSION_ID: session, HOME: home, USERPROFILE: home, CLAUDE_CONFIG_DIR: '' },
  });

/** A fake home holding one transcript line per session id given. */
function transcripts(sessions) {
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-home-')));
  const dir = join(home, '.claude', 'projects', '-Users-someone-repo');
  mkdirSync(dir, { recursive: true });
  for (const [session, usage] of Object.entries(sessions)) {
    const line = JSON.stringify({
      type: 'assistant',
      message: { id: `msg_${session}`, usage: { input_tokens: usage, output_tokens: 1 } },
    });
    writeFileSync(join(dir, `${session}.jsonl`), `${line}\n`);
  }
  return home;
}

const history = (root) =>
  readFileSync(join(root, '.claude/hodos/history.jsonl'), 'utf8')
    .split('\n')
    .filter((l) => l !== '')
    .map((l) => JSON.parse(l));

const pointer = (root, session) => join(root, '.claude/hodos/sessions', session);

const ledgerLines = (root, slug) =>
  readFileSync(join(root, '.claude/hodos/tasks', slug, 'ledger.md'), 'utf8')
    .split('\n')
    .filter((l) => l !== '');

const readState = (root, slug) =>
  JSON.parse(readFileSync(join(root, '.claude/hodos/tasks', slug, 'state.json'), 'utf8'));

/** Start a task and return the project root; the slug is `orders-summary`. */
function started(root = project()) {
  const init = run(root, 'init', 'Orders Summary!', '--path', 'standard', '--type', 'feature');
  assert.equal(init.status, 0, init.stderr);
  return root;
}

test('init normalizes the slug, writes active, and records Init', () => {
  const root = project();
  const out = run(root, 'init', 'Orders Summary!', '--path', 'standard', '--type', 'feature');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout.trim(), 'orders-summary');
  assert.equal(readFileSync(join(root, '.claude/hodos/active'), 'utf8').trim(), 'orders-summary');
  assert.deepEqual(ledgerLines(root, 'orders-summary').map(eventOf), ['Init: standard feature']);

  const state = readState(root, 'orders-summary');
  assert.equal(state.slug, 'orders-summary');
  assert.equal(state.phase, 'plan');
  assert.equal(state.path, 'standard');
  assert.equal(state.type, 'feature');
  assert.equal(state.campaign, null);
});

test('init accepts the two types decision 0081 adds, and still rejects a non-type', () => {
  const root = project();
  const spike = run(root, 'init', 'worth-a-worker', '--path', 'standard', '--type', 'spike');
  assert.equal(spike.status, 0, spike.stderr);
  assert.deepEqual(ledgerLines(root, 'worth-a-worker').map(eventOf), ['Init: standard spike']);
  assert.equal(readState(root, 'worth-a-worker').type, 'spike');

  const upgrade = run(root, 'init', 'react-19', '--path', 'deep', '--type', 'upgrade');
  assert.equal(upgrade.status, 0, upgrade.stderr);
  assert.equal(readState(root, 'react-19').type, 'upgrade');

  // A Route: line — the only other place a type is parsed — takes them too.
  assert.equal(run(root, 'add', 'Route: deep upgrade', '--slug', 'react-19').status, 0);

  const bad = run(root, 'init', 'nonsense', '--path', 'quick', '--type', 'chore');
  assert.equal(bad.status, 1);
  assert.match(bad.stderr, /spike/);
});

test('init de-duplicates to -2 and points active at the new task', () => {
  const root = started();
  const second = run(root, 'init', 'Orders Summary!', '--path', 'quick', '--type', 'bug');

  assert.equal(second.stdout.trim(), 'orders-summary-2');
  assert.equal(readFileSync(join(root, '.claude/hodos/active'), 'utf8').trim(), 'orders-summary-2');
  assert.equal(readState(root, 'orders-summary-2').path, 'quick');
});

test('init records a campaign node', () => {
  const root = project();
  run(root, 'init', 'state migration step 1', '--path', 'deep', '--type', 'refactor', '--campaign', 'state-migration/n2');

  assert.equal(readState(root, 'state-migration-step-1').campaign, 'state-migration/n2');
});

test('normalizeSlug is kebab ASCII, capped at 40 characters', () => {
  assert.equal(normalizeSlug('Orders Summary!'), 'orders-summary');
  assert.equal(normalizeSlug('  --Fix: the CACHE bug  '), 'fix-the-cache-bug');
  assert.equal(normalizeSlug('добавить виджет'), '');
  assert.equal(normalizeSlug('a'.repeat(60)).length, 40);
  assert.equal(normalizeSlug(`${'b'.repeat(39)} tail`), 'b'.repeat(39), 'a trailing dash from the cut is trimmed');
});

test('every CLI form of FORMATS.md §6 is accepted and stored in its stored form', () => {
  const root = started();
  const sha = 'd4e5f6a';
  const rows = [
    [['Route: deep feature'], 'Route: deep feature'],
    [['Plan: approved', '--tasks', '2', '--branch', 'feature/orders-summary'], /^Plan: approved \([0-9a-f]{7,}, 2 tasks, feature\/orders-summary\)$/],
    [['Task 1: started'], 'Task 1: started'],
    [['Task 1: red-check attempt 1/3 — vitest cannot see the fixture'], 'Task 1: red-check attempt 1/3 — vitest cannot see the fixture'],
    [['Task 1: test red'], 'Task 1: test red'],
    [['Task 1: done', '--sha', sha], `Task 1: done (${sha})`],
    [['Ruling: use the existing http wrapper — precedent in src/api — a second client if wrong'], null],
    // A spike's exit rides in the answer segment because the grammar is closed at three
    // (decision 0084). Tightening the middle group would silently drop the exit, which is
    // the only record of what happened to the code once the task directory is gone.
    [['Ruling: spike windowing beats plain at 1000 — yes, branch deleted — the follow-up is grilled and closed if wrong'], null],
    [['Gap: the plan named no error shape — reused ApiError'], null],
    [['Upgrade: standard→deep — the schema changes after all'], null],
    [['Simplify: done', '--sha', sha, '--net', '12'], `Simplify: done (${sha}, net -12)`],
    [['Review 1: NEEDS_WORK 0/2/1'], 'Review 1: NEEDS_WORK (0/2/1)'],
    [['Fix 1: done', '--sha', sha], `Fix 1: done (${sha})`],
    [['Review 2: ACCEPT 0/0/1'], 'Review 2: ACCEPT (0/0/1)'],
    [['Verify 1: PASS 4 claims, 1 skipped'], 'Verify 1: PASS 4 claims, 1 skipped'],
    [['Verify 2: FAIL 4 claims, 0 skipped'], 'Verify 2: FAIL 4 claims, 0 skipped'],
    [['Breaker: verify — accept'], 'Breaker: verify — accept'],
    [['Compact: session compacted'], null],
    [['Finish: report delivered'], null],
  ];

  for (const [args, expected] of rows) {
    const out = run(root, 'add', ...args);
    assert.equal(out.status, 0, `${args[0]}: ${out.stderr}`);
    const stored = out.stdout.trim();
    if (expected instanceof RegExp) assert.match(stored, expected);
    else assert.equal(stored, expected ?? args[0]);
    assert.equal(eventOf(ledgerLines(root, 'orders-summary').at(-1)), stored);
  }

  for (const line of ledgerLines(root, 'orders-summary')) {
    assert.match(line, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z /, 'every line carries an ISO-8601 timestamp');
  }
});

test('Task done is refused when the task has no red phase and claims no exemption', () => {
  const root = started();
  run(root, 'add', 'Task 1: started');
  const out = run(root, 'add', 'Task 1: done', '--sha', 'd4e5f6a');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /Task 1: test red/, 'the refusal names the missing line');
  assert.match(out.stderr, /--tests/, 'and the exemption flag');
  assert.equal(ledgerLines(root, 'orders-summary').length, 2, 'nothing is appended');
});

test('the red phase of one task does not cover another task', () => {
  const root = started();
  run(root, 'add', 'Task 1: started');
  run(root, 'add', 'Task 1: test red');
  run(root, 'add', 'Task 1: done', '--sha', 'aaaaaaa');
  run(root, 'add', 'Task 2: started');
  const out = run(root, 'add', 'Task 2: done', '--sha', 'bbbbbbb');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /Task 2: test red/);
});

test('--tests names one of the four exemptions and is stored with the sha', () => {
  const root = started();
  run(root, 'add', 'Task 1: started');
  const out = run(root, 'add', 'Task 1: done', '--sha', 'd4e5f6a', '--tests', 'visual');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout.trim(), 'Task 1: done (d4e5f6a, tests: visual)');
  assert.equal(readState(root, 'orders-summary').lastCommit, 'd4e5f6a', 'the sha is still the sha');
});

test('an exemption outside the closed list is rejected', () => {
  const root = started();
  run(root, 'add', 'Task 1: started');
  const out = run(root, 'add', 'Task 1: done', '--sha', 'd4e5f6a', '--tests', 'ui glue');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /visual\|glue\|infra\|no-harness|visual, glue, infra, no-harness/);
  assert.equal(ledgerLines(root, 'orders-summary').length, 2);
});

test('a count option is a count: --net -2 and --tasks 1.5 are refused', () => {
  // Found on the first Stage 5 run: `--net -2` wrote `Simplify: done (sha,
  // net --2)`, which the deriver's own `net -(\d+)` cannot match, so the phase
  // never moved to review and the append-only ledger kept an inert line.
  const root = started();
  const sha = 'd4e5f6a';
  for (const bad of ['-2', '1.5', 'two', '']) {
    const out = run(root, 'add', 'Simplify: done', '--sha', sha, '--net', bad);
    assert.equal(out.status, 1, `--net ${JSON.stringify(bad)} was accepted`);
    assert.match(out.stderr, /--net/);
  }
  const tasks = run(root, 'add', 'Plan: approved', '--tasks', '-1', '--branch', 'feature/x');
  assert.equal(tasks.status, 1);
  assert.match(tasks.stderr, /--tasks/);

  const ledger = readFileSync(join(root, '.claude/hodos/tasks/orders-summary/ledger.md'), 'utf8');
  assert.doesNotMatch(ledger, /net --/);
  assert.equal(run(root, 'add', 'Simplify: done', '--sha', sha, '--net', '0').status, 0);
  assert.match(
    readFileSync(join(root, '.claude/hodos/tasks/orders-summary/ledger.md'), 'utf8'),
    new RegExp(`Simplify: done \\(${sha}, net -0\\)`),
  );
});

test('the bound is in the grammar: a fourth red-check attempt is rejected', () => {
  // Decision 0035 rests on this: the three-attempt bound of DESIGN.md §4.5 is
  // enforced by the line the kernel has to write, not only by the reference
  // that tells it to stop.
  const root = started();
  for (const k of [1, 2, 3]) {
    assert.equal(run(root, 'add', `Task 1: red-check attempt ${k}/3 — still red`).status, 0);
  }
  const fourth = run(root, 'add', 'Task 1: red-check attempt 4/3 — one more try');
  assert.equal(fourth.status, 1);
  assert.match(fourth.stderr, /line rejected/);
  assert.equal(derive(
    'Task 1: started',
    'Task 1: red-check attempt 1/3 — red',
    'Task 1: red-check attempt 2/3 — red',
    'Task 1: red-check attempt 3/3 — red',
  ).redCheckAttempts, 3);
});

test('a malformed line exits 1 and prints the grammar', () => {
  const root = started();
  const out = run(root, 'add', 'Task one is finished');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /line rejected: Task one is finished/);
  assert.match(out.stderr, /Ledger grammar \(FORMATS\.md §6\)/);
  assert.equal(ledgerLines(root, 'orders-summary').length, 1, 'nothing is appended');
});

test('a line whose script part has no option exits 1 and appends nothing', () => {
  const root = started();
  const out = run(root, 'add', 'Task 1: done');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /needs --sha/);
  assert.equal(ledgerLines(root, 'orders-summary').length, 1);
});

test('a downgrade is rejected: the ratchet is one-way', () => {
  const root = started();
  const out = run(root, 'add', 'Upgrade: deep→quick — it looked smaller');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /one way/);
});

test('--slug writes to a task that is not the active one', () => {
  const root = started();
  run(root, 'init', 'second task', '--path', 'quick', '--type', 'bug');
  const out = run(root, 'add', 'Task 1: started', '--slug', 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(readState(root, 'orders-summary').phase, 'execute');
  assert.equal(readState(root, 'second-task').phase, 'plan');
});

test('with no config the script is silent and exits 0 — hooks rely on this', () => {
  const bare = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-bare-')));
  const out = run(bare, 'add', 'Compact: session compacted');

  assert.equal(out.status, 0);
  assert.equal(out.stdout, '');
  assert.equal(out.stderr, '');
});

test('with a config but no active task, add says so and exits 0', () => {
  const root = project();
  const out = run(root, 'add', 'Compact: session compacted');

  assert.equal(out.status, 0);
  assert.equal(out.stdout, '');
  assert.match(out.stderr, /no active task/);
});

test('Finish appends history.jsonl and removes active', () => {
  const root = started();
  run(root, 'add', 'Plan: approved', '--tasks', '1', '--branch', 'feature/orders-summary');
  run(root, 'add', 'Gap: the plan named no error shape — reused ApiError');
  run(root, 'add', 'Upgrade: standard→deep — the schema changes after all');
  run(root, 'add', 'Review 1: ACCEPT 0/0/0');
  run(root, 'add', 'Verify 1: PASS 3 claims, 0 skipped');
  const out = run(root, 'add', 'Finish: report delivered');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(existsSync(join(root, '.claude/hodos/active')), false);
  const history = JSON.parse(readFileSync(join(root, '.claude/hodos/history.jsonl'), 'utf8').trim());
  assert.equal(history.slug, 'orders-summary');
  assert.equal(history.path, 'deep');
  assert.equal(history.type, 'feature');
  assert.equal(history.upgrades, 1);
  assert.equal(history.gaps, 1);
  assert.equal(history.reviewIterations, 1);
  assert.equal(history.verifyIterations, 1);
  assert.match(history.finishedAt, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(readState(root, 'orders-summary').phase, 'done');
});

test('--help exits 0 with the grammar', () => {
  const out = spawnSync(process.execPath, [LEDGER, '--help'], { encoding: 'utf8' });

  assert.equal(out.status, 0);
  assert.match(out.stdout, /Usage: node scripts\/ledger\.mjs/);
  assert.match(out.stdout, /Ledger grammar/);
});

test('an unknown command exits 2', () => {
  const out = spawnSync(process.execPath, [LEDGER, 'append'], { encoding: 'utf8' });
  assert.equal(out.status, 2);
});

// --- state.json derivation: one case per row of the FORMATS.md §6 phase column ---

const SEED = { slug: 'orders-summary', path: 'standard', type: 'feature', campaign: null };
const stamps = (n) => Array.from({ length: n }, (_, i) => `2026-08-31T10:0${i}:00Z`);
const derive = (...events) => deriveState(events, stamps(events.length), SEED);

test('phase after each row of the §6 table', () => {
  const base = ['Init: standard feature'];
  const rows = [
    [['Init: standard feature'], 'plan'],
    [[...base, 'Route: deep feature'], 'plan'],
    [[...base, 'Plan: approved (a1b2c3d, 2 tasks, feature/x)'], 'approved'],
    [[...base, 'Task 1: started'], 'execute'],
    [[...base, 'Task 1: done (d4e5f6a)'], 'execute'],
    [[...base, 'Task 1: red-check attempt 2/3 — still red'], 'execute'],
    [[...base, 'Task 1: started', 'Ruling: a — b — c'], 'execute'],
    [[...base, 'Task 1: started', 'Gap: a — b'], 'execute'],
    [[...base, 'Task 1: started', 'Upgrade: standard→deep — schema'], 'execute'],
    [[...base, 'Simplify: done (d4e5f6a, net -12)'], 'review'],
    [[...base, 'Review 1: ACCEPT (0/0/1)'], 'verify'],
    [[...base, 'Review 1: NEEDS_WORK (0/2/1)'], 'fix'],
    [[...base, 'Review 1: REJECT (1/0/0)'], 'fix'],
    [[...base, 'Verify 1: PASS 4 claims, 1 skipped'], 'finish'],
    [[...base, 'Verify 1: FAIL 4 claims, 0 skipped'], 'fix'],
    [[...base, 'Task 1: started', 'Compact: session compacted'], 'execute'],
    [[...base, 'Finish: report delivered'], 'done'],
  ];

  for (const [events, phase] of rows) {
    assert.equal(derive(...events).phase, phase, events.at(-1));
  }
});

test('Fix k: done returns to review after a review and to verify after a verify', () => {
  const afterReview = derive('Review 1: NEEDS_WORK (0/2/0)', 'Fix 1: done (d4e5f6a)');
  const afterVerify = derive('Verify 1: FAIL 3 claims, 0 skipped', 'Fix 1: done (d4e5f6a)');

  assert.equal(afterReview.phase, 'review');
  assert.equal(afterVerify.phase, 'verify');
});

test('Breaker: accept continues as if the gate had passed', () => {
  assert.equal(derive('Review 2: NEEDS_WORK (0/1/0)', 'Breaker: review — accept').phase, 'verify');
  assert.equal(derive('Verify 2: FAIL 3 claims, 0 skipped', 'Breaker: verify — accept').phase, 'finish');
});

test('Breaker: manual parks the task', () => {
  assert.equal(derive('Review 2: REJECT (1/0/0)', 'Breaker: review — manual').phase, 'manual');
});

test('Breaker: rollback returns to execute at the named task', () => {
  const state = derive(
    'Plan: approved (a1b2c3d, 3 tasks, feature/x)',
    'Task 1: started',
    'Task 1: done (aaaaaaa)',
    'Task 2: started',
    'Task 2: done (bbbbbbb)',
    'Review 2: REJECT (1/0/0)',
    'Breaker: review — rollback T2',
  );

  assert.equal(state.phase, 'execute');
  assert.equal(state.tasks.current, 2);
  assert.equal(state.tasks.done, 0, 'the count restarts after the rollback');
});

test('tasks.current is the started task until it is done, then the next one', () => {
  const plan = 'Plan: approved (a1b2c3d, 2 tasks, feature/x)';
  assert.equal(derive(plan).tasks.current, 1);
  assert.equal(derive(plan, 'Task 1: started').tasks.current, 1);
  assert.equal(derive(plan, 'Task 1: started', 'Task 1: done (aaaaaaa)').tasks.current, 2);
  const exempt = derive(plan, 'Task 1: started', 'Task 1: done (aaaaaaa, tests: infra)');
  assert.equal(exempt.tasks.current, 2, 'an exempt task counts as done');
  assert.equal(exempt.lastCommit, 'aaaaaaa', 'and its sha is read past the exemption');

  const last = derive(plan, 'Task 1: done (aaaaaaa)', 'Task 2: done (bbbbbbb)');
  assert.equal(last.tasks.current, 2, 'capped at tasks.total');
  assert.equal(last.tasks.done, 2);
});

test('redCheckAttempts counts the current task and resets when it is done', () => {
  const events = ['Task 1: started', 'Task 1: red-check attempt 1/3 — red', 'Task 1: red-check attempt 2/3 — red'];
  assert.equal(derive(...events).redCheckAttempts, 2);
  assert.equal(derive(...events, 'Task 1: done (aaaaaaa)').redCheckAttempts, 0);
  assert.equal(derive(...events, 'Task 1: done (aaaaaaa)', 'Task 2: started').redCheckAttempts, 0);
});

test('the derived state carries branch, base, verdicts, last commit and last event', () => {
  const state = derive(
    'Init: standard feature',
    'Plan: approved (a1b2c3d, 2 tasks, feature/orders-summary)',
    'Task 1: done (d4e5f6a)',
    'Review 1: NEEDS_WORK (0/2/1)',
  );

  assert.equal(state.branch, 'feature/orders-summary');
  assert.equal(state.base, 'a1b2c3d');
  assert.equal(state.tasks.total, 2);
  assert.equal(state.lastCommit, 'd4e5f6a');
  assert.equal(state.review.iteration, 1);
  assert.equal(state.review.verdict, 'NEEDS_WORK');
  assert.equal(state.lastEvent, 'Review 1: NEEDS_WORK (0/2/1)');
  assert.equal(state.createdAt, '2026-08-31T10:00:00Z');
  assert.equal(state.updatedAt, '2026-08-31T10:03:00Z');
});

test('review and verify iterations count events, not the number written in the line', () => {
  const state = derive('Review 3: NEEDS_WORK (0/1/0)', 'Fix 3: done (aaaaaaa)', 'Review 4: ACCEPT (0/0/0)');

  assert.equal(state.review.iteration, 2, 'FORMATS.md §7: the iteration counts its events');
  assert.equal(state.review.verdict, 'ACCEPT');
});

test('Finish on another task leaves the session’s active task alone', () => {
  const root = started();
  run(root, 'init', 'second task', '--path', 'quick', '--type', 'bug');
  const out = run(root, 'add', 'Finish: report delivered', '--slug', 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(readFileSync(join(root, '.claude/hodos/active'), 'utf8').trim(), 'second-task');
  assert.match(readFileSync(join(root, '.claude/hodos/history.jsonl'), 'utf8'), /"slug":"orders-summary"/);
});

test('a rollback breaker restarts the review and verify counters with the task', () => {
  const before = [
    'Plan: approved (a1b2c3d, 2 tasks, feature/x)',
    'Task 1: done (aaaaaaa)',
    'Review 1: NEEDS_WORK (0/2/0)',
    'Fix 1: done (bbbbbbb)',
    'Review 2: NEEDS_WORK (0/1/0)',
    'Breaker: review — rollback T1',
  ];

  const atRollback = derive(...before);
  assert.equal(atRollback.review.iteration, 0, 'the spent budget belongs to the work that was rolled back');
  assert.equal(atRollback.review.verdict, null);
  assert.equal(atRollback.tasks.done, 0);

  const rebuilt = derive(...before, 'Task 1: started', 'Task 1: done (ccccccc)', 'Review 1: ACCEPT (0/0/0)');
  assert.equal(rebuilt.review.iteration, 1, 'rebuilt work is reviewed against a fresh bound (decision 0023)');
  assert.equal(rebuilt.review.verdict, 'ACCEPT');
  assert.equal(rebuilt.phase, 'verify');
});

// --- decision 0047: the active task is keyed by session, `active` is the fallback.

test('init writes the session pointer beside active', () => {
  const root = project();
  const out = runAs(root, 'sess-a', 'init', 'orders-summary', '--path', 'standard', '--type', 'feature');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(readFileSync(pointer(root, 'sess-a'), 'utf8').trim(), 'orders-summary');
  assert.equal(readFileSync(join(root, '.claude/hodos/active'), 'utf8').trim(), 'orders-summary');
});

test('init without a session id writes active alone', () => {
  const root = started();

  assert.equal(readFileSync(join(root, '.claude/hodos/active'), 'utf8').trim(), 'orders-summary');
  assert.equal(existsSync(join(root, '.claude/hodos/sessions')), false);
});

test('claim writes both pointers for a task that exists', () => {
  const root = started();
  const out = runAs(root, 'sess-b', 'claim', 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(readFileSync(pointer(root, 'sess-b'), 'utf8').trim(), 'orders-summary');
  assert.equal(readFileSync(join(root, '.claude/hodos/active'), 'utf8').trim(), 'orders-summary');
});

test('claim on a task that does not exist exits 1 and writes nothing', () => {
  const root = started();
  const out = runAs(root, 'sess-b', 'claim', 'no-such-task');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /no-such-task/);
  assert.equal(existsSync(pointer(root, 'sess-b')), false);
});

test('claim with no config exits 0 and says nothing was claimed', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-ledger-')));
  const out = runAs(root, 'sess-b', 'claim', 'orders-summary');

  assert.equal(out.status, 0);
});

test('add resolves the session pointer over active', () => {
  const root = started();
  assert.equal(run(root, 'init', 'users-export', '--path', 'quick', '--type', 'feature').status, 0);
  // `active` now names users-export; this session claims the other task.
  assert.equal(runAs(root, 'sess-a', 'claim', 'orders-summary').status, 0);
  // …and `active` follows the claim, so a second session takes users-export back.
  assert.equal(runAs(root, 'sess-b', 'claim', 'users-export').status, 0);

  assert.equal(runAs(root, 'sess-a', 'add', 'Task 1: started').status, 0);

  assert.deepEqual(ledgerLines(root, 'orders-summary').map(eventOf), ['Init: standard feature', 'Task 1: started']);
  assert.deepEqual(ledgerLines(root, 'users-export').map(eventOf), ['Init: quick feature']);
});

test('a session with no pointer falls back to active', () => {
  const root = started();
  assert.equal(runAs(root, 'sess-stranger', 'add', 'Task 1: started').status, 0);

  assert.deepEqual(ledgerLines(root, 'orders-summary').map(eventOf), ['Init: standard feature', 'Task 1: started']);
});

test('Finish removes every pointer naming the task, and active', () => {
  const root = started();
  assert.equal(runAs(root, 'sess-a', 'claim', 'orders-summary').status, 0);
  assert.equal(runAs(root, 'sess-b', 'claim', 'orders-summary').status, 0);

  assert.equal(runAs(root, 'sess-a', 'add', 'Finish: report delivered').status, 0);

  assert.equal(existsSync(pointer(root, 'sess-a')), false);
  assert.equal(existsSync(pointer(root, 'sess-b')), false);
  assert.equal(existsSync(join(root, '.claude/hodos/active')), false);
});

test('Finish leaves another task’s pointer alone', () => {
  const root = started();
  assert.equal(run(root, 'init', 'users-export', '--path', 'quick', '--type', 'feature').status, 0);
  assert.equal(runAs(root, 'sess-a', 'claim', 'orders-summary').status, 0);
  assert.equal(runAs(root, 'sess-b', 'claim', 'users-export').status, 0);

  assert.equal(runAs(root, 'sess-a', 'add', 'Finish: report delivered', '--slug', 'orders-summary').status, 0);

  assert.equal(existsSync(pointer(root, 'sess-a')), false);
  assert.equal(readFileSync(pointer(root, 'sess-b'), 'utf8').trim(), 'users-export');
});

// --- decision 0045: the finished task's token usage, from its sessions'
// transcripts. Nothing here prices a token.

test('Finish records the usage of every session that worked the task', () => {
  const root = started();
  const home = transcripts({ 'sess-a': 100, 'sess-b': 40 });
  assert.equal(runIn(root, home, 'sess-a', 'claim', 'orders-summary').status, 0);
  assert.equal(runIn(root, home, 'sess-b', 'claim', 'orders-summary').status, 0);

  assert.equal(runIn(root, home, 'sess-b', 'add', 'Finish: report delivered').status, 0);

  const [row] = history(root);
  assert.equal(row.usage.sessions, 2);
  assert.equal(row.usage.missing, 0);
  assert.equal(row.usage.input, 140);
});

test('Finish records usage null when no transcript can be read', () => {
  const root = started();
  const home = transcripts({});
  assert.equal(runIn(root, home, 'sess-a', 'claim', 'orders-summary').status, 0);

  assert.equal(runIn(root, home, 'sess-a', 'add', 'Finish: report delivered').status, 0);

  assert.equal(history(root)[0].usage, null);
});

// --- decision 0047: status garbage-collects the pointers.

test('sessions lists the pointers and their tasks', () => {
  const root = started();
  const home = transcripts({ 'sess-a': 1 });
  assert.equal(runIn(root, home, 'sess-a', 'claim', 'orders-summary').status, 0);

  const out = runIn(root, home, 'sess-a', 'sessions');

  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /sess-a orders-summary/);
});

test('sessions --gc removes a pointer whose task directory is gone', () => {
  const root = started();
  const home = transcripts({ 'sess-a': 1 });
  assert.equal(runIn(root, home, 'sess-a', 'claim', 'orders-summary').status, 0);
  rmSync(join(root, '.claude/hodos/tasks/orders-summary'), { recursive: true, force: true });

  const out = runIn(root, home, 'sess-a', 'sessions', '--gc');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(existsSync(pointer(root, 'sess-a')), false);
  assert.match(out.stdout, /no task directory/);
});

test('sessions --gc removes a pointer whose session transcript is gone', () => {
  const root = started();
  const home = transcripts({ 'sess-a': 1 });
  assert.equal(runIn(root, home, 'sess-a', 'claim', 'orders-summary').status, 0);
  assert.equal(runIn(root, home, 'sess-dead', 'claim', 'orders-summary').status, 0);

  const out = runIn(root, home, 'sess-a', 'sessions', '--gc');

  assert.equal(existsSync(pointer(root, 'sess-a')), true);
  assert.equal(existsSync(pointer(root, 'sess-dead')), false);
  assert.match(out.stdout, /sess-dead/);
});

test('sessions --gc keeps every pointer when it cannot see any transcript at all', () => {
  const root = started();
  const home = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-home-'))); // no .claude/projects
  assert.equal(runIn(root, home, 'sess-a', 'claim', 'orders-summary').status, 0);

  const out = runIn(root, home, 'sess-a', 'sessions', '--gc');

  assert.equal(existsSync(pointer(root, 'sess-a')), true);
  assert.match(out.stdout, /transcripts unreadable/);
});

test('sessions --gc collects a pointer that names no task, transcripts readable or not', () => {
  // Both arms: with the transcripts in reach the pointer looks live by every
  // other test, and without them no test but this one can call it dead.
  const homes = [transcripts({ 'sess-a': 1 }), realpathSync(mkdtempSync(join(tmpdir(), 'hodos-home-')))];
  for (const home of homes) {
    const root = started();
    assert.equal(runIn(root, home, 'sess-a', 'claim', 'orders-summary').status, 0);
    writeFileSync(pointer(root, 'sess-a'), '  \n'); // truncated by a crash: names nobody

    const out = runIn(root, home, 'sess-a', 'sessions', '--gc');

    assert.equal(existsSync(pointer(root, 'sess-a')), false, home);
    assert.match(out.stdout, /names no task/);
  }
});

// --- decision 0045: `usage` is the usage of the sessions that claimed the task.

test('Finish counts the sessions that claimed the task, not the one that names it', () => {
  const root = started();
  // Distinct counts: one session either way proves nothing about which one.
  const home = transcripts({ 'sess-a': 11, 'sess-x': 7 });
  assert.equal(runIn(root, home, 'sess-a', 'claim', 'orders-summary').status, 0);

  // sess-x never claimed it; it passes --slug, which is not the same as working it.
  const out = runIn(root, home, 'sess-x', 'add', 'Finish: report delivered', '--slug', 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(history(root)[0].usage.sessions, 1);
  assert.equal(history(root)[0].usage.input, 11, 'the claimant’s tokens, not the caller’s');
});

// --- decision 0046: the router override and the gap texts, both derived from
// lines the ledger already holds.

test('Finish records overrode from the Route line the developer’s change writes', () => {
  const root = started();
  assert.equal(run(root, 'add', 'Route: deep refactor').status, 0);

  assert.equal(run(root, 'add', 'Finish: report delivered').status, 0);

  assert.equal(history(root)[0].overrode, true);
});

test('a task whose path was never changed finishes with overrode false', () => {
  const root = started();

  assert.equal(run(root, 'add', 'Finish: report delivered').status, 0);

  assert.equal(history(root)[0].overrode, false);
});

test('Finish records the gap texts in ledger order, without the prefix', () => {
  const root = started();
  assert.equal(run(root, 'add', 'Gap: no cache policy — TTL 60s, ruled here').status, 0);
  assert.equal(run(root, 'add', 'Gap: no error copy — reused the list empty state').status, 0);

  assert.equal(run(root, 'add', 'Finish: report delivered').status, 0);

  const [row] = history(root);
  assert.equal(row.gaps, 2);
  assert.deepEqual(row.gapTexts, [
    'no cache policy — TTL 60s, ruled here',
    'no error copy — reused the list empty state',
  ]);
});

// --- decision 0101: the two ways the one writer loses the state a resume trusts

test('state.json is replaced by a rename, not truncated in place', () => {
  const root = started();
  const state = join(root, '.claude/hodos/tasks/orders-summary/state.json');
  const first = statSync(state).ino;

  assert.equal(run(root, 'add', 'Task 1: started').status, 0);

  // A truncating write keeps the inode and leaves a window in which the file
  // on disk is neither the old state nor the new one. A rename never does.
  assert.notEqual(statSync(state).ino, first);
  assert.equal(existsSync(`${state}.tmp`), false);
});

test('a write refuses a ledger it could not read, and changes nothing', { skip: process.platform === 'win32' && 'chmod 0o222 does not make a file unreadable on Windows' }, () => {
  const root = started();
  const dir = join(root, '.claude/hodos/tasks/orders-summary');
  const before = readFileSync(join(dir, 'state.json'), 'utf8');
  // Appendable, never readable: the failure decision 0101 names, where the
  // line lands and the read that derives the state from it does not.
  chmodSync(join(dir, 'ledger.md'), 0o222);

  const add = run(root, 'add', 'Task 1: started');

  chmodSync(join(dir, 'ledger.md'), 0o644);
  assert.notEqual(add.status, 0);
  assert.match(add.stderr, /ledger\.md/);
  assert.equal(readFileSync(join(dir, 'state.json'), 'utf8'), before);
  const lines = ledgerLines(root, 'orders-summary');
  assert.equal(lines.length, 1);
  assert.match(lines[0], /Init: standard feature$/);
});

test('an absent ledger is the first line of a task, not an unreadable file', () => {
  const root = project();

  const init = run(root, 'init', 'Orders Summary!', '--path', 'standard', '--type', 'feature');

  assert.equal(init.status, 0, init.stderr);
  assert.equal(readState(root, 'orders-summary').phase, 'plan');
});
