#!/usr/bin/env node
// verify-citations.mjs — `file:line` citations resolve to a real, non-blank line.
//
// Incident behind the check: a rule keeps its authority only while its
// precedent exists. Rules written against code that has since moved cite lines
// that are blank or gone, the model reads a confident rule with a dead
// precedent, and nothing in the session says so (DESIGN.md §8, AUTHORING.md §10).
//
// The detector is deliberately narrow. A branch name (`feature/x-1.2`), member
// access (`ctx.spy`), a URL with a port, and a spec reference (`§6`) are not
// citations, and reporting them would train the reader to ignore this output.
//
// A precedent that carries an anchor is checked twice over: the line still
// exists, and the text the rule quoted is still on it (decision 0078). That is
// what turns detection into repair — a moved anchor names the line it moved to,
// which is what --prune and init --refresh re-point the citation to.

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, isAbsolute, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// A path with an extension, then :line or :line-line. The path may not start
// with a slash: an absolute path in prose is a machine's, not a repository's.
const CITATION = /(?<![\w/:.-])([\w.-]+(?:\/[\w.-]+)*\.[A-Za-z][\w]*):(\d+)(?:-(\d+))?(?![\w:-])/g;

const USAGE = `Usage: node scripts/verify-citations.mjs <file...> [--root <dir>]

Checks that every file:line and file:line-line citation in the given files
points at a line that exists and is not blank, and that every anchored
precedent under a "## Precedents" block still sits on the line it names.

  --root <dir>   resolve citations against <dir> (default: the git root above
                 each file, or the current directory).
  --help         print this and exit 0.

Exit codes: 0 — every citation and anchor resolves; 1 — at least one does not,
listed on stdout; 2 — bad invocation.`;

const isDir = (path) => {
  try {
    return statSync(path).isDirectory();
  } catch {
    return false;
  }
};

/** The git root above `from`, or `from` itself when there is none. */
export function repoRoot(from) {
  let dir = resolve(isDir(from) ? from : dirname(from));
  for (;;) {
    if (isDir(join(dir, '.git'))) return dir;
    const parent = dirname(dir);
    if (parent === dir) return resolve(isDir(from) ? from : dirname(from));
    dir = parent;
  }
}

/** Every citation in `text`, with the line of the text it sits on. */
export function citations(text) {
  const out = [];
  text.split('\n').forEach((line, index) => {
    for (const m of line.matchAll(CITATION)) {
      out.push({
        raw: m[0],
        path: m[1],
        start: Number(m[2]),
        end: m[3] === undefined ? Number(m[2]) : Number(m[3]),
        line: index + 1,
      });
    }
  });
  return out;
}

/** The reason a citation does not resolve under `root`, or null. */
export function checkCitation(citation, root) {
  const target = isAbsolute(citation.path) ? citation.path : join(root, citation.path);
  let text;
  try {
    text = readFileSync(target, 'utf8');
  } catch {
    return 'no such file';
  }
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  if (citation.end < citation.start) return 'the range runs backwards';
  if (citation.start < 1 || citation.end > lines.length) {
    return `the file has ${lines.length} lines`;
  }
  // A blank line inside a span is ordinary code; a span that is nothing but
  // blank lines cites nothing at all.
  const span = lines.slice(citation.start - 1, citation.end);
  if (span.every((l) => l.trim() === '')) {
    return span.length === 1 ? 'that line is blank' : 'those lines are blank';
  }
  return null;
}

/** Dead citations in one file, as `{ file, line, raw, reason }`. */
export function verifyFile(path, rootOverride) {
  const root = rootOverride ?? repoRoot(path);
  const text = readFileSync(path, 'utf8');
  const dead = [];
  for (const citation of citations(text)) {
    const reason = checkCitation(citation, root);
    if (reason) dead.push({ file: path, line: citation.line, raw: citation.raw, reason });
  }
  return dead;
}

