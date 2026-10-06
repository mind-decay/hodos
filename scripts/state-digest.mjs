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

import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { claimsOnRefs, findMaps, formatFrontier, frontier, parseMap, refsOf, shortCounts } from './campaigns.mjs';
import { activeTask, findConfig, readState } from './config.mjs';
import { nextFacts, nextStep } from './ledger.mjs';
import { repointFile } from './permissions.mjs';
import { anchors, barePaths, citations, verifyAnchors, verifyFile } from './verify-citations.mjs';

const TOKEN_CAP = 300; // AUTHORING.md §7
const CHARS_PER_TOKEN = 4;
const CHAR_CAP = TOKEN_CAP * CHARS_PER_TOKEN;
const DEFAULT_STALE_DAYS = 14;
const FETCH_TIMEOUT_MS = 5000; // decision 0138

const USAGE = `Usage: node scripts/state-digest.mjs [--full|--compact|--row] [--repoint]

Prints the hodos state of the current project as context (FORMATS.md §12).

  (bare)      the SessionStart digest, capped at ${TOKEN_CAP} tokens.
  --full      the same content with no cap, for /hodos:status, ending on
              the one Next: line that continues this project.
  --compact   the active task's ledger path and the resume line, and its
              chat line, for SessionStart(compact).
  --row       one line, where the work is and the command that continues
              it, drawn by the band above the prompt; nothing when no task
              or campaign is open. Never fetches (decision 0203).
  --fetch     before reading the maps, git fetch --no-tags --quiet in each
              repository one lives in, so a claim made on another branch is
              seen. Refs only, ${FETCH_TIMEOUT_MS / 1000} seconds, failing
              open. Passed by /hodos:status and by no hook (decision 0080).
  --repoint   first move the scripts rule init wrote for another version of
              this plugin, in .claude/settings.local.json, to the running
              one; the digest says what moved. Passed by the session-start
              hook entry and by no kernel (decision 0204).
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
 * The one network call the engine makes (decisions 0080, 0138). It runs in the
 * repository each map lives in, updates remote-tracking refs and nothing else,
 * is bounded by `FETCH_TIMEOUT_MS`, and its failure is a line rather than an
 * error: a timeout, a missing remote and a credential prompt all leave the
 * local map to be reported as it stands. Only `/hodos:status` asks for it — a
 * hook that reached the network on every session start would be a cost every
 * session paid for a number most sessions do not read.
 */
export function fetchRepos(roots) {
  const failed = [];
  for (const root of roots) {
    // A repository with no remote is one of the three cases decision 0080
    // names, and `git fetch` exits 0 there — it has nothing to fetch from, so
    // the map is as of the last pull in the strongest sense.
    const remotes = spawnSync('git', ['remote'], {
      cwd: root,
      timeout: FETCH_TIMEOUT_MS,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
    const named = !remotes.error && remotes.status === 0 && (remotes.stdout ?? '').trim() !== '';
    const run = named
      ? spawnSync('git', ['fetch', '--no-tags', '--quiet'], {
        cwd: root,
        timeout: FETCH_TIMEOUT_MS,
        encoding: 'utf8',
        stdio: ['ignore', 'ignore', 'ignore'],
      })
      : null;
    if (run === null || run.error || run.status !== 0) failed.push(basename(root));
  }
  return failed;
}

/**
 * One entry per campaign map: its frontier, or the reason this version will not
 * read it. Called in-process rather than as a subprocess — this runs on the
 * SessionStart latency budget, and a second Node start costs more than the line
 * is worth. A map that cannot be parsed drops out silently: the digest is
 * context, and a broken file in it must not cost the session its state.
 */
function campaigns(projectRoot, config, { fetch = false } = {}) {
  const out = [];
  // One ref list per repository, however many maps it holds: the digest runs on
  // the SessionStart budget, and the claims of two maps in one repository are
  // read from the same refs (decision 0135). Local git only — the fetch is
  // `/hodos:status`'s alone (decision 0080).
  const refs = new Map();
  // The config is handed over rather than re-read: it also carries
  // `campaigns.external[]`, which is half of where the maps are (Stage 9b).
  const entries = findMaps(projectRoot, config);
  const roots = [...new Set(entries.map((entry) => entry.root).filter(Boolean))];
  const failed = fetch ? fetchRepos(roots) : [];
  for (const entry of entries) {
    try {
      const map = parseMap(readFileSync(entry.path, 'utf8'));
      if (!refs.has(entry.root)) refs.set(entry.root, refsOf(entry.root));
      const claims = claimsOnRefs(entry.path, { root: entry.root, refs: refs.get(entry.root) });
      out.push({
        slug: entry.slug,
        status: map.header.Status ?? 'active',
        f: frontier(map, { claims }),
        names: new Set(map.nodes.map((n) => n.name)),
      });
    } catch {
      // not a map this version can read
    }
  }
  return { maps: out, failed };
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

/**
 * Priority 2: a stale task, and the third verb its own row does not carry. A
 * task at `done` is stale by age and not open, which is what the offer says;
 * its directory is still named by the stale row, whose "fold or delete" is the
 * action it needs (decision 0179).
 */
function handoffOffer(stale) {
  const t = stale.find((task) => task.state.phase !== 'done');
  if (!t) return null;
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

/**
 * The command that continues a listed task, from the one table that answers it
 * (decision 0192). No git: the digest lists no finished task, and only a
 * finished task's answer reads it. A ledger this cannot read leaves the phase
 * alone to answer, because a hook does not fail the session it starts.
 */
function resumeOf(t) {
  let facts = {};
  try {
    facts = nextFacts(t.taskDir, t.state, { git: false });
  } catch {
    // unreadable ledger: the phase answers without the files and lines
  }
  return nextStep(t.state, facts).next;
}

/**
 * The task the next step ranks first (decision 0198): the session's own task
 * not at done, else the open task updated last, else null. The chat line reads
 * the same one (decision 0200), so the language printed is that task's.
 */
function currentTask({ session, active, stale }) {
  const own = [...active, ...stale].find((t) => t.slug === session && t.state.phase !== 'done');
  if (own) return own;
  if (active.length === 0) return null;
  // `latestTask`'s order (ledger.mjs): the highest updatedAt, the first on a tie.
  return active.reduce((a, b) => ((b.state.updatedAt ?? '') > (a.state.updatedAt ?? '') ? b : a));
}

/**
 * The language the developer is speaking, as state (decision 0200), or null
 * where the engine's own English needs no line.
 * States: chat null | 'en' | another two-letter code — not a type; enumerated by hand.
 */
function chatLine(task, config) {
  const chat = task?.state?.chat;
  if (!chat || chat === 'en') return null;
  return `- chat: the developer reads ${chat} — commands, slugs and paths are English, files are written in ${config.language ?? 'en'}`;
}

/**
 * The one step that continues this project (decision 0198). Pure: the facts
 * are the ones digest() already holds, so the ranking is testable on objects.
 * First match wins:
 * `session | active | ready-map | stale | open-map | none`. A map with no ready
 * node ranks below a stale task and is still named: advancing it names the
 * wait or closes the campaign, and a stall has to be said. `subject` is what
 * the step continues, as the band prints it, and null on tier none: the band
 * reads nothing else, and a second copy of the tiers would drift (decisions
 * 0202, 0203).
 */
export function nextOverall({ session, active, stale, maps }) {
  const t = currentTask({ session, active, stale });
  if (t) {
    const why = t.slug === session ? "is this session's task" : 'is the open task updated last';
    return { next: t.resume, why: `${t.slug} ${why}, at ${t.state.phase}`, subject: taskSubject(t) };
  }
  const live = maps.filter((m) => m.status !== 'done');
  const ready = live.find((m) => m.f.ready.length > 0);
  if (ready) {
    const n = ready.f.ready.length;
    return {
      next: `/hodos:campaign ${ready.slug}`,
      why: `${ready.slug} has ${n} ready node${n === 1 ? '' : 's'}`,
      subject: ready.slug,
    };
  }
  const old = stale.find((t) => t.state.phase !== 'done');
  if (old) return { next: old.resume, why: `${old.slug} has been open ${old.ageDays} days`, subject: taskSubject(old) };
  if (live.length > 0) {
    return {
      next: `/hodos:campaign ${live[0].slug}`,
      why: `${live[0].slug} has no ready node — advancing it names the wait`,
      subject: live[0].slug,
    };
  }
  return { next: nextStep(null).next, why: 'no open task and no open campaign', subject: null };
}

/** A task as the band names it: the slug and the phase as stored. */
const taskSubject = (t) => `${t.slug} ${t.state.phase}`;

/**
 * The facts every printed form reads, gathered once per run. The digest adds
 * its offer and decay rows on top; the row reads none of them.
 */
function gather(found, { fetch = false } = {}) {
  const { config, projectRoot } = found;
  const staleDays = config.tasks?.staleDays ?? DEFAULT_STALE_DAYS;

  const all = tasks(projectRoot);
  const stale = all.filter((t) => t.ageDays >= staleDays);
  const active = all
    .filter((t) => !stale.includes(t) && t.state.phase !== 'done')
    .map((t) => ({ ...t, resume: resumeOf(t) }));

  const { maps, failed } = campaigns(projectRoot, config, { fetch });
  return { config, projectRoot, all, stale, active, maps, failed, session: activeTask(projectRoot) };
}

/** nextOverall over gathered facts, a stale task ranked with its own resume. */
function rank({ session, active, stale, maps }) {
  return nextOverall({ session, active, stale: stale.map((t) => ({ ...t, resume: resumeOf(t) })), maps });
}

export function digest(found, { full = false, fetch = false, moved } = {}) {
  if (found.notFound) return '';
  const facts = gather(found, { fetch });
  const { config, projectRoot, all, stale, active, maps, failed, session } = facts;
  const counts = [
    `${active.length} active task${active.length === 1 ? '' : 's'}`,
    stale.length > 0 ? `${stale.length} stale task${stale.length === 1 ? '' : 's'}` : null,
    maps.length > 0 ? `${maps.length} campaign${maps.length === 1 ? '' : 's'}` : null,
  ].filter(Boolean);
  const verified = config.verifiedAt ? `config verified ${config.verifiedAt}` : 'config found';
  const header = `hodos: ${[verified, ...counts].join(' · ')}`;
  // Under the header and outside the row budget, as the header is: a row the
  // cap drops must not take the language with it.
  const chat = chatLine(currentTask({ session, active, stale }), config);
  // Beside it for the same reason: a write to the developer's permission file
  // is not a row the cap may drop (decision 0204).
  const top = [header, chat, permissionsRow(moved)].filter(Boolean);

  const rows = [
    ...active.map((t) => `- ${t.slug} [${t.state.phase}] last: "${t.state.lastEvent ?? '—'}" — resume with ${t.resume}`),
    ...stale.map((t) => `- stale: ${t.slug} (${t.ageDays} days) — /hodos:status to fold or delete`),
    // Before the campaign rows, because it is what says how fresh they are.
    ...failed.map((name) => `- fetch failed — the map is as of your last pull (${name})`),
    // One row per map, ending on its command as a task row ends on its resume,
    // so the cap drops one map at a time (decision 0198).
    ...maps.map((m) => `- campaign ${m.slug} — frontier ${shortCounts(m.f)} — advance with /hodos:campaign ${m.slug}`),
    decayRow(projectRoot, config),
    // Last, so the cap drops it before it drops a row of state (FORMATS.md §12).
    offer(projectRoot, all, stale),
  ].filter(Boolean);

  if (full) {
    // The rows are a list and stay one per line; each map's frontier is a block
    // of its own, so `status` can read them apart at a glance.
    const blocks = maps.map((m) => formatFrontier(m.slug, m.f, { byName: m.names }));
    // Last, after the blocks: status holds it and closes its report with it.
    const { next, why } = rank(facts);
    return [[...top, ...rows].join('\n'), ...blocks, `Next: ${next} — ${why}`].join('\n\n');
  }

  const kept = [];
  let size = top.join('\n').length;
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
  return [...top, ...kept].join('\n');
}

/** What `repointFile` did, as one row, or null when it moved nothing. */
function permissionsRow(moved) {
  if (!moved || moved.from.length === 0) return null;
  const what = `${moved.from.join(', ')} → ${moved.to} in .claude/settings.local.json`;
  return moved.error
    ? `- permissions: could not move the hodos scripts rule ${what} (${moved.error}) — script calls will prompt`
    : `- permissions: hodos scripts rule moved ${what}`;
}

// The session's task, not the project's: `activeTask` reads
// sessions/<id> first (decision 0047). The id comes from the environment
// rather than a hook payload because this script is also the `!` injection of
// every kernel, where stdin belongs to the shell — a blocking read there would
// abort the invocation at turn 0 (PLATFORM-NOTES.md fact 14). With no pointer
// of its own it reads `active` only while no session holds one (decision 0171).
export function compactLine(found) {
  if (found.notFound) return '';
  const slug = activeTask(found.projectRoot);
  if (!slug) return '';
  // `/` on every platform: the line is quoted in COMPONENTS.md §4, in the
  // kernels and in the tests, and a reader types it into a shell.
  const ledger = `.claude/hodos/tasks/${slug}/ledger.md`;
  const line = `hodos: ${slug} — ledger ${ledger} — continue from the first open line`;
  // A compacted session has no digest otherwise (decision 0200).
  const chat = chatLine({ state: readState(found.projectRoot, slug) }, found.config);
  return chat ? `${line}\n${chat}` : line;
}

/**
 * The line the band above the prompt draws (decisions 0202, 0203): what the
 * work is and the command `--full` ends on, from the same ranking, so the band
 * and `/hodos:status` cannot disagree. Plain text: the band adds its own glyph
 * and colour, and a program reads this form. Empty on tier none, where a band
 * would sit in every session that has no hodos work. It never fetches: it runs
 * after every main-thread turn, and the network is `/hodos:status`'s alone
 * (decision 0080).
 */
export function rowLine(found) {
  if (found.notFound) return '';
  const { next, subject } = rank(gather(found));
  return subject === null ? '' : `${subject} → ${next}`;
}

function main(argv) {
  let mode = 'bare';
  let fetch = false;
  let repoint = false;
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    }
    if (arg === '--full' || arg === '--compact' || arg === '--row') mode = arg.slice(2);
    else if (arg === '--fetch') fetch = true;
    else if (arg === '--repoint') repoint = true;
    else {
      process.stderr.write(`state-digest: unknown option: ${arg}\n${USAGE}\n`);
      return 2;
    }
  }

  const found = findConfig(process.cwd());
  const moved = repoint && !found.notFound ? repointFile(found.projectRoot) : undefined;
  const text =
    mode === 'compact' ? compactLine(found)
      : mode === 'row' ? rowLine(found)
        : digest(found, { full: mode === 'full', fetch, moved });
  if (text !== '') process.stdout.write(`${text}\n`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
