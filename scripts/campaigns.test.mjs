// Maps are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

import { findMaps, crossRepoReason } from './campaigns.mjs';
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

test('a node that names another repository trips the Stage 9b stop (decision 0052)', () => {
  const map = parseMap(MAP.replace('· metric: — · by:', '· metric: — · repo: api · by:'));
  assert.match(crossRepoReason(map, {}), /repo: api/);
  assert.match(crossRepoReason(map, {}), /billing/);
});

test('a metric row that names another repository trips it too', () => {
  const map = parseMap(MAP.replace('| 24 | 0 |', '· repo: api | 24 | 0 |'));
  assert.match(crossRepoReason(map, {}), /redux slices/);
});

test('a non-empty config external[] trips it, and an empty one does not', () => {
  const map = parseMap(MAP);
  assert.equal(crossRepoReason(map, {}), null);
  assert.equal(crossRepoReason(map, { campaigns: { external: [] } }), null);
  assert.match(crossRepoReason(map, { campaigns: { external: ['../api'] } }), /external/);
});

test('an em dash in repo: or path: is the empty value, and trips nothing', () => {
  const map = parseMap(MAP.replace('· metric: — · by:', '· metric: — · repo: — · path: — · by:'));
  assert.equal(crossRepoReason(map, {}), null);
});

test('the stop names Stage 9b, exits 1, and leaves the map byte for byte', () => {
  const root = mapDir(MAP.replace('· metric: — · by:', '· metric: — · repo: api · by:'));
  const path = join(root, '.claude', 'hodos', 'campaigns', 'state-migration.md');
  const before = readFileSync(path);
  const node = ['state-migration', 'users-list'];
  for (const args of [['find'], ['frontier', 'state-migration'], ['measure', 'state-migration'],
    ['claim', ...node, '@you', 'feature/x'], ['node-done', ...node, '--sha', 'abc1234'],
    ['set', ...node, '--owner', '@you']]) {
    const cli = run(args, root);
    assert.equal(cli.status, 1, `${args[0]} should stop`);
    assert.match(cli.stderr, /cross-repository campaigns are Stage 9b/);
  }
  assert.deepEqual(readFileSync(path), before);
});

test('frontier on a slug no map carries exits 1 and says so', () => {
  const root = mapDir();
  const cli = run(['frontier', 'no-such-campaign'], root);
  assert.equal(cli.status, 1);
  assert.match(cli.stderr, /no-such-campaign/);
});

// --- measure, claim, node-done (criteria 1, 3)

import { measureMap } from './campaigns.mjs';

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

import { frontier, formatFrontier, shortCounts } from './campaigns.mjs';

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
