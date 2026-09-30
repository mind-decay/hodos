// Fixture layouts are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { DETECTOR_IDS, activeTask, resolveTask, checkConfig, findConfig, forFiles, gitRoot, isFunctionSource, merge, positionalReach, preflight, readState } from './config.mjs';

const CONFIG = fileURLToPath(new URL('./config.mjs', import.meta.url));

function tree(files) {
  // realpath: macOS tmpdir is a symlink, and the walk compares directory paths.
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-config-')));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

const json = (value) => JSON.stringify(value, null, 2);

/** A monorepo per FORMATS.md §1: a root config and a nested one under web/. */
function monorepo() {
  return tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({
      version: 1,
      commands: { test: 'root-test', lint: 'root-lint' },
      stack: ['typescript'],
      gates: { denyDangerousGit: true, stopHookLedger: false },
    }),
    'web/.claude/hodos/config.json': json({
      commands: { test: 'web-test' },
      stack: ['react'],
      gates: { stopHookLedger: true },
    }),
    'web/src/app.ts': 'export const app = 1;\n',
  });
}

test('nested config extends root and wins key by key', () => {
  const root = monorepo();
  const found = findConfig(join(root, 'web', 'src'));

  assert.equal(found.notFound, undefined);
  assert.equal(found.config.commands.test, 'web-test');
  assert.equal(found.config.commands.lint, 'root-lint');
  assert.equal(found.config.version, 1);
  assert.equal(found.config.gates.denyDangerousGit, true);
  assert.equal(found.config.gates.stopHookLedger, true);
  // An array is a value, not a tree: the nested list replaces the root's.
  assert.deepEqual(found.config.stack, ['react']);
  assert.deepEqual(found.paths, [
    join(root, '.claude/hodos/config.json'),
    join(root, 'web/.claude/hodos/config.json'),
  ]);
  assert.equal(found.projectRoot, join(root, 'web'));
});

test('a root-only monorepo config is found from a subdirectory', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({ version: 1, commands: { test: 'root-test' } }),
    'svc/src/index.ts': '',
  });
  const found = findConfig(join(root, 'svc', 'src'));

  assert.equal(found.config.commands.test, 'root-test');
  assert.equal(found.projectRoot, root);
});

test('the walk stops at the git root', () => {
  const outer = tree({
    '.claude/hodos/config.json': json({ version: 1, commands: { test: 'outer-test' } }),
    'repo/.git/HEAD': 'ref: refs/heads/main\n',
    'repo/.claude/hodos/config.json': json({ version: 1, commands: { lint: 'repo-lint' } }),
  });
  const found = findConfig(join(outer, 'repo'));

  assert.equal(found.config.commands.lint, 'repo-lint');
  assert.equal(found.config.commands.test, undefined, 'a config above the git root is another project');
  assert.equal(found.paths.length, 1);
});

test('no config anywhere is notFound, not an error', () => {
  const root = tree({ '.git/HEAD': 'ref: refs/heads/main\n', 'src/app.ts': '' });
  assert.deepEqual(findConfig(join(root, 'src')), { notFound: true });
});

test('a config that is not JSON is skipped, never thrown', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': '{ "version": 1, oops\n',
  });
  assert.deepEqual(findConfig(root), { notFound: true });
});

test('merge leaves the inputs untouched', () => {
  const base = { commands: { test: 'a' } };
  const over = { commands: { lint: 'b' } };
  const out = merge(base, over);

  assert.deepEqual(out, { commands: { test: 'a', lint: 'b' } });
  assert.deepEqual(base, { commands: { test: 'a' } });
  assert.deepEqual(over, { commands: { lint: 'b' } });
});

test('find prints the merged config as JSON', () => {
  const root = monorepo();
  const out = execFileSync(process.execPath, [CONFIG, 'find', join(root, 'web')], { encoding: 'utf8' });
  const parsed = JSON.parse(out);

  assert.equal(parsed.commands.test, 'web-test');
  assert.equal(parsed.commands.lint, 'root-lint');
});

test('find with no config prints notFound and exits 0 — hooks rely on this', () => {
  const root = tree({ '.git/HEAD': 'ref: refs/heads/main\n' });
  const run = spawnSync(process.execPath, [CONFIG, 'find', root], { encoding: 'utf8' });

  assert.equal(run.status, 0);
  assert.deepEqual(JSON.parse(run.stdout), { notFound: true });
});

test('find defaults to the current directory', () => {
  const root = monorepo();
  const out = execFileSync(process.execPath, [CONFIG, 'find'], { cwd: join(root, 'web'), encoding: 'utf8' });

  assert.equal(JSON.parse(out).commands.test, 'web-test');
});

test('--help exits 0 with usage', () => {
  const run = spawnSync(process.execPath, [CONFIG, '--help'], { encoding: 'utf8' });

  assert.equal(run.status, 0);
  assert.match(run.stdout, /Usage: node scripts\/config\.mjs/);
});

test('an unknown command exits 2', () => {
  const run = spawnSync(process.execPath, [CONFIG, 'frobnicate'], { encoding: 'utf8' });

  assert.equal(run.status, 2);
});

// --- check: the hand-rolled schema of FORMATS.md §2 (decision from BUILD-PLAN
// Stage 8 criterion 5; a misspelled gate key left the gate off in silence).

/** The FORMATS.md §2 example, which is the shape every finding is measured against. */
function validConfig() {
  return {
    version: 1,
    language: 'en',
    stack: ['typescript', 'react'],
    commands: {
      test: 'npx vitest run',
      typecheck: 'npx tsc --noEmit',
      lint: null,
      build: 'npm run build',
      dev: { cmd: 'npm run dev', url: 'http://localhost:5173', ready: 'Local:' },
    },
    verify: {
      recipes: [
        { name: 'unit', kind: 'command', run: 'npx vitest run', when: 'always' },
        { name: 'ui', kind: 'browser', routes: ['/'], when: 'ui' },
      ],
    },
    conventions: { commit: 'conventional', branch: 'feature/{slug}' },
    models: { review: 'opus', planReview: 'opus', verify: 'sonnet', research: 'sonnet', initScan: 'sonnet' },
    autonomy: 'ask',
    gates: { denyDangerousGit: false, blockCommitOnFailedReview: false, stopHookLedger: false },
    adapters: {
      browser: 'chrome-devtools',
      docs: 'context7',
      codeIndex: null,
      design: null,
      tracker: null,
      logs: null,
      db: null,
      ci: null,
    },
    campaigns: { external: [] },
    tasks: { staleDays: 14 },
    nested: [],
    verifiedAt: '2026-08-30',
    scanSha: 'a1b2c3d',
  };
}

