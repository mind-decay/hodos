#!/usr/bin/env node
// setup.mjs — the copy the four-sources and attack arms run against.
//
// Stage 11d-2, T12 and T13. Three things have to be true of one copy, and
// `seed.mjs` takes one `--defect`, so the arm's own setup builds it:
//
//   1. `/shift` is in the `ui` recipe's routes, so the sweep reaches a route no
//      claim of the plan names. That is **setup** and goes in the base.
//   2. `verify.detectors.allow` silences `overflow` on `/shift`, so the seeded
//      banner is the intended case that must produce **no** row (decision 0107).
//      Also base: it is configuration, not a defect.
//   3. the task's own diff carries **both** defects, through the repeatable
//      `seed.mjs --defect`: `summary-clipped-line` (presentation, on /orders)
//      and `shift-double-submit` (the crash, on /shift). Both are in the diff
//      because decision **0112** runs the attacks only on the routes the diff
//      resolves to — a defect committed to the base is on no route they see.
//      The criterion's property is unharmed: it asks for a route **no claim
//      covers**, and no claim of `orders-summary` names /shift.
//   4. `defects/detail-console-throw.patch` in the **base**: /orders/:id throws
//      a TypeError out of a timer, which is the *console* source of decision
//      0093 — criterion 3's own words are "a route that throws in the console
//      with no claim naming it". Base, and deliberately not in the diff: the
//      console read happens on every route the sweep visits, so it needs no
//      attack surface, and keeping /orders/:id out of the diff keeps it out of
//      the attack surface and the arm inside the verifier's turn bound.
//
// Usage: node setup.mjs <dir>   (prints the seed JSON, plus what it added)

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const REPO = join(HERE, '..', '..', '..', '..');
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8' });

function main(argv) {
  const dir = argv[0];
  if (!dir) {
    process.stderr.write('Usage: node setup.mjs <dir>\n');
    return 2;
  }
  run('node', [join(REPO, 'bench', 'scripts', 'fixture-copy.mjs'), 'webapp', '--into', dir], REPO);

  run('git', ['apply', join(REPO, 'bench', 'run', 'defects', 'detail-console-throw.patch')], dir);
  const configPath = join(dir, '.claude', 'hodos', 'config.json');
  const config = JSON.parse(readFileSync(configPath, 'utf8'));
  const ui = config.verify.recipes.find((recipe) => recipe.name === 'ui');
  if (!ui) throw new Error('the webapp fixture has no ui recipe to add /shift to');
  if (!ui.routes.includes('/shift')) ui.routes.push('/shift');
  config.verify.detectors = { allow: ['overflow:/shift'] };
  writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
  run('git', ['add', '-A'], dir);
  run('git', ['commit', '-qm', 'chore: the handover route, its allowlist, and a detail page that throws'], dir);

  const seeded = run(
    'node',
    [
      join(REPO, 'bench', 'run', 'seed.mjs'),
      'orders-summary',
      '--copy',
      dir,
      '--at',
      'verify',
      '--defect',
      'summary-clipped-line',
      '--defect',
      'shift-double-submit',
    ],
    REPO,
  );
  process.stdout.write(seeded);
  process.stdout.write(
    `base: /shift in the ui recipe's routes + verify.detectors.allow ["overflow:/shift"] + detail-console-throw\ntask diff: summary-clipped-line + shift-double-submit\n`,
  );
  return 0;
}

process.exitCode = main(process.argv.slice(2));
