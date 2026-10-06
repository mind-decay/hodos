// The checker reads engine text and calls nothing; these tests run it over
// small synthetic roots, so no test depends on the shipped inventory or on the
// engine files later nodes edit.

import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { checkSet, countBroken, evaluate, loadSet } from './run.mjs';
import { tempDir } from '../../scripts/temp-dir.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'run.mjs');

const skillWith = (...exit) => ['# a', '', '## 1. Start', '', 'Say what you found.', '', '## 2. Exit', '', 'Stop and say so.', ...exit, ''].join('\n');
const SKILL = skillWith();

/** One scenario over `skills/a/SKILL.md`, with one open finding: the exit names no command. */
const baseSet = () => ({
  version: 1,
  note: 'fixture',
  rubric: [
    { id: 'R2', name: 'next step named', sources: ['Nielsen 6'] },
    { id: 'R3', name: 'plain words', sources: ['Nielsen 2'] },
  ],
  journeys: ['start', 'continue'],
  owners: ['next-line', 'plain-words', 'unowned'],
  exempt: [],
  scenarios: [
    {
      id: 'a-exit',
      journey: 'continue',
      touchpoint: 'the exit',
      trigger: 'a session ends',
      channel: 'screen',
      where: { file: 'skills/a/SKILL.md', section: '## 2. Exit' },
      findings: [
        {
          id: 'a-no-next',
          rubric: 'R2',
          severity: 'blocker',
          owner: 'next-line',
          says: 'the exit names no command',
          evidence: { file: 'skills/a/SKILL.md', line: 'Stop and say so.' },
          fixedWhen: { file: 'skills/a/SKILL.md', section: '## 2. Exit', present: '^Next: ' },
        },
      ],
    },
  ],
});

/**
 * A root holding `skills/a/SKILL.md` and `files` (a null body deletes a file),
 * with the set `bend` returns written beside it as `scenarios.json`.
 */
function fixture({ files = {}, bend = () => {} } = {}) {
  const root = tempDir('hodos-ux-');
  for (const [rel, body] of Object.entries({ 'skills/a/SKILL.md': SKILL, ...files })) {
    const path = join(root, rel);
    if (body === null) {
      rmSync(path, { force: true });
      continue;
    }
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, body);
  }
  const set = baseSet();
  bend(set);
  const path = join(root, 'scenarios.json');
  writeFileSync(path, JSON.stringify(set));
  return { root, set, path };
}

const finding = (set) => set.scenarios[0].findings[0];
const stateOf = ({ root, set }) => evaluate(set, { root }).scenarios[0].findings[0].state;
const problemsOf = ({ root, set }) => checkSet(set, { root });

const cli = (args, cwd) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd, encoding: 'utf8' });

describe('the summary — P1, P2', () => {
  it('P1: no problems prints the summary and the success sentence, and exits 0', () => {
    const made = fixture();
    const run = cli(['--set', made.path], made.root);
    assert.equal(run.stdout, '1 scenarios · 1 findings (0 judged) · 1 broken\nevery scenario resolves\n');
    assert.equal(run.status, 0);
  });

  it('P2: problems print the summary, then one problem per line, and exit 1', () => {
    const made = fixture({
      files: { 'agents/hodos-x.md': '# x\n' },
      bend: (set) => {
        finding(set).evidence.line = 'A line no file carries.';
      },
    });
    const run = cli(['--set', made.path], made.root);
    assert.deepEqual(run.stdout.split('\n'), [
      '1 scenarios · 1 findings (0 judged) · 1 broken',
      'a-exit/a-no-next: the evidence line is not in skills/a/SKILL.md',
      "agents/hodos-x.md: no scenario's where.file, and not in exempt[]",
      '',
    ]);
    assert.equal(run.status, 1);
  });
});

