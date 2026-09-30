#!/usr/bin/env node
// setup.mjs — the red arm of the fail-fast pair.
//
// Stage 11d-2, T14 (criterion 5, decisions 0110 and 0111). The gate is a
// comparison, so the two arms have to differ in exactly one thing: this one is
// the four-sources copy with **one failing unit expectation**, committed on the
// task's branch the way a broken expectation would be. The green arm is the
// four-sources arm itself (`../2026-09-07-four-sources/`), which is why nothing
// here re-seeds a second copy of it: an arm bought twice is an arm paid for
// twice, and the counts of a run that already happened are as good as the
// counts of a run bought to be its control.
//
// What the gate reads: `kernel-turns.mjs` over each arm's transcript — browser
// operations, strictly fewer in this arm (zero against N), and every claim
// still on a row with the header counts equal. Dispatches are reported beside
// them and expected to tie at one per iteration (decision 0111).
//
// Usage: node setup.mjs <dir>

import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const FOUR_SOURCES = join(HERE, '..', '2026-09-07-four-sources', 'setup.mjs');
const run = (cmd, args, cwd) => execFileSync(cmd, args, { cwd, encoding: 'utf8' });

const TEST = 'src/features/orders/summary.test.ts';
const PINNED = 'expect(summarizeOrders(pennies).total).toBe(0.3);';
const BROKEN = 'expect(summarizeOrders(pennies).total).toBe(0.4);';

function main(argv) {
  const dir = argv[0];
  if (!dir) {
    process.stderr.write('Usage: node setup.mjs <dir>\n');
    return 2;
  }
  process.stdout.write(run('node', [FOUR_SOURCES, dir], HERE));

  const file = join(dir, TEST);
  const text = readFileSync(file, 'utf8');
  if (!text.includes(PINNED)) throw new Error(`the pinned expectation is not in ${TEST}: ${PINNED}`);
  writeFileSync(file, text.replace(PINNED, BROKEN));
  run('git', ['commit', '-qam', 'test: expect 0.4 for the three-penny total'], dir);

  process.stdout.write(`red arm: ${TEST} expects 0.4 where the sum is 0.3 — npm test is red\n`);
  return 0;
}

process.exitCode = main(process.argv.slice(2));
