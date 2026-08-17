# GEF Current Status

Last updated after adding the governed adaptive 3D renderer slice.

This file is the quick handoff note for where the repo currently stands. Deeper design rules live in the specific docs; this page is the dashboard sticky note.

Core rule:

```text
Models may suggest. Validators decide. Users promote.
```

---

## Current verification state

GEF is partially smoke-tested and now has a Chromium Playwright harness, but broader device and browser verification remains pending.

Observed so far:

- Hosted static deployment runs on mobile from `https://gtterminal.neocities.org/systems/Gef/Index`.
- The app is not globally broken on the hosted Neocities path.
- Default `voidCore` render appears.
- Meters render at zero without audio.
- Sliders update labels.
- Studio, Foundry, and Library tabs switch.
- Laptop Edge showed browser/CSP-style behavior around `blob:` media and a stale/optional Pyodide source-map request.
- Full local laptop smoke testing is still pending.
- Playwright covers boot, sandbox recovery, mocked Local SLM preview, and the adaptive 3D fallback/fail-closed paths.
- Repo-side scripts exist for local static serving, syntax checks, and a small security scan.
- GitHub Actions rails now exist for Node CI, CI failure issue reporting, and PR handoff packets.
- Foundry has provider settings for local SLM endpoints and user-controlled LLM proxy endpoints.
- ✅ Local Ollama SLM can now return validated curated-module suggestions.
- ✅ Imported telemetry has a Library-side quarantine review gate before reviewed export.

Current assumption:

```text
Proceed carefully from a partially smoke-tested foundation.
```

---

## Recently completed

### ✅ Adaptive WebGPU/WebGL2 3D sandbox lane added

What changed:

- Added a curated `Bass Tunnel 3D` audio-reactive visualization.
- Added WebGPU as the preferred renderer and WebGL2 as the fallback.
- Added explicit `auto`, `webgpu`, and `webgl2` backend selection.
- Kept Canvas2D as the stable main renderer.
- Kept 3D sandbox-only with no generated shader execution or automatic promotion.
- Added bounded geometry, device-pixel-ratio limits, backend diagnostics, resource disposal, and panic recovery.
- Added Node contract smoke coverage and Playwright fallback/unavailable-API coverage.
- Added 3D frames to the existing composite snapshot/recording path.

Still pending before promotion beyond sandbox:

- CI verification of the new branch
- manual WebGPU device verification
- cross-browser composite capture verification
- performance receipts on mobile and integrated GPUs
- context/device-loss recovery beyond fail-closed return to Canvas2D

### ✅ Local Ollama SLM suggestion lane added

Commits:

```text
9b8e34574e2a646e555204e3acba3c167b2a2c73 - Add local Ollama SLM provider
02d1d469fa5803cdf2d51964f114c17d5e4d8a60 - Add SLM module suggestion validator
6d679273d6acb461683434b893be35ea9e40b0f6 - Add local SLM module suggestion UI
a0e4b54ecc62d359e8f192d777854905cb1dc8c6 - Load local SLM suggestion UI
4ff727a768c775fa28138e686b69467c270318e7 - Include local SLM modules in syntax checks
c329b02558500f5a7f0004f38bff3b525207653c - Document local Ollama SLM lane
a3bc0e7cc480eb2d8f6ab949bcf53797def368a2 - Add local Ollama SLM doc to docs index
ae3f924d606482d75eeba83206aad7489ec7abb2 - Add local Ollama SLM lane to README
```

What changed:

- Added `src/slm/providers/ollamaProvider.js`.
- Added `src/slm/validators/moduleSuggestionValidator.js`.
- Added `src/foundry/localSlmSuggest.js`.
- Foundry Provider Access now gains runtime controls for:
  - **Test Ollama**
  - **Ask Local SLM**
