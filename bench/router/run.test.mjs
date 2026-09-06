import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  buildReport,
  checkLabels,
  deriveVerdict,
  loadSet,
  normalizeRow,
  ROWS,
  score,
  scoreRows,
  THRESHOLDS,
} from './run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'run.mjs');
const SET = join(HERE, 'set.json');

const made = [];
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'hodos-router-'));
  made.push(dir);
  return dir;
};

const run = (args, options = {}) =>
  execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', ...options });

/** A checklist whose every row is the lightest legal answer. */
const light = () => ({
  files: 1,
  newModule: 'no',
  contract: 'no',
  dependency: 'no',
  migration: 'no',
  units: 'no',
  fog: 'no',
  developers: 'no',
  wait: 'no',
});

describe('deriveVerdict — one test per rule of FORMATS.md §3', () => {
  it('rule 1: a yes on rows 6–9 is a campaign, whatever rows 1–5 say', () => {
    assert.equal(deriveVerdict({ ...light(), units: 'yes' }), 'campaign');
    assert.equal(deriveVerdict({ ...light(), fog: 'yes' }), 'campaign');
    assert.equal(deriveVerdict({ ...light(), developers: 'yes' }), 'campaign');
    assert.equal(deriveVerdict({ ...light(), wait: 'yes' }), 'campaign');
  });

  it('rule 1: an unknown on rows 6–9 is a campaign too', () => {
    assert.equal(deriveVerdict({ ...light(), fog: 'unknown' }), 'campaign');
  });

  it('rule 1 wins over the deep rules below it', () => {
    const both = { ...light(), newModule: 'yes', contract: 'yes', units: 'yes' };
    assert.equal(deriveVerdict(both), 'campaign');
  });

  it('rule 2: an unknown on rows 3–5 is deep', () => {
    assert.equal(deriveVerdict({ ...light(), contract: 'unknown' }), 'deep');
    assert.equal(deriveVerdict({ ...light(), dependency: 'unknown' }), 'deep');
    assert.equal(deriveVerdict({ ...light(), migration: 'unknown' }), 'deep');
  });

  it('rule 3: a new module that also changes a contract is deep', () => {
    assert.equal(deriveVerdict({ ...light(), newModule: 'yes', contract: 'yes' }), 'deep');
    // A new module alone is row 2, which rule 5 also refuses: standard, not deep.
    assert.equal(deriveVerdict({ ...light(), newModule: 'yes' }), 'standard');
  });

  it('rule 3: a refactor above the quick limit is deep, whatever it carries', () => {
    // Decision 0072: the clause reads the type and row 1, and nothing else.
    // "A countable done-metric" was true of every refactor by DESIGN.md's own
    // definition of the type, so it selected nothing and the bench supplied the
    // missing judgement through a field the engine never asked for.
    const wide = { ...light(), files: 4 };
    assert.equal(deriveVerdict(wide, { type: 'refactor' }), 'deep');
    assert.equal(deriveVerdict(wide, { type: 'feature' }), 'standard');
    assert.equal(deriveVerdict({ ...light(), files: 3 }, { type: 'refactor' }), 'quick');
  });

  it('rule 3: an unknown row 1 does not reach the width clause', () => {
    // Rule 4 is what an unknown row 1 reaches, and it fires after rule 3.
    assert.equal(deriveVerdict({ ...light(), files: 'unknown' }, { type: 'refactor' }), 'standard');
  });

  it('rule 3: the clause takes no input beyond the type and row 1', () => {
    // A leftover wideCountableMetric must not resurrect the old branch.
    const narrow = { ...light(), files: 2 };
    assert.equal(deriveVerdict(narrow, { type: 'refactor', wideCountableMetric: true }), 'quick');
  });

  it('rule 4: an unknown on rows 1–2 is standard', () => {
    assert.equal(deriveVerdict({ ...light(), files: 'unknown' }), 'standard');
    assert.equal(deriveVerdict({ ...light(), newModule: 'unknown' }), 'standard');
  });

  it('rule 5: three files or fewer with rows 2–5 all no is quick', () => {
    assert.equal(deriveVerdict({ ...light(), files: 3 }), 'quick');
    assert.equal(deriveVerdict({ ...light(), files: 0 }), 'quick');
  });

  it('rule 6: anything else is standard', () => {
    assert.equal(deriveVerdict({ ...light(), files: 4 }), 'standard');
    assert.equal(deriveVerdict({ ...light(), dependency: 'yes' }), 'standard');
  });

  it('refuses a checklist that is not the nine rows', () => {
    const { files, ...missing } = light();
    void files;
    assert.throws(() => deriveVerdict(missing), /files/);
    assert.throws(() => deriveVerdict({ ...light(), fog: 'maybe' }), /fog/);
  });
});

