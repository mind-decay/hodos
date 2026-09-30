#!/usr/bin/env node
// A data seed for this fixture: the three overdue orders a claim can name.
// `up` writes them, `count` proves they are there, `reset` takes them away.
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';

const DIR = new URL('./.seed/', import.meta.url);
const FILE = new URL('./.seed/overdue.json', import.meta.url);
const ROWS = [
  { id: 'o-101', customer: 'Aina', total: 240.5, status: 'open', dueDays: -12 },
  { id: 'o-102', customer: 'Bo', total: 99.99, status: 'open', dueDays: -4 },
  { id: 'o-103', customer: 'Cai', total: 1200, status: 'open', dueDays: -31 },
];

const verb = process.argv[2];
if (verb === 'up') {
  mkdirSync(DIR, { recursive: true });
  writeFileSync(FILE, `${JSON.stringify(ROWS, null, 2)}\n`);
  process.stdout.write(`seeded ${ROWS.length} overdue orders\n`);
} else if (verb === 'count') {
  const rows = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : [];
  process.stdout.write(`${rows.length} overdue orders\n`);
  process.exitCode = rows.length >= 3 ? 0 : 1;
} else if (verb === 'reset') {
  rmSync(DIR, { recursive: true, force: true });
  process.stdout.write('seed reset\n');
} else {
  process.stderr.write('usage: node seed.mjs up|count|reset\n');
  process.exitCode = 2;
}
