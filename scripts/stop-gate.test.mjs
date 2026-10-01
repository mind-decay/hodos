// Projects are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { openItem } from './stop-gate.mjs';
import { tempDir } from './temp-dir.mjs';

const GATE = fileURLToPath(new URL('./stop-gate.mjs', import.meta.url));

const STATE = {
  slug: 'orders-summary',
  phase: 'execute',
  tasks: { total: 2, done: 1, current: 2 },
  review: { iteration: 0, verdict: null },
  verify: { iteration: 0, verdict: null },
  lastEvent: 'Task 1: done (d4e5f6a)',
  updatedAt: '2026-08-31T11:30:00Z',
};

function project({ gate = true, state = {} } = {}) {
  const root = tempDir('hodos-stop-');
  mkdirSync(join(root, '.git'), { recursive: true });
  const taskDir = join(root, '.claude', 'hodos', 'tasks', 'orders-summary');
  mkdirSync(taskDir, { recursive: true });
  writeFileSync(
    join(root, '.claude', 'hodos', 'config.json'),
    JSON.stringify({ version: 1, gates: { stopHookLedger: gate } }),
  );
  writeFileSync(join(root, '.claude', 'hodos', 'active'), 'orders-summary\n');
  writeFileSync(join(taskDir, 'state.json'), JSON.stringify({ ...STATE, ...state }));
  return { root, taskDir };
}

const run = (root) => spawnSync(process.execPath, [GATE], { cwd: root, encoding: 'utf8' });

/** The Stop hook with a chosen payload and no inherited session id. */
function stopAs(root, payload) {
  const env = { ...process.env };
  delete env.CLAUDE_CODE_SESSION_ID;
  return spawnSync(process.execPath, [GATE], {
    cwd: root,
    encoding: 'utf8',
    env,
    input: payload ? JSON.stringify({ cwd: root, ...payload }) : '',
  });
}

/** Another session holds a pointer to the open task. */
function heldElsewhere(root) {
  mkdirSync(join(root, '.claude', 'hodos', 'sessions'), { recursive: true });
  writeFileSync(join(root, '.claude', 'hodos', 'sessions', 'sess-a'), 'orders-summary\n');
}

test('the gate is off by default', () => {
  const { root } = project({ gate: false });
  const out = run(root);

  assert.equal(out.status, 0);
  assert.equal(out.stderr, '');
});

test('with no config it exits 0 silently', () => {
  const bare = tempDir('hodos-nostop-');
  const out = run(bare);

  assert.equal(out.status, 0);
  assert.equal(out.stdout, '');
  assert.equal(out.stderr, '');
});

test('phase execute blocks with the open task', () => {
  const { root } = project();
  const out = run(root);

  assert.equal(out.status, 2);
  assert.match(out.stderr, /^hodos: orders-summary \[execute\] — open: Task 2\./);
  assert.match(out.stderr, /\.claude\/hodos\/tasks\/orders-summary\/ledger\.md/);
});

test('a phase with nothing open does not block', () => {
  for (const phase of ['plan', 'approved', 'finish', 'manual', 'done']) {
    const { root } = project({ state: { phase } });
    assert.equal(run(root).status, 0, phase);
  }
});

test('six consecutive blocks, then the seventh lets the session stop', () => {
  const { root } = project();
  for (let i = 1; i <= 6; i += 1) assert.equal(run(root).status, 2, `call ${i}`);

  const seventh = run(root);
  assert.equal(seventh.status, 0);
  assert.equal(seventh.stderr, '', 'the seventh call says nothing either');
});

test('a changed updatedAt resets the count', () => {
  const { root, taskDir } = project();
  for (let i = 1; i <= 6; i += 1) run(root);
  assert.equal(run(root).status, 0, 'the limit is reached');

  writeFileSync(join(taskDir, 'state.json'), JSON.stringify({ ...STATE, updatedAt: '2026-08-31T12:00:00Z' }));
  assert.equal(run(root).status, 2, 'the task moved, so this is a new reason to stop');
});

test('the count lives in its own file, not in state.json', () => {
  const { root, taskDir } = project();
  run(root);
  run(root);

  assert.equal(readFileSync(join(taskDir, 'stop-count'), 'utf8').trim(), `2 ${STATE.updatedAt}`);
  assert.equal(JSON.parse(readFileSync(join(taskDir, 'state.json'), 'utf8')).stopCount, undefined);
});

