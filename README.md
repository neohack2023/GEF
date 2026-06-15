# GEF

GEF is a browser-based generative visual engine for building audio-reactive art systems.

It is designed as a creative sandbox where visual modules, audio analysis, feedback, presets, and future AI/SLM assistance can work together without letting untrusted generated code take over the renderer.

## What the app is for

GEF is meant for experimenting with live generative visuals:

- render animated visual systems in the browser
- react to music or microphone input in real time
- preview visual changes in a sandbox before promoting them
- save and reload visual presets
- record or snapshot visual output
- collect feedback and telemetry for future learning
- prepare structured datasets for safer AI-assisted visual generation

In plain terms: GEF is a lab bench for building visuals that listen, react, mutate, and learn from what worked.

## Why it was made

The original goal was to create an autonomous generative art IDE with AI-assisted visual synthesis, repair, and iteration.

The current direction keeps that creative ambition but rebuilds it around safer foundations:

- curated render modules instead of unrestricted generated-code execution
- sandbox preview before promotion
- local-first memory and telemetry
- documented dataset, preset, and memory formats
- clear security boundaries for future model providers
- testable browser behavior before adding more automation

GEF is being built so the system can eventually learn from creative feedback while keeping the stable renderer inspectable, recoverable, and user-controlled.

## Current foundation

The current browser prototype includes:

- Canvas2D rendering runtime
- audio-reactive metrics for bass, mid, treble, beat, glitch, centroid, and RMS
- sandbox/main preview separation
- preset save/load support
- telemetry JSONL export/import
- imported telemetry quarantine review before reviewed export
- safe Foundry/Autopilot stubs
- local Ollama SLM suggestions for curated modules
- split local SLM lane profiles for light helper and code foundry tasks
- static policy screening for generated visual code artifacts
- snapshot and WebM capture paths
- documentation for architecture, safety, memory, datasets, presets, and testing

Future work can add WebGL, WebGPU/WGSL, Pyodide, browser-local SLMs, cloud LLM adapters, and stronger dataset tooling through the adapter and validation model described in the docs.

## Documentation map

Project planning and system design live in [`docs/`](./docs/README.md).

Key documents:

- [`ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — system layout, render lanes, sandbox model, and future adapter structure.
- [`SECURITY.md`](./docs/SECURITY.md) — trust boundaries, import rules, provider safety, and sandbox controls.
- [`AUDIO_METRICS.md`](./docs/AUDIO_METRICS.md) — audio analysis behavior and metric definitions.
- [`PRESET_FORMAT.md`](./docs/PRESET_FORMAT.md) — local preset shape, versioning, migration, and compatibility rules.
- [`DATASET_FORMAT.md`](./docs/DATASET_FORMAT.md) — telemetry rows, JSONL format, dataset promotion, and cleaning rules.
- [`QUARANTINE_REVIEW.md`](./docs/QUARANTINE_REVIEW.md) — local review gate for imported JSONL rows before reviewed export.
- [`LOCAL_OLLAMA_SLM.md`](./docs/LOCAL_OLLAMA_SLM.md) — local Ollama SLM lanes for curated-module suggestions and model setup.
- [`CODE_FOUNDRY_SLM.md`](./docs/CODE_FOUNDRY_SLM.md) — code-focused local SLM lane for generating, linting, repairing, and retrying candidate visual code artifacts under validator control.
- [`MEMORY_POLICY.md`](./docs/MEMORY_POLICY.md) — retention, distillation, forgetting, scoring, and privacy controls.
- [`TESTING.md`](./docs/TESTING.md) — smoke tests, media checks, security regressions, adapter tests, and release checklist.
- [`SLM_OPTION_PLAN.md`](./docs/SLM_OPTION_PLAN.md) — plan for browser-local and localhost model providers.
- [`FEEDBACK_MEMORY_SYSTEM.md`](./docs/FEEDBACK_MEMORY_SYSTEM.md) — how feedback becomes structured memory and future training evidence.

## Project rule of thumb

Models may suggest. Validators decide. Users promote.

GEF should learn from use, but the renderer should stay deterministic, inspectable, and recoverable.
