import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { buildReport, checkKey, loadCases, scoreHoldout } from './run.mjs';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const RUN = fileURLToPath(new URL('./run.mjs', import.meta.url));
const run = (...args) => spawnSync(process.execPath, [RUN, ...args], { encoding: 'utf8' });

/** A copy of the committed set, to break one thing in. */
function setCopy() {
  const dir = mkdtempSync(join(tmpdir(), 'hodos-holdout-'));
  cpSync(HERE, dir, { recursive: true, filter: (src) => !src.includes('pilot-cache') && !src.includes('/runs/') });
  return dir;
}

test('the committed hold-out set is self-consistent, and says what it holds', () => {
  const out = run('--check-key');

  assert.equal(out.status, 0, out.stdout + out.stderr);
  assert.match(out.stdout, /30 seeded · 0 convention · 30 behavioral/);
  assert.match(out.stdout, /6 clean files · 6 packages · 4 pilot cases in 3 packages/);
});

test('the set is held to its own contract and not to the review bench minimums it could never meet', () => {
  // bench/review's --check-key refuses a set with fewer than 12 convention
  // defects; a hold-out set has none by construction, and that is not a flaw.
  const { problems } = checkKey(HERE);

  assert.deepEqual(problems, []);
});

test('a pilot case without the hash of its line fails --check-key: nothing else can re-point it', () => {
  const dir = setCopy();
  const key = JSON.parse(readFileSync(join(dir, 'key.json'), 'utf8'));
  delete key.cases[0].anchorSha256;
  writeFileSync(join(dir, 'key.json'), JSON.stringify(key));

  const out = run('--check-key', '--set', dir);

  assert.equal(out.status, 1);
  assert.match(out.stdout, /p-outline-total: the case has no anchorSha256/);
});

test('a pilot case whose line text is stored in the key fails --check-key — the pilot is not MIT', () => {
  const dir = setCopy();
  const key = JSON.parse(readFileSync(join(dir, 'key.json'), 'utf8'));
  key.cases[2].anchor = '.prev_named_sibling()';
  writeFileSync(join(dir, 'key.json'), JSON.stringify(key));

  const out = run('--check-key', '--set', dir);

  assert.equal(out.status, 1);
  assert.match(out.stdout, /p-ts-comment-extra: a pilot case stores no source text \(anchor\)/);
});

test('pilot cases load as defects in their own packages, beside the patch defects', () => {
  const cases = loadCases(HERE);

  const pilot = cases.filter((d) => d.source === 'pilot');
  assert.equal(pilot.length, 4);
  assert.deepEqual([...new Set(pilot.map((d) => d.package))].sort(), ['pilot-outline', 'pilot-rust', 'pilot-ts']);
  assert.equal(cases.filter((d) => d.source === 'logic-lens').length, 30);
});

const defect = (id, pkg, file, line, kind, item, source) => ({ id, package: pkg, file, line, kind, item, source, ranges: {} });

test('a defect found under another L code counts as found and as a code disagreement', () => {
  const result = scoreHoldout({
    defects: [defect('ll-101', 'h1', 'orders/service.py', 7, 'behavioral', 'L6', 'logic-lens')],
    clean: [],
    packages: [{ id: 'h1', findings: [{ sev: 'major', file: 'orders/service.py', line: 7, item: 'L2 type contract', trigger: 'amount 0' }] }],
  });

  assert.equal(result.recall.overall.found, 1);
  assert.deepEqual(result.codes, { agreed: 0, hedged: [], disagreed: [{ defect: 'll-101', expected: 'L6', filed: 'L2 type contract' }] });
});

test('recall is reported per source, so the pilot cases are never averaged into the imported ones', () => {
  const result = scoreHoldout({
    defects: [
      defect('ll-1', 'h1', 'a.py', 3, 'behavioral', 'L1', 'logic-lens'),
      defect('p-x', 'pilot-x', 'b.rs', 10, 'behavioral', 'L6', 'pilot'),
    ],
    clean: [],
    packages: [
      { id: 'h1', findings: [{ sev: 'major', file: 'a.py', line: 3, item: 'L1', trigger: 'x' }] },
      { id: 'pilot-x', findings: [] },
    ],
  });

  assert.deepEqual(result.bySource, { 'logic-lens': { found: 1, total: 1 }, pilot: { found: 0, total: 1 } });
});

test('the report is measurements only — no gate, no pass or fail', () => {
  const result = scoreHoldout({
    defects: [defect('ll-1', 'h1', 'a.py', 3, 'behavioral', 'L1', 'logic-lens')],
    clean: [{ package: 'h1', file: 'c.py' }],
    packages: [{ id: 'h1', findings: [{ sev: 'major', file: 'c.py', line: 2, item: 'L4', trigger: 'x' }] }],
  });

  const report = buildReport(result, { dispatches: 1, cost: 0.5, turns: [{ id: 'h1', turns: 2 }] });

  assert.equal('passed' in report, false);
  assert.ok(report.metrics.every((m) => m.kind === 'measurement'), JSON.stringify(report.metrics));
  assert.equal(report.metrics.find((m) => m.name === 'false positives on correct code, L-coded').value, 1);
});

