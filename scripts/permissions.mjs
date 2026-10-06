// permissions.mjs — keeps the scripts rule `init` wrote pointing at the
// running plugin version (decision 0204).
//
// `init` writes `Bash(node <plugin root>/scripts/*)` into the project's
// `.claude/settings.local.json` with the root resolved, and a plugin update
// moves the root to a new `cache/<marketplace>/<plugin>/<version>/` directory:
// from then on every script call prompts. The SessionStart hook passes
// `state-digest.mjs --repoint`, which calls `repointFile` here, and Claude Code
// reloads `permissions` in the running session (PLATFORM-NOTES.md fact 79), so
// Claude Code stays the only matcher and hodos only edits the developer's rule.
//
// Only init's exact form is hodos's to move. A narrower rule the permission
// dialog wrote, a `:*` form, a rule in `deny` or `ask`, and any other plugin's
// path stay as written; nothing is ever added where no rule was approved.

import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { writeAtomic } from './ledger.mjs';

/** The plugin's own root: the version directory this session runs from. */
export const PLUGIN_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));

/** The rule `init` writes for a plugin root, in its exact form. */
export const scriptsRule = (root) => `Bash(node ${root}/scripts/*)`;

/**
 * Re-point every init rule of another version of this plugin to
 * `runningRoot`'s, converging on one rule at the first one's index. Pure: the
 * input is never mutated, and comes back as itself when nothing moves — `from`
 * is then `[]`, however many current rules it holds.
 */
export function repoint(settings, runningRoot) {
  const to = basename(runningRoot);
  const allow = settings?.permissions?.allow;
  // A copied install runs from `<…>/cache/<marketplace>/<plugin>/<version>`
  // (PLATFORM-NOTES.md fact 80). A `--plugin-dir` checkout or a
  // local-path marketplace loads in place, and its sibling directory is
  // another project, not another version.
  const cached = basename(dirname(dirname(dirname(runningRoot)))) === 'cache';
  if (!cached || !Array.isArray(allow)) return { settings, from: [], to };

  // The prefix keeps the running root's own separator. Whether init's
  // `${CLAUDE_PLUGIN_ROOT}` spells a Windows root the way this module's URL
  // does is open check R; where it does not, nothing matches and nothing moves.
  const prefix = `Bash(node ${runningRoot.slice(0, -to.length)}`;
  const suffix = '/scripts/*)';
  const versionOf = (entry) => {
    if (typeof entry !== 'string' || !entry.startsWith(prefix) || !entry.endsWith(suffix)) return null;
    const version = entry.slice(prefix.length, -suffix.length);
    return version !== '' && !/[\\/]/.test(version) ? version : null;
  };

  const from = [...new Set(allow.map(versionOf).filter((version) => version !== null && version !== to))];
  if (from.length === 0) return { settings, from: [], to };

  let placed = false;
  const next = allow.flatMap((entry) => {
    if (versionOf(entry) === null) return [entry];
    if (placed) return [];
    placed = true;
    return [scriptsRule(runningRoot)];
  });
  return { settings: { ...settings, permissions: { ...settings.permissions, allow: next } }, from, to };
}

/**
 * `repoint` over `<projectRoot>/.claude/settings.local.json`, written only when
 * a rule moved. An absent or unparseable file is left as it is and reported as
 * unchanged — Claude Code reports a broken settings file itself — and a write
 * that fails returns its code: nothing here may fail the SessionStart hook.
 * A root Claude Code marked as replaced moves nothing (PLATFORM-NOTES.md fact
 * 80): a session opened before an update still runs it, and its `/clear`
 * would take the rule back from the installed version.
 */
export function repointFile(projectRoot, runningRoot = PLUGIN_ROOT, { read = readFileSync, write = writeAtomic } = {}) {
  const file = join(projectRoot, '.claude', 'settings.local.json');
  const to = basename(runningRoot);
  if (existsSync(join(runningRoot, '.orphaned_at'))) return { from: [], to };
  let settings;
  try {
    settings = JSON.parse(read(file, 'utf8'));
  } catch {
    return { from: [], to };
  }
  const moved = repoint(settings, runningRoot);
  if (moved.from.length === 0) return { from: [], to };
  try {
    write(file, `${JSON.stringify(moved.settings, null, 2)}\n`);
  } catch (error) {
    return { from: moved.from, to, error: error.code ?? error.name };
  }
  return { from: moved.from, to };
}