describe('the state of a finding — I1', () => {
  it('open: its fixedWhen does not hold, and the scenario is broken', () => {
    const made = fixture();
    const scenario = evaluate(made.set, { root: made.root }).scenarios[0];
    assert.deepEqual(scenario, {
      id: 'a-exit',
      journey: 'continue',
      broken: true,
      findings: [{ id: 'a-no-next', owner: 'next-line', severity: 'blocker', state: 'open' }],
    });
  });

  it('fixed: its fixedWhen holds — a present that matches, an absent that does not — and nothing is broken', () => {
    const present = fixture({ files: { 'skills/a/SKILL.md': skillWith('Next: /hodos:run a') } });
    assert.equal(stateOf(present), 'fixed');
    assert.equal(evaluate(present.set, { root: present.root }).scenarios[0].broken, false);

    const absent = fixture({
      bend: (set) => {
        finding(set).fixedWhen = { file: 'skills/a/SKILL.md', section: '## 2. Exit', absent: 'breaker' };
      },
    });
    assert.equal(stateOf(absent), 'fixed');
  });

  it('judged: a null fixedWhen is never open, so it never breaks its scenario', () => {
    const made = fixture({
      bend: (set) => {
        finding(set).fixedWhen = null;
      },
    });
    assert.equal(stateOf(made), 'judged');
    assert.equal(evaluate(made.set, { root: made.root }).scenarios[0].broken, false);
  });
});

describe('evidence — I3', () => {
  const lineless = (bend) => (set) => {
    finding(set).evidence.line = 'A line no file carries.';
    bend(set);
  };

  it('an open finding whose evidence line is absent is a problem', () => {
    const made = fixture({ bend: lineless(() => {}) });
    assert.deepEqual(problemsOf(made), ['a-exit/a-no-next: the evidence line is not in skills/a/SKILL.md']);
  });

  it('an open finding whose evidence line is present twice is a problem', () => {
    const made = fixture({ files: { 'skills/a/SKILL.md': skillWith('Stop and say so.') } });
    assert.deepEqual(problemsOf(made), ['a-exit/a-no-next: skills/a/SKILL.md carries the evidence line 2 times']);
  });

  it('a judged finding whose evidence line is absent is a problem', () => {
    const made = fixture({
      bend: lineless((set) => {
        finding(set).fixedWhen = null;
      }),
    });
    assert.deepEqual(problemsOf(made), ['a-exit/a-no-next: the evidence line is not in skills/a/SKILL.md']);
  });

  it('a fixed finding whose evidence line is absent is not — the fix may have removed it', () => {
    const made = fixture({
      files: { 'skills/a/SKILL.md': skillWith('Next: /hodos:run a') },
      bend: lineless(() => {}),
    });
    assert.deepEqual(problemsOf(made), []);
  });
});

describe('the scope of a section — I4', () => {
  it('a match outside the section leaves the finding open', () => {
    const made = fixture({
      files: { 'skills/a/SKILL.md': SKILL.replace('Say what you found.', 'Next: /hodos:run a') },
    });
    assert.equal(stateOf(made), 'open');
  });

  it('a deeper heading inside the section keeps the section open', () => {
    const made = fixture({ files: { 'skills/a/SKILL.md': skillWith('', '### The detail', '', 'Next: /hodos:run a') } });
    assert.equal(stateOf(made), 'fixed');
  });

  it('a heading of the same level ends the section', () => {
    const made = fixture({ files: { 'skills/a/SKILL.md': skillWith('', '## 3. After', '', 'Next: /hodos:run a') } });
    assert.equal(stateOf(made), 'open');
  });

  it('an indented heading-shaped line inside an indented fence neither opens nor ends a section', () => {
    // The shape of skills/task/references/route.md:116, rebuilt here.
    const made = fixture({
      files: { 'skills/a/SKILL.md': skillWith('', '   ```', '   ## Prompt', '   ```', '', 'Next: /hodos:run a') },
    });
    assert.equal(stateOf(made), 'fixed');
    finding(made.set).fixedWhen.section = '## Prompt';
    assert.deepEqual(problemsOf(made), ['a-exit/a-no-next: fixedWhen section "## Prompt" is not a heading in skills/a/SKILL.md']);
  });

  it('an indented heading-shaped line outside any fence is not a heading either', () => {
    const made = fixture({ files: { 'skills/a/SKILL.md': skillWith('', '   ## Loose', '', 'Next: /hodos:run a') } });
    assert.equal(stateOf(made), 'fixed');
  });

  it('an indented fence is a fence: a column-0 heading-shaped line inside it ends nothing', () => {
    const made = fixture({
      files: { 'skills/a/SKILL.md': skillWith('', '   ```', '## Inside', '   ```', '', 'Next: /hodos:run a') },
    });
    assert.equal(stateOf(made), 'fixed');
  });

  it('a column-0 heading-shaped line inside a fence neither opens nor ends a section', () => {
    // The shape of skills/run/references/finish.md:36, rebuilt here.
    const made = fixture({
      files: { 'skills/a/SKILL.md': skillWith('', '```markdown', '## Outcome', '```', '', 'Next: /hodos:run a') },
    });
    assert.equal(stateOf(made), 'fixed');
    finding(made.set).fixedWhen.section = '## Outcome';
    assert.deepEqual(problemsOf(made), ['a-exit/a-no-next: fixedWhen section "## Outcome" is not a heading in skills/a/SKILL.md']);
  });
});

