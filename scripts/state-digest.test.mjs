// Projects are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chmodSync, cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync, utimesSync } from 'node:fs';
import { basename, join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { digest, compactLine, nextOverall } from './state-digest.mjs';
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
  assert.equal(lines.length, 2, 'no campaign row in a project with no map');
  assert.ok(out.stdout.length <= CAP_CHARS, `${out.stdout.length} chars`);
});

// Decision 0192: the command after `resume with` is the one `ledger.mjs next` names.

test('a task at plan resumes with /hodos:task, which continues S1', () => {
  const root = project();
  task(root, 'users-export', { phase: 'plan', lastEvent: 'Init: standard feature' });

  assert.match(run(root).stdout, /^- users-export \[plan\] last: "Init: standard feature" — resume with \/hodos:task users-export$/m);
});

test('a bug ruled not reproducible resumes with a re-route, read from its ledger', () => {
  const root = project();
  const ruling = 'Ruling: not reproducible here — three commands stayed green — a re-route if wrong';
  task(root, 'users-export', { phase: 'plan', type: 'bug', lastEvent: ruling });

  assert.match(run(root).stdout, /— resume with \/hodos:task <the symptom, as a question or a spike>$/m);
});

test('a task at manual resumes with a review of its branch', () => {
  const root = project();
  task(root, 'users-export', { phase: 'manual', branch: 'task/users-export', lastEvent: 'Breaker: review — manual' });

  assert.match(run(root).stdout, /^- users-export \[manual\] last: "Breaker: review — manual" — resume with \/hodos:review task\/users-export$/m);
});

