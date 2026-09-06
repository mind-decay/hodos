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
// Until Stage 9b nothing here follows a path into another repository
// (decision 0052): a map or a config that would need one stops the command.

import { spawnSync } from 'node:child_process';
import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { ancestors, findConfig } from './config.mjs';

const USAGE = `Usage: node scripts/campaigns.mjs <command> [args]

The campaign maps of a project (FORMATS.md §11).

  find [dir]                     list the maps visible from dir, innermost first;
                                 prints nothing when the project has none.
  frontier <slug>                the ready / held / blocked / fog nodes and the waits.
  claim <slug> <node> <owner> <branch> [--ref task:<slug>]
                                 mark the node active and record who has it.
  set <slug> <node> --<field> <value>…
                                 write one or more of --status --deps --owner
                                 --branch --ref --metric --by on one node line.
  node-done <slug> <node> --sha <sha>
                                 mark the node done, point ref: at the sha, re-measure.
  measure <slug>                 run the done-metric commands and update Current.
  --help                         print this and exit 0.

Exit codes: 0 — done, a project with no maps included; 1 — a map that is
not there, or one that reaches into another repository (Stage 9b); 2 — bad
invocation.`;

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
  for (const [key, value] of Object.entries(changes)) {
    if (key === 'status') continue;
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

// --- the frontier

const SETTLED = new Set(['done', 'dropped']);

/**
 * What can be started, what cannot, and why (decision 0053). A node line
 * carries a status a human wrote and a `deps:` list nothing keeps in step with
 * it; the frontier is the intersection, and a `ready` node whose dependency is
 * still open is reported as held rather than proposed. `held` is a line in this
 * output, never a status written back into a map.
 */
export function frontier(map) {
  const byName = new Map(map.nodes.map((n) => [n.name, n]));
  const open = (dep) => {
    const node = byName.get(dep);
    return !node || !SETTLED.has(node.status);
  };

  const out = { ready: [], held: [], blocked: [], fog: [], active: [], waits: map.waits, counts: '' };
  for (const node of map.nodes) {
    if (node.status === 'ready') {
      const by = node.deps.filter(open);
      if (by.length === 0) out.ready.push(node);
      else out.held.push({ node, by });
    } else if (node.status === 'blocked') out.blocked.push(node);
    else if (node.status === 'fog') out.fog.push(node);
    else if (node.status === 'active' || node.status === 'review') out.active.push(node);
  }
  out.counts = [
    `${out.ready.length} ready`,
    out.held.length > 0 ? `${out.held.length} held` : null,
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
    [f.held.length, 'held'],
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
  for (const { node, by } of f.held) {
    const named = by.map((dep) => (known.has(dep) ? dep : `${dep} (no such node)`)).join(', ');
    lines.push(`held: ${gist(node)} · by: ${named}`);
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
  const { cwd = process.cwd(), timeoutMs = TIMEOUT_MS, now = new Date() } = options;
  const log = options.log ?? ((line) => process.stdout.write(`${line}\n`));

  const lines = text.split('\n');
  const results = [];
  for (const row of parseMap(text).metrics) {
    log(`measure: ${row.metric} → ${row.command}`);
    const run = spawnSync('sh', ['-c', row.command], { cwd, timeout: timeoutMs, encoding: 'utf8' });
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
 * Every map visible from `startDir`, innermost first: the walk ends at the git
 * root (`config.mjs` ancestors), which in 9a is the whole world. Stage 9b adds
 * `config.campaigns.external[]`; until then a project that declares one stops.
 */
export function findMaps(startDir = process.cwd()) {
  const out = [];
  for (const dir of ancestors(startDir)) {
    const campaigns = join(dir, ...CAMPAIGNS_REL);
    let entries;
    try {
      entries = readdirSync(campaigns).sort();
    } catch {
      continue;
    }
    for (const entry of entries) {
      if (!entry.endsWith('.md')) continue;
      out.push({ slug: basename(entry, '.md'), path: join(campaigns, entry), dir });
    }
  }
  return out;
}

/**
 * Why this map cannot be acted on before Stage 9b, or `null` (decision 0052).
 * Three things say a lookup would cross a repository boundary: the config's
 * external list, a node's `repo:`/`path:`, a metric row's `· repo:`. An em dash
 * is the empty value and says nothing.
 */
export function crossRepoReason(map, config = {}) {
  const external = config.campaigns?.external ?? [];
  if (external.length > 0) {
    const many = external.length === 1 ? 'another repository' : `${external.length} other repositories`;
    return `config.campaigns.external[] names ${many} (${external.join(', ')})`;
  }
  for (const node of map.nodes) {
    for (const key of ['repo', 'path']) {
      const value = node.fields[key];
      if (value && value !== EMPTY) return `node ${node.name} carries ${key}: ${value}`;
    }
  }
  for (const row of map.metrics) {
    if (row.repo) return `done-metric ${row.metric} carries repo: ${row.repo}`;
  }
  return null;
}

class Stop extends Error {}

/** The named map, parsed, with the 9b guard already applied. */
function openMap(slug, startDir = process.cwd()) {
  const found = findMaps(startDir);
  const entry = found.find((m) => m.slug === slug);
  if (!entry) {
    const known = found.map((m) => m.slug).join(', ') || 'none';
    throw new Stop(`no campaign map named ${slug} (maps here: ${known})`);
  }
  const text = readFileSync(entry.path, 'utf8');
  const map = parseMap(text);
  guard(map, startDir);
  return { ...entry, text, map };
}

function guard(map, startDir) {
  const found = findConfig(startDir);
  const reason = crossRepoReason(map, found.notFound ? {} : found.config);
  if (reason) throw new Stop(`cross-repository campaigns are Stage 9b — ${reason}`);
}

// --- CLI

// Every map is guarded before the first is printed: a listing that stops
// halfway has already told the caller about maps it will not talk about again.
class Usage extends Error {}

/** A missing positional or flag is a bad invocation (exit 2), not a bad map. */
function need(value, what) {
  if (value === undefined) {
    process.stderr.write(`campaigns: ${what}\n${USAGE}\n`);
    throw new Usage();
  }
  return value;
}

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
    const value = argv[i + 1];
    if (value === undefined || value.startsWith('--')) {
      need(undefined, `${arg} needs a value — ${what}`);
    }
    flags[arg.slice(2)] = value;
    i += 1;
  }
  return { positionals, flags };
}

function cmdMeasure(slug, dir) {
  const entry = openMap(slug, dir);
  const { text } = measureMap(entry.text, { cwd: entry.dir });
  if (text !== entry.text) writeFileSync(entry.path, text);
  return 0;
}

function cmdClaim(argv, dir) {
  const what = 'claim needs <slug> <node> <owner> <branch> [--ref task:<slug>]';
  const { positionals, flags } = parseArgs(argv, what);
  const [slug, node, owner, branch] = positionals;
  need(branch, what);
  const entry = openMap(slug, dir);
  const ref = flags.ref ?? `task:${node}`; // decision 0054
  writeFileSync(entry.path, rewriteNode(entry.text, node, { status: 'active', owner, branch, ref }));
  process.stdout.write(`${slug}/${node} — active, ${owner}, ${branch}, ${ref}\n`);
  return 0;
}

const SETTABLE = ['status', 'deps', 'owner', 'branch', 'ref', 'metric', 'by'];

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
  const entry = openMap(slug, dir);
  writeFileSync(entry.path, rewriteNode(entry.text, node, changes));
  process.stdout.write(`${slug}/${node} — ${Object.entries(changes).map(([k, v]) => `${k}: ${v}`).join(', ')}\n`);
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
  const what = 'node-done needs <slug> <node> --sha <sha>';
  const { positionals, flags } = parseArgs(argv, what);
  const [slug, node] = positionals;
  const sha = need(flags.sha, what);
  const entry = openMap(slug, dir);
  const withNode = rewriteNode(entry.text, node, { status: 'done', ref: `sha:${sha}` });
  const { text } = measureMap(withNode, { cwd: entry.dir });
  writeFileSync(entry.path, text);
  process.stdout.write(`${slug}/${node} — done, sha:${sha}\n`);

  const stale = stillNaming(parseMap(text), node);
  if (stale.length > 0) {
    process.stdout.write(
      `node-done: ${stale.join(', ')} still name ${node} in deps: or by: — ${stale.length} line${stale.length === 1 ? '' : 's'} may be stale\n`,
    );
  }
  return 0;
}

function cmdFind(dir) {
  const entries = findMaps(dir);
  for (const entry of entries) guard(parseMap(readFileSync(entry.path, 'utf8')), dir);
  for (const entry of entries) process.stdout.write(`${entry.slug} — ${entry.path}\n`);
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
        process.stdout.write(`${formatFrontier(entry.slug, frontier(entry.map), { byName: names })}\n`);
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