describe('every file a developer meets hodos through — I5', () => {
  it('an uncovered candidate file is a problem, wherever the candidate set reaches', () => {
    const made = fixture({
      files: {
        'skills/a/references/deep.md': '# deep\n',
        'agents/hodos-x.md': '# x\n',
        'hooks/hooks.json': '{}\n',
        'scripts/loud.mjs': '// loud\n',
      },
    });
    assert.deepEqual(problemsOf(made), [
      "agents/hodos-x.md: no scenario's where.file, and not in exempt[]",
      "hooks/hooks.json: no scenario's where.file, and not in exempt[]",
      "scripts/loud.mjs: no scenario's where.file, and not in exempt[]",
      "skills/a/references/deep.md: no scenario's where.file, and not in exempt[]",
    ]);
  });

  it('a covered file, an exempt file and a file outside the candidate set are not', () => {
    const made = fixture({
      files: {
        'scripts/quiet.mjs': '// quiet\n',
        'scripts/quiet.test.mjs': '// a test\n',
        'skills/a/notes.txt': 'not markdown\n',
        'docs/x.md': '# not a candidate\n',
      },
      bend: (set) => {
        set.exempt.push({ file: 'scripts/quiet.mjs', why: 'prints nothing a developer reads' });
      },
    });
    assert.deepEqual(problemsOf(made), []);
  });
});

describe('the command line — N2, N3', () => {
  it('N2: an unknown flag exits 2 with the usage', () => {
    const made = fixture();
    const run = cli(['--set', made.path, '--loud'], made.root);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /--loud/);
    assert.match(run.stderr, /^Usage: node bench\/ux\/run\.mjs/m);
    assert.equal(run.stdout, '');
  });

  it('N2: --node without --count exits 2 with the usage', () => {
    const made = fixture();
    const run = cli(['--set', made.path, '--node', 'next-line'], made.root);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /^Usage: node bench\/ux\/run\.mjs/m);
    assert.equal(run.stdout, '');
  });

  it('N3: a --set that is not there exits 1 and says it cannot be read', () => {
    const made = fixture();
    const missing = join(made.root, 'absent.json');
    const run = cli(['--set', missing], made.root);
    assert.equal(run.status, 1);
    assert.equal(run.stderr, `ux: cannot read ${missing} (ENOENT)\n`);
    assert.equal(run.stdout, '');
  });

  it('N3: a --set that is not JSON, or JSON that is not a set, cannot be read either', () => {
    const made = fixture({ files: { 'broken.json': 'not json', 'bare.json': '{"version":1}' } });
    const broken = cli(['--set', join(made.root, 'broken.json')], made.root);
    assert.equal(broken.status, 1);
    assert.match(broken.stderr, /^ux: cannot read .*broken\.json \(.*JSON.*\)\n$/);
    assert.throws(() => loadSet(join(made.root, 'bare.json')), /^Error: ux: cannot read .*bare\.json \(no scenarios array\)$/);
  });
});

