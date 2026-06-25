# Local Ollama SLM Lane

GEF can use local Ollama models as controlled AI lanes inside Foundry.

This is intentionally split into jobs.

```text
Local SLM suggests. GEF validates. User promotes.
```

The local model lanes are setup-checked from npm so Windows Command Prompt, PowerShell, and CI all follow the same wiring.

---

## What exists now

Current implementation:

- `src/slm/providers/ollamaProvider.js`
- `src/slm/slmLanes.js`
- `src/slm/validators/moduleSuggestionValidator.js`
- `src/slm/validators/generatedVisualCodePolicy.js`
- `src/slm/validators/generatedVisualArtifactValidator.js`
- `src/foundry/promptBuilder.js`
- `src/foundry/localSlmSuggest.js`
- `scripts/setup/slm-setup.mjs`

The Foundry panel has an editable prompt window. The Prompt Builder adds controls around that window, but the textarea stays the source of truth.

The Foundry Provider Access panel gains local SLM controls at runtime:

- **Test Ollama**
- **Ask Local SLM**
- **Preview Suggestion**
- **Ask Code SLM**

When Provider Access is set to **Local SLM Endpoint**, GEF auto-fills local defaults:

```text
Endpoint: http://localhost:11434
Model: llama3.2:3b
Credential reference: local-only
```

The endpoint is still used internally because the browser talks to the local Ollama service over localhost. The user should not need to manually type it for the normal laptop-local setup.

---

## Command Prompt setup menu

After installing npm dependencies, run:

```bash
npm run setup:slm
```

The menu checks:

- whether the `ollama` command is available
- whether the local Ollama service responds
- which GEF SLM models are already installed
- which required models are missing
- which optional heavier repair model is missing

If Ollama is not installed, the menu prints and can open:

```text
https://ollama.com/download
```

If Ollama is installed but the local service is not responding, the Windows menu can open a new Command Prompt running:

```bash
ollama serve
```

If models are missing, the menu can pull them with:

```bash
ollama pull llama3.2:3b
ollama pull qwen2.5-coder:3b
```

Optional heavier repair model:

```bash
ollama pull qwen2.5-coder:7b
```

---

## Local model lanes

GEF defines two required local Ollama lanes:

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

The user can still edit, remove, rewrite, or reorder anything before pressing **Ask Local SLM** or **Ask Code SLM**.

---

## Manual setup fallback

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

Recommended GEF settings for curated-module suggestions are normally automatic after selecting Local SLM Endpoint:

```text
Provider mode: Local SLM Endpoint
Endpoint: http://localhost:11434
Model: llama3.2:3b
Credential reference: local-only
```

Recommended GEF settings for Code Foundry:

```text
Provider mode: Local SLM Endpoint
Endpoint: http://localhost:11434
Model: qwen2.5-coder:3b
Credential reference: local-only
```

No provider credentials belong in the frontend.

---

## Curated module suggestion task

The local SLM receives:

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

## Code Foundry task

The Code Foundry lane drafts candidate Canvas2D visual code artifacts and stages accepted output as untrusted manual compiler text.

It must not directly alter the main runtime.

Required path:

```text
prompt -> qwen2.5-coder:3b -> structured artifact -> static policy -> manual compiler text -> later compile smoke -> later runtime smoke -> later sandbox preview -> user promotion
```

The static policy screen lives in:

```text
src/slm/validators/generatedVisualCodePolicy.js
src/slm/validators/generatedVisualArtifactValidator.js
```

Do not confuse this lane with the curated-module suggestion button. The suggestion button chooses from existing modules. Code Foundry drafts candidate code artifacts for a validator-gated path.

---

## Why the current lane is safe enough for first AI re-entry

The currently wired lanes still do not let the model promote or silently execute generated code.

They do not:

- import generated modules
- alter the main runtime
- promote sandbox output
- store provider credentials
- make dataset rows training-ready
- execute imported memory, presets, JSONL, or provider output

The model is a navigator with a paper map, not a mechanic with a wrench.

---

## Known browser caveat

Browser-to-localhost requests may be affected by browser policy, hosting origin, or local Ollama configuration.

If **Test Ollama** fails:

1. Run `npm run setup:slm`.
2. Confirm Ollama is installed.
3. Confirm `ollama serve` is running.
4. Confirm `http://localhost:11434` responds locally.
5. Confirm the model is pulled.
6. Try the local dev server instead of a hosted static page.
7. If needed later, use a small local proxy adapter.

---

## Next upgrades

Good next steps:

1. Add SLM request/response telemetry row types.
2. Add JSON schema files under `src/slm/schemas/`.
3. Add timeout/abort UI state for long local model calls.
4. Add compile-smoke validation for generated Code Foundry artifacts.