/** The nine operations `DESIGN.md §3.2` names for `browser`, mapped (decision 0091). */
const BROWSER_OPERATIONS = [
  'navigate',
  'stub',
  'snapshot',
  'click',
  'fill',
  'screenshot',
  'evaluate',
  'console',
  'network',
  'resize',
  'emulate',
  'audit',
]
  .map((op) => `${op}: mcp__playwright__${op}`)
  .join('\n');

/** A project whose only config is `config`. */
function project(config) {
  return tree({ '.git/HEAD': 'ref: refs/heads/main\n', '.claude/hodos/config.json': json(config) });
}

test('check passes the FORMATS.md §2 example', () => {
  const { errors, warnings } = checkConfig(validConfig());

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('check passes the webapp fixture config', () => {
  const path = fileURLToPath(new URL('../bench/fixtures/webapp/.claude/hodos/config.json', import.meta.url));
  const { errors, warnings } = checkConfig(JSON.parse(readFileSync(path, 'utf8')));

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('an unknown key inside a closed object is an error naming the nearest key', () => {
  const config = validConfig();
  config.gates.denyDangerousGits = true;
  delete config.gates.denyDangerousGit;

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'gates.denyDangerousGits');
  assert.match(errors[0].message, /unknown key/);
  assert.equal(errors[0].hint, 'denyDangerousGit');
});

test('an unknown key at the top level is a warning, because unknown fields are preserved', () => {
  const config = validConfig();
  config.futureKey = 'from a later version';

  const { errors, warnings } = checkConfig(config);

  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].path, 'futureKey');
});

test('a wrong type is an error wherever it is', () => {
  const config = validConfig();
  config.tasks.staleDays = '14';

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'tasks.staleDays');
  assert.match(errors[0].message, /number/);
});

test('a value outside an enum is an error listing the enum', () => {
  const config = validConfig();
  config.autonomy = 'yolo';

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'autonomy');
  assert.match(errors[0].message, /ask, rulings/);
});

test('an adapter name with no file under adapters/ is an error naming the nearest', () => {
  const config = validConfig();
  config.adapters.browser = 'chrome-devtoools';

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'adapters.browser');
  assert.equal(errors[0].hint, 'chrome-devtools');
});

test('a project: value resolves against the project layer, not the plugin', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/adapters/browser/playwright.md':
      'role: browser\nserver: playwright\n\n' + BROWSER_OPERATIONS,
  });
  const config = validConfig();
  config.adapters.browser = 'project:playwright';

  const { errors, warnings } = checkConfig(config, root);

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('a project: value with no file names the project directory, and a bare one names the plugin', () => {
  const root = tree({ '.git/HEAD': 'ref: refs/heads/main\n' });
  const project = validConfig();
  project.adapters.browser = 'project:playwright';
  const bare = validConfig();
  bare.adapters.browser = 'playwright';

  const projectErrors = checkConfig(project, root).errors;
  const bareErrors = checkConfig(bare, root).errors;

  assert.equal(projectErrors.length, 1);
  assert.match(
    projectErrors[0].message,
    /no \.claude\/hodos\/adapters\/browser\/playwright\.md in this project/,
  );
  assert.equal(bareErrors.length, 1);
  assert.match(bareErrors[0].message, /no adapters\/browser\/playwright\.md ships with hodos/);
  // playwright is not a misspelling of chrome-devtools, so there is no nearest.
  assert.equal(bareErrors[0].hint, null);
});

test('a project: value is a shape error when the checker was given no project root', () => {
  const config = validConfig();
  config.adapters.browser = 'project:playwright';

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /project root/);
});

test('a role outside the eight is an unknown key, not a forward-compatible extension', () => {
  const config = validConfig();
  config.adapters.email = 'gmail';

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'adapters.email');
  assert.equal(errors[0].message, 'unknown key in a closed object');
});

test('a bare value for a role hodos ships no adapter for names that role directory', () => {
  const config = validConfig();
  config.adapters.logs = 'sentry';

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'adapters.logs');
  assert.match(errors[0].message, /no adapters\/logs\/sentry\.md ships with hodos/);
});

test('an unknown key in a recipe is an error carrying the recipe index', () => {
  const config = validConfig();
  config.verify.recipes[1].rout = ['/'];

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.recipes[1].rout');
  assert.equal(errors[0].hint, 'routes');
});

test('a recipe kind outside the five is an error', () => {
  const config = validConfig();
  config.verify.recipes[0].kind = 'shell';

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.match(errors[0].message, /command, browser, http, a11y, viewport/);
});

