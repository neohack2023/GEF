# GEF Sandbox Compiler v2.3 TODO

Build map for growing the current modular safe foundation back toward the original Autopilot Forge plan.

Current foundation already in place:

- `index.html` root shell
- `src/styles.css`
- `src/app.js`
- `src/audio/analyzer.js`
- `src/core/constants.js`
- `src/render/visualModules.js`
- `src/render/canvasRuntime.js`
- `src/storage/localLibrary.js`
- `src/autopilot/autopilotStub.js`

---

## Phase 0 — Smoke test the modular shell

Goal: confirm the current app boots cleanly from local static hosting.

Tasks:

- [ ] Run the app from a local server, not directly from `file://`.
- [ ] Confirm `src/app.js` loads as an ES module.
- [ ] Confirm canvas renders the default Void Core visual.
- [ ] Confirm sliders update labels.
- [ ] Confirm tabs switch correctly.
- [ ] Confirm local presets save and reload.
- [ ] Confirm JSONL telemetry export downloads.

Snippet:

```bash
python -m http.server 8080
```

Then open:

```text
http://localhost:8080
```

Useful references:

- MDN JavaScript modules: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules
- Vite getting started, optional later dev server: https://vite.dev/guide/

---

## Phase 1 — Harden the audio metric engine

Goal: make the audio analysis layer predictable enough to drive visuals, recording, and later prompt/telemetry work.

Tasks:

- [ ] Add a debug panel that prints raw numeric metrics.
- [ ] Add peak-hold values for bass, mid, treble, glitch, centroid, and rms.
- [ ] Add configurable frequency-bin ranges instead of hardcoded bass/mid/treble split points.
- [ ] Add a simple beat cooldown so `beat` does not chatter during dense bass passages.
- [ ] Add track-position telemetry for media playback.
- [ ] Add an analyzer reset button.

Snippet: configurable frequency bands.

```js
const bands = {
  bass: [0, 10],
  mid: [10, 70],
  treble: [70, 200]
};

function averageBand(dataArray, start, end, audioSense = 1) {
  let total = 0;
  const safeEnd = Math.min(end, dataArray.length);
  for (let i = start; i < safeEnd; i++) {
    total += (dataArray[i] / 255) * audioSense;
  }
  return total / Math.max(1, safeEnd - start);
}
```

Useful references:

- MDN `AnalyserNode.getByteFrequencyData()`: https://developer.mozilla.org/en-US/docs/Web/API/AnalyserNode/getByteFrequencyData
- MDN `AudioContext`: https://developer.mozilla.org/en-US/docs/Web/API/AudioContext
- MDN Web Audio API guide: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API

---

## Phase 2 — Expand the curated visual module system

Goal: build a safe module catalog before restoring live compiler adapters.

Tasks:

- [ ] Add `src/render/moduleRegistry.js`.
- [ ] Move module metadata out of `visualModules.js` into a registry.
- [ ] Add module categories: `base`, `overlay`, `post_fx`, `feedback`, `hud`.
- [ ] Add per-module parameter schemas.
- [ ] Add module enable/disable persistence in presets.
- [ ] Add a mini inspector for each module.

Snippet: module contract.

```js
export const moduleContract = {
  id: 'spectralGrid',
  name: 'Spectral Grid',
  stage: 'OVERLAY',
  defaults: {
    opacity: 0.75,
    density: 1.0,
    blendMode: 'screen'
  },
  render(ctx, w, h, time, audio, resources) {
    // draw here
  }
};
```

Snippet: registry helper.

```js
const registry = new Map();

export function registerModule(moduleDef) {
  if (!moduleDef?.id || typeof moduleDef.render !== 'function') {
    throw new Error('Invalid visual module definition.');
  }
  registry.set(moduleDef.id, moduleDef);
}

export function getModule(id) {
  return registry.get(id) || null;
}

export function listModules() {
  return [...registry.values()];
}
```

Useful references:

- MDN Canvas API: https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API
- MDN `CanvasRenderingContext2D`: https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D

---

## Phase 3 — Add the WebGL adapter

Goal: restore the GLSL lane as a dedicated module instead of mixing shader code into the app shell.

Target file:

```text
src/render/glslRuntime.js
```

Tasks:

- [ ] Create `GlslRuntime` class.
- [ ] Add shader compile diagnostics.
- [ ] Add uniform binding for `time`, `resolution`, and audio metrics.
- [ ] Add fallback if WebGL is unavailable.
- [ ] Add one default GLSL Void shader.
- [ ] Add `webglcontextlost` and `webglcontextrestored` handling.

