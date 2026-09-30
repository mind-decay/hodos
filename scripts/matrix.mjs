#!/usr/bin/env node
// matrix.mjs — the pairwise covering set (decision 0096).
//
// A `ui` sweep is routes × states × widths, and the full product is what makes
// a verify phase cost more than the change it grades. Kuhn and Kacker's
// interaction rule (NIST; research/09 §2.1) is why pairwise is the stopping
// point rather than a compromise: observed failures are triggered by one
// parameter or by an interaction of two, in the large majority of cases, so a
// set covering every pair covers what a full product would have found.
//
// The set is built greedily and deterministically — the first uncovered pair
// seeds a row, the remaining dimensions take the value that covers the most
// still-uncovered pairs, ties going to the value the project declared first.
// Deterministic matters: the same plan produces the same matrix, so a row in
// `verify.md` means the same thing on the next iteration.

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const USAGE = `Usage: node scripts/matrix.mjs ['<dimensions as JSON>']

The pairwise covering set for a sweep (decision 0096).

  Dimensions are an object of named value lists — routes, states, widths,
  roles — read from the argument or, with none, from stdin. Output is JSON:
  the rows to run, the counts (rows, pairs, product) and the pairs no row
  covers, which is empty unless the generator is broken.

  --help         print this and exit 0.

Exit codes: 0 — the set was built; 2 — bad invocation, or a dimension that
is not a list of values.`;

/** The dimensions that have something to vary, in the order they were given. */
const axes = (dimensions) => Object.keys(dimensions).filter((name) => (dimensions[name] ?? []).length > 0);

/** How many rows the full product would be. */
export function product(dimensions) {
  return axes(dimensions).reduce((total, name) => total * dimensions[name].length, 1);
}

/** Every pair of values across two distinct dimensions. */
function pairList(dimensions) {
  const names = axes(dimensions);
  const out = [];
  for (let i = 0; i < names.length; i += 1) {
    for (let j = i + 1; j < names.length; j += 1) {
      for (const leftValue of dimensions[names[i]]) {
        for (const rightValue of dimensions[names[j]]) {
          out.push({ left: names[i], leftValue, right: names[j], rightValue });
        }
      }
    }
  }
  return out;
}

const keyOf = (pair) => `${pair.left}=${pair.leftValue} & ${pair.right}=${pair.rightValue}`;

/** Every pair the sweep asks to be covered, as the strings a report prints. */
export const pairKeys = (dimensions) => pairList(dimensions).map(keyOf);

const holds = (row, pair) => row[pair.left] === pair.leftValue && row[pair.right] === pair.rightValue;

/** The pairs no row in the set covers. Empty is the whole point of the set. */
export function uncovered(rows, dimensions) {
  return pairList(dimensions)
    .filter((pair) => !rows.some((row) => holds(row, pair)))
    .map(keyOf);
}

/** The rows to run: every pair covered, in fewer rows than the product. */
export function pairwise(dimensions) {
  const names = axes(dimensions);
  if (names.length === 0) return [];
  if (names.length === 1) return dimensions[names[0]].map((value) => ({ [names[0]]: value }));
  let left = pairList(dimensions);
  const rows = [];
  while (left.length > 0) {
    const seed = left[0];
    const row = { [seed.left]: seed.leftValue, [seed.right]: seed.rightValue };
    for (const name of names) {
      if (name in row) continue;
      let best = dimensions[name][0];
      let bestGain = -1;
      for (const value of dimensions[name]) {
        const gain = left.filter(
          (pair) =>
            (pair.left === name && pair.leftValue === value && row[pair.right] === pair.rightValue) ||
            (pair.right === name && pair.rightValue === value && row[pair.left] === pair.leftValue),
        ).length;
        if (gain > bestGain) {
          bestGain = gain;
          best = value;
        }
      }
      row[name] = best;
    }
    // The row is ordered by the dimensions as they were declared, not by the
    // pair that seeded it: a reader of the table compares rows column by column.
    rows.push(Object.fromEntries(names.map((name) => [name, row[name]])));
    left = left.filter((pair) => !holds(row, pair));
  }
  return rows;
}

function main(argv) {
  if (argv.includes('--help')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (argv.length > 1) {
    process.stderr.write(`${USAGE}\n`);
    return 2;
  }
  let dimensions;
  try {
    dimensions = JSON.parse(argv[0] ?? readFileSync(0, 'utf8'));
  } catch (error) {
    process.stderr.write(`matrix: the dimensions are not JSON — ${error.message}\n`);
    return 2;
  }
  if (dimensions === null || typeof dimensions !== 'object' || Array.isArray(dimensions)) {
    process.stderr.write('matrix: the dimensions are an object of named value lists\n');
    return 2;
  }
  for (const [name, values] of Object.entries(dimensions)) {
    if (!Array.isArray(values)) {
      process.stderr.write(`matrix: \`${name}\` is not a list of values\n`);
      return 2;
    }
  }
  const rows = pairwise(dimensions);
  const result = {
    rows,
    counts: { rows: rows.length, pairs: pairKeys(dimensions).length, product: product(dimensions) },
    uncovered: uncovered(rows, dimensions),
  };
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
