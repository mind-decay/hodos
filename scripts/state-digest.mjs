#!/usr/bin/env node
// state-digest.mjs — the SessionStart digest (FORMATS.md §12, DESIGN.md §10).
//
// Incident behind the cap: a resume note that grows with the number of tasks
// eats the context it is meant to save, and this text is prepended to every
// session in the project (PLATFORM-NOTES.md fact 3). The bare mode is therefore
// capped at 300 tokens (AUTHORING.md §7, counted as chars/4) and drops rows
// rather than lengthening; `--full` is for `status`, which the developer asked
// for and can read at any length.
//
// The digest states, never instructs: it is context, and a hook that tells the
// model what to do fires in sessions that have nothing to do with hodos.

import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { crossRepoReason, findMaps, formatFrontier, frontier, parseMap, shortCounts } from './campaigns.mjs';
import { activeTask, findConfig } from './config.mjs';
import { anchors, barePaths, citations, verifyAnchors, verifyFile } from './verify-citations.mjs';

const TOKEN_CAP = 300; // AUTHORING.md §7
const CHARS_PER_TOKEN = 4;
const CHAR_CAP = TOKEN_CAP * CHARS_PER_TOKEN;
const DEFAULT_STALE_DAYS = 14;

const USAGE = `Usage: node scripts/state-digest.mjs [--full|--compact]

Prints the hodos state of the current project as context (FORMATS.md §12).

  (bare)      the SessionStart digest, capped at ${TOKEN_CAP} tokens.
  --full      the same content with no cap, for /hodos:status.
  --compact   the active task's ledger path and the resume line, for
              SessionStart(compact).
  --help      print this and exit 0.

With no config, prints nothing. Exit codes: 0 — always; 2 — bad invocation.`;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Every task directory that has a state.json, with its ledger's age in days. */
function tasks(projectRoot) {
  const dir = join(projectRoot, '.claude', 'hodos', 'tasks');
  let entries;
  try {
    entries = readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }
  const out = [];
  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const taskDir = join(dir, entry.name);
    let state;
    try {
      state = JSON.parse(readFileSync(join(taskDir, 'state.json'), 'utf8'));
    } catch {
      continue; // a directory without derived state is not yet a task
    }
    let ageDays = 0;
    try {
      ageDays = Math.floor((Date.now() - statSync(join(taskDir, 'ledger.md')).mtimeMs) / DAY_MS);
    } catch {
      ageDays = 0;
    }
    out.push({ slug: entry.name, state, ageDays, taskDir });
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug));
}


/**
 * One entry per campaign map: its frontier, or the reason this version will not
 * read it. Called in-process rather than as a subprocess — this runs on the
 * SessionStart latency budget, and a second Node start costs more than the line
 * is worth. A map that cannot be parsed drops out silently: the digest is
 * context, and a broken file in it must not cost the session its state.
 */
function campaigns(projectRoot, config) {
  const out = [];
  for (const entry of findMaps(projectRoot)) {
    try {
      const map = parseMap(readFileSync(entry.path, 'utf8'));
      const reason = crossRepoReason(map, config);
      if (reason) out.push({ slug: entry.slug, stage9b: true });
      else out.push({ slug: entry.slug, f: frontier(map), names: new Set(map.nodes.map((n) => n.name)) });
    } catch {
      // not a map this version can read
    }
  }
  return out;
}

/**
 * One git call, or nothing. The digest runs on the SessionStart latency budget,
 * so every offer below is written to fail open and to spend no process it can
 * avoid: `git` is asked only after the free checks have already passed.
 */
