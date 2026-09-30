// The covering set is checked by re-deriving every pair and asking which ones
// no row holds: a generator that drops a pair has to go red here, not on a
// count that happens to match (BUILD-PLAN.md Stage 11d, criterion 1).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { pairKeys, pairwise, product, uncovered } from './matrix.mjs';

const MATRIX = fileURLToPath(new URL('./matrix.mjs', import.meta.url));

/** Three dimensions of three, the shape a `viewport` recipe produces. */
const SWEEP = {
  routes: ['/orders', '/orders/new', '/refunds'],
  states: ['empty', 'one', 'many'],
  widths: [375, 768, 1280],
};

test('every pair across the dimensions is covered', () => {
  assert.deepEqual(uncovered(pairwise(SWEEP), SWEEP), []);
});

test('the covering set is smaller than the full product', () => {
  const rows = pairwise(SWEEP);
  assert.equal(product(SWEEP), 27);
  assert.ok(rows.length < 27, `${rows.length} rows`);
  assert.ok(rows.length >= 9, `${rows.length} rows cannot cover 27 pairs of a 3×3 face`);
});

test('every row names every dimension, with a value that dimension declared', () => {
  for (const row of pairwise(SWEEP)) {
    assert.deepEqual(Object.keys(row), ['routes', 'states', 'widths']);
    for (const [name, value] of Object.entries(row)) assert.ok(SWEEP[name].includes(value), `${name}=${value}`);
  }
});

test('the same dimensions give the same rows, in the same order', () => {
  assert.deepEqual(pairwise(SWEEP), pairwise(SWEEP));
});

test('a tie goes to the value the project declared first', () => {
  // The first row has no pair covered yet, so every value of every dimension
  // past the seed covers the same count: the tie is what fixes the row.
  assert.deepEqual(pairwise(SWEEP)[0], { routes: '/orders', states: 'empty', widths: 375 });
});

test('two dimensions are their own product, because every pair is a row', () => {
  const flat = { routes: ['/a', '/b'], widths: [375, 1280] };
  assert.equal(pairwise(flat).length, 4);
  assert.deepEqual(uncovered(pairwise(flat), flat), []);
});

test('one dimension has no pairs, so each value is one row', () => {
  assert.deepEqual(pairwise({ routes: ['/a', '/b'] }), [{ routes: '/a' }, { routes: '/b' }]);
  assert.deepEqual(pairKeys({ routes: ['/a', '/b'] }), []);
});

test('a dimension of one value rides along in every row', () => {
  const rows = pairwise({ routes: ['/a', '/b'], states: ['empty'], widths: [375, 1280] });
  assert.ok(rows.every((row) => row.states === 'empty'));
  assert.deepEqual(uncovered(rows, { routes: ['/a', '/b'], states: ['empty'], widths: [375, 1280] }), []);
});

test('a dimension with no values is not a dimension', () => {
  assert.deepEqual(pairwise({ routes: ['/a'], states: [] }), [{ routes: '/a' }]);
  assert.deepEqual(pairwise({}), []);
});

test('uncovered names the pair it could not find', () => {
  const rows = [
    { routes: '/a', widths: 375 },
    { routes: '/b', widths: 375 },
  ];
  assert.deepEqual(uncovered(rows, { routes: ['/a', '/b'], widths: [375, 1280] }), [
    'routes=/a & widths=1280',
    'routes=/b & widths=1280',
  ]);
});

test('a wider sweep still covers, and still costs less than the product', () => {
  const wide = {
    routes: ['/a', '/b', '/c', '/d'],
    states: ['empty', 'one', 'many'],
    widths: [375, 768, 1280],
    roles: ['guest', 'user'],
  };
  const rows = pairwise(wide);
  assert.deepEqual(uncovered(rows, wide), []);
  assert.ok(rows.length < product(wide) / 3, `${rows.length} of ${product(wide)}`);
});

test('the matrix prints its rows and its counts as JSON', () => {
  const run = spawnSync(process.execPath, [MATRIX, JSON.stringify(SWEEP)], { encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  const printed = JSON.parse(run.stdout);
  assert.deepEqual(printed.rows, pairwise(SWEEP));
  assert.deepEqual(printed.counts, { rows: pairwise(SWEEP).length, pairs: pairKeys(SWEEP).length, product: 27 });
  assert.deepEqual(printed.uncovered, []);
});

test('the matrix reads its dimensions on stdin too', () => {
  const run = spawnSync(process.execPath, [MATRIX], { input: JSON.stringify(SWEEP), encoding: 'utf8' });
  assert.equal(run.status, 0, run.stderr);
  assert.deepEqual(JSON.parse(run.stdout).rows, pairwise(SWEEP));
});

test('dimensions that are not lists of values exit 2 and say which', () => {
  const run = spawnSync(process.execPath, [MATRIX, '{"routes":"/a"}'], { encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /routes/);
});

test('--help exits 0', () => {
  const run = spawnSync(process.execPath, [MATRIX, '--help'], { encoding: 'utf8' });
  assert.equal(run.status, 0);
  assert.match(run.stdout, /pairwise/);
});
