import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { after, describe, it } from 'node:test';
import { fileURLToPath } from 'node:url';

import { copyFixture, fixtureNames } from './fixture-copy.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const REPO = join(HERE, '..', '..');
const SCRIPT = join(HERE, 'fixture-copy.mjs');
const FIXTURES = join(REPO, 'bench', 'fixtures');

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

const git = (cwd, ...args) => execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();

const run = (args, options = {}) =>
  execFileSync(process.execPath, [SCRIPT, ...args], { encoding: 'utf8', ...options });

/** A fixtures root the tests own, so the checked-in fixtures are never touched. */
function syntheticRoot() {
  const root = temp('hodos-fixtures-');
  syntheticProbe(root);
  syntheticWorkspaces(root);
  syntheticAuthored(root);
  return root;
}

/** A fixture whose CLAUDE.md is the developer's, with hodos's block inside it. */
function syntheticAuthored(root) {
  const authored = join(root, 'authored');
  mkdirSync(join(authored, 'src'), { recursive: true });
  mkdirSync(join(authored, 'test'), { recursive: true });
  writeFileSync(join(authored, 'package.json'), '{ "name": "authored", "private": true }\n');
  writeFileSync(join(authored, '.gitignore'), 'node_modules\n.claude/hodos/tasks/\n');
  writeFileSync(join(authored, 'src', 'index.js'), 'export const two = 2;\n');
  writeFileSync(join(authored, 'test', 'index.test.js'), 'import "../src/index.js";\n');
  writeFileSync(
    join(authored, 'CLAUDE.md'),
    '# authored\n\nThe developer wrote this line.\n\n<!-- hodos:begin -->\n\n## Map\n\nhodos wrote this.\n\n<!-- hodos:end -->\n',
  );
}

function syntheticProbe(root) {
  const probe = join(root, 'probe');
  mkdirSync(join(probe, 'src'), { recursive: true });
  mkdirSync(join(probe, 'test'), { recursive: true });
  mkdirSync(join(probe, '.claude', 'hodos'), { recursive: true });
  mkdirSync(join(probe, 'dist'), { recursive: true });
  mkdirSync(join(probe, 'node_modules', 'left-pad'), { recursive: true });
  writeFileSync(join(probe, 'package.json'), '{ "name": "probe", "private": true }\n');
  writeFileSync(
    join(probe, '.gitignore'),
    'node_modules\ndist\n*.tsbuildinfo\n.claude/hodos/tasks/\n.claude/hodos/active\n.claude/hodos/sessions/\n.claude/hodos/history.jsonl\n.claude/settings.local.json\n',
  );
  writeFileSync(join(probe, 'CLAUDE.md'), '# probe\n\nThe map init wrote.\n');
  writeFileSync(join(probe, 'src', 'index.js'), 'export const one = 1;\n');
  writeFileSync(join(probe, 'test', 'index.test.js'), 'import "../src/index.js";\n');
  writeFileSync(join(probe, '.claude', 'hodos', 'config.json'), '{ "version": 1 }\n');
  writeFileSync(join(probe, 'dist', 'bundle.js'), 'built\n');
  writeFileSync(join(probe, 'node_modules', 'left-pad', 'index.js'), 'module.exports = 1;\n');
}

/**
 * A two-workspace fixture installed the way npm installs one: the workspace
 * package inside node_modules is a link to the workspace directory.
 */
function syntheticWorkspaces(root) {
  const mono = join(root, 'probe-mono');
  mkdirSync(join(mono, 'svc', 'src'), { recursive: true });
  mkdirSync(join(mono, 'web', 'src'), { recursive: true });
  mkdirSync(join(mono, 'node_modules', '@probe'), { recursive: true });
  mkdirSync(join(mono, 'node_modules', 'left-pad'), { recursive: true });
  writeFileSync(
    join(mono, 'package.json'),
    '{ "name": "probe-mono", "private": true, "workspaces": ["web", "svc"] }\n',
  );
  writeFileSync(join(mono, '.gitignore'), 'node_modules\n');
  writeFileSync(join(mono, 'svc', 'package.json'), '{ "name": "@probe/svc", "version": "0.1.0" }\n');
  writeFileSync(join(mono, 'web', 'package.json'), '{ "name": "@probe/web", "version": "0.1.0" }\n');
  writeFileSync(join(mono, 'svc', 'src', 'index.js'), 'export const rate = 0.2;\n');
  writeFileSync(join(mono, 'web', 'src', 'basket.js'), 'export const total = 1;\n');
  writeFileSync(join(mono, 'svc', 'src', 'index.test.js'), 'import "./index.js";\n');
  writeFileSync(join(mono, 'node_modules', 'left-pad', 'index.js'), 'module.exports = 1;\n');
  symlinkSync(join(mono, 'svc'), join(mono, 'node_modules', '@probe', 'svc'), 'junction');
}

