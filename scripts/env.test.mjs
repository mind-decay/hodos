// Fixture layouts are generated in temp dirs, never committed (COMPONENTS.md §3).
//
// Every server a check probes is opened by the test itself, so a green check
// means a port this process holds — never a service that happened to be up on
// the machine running the suite.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, mkdirSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { createServer } from 'node:net';
import { createServer as createHttpServer } from 'node:http';
import { fileURLToPath } from 'node:url';

const ENV = fileURLToPath(new URL('./env.mjs', import.meta.url));

function tree(files) {
  // realpath: macOS tmpdir is a symlink, and the walk compares directory paths.
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-env-')));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

const json = (value) => JSON.stringify(value, null, 2);

/**
 * Run env.mjs in `cwd` and parse what it printed. Asynchronous on purpose: an
 * http check answers against a server this process holds, and a synchronous
 * spawn would block the event loop that has to serve it.
 */
function env(cwd, ...args) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [ENV, ...args], { cwd });
    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (chunk) => {
      stdout += chunk;
    });
    child.stderr.on('data', (chunk) => {
      stderr += chunk;
    });
    child.on('close', (status) => {
      let parsed = null;
      try {
        parsed = JSON.parse(stdout);
      } catch {
        parsed = null;
      }
      resolve({ status, stdout, stderr, json: parsed });
    });
  });
}

/** A listening TCP port, closed by the test that opened it. */
async function listener() {
  const server = createServer((socket) => socket.end());
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { port: server.address().port, close: () => new Promise((resolve) => server.close(resolve)) };
}

/** An HTTP server answering with one status, closed by the test that opened it. */
async function http(status) {
  const server = createHttpServer((_request, response) => {
    response.statusCode = status;
    response.end('ok');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { port: server.address().port, close: () => new Promise((resolve) => server.close(resolve)) };
}

/** A repository whose root config declares `layers`, and a subproject under web/. */
function project(layers, profile = 'local') {
  return tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({
      version: 1,
      commands: { test: 'root-test' },
      verify: { profile, profiles: { local: { layers: Object.keys(layers) } }, layers },
    }),
    'web/.claude/hodos/config.json': json({ commands: { test: 'web-test' } }),
    'web/src/app.ts': 'export const app = 1;\n',
  });
}

// env.mjs raises a layer with `shell: true` and stops it with
// `process.kill(-pid, 'SIGTERM')` (`scripts/env.mjs:440`) — a POSIX process
// group, which Windows does not have; its form is `taskkill /T /PID` and is
// unbuilt. The layers these tests declare are POSIX shell commands for the same
// reason. So the file is skipped there rather than asserting a mechanism the
// platform does not carry, and `FORMATS.md §2` says so where the format is
// declared.
const posix = { skip: process.platform === 'win32' && 'env.mjs stops a layer by its POSIX process group; the Windows form is unbuilt' };

test('--help exits 0 with usage', posix, async () => {
  const run = spawnSync(process.execPath, [ENV, '--help'], { encoding: 'utf8' });

  assert.equal(run.status, 0);
  assert.match(run.stdout, /probe/);
  assert.match(run.stdout, /up/);
  assert.match(run.stdout, /down/);
  assert.match(run.stdout, /status/);
});

test('an unknown command exits 2', posix, async () => {
  const run = spawnSync(process.execPath, [ENV, 'raise'], { encoding: 'utf8' });

  assert.equal(run.status, 2);
});

test('a project with no profile declares no environment, and probe touches nothing', posix, async () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({ version: 1, commands: { dev: { cmd: 'npm run dev', url: 'http://localhost:5173', ready: 'Local:' } } }),
  });

  const run = await env(root, 'probe');

  assert.equal(run.status, 0);
  assert.match(run.stdout, /no environment declared/);
  assert.equal(run.json.declared, false);
});

test('no config at all is notFound and exit 0, like every other script', posix, async () => {
  const root = tree({ 'src/app.ts': 'export const app = 1;\n' });

  const run = await env(root, 'probe');

  assert.equal(run.status, 0);
  assert.equal(run.json.notFound, true);
});

