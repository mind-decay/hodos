#!/usr/bin/env node
// campaigns.mjs — the campaign map (FORMATS.md §11, DESIGN.md §9).
//
// The map is an index, not a store: the details live in task artifacts and
// merge requests, and every line of the file was written by a human who will
// read it again. So this script never re-serialises a map it parsed. It keeps
// the file's own lines and replaces the ones it was told to change — that is
// what makes "rewrite one field, nothing else moves" a property rather than a
// hope, and it is why a section nobody specified survives a claim.
//
// The lookup crosses repository boundaries: the walk to the git root first,
// then `config.campaigns.external[]`, which names the `campaigns/` directory of
// another checkout (`FORMATS.md §2`). A path a config hands to a command
// resolves against the **git root** (decision 0075), which is what a map entry
// carries as `root` — the directory a metric command runs in, and the
// repository a claim is read from.

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ancestors, findConfig, gitRoot } from './config.mjs';

const USAGE = `Usage: node scripts/campaigns.mjs <command> [args]

The campaign maps of a project (FORMATS.md §11).

  find [dir]                     list the maps visible from dir, innermost first;
                                 prints nothing when the project has none.
  frontier <slug>                the ready / waiting / blocked / fog nodes and the waits.
  claim <slug> <node> <owner> <branch> [--ref task:<slug>] [--force]
                                 mark the node active and record who has it.
                                 A claim any other ref carries — another owner
                                 or another branch — is refused, each one
                                 named; --force writes it anyway (decision 0170).
  set <slug> <node> --<field> <value>…
                                 write one or more of --status --gist --deps
                                 --owner --branch --ref --metric --by on one
                                 node line. There is no --name: a node is
                                 renamed by being replaced (decision 0136).
  node-done <slug> <node> --sha <ref>
                                 mark the node done, point ref: at the short sha
                                 the ref resolves to here, or else in the map's
                                 own repository, re-measure. A ref that names no
                                 commit in either exits 1 and writes nothing.
  measure <slug>                 run the done-metric commands and update Current.
  --help                         print this and exit 0.

Exit codes: 0 — done, a project with no maps included, and an unreadable
metric row reported in place; 1 — a map that is not there, a claim the
refs already carry for someone else, or a --sha that names no commit;
2 — bad invocation.`;

const SEP = ' · ';
const EMPTY = '—';
const STATUSES = ['fog', 'ready', 'blocked', 'active', 'review', 'done', 'dropped'];
/** The field order of FORMATS.md §11, used only when inserting a key a line lacks. */
const KEY_ORDER = ['deps', 'owner', 'branch', 'ref', 'metric', 'by', 'repo', 'path'];

const NODE_HEAD = /^- \[([a-z]+)\] ([a-z0-9][a-z0-9-]*) — (.*)$/;

// --- node lines

/** One node line, or `null` for any other line. Segments are kept raw. */
export function parseNodeLine(line) {
  const segments = line.split(SEP);
  const head = NODE_HEAD.exec(segments[0]);
  if (!head) return null;
  const [, status, name, gist] = head;
  if (!STATUSES.includes(status)) return null;

  const keys = [];
  const fields = {};
  for (const segment of segments.slice(1)) {
    const at = segment.indexOf(': ');
    if (at === -1) continue; // not `key: value` — kept in `segments`, ignored here
    const key = segment.slice(0, at);
    keys.push(key);
    fields[key] = segment.slice(at + 2);
  }
  const deps = fields.deps && fields.deps !== EMPTY
    ? fields.deps.split(',').map((d) => d.trim()).filter(Boolean)
    : [];
  return { status, name, gist, segments, keys, fields, deps };
}

/** The node line the changes produce, built from the original's own segments. */
export function formatNodeLine(node, changes = {}) {
  const segments = node.segments.slice();
  if (changes.status !== undefined) {
    if (!STATUSES.includes(changes.status)) throw new Error(`unknown status: ${changes.status}`);
    segments[0] = segments[0].replace(`[${node.status}]`, `[${changes.status}]`);
  }
  if (changes.gist !== undefined) {
    // The gist is the third part of the head segment, not a `key: value` one
    // (decision 0136), so it is written where the status is and not appended.
    const status = changes.status ?? node.status;
    segments[0] = `- [${status}] ${node.name} — ${changes.gist}`;
  }
  for (const [key, value] of Object.entries(changes)) {
    if (key === 'status' || key === 'gist') continue;
    const segment = `${key}: ${value}`;
    const at = node.keys.indexOf(key);
    if (at !== -1) {
      segments[at + 1] = segment;
      continue;
    }
    const rank = KEY_ORDER.indexOf(key);
    let insert = segments.length;
    for (let i = 1; i < segments.length; i += 1) {
      const other = KEY_ORDER.indexOf(segments[i].slice(0, segments[i].indexOf(': ')));
      if (other !== -1 && rank !== -1 && other > rank) {
        insert = i;
        break;
      }
    }
    segments.splice(insert, 0, segment);
  }
  return segments.join(SEP);
}

