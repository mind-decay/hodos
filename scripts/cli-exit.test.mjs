// Every script here ends by handing an exit code back to the shell, and the
// way it does that is a property they all share rather than one script's, which
// is why this file has no script of its own beside it.
//
// The incident: `bench/noop/run.mjs --print-set` writes 18,504 bytes of JSON
// and then calls `process.exit(code)`. On Node 20 a write to a **pipe** is
// asynchronous, and `process.exit` does not wait for it — so a caller reading
// the output through `execFileSync` got 8,098 bytes, one pipe buffer's worth,
// and `JSON.parse` failed with "Unterminated string in JSON at position 8098".
// Node 24 and 25 flush it and the same command passes, which is why this went
// unseen until CI ran for the first time (2026-09-06, Stage 11b-4).
//
// It is not a bench problem. Kernels read `config.mjs find`, `state-digest.mjs`
// and `review-package.mjs` through the same channel, and a truncated JSON that
// still parses is worse than one that does not.
//
// `process.exitCode = <code>` is the form with no such window: Node exits when
// the loop drains, which is after stdout has been written.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ROOTS, presentRoots } from './run-tests.mjs';

const REPO = fileURLToPath(new URL('..', import.meta.url));

/** Every shipped `.mjs` under `dir`, tests excluded, recursively. */
function scripts(dir) {
  const found = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') found.push(...scripts(join(dir, entry.name)));
      continue;
    }
    if (entry.name.endsWith('.mjs') && !entry.name.endsWith('.test.mjs')) found.push(join(dir, entry.name));
  }
  return found;
}

test('no script exits before its output is written', () => {
  // The roots come from the collector rather than a list of their own: the
  // published tree has no `tools/` (decision 0102), and a second list of the
  // same three names went out of date the first time that mattered.
  const files = presentRoots(REPO, ROOTS).flatMap((root) => scripts(root));
  assert.ok(files.length > 15, `expected the engine's scripts, found ${files.length}`);

  const offenders = files
    .map((file) => [file.slice(REPO.length), readFileSync(file, 'utf8')])
    .flatMap(([path, text]) =>
      text
        .split('\n')
        .map((line, i) => [i + 1, line])
        .filter(([, line]) => line.includes('process.exit('))
        .map(([n, line]) => `${path}:${n}: ${line.trim()}`),
    );

  assert.deepEqual(offenders, [], 'use `process.exitCode = <code>`: process.exit truncates a pending write to a pipe');
});
