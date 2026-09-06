// The scorer makes no model call; these tests are the proof of that (decision 0019).

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkScenarios, evaluate, pluginFor, score, scoreScenario } from './run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'run.mjs');
const ROOT = join(HERE, '..', '..');

const made = [];
after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});
const temp = () => {
  const dir = mkdtempSync(join(tmpdir(), 'hodos-noop-'));
  made.push(dir);
  return dir;
};

const observation = (over = {}) => ({
  id: 's1',
  arm: 'with',
  text: '',
  files: {},
  paths: [],
  metrics: {},
  ...over,
});

describe('evaluate — one test per check kind', () => {
  it('transcript: the pattern is in what the session printed', () => {
    assert.equal(evaluate({ kind: 'transcript', pattern: '^Path: quick' }, observation({ text: 'Path: quick' })).value, true);
    assert.equal(evaluate({ kind: 'transcript', pattern: '^Path: quick' }, observation({ text: 'nothing' })).value, false);
  });

  it('transcript-absent: the pattern is not there', () => {
    assert.equal(evaluate({ kind: 'transcript-absent', pattern: 'TODO' }, observation({ text: 'clean' })).value, true);
    assert.equal(evaluate({ kind: 'transcript-absent', pattern: 'TODO' }, observation({ text: 'a TODO' })).value, false);
  });

  it('file: the pattern is in a file the arm collected; a file it never wrote is false', () => {
    const obs = observation({ files: { 'review.md': '# Review\nCoverage: none' } });
    assert.equal(evaluate({ kind: 'file', path: 'review.md', pattern: '^Coverage:' }, obs).value, true);
    assert.equal(evaluate({ kind: 'file', path: 'review.md', pattern: '^Verdict:' }, obs).value, false);
    assert.equal(evaluate({ kind: 'file', path: 'absent.md', pattern: '.' }, obs).value, false);
  });

  it('rows: every checklist value the session printed is legal, and no row at all is a fail', () => {
    const legal = observation({
      text: '| Row | Evidence | Value |\n|---|---|---|\n| files touched (estimate) | src/a.ts | 2 |\n| new module | none | no |',
    });
    const illegal = observation({
      text: '| Row | Evidence | Value |\n|---|---|---|\n| files touched (estimate) | src/a.ts | 1–2 |',
    });
    const check = { kind: 'rows', pattern: '^(yes|no|unknown|[0-9]+)$' };
    assert.equal(evaluate(check, legal).value, true);
    assert.equal(evaluate(check, illegal).value, false);
    assert.equal(evaluate(check, observation({ text: 'no table here' })).value, false);
  });

  it('metric: a number the arm measured stays under its ceiling', () => {
    const check = { kind: 'metric', metric: 'evidenceCalls', max: 5 };
    assert.equal(evaluate(check, observation({ metrics: { evidenceCalls: 4 } })).value, true);
    assert.equal(evaluate(check, observation({ metrics: { evidenceCalls: 9 } })).value, false);
    assert.equal(evaluate(check, observation({ metrics: {} })).value, false);
  });

  it('path-absent: the run left nothing at that path', () => {
    const check = { kind: 'path-absent', path: '.claude/hodos/tasks/ghost' };
    assert.equal(evaluate(check, observation({ paths: ['.claude/hodos/config.json'] })).value, true);
    assert.equal(evaluate(check, observation({ paths: ['.claude/hodos/tasks/ghost/plan.md'] })).value, false);
  });

  it('an unknown kind is an error, not a quiet false', () => {
    assert.throws(() => evaluate({ kind: 'vibes', pattern: '.' }, observation()), /vibes/);
  });
});

describe('a scenario passes only on the delta', () => {
  const scenario = { id: 's1', check: { kind: 'transcript', pattern: 'kept' } };
  const arm = (arm, text) => observation({ arm, text });

  it('with the line the check holds, without it the check fails — that is the whole signal', () => {
    const result = scoreScenario(scenario, arm('with', 'kept'), arm('without', 'gone'));
    assert.equal(result.passed, true);
  });

  it('a control that also passes is a failed scenario: the line changed nothing', () => {
    const result = scoreScenario(scenario, arm('with', 'kept'), arm('without', 'kept'));
    assert.equal(result.passed, false);
    assert.match(result.why, /control/);
  });

  it('the with-line arm failing its own check is a failed scenario', () => {
    assert.equal(scoreScenario(scenario, arm('with', 'gone'), arm('without', 'gone')).passed, false);
  });

  it('a missing arm is a failed scenario, never a skipped one', () => {
    const result = scoreScenario(scenario, arm('with', 'kept'), undefined);
    assert.equal(result.passed, false);
    assert.match(result.why, /without/);
  });
});

