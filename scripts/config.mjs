#!/usr/bin/env node
// config.mjs — locate and merge `.claude/hodos/config.json` (FORMATS.md §1, §2).
//
// Incident behind the fail-open contract: plugin hooks fire in every session
// where the plugin is enabled (PLATFORM-NOTES.md fact 9), so a session in a
// project that never ran `/hodos:init` runs them too. A hook that errors or
// prints there is noise in someone else's work, so every entry point here
// exits 0 and a missing or unreadable config is `{ "notFound": true }`.
//
// Every other script reads config through `findConfig`, so the walk, the merge
// rule, and the project root are defined once.

import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const CONFIG_REL = join('.claude', 'hodos', 'config.json');

const USAGE = `Usage: node scripts/config.mjs <find|check|preflight> [dir]
       node scripts/config.mjs for-files <path…>

Walks up from [dir] (default: the current directory) to the git root, collects
every .claude/hodos/config.json on the way, and prints them deep-merged with
the nested file winning key by key (FORMATS.md §1).

  find [dir]   print the merged config as JSON, plus _paths (the files that
               contributed, root first) and _projectRoot (the directory of the
               nearest one).
  check [dir]  validate that merged config against the schema of FORMATS.md
               §2 and print one line per finding. An unknown key inside a
               closed object (commands, verify, conventions, models, gates,
               adapters, campaigns, tasks) is an error — that is a feature
               silently off; an unknown key at the top level is a warning,
               because unknown fields are preserved.
  for-files <path…>
               print one entry per config that answers for those paths — the
               configs whose directory contains at least one of them, plus the
               root's for a path in no subproject (FORMATS.md §2, decision
               0076). Paths are git-root-relative in, projectRoot absolute out.
  preflight    report the Node this session runs on against the floor hodos
               declares, and warn when it resolves under a version manager's
               directory. Reads no config: init runs it before the layer
               exists.
  --help       print this and exit 0.

With no config anywhere, find and check print { "notFound": true }. Exit
codes: 0 — find always, and check and preflight when they found nothing worse
than a warning; 1 — an error; 2 — bad invocation.`;

const isPlainObject = (value) => typeof value === 'object' && value !== null && !Array.isArray(value);

/**
 * Deep-merge `over` onto `base` without touching either. Objects merge; arrays
 * and scalars replace — a list is a value, so a nested `stack` states the whole
 * stack rather than appending to the root's.
 */
export function merge(base, over) {
  const out = { ...base };
  for (const [key, value] of Object.entries(over)) {
    out[key] = isPlainObject(value) && isPlainObject(base[key]) ? merge(base[key], value) : value;
  }
  return out;
}

const isDir = (path) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

