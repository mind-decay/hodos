// Fixtures are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { anchors, citations, verifyAnchors, verifyFile } from './verify-citations.mjs';

const VERIFY = fileURLToPath(new URL('./verify-citations.mjs', import.meta.url));

function tree(files) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-cite-')));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

const SOURCE = ['const a = 1;', 'const b = 2;', '', 'export const c = 3;', ''].join('\n');
// lines:      1               2               3(blank) 4

const rule = (body) => `# A rule\n\n${body}\n`;

test('a citation that exists and is not blank resolves', () => {
  const root = tree({ 'src/a.ts': SOURCE, 'rule.md': rule('Precedent: src/a.ts:1 and src/a.ts:1-2.') });

  assert.deepEqual(verifyFile(join(root, 'rule.md'), root), []);
});

test('a missing file, an out-of-range line and a blank line are all reported', () => {
  const root = tree({
    'src/a.ts': SOURCE,
    'rule.md': rule('See src/gone.ts:3, src/a.ts:99 and src/a.ts:3.'),
  });
  const dead = verifyFile(join(root, 'rule.md'), root);

  assert.deepEqual(
    dead.map((d) => [d.raw, d.reason]),
    [
      ['src/gone.ts:3', 'no such file'],
      ['src/a.ts:99', 'the file has 4 lines'],
      ['src/a.ts:3', 'that line is blank'],
    ],
  );
});

test('a range whose end is past the file is reported', () => {
  const root = tree({ 'src/a.ts': SOURCE, 'rule.md': rule('See src/a.ts:2-40.') });

  assert.equal(verifyFile(join(root, 'rule.md'), root)[0].reason, 'the file has 4 lines');
});

test('branch names, member access, versions and URLs are not citations', () => {
  const text = [
    'Branch feature/x-1.2 is merged.',
    'It calls ctx.spy and obj.a.b.',
    'See http://localhost:5173 and https://example.com:8080/x.',
    'FORMATS.md §6 and vite@5.1.2 stay out of it.',
  ].join('\n');

  assert.deepEqual(citations(text), []);
});

test('the detector finds a citation in prose, in a table cell and in backticks', () => {
  const found = citations('Precedent `src/a.ts:12` | src/b.tsx:3-9 | see scripts/lint.mjs:20.');

  assert.deepEqual(
    found.map((c) => [c.path, c.start, c.end]),
    [
      ['src/a.ts', 12, 12],
      ['src/b.tsx', 3, 9],
      ['scripts/lint.mjs', 20, 20],
    ],
  );
});

test('the CLI exits 1 and lists the dead citations', () => {
  const root = tree({ 'src/a.ts': SOURCE, 'rule.md': rule('See src/a.ts:3.') });
  const out = spawnSync(process.execPath, [VERIFY, join(root, 'rule.md'), '--root', root], { encoding: 'utf8' });

  assert.equal(out.status, 1);
  assert.match(out.stdout, /src\/a\.ts:3 — that line is blank/);
  assert.match(out.stdout, /citations: 1 of 1 do not resolve/);
});

test('the CLI exits 0 and counts what it checked', () => {
  const root = tree({ 'src/a.ts': SOURCE, 'rule.md': rule('See src/a.ts:1 and src/a.ts:4.') });
  const out = spawnSync(process.execPath, [VERIFY, join(root, 'rule.md'), '--root', root], { encoding: 'utf8' });

  assert.equal(out.status, 0);
  assert.match(out.stdout, /citations: 2 resolve/);
});

test('without --root the citations resolve against the git root above the file', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    'src/a.ts': SOURCE,
    '.claude/rules/http.md': rule('See src/a.ts:1.'),
  });
  const out = spawnSync(process.execPath, [VERIFY, join(root, '.claude/rules/http.md')], { encoding: 'utf8' });

  assert.equal(out.status, 0, out.stdout);
});

test('--help exits 0; no file exits 2', () => {
  assert.equal(spawnSync(process.execPath, [VERIFY, '--help'], { encoding: 'utf8' }).status, 0);
  assert.equal(spawnSync(process.execPath, [VERIFY], { encoding: 'utf8' }).status, 2);
});

test('a range that runs backwards is reported', () => {
  const root = tree({ 'src/a.ts': SOURCE, 'rule.md': rule('See src/a.ts:4-1.') });

  assert.equal(verifyFile(join(root, 'rule.md'), root)[0].reason, 'the range runs backwards');
});

test('a range whose every line is blank is reported, an internal blank is not', () => {
  const text = ['const a = 1;', '', '', 'export const c = 3;', ''].join('\n');
  const root = tree({ 'src/a.ts': text, 'rule.md': rule('Blank: src/a.ts:2-3. Spanning: src/a.ts:1-4.') });
  const dead = verifyFile(join(root, 'rule.md'), root);

  assert.equal(dead.length, 1, 'a blank line inside a span is ordinary code, not a dead citation');
  assert.equal(dead[0].raw, 'src/a.ts:2-3');
  assert.equal(dead[0].reason, 'those lines are blank');
});

// Decision 0078: a precedent carries the text of the line it cites, so the
// check can say where the code went instead of only that the line is not blank.

const MOVED = ['', '', '', '', '', '', '', '', '', '', ...SOURCE.split('\n')].join('\n');
// The same four lines, ten blank lines above them: `const a = 1;` is now line 11.

const precedents = (entries) => `# A rule\n\nThe rule.\n\n## Precedents\n${entries.join('\n')}\n`;

