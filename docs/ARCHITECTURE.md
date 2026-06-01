# GEF Sandbox Compiler v2.3 Architecture

GEF is a browser-first, audio-reactive generative visual runtime.

The current build is a safe modular foundation for the original Autopilot Forge design. It preserves the core ideas: a stable main render path, an isolated sandbox preview path, audio-reactive metrics, local presets, telemetry export, and a future Foundry layer that can use LLM or SLM providers without letting model output directly own the renderer.

The short version:

```text
Media Input -> Audio Metrics -> Render Runtime -> Main Canvas
                                  |             
                                  -> Sandbox Canvas -> Feedback Buffer -> Composite Capture

User Prompt -> Foundry / SLM Router -> Module Choice -> Sandbox Preview -> Feedback Dataset -> Memory
```

Core principle:

> GEF should learn from use, but the renderer should stay deterministic, inspectable, and recoverable.

---

## Current state of the repo

### Root shell

`index.html` currently provides the visible browser application shell:

- Studio tab
- Foundry tab
- Library tab
- media upload and microphone controls
- playback, recording, and snapshot controls
- audio meters for bass, mid, treble, glitch, and centroid
- time speed, glitch threshold, and audio sense sliders
- adapter lane selector for WGSL, GLSL, JS Canvas, and Python
- sandbox runtime controls
- mutation prompt field
- feedback buttons
- local preset controls
- JSONL telemetry import/export
- hidden render canvases
- `audio` element
- ES module entrypoint at `src/app.js`

Current shell target:

```text
index.html -> src/styles.css -> src/app.js
```

---

## Existing source modules

```text
src/
  app.js
  audio/
    analyzer.js
  autopilot/
    autopilotStub.js
  core/
    constants.js
  render/
    canvasRuntime.js
    visualModules.js
  storage/
    localLibrary.js

docs/
  README.md
  SLM_OPTION_PLAN.md
  FEEDBACK_MEMORY_SYSTEM.md
  ARCHITECTURE.md
```

---

## Main runtime responsibilities

### `src/app.js`

The application coordinator.

Responsibilities:

- boot the app
- create the session id
- instantiate `AudioAnalyzer`
- instantiate `CanvasRuntime`
- bind UI controls
- route media or microphone into the analyzer
- update meters every animation frame
- call the runtime render loop
- route safe Foundry previews into the sandbox
- save and load local presets
- append telemetry rows
- import and export JSONL telemetry
- capture snapshots and WebM recordings

Current render loop shape:

```text
requestAnimationFrame
  -> read UI sliders
  -> audio.update(glitchThreshold, audioSense)
  -> update UI meters
  -> runtime.render(width, height, globalTime, metrics)
  -> if recording, update composite canvas
```

Architecture note:

`app.js` should remain a coordinator. As GEF grows, logic should move out into smaller systems instead of expanding `app.js` into a second monolith.

Recommended future extraction:

```text
src/ui/bindUi.js
src/media/mediaController.js
src/telemetry/eventLogger.js
src/foundry/foundryController.js
src/recording/recordingController.js
```

---

## Audio system

### `src/audio/analyzer.js`

`AudioAnalyzer` owns the Web Audio graph.

Current responsibilities:

- lazy-create `AudioContext`
- create `AnalyserNode`
- set `fftSize` to `1024`
- set `smoothingTimeConstant` to `0.1`
- create `MediaStreamDestination` for capture audio
- route media element or microphone sources into the analyzer
- calculate normalized visual metrics

Current metrics:

```js
{
  bass: 0,
  mid: 0,
  treble: 0,
  beat: 0,
  glitch: 0,
  centroid: 0,
  rms: 0
}
```

Current bin ranges:

```text
bass:   bins 0-9
mid:    bins 10-69
treble: bins 70-199
```

Current metric behavior:

- `bass`, `mid`, and `treble` are averaged from `getByteFrequencyData()` output.
- `glitch` is based on positive spectral flux crossing the glitch threshold.
- `centroid` is a weighted bin-position estimate.
- `rms` is a root-mean-square energy estimate.
- `beat` is a bass spike against a recent rolling bass history.

Browser foundation:

- `AnalyserNode.getByteFrequencyData()` copies frequency-domain data into a `Uint8Array` with values from `0` to `255`.
- Frequency bins are linearly spread from `0` to half the sample rate.
- The current architecture's bin-based bass/mid/treble mapping should eventually become configurable because the real Hz represented by each bin depends on sample rate and FFT size.

Useful reference:

```text
https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteFrequencyData
```

Future audio tasks:

- add explicit Hz-based band mapping
- add peak hold values
- add beat cooldown
- add meter debug panel
- add audio input reset
- add track-position telemetry
- add optional waveform/time-domain metrics
- add separate capture-routing diagnostics

---

## Render system

### `src/render/canvasRuntime.js`

`CanvasRuntime` owns the four-canvas runtime:

```text
mainCanvas       stable visual output
sandboxCanvas    experimental preview output
feedbackCanvas   scratch/copy buffer for feedback and post passes
compositeCanvas  capture/snapshot/recording output
```

Current runtime state:

```js
{
  baseModuleId: 'voidCore',
  enabledModules: Set(['spectralGrid', 'beatBloom', 'chromaSlice']),
  sandboxModuleId: null,
  sandboxActive: false,
  previewMode: 'AUTO'
}
```

Render path:

```text
runtime.render()
  -> resize all canvases
  -> renderMain()
      -> draw base module
      -> draw enabled overlay/post modules
  -> renderSandbox()
      -> clear sandbox
      -> draw sandbox module if active
      -> copy sandbox to feedback buffer
```

Capture path:

```text
runtime.drawComposite()
  -> clear composite canvas
  -> draw main canvas
  -> draw sandbox canvas if sandbox is active
  -> return composite canvas
```

Architectural boundary:

`CanvasRuntime` should only execute trusted, registered module functions. Generated text, provider output, prompt text, and imported datasets should never call renderer APIs directly.

---

## Visual module system

### `src/render/visualModules.js`

The current visual module system contains curated functions and a small catalog.

Current modules:

| ID | Stage | Purpose |
| --- | --- | --- |
| `voidCore` | `BASE` | Primary audio-reactive ring field |
| `spectralGrid` | `OVERLAY` | Audio-bent line lattice overlay |
| `beatBloom` | `POST_FX` | Beat-triggered radial light pulse |
| `chromaSlice` | `POST_FX` | Glitch-threshold slicing effect |

Current function contract:

```js
moduleFn(ctx, width, height, time, audio, sourceCanvas)
```

Recommended future contract:

```js
export const moduleDef = {
  id: 'spectralGrid',
  name: 'Spectral Grid',
  stage: 'OVERLAY',
  category: 'overlay',
  defaults: {
    opacity: 0.75,
    density: 1.0,
    blendMode: 'screen'
  },
  paramsSchema: {},
  render(ctx, w, h, time, audio, resources) {
    // trusted draw function
  }
};
```

Recommended next file:

```text
src/render/moduleRegistry.js
```

The registry should become the single source of truth for:

- module IDs
- module names
- stage
- category
- parameter schema
- default settings
- safe render function
- compatibility notes
- performance notes

---

## Stage model

GEF uses stages to keep visual behavior understandable.

Current and planned stages:

| Stage | Meaning |
| --- | --- |
| `PRE_BASE` | Optional input preparation before base render |
| `BASE` | Primary scene foundation |
| `OVERLAY` | Additive visual layer |
| `POST_FX` | Effects applied after the main scene |
| `FEEDBACK_PASS` | Uses previous/scratch canvas state |
| `UI_OVERLAY` | HUD, labels, debug overlays |

Rules:

- A `BASE` module can replace the foundation.
- An `OVERLAY` module should not erase the base.
- A `POST_FX` module may read from a source canvas or feedback buffer.
- A `FEEDBACK_PASS` must be explicit about read/write behavior.
- A `UI_OVERLAY` should not affect training feedback unless logged as intentional.

---

## Sandbox model

The sandbox exists to protect the main render path.

Current behavior:

- sandbox can be toggled on/off
- sandbox module can be discarded
- sandbox module can be promoted to main
- panic reset clears sandbox state
- preview mode controls how sandbox is composited

Preview modes:

| Mode | Behavior |
| --- | --- |
| `AUTO` | Replace only when sandbox module is base-like, otherwise stack |
| `STACK` | Force sandbox as overlay |
| `REPLACE` | Force sandbox as replacement preview |

