// The test collector of `npm test`. Its own failure mode is silence — a run
// that finds nothing reports 0 tests and looks like a green suite — so the
// collector refuses an empty root rather than returning an empty list.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { collect, collectRoots, presentRoots, ROOTS } from './run-tests.mjs';

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
