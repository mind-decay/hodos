#!/usr/bin/env node
// lint.mjs — the engine's text checks: frontmatter, caps, structure, citations.
//
// Incident behind the frontmatter parser: a `: ` inside a plain scalar makes
// Claude Code load a skill with empty metadata and no error, so the skill is
// silently invisible (AUTHORING.md §8, PLATFORM-NOTES.md). The caps come from
// AUTHORING.md §7 and are the only cap table this script enforces.
//
// Reference depth and the "cited by its kernel" check exist because a phase
// reference nothing reads is a file the kernel forgot: the procedure lives on
// disk, is read on entering the phase, and a reference no kernel names is
// either dead text or a phase that silently runs from memory (DESIGN.md §4.2).

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { basename, dirname, join, relative, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

import { anchors, citations, checkCitation, repoRoot, verifyAnchors, verifyBarePaths, verifyFile } from './verify-citations.mjs';
import { OPERATION, ROLE_OPERATIONS, declaredOperations, findConfig } from './config.mjs';

const PLUGIN_ROOT = fileURLToPath(new URL('..', import.meta.url));
const SCAN_ROOTS = ['skills', 'agents', 'adapters', 'sources'];

// AUTHORING.md §7. First match wins.
const ARTIFACTS = [
  { kind: 'kernel', cap: 150, re: /^skills\/(task|run|init|campaign)\/SKILL\.md$/ },
  { kind: 'small skill', cap: 100, re: /^skills\/(status|rule|skill|adapter|review|handoff)\/SKILL\.md$/ },
  { kind: 'wait-what', cap: 10, re: /^skills\/wait-what\/SKILL\.md$/ },
  { kind: 'reference', cap: 200, re: /^skills\/[^/]+\/references\/[^/]+\.md$/ },
  { kind: 'agent', cap: 150, re: /^agents\/[^/]+\.md$/ },
  { kind: 'adapter', cap: 30, re: /^adapters\/[^/]+\/[^/]+\.md$/ },
  { kind: 'source', cap: 60, re: /^sources\/[^/]+\.md$/ },
  // --project only: the files init and /hodos:rule write into a project.
  { kind: 'project skill', cap: 100, re: /^\.claude\/skills\/[^/]+\/SKILL\.md$/ },
  { kind: 'project rule', cap: 100, re: /^\.claude\/rules\/.+\.md$/ },
  { kind: 'adapter', cap: 30, re: /^\.claude\/hodos\/adapters\/[^/]+\/[^/]+\.md$/, project: true },
  { kind: 'CLAUDE.md', cap: 60, re: /^CLAUDE\.md$/ },
  { kind: 'plan', cap: Infinity, re: /^\.claude\/hodos\/tasks\/[^/]+\/plan\.md$/ },
];

// A reference below skills/<kernel>/references/ — one level deep is the rule.
const DEEP_REFERENCE = /^skills\/[^/]+\/references\/.+\/.+\.md$/;

// The managed block init writes into an existing CLAUDE.md (COMPONENTS.md §1.3).
const BLOCK_BEGIN = '<!-- hodos:begin -->';
const BLOCK_END = '<!-- hodos:end -->';

const DESCRIPTION_CAP = 500;

// AUTHORING.md §8. Order is part of the subset.
const SKILL_KEYS = ['name', 'description', 'disable-model-invocation', 'argument-hint', 'allowed-tools'];
const AGENT_KEYS = ['name', 'description', 'model', 'maxTurns', 'tools', 'disallowedTools'];
const RULE_KEYS = ['paths'];

// Decision 0022: a task with no `Tests:` line is test-first, which is the
// default; a line exists only to name one of these four, and an exemption is an
// exemption only when it says why and what verifies the task instead.
const TEST_EXEMPTIONS = ['visual', 'glue', 'infra', 'no-harness'];
const EXEMPTION_FORM = '<reason> — <justification> · verified by <what>';

// FORMATS.md §5: plan size is advisory. A plan squeezed to fit loses the detail
// the executor needs, so this warns and never fails.
const PLAN_ADVISORY = 250;

// Decision 0016: these three are call targets and stay model-invocable.
const MODEL_INVOCABLE = new Set(['task', 'campaign', 'rule']);

const USAGE = `Usage: node scripts/lint.mjs [paths...] [--project] [--hook] [--rules]

Checks hodos text against AUTHORING.md §7 (size caps) and §8 (frontmatter
subset), the hodos- prefix on agent names, reference depth, that every phase
reference is named by its kernel, and that file:line citations resolve.

  paths...    files or directories to check; relative to the current directory.
              With no paths, scans skills/ agents/ adapters/ sources/ of the
              plugin root.
  --project   check the current project instead: CLAUDE.md (or its managed
              block), .claude/rules/ and .claude/skills/.
  --hook      read a PostToolUse payload on stdin and report on the file it
              names, as hookSpecificOutput.additionalContext. Always exits 0.
  --rules     report the project's rules as facts, for /hodos:status --prune:
              per rule its size, its precedents and which of them no longer
              resolve, then the layer's total token cost. It judges nothing —
              no rule is called dead, because nothing here measures that
              (decision 0082). Always exits 0.
  --help      print this and exit 0.

Exit codes: 0 — no errors (warnings may be printed), and always with --hook;
1 — at least one error; 2 — bad invocation.`;

/** A bad invocation. Thrown rather than exited, so stderr is flushed first. */
class BadInvocation extends Error {}

function fail(message) {
  process.stderr.write(`${message}\n`);
  throw new BadInvocation(message);
}

/** Every file under `target`, or `target` itself when it is a file. */
function walk(target) {
  let info;
  try {
    info = statSync(target);
  } catch {
    fail(`lint: no such path: ${target}`);
  }
  if (info.isFile()) return [target];
  const out = [];
  for (const entry of readdirSync(target, { withFileTypes: true })) {
    if (entry.name.startsWith('.')) continue;
    const child = join(target, entry.name);
    out.push(...(entry.isDirectory() ? walk(child) : [child]));
  }
  return out.sort();
}

function classify(relPath) {
  return ARTIFACTS.find((a) => a.re.test(relPath)) ?? null;
}

// One quoted scalar, not merely a value that starts and ends with a quote:
// `"Show" state: hygiene "now"` must still reach the `": "` check below.
const isQuoted = (value) => /^"([^"\\]|\\.)*"$/.test(value) || /^'([^'\\]|\\.)*'$/.test(value);

