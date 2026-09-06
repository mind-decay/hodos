#!/usr/bin/env node
// invoke.mjs — build the review packages, dispatch the reviewer, write verdicts.
//
// The split from run.mjs is decision 0027's shape: this file costs a dispatch
// per package and the scorer costs nothing, so the scorer can be proved by unit
// tests and re-run against any verdicts file (decision 0019).
//
// The arm is the one check D closed (PLATFORM-NOTES.md fact 32): a headless
// session inside a throwaway fixture copy, with bypassPermissions, because the
// plugin root sits outside the session's working directory. The session's own
// job is one dispatch; the reviewer does the work and writes review.md.

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { callers, render, section } from '../../scripts/review-package.mjs';
import { loadDefects, loadClean, parseMeta, hunkRanges } from './run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const COPIER = join(REPO, 'bench/scripts/fixture-copy.mjs');

const USAGE = `Usage: node bench/review/invoke.mjs --out <dir> [options]

Builds one review package per group of seeded patches, dispatches
hodos-reviewer at each, and writes <dir>/verdicts.json for run.mjs to score.

  --out <dir>        where the copies, the reviews and the verdicts go
  --only <ids>       comma-separated package ids, for a single package
  --concurrency <n>  packages in flight at once (default 1 — the spend rule)
  --dry-run          build the copies and the packages, dispatch nothing
  --reparse <dir>    read the reviews already in <dir> and rewrite its
                     verdicts.json — a parser fix costs no dispatches. It
                     also rebuilds each package's copy in a temporary
                     directory to refresh the file list, which is the
                     copy's fact and not the review's
  --help             print this and exit 0.

Exit codes: 0 — verdicts.json is written; 1 — a copy or a dispatch failed,
with the reason on stderr; 2 — bad invocation.`;

/** The packages, grouped by what each patch says its package is. */
export function groupPackages(setDir) {
  const defects = loadDefects(setDir);
  const clean = loadClean(setDir);
  const ids = [...new Set(defects.map((d) => d.package))].sort();
  return ids.map((id) => {
    const seeded = defects.filter((d) => d.package === id);
    return {
      id,
      fixture: seeded[0].fixture,
      seeded,
      clean: clean
        .filter((c) => c.package === id)
        .map((c) => ({ ...c, text: readFileSync(join(setDir, c.patch), 'utf8') })),
      plan: readFileSync(join(setDir, 'packages', `${id}.md`), 'utf8'),
    };
  });
}

const cell = (value) => {
  const text = String(value ?? '').trim();
  return text === '' || text === '—' ? null : text;
};

