#!/usr/bin/env node
// fixture-copy.mjs — a throwaway git repository holding one bench fixture.
//
// Every stage test that runs hodos against a fixture runs against a copy, never
// against the checked-in tree (COMPONENTS.md §7): a stage that writes .claude/,
// commits, or rolls back would otherwise leave the fixture different for the
// next stage. The copy is a real git repository with three seeded conventional
// commits, so `git log`, `scanSha`, and commit-convention detection have a
// source (decision 0012).
//
// node_modules is linked rather than copied or installed: a copy has to be able
// to run `npm test` with no network and without waiting for an install.

import { execFileSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_ROOT = join(HERE, '..', 'fixtures');

/** Never copied: the source's own history, its installs, its build output. */
const NEVER_COPY = new Set(['.git', 'node_modules', 'dist', 'coverage', '.DS_Store']);

// What `init` appends to a project's .gitignore (FORMATS.md §1) and the markers
// it wraps its block in (COMPONENTS.md §1.3). `--strip-claude` has to undo all
// three, not only the directory: since Stage 3 the webapp fixture ships the
// layer a real init run produced, and a copy that keeps the map is not the
// virgin project the flag promises. The list grows with what init appends —
// sessions/ came with decision 0047 and settings.local.json with 0057.
const HODOS_IGNORE = [
  '.claude/hodos/tasks/',
  '.claude/hodos/active',
  '.claude/hodos/sessions/',
  '.claude/hodos/history.jsonl',
  '.claude/settings.local.json',
];
const BLOCK_BEGIN = '<!-- hodos:begin -->';
const BLOCK_END = '<!-- hodos:end -->';

/** Directory segments that mark a file as a test, whatever the fixture's layout. */
const TEST_DIRS = new Set(['test', 'tests', '__tests__']);

/** Directory segments that mark a file as a source. */
const SOURCE_DIRS = new Set(['src', 'lib']);

const COMMITS = [
  { subject: 'chore: scaffold the project', group: 'config' },
  { subject: 'feat: add the application modules', group: 'source' },
  { subject: 'test: cover the modules with the project runner', group: 'test' },
];

const USAGE = `Usage: node bench/scripts/fixture-copy.mjs <name> [options]

Copies bench/fixtures/<name> to a temporary directory, makes it a git
repository with three seeded conventional commits, and prints the path.

  --into <dir>     copy into <dir> instead of a fresh temporary directory
  --strip-claude   remove the hodos layer from the copy — .claude/, the map or
                   managed block in CLAUDE.md, and the .gitignore lines init
                   appends (a project hodos has not seen)
  --no-modules     do not link node_modules (the copy cannot run its tests)
  --help           print this and exit 0

Exit codes: 0 — the path is on stdout; 1 — the fixture does not exist or git
failed, with the reason on stderr; 2 — bad invocation.`;

/** The fixture directories under `root`, sorted. */
export function fixtureNames(root = DEFAULT_ROOT) {
  return readdirSync(root, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith('.'))
    .map((entry) => entry.name)
    .sort();
}

/** Which of the three commits a repository-relative path belongs to. */
export function commitGroup(relPath) {
  const parts = relPath.split(/[\\/]/);
  const name = parts[parts.length - 1];
  if (/\.(test|spec)\./.test(name)) return 'test';
  if (parts.slice(0, -1).some((part) => TEST_DIRS.has(part))) return 'test';
  if (parts.slice(0, -1).some((part) => SOURCE_DIRS.has(part))) return 'source';
  return 'config';
}

/** Every file under `dir`, relative to it, with NEVER_COPY pruned. */
function filesUnder(dir, prefix = '') {
  const out = [];
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    if (NEVER_COPY.has(entry.name)) continue;
    const rel = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) out.push(...filesUnder(dir, rel));
    else out.push(rel);
  }
  return out;
}

/** The workspace directories a package.json declares, resolved against `dir`. */
function workspaceDirs(dir) {
  const manifest = join(dir, 'package.json');
  if (!existsSync(manifest)) return [];
  let patterns;
  try {
    patterns = JSON.parse(readFileSync(manifest, 'utf8')).workspaces;
  } catch {
    return [];
  }
  if (!Array.isArray(patterns)) return [];
  const out = [];
  for (const pattern of patterns) {
    // npm workspaces are `pkg` or `packages/*`; nothing here needs more.
    if (pattern.endsWith('/*')) {
      const parent = join(dir, pattern.slice(0, -2));
      if (!existsSync(parent)) continue;
      for (const entry of readdirSync(parent, { withFileTypes: true })) {
        if (entry.isDirectory()) out.push(join(parent, entry.name));
      }
    } else if (existsSync(join(dir, pattern))) {
      out.push(join(dir, pattern));
    }
  }
  return out;
}