function git(projectRoot, args) {
  try {
    return execFileSync('git', args, {
      cwd: projectRoot,
      encoding: 'utf8',
      timeout: 1000,
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim();
  } catch {
    return null;
  }
}

/** The branch HEAD is on, read from `.git/HEAD` before any process is spawned. */
function headBranch(projectRoot) {
  let text;
  try {
    text = readFileSync(join(projectRoot, '.git', 'HEAD'), 'utf8').trim();
  } catch {
    // A worktree, a submodule, or a config that sits below the git root: ask git.
    const name = git(projectRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
    return name === 'HEAD' ? null : name;
  }
  const m = /^ref: refs\/heads\/(.+)$/.exec(text);
  return m ? m[1] : null; // detached HEAD is a sha, and no branch to review
}

/** The repository's default branch: what origin says, else main, else master. */
function defaultBranch(projectRoot) {
  // The common session is on the default branch and ends here, having spawned
  // nothing: a clone writes this file, and only a repository without it pays
  // for the two calls below.
  try {
    const m = /^ref: refs\/remotes\/[^/]+\/(.+)$/.exec(
      readFileSync(join(projectRoot, '.git', 'refs', 'remotes', 'origin', 'HEAD'), 'utf8').trim(),
    );
    if (m) return m[1];
  } catch {
    // not written, or packed: ask git
  }
  const head = git(projectRoot, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  if (head) return head.replace(/^[^/]+\//, '');
  for (const name of ['main', 'master']) {
    if (git(projectRoot, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`])) return name;
  }
  return null;
}

/**
 * Priority 1 (FORMATS.md §12): work on a branch this repository's default is
 * not, ahead of its upstream, with no hodos task on it — a diff hodos did not
 * write and nothing has reviewed.
 */
function reviewOffer(projectRoot, all) {
  const branch = headBranch(projectRoot);
  if (!branch) return null;
  if (all.some((t) => t.state.branch === branch)) return null; // hodos is on it
  const dflt = defaultBranch(projectRoot);
  if (!dflt || branch === dflt) return null;
  const upstream = git(projectRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{upstream}']);
  if (!upstream) return null; // nothing to be ahead of
  const ahead = Number(git(projectRoot, ['rev-list', '--count', `${upstream}..HEAD`]));
  if (!Number.isInteger(ahead) || ahead < 1) return null;
  const commits = `${ahead} commit${ahead === 1 ? '' : 's'}`;
  return `- offer: review — ${branch} is ${commits} ahead of ${upstream} with no hodos task — /hodos:review ${branch}`;
}

/** Priority 2: a stale task, and the third verb its own row does not carry. */
function handoffOffer(stale) {
  if (stale.length === 0) return null;
  const t = stale[0];
  return `- offer: handoff — ${t.slug} has been open ${t.ageDays} days — /hodos:handoff ${t.slug}`;
}

/**
 * Priority 3: precedent decay (decisions 0082 and 0078). The count is of
 * precedents that have rotted — a citation that no longer resolves, or an
 * anchor whose text has moved out from under it — which is the one thing about
 * a rule a script can prove; it is not a claim that any rule is dead, and
 * `--prune` makes none either.
 */
function pruneOffer(projectRoot) {
  const dir = join(projectRoot, '.claude', 'rules');
  if (!existsSync(dir)) return null;
  let dead = 0;
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.md')) continue;
      const rule = join(dir, entry.name);
      // One rot is one count, the dedupe `lintFile` and `--rules` already do
      // (decision 0078): a deleted line is a blank citation *and* a gone
      // anchor, and an offer that says seven where lint says five is an
      // offer the developer checks against lint and stops trusting.
      const rotted = verifyAnchors(rule, projectRoot);
      const anchored = new Set(rotted.map((r) => `${r.line}:${r.raw}`));
      dead += rotted.length + verifyFile(rule, projectRoot).filter((d) => !anchored.has(`${d.line}:${d.raw}`)).length;
    }
  } catch {
    return null; // an unreadable layer is not a finding the digest may raise
  }
  if (dead === 0) return null;
  const rotted = `${dead} rule precedent${dead === 1 ? ' has' : 's have'} rotted`;
  return `- offer: prune — ${rotted} — /hodos:status --prune`;
}

/**
 * At most one offer, highest priority first, and none when nothing holds
 * (FORMATS.md §12, decision 0081). Priority is by how long a precondition will
 * keep holding: the review offer is transient and the other two are chronic, so
 * a review offer that loses the slot is lost and a prune offer is not.
 */
function offer(projectRoot, all, stale) {
  return reviewOffer(projectRoot, all) ?? handoffOffer(stale) ?? pruneOffer(projectRoot);
}

/** Every path the rules and the map cite, however they cite it. */
function citedPaths(projectRoot) {
  const paths = new Set();
  const read = (file) => {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      return;
    }
    for (const c of citations(text)) paths.add(c.path);
    for (const a of anchors(text)) paths.add(a.path);
    for (const b of barePaths(text)) paths.add(b.path);
  };
  read(join(projectRoot, 'CLAUDE.md'));
  const dir = join(projectRoot, '.claude', 'rules');
  try {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.isFile() && entry.name.endsWith('.md')) read(join(dir, entry.name));
    }
  } catch {
    // no layer, nothing cited
  }
  return paths;
}

/**
 * The rot no file can see from inside itself: a path the layer cites that has
 * been renamed or deleted since `scanSha` (decision 0078). One row, and only
 * when there is some — `config verified <date>` never compared itself to HEAD,
 * which left the reconcile path waiting on a developer remembering `--refresh`
 * exists. `--name-status` because a rename's *old* name is the cited one, and
 * `--name-only` prints the new.
 */
function decayRow(projectRoot, config) {
  const sha = typeof config.scanSha === 'string' ? config.scanSha.trim() : '';
  if (sha === '') return null;
  const cited = citedPaths(projectRoot);
  if (cited.size === 0) return null;
  const log = git(projectRoot, ['log', '--diff-filter=RD', '--name-status', '--format=', `${sha}..HEAD`]);
  if (log === null) return null; // an unreachable sha is what `--refresh` reports, not the digest
  let gone = 0;
  for (const line of log.split('\n')) {
    const [status, from] = line.split('\t');
    if (!from || (status[0] !== 'R' && status[0] !== 'D')) continue;
    if (cited.has(from)) gone += 1;
  }
  if (gone === 0) return null;
  const paths = `${gone} cited path${gone === 1 ? '' : 's'}`;
  return `- decay: ${paths} renamed or deleted since the scan (${sha.slice(0, 7)}) — /hodos:init --refresh`;
}

export function digest(found, { full = false } = {}) {
  if (found.notFound) return '';
  const { config, projectRoot } = found;
  const staleDays = config.tasks?.staleDays ?? DEFAULT_STALE_DAYS;

  const all = tasks(projectRoot);
  const stale = all.filter((t) => t.ageDays >= staleDays);
  const active = all.filter((t) => !stale.includes(t) && t.state.phase !== 'done');

  const maps = campaigns(projectRoot, config);
  const counts = [
    `${active.length} active task${active.length === 1 ? '' : 's'}`,
    stale.length > 0 ? `${stale.length} stale task${stale.length === 1 ? '' : 's'}` : null,
    maps.length > 0 ? `${maps.length} campaign${maps.length === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  const verified = config.verifiedAt ? `config verified ${config.verifiedAt}` : 'config found';
  const header = `hodos: ${[verified, ...counts].join(' · ')}`;

  const rows = [
    ...active.map(
      (t) => `- ${t.slug} [${t.state.phase}] last: "${t.state.lastEvent ?? '—'}" — resume with /hodos:run ${t.slug}`,
    ),
    ...stale.map((t) => `- stale: ${t.slug} (${t.ageDays} days) — /hodos:status to fold or delete`),
    maps.length > 0
      ? `- campaigns: ${maps
          .map((m) => (m.stage9b ? `${m.slug} — cross-repository (Stage 9b)` : `${m.slug} — frontier ${shortCounts(m.f)}`))
          .join(' · ')}`
      : null,
    decayRow(projectRoot, config),
    // Last, so the cap drops it before it drops a row of state (FORMATS.md §12).
    offer(projectRoot, all, stale),
  ].filter(Boolean);

  if (full) {
    // The rows are a list and stay one per line; each map's frontier is a block
    // of its own, so `status` can read them apart at a glance.
    const blocks = maps
      .filter((m) => !m.stage9b)
      .map((m) => formatFrontier(m.slug, m.f, { byName: m.names }));
    return [[header, ...rows].join('\n'), ...blocks].join('\n\n');
  }

  const kept = [];
  let size = header.length;
  for (const row of rows) {
    // The last line must still fit the "and n more" pointer, so measure it first.
    const dropped = rows.length - kept.length;
    const pointer = `\n- … and ${dropped} more — /hodos:status`;
    if (size + row.length + 1 + pointer.length > CHAR_CAP) {
      kept.push(`- … and ${dropped} more — /hodos:status`);
      break;
    }
    kept.push(row);
    size += row.length + 1;
  }
  return [header, ...kept].join('\n');
}

// The session's task, not the project's: `activeTask` reads
// sessions/<id> first (decision 0047). The id comes from the environment
// rather than a hook payload because this script is also the `!` injection of
// every kernel, where stdin belongs to the shell — a blocking read there would
// abort the invocation at turn 0 (PLATFORM-NOTES.md fact 14). With no id it
// falls back to `active`, which is what it always read.
export function compactLine(found) {
  if (found.notFound) return '';
  const slug = activeTask(found.projectRoot);
  if (!slug) return '';
  // `/` on every platform: the line is quoted in COMPONENTS.md §4, in the
  // kernels and in the tests, and a reader types it into a shell.
  const ledger = `.claude/hodos/tasks/${slug}/ledger.md`;
  return `hodos: ${slug} — ledger ${ledger} — continue from the first open line`;
}

function main(argv) {
  let mode = 'bare';
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    }
    if (arg === '--full' || arg === '--compact') mode = arg.slice(2);
    else {
      process.stderr.write(`state-digest: unknown option: ${arg}\n${USAGE}\n`);
      return 2;
    }
  }

  const found = findConfig(process.cwd());
  const text = mode === 'compact' ? compactLine(found) : digest(found, { full: mode === 'full' });
  if (text !== '') process.stdout.write(`${text}\n`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