/** The map text with one node's line replaced. Every other line is the original. */
export function rewriteNode(text, name, changes) {
  const lines = text.split('\n');
  for (let i = 0; i < lines.length; i += 1) {
    const node = parseNodeLine(lines[i]);
    if (!node || node.name !== name) continue;
    lines[i] = formatNodeLine(node, changes);
    return lines.join('\n');
  }
  throw new Error(`campaigns: no node named ${name} in this map`);
}

// --- the done-metrics table

/** Table cells, splitting on unescaped pipes so a command may hold one. */
function splitRow(line) {
  const inner = line.trim().replace(/^\|/, '').replace(/\|$/, '');
  return inner.split(/(?<!\\)\|/);
}

const unescapePipes = (cell) => cell.replace(/\\\|/g, '|');

function parseMetricRow(line, index) {
  const cells = splitRow(line);
  if (cells.length < 5) return null;
  const [command, ...rest] = unescapePipes(cells[1]).trim().split(SEP);
  const repo = rest
    .map((s) => (s.startsWith('repo: ') ? s.slice(6).trim() : null))
    .find(Boolean) ?? null;
  return {
    lineIndex: index,
    cells,
    metric: cells[0].trim(),
    command: command.trim().replace(/^`/, '').replace(/`$/, ''),
    start: cells[2].trim(),
    target: cells[3].trim(),
    current: cells[4].trim(),
    repo,
  };
}

/** The map's regions. `lines` is the file; everything else points into it. */
export function parseMap(text) {
  const lines = text.split('\n');
  const map = { lines, title: null, header: {}, metrics: [], nodes: [], waits: [] };

  let section = null;
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    if (line.startsWith('# ')) {
      map.title = line.slice(2).trim();
      continue;
    }
    if (line.startsWith('## ')) {
      section = line.slice(3).trim();
      continue;
    }
    if (section === null && line.includes(': ')) {
      for (const pair of line.split(SEP)) {
        const at = pair.indexOf(': ');
        if (at !== -1) map.header[pair.slice(0, at).trim()] = pair.slice(at + 2).trim();
      }
      continue;
    }
    if (section === 'Done-metrics' && line.startsWith('|')) {
      if (/^\|\s*Metric\s*\|/.test(line) || /^\|[-|\s]+\|$/.test(line)) continue;
      const row = parseMetricRow(line, i);
      if (row) map.metrics.push(row);
      continue;
    }
    if (section === 'Waits' && line.startsWith('- ')) {
      map.waits.push(line.slice(2).trim());
      continue;
    }
    const node = parseNodeLine(line);
    if (node) map.nodes.push({ ...node, lineIndex: i });
  }
  return map;
}

// --- claims, read from the refs (decision 0135)

const GIT_TIMEOUT_MS = 1000;
/** Refs read per repository. A ref list longer than this is a repository whose
 *  branches nobody prunes, and the frontier is not the place to pay for it. */
const REF_CAP = 50;

/**
 * One git call, or `null`. Every read here fails open: a frontier that cannot
 * reach git is the local frontier, which is what it was before this existed.
 */
function git(root, args, input = '') {
  const run = spawnSync('git', args, {
    cwd: root,
    encoding: 'utf8',
    timeout: GIT_TIMEOUT_MS,
    input,
    stdio: ['pipe', 'pipe', 'ignore'],
  });
  if (run.error || run.status !== 0 || typeof run.stdout !== 'string') return null;
  return run.stdout;
}

/** The local branches and remote-tracking refs of `root`, capped. */
export function refsOf(root, { cap = REF_CAP } = {}) {
  const out = git(root, ['for-each-ref', '--format=%(refname)', 'refs/heads', 'refs/remotes']);
  if (out === null) return [];
  return out.split('\n').map((line) => line.trim()).filter(Boolean).slice(0, cap);
}

