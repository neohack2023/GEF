import { logAutopilot } from '../autopilot/autopilotStub.js';
import { RENDER_LANES, getModuleById, getModuleCatalog } from '../render/moduleRegistry.js';
import {
  listOllamaModels,
  requestOllamaGeneratedVisualArtifact,
  requestOllamaModuleSuggestion
} from '../slm/providers/ollamaProvider.js';
import { DEFAULT_LOCAL_SLM_ENDPOINT, SLM_LANE_IDS, getDefaultSlmModel } from '../slm/slmLanes.js';
import { validateGeneratedVisualArtifact } from '../slm/validators/generatedVisualArtifactValidator.js';
import { validateModuleSuggestion } from '../slm/validators/moduleSuggestionValidator.js';
import { readProviderSettings, readSettingsFromForm } from './providerSettings.js';

const $ = (id) => document.getElementById(id);

let latestValidatedSuggestion = null;
let latestGeneratedArtifact = null;
let previewSuggestionBtn = null;
let codeFoundryBtn = null;

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

function setManualCompilerOutput(text, tone = 'info') {
  const output = $('manual-compiler-output');
  if (!output) return;
  output.dataset.tone = tone;
  output.textContent = text;
}

function setButtonBusy(button, isBusy, busyText) {
  if (!button) return;
  if (isBusy) {
    button.dataset.originalText = button.textContent;
    button.textContent = busyText;
    button.disabled = true;
    return;
  }

  button.textContent = button.dataset.originalText || button.textContent;
  button.disabled = false;
}

function setPreviewSuggestion(suggestion) {
  latestValidatedSuggestion = suggestion;
  if (!previewSuggestionBtn) return;
  previewSuggestionBtn.disabled = !suggestion;
  previewSuggestionBtn.title = suggestion
    ? `Preview ${suggestion.moduleName} in sandbox`
    : 'Ask Local SLM for a validated suggestion first.';
}

function clearPreviewSuggestion() {
  setPreviewSuggestion(null);
}

function readLiveProviderSettings() {
  return $('provider-mode') ? readSettingsFromForm() : readProviderSettings();
}

function getConfiguredLocalSlm(defaultLane = SLM_LANE_IDS.LIGHT_HELPER) {
  const settings = readLiveProviderSettings();
  const mode = settings.mode || $('provider-mode')?.value;
  if (mode !== 'local-slm') {
    throw new Error('Choose Local SLM Endpoint in Provider Access first.');
  }

  return {
    endpoint: settings.endpoint || DEFAULT_LOCAL_SLM_ENDPOINT,
    model: settings.model || getDefaultSlmModel(defaultLane)
  };
}

function activateSandboxUi() {
  const sandboxToggle = $('sandbox-toggle');
  if (!sandboxToggle) return;
  sandboxToggle.checked = true;
  sandboxToggle.dispatchEvent(new window.Event('change', { bubbles: true }));
}

function collectDiagnostics() {
  const log = $('diagnostics-log');
  if (!log) return '';

  return [...log.querySelectorAll('div')]
    .slice(-8)
    .map((row) => row.textContent.trim())
    .filter(Boolean)
    .join('\n');
}

function getUserVisualPrompt() {
  return $('autopilot-seeds')?.value || $('director-prompt')?.value || '';
}

function openCodeLayer() {
  $('code-layer')?.classList.remove('hidden');
}

function writeArtifactToCodeViewer(artifact, validation) {
  const codeViewer = $('code-viewer');
  if (codeViewer) {
    codeViewer.value = artifact.code;
  }

  const codeFormat = $('code-format');
  if (codeFormat) {
    codeFormat.value = 'js';
  }

  const title = $('code-title');
  if (title) {
    title.textContent = `Code Foundry Candidate · ${artifact.name}`;
  }

  openCodeLayer();

  const warnings = validation.warnings.length
    ? `\n\nWarnings:\n${validation.warnings.map((warning) => `- ${warning}`).join('\n')}`
    : '';

  setManualCompilerOutput([
    `Code Foundry artifact staged as untrusted text: ${artifact.name}`,
    `Stage: ${artifact.stage}`,
    `Signals: ${artifact.usedAudioSignals.join(', ') || 'not declared'}`,
    `Policy: ${validation.policy.message}`,
    '',
    'Next gate: run Check. Sandbox preview remains manual and user-controlled.',
    warnings
  ].join('\n'), validation.warnings.length ? 'warn' : 'ok');
}

