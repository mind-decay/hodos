// The hooks manifest and the contract every hook shares: silent, fast, exit 0
// when the project has no hodos config (COMPONENTS.md §4, DESIGN.md §10).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, existsSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MANIFEST = JSON.parse(readFileSync(join(ROOT, 'hooks', 'hooks.json'), 'utf8'));

const SCRIPTS = [
  'config.mjs',
  'ledger.mjs',
  'state-digest.mjs',
  'verify-citations.mjs',
  'git-guard.mjs',
  'stop-gate.mjs',
  'lint.mjs',
];

/** Every hook entry of the manifest, with the event and matcher it sits under. */
function entries() {
  const out = [];
  for (const [event, matchers] of Object.entries(MANIFEST.hooks)) {
    for (const matcher of matchers) {
      for (const hook of matcher.hooks) out.push({ event, matcher: matcher.matcher, hook });
    }
  }
  return out;
}

test('the manifest carries the six entries of COMPONENTS.md §4', () => {
  const shape = entries().map((e) => `${e.event}${e.matcher ? `(${e.matcher})` : ''}: ${e.hook.args.join(' ')}`);

  assert.deepEqual(shape, [
    'SessionStart(startup|resume|clear): ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs',
    'SessionStart(compact): ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs --compact',
    'PreCompact: ${CLAUDE_PLUGIN_ROOT}/scripts/ledger.mjs add Compact: session compacted',
    'PostToolUse(Write|Edit): ${CLAUDE_PLUGIN_ROOT}/scripts/lint.mjs --hook',
    'PreToolUse(Bash): ${CLAUDE_PLUGIN_ROOT}/scripts/git-guard.mjs',
    'Stop: ${CLAUDE_PLUGIN_ROOT}/scripts/stop-gate.mjs',
  ]);
});

test('every entry uses the exec form with a timeout of at most 10 seconds', () => {
  for (const { event, hook } of entries()) {
    assert.equal(hook.type, 'command', event);
    assert.equal(hook.command, 'node', `${event}: the exec form keeps the shell out of it`);
    assert.ok(hook.timeout <= 10, `${event}: timeout ${hook.timeout}`);
    assert.match(hook.args[0], /^\$\{CLAUDE_PLUGIN_ROOT\}\/scripts\/[a-z-]+\.mjs$/, event);
  }
});

test('every script a hook names exists', () => {
  for (const { hook } of entries()) {
    const rel = hook.args[0].replace('${CLAUDE_PLUGIN_ROOT}/', '');
    assert.ok(existsSync(join(ROOT, rel)), rel);
  }
});

test('in a project with no config every hook is silent, exits 0, and is quick', () => {
  const bare = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-hooks-')));
  // A payload every hook can read: the two that take one use different keys of it.
  const payload = JSON.stringify({
    session_id: 'test',
    cwd: bare,
    tool_name: 'Bash',
    tool_input: { command: 'git push --force', file_path: join(bare, 'src/x.ts') },
  });

  for (const { event, hook } of entries()) {
    const args = hook.args.map((a) => a.replace('${CLAUDE_PLUGIN_ROOT}', ROOT));
    const started = process.hrtime.bigint();
    const out = spawnSync(process.execPath, args, { cwd: bare, input: payload, encoding: 'utf8' });
    const ms = Number(process.hrtime.bigint() - started) / 1e6;

    assert.equal(out.status, 0, `${event}: exit ${out.status}`);
    assert.equal(out.stdout, '', `${event}: stdout`);
    assert.equal(out.stderr, '', `${event}: stderr`);
    // Wall clock, so it is only honest with the runner serialised — npm test
    // passes --test-concurrency=1 for this assertion's sake. Stage 5 added a
    // test file that spawns git and pushed this over 200 ms while measuring
    // nothing about the hook.
    assert.ok(ms < 200, `${event}: ${ms.toFixed(0)} ms`);
  }
});

test('every script prints usage on --help and exits 0', () => {
  for (const script of SCRIPTS) {
    const out = spawnSync(process.execPath, [join(ROOT, 'scripts', script), '--help'], { encoding: 'utf8' });

    assert.equal(out.status, 0, script);
    assert.match(out.stdout, new RegExp(`Usage: node scripts/${script.replace('.', '\\.')}`), script);
  }
});

test('in a project with an active task the hooks do what COMPONENTS.md §4 says', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-hooked-')));
  mkdirSync(join(root, '.claude', 'hodos'), { recursive: true });
  writeFileSync(join(root, '.claude', 'hodos', 'config.json'), JSON.stringify({ version: 1, verifiedAt: '2026-08-31' }));
  execFileSync('git', ['init', '-q'], { cwd: root });
  execFileSync(process.execPath, [join(ROOT, 'scripts', 'ledger.mjs'), 'init', 'compact check', '--path', 'quick', '--type', 'feature'], { cwd: root });

  const hookOf = (event, matcher) =>
    entries().find((e) => e.event === event && (matcher === undefined || e.matcher === matcher)).hook;
  const runHook = (hook) =>
    spawnSync(process.execPath, hook.args.map((a) => a.replace('${CLAUDE_PLUGIN_ROOT}', ROOT)), {
      cwd: root,
      input: '{}',
      encoding: 'utf8',
    });

  const digest = runHook(hookOf('SessionStart', 'startup|resume|clear'));
  assert.match(digest.stdout, /^hodos: config verified 2026-08-31 · 1 active task$/m);

  const compact = runHook(hookOf('SessionStart', 'compact'));
  assert.match(compact.stdout, /ledger \.claude\/hodos\/tasks\/compact-check\/ledger\.md/);

  const preCompact = runHook(hookOf('PreCompact'));
  assert.equal(preCompact.status, 0, preCompact.stderr);
  const ledger = readFileSync(join(root, '.claude/hodos/tasks/compact-check/ledger.md'), 'utf8');
  assert.match(ledger, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z Compact: session compacted$/m);
});
