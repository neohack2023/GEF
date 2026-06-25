# GEF Docs Index

Project planning, architecture notes, workflow rules, and LLM handoff documents for GEF.

Start at the root [`README.md`](../README.md). It is the mission, quickstart, and LLM handoff index. This file is the deeper docs table of contents.

## Current status

- [Current Status](./CURRENT_STATUS.md) — quick handoff note for what has been verified, the latest merged work, current limitations, and the next recommended build step.

## Build plans

- [SLM Option Plan](./SLM_OPTION_PLAN.md) — plan for adding browser-local and localhost small language model providers as alternatives to cloud LLM workflows.
- ✅ [Local Ollama SLM Lane](./LOCAL_OLLAMA_SLM.md) — local SLM integration for validated curated-module suggestions plus the split helper/code lane setup.
- ✅ [Code Foundry SLM Lane](./CODE_FOUNDRY_SLM.md) — code-focused local SLM lane for generating, linting, repairing, and retrying candidate visual code artifacts under validator and sandbox control.
- [3D Visualization Lane Plan](./3D_VISUALIZATION_LANE.md) — plan for adding a sandbox-first 3D visual lane alongside the stable Canvas2D renderer.
- [Feedback and Memory System Plan](./FEEDBACK_MEMORY_SYSTEM.md) — plan for turning user feedback, validation results, telemetry, and local memory into reusable datasets for LLM/SLM improvement.

## Product signals

- [External Feedback Notes](./EXTERNAL_FEEDBACK.md) — early outside feedback on shader tooling, DJ-screen use cases, live visual requirements, and safe positioning before public release.

## Workflow loop

- [Repository Map](./REPO_MAP.md) — repo layout, source areas, docs, and workflow files.
- [TODO](./TODO.md) — active task ledger and future workflow tasks.
- [Workflow Loop](./WORKFLOW_LOOP.md) — human-gated LLM/Codex workflow path.
- [CI to LLM Feedback Loop](./CI_LLM_FEEDBACK_LOOP.md) — how CI packets guide future repair passes.
- [Human Review Gate](./HUMAN_REVIEW_GATE.md) — canon-sensitive merge and promotion rules.
- [Rollback Plan](./ROLLBACK_PLAN.md) — minimum rollback notes for meaningful changes.

## Core docs

- [Architecture](./ARCHITECTURE.md) — render lanes, module registry, sandbox flow, provider boundaries, and future runtime layout.
- [Security](./SECURITY.md) — Foundry safety model, trust zones, provider boundaries, sandbox rules, dataset controls, and browser security guidance.
- [Audio Metrics](./AUDIO_METRICS.md) — bass, mid, treble, beat, glitch, centroid, RMS, smoothing, bin mapping, and future Hz-based metric upgrades.
- [Preset Format](./PRESET_FORMAT.md) — local preset JSON shape, schema versioning, migration, import/export rules, and compatibility policy.
- [Dataset Format](./DATASET_FORMAT.md) — JSONL row shape, schema validation, migration, splits, cleaning, training derivations, and dataset-card rules.
- ✅ [Telemetry Quarantine Review](./QUARANTINE_REVIEW.md) — local review gate for imported JSONL rows before reviewed export.
- [Memory Policy](./MEMORY_POLICY.md) — retention, distillation, forgetting, privacy controls, memory scoring, retrieval rules, and dataset promotion policy.
- [Testing](./TESTING.md) — browser smoke tests, media checks, security regressions, adapter validation, and release checklist.
