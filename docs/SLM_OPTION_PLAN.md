# GEF SLM Option Plan

Plan for adding a Small Language Model lane as an alternative to cloud LLM generation.

The goal is not to make the SLM replace every LLM feature. The goal is to give GEF a local, cheaper, privacy-friendly, low-latency option for the parts of Autopilot Foundry that do not need a giant remote model.

Think of it as three brain lanes:

1. **Cloud LLM lane** — strongest reasoning and richest code generation, optional later.
2. **Browser SLM lane** — runs inside the browser using WebGPU/WASM when possible.
3. **Localhost SLM lane** — talks to Ollama or llama.cpp running on the user's machine.

---

## Why add an SLM lane?

Use an SLM when the task is narrow, repetitive, private, or structured.

Good SLM jobs:

- Rewrite a user prompt into a cleaner visual direction.
- Choose a visual module from the curated registry.
- Fill structured JSON for module parameters.
- Score whether a visual prompt matches a stage.
- Classify feedback: too dark, too noisy, not audio-reactive enough, too slow, too plain.
- Suggest next mutation from local telemetry.
- Generate module recipes, not raw executable code.
- Convert natural language into safe module settings.

Bad SLM jobs:

- Creating complex, novel graphics code from scratch.
- Repairing arbitrary broken runtime code.
- Security-sensitive validation by itself.
- Anything that must be highly accurate without verification.

GEF principle:

> The SLM should steer the machine, not own the steering wheel.

---

## Recommended architecture

```text
src/
  slm/
    slmRouter.js
    providers/
      browserWebLLMProvider.js
      browserTransformersProvider.js
      ollamaProvider.js
      llamaCppProvider.js
      mockProvider.js
    schemas/
      visualIntent.schema.json
      moduleChoice.schema.json
      mutationPlan.schema.json
    prompts/
      visualIntentPrompt.js
      moduleChoicePrompt.js
      mutationPlanPrompt.js
    validators/
      validateSlmJson.js
      validateModuleChoice.js
```

The app should call one stable router:

```js
const result = await slmRouter.run('module_choice', {
  prompt: userPrompt,
  stage: selectedStage,
  availableModules: moduleCatalog,
  audioMetrics: currentMetrics
});
```

The router decides which provider is active:

```text
mock -> browser_webllm -> browser_transformers -> ollama -> llama_cpp -> cloud_llm
```

---

## Provider decision tree

### Option A — Mock provider first

Use this before model integration. It lets the UI, schemas, and logging mature without downloading models yet.

Tasks:

- [ ] Add `src/slm/providers/mockProvider.js`.
- [ ] Return deterministic JSON from sample prompts.
- [ ] Wire Foundry UI to call the SLM router.
- [ ] Log all requests and responses to telemetry.

Snippet:

```js
export class MockSlmProvider {
  async run(task, input) {
    if (task === 'module_choice') {
      return {
        moduleId: 'spectralGrid',
        confidence: 0.72,
        reason: 'Prompt asks for reactive structure and grid-like motion.'
      };
    }

    return {
      note: 'No mock response for task.',
      task,
      input
    };
  }
}
```

---

### Option B — Browser SLM with WebLLM

Best for a self-contained web app that can run a chat-style local model in the browser.

Use when:

- The user has WebGPU support.
- You want private in-browser inference.
- You want an OpenAI-style chat completion interface.
- You want model work in a Web Worker so the UI does not freeze.

Tasks:

- [ ] Add `src/slm/providers/browserWebLLMProvider.js`.
- [ ] Load WebLLM only when selected.
- [ ] Add model selector.
- [ ] Add worker mode.
- [ ] Cache model loading progress in UI.
- [ ] Add fallback to mock provider if WebGPU fails.

Snippet:

```js
import * as webllm from '@mlc-ai/web-llm';

export class BrowserWebLLMProvider {
  constructor(modelId = 'Llama-3.2-1B-Instruct-q4f16_1-MLC') {
    this.modelId = modelId;
    this.engine = null;
  }

  async init(progressCallback) {
    if (this.engine) return this.engine;

    this.engine = await webllm.CreateMLCEngine(this.modelId, {
      initProgressCallback: progressCallback
    });

    return this.engine;
  }

  async chat(messages, options = {}) {
    const engine = await this.init(options.onProgress);
    return engine.chat.completions.create({
      messages,
      temperature: options.temperature ?? 0.2,
      max_tokens: options.maxTokens ?? 512
    });
  }
}
```

Useful references:

- WebLLM docs: https://webllm.mlc.ai/docs/
- WebLLM GitHub: https://github.com/mlc-ai/web-llm
- WebGPU API: https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API

---

### Option C — Browser SLM with Transformers.js

Best for smaller structured tasks: classification, embeddings, summarization, and small text-generation experiments.

Use when:

- You need browser-local NLP utilities.
- You want ONNX Runtime Web under the hood.
- You want easier task pipelines.
- You want quantized models like q4/q8 where supported.

Tasks:

- [ ] Add `src/slm/providers/browserTransformersProvider.js`.
- [ ] Start with classification/embedding tasks before generation.
- [ ] Add model cache status.
- [ ] Use `device: 'webgpu'` when available.
- [ ] Use quantized dtypes where supported.

Snippet: classification / scoring lane.

```js
import { pipeline } from '@huggingface/transformers';

export class BrowserTransformersProvider {
  constructor() {
    this.classifier = null;
  }

  async init() {
    if (!this.classifier) {
      this.classifier = await pipeline(
        'zero-shot-classification',
        'Xenova/mobilebert-uncased-mnli',
        {
          dtype: 'q4'
        }
      );
    }
  }

  async classifyVisualIntent(text) {
    await this.init();
    return this.classifier(text, [
      'base replacement',
      'overlay effect',
      'post processing',
      'feedback loop',
      'hud overlay'
    ]);
  }
}
```

Useful references:

- Transformers.js docs: https://huggingface.co/docs/transformers.js/index
- Transformers.js WebGPU guide: https://huggingface.co/docs/transformers.js/guides/webgpu
- ONNX Runtime Web: https://onnxruntime.ai/docs/get-started/with-javascript/web.html

---

### Option D — Localhost SLM with Ollama

Best fallback for Windows/Linux/macOS users who can run a local model service.

Use when:

- Browser inference is too slow.
- The model is too large for browser memory.
- The user already runs Ollama.
- You want a simple local REST API.

Tasks:

- [ ] Add `src/slm/providers/ollamaProvider.js`.
- [ ] Add connection test button.
- [ ] Add local endpoint setting, default `http://localhost:11434`.
- [ ] Add model name setting.
- [ ] Use JSON mode or schema-shaped prompting for structured output.
- [ ] Warn users not to expose Ollama publicly.

Snippet:

```js
export class OllamaProvider {
  constructor({ baseUrl = 'http://localhost:11434', model = 'llama3.2:3b' } = {}) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async generate(prompt, options = {}) {
    const response = await fetch(`${this.baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        prompt,
        stream: false,
        format: options.format || 'json',
        options: {
          temperature: options.temperature ?? 0.2,
          num_predict: options.maxTokens ?? 512
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.status}`);
    }

    return response.json();
  }
}
```

Useful references:

- Ollama API docs: https://docs.ollama.com/api
- Ollama GitHub API docs: https://github.com/ollama/ollama/blob/main/docs/api.md
- Ollama model library: https://ollama.com/library

---

### Option E — Localhost SLM with llama.cpp server

Best for users who want direct GGUF model control and a lean native runtime.

Use when:

- You want low-level model/runtime control.
- You want GGUF quantized model files.
- You want CPU-first inference or GPU acceleration where supported.
- You want an OpenAI-compatible local server.

Tasks:

- [ ] Add `src/slm/providers/llamaCppProvider.js`.
- [ ] Add endpoint setting, default local server address.
- [ ] Add model profile docs for small GGUF models.
- [ ] Add timeout and cancellation.
- [ ] Add response JSON extraction and schema validation.

Snippet:

```js
export class LlamaCppProvider {
  constructor({ baseUrl = 'http://localhost:8080', model = 'local-gguf' } = {}) {
    this.baseUrl = baseUrl;
    this.model = model;
  }

  async chat(messages, options = {}) {
    const response = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: this.model,
        messages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.maxTokens ?? 512
      })
    });

    if (!response.ok) {
      throw new Error(`llama.cpp request failed: ${response.status}`);
    }

    return response.json();
  }
}
```

Useful references:

- llama.cpp GitHub: https://github.com/ggml-org/llama.cpp
- llama.cpp server examples: https://github.com/ggml-org/llama.cpp/tree/master/examples/server
- GGUF models on Hugging Face: https://huggingface.co/models?search=GGUF

---

## SLM task schemas

The SLM should return strict JSON. Do not let it return freeform prose for app decisions.

### `visualIntent.schema.json`

```json
{
  "type": "object",
  "required": ["intent", "stage", "confidence", "notes"],
  "properties": {
    "intent": {
      "type": "string",
      "enum": ["base", "overlay", "post_fx", "feedback", "hud", "unknown"]
    },
    "stage": {
      "type": "string",
      "enum": ["BASE", "OVERLAY", "POST_FX", "FEEDBACK_PASS", "UI_OVERLAY"]
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "notes": {
      "type": "string"
    }
  }
}
```

### `moduleChoice.schema.json`

```json
{
  "type": "object",
  "required": ["moduleId", "stage", "parameterHints", "confidence", "reason"],
  "properties": {
    "moduleId": { "type": "string" },
    "stage": { "type": "string" },
    "parameterHints": {
      "type": "object",
      "additionalProperties": true
    },
    "confidence": {
      "type": "number",
      "minimum": 0,
      "maximum": 1
    },
    "reason": { "type": "string" }
  }
}
```

### `mutationPlan.schema.json`

```json
{
  "type": "object",
  "required": ["summary", "steps", "risk", "requiresUserApproval"],
  "properties": {
    "summary": { "type": "string" },
    "steps": {
      "type": "array",
      "items": { "type": "string" }
    },
    "risk": {
      "type": "string",
      "enum": ["low", "medium", "high"]
    },
    "requiresUserApproval": { "type": "boolean" }
  }
}
```

---

## Prompt templates

### Visual intent prompt

```js
export function buildVisualIntentPrompt({ prompt, availableStages }) {
  return `
You classify visual instructions for GEF.
Return only JSON.

Available stages:
${availableStages.join(', ')}

User visual request:
${prompt}

Return:
{
  "intent": "base|overlay|post_fx|feedback|hud|unknown",
  "stage": "BASE|OVERLAY|POST_FX|FEEDBACK_PASS|UI_OVERLAY",
  "confidence": 0.0,
  "notes": "short reason"
}
  `.trim();
}
```

### Module choice prompt

```js
export function buildModuleChoicePrompt({ prompt, stage, availableModules }) {
  const moduleList = availableModules
    .map((mod) => `- ${mod.id}: ${mod.name}, stage=${mod.stage}, ${mod.description}`)
    .join('\n');

  return `
You choose the safest existing GEF visual module.
Return only JSON.
Do not invent module ids.

Requested stage: ${stage}
User request: ${prompt}

Available modules:
${moduleList}

Return:
{
  "moduleId": "one existing module id",
  "stage": "matching stage",
  "parameterHints": {},
  "confidence": 0.0,
  "reason": "short reason"
}
  `.trim();
}
```

---

## Validation layer

Every provider output should be parsed and validated before it touches the renderer.

Snippet:

```js
export function extractJsonObject(text) {
  const start = text.indexOf('{');
  const end = text.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found in model response.');
  }

  return JSON.parse(text.slice(start, end + 1));
}

export function validateModuleChoice(choice, moduleCatalog) {
  const ids = new Set(moduleCatalog.map((mod) => mod.id));

  if (!choice || typeof choice !== 'object') throw new Error('Choice must be an object.');
  if (!ids.has(choice.moduleId)) throw new Error(`Unknown module id: ${choice.moduleId}`);
  if (typeof choice.confidence !== 'number') choice.confidence = 0;

  return choice;
}
```

---

## UI additions

Add this panel under the Foundry tab:

```text
SLM MODE
[ Provider: Mock | Browser WebLLM | Transformers.js | Ollama | llama.cpp | Cloud ]
[ Model: __________________________ ]
[ Endpoint: _______________________ ]
[ Test Connection ] [ Warm Model ]
[ Use SLM for: Intent / Module Choice / Mutation Plan / Feedback Classifier ]
```

Tasks:

- [ ] Add provider dropdown.
- [ ] Add model field.
- [ ] Add endpoint field for localhost providers.
- [ ] Add connection status badge.
- [ ] Add model load progress indicator.
- [ ] Add task toggles.
- [ ] Add fallback provider dropdown.

---

## Model selection strategy

Start small and boring. The first goal is reliable structured output, not genius.

Suggested first test sizes:

- 0.5B to 1.5B for classification, routing, and prompt cleanup.
- 1B to 3B for module selection and mutation planning.
- 3B to 7B only if local hardware can handle it smoothly.

Evaluation checklist:

- [ ] Does it return valid JSON?
- [ ] Does it choose only real module IDs?
- [ ] Does it respect stage constraints?
- [ ] Does it avoid inventing features?
- [ ] Does it run fast enough to keep UI flow alive?
- [ ] Does it recover gracefully when model loading fails?

---

## First implementation milestone

Minimum useful SLM feature:

> User writes a visual direction. SLM chooses one safe existing module and parameter hints. GEF previews it in sandbox.

Implementation steps:

1. Add `src/slm/slmRouter.js`.
2. Add `MockSlmProvider`.
3. Add `module_choice` prompt builder.
4. Add JSON extraction and module ID validation.
5. Add Foundry UI provider dropdown.
6. Wire `Run One` to SLM module choice instead of hardcoded `beatBloom`.
7. Log result into telemetry.
8. Add Ollama provider as first real model backend.
9. Add Browser WebLLM after the routing contract is stable.

---

## Security and safety notes

- Do not commit API keys.
- Do not expose localhost model servers to the public internet.
- Do not execute generated code directly.
- Prefer structured JSON decisions over freeform code.
- Keep SLM output inside the sandbox until the user approves it.
- Validate every module ID against the local registry.
- Treat all model output as untrusted text.
- Log decisions for debugging and later evaluation.

---

## Best first build order

1. Mock provider
2. SLM router
3. JSON parser and validators
4. Module-choice task
5. Foundry UI provider selector
6. Ollama provider
7. llama.cpp provider
8. Browser WebLLM provider
9. Transformers.js classifier helper
10. Telemetry-based feedback classifier
11. Optional cloud LLM fallback

This order keeps the system from growing teeth before it grows bones.
