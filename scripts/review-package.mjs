#!/usr/bin/env node
// review-package.mjs — build `review-input.md` for the fresh reviewer (FORMATS.md §8).
//
// The incident behind it: an orchestrator that pastes the diff into its own
// dispatch message reads the diff, and a context that has read the diff defends
// the code it wrote (DESIGN.md §7.3). So the package is a file, built by a
// script, and the kernel passes a path. Nothing here summarises: the plan's two
// sections go in verbatim and the diff goes in at -U10, because a reviewer that
// has to guess what was changed reports what it can see rather than what is
// there.
//
// The base is `state.json.base`, written by ledger.mjs on `Plan: approved`. The
// script never guesses one: a merge-base picked here would silently move the
// review's subject, which is the one thing the ledger already records.

import { existsSync, mkdtempSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, resolve, sep } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { findConfig, forFiles, gitRoot } from './config.mjs';

const CONTEXT_LINES = 10; // FORMATS.md §8

// Decision 0065. A lockfile, a snapshot or a generated client enters the
// reviewer's context whole at -U10 and takes the real hunks' attention with it,
// and nothing reports the loss. So generated content is packaged **stat-only**,
// under a section the reviewer names in its Coverage line — the omission is in
// the review rather than silent — and a package that is still too large stops
// with a diagnosis instead of being sent.
const GENERATED = [
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'npm-shrinkwrap.json',
  'Cargo.lock',
  'composer.lock',
  'Gemfile.lock',
  'poetry.lock',
  'go.sum',
  '*.snap',
  'dist/',
  'build/',
  'generated/',
  '__generated__/',
];
// Generous on purpose: the common case is packaged correctly by the rule above,
// and this is the second guard, for a genuinely huge source change. A million
// bytes of -U10 diff is on the order of 25,000 changed lines — past the point
// where a single reviewer's finding rate means anything.
const MAX_BYTES = 1_000_000;

// A mechanical change is one edit repeated: the codemod is the artifact under
// review, and a sample is what proves it did what it says. Three is enough to
// show the shape and its variants and small enough that the reviewer reads the
// codemod rather than the forty diffs that follow from it.
const MECHANICAL_SAMPLE = 3;

/**
 * `*` inside a segment, `**` across them, a trailing `/` for a directory the
 * path passes through, and a bare name matching any basename. Enough for the
 * defaults above and for what a project writes in `config.review.generated`.
 */
export function matchesGlob(path, pattern) {
  if (pattern.endsWith('/')) {
    const dir = pattern.slice(0, -1);
    return path === dir || path.startsWith(`${dir}/`) || path.includes(`/${dir}/`);
  }
  const source = pattern
    .replace(/[.+^${}()|[\]\\]/g, '\\$&')
    .replace(/\*\*/g, '\u0000')
    .replace(/\*/g, '[^/]*')
    .replace(/\u0000/g, '.*');
  const re = new RegExp(`^${source}$`);
  return re.test(path) || (!pattern.includes('/') && re.test(path.split('/').pop() ?? ''));
}

/** The changed files, split into what the reviewer reads and what it is only told about. */
export function splitGenerated(files, globs) {
  const packaged = [];
  const generated = [];
  for (const file of files) {
    const hit = globs.find((glob) => matchesGlob(file, glob));
    if (hit) generated.push({ file, glob: hit });
    else packaged.push(file);
  }
  return { packaged, generated };
}

const USAGE = `Usage: node scripts/review-package.mjs <slug> [--since <sha>] [--mechanical <path>]
       node scripts/review-package.mjs --target <ref|range|path>

Writes .claude/hodos/tasks/<slug>/review-input.md (FORMATS.md §8) from the
plan's Design and Tasks sections and the diff from the task's base to HEAD,
and prints the path it wrote.

  --since <sha>       scope the diff to <sha>..HEAD and carry the previous
                      review.md's findings table — the iteration-2 package of
                      DESIGN.md §4.5.
  --mechanical <path> a one-shape change: package <path> — the codemod, which
                      must be one of the changed files — plus a ${MECHANICAL_SAMPLE}-file sample
                      of what it did, and name the rest under Not packaged.
  --target <t>        package a diff no hodos task owns, into a temporary
                      directory: a branch or ref (against its merge-base with
                      the default branch), an explicit a..b range, or a path
                      whose working-tree changes are the subject. Takes no
                      slug — there is no plan, so commit messages stand in for
                      Design and Tasks.
  --help              print this and exit 0.

Exit codes: 0 — the path is on stdout; 1 — the task, the plan, the base, the
target or the previous review is unusable, with the reason on stderr; 2 — bad
invocation.`;

