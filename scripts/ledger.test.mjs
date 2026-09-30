// Task directories are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, chmodSync, mkdtempSync, mkdirSync, readdirSync, writeFileSync, readFileSync, existsSync, realpathSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { append, deriveState, normalizeSlug, eventOf } from './ledger.mjs';

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
    // The path stays standard, so the upgrade below starts where the task is (decision 0184).
    [['Route: standard feature'], 'Route: standard feature'],
    [['Plan: approved', '--tasks', '2', '--branch', 'feature/orders-summary'], /^Plan: approved \([0-9a-f]{7,}, 2 tasks, feature\/orders-summary\)$/],
    [['Task 1: started'], 'Task 1: started'],
    [['Task 1: red-check attempt 1/3 — vitest cannot see the fixture'], 'Task 1: red-check attempt 1/3 — vitest cannot see the fixture'],
    [['Task 1: test red'], 'Task 1: test red'],
    [['Task 1: mutation', '--tests', '3'], 'Task 1: mutation (3 tests)'],
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

test('--tests is a count on a mutation row and an exemption on done', () => {
  // Decision 0122 reuses one flag for two types, distinguished by the event: a
  // whole number of new tests on `mutation`, the plan's exemption on `done`. A
  // message that names the wrong one sends the reader to the wrong grammar.
  const root = started();
  for (const bad of ['-1', '1.5', 'two', 'visual', '']) {
    const out = run(root, 'add', 'Task 1: mutation', '--tests', bad);
    assert.equal(out.status, 1, `--tests ${JSON.stringify(bad)} was accepted on a mutation row`);
    assert.match(out.stderr, /whole number/);
  }
  const missing = run(root, 'add', 'Task 1: mutation');
  assert.equal(missing.status, 1);
  assert.match(missing.stderr, /--tests/);

  assert.equal(run(root, 'add', 'Task 1: mutation', '--tests', '0').status, 0);
  assert.match(
    readFileSync(join(root, '.claude/hodos/tasks/orders-summary/ledger.md'), 'utf8'),
    /Task 1: mutation \(0 tests\)/,
  );

  // The other half of the pair is untouched: a count on `done` is still not one
  // of the four exemptions.
  const onDone = run(root, 'add', 'Task 1: done', '--sha', 'd4e5f6a', '--tests', '3');
  assert.equal(onDone.status, 1);
  assert.match(onDone.stderr, /visual/);
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
    [[...base, 'Task 1: mutation (3 tests)'], 'execute'],
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

test('init with a session id writes its own pointer and leaves active alone (decision 0171)', () => {
  const root = project();
  const out = runAs(root, 'sess-a', 'init', 'orders-summary', '--path', 'standard', '--type', 'feature');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(readFileSync(pointer(root, 'sess-a'), 'utf8').trim(), 'orders-summary');
  assert.equal(existsSync(join(root, '.claude/hodos/active')), false);
});

test('init without a session id writes active alone', () => {
  const root = started();

  assert.equal(readFileSync(join(root, '.claude/hodos/active'), 'utf8').trim(), 'orders-summary');
  assert.equal(existsSync(join(root, '.claude/hodos/sessions')), false);
});

test('claim with a session id writes its pointer and not active (decision 0171)', () => {
  const root = project();
  assert.equal(runAs(root, 'sess-a', 'init', 'orders-summary', '--path', 'standard', '--type', 'feature').status, 0);
  const out = runAs(root, 'sess-b', 'claim', 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(readFileSync(pointer(root, 'sess-b'), 'utf8').trim(), 'orders-summary');
  assert.equal(existsSync(join(root, '.claude/hodos/active')), false);
});

test('claim with no session id writes active', () => {
  const root = project();
  assert.equal(runAs(root, 'sess-a', 'init', 'orders-summary', '--path', 'standard', '--type', 'feature').status, 0);
  const out = run(root, 'claim', 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
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
  // `active` names users-export; each session claims a task of its own.
  assert.equal(runAs(root, 'sess-a', 'claim', 'orders-summary').status, 0);
  assert.equal(runAs(root, 'sess-b', 'claim', 'users-export').status, 0);

  assert.equal(runAs(root, 'sess-a', 'add', 'Task 1: started').status, 0);

  assert.deepEqual(ledgerLines(root, 'orders-summary').map(eventOf), ['Init: standard feature', 'Task 1: started']);
  assert.deepEqual(ledgerLines(root, 'users-export').map(eventOf), ['Init: quick feature']);
});

test('a session with no pointer falls back to active while no session holds one', () => {
  const root = started();
  assert.equal(runAs(root, 'sess-stranger', 'add', 'Task 1: started').status, 0);

  assert.deepEqual(ledgerLines(root, 'orders-summary').map(eventOf), ['Init: standard feature', 'Task 1: started']);
});

test('a session with no pointer does not take a task another session holds (decision 0171)', () => {
  const root = started();
  assert.equal(runAs(root, 'sess-a', 'claim', 'orders-summary').status, 0);

  const out = runAs(root, 'sess-stranger', 'add', 'Task 1: started');

  assert.equal(out.status, 0);
  assert.match(out.stderr, /no active task/);
  assert.deepEqual(ledgerLines(root, 'orders-summary').map(eventOf), ['Init: standard feature']);
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
  assert.deepEqual(readdirSync(join(root, '.claude/hodos/tasks/orders-summary')).filter((f) => f.endsWith('.tmp')), []);
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

// --- Stage 12d-1, deliverable 1: two terminals appending to one task
//
// `append` used to derive state.json from what this process read *before* it
// appended, so a line another process appended in between reached ledger.md and
// never reached the state the hooks read. And every writer shared one
// `state.json.tmp`, so two writers at once crashed one of them on the rename
// (ENOENT), after its line had landed — measured at 12–15 of 40 concurrent adds.

const FOREIGN = 'Ruling: from the other terminal — it appended too — none';
const foreignLine = () => `${new Date().toISOString()} ${FOREIGN}\n`;
const seed = { slug: 'orders-summary', path: null, type: null, campaign: null };

test('a line appended between this append and the derivation reaches state.json', () => {
  const root = started();
  const dir = join(root, '.claude/hodos/tasks/orders-summary');
  const io = {
    appendLine(file, text) {
      appendFileSync(file, text);
      appendFileSync(file, foreignLine()); // the other process, right after ours
    },
  };

  const state = append(dir, 'Compact: session compacted', seed, io);

  assert.equal(state.lastEvent, FOREIGN);
  assert.equal(readState(root, 'orders-summary').lastEvent, FOREIGN);
});

test('a state written while another process appends is derived again before the command returns', () => {
  const root = started();
  const dir = join(root, '.claude/hodos/tasks/orders-summary');
  let writes = 0;
  const io = {
    writeState(file, text) {
      writeFileSync(file, text);
      writes += 1;
      // The other process appended after our re-read and wrote its own state
      // before ours: without a check after the write, ours lands last and stale.
      if (writes === 1) appendFileSync(join(dir, 'ledger.md'), foreignLine());
    },
  };

  append(dir, 'Compact: session compacted', seed, io);

  assert.equal(readState(root, 'orders-summary').lastEvent, FOREIGN);
  assert.equal(writes, 2);
});

test('two processes adding at once both succeed, and state.json is derived from every line', async () => {
  const root = started();
  const add = (line) =>
    new Promise((resolve) => {
      const child = spawn(process.execPath, [LEDGER, 'add', line], { cwd: root, env: withoutSession() });
      let stderr = '';
      child.stderr.on('data', (chunk) => {
        stderr += chunk;
      });
      child.on('close', (code) => resolve({ code, stderr }));
    });

  for (let i = 0; i < 10; i += 1) {
    const both = await Promise.all([add(`Ruling: a${i} — x — y`), add(`Ruling: b${i} — x — y`)]);
    for (const { code, stderr } of both) assert.equal(code, 0, stderr);
    const lines = ledgerLines(root, 'orders-summary');
    const last = lines[lines.length - 1];
    assert.equal(readState(root, 'orders-summary').lastEvent, last.slice(last.indexOf(' ') + 1));
  }
  assert.deepEqual(readdirSync(join(root, '.claude/hodos/tasks/orders-summary')).filter((f) => f.endsWith('.tmp')), []);
});

// --- the shape of a task (decision 0183)
//
// `inert` is a shape of `quick` for a change with no behaviour, and
// `mechanical` a shape of `refactor`. The shape is recorded where the path is,
// on `Init:` and on the `Route:` line the developer's change writes, and it is
// what three gates read: `done --inert`, where the review sends the task next,
// and the history line.

/** An `inert` task, slug `fix-doc-comment`. */
function inertTask(root = project()) {
  const init = run(root, 'init', 'Fix doc comment', '--path', 'quick', '--type', 'refactor', '--shape', 'inert');
  assert.equal(init.status, 0, init.stderr);
  return root;
}

test('init records a shape after the path and type, and state carries it', () => {
  const root = inertTask();
  assert.deepEqual(ledgerLines(root, 'fix-doc-comment').map(eventOf), ['Init: quick refactor inert']);
  assert.equal(readState(root, 'fix-doc-comment').shape, 'inert');

  const other = project();
  const out = run(other, 'init', 'Rename the hook', '--path', 'deep', '--type', 'refactor', '--shape', 'mechanical');
  assert.equal(out.status, 0, out.stderr);
  assert.deepEqual(ledgerLines(other, 'rename-the-hook').map(eventOf), ['Init: deep refactor mechanical']);
  assert.equal(readState(other, 'rename-the-hook').shape, 'mechanical');
});

test('a task with no shape carries shape null', () => {
  const root = started();
  assert.equal(readState(root, 'orders-summary').shape, null);
});

test('init refuses a shape its path or type cannot carry, and creates nothing', () => {
  const cases = [
    [['--path', 'standard', '--type', 'feature', '--shape', 'inert'], /inert.*quick/],
    [['--path', 'quick', '--type', 'feature', '--shape', 'mechanical'], /mechanical.*refactor/],
    [['--path', 'quick', '--type', 'feature', '--shape', 'tiny'], /--shape must be one of inert, mechanical/],
  ];
  for (const [args, message] of cases) {
    const root = project();
    const out = run(root, 'init', 'Some task', ...args);
    assert.equal(out.status, 1, args.join(' '));
    assert.match(out.stderr, message);
    assert.equal(existsSync(join(root, '.claude/hodos/tasks/some-task')), false, args.join(' '));
  }
});

test('the Route line carries the shape the developer confirmed, and one without it clears it', () => {
  const root = inertTask();
  assert.equal(run(root, 'add', 'Route: quick feature').status, 0);
  assert.equal(readState(root, 'fix-doc-comment').shape, null);
  assert.equal(run(root, 'add', 'Route: quick feature inert').status, 0);
  assert.equal(readState(root, 'fix-doc-comment').shape, 'inert');

  const refused = run(root, 'add', 'Route: standard feature inert');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /inert.*quick/);
});

test('done --inert is stored with the sha and accepted only on an inert task', () => {
  const root = inertTask();
  run(root, 'add', 'Task 1: started');
  const out = run(root, 'add', 'Task 1: done', '--sha', 'd4e5f6a', '--inert');
  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout.trim(), 'Task 1: done (d4e5f6a, inert)');
  assert.equal(readState(root, 'fix-doc-comment').lastCommit, 'd4e5f6a');
  assert.equal(readState(root, 'fix-doc-comment').tasks.done, 1);

  const plain = started();
  run(plain, 'add', 'Task 1: started');
  const before = ledgerLines(plain, 'orders-summary').length;
  const refused = run(plain, 'add', 'Task 1: done', '--sha', 'd4e5f6a', '--inert');
  assert.equal(refused.status, 1);
  assert.match(refused.stderr, /Shape: inert/);
  assert.match(refused.stderr, /0183/);
  assert.equal(ledgerLines(plain, 'orders-summary').length, before, 'nothing appended');
});

test('done --inert and --tests together are refused: a change is inert or exempt, not both', () => {
  const root = inertTask();
  run(root, 'add', 'Task 1: started');
  const out = run(root, 'add', 'Task 1: done', '--sha', 'd4e5f6a', '--inert', '--tests', 'infra');
  assert.equal(out.status, 1);
  assert.match(out.stderr, /--inert/);
});

test('an inert task still needs --inert or a red phase: the shape is not a silent exemption', () => {
  const root = inertTask();
  run(root, 'add', 'Task 1: started');
  const out = run(root, 'add', 'Task 1: done', '--sha', 'd4e5f6a');
  assert.equal(out.status, 1);
  assert.match(out.stderr, /test red/);
});

test('the upgrade out of inert clears the shape, and nothing downgrades into it', () => {
  const root = inertTask();
  const up = run(root, 'add', 'Upgrade: inert→quick — the message is matched by a test');
  assert.equal(up.status, 0, up.stderr);
  assert.equal(readState(root, 'fix-doc-comment').shape, null);
  assert.equal(readState(root, 'fix-doc-comment').path, 'quick');

  const down = run(root, 'add', 'Upgrade: quick→inert — smaller than it looked');
  assert.equal(down.status, 1);
  assert.match(down.stderr, /one way/);

  assert.equal(derive('Init: quick refactor inert', 'Upgrade: inert→standard — a branch reads it').shape, null);
  assert.equal(derive('Init: quick refactor inert', 'Upgrade: inert→standard — a branch reads it').path, 'standard');
  assert.equal(derive('Init: quick refactor inert', 'Upgrade: quick→standard — wider').shape, null);
});

test('an inert task goes from an accepted review to finish, and every other task to verify', () => {
  assert.equal(derive('Init: quick refactor inert', 'Review 1: ACCEPT (0/0/0)').phase, 'finish');
  assert.equal(derive('Init: quick refactor', 'Review 1: ACCEPT (0/0/0)').phase, 'verify');
  assert.equal(derive('Init: deep refactor mechanical', 'Review 1: ACCEPT (0/0/0)').phase, 'verify');
  assert.equal(derive('Init: quick refactor inert', 'Review 1: NEEDS_WORK (0/1/0)').phase, 'fix');
  assert.equal(
    derive('Init: quick refactor inert', 'Review 2: NEEDS_WORK (0/1/0)', 'Breaker: review — accept').phase,
    'finish',
  );
  assert.equal(
    derive('Init: quick refactor inert', 'Upgrade: inert→quick — reads it', 'Review 1: ACCEPT (0/0/0)').phase,
    'verify',
  );
});

test('the stored done form of an inert task is re-read by the derivation', () => {
  const state = derive('Init: quick refactor inert', 'Task 1: started', 'Task 1: done (d4e5f6a, inert)');
  assert.equal(state.lastCommit, 'd4e5f6a');
  assert.equal(state.tasks.done, 1);
});

test('Finish writes the shape into history, and a task with none writes no shape key', () => {
  const root = inertTask();
  run(root, 'add', 'Plan: approved', '--tasks', '1', '--branch', 'fix/doc-comment');
  run(root, 'add', 'Review 1: ACCEPT 0/0/0');
  assert.equal(run(root, 'add', 'Finish: report delivered').status, 0);
  assert.equal(history(root)[0].shape, 'inert');
  assert.equal(history(root)[0].verifyIterations, 0);

  const plain = started();
  run(plain, 'add', 'Review 1: ACCEPT 0/0/0');
  run(plain, 'add', 'Verify 1: PASS 3 claims, 0 skipped');
  run(plain, 'add', 'Finish: report delivered');
  assert.equal('shape' in history(plain)[0], false);
});

test('inert rides on feature or refactor: a bug opens with a red loop and the rest commit nothing a test could miss', () => {
  for (const type of ['bug', 'question', 'spike', 'upgrade']) {
    const root = project();
    const out = run(root, 'init', 'Some task', '--path', 'quick', '--type', type, '--shape', 'inert');
    assert.equal(out.status, 1, type);
    assert.match(out.stderr, new RegExp(`inert.*feature or refactor.*${type}`));
    assert.equal(existsSync(join(root, '.claude/hodos/tasks/some-task')), false, type);
  }
  const feature = project();
  assert.equal(run(feature, 'init', 'Some task', '--path', 'quick', '--type', 'feature', '--shape', 'inert').status, 0);
});

// Decision 0184: the upgrade out of `inert` is a reset point, as a rollback
// breaker is, so the reverted edit is rebuilt test-first and reviewed afresh.

test('the upgrade out of inert restarts the task count and both loops, and the next approval bases the rebuild', () => {
  const state = derive(
    'Init: quick refactor inert',
    'Plan: approved (a1b2c3d, 1 tasks, fix/doc-comment)',
    'Task 1: started',
    'Task 1: done (e1e1e1e, inert)',
    'Review 1: NEEDS_WORK (0/1/0)',
    'Upgrade: inert→quick — the message is matched by a test',
    'Plan: approved (f2f2f2f, 2 tasks, fix/doc-comment)',
  );
  assert.equal(state.phase, 'approved');
  assert.equal(state.base, 'f2f2f2f');
  assert.deepEqual(state.tasks, { total: 2, done: 0, current: 1 });
  assert.deepEqual(state.review, { iteration: 0, verdict: null });

  // A rollback before the upgrade names a task of the reverted work: the
  // rebuild starts at T1 whatever it named.
  const rolledBack = derive(
    'Init: quick refactor inert',
    'Plan: approved (a1b2c3d, 2 tasks, fix/doc-comment)',
    'Task 1: started',
    'Task 1: done (e1e1e1e, inert)',
    'Task 2: started',
    'Task 2: done (e2e2e2e, inert)',
    'Review 1: NEEDS_WORK (0/1/0)',
    'Review 2: NEEDS_WORK (0/1/0)',
    'Breaker: review — rollback T2',
    'Upgrade: inert→quick — a branch reads it',
    'Plan: approved (f2f2f2f, 2 tasks, fix/doc-comment)',
  );
  assert.deepEqual(rolledBack.tasks, { total: 2, done: 0, current: 1 });

  // Any other upgrade keeps its counts: only the step out of inert reverts work.
  const wider = derive(
    'Init: quick feature',
    'Plan: approved (a1b2c3d, 1 tasks, feat/x)',
    'Task 1: started',
    'Task 1: test red',
    'Task 1: done (e1e1e1e)',
    'Review 1: NEEDS_WORK (0/1/0)',
    'Upgrade: quick→standard — wider than it looked',
  );
  assert.equal(wider.tasks.done, 1);
  assert.equal(wider.review.iteration, 1);
});

test('after the upgrade out of inert, the rebuilt task needs its red phase, and --inert is refused', () => {
  const root = inertTask();
  run(root, 'add', 'Plan: approved', '--tasks', '1', '--branch', 'fix/doc-comment');
  run(root, 'add', 'Task 1: started');
  assert.equal(run(root, 'add', 'Task 1: done', '--sha', 'e1e1e1e', '--inert').status, 0);
  run(root, 'add', 'Review 1: NEEDS_WORK 0/1/0');
  assert.equal(run(root, 'add', 'Upgrade: inert→quick — the message is matched by a test').status, 0);
  run(root, 'add', 'Plan: approved', '--tasks', '1', '--branch', 'fix/doc-comment');
  assert.deepEqual(readState(root, 'fix-doc-comment').tasks, { total: 1, done: 0, current: 1 });

  run(root, 'add', 'Task 1: started');
  assert.equal(run(root, 'add', 'Task 1: done', '--sha', 'f2f2f2f', '--inert').status, 1);
  const bare = run(root, 'add', 'Task 1: done', '--sha', 'f2f2f2f');
  assert.equal(bare.status, 1);
  assert.match(bare.stderr, /test red/);
});

test('an upgrade starts where the task is: its from side is the current rung', () => {
  const inert = inertTask();
  const skipped = run(inert, 'add', 'Upgrade: quick→standard — wider');
  assert.equal(skipped.status, 1);
  assert.match(skipped.stderr, /where the task is.*inert/);

  const plain = started(); // standard
  const before = ledgerLines(plain, 'orders-summary').length;
  const fromInert = run(plain, 'add', 'Upgrade: inert→quick — reads it');
  assert.equal(fromInert.status, 1);
  assert.match(fromInert.stderr, /where the task is.*standard/);
  assert.equal(run(plain, 'add', 'Upgrade: quick→deep — wider').status, 1);
  assert.equal(ledgerLines(plain, 'orders-summary').length, before, 'nothing appended');
  assert.equal(run(plain, 'add', 'Upgrade: standard→deep — a new contract').status, 0);
});

test('nothing returns to inert once the task is past its verdict', () => {
  const approved = inertTask();
  run(approved, 'add', 'Plan: approved', '--tasks', '1', '--branch', 'fix/doc-comment');
  run(approved, 'add', 'Route: quick feature');
  const back = run(approved, 'add', 'Route: quick feature inert');
  assert.equal(back.status, 1);
  assert.match(back.stderr, /past.*verdict/);
  assert.equal(readState(approved, 'fix-doc-comment').shape, null);

  const upgraded = inertTask();
  run(upgraded, 'add', 'Upgrade: inert→quick — reads it');
  const again = run(upgraded, 'add', 'Route: quick feature inert');
  assert.equal(again.status, 1);
  assert.equal(readState(upgraded, 'fix-doc-comment').shape, null);
});
