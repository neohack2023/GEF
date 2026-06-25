# GEF

GEF is a browser-based generative visual engine for building audio-reactive art systems.

It is a creative sandbox for visuals that listen, react, mutate, and learn from feedback while keeping the stable renderer safe, inspectable, and recoverable.

```text
Models may suggest. Validators decide. Users promote.
```

---

## Quick start

Install dependencies and run the local Vite dev server:

```bash
npm install
npm run dev
```

Then open:

```text
http://127.0.0.1:8080
```

Do not open `index.html` directly with `file://`. GEF uses browser ES modules, so direct file loading gives the page a `null` origin and modern browsers block module imports. Always use the npm-hosted local server.

Useful checks:

```bash
npm run check
npm run build
npm run test:e2e:chromium
```

Local SLM setup menu:

```bash
npm run setup:slm
```

The setup menu checks whether Ollama is installed, whether the local service responds, which GEF models are available, and can pull missing required models.

---

## What GEF is for

GEF is a lab bench for live generative visuals:

- render animated visual systems in the browser
- react to music or microphone input in real time
- preview visual changes in a sandbox before promotion
- save and reload visual presets
- snapshot or record visual output
- collect feedback and telemetry for future learning
- prepare structured datasets for safer AI-assisted visual generation
- let local SLMs draft suggestions while validators keep authority

The long-term direction is an AI-assisted visual foundry where models can help generate, repair, and iterate visual systems without gaining direct control over the main renderer.

---

## Current foundation

The current browser prototype includes:

- Canvas2D rendering runtime
- curated render module registry
- audio metrics for bass, mid, treble, beat, glitch, centroid, and RMS
- sandbox/main preview separation
- sandbox-only preview for validated curated-module suggestions
- Code Foundry local SLM lane for generated Canvas2D artifact text
- static policy screening for generated visual code artifacts
- local Ollama setup menu for helper and code models
- preset save/load support
- telemetry JSONL export/import
- imported telemetry quarantine review before reviewed export
- Vite-hosted local development and build preview
- TypeScript project configuration for gradual type adoption
- Playwright Chromium smoke coverage
- snapshot and WebM capture paths
- documentation for architecture, safety, memory, datasets, presets, workflow, and testing

Future adapters may add WebGL/GLSL, WebGPU/WGSL, Pyodide/Python, browser-local SLMs, cloud LLM providers, and stronger dataset tooling. Adapters must keep feature detection, validation, diagnostics, fallback, and sandbox isolation.

---

## LLM handoff index

This README is the first file an LLM agent should read. It is the repo landing page, mission statement, and handoff router.

When context is fresh, read in this order:

1. [`README.md`](./README.md) — mission, quickstart, core rules, and handoff map.
2. [`docs/CURRENT_STATUS.md`](./docs/CURRENT_STATUS.md) — latest verified state, last completed work, current continuation pointer.
3. [`docs/TODO.md`](./docs/TODO.md) — active task ledger and backlog.
4. [`docs/WORKFLOW_LOOP.md`](./docs/WORKFLOW_LOOP.md) — human-gated LLM workflow path.
5. [`docs/REPO_MAP.md`](./docs/REPO_MAP.md) — repo layout and where code/docs live.
6. [`docs/SECURITY.md`](./docs/SECURITY.md) — trust boundaries and no-go zones.
7. [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md) — runtime layout, render lanes, sandbox model, and provider boundaries.
8. Task-specific docs from the table below.

When context is close to full, stop broad exploration and leave a concise handoff by updating `docs/CURRENT_STATUS.md` and `docs/TODO.md` with:

- what was just changed
- what passed or failed
- exact branch or PR number
- next safe action
- files the next agent should inspect first
- any unresolved validator, CI, or review notes

The next agent should resume from `docs/CURRENT_STATUS.md`, not from guesswork.

---

## Task-to-doc map

