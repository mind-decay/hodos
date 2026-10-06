// The state band's module (decisions 0202, 0203) under node:test. The engine
// loads it with no Node and hands it `on`, `$` and the global `h`; here all
// three are plain objects, so what differs from the engine is only who calls
// `register` and who draws the tree. A test of the tree pins the shape this
// module builds, not what the engine paints. Projects are generated in temp
// dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { register } from './state-row.mjs';
import { tempDir } from '../scripts/temp-dir.mjs';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const MODULE = fileURLToPath(new URL('./state-row.mjs', import.meta.url));
const SESSION = 'aaaa1111-bbbb-2222-cccc-333344445555';
const LINE = 'users-export execute → /hodos:run users-export';

// The engine's element factory is a global the module never imports
// (PLATFORM-NOTES.md fact 78); this one returns the element as data.
globalThis.h = (tag, props, ...children) => ({ tag, props, children });
const Text = function Text() {};
const drawn = (line) => h(Text, { color: 'magenta' }, `● ${line}`);

/** A render event for the band, as the terminal raises it. */
const band = (hasSurvey = false) => ({
  surface: 'terminal',
  component: 'AbovePrompt',
  props: { hasSurvey, isWorking: false, maxRows: 5, bodyColumns: 75 },
});

/** The hooks one `register` adds, by event, and the band's matcher. */
function hooks() {
  const on = {};
  const matchers = {};
  register((event, ...args) => {
    on[event] = args.at(-1);
    if (args.length === 2) matchers[event] = args[0];
  });
  assert.equal(typeof on['session.start'], 'function', 'session.start is hooked');
  assert.equal(typeof on['turn.complete'], 'function', 'turn.complete is hooked');
  assert.equal(typeof on['ui.render'], 'function', 'ui.render is hooked');
  assert.deepEqual(matchers['ui.render'], { component: 'AbovePrompt' });
  return on;
}

/**
 * A `$` whose run answers `setup.result`, or rejects when it is an Error, and
 * the record of what was asked of it. `setup` is read on every call, so a test
 * can change the answer between events. `order` interleaves the runs and the
 * invalidations with the `next` calls of the chain beneath.
 */
function engine(setup = {}) {
  const now = { result: { exitCode: 0, stdout: `${LINE}\n`, stderr: '' }, id: async () => SESSION, ...setup };
  const runs = [];
  const invalidated = [];
  const resolved = [];
  const order = [];
  const answer = { text: 'the answer' };
  const passed = { tree: 'the hooks beneath' };
  const $ = {
    plugin: { root: '/plugin' },
    session: { id: () => now.id() },
    process: {
      run: async (argv, init) => {
        order.push('run');
        runs.push({ argv, init });
        if (now.result instanceof Error) throw now.result;
        return now.result;
      },
    },
    ui: {
      invalidate: (event) => {
        order.push('invalidate');
        invalidated.push(event);
      },
      resolve: (e) => {
        resolved.push(e);
        return Object.freeze({ Text });
      },
    },
  };
  const next = async (e) => {
    order.push('next');
    return e.component === 'AbovePrompt' ? passed : answer;
  };
  return { $, next, now, answer, passed, runs, invalidated, resolved, order };
}

test('an interactive start draws the line the digest prints for this session, through a real node', async () => {
  const project = tempDir('hodos-row-');
  const hodos = join(project, '.claude', 'hodos');
  mkdirSync(join(hodos, 'sessions'), { recursive: true });
  writeFileSync(join(hodos, 'config.json'), JSON.stringify({ version: 1, verifiedAt: '2026-10-05' }));
  const seed = (slug, phase, updatedAt) => {
    mkdirSync(join(hodos, 'tasks', slug), { recursive: true });
    writeFileSync(join(hodos, 'tasks', slug, 'ledger.md'), '2026-10-05T10:00:00Z Init: standard feature\n');
    writeFileSync(join(hodos, 'tasks', slug, 'state.json'), JSON.stringify({ slug, phase, updatedAt }));
  };
  seed('users-export', 'execute', '2026-10-05T10:00:00.000Z');
  // Updated later, so a run that lost the session id would name this one.
  seed('orders-summary', 'review', '2026-10-05T12:00:00.000Z');
  writeFileSync(join(hodos, 'sessions', SESSION), 'users-export\n');

  const { $, next } = engine();
  // The engine finds `node` on its own PATH (PLATFORM-NOTES.md fact 42); here
  // it is the node running this test, over the host's environment.
  $.process.run = async (argv, { env, timeoutMs }) => {
    assert.equal(argv[0], 'node');
    const out = spawnSync(process.execPath, argv.slice(1), {
      cwd: project,
      env: { ...process.env, ...env },
      timeout: timeoutMs,
      encoding: 'utf8',
    });
    return { exitCode: out.status ?? 1, stdout: out.stdout, stderr: out.stderr };
  };
  $.plugin.root = ROOT;
  const on = hooks();

  await on['session.start']($, { cwd: project, isInteractive: true }, next);

  assert.deepEqual(await on['ui.render']($, band(), next), drawn('users-export execute → /hodos:run users-export'));
});

