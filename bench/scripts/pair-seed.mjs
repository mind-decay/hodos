#!/usr/bin/env node
// pair-seed.mjs — the two-repository workspace Stage 9b is exercised against.
//
// Decision 0040 refused `kit` as the second repository for three properties it
// lacked: "a foreign owner, a branch someone else holds, a map nobody in this
// session wrote". Decision 0077 answers that by seeding all three rather than
// by dropping them, and this script is the seed:
//
//   <workspace>/mono            the home repository — the map lives here
//   <workspace>/kit             the external repository — the library
//   <workspace>/origin/mono.git a bare clone, mono's `origin`
//   <workspace>/origin/kit.git  a bare clone, kit's `origin`
//
// The two copies are siblings with fixed names because a `repo:` name resolves
// to the repository root's own directory name (decision 0134), and a mkdtemp
// suffix would make the seeded map unreadable by its own rule. Sibling
// checkouts are also the shape decision 0077 names: a component library
// published as a package beside the monorepo that consumes it.
//
// The claim is committed on a branch that exists **only in the bare origin**:
// the copy's object database does not hold it, so a `git fetch` has to transfer
// something for the claim to be readable at all. That is what makes decision
// 0080's fetch checkable instead of decorative.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { copyFixture } from './fixture-copy.mjs';
import { rewriteNode } from '../../scripts/campaigns.mjs';

/** The campaign the pair carries, and the file it lives in. */
export const SLUG = 'badge-rollout';
const MAP_REL = `.claude/hodos/campaigns/${SLUG}.md`;
const CONFIG_REL = '.claude/hodos/config.json';

/** The teammate nobody in a session under test is. */
export const FOREIGN = { name: 'Ada Teammate', email: 'ada@teammate.invalid', owner: '@ada' };

/** The branch someone else holds, and the node their claim takes. */
export const CLAIM_BRANCH = 'feature/mono-lint-badge';
export const CLAIMED_NODE = 'mono-lint-badge';

/** The identity a copy carries out of `fixture-copy.mjs`. */
const BENCH = { name: 'hodos bench', email: 'bench@hodos.invalid', owner: '@bench' };

const SEEDED_AT = '2026-09-08';

const USAGE = `Usage: node bench/scripts/pair-seed.mjs [options]

Seeds the two-repository workspace of Stage 9b — mono (home) and kit
(external), each with a bare clone as its origin — and prints it as JSON.

  --into <dir>     the workspace directory (default: a fresh temporary one)
  --no-modules     do not link node_modules into either copy
  --help           print this and exit 0

Exit codes: 0 — the JSON is on stdout; 1 — a fixture or git failed, with the
reason on stderr; 2 — bad invocation.`;

/**
 * The path `campaigns.external[]` carries in `from`'s config to reach `to`'s
 * maps. Repo-relative means relative to the git root (`FORMATS.md §2`), and the
 * separator is POSIX because the value is read by a config on every platform.
 */
export function externalEntry(from, to) {
  return `../${to}/.claude/hodos/campaigns`;
}

/**
 * The seeded map. One map answers four of the stage's criteria: a node in the
 * external repository (`repo: kit`), a release node with a dependent held
 * behind it, a metric measured in the other repository, and a `ready` node for
 * the foreign branch to claim.
 *
 * The tracker id uses `SHOP`, the invented prefix `tools/export-public.mjs`
 * already allows: a new prefix would have to be added to that allowlist, and
 * the file's own reasoning is that a longer allowlist is a hole.
 */