/** Every directory from `startDir` up to and including the git root, innermost first. */
export function ancestors(startDir) {
  const out = [];
  let dir = resolve(startDir);
  for (;;) {
    out.push(dir);
    if (isDir(join(dir, '.git'))) break; // the git root is the project boundary
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return out;
}

/**
 * The configs that answer for a set of changed paths (decision 0076).
 *
 * `findConfig` merges from one directory upward, which is the config of the
 * subproject a session happens to stand in. A task legitimately touches two
 * subprojects (decision 0071), and then two command sets answer for it: one
 * entry per config whose directory contains at least one of the paths, plus the
 * root's for a path that belongs to no subproject.
 *
 * Paths are git-root-relative in — what `git diff --name-only` prints — and
 * `projectRoot` is absolute out. The walk is lexical rather than filesystem
 * bound, so a deleted file whose directory is gone still names its project.
 * The order is the root first, then by depth and name: an order the caller's
 * path order cannot move, because the package it feeds must be byte-identical
 * for one diff.
 */
export function forFiles(paths, startDir = process.cwd()) {
  const root = gitRoot(startDir);
  if (root === null) return { error: `not a git repository: ${resolve(startDir)}` };

  const groups = new Map();
  for (const path of paths) {
    const abs = resolve(root, path);
    if (abs !== root && !abs.startsWith(root.endsWith(sep) ? root : root + sep)) {
      return { error: `${path} is outside the repository at ${root}` };
    }
    let dir = dirname(abs);
    let owner = null;
    for (;;) {
      if (existsSync(join(dir, CONFIG_REL))) {
        owner = dir;
        break;
      }
      if (dir === root || dirname(dir) === dir) break;
      dir = dirname(dir);
    }
    if (owner === null) continue;
    if (!groups.has(owner)) groups.set(owner, []);
    groups.get(owner).push(path);
  }
  if (groups.size === 0) return { notFound: true };

  // Root first, then by depth and name: the order `find` prints `_paths` in,
  // and the order the reviewer's rows are read in.
  const dirs = [...groups.keys()].sort(
    (a, b) => a.split(sep).length - b.split(sep).length || a.localeCompare(b),
  );
  return {
    projects: dirs.map((dir) => {
      const found = findConfig(dir);
      return {
        dir: dir === root ? '.' : relative(root, dir).split(sep).join('/'),
        projectRoot: dir,
        paths: found.paths,
        config: found.config,
        files: groups.get(dir),
      };
    }),
  };
}

/**
 * The git root at or above `startDir`, or `null` outside a repository.
 *
 * The anchor of decision 0075: a path a config or a script hands to a command
 * resolves against this directory, not against `projectRoot`, which addresses
 * `.claude/hodos/` and nothing else (`FORMATS.md §2`). `.git` is tested for
 * existence rather than for being a directory, because a worktree and a
 * submodule each carry it as a file.
 */
export function gitRoot(startDir = process.cwd()) {
  let dir = resolve(startDir);
  for (;;) {
    if (existsSync(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return null;
    dir = parent;
  }
}

/**
 * The merged config for `startDir`, or `{ notFound: true }`.
 * Returns `{ config, paths, projectRoot }`: `paths` in merge order (root
 * first), `projectRoot` the directory holding the nearest config — the
 * directory `.claude/hodos/tasks/` and `active` live under.
 */
export function findConfig(startDir = process.cwd()) {
  const found = [];
  for (const dir of ancestors(startDir)) {
    const path = join(dir, CONFIG_REL);
    let text;
    try {
      text = readFileSync(path, 'utf8');
    } catch {
      continue;
    }
    try {
      found.push({ dir, path, config: JSON.parse(text) });
    } catch (error) {
      // Fail open: a broken config must not break the session that hosts it.
      process.stderr.write(`config: ${path} is not valid JSON (${error.message}) — skipped\n`);
    }
  }
  if (found.length === 0) return { notFound: true };

  const outermostFirst = found.slice().reverse();
  return {
    config: outermostFirst.reduce((acc, entry) => merge(acc, entry.config), {}),
    paths: outermostFirst.map((entry) => entry.path),
    projectRoot: found[0].dir,
  };
}


// --- which task is this session on (decision 0047)
//
// Four scripts used to re-implement "read .claude/hodos/active and parse the
// state next to it", and `active` is one pointer per project: two terminals on
// one repository silently misattribute a Compact line, a Stop block, or a
// denied commit. The pointer is now per session, `active` is the fallback, and
// the resolution lives here because every one of those four already imports
// this module.

export const hodosDir = (projectRoot) => join(projectRoot, '.claude', 'hodos');

/** A session id that is safe to use as a file name; anything else is no id. */
const cleanSession = (value) =>
  typeof value === 'string' && /^[A-Za-z0-9._-]+$/.test(value.trim()) ? value.trim() : null;

/**
 * The session the caller belongs to: a hook payload's documented `session_id`
 * first, the undocumented `CLAUDE_CODE_SESSION_ID` second, null when neither is
 * there (`PLATFORM-NOTES.md` facts 37 and 38).
 */
export function sessionOf(payload = null) {
  return cleanSession(payload?.session_id) ?? cleanSession(process.env.CLAUDE_CODE_SESSION_ID);
}

function firstLine(path) {
  try {
    const value = readFileSync(path, 'utf8').trim();
    return value === '' ? null : value;
  } catch {
    return null;
  }
}

/**
 * The slug this session is working on: `sessions/<id>` → `active` → null.
 * A session id that names no pointer falls through, so a machine where the id
 * is unreachable behaves exactly as it did before the pointers existed.
 */
export function activeTask(projectRoot, session = sessionOf()) {
  const dir = hodosDir(projectRoot);
  const id = cleanSession(session);
  if (id) {
    const claimed = firstLine(join(dir, 'sessions', id));
    if (claimed) return claimed;
  }
  return firstLine(join(dir, 'active'));
}

/** `state.json` of a task, or null when it is missing or unreadable. */
export function readState(projectRoot, slug) {
  try {
    return JSON.parse(readFileSync(join(hodosDir(projectRoot), 'tasks', slug, 'state.json'), 'utf8'));
  } catch {
    return null;
  }
}

// --- check: the schema of FORMATS.md §2, hand-rolled.
//
// Incident: a misspelled `gates.denyDangerousGits` parses, merges, and leaves
// the gate off with nothing said — "hooks are enforcement" only where the key
// that turns one on is spelled the way the script reads it (research/05 I2).

/**
 * The closed set of roles a phase may call (DESIGN.md §3.2, decision 0061).
 * Every one of them is read by a phase reference; a role with no call site is
 * a config key that turns nothing on and is reported to the developer as a
 * capability, which is the incident `check` exists to catch one level up.
 */
export const ROLES = ['browser', 'docs', 'codeIndex', 'design', 'tracker', 'logs', 'db', 'ci'];

const ADAPTERS_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'adapters');

/**
 * `DESIGN.md §3.2`'s operations column, transcribed, and the contract both
 * adapter checks read. An adapter that maps fewer than its role names answers
 * nothing when the phase that reads it calls — no error at the call, just a
 * capability that stops being reported (decision **0091**). The duplication is
 * answered the way `FORMATS.md §13` answers it for the file's shape: a contract
 * nothing checks is a contract a verifier can silently get nothing from.
 */
export const ROLE_OPERATIONS = {
  // `resize`, `emulate` and `audit` are what the `viewport` and `a11y` kinds
  // are read through (decision 0095); `emulate` also carries the throttled and
  // offline network a claim about a slow connection needs.
  browser: [
    'navigate',
    'stub',
    'snapshot',
    'click',
    'fill',
    'screenshot',
    'evaluate',
    'console',
    'network',
    'resize',
    'emulate',
    'audit',
  ],
  docs: ['resolveLibrary', 'getDocs'],
  codeIndex: ['findReferences', 'outline', 'readSymbol', 'blastRadius', 'affectedTests'],
  design: ['getFrame', 'variables', 'screenshot'],
  tracker: ['link'],
  logs: ['trace'],
  db: ['schema'],
  ci: ['failedRun'],
};

/**
 * An operation line of `FORMATS.md §13`: `<operation>: mcp__<server>__<tool>
 * [{args}]`. Exported because both adapter checks read it and a second copy of
 * this shape is a second answer to "is this operation declared".
 */
export const OPERATION = /^([A-Za-z][A-Za-z0-9]*):[ \t]+mcp__(.+?)__(\S+)/;

/**
 * The operations an adapter file declares, in file order. The region is the
 * lines after `role:` and `server:` and **before** `gotchas:` — a name under
 * `gotchas:` is prose about an operation, not a mapping of one, and the two
 * checks have to stop at the same line or they disagree about a file neither
 * of them is wrong about (Review 2, Stage 11b-3).
 */
export function declaredOperations(text) {
  const lines = text.split('\n');
  const gotchas = lines.findIndex((l) => /^gotchas:[ \t]*$/.test(l));
  const end = gotchas === -1 ? lines.length : gotchas;
  const found = [];
  for (let i = 2; i < end; i += 1) {
    const m = OPERATION.exec(lines[i]);
    if (m) found.push(m[1]);
  }
  return found;
}

/**
 * The operations `role`'s adapter at `file` does not map, in the order the
 * role names them. A file that cannot be read maps nothing, which the caller
 * that already reported the missing file does not report twice.
 */
function missingOperations(file, role) {
  let text;
  try {
    text = readFileSync(file, 'utf8');
  } catch {
    return [];
  }
  const declared = new Set(declaredOperations(text));
  return (ROLE_OPERATIONS[role] ?? []).filter((op) => !declared.has(op));
}

/**
 * The value prefix that sends an adapter to the project layer instead of the
 * plugin (decision 0062). The prefix is what makes shadowing impossible: the
 * config says which directory the file came from, so a project cannot quietly
 * replace a shipped adapter with one of its own.
 */
const PROJECT_PREFIX = 'project:';

/** Adapter file names under <dir>/<role>/, without the extension. */
function adaptersIn(dir, role) {
  try {
    return readdirSync(join(dir, role))
      .filter((name) => name.endsWith('.md'))
      .map((name) => name.slice(0, -3));
  } catch {
    return [];
  }
}

/** Where a project's own adapters live, relative to its root (FORMATS.md §2). */
export const projectAdaptersDir = (projectRoot) => join(hodosDir(projectRoot), 'adapters');

const RECIPE = {
  name: { type: 'string' },
  // `when` is `always | ui | api | perf | <glob>`, so its value is open and
  // only its type is checkable.
  when: { type: 'string' },
  // `a11y` and `viewport` are decision 0095's two non-functional kinds: the
  // class of check a QA does by hand, mechanically answerable and cheap to skip.
  kind: { enum: ['command', 'browser', 'http', 'a11y', 'viewport'] },
  run: { type: 'string' },
  routes: { type: 'string[]' },
  base: { type: 'string' },
  // `viewport` only: the widths in CSS pixels its routes are re-visited at.
  widths: { type: 'number[]' },
};

// The environment stack of decision 0074. A check is one assertion that the
// layer is up — `ps` lists a container and proves nothing, so the kinds are
// the three that answer: a port that opens, a command that exits 0, a URL that
// answers with the status it should.
const CHECK = {
  kind: { enum: ['tcp', 'cmd', 'http'] },
  target: { type: 'string' },
  run: { type: 'string' },
  expect: { type: 'number' },
  timeout: { type: 'number' },
};

// `access` never carries an owner: what hodos asks for is permission to run
// the raise itself, once (decision 0074).
const ACCESS = {
  needs: { type: 'string[]' },
  grant: { enum: ['permissions', 'one-time'] },
  grantedAt: { type: 'string', nullable: true },
};

const LAYER = {
  cwd: { type: 'string' },
  up: { type: 'string' },
  stop: { type: 'string' },
  timeout: { type: 'number' },
  ready: { type: 'string' },
  url: { type: 'string' },
  check: { each: { closed: CHECK } },
  access: { closed: ACCESS },
};

const PROFILE = { layers: { type: 'string[]' } };

// Keys a version of hodos validated and a later one deleted. A project's
// config is a committed file, so a deleted key must not turn into an error on
// the next pull: it is reported once, as a warning, with what replaced it
// (decision 0079).
const RETIRED = {
  'tasks.track': 'retired — task artifacts are working state; the durable record is the commit body, the campaign node and the rules (DESIGN.md §5.1)',
};

const SCHEMA = {
  version: { type: 'number' },
  language: { type: 'string' },
  stack: { type: 'string[]' },
  commands: {
    closed: {
      test: { type: 'string', nullable: true },
      typecheck: { type: 'string', nullable: true },
      lint: { type: 'string', nullable: true },
      build: { type: 'string', nullable: true },
      dev: {
        nullable: true,
        closed: { cmd: { type: 'string' }, url: { type: 'string' }, ready: { type: 'string' } },
      },
    },
  },
  verify: {
    closed: {
      recipes: { each: { closed: RECIPE } },
      // The layer and profile names are the project's own, so both maps are
      // open by key and closed inside each entry.
      profile: { type: 'string' },
      profiles: { map: { closed: PROFILE } },
      layers: { map: { closed: LAYER } },
    },
  },
  // Decision 0065: what the review package leaves out, and the cap behind it.
  review: { closed: { generated: { type: 'string[]' }, maxBytes: { type: 'number' } } },
  conventions: { closed: { commit: { commit: true }, branch: { type: 'string' } } },
  models: {
    closed: Object.fromEntries(
      ['review', 'planReview', 'verify', 'preparer', 'research', 'initScan'].map((role) => [role, { type: 'string' }]),
    ),
  },
  autonomy: { enum: ['ask', 'rulings'] },
  gates: {
    closed: {
      denyDangerousGit: { type: 'boolean' },
      blockCommitOnFailedReview: { type: 'boolean' },
      stopHookLedger: { type: 'boolean' },
    },
  },
  adapters: {
    closed: Object.fromEntries(ROLES.map((role) => [role, { adapter: role, nullable: true }])),
  },
  campaigns: { closed: { external: { type: 'string[]' } } },
  tasks: { closed: { staleDays: { type: 'number' } } },
  nested: { type: 'string[]' },
  verifiedAt: { type: 'string' },
  scanSha: { type: 'string' },
};

/** Levenshtein distance, for "did you mean". */
function distance(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i += 1) {
    const row = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(row[j - 1] + 1, prev[j] + 1, prev[j - 1] + cost);
    }
    prev = row;
  }
  return prev[b.length];
}

