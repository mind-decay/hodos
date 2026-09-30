#!/usr/bin/env node
// run.mjs — the hold-out set's own checks and its scorer (decision 0154).
//
// A hold-out case is a defect nobody on the authoring side chose, so this set
// is read and never thresholded: every number it prints is a measurement, and
// `measurementReport` refuses a gate that tries to join them. It reuses the
// review bench's patch reader and scorer rather than a copy of them, so a case
// here is matched exactly as a seeded one would be — and its answer key is its
// own file, so no case can drift into `bench/review/`'s four gates.
//
// Two sources, kept apart in every number:
// - `seeded/` and `clean/` — hyhmrright/logic-lens's 36 `logic-review` cases
//   (MIT), each case's code a file its patch adds to `fixtures/snippets`;
// - `key.json` — defects the pilot's own reviews found in `ariadne_v2`, whose
//   licence is not MIT. The key holds shas, a file:line and a hash of the
//   line, never the line itself, and the package each case is reviewed from
//   lives in the gitignored `pilot-cache/`.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { measurement, measurementReport } from '../report.mjs';
import { checkKey as checkPatches, loadClean, loadDefects, score } from '../review/run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PILOT_FIELDS = ['id', 'package', 'slug', 'base', 'head', 'kind', 'item', 'file', 'line', 'trigger', 'what', 'found', 'anchorSha256', 'packageSha256'];
const SOURCE_TEXT = ['anchor', 'text', 'diff', 'snippet'];
// The review bench's own line tolerance (bench/review/run.mjs TOLERANCE).
const SPEC_TOLERANCE = 5;

const USAGE = `Usage: node bench/holdout/run.mjs --check-key | --verdicts <file> [options]

The hold-out reviewer measurement (decision 0154): recall, L-code agreement and
false positives on defects nobody on the authoring side seeded. No threshold:
every number is a measurement.

  --check-key            the set is self-consistent — no model call
  --verdicts <file>      score a run's verdicts.json (bench/holdout/invoke.mjs);
                         given twice or more, the runs are scored as one set
  --measurements <file>  that run's measurements.json, for its cost and turns;
                         given twice or more, dispatches and cost are summed
  --json                 the labeled JSON report instead of the table
  --set <dir>            a set other than this directory (for tests)
  --help                 print this and exit 0.

Exit codes: 0 — consistent, or scored; 1 — the set disagrees with itself, or a
verdicts file is unreadable; 2 — bad invocation.`;

/** The pilot cases, as defects the review scorer reads. */
export function loadPilot(setDir) {
  const path = join(setDir, 'key.json');
  if (!existsSync(path)) return [];
  return JSON.parse(readFileSync(path, 'utf8')).cases.map((c) => ({ ...c, source: 'pilot', ranges: {} }));
}

/** Every defect of the set, each tagged with the source it came from. */
export function loadCases(setDir) {
  const patches = loadDefects(setDir).map((d) => ({ ...d, source: 'logic-lens' }));
  return [...patches, ...loadPilot(setDir)];
}

export function checkKey(setDir) {
  const { problems, shape } = checkPatches(setDir, { minimums: null });
  const pilot = loadPilot(setDir);
  const seen = new Set();
  for (const c of pilot) {
    const say = (text) => problems.push(`${c.id ?? '?'}: ${text}`);
    for (const field of PILOT_FIELDS) if (c[field] === undefined || c[field] === '') say(`the case has no ${field}`);
    for (const field of SOURCE_TEXT) if (field in c) say(`a pilot case stores no source text (${field})`);
    if (seen.has(c.id)) say('the id is used twice');
    seen.add(c.id);
    if (!Number.isInteger(c.line)) say(`line "${c.line}" is not a line`);
    if (c.kind === 'behavioral' && !/\bL[1-9]\b/.test(c.item)) say(`a behavioral case names an L code, not "${c.item}"`);
    for (const sha of ['base', 'head']) if (c[sha] && !/^[0-9a-f]{7,40}$/.test(c[sha])) say(`${sha} "${c[sha]}" is not a sha`);
    for (const hash of ['anchorSha256', 'packageSha256']) if (c[hash] && !/^[0-9a-f]{64}$/.test(c[hash])) say(`${hash} is not a sha-256`);
  }
  const packages = new Set(pilot.map((c) => c.package));
  return { problems, shape: `${shape} · ${pilot.length} pilot cases in ${packages.size} packages` };
}

