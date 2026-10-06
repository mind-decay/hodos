// state-row.mjs — the state band above the prompt (decisions 0202, 0203).
//
// The one file of the engine that runs outside Node. Claude Code loads it from
// the `modules` list of hooks/hooks.json, for a marketplace-installed plugin
// too, in an environment with no Node (PLATFORM-NOTES.md fact 76). So it holds
// no logic and imports nothing: it runs `node scripts/state-digest.mjs --row`
// on an interactive start and after each main-thread turn (PLATFORM-NOTES.md
// fact 77), keeps the line that prints, which is the command `/hodos:status`
// ends on, and draws it in the `AbovePrompt` band as `● <line>` in magenta,
// with the global `h` and the surface's own `Text` (PLATFORM-NOTES.md fact 78).
// The glyph and the colour are this module's, so the digest's line stays plain
// text. A machine whose hooks find no `node` on PATH (PLATFORM-NOTES.md fact
// 42) makes the run reject, and the band stays empty. The surface is early
// access: open check Q of PLATFORM-NOTES.md holds what a later CLI may change,
// and its fallback is deleting the `modules` key.

// Half the hook's own 10 s budget, so a hung digest empties the band instead of
// costing the hook.
const TIMEOUT_MS = 5000;

/**
 * The digest's row for this session, or '' when there is none to draw. The id
 * goes in the environment because that is where the digest reads the session's
 * own task from (decision 0047). No `cwd` and no PATH are passed: the run
 * inherits the session's directory, where the digest finds the config, and the
 * CLI's own environment (PLATFORM-NOTES.md fact 77). Every way the run can fail
 * gives '', since a stale line would name a wrong next step.
 */
export async function rowOf($) {
  try {
    const { exitCode, stdout } = await $.process.run(
      ['node', `${$.plugin.root}/scripts/state-digest.mjs`, '--row'],
      { env: { CLAUDE_CODE_SESSION_ID: await $.session.id() }, timeoutMs: TIMEOUT_MS },
    );
    return exitCode === 0 ? stdout.trim() : '';
  } catch {
    return '';
  }
}

/**
 * Fetches the line on an interactive start and after each main-thread turn,
 * and draws it from the band. Each event hook lets the chain beneath finish
 * first and returns what it resolved, so the engine's own step never waits on
 * the spawn. A `-p` session reports `isInteractive` false and a subagent's
 * turn carries `agentId` (PLATFORM-NOTES.md fact 77), so neither runs
 * anything: nobody reads a band there, and the benches spawn nothing. The
 * render hook only reads, because it runs on every redraw, resizes included.
 */
export const register = (on) => {
  // Per registration: a reload registers again, and `session.start` fires for
  // it (PLATFORM-NOTES.md fact 77). Variables, not `$.state`, which would need
  // a types contract `claude plugin validate` checks (PLATFORM-NOTES.md fact 78).
  let interactive = false;
  let line = '';
  // The two event hooks repeat the refresh rather than share a closure:
  // `claude plugin validate` refuses `$` passed to a function that is not
  // declared at the top of the file (PLATFORM-NOTES.md fact 78), and `line`
  // belongs to this registration.
  on('session.start', async ($, e, next) => {
    interactive = e.isInteractive;
    const result = await next(e);
    if (interactive) {
      line = await rowOf($);
      $.ui.invalidate('ui.render');
    }
    return result;
  });
  on('turn.complete', async ($, e, next) => {
    const result = await next(e);
    if (interactive && !e.agentId) {
      line = await rowOf($);
      $.ui.invalidate('ui.render');
    }
    return result;
  });
  // A survey draws in the same band, and the band yields to it.
  on('ui.render', { component: 'AbovePrompt' }, async ($, e, next) => {
    if (e.props.hasSurvey || line === '') return next(e);
    const { Text } = $.ui.resolve(e);
    return h(Text, { color: 'magenta' }, `● ${line}`);
  });
};