/** The candidate closest to `word`, or null when none is close enough to help. */
function nearest(word, candidates) {
  const typed = word.toLowerCase();
  let best = null;
  let bestScore = Infinity;
  let bestDistance = Infinity;
  for (const candidate of candidates) {
    const other = candidate.toLowerCase();
    const d = distance(typed, other);
    // A truncated or over-typed key is the common typo, so a candidate that
    // shares a prefix with what was written wins a tie on distance alone
    // (`rout` is `routes` before it is `run`).
    const score = d - (typed.startsWith(other) || other.startsWith(typed) ? 0.5 : 0);
    if (score < bestScore) {
      best = candidate;
      bestScore = score;
      bestDistance = d;
    }
  }
  return bestDistance <= Math.max(2, Math.floor(word.length / 3)) ? best : null;
}

const typeName = (value) => (Array.isArray(value) ? 'an array' : value === null ? 'null' : `a ${typeof value}`);

function checkValue(value, spec, path, out, ctx) {
  if (value === null) {
    if (!spec.nullable) out.errors.push({ path, message: `expected ${spec.type ?? 'a value'}, got null` });
    return;
  }
  if (spec.closed) {
    if (!isPlainObject(value)) {
      out.errors.push({ path, message: `expected an object, got ${typeName(value)}` });
      return;
    }
    for (const [key, child] of Object.entries(value)) {
      const childSpec = spec.closed[key];
      if (!childSpec) {
        const retired = RETIRED[`${path}.${key}`];
        if (retired) {
          out.warnings.push({ path: `${path}.${key}`, message: retired });
          continue;
        }
        out.errors.push({
          path: `${path}.${key}`,
          message: 'unknown key in a closed object',
          hint: nearest(key, Object.keys(spec.closed)),
        });
        continue;
      }
      checkValue(child, childSpec, `${path}.${key}`, out, ctx);
    }
    return;
  }
  if (spec.map) {
    if (!isPlainObject(value)) {
      out.errors.push({ path, message: `expected an object, got ${typeName(value)}` });
      return;
    }
    for (const [key, child] of Object.entries(value)) checkValue(child, spec.map, `${path}.${key}`, out, ctx);
    return;
  }
  if (spec.each) {
    if (!Array.isArray(value)) {
      out.errors.push({ path, message: `expected an array, got ${typeName(value)}` });
      return;
    }
    value.forEach((item, index) => checkValue(item, spec.each, `${path}[${index}]`, out, ctx));
    return;
  }
  if (spec.enum) {
    if (!spec.enum.includes(value)) {
      out.errors.push({ path, message: `"${value}" is not one of ${spec.enum.join(', ')}` });
    }
    return;
  }
  if (spec.commit) {
    // `conventional | ticket-prefix | custom:<pattern>` (FORMATS.md §2).
    if (typeof value !== 'string' || !/^(conventional|ticket-prefix|custom:.+)$/.test(value)) {
      out.errors.push({ path, message: `"${value}" is not one of conventional, ticket-prefix, custom:<pattern>` });
    }
    return;
  }
  if (spec.adapter) {
    if (typeof value !== 'string') {
      out.errors.push({ path, message: `expected a string or null, got ${typeName(value)}` });
      return;
    }
    if (value.startsWith(PROJECT_PREFIX)) {
      // Each branch names the directory it looked in: "no such adapter" is
      // useless when two directories could have held it.
      const name = value.slice(PROJECT_PREFIX.length);
      if (name === '') {
        out.errors.push({ path, message: `"${value}" names no adapter after "${PROJECT_PREFIX}"` });
        return;
      }
      if (!ctx.projectRoot) {
        out.errors.push({
          path,
          message: `"${value}" resolves against the project layer, and this check was given no project root`,
        });
        return;
      }
      const known = adaptersIn(projectAdaptersDir(ctx.projectRoot), spec.adapter);
      if (!known.includes(name)) {
        out.errors.push({
          path,
          message: `no .claude/hodos/adapters/${spec.adapter}/${name}.md in this project — /hodos:adapter writes one`,
          hint: nearest(name, known),
        });
        return;
      }
      // Decision 0091, binding (i): an adapter that omits one of its role's
      // operations fails this check by name. The phase that calls the missing
      // one takes its `Skip:` branch and reports nothing, so the only place
      // the absence can be loud is here, where the file was just named.
      const file = join(projectAdaptersDir(ctx.projectRoot), spec.adapter, `${name}.md`);
      for (const op of missingOperations(file, spec.adapter)) {
        out.errors.push({
          path,
          message: `role ${spec.adapter} names ${op} and this file maps nothing to it — the phase that calls it gets nothing, and is told nothing (DESIGN.md §3.2)`,
        });
      }
      return;
    }
    const known = adaptersIn(ADAPTERS_DIR, spec.adapter);
    if (!known.includes(value)) {
      out.errors.push({
        path,
        message: `no adapters/${spec.adapter}/${value}.md ships with hodos`,
        hint: nearest(value, known),
      });
    }
    return;
  }
  if (spec.type === 'string[]') {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
      out.errors.push({ path, message: `expected an array of strings, got ${typeName(value)}` });
    }
    return;
  }
  if (spec.type === 'number[]') {
    if (!Array.isArray(value) || value.some((item) => typeof item !== 'number')) {
      out.errors.push({ path, message: `expected an array of numbers, got ${typeName(value)}` });
    }
    return;
  }
  if (typeof value !== spec.type) {
    out.errors.push({ path, message: `expected a ${spec.type}, got ${typeName(value)}` });
  }
}

