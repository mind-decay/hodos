#!/usr/bin/env node
// run.mjs — score a review run against the seeded set (COMPONENTS.md §7).
//
// The scorer makes no model call. It reads the patches' own metadata, derives
// the answer key from them, and measures a verdicts file invoke.mjs wrote —
// which is why it can be proved by unit tests that cost nothing, separately
// from the run that costs a dispatch (decision 0019).
//
// A defect is found when a finding names its file, lands within five lines of
// the defect's anchor, and carries an item of the right kind. Kind is read off
// the item, never off the prose: a bench that judges a finding's wording scores
// the reader's taste, and a disagreement then has no arbiter.
//
// The anchor is a line of source, not a number. Two patches in one package
// shift each other's lines, so the number in the patch is the patch's own and
// invoke.mjs resolves the text in the copy it built; that resolved line is what
// this scorer measures against, and one finding credits at most one defect.

import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { gate, measurement, report as labeledReport } from '../report.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));

const THRESHOLDS = { recall: 0.8, convention: 0.8, behavioral: 0.8, precision: 0.85 };
const TOLERANCE = 5; // lines between a finding and the anchor it is reporting
const MINIMUMS = { seeded: 18, convention: 12, behavioral: 6, codes: 6, clean: 6 };

const USAGE = `Usage: node bench/review/run.mjs --check-key | --verdicts <file>

Scores hodos-reviewer against bench/review/seeded and bench/review/clean.json.

  --check-key        re-derive every patch's kind from its own metadata and
                     report the set's shape; exit 1 on a patch that disagrees
                     with itself.
  --verdicts <file>  score the run invoke.mjs wrote; exit 1 when a threshold
                     is missed.
  --set <dir>        read the set from <dir> instead of this script's own
                     directory (the tests use it).
  --measurements <f> fold the run's measurements.json into the JSON report,
                     labeled measurement — never thresholded (decision 0019).
  --json             print the labeled JSON report as well as the table.
  --help             print this and exit 0.

Thresholds (COMPONENTS.md §7, decision 0015): recall ≥80% overall and ≥80% for
each of convention and behavioral; precision ≥85%.

Exit codes: 0 — the set is consistent, or every threshold is met; 1 — a patch
disagrees with itself, or a threshold is missed; 2 — bad invocation.`;

/** The `# key: value` header a patch carries above its diff. */
export function parseMeta(text) {
  const meta = {};
  for (const line of text.split('\n')) {
    if (!line.startsWith('#')) break;
    const m = /^#\s*([a-zA-Z]+):\s*(.*)$/.exec(line);
    if (m) meta[m[1]] = m[2].trim();
  }
  return meta;
}

/** The lines each file gains or changes, in the new file's numbering. */
export function hunkRanges(patchText) {
  const ranges = {};
  let file = null;
  for (const line of patchText.split('\n')) {
    const header = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
    if (header) {
      file = header[2];
      ranges[file] ??= [];
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunk && file) {
      const start = Number(hunk[1]);
      const count = hunk[2] === undefined ? 1 : Number(hunk[2]);
      ranges[file].push([start, start + Math.max(count, 1) - 1]);
    }
  }
  return ranges;
}

/**
 * `L1`..`L9` is a behavioral code; every other item names a convention. The
 * code is looked for anywhere in the cell, because a reviewer that cites both
 * the plan field and the risk code is naming the axis, not failing to.
 */
export const kindOfItem = (item) => (/\bL[1-9]\b/.test(String(item ?? '')) ? 'behavioral' : 'convention');

const inRange = (ranges, line) => (ranges ?? []).some(([from, to]) => line >= from && line <= to);

/** The added line matching `anchor`, in the patch's own new-file numbering. */
export function locateAnchor(patchText, anchor) {
  let file = null;
  let lineno = 0;
  for (const line of patchText.split('\n')) {
    const header = /^diff --git a\/(.+) b\/(.+)$/.exec(line);
    if (header) {
      file = header[2];
      continue;
    }
    const hunk = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (hunk) {
      lineno = Number(hunk[1]) - 1;
      continue;
    }
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    if (line.startsWith('+')) {
      lineno += 1;
      if (line.slice(1).trim() === anchor.trim()) return { file, line: lineno };
    } else if (line.startsWith(' ')) {
      lineno += 1;
    }
  }
  return null;
}

