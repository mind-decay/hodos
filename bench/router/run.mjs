#!/usr/bin/env node
// run.mjs — the router bench: does the router's verdict match the label?
//
// Two jobs, neither of which needs a model:
//   --check-labels   re-derive every case's path from its own nine checklist
//                    rows through the FORMATS.md §3 rules. A label nobody can
//                    derive is a label the author preferred, and scoring a
//                    model against taste teaches nothing.
//   --verdicts <f>   score a run's verdicts against the labels, on the three
//                    axes COMPONENTS.md §7 gates: path, type, campaign flag.
//
// What produces the verdicts file is Stage 4's question (PLATFORM-NOTES.md
// check D). This file scores; it does not invoke.

import { readFileSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { gate, measurement, report } from '../report.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SET = join(HERE, 'set.json');

/** The nine rows of the brief checklist, in the order FORMATS.md §3 fixes. */
export const ROWS = [
  { key: 'files', row: 'files touched (estimate)', numeric: true },
  { key: 'newModule', row: 'new module' },
  { key: 'contract', row: 'contract / schema / route change' },
  { key: 'dependency', row: 'new dependency' },
  { key: 'migration', row: 'data migration' },
  { key: 'units', row: 'needs more than one mergeable unit' },
  { key: 'fog', row: 'fog' },
  { key: 'developers', row: 'more than one developer' },
  { key: 'wait', row: 'external wait' },
];

export const PATHS = ['quick', 'standard', 'deep', 'campaign'];
export const TYPES = ['feature', 'bug', 'refactor', 'question', 'spike', 'upgrade'];
export const THRESHOLDS = { path: 0.85, type: 0.9, campaign: 0.9 };

const CAMPAIGN_ROWS = ['units', 'fog', 'developers', 'wait'];
const DEEP_ROWS = ['contract', 'dependency', 'migration'];
const QUICK_ROWS = ['newModule', 'contract', 'dependency', 'migration'];
const QUICK_FILES = 3;

const USAGE = `Usage: node bench/router/run.mjs [--check-labels | --verdicts <file>] [options]

  --check-labels        re-derive every label from its nine checklist rows and
                        report any that the FORMATS.md §3 rules do not produce
  --verdicts <file>     score a run's verdicts (JSON array of
                        { id, path, type, campaign }) against the labels.
                        Repeatable: a later file overrides an earlier one for
                        the ids it carries, and the report names the mixture
  --measurements <file> fold the run's measurements.json into the JSON report,
                        labeled measurement — never thresholded (decision 0019)
  --rows <file>         the run's rows.json: score the nine checklist rows
                        against the set's own, as a measurement
  --set <file>          use this set instead of bench/router/set.json
  --json                print the JSON report as well as the table
  --help                print this and exit 0

With no action, --check-labels is assumed.

Exit codes: 0 — the labels hold, or every gate passed; 1 — a label does not
follow from its rows, or a gate is under its threshold; 2 — bad invocation.`;

/** Every row present, and each answer one this bench knows. */
function validate(checklist) {
  for (const { key, numeric } of ROWS) {
    const value = checklist?.[key];
    if (value === undefined) throw new Error(`checklist: the row "${key}" is missing`);
    if (value === 'unknown') continue;
    if (numeric) {
      if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) {
        throw new Error(`checklist: "${key}" is a count or "unknown", got ${JSON.stringify(value)}`);
      }
    } else if (value !== 'yes' && value !== 'no') {
      throw new Error(`checklist: "${key}" is yes, no or unknown, got ${JSON.stringify(value)}`);
    }
  }
}

/**
 * The verdict rules of FORMATS.md §3, applied in order, first match wins.
 * `type` is the one input rule 3 names that is not among the nine rows. Its
 * second clause used to name a second — "a countable done-metric" — which
 * decision 0072 removed: DESIGN.md §4.1 defines a `refactor` as target-first
 * *with* a done-metric, so the phrase was true of every refactor and selected
 * nothing, and the bench had been supplying the missing judgement through a
 * per-case boolean the engine never asked for. The clause now reads the type
 * and row 1, both of which the checklist carries.
 * @param {Record<string, string | number>} checklist
 * @param {{ type?: string }} [about]
 * @returns {'quick' | 'standard' | 'deep' | 'campaign'}
 */
export function deriveVerdict(checklist, about = {}) {
  validate(checklist);
  const { type = 'feature' } = about;
  const at = (key) => checklist[key];
  const openOrYes = (key) => at(key) === 'yes' || at(key) === 'unknown';

  if (CAMPAIGN_ROWS.some(openOrYes)) return 'campaign'; // 1
  if (DEEP_ROWS.some((key) => at(key) === 'unknown')) return 'deep'; // 2
  if (at('newModule') === 'yes' && at('contract') === 'yes') return 'deep'; // 3a
  if (type === 'refactor' && isWide(checklist)) return 'deep'; // 3b
  if (at('files') === 'unknown' || at('newModule') === 'unknown') return 'standard'; // 4
  if (at('files') <= QUICK_FILES && QUICK_ROWS.every((key) => at(key) === 'no')) return 'quick'; // 5
  return 'standard'; // 6
}