/**
 * A node_modules in `copy` whose every entry points into `source`'s install,
 * except the workspace packages, which point at the copy's own directories.
 * A plain symlink of the whole directory would send every workspace import back
 * to the fixture, and a seeded defect in the copy would never be reached.
 */
function linkModules(source, copy) {
  const from = join(source, 'node_modules');
  if (!existsSync(from)) return;
  const to = join(copy, 'node_modules');
  mkdirSync(to, { recursive: true });

  for (const entry of readdirSync(from, { withFileTypes: true })) {
    if (entry.name.startsWith('@')) {
      mkdirSync(join(to, entry.name), { recursive: true });
      for (const scoped of readdirSync(join(from, entry.name), { withFileTypes: true })) {
        symlinkSync(join(from, entry.name, scoped.name), join(to, entry.name, scoped.name), 'junction');
      }
    } else {
      symlinkSync(join(from, entry.name), join(to, entry.name), 'junction');
    }
  }

  for (const dir of workspaceDirs(copy)) {
    let name;
    try {
      name = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).name;
    } catch {
      continue;
    }
    if (typeof name !== 'string' || name === '') continue;
    const link = join(to, ...name.split('/'));
    rmSync(link, { recursive: true, force: true });
    mkdirSync(dirname(link), { recursive: true });
    symlinkSync(dir, link, 'junction');
  }
}

/**
 * @param {{ name: string, root?: string, into?: string, stripClaude?: boolean, modules?: boolean }} options
 * @returns {string} the absolute path of the copy
 */
export function copyFixture({ name, root = DEFAULT_ROOT, into, stripClaude = false, modules = true }) {
  const available = fixtureNames(root);
  if (!available.includes(name)) {
    throw new Error(`fixture-copy: no fixture "${name}" — the fixtures are ${available.join(', ')}`);
  }
  const source = join(root, name);
  const copy = into ?? mkdtempSync(join(tmpdir(), `hodos-${name}-`));
  // A copy is a throwaway repository, so `--into` takes a new directory or an
  // empty one. Into a directory a previous run used, `cpSync` would lay the
  // pristine fixture over a seeded working tree and keep that run's `.git` and
  // `.claude/hodos/tasks/`: the next run reads a ledger describing commits its
  // tree does not have. Stage 6 session A cost a review dispatch to that.
  if (into && existsSync(into) && readdirSync(into).length > 0) {
    throw new Error(`fixture-copy: ${into} is not empty — a copy needs a new directory or an empty one`);
  }
  mkdirSync(copy, { recursive: true });

  cpSync(source, copy, {
    recursive: true,
    dereference: false,
    filter: (from) => !NEVER_COPY.has(basename(from)),
  });
  if (stripClaude) stripHodos(copy);
  if (modules) linkModules(source, copy);

  seedHistory(copy);
  return copy;
}

/**
 * Undo everything `init` writes outside `.claude/`. A CLAUDE.md carrying the
 * begin marker keeps every byte above it and loses the block, whether or not
 * the end marker is there; one with no marker at all is the map init writes
 * into a project that had no file, so it goes — the fixtures ship without a
 * CLAUDE.md of their own, and a fixture that grows one is the moment to
 * revisit this.
 */
function stripHodos(copy) {
  rmSync(join(copy, '.claude'), { recursive: true, force: true });

  const claudeMd = join(copy, 'CLAUDE.md');
  if (existsSync(claudeMd)) {
    const text = readFileSync(claudeMd, 'utf8');
    const begin = text.indexOf(BLOCK_BEGIN);
    const end = text.indexOf(BLOCK_END);
    if (begin === -1) {
      rmSync(claudeMd);
    } else {
      // An end marker before the begin marker, or none at all, means the block
      // was truncated: everything from `begin` on is hodos's, and the lines
      // above it are the developer's and stay.
      const head = text.slice(0, begin).replace(/\n+$/, '\n');
      const tail = end < begin ? '' : text.slice(end + BLOCK_END.length).replace(/^\n+/, '');
      writeFileSync(claudeMd, tail === '' ? head : `${head}\n${tail}`);
    }
  }

  const ignore = join(copy, '.gitignore');
  if (!existsSync(ignore)) return;
  const kept = readFileSync(ignore, 'utf8')
    .split('\n')
    .filter((line) => !HODOS_IGNORE.includes(line.trim()));
  writeFileSync(ignore, kept.join('\n'));
}