describe('set.json', () => {
  const set = loadSet(SET);

  it('holds 41 cases with unique ids', () => {
    assert.equal(set.cases.length, 41);
    assert.equal(new Set(set.cases.map((c) => c.id)).size, 41);
  });

  it('is composed 10 quick / 14 standard / 12 deep / 5 campaign (decisions 0025, 0072, 0081)', () => {
    // 10/10/10/5 until Stage 11c, which added three `spike` and three
    // `upgrade` cases: the two new types fall where their rows put them, and
    // balancing the paths back by rewriting rows would be fitting the set to
    // the shape rather than to FORMATS.md §3.
    const count = (path) => set.cases.filter((c) => c.expect.path === path).length;
    assert.deepEqual(
      { quick: count('quick'), standard: count('standard'), deep: count('deep'), campaign: count('campaign') },
      { quick: 10, standard: 14, deep: 12, campaign: 5 },
    );
  });

  it('sizes a question by what its answer rests on, never by unknown (0070)', () => {
    // A question changes nothing, so row 1 counting the change is always 0 and
    // rule 5 makes every question quick. Row 1 counts the files the answer
    // rests on instead — a count the fixture can always produce, so `unknown`
    // on a question is the set declining to read rather than a row it could
    // not fill.
    for (const one of set.cases.filter((c) => c.expect.type === 'question')) {
      assert.equal(typeof one.checklist.files, 'number', one.id);
    }
  });

  it('carries all six types', () => {
    assert.deepEqual(
      [...new Set(set.cases.map((c) => c.expect.type))].sort(),
      ['bug', 'feature', 'question', 'refactor', 'spike', 'upgrade'],
    );
  });

  it('gives every case the nine rows and a description', () => {
    for (const one of set.cases) {
      assert.deepEqual(Object.keys(one.checklist).sort(), [...ROWS.map((r) => r.key)].sort(), one.id);
      assert.ok(one.description.length > 20, `${one.id}: the description is too short to route`);
      assert.ok(['webapp', 'api', 'mono', 'kit'].includes(one.fixture), `${one.id}: ${one.fixture}`);
    }
  });

  it('derives every label from its own rows, so no label is a matter of taste', () => {
    assert.deepEqual(checkLabels(set), []);
  });

  it('reports a case that still carries wideCountableMetric (decision 0072)', () => {
    // The field is gone from rule 3, so a case that keeps it is a case whose
    // author expects a branch that no longer exists — silent unless reported.
    const bent = structuredClone(set);
    const one = bent.cases.find((c) => c.expect.type === 'refactor');
    one.wideCountableMetric = true;
    const problems = checkLabels(bent);
    assert.ok(
      problems.some((p) => p.id === one.id && p.field === 'wideCountableMetric'),
      `expected ${one.id} to be reported, got ${JSON.stringify(problems)}`,
    );
  });

  it('states its thresholds as the ones run.mjs scores against', () => {
    assert.deepEqual(set.thresholds, THRESHOLDS);
    const bent = structuredClone(set);
    bent.thresholds.path = 0.5;
    const path = join(temp(), 'set.json');
    writeFileSync(path, JSON.stringify(bent));
    assert.throws(() => loadSet(path), /threshold/);
  });

  it('states the campaign flag as the path restated (decision 0025)', () => {
    for (const one of set.cases) {
      assert.equal(one.expect.campaign, one.expect.path === 'campaign', one.id);
    }
  });
});

