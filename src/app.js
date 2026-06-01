import { AudioAnalyzer } from './audio/analyzer.js';
import { CanvasRuntime } from './render/canvasRuntime.js';
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

const sessionId = crypto.randomUUID ? crypto.randomUUID() : `gef-${Date.now()}`;
const audio = new AudioAnalyzer();
const runtime = new CanvasRuntime({
  mainCanvas: $('main-canvas-2d'),
  sandboxCanvas: $('sandbox-canvas'),
  feedbackCanvas: $('feedback-buffer'),
  compositeCanvas: $('composite-canvas')
});

let globalTime = 0;
let lastFrameTime = performance.now();
let mediaRecorder = null;
let recordedChunks = [];
let isRecording = false;
let autopilotQueue = [];

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
  $('discard-sandbox-btn').style.display = runtime.sandboxActive && runtime.sandboxModuleId ? 'block' : 'none';
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
    wgsl: `// WGSL adapter planned\n// WebGPU base rendering will be restored behind a dedicated compiler module.`,
    glsl: `// GLSL adapter planned\n// WebGL shader compilation will live in src/render/glslRuntime.js.`,
    python: `# Python/Pyodide adapter planned\n# Pyodide is intentionally staged out of this safe foundation.`
  };
  $('code-viewer').value = samples[format] || samples.js;
}

function renderLocalPresets() {
  const listEl = $('local-list');
  const presets = getPresets();

  if (!presets.length) {
    listEl.innerHTML = `<div style="text-align:center;color:#666;font-size:.8rem;">No local saves yet.</div>`;
    return;
  }

  listEl.innerHTML = '';
  presets.forEach((preset, index) => {
    const card = document.createElement('div');
    card.className = 'community-card';
    card.innerHTML = `
      <div class="cc-title">${preset.name}</div>
      <div class="cc-author">${preset.baseModuleId || 'voidCore'} base · ${preset.enabledModules?.length || 0} overlays</div>
      <div class="tiny-note" style="margin:6px 0 8px 0;">Speed ${preset.ui?.speed ?? 1.0} · Glitch ${preset.ui?.glitch ?? 1.5} · Sense ${preset.ui?.audioSense ?? 1.0}</div>
      <div class="flex-row" style="margin-bottom:0;">
        <button class="btn-small btn-good load-btn" style="color:#000;background:#00ff88;">Load</button>
        <button class="btn-small delete-btn" style="color:#ff416c;border-color:rgba(255,65,108,.35);">Delete</button>
      </div>
    `;

    card.querySelector('.load-btn').addEventListener('click', () => {
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
      setStatus(`Loaded preset: ${preset.name}`, false, 1800);
    });

    card.querySelector('.delete-btn').addEventListener('click', () => {
      deletePreset(index);
      renderLocalPresets();
    });

    listEl.appendChild(card);
  });
}

function renderAutopilotLog() {
  const el = $('autopilot-log');
  const logs = getAutopilotLogs();

  if (!logs.length) {
    el.innerHTML = `<div style="color:#666;font-size:.72rem;text-align:center;">${safeAutopilotNotice()}</div>`;
    return;
  }

  el.innerHTML = logs.slice(-50).reverse().map((entry) => `
    <div style="margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.06);padding-bottom:4px;">
      <div style="font-size:0.65rem;color:#00b8ff;">${new Date(entry.ts).toLocaleTimeString()} · ${entry.type}</div>
      <div style="font-size:0.72rem;color:#ddd;">${entry.message}</div>
    </div>
  `).join('');
}

function downloadText(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  URL.revokeObjectURL(a.href);
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
    updateSandboxUi();
    if (runtime.sandboxActive) writeDiagnostic('Switched to experimental runtime context.');
    setStatus(runtime.sandboxActive ? 'SANDBOX RUNTIME ACTIVE' : 'STABLE ENGINE ACTIVE', runtime.sandboxActive);
  });

  $('sandbox-preview-mode').addEventListener('change', (event) => runtime.setPreviewMode(event.target.value));

  $('panic-btn').addEventListener('click', () => {
    runtime.setSandboxModule(null);
    runtime.setSandboxActive(false);
    $('sandbox-toggle').checked = false;
    updateSandboxUi();
    writeDiagnostic('PANIC reset triggered. Sandbox module cleared.', 'diag-err');
    setStatus('Sandbox panic reset complete.', false, 1800);
  });

  $('discard-sandbox-btn').addEventListener('click', () => {
    runtime.setSandboxModule(null);
    writeDiagnostic('Sandbox discarded.', 'diag-warn');
    updateSandboxUi();
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
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const rows = String(ev.target.result)
          .split('\n')
          .filter(Boolean)
          .map((line) => JSON.parse(line));
        const all = importTelemetryRows(rows);
        $('dataset-count').innerText = all.length;
        setStatus(`Imported ${rows.length} telemetry rows.`, false, 1600);
      } catch {
        setStatus('Import failed.', false, 2500);
      }
      event.target.value = '';
    };
    reader.readAsText(file);
  });
}

function bindMediaControls() {
  $('media-upload').addEventListener('change', async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await audio.init();
    const mediaPlayer = $('media-player');
    mediaPlayer.src = URL.createObjectURL(file);

    try {
      await mediaPlayer.play();
    } catch {}

    audio.route(audio.ctx.createMediaElementSource(mediaPlayer), false);
    $('playback-controls').style.display = 'block';
    setStatus(`Loaded media: ${file.name}`, false, 1400);
  });

  $('btn-mic').addEventListener('click', async () => {
    await audio.init();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audio.route(audio.ctx.createMediaStreamSource(stream), true);
      $('playback-controls').style.display = 'block';
      setStatus('Microphone input active.', false, 1400);
    } catch {
      setStatus('Microphone access denied.', false, 2500);
    }
  });

  $('btn-play').addEventListener('click', () => $('media-player').play());
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

    try {
      const canvas = runtime.drawComposite(window.innerWidth, window.innerHeight);
      const videoStream = canvas.captureStream(30);
      const audioTracks = audio.streamDestination ? audio.streamDestination.stream.getAudioTracks() : [];
      const combinedStream = new MediaStream([...videoStream.getVideoTracks(), ...audioTracks]);

      let mimeType = 'video/webm';
      if (MediaRecorder.isTypeSupported('video/webm;codecs=vp9,opus')) mimeType = 'video/webm;codecs=vp9,opus';
      else if (MediaRecorder.isTypeSupported('video/webm;codecs=vp8,opus')) mimeType = 'video/webm;codecs=vp8,opus';

      mediaRecorder = new MediaRecorder(combinedStream, {
        mimeType,
        videoBitsPerSecond: 8000000
      });

      recordedChunks = [];
      mediaRecorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) recordedChunks.push(event.data);
      };
      mediaRecorder.onstop = () => {
        combinedStream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(recordedChunks, { type: mimeType });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `gef_capture_${Date.now()}.webm`;
        a.click();
        URL.revokeObjectURL(url);
      };

      isRecording = true;
      mediaRecorder.start(1000);
      btn.textContent = 'Stop';
      btn.style.background = '#ff416c';
      setStatus('Recording started.', false, 1200);
    } catch (error) {
      isRecording = false;
      setStatus(`Recording failed: ${error.message}`, false, 3000);
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
  requestAnimationFrame(renderEngine);
}

boot();
