import { AudioAnalyzer } from './audio/analyzer.js';
import { CanvasRuntime } from './render/canvasRuntime.js';
import { Adaptive3dRuntime, THREE_BACKENDS } from './render/adaptive3dRuntime.js';
import { moduleCatalog } from './render/visualModules.js';
import {
  getPresets,
  savePreset,
  deletePreset,
  getTelemetry,
  appendTelemetry,
  importTelemetryRows,
  exportTelemetryJsonl,
  getAutopilotLogs
} from './storage/localLibrary.js';
import {
  generateSeedIdeas,
  queueVariations,
  logAutopilot,
  safeAutopilotNotice
} from './autopilot/autopilotStub.js';

const $ = (id) => document.getElementById(id);

const JSONL_IMPORT_LIMITS = {
  maxFileBytes: 2 * 1024 * 1024,
  maxRows: 5000,
  maxLineChars: 10000,
  maxReportedErrors: 5
};

const sessionId = crypto.randomUUID ? crypto.randomUUID() : `gef-${Date.now()}`;
const audio = new AudioAnalyzer();
const threeRuntime = new Adaptive3dRuntime($('three-d-canvas'), {
  onDiagnostic: (message, severity) => writeDiagnostic(
    message,
    severity === 'error' ? 'diag-err' : severity === 'warning' ? 'diag-warn' : 'diag-info'
  ),
  onDeactivated: (details) => handleThreeRuntimeDeactivated(details)
});
const runtime = new CanvasRuntime({
  mainCanvas: $('main-canvas-2d'),
  sandboxCanvas: $('sandbox-canvas'),
  feedbackCanvas: $('feedback-buffer'),
  compositeCanvas: $('composite-canvas'),
  externalSandboxCanvasProvider: () => threeRuntime.canvas,
  onSandboxModulePreview: () => {
    const wasInitializing = threeRuntime.initializing;
    threeRuntime.deactivate();
    if (wasInitializing) {
      $('three-status').dataset.state = 'idle';
      $('three-status').textContent = '3D initialization cancelled. Canvas2D preview selected.';
    }
  }
});

window.GEF_3D_RUNTIME = Object.freeze({ getStatus: () => threeRuntime.getStatus() });

let globalTime = 0;
let lastFrameTime = performance.now();
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let autopilotQueue = [];
let activeMediaObjectUrl = null;
let mediaElementSource = null;

function setStatus(text, sandbox = false, timeout = 0) {
  const statusBar = $('status-bar');
  statusBar.textContent = text;
  statusBar.className = sandbox ? 'sandbox-active' : '';

  if (timeout > 0) {
    window.setTimeout(() => {
      statusBar.textContent = runtime.sandboxActive ? 'SANDBOX RUNTIME ACTIVE' : 'STABLE ENGINE ACTIVE';
      statusBar.className = runtime.sandboxActive ? 'sandbox-active' : '';
    }, timeout);
  }
}

function logTelemetry(eventType, payload = {}) {
  const rows = appendTelemetry({
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    event_type: eventType,
    ...payload
  });
  $('dataset-count').innerText = rows.length;
}

function handleThreeRuntimeDeactivated({ reason, lastError }) {
  runtime.setSandboxActive(false);
  $('sandbox-toggle').checked = false;
  $('three-status').dataset.state = 'error';
  $('three-status').textContent = `3D renderer stopped (${reason}). Canvas2D restored.`;
  updateSandboxUi();
  setStatus('3D renderer stopped. Canvas2D restored.', false, 3000);
  logTelemetry('THREE_RUNTIME_DEACTIVATED', {
    lane: '3d',
    reason,
    error: lastError || 'unknown'
  });
}

function bindSliderValue(sliderId, labelId) {
  const slider = $(sliderId);
  const label = $(labelId);
  const sync = () => {
    label.textContent = Number(slider.value)
      .toFixed(2)
      .replace(/\.00$/, '.0')
      .replace(/(\.\d)0$/, '$1');
  };
  slider.addEventListener('input', sync);
  sync();
}