test('a blocked task resumes with /hodos:run, which asks its question', () => {
  const root = project();
  task(root, 'users-export', { phase: 'blocked', lastEvent: 'Task 1: blocked — q' });

  assert.match(run(root).stdout, /^- users-export \[blocked\] last: "Task 1: blocked — q" — resume with \/hodos:run users-export$/m);
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
  assert.equal(full.trimEnd().split('\n\n')[0].split('\n').length, 31);
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

// ── The chat line (decision 0200) ──────────────────────────────────────────
// The language the developer is speaking, from the task the next step ranks
// first, under the header and outside the row budget.

const chatOf = (lang, files) =>
  `- chat: the developer reads ${lang} — commands, slugs and paths are English, files are written in ${files}`;

test('the session\'s task with chat ru puts the chat line second, naming config.language', () => {
  const root = project({ language: 'en' });
  task(root, 'orders-summary', { chat: 'ru' });
  setActive(root, 'orders-summary');

  assert.equal(run(root).stdout.split('\n')[1], chatOf('ru', 'en'));
});

test('the files clause is config.language, and en when the config has none', () => {
  const ru = project({ language: 'ru' });
  task(ru, 'orders-summary', { chat: 'ru' });
  setActive(ru, 'orders-summary');
  assert.equal(run(ru).stdout.split('\n')[1], chatOf('ru', 'ru'));

  const none = project();
  task(none, 'orders-summary', { chat: 'ru' });
  setActive(none, 'orders-summary');
  assert.equal(run(none).stdout.split('\n')[1], chatOf('ru', 'en'));
});

test('no chat line for chat en, chat null, no task, or a task at done', () => {
  for (const [name, state] of [['en', { chat: 'en' }], ['null', { chat: null }], ['done', { chat: 'ru', phase: 'done' }]]) {
    const root = project();
    task(root, 'orders-summary', state);
    setActive(root, 'orders-summary');
    assert.doesNotMatch(run(root).stdout, /^- chat:/m, name);
  }
  assert.doesNotMatch(run(project()).stdout, /^- chat:/m, 'no task');
});

test('with no session task, the chat line follows the open task updated last', () => {
  const root = project();
  task(root, 'a-older', { chat: 'ru', updatedAt: '2026-10-05T09:00:00.000Z' });
  task(root, 'b-newer', { chat: 'de', updatedAt: '2026-10-05T11:00:00.000Z' });

  assert.equal(run(root).stdout.split('\n')[1], chatOf('de', 'en'));
});

test('the chat line survives a cap that drops rows, and the digest stays under it', () => {
  const root = project();
  // Rows shorter than the chat line leave less room under the cap than the
  // line takes, so a budget that does not count the line overflows it.
  for (let i = 0; i < 30; i += 1) task(root, `task-${i}`, {});
  task(root, 'orders-summary', { chat: 'ru' });
  setActive(root, 'orders-summary');
  const bare = run(root).stdout;

  assert.equal(bare.split('\n')[1], chatOf('ru', 'en'));
  assert.match(bare, /- … and \d+ more — \/hodos:status$/m);
  assert.ok(bare.length <= CAP_CHARS, `${bare.length} chars`);
});

test('--full carries the chat line under the header, and --compact after the ledger line', () => {
  const root = project();
  task(root, 'orders-summary', { chat: 'ru' });
  setActive(root, 'orders-summary');

  assert.equal(run(root, '--full').stdout.split('\n')[1], chatOf('ru', 'en'));
  assert.equal(
    compactLine(findConfig(root)),
    `hodos: orders-summary — ledger .claude/hodos/tasks/orders-summary/ledger.md — continue from the first open line\n${chatOf('ru', 'en')}`,
  );
});

test('digest of a notFound config is empty', () => {
  assert.equal(digest({ notFound: true }), '');
});

test('--help exits 0, an unknown option exits 2', () => {
  assert.equal(spawnSync(process.execPath, [DIGEST, '--help'], { encoding: 'utf8' }).status, 0);
  assert.equal(spawnSync(process.execPath, [DIGEST, '--wat'], { encoding: 'utf8' }).status, 2);
});

// ── The scripts rule re-point (decision 0204) ──────────────────────────────
// The engine runs from a copy at `<tmp>/cache/hodos/hodos/9.9.9/`, the layout a
// plugin update leaves, so the rule init wrote for 9.9.8 is another version of
// the running plugin.

let cached = null;
/** The engine's scripts and adapters, copied once into a plugin cache version directory. */
function cachedEngine() {
  if (cached) return cached;
  const cache = join(tempDir('hodos-cache-'), 'cache', 'hodos', 'hodos');
  const root = join(cache, '9.9.9');
  for (const dir of ['scripts', 'adapters']) cpSync(fileURLToPath(new URL(`../${dir}`, import.meta.url)), join(root, dir), { recursive: true });
  cached = { root, staleRule: `Bash(node ${join(cache, '9.9.8')}/scripts/*)`, rule: `Bash(node ${root}/scripts/*)` };
  return cached;
}

const runCached = (root, ...args) =>
  spawnSync(process.execPath, [join(cachedEngine().root, 'scripts', 'state-digest.mjs'), ...args], { cwd: root, encoding: 'utf8' });

const settingsFile = (root) => join(root, '.claude', 'settings.local.json');
const withStaleRule = (root) => {
  writeFileSync(settingsFile(root), `${JSON.stringify({ permissions: { allow: [cachedEngine().staleRule] } }, null, 2)}\n`);
  return readFileSync(settingsFile(root), 'utf8');
};

const MOVED = '- permissions: hodos scripts rule moved 9.9.8 → 9.9.9 in .claude/settings.local.json';

test('--repoint moves a stale scripts rule to the running version and says so under the header', () => {
  const root = project();
  withStaleRule(root);
  const out = runCached(root, '--repoint');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout.split('\n')[1], MOVED);
  assert.deepEqual(JSON.parse(readFileSync(settingsFile(root), 'utf8')).permissions.allow, [cachedEngine().rule]);
});

test('without --repoint the digest leaves the settings file alone and prints no permissions row', () => {
  const root = project();
  const before = withStaleRule(root);
  const out = runCached(root);

  assert.equal(out.status, 0, out.stderr);
  assert.doesNotMatch(out.stdout, /^- permissions:/m);
  assert.equal(readFileSync(settingsFile(root), 'utf8'), before);
});

test('the permissions row sits after the chat line and survives a cap that drops rows', () => {
  const root = project();
  for (let i = 0; i < 30; i += 1) task(root, `task-${i}`, {});
  task(root, 'orders-summary', { chat: 'ru' });
  setActive(root, 'orders-summary');
  withStaleRule(root);
  const bare = runCached(root, '--repoint').stdout;

  assert.equal(bare.split('\n')[1], chatOf('ru', 'en'));
  assert.equal(bare.split('\n')[2], MOVED);
  assert.match(bare, /- … and \d+ more — \/hodos:status$/m);
  assert.ok(bare.length <= CAP_CHARS, `${bare.length} chars`);
});

test('a write the file system refuses is reported and fails nothing', { skip: process.platform === 'win32' && 'chmod 0o555 does not make a directory unwritable on Windows' }, () => {
  const root = project();
  const before = withStaleRule(root);
  chmodSync(join(root, '.claude'), 0o555);
  let out;
  try {
    out = runCached(root, '--repoint');
  } finally {
    chmodSync(join(root, '.claude'), 0o755);
  }

  assert.equal(out.status, 0, out.stderr);
  assert.match(
    out.stdout,
    /^- permissions: could not move the hodos scripts rule 9\.9\.8 → 9\.9\.9 in \.claude\/settings\.local\.json \(EACCES\) — script calls will prompt$/m,
  );
  assert.equal(readFileSync(settingsFile(root), 'utf8'), before);
});

test('--repoint in a project with no hodos layer reads nothing and prints nothing', () => {
  const bare = tempDir('hodos-nodigest-');
  mkdirSync(join(bare, '.git'));
  mkdirSync(join(bare, '.claude'));
  const before = withStaleRule(bare);
  const out = runCached(bare, '--repoint');

  assert.equal(out.status, 0, out.stderr);
  assert.equal(out.stdout, '');
  assert.equal(readFileSync(settingsFile(bare), 'utf8'), before);
});

test('--help lists --repoint', () => {
  assert.match(spawnSync(process.execPath, [DIGEST, '--help'], { encoding: 'utf8' }).stdout, /^ {2}--repoint {2,}\S/m);
});

// --- campaigns (FORMATS.md §12, Stage 9a)

/** A map with one ready node, one blocked, one fog — the digest's example shape. */
function campaign(root, slug, { ready = 1, blocked = 1, fog = 1, done = 0 } = {}) {
  const dir = join(root, '.claude', 'hodos', 'campaigns');
  mkdirSync(dir, { recursive: true });
  const node = (status, n) => `- [${status}] ${status}-${n} — ${status} node ${n} · deps: — · owner: — · branch: — · ref: — · metric: —`;
  const nodes = [
    ...Array.from({ length: ready }, (_, i) => node('ready', i)),
    ...Array.from({ length: blocked }, (_, i) => node('blocked', i)),
    ...Array.from({ length: fog }, (_, i) => node('fog', i)),
    ...Array.from({ length: done }, (_, i) => node('done', i)),
  ];
  writeFileSync(join(dir, `${slug}.md`), `# ${slug}\nStatus: active · Owners: @you\n\n## Nodes\n${nodes.join('\n')}\n\n## Waits\n- the backend — @them, asked 2026-08-27\n`);
}

test('the digest counts the campaigns and prints their frontiers (FORMATS.md §12)', () => {
  const root = project();
  campaign(root, 'state-migration');
  campaign(root, 'mui-cleanup', { ready: 2, blocked: 0, fog: 0 });
  const text = digest(findConfig(root));
  assert.match(text, /· 2 campaigns/);
  // One row per map, in slug order, each ending on its own command: the task
  // rows' shape, and the cap drops one map at a time (decision 0198).
  assert.deepEqual(text.split('\n').filter((line) => line.startsWith('- campaign')), [
    '- campaign mui-cleanup — frontier 2 ready — advance with /hodos:campaign mui-cleanup',
    '- campaign state-migration — frontier 1 ready / 1 blocked / 1 fog — advance with /hodos:campaign state-migration',
  ]);
});

test('one map is one row that ends on the command that advances it', () => {
  const root = project();
  campaign(root, 'badge-rollout', { ready: 2, blocked: 0, fog: 1 });

  assert.match(
    digest(findConfig(root)),
    /^- campaign badge-rollout — frontier 2 ready \/ 1 fog — advance with \/hodos:campaign badge-rollout$/m,
  );
});

test('a map with nothing open still names the command that advances it', () => {
  const root = project();
  campaign(root, 'badge-rollout', { ready: 0, blocked: 0, fog: 0, done: 2 });

  assert.match(
    digest(findConfig(root)),
    /^- campaign badge-rollout — frontier nothing open — advance with \/hodos:campaign badge-rollout$/m,
  );
});

test('a ready node whose dependency is open counts as waiting in the row (decision 0199)', () => {
  const root = project();
  campaign(root, 'badge-rollout', { ready: 2, blocked: 0, fog: 0 });
  const path = join(root, '.claude', 'hodos', 'campaigns', 'badge-rollout.md');
  writeFileSync(path, readFileSync(path, 'utf8').replace('ready node 1 · deps: —', 'ready node 1 · deps: ready-0'));

  const text = digest(findConfig(root));
  assert.match(text, /^- campaign badge-rollout — frontier 1 ready \/ 1 waiting — advance with \/hodos:campaign badge-rollout$/m);
  assert.doesNotMatch(text, /held/);
});

test('a project with no maps has no campaign row', () => {
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
  assert.match(text, /^- campaign badge-rollout — frontier 2 ready \/ 1 fog — advance with \/hodos:campaign badge-rollout$/m);
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
  assert.match(text, /^- campaign badge-rollout — frontier 1 ready \/ 1 claimed — advance with \/hodos:campaign badge-rollout$/m);
  assert.match(text, /^claimed: ready-1 — ready node 1 · owner: @ada · branch: feature\/ready-1$/m);
});

test('the campaign rows stay inside the digest cap, which drops a map row whole and counts it', () => {
  const root = project();
  for (let i = 0; i < 12; i += 1) campaign(root, `campaign-number-${i}`, { ready: 3, blocked: 2, fog: 4 });
  const text = digest(findConfig(root));
  assert.ok(text.length <= CAP_CHARS, `digest is ${text.length} chars, cap ${CAP_CHARS}`);

  const lines = text.split('\n');
  const rows = lines.filter((line) => line.startsWith('- campaign'));
  assert.ok(rows.length > 0 && rows.length < 12, text);
  for (const row of rows) {
    assert.match(row, /^- campaign (campaign-number-\d+) — frontier 3 ready \/ 2 blocked \/ 4 fog — advance with \/hodos:campaign \1$/);
  }
  assert.equal(lines.at(-1), `- … and ${12 - rows.length} more — /hodos:status`);
  assert.equal(lines.length, 1 + rows.length + 1, text);
});

// ── The one Next: of --full (decision 0198) ────────────────────────────────
// The ranking is pure, so each tier is a claim on objects; the CLI cases below
// hold where the line lands.

const open = (slug, phase = 'execute', updatedAt = '2026-10-05T10:00:00.000Z') =>
  ({ slug, state: { slug, phase, updatedAt }, resume: `/hodos:run ${slug}` });
const aged = (slug, phase = 'execute', ageDays = 21) =>
  ({ ...open(slug, phase), ageDays });
const map = (slug, ready = 0, status = 'active') =>
  ({ slug, status, f: { ready: Array.from({ length: ready }, (_, i) => ({ name: `n${i}` })) } });
const facts = (over = {}) => ({ session: null, active: [], stale: [], maps: [], ...over });

test('tier session: this session\'s task wins, even over a task updated later', () => {
  const later = open('orders-summary', 'review', '2026-10-05T12:00:00.000Z');
  assert.deepEqual(nextOverall(facts({ session: 'users-export', active: [open('users-export'), later] })), {
    next: '/hodos:run users-export',
    why: "users-export is this session's task, at execute",
    subject: 'users-export execute',
  });
});

test('tier session: the session\'s task ranks first while it is stale too', () => {
  const out = nextOverall(facts({ session: 'users-export', active: [open('orders-summary')], stale: [aged('users-export')] }));
  assert.deepEqual(out, { next: '/hodos:run users-export', why: "users-export is this session's task, at execute", subject: 'users-export execute' });
});

test('tier active: with no pointer, the open task updated last', () => {
  const out = nextOverall(facts({
    active: [open('a-older', 'execute', '2026-10-05T09:00:00.000Z'), open('b-newer', 'review', '2026-10-05T11:00:00.000Z'), open('c-old', 'plan', '2026-10-04T09:00:00.000Z')],
  }));
  assert.deepEqual(out, { next: '/hodos:run b-newer', why: 'b-newer is the open task updated last, at review', subject: 'b-newer review' });
});

test('tier active: an open task beats a map with ready nodes', () => {
  const out = nextOverall(facts({ active: [open('users-export')], maps: [map('badge-rollout', 2)] }));
  assert.equal(out.next, '/hodos:run users-export');
});

test('tier ready-map: the first map with a ready node, in digest order', () => {
  const out = nextOverall(facts({ maps: [map('a-waiting', 0), map('badge-rollout', 2), map('cart', 1)] }));
  assert.deepEqual(out, { next: '/hodos:campaign badge-rollout', why: 'badge-rollout has 2 ready nodes', subject: 'badge-rollout' });
  assert.equal(nextOverall(facts({ maps: [map('cart', 1)] })).why, 'cart has 1 ready node');
});

test('tier ready-map: a map with ready nodes beats a stale task', () => {
  const out = nextOverall(facts({ stale: [aged('users-export')], maps: [map('badge-rollout', 2)] }));
  assert.equal(out.next, '/hodos:campaign badge-rollout');
});

test('tier stale: the first stale task not at done, with its own resume', () => {
  const out = nextOverall(facts({ stale: [aged('a-done', 'done', 40), aged('users-export', 'manual', 21)] }));
  assert.deepEqual(out, { next: '/hodos:run users-export', why: 'users-export has been open 21 days', subject: 'users-export manual' });
});

test('tier stale: a stale task beats a map with no ready node', () => {
  const out = nextOverall(facts({ stale: [aged('users-export')], maps: [map('badge-rollout', 0)] }));
  assert.equal(out.next, '/hodos:run users-export');
});

test('tier open-map: a map with no ready node is still named, so the stall is said', () => {
  assert.deepEqual(nextOverall(facts({ maps: [map('badge-rollout', 0)] })), {
    next: '/hodos:campaign badge-rollout',
    why: 'badge-rollout has no ready node — advancing it names the wait',
    subject: 'badge-rollout',
  });
});

test('tier none: no open task and no open campaign starts a task', () => {
  assert.deepEqual(nextOverall(facts()), {
    next: '/hodos:task <description>',
    why: 'no open task and no open campaign',
    subject: null,
  });
});

test('a session pointer to a done task falls through to the open task updated last', () => {
  const out = nextOverall(facts({ session: 'shipped', stale: [aged('shipped', 'done', 20)], active: [open('users-export')] }));
  assert.deepEqual(out, { next: '/hodos:run users-export', why: 'users-export is the open task updated last, at execute', subject: 'users-export execute' });
});

test('a map whose header says Status: done is never ranked, ready nodes or not', () => {
  const closed = map('closed-one', 2, 'done');
  assert.equal(nextOverall(facts({ maps: [closed, map('badge-rollout', 0)] })).next, '/hodos:campaign badge-rollout');
  assert.equal(nextOverall(facts({ maps: [closed] })).next, '/hodos:task <description>');
});

test('a stale task at done is passed over by the stale tier', () => {
  assert.equal(nextOverall(facts({ stale: [aged('shipped', 'done', 30)] })).next, '/hodos:task <description>');
});

test('--full ends on exactly one Next: line, and the bare digest prints none', () => {
  const root = project();
  campaign(root, 'badge-rollout', { ready: 2, blocked: 0, fog: 0 });
  const full = run(root, '--full').stdout.trimEnd().split('\n');
  const bare = run(root).stdout;

  assert.equal(full.at(-1), 'Next: /hodos:campaign badge-rollout — badge-rollout has 2 ready nodes');
  assert.equal(full.filter((line) => line.startsWith('Next:')).length, 1);
  assert.doesNotMatch(bare, /^Next:/m);
});

test('the bare digest states and never instructs, whatever it holds', () => {
  const root = project();
  task(root, 'users-export', { phase: 'execute', lastEvent: 'Task 1: started' });
  task(root, 'orders-summary', { phase: 'plan' }, 21);
  campaign(root, 'badge-rollout');
  setActive(root, 'users-export');

  assert.doesNotMatch(run(root).stdout, /^Next:/m);
  assert.match(run(root, '--full').stdout.trimEnd(), /\nNext: \/hodos:run users-export — users-export is this session's task, at execute$/);
});

test('with no config, --full prints nothing, and no Next: either', () => {
  const out = run(tempDir('hodos-nodigest-'), '--full');
  assert.equal(out.status, 0);
  assert.equal(out.stdout, '');
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
  assert.match(out.stdout, /^- campaign badge-rollout — frontier 1 ready \/ 1 claimed — advance with \/hodos:campaign badge-rollout$/m);
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
  campaign(root, 'cart-redesign', { ready: 1, blocked: 0, fog: 0 });
  rmSync(bare, { recursive: true, force: true });
  const out = run(root, '--full', '--fetch');

  assert.equal(out.status, 0);
  assert.match(out.stdout, /^- fetch failed — the map is as of your last pull/m);
  assert.match(out.stdout, /^- campaign badge-rollout — frontier 2 ready — advance with \/hodos:campaign badge-rollout$/m);
  // A caveat on what the campaign rows say, so it sits right above the first.
  const lines = out.stdout.split('\n');
  const fetchRow = lines.findIndex((line) => line.startsWith('- fetch failed'));
  assert.equal(lines.findIndex((line) => line.startsWith('- campaign')), fetchRow + 1, out.stdout);
  assert.equal(lines[fetchRow + 1], '- campaign badge-rollout — frontier 2 ready — advance with /hodos:campaign badge-rollout');
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
  assert.match(out.stdout, /^- campaign badge-rollout — frontier 2 ready — advance with \/hodos:campaign badge-rollout$/m);
});

test('--help names the flag, and an unknown one is still exit 2', () => {
  const help = run(project(), '--help');
  assert.equal(help.status, 0);
  assert.match(help.stdout, /--fetch/);
  assert.equal(run(project(), '--nonsense').status, 2);
});

// ── The state row (decisions 0202, 0203) ───────────────────────────────────
// One line for the band above the prompt: where the work is and the command
// that continues it, ranked by the same nextOverall that ends --full.

const row = (root, ...args) => {
  const out = run(root, '--row', ...args);
  assert.equal(out.status, 0, out.stderr);
  return out.stdout;
};

test("--row prints the session's task, its phase and the command that continues it", () => {
  const root = project();
  task(root, 'orders-summary', { phase: 'review', updatedAt: '2026-10-05T12:00:00.000Z' });
  task(root, 'users-export', { phase: 'execute', updatedAt: '2026-10-05T10:00:00.000Z' });
  setActive(root, 'users-export');

  assert.equal(row(root), 'users-export execute → /hodos:run users-export\n');
});

test('--row with no pointer names the open task updated last, in its resume form', () => {
  const root = project();
  task(root, 'a-older', { phase: 'execute', updatedAt: '2026-10-05T09:00:00.000Z' });
  task(root, 'b-newer', { phase: 'plan', updatedAt: '2026-10-05T11:00:00.000Z' });

  assert.equal(row(root), 'b-newer plan → /hodos:task b-newer\n');
});

test('--row names a stale task with its own resume', () => {
  const root = project();
  task(root, 'users-export', { phase: 'manual', branch: 'task/users-export' }, 21);

  assert.equal(row(root), 'users-export manual → /hodos:review task/users-export\n');
});

test('--row names a map with a ready node, and a map with none, by the command that advances it', () => {
  const ready = project();
  campaign(ready, 'badge-rollout', { ready: 2, blocked: 0, fog: 0 });
  assert.equal(row(ready), 'badge-rollout → /hodos:campaign badge-rollout\n');

  const stalled = project();
  campaign(stalled, 'badge-rollout', { ready: 0, blocked: 1, fog: 1 });
  assert.equal(row(stalled), 'badge-rollout → /hodos:campaign badge-rollout\n');
});

test('--row prints nothing for tier none, a task at done, or a directory with no config', () => {
  assert.equal(row(project()), '');

  const shipped = project();
  task(shipped, 'orders-summary', { phase: 'done' });
  assert.equal(row(shipped), '');

  assert.equal(row(tempDir('hodos-norow-')), '');
});

test('--row names the command the Next: line of --full names, for the same facts', () => {
  const fixtures = {
    session: (root) => { task(root, 'users-export', {}); task(root, 'orders-summary', { phase: 'plan' }); setActive(root, 'users-export'); },
    active: (root) => task(root, 'users-export', { phase: 'manual', branch: 'task/users-export' }),
    stale: (root) => { task(root, 'users-export', { phase: 'plan' }, 21); campaign(root, 'badge-rollout', { ready: 0 }); },
    'ready-map': (root) => { campaign(root, 'badge-rollout', { ready: 2 }); task(root, 'users-export', {}, 21); },
    'open-map': (root) => campaign(root, 'badge-rollout', { ready: 0 }),
  };
  for (const [tier, seed] of Object.entries(fixtures)) {
    const root = project();
    seed(root);
    const full = /^Next: (\S+(?: \S+)?) — /m.exec(run(root, '--full').stdout)?.[1];
    const line = / → (.+)\n$/.exec(row(root))?.[1];
    assert.ok(full, tier);
    assert.equal(line, full, tier);
  }
});

test('--row --fetch reaches no network, and no ref moves', () => {
  const { root, refs } = withOrigin();
  const before = refs();

  assert.equal(row(root, '--fetch'), 'badge-rollout → /hodos:campaign badge-rollout\n');
  assert.equal(refs(), before);
});

test('--help names --row as the band above the prompt, and an unknown flag beside it is still exit 2', () => {
  // The option's own entry, not the synopsis line that also lists it.
  const entry = /^ {2}--row {2,}(\S[\s\S]*?)\n {2}--/m.exec(run(project(), '--help').stdout)?.[1];
  assert.match(entry.replace(/\s+/g, ' '), /drawn by the band above the prompt/);
  assert.equal(run(project(), '--row', '--bogus').status, 2);
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
