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

export class Adaptive3dRuntime {
  constructor(canvas, { onDiagnostic } = {}) {
    this.canvas = canvas;
    this.onDiagnostic = onDiagnostic;
    this.backend = null;
    this.runtime = null;
    this.module = null;
    this.active = false;
    this.initializing = false;
    this.lastError = null;
  }

  resetCanvasContext() {
    const replacement = this.canvas.cloneNode(false);
    replacement.width = this.canvas.width;
    replacement.height = this.canvas.height;
    this.canvas.replaceWith(replacement);
    this.canvas = replacement;
    return replacement;
  }

  async tryBackend(backend) {
    const onLost = (message) => {
      this.lastError = message;
      this.onDiagnostic?.(message, 'error');
      this.deactivate();
    };
    const RuntimeClass = backend === THREE_BACKENDS.WEBGPU ? WebGpu3dRuntime : WebGl3dRuntime;
    const candidate = new RuntimeClass(this.canvas, { onLost });
    try {
      await candidate.init();
      this.runtime = candidate;
      this.backend = backend;
      return true;
    } catch (error) {
      candidate.dispose();
      this.lastError = describeError(error);
      this.onDiagnostic?.(`${backend.toUpperCase()} unavailable: ${this.lastError}`, 'warning');
      this.resetCanvasContext();
      return false;
    }
  }

  async preview(moduleId, requestedBackend = THREE_BACKENDS.AUTO) {
    if (this.initializing) return { ok: false, error: '3D renderer initialization is already running.' };
    const validation = validateThreeModuleForSandbox(moduleId);
    if (!validation.ok) return validation;

    this.initializing = true;
    this.deactivate();
    this.module = validation.module;
    const candidates = requestedBackend === THREE_BACKENDS.AUTO
      ? [THREE_BACKENDS.WEBGPU, THREE_BACKENDS.WEBGL2]
      : [requestedBackend];

    for (const backend of candidates) {
      if (await this.tryBackend(backend)) {
        this.active = true;
        this.canvas.hidden = false;
        this.canvas.dataset.active = 'true';
        this.canvas.dataset.backend = backend;
        this.canvas.dataset.moduleId = this.module.id;
        this.initializing = false;
        this.onDiagnostic?.(`${this.module.name} active through ${backend.toUpperCase()}.`, 'info');
        return { ok: true, backend, module: this.module };
      }
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
      this.deactivate();
    }
  }

  deactivate() {
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
  }

  getStatus() {
    return Object.freeze({
      active: this.active,
      backend: this.backend,
      moduleId: this.module?.id || null,
      lastError: this.lastError
    });
  }
}