function toggleStudioTab(tabName) {
  $('tab-studio').classList.toggle('active', tabName === 'studio');
  $('tab-autopilot').classList.toggle('active', tabName === 'autopilot');
  $('tab-library').classList.toggle('active', tabName === 'library');
  $('view-studio').classList.toggle('active', tabName === 'studio');
  $('view-autopilot').classList.toggle('active', tabName === 'autopilot');
  $('view-library').classList.toggle('active', tabName === 'library');

  if (tabName === 'library') renderLocalPresets();
  if (tabName === 'autopilot') renderAutopilotLog();
}

function renderModuleStack() {
  const container = $('module-stack-container');
  const rows = moduleCatalog.map((mod) => {
    const enabled = mod.id === runtime.baseModuleId || runtime.enabledModules.has(mod.id);
    const isBase = mod.stage === 'BASE';
    return `
      <div class="module-row ${isBase ? 'base-mod' : ''}">
        <input type="checkbox" ${enabled ? 'checked' : ''} ${isBase ? 'disabled' : ''} data-module-toggle="${mod.id}" style="accent-color:#00ff88;">
        <span class="runtime-badge">MAIN</span>
        <span class="stage-badge">${mod.stage.replace('_PASS', '').replace('_', ' ')}</span>
        <span style="flex:1;font-size:.75rem;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;color:#fff;" title="${mod.description}">${mod.name}</span>
      </div>
    `;
  });

  if (runtime.sandboxModuleId) {
    const sandboxModule = moduleCatalog.find((mod) => mod.id === runtime.sandboxModuleId);
    rows.push(`
      <div class="module-row sandbox-only">
        <input type="checkbox" checked disabled style="accent-color:#f7b733;">
        <span class="runtime-badge">SANDBOX</span>
        <span class="stage-badge">${sandboxModule?.stage || 'TEST'}</span>
        <span style="flex:1;font-size:.75rem;color:#fff;">${sandboxModule?.name || runtime.sandboxModuleId}</span>
      </div>
    `);
  }

  container.innerHTML = rows.join('') || `<div style="color:#666;font-size:.72rem;text-align:center;padding:8px;">Pipeline empty.</div>`;
  $('pipeline-summary').textContent = `${moduleCatalog.length + (runtime.sandboxModuleId ? 1 : 0)} module slots`;

  container.querySelectorAll('[data-module-toggle]').forEach((input) => {
    input.addEventListener('change', () => runtime.toggleModule(input.dataset.moduleToggle, input.checked));
  });
}

function updateSandboxUi() {
  $('sandbox-container').classList.toggle('active', runtime.sandboxActive);
  $('panic-btn').style.display = runtime.sandboxActive ? 'block' : 'none';
  $('promote-sandbox-btn').style.display = runtime.sandboxActive && runtime.sandboxModuleId ? 'block' : 'none';
  $('discard-sandbox-btn').style.display = runtime.sandboxActive && (runtime.sandboxModuleId || threeRuntime.active) ? 'block' : 'none';
  $('diagnostics-log').style.display = runtime.sandboxActive ? 'block' : 'none';
  renderModuleStack();
}

function writeDiagnostic(message, type = 'diag-info') {
  const log = $('diagnostics-log');
  const row = document.createElement('div');
  row.className = type;
  row.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
  log.appendChild(row);
  log.scrollTop = log.scrollHeight;
}

function renderCodeViewer(format = 'js') {
  const samples = {
    js: `// Safe module preview\n// This build does not execute arbitrary code yet.\n// Use curated modules while the compiler adapter is split into a reviewed layer.`,
    wgsl: `// Governed WebGPU 3D adapter active\n// Curated WGSL lives in src/render/webgpu3dRuntime.js.\n// Provider-generated shaders remain untrusted text.`,
    glsl: `// Governed WebGL2 3D fallback active\n// Curated GLSL lives in src/render/webgl3dRuntime.js.\n// Provider-generated shaders remain untrusted text.`,
    python: `# Python/Pyodide adapter planned\n# Pyodide is intentionally staged out of this safe foundation.`
  };
  $('code-viewer').value = samples[format] || samples.js;
}

function makeEmptyState(text, className = '') {
  const row = document.createElement('div');
  row.className = className;
  row.style.textAlign = 'center';
  row.style.color = '#666';
  row.style.fontSize = '.8rem';
  row.textContent = text;
  return row;
}

