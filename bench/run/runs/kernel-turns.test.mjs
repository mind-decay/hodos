// The distinction this script exists for: a subagent's tool uses appear in the
// parent's stream carrying parent_tool_use_id, and a dispatch that names a path
// is not a read of it. Getting either wrong is what cost a loop run in Stage 6,
// so the two cases are pinned here rather than trusted.

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const SCRIPT = join(HERE, 'kernel-turns.mjs');

const use = (name, input, parent = null) =>
  JSON.stringify({
    type: 'assistant',
    parent_tool_use_id: parent,
    message: { content: [{ type: 'tool_use', name, input }] },
  });

const STREAM = [
  use('Bash', { command: 'node scripts/review-package.mjs status-label' }),
  use('Agent', { subagent_type: 'hodos:hodos-reviewer', prompt: 'Package: /tmp/c/review-input.md' }),
  use('Bash', { command: 'cat /tmp/c/review-input.md' }, 'toolu_the_reviewers_own'),
  use('Read', { file_path: '/tmp/c/review.md' }),
  'not json at all',
].join('\n');

const run = (...args) => execFileSync('node', [SCRIPT, ...args], { encoding: 'utf8' });

test('a dispatch that names the package is not a read of it, and a subagent turn is not the kernel', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hodos-turns-'));
  try {
    const file = join(dir, 'run.jsonl');
    writeFileSync(file, `${STREAM}\n`);
    const out = run(file);

    assert.match(out, /kernel tool uses: 3/, 'the subagent turn is not counted, and the junk line is skipped');
    assert.match(out, /review-input\.md: 0 read, 1 mentioned/);
    assert.match(out, /review\.md: 1 read, 1 mentioned/, 'the kernel does read the verdict file');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test('a kernel cat of the package is a read, and is reported as one', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hodos-turns-'));
  try {
    const file = join(dir, 'run.jsonl');
    writeFileSync(file, `${STREAM}\n${use('Bash', { command: 'sed -n 1,40p /tmp/c/review-input.md' })}\n`);

    assert.match(run(file), /review-input\.md: 1 read, 2 mentioned/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// Stage 7 criterion 4: a verify fix is not re-reviewed. What answers it is the
// kernel's own dispatches — which agent, how many times — because a second
// reviewer after a Verify line is the whole failure the criterion names.

test('kernel dispatches are counted by agent, and a subagent never dispatches', () => {
  const dir = mkdtempSync(join(tmpdir(), 'hodos-turns-'));
  try {
    const file = join(dir, 'run.jsonl');
    writeFileSync(
      file,
      `${STREAM}\n${use('Agent', { subagent_type: 'hodos:hodos-verifier', prompt: 'Verify orders-summary.' })}\n` +
        `${use('Agent', { subagent_type: 'hodos:hodos-reviewer', prompt: 'nested' }, 'toolu_someones_child')}\n`,
    );
    const out = run(file);
    assert.match(out, /dispatches: 2/);
    assert.match(out, /hodos:hodos-reviewer x1/);
    assert.match(out, /hodos:hodos-verifier x1/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
