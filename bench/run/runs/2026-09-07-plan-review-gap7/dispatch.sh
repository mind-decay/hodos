#!/bin/sh
# One plan-review dispatch, the way the task kernel makes it (references/plan.md §9).
arm="$1"; copy="$2"; root="$3"
claude -p "Review the plan by dispatching the agent whose subagent_type is \"hodos:hodos-plan-reviewer\". Dispatch it once, wait for it, and print the verdict line it returns. Do not review the plan yourself and do not read it.
Plan: $copy/pr/$arm/plan.md
Research: $copy/pr/$arm/research.md
Rules: $copy/.claude/rules/
Write $copy/pr/$arm/plan-review.md and return the verdict line." \
  --plugin-dir "$root" --strict-mcp-config --permission-mode bypassPermissions \
  --output-format stream-json --verbose
