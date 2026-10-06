// The settings files here are generated in temp dirs and the plugin roots are
// strings: `repoint` reads no disk, and `repointFile` reads only the project's
// `.claude/settings.local.json` (decision 0204).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { repoint, repointFile, scriptsRule } from './permissions.mjs';
import { tempDir } from './temp-dir.mjs';

const CACHE = '/Users/dev/.claude/plugins/cache';
const P = `${CACHE}/hodos/hodos`;
const ROOT = `${P}/0.3.1`;
const CURRENT = `Bash(node ${ROOT}/scripts/*)`;
const stale = (version) => `Bash(node ${P}/${version}/scripts/*)`;
const allowOf = (...allow) => ({ permissions: { allow } });

/** A project whose `.claude/settings.local.json` holds `text`, or none when `text` is undefined. */
function project(text) {
  const root = tempDir('hodos-permissions-');
  mkdirSync(join(root, '.claude'));
  if (text !== undefined) writeFileSync(join(root, '.claude', 'settings.local.json'), text);
  return root;
}

const settingsPath = (root) => join(root, '.claude', 'settings.local.json');

/** A `write` that records its calls and writes nothing. */
function spyWrite() {
  const calls = [];
  const write = (...args) => calls.push(args);
  write.calls = calls;
  return write;
}

test('a stale init rule becomes the running root’s rule at the same index', () => {
  assert.equal(scriptsRule(ROOT), CURRENT);

  const moved = repoint(allowOf('Bash(npm test)', stale('0.2.2'), 'Read(*)'), ROOT);
  assert.deepEqual(moved.settings.permissions.allow, ['Bash(npm test)', CURRENT, 'Read(*)']);
  assert.deepEqual(moved.from, ['0.2.2']);
  assert.equal(moved.to, '0.3.1');

  // A version is the manifest's, a 12-character commit SHA, or `unknown`
  // (PLATFORM-NOTES.md fact 80): any one segment moves.
  for (const version of ['a1b2c3d4e5f6', 'unknown']) {
    const other = repoint(allowOf(stale(version)), ROOT);
    assert.deepEqual(other.settings.permissions.allow, [CURRENT], version);
    assert.deepEqual(other.from, [version]);
  }
});

test('several stale rules and a current one converge to one current rule at the first one’s index', () => {
  const two = repoint(allowOf(stale('0.2.1'), 'Bash(npm test)', stale('0.2.2')), ROOT);
  assert.deepEqual(two.settings.permissions.allow, [CURRENT, 'Bash(npm test)']);
  assert.deepEqual(two.from, ['0.2.1', '0.2.2']);
  assert.deepEqual(repoint(allowOf(CURRENT, stale('0.2.2')), ROOT).settings.permissions.allow, [CURRENT]);
  assert.deepEqual(repoint(allowOf(stale('0.2.2'), CURRENT), ROOT).settings.permissions.allow, [CURRENT]);
});

test('the file is rewritten atomically as two-space JSON with a trailing newline', () => {
  const input = { permissions: { allow: [stale('0.2.2')] }, env: { A: '1' } };
  const root = project(JSON.stringify(input));

  const result = repointFile(root, ROOT);

  assert.deepEqual(result, { from: ['0.2.2'], to: '0.3.1' });
  const expected = { permissions: { allow: [CURRENT] }, env: { A: '1' } };
  assert.equal(readFileSync(settingsPath(root), 'utf8'), `${JSON.stringify(expected, null, 2)}\n`);
  assert.deepEqual(readdirSync(join(root, '.claude')).filter((name) => name.endsWith('.tmp')), []);
});

test('every entry and key that is not this plugin’s scripts rule keeps its value and order', () => {
  const input = {
    enabledPlugins: { 'hodos@hodos': true },
    permissions: {
      allow: ['Bash(git status)', stale('0.2.2'), 'Read(*)', 'Bash(npm test)'],
      deny: [stale('0.2.2'), 'Bash(rm -rf *)'],
      ask: [stale('0.2.1')],
      defaultMode: 'default',
    },
    env: { HODOS: '1' },
  };
  const before = structuredClone(input);

  const moved = repoint(input, ROOT);

  assert.deepEqual(moved.settings.permissions.allow, ['Bash(git status)', CURRENT, 'Read(*)', 'Bash(npm test)']);
  assert.deepEqual(moved.settings.permissions.deny, before.permissions.deny);
  assert.deepEqual(moved.settings.permissions.ask, before.permissions.ask);
  assert.equal(moved.settings.permissions.defaultMode, 'default');
  assert.deepEqual(moved.settings.enabledPlugins, before.enabledPlugins);
  assert.deepEqual(moved.settings.env, before.env);
  assert.deepEqual(input, before, 'the input object is not mutated');
});

