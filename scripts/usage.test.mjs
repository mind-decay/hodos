// Transcripts are generated in temp dirs, never committed (COMPONENTS.md §3).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { summarize, transcriptPath } from './usage.mjs';
import { tempDir } from './temp-dir.mjs';

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

/**
 * A fake ~/.claude/projects holding `transcripts` keyed by session id, and each
 * session's `subagents` keyed by agent file name, where Claude Code writes them.
 */
function home(transcripts, subagents = {}) {
  const root = tempDir('hodos-usage-');
  const projects = join(root, '.claude', 'projects', '-Users-someone-repo');
  mkdirSync(projects, { recursive: true });
  for (const [session, lines] of Object.entries(transcripts)) {
    writeFileSync(join(projects, `${session}.jsonl`), `${lines}\n`);
  }
  for (const [session, agents] of Object.entries(subagents)) {
    const dir = join(projects, session, 'subagents');
    mkdirSync(dir, { recursive: true });
    for (const [agent, lines] of Object.entries(agents)) {
      writeFileSync(join(dir, `${agent}.jsonl`), `${lines}\n`);
      writeFileSync(join(dir, `${agent}.meta.json`), '{"agentType":"hodos:hodos-verifier","spawnDepth":1}\n');
    }
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

test('a message streamed over several lines is counted at its final usage, not its first line', () => {
  // A subagent transcript writes a thinking block's line before the message has
  // finished, so that line's output count is partial: seen in this machine's
  // transcripts as 8 then 177, and 4 then 28 726, on one message id each
  // (PLATFORM-NOTES.md fact 60). The cache and input counts are the same on
  // every line; only the output grows.
  const partial = (id, output, cacheRead) =>
    JSON.stringify({
      type: 'assistant',
      isSidechain: true,
      message: { id: `msg_${id}`, usage: { input_tokens: 3, output_tokens: output, cache_read_input_tokens: cacheRead, cache_creation_input_tokens: 0 } },
    });
  const root = home(
    { 'sess-a': message('1', { input: 10, output: 5 }) },
    { 'sess-a': { 'agent-a1': [partial('2', 8, 900), partial('2', 177, 900), partial('3', 4, 950), partial('3', 28726, 950)].join('\n') } },
  );

  assert.deepEqual(summarize(['sess-a'], root), { sessions: 1, missing: 0, input: 16, output: 28908, cacheRead: 1850, cacheCreation: 0 });
});

test('a sidechain line inside the session transcript is counted like any other', () => {
  const root = home({
    'sess-a': [
      message('1', { input: 10, output: 5 }),
      message('2', { input: 200, output: 300 }, { sidechain: true }),
    ].join('\n'),
  });

  assert.equal(summarize(['sess-a'], root).input, 210);
});

test('subagent messages count: Claude Code writes each subagent beside the session, in <session>/subagents/', () => {
  // PLATFORM-NOTES.md fact 58: the session's own file holds none of them, so a
  // sum over that file alone leaves out every research, review and verify dispatch.
  const root = home(
    { 'sess-a': message('1', { input: 10, output: 5 }) },
    {
      'sess-a': {
        'agent-a1': message('2', { input: 200, output: 300 }, { sidechain: true }),
        'agent-a2': message('3', { input: 4000, cacheRead: 50 }, { sidechain: true, blocks: 3 }),
      },
    },
  );

  const out = summarize(['sess-a'], root);

  assert.deepEqual(out, { sessions: 1, missing: 0, input: 4210, output: 305, cacheRead: 50, cacheCreation: 0 });
});

test('a message id is counted once across the session file and every subagent file', () => {
  // A depth-2 agent's transcript repeats message ids from its parent agent's
  // file (seen on this machine: 12 ids in one session), and a subagent file can
  // repeat the session's own.
  const root = home(
    { 'sess-a': message('1', { input: 10 }) },
    {
      'sess-a': {
        'agent-parent': [message('1', { input: 10 }), message('2', { input: 200 })].join('\n'),
        'agent-child': [message('2', { input: 200 }), message('3', { input: 3000 })].join('\n'),
      },
    },
  );

  assert.equal(summarize(['sess-a'], root).input, 3210);
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