/**
 * A plan's level-2 section, verbatim: everything under `## <heading>` up to the
 * next level-2 heading, with the surrounding blank lines dropped.
 */
export function section(planText, heading) {
  const lines = planText.split('\n');
  const start = lines.findIndex((line) => line.trim() === `## ${heading}`);
  if (start === -1) return null;
  const rest = lines.slice(start + 1);
  const end = rest.findIndex((line) => line.startsWith('## '));
  const body = (end === -1 ? rest : rest.slice(0, end)).join('\n');
  return body.replace(/^\n+/, '').replace(/\n+$/, '');
}

/** The Standards table of a `review.md`, verbatim; null when it holds none. */
export function previousFindings(reviewText) {
  const body = section(reviewText, 'Standards');
  if (body === null) return null;
  const rows = body.split('\n').filter((line) => line.trimStart().startsWith('|'));
  return rows.length === 0 ? null : rows.join('\n');
}

/** The file, in the order FORMATS.md §8 gives it. */
export function render({ slug, base, head, commits, design, tasks, intent, stat, diff, findings, projects, notPackaged, notPackagedNote, callerLines }) {
  const parts = [
    `# Review input — ${slug}`,
    `Base: ${base} · Head: ${head} · Commits: ${commits}`,
    '',
  ];
  if (projects !== undefined && projects.length > 0) {
    parts.push('## Projects', ...projects.map(({ dir, config: path }) => `- ${dir} · config: ${path}`), '');
  }
  if (findings !== undefined) {
    parts.push('## Previous findings', findings, '');
  }
  if (notPackaged !== undefined && notPackaged.length > 0) {
    parts.push(
      '## Not packaged',
      notPackagedNote ??
        'These files changed and their content is **not** in the diff below: they match\n`config.review.generated`, so only their size is here.',
      'Name them in your Coverage line, so the review says what it did not read.',
      '',
      ...notPackaged.map(({ file, stat: line, reason }) => `- \`${file}\` — ${line} (${reason})`),
      '',
    );
  }
  if (intent !== undefined) {
    parts.push('## Intent (from commit messages)', intent, '');
  } else {
    parts.push('## Design (from plan)', design, '', '## Tasks (from plan)', tasks, '');
  }
  if (callerLines !== undefined && callerLines.length > 0) {
    parts.push('## Callers', ...callerLines, '');
  }
  parts.push(
    '## Diff stat',
    stat,
    '',
    '## Diff',
    diff,
  );
  return `${parts.join('\n').replace(/\n+$/, '')}\n`;
}

const git = (cwd, args) => spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

// Decision 0100: three of the reviewer's nine behavioral codes ask a question
// the diff cannot answer — which caller still expects the outer value, who
// else holds that reference, what the callee does on failure — and its one
// escape from the diff is `one named risk with one focused check`. The package
// answers them with a pointer list: every call site is the reviewer's to judge,
// and none of them is a finding. A grep by name is imprecise on purpose — a
// symbol reached through a re-export or a dynamic key is missed, and a common
// name resolves into unrelated modules — so the caps below are what keep an
// imprecise list from becoming most of the package.
const MAX_CALLER_SYMBOLS = 10;
const MAX_CALL_SITES = 5;