describe('score', () => {
  const set = loadSet(SET);
  const perfect = set.cases.map((c) => ({ id: c.id, ...c.expect }));

  it('scores a perfect run at 100% on all three axes', () => {
    const result = score(set, perfect);
    assert.deepEqual(
      { path: result.path.accuracy, type: result.type.accuracy, campaign: result.campaign.accuracy },
      { path: 1, type: 1, campaign: 1 },
    );
    assert.ok(result.passed);
  });

  it('counts a wrong path against the path axis only', () => {
    const verdicts = perfect.map((v, i) => (i === 0 ? { ...v, path: 'deep' } : v));
    const result = score(set, verdicts);
    assert.equal(result.path.correct, 40);
    assert.equal(result.type.correct, 41);
  });

  it('counts a verdict the run never produced as wrong on every axis', () => {
    const result = score(set, perfect.slice(0, 36));
    assert.equal(result.path.correct, 36);
    assert.equal(result.type.correct, 36);
    assert.equal(result.missing.length, 5);
  });

  it('fails the gate when an axis is under its threshold', () => {
    const verdicts = perfect.map((v, i) => (i < 7 ? { ...v, path: 'deep', campaign: true } : v));
    const result = score(set, verdicts);
    assert.ok(result.path.accuracy < THRESHOLDS.path);
    assert.equal(result.passed, false);
  });
});

describe('the command line', () => {
  it('checks every label and exits 0', () => {
    const out = run(['--check-labels']);
    assert.match(out, /41 cases/);
    assert.match(out, /every label follows the FORMATS\.md §3 rules/);
  });

  it('exits 1 when a label does not follow from its rows', () => {
    const dir = temp();
    const set = JSON.parse(readFileSync(SET, 'utf8'));
    set.cases[0].expect.path = set.cases[0].expect.path === 'deep' ? 'quick' : 'deep';
    const path = join(dir, 'set.json');
    writeFileSync(path, JSON.stringify(set));

    assert.throws(
      () => run(['--check-labels', '--set', path], { stdio: 'pipe' }),
      (error) => {
        assert.equal(error.status, 1);
        assert.match(String(error.stdout) + String(error.stderr), /expected/);
        return true;
      },
    );
  });

  it('scores a verdicts file against the thresholds', () => {
    const dir = temp();
    const set = loadSet(SET);
    const path = join(dir, 'verdicts.json');
    writeFileSync(path, JSON.stringify(set.cases.map((c) => ({ id: c.id, ...c.expect }))));

    const out = run(['--verdicts', path]);
    assert.match(out, /path\s+41\/41\s+100\.0%/);
    assert.match(out, /gates: PASS/);
  });

  it('prints usage on --help and exits 0', () => {
    assert.match(run(['--help']), /Usage: node bench\/router\/run\.mjs/);
  });

  it('does not run itself when another script of the same name imports it', () => {
    // COMPONENTS.md §7 names two future siblings called run.mjs:
    // bench/review/run.mjs (Stage 6) and bench/noop/run.mjs (Stage 11).
    const dir = temp();
    const sibling = join(dir, 'run.mjs');
    writeFileSync(
      sibling,
      // An absolute path is not an ESM specifier on Windows: `D:\\…` reads as a
      // URL scheme. `pathToFileURL` is the portable form of "this file".
      `import { deriveVerdict } from ${JSON.stringify(pathToFileURL(SCRIPT).href)};\n` +
        "process.stdout.write(`sibling ran: ${typeof deriveVerdict}\\n`);\n",
    );
    const out = execFileSync(process.execPath, [sibling], { encoding: 'utf8' });
    assert.equal(out, 'sibling ran: function\n');
  });
});

