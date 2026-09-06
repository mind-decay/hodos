// Projects are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { segments, words } from './git-guard.mjs';

const GUARD = fileURLToPath(new URL('./git-guard.mjs', import.meta.url));

function project({ gates = { denyDangerousGit: true }, phase = null } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-guard-')));
  mkdirSync(join(root, '.git'), { recursive: true });
  mkdirSync(join(root, '.claude', 'hodos', 'tasks'), { recursive: true });
  writeFileSync(join(root, '.claude', 'hodos', 'config.json'), JSON.stringify({ version: 1, gates }));
  if (phase) {
    const taskDir = join(root, '.claude', 'hodos', 'tasks', 'orders-summary');
    mkdirSync(taskDir, { recursive: true });
    writeFileSync(join(root, '.claude', 'hodos', 'active'), 'orders-summary\n');
    writeFileSync(join(taskDir, 'state.json'), JSON.stringify({ slug: 'orders-summary', phase }));
  }
  return root;
}

/** Run the guard the way Claude Code does: payload on stdin, decision on stdout. */
function decide(root, command) {
  const out = spawnSync(process.execPath, [GUARD], {
    input: JSON.stringify({ tool_name: 'Bash', cwd: root, tool_input: { command } }),
    encoding: 'utf8',
  });
  assert.equal(out.status, 0, 'the guard always exits 0');
  if (out.stdout.trim() === '') return { decision: null };
  const parsed = JSON.parse(out.stdout);
  return {
    decision: parsed.hookSpecificOutput.permissionDecision,
    reason: parsed.hookSpecificOutput.permissionDecisionReason,
  };
}

const denied = (root, command) => assert.equal(decide(root, command).decision, 'deny', command);
const allowed = (root, command) => assert.equal(decide(root, command).decision, null, command);

test('denyDangerousGit denies the four dangerous forms', () => {
  const root = project();

  denied(root, 'git push --force');
  denied(root, 'git push -f origin main');
  denied(root, 'git commit --no-verify -m "wip"');
  denied(root, 'git reset --hard HEAD~1');
  denied(root, 'rm -rf src');
});

test('denyDangerousGit allows what only looks dangerous', () => {
  const root = project();

  allowed(root, 'echo "git push --force"');
  allowed(root, 'FOO=1 git status');
  allowed(root, `rm -rf ${join(root, '.claude/hodos/tasks/x')}`);
  allowed(root, 'git push origin main');
  allowed(root, 'git commit -m "feat: add the widget"');
  allowed(root, 'git reset HEAD~1');
  allowed(root, 'rm -f package-lock.json');
  allowed(root, 'npm run build && git status');
});

test('an rm -rf that names one path outside the task directory is denied', () => {
  const root = project();
  const inside = join(root, '.claude/hodos/tasks/x');

  denied(root, `rm -rf ${inside} src`);
  assert.match(decide(root, `rm -rf ${inside} src`).reason, /rm -rf src is denied/);
});

test('a dangerous segment anywhere in a chain is denied', () => {
  const root = project();

  denied(root, 'npm test && git push --force');
  denied(root, 'git status; git reset --hard');
});

test('blockCommitOnFailedReview denies a commit only in phase fix', () => {
  const inFix = project({ gates: { blockCommitOnFailedReview: true }, phase: 'fix' });
  const inExecute = project({ gates: { blockCommitOnFailedReview: true }, phase: 'execute' });

  denied(inFix, 'git commit -m x');
  assert.match(decide(inFix, 'git commit -m x').reason, /while the task is in fix/);
  allowed(inExecute, 'git commit -m x');
  allowed(inFix, 'git push --force', 'the other gate is off');
});

test('with both gates off everything is allowed', () => {
  const root = project({ gates: { denyDangerousGit: false, blockCommitOnFailedReview: false } });

  allowed(root, 'git push --force');
  allowed(root, 'rm -rf src');
  allowed(root, 'git reset --hard');
});