describe('failure modes are problems, never throws — F1–F4', () => {
  const problemsAfter = (bend, files) => problemsOf(fixture({ bend, files }));

  it('F1: a regex that does not compile', () => {
    const problems = problemsAfter((set) => {
      finding(set).fixedWhen.present = '(';
    });
    assert.equal(problems.length, 1);
    assert.match(problems[0], /^a-exit\/a-no-next: the present regex does not compile — /);
  });

  it('F2: a where file that does not exist', () => {
    const problems = problemsAfter((set) => {
      set.scenarios[0].where.file = 'skills/gone/SKILL.md';
    });
    assert.deepEqual(problems, [
      'a-exit: where file skills/gone/SKILL.md is not there',
      "skills/a/SKILL.md: no scenario's where.file, and not in exempt[]",
    ]);
  });

  it('F2: an evidence file that does not exist', () => {
    const problems = problemsAfter((set) => {
      finding(set).evidence.file = 'skills/gone/SKILL.md';
    });
    assert.deepEqual(problems, ['a-exit/a-no-next: evidence file skills/gone/SKILL.md is not there']);
  });

  it('F2: a fixedWhen file that does not exist', () => {
    const problems = problemsAfter((set) => {
      finding(set).fixedWhen.file = 'skills/gone/SKILL.md';
    });
    assert.deepEqual(problems, ['a-exit/a-no-next: fixedWhen file skills/gone/SKILL.md is not there']);
  });

  it('F3: a section heading that is absent', () => {
    assert.deepEqual(
      problemsAfter((set) => {
        finding(set).fixedWhen.section = '## 9. Nowhere';
      }),
      ['a-exit/a-no-next: fixedWhen section "## 9. Nowhere" is not a heading in skills/a/SKILL.md'],
    );
    assert.deepEqual(
      problemsAfter((set) => {
        set.scenarios[0].where.section = '## 9. Nowhere';
      }),
      ['a-exit: where section "## 9. Nowhere" is not a heading in skills/a/SKILL.md'],
    );
  });

  it('F3: a section heading that is present twice', () => {
    const problems = problemsAfter(() => {}, { 'skills/a/SKILL.md': skillWith('', '## 2. Exit', '') });
    assert.deepEqual(problems, [
      'a-exit: where section "## 2. Exit" is a heading 2 times in skills/a/SKILL.md',
      'a-exit/a-no-next: fixedWhen section "## 2. Exit" is a heading 2 times in skills/a/SKILL.md',
    ]);
  });

  it('F4: a duplicate scenario id', () => {
    const problems = problemsAfter((set) => {
      const twin = structuredClone(set.scenarios[0]);
      twin.findings = [];
      set.scenarios.push(twin);
    });
    assert.deepEqual(problems, ['a-exit: the id is used twice']);
  });

  it('F4: a duplicate finding id', () => {
    const problems = problemsAfter((set) => {
      set.scenarios[0].findings.push(structuredClone(finding(set)));
    });
    assert.deepEqual(problems, ['a-exit/a-no-next: the finding id is used twice']);
  });

  it('F4: a journey, channel, rubric, severity or owner outside its list', () => {
    const problems = problemsAfter((set) => {
      Object.assign(set.scenarios[0], { journey: 'wander', channel: 'telepathy' });
      Object.assign(finding(set), { rubric: 'R99', severity: 'fatal', owner: 'nobody' });
    });
    assert.deepEqual(problems, [
      'a-exit: journey "wander" is not one of start, continue',
      'a-exit: channel "telepathy" is not one of screen, context, both, unverified',
      'a-exit/a-no-next: rubric "R99" is not one of R2, R3',
      'a-exit/a-no-next: severity "fatal" is not one of blocker, major, minor',
      'a-exit/a-no-next: owner "nobody" is not one of next-line, plain-words, unowned',
    ]);
  });

  it('F4: a fixedWhen with both present and absent', () => {
    const problems = problemsAfter((set) => {
      finding(set).fixedWhen.absent = 'breaker';
    });
    assert.deepEqual(problems, ['a-exit/a-no-next: fixedWhen carries both present and absent']);
  });

  it('F4: a fixedWhen with neither present nor absent', () => {
    const problems = problemsAfter((set) => {
      delete finding(set).fixedWhen.present;
    });
    assert.deepEqual(problems, ['a-exit/a-no-next: fixedWhen carries neither present nor absent']);
  });

  it('F4: an exempt entry with an empty why', () => {
    const problems = problemsAfter(
      (set) => {
        set.exempt.push({ file: 'scripts/quiet.mjs', why: ' ' });
      },
      { 'scripts/quiet.mjs': '// quiet\n' },
    );
    assert.deepEqual(problems, ['exempt scripts/quiet.mjs: the why is empty']);
  });
});

