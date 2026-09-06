#!/usr/bin/env node
// kernel-turns.mjs — what the run kernel itself did, out of a stream-json log.
//
// Criterion 3 of Stage 6 asks that the kernel never reads review-input.md or
// the diff: the reading is the reviewer's, in a fresh context. A subagent's
// tool uses appear in the parent's stream too, carrying parent_tool_use_id, so
// a naive count of `cat review-input.md` in the log counts the reviewer's reads
// as the kernel's — which is the misread that cost a loop run (06-report.md,
// Not done). Kernel turns are the ones with parent_tool_use_id null.
//
// Usage: node bench/run/runs/kernel-turns.mjs <run.jsonl> [--list]

import { readFileSync } from 'node:fs';

// A function rather than a top-level guard: an early `process.exit` truncates
// a pending write to a pipe, and every script here returns its code instead
// (scripts/cli-exit.test.mjs).
function main(argv) {
  const [file, ...flags] = argv;
  if (!file) {
    process.stderr.write('Usage: node bench/run/runs/kernel-turns.mjs <run.jsonl> [--list]\n');
    return 2;
  }

  const uses = [];
  for (const line of readFileSync(file, 'utf8').split('\n')) {
    if (line.trim() === '') continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      continue;
    }
    if (event.type !== 'assistant' || event.parent_tool_use_id != null) continue;
    for (const block of event.message?.content ?? []) {
      if (block.type !== 'tool_use') continue;
      const text = JSON.stringify(block.input ?? {});
      uses.push({ name: block.name, text });
    }
  }

  const READERS = new Set(['Read', 'Grep', 'Glob', 'NotebookRead']);
  const SHELL_READ = /\b(cat|head|tail|sed|less|more|grep|rg|awk)\b/;

  /** A tool use that would put the file's content in the kernel's context. */
  const readsPath = (use, path) =>
    use.text.includes(path) &&
    (READERS.has(use.name) || (use.name === 'Bash' && SHELL_READ.test(use.text)));

  const mentions = (path) => uses.filter((u) => u.text.includes(path));
  const reads = (path) => uses.filter((u) => readsPath(u, path));

  process.stdout.write(`kernel tool uses: ${uses.length}\n`);
  for (const path of ['review-input.md', 'review.md']) {
    process.stdout.write(
      `  ${path}: ${reads(path).length} read, ${mentions(path).length} mentioned\n`,
    );
  }
  // Which agents this kernel dispatched, and how many times each. Stage 7's
  // criterion 4 — a verify fix is not re-reviewed — is answered here: a second
  // hodos-reviewer after the verify loop opened would show up as a count.
  const dispatches = uses.filter((u) => u.name === 'Agent');
  const byAgent = new Map();
  for (const u of dispatches) {
    const type = /"subagent_type":"([^"]+)"/.exec(u.text)?.[1] ?? 'unknown';
    byAgent.set(type, (byAgent.get(type) ?? 0) + 1);
  }
  process.stdout.write(`  dispatches: ${dispatches.length}\n`);
  for (const [type, n] of [...byAgent].sort()) process.stdout.write(`    ${type} x${n}\n`);

  const diffs = uses.filter((u) => u.name === 'Bash' && /git diff/.test(u.text));
  process.stdout.write(`  git diff in a kernel command: ${diffs.length}\n`);
  if (flags.includes('--list')) {
    for (const u of [...mentions('review-input.md'), ...diffs]) {
      process.stdout.write(`  ${u.name}: ${u.text.slice(0, 150)}\n`);
    }
  }


  return 0;
}

process.exitCode = main(process.argv.slice(2));