test('a layer is one directory whatever depth the script is called from', posix, async () => {
  const root = project({ infra: { cwd: 'infra', check: [{ kind: 'cmd', run: 'true' }] } });
  mkdirSync(join(root, 'infra'), { recursive: true });

  const atRoot = await env(root, 'probe');
  const atSub = await env(join(root, 'web'), 'probe');

  assert.equal(atRoot.json.layers[0].cwd, join(root, 'infra'));
  assert.equal(atSub.json.layers[0].cwd, join(root, 'infra'));
  assert.equal(atRoot.json.layers[0].state, atSub.json.layers[0].state);
});

test('a tcp check is green on an open port and red on a closed one', posix, async () => {
  const open = await listener();
  const root = project({ infra: { check: [{ kind: 'tcp', target: `127.0.0.1:${open.port}`, timeout: 2 }] } });

  const green = await env(root, 'probe');
  await open.close();
  const red = await env(root, 'probe');

  assert.equal(green.json.layers[0].state, 'up');
  assert.equal(green.json.layers[0].checks[0].ok, true);
  assert.equal(red.json.layers[0].state, 'down');
  assert.equal(red.json.layers[0].checks[0].ok, false);
});

test('a cmd check reads the exit code and keeps what the command said', posix, async () => {
  const root = project({
    infra: { check: [{ kind: 'cmd', run: 'echo raising >&2; exit 3' }] },
  });

  const run = await env(root, 'probe');

  assert.equal(run.json.layers[0].state, 'down');
  assert.equal(run.json.layers[0].checks[0].ok, false);
  assert.match(run.json.layers[0].checks[0].detail, /raising/);
});

test('a cmd check runs in the layer directory, not in the caller cwd', posix, async () => {
  const root = project({ infra: { cwd: 'infra', check: [{ kind: 'cmd', run: 'test -f marker' }] } });
  mkdirSync(join(root, 'infra'), { recursive: true });
  writeFileSync(join(root, 'infra', 'marker'), 'here\n');

  const run = await env(join(root, 'web'), 'probe');

  assert.equal(run.json.layers[0].state, 'up');
});

test('an http check is green on the status it expects and red on any other', posix, async () => {
  const ok = await http(200);
  const wrong = await http(503);
  const root = project({
    api: { check: [{ kind: 'http', target: `http://127.0.0.1:${ok.port}/health`, timeout: 2 }] },
    slow: { check: [{ kind: 'http', target: `http://127.0.0.1:${wrong.port}/health`, expect: 200, timeout: 2 }] },
  });

  const run = await env(root, 'probe');
  await ok.close();
  await wrong.close();

  assert.equal(run.json.layers[0].state, 'up');
  assert.equal(run.json.layers[1].state, 'down');
  assert.match(run.json.layers[1].checks[0].detail, /503/);
});

test('an http check on a refused connection is red with the reason, never a throw', posix, async () => {
  const gone = await http(200);
  const port = gone.port;
  await gone.close();
  const root = project({ api: { check: [{ kind: 'http', target: `http://127.0.0.1:${port}/health`, timeout: 2 }] } });

  const run = await env(root, 'probe');

  assert.equal(run.status, 1);
  assert.equal(run.json.layers[0].state, 'down');
  assert.equal(run.json.layers[0].checks[0].ok, false);
});

test('a layer with no check is unprobed, never up — a layer proven by nothing is not proven', posix, async () => {
  const root = project({ spa: { up: 'npm run dev', ready: 'Local:', url: 'http://localhost:5173' } });

  const run = await env(root, 'probe');

  assert.equal(run.json.layers[0].state, 'unprobed');
  // The layer declares a URL and nothing has proven it is serving it, so the
  // report carries the declaration on the layer and no base URL above it.
  assert.equal(run.json.layers[0].url, 'http://localhost:5173');
  assert.equal(run.json.url, null);
});

test('the active profile decides which layer is reported, and which URL is the candidate', posix, async () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({
      version: 1,
      verify: {
        profile: 'stand',
        profiles: { local: { layers: ['spa'] }, stand: { layers: ['spa-stand'] } },
        layers: {
          spa: { up: 'npm run dev', ready: 'Local:', url: 'http://localhost:5173' },
          'spa-stand': { up: 'npm run dev:stand', ready: 'Local:', url: 'http://localhost:4173' },
        },
      },
    }),
  });

  const run = await env(root, 'probe');

  assert.equal(run.json.profile, 'stand');
  assert.equal(run.json.layers.length, 1);
  // The active profile decides which layer is even reported, and with it which
  // URL is the candidate — the base URL itself waits for that layer to be up.
  assert.equal(run.json.layers[0].url, 'http://localhost:4173');
  assert.equal(run.json.url, null);
});

