// The test collector of `npm test`. Its own failure mode is silence — a run
// that finds nothing reports 0 tests and looks like a green suite — so the
// collector refuses an empty root rather than returning an empty list. The
// runner's is the same silence about what a run leaves in the temp dir, so a
// leftover fails a run whose tests all passed.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readdirSync, readFileSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';

import { collect, collectRoots, presentRoots, ROOTS, runIsolated, verdict } from './run-tests.mjs';
import { tempDir } from './temp-dir.mjs';

/** A tree of files, written under a temp root. */
function tree(files) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-runtests-')));
  for (const [path, body] of Object.entries(files)) {
    const full = join(root, path);
    mkdirSync(join(full, '..'), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

test('collect finds every .test.mjs below a root, at any depth', () => {
  const root = tree({
    'a.test.mjs': '',
    'a.mjs': '',
    'deep/b.test.mjs': '',
    'deep/deeper/c.test.mjs': '',
    'deep/notes.md': '',
  });

  try {
    assert.deepEqual(collect(root), [
      join(root, 'a.test.mjs'),
      join(root, 'deep/b.test.mjs'),
      join(root, 'deep/deeper/c.test.mjs'),
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('collect skips node_modules, whose test files are not this repository’s', () => {
  const root = tree({
    'a.test.mjs': '',
    'node_modules/pkg/x.test.mjs': '',
    'deep/node_modules/pkg/y.test.mjs': '',
  });

  try {
    assert.deepEqual(collect(root), [join(root, 'a.test.mjs')]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('collect throws on a root with no test file, rather than returning none', () => {
  const root = tree({ 'readme.md': '' });

  try {
    assert.throws(() => collect(root), /no \.test\.mjs/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a root that is absent is not this tree’s, and a root that is empty is a mistake', () => {
  const root = tree({ 'scripts/a.test.mjs': '', 'empty/readme.md': '' });

  try {
    // `tools/` is in the build repository and not in the published one
    // (decision 0102), so the same npm script serves both trees.
    assert.deepEqual(collectRoots(root, ['scripts', 'tools']), [join(root, 'scripts/a.test.mjs')]);
    assert.throws(() => collectRoots(root, ['scripts', 'empty']), /no \.test\.mjs/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('presentRoots keeps the roots this tree carries, in the order given', () => {
  const root = tree({ 'scripts/a.test.mjs': '', 'bench/b.test.mjs': '', 'tools': '' });

  try {
    // `tools` here is a **file**, the shape a stray name takes: a root is a
    // directory or it is not this tree's. Every sweep over the repository —
    // the collector and `cli-exit.test.mjs` — asks this one function, so the
    // published tree, which has no `tools/` (decision 0102), sweeps what it has.
    assert.deepEqual(presentRoots(root, ['scripts', 'tools', 'bench', 'absent']), [
      join(root, 'scripts'),
      join(root, 'bench'),
    ]);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/**
 * `runIsolated` as `npm test` calls it, from a process that is not itself a
 * test: a `node --test` spawned from inside one inherits NODE_TEST_CONTEXT
 * and exits 0 whatever its tests did (PLATFORM-NOTES.md fact 64).
 */
function isolated(file, base) {
  const context = process.env.NODE_TEST_CONTEXT;
  delete process.env.NODE_TEST_CONTEXT;
  try {
    return runIsolated([file], { cwd: dirname(file), base, stdio: 'pipe' });
  } finally {
    if (context !== undefined) process.env.NODE_TEST_CONTEXT = context;
  }
}

/** A fixture test file whose tests are `body`, and an empty directory for its run's `base`. */
function fixture(body) {
  const file = join(tempDir('hodos-runtests-'), 'fixture.test.mjs');
  writeFileSync(
    file,
    `import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

${body}
`,
  );
  return { file, base: tempDir('hodos-runtests-base-') };
}

test('runIsolated names a directory a passing run left in its temp dir', () => {
  const { file, base } = fixture(`test('leaves a directory', () => { mkdirSync(join(tmpdir(), 'left-dir')); });`);

  assert.deepEqual(isolated(file, base), { status: 0, leftovers: ['left-dir'] });
  assert.deepEqual(readdirSync(base), []);
});

test('runIsolated names a plain file too: anything a run leaves is a leak', () => {
  const { file, base } = fixture(`test('leaves a file', () => { writeFileSync(join(tmpdir(), 'left-file'), ''); });`);

  assert.deepEqual(isolated(file, base), { status: 0, leftovers: ['left-file'] });
  assert.deepEqual(readdirSync(base), []);
});

test('runIsolated reports nothing for a run that left nothing', () => {
  const { file, base } = fixture(`test('leaves nothing', () => {});`);

  assert.deepEqual(isolated(file, base), { status: 0, leftovers: [] });
  assert.deepEqual(readdirSync(base), []);
});

test('runIsolated keeps the status of a run whose test failed', () => {
  const { file, base } = fixture(`test('fails', () => { assert.fail('on purpose'); });`);

  assert.deepEqual(isolated(file, base), { status: 1, leftovers: [] });
  assert.deepEqual(readdirSync(base), []);
});

test('the run sees TMPDIR, TMP and TEMP at its own sandbox, which is gone once it returns', () => {
  const seen = join(tempDir('hodos-runtests-notes-'), 'env.json');
  const { file, base } = fixture(
    `test('records its environment', () => {
  const { TMPDIR, TMP, TEMP } = process.env;
  writeFileSync(${JSON.stringify(seen)}, JSON.stringify({ TMPDIR, TMP, TEMP }));
});`,
  );

  assert.deepEqual(isolated(file, base), { status: 0, leftovers: [] });
  const env = JSON.parse(readFileSync(seen, 'utf8'));
  const sandbox = env.TMPDIR;
  assert.deepEqual(env, { TMPDIR: sandbox, TMP: sandbox, TEMP: sandbox });
  assert.equal(dirname(sandbox), base);
  assert.ok(basename(sandbox).startsWith('hodos-tests-'), sandbox);
  assert.equal(existsSync(sandbox), false);
  assert.deepEqual(readdirSync(base), []);
});

test('verdict: a leftover fails a run whose tests passed, one line per name', () => {
  assert.deepEqual(verdict({ status: 0, leftovers: [] }), { code: 0, lines: [] });

  const left = verdict({ status: 0, leftovers: ['hodos-config-a1', 'stray.txt'] });
  assert.equal(left.code, 1);
  assert.equal(left.lines.length, 2);
  assert.match(left.lines[0], /hodos-config-a1/);
  assert.match(left.lines[1], /stray\.txt/);
});

test('verdict: a failed run keeps its own code, and still names what it left', () => {
  assert.deepEqual(verdict({ status: 2, leftovers: [] }), { code: 2, lines: [] });

  const both = verdict({ status: 2, leftovers: ['hodos-ledger-b2'] });
  assert.equal(both.code, 2);
  assert.equal(both.lines.length, 1);
  assert.match(both.lines[0], /hodos-ledger-b2/);

  // No status: the spawn failed or a signal ended it, which is not a pass.
  assert.deepEqual(verdict({ status: null, leftovers: [] }), { code: 1, lines: [] });
});