/** A `review.md` as the scorer needs it: verdict, rows, section lengths. */
export function parseReview(text) {
  const verdict = /^Verdict:\s*(ACCEPT|NEEDS_WORK|REJECT)/m.exec(text)?.[1] ?? null;
  const counts = /blockers\s+(\d+)\D+majors\s+(\d+)\D+minors\s+(\d+)/.exec(text);
  const standards = section(text, 'Standards') ?? '';
  const findings = [];
  for (const line of standards.split('\n')) {
    if (!line.trimStart().startsWith('|')) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 6) continue;
    if (/^-{3,}$/.test(cells[0]) || cells[0].toLowerCase() === 'sev') continue;
    const location = cells[1];
    // Reviewers write the location as they would in prose: in backticks, as a
    // range, sometimes two of them. The first file:line is the one it is filed
    // under, and a range is filed at its first line.
    const plain = location.replace(/`/g, '');
    const at = /([\w.-]+(?:\/[\w.-]+)*\.[A-Za-z]\w*):(\d+)/.exec(plain);
    // A finding whose subject is a file that does not exist carries the path it
    // should exist at and no line (FORMATS.md §9, decision 0038). A path is
    // what has a directory in it; prose is not a location.
    const path = at ? null : /([\w.-]+(?:\/[\w.-]+)+)/.exec(plain);
    findings.push({
      sev: cells[0].toLowerCase(),
      file: at ? at[1] : (path?.[1] ?? null),
      line: at ? Number(at[2]) : null,
      location,
      item: cells[2],
      trigger: cell(cells[3]),
      finding: cells[4],
      fix: cells[5],
    });
  }
  // The cap of AUTHORING.md §7 is on words. A table's pipes and rule row are
  // markup, and counting them would fail a section for its shape.
  const words = (name) =>
    (section(text, name) ?? '')
      .replace(/^\s*\|[\s|:-]*\|\s*$/gm, '')
      .replace(/\|/g, ' ')
      .split(/\s+/)
      .filter(Boolean).length;
  return {
    verdict,
    counts: counts
      ? { blockers: Number(counts[1]), majors: Number(counts[2]), minors: Number(counts[3]) }
      : null,
    findings,
    words: { spec: words('Spec'), standards: words('Standards'), coverage: words('Coverage') },
    checks: (section(text, 'Checks run') ?? '').split('\n').filter((l) => l.trim().startsWith('-')),
  };
}

/** Where each defect ended up once its whole package was applied. */
export function resolveAnchors(copyDir, defects) {
  const anchors = {};
  for (const defect of defects) {
    let lines;
    try {
      lines = readFileSync(join(copyDir, defect.file), 'utf8').split('\n');
    } catch {
      continue;
    }
    const index = lines.findIndex((line) => line.trim() === String(defect.anchor ?? '').trim());
    if (index !== -1) anchors[defect.id] = index + 1;
  }
  return anchors;
}

/** The one command this bench runs, per package. */
export function commandFor(pkg, { pluginRoot, copyDir }) {
  const prompt = [
    `Review the task ${pkg.id} by dispatching the agent whose subagent_type is "hodos:hodos-reviewer". Dispatch it once, wait for it, and print the verdict line it returns. Do not review anything yourself and do not read the package.`,
    `Package: ${copyDir}/review-input.md`,
    `Rules: ${copyDir}/.claude/rules/`,
    `Config: ${copyDir}/.claude/hodos/config.json`,
    `Defaults list: ${pluginRoot}/skills/run/references/defaults.md`,
    `Write ${copyDir}/review.md and return the verdict line.`,
  ].join('\n');
  return {
    file: 'claude',
    args: [
      '-p',
      prompt,
      '--plugin-dir',
      pluginRoot,
      '--strict-mcp-config',
      '--permission-mode',
      'bypassPermissions',
      '--output-format',
      'stream-json',
      '--verbose',
    ],
  };
}

const git = (cwd, args) => spawnSync('git', args, { cwd, encoding: 'utf8', maxBuffer: 256 * 1024 * 1024 });

/** A copy with the package applied, its package file written, and its anchors read. */
export function prepare(pkg, out) {
  // Absolute from here down: every path below is handed to a process whose cwd
  // is the copy, so a relative `--out` — the form the README's usage line
  // shows — would resolve inside the copy and name nothing.
  const outDir = resolve(out);
  const copyDir = join(outDir, 'copies', pkg.id);
  const made = spawnSync('node', [COPIER, pkg.fixture, '--into', copyDir], { encoding: 'utf8' });
  if (made.status !== 0) throw new Error(`fixture-copy failed for ${pkg.id}: ${made.stderr}`);
  const base = git(copyDir, ['rev-parse', '--short', 'HEAD']).stdout.trim();

  for (const patch of [...pkg.seeded.map((d) => d.text), ...pkg.clean.map((c) => c.text)]) {
    const file = join(outDir, 'copies', `${pkg.id}.tmp.patch`);
    writeFileSync(file, patch);
    const applied = git(copyDir, ['apply', file]);
    if (applied.status !== 0) throw new Error(`${pkg.id}: a patch did not apply — ${applied.stderr}`);
  }
  git(copyDir, ['add', '-A']);
  git(copyDir, ['commit', '-qm', `feat: ${pkg.id}`]);
  const head = git(copyDir, ['rev-parse', '--short', 'HEAD']).stdout.trim();

  const design = section(pkg.plan, 'Design');
  const tasks = section(pkg.plan, 'Tasks');
  const nonGoals = section(pkg.plan, 'Non-goals');
  const diff = git(copyDir, ['diff', '-U10', `${base}..HEAD`]).stdout.trimEnd();
  // The package the bench scores is the package a task gets, `## Callers`
  // included (decision 0100): a section the bench does not build is a section
  // its recall and precision say nothing about.
  const changed = git(copyDir, ['diff', '--name-only', `${base}..HEAD`])
    .stdout.split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
  writeFileSync(
    join(copyDir, 'review-input.md'),
    render({
      slug: pkg.id,
      base,
      head,
      commits: '1',
      design: `${design}\n### Non-goals (from the plan)\n${nonGoals}`,
      tasks,
      stat: git(copyDir, ['diff', '--stat', `${base}..HEAD`]).stdout.trimEnd(),
      diff,
      callerLines: callers(copyDir, diff, changed),
    }),
  );
  if (!existsSync(join(copyDir, '.claude', 'hodos', 'config.json'))) {
    mkdirSync(join(copyDir, '.claude', 'hodos'), { recursive: true });
    writeFileSync(
      join(copyDir, '.claude', 'hodos', 'config.json'),
      `${JSON.stringify(configFor(copyDir), null, 2)}\n`,
    );
  }
  if (!existsSync(join(copyDir, '.claude', 'rules'))) mkdirSync(join(copyDir, '.claude', 'rules'), { recursive: true });
  // The files the package ships. A finding located by a path alone is credited
  // only when that path is not in this list (FORMATS.md §9, decision 0038), and
  // the list has to come from the copy rather than from the review being
  // scored.
  const files = git(copyDir, ['ls-files']).stdout.split('\n').filter(Boolean);
  return { copyDir, base, head, files, anchors: resolveAnchors(copyDir, pkg.seeded) };
}

/** Commands from the copy's own package.json; a script it lacks stays null. */
function configFor(copyDir) {
  let scripts = {};
  try {
    scripts = JSON.parse(readFileSync(join(copyDir, 'package.json'), 'utf8')).scripts ?? {};
  } catch {
    scripts = {};
  }
  const has = (name) => (scripts[name] ? `npm run ${name}` : null);
  return {
    version: 1,
    commands: { test: scripts.test ? 'npm test' : null, typecheck: has('typecheck'), lint: has('lint') },
    models: { review: 'opus' },
  };
}

const dispatch = (command, cwd) =>
  new Promise((done) => {
    const child = spawn(command.file, command.args, { cwd });
    const events = [];
    let buffer = '';
    child.stdout.on('data', (chunk) => {
      buffer += chunk;
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';
      for (const line of lines) {
        if (line.trim() === '') continue;
        try {
          events.push(JSON.parse(line));
        } catch {
          /* a line that is not an event is the CLI's own noise */
        }
      }
    });
    child.stderr.on('data', () => {});
    child.on('close', (code) => done({ code, events }));
    child.on('error', (error) => done({ code: 1, events, error: error.message }));
  });

async function main(argv) {
  let outDir = null;
  let only = null;
  let concurrency = 1;
  let dryRun = false;
  let reparse = null;
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
    else if (arg === '--reparse') reparse = argv[(i += 1)];
    else {
      process.stderr.write(`review-invoke: unknown option: ${arg}\n${USAGE}\n`);
      return 2;
    }
  }
  if (reparse) {
    const path = join(reparse, 'verdicts.json');
    const verdicts = JSON.parse(readFileSync(path, 'utf8'));
    // One fact is rebuilt rather than read: which files the package ships. A
    // verdicts file written before decision 0038 carries no list, and without
    // one the scorer cannot tell a finding about a missing file from a row that
    // owes a line. The anchors the run recorded are left as the run left them.
    const scratch = mkdtempSync(join(tmpdir(), 'hodos-reparse-'));
    const built = new Map();
    try {
      for (const pkg of groupPackages(HERE)) {
        if (!verdicts.packages.some((p) => p.id === pkg.id)) continue;
        built.set(pkg.id, { files: prepare(pkg, scratch).files });
      }
    } finally {
      rmSync(scratch, { recursive: true, force: true });
    }
    for (const pkg of verdicts.packages) {
      const facts = built.get(pkg.id);
      if (facts) Object.assign(pkg, facts);
      const reviewPath = join(reparse, `${pkg.id}-review.md`);
      if (!existsSync(reviewPath)) continue;
      const review = parseReview(readFileSync(reviewPath, 'utf8'));
      Object.assign(pkg, {
        verdict: review.verdict,
        counts: review.counts,
        findings: review.findings,
        words: review.words,
        checks: review.checks,
      });
      process.stdout.write(`${pkg.id}: ${review.verdict} · ${review.findings.length} findings\n`);
    }
    writeFileSync(path, `${JSON.stringify(verdicts, null, 2)}\n`);
    process.stdout.write(`verdicts: ${path}\n`);
    return 0;
  }
  if (!outDir) {
    process.stderr.write(`review-invoke: --out is required\n${USAGE}\n`);
    return 2;
  }

  const packages = groupPackages(HERE).filter((p) => only === null || only.includes(p.id));
  mkdirSync(join(outDir, 'copies'), { recursive: true });
  const results = [];

  const one = async (pkg) => {
    const started = Date.now();
    const { copyDir, base, head, files, anchors } = prepare(pkg, outDir);
    process.stdout.write(`${pkg.id}: ${copyDir}\n`);
    if (dryRun) {
      results.push({ id: pkg.id, copyDir, files, anchors, findings: [], verdict: null, dryRun: true });
      return;
    }
    const { code, events } = await dispatch(commandFor(pkg, { pluginRoot: REPO, copyDir }), copyDir);
    const result = events.find((e) => e.type === 'result');
    const reviewPath = join(copyDir, 'review.md');
    const review = existsSync(reviewPath) ? parseReview(readFileSync(reviewPath, 'utf8')) : null;
    if (review) cpSync(reviewPath, join(outDir, `${pkg.id}-review.md`));
    results.push({
      id: pkg.id,
      copyDir,
      base,
      head,
      files,
      anchors,
      exit: code,
      verdict: review?.verdict ?? null,
      counts: review?.counts ?? null,
      findings: review?.findings ?? [],
      words: review?.words ?? null,
      checks: review?.checks ?? [],
      turns: result?.num_turns ?? null,
      cost: result?.total_cost_usd ?? null,
      seconds: Math.round((Date.now() - started) / 1000),
    });
    process.stdout.write(`${pkg.id}: ${review?.verdict ?? 'no review.md'} · ${review?.findings.length ?? 0} findings\n`);
  };

  const queue = [...packages];
  const workers = Array.from({ length: Math.max(1, concurrency) }, async () => {
    for (;;) {
      const pkg = queue.shift();
      if (!pkg) return;
      await one(pkg);
    }
  });
  await Promise.all(workers);

  results.sort((a, b) => a.id.localeCompare(b.id));
  // `only` is recorded because the scorer gates on the whole set: a file that
  // holds part of it is a passing run of that part, or a run that lost the
  // rest, and nothing else in the file tells the two apart.
  writeFileSync(
    join(outDir, 'verdicts.json'),
    `${JSON.stringify({ runAt: new Date().toISOString(), only, packages: results }, null, 2)}\n`,
  );
  writeFileSync(
    join(outDir, 'measurements.json'),
    `${JSON.stringify(
      {
        runAt: new Date().toISOString(),
        dispatches: results.length,
        cost: results.reduce((sum, r) => sum + (r.cost ?? 0), 0),
        turns: results.map((r) => ({ id: r.id, turns: r.turns, seconds: r.seconds, cost: r.cost })),
      },
      null,
      2,
    )}\n`,
  );
  process.stdout.write(`verdicts: ${join(outDir, 'verdicts.json')}\n`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