/** @param {string} [path] */
export function loadSet(path = DEFAULT_SET) {
  const set = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(set.cases)) throw new Error(`${path}: no cases array`);
  // The set restates the thresholds for a reader. A restatement nothing checks
  // is a second copy free to disagree with the code that scores (AUTHORING.md
  // §10), so it is checked here rather than trusted.
  for (const axis of Object.keys(THRESHOLDS)) {
    if (set.thresholds?.[axis] !== THRESHOLDS[axis]) {
      throw new Error(
        `${path}: the ${axis} threshold says ${set.thresholds?.[axis]}, run.mjs scores against ${THRESHOLDS[axis]}`,
      );
    }
  }
  return set;
}

/**
 * Cases whose label the rules do not produce, or whose shape is wrong.
 * @returns {{ id: string, field: string, expected: string, derived: string }[]}
 */
export function checkLabels(set) {
  const problems = [];
  for (const one of set.cases) {
    let derived;
    try {
      derived = deriveVerdict(one.checklist, { type: one.expect.type });
    } catch (error) {
      problems.push({ id: one.id, field: 'checklist', expected: 'the nine rows', derived: error.message });
      continue;
    }
    if (derived !== one.expect.path) {
      problems.push({ id: one.id, field: 'path', expected: one.expect.path, derived });
    }
    if ('wideCountableMetric' in one) {
      problems.push({
        id: one.id,
        field: 'wideCountableMetric',
        expected: 'no such field — rule 3 reads the type and row 1 (decision 0072)',
        derived: String(one.wideCountableMetric),
      });
    }
    if (one.expect.campaign !== (one.expect.path === 'campaign')) {
      problems.push({
        id: one.id,
        field: 'campaign',
        expected: String(one.expect.campaign),
        derived: String(one.expect.path === 'campaign'),
      });
    }
    if (!TYPES.includes(one.expect.type)) {
      problems.push({ id: one.id, field: 'type', expected: TYPES.join('|'), derived: one.expect.type });
    }
  }
  return problems;
}

/**
 * Accuracy on the three gated axes. A case with no verdict counts as wrong on
 * every axis: a router that answers nothing has not been accurate about it.
 */
export function score(set, verdicts) {
  const byId = new Map(verdicts.map((v) => [v.id, v]));
  const axes = { path: { correct: 0 }, type: { correct: 0 }, campaign: { correct: 0 } };
  const missing = [];
  const wrong = [];

  for (const one of set.cases) {
    const given = byId.get(one.id);
    if (!given) {
      missing.push(one.id);
      continue;
    }
    for (const axis of ['path', 'type', 'campaign']) {
      if (given[axis] === one.expect[axis]) axes[axis].correct += 1;
      else wrong.push({ id: one.id, axis, expected: one.expect[axis], given: given[axis] });
    }
  }

  const total = set.cases.length;
  for (const axis of ['path', 'type', 'campaign']) {
    axes[axis].total = total;
    axes[axis].accuracy = total === 0 ? 0 : axes[axis].correct / total;
    axes[axis].threshold = THRESHOLDS[axis];
    axes[axis].passed = axes[axis].accuracy >= THRESHOLDS[axis];
  }
  return { ...axes, missing, wrong, passed: ['path', 'type', 'campaign'].every((a) => axes[a].passed) };
}

/**
 * One printed value cell, read as the bench reads the set's own rows. A cell
 * this cannot read is `null` rather than a guess: the point of the measurement
 * is where the set and the run disagree, and a cell nobody can parse is a
 * disagreement of its own kind.
 * @param {string} key
 * @param {unknown} raw
 * @returns {number | 'yes' | 'no' | 'unknown' | null}
 */