/**
 * Two scenarios: a-exit is broken by an open finding of next-line and one of
 * plain-words, b-exit by one of plain-words alone.
 */
const twoOwners = () =>
  fixture({
    files: { 'skills/b/SKILL.md': SKILL },
    bend: (set) => {
      set.scenarios[0].findings.push({
        id: 'a-jargon',
        rubric: 'R3',
        severity: 'major',
        owner: 'plain-words',
        says: 'the exit says stop, an engine word',
        evidence: { file: 'skills/a/SKILL.md', line: 'Stop and say so.' },
        fixedWhen: { file: 'skills/a/SKILL.md', section: '## 2. Exit', absent: '^Stop' },
      });
      const b = structuredClone(set.scenarios[0]);
      b.id = 'b-exit';
      b.where.file = 'skills/b/SKILL.md';
      b.findings = [{ ...structuredClone(set.scenarios[0].findings[1]), id: 'b-jargon' }];
      b.findings[0].evidence.file = 'skills/b/SKILL.md';
      b.findings[0].fixedWhen.file = 'skills/b/SKILL.md';
      set.scenarios.push(b);
    },
  });

describe('one number — P3, P4, I2, N1, N4', () => {
  it('P3: --count prints exactly one integer and a newline, and exits 0', () => {
    const made = fixture();
    const run = cli(['--set', made.path, '--count'], made.root);
    assert.match(run.stdout, /^\d+\n$/);
    assert.equal(run.stdout, '1\n');
    assert.equal(run.status, 0);
  });

  it('P4: --node counts the scenarios broken by that owner, and a scenario two owners break counts once for each', () => {
    const made = twoOwners();
    const count = (...args) => cli(['--set', made.path, '--count', ...args], made.root).stdout;
    assert.equal(count(), '2\n');
    assert.equal(count('--node', 'next-line'), '1\n');
    assert.equal(count('--node', 'plain-words'), '2\n');
    assert.equal(count('--node', 'unowned'), '0\n');
  });

  it('I2: a judged or a fixed finding never counts, overall or for its owner', () => {
    const made = fixture({
      files: { 'skills/a/SKILL.md': skillWith('Next: /hodos:run a') },
      bend: (set) => {
        set.scenarios[0].findings.push({ ...structuredClone(finding(set)), id: 'a-judged', fixedWhen: null });
      },
    });
    const evaluation = evaluate(made.set, { root: made.root });
    assert.deepEqual(
      evaluation.scenarios[0].findings.map((one) => one.state),
      ['fixed', 'judged'],
    );
    assert.equal(countBroken(evaluation, {}), 0);
    assert.equal(countBroken(evaluation, { node: 'next-line' }), 0);
  });

  it('I2: the count never exceeds the scenarios — three open findings break one scenario once', () => {
    const made = fixture({
      bend: (set) => {
        const one = finding(set);
        set.scenarios[0].findings.push({ ...structuredClone(one), id: 'a-two' }, { ...structuredClone(one), id: 'a-three' });
      },
    });
    const evaluation = evaluate(made.set, { root: made.root });
    assert.equal(countBroken(evaluation, {}), 1);
    assert.equal(countBroken(evaluation, { node: 'next-line' }), 1);
  });

  it('N1: --node with an owner the set does not list exits 2 and names the known owners', () => {
    const made = fixture();
    const run = cli(['--set', made.path, '--count', '--node', 'nobody'], made.root);
    assert.equal(run.status, 2);
    assert.equal(run.stderr, 'ux: no owner nobody — known: next-line, plain-words, unowned\n');
    assert.equal(run.stdout, '');
  });

  it('N4: --count on a set with problems exits 1, with the problems on stderr and nothing on stdout', () => {
    const made = fixture({
      bend: (set) => {
        finding(set).evidence.line = 'A line no file carries.';
      },
    });
    const run = cli(['--set', made.path, '--count'], made.root);
    assert.equal(run.status, 1);
    assert.equal(run.stdout, '');
    assert.equal(run.stderr, 'a-exit/a-no-next: the evidence line is not in skills/a/SKILL.md\n');
  });
});