// Decision 0095: the two kinds a project declares for the class of check a QA
// does by hand. Both are `when`-gated, so an undeclared kind costs nothing.
test('the two non-functional kinds of decision 0095 are accepted, with widths', () => {
  const config = validConfig();
  config.verify.recipes.push({ name: 'a11y', kind: 'a11y', routes: ['/'], when: 'ui' });
  config.verify.recipes.push({ name: 'widths', kind: 'viewport', routes: ['/'], widths: [360, 1280], when: 'ui' });

  const { errors, warnings } = checkConfig(config);

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

// `widths` is the whole of what makes a `viewport` recipe run: without it the
// verifier gets a recipe with nothing to iterate, and on another kind it is a
// field nothing reads. Review 1 of Stage 11b-4 found both accepted.
test('widths belongs to viewport, and to no other kind', () => {
  const missing = validConfig();
  missing.verify.recipes.push({ name: 'widths', kind: 'viewport', routes: ['/'], when: 'ui' });
  const a = checkConfig(missing);
  assert.equal(a.errors.length, 1);
  assert.match(a.errors[0].message, /widths/);

  const stray = validConfig();
  stray.verify.recipes.push({ name: 'unit2', kind: 'command', run: 'npm test', widths: [360] });
  const b = checkConfig(stray);
  assert.equal(b.errors.length, 1);
  assert.match(b.errors[0].message, /viewport/);

  // Present is not the same as usable: the recipe iterates routes × widths, so
  // an empty either side is a recipe with nothing to run (review 2).
  const empty = validConfig();
  empty.verify.recipes.push({ name: 'v', kind: 'viewport', routes: ['/'], widths: [], when: 'ui' });
  assert.match(checkConfig(empty).errors[0]?.message ?? '', /widths/);

  const routeless = validConfig();
  routeless.verify.recipes.push({ name: 'v', kind: 'viewport', widths: [360], when: 'ui' });
  assert.match(checkConfig(routeless).errors[0]?.message ?? '', /routes/);
});

test('widths is a list of numbers, and a string in it is an error', () => {
  const config = validConfig();
  config.verify.recipes.push({ name: 'widths', kind: 'viewport', routes: ['/'], widths: ['360'] });

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.recipes[2].widths');
  assert.match(errors[0].message, /array of numbers/);
});

// --- check: `verify.detectors.allow`, whose entries name a detector and a
// route glob (decision 0107). The field is one flat array of strings and one
// `split(':')` to read, so what a check has to catch is a string that says
// nothing: a route with no detector in front of it, or a detector nobody runs.

test('an allowlist entry naming a detector and a route glob is accepted', () => {
  const config = validConfig();
  config.verify.detectors = { allow: ['overflow:/marketing/*', '*:/legacy/**', 'axe:/print'] };

  const { errors, warnings } = checkConfig(config);

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('an allowlist entry with no detector in front of the route is an error naming the form', () => {
  const config = validConfig();
  config.verify.detectors = { allow: ['/marketing/*'] };

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.detectors.allow[0]');
  assert.match(errors[0].message, /<detector>:<route glob>/);
});

test('an allowlist entry naming a detector nobody runs is an error, with the nearest id', () => {
  const config = validConfig();
  config.verify.detectors = { allow: ['overflw:/marketing/*'] };

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.detectors.allow[0]');
  assert.match(errors[0].message, /overflow, clipped, overlap, focus, axe/);
  assert.equal(errors[0].hint, 'overflow');
});

test('an allowlist entry with nothing after the colon silences nothing, and is an error', () => {
  const config = validConfig();
  config.verify.detectors = { allow: ['overflow:'] };

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.detectors.allow[0]');
  assert.match(errors[0].message, /route glob/);
});

test('every entry is checked, and the path names the one at fault', () => {
  const config = validConfig();
  config.verify.detectors = { allow: ['overflow:/a', 'nope:/b', 'clipped:/c'] };

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.detectors.allow[1]');
});

test('the allowlist is a list of strings, and a key beside it is an error', () => {
  const wrong = validConfig();
  wrong.verify.detectors = { allow: 'overflow:/a' };
  const a = checkConfig(wrong);
  assert.equal(a.errors.length, 1);
  assert.equal(a.errors[0].path, 'verify.detectors.allow');
  assert.match(a.errors[0].message, /array of strings/);

  const stray = validConfig();
  stray.verify.detectors = { allow: [], thresholds: { overflowPx: 4 } };
  const b = checkConfig(stray);
  assert.equal(b.errors.length, 1);
  assert.equal(b.errors[0].path, 'verify.detectors.thresholds');
});

test('the ids the config admits are the detectors the script runs', async () => {
  const { DETECTORS } = await import('./detectors.mjs');
  assert.deepEqual([...DETECTOR_IDS], DETECTORS);
});

// --- check: `verify.recipes[].checks[]`, the pins of decision 0094. A claim
// proved once is written back as `{route, evaluate, expect}` by the finish
// phase, so the field is read on every later `ui` run and a malformed entry is
// a check nobody can run. Decision 0118 settles the predicate rule: a
// selector reaching for a class or an id **warns** and loads, because
// `config.mjs`'s errors are for a config that cannot be run at all.

test('a pin naming a route, a predicate and the value it expects is accepted', () => {
  const config = validConfig();
  config.verify.recipes[1].checks = [
    { route: '/orders', evaluate: "() => document.querySelector('[role=\"status\"]').textContent.trim()", expect: 'Total 3' },
    { route: '/orders/o-1', evaluate: '() => document.body.innerText.includes("Refund")', expect: true },
    { route: '/shift', evaluate: '() => document.querySelectorAll("[role=listitem]").length', expect: 4 },
  ];

  const { errors, warnings } = checkConfig(config);

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('checks belongs to a browser recipe, and to no other kind', () => {
  const config = validConfig();
  config.verify.recipes[0].checks = [{ route: '/', evaluate: '() => true', expect: true }];

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.recipes[0].checks');
  assert.match(errors[0].message, /browser recipe/);
  assert.match(errors[0].message, /"command"/);
});

test('a pin missing any of its three members is an error naming the member', () => {
  for (const [drop, pattern] of [['route', /route/], ['evaluate', /predicate|evaluate/], ['expect', /expect/]]) {
    const config = validConfig();
    const pin = { route: '/orders', evaluate: '() => document.body.innerText.includes("Total")', expect: true };
    delete pin[drop];
    config.verify.recipes[1].checks = [pin];

    const { errors } = checkConfig(config);

    assert.equal(errors.length, 1, `dropping ${drop} produced ${errors.length} errors`);
    assert.equal(errors[0].path, 'verify.recipes[1].checks[0]');
    assert.match(errors[0].message, pattern);
  }
});

test('a pin whose expect is null is accepted — the value seen is the claim\'s, not the schema\'s', () => {
  const config = validConfig();
  config.verify.recipes[1].checks = [{ route: '/orders', evaluate: '() => document.title', expect: null }];

  const { errors, warnings } = checkConfig(config);

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('a pin that is not an object, and a route or predicate that is not a string, are errors', () => {
  const notObject = validConfig();
  notObject.verify.recipes[1].checks = ['/orders'];
  const a = checkConfig(notObject);
  assert.equal(a.errors.length, 1);
  assert.equal(a.errors[0].path, 'verify.recipes[1].checks[0]');
  assert.match(a.errors[0].message, /object/);

  const wrongTypes = validConfig();
  wrongTypes.verify.recipes[1].checks = [{ route: 7, evaluate: '() => true', expect: true }];
  const b = checkConfig(wrongTypes);
  assert.equal(b.errors.length, 1);
  assert.equal(b.errors[0].path, 'verify.recipes[1].checks[0].route');
  assert.match(b.errors[0].message, /string/);

  const stray = validConfig();
  stray.verify.recipes[1].checks = [{ route: '/', evaluate: '() => true', expect: true, width: 360 }];
  const c = checkConfig(stray);
  assert.equal(c.errors.length, 1);
  assert.equal(c.errors[0].path, 'verify.recipes[1].checks[0].width');
  assert.match(c.errors[0].message, /unknown key/);
});

test('checks is an array, and one object where a list belongs is an error', () => {
  const config = validConfig();
  config.verify.recipes[1].checks = { route: '/', evaluate: '() => true', expect: true };

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.recipes[1].checks');
  assert.match(errors[0].message, /array/);
});

// Decision 0118. `[role="alert"]` is a selector that satisfies 0094's rule and
// `.summary-total` is the brittleness the rule is about, so the check is on
// the class and the id and not on the call.
test('a predicate reaching for a class or an id warns, names the form, and loads', () => {
  const cases = [
    ["() => document.querySelector('.summary-total').textContent", '.summary-total'],
    ['() => document.querySelector("#total").textContent', '#total'],
    ['() => document.getElementsByClassName("row").length', 'getElementsByClassName'],
    ['() => document.getElementById("total").textContent', 'getElementById'],
  ];
  for (const [evaluate, form] of cases) {
    const config = validConfig();
    config.verify.recipes[1].checks = [{ route: '/orders', evaluate, expect: 'Total 3' }];

    const { errors, warnings } = checkConfig(config);

    assert.deepEqual(errors, [], `${evaluate} produced an error`);
    assert.equal(warnings.length, 1, `${evaluate} produced ${warnings.length} warnings`);
    assert.equal(warnings[0].path, 'verify.recipes[1].checks[0].evaluate');
    assert.match(warnings[0].message, /role|text/);
    assert.ok(warnings[0].message.includes(form), `the warning does not name ${form}`);
  }
});

test('a predicate over a role, a label or text warns about nothing', () => {
  for (const evaluate of [
    '() => document.querySelector(\'[role="status"]\').textContent.trim()',
    "() => document.querySelector('[aria-label=\"Total\"]').textContent",
    '() => document.body.innerText.includes("Total 3")',
    '() => document.querySelectorAll("li[role=listitem]").length',
    // A dot inside a word is not a class, which is what the compound anchor
    // in `brittleSelector` is for: text is where a pin is supposed to look.
    '() => document.body.innerText.includes("Imported from orders.csv")',
  ]) {
    const config = validConfig();
    config.verify.recipes[1].checks = [{ route: '/orders', evaluate, expect: 'x' }];

    const { errors, warnings } = checkConfig(config);

    assert.deepEqual(errors, [], `${evaluate} produced an error`);
    assert.deepEqual(warnings, [], `${evaluate} produced a warning`);
  }
});

// Decision 0129. There are two ways a predicate reaches an element: a query,
// or a walk from something already queried. The walk is what an inserted
// element breaks, which is a smaller change than renaming a class.
test("a predicate that reaches by position warns, names the form, and loads", () => {
  const cases = [
    ["() => document.querySelector(\"h1\").nextElementSibling.textContent", "nextElementSibling"],
    ["() => document.querySelector(\"h1\").previousElementSibling.textContent", "previousElementSibling"],
    ["() => document.querySelector(\"nav\").parentElement.textContent", "parentElement"],
    ["() => document.querySelector(\"nav\").firstElementChild.textContent", "firstElementChild"],
    ["() => document.querySelector(\"nav\").children[1].textContent", "children["],
    ["() => document.querySelector(\"li:nth-child(2)\").textContent", ":nth-child"],
  ];
  for (const [evaluate, form] of cases) {
    const config = validConfig();
    config.verify.recipes[1].checks = [{ route: "/orders", evaluate, expect: "Total 3" }];

    const { errors, warnings } = checkConfig(config);

    assert.deepEqual(errors, [], evaluate + " produced an error");
    assert.equal(warnings.length, 1, evaluate + " produced " + warnings.length + " warnings");
    assert.equal(warnings[0].path, "verify.recipes[1].checks[0].evaluate");
    assert.ok(warnings[0].message.includes(form), "the warning does not name " + form);
  }
});

test("positionalReach reads the walk out of a predicate and nothing else", () => {
  assert.equal(positionalReach("() => a.nextElementSibling"), "nextElementSibling");
  assert.equal(positionalReach("() => document.querySelector(\"[role=status]\").textContent"), null);
  // A word that merely contains one of the forms is not a walk: the property
  // is read where a member access reaches it, never inside an identifier.
  assert.equal(positionalReach("() => myParentElementCount"), null);
  // The boundary, not just the dot: a property whose name starts with one of
  // the forms reaches nothing by position.
  assert.equal(positionalReach("() => a.parentElementId"), null);
  assert.equal(positionalReach(42), null);
});

// Decision 0130. FORMATS.md maps the field to evaluate_script {function}, so a
// bare expression is a pin the adapter cannot run: it warns, and the run wraps
// it, because a config that loads and fails later is 0118's own reasoning.
test("an evaluate that is not a function warns, names the shape, and loads", () => {
  const config = validConfig();
  config.verify.recipes[1].checks = [
    { route: "/orders", evaluate: "document.querySelector(\"[role=status]\").textContent", expect: "Total 3" },
  ];

  const { errors, warnings } = checkConfig(config);

  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].path, "verify.recipes[1].checks[0].evaluate");
  assert.match(warnings[0].message, /function/);
});

test("isFunctionSource takes every shape a predicate is written in", () => {
  for (const source of [
    "() => document.title",
    "()=>document.title",
    "(a) => a.textContent",
    "a => a.textContent",
    "async () => document.title",
    "function () { return document.title; }",
    "async function () { return document.title; }",
    "  () => document.title  ",
  ]) assert.equal(isFunctionSource(source), true, source + " was not read as a function");

  for (const source of [
    "document.title",
    "document.querySelector(\"a\").textContent",
    "[...document.querySelectorAll(\"a\")].map(a => a.textContent)",
    "(document.title)",
    "",
    42,
  ]) assert.equal(isFunctionSource(source), false, String(source) + " was read as a function");
});

// --- check: the environment stack of decision 0074. The keys sit under
// `verify` beside `recipes`; a project's layer names are its own, so the two
// maps are open by key and closed inside each entry.

/** Decision 0074's shape, with neutral names: the config every finding below mutates. */
function withStack(config = validConfig()) {
  config.verify.profile = 'local';
  config.verify.profiles = {
    local: { layers: ['infra', 'hosts', 'backend', 'spa'] },
    stand: { layers: ['spa-stand'] },
  };
  config.verify.layers = {
    infra: {
      cwd: '../infra',
      up: './up.sh',
      stop: './stop.sh',
      timeout: 600,
      check: [
        { kind: 'tcp', target: 'localhost:5432' },
        { kind: 'http', target: 'http://localhost/health', expect: 200 },
      ],
      access: { needs: ['Bash(sh ../infra/*)'], grant: 'permissions', grantedAt: '2026-09-05' },
    },
    hosts: {
      up: '../infra/set-hosts.sh',
      check: [{ kind: 'cmd', run: 'grep -q app.local /etc/hosts' }],
      access: { needs: ['sudo: writes /etc/hosts'], grant: 'one-time', grantedAt: null },
    },
    backend: {
      up: 'sh cli/pre-up.sh && sh cli/up-web.sh',
      timeout: 300,
      check: [{ kind: 'tcp', target: 'localhost:46222' }],
    },
    spa: { up: 'npm run dev:local', ready: 'Local:', url: 'http://localhost:5173' },
    'spa-stand': { up: 'npm run dev16', ready: 'Local:', url: 'http://localhost:5173' },
  };
  return config;
}

test('check passes decision 0074 four-layer stack', () => {
  const { errors, warnings } = checkConfig(withStack());

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('an unknown key inside a layer is an error naming the nearest', () => {
  const config = withStack();
  config.verify.layers.spa.reeady = 'Local:';
  delete config.verify.layers.spa.ready;

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.layers.spa.reeady');
  assert.equal(errors[0].hint, 'ready');
});

test('a check kind outside the three is an error listing them', () => {
  const config = withStack();
  config.verify.layers.infra.check[0].kind = 'ftp';

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.layers.infra.check[0].kind');
  assert.match(errors[0].message, /tcp, cmd, http/);
});

test('a grant outside the two is an error naming both', () => {
  const config = withStack();
  config.verify.layers.hosts.access.grant = 'sometimes';

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.layers.hosts.access.grant');
  assert.match(errors[0].message, /permissions, one-time/);
});

test('grantedAt is a date or null, and never a boolean', () => {
  const nulled = withStack();
  nulled.verify.layers.infra.access.grantedAt = null;
  assert.deepEqual(checkConfig(nulled).errors, []);

  const wrong = withStack();
  wrong.verify.layers.infra.access.grantedAt = true;
  assert.equal(checkConfig(wrong).errors[0].path, 'verify.layers.infra.access.grantedAt');
});

test('a profile naming a layer that does not exist is an error naming both', () => {
  const config = withStack();
  config.verify.profiles.local.layers = ['infra', 'nope'];

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.profiles.local.layers[1]');
  assert.match(errors[0].message, /no such layer/);
});

test('a profile naming a layer whose name is a near miss carries the nearest', () => {
  const config = withStack();
  config.verify.profiles.stand.layers = ['spa-stnd'];

  const { errors } = checkConfig(config);

  assert.equal(errors[0].hint, 'spa-stand');
});

test('the active profile names one of the profiles, or it is an error', () => {
  const config = withStack();
  config.verify.profile = 'locall';

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.profile');
  assert.equal(errors[0].hint, 'local');
});

test('a profile named with no profiles declared at all is an error, not a silent skip', () => {
  const config = validConfig();
  config.verify.profile = 'local';

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.profile');
});

test('a layer map that is not an object is an error, not a walk over its characters', () => {
  const config = withStack();
  config.verify.layers = 'infra';

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.layers');
});

test('models.preparer is a role like the other five', () => {
  const ok = validConfig();
  ok.models.preparer = 'sonnet';
  assert.deepEqual(checkConfig(ok).errors, []);

  const typo = validConfig();
  typo.models.preparr = 'sonnet';
  const { errors } = checkConfig(typo);
  assert.equal(errors[0].path, 'models.preparr');
  assert.equal(errors[0].hint, 'preparer');
});

test('conventions.commit accepts custom:<pattern> and rejects anything else', () => {
  const ok = validConfig();
  ok.conventions.commit = 'custom:[A-Z]+-\\d+ .*';
  assert.deepEqual(checkConfig(ok).errors, []);

  const bad = validConfig();
  bad.conventions.commit = 'whatever';
  assert.equal(checkConfig(bad).errors[0].path, 'conventions.commit');
});

test('check exits 1 on an error and names the file', () => {
  const config = validConfig();
  config.gates.denyDangerousGits = true;
  const run = spawnSync(process.execPath, [CONFIG, 'check', project(config)], { encoding: 'utf8' });

  assert.equal(run.status, 1);
  assert.match(run.stdout, /gates\.denyDangerousGits/);
  assert.match(run.stdout, /denyDangerousGit/);
});

test('check exits 0 on warnings alone', () => {
  const config = validConfig();
  config.futureKey = 1;
  const run = spawnSync(process.execPath, [CONFIG, 'check', project(config)], { encoding: 'utf8' });

  assert.equal(run.status, 0);
  assert.match(run.stdout, /warning/);
});

test('check exits 0 and says so on a clean config', () => {
  const run = spawnSync(process.execPath, [CONFIG, 'check', project(validConfig())], { encoding: 'utf8' });

  assert.equal(run.status, 0);
  assert.match(run.stdout, /config: ok/);
});

test('check with no config anywhere prints notFound and exits 0', () => {
  const root = tree({ '.git/HEAD': 'ref: refs/heads/main\n' });
  const run = spawnSync(process.execPath, [CONFIG, 'check', root], { encoding: 'utf8' });

  assert.equal(run.status, 0);
  assert.match(run.stdout, /notFound/);
});

// --- decision 0047: one resolution of "which task is this session on", shared
// by the four scripts that used to re-implement it.

/** A project with two tasks, `active` naming the second. */
function twoTasks() {
  return tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({ version: 1 }),
    '.claude/hodos/active': 'users-export\n',
    '.claude/hodos/sessions/sess-a': 'orders-summary\n',
    '.claude/hodos/tasks/orders-summary/state.json': json({ slug: 'orders-summary', phase: 'execute' }),
    '.claude/hodos/tasks/users-export/state.json': json({ slug: 'users-export', phase: 'review' }),
  });
}

test('activeTask prefers the session pointer over active', () => {
  assert.equal(activeTask(twoTasks(), 'sess-a'), 'orders-summary');
});

// Decision 0171: `active` is the path of a claim made with no id, so it is
// read only while no session holds a pointer. Otherwise a session that claimed
// nothing — a status terminal, plain work beside a running task — was handed
// whichever task claimed last, and its Stop and its commits were gated on it.
test('activeTask gives a session with no pointer nothing while another session holds one', () => {
  assert.equal(activeTask(twoTasks(), 'sess-unknown'), null);
});

test('activeTask gives a caller with no id nothing while a session holds a pointer', () => {
  assert.equal(activeTask(twoTasks(), null), null);
});

test('activeTask falls back to active while no session holds a pointer', () => {
  const files = {
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({ version: 1 }),
    '.claude/hodos/active': 'users-export\n',
  };
  assert.equal(activeTask(tree(files), null), 'users-export');
  assert.equal(activeTask(tree(files), 'sess-x'), 'users-export');
  // A pointer being written is `<id>.<pid>.tmp` for an instant: not a pointer.
  const writing = tree({ ...files, '.claude/hodos/sessions/sess-a.4242.tmp': 'orders-summary\n' });
  assert.equal(activeTask(writing, null), 'users-export');
});

test('resolveTask says how many other sessions it declined for', () => {
  assert.deepEqual(resolveTask(twoTasks(), 'sess-unknown'), { slug: null, others: 1 });
  assert.deepEqual(resolveTask(twoTasks(), 'sess-a'), { slug: 'orders-summary', others: 0 });
});

test('activeTask is null when neither pointer exists', () => {
  const root = tree({ '.git/HEAD': 'ref: refs/heads/main\n', '.claude/hodos/config.json': json({ version: 1 }) });

  assert.equal(activeTask(root, 'sess-a'), null);
});

test('readState parses a task state and returns null for what it cannot', () => {
  const root = twoTasks();

  assert.equal(readState(root, 'orders-summary').phase, 'execute');
  assert.equal(readState(root, 'no-such-task'), null);
});

// --- preflight (decision 0058)
//
// The check exists for the two failures that are still reachable once the
// kernel has started: a node below the floor, and a node the login shell
// found in a version manager's directory where the hooks — spawned without
// that shell — will not (PLATFORM-NOTES.md fact 42).

test('preflight is ok on a node at or above the floor, outside a version manager', () => {
  const out = preflight({ version: 'v20.11.0', execPath: '/usr/local/bin/node', env: {}, home: '/Users/dev', floor: 18 });

  assert.deepEqual(out.errors, []);
  assert.deepEqual(out.warnings, []);
  assert.equal(out.version, 'v20.11.0');
});

test('preflight errors on a node below the floor, naming both numbers', () => {
  const out = preflight({ version: 'v16.20.2', execPath: '/usr/local/bin/node', env: {}, home: '/Users/dev', floor: 18 });

  assert.equal(out.errors.length, 1);
  assert.match(out.errors[0].message, /v16\.20\.2/);
  assert.match(out.errors[0].message, /18/);
});

test('preflight warns when node lives under $NVM_DIR', () => {
  const out = preflight({
    version: 'v20.11.0',
    execPath: '/Users/dev/.nvm/versions/node/v20.11.0/bin/node',
    env: { NVM_DIR: '/Users/dev/.nvm' },
    home: '/Users/dev',
    floor: 18,
  });

  assert.deepEqual(out.errors, []);
  assert.equal(out.warnings.length, 1);
  assert.match(out.warnings[0].message, /\/Users\/dev\/\.nvm/);
  assert.match(out.warnings[0].message, /hook/);
});

test('preflight warns on a version manager directory with no env var set', () => {
  const home = '/Users/dev';
  const managed = [
    `${home}/.nvm/versions/node/v20.11.0/bin/node`,
    `${home}/.fnm/node-versions/v20.11.0/installation/bin/node`,
    `${home}/.local/share/fnm/node-versions/v20.11.0/installation/bin/node`,
    `${home}/.asdf/installs/nodejs/20.11.0/bin/node`,
    `${home}/.asdf/shims/node`,
    `${home}/.volta/tools/image/node/20.11.0/bin/node`,
  ];

  for (const execPath of managed) {
    const out = preflight({ version: 'v20.11.0', execPath, env: {}, home, floor: 18 });
    assert.equal(out.warnings.length, 1, execPath);
  }
});

// A path is a path whichever separator the platform writes it with: the
// runner's `node` lives under `C:\\hostedtoolcache`, and the same comparison
// has to hold there. CI's Windows job failed both cases above because `join`
// built `C:\\Users\\dev\\.nvm` and the execPath was compared against it with `/`.
test('preflight reads a version manager directory written with either separator', () => {
  const home = 'C:\\Users\\dev';
  const execPath = 'C:\\Users\\dev\\.nvm\\versions\\node\\v20.11.0\\bin\\node.exe';

  const byEnv = preflight({ version: 'v20.11.0', execPath, env: { NVM_DIR: 'C:\\Users\\dev\\.nvm' }, home, floor: 18 });
  assert.equal(byEnv.warnings.length, 1);

  const byHome = preflight({ version: 'v20.11.0', execPath, env: {}, home, floor: 18 });
  assert.equal(byHome.warnings.length, 1);

  const elsewhere = preflight({ version: 'v20.11.0', execPath: 'C:\\Program Files\\nodejs\\node.exe', env: {}, home, floor: 18 });
  assert.deepEqual(elsewhere.warnings, []);
});

test('preflight does not warn on a node that merely has a version manager installed', () => {
  const out = preflight({
    version: 'v20.11.0',
    execPath: '/opt/homebrew/bin/node',
    env: { NVM_DIR: '/Users/dev/.nvm' },
    home: '/Users/dev',
    floor: 18,
  });

  assert.deepEqual(out.warnings, []);
});

test('preflight reads the floor from the plugin package.json when none is given', () => {
  const out = preflight({ version: 'v20.11.0', execPath: '/usr/local/bin/node', env: {}, home: '/Users/dev' });

  assert.equal(out.floor, 18);
});

test('config.mjs preflight prints the version and its path and exits 0 here', () => {
  const run = spawnSync(process.execPath, [CONFIG, 'preflight'], { encoding: 'utf8' });

  assert.equal(run.status, 0);
  assert.match(run.stdout, /^preflight: /);
  assert.match(run.stdout, new RegExp(process.version.replace(/\./g, '\\.')));
});

test('config.mjs preflight needs no config and says so in --help', () => {
  const root = tree({ '.git/HEAD': 'ref: refs/heads/main\n' });
  const run = spawnSync(process.execPath, [CONFIG, 'preflight', root], { encoding: 'utf8' });

  assert.equal(run.status, 0);
  assert.doesNotMatch(run.stdout, /notFound/);

  const help = spawnSync(process.execPath, [CONFIG, '--help'], { encoding: 'utf8' });
  assert.match(help.stdout, /preflight/);
});

test('preflight does not warn on a directory that merely begins with a manager name', () => {
  // `.nvm-backup` starts with the same eight characters as `.nvm`. A prefix
  // test without the separator names a directory the developer does not use,
  // which is the false positive decision 0058 weighs as its cost if wrong.
  const both = [
    { execPath: '/Users/dev/.nvm-backup/bin/node', env: {} },
    { execPath: '/Users/dev/.nvm-backup/bin/node', env: { NVM_DIR: '/Users/dev/.nvm' } },
  ];

  for (const { execPath, env } of both) {
    const out = preflight({ version: 'v20.11.0', execPath, env, home: '/Users/dev', floor: 18 });
    assert.deepEqual(out.warnings, [], execPath);
  }
});

test('config.mjs preflight exits 1 on a node below the floor, naming the prerequisite', () => {
  // The stop of SKILL.md's phase −1 is an exit code, and no assertion above
  // reaches it: the floor comes from the plugin's own package.json, so the
  // branch is run by putting the script beside one that declares a floor this
  // machine cannot meet.
  const root = tree({
    'package.json': `${json({ name: 'hodos-floor-fixture', engines: { node: '>=99' } })}\n`,
    'scripts/config.mjs': readFileSync(CONFIG, 'utf8'),
  });

  const run = spawnSync(process.execPath, [join(root, 'scripts', 'config.mjs'), 'preflight'], { encoding: 'utf8' });

  assert.equal(run.status, 1);
  assert.match(run.stdout, /^preflight: 1 error/m);
  assert.match(run.stdout, /error node: .* is below the floor node >=99 that hodos declares/);
});

// ---------------------------------------------------------------- decision 0065

test('review.generated and review.maxBytes are legal, and a stray key under review is not', () => {
  const withReview = { ...validConfig(), review: { generated: ['*.snap', 'dist/'], maxBytes: 500000 } };

  assert.deepEqual(checkConfig(withReview).errors, []);

  const typo = { ...validConfig(), review: { generatd: ['*.snap'] } };
  const { errors } = checkConfig(typo);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'review.generatd');
});

test('review.generated takes a list of globs, not a string', () => {
  const { errors } = checkConfig({ ...validConfig(), review: { generated: '*.snap' } });

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'review.generated');
});

// --- gitRoot: the anchor of decision 0075
//
// `FORMATS.md §2` states it once: a path a config or a script hands to a
// command resolves against the git root. `ancestors()` already stops there and
// threw the directory away; `review-package.mjs` needs it by name, and so does
// `verify.layers[].cwd` at Stage 11b-2.

test('gitRoot is the directory holding .git, from any depth', () => {
  const root = monorepo();

  assert.equal(gitRoot(root), root);
  assert.equal(gitRoot(join(root, 'web')), root);
  assert.equal(gitRoot(join(root, 'web', 'src')), root);
});

test('gitRoot takes the innermost .git of nested repositories', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    'vendor/kit/.git/HEAD': 'ref: refs/heads/main\n',
    'vendor/kit/src/index.ts': 'export const kit = 1;\n',
  });

  assert.equal(gitRoot(join(root, 'vendor', 'kit', 'src')), join(root, 'vendor', 'kit'));
  assert.equal(gitRoot(join(root, 'vendor')), root);
});

test('gitRoot is null outside a repository', () => {
  const root = tree({ 'src/app.ts': 'export const app = 1;\n' });

  assert.equal(gitRoot(join(root, 'src')), null);
});

test('gitRoot accepts a .git file, as a worktree and a submodule have', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    'wt/.git': 'gitdir: /elsewhere/.git/worktrees/wt\n',
    'wt/src/app.ts': 'export const app = 1;\n',
  });

  assert.equal(gitRoot(join(root, 'wt', 'src')), join(root, 'wt'));
});