/** `git init` plus the three commits of D2, oldest first. */
function seedHistory(copy) {
  const git = (...args) => {
    const options = typeof args[args.length - 1] === 'object' ? args.pop() : {};
    return execFileSync(
      'git',
      ['-c', 'user.name=hodos bench', '-c', 'user.email=bench@hodos.invalid', '-c', 'commit.gpgsign=false', ...args],
      { cwd: copy, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'], ...options },
    );
  };

  git('init', '-b', 'main');
  // The copy outlives this script: `bench/run/seed.mjs` commits a task into it
  // and `bench/review/invoke.mjs` a package, and neither can assume the machine
  // has a git identity — a CI runner has none. So the repository carries one.
  git('config', 'user.name', 'hodos bench');
  git('config', 'user.email', 'bench@hodos.invalid');
  git('config', 'commit.gpgsign', 'false');
  const files = stageable(copy, filesUnder(copy), git);
  for (const { subject, group } of COMMITS) {
    const batch = files.filter((file) => commitGroup(file) === group);
    if (batch.length === 0) {
      // "Seeds three conventional commits" is what COMPONENTS.md §7 promises
      // every stage test from 3 to 12. Handing back two, or none, at exit 0
      // moves the failure to whichever stage first reads `git log`.
      const candidates = filesUnder(copy).filter((file) => commitGroup(file) === group);
      throw new Error(
        candidates.length === 0
          ? `fixture-copy: the "${group}" commit has no file — the fixture has nothing of that kind`
          : `fixture-copy: the "${group}" commit has no stageable file — all ${candidates.length} are ignored`,
      );
    }
    for (const chunk of chunked(batch, 100)) git('add', '--', ...chunk);
    git('commit', '-m', subject);
  }
}

/**
 * The files git will accept. Naming an ignored path to `git add` aborts the
 * whole commit, so one build artefact left in a fixture — or one pattern in the
 * developer's global excludes — would otherwise cost the copy entirely, with a
 * message that points at git rather than at this script. The file is still
 * copied; it is only not staged, which is what the fixture's .gitignore asked
 * for.
 */
function stageable(copy, files, git) {
  if (files.length === 0) return files;
  let ignored = '';
  try {
    // -z on both sides: it makes the answer verbatim rather than quoted
    // (core.quotePath escapes a non-ASCII name, and an escaped name matches
    // nothing here), and it makes the separator NUL, which no filename holds.
    ignored = git('check-ignore', '-z', '--stdin', { input: `${files.join('\0')}\0` });
  } catch (error) {
    // Exit 1 is "nothing is ignored"; anything else is a real git failure.
    if (error?.status !== 1) throw error;
  }
  const skip = new Set(ignored.split('\0').filter(Boolean));
  return files.filter((file) => !skip.has(file));
}

function* chunked(items, size) {
  for (let i = 0; i < items.length; i += size) yield items.slice(i, i + size);
}

function main(argv) {
  if (argv.includes('--help')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const options = { stripClaude: false, modules: true };
  let name;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--strip-claude') options.stripClaude = true;
    else if (arg === '--no-modules') options.modules = false;
    else if (arg === '--into') {
      options.into = argv[i + 1];
      i += 1;
      if (!options.into) {
        process.stderr.write('fixture-copy: --into needs a directory\n');
        return 2;
      }
    } else if (arg.startsWith('-')) {
      process.stderr.write(`fixture-copy: unknown option ${arg}\n${USAGE}\n`);
      return 2;
    } else if (name === undefined) name = arg;
    else {
      process.stderr.write(`fixture-copy: one fixture at a time, got "${name}" and "${arg}"\n`);
      return 2;
    }
  }
  if (name === undefined) {
    process.stderr.write(`fixture-copy: name a fixture\n${USAGE}\n`);
    return 2;
  }
  try {
    process.stdout.write(`${copyFixture({ name, ...options })}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
