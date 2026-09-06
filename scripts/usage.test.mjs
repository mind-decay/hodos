// Transcripts are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, realpathSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { summarize, transcriptPath } from './usage.mjs';

const USAGE = fileURLToPath(new URL('./usage.mjs', import.meta.url));

/** One assistant message as Claude Code writes it, repeated per content block. */
function message(id, usage, { sidechain = false, blocks = 1 } = {}) {
  return Array.from({ length: blocks }, () =>
    JSON.stringify({
      type: 'assistant',
      isSidechain: sidechain,
      requestId: `req_${id}`,
      message: {
        id: `msg_${id}`,
        usage: {
          input_tokens: usage.input ?? 0,
          output_tokens: usage.output ?? 0,
          cache_read_input_tokens: usage.cacheRead ?? 0,
          cache_creation_input_tokens: usage.cacheCreation ?? 0,
        },
      },
    }),
  ).join('\n');
}

/** A fake ~/.claude/projects holding `transcripts` keyed by session id. */
function home(transcripts) {
  const root = realpathSync(mkdtempSync(join(tmpdir(), 'hodos-usage-')));
  const projects = join(root, '.claude', 'projects', '-Users-someone-repo');
  mkdirSync(projects, { recursive: true });
  for (const [session, lines] of Object.entries(transcripts)) {
    writeFileSync(join(projects, `${session}.jsonl`), `${lines}\n`);
  }
  return root;
}

test('summarize sums the token counts of a session', () => {
  const root = home({ 'sess-a': message('1', { input: 10, output: 5, cacheRead: 100, cacheCreation: 20 }) });

  const out = summarize(['sess-a'], root);

  assert.deepEqual(out, { sessions: 1, missing: 0, input: 10, output: 5, cacheRead: 100, cacheCreation: 20 });
});

test('an assistant message is counted once however many content blocks carry its usage', () => {
  // Claude Code repeats one message's usage block on every content-block line;
  // summing the lines instead of the messages doubles the answer.
  const root = home({ 'sess-a': message('1', { input: 10, output: 5 }, { blocks: 4 }) });

  assert.equal(summarize(['sess-a'], root).input, 10);
  assert.equal(summarize(['sess-a'], root).output, 5);
});

test('subagent messages count: they are in the session that dispatched them', () => {
  const root = home({
    'sess-a': [
      message('1', { input: 10, output: 5 }),
      message('2', { input: 200, output: 300 }, { sidechain: true }),
    ].join('\n'),
  });

  assert.equal(summarize(['sess-a'], root).input, 210);
});

test('summarize adds up several sessions and counts the ones it could not read', () => {
  const root = home({ 'sess-a': message('1', { input: 10 }), 'sess-b': message('2', { input: 7 }) });

  const out = summarize(['sess-a', 'sess-b', 'sess-gone'], root);

  assert.equal(out.sessions, 3);
  assert.equal(out.missing, 1);
  assert.equal(out.input, 17);
});

test('summarize returns null when it could read nothing — never a wrong number', () => {
  const root = home({});

  assert.equal(summarize(['sess-gone'], root), null);
  assert.equal(summarize([], root), null);
});

test('a line that is not JSON is skipped, not fatal', () => {
  const root = home({ 'sess-a': `not json\n${message('1', { input: 10 })}` });

  assert.equal(summarize(['sess-a'], root).input, 10);
});

test('transcriptPath finds the file under whichever project directory holds it', () => {
  const root = home({ 'sess-a': message('1', {}) });

  // The path it returns is the one `readFileSync` takes, so its separator is
  // the platform's; what the test pins is which file was found.
  assert.match(transcriptPath('sess-a', root), /-Users-someone-repo[\\/]sess-a\.jsonl$/);
  assert.equal(transcriptPath('sess-gone', root), null);
});

test('the CLI prints the summary as JSON', () => {
  const root = home({ 'sess-a': message('1', { input: 10, output: 5 }) });
  const out = spawnSync(process.execPath, [USAGE, 'sess-a'], {
    encoding: 'utf8',
    env: { ...process.env, HOME: root, USERPROFILE: root },
  });

  assert.equal(out.status, 0, out.stderr);
  assert.equal(JSON.parse(out.stdout).input, 10);
});

test('the CLI with no session id exits 2, and --help exits 0', () => {
  assert.equal(spawnSync(process.execPath, [USAGE], { encoding: 'utf8' }).status, 2);
  const help = spawnSync(process.execPath, [USAGE, '--help'], { encoding: 'utf8' });
  assert.equal(help.status, 0);
  assert.match(help.stdout, /Usage: node scripts\/usage\.mjs/);
});