/**
 * Validate a merged config against FORMATS.md §2.
 * Returns `{ errors, warnings }`, each `{ path, message, hint? }`. No key is
 * required: a nested monorepo config states only what it overrides.
 * `projectRoot` is what a `project:<name>` adapter value resolves against; a
 * check run without one reports that rather than passing the value untested.
 */
export function checkConfig(config, projectRoot) {
  const ctx = { projectRoot };
  const out = { errors: [], warnings: [] };
  if (!isPlainObject(config)) {
    out.errors.push({ path: '<root>', message: `expected an object, got ${typeName(config)}` });
    return out;
  }
  for (const [key, value] of Object.entries(config)) {
    const spec = SCHEMA[key];
    if (!spec) {
      // The top level is open: FORMATS.md §2 ends on "unknown fields are
      // preserved", and that is where a later version's field arrives.
      out.warnings.push({ path: key, message: 'unknown key', hint: nearest(key, Object.keys(SCHEMA)) });
      continue;
    }
    checkValue(value, spec, key, out, ctx);
  }
  checkEnvReferences(config.verify, out);
  checkRecipeFields(config.verify, out);
  return out;
}

/**
 * What a per-value check cannot judge about a recipe. A `viewport` runs its
 * `routes` at each of its `widths`, so an empty or absent either side is a
 * recipe with nothing to iterate, and on any other kind `widths` is a field
 * nothing reads (decision 0095).
 */