- The Ollama provider only accepts local endpoints.
- The Ollama call uses non-streaming JSON-shaped generation.
- The first SLM task is curated module suggestion only.
- The validator checks schema name, version, module id, stage, confidence, and reason.
- Valid suggestions are logged and displayed.
- Invalid suggestions are rejected and logged.
- No runtime module is applied automatically.
- No generated code is executed.
- `npm run check:syntax` now includes the new SLM modules.
- Added `docs/LOCAL_OLLAMA_SLM.md`.
- Added the new doc to the root README and docs index.

Recommended local settings:

```text
Provider mode: Local SLM Endpoint
Endpoint: http://localhost:11434
Model: llama3.2:3b
Credential reference: local-only
```

Important limitation:

```text
This is the first AI re-entry point, not a full provider execution adapter.
```

Still pending:

- browser/local verification against a running Ollama service
- visible loading/disabled button state while a request is active
- validated **Preview Suggested Module** action
- SLM request/response telemetry row type
- local proxy fallback if direct browser-to-Ollama fetch is blocked

### ✅ Preset and Foundry log rendering hardened

Commit:

```text
a0e27f2090377e4a1a75c1cc52d309c9e1ce9611
```

What changed:

- Preset card rendering no longer injects preset names through markup strings.
- Foundry/autopilot log rendering no longer injects log messages through markup strings.
- User/import/log text is rendered through DOM nodes and `textContent`.

Remaining note:

- `renderModuleStack()` still uses markup strings with curated module metadata. This is lower risk while module metadata is local and trusted, but should be cleaned when the module registry is formalized.

### ✅ JSONL import parsing hardened

Commit:

```text
56ea53725170ef928b294d3c4ed722c9d9bd4997
```

What changed:

- Added JSONL import limits:
  - 2 MB max file size
  - 5000 max rows
  - 10000 max characters per line
  - 5 max reported errors in the status summary
- Import parses line-by-line.
- Blank lines are skipped.
- Non-object JSON rows are rejected.
- Oversized lines are rejected.
- Mixed files can import valid rows while reporting bad lines.
- Read failures report a clear status message.

### ✅ Imported telemetry rows start quarantined

Commits:

```text
cbe43e8cf5fc3e1c7dd47a462f4006376bfd3604 - Add telemetry import quarantine state
8876d2b7c6f7a8e4223235040577d789736055ca - Preserve JSONL import line numbers
```

What changed:

- Parsed JSONL rows preserve their original source line number.
- `importTelemetryRows(rows, metadata)` accepts import metadata.
- Imported rows are wrapped with `_gefImport` metadata.
- `_gefImport.state` starts as `quarantined`.
- `_gefImport.schemaStatus` starts as `unvalidated`.
- `_gefImport.reviewed` starts as `false`.
- Import status messages say `quarantined rows` instead of silently treating imports as trusted telemetry.

### ✅ Telemetry quarantine review gate added

Commits:

```text
b620d77fd1027b746c26870975f606381a9ba38c - Add telemetry quarantine review helpers
0cccece9b1087db7684179fb7183ed3876a09f2f - Add telemetry quarantine review UI
95acda024a8b5529ed5ca36c430181bac1546889 - Add telemetry quarantine review panel
67d05d0092557161e87ec333233bcc32a058a334 - Include quarantine review module in syntax checks
d7f9f7d920cd57e403b64ba194fec7157850bc34 - Document telemetry quarantine review flow
462c8083dbb4cd25f6ca3192188a48af53148c2c - Add quarantine review doc to docs index
65d2854d4cd0ab361941f4c0ceb86c82fe64c5ba - Add quarantine review doc to README map
8c688ac2f8d72811f57b673f7c08d7800e24ae20 - Style telemetry quarantine review panel
42a4b8f70e24dc965995c86fdc8dce55cb3ee4d7 - Mark quarantine review feature complete in docs index
5d62180e8d3dbd19b2cd10cdfb9cad192d20c7c9 - Mark quarantine review complete in current status
```

What changed:

- Added `src/storage/quarantineReview.js`.
- Added a Library-side **Import Quarantine** panel.
- The panel shows total, local, quarantined, promoted, and exportable row counts.
- The panel previews the first five quarantined rows with source file and line information.
- Added **Promote Quarantined** and **Delete Quarantined** actions.
- The telemetry export button now exports reviewed rows only.
- Quarantined rows are excluded from export until promoted.
- Export is blocked when only quarantined rows are available.
- `npm run check:syntax` includes the quarantine review module.
- Added `docs/QUARANTINE_REVIEW.md`.
- Added the feature to `docs/README.md` and the root README docs map.

Important limitation:

```text
This is a local review gate, not full dataset certification.
```

Still pending:

- per-row approve/delete controls
- schema validation for `gef-feedback-row-v1`
- privacy-state checks before export
- dataset-card generation for reviewed exports
- unit tests for promotion, deletion, and export filtering

### ✅ Media capability checks and browser/CSP warnings added

Commit:

```text
13001d7a3c525babfcc7244a83673317500a86db - Add media capability checks
```

What changed:

- Added media capability detection for object URLs, microphone capture, canvas recording, MediaRecorder, and MIME support checks.
- Media upload, microphone, and recording paths now fail visibly when unsupported or blocked.
- Object URLs are cleaned up after downloads and media replacement.

### ✅ Project check scripts added

Commits:

```text
0f46957ee05adf7803bf907a4a214e6672cfdf60 - Add project check scripts
d4a71e80ac8c474f89d132fa066aa629c4541cad - Add security scan helper
```

What changed:

- Added `package.json` scripts for:
  - `npm run dev`
  - `npm run check`
  - `npm run check:syntax`
  - `npm run check:security`
  - `npm run smoke:manual`
- `npm run dev` starts a Python static server on port 8080.
- `npm run check:syntax` runs `node --check` across current JavaScript modules.
- `npm run check:security` runs `tools/security-scan.mjs`.

### ✅ Safe provider settings added

Commits:

```text
dd4f7e0ca00911598536c27a72493f4e997efe5b - Add safe provider settings UI logic
362a709e85ac7a9166a9027a332bb1f0f911228e - Add safe provider settings panel
c2cad31d1eba3b7cdada298d834bb1d1c221a624 - Polish provider settings status handling
51f7bb1195d3077b00a3fe99e65740ec28183aa2 - Avoid secret wording in provider panel
```

What changed:

- Added `src/foundry/providerSettings.js`.
- Added a Foundry Provider Access panel.
- Provider modes include disabled, local SLM endpoint, and LLM proxy endpoint.
- The UI stores endpoint, model name, and credential reference only.
- Raw provider credentials are not requested or stored in the frontend.
- Local SLM mode only accepts local endpoints.
- LLM proxy mode expects a user-controlled backend/proxy to own provider credentials.
- The UI can copy a provider proxy contract.

### ✅ Node CI failure issue rail added

Commits:

```text
3a3301990e32d77ade61380b498c2f27ff61c81b - Add Node CI failure report helper
712424cfce0a15d9a6a4e17ecf09c7d7742268e9 - Add Node CI workflow with issue reporting
bb793ece24597d3ec1d2ea1dd7b561a464dd7971 - Limit Node CI issue-reporting permissions
```

What changed:

- Added Node CI workflow for `npm run check`.
- Added a CI failure report helper that extracts file/line style findings where possible.
- Push failures on main can create or update GitHub Issues with commit, run, stage, and repair packet details.
- CI issue-writing permissions are isolated to the reporting job.

### ✅ PR handoff packet rail added

Commits:

```text
ae1afeb4a82512a4c98109d869811b5de3f3cf07 - Add PR handoff report helper
43bb82142b640a96b40f287eebc8fe1b6825c425 - Add PR handoff packet workflow
```

What changed:

- Added PR handoff packet generation.
- The packet summarizes changed files, test output, docs touched, safety-sensitive areas, and reviewer checklist.
- The packet is written to the workflow summary and uploaded as an artifact.

---

## Current implementation limits

### Foundry / provider lane

- Local Ollama SLM suggestions now exist.
- Provider settings exist for local SLM and LLM proxy modes.
- The local SLM lane can suggest curated modules only.
- No provider call path can write code into the renderer.
- No frontend provider credentials should be added.

