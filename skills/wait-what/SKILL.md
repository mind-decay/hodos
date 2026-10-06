---
name: wait-what
description: Ask the agent to re-pitch what it is doing, in plain words in your language and the project's own terms, when you have lost the thread. Run it as /hodos:wait-what.
disable-model-invocation: true
allowed-tools: Bash(node ${CLAUDE_PLUGIN_ROOT}/scripts/*)
---
# wait-what
!`node ${CLAUDE_PLUGIN_ROOT}/scripts/state-digest.mjs`
Wait, I lost you. Re-pitch where you are: open with the hodos task you are on, its phase and the step after it, as the digest above lists them, or say that no hodos task is open; then one sentence of context, then what you are doing and why — plain words in my language, this project's own terms, none of this session's shorthand. Close with what you need from me, then end on one `Next:` line naming the one step you propose: the command with its arguments filled in, which for work not yet started is `/hodos:task <the change>` because work enters hodos through that command, or the words when no command takes it. Any other way forward goes above that line. Ten lines at most, and no apology.