test('with no config, no gates section, or a broken payload the guard says nothing', () => {
  const bare = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-noguard-')));
  allowed(bare, 'git push --force');

  const noGates = project({ gates: {} });
  allowed(noGates, 'git push --force');

  const out = spawnSync(process.execPath, [GUARD], { input: 'not json', encoding: 'utf8' });
  assert.equal(out.status, 0);
  assert.equal(out.stdout, '');
});

test('segments splits on the operators, never inside quotes', () => {
  assert.deepEqual(segments('a && b || c ; d | e'), ['a', 'b', 'c', 'd', 'e']);
  assert.deepEqual(segments('echo "a && b"'), ['echo "a && b"']);
  assert.deepEqual(segments("echo 'x; y'"), ["echo 'x; y'"]);
});

test('words drops one level of quoting and keeps the rest', () => {
  assert.deepEqual(words('git commit -m "feat: x"'), ['git', 'commit', '-m', 'feat: x']);
  assert.deepEqual(words('  rm   -rf   src  '), ['rm', '-rf', 'src']);
  assert.deepEqual(words('echo ""'), ['echo', '']);
});

test('--help exits 0', () => {
  const out = spawnSync(process.execPath, [GUARD, '--help'], { encoding: 'utf8' });

  assert.equal(out.status, 0);
  assert.match(out.stdout, /Usage: node scripts\/git-guard\.mjs/);
});

test('a lease push is not the force push the gate names', () => {
  const root = project();

  allowed(root, 'git push --force-with-lease');
  allowed(root, 'git push --force-with-lease --force-if-includes origin main');
});

test('a git global option does not hide the subcommand', () => {
  const root = project();

  denied(root, 'git -C /tmp push --force');
  denied(root, 'git -c user.name=x push --force');
  denied(root, 'git --git-dir=/tmp/.git reset --hard');
  allowed(root, 'git -C /tmp status');
});

test('a bundled short flag is still the flag', () => {
  const root = project();

  denied(root, 'git push -uf origin main');
  denied(root, 'git push -fu origin main');
  denied(root, 'git commit -an -m x');
  allowed(root, 'git push -u origin main');
  allowed(root, 'git commit -am x');
});

// --- decision 0047: the commit gate reads the session's own task.

test('blockCommitOnFailedReview follows the session pointer, not active', () => {
  const root = project({ gates: { blockCommitOnFailedReview: true }, phase: 'execute' });
  const other = join(root, '.claude', 'hodos', 'tasks', 'users-export');
  mkdirSync(other, { recursive: true });
  writeFileSync(join(other, 'state.json'), JSON.stringify({ slug: 'users-export', phase: 'fix' }));
  mkdirSync(join(root, '.claude', 'hodos', 'sessions'), { recursive: true });
  writeFileSync(join(root, '.claude', 'hodos', 'sessions', 'sess-a'), 'users-export\n');

  const out = spawnSync(process.execPath, [GUARD], {
    input: JSON.stringify({
      tool_name: 'Bash',
      session_id: 'sess-a',
      cwd: root,
      tool_input: { command: 'git commit -m x' },
    }),
    encoding: 'utf8',
  });

  assert.equal(JSON.parse(out.stdout).hookSpecificOutput.permissionDecision, 'deny');
});

test('the session whose own task is not in fix commits freely', () => {
  const root = project({ gates: { blockCommitOnFailedReview: true }, phase: 'fix' });
  mkdirSync(join(root, '.claude', 'hodos', 'tasks', 'users-export'), { recursive: true });
  writeFileSync(
    join(root, '.claude', 'hodos', 'tasks', 'users-export', 'state.json'),
    JSON.stringify({ slug: 'users-export', phase: 'execute' }),
  );
  mkdirSync(join(root, '.claude', 'hodos', 'sessions'), { recursive: true });
  writeFileSync(join(root, '.claude', 'hodos', 'sessions', 'sess-a'), 'users-export\n');

  const out = spawnSync(process.execPath, [GUARD], {
    input: JSON.stringify({
      tool_name: 'Bash',
      session_id: 'sess-a',
      cwd: root,
      tool_input: { command: 'git commit -m x' },
    }),
    encoding: 'utf8',
  });

  assert.equal(out.stdout.trim(), '');
});