Rules:

- Foundry and SLM/LLM decisions should preview in sandbox first.
- Promotion requires explicit user action.
- Sandbox diagnostics should record module ID, stage, provider, input prompt, validation status, and outcome.
- Panic should always return to the stable main runtime.

---

## Media and recording system

Current media input path:

```text
file upload / microphone
  -> AudioAnalyzer.init()
  -> source node
  -> analyser
  -> streamDestination
  -> speakers if media file, not microphone
```

Current recording path:

```text
compositeCanvas.captureStream(30)
  + AudioAnalyzer.streamDestination audio tracks
  -> MediaStream
  -> MediaRecorder
  -> WebM download
```

Browser foundation:

- `HTMLCanvasElement.captureStream()` returns a `MediaStream` containing a real-time capture track of the canvas contents.
- `captureStream(frameRate)` can set a capture frame rate.
- A canvas can fail capture if it is not origin-clean.
- `MediaRecorder` is the browser API currently used to encode the combined stream.

Useful references:

```text
https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
```

Future recording tasks:

- expose FPS selector
- expose bitrate selector
- display recording timer
- warn when no audio track is routed
- save metadata JSON next to capture
- add origin-clean warnings for external images/video
- add render-size export modes: viewport, 1080p, 4K

---

## Storage and local library

### `src/storage/localLibrary.js`

Current storage keys:

```js
const PRESET_KEY = 'gef_local_presets';
const TELEMETRY_KEY = 'gef_telemetry_dataset';
const AUTOPILOT_LOG_KEY = 'gef_autopilot_logs';
```

Current capabilities:

- read/write JSON from `localStorage`
- save local presets
- delete local presets
- append telemetry rows
- import telemetry rows
- export telemetry as JSONL
- append Foundry logs
- cap Foundry logs at 500 entries

Architecture note:

`localStorage` is acceptable for the prototype, but telemetry and memory should move to IndexedDB when rows grow.

Browser foundation:

- IndexedDB is designed for significant amounts of structured client-side data.
- IndexedDB supports indexes for high-performance searches.
- IndexedDB operations are asynchronous, avoiding main-thread blocking.
- IndexedDB follows same-origin policy.

Useful reference:

```text
https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
```

Recommended future stores:

```text
gef_events
gef_feedback_rows
gef_distilled_memories
gef_embeddings
gef_settings
gef_presets
gef_captures
```

---

## Feedback and memory architecture

The feedback system is not just UI. It is the learning substrate.

Existing UI:

- `Looks Good`
- `Reject & Log`
- rejection reason field
- JSONL telemetry import/export
- dataset count

Existing telemetry shape is simple:

```js
{
  timestamp,
  session_id,
  event_type,
  ...payload
}
```

Target loop:

```text
Prompt
  -> Plan
  -> Module Choice
  -> Sandbox Preview
  -> Validation
  -> User Feedback
  -> Dataset Row
  -> Memory Update
  -> Better Next Choice
```

Memory layers:

| Layer | Purpose | Storage |
| --- | --- | --- |
| Session buffer | last runs and active state | memory object |
| Local event log | append-only feedback rows | localStorage first, IndexedDB later |
| Distilled memory | compact lessons | IndexedDB/local JSON |
| Search index | retrieval for LLM/SLM | keyword first, embeddings later |

GEF should retrieve a small context pack before asking any model for a decision:

```js
const contextPack = {
  currentPrompt,
  selectedStage,
  availableModules,
  currentAudioMetrics,
  topMemories,
  recentRejectPatterns,
  userPreferences
};
```

Rule:

> Retrieve narrow, decide fast, store structured.

See:

```text
docs/FEEDBACK_MEMORY_SYSTEM.md
```

---

## Foundry architecture

### Current safe stub

`src/autopilot/autopilotStub.js` currently generates safe design notes and prompt variations. It does not make remote calls and does not execute generated code.

Current responsibilities:

- generate seed ideas
- queue text variations
- append Foundry logs
- provide safe-mode notice

This is intentional. The Foundry layer should come back through reviewed adapters, not as a monolith.

Recommended future layout:

```text
src/foundry/
  foundryController.js
  foundryProvider.js
  foundryQueue.js
  foundryValidator.js
  foundrySmokeTest.js
  foundrySchemas.js
```