test('probe reports the layers in the profile order, and only that profile', posix, async () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({
      version: 1,
      verify: {
        profile: 'local',
        profiles: { local: { layers: ['backend', 'infra'] } },
        layers: {
          infra: { check: [{ kind: 'cmd', run: 'true' }] },
          backend: { check: [{ kind: 'cmd', run: 'true' }] },
          unused: { check: [{ kind: 'cmd', run: 'false' }] },
        },
      },
    }),
  });

  const run = await env(root, 'probe');

  assert.deepEqual(run.json.layers.map((layer) => layer.name), ['backend', 'infra']);
});

test('status reports what this machine raised, which before any up is nothing', posix, async () => {
  const root = project({ infra: { check: [{ kind: 'cmd', run: 'true' }] } });

  const run = await env(root, 'status');

  assert.equal(run.status, 0);
  assert.equal(run.json.layers[0].raisedByHodos, false);
});

// --- up: the layers a profile names, raised in its order and each proven up
// before the next one starts (decision 0074).

/** Kill a raised layer's process group, so no test leaves one behind. */
function stopPid(pid) {
  try {
    process.kill(-pid, 'SIGKILL');
  } catch {
    // already gone
  }
}

test('up with no profile declares no environment and starts nothing', posix, async () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({ version: 1, commands: { test: 'npm test' } }),
  });

  const run = await env(root, 'up');

  assert.equal(run.status, 0);
  assert.match(run.stdout, /no environment declared/);
  assert.equal(existsSync(join(root, '.claude/hodos/env')), false);
});

test('a layer that is already up is not raised', posix, async () => {
  const root = project({
    infra: { up: 'touch raised-marker', check: [{ kind: 'cmd', run: 'true' }], timeout: 5 },
  });

  const run = await env(root, 'up');

  assert.equal(run.status, 0);
  assert.equal(existsSync(join(root, 'raised-marker')), false);
  assert.equal(run.json.layers[0].state, 'up');
  assert.equal(run.json.layers[0].raisedByHodos, false);
});

test('a layer that is down is raised, and up returns when its checks go green', posix, async () => {
  const root = project({
    infra: { up: 'sleep 0.4; touch up-marker', check: [{ kind: 'cmd', run: 'test -f up-marker' }], timeout: 10 },
  });

  const run = await env(root, 'up');

  assert.equal(run.status, 0);
  assert.equal(run.json.layers[0].state, 'raised');
  assert.equal(existsSync(join(root, 'up-marker')), true);
  assert.equal(existsSync(join(root, '.claude/hodos/env/infra.json')), true);
});

test('the layers are raised in the order the profile names them', posix, async () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({
      version: 1,
      verify: {
        profile: 'local',
        profiles: { local: { layers: ['backend', 'infra'] } },
        layers: {
          infra: { up: 'echo infra >> order.log; touch infra-marker', check: [{ kind: 'cmd', run: 'test -f infra-marker' }], timeout: 10 },
          backend: { up: 'echo backend >> order.log; touch backend-marker', check: [{ kind: 'cmd', run: 'test -f backend-marker' }], timeout: 10 },
        },
      },
    }),
  });

  const run = await env(root, 'up');

  assert.equal(run.status, 0);
  assert.equal(readFileSync(join(root, 'order.log'), 'utf8'), 'backend\ninfra\n');
});

test('the foreground layer is spawned detached, waited out on its ready line, and recorded', posix, async () => {
  const root = project({
    spa: {
      up: "printf 'starting\\n'; sleep 0.3; printf 'Local: http://127.0.0.1:5173\\n'; sleep 30",
      ready: 'Local:',
      url: 'http://127.0.0.1:5173',
      timeout: 10,
    },
  });

  const run = await env(root, 'up');
  const record = JSON.parse(readFileSync(join(root, '.claude/hodos/env/spa.json'), 'utf8'));

  assert.equal(run.status, 0);
  assert.equal(run.json.layers[0].state, 'raised');
  assert.equal(run.json.url, 'http://127.0.0.1:5173');
  assert.equal(typeof record.pid, 'number');
  assert.match(readFileSync(join(root, '.claude/hodos/env/spa.log'), 'utf8'), /Local:/);
  // The process outlived the script that started it — the whole point of a
  // detached spawn (decision 0074, the orphan line of verify-loop.md §3).
  assert.doesNotThrow(() => process.kill(record.pid, 0));
  stopPid(record.pid);
});

