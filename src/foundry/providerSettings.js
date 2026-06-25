import { DEFAULT_LOCAL_SLM_ENDPOINT, SLM_LANE_IDS, getDefaultSlmModel } from '../slm/slmLanes.js';

const PROVIDER_SETTINGS_KEY = 'gef_provider_settings';
const VALID_MODES = new Set(['none', 'local-slm', 'llm-proxy']);
const LOCAL_CREDENTIAL_REF = 'local-only';

const DEFAULT_PROVIDER_SETTINGS = {
  mode: 'none',
  endpoint: '',
  model: '',
  credentialRef: '',
  updatedAt: null
};

const $ = (id) => document.getElementById(id);

function clampText(value, maxLength = 300) {
  return String(value || '').trim().slice(0, maxLength);
}

function applyProviderDefaults(settings) {
  if (settings.mode !== 'local-slm') return settings;

  return {
    ...settings,
    endpoint: settings.endpoint || DEFAULT_LOCAL_SLM_ENDPOINT,
    model: settings.model || getDefaultSlmModel(SLM_LANE_IDS.LIGHT_HELPER),
    credentialRef: settings.credentialRef || LOCAL_CREDENTIAL_REF
  };
}

function normalizeProviderSettings(settings = {}) {
  const mode = VALID_MODES.has(settings.mode) ? settings.mode : DEFAULT_PROVIDER_SETTINGS.mode;

  return applyProviderDefaults({
    mode,
    endpoint: clampText(settings.endpoint),
    model: clampText(settings.model, 120),
    credentialRef: clampText(settings.credentialRef, 120),
    updatedAt: settings.updatedAt || null
  });
}

function readProviderSettings() {
  try {
    const stored = JSON.parse(localStorage.getItem(PROVIDER_SETTINGS_KEY) || 'null');
    return normalizeProviderSettings(stored || DEFAULT_PROVIDER_SETTINGS);
  } catch {
    return { ...DEFAULT_PROVIDER_SETTINGS };
  }
}

function writeProviderSettings(settings) {
  const normalized = normalizeProviderSettings({
    ...settings,
    updatedAt: new Date().toISOString()
  });
  localStorage.setItem(PROVIDER_SETTINGS_KEY, JSON.stringify(normalized));
  return normalized;
}

function setStatus(text, timeout = 0) {
  const status = $('status-bar');
  if (!status) return;

  status.textContent = text;
  status.className = '';

  if (timeout > 0) {
    window.setTimeout(() => {
      status.textContent = 'STABLE ENGINE ACTIVE';
      status.className = '';
    }, timeout);
  }
}

function providerLabel(mode) {
  if (mode === 'local-slm') return 'Local SLM endpoint';
  if (mode === 'llm-proxy') return 'LLM proxy endpoint';
  return 'Provider disabled';
}

function describeProvider(settings) {
  if (settings.mode === 'none') {
    return 'Provider disabled. Foundry still uses curated local sandbox notes.';
  }

  const endpointText = settings.endpoint || 'endpoint not set';
  const modelText = settings.model || 'model not set';
  const credentialText = settings.credentialRef || 'credential reference not set';

  return `${providerLabel(settings.mode)} configured: ${endpointText} · ${modelText} · ${credentialText}. Outputs remain untrusted until validated.`;
}

function readSettingsFromForm() {
  return normalizeProviderSettings({
    mode: $('provider-mode')?.value,
    endpoint: $('provider-endpoint')?.value,
    model: $('provider-model')?.value,
    credentialRef: $('provider-credential-ref')?.value
  });
}

function renderProviderSettings(settings = readProviderSettings()) {
  const modeEl = $('provider-mode');
  const endpointEl = $('provider-endpoint');
  const modelEl = $('provider-model');
  const credentialEl = $('provider-credential-ref');
  const statusEl = $('provider-settings-status');

  if (!modeEl || !endpointEl || !modelEl || !credentialEl || !statusEl) return;

  modeEl.value = settings.mode;
  endpointEl.value = settings.endpoint;
  modelEl.value = settings.model;
  credentialEl.value = settings.credentialRef;
  statusEl.textContent = describeProvider(settings);
}

function validateProviderSettings(settings) {
  if (settings.mode === 'none') return null;
  if (!settings.endpoint) return 'Provider endpoint is required for SLM/proxy modes.';
  if (!settings.model) return 'Provider model name is required for SLM/proxy modes.';

  try {
    const url = new URL(settings.endpoint);
    const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
    if (settings.mode === 'local-slm' && !isLocal) {
      return 'Local SLM mode should point to localhost or 127.0.0.1.';
    }
  } catch {
    return 'Provider endpoint must be a valid URL.';
  }

  return null;
}

function saveProviderSettings() {
  const settings = readSettingsFromForm();
  const validationError = validateProviderSettings(settings);

  if (validationError) {
    $('provider-settings-status').textContent = validationError;
    setStatus(validationError, 4000);
    return;
  }

  const saved = writeProviderSettings(settings);
  renderProviderSettings(saved);
  setStatus('Provider settings saved. Credentials stay outside the frontend.', 2800);
}

async function copyProviderContract() {
  const contract = `GEF_PROVIDER_PROXY_CONTRACT_V1

Browser role:
- Stores provider mode, endpoint, model, and credential reference only.
- Sends structured requests to a local SLM endpoint or a user-controlled LLM proxy.
- Treats every provider response as untrusted text.

Proxy/server role:
- Owns provider credentials outside frontend code.
- Applies rate limits, validation, timeouts, and logging.
- Returns structured suggestions only.

Suggested response shape:
{
  "schemaName": "gef-provider-suggestion",
  "schemaVersion": 1,
  "provider": "local-slm-or-llm-proxy",
  "model": "model-name",
  "summary": "Plain-language suggestion summary.",
  "suggestions": [
    {
      "type": "curated-module",
      "moduleId": "spectralGrid",
      "reason": "Why this should be previewed."
    }
  ],
  "diagnostics": []
}

Promotion rule:
Models may suggest. Validators decide. Users promote.`;

  try {
    await navigator.clipboard.writeText(contract);
    setStatus('Provider proxy contract copied.', 1800);
  } catch {
    setStatus('Clipboard unavailable. Copy provider contract from docs when added.', 3000);
  }
}

function bindProviderSettings() {
  if (!$('provider-mode')) return;

  renderProviderSettings();
  $('provider-save-btn')?.addEventListener('click', saveProviderSettings);
  $('provider-copy-contract-btn')?.addEventListener('click', copyProviderContract);
  $('provider-mode')?.addEventListener('change', () => {
    const settings = readSettingsFromForm();
    renderProviderSettings(settings);
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', bindProviderSettings);
} else {
  bindProviderSettings();
}

export { readProviderSettings, readSettingsFromForm, writeProviderSettings, normalizeProviderSettings };