/**
 * The review scorer's result, plus what this set is for: recall per source, and
 * whether a found behavioral defect was filed under its own L code — the
 * question `BACKLOG.md`'s `b-l6-callee-contract` line has waited on.
 */
export function scoreHoldout({ defects, clean, packages }) {
  const result = score({ defects, clean, packages });
  const byId = new Map(defects.map((d) => [d.id, d]));
  const codesOf = (item) => [...new Set(String(item ?? '').match(/\bL[1-9]\b/g) ?? [])];
  // A finding filed under two codes, one of them the defect's, is a hedge: it
  // names the right code without committing to it, and counting it either way
  // would decide a question the review left open.
  const codes = { agreed: 0, hedged: [], disagreed: [] };
  for (const match of result.matches) {
    const d = byId.get(match.defect);
    if (d.kind !== 'behavioral') continue;
    const filed = codesOf(match.item);
    const [expected] = codesOf(d.item);
    const row = { defect: d.id, expected: d.item, filed: match.item };
    if (filed.length === 1 && filed[0] === expected) codes.agreed += 1;
    else if (filed.includes(expected)) codes.hedged.push(row);
    else codes.disagreed.push(row);
  }
  // The review bench counts a defect found by a Standards row. A review can
  // also name the defect's own file:line in ## Spec, where no row stands for
  // it; that is reported beside recall, never added to it.
  const specText = new Map(packages.map((p) => [p.id, Object.values(p.spec ?? {}).filter(Boolean).join(' ')]));
  const foundInSpec = defects
    .filter((d) => result.missed.includes(d.id) && Number.isInteger(d.line))
    .filter((d) => {
      const text = (specText.get(d.package) ?? '').replace(/`/g, '');
      const refs = [...text.matchAll(/([\w./-]+\.[A-Za-z]\w*)?:(\d+)/g)];
      let file = null;
      return refs.some(([, path, line]) => {
        if (path) file = path;
        return file !== null && file.endsWith(d.file) && Math.abs(Number(line) - d.line) <= SPEC_TOLERANCE;
      });
    })
    .map((d) => d.id);
  const covered = new Set(result.packages);
  const found = new Set(result.matches.map((m) => m.defect));
  const bySource = {};
  for (const d of defects) {
    if (!covered.has(d.package)) continue;
    const row = (bySource[d.source] ??= { found: 0, total: 0 });
    row.total += 1;
    if (found.has(d.id)) row.found += 1;
  }
  return { ...result, codes, bySource, foundInSpec };
}

/** Every number above, labeled a measurement. */
export function buildReport(result, measured) {
  const rate = (found, total) => (total === 0 ? 1 : found / total);
  const metrics = [
    measurement('recall, overall', { value: result.recall.overall.rate, found: result.recall.overall.found, of: result.recall.overall.total }),
  ];
  for (const [source, row] of Object.entries(result.bySource)) {
    metrics.push(measurement(`recall, ${source}`, { value: rate(row.found, row.total), found: row.found, of: row.total }));
  }
  const filed = result.codes.agreed + result.codes.hedged.length + result.codes.disagreed.length;
  metrics.push(measurement('L code agreement, found behavioral defects', { value: rate(result.codes.agreed, filed), agreed: result.codes.agreed, hedged: result.codes.hedged.length, of: filed }));
  metrics.push(measurement('named only in ## Spec, at the defect\'s file:line', { value: result.foundInSpec.length, unit: 'defects' }));
  const lcoded = result.falsePositiveFindings.filter((f) => /\bL[1-9]\b/.test(String(f.item ?? ''))).length;
  metrics.push(measurement('false positives on correct code, L-coded', { value: lcoded, unit: 'findings' }));
  metrics.push(measurement('false positives on correct code, other', { value: result.falsePositiveFindings.length - lcoded, unit: 'findings' }));
  metrics.push(measurement('findings without a location, an item or a trigger', { value: result.precision.invalid, unit: 'findings' }));
  if (measured) {
    metrics.push(measurement('dispatches', { value: measured.dispatches, unit: 'dispatches' }));
    if (typeof measured.cost === 'number') metrics.push(measurement('cost', { value: measured.cost, unit: 'usd' }));
    const turns = (measured.turns ?? []).map((t) => t.turns).filter(Number.isFinite);
    if (turns.length > 0) metrics.push(measurement('turns, mean', { value: turns.reduce((a, b) => a + b, 0) / turns.length, unit: 'turns' }));
  }
  return measurementReport('holdout', metrics, {
    missed: result.missed,
    codeDisagreements: result.codes.disagreed,
    codeHedges: result.codes.hedged,
    foundInSpec: result.foundInSpec,
    falsePositives: result.falsePositiveFindings,
  });
}

function table(result) {
  const pct = (n, d) => (d === 0 ? '—' : `${((n / d) * 100).toFixed(1)}%`);
  const lines = ['| Measurement | Found | Rate |', '|---|---|---|'];
  lines.push(`| recall, overall | ${result.recall.overall.found}/${result.recall.overall.total} | ${pct(result.recall.overall.found, result.recall.overall.total)} |`);
  for (const [source, row] of Object.entries(result.bySource)) lines.push(`| recall, ${source} | ${row.found}/${row.total} | ${pct(row.found, row.total)} |`);
  const filed = result.codes.agreed + result.codes.hedged.length + result.codes.disagreed.length;
  lines.push(`| L code agreement (hedged: ${result.codes.hedged.length}) | ${result.codes.agreed}/${filed} | ${pct(result.codes.agreed, filed)} |`);
  lines.push(`| named only in ## Spec | ${result.foundInSpec.length} | — |`);
  const lcoded = result.falsePositiveFindings.filter((f) => /\bL[1-9]\b/.test(String(f.item ?? ''))).length;
  lines.push(`| false positives on correct code, L-coded / other | ${lcoded} / ${result.falsePositiveFindings.length - lcoded} | — |`);
  lines.push('', 'No threshold: every row is a measurement (decision 0154).');
  if (result.missed.length > 0) lines.push(`Missed: ${result.missed.join(', ')}`);
  for (const d of result.codes.hedged) lines.push(`Filed under two codes: ${d.defect} — expected ${d.expected}, filed "${d.filed}"`);
  for (const d of result.codes.disagreed) lines.push(`Filed under another code: ${d.defect} — expected ${d.expected}, filed "${d.filed}"`);
  if (result.foundInSpec.length > 0) lines.push(`Named only in ## Spec: ${result.foundInSpec.join(', ')}`);
  return lines.join('\n');
}

function main(argv) {
  let mode = null;
  const verdictsPaths = [];
  const measurementsPaths = [];
  let setDir = HERE;
  let asJson = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    }
    if (arg === '--check-key') mode = 'key';
    else if (arg === '--json') asJson = true;
    else if (arg === '--verdicts') {
      mode = 'verdicts';
      verdictsPaths.push(argv[(i += 1)]);
    } else if (arg === '--measurements') measurementsPaths.push(argv[(i += 1)]);
    else if (arg === '--set') setDir = argv[(i += 1)];
    else {
      process.stderr.write(`holdout: unknown option: ${arg}\n${USAGE}\n`);
      return 2;
    }
  }
  if (mode === null) {
    process.stderr.write(`holdout: --check-key or --verdicts is required\n${USAGE}\n`);
    return 2;
  }
  if (mode === 'key') {
    const { problems, shape } = checkKey(setDir);
    process.stdout.write(`${shape}\n`);
    for (const problem of problems) process.stdout.write(`  ${problem}\n`);
    return problems.length === 0 ? 0 : 1;
  }
  // A set can be reviewed over several runs — a probe, then the rest. They are
  // one set only when no package is in two of them: a package reviewed twice
  // would count its defects twice, and which review stands is not the
  // scorer's to choose.
  const packages = [];
  let measured = null;
  try {
    for (const path of verdictsPaths) {
      for (const pkg of JSON.parse(readFileSync(path, 'utf8')).packages ?? []) {
        if (packages.some((p) => p.id === pkg.id)) throw new Error(`package ${pkg.id} is in two verdicts files`);
        packages.push(pkg);
      }
    }
    for (const path of measurementsPaths) {
      const m = JSON.parse(readFileSync(path, 'utf8'));
      measured = {
        dispatches: (measured?.dispatches ?? 0) + (m.dispatches ?? 0),
        cost: typeof m.cost === 'number' ? (measured?.cost ?? 0) + m.cost : measured?.cost,
        turns: [...(measured?.turns ?? []), ...(m.turns ?? [])],
      };
    }
  } catch (error) {
    process.stderr.write(`holdout: ${error.message}\n`);
    return 1;
  }
  const result = scoreHoldout({ defects: loadCases(setDir), clean: loadClean(setDir), packages });
  process.stdout.write(asJson ? `${JSON.stringify(buildReport(result, measured), null, 2)}\n` : `${table(result)}\n`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
