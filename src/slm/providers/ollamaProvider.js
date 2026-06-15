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

export async function requestOllamaModuleSuggestion({ endpoint, model, userPrompt, stage, modules }) {
  const prompt = buildModuleSuggestionPrompt({ userPrompt, stage, modules });
  return generateOllamaJson({ endpoint, model, prompt, schema: moduleSuggestionSchema });
}