describe('--json', () => {
  const verdictsFor = (paths) =>
    loadSet(SET).cases.map((one, i) => ({
      id: one.id,
      path: i < paths ? one.expect.path : 'quick',
      type: one.expect.type,
      campaign: one.expect.campaign,
    }));

  it('every metric carries its kind, and the three axes are gates', () => {
    const dir = temp();
    const file = join(dir, 'verdicts.json');
    writeFileSync(file, JSON.stringify(verdictsFor(41)));
    const printed = run(['--verdicts', file, '--json']);
    const report = JSON.parse(printed.slice(printed.indexOf('{')));
    assert.equal(report.bench, 'router');
    assert.deepEqual(
      report.metrics.filter((m) => m.kind === 'gate').map((m) => m.name),
      ['path', 'type', 'campaign'],
    );
    for (const metric of report.metrics) assert.match(metric.kind, /^(gate|measurement)$/);
    assert.equal(report.passed, true);
  });

  it('the measurements file is folded in, labeled measurement and never thresholded', () => {
    const dir = temp();
    const verdicts = join(dir, 'verdicts.json');
    const measurements = join(dir, 'measurements.json');
    writeFileSync(verdicts, JSON.stringify(verdictsFor(41)));
    writeFileSync(
      measurements,
      JSON.stringify([
        { id: 'q01', cost: 0.5, toolCalls: 6, evidenceCalls: 3, turns: 7 },
        { id: 'q02', cost: 1.5, toolCalls: 10, evidenceCalls: 5, turns: 9 },
      ]),
    );
    const printed = run(['--verdicts', verdicts, '--measurements', measurements, '--json']);
    const report = JSON.parse(printed.slice(printed.indexOf('{')));
    const cost = report.metrics.find((m) => m.name === 'cost');
    assert.equal(cost.kind, 'measurement');
    assert.equal(cost.value, 2);
    assert.equal('threshold' in cost, false);
    assert.equal(report.metrics.find((m) => m.name === 'evidence calls, mean').value, 4);
  });

  it('--verdicts twice is a mixed score, and the report says which came from where', () => {
    const dir = temp();
    const carried = join(dir, 'carried.json');
    const fresh = join(dir, 'fresh.json');
    const set = loadSet(SET);
    // The carried file answers every case wrongly; the fresh one corrects two.
    writeFileSync(carried, JSON.stringify(verdictsFor(0)));
    writeFileSync(
      fresh,
      JSON.stringify(set.cases.slice(0, 2).map((one) => ({ id: one.id, ...one.expect }))),
    );
    let printed = '';
    try {
      printed = run(['--verdicts', carried, '--verdicts', fresh, '--json']);
    } catch (error) {
      printed = String(error.stdout);
    }
    assert.match(printed, /mixed: 2 of 41 verdicts from/);
    const report = JSON.parse(printed.slice(printed.indexOf('{')));
    assert.deepEqual(report.details.sources.map((one) => one.count), [39, 2]);
  });

  it('a failing gate is in the report and in the exit code', () => {
    const dir = temp();
    const file = join(dir, 'verdicts.json');
    writeFileSync(file, JSON.stringify(verdictsFor(0)));
    assert.throws(() => run(['--verdicts', file, '--json']), (error) => {
      const report = JSON.parse(String(error.stdout).slice(String(error.stdout).indexOf('{')));
      assert.equal(report.passed, false);
      assert.equal(report.metrics.find((m) => m.name === 'path').passed, false);
      return error.status === 1;
    });
  });
});