// A precedent's anchor: the text of the line it cites, carried in a
// `## Precedents` block so the check can say where the code went rather than
// only that the cited line is not blank (decision 0078, AUTHORING.md §10).
// The text is written in backticks, which keeps a code line out of markdown's
// way inside a list or a table, and the comparison strips them. The citation
// may be backticked too, which is how a rule written by `init` reads.
const ENTRY = /^-[ \t]+`?([\w.-]+(?:\/[\w.-]+)*\.[A-Za-z][\w]*):(\d+)(?:-(\d+))?`?[ \t]+—[ \t]+(.+?)[ \t]*$/;
const PRECEDENTS = /^#{1,6}[ \t]+Precedents[ \t]*$/;
const HEADING = /^#{1,6}[ \t]/;

/**
 * The text an entry anchors on, without the backticks that wrap it. The
 * wrapper is as many backticks as the writer needed, because a code line can
 * carry one of its own — a template literal does.
 */
const bare = (text) => {
  const trimmed = text.trim();
  const open = /^`+/.exec(trimmed)?.[0].length ?? 0;
  if (open === 0) return trimmed;
  const close = /`+$/.exec(trimmed)?.[0].length ?? 0;
  if (close < open) return trimmed;
  return trimmed.slice(open, trimmed.length - open).trim();
};

/** Every anchored precedent in `text`: the entries of its `## Precedents` block. */
export function anchors(text) {
  const out = [];
  let inside = false;
  text.split('\n').forEach((line, index) => {
    if (HEADING.test(line)) {
      inside = PRECEDENTS.test(line);
      return;
    }
    if (!inside) return;
    const m = ENTRY.exec(line);
    if (!m) return;
    const span = m[3] === undefined ? '' : `-${m[3]}`;
    out.push({
      raw: `${m[1]}:${m[2]}${span}`,
      path: m[1],
      start: Number(m[2]),
      end: m[3] === undefined ? Number(m[2]) : Number(m[3]),
      anchor: bare(m[4]),
      line: index + 1,
    });
  });
  return out;
}

/**
 * Where the anchored code is now, or null when it is where the entry says.
 * A range anchors on its first line, so a re-point shifts both ends by the
 * same delta. Several matches offer no re-point: choosing one of them is the
 * plausible line number `skills/status/references/prune.md` exists to refuse.
 */
export function checkAnchor(entry, root) {
  const target = isAbsolute(entry.path) ? entry.path : join(root, entry.path);
  let text;
  try {
    text = readFileSync(target, 'utf8');
  } catch {
    return { reason: 'no such file' };
  }
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const at = lines[entry.start - 1];
  if (at !== undefined && at.trim() === entry.anchor) return null;

  const found = [];
  lines.forEach((line, index) => {
    if (line.trim() === entry.anchor) found.push(index + 1);
  });
  if (found.length === 0) return { reason: 'the anchor is gone from the file' };
  if (found.length === 1) return { reason: `the anchor is now at line ${found[0]}`, movedTo: found[0] };
  const shown = found.slice(0, 3).join(', ') + (found.length > 3 ? ', …' : '');
  return { reason: `the anchor matches ${found.length} lines (${shown}) — re-point by hand` };
}

/** Rotted anchors in one file, as `{ file, line, raw, reason, movedTo? }`. */
export function verifyAnchors(path, rootOverride) {
  const root = rootOverride ?? repoRoot(path);
  const text = readFileSync(path, 'utf8');
  const rotted = [];
  for (const entry of anchors(text)) {
    // A cause the line check already names in full — a missing file, a line
    // past the file's end — is one finding, not two. A line gone *blank* is
    // the opposite case: it is where the anchor check has the better answer,
    // because the code that was there has usually moved rather than gone.
    const dead = checkCitation(entry, root);
    if (dead && !dead.endsWith('blank')) continue;
    const moved = checkAnchor(entry, root);
    if (moved) rotted.push({ file: path, line: entry.line, raw: entry.raw, ...moved });
  }
  return rotted;
}