describe('score', () => {
  const scenarios = {
    threshold: 0.6,
    scenarios: [
      { id: 's1', check: { kind: 'transcript', pattern: 'a' } },
      { id: 's2', check: { kind: 'transcript', pattern: 'b' } },
    ],
  };
  const observations = [
    observation({ id: 's1', arm: 'with', text: 'a' }),
    observation({ id: 's1', arm: 'without', text: '' }),
    observation({ id: 's2', arm: 'with', text: 'b' }),
    observation({ id: 's2', arm: 'without', text: 'b' }),
  ];

  it('the rate is the scenarios that showed a delta', () => {
    const result = score(scenarios, observations);
    assert.equal(result.passedCount, 1);
    assert.equal(result.total, 2);
    assert.equal(result.rate, 0.5);
    assert.equal(result.passed, false);
  });

  it('with no threshold set there is no verdict, because nothing has decided one yet', () => {
    const result = score({ ...scenarios, threshold: null }, observations);
    assert.equal(result.threshold, null);
    assert.equal(result.passed, null);
  });
});

describe('checkScenarios — the set is self-consistent', () => {
  const write = (dir, body) => {
    const file = join(dir, 'scenarios.json');
    writeFileSync(file, JSON.stringify(body));
    return file;
  };

  it('a home whose replaceWith is the line itself is a problem: the control keeps the rule', () => {
    const dir = temp();
    writeFileSync(join(dir, 'one.md'), 'the rule line\n');
    const file = write(dir, {
      threshold: null,
      scenarios: [
        {
          id: 'x',
          lines: [{ file: 'one.md', line: 'the rule line', replaceWith: 'the rule line' }],
          check: { kind: 'transcript', pattern: '.' },
        },
      ],
    });
    const problems = checkScenarios(JSON.parse(execFileSync(process.execPath, [SCRIPT, '--print-set', '--scenarios', file], { encoding: 'utf8' })), { root: dir });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /keeps the rule/);
  });

  it('a rule the control copy still states is a problem, found without a model call', () => {
    const dir = temp();
    writeFileSync(join(dir, 'one.md'), 'the rule line\n');
    writeFileSync(join(dir, 'elsewhere.md'), 'the rule, said again\n');
    const file = write(dir, {
      threshold: null,
      scenarios: [
        {
          id: 'x',
          lines: [{ file: 'one.md', line: 'the rule line' }],
          probe: 'the rule',
          check: { kind: 'transcript', pattern: '.' },
        },
      ],
    });
    const problems = checkScenarios(JSON.parse(execFileSync(process.execPath, [SCRIPT, '--print-set', '--scenarios', file], { encoding: 'utf8' })), { root: dir });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /elsewhere\.md/);
  });

  it('a probe hit the scenario declares is not a problem', () => {
    const dir = temp();
    writeFileSync(join(dir, 'one.md'), 'the rule line\n');
    writeFileSync(join(dir, 'elsewhere.md'), 'the rule, said again\n');
    const file = write(dir, {
      threshold: null,
      scenarios: [
        {
          id: 'x',
          lines: [{ file: 'one.md', line: 'the rule line' }],
          probe: 'the rule',
          probeAllows: ['elsewhere.md'],
          check: { kind: 'transcript', pattern: '.' },
        },
      ],
    });
    const problems = checkScenarios(JSON.parse(execFileSync(process.execPath, [SCRIPT, '--print-set', '--scenarios', file], { encoding: 'utf8' })), { root: dir });
    assert.deepEqual(problems, []);
  });

  it('the shipped set names lines that are in the files it names, exactly once each', () => {
    const problems = checkScenarios(JSON.parse(execFileSync(process.execPath, [SCRIPT, '--print-set'], { encoding: 'utf8' })), { root: ROOT });
    assert.deepEqual(problems, []);
  });

  it('a line no file carries is a problem', () => {
    const dir = temp();
    const file = write(dir, {
      threshold: null,
      scenarios: [{ id: 'x', lines: [{ file: 'README.md', line: 'a line nothing carries' }], check: { kind: 'transcript', pattern: '.' } }],
    });
    const problems = checkScenarios(JSON.parse(execFileSync(process.execPath, [SCRIPT, '--print-set', '--scenarios', file], { encoding: 'utf8' })), { root: ROOT });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /not in/);
  });

  it('a pattern that does not compile is a problem, caught before a run is scored against it', () => {
    const dir = temp();
    const file = write(dir, {
      threshold: null,
      scenarios: [{ id: 'x', lines: [{ file: 'README.md', line: '# hodos' }], check: { kind: 'transcript', pattern: '(?m)^Path:' } }],
    });
    const problems = checkScenarios(JSON.parse(execFileSync(process.execPath, [SCRIPT, '--print-set', '--scenarios', file], { encoding: 'utf8' })), { root: ROOT });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /pattern/);
  });

  it('a line the file carries twice is a problem: removing it would remove two behaviors', () => {
    const dir = temp();
    writeFileSync(join(dir, 'twice.md'), 'the same line\nthe same line\n');
    const file = write(dir, {
      threshold: null,
      scenarios: [{ id: 'x', lines: [{ file: 'twice.md', line: 'the same line' }], check: { kind: 'transcript', pattern: '.' } }],
    });
    const problems = checkScenarios(JSON.parse(execFileSync(process.execPath, [SCRIPT, '--print-set', '--scenarios', file], { encoding: 'utf8' })), { root: dir });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /twice|2 times/);
  });
});