describe('row agreement (a measurement, decision 0019)', () => {
  const row = (key, value) => ({ key, row: key, evidence: 'e', value, hasEvidence: true });

  it('reads the value cell the run printed, in the shapes a run prints it', () => {
    assert.equal(normalizeRow('files', ' 5 '), 5);
    assert.equal(normalizeRow('files', '`4`'), 4);
    assert.equal(normalizeRow('files', '**unknown**'), 'unknown');
    assert.equal(normalizeRow('files', 'a handful'), null);
    // A cell the bench half-reads is worse than one it refuses: "3 or 4" is
    // not the number 3, and counting it as one hides a run that never gave one.
    assert.equal(normalizeRow('files', '3 or 4'), null);
    assert.equal(normalizeRow('files', '5 files'), null);
    assert.equal(normalizeRow('newModule', '`no`'), 'no');
    assert.equal(normalizeRow('contract', 'Yes'), 'yes');
    assert.equal(normalizeRow('fog', 'unknown'), 'unknown');
    assert.equal(normalizeRow('fog', 'maybe'), null);
  });

  it('scores each row on its own, against the set that produced the labels', () => {
    const set = { cases: [{ id: 'a', checklist: { files: 2, newModule: 'no' } }] };
    const scored = scoreRows(set, [{ id: 'a', rows: [row('files', '2'), row('newModule', 'yes')] }]);
    assert.equal(scored.perRow.files.agree, 1);
    assert.equal(scored.perRow.files.rate, 1);
    assert.equal(scored.perRow.newModule.agree, 0);
    assert.deepEqual(scored.disagreements[0], {
      id: 'a',
      key: 'newModule',
      expected: 'no',
      given: 'yes',
      evidence: 'e',
    });
  });

  it('a row the run never printed is a disagreement, not an absence', () => {
    const set = { cases: [{ id: 'a', checklist: { files: 2 } }] };
    const scored = scoreRows(set, [{ id: 'a', rows: [] }]);
    assert.equal(scored.perRow.files.agree, 0);
    assert.equal(scored.perRow.files.total, 1);
    assert.equal(scored.disagreements[0].given, null);
  });

  it('a case the run never reached is not counted against any row', () => {
    const set = { cases: [{ id: 'a', checklist: { files: 2 } }, { id: 'b', checklist: { files: 9 } }] };
    const scored = scoreRows(set, [{ id: 'a', rows: [row('files', '2')] }]);
    assert.equal(scored.perRow.files.total, 1);
    assert.deepEqual(scored.missing, ['b']);
  });

  it('every row lands in the report as a measurement, never as a gate', () => {
    const set = loadSet(SET);
    const scored = scoreRows(set, [{ id: set.cases[0].id, rows: [row('files', '2')] }]);
    const perfect = set.cases.map((one) => ({ id: one.id, ...one.expect }));
    const built = buildReport(score(set, perfect), undefined, scored);
    for (const { key } of ROWS) {
      const metric = built.metrics.find((m) => m.name === `row agreement: ${key}`);
      assert.ok(metric, key);
      assert.equal(metric.kind, 'measurement');
      assert.equal('threshold' in metric, false);
    }
  });

  it('scores the 2026-09-03 run through the set as it stands', () => {
    const set = loadSet(SET);
    const rows = JSON.parse(readFileSync(join(HERE, 'runs/2026-09-03/rows.json'), 'utf8'));
    const scored = scoreRows(set, rows);
    // A pin on a recorded run, not a prediction: the run's rows are fixed and
    // committed, so every move in these numbers is a move in the set. Row 1
    // read 15/35 when the run was diagnosed, 19 after T8's five corrections,
    // and 17 once decision 0070 re-sized the three questions the run had
    // answered `0` under the old reading. The eight judgement rows have not
    // moved through any of it — which is the reading, not the number.
    assert.deepEqual(
      Object.fromEntries(ROWS.map(({ key }) => [key, scored.perRow[key].agree])),
      {
        files: 17,
        newModule: 29,
        contract: 31,
        dependency: 31,
        migration: 34,
        units: 32,
        fog: 35,
        developers: 34,
        wait: 33,
      },
    );
  });
});

describe('the width clause takes no side input (decision 0072)', () => {
  it('no case carries wideCountableMetric any more', () => {
    for (const one of loadSet(SET).cases) {
      assert.equal('wideCountableMetric' in one, false, one.id);
    }
  });
});
