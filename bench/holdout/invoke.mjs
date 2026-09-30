#!/usr/bin/env node
// invoke.mjs — build the hold-out packages, dispatch the reviewer, write verdicts.
//
// The review bench's dispatch and run loop, pointed at two kinds of package
// (decision 0154):
// - the six snippet packages, whose patches apply to `fixtures/snippets` —
//   the review bench's own `prepare`, with this set's fixture root;
// - the pilot packages, built from a checkout of `ariadne_v2` rather than from
//   this tree, because a patch of the pilot is its source and its licence is
//   not MIT. Each is a worktree at the head its first reviewer saw, holding the
//   very package that reviewer received — recovered from its transcript into
//   the gitignored `pilot-cache/` and checked against the key's sha-256. The
//   first reviewer's package is used, and not one rebuilt from the plan,
//   because the fix pass its finding caused amended that plan.
// With no checkout or no cache, the pilot packages are skipped and the run
// says so: the set's other two sources still run anywhere.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { copyFixture } from '../scripts/fixture-copy.mjs';
import { groupPackages, prepare, runPackages } from '../review/invoke.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const DEFAULT_PILOT = resolve(REPO, '../ariadne_v2');
const CACHE = join(HERE, 'pilot-cache');

const USAGE = `Usage: node bench/holdout/invoke.mjs --out <dir> [options]

Builds the hold-out packages — six from logic-lens's cases, and the pilot's own
from a checkout of ariadne_v2 — dispatches hodos-reviewer at each, and writes
<dir>/verdicts.json and <dir>/measurements.json for run.mjs to score.

  --out <dir>        where the copies, the reviews and the verdicts go
  --only <ids>       comma-separated package ids
  --concurrency <n>  packages in flight at once (default 1 — the spend rule)
  --pilot <dir>      the ariadne_v2 checkout (default: ../ariadne_v2 beside
                     this repository); without one the pilot packages are
                     skipped and listed in verdicts.json's "skipped"
  --dry-run          build every package, dispatch nothing
  --help             print this and exit 0.

A pilot package's worktree runs the pilot's own checks (cargo nextest, cargo
clippy) when the reviewer does, cold: minutes, and a target/ of several GB,
until the run's copies are removed.

Exit codes: 0 — verdicts.json is written; 1 — a copy or a dispatch failed;
2 — bad invocation.`;

const sha = (text) => createHash('sha256').update(text).digest('hex');
const git = (cwd, args) => spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

/** The six snippet packages, from this set's patches, clean files and plans. */
export const snippetPackages = () => groupPackages(HERE);

const copySnippets = (pkg, copyDir) => {
  copyFixture({ name: pkg.fixture, root: join(HERE, 'fixtures'), into: copyDir });
};

/** The pilot packages that can be built here, and the reason for each that cannot. */
export function pilotPackages(key, { pilot = DEFAULT_PILOT, cache = CACHE } = {}) {
  const byPackage = new Map();
  for (const c of key.cases) byPackage.set(c.package, [...(byPackage.get(c.package) ?? []), c]);
  const packages = [];
  const skipped = [];
  for (const [id, cases] of byPackage) {
    const [first] = cases;
    if (!existsSync(join(pilot, '.git'))) skipped.push(`${id}: no checkout at ${pilot}`);
    else if (!existsSync(join(cache, first.slug, 'review-input.md'))) skipped.push(`${id}: no cached package at ${join(cache, first.slug)}`);
    else packages.push({ id, slug: first.slug, base: first.base, head: first.head, cases });
  }
  return { packages, skipped };
}

/** A worktree of the checkout at the package's head, holding the cached package. */
export function prepPilot(pkg, out, { pilot = DEFAULT_PILOT, cache = CACHE } = {}) {
  const outDir = resolve(out);
  const copyDir = join(outDir, 'copies', pkg.id);
  const text = readFileSync(join(cache, pkg.slug, 'review-input.md'), 'utf8');
  if (pkg.cases.some((c) => c.packageSha256 !== sha(text))) {
    throw new Error(`${pkg.id}: the cached package is not the one the key names (sha-256 differs)`);
  }
  mkdirSync(join(outDir, 'copies'), { recursive: true });
  const added = git(pilot, ['worktree', 'add', '--detach', '-q', copyDir, pkg.head]);
  if (added.status !== 0) throw new Error(`${pkg.id}: worktree at ${pkg.head} failed — ${added.stderr}`);
  writeFileSync(join(copyDir, 'review-input.md'), text);
  const files = git(copyDir, ['ls-files']).stdout.split('\n').filter(Boolean);
  const anchors = {};
  for (const c of pkg.cases) {
    let lines;
    try {
      lines = readFileSync(join(copyDir, c.file), 'utf8').split('\n');
    } catch {
      continue;
    }
    const at = lines.findIndex((line) => sha(line.trim()) === c.anchorSha256);
    if (at !== -1) anchors[c.id] = at + 1;
  }
  return { copyDir, base: pkg.base, head: pkg.head, files, anchors };
}

