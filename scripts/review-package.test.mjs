// Repositories are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync, execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { changedExports, section, previousFindings } from './review-package.mjs';

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

test('previousFindings() returns the Standards table and nothing around it', () => {
  const table = previousFindings(REVIEW_1);

  assert.ok(table.startsWith('| Sev | Location | Item | Trigger | Finding | Fix |'));
  assert.ok(table.includes('| minor | src/features/orders/summary/Widget.tsx:31'));
  assert.ok(!table.includes('## Coverage'));
  assert.ok(!table.includes('Two findings'), 'the section\'s prose is not part of the table');
  assert.equal(table.split('\n').length, 4, 'the header, the rule row and the two findings');
});

test('previousFindings() returns null when the review has no Standards table', () => {
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
