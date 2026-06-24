# Workflow Loop

GEF uses a human-gated LLM development loop.

## Standard path

1. Task starts as an issue, TODO item, PR comment, or human instruction.
2. Agent reads `AGENTS.md`, `docs/REPO_MAP.md`, and the task packet.
3. Agent makes the smallest safe change.
4. CI validates the change.
5. CI emits a readable context packet.
6. Agent repairs failures using logs and changed files.
7. PR summary documents validation, risk, and rollback.
8. Human reviews and merges.
9. TODO/docs are updated when needed.

## Source of truth order

1. Human instruction in the current task.
2. `AGENTS.md`.
3. Existing GEF architecture and safety docs.
4. TODO and issue task packet.
5. Local inference from code.

## Non-negotiable rule

Do not call work complete until CI passes.

## GEF-specific caution

Generated visual code, SLM/autopilot behavior, dataset promotion, sandbox promotion, and renderer trust boundaries are safety-sensitive. Agents should propose scoped changes through PRs and preserve the human promotion gate.