function checkRecipeFields(verify, out) {
  if (!isPlainObject(verify) || !Array.isArray(verify.recipes)) return;
  verify.recipes.forEach((recipe, index) => {
    if (!isPlainObject(recipe)) return;
    const path = `verify.recipes[${index}].widths`;
    if (recipe.kind !== 'viewport') {
      if (recipe.widths !== undefined) {
        out.errors.push({ path, message: `widths belongs to a viewport recipe, and this one is ${JSON.stringify(recipe.kind)}` });
      }
      return;
    }
    // The recipe runs routes × widths, so an empty either side is a recipe with
    // nothing to iterate — the failure this rule exists to catch.
    // A `widths` of the wrong type already has its own finding from the type
    // check — one finding per fault, as `checkEnvReferences` has it.
    if (recipe.widths === undefined || (Array.isArray(recipe.widths) && recipe.widths.length === 0)) {
      out.errors.push({
        path,
        message: 'a viewport recipe needs widths — the routes are re-visited at each of them',
      });
    }
    if (recipe.routes === undefined || (Array.isArray(recipe.routes) && recipe.routes.length === 0)) {
      out.errors.push({
        path: `verify.recipes[${index}].routes`,
        message: 'a viewport recipe needs routes — there is nothing to re-visit at those widths',
      });
    }
  });
}

