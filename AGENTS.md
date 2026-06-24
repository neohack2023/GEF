# Agent Operating Rules

GEF uses a human-gated LLM workflow.

## Core loop

1. Read the task source first:
   - GitHub issue
   - TODO item
   - PR comment
   - docs task packet
   - CI failure packet
2. Inspect the repository before changing files.
3. Make the smallest safe change that satisfies the task.
4. Do not rewrite architecture unless the task explicitly asks for it.
5. Do not claim success until CI has passed.
6. If CI fails:
   - read the generated CI context packet
   - inspect changed files
   - patch the smallest failing area
   - rerun or wait for CI again
7. Update docs and TODO only when behavior, workflow, structure, or future maintenance changes.
8. Open a PR or produce a reviewable patch. Do not treat direct-to-main changes as the normal path.

## GEF canon boundaries

GEF is an autonomous, browser-based generative visual engine. The renderer, sandbox, safety model, memory formats, provider boundaries, and autopilot behavior are canon-sensitive.

Agents may edit implementation details, tests, formatting, and scoped documentation cleanup when the task supports it.

Agents must not make final canon changes to the following without explicit human approval:

- renderer trust boundaries
- sandbox promotion rules
- generated-code safety policy
- telemetry and memory retention rules
- provider adapter behavior
- AI/SLM autopilot behavior
- dataset promotion rules
- public positioning or project mission

When in doubt, create a candidate note or PR suggestion instead of rewriting canon directly.

## Human gate

Models may suggest.
Validators decide.
Users promote.

## Required PR receipt

Every PR or final patch must include:

- what changed
- files changed
- validation performed
- CI status
- risk
- rollback path
- follow-up tasks