// --- for-files: the configs that answer for a diff (decision 0076)
//
// `find` merges from cwd upward, so a session started in `web/` runs `web`'s
// test command over a change that also touched `svc`. The set that answers for
// a task is derived from the diff instead: one entry per config whose
// projectRoot contains at least one changed path.

function forFilesRepo() {
  return tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({ version: 1, commands: { test: 'root-test' }, nested: ['web', 'svc'] }),
    'web/.claude/hodos/config.json': json({ commands: { test: 'web-test' } }),
    'svc/.claude/hodos/config.json': json({ commands: { test: 'svc-test' } }),
    'web/src/a.ts': 'export const a = 1;\n',
    'svc/src/b.ts': 'export const b = 1;\n',
    'docs/readme.md': '# docs\n',
    'webapp/src/c.ts': 'export const c = 1;\n',
  });
}

test('for-files returns one entry per config the paths belong to, root first', () => {
  const root = forFilesRepo();

  // Two orders were possible — the order the paths were named in, and one the
  // input cannot move. The second is what a byte-identical package needs.
  const out = forFiles(['web/src/a.ts', 'svc/src/b.ts'], root);

  assert.equal(out.notFound, undefined);
  assert.deepEqual(
    out.projects.map((p) => p.projectRoot),
    [join(root, 'svc'), join(root, 'web')],
  );
  assert.deepEqual(out.projects[1].files, ['web/src/a.ts']);
  assert.equal(out.projects[1].config.commands.test, 'web-test');
  // The nested config extends the root's, exactly as `find` merges it.
  assert.equal(out.projects[1].config.version, 1);
  assert.equal(out.projects[0].config.commands.test, 'svc-test');
  assert.deepEqual(forFiles(['svc/src/b.ts', 'web/src/a.ts'], root).projects.map((p) => p.dir), ['svc', 'web']);
});