/**
 * The claims other refs carry on this map, by node name (decision 0135).
 * `DESIGN.md §9` puts a claim on the node's branch — `[active] … @owner`
 * committed there — so the working tree of a session that has not merged it
 * shows the node as `ready`. This is the read that sees it.
 *
 * Each value is the first claim the refs carry, which is what the frontier
 * prints, and `all` holds every distinct owner and branch the refs claim the
 * node for, which is what `claim` compares against (decision 0170).
 *
 * Two processes whatever the number of branches: one `for-each-ref`, one
 * `cat-file --batch-check` over `<ref>:<map>`, and then one `cat-file blob` per
 * **distinct** version of the map, which is one or two even on a repository
 * with fifty branches. The fetch that makes a remote-tracking ref current is
 * `status`'s alone (decision 0080); nothing here reaches the network.
 */
export function claimsOnRefs(mapPath, { root = null, refs = null } = {}) {
  const claims = new Map();
  if (root === null) return claims;
  const list = refs ?? refsOf(root);
  if (list.length === 0) return claims;

  const rel = relative(root, mapPath).split(sep).join('/');
  const check = git(root, ['cat-file', '--batch-check'], `${list.map((ref) => `${ref}:${rel}`).join('\n')}\n`);
  if (check === null) return claims;

  const versions = new Map(); // blob oid → the first ref that carries it
  check.split('\n').filter(Boolean).forEach((line, index) => {
    const [oid, type] = line.split(' ');
    if (type !== 'blob' || versions.has(oid)) return;
    versions.set(oid, list[index]);
  });

  for (const [oid, ref] of versions) {
    const text = git(root, ['cat-file', 'blob', oid]);
    if (text === null) continue;
    for (const node of parseMap(text).nodes) {
      if (node.status !== 'active' && node.status !== 'review') continue;
      const value = (key) => (node.fields[key] && node.fields[key] !== EMPTY ? node.fields[key] : null);
      const claim = { owner: value('owner'), branch: value('branch'), ref, status: node.status };
      const first = claims.get(node.name);
      if (!first) claims.set(node.name, { ...claim, all: [claim] });
      else if (!first.all.some((c) => c.owner === claim.owner && c.branch === claim.branch)) first.all.push(claim);
    }
  }
  return claims;
}

// --- the frontier

const SETTLED = new Set(['done', 'dropped']);

/**
 * What can be started, what cannot, and why (decision 0053). A node line
 * carries a status a human wrote and a `deps:` list nothing keeps in step with
 * it; the frontier is the intersection, and a `ready` node whose dependency is
 * still open is reported as waiting rather than proposed. `waiting` is a line in
 * this output, never a status written back into a map.
 */
export function frontier(map, { claims = null } = {}) {
  const byName = new Map(map.nodes.map((n) => [n.name, n]));
  const open = (dep) => {
    const node = byName.get(dep);
    return !node || !SETTLED.has(node.status);
  };

  const out = { ready: [], held: [], claimed: [], blocked: [], fog: [], active: [], waits: map.waits, counts: '' };
  for (const node of map.nodes) {
    if (node.status === 'ready') {
      const by = node.deps.filter(open);
      // A held node is not offered either way, and a dependency in the open is
      // the more urgent of the two disagreements: it stays held.
      if (by.length > 0) out.held.push({ node, by });
      else {
        const claim = claims?.get(node.name) ?? null;
        if (claim) out.claimed.push({ node, claim });
        else out.ready.push(node);
      }
    } else if (node.status === 'blocked') out.blocked.push(node);
    else if (node.status === 'fog') out.fog.push(node);
    else if (node.status === 'active' || node.status === 'review') out.active.push(node);
  }
  out.counts = [
    `${out.ready.length} ready`,
    out.claimed.length > 0 ? `${out.claimed.length} claimed` : null,
    out.held.length > 0 ? `${out.held.length} waiting` : null,
    `${out.blocked.length} blocked`,
    `${out.fog.length} fog`,
  ].filter(Boolean).join(' / ');
  return out;
}

