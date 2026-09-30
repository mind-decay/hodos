import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  CLAIM_BRANCH,
  CLAIMED_NODE,
  FOREIGN,
  SLUG,
  claimText,
  externalEntry,
  mapText,
  seedPair,
} from './pair-seed.mjs';
import { frontier, parseMap } from '../../scripts/campaigns.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'pair-seed.mjs');
const MAP_REL = `.claude/hodos/campaigns/${SLUG}.md`;

/** Temp directories this file made, removed when it ends. */
const made = [];
const temp = (prefix) => {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  made.push(dir);
  return dir;
};

after(() => {
  for (const dir of made) rmSync(dir, { recursive: true, force: true });
});

// stderr piped rather than inherited: `git fetch` narrates to it, and this
// file's output is read as a test report.
const git = (cwd, ...args) =>
  execFileSync('git', args, { cwd, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] }).trim();

/** One seeded workspace for every read-only assertion below. */
let pair;
const seeded = () => {
  if (!pair) {
    const into = join(temp('hodos-pair-test-'), 'ws');
    pair = seedPair({ into, modules: false });
  }
  return pair;
};

describe('the paths the pair is wired with', () => {
  it('names a sibling checkout repo-relatively, with POSIX separators', () => {
    assert.equal(externalEntry('kit', 'mono'), '../mono/.claude/hodos/campaigns');
    assert.equal(externalEntry('mono', 'kit'), '../kit/.claude/hodos/campaigns');
  });
});

describe('the seeded map', () => {
  it('is a map FORMATS.md §11 can be parsed out of', () => {
    const map = parseMap(mapText());
    assert.equal(map.header.Home, 'mono');
    assert.equal(map.header.Status, 'active');
    const byName = new Map(map.nodes.map((n) => [n.name, n]));
    assert.deepEqual(
      [...byName.keys()].sort(),
      ['badge-in-svc', 'kit-badge', 'kit-release', 'kit-scaffold', 'mono-lint-badge', 'web-basket-badge'],
    );
    assert.equal(byName.get('kit-scaffold').status, 'done');
    assert.equal(byName.get('kit-badge').status, 'active');
    assert.equal(byName.get('kit-badge').fields.branch, 'feature/kit-badge');
    assert.equal(byName.get('kit-badge').fields.repo, 'kit');
    assert.equal(byName.get('badge-in-svc').status, 'fog');
    assert.equal(map.waits.length, 1);
  });

  it('carries the release node of BACKLOG.md:48 and the metric of criterion 3', () => {
    const map = parseMap(mapText());
    const release = map.nodes.find((n) => n.name === 'kit-release');
    assert.deepEqual(release.deps, ['kit-badge']);
    assert.equal(release.fields.repo, 'kit');
    const dependent = map.nodes.find((n) => n.name === 'web-basket-badge');
    assert.deepEqual(dependent.deps, ['kit-release']);

    assert.equal(map.metrics.length, 2);
    const external = map.metrics.filter((row) => row.repo === 'kit');
    assert.equal(external.length, 1);
    assert.match(external[0].command, /index\.ts/);
    assert.equal(map.metrics.filter((row) => row.repo === null).length, 1);
  });

  it('holds the dependent of the release node until the release is done', () => {
    const f = frontier(parseMap(mapText()));
    assert.deepEqual(f.ready.map((n) => n.name), [CLAIMED_NODE]);
    assert.deepEqual(
      f.held.map(({ node, by }) => `${node.name} by ${by.join(',')}`).sort(),
      ['kit-release by kit-badge', 'web-basket-badge by kit-release'],
    );
    assert.deepEqual(f.active.map((n) => n.name), ['kit-badge']);
    assert.deepEqual(f.fog.map((n) => n.name), ['badge-in-svc']);
  });
});

describe('the claim the foreign branch carries', () => {
  it('marks one node active under the foreign owner and changes no other line', () => {
    const before = mapText();
    const after_ = claimText(before);
    const a = before.split('\n');
    const b = after_.split('\n');
    assert.equal(a.length, b.length);
    const moved = a.map((line, i) => (line === b[i] ? null : i)).filter((i) => i !== null);
    assert.equal(moved.length, 1);

    const node = parseMap(after_).nodes.find((n) => n.name === CLAIMED_NODE);
    assert.equal(node.status, 'active');
    assert.equal(node.fields.owner, FOREIGN.owner);
    assert.equal(node.fields.branch, CLAIM_BRANCH);
    assert.equal(parseMap(before).nodes.find((n) => n.name === CLAIMED_NODE).status, 'ready');
  });
});

