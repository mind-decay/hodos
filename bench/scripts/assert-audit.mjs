#!/usr/bin/env node
// Counts assertion macro calls in Rust sources and how many carry no message.
//
// The pilot's `quick` arm pairs test files by how much of this work each one
// holds (`docs/PILOT.md §3`), so the count has to be one stated definition a
// reader can re-run rather than a grep whose answer depends on line breaks.
//
// Definition. A call is `assert!`, `assert_eq!` or `assert_ne!` reached as a
// whole macro name — `debug_assert!`, `assert_matches!`, `assert_snapshot!` and
// any `*_assert!` of somebody else's are not counted. A call is **bare** when
// its argument list holds no message argument: one argument for `assert!`, two
// for `assert_eq!` and `assert_ne!`. Arguments are split at top-level commas
// only, so a comma inside a string, a char literal or a nested call does not
// split one. Line comments, block comments — which nest, as Rust's do — string
// bodies and char literals are skipped by one shared reader, so a mention of
// `assert!(x)` in prose, in a string or behind a comment is not a call, and a
// comma inside any of them does not split an argument list.
//
// Two limits it does not cover, neither of which occurs in the pilot's tree.
// Only the `(` delimiter is read, so `assert_eq!{a, b}` and `assert_eq![a, b]`
// are not counted (`grep -rnE '\\bassert(_eq|_ne)?!\\s*[{[]'` → 0 matches).
// And `assert-message.md` exempts `proptest!` bodies as well as `insta`
// snapshots; only the snapshots are exempt here, because they are exempt by
// macro name. Nine files under `crates/*/tests/` carry a `proptest!`, none of
// them a file this count selects, and an exemption can only lower a row.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const MACROS = new Map([
  ['assert', 1],
  ['assert_eq', 2],
  ['assert_ne', 2],
]);

const isIdent = (c) => /[A-Za-z0-9_]/.test(c);

/**
 * Split a macro argument list at top-level commas.
 *
 * A comma is top-level when it sits outside every bracket, outside a turbofish,
 * and outside a string, char literal or comment. The turbofish matters because
 * `assert!(HashMap::<K, V>::new().is_empty())` is bare and a naive split reads
 * it as two arguments and scores it as carrying a message — an error in the
 * direction of the count that picks the pairs. Only `::<` opens an angle group,
 * so the comparison in `assert!(a < b, "why")` opens nothing and its message is
 * still found. A nested generic inside the turbofish — `::<Vec<(K, V)>>` — needs
 * no counting of its own: the group stays open until the first `>`, which comes
 * after everything the nesting could hold, so no comma is ever exposed.
 */
function topLevelArgs(text) {
  const args = [];
  let depth = 0;
  let angle = 0;
  let current = '';
  let i = 0;
  while (i < text.length) {
    const c = text[i];
    const end = skipTrivia(text, i);
    if (end !== null) {
      current += text.slice(i, end);
      i = end;
      continue;
    }
    if (c === '(' || c === '[' || c === '{') depth += 1;
    else if (c === ')' || c === ']' || c === '}') depth -= 1;
    else if (c === '<' && text[i - 1] === ':' && text[i - 2] === ':') angle += 1;
    else if (c === '>' && angle > 0) angle -= 1;
    if (c === ',' && depth === 0 && angle === 0) {
      args.push(current.trim());
      current = '';
      i += 1;
      continue;
    }
    current += c;
    i += 1;
  }
  if (current.trim() !== '') args.push(current.trim());
  return args;
}

function skipString(text, i) {
  let j = i + 1;
  while (j < text.length) {
    if (text[j] === '\\') { j += 2; continue; }
    if (text[j] === '"') return j + 1;
    j += 1;
  }
  return text.length;
}

/**
 * Where the string literal whose quote is at `i` ends, or null when `i` is not
 * one. Covers the plain form, the raw form with any number of hashes — `r"…"`,
 * `r#"…"#`, `r##"…"##` — and the byte forms `b"…"` and `br#"…"#`. A raw
 * string's body may hold quotes, commas and whole macro calls, and 97 of the
 * pilot's test files use one, so a scanner that reads it as code miscounts.
 *
 * The `b` of a byte string needs no branch: `b"…"` escapes exactly as a plain
 * string does, and the `r` of `br#"…"#` is what the lookbehind matches.
 */