Snippet: compile shader helper.

```js
function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const message = gl.getShaderInfoLog(shader) || 'Unknown shader compile error.';
    gl.deleteShader(shader);
    throw new Error(message);
  }

  return shader;
}
```

Useful references:

- MDN WebGL API: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API
- MDN WebGL best practices: https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices
- WebGL Fundamentals: https://webglfundamentals.org/

---

## Phase 4 — Add the WebGPU / WGSL adapter

Goal: restore the WGSL lane with clean feature detection and graceful fallback.

Target file:

```text
src/render/webgpuRuntime.js
```

Tasks:

- [ ] Create `WebGpuRuntime` class.
- [ ] Add `navigator.gpu` support check.
- [ ] Request adapter and device only once.
- [ ] Configure canvas context with preferred format.
- [ ] Add uniform buffer layout for resolution, time, speed, and audio metrics.
- [ ] Add shader module diagnostics.
- [ ] Fall back to Canvas2D if WebGPU is unavailable.

Snippet: WebGPU device init.

```js
export async function initWebGpu(canvas) {
  if (!navigator.gpu) {
    throw new Error('WebGPU is not supported in this browser.');
  }

  const adapter = await navigator.gpu.requestAdapter();
  if (!adapter) {
    throw new Error('No WebGPU adapter was available.');
  }

  const device = await adapter.requestDevice();
  const format = navigator.gpu.getPreferredCanvasFormat();
  const context = canvas.getContext('webgpu');

  context.configure({
    device,
    format,
    usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC
  });

  return { adapter, device, format, context };
}
```

Useful references:

- MDN WebGPU API: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- MDN `GPUDevice.createShaderModule()`: https://developer.mozilla.org/en-US/docs/Web/API/GPUDevice/createShaderModule
- W3C WGSL specification: https://www.w3.org/TR/WGSL/

---

## Phase 5 — Restore Pyodide as an optional adapter

Goal: bring back Python rendering without loading Pyodide unless the user selects Python.

Target file:

```text
src/python/pyodideRuntime.js
```

Tasks:

- [ ] Lazy-load Pyodide only when Python lane is selected.
- [ ] Add a loading state in the UI.
- [ ] Bind `ctx`, `w`, `h`, `time`, `speed`, and audio metrics into Python globals.
- [ ] Require a `render_frame()` function in Python snippets.
- [ ] Add error capture and diagnostics.
- [ ] Keep Python adapter isolated from the main render loop when inactive.

Snippet: lazy Pyodide loader.

```js
let pyodidePromise = null;

export function loadPyodideOnce() {
  if (!pyodidePromise) {
    pyodidePromise = globalThis.loadPyodide();
  }
  return pyodidePromise;
}
```

Useful references:

- Pyodide JavaScript API: https://pyodide.org/en/stable/usage/api/js-api.html
- Pyodide loading packages: https://pyodide.org/en/stable/usage/loading-packages.html

---

## Phase 6 — Upgrade recording and export tools

Goal: make captures reliable for long visual sessions.

Tasks:

- [ ] Add recording status timer.
- [ ] Add bitrate selector.
- [ ] Add FPS selector: 24, 30, 60.
- [ ] Add warning if no audio stream is routed.
- [ ] Add cleanup for object URLs.
- [ ] Add canvas-size export options: viewport, 1080p, 4K.
- [ ] Add capture metadata JSON export next to the video.

Snippet: stable canvas recording baseline.

```js
const videoStream = canvas.captureStream(30);
const audioTracks = audioAnalyzer.streamDestination
  ? audioAnalyzer.streamDestination.stream.getAudioTracks()
  : [];

const combinedStream = new MediaStream([
  ...videoStream.getVideoTracks(),
  ...audioTracks
]);

const recorder = new MediaRecorder(combinedStream, {
  mimeType: 'video/webm;codecs=vp9,opus',
  videoBitsPerSecond: 8000000
});

recorder.start(1000);
```

Useful references:

- MDN `HTMLCanvasElement.captureStream()`: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
- MDN `MediaRecorder`: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder
- MDN `MediaStream`: https://developer.mozilla.org/en-US/docs/Web/API/MediaStream

---

## Phase 7 — Build a reviewed Foundry adapter layer

Goal: prepare the old Autopilot idea without wiring remote output directly into the runtime.

Target files:

```text
src/foundry/foundryProvider.js
src/foundry/foundryQueue.js
src/foundry/foundryValidator.js
src/foundry/foundrySmokeTest.js
```

Rules:

- [ ] No API keys in committed frontend code.
- [ ] Use provider interfaces instead of hardcoded services.
- [ ] Store provider configuration locally or route through a backend proxy.
- [ ] Validate returned module shape before preview.
- [ ] Preview in sandbox only.
- [ ] Never auto-commit a generated visual without user approval.
- [ ] Log prompt, stage, validation result, and user feedback.

Snippet: provider interface.

```js
export class FoundryProvider {
  async generateModule(request) {
    throw new Error('Provider must implement generateModule(request).');
  }
}
```

Snippet: safe request shape.

```js
const request = {
  stage: 'OVERLAY',
  prompt: 'audio-reactive spectral grid with bass-driven deformation',
  allowedApis: ['CanvasRenderingContext2D'],
  requiredArgs: ['ctx', 'w', 'h', 'time', 'audio', 'resources']
};
```

Snippet: validate module definition.

```js
export function validateModuleDefinition(moduleDef) {
  const errors = [];

  if (!moduleDef || typeof moduleDef !== 'object') errors.push('Module must be an object.');
  if (!moduleDef.id || typeof moduleDef.id !== 'string') errors.push('Missing string id.');
  if (!moduleDef.name || typeof moduleDef.name !== 'string') errors.push('Missing string name.');
  if (!moduleDef.stage || typeof moduleDef.stage !== 'string') errors.push('Missing string stage.');
  if (typeof moduleDef.render !== 'function') errors.push('Missing render function.');

  return {
    ok: errors.length === 0,
    errors
  };
}
```

Useful references:

- MDN Fetch API: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
- MDN Content Security Policy overview: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- OWASP client-side security: https://owasp.org/www-project-top-ten-client-side-security-risks/

---

## Phase 8 — Add diagnostics, tests, and developer tooling

Goal: make the project easier to debug before it grows teeth.

Tasks:

- [ ] Add `package.json`.
- [ ] Add Vite dev server.
- [ ] Add ESLint.
- [ ] Add Prettier.
- [ ] Add a `/tests` folder.
- [ ] Add smoke tests for audio analyzer math.
- [ ] Add smoke tests for module registry validation.
- [ ] Add browser sanity checklist to `docs/TESTING.md`.

Suggested file layout:

```text
src/
  app.js
  audio/
    analyzer.js
  core/
    constants.js
  foundry/
    foundryProvider.js
    foundryQueue.js
    foundryValidator.js
    foundrySmokeTest.js
  python/
    pyodideRuntime.js
  render/
    canvasRuntime.js
    glslRuntime.js
    moduleRegistry.js
    visualModules.js
    webgpuRuntime.js
  storage/
    localLibrary.js
docs/
  ARCHITECTURE.md
  TESTING.md
  SECURITY.md
```

Useful references:

- Vite guide: https://vite.dev/guide/
- ESLint getting started: https://eslint.org/docs/latest/use/getting-started
- Prettier docs: https://prettier.io/docs/
- Vitest guide: https://vitest.dev/guide/

---

## Phase 9 — Add docs for users and future contributors

Goal: make the repo understandable from a cold open.

Tasks:

- [ ] Update `README.md` with current architecture.
- [ ] Add screenshots or short GIF demos.
- [ ] Add `docs/ARCHITECTURE.md` explaining render lanes.
- [ ] Add `docs/SECURITY.md` explaining why Foundry is staged safely.
- [ ] Add `docs/AUDIO_METRICS.md` explaining how bass, mid, treble, beat, glitch, centroid, and rms are calculated.
- [ ] Add `docs/PRESET_FORMAT.md` for local save shape.

Snippet: audio metrics doc starter.

```md
# Audio Metrics

GEF maps Web Audio frequency data into normalized visual control signals.

- bass: average low-frequency bin energy
- mid: average mid-frequency bin energy
- treble: average upper-bin energy
- beat: short bass-energy spike against recent history
- glitch: positive spectral flux crossing the threshold
- centroid: weighted average frequency position
- rms: root-mean-square energy estimate
```

---

## Phase 10 — Original-plan feature recovery order

Recommended recovery order from safest to spiciest:

1. Canvas2D curated module registry
2. Preset save/load polish
3. Audio debug inspector
4. Recording/export controls
5. WebGL adapter
6. WebGPU adapter
7. Pyodide adapter
8. Foundry queue and prompt logs
9. Foundry provider abstraction
10. Sandbox validation and smoke tests
11. Manual import of reviewed visual modules
12. Optional provider-backed generation behind explicit user approval

Do not skip straight to the Foundry provider. The renderer needs a strong chassis before the weird engine goes back in.
