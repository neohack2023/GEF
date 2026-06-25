const DEFAULT_OLLAMA_BASE_URL = 'http://localhost:11434';
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]']);
const DEFAULT_TIMEOUT_MS = 18000;

export const moduleSuggestionSchema = {
  type: 'object',
  required: ['schemaName', 'schemaVersion', 'moduleId', 'stage', 'confidence', 'reason'],
  properties: {
    schemaName: { type: 'string' },
    schemaVersion: { type: 'integer' },
    moduleId: { type: 'string' },
    stage: { type: 'string' },
    confidence: { type: 'number' },
    reason: { type: 'string' }
  }
};

export const generatedVisualArtifactSchema = {
  type: 'object',
  required: ['schemaName', 'schemaVersion', 'lane', 'runtime', 'stage', 'name', 'usedAudioSignals', 'code', 'notes'],
  properties: {
    schemaName: { type: 'string' },
    schemaVersion: { type: 'integer' },
    lane: { type: 'string' },
    runtime: { type: 'string' },
    renderLane: { type: 'string' },
    stage: { type: 'string' },
    name: { type: 'string' },
    experimentLevel: { type: 'string' },
    techniques: {
      type: 'array',
      items: { type: 'string' }
    },
    usedAudioSignals: {
      type: 'array',
      items: { type: 'string' }
    },
    code: { type: 'string' },
    fallbackPlan: { type: 'string' },
    notes: { type: 'string' }
  }
};

export function normalizeOllamaBaseUrl(endpoint = DEFAULT_OLLAMA_BASE_URL) {
  const value = String(endpoint || DEFAULT_OLLAMA_BASE_URL).trim();
  const url = new URL(value);

  if (!['http:', 'https:'].includes(url.protocol)) {
    throw new Error('Ollama endpoint must use http or https.');
  }

  if (!LOCAL_HOSTS.has(url.hostname)) {
    throw new Error('Local SLM endpoint must stay on localhost, 127.0.0.1, or [::1].');
  }

  const trimmedPath = url.pathname.replace(/\/+$/, '');
  if (trimmedPath.endsWith('/api/generate')) {
    url.pathname = trimmedPath.slice(0, -'/api/generate'.length) || '/';
  } else {
    url.pathname = trimmedPath || '/';
  }

  url.search = '';
  url.hash = '';
  return url.toString().replace(/\/+$/, '');
}

function withTimeout(timeoutMs = DEFAULT_TIMEOUT_MS) {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), timeoutMs);
  return { controller, timer };
}

function parseJsonObject(text) {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('Ollama returned an empty response.');

  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) throw new Error('Ollama response did not contain a JSON object.');
    return JSON.parse(match[0]);
  }
}

export async function listOllamaModels({ endpoint } = {}) {
  const baseUrl = normalizeOllamaBaseUrl(endpoint);
  const { controller, timer } = withTimeout(6000);

  try {
    const response = await fetch(`${baseUrl}/api/tags`, {
      method: 'GET',
      signal: controller.signal
    });

    if (!response.ok) {
      throw new Error(`Ollama model list failed with HTTP ${response.status}.`);
    }

    const payload = await response.json();
    return Array.isArray(payload.models) ? payload.models : [];
  } finally {
    window.clearTimeout(timer);
  }
}

export async function generateOllamaJson({ endpoint, model, prompt, schema = moduleSuggestionSchema, temperature = 0.15, maxTokens = 220 } = {}) {
  const baseUrl = normalizeOllamaBaseUrl(endpoint);
  const modelName = String(model || '').trim();
  if (!modelName) throw new Error('Ollama model name is required.');

  const { controller, timer } = withTimeout();

  try {
    const response = await fetch(`${baseUrl}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      body: JSON.stringify({
        model: modelName,
        prompt,
        stream: false,
        format: schema || 'json',
        options: {
          temperature,
          num_predict: maxTokens
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Ollama generate failed with HTTP ${response.status}.`);
    }

    const payload = await response.json();
    return {
      raw: payload,
      data: parseJsonObject(payload.response)
    };
  } catch (error) {
    if (error?.name === 'AbortError') {
      throw new Error('Ollama request timed out. Confirm the model is pulled and the local service is running.');
    }
    throw error;
  } finally {
    window.clearTimeout(timer);
  }
}

