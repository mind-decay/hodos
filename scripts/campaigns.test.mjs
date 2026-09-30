// Maps are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseMap, parseNodeLine, rewriteNode } from './campaigns.mjs';

const CAMPAIGNS = fileURLToPath(new URL('./campaigns.mjs', import.meta.url));

/**
 * The map of FORMATS.md §11, verbatim. Every node line of the specification is
 * here, including the two — `blocked` with `by:`, `dropped` — the grammar makes
 * optional, because the round-trip criterion is about the lines nobody thought
 * about, not the canonical one.
 */
export const MAP = `# State migration — Redux → TanStack Query + zustand
Status: active · Owners: @you, @teammate · Tracker: SHOP-1042
Home: shop.example/Shop.Web/spa

## Done-metrics
| Metric | Command | Start | Target | Current (date) |
|---|---|---|---|---|
| redux slices | \`grep -rl createSlice src \\| wc -l\` | 24 | 0 | 9 (2026-08-28) |
| connect() usages | \`grep -rn "connect(" src \\| wc -l\` | 96 | 0 | 31 (2026-08-28) |

## Decisions
| # | Decision | Why |
|---|---|---|
| D1 | Server state → TanStack Query; client-only → zustand; URL → nuqs | … |
| D2 | Migrate per feature slice, expand–contract; no big-bang | … |

## Nodes
- [done] orders-list — orders list to TanStack · deps: — · owner: @you · branch: feature/orders-list · ref: sha:a1b2c3d · metric: slices 24→21
- [active] orders-summary — summary widget · deps: orders-list · owner: @you · branch: feature/orders-summary · ref: task:orders-summary · metric: —
- [ready] users-list — users list to TanStack · deps: — · owner: — · branch: — · ref: — · metric: —
- [blocked] billing — billing screens · deps: — · owner: — · branch: — · ref: — · metric: — · by: backend billing API (SHOP-1049)
- [fog] reporting-page — depends on whether reports move to the new backend · deps: — · owner: — · branch: — · ref: — · metric: —
- [dropped] legacy-export — out of scope, D3 · deps: — · owner: — · branch: — · ref: — · metric: —

## Waits
- backend billing API — @backend-team, asked 2026-08-27
`;

export function mapDir(text = MAP, slug = 'state-migration') {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-camp-')));
  mkdirSync(join(root, '.git'), { recursive: true });
  mkdirSync(join(root, '.claude', 'hodos', 'campaigns'), { recursive: true });
  writeFileSync(join(root, '.claude', 'hodos', 'config.json'), JSON.stringify({ version: 1 }));
  writeFileSync(join(root, '.claude', 'hodos', 'campaigns', `${slug}.md`), text);
  return root;
}

// --- the node line (FORMATS.md §11)

test('every node line of FORMATS.md §11 parses into its fields', () => {
  const map = parseMap(MAP);
  assert.deepEqual(
    map.nodes.map((n) => n.status),
    ['done', 'active', 'ready', 'blocked', 'fog', 'dropped'],
  );
  const [done, active, , blocked] = map.nodes;
  assert.equal(done.name, 'orders-list');
  assert.equal(done.gist, 'orders list to TanStack');
  assert.equal(done.fields.ref, 'sha:a1b2c3d');
  assert.equal(done.fields.metric, 'slices 24→21');
  assert.deepEqual(done.deps, []); // an em dash is the empty value, not a dependency
  assert.deepEqual(active.deps, ['orders-list']);
  assert.equal(blocked.fields.by, 'backend billing API (SHOP-1049)');
});

test('a gist may hold an em dash; the name is the kebab token before the first one', () => {
  const node = parseNodeLine(
    '- [fog] reporting-page — reports — the ones finance reads — move or not · deps: — · owner: —',
  );
  assert.equal(node.name, 'reporting-page');
  assert.equal(node.gist, 'reports — the ones finance reads — move or not');
});

test('an unknown key is kept, in place, with its value', () => {
  const node = parseNodeLine('- [ready] x — y · deps: — · tracker: SHOP-1 · owner: @a');
  assert.equal(node.fields.tracker, 'SHOP-1');
  assert.deepEqual(node.keys, ['deps', 'tracker', 'owner']);
});

test('a line that is not a node line is not one', () => {
  assert.equal(parseNodeLine('- backend billing API — @backend-team, asked 2026-08-27'), null);
  assert.equal(parseNodeLine('## Nodes'), null);
});

// --- the round trip (BUILD-PLAN.md Stage 9a, criterion 2)

test('parse → rewrite one field → serialise differs in exactly that field', () => {
  const after = rewriteNode(MAP, 'users-list', { owner: '@teammate' });
  const before = MAP.split('\n');
  const now = after.split('\n');
  assert.equal(before.length, now.length);
  const changed = before.map((line, i) => [i, line, now[i]]).filter(([, a, b]) => a !== b);
  assert.equal(changed.length, 1, `expected one changed line, got ${changed.length}`);
  assert.equal(
    changed[0][2],
    '- [ready] users-list — users list to TanStack · deps: — · owner: @teammate · branch: — · ref: — · metric: —',
  );
});

test('a rewrite keeps the fields it was not told to change, unknown keys included', () => {
  const text = '## Nodes\n- [ready] x — y · deps: — · tracker: SHOP-1 · owner: — · branch: —\n';
  const after = rewriteNode(text, 'x', { status: 'active', owner: '@you' });
  assert.equal(after, '## Nodes\n- [ready] x — y · deps: — · tracker: SHOP-1 · owner: @you · branch: —\n'.replace('[ready]', '[active]'));
});

test('a field the line does not carry is inserted in the order FORMATS.md §11 gives', () => {
  const text = '## Nodes\n- [ready] x — y · deps: —\n';
  const after = rewriteNode(text, 'x', { branch: 'feature/x', ref: 'task:x' });
  assert.equal(after, '## Nodes\n- [ready] x — y · deps: — · branch: feature/x · ref: task:x\n');
});

test('a rewrite of a name no node carries is an error, not a silent no-op', () => {
  assert.throws(() => rewriteNode(MAP, 'no-such-node', { owner: '@you' }), /no-such-node/);
});

test('every line outside the Nodes list survives a rewrite byte for byte', () => {
  const after = rewriteNode(MAP, 'billing', { status: 'ready' });
  const region = (text) => text.slice(0, text.indexOf('## Nodes')) + text.slice(text.indexOf('## Waits'));
  assert.equal(region(after), region(MAP));
});

// --- the header and the metrics table

