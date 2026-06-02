# GEF TODO

Current build map for growing GEF from the safe Canvas2D foundation toward the larger audio-reactive Foundry vision.

Core rule:

```text
Models may suggest. Validators decide. Users promote.
```

Do not skip the chassis work. The weird engine goes back in only after the wiring is labeled.

---

## Current verification status

Testing is partially started, but no automated test harness exists yet.

Observed so far:

- [x] Hosted static deployment loads and runs on mobile from `https://gtterminal.neocities.org/systems/Gef/Index`.
- [x] The app is not globally broken on the hosted webserver path.
- [x] Default `voidCore` render appears.
- [x] Preset and Foundry log rendering now use DOM nodes and `textContent` for user/log text.
- [x] JSONL import now has file size, row count, line length, line-by-line parsing, and partial failure reporting.
- [ ] Full local laptop smoke test is still pending.
- [ ] Laptop Edge showed browser/CSP-style blocking around `blob:` media and a stale/optional Pyodide source-map request.
- [ ] Need confirm whether laptop issue is cache, Edge policy, CSP, extension, or local browser configuration.
- [ ] True LLM/SLM-driven visual evolution is not implemented yet. Current evolve/iterate behavior is curated sandbox preview, not provider-backed generation.

The docs spine and safe foundation are in place, but runtime behavior remains only partially verified until Phase 0 and Phase 2 checks are completed.

Current assumption:

```text
Proceed carefully from a partially smoke-tested foundation.
```

This means new work can continue, but every code change should favor small commits, clear failure states, and easy rollback until the browser smoke tests and manual QA pass.

---

## Completed foundation

Core app files now in place:

- [x] `index.html` root shell
- [x] `src/styles.css`
- [x] `src/app.js`
- [x] `src/audio/analyzer.js`
- [x] `src/core/constants.js`
- [x] `src/render/visualModules.js`
- [x] `src/render/canvasRuntime.js`
- [x] `src/storage/localLibrary.js`
- [x] `src/autopilot/autopilotStub.js`

Core docs now in place:

- [x] `README.md` project landing page
- [x] `docs/README.md` docs index
- [x] `docs/ARCHITECTURE.md`
- [x] `docs/SECURITY.md`
- [x] `docs/AUDIO_METRICS.md`
- [x] `docs/PRESET_FORMAT.md`
- [x] `docs/DATASET_FORMAT.md`
- [x] `docs/MEMORY_POLICY.md`
- [x] `docs/TESTING.md`
- [x] `docs/SLM_OPTION_PLAN.md`
- [x] `docs/FEEDBACK_MEMORY_SYSTEM.md`

Current app capabilities:

- [x] Canvas2D visual runtime
- [x] curated visual module catalog
- [x] sandbox preview canvas
- [x] stable main canvas
- [x] feedback/composite canvas path
- [x] audio metrics: bass, mid, treble, beat, glitch, centroid, RMS
- [x] media upload path
- [x] microphone path
- [x] snapshot path
- [x] WebM capture path
- [x] local preset save/load/delete
- [x] telemetry JSONL export/import baseline
- [x] safe Foundry/Autopilot stub

---

## Phase 0 - Verify the current shell

Goal: prove the current static browser app boots and survives basic interaction before deeper refactors.

Tasks:

- [x] Confirm hosted static deployment can run on at least one mobile browser.
- [ ] Run from a local server, not `file://`.
- [ ] Confirm `src/app.js` loads as an ES module.
- [x] Confirm default `voidCore` render appears.
- [ ] Confirm meters render at zero without audio.
- [ ] Confirm sliders update labels.
- [ ] Confirm Studio, Foundry, and Library tabs switch.
- [ ] Confirm sandbox toggle works.
- [ ] Confirm panic reset clears sandbox state.
- [ ] Confirm save/load/delete preset flow works.
- [ ] Confirm telemetry export downloads JSONL.
- [ ] Confirm invalid JSONL import fails safely.
- [ ] Confirm app reload does not break saved local state.
- [ ] Re-test laptop Edge after clearing cache/site data.
- [ ] Confirm CSP allows required media behavior or app fails visibly when `blob:` media is blocked.

Command:

```bash
python -m http.server 8080
```

