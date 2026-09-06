// A path hodos prints is written with `/` on every platform. The engine's own
// documents, its skills, its rules and its tests all quote paths that way, and
// a project's `.claude/hodos/` layout is described in `/` everywhere it is
// described at all — so `relative()`, whose separator is the platform's, is
// normalized at each of its call sites.
//
// The incident: CI's first Windows run reported
// `the control still states the rule at docs\DECISIONS.md:279, …` from
// `bench/noop/run.mjs`, whose scenario set names the same lines with `/`, and
// `bench/review/invoke.mjs` built a package id from a path split on `/` and
// read `packages/undefined.md`. Seven of the nine call sites already carried
// the normalization; the rule was the engine's before it was checked.
//
// The check is textual because the property is: a `relative()` whose result
// reaches a comparison or an output must not carry a `\`.

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

test('every relative() the engine takes is normalized to POSIX separators', () => {
  const files = presentRoots(REPO, ROOTS).flatMap((root) => scripts(root));
  assert.ok(files.length > 15, `expected the engine's scripts, found ${files.length}`);

  const offenders = files
    .map((file) => [file.slice(REPO.length), readFileSync(file, 'utf8')])
    .flatMap(([path, text]) =>
      text
        .split('\n')
        .map((line, i) => [i + 1, line])
        .filter(([, line]) => /\brelative\(/.test(line) && !line.includes(".split(sep).join('/')"))
        .map(([n, line]) => `${path}:${n}: ${line.trim()}`),
    );

  assert.deepEqual(offenders, [], "normalize it: `relative(a, b).split(sep).join('/')`");
});
