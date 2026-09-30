#!/usr/bin/env node
// env.mjs — the verify environment (FORMATS.md §2, decision 0074).
//
// `commands.dev` is one process, and the thing a project actually verifies is
// often four: machine prerequisites, shared infrastructure, this repository's
// services, the dev server. This script raises what a profile declares and
// proves each layer is up before the next one starts.
//
// It never asks anything and never dispatches anything. A layer whose access
// has not been granted is reported as blocked and left alone: the question is
// the kernel's to ask (skills/run/references/verify-loop.md), because a script
// that prompts is a script that hangs in a hook.
//
// Every path a layer hands to a command resolves against the **git root**
// (decision 0075); `.claude/hodos/env/` — what this machine raised — is state
// and resolves against the project root, like every other file under it.

import { spawn, spawnSync } from 'node:child_process';
import { closeSync, linkSync, mkdirSync, openSync, readFileSync, readdirSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import { createConnection } from 'node:net';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { findConfig, gitRoot, sessionOf } from './config.mjs';

const USAGE = `Usage: node scripts/env.mjs <command> [dir]

The verify environment a profile declares (FORMATS.md §2, decision 0074).

  probe [dir]    run every check of the active profile's layers; report each
                 layer as up, down or unprobed. Raises nothing.
  up [dir]       raise the layers that are down, in the profile's order, each
                 waited out to its own timeout. The base URL it prints is the
                 one a layer that came up declares, and null when none did.
  down [dir]     take this session off what hodos raised, and stop a layer
                 only when no other session is still on it (decision 0169).
  down --all     stop what hodos raised, whoever is still on it.
  status [dir]   what the profile declares, what is up, and what this machine
                 raised.
  --help         print this and exit 0.

Several sessions share one layer: an up that finds a live raise attaches to it
and starts nothing, and the session ids on a layer are the files under
.claude/hodos/env/<layer>.users/. A caller with no session id is on no layer.

Output is JSON on stdout, always: the caller is a kernel reading a result, not
a person reading a table.

Exit codes: 0 — every layer up, or no environment declared, or no config;
1 — a layer is down; 2 — bad invocation.`;

/** Seconds a check waits before it counts as red, when it names none. */
const CHECK_TIMEOUT = 5;
/** Seconds a layer has to go green, when it names none. */
const LAYER_TIMEOUT = 60;
/** How often a layer being raised is re-probed. */
const POLL_MS = 200;
/** Where this machine's record of what it raised lives (FORMATS.md §1). */
export const envDir = (projectRoot) => join(projectRoot, '.claude', 'hodos', 'env');

/**
 * The active profile's layers, in the order the profile names them.
 * A name that resolves to no layer is dropped here and reported by
 * `config.mjs check`, which is where a config's own faults are named.
 */
export function activeLayers(config) {
  const verify = config?.verify;
  const name = verify?.profile;
  if (!name) return { profile: null, layers: [] };
  const profile = verify.profiles?.[name];
  const names = Array.isArray(profile?.layers) ? profile.layers : [];
  return {
    profile: name,
    layers: names.filter((layer) => verify.layers?.[layer]).map((layer) => ({ name: layer, spec: verify.layers[layer] })),
  };
}

const lastLines = (text, count = 5) =>
  text
    .split('\n')
    .filter((line) => line.trim() !== '')
    .slice(-count)
    .join('\n');

/** A port that opens. */
function tcp(target, seconds) {
  const [host, port] = String(target ?? '').split(':');
  return new Promise((resolve) => {
    const socket = createConnection({ host: host || '127.0.0.1', port: Number(port) });
    const settle = (ok, detail) => {
      socket.destroy();
      resolve({ ok, detail });
    };
    socket.setTimeout(seconds * 1000);
    socket.once('connect', () => settle(true, `${target} accepts a connection`));
    socket.once('timeout', () => settle(false, `${target} did not answer in ${seconds}s`));
    socket.once('error', (error) => settle(false, `${target}: ${error.code ?? error.message}`));
  });
}

/** A URL that answers with the status it should. */
async function http(target, expect, seconds) {
  const wanted = expect ?? 200;
  try {
    const response = await fetch(target, { signal: AbortSignal.timeout(seconds * 1000) });
    return response.status === wanted
      ? { ok: true, detail: `${target} → ${response.status}` }
      : { ok: false, detail: `${target} → ${response.status}, expected ${wanted}` };
  } catch (error) {
    return { ok: false, detail: `${target}: ${error.cause?.code ?? error.name ?? error.message}` };
  }
}

/** A command that exits 0. */
function cmd(run, cwd, seconds) {
  const result = spawnSync(run, { cwd, shell: true, encoding: 'utf8', timeout: seconds * 1000 });
  const output = lastLines(`${result.stdout ?? ''}${result.stderr ?? ''}`);
  if (result.error) return { ok: false, detail: `${run}: ${result.error.code ?? result.error.message}` };
  return {
    ok: result.status === 0,
    detail: output === '' ? `${run} exited ${result.status}` : output,
  };
}

/** One check, run now. `ps` listing a container is not a check; answering is. */
export async function runCheck(check, cwd) {
  const seconds = check.timeout ?? CHECK_TIMEOUT;
  const base = { kind: check.kind, target: check.target ?? check.run ?? null };
  if (check.kind === 'tcp') return { ...base, ...(await tcp(check.target, seconds)) };
  if (check.kind === 'http') return { ...base, ...(await http(check.target, check.expect, seconds)) };
  if (check.kind === 'cmd') return { ...base, ...cmd(check.run, cwd, seconds) };
  return { ...base, ok: false, detail: `unknown check kind: ${check.kind}` };
}

/** Where a layer's commands run: its `cwd` against the git root, or the root. */
export const layerCwd = (spec, root) => (spec.cwd ? join(root, spec.cwd) : root);

/**
 * One layer, probed now. A layer that declares no check is `unprobed` and
 * never `up`: the dev server is proven by its own `ready` line while it is
 * being raised, and a layer proven by nothing is the claim decision 0074's
 * fourth gap refuses.
 */
export async function probeLayer({ name, spec }, root, raised) {
  const cwd = layerCwd(spec, root);
  const checks = [];
  for (const check of spec.check ?? []) checks.push(await runCheck(check, cwd));
  const state = checks.length === 0 ? 'unprobed' : checks.every((check) => check.ok) ? 'up' : 'down';
  return {
    name,
    cwd,
    state,
    raisedByHodos: raised.has(name),
    checks,
    access: spec.access ?? null,
    url: spec.url ?? null,
  };
}

/** The layers this machine raised, by name (FORMATS.md §1). */
export function raisedLayers(projectRoot) {
  const dir = envDir(projectRoot);
  const records = new Map();
  let names = [];
  try {
    names = readdirSync(dir).filter((file) => file.endsWith('.json'));
  } catch {
    return records;
  }
  for (const file of names) {
    try {
      records.set(file.slice(0, -5), JSON.parse(readFileSync(join(dir, file), 'utf8')));
    } catch {
      // A record that cannot be read names a layer nothing can stop by it;
      // `down` reports it rather than throwing over a truncated file.
      records.set(file.slice(0, -5), { unreadable: true });
    }
  }
  return records;
}

/**
 * The base URL a dispatch carries: the one a layer that **came up** declares.
 * A port nobody is listening on turns a skip with a reason into a browser
 * claim that fails for the wrong reason, so the state decides, not the spec —
 * and `probe` is read where `up` already returned none.
 */
const baseUrl = (probed) => probed.find((layer) => layer.url && (layer.state === 'up' || layer.state === 'raised'))?.url ?? null;

/**
 * What every command reads before it does anything: the config, the profile's
 * layers, the git root their paths resolve against, and what this machine has
 * already raised.
 */
function preamble(cwd) {
  const found = findConfig(cwd);
  if (found.notFound) return { stop: { result: { notFound: true }, code: 0 } };
  const { profile, layers } = activeLayers(found.config);
  if (!profile) return { stop: { result: { declared: false, message: 'no environment declared' }, code: 0 } };
  return {
    found,
    profile,
    layers,
    root: gitRoot(found.projectRoot) ?? found.projectRoot,
    raised: raisedLayers(found.projectRoot),
  };
}

/** The report `probe` and `status` print. */
export async function report(cwd) {
  const { stop, found, profile, layers, root, raised } = preamble(cwd);
  if (stop) return stop;
  const probed = [];
  for (const layer of layers) probed.push(await probeLayer(layer, root, raised));
  return {
    result: {
      profile,
      gitRoot: root,
      projectRoot: found.projectRoot,
      layers: probed,
      url: baseUrl(probed),
    },
    code: probed.some((layer) => layer.state === 'down') ? 1 : 0,
  };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const logOf = (projectRoot, name) => join(envDir(projectRoot), `${name}.log`);

const readLog = (path) => {
  try {
    return readFileSync(path, 'utf8');
  } catch {
    return '';
  }
};

/**
 * Start a layer's `up` **detached**, with its output going to a file rather
 * than to a pipe this script owns. A foreground dev server started inside a
 * session dies with it (`verify-loop.md §3`), and a pipe closed by the parent
 * kills the child that writes to it — so the layer gets a log on disk and its
 * own process group, which is also what `down` stops it by.
 */
function spawnLayer(spec, cwd, logPath) {
  // Truncating: the log survives `down` as the diagnosis a preparer reads, and
  // a `ready` line an earlier raise left in it would prove this one. What the
  // file holds is one raise — the one that is running now.
  const fd = openSync(logPath, 'w');
  try {
    const child = spawn(spec.up, { cwd, shell: true, detached: true, stdio: ['ignore', fd, fd] });
    child.unref();
    return child.pid;
  } finally {
    closeSync(fd);
  }
}

/**
 * Wait for a layer to prove itself up, until its own timeout. Checks are the
 * proof where a layer declares them; the one foreground layer is proven by the
 * `ready` line it prints, which is what `commands.dev` already meant.
 */
async function waitGreen(spec, cwd, logPath) {
  const deadline = Date.now() + (spec.timeout ?? LAYER_TIMEOUT) * 1000;
  if (!spec.check?.length && !spec.ready) return { ok: true, checks: [] };
  let last = [];
  for (;;) {
    if (spec.check?.length) {
      const checks = [];
      for (const check of spec.check) checks.push(await runCheck(check, cwd));
      if (checks.every((check) => check.ok)) return { ok: true, checks };
      last = checks;
    } else {
      if (readLog(logPath).includes(spec.ready)) {
        return { ok: true, checks: [{ kind: 'ready', target: spec.ready, ok: true, detail: 'the ready line was printed' }] };
      }
      last = [{ kind: 'ready', target: spec.ready, ok: false, detail: `"${spec.ready}" has not been printed` }];
    }
    if (Date.now() >= deadline) return { ok: false, checks: last };
    await sleep(POLL_MS);
  }
}

/**
 * Raise the profile's layers, in its order, each one waited out before the
 * next starts. A layer already up is left alone — the common case is a
 * developer's own morning, every probe green and nothing raised at all.
 */
export async function up(cwd, { session = sessionOf() } = {}) {
  const { stop, found, profile, layers, root, raised } = preamble(cwd);
  if (stop) return stop;
  const projectRoot = found.projectRoot;
  const out = [];
  let failed = null;
  let blocked = null;
  for (const layer of layers) {
    if (failed || blocked) {
      out.push({
        name: layer.name,
        cwd: layerCwd(layer.spec, root),
        state: 'skipped',
        raisedByHodos: false,
        checks: [],
        url: layer.spec.url ?? null,
      });
      continue;
    }
    // Registered before anything is read, so a `down` that counts the users
    // from here on counts this session too (decision 0169).
    if (session) register(projectRoot, layer.name, session);
    const probed = await probeLayer(layer, root, raised);
    const known = raised.get(layer.name);
    if (probed.state === 'up') {
      out.push(known && !known.unreadable ? { ...probed, detail: raisedBy(known) } : probed);
      continue;
    }
    // A live record is this machine's own raise, still running: a layer proven
    // by its `ready` line probes `unprobed` forever, so without this the second
    // `up` — which §3 runs after a grant, and on every entry — would start a
    // second process and overwrite the record that could have stopped the
    // first. What the record cannot say is that the layer works: a failed raise
    // keeps its process until `down`. So the proof is read again, now, from
    // what the layer declares it by — the checks, or the `ready` line in a log
    // this raise started empty — and never from a verdict stored earlier.
    const record = raised.get(layer.name);
    if (record && !record.unreadable && alive(record.pid)) {
      const proven = probed.state === 'up' || (probed.state === 'unprobed' && provenNow(layer.spec, logOf(projectRoot, layer.name)));
      if (proven) {
        out.push({ ...probed, state: 'up', detail: raisedBy(record) });
        continue;
      }
      failed = {
        layer: layer.name,
        check: probed.checks.find((check) => !check.ok) ?? null,
        output: lastLines(readLog(logOf(projectRoot, layer.name))) || `pid ${record.pid} is running and has proven nothing`,
      };
      out.push({ ...probed, state: 'failed', raisedByHodos: true, detail: `pid ${record.pid} is a raise that did not come up` });
      continue;
    }
    const access = layer.spec.access;
    if (access && access.grantedAt === null) {
      // hodos raises; where it cannot, it asks for access — and the asking is
      // the kernel's, not a script's (decision 0074).
      blocked = { layer: layer.name, grant: access.grant ?? null, needs: access.needs ?? [] };
      out.push({ ...probed, state: 'blocked' });
      continue;
    }
    if (!layer.spec.up) {
      failed = { layer: layer.name, check: probed.checks.find((check) => !check.ok) ?? null, output: 'the layer is down and declares no `up`' };
      out.push({ ...probed, state: 'failed' });
      continue;
    }
    mkdirSync(envDir(projectRoot), { recursive: true });
    const raise = await raiseOnce(layer, probed.cwd, projectRoot, session);
    out.push({ ...probed, state: raise.state, raisedByHodos: true, checks: raise.checks, ...(raise.detail ? { detail: raise.detail } : {}) });
    if (raise.state === 'failed') {
      failed = {
        layer: layer.name,
        check: raise.checks.find((check) => !check.ok) ?? null,
        output: lastLines(readLog(raise.logPath)) || raise.detail || 'the layer printed nothing',
      };
    }
  }
  // The base URL a run hands the verifier is the one a layer that **came up**
  // declares. A port nobody is listening on turns a skip with a reason into a
  // browser claim that fails for the wrong reason.
  return {
    result: { profile, gitRoot: root, projectRoot, layers: out, url: baseUrl(out), failed, blocked },
    code: failed || blocked ? 1 : 0,
  };
}

/**
 * Is this layer up, read the way `waitGreen` reads it while raising? The log
 * belongs to the raise the record names — it is truncated at every spawn — so
 * the `ready` line in it is this raise's. A layer that declares neither a
 * check nor a `ready` line is proven by nothing while it is raised and is not
 * called failed for it afterwards.
 */
const provenNow = (spec, logPath) => (spec.ready ? readLog(logPath).includes(spec.ready) : true);

const recordPath = (projectRoot, name) => join(envDir(projectRoot), `${name}.json`);
const recordText = (record) => `${JSON.stringify(record, null, 2)}\n`;

/**
 * Create the record of a raise, or report that one exists. The link of a
 * finished temporary file is what makes it exclusive **and** whole: an
 * `open(..., 'wx')` is exclusive, and a reader between its open and its write
 * reads an empty file and calls the record unreadable.
 */
function createRecord(projectRoot, name, record) {
  const target = recordPath(projectRoot, name);
  const tmp = `${target}.${process.pid}.tmp`;
  writeFileSync(tmp, recordText(record));
  try {
    linkSync(tmp, target);
    return true;
  } catch (error) {
    if (error.code === 'EEXIST') return false;
    throw error;
  } finally {
    rmSync(tmp, { force: true });
  }
}

/** Replace a record by a rename, so a reader never sees half of it. */
function replaceRecord(projectRoot, name, record) {
  const target = recordPath(projectRoot, name);
  const tmp = `${target}.${process.pid}.tmp`;
  writeFileSync(tmp, recordText(record));
  renameSync(tmp, target);
}

function readRecord(projectRoot, name) {
  try {
    return JSON.parse(readFileSync(recordPath(projectRoot, name), 'utf8'));
  } catch (error) {
    return error.code === 'ENOENT' ? null : { unreadable: true };
  }
}

/**
 * The sessions on a layer, one file each (decision 0169). A list rewritten by
 * two processes at once loses one of them; a file created or removed is one
 * atomic step, so two sessions attaching at the same moment are both counted.
 */
const usersDir = (projectRoot, name) => join(envDir(projectRoot), `${name}.users`);

function register(projectRoot, name, session) {
  mkdirSync(usersDir(projectRoot, name), { recursive: true });
  writeFileSync(join(usersDir(projectRoot, name), session), '');
}

function unregister(projectRoot, name, session) {
  rmSync(join(usersDir(projectRoot, name), session), { force: true });
}

function usersOf(projectRoot, name) {
  try {
    return readdirSync(usersDir(projectRoot, name)).sort();
  } catch {
    return [];
  }
}

/** Whose raise a live record is, for the line a session that attached prints. */
const raisedBy = (record) =>
  `pid ${record.pid}, raised by ${record.session ? `session ${record.session}` : 'a caller with no session id'}`;

/**
 * Raise one layer — or, where another process holds its record, wait on that
 * raise's own proof and attach to it. The record is created before the spawn,
 * exclusively, so two sessions raising at once spawn one process: the loser
 * spawns nothing, and never truncates the winner's log. A record whose pid is
 * dead, or still null past the layer's own timeout, is a raise that crashed;
 * it is removed and the raise tried once more (decision 0169).
 */
async function raiseOnce(layer, cwd, projectRoot, session) {
  const { name, spec } = layer;
  const logPath = logOf(projectRoot, name);
  const fresh = { pid: null, startedAt: new Date().toISOString(), cmd: spec.up, stop: spec.stop ?? null, cwd, log: logPath, session: session ?? null };
  const timeoutMs = (spec.timeout ?? LAYER_TIMEOUT) * 1000;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    if (createRecord(projectRoot, name, fresh)) {
      const pid = spawnLayer(spec, cwd, logPath);
      // Rewritten with the pid before the wait, so a script killed mid-raise
      // still leaves `down` something to stop. What the raise achieved is read
      // from the layer's own proof when a command next asks, not stored here.
      replaceRecord(projectRoot, name, { ...fresh, pid });
      const waited = await waitGreen(spec, cwd, logPath);
      return { state: waited.ok ? 'raised' : 'failed', checks: waited.checks, logPath };
    }
    const other = readRecord(projectRoot, name);
    const crashed =
      !other ||
      other.unreadable ||
      (other.pid === null ? Date.now() - Date.parse(other.startedAt) > timeoutMs : !alive(other.pid));
    if (crashed) {
      rmSync(recordPath(projectRoot, name), { force: true });
      continue;
    }
    const theirLog = other.log ?? logPath;
    const waited = await waitGreen(spec, cwd, theirLog);
    const now = readRecord(projectRoot, name) ?? other;
    return { state: waited.ok ? 'up' : 'failed', checks: waited.checks, detail: raisedBy(now), logPath: theirLog };
  }
  return { state: 'failed', checks: [], detail: 'the record of this layer was replaced while it was being raised', logPath };
}

/** Is this process still there? A pid nothing answers for is a stale record. */
function alive(pid) {
  if (!Number.isInteger(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

/**
 * Stop the layers **this machine raised**, and only those. The record on disk
 * is what says which: a layer found green at `up` never got one, so `down`
 * leaves a developer's own containers exactly as it found them. Teardown that
 * depends on the session still remembering what it started is the failure
 * decision 0074 names.
 *
 * And only when no other session is on it (decision 0169). This session comes
 * off first, then the rest are counted: a layer another session still uses is
 * left running and named, `--all` stops it anyway, and a caller with no id —
 * on no layer itself — stops only a layer nobody is on, which is what every
 * record was before sessions shared one.
 */
export async function down(cwd, { all = false, session = sessionOf() } = {}) {
  const { stop, found, profile, layers, root, raised } = preamble(cwd);
  if (stop) return stop;
  const out = [];
  let failed = false;
  for (const layer of layers) {
    const record = raised.get(layer.name);
    if (session) unregister(found.projectRoot, layer.name, session);
    if (!record) {
      out.push({ name: layer.name, state: 'not-raised' });
      continue;
    }
    const users = usersOf(found.projectRoot, layer.name);
    if (!all && !record.unreadable && users.length > 0) {
      const who = `session${users.length === 1 ? '' : 's'} ${users.join(', ')}`;
      out.push({ name: layer.name, state: 'in-use', users, detail: `still used by ${who} — down --all stops it` });
      continue;
    }
    const file = join(envDir(found.projectRoot), `${layer.name}.json`);
    if (record.unreadable) {
      rmSync(file, { force: true });
      rmSync(usersDir(found.projectRoot, layer.name), { recursive: true, force: true });
      out.push({ name: layer.name, state: 'stale', detail: 'the record could not be read' });
      continue;
    }
    const where = record.cwd ?? layerCwd(layer.spec, root);
    const stopCmd = record.stop ?? layer.spec.stop ?? null;
    if (stopCmd) {
      const result = spawnSync(stopCmd, { cwd: where, shell: true, encoding: 'utf8' });
      const ok = result.status === 0 && !result.error;
      if (!ok) failed = true;
      out.push({
        name: layer.name,
        state: ok ? 'stopped' : 'failed',
        detail: ok ? stopCmd : lastLines(`${result.stdout ?? ''}${result.stderr ?? ''}`) || `${stopCmd} exited ${result.status}`,
      });
      if (ok) {
        rmSync(file, { force: true });
        rmSync(usersDir(found.projectRoot, layer.name), { recursive: true, force: true });
      }
      continue;
    }
    if (!alive(record.pid)) {
      rmSync(file, { force: true });
      rmSync(usersDir(found.projectRoot, layer.name), { recursive: true, force: true });
      out.push({ name: layer.name, state: 'stale', detail: `pid ${record.pid} is gone` });
      continue;
    }
    try {
      // The negative pid is the process group the detached spawn created, so
      // a dev server's own children go with it rather than holding the port.
      process.kill(-record.pid, 'SIGTERM');
      out.push({ name: layer.name, state: 'stopped', detail: `pid ${record.pid}` });
      rmSync(file, { force: true });
      rmSync(usersDir(found.projectRoot, layer.name), { recursive: true, force: true });
    } catch (error) {
      failed = true;
      out.push({ name: layer.name, state: 'failed', detail: `pid ${record.pid}: ${error.code ?? error.message}` });
    }
  }
  return { result: { profile, projectRoot: found.projectRoot, layers: out }, code: failed ? 1 : 0 };
}

async function main(argv) {
  if (argv.length === 0 || argv[0] === '--help' || argv[0] === '-h') {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const command = argv[0];
  const commands = { up, down, probe: report, status: report };
  if (!commands[command]) {
    process.stderr.write(`env: unknown command: ${command}\n${USAGE}\n`);
    return 2;
  }
  const rest = argv.slice(1);
  const flags = rest.filter((arg) => arg.startsWith('--'));
  const allowed = command === 'down' ? ['--all'] : [];
  const unknown = flags.find((flag) => !allowed.includes(flag));
  if (unknown) {
    process.stderr.write(`env: ${command} takes no ${unknown}\n${USAGE}\n`);
    return 2;
  }
  const dir = rest.find((arg) => !arg.startsWith('--')) ?? process.cwd();
  const { result, code } = await commands[command](dir, { all: flags.includes('--all') });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  // `status` reports; it does not judge. `probe` answers whether the
  // environment is up, which is a question with an exit code.
  return command === 'status' ? 0 : code;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  main(process.argv.slice(2)).then((code) => {
    process.exitCode = code;
  });
}
