# GEF Security Model

Security plan for GEF Sandbox Compiler v2.3.

GEF is a browser-first audio-reactive visual runtime with a stable main renderer, an experimental sandbox renderer, local feedback memory, and future SLM/LLM provider lanes.

The current build is intentionally safer than the original monolith: Foundry is stubbed, remote calls are staged out, and curated visual modules are selected by ID instead of running arbitrary generated code.

The security goal is simple:

> Let GEF learn from use without letting untrusted text, imported data, or model output take control of the renderer.

---

## Current security posture

Current protective traits:

- Foundry runs in safe mode and only queues design notes or curated previews.
- Remote model calls are not active in the current browser runtime.
- The renderer only calls trusted functions from `visualModules.js`.
- `CanvasRuntime.setSandboxModule()` accepts only known module IDs.
- Sandbox previews must be promoted manually before becoming part of the main runtime.
- The panic button clears the sandbox and returns to the stable path.
- Presets, telemetry, and Foundry logs stay local in browser storage.
- Telemetry export is explicit through JSONL download.

Current weak points to improve:

- `index.html` still contains inline styles, which limits strict CSP adoption.
- Imported JSONL telemetry is parsed but not schema-validated yet.
- Local telemetry uses `localStorage`, which is simple but not ideal for larger or sensitive datasets.
- UI rendering still uses `innerHTML` in several places, which must not receive untrusted content.
- The future SLM/LLM layer needs strict provider boundaries before model output can affect previews.
- Future WebGL, WebGPU, and Pyodide adapters need dedicated validation and kill-switch controls.

---

## Trust zones

| Zone | Trust level | Examples | Rule |
| --- | --- | --- | --- |
| Committed source code | trusted | `src/render/visualModules.js`, `src/audio/analyzer.js` | Review before merge |
| Curated module registry | trusted with validation | `voidCore`, `spectralGrid`, `beatBloom`, `chromaSlice` | Only registered IDs can render |
| User prompt text | untrusted | mutation prompt, Foundry seed prompt | Treat as data |
| Imported JSONL | untrusted | telemetry import, future memory imports | Validate schema before storing |
| Local telemetry | semi-trusted | locally generated rows | Revalidate after import/export |
| SLM/LLM output | untrusted | module choice JSON, mutation plans | Parse, validate, sandbox |
| Browser storage | semi-trusted | presets, logs, feedback memory | Never store secrets |
| Local model endpoints | sensitive | Ollama, llama.cpp | Localhost only, user controlled |
| Canvas media input | user-controlled | uploaded audio/video, mic input | No hidden upload, no remote exfil |
| Sandbox preview | contained | staged visual module | Must be discardable |
| Main runtime | stable | promoted modules/settings | Only user-approved changes |

Core rule:

```text
Untrusted input may influence a choice, but it must never become executable authority.
```

---

## Main threat model

### 1. DOM-based XSS

Risk:

- prompt text, model output, telemetry rows, or imported JSONL could be rendered into the DOM unsafely.

Controls:

- Prefer `textContent` for all user/model/data text.
- Keep `innerHTML` for static templates only.
- Never place imported data directly into HTML strings.
- Add sanitization before rendering any rich text or markdown.
- Move inline styles out of `index.html` so CSP can become stricter.
- Evaluate Trusted Types once the UI has fewer string-based HTML paths.

Do:

```js
row.textContent = modelOutput;
```

Avoid:

```js
row.innerHTML = modelOutput;
```

References:

- MDN CSP: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- MDN Trusted Types: https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
- OWASP DOM XSS Prevention: https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html

---

### 2. Prompt injection and model-output takeover

Risk:

- future SLM/LLM providers may be tricked into returning unsafe instructions, invented module IDs, fake validation results, hidden markdown, or attempts to bypass sandbox rules.

Controls:

- Separate system instructions from user data in prompts.
- Require strict JSON for model decisions.
- Validate JSON shape before use.
- Validate module IDs against the registry.
- Validate stage values against `STAGES`.
- Limit provider output size.
- Reject responses containing HTML, scripts, markdown links, hidden markup, or unexpected fields in sensitive paths.
- Log model decisions and validation failures.
- Keep human approval between sandbox and main.

Preferred model output path:

```text
raw model text
  -> extract JSON
  -> schema validation
  -> registry validation
  -> sandbox preview
  -> user approval
  -> main promotion
```

Never allow this path:

```text
raw model text -> renderer execution
```

References:

- OWASP LLM Top 10 2025: https://genai.owasp.org/llm-top-10/
- OWASP LLM Prompt Injection Prevention: https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html

---

### 3. Improper output handling

Risk:

- SLM/LLM output may be treated as safe because it looks structured.

Controls:

- Treat all provider output as untrusted until validated.
- Use JSON schemas for `visualIntent`, `moduleChoice`, and `mutationPlan`.
- Reject unknown fields in security-critical decision objects.
- Reject module IDs not present in the local registry.
- Reject generated code in normal provider routes.
- Apply output size limits.
- Store validation errors in telemetry.

Validator shape:

```js
export function validateModuleChoice(choice, moduleCatalog) {
  const ids = new Set(moduleCatalog.map((mod) => mod.id));

  if (!choice || typeof choice !== 'object') throw new Error('Choice must be an object.');
  if (!ids.has(choice.moduleId)) throw new Error(`Unknown module id: ${choice.moduleId}`);
  if (typeof choice.confidence !== 'number') choice.confidence = 0;

  return choice;
}
```

---

### 4. Dataset poisoning

Risk:

- imported JSONL or poisoned telemetry could bias SLM decisions, corrupt memory, or smuggle malicious instructions into future prompts.

Controls:

- Treat imported JSONL as untrusted.
- Validate each row against a dataset schema.
- Limit row size and total import size.
- Strip HTML and control characters from text fields.
- Store imported rows with `source: imported`.
- Keep imported data separate from locally generated feedback until reviewed.
- Distill memory from high-signal rows only.
- Do not feed raw imported rows directly into a model prompt.

Safe memory path:

```text
JSONL import
  -> parse line by line
  -> schema validation
  -> quarantine imported rows
  -> score rows
  -> distill compact lessons
  -> retrieve narrow memory pack
```

Unsafe path:

```text
JSONL import -> model context
```

---

### 5. Local storage leakage

Risk:

- browser storage can be read by any script running on the same origin. If XSS exists, local presets and telemetry become readable.

Controls:

- Do not store API keys, passwords, secrets, or private model credentials in `localStorage`.
- Keep provider tokens out of committed frontend code.
- Prefer backend proxy or user-session storage for cloud credentials later.
- Add clear buttons for telemetry, presets, and memory.
- Move large datasets to IndexedDB.
- Consider encryption only for user-exported backup files, not as a substitute for XSS prevention.

Current local keys:

```js
gef_local_presets
gef_telemetry_dataset
gef_autopilot_logs
```

Reference:

- MDN IndexedDB: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API

---

### 6. Third-party script and supply-chain risk

Risk:

- future CDN scripts, model runtimes, Pyodide, WebLLM, or Transformers.js bundles may change unexpectedly or load from uncontrolled origins.

Controls:

- Prefer pinned package versions.
- Prefer bundling dependencies through a build step.
- If CDN loading is used, use Subresource Integrity where possible.
- Restrict script sources through CSP.
- Track dependency versions in `package.json` and lockfiles.
- Avoid loading runtime scripts dynamically from model output or imported data.

References:

- MDN Subresource Integrity: https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
- OWASP Client-Side Security Risks: https://owasp.org/www-project-top-10-client-side-security-risks/

---

### 7. Microphone and media privacy

Risk:

- microphone input is privacy-sensitive. Uploaded audio/video may also contain private content.

Controls:

- Request microphone permission only when the user clicks the microphone button.
- Do not auto-enable microphone at boot.
- Do not upload media files by default.
- Keep analysis local unless the user explicitly exports data.
- Display clear input status.
- Stop tracks when no longer needed.
- Avoid logging raw filenames if privacy mode is enabled later.

Current media stance:

```text
uploaded media -> local audio graph -> visual metrics
microphone -> local audio graph -> visual metrics
```

Reference:

- MDN getUserMedia privacy/security: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia

---

### 8. Canvas capture and origin cleanliness

Risk:

- canvas capture and snapshot export can fail or become restricted when cross-origin media/images taint the canvas.

Controls:

- Prefer local file uploads for capture workflows.
- Keep `crossorigin="anonymous"` on media elements where appropriate.
- Warn users if external media sources are added later.
- Do not mix untrusted remote image/video sources into capture without CORS handling.
- Handle capture errors cleanly.

References:

- MDN crossorigin attribute: https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/crossorigin
- MDN canvas capture: https://developer.mozilla.org/en-US/docs/Web/API/HTMLCanvasElement/captureStream
- MDN MediaRecorder: https://developer.mozilla.org/en-US/docs/Web/API/MediaRecorder

---

### 9. WebGPU and shader adapter risks

Risk:

- future WGSL/WebGPU and GLSL/WebGL adapters can trigger GPU errors, performance stalls, resource exhaustion, or broken visuals.

Controls:

- Feature-detect WebGPU through `navigator.gpu`.
- Require secure context for WebGPU lanes.
- Compile shaders in dedicated adapter modules.
- Add shader compile diagnostics.
- Add frame budget limits.
- Add kill switches for long-running or unstable adapters.
- Never allow model text to become shader source without manual review and sandbox-only validation.
- Use Canvas2D fallback when WebGPU/WebGL is unavailable.

Reference:

- MDN WebGPU API: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API

---

### 10. Pyodide and Python adapter risks

Risk:

- Python snippets can be expensive, block execution, or attempt operations that should not be part of visual rendering.

Controls:

- Lazy-load Pyodide only when selected.
- Keep Python adapter isolated.
- Require a narrow `render_frame()` contract.
- Limit available globals.
- Timeout long operations where possible.
- Do not allow Python adapter to access provider credentials.
- Do not auto-promote Python outputs to main.

Reference:

- Pyodide JS API: https://pyodide.org/en/stable/usage/api/js-api.html

---

### 11. Localhost SLM endpoint risk

Risk:

- Ollama or llama.cpp endpoints may expose powerful local model services. A web page should not silently call arbitrary local services.

Controls:

- Default local endpoints must be visible in UI.
- Require an explicit connection test.
- Require user approval before enabling localhost providers.
- Restrict provider calls to configured endpoints only.
- Do not scan localhost ports.
- Do not send telemetry, filenames, or memory rows unless the user enables that task.
- Add request timeouts and abort controls.
- Warn users not to expose local model servers publicly.

Ollama default API reference:

```text
http://localhost:11434/api
```

Reference:

- Ollama API docs: https://docs.ollama.com/api

---

## Browser security controls

### Content Security Policy target

GEF should move toward this style of policy after inline styles/scripts are cleaned up:

```http
Content-Security-Policy:
  default-src 'self';
  script-src 'self';
  style-src 'self';
  img-src 'self' blob: data:;
  media-src 'self' blob:;
  connect-src 'self' http://localhost:11434 http://localhost:8080;
  worker-src 'self' blob:;
  object-src 'none';
  base-uri 'none';
  frame-ancestors 'none';
  form-action 'none';
```

Notes:

- Static GitHub Pages style hosting may require CSP through a hosting layer or meta tag.
- CSP headers are stronger than meta tags, and meta tags do not support every CSP feature.
- If WebLLM or Transformers.js loads model files from remote origins, `connect-src` must be widened deliberately.
- Avoid `'unsafe-inline'` and `'unsafe-eval'` as long-term defaults.

### Permissions Policy target

```http
Permissions-Policy:
  microphone=(self),
  camera=(),
  geolocation=(),
  payment=(),
  usb=(),
  serial=(),
  bluetooth=()
```

Rationale:

- GEF needs microphone only when the user clicks mic.
- GEF does not currently need camera, geolocation, payment, USB, serial, or Bluetooth.

---

## Provider security contract

All provider adapters must follow this contract:

```js
export class ProviderContract {
  async run(task, input, options) {
    // returns raw provider response
  }
}
```

Provider output must then pass through:

```text
raw response
  -> size limit
  -> JSON extraction
  -> schema validation
  -> task validator
  -> sandbox-only application
  -> telemetry log
```

Providers must not:

- receive API keys from committed source code
- access DOM directly
- modify runtime state directly
- choose unregistered module IDs
- invoke tools or adapters directly
- write to local memory directly
- promote sandbox to main

Providers may:

- classify intent
- choose from registered modules
- suggest parameter hints
- summarize feedback rows
- rewrite prompts as data
- propose mutation plans that require approval

---

## Dataset and memory security

Memory is useful, but memory is also attack surface.

Rules:

- All imported memory is untrusted.
- Do not feed raw memory rows directly to models.
- Distill memory before retrieval.
- Separate local generated rows from imported rows.
- Keep source metadata on every row.
- Add row limits to retrieval packs.
- Add export review tools before fine-tuning.
- Never store provider secrets in memory rows.

Recommended row metadata:

```js
{
  id: crypto.randomUUID(),
  schemaVersion: 1,
  source: 'local' | 'imported' | 'provider',
  trust: 'trusted_local' | 'untrusted_import' | 'reviewed',
  timestamp: new Date().toISOString()
}
```

Memory retrieval limit:

```js
const contextPack = memorySearch.findRelevant(prompt, {
  limit: 5,
  minScore: 0.45,
  includeImported: false
});
```

---

## Safe module registry policy

The renderer should use a registry, not freeform code.

Allowed:

```text
SLM chooses moduleId = spectralGrid
SLM suggests density = 1.2
validator confirms module exists
sandbox previews it
user approves it
```

Not allowed:

```text
SLM returns a new render function
runtime executes it immediately
```

Module registry requirements:

- unique ID
- stage
- category
- parameter schema
- default params
- safe render function
- performance estimate
- allowed resource access
- whether it can read feedback canvas
- whether it can write full-screen pixels

---

## Sandbox promotion policy

Sandbox exists to absorb bad ideas without breaking the stable engine.

Promotion checklist:

- [ ] Module ID is registered.
- [ ] Stage is valid.
- [ ] Parameter hints are schema-valid.
- [ ] Preview rendered without adapter errors.
- [ ] User explicitly clicked promote/commit.
- [ ] Telemetry row records prompt, module ID, provider, validation result, and decision.

Panic behavior:

- clear sandbox module
- disable sandbox active state
- preserve main runtime
- log diagnostic
- never clear local memory unless user asks

---

## Logging and monitoring

GEF should log security-relevant events locally.

Events:

```text
PROVIDER_REQUEST
PROVIDER_RESPONSE_REJECTED
PROVIDER_SCHEMA_FAIL
UNKNOWN_MODULE_ID
SANDBOX_PREVIEW_STARTED
SANDBOX_PROMOTED
SANDBOX_PANIC_RESET
JSONL_IMPORT_STARTED
JSONL_IMPORT_REJECTED_ROW
JSONL_IMPORT_COMPLETED
MEMORY_DISTILL_REJECTED
LOCALHOST_PROVIDER_ENABLED
LOCALHOST_PROVIDER_FAILED
```

Do not log:

- API keys
- full provider secrets
- raw private file contents
- raw microphone audio
- raw uploaded media data

---

## Implementation checklist

Immediate fixes:

- [ ] Replace dynamic `innerHTML` paths that could ever touch user/model/imported data.
- [ ] Add schema validation for JSONL import.
- [ ] Add security event types.
- [ ] Add `source` and `trust` fields to telemetry rows.
- [ ] Add a provider output validator file.
- [ ] Add module registry with strict ID lookup.
- [ ] Add CSP notes to README or deployment docs.
- [ ] Add clear telemetry/memory buttons.

Before enabling browser SLM:

- [ ] Add worker isolation for model loading.
- [ ] Add model download/source allowlist.
- [ ] Add request size limits.
- [ ] Add output size limits.
- [ ] Add schema-first provider tasks.
- [ ] Add timeout/cancel support.

Before enabling Ollama or llama.cpp:

- [ ] Add visible endpoint setting.
- [ ] Add user-triggered connection test.
- [ ] Add localhost-only default warning.
- [ ] Add request timeout.
- [ ] Add provider disable switch.
- [ ] Add no-port-scanning rule.

Before enabling shader/Python adapters:

- [ ] Add adapter-specific diagnostics.
- [ ] Add compile/run smoke tests.
- [ ] Add sandbox-only preview.
- [ ] Add performance limits.
- [ ] Add panic recovery tests.

---

## Security references reviewed

Browser and client-side security:

- MDN Content Security Policy: https://developer.mozilla.org/en-US/docs/Web/HTTP/CSP
- MDN Trusted Types API: https://developer.mozilla.org/en-US/docs/Web/API/Trusted_Types_API
- MDN Subresource Integrity: https://developer.mozilla.org/en-US/docs/Web/Security/Subresource_Integrity
- MDN getUserMedia privacy and security: https://developer.mozilla.org/en-US/docs/Web/API/MediaDevices/getUserMedia
- MDN WebGPU API: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API
- MDN IndexedDB API: https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
- OWASP Top 10 Client-Side Security Risks: https://owasp.org/www-project-top-10-client-side-security-risks/
- OWASP DOM XSS Prevention: https://cheatsheetseries.owasp.org/cheatsheets/DOM_based_XSS_Prevention_Cheat_Sheet.html
- OWASP HTML5 Security: https://cheatsheetseries.owasp.org/cheatsheets/HTML5_Security_Cheat_Sheet.html

AI and provider security:

- OWASP Top 10 for LLM and Gen AI Apps 2025: https://genai.owasp.org/llm-top-10/
- OWASP LLM Prompt Injection Prevention: https://cheatsheetseries.owasp.org/cheatsheets/LLM_Prompt_Injection_Prevention_Cheat_Sheet.html
- Ollama API docs: https://docs.ollama.com/api

---

## Security maxims

- Text is data until validated.
- Model output is never trusted by default.
- Memory should teach, not command.
- Sandbox first, main later.
- Registered modules beat generated code.
- User approval is a security boundary.
- Local does not automatically mean safe.
- Logs should explain decisions without leaking secrets.
- The renderer must survive bad input.