/** Every seeded patch, as a defect with its own answer key. */
export function loadDefects(setDir) {
  const dir = join(setDir, 'seeded');
  return readdirSync(dir)
    .filter((name) => name.endsWith('.patch'))
    .sort()
    .map((name) => {
      const text = readFileSync(join(dir, name), 'utf8');
      const meta = parseMeta(text);
      const [file, line] = String(meta.line ?? '').split(':');
      return {
        id: meta.id ?? name.replace(/\.patch$/, ''),
        patch: name,
        package: meta.package,
        fixture: meta.fixture,
        kind: meta.kind,
        item: meta.item,
        trigger: meta.trigger,
        what: meta.what,
        anchor: meta.anchor,
        file,
        line: Number(line),
        ranges: hunkRanges(text),
        text,
      };
    });
}

export const loadClean = (setDir) => JSON.parse(readFileSync(join(setDir, 'clean.json'), 'utf8')).files;

export function score({ defects: all, clean, packages }) {
  const byPackage = new Map(packages.map((p) => [p.id, p.findings ?? []]));
  // A run of one package is measured on that package. Counting the defects
  // nobody dispatched against would make every --only run fail by arithmetic.
  const covered = new Set(packages.map((p) => p.id));
  const defects = all.filter((d) => covered.has(d.package));
  const cleanFiles = new Set(clean.map((c) => `${c.package}:${c.file}`));

  const anchors = new Map(packages.map((p) => [p.id, p.anchors ?? {}]));
  const found = new Set();
  const miscategorised = [];
  const claimed = new Set();

  // Four passes, most specific first: the row that names the defect's own axis
  // at its own line, then that axis nearby, then any row at the line, then any
  // row nearby. Two findings a line apart are common — a package seeds three
  // defects into one diff — and the pass order is what stops the wrong one
  // being credited.
  for (const pass of ['exact-same', 'near-same', 'exact-any', 'near-any']) {
    const sameAxis = pass.endsWith('-same');
    const exact = pass.startsWith('exact-');
    for (const defect of defects) {
      if (found.has(defect.id)) continue;
      const at = anchors.get(defect.package)?.[defect.id] ?? defect.line;
      const findings = byPackage.get(defect.package) ?? [];
      for (const [index, finding] of findings.entries()) {
        const key = `${defect.package}:${index}`;
        if (claimed.has(key)) continue;
        if (finding.file !== defect.file || !Number.isInteger(finding.line)) continue;
        if (sameAxis && kindOfItem(finding.item) !== defect.kind) continue;
        const distance = Math.abs(finding.line - at);
        if (exact ? distance !== 0 : distance > TOLERANCE) continue;
        found.add(defect.id);
        claimed.add(key);
        // Recall measures finding, not labelling: a defect reported at its line
        // is found even where the reviewer files it under the other axis, and
        // the disagreement is a measurement of its own.
        if (kindOfItem(finding.item) !== defect.kind) {
          miscategorised.push({ defect: defect.id, expected: defect.kind, item: finding.item });
        }
        break;
      }
    }
  }

  const invalidFindings = [];
  const falsePositiveFindings = [];
  let total = 0;
  let absences = 0;
  for (const pkg of packages) {
    for (const finding of pkg.findings ?? []) {
      total += 1;
      // A path with no line is a location only when the subject is a file that
      // does not exist (FORMATS.md §9, decision 0038), and the package's own
      // file list is what says so. A path that is in the package owes a line;
      // a verdicts file that lists no files cannot prove an absence, and an
      // unprovable location is not one. A directory is not a candidate either:
      // nothing is missing from a path other files live under. The provable ones are counted, so the
      // exception widening shows as a rising number rather than as silence.
      // Directoryness comes from the package's file list, not from the name: a
      // path is a directory when something in the package lives under it, and
      // a missing `Dockerfile` is as reportable as a missing `foo.test.ts`.
      const known = Array.isArray(pkg.files) ? pkg.files : null;
      const isDirectory = (known ?? []).some((f) => f.startsWith(`${finding.file}/`));
      const absent = Boolean(finding.file) && known !== null && !known.includes(finding.file) && !isDirectory;
      const located = Boolean(finding.file) && (Number.isInteger(finding.line) || absent);
      if (located && !Number.isInteger(finding.line)) absences += 1;
      const itemed = Boolean(String(finding.item ?? '').trim());
      const behavioral = kindOfItem(finding.item) === 'behavioral';
      const severe = finding.sev === 'blocker' || finding.sev === 'major';
      const triggered = Boolean(finding.trigger) && finding.trigger !== '—';
      if (!located) {
        const reason = finding.file ? 'no line' : 'no location';
        invalidFindings.push({ ...finding, package: pkg.id, reason });
      }
      else if (!itemed) invalidFindings.push({ ...finding, package: pkg.id, reason: 'no item' });
      else if (behavioral && severe && !triggered) {
        invalidFindings.push({ ...finding, package: pkg.id, reason: 'no trigger' });
      } else if (cleanFiles.has(`${pkg.id}:${finding.file}`)) {
        falsePositiveFindings.push({ ...finding, package: pkg.id });
      }
    }
  }

  const rate = (n, d) => (d === 0 ? 1 : n / d);
  const kindRecall = (kind) => {
    const of = defects.filter((d) => d.kind === kind);
    const hit = of.filter((d) => found.has(d.id)).length;
    return { total: of.length, found: hit, rate: rate(hit, of.length) };
  };
  const wrong = invalidFindings.length + falsePositiveFindings.length;

  return {
    packages: [...covered].sort(),
    recall: {
      overall: { total: defects.length, found: found.size, rate: rate(found.size, defects.length) },
      convention: kindRecall('convention'),
      behavioral: kindRecall('behavioral'),
    },
    precision: {
      findings: total,
      invalid: invalidFindings.length,
      falsePositives: falsePositiveFindings.length,
      absences,
      value: total === 0 ? 1 : (total - wrong) / total,
    },
    missed: defects.filter((d) => !found.has(d.id)).map((d) => d.id),
    miscategorised,
    invalidFindings,
    falsePositiveFindings,
  };
}