### Dataset and memory

The repo now has docs and partial implementation for:

- safer JSONL parsing
- per-row import line provenance
- import quarantine state
- Library-side quarantine review
- reviewed-only telemetry export
- `gef-feedback-row-v1` docs
- memory scoring and retention docs
- dataset split policy docs

Still pending:

- full `gef-feedback-row-v1` row builder
- schema validation/migration
- per-row quarantine review actions
- training/eval/holdout export gates
- memory promotion workflow

### Media and browser support

Media support is feature-detected, but not automatically cross-browser verified.

Still pending:

- manual verification on laptop Edge after clearing cache/site data
- local-server smoke test
- Chromium/Firefox/WebKit automated smoke coverage
- explicit CSP header/meta review for hosted deployment

### Testing and automation

Basic repo-side checks and GitHub Actions rails exist, but this is not yet a full browser test harness.

Still pending:

- local execution of `npm run check`
- verification of the first GitHub Actions runs
- Playwright installation/configuration
- boot smoke test
- sandbox panic test
- preset save/load test
- JSONL import/export tests
- Local Ollama SLM smoke test
- media unsupported-path tests

---

## Next recommended build step

Next target:

```text
Run local checks and smoke-test the local Ollama SLM lane against llama3.2:3b.
```

Build goals:

- Run `npm run check` locally.
- Run `npm run dev` locally and open `http://localhost:8080`.
- Confirm local-server boot.
- Confirm Provider Access can save Local SLM settings.
- Confirm `Test Ollama` can list local models.
- Confirm `Ask Local SLM` returns a validated curated-module suggestion.
- Confirm invalid or blocked Ollama responses fail visibly.
- Confirm no runtime module is applied automatically.
- Confirm sandbox toggle and panic reset behavior.
- Confirm preset save/load/delete behavior.
- Confirm JSONL import, quarantine preview, promote, delete, and reviewed export behavior.
- Confirm media upload/mic/recording behavior on the laptop browser that showed CSP symptoms.
- Add repeatable Playwright smoke tests after manual checks stabilize.

---

## Manual tests to run next

Run checks:

```bash
npm run check
```

Run local server:

```bash
npm run dev
```

Open:

```text
http://localhost:8080
```

For local Ollama:

```bash
ollama serve
ollama pull llama3.2:3b
```

Test checklist:

- App boots.
- Main canvas renders.
- Status shows stable engine active.
- Sliders update labels.
- Studio, Foundry, and Library tabs switch.
- Foundry Provider Access appears.
- Provider mode can switch to Local SLM Endpoint.
- Endpoint can be saved as `http://localhost:11434`.
- Model can be saved as `llama3.2:3b`.
- `Test Ollama` reports reachable local models.
- `Ask Local SLM` logs a valid curated-module suggestion.
- Invalid SLM output is rejected by the validator.
- No runtime module is applied automatically by the SLM lane.
- Sandbox toggle works.
- Panic reset clears sandbox state.
- Save/load/delete preset works.
- Valid JSONL imports as quarantined rows.
- Library Import Quarantine panel shows row counts.
- Promote Quarantined marks imported rows reviewed/exportable.
- Delete Quarantined removes quarantined imports.
- Export Reviewed skips quarantined rows.
- Media upload works where browser policy allows it.
- Media upload reports a useful message if `blob:` media is blocked.
- Microphone path either works or reports denial/unavailable clearly.
- Recording either works or reports unsupported clearly.

---

## Short next-session prompt

Use this if resuming later:

```text
Continue GEF from CURRENT_STATUS.md. The first AI re-entry lane is now Local Ollama SLM for validated curated-module suggestions using llama3.2:3b. It can test Ollama, ask for one module suggestion, validate the JSON response against the curated module catalog, and log accepted/rejected suggestions. It does not apply runtime changes automatically and does not execute generated code. Next: run npm run check, smoke-test Ollama locally, then decide whether to add Preview Suggested Module or SLM telemetry rows.
```
