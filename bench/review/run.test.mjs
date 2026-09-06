// The scorer makes no model call; these tests are the proof of that (decision 0019).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, writeFileSync, readFileSync, mkdirSync, cpSync, realpathSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { parseMeta, hunkRanges, kindOfItem, score } from './run.mjs';

const RUN = fileURLToPath(new URL('./run.mjs', import.meta.url));
const HERE = fileURLToPath(new URL('.', import.meta.url));

const PATCH = `# id: b-l4-mutating-sort
# fixture: webapp
# package: p1
# kind: behavioral
# item: L4
# line: src/features/orders/model.ts:21
# trigger: the caller's array is the query cache's
# what: sort() mutates the argument
diff --git a/src/features/orders/model.ts b/src/features/orders/model.ts
index 1111111..2222222 100644
--- a/src/features/orders/model.ts
+++ b/src/features/orders/model.ts
@@ -1,4 +1,6 @@
 import { create } from 'zustand';
+
+import type { Order } from './api';
 
 export type StatusFilter = 'all' | 'open' | 'paid' | 'cancelled';
 
@@ -15,3 +17,8 @@ export const useOrdersFilter = create<OrdersFilter>((set) => ({
   reset: () => set({ status: 'all' }),
 }));
+
+/** The count biggest orders. */
+export function topByTotal(orders: Order[], count: number): Order[] {
+  return orders.sort((a, b) => b.total - a.total).slice(0, count);
+}
`;

const defect = (over = {}) => ({
  id: 'd1',
  package: 'p1',
  fixture: 'webapp',
  kind: 'behavioral',
  item: 'L4',
  file: 'src/features/orders/model.ts',
  line: 21,
  ...over,
});

const finding = (over = {}) => ({
  sev: 'major',
  file: 'src/features/orders/model.ts',
  line: 21,
  item: 'L4 state mutation',
  trigger: 'the caller keeps the array',
  finding: 'sort() mutates the argument',
  fix: 'sort a copy',
  ...over,
});

const run = (...args) => spawnSync(process.execPath, [RUN, ...args], { encoding: 'utf8' });

test('--help prints the usage and exits 0', () => {
  const out = run('--help');

  assert.equal(out.status, 0);
  assert.match(out.stdout, /Usage: node bench\/review\/run\.mjs/);
});

test('parseMeta reads the header above the diff and stops at it', () => {
  const meta = parseMeta(PATCH);

  assert.equal(meta.id, 'b-l4-mutating-sort');
  assert.equal(meta.kind, 'behavioral');
  assert.equal(meta.item, 'L4');
  assert.equal(meta.line, 'src/features/orders/model.ts:21');
  assert.equal(meta.trigger, "the caller's array is the query cache's");
  assert.equal(meta.diff, undefined, 'the diff is not a metadata key');
});

test('hunkRanges gives the changed lines of the new file, per file', () => {
  const ranges = hunkRanges(PATCH);

  assert.deepEqual(Object.keys(ranges), ['src/features/orders/model.ts']);
  assert.deepEqual(ranges['src/features/orders/model.ts'], [
    [1, 6],
    [17, 24],
  ]);
});

test('kindOfItem reads the kind off the item, not off the prose', () => {
  assert.equal(kindOfItem('L4'), 'behavioral');
  assert.equal(kindOfItem('L4 state mutation'), 'behavioral');
  assert.equal(kindOfItem('L9'), 'behavioral');
  assert.equal(kindOfItem('rules/query-key-factory.md'), 'convention');
  assert.equal(kindOfItem('lint'), 'convention');
  assert.equal(kindOfItem('plan ### Refactor in scope'), 'convention');
  assert.equal(kindOfItem('plan `### Invariants` · L9 time/locale'), 'behavioral', 'a code named anywhere in the item is the axis');
  assert.equal(kindOfItem('defaults 7'), 'convention');
  assert.equal(kindOfItem('Legacy naming'), 'convention', 'a capital L with no digit is not a code');
});