test('a layer that never goes green is waited out and reported with its failing check', posix, async () => {
  const root = project({
    infra: {
      up: "printf 'raising the thing\\nstill starting\\n'; sleep 30",
      check: [{ kind: 'cmd', run: 'test -f never' }],
      timeout: 1,
    },
  });

  const run = await env(root, 'up');
  const record = JSON.parse(readFileSync(join(root, '.claude/hodos/env/infra.json'), 'utf8'));

  assert.equal(run.status, 1);
  assert.equal(run.json.failed.layer, 'infra');
  assert.match(run.json.failed.check.target, /never/);
  assert.match(run.json.failed.output, /still starting/);
  stopPid(record.pid);
});

test('a layer after a failed one is not raised, because order is the point', posix, async () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({
      version: 1,
      verify: {
        profile: 'local',
        profiles: { local: { layers: ['infra', 'spa'] } },
        layers: {
          infra: { up: 'true', check: [{ kind: 'cmd', run: 'test -f never' }], timeout: 1 },
          spa: { up: 'touch spa-marker', ready: 'never', timeout: 1 },
        },
      },
    }),
  });

  const run = await env(root, 'up');

  assert.equal(run.status, 1);
  assert.equal(existsSync(join(root, 'spa-marker')), false);
  assert.equal(run.json.layers[1].state, 'skipped');
});

test('a layer whose access has not been granted is blocked, never raised, and never asked about here', posix, async () => {
  const root = project({
    hosts: {
      up: 'touch hosts-marker',
      check: [{ kind: 'cmd', run: 'test -f hosts-marker' }],
      timeout: 5,
      access: { needs: ['sudo: writes /etc/hosts'], grant: 'one-time', grantedAt: null },
    },
  });

  const run = await env(root, 'up');

  assert.equal(run.status, 1);
  assert.equal(run.json.layers[0].state, 'blocked');
  assert.equal(existsSync(join(root, 'hosts-marker')), false);
  assert.equal(run.json.blocked.layer, 'hosts');
  assert.deepEqual(run.json.blocked.needs, ['sudo: writes /etc/hosts']);
});

test('a granted layer is raised like any other', posix, async () => {
  const root = project({
    infra: {
      up: 'touch granted-marker',
      check: [{ kind: 'cmd', run: 'test -f granted-marker' }],
      timeout: 5,
      access: { needs: ['Bash(sh ../infra/*)'], grant: 'permissions', grantedAt: '2026-09-05' },
    },
  });

  const run = await env(root, 'up');

  assert.equal(run.status, 0);
  assert.equal(run.json.layers[0].state, 'raised');
});

// --- down: what hodos raised, and only that (decision 0074, criterion 2).

test('down with no profile is exit 0 and stops nothing', posix, async () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({ version: 1, commands: { test: 'npm test' } }),
  });

  const run = await env(root, 'down');

  assert.equal(run.status, 0);
  assert.match(run.stdout, /no environment declared/);
});

test('a layer hodos raised is stopped by its own stop command, and its record removed', posix, async () => {
  const root = project({
    infra: {
      up: 'touch up-marker',
      stop: 'rm -f up-marker; touch stopped-marker',
      check: [{ kind: 'cmd', run: 'test -f up-marker' }],
      timeout: 5,
    },
  });

  await env(root, 'up');
  const run = await env(root, 'down');

  assert.equal(run.status, 0);
  assert.equal(existsSync(join(root, 'stopped-marker')), true);
  assert.equal(existsSync(join(root, '.claude/hodos/env/infra.json')), false);
  assert.equal(run.json.layers[0].state, 'stopped');
});

test('a layer found already up is left running — down never stops what it did not start', posix, async () => {
  const root = project({
    infra: {
      up: 'touch raised-marker',
      stop: 'touch stopped-marker',
      check: [{ kind: 'cmd', run: 'true' }],
      timeout: 5,
    },
  });

  await env(root, 'up');
  const run = await env(root, 'down');

  assert.equal(existsSync(join(root, 'stopped-marker')), false);
  assert.equal(run.json.layers[0].state, 'not-raised');
});