/** One matching pair of surrounding quotes is syntax; the content is inside. */
const unquote = (value) => (isQuoted(value) ? value.slice(1, -1) : value);

/**
 * Parse the flat `key: value` frontmatter subset of AUTHORING.md §8.
 * Returns { present, keys, values, lines, findings } where findings carry the
 * YAML shapes that make Claude Code drop the metadata.
 */
function parseFrontmatter(text) {
  const findings = [];
  const lines = text.split('\n');
  if (lines[0] !== '---') return { present: false, keys: [], values: {}, raw: {}, lines: {}, findings };

  const end = lines.indexOf('---', 1);
  if (end === -1) {
    findings.push({ line: 1, severity: 'error', message: 'frontmatter opens with --- and never closes' });
    return { present: true, keys: [], values: {}, raw: {}, lines: {}, findings };
  }

  const keys = [];
  const values = {};
  const rawValues = {};
  const keyLines = {};
  let currentKey = null;

  for (let i = 1; i < end; i += 1) {
    const raw = lines[i];
    const lineNo = i + 1;
    if (raw.trim() === '') continue;

    if (/^\s*-\s+/.test(raw)) {
      if (currentKey === null) {
        findings.push({ line: lineNo, severity: 'error', message: 'list item before any key' });
        continue;
      }
      const item = unquote(raw.replace(/^\s*-\s+/, ''));
      values[currentKey] = Array.isArray(values[currentKey]) ? [...values[currentKey], item] : [item];
      continue;
    }

    const match = /^([A-Za-z][A-Za-z0-9_-]*):(.*)$/.exec(raw);
    if (!match) {
      findings.push({ line: lineNo, severity: 'error', message: `not a flat "key: value" line: ${raw.trim()}` });
      currentKey = null;
      continue;
    }

    const [, key, rest] = match;
    const value = rest.trim();
    if (keys.includes(key)) {
      findings.push({ line: lineNo, severity: 'error', message: `duplicate key: ${key}` });
    }
    keys.push(key);
    keyLines[key] = lineNo;
    // The stored value is what the platform sees: quotes are YAML syntax, not
    // content, and AUTHORING.md §8 itself writes `argument-hint: "<slug>"`.
    values[key] = unquote(value);
    rawValues[key] = value;
    currentKey = key;

    if (!isQuoted(value) && value.includes(': ')) {
      findings.push({
        line: lineNo,
        severity: 'error',
        message: `": " inside a plain scalar — quote the value, or Claude Code loads this file with empty metadata`,
      });
    }
  }

  return { present: true, keys, values, raw: rawValues, lines: keyLines, findings };
}