function parseTelemetryJsonl(text, limits = JSONL_IMPORT_LIMITS) {
  const rows = [];
  const errors = [];
  const lines = String(text).split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const lineNumber = index + 1;
    const rawLine = lines[index];
    const line = rawLine.trim();

    if (!line) continue;

    if (rows.length >= limits.maxRows) {
      errors.push({ line: lineNumber, message: `Row limit reached (${limits.maxRows}).` });
      break;
    }

    if (line.length > limits.maxLineChars) {
      errors.push({ line: lineNumber, message: `Line exceeds ${limits.maxLineChars} characters.` });
      continue;
    }

    try {
      const row = JSON.parse(line);
      if (!row || typeof row !== 'object' || Array.isArray(row)) {
        errors.push({ line: lineNumber, message: 'Line must be a JSON object.' });
        continue;
      }
      rows.push({ row, lineNumber });
    } catch (error) {
      errors.push({ line: lineNumber, message: error.message || 'Invalid JSON.' });
    }
  }

  return { rows, errors };
}

function summarizeJsonlImport(rows, errors, totalRows) {
  if (rows.length && errors.length) {
    const firstErrors = errors
      .slice(0, JSONL_IMPORT_LIMITS.maxReportedErrors)
      .map((error) => `line ${error.line}: ${error.message}`)
      .join('; ');
    const more = errors.length > JSONL_IMPORT_LIMITS.maxReportedErrors ? `; +${errors.length - JSONL_IMPORT_LIMITS.maxReportedErrors} more` : '';
    return `Imported ${rows.length} quarantined rows, rejected ${errors.length}. ${firstErrors}${more}`;
  }

  if (rows.length) return `Imported ${rows.length} quarantined telemetry rows. Total: ${totalRows}.`;
  if (errors.length) return `Import rejected ${errors.length} lines. First error line ${errors[0].line}: ${errors[0].message}`;
  return 'No JSONL rows found.';
}

function renderLocalPresets() {
  const listEl = $('local-list');
  const presets = getPresets();
  listEl.replaceChildren();

  if (!presets.length) {
    listEl.appendChild(makeEmptyState('No local saves yet.'));
    return;
  }

  presets.forEach((preset, index) => {
    const card = document.createElement('div');
    card.className = 'community-card';

    const title = document.createElement('div');
    title.className = 'cc-title';
    title.textContent = preset.name || 'Unnamed Pipeline';

    const author = document.createElement('div');
    author.className = 'cc-author';
    const baseModule = preset.baseModuleId || 'voidCore';
    const overlayCount = Array.isArray(preset.enabledModules) ? preset.enabledModules.length : 0;
    author.textContent = `${baseModule} base · ${overlayCount} overlays`;

    const note = document.createElement('div');
    note.className = 'tiny-note';
    note.style.margin = '6px 0 8px 0';
    note.textContent = `Speed ${preset.ui?.speed ?? 1.0} · Glitch ${preset.ui?.glitch ?? 1.5} · Sense ${preset.ui?.audioSense ?? 1.0}`;

    const controls = document.createElement('div');
    controls.className = 'flex-row';
    controls.style.marginBottom = '0';

    const loadBtn = document.createElement('button');
    loadBtn.className = 'btn-small btn-good';
    loadBtn.style.color = '#000';
    loadBtn.style.background = '#00ff88';
    loadBtn.textContent = 'Load';

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'btn-small';
    deleteBtn.style.color = '#ff416c';
    deleteBtn.style.borderColor = 'rgba(255,65,108,.35)';
    deleteBtn.textContent = 'Delete';

    controls.append(loadBtn, deleteBtn);
    card.append(title, author, note, controls);

    loadBtn.addEventListener('click', () => {
      runtime.setBaseModule(preset.baseModuleId || 'voidCore');
      runtime.enabledModules = new Set(preset.enabledModules || ['spectralGrid', 'beatBloom', 'chromaSlice']);
      $('sl-speed').value = preset.ui?.speed ?? 1.0;
      $('sl-glitch').value = preset.ui?.glitch ?? 1.5;
      $('sl-audio-sense').value = preset.ui?.audioSense ?? 1.0;
      $('val-speed').textContent = Number($('sl-speed').value).toFixed(1);
      $('val-glitch').textContent = Number($('sl-glitch').value).toFixed(1);
      $('val-audio-sense').textContent = Number($('sl-audio-sense').value).toFixed(1);
      renderModuleStack();
      toggleStudioTab('studio');
      setStatus(`Loaded preset: ${preset.name || 'Unnamed Pipeline'}`, false, 1800);
    });

    deleteBtn.addEventListener('click', () => {
      deletePreset(index);
      renderLocalPresets();
    });

    listEl.appendChild(card);
  });
}