/** Every way a patch can disagree with itself, or the set with its contract. */
export function checkKey(setDir) {
  const defects = loadDefects(setDir);
  const problems = [];
  const say = (id, text) => problems.push(`${id}: ${text}`);

  for (const d of defects) {
    for (const key of ['package', 'fixture', 'kind', 'item', 'file', 'what']) {
      if (!d[key]) say(d.id, `the header has no ${key}`);
    }
    if (d.kind !== 'convention' && d.kind !== 'behavioral') say(d.id, `kind ${d.kind} is not convention or behavioral`);
    else if (kindOfItem(d.item) !== d.kind) say(d.id, `item "${d.item}" reads as ${kindOfItem(d.item)}, not ${d.kind}`);
    const hasTrigger = Boolean(d.trigger) && d.trigger !== '—';
    if (d.kind === 'behavioral' && !hasTrigger) say(d.id, 'a behavioral defect states its trigger');
    if (d.kind === 'convention' && hasTrigger) say(d.id, 'a convention defect carries the trigger —, its location is its instance');
    if (!Number.isInteger(d.line)) say(d.id, `line "${d.line}" is not a line`);
    else if (!d.ranges[d.file]) say(d.id, `the patch does not change ${d.file}`);
    else if (!inRange(d.ranges[d.file], d.line)) say(d.id, `line ${d.line} is outside every hunk this patch changes`);
    if (!d.anchor) say(d.id, 'the header has no anchor');
    else {
      const at = locateAnchor(d.text, d.anchor);
      if (at === null) say(d.id, `the anchor is not among the lines this patch adds`);
      else if (at.file !== d.file || at.line !== d.line) say(d.id, `the anchor is at ${at.file}:${at.line}, not ${d.file}:${d.line}`);
    }
  }

  const clean = loadClean(setDir);
  const packages = [...new Set(defects.map((d) => d.package))].sort();
  for (const entry of clean) {
    const text = (() => {
      try {
        return readFileSync(join(setDir, entry.patch), 'utf8');
      } catch {
        return null;
      }
    })();
    if (text === null) say(entry.file, `clean.json names ${entry.patch}, which is not there`);
    else if (!hunkRanges(text)[entry.file]) say(entry.file, `${entry.patch} does not change ${entry.file}`);
    if (!packages.includes(entry.package)) say(entry.file, `package ${entry.package} has no seeded defect`);
  }
  for (const id of packages) {
    let plan;
    try {
      plan = readFileSync(join(setDir, 'packages', `${id}.md`), 'utf8');
    } catch {
      say(id, 'the package has no plan under packages/');
      continue;
    }
    for (const heading of ['## Design', '## Tasks', '## Non-goals']) {
      if (!plan.includes(heading)) say(id, `the plan has no ${heading} section`);
    }
  }

  const convention = defects.filter((d) => d.kind === 'convention').length;
  const behavioral = defects.filter((d) => d.kind === 'behavioral').length;
  const codes = new Set(defects.filter((d) => d.kind === 'behavioral').map((d) => d.item.split(/\s+/)[0]));
  if (defects.length < MINIMUMS.seeded) problems.push(`the set holds ${defects.length} patches, fewer than ${MINIMUMS.seeded}`);
  if (convention < MINIMUMS.convention) problems.push(`${convention} convention defects, fewer than ${MINIMUMS.convention}`);
  if (behavioral < MINIMUMS.behavioral) problems.push(`${behavioral} behavioral defects, fewer than ${MINIMUMS.behavioral}`);
  if (codes.size < MINIMUMS.codes) problems.push(`${codes.size} distinct L codes, fewer than ${MINIMUMS.codes}`);
  if (clean.length < MINIMUMS.clean) problems.push(`${clean.length} clean files, fewer than ${MINIMUMS.clean}`);

  return {
    problems,
    shape: `${defects.length} seeded · ${convention} convention · ${behavioral} behavioral · ${codes.size} distinct L codes · ${clean.length} clean files · ${packages.length} packages`,
  };
}