/**
 * A pilot result as it may be committed: what the scorer reads, and no text of
 * the review, which quotes the pilot's code. The full result and the review
 * itself go to `pilot-cache/runs/<run>/`, beside the packages they came from.
 */
export function redactPilot(result) {
  const refs = (text) =>
    text === null || text === undefined
      ? null
      : [...String(text).replace(/`/g, '').matchAll(/(?:[\w./-]+\.[A-Za-z]\w*)?:\d+/g)].map((m) => m[0]).join(' ');
  // An item names a plan field, a rule or an L code, which is what the scorer
  // reads; a quote in it, or a code span, is the pilot's text.
  const itemOf = (item) =>
    typeof item === 'string'
      ? item.replace(/\s*\(?\s*(?:"[^"]*"|“[^”]*”|«[^»]*»|`[^`]*`)\s*\)?/g, '').trim()
      : item;
  const spec = Object.fromEntries(Object.entries(result.spec ?? {}).map(([word, text]) => [word, refs(text)]));
  return {
    ...result,
    findings: (result.findings ?? []).map(({ sev, file, line, item, trigger }) => ({
      sev,
      file,
      line,
      item: itemOf(item),
      trigger: trigger ? 'kept in pilot-cache' : trigger,
    })),
    spec,
    coverage: '',
    checks: [],
  };
}

async function main(argv) {
  let outDir = null;
  let only = null;
  let concurrency = 1;
  let dryRun = false;
  let pilot = DEFAULT_PILOT;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    }
    if (arg === '--out') outDir = argv[(i += 1)];
    else if (arg === '--only') only = String(argv[(i += 1)]).split(',');
    else if (arg === '--concurrency') concurrency = Number(argv[(i += 1)]);
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--pilot') pilot = resolve(argv[(i += 1)]);
    else {
      process.stderr.write(`holdout-invoke: unknown option: ${arg}\n${USAGE}\n`);
      return 2;
    }
  }
  if (!outDir) {
    process.stderr.write(`holdout-invoke: --out is required\n${USAGE}\n`);
    return 2;
  }
  const key = JSON.parse(readFileSync(join(HERE, 'key.json'), 'utf8'));
  const { packages: pilotPkgs, skipped } = pilotPackages(key, { pilot });
  const wanted = (p) => only === null || only.includes(p.id);
  const snippets = snippetPackages().filter(wanted).map((p) => ({ ...p, kind: 'snippets' }));
  const pilots = pilotPkgs.filter(wanted).map((p) => ({ ...p, kind: 'pilot' }));
  for (const reason of skipped) process.stdout.write(`skipped ${reason}\n`);
  await runPackages({
    packages: [...snippets, ...pilots],
    outDir,
    only,
    concurrency,
    dryRun,
    prep: (pkg, out) => (pkg.kind === 'pilot' ? prepPilot(pkg, out, { pilot }) : prepare(pkg, out, { copy: copySnippets })),
  });
  // The skipped packages go into the verdicts file, so a run that could not
  // build the pilot's half cannot be read as one that scored it.
  const path = join(outDir, 'verdicts.json');
  const verdicts = JSON.parse(readFileSync(path, 'utf8'));
  const kept = join(CACHE, 'runs', basename(resolve(outDir)));
  const pilotIds = new Set(pilots.map((p) => p.id));
  if (pilotIds.size > 0) mkdirSync(kept, { recursive: true });
  const packages = verdicts.packages.map((result) => {
    if (!pilotIds.has(result.id)) return result;
    writeFileSync(join(kept, `${result.id}.json`), `${JSON.stringify(result, null, 2)}\n`);
    const review = join(outDir, `${result.id}-review.md`);
    if (existsSync(review)) renameSync(review, join(kept, `${result.id}-review.md`));
    return redactPilot(result);
  });
  writeFileSync(path, `${JSON.stringify({ ...verdicts, packages, skipped }, null, 2)}\n`);
  process.stdout.write(`verdicts: ${path}\n`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