export function mapText({ scaffoldSha = 'seeded' } = {}) {
  return `# Badge rollout — one Badge component, shipped from kit and used in mono
Status: active · Owners: ${FOREIGN.owner}, ${BENCH.owner} · Tracker: SHOP-2107
Home: mono

## Done-metrics
| Metric | Command | Start | Target | Current (date) |
|---|---|---|---|---|
| basket badge usages | \`grep -rl Badge web/src \\| wc -l\` | 0 | 1 | 0 (${SEEDED_AT}) |
| barrel exports | \`grep -c "^export" src/index.ts\` · repo: kit | 4 | 6 | 4 (${SEEDED_AT}) |

## Decisions
| # | Decision | Why |
|---|---|---|
| D1 | The badge ships from \`kit\` and is consumed as a published package; \`mono\` never copies the component | one owner for the markup, and \`kit\`'s barrel is its whole public surface |
| D2 | A consumer node waits for a **release**, not for a merge | a node \`[done]\` in a published-package repository is not consumable yet, so the release is its own node |

## Nodes
- [done] kit-scaffold — the library skeleton and its barrel · deps: — · owner: ${FOREIGN.owner} · branch: feature/kit-scaffold · ref: sha:${scaffoldSha} · metric: — · repo: kit
- [active] kit-badge — Badge takes a tone prop · deps: kit-scaffold · owner: ${BENCH.owner} · branch: feature/kit-badge · ref: task:kit-badge · metric: barrel exports 4→6 · repo: kit
- [ready] kit-release — publish 0.2.0 · deps: kit-badge · owner: — · branch: — · ref: — · metric: — · repo: kit
- [ready] web-basket-badge — the basket shows the badge · deps: kit-release · owner: — · branch: — · ref: — · metric: basket badge usages 0→1
- [ready] ${CLAIMED_NODE} — deny a raw span where Badge belongs · deps: — · owner: — · branch: — · ref: — · metric: —
- [fog] badge-in-svc — whether the service's error envelope carries a badge code at all · deps: — · owner: — · branch: — · ref: — · metric: —

## Waits
- kit 0.2.0 on the registry — ${FOREIGN.owner}, asked ${SEEDED_AT}
`;
}

/**
 * The same map with the foreign claim on it. It goes through `rewriteNode`, the
 * script the engine writes claims with, so the seeded line is the shape a real
 * `campaigns.mjs claim` leaves and not one this file invented.
 */
export function claimText(text) {
  return rewriteNode(text, CLAIMED_NODE, {
    status: 'active',
    owner: FOREIGN.owner,
    branch: CLAIM_BRANCH,
    ref: `task:${CLAIMED_NODE}`,
  });
}

/** `kit` ships no `.claude/`, so the pair gives it one. */
function kitConfig() {
  return {
    version: 1,
    language: 'en',
    stack: ['typescript', 'react'],
    commands: {
      test: 'npm test',
      typecheck: 'npm run typecheck',
      lint: 'npm run lint',
      build: 'npm run build',
    },
    verify: {
      recipes: [{ name: 'unit', kind: 'command', run: 'npm test', when: 'always' }],
    },
    conventions: { commit: 'conventional', branch: 'feature/{slug}' },
    autonomy: 'ask',
    gates: { denyDangerousGit: false, blockCommitOnFailedReview: false, stopHookLedger: false },
    adapters: {
      browser: null,
      docs: null,
      codeIndex: null,
      design: null,
      tracker: null,
      logs: null,
      db: null,
      ci: null,
    },
    campaigns: { external: [externalEntry('kit', 'mono')] },
    tasks: { staleDays: 14 },
    verifiedAt: SEEDED_AT,
    scanSha: 'HEAD',
  };
}

const git = (cwd, args, as = null) => {
  const identity = as
    ? ['-c', `user.name=${as.name}`, '-c', `user.email=${as.email}`, '-c', 'commit.gpgsign=false']
    : [];
  return execFileSync('git', [...identity, ...args], {
    cwd,
    encoding: 'utf8',
    stdio: ['pipe', 'pipe', 'pipe'],
  });
};

const writeJson = (path, value) => writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);

/**
 * The claim, committed on a branch the copy never sees. A working clone of the
 * bare origin makes it and pushes it, so `mono` holds neither the commit nor a
 * remote-tracking ref for it until something fetches.
 */