function stringEnd(text, i) {
  if (text[i] !== '"') return null;
  const prefix = /r(#*)$/.exec(text.slice(Math.max(0, i - 34), i));
  if (!prefix) return skipString(text, i);
  const terminator = `"${prefix[1]}`;
  const at = text.indexOf(terminator, i + 1);
  return at === -1 ? text.length : at + terminator.length;
}

/** Where the block comment opening at `i` ends. Rust's block comments nest. */
function skipBlockComment(text, i) {
  let depth = 0;
  let j = i;
  while (j < text.length) {
    if (text[j] === '/' && text[j + 1] === '*') { depth += 1; j += 2; continue; }
    if (text[j] === '*' && text[j + 1] === '/') {
      depth -= 1;
      j += 2;
      if (depth === 0) return j;
      continue;
    }
    j += 1;
  }
  return text.length;
}

/**
 * Where the comment, string or char literal at `i` ends, or null when code
 * starts there. The one reader all three scanners use: the top-level scan that
 * finds the calls, the paren matcher that finds a call's end, and the argument
 * splitter. They disagreed once — the top-level scan had no char-literal
 * branch, so a `'"'` in a source file swallowed every call after it into a
 * phantom string — and one reader is what makes that impossible rather than
 * unlikely. A line comment ends *at* its newline, which the caller then counts.
 */
function skipTrivia(text, i) {
  const c = text[i];
  if (c === '/' && text[i + 1] === '/') {
    let j = i;
    while (j < text.length && text[j] !== '\n') j += 1;
    return j;
  }
  if (c === '/' && text[i + 1] === '*') return skipBlockComment(text, i);
  if (c === '"') return stringEnd(text, i);
  if (c === "'" && isCharLiteral(text, i)) return skipCharLiteral(text, i);
  return null;
}

const isCharLiteral = (text, i) => /^'(\\.|[^'\\])'/.test(text.slice(i));
function skipCharLiteral(text, i) {
  const m = /^'(\\.|[^'\\])'/.exec(text.slice(i));
  return m ? i + m[0].length : i + 1;
}

/** Count calls and bare calls in one Rust source. */
export function auditSource(src) {
  let total = 0;
  const bareLines = [];
  let i = 0;
  let line = 1;
  while (i < src.length) {
    const c = src[i];
    if (c === '\n') { line += 1; i += 1; continue; }
    const skip = skipTrivia(src, i);
    if (skip !== null) {
      for (let k = i; k < skip; k += 1) if (src[k] === '\n') line += 1;
      i = skip;
      continue;
    }
    if (!isIdent(c)) { i += 1; continue; }
    // A word is always read whole, and every skip above lands on a boundary,
    // so the scan never starts inside an identifier: `my_assert!(a)` is read
    // as one word and rejected by name.
    let j = i;
    while (j < src.length && isIdent(src[j])) j += 1;
    const word = src.slice(i, j);
    if (!MACROS.has(word) || src[j] !== '!' || src[j + 1] !== '(') { i = j; continue; }
    // A path-qualified call — `insta::assert_debug_snapshot!` — never matches,
    // because the word before `::` is not one of the three names.
    const open = j + 1;
    const close = matchParen(src, open);
    const inner = src.slice(open + 1, close);
    const args = topLevelArgs(inner);
    total += 1;
    if (args.length <= MACROS.get(word)) bareLines.push(line);
    for (let k = i; k < close; k += 1) if (src[k] === '\n') line += 1;
    i = close;
  }
  return { total, bare: bareLines.length, bareLines };
}

function matchParen(text, open) {
  let depth = 0;
  let i = open;
  while (i < text.length) {
    const c = text[i];
    const end = skipTrivia(text, i);
    if (end !== null) { i = end; continue; }
    if (c === '(') depth += 1;
    else if (c === ')') { depth -= 1; if (depth === 0) return i; }
    i += 1;
  }
  return text.length;
}

/** Audit every Rust file under a `tests` directory below `root`, worst first. */
export function auditTree(root, subdir = 'crates') {
  const rows = [];
  const walk = (dir) => {
    let entries;
    try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
    for (const e of entries) {
      const p = join(dir, e.name);
      if (e.isDirectory()) { walk(p); continue; }
      if (!e.name.endsWith('.rs')) continue;
      const rel = relative(root, p).split(sep).join('/');
      if (!rel.split('/').includes('tests')) continue;
      const r = auditSource(readFileSync(p, 'utf8'));
      rows.push({ file: rel, total: r.total, bare: r.bare, bareLines: r.bareLines });
    }
  };
  const start = join(root, subdir);
  try { if (statSync(start).isDirectory()) walk(start); } catch { return rows; }
  return rows.sort((a, b) => b.bare - a.bare || a.file.localeCompare(b.file));
}

/** The CLI: print one row per file with a bare count, then the totals. */
export function main(args) {
  if (args[0] === '--help') {
    console.log(`Usage: node bench/scripts/assert-audit.mjs [<repository root>]

Counts \`assert!\`, \`assert_eq!\` and \`assert_ne!\` calls under
<root>/crates/**/tests/**.rs and how many carry no message argument. Prints one
row per file with a bare count above zero, worst first, then the totals.

A call spanning several lines is one call; a comma inside a string, a char
literal or a nested call does not split arguments; \`debug_assert!\`,
\`assert_matches!\` and any path-qualified macro are not counted.`);
    return 0;
  }
  const root = args[0] ?? process.cwd();
  const rows = auditTree(root);
  let total = 0;
  let bare = 0;
  for (const r of rows) {
    total += r.total;
    bare += r.bare;
    if (r.bare > 0) console.log(`${r.bare}\t${r.total}\t${r.file}`);
  }
  console.log(`--\nbare ${bare} of ${total} in ${rows.length} files`);
  return 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  process.exitCode = main(process.argv.slice(2));
}