test('a finding on the seeded line, of the seeded kind, finds the defect', () => {
  const result = score({ defects: [defect()], clean: [], packages: [{ id: 'p1', findings: [finding()] }] });

  assert.equal(result.recall.overall.found, 1);
  assert.deepEqual(result.missed, []);
  assert.equal(result.precision.falsePositives, 0);
});

test('a finding within five lines of the anchor counts; one further off does not', () => {
  const near = score({ defects: [defect()], clean: [], packages: [{ id: 'p1', findings: [finding({ line: 19 })] }] });
  const far = score({ defects: [defect()], clean: [], packages: [{ id: 'p1', findings: [finding({ line: 9 })] }] });

  assert.equal(near.recall.overall.found, 1);
  assert.equal(far.recall.overall.found, 0);
  assert.deepEqual(far.missed, ['d1']);
});

test('the package\'s own anchors move the defect to where the reviewer saw it', () => {
  // Two patches in one package shift each other's lines; invoke.mjs resolves
  // the anchor text in the copy it built and writes the line down.
  const result = score({
    defects: [defect()],
    clean: [],
    packages: [{ id: 'p1', anchors: { d1: 61 }, findings: [finding({ line: 61 })] }],
  });
  const stale = score({ defects: [defect()], clean: [], packages: [{ id: 'p1', findings: [finding({ line: 61 })] }] });

  assert.equal(result.recall.overall.found, 1);
  assert.equal(stale.recall.overall.found, 0);
});

test('one finding credits one defect, not every defect it happens to sit near', () => {
  const defects = [
    defect({ id: 'c1', kind: 'convention', item: 'rules/x.md', line: 18 }),
    defect({ id: 'c2', kind: 'convention', item: 'rules/y.md', line: 19 }),
  ];
  const result = score({
    defects,
    clean: [],
    packages: [{ id: 'p1', findings: [finding({ item: 'rules/x.md', trigger: '—', line: 18 })] }],
  });

  assert.equal(result.recall.overall.found, 1);
  assert.deepEqual(result.missed, ['c2'], 'the exact line wins the finding, the neighbour goes unfound');

  // and the same when the neighbour is the one the scorer reaches first
  const reversed = score({
    defects: [defects[1], defects[0]],
    clean: [],
    packages: [{ id: 'p1', findings: [finding({ item: 'rules/x.md', trigger: '—', line: 18 })] }],
  });
  assert.deepEqual(reversed.missed, ['c2'], 'the finding goes to the defect it names, not to the first in the list');
});

test('the right line under another axis is found, and the disagreement is recorded', () => {
  const result = score({
    defects: [defect()],
    clean: [],
    packages: [{ id: 'p1', findings: [finding({ item: 'rules/query-key-factory.md', trigger: '—' })] }],
  });

  assert.equal(result.recall.overall.found, 1, 'the defect was found; the axis it was filed under is a separate question');
  assert.deepEqual(result.miscategorised, [{ defect: 'd1', expected: 'behavioral', item: 'rules/query-key-factory.md' }]);
  assert.equal(result.precision.falsePositives, 0);
});

test('a finding in a file clean.json names is a false positive', () => {
  const result = score({
    defects: [defect()],
    clean: [{ package: 'p1', file: 'src/features/orders/api.ts' }],
    packages: [{ id: 'p1', findings: [finding(), finding({ file: 'src/features/orders/api.ts', line: 18 })] }],
  });

  assert.equal(result.precision.findings, 2);
  assert.equal(result.precision.falsePositives, 1);
  assert.equal(result.precision.value, 0.5);
});

test('a finding without a location or an item is invalid, and costs precision', () => {
  const result = score({
    defects: [defect()],
    clean: [],
    packages: [
      { id: 'p1', findings: [finding(), finding({ file: null, line: null }), finding({ item: '' })] },
    ],
  });

  assert.equal(result.precision.invalid, 2);
  assert.equal(result.precision.value, 1 / 3);
});

