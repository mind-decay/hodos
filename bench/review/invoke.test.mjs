// The driver's own parts, tested without a model call. The dispatch itself is
// the scored run (decision 0019); everything around it is checkable for free.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { groupPackages, parseReview, prepare, resolveAnchors, commandFor } from './invoke.mjs';

const INVOKE = fileURLToPath(new URL('./invoke.mjs', import.meta.url));
const HERE = fileURLToPath(new URL('.', import.meta.url));

const REVIEW = `# Review 1 — p1
Verdict: NEEDS_WORK · blockers 0 · majors 2 · minors 1

## Checks run
- test: \`npm test\` → 12 passed
- typecheck: \`npm run typecheck\` → 0 errors
- lint: \`npm run lint\` → 1 error

## Spec
Missing: — · Extra: — · Misunderstood: —

## Standards
| Sev | Location | Item | Trigger | Finding | Fix |
|---|---|---|---|---|---|
| major | src/features/orders/summary.ts:8 | rules/network-through-request.md | — | a second fetch outside src/lib | call request() |
| major | src/features/orders/model.ts:21 | L4 state mutation | the caller keeps the array | sort() mutates the argument | sort a copy |
| minor | src/features/orders/ui/OrdersSummary.tsx:11 | rules/query-key-factory.md | — | the key is written by hand | read it off keys |

## Coverage
Not reviewed: the fixture's own configuration files.
`;

const run = (...args) => spawnSync(process.execPath, [INVOKE, ...args], { encoding: 'utf8' });

test('--help prints the usage and exits 0', () => {
  const out = run('--help');

  assert.equal(out.status, 0);
  assert.match(out.stdout, /Usage: node bench\/review\/invoke\.mjs/);
});