test('with no stale rule nothing is added, removed or written, whatever the count of current rules', () => {
  for (const allow of [['Bash(npm test)'], [CURRENT], [CURRENT, 'Bash(npm test)', CURRENT]]) {
    const input = allowOf(...allow);
    const moved = repoint(input, ROOT);
    assert.equal(moved.settings, input, `the input object itself for ${allow.length} entries`);
    assert.deepEqual(moved.from, []);

    const write = spyWrite();
    const root = project(JSON.stringify(input));
    assert.deepEqual(repointFile(root, ROOT, { write }), { from: [], to: '0.3.1' });
    assert.equal(write.calls.length, 0);
  }
});

test('a session on a version Claude Code marked as replaced moves nothing, a newer version’s rule included', () => {
  // A session opened before an update keeps running the old root, and its
  // /clear must not take the rule back from the installed version.
  const cache = join(tempDir('hodos-orphan-'), 'cache', 'hodos', 'hodos');
  const old = join(cache, '0.3.1');
  mkdirSync(old, { recursive: true });
  const text = JSON.stringify(allowOf(`Bash(node ${join(cache, '0.3.2')}/scripts/*)`));
  const root = project(text);

  const unmarked = spyWrite();
  assert.deepEqual(repointFile(root, old, { write: unmarked }).from, ['0.3.2'], 'an unmarked root still moves the rule');

  writeFileSync(join(old, '.orphaned_at'), '1791272907954');
  const write = spyWrite();
  assert.deepEqual(repointFile(root, old, { write }), { from: [], to: '0.3.1' });
  assert.equal(write.calls.length, 0);
  assert.equal(readFileSync(settingsPath(root), 'utf8'), text);
});

test('a second run over the first run’s file writes nothing', () => {
  const root = project(JSON.stringify(allowOf(stale('0.2.1'), CURRENT, stale('0.2.2'))));
  assert.deepEqual(repointFile(root, ROOT).from, ['0.2.1', '0.2.2']);

  const write = spyWrite();
  assert.deepEqual(repointFile(root, ROOT, { write }), { from: [], to: '0.3.1' });
  assert.equal(write.calls.length, 0);
});

test('a root outside the plugin cache, and every rule not of init’s exact form, are left alone', () => {
  // `--plugin-dir`: the root is a checkout, and a sibling directory's rule is
  // no version of this plugin.
  const local = allowOf('Bash(node /Users/dev/Projects/other/scripts/*)');
  assert.equal(repoint(local, '/Users/dev/Projects/ai-workflow').settings, local);
  assert.deepEqual(repoint(local, '/Users/dev/Projects/ai-workflow').from, []);

  const notInits = [
    `Bash(node ${P}/0.2.2/scripts:*)`,
    `Bash(node ${P}/0.2.2/scripts/ledger.mjs *)`,
    `Bash(node ${CACHE}/hodos/other/0.2.2/scripts/*)`,
    `Bash(node ${CACHE}/mkt2/hodos/0.2.2/scripts/*)`,
    `Bash(node ${P}/0.2.2/x/scripts/*)`,
  ];
  for (const rule of notInits) {
    const input = allowOf(rule);
    assert.equal(repoint(input, ROOT).settings, input, rule);
  }
  assert.deepEqual(repoint(allowOf(...notInits, stale('0.2.2')), ROOT).settings.permissions.allow, [...notInits, CURRENT]);
});

test('an absent, unreadable or unwritable file is left as it was, and a failed write says why', () => {
  const absent = project();
  assert.deepEqual(repointFile(absent, ROOT), { from: [], to: '0.3.1' });
  assert.equal(existsSync(settingsPath(absent)), false, 'no file is created');

  for (const text of ['{ "permissions": ', JSON.stringify({ permissions: { allow: stale('0.2.2') } }), JSON.stringify([stale('0.2.2')])]) {
    const root = project(text);
    assert.deepEqual(repointFile(root, ROOT), { from: [], to: '0.3.1' }, text);
    assert.equal(readFileSync(settingsPath(root), 'utf8'), text);
  }

  const text = JSON.stringify(allowOf(stale('0.2.2')));
  const root = project(text);
  const write = () => {
    throw Object.assign(new Error('permission denied'), { code: 'EACCES' });
  };
  assert.deepEqual(repointFile(root, ROOT, { write }), { from: ['0.2.2'], to: '0.3.1', error: 'EACCES' });
  assert.equal(readFileSync(settingsPath(root), 'utf8'), text);
});