test('an interactive start runs the digest with the session id after next, invalidates the band once, and the band draws the trimmed line', async () => {
  const { $, next, answer, runs, invalidated, resolved, order } = engine();
  const on = hooks();

  assert.equal(await on['session.start']($, { cwd: '/p', isInteractive: true }, next), answer);
  assert.deepEqual(runs, [{
    argv: ['node', '/plugin/scripts/state-digest.mjs', '--row'],
    init: { env: { CLAUDE_CODE_SESSION_ID: SESSION }, timeoutMs: 5000 },
  }]);
  assert.deepEqual(invalidated, ['ui.render']);
  assert.deepEqual(order, ['next', 'run', 'invalidate']);

  const e = band();
  assert.deepEqual(await on['ui.render']($, e, next), drawn(LINE));
  assert.deepEqual(resolved, [e]);
  // The render reads the line; it never spawns the digest itself.
  assert.equal(runs.length, 1);
});

test('a headless start runs nothing and invalidates nothing, and neither does a turn after it; the band passes', async () => {
  const { $, next, passed, runs, invalidated } = engine();
  const on = hooks();

  await on['session.start']($, { cwd: '/p', isInteractive: false }, next);
  await on['turn.complete']($, { reason: 'answer' }, next);

  assert.deepEqual(runs, []);
  assert.deepEqual(invalidated, []);
  assert.equal(await on['ui.render']($, band(), next), passed);
});

test("a main-thread turn refreshes the line after next and invalidates the band, and a subagent's turn runs nothing", async () => {
  const { $, next, now, runs, invalidated, order } = engine();
  const on = hooks();
  await on['session.start']($, { cwd: '/p', isInteractive: true }, next);

  now.result = { exitCode: 0, stdout: 'orders-summary review → /hodos:run orders-summary\n', stderr: '' };
  await on['turn.complete']($, { reason: 'answer' }, next);
  assert.equal(runs.length, 2);
  assert.deepEqual(invalidated, ['ui.render', 'ui.render']);
  assert.deepEqual(order, ['next', 'run', 'invalidate', 'next', 'run', 'invalidate']);
  assert.deepEqual(await on['ui.render']($, band(), next), drawn('orders-summary review → /hodos:run orders-summary'));

  await on['turn.complete']($, { reason: 'answer', agentId: 'a1b2' }, next);
  assert.equal(runs.length, 2);
  assert.deepEqual(invalidated, ['ui.render', 'ui.render']);
});

test('a failed run empties the line, invalidates the band, and the hook still resolves to what next resolved', async () => {
  const cases = {
    'exit code 1': { result: { exitCode: 1, stdout: `${LINE}\n`, stderr: 'boom' } },
    'empty stdout': { result: { exitCode: 0, stdout: '\n', stderr: '' } },
    'a rejected run': { result: new Error('spawn node ENOENT') },
    'a rejected session id': { id: async () => { throw new Error('no session'); } },
  };
  for (const [name, failure] of Object.entries(cases)) {
    const { $, next, now, answer, passed, invalidated } = engine();
    const on = hooks();
    await on['session.start']($, { cwd: '/p', isInteractive: true }, next);
    assert.deepEqual(await on['ui.render']($, band(), next), drawn(LINE), name);

    Object.assign(now, failure);
    assert.equal(await on['turn.complete']($, { reason: 'answer' }, next), answer, name);
    assert.deepEqual(invalidated, ['ui.render', 'ui.render'], name);
    assert.equal(await on['ui.render']($, band(), next), passed, name);
  }
});

test('the band yields to a survey: with a line set, it returns exactly what next resolved', async () => {
  const { $, next, passed } = engine();
  const on = hooks();
  await on['session.start']($, { cwd: '/p', isInteractive: true }, next);

  assert.equal(await on['ui.render']($, band(true), next), passed);
  assert.deepEqual(await on['ui.render']($, band(false), next), drawn(LINE));
});

test('every event hook resolves to exactly what its next resolved, whichever branch it took', async () => {
  for (const isInteractive of [true, false]) {
    for (const agentId of [undefined, 'a1b2']) {
      const { $, next, answer } = engine();
      const on = hooks();
      const label = `interactive ${isInteractive}, agent ${agentId}`;

      assert.equal(await on['session.start']($, { cwd: '/p', isInteractive }, next), answer, label);
      assert.equal(await on['turn.complete']($, { reason: 'answer', agentId }, next), answer, label);
    }
  }
});

test('the module imports nothing, since it runs with no Node, and never calls the status row', () => {
  const source = readFileSync(MODULE, 'utf8');
  assert.doesNotMatch(source, /\bimport\b/);
  assert.doesNotMatch(source, /ui\.status/);
});
