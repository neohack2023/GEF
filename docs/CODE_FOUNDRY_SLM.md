# Code Foundry SLM Lane

GEF now has a second local SLM lane for code-shaped work.

This lane is separate from the small local helper model.

```text
llama3.2:3b thinks lightly.
qwen2.5-coder:3b drafts code artifacts.
validators decide what survives.
users promote what belongs in the renderer.
```

---

## Purpose

The Code Foundry lane is for generating and repairing **candidate** Canvas2D visual module bodies.

It is not a direct runtime authority.

Good jobs:

- generate a candidate Canvas2D render body
- lint a generated visual module against GEF rules
- repair syntax errors from a failed compile smoke test
- repair runtime errors from a sandbox smoke test
- retry generation with validator feedback
- explain why a module failed in plain language for telemetry

Bad jobs:

- direct promotion into the main renderer
- bypassing sandbox preview
- writing provider credentials or secrets
- accessing DOM, networking, storage, workers, cookies, or browser globals
- executing imported datasets, memory rows, presets, or arbitrary provider output

---

## Recommended model

Primary local code model:

```bash
ollama pull qwen2.5-coder:3b
```

Optional heavier repair lane:

```bash
ollama pull qwen2.5-coder:7b
```

Keep the smaller helper model installed for non-code tasks:

```bash
ollama pull llama3.2:3b
```

---

## Lane split

| Lane | Model | Role | Can draft code? | Can promote? |
| --- | --- | --- | --- | --- |
| Light helper | `llama3.2:3b` | prompt rewrite, idea routing, feedback summaries, curated-module suggestions | No | No |
| Code foundry | `qwen2.5-coder:3b` | generate, lint, repair, retry visual code artifacts | Yes | No |
| Heavier repair | `qwen2.5-coder:7b` | optional deeper code repair and shader reasoning | Yes | No |

The lane profiles live in:

```text
src/slm/slmLanes.js
```

---

## Required pipeline

The Code Foundry lane must use this path:

```text
prompt
-> generate_artifact
-> validate_static_policy
-> compile_smoke_test
-> runtime_smoke_test
-> repair_retry
-> sandbox_preview
-> user_promotion
```

The app should never treat a generated module as trusted just because a model wrote it cleanly.

A pretty hallucination is still a hallucination wearing stage lights.

---

## Approved render function context

Generated Canvas2D code should only assume access to:

```text
ctx, w, h, time, audio, fbCtx, Math
```

Current audio metrics:

```text
bass, mid, treble, beat, glitch, centroid, rms
```

The generated artifact should be a render-function body only. It should not import files, touch the DOM, call external services, or mutate app state outside the render context.

---

## Static policy screen

Generated code should pass the static policy validator before compile/runtime smoke tests.

Validator file:

```text
src/slm/validators/generatedVisualCodePolicy.js
```

Blocked patterns include:

```text
fetch, XMLHttpRequest, WebSocket, localStorage, sessionStorage, indexedDB,
document, window, navigator, location, eval, Function, import, script,
cookie, postMessage, Worker, SharedWorker, serviceWorker
```

This is not a complete security system by itself. It is the first fence before deeper validation.

---

## Suggested artifact shape

When the Code Foundry lane is wired into Foundry, prefer a structured object instead of freeform prose:

```json
{
  "schemaName": "gef-generated-visual-artifact",
  "schemaVersion": 1,
  "lane": "codeFoundry",
  "runtime": "canvas2d",
  "stage": "OVERLAY",
  "name": "Bass Lattice Bloom",
  "usedAudioSignals": ["bass", "beat", "glitch", "centroid"],
  "code": "// NAME: Bass Lattice Bloom\nctx.save();\n...\nctx.restore();",
  "notes": "Beat expands the lattice, centroid shifts hue, glitch slices the frame."
}
```

Only the validated `code` field should move toward sandbox preview.

---

## Repair loop

When code fails:

1. Capture validator phase: static, compile, or runtime.
2. Capture the specific error message.
3. Ask the Code Foundry SLM for a repair using the original prompt, failed code, and error.
4. Re-run the same checks.
5. Stop after a configured retry limit.
6. Log failure as training evidence, not as a promoted module.

Repairs should preserve the original visual intent unless the validator feedback requires a safer alternative.

---

## Promotion rule

Code Foundry can draft.

Sandbox can preview.

Only the user can promote.

```text
Models may suggest. Validators decide. Users promote.
```