/**
 * The same counts with the zeros dropped, for the digest row of
 * `FORMATS.md §12`. The two forms differ on purpose: the digest is capped and
 * one map is one segment of one line, while the block below it is the full
 * report, where `0 fog` is a signal — a map with no fog is one nobody has
 * thought about (`campaign/references/map.md §2`).
 */
export function shortCounts(f) {
  return [
    [f.ready.length, 'ready'],
    [f.claimed.length, 'claimed'],
    [f.held.length, 'waiting'],
    [f.blocked.length, 'blocked'],
    [f.fog.length, 'fog'],
  ].filter(([n]) => n > 0).map(([n, name]) => `${n} ${name}`).join(' / ') || 'nothing open';
}

/** The frontier as the lines `status` and the campaign skill read. */
export function formatFrontier(slug, f, { byName = null } = {}) {
  const known = byName ?? new Set();
  const gist = (node) => `${node.name} — ${node.gist}`;
  const lines = [`${slug}: ${f.counts}`];
  for (const node of f.ready) lines.push(`ready: ${gist(node)}`);
  for (const { node, claim } of f.claimed) {
    // The branch is the claim's own statement of where it was made; the ref it
    // was read from stands in when the line carries none.
    const owner = claim.owner ? ` · owner: ${claim.owner}` : '';
    const branch = ` · branch: ${claim.branch ?? claim.ref}`;
    lines.push(`claimed: ${gist(node)}${owner}${branch}`);
  }
  for (const { node, by } of f.held) {
    const named = by.map((dep) => (known.has(dep) ? dep : `${dep} (no such node)`)).join(', ');
    lines.push(`waiting: ${gist(node)} · on: ${named}`);
  }
  for (const node of f.blocked) {
    lines.push(`blocked: ${gist(node)}${node.fields.by ? ` · by: ${node.fields.by}` : ''}`);
  }
  for (const node of f.fog) lines.push(`fog: ${gist(node)}`);
  for (const node of f.active) {
    // A claim is `[active] … @owner` on the node's branch (DESIGN.md §9), so the
    // branch is half of what `status` reports and belongs on the same line.
    const claim = ['owner', 'branch']
      .filter((key) => node.fields[key] && node.fields[key] !== EMPTY)
      .map((key) => ` · ${key}: ${node.fields[key]}`)
      .join('');
    lines.push(`active: ${gist(node)}${claim}`);
  }
  for (const wait of f.waits) lines.push(`wait: ${wait}`);
  return lines.join('\n');
}

// --- measuring

const TIMEOUT_MS = 60_000; // decision 0055

const today = (now) => now.toISOString().slice(0, 10);

/**
 * The map with its `Current (date)` cells refreshed (decision 0055): every
 * command is echoed before it runs and bounded at a minute. A command that
 * fails or times out leaves its cell exactly as it was — the previous number
 * with the date it was true on — and says why, because a metric nobody could
 * measure is not a metric that moved.
 */
export function measureMap(text, options = {}) {
  const { cwd = process.cwd(), repoDir = null, known = [], timeoutMs = TIMEOUT_MS, now = new Date() } = options;
  const log = options.log ?? ((line) => process.stdout.write(`${line}\n`));

  const lines = text.split('\n');
  const results = [];
  for (const row of parseMap(text).metrics) {
    log(`measure: ${row.metric} → ${row.command}`);
    // A row carrying ` · repo:` runs in that repository's git root, and the
    // rest in the git root of the repository the map lives in (decision 0075).
    // A name nothing resolves leaves its cell where a timeout would: this is
    // one row of a table, not a reason to stop the command (decision 0055).
    const where = row.repo ? repoDir?.(row.repo) ?? null : cwd;
    if (where === null) {
      const missing =
        known.length > 0
          ? `no repository named ${row.repo} — known: ${known.join(', ')}`
          : `no repository named ${row.repo}`;
      results.push({ metric: row.metric, command: row.command, value: null, reason: missing });
      log(`  not measured — ${missing}; ${row.metric} stays at ${row.current}`);
      continue;
    }
    const run = spawnSync('sh', ['-c', row.command], { cwd: where, timeout: timeoutMs, encoding: 'utf8' });
    const timedOut = run.error?.code === 'ETIMEDOUT' || (run.signal !== null && run.signal !== undefined);
    const value = (run.stdout ?? '').trim();

    let reason = null;
    if (timedOut) reason = `timed out after ${timeoutMs}ms`;
    else if (run.error) reason = run.error.message;
    else if (run.status !== 0) reason = `exit ${run.status}${run.stderr ? `: ${run.stderr.trim()}` : ''}`;
    else if (value === '') reason = 'no output';

    results.push({ metric: row.metric, command: row.command, value: reason ? null : value, reason });
    if (reason) {
      log(`  not measured — ${reason}; ${row.metric} stays at ${row.current}`);
      continue;
    }
    const cells = row.cells.slice();
    cells[4] = ` ${value} (${today(now)}) `;
    lines[row.lineIndex] = `|${cells.join('|')}|`;
    log(`  ${row.metric}: ${row.current} → ${value}`);
  }
  return { text: lines.join('\n'), results };
}

