#!/usr/bin/env node
// run.mjs — the no-op bench: does the line change the behavior it claims to?
//
// AUTHORING.md §2 asks one question of every sentence in the engine: would the
// model do this without the line? COMPONENTS.md §7 turns it into a measurement
// with a control. Each scenario names one line, a prompt that exercises it, and
// a check the line is supposed to make true. The run makes two arms — with the
// line and with it removed — and the scenario passes only when the with-line
// arm meets the check and the without-line arm does not. The without-line arm
// is expected to fail: that delta is the whole signal, and without it "the
// behavior differed" is the reader's judgement rather than a result.
//
// Two jobs, split the way decision 0019 asks: `--invoke` runs the arms and
// makes model calls; everything else scores what a run wrote and makes none,
// which is what run.test.mjs proves.

import { spawn, spawnSync } from 'node:child_process';
import {
  cpSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  realpathSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { gate, measurement, report } from '../report.mjs';
import { classifyToolUses, seedConfig } from '../router/invoke.mjs';
import { groupPackages, prepare as preparePackage } from '../review/invoke.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..', '..');
const DEFAULT_SET = join(HERE, 'scenarios.json');
const ARMS = ['with', 'without'];

const USAGE = `Usage: node bench/noop/run.mjs [--check-scenarios | --observations <file> | --invoke --out <dir>]

  --check-scenarios     every scenario's line is in the file it names, exactly
                        once, and its check is one this bench knows (default)
  --invoke --out <dir>  run both arms of every scenario and write
                        <dir>/observations.json — this is the half that calls
                        the model
  --observations <file> score a run's observations
  --scenarios <file>    use this set instead of bench/noop/scenarios.json
  --only <ids>          comma-separated scenario ids
  --config-dir <dir>    run every arm with this CLAUDE_CONFIG_DIR (inherited
                        when absent)
  --print-set           print the resolved set as JSON and exit
  --dry-run             with --invoke: print what each arm would run, run nothing
  --json                print the labeled JSON report as well as the table
  --help                print this and exit 0

Exit codes: 0 — the set is consistent, or the gate passed (or is unset, without
--json); 1 — a scenario is inconsistent, or the gate failed; 2 — a bad
invocation, or --json while the threshold is unset, because a report with no
gate reports nothing (report.mjs:46).`;

// ---------------------------------------------------------------- the scorer

/** The checklist rows a router prints, as `| row | evidence | value |`. */
function valueCells(text) {
  const cells = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) continue;
    const parts = trimmed.slice(1, -1).split(/(?<!\\)\|/).map((part) => part.trim());
    if (parts.length !== 3) continue;
    if (/^-+$/.test(parts[0].replace(/[: ]/g, '')) && /^-+$/.test(parts[2].replace(/[: ]/g, ''))) continue;
    if (parts[0].toLowerCase() === 'row') continue;
    cells.push(parts[2]);
  }
  return cells;
}

/**
 * One check against one arm's observation. Pure: it reads the record a run
 * wrote and calls no model, which is what lets the tests cover it.
 * @param {{ kind: string, pattern?: string, path?: string, metric?: string, max?: number }} check
 * @param {{ text: string, files: Record<string, string>, paths: string[], metrics: Record<string, number> }} observation
 * @returns {{ value: boolean, why: string }}
 */
export function evaluate(check, observation) {
  // Patterns are read line by line, which is how a check on a transcript or a
  // written file is meant: `^Coverage:` finds the line, not the file's first
  // character. A check that has to hold for the whole string — "git status
  // printed this and nothing else" — sets `"flags": ""` and anchors it.
  const re = () => new RegExp(check.pattern, check.flags ?? 'm');
  switch (check.kind) {
    case 'transcript': {
      const hit = re().test(observation.text ?? '');
      return { value: hit, why: hit ? 'the transcript carries it' : 'the transcript does not carry it' };
    }
    case 'transcript-absent': {
      const hit = re().test(observation.text ?? '');
      return { value: !hit, why: hit ? 'the transcript carries it' : 'the transcript does not carry it' };
    }
    case 'file': {
      const body = observation.files?.[check.path];
      if (body === undefined) return { value: false, why: `no ${check.path} was collected` };
      const hit = re().test(body);
      return { value: hit, why: `${check.path} ${hit ? 'matches' : 'does not match'}` };
    }
    case 'rows': {
      const cells = valueCells(observation.text ?? '');
      if (cells.length === 0) return { value: false, why: 'no checklist row was printed' };
      const bad = cells.filter((cell) => !re().test(cell));
      return {
        value: bad.length === 0,
        why: bad.length === 0 ? `${cells.length} rows, every value legal` : `illegal values: ${bad.join(', ')}`,
      };
    }
    case 'metric': {
      const value = observation.metrics?.[check.metric];
      if (typeof value !== 'number') return { value: false, why: `${check.metric} was not measured` };
      return { value: value <= check.max, why: `${check.metric} ${value} vs ≤${check.max}` };
    }
    case 'path-absent': {
      const hit = (observation.paths ?? []).some((path) => path === check.path || path.startsWith(`${check.path}/`));
      return { value: !hit, why: hit ? `${check.path} was created` : `${check.path} was not created` };
    }
    default:
      throw new Error(`check: unknown kind ${JSON.stringify(check.kind)}`);
  }
}