function checkSubset(fm, allowed, kindLabel, findings, relPath) {
  for (const key of fm.keys) {
    if (!allowed.includes(key)) {
      findings.push({
        file: relPath,
        line: fm.lines[key] ?? 1,
        severity: 'warn',
        message: `${key} is outside the ${kindLabel} frontmatter subset (${allowed.join(', ')})`,
      });
    }
  }
  const known = fm.keys.filter((k) => allowed.includes(k));
  const expected = allowed.filter((k) => known.includes(k));
  if (known.join(',') !== expected.join(',')) {
    findings.push({
      file: relPath,
      line: fm.lines[known[0]] ?? 1,
      severity: 'warn',
      message: `frontmatter order is ${known.join(', ')}; AUTHORING.md §8 orders it ${expected.join(', ')}`,
    });
  }
}

function checkSkill(relPath, fm, findings) {
  // The directory holding SKILL.md, whether that is skills/<slug>/ here or
  // .claude/skills/<slug>/ in a project.
  const slug = relPath.split('/').at(-2);
  checkSubset(fm, SKILL_KEYS, 'skill', findings, relPath);

  for (const key of ['name', 'description']) {
    if (!fm.keys.includes(key)) {
      findings.push({ file: relPath, line: 1, severity: 'error', message: `missing frontmatter key: ${key}` });
    }
  }

  const name = fm.values.name;
  if (typeof name === 'string' && name !== slug) {
    findings.push({
      file: relPath,
      line: fm.lines.name ?? 1,
      severity: 'error',
      message: `name is "${name}"; the directory is "${slug}" — the invocation is /hodos:<directory>`,
    });
  }

  const description = fm.values.description;
  if (typeof description === 'string' && description.length > DESCRIPTION_CAP) {
    findings.push({
      file: relPath,
      line: fm.lines.description ?? 1,
      severity: 'error',
      message: `description is ${description.length} chars, cap ${DESCRIPTION_CAP} (AUTHORING.md §7)`,
    });
  }

  // The raw token, not the unquoted value: `"true"` is a YAML string, and
  // whether Claude Code coerces it before testing the gate is unverified. A
  // skill that is silently model-invocable is the failure class this parser
  // exists for, so only the bare boolean passes.
  const gate = fm.raw['disable-model-invocation'];
  if (MODEL_INVOCABLE.has(slug)) {
    if (gate !== undefined) {
      findings.push({
        file: relPath,
        line: fm.lines['disable-model-invocation'],
        severity: 'error',
        message: `${slug} is a call target (decision 0016) and must omit disable-model-invocation`,
      });
    }
  } else if (gate !== 'true') {
    findings.push({
      file: relPath,
      line: fm.lines['disable-model-invocation'] ?? 1,
      severity: 'error',
      message: 'disable-model-invocation: true is required on every skill outside task, campaign, rule',
    });
  }
}

function checkAgent(relPath, fm, findings) {
  checkSubset(fm, AGENT_KEYS, 'agent', findings, relPath);

  for (const key of ['name', 'description']) {
    if (!fm.keys.includes(key)) {
      findings.push({ file: relPath, line: 1, severity: 'error', message: `missing frontmatter key: ${key}` });
    }
  }

  const name = fm.values.name;
  if (typeof name === 'string' && !name.startsWith('hodos-')) {
    findings.push({
      file: relPath,
      line: fm.lines.name ?? 1,
      severity: 'error',
      message: `agent name "${name}" lacks the hodos- prefix (AUTHORING.md §8)`,
    });
  }

  // The dispatch bound is the definition's, not the project's: the Agent tool
  // takes no maxTurns and a plugin agent's frontmatter is the only place that
  // holds one (PLATFORM-NOTES.md facts 36 and 40, decision 0044). A bound that
  // is not a whole number is a bound the platform ignores.
  const turns = fm.values.maxTurns;
  if (turns !== undefined && !/^[1-9]\d*$/.test(String(turns))) {
    findings.push({
      file: relPath,
      line: fm.lines.maxTurns ?? 1,
      severity: 'error',
      message: `maxTurns "${turns}" is not a positive whole number (AUTHORING.md §8)`,
    });
  }

  const base = relPath.split('/').pop().replace(/\.md$/, '');
  if (typeof name === 'string' && name !== base) {
    findings.push({
      file: relPath,
      line: fm.lines.name ?? 1,
      severity: 'warn',
      message: `name "${name}" differs from the file name "${base}"`,
    });
  }
}

/**
 * The lines a cap applies to: a CLAUDE.md with hodos markers is measured by its
 * managed block, because the rest of the file is the project's, not ours.
 */
function measure(text, kind) {
  const lines = text.split('\n');
  if (lines[lines.length - 1] === '') lines.pop();
  const begin = lines.findIndex((l) => l.includes(BLOCK_BEGIN));
  const end = lines.findIndex((l) => l.includes(BLOCK_END));
  if (kind === 'CLAUDE.md' && begin !== -1 && end > begin) {
    return { count: end - begin + 1, firstLine: begin + 1, what: 'the hodos managed block' };
  }
  return { count: lines.length, firstLine: 1, what: kind };
}

