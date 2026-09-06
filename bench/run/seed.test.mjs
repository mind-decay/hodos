// seed.test.mjs — the parsing and rewriting seed.mjs does before it touches a
// copy. The model is never called here and neither is git: what is tested is
// everything that can be wrong about a plan file, because a seeder that mis-reads
// a plan produces a task directory whose state.json disagrees with its plan.md,
// and every acceptance run of Stage 5 then measures the seeder.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

import { countTasks, dropGapLines, exemptions, fillHeader, parseHeader, seed, slugOf, stripGapMarkers } from './seed.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const PLANS = join(HERE, 'plans');

const HEADER = '# Plan — orders-summary\nPath: standard · Type: feature · Branch: {branch} · Campaign: — · Base: {base}\n';

test('slugOf reads the slug from the title line', () => {
  assert.equal(slugOf(HEADER), 'orders-summary');
});

test('slugOf rejects a plan with no title line', () => {
  assert.throws(() => slugOf('Path: quick · Type: feature\n'), /title/);
});

test('parseHeader reads the path and the type', () => {
  assert.deepEqual(parseHeader(HEADER), { path: 'standard', type: 'feature' });
});

test('parseHeader rejects a path the ledger does not take', () => {
  const bad = HEADER.replace('Path: standard', 'Path: campaign');
  assert.throws(() => parseHeader(bad), /campaign/);
});

test('parseHeader rejects a type the ledger does not take', () => {
  const bad = HEADER.replace('Type: feature', 'Type: chore');
  assert.throws(() => parseHeader(bad), /chore/);
});

test('fillHeader substitutes the branch and the base', () => {
  const out = fillHeader(HEADER, { branch: 'feature/orders-summary', base: 'a1b2c3d' });
  assert.match(out, /Branch: feature\/orders-summary · Campaign: — · Base: a1b2c3d/);
  assert.doesNotMatch(out, /\{branch\}|\{base\}/);
});

test('dropGapLines removes only the lines the plan marked', () => {
  const text = 'keep me\n`sig(a: A): B`  <!-- gap -->\nkeep me too\n';
  assert.equal(dropGapLines(text), 'keep me\nkeep me too\n');
});

test('dropGapLines leaves a plan with no marker untouched', () => {
  assert.equal(dropGapLines(HEADER), HEADER);
});

test('the marker never reaches the copy: it is stripped when the line stays', () => {
  // Stage 5 run 1 read the markers and told the developer what they were:
  // "the <!-- gap --> markers are bench-harness annotations". A plan under
  // test that announces it is a bench fixture is measuring something else.
  const text = 'keep me\n`sig(a: A): B`  <!-- gap -->\ntail\n';
  assert.equal(stripGapMarkers(text), 'keep me\n`sig(a: A): B`\ntail\n');
  assert.equal(stripGapMarkers(dropGapLines(text)), 'keep me\ntail\n');
});

test('countTasks counts the task headings, not every heading', () => {
  const text = '## Design\n### Modules\n## Tasks\n### T1. One\n### T2. Two\n## Verify plan\n';
  assert.equal(countTasks(text), 2);
});

test('countTasks rejects a plan with no tasks', () => {
  assert.throws(() => countTasks('## Tasks\n\n## Verify plan\n'), /no task/);
});

/**
 * A repository the seeder can work in, built by hand rather than by
 * fixture-copy.mjs: this test pins what `seed` does with a plan, and copying a
 * whole fixture for that starves the 200 ms hook budget `scripts/hooks.test.mjs`
 * asserts when the suite runs in parallel.
 */
function bareProject() {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-seed-')));
  mkdirSync(join(dir, '.claude/hodos'), { recursive: true });
  writeFileSync(
    join(dir, '.claude/hodos/config.json'),
    JSON.stringify({ version: 1, conventions: { commit: 'conventional', branch: 'feature/{slug}' } }),
  );
  const git = (...args) => execFileSync('git', args, { cwd: dir, stdio: 'ignore' });
  git('init', '-q');
  git('config', 'user.email', 'bench@hodos.test');
  git('config', 'user.name', 'hodos bench');
  git('add', '-A');
  git('commit', '-qm', 'chore: scaffold');
  return dir;
}