| Work area | Read these first |
| --- | --- |
| Render runtime, module registry, sandbox flow | [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/SECURITY.md`](./docs/SECURITY.md), [`docs/REPO_MAP.md`](./docs/REPO_MAP.md) |
| Audio metrics and reactive behavior | [`docs/AUDIO_METRICS.md`](./docs/AUDIO_METRICS.md) |
| Presets and local library state | [`docs/PRESET_FORMAT.md`](./docs/PRESET_FORMAT.md), [`docs/SECURITY.md`](./docs/SECURITY.md) |
| Telemetry, JSONL, dataset promotion | [`docs/DATASET_FORMAT.md`](./docs/DATASET_FORMAT.md), [`docs/QUARANTINE_REVIEW.md`](./docs/QUARANTINE_REVIEW.md), [`docs/MEMORY_POLICY.md`](./docs/MEMORY_POLICY.md) |
| Local SLM setup and Ollama lanes | [`docs/LOCAL_OLLAMA_SLM.md`](./docs/LOCAL_OLLAMA_SLM.md), [`docs/SLM_OPTION_PLAN.md`](./docs/SLM_OPTION_PLAN.md) |
| Code Foundry generated artifacts | [`docs/CODE_FOUNDRY_SLM.md`](./docs/CODE_FOUNDRY_SLM.md), [`docs/SECURITY.md`](./docs/SECURITY.md), [`docs/TESTING.md`](./docs/TESTING.md) |
| 3D/WebGL/WebGPU adapter planning | [`docs/3D_VISUALIZATION_LANE.md`](./docs/3D_VISUALIZATION_LANE.md), [`docs/ARCHITECTURE.md`](./docs/ARCHITECTURE.md), [`docs/SECURITY.md`](./docs/SECURITY.md) |
| Feedback memory and future learning | [`docs/FEEDBACK_MEMORY_SYSTEM.md`](./docs/FEEDBACK_MEMORY_SYSTEM.md), [`docs/MEMORY_POLICY.md`](./docs/MEMORY_POLICY.md), [`docs/DATASET_FORMAT.md`](./docs/DATASET_FORMAT.md) |
| Testing, CI, regression checks | [`docs/TESTING.md`](./docs/TESTING.md), [`docs/CI_LLM_FEEDBACK_LOOP.md`](./docs/CI_LLM_FEEDBACK_LOOP.md), [`docs/WORKFLOW_LOOP.md`](./docs/WORKFLOW_LOOP.md) |
| Human review, rollback, promotion | [`docs/HUMAN_REVIEW_GATE.md`](./docs/HUMAN_REVIEW_GATE.md), [`docs/ROLLBACK_PLAN.md`](./docs/ROLLBACK_PLAN.md), [`docs/WORKFLOW_LOOP.md`](./docs/WORKFLOW_LOOP.md) |

Full docs index: [`docs/README.md`](./docs/README.md).

---

## Core safety rules

GEF should stay weird in the engine room and strict at the breaker panel.

- Browser-first.
- Local-first by default.
- Canvas2D is the stable baseline.
- Curated modules before generated modules.
- Sandbox before promotion.
- Validation before execution.
- Telemetry before training.
- Memory as evidence, not clutter.
- JSONL for rows, not mystery blobs.
- Imported data starts quarantined.
- Deletion beats retention.
- Holdout data is sacred.

Do not:

- reintroduce unrestricted generated-code execution
- add frontend API keys or provider secrets
- execute imported JSONL, presets, memory, or provider output
- silently promote sandbox output into the main runtime
- treat model output as trusted
- store raw media data in memory or datasets
- store secrets in localStorage
- use `innerHTML` for user/imported/model text unless explicitly sanitized

---

## LLM workflow rules

For any agent or model working in this repo:

1. Read the handoff files before editing.
2. Keep changes small and reviewable.
3. Prefer a focused branch and PR over direct changes to `main`.
4. Fetch the current file before updating it.
5. Use the current file SHA for updates.
6. Run or wait for CI before calling work complete.
7. If CI fails, inspect logs and patch the cause instead of guessing.
8. If docs behavior changes, update the relevant doc and this index when needed.
9. If a new doc is added, update [`docs/README.md`](./docs/README.md).
10. If task state changes, update [`docs/TODO.md`](./docs/TODO.md) or [`docs/CURRENT_STATUS.md`](./docs/CURRENT_STATUS.md).

Markdown workflow:

- Root `README.md` is the mission, quickstart, and LLM handoff index.
- `docs/README.md` is the full docs table of contents.
- Deep details belong in focused docs, not in the root README.
- Every build-facing doc should include practical rules, examples, or validation notes.
- Do not let docs drift from code. If implementation changes, patch the doc in the same PR.

---

## Current continuation pointer

Source of truth for the latest state: [`docs/CURRENT_STATUS.md`](./docs/CURRENT_STATUS.md).

At the time of this README refinement, the latest merged work added the npm-driven local SLM setup menu for Ollama and GEF model checks. The next likely build steps are:

- add an in-app first-run Local SLM setup hint when Ollama or required models are missing
- add compile-smoke validation for Code Foundry generated Canvas2D artifact bodies
- add telemetry rows for accepted/rejected SLM requests
- expand Playwright coverage for the Code Foundry setup and generation path

Check [`docs/TODO.md`](./docs/TODO.md) before starting, because the task ledger may have moved.

---

## Repository entry points

Important source files:

- [`index.html`](./index.html)
- [`src/app.js`](./src/app.js)
- [`src/audio/analyzer.js`](./src/audio/analyzer.js)
- [`src/render/canvasRuntime.js`](./src/render/canvasRuntime.js)
- [`src/render/moduleRegistry.js`](./src/render/moduleRegistry.js)
- [`src/render/visualModuleFns.js`](./src/render/visualModuleFns.js)
- [`src/foundry/localSlmSuggest.js`](./src/foundry/localSlmSuggest.js)
- [`src/slm/providers/ollamaProvider.js`](./src/slm/providers/ollamaProvider.js)
- [`src/slm/validators/moduleSuggestionValidator.js`](./src/slm/validators/moduleSuggestionValidator.js)
- [`src/slm/validators/generatedVisualArtifactValidator.js`](./src/slm/validators/generatedVisualArtifactValidator.js)
- [`src/storage/localLibrary.js`](./src/storage/localLibrary.js)
- [`src/storage/quarantineReview.js`](./src/storage/quarantineReview.js)

Important tooling:

- [`package.json`](./package.json)
- [`vite.config.ts`](./vite.config.ts)
- [`playwright.config.js`](./playwright.config.js)
- [`scripts/setup/slm-setup.mjs`](./scripts/setup/slm-setup.mjs)
- [`tools/security-scan.mjs`](./tools/security-scan.mjs)
- [`tools/registry-smoke.mjs`](./tools/registry-smoke.mjs)
- [`tools/code-foundry-smoke.mjs`](./tools/code-foundry-smoke.mjs)
- [`tools/slm-setup-smoke.mjs`](./tools/slm-setup-smoke.mjs)

---

## Project rule of thumb

Models may suggest. Validators decide. Users promote.

That is the whole machine in one sentence. Keep the renderer alive, the sandbox honest, and the wiring labeled.