test('the header block and the done-metrics table parse', () => {
  const map = parseMap(MAP);
  assert.equal(map.title, 'State migration — Redux → TanStack Query + zustand');
  assert.equal(map.header.Status, 'active');
  assert.equal(map.header.Owners, '@you, @teammate');
  assert.equal(map.metrics.length, 2);
  assert.equal(map.metrics[0].metric, 'redux slices');
  assert.equal(map.metrics[0].command, 'grep -rl createSlice src | wc -l');
  assert.equal(map.metrics[0].current, '9 (2026-08-28)');
  assert.equal(map.metrics[0].repo, null);
});

test('a metric row may name another repository (FORMATS.md §11)', () => {
  const map = parseMap(MAP.replace('| 24 | 0 |', '· repo: api | 24 | 0 |'));
  assert.equal(map.metrics[0].repo, 'api');
  assert.equal(map.metrics[0].command, 'grep -rl createSlice src | wc -l');
});

test('--help exits 0 and names every command', async () => {
  const { spawnSync } = await import('node:child_process');
  const run = spawnSync(process.execPath, [CAMPAIGNS, '--help'], { encoding: 'utf8' });
  assert.equal(run.status, 0);
  for (const command of ['find', 'frontier', 'claim', 'node-done', 'measure']) {
    assert.match(run.stdout, new RegExp(`\\b${command}\\b`));
  }
});

// --- find: the lookup, and where it stops (criteria 5, 6)

import { findMaps } from './campaigns.mjs';
import { spawnSync } from 'node:child_process';

const run = (args, cwd) => spawnSync(process.execPath, [CAMPAIGNS, ...args], { cwd, encoding: 'utf8' });

/** A root with `.git` and a nested subproject that has its own config. */
function monorepo() {
  const root = mapDir();
  const web = join(root, 'web');
  mkdirSync(join(web, '.claude', 'hodos'), { recursive: true });
  writeFileSync(join(web, '.claude', 'hodos', 'config.json'), JSON.stringify({ version: 1 }));
  return { root, web };
}

test('a session in a subproject finds the root map (one repository, one .git)', () => {
  const { root, web } = monorepo();
  const found = findMaps(web);
  assert.deepEqual(found.map((m) => m.slug), ['state-migration']);
  assert.equal(found[0].path, join(root, '.claude', 'hodos', 'campaigns', 'state-migration.md'));

  const cli = run(['find'], web);
  assert.equal(cli.status, 0);
  assert.match(cli.stdout, /state-migration/);
});

test('a subproject map comes before the root map it sits under', () => {
  const { root, web } = monorepo();
  mkdirSync(join(web, '.claude', 'hodos', 'campaigns'), { recursive: true });
  writeFileSync(join(web, '.claude', 'hodos', 'campaigns', 'mui-cleanup.md'), '# MUI cleanup\n\n## Nodes\n');
  assert.deepEqual(findMaps(web).map((m) => m.slug), ['mui-cleanup', 'state-migration']);
  assert.equal(findMaps(root).length, 1);
});

test('no maps is not an error — status calls find on every project', () => {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-camp-')));
  mkdirSync(join(root, '.git'), { recursive: true });
  assert.deepEqual(findMaps(root), []);
  const cli = run(['find'], root);
  assert.equal(cli.status, 0);
  assert.equal(cli.stdout, '');
});

/**
 * Two sibling repositories, each config naming the other's `campaigns/`
 * directory the way `FORMATS.md §2` says — repo-relative, resolved at the git
 * root. This is the shape `bench/scripts/pair-seed.mjs` seeds; the engine's own
 * tests build it themselves so that they depend on no bench file.
 */
function pair({ homeMap = MAP, awayMap = null, external = '../home/.claude/hodos/campaigns' } = {}) {
  const ws = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-pair-')));
  const repo = (name, config, maps) => {
    const root = join(ws, name);
    mkdirSync(join(root, '.git'), { recursive: true });
    mkdirSync(join(root, '.claude', 'hodos', 'campaigns'), { recursive: true });
    writeFileSync(join(root, '.claude', 'hodos', 'config.json'), JSON.stringify(config));
    for (const [slug, text] of Object.entries(maps)) {
      writeFileSync(join(root, '.claude', 'hodos', 'campaigns', `${slug}.md`), text);
    }
    return root;
  };
  const home = repo('home', { version: 1 }, { 'state-migration': homeMap });
  const away = repo(
    'away',
    { version: 1, campaigns: { external: external === null ? [] : [external] } },
    awayMap === null ? {} : { 'away-cleanup': awayMap },
  );
  return { ws, home, away };
}

test('a session in the external repository finds the home map through external[]', () => {
  const { home, away } = pair();
  const found = findMaps(away);
  assert.deepEqual(found.map((m) => m.slug), ['state-migration']);
  assert.equal(found[0].path, join(home, '.claude', 'hodos', 'campaigns', 'state-migration.md'));
  // `dir` addresses `.claude/hodos/`; `root` is the repository a command runs
  // in, which is the anchor of decision 0075 and not the config's directory.
  assert.equal(found[0].dir, home);
  assert.equal(found[0].root, home);

  const cli = run(['find'], away);
  assert.equal(cli.status, 0);
  assert.match(cli.stdout, /state-migration/);
});

test("the walk's own maps come first, then external[] in the order it names them", () => {
  const { away } = pair({ awayMap: MAP.replace('# State migration', '# Away cleanup') });
  assert.deepEqual(findMaps(away).map((m) => m.slug), ['away-cleanup', 'state-migration']);
});

test('an external entry nothing is checked out at is skipped, and find says which', () => {
  const { away } = pair({ external: '../nowhere/.claude/hodos/campaigns' });
  assert.deepEqual(findMaps(away), []);
  const cli = run(['find'], away);
  assert.equal(cli.status, 0);
  assert.equal(cli.stdout, '');
  assert.match(cli.stderr, /nowhere/);
});

test('an external repository that keeps no maps of its own is silent', () => {
  // The normal state of the pair read from the home side: the map lives here,
  // and the entry names the other checkout so that a `repo:` name resolves.
  const { home } = pair();
  const path = join(home, '.claude', 'hodos', 'config.json');
  writeFileSync(path, JSON.stringify({ version: 1, campaigns: { external: ['../away/.claude/hodos/campaigns'] } }));
  const cli = run(['find'], home);
  assert.equal(cli.status, 0);
  assert.equal(cli.stderr, '');
  assert.match(cli.stdout, /state-migration/);
});

