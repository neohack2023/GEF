# CI to LLM Feedback Loop

CI is the first judge. The human is the final gate.

## When CI succeeds

1. Confirm the expected checks ran.
2. Confirm the `llm-ci-context` artifact exists.
3. Summarize what was validated.
4. Mark the PR ready for human review.

## When CI fails

1. Read the failing job.
2. Read the uploaded `llm-ci-context` artifact.
3. Inspect changed files.
4. Identify the smallest likely cause.
5. Patch only the failing area.
6. Rerun CI or wait for the next run.
7. Do not broaden the task unless the human asks.

## Allowed status language

- `Patch committed. Waiting on CI.`
- `CI failed. Reviewing failure packet.`
- `CI passed. Ready for human review.`

## Not allowed

- `Done and working` before CI passes.
- Silent architecture rewrites.
- Direct canon promotion without human review.
