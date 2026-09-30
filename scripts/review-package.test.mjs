// Repositories are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync, appendFileSync, rmSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { changedExports, section, previousFindings, taskDirPaths } from './review-package.mjs';

const SCRIPT = fileURLToPath(new URL('./review-package.mjs', import.meta.url));

const PLAN = `# Plan — orders-summary
Path: standard · Type: feature · Tasks: 2

## Goal
A totals row above the orders list.

## Non-goals
Server-side aggregation.

## Design
### Modules
\`features/orders/summary/\` — the query hook and the widget.
### Dependency direction
The widget imports the hook; nothing imports the widget but the route.
### Interfaces
\`useOrdersSummary(range): { count: number; total: number }\`

## Tasks
### T1. Summary query hook
Acceptance: totals for the fixture range.
### T2. Summary widget
Acceptance: the row renders above the list.

## Verify plan
- ui: /orders shows the row.
`;

const REVIEW_1 = `# Review 1 — orders-summary
Verdict: NEEDS_WORK · blockers 0 · majors 1 · minors 1

## Checks run
- test: \`npm test\` → 14 passed

## Spec
Missing: — · Extra: — · Misunderstood: —

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/summary/api.ts:22 | rules/http.md §2 | — | raw \`fetch\` instead of the project client | use \`request()\` |
| minor | src/features/orders/summary/Widget.tsx:31 | lint | — | unused \`range\` | remove |

Two findings, both in the summary module; the store was not touched.

## Coverage
Not reviewed: generated fixtures.
`;

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

/** A git repository with a hodos config and one commit before the task's base. */
function project() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-package-')));
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 'bench@hodos.test');
  git(root, 'config', 'user.name', 'hodos bench');
  mkdirSync(join(root, '.claude', 'hodos', 'tasks'), { recursive: true });
  writeFileSync(join(root, '.claude', 'hodos', 'config.json'), JSON.stringify({ version: 1 }));
  // The task directory is gitignored in a real project (FORMATS.md §1), so it
  // is here too: a plan that reached the diff would reach the package twice.
  writeFileSync(join(root, '.gitignore'), '.claude/hodos/tasks/\n.claude/hodos/active\n');
  writeFileSync(join(root, 'src.ts'), 'export const a = 1;\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'chore: base');
  return root;
}

/** The task directory `run` would have left at `phase: review`, with `n` commits on top of the base. */
function task(root, slug = 'orders-summary', { commits = 2, plan = PLAN, base } = {}) {
  const dir = join(root, '.claude', 'hodos', 'tasks', slug);
  mkdirSync(dir, { recursive: true });
  const baseSha = base ?? git(root, 'rev-parse', 'HEAD');
  const shas = [];
  for (let i = 1; i <= commits; i += 1) {
    writeFileSync(join(root, `file${i}.ts`), `export const f${i} = ${i};\n`);
    git(root, 'add', '-A');
    git(root, 'commit', '-qm', `feat: task ${i}`);
    shas.push(git(root, 'rev-parse', 'HEAD'));
  }
  writeFileSync(join(dir, 'plan.md'), plan);
  writeFileSync(
    join(dir, 'state.json'),
    JSON.stringify({ slug, phase: 'review', branch: `feature/${slug}`, base: baseSha }),
  );
  writeFileSync(join(dir, 'ledger.md'), `2026-09-01T10:00:00Z Plan: approved (${baseSha.slice(0, 7)}, 2 tasks, feature/${slug})\n`);
  return { dir, baseSha, shas };
}

const run = (root, ...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd: root, encoding: 'utf8' });
const inputOf = (dir) => readFileSync(join(dir, 'review-input.md'), 'utf8');

test('--help prints the usage and exits 0', () => {
  const out = run(realpathSync(tmpdir()), '--help');

  assert.equal(out.status, 0);
  assert.match(out.stdout, /Usage: node scripts\/review-package\.mjs <slug>/);
  assert.match(out.stdout, /--since/);
});

test('an unknown option exits 2 with the usage', () => {
  const out = run(realpathSync(tmpdir()), 'orders-summary', '--wat');

  assert.equal(out.status, 2);
  assert.match(out.stderr, /--wat/);
});

test('no slug exits 2', () => {
  const out = run(realpathSync(tmpdir()));

  assert.equal(out.status, 2);
});

test('a project without a hodos config exits 1 with the reason', () => {
  const bare = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-noconfig-')));
  const out = run(bare, 'orders-summary');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /no hodos config/i);
});

test('a slug with no task directory exits 1 and names the path it looked for', () => {
  const root = project();
  const out = run(root, 'ghost');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /tasks\/ghost/);
});

test('a state.json without a base exits 1 rather than guessing one', () => {
  const root = project();
  const { dir } = task(root);
  writeFileSync(join(dir, 'state.json'), JSON.stringify({ slug: 'orders-summary', phase: 'review' }));
  const out = run(root, 'orders-summary');

  assert.equal(out.status, 1);
  // Named as the ledger's gap, not as git's — "undefined is not a commit" is
  // the same exit code and tells the kernel to look in the wrong place.
  assert.match(out.stderr, /state\.json has no base/);
  assert.match(out.stderr, /Plan: approved/);
});

