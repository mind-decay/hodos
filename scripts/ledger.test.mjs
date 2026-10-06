// Task directories are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, chmodSync, mkdirSync, readdirSync, renameSync, writeFileSync, readFileSync, existsSync, rmSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { append, deriveState, normalizeSlug, eventOf, latestTask, nextFacts, nextStep } from './ledger.mjs';
import { tempDir } from './temp-dir.mjs';

const LEDGER = fileURLToPath(new URL('./ledger.mjs', import.meta.url));

/** A project with a config and a git repository — `Plan: approved` reads HEAD. */
function project() {
  const root = tempDir('hodos-ledger-');
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
  const home = tempDir('hodos-home-');
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

test('init --chat records the developer’s language, and a later add keeps it (decision 0200)', () => {
  const root = project();
  assert.equal(run(root, 'init', 't', '--path', 'quick', '--type', 'feature', '--chat', 'ru').status, 0);
  assert.equal(readState(root, 't').chat, 'ru');

  assert.equal(run(root, 'add', 'Ruling: a — b — c').status, 0);
  assert.equal(readState(root, 't').chat, 'ru');
});

test('init without --chat records chat null', () => {
  const root = project();
  run(root, 'init', 't', '--path', 'quick', '--type', 'feature');

  assert.equal(readState(root, 't').chat, null);
});

test('--chat takes two lowercase letters: anything else exits 1 and creates nothing', () => {
  for (const chat of ['RU', 'rus', '']) {
    const root = project();
    const out = run(root, 'init', 't', '--path', 'quick', '--type', 'feature', '--chat', chat);

    assert.equal(out.status, 1, `--chat ${JSON.stringify(chat)}`);
    assert.match(out.stderr, /ledger: --chat must be two lowercase letters, as config\.language is/);
    assert.equal(existsSync(join(root, '.claude/hodos/tasks/t')), false);
    assert.equal(existsSync(join(root, '.claude/hodos/active')), false);
  }
});

test('a state.json written before decision 0200 seeds chat null', () => {
  const root = started();
  const file = join(root, '.claude/hodos/tasks/orders-summary/state.json');
  const { chat, ...before } = readState(root, 'orders-summary');
  writeFileSync(file, JSON.stringify(before));

  assert.equal(run(root, 'add', 'Ruling: a — b — c').status, 0);
  assert.equal(readState(root, 'orders-summary').chat, null);
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
    [['Fix 1: green'], 'Fix 1: green'],
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

// --- decision 0193: the third red check blocks the task on its question.

const ledgerText = (root) => readFileSync(join(root, '.claude/hodos/tasks/orders-summary/ledger.md'), 'utf8');

test('a third red check lets the task be blocked on its question', () => {
  const root = started();
  run(root, 'add', 'Task 1: started');
  for (const k of [1, 2, 3]) run(root, 'add', `Task 1: red-check attempt ${k}/3 — still red`);
  const out = run(root, 'add', 'Task 1: blocked — which fixture holds the empty cart?');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout.trim(), 'Task 1: blocked — which fixture holds the empty cart?');
  const state = readState(root, 'orders-summary');
  assert.equal(state.phase, 'blocked');
  assert.equal(state.blockedOn, 'which fixture holds the empty cart?');
  assert.equal(state.redCheckAttempts, 3, 'the spent bound stays visible while the task waits');
});

test('blocked before the third red check is refused and writes nothing', () => {
  const root = started();
  run(root, 'add', 'Task 1: started');
  for (const k of [1, 2]) run(root, 'add', `Task 1: red-check attempt ${k}/3 — still red`);
  const before = ledgerText(root);
  const out = run(root, 'add', 'Task 1: blocked — which fixture holds the empty cart?');

  assert.equal(out.status, 1);
  assert.equal(out.stderr.trim(), 'ledger: "Task 1: blocked" needs "Task 1: red-check attempt 3/3" before it (decision 0193)');
  assert.equal(ledgerText(root), before, 'ledger.md is byte-identical');
});

test('the third red check counts for its own task, since that task last started', () => {
  const root = started();
  run(root, 'add', 'Task 1: started');
  for (const k of [1, 2, 3]) run(root, 'add', `Task 1: red-check attempt ${k}/3 — still red`);
  run(root, 'add', 'Task 1: test red');
  run(root, 'add', 'Task 1: done', '--sha', 'aaaaaaa');
  run(root, 'add', 'Task 2: started');
  const other = run(root, 'add', 'Task 2: blocked — q');
  assert.equal(other.status, 1, 'task 1’s attempts are not task 2’s');
  assert.match(other.stderr, /"Task 2: red-check attempt 3\/3"/);

  // A restarted task is on a fresh bound, so it earns its stop again.
  const root2 = started();
  run(root2, 'add', 'Task 1: started');
  for (const k of [1, 2, 3]) run(root2, 'add', `Task 1: red-check attempt ${k}/3 — still red`);
  assert.equal(run(root2, 'add', 'Task 1: blocked — q').status, 0);
  run(root2, 'add', 'Gap: q — a (developer)');
  run(root2, 'add', 'Task 1: started');
  assert.equal(run(root2, 'add', 'Task 1: blocked — q').status, 1, 'the attempts before the restart are spent');
});

test('the answer and a new start take the task out of blocked on a fresh bound', () => {
  const state = derive(
    'Task 1: started',
    'Task 1: red-check attempt 1/3 — red',
    'Task 1: red-check attempt 2/3 — red',
    'Task 1: red-check attempt 3/3 — red',
    'Task 1: blocked — q',
    'Gap: q — a (developer)',
    'Task 1: started',
  );
  assert.equal(state.phase, 'execute');
  assert.equal(state.redCheckAttempts, 0);
  assert.equal(state.blockedOn, null);
});

test('a ledger with no blocked line derives blockedOn null', () => {
  // No `started` either: that line clears the field, and would hide a seed without it.
  assert.equal(derive('Init: standard feature', 'Plan: approved (a1b2c3d, 2 tasks, feature/x)').blockedOn, null);
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
  const bare = tempDir('hodos-bare-');
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

// --- decision 0195: a fix pass records its green checks before its commit.

/** A started task whose ledger already holds these stored events. */
function withEvents(...events) {
  const root = started();
  const file = join(root, '.claude/hodos/tasks/orders-summary/ledger.md');
  for (const event of events) appendFileSync(file, `${new Date().toISOString()} ${event}\n`);
  return root;
}

const TO_REVIEW = ['Plan: approved (a1b2c3d, 1 tasks, task/x)', 'Task 1: started', 'Task 1: test red', 'Task 1: done (aaaaaaa)', 'Simplify: done (aaaaaaa, net -0)'];

test('Fix k: green in phase fix is stored, sets fixGreen, and leaves the phase in fix', () => {
  const root = withEvents(...TO_REVIEW, 'Review 1: NEEDS_WORK (0/2/0)');
  const out = run(root, 'add', 'Fix 1: green');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout.trim(), 'Fix 1: green');
  const state = readState(root, 'orders-summary');
  assert.equal(state.fixGreen, 1);
  assert.equal(state.phase, 'fix');
});

test('Fix k: green outside phase fix exits 1, names the phase and 0195, and writes nothing', () => {
  for (const [events, phase] of [
    [[...TO_REVIEW], 'review'],
    [['Plan: approved (a1b2c3d, 1 tasks, task/x)', 'Task 1: started'], 'execute'],
  ]) {
    const root = withEvents(...events);
    const before = ledgerText(root);
    const out = run(root, 'add', 'Fix 1: green');

    assert.equal(out.status, 1, phase);
    assert.equal(
      out.stderr.trim(),
      `ledger: "Fix 1: green" is recorded in phase fix, once the pass's checks pass, and this task is in ${phase} (decision 0195)`,
    );
    assert.equal(ledgerText(root), before, `${phase}: ledger.md is byte-identical`);
  }
});

test('Fix k: done after its green line clears fixGreen and leaves for the loop that failed', () => {
  const afterReview = withEvents(...TO_REVIEW, 'Review 1: NEEDS_WORK (0/2/0)', 'Fix 1: green');
  assert.equal(run(afterReview, 'add', 'Fix 1: done', '--sha', 'bbbbbbb').status, 0);
  assert.equal(readState(afterReview, 'orders-summary').fixGreen, null);
  assert.equal(readState(afterReview, 'orders-summary').phase, 'review');

  const afterVerify = withEvents(...TO_REVIEW, 'Review 1: ACCEPT (0/0/0)', 'Verify 1: FAIL 3 claims, 0 skipped', 'Fix 1: green');
  assert.equal(run(afterVerify, 'add', 'Fix 1: done', '--sha', 'bbbbbbb').status, 0);
  assert.equal(readState(afterVerify, 'orders-summary').fixGreen, null);
  assert.equal(readState(afterVerify, 'orders-summary').phase, 'verify');
});

test('Fix k: done with no green line is still accepted: the line is read by the gate only (D7)', () => {
  const root = withEvents(...TO_REVIEW, 'Review 1: NEEDS_WORK (0/2/0)');
  const out = run(root, 'add', 'Fix 1: done', '--sha', 'bbbbbbb');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(readState(root, 'orders-summary').phase, 'review');
});

test('fixGreen is null in every phase but fix, and a ledger with no green line derives null', () => {
  assert.equal(derive('Review 1: NEEDS_WORK (0/2/0)').fixGreen, null);
  assert.equal(derive('Review 1: NEEDS_WORK (0/2/0)', 'Fix 1: green', 'Gap: a — b').fixGreen, 1, 'a Gap: in the pass keeps it');
  assert.equal(derive('Review 1: NEEDS_WORK (0/2/0)', 'Fix 1: green', 'Breaker: review — manual').fixGreen, null);
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
    [[...base, 'Task 1: red-check attempt 3/3 — still red', 'Task 1: blocked — q'], 'blocked'],
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
  const root = tempDir('hodos-ledger-');
  const out = runAs(root, 'sess-b', 'claim', 'orders-summary');

  assert.equal(out.status, 0);
});

// --- decision 0190: S2 never starts in the session that approved the plan.

const headOf = (root) => execFileSync('git', ['rev-parse', '--short', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();

/** A task planned and approved in session `sess-x`, as S1 leaves it. */
function plannedIn(session = 'sess-x') {
  const root = project();
  assert.equal(runAs(root, session, 'init', 'orders-summary', '--path', 'deep', '--type', 'feature').status, 0);
  const approved = runAs(root, session, 'add', 'Plan: approved', '--tasks', '2', '--branch', 'b');
  assert.equal(approved.status, 0, approved.stderr);
  return root;
}

/** Every file under `.claude/hodos/sessions/`, with its content. */
const sessionsSnapshot = (root) => {
  const dir = join(root, '.claude/hodos/sessions');
  if (!existsSync(dir)) return null;
  return readdirSync(dir).sort().map((name) => [name, readFileSync(join(dir, name), 'utf8')]);
};

test('Plan: approved under a session id stores the session, and the branch stays the branch', () => {
  const root = plannedIn('sess-x');

  assert.match(ledgerLines(root, 'orders-summary').at(-1), /, session sess-x\)$/);
  const state = readState(root, 'orders-summary');
  assert.equal(state.planSession, 'sess-x');
  assert.equal(state.branch, 'b');
  assert.equal(state.tasks.total, 2);
  assert.equal(state.base, headOf(root));
});

test('Plan: approved with no session id is stored as before, and planSession is null', () => {
  const root = started();
  const out = run(root, 'add', 'Plan: approved', '--tasks', '2', '--branch', 'b');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(eventOf(ledgerLines(root, 'orders-summary').at(-1)), `Plan: approved (${headOf(root)}, 2 tasks, b)`);
  const state = readState(root, 'orders-summary');
  assert.equal(state.planSession, null);
  assert.equal(state.branch, 'b');
});

test('Plan: approved --handoff stores no session, so the session picking the work up can claim it', () => {
  const root = project();
  assert.equal(runAs(root, 'sess-x', 'init', 'orders-summary', '--path', 'deep', '--type', 'feature').status, 0);
  const out = runAs(root, 'sess-x', 'add', 'Plan: approved', '--tasks', '2', '--branch', 'b', '--handoff');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(eventOf(ledgerLines(root, 'orders-summary').at(-1)), `Plan: approved (${headOf(root)}, 2 tasks, b)`);
  assert.equal(readState(root, 'orders-summary').planSession, null);
});

test('a ledger approved before decision 0190 replays to planSession null and its branch unchanged', () => {
  const old = derive('Init: deep feature', 'Plan: approved (a1b2c3d, 2 tasks, feature/x)');
  assert.equal(old.planSession, null);
  assert.equal(old.branch, 'feature/x');

  // A later approval wins, as it does for base.
  const again = derive(
    'Init: deep feature',
    'Plan: approved (a1b2c3d, 2 tasks, feature/x, session sess-x)',
    'Plan: approved (b2c3d4e, 2 tasks, feature/x)',
  );
  assert.equal(again.planSession, null);
  assert.equal(again.base, 'b2c3d4e');
});

test('claim in the session that approved the plan exits 1, names /clear, and writes no pointer', () => {
  const root = plannedIn('sess-x');
  const before = sessionsSnapshot(root);

  const out = runAs(root, 'sess-x', 'claim', 'orders-summary');

  assert.equal(out.status, 1);
  assert.equal(out.stdout, '');
  assert.equal(out.stderr, 'ledger: orders-summary was planned in this session — /clear, then /hodos:run orders-summary\n');
  assert.deepEqual(sessionsSnapshot(root), before);
});

test('claim in another session than the one that approved the plan writes its pointer', () => {
  const root = plannedIn('sess-x');

  const out = runAs(root, 'sess-y', 'claim', 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(readFileSync(pointer(root, 'sess-y'), 'utf8').trim(), 'orders-summary');
});

test('claim with no session id is allowed on a plan approved in a session (D6: nothing to compare)', () => {
  const root = plannedIn('sess-x');

  const out = run(root, 'claim', 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(readFileSync(join(root, '.claude/hodos/active'), 'utf8').trim(), 'orders-summary');
});

test('--handoff on any line but Plan: approved exits 1 and appends nothing', () => {
  const root = started();
  const before = ledgerLines(root, 'orders-summary');

  const out = run(root, 'add', 'Task 1: started', '--handoff');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /--handoff belongs to "Plan: approved" only/);
  assert.deepEqual(ledgerLines(root, 'orders-summary'), before);
});

test('claim on a task whose ledger cannot be read refuses with the reader’s message and writes no pointer', { skip: process.platform === 'win32' && 'chmod 0o222 does not make a file unreadable on Windows' }, () => {
  const root = plannedIn('sess-x');
  const file = join(root, '.claude/hodos/tasks/orders-summary/ledger.md');
  chmodSync(file, 0o222);

  const out = runAs(root, 'sess-y', 'claim', 'orders-summary');

  chmodSync(file, 0o644);
  assert.equal(out.status, 1);
  assert.match(out.stderr, /^ledger: cannot read /);
  assert.equal(existsSync(pointer(root, 'sess-y')), false);
});

test('claim refuses the planning session at a later phase too: a resumed S1 still holds its context', () => {
  const root = plannedIn('sess-x');
  assert.equal(runAs(root, 'sess-x', 'add', 'Task 1: started').status, 0);
  assert.equal(readState(root, 'orders-summary').phase, 'execute');
  const before = sessionsSnapshot(root);

  const out = runAs(root, 'sess-x', 'claim', 'orders-summary');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /was planned in this session — \/clear/);
  assert.deepEqual(sessionsSnapshot(root), before);
});

test('claim on a ledger approved before decision 0190 behaves as before, in any session', () => {
  const root = project();
  assert.equal(runAs(root, 'sess-x', 'init', 'orders-summary', '--path', 'deep', '--type', 'feature').status, 0);
  // The stored form every approval had before the session part existed.
  appendFileSync(
    join(root, '.claude/hodos/tasks/orders-summary/ledger.md'),
    `${new Date().toISOString()} Plan: approved (${headOf(root)}, 2 tasks, b)\n`,
  );

  const out = runAs(root, 'sess-x', 'claim', 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(readFileSync(pointer(root, 'sess-x'), 'utf8').trim(), 'orders-summary');
});

test('claim after an approval made with --handoff is allowed in the session that made it', () => {
  const root = project();
  assert.equal(runAs(root, 'sess-x', 'init', 'orders-summary', '--path', 'deep', '--type', 'feature').status, 0);
  assert.equal(runAs(root, 'sess-x', 'add', 'Plan: approved', '--tasks', '2', '--branch', 'b', '--handoff').status, 0);

  const out = runAs(root, 'sess-x', 'claim', 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(readFileSync(pointer(root, 'sess-x'), 'utf8').trim(), 'orders-summary');
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
  const home = tempDir('hodos-home-'); // no .claude/projects
  assert.equal(runIn(root, home, 'sess-a', 'claim', 'orders-summary').status, 0);

  const out = runIn(root, home, 'sess-a', 'sessions', '--gc');

  assert.equal(existsSync(pointer(root, 'sess-a')), true);
  assert.match(out.stdout, /transcripts unreadable/);
});

test('sessions --gc collects a pointer that names no task, transcripts readable or not', () => {
  // Both arms: with the transcripts in reach the pointer looks live by every
  // other test, and without them no test but this one can call it dead.
  const homes = [transcripts({ 'sess-a': 1 }), tempDir('hodos-home-')];
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

// Windows refuses a rename onto a file another process is renaming or has
// open, with EPERM, EACCES or EBUSY; the release's windows job met it on two
// concurrent adds. The write retries those, and only those, for a bounded time.

test('writeAtomic retries a rename Windows refused while another process held the target', async () => {
  const { writeAtomic } = await import('./ledger.mjs');
  const dir = tempDir('hodos-atomic-');
  const target = join(dir, 'state.json');
  let calls = 0;
  const busy = (code) => (from, to) => {
    calls += 1;
    if (calls <= 2) throw Object.assign(new Error(`${code}: rename`), { code });
    return renameSync(from, to);
  };
  for (const code of ['EPERM', 'EACCES', 'EBUSY']) {
    calls = 0;
    writeAtomic(target, `{"${code}":1}\n`, { rename: busy(code), sleep: () => {} });
    assert.equal(calls, 3, code);
    assert.equal(readFileSync(target, 'utf8'), `{"${code}":1}\n`, code);
  }
  assert.deepEqual(readdirSync(dir), ['state.json'], 'no temporary file is left');
});

test('writeAtomic gives up after its bound, removes its temporary file, and retries nothing else', async () => {
  const { writeAtomic } = await import('./ledger.mjs');
  const dir = tempDir('hodos-atomic-');
  const target = join(dir, 'state.json');
  let calls = 0;
  const always = (code) => () => {
    calls += 1;
    throw Object.assign(new Error(`${code}: rename`), { code });
  };
  // Busy for a hundred attempts, then free: a write with no bound would get
  // through, so the refusal is what shows the bound.
  const busyFor = (limit) => (from, to) => {
    calls += 1;
    if (calls <= limit) throw Object.assign(new Error('EPERM: rename'), { code: 'EPERM' });
    return renameSync(from, to);
  };
  assert.throws(() => writeAtomic(target, '{}\n', { rename: busyFor(100), sleep: () => {} }), /EPERM/);
  assert.ok(calls > 3 && calls <= 20, `a bounded number of attempts, got ${calls}`);
  assert.deepEqual(readdirSync(dir), [], 'the temporary file is removed');

  calls = 0;
  assert.throws(() => writeAtomic(target, '{}\n', { rename: always('ENOENT'), sleep: () => {} }), /ENOENT/);
  assert.equal(calls, 1, 'any other error is thrown at once');
});

test('the upgrade out of inert returns the task to plan, so run stops at the missing approval', () => {
  const upgraded = derive(
    'Init: quick refactor inert',
    'Plan: approved (a1b2c3d, 1 tasks, fix/doc-comment)',
    'Task 1: started',
    'Task 1: done (e1e1e1e, inert)',
    'Review 1: NEEDS_WORK (0/1/0)',
    'Fix 1: done (f1f1f1f)',
    'Review 2: NEEDS_WORK (0/1/0)',
    'Upgrade: inert→quick — the fix reads a line a program compares',
  );
  assert.equal(upgraded.phase, 'plan');

  // Any other upgrade leaves the phase where it was.
  const wider = derive('Init: quick feature', 'Review 1: NEEDS_WORK (0/1/0)', 'Upgrade: quick→standard — wider');
  assert.equal(wider.phase, 'fix');
});

// --- decision 0192: `next` names the step and the command that continue a task.

const st = (over) => ({ slug: 'orders-summary', path: 'standard', type: 'feature', shape: null, phase: 'plan', campaign: null, branch: 'task/orders-summary', ...over });
const FULL = {
  brief: true, research: true, plan: true, openQuestions: false, rerouted: false, upgradedFromInert: false,
  remote: null, remotes: 0, defaultBranch: null, done: false,
  repo: false, branchExists: false, head: null, dirty: [], ffable: false, merged: false, pushed: false,
  defaultAhead: 0, land: null, mapLocal: false, mapRepo: null, pluginRoot: '/plugin',
};
const facts = (over) => ({ ...FULL, ...over });

test('nextStep answers every row of the decider table', () => {
  const rows = [
    // done is the landing table's, below (decision 0197)
    [st({ phase: 'manual' }), facts(), 'manual', '/hodos:review task/orders-summary'],
    [st({ phase: 'blocked' }), facts(), 'blocked', '/hodos:run orders-summary'],
    ...['approved', 'execute', 'review', 'fix', 'verify', 'finish'].map((phase) => [st({ phase }), facts(), 'run', '/hodos:run orders-summary']),
    [st(), facts({ rerouted: true }), 'reroute', '/hodos:task <the symptom, as a question or a spike>'],
    [st(), facts({ brief: false, research: false, plan: false }), 'route', '/hodos:task orders-summary'],
    [st({ path: 'quick', shape: 'inert' }), facts({ research: false, plan: false }), 'inert', '/hodos:task orders-summary'],
    [st({ path: 'quick' }), facts({ research: false, upgradedFromInert: true }), 'plan', '/hodos:task orders-summary'],
    [st({ path: 'deep' }), facts({ research: false, plan: false }), 'research', '/hodos:task orders-summary'],
    [st(), facts({ research: false, plan: false }), 'plan', '/hodos:task orders-summary'],
    [st(), facts({ research: false, openQuestions: true }), 'plan', '/hodos:task orders-summary'],
    [st({ path: 'deep' }), facts(), 'approve', '/hodos:task orders-summary'],
    [null, undefined, 'none', '/hodos:task <description>'],
  ];
  for (const [state, f, step, next] of rows) {
    assert.deepEqual(nextStep(state, f), { step, next }, `${state?.phase ?? 'no task'} → ${step}`);
  }
});

// --- decision 0197: the done answer carries the landing, built from git facts only.

const B = 'task/orders-summary';
const AFTER = '/hodos:task <description>';
const TO_MAP = '/hodos:campaign demo';
const WORDS = `merge ${B} into the branch it came from`;
const NODE_DONE = `node "${join('/plugin', 'scripts', 'campaigns.mjs')}" node-done demo first --sha HEAD~1`;
const node = { campaign: 'demo/first' };
const origin = { remote: 'origin', remotes: 1 };
/** A clean task branch one commit ahead of `main`, HEAD on it, no remote. */
const repo = (over) => facts({ done: true, repo: true, branchExists: true, head: B, defaultBranch: 'main', ffable: true, ...over });
const opt = (label, run, next = AFTER) => ({ label, run, next });
const joined = (o) => o.run.join(' && ');
const leave = (next) => opt('leave it', [], next);
const asked = (options, note = null) => ({ next: joined(options[0]), land: { options: [...options, leave(joined(options[0]))], note } });
const blocked = (next, note) => ({ next, land: { options: [leave(next)], note } });
const toMap = (o) => ({ ...o, next: TO_MAP });

const PUSH = opt(`push ${B} to origin`, [`git push -u origin ${B}`]);
const MERGE = opt('merge into main', ['git switch main', `git merge --ff-only ${B}`]);
const LAND = opt('land on main and push it', ['git switch main', `git merge --ff-only ${B}`, 'git push origin main']);
const REBASE = opt('rebase onto main and merge', ['git rebase main', 'git switch main', `git merge --ff-only ${B}`]);
const REBASE_LAND = opt('rebase onto main, land and push it', ['git rebase main', 'git switch main', `git merge --ff-only ${B}`, 'git push origin main']);
const NODE_REBASE = opt(
  'rebase onto main, land and push it',
  ['git rebase main', NODE_DONE, 'git add .claude/hodos/campaigns/demo.md', 'git commit -m "{subject}"', 'git switch main', `git merge --ff-only ${B}`, 'git push origin main'],
  TO_MAP,
);
const ELSEWHERE = `main moved past ${B} and the map lives in home — rebase by hand, then node-done`;

const LANDING = [
  ['a question lands nothing', st({ type: 'question', branch: null }), repo(origin), { next: AFTER, land: null }],
  ['a question that kept a branch lands nothing either', st({ type: 'question' }), repo(origin), { next: AFTER, land: null }],
  ['no branch', st({ branch: null }), repo(origin), { next: AFTER, land: null }],
  ['no repository', st(), facts({ done: true }), { next: WORDS, land: null }],
  ['no repository, a node', st(node), facts({ done: true }), { next: WORDS, land: null }],
  ['a branch git no longer has', st(), repo({ ...origin, branchExists: false, head: 'main' }), { next: AFTER, land: null }],
  ['a node whose branch is gone goes back to its map', st(node), repo({ branchExists: false, head: 'main' }), { next: TO_MAP, land: null }],
  ['a spike deletes its branch', st({ type: 'spike' }), repo(origin), { next: AFTER, land: { options: [opt(`delete ${B}`, ['git switch main', `git branch -D ${B}`]), leave(AFTER)], note: null } }],
  ['a spike with no default', st({ type: 'spike' }), repo({ defaultBranch: null }), { next: AFTER, land: { options: [leave(AFTER)], note: 'no default branch found' } }],
  ['a spike outside a repository', st({ type: 'spike' }), facts({ done: true }), { next: AFTER, land: null }],
  ['a spike whose branch is gone', st({ type: 'spike' }), repo({ branchExists: false, head: 'main' }), { next: AFTER, land: null }],
  ['merged, the remote default behind', st(), repo({ ...origin, merged: true, defaultAhead: 1 }), asked([opt('push main to origin', ['git push origin main'])])],
  ['merged, nothing to push', st(), repo({ ...origin, merged: true, defaultAhead: 0 }), { next: AFTER, land: null }],
  ['merged, no remote', st(), repo({ merged: true, defaultAhead: 1 }), { next: AFTER, land: null }],
  ['a merged node goes back to its map', st(node), repo({ merged: true }), { next: TO_MAP, land: null }],
  ['HEAD on another branch', st(), repo({ ...origin, head: 'main' }), blocked(`git switch ${B}, then /hodos:run orders-summary`, `HEAD is main, not ${B}`)],
  ['HEAD detached', st(), repo({ head: null }), blocked(`git switch ${B}, then /hodos:run orders-summary`, `HEAD is detached, not ${B}`)],
  ['remotes, and none git pushes to', st(), repo({ remotes: 2 }), blocked(`push ${B} to its remote`, 'no remote git would push to — set remote.pushDefault')],
  ['no remote, clean, ffable', st(), repo(), asked([MERGE])],
  ['the same by phase, with no --done', st({ phase: 'done' }), repo({ done: false }), asked([MERGE])],
  ['a remote, the convention unset', st(), repo(origin), asked([PUSH, LAND])],
  ['a remote, the convention branch', st(), repo({ ...origin, land: 'branch' }), asked([PUSH, LAND])],
  ['a remote, the convention default', st(), repo({ ...origin, land: 'default' }), asked([LAND, PUSH])],
  ['no remote, the convention default', st(), repo({ land: 'default' }), asked([MERGE])],
  ['the branch already pushed', st(), repo({ ...origin, pushed: true }), asked([LAND])],
  ['the default moved, a remote', st(), repo({ ...origin, ffable: false }), asked([PUSH, REBASE_LAND])],
  ['the default moved, no remote', st(), repo({ ffable: false }), asked([REBASE])],
  ['a node lands, its map commit riding the fast-forward', st(node), repo({ ...origin, mapLocal: true }), asked([toMap(PUSH), toMap(LAND)])],
  ['a node rebases and re-points its map', st(node), repo({ ...origin, land: 'default', ffable: false, mapLocal: true }), asked([NODE_REBASE, toMap(PUSH)])],
  ['a node whose map is elsewhere does not rebase', st(node), repo({ ...origin, ffable: false, mapRepo: 'home' }), asked([toMap(PUSH)], ELSEWHERE)],
  ['the same with the push made', st(node), repo({ ...origin, pushed: true, ffable: false, mapRepo: 'home' }), blocked(`rebase ${B} onto main by hand, then node-done in home`, ELSEWHERE)],
  ['a node whose map is elsewhere still fast-forwards', st(node), repo({ mapRepo: 'home' }), asked([toMap(MERGE)])],
  ['a dirty tree keeps the push', st(), repo({ ...origin, dirty: ['src/a.js'] }), asked([PUSH], 'uncommitted changes in src/a.js — merging needs a clean tree')],
  [
    'a dirty tree with no remote',
    st(),
    repo({ dirty: ['src/a.js', 'src/b.js'] }),
    blocked('commit or stash src/a.js, src/b.js, then /hodos:run orders-summary', 'uncommitted changes in src/a.js, src/b.js — merging needs a clean tree'),
  ],
  [
    'seven dirty paths are five and a count',
    st(),
    repo({ dirty: ['a', 'b', 'c', 'd', 'e', 'f', 'g'] }),
    blocked('commit or stash a, b, c, d, e +2, then /hodos:run orders-summary', 'uncommitted changes in a, b, c, d, e +2 — merging needs a clean tree'),
  ],
  ['no default, a remote', st(), repo({ ...origin, defaultBranch: null, ffable: false }), asked([PUSH], 'no default branch found')],
  ['no default, no remote', st(), repo({ defaultBranch: null, ffable: false }), blocked(WORDS, 'no default branch found')],
  ['no default and dirty: both notes', st(), repo({ ...origin, defaultBranch: null, ffable: false, dirty: ['x'] }), asked([PUSH], 'uncommitted changes in x — merging needs a clean tree; no default branch found')],
  [
    'the remote names develop',
    st(),
    repo({ ...origin, defaultBranch: 'develop' }),
    asked([PUSH, opt('land on develop and push it', ['git switch develop', `git merge --ff-only ${B}`, 'git push origin develop'])]),
  ],
];

test('nextStep answers every row of the landing table (decision 0197)', () => {
  for (const [name, state, f, want] of LANDING) {
    assert.deepEqual(nextStep(state, f), { step: 'done', ...want }, name);
  }
});

test('every landing holds the invariants: no forced or substituted command, leave last, the recommendation first', () => {
  for (const [name, state, f] of LANDING) {
    const { next, land } = nextStep(state, f);
    assert.notEqual(land, undefined, `${name}: a done answer carries land`);
    if (land === null) continue;
    const after = state.campaign ? TO_MAP : AFTER;
    const last = land.options.at(-1);
    assert.deepEqual([last.label, last.run], ['leave it', []], name);
    assert.equal(last.next, next, `${name}: leave ends on the top-level next`);
    for (const o of land.options.slice(0, -1)) {
      assert.equal(o.next, after, `${name}: ${o.label}`);
      assert.ok(o.run.length >= 1 && o.run.length <= 7, `${name}: ${o.label} runs 1–7 commands`);
      for (const line of o.run) {
        assert.doesNotMatch(line, /--force|\s-f\b|reset|\$\(/, `${name}: ${line}`);
        assert.match(line, /^(git |node "[^"]+campaigns\.mjs" node-done )/, `${name}: ${line}`);
      }
    }
    if (land.options.length > 1) {
      assert.notEqual(land.options[0].label, 'leave it', name);
      if (state.type !== 'spike') assert.equal(next, joined(land.options[0]), name);
    }
  }
});

/** A task directory at phase plan with the S1 files given, for nextFacts to read. */
function planned({ init = ['--path', 'standard', '--type', 'feature'], lines = [], files = {} } = {}) {
  const root = project();
  assert.equal(run(root, 'init', 'orders-summary', ...init).status, 0);
  for (const line of lines) assert.equal(run(root, 'add', line).status, 0, line);
  const dir = join(root, '.claude/hodos/tasks/orders-summary');
  for (const [name, text] of Object.entries(files)) writeFileSync(join(dir, name), text);
  return root;
}

const PLAN = (open = '') => `# Plan — orders-summary\n\n## Goal\n\nx\n\n## Tasks\n\n### T1. x\n\n## Open questions\n${open}`;
const nextOf = (root, ...args) => {
  const out = run(root, 'next', ...args);
  assert.equal(out.status, 0, out.stderr);
  return JSON.parse(out.stdout);
};

test('the plan rows read the ledger and plan.md: an upgrade out of inert and an open question both mean plan', () => {
  const inert = { init: ['--path', 'quick', '--type', 'feature', '--shape', 'inert'], files: { 'brief.md': 'b', 'plan.md': PLAN() } };
  assert.equal(nextOf(planned(inert), 'orders-summary').step, 'approve', 'control: the same files with no upgrade');
  const upgraded = planned({ ...inert, lines: ['Upgrade: inert→quick — the fix reads a line a program compares'] });
  assert.equal(nextOf(upgraded, 'orders-summary').step, 'plan');

  const files = { 'brief.md': 'b', 'plan.md': PLAN() };
  assert.equal(nextOf(planned({ files }), 'orders-summary').step, 'approve', 'control: an empty section');
  const open = planned({ files: { ...files, 'plan.md': PLAN('\n- Which fixture holds the empty cart?\n') } });
  assert.equal(nextOf(open, 'orders-summary').step, 'plan');
});

test('the inert plan as its template writes it reads as approvable', () => {
  const reference = readFileSync(new URL('../skills/task/references/inert.md', import.meta.url), 'utf8');
  const template = /```markdown\n(# Plan — <slug>\n[\s\S]*?)```/.exec(reference)[1];
  const init = ['--path', 'quick', '--type', 'feature', '--shape', 'inert'];
  const root = planned({ init, files: { 'brief.md': 'b', 'plan.md': template } });
  assert.equal(nextOf(root, 'orders-summary').step, 'approve');
});

const snapshot = (root) => {
  const dir = join(root, '.claude/hodos');
  const sessions = existsSync(join(dir, 'sessions'))
    ? readdirSync(join(dir, 'sessions')).sort().map((n) => [n, readFileSync(join(dir, 'sessions', n), 'utf8')])
    : null;
  return JSON.stringify({
    ledger: readFileSync(join(dir, 'tasks/orders-summary/ledger.md'), 'utf8'),
    state: readFileSync(join(dir, 'tasks/orders-summary/state.json'), 'utf8'),
    sessions,
    active: existsSync(join(dir, 'active')),
  });
};

test('next <slug> prints one JSON line and writes nothing', () => {
  const root = project();
  runAs(root, 'sess-a', 'init', 'orders-summary', '--path', 'standard', '--type', 'feature');
  runAs(root, 'sess-a', 'add', 'Plan: approved', '--tasks', '1', '--branch', 'task/orders-summary', '--handoff');
  const before = snapshot(root);
  const out = runAs(root, 'sess-b', 'next', 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout.split('\n').filter((l) => l !== '').length, 1, 'one line');
  assert.deepEqual(JSON.parse(out.stdout), { slug: 'orders-summary', step: 'run', next: '/hodos:run orders-summary' });
  assert.equal(snapshot(root), before, 'ledger.md, state.json and sessions/ are byte-identical');
});

test('next on a slug with no task exits 1 and prints nothing on stdout', () => {
  const out = run(project(), 'next', 'nosuch');
  assert.equal(out.status, 1);
  assert.equal(out.stderr.trim(), 'ledger: no task nosuch');
  assert.equal(out.stdout, '');
});

test('next with no slug names the most recently touched task neither done nor manual', () => {
  const root = project();
  run(root, 'init', 'older', '--path', 'standard', '--type', 'feature');
  run(root, 'init', 'newer', '--path', 'standard', '--type', 'feature');
  assert.equal(nextOf(root).slug, 'newer', 'both in flight: the most recently touched');
  run(root, 'add', 'Review 2: REJECT 1/0/0', '--slug', 'newer');
  run(root, 'add', 'Breaker: review — manual', '--slug', 'newer');
  assert.deepEqual(nextOf(root), { slug: 'older', step: 'route', next: '/hodos:task older' });

  run(root, 'add', 'Finish: report delivered', '--slug', 'older');
  assert.deepEqual(nextOf(root), { slug: null, step: 'none', next: '/hodos:task <description>' });
});

const CAMPAIGNS = fileURLToPath(new URL('./campaigns.mjs', import.meta.url));
const PLUGIN_ROOT = fileURLToPath(new URL('..', import.meta.url));
const MAP_PATH = '.claude/hodos/campaigns/demo.md';
const MAP_TEXT = `# Demo
Status: active · Owners: @you

## Nodes
- [active] first — the first node · deps: — · owner: @you · branch: ${B} · ref: task:orders-summary · metric: —
`;

/**
 * A git project whose config the developer's own cannot reach (fact 68), with
 * HEAD on the task branch one commit ahead of `branch`. `bare` adds `origin` as
 * a bare repository holding that default, and `map` commits `MAP_PATH` at the
 * base. The identity is in the environment, so a command the test runs as a
 * land option shows it commits as the kernel's would.
 */
function gitProject({
  at = tempDir('hodos-next-'),
  branch = 'main',
  remotes = [],
  pushDefault = null,
  defaultBranch = null,
  bare = false,
  campaign = null,
  map = false,
  config = { version: 1 },
} = {}) {
  const root = at;
  mkdirSync(join(root, '.claude', 'hodos'), { recursive: true });
  writeFileSync(join(root, '.claude', 'hodos', 'config.json'), JSON.stringify(config));
  const env = {
    ...withoutSession(),
    GIT_CONFIG_GLOBAL: join(tempDir('hodos-noconfig-'), 'none'),
    GIT_CONFIG_NOSYSTEM: '1',
    GIT_AUTHOR_NAME: 't',
    GIT_AUTHOR_EMAIL: 't@example.com',
    GIT_COMMITTER_NAME: 't',
    GIT_COMMITTER_EMAIL: 't@example.com',
  };
  const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', env, stdio: ['ignore', 'pipe', 'pipe'] });
  git('init', '-q', '-b', branch);
  if (map) {
    mkdirSync(join(root, '.claude', 'hodos', 'campaigns'), { recursive: true });
    writeFileSync(join(root, MAP_PATH), MAP_TEXT);
    git('add', MAP_PATH);
  }
  git('commit', '--allow-empty', '-q', '-m', 'base');
  for (const name of remotes) git('remote', 'add', name, `../${name}.git`);
  if (bare) {
    const dir = join(tempDir('hodos-bare-'), 'origin.git');
    git('init', '-q', '--bare', dir);
    git('remote', 'add', 'origin', dir);
    git('push', '-q', 'origin', branch);
  }
  if (pushDefault) git('config', 'remote.pushDefault', pushDefault);
  if (defaultBranch) git('config', 'init.defaultBranch', defaultBranch);
  git('switch', '-q', '-c', B);
  writeFileSync(join(root, 'work.txt'), 'the work\n');
  git('add', 'work.txt');
  git('commit', '-q', '-m', 'feat: the work');
  const cli = (...args) => spawnSync(process.execPath, [LEDGER, ...args], { cwd: root, encoding: 'utf8', env });
  const init = ['init', 'orders-summary', '--path', 'standard', '--type', 'feature', ...(campaign ? ['--campaign', campaign] : [])];
  assert.equal(cli(...init).status, 0);
  for (const line of ['Plan: approved', 'Review 1: ACCEPT 0/0/0', 'Verify 1: PASS 3 claims, 0 skipped']) {
    const extra = line === 'Plan: approved' ? ['--tasks', '1', '--branch', B] : [];
    assert.equal(cli('add', line, ...extra).status, 0, line);
  }
  const done = () => {
    const out = cli('next', 'orders-summary', '--done');
    assert.equal(out.status, 0, out.stderr);
    return JSON.parse(out.stdout);
  };
  return { root, git, env, done };
}

/** `main` moved by a commit the task branch does not have, HEAD back on the branch. */
function moveMain(p) {
  p.git('switch', '-q', 'main');
  writeFileSync(join(p.root, 'other.txt'), 'a parallel session\n');
  p.git('add', 'other.txt');
  p.git('commit', '-q', '-m', 'feat: elsewhere');
  p.git('switch', '-q', B);
}

/** The options of a done answer, asserting first that it carries them. */
const optionsOf = (answer) => {
  assert.ok(answer.land?.options, `a landing to ask: ${JSON.stringify(answer)}`);
  return answer.land.options;
};
const labels = (answer) => optionsOf(answer).map((o) => o.label);
const DEFAULT = { version: 1, conventions: { land: 'default' } };

test('next --done names what continues a finished task: the landing, the map after it, or the words', () => {
  const node = gitProject({ campaign: 'demo/first' });
  assert.equal(readState(node.root, 'orders-summary').phase, 'finish');
  assert.deepEqual(node.done(), {
    slug: 'orders-summary',
    step: 'done',
    next: joined(MERGE),
    land: { options: [toMap(MERGE), leave(joined(MERGE))], note: null },
  });

  assert.equal(gitProject({ remotes: ['origin'] }).done().next, `git push -u origin ${B}`);
  assert.equal(gitProject().done().next, `git switch main && git merge --ff-only ${B}`);
  assert.equal(gitProject({ branch: 'master' }).done().next, `git switch master && git merge --ff-only ${B}`);
  assert.equal(
    gitProject({ branch: 'trunk', defaultBranch: 'trunk' }).done().next,
    `git switch trunk && git merge --ff-only ${B}`,
    'init.defaultBranch, when that branch exists',
  );
  assert.equal(gitProject({ branch: 'trunk' }).done().next, WORDS);

  const outside = gitProject();
  rmSync(join(outside.root, '.git'), { recursive: true, force: true });
  assert.deepEqual(outside.done(), { slug: 'orders-summary', step: 'done', next: WORDS, land: null });
});

test('next --done pushes where git pushes a new branch: remote.pushDefault, then origin, then the only remote', () => {
  // git remote sorts the names, so backup comes first (fact 68).
  assert.equal(gitProject({ remotes: ['origin', 'backup'] }).done().next, `git push -u origin ${B}`);
  assert.equal(gitProject({ remotes: ['origin', 'backup'], pushDefault: 'backup' }).done().next, `git push -u backup ${B}`);
  assert.equal(gitProject({ remotes: ['fork'] }).done().next, `git push -u fork ${B}`);
  const none = gitProject({ remotes: ['fork', 'backup'] }).done();
  assert.equal(none.next, `push ${B} to its remote`, 'remotes, and none git would push to: the words, never a merge');
  assert.deepEqual(none.land, { options: [leave(`push ${B} to its remote`)], note: 'no remote git would push to — set remote.pushDefault' });
});

test('next --done over a bare remote puts the push first, and conventions.land default puts the landing first', () => {
  const unset = gitProject({ bare: true }).done();
  assert.deepEqual(labels(unset), [`push ${B} to origin`, 'land on main and push it', 'leave it']);
  assert.deepEqual(optionsOf(unset)[1].run, ['git switch main', `git merge --ff-only ${B}`, 'git push origin main']);
  assert.equal(unset.next, `git push -u origin ${B}`);

  const first = gitProject({ bare: true, config: DEFAULT }).done();
  assert.deepEqual(labels(first), ['land on main and push it', `push ${B} to origin`, 'leave it']);
  assert.equal(first.next, `git switch main && git merge --ff-only ${B} && git push origin main`);
});

test('next --done does not offer a push already made, nor a landing already made', () => {
  const p = gitProject({ bare: true });
  p.git('push', '-q', '-u', 'origin', B);
  assert.deepEqual(labels(p.done()), ['land on main and push it', 'leave it']);

  p.git('switch', '-q', 'main');
  p.git('merge', '-q', '--ff-only', B);
  assert.deepEqual(
    optionsOf(p.done()).map((o) => [o.label, o.run]),
    [['push main to origin', ['git push origin main']], ['leave it', []]],
    'landed here, the remote default behind',
  );
  p.git('push', '-q', 'origin', 'main');
  assert.deepEqual(p.done(), { slug: 'orders-summary', step: 'done', next: AFTER, land: null });

  const unpushed = gitProject({ remotes: ['origin'] });
  unpushed.git('switch', '-q', 'main');
  unpushed.git('merge', '-q', '--ff-only', B);
  assert.deepEqual(labels(unpushed.done()), ['push main to origin', 'leave it'], 'a remote that has no main yet is behind it');
});

test('next --done with a tracked change keeps the push and names the file', () => {
  const p = gitProject({ bare: true });
  writeFileSync(join(p.root, 'work.txt'), 'changed\n');
  const dirty = p.done();
  assert.deepEqual(labels(dirty), [`push ${B} to origin`, 'leave it']);
  assert.equal(dirty.land.note, 'uncommitted changes in work.txt — merging needs a clean tree');

  const renamed = gitProject();
  renamed.git('mv', 'work.txt', 'moved.txt');
  assert.equal(renamed.done().land.note, 'uncommitted changes in moved.txt — merging needs a clean tree', 'a rename names its new path (fact 72)');
});

test('next --done with HEAD on another branch asks nothing, and a branch that is gone lands nothing', () => {
  const p = gitProject();
  p.git('switch', '-q', 'main');
  assert.deepEqual(p.done().land, { options: [leave(`git switch ${B}, then /hodos:run orders-summary`)], note: `HEAD is main, not ${B}` });
  p.git('branch', '-q', '-D', B);
  assert.deepEqual(p.done(), { slug: 'orders-summary', step: 'done', next: AFTER, land: null });
});

test("next --done lands on the remote's default when a local branch carries it (D8)", () => {
  const p = gitProject({ bare: true });
  p.git('branch', 'develop', 'main');
  p.git('push', '-q', 'origin', 'develop');
  assert.equal(optionsOf(p.done())[1].run[0], 'git switch main', 'control: no origin/HEAD, so the chain names main');
  p.git('remote', 'set-head', 'origin', 'develop');
  assert.deepEqual(optionsOf(p.done())[1].run, ['git switch develop', `git merge --ff-only ${B}`, 'git push origin develop']);
  p.git('branch', '-q', '-D', 'develop');
  assert.equal(optionsOf(p.done())[1].run[0], 'git switch main', 'origin/HEAD names no local branch: the chain decides');
});

test('next --done on a node whose default moved re-points the map, and the option runs as shown (D7, D14)', () => {
  const p = gitProject({ bare: true, campaign: 'demo/first', map: true, config: DEFAULT });
  // finish's close: node-done at the last task commit, and the map committed on the branch
  const close = spawnSync(process.execPath, [CAMPAIGNS, 'node-done', 'demo', 'first', '--sha', 'HEAD'], { cwd: p.root, encoding: 'utf8', env: p.env });
  assert.equal(close.status, 0, close.stderr);
  p.git('add', MAP_PATH);
  p.git('commit', '-q', '-m', 'chore: first done in campaign demo');
  moveMain(p);

  const [first] = optionsOf(p.done());
  assert.equal(first.label, 'rebase onto main, land and push it');
  assert.deepEqual(first.run, [
    'git rebase main',
    `node "${join(PLUGIN_ROOT, 'scripts', 'campaigns.mjs')}" node-done demo first --sha HEAD~1`,
    `git add ${MAP_PATH}`,
    'git commit -m "{subject}"',
    'git switch main',
    `git merge --ff-only ${B}`,
    'git push origin main',
  ]);
  assert.equal(first.next, TO_MAP);

  // The kernel fills {subject} per conventions.commit, then runs each line verbatim.
  for (const line of first.run.map((l) => l.replace('{subject}', 'chore: first re-pointed in campaign demo'))) {
    const ran = spawnSync(line, { cwd: p.root, encoding: 'utf8', env: p.env, shell: true });
    assert.equal(ran.status, 0, `${line}\n${ran.stderr}`);
  }
  const work = p.git('rev-parse', '--short', 'main~2').trim();
  assert.match(readFileSync(join(p.root, MAP_PATH), 'utf8'), new RegExp(`· ref: sha:${work} ·`), 'the map names the rebased commit');
  assert.equal(p.git('rev-parse', 'main'), p.git('rev-parse', 'origin/main'), 'main landed and pushed');
  assert.deepEqual(p.done(), { slug: 'orders-summary', step: 'done', next: TO_MAP, land: null });
});

test('next --done on a node whose map is in another repository offers no rebase, and names that repository', () => {
  const ws = tempDir('hodos-ws-');
  const home = join(ws, 'home');
  mkdirSync(join(home, '.git'), { recursive: true });
  mkdirSync(join(home, '.claude', 'hodos', 'campaigns'), { recursive: true });
  writeFileSync(join(home, MAP_PATH), MAP_TEXT);
  const p = gitProject({
    at: join(ws, 'away'),
    bare: true,
    campaign: 'demo/first',
    config: { version: 1, campaigns: { external: ['../home/.claude/hodos/campaigns'] } },
  });
  moveMain(p);
  const answer = p.done();
  assert.deepEqual(labels(answer), [`push ${B} to origin`, 'leave it']);
  assert.equal(answer.land.note, `main moved past ${B} and the map lives in home — rebase by hand, then node-done`);
});

test('next --done makes at most 10 git reads, the worst default lookup included', () => {
  // origin/HEAD names a branch with no local copy, init.defaultBranch is unset
  // and main is absent, so every link of the default's chain is tried.
  const p = gitProject({ branch: 'master', bare: true });
  p.git('branch', 'develop', 'master');
  p.git('push', '-q', 'origin', 'develop');
  p.git('remote', 'set-head', 'origin', 'develop');
  p.git('branch', '-q', '-D', 'develop');
  const reads = [];
  const gitRead = (cwd, args) => {
    reads.push(args.join(' '));
    try {
      return execFileSync('git', args, { cwd, encoding: 'utf8', env: p.env, stdio: ['ignore', 'pipe', 'ignore'] });
    } catch {
      return null;
    }
  };
  const dir = join(p.root, '.claude/hodos/tasks/orders-summary');
  const got = nextFacts(dir, readState(p.root, 'orders-summary'), { done: true }, { gitRead });
  assert.equal(got.defaultBranch, 'master');
  assert.ok(reads.length <= 10, `${reads.length} reads:\n${reads.join('\n')}`);
});

test('next --done writes nothing', () => {
  const p = gitProject({ bare: true });
  const before = snapshot(p.root);
  p.done();
  assert.equal(snapshot(p.root), before);
});

test('next --done with no slug is a bad invocation', () => {
  assert.equal(run(started(), 'next', '--done').status, 2);
});

test('nextFacts reads every non-zero git exit as null', () => {
  const { root } = gitProject();
  rmSync(join(root, '.git'), { recursive: true, force: true });
  const dir = join(root, '.claude/hodos/tasks/orders-summary');
  const state = readState(root, 'orders-summary');
  const got = nextFacts(dir, state, { done: true });
  const git = ['remote', 'remotes', 'defaultBranch', 'repo', 'branchExists', 'head', 'dirty', 'ffable', 'merged', 'pushed', 'defaultAhead'];
  assert.deepEqual(
    Object.fromEntries(git.map((k) => [k, got[k]])),
    { remote: null, remotes: 0, defaultBranch: null, repo: false, branchExists: false, head: null, dirty: [], ffable: false, merged: false, pushed: false, defaultAhead: 0 },
  );
  assert.equal(got.done, true);
  assert.deepEqual(
    [got.brief, got.research, got.plan, got.openQuestions, got.rerouted, got.upgradedFromInert],
    [false, false, false, false, false, false],
  );
});

// --- decision 0197: /hodos:handoff asks the same way, through next --handoff <file>.

const HANDOFF = '.claude/hodos/handoffs/orders-summary.md';
const ON_THE_OTHER = '/hodos:run orders-summary on the other machine';
const COMMIT_RUN = [`git add ${HANDOFF}`, `git commit -m "{subject}" -- ${HANDOFF}`];
const handing = (over) => repo({ done: false, handoff: HANDOFF, ...over });
const handed = (options, note = null) => ({ step: 'handoff', next: ON_THE_OTHER, land: { options: [...options, leave(joined(options[0]))], note } });

test('nextStep answers every row of the handoff table (decision 0197)', () => {
  const rows = [
    [
      'a remote: commit and push, commit, leave',
      handing(origin),
      handed([
        opt('commit and push', [...COMMIT_RUN, `git push -u origin ${B}`], ON_THE_OTHER),
        opt('commit', COMMIT_RUN, `git push -u origin ${B}, then ${ON_THE_OTHER}`),
      ]),
    ],
    ['no remote: commit, leave', handing(), handed([opt('commit', COMMIT_RUN, `push ${B}, then ${ON_THE_OTHER}`)])],
    [
      'remotes, and none git pushes to',
      handing({ remotes: 2 }),
      handed([opt('commit', COMMIT_RUN, `push ${B} to its remote, then ${ON_THE_OTHER}`)], 'no remote git would push to — set remote.pushDefault'),
    ],
    [
      'HEAD on another branch',
      handing({ ...origin, head: 'main' }),
      { step: 'handoff', next: `git switch ${B}, then /hodos:handoff orders-summary`, land: { options: [leave(`git switch ${B}, then /hodos:handoff orders-summary`)], note: `HEAD is main, not ${B}` } },
    ],
    ['outside a repository', facts({ handoff: HANDOFF }), { step: 'handoff', next: ON_THE_OTHER, land: null }],
  ];
  for (const [name, f, want] of rows) {
    const got = nextStep(st({ phase: 'execute' }), f);
    assert.deepEqual(got, want, name);
    for (const o of got.land?.options ?? []) {
      for (const line of o.run) assert.doesNotMatch(line, /--force|\s-f\b|reset|\$\(/, `${name}: ${line}`);
    }
  }
});

/** A project mid-task, one commit on its branch, with the handoff file written and not committed. */
function handingProject(options) {
  const p = gitProject(options);
  mkdirSync(join(p.root, '.claude', 'hodos', 'handoffs'), { recursive: true });
  writeFileSync(join(p.root, HANDOFF), '# Handoff — orders-summary\n');
  const handoff = (...args) =>
    spawnSync(process.execPath, [LEDGER, 'next', ...args], { cwd: p.root, encoding: 'utf8', env: p.env });
  return { ...p, handoff };
}

test('next --handoff over a bare remote offers commit and push, commit, and leave, in that order', () => {
  const p = handingProject({ bare: true });
  const out = p.handoff('orders-summary', '--handoff', HANDOFF);
  assert.equal(out.status, 0, out.stderr);
  const answer = JSON.parse(out.stdout);
  assert.equal(answer.step, 'handoff');
  assert.equal(answer.next, ON_THE_OTHER);
  assert.deepEqual(labels(answer), ['commit and push', 'commit', 'leave it']);
  assert.deepEqual(answer.land.options[0].run, [...COMMIT_RUN, `git push -u origin ${B}`]);
});

test('next --handoff with no remote offers commit and leave, and with HEAD elsewhere only the note', () => {
  const p = handingProject();
  const answer = JSON.parse(p.handoff('orders-summary', '--handoff', HANDOFF).stdout);
  assert.deepEqual(labels(answer), ['commit', 'leave it']);
  assert.equal(answer.land.options[0].next, `push ${B}, then ${ON_THE_OTHER}`);

  p.git('switch', '-q', 'main');
  const elsewhere = JSON.parse(p.handoff('orders-summary', '--handoff', HANDOFF).stdout);
  assert.deepEqual(elsewhere.land, {
    options: [leave(`git switch ${B}, then /hodos:handoff orders-summary`)],
    note: `HEAD is main, not ${B}`,
  });
});

test('the handoff commit, run as shown, commits the file alone and leaves staged work staged (fact 74)', () => {
  const p = handingProject();
  writeFileSync(join(p.root, 'work.txt'), 'half done\n');
  p.git('add', 'work.txt');
  const [commit] = optionsOf(JSON.parse(p.handoff('orders-summary', '--handoff', HANDOFF).stdout));
  for (const line of commit.run.map((l) => l.replace('{subject}', 'chore: hand off orders-summary'))) {
    const ran = spawnSync(line, { cwd: p.root, encoding: 'utf8', env: p.env, shell: true });
    assert.equal(ran.status, 0, `${line}\n${ran.stderr}`);
  }
  const shown = p.git('show', '--name-only', '--format=%s', 'HEAD').split('\n').filter((l) => l !== '');
  assert.deepEqual(shown, ['chore: hand off orders-summary', HANDOFF], 'the commit holds the handoff alone');
  assert.match(p.git('status', '--porcelain'), /^M {2}work\.txt$/m, 'the staged work is still staged');
});

test('next takes --done or --handoff, and --handoff needs a slug and a file', () => {
  const p = handingProject();
  assert.equal(p.handoff('orders-summary', '--done', '--handoff', HANDOFF).status, 2);
  assert.equal(p.handoff('--handoff', HANDOFF).status, 2);
  assert.equal(p.handoff('orders-summary', '--handoff').status, 2);
});

test('nextFacts spawns no git with git: false, and reads it for a done answer', () => {
  const { root } = gitProject();
  const dir = join(root, '.claude/hodos/tasks/orders-summary');
  const state = readState(root, 'orders-summary');
  const calls = [];
  const gitRead = (cwd, args) => {
    calls.push(args.join(' '));
    return null;
  };
  nextFacts(dir, state, { done: true, git: false }, { gitRead });
  assert.deepEqual(calls, []);
  nextFacts(dir, state, { done: true }, { gitRead });
  assert.deepEqual(calls, ['remote'], 'control: a done answer reads git, and stops at the first read that says no repository');
});

test('latestTask is null with no task in flight', () => {
  assert.equal(latestTask(project()), null);
});