test('a node carrying repo: is acted on, not stopped (the 9a stop is gone)', () => {
  const { away } = pair({ homeMap: MAP.replace('· metric: — · by:', '· metric: — · repo: api · by:') });
  const frontierRun = run(['frontier', 'state-migration'], away);
  assert.equal(frontierRun.status, 0);
  assert.match(frontierRun.stdout, /blocked: billing/);
  assert.doesNotMatch(frontierRun.stderr, /Stage 9b/);

  const setRun = run(['set', 'state-migration', 'users-list', '--owner', '@you'], away);
  assert.equal(setRun.status, 0);
  assert.match(setRun.stdout, /owner: @you/);
});

test('a metric row carrying repo: no longer stops the command either', () => {
  const { away } = pair({ homeMap: MAP.replace('| 24 | 0 |', '· repo: api | 24 | 0 |') });
  const cli = run(['frontier', 'state-migration'], away);
  assert.equal(cli.status, 0);
  assert.doesNotMatch(cli.stderr, /Stage 9b/);
});

test('a slug two repositories both carry resolves to the nearer one', () => {
  const { away } = pair({ awayMap: MAP });
  const path = join(away, '.claude', 'hodos', 'campaigns', 'state-migration.md');
  writeFileSync(path, MAP.replace('users-list', 'away-only-node'));
  const cli = run(['frontier', 'state-migration'], away);
  assert.equal(cli.status, 0);
  assert.match(cli.stdout, /away-only-node/);
});

test('frontier on a slug no map carries exits 1 and says so', () => {
  const root = mapDir();
  const cli = run(['frontier', 'no-such-campaign'], root);
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /no-such-campaign/);
});

// --- claims by branch (decision 0135)

import { claimsOnRefs, formatFrontier, frontier, refsOf, shortCounts } from './campaigns.mjs';
import { execFileSync } from 'node:child_process';

const SLUG_PATH = join('.claude', 'hodos', 'campaigns', 'state-migration.md');

/**
 * A real repository whose map is `[ready] users-list` on `main` and
 * `[active] … @teammate` on a branch — the shape `map.md §6` step 4 leaves
 * before a merge, and the one no working-tree read can see.
 */
function claimedRepo({ node = 'users-list', claimed = true, remote = false } = {}) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-claim-')));
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.invalid', '-c', 'commit.gpgsign=false', ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  mkdirSync(join(root, '.claude', 'hodos', 'campaigns'), { recursive: true });
  writeFileSync(join(root, '.claude', 'hodos', 'config.json'), JSON.stringify({ version: 1 }));
  writeFileSync(join(root, SLUG_PATH), MAP);
  git('init', '-b', 'main');
  git('add', '--', '.');
  git('commit', '-m', 'chore: the map');
  if (claimed) {
    git('checkout', '--quiet', '-b', `feature/${node}`);
    writeFileSync(
      join(root, SLUG_PATH),
      rewriteNode(MAP, node, { status: 'active', owner: '@teammate', branch: `feature/${node}` }),
    );
    git('commit', '--quiet', '-a', '-m', `chore: claim ${node}`);
    git('checkout', '--quiet', 'main');
    if (remote) {
      // The state a fetch leaves: the claim is on a remote-tracking ref and on
      // no branch of this copy, which is what `/hodos:status` reads (0080).
      const sha = git('rev-parse', `feature/${node}`).trim();
      git('update-ref', `refs/remotes/origin/feature/${node}`, sha);
      git('branch', '--quiet', '-D', `feature/${node}`);
    }
  }
  return root;
}

test('a claim committed on another branch is read from the refs', () => {
  const root = claimedRepo();
  const claims = claimsOnRefs(join(root, SLUG_PATH), { root });
  // The read reports every claim the refs carry, `orders-summary` included —
  // it is `[active] @you` in the map on every branch. Which of them is news to
  // this session is the frontier's judgement, not this function's.
  assert.deepEqual([...claims.keys()].sort(), ['orders-summary', 'users-list']);
  assert.equal(claims.get('users-list').owner, '@teammate');
  assert.equal(claims.get('users-list').branch, 'feature/users-list');
  assert.match(claims.get('users-list').ref, /feature\/users-list$/);
});

test('one branch alone yields only the claim the working tree already shows', () => {
  const root = claimedRepo({ claimed: false });
  const claims = claimsOnRefs(join(root, SLUG_PATH), { root });
  assert.deepEqual([...claims.keys()], ['orders-summary']);
  assert.deepEqual(frontier(parseMap(MAP), { claims }).claimed, []);
});

test('the ref read fails open where there is no git at all', () => {
  const root = mapDir(); // `.git` is a plain directory here, not a repository
  assert.deepEqual(refsOf(root), []);
  assert.equal(claimsOnRefs(join(root, SLUG_PATH), { root }).size, 0);
});

// --- decision 0170: the write reads the claims the refs carry, as the frontier does.

test('a claim over a node another branch holds is refused, and the map is unchanged', () => {
  const root = claimedRepo();
  const before = readFileSync(join(root, SLUG_PATH), 'utf8');

  const cli = run(['claim', 'state-migration', 'users-list', '@you', 'feature/mine'], root);

  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /@teammate/);
  assert.match(cli.stderr, /feature\/users-list/);
  assert.match(cli.stderr, /refs\/heads\/feature\/users-list/);
  assert.match(cli.stderr, /--force/);
  assert.equal(readFileSync(join(root, SLUG_PATH), 'utf8'), before);
});

test('--force writes the claim anyway, and says whose claim it overrode', () => {
  const root = claimedRepo();

  const cli = run(['claim', 'state-migration', 'users-list', '@you', 'feature/mine', '--force'], root);

  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /overrode the claim of @teammate on feature\/users-list \(refs\/heads\/feature\/users-list\)\n/);
  assert.match(readFileSync(join(root, SLUG_PATH), 'utf8'), /- \[active\] users-list — .*owner: @you · branch: feature\/mine/);
});

test('the same claim written again passes — a resumed claim is not refused by its own earlier write', () => {
  const root = claimedRepo();

  const cli = run(['claim', 'state-migration', 'users-list', '@teammate', 'feature/users-list'], root);

  assert.equal(cli.status, 0, cli.stderr);
  assert.doesNotMatch(cli.stdout, /overrode/);
});