test('for-files gives a path in no subproject to the root config', () => {
  const root = forFilesRepo();

  const out = forFiles(['docs/readme.md', 'web/src/a.ts'], root);

  assert.deepEqual(
    out.projects.map((p) => p.projectRoot),
    [root, join(root, 'web')],
  );
  assert.deepEqual(out.projects[0].files, ['docs/readme.md']);
  assert.equal(out.projects[0].config.commands.test, 'root-test');
});

test('for-files matches on a path boundary, so webapp/ is not web/', () => {
  const root = forFilesRepo();

  const out = forFiles(['webapp/src/c.ts'], root);

  assert.deepEqual(
    out.projects.map((p) => p.projectRoot),
    [root],
  );
});

test('for-files returns one entry when the project has one config', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': json({ version: 1, commands: { test: 'npm test' } }),
    'src/app.ts': 'export const app = 1;\n',
  });

  const out = forFiles(['src/app.ts'], root);

  assert.equal(out.projects.length, 1);
  assert.equal(out.projects[0].projectRoot, root);
  assert.deepEqual(out.projects[0].files, ['src/app.ts']);
});

test('for-files reports a path outside the repository, naming it', () => {
  const root = forFilesRepo();

  const out = forFiles(['../elsewhere/x.ts'], root);

  assert.match(out.error, /\.\.\/elsewhere\/x\.ts/);
  assert.equal(out.projects, undefined);
});