/**
 * Three owners, three severities, three journeys (one with no scenario), and
 * every state: a-exit and b-exit are broken, c-exit carries a judged finding
 * only, and b-exit carries a fixed one.
 */
const reportFixture = () => {
  const made = twoOwners();
  const set = made.set;
  set.journeys.push('recover');
  const [a, b] = set.scenarios;
  b.journey = 'start';
  const jargon = b.findings[0];
  jargon.severity = 'minor';
  b.findings.push(
    { ...structuredClone(jargon), id: 'b-judged', severity: 'blocker', says: 'the exit reads as a dead end', fixedWhen: null },
    {
      ...structuredClone(a.findings[0]),
      id: 'b-fixed',
      severity: 'minor',
      fixedWhen: { file: 'skills/b/SKILL.md', section: '## 2. Exit', absent: 'Nothing like this' },
    },
  );
  set.scenarios.push({
    ...structuredClone(a),
    id: 'c-start',
    where: { file: 'skills/a/SKILL.md', section: '## 1. Start' },
    findings: [
      {
        id: 'c-judged',
        rubric: 'R3',
        severity: 'minor',
        owner: 'unowned',
        says: 'the opening line says found without saying what',
        evidence: { file: 'skills/a/SKILL.md', line: 'Say what you found.' },
        fixedWhen: null,
      },
    ],
  });
  writeFileSync(made.path, JSON.stringify(set));
  return made;
};

const report = (made) => cli(['--set', made.path, '--report'], made.root);
/** The finding lines of a report, by the owner heading above them. */
const groups = (stdout) => {
  const out = {};
  let owner;
  for (const line of stdout.split('\n\n')[0].split('\n')) {
    if (line.startsWith('  ')) out[owner].push(line.trim());
    else out[(owner = line)] = [];
  }
  return out;
};

describe('the report — P5, N5', () => {
  it('P5: findings are grouped by owner, in the order the set lists the owners', () => {
    const run = report(reportFixture());
    const found = groups(run.stdout);
    assert.deepEqual(Object.keys(found), ['next-line', 'plain-words', 'unowned']);
    assert.deepEqual(
      Object.fromEntries(Object.entries(found).map(([owner, lines]) => [owner, lines.map((line) => line.split(' ').find((word) => word.includes('/')))])),
      {
        'next-line': ['a-exit/a-no-next'],
        'plain-words': ['b-exit/b-judged', 'a-exit/a-jargon', 'b-exit/b-jargon'],
        unowned: ['c-start/c-judged'],
      },
    );
  });

  it('P5: within an owner, blockers come before majors before minors', () => {
    const found = groups(report(reportFixture()).stdout);
    assert.deepEqual(
      found['plain-words'].map((line) => line.split(' ')[0]),
      ['blocker', 'major', 'minor'],
    );
  });

  it('P5: every finding line carries its severity, state, scenario id, rubric item and evidence file', () => {
    const found = groups(report(reportFixture()).stdout);
    assert.deepEqual(found['next-line'], ['blocker open   a-exit/a-no-next · R2 · skills/a/SKILL.md — the exit names no command']);
    assert.equal(found['plain-words'][0], 'blocker judged b-exit/b-judged · R3 · skills/b/SKILL.md — the exit reads as a dead end');
  });

  it('P5: a fixed finding is counted, not listed — its evidence line is history nothing checks', () => {
    const run = report(reportFixture());
    assert.doesNotMatch(run.stdout, /b-fixed/);
  });

  it('P5: one line per journey the set lists, with its scenarios and how many are broken', () => {
    const lines = report(reportFixture()).stdout.split('\n\n')[1].split('\n');
    assert.deepEqual(lines.slice(0, 3), ['start: 1 scenarios, 1 broken', 'continue: 2 scenarios, 1 broken', 'recover: 0 scenarios, 0 broken']);
  });

  it('P5: the last line counts open, fixed and judged findings, and the report exits 0', () => {
    const run = report(reportFixture());
    assert.equal(run.stdout.split('\n').at(-2), 'open 3 · fixed 1 · judged 2');
    assert.equal(run.stdout.at(-1), '\n');
    assert.equal(run.status, 0);
    assert.equal(run.stderr, '');
  });

  it('N5: --report on a set with problems exits 1, with the problems on stderr and no report on stdout', () => {
    const made = fixture({
      bend: (set) => {
        finding(set).evidence.line = 'A line no file carries.';
      },
    });
    const run = report(made);
    assert.equal(run.status, 1);
    assert.equal(run.stdout, '');
    assert.equal(run.stderr, 'a-exit/a-no-next: the evidence line is not in skills/a/SKILL.md\n');
  });

  it('--count and --report together are a bad invocation: they are two modes', () => {
    const made = fixture();
    const run = cli(['--set', made.path, '--count', '--report'], made.root);
    assert.equal(run.status, 2);
    assert.match(run.stderr, /^Usage: node bench\/ux\/run\.mjs/m);
    assert.equal(run.stdout, '');
  });
});

