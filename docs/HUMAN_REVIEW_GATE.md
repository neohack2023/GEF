# Human Review Gate

LLM and automation can prepare work, but they do not promote work to canon without human review.

## Before merge

A human should verify:

- the task matches the original goal
- CI passed
- the PR summary is accurate
- risk and rollback are documented
- docs/TODO are updated if needed
- GEF safety boundaries are preserved

## Canon rule

Bot-created changes should normally enter through PRs, not direct writes to `main`.

## GEF canon-sensitive areas

Changes to these areas require extra human attention:

- renderer trust boundaries
- sandbox/main promotion behavior
- generated visual code policy
- telemetry import/export and memory policy
- provider adapters and SLM lanes
- dataset promotion rules
- public project positioning

## Merge receipt

Every merged PR should leave enough evidence for a future agent to understand:

- what changed
- why it changed
- how it was validated
- how to roll it back