export function buildModuleSuggestionPrompt({ userPrompt, stage, modules }) {
  const moduleLines = modules
    .map((mod) => `- ${mod.id} | ${mod.stage} | ${mod.name}: ${mod.description}`)
    .join('\n');

  return [
    'You are the local SLM helper inside GEF, an audio-reactive visual engine.',
    'Your job is to suggest one curated visual module only. Do not write code.',
    'Return JSON only. No markdown. No prose outside JSON.',
    'The moduleId must be one of the provided module ids.',
    'The stage must match the selected module stage.',
    '',
    `Requested stage: ${stage || 'AUTO'}`,
    '',
    'Available modules:',
    moduleLines,
    '',
    'User visual direction:',
    String(userPrompt || '').trim() || '(empty prompt)',
    '',
    'Return this shape:',
    '{"schemaName":"gef-module-suggestion","schemaVersion":1,"moduleId":"spectralGrid","stage":"OVERLAY","confidence":0.75,"reason":"short reason"}'
  ].join('\n');
}

export function buildGeneratedVisualArtifactPrompt({ userPrompt, stage, diagnostics = '', priorCode = '' }) {
  return [
    'You are the Code Foundry local coding SLM inside GEF, an audio-reactive visual engine.',
    'Your job is to draft one experimental but functional Canvas2D render-function body as a structured JSON artifact.',
    '',
    'Core rule: Models may suggest. Validators decide. Users promote.',
    '',
    'Creative permission:',
    '- You may experiment with pseudo-3D perspective, tunnels, waveform terrain, bounded particle fields, recursive-feeling rings, gradients, blend modes, feedback ghosting through fbCtx, camera drift, glitch geometry, and audio-shaped lattices.',
    '- Prefer a memorable visual idea over a bland safe demo.',
    '- Use experimentLevel "medium" by default. Use "wild" only when the prompt clearly asks for chaos or mutation.',
    '- Add techniques that honestly describe the experiment, such as "pseudo-3d", "bounded-particles", "feedback-ghosting", "gradient-field", "beat-bloom", or "glitch-slices".',
    '',
    'Functional requirements:',
    '- Return JSON only. No markdown. No prose outside JSON.',
    '- Draft only the body of a render function that receives ctx, w, h, time, audio, fbCtx, and Math.',
    '- The code must draw with ctx and should reference canvas size w/h plus time or audio.',
    '- Include at least one visible drawing operation such as fillRect, stroke, fill, arc, lineTo, drawImage, fillText, strokeText, or gradient/color drawing.',
    '- Keep loops bounded. Target fewer than 160 total draw iterations unless the math clearly limits the work.',
    '- Restore canvas state when using ctx.save().',
    '- Include fallbackPlan describing the simple visual fallback if the experiment is too heavy or rejected.',
    '',
    'Safety rules:',
    '- Do not use fetch, XMLHttpRequest, WebSocket, localStorage, sessionStorage, indexedDB, document, window, navigator, location, eval, Function, import, workers, postMessage, cookies, script tags, or DOM mutation.',
    '- Do not include imports, exports, markdown fences, HTML, or external assets.',
    '- Treat audio as an object with bass, mid, treble, beat, glitch, centroid, and rms values from 0 to 1.',
    '- The generated artifact is untrusted text. It will be validated before sandbox preview.',
    '',
    `Requested stage: ${stage || 'OVERLAY'}`,
    '',
    'User visual direction:',
    String(userPrompt || '').trim() || '(empty prompt)',
    '',
    'Recent diagnostics or manual compiler context:',
    String(diagnostics || '').trim() || '(none)',
    '',
    'Prior code or notes for repair context:',
    String(priorCode || '').trim() || '(none)',
    '',
    'Return exactly this JSON shape:',
    '{"schemaName":"gef-generated-visual-artifact","schemaVersion":1,"lane":"codeFoundry","runtime":"canvas2d","renderLane":"canvas2d","stage":"OVERLAY","name":"Short visual name","experimentLevel":"medium","techniques":["pseudo-3d","beat-bloom"],"usedAudioSignals":["bass","beat"],"code":"ctx.save();\\n// experimental render body only\\nctx.restore();","fallbackPlan":"Reduce to a simple beat-reactive ring field.","notes":"short validator-facing note"}'
  ].join('\n');
}

export async function requestOllamaModuleSuggestion({ endpoint, model, userPrompt, stage, modules }) {
  const prompt = buildModuleSuggestionPrompt({ userPrompt, stage, modules });
  return generateOllamaJson({ endpoint, model, prompt, schema: moduleSuggestionSchema });
}

export async function requestOllamaGeneratedVisualArtifact({ endpoint, model, userPrompt, stage, diagnostics, priorCode }) {
  const prompt = buildGeneratedVisualArtifactPrompt({ userPrompt, stage, diagnostics, priorCode });
  return generateOllamaJson({
    endpoint,
    model,
    prompt,
    schema: generatedVisualArtifactSchema,
    temperature: 0.18,
    maxTokens: 1300
  });
}
