# GEF Docs Index

Project planning and architecture notes for GEF Sandbox Compiler v2.3.

## Build plans

- [SLM Option Plan](./SLM_OPTION_PLAN.md) — plan for adding browser-local and localhost small language model providers as alternatives to cloud LLM workflows.
- [Feedback and Memory System Plan](./FEEDBACK_MEMORY_SYSTEM.md) — plan for turning user feedback, validation results, telemetry, and local memory into reusable datasets for LLM/SLM improvement.

## Core docs

- [Architecture](./ARCHITECTURE.md) — render lanes, module registry, sandbox flow, provider boundaries, and future runtime layout.
- [Security](./SECURITY.md) — Foundry safety model, trust zones, provider boundaries, sandbox rules, dataset controls, and browser security guidance.
- [Audio Metrics](./AUDIO_METRICS.md) — bass, mid, treble, beat, glitch, centroid, RMS, smoothing, bin mapping, and future Hz-based metric upgrades.
- [Preset Format](./PRESET_FORMAT.md) — local preset JSON shape, schema versioning, migration, import/export rules, and compatibility policy.

## Planned docs

- `DATASET_FORMAT.md` — JSONL training rows, feedback events, and cleaned dataset export rules.
- `MEMORY_POLICY.md` — retention, distillation, forgetting, and privacy rules.
- `TESTING.md` — browser smoke tests and adapter validation checklist.