/** The delta, which is the whole result. */
export function scoreScenario(scenario, withArm, withoutArm) {
  if (!withArm) return { id: scenario.id, passed: false, why: 'the with-line arm is missing' };
  if (!withoutArm) return { id: scenario.id, passed: false, why: 'the without-line control is missing' };
  const kept = evaluate(scenario.check, withArm);
  const control = evaluate(scenario.check, withoutArm);
  if (!kept.value) {
    return { id: scenario.id, with: kept, without: control, passed: false, why: `with the line the check fails: ${kept.why}` };
  }
  if (control.value) {
    return {
      id: scenario.id,
      with: kept,
      without: control,
      passed: false,
      why: `the control also passes, so the line changed nothing: ${control.why}`,
    };
  }
  return { id: scenario.id, with: kept, without: control, passed: true, why: `${kept.why}; control: ${control.why}` };
}

export function score(set, observations) {
  const byArm = new Map(observations.map((one) => [`${one.id}:${one.arm}`, one]));
  const scenarios = set.scenarios.map((scenario) =>
    scoreScenario(scenario, byArm.get(`${scenario.id}:with`), byArm.get(`${scenario.id}:without`)),
  );
  const passedCount = scenarios.filter((one) => one.passed).length;
  const total = scenarios.length;
  const rate = total === 0 ? 0 : passedCount / total;
  const threshold = typeof set.threshold === 'number' ? set.threshold : null;
  return { scenarios, passedCount, total, rate, threshold, passed: threshold === null ? null : rate >= threshold };
}

/** A scenario whose line is not where it says, or is there twice, is not measurable. */
export function checkScenarios(set, { root = ROOT } = {}) {
  const problems = [];
  const known = ['transcript', 'transcript-absent', 'file', 'rows', 'metric', 'path-absent'];
  const seen = new Set();
  for (const scenario of set.scenarios) {
    if (seen.has(scenario.id)) problems.push(`${scenario.id}: the id is used twice`);
    seen.add(scenario.id);
    if (!known.includes(scenario.check?.kind)) {
      problems.push(`${scenario.id}: check kind ${JSON.stringify(scenario.check?.kind)} is not one of ${known.join(', ')}`);
    }
    // A pattern that throws at scoring time is a run already paid for and not
    // scored, so it is caught here instead. JavaScript has no inline `(?m)`;
    // the flag is the default and `"flags"` is where a scenario changes it.
    if (typeof scenario.check?.pattern === 'string') {
      try {
        new RegExp(scenario.check.pattern, scenario.check.flags ?? 'm');
      } catch (error) {
        problems.push(`${scenario.id}: the pattern does not compile — ${error.message}`);
      }
    }
    if (!Array.isArray(scenario.lines) || scenario.lines.length === 0) {
      problems.push(`${scenario.id}: no lines — a scenario names every home of its rule (decision 0073)`);
      continue;
    }
    for (const home of scenario.lines) {
      let body;
      try {
        body = readFileSync(join(root, home.file), 'utf8');
      } catch {
        problems.push(`${scenario.id}: ${home.file} is not there`);
        continue;
      }
      const times = body.split('\n').filter((line) => line.trim() === home.line.trim()).length;
      if (times === 0) problems.push(`${scenario.id}: the line is not in ${home.file}`);
      else if (times > 1) {
        problems.push(
          `${scenario.id}: ${home.file} carries the line ${times} times; removing it would remove ${times} behaviors`,
        );
      }
      if (home.replaceWith !== undefined && home.replaceWith.trim() === home.line.trim()) {
        problems.push(`${scenario.id}: ${home.file}'s replaceWith is the line itself, so the control keeps the rule`);
      }
    }
    problems.push(...probeControl(scenario, root));
  }
  return problems;
}