function seedForeignClaim(bare) {
  const clone = mkdtempSync(join(tmpdir(), 'hodos-claim-'));
  try {
    git(dirname(clone), ['clone', '--quiet', bare, clone]);
    git(clone, ['checkout', '--quiet', '-b', CLAIM_BRANCH]);
    const map = join(clone, MAP_REL);
    writeFileSync(map, claimText(readFileSync(map, 'utf8')));
    git(clone, ['add', '--', MAP_REL]);
    git(clone, ['commit', '--quiet', '-m', `chore: claim ${CLAIMED_NODE}`], FOREIGN);
    git(clone, ['push', '--quiet', 'origin', CLAIM_BRANCH]);
  } finally {
    rmSync(clone, { recursive: true, force: true });
  }
}

/**
 * @param {{ into?: string, root?: string, modules?: boolean }} options
 * @returns {{ workspace: string, mono: string, kit: string, origins: { mono: string, kit: string }, slug: string }}
 */
export function seedPair({ into, root, modules = true } = {}) {
  const workspace = into ? resolve(into) : mkdtempSync(join(tmpdir(), 'hodos-pair-'));
  if (existsSync(workspace) && readdirSync(workspace).length > 0) {
    throw new Error(`pair-seed: ${workspace} is not empty — a workspace needs a new directory or an empty one`);
  }
  mkdirSync(workspace, { recursive: true });

  const mono = copyFixture({ name: 'mono', root, into: join(workspace, 'mono'), modules });
  const kit = copyFixture({ name: 'kit', root, into: join(workspace, 'kit'), modules });

  // Each config names the other's maps: `kit` needs the entry to find the map
  // at all, and `mono` needs it to resolve the `repo: kit` its own map carries
  // (decision 0134).
  const monoConfigPath = join(mono, CONFIG_REL);
  const monoConfig = JSON.parse(readFileSync(monoConfigPath, 'utf8'));
  monoConfig.campaigns = { ...monoConfig.campaigns, external: [externalEntry('mono', 'kit')] };
  writeJson(monoConfigPath, monoConfig);
  git(mono, ['add', '--', CONFIG_REL]);
  git(mono, ['commit', '--quiet', '-m', 'chore: point the layer at the kit checkout'], BENCH);

  mkdirSync(join(kit, '.claude', 'hodos'), { recursive: true });
  writeJson(join(kit, CONFIG_REL), kitConfig());
  git(kit, ['add', '--', CONFIG_REL]);
  git(kit, ['commit', '--quiet', '-m', 'chore: declare the hodos layer'], BENCH);

  // The map is written and committed by the teammate, before any session under
  // test opens the pair: 0040's "a map nobody in this session wrote".
  mkdirSync(join(mono, '.claude', 'hodos', 'campaigns'), { recursive: true });
  const scaffoldSha = git(kit, ['rev-parse', '--short', 'HEAD']).trim();
  writeFileSync(join(mono, MAP_REL), mapText({ scaffoldSha }));
  git(mono, ['add', '--', MAP_REL]);
  git(mono, ['commit', '--quiet', '-m', `docs: open the ${SLUG} campaign`], FOREIGN);

  const originDir = join(workspace, 'origin');
  mkdirSync(originDir, { recursive: true });
  const origins = { mono: join(originDir, 'mono.git'), kit: join(originDir, 'kit.git') };
  for (const [name, path] of Object.entries(origins)) {
    const source = name === 'mono' ? mono : kit;
    git(workspace, ['clone', '--quiet', '--bare', source, path]);
    git(source, ['remote', 'add', 'origin', path]);
  }

  seedForeignClaim(origins.mono);
  return { workspace, mono, kit, origins, slug: SLUG };
}

function main(argv) {
  if (argv.includes('--help')) {
    process.stdout.write(`${USAGE}\n`);
    return 0;
  }
  const options = { modules: true };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--no-modules') options.modules = false;
    else if (arg === '--into') {
      options.into = argv[i + 1];
      i += 1;
      if (!options.into) {
        process.stderr.write('pair-seed: --into needs a directory\n');
        return 2;
      }
    } else {
      process.stderr.write(`pair-seed: unknown argument ${arg}\n${USAGE}\n`);
      return 2;
    }
  }
  try {
    process.stdout.write(`${JSON.stringify(seedPair(options), null, 2)}\n`);
    return 0;
  } catch (error) {
    process.stderr.write(`${error instanceof Error ? error.message : String(error)}\n`);
    return 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