// Owner **or** branch: each half refuses on its own (decision 0170).
for (const [label, owner, branch] of [
  ['the same owner on another branch', '@teammate', 'feature/mine'],
  ['another owner on the same branch', '@you', 'feature/users-list'],
]) {
  test(`${label} is refused, and the map is unchanged`, () => {
    const root = claimedRepo();
    const before = readFileSync(join(root, SLUG_PATH), 'utf8');

    const cli = run(['claim', 'state-migration', 'users-list', owner, branch], root);

    assert.equal(cli.status, 1, cli.stdout);
    assert.match(cli.stderr, /already claimed by @teammate on feature\/users-list/);
    assert.equal(readFileSync(join(root, SLUG_PATH), 'utf8'), before);
  });
}

/** `claimedRepo()` with a second branch that claims `users-list` for `@reviewer`. */
function twiceClaimedRepo() {
  const root = claimedRepo();
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.invalid', '-c', 'commit.gpgsign=false', ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  git('checkout', '--quiet', '-b', 'feature/rev');
  writeFileSync(join(root, SLUG_PATH), rewriteNode(MAP, 'users-list', { status: 'active', owner: '@reviewer', branch: 'feature/rev' }));
  git('commit', '--quiet', '-a', '-m', 'chore: claim users-list again');
  git('checkout', '--quiet', 'main');
  return root;
}

test('a claim is compared against every claim the refs carry, not the first ref alone', () => {
  const root = twiceClaimedRepo();
  const before = readFileSync(join(root, SLUG_PATH), 'utf8');

  // `refs/heads/feature/rev` sorts first, so its claim is the one a first-ref
  // read compares; the teammate's claim on the other branch still refuses it.
  const own = run(['claim', 'state-migration', 'users-list', '@reviewer', 'feature/rev'], root);
  assert.equal(own.status, 1, own.stdout);
  assert.match(own.stderr, /@teammate on feature\/users-list \(refs\/heads\/feature\/users-list\)/);
  assert.doesNotMatch(own.stderr, /@reviewer/);

  const third = run(['claim', 'state-migration', 'users-list', '@carol', 'feature/carol'], root);
  assert.equal(third.status, 1, third.stdout);
  assert.match(third.stderr, /@reviewer on feature\/rev \(refs\/heads\/feature\/rev\)/);
  assert.match(third.stderr, /@teammate on feature\/users-list \(refs\/heads\/feature\/users-list\)/);
  assert.equal(readFileSync(join(root, SLUG_PATH), 'utf8'), before);
});

test('one claim carried by two versions of the map is named once', () => {
  // The claimed branch moved on after its fetch: the local ref and the
  // remote-tracking one hold different maps with the same claim in both.
  const root = claimedRepo();
  const git = (...args) =>
    execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.invalid', '-c', 'commit.gpgsign=false', ...args], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
  git('update-ref', 'refs/remotes/origin/feature/users-list', 'feature/users-list');
  git('checkout', '--quiet', 'feature/users-list');
  const map = readFileSync(join(root, SLUG_PATH), 'utf8');
  writeFileSync(join(root, SLUG_PATH), `${map}\n`);
  git('commit', '--quiet', '-a', '-m', 'chore: move the branch on');
  git('checkout', '--quiet', 'main');

  const cli = run(['claim', 'state-migration', 'users-list', '@you', 'feature/mine'], root);

  assert.equal(cli.status, 1, cli.stdout);
  assert.equal(cli.stderr.match(/@teammate/g).length, 1, cli.stderr);
});

test('--force over several claims names each one it overrode', () => {
  const root = twiceClaimedRepo();

  const cli = run(['claim', 'state-migration', 'users-list', '@carol', 'feature/carol', '--force'], root);

  assert.equal(cli.status, 0, cli.stderr);
  assert.match(
    cli.stdout,
    /overrode the claims of @reviewer on feature\/rev \(refs\/heads\/feature\/rev\), and of @teammate on feature\/users-list \(/,
  );
});

test('a claim on a remote-tracking ref is read the same way (criterion 7)', () => {
  const root = claimedRepo({ remote: true });
  const claims = claimsOnRefs(join(root, SLUG_PATH), { root });
  assert.equal(claims.get('users-list').owner, '@teammate');
  assert.match(claims.get('users-list').ref, /^refs\/remotes\/origin\/feature\/users-list$/);
});

test('a node another branch holds leaves ready and is reported as claimed', () => {
  const map = parseMap(MAP);
  const claims = new Map([['users-list', { owner: '@teammate', branch: 'feature/users-list', ref: 'x' }]]);
  const f = frontier(map, { claims });
  assert.deepEqual(f.ready.map((n) => n.name), []);
  assert.deepEqual(f.claimed.map(({ node }) => node.name), ['users-list']);
  assert.match(f.counts, /1 claimed/);
  assert.match(shortCounts(f), /1 claimed/);

  const text = formatFrontier('state-migration', f);
  assert.match(text, /^claimed: users-list — users list to TanStack · owner: @teammate · branch: feature\/users-list$/m);
  assert.doesNotMatch(text, /^ready: users-list/m);
});

test('a claim the working tree already carries is the active line it always was', () => {
  const map = parseMap(MAP);
  // `orders-summary` is `[active] @you` in the map itself.
  const claims = new Map([['orders-summary', { owner: '@you', branch: 'feature/orders-summary', ref: 'x' }]]);
  const f = frontier(map, { claims });
  assert.deepEqual(f.claimed, []);
  assert.deepEqual(f.active.map((n) => n.name), ['orders-summary']);
});

test('frontier on a real repository reports the claim with its branch (criterion 2)', () => {
  const root = claimedRepo();
  const cli = run(['frontier', 'state-migration'], root);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /claimed: users-list — users list to TanStack · owner: @teammate · branch: feature\/users-list/);
  assert.doesNotMatch(cli.stdout, /^ready: users-list/m);
  assert.match(cli.stdout, /0 ready \/ 1 claimed/);
});

// --- measure, claim, node-done (criteria 1, 3)

import { knownRepos, measureMap } from './campaigns.mjs';

/** A map whose one metric is a file the test can move. */
const COUNTED = `# Counted — a campaign with one measurable thing
Status: active · Owners: @you

## Done-metrics
| Metric | Command | Start | Target | Current (date) |
|---|---|---|---|---|
| widgets | \`cat count.txt\` | 7 | 0 | 7 (2026-08-01) |

## Nodes
- [ready] first-node — the first one · deps: — · owner: — · branch: — · ref: — · metric: —
- [ready] second-node — the second one · deps: first-node · owner: — · branch: — · ref: — · metric: —
`;

const readMap = (root, slug = 'counted') =>
  readFileSync(join(root, '.claude', 'hodos', 'campaigns', `${slug}.md`), 'utf8');