// The declaration families this reads: JavaScript and TypeScript's `export`,
// and Rust's `pub`. A language that spells its public surface another way
// gets no section, which is the state every package was in before this.
const EXPORTED = [
  /^[+-][ \t]*export[ \t]+(?:default[ \t]+)?(?:async[ \t]+)?(?:function|class|const|let|var|interface|type|enum)[ \t]+([A-Za-z_$][\w$]*)/,
  /^[+-][ \t]*pub(?:\([^)]*\))?[ \t]+(?:async[ \t]+)?(?:fn|struct|enum|trait|const|static|type)[ \t]+([A-Za-z_][\w]*)/,
];

// An import is not a caller either — it says the symbol is in scope, not that
// anything depends on what it returns — and it needs no filter of its own: an
// import line does not put a `(` after the name, so the call shape below
// excludes every import family that has one. The explicit `IMPORT` pattern
// this file carried until Review 1 could only subtract from that: what it still
// matched was the call-shaped chain — `require(…)…name(x)` and
// `import(…)…name(x)` — and both of those are call sites
// (`docs/stages/11b3-review.md`, mutant L; the shapes are constructed, not
// found in this repository).

// A document that quotes the symbol is not a caller either: a project rule
// carries the shape it requires, and the bench's own rules quote four call
// sites the reviewer already has in front of it.
const DOCUMENT = /\.(?:md|mdx|markdown|txt|rst|adoc)$/i;

// A word match is not a call. `git grep --word-regexp` finds the name in a
// test title and in a comment as readily as in a call, and run 2026-09-06
// packaged one of each: the section is named for call sites, so the match has
// to be shaped like one — the name, then a call. The cost is a symbol passed
// as a value (`useEffect(fetchOrders)`), which reads as a dependency and is
// dropped here; a grep by name misses a re-export and a dynamic key already,
// and a list of matches the reviewer discards is the noise the caps exist for.
const CALL = (symbol) => new RegExp(`\\b${symbol.replace(/\$/g, '\\$')}\\b[ \\t]*(?:<[^<>()]*>[ \\t]*)?\\(`);

/** Wrap a line of code for markdown, in as many backticks as it needs. */
const code = (text) => (text.includes('`') ? `\`\` ${text} \`\`` : `\`${text}\``);

/**
 * The exported symbols whose **declaration** the diff changed, added and
 * removed alike: a deleted export breaks its callers the same way a changed
 * signature does. A line that merely calls the symbol is not a declaration.
 */
export function changedExports(diff) {
  const found = [];
  for (const line of diff.split('\n')) {
    if (line.startsWith('+++') || line.startsWith('---')) continue;
    for (const pattern of EXPORTED) {
      const m = pattern.exec(line);
      if (m && !found.includes(m[1])) found.push(m[1]);
    }
  }
  return found;
}

/** Call sites of `symbol` outside the files the diff already carries. */
function callSites(root, symbol, changed) {
  const out = git(root, ['grep', '-n', '--fixed-strings', '--word-regexp', '-e', symbol]);
  if (out.status !== 0) return []; // 1 is "no match", and a grep that failed says nothing
  const sites = [];
  for (const line of out.stdout.split('\n')) {
    const file = line.slice(0, line.indexOf(':'));
    const rest = line.slice(file.length + 1);
    const number = Number(rest.slice(0, rest.indexOf(':')));
    if (!file || !Number.isInteger(number)) continue;
    if (changed.includes(file) || DOCUMENT.test(file)) continue;
    const text = rest.slice(String(number).length + 1).trim();
    if (!CALL(symbol).test(text)) continue;
    sites.push({ file, line: number, text });
  }
  return sites;
}

/**
 * The `## Callers` lines for a diff, or `[]` when nothing exported changed.
 * A cap that bites is reported where it bit, the shape `## Not packaged`
 * uses: the reviewer is told what it is not being shown.
 */