test('a behavioral finding at major with no trigger is invalid; a convention one is not', () => {
  const result = score({
    defects: [defect()],
    clean: [],
    packages: [
      {
        id: 'p1',
        findings: [
          finding({ trigger: '—' }),
          finding({ item: 'rules/x.md', trigger: '—', line: 18 }),
          finding({ item: 'L4', trigger: '—', sev: 'minor', line: 19 }),
        ],
      },
    ],
  });

  assert.equal(result.precision.invalid, 1, 'only the behavioral major without a trigger');
  assert.deepEqual(result.invalidFindings.map((f) => f.reason), ['no trigger']);
});

test('recall is reported per kind as well as overall', () => {
  const defects = [
    defect({ id: 'b1' }),
    defect({ id: 'c1', kind: 'convention', item: 'rules/x.md', line: 18 }),
    defect({ id: 'c2', kind: 'convention', item: 'rules/y.md', line: 19 }),
  ];
  const result = score({
    defects,
    clean: [],
    packages: [{ id: 'p1', findings: [finding(), finding({ item: 'rules/x.md', trigger: '—', line: 18 })] }],
  });

  assert.deepEqual(result.recall.overall, { total: 3, found: 2, rate: 2 / 3 });
  assert.deepEqual(result.recall.convention, { total: 2, found: 1, rate: 0.5 });
  assert.deepEqual(result.recall.behavioral, { total: 1, found: 1, rate: 1 });
  assert.deepEqual(result.missed, ['c2']);
});

test('a neighbour that names the defect\'s axis beats an exact line that does not', () => {
  const result = score({
    defects: [defect()],
    clean: [],
    packages: [
      {
        id: 'p1',
        findings: [
          finding({ line: 21, item: 'rules/api-error-propagation.md', trigger: '—' }),
          finding({ line: 20, item: 'L4 state mutation' }),
        ],
      },
    ],
  });

  assert.equal(result.recall.overall.found, 1);
  assert.deepEqual(result.miscategorised, [], 'the row that named L4 is the one credited');
});

test('only the packages the run covered are scored', () => {
  const defects = [defect(), defect({ id: 'd2', package: 'p2' })];
  const result = score({ defects, clean: [], packages: [{ id: 'p1', findings: [finding()] }] });

  assert.deepEqual(result.recall.overall, { total: 1, found: 1, rate: 1 }, 'p2 was not run, so it is not measured');
  assert.deepEqual(result.packages, ['p1']);
});

test('a finding in another package does not find this package\'s defect', () => {
  const result = score({
    defects: [defect()],
    clean: [],
    packages: [{ id: 'p2', findings: [finding()] }],
  });

  assert.equal(result.recall.overall.found, 0);
});

test('--check-key exits 0 on the shipped set and reports its shape', () => {
  const out = run('--check-key');

  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /19 seeded/);
  assert.match(out.stdout, /12 convention/);
  assert.match(out.stdout, /7 behavioral/);
  assert.match(out.stdout, /7 distinct/);
  assert.match(out.stdout, /6 clean files/);
});

/** A copy of the shipped set, so a doctored patch never touches the repository. */
function setCopy() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-reviewbench-')));
  for (const name of ['seeded', 'clean', 'packages']) cpSync(join(HERE, name), join(dir, name), { recursive: true });
  cpSync(join(HERE, 'clean.json'), join(dir, 'clean.json'));
  return dir;
}

test('--check-key fails a behavioral patch whose item is not one of the nine codes', () => {
  const dir = setCopy();
  const path = join(dir, 'seeded', 'b-l4-mutating-sort.patch');
  writeFileSync(path, readFileSync(path, 'utf8').replace('# item: L4', '# item: rules/query-key-factory.md'));
  const out = run('--check-key', '--set', dir);

  assert.equal(out.status, 1);
  assert.match(out.stdout + out.stderr, /b-l4-mutating-sort/);
});