// --- the lookup, and the boundary it does not cross

const CAMPAIGNS_REL = ['.claude', 'hodos', 'campaigns'];

/**
 * The `campaigns/` directories `config.campaigns.external[]` names, resolved,
 * each with the project directory it sits under. The project directory is what
 * says whether an entry is a **missing checkout** or a checkout that simply
 * keeps no maps of its own: the second is the normal state of an external
 * repository, since the map lives in the home one.
 */
export function externalDirs(startDir, config = {}) {
  const anchor = gitRoot(startDir) ?? resolve(startDir);
  return (config.campaigns?.external ?? []).map((entry) => {
    const dir = isAbsolute(entry) ? resolve(entry) : resolve(anchor, entry);
    return { entry, dir, project: dirname(dirname(dirname(dir))) };
  });
}

const isDir = (path) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

/** The `*.md` in one `campaigns/` directory, or `null` when it cannot be read. */
function mapsIn(campaigns) {
  let entries;
  try {
    entries = readdirSync(campaigns).sort();
  } catch {
    return null;
  }
  // `.claude/hodos/campaigns` → the project directory `.claude/hodos/` sits in.
  const dir = dirname(dirname(dirname(campaigns)));
  const root = gitRoot(campaigns) ?? dir;
  return entries
    .filter((entry) => entry.endsWith('.md'))
    .map((entry) => ({ slug: basename(entry, '.md'), path: join(campaigns, entry), dir, root }));
}

/**
 * Every map visible from `startDir`: the walk to the git root first — a session
 * in `spa/` sees the monorepo root's maps — then the other repositories
 * `config.campaigns.external[]` names, in the order it names them. The nearer
 * map wins a slug, which is what makes the walk's order the precedence.
 *
 * `config` is taken rather than read where the caller already has it: the
 * digest holds the merged config and a second `JSON.parse` on the SessionStart
 * budget buys nothing.
 */
export function findMaps(startDir = process.cwd(), config = null) {
  const found = config ?? (() => {
    const at = findConfig(startDir);
    return at.notFound ? {} : at.config;
  })();

  const out = [];
  const seen = new Set();
  const add = (campaigns) => {
    for (const map of mapsIn(campaigns) ?? []) {
      if (seen.has(map.path)) continue;
      seen.add(map.path);
      out.push(map);
    }
  };
  for (const dir of ancestors(startDir)) add(join(dir, ...CAMPAIGNS_REL));
  for (const { dir } of externalDirs(startDir, found)) add(dir);
  return out;
}

/**
 * The directory a `repo: <name>` names, or `null` (decision 0134). A name is a
 * repository **root's own directory name**, and the roots it is looked for in
 * are the three a session can know about without a new config key: the
 * repository this session stands in, the one the map lives in, and the ones
 * `config.campaigns.external[]` names — read from both of those configs,
 * because the home config is where a map's `repo:` names are declared and the
 * session's is where its own siblings are.
 */
function repoRoots({ root = null, startDir = process.cwd() } = {}) {
  const seen = new Set();
  const roots = [];
  const addRoot = (dir) => {
    if (!dir || seen.has(dir) || !isDir(dir)) return;
    seen.add(dir);
    roots.push(dir);
  };
  addRoot(gitRoot(startDir));
  addRoot(root);
  for (const dir of [startDir, root].filter(Boolean)) {
    const at = findConfig(dir);
    if (at.notFound) continue;
    for (const { project } of externalDirs(dir, at.config)) {
      if (isDir(project)) addRoot(gitRoot(project) ?? project);
    }
  }
  return roots;
}

export function resolveRepo(name, options = {}) {
  return repoRoots(options).find((dir) => basename(dir) === name) ?? null;
}

