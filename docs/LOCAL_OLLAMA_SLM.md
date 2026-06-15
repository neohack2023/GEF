# Local Ollama SLM Lane

GEF can now use a local Ollama model as the first AI lane back into Foundry.

This is intentionally small.

```text
Local SLM suggests. GEF validates. User promotes.
```

The current lane does not generate runtime code and does not change the renderer directly.

---

## What exists now

Current implementation:

- `src/slm/providers/ollamaProvider.js`
- `src/slm/validators/moduleSuggestionValidator.js`
- `src/foundry/localSlmSuggest.js`

The Foundry Provider Access panel gains two local SLM controls at runtime:

- **Test Ollama**
- **Ask Local SLM**

---

## Recommended local setup

Use Ollama locally:

```bash
ollama serve
```

Pull the small model we have already been aiming at:

```bash
ollama pull llama3.2:3b
```

Recommended GEF settings:

```text
Provider mode: Local SLM Endpoint
Endpoint: http://localhost:11434
Model: llama3.2:3b
Credential reference: local-only
```

No provider credentials belong in the frontend.

---

## Current task: curated module suggestion

The local SLM receives:

- the Foundry seed prompt
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

## Why this lane is safe enough for first AI re-entry

This lane only lets the model choose from existing curated modules.

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

Do not add generated visual code execution here.