test('for-files keeps a deleted file, whose directory is gone', () => {
  const root = forFilesRepo();

  const out = forFiles(['web/gone/deep/a.ts'], root);

  assert.deepEqual(
    out.projects.map((p) => p.projectRoot),
    [join(root, 'web')],
  );
});

test('for-files with no config anywhere is notFound', () => {
  const root = tree({ '.git/HEAD': 'ref: refs/heads/main\n', 'src/app.ts': 'export const app = 1;\n' });

  assert.equal(forFiles(['src/app.ts'], root).notFound, true);
});

test('for-files on the command line prints the projects as JSON', () => {
  const root = forFilesRepo();

  const out = spawnSync(process.execPath, [CONFIG, 'for-files', 'web/src/a.ts', 'svc/src/b.ts'], {
    cwd: root,
    encoding: 'utf8',
  });

  assert.equal(out.status, 0);
  const parsed = JSON.parse(out.stdout);
  assert.deepEqual(
    parsed.projects.map((p) => p.dir),
    ['svc', 'web'],
  );
  assert.equal(parsed.projects[1].projectRoot, join(root, 'web'));
});

test('for-files with no paths exits 2 with the usage', () => {
  const root = forFilesRepo();

  const out = spawnSync(process.execPath, [CONFIG, 'for-files'], { cwd: root, encoding: 'utf8' });

  assert.equal(out.status, 2);
  assert.match(out.stderr, /for-files/);
});

