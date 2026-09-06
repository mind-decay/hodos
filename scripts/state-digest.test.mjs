// Projects are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, utimesSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { digest, compactLine } from './state-digest.mjs';
import { findConfig } from './config.mjs';

const DIGEST = fileURLToPath(new URL('./state-digest.mjs', import.meta.url));

const CAP_CHARS = 300 * 4; // AUTHORING.md §7: 300 tokens, counted as chars/4

function project(config = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-digest-')));
  mkdirSync(join(root, '.git'), { recursive: true });
  mkdirSync(join(root, '.claude', 'hodos', 'tasks'), { recursive: true });
  writeFileSync(
    join(root, '.claude', 'hodos', 'config.json'),
    JSON.stringify({ version: 1, verifiedAt: '2026-08-30', ...config }),
  );
  return root;
}

/** A task directory with a derived state, optionally aged by `ageDays`. */
function task(root, slug, state, ageDays = 0) {
  const dir = join(root, '.claude', 'hodos', 'tasks', slug);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'ledger.md'), `2026-08-30T10:00:00Z ${state.lastEvent ?? 'Init: standard feature'}\n`);
  writeFileSync(join(dir, 'state.json'), JSON.stringify({ slug, phase: 'execute', ...state }));
  if (ageDays > 0) {
    const when = new Date(Date.now() - ageDays * 24 * 60 * 60 * 1000);
    utimesSync(join(dir, 'ledger.md'), when, when);
  }
  return dir;
}

const setActive = (root, slug) => writeFileSync(join(root, '.claude', 'hodos', 'active'), `${slug}\n`);

const run = (root, ...args) => spawnSync(process.execPath, [DIGEST, ...args], { cwd: root, encoding: 'utf8' });

test('no config prints nothing and exits 0', () => {
  const bare = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-nodigest-')));
  const out = run(bare);

  assert.equal(out.status, 0);
  assert.equal(out.stdout, '');
  assert.equal(out.stderr, '');
});

test('one active task prints the two lines of FORMATS.md §12, under the cap', () => {
  const root = project();
  task(root, 'orders-summary', { phase: 'execute', lastEvent: 'Task 1: done (d4e5f6a)' });
  const out = run(root);

  assert.equal(out.status, 0);
  const lines = out.stdout.trimEnd().split('\n');
  assert.equal(lines[0], 'hodos: config verified 2026-08-30 · 1 active task');
  assert.equal(
    lines[1],
    '- orders-summary [execute] last: "Task 1: done (d4e5f6a)" — resume with /hodos:run orders-summary',
  );
  assert.equal(lines.length, 2, 'no campaign line before campaigns.mjs exists (Stage 9)');
  assert.ok(out.stdout.length <= CAP_CHARS, `${out.stdout.length} chars`);
});

test('a task older than staleDays is counted and named as stale', () => {
  const root = project();
  task(root, 'orders-summary', { phase: 'execute', lastEvent: 'Task 1: done (d4e5f6a)' });
  task(root, 'users-export', { phase: 'plan', lastEvent: 'Init: standard feature' }, 21);
  const out = run(root);

  assert.match(out.stdout, /^hodos: config verified 2026-08-30 · 1 active task · 1 stale task$/m);
  assert.match(out.stdout, /^- stale: users-export \(21 days\) — \/hodos:status to fold or delete$/m);
});

test('staleDays comes from the config', () => {
  const root = project({ tasks: { staleDays: 3 } });
  task(root, 'users-export', { phase: 'plan' }, 5);

  assert.match(run(root).stdout, /stale: users-export \(5 days\)/);
});

test('a finished task is neither active nor listed', () => {
  const root = project();
  task(root, 'orders-summary', { phase: 'done', lastEvent: 'Finish: report delivered' });
  const out = run(root);

  assert.equal(out.stdout.trimEnd(), 'hodos: config verified 2026-08-30 · 0 active tasks');
});

test('the bare digest stays under the cap and points at status for the rest', () => {
  const root = project();
  for (let i = 0; i < 30; i += 1) {
    task(root, `task-with-a-fairly-long-slug-${i}`, { phase: 'execute', lastEvent: `Task ${i}: done (d4e5f6a)` });
  }
  const bare = run(root).stdout;
  const full = run(root, '--full').stdout;

  assert.ok(bare.length <= CAP_CHARS, `${bare.length} chars`);
  assert.match(bare, /- … and \d+ more — \/hodos:status$/m);
  assert.ok(full.length > CAP_CHARS, 'the full digest is uncapped');
  assert.equal(full.trimEnd().split('\n').length, 31);
});