function counted(count = '7') {
  const root = mapDir(COUNTED, 'counted');
  writeFileSync(join(root, 'count.txt'), `${count}\n`);
  return root;
}

// The four tests below run the map's own metric commands, and the fixture map
// states them as `cat count.txt` and `sleep 5` — POSIX utilities cmd.exe has
// no equivalent of. What they assert about `measureMap` is platform-neutral;
// the command they assert it with is not.
const posix = { skip: process.platform === 'win32' && 'the fixture map measures with cat and sleep' };

test('measure runs each command and rewrites only its Current cell', posix, () => {
  const root = counted('4');
  const logged = [];
  const out = measureMap(COUNTED, { cwd: root, now: new Date('2026-09-02T10:00:00Z'), log: (l) => logged.push(l) });
  assert.equal(out.results[0].value, '4');
  assert.match(logged.join('\n'), /cat count\.txt/); // decision 0055: the command is echoed
  const changed = COUNTED.split('\n')
    .map((line, i) => [line, out.text.split('\n')[i]])
    .filter(([a, b]) => a !== b);
  assert.equal(changed.length, 1);
  assert.equal(changed[0][1], '| widgets | `cat count.txt` | 7 | 0 | 4 (2026-09-02) |');
});

test('a command that times out leaves the cell alone and says why (decision 0055)', posix, () => {
  const root = counted('4');
  const text = COUNTED.replace('cat count.txt', 'sleep 5');
  const out = measureMap(text, { cwd: root, timeoutMs: 50, now: new Date('2026-09-02T10:00:00Z') });
  assert.equal(out.text, text); // the previous value and its date stand
  assert.match(out.results[0].reason, /timed out after 50ms/);
});

test('a command that fails leaves the cell alone too', posix, () => {
  const root = counted('4');
  const text = COUNTED.replace('cat count.txt', 'cat no-such-file.txt');
  const out = measureMap(text, { cwd: root, now: new Date('2026-09-02T10:00:00Z') });
  assert.equal(out.text, text);
  assert.match(out.results[0].reason, /exit 1/);
});

// --- `set --gist`, and a rename that is a replacement (decision 0136)

test('set --gist rewrites the sentence and nothing else', () => {
  const root = counted();
  const cli = run(['set', 'counted', 'first-node', '--gist', 'the first one, restated precisely'], root);
  assert.equal(cli.status, 0, cli.stderr);
  const after = readMap(root);
  assert.match(after, /- \[ready\] first-node — the first one, restated precisely · deps: — · owner: — · branch: — · ref: — · metric: —/);
  assert.equal(after.split('\n').filter((l, i) => l !== COUNTED.split('\n')[i]).length, 1);
});

test('a gist carrying the field separator is refused, and the file is untouched', () => {
  const root = counted();
  const before = readFileSync(join(root, '.claude', 'hodos', 'campaigns', 'counted.md'));
  const cli = run(['set', 'counted', 'first-node', '--gist', 'the first one · owner: @me'], root);
  assert.equal(cli.status, 2);
  // The message names the separator with its spaces, because that is what the
  // check refuses: a bare middle dot is prose and forges nothing.
  assert.match(cli.stderr, /--gist takes free text without the field separator " · " in it/);
  assert.deepEqual(readFileSync(join(root, '.claude', 'hodos', 'campaigns', 'counted.md')), before);
});

test('a gist carrying a bare middle dot is prose, and is accepted', () => {
  const root = counted();
  const cli = run(['set', 'counted', 'first-node', '--gist', 'the tone·count pair, spelled once'], root);
  assert.equal(cli.status, 0);
  const after = readFileSync(join(root, '.claude', 'hodos', 'campaigns', 'counted.md'), 'utf8');
  assert.match(after, /- \[ready\] first-node — the tone·count pair, spelled once · deps: —/);
});

test('an empty gist is refused too — a node is read by its sentence', () => {
  const root = counted();
  const cli = run(['set', 'counted', 'first-node', '--gist', '   '], root);
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /--gist/);
});

test('set still has no --name: a rename is a replacement (decision 0136)', () => {
  const root = counted();
  const cli = run(['set', 'counted', 'first-node', '--name', 'renamed-node'], root);
  assert.equal(cli.status, 2);
  assert.match(cli.stderr, /--gist/); // the flag list it prints instead
  assert.match(readMap(root), /- \[ready\] first-node/);
});

// --- the home map, written here and committed there (decision 0137)

/** Two sibling repositories that are real git repositories, the map in `home`. */
function realPair(text = MAP, homeConfig = { version: 1 }) {
  const ws = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-home-')));
  const make = (name, config, maps) => {
    const root = join(ws, name);
    mkdirSync(join(root, '.claude', 'hodos', 'campaigns'), { recursive: true });
    writeFileSync(join(root, '.claude', 'hodos', 'config.json'), JSON.stringify(config));
    for (const [slug, body] of Object.entries(maps)) {
      writeFileSync(join(root, '.claude', 'hodos', 'campaigns', `${slug}.md`), body);
    }
    const git = (...args) =>
      execFileSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t.invalid', '-c', 'commit.gpgsign=false', ...args], {
        cwd: root,
        encoding: 'utf8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
    git('init', '-b', 'main');
    git('add', '--', '.');
    git('commit', '-m', 'chore: the layer');
    return { root, git };
  };
  const home = make('home', homeConfig, { 'state-migration': text });
  const away = make('away', { version: 1, campaigns: { external: ['../home/.claude/hodos/campaigns'] } }, {});
  return { ws, home, away };
}

test('node-done in another repository writes the map and commits nothing there', () => {
  const { home, away } = realPair();
  const cli = run(['node-done', 'state-migration', 'users-list', '--sha', 'abc1234'], away.root);
  assert.equal(cli.status, 0, cli.stderr);

  // The instruction: the repository, the file, and the command to run there.
  assert.match(cli.stdout, new RegExp(`the map is in ${home.root}, not in this repository — commit it there`));
  assert.match(cli.stdout, /git -C .*home add \.claude\/hodos\/campaigns\/state-migration\.md/);
  assert.match(cli.stdout, /commit -m "chore: users-list done in campaign state-migration"/);

  // The write landed, and it is the developer's to commit.
  const after = readFileSync(join(home.root, '.claude', 'hodos', 'campaigns', 'state-migration.md'), 'utf8');
  assert.match(after, /- \[done\] users-list — users list to TanStack .* · ref: sha:abc1234/);
  assert.equal(home.git('log', '--format=%s').trim(), 'chore: the layer');
  assert.match(home.git('status', '--porcelain'), /^ M \.claude\/hodos\/campaigns\/state-migration\.md$/m);
});

