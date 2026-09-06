#!/usr/bin/env node
// seed.mjs — turn a fixture copy into a task directory at phase `approved`.
//
// Every acceptance criterion of the `run` kernel begins "on the approved
// fixture plan", and S1 cannot produce the plans the criteria need: an
// impossible acceptance check and a design field with a hole in it are things
// /hodos:task exists to prevent (decision 0033). So the plans are committed
// under plans/ and this script installs one.
//
// It writes plan.md directly and everything else through ledger.mjs: the
// directory, ledger.md and state.json are that script's to write (DESIGN.md
// §5.1), and a seeder that hand-built a state.json would be testing itself.

import { execFileSync } from 'node:child_process';
import { cpSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = resolve(HERE, '../..');
const PLANS = join(HERE, 'plans');
const DEFECTS = join(HERE, 'defects');
const COPIER = join(REPO, 'bench/scripts/fixture-copy.mjs');
const LEDGER = join(REPO, 'scripts/ledger.mjs');

const PATHS = ['quick', 'standard', 'deep'];
const RULE_ARMS = ['one', 'two'];

// What a run leaves in the ledger that no artifact carries: one fork the plan
// did not settle, and one local choice. The finish report names both.
const SEEDED_EVENTS = [
  'Gap: the plan did not say what the summary shows while the list query is pending — the line is absent until data arrives, confirmed in chat',
  'Ruling: summarizeOrders lives in summary.ts beside the api types — one consumer today and the plan names no module for it — cost if wrong: one file move',
];
const TYPES = ['feature', 'bug', 'refactor', 'question', 'spike', 'upgrade'];

const USAGE = `Usage: node bench/run/seed.mjs <plan> [options]

Copies a fixture, installs one of plans/*.md as an approved task, and prints
the copy path, the slug and the branch as JSON.

  --fixture <name>   which bench fixture to copy (default: webapp)
  --copy <path>      seed into this existing copy instead of making one
  --into <dir>       passed to fixture-copy.mjs
  --gap              drop the lines the plan marked <!-- gap --> — the plan
                     hole the run kernel has to notice and ask about
  --autonomy <v>     rewrite config.autonomy in the copy: ask | rulings
  --at <phase>       approved (default), review, verify or finish. At review the
                     seeder commits each task's implementation from
                     plans/<plan>.impl/T<n>/ and runs ledger.mjs for every
                     event the run would have written, so the copy arrives
                     at phase review the way a run leaves it (decision 0036).
                     At verify it adds the accepted review a clean
                     implementation earns (decision 0043). At finish it
                     installs plans/<plan>.finish/{review-<arm>,verify}.md and
                     its evidence into the task directory and writes the gap,
                     the ruling and the passing verify a run would have left
                     (decision 0048)
  --rule-arm <a>     one | two (default two) — which review artifact --at
                     finish installs. The finding of the "two" arm names a
                     pattern the code carries twice, which is what earns a rule
                     proposal; the "one" arm's is in one place, which does not
  --defect <id>      apply defects/<id>.patch inside the last task's commit;
                     --at review or --at verify
  --help             print this and exit 0

Exit codes: 0 — the JSON is on stdout; 1 — the plan or the copy is unusable,
with the reason on stderr; 2 — bad invocation.`;

/** The slug a plan names itself by. It is also the plan's file name. */
export function slugOf(text) {
  const m = /^# Plan — (\S+)\s*$/m.exec(text);
  if (!m) throw new Error('the plan has no `# Plan — <slug>` title line');
  return m[1];
}

/** The two values `ledger.mjs init` takes, read from the plan's header line. */
export function parseHeader(text) {
  const m = /^Path:\s*(\S+)\s*·\s*Type:\s*(\S+)\s*·/m.exec(text);
  if (!m) throw new Error('the plan has no `Path: … · Type: …` header line');
  const [, path, type] = m;
  if (!PATHS.includes(path)) throw new Error(`Path: ${path} is not one of ${PATHS.join(', ')}`);
  if (!TYPES.includes(type)) throw new Error(`Type: ${type} is not one of ${TYPES.join(', ')}`);
  return { path, type };
}

/** The placeholders a plan carries until its branch and its base commit exist. */
export function fillHeader(text, { branch, base }) {
  return text.replace(/\{branch\}/g, branch).replace(/\{base\}/g, base);
}

/**
 * The gap variant: the plan minus the lines it marked. One marker per plan is
 * enough — the criterion is that the kernel notices the hole, not how many.
 */
export function dropGapLines(text) {
  return text
    .split('\n')
    .filter((line) => !/<!--\s*gap\s*-->\s*$/.test(line))
    .join('\n');
}

/**
 * The marker itself never reaches the copy. A plan that ships its harness
 * annotations tells the run it is a bench fixture, and names the two lines the
 * harness cares about — which is what run 1 of Stage 5 read off the page.
 */
export function stripGapMarkers(text) {
  return text.replace(/[ \t]*<!--\s*gap\s*-->[ \t]*$/gm, '');
}

/**
 * The `Tests:` line of each task that declares an exemption (decision 0022).
 * A task with no line is test-first, which is the default and needs no entry.
 * @returns {Record<number, string>} task number → the exemption as the plan wrote it
 */
export function exemptions(text) {
  const out = {};
  let current = null;
  for (const line of text.split('\n')) {
    const task = /^### T(\d+)\./.exec(line);
    if (task) {
      current = Number(task[1]);
      continue;
    }
    const tests = /^Tests:\s*(.+?)\s*$/.exec(line);
    if (current !== null && tests && tests[1] !== 'test-first') out[current] = tests[1];
  }
  return out;
}

/** How many tasks `Plan: approved --tasks` reports. */
export function countTasks(text) {
  const count = (text.match(/^### T\d+\./gm) ?? []).length;
  if (count === 0) throw new Error('the plan has no task headings (`### T<n>. …`)');
  return count;
}

// stderr is captured rather than inherited: `git checkout -b` writes its
// "Switched to a new branch" line there, and this script's stdout is JSON a
// caller parses. A failure still carries its reason — execFileSync throws with
// stderr attached.
// The seeder is not a session working the task, so it hands `ledger.mjs` no
// session id: it writes `active` and no `sessions/<id>` pointer (decision
// 0047). Otherwise the seeding session is recorded as one of the task's, and
// the usage `Finish` sums includes a session that never touched the work.
const HARNESS_ENV = { ...process.env };
delete HARNESS_ENV.CLAUDE_CODE_SESSION_ID;

const run = (bin, cwd, args) => {
  try {
    return execFileSync(bin, args, { cwd, encoding: 'utf8', env: HARNESS_ENV, stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  } catch (error) {
    throw new Error(`${bin} ${args.join(' ')} failed: ${(error.stderr ?? error.message).toString().trim()}`);
  }
};
const git = (cwd, ...args) => run('git', cwd, args);
const node = (cwd, ...args) => run('node', cwd, args);

/**
 * Install `plan` into a fixture copy and leave it at phase `approved`.
 * @returns {{ copy: string, slug: string, branch: string, base: string, tasks: number }}
 */
export function seed({ plan, fixture = 'webapp', copy, into, gap = false, autonomy, at = 'approved', defect, ruleArm = 'two' }) {
  const file = join(PLANS, `${plan}.md`);
  if (!existsSync(file)) throw new Error(`no such plan: ${file}`);
  let text = readFileSync(file, 'utf8');
  if (gap) text = dropGapLines(text);
  text = stripGapMarkers(text);

  const { path, type } = parseHeader(text);
  const tasks = countTasks(text);
  const wanted = slugOf(text);

  const dir = copy ?? node(REPO, COPIER, fixture, ...(into ? ['--into', into] : []));
  const configFile = join(dir, '.claude/hodos/config.json');
  if (!existsSync(configFile)) throw new Error(`the copy has no hodos config: ${configFile}`);
  const config = JSON.parse(readFileSync(configFile, 'utf8'));

  if (autonomy) {
    config.autonomy = autonomy;
    writeFileSync(configFile, `${JSON.stringify(config, null, 2)}\n`);
    git(dir, 'commit', '-am', `chore: set autonomy to ${autonomy}`);
  }

  // `init` normalizes and de-duplicates, so the slug it prints is the one the
  // task directory actually has.
  const slug = node(dir, LEDGER, 'init', wanted, '--path', path, '--type', type);
  const branch = (config.conventions?.branch ?? 'feature/{slug}').replace('{slug}', slug);
  git(dir, 'checkout', '-b', branch);
  const base = git(dir, 'rev-parse', '--short', 'HEAD');

  writeFileSync(join(dir, '.claude/hodos/tasks', slug, 'plan.md'), fillHeader(text, { branch, base }));
  node(dir, LEDGER, 'add', 'Plan: approved', '--tasks', String(tasks), '--branch', branch);
  if (at === 'approved') return { copy: dir, slug, branch, base, tasks, phase: 'approved' };

  // Everything below is what a run would have written, written by the same
  // script (decision 0036): the task commits, and every ledger line derived
  // from them. Nothing here hand-builds state.json.
  // One guard, per task: the top-level directory's absence is the same failure
  // as T1's, reported by the same line.
  const impl = join(PLANS, `${plan}.impl`);
  const exempt = exemptions(text);
  const patch = defect ? join(DEFECTS, `${defect}.patch`) : null;
  if (patch && !existsSync(patch)) throw new Error(`no such defect: ${defect} (looked in ${DEFECTS})`);

  let head = base;
  for (let n = 1; n <= tasks; n += 1) {
    const from = join(impl, `T${n}`);
    if (!existsSync(from)) throw new Error(`--at review needs an implementation for T${n} at ${from}`);
    node(dir, LEDGER, 'add', `Task ${n}: started`, '--slug', slug);
    // A task the plan exempted has no red run to record; its `done` line
    // asserts the exemption instead, which is the record the reviewer compares
    // against the plan (decision 0022).
    const reason = exempt[n]?.split(/[\s—]/, 1)[0];
    if (!reason) node(dir, LEDGER, 'add', `Task ${n}: test red`, '--slug', slug);
    cpSync(from, dir, { recursive: true });
    if (patch && n === tasks) git(dir, 'apply', patch);
    git(dir, 'add', '-A');
    git(dir, 'commit', '-qm', `feat: ${slug} T${n}`);
    head = git(dir, 'rev-parse', '--short', 'HEAD');
    node(dir, LEDGER, 'add', `Task ${n}: done`, '--sha', head, '--slug', slug, ...(reason ? ['--tests', reason] : []));
  }
  // The pass cut nothing and made no commit, and records that against the head
  // it examined (decision 0034).
  node(dir, LEDGER, 'add', 'Simplify: done', '--sha', head, '--net', '0', '--slug', slug);
  if (at === 'review') return { copy: dir, slug, branch, base, head, tasks, phase: 'review' };

  // --at verify: the review a clean implementation of a committed plan earns
  // (decision 0043). A stage that needs findings in the ledger seeds them with
  // --defect and runs the loop.
  if (at === 'verify') {
    node(dir, LEDGER, 'add', 'Review 1: ACCEPT 0/0/0', '--slug', slug);
    return { copy: dir, slug, branch, base, head, tasks, phase: 'verify' };
  }

  // --at finish: the two artifacts the finish phase folds, committed beside the
  // plan (decision 0048), plus the gap and the ruling a real run leaves behind.
  // The ledger counts are read out of the artifacts rather than written twice.
  if (!RULE_ARMS.includes(ruleArm)) throw new Error(`--rule-arm takes ${RULE_ARMS.join(' or ')}, not ${ruleArm}`);
  const artifacts = join(PLANS, `${plan}.finish`);
  const reviewFile = join(artifacts, `review-${ruleArm}.md`);
  if (!existsSync(reviewFile)) throw new Error(`--at finish needs ${reviewFile}`);
  const review = readFileSync(reviewFile, 'utf8');
  const verify = readFileSync(join(artifacts, 'verify.md'), 'utf8');

  const taskDir = join(dir, '.claude/hodos/tasks', slug);
  writeFileSync(join(taskDir, 'review.md'), review);
  writeFileSync(join(taskDir, 'verify.md'), verify);
  cpSync(join(artifacts, 'evidence'), join(taskDir, 'evidence'), { recursive: true });

  const counts = /blockers (\d+) · majors (\d+) · minors (\d+)/.exec(review);
  if (!counts) throw new Error(`${reviewFile} has no counts line`);
  node(dir, LEDGER, 'add', `Review 1: ACCEPT ${counts[1]}/${counts[2]}/${counts[3]}`, '--slug', slug);
  for (const line of SEEDED_EVENTS) node(dir, LEDGER, 'add', line, '--slug', slug);

  const claims = /claims (\d+) · pass \d+ · fail \d+ · skip (\d+)/.exec(verify);
  if (!claims) throw new Error(`${join(artifacts, 'verify.md')} has no counts line`);
  node(dir, LEDGER, 'add', `Verify 1: PASS ${claims[1]} claims, ${claims[2]} skipped`, '--slug', slug);
  return { copy: dir, slug, branch, base, head, tasks, phase: 'finish', ruleArm };
}

function parseArgv(argv) {
  const opts = { fixture: 'webapp', gap: false, at: 'approved' };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help') return { help: true };
    else if (arg === '--gap') opts.gap = true;
    else if (arg === '--fixture') opts.fixture = argv[++i];
    else if (arg === '--copy') opts.copy = argv[++i];
    else if (arg === '--into') opts.into = argv[++i];
    else if (arg === '--autonomy') opts.autonomy = argv[++i];
    else if (arg === '--at') opts.at = argv[++i];
    else if (arg === '--defect') opts.defect = argv[++i];
    else if (arg === '--rule-arm') opts.ruleArm = argv[++i];
    else if (arg.startsWith('--')) return { bad: `unknown option: ${arg}` };
    else if (opts.plan) return { bad: `two plans given: ${opts.plan} and ${arg}` };
    else opts.plan = arg;
  }
  if (!opts.plan) return { bad: 'no plan given' };
  if (opts.autonomy && !['ask', 'rulings'].includes(opts.autonomy)) {
    return { bad: `--autonomy takes ask or rulings, not ${opts.autonomy}` };
  }
  if (!['approved', 'review', 'verify', 'finish'].includes(opts.at)) {
    return { bad: `--at takes approved, review, verify or finish, not ${opts.at}` };
  }
  if (opts.ruleArm && opts.at !== 'finish') return { bad: '--rule-arm needs --at finish' };
  if (opts.ruleArm && !RULE_ARMS.includes(opts.ruleArm)) {
    return { bad: `--rule-arm takes ${RULE_ARMS.join(' or ')}, not ${opts.ruleArm}` };
  }
  if (opts.defect && opts.at === 'approved') return { bad: '--defect needs --at review, verify or finish' };
  return { opts };
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const { help, bad, opts } = parseArgv(process.argv.slice(2));
  if (help) {
    process.stdout.write(`${USAGE}\n`);
  } else if (bad) {
    process.stderr.write(`${bad}\n\n${USAGE}\n`);
    process.exitCode = 2;
  } else {
    try {
      process.stdout.write(`${JSON.stringify(seed(opts), null, 2)}\n`);
    } catch (error) {
      process.stderr.write(`${error.message}\n`);
      process.exitCode = 1;
    }
  }
}
