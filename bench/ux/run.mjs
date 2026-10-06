#!/usr/bin/env node
// run.mjs — the UX audit: does every place a developer meets hodos resolve,
// and how many of them are broken?
//
// scenarios.json inventories each touchpoint — a journey crossed with an exit,
// a gate, a printed message or a proposal — and the findings scored against it
// with the rubric README.md cites. A finding's `fixedWhen` is a regex over one
// section of an engine file: it holds, and the finding is fixed; it does not,
// and the finding is open and its scenario broken. A finding no regex can
// settle carries a null `fixedWhen`, is judged, and is never counted, so the
// number moves when the engine changes and never when a label is edited.
//
// The checker reads engine text and nothing else: it imports no engine file,
// runs no script and calls no model. Engine files are read relative to the
// current directory, which is the repository root for every caller — npm test,
// the verify recipe and the campaign's measure.

import { readFileSync, readdirSync, realpathSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const DEFAULT_SET = join(HERE, 'scenarios.json');

const CHANNELS = ['screen', 'context', 'both', 'unverified'];
const SEVERITIES = ['blocker', 'major', 'minor'];
// A misspelled key is a problem rather than a default: a `sectoin` read as no
// section would widen the regex to the whole file, and a missing `fixedWhen`
// read as null would turn an open finding judged — either moves the count with
// no engine change.
const FINDING_KEYS = ['id', 'rubric', 'severity', 'owner', 'says', 'evidence', 'fixedWhen'];
const FIXED_WHEN_KEYS = ['file', 'section', 'present', 'absent'];

// A heading is a column-0 line outside a fence. An indented heading-shaped
// line is never one, and neither is a column-0 one inside a fence: engine
// references quote whole documents in fences, headings and all.
const HEADING = /^(#{1,6}) \S/;
const FENCE = /^\s*(```|~~~)/;

const USAGE = `Usage: node bench/ux/run.mjs [--set <file>] [--count [--node <owner>] | --report]

  (default)       every scenario resolves: each open or judged finding's
                  evidence line is in its file exactly once, each fixedWhen
                  reads, and every file a developer meets hodos through is a
                  scenario's where.file or exempt with a reason
  --count         print the number of broken scenarios and nothing else
  --node <owner>  with --count: only the scenarios an open finding of that
                  owner breaks
  --report        print the open and judged findings by owner, worst first,
                  then each journey's scenarios and how many are broken
  --set <file>    use this set instead of bench/ux/scenarios.json

Engine files are read relative to the current directory.

Exit codes: 0 — every scenario resolves; 1 — a problem, or a set that cannot
be read; 2 — a bad invocation. A problem under --count or --report goes to
stderr and stdout stays empty: a campaign's measure keeps its previous value,
and no ranking is printed over evidence lines that no longer stand.`;

export function loadSet(path = DEFAULT_SET) {
  let set;
  try {
    set = JSON.parse(readFileSync(path, 'utf8'));
  } catch (error) {
    throw new Error(`ux: cannot read ${path} (${error.code ?? error.message})`);
  }
  for (const key of ['scenarios', 'rubric', 'journeys', 'owners', 'exempt']) {
    if (!Array.isArray(set[key])) throw new Error(`ux: cannot read ${path} (no ${key} array)`);
  }
  return set;
}

/** A file's text by its path under `root`, read once; null when it is not there. */
function reader(root) {
  const cache = new Map();
  return (file) => {
    if (!cache.has(file)) {
      try {
        cache.set(file, readFileSync(join(root, file), 'utf8'));
      } catch {
        cache.set(file, null);
      }
    }
    return cache.get(file);
  };
}

/** The lines under the heading `section`, up to the next heading of its level or higher. */
function sectionOf(body, section) {
  const lines = body.split('\n');
  const headings = [];
  let fenced = false;
  lines.forEach((line, index) => {
    if (FENCE.test(line)) fenced = !fenced;
    else if (!fenced && HEADING.test(line)) headings.push({ index, level: HEADING.exec(line)[1].length, text: line.trimEnd() });
  });
  const hits = headings.filter((one) => one.text === section);
  if (hits.length === 0) return { problem: `section "${section}" is not a heading` };
  if (hits.length > 1) return { problem: `section "${section}" is a heading ${hits.length} times` };
  const [start] = hits;
  const end = headings.find((one) => one.index > start.index && one.level <= start.level);
  return { text: lines.slice(start.index + 1, end?.index).join('\n') };
}

/** Whether a fixedWhen holds, or the problem that keeps it from being read. */
function holds(when, read) {
  const unknown = Object.keys(when).find((key) => !FIXED_WHEN_KEYS.includes(key));
  if (unknown !== undefined) return { problem: `fixedWhen carries an unknown key "${unknown}"` };
  const kind = ['present', 'absent'].filter((key) => typeof when[key] === 'string');
  if (kind.length !== 1) return { problem: `fixedWhen carries ${kind.length ? 'both present and absent' : 'neither present nor absent'}` };
  let pattern;
  try {
    pattern = new RegExp(when[kind[0]], 'm');
  } catch (error) {
    return { problem: `the ${kind[0]} regex does not compile — ${error.message}` };
  }
  let text = read(when.file);
  if (text === null) return { problem: `fixedWhen file ${when.file} is not there` };
  if (when.section !== undefined) {
    const scoped = sectionOf(text, when.section);
    if (scoped.problem) return { problem: `fixedWhen ${scoped.problem} in ${when.file}` };
    text = scoped.text;
  }
  return { value: pattern.test(text) === (kind[0] === 'present') };
}

const findingsOf = (scenario) => (Array.isArray(scenario.findings) ? scenario.findings : []);

/**
 * Every finding's state — judged when fixedWhen is null, fixed when it holds,
 * open otherwise — and every scenario broken by an open one. A fixedWhen that
 * is missing or cannot be read is open here and a problem in checkSet. `read`
 * is the run's one reader, shared with checkSet so each file is read once.
 */
export function evaluate(set, { root, read = reader(root) }) {
  return {
    scenarios: set.scenarios.map((scenario) => {
      const findings = findingsOf(scenario).map((finding) => ({
        id: finding.id,
        owner: finding.owner,
        severity: finding.severity,
        state: finding.fixedWhen === null ? 'judged' : holds(finding.fixedWhen ?? {}, read).value ? 'fixed' : 'open',
      }));
      return { id: scenario.id, journey: scenario.journey, broken: findings.some((one) => one.state === 'open'), findings };
    }),
  };
}

/** Each value outside the list it must come from, as one problem. */
function outside(at, checks) {
  return Object.entries(checks)
    .filter(([, [value, list]]) => !list.includes(value))
    .map(([name, [value, list]]) => `${at}: ${name} ${JSON.stringify(value)} is not one of ${list.join(', ')}`);
}

/**
 * The files a developer can meet hodos through: every skills/**\/*.md,
 * agents/*.md, hooks/hooks.json and every scripts/*.mjs that is not a test.
 * Walked with readdirSync, because fs.globSync is not in Node 20, which the CI
 * runners run; joined with `/`, the way the set names them on every platform.
 */
function candidates(root) {
  const walk = (dir, keep, deep) => {
    let entries;
    try {
      entries = readdirSync(join(root, dir), { withFileTypes: true });
    } catch {
      return [];
    }
    return entries.flatMap((entry) => {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory()) return deep ? walk(path, keep, deep) : [];
      return keep(entry.name) ? [path] : [];
    });
  };
  return [
    ...walk('skills', (name) => name.endsWith('.md'), true),
    ...walk('agents', (name) => name.endsWith('.md'), false),
    ...walk('hooks', (name) => name === 'hooks.json', false),
    ...walk('scripts', (name) => name.endsWith('.mjs') && !name.endsWith('.test.mjs'), false),
  ].sort();
}

/** Every reason the set does not resolve against `root`, one per entry: `<scenario>[/<finding>]: <what>`. */
export function checkSet(set, { root, read = reader(root), evaluation = evaluate(set, { root, read }) }) {
  const problems = [];
  const rubric = set.rubric.map((one) => one.id);
  const scenarioIds = new Set();
  const findingIds = new Set();
  set.scenarios.forEach((scenario, i) => {
    const at = scenario.id;
    if (scenarioIds.has(at)) problems.push(`${at}: the id is used twice`);
    scenarioIds.add(at);
    problems.push(...outside(at, { journey: [scenario.journey, set.journeys], channel: [scenario.channel, CHANNELS] }));
    const where = typeof scenario.where?.file === 'string' ? read(scenario.where.file) : undefined;
    if (where === undefined) problems.push(`${at}: where names no file`);
    else if (where === null) problems.push(`${at}: where file ${scenario.where.file} is not there`);
    else if (scenario.where.section !== undefined) {
      const scoped = sectionOf(where, scenario.where.section);
      if (scoped.problem) problems.push(`${at}: where ${scoped.problem} in ${scenario.where.file}`);
    }
    if (!Array.isArray(scenario.findings)) problems.push(`${at}: findings is not a list`);
    findingsOf(scenario).forEach((finding, j) => {
      const fat = `${at}/${finding.id}`;
      if (findingIds.has(finding.id)) problems.push(`${fat}: the finding id is used twice`);
      findingIds.add(finding.id);
      const unknown = Object.keys(finding).find((key) => !FINDING_KEYS.includes(key));
      if (unknown !== undefined) problems.push(`${fat}: unknown key "${unknown}"`);
      problems.push(
        ...outside(fat, {
          rubric: [finding.rubric, rubric],
          severity: [finding.severity, SEVERITIES],
          owner: [finding.owner, set.owners],
        }),
      );
      if (finding.fixedWhen === undefined) problems.push(`${fat}: fixedWhen is missing — null for a judged finding, or a condition`);
      else if (finding.fixedWhen !== null) {
        const { problem } = holds(finding.fixedWhen, read);
        if (problem) problems.push(`${fat}: ${problem}`);
      }
      // A fixed finding's evidence is history: the fix may have rewritten the
      // line, and re-pointing it would make every node maintain the audit.
      if (evaluation.scenarios[i].findings[j].state === 'fixed') return;
      if (typeof finding.evidence?.file !== 'string' || typeof finding.evidence.line !== 'string') {
        problems.push(`${fat}: evidence needs a file and a line`);
        return;
      }
      const body = read(finding.evidence.file);
      if (body === null) {
        problems.push(`${fat}: evidence file ${finding.evidence.file} is not there`);
        return;
      }
      const times = body.split('\n').filter((line) => line.trim() === finding.evidence.line.trim()).length;
      if (times === 0) problems.push(`${fat}: the evidence line is not in ${finding.evidence.file}`);
      else if (times > 1) problems.push(`${fat}: ${finding.evidence.file} carries the evidence line ${times} times`);
    });
  });
  for (const one of set.exempt) {
    if (!one.why?.trim()) problems.push(`exempt ${one.file}: the why is empty`);
  }
  const covered = new Set([...set.scenarios.map((one) => one.where?.file), ...set.exempt.map((one) => one.file)]);
  for (const file of candidates(root)) {
    if (!covered.has(file)) problems.push(`${file}: no scenario's where.file, and not in exempt[]`);
  }
  return problems;
}

/** The scenarios an open finding breaks — of `node`, when one is named. */
export function countBroken(evaluation, { node }) {
  return evaluation.scenarios.filter((scenario) =>
    scenario.findings.some((one) => one.state === 'open' && (node === undefined || one.owner === node)),
  ).length;
}

/**
 * The open and judged findings by owner, in the set's owner order and worst
 * first; then each journey's scenarios and broken count; then every state's
 * count. A fixed finding is counted and not listed: its evidence line is
 * history nothing checks, and a line printed from it may no longer stand.
 */
export function formatReport(set, evaluation) {
  const rows = set.scenarios.flatMap((scenario, i) =>
    scenario.findings.map((finding, j) => ({ scenario, finding, state: evaluation.scenarios[i].findings[j].state })),
  );
  const lines = [];
  for (const owner of set.owners) {
    const mine = rows
      .filter((row) => row.finding.owner === owner && row.state !== 'fixed')
      .sort((a, b) => SEVERITIES.indexOf(a.finding.severity) - SEVERITIES.indexOf(b.finding.severity));
    if (mine.length === 0) continue;
    lines.push(owner);
    for (const { scenario, finding, state } of mine) {
      lines.push(
        `  ${finding.severity.padEnd(7)} ${state.padEnd(6)} ${scenario.id}/${finding.id} · ${finding.rubric} · ${finding.evidence.file} — ${finding.says}`,
      );
    }
  }
  lines.push('');
  for (const journey of set.journeys) {
    const mine = evaluation.scenarios.filter((one) => one.journey === journey);
    lines.push(`${journey}: ${mine.length} scenarios, ${mine.filter((one) => one.broken).length} broken`);
  }
  const counted = (state) => rows.filter((row) => row.state === state).length;
  lines.push(`open ${counted('open')} · fixed ${counted('fixed')} · judged ${counted('judged')}`);
  return `${lines.join('\n')}\n`;
}

function summary(evaluation) {
  const findings = evaluation.scenarios.flatMap((one) => one.findings);
  const judged = findings.filter((one) => one.state === 'judged').length;
  const broken = evaluation.scenarios.filter((one) => one.broken).length;
  return `${evaluation.scenarios.length} scenarios · ${findings.length} findings (${judged} judged) · ${broken} broken`;
}

function bad(why) {
  process.stderr.write(`ux: ${why}\n${USAGE}\n`);
  return 2;
}

function main(argv) {
  let setPath = DEFAULT_SET;
  let count = false;
  let report = false;
  let node;
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--count') count = true;
    else if (argv[i] === '--report') report = true;
    else if (argv[i] === '--set' && argv[i + 1] !== undefined) {
      setPath = argv[i + 1];
      i += 1;
    } else if (argv[i] === '--node' && argv[i + 1] !== undefined) {
      node = argv[i + 1];
      i += 1;
    } else return bad(`unknown argument ${argv[i]}`);
  }
  if (node !== undefined && !count) return bad('--node needs --count');
  if (count && report) return bad('--count and --report are two modes; name one');
  let set;
  try {
    set = loadSet(setPath);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    return 1;
  }
  if (node !== undefined && !set.owners.includes(node)) {
    process.stderr.write(`ux: no owner ${node} — known: ${set.owners.join(', ')}\n`);
    return 2;
  }
  const root = process.cwd();
  const read = reader(root);
  const evaluation = evaluate(set, { root, read });
  const problems = checkSet(set, { root, read, evaluation });
  if (count || report) {
    if (problems.length > 0) {
      for (const problem of problems) process.stderr.write(`${problem}\n`);
      return 1;
    }
    process.stdout.write(count ? `${countBroken(evaluation, { node })}\n` : formatReport(set, evaluation));
    return 0;
  }
  process.stdout.write(`${summary(evaluation)}\n`);
  if (problems.length === 0) {
    process.stdout.write('every scenario resolves\n');
    return 0;
  }
  for (const problem of problems) process.stdout.write(`${problem}\n`);
  return 1;
}

if (process.argv[1] && realpathSync(process.argv[1]) === realpathSync(fileURLToPath(import.meta.url))) {
  process.exitCode = main(process.argv.slice(2));
}
