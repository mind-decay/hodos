// The helper every test file makes its temp directories through. Its failure
// mode is the leak it exists to end — a directory that outlives the test file
// that made it, a failed test's above all — so these tests run fixture files
// as child processes and look at what each one left behind.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdtempSync, readFileSync, readdirSync, realpathSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { tempDir, track } from './temp-dir.mjs';

const HELPER = new URL('./temp-dir.mjs', import.meta.url).href;

/**
 * A directory for one test's scaffolding, removed by that test in `finally`:
 * the helper under test is not trusted to clean up after its own test.
 */
const scratch = (prefix) => realpathSync(mkdtempSync(join(tmpdir(), prefix)));

/** Runs `body` as the test file `<dir>/fixture.test.mjs`, with TMPDIR, TMP and TEMP at `dir`. */
function runFixture(dir, body) {
  const file = join(dir, 'fixture.test.mjs');
  writeFileSync(file, body);
  // A `node --test` spawned from inside a test inherits NODE_TEST_CONTEXT,
  // runs as that test's child and exits 0 whatever its tests did
  // (PLATFORM-NOTES.md fact 64).
  const { NODE_TEST_CONTEXT, ...env } = process.env;
  return spawnSync(process.execPath, ['--test', '--test-reporter=tap', file], {
    cwd: dir,
    encoding: 'utf8',
    env: { ...env, TMPDIR: dir, TMP: dir, TEMP: dir },
  });
}

test('tempDir makes a fresh directory directly under the real tmpdir, named by its prefix', () => {
  const a = tempDir('hodos-x-');
  const b = tempDir('hodos-x-');

  for (const dir of [a, b]) {
    assert.ok(typeof dir === 'string' && statSync(dir, { throwIfNoEntry: false })?.isDirectory(), `${dir} is not a directory`);
    assert.equal(realpathSync(dir), dir);
    assert.equal(dirname(dir), realpathSync(tmpdir()));
    assert.ok(basename(dir).startsWith('hodos-x-'), dir);
  }
  assert.notEqual(a, b);
});

test('a test file’s directories are gone when it ends, a failed test’s included', () => {
  const owned = scratch('hodos-tempdir-owned-');
  const notes = scratch('hodos-tempdir-notes-');
  const log = join(notes, 'made.log');

  try {
    // The paths go to a file and not to stdout: Node 20's TAP reporter
    // escapes `\` and `#` in what a test prints, which a Windows path holds.
    const run = runFixture(
      owned,
      `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { appendFileSync, mkdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { tempDir, track } from ${JSON.stringify(HELPER)};

const made = (path) => appendFileSync(${JSON.stringify(log)}, path + '\\n');

test('makes one and passes', () => { made(tempDir('hodos-fx-')); });
test('makes one and fails', () => { made(tempDir('hodos-fx-')); assert.fail('on purpose'); });
test('tracks one it made itself', () => {
  const dir = join(tmpdir(), 'own');
  mkdirSync(dir);
  made(track(dir));
});
test('deletes one of its own before the file ends', () => {
  const dir = tempDir('hodos-fx-');
  made(dir);
  rmSync(dir, { recursive: true });
});
`,
    );
    const output = run.stdout + run.stderr;

    assert.deepEqual(readdirSync(owned), ['fixture.test.mjs'], output);
    const made = readFileSync(log, 'utf8').trim().split('\n');
    assert.equal(made.length, 4, made.join('\n'));
    // Under the directory the child's TMPDIR, TMP and TEMP named, or the
    // emptiness above says nothing (PLATFORM-NOTES.md fact 62, check M).
    for (const path of made) assert.equal(dirname(path), owned, `${path} was made outside the fixture's tmpdir`);
    assert.equal(run.status, 1, output);
    assert.match(run.stdout, /^# pass 3$/m, output);
    assert.match(run.stdout, /^# fail 1$/m, output);
    assert.doesNotMatch(output, /hookFailed/);
  } finally {
    rmSync(owned, { recursive: true, force: true });
    rmSync(notes, { recursive: true, force: true });
  }
});

test('track refuses a relative path, which would resolve against whatever cwd a test left', () => {
  assert.throws(
    () => track(join('rel', 'dir')),
    (err) => err instanceof TypeError && /absolute/.test(err.message),
  );
});

test(
  'a removal that fails fails the run and names the path',
  { skip: process.platform === 'win32' && 'a 0o500 parent stops a removal on POSIX only' },
  () => {
    const owned = scratch('hodos-tempdir-locked-');
    const parent = join(owned, 'locked');
    const child = join(parent, 'child');

    try {
      const run = runFixture(
        owned,
        `import { test } from 'node:test';
import { chmodSync, mkdirSync } from 'node:fs';
import { track } from ${JSON.stringify(HELPER)};

test('tracks a directory its parent will not give up', () => {
  mkdirSync(${JSON.stringify(child)}, { recursive: true });
  track(${JSON.stringify(child)});
  chmodSync(${JSON.stringify(parent)}, 0o500);
});
`,
      );
      const output = run.stdout + run.stderr;

      assert.notEqual(run.status, 0, output);
      assert.ok(output.includes(child), output);
    } finally {
      if (existsSync(parent)) chmodSync(parent, 0o700);
      rmSync(owned, { recursive: true, force: true });
    }
  },
);

test(
  'a removal that fails does not stop the ones after it, and every failed path is named',
  { skip: process.platform === 'win32' && 'a 0o500 parent stops a removal on POSIX only' },
  () => {
    const owned = scratch('hodos-tempdir-partial-');
    const notes = scratch('hodos-tempdir-partial-notes-');
    const log = join(notes, 'made.log');
    const parents = [join(owned, 'locked-a'), join(owned, 'locked-b')];
    const children = parents.map((parent) => join(parent, 'child'));

    try {
      const run = runFixture(
        owned,
        `import { test } from 'node:test';
import { appendFileSync, chmodSync, mkdirSync } from 'node:fs';
import { tempDir, track } from ${JSON.stringify(HELPER)};

test('tracks two directories their parents will not give up, then makes one more', () => {
  for (const [parent, child] of ${JSON.stringify(parents.map((parent, i) => [parent, children[i]]))}) {
    mkdirSync(child, { recursive: true });
    track(child);
    chmodSync(parent, 0o500);
  }
  appendFileSync(${JSON.stringify(log)}, tempDir('hodos-fx-') + '\\n');
});
`,
      );
      const output = run.stdout + run.stderr;
      const last = readFileSync(log, 'utf8').trim();

      assert.notEqual(run.status, 0, output);
      assert.equal(existsSync(last), false, `${last} outlived the failed removals before it\n${output}`);
      for (const child of children) assert.ok(output.includes(child), `${child} is not named\n${output}`);
    } finally {
      for (const parent of parents) if (existsSync(parent)) chmodSync(parent, 0o700);
      rmSync(owned, { recursive: true, force: true });
      rmSync(notes, { recursive: true, force: true });
    }
  },
);
