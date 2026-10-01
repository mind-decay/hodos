#!/usr/bin/env node
// run-tests.mjs — what `npm test` runs. It collects this repository's
// `*.test.mjs` files and hands them to `node --test` with the temp dir
// pointed at a sandbox of the run's own, and fails a run that leaves anything
// in it, even when every test passed (decision 0186). A suite that forgets to
// remove what it made fails at once, instead of adding thousands of
// directories to the developer's temp dir unnoticed.
//
// Why not `node --test` alone: a **directory** positional is searched
// recursively up to Node 20 and is a module path after it (Node 25 answers
// MODULE_NOT_FOUND), a **glob** positional works from Node 22 and is a literal
// path before it, and a bare `node --test` sweeps the whole tree including
// `bench/fixtures/**/*.test.ts`. No one of the three serves Node 18 through 25,
// and a shell glob in the npm script serves no Windows runner, where npm runs
// its scripts through cmd.exe. Collecting the files here is the portable form.

import { mkdtempSync, readdirSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

/**
 * The directories this repository keeps tests in. `tools/` is in the build
 * repository and not in the published one (decision 0102), so an **absent**
 * root is skipped and one that exists with no test file is an error: the same
 * npm script serves both trees without going quiet in either.
 */
export const ROOTS = ['scripts', 'bench', 'tools'];

/**
 * Every `*.test.mjs` below `root`, sorted, `node_modules` skipped.
 * Throws when there is none: a collector that returns an empty list turns a
 * broken test run into a green one.
 */
export function collect(root) {
  const found = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules') walk(join(dir, entry.name));
        continue;
      }
      if (entry.name.endsWith('.test.mjs')) found.push(join(dir, entry.name));
    }
  };
  walk(root);
  if (found.length === 0) throw new Error(`${root}: no .test.mjs file found`);
  return found;
}

/**
 * Those of `roots` this tree carries, absolute, in the order given. Every
 * sweep over the repository goes through here, so a root the published tree
 * does not have is skipped once rather than in each caller.
 */
export function presentRoots(repoRoot, roots) {
  return roots
    .map((dir) => join(repoRoot, dir))
    .filter((path) => statSync(path, { throwIfNoEntry: false })?.isDirectory());
}

/** Every test file under `roots` that this tree has, in root order. */
export function collectRoots(repoRoot, roots) {
  return presentRoots(repoRoot, roots).flatMap((root) => collect(root));
}

/**
 * Runs `node --test --test-concurrency=1 ...files` with TMPDIR, TMP and TEMP
 * at a fresh `hodos-tests-XXXXXX` under `base`, and returns the run's status
 * and the sorted names left in that directory, files included. The directory
 * is removed before this returns, whatever the run did.
 *
 * All three variables, because `os.tmpdir()` reads TMPDIR on POSIX and TEMP,
 * then TMP, on Windows (PLATFORM-NOTES.md fact 62), where CI runs this too. A child a test spawns with an `env` of its own that lacks
 * them writes to the real temp dir, which this cannot see.
 */
export function runIsolated(files, { cwd, base = tmpdir(), stdio = 'inherit' } = {}) {
  const sandbox = mkdtempSync(join(base, 'hodos-tests-'));
  try {
    const run = spawnSync(process.execPath, ['--test', '--test-concurrency=1', ...files], {
      cwd,
      stdio,
      env: { ...process.env, TMPDIR: sandbox, TMP: sandbox, TEMP: sandbox },
    });
    return { status: run.status, leftovers: readdirSync(sandbox).sort() };
  } finally {
    rmSync(sandbox, { recursive: true, force: true, maxRetries: 3 });
  }
}

/**
 * The exit code and the stderr lines of a run: a leftover fails a run whose
 * tests passed, and a failed run keeps its own code. No status means the spawn
 * failed or a signal ended it, which is not a pass.
 */
export function verdict({ status, leftovers }) {
  const lines = leftovers.map(
    (name) => `run-tests: ${name} was left in the run's temp dir — a test made it and did not remove it (scripts/temp-dir.mjs)`,
  );
  if (status !== 0) return { code: status ?? 1, lines };
  return { code: leftovers.length > 0 ? 1 : 0, lines };
}

function main() {
  const repoRoot = fileURLToPath(new URL('..', import.meta.url));
  const { code, lines } = verdict(runIsolated(collectRoots(repoRoot, ROOTS), { cwd: repoRoot }));
  for (const line of lines) process.stderr.write(`${line}\n`);
  return code;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main();
}
