// Negative fixtures are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, rmSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { lint } from './lint.mjs';

const LINT = fileURLToPath(new URL('./lint.mjs', import.meta.url));

function tree(files) {
  // realpath: macOS tmpdir is a symlink, and the CLI classifies paths relative to cwd.
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-lint-')));
  for (const [rel, content] of Object.entries(files)) {
    const abs = join(root, rel);
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  return root;
}

const kernel = (body = 'Body.\n') => `---
name: run
description: Execute an approved hodos task.
disable-model-invocation: true
argument-hint: "<slug>"
allowed-tools: Bash(node \${CLAUDE_PLUGIN_ROOT}/scripts/*)
---

${body}`;

const agent = (name = 'hodos-reviewer') => `---
name: ${name}
description: Fresh-context reviewer for a hodos task.
model: opus
tools: Read, Grep, Glob, Bash, Write
---

Body.
`;

/** Grow `text` with filler lines until the file is exactly `lines` long. */
function pad(text, lines) {
  const have = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
  return text + 'x\n'.repeat(Math.max(0, lines - have));
}

function errors(findings) {
  return findings.filter((f) => f.severity === 'error');
}

test('an empty tree is clean', () => {
  const root = tree({ '.gitkeep': '' });
  try {
    const { files, findings } = lint([], root);
    assert.equal(files.length, 0);
    assert.deepEqual(findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a valid kernel, reference and agent are clean', () => {
  const root = tree({
    'skills/run/SKILL.md': kernel('Execute runs from references/execute.md.\n'),
    'skills/run/references/execute.md': '# Execute\n\nProcedure.\n',
    'agents/hodos-reviewer.md': agent(),
    'adapters/browser/chrome-devtools.md': adapter('navigate: mcp__chrome-devtools__navigate_page {url}\n'),
    'sources/react.md': '# react\n',
  });
  try {
    const { findings } = lint([], root);
    assert.deepEqual(findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an over-cap kernel is flagged at the first line past the cap', () => {
  const root = tree({ 'skills/run/SKILL.md': kernel('x\n'.repeat(143)) });
  try {
    const { findings } = lint([], root);
    const [cap] = errors(findings);
    assert.match(cap.message, /kernel is 151 lines, cap 150/);
    assert.equal(cap.line, 151);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('wait-what is capped at 10 lines and other caps apply per kind', () => {
  const root = tree({
    'skills/wait-what/SKILL.md': `---
name: wait-what
description: Re-pitch where you are.
disable-model-invocation: true
---
${'x\n'.repeat(6)}`,
    'adapters/browser/chrome-devtools.md': pad(adapter('navigate: mcp__chrome-devtools__navigate_page {url}\n'), 31),
    'sources/react.md': 'x\n'.repeat(61),
    'skills/run/references/execute.md': 'x\n'.repeat(201),
  });
  try {
    const messages = errors(lint([], root).findings).map((f) => f.message);
    assert.equal(messages.filter((m) => /cap/.test(m)).length, 4);
    assert.ok(messages.some((m) => /wait-what is 11 lines, cap 10/.test(m)));
    assert.ok(messages.some((m) => /adapter is 31 lines, cap 30/.test(m)));
    assert.ok(messages.some((m) => /source is 61 lines, cap 60/.test(m)));
    assert.ok(messages.some((m) => /reference is 201 lines, cap 200/.test(m)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a description over 500 characters is an error', () => {
  const root = tree({
    'skills/run/SKILL.md': `---
name: run
description: ${'d'.repeat(501)}
disable-model-invocation: true
---

Body.
`,
  });
  try {
    const [finding] = errors(lint([], root).findings);
    assert.match(finding.message, /description is 501 chars, cap 500/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('": " inside a plain scalar is an error, quoted is not', () => {
  const root = tree({
    'skills/run/SKILL.md': `---
name: run
description: Execute a task: implement, review, verify.
disable-model-invocation: true
---

Body.
`,
    'skills/init/SKILL.md': `---
name: init
description: "Learn a project: conventions, rules, verify recipe."
disable-model-invocation: true
---

Body.
`,
  });
  try {
    const found = errors(lint([], root).findings);
    assert.equal(found.length, 1);
    assert.equal(found[0].file, 'skills/run/SKILL.md');
    assert.match(found[0].message, /": " inside a plain scalar/);
    assert.equal(found[0].line, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an agent name without the hodos- prefix is an error', () => {
  const root = tree({ 'agents/reviewer.md': agent('reviewer') });
  try {
    const messages = errors(lint([], root).findings).map((f) => f.message);
    assert.ok(messages.some((m) => /lacks the hodos- prefix/.test(m)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('disable-model-invocation is required outside the three call targets', () => {
  const root = tree({
    'skills/run/SKILL.md': `---
name: run
description: Execute an approved hodos task.
---

Body.
`,
    'skills/task/SKILL.md': `---
name: task
description: Route and plan one task. Invoked by run; not to be started on the model's own initiative.
---

Body.
`,
  });
  try {
    const found = errors(lint([], root).findings);
    assert.equal(found.length, 1);
    assert.equal(found[0].file, 'skills/run/SKILL.md');
    assert.match(found[0].message, /disable-model-invocation: true is required/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a call target carrying the gate is an error', () => {
  const root = tree({
    'skills/rule/SKILL.md': `---
name: rule
description: Write one project rule from precedents.
disable-model-invocation: true
---

Body.
`,
  });
  try {
    const [finding] = errors(lint([], root).findings);
    assert.match(finding.message, /call target \(decision 0016\) and must omit disable-model-invocation/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a key outside the subset warns and keeps the exit code at 0', () => {
  const root = tree({
    'skills/run/SKILL.md': `---
name: run
description: Execute an approved hodos task.
disable-model-invocation: true
model: opus
---

Body.
`,
  });
  try {
    const { findings } = lint([], root);
    assert.equal(errors(findings).length, 0);
    assert.match(findings[0].message, /model is outside the skill frontmatter subset/);
    assert.equal(findings[0].severity, 'warn');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('frontmatter out of the §8 order warns', () => {
  const root = tree({
    'skills/run/SKILL.md': `---
description: Execute an approved hodos task.
name: run
disable-model-invocation: true
---

Body.
`,
  });
  try {
    const { findings } = lint([], root);
    assert.equal(errors(findings).length, 0);
    assert.match(findings[0].message, /AUTHORING.md §8 orders it name, description/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a skill whose name differs from its directory is an error', () => {
  const root = tree({ 'skills/status/SKILL.md': kernel() });
  try {
    const messages = errors(lint([], root).findings).map((f) => f.message);
    assert.ok(messages.some((m) => /name is "run"; the directory is "status"/.test(m)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a file matching no cap pattern is an unknown artifact', () => {
  const root = tree({ 'skills/notes.md': '# notes\n', 'sources/stack/react.md': '# react\n' });
  try {
    const found = errors(lint([], root).findings);
    assert.equal(found.length, 2);
    for (const f of found) assert.match(f.message, /unknown artifact/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('missing frontmatter on a SKILL.md is an error', () => {
  const root = tree({ 'skills/run/SKILL.md': '# run\n\nBody.\n' });
  try {
    const [finding] = errors(lint([], root).findings);
    assert.equal(finding.message, 'no frontmatter');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--help exits 0 and prints the usage', () => {
  const out = execFileSync(process.execPath, [LINT, '--help'], { encoding: 'utf8' });
  assert.match(out, /Usage: node scripts\/lint\.mjs/);
});

test('the CLI exits 1 on an error and 0 on a clean tree', () => {
  const clean = tree({ 'skills/run/SKILL.md': kernel() });
  const dirty = tree({ 'agents/reviewer.md': agent('reviewer') });
  try {
    const ok = execFileSync(process.execPath, [LINT, join(clean, 'skills/run/SKILL.md')], {
      encoding: 'utf8',
      cwd: clean,
    });
    assert.match(ok, /lint: clean — 1 files/);

    let code = 0;
    let stdout = '';
    try {
      execFileSync(process.execPath, [LINT, 'agents/reviewer.md'], { encoding: 'utf8', cwd: dirty });
    } catch (e) {
      code = e.status;
      stdout = e.stdout;
    }
    assert.equal(code, 1);
    assert.match(stdout, /lacks the hodos- prefix/);
    assert.match(stdout, /lint: 1 errors, 0 warnings/);
  } finally {
    rmSync(clean, { recursive: true, force: true });
    rmSync(dirty, { recursive: true, force: true });
  }
});

test('an unknown option exits 2', () => {
  let code = 0;
  try {
    execFileSync(process.execPath, [LINT, '--frobnicate'], { encoding: 'utf8' });
  } catch (e) {
    code = e.status;
  }
  assert.equal(code, 2);
});

test('quoted values are read without their quotes', () => {
  const root = tree({
    'skills/run/SKILL.md': `---
name: "run"
description: 'Execute an approved hodos task.'
disable-model-invocation: true
argument-hint: "<slug>"
---

Body.
`,
  });
  try {
    const { findings } = lint([], root);
    assert.deepEqual(findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a quoted description of exactly 500 characters is within the cap', () => {
  const root = tree({
    'skills/status/SKILL.md': `---
name: status
description: "${'d'.repeat(500)}"
disable-model-invocation: true
---

Body.
`,
  });
  try {
    assert.deepEqual(lint([], root).findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the small-skill and agent caps are enforced', () => {
  const root = tree({
    'skills/status/SKILL.md': pad(
      `---
name: status
description: Show state and hygiene.
disable-model-invocation: true
---

`,
      101,
    ),
    'agents/hodos-verifier.md': pad(agent('hodos-verifier'), 151),
  });
  try {
    const messages = errors(lint([], root).findings).map((f) => f.message);
    assert.ok(messages.some((m) => /small skill is 101 lines, cap 100/.test(m)));
    assert.ok(messages.some((m) => /agent is 151 lines, cap 150/.test(m)));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a duplicate key is an error', () => {
  const root = tree({
    'skills/run/SKILL.md': `---
name: run
description: Execute an approved hodos task.
description: Execute it again.
disable-model-invocation: true
---

Body.
`,
  });
  try {
    const [finding] = errors(lint([], root).findings);
    assert.equal(finding.message, 'duplicate key: description');
    assert.equal(finding.line, 4);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('frontmatter that never closes is an error', () => {
  const root = tree({
    'skills/run/SKILL.md': `---
name: run
description: Execute an approved hodos task.

Body.
`,
  });
  try {
    const [finding] = errors(lint([], root).findings);
    assert.equal(finding.message, 'frontmatter opens with --- and never closes');
    assert.equal(finding.line, 1);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a list item before any key is an error', () => {
  const root = tree({
    'skills/run/SKILL.md': `---
  - "src/**/*.ts"
name: run
description: Execute an approved hodos task.
disable-model-invocation: true
---

Body.
`,
  });
  try {
    const [finding] = errors(lint([], root).findings);
    assert.equal(finding.message, 'list item before any key');
    assert.equal(finding.line, 2);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a quoted gate is an error — "true" is a string, not the boolean', () => {
  const root = tree({
    'skills/run/SKILL.md': `---
name: run
description: Execute an approved hodos task.
disable-model-invocation: "true"
---

Body.
`,
  });
  try {
    const [finding] = errors(lint([], root).findings);
    assert.match(finding.message, /disable-model-invocation: true is required/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a value that merely starts and ends with a quote still reaches the ": " check', () => {
  const root = tree({
    'skills/status/SKILL.md': `---
name: status
description: "Show" state: hygiene "now"
disable-model-invocation: true
---

Body.
`,
  });
  try {
    const found = errors(lint([], root).findings);
    assert.match(found[0].message, /": " inside a plain scalar/);
    assert.equal(found[0].line, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an escaped quote inside a quoted scalar stays one scalar', () => {
  const root = tree({
    'skills/run/SKILL.md': `---
name: run
description: "Execute the project's \\"approved\\" task."
disable-model-invocation: true
---

Body.
`,
  });
  try {
    assert.deepEqual(lint([], root).findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- Stage 1: reference depth, kernel citation, file:line resolution, modes ---

test('a reference two levels deep is an error', () => {
  const root = tree({
    'skills/run/SKILL.md': kernel('Execute runs from references/execute.md.\n'),
    'skills/run/references/execute.md': '# Execute\n',
    'skills/run/references/phases/verify.md': '# Verify\n',
  });
  try {
    const [deep] = errors(lint([], root).findings);
    assert.equal(deep.file, 'skills/run/references/phases/verify.md');
    assert.match(deep.message, /one level deep/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a reference no kernel names is an error', () => {
  const root = tree({
    'skills/run/SKILL.md': kernel('Execute runs from references/execute.md.\n'),
    'skills/run/references/execute.md': '# Execute\n',
    'skills/run/references/orphan.md': '# Orphan\n',
  });
  try {
    const found = errors(lint([], root).findings);
    assert.equal(found.length, 1);
    assert.equal(found[0].file, 'skills/run/references/orphan.md');
    assert.match(found[0].message, /does not name references\/orphan\.md/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a dead file:line citation is an error and a live one is not', () => {
  const root = tree({
    'skills/run/SKILL.md': kernel('Execute runs from references/execute.md.\n'),
    'skills/run/references/execute.md': '# Execute\n\nPrecedent: sources/react.md:1 and sources/react.md:40.\n',
    'sources/react.md': '# react\n',
  });
  try {
    const found = errors(lint([], root).findings);
    assert.equal(found.length, 1);
    assert.equal(found[0].line, 3);
    assert.match(found[0].message, /sources\/react\.md:40 — the file has 1 lines/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--project checks CLAUDE.md, the rules and their precedents', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
    'src/http.ts': 'export const http = 1;\n',
    'CLAUDE.md': '# Project\n',
    '.claude/rules/http.md': '---\npaths:\n  - "src/**/*.ts"\n---\n\nUse the wrapper: src/http.ts:1, src/http.ts:9.\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });
    assert.equal(out.status, 1);
    assert.match(out.stdout, /\.claude\/rules\/http\.md:6: error: src\/http\.ts:9 — the file has 1 lines/);
    assert.doesNotMatch(out.stdout, /unknown artifact/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--project accepts a plan whose tasks are test-first or properly exempt', () => {
  const plan = [
    '# Plan — orders-summary',
    '## Tasks',
    '### T1. Summary query hook',
    'Acceptance: totals for a fixed range',
    '### T2. Summary widget',
    'Tests: visual — layout and the three states only, no branch · verified by ui recipe /orders',
    '### T3. Bump the build target',
    'Tests: test-first',
    '',
  ].join('\n');
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
    '.claude/hodos/tasks/orders-summary/plan.md': plan,
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });
    assert.equal(out.status, 0, out.stdout);
    assert.doesNotMatch(out.stdout, /unknown artifact/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--project rejects a test strategy outside the four exemptions', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
    '.claude/hodos/tasks/orders-summary/plan.md': '## Tasks\n### T1. Widget\nTests: after; browser verify\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });
    assert.equal(out.status, 1);
    assert.match(out.stdout, /plan\.md:3: error:/);
    assert.match(out.stdout, /visual, glue, infra, no-harness/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--project rejects an exemption missing its justification or its replacement check', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
    '.claude/hodos/tasks/orders-summary/plan.md': '## Tasks\n### T1. Widget\nTests: visual\n### T2. Config\nTests: infra — no runtime branch\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });
    assert.equal(out.status, 1);
    assert.match(out.stdout, /plan\.md:3: error:.*verified by/s);
    assert.match(out.stdout, /plan\.md:5: error:.*verified by/s);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--project measures an existing CLAUDE.md by its managed block', () => {
  const long = '# Project\n' + 'a line\n'.repeat(200);
  const block = ['<!-- hodos:begin -->', '## hodos', 'Rules: .claude/rules/', '<!-- hodos:end -->'].join('\n');
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
    'CLAUDE.md': `${long}\n${block}\n`,
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });
    assert.equal(out.status, 0, out.stdout);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--project flags a managed block over 60 lines', () => {
  const block = ['<!-- hodos:begin -->', ...Array(70).fill('rule line'), '<!-- hodos:end -->'].join('\n');
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
    'CLAUDE.md': `# Project\n${block}\n`,
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });
    assert.equal(out.status, 1);
    assert.match(out.stdout, /the hodos managed block is 72 lines, cap 60/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

/** Run the hook the way Claude Code does: payload on stdin, JSON on stdout. */
function hook(filePath, key = 'file_path') {
  return spawnSync(process.execPath, [LINT, '--hook'], {
    input: JSON.stringify({ tool_name: 'Write', tool_input: { [key]: filePath, content: '' } }),
    encoding: 'utf8',
  });
}

test('--hook says nothing about a file hodos does not own', () => {
  const root = tree({ 'src/x.ts': 'export const x = 1;\n' });
  try {
    const out = hook(join(root, 'src/x.ts'));
    assert.equal(out.status, 0);
    assert.equal(out.stdout, '');
    assert.equal(out.stderr, '');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--hook reports on a project rule as additionalContext', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    'src/http.ts': 'export const http = 1;\n',
    '.claude/rules/http.md': '---\npaths:\n  - "src/**/*.ts"\n---\n\nSee src/http.ts:9.\n',
  });
  try {
    for (const key of ['file_path', 'path', 'filePath']) {
      const out = hook(join(root, '.claude/rules/http.md'), key);
      assert.equal(out.status, 0, key);
      const parsed = JSON.parse(out.stdout);
      assert.equal(parsed.hookSpecificOutput.hookEventName, 'PostToolUse');
      assert.match(parsed.hookSpecificOutput.additionalContext, /src\/http\.ts:9 — the file has 1 lines/);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--hook resolves an absolute path from an unrelated cwd', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    'src/http.ts': 'export const http = 1;\n',
    '.claude/rules/http.md': '---\npaths:\n  - "src/**/*.ts"\n---\n\nSee src/http.ts:1.\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--hook'], {
      cwd: tmpdir(),
      input: JSON.stringify({ tool_input: { file_path: join(root, '.claude/rules/http.md') } }),
      encoding: 'utf8',
    });
    assert.equal(out.status, 0);
    assert.equal(out.stdout, '', 'the citation resolves against the rule’s repository, not the cwd');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--hook exits 0 on a payload it cannot read', () => {
  const out = spawnSync(process.execPath, [LINT, '--hook'], { input: 'not json', encoding: 'utf8' });

  assert.equal(out.status, 0);
  assert.equal(out.stdout, '');
});

test('--hook says nothing about a .claude file that is not an authored artifact', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/tasks/t1/brief.md': '# t1\n\nPrompt.\n',
    '.claude/settings.json': '{ "permissions": { "allow": [] } }\n',
  });
  try {
    for (const rel of ['.claude/hodos/tasks/t1/brief.md', '.claude/settings.json']) {
      const out = spawnSync(process.execPath, [LINT, '--hook'], {
        input: JSON.stringify({ tool_input: { file_path: join(root, rel) } }),
        encoding: 'utf8',
      });
      assert.equal(out.status, 0, rel);
      assert.equal(out.stdout, '', `${rel}: the hook reports on artifacts it knows, not on task state`);
    }
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--project warns on a plan over 250 lines without failing it', () => {
  const long = ['# Plan', '## Tasks', '### T1. Big', ...Array(260).fill('detail')].join('\n');
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
    '.claude/hodos/tasks/orders-summary/plan.md': `${long}\n`,
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });
    assert.equal(out.status, 0, 'plan size is advisory, never a criterion (FORMATS.md §5)');
    assert.match(out.stdout, /warn: .*263 lines.*one mergeable unit/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a project skill is named after its own directory, not the plugin layout', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
    '.claude/skills/orders/SKILL.md': `---
name: orders
description: Project skill for order work.
disable-model-invocation: true
---

Body.
`,
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });
    assert.equal(out.status, 0, out.stdout);
    assert.doesNotMatch(out.stdout, /the directory is "skills"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- cross-references: `DOC.md §N` resolves to a heading that exists ---------
// research/05 F1: spec drift between DESIGN.md, COMPONENTS.md and FORMATS.md
// was a major in three consecutive stage reviews, and renumbering is the half
// a machine can catch.

const xref = (body) => ({
  'docs/DESIGN.md': '# Design\n\n## 7. Quality of code\n\n### 7.4 Verify contract\n\nText.\n',
  'docs/AUTHORING.md': '# Authoring\n\n## 7. Size caps\n\nText.\n',
  'skills/run/SKILL.md': kernel(`${body}\n\nreferences/execute.md is the phase.\n`),
  'skills/run/references/execute.md': '# execute\n\n## 3. The red phase\n\nText.\n',
});

test('a section reference that resolves is not a finding', () => {
  const root = tree(xref('The contract is `DESIGN.md §7.4`, the caps are `AUTHORING.md §7`.'));
  try {
    const { findings } = lint([], root);
    assert.deepEqual(findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a renumbered section reference is an error at its line', () => {
  const root = tree(xref('Body line.\n\nThe contract is `DESIGN.md §99`.'));
  try {
    const { findings } = lint([], root);
    const dead = findings.filter((f) => /DESIGN\.md §99/.test(f.message));
    assert.equal(dead.length, 1, JSON.stringify(findings));
    assert.equal(dead[0].file, 'skills/run/SKILL.md');
    assert.equal(dead[0].severity, 'error');
    assert.equal(dead[0].line, 11, 'the line the reference sits on');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a double-backtick span quotes a reference and is not one', () => {
  const root = tree(xref('The stage fails a renumbered `` `DESIGN.md §99` `` like every other check.'));
  try {
    const { findings } = lint([], root);
    assert.deepEqual(findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('both endpoints of a range are resolved', () => {
  const root = tree(xref('Frontmatter and caps: `AUTHORING.md §7–8`.'));
  try {
    const { findings } = lint([], root);
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.match(findings[0].message, /AUTHORING\.md §8/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a reference to a phase reference resolves against that file', () => {
  const root = tree(xref('The red phase is `execute.md §3`; `execute.md §9` is not.'));
  try {
    const { findings } = lint([], root);
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.match(findings[0].message, /execute\.md §9/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a bare section mark and a research path are declined', () => {
  const root = tree(xref('See `research/05 §5`, and `§7.1` on its own, and `notes.txt §3`.'));
  try {
    const { findings } = lint([], root);
    assert.deepEqual(findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the append-only records are not scanned for references', () => {
  const files = xref('Body.');
  files['docs/DECISIONS.md'] = '# Decisions\n\n`DESIGN.md §6.3` made the test strategy a field.\n';
  files['docs/stages/06-report.md'] = '# Stage 6\n\nAgainst `FORMATS.md §42`.\n';
  const root = tree(files);
  try {
    const { findings } = lint([], root);
    assert.deepEqual(findings, [], 'a record rewritten to keep lint green is falsified evidence');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- maxTurns: the dispatch bound lives in the definition (decision 0044) ----

const bounded = (turns) => `---
name: hodos-verifier
description: Fresh-context verifier for a hodos task.
model: sonnet
maxTurns: ${turns}
disallowedTools: Edit, NotebookEdit
---

Body.
`;

test('an agent may declare its own turn bound', () => {
  const root = tree({ 'agents/hodos-verifier.md': bounded(60) });
  try {
    const { findings } = lint([], root);
    assert.deepEqual(findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a turn bound that is not a positive whole number is an error', () => {
  const root = tree({ 'agents/hodos-verifier.md': bounded('sixty') });
  try {
    const { findings } = lint([], root);
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.match(findings[0].message, /maxTurns "sixty" is not a positive whole number/);
    assert.equal(findings[0].line, 5);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a turn bound of zero is an error, not a bound of none', () => {
  const root = tree({ 'agents/hodos-verifier.md': bounded(0) });
  try {
    const { findings } = lint([], root);
    assert.equal(findings.length, 1, JSON.stringify(findings));
    assert.match(findings[0].message, /maxTurns "0"/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a project rule citing a section of the project own docs is not the engine check business', () => {
  // The cross-reference pass guards the engine's specification against
  // renumbering. A project whose docs number nothing cannot clear it except by
  // deleting the citation, which is a check the stage never asked for.
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
    'docs/ARCH.md': '# Architecture\n\n## Boundaries\n\nText.\n',
    '.claude/rules/http.md': `---
paths:
  - "src/**/*.ts"
---

# Reach the network through request()

The shape is in \`ARCH.md §3\`.

## Precedents

- \`src/lib/http.ts:12\` — the only fetch.
`,
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });
    assert.doesNotMatch(out.stdout, /names no section/, out.stdout);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// --- adapters: the FORMATS.md §13 shape, and the server the prefix names
// (decision 0062). A shape nothing checks is a shape a verifier can silently
// get nothing from.

// The rest of the browser role's twelve operations (`DESIGN.md §3.2`), so a
// fixture is a complete adapter and the case under test is the only finding.
const REST_OF_BROWSER = [
  'stub: mcp__chrome-devtools__navigate_page {url, initScript}',
  'snapshot: mcp__chrome-devtools__take_snapshot',
  'click: mcp__chrome-devtools__click {uid}',
  'fill: mcp__chrome-devtools__fill {uid, value}',
  'screenshot: mcp__chrome-devtools__take_screenshot {filePath}',
  'evaluate: mcp__chrome-devtools__evaluate_script {function}',
  'console: mcp__chrome-devtools__list_console_messages',
  'network: mcp__chrome-devtools__list_network_requests',
  'resize: mcp__chrome-devtools__resize_page {width, height}',
  'emulate: mcp__chrome-devtools__emulate {viewport}',
  'audit: mcp__chrome-devtools__lighthouse_audit {device}',
].join('\n');

const adapter = (body) => `role: browser
server: chrome-devtools
${body}${REST_OF_BROWSER}
gotchas:
- take_snapshot before any click/fill; uids expire on navigation
`;

test('an operation whose prefix names another server than the file declares is an error', () => {
  const root = tree({
    'adapters/browser/chrome-devtools.md': adapter('navigate: mcp__playwright__browser_navigate {url}\n'),
  });
  try {
    const { findings } = lint([join(root, 'adapters/browser/chrome-devtools.md')], root, { crossRefs: false });

    assert.equal(findings.length, 1);
    assert.match(findings[0].message, /mcp__playwright__ names a server the file does not declare \(server: chrome-devtools\)/);
    assert.equal(findings[0].line, 3);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an adapter whose role line disagrees with its directory is an error', () => {
  const root = tree({
    'adapters/browser/chrome-devtools.md': adapter('navigate: mcp__chrome-devtools__navigate_page {url}\n').replace(
      'role: browser',
      'role: codeIndex',
    ),
  });
  try {
    const { findings } = lint([join(root, 'adapters/browser/chrome-devtools.md')], root, { crossRefs: false });

    assert.equal(findings.length, 1);
    assert.match(findings[0].message, /role: codeIndex, but the file is under adapters\/browser\//);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an adapter with no gotchas is an error: it restates a schema ToolSearch already gives', () => {
  const root = tree({
    'adapters/browser/chrome-devtools.md': `role: browser\nserver: chrome-devtools\nnavigate: mcp__chrome-devtools__navigate_page {url}\n${REST_OF_BROWSER}\n`,
  });
  try {
    const { findings } = lint([join(root, 'adapters/browser/chrome-devtools.md')], root, { crossRefs: false });

    assert.equal(findings.length, 1);
    assert.match(findings[0].message, /no gotchas:/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an adapter with neither role: nor server: on its first two lines is an error', () => {
  const root = tree({
    'adapters/browser/chrome-devtools.md': '# chrome-devtools\n\nnavigate: mcp__chrome-devtools__navigate_page\n',
  });
  try {
    const { findings } = lint([join(root, 'adapters/browser/chrome-devtools.md')], root, { crossRefs: false });

    const messages = findings.map((f) => f.message);
    assert.ok(messages.some((m) => /opens with `role: <role>`/.test(m)), messages.join(' | '));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--project lints a project adapter and rejects a server absent from .mcp.json', () => {
  const project = (mcpServers) => ({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1, adapters: { browser: 'project:playwright' } }),
    '.mcp.json': JSON.stringify({ mcpServers }),
    '.claude/hodos/adapters/browser/playwright.md':
      'role: browser\nserver: playwright\nnavigate: mcp__playwright__browser_navigate {url}\ngotchas:\n- the ref comes from browser_snapshot, and it goes stale on navigation\n',
  });
  const absent = tree(project({ 'chrome-devtools': { command: 'npx' } }));
  const present = tree(project({ playwright: { command: 'npx' } }));
  try {
    const bad = spawnSync(process.execPath, [LINT, '--project'], { cwd: absent, encoding: 'utf8' });
    const good = spawnSync(process.execPath, [LINT, '--project'], { cwd: present, encoding: 'utf8' });

    assert.equal(bad.status, 1);
    assert.match(bad.stdout, /\.claude\/hodos\/adapters\/browser\/playwright\.md:2: error: server: playwright names no server in \.mcp\.json/);
    assert.equal(good.status, 0, good.stdout);
  } finally {
    rmSync(absent, { recursive: true, force: true });
    rmSync(present, { recursive: true, force: true });
  }
});

test('a project adapter over the 30-line cap is reported like a shipped one', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
    '.mcp.json': JSON.stringify({ mcpServers: { playwright: {} } }),
    '.claude/hodos/adapters/browser/playwright.md': pad(
      'role: browser\nserver: playwright\nnavigate: mcp__playwright__browser_navigate\ngotchas:\n- the ref goes stale on navigation\n',
      31,
    ),
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });

    assert.equal(out.status, 1);
    assert.match(out.stdout, /adapter is 31 lines, cap 30/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--project rejects a project adapter when the repository has no .mcp.json at all', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
    '.claude/hodos/adapters/browser/playwright.md':
      'role: browser\nserver: playwright\nnavigate: mcp__playwright__browser_navigate\ngotchas:\n- the ref goes stale on navigation\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });

    assert.equal(out.status, 1);
    assert.match(out.stdout, /names no server in \.mcp\.json/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// ── --rules: the facts /hodos:status --prune asks about (decision 0082) ─────

const RULE_BASE = '.claude/hodos/config.json';

test('--rules reports each rule with its citations, its size and the layer cost', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    [RULE_BASE]: JSON.stringify({ version: 1 }),
    'src/here.ts': 'const a = 1;\nconst b = 2;\n',
    '.claude/rules/alive.md': '---\ndescription: alive\n---\n\n# alive\n\nUse it: src/here.ts:2.\n',
    '.claude/rules/rotted.md': '---\ndescription: rotted\n---\n\n# rotted\n\nUse it: src/gone.ts:12.\n',
    '.claude/rules/two-rotted.md': '---\ndescription: two rotted\n---\n\n# two rotted\n\nHere: src/gone.ts:1. And: src/also-gone.ts:2.\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--rules'], { cwd: root, encoding: 'utf8' });

    assert.equal(out.status, 0, out.stderr);
    assert.match(out.stdout, /^alive\.md — \d+ lines · age unknown — not committed · 0 precedents · 1 citation · resolves$/m);
    assert.match(out.stdout, /^rotted\.md — \d+ lines · age unknown — not committed · 0 precedents · 1 citation · 1 does not resolve$/m);
    assert.match(out.stdout, /^two-rotted\.md — \d+ lines · age unknown — not committed · 0 precedents · 2 citations · 2 do not resolve$/m);
    assert.match(out.stdout, /src\/gone\.ts:12 — no such file/);
    assert.match(out.stdout, /^layer: 3 rules · \d+ tokens$/m);
    // It reports; it does not judge. Nothing here calls a rule dead.
    assert.doesNotMatch(out.stdout, /dead|unused|delete/i);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--rules prints each rule\'s age from git, and says so when git has none', () => {
  // Decision 0082 names four per-rule facts --prune prints, and age is one of them.
  // It comes from git rather than from mtime: a clone rewrites every mtime to the
  // checkout, so mtime would report every rule in a fresh clone as written today.
  const root = tree({
    [RULE_BASE]: JSON.stringify({ version: 1 }),
    'src/here.ts': 'const a = 1;\nconst b = 2;\n',
    '.claude/rules/old.md': '---\ndescription: old\n---\n\n# old\n\nUse it: src/here.ts:2.\n',
    '.claude/rules/fresh.md': '---\ndescription: fresh\n---\n\n# fresh\n\nUse it: src/here.ts:1.\n',
    '.claude/rules/named-old.md': '---\ndescription: renamed\n---\n\n# renamed\n\nUse it: src/here.ts:2.\n',
  });
  try {
    const git = (args, env) =>
      spawnSync('git', args, { cwd: root, encoding: 'utf8', env: { ...process.env, ...env } });
    git(['init', '-q', '-b', 'main']);
    git(['config', 'user.email', 't@t']);
    git(['config', 'user.name', 'T']);
    const then = new Date(Date.now() - 30 * 86400000).toISOString();
    git(['add', '.claude/rules/old.md', '.claude/rules/named-old.md', 'src/here.ts', RULE_BASE]);
    git(['commit', '-q', '-m', 'add the old rules'], { GIT_AUTHOR_DATE: then, GIT_COMMITTER_DATE: then });
    // Touched again today. Re-pointing a precedent does not make a rule younger, so the
    // age must come from the commit that ADDED it, which is what --diff-filter=A buys.
    writeFileSync(join(root, '.claude/rules/old.md'), '---\ndescription: old\n---\n\n# old\n\nUse it: src/here.ts:1.\n');
    git(['add', '.claude/rules/old.md']);
    git(['commit', '-q', '-m', 're-point the old rule']);
    // Renamed today. A rule that got a better name is not a rule written today, and
    // it is certainly not uncommitted — the age has to follow the file through the mv.
    git(['mv', '.claude/rules/named-old.md', '.claude/rules/named-new.md']);
    git(['commit', '-q', '-m', 'rename the rule']);
    // Deleted, then brought back 10 days ago. --follow reads that as one file's
    // history, so the age stays at first arrival — not the restore, and not the touch.
    const gone = new Date(Date.now() - 20 * 86400000).toISOString();
    const back = new Date(Date.now() - 10 * 86400000).toISOString();
    git(['rm', '-q', '.claude/rules/old.md']);
    git(['commit', '-q', '-m', 'drop the rule'], { GIT_AUTHOR_DATE: gone, GIT_COMMITTER_DATE: gone });
    writeFileSync(join(root, '.claude/rules/old.md'), '---\ndescription: old\n---\n\n# old\n\nUse it: src/here.ts:2.\n');
    git(['add', '.claude/rules/old.md']);
    git(['commit', '-q', '-m', 'bring the rule back'], { GIT_AUTHOR_DATE: back, GIT_COMMITTER_DATE: back });

    const out = spawnSync(process.execPath, [LINT, '--rules'], { cwd: root, encoding: 'utf8' });

    assert.equal(out.status, 0, out.stderr);
    // Added 30 days ago, re-pointed today, dropped, brought back: still 30 days old.
    assert.match(out.stdout, /^old\.md — \d+ lines · age 30d · 0 precedents · 1 citation · resolves$/m);
    // Renamed today, added 30 days ago: the age belongs to the add, across the rename.
    assert.match(out.stdout, /^named-new\.md — \d+ lines · age 30d · 0 precedents · 1 citation · resolves$/m);
    // Untracked: git can stand behind no number, so the run says so instead of guessing.
    assert.match(out.stdout, /^fresh\.md — \d+ lines · age unknown — not committed · 0 precedents · 1 citation · resolves$/m);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--rules on a project with no rules says so and exits 0', () => {
  const root = tree({ '.git/HEAD': 'ref: refs/heads/main\n', [RULE_BASE]: JSON.stringify({ version: 1 }) });
  try {
    const out = spawnSync(process.execPath, [LINT, '--rules'], { cwd: root, encoding: 'utf8' });

    assert.equal(out.status, 0, out.stderr);
    assert.match(out.stdout, /no rules/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Decision 0078: a precedent's anchor is the text of the line it cites, so the
// check reports where the code went instead of only that a line is not blank.

test('--project reports a moved anchor once, with the line it moved to', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
    'src/http.ts': '\n\nexport const http = 1;\n',
    'CLAUDE.md': '# Project\n',
    '.claude/rules/http.md':
      '---\npaths:\n  - "src/**/*.ts"\n---\n\nUse the wrapper.\n\n## Precedents\n- src/http.ts:1 — `export const http = 1;`\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });

    assert.equal(out.status, 1);
    assert.match(out.stdout, /\.claude\/rules\/http\.md:9: error: src\/http\.ts:1 — the anchor is now at line 3/);
    // One rot, one finding: the blank line the code left behind is the same cause.
    assert.doesNotMatch(out.stdout, /that line is blank/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--project says nothing about an anchor that still sits where it says', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
    'src/http.ts': 'export const http = 1;\n',
    'CLAUDE.md': '# Project\n',
    '.claude/rules/http.md':
      '---\npaths:\n  - "src/**/*.ts"\n---\n\nUse the wrapper.\n\n## Precedents\n- src/http.ts:1 — `export const http = 1;`\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });

    assert.equal(out.status, 0, out.stdout);
    assert.match(out.stdout, /lint: clean/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--rules counts a moved anchor in the rule verdict and names where it went', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    [RULE_BASE]: JSON.stringify({ version: 1 }),
    'src/here.ts': 'const a = 1;\nconst b = 2;\n',
    '.claude/rules/moved.md':
      '---\ndescription: moved\n---\n\n# moved\n\n## Precedents\n- src/here.ts:1 — `const b = 2;`\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--rules'], { cwd: root, encoding: 'utf8' });

    assert.equal(out.status, 0, out.stderr);
    assert.match(out.stdout, /^moved\.md — \d+ lines · age unknown — not committed · 1 precedent · 1 citation · 1 anchor moved or gone$/m);
    assert.match(out.stdout, /src\/here\.ts:1 — the anchor is now at line 2/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Decision 0078: the map loads on every session and names bare paths, which
// the citation regex does not match at all. A rename kills them silently.

const MAP_PROJECT = {
  '.git/HEAD': 'ref: refs/heads/main\n',
  '.claude/hodos/config.json': JSON.stringify({ version: 1 }),
  'src/here.ts': 'const a = 1;\n',
  'src/lib/http.ts': 'const b = 2;\n',
};

test('--project reports a bare path in the map that no longer exists', () => {
  const root = tree({
    ...MAP_PROJECT,
    'CLAUDE.md': '# Project\n\n- `src/here.ts` — the one that stayed.\n- `src/gone.ts` — the one that moved.\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });

    assert.equal(out.status, 1);
    assert.match(out.stdout, /CLAUDE\.md:4: error: src\/gone\.ts — no such file or directory/);
    assert.doesNotMatch(out.stdout, /src\/here\.ts/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--project leaves the forms a map legitimately carries alone', () => {
  const root = tree({
    ...MAP_PROJECT,
    'CLAUDE.md': [
      '# Project',
      '',
      '- `src/features/<name>/` — one directory per feature',
      '- `ui/*.tsx` — the components',
      '- `src/lib/` — what every feature shares',
      '- `index.ts` — the barrel, read relative to the feature',
      '- branches are `feature/{slug}`',
      '- run `npm test` before pushing',
      '- the dev server is at http://localhost:5173/orders',
      '- an import of `features/orders/ui/OrderList` pins another feature',
      '',
      '```ts',
      "import { OrdersPage } from './features/orders';",
      '```',
      '',
    ].join('\n'),
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });

    assert.equal(out.status, 0, out.stdout);
    assert.match(out.stdout, /lint: clean/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--project reports a bare path in a rule the same way', () => {
  const root = tree({
    ...MAP_PROJECT,
    'CLAUDE.md': '# Project\n',
    '.claude/rules/http.md': '---\npaths:\n  - "src/**/*.ts"\n---\n\nEverything network lives in `src/lib/gone/`.\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--project'], { cwd: root, encoding: 'utf8' });

    assert.equal(out.status, 1);
    assert.match(out.stdout, /rules\/http\.md:6: error: src\/lib\/gone\/ — no such file or directory/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

// Decision 0091: DESIGN.md §3.2's operations are the role's contract. An
// adapter that omits one answers nothing when the phase that reads it calls,
// and today nothing says so — the shape is checked and the names are not.

const codeIndexAdapter = (ops) =>
  ['role: codeIndex', 'server: ariadne', ...ops, 'gotchas:', '- an empty result is not "no risk" inside a monorepo'].join('\n') + '\n';

const FIVE = [
  'findReferences: mcp__ariadne__find_references {symbol}',
  'outline: mcp__ariadne__read_outline {path}',
  'readSymbol: mcp__ariadne__read_symbol {symbol}',
  'blastRadius: mcp__ariadne__blast_radius {symbol}',
  'affectedTests: mcp__ariadne__affected_tests {spec}',
];

test('an adapter missing one of its role operations is a finding naming both', () => {
  const root = tree({
    'adapters/codeIndex/ariadne.md': codeIndexAdapter(FIVE.filter((o) => !o.startsWith('affectedTests'))),
  });
  try {
    const { findings } = lint([join(root, 'adapters/codeIndex/ariadne.md')], root, { crossRefs: false });

    assert.equal(findings.length, 1);
    assert.match(findings[0].message, /codeIndex/);
    assert.match(findings[0].message, /affectedTests/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an adapter mapping every operation its role names is clean', () => {
  const root = tree({ 'adapters/codeIndex/ariadne.md': codeIndexAdapter(FIVE) });
  try {
    const { findings } = lint([join(root, 'adapters/codeIndex/ariadne.md')], root, { crossRefs: false });

    assert.deepEqual(findings, []);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('an adapter with the right number of operations and the wrong set is still a finding', () => {
  const root = tree({
    'adapters/codeIndex/ariadne.md': codeIndexAdapter([
      ...FIVE.filter((o) => !o.startsWith('affectedTests')),
      'apiSurfaceDiff: mcp__ariadne__api_surface_diff {a, b}',
    ]),
  });
  try {
    const { findings } = lint([join(root, 'adapters/codeIndex/ariadne.md')], root, { crossRefs: false });

    assert.equal(findings.length, 1);
    assert.match(findings[0].message, /affectedTests/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--rules counts one rot once when the anchored line went blank', () => {
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    [RULE_BASE]: JSON.stringify({ version: 1 }),
    'src/here.ts': '\nconst b = 2;\n',
    '.claude/rules/gone.md':
      '---\ndescription: gone\n---\n\n# gone\n\n## Precedents\n- src/here.ts:1 — `const a = 1;`\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--rules'], { cwd: root, encoding: 'utf8' });

    assert.match(out.stdout, /^gone\.md — \d+ lines · age unknown — not committed · 1 precedent · 1 citation · 1 anchor moved or gone$/m);
    assert.doesNotMatch(out.stdout, /that line is blank/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--rules counts the precedents the block carries, not every path in the prose', () => {
  // M1 read `error-role-alert.md — … · 4 precedents`, and the rule carries two.
  // The other two are the same paths named in the prose to explain the rule,
  // which the block-is-the-evidence rule of this stage keeps out of the count:
  // `AUTHORING.md §10` question 1 asks for two precedents, and this is the
  // number a reader checks that against.
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    [RULE_BASE]: JSON.stringify({ version: 1 }),
    'src/here.ts': 'const a = 1;\nconst b = 2;\n',
    '.claude/rules/twice.md':
      '---\ndescription: twice\n---\n\n# twice\n\nThe form is at `src/here.ts:1`, and again at `src/here.ts:2`.\n\n## Precedents\n- src/here.ts:1 — `const a = 1;`\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--rules'], { cwd: root, encoding: 'utf8' });

    assert.equal(out.status, 0, out.stderr);
    assert.match(out.stdout, /^twice\.md — \d+ lines · age unknown — not committed · 1 precedent · 3 citations · resolves$/m);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('--rules says where in the rule each rot lives', () => {
  // M3 read the same rot twice, byte-identical: `test-mocking-boundary` names
  // the renamed path in its prose and again in `## Precedents`, and the two
  // findings printed as one line repeated. `--project` prints the rule's line
  // and is legible; this surface owed the same.
  const root = tree({
    '.git/HEAD': 'ref: refs/heads/main\n',
    [RULE_BASE]: JSON.stringify({ version: 1 }),
    '.claude/rules/two-homes.md':
      '---\ndescription: two homes\n---\n\n# two homes\n\nThe form is at `src/gone.ts:5`.\n\n## Precedents\n- src/gone.ts:5 — `beforeEach(() => {`\n',
  });
  try {
    const out = spawnSync(process.execPath, [LINT, '--rules'], { cwd: root, encoding: 'utf8' });

    assert.equal(out.status, 0, out.stderr);
    assert.match(out.stdout, /^ {2}:7 src\/gone\.ts:5 — no such file$/m);
    assert.match(out.stdout, /^ {2}:10 src\/gone\.ts:5 — no such file$/m);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});