/**
 * The names a `repo:` field could have used, in the order they are searched —
 * so that a name nothing resolves is reported beside the ones that would have
 * (decision 0134). Deduplicated: two entries pointing at one root are one name.
 */
export function knownRepos(options = {}) {
  return [...new Set(repoRoots(options).map((dir) => basename(dir)))];
}

class Stop extends Error {}

/** The named map, parsed — from this repository or from an external one. */
function openMap(slug, startDir = process.cwd()) {
  const found = findMaps(startDir);
  const entry = found.find((m) => m.slug === slug);
  if (!entry) {
    const known = found.map((m) => m.slug).join(', ') || 'none';
    throw new Stop(`no campaign map named ${slug} (maps here: ${known})`);
  }
  const text = readFileSync(entry.path, 'utf8');
  return { ...entry, text, map: parseMap(text) };
}

// --- CLI

class Usage extends Error {}

/** A missing positional or flag is a bad invocation (exit 2), not a bad map. */
function need(value, what) {
  if (value === undefined) {
    process.stderr.write(`campaigns: ${what}\n${USAGE}\n`);
    throw new Usage();
  }
  return value;
}

/** Flags that take no value. */
const SWITCHES = new Set(['force']);

/**
 * `argv` split into positionals and `--flag value` pairs, before any command
 * destructures it. Reading the flags out first is what stops a typo landing in
 * the map: `claim c n --ref task:x feature/x` has three positionals and one
 * flag, not four positionals, and a flag whose value is another flag — or
 * missing — is a bad invocation rather than a value.
 */
function parseArgs(argv, what) {
  const positionals = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith('--')) {
      positionals.push(arg);
      continue;
    }
    if (SWITCHES.has(arg.slice(2))) {
      flags[arg.slice(2)] = true;
      continue;
    }
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      need(undefined, `${arg} needs a value — ${what}`);
    }
    flags[arg.slice(2)] = value;
    i += 1;
  }
  return { positionals, flags };
}

/** Where each metric row of `entry`'s map runs (decisions 0075, 0134). */
function measureIn(entry, dir) {
  return {
    cwd: entry.root,
    repoDir: (name) => resolveRepo(name, { root: entry.root, startDir: dir }),
    known: knownRepos({ root: entry.root, startDir: dir }),
  };
}

function cmdMeasure(slug, dir) {
  const entry = openMap(slug, dir);
  const { text } = measureMap(entry.text, measureIn(entry, dir));
  if (text !== entry.text) writeFileSync(entry.path, text);
  return 0;
}

/**
 * Where the map lives, when that is not this repository (decision 0137).
 * `DESIGN.md §9` has a `finish` in another repository edit the home map and
 * ask the human to commit it: this run writes the file and prints the command,
 * because a commit in a checkout the session was never asked to touch is the
 * developer's to make — and "clean" is also true of a colleague's repository
 * mid-review. No key turns this into an auto-commit (decision 0090).
 */
function noteHomeMap(entry, dir, slug, node, verb) {
  const here = gitRoot(dir);
  if (here !== null && entry.root === here) return;
  const rel = relative(entry.root, entry.path).split(sep).join('/');
  const add = `git -C ${entry.root} add ${rel}`;
  // The subject is the home repository's, because its hooks are what check it
  // (decision 0174): a subject no convention reads was refused by `cog verify`
  // on the first project that checks. It carries no scope, because a project
  // may allowlist its scopes and the pilot's did (decision 0181). A ticket id
  // or a custom pattern is not this script's to invent, so those two get the
  // add and the convention named.
  const convention = homeConvention(entry);
  if (convention === 'conventional') {
    process.stdout.write(
      `campaigns: the map is in ${entry.root}, not in this repository — commit it there:\n`
        + `  ${add} && git -C ${entry.root} commit -m "chore: ${node} ${verb} in campaign ${slug}"\n`,
    );
    return;
  }
  process.stdout.write(
    `campaigns: the map is in ${entry.root}, not in this repository — commit it there:\n`
      + `  ${add}\n`
      + `  then commit it with a subject in that repository's conventions.commit (${convention})\n`,
  );
}

/** The home repository's `conventions.commit`, `conventional` where it states none (`FORMATS.md §2`). */
function homeConvention(entry) {
  const found = findConfig(dirname(entry.path));
  const value = found.notFound ? null : found.config?.conventions?.commit;
  return typeof value === 'string' && value !== '' ? value : 'conventional';
}

