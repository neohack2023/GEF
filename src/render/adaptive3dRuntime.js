import { validateThreeModuleForSandbox } from './threeModuleRegistry.js';
import { WebGl3dRuntime } from './webgl3dRuntime.js';
import { WebGpu3dRuntime } from './webgpu3dRuntime.js';

export const THREE_BACKENDS = Object.freeze({
  AUTO: 'auto',
  WEBGPU: 'webgpu',
  WEBGL2: 'webgl2'
});

function describeError(error) {
  return error instanceof Error ? error.message : String(error);
}

const DEFAULT_RUNTIME_FACTORIES = Object.freeze({
  [THREE_BACKENDS.WEBGPU]: (canvas, options) => new WebGpu3dRuntime(canvas, options),
  [THREE_BACKENDS.WEBGL2]: (canvas, options) => new WebGl3dRuntime(canvas, options)
});

export class Adaptive3dRuntime {
  constructor(canvas, {
    onDiagnostic,
    onDeactivated,
    runtimeFactories = DEFAULT_RUNTIME_FACTORIES
  } = {}) {
    this.canvas = canvas;
    this.onDiagnostic = onDiagnostic;
    this.onDeactivated = onDeactivated;
    this.runtimeFactories = runtimeFactories;
    this.backend = null;
    this.runtime = null;
    this.module = null;
    this.active = false;
    this.initializing = false;
    this.lastError = null;
    this.previewAttempt = 0;
  }

  resetCanvasContext() {
    const replacement = this.canvas.cloneNode(false);
    replacement.width = this.canvas.width;
    replacement.height = this.canvas.height;
    this.canvas.replaceWith(replacement);
    this.canvas = replacement;
    return replacement;
  }

  async tryBackend(backend, attemptId) {
    const onLost = (message) => {
      this.lastError = message;
      this.onDiagnostic?.(message, 'error');
      this.deactivate({ reason: 'backend-lost', notify: true });
    };
    const candidateCanvas = this.canvas;
    const factory = this.runtimeFactories[backend];
    if (!factory) throw new Error(`No runtime factory registered for ${backend}.`);
    const candidate = factory(candidateCanvas, { onLost });
    try {
      await candidate.init();
      if (attemptId !== this.previewAttempt) {
        candidate.dispose();
        if (candidateCanvas === this.canvas) this.resetCanvasContext();
        return 'cancelled';
      }
      this.runtime = candidate;
      this.backend = backend;
      return 'ready';
    } catch (error) {
      candidate.dispose();
      if (attemptId !== this.previewAttempt) {
        if (candidateCanvas === this.canvas) this.resetCanvasContext();
        return 'cancelled';
      }
      this.lastError = describeError(error);
      this.onDiagnostic?.(`${backend.toUpperCase()} unavailable: ${this.lastError}`, 'warning');
      this.resetCanvasContext();
      return 'unavailable';
    }
  }

  async preview(moduleId, requestedBackend = THREE_BACKENDS.AUTO) {
    if (this.initializing) return { ok: false, error: '3D renderer initialization is already running.' };
    const validation = validateThreeModuleForSandbox(moduleId);
    if (!validation.ok) return validation;

    this.deactivate();
    const attemptId = this.previewAttempt;
    const moduleDef = validation.module;
    this.initializing = true;
    this.module = moduleDef;
    const candidates = requestedBackend === THREE_BACKENDS.AUTO
      ? [THREE_BACKENDS.WEBGPU, THREE_BACKENDS.WEBGL2]
      : [requestedBackend];

    for (const backend of candidates) {
      const backendResult = await this.tryBackend(backend, attemptId);
      if (backendResult === 'cancelled') {
        return { ok: false, cancelled: true, error: '3D preview initialization was cancelled.' };
      }
      if (backendResult === 'ready') {
        this.active = true;
        this.canvas.hidden = false;
        this.canvas.dataset.active = 'true';
        this.canvas.dataset.backend = backend;
        this.canvas.dataset.moduleId = moduleDef.id;
        this.initializing = false;
        this.onDiagnostic?.(`${moduleDef.name} active through ${backend.toUpperCase()}.`, 'info');
        return { ok: true, backend, module: moduleDef };
      }
    }

    if (attemptId !== this.previewAttempt) {
      return { ok: false, cancelled: true, error: '3D preview initialization was cancelled.' };
    }
    this.module = null;
    this.initializing = false;
    this.canvas.hidden = true;
    return { ok: false, error: this.lastError || 'No supported 3D backend was found.' };
  }

  render(width, height, time, audio) {
    if (!this.active || !this.runtime) return;
    try {
      this.runtime.render(width, height, time, audio);
    } catch (error) {
      this.lastError = describeError(error);
      this.onDiagnostic?.(`3D frame failed: ${this.lastError}`, 'error');
      this.deactivate({ reason: 'frame-failed', notify: true });
    }
  }

  deactivate({ reason = 'manual', notify = false } = {}) {
    const wasActive = this.active;
    const wasInitializing = this.initializing;
    this.previewAttempt += 1;
    this.initializing = false;
    const hadGpuContext = Boolean(this.runtime || this.backend);
    this.runtime?.dispose();
    this.runtime = null;
    this.backend = null;
    this.module = null;
    this.active = false;
    if (hadGpuContext) this.resetCanvasContext();
    if (this.canvas) {
      this.canvas.hidden = true;
      delete this.canvas.dataset.active;
      delete this.canvas.dataset.backend;
      delete this.canvas.dataset.moduleId;
    }
    if (notify && (wasActive || wasInitializing)) {
      this.onDeactivated?.({ reason, lastError: this.lastError });
    }
  }

  getStatus() {
    return Object.freeze({
      active: this.active,
      initializing: this.initializing,
      backend: this.backend,
      moduleId: this.module?.id || null,
      lastError: this.lastError
    });
  }
}
