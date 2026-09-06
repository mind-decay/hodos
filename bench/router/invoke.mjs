#!/usr/bin/env node
// invoke.mjs — produce the router bench's verdicts file by running the real
// kernel, one headless session per case.
//
// `run.mjs` scores; this file invokes. The arm is the one PLATFORM-NOTES.md
// fact 32 fixes: `claude -p "/hodos:task <text>"` inside a throwaway fixture
// copy, with `--permission-mode bypassPermissions` because the plugin root
// sits outside the session's working directory and the kernel stops rather
// than route from memory when it cannot read its reference.
//
// What is scored is the verdict the router *prints* (references/route.md §5),
// not `brief.md`: a headless session has no AskUserQuestion, so it prints and
// stops, and printing before asking is the procedure anyway.
//
// The model call is not unit-tested. The parsing and the collection are —
// decision 0019 keeps the grader provable without an API key.

import { spawn, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { PATHS, ROWS, TYPES, loadSet } from './run.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const COPIER = join(REPO, 'bench/scripts/fixture-copy.mjs');

const USAGE = `Usage: node bench/router/invoke.mjs [options]

Runs every case of the set through the task kernel in a headless session and
writes the verdicts file run.mjs scores, plus the measurements beside it.

  --out <dir>          where copies, streams, verdicts.json, rows.json and
                       measurements.json go (default: a fresh temp directory)
  --set <file>         use this set instead of bench/router/set.json
  --only <ids>         comma-separated case ids, for a re-run of a few
  --concurrency <n>    sessions in flight (default 4)
  --plugin-dir <path>  the plugin under test (default: this repository)
  --dry-run            print the command for each case and exit 0
  --help               print this and exit 0

Exit codes: 0 — every case produced a verdict; 1 — at least one did not, or a
fixture copy failed; 2 — bad invocation.`;

/** The label of each checklist row, as a pattern tolerant of the model's wording. */
const ROW_PATTERNS = {
  files: /^files touched/,
  newModule: /^new module$/,
  contract: /^contract/,
  dependency: /^new dependenc/,
  migration: /^data migration$/,
  units: /mergeable unit/,
  fog: /^fog$/,
  developers: /developer/,
  wait: /external wait/,
};

/**
 * An evidence cell that says nothing. `unknown` is a *value*, never evidence —
 * and `none` is evidence, not its absence: it is what `FORMATS.md §3`'s own
 * worked example writes for a migration and a wait that do not exist.
 */
const EMPTY_EVIDENCE = new Set(['', '-', '—', '–', 'n/a', 'not checked']);

/**
 * The three verdict lines, as `references/route.md §5` prints them. The last
 * printed block wins: a run that corrected itself meant the correction.
 * @returns {{ path: string|null, type: string|null, campaign: boolean|null }}
 */
export function parseVerdict(text) {
  const last = (re, allowed) => {
    let found = null;
    for (const m of text.matchAll(re)) {
      const value = m[1].toLowerCase();
      if (allowed.includes(value)) found = value;
    }
    return found;
  };
  const path = last(/^\s*(?:[*#>\s]*)Path:\s*\*{0,2}([A-Za-z-]+)/gm, PATHS);
  const type = last(/^\s*(?:[*#>\s]*)Type:\s*\*{0,2}([A-Za-z-]+)/gm, TYPES);
  const campaign = last(/^\s*(?:[*#>\s]*)Campaign:\s*\*{0,2}([A-Za-z-]+)/gm, ['yes', 'no']);
  return { path, type, campaign: campaign === null ? null : campaign === 'yes' };
}

/**
 * The checklist rows the run printed, in the order `FORMATS.md §3` fixes.
 * A row it never printed is absent; a row with an empty evidence cell is
 * present and carries `hasEvidence: false`, which is the thing worth counting.
 */
export function parseChecklist(text) {
  const cells = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|')) continue;
    // A cell may hold an escaped pipe — `'open' \| 'paid'` is one evidence
    // cell, not three. Splitting naively shifted every later cell left and
    // read a fragment of the evidence as the row's value.
    const parts = trimmed
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split(/(?<!\\)\|/)
      .map((c) => c.replace(/\\\|/g, '|').trim());
    if (parts.length < 3) continue;
    cells.push(parts);
  }
  const out = [];
  for (const { key, row } of ROWS) {
    const pattern = ROW_PATTERNS[key];
    const found = cells.find((c) => pattern.test(c[0].replace(/[`*]/g, '').toLowerCase()));
    if (!found) continue;
    const evidence = found[1];
    out.push({
      key,
      row,
      evidence,
      value: found[2],
      hasEvidence: !EMPTY_EVIDENCE.has(evidence.replace(/[`*]/g, '').trim().toLowerCase()),
    });
  }
  return out;
}

/**
 * The nine rows each case printed, kept beside its verdict. A verdict is an
 * aggregate of nine judgements, and until Stage 11a's T10 only the aggregate
 * survived the run: the rows lived in the stream files and died with the
 * scratch directory. `run.mjs --rows` scores agreement from this file.
 * @param {{ one: { id: string }, summary: { rows: unknown[] } }[]} results
 */
export function rowsFile(results) {
  return results.map(({ one, summary }) => ({ id: one.id, rows: summary.rows }));
}

/** Where a tool call points, when the input carries a path at all. */
const PATH_KEYS = { Bash: 'command', Read: 'file_path', Glob: 'path', Grep: 'path', Write: 'file_path' };

/**
 * Procedure, evidence, discovery. The router's ≤5 budget is evidence calls:
 * step 0's `config.mjs find` and the read of the phase reference are what the
 * procedure *requires*, so counting them would make two invariants contradict
 * each other. A `ToolSearch` is the headless arm looking for a tool an
 * interactive session already has, and is neither.
 */
export function classifyToolUses(uses, { pluginRoot }) {
  const counts = { total: 0, procedure: 0, evidence: 0, discovery: 0 };
  for (const use of uses) {
    counts.total += 1;
    if (use.name === 'ToolSearch') {
      counts.discovery += 1;
      continue;
    }
    const key = PATH_KEYS[use.name];
    const target = key ? String(use.input?.[key] ?? '') : '';
    if (target.includes(pluginRoot)) counts.procedure += 1;
    else counts.evidence += 1;
  }
  return counts;
}

/** The one command this bench runs. */
export function commandFor(one, { pluginRoot }) {
  return {
    file: 'claude',
    args: [
      '-p',
      `/hodos:task ${one.description}`,
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

/** One pass over a run's stream: what it decided, what it showed, what it spent. */
export function summarize(events, { pluginRoot }) {
  const uses = [];
  let text = '';
  let result = null;
  for (const event of events) {
    if (event.type === 'result') {
      result = event;
      continue;
    }
    const content = event.message?.content;
    if (!Array.isArray(content)) continue;
    for (const block of content) {
      if (block.type === 'text') text += `${block.text}\n`;
      if (block.type === 'tool_use') uses.push(block);
    }
  }
  const rows = parseChecklist(text);
  return {
    verdict: parseVerdict(text),
    rows,
    rowsWithEvidence: rows.filter((r) => r.hasEvidence).length,
    tools: classifyToolUses(uses, { pluginRoot }),
    turns: result?.num_turns ?? null,
    cost: result?.total_cost_usd ?? null,
    subtype: result?.subtype ?? null,
    text,
  };
}

/**
 * A fixture copy the kernel's step 0 can get past. Stage 3 committed a hodos
 * layer for `webapp` only, and a copy without one stops at "run /hodos:init
 * first" — which is correct behavior and no routing at all. Commands come from
 * the copy's own scripts; a script it does not have stays `null`, never a
 * command nobody ran.
 * @returns {boolean} whether this call wrote the file
 */
export function seedConfig(dir) {
  const target = join(dir, '.claude/hodos/config.json');
  if (existsSync(target)) return false;
  let scripts = {};
  try {
    scripts = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8')).scripts ?? {};
  } catch {
    scripts = {};
  }
  const script = (name, invocation) => (scripts[name] ? invocation : null);
  const config = {
    version: 1,
    language: 'en',
    stack: [],
    commands: {
      test: script('test', 'npm test'),
      typecheck: script('typecheck', 'npm run typecheck'),
      lint: script('lint', 'npm run lint'),
      build: script('build', 'npm run build'),
      dev: scripts.dev ? { cmd: 'npm run dev' } : null,
    },
    verify: { recipes: scripts.test ? [{ name: 'unit', kind: 'command', run: 'npm test', when: 'always' }] : [] },
    conventions: { commit: 'conventional', branch: 'feature/{slug}' },
    models: { review: 'opus', planReview: 'opus', verify: 'sonnet', research: 'sonnet', initScan: 'sonnet' },
    autonomy: 'ask',
    gates: { denyDangerousGit: false, blockCommitOnFailedReview: false, stopHookLedger: false },
    adapters: { browser: null, codeIndex: null, tracker: null, design: null },
    campaigns: { external: [] },
    tasks: { track: false, staleDays: 14 },
    nested: [],
    verifiedAt: new Date().toISOString().slice(0, 10),
    scanSha: 'bench',
  };
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, `${JSON.stringify(config, null, 2)}\n`);
  return true;
}

/** One copy per fixture, made once and shared by that fixture's cases. */
function prepareCopies(names, outDir) {
  const copies = new Map();
  for (const name of names) {
    const into = join(outDir, 'copies', name);
    const made = spawnSync('node', [COPIER, name, '--into', into, '--no-modules'], { encoding: 'utf8' });
    if (made.status !== 0) throw new Error(`fixture-copy ${name}: ${made.stderr.trim()}`);
    const seeded = seedConfig(into);
    copies.set(name, { dir: into, seeded });
  }
  return copies;
}

/** One headless session. Resolves with the parsed stream, never rejects. */
function runCase(one, { dir, pluginRoot, streamPath }) {
  const { file, args } = commandFor(one, { pluginRoot });
  return new Promise((done) => {
    const child = spawn(file, args, { cwd: dir });
    let out = '';
    let err = '';
    child.stdout.on('data', (chunk) => {
      out += chunk;
    });
    child.stderr.on('data', (chunk) => {
      err += chunk;
    });
    child.on('error', (error) => done({ events: [], stderr: String(error), status: null }));
    child.on('close', (status) => {
      writeFileSync(streamPath, out);
      const events = [];
      for (const line of out.split('\n')) {
        if (!line.trim()) continue;
        try {
          events.push(JSON.parse(line));
        } catch {
          // A line the CLI wrote that is not an event: kept in the stream file.
        }
      }
      done({ events, stderr: err, status });
    });
  });
}

/** Run `jobs` with at most `width` in flight, preserving input order in the result. */
async function pool(jobs, width) {
  const results = new Array(jobs.length);
  let next = 0;
  const workers = Array.from({ length: Math.min(width, jobs.length) }, async () => {
    for (;;) {
      const index = next;
      next += 1;
      if (index >= jobs.length) return;
      results[index] = await jobs[index]();
    }
  });
  await Promise.all(workers);
  return results;
}

function parseArgv(argv) {
  const options = { out: null, set: undefined, only: null, concurrency: 4, pluginRoot: REPO, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    const value = argv[i + 1];
    if (arg === '--dry-run') options.dryRun = true;
    else if (arg === '--out' || arg === '--set' || arg === '--only' || arg === '--concurrency' || arg === '--plugin-dir') {
      if (!value) throw new Error(`${arg} needs a value`);
      i += 1;
      if (arg === '--out') options.out = resolve(value);
      if (arg === '--set') options.set = value;
      if (arg === '--only') options.only = value.split(',').map((s) => s.trim()).filter(Boolean);
      if (arg === '--concurrency') options.concurrency = Number(value);
      if (arg === '--plugin-dir') options.pluginRoot = resolve(value);
    } else throw new Error(`unknown argument ${arg}`);
  }
  if (!Number.isInteger(options.concurrency) || options.concurrency < 1) {
    throw new Error('--concurrency takes a positive integer');
  }
  return options;
}

async function main(argv) {
  if (argv.includes('--help')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  let options;
  try {
    options = parseArgv(argv);
  } catch (error) {
    process.stderr.write(`invoke: ${error.message}\n${USAGE}\n`);
    return 2;
  }

  const set = loadSet(options.set);
  const cases = options.only ? set.cases.filter((c) => options.only.includes(c.id)) : set.cases;
  if (cases.length === 0) {
    process.stderr.write('invoke: no case matched --only\n');
    return 2;
  }

  if (options.dryRun) {
    for (const one of cases) {
      const { file, args } = commandFor(one, { pluginRoot: options.pluginRoot });
      process.stdout.write(`${one.id} [${one.fixture}] ${file} ${args.map((a) => JSON.stringify(a)).join(' ')}\n`);
    }
    return 0;
  }

  const outDir = options.out ?? join(process.env.TMPDIR ?? '/tmp', `hodos-router-${Date.now()}`);
  mkdirSync(join(outDir, 'streams'), { recursive: true });
  let copies;
  try {
    copies = prepareCopies([...new Set(cases.map((c) => c.fixture))], outDir);
  } catch (error) {
    process.stderr.write(`invoke: ${error.message}\n`);
    return 1;
  }
  for (const [name, copy] of copies) {
    process.stdout.write(`copy ${name} → ${copy.dir}${copy.seeded ? ' (config seeded)' : ''}\n`);
  }

  const jobs = cases.map((one) => async () => {
    const streamPath = join(outDir, 'streams', `${one.id}.jsonl`);
    const run = await runCase(one, {
      dir: copies.get(one.fixture).dir,
      pluginRoot: options.pluginRoot,
      streamPath,
    });
    const summary = summarize(run.events, { pluginRoot: options.pluginRoot });
    process.stdout.write(
      `${one.id.padEnd(4)} ${String(summary.verdict.path).padEnd(9)} ${String(summary.verdict.type).padEnd(9)} ` +
        `campaign=${String(summary.verdict.campaign).padEnd(5)} rows=${summary.rowsWithEvidence}/9 ` +
        `evidence-calls=${summary.tools.evidence} tools=${summary.tools.total} ${summary.subtype ?? 'no-result'}\n`,
    );
    return { one, summary, status: run.status, stderr: run.stderr, streamPath };
  });

  const results = await pool(jobs, options.concurrency);

  const verdicts = results.map(({ one, summary }) => ({
    id: one.id,
    path: summary.verdict.path,
    type: summary.verdict.type,
    campaign: summary.verdict.campaign,
  }));
  const rows = rowsFile(results);
  const measurements = results.map(({ one, summary, status, streamPath }) => ({
    id: one.id,
    fixture: one.fixture,
    toolCalls: summary.tools.total,
    evidenceCalls: summary.tools.evidence,
    procedureCalls: summary.tools.procedure,
    discoveryCalls: summary.tools.discovery,
    rowsWithEvidence: summary.rowsWithEvidence,
    rowsPrinted: summary.rows.length,
    turns: summary.turns,
    cost: summary.cost,
    subtype: summary.subtype,
    exit: status,
    stream: streamPath,
  }));

  writeFileSync(join(outDir, 'verdicts.json'), `${JSON.stringify(verdicts, null, 2)}\n`);
  writeFileSync(join(outDir, 'rows.json'), `${JSON.stringify(rows, null, 2)}\n`);
  writeFileSync(join(outDir, 'measurements.json'), `${JSON.stringify(measurements, null, 2)}\n`);

  const silent = verdicts.filter((v) => v.path === null);
  const overBudget = measurements.filter((m) => m.evidenceCalls > 5);
  const thinRows = measurements.filter((m) => m.rowsWithEvidence < 9);
  const spend = measurements.reduce((sum, m) => sum + (m.cost ?? 0), 0);
  process.stdout.write(
    `\n${verdicts.length} cases · ${silent.length} without a verdict · ${overBudget.length} over 5 evidence calls · ` +
      `${thinRows.length} with a row lacking evidence · $${spend.toFixed(2)}\n` +
      `verdicts: ${join(outDir, 'verdicts.json')}\nrows: ${join(outDir, 'rows.json')}\n` +
      `measurements: ${join(outDir, 'measurements.json')}\n`,
  );
  return silent.length === 0 ? 0 : 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