// --- tasks.track is retired (decision 0079)
//
// The key validated as a boolean and nothing read it: `init` gitignores
// `tasks/` unconditionally. It is deleted from the schema, and a config written
// against 0.1's predecessor still loads — deleting a key is not a licence to
// break the file every project commits.

test('a retired key is a warning naming it, and the config still loads', () => {
  const config = validConfig();
  config.tasks.track = false;

  const { errors, warnings } = checkConfig(config);

  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].path, 'tasks.track');
  assert.match(warnings[0].message, /retired/);
});

test('the FORMATS.md §2 example carries no retired key', () => {
  const { errors, warnings } = checkConfig(validConfig());

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('an unknown key inside tasks is still an error with the nearest key', () => {
  const config = validConfig();
  config.tasks.staleDay = 14;

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'tasks.staleDay');
  assert.equal(errors[0].hint, 'staleDays');
});

test('check exits 0 on a config whose only finding is a retired key', () => {
  const root = project({ ...validConfig(), tasks: { track: true, staleDays: 14 } });

  const out = spawnSync(process.execPath, [CONFIG, 'check'], { cwd: root, encoding: 'utf8' });

  assert.equal(out.status, 0);
  assert.match(out.stdout, /warning tasks\.track/);
  assert.match(out.stdout, /retired/);
});

test('a project adapter that omits one of its role operations fails the check by name', () => {
  // Decision 0091, binding (i), and its own title: an adapter that omits an
  // operation fails `config.mjs check` by name. `lint --project` keeps the
  // warning; this surface is the one the decision names, and it is where
  // `/hodos:adapter` — the skill that writes the file — is told.
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/adapters/codeIndex/ariadne.md':
      'role: codeIndex\nserver: ariadne\n\nfindReferences: mcp__ariadne__find_references\noutline: mcp__ariadne__outline\nreadSymbol: mcp__ariadne__read_symbol\nblastRadius: mcp__ariadne__blast_radius\n',
  });
  const config = validConfig();
  config.adapters.codeIndex = 'project:ariadne';

  const { errors } = checkConfig(config, root);

  assert.equal(errors.length, 1, JSON.stringify(errors));
  assert.equal(errors[0].path, 'adapters.codeIndex');
  assert.match(errors[0].message, /codeIndex names affectedTests and this file maps nothing to it/);
});