export function lintFile(absPath, root) {
  const relPath = relative(root, absPath).split(sep).join('/');
  const findings = [];
  const artifact = classify(relPath);

  if (!artifact && DEEP_REFERENCE.test(relPath)) {
    findings.push({
      file: relPath,
      line: 1,
      severity: 'error',
      message: 'a phase reference lives directly in references/ — one level deep, so a kernel can name it (AUTHORING.md §11)',
    });
    return findings;
  }

  if (!artifact) {
    findings.push({
      file: relPath,
      line: 1,
      severity: 'error',
      message: 'unknown artifact — a new kind of file is a decision (AUTHORING.md §7)',
    });
    return findings;
  }

  const text = readFileSync(absPath, 'utf8');
  // A plan is the user's document, not an authored artifact: no cap, no
  // frontmatter, one rule — the test strategy of its tasks.
  if (artifact.kind === 'plan') return planFindings(text, relPath);

  const measured = measure(text, artifact.kind);
  if (measured.count > artifact.cap) {
    findings.push({
      file: relPath,
      line: measured.firstLine + artifact.cap,
      severity: 'error',
      message: `${measured.what} is ${measured.count} lines, cap ${artifact.cap} (AUTHORING.md §7) — split or delete, never compress`,
    });
  }

  // Decision 0078: an anchored precedent is checked against the text it
  // quoted, and its finding replaces the line-level one for the same entry —
  // one rot is one finding, and the anchor's is the one that says where to look.
  const rotted = verifyAnchors(absPath, root);
  const anchored = new Set(rotted.map((r) => `${r.line}:${r.raw}`));

  for (const citation of citations(text)) {
    const reason = checkCitation(citation, root);
    if (reason && !anchored.has(`${citation.line}:${citation.raw}`)) {
      findings.push({
        file: relPath,
        line: citation.line,
        severity: 'error',
        message: `${citation.raw} — ${reason} (AUTHORING.md §13)`,
      });
    }
  }
  for (const r of rotted) {
    findings.push({
      file: relPath,
      line: r.line,
      severity: 'error',
      message: `${r.raw} — ${r.reason} (AUTHORING.md §10)`,
    });
  }

  // Decision 0078: bare paths are checked where they resolve — a project's own
  // map and rules, against the project root. The engine's text names paths
  // inside the project it will be installed into, so the same check here would
  // report `.claude/hodos/config.json` on every file that mentions it.
  if (artifact.kind === 'CLAUDE.md' || artifact.kind === 'project rule') {
    for (const missing of verifyBarePaths(absPath, root)) {
      findings.push({
        file: relPath,
        line: missing.line,
        severity: 'error',
        message: `${missing.raw} — ${missing.reason} (AUTHORING.md §10)`,
      });
    }
  }

  const fm = parseFrontmatter(text);
  for (const f of fm.findings) findings.push({ file: relPath, ...f });

  if (artifact.kind === 'adapter') {
    findings.push(...adapterFindings(text, relPath, root, artifact.project === true));
    return findings;
  }

  if (artifact.kind === 'project rule') {
    if (fm.present) checkSubset(fm, RULE_KEYS, 'rule', findings, relPath);
    return findings;
  }
  if (artifact.kind === 'CLAUDE.md') return findings;

  const wantsFrontmatter = artifact.kind === 'agent' || relPath.endsWith('/SKILL.md');
  if (wantsFrontmatter && !fm.present) {
    findings.push({ file: relPath, line: 1, severity: 'error', message: 'no frontmatter' });
    return findings;
  }
  if (!wantsFrontmatter) return findings;

  if (artifact.kind === 'agent') checkAgent(relPath, fm, findings);
  else checkSkill(relPath, fm, findings);

  return findings;
}

/** The server keys a project's `.mcp.json` declares; `[]` when there is no file. */
function mcpServers(root) {
  try {
    const parsed = JSON.parse(readFileSync(join(root, '.mcp.json'), 'utf8'));
    return Object.keys(parsed?.mcpServers ?? {});
  } catch {
    return [];
  }
}

/**
 * FORMATS.md §13, checked rather than described (decision 0062). Two rules, one
 * of them conditional: every operation's `mcp__<server>__` prefix matches the
 * file's own `server:`, and a project adapter's server is a key of the
 * project's `.mcp.json` — an operation whose server exists nowhere turns an
 * explicit `Skip` into a failed call, which is worse than no adapter.
 */