test('openItem names the item of each open phase', () => {
  assert.equal(openItem({ ...STATE, phase: 'execute' }), 'Task 2');
  assert.equal(openItem({ ...STATE, phase: 'review', review: { iteration: 1 } }), 'Review 2');
  assert.equal(openItem({ ...STATE, phase: 'verify', verify: { iteration: 0 } }), 'Verify 1');
  assert.equal(
    openItem({ ...STATE, phase: 'fix', review: { iteration: 1 }, lastEvent: 'Review 1: NEEDS_WORK (0/2/0)' }),
    'Fix 1',
  );
  assert.equal(
    openItem({ ...STATE, phase: 'fix', verify: { iteration: 2 }, lastEvent: 'Verify 2: FAIL 3 claims, 0 skipped' }),
    'Fix 2',
  );
  assert.equal(openItem({ ...STATE, phase: 'done' }), null);
});

test('--help exits 0', () => {
  const out = spawnSync(process.execPath, [GATE, '--help'], { encoding: 'utf8' });

  assert.equal(out.status, 0);
  assert.match(out.stdout, /Usage: node scripts\/stop-gate\.mjs/);
});

test('a ledger event in the same second still resets the count', () => {
  const root = tempDir('hodos-stopreal-');
  mkdirSync(join(root, '.claude', 'hodos'), { recursive: true });
  writeFileSync(
    join(root, '.claude', 'hodos', 'config.json'),
    JSON.stringify({ version: 1, gates: { stopHookLedger: true } }),
  );
  execFileSync('git', ['init', '-q'], { cwd: root });
  const ledger = fileURLToPath(new URL('./ledger.mjs', import.meta.url));
  const add = (...args) => execFileSync(process.execPath, [ledger, ...args], { cwd: root, encoding: 'utf8' });
  add('init', 'stop probe', '--path', 'quick', '--type', 'feature');
  add('add', 'Task 1: started');

  for (let i = 1; i <= 6; i += 1) assert.equal(run(root).status, 2, `call ${i}`);
  assert.equal(run(root).status, 0, 'the limit is reached');

  // Same wall-clock second as the blocks: the ledger moved, so the reason did.
  add('add', 'Task 1: test red');
  assert.equal(run(root).status, 2, 'the task moved, so the gate has a new reason to stop');
});

// --- decision 0047: the gate blocks on the session's own task.

test('the payload session_id picks the task, not whatever active names', () => {
  const { root } = project({ state: { phase: 'done' } }); // active → orders-summary, nothing open
  const other = join(root, '.claude', 'hodos', 'tasks', 'users-export');
  mkdirSync(other, { recursive: true });
  writeFileSync(
    join(other, 'state.json'),
    JSON.stringify({ ...STATE, slug: 'users-export', phase: 'review', review: { iteration: 1, verdict: 'NEEDS_WORK' } }),
  );
  mkdirSync(join(root, '.claude', 'hodos', 'sessions'), { recursive: true });
  writeFileSync(join(root, '.claude', 'hodos', 'sessions', 'sess-a'), 'users-export\n');

  const out = spawnSync(process.execPath, [GATE], {
    cwd: root,
    input: JSON.stringify({ session_id: 'sess-a', cwd: root, hook_event_name: 'Stop' }),
    encoding: 'utf8',
  });

  assert.equal(out.status, 2);
  assert.match(out.stderr, /users-export \[review\] — open: Review 2/);
});

test('a session with no pointer still blocks on the active task', () => {
  const { root } = project();

  const out = spawnSync(process.execPath, [GATE], {
    cwd: root,
    input: JSON.stringify({ session_id: 'sess-stranger', cwd: root, hook_event_name: 'Stop' }),
    encoding: 'utf8',
  });

  assert.equal(out.status, 2);
  assert.match(out.stderr, /orders-summary \[execute\]/);
});

// --- decision 0171: a session with no pointer of its own is not gated on
// another session's task, and the Stop says why it did not block.

test('a caller with no id is not blocked on a task another session holds, and says why', () => {
  const { root, taskDir } = project();
  heldElsewhere(root);

  const out = stopAs(root, null);

  assert.equal(out.status, 0);
  assert.match(out.stderr, /1 other session holds a task/);
  assert.equal(existsSync(join(taskDir, 'stop-count')), false, 'the other task\'s count is not this session\'s');
});

test('a session whose id names no pointer is not blocked on another session\'s task', () => {
  const { root } = project();
  heldElsewhere(root);

  const out = stopAs(root, { session_id: 'sess-stranger' });

  assert.equal(out.status, 0);
  assert.match(out.stderr, /1 other session holds a task/);
});

test('a claim made with no id still blocks through active while no session holds a pointer', () => {
  const { root } = project();

  assert.equal(stopAs(root, null).status, 2);
  assert.equal(stopAs(root, { session_id: 'sess-stranger' }).status, 2);
});