test('the foreground layer is stopped by its process group, which it has because it was spawned detached', posix, async () => {
  const root = project({
    spa: {
      up: "printf 'Local: http://127.0.0.1:5173\\n'; sleep 30",
      ready: 'Local:',
      url: 'http://127.0.0.1:5173',
      timeout: 10,
    },
  });

  await env(root, 'up');
  const record = JSON.parse(readFileSync(join(root, '.claude/hodos/env/spa.json'), 'utf8'));
  const run = await env(root, 'down');

  assert.equal(run.json.layers[0].state, 'stopped');
  assert.equal(existsSync(join(root, '.claude/hodos/env/spa.json')), false);
  await new Promise((resolve) => setTimeout(resolve, 200));
  assert.throws(() => process.kill(record.pid, 0));
});

test('a record naming a process that is already gone is stale, removed, and not an error', posix, async () => {
  const dead = spawnSync(process.execPath, ['-e', '0'], { encoding: 'utf8' });
  const root = project({ spa: { up: 'sleep 30', ready: 'never', timeout: 1 } });
  mkdirSync(join(root, '.claude/hodos/env'), { recursive: true });
  writeFileSync(
    join(root, '.claude/hodos/env/spa.json'),
    json({ pid: dead.pid, startedAt: '2026-09-05T10:00:00Z', cmd: 'sleep 30', stop: null, cwd: root, log: join(root, '.claude/hodos/env/spa.log') }),
  );

  const run = await env(root, 'down');

  assert.equal(run.status, 0);
  assert.equal(run.json.layers[0].state, 'stale');
  assert.equal(existsSync(join(root, '.claude/hodos/env/spa.json')), false);
});

test('down twice is the same as down once', posix, async () => {
  const root = project({
    infra: { up: 'touch up-marker', stop: 'touch stopped-marker', check: [{ kind: 'cmd', run: 'test -f up-marker' }], timeout: 5 },
  });

  await env(root, 'up');
  const first = await env(root, 'down');
  const second = await env(root, 'down');

  assert.equal(first.status, 0);
  assert.equal(second.status, 0);
  assert.equal(second.json.layers[0].state, 'not-raised');
});

// --- the single-process case: `commands.dev` is still an environment, and one
// `spa` layer is the same environment with more words (decision 0074).

const WEBAPP = fileURLToPath(new URL('../bench/fixtures/webapp/.claude/hodos/config.json', import.meta.url));

test('the webapp fixture declares no environment, and up neither says nor starts anything', posix, async () => {
  const fixture = dirname(dirname(dirname(WEBAPP)));

  const run = await env(fixture, 'up');

  assert.equal(run.status, 0);
  assert.equal(run.json.declared, false);
  assert.equal(existsSync(join(fixture, '.claude/hodos/env')), false);
});

test('the webapp fixture re-expressed as one spa layer checks clean and declares the same base URL', posix, async () => {
  const fixture = JSON.parse(readFileSync(WEBAPP, 'utf8'));
  const layered = {
    ...fixture,
    verify: {
      ...fixture.verify,
      profile: 'local',
      profiles: { local: { layers: ['spa'] } },
      layers: {
        spa: { up: fixture.commands.dev.cmd, ready: fixture.commands.dev.ready, url: fixture.commands.dev.url },
      },
    },
  };
  const root = tree({ '.git/HEAD': 'ref: refs/heads/main\n', '.claude/hodos/config.json': json(layered) });

  const run = await env(root, 'probe');
  const check = spawnSync(process.execPath, [fileURLToPath(new URL('./config.mjs', import.meta.url)), 'check', root], { encoding: 'utf8' });

  assert.equal(run.json.layers[0].url, fixture.commands.dev.url);
  assert.equal(run.json.layers[0].state, 'unprobed');
  // Nothing is raised here, so there is no base URL yet and the `ready` string
  // is not asserted: this test writes the layer from `commands.dev.ready`, so
  // comparing the two compares a string with itself. What awaits that line is
  // `waitGreen`, pinned by the raise test above, and the live run of criterion
  // 5 is where the fixture's own string was awaited by a real dev server.
  assert.equal(run.json.url, null);
  assert.equal(check.status, 0, check.stdout);
});