/**
 * The claims other refs carry on `node` that are not this one, every one of
 * them, or an empty list. The frontier already reads the refs (decision 0135);
 * the write reads them too, because a rule carried only by the skill's
 * sentence is off wherever that sentence is not read (decision 0170). The same
 * owner on the same branch is this claim written again — a resumed
 * `map.md §6` — and is not refused by its own earlier write.
 */
export function foreignClaims(claims, node, owner, branch) {
  const held = claims.get(node);
  if (!held) return [];
  return held.all.filter((c) => c.owner !== owner || c.branch !== branch);
}

function cmdClaim(argv, dir) {
  const what = 'claim needs <slug> <node> <owner> <branch> [--ref task:<slug>] [--force]';
  const { positionals, flags } = parseArgs(argv, what);
  const [slug, node, owner, branch] = positionals;
  need(branch, what);
  const entry = openMap(slug, dir);
  const ref = flags.ref ?? `task:${node}`; // decision 0054
  const held = foreignClaims(claimsOnRefs(entry.path, { root: entry.root }), node, owner, branch);
  const holders = held.map((c) => `${c.owner ?? 'nobody named'} on ${c.branch ?? 'no branch named'} (${c.ref})`);
  if (held.length > 0 && !flags.force) {
    throw new Stop(
      `${slug}/${node} is already claimed by ${holders.join(', and by ')} — nothing was written. ` +
        'Settle it with them; once they agree, the same claim with --force takes it over.',
    );
  }
  writeFileSync(entry.path, rewriteNode(entry.text, node, { status: 'active', owner, branch, ref }));
  process.stdout.write(`${slug}/${node} — active, ${owner}, ${branch}, ${ref}\n`);
  if (held.length > 0) {
    const claims = held.length === 1 ? 'claim' : 'claims';
    process.stdout.write(`claim: --force overrode the ${claims} of ${holders.join(', and of ')}\n`);
  }
  noteHomeMap(entry, dir, slug, node, 'claimed');
  return 0;
}

const SETTABLE = ['status', 'gist', 'deps', 'owner', 'branch', 'ref', 'metric', 'by'];

function cmdSet(argv, dir) {
  const what = 'set needs <slug> <node> and at least one --<field> <value>';
  const { positionals, flags } = parseArgs(argv, what);
  const [slug, node] = positionals;
  need(node, what);
  const changes = {};
  for (const field of SETTABLE) {
    if (flags[field] !== undefined) changes[field] = flags[field];
  }
  if (Object.keys(changes).length === 0) {
    need(undefined, `set needs at least one of ${SETTABLE.map((f) => `--${f}`).join(' ')}`);
  }
  if (changes.status !== undefined && !STATUSES.includes(changes.status)) {
    need(undefined, `set --status takes one of ${STATUSES.join(' ')}`);
  }
  if (changes.gist !== undefined) {
    // Free text, and the one way free text could corrupt the grammar is by
    // carrying the field separator: that would forge a field (decision 0136).
    if (changes.gist.includes(SEP)) {
      need(undefined, `set --gist takes free text without the field separator "${SEP}" in it — that separator makes a field`);
    }
    if (changes.gist.trim() === '') need(undefined, 'set --gist takes the sentence the node is read by, not nothing');
  }
  const entry = openMap(slug, dir);
  writeFileSync(entry.path, rewriteNode(entry.text, node, changes));
  process.stdout.write(`${slug}/${node} — ${Object.entries(changes).map(([k, v]) => `${k}: ${v}`).join(', ')}\n`);
  noteHomeMap(entry, dir, slug, node, 'updated');
  return 0;
}

/**
 * The node lines that still point at a node just closed (decision 0056). The
 * status is not touched: a deliberate `[blocked]` is a human's judgement and
 * outranks a satisfied dependency list (decision 0053). This says what a reader
 * scanning a ten-node map misses, and `set` is how the human answers it.
 */
function stillNaming(map, name) {
  // `\b` would match inside `web-errors` when the closed node is `errors`, and
  // §8a asks the reader to act on every line this prints — a name that is not
  // there costs a `set` that should not happen.
  const named = new RegExp(`(^|[^\\w-])${name}([^\\w-]|$)`);
  return map.nodes
    .filter((n) => n.name !== name)
    .filter((n) => n.deps.includes(name) || named.test(n.fields.by ?? ''))
    .map((n) => n.name);
}