Open:

```text
http://localhost:8080
```

Known browser note:

```text
Laptop Edge may block blob media under a restrictive CSP or stale deployed build. Mobile hosted path works, so treat this as browser/deployment-specific until reproduced elsewhere.
```

---

## Phase 1 - Immediate safety hardening

Goal: remove the sharpest browser and import risks before building more memory, dataset, or provider features.

Tasks:

- [x] Replace preset/Foundry user-controlled `innerHTML` render paths with DOM construction and `textContent`.
- [x] Harden preset card rendering against HTML/script injection.
- [x] Harden autopilot log rendering against imported text injection.
- [x] Add JSONL import size limits.
- [x] Add line-by-line JSONL parsing with partial failure reporting.
- [ ] Add import quarantine state for telemetry/dataset rows.
- [ ] Add feature detection for `MediaRecorder`.
- [ ] Add feature detection for `canvas.captureStream`.
- [ ] Add feature detection for `navigator.mediaDevices.getUserMedia`.
- [ ] Add safer object URL cleanup for media upload and downloads.
- [ ] Add visible warning when recording is unsupported.
- [ ] Add visible warning when microphone is unavailable or denied.
- [ ] Add visible warning when media `blob:` URLs are blocked by browser/CSP policy.

Recent Phase 1 commits:

```text
a0e27f2090377e4a1a75c1cc52d309c9e1ce9611 - Harden preset and Foundry log rendering
56ea53725170ef928b294d3c4ed722c9d9bd4997 - Add safer JSONL import parsing
```

Regression tests to add later:

```text
unsafe preset name does not execute
invalid JSONL does not poison local storage
mixed JSONL imports valid rows and reports bad lines
oversized JSONL file is blocked
sandbox panic always returns to stable renderer
unsupported media APIs fail with a visible status message
blob media blocked by CSP reports a useful status message
```

---

## Phase 2 - Developer tooling and test harness

Goal: give the project a repeatable test loop.

Tasks:

- [ ] Add `package.json`.
- [ ] Add Vite or a simple static dev server script.
- [ ] Add ESLint.
- [ ] Add Prettier.
- [ ] Add Playwright.
- [ ] Add `/tests` folder.
- [ ] Add boot smoke test.
- [ ] Add sandbox panic test.
- [ ] Add preset save/load test.
- [ ] Add JSONL import/export test.
- [ ] Add media unsupported-path tests.
- [ ] Add security grep script for `eval`, `new Function`, `apiKey`, `secret`, and `token`.
- [ ] Add GitHub Actions workflow for tests.

Suggested layout:

```text
tests/
  unit/
  e2e/
  fixtures/
  helpers/
```

First useful scripts:

```json
{
  "scripts": {
    "dev": "vite --host 127.0.0.1",
    "test:e2e": "playwright test",
    "check:syntax": "node --check src/app.js && node --check src/audio/analyzer.js && node --check src/render/canvasRuntime.js && node --check src/storage/localLibrary.js",
    "check:security": "grep -R \"new Function\\|eval(\\|apiKey\\|secret\\|token\" src index.html || true"
  }
}
```

---

## Phase 3 - Preset format implementation

Goal: make `PRESET_FORMAT.md` real in code while keeping legacy saves loadable.

Tasks:

- [ ] Add `src/storage/presetFormat.js`.
- [ ] Add `schemaName: "gef-preset"` and `schemaVersion: 1` to new saves.
- [ ] Add stable preset IDs.
- [ ] Add `createdAt` and `updatedAt`.
- [ ] Add legacy v0 migration.
- [ ] Validate module IDs against module catalog.
- [ ] Clamp numeric UI values.
- [ ] Force imported presets to `promoteOnLoad = false`.
- [ ] Add single preset export.
- [ ] Add single preset import.
- [ ] Add preset-pack export/import later.
- [ ] Add read-only state for missing required adapters.

Safety rule:

```text
Preset imports restore configuration, not runtime authority.
```

---

## Phase 4 - Dataset format implementation

Goal: turn raw telemetry into structured feedback rows without treating raw logs as training data.

Tasks:

- [ ] Add `src/telemetry/eventTypes.js`.
- [ ] Add `src/telemetry/datasetWriter.js`.
- [ ] Add `src/telemetry/jsonlExport.js`.
- [ ] Add `src/telemetry/datasetSchemas.js`.
- [ ] Add `migrateLegacyTelemetryV0()`.
- [ ] Add `gef-feedback-row-v1` row builder.
- [ ] Add source/trust fields.
- [ ] Add quality fields.
- [ ] Add privacy fields.
- [ ] Add split fields: raw, train, validation, eval, holdout, quarantine, archive.
- [ ] Add export variants: raw local, clean feedback, train-ready, eval set, quarantine review.
- [ ] Add dataset-card export template.

Safety rule:

```text
Raw telemetry is not training data.
```

---

## Phase 5 - Memory policy implementation

Goal: make memory useful, small, explainable, and erasable.

Tasks:

- [ ] Add `src/memory/feedbackStore.js`.
- [ ] Add `src/memory/memorySchemas.js`.
- [ ] Add `src/memory/memoryManager.js`.
- [ ] Add `src/memory/scoring.js`.
- [ ] Add memory clear/export controls.
- [ ] Add working-memory row cap.
- [ ] Add import quarantine review flow.
- [ ] Add memory decay/expiration cleanup.
- [ ] Add distilled memory store.
- [ ] Add memory retrieval pack builder for SLM/router use.
- [ ] Add deletion cascade for derived memories.
- [ ] Move larger memory stores to IndexedDB.

Safety rule:

```text
Deletion beats retention.
```

---

## Phase 6 - Audio metrics hardening

Goal: make audio metrics stable enough for visuals, telemetry, and future model context.

Tasks:

- [ ] Add audio debug panel with raw numeric metrics.
- [ ] Add peak-hold values for bass, mid, treble, glitch, centroid, and RMS.
- [ ] Split audio math into testable pure helpers.
- [ ] Add configurable frequency-bin ranges.
- [ ] Add Hz-based band mapping using sample rate.
- [ ] Add beat cooldown.
- [ ] Add analyzer reset button.
- [ ] Add track-position telemetry for media playback.
- [ ] Add audio snapshot row for accepted/rejected previews.
- [ ] Add fake-buffer unit tests for bass, centroid, RMS, beat, and glitch.

Safety rule:

```text
Visual metrics should be stable before they are clever.
```

---

## Phase 7 - Module registry and curated visual expansion

Goal: strengthen curated modules before generated or imported modules return.

Tasks:

- [ ] Add `src/render/moduleRegistry.js`.
- [ ] Move module metadata out of `visualModules.js`.
- [ ] Add per-module parameter schemas.
- [ ] Add module categories: base, overlay, post_fx, feedback, hud.
- [ ] Add module order persistence.
- [ ] Add module inspector UI.
- [ ] Add module parameter controls.
- [ ] Add validation for module stage and params.
- [ ] Add at least 3 new curated Canvas2D modules.
- [ ] Add visual smoke tests for every curated module.

Safety rule:

```text
Curated modules first. Generated modules later.
```

---

## Phase 8 - Recording and export polish

Goal: make capture reliable and explainable.

Tasks:

- [ ] Add recording timer.
- [ ] Add FPS selector: 24, 30, 60.
- [ ] Add bitrate selector.
- [ ] Add canvas export size selector: viewport, 1080p, 4K.
- [ ] Add warning if no audio stream is routed.
- [ ] Add capture metadata JSON export.
- [ ] Add snapshot metadata JSON export.
- [ ] Revoke object URLs after safe delay.
- [ ] Add tests for unsupported recorder path.
- [ ] Add tests for unsupported captureStream path.

Safety rule:

```text
Media export should fail loudly, not mysteriously.
```

---

## Phase 9 - Foundry provider architecture

Goal: restore the Autopilot idea as reviewed provider suggestions, not direct runtime authority.

Current limitation:

```text
No LLM/SLM provider adapter is implemented yet. Evolve/iterate actions currently stage curated modules in sandbox and should not be expected to synthesize new visuals from a model.
```

Target files:

```text
src/foundry/foundryProvider.js
src/foundry/foundryQueue.js
src/foundry/foundryValidator.js
src/foundry/foundrySmokeTest.js
src/foundry/foundrySchemas.js
```