test('the packages are grouped by what the patches say, not by a second list', () => {
  const packages = groupPackages(HERE);

  assert.equal(packages.length, 6);
  const p1 = packages.find((p) => p.id === 'p1');
  assert.equal(p1.fixture, 'webapp');
  assert.equal(p1.seeded.length, 3);
  assert.equal(p1.clean.length, 1);
  assert.match(p1.plan, /^## Design$/m);
  assert.match(p1.plan, /^## Tasks$/m);
  for (const pkg of packages) {
    assert.ok(pkg.seeded.length >= 3, `${pkg.id} has ${pkg.seeded.length} seeded patches`);
    assert.equal(new Set(pkg.seeded.map((d) => d.fixture)).size, 1, `${pkg.id} mixes fixtures`);
  }
});

test('parseReview reads the verdict, the rows and the section lengths', () => {
  const review = parseReview(REVIEW);

  assert.equal(review.verdict, 'NEEDS_WORK');
  assert.deepEqual(review.counts, { blockers: 0, majors: 2, minors: 1 });
  assert.equal(review.findings.length, 3);
  assert.deepEqual(review.findings[1], {
    sev: 'major',
    file: 'src/features/orders/model.ts',
    line: 21,
    location: 'src/features/orders/model.ts:21',
    item: 'L4 state mutation',
    trigger: 'the caller keeps the array',
    finding: 'sort() mutates the argument',
    fix: 'sort a copy',
  });
  assert.equal(review.findings[0].trigger, null, 'an em dash is no trigger');
  assert.ok(review.words.standards > 0 && review.words.standards < 400);
  // The cap is on words, and a table's pipes are not words: three rows of six
  // columns would otherwise add twenty-one to the count on their own.
  assert.ok(review.words.standards < 120, `standards counted ${review.words.standards} words`);
  assert.ok(review.words.spec > 0);
  assert.equal(review.checks.length, 3);
});

test('a location in backticks, a range, or a list of two is still a location', () => {
  const review = parseReview(
    REVIEW.replace('src/features/orders/model.ts:21', '`src/features/orders/model.ts:21-24`').replace(
      'src/features/orders/summary.ts:8',
      '`src/features/orders/summary.ts:8`, `src/lib/http.ts:12`',
    ),
  );

  assert.equal(review.findings[1].file, 'src/features/orders/model.ts');
  assert.equal(review.findings[1].line, 21, 'a range is reported at its first line');
  assert.equal(review.findings[0].file, 'src/features/orders/summary.ts');
  assert.equal(review.findings[0].line, 8, 'the first location of a list is the one it is filed under');
});

test('parseReview keeps a row whose location is not a file:line, so the scorer can call it invalid', () => {
  const review = parseReview(REVIEW.replace('src/features/orders/model.ts:21', 'somewhere in the store'));

  assert.equal(review.findings.length, 3);
  assert.equal(review.findings[1].file, null);
  assert.equal(review.findings[1].line, null);
});

test('parseReview survives a review with no Standards table', () => {
  const review = parseReview('# Review 2 — p1\nVerdict: ACCEPT · blockers 0 · majors 0 · minors 0\n\n## Spec\nMissing: —\n');

  assert.equal(review.verdict, 'ACCEPT');
  assert.deepEqual(review.findings, []);
});

test('resolveAnchors finds each defect where it ended up in the applied copy', () => {
  const copy = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-anchors-')));
  mkdirSync(join(copy, 'src'), { recursive: true });
  writeFileSync(join(copy, 'src/a.ts'), ['const a = 1;', '', 'const b = 2;', 'const c = 3;'].join('\n'));
  const defects = [
    { id: 'd1', file: 'src/a.ts', anchor: 'const c = 3;', line: 2 },
    { id: 'd2', file: 'src/a.ts', anchor: 'const gone = 0;', line: 9 },
  ];

  const anchors = resolveAnchors(copy, defects);

  assert.equal(anchors.d1, 4, 'the line the anchor actually sits on, not the one the patch had');
  assert.equal(anchors.d2, undefined, 'an anchor that is not in the copy is left unresolved');
});

test('--reparse rebuilds the verdicts from the reviews already on disk, dispatching nothing', () => {
  const dir = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-reparse-')));
  writeFileSync(join(dir, 'p1-review.md'), REVIEW);
  writeFileSync(
    join(dir, 'verdicts.json'),
    JSON.stringify({
      runAt: '2026-09-01T00:00:00Z',
      packages: [{ id: 'p1', anchors: { 'w-bare-fetch': 8 }, cost: 0.62, turns: 2, findings: [], verdict: null }],
    }),
  );
  const out = run('--reparse', dir);

  assert.equal(out.status, 0, out.stderr);
  const verdicts = JSON.parse(readFileSync(join(dir, 'verdicts.json'), 'utf8'));
  assert.equal(verdicts.packages[0].findings.length, 3, 'the rows come back from the review file');
  assert.equal(verdicts.packages[0].verdict, 'NEEDS_WORK');
  assert.deepEqual(verdicts.packages[0].anchors, { 'w-bare-fetch': 8 }, 'what the run measured is kept');
  assert.equal(verdicts.packages[0].cost, 0.62, 'what the run cost is kept');
});

test('the command is the arm check D closed: plugin-dir, bypassPermissions, stream-json', () => {
  const command = commandFor({ id: 'p1' }, { pluginRoot: '/repo', copyDir: '/copy' });

  assert.equal(command.file, 'claude');
  assert.ok(command.args.includes('--plugin-dir'));
  assert.ok(command.args.includes('/repo'));
  assert.ok(command.args.includes('bypassPermissions'));
  assert.ok(command.args.includes('stream-json'));
  const prompt = command.args[command.args.indexOf('-p') + 1];
  assert.match(prompt, /hodos-reviewer/);
  assert.match(prompt, /review-input\.md/);
  assert.match(prompt, /review\.md/);
  assert.ok(!prompt.includes('defect'), 'the dispatch never says what is seeded');
});

test('a bare path is a location: the file the finding says should exist', () => {
  // decision 0038. The row names the path the missing file belongs at, and no
  // line, because there is no line in a file that does not exist.
  const review = parseReview(
    REVIEW.replace('src/features/orders/model.ts:21', 'src/features/orders/model.test.ts'),
  );

  assert.equal(review.findings[1].file, 'src/features/orders/model.test.ts');
  assert.equal(review.findings[1].line, null);
});

test('prepare records the files the package ships, so an absence can be proved', () => {
  // decision 0038: the scorer credits a bare path only when the package does
  // not hold that file. The list comes from the copy invoke.mjs built, never
  // from the review that is being scored.
  const out = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-files-')));
  try {
    const [pkg] = groupPackages(HERE).filter((p) => p.id === 'p1');
    const { files } = prepare(pkg, out);

    assert.ok(Array.isArray(files) && files.length > 20, 'the copy lists its tracked files');
    assert.ok(files.includes('src/features/orders/api.ts'), 'a file the fixture ships');
    assert.ok(
      !files.includes('src/features/orders/ui/OrderDetailPage.test.tsx'),
      'a file the package does not ship — the shape a missing-test finding names',
    );
    assert.ok(!files.some((f) => f.startsWith('.git/')), 'tracked files, not the repository');
  } finally {
    rmSync(out, { recursive: true, force: true });
  }
});

test('prepare works from a relative --out, which is what the README tells you to type', () => {
  // The patch file is handed to `git apply` with the copy as its cwd, so a
  // relative out directory resolved there names nothing: the run died on
  // `can't open patch bench/review/runs/<date>/copies/p1.tmp.patch` before it
  // dispatched anything.
  const cwd = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-relout-')));
  try {
    const [pkg] = groupPackages(HERE).filter((p) => p.id === 'p1');
    const spent = process.cwd();
    process.chdir(cwd);
    try {
      const { files } = prepare(pkg, join('runs', 'today'));
      assert.ok(files.includes('src/features/orders/api.ts'));
    } finally {
      process.chdir(spent);
    }
  } finally {
    rmSync(cwd, { recursive: true, force: true });
  }
});