function adapterFindings(text, relPath, root, project) {
  const findings = [];
  const at = (line, message) => findings.push({ file: relPath, line, severity: 'error', message });
  const lines = text.split('\n');
  const roleDir = relPath.split('/').slice(-2)[0];
  const opens = 'an adapter opens with `role: <role>` then `server: <tool>` (FORMATS.md §13)';

  const role = /^role:[ \t]*(\S+)[ \t]*$/.exec(lines[0] ?? '');
  if (!role) at(1, opens);
  else if (role[1] !== roleDir) {
    at(1, `role: ${role[1]}, but the file is under adapters/${roleDir}/ — the directory is the role`);
  }

  const server = /^server:[ \t]*(\S+)[ \t]*$/.exec(lines[1] ?? '');
  if (!server) at(2, opens);
  else if (project && !mcpServers(root).includes(server[1])) {
    at(2, `server: ${server[1]} names no server in .mcp.json — the operations below would call nothing`);
  }

  // Membership comes from the shared reader, so this run and `config.mjs check`
  // answer "is it declared" the same way; the per-line findings below are this
  // run's own, and read the same region with the same pattern.
  const declared = new Set(declaredOperations(text));
  const gotchas = lines.findIndex((l) => /^gotchas:[ \t]*$/.test(l));
  const end = gotchas === -1 ? lines.length : gotchas;
  for (let i = 2; i < end; i += 1) {
    const line = lines[i];
    if (line.trim() === '') continue;
    const op = OPERATION.exec(line);
    if (!op) {
      at(i + 1, 'an operation line is `<operation>: mcp__<server>__<tool> [{args}]` (FORMATS.md §13)');
      continue;
    }
    if (server && op[2] !== server[1]) {
      at(i + 1, `mcp__${op[2]}__ names a server the file does not declare (server: ${server[1]})`);
    }
  }

  if (gotchas === -1 || !lines.slice(gotchas + 1).some((l) => l.startsWith('- '))) {
    at(Math.max(1, lines.length - 1), 'no gotchas: with a line under it — an adapter that only restates a schema is what ToolSearch gives free (AUTHORING.md §12)');
  }

  // A **warning** on this surface, and an error in `config.mjs check`, which is
  // the surface decision 0091's binding (i) names and the run that closes
  // `/hodos:adapter`. Here it is a warning because `init` completes on
  // `lint --project` exit 0 and reads every rule and map of the project
  // besides — a run that stopped on an adapter it did not write would report
  // nothing else it found. The table and the reader are `config.mjs`'s, so the
  // two runs cannot disagree about which operations a file declares.
  const required = ROLE_OPERATIONS[roleDir] ?? [];
  const missing = required.filter((op) => !declared.has(op));
  for (const op of missing) {
    findings.push({
      file: relPath,
      line: Math.max(1, gotchas === -1 ? lines.length - 1 : gotchas),
      severity: 'warning',
      message: `role ${roleDir} names ${op} and this file maps nothing to it — the phase that calls it gets nothing, and is told nothing (DESIGN.md §3.2)`,
    });
  }
  return findings;
}

/**
 * A phase reference its kernel does not name is dead text, or a phase running
 * from memory instead of from disk (DESIGN.md §4.2).
 */
function uncitedReferences(files, root) {
  const out = [];
  for (const abs of files) {
    const rel = relative(root, abs).split(sep).join('/');
    const m = /^skills\/([^/]+)\/references\/([^/]+\.md)$/.exec(rel);
    if (!m) continue;
    let kernel = '';
    try {
      kernel = readFileSync(join(root, 'skills', m[1], 'SKILL.md'), 'utf8');
    } catch {
      kernel = '';
    }
    if (!kernel.includes(`references/${m[2]}`)) {
      out.push({
        file: rel,
        line: 1,
        severity: 'error',
        message: `skills/${m[1]}/SKILL.md does not name references/${m[2]} — a reference is read on entering its phase, so the kernel points at it (DESIGN.md §4.2)`,
      });
    }
  }
  return out;
}

/**
 * Spec drift is the failure this pass catches: `DESIGN.md §7.4` keeps its
 * meaning only while DESIGN.md still numbers that section 7.4, and a
 * renumbering leaves every citation of it pointing at prose that moved
 * (research/05 F1 — a major in three consecutive stage reviews).
 *
 * The append-only records are not scanned. DECISIONS.md quotes the section a
 * decision replaced, and docs/stages/ is frozen evidence; rewriting either to
 * keep this check green would falsify the record rather than fix a reference.
 */
const XREF_RECORDS = new Set(['DECISIONS.md', '00-decisions.md']);

/** `## 7. X` and `### 7.4 X` — the section numbers a document defines. */
export function sectionNumbers(text) {
  const out = new Set();
  for (const line of text.split('\n')) {
    const m = /^#{2,6}\s+(\d+(?:\.\d+)*)\.?\s/.exec(line);
    if (m) out.add(m[1]);
  }
  return out;
}