/**
 * The homes a scenario missed, found by reading rather than by paying for a
 * run. Two runs of this bench were spent on sweeps that looked complete and
 * were not: run 1 left the rule in `docs/`, and run 2's `task-preflight-stop`
 * control quoted `skills/init/SKILL.md`'s own `description` back — a line the
 * platform loads into every session whether or not anything reads the file.
 * `probe` is a pattern that matches any statement of the rule; every prose file
 * of the control copy is read for it, and a hit the scenario has not declared
 * in `probeAllows` is a problem before a session is bought.
 *
 * Scripts are outside the sweep on purpose: the harness deletes prose, never
 * code, so a rule a script enforces stays enforced and the scenario says so in
 * its `note`.
 */
function probeControl(scenario, root) {
  if (typeof scenario.probe !== 'string') return [];
  let pattern;
  try {
    pattern = new RegExp(scenario.probe, 'm');
  } catch (error) {
    return [`${scenario.id}: the probe does not compile — ${error.message}`];
  }
  const dir = mkdtempSync(join(tmpdir(), 'hodos-noop-probe-'));
  try {
    const copy = pluginFor(scenario, 'without', dir, { root });
    const allowed = new Set(scenario.probeAllows ?? []);
    const hits = [];
    for (const file of proseFiles(copy)) {
      // `/` on every platform: `probeAllows` and `SWEEP_SKIPS` name their
      // files that way, and so does the message this builds.
      const rel = file.slice(copy.length + 1).split(sep).join('/');
      if (allowed.has(rel) || SWEEP_SKIPS.has(rel)) continue;
      const body = readFileSync(file, 'utf8');
      for (const [index, line] of body.split('\n').entries()) {
        if (pattern.test(line)) hits.push(`${rel}:${index + 1}`);
      }
    }
    if (hits.length === 0) return [];
    return [
      `${scenario.id}: the control still states the rule at ${hits.join(', ')} — ` +
        'name each as a home, or declare it in probeAllows with the reason',
    ];
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

/** Prose the model can read as an instruction. Code is not swept. */
const SWEEP_SKIPS = new Set(['docs/DECISIONS.md', 'docs/BACKLOG.md', 'CHANGELOG.md']);

function proseFiles(dir) {
  const out = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) out.push(...proseFiles(path));
    else if (entry.name.endsWith('.md')) out.push(path);
  }
  return out;
}

export function loadSet(path = DEFAULT_SET) {
  const set = JSON.parse(readFileSync(path, 'utf8'));
  if (!Array.isArray(set.scenarios)) throw new Error(`${path}: no scenarios array`);
  return set;
}

// ------------------------------------------------------------- the two arms

/**
 * The plugin the arm runs against: this repository as it is published, with the
 * rule kept or cut.
 *
 * Run 1 (2026-09-03) scored 0 of 6 and the reason was the copy, not the model:
 * every rule in a skill has a second home in the specification the plugin ships
 * beside it, and deleting one line left the rule in the artifact. So the
 * without-arm removes **every** home a scenario names, and a home the rule
 * shares with other rules carries a `replaceWith` — the same line with the
 * rule's clause taken out — because deleting it whole would remove behaviors
 * the scenario is not measuring (decision 0073).
 *
 * `docs/stages/` and `research/` are left out of the copy for the same reason
 * the published repository will not carry them (decision 0064): a stage report
 * quoting a rule is a home no installing machine has.
 */
export function pluginFor(scenario, arm, outDir, { root = ROOT } = {}) {
  const dir = join(outDir, `plugin-${scenario.id}-${arm}`);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ROOT = root;
  for (const entry of readdirSync(ROOT)) {
    if (entry === '.git' || entry === 'node_modules') continue;
    if (entry === 'bench') continue; // the fixtures are large and no kernel reads them
    if (entry === 'research') continue; // decision 0064: not published
    cpSync(join(ROOT, entry), join(dir, entry), { recursive: true });
  }
  rmSync(join(dir, 'docs/stages'), { recursive: true, force: true }); // decision 0064
  if (arm === 'without') {
    for (const home of scenario.lines) {
      const target = join(dir, home.file);
      const body = readFileSync(target, 'utf8')
        .split('\n')
        .flatMap((line) => {
          if (line.trim() !== home.line.trim()) return [line];
          return home.replaceWith ? [home.replaceWith] : [];
        });
      writeFileSync(target, body.join('\n'));
    }
  }
  return dir;
}