test('--compact prints the active task ledger path and the resume instruction', () => {
  const root = project();
  task(root, 'orders-summary', { phase: 'execute', lastEvent: 'Task 1: done (d4e5f6a)' });
  setActive(root, 'orders-summary');
  const out = run(root, '--compact');

  assert.equal(
    out.stdout.trimEnd(),
    'hodos: orders-summary — ledger .claude/hodos/tasks/orders-summary/ledger.md — continue from the first open line',
  );
});

test('--compact with no active task prints nothing', () => {
  const root = project();
  assert.equal(run(root, '--compact').stdout, '');
  assert.equal(compactLine(findConfig(root)), '');
});

test('digest of a notFound config is empty', () => {
  assert.equal(digest({ notFound: true }), '');
});

test('--help exits 0, an unknown option exits 2', () => {
  assert.equal(spawnSync(process.execPath, [DIGEST, '--help'], { encoding: 'utf8' }).status, 0);
  assert.equal(spawnSync(process.execPath, [DIGEST, '--wat'], { encoding: 'utf8' }).status, 2);
});

// --- campaigns (FORMATS.md §12, Stage 9a)

/** A map with one ready node, one blocked, one fog — the digest's example shape. */
function campaign(root, slug, { ready = 1, blocked = 1, fog = 1 } = {}) {
  const dir = join(root, '.claude', 'hodos', 'campaigns');
  mkdirSync(dir, { recursive: true });
  const node = (status, n) => `- [${status}] ${status}-${n} — ${status} node ${n} · deps: — · owner: — · branch: — · ref: — · metric: —`;
  const nodes = [
    ...Array.from({ length: ready }, (_, i) => node('ready', i)),
    ...Array.from({ length: blocked }, (_, i) => node('blocked', i)),
    ...Array.from({ length: fog }, (_, i) => node('fog', i)),
  ];
  writeFileSync(join(dir, `${slug}.md`), `# ${slug}\nStatus: active · Owners: @you\n\n## Nodes\n${nodes.join('\n')}\n\n## Waits\n- the backend — @them, asked 2026-08-27\n`);
}

test('the digest counts the campaigns and prints their frontiers (FORMATS.md §12)', () => {
  const root = project();
  campaign(root, 'state-migration');
  campaign(root, 'mui-cleanup', { ready: 2, blocked: 0, fog: 0 });
  const text = digest(findConfig(root));
  assert.match(text, /· 2 campaigns/);
  assert.match(text, /^- campaigns: mui-cleanup — frontier 2 ready · state-migration — frontier 1 ready \/ 1 blocked \/ 1 fog$/m);
});

test('a project with no maps has no campaign line', () => {
  const text = digest(findConfig(project()));
  assert.doesNotMatch(text, /campaign/);
});

test('--full carries one frontier block per map, for status', () => {
  const root = project();
  campaign(root, 'state-migration');
  const text = digest(findConfig(root), { full: true });
  assert.match(text, /^state-migration: 1 ready \/ 1 blocked \/ 1 fog$/m);
  assert.match(text, /^ready: ready-0 — ready node 0$/m);
  assert.match(text, /^wait: the backend — @them, asked 2026-08-27$/m);
});

test('a cross-repository map says so instead of breaking the digest', () => {
  const root = project();
  campaign(root, 'state-migration');
  const path = join(root, '.claude', 'hodos', 'campaigns', 'state-migration.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace('· metric: —', '· metric: — · repo: api'));
  const text = digest(findConfig(root));
  assert.match(text, /state-migration — cross-repository \(Stage 9b\)/);
});

test('the campaign line stays inside the digest cap', () => {
  const root = project();
  for (let i = 0; i < 12; i += 1) campaign(root, `campaign-number-${i}`, { ready: 3, blocked: 2, fog: 4 });
  const text = digest(findConfig(root));
  assert.ok(text.length <= CAP_CHARS, `digest is ${text.length} chars, cap ${CAP_CHARS}`);
});

// ── The offer line (FORMATS.md §12, decisions 0081 and 0082) ────────────────

/** A real repository on `feat/orders`, one commit ahead of its upstream. */
function gitProject(config = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-offer-')));
  const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  writeFileSync(join(root, 'a.txt'), 'base\n');
  git('add', '-A');
  git('commit', '-qm', 'base');
  // The remote gives origin its fetch refspec, without which git will not map
  // refs/heads/main to refs/remotes/origin/main and @{upstream} does not resolve.
  git('remote', 'add', 'origin', root);
  git('update-ref', 'refs/remotes/origin/main', 'HEAD');
  git('symbolic-ref', 'refs/remotes/origin/HEAD', 'refs/remotes/origin/main');
  git('checkout', '-qb', 'feat/orders');
  writeFileSync(join(root, 'b.txt'), 'work\n');
  git('add', '-A');
  git('commit', '-qm', 'work');
  git('config', 'branch.feat/orders.remote', 'origin');
  git('config', 'branch.feat/orders.merge', 'refs/heads/main');
  mkdirSync(join(root, '.claude', 'hodos', 'tasks'), { recursive: true });
  writeFileSync(
    join(root, '.claude', 'hodos', 'config.json'),
    JSON.stringify({ version: 1, verifiedAt: '2026-08-30', ...config }),
  );
  return root;
}

/** A rule whose one precedent cites `citation` and anchors on `anchor`. */
function rule(root, name, citation, anchor = 'base') {
  const dir = join(root, '.claude', 'rules');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, `${name}.md`),
    `---\ndescription: ${name}\n---\n\n# ${name}\n\nThe rule.\n\n## Precedents\n\n- ${citation} — \`${anchor}\`\n`,
  );
}

