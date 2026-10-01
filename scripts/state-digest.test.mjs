// Projects are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, utimesSync } from 'node:fs';
import { basename, join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { digest, compactLine } from './state-digest.mjs';
import { tempDir } from './temp-dir.mjs';
import { findConfig } from './config.mjs';

const DIGEST = fileURLToPath(new URL('./state-digest.mjs', import.meta.url));

const CAP_CHARS = 300 * 4; // AUTHORING.md §7: 300 tokens, counted as chars/4

function project(config = {}) {
  const root = tempDir('hodos-digest-');
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
  const bare = tempDir('hodos-nodigest-');
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

test('a node naming another repository is reported like any other (Stage 9b)', () => {
  const root = project();
  campaign(root, 'state-migration');
  const path = join(root, '.claude', 'hodos', 'campaigns', 'state-migration.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace('· metric: —', '· metric: — · repo: api'));
  const text = digest(findConfig(root));
  assert.match(text, /state-migration — frontier 1 ready \/ 1 blocked \/ 1 fog/);
  assert.doesNotMatch(text, /Stage 9b/);
});

test("a map in another repository is a row of this project's digest", () => {
  // The two are siblings, which is what `externalEntry` in the pair seed
  // produces and what `FORMATS.md §2`'s repo-relative path means.
  const home = tempDir('hodos-digest-home-');
  const away = project({ campaigns: { external: [`../${basename(home)}/.claude/hodos/campaigns`] } });
  mkdirSync(join(home, '.git'), { recursive: true });
  campaign(home, 'badge-rollout', { ready: 2, blocked: 0, fog: 1 });

  const text = digest(findConfig(away), { full: true });
  assert.match(text, /- campaigns: badge-rollout — frontier 2 ready \/ 1 fog/);
  assert.match(text, /^badge-rollout: 2 ready \/ 0 blocked \/ 1 fog$/m);
});

test('a node another branch holds is a claimed segment of the row (decision 0135)', () => {
  const root = project();
  campaign(root, 'badge-rollout', { ready: 2, blocked: 0, fog: 0 });
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.invalid', '-c', 'commit.gpgsign=false', ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  const rel = join('.claude', 'hodos', 'campaigns', 'badge-rollout.md');
  git('init', '-b', 'main');
  git('add', '--', '.');
  git('commit', '-m', 'chore: the map');
  git('checkout', '--quiet', '-b', 'feature/ready-1');
  writeFileSync(
    join(root, rel),
    readFileSync(join(root, rel), 'utf8').replace(
      '- [ready] ready-1 — ready node 1 · deps: — · owner: — · branch: —',
      '- [active] ready-1 — ready node 1 · deps: — · owner: @ada · branch: feature/ready-1',
    ),
  );
  git('commit', '--quiet', '-a', '-m', 'chore: claim ready-1');
  git('checkout', '--quiet', 'main');

  const text = digest(findConfig(root), { full: true });
  assert.match(text, /- campaigns: badge-rollout — frontier 1 ready \/ 1 claimed/);
  assert.match(text, /^claimed: ready-1 — ready node 1 · owner: @ada · branch: feature\/ready-1$/m);
});

test('the campaign line stays inside the digest cap', () => {
  const root = project();
  for (let i = 0; i < 12; i += 1) campaign(root, `campaign-number-${i}`, { ready: 3, blocked: 2, fog: 4 });
  const text = digest(findConfig(root));
  assert.ok(text.length <= CAP_CHARS, `digest is ${text.length} chars, cap ${CAP_CHARS}`);
});

// ── The fetch (decisions 0080, 0138) ───────────────────────────────────────

/**
 * A project whose `origin` is a bare clone that has gained a branch since the
 * copy was made — the claim of `map.md §6` step 4, committed by somebody else
 * and pushed. Only a fetch brings it into this repository's refs.
 */
function withOrigin({ ready = 2 } = {}) {
  const root = project();
  campaign(root, 'badge-rollout', { ready, blocked: 0, fog: 0 });
  const rel = join('.claude', 'hodos', 'campaigns', 'badge-rollout.md');
  const git = (cwd, ...args) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.invalid', '-c', 'commit.gpgsign=false', ...args], {
      cwd,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  git(root, 'init', '-b', 'main');
  git(root, 'add', '--', '.');
  git(root, 'commit', '-m', 'chore: the map');

  // A directory of its own: two tests in this file seed a pair, and one of
  // them removes its origin.
  const bare = join(tempDir('hodos-origin-'), 'origin.git');
  git(root, 'clone', '--quiet', '--bare', root, bare);
  git(root, 'remote', 'add', 'origin', bare);

  // The claim is made in a clone of the origin, so this copy holds neither the
  // commit nor a remote-tracking ref for it until it fetches.
  const clone = tempDir('hodos-claimer-');
  git(clone, 'clone', '--quiet', bare, clone);
  git(clone, 'checkout', '--quiet', '-b', 'feature/ready-1');
  writeFileSync(
    join(clone, rel),
    readFileSync(join(clone, rel), 'utf8').replace(
      '- [ready] ready-1 — ready node 1 · deps: — · owner: — · branch: —',
      '- [active] ready-1 — ready node 1 · deps: — · owner: @ada · branch: feature/ready-1',
    ),
  );
  git(clone, 'commit', '--quiet', '-a', '-m', 'chore: claim ready-1');
  git(clone, 'push', '--quiet', 'origin', 'feature/ready-1');
  return { root, bare, refs: () => git(root, 'for-each-ref', '--format=%(refname)').trim() };
}

test('--fetch updates the refs, changes nothing else, and the claim is reported', () => {
  const { root, refs } = withOrigin();
  const before = refs();
  const out = run(root, '--full', '--fetch');

  assert.equal(out.status, 0);
  assert.match(out.stdout, /claimed: ready-1 — ready node 1 · owner: @ada · branch: feature\/ready-1/);
  assert.match(out.stdout, /- campaigns: badge-rollout — frontier 1 ready \/ 1 claimed/);
  assert.doesNotMatch(out.stdout, /fetch failed/);

  assert.notEqual(refs(), before);
  assert.match(refs(), /refs\/remotes\/origin\/feature\/ready-1/);
  // The fetch updates remote-tracking refs and nothing else (decision 0080).
  assert.equal(
    execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }),
    '',
  );
});

test('a fetch that cannot run says the map is as of the last pull, and reports it anyway', () => {
  const { root, bare } = withOrigin();
  rmSync(bare, { recursive: true, force: true });
  const out = run(root, '--full', '--fetch');

  assert.equal(out.status, 0);
  assert.match(out.stdout, /^- fetch failed — the map is as of your last pull/m);
  assert.match(out.stdout, /- campaigns: badge-rollout — frontier 2 ready/);
  assert.match(out.stdout, /^ready: ready-1 — ready node 1$/m);
});

test('a repository with no remote at all says the same thing (decision 0080)', () => {
  const root = project();
  campaign(root, 'badge-rollout', { ready: 1, blocked: 0, fog: 0 });
  execFileSync('git', ['init', '-b', 'main'], { cwd: root, encoding: 'utf8' });
  const out = run(root, '--full', '--fetch');
  assert.equal(out.status, 0);
  assert.match(out.stdout, /fetch failed — the map is as of your last pull/);
});

test('without the flag nothing reaches the network, and no ref moves', () => {
  const { root, refs } = withOrigin();
  const before = refs();
  const out = run(root);

  assert.equal(out.status, 0);
  assert.equal(refs(), before);
  assert.doesNotMatch(out.stdout, /origin/);
  assert.doesNotMatch(out.stdout, /fetch/);
  assert.match(out.stdout, /- campaigns: badge-rollout — frontier 2 ready/);
});

test('--help names the flag, and an unknown one is still exit 2', () => {
  const help = run(project(), '--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--fetch/);
  assert.equal(run(project(), '--nonsense').status, 2);
});

// ── The offer line (FORMATS.md §12, decisions 0081 and 0082) ────────────────

/** A real repository on `feat/orders`, one commit ahead of its upstream. */
function gitProject(config = {}) {
  const root = tempDir('hodos-offer-');
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

// Decision 0179: the offer says *open*, and a done task is not open. Its
// directory is still named by the stale row, whose "fold or delete" is right.
test('a stale task that is done gets its stale row and no handoff offer', () => {
  const root = project();
  task(root, 'api-surface-diff-caps', { phase: 'done', lastEvent: 'Finish: report delivered' }, 19);
  const text = digest(findConfig(root));

  assert.match(text, /^- stale: api-surface-diff-caps \(19 days\) — \/hodos:status to fold or delete$/m);
  assert.doesNotMatch(text, /offer: handoff/);
});

test('with a done stale task first, the handoff offer names the open one', () => {
  const root = project();
  task(root, 'a-done-task', { phase: 'done', lastEvent: 'Finish: report delivered' }, 30);
  task(root, 'users-export', { phase: 'execute', lastEvent: 'Task 1: started' }, 21);
  const text = digest(findConfig(root));

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
  const root = tempDir('hodos-decay-');
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

// The digest log is gone — decision 0141. It measured the share of session
// starts whose digest was byte-identical to that project's previous one:
// 6 of 27 comparable starts on the pilot, 22.2 %, under the one half at which
// suppression was to be built. So nothing is built, and the instrument goes
// with its measurement recorded in docs/PILOT.md §7.

const logPath = (root) => join(root, '.claude', 'hodos', '.digest-log');

test('a bare emission writes no log (decision 0141, below its half)', () => {
  const root = project();
  task(root, 'orders-summary', { phase: 'execute', lastEvent: 'Task 1: done (d4e5f6a)' });
  const out = spawnSync(process.execPath, [DIGEST], {
    cwd: root,
    encoding: 'utf8',
    env: { ...process.env, CLAUDE_CODE_SESSION_ID: 'aaaa1111-bbbb-2222-cccc-333344445555' },
  });

  assert.equal(out.status, 0);
  assert.match(out.stdout, /orders-summary/);
  assert.equal(existsSync(logPath(root)), false);
});

test('a log a pilot project still carries is left exactly as it was', () => {
  const root = project();
  mkdirSync(join(root, '.claude', 'hodos'), { recursive: true });
  const before = 'abc\t2026-09-20T10:00:00.000Z\ts1\n';
  writeFileSync(logPath(root), before);

  assert.equal(run(root).status, 0);
  assert.equal(readFileSync(logPath(root), 'utf8'), before);
});
