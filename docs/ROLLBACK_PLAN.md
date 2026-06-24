# Rollback Plan

Every meaningful change should include a rollback path in the PR body.

## Minimum rollback note

- Files touched
- Behavior changed
- How to revert
- Any data, config, or browser storage migration risk
- Follow-up cleanup needed

## GEF-specific rollback concerns

For UI, render, or storage changes, note whether the change may affect:

- saved presets
- telemetry JSONL rows
- local library data
- imported quarantine data
- browser permissions
- generated visual code artifacts
- SLM provider configuration

If a change touches persistent local data or public file formats, include a compatibility note.