test('the package carries the header, both plan sections verbatim, the stat and a -U10 diff', () => {
  const root = project();
  const { dir, baseSha } = task(root, 'orders-summary', { commits: 3 });
  const out = run(root, 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
  const text = inputOf(dir);
  assert.match(text, /^# Review input — orders-summary$/m);
  assert.match(text, new RegExp(`^Base: ${baseSha.slice(0, 7)} · Head: [0-9a-f]{7} · Commits: 3$`, 'm'));
  // Verbatim: every line of the plan's Design section, its sub-headings included.
  assert.ok(text.includes('## Design (from plan)\n### Modules\n'));
  assert.ok(text.includes('`useOrdersSummary(range): { count: number; total: number }`'));
  assert.ok(text.includes('## Tasks (from plan)\n### T1. Summary query hook\n'));
  // and nothing from the sections between or after them
  assert.ok(!text.includes('Server-side aggregation'), 'Non-goals leaked into the package');
  assert.ok(!text.includes('ui: /orders shows the row'), 'the verify plan leaked into the package');
  assert.match(text, /^## Diff stat$/m);
  assert.match(text, /3 files changed/);
  assert.match(text, /^## Diff$/m);
  assert.match(text, /^\+export const f1 = 1;$/m);
  assert.ok(!text.includes('## Previous findings'), 'iteration 1 has no previous findings');
});

test('the path of the written file is what the script prints', () => {
  const root = project();
  const { dir } = task(root);
  const out = run(root, 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout.trim(), join(dir, 'review-input.md'));
});

test('a diff carries ten lines of context, not the default three', () => {
  const root = project();
  // The file exists before the task's base, so its change is a hunk in the
  // middle of a file rather than a new file, which is where context is visible.
  const lines = Array.from({ length: 30 }, (_, i) => `const l${i} = ${i};`).join('\n');
  writeFileSync(join(root, 'wide.ts'), `${lines}\n`);
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: wide');
  const { dir } = task(root, 'orders-summary', { commits: 0 });
  writeFileSync(join(root, 'wide.ts'), `${lines.replace('const l15 = 15;', 'const l15 = 99;')}\n`);
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: change the middle');
  run(root, 'orders-summary');

  const text = inputOf(dir);
  assert.match(text, /^ const l5 = 5;$/m, 'ten lines of context above the change');
  assert.match(text, /^ const l25 = 25;$/m, 'ten lines of context below the change');
});

test('--since scopes the diff to the fix and carries the previous findings verbatim', () => {
  const root = project();
  const { dir } = task(root, 'orders-summary', { commits: 2 });
  writeFileSync(join(dir, 'review.md'), REVIEW_1);
  const fixSha = git(root, 'rev-parse', 'HEAD');
  writeFileSync(join(root, 'fix.ts'), 'export const fixed = true;\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'fix: the finding');
  const out = run(root, 'orders-summary', '--since', fixSha);

  assert.equal(out.status, 0, out.stderr);
  const text = inputOf(dir);
  assert.match(text, new RegExp(`^Base: ${fixSha.slice(0, 7)} ·`, 'm'));
  assert.match(text, /^## Previous findings$/m);
  assert.match(text, /^### Spec\nMissing: — · Extra: — · Misunderstood: —$/m);
  assert.ok(text.includes('| major | src/features/orders/summary/api.ts:22 | rules/http.md §2 | — | raw `fetch` instead of the project client | use `request()` |'));
  assert.match(text, /^\+export const fixed = true;$/m);
  assert.ok(!text.includes('+export const f1 = 1;'), 'the first iteration\'s diff is out of scope');
});

test('--since without a review.md to scope against exits 1', () => {
  const root = project();
  task(root, 'orders-summary');
  const out = run(root, 'orders-summary', '--since', git(root, 'rev-parse', 'HEAD'));

  assert.equal(out.status, 1);
  assert.match(out.stderr, /review\.md/);
});

test('--since with a sha git does not know exits 1 with git\'s reason', () => {
  const root = project();
  const { dir } = task(root);
  writeFileSync(join(dir, 'review.md'), REVIEW_1);
  const out = run(root, 'orders-summary', '--since', 'deadbee');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /deadbee/);
});

test('section() takes a heading and everything under it, up to the next level-2 heading', () => {
  const design = section(PLAN, 'Design');

  assert.ok(design.startsWith('### Modules\n'));
  assert.ok(design.includes('### Interfaces'));
  assert.ok(!design.includes('## Tasks'));
  assert.ok(!design.endsWith('\n\n'), 'the trailing blank line before the next heading is dropped');
});

test('section() returns null for a heading the plan does not have', () => {
  assert.equal(section(PLAN, 'Outcome'), null);
});

test('previousFindings() returns the Spec section and the Standards table, and nothing around them', () => {
  const found = previousFindings(REVIEW_1);

  assert.ok(found.startsWith('### Spec\nMissing: — · Extra: — · Misunderstood: —\n\n### Standards\n| Sev | Location | Item | Trigger | Finding | Fix |'));
  assert.ok(found.includes('| minor | src/features/orders/summary/Widget.tsx:31'));
  assert.ok(!found.includes('## Coverage'));
  assert.ok(!found.includes('## Checks run'));
  assert.ok(!found.includes('Two findings'), 'the Standards section\'s prose is not part of the table');
});

// Decision 0175: on the pilot's D5 both of review 1's majors were Spec lines —
// decision 0122's mutation count — and review 2, handed the Standards table
// alone, returned ACCEPT on what the fix pass had closed with a ruling.
const REVIEW_SPEC_MAJORS = `# Review 1 — doc-module-token-budget
Verdict: NEEDS_WORK · blockers 0 · majors 2 · minors 2

## Spec
Missing: — · Extra: — · Misunderstood: — · Unclaimed: —
Mutation (major, T2): the ledger records 12 tests and the diff adds 8 declarations.
Mutation (major, T3): the ledger records 4 tests and the diff adds none.

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| minor | src/doc.rs:40 | lint | — | unused import | remove |
`;

test('previousFindings() carries a Spec major the Standards table does not hold', () => {
  const found = previousFindings(REVIEW_SPEC_MAJORS);

  assert.match(found, /^Mutation \(major, T2\): the ledger records 12 tests/m);
  assert.match(found, /^Mutation \(major, T3\)/m);
  assert.match(found, /^\| minor \| src\/doc\.rs:40/m);
});

test('previousFindings() returns null when the review has neither section', () => {
  assert.equal(previousFindings('# Review 1 — x\nVerdict: ACCEPT · blockers 0 · majors 0 · minors 0\n'), null);
});

// ---------------------------------------------------------------- decision 0065

/** A commit that changes one generated file and one source file. */
function generatedCommit(root, { bytes = 200 } = {}) {
  writeFileSync(join(root, 'package-lock.json'), `${'{"x":1}\n'.repeat(bytes)}`);
  writeFileSync(join(root, 'src.ts'), 'export const a = 2;\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'chore: lockfile and one line');
}

test('a lockfile is packaged stat-only, under a section that names it', () => {
  const root = project();
  const { dir } = task(root, 'gen-default', { commits: 1 });
  generatedCommit(root);

  const out = run(root, 'gen-default');
  assert.equal(out.status, 0, out.stderr);
  const input = inputOf(dir);

  assert.match(input, /## Not packaged/);
  assert.match(input, /package-lock\.json/);
  assert.doesNotMatch(input, /\+\{"x":1\}/);
  assert.match(input, /export const a = 2;/);
});

test('the section tells the reviewer to name what was left out, so the omission is in the review', () => {
  const root = project();
  const { dir } = task(root, 'gen-coverage', { commits: 1 });
  generatedCommit(root);

  run(root, 'gen-coverage');

  assert.match(inputOf(dir), /Coverage/);
});

test('config.review.generated replaces the defaults, so a project can package its own lockfile', () => {
  const root = project();
  writeFileSync(
    join(root, '.claude', 'hodos', 'config.json'),
    JSON.stringify({ version: 1, review: { generated: ['*.snap'] } }),
  );
  const { dir } = task(root, 'gen-configured', { commits: 1 });
  generatedCommit(root, { bytes: 3 });

  const out = run(root, 'gen-configured');
  assert.equal(out.status, 0, out.stderr);

  assert.match(inputOf(dir), /\+\{"x":1\}/);
  assert.doesNotMatch(inputOf(dir), /## Not packaged/);
});

test('a package over the byte cap exits 1 and names the files that made it big', () => {
  const root = project();
  writeFileSync(
    join(root, '.claude', 'hodos', 'config.json'),
    JSON.stringify({ version: 1, review: { maxBytes: 2000 } }),
  );
  const { dir } = task(root, 'too-big', { commits: 1 });
  writeFileSync(join(root, 'huge.ts'), `${'export const x = 1;\n'.repeat(400)}`);
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: a lot of source');

  const out = run(root, 'too-big');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /huge\.ts/);
  assert.match(out.stderr, /maxBytes|cap/);
  assert.equal(existsSync(join(dir, 'review-input.md')), false);
});

// ── --mechanical: the codemod is the artifact (Stage 11c, decision 0065) ────

/** A one-shape change across `n` files, made by a committed codemod. */
function mechanical(root, slug = 'rename-fetch', n = 40) {
  const dir = join(root, '.claude', 'hodos', 'tasks', slug);
  mkdirSync(dir, { recursive: true });
  mkdirSync(join(root, 'src'), { recursive: true });
  for (let i = 1; i <= n; i += 1) {
    writeFileSync(join(root, 'src', `mod${i}.ts`), `export const load${i} = () => fetch("/api/${i}");\n`);
  }
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'chore: before');
  const baseSha = git(root, 'rev-parse', 'HEAD');

  writeFileSync(
    join(root, 'codemod.mjs'),
    '// Replaces every bare fetch( with request( and adds the import.\n' +
      'export const shape = (text) => text.replace(/fetch\\(/g, "request(");\n',
  );
  for (let i = 1; i <= n; i += 1) {
    writeFileSync(join(root, 'src', `mod${i}.ts`), `export const load${i} = () => request("/api/${i}");\n`);
  }
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'refactor: fetch -> request by codemod');

  writeFileSync(join(dir, 'plan.md'), PLAN);
  writeFileSync(
    join(dir, 'state.json'),
    JSON.stringify({ slug, phase: 'review', branch: `refactor/${slug}`, base: baseSha }),
  );
  return { dir, baseSha };
}

test('--mechanical packages the codemod and a sample, not one diff per file', () => {
  const root = project();
  const { dir } = mechanical(root);
  const out = run(root, 'rename-fetch', '--mechanical', 'codemod.mjs');

  assert.equal(out.status, 0, out.stderr);
  const text = inputOf(dir);
  // The codemod itself is in the diff, whole.
  assert.match(text, /\+export const shape = \(text\) => text\.replace/);
  // A sample of the transformed files is, and the rest are named, not pasted.
  const sampled = [...text.matchAll(/^\+\+\+ b\/src\/mod\d+\.ts$/gm)];
  assert.equal(sampled.length, 3, `sampled ${sampled.length} files`);
  assert.match(text, /## Not packaged/);
  assert.match(text, /37 more files take the same edit/);
  assert.match(text, /name them in your Coverage/i);
  assert.ok(text.length < 20000, `package is ${text.length} chars`);
});

test('--mechanical needs a codemod that is part of the change', () => {
  const root = project();
  mechanical(root);
  const out = run(root, 'rename-fetch', '--mechanical', 'not-committed.mjs');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /not-committed\.mjs/);
});

test('the header carries the mutation counts the ledger holds, and a dash where it holds none', () => {
  // Decision 0122 asks the reviewer to compare <k> against the test declarations
  // the diff adds. Its inputs are a closed list and none of them was the ledger,
  // so the count was written and unreadable (proposal XXX, decision 0143). The
  // dash is the load-bearing half: a diff that adds three test declarations
  // under `Mutation: —` is the silence the row exists to end.
  const root = project();
  const { dir } = task(root);

  let out = run(root, 'orders-summary');
  assert.equal(out.status, 0, out.stderr);
  assert.match(inputOf(dir), /^Mutation: —$/m);

  appendFileSync(
    join(dir, 'ledger.md'),
    '2026-09-01T11:00:00Z Task 1: mutation (3 tests)\n' +
      '2026-09-01T11:30:00Z Task 2: mutation (0 tests)\n',
  );
  out = run(root, 'orders-summary');
  assert.equal(out.status, 0, out.stderr);
  assert.match(inputOf(dir), /^Mutation: T1 3 tests · T2 0 tests$/m);
});

test('a ledger row is read in ledger order and a re-mutated task is counted once, latest wins', () => {
  const root = project();
  const { dir } = task(root);
  appendFileSync(
    join(dir, 'ledger.md'),
    '2026-09-01T11:00:00Z Task 2: mutation (1 tests)\n' +
      '2026-09-01T11:30:00Z Task 1: mutation (2 tests)\n' +
      '2026-09-01T12:00:00Z Task 1: mutation (4 tests)\n',
  );
  const out = run(root, 'orders-summary');
  assert.equal(out.status, 0, out.stderr);
  // Task order, not ledger order: the reviewer reads the plan's tasks in their
  // own order. A second row for one task is the later run of the same check.
  assert.match(inputOf(dir), /^Mutation: T1 4 tests · T2 1 tests$/m);
});

test('the header reads only the rows after a rollback breaker', () => {
  // The same rule deriveState obeys (FORMATS.md §7, decision 0023): a rollback
  // restarts the counters, so everything before it is history. The second
  // task's row is what pins the slice — review 2's minor 2: with T1's stale row
  // before the rollback, latest-wins alone already prints the right number, so
  // that arrangement proved nothing the slice owns. Here T2's only row is
  // before the rollback, and dropping the slice makes it reappear.
  const root = project();
  const { dir } = task(root);
  appendFileSync(
    join(dir, 'ledger.md'),
    '2026-09-01T11:00:00Z Task 2: mutation (7 tests)\n' +
      '2026-09-01T11:30:00Z Breaker: verify — rollback T1\n' +
      '2026-09-01T12:00:00Z Task 1: mutation (2 tests)\n',
  );
  const out = run(root, 'orders-summary');
  assert.equal(out.status, 0, out.stderr);
  assert.match(inputOf(dir), /^Mutation: T1 2 tests$/m);
  const line = /^Mutation: .*$/m.exec(inputOf(dir))[0];
  assert.doesNotMatch(line, /T2/, 'T2 was rolled back with everything else before the breaker');
});

test('a task whose only mutation row is before a rollback has no count after it', () => {
  const root = project();
  const { dir } = task(root);
  appendFileSync(
    join(dir, 'ledger.md'),
    '2026-09-01T11:00:00Z Task 1: mutation (7 tests)\n' +
      '2026-09-01T11:30:00Z Breaker: verify — rollback T1\n',
  );
  const out = run(root, 'orders-summary');
  assert.equal(out.status, 0, out.stderr);
  // A dash, not the stale 7: the rebuilt task has no record yet, which is what
  // the reviewer should see and file.
  assert.match(inputOf(dir), /^Mutation: —$/m);
});

test('a task directory with no ledger packages with a dash, and does not refuse', () => {
  // `ledger.mjs init` always writes one, so this is a hand-made or damaged
  // state — and a header cell is not a reason to refuse a review of real code.
  const root = project();
  const { dir } = task(root);
  rmSync(join(dir, 'ledger.md'));

  const out = run(root, 'orders-summary');
  assert.equal(out.status, 0, out.stderr);
  assert.match(inputOf(dir), /^Mutation: —$/m);
});

test('an unreadable ledger says so in the cell rather than reading as no rows', { skip: process.platform === 'win32' && 'chmod 0o000 does not make a file unreadable on Windows' }, () => {
  // Decision 0139's rule, one layer down: the cell is reported in place and the
  // reason is said. A dash alone would read as "the task mutated nothing".
  const root = project();
  const { dir } = task(root);
  chmodSync(join(dir, 'ledger.md'), 0o000);
  try {
    const out = run(root, 'orders-summary');
    assert.equal(out.status, 0, out.stderr);
    assert.match(inputOf(dir), /^Mutation: — \(ledger\.md unreadable\)$/m);
  } finally {
    chmodSync(join(dir, 'ledger.md'), 0o644);
  }
});

test('--target carries no Mutation line: it owns no task and no ledger', () => {
  const root = project();
  git(root, 'checkout', '-q', '-b', 'teammate/feature');
  writeFileSync(join(root, 'their.ts'), 'export const t = 1;\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: theirs');

  const out = run(root, '--target', 'teammate/feature');
  assert.equal(out.status, 0, out.stderr);
  const text = readFileSync(out.stdout.trim(), 'utf8');
  assert.ok(!text.includes('Mutation:'), 'a diff no task owns has no ledger to read');
});

// ── --target: a diff hodos did not write (Stage 11c) ────────────────────────

test('--target packages a branch against its merge-base, outside any task', () => {
  const root = project();
  git(root, 'checkout', '-qb', 'teammate/feature');
  writeFileSync(join(root, 'their.ts'), 'export const theirs = 1;\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: their work');
  git(root, 'checkout', '-q', 'main');

  const out = run(root, '--target', 'teammate/feature');

  assert.equal(out.status, 0, out.stderr);
  const path = out.stdout.trim();
  assert.doesNotMatch(path, /\.claude\/hodos\/tasks/);
  const text = readFileSync(path, 'utf8');
  assert.match(text, /^# Review input — teammate\/feature$/m);
  // The head is the target's tip, not the branch this session happens to be on.
  const tip = git(root, 'rev-parse', '--short', 'teammate/feature');
  assert.match(text, new RegExp(`Head: ${tip} `));
  assert.match(text, /## Intent \(from commit messages\)/);
  assert.match(text, /feat: their work/);
  assert.match(text, /\+export const theirs = 1;/);
  assert.doesNotMatch(text, /## Design \(from plan\)/);
  assert.equal(existsSync(join(root, '.claude', 'hodos', 'tasks', 'teammate')), false);
});

test('--target refuses a branch a hodos task is on, and names /hodos:run', () => {
  const root = project();
  task(root, 'orders-summary');
  git(root, 'branch', 'feature/orders-summary');

  const out = run(root, '--target', 'feature/orders-summary');

  assert.equal(out.status, 1);
  assert.match(out.stderr, /orders-summary/);
  assert.match(out.stderr, /\/hodos:run/);
});

test('--target takes an explicit range and a working-tree path', () => {
  const root = project();
  const base = git(root, 'rev-parse', 'HEAD');
  writeFileSync(join(root, 'src.ts'), 'export const a = 2;\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'fix: bump');

  const range = run(root, '--target', `${base}..HEAD`);
  assert.equal(range.status, 0, range.stderr);
  assert.match(readFileSync(range.stdout.trim(), 'utf8'), /-export const a = 1;/);

  writeFileSync(join(root, 'src.ts'), 'export const a = 3;\n');
  const path = run(root, '--target', 'src.ts');
  assert.equal(path.status, 0, path.stderr);
  assert.match(readFileSync(path.stdout.trim(), 'utf8'), /\+export const a = 3;/);
});

test('--target and a slug are not the same call', () => {
  const root = project();
  const out = run(root, 'orders-summary', '--target', 'main');

  assert.equal(out.status, 2);
  assert.match(out.stderr, /--target/);
});

// --- the monorepo package (decision 0075)
//
// `git diff --name-only` returns root-relative paths whatever the cwd, and the
// same paths were handed back as a pathspec, which git resolves against cwd.
// From a subproject that pathspec named `<sub>/<sub>/…`, matched nothing, and
// git exited 0: the reviewer was handed a package whose stat listed two files
// and whose diff was empty. The anchor is `FORMATS.md §2`.

/** A monorepo per FORMATS.md §1: a root config, a nested one, a package in each. */
function monorepo() {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-mono-')));
  git(root, 'init', '-q', '-b', 'main');
  git(root, 'config', 'user.email', 'bench@hodos.test');
  git(root, 'config', 'user.name', 'hodos bench');
  writeFileSync(join(root, '.gitignore'), '.claude/hodos/tasks/\n.claude/hodos/active\n');
  for (const dir of ['.claude/hodos', 'web/.claude/hodos', 'web/src', 'svc/src']) {
    mkdirSync(join(root, dir), { recursive: true });
  }
  writeFileSync(join(root, '.claude/hodos/config.json'), JSON.stringify({ version: 1, nested: ['web'] }));
  writeFileSync(join(root, 'web/.claude/hodos/config.json'), JSON.stringify({ commands: { test: 'web-test' } }));
  writeFileSync(join(root, 'web/src/a.ts'), 'export const a = 1;\n');
  writeFileSync(join(root, 'svc/src/b.ts'), 'export const b = 1;\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'chore: base');
  return root;
}

/** A task at `<dir>/.claude/hodos/tasks/<slug>`, with one commit in each subproject. */
function crossTask(root, projectDir, slug = 'orders-summary') {
  const dir = join(root, projectDir, '.claude', 'hodos', 'tasks', slug);
  mkdirSync(dir, { recursive: true });
  const baseSha = git(root, 'rev-parse', 'HEAD');
  writeFileSync(join(root, 'web/src/a.ts'), 'export const a = 2;\n');
  writeFileSync(join(root, 'svc/src/b.ts'), 'export const b = 2;\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: both halves');
  writeFileSync(join(dir, 'plan.md'), PLAN);
  writeFileSync(
    join(dir, 'state.json'),
    JSON.stringify({ slug, phase: 'review', branch: `feature/${slug}`, base: baseSha }),
  );
  return { dir, baseSha };
}

test('a package built from a subproject carries every touched file (decision 0075)', () => {
  const root = monorepo();
  const { dir } = crossTask(root, 'web');

  const out = run(join(root, 'web'), 'orders-summary');
  assert.equal(out.status, 0);
  const input = inputOf(dir);

  const diff = section(input, 'Diff');
  assert.match(diff, /web\/src\/a\.ts/);
  assert.match(diff, /svc\/src\/b\.ts/);
  assert.match(diff, /export const a = 2/);
  assert.match(diff, /export const b = 2/);
});

test('a subproject package equals the one the same task produces at the git root', () => {
  const fromRoot = monorepo();
  const rootTask = crossTask(fromRoot, '.');
  assert.equal(run(fromRoot, 'orders-summary').status, 0);

  const fromWeb = monorepo();
  const webTask = crossTask(fromWeb, 'web');
  assert.equal(run(join(fromWeb, 'web'), 'orders-summary').status, 0);

  // Both repositories are built by the same two commits, so base and head
  // differ only in their shas; the diff and the stat must not differ at all.
  assert.equal(section(inputOf(webTask.dir), 'Diff'), section(inputOf(rootTask.dir), 'Diff'));
  assert.equal(section(inputOf(webTask.dir), 'Diff stat'), section(inputOf(rootTask.dir), 'Diff stat'));
});

test('--target <path> resolves where the developer is standing', () => {
  const root = monorepo();
  writeFileSync(join(root, 'web/src/a.ts'), 'export const a = 3;\n');

  const out = run(join(root, 'web'), '--target', 'src');
  assert.equal(out.status, 0);
  const input = readFileSync(out.stdout.trim(), 'utf8');

  assert.match(section(input, 'Diff'), /export const a = 3/);
  assert.doesNotMatch(section(input, 'Diff'), /svc\/src\/b\.ts/);
});

test('the package names the projects that answer for it (decision 0076)', () => {
  const root = monorepo();
  mkdirSync(join(root, 'svc/.claude/hodos'), { recursive: true });
  writeFileSync(join(root, 'svc/.claude/hodos/config.json'), JSON.stringify({ commands: { test: 'svc-test' } }));
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'chore: svc earns a config');
  const { dir } = crossTask(root, 'web');

  assert.equal(run(join(root, 'web'), 'orders-summary').status, 0);
  const projects = section(inputOf(dir), 'Projects');

  assert.equal(
    projects,
    ['- svc · config: svc/.claude/hodos/config.json', '- web · config: web/.claude/hodos/config.json'].join('\n'),
  );
});

/** A task whose one commit touches `web/` only. */
function webOnlyTask(root, projectDir, slug = 'orders-summary') {
  const dir = join(root, projectDir, '.claude', 'hodos', 'tasks', slug);
  mkdirSync(dir, { recursive: true });
  const baseSha = git(root, 'rev-parse', 'HEAD');
  writeFileSync(join(root, 'web/src/a.ts'), 'export const a = 2;\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: the web half only');
  writeFileSync(join(dir, 'plan.md'), PLAN);
  writeFileSync(
    join(dir, 'state.json'),
    JSON.stringify({ slug, phase: 'review', branch: `feature/${slug}`, base: baseSha }),
  );
  return { dir, baseSha };
}

// A change inside one subproject names one (criterion 3's last sentence). The
// case decision 0060 argues against is exactly this one: a package built at the
// root for a change confined to `web/` carries the root's config, whose
// `commands.test` runs every workspace to check one package. What has to be
// disambiguated is not "more than one project answers" but "the project that
// answers is not the one whose config the package was built from".
test('a change inside one subproject names that subproject (decision 0076)', () => {
  const root = monorepo();
  const { dir } = webOnlyTask(root, '.');

  assert.equal(run(root, 'orders-summary').status, 0);

  assert.equal(section(inputOf(dir), 'Projects'), '- web · config: web/.claude/hodos/config.json');
});

// The other side of the same rule: from `web/`, web's config is already the one
// the dispatch names, so there is nothing to disambiguate and the section stays
// out — which is what keeps the single-config package byte-identical.
test('a subproject package for its own change names no project', () => {
  const root = monorepo();
  const { dir } = webOnlyTask(root, 'web');

  assert.equal(run(join(root, 'web'), 'orders-summary').status, 0);
  const input = inputOf(dir);

  assert.equal(section(input, 'Projects'), null);
  assert.doesNotMatch(input, /project:/);
});

test('one config, no Projects section, and the package is byte-identical', () => {
  const root = project();
  const { dir } = task(root);

  assert.equal(run(root, 'orders-summary').status, 0);
  const input = inputOf(dir);

  assert.equal(section(input, 'Projects'), null);
  assert.doesNotMatch(input, /project:/);
});

// Decision 0100: three of the reviewer's nine behavioral codes ask about a
// caller the diff does not contain, and its one focused check has to find it.

test('changedExports reads the export families out of a diff, added and removed alike', () => {
  const diff = [
    'diff --git a/src/api.ts b/src/api.ts',
    '@@ -1,4 +1,6 @@',
    '+export function listOrders(status) {',
    '+export const keys = {',
    '-export class OrderStore {',
    '+export type Order = { id: string };',
    '+export default function App() {',
    '+pub fn blast_radius(symbol: &str) -> Radius {',
    '+pub struct Radius {',
    '+  const local = listOrders(status);',
    ' export const untouched = 1;',
  ].join('\n');

  assert.deepEqual(changedExports(diff).sort(), [
    'App',
    'OrderStore',
    'Order',
    'Radius',
    'blast_radius',
    'keys',
    'listOrders',
  ].sort());
});

/** A repository whose `caller.ts` uses what `api.ts` exports. */
function callerProject() {
  const root = project();
  writeFileSync(join(root, 'api.ts'), 'export function listOrders(status) {\n  return status;\n}\n');
  writeFileSync(join(root, 'caller.ts'), "import { listOrders } from './api';\n\nexport const page = () => listOrders('open');\n");
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'chore: the caller');
  return root;
}

test('a changed export is packaged with its call sites outside the diff', () => {
  const root = callerProject();
  const { dir } = task(root, 'callers', { commits: 0 });
  writeFileSync(join(root, 'api.ts'), 'export function listOrders(status, page) {\n  return [status, page];\n}\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: a second argument');

  const out = run(root, 'callers');
  assert.equal(out.status, 0, out.stderr);
  const input = inputOf(dir);

  assert.match(input, /## Callers/);
  assert.match(input, /- `listOrders` · caller\.ts:3 — `export const page = \(\) => listOrders\('open'\);`/);
  // The declaration is in the diff already; naming it back is noise.
  assert.doesNotMatch(input, /`listOrders` · api\.ts:/);
});

test('a diff that changes no exported declaration carries no section', () => {
  const root = callerProject();
  const { dir } = task(root, 'no-exports', { commits: 0 });
  writeFileSync(join(root, 'api.ts'), 'export function listOrders(status) {\n  const trimmed = status.trim();\n  return trimmed;\n}\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: trim it');

  run(root, 'no-exports');

  assert.doesNotMatch(inputOf(dir), /## Callers/);
});

test('a symbol over the per-symbol cap says how many sites it did not list', () => {
  const root = callerProject();
  for (let i = 1; i <= 8; i += 1) {
    writeFileSync(join(root, `page${i}.ts`), `import { listOrders } from './api';\nexport const p${i} = () => listOrders('open');\n`);
  }
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'chore: eight more callers');
  const { dir } = task(root, 'capped', { commits: 0 });
  writeFileSync(join(root, 'api.ts'), 'export function listOrders(status, page) {\n  return [status, page];\n}\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: a second argument');

  run(root, 'capped');
  const input = inputOf(dir);
  const listed = input.split('\n').filter((l) => l.startsWith('- `listOrders` · '));

  assert.equal(listed.length, 5);
  assert.match(input, /- `listOrders` — 5 of 9 call sites listed \(cap\)/);
});

test('an import of the symbol is not a call site', () => {
  const root = callerProject();
  const { dir } = task(root, 'imports', { commits: 0 });
  writeFileSync(join(root, 'api.ts'), 'export function listOrders(status, page) {\n  return [status, page];\n}\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: a second argument');

  run(root, 'imports');
  const input = inputOf(dir);

  assert.match(input, /- `listOrders` · caller\.ts:3/);
  assert.doesNotMatch(input, /caller\.ts:1/);
});

test('a rule or a README quoting the symbol is not a call site', () => {
  const root = callerProject();
  mkdirSync(join(root, '.claude', 'rules'), { recursive: true });
  writeFileSync(
    join(root, '.claude', 'rules', 'http.md'),
    '# The network is reached through the feature api\n\n```ts\nexport function listOrders(status) {}\n```\n',
  );
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'chore: the rule that documents it');
  const { dir } = task(root, 'docs-are-not-callers', { commits: 0 });
  writeFileSync(join(root, 'api.ts'), 'export function listOrders(status, page) {\n  return [status, page];\n}\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: a second argument');

  run(root, 'docs-are-not-callers');
  const input = inputOf(dir);

  assert.match(input, /- `listOrders` · caller\.ts:3/);
  assert.doesNotMatch(input, /rules\/http\.md/);
});

test('the symbol inside a string is not a call site', () => {
  const root = callerProject();
  // The shape run 2026-09-06 produced against `p4`: a test title carrying the
  // exported name as a word, matched by grep, calling nothing.
  writeFileSync(
    join(root, 'server.test.ts'),
    "import { page } from './caller';\n\nit('answers the listOrders route with JSON', () => {\n  page();\n});\n",
  );
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'chore: the test whose title names it');
  const { dir } = task(root, 'strings', { commits: 0 });
  writeFileSync(join(root, 'api.ts'), 'export function listOrders(status, page) {\n  return [status, page];\n}\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: a second argument');

  run(root, 'strings');
  const input = inputOf(dir);

  assert.match(input, /- `listOrders` · caller\.ts:3/);
  assert.doesNotMatch(input, /server\.test\.ts/);
});

// --- decision 0172: a tracked line that names a task directory. `init`
// gitignores `.claude/hodos/tasks/` (decision 0144), so a citation into it
// resolves to nothing in any other checkout — 32 of them reached the pilot's
// trunk. The package computes the list; the reviewer judges each line.

const CITING = [
  'diff --git a/src/economy.rs b/src/economy.rs',
  'index 1111111..2222222 100644',
  '--- a/src/economy.rs',
  '+++ b/src/economy.rs',
  '@@ -10,3 +10,5 @@ fn budget() {',
  ' let a = 1;',
  '+// the cap is 4000 [src: .claude/hodos/tasks/doc-module-token-budget/plan.md D1]',
  ' let b = 2;',
  '-// [src: .claude/hodos/tasks/old-task/plan.md D3] — removing one is the repair',
  '+let c = 3;',
  'diff --git a/.gitignore b/.gitignore',
  '--- a/.gitignore',
  '+++ b/.gitignore',
  '@@ -1 +1,2 @@',
  ' node_modules',
  '+.claude/hodos/tasks/scratch-task/',
  'diff --git a/docs/how.md b/docs/how.md',
  'new file mode 100644',
  '--- /dev/null',
  '+++ b/docs/how.md',
  '@@ -0,0 +1,2 @@',
  '+Each task writes `.claude/hodos/tasks/<slug>/plan.md`.',
  '+See .claude/hodos/tasks/orders-summary/plan.md for the decision.',
].join('\n');

test('taskDirPaths lists the added lines that name a concrete task directory, with their file:line', () => {
  assert.deepEqual(taskDirPaths(CITING), [
    '- src/economy.rs:11 — `// the cap is 4000 [src: .claude/hodos/tasks/doc-module-token-budget/plan.md D1]`',
    '- docs/how.md:2 — `See .claude/hodos/tasks/orders-summary/plan.md for the decision.`',
  ]);
});

test('taskDirPaths skips the <slug> placeholder, a removed line, and a .gitignore', () => {
  const lines = taskDirPaths(CITING).join('\n');
  assert.doesNotMatch(lines, /<slug>/);
  assert.doesNotMatch(lines, /old-task/);
  assert.doesNotMatch(lines, /scratch-task/);
});

test('a package whose diff cites a task directory carries the section, and one that does not carries none', () => {
  const root = project();
  const { dir } = task(root);
  writeFileSync(join(root, 'cite.ts'), '// capped at 40 [src: .claude/hodos/tasks/orders-summary/plan.md D2]\nexport const cap = 40;\n');
  git(root, 'add', '-A');
  git(root, 'commit', '-qm', 'feat: the cap');

  const out = run(root, 'orders-summary');

  assert.equal(out.status, 0, out.stderr);
  const text = inputOf(dir);
  assert.match(text, /^## Task-directory paths$/m);
  assert.match(text, /^- cite\.ts:1 — `\/\/ capped at 40 \[src: \.claude\/hodos\/tasks\/orders-summary\/plan\.md D2\]`$/m);

  const clean = project();
  const other = task(clean);
  assert.equal(run(clean, 'orders-summary').status, 0);
  assert.doesNotMatch(inputOf(other.dir), /## Task-directory paths/);
});

// --- an inert task's plan (decision 0183)
//
// An `inert` change has no behaviour, so its plan carries no design fields and
// the package has none to copy. What the reviewer is handed instead is the
// claim the developer confirmed at the verdict, so that it can check it.

const INERT_PLAN = `# Plan — fix-doc
Path: quick · Type: refactor · Shape: inert · Branch: fix/fix-doc

## Goal
The doc comment on the two exports says what each one holds.

## Non-goals
- No line a program reads.

## Tasks
### T1. Reword the doc comments
Files: file1.ts, file2.ts
Acceptance: \`commands.test\` and \`commands.lint\` green.
`;

/** `task()` with the inert plan and a state that carries the shape, or not. */
function inertTask(root, { shape = 'inert' } = {}) {
  const made = task(root, 'fix-doc', { plan: INERT_PLAN });
  const statePath = join(made.dir, 'state.json');
  const state = JSON.parse(readFileSync(statePath, 'utf8'));
  writeFileSync(statePath, JSON.stringify({ ...state, path: 'quick', type: 'refactor', shape }));
  return made;
}

test('an inert task whose plan has no Design is packaged, and the package states the shape', () => {
  const root = project();
  const { dir } = inertTask(root);
  const out = run(root, 'fix-doc');

  assert.equal(out.status, 0, out.stderr);
  const text = inputOf(dir);
  assert.match(text, /^## Shape: inert \(decision 0183\)$/m);
  assert.match(text, /no program reads/);
  assert.ok(!text.includes('## Design (from plan)'), 'an inert plan has no design to copy');
  assert.ok(text.includes('## Tasks (from plan)\n### T1. Reword the doc comments\n'));
  assert.match(text, /^## Diff$/m);
});

test('the same plan without the shape still exits 1: only inert goes without a design', () => {
  for (const shape of [null, 'mechanical']) {
    const root = project();
    inertTask(root, { shape });
    const out = run(root, 'fix-doc');
    assert.equal(out.status, 1, `shape ${shape}`);
    assert.match(out.stderr, /no "## Design" section/);
  }
});

test('a task with a design and no shape carries no Shape section', () => {
  const root = project();
  const { dir } = task(root);
  assert.equal(run(root, 'orders-summary').status, 0);
  assert.ok(!inputOf(dir).includes('## Shape'), 'a shape section appeared on a task with none');
});