// A document name with an optional path, then the section mark and a number,
// optionally a range. `research/05 §5` has no `.md` and is declined; so is a
// `§7.1` with no document before it, and a document this repository does not
// hold — the check reports a section that moved, not a name it cannot resolve.
const XREF = /(?:[\w.-]+\/)*([A-Za-z][\w.-]*\.md)\s+§(\d+(?:\.\d+)*)(?:\s*[–—-]\s*(\d+(?:\.\d+)*))?/g;

/** Every single-backtick code span on `line`. A `` `x` `` span quotes one. */
function codeSpans(line) {
  const out = [];
  for (const m of line.replace(/``[^`]*``/g, (q) => ' '.repeat(q.length)).matchAll(/`([^`\n]+)`/g)) {
    out.push(m[1]);
  }
  return out;
}

/** basename → the section numbers it defines, for the unambiguous names. */
function xrefTargets(files, root) {
  const seen = new Map();
  const docs = join(root, 'docs');
  const candidates = [...files];
  if (existsSync(docs)) {
    for (const name of readdirSync(docs)) {
      if (name.endsWith('.md')) candidates.push(join(docs, name));
    }
  }
  for (const abs of candidates) {
    const name = basename(abs);
    if (seen.has(name)) {
      seen.set(name, null); // ambiguous: two files answer to this name
      continue;
    }
    try {
      seen.set(name, sectionNumbers(readFileSync(abs, 'utf8')));
    } catch {
      seen.set(name, null);
    }
  }
  return seen;
}

/** The sources whose references must resolve: the specification and the artifacts. */
function xrefSources(files, root, explicit) {
  const out = [...files];
  if (explicit) return out;
  const docs = join(root, 'docs');
  if (!existsSync(docs)) return out;
  for (const name of readdirSync(docs)) {
    if (name.endsWith('.md') && !XREF_RECORDS.has(name)) out.push(join(docs, name));
  }
  return out;
}

function crossReferences(files, root, explicit) {
  const targets = xrefTargets(files, root);
  const out = [];
  for (const abs of xrefSources(files, root, explicit)) {
    const rel = relative(root, abs).split(sep).join('/');
    if (XREF_RECORDS.has(basename(abs))) continue;
    let text = '';
    try {
      text = readFileSync(abs, 'utf8');
    } catch {
      continue;
    }
    text.split('\n').forEach((line, index) => {
      for (const span of codeSpans(line)) {
        for (const m of span.matchAll(XREF)) {
          const doc = m[1];
          const known = targets.get(doc);
          if (!known) continue; // not a document this repository numbers
          for (const section of [m[2], m[3]].filter(Boolean)) {
            if (known.has(section)) continue;
            out.push({
              file: rel,
              line: index + 1,
              severity: 'error',
              message: `\`${doc} §${section}\` names no section of ${doc} — a renumbered reference points at prose that moved (research/05 F1)`,
            });
          }
        }
      }
    });
  }
  return out;
}

export function lint(paths, root = PLUGIN_ROOT, { crossRefs = true } = {}) {
  const targets = paths.length > 0 ? paths : SCAN_ROOTS.map((r) => join(root, r));
  const files = [];
  for (const target of targets) {
    let exists = true;
    try {
      statSync(target);
    } catch {
      exists = false;
    }
    if (!exists && paths.length === 0) continue; // an unbuilt scan root is not a finding
    files.push(...walk(target));
  }
  const findings = [
    ...files.flatMap((f) => lintFile(f, root)),
    ...uncitedReferences(files, root),
    ...(crossRefs ? crossReferences(files, root, paths.length > 0) : []),
  ];
  return { files, findings };
}

/** The `Tests:` line of every task in a plan (decision 0022). */
function planFindings(text, relPath) {
  const findings = [];
  const lines = text.split('\n');
  const count = lines[lines.length - 1] === '' ? lines.length - 1 : lines.length;
  if (count > PLAN_ADVISORY) {
    findings.push({
      file: relPath,
      line: PLAN_ADVISORY + 1,
      severity: 'warn',
      message: `the plan is ${count} lines — check whether this is one mergeable unit (FORMATS.md §5)`,
    });
  }
  lines.forEach((line, index) => {
    const declared = /^Tests:\s*(.+?)\s*$/.exec(line);
    if (!declared || declared[1] === 'test-first') return;
    const value = declared[1];
    const reason = /^([a-z-]+)\b/.exec(value)?.[1];
    const finding = { file: relPath, line: index + 1, severity: 'error' };
    if (!TEST_EXEMPTIONS.includes(reason)) {
      findings.push({
        ...finding,
        message: `Tests: "${value}" is neither test-first nor one of ${TEST_EXEMPTIONS.join(', ')} (DESIGN.md §6.2)`,
      });
      return;
    }
    if (!/ — .+ · verified by .+/.test(value)) {
      findings.push({ ...finding, message: `the ${reason} exemption needs both halves: ${EXEMPTION_FORM} (decision 0022)` });
    }
  });
  return findings;
}

/** The roots --project checks: what init and /hodos:rule write into a project. */
const PROJECT_TARGETS = [
  'CLAUDE.md',
  join('.claude', 'rules'),
  join('.claude', 'skills'),
  join('.claude', 'hodos', 'adapters'),
];

/** Every plan.md of the project's task directories. */
function planFiles(root) {
  const tasks = join(root, '.claude', 'hodos', 'tasks');
  if (!existsSync(tasks)) return [];
  const out = [];
  for (const entry of readdirSync(tasks, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const plan = join(tasks, entry.name, 'plan.md');
    if (existsSync(plan)) out.push(plan);
  }
  return out;
}

function lintProject(cwd) {
  const found = findConfig(cwd);
  const root = found.notFound ? repoRoot(cwd) : found.projectRoot;
  const targets = PROJECT_TARGETS.map((t) => join(root, t)).filter((t) => existsSync(t));
  // Only plan.md is linted under tasks/: the rest of a task directory is
  // machine state, and scanning it would report ledger.md as an unknown artifact.
  // The cross-reference pass guards the engine's own specification against
  // renumbering; a project's `DOC.md §N` resolves against the project's docs,
  // which need not number their headings at all. Engine mode only.
  return { root, ...lint([...targets, ...planFiles(root)], root, { crossRefs: false }) };
}

/**
 * The PostToolUse hook: report on the file the payload names, and only on the
 * files hodos owns. Claude Code shows additionalContext to the model, so the
 * output is the finding list and nothing else (PLATFORM-NOTES.md fact 4).
 */
function lintHook() {
  let payload;
  try {
    payload = JSON.parse(readFileSync(0, 'utf8'));
  } catch {
    return 0; // fail open: an unparsable payload is not a lint result
  }
  const input = payload?.tool_input ?? {};
  // Check F is still open, so accept the shapes Write and Edit are documented
  // and observed to use; an unknown shape is reported once, on stderr.
  const file = input.file_path ?? input.path ?? input.filePath;
  if (typeof file !== 'string') {
    if (Object.keys(input).length > 0) process.stderr.write('lint: no file path in the PostToolUse payload\n');
    return 0;
  }
  const owned = file.split(sep).includes('.claude') || basename(file) === 'SKILL.md';
  if (!owned || !existsSync(file)) return 0;

  const root = repoRoot(dirname(file));
  // A .claude/ file with no cap or shape here is task state or the project's
  // own settings, not an artifact: brief.md and research.md are written on
  // every task (COMPONENTS.md §1.1), and "unknown artifact" on each of them
  // would put a finding in the model's context for a file it wrote correctly.
  const relPath = relative(root, file).split(sep).join('/');
  if (!classify(relPath) && !DEEP_REFERENCE.test(relPath)) return 0;

  const findings = lintFile(file, root);
  if (findings.length === 0) return 0;

  const context = ['hodos lint:', ...findings.map((f) => `${f.file}:${f.line}: ${f.severity}: ${f.message}`)].join('\n');
  process.stdout.write(
    `${JSON.stringify({ hookSpecificOutput: { hookEventName: 'PostToolUse', additionalContext: context } })}\n`,
  );
  return 0;
}

/**
 * The facts `/hodos:status --prune` puts in front of the developer. Decision
 * 0082: what a script can prove about a rule is its size, whether its
 * precedents still resolve, and what the layer costs to load — not whether the
 * rule has ever earned its place, which none of the three candidate detectors
 * measures honestly. So this prints facts and the developer decides.
 */
// Decision 0082 has --prune print each rule's age. It comes from git, not from the
// file's mtime: a clone rewrites every mtime to the checkout, so mtime would report
// a whole rule layer as written today. The date wanted is when the rule was *added*,
// and --follow is what carries that across a rename — a rule that got a better name
// is not a rule written today, and reporting it as uncommitted would be a false
// statement about a tracked file. One call per rule; a layer is a handful of files
// and this runs under /hodos:status --prune, not under a hook.
//
// The number is first arrival: how long this convention has been in the project,
// through renames and through a delete-and-restore, which --follow reads as one
// file's history. That is the age a prune run wants — an old rule whose precedents
// have rotted is the interesting one — and it is deliberately not "how long since
// someone touched it", which would reset every time a citation was re-pointed.
function ruleAge(path, root) {
  let out = '';
  try {
    out = execFileSync(
      'git',
      ['log', '--follow', '--diff-filter=A', '--format=@%at', '-1', '--', path],
      { cwd: root, encoding: 'utf8', timeout: 5000, stdio: ['ignore', 'pipe', 'ignore'] },
    );
  } catch {
    return null;
  }
  const at = Number(out.trim().replace(/^@/, ''));
  return Number.isFinite(at) && out.trim().startsWith('@') ? at : null;
}

function lintRules(cwd) {
  const found = findConfig(cwd);
  const root = found.notFound ? repoRoot(cwd) : found.projectRoot;
  const dir = join(root, '.claude', 'rules');
  let names = [];
  try {
    names = readdirSync(dir, { withFileTypes: true })
      .filter((e) => e.isFile() && e.name.endsWith('.md'))
      .map((e) => e.name)
      .sort();
  } catch {
    names = [];
  }
  if (names.length === 0) {
    process.stdout.write(`no rules in ${join('.claude', 'rules')} — nothing to review\n`);
    return 0;
  }

  let chars = 0;
  for (const name of names) {
    const path = join(dir, name);
    const text = readFileSync(path, 'utf8');
    chars += text.length;
    const lines = text.split('\n').length - (text.endsWith('\n') ? 1 : 0);
    const cited = citations(text);
    const rotted = verifyAnchors(path, root);
    // One rot is one line here too: an anchored entry whose line went blank is
    // reported by the anchor, which says where the code went (decision 0078).
    const anchored = new Set(rotted.map((r) => `${r.line}:${r.raw}`));
    const dead = verifyFile(path, root).filter((d) => !anchored.has(`${d.line}:${d.raw}`));
    // The precedents are the entries of the `## Precedents` block, not every
    // path the file names: a rule explains itself by pointing at code, and
    // counting those mentions as evidence reads two precedents as four —
    // which is the number `AUTHORING.md §10` question 1 is checked against.
    const kept = anchors(text).length;
    const count =
      `${kept} precedent${kept === 1 ? '' : 's'}` +
      ` · ${cited.length} citation${cited.length === 1 ? '' : 's'}`;
    // Two ways a precedent rots and one line to say both: a citation that no
    // longer resolves, and an anchor whose text has moved out from under it.
    const parts = [];
    if (dead.length > 0) parts.push(`${dead.length} do${dead.length === 1 ? 'es' : ''} not resolve`);
    if (rotted.length > 0) parts.push(`${rotted.length} anchor${rotted.length === 1 ? '' : 's'} moved or gone`);
    const verdict = cited.length === 0 ? 'no precedent cited' : parts.length === 0 ? 'resolves' : parts.join(' · ');
    const at = ruleAge(path, root);
    const age = at === null ? 'age unknown — not committed' : `age ${Math.floor((Date.now() / 1000 - at) / 86400)}d`;
    process.stdout.write(`${name} — ${lines} lines · ${age} · ${count} · ${verdict}\n`);
    // The rule's own line, the way `--project` prints it: two homes of one
    // path rot separately, and without the line the two findings print as
    // one line repeated.
    for (const d of [...dead, ...rotted].sort((a, b) => a.line - b.line)) {
      process.stdout.write(`  :${d.line} ${d.raw} — ${d.reason}\n`);
    }
  }
  process.stdout.write(`layer: ${names.length} rules · ${Math.ceil(chars / 4)} tokens\n`);
  return 0;
}

function main(argv) {
  const paths = [];
  let mode = 'engine';
  for (const arg of argv) {
    if (arg === '--help' || arg === '-h') {
      process.stdout.write(`${USAGE}\n`);
      return 0;
    }
    if (arg === '--project' || arg === '--hook' || arg === '--rules') {
      mode = arg.slice(2);
      continue;
    }
    if (arg.startsWith('-')) {
      process.stderr.write(`lint: unknown option: ${arg}\n${USAGE}\n`);
      return 2;
    }
    paths.push(arg);
  }

  if (mode === 'hook') return lintHook();
  if (mode === 'rules') return lintRules(process.cwd());

  // Explicit paths are the caller's; classification is then relative to the
  // current directory, so `cd <checkout> && lint skills/run/SKILL.md` works.
  const { files, findings } =
    mode === 'project' ? lintProject(process.cwd()) : lint(paths, paths.length > 0 ? process.cwd() : PLUGIN_ROOT);
  for (const f of findings) {
    process.stdout.write(`${f.file}:${f.line}: ${f.severity}: ${f.message}\n`);
  }
  const errors = findings.filter((f) => f.severity === 'error').length;
  const warnings = findings.length - errors;
  process.stdout.write(
    errors + warnings === 0
      ? `lint: clean — ${files.length} files\n`
      : `lint: ${errors} errors, ${warnings} warnings — ${files.length} files\n`,
  );
  return errors > 0 ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof BadInvocation)) throw error;
    process.exitCode = 2;
  }
}