Tasks:

- [ ] Define provider request schema.
- [ ] Define provider response schema.
- [ ] Add mock provider first.
- [ ] Add timeout handling.
- [ ] Add diagnostics.
- [ ] Add validation before sandbox preview.
- [ ] Add bad JSON rejection.
- [ ] Add unknown module ID rejection.
- [ ] Add provider failure fallback.
- [ ] Add prompt injection regression tests.
- [ ] Add explicit user promotion requirement.
- [ ] Keep provider secrets out of frontend code.

Safety rule:

```text
Provider output is untrusted text until validated.
```

---

## Phase 10 - Optional render/runtime adapters

Goal: add future lanes as isolated adapters with detection, validation, fallback, and diagnostics.

Adapters:

- [ ] WebGL / GLSL
- [ ] WebGPU / WGSL
- [ ] Pyodide / Python
- [ ] browser-local SLM
- [ ] localhost SLM
- [ ] cloud LLM provider through safe adapter/proxy

Every adapter needs:

- [ ] feature detection
- [ ] schema validation
- [ ] smoke test
- [ ] timeout
- [ ] diagnostics
- [ ] failure fallback
- [ ] sandbox isolation
- [ ] no silent promotion

Safety rule:

```text
Canvas2D is the stable baseline. Everything else is optional.
```

---

## Phase 11 - Manual creative QA loop

Goal: keep the app useful as an instrument, not just correct as code.

Manual pass:

- [ ] Load an audio file.
- [ ] Confirm bass/mid/treble meters react.
- [ ] Confirm glitch reacts to change.
- [ ] Toggle sandbox.
- [ ] Run evolve preview.
- [ ] Run iterate preview.
- [ ] Confirm evolve/iterate currently use curated sandbox modules, not LLM/SLM generation.
- [ ] Like one preview.
- [ ] Reject one preview with reason.
- [ ] Save a preset.
- [ ] Reload and load preset.
- [ ] Export telemetry JSONL.
- [ ] Import valid JSONL.
- [ ] Try invalid JSONL.
- [ ] Import mixed valid/invalid JSONL and confirm valid rows are kept while bad lines are reported.
- [ ] Try oversized JSONL and confirm import is blocked.
- [ ] Snapshot PNG.
- [ ] Record short WebM where supported.
- [ ] Panic reset.
- [ ] Confirm stable renderer survives.

QA notes should capture:

```text
browser
OS
viewport
audio source
hosted/local URL
what looked good
what felt wrong
whether audio reaction matched expectation
browser-specific issues
CSP/media/blob errors
bugs or console errors
```

---

## Release readiness checklist

Before calling a build stable:

- [ ] README and docs index are current.
- [ ] Static syntax checks pass.
- [ ] App boots from local server.
- [ ] Stable renderer works with no audio.
- [ ] Hosted mobile smoke path works.
- [ ] Known browser-specific issues are documented.
- [ ] Sandbox panic works.
- [ ] Preset save/load works.
- [ ] JSONL export works.
- [ ] Invalid JSONL import fails safely.
- [ ] Mixed JSONL imports valid rows and reports bad lines.
- [ ] Oversized JSONL import is blocked.
- [ ] Unsafe preset names render as text.
- [ ] Foundry log messages render as text.
- [ ] No frontend API keys or provider secrets.
- [ ] No active generated-code execution path.
- [ ] Security grep reviewed.
- [ ] Playwright boot test passes in Chromium.
- [ ] Firefox/WebKit smoke results are documented.
- [ ] Manual creative QA completed.

---

## Recovery order from safest to spiciest

1. Local boot verification
2. User-controlled text hardening
3. JSONL import quarantine
4. Test harness
5. Preset schema implementation
6. Dataset schema implementation
7. Memory policy implementation
8. Audio metrics hardening
9. Module registry
10. Recording/export polish
11. Mock Foundry provider
12. Provider validation and smoke tests
13. WebGL adapter
14. WebGPU adapter
15. Pyodide adapter
16. SLM adapter
17. Cloud provider adapter behind safe boundary

Do not skip straight to provider-backed generation. The renderer needs a strong chassis before the strange engine goes back in.