test('--check-key fails a patch whose line sits outside its own diff', () => {
  const dir = setCopy();
  const path = join(dir, 'seeded', 'w-bare-fetch.patch');
  writeFileSync(path, readFileSync(path, 'utf8').replace('summary.ts:8', 'summary.ts:800'));
  const out = run('--check-key', '--set', dir);

  assert.equal(out.status, 1);
  assert.match(out.stdout + out.stderr, /w-bare-fetch/);
});

test('--check-key fails a behavioral patch with no trigger', () => {
  const dir = setCopy();
  const path = join(dir, 'seeded', 'b-l7-race.patch');
  const text = readFileSync(path, 'utf8').split('\n').filter((l) => !l.startsWith('# trigger:')).join('\n');
  writeFileSync(path, text);
  const out = run('--check-key', '--set', dir);

  assert.equal(out.status, 1);
  assert.match(out.stdout + out.stderr, /b-l7-race/);
});

test('--check-key fails a patch whose anchor is not the line it declares', () => {
  const dir = setCopy();
  const path = join(dir, 'seeded', 'b-l5-control-flow-escape.patch');
  writeFileSync(path, readFileSync(path, 'utf8').replace('useCancelOrder.ts:12', 'useCancelOrder.ts:11'));
  const out = run('--check-key', '--set', dir);

  assert.equal(out.status, 1);
  assert.match(out.stdout + out.stderr, /b-l5-control-flow-escape/);
});

test('--verdicts scores a run and exits 1 when a threshold is missed', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-verdicts-')));
  mkdirSync(dir, { recursive: true });
  const empty = join(dir, 'verdicts.json');
  writeFileSync(empty, JSON.stringify({ packages: [{ id: 'p1', findings: [] }] }));
  const out = run('--verdicts', empty);

  assert.equal(out.status, 1, 'a run that found nothing is under every threshold');
  assert.match(out.stdout, /recall/);
  assert.match(out.stdout, /0%|0\.0%/);
});

test('a bare path is a location only when that file is really absent', () => {
  // decision 0038 admits a bare path when the subject is a file that does not
  // exist, and the path is the one it should exist at. The scorer checks that
  // against the package's own file list — a path that exists is a row missing
  // its line, which is what the drop rule is for.
  const missing = finding({ file: 'src/features/orders/model.test.ts', line: null, item: 'plan Verify plan' });
  const files = ['src/features/orders/model.ts', 'src/features/orders/api.ts'];

  const absent = score({
    defects: [defect()],
    clean: [],
    packages: [{ id: 'p1', files, findings: [finding(), missing] }],
  });
  assert.deepEqual(absent.invalidFindings, [], 'the file is not in the package, so the path is the location');
  assert.equal(absent.precision.absences, 1, 'counted, so a drift to locationless findings is visible');
  assert.equal(absent.recall.overall.found, 1, 'the defect is still credited to the row at its line');

  const present = score({
    defects: [defect()],
    clean: [],
    packages: [{ id: 'p1', files: [...files, 'src/features/orders/model.test.ts'], findings: [finding(), missing] }],
  });
  assert.deepEqual(present.invalidFindings.map((f) => f.reason), ['no line'], 'the file exists: the row owes a line');
  assert.equal(present.precision.absences, 0);
});

test('a file with no extension is still a file, and a directory is still a directory', () => {
  // The first rule read "a last segment with a dot", which makes Dockerfile,
  // LICENSE and .eslintrc unreportable. The package's own file list settles it:
  // a path is a directory when something in the package lives under it.
  const files = ['src/features/orders/ui/OrderList.tsx', 'docs/guide.md'];
  const at = (file) =>
    score({ defects: [], clean: [], packages: [{ id: 'p1', files, findings: [finding({ file, line: null })] }] });

  assert.deepEqual(at('Dockerfile').invalidFindings, [], 'a missing extensionless file is a location');
  assert.equal(at('Dockerfile').precision.absences, 1);
  assert.deepEqual(
    at('src/features/orders/ui').invalidFindings.map((f) => f.reason),
    ['no line'],
    'a directory the package has files under is not a missing file',
  );
});