function renderAutopilotLog() {
  const el = $('autopilot-log');
  const logs = getAutopilotLogs();
  el.replaceChildren();

  if (!logs.length) {
    const notice = makeEmptyState(safeAutopilotNotice());
    notice.style.fontSize = '.72rem';
    el.appendChild(notice);
    return;
  }

  logs.slice(-50).reverse().forEach((entry) => {
    const row = document.createElement('div');
    row.style.marginBottom = '6px';
    row.style.borderBottom = '1px solid rgba(255,255,255,0.06)';
    row.style.paddingBottom = '4px';

    const meta = document.createElement('div');
    meta.style.fontSize = '0.65rem';
    meta.style.color = '#00b8ff';
    const timestamp = Number.isFinite(entry?.ts) ? new Date(entry.ts).toLocaleTimeString() : 'unknown time';
    meta.textContent = `${timestamp} · ${entry?.type || 'LOG'}`;

    const message = document.createElement('div');
    message.style.fontSize = '0.72rem';
    message.style.color = '#ddd';
    message.textContent = entry?.message || '';

    row.append(meta, message);
    el.appendChild(row);
  });
}

function revokeObjectUrlLater(url, delay = 1000) {
  if (!url || !url.startsWith('blob:')) return;
  window.setTimeout(() => URL.revokeObjectURL(url), delay);
}

function downloadText(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  revokeObjectUrlLater(a.href);
}