describe('fixtureNames', () => {
  it('lists the fixture directories and nothing else', () => {
    assert.deepEqual(fixtureNames(FIXTURES), ['api', 'kit', 'mono', 'webapp']);
    assert.deepEqual(fixtureNames(syntheticRoot()), ['authored', 'probe', 'probe-mono']);
  });
});

describe('copyFixture', () => {
  it('copies a fixture into a git repository with three conventional commits', () => {
    const copy = copyFixture({ name: 'webapp', root: FIXTURES, into: temp('hodos-copy-') });

    assert.ok(existsSync(join(copy, 'package.json')));
    assert.ok(existsSync(join(copy, 'src', 'lib', 'http.ts')));
    assert.equal(git(copy, 'rev-parse', '--abbrev-ref', 'HEAD'), 'main');

    const subjects = git(copy, 'log', '--reverse', '--format=%s').split('\n');
    assert.equal(subjects.length, 3, `expected three commits, got ${subjects.length}`);
    assert.match(subjects[0], /^chore: /);
    assert.match(subjects[1], /^feat: /);
    assert.match(subjects[2], /^test: /);
    assert.equal(git(copy, 'status', '--porcelain'), '');
  });

  // The copy is a repository other scripts commit into — `bench/run/seed.mjs`
  // writes a task's commits, `bench/review/invoke.mjs` a package's — and a CI
  // runner has no global git identity: the third run of `ci` died here with
  // "fatal: empty ident name". The identity belongs in the repository this
  // script creates, not in `-c` flags each later caller has to remember.
  it('carries its own commit identity, so any script may commit into it', () => {
    const copy = copyFixture({ name: 'webapp', root: FIXTURES, into: temp('hodos-copy-') });
    assert.equal(git(copy, 'config', 'user.email'), 'bench@hodos.invalid');

    // A runner's environment: no global config, no system config, no identity
    // in the environment either.
    const bare = { ...process.env, GIT_CONFIG_GLOBAL: join(temp('hodos-noconfig-'), 'none'), GIT_CONFIG_NOSYSTEM: '1' };
    for (const key of ['GIT_AUTHOR_NAME', 'GIT_AUTHOR_EMAIL', 'GIT_COMMITTER_NAME', 'GIT_COMMITTER_EMAIL', 'EMAIL']) {
      delete bare[key];
    }
    writeFileSync(join(copy, 'later.txt'), 'what a later script wrote\n');
    execFileSync('git', ['add', '-A'], { cwd: copy, env: bare });
    execFileSync('git', ['commit', '-qm', 'chore: a later script'], { cwd: copy, env: bare });
    assert.equal(git(copy, 'log', '-1', '--format=%an <%ae>'), 'hodos bench <bench@hodos.invalid>');
  });

  it('puts configuration, then sources, then tests, in that order', () => {
    const copy = copyFixture({ name: 'webapp', root: FIXTURES, into: temp('hodos-copy-') });
    const filesOf = (n) => git(copy, 'show', '--name-only', '--format=', `HEAD~${n}`).split('\n').filter(Boolean);

    assert.ok(filesOf(2).includes('package.json'));
    assert.ok(filesOf(1).includes('src/lib/http.ts'));
    assert.ok(!filesOf(1).some((f) => f.endsWith('.test.ts') || f.endsWith('.test.tsx')));
    assert.ok(filesOf(0).includes('src/lib/http.test.ts'));
  });

  it('leaves the copy able to run its tests by linking node_modules', () => {
    const root = syntheticRoot();
    const copy = copyFixture({ name: 'probe', root, into: temp('hodos-copy-') });

    assert.ok(existsSync(join(copy, 'node_modules', 'left-pad')), 'the dependency is not resolvable in the copy');
    assert.equal(
      realpathSync(join(copy, 'node_modules', 'left-pad')),
      realpathSync(join(root, 'probe', 'node_modules', 'left-pad')),
    );
    assert.equal(git(copy, 'ls-files', 'node_modules'), '', 'node_modules was committed');
  });

  it('points a workspace link at the copy, not at the fixture it came from', () => {
    const root = syntheticRoot();
    const copy = copyFixture({ name: 'probe-mono', root, into: temp('hodos-copy-') });
    const linked = realpathSync(join(copy, 'node_modules', '@probe', 'svc'));

    assert.equal(linked, realpathSync(join(copy, 'svc')));
    assert.notEqual(linked, realpathSync(join(root, 'probe-mono', 'svc')));
    assert.equal(
      realpathSync(join(copy, 'node_modules', 'left-pad')),
      realpathSync(join(root, 'probe-mono', 'node_modules', 'left-pad')),
      'a plain dependency should still point at the install it came from',
    );
  });

  it('seeds its commits around a file the fixture ignores', () => {
    const root = syntheticRoot();
    // A build artefact the fixture's own .gitignore covers. Naming it to
    // `git add` aborts the whole commit, so the copier has to drop it first.
    writeFileSync(join(root, 'probe', 'tsconfig.tsbuildinfo'), '{}\n');
    const copy = copyFixture({ name: 'probe', root, into: temp('hodos-copy-') });

    assert.equal(git(copy, 'log', '--format=%s').split('\n').length, 3);
    assert.equal(git(copy, 'status', '--porcelain'), '');
    assert.ok(existsSync(join(copy, 'tsconfig.tsbuildinfo')), 'the file is still copied, only not staged');
    assert.equal(git(copy, 'ls-files', 'tsconfig.tsbuildinfo'), '');
  });

  it('skips an ignored path whose name git quotes', () => {
    const root = syntheticRoot();
    // core.quotePath is on by default, so check-ignore answers about this file
    // with an escaped name. Comparing that answer to the raw path skips
    // nothing, and the whole commit aborts again.
    writeFileSync(join(root, 'probe', 'naïve.tsbuildinfo'), '{}\n');
    const copy = copyFixture({ name: 'probe', root, into: temp('hodos-copy-') });

    assert.equal(git(copy, 'log', '--format=%s').split('\n').length, 3);
    assert.equal(git(copy, 'status', '--porcelain'), '');
    assert.equal(git(copy, 'ls-files', 'naïve.tsbuildinfo'), '');
  });

  it('refuses to hand back a copy whose commits the ignore rules emptied', () => {
    const root = syntheticRoot();
    // "seeds three conventional commits" is what COMPONENTS.md §7 promises
    // every stage test from 3 to 12. Two commits and exit 0 is the failure
    // that would be found three stages later.
    writeFileSync(join(root, 'probe', '.gitignore'), 'node_modules\ndist\n*.tsbuildinfo\ntest/\n');

    assert.throws(
      () => copyFixture({ name: 'probe', root, into: temp('hodos-copy-') }),
      /test.*ignored/s,
    );
  });

  it('copies neither the source repository nor its build output', () => {
    const root = syntheticRoot();
    const copy = copyFixture({ name: 'probe', root, into: temp('hodos-copy-') });

    assert.ok(!existsSync(join(copy, 'dist')), 'dist was copied');
    assert.equal(git(copy, 'log', '--format=%s').split('\n').length, 3);
  });

  it('removes .claude only when asked to', () => {
    const root = syntheticRoot();
    const kept = copyFixture({ name: 'probe', root, into: temp('hodos-copy-') });
    assert.ok(existsSync(join(kept, '.claude', 'hodos', 'config.json')));

    const stripped = copyFixture({ name: 'probe', root, into: temp('hodos-copy-'), stripClaude: true });
    assert.ok(!existsSync(join(stripped, '.claude')));
  });

  // Every line init appends, not the three it appended in Stage 3: sessions/
  // arrived with decision 0047 and settings.local.json with 0057, and a strip
  // that misses one hands the next stage a copy that is not virgin.
  it('strips the whole hodos layer, not only .claude/', () => {
    const root = syntheticRoot();
    const kept = copyFixture({ name: 'probe', root, into: temp('hodos-copy-') });
    assert.ok(existsSync(join(kept, 'CLAUDE.md')), 'CLAUDE.md was removed without --strip-claude');
    assert.match(readFileSync(join(kept, '.gitignore'), 'utf8'), /\.claude\/hodos\/tasks\//);

    const stripped = copyFixture({ name: 'probe', root, into: temp('hodos-copy-'), stripClaude: true });
    assert.ok(!existsSync(join(stripped, '.claude')));
    assert.ok(!existsSync(join(stripped, 'CLAUDE.md')), 'the map init wrote survived --strip-claude');
    const ignore = readFileSync(join(stripped, '.gitignore'), 'utf8');
    assert.equal(ignore, 'node_modules\ndist\n*.tsbuildinfo\n', 'the hodos .gitignore lines survived');
  });

  it('strips the managed block and leaves the developer\'s CLAUDE.md otherwise byte-identical', () => {
    const root = syntheticRoot();
    const stripped = copyFixture({ name: 'authored', root, into: temp('hodos-copy-'), stripClaude: true });

    const text = readFileSync(join(stripped, 'CLAUDE.md'), 'utf8');
    assert.equal(text, '# authored\n\nThe developer wrote this line.\n');
    assert.equal(readFileSync(join(stripped, '.gitignore'), 'utf8'), 'node_modules\n');
  });

  it("keeps the developer's lines when the block's end marker is missing", () => {
    const root = syntheticRoot();
    const truncated = join(root, 'truncated');
    mkdirSync(join(truncated, 'src'), { recursive: true });
    mkdirSync(join(truncated, 'test'), { recursive: true });
    writeFileSync(join(truncated, 'package.json'), '{ "name": "truncated", "private": true }\n');
    writeFileSync(join(truncated, 'src', 'index.js'), 'export const three = 3;\n');
    writeFileSync(join(truncated, 'test', 'index.test.js'), 'import "../src/index.js";\n');
    writeFileSync(
      join(truncated, 'CLAUDE.md'),
      '# truncated\n\nThe developer wrote this line.\n\n<!-- hodos:begin -->\n\n## Map\n\nhodos wrote this.\n',
    );

    const stripped = copyFixture({ name: 'truncated', root, into: temp('hodos-copy-'), stripClaude: true });
    assert.equal(
      readFileSync(join(stripped, 'CLAUDE.md'), 'utf8'),
      '# truncated\n\nThe developer wrote this line.\n',
    );
  });

  it('skips the module link when told to', () => {
    const root = syntheticRoot();
    const copy = copyFixture({ name: 'probe', root, into: temp('hodos-copy-'), modules: false });
    assert.ok(!existsSync(join(copy, 'node_modules')));
  });

  it('refuses an --into that already holds something, and leaves it alone', () => {
    // Stage 6 session A: --into a directory a previous run had used copied the
    // pristine fixture over a seeded working tree and kept the old .git and
    // .claude/hodos/tasks/. The run then read a ledger describing commits its
    // tree did not have, and the review measured the harness.
    const root = syntheticRoot();
    const into = temp('hodos-copy-');
    writeFileSync(join(into, 'keep.txt'), 'mine\n');

    // The path goes into the message, not into a pattern: a Windows temp path
    // is `C:\\Users\\…`, and every separator in it reads as an escape.
    assert.throws(() => copyFixture({ name: 'probe', root, into }), (error) => {
      assert.ok(error.message.includes(into), error.message);
      assert.match(error.message, /not empty/);
      return true;
    });
    assert.equal(readFileSync(join(into, 'keep.txt'), 'utf8'), 'mine\n');
    assert.ok(!existsSync(join(into, 'package.json')), 'nothing of the fixture was written');
  });

  it('refuses a fixture that does not exist, and says which do', () => {
    assert.throws(
      () => copyFixture({ name: 'nope', root: FIXTURES, into: temp('hodos-copy-') }),
      /nope.*api, kit, mono, webapp/s,
    );
  });
});

describe('the command line', () => {
  it('prints the path of the copy it made', () => {
    const into = temp('hodos-copy-');
    const printed = run(['webapp', '--into', into]).trim();
    assert.equal(realpathSync(printed), realpathSync(into));
    assert.ok(existsSync(join(printed, 'package.json')));
  });

  it('exits 1 on an unknown fixture and names the four', () => {
    assert.throws(
      () => run(['nope'], { stdio: 'pipe' }),
      (error) => {
        assert.equal(error.status, 1);
        assert.match(String(error.stderr), /api, kit, mono, webapp/);
        return true;
      },
    );
  });

  it('prints usage on --help and exits 0', () => {
    assert.match(run(['--help']), /Usage: node bench\/scripts\/fixture-copy\.mjs/);
  });
});

// A fixture that ships a committed hodos layer has to look like a project init
// has finished with, and `FORMATS.md §1` says what that includes: the five
// .gitignore lines. `webapp` shipped four of them, and nothing noticed until an
// init run on a copy appended the fifth (Stage 11b-1, M3).
describe('the committed fixtures', () => {
  const HODOS_IGNORE = [
    '.claude/hodos/tasks/',
    '.claude/hodos/active',
    '.claude/hodos/sessions/',
    '.claude/hodos/history.jsonl',
    '.claude/settings.local.json',
  ];

  it('gitignore every hodos path, wherever they ship a layer', () => {
    for (const name of fixtureNames()) {
      const dir = join(FIXTURES, name);
      if (!existsSync(join(dir, '.claude', 'hodos', 'config.json'))) continue;
      const lines = readFileSync(join(dir, '.gitignore'), 'utf8')
        .split('\n')
        .map((line) => line.trim());
      for (const path of HODOS_IGNORE) {
        assert.ok(lines.includes(path), `${name}/.gitignore is missing ${path}`);
      }
    }
  });
});