test('a project browser adapter without the operations decision 0095 adds fails the check', () => {
  // The two kinds are read through `audit`, `resize` and `emulate`; a project
  // adapter that declares the nine it always had now maps fewer than its role
  // names, and the phase that calls the missing one gets nothing (DESIGN.md §3.2).
  const nine = ['navigate', 'stub', 'snapshot', 'click', 'fill', 'screenshot', 'evaluate', 'console', 'network'];
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/adapters/browser/devtools.md':
      `role: browser\nserver: devtools\n\n${nine.map((op) => `${op}: mcp__devtools__${op}`).join('\n')}\n`,
  });
  const config = validConfig();
  config.adapters.browser = 'project:devtools';

  const { errors } = checkConfig(config, root);

  assert.deepEqual(errors.map((e) => e.path), ['adapters.browser', 'adapters.browser', 'adapters.browser']);
  assert.match(errors.map((e) => e.message).join(' '), /browser names resize/);
  assert.match(errors.map((e) => e.message).join(' '), /browser names emulate/);
  assert.match(errors.map((e) => e.message).join(' '), /browser names audit/);
});

test('a project adapter that maps every operation of its role passes', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/adapters/codeIndex/ariadne.md':
      'role: codeIndex\nserver: ariadne\n\nfindReferences: mcp__ariadne__find_references\noutline: mcp__ariadne__outline\nreadSymbol: mcp__ariadne__read_symbol\nblastRadius: mcp__ariadne__blast_radius\naffectedTests: mcp__ariadne__affected_tests\n',
  });
  const config = validConfig();
  config.adapters.codeIndex = 'project:ariadne';

  const { errors, warnings } = checkConfig(config, root);

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('an operation named under gotchas: is prose, not a mapping', () => {
  // Review 2 ran this against the two readers and got two answers: `check`
  // counted the line declared, `lint --project` did not. One reader now.
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/adapters/codeIndex/ariadne.md':
      'role: codeIndex\nserver: ariadne\n\nfindReferences: mcp__ariadne__find_references\noutline: mcp__ariadne__outline\nreadSymbol: mcp__ariadne__read_symbol\nblastRadius: mcp__ariadne__blast_radius\n\ngotchas:\n- the index is stale until the watcher catches up\naffectedTests: mcp__ariadne__affected_tests\n',
  });
  const config = validConfig();
  config.adapters.codeIndex = 'project:ariadne';

  const { errors } = checkConfig(config, root);

  assert.equal(errors.length, 1, JSON.stringify(errors));
  assert.match(errors[0].message, /codeIndex names affectedTests/);
});

test('a half-written operation line maps nothing', () => {
  // `mcp__ariadne` with no tool after it calls nothing. The loose reader took
  // the prefix; the shared one takes the whole shape of `FORMATS.md §13`.
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/adapters/codeIndex/ariadne.md':
      'role: codeIndex\nserver: ariadne\n\nfindReferences: mcp__ariadne__find_references\noutline: mcp__ariadne__outline\nreadSymbol: mcp__ariadne__read_symbol\nblastRadius: mcp__ariadne__blast_radius\naffectedTests: mcp__ariadne\n',
  });
  const config = validConfig();
  config.adapters.codeIndex = 'project:ariadne';

  const { errors } = checkConfig(config, root);

  assert.equal(errors.length, 1, JSON.stringify(errors));
  assert.match(errors[0].message, /codeIndex names affectedTests/);
});

// `verify.recipes[].unrun` — decision 0148. A recipe whose command has never
// been observed green by the layer says so, and `verifiedAt` stops speaking
// for it. A warning and not an error: it records a developer's decision on a
// command that cannot run in a session, not a mistake.

test('an unrun recipe is a warning naming it, and says verifiedAt does not cover it', () => {
  const config = validConfig();
  config.verify.recipes.push({ name: 'perf', kind: 'command', run: 'cargo nextest run -p e2e', when: 'perf', unrun: true });

  const { errors, warnings } = checkConfig(config);

  assert.deepEqual(errors, []);
  assert.equal(warnings.length, 1);
  assert.equal(warnings[0].path, 'verify.recipes[2].unrun');
  assert.match(warnings[0].message, /perf/);
  assert.match(warnings[0].message, /verifiedAt/);
});

test('unrun false, and an absent unrun, are silent', () => {
  const config = validConfig();
  config.verify.recipes[0].unrun = false;

  const { errors, warnings } = checkConfig(config);

  assert.deepEqual(errors, []);
  assert.deepEqual(warnings, []);
});

test('unrun is a boolean: a string there is an error', () => {
  const config = validConfig();
  config.verify.recipes[0].unrun = 'yes';

  const { errors } = checkConfig(config);

  assert.equal(errors.length, 1);
  assert.equal(errors[0].path, 'verify.recipes[0].unrun');
});