test('a project with nothing wrong gets no offer at all', () => {
  const root = project();
  task(root, 'orders-summary', { phase: 'execute', lastEvent: 'Task 1: done (d4e5f6a)' });
  const text = digest(findConfig(root));

  assert.doesNotMatch(text, /offer/);
  assert.equal(text.split('\n').length, 2, text);
});

test('a branch ahead of its upstream with no hodos task offers a review', () => {
  const root = gitProject();
  const text = digest(findConfig(root));

  assert.match(text, /^- offer: review — feat\/orders is 1 commit ahead of origin\/main with no hodos task — \/hodos:review feat\/orders$/m);
});

test('a task on that branch withdraws the review offer', () => {
  const root = gitProject();
  task(root, 'orders-summary', { phase: 'execute', branch: 'feat/orders' });
  const text = digest(findConfig(root));

  assert.doesNotMatch(text, /offer: review/);
});

test('a stale task offers the handoff its own row does not carry', () => {
  const root = project();
  task(root, 'users-export', { phase: 'execute', lastEvent: 'Task 1: started' }, 21);
  const text = digest(findConfig(root));

  assert.match(text, /^- stale: users-export \(21 days\) — \/hodos:status to fold or delete$/m);
  assert.match(text, /^- offer: handoff — users-export has been open 21 days — \/hodos:handoff users-export$/m);
});

test('a precedent that no longer resolves offers the prune', () => {
  const root = project();
  rule(root, 'no-any', 'src/gone.ts:12');
  rule(root, 'also-gone', 'src/vanished.ts:3');
  const text = digest(findConfig(root));

  assert.match(text, /^- offer: prune — 2 rule precedents have rotted — \/hodos:status --prune$/m);
});

test('a precedent that resolves offers nothing', () => {
  const root = project();
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'here.ts'), 'const a = 1;\nconst b = 2;\n');
  rule(root, 'no-any', 'src/here.ts:2', 'const b = 2;');
  const text = digest(findConfig(root));

  assert.doesNotMatch(text, /offer/);
});

test('three preconditions at once print one offer, the transient one', () => {
  const root = gitProject();
  task(root, 'users-export', { phase: 'execute', lastEvent: 'Task 1: started' }, 21);
  rule(root, 'no-any', 'src/gone.ts:12');
  const text = digest(findConfig(root));

  assert.equal(text.match(/- offer:/g).length, 1, text);
  assert.match(text, /- offer: review —/);
});

test('the offer is the first line the cap drops, never a row of state', () => {
  const root = gitProject();
  for (let i = 0; i < 12; i += 1) {
    task(root, `task-number-${i}`, { phase: 'execute', lastEvent: `Task ${i}: done (d4e5f6a)` });
  }
  const text = digest(findConfig(root));

  assert.ok(text.length <= CAP_CHARS, `${text.length} chars`);
  assert.doesNotMatch(text, /offer/);
  assert.match(text, /task-number-0 \[execute\]/);
});


// ── Decay: the layer reports the rot it cannot see from inside a file ────────
// Decision 0078. `config verified <date>` never compared itself to HEAD, so
// the whole reconcile path waited on a developer remembering --refresh exists.

/** A repository with a committed rule layer, `scanSha` at that commit. */
function scannedProject(files) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-decay-')));
  const git = (...args) => spawnSync('git', args, { cwd: root, encoding: 'utf8' });
  git('init', '-q', '-b', 'main');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'test');
  mkdirSync(join(root, 'src'), { recursive: true });
  for (const [rel, content] of Object.entries(files)) writeFileSync(join(root, rel), content);
  mkdirSync(join(root, '.claude', 'hodos', 'tasks'), { recursive: true });
  git('add', '-A');
  git('commit', '-qm', 'the scan');
  const sha = git('rev-parse', 'HEAD').stdout.trim();
  writeFileSync(
    join(root, '.claude', 'hodos', 'config.json'),
    JSON.stringify({ version: 1, verifiedAt: '2026-08-30', scanSha: sha }),
  );
  return { root, git, sha };
}