Foundry rules:

- no API keys in committed frontend code
- no raw provider output gets renderer access
- provider output must become structured JSON first
- structured output must validate against schemas
- module choices must reference existing registry IDs
- generated modules, if ever allowed, must go through manual review and sandbox-only preview
- promotion to main must require explicit user action

---

## SLM / LLM provider architecture

The future model layer should be provider-based.

Target provider lanes:

| Lane | Use case |
| --- | --- |
| `mock` | deterministic development and tests |
| `browser_webllm` | browser-local chat-style SLM/LLM inference |
| `browser_transformers` | browser-local classification, embeddings, and small NLP tasks |
| `ollama` | localhost local-model server |
| `llama_cpp` | localhost GGUF/OpenAI-compatible server |
| `cloud_llm` | optional strongest remote model lane |

Stable router shape:

```js
const result = await slmRouter.run('module_choice', {
  prompt: userPrompt,
  stage: selectedStage,
  availableModules: moduleCatalog,
  audioMetrics: currentMetrics,
  memory: contextPack
});
```

Browser/local model references checked:

- WebLLM is designed for in-browser language model inference with WebGPU acceleration, OpenAI-compatible APIs, and Web Worker support.
- Transformers.js can run pretrained models in the browser and supports task pipelines such as text classification, text generation, embeddings/feature extraction, and zero-shot classification.
- Ollama exposes a local API by default at `http://localhost:11434/api`.

Useful references:

```text
https://webllm.mlc.ai/docs/
https://huggingface.co/docs/transformers.js/index
https://docs.ollama.com/api/introduction
https://github.com/ggml-org/llama.cpp/tree/master/tools/server
```

See:

```text
docs/SLM_OPTION_PLAN.md
```

---

## Worker architecture

Long-running provider work should not freeze the UI.

Use Web Workers for:

- browser SLM loading/inference
- embedding generation
- memory distillation
- larger JSONL import parsing
- future shader validation batches
- future dataset cleanup

Browser foundation:

- Web Workers run scripts in background threads without interfering with the user interface.
- Workers communicate with the main thread via `postMessage()` and `onmessage`.
- Workers cannot directly manipulate the DOM.
- Worker CSP should be considered separately from the parent page.

Useful reference:

```text
https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Using_web_workers
```

Recommended layout:

```text
src/workers/
  slmWorker.js
  memoryWorker.js
  validationWorker.js
```

Message contract:

```js
{
  id: 'request-id',
  type: 'MODULE_CHOICE',
  payload: {},
  createdAt: '2026-06-01T00:00:00.000Z'
}
```

Response contract:

```js
{
  id: 'request-id',
  ok: true,
  result: {},
  errors: [],
  completedAt: '2026-06-01T00:00:00.000Z'
}
```

---

## Adapter lanes

GEF advertises WGSL, GLSL, JS Canvas, and Python lanes. The current safe build only runs curated JS Canvas modules.

Planned adapters:

```text
src/render/glslRuntime.js
src/render/webgpuRuntime.js
src/python/pyodideRuntime.js
```

### JS Canvas lane

Current active lane.

Use for:

- base visuals
- overlays
- post effects
- feedback buffer effects
- stable testing

### GLSL / WebGL lane

Use for:

- fragment shaders
- shader-based post effects
- simple full-screen GPU visuals

Architecture rules:

- compile shaders in a dedicated runtime
- return diagnostics instead of throwing raw errors into UI
- handle context lost/restored events
- provide Canvas2D fallback

### WGSL / WebGPU lane

Use for:

- modern GPU render pipelines
- compute-assisted visuals
- particle systems
- future model-assisted/browser-GPU features

Browser foundation:

- WebGPU exposes GPU access through adapter and logical device abstractions.
- A web app accesses WebGPU via `navigator.gpu`, requests an adapter, then requests a device.
- WebGPU supports both rendering and general-purpose GPU compute.

Useful reference:

```text
https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
```

### Python / Pyodide lane

Use for:

- experimental math sketches
- Python-authored visual recipes
- research prototypes

Pyodide foundation:

- `loadPyodide()` loads and initializes the Pyodide WebAssembly runtime.
- Pyodide should be lazy-loaded only when the Python lane is selected.

Useful reference:

```text
https://pyodide.org/en/stable/usage/api/js-api.html
```

---

## Safety and trust boundaries

GEF has several trust zones.

| Zone | Trusted? | Notes |
| --- | --- | --- |
| Curated modules | yes | committed source reviewed by user/dev |
| UI prompt text | no | plain user input |
| Imported JSONL | no | parse and validate before use |
| Local telemetry | semi-trusted | produced locally but may be imported |
| SLM/LLM output | no | must be parsed, validated, and sandboxed |
| Provider configuration | sensitive | endpoints and keys must not be committed |
| Sandbox preview | contained | safe visual test lane |
| Main runtime | stable | only promoted modules/settings |

Rules:

- Treat all model output as untrusted text.
- Treat imported datasets as untrusted data.
- Do not commit API keys.
- Do not use direct generated-code execution in the normal runtime.
- Prefer existing module IDs plus parameter hints.
- Keep user approval between sandbox and main.
- Add CSP documentation before remote provider work.

CSP reference:

```text
https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/CSP
```

---

## Recommended future architecture tree

```text
src/
  app.js
  audio/
    analyzer.js
    audioBands.js
    audioDebug.js
  core/
    constants.js
    eventTypes.js
    schemas.js
  foundry/
    foundryController.js
    foundryProvider.js
    foundryQueue.js
    foundrySchemas.js
    foundrySmokeTest.js
    foundryValidator.js
  media/
    mediaController.js
    recordingController.js
  memory/
    feedbackStore.js
    memoryExport.js
    memoryManager.js
    memoryReducer.js
    memorySchemas.js
    memorySearch.js
    scoring.js
  python/
    pyodideRuntime.js
  render/
    canvasRuntime.js
    glslRuntime.js
    moduleRegistry.js
    visualModules.js
    webgpuRuntime.js
  slm/
    slmRouter.js
    providers/
      browserTransformersProvider.js
      browserWebLLMProvider.js
      cloudProvider.js
      llamaCppProvider.js
      mockProvider.js
      ollamaProvider.js
    prompts/
      moduleChoicePrompt.js
      mutationPlanPrompt.js
      visualIntentPrompt.js
    validators/
      validateModuleChoice.js
      validateSlmJson.js
  storage/
    indexedDbStore.js
    localLibrary.js
  telemetry/
    datasetWriter.js
    eventLogger.js
    jsonlExport.js
  ui/
    bindUi.js
    renderLibrary.js
    renderMeters.js
    renderModuleStack.js
    renderStatus.js
  workers/
    memoryWorker.js
    slmWorker.js
    validationWorker.js
```

---

## Data flow diagrams

### Render data flow

```text
AudioAnalyzer.update()
  -> metrics
  -> app.renderEngine()
  -> CanvasRuntime.render()
  -> visualModules[moduleId]()
  -> main/sandbox canvases
  -> composite canvas when recording/snapshotting
```

### Foundry data flow

```text
User prompt
  -> Foundry controller
  -> memory retrieval pack
  -> SLM/LLM router
  -> structured decision JSON
  -> validator
  -> sandbox module preview
  -> feedback UI
  -> feedback row
  -> memory manager
```

### Dataset data flow

```text
UI event / model decision / validation result / user feedback
  -> event logger
  -> feedback row schema
  -> local store
  -> JSONL export
  -> optional distillation
  -> future training/evaluation set
```

---

## Build order from here

Recommended order:

1. `src/render/moduleRegistry.js`
2. `src/memory/feedbackStore.js`
3. structured feedback row schema
4. docs for `DATASET_FORMAT.md`
5. UI feedback tags
6. keyword memory search
7. SLM mock provider
8. SLM router
9. Foundry controller
10. IndexedDB store
11. WebGL adapter
12. WebGPU adapter
13. Pyodide adapter
14. browser SLM provider
15. Ollama provider
16. memory distillation worker
17. optional cloud provider

This order keeps the chassis strong before adding the engine with opinions.

---

## Architecture maxims

- Stable main, wild sandbox.
- Curated modules first, generated modules last.
- Feedback is data, not decoration.
- Memory should be distilled, not hoarded.
- The SLM steers; the runtime decides.
- Every provider output is untrusted until validated.
- Every useful failure should become a row.
- The renderer should survive bad ideas.