test('an anchor sitting at its cited line is not a finding', () => {
  const root = tree({
    'src/a.ts': SOURCE,
    'rule.md': precedents(['- src/a.ts:1 — `const a = 1;`', '- src/a.ts:4 — `export const c = 3;`']),
  });

  assert.deepEqual(verifyAnchors(join(root, 'rule.md'), root), []);
});

test('an anchor that moved names the line it is now on, and offers it as a re-point', () => {
  const root = tree({ 'src/a.ts': MOVED, 'rule.md': precedents(['- src/a.ts:1 — `const a = 1;`']) });

  const [finding] = verifyAnchors(join(root, 'rule.md'), root);
  assert.equal(finding.raw, 'src/a.ts:1');
  assert.equal(finding.reason, 'the anchor is now at line 11');
  assert.equal(finding.movedTo, 11);
});

test('an anchor deleted from the file offers no re-point', () => {
  const root = tree({
    'src/a.ts': ['const b = 2;', '', 'export const c = 3;', ''].join('\n'),
    'rule.md': precedents(['- src/a.ts:1 — `const a = 1;`']),
  });

  const [finding] = verifyAnchors(join(root, 'rule.md'), root);
  assert.equal(finding.reason, 'the anchor is gone from the file');
  assert.equal(finding.movedTo, undefined);
});

test('a range entry anchors on its first line and reports where that line went', () => {
  const root = tree({ 'src/a.ts': MOVED, 'rule.md': precedents(['- src/a.ts:1-2 — `const a = 1;`']) });

  const [finding] = verifyAnchors(join(root, 'rule.md'), root);
  assert.equal(finding.raw, 'src/a.ts:1-2');
  assert.equal(finding.movedTo, 11);
});

test('a re-indented anchor still resolves: both sides are trimmed', () => {
  const root = tree({
    'src/a.ts': ['    const a = 1;', 'const b = 2;', ''].join('\n'),
    'rule.md': precedents(['- src/a.ts:1 — `const a = 1;`']),
  });

  assert.deepEqual(verifyAnchors(join(root, 'rule.md'), root), []);
});

test('an anchor matching several lines names the count and re-points to none of them', () => {
  const root = tree({
    'src/a.ts': ['const b = 2;', 'const a = 1;', 'const a = 1;', ''].join('\n'),
    'rule.md': precedents(['- src/a.ts:1 — `const a = 1;`']),
  });

  const [finding] = verifyAnchors(join(root, 'rule.md'), root);
  assert.equal(finding.reason, 'the anchor matches 2 lines (2, 3) — re-point by hand');
  assert.equal(finding.movedTo, undefined);
});

test('a bullet outside the ## Precedents block is not an anchor', () => {
  const root = tree({
    'src/a.ts': MOVED,
    'rule.md': `# A rule\n\n- src/a.ts:1 — \`const a = 1;\`\n\n## Migration\n- src/a.ts:1 — \`const a = 1;\`\n`,
  });

  assert.deepEqual(anchors(readFileSync(join(root, 'rule.md'), 'utf8')), []);
  assert.deepEqual(verifyAnchors(join(root, 'rule.md'), root), []);
});

test('a dead citation inside the block is reported once, by the line check', () => {
  const root = tree({ 'src/a.ts': SOURCE, 'rule.md': precedents(['- src/gone.ts:1 — `const a = 1;`']) });

  assert.equal(verifyFile(join(root, 'rule.md'), root).length, 1);
  assert.deepEqual(verifyAnchors(join(root, 'rule.md'), root), []);
});

test('the CLI reports a moved anchor, counts the anchors it checked, and exits 1', () => {
  const root = tree({ 'src/a.ts': MOVED, 'rule.md': precedents(['- src/a.ts:1 — `const a = 1;`']) });

  const run = spawnSync(process.execPath, [VERIFY, 'rule.md'], { cwd: root, encoding: 'utf8' });
  assert.equal(run.status, 1);
  assert.match(run.stdout, /rule\.md:6: src\/a\.ts:1 — the anchor is now at line 11\n/);
  assert.match(run.stdout, /anchors: 1 of 1 moved or gone\n/);
});

test('a file whose anchors all resolve says so, and a file with none says nothing about them', () => {
  const root = tree({
    'src/a.ts': SOURCE,
    'anchored.md': precedents(['- src/a.ts:1 — `const a = 1;`']),
    'plain.md': rule('Precedent: src/a.ts:1.'),
  });

  const anchored = spawnSync(process.execPath, [VERIFY, 'anchored.md'], { cwd: root, encoding: 'utf8' });
  assert.equal(anchored.status, 0);
  assert.match(anchored.stdout, /anchors: 1 resolve\n/);

  const plain = spawnSync(process.execPath, [VERIFY, 'plain.md'], { cwd: root, encoding: 'utf8' });
  assert.equal(plain.status, 0);
  assert.doesNotMatch(plain.stdout, /anchors/);
});

test('the citation may be backticked, as a rule written by init has it', () => {
  const root = tree({
    'src/a.ts': SOURCE,
    'rule.md': precedents(['- `src/a.ts:1` — `const a = 1;`']),
  });

  assert.equal(anchors(readFileSync(join(root, 'rule.md'), 'utf8')).length, 1);
  assert.deepEqual(verifyAnchors(join(root, 'rule.md'), root), []);
});

test('an anchor carrying a backtick of its own is wrapped in two', () => {
  const line = 'const url = `/orders/${id}`;';
  const root = tree({
    'src/a.ts': `${line}\nconst b = 2;\n`,
    'rule.md': precedents([`- src/a.ts:1 — \`\`${line}\`\``]),
  });

  assert.deepEqual(verifyAnchors(join(root, 'rule.md'), root), []);
});