/** The workspace the prompt runs in. */
function workspaceFor(scenario, arm, outDir) {
  const dir = join(outDir, `work-${scenario.id}-${arm}`);
  rmSync(dir, { recursive: true, force: true });
  if (scenario.setup.kind === 'fixture') {
    const made = spawnSync(process.execPath, [join(ROOT, 'bench/scripts/fixture-copy.mjs'), scenario.setup.fixture, '--into', dir], {
      encoding: 'utf8',
    });
    if (made.status !== 0) throw new Error(`fixture-copy: ${made.stderr || made.stdout}`);
    if (scenario.setup.config) seedConfig(dir);
    return dir;
  }
  if (scenario.setup.kind === 'review-package') {
    // The review bench already builds this copy — patches applied, plan written,
    // rules and config in place. Rebuilding it here would be a second answer to
    // "what does the reviewer see".
    const pkg = groupPackages(join(ROOT, 'bench/review')).find((one) => one.id === scenario.setup.package);
    if (!pkg) throw new Error(`no review package ${scenario.setup.package}`);
    const made = preparePackage(pkg, dir);
    return made.copyDir ?? made.dir ?? dir;
  }
  throw new Error(`setup: unknown kind ${JSON.stringify(scenario.setup.kind)}`);
}

const gitStatus = (dir) => spawnSync('git', ['status', '--porcelain'], { cwd: dir, encoding: 'utf8' }).stdout ?? '';

/** Every path the run left under the workspace, relative and git-visible. */
function walk(dir, base = dir, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === '.git' || entry.name === 'node_modules') continue;
    const full = join(dir, entry.name);
    out.push(relative(base, full).split(sep).join('/'));
    if (entry.isDirectory()) walk(full, base, out);
  }
  return out;
}

function commandFor(scenario, { plugin, copy }) {
  const prompt = scenario.prompt.replaceAll('${copy}', copy).replaceAll('${plugin}', plugin);
  return {
    file: 'claude',
    args: [
      '-p',
      prompt,
      '--plugin-dir',
      plugin,
      '--strict-mcp-config',
      '--permission-mode',
      'bypassPermissions',
      '--output-format',
      'stream-json',
      '--verbose',
    ],
  };
}