function previewValidatedSuggestion() {
  try {
    if (!latestValidatedSuggestion) {
      throw new Error('Ask Local SLM for a validated suggestion first.');
    }

    const moduleDef = getModuleById(latestValidatedSuggestion.moduleId);
    if (!moduleDef || moduleDef.lane !== RENDER_LANES.CANVAS_2D) {
      throw new Error('Validated suggestion is not available in the Canvas2D sandbox lane.');
    }

    const previewBridge = window.GEF_SANDBOX_PREVIEW;
    if (!previewBridge || typeof previewBridge.previewValidatedModule !== 'function') {
      throw new Error('Sandbox preview bridge is not ready. Reload the app and try again.');
    }

    const result = previewBridge.previewValidatedModule(latestValidatedSuggestion);
    if (!result.ok) {
      throw new Error(result.error || 'Sandbox preview rejected the validated suggestion.');
    }

    activateSandboxUi();

    const moduleName = result.module?.name || latestValidatedSuggestion.moduleName || latestValidatedSuggestion.moduleId;
    const message = `Previewing validated SLM suggestion in sandbox: ${moduleName}.`;
    logAutopilot('SLM_SUGGESTION_PREVIEWED', message, { suggestion: latestValidatedSuggestion, module: result.module });
    renderDirectLog('SLM_PREVIEW', message);
    setOutput(`${message}\n\nPromotion still requires the normal Promote Sandbox action. No generated code was executed.`, 'good');
  } catch (error) {
    const message = `SLM preview failed: ${error.message || error}`;
    logAutopilot('SLM_PREVIEW_ERROR', message);
    renderDirectLog('SLM_PREVIEW_ERROR', message);
    setOutput(message, 'warn');
    setStatus(message, 4200);
  }
}

async function testLocalSlm() {
  try {
    clearPreviewSuggestion();
    const settings = getConfiguredLocalSlm(SLM_LANE_IDS.LIGHT_HELPER);
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
    clearPreviewSuggestion();
    const settings = getConfiguredLocalSlm(SLM_LANE_IDS.LIGHT_HELPER);
    const userPrompt = getUserVisualPrompt();
    const stage = $('evo-stage')?.value || 'OVERLAY';
    const modules = getModuleCatalog();

    if (!userPrompt.trim()) {
      throw new Error('Add a Foundry seed or Mutation Forge prompt first.');
    }

    setButtonBusy(previewSuggestionBtn, true, 'Preview Suggestion');
    setOutput('Asking local SLM for one curated module suggestion...', 'info');
    const result = await requestOllamaModuleSuggestion({
      ...settings,
      userPrompt,
      stage,
      modules
    });

    const validation = validateModuleSuggestion(result.data, modules);
    if (!validation.ok) {
      const message = `SLM suggestion rejected by validator: ${validation.errors.join(' ')}`;
      logAutopilot('SLM_REJECTED', message, { candidate: result.data });
      renderDirectLog('SLM_REJECTED', message);
      setOutput(message, 'warn');
      setStatus('Local SLM suggestion rejected.', 4200);
      return;
    }

    const suggestion = validation.suggestion;
    const moduleDef = getModuleById(suggestion.moduleId);
    const canPreview = moduleDef?.lane === RENDER_LANES.CANVAS_2D;
    const message = `${suggestion.moduleName} (${suggestion.stage}) · confidence ${suggestion.confidence.toFixed(2)} · ${suggestion.reason}`;
    logAutopilot('SLM_SUGGESTION', message, { suggestion });
    renderDirectLog('SLM_SUGGESTION', message);

    if (canPreview) {
      setPreviewSuggestion(suggestion);
      setOutput(`Validated suggestion: ${message}\n\nUse Preview Suggestion to stage this curated module in the sandbox.`, 'good');
    } else {
      clearPreviewSuggestion();
      setOutput(`Validated suggestion: ${message}\n\nThis module is not available in the current Canvas2D sandbox lane.`, 'warn');
    }

    setStatus('Validated local SLM suggestion received.', 2600);
  } catch (error) {
    const message = `Local SLM suggestion failed: ${error.message || error}`;
    logAutopilot('SLM_ERROR', message);
    renderDirectLog('SLM_ERROR', message);
    setOutput(message, 'warn');
    setStatus(message, 5200);
  }
}