export function callers(root, diff, changed) {
  const symbols = changedExports(diff);
  const lines = [];
  for (const symbol of symbols.slice(0, MAX_CALLER_SYMBOLS)) {
    const sites = callSites(root, symbol, changed);
    for (const site of sites.slice(0, MAX_CALL_SITES)) {
      lines.push(`- \`${symbol}\` · ${site.file}:${site.line} — ${code(site.text)}`);
    }
    if (sites.length > MAX_CALL_SITES) {
      lines.push(`- \`${symbol}\` — ${MAX_CALL_SITES} of ${sites.length} call sites listed (cap)`);
    }
  }
  const over = symbols.length - MAX_CALLER_SYMBOLS;
  if (over > 0) {
    lines.push(`- … and ${over} changed export${over === 1 ? '' : 's'} not searched (cap: ${MAX_CALLER_SYMBOLS} symbols)`);
  }
  return lines;
}

function fail(reason) {
  process.stderr.write(`review-package: ${reason}\n`);
  return 1;
}

/**
 * The diff facts for a range, shared by the task package and `--target`: the
 * stat, the changed files, the churn per file, and a diff limited to a subset.
 * One place, because two callers is what the product's own defaults row 8 asks
 * for before a helper exists — `main` and `targetMain`, which read the same four
 * facts off different ranges and must render them identically.
 *
 * `root` is the git root, not the project root: `git diff --name-only` returns
 * root-relative paths whatever the cwd, and those same paths go back to git as
 * a pathspec, which git resolves against the cwd (`FORMATS.md §2`, decision
 * 0075).
 */
function collect(root, range, pathspec) {
  const scope = pathspec ? ['--', pathspec] : [];
  const stat = git(root, ['diff', '--stat', ...range, ...scope]);
  const names = git(root, ['diff', '--name-only', ...range, ...scope]);
  const numstat = git(root, ['diff', '--numstat', ...range, ...scope]);
  for (const step of [stat, names, numstat]) {
    if (step.status !== 0) return { error: step.stderr.trim() };
  }
  const files = names.stdout.split('\n').map((line) => line.trim()).filter(Boolean);
  const churn = new Map(
    numstat.stdout
      .split('\n')
      .map((line) => line.split('\t'))
      .filter((parts) => parts.length === 3)
      .map(([added, removed, file]) => [file, { added, removed, total: Number(added) + Number(removed) }]),
  );
  const diffOf = (subset) =>
    subset.length === 0
      ? { status: 0, stdout: '', stderr: '' }
      : git(root, ['diff', `-U${CONTEXT_LINES}`, ...range, '--', ...subset]);
  return { stat: stat.stdout.trimEnd(), files, churn, diffOf };
}