test('a seeded copy is approved, on its branch, and carries no harness marker', () => {
  // The one test that runs the whole seeder. It pins what the pure functions
  // cannot: that seed() actually calls them, and that the plan a run reads has
  // no <!-- gap --> in it.
  const dir = bareProject();
  try {
    const out = seed({ plan: 'orders-summary', copy: dir });
    assert.equal(out.slug, 'orders-summary');
    assert.equal(out.tasks, 3);
    assert.equal(out.branch, 'feature/orders-summary');

    const plan = readFileSync(join(dir, '.claude/hodos/tasks/orders-summary/plan.md'), 'utf8');
    assert.doesNotMatch(plan, /<!--\s*gap\s*-->/, 'the marker reached the copy');
    assert.doesNotMatch(plan, /\{branch\}|\{base\}/, 'the header placeholders survived');
    assert.match(plan, new RegExp(`Branch: ${out.branch} · Campaign: — · Base: ${out.base}`));

    const state = JSON.parse(
      readFileSync(join(dir, '.claude/hodos/tasks/orders-summary/state.json'), 'utf8'),
    );
    assert.equal(state.phase, 'approved');
    assert.equal(state.tasks.total, 3);
    assert.equal(state.branch, 'feature/orders-summary');
    assert.equal(readFileSync(join(dir, '.claude/hodos/active'), 'utf8').trim(), 'orders-summary');

    // The gap variant, in the same repository: ledger.mjs de-duplicates the
    // slug, so this lands beside the first rather than over it.
    const gapped = seed({ plan: 'orders-summary', copy: dir, gap: true });
    assert.equal(gapped.slug, 'orders-summary-2');
    const gapPlan = readFileSync(join(dir, '.claude/hodos/tasks/orders-summary-2/plan.md'), 'utf8');
    assert.match(gapPlan, /### Interfaces\n### Invariants/);
    assert.doesNotMatch(gapPlan, /<!--\s*gap\s*-->/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('every shipped plan parses, and its gap variant still holds every design field', () => {
  const fields = [
    '## Non-goals', '### Modules', '### Dependency direction', '### Interfaces',
    '### Invariants & failure modes', '### Data & scale', '### Precedent',
    '### Refactor in scope', '### External APIs', '### Architecture alternatives',
  ];
  for (const name of ['orders-summary', 'duplicate-customers', 'status-label', 'grid-columns']) {
    const text = readFileSync(join(PLANS, `${name}.md`), 'utf8');
    assert.equal(slugOf(text), name, `${name}: the slug is the file name`);
    const header = parseHeader(text);
    assert.ok(countTasks(text) >= 1, `${name}: at least one task`);
    assert.ok(['quick', 'standard', 'deep'].includes(header.path));
    assert.match(text, /## Open questions\n\(empty at approval\)/, `${name}: approved plans have no open questions`);
    for (const field of fields) assert.ok(text.includes(field), `${name}: ${field} is present`);
    const gapped = dropGapLines(text);
    for (const field of fields) assert.ok(gapped.includes(field), `${name} --gap: ${field} survives`);
    assert.doesNotMatch(stripGapMarkers(text), /<!--\s*gap\s*-->/, `${name}: the marker never ships`);
    assert.doesNotMatch(stripGapMarkers(gapped), /<!--\s*gap\s*-->/, `${name} --gap: the marker never ships`);
  }
});

test('the gap variant of orders-summary empties the interfaces field', () => {
  const text = readFileSync(join(PLANS, 'orders-summary.md'), 'utf8');
  assert.match(text, /summarizeOrders\(orders: Order\[\]\): OrderSummary/);
  assert.match(text, /export interface OrderSummary/);
  const gapped = dropGapLines(text);
  assert.doesNotMatch(gapped, /export function summarizeOrders/);
  assert.doesNotMatch(gapped, /export interface OrderSummary/);
  // The name survives in the task heading and its acceptance line; what the
  // gap removes is the return shape those two point at.
  assert.match(gapped, /### T1\. Summarize the fetched orders/);
  // The heading survives with nothing under it, and T1's acceptance criterion
  // points at it — so the hole is the shape itself, not a signature the
  // criterion restates elsewhere.
  assert.match(gapped, /### Interfaces\n### Invariants/);
  // Stage 5 session A recovered the shape from the invariants and recorded a
  // Ruling: on the type's name instead of a Gap: on the contract, which was
  // the plan leaking what --gap removes. No other field names the fields.
  for (const field of ['count', 'total', 'byStatus']) {
    assert.doesNotMatch(gapped, new RegExp(`\`${field}\``), `--gap still spells ${field}`);
  }
  assert.equal(text.split('\n').length - gapped.split('\n').length, 2);
});

test('--at review commits the implementation and leaves the copy at phase review', () => {
  const dir = bareProject();
  try {
    const out = seed({ plan: 'status-label', copy: dir, at: 'review' });
    assert.equal(out.phase, 'review');

    const taskDir = join(dir, '.claude/hodos/tasks/status-label');
    const ledger = readFileSync(join(taskDir, 'ledger.md'), 'utf8');
    assert.match(ledger, /Task 1: started/);
    assert.match(ledger, /Task 1: test red/);
    assert.match(ledger, /Task 1: done \([0-9a-f]{7}\)/);
    assert.match(ledger, /Simplify: done \([0-9a-f]{7}, net -0\)/);

    const state = JSON.parse(readFileSync(join(taskDir, 'state.json'), 'utf8'));
    assert.equal(state.phase, 'review');
    assert.equal(state.tasks.done, 1);

    // the implementation is in the commit, not just in the tree
    const committed = execFileSync('git', ['show', '--stat', '--oneline', 'HEAD'], { cwd: dir, encoding: 'utf8' });
    assert.match(committed, /src\/features\/orders\/labels\.ts/);
    assert.ok(existsSync(join(dir, 'src/features/orders/labels.ts')));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// The monorepo plan is the one case where the copy's own configs matter: two
// workspaces with different test commands, and a change in each (decision 0076).
test('the mono plan seeds a change two configs answer for', () => {
  const out = seed({ plan: 'cross-cut', fixture: 'mono', at: 'review' });
  try {
    const files = execFileSync('git', ['diff', '--name-only', `${out.base}..HEAD`], {
      cwd: out.copy,
      encoding: 'utf8',
    })
      .split('\n')
      .filter(Boolean);
    assert.deepEqual(files.sort(), [
      'svc/src/index.js',
      'svc/src/index.test.js',
      'web/src/basket.test.ts',
      'web/src/basket.ts',
    ]);

    const answering = JSON.parse(
      execFileSync('node', [join(HERE, '../../scripts/config.mjs'), 'for-files', ...files], {
        cwd: out.copy,
        encoding: 'utf8',
      }),
    );
    assert.deepEqual(
      answering.projects.map((project) => [project.dir, project.config.commands.test]),
      [
        ['svc', 'node --test src/*.test.js'],
        ['web', 'npm test'],
      ],
    );
  } finally {
    rmSync(out.copy, { recursive: true, force: true });
  }
});

test('--defect lands inside the task commit, so the review sees it in base..HEAD', () => {
  const dir = bareProject();
  try {
    const out = seed({ plan: 'status-label', copy: dir, at: 'review', defect: 'detail-inline-labels' });
    const diff = execFileSync('git', ['diff', `${out.base}..HEAD`], { cwd: dir, encoding: 'utf8' });

    assert.match(diff, /open: 'Awaiting payment', paid: 'Paid'/, 'the seeded defect is in the reviewed range');
    assert.doesNotMatch(
      execFileSync('git', ['status', '--short'], { cwd: dir, encoding: 'utf8' }),
      /OrderDetailPage/,
      'nothing is left uncommitted for the kernel to trip over',
    );
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--at review refuses a plan that ships no implementation', () => {
  const dir = bareProject();
  try {
    assert.throws(() => seed({ plan: 'grid-columns', copy: dir, at: 'review' }), /implementation/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('--at review refuses a defect the set does not have', () => {
  const dir = bareProject();
  try {
    assert.throws(() => seed({ plan: 'status-label', copy: dir, at: 'review', defect: 'no-such' }), /no-such/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- --at verify, and the Tests: exemption a task carries (decision 0043) ----

test('exemptions reads the Tests: line of each task', () => {
  const plan = readFileSync(join(PLANS, 'orders-summary.md'), 'utf8');
  assert.deepEqual(exemptions(plan), {
    3: 'visual — colour and a data attribute, no branch and no new condition · verified by ui recipe /orders',
  });
});

test('a task with no Tests: line is test-first and has no entry', () => {
  const plan = readFileSync(join(PLANS, 'status-label.md'), 'utf8');
  assert.deepEqual(exemptions(plan), {});
});

test('--at verify leaves the copy at phase verify with an accepted review', () => {
  const dir = bareProject();
  try {
    const out = seed({ plan: 'orders-summary', copy: dir, at: 'verify' });
    assert.equal(out.phase, 'verify');
    const tasks = join(dir, '.claude/hodos/tasks', out.slug);
    const ledger = readFileSync(join(tasks, 'ledger.md'), 'utf8');
    assert.match(ledger, /Review 1: ACCEPT \(0\/0\/0\)/);
    const state = JSON.parse(readFileSync(join(tasks, 'state.json'), 'utf8'));
    assert.equal(state.phase, 'verify');
    assert.equal(state.review.verdict, 'ACCEPT');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('an exempt task is recorded as exempt, not as a red test that never ran', () => {
  const dir = bareProject();
  try {
    const out = seed({ plan: 'orders-summary', copy: dir, at: 'verify' });
    const ledger = readFileSync(join(dir, '.claude/hodos/tasks', out.slug, 'ledger.md'), 'utf8');
    assert.doesNotMatch(ledger, /Task 3: test red/, 'a visual task has no red test to record');
    assert.match(ledger, /Task 3: done \([0-9a-f]+, tests: visual\)/);
    assert.match(ledger, /Task 1: test red/, 'a test-first task still records its red run');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// --- decision 0048: --at finish, with the review and verify artifacts a run
// would have left, so the finish phase has something to fold.

test('--at finish installs the artifacts and leaves the copy at phase finish', () => {
  const dir = bareProject();
  try {
    const out = seed({ plan: 'orders-summary', copy: dir, at: 'finish' });
    assert.equal(out.phase, 'finish');
    const tasks = join(dir, '.claude/hodos/tasks', out.slug);

    assert.ok(existsSync(join(tasks, 'review.md')), 'review.md is there to fold');
    assert.ok(existsSync(join(tasks, 'verify.md')), 'verify.md is there to fold');
    assert.ok(existsSync(join(tasks, 'evidence')), 'the evidence the verify table cites');

    const ledger = readFileSync(join(tasks, 'ledger.md'), 'utf8');
    assert.match(ledger, /Gap: /, 'a gap for the finish report to name');
    assert.match(ledger, /Ruling: /, 'a ruling for the finish report to name');
    assert.match(ledger, /Verify 1: PASS \d+ claims, \d+ skipped/);

    const state = JSON.parse(readFileSync(join(tasks, 'state.json'), 'utf8'));
    assert.equal(state.phase, 'finish');
    assert.equal(state.verify.verdict, 'PASS');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the seeded ledger counts agree with the artifacts they describe', () => {
  const dir = bareProject();
  try {
    const out = seed({ plan: 'orders-summary', copy: dir, at: 'finish' });
    const tasks = join(dir, '.claude/hodos/tasks', out.slug);
    const ledger = readFileSync(join(tasks, 'ledger.md'), 'utf8');

    const review = readFileSync(join(tasks, 'review.md'), 'utf8');
    const [, b, m, mi] = /blockers (\d+) · majors (\d+) · minors (\d+)/.exec(review);
    assert.match(ledger, new RegExp(`Review 1: ACCEPT \\(${b}/${m}/${mi}\\)`));

    const verify = readFileSync(join(tasks, 'verify.md'), 'utf8');
    const [, claims, skip] = /claims (\d+) · pass \d+ · fail \d+ · skip (\d+)/.exec(verify);
    assert.match(ledger, new RegExp(`Verify 1: PASS ${claims} claims, ${skip} skipped`));
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('the two rule arms name a pattern the code carries twice, and once', () => {
  // The arms differ in the review they install, not in the code: `finish.md`
  // greps the tree itself, so the counts have to be real. The tree the phase
  // greps is the fixture with the implementation laid over it, which is what
  // --at finish leaves behind — assembled here rather than copied, so the
  // assertion costs no fixture copy.
  const files = new Map();
  const collect = (root) => {
    for (const path of readdirSync(root, { recursive: true, withFileTypes: true })) {
      if (!path.isFile()) continue;
      const abs = join(path.parentPath, path.name);
      files.set(abs.slice(abs.indexOf(join('src', ''))), readFileSync(abs, 'utf8'));
    }
  };
  collect(join(HERE, '../fixtures/webapp/src'));
  for (const n of [1, 2, 3]) collect(join(PLANS, 'orders-summary.impl', `T${n}`, 'src'));

  const carrying = (pattern) => [...files.values()].filter((text) => text.includes(pattern)).length;

  assert.equal(carrying('role="alert"'), 2, 'the two arm\'s finding is in two files');
  // Not a money finding: the fixture spells money at four call sites, so any
  // money finding legitimately clears the threshold by widening its pattern.
  // A query guarded on a route parameter is the feature's only one.
  assert.equal(carrying('enabled:'), 1, 'the one arm\'s finding is in one file');

  for (const [arm, pattern] of [['two', 'role="alert"'], ['one', "enabled: id !== ''"]]) {
    const dir = bareProject();
    try {
      const out = seed({ plan: 'orders-summary', copy: dir, at: 'finish', ruleArm: arm });
      const review = readFileSync(join(dir, '.claude/hodos/tasks', out.slug, 'review.md'), 'utf8');
      assert.ok(review.includes(pattern), `the ${arm} arm's review names ${pattern}`);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  }
});

test('--rule-arm outside one|two is refused, and needs --at finish', () => {
  const dir = bareProject();
  try {
    assert.throws(() => seed({ plan: 'orders-summary', copy: dir, at: 'finish', ruleArm: 'three' }), /rule-arm/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