/**
 * The two references inside `verify` that a per-value check cannot see: the
 * active profile names a declared profile, and every profile names declared
 * layers (decision 0074). A name that resolves to nothing is a layer nobody
 * raises, and the run would find that out at the preflight instead of here.
 * A `verify` whose maps are the wrong shape is left to the shape error already
 * recorded — one finding per fault, and the reference cannot be read anyway.
 */
function checkEnvReferences(verify, out) {
  if (!isPlainObject(verify)) return;
  const profiles = isPlainObject(verify.profiles) ? Object.keys(verify.profiles) : [];
  if (typeof verify.profile === 'string' && !profiles.includes(verify.profile)) {
    out.errors.push({
      path: 'verify.profile',
      message: 'no such profile in verify.profiles',
      hint: nearest(verify.profile, profiles),
    });
  }
  if (!isPlainObject(verify.profiles)) return;
  if (verify.layers !== undefined && !isPlainObject(verify.layers)) return;
  const layers = Object.keys(verify.layers ?? {});
  for (const [name, profile] of Object.entries(verify.profiles)) {
    if (!isPlainObject(profile) || !Array.isArray(profile.layers)) continue;
    profile.layers.forEach((layer, index) => {
      if (typeof layer === 'string' && !layers.includes(layer)) {
        out.errors.push({
          path: `verify.profiles.${name}.layers[${index}]`,
          message: 'no such layer in verify.layers',
          hint: nearest(layer, layers),
        });
      }
    });
  }
}