test('a finding filed under two codes, one of them the defect\'s, is a hedge — neither agreed nor disagreed', () => {
  // Added after the first probe (2026-09-30), before the main run: its reviewer
  // filed ll-201 as "L5 / L8 resource lifecycle", and a first-code rule read it
  // as a disagreement with L8.
  const result = scoreHoldout({
    defects: [defect('ll-201', 'h1', 'storage/uploader.py', 6, 'behavioral', 'L8', 'logic-lens')],
    clean: [],
    packages: [{ id: 'h1', findings: [{ sev: 'blocker', file: 'storage/uploader.py', line: 6, item: 'L5 / L8 resource lifecycle', trigger: 'x' }] }],
  });

  assert.deepEqual(result.codes, { agreed: 0, hedged: [{ defect: 'll-201', expected: 'L8', filed: 'L5 / L8 resource lifecycle' }], disagreed: [] });
});

test('a defect the review names at its file:line only in ## Spec is reported apart, not counted as found', () => {
  // Added after the first probe, before the main run: its reviewer named both
  // pilot-outline defects in Spec's Missing entry, and the review bench's rule
  // reads the Standards rows alone. The rule stays; the Spec catch is its own row.
  const result = scoreHoldout({
    defects: [
      defect('p-a', 'pilot-o', '.claude/rules/assert-message.md', 43, 'convention', 'plan T3 Acceptance', 'pilot'),
      defect('p-b', 'pilot-o', '.claude/rules/assert-message.md', 49, 'convention', 'plan T3 Acceptance', 'pilot'),
      defect('p-c', 'pilot-o', 'src/other.rs', 10, 'convention', 'plan T1 Acceptance', 'pilot'),
    ],
    clean: [],
    packages: [{
      id: 'pilot-o',
      findings: [],
      spec: { missing: '**(major)** The numbers at `.claude/rules/assert-message.md:43`, `:49`, `:51` count a trailing comma as a message.', extra: null, misunderstood: null, unclaimed: null },
    }],
  });

  assert.equal(result.recall.overall.found, 0);
  assert.deepEqual(result.foundInSpec, ['p-a', 'p-b']);
});

/** A run directory holding a verdicts.json and a measurements.json. */
function runFiles(packages, measured) {
  const dir = mkdtempSync(join(tmpdir(), 'hodos-holdout-run-'));
  writeFileSync(join(dir, 'verdicts.json'), JSON.stringify({ packages }));
  writeFileSync(join(dir, 'measurements.json'), JSON.stringify(measured));
  return dir;
}

test('two runs given together are scored as one set, their costs summed', () => {
  // Added after the main run (2026-09-30): the probe reviewed h1 and
  // pilot-outline, the main run the other seven, and the set is all nine.
  const probe = runFiles([{ id: 'h1', findings: [] }], { dispatches: 1, cost: 0.5, turns: [{ id: 'h1', turns: 2 }] });
  const main = runFiles([{ id: 'h2', findings: [] }], { dispatches: 1, cost: 0.25, turns: [{ id: 'h2', turns: 4 }] });

  const out = run('--verdicts', join(probe, 'verdicts.json'), '--verdicts', join(main, 'verdicts.json'),
    '--measurements', join(probe, 'measurements.json'), '--measurements', join(main, 'measurements.json'), '--json');

  assert.equal(out.status, 0, out.stderr);
  const report = JSON.parse(out.stdout);
  const metric = (name) => report.metrics.find((m) => m.name === name);
  assert.equal(metric('recall, logic-lens').of, 10, 'h1 and h2, five defects each');
  assert.equal(metric('dispatches').value, 2);
  assert.equal(metric('cost').value, 0.75);
  assert.equal(metric('turns, mean').value, 3);
});

test('a package reviewed in both runs given together is refused, not counted twice', () => {
  const a = runFiles([{ id: 'h1', findings: [] }], {});
  const b = runFiles([{ id: 'h1', findings: [] }], {});

  const out = run('--verdicts', join(a, 'verdicts.json'), '--verdicts', join(b, 'verdicts.json'));

  assert.equal(out.status, 1);
  assert.match(out.stderr, /holdout: package h1 is in two verdicts files/);
});

test('false positives on correct code are split into the L-code bait and everything else', () => {
  const result = scoreHoldout({
    defects: [defect('ll-1', 'h1', 'a.py', 3, 'behavioral', 'L1', 'logic-lens')],
    clean: [{ package: 'h1', file: 'c.py' }],
    packages: [{ id: 'h1', findings: [
      { sev: 'minor', file: 'c.py', line: 10, item: 'defaults #17', trigger: '—' },
      { sev: 'major', file: 'c.py', line: 5, item: 'L4 state mutation', trigger: 'x' },
    ] }],
  });

  const report = buildReport(result);
  assert.equal(report.metrics.find((m) => m.name === 'false positives on correct code, L-coded').value, 1);
  assert.equal(report.metrics.find((m) => m.name === 'false positives on correct code, other').value, 1);
});