test('the same close in the map\'s own repository prints no such instruction', () => {
  const { home } = realPair();
  const cli = run(['node-done', 'state-migration', 'users-list', '--sha', 'abc1234'], home.root);
  assert.equal(cli.status, 0, cli.stderr);
  assert.doesNotMatch(cli.stdout, /commit it there/);
});

test('a claim on a map in another repository says the same thing', () => {
  const { home, away } = realPair();
  const cli = run(['claim', 'state-migration', 'users-list', '@you', 'feature/users-list'], away.root);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /commit it there/);
  assert.match(cli.stdout, /commit -m "chore: users-list claimed in campaign state-migration"/);
  assert.equal(home.git('log', '--format=%s').trim(), 'chore: the layer');
});

// --- decision 0174: the subject is written in the home repository's convention

/**
 * The header shape a conventional-commit checker such as `cog verify` enforces,
 * with no scope: a project may allowlist its scopes, and `ariadne_v2`'s
 * `cog.toml` refused `chore(campaign): …` as "Commit scope `campaign` not
 * allowed" (decision 0181). A scope is optional in the convention.
 */
const CONVENTIONAL = /^[a-z]+!?: \S/;

test('a home repository that is conventional gets a subject its commit-msg check accepts', () => {
  const { away } = realPair(MAP, { version: 1, conventions: { commit: 'conventional' } });
  const cli = run(['set', 'state-migration', 'users-list', '--gist', 'users list, on TanStack'], away.root);
  assert.equal(cli.status, 0, cli.stderr);
  const subject = /commit -m "([^"]+)"/.exec(cli.stdout)?.[1];
  assert.equal(subject, 'chore: users-list updated in campaign state-migration');
  assert.match(subject, CONVENTIONAL);
});

test('a home repository with a ticket prefix gets the add and its convention named, not a subject nobody can fill', () => {
  const { away } = realPair(MAP, { version: 1, conventions: { commit: 'ticket-prefix' } });
  const cli = run(['node-done', 'state-migration', 'users-list', '--sha', 'abc1234'], away.root);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /git -C .*home add \.claude\/hodos\/campaigns\/state-migration\.md/);
  assert.match(cli.stdout, /ticket-prefix/);
  assert.doesNotMatch(cli.stdout, /commit -m/);
});

test('a custom pattern is named the same way', () => {
  const { away } = realPair(MAP, { version: 1, conventions: { commit: 'custom:^PROJ-\\d+ ' } });
  const cli = run(['claim', 'state-migration', 'users-list', '@you', 'feature/users-list'], away.root);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /custom:\^PROJ-/);
  assert.doesNotMatch(cli.stdout, /commit -m/);
});

// --- `repo:` resolves, and a metric measures where its row says (decision 0134)

import { resolveRepo } from './campaigns.mjs';

/** A map whose two metrics print the directory each one ran in. */
const WHERE = `# Where — one metric per repository
Status: active · Owners: @you

## Done-metrics
| Metric | Command | Start | Target | Current (date) |
|---|---|---|---|---|
| here | \`pwd\` | — | — | — |
| there | \`pwd\` · repo: away | — | — | — |

## Nodes
- [ready] first-node — the first one · deps: — · owner: — · branch: — · ref: — · metric: —
`;

test('a repo: name is the repository root that carries it as its directory name', posix, () => {
  const { home, away } = pair();
  // From the home repository the name comes through `external[]`; from the
  // external one it is that session's own root. Both are 0134's rule.
  writeFileSync(
    join(home, '.claude', 'hodos', 'config.json'),
    JSON.stringify({ version: 1, campaigns: { external: ['../away/.claude/hodos/campaigns'] } }),
  );
  assert.equal(resolveRepo('away', { root: home, startDir: home }), away);
  assert.equal(resolveRepo('home', { root: home, startDir: away }), home);
  assert.equal(resolveRepo('away', { root: home, startDir: away }), away);
  assert.equal(resolveRepo('nobody', { root: home, startDir: away }), null);
});

test('a metric row carrying repo: runs in that repository (criterion 3)', posix, () => {
  const { home, away } = pair({ homeMap: WHERE });
  writeFileSync(
    join(home, '.claude', 'hodos', 'config.json'),
    JSON.stringify({ version: 1, campaigns: { external: ['../away/.claude/hodos/campaigns'] } }),
  );
  const cli = run(['measure', 'state-migration'], home);
  assert.equal(cli.status, 0, cli.stderr);
  const after = readMap(home, 'state-migration');
  assert.match(after, new RegExp(`\\| here \\| \`pwd\` \\| — \\| — \\| ${home} `));
  assert.match(after, new RegExp(`repo: away \\| — \\| — \\| ${away} `));
});

test('the names it does know are printed beside the one it does not', posix, () => {
  // Decision 0134 asks for both halves of this message: the name that did not
  // resolve, and the names that would have. A typo is a one-line fix only when
  // the reader can see what to type instead.
  const text = WHERE.replace('repo: away', 'repo: nowhere');
  const logged = [];
  measureMap(text, {
    cwd: '.',
    repoDir: () => null,
    known: ['mono', 'kit'],
    now: new Date('2026-09-02T10:00:00Z'),
    log: (l) => logged.push(l),
  });
  assert.match(logged.join('\n'), /no repository named nowhere — known: mono, kit/);
});

test('knownRepos names the session root, the map root and the external ones', posix, () => {
  // The list the message reads from is the list the lookup walks: the session's
  // own root, the root the map lives in, and every external checkout either
  // config names — which is why a name that resolves to nothing can be reported
  // beside the ones that would have (decision 0134).
  const { home, away } = pair();
  const names = knownRepos({ root: home, startDir: away });
  assert.deepEqual(names.sort(), ['away', 'home']);
  assert.equal(new Set(names).size, names.length); // deduped
});

test('a repo: nothing resolves leaves its cell alone and says why', posix, () => {
  const text = WHERE.replace('repo: away', 'repo: nowhere');
  const logged = [];
  const out = measureMap(text, {
    cwd: '.',
    repoDir: () => null,
    now: new Date('2026-09-02T10:00:00Z'),
    log: (l) => logged.push(l),
  });
  assert.equal(out.results[1].value, null);
  assert.match(out.results[1].reason, /no repository named nowhere/);
  assert.match(logged.join('\n'), /there stays at —/);
  assert.equal(out.text.split('\n')[7], text.split('\n')[7]); // the row is untouched
});