test('without a file list the scorer will not credit a bare path', () => {
  // A verdicts file from before the package listed its files cannot prove the
  // absence, and an unprovable location is not one.
  const result = score({
    defects: [defect()],
    clean: [],
    packages: [{ id: 'p1', findings: [finding({ file: 'src/nowhere.test.ts', line: null })] }],
  });

  assert.deepEqual(result.invalidFindings.map((f) => f.reason), ['no line']);
  assert.equal(result.precision.absences, 0);
});

test('a finding with no path at all is still invalid, and the exception did not widen', () => {
  const result = score({
    defects: [defect()],
    clean: [],
    packages: [{ id: 'p1', findings: [finding({ file: null, line: null })] }],
  });

  assert.deepEqual(result.invalidFindings.map((f) => f.reason), ['no location']);
  assert.equal(result.precision.absences, 0);
});

test('a run that covers part of the set does not pass the gate silently', () => {
  // The gate is over the whole set. A verdicts file holding one package scores
  // that package and used to exit 0, with nothing saying the other five were
  // never dispatched against — so a truncated run read as a passing one.
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-partial-')));
  try {
    const one = JSON.parse(readFileSync(join(HERE, 'runs/2026-09-01/verdicts.json'), 'utf8'));
    const p3 = one.packages.filter((p) => p.id === 'p3');

    const partial = join(dir, 'verdicts.json');
    writeFileSync(partial, JSON.stringify({ packages: p3 }));
    const gated = run('--verdicts', partial);
    assert.equal(gated.status, 1, 'part of the set is not the set');
    assert.match(gated.stdout, /packages scored: 1 of 6/);

    // …unless the run said so: --only records what it asked for.
    const declared = join(dir, 'only.json');
    writeFileSync(declared, JSON.stringify({ only: ['p3'], packages: p3 }));
    const asked = run('--verdicts', declared);
    assert.equal(asked.status, 0, 'a run that declares its scope is scored on it');
    assert.match(asked.stdout, /packages scored: 1 of 6 \(--only p3\)/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--json prints the labeled report: four gates, and measurements when the run wrote them', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hodos-review-report-'));
  const verdicts = join(dir, 'verdicts.json');
  const measurements = join(dir, 'measurements.json');
  cpSync(join(HERE, 'runs/2026-09-02/verdicts.json'), verdicts);
  writeFileSync(
    measurements,
    JSON.stringify({ dispatches: 6, cost: 4.33, turns: [{ id: 'p1', turns: 2 }, { id: 'p2', turns: 4 }] }),
  );
  const out = spawnSync(process.execPath, [RUN, '--verdicts', verdicts, '--measurements', measurements, '--json'], {
    encoding: 'utf8',
  });
  assert.equal(out.status, 0);
  const report = JSON.parse(out.stdout.slice(out.stdout.indexOf('{')));
  assert.equal(report.bench, 'review');
  assert.deepEqual(
    report.metrics.filter((m) => m.kind === 'gate').map((m) => m.name),
    ['recall, overall', 'recall, convention', 'recall, behavioral', 'precision'],
  );
  for (const metric of report.metrics) assert.match(metric.kind, /^(gate|measurement)$/);
  const cost = report.metrics.find((m) => m.name === 'cost');
  assert.equal(cost.kind, 'measurement');
  assert.equal('threshold' in cost, false);
  assert.equal(report.metrics.find((m) => m.name === 'turns, mean').value, 3);
  assert.equal(report.passed, true);
  assert.equal(report.details.recall.overall.found, 18);
  rmSync(dir, { recursive: true, force: true });
});