/** The repository's default branch: what origin says, else main, else master. */
function defaultBranch(root) {
  const head = git(root, ['symbolic-ref', '--short', 'refs/remotes/origin/HEAD']);
  if (head.status === 0 && head.stdout.trim()) return head.stdout.trim().replace(/^[^/]+\//, '');
  for (const name of ['main', 'master']) {
    if (git(root, ['rev-parse', '--verify', '--quiet', `refs/heads/${name}`]).status === 0) return name;
  }
  return null;
}

/** The slug of the task whose branch is `ref`, or null. */
function taskOnBranch(projectRoot, ref) {
  const tasks = join(projectRoot, '.claude', 'hodos', 'tasks');
  if (!existsSync(tasks)) return null;
  for (const entry of readdirSync(tasks, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try {
      const state = JSON.parse(readFileSync(join(tasks, entry.name, 'state.json'), 'utf8'));
      if (state.branch === ref && state.phase !== 'done') return entry.name;
    } catch {
      // a directory without derived state is not a task on any branch
    }
  }
  return null;
}

/**
 * `--target`: a diff hodos did not write. Nothing is written into the project —
 * no task directory, no ledger line — so the package goes to a temporary
 * directory and the path is printed. There is no plan, so the commit messages
 * of the range stand in for Design and Tasks: they are what the author said
 * they were doing, which is what those sections carry for a task.
 */
function targetMain(projectRoot, root, config, target) {
  let range;
  let pathspec = null;
  let name = target;
  // The head of a target package is the target's own tip: a reviewer reading
  // `Head:` is told which commit it reviewed, not which branch this session was
  // standing on when it asked.
  let headRef = 'HEAD';
  if (target.includes('..')) {
    range = [target];
    headRef = target.split('..').pop() || 'HEAD';
  } else if (git(root, ['rev-parse', '--verify', '--quiet', `${target}^{commit}`]).status === 0) {
    const owner = taskOnBranch(projectRoot, target);
    if (owner) {
      return fail(
        `${target} is ${owner}'s branch, and ${owner} is an open hodos task — ` +
          `its review is /hodos:run ${owner}, which reviews it against its plan.`,
      );
    }
    const dflt = defaultBranch(root);
    if (!dflt) return fail(`${target}: this repository has no default branch to compare against — pass a range`);
    if (dflt === target) return fail(`${target} is the default branch — pass a range, such as ${target}~3..${target}`);
    const mergeBase = git(root, ['merge-base', dflt, target]);
    if (mergeBase.status !== 0) return fail(`${target}: no merge base with ${dflt} — ${mergeBase.stderr.trim()}`);
    range = [`${mergeBase.stdout.trim()}..${target}`];
    headRef = target;
  } else if (existsSync(resolve(process.cwd(), target))) {
    // A path on the command line is the developer's own, so it resolves where
    // they are standing; git is handed the git-root-relative form of it, which
    // is the anchor applied rather than bypassed (`FORMATS.md §2`).
    range = [];
    pathspec = relative(root, resolve(process.cwd(), target)).split(sep).join('/');
    name = `${target} (working tree)`;
  } else {
    return fail(`${target} is neither a ref, a range, nor a path in this repository`);
  }

  const facts = collect(root, range, pathspec);
  if (facts.error) return fail(`git failed on ${target} — ${facts.error}`);
  if (facts.files.length === 0) return fail(`${target} changes nothing against ${range[0] ?? 'the working tree'}`);

  const log = range.length === 0 ? null : git(root, ['log', '--format=- %h %s', ...range]);
  const intent =
    log && log.status === 0 && log.stdout.trim()
      ? log.stdout.trimEnd()
      : '(no commits in range — these are uncommitted working-tree changes)';

  const globs = Array.isArray(config?.review?.generated) ? config.review.generated : GENERATED;
  const { packaged, generated } = splitGenerated(facts.files, globs);
  const diff = facts.diffOf(packaged);
  if (diff.status !== 0) return fail(`git failed on ${target} — ${diff.stderr.trim()}`);

  const head = git(root, ['rev-parse', '--short', headRef]);
  const body = render({
    slug: name,
    base: range.length === 0 ? 'HEAD' : range[0].split('..')[0].slice(0, 7),
    head: head.stdout.trim(),
    commits: range.length === 0 ? '0 (working tree)' : git(root, ['rev-list', '--count', ...range]).stdout.trim(),
    intent,
    stat: facts.stat,
    diff: diff.stdout.trimEnd(),
    callerLines: callers(root, diff.stdout, facts.files),
    notPackaged: generated.map(({ file, glob }) => ({
      file,
      stat: statOf(facts.churn, file),
      reason: `matched \`${glob}\``,
    })),
  });

  const maxBytes = typeof config?.review?.maxBytes === 'number' ? config.review.maxBytes : MAX_BYTES;
  if (Buffer.byteLength(body) > maxBytes) {
    return fail(`${target}: the package is ${Buffer.byteLength(body)} bytes, over config.review.maxBytes (${maxBytes}).`);
  }

  const outDir = mkdtempSync(join(tmpdir(), 'hodos-review-'));
  const outPath = join(outDir, 'review-input.md');
  writeFileSync(outPath, body);
  process.stdout.write(`${outPath}\n`);
  return 0;
}

const statOf = (churn, file) => {
  const counts = churn.get(file);
  return counts ? `+${counts.added} \u2212${counts.removed}` : 'changed';
};

function main(argv) {
  let slug = null;
  let since = null;
  let target = null;
  let mechanical = null;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    }
    if (arg === '--since' || arg === '--target' || arg === '--mechanical') {
      const value = argv[i + 1] ?? null;
      i += 1;
      if (value === null) {
        process.stderr.write(`review-package: ${arg} needs a value\n${USAGE}\n`);
        return 2;
      }
      if (arg === '--since') since = value;
      else if (arg === '--target') target = value;
      else mechanical = value;
    } else if (arg.startsWith('-')) {
      process.stderr.write(`review-package: unknown option: ${arg}\n${USAGE}\n`);
      return 2;
    } else if (slug === null) {
      slug = arg;
    } else {
      process.stderr.write(`review-package: one slug at a time, got ${slug} and ${arg}\n${USAGE}\n`);
      return 2;
    }
  }
  if (target !== null && slug !== null) {
    process.stderr.write(`review-package: --target packages a diff no task owns, so it takes no slug\n${USAGE}\n`);
    return 2;
  }
  if (target !== null && (since !== null || mechanical !== null)) {
    process.stderr.write(`review-package: --target takes neither --since nor --mechanical\n${USAGE}\n`);
    return 2;
  }
  if (target === null && slug === null) {
    process.stderr.write(`review-package: a slug is required\n${USAGE}\n`);
    return 2;
  }

  const found = findConfig(process.cwd());
  if (found.notFound) return fail('no hodos config found — run /hodos:init first');
  const { projectRoot, config } = found;
  // `projectRoot` addresses `.claude/hodos/`; every git call runs at the git
  // root (`FORMATS.md §2`, decision 0075).
  const root = gitRoot(projectRoot) ?? projectRoot;

  if (target !== null) return targetMain(projectRoot, root, config, target);

  const taskDir = join(projectRoot, '.claude', 'hodos', 'tasks', slug);
  if (!existsSync(taskDir)) return fail(`no task directory at .claude/hodos/tasks/${slug}`);

  const planPath = join(taskDir, 'plan.md');
  if (!existsSync(planPath)) return fail(`no plan at .claude/hodos/tasks/${slug}/plan.md`);
  const planText = readFileSync(planPath, 'utf8');
  const design = section(planText, 'Design');
  const tasks = section(planText, 'Tasks');
  if (design === null) return fail(`${slug}: the plan has no "## Design" section (FORMATS.md §5)`);
  if (tasks === null) return fail(`${slug}: the plan has no "## Tasks" section (FORMATS.md §5)`);

  let findings;
  let base;
  if (since === null) {
    let state;
    try {
      state = JSON.parse(readFileSync(join(taskDir, 'state.json'), 'utf8'));
    } catch (error) {
      return fail(`${slug}: state.json is unreadable — ${error.message}`);
    }
    if (!state.base) return fail(`${slug}: state.json has no base — the ledger holds no "Plan: approved"`);
    base = state.base;
  } else {
    base = since;
    const reviewPath = join(taskDir, 'review.md');
    if (!existsSync(reviewPath)) {
      return fail(`${slug}: --since scopes a re-review, and there is no review.md to scope against`);
    }
    findings = previousFindings(readFileSync(reviewPath, 'utf8')) ?? '(the previous review recorded no findings table)';
  }

  const resolved = git(root, ['rev-parse', '--short', `${base}^{commit}`]);
  if (resolved.status !== 0) {
    return fail(`${slug}: base ${base} is not a commit git knows — ${resolved.stderr.trim()}`);
  }
  const baseShort = resolved.stdout.trim();
  const head = git(root, ['rev-parse', '--short', 'HEAD']);
  if (head.status !== 0) return fail(`${slug}: HEAD is unreadable — ${head.stderr.trim()}`);
  const range = `${base}..HEAD`;
  const commits = git(root, ['rev-list', '--count', range]);
  if (commits.status !== 0) return fail(`${slug}: git failed on ${range} — ${commits.stderr.trim()}`);
  const facts = collect(root, [range], null);
  if (facts.error) return fail(`${slug}: git failed on ${range} — ${facts.error}`);

  const globs = Array.isArray(config?.review?.generated) ? config.review.generated : GENERATED;
  const maxBytes = typeof config?.review?.maxBytes === 'number' ? config.review.maxBytes : MAX_BYTES;
  const { packaged, generated } = splitGenerated(facts.files, globs);
  const churn = facts.churn;

  // A mechanical change: the codemod is the artifact and a sample is the proof
  // it did what it says. Forty diffs of one edit spend the reviewer's attention
  // on the repetition and leave the transformation itself unread — the same
  // argument decision 0065 makes for generated files, applied to a change whose
  // shape is stated once.
  let sampled = packaged;
  let mechanicalRows = [];
  let notPackagedNote;
  if (mechanical !== null) {
    if (!facts.files.includes(mechanical)) {
      return fail(
        `${slug}: --mechanical names ${mechanical}, which is not one of the ${facts.files.length} files this change touches. ` +
          'The codemod is the artifact under review, so it is committed with the change it made.',
      );
    }
    const transformed = packaged
      .filter((file) => file !== mechanical)
      .sort((a, b) => (churn.get(b)?.total ?? 0) - (churn.get(a)?.total ?? 0) || a.localeCompare(b));
    const sample = transformed.slice(0, MECHANICAL_SAMPLE);
    const rest = transformed.slice(MECHANICAL_SAMPLE);
    sampled = [mechanical, ...sample];
    mechanicalRows = rest.map((file) => ({
      file,
      stat: statOf(churn, file),
      reason: 'the codemod makes this edit',
    }));
    notPackagedNote =
      `\`${mechanical}\` is the change, and ${sample.length} of the files it rewrote are in the diff below as a\n` +
      `sample. ${rest.length} more files take the same edit and their diffs are **not** here: read the\n` +
      'codemod against the sample, and say so if the shape it applies is wrong for any of them.';
  }

  // The diff carries the packaged files only. With nothing packaged the diff is
  // empty and the section says why, which is a truthful package: a change made
  // entirely of generated files is one the reviewer should be told about rather
  // than handed.
  const diff = facts.diffOf(sampled);
  if (diff.status !== 0) return fail(`${slug}: git failed on ${range} — ${diff.stderr.trim()}`);

  const notPackaged = [
    ...generated.map(({ file, glob }) => ({ file, stat: statOf(churn, file), reason: `matched \`${glob}\`` })),
    ...mechanicalRows,
  ];

  // Which command sets answer for this task (decision 0076). The section
  // appears when there is something to disambiguate, and what has to be
  // disambiguated is that the projects answering are not the one project whose
  // config this package was built from: a change confined to `web/` but
  // packaged at the root would otherwise be reviewed with the root's
  // `npm test --workspaces`, which is the case decision 0060 argues against. A
  // single-config repository answers with itself and names nothing.
  const answering = forFiles(facts.files, root);
  const answers = Array.isArray(answering.projects) ? answering.projects : [];
  const ownsAlone = answers.length === 1 && answers[0].projectRoot === projectRoot;
  const projects =
    answers.length > 0 && !ownsAlone
      ? answers.map(({ dir, paths }) => ({
          dir,
          config: relative(root, paths[paths.length - 1]).split(sep).join('/'),
        }))
      : undefined;

  const body = render({
    slug,
    base: baseShort,
    head: head.stdout.trim(),
    commits: commits.stdout.trim(),
    design,
    tasks,
    stat: facts.stat,
    diff: diff.stdout.trimEnd(),
    findings,
    projects,
    notPackaged,
    notPackagedNote,
    callerLines: callers(root, diff.stdout, facts.files),
  });

  if (Buffer.byteLength(body) > maxBytes) {
    const biggest = sampled
      .map((file) => ({ file, total: churn.get(file)?.total ?? 0 }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 5)
      .map(({ file, total }) => `${file} (${total} lines)`);
    return fail(
      `${slug}: the package is ${Buffer.byteLength(body)} bytes, over config.review.maxBytes (${maxBytes}). ` +
        `Largest: ${biggest.join(', ')}. Split the task, or raise the cap knowing what it buys.`,
    );
  }

  const outPath = join(taskDir, 'review-input.md');
  writeFileSync(outPath, body);
  process.stdout.write(`${outPath}\n`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