function cmdNodeDone(argv, dir) {
  const what = 'node-done needs <slug> <node> --sha <ref>';
  const { positionals, flags } = parseArgs(argv, what);
  const [slug, node] = positionals;
  const ref = need(flags.sha, what);
  const entry = openMap(slug, dir);
  // A ref, resolved where its commit is (decision 0197): first the repository
  // the close runs in, where a rebase at landing gave the node's commit a sha
  // nobody knew when the command was written; then the map's own, where a
  // decision node's map commit lives (campaign map.md §8). Only the exit status
  // is read (fact 71).
  const resolveIn = (root) => git(root, ['rev-parse', '--short', '--verify', '--quiet', `${ref}^{commit}`])?.trim();
  // The map is local when it sits in this git root, which a subdirectory's
  // cwd is not; noteHomeMap draws the same line.
  const local = entry.root === gitRoot(dir);
  const sha = resolveIn(dir) || (local ? null : resolveIn(entry.root));
  if (!sha) {
    const where = local ? '' : ` or in ${entry.root}`;
    process.stderr.write(`node-done: ${ref} is not a commit here${where}\n`);
    return 1;
  }
  const withNode = rewriteNode(entry.text, node, { status: 'done', ref: `sha:${sha}` });
  const { text } = measureMap(withNode, measureIn(entry, dir));
  writeFileSync(entry.path, text);
  process.stdout.write(`${slug}/${node} — done, sha:${sha}\n`);
  noteHomeMap(entry, dir, slug, node, 'done');

  const stale = stillNaming(parseMap(text), node);
  if (stale.length > 0) {
    process.stdout.write(
      `node-done: ${stale.join(', ')} still name ${node} in deps: or by: — ${stale.length} line${stale.length === 1 ? '' : 's'} may be stale\n`,
    );
  }
  return 0;
}

/**
 * The maps, and one note per `external[]` entry nothing is checked out at. The
 * note is on stderr and the exit code is 0: a colleague's checkout the
 * developer does not have is a normal state of a shared config, and a typo in
 * that list would otherwise be invisible.
 */
function cmdFind(dir) {
  const at = findConfig(dir);
  const config = at.notFound ? {} : at.config;
  for (const { entry, project } of externalDirs(dir, config)) {
    if (!isDir(project)) {
      process.stderr.write(`campaigns: external[] names ${entry}, and ${project} is not there — skipped\n`);
    }
  }
  for (const entry of findMaps(dir, config)) process.stdout.write(`${entry.slug} — ${entry.path}\n`);
  return 0;
}

function main(argv) {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    process.stdout.write(`${USAGE}\n`);
    return argv.length === 0 ? 2 : 0;
  }
  const [command, ...rest] = argv;
  try {
    switch (command) {
      case 'find':
        return cmdFind(rest[0] ?? process.cwd());
      case 'frontier': {
        if (!rest[0]) throw new Stop('frontier needs a campaign slug');
        const entry = openMap(rest[0], process.cwd());
        const names = new Set(entry.map.nodes.map((n) => n.name));
        const claims = claimsOnRefs(entry.path, { root: entry.root });
        const f = frontier(entry.map, { claims });
        process.stdout.write(`${formatFrontier(entry.slug, f, { byName: names })}\n`);
        return 0;
      }
      case 'measure':
        if (!rest[0]) throw new Stop('measure needs a campaign slug');
        return cmdMeasure(rest[0], process.cwd());
      case 'claim':
        return cmdClaim(rest, process.cwd());
      case 'node-done':
        return cmdNodeDone(rest, process.cwd());
      case 'set':
        return cmdSet(rest, process.cwd());
      default:
        process.stderr.write(`campaigns: unknown command: ${command}\n${USAGE}\n`);
        return 2;
    }
  } catch (error) {
    if (error instanceof Usage) return 2;
    if (!(error instanceof Stop)) {
      // rewriteNode's "no node named x" is the same class of answer as a map
      // that is not there: the caller named something the map does not carry.
      if (!/^campaigns: /.test(error.message)) throw error;
      process.stderr.write(`${error.message}\n`);
      return 1;
    }
    process.stderr.write(`campaigns: ${error.message}\n`);
    return 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
