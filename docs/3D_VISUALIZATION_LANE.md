# 3D Visualization Lane Plan

GEF should support a dedicated 3D visualization lane alongside the current Canvas2D lane.

The first governed implementation slice is now present. This document remains the lane contract and roadmap for expanding it.

Core rule:

```text
Canvas2D remains the stable baseline. 3D is an adapter lane. Sandbox first, promotion last.
```

---

## Purpose

The 3D visualization lane gives GEF a path for depth-based audio-reactive visuals without replacing the current Canvas2D foundation.

Use it for:

- audio-reactive geometry
- particle fields
- tunnel and corridor visuals
- waveform terrain
- camera-driven motion
- depth fog, parallax, and perspective effects
- future WebGL or WebGPU-backed visual modules

Do not use it to bypass the safe renderer, sandbox, or validation model.

## Implemented first slice

The repository now includes:

- `src/render/adaptive3dRuntime.js` — capability router and fail-closed lifecycle
- `src/render/webgpu3dRuntime.js` — preferred WGSL/WebGPU renderer
- `src/render/webgl3dRuntime.js` — GLSL/WebGL2 fallback renderer
- `src/render/threeModuleRegistry.js` — curated 3D module metadata and sandbox validation
- `src/render/threeSceneGeometry.js` — bounded tunnel geometry and normalized audio uniforms
- `tools/three-runtime-smoke.mjs` — registry, safety, bounds, and numerical contract checks
- `tests/e2e/three-renderer.spec.js` — fallback, panic recovery, and unavailable-API coverage

Current backend order:

```text
AUTO -> WebGPU -> WebGL2 -> fail closed to stable Canvas2D
```

The first module is `bassTunnel3d`. It is curated, has fixed geometry limits, uses no remote assets, accepts only existing normalized audio metrics, and cannot be promoted to the main renderer in this slice.

---

## Relationship to Canvas2D

Canvas2D stays the stable lane.

The 3D lane should run beside it as an optional adapter:

```text
Audio Metrics
  -> Canvas2D Runtime -> Main/Sandbox/Composite Canvas
  -> 3D Visualization Lane -> Sandbox Preview -> User Promotion
```

The first version should be conservative:

1. Keep Canvas2D as the default renderer.
2. Add 3D as an explicit lane choice, not automatic replacement.
3. Render 3D output into a controlled canvas target.
4. Composite only through the normal sandbox/capture path.
5. Promote only through explicit user action.

---

## Lane responsibilities

A future 3D runtime should own:

- scene setup
- camera state
- geometry buffers or object definitions
- audio-reactive parameter updates
- resize handling
- render loop integration
- diagnostics for unsupported browser features
- cleanup when disabled or discarded

The app coordinator should not grow a hidden 3D engine inside `src/app.js`.

Recommended future files:

```text
src/render/threeRuntime.js
src/render/threeModules.js
src/render/threeModuleRegistry.js
```

If the implementation uses raw WebGL instead of a helper library, prefer:

```text
src/render/webgl3dRuntime.js
src/render/webgl3dModules.js
```

If the implementation waits for WebGPU, prefer:

```text
src/render/webgpu3dRuntime.js
src/render/webgpu3dModules.js
```

Name the lane by capability, not hype.

---

## Module contract sketch

3D modules should be structured definitions, not loose generated scripts.

```js
export const module3dDef = {
  id: 'bassTunnel3d',
  name: 'Bass Tunnel 3D',
  stage: 'BASE_3D',
  category: 'depth-field',
  runtime: '3d',
  defaults: {
    cameraDepth: 12,
    particleCount: 1200,
    fog: 0.35,
    motionScale: 1.0
  },
  paramsSchema: {},
  setup(scene, resources) {
    // trusted setup only
  },
  render(scene, camera, time, audio, resources) {
    // trusted draw/update only
  },
  dispose(resources) {
    // release buffers, textures, and event hooks
  }
};
```

Generated provider output must not become a 3D module without validation, sandbox preview, and user promotion.

---

## Stage model extension

The current stage model can stay intact while 3D lanes are introduced.

Suggested future stages:

| Stage | Meaning |
| --- | --- |
| `BASE_3D` | Primary depth scene foundation. |
| `OVERLAY_3D` | 3D layer composited over the Canvas2D baseline or another 3D base. |
| `POST_FX_3D` | Depth-aware effect pass or shader-style post step. |
| `UI_OVERLAY_3D` | Camera/debug overlays that should not affect feedback scoring unless intentional. |

Do not mix 2D and 3D stages silently. The module registry should make runtime and stage explicit.

---

## Safety rules

The 3D lane follows the same trust model as the rest of GEF:

- curated 3D modules may run after review
- model output is untrusted text
- imported presets and JSONL rows are untrusted data
- no frontend credentials
- no dynamic imports from provider output
- no arbitrary generated-code execution
- no direct promotion into the main runtime
- feature-detect browser APIs before use
- dispose GPU/scene resources when discarded
- keep panic reset able to return to the stable Canvas2D baseline

3D should make the engine deeper, not harder to recover.

---

## Browser and adapter strategy

Possible implementation tracks:

| Track | Use case | Notes |
| --- | --- | --- |
| Canvas2D pseudo-3D | Fast first prototype | Uses projection math and existing canvas path. Lowest risk. |
| WebGL 3D | Real geometry and particles | Requires context loss handling, shader diagnostics, cleanup. |
| WebGPU 3D | Future compute-heavy visuals | Must remain optional and feature-detected. |

Implementation order:

1. ✅ Formalize runtime/stage metadata in the module registry.
2. ✅ Add a sandbox-only adaptive WebGPU/WebGL2 runtime.
3. ✅ Add browser support diagnostics and explicit backend selection.
4. ✅ Add tests for unsupported contexts, discard, and panic reset.
5. Validate composite capture across target browsers and devices.
6. Add more curated modules only after performance receipts exist.
7. Only then allow model-assisted 3D suggestions.

---

## Audio-reactive inputs

The first 3D lane should use the existing stable metrics:

```text
bass, mid, treble, beat, glitch, centroid, rms
```

Suggested mappings:

| Metric | 3D use |
| --- | --- |
| `bass` | scale, tunnel pulse, camera push, particle expansion |
| `mid` | object rotation, mesh bend, density modulation |
| `treble` | sparkle, edge highlights, micro-particles |
| `beat` | discrete bursts, camera cuts, ring emission |
| `glitch` | frame slicing, geometry jitter, RGB split, temporal snaps |
| `centroid` | brightness, fog color pressure, material sharpness |
| `rms` | global energy and scene intensity |

Audio metrics should stay stable before 3D behavior gets clever.

---

## Testing requirements

Minimum tests before any 3D lane becomes normal UI:

- [x] app boots when 3D APIs are unavailable
- [x] lane selector reports unsupported browser state clearly
- [x] sandbox preview can enable and discard a 3D module
- [x] panic reset clears 3D scene state and returns to Canvas2D
- recording/snapshot path still captures the expected composite canvas
- [x] memory/dataset rows record the lane and selected backend
- [x] no provider output executes as 3D code

Do not add 3D without recovery tests. Depth is not an excuse to dig a pit under the renderer.

---

## Non-goals for the first pass

The first 3D lane should not include:

- arbitrary generated 3D code execution
- remote asset loading by default
- frontend provider credentials
- automatic promotion from SLM or LLM output
- unbounded particle counts
- permanent GPU resources after discard
- mandatory WebGPU

---

## Build order

Recommended order relative to the current GEF roadmap:

1. Keep Canvas2D as stable baseline.
2. Add `src/render/moduleRegistry.js`.
3. Add runtime/stage metadata for `canvas2d` modules.
4. Add curated pseudo-3D Canvas2D modules to prove visual direction.
5. Add `3d` lane metadata to registry and presets.
6. Add sandbox-only 3D runtime adapter.
7. Add 3D diagnostics and tests.
8. Add SLM suggestions for curated 3D modules only.
9. Consider generated 3D artifacts only after the Code Foundry validator/sandbox path is proven.

```text
Stable main, wild sandbox, deeper stage.
```