describe('the seeded pair', () => {
  it('is two sibling checkouts and two bare origins', () => {
    const { workspace, mono, kit, origins } = seeded();
    assert.equal(mono, join(workspace, 'mono'));
    assert.equal(kit, join(workspace, 'kit'));
    for (const path of [mono, kit, origins.mono, origins.kit]) assert.ok(existsSync(path), path);
    assert.equal(git(mono, 'remote', 'get-url', 'origin'), origins.mono);
    assert.equal(git(kit, 'remote', 'get-url', 'origin'), origins.kit);
    assert.equal(git(mono, 'status', '--porcelain'), '');
    assert.equal(git(kit, 'status', '--porcelain'), '');
  });

  it('carries a map on main that no session under test wrote', () => {
    const { mono, kit } = seeded();
    assert.equal(git(mono, 'log', '-1', '--format=%an|%cn', '--', MAP_REL), `${FOREIGN.name}|${FOREIGN.name}`);
    assert.notEqual(git(mono, 'config', 'user.name'), FOREIGN.name);

    // The done node's `ref: sha:` is a sha in the repository the node's work
    // sits in, so the seed reads it out of `kit` rather than inventing one.
    const onDisk = readFileSync(join(mono, MAP_REL), 'utf8');
    const scaffold = parseMap(onDisk).nodes.find((n) => n.name === 'kit-scaffold');
    const sha = scaffold.fields.ref.replace(/^sha:/, '');
    assert.equal(git(kit, 'rev-parse', '--short', sha), sha);
    assert.equal(onDisk, mapText({ scaffoldSha: sha }));
  });

  it('hides the foreign branch from the copy and keeps it in the origin', () => {
    const { mono, origins } = seeded();
    assert.doesNotMatch(git(mono, 'branch', '-a'), new RegExp(CLAIM_BRANCH));
    assert.throws(() => git(mono, 'rev-parse', '--verify', `refs/remotes/origin/${CLAIM_BRANCH}`));

    assert.equal(git(origins.mono, 'log', '-1', '--format=%an', CLAIM_BRANCH), FOREIGN.name);
    const onBranch = git(origins.mono, 'show', `${CLAIM_BRANCH}:${MAP_REL}`);
    assert.equal(parseMap(onBranch).nodes.find((n) => n.name === CLAIMED_NODE).status, 'active');
  });

  it('gives the claim a branch a fetch can reach', () => {
    // One fetch on a copy of its own: the read this proves is criterion 7's,
    // and doing it on the shared workspace would leave the ref behind for the
    // test above.
    const into = join(temp('hodos-pair-fetch-'), 'ws');
    const { mono } = seedPair({ into, modules: false });
    git(mono, 'fetch', '--no-tags', 'origin');
    assert.equal(
      git(mono, 'rev-parse', '--verify', '--quiet', `refs/remotes/origin/${CLAIM_BRANCH}`).length,
      40,
    );
    assert.equal(git(mono, 'status', '--porcelain'), '');
  });

  it('points each repository at the other through campaigns.external[]', () => {
    const { mono, kit } = seeded();
    const monoConfig = JSON.parse(readFileSync(join(mono, '.claude/hodos/config.json'), 'utf8'));
    const kitConfig = JSON.parse(readFileSync(join(kit, '.claude/hodos/config.json'), 'utf8'));
    assert.deepEqual(monoConfig.campaigns.external, [externalEntry('mono', 'kit')]);
    assert.deepEqual(kitConfig.campaigns.external, [externalEntry('kit', 'mono')]);
    assert.ok(existsSync(join(kit, kitConfig.campaigns.external[0])));
    assert.equal(kitConfig.commands.test, 'npm test');
  });

  it('refuses a workspace directory that already holds something', () => {
    const dir = temp('hodos-pair-used-');
    mkdirSync(join(dir, 'ws'), { recursive: true });
    writeFileSync(join(dir, 'ws', 'stray.txt'), 'x');
    assert.throws(() => seedPair({ into: join(dir, 'ws'), modules: false }), /not empty/);
  });

  it('prints the workspace as JSON from the command line', () => {
    const into = join(temp('hodos-pair-cli-'), 'ws');
    const out = execFileSync(process.execPath, [SCRIPT, '--into', into, '--no-modules'], { encoding: 'utf8' });
    const json = JSON.parse(out);
    assert.equal(json.workspace, into);
    assert.equal(json.slug, SLUG);
    assert.ok(existsSync(join(json.mono, MAP_REL)));
  });
});

// --- decision 0170: on the seeded pair, a claim over the branch someone else
// holds is refused once a fetch has made that branch readable.

describe('a claim over the seeded claim', () => {
  const CAMPAIGNS = fileURLToPath(new URL('../../scripts/campaigns.mjs', import.meta.url));
  const claim = (cwd, ...extra) =>
    spawnSync(process.execPath, [CAMPAIGNS, 'claim', SLUG, CLAIMED_NODE, '@bench', 'feature/bench-badge', ...extra], {
      cwd,
      encoding: 'utf8',
    });
  const fetched = () => {
    const into = join(temp('hodos-pair-claim-'), 'ws');
    const ws = seedPair({ into, modules: false });
    git(ws.mono, 'fetch', '--no-tags', 'origin');
    return ws;
  };
  const mapOf = (mono) => readFileSync(join(mono, '.claude/hodos/campaigns', `${SLUG}.md`), 'utf8');

  it('exits non-zero naming the owner, the branch and the ref, and leaves the map byte-identical', () => {
    const { mono } = fetched();
    const before = mapOf(mono);

    const out = claim(mono);

    assert.notEqual(out.status, 0);
    assert.match(out.stderr, new RegExp(FOREIGN.owner));
    assert.match(out.stderr, new RegExp(CLAIM_BRANCH));
    assert.match(out.stderr, new RegExp(`refs/remotes/origin/${CLAIM_BRANCH}`));
    assert.equal(mapOf(mono), before);
  });

  it('writes with --force, and says so', () => {
    const { mono } = fetched();

    const out = claim(mono, '--force');

    assert.equal(out.status, 0, out.stderr);
    assert.match(out.stdout, /overrode/);
    assert.match(mapOf(mono), new RegExp(`- \\[active\\] ${CLAIMED_NODE} — .*owner: @bench`));
  });
});