test('a cited file deleted since the scan is one decay row', () => {
  const { root, git } = scannedProject({ 'src/here.ts': 'const a = 1;\n' });
  rule(root, 'no-any', 'src/here.ts:1', 'const a = 1;');
  git('rm', '-q', 'src/here.ts');
  git('commit', '-qm', 'delete it');
  const text = digest(findConfig(root));

  assert.match(text, /^- decay: 1 cited path renamed or deleted since the scan \([0-9a-f]{7}\) — \/hodos:init --refresh$/m);
});

test('a cited file renamed since the scan counts by the path the rule cites', () => {
  const { root, git } = scannedProject({ 'src/here.ts': 'const a = 1;\n', 'src/other.ts': 'const b = 2;\n' });
  rule(root, 'no-any', 'src/here.ts:1', 'const a = 1;');
  git('mv', 'src/here.ts', 'src/moved.ts');
  git('commit', '-qm', 'rename it');
  const text = digest(findConfig(root));

  assert.match(text, /^- decay: 1 cited path renamed/m);
});

test('a rename of a path nobody cites is not decay', () => {
  const { root, git } = scannedProject({ 'src/here.ts': 'const a = 1;\n', 'src/other.ts': 'const b = 2;\n' });
  rule(root, 'no-any', 'src/here.ts:1', 'const a = 1;');
  git('mv', 'src/other.ts', 'src/elsewhere.ts');
  git('commit', '-qm', 'rename the uncited one');
  const text = digest(findConfig(root));

  assert.doesNotMatch(text, /decay/);
});

test('nothing renamed or deleted prints no decay row at all', () => {
  const { root } = scannedProject({ 'src/here.ts': 'const a = 1;\n' });
  rule(root, 'no-any', 'src/here.ts:1', 'const a = 1;');
  const text = digest(findConfig(root));

  assert.doesNotMatch(text, /decay/);
});

test('a scanSha this repository does not contain prints no row, and no error', () => {
  const { root } = scannedProject({ 'src/here.ts': 'const a = 1;\n' });
  rule(root, 'no-any', 'src/here.ts:1', 'const a = 1;');
  writeFileSync(
    join(root, '.claude', 'hodos', 'config.json'),
    JSON.stringify({ version: 1, verifiedAt: '2026-08-30', scanSha: 'f'.repeat(40) }),
  );
  const out = run(root);

  assert.equal(out.status, 0);
  assert.equal(out.stderr, '');
  assert.doesNotMatch(out.stdout, /decay/);
});

test('a moved anchor is rot the prune offer counts', () => {
  const root = project();
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'here.ts'), 'const a = 1;\nconst b = 2;\n');
  rule(root, 'no-any', 'src/here.ts:1', 'const b = 2;');
  const text = digest(findConfig(root));

  assert.match(text, /^- offer: prune — 1 rule precedent has rotted — \/hodos:status --prune$/m);
});

test('a rot the citation and the anchor both see is counted once in the offer', () => {
  // The shape M1 produced: a deleted line leaves the citation pointing at a
  // blank and the anchor with nowhere to go. `lint --project` reports it once
  // (decision 0078); the offer counted it twice, and said 7 where lint said 5.
  const root = project();
  mkdirSync(join(root, 'src'), { recursive: true });
  writeFileSync(join(root, 'src', 'here.ts'), 'const a = 1;\n\nconst c = 3;\n');
  rule(root, 'one-rot', 'src/here.ts:2', 'const b = 2;');
  const text = digest(findConfig(root));

  assert.match(text, /^- offer: prune — 1 rule precedent has rotted — \/hodos:status --prune$/m);
});

test('two homes of one path in one rule are two rots, not one', () => {
  // The shape M3 produced: `test-mocking-boundary` names the renamed path in
  // its prose and again in `## Precedents`. Both died with the rename, and the
  // dedupe above must not swallow the second — it keys on the rule's own line.
  const root = project();
  mkdirSync(join(root, 'src'), { recursive: true });
  // Line 5 went blank, so the citation is dead in both homes and the anchor is
  // gone: the dedupe fires on the precedent entry and must leave the prose one.
  writeFileSync(join(root, 'src', 'store.ts'), 'const a = 1;\nconst b = 2;\nconst c = 3;\nconst d = 4;\n\n');
  const dir = join(root, '.claude', 'rules');
  mkdirSync(dir, { recursive: true });
  writeFileSync(
    join(dir, 'two-homes.md'),
    '---\ndescription: two homes\n---\n\n# two homes\n\nThe store resets in `src/store.ts:5` and nowhere else.\n\n## Precedents\n\n- `src/store.ts:5` — `beforeEach(() => {`\n',
  );
  const text = digest(findConfig(root));

  assert.match(text, /^- offer: prune — 2 rule precedents have rotted — \/hodos:status --prune$/m);
});