describe('the two arms differ', () => {
  const set = JSON.parse(execFileSync(process.execPath, [SCRIPT, '--print-set'], { encoding: 'utf8' }));
  const timesIn = (root, one) =>
    readFileSync(join(root, one.file), 'utf8')
      .split('\n')
      .filter((line) => line.trim() === one.line.trim()).length;

  it('the control loses every copy of the rule, not only the authored line', () => {
    const dir = temp();
    // Run 1 (2026-09-03) scored 0/6 because the plugin ships its own
    // specification: deleting one skill line left the rule in docs/. A scenario
    // now names every home of its rule and the control loses all of them.
    const scenario = set.scenarios.find((one) => one.lines.length > 1);
    assert.ok(scenario, 'the shipped set has a scenario whose rule has more than one home');
    const kept = pluginFor(scenario, 'with', dir);
    const cut = pluginFor(scenario, 'without', dir);
    for (const one of scenario.lines) {
      assert.equal(timesIn(kept, one), 1, `with: ${one.file}`);
      assert.equal(timesIn(cut, one), 0, `without: ${one.file}`);
    }
  });

  it('a home the rule shares with other rules is rewritten, not deleted', () => {
    const dir = temp();
    const scenario = set.scenarios.find((one) => one.lines.some((l) => l.replaceWith));
    assert.ok(scenario, 'the shipped set has a scenario with an embedded home');
    const cut = pluginFor(scenario, 'without', dir);
    for (const one of scenario.lines.filter((l) => l.replaceWith)) {
      const body = readFileSync(join(cut, one.file), 'utf8');
      assert.ok(body.includes(one.replaceWith), `${one.file}: the rewritten line is not there`);
      assert.equal(timesIn(cut, one), 0, `${one.file}: the original line survived`);
    }
  });

  it('the plugin copy excludes what decision 0064 does not publish', () => {
    const dir = temp();
    const kept = pluginFor(set.scenarios[0], 'with', dir);
    assert.equal(existsSync(join(kept, 'docs/stages')), false);
    assert.equal(existsSync(join(kept, 'research')), false);
    assert.equal(existsSync(join(kept, 'docs/COMPONENTS.md')), true);
  });
});

describe('the command line', () => {
  const run = (args, options = {}) => execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', ...options });

  it('--check-scenarios is the default and passes on the shipped set', () => {
    assert.match(run([]), /scenarios/);
  });

  it('--dry-run prints both arms of every scenario and calls nothing', () => {
    const printed = run(['--invoke', '--out', temp(), '--dry-run']);
    const set = JSON.parse(run(['--print-set']));
    for (const scenario of set.scenarios) {
      for (const arm of ['with', 'without']) {
        assert.match(printed, new RegExp(`^${scenario.id} ${arm}: claude -p `, 'm'));
      }
    }
  });

  it('--json before a threshold exists is refused, because a gate would be reported that nobody set', () => {
    const dir = temp();
    const observations = join(dir, 'observations.json');
    writeFileSync(observations, JSON.stringify([]));
    assert.throws(() => run(['--observations', observations, '--json']), (error) => {
      assert.match(String(error.stderr), /threshold/);
      return error.status === 2;
    });
  });
});