const pct = (value) => `${(value * 100).toFixed(1)}%`;

function report(result) {
  const rows = [
    ['recall, overall', result.recall.overall, THRESHOLDS.recall],
    ['recall, convention', result.recall.convention, THRESHOLDS.convention],
    ['recall, behavioral', result.recall.behavioral, THRESHOLDS.behavioral],
  ];
  const lines = ['| Axis | Found | Rate | Threshold | |', '|---|---|---|---|---|'];
  for (const [name, value, threshold] of rows) {
    lines.push(
      `| ${name} | ${value.found}/${value.total} | ${pct(value.rate)} | ${pct(threshold)} | ${value.rate >= threshold ? 'PASS' : 'FAIL'} |`,
    );
  }
  const p = result.precision;
  lines.push(
    `| precision | ${p.findings - p.invalid - p.falsePositives}/${p.findings} | ${pct(p.value)} | ${pct(THRESHOLDS.precision)} | ${p.value >= THRESHOLDS.precision ? 'PASS' : 'FAIL'} |`,
  );
  return lines.join('\n');
}

/**
 * The report of COMPONENTS.md §7: four gates, and the dispatch counts and cost
 * a run measured beside them. The label is what keeps the two readable apart
 * (decision 0019), so a measurement never arrives carrying a threshold.
 * @param {ReturnType<typeof score>} result
 * @param {{ dispatches?: number, cost?: number, turns?: { turns?: number }[] }} [measured]
 */
export function buildReport(result, measured) {
  const metrics = [
    gate('recall, overall', {
      value: result.recall.overall.rate,
      threshold: THRESHOLDS.recall,
      found: result.recall.overall.found,
      total: result.recall.overall.total,
    }),
    gate('recall, convention', {
      value: result.recall.convention.rate,
      threshold: THRESHOLDS.convention,
      found: result.recall.convention.found,
      total: result.recall.convention.total,
    }),
    gate('recall, behavioral', {
      value: result.recall.behavioral.rate,
      threshold: THRESHOLDS.behavioral,
      found: result.recall.behavioral.found,
      total: result.recall.behavioral.total,
    }),
    gate('precision', {
      value: result.precision.value,
      threshold: THRESHOLDS.precision,
      findings: result.precision.findings,
      wrong: result.precision.invalid + result.precision.falsePositives,
    }),
  ];
  if (measured) {
    if (typeof measured.dispatches === 'number') {
      metrics.push(measurement('dispatches', { value: measured.dispatches, unit: 'dispatches' }));
    }
    if (typeof measured.cost === 'number') {
      metrics.push(measurement('cost', { value: measured.cost, unit: 'usd' }));
    }
    if (Array.isArray(measured.turns) && measured.turns.length > 0) {
      const total = measured.turns.reduce((sum, one) => sum + (Number(one.turns) || 0), 0);
      metrics.push(measurement('turns, mean', { value: total / measured.turns.length, unit: 'turns' }));
    }
  }
  return labeledReport('review', metrics, result);
}