test('up hands back a base URL only when the layer that declares it came up', posix, async () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({
      version: 1,
      verify: {
        profile: 'local',
        profiles: { local: { layers: ['hosts', 'spa'] } },
        layers: {
          hosts: {
            up: 'true',
            check: [{ kind: 'cmd', run: 'test -f never' }],
            timeout: 1,
            access: { needs: ['sudo: writes /etc/hosts'], grant: 'one-time', grantedAt: null },
          },
          spa: { up: 'sleep 30', ready: 'Local:', url: 'http://127.0.0.1:5173', timeout: 1 },
        },
      },
    }),
  });

  const run = await env(root, 'up');

  assert.equal(run.json.blocked.layer, 'hosts');
  assert.equal(run.json.layers[1].state, 'skipped');
  // The port is nobody's: handing it to the verifier would turn a skip with a
  // reason into a browser claim that fails for the wrong reason.
  assert.equal(run.json.url, null);
});

test('a ready line left in the log by an earlier raise does not prove this one', posix, async () => {
  // The log survives `down` on purpose (FORMATS.md §1): it is the diagnosis a
  // preparer reads. That makes it the wrong place to look for proof unless
  // each raise starts it empty — otherwise the second run in any project
  // reports `raised` for a layer that never started, and hands the verifier a
  // base URL for a dead port.
  const root = project({
    spa: { up: "printf 'this raise printed nothing useful\\n'; sleep 30", ready: 'Local:', url: 'http://127.0.0.1:5173', timeout: 2 },
  });
  mkdirSync(join(root, '.claude/hodos/env'), { recursive: true });
  writeFileSync(join(root, '.claude/hodos/env/spa.log'), 'Local: http://127.0.0.1:5173\n');

  const run = await env(root, 'up');
  const record = JSON.parse(readFileSync(join(root, '.claude/hodos/env/spa.json'), 'utf8'));
  stopPid(record.pid);

  assert.equal(run.json.layers[0].state, 'failed');
  assert.equal(run.json.url, null);
  assert.equal(run.status, 1);
});

test('up twice raises once — a live record is not started a second time', posix, async () => {
  // A layer proven by its `ready` line probes `unprobed`, never `up`, so
  // nothing in the probe stops a second raise. §3 runs `up` again after a
  // grant and on every entry, and a record overwritten by the second raise
  // leaves the first process holding the port with nothing on disk to stop it.
  const root = project({
    spa: { up: "printf 'Local: http://127.0.0.1:5173\\n'; sleep 30", ready: 'Local:', url: 'http://127.0.0.1:5173', timeout: 10 },
  });

  const first = await env(root, 'up');
  const before = JSON.parse(readFileSync(join(root, '.claude/hodos/env/spa.json'), 'utf8'));
  const second = await env(root, 'up');
  const after = JSON.parse(readFileSync(join(root, '.claude/hodos/env/spa.json'), 'utf8'));
  stopPid(before.pid);

  assert.equal(first.json.layers[0].state, 'raised');
  assert.equal(second.json.layers[0].raisedByHodos, true);
  assert.notEqual(second.json.layers[0].state, 'raised');
  assert.equal(after.pid, before.pid);
  assert.equal(second.status, 0);
});

test('probe reports the base URL only for a layer it found up, the same rule up applies', posix, async () => {
  // `verify-loop.md §3` sends the kernel to `probe` on the one path where
  // `up`'s own URL was null. A URL read from the spec there undoes the gate.
  const root = project({
    spa: { up: 'true', url: 'http://127.0.0.1:8123', check: [{ kind: 'tcp', target: '127.0.0.1:8123' }] },
  });

  const run = await env(root, 'probe');

  assert.equal(run.json.layers[0].state, 'down');
  assert.equal(run.json.url, null);
  assert.equal(run.status, 1);
});

test('a live record from a raise that failed is a failed raise, not an up layer', posix, async () => {
  // The record says this machine started something, not that it works. A
  // failed raise leaves its process running until `down`, so consulting the
  // record before the check would hand the verifier the base URL of a port
  // nothing answers — the harm the truncated log was fixed for, by another door.
  const root = project({
    spa: {
      up: "printf 'vite: failed to bind\\n'; sleep 90",
      url: 'http://127.0.0.1:8123',
      check: [{ kind: 'tcp', target: '127.0.0.1:8123' }],
      timeout: 2,
    },
  });

  const first = await env(root, 'up');
  const second = await env(root, 'up');
  const record = JSON.parse(readFileSync(join(root, '.claude/hodos/env/spa.json'), 'utf8'));
  stopPid(record.pid);

  assert.equal(first.json.layers[0].state, 'failed');
  assert.equal(second.json.layers[0].state, 'failed');
  assert.equal(second.json.url, null);
  assert.equal(second.json.failed.layer, 'spa');
  assert.equal(second.status, 1);
});