const line = (level, finding) =>
  `${level} ${finding.path}: ${finding.message}${finding.hint ? ` (nearest: ${finding.hint})` : ''}`;

function reportCheck(config, paths, projectRoot) {
  const { errors, warnings } = checkConfig(config, projectRoot);
  const where = paths.join(', ');
  if (errors.length === 0 && warnings.length === 0) {
    process.stdout.write(`config: ok — ${where}\n`);
    return 0;
  }
  const counts = [];
  if (errors.length > 0) counts.push(`${errors.length} error${errors.length === 1 ? '' : 's'}`);
  if (warnings.length > 0) counts.push(`${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
  process.stdout.write(`config: ${counts.join(', ')} — ${where}\n`);
  for (const finding of errors) process.stdout.write(`${line('error', finding)}\n`);
  for (const finding of warnings) process.stdout.write(`${line('warning', finding)}\n`);
  return errors.length > 0 ? 1 : 0;
}

// --- preflight: the two failures a check inside `init` can still reach.
//
// Fact 42 measured the machine with no `node`: both SessionStart hooks report
// the missing executable, the kernel's `!` injection aborts, and the run ends
// at turn 0 — so presence is not what a preflight adds, because nothing that
// could report it has started. What it adds is the floor, and the version
// manager: nvm defines `node` in the login shell that the Bash tool and the
// `!` injection both go through, and Claude Code spawns hooks without it, so a
// machine can have `node` for every kernel and for no hook (decision 0058).

const PLUGIN_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The major version `package.json` declares in `engines.node`, or null. */
function declaredFloor() {
  try {
    const engines = JSON.parse(readFileSync(join(PLUGIN_ROOT, 'package.json'), 'utf8')).engines;
    const match = /(\d+)/.exec(engines?.node ?? '');
    return match ? Number(match[1]) : null;
  } catch {
    return null;
  }
}

// Each manager's env variable, and the directories it uses when the variable
// is unset. A path under one of these is a node the login shell put on PATH.
const MANAGERS = [
  { env: 'NVM_DIR', dirs: ['.nvm'] },
  { env: 'FNM_DIR', dirs: ['.fnm', join('.local', 'share', 'fnm')] },
  { env: 'ASDF_DIR', dirs: ['.asdf'] },
  { env: 'ASDF_DATA_DIR', dirs: [] },
  { env: 'VOLTA_HOME', dirs: ['.volta'] },
  { env: 'N_PREFIX', dirs: [] },
];

// Both sides are read with either separator: `join` writes the platform's, an
// execPath carries whatever the shell that set PATH used, and on Windows they
// are not the same character.
const posix = (path) => path.split(/[\\/]/).join('/');
const under = (path, dir) => {
  const [p, d] = [posix(path), posix(dir).replace(/\/$/, '')];
  return d !== '' && (p === d || p.startsWith(`${d}/`));
};

/** The version manager directory `execPath` sits under, or null. */
function managerDir(execPath, env, home) {
  for (const manager of MANAGERS) {
    const fromEnv = env[manager.env];
    if (fromEnv && under(execPath, fromEnv)) return fromEnv;
    for (const dir of manager.dirs) {
      const abs = join(home, dir);
      if (under(execPath, abs)) return abs;
    }
  }
  return null;
}

/**
 * The Node this process runs on, judged against the floor and its location.
 * Every input is a parameter so the check is testable without a second
 * machine.
 */
export function preflight({
  version = process.version,
  execPath = process.execPath,
  env = process.env,
  home = homedir(),
  floor = declaredFloor(),
} = {}) {
  const out = { version, execPath, floor, errors: [], warnings: [] };
  const major = Number(/v?(\d+)/.exec(version)?.[1]);
  if (floor !== null && Number.isFinite(major) && major < floor) {
    out.errors.push({ path: 'node', message: `${version} is below the floor node >=${floor} that hodos declares` });
  }
  const managed = managerDir(execPath, env, home);
  if (managed) {
    out.warnings.push({
      path: 'node',
      message:
        `${execPath} is under ${managed} — a version manager puts node on PATH from the login shell, and Claude ` +
        'Code spawns a hook with the PATH it was started with, so a session launched outside that shell (the ' +
        'desktop app, a launcher) has node for every kernel and for no hook (PLATFORM-NOTES.md fact 42)',
    });
  }
  return out;
}

function reportPreflight() {
  const { version, execPath, floor, errors, warnings } = preflight();
  const where = `node ${version} at ${execPath}${floor === null ? '' : ` (floor >=${floor})`}`;
  if (errors.length === 0 && warnings.length === 0) {
    process.stdout.write(`preflight: ok — ${where}\n`);
    return 0;
  }
  const counts = [];
  if (errors.length > 0) counts.push(`${errors.length} error${errors.length === 1 ? '' : 's'}`);
  if (warnings.length > 0) counts.push(`${warnings.length} warning${warnings.length === 1 ? '' : 's'}`);
  process.stdout.write(`preflight: ${counts.join(', ')} — ${where}\n`);
  for (const finding of errors) process.stdout.write(`${line('error', finding)}\n`);
  for (const finding of warnings) process.stdout.write(`${line('warning', finding)}\n`);
  return errors.length > 0 ? 1 : 0;
}

function main(argv) {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  if (argv[0] === 'for-files') {
    const paths = argv.slice(1);
    if (paths.length === 0) {
      process.stderr.write(`config: for-files takes one or more git-root-relative paths\n${USAGE}\n`);
      return 2;
    }
    const out = forFiles(paths);
    if (out.error) {
      process.stderr.write(`config: ${out.error}\n`);
      return 1;
    }
    if (out.notFound) {
      process.stdout.write('{ "notFound": true }\n');
      return 0;
    }
    process.stdout.write(`${JSON.stringify(out, null, 2)}\n`);
    return 0;
  }
  if (argv[0] !== 'find' && argv[0] !== 'check' && argv[0] !== 'preflight') {
    process.stderr.write(`config: unknown command: ${argv[0]}\n${USAGE}\n`);
    return 2;
  }
  // preflight is what `init` runs before a layer exists, so it reads none.
  if (argv[0] === 'preflight') return reportPreflight();

  const found = findConfig(argv[1] ?? process.cwd());
  if (found.notFound) {
    process.stdout.write('{ "notFound": true }\n');
    return 0;
  }
  const { config, paths, projectRoot } = found;
  if (argv[0] === 'check') return reportCheck(config, paths, projectRoot);
  process.stdout.write(`${JSON.stringify({ ...config, _paths: paths, _projectRoot: projectRoot }, null, 2)}\n`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