async function generateCodeArtifact() {
  try {
    latestGeneratedArtifact = null;
    const settings = getConfiguredLocalSlm(SLM_LANE_IDS.CODE_FOUNDRY);
    const userPrompt = getUserVisualPrompt();
    const stage = $('evo-stage')?.value || 'OVERLAY';
    const priorCode = $('code-viewer')?.value || '';

    if (!userPrompt.trim()) {
      throw new Error('Add a Foundry seed or Mutation Forge prompt first.');
    }

    setButtonBusy(codeFoundryBtn, true, 'Coding...');
    setOutput(`Asking Code Foundry model ${settings.model} for a Canvas2D candidate artifact...`, 'info');

    const result = await requestOllamaGeneratedVisualArtifact({
      ...settings,
      userPrompt,
      stage,
      diagnostics: collectDiagnostics(),
      priorCode
    });

    const validation = validateGeneratedVisualArtifact(result.data);
    if (!validation.ok) {
      const message = [
        'Code Foundry artifact rejected by validator:',
        ...validation.errors.map((error) => `- ${error}`),
        validation.warnings.length ? '\nWarnings:' : '',
        ...validation.warnings.map((warning) => `- ${warning}`)
      ].filter(Boolean).join('\n');
      logAutopilot('CODE_FOUNDRY_REJECTED', message, { candidate: result.data, validation });
      renderDirectLog('CODE_FOUNDRY_REJECTED', message);
      setOutput(message, 'warn');
      setManualCompilerOutput(message, 'warn');
      setStatus('Code Foundry candidate rejected.', 4200);
      return;
    }

    latestGeneratedArtifact = validation.artifact;
    writeArtifactToCodeViewer(latestGeneratedArtifact, validation);

    const message = `Code Foundry staged candidate artifact: ${latestGeneratedArtifact.name} (${latestGeneratedArtifact.stage}).`;
    logAutopilot('CODE_FOUNDRY_ARTIFACT', message, { artifact: latestGeneratedArtifact, warnings: validation.warnings });
    renderDirectLog('CODE_FOUNDRY_ARTIFACT', message);
    setOutput(`${message}\n\nThe generated code is untrusted text in the manual compiler. Run Check before any sandbox path.`, validation.warnings.length ? 'warn' : 'good');
    setStatus('Code Foundry candidate staged for manual validation.', 3200);
  } catch (error) {
    const message = `Code Foundry generation failed: ${error.message || error}`;
    logAutopilot('CODE_FOUNDRY_ERROR', message);
    renderDirectLog('CODE_FOUNDRY_ERROR', message);
    setOutput(message, 'warn');
    setStatus(message, 5200);
  } finally {
    setButtonBusy(codeFoundryBtn, false, 'Ask Code SLM');
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
  previewSuggestionBtn = createButton('provider-preview-suggestion-btn', 'Preview Suggestion', 'btn-small');
  previewSuggestionBtn.disabled = true;
  previewSuggestionBtn.title = 'Ask Local SLM for a validated suggestion first.';
  codeFoundryBtn = createButton('provider-code-foundry-btn', 'Ask Code SLM', 'btn-small btn-ai');
  codeFoundryBtn.title = 'Ask the local coding SLM for a validator-screened Canvas2D artifact.';

  controls.append(testBtn, suggestBtn, previewSuggestionBtn, codeFoundryBtn);

  const output = document.createElement('div');
  output.id = 'local-slm-output';
  output.className = 'tiny-note';
  output.style.marginTop = '8px';
  output.style.padding = '8px';
  output.style.borderRadius = '8px';
  output.style.background = 'rgba(0,0,0,.36)';
  output.style.border = '1px solid rgba(255,255,255,.08)';
  output.textContent = 'Local SLM lane ready. Choose Local SLM Endpoint to use local defaults. Use Ask Local SLM for curated-module suggestions or Ask Code SLM for untrusted Code Foundry artifacts.';

  statusEl.insertAdjacentElement('afterend', output);
  statusEl.insertAdjacentElement('afterend', controls);

  testBtn.addEventListener('click', testLocalSlm);
  suggestBtn.addEventListener('click', suggestModule);
  previewSuggestionBtn.addEventListener('click', previewValidatedSuggestion);
  codeFoundryBtn.addEventListener('click', generateCodeArtifact);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', injectLocalSlmControls);
} else {
  injectLocalSlmControls();
}
