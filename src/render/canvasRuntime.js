import { MODULE_STAGES, RENDER_LANES, getModuleById, getModuleRender } from './moduleRegistry.js';

function isCanvas2dModule(moduleDef) {
  return moduleDef?.lane === RENDER_LANES.CANVAS_2D;
}

function isCanvas2dBaseModule(moduleDef) {
  return isCanvas2dModule(moduleDef) && moduleDef.stage === MODULE_STAGES.BASE;
}

function isCanvas2dStackModule(moduleDef) {
  return isCanvas2dModule(moduleDef) && moduleDef.stage !== MODULE_STAGES.BASE;
}

export class CanvasRuntime {
  constructor({ mainCanvas, sandboxCanvas, feedbackCanvas, compositeCanvas }) {
    this.mainCanvas = mainCanvas;
    this.sandboxCanvas = sandboxCanvas;
    this.feedbackCanvas = feedbackCanvas;
    this.compositeCanvas = compositeCanvas;

    this.mainCtx = mainCanvas.getContext('2d');
    this.sandboxCtx = sandboxCanvas.getContext('2d');
    this.feedbackCtx = feedbackCanvas.getContext('2d', { willReadFrequently: true });
    this.compositeCtx = compositeCanvas.getContext('2d');

    this.baseModuleId = 'voidCore';
    this.enabledModules = new Set(['spectralGrid', 'beatBloom', 'chromaSlice']);
    this.sandboxModuleId = null;
    this.sandboxActive = false;
    this.previewMode = 'AUTO';
  }

  resize(w, h) {
    for (const canvas of [this.mainCanvas, this.sandboxCanvas, this.feedbackCanvas, this.compositeCanvas]) {
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
    }
  }

  setBaseModule(moduleId) {
    if (isCanvas2dBaseModule(getModuleById(moduleId))) {
      this.baseModuleId = moduleId;
    }
  }

  setSandboxModule(moduleId) {
    this.sandboxModuleId = isCanvas2dModule(getModuleById(moduleId)) ? moduleId : null;
  }

  setSandboxActive(isActive) {
    this.sandboxActive = Boolean(isActive);
  }

  setPreviewMode(mode) {
    this.previewMode = mode;
  }

  toggleModule(moduleId, enabled) {
    if (!isCanvas2dStackModule(getModuleById(moduleId))) return;
    if (enabled) this.enabledModules.add(moduleId);
    else this.enabledModules.delete(moduleId);
  }

  render(w, h, time, audio) {
    this.resize(w, h);
    this.renderMain(w, h, time, audio);
    this.renderSandbox(w, h, time, audio);
  }

  renderMain(w, h, time, audio) {
    const base = getModuleRender(this.baseModuleId) || getModuleRender('voidCore');
    base(this.mainCtx, w, h, time, audio, this.mainCanvas);

    for (const moduleId of this.enabledModules) {
      if (moduleId === this.baseModuleId) continue;
      const moduleDef = getModuleById(moduleId);
      if (!isCanvas2dStackModule(moduleDef)) continue;
      const mod = getModuleRender(moduleId);
      if (mod) mod(this.mainCtx, w, h, time, audio, this.mainCanvas);
    }
  }

  renderSandbox(w, h, time, audio) {
    this.sandboxCtx.clearRect(0, 0, w, h);
    if (!this.sandboxActive || !this.sandboxModuleId) return;

    const moduleDef = getModuleById(this.sandboxModuleId);
    if (!isCanvas2dModule(moduleDef)) return;

    const moduleFn = getModuleRender(this.sandboxModuleId);
    if (!moduleFn) return;

    const shouldReplace = this.previewMode === 'REPLACE' || (this.previewMode === 'AUTO' && moduleDef.stage === MODULE_STAGES.BASE);
    this.sandboxCanvas.style.mixBlendMode = shouldReplace ? 'normal' : 'screen';

    if (shouldReplace) {
      this.sandboxCtx.fillStyle = '#050505';
      this.sandboxCtx.fillRect(0, 0, w, h);
    }

    moduleFn(this.sandboxCtx, w, h, time, audio, this.feedbackCanvas);
    this.feedbackCtx.clearRect(0, 0, w, h);
    this.feedbackCtx.drawImage(this.sandboxCanvas, 0, 0);
  }

  drawComposite(w, h) {
    this.resize(w, h);
    this.compositeCtx.clearRect(0, 0, w, h);
    this.compositeCtx.drawImage(this.mainCanvas, 0, 0);
    if (this.sandboxActive) {
      this.compositeCtx.drawImage(this.sandboxCanvas, 0, 0);
    }
    return this.compositeCanvas;
  }

  snapshot() {
    const canvas = this.drawComposite(window.innerWidth, window.innerHeight);
    return canvas.toDataURL('image/png');
  }
}