// A bare path — a path with no `:line` behind it — is not a citation, and the
// `CLAUDE.md` map is written almost entirely out of them (decision 0078). The
// widening keeps this file's narrowness discipline: a code span is a path only
// when it cannot be anything else. A placeholder (`<name>`, `{slug}`), a glob,
// a URL, a command, a module specifier, a path relative to the file that
// names it, and anything
// inside a fenced example are all left alone — as is a bare filename, which
// resolves against a directory the reader is expected to be standing in.
const SPAN = /`([^`\n]+)`/g;
const FENCE = /^[ \t]*(?:```|~~~)/;
const BARE = /^[\w.-]+(?:\/[\w.-]+)*\/?$/;
const NAMES_A_FILE = /(?:\/|\.[A-Za-z][\w]*)$/;
const RELATIVE = /^\.{1,2}\//;

/** Every bare path in `text`, with the line it sits on. */
export function barePaths(text) {
  const out = [];
  let fenced = false;
  text.split('\n').forEach((line, index) => {
    if (FENCE.test(line)) {
      fenced = !fenced;
      return;
    }
    if (fenced) return;
    for (const m of line.matchAll(SPAN)) {
      const value = m[1].trim();
      if (!value.includes('/') || !BARE.test(value) || RELATIVE.test(value)) continue;
      // A module specifier — `features/orders/ui/OrderList` — is a path with
      // neither an extension nor a trailing slash, and it resolves through a
      // bundler rather than in the filesystem. Only a directory (ending in /)
      // or a file (carrying an extension) is checked.
      if (!NAMES_A_FILE.test(value)) continue;
      out.push({ raw: value, path: value.replace(/\/$/, ''), line: index + 1 });
    }
  });
  return out;
}

/** Bare paths of one file that no longer exist under `root`. */
export function verifyBarePaths(path, rootOverride) {
  const root = rootOverride ?? repoRoot(path);
  const text = readFileSync(path, 'utf8');
  const missing = [];
  for (const named of barePaths(text)) {
    if (existsSync(join(root, named.path))) continue;
    missing.push({ file: path, line: named.line, raw: named.raw, reason: 'no such file or directory' });
  }
  return missing;
}

function main(argv) {
  const files = [];
  let root;
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    }
    if (arg === '--root') {
      root = argv[i + 1];
      if (!root) {
        process.stderr.write(`verify-citations: --root needs a directory\n${USAGE}\n`);
        return 2;
      }
      i += 1;
      continue;
    }
    files.push(arg);
  }
  if (files.length === 0) {
    process.stderr.write(`verify-citations: name at least one file\n${USAGE}\n`);
    return 2;
  }

  let checked = 0;
  let anchored = 0;
  const dead = [];
  const rotted = [];
  for (const file of files) {
    let text;
    try {
      text = readFileSync(file, 'utf8');
    } catch {
      process.stderr.write(`verify-citations: cannot read ${file}\n`);
      return 2;
    }
    checked += citations(text).length;
    anchored += anchors(text).length;
    dead.push(...verifyFile(file, root));
    rotted.push(...verifyAnchors(file, root));
  }

  for (const d of [...dead, ...rotted]) {
    process.stdout.write(`${d.file}:${d.line}: ${d.raw} — ${d.reason}\n`);
  }
  process.stdout.write(
    dead.length === 0
      ? `citations: ${checked} resolve\n`
      : `citations: ${dead.length} of ${checked} do not resolve\n`,
  );
  // A file with no `## Precedents` block says nothing about anchors: a count
  // of zero would train the reader to skim the line that matters.
  if (anchored > 0) {
    process.stdout.write(
      rotted.length === 0
        ? `anchors: ${anchored} resolve\n`
        : `anchors: ${rotted.length} of ${anchored} moved or gone\n`,
    );
  }
  return dead.length + rotted.length === 0 ? 0 : 1;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