function main(argv) {
  let mode = null;
  let verdictsPath = null;
  let setDir = HERE;
  let asJson = false;
  let measurementsPath;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    }
    if (arg === '--check-key') mode = 'key';
    else if (arg === '--json') asJson = true;
    else if (arg === '--measurements') {
      measurementsPath = argv[i + 1];
      i += 1;
    }
    else if (arg === '--verdicts') {
      mode = 'verdicts';
      verdictsPath = argv[i + 1];
      i += 1;
    } else if (arg === '--set') {
      setDir = argv[i + 1];
      i += 1;
    } else {
      process.stderr.write(`review-bench: unknown option: ${arg}\n${USAGE}\n`);
      return 2;
    }
  }
  if (mode === null) {
    process.stderr.write(`review-bench: --check-key or --verdicts is required\n${USAGE}\n`);
    return 2;
  }

  if (mode === 'key') {
    const { problems, shape } = checkKey(setDir);
    process.stdout.write(`${shape}\n`);
    if (problems.length === 0) return 0;
    for (const problem of problems) process.stdout.write(`  ${problem}\n`);
    return 1;
  }

  if (!verdictsPath) {
    process.stderr.write(`review-bench: --verdicts needs a file\n${USAGE}\n`);
    return 2;
  }
  let verdicts;
  try {
    verdicts = JSON.parse(readFileSync(verdictsPath, 'utf8'));
  } catch (error) {
    process.stderr.write(`review-bench: ${verdictsPath} is unreadable — ${error.message}\n`);
    return 1;
  }
  const defects = loadDefects(setDir);
  const result = score({
    defects,
    clean: loadClean(setDir),
    packages: verdicts.packages ?? [],
  });
  process.stdout.write(`${report(result)}\n`);
  // The gate is over the whole set. A verdicts file holding some of it scores
  // what it holds, which is what --only is for — but a run that does not say it
  // asked for part cannot be told from one that lost the rest, so the second
  // does not pass.
  const all = [...new Set(defects.map((d) => d.package))];
  const only = Array.isArray(verdicts.only) ? verdicts.only : null;
  const whole = result.packages.length === all.length;
  process.stdout.write(
    `packages scored: ${result.packages.length} of ${all.length}${only ? ` (--only ${only.join(',')})` : ''}\n`,
  );
  if (result.missed.length > 0) process.stdout.write(`\nMissed: ${result.missed.join(', ')}\n`);
  if (result.precision.absences > 0) {
    process.stdout.write(`Located by path alone: ${result.precision.absences} of ${result.precision.findings}\n`);
  }
  if (result.miscategorised.length > 0) {
    process.stdout.write(
      `Miscategorised: ${result.miscategorised.map((m) => `${m.defect} as "${m.item}"`).join(', ')}\n`,
    );
  }
  for (const finding of result.invalidFindings) {
    process.stdout.write(`Invalid (${finding.reason}): ${finding.package} ${finding.file ?? '—'}:${finding.line ?? '—'}\n`);
  }
  for (const finding of result.falsePositiveFindings) {
    process.stdout.write(`False positive: ${finding.package} ${finding.file}:${finding.line} — ${finding.item}\n`);
  }
  let measured;
  if (measurementsPath) {
    try {
      measured = JSON.parse(readFileSync(measurementsPath, 'utf8'));
    } catch (error) {
      process.stderr.write(`review-bench: ${error instanceof Error ? error.message : String(error)}\n`);
      return 1;
    }
  }
  if (asJson) process.stdout.write(`${JSON.stringify(buildReport(result, measured), null, 2)}\n`);

  const met =
    (whole || only !== null) &&
    result.recall.overall.rate >= THRESHOLDS.recall &&
    result.recall.convention.rate >= THRESHOLDS.convention &&
    result.recall.behavioral.rate >= THRESHOLDS.behavioral &&
    result.precision.value >= THRESHOLDS.precision;
  return met ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