test('a metric runs at the git root, not in the directory the config sits in', posix, () => {
  // Decision 0075: a path a config or a script hands to a command resolves
  // against the git root. A map found from a subproject measures there too.
  const { root, web } = monorepo();
  mkdirSync(join(web, '.claude', 'hodos', 'campaigns'), { recursive: true });
  writeFileSync(join(web, '.claude', 'hodos', 'campaigns', 'sub.md'), WHERE.replace(' · repo: away', ''));
  const cli = run(['measure', 'sub'], web);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(readFileSync(join(web, '.claude', 'hodos', 'campaigns', 'sub.md'), 'utf8'), new RegExp(`\\| ${root} `));
});

test('claim marks the node active and records who has it (criterion 1)', () => {
  const root = counted();
  const cli = run(['claim', 'counted', 'first-node', '@you', 'feature/first'], root);
  assert.equal(cli.status, 0, cli.stderr);
  const after = readMap(root);
  assert.match(after, /- \[active\] first-node — the first one · deps: — · owner: @you · branch: feature\/first · ref: task:first-node · metric: —/);
  assert.equal(after.split('\n').filter((l, i) => l !== COUNTED.split('\n')[i]).length, 1);
});

test('claim takes the task slug when it is not the node name (decision 0054)', () => {
  const root = counted();
  const cli = run(['claim', 'counted', 'first-node', '@you', 'feature/first', '--ref', 'task:first-node-2'], root);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(readMap(root), /ref: task:first-node-2/);
});

test('node-done sets done, points ref at the sha, and re-measures (criterion 3)', posix, () => {
  const root = counted('7');
  run(['claim', 'counted', 'first-node', '@you', 'feature/first'], root);
  writeFileSync(join(root, 'count.txt'), '5\n'); // the node moved the number
  const cli = run(['node-done', 'counted', 'first-node', '--sha', 'a1b2c3d'], root);
  assert.equal(cli.status, 0, cli.stderr);
  const after = readMap(root).split('\n');
  assert.match(after.find((l) => l.includes('first-node')), /^- \[done\] first-node — .* · ref: sha:a1b2c3d · metric: —$/);
  assert.match(after.find((l) => l.startsWith('| widgets')), /\| 5 \(\d{4}-\d{2}-\d{2}\) \|$/);
  assert.match(after.find((l) => l.includes('second-node')), /^- \[ready\] second-node/); // untouched
});

test('node-done on a node no map carries changes nothing', () => {
  const root = counted();
  const before = readMap(root);
  const cli = run(['node-done', 'counted', 'no-such-node', '--sha', 'a1b2c3d'], root);
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /no-such-node/);
  assert.equal(readMap(root), before);
});

test('claim and node-done need their arguments', () => {
  const root = counted();
  assert.equal(run(['claim', 'counted', 'first-node'], root).status, 2);
  assert.equal(run(['node-done', 'counted', 'first-node'], root).status, 2);
});

// --- frontier (criterion 4, decision 0053)


test('the frontier is the ready nodes whose dependencies are done', () => {
  const f = frontier(parseMap(MAP));
  assert.deepEqual(f.ready.map((n) => n.name), ['users-list']);
  assert.deepEqual(f.blocked.map((n) => n.name), ['billing']);
  assert.deepEqual(f.fog.map((n) => n.name), ['reporting-page']);
  assert.deepEqual(f.active.map((n) => n.name), ['orders-summary']);
  assert.deepEqual(f.held, []);
  assert.deepEqual(f.waits, ['backend billing API — @backend-team, asked 2026-08-27']);
  assert.equal(f.counts, '1 ready / 1 blocked / 1 fog');
});

test('a ready node with an open dependency is held, not proposed (decision 0053)', () => {
  const text = COUNTED; // second-node depends on first-node, which is ready
  const f = frontier(parseMap(text));
  assert.deepEqual(f.ready.map((n) => n.name), ['first-node']);
  assert.deepEqual(f.held.map((h) => [h.node.name, h.by]), [['second-node', ['first-node']]]);
  assert.equal(f.counts, '1 ready / 1 held / 0 blocked / 0 fog');
});

test('a dependency the map does not carry holds the node and says so', () => {
  const f = frontier(parseMap(COUNTED.replace('deps: first-node', 'deps: ghost-node')));
  assert.deepEqual(f.held.map((h) => h.by), [['ghost-node']]);
  assert.match(formatFrontier('counted', f), /ghost-node \(no such node\)/);
});

test('a dropped dependency does not hold anything', () => {
  const f = frontier(parseMap(COUNTED.replace('[ready] first-node', '[dropped] first-node')));
  assert.deepEqual(f.ready.map((n) => n.name), ['second-node']);
  assert.deepEqual(f.held, []);
});

test('an empty frontier names what is being waited for, and no ready line', () => {
  const f = frontier(parseMap(MAP.replace('[ready] users-list', '[blocked] users-list')));
  assert.deepEqual(f.ready, []);
  const text = formatFrontier('state-migration', f);
  assert.doesNotMatch(text, /^ready:/m);
  assert.match(text, /^wait: backend billing API — @backend-team/m);
  assert.match(text, /^blocked: billing — billing screens · by: backend billing API \(SHOP-1049\)$/m);
});

test('frontier prints the counts and one line per node', () => {
  const root = mapDir();
  const cli = run(['frontier', 'state-migration'], root);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /^state-migration: 1 ready \/ 1 blocked \/ 1 fog$/m);
  assert.match(cli.stdout, /^ready: users-list — users list to TanStack$/m);
  assert.match(cli.stdout, /^active: orders-summary — summary widget · owner: @you · branch: feature\/orders-summary$/m);
});

// --- set, and the lines a close makes stale (decision 0056)

/** first-node blocks two others: one by `deps:`, one by a free-text `by:`. */
const CHAINED = COUNTED.replace(
  '- [ready] second-node — the second one · deps: first-node · owner: — · branch: — · ref: — · metric: —\n',
  `- [ready] second-node — the second one · deps: first-node · owner: — · branch: — · ref: — · metric: —
- [blocked] third-node — the third one · deps: — · owner: — · branch: — · ref: — · metric: — · by: first-node landing
- [ready] fourth-node — unrelated · deps: — · owner: — · branch: — · ref: — · metric: —
`,
);

function chained() {
  const root = mapDir(CHAINED, 'counted');
  writeFileSync(join(root, 'count.txt'), '7\n');
  return root;
}