test('a raise that never proved itself is not believed by the next up either', posix, async () => {
  // The `ready` shape has no check to fall back on, so what answers is the log
  // this raise started empty — and it holds no ready line.
  const root = project({
    spa: { up: "printf 'still starting\\n'; sleep 90", ready: 'Local:', url: 'http://127.0.0.1:5173', timeout: 2 },
  });

  const first = await env(root, 'up');
  const second = await env(root, 'up');
  const record = JSON.parse(readFileSync(join(root, '.claude/hodos/env/spa.json'), 'utf8'));
  stopPid(record.pid);

  assert.equal(first.json.layers[0].state, 'failed');
  assert.equal(second.json.layers[0].state, 'failed');
  assert.equal(second.json.url, null);
  assert.equal(second.status, 1);
});

test('a raise interrupted before its verdict was written is proven by the log, not believed', posix, async () => {
  // Between the spawn and the wait the record exists with no verdict — the
  // state a tool timeout or a Ctrl-C leaves. What the layer printed is on
  // disk either way, so that is what answers.
  const root = project({
    spa: { up: "printf 'starting\\n'; sleep 90", ready: 'Local:', url: 'http://127.0.0.1:5173', timeout: 2 },
  });
  const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 100000)'], { detached: true, stdio: 'ignore' });
  child.unref();
  mkdirSync(join(root, '.claude/hodos/env'), { recursive: true });
  writeFileSync(join(root, '.claude/hodos/env/spa.log'), 'starting\n');
  writeFileSync(
    join(root, '.claude/hodos/env/spa.json'),
    JSON.stringify({ pid: child.pid, startedAt: new Date().toISOString(), cmd: 'npm run dev', stop: null, cwd: root, log: join(root, '.claude/hodos/env/spa.log') }, null, 2),
  );

  const run = await env(root, 'up');
  stopPid(child.pid);

  assert.equal(run.json.layers[0].state, 'failed');
  assert.equal(run.json.url, null);
  assert.equal(run.status, 1);
});

test('a ready line that lands after the timeout is read on the next up — slow is not broken', posix, async () => {
  // `hodos-preparer` step 2 calls this out by name: a check green now was slow,
  // not broken. A verdict stored at the timeout would refuse the layer for the
  // rest of the run and make the preparer's green path unreachable.
  const root = project({
    spa: { up: "printf 'warming\\n'; sleep 2; printf 'Local: http://127.0.0.1:5173\\n'; sleep 90", ready: 'Local:', url: 'http://127.0.0.1:5173', timeout: 1 },
  });

  const first = await env(root, 'up');
  await new Promise((resolve) => setTimeout(resolve, 2500));
  const second = await env(root, 'up');
  const record = JSON.parse(readFileSync(join(root, '.claude/hodos/env/spa.json'), 'utf8'));
  stopPid(record.pid);

  assert.equal(first.json.layers[0].state, 'failed');
  assert.equal(second.json.layers[0].state, 'up');
  assert.equal(second.json.url, 'http://127.0.0.1:5173');
  assert.equal(second.status, 0);
});

test('a layer proven by nothing is not raised twice either — the record still stops the second raise', posix, async () => {
  // `provenNow` answers `true` for a layer that declares neither a check nor a
  // `ready` line, which is `waitGreen`'s own rule read at the same layer: such
  // a raise is proven by nothing while it runs and is not called failed for it
  // afterwards. Without this the second `up` starts a second process.
  const root = project({ spa: { up: 'sleep 90' } });

  const first = await env(root, 'up');
  const before = JSON.parse(readFileSync(join(root, '.claude/hodos/env/spa.json'), 'utf8'));
  const second = await env(root, 'up');
  const after = JSON.parse(readFileSync(join(root, '.claude/hodos/env/spa.json'), 'utf8'));
  stopPid(before.pid);

  assert.equal(first.json.layers[0].state, 'raised');
  assert.equal(second.json.layers[0].state, 'up');
  assert.equal(after.pid, before.pid);
  assert.equal(second.status, 0);
});
