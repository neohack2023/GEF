import { logAutopilot } from '../autopilot/autopilotStub.js';
import { moduleCatalog } from '../render/visualModules.js';
import { listOllamaModels, requestOllamaModuleSuggestion } from '../slm/providers/ollamaProvider.js';
import { SLM_LANE_IDS, getDefaultSlmModel } from '../slm/slmLanes.js';
import { validateModuleSuggestion } from '../slm/validators/moduleSuggestionValidator.js';
import { readProviderSettings } from './providerSettings.js';

const $ = (id) => document.getElementById(id);

function setStatus(text, timeout = 3200) {
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

function createButton(id, text, className = 'btn-small') {
  const button = document.createElement('button');
  button.id = id;
  button.type = 'button';
  button.className = className;
  button.textContent = text;
  return button;
}

function renderDirectLog(type, message) {
  const log = $('autopilot-log');
  if (!log) return;

  const row = document.createElement('div');
  row.style.marginBottom = '6px';
  row.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
  row.style.paddingBottom = '4px';

  const meta = document.createElement('div');
  meta.style.fontSize = '0.65rem';
  meta.style.color = '#00b8ff';
  meta.textContent = `${new Date().toLocaleTimeString()} · ${type}`;

  const body = document.createElement('div');
  body.style.fontSize = '0.72rem';
  body.style.color = '#ddd';
  body.textContent = message;

  row.append(meta, body);
  log.prepend(row);
}

function setOutput(text, tone = 'info') {
  const output = $('local-slm-output');
  if (!output) return;
  output.dataset.tone = tone;
  output.textContent = text;
}

function getConfiguredLocalSlm() {
  const settings = readProviderSettings();
  if (settings.mode !== 'local-slm') {
    throw new Error('Switch Provider Access to Local SLM Endpoint first.');
  }

  return {
    endpoint: settings.endpoint || 'http://localhost:11434',
    model: settings.model || getDefaultSlmModel(SLM_LANE_IDS.LIGHT_HELPER)
  };
}

async function testLocalSlm() {
  try {
    const settings = getConfiguredLocalSlm();
    setOutput('Checking local Ollama models...', 'info');
    const models = await listOllamaModels(settings);
    const names = models.map((model) => model.name || model.model).filter(Boolean);
    const modelText = names.length ? names.slice(0, 6).join(', ') : 'no local models returned';
    setOutput(`Ollama reachable. Local models: ${modelText}`, 'good');
    setStatus('Local SLM reachable.', 2200);
  } catch (error) {
    const message = `Local SLM check failed: ${error.message || error}`;
    setOutput(message, 'warn');
    setStatus(message, 5000);
  }
}

async function suggestModule() {
  try {
    const settings = getConfiguredLocalSlm();
    const userPrompt = $('autopilot-seeds')?.value || $('director-prompt')?.value || '';
    const stage = $('evo-stage')?.value || 'OVERLAY';

    if (!userPrompt.trim()) {
      throw new Error('Add a Foundry seed or Mutation Forge prompt first.');
    }

    setOutput('Asking local SLM for one curated module suggestion...', 'info');
    const result = await requestOllamaModuleSuggestion({
      ...settings,
      userPrompt,
      stage,
      modules: moduleCatalog
    });

    const validation = validateModuleSuggestion(result.data, moduleCatalog);
    if (!validation.ok) {
      const message = `SLM suggestion rejected by validator: ${validation.errors.join(' ')}`;
      logAutopilot('SLM_REJECTED', message, { candidate: result.data });
      renderDirectLog('SLM_REJECTED', message);
      setOutput(message, 'warn');
      setStatus('Local SLM suggestion rejected.', 4200);
      return;
    }

    const suggestion = validation.suggestion;
    const message = `${suggestion.moduleName} (${suggestion.stage}) · confidence ${suggestion.confidence.toFixed(2)} · ${suggestion.reason}`;
    logAutopilot('SLM_SUGGESTION', message, { suggestion });
    renderDirectLog('SLM_SUGGESTION', message);
    setOutput(`Validated suggestion: ${message}\n\nNo runtime change was applied. Use existing sandbox controls to preview curated modules.`, 'good');
    setStatus('Validated local SLM suggestion received.', 2600);
  } catch (error) {
    const message = `Local SLM suggestion failed: ${error.message || error}`;
    logAutopilot('SLM_ERROR', message);
    renderDirectLog('SLM_ERROR', message);
    setOutput(message, 'warn');
    setStatus(message, 5200);
  }
}

function injectLocalSlmControls() {
  const statusEl = $('provider-settings-status');
  if (!statusEl || $('local-slm-output')) return;

  const controls = document.createElement('div');
  controls.className = 'flex-row';
  controls.style.marginTop = '8px';

  const testBtn = createButton('provider-test-ollama-btn', 'Test Ollama', 'btn-small');
  const suggestBtn = createButton('provider-suggest-module-btn', 'Ask Local SLM', 'btn-small btn-good');
  suggestBtn.style.color = '#000';
  suggestBtn.style.background = '#00ff88';

  controls.append(testBtn, suggestBtn);

  const output = document.createElement('div');
  output.id = 'local-slm-output';
  output.className = 'tiny-note';
  output.style.marginTop = '8px';
  output.style.padding = '8px';
  output.style.borderRadius = '8px';
  output.style.background = 'rgba(0,0,0,.36)';
  output.style.border = '1px solid rgba(255,255,255,.08)';
  output.textContent = 'Local SLM lane ready. Use Test Ollama, then Ask Local SLM for a validated curated-module suggestion.';

  statusEl.insertAdjacentElement('afterend', output);
  statusEl.insertAdjacentElement('afterend', controls);

  testBtn.addEventListener('click', testLocalSlm);
  suggestBtn.addEventListener('click', suggestModule);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectLocalSlmControls);
} else {
  injectLocalSlmControls();
}
