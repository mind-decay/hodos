import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { pilotPackages, prepPilot, redactPilot, snippetPackages } from './invoke.mjs';
import { tempDir } from '../../scripts/temp-dir.mjs';

const INVOKE = fileURLToPath(new URL('./invoke.mjs', import.meta.url));
const sha = (text) => createHash('sha256').update(text).digest('hex');
const git = (cwd, ...args) => execFileSync('git', ['-c', 'user.email=t@t', '-c', 'user.name=t', ...args], { cwd, encoding: 'utf8' }).trim();

/** A repository with a base and a head commit, and a cached package for it. */
function pilotRepo() {
  const root = tempDir('hodos-holdout-pilot-');
  const repo = join(root, 'repo');
  mkdirSync(join(repo, 'src'), { recursive: true });
  writeFileSync(join(repo, 'src/lib.rs'), 'pub fn one() -> u32 {\n    1\n}\n');
  git(repo, 'init', '-q');
  git(repo, 'add', '-A');
  git(repo, 'commit', '-qm', 'base');
  const base = git(repo, 'rev-parse', '--short', 'HEAD');
  // the defect line moves down two lines between the review and the key
  writeFileSync(join(repo, 'src/lib.rs'), '// one\n// two\npub fn one() -> u32 {\n    1 + 1\n}\n');
  git(repo, 'commit', '-qam', 'head');
  const head = git(repo, 'rev-parse', '--short', 'HEAD');
  const cache = join(root, 'cache');
  mkdirSync(join(cache, 'the-task'), { recursive: true });
  const pkgText = `# Review package\nBase: ${base} · Head: ${head}\n`;
  writeFileSync(join(cache, 'the-task', 'review-input.md'), pkgText);
  const pkg = {
    id: 'pilot-x',
    slug: 'the-task',
    base,
    head,
    cases: [{ id: 'p-x', file: 'src/lib.rs', line: 2, anchorSha256: sha('1 + 1'), packageSha256: sha(pkgText) }],
  };
  return { root, repo, cache, pkg };
}

test('a pilot package is the cached package in a worktree of the checkout at its head', () => {
  const { root, repo, cache, pkg } = pilotRepo();

  const out = prepPilot(pkg, join(root, 'run'), { pilot: repo, cache });

  assert.equal(readFileSync(join(out.copyDir, 'review-input.md'), 'utf8').startsWith('# Review package'), true);
  assert.equal(git(out.copyDir, 'rev-parse', '--short', 'HEAD'), pkg.head);
  assert.deepEqual(out.files, ['src/lib.rs']);
});

test("a pilot case's anchor is found by the hash of its line, wherever the line sits at head", () => {
  const { root, repo, cache, pkg } = pilotRepo();

  const out = prepPilot(pkg, join(root, 'run'), { pilot: repo, cache });

  assert.deepEqual(out.anchors, { 'p-x': 4 });
});

test('a cached package whose hash is not the key\'s is refused, not reviewed', () => {
  const { root, repo, cache, pkg } = pilotRepo();
  writeFileSync(join(cache, 'the-task', 'review-input.md'), '# a different package\n');

  assert.throws(() => prepPilot(pkg, join(root, 'run'), { pilot: repo, cache }), /pilot-x: the cached package is not the one the key names/);
});

test('with no cache or no checkout, the pilot packages are skipped with the reason, not failed', () => {
  const key = { cases: [{ id: 'p-a', package: 'pilot-a', slug: 's', base: 'a', head: 'b', file: 'f', line: 1 }] };

  const { packages, skipped } = pilotPackages(key, { pilot: '/nonexistent/checkout', cache: '/nonexistent/cache' });

  assert.deepEqual(packages, []);
  assert.match(skipped[0], /pilot-a: no checkout at \/nonexistent\/checkout/);
});

test('the snippet packages come from this set, not from bench/review', () => {
  const packages = snippetPackages();

  assert.deepEqual(packages.map((p) => p.id), ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  assert.ok(packages.every((p) => p.seeded.length === 5 && p.clean.length === 1), 'five defects and one correct file each');
});

test('--dry-run builds every snippet package with its patches applied, and dispatches nothing', () => {
  const out = tempDir('hodos-holdout-dry-');

  const run = spawnSync(process.execPath, [INVOKE, '--out', out, '--dry-run', '--pilot', '/nonexistent/checkout'], { encoding: 'utf8' });

  assert.equal(run.status, 0, run.stderr);
  const verdicts = JSON.parse(readFileSync(join(out, 'verdicts.json'), 'utf8'));
  assert.deepEqual(verdicts.packages.map((p) => p.id), ['h1', 'h2', 'h3', 'h4', 'h5', 'h6']);
  assert.ok(existsSync(join(out, 'copies', 'h1', 'orders', 'service.py')), 'a patch-added file is in the copy');
  assert.match(verdicts.skipped[0], /no checkout/);
});

test('a pilot result keeps what the scorer reads and none of the review\'s text — the pilot is not MIT', () => {
  const full = {
    id: 'pilot-ts',
    verdict: 'NEEDS_WORK',
    counts: { blockers: 0, majors: 1, minors: 0 },
    files: ['crates/a/src/lib.rs'],
    anchors: { 'p-x': 287 },
    findings: [{ sev: 'major', file: 'crates/a/src/lib.rs', line: 287, location: '`crates/a/src/lib.rs:287`', item: 'L6 callee contract', trigger: 'a comment between', finding: '`.prev_named_sibling()` stops at the comment', fix: 'walk past extras' }],
    spec: { missing: 'T4 is not met at `crates/a/src/lib.rs:290` and :301 — `fn attach()` drops it', extra: null, misunderstood: null, unclaimed: null },
    coverage: 'the test at lib.rs pins `attach`',
    checks: ['- cargo test: 12 passed'],
    words: { spec: 20, standards: 40, coverage: 8 },
  };

  const kept = redactPilot(full);

  assert.deepEqual(kept.findings, [{ sev: 'major', file: 'crates/a/src/lib.rs', line: 287, item: 'L6 callee contract', trigger: 'kept in pilot-cache' }]);
  assert.deepEqual(kept.spec, { missing: 'crates/a/src/lib.rs:290 :301', extra: null, misunderstood: null, unclaimed: null });
  assert.equal(JSON.stringify(kept).includes('prev_named_sibling'), false);
  assert.equal(JSON.stringify(kept).includes('attach'), false);
  assert.equal(kept.coverage, '');
  assert.deepEqual(kept.checks, []);
  assert.equal(kept.verdict, 'NEEDS_WORK');
});

test("a pilot finding's item keeps the field it names and drops what it quotes of the pilot", () => {
  // Added after the main run (2026-09-30): pilot-rust's reviewer filed its
  // major under the plan field with a sentence of the pilot's plan in quotes,
  // and the item went into verdicts.json as it was.
  const finding = (item) => ({ sev: 'major', file: 'crates/a/src/lib.rs', line: 3, location: 'x', item, trigger: 't', finding: 'f', fix: 'x' });
  const full = { id: 'pilot-rust', findings: [
    finding('plan: Invariants & failure modes ("attributes … as before. Only the five fact fields move")'),
    finding('L6 callee contract of `node.prev_named_sibling()`'),
    finding('L3 boundary blindspot'),
    finding('rules/src-citations.md'),
  ], spec: {} };

  const kept = redactPilot(full);

  assert.deepEqual(kept.findings.map((f) => f.item), ['plan: Invariants & failure modes', 'L6 callee contract of', 'L3 boundary blindspot', 'rules/src-citations.md']);
});