describe('the shipped inventory', () => {
  it('resolves against this repository: every evidence line, every fixedWhen, every candidate file', () => {
    const root = join(HERE, '..', '..');
    assert.deepEqual(checkSet(loadSet(join(HERE, 'scenarios.json')), { root }), []);
  });
});

describe('a malformed entry is a problem, never a throw or a silent judgement', () => {
  it('a finding with no fixedWhen key is a problem and is never judged: only an explicit null is', () => {
    const made = fixture({
      bend: (set) => {
        delete finding(set).fixedWhen;
      },
    });
    assert.equal(stateOf(made), 'open');
    assert.deepEqual(problemsOf(made), ['a-exit/a-no-next: fixedWhen is missing — null for a judged finding, or a condition']);
  });

  it('a fixedWhen with an unknown key is a problem, so a misspelled section never widens to the whole file', () => {
    const made = fixture({
      files: { 'skills/a/SKILL.md': SKILL.replace('Say what you found.', 'Next: /hodos:run a') },
      bend: (set) => {
        finding(set).fixedWhen = { file: 'skills/a/SKILL.md', sectoin: '## 2. Exit', present: '^Next: ' };
      },
    });
    assert.equal(stateOf(made), 'open');
    assert.deepEqual(problemsOf(made), ['a-exit/a-no-next: fixedWhen carries an unknown key "sectoin"']);
  });

  it('a finding with an unknown key is a problem', () => {
    const made = fixture({
      bend: (set) => {
        const one = finding(set);
        one.sayz = one.says;
        delete one.says;
      },
    });
    assert.deepEqual(problemsOf(made), ['a-exit/a-no-next: unknown key "sayz"']);
  });

  it('a scenario with no findings list, or no where, is a problem', () => {
    const listless = fixture({
      bend: (set) => {
        delete set.scenarios[0].findings;
      },
    });
    assert.deepEqual(evaluate(listless.set, { root: listless.root }).scenarios[0].findings, []);
    assert.deepEqual(problemsOf(listless), ['a-exit: findings is not a list']);

    const nowhere = fixture({
      bend: (set) => {
        delete set.scenarios[0].where;
      },
    });
    assert.deepEqual(problemsOf(nowhere), [
      'a-exit: where names no file',
      "skills/a/SKILL.md: no scenario's where.file, and not in exempt[]",
    ]);
  });

  it('a finding with no evidence, or evidence with no line, is a problem', () => {
    const none = fixture({
      bend: (set) => {
        delete finding(set).evidence;
      },
    });
    assert.deepEqual(problemsOf(none), ['a-exit/a-no-next: evidence needs a file and a line']);

    const lineless = fixture({
      bend: (set) => {
        delete finding(set).evidence.line;
      },
    });
    assert.deepEqual(problemsOf(lineless), ['a-exit/a-no-next: evidence needs a file and a line']);
  });
});

describe('one read per file per run', () => {
  it('evaluate and checkSet read through the reader they are given, which is how a run shares one', () => {
    const made = fixture();
    const reads = [];
    const read = (file) => {
      reads.push(file);
      return readFileSync(join(made.root, file), 'utf8');
    };
    const evaluation = evaluate(made.set, { root: made.root, read });
    assert.deepEqual(reads, ['skills/a/SKILL.md']);
    checkSet(made.set, { root: made.root, read, evaluation });
    assert.ok(reads.length > 1, 'checkSet read nothing through the reader it was given');
    assert.ok(reads.every((file) => file === 'skills/a/SKILL.md'));
  });
});