function getMediaCapabilities() {
  const hasMediaRecorder = typeof MediaRecorder !== 'undefined';

  return {
    objectUrls: typeof URL !== 'undefined'
      && typeof URL.createObjectURL === 'function'
      && typeof URL.revokeObjectURL === 'function',
    getUserMedia: Boolean(navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function'),
    captureStream: typeof HTMLCanvasElement !== 'undefined'
      && typeof HTMLCanvasElement.prototype.captureStream === 'function',
    mediaRecorder: hasMediaRecorder,
    mediaRecorderTypeDetection: hasMediaRecorder && typeof MediaRecorder.isTypeSupported === 'function'
  };
}

function getPreferredRecordingMimeType(capabilities = getMediaCapabilities()) {
  if (!capabilities.mediaRecorder || !capabilities.mediaRecorderTypeDetection) return '';

  return [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm'
  ].find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

function describeMediaError(error) {
  if (!error) return 'unknown browser media error';
  return error.message || error.name || 'unknown browser media error';
}

function warnForMissingMediaCapabilities() {
  const capabilities = getMediaCapabilities();
  const missing = [];

  if (!capabilities.objectUrls) missing.push('object URLs');
  if (!capabilities.getUserMedia) missing.push('microphone capture');
  if (!capabilities.captureStream) missing.push('canvas recording');
  if (!capabilities.mediaRecorder) missing.push('MediaRecorder');

  if (missing.length) {
    setStatus(`Media warning: unsupported ${missing.join(', ')}. Some media paths will be disabled.`, false, 6000);
  }
}

function resetActiveMediaObjectUrl() {
  if (activeMediaObjectUrl) {
    URL.revokeObjectURL(activeMediaObjectUrl);
    activeMediaObjectUrl = null;
  }
}

function bindUi() {
  bindSliderValue('sl-speed', 'val-speed');
  bindSliderValue('sl-glitch', 'val-glitch');
  bindSliderValue('sl-audio-sense', 'val-audio-sense');

  $('tab-studio').addEventListener('click', () => toggleStudioTab('studio'));
  $('tab-autopilot').addEventListener('click', () => toggleStudioTab('autopilot'));
  $('tab-library').addEventListener('click', () => toggleStudioTab('library'));

  $('hide-ui-btn').addEventListener('click', () => $('ui-layer').classList.add('hidden'));
  document.body.addEventListener('click', (event) => {
    if (!event.target.closest('#ui-layer') && !event.target.closest('#code-layer')) {
      $('ui-layer').classList.remove('hidden');
    }
  });

  $('toggle-code-btn').addEventListener('click', () => $('code-layer').classList.remove('hidden'));
  $('close-code-btn').addEventListener('click', () => $('code-layer').classList.add('hidden'));
  $('code-format').addEventListener('change', (event) => renderCodeViewer(event.target.value));

  $('sandbox-toggle').addEventListener('change', (event) => {
    runtime.setSandboxActive(event.target.checked);
    if (!event.target.checked && (threeRuntime.active || threeRuntime.initializing)) {
      threeRuntime.deactivate();
      $('three-status').dataset.state = 'idle';
      $('three-status').textContent = '3D preview disabled. Canvas2D remains stable.';
    }
    updateSandboxUi();
    if (runtime.sandboxActive) writeDiagnostic('Switched to experimental runtime context.');
    setStatus(runtime.sandboxActive ? 'SANDBOX RUNTIME ACTIVE' : 'STABLE ENGINE ACTIVE', runtime.sandboxActive);
  });

  $('sandbox-preview-mode').addEventListener('change', (event) => runtime.setPreviewMode(event.target.value));

  $('preview-three-btn').addEventListener('click', async () => {
    const button = $('preview-three-btn');
    const status = $('three-status');
    button.disabled = true;
    status.dataset.state = 'loading';
    status.textContent = 'Initializing governed 3D sandbox lane...';
    runtime.setSandboxModule(null);
    const result = await threeRuntime.preview('bassTunnel3d', $('three-backend').value || THREE_BACKENDS.AUTO);
    button.disabled = false;

    if (result.cancelled) {
      if (status.dataset.state === 'loading') {
        status.dataset.state = 'idle';
        status.textContent = '3D initialization cancelled. Canvas2D remains stable.';
      }
      return;
    }

    if (!result.ok) {
      runtime.setSandboxActive(false);
      $('sandbox-toggle').checked = false;
      status.dataset.state = 'error';
      status.textContent = `3D unavailable: ${result.error}`;
      updateSandboxUi();
      setStatus('3D preview unavailable. Canvas2D remained active.', false, 3000);
      logTelemetry('THREE_PREVIEW_REJECTED', { lane: '3d', reason: result.error });
      return;
    }

    runtime.setSandboxActive(true);
    $('sandbox-toggle').checked = true;
    status.dataset.state = 'active';
    status.textContent = `Bass Tunnel 3D active via ${result.backend.toUpperCase()}. Sandbox only.`;
    updateSandboxUi();
    setStatus(`3D SANDBOX ACTIVE · ${result.backend.toUpperCase()}`, true);
    logTelemetry('THREE_PREVIEW_ACTIVE', {
      lane: '3d',
      backend: result.backend,
      module_id: result.module.id,
      promotion_state: 'sandbox'
    });
  });

  $('panic-btn').addEventListener('click', () => {
    threeRuntime.deactivate();
    runtime.setSandboxModule(null);
    runtime.setSandboxActive(false);
    $('sandbox-toggle').checked = false;
    updateSandboxUi();
    $('three-status').dataset.state = 'idle';
    $('three-status').textContent = '3D lane idle. Canvas2D remains stable.';
    writeDiagnostic('PANIC reset triggered. Sandbox module cleared.', 'diag-err');
    setStatus('Sandbox panic reset complete.', false, 1800);
  });

  $('discard-sandbox-btn').addEventListener('click', () => {
    threeRuntime.deactivate();
    runtime.setSandboxModule(null);
    writeDiagnostic('Sandbox discarded.', 'diag-warn');
    updateSandboxUi();
    $('three-status').dataset.state = 'idle';
    $('three-status').textContent = '3D preview discarded. Canvas2D remains stable.';
  });

  $('promote-sandbox-btn').addEventListener('click', () => {
    if (!runtime.sandboxModuleId) return;
    if (runtime.sandboxModuleId === 'voidCore') runtime.setBaseModule('voidCore');
    else runtime.toggleModule(runtime.sandboxModuleId, true);
    runtime.setSandboxModule(null);
    runtime.setSandboxActive(false);
    $('sandbox-toggle').checked = false;
    updateSandboxUi();
    setStatus('Sandbox module committed to main.', false, 1800);
  });

  $('apply-code-btn').addEventListener('click', () => {
    const stage = $('evo-stage').value;
    const moduleId = stage === 'BASE' ? 'voidCore' : 'spectralGrid';
    runtime.setSandboxModule(moduleId);
    runtime.setSandboxActive(true);
    $('sandbox-toggle').checked = true;
    updateSandboxUi();
    writeDiagnostic(`Safe compiler preview injected curated ${moduleId} module.`);
    setStatus('Safe sandbox preview compiled.', true, 1800);
  });

  $('apply-main-base-btn').addEventListener('click', () => {
    runtime.setBaseModule('voidCore');
    logTelemetry('MANUAL_MAIN_BASE_COMPILE_SAFE', { format: $('code-format').value });
    setStatus('Main base refreshed from curated Void Core.', false, 1800);
  });

  document.querySelectorAll('.format-radio').forEach((radio) => {
    radio.addEventListener('change', (event) => {
      $('code-format').value = event.target.value;
      renderCodeViewer(event.target.value);
      setStatus(`${event.target.value.toUpperCase()} lane selected. Adapter pending.`, false, 1600);
    });
  });

  $('evolve-btn').addEventListener('click', () => {
    runtime.setSandboxModule('spectralGrid');
    runtime.setSandboxActive(true);
    $('sandbox-toggle').checked = true;
    updateSandboxUi();
    logTelemetry('SAFE_EVOLVE_PREVIEW', { prompt: $('director-prompt').value, stage: $('evo-stage').value });
    setStatus('Safe evolve preview loaded.', true, 1800);
  });

  $('iterate-btn').addEventListener('click', () => {
    runtime.setSandboxModule('chromaSlice');
    runtime.setSandboxActive(true);
    $('sandbox-toggle').checked = true;
    updateSandboxUi();
    logTelemetry('SAFE_ITERATE_PREVIEW', { prompt: $('director-prompt').value, stage: $('evo-stage').value });
    setStatus('Safe iteration preview loaded.', true, 1800);
  });

  $('btn-like').addEventListener('click', () => {
    logTelemetry('USER_REWARD', { reason: 'User liked safe preview.' });
    $('feedback-section').style.display = 'none';
    setStatus('Pattern logged.', runtime.sandboxActive, 1200);
  });

  $('btn-dislike').addEventListener('click', () => {
    const reason = $('dislike-reason').value || 'Did not meet vision.';
    logTelemetry('USER_PUNISHMENT', { reason });
    $('dislike-reason').value = '';
    setStatus('Rejection logged.', runtime.sandboxActive, 1200);
  });

  $('btn-auto-ideas').addEventListener('click', () => {
    const ideas = generateSeedIdeas(5).join(' ');
    const seedBox = $('autopilot-seeds');
    seedBox.value = seedBox.value.trim() ? `${seedBox.value}\n\n${ideas}` : ideas;
    logAutopilot('IDEAS', 'Generated safe seed ideas.');
    renderAutopilotLog();
    setStatus('Added auto-generated concepts.', false, 2000);
  });

  $('btn-run-one').addEventListener('click', () => {
    const text = $('autopilot-seeds').value.trim();
    if (!text) return setStatus('Add a seed prompt.', false, 2500);
    autopilotQueue = queueVariations(text, 1);
    runtime.setSandboxModule('beatBloom');
    runtime.setSandboxActive(true);
    $('sandbox-toggle').checked = true;
    updateSandboxUi();
    renderAutopilotLog();
    setStatus('Safe Autopilot staged one design note.', true, 2200);
  });

  $('btn-run-batch').addEventListener('click', () => {
    const text = $('autopilot-seeds').value.trim();
    if (!text) return setStatus('Add a seed prompt to run a batch.', false, 2500);
    const count = parseInt($('autopilot-batch-count').value || '5', 10);
    autopilotQueue = queueVariations(text, count);
    runtime.setSandboxModule('spectralGrid');
    runtime.setSandboxActive(true);
    $('sandbox-toggle').checked = true;
    updateSandboxUi();
    renderAutopilotLog();
    setStatus(`Safe Autopilot queued ${autopilotQueue.length} notes.`, true, 2200);
  });

  $('btn-stop-batch').addEventListener('click', () => {
    autopilotQueue = [];
    logAutopilot('BATCH', 'Autopilot stopped by user.');
    renderAutopilotLog();
    setStatus('Autopilot queue cleared.', false, 2000);
  });

  $('save-btn').addEventListener('click', () => {
    const name = $('preset-name').value.trim() || 'Unnamed Pipeline';
    savePreset({
      name,
      baseModuleId: runtime.baseModuleId,
      enabledModules: [...runtime.enabledModules],
      ui: {
        speed: parseFloat($('sl-speed').value),
        glitch: parseFloat($('sl-glitch').value),
        audioSense: parseFloat($('sl-audio-sense').value),
        preview: $('sandbox-preview-mode').value
      }
    });
    $('preset-name').value = '';
    renderLocalPresets();
    setStatus('Pipeline saved locally.', false, 1500);
  });

  $('btn-export-lora').addEventListener('click', () => {
    const rows = exportTelemetryJsonl();
    if (!rows.trim()) return setStatus('Dataset is empty.', false, 2200);
    downloadText(`gef_telemetry_${Date.now()}.jsonl`, rows, 'application/jsonl');
  });

  $('btn-import-lora').addEventListener('click', () => $('dataset-upload').click());
  $('dataset-upload').addEventListener('change', (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > JSONL_IMPORT_LIMITS.maxFileBytes) {
      setStatus(`Import blocked: file exceeds ${Math.round(JSONL_IMPORT_LIMITS.maxFileBytes / 1024 / 1024)} MB.`, false, 3000);
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const { rows, errors } = parseTelemetryJsonl(ev.target.result);

      if (rows.length) {
        const all = importTelemetryRows(rows, {
          fileName: file.name,
          importedAt: new Date().toISOString(),
          parserVersion: 'gef-jsonl-import-v1'
        });
        $('dataset-count').innerText = all.length;
        setStatus(summarizeJsonlImport(rows, errors, all.length), false, errors.length ? 5000 : 1800);
      } else {
        setStatus(summarizeJsonlImport(rows, errors, getTelemetry().length), false, 5000);
      }

      event.target.value = '';
    };
    reader.onerror = () => {
      setStatus('Import failed: could not read file.', false, 3000);
      event.target.value = '';
    };
    reader.readAsText(file);
  });
}

function bindMediaControls() {
  $('media-upload').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const capabilities = getMediaCapabilities();
    if (!capabilities.objectUrls) {
      setStatus('Media upload unavailable: object URLs are not supported in this browser.', false, 4000);
      event.target.value = '';
      return;
    }

    await audio.init();
    const mediaPlayer = $('media-player');
    const objectUrl = URL.createObjectURL(file);
    resetActiveMediaObjectUrl();
    activeMediaObjectUrl = objectUrl;
    mediaPlayer.src = objectUrl;
    mediaPlayer.onerror = () => {
      setStatus('Media load failed. Browser or CSP may be blocking blob: media URLs. Check media-src blob:.', false, 6000);
    };

    let playbackStarted = true;
    try {
      await mediaPlayer.play();
    } catch (error) {
      playbackStarted = false;
      setStatus(`Media loaded but playback was blocked: ${describeMediaError(error)}. Press Play or check media-src blob:.`, false, 5000);
    }

    try {
      if (!mediaElementSource) {
        mediaElementSource = audio.ctx.createMediaElementSource(mediaPlayer);
      }
      audio.route(mediaElementSource, false);
      $('playback-controls').style.display = 'block';
      if (playbackStarted) setStatus(`Loaded media: ${file.name}`, false, 1400);
    } catch (error) {
      setStatus(`Media audio routing failed: ${describeMediaError(error)}.`, false, 5000);
    }
  });

  $('btn-mic').addEventListener('click', async () => {
    const capabilities = getMediaCapabilities();
    if (!capabilities.getUserMedia) {
      setStatus('Microphone unavailable: getUserMedia is not supported in this browser or context.', false, 5000);
      return;
    }

    await audio.init();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audio.route(audio.ctx.createMediaStreamSource(stream), true);
      $('playback-controls').style.display = 'block';
      setStatus('Microphone input active.', false, 1400);
    } catch (error) {
      setStatus(`Microphone unavailable: ${describeMediaError(error)}. Check browser permissions and secure context.`, false, 5000);
    }
  });

  $('btn-play').addEventListener('click', async () => {
    try {
      await $('media-player').play();
    } catch (error) {
      setStatus(`Playback failed: ${describeMediaError(error)}. Check media-src blob: policy.`, false, 5000);
    }
  });
  $('btn-pause').addEventListener('click', () => $('media-player').pause());
  $('btn-stop').addEventListener('click', () => {
    $('media-player').pause();
    $('media-player').currentTime = 0;
  });

  $('btn-snapshot').addEventListener('click', () => {
    const url = runtime.snapshot();
    const a = document.createElement('a');
    a.href = url;
    a.download = `gef_snapshot_${Date.now()}.png`;
    a.click();
  });

  $('btn-record').addEventListener('click', () => {
    const btn = $('btn-record');

    if (mediaRecorder && mediaRecorder.state === 'recording') {
      mediaRecorder.stop();
      isRecording = false;
      btn.textContent = 'Record';
      btn.style.background = 'rgba(255,65,108,.2)';
      return;
    }

    const capabilities = getMediaCapabilities();
    if (!capabilities.captureStream) {
      setStatus('Recording unsupported: canvas.captureStream is unavailable in this browser.', false, 5000);
      return;
    }
    if (!capabilities.mediaRecorder) {
      setStatus('Recording unsupported: MediaRecorder is unavailable in this browser.', false, 5000);
      return;
    }
    if (!capabilities.objectUrls) {
      setStatus('Recording export unsupported: object URLs are unavailable in this browser.', false, 5000);
      return;
    }

    try {
      const canvas = runtime.drawComposite(window.innerWidth, window.innerHeight);
      const videoStream = canvas.captureStream(30);
      const audioTracks = audio.streamDestination ? audio.streamDestination.stream.getAudioTracks() : [];
      const combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...audioTracks]);
      const mimeType = getPreferredRecordingMimeType(capabilities);
      const recorderOptions = { videoBitsPerSecond: 8000000 };
      if (mimeType) recorderOptions.mimeType = mimeType;

      mediaRecorder = new MediaRecorder(combinedStream, recorderOptions);

      recordedChunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) recordedChunks.push(event.data);
      };
      mediaRecorder.onstop = () => {
        combinedStream.getTracks().forEach((track) => track.stop());
        const outputType = mimeType || 'video/webm';
        const blob = new Blob(recordedChunks, { type: outputType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gef_capture_${Date.now()}.webm`;
        a.click();
        revokeObjectUrlLater(url);
      };

      isRecording = true;
      mediaRecorder.start(1000);
      btn.textContent = 'Stop';
      btn.style.background = '#ff416c';
      setStatus('Recording started.', false, 1200);
    } catch (error) {
      isRecording = false;
      setStatus(`Recording failed: ${describeMediaError(error)}. Check capture support and CSP blob policies.`, false, 6000);
    }
  });
}

function updateMeters(metrics) {
  $('fill-bass').style.width = `${Math.min(metrics.bass * 100, 100)}%`;
  $('fill-mid').style.width = `${Math.min(metrics.mid * 100, 100)}%`;
  $('fill-treble').style.width = `${Math.min(metrics.treble * 100, 100)}%`;
  $('fill-glitch').style.width = `${Math.min(metrics.glitch * 100, 100)}%`;
  $('fill-centroid').style.width = `${Math.min(metrics.centroid * 1000, 100)}%`;
}

function renderEngine() {
  const now = performance.now();
  const dt = (now - lastFrameTime) / 1000;
  lastFrameTime = now;

  const speed = parseFloat($('sl-speed').value);
  const glitchThreshold = parseFloat($('sl-glitch').value);
  const audioSense = parseFloat($('sl-audio-sense').value);

  globalTime += dt * speed;
  const metrics = audio.update(glitchThreshold, audioSense);
  updateMeters(metrics);
  runtime.render(window.innerWidth, window.innerHeight, globalTime, metrics);
  threeRuntime.render(window.innerWidth, window.innerHeight, globalTime, metrics);

  if (isRecording) {
    runtime.drawComposite(window.innerWidth, window.innerHeight);
  }

  requestAnimationFrame(renderEngine);
}

function boot() {
  $('dataset-count').innerText = getTelemetry().length;
  bindUi();
  bindMediaControls();
  renderCodeViewer('js');
  renderModuleStack();
  renderAutopilotLog();
  setStatus('STABLE ENGINE ACTIVE');
  window.setTimeout(warnForMissingMediaCapabilities, 300);
  requestAnimationFrame(renderEngine);
}

boot();
