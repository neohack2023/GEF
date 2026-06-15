# GEF Docs Index

Project planning and architecture notes for GEF Sandbox Compiler v2.3.

## Current status

- [Current Status](./CURRENT_STATUS.md) — quick handoff note for what has been verified, what Phase 1 hardening is complete, current limitations, and the next recommended build step.

## Build plans

- [SLM Option Plan](./SLM_OPTION_PLAN.md) — plan for adding browser-local and localhost small language model providers as alternatives to cloud LLM workflows.
- ✅ [Local Ollama SLM Lane](./LOCAL_OLLAMA_SLM.md) — local SLM integration for validated curated-module suggestions plus the split helper/code lane setup.
- ✅ [Code Foundry SLM Lane](./CODE_FOUNDRY_SLM.md) — code-focused local SLM lane for generating, linting, repairing, and retrying candidate visual code artifacts under validator and sandbox control.
- [Feedback and Memory System Plan](./FEEDBACK_MEMORY_SYSTEM.md) — plan for turning user feedback, validation results, telemetry, and local memory into reusable datasets for LLM/SLM improvement.

## Product signals

- [External Feedback Notes](./EXTERNAL_FEEDBACK.md) — early outside feedback on shader tooling, DJ-screen use cases, live visual requirements, and safe positioning before public release.

## Core docs

- [Architecture](./ARCHITECTURE.md) — render lanes, module registry, sandbox flow, provider boundaries, and future runtime layout.
- [Security](./SECURITY.md) — Foundry safety model, trust zones, provider boundaries, sandbox rules, dataset controls, and browser security guidance.
- [Audio Metrics](./AUDIO_METRICS.md) — bass, mid, treble, beat, glitch, centroid, RMS, smoothing, bin mapping, and future Hz-based metric upgrades.
- [Preset Format](./PRESET_FORMAT.md) — local preset JSON shape, schema versioning, migration, import/export rules, and compatibility policy.
- [Dataset Format](./DATASET_FORMAT.md) — JSONL row shape, schema validation, migration, splits, cleaning, training derivations, and dataset-card rules.
- ✅ [Telemetry Quarantine Review](./QUARANTINE_REVIEW.md) — local review gate for imported JSONL rows before reviewed export.
- [Memory Policy](./MEMORY_POLICY.md) — retention, distillation, forgetting, privacy controls, memory scoring, retrieval rules, and dataset promotion policy.
- [Testing](./TESTING.md) — browser smoke tests, media checks, security regressions, adapter validation, and release checklist.
