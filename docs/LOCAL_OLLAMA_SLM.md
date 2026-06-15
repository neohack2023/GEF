# Local Ollama SLM Lane

GEF can use local Ollama models as controlled AI lanes inside Foundry.

This is intentionally split into jobs.

```text
Local SLM suggests. GEF validates. User promotes.
```

The first implemented lane does not generate runtime code and does not change the renderer directly.

---

## What exists now

Current implementation:

- `src/slm/providers/ollamaProvider.js`
- `src/slm/slmLanes.js`
- `src/slm/validators/moduleSuggestionValidator.js`
- `src/slm/validators/generatedVisualCodePolicy.js`
- `src/foundry/promptBuilder.js`
- `src/foundry/localSlmSuggest.js`

The Foundry panel has an editable prompt window. The Prompt Builder adds controls around that window, but the textarea stays the source of truth.

The Foundry Provider Access panel gains two local SLM controls at runtime:

- **Test Ollama**
- **Ask Local SLM**

---

## Local model lanes

GEF now defines two active local Ollama lanes:

| Lane | Model | Job |
| --- | --- | --- |
| Light helper | `llama3.2:3b` | Prompt rewriting, idea routing, feedback summaries, memory distillation, and curated-module suggestions. |
| Code foundry | `qwen2.5-coder:3b` | Generate, lint, repair, and retry candidate Canvas2D visual code artifacts before sandbox review. |

Optional heavier lane:

| Lane | Model | Job |
| --- | --- | --- |
| Heavier code repair | `qwen2.5-coder:7b` | Slower but stronger repair and reasoning when local hardware can handle it. |

The lane profiles live in:

```text
src/slm/slmLanes.js
```

---

## Prompt Builder

The Prompt Builder is a helper for building better local SLM requests without hiding the text from the user.

It adds:

- quick chips such as Bass Pulse, Glitch Cuts, Grid Structure, Bloom Hits, Calm Drift, and High Energy
- sliders for density, motion, and audio reactivity
- a texture direction selector
- **Add Builder Details to Prompt**

Every control appends normal editable text into the Foundry prompt window.

The user can still edit, remove, rewrite, or reorder anything before pressing **Ask Local SLM**.

---

## Recommended local setup

Use Ollama locally:

```bash
ollama serve
```

Pull the small helper model:

```bash
ollama pull llama3.2:3b
```

Pull the code-focused model:

```bash
ollama pull qwen2.5-coder:3b
```

Optional heavier repair model:

```bash
ollama pull qwen2.5-coder:7b
```

Recommended GEF settings for the current curated-module suggestion lane:

```text
Provider mode: Local SLM Endpoint
Endpoint: http://localhost:11434
Model: llama3.2:3b
Credential reference: local-only
```

When the Code Foundry lane is wired into the UI, use:

```text
Provider mode: Local SLM Endpoint
Endpoint: http://localhost:11434
Model: qwen2.5-coder:3b
Credential reference: local-only
```

No provider credentials belong in the frontend.

---

## Current task: curated module suggestion

The current local SLM receives:

- the final editable Foundry prompt text
- selected stage
- the curated module catalog

It must return one JSON object shaped like:

```json
{
  "schemaName": "gef-module-suggestion",
  "schemaVersion": 1,
  "moduleId": "spectralGrid",
  "stage": "OVERLAY",
  "confidence": 0.75,
  "reason": "Short reason."
}
```

The validator checks:

- response is a JSON object
- schema name and version match
- `moduleId` exists in the curated module catalog
- `stage` is a known GEF stage
- suggested stage matches the curated module stage
- confidence is from 0 to 1
- reason exists

If validation fails, the response is logged as rejected.

If validation passes, the suggestion is displayed and logged. It does not apply a runtime change.

---

## Future task: candidate visual code artifact

The Code Foundry lane may draft candidate Canvas2D visual code after the validator and sandbox path is wired.

It must not directly alter the main runtime.

Required path:

```text
prompt -> qwen2.5-coder:3b -> static policy -> compile smoke test -> runtime smoke test -> repair retry -> sandbox preview -> user promotion
```

The static policy screen lives in:

```text
src/slm/validators/generatedVisualCodePolicy.js
```

Do not confuse this lane with the current curated-module suggestion button. The suggestion button chooses from existing modules. Code Foundry drafts code artifacts for a later sandbox-only flow.

---

## Why the current lane is safe enough for first AI re-entry

The currently wired lane only lets the model choose from existing curated modules.

It does not:

- execute generated code
- import generated modules
- alter the main runtime
- promote sandbox output
- store provider credentials
- make dataset rows training-ready

The model is a navigator with a paper map, not a mechanic with a wrench.

---

## Known browser caveat

Browser-to-localhost requests may be affected by browser policy, hosting origin, or local Ollama configuration.

If **Test Ollama** fails:

1. Confirm Ollama is running.
2. Confirm `http://localhost:11434` responds locally.
3. Confirm the model is pulled.
4. Try the local dev server instead of a hosted static page.
5. If needed later, use a small local proxy adapter.

---

## Next upgrades

Good next steps:

1. Add a validated **Preview Suggested Module** button.
2. Add an SLM request/response telemetry row type.
3. Add JSON schema files under `src/slm/schemas/`.
4. Add timeout/abort UI state for long local model calls.
5. Add a local proxy fallback if direct browser-to-Ollama fetch is blocked.
6. Add prompt-builder presets for common visual directions.
7. Wire Code Foundry into a sandbox-only generated-artifact flow.

Do not add generated visual code execution without the full static policy, smoke test, repair loop, sandbox preview, and user-promotion path.