function runArm(command, cwd, streamPath, configDir) {
  return new Promise((done) => {
    // The config directory is inherited unless --config-dir names one. A fresh
    // directory is not a clean profile but an unauthenticated one: the CLI reads
    // its credentials against the default directory and answers "Not logged in"
    // anywhere else (measured 2026-09-03, Stage 11a). What a run was exposed to
    // is recorded beside its numbers instead.
    const env = { ...process.env };
    if (configDir) env.CLAUDE_CONFIG_DIR = configDir;
    const child = spawn(command.file, command.args, { cwd, env });
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

function observe(scenario, arm, { events, status }, { plugin, copy }) {
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
  const tools = classifyToolUses(uses, { pluginRoot: plugin });
  const files = { '@git-status': gitStatus(copy).trim() };
  for (const path of scenario.collect ?? []) {
    try {
      files[path] = readFileSync(join(copy, path), 'utf8');
    } catch {
      // A file the arm did not write is an absent key, which `file` reads as false.
    }
  }
  return {
    id: scenario.id,
    arm,
    text,
    files,
    paths: walk(copy),
    metrics: {
      toolCalls: tools.total,
      evidenceCalls: tools.evidence,
      procedureCalls: tools.procedure,
      turns: result?.num_turns ?? null,
      cost: result?.total_cost_usd ?? null,
    },
    subtype: result?.subtype ?? null,
    exit: status,
  };
}

async function invoke(set, outDir, { dryRun, only, configDir }) {
  mkdirSync(outDir, { recursive: true });
  const chosen = only ? set.scenarios.filter((one) => only.includes(one.id)) : set.scenarios;
  const observations = [];
  for (const scenario of chosen) {
    for (const arm of ARMS) {
      const plugin = dryRun ? '<plugin copy>' : pluginFor(scenario, arm, outDir);
      const copy = dryRun ? '<workspace copy>' : workspaceFor(scenario, arm, outDir);
      const command = commandFor(scenario, { plugin, copy });
      if (dryRun) {
        process.stdout.write(`${scenario.id} ${arm}: ${command.file} ${command.args.map((a) => (a.includes(' ') ? JSON.stringify(a) : a)).join(' ')}\n`);
        continue;
      }
      process.stdout.write(`${scenario.id} ${arm} …\n`);
      const streamPath = join(outDir, `${scenario.id}-${arm}.jsonl`);
      const raw = await runArm(command, copy, streamPath, configDir);
      observations.push(observe(scenario, arm, raw, { plugin, copy }));
      rmSync(plugin, { recursive: true, force: true });
    }
  }
  if (dryRun) return 0;
  writeFileSync(join(outDir, 'observations.json'), `${JSON.stringify(observations, null, 2)}\n`);
  process.stdout.write(`wrote ${join(outDir, 'observations.json')}\n`);
  return 0;
}

// ----------------------------------------------------------------- the CLI

function buildReport(result) {
  if (result.threshold === null) return null;
  const metrics = [
    gate('scenarios showing a delta', {
      value: result.rate,
      threshold: result.threshold,
      passedCount: result.passedCount,
      total: result.total,
    }),
    measurement('scenarios', { value: result.total, unit: 'scenarios' }),
  ];
  return report('noop', metrics, { scenarios: result.scenarios });
}

function main(argv) {
  if (argv.includes('--help')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  let setPath = DEFAULT_SET;
  let observationsPath;
  let outDir;
  let only = null;
  let configDir;
  let asJson = false;
  let dryRun = false;
  let mode = 'check';
  let printSet = false;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--check-scenarios') continue;
    else if (arg === '--json') asJson = true;
    else if (arg === '--dry-run') dryRun = true;
    else if (arg === '--print-set') printSet = true;
    else if (arg === '--invoke') mode = 'invoke';
    else if (arg === '--scenarios' || arg === '--observations' || arg === '--out' || arg === '--only' || arg === '--config-dir') {
      const value = argv[i + 1];
      i += 1;
      if (!value) {
        process.stderr.write(`noop: ${arg} needs a value\n`);
        return 2;
      }
      if (arg === '--scenarios') setPath = value;
      else if (arg === '--out') outDir = value;
      else if (arg === '--config-dir') configDir = value;
      else if (arg === '--only') only = value.split(',').map((one) => one.trim());
      else {
        observationsPath = value;
        mode = 'score';
      }
    } else {
      process.stderr.write(`noop: unknown argument ${arg}\n${USAGE}\n`);
      return 2;
    }
  }

  let set;
  try {
    set = loadSet(setPath);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  if (printSet) {
    process.stdout.write(`${JSON.stringify(set)}\n`);
    return 0;
  }

  if (mode === 'invoke') {
    if (!outDir) {
      process.stderr.write(`noop: --invoke needs --out <dir>\n`);
      return 2;
    }
    return invoke(set, outDir, { dryRun, only, configDir });
  }

  if (mode === 'check') {
    const problems = checkScenarios(set);
    const homes = set.scenarios.flatMap((one) => one.lines ?? []);
    process.stdout.write(
      `${set.scenarios.length} scenarios · ${homes.length} homes across ` +
        `${new Set(homes.map((one) => one.file)).size} files · ` +
        `${homes.filter((one) => one.replaceWith).length} rewritten rather than deleted\n`,
    );
    if (problems.length === 0) {
      process.stdout.write('every home names a line its file carries exactly once\n');
      return 0;
    }
    for (const problem of problems) process.stdout.write(`${problem}\n`);
    return 1;
  }

  let observations;
  try {
    observations = JSON.parse(readFileSync(observationsPath, 'utf8'));
    if (!Array.isArray(observations)) throw new Error(`${observationsPath}: expected an array of observations`);
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
  const result = score(set, observations);
  for (const one of result.scenarios) {
    process.stdout.write(`${one.passed ? 'PASS' : 'FAIL'} ${one.id} — ${one.why}\n`);
  }
  process.stdout.write(
    `${result.passedCount}/${result.total} scenarios showed the delta (${(result.rate * 100).toFixed(1)}%)\n`,
  );
  if (result.threshold === null) {
    process.stdout.write('threshold: not set — this run is what sets it (decision 0019)\n');
    if (asJson) {
      process.stderr.write('noop: no threshold is set, so --json would report a gate nobody decided\n');
      return 2;
    }
    return 0;
  }
  process.stdout.write(`threshold ${(result.threshold * 100).toFixed(1)}% — ${result.passed ? 'PASS' : 'FAIL'}\n`);
  if (asJson) process.stdout.write(`${JSON.stringify(buildReport(result), null, 2)}\n`);
  return result.passed ? 0 : 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  const code = main(process.argv.slice(2));
  if (code instanceof Promise) {
    code.then((value) => {
      process.exitCode = value;
    });
  } else {
    process.exitCode = code;
  }
}