test('set writes one field of one line and leaves the rest of the file', () => {
  const root = chained();
  const cli = run(['set', 'counted', 'third-node', '--status', 'ready', '--by', '—'], root);
  assert.equal(cli.status, 0, cli.stderr);
  const after = readMap(root).split('\n');
  const before = CHAINED.split('\n');
  const changed = before.map((l, i) => [l, after[i]]).filter(([a, b]) => a !== b);
  assert.equal(changed.length, 1);
  assert.equal(
    changed[0][1],
    '- [ready] third-node — the third one · deps: — · owner: — · branch: — · ref: — · metric: — · by: —',
  );
});

test('set takes every field of the grammar', () => {
  const root = chained();
  run(['set', 'counted', 'fourth-node', '--owner', '@you', '--deps', 'second-node, third-node', '--metric', 'widgets 7→5'], root);
  const line = readMap(root).split('\n').find((l) => l.includes('fourth-node'));
  assert.match(line, /· deps: second-node, third-node · owner: @you ·/);
  assert.match(line, /· metric: widgets 7→5$/);
});

test('set refuses a status the grammar does not have, and a call with no field', () => {
  const root = chained();
  const before = readMap(root);
  assert.equal(run(['set', 'counted', 'third-node', '--status', 'nearly'], root).status, 2);
  assert.equal(run(['set', 'counted', 'third-node'], root).status, 2);
  assert.equal(run(['set', 'counted', 'no-such-node', '--owner', '@you'], root).status, 1);
  assert.equal(readMap(root), before);
});

test('node-done names the lines that still point at the node it closed (decision 0056)', () => {
  const root = chained();
  const cli = run(['node-done', 'counted', 'first-node', '--sha', 'a1b2c3d'], root);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /second-node, third-node still name first-node in deps: or by:/);
  assert.doesNotMatch(cli.stdout, /fourth-node/);
});

test('a close nothing points at says nothing about stale lines', () => {
  const root = chained();
  const cli = run(['node-done', 'counted', 'fourth-node', '--sha', 'a1b2c3d'], root);
  assert.equal(cli.status, 0, cli.stderr);
  assert.doesNotMatch(cli.stdout, /still name/);
});

test('node-done changes no status but the one it was given', () => {
  const root = chained();
  run(['node-done', 'counted', 'first-node', '--sha', 'a1b2c3d'], root);
  const after = readMap(root);
  assert.match(after, /^- \[blocked\] third-node/m); // decision 0053: a human's judgement stands
  assert.match(after, /^- \[ready\] second-node/m);
});

// --- review 1

test('a hyphen is not a word boundary: closing `errors` leaves `web-errors` alone (minor 1)', () => {
  const text = `## Nodes
- [ready] errors — the short name · deps: — · owner: — · branch: — · ref: — · metric: —
- [blocked] other — waits on something else · deps: — · owner: — · branch: — · ref: — · metric: — · by: web-errors landing
- [blocked] real — waits on this one · deps: — · owner: — · branch: — · ref: — · metric: — · by: errors landing
`;
  const root = mapDir(text, 'counted');
  const cli = run(['node-done', 'counted', 'errors', '--sha', 'a1b2c3d'], root);
  assert.equal(cli.status, 0, cli.stderr);
  assert.match(cli.stdout, /real still name errors in deps: or by: — 1 line may be stale/);
  assert.doesNotMatch(cli.stdout, /other/);
});

test('a flag where a positional belongs is a bad invocation, not a branch (minor 2)', () => {
  const root = chained();
  const before = readMap(root);
  const cli = run(['claim', 'counted', 'first-node', '@you', '--ref', 'task:x'], root);
  assert.equal(cli.status, 2);
  assert.equal(readMap(root), before);
});

test('a rewrite preserves repo: and path:, which 9b will need (minor 4)', () => {
  const line = '- [ready] x — y · deps: — · owner: — · metric: — · repo: api · path: services/api';
  const after = rewriteNode(`## Nodes\n${line}\n`, 'x', { owner: '@you' });
  assert.equal(
    after,
    '## Nodes\n- [ready] x — y · deps: — · owner: @you · metric: — · repo: api · path: services/api\n',
  );
});

test('the active line carries the branch a claim is made on (minor 5)', () => {
  const map = parseMap(MAP);
  const text = formatFrontier('state-migration', frontier(map));
  assert.match(text, /^active: orders-summary — summary widget · owner: @you · branch: feature\/orders-summary$/m);
});

test('the block keeps its zero counts and the digest row drops them (minor 7)', () => {
  const map = parseMap(MAP.replace('[blocked] billing', '[done] billing').replace('[fog] reporting-page', '[done] reporting-page'));
  const f = frontier(map);
  assert.equal(f.counts, '1 ready / 0 blocked / 0 fog'); // the block says a map has no fog
  assert.equal(shortCounts(f), '1 ready'); // FORMATS.md §12: a zero is not printed
});


// --- review 2

test('a flag anywhere is a flag, and its value is never another flag (review 2, minor 1)', () => {
  const root = chained();
  const before = readMap(root);
  // the branch positional is missing behind the flag pair
  assert.equal(run(['claim', 'counted', 'first-node', '--ref', 'task:x', 'feature/x'], root).status, 2);
  // a flag standing where a flag's value belongs, in every command that writes
  assert.equal(run(['set', 'counted', 'first-node', '--owner', '--by', 'someone'], root).status, 2);
  assert.equal(run(['node-done', 'counted', 'first-node', '--sha', '--ref'], root).status, 2);
  assert.equal(readMap(root), before);
});

test('a flag may precede the positionals it does not belong to', () => {
  const root = chained();
  const cli = run(['claim', 'counted', 'first-node', '@you', '--ref', 'task:x', 'feature/x'], root);
  assert.equal(cli.status, 0, cli.stderr);
  const line = readMap(root).split('\n').find((l) => l.includes('first-node'));
  assert.match(line, /· owner: @you · branch: feature\/x · ref: task:x ·/);
});

test('the digest row keeps one vocabulary, whatever the map holds (review 2, minor 2)', () => {
  const claimed = parseMap(MAP.replace('[ready] users-list', '[done] users-list').replace('[blocked] billing', '[done] billing').replace('[fog] reporting-page', '[done] reporting-page'));
  assert.equal(shortCounts(frontier(claimed)), 'nothing open');
  const mixed = parseMap(MAP.replace('[blocked] billing', '[done] billing').replace('[fog] reporting-page', '[done] reporting-page'));
  assert.equal(shortCounts(frontier(mixed)), '1 ready');
});