export function normalizeRow(key, raw) {
  const text = String(raw ?? '')
    .replace(/[`*]/g, '')
    .trim()
    .toLowerCase();
  if (text === 'unknown') return 'unknown';
  if (ROWS.find((one) => one.key === key)?.numeric) {
    return /^-?\d+$/.test(text) ? Number(text) : null;
  }
  return text === 'yes' || text === 'no' ? text : null;
}

/**
 * Agreement between the set's rows and the rows a run printed, one row at a
 * time. The three gates score the verdict, which is an aggregate of nine
 * judgements: a gate that moves says nothing about which of the nine moved.
 * This is a **measurement** and carries no threshold (decision 0019) — there is
 * no number of rows a router owes, only the reading of where it and the set's
 * author part company.
 * @param {{ cases: { id: string, checklist: Record<string, unknown> }[] }} set
 * @param {{ id: string, rows: { key: string, value: string, evidence?: string }[] }[]} runRows
 */
export function scoreRows(set, runRows) {
  const byId = new Map(runRows.map((one) => [one.id, one]));
  const perRow = Object.fromEntries(ROWS.map(({ key }) => [key, { agree: 0, total: 0, rate: 0 }]));
  const disagreements = [];
  const missing = [];

  for (const one of set.cases) {
    const printed = byId.get(one.id);
    if (!printed) {
      missing.push(one.id);
      continue;
    }
    for (const { key } of ROWS) {
      if (!(key in one.checklist)) continue;
      const cell = printed.rows.find((r) => r.key === key);
      const given = cell ? normalizeRow(key, cell.value) : null;
      const expected = one.checklist[key];
      perRow[key].total += 1;
      if (given === expected) perRow[key].agree += 1;
      else disagreements.push({ id: one.id, key, expected, given, evidence: cell?.evidence ?? null });
    }
  }
  for (const { key } of ROWS) {
    const one = perRow[key];
    one.rate = one.total === 0 ? 0 : one.agree / one.total;
  }
  return { perRow, disagreements, missing };
}

/**
 * More files than the `quick` limit of row 1 — the width rule 3 asks for. An
 * `unknown` count is not a count over the limit: rule 4 is what reaches it.
 * @param {Record<string, string | number>} checklist
 */
const isWide = (checklist) => typeof checklist.files === 'number' && checklist.files > QUICK_FILES;

const percent = (value) => `${(value * 100).toFixed(1)}%`;

function reportLabels(set, out) {
  const problems = checkLabels(set);
  const counts = Object.fromEntries(
    PATHS.map((path) => [path, set.cases.filter((c) => c.expect.path === path).length]),
  );
  out(`${set.cases.length} cases — ${PATHS.map((p) => `${counts[p]} ${p}`).join(' / ')}`);
  if (problems.length === 0) {
    out('every label follows the FORMATS.md §3 rules');
    return 0;
  }
  for (const problem of problems) {
    out(`${problem.id}: ${problem.field} — expected ${problem.expected}, the rows give ${problem.derived}`);
  }
  return 1;
}

/**
 * Verdicts from more than one run, later files winning. A partial re-run after
 * a specification change measures the cases the change can move without buying
 * the thirty it cannot; the price is that the score is **mixed**, and a mixed
 * score that does not say so is a number a reader would take for one run.
 * @param {{ path: string, verdicts: { id: string }[] }[]} files
 */
export function mergeVerdicts(files) {
  const byId = new Map();
  const from = new Map();
  for (const { path, verdicts } of files) {
    for (const one of verdicts) {
      byId.set(one.id, one);
      from.set(one.id, path);
    }
  }
  const sources = files.map(({ path }) => ({
    path,
    count: [...from.values()].filter((one) => one === path).length,
  }));
  return { verdicts: [...byId.values()], sources };
}

/**
 * The report of COMPONENTS.md §7: three gates, and whatever the run measured
 * beside them. A measurement is folded in only when the run wrote one; the
 * label is what keeps the two readable apart (decision 0019).
 * @param {ReturnType<typeof score>} result
 * @param {{ cost?: number, toolCalls?: number, evidenceCalls?: number, turns?: number }[]} [measured]
 * @param {ReturnType<typeof scoreRows>} [rowScore]
 * @param {ReturnType<typeof mergeVerdicts>['sources']} [sources]
 */
export function buildReport(result, measured, rowScore, sources) {
  const metrics = ['path', 'type', 'campaign'].map((axis) =>
    gate(axis, {
      value: result[axis].accuracy,
      threshold: result[axis].threshold,
      correct: result[axis].correct,
      total: result[axis].total,
    }),
  );
  if (Array.isArray(measured) && measured.length > 0) {
    const sum = (key) => measured.reduce((total, one) => total + (Number(one[key]) || 0), 0);
    const mean = (key) => sum(key) / measured.length;
    metrics.push(
      measurement('cases measured', { value: measured.length, unit: 'cases' }),
      measurement('cost', { value: sum('cost'), unit: 'usd' }),
      measurement('tool calls, mean', { value: mean('toolCalls'), unit: 'calls' }),
      measurement('evidence calls, mean', { value: mean('evidenceCalls'), unit: 'calls' }),
      measurement('turns, mean', { value: mean('turns'), unit: 'turns' }),
    );
  }
  const details = { missing: result.missing, wrong: result.wrong };
  if (sources && sources.length > 1) details.sources = sources;
  if (rowScore) {
    for (const { key, row } of ROWS) {
      const one = rowScore.perRow[key];
      metrics.push(
        measurement(`row agreement: ${key}`, {
          value: one.rate,
          unit: 'share',
          row,
          agree: one.agree,
          total: one.total,
        }),
      );
    }
    details.rowDisagreements = rowScore.disagreements;
  }
  return report('router', metrics, details);
}

function reportRows(scored, out) {
  out('');
  out('row                                 agree    agreement  kind');
  for (const { key, row } of ROWS) {
    const one = scored.perRow[key];
    out(
      `${row.padEnd(35)} ${String(one.agree).padStart(3)}/${String(one.total).padEnd(3)} ` +
        `${percent(one.rate).padStart(9)}  measurement`,
    );
  }
  if (scored.missing.length > 0) out(`no rows for ${scored.missing.length}: ${scored.missing.join(', ')}`);
}

function reportScore(set, verdicts, out, measured, rowScore, sources, asJson) {
  const result = score(set, verdicts);
  if (sources && sources.length > 1) {
    const fresh = sources[sources.length - 1];
    out(
      `mixed: ${fresh.count} of ${set.cases.length} verdicts from ${fresh.path}, ` +
        `the rest carried over — ${sources
          .slice(0, -1)
          .map((one) => `${one.count} from ${one.path}`)
          .join(', ')}`,
    );
  }
  out('axis       correct     accuracy   threshold  gate');
  for (const axis of ['path', 'type', 'campaign']) {
    const a = result[axis];
    out(
      `${axis.padEnd(10)} ${String(a.correct).padStart(3)}/${String(a.total).padEnd(3)} ` +
        `${percent(a.accuracy).padStart(8)} ${percent(a.threshold).padStart(11)}  ${a.passed ? 'PASS' : 'FAIL'}`,
    );
  }
  if (result.missing.length > 0) out(`no verdict for ${result.missing.length}: ${result.missing.join(', ')}`);
  for (const one of result.wrong) {
    out(`${one.id}: ${one.axis} — expected ${one.expected}, got ${one.given}`);
  }
  out(`gates: ${result.passed ? 'PASS' : 'FAIL'}`);
  if (rowScore) reportRows(rowScore, out);
  if (asJson) out(JSON.stringify(buildReport(result, measured, rowScore, sources), null, 2));
  return result.passed ? 0 : 1;
}

function main(argv) {
  if (argv.includes('--help')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  let setPath = DEFAULT_SET;
  const verdictsPaths = [];
  let measurementsPath;
  let rowsPath;
  let asJson = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check-labels') continue;
    if (arg === '--json') {
      asJson = true;
      continue;
    }
    if (arg === '--set' || arg === '--verdicts' || arg === '--measurements' || arg === '--rows') {
      const value = argv[i + 1];
      i += 1;
      if (!value) {
        process.stderr.write(`router: ${arg} needs a file\n`);
        return 2;
      }
      if (arg === '--set') setPath = value;
      else if (arg === '--measurements') measurementsPath = value;
      else if (arg === '--rows') rowsPath = value;
      else verdictsPaths.push(value);
    } else {
      process.stderr.write(`router: unknown argument ${arg}\n${USAGE}\n`);
      return 2;
    }
  }

  const out = (line) => process.stdout.write(`${line}\n`);
  let set;
  try {
    set = loadSet(setPath);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  if (verdictsPaths.length === 0) return reportLabels(set, out);

  let verdicts;
  let sources;
  try {
    const files = verdictsPaths.map((path) => {
      const read = JSON.parse(readFileSync(path, 'utf8'));
      if (!Array.isArray(read)) throw new Error(`${path}: expected an array of verdicts`);
      return { path, verdicts: read };
    });
    ({ verdicts, sources } = mergeVerdicts(files));
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  let measured;
  if (measurementsPath) {
    try {
      measured = JSON.parse(readFileSync(measurementsPath, 'utf8'));
      if (!Array.isArray(measured)) throw new Error(`${measurementsPath}: expected an array of measurements`);
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }
  let rowScore;
  if (rowsPath) {
    try {
      const printed = JSON.parse(readFileSync(rowsPath, 'utf8'));
      if (!Array.isArray(printed)) throw new Error(`${rowsPath}: expected an array of printed rows`);
      rowScore = scoreRows(set, printed);
    } catch (error) {
      process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }
  return reportScore(set, verdicts, out, measured, rowScore, sources, asJson);
}

// The same guard the sibling script of this stage uses. `endsWith('run.mjs')`
// would fire for bench/review/run.mjs and bench/noop/run.mjs, which
// COMPONENTS.md §7 has already named, whenever one of them imports this module.
if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
