# Repository Map

GEF is organized around a browser-first generative visual engine with safety gates for AI/SLM-assisted visual creation.

## Top-level files

- `README.md` — project mission, current foundation, and documentation map.
- `package.json` — npm scripts for local checks and manual smoke instructions.
- `AGENTS.md` — operating rules for LLM/Codex style contributors.

## Source areas

- `src/` — browser runtime, audio analysis, render modules, storage, SLM lanes, Foundry helpers, and Autopilot stubs.
- `tools/` — repository utility scripts such as security scanning.
- `scripts/ci/` — CI context packet generation for LLM-readable workflow feedback.

## Documentation areas

- `docs/ARCHITECTURE.md` — system layout and renderer boundaries.
- `docs/SECURITY.md` — trust zones, sandbox rules, provider boundaries, and dataset controls.
- `docs/AUDIO_METRICS.md` — audio-reactive metric definitions.
- `docs/PRESET_FORMAT.md` — preset shape, versioning, import/export policy.
- `docs/DATASET_FORMAT.md` — telemetry JSONL and dataset promotion policy.
- `docs/QUARANTINE_REVIEW.md` — review gate for imported telemetry.
- `docs/LOCAL_OLLAMA_SLM.md` — local SLM lane setup.
- `docs/CODE_FOUNDRY_SLM.md` — code-focused SLM lane under validator control.
- `docs/MEMORY_POLICY.md` — memory, retention, distillation, forgetting, and privacy rules.
- `docs/TESTING.md` — smoke and regression guidance.
- `docs/TODO.md` — current task ledger.
- `docs/WORKFLOW_LOOP.md` — human-gated workflow path.
- `docs/CI_LLM_FEEDBACK_LOOP.md` — how CI reports feed back into agent repair passes.
- `docs/HUMAN_REVIEW_GATE.md` — merge and canon promotion rules.
- `docs/ROLLBACK_PLAN.md` — rollback documentation expectations.

## Workflow areas

- `.github/workflows/repo-health.yml` — verifies required docs and workflow files exist.
- `.github/workflows/stack-ci.yml` — runs the repository check script and emits CI context.
- `.github/workflows/actionlint.yml` — lints workflow syntax.
- `.github/workflows/workflow-contracts.yml` — checks that the LLM workflow loop remains wired.
- `.github/ISSUE_TEMPLATE/llm_task.yml` — structured task packets.
- `.github/PULL_REQUEST_TEMPLATE.md` — PR receipt with validation, risk, and rollback.
