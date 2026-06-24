import { visualModules } from './visualModules.js';

export const RENDER_LANES = Object.freeze({
  CANVAS_2D: 'canvas2d',
  THREE_D: '3d'
});

export const MODULE_STAGES = Object.freeze({
  BASE: 'BASE',
  OVERLAY: 'OVERLAY',
  POST_FX: 'POST_FX',
  FEEDBACK_PASS: 'FEEDBACK_PASS',
  UI_OVERLAY: 'UI_OVERLAY',
  BASE_3D: 'BASE_3D',
  OVERLAY_3D: 'OVERLAY_3D',
  POST_FX_3D: 'POST_FX_3D',
  UI_OVERLAY_3D: 'UI_OVERLAY_3D'
});

const CANVAS_2D_MODULES = [
  {
    id: 'voidCore',
    name: 'Void Core',
    stage: MODULE_STAGES.BASE,
    lane: RENDER_LANES.CANVAS_2D,
    category: 'base',
    description: 'Primary audio-reactive ring field.',
    defaults: {},
    paramsSchema: {},
    compatibilityNotes: ['Stable Canvas2D baseline module.'],
    performanceNotes: ['Uses simple path strokes and full-canvas fades.'],
    render: visualModules.voidCore
  },
  {
    id: 'spectralGrid',
    name: 'Spectral Grid',
    stage: MODULE_STAGES.OVERLAY,
    lane: RENDER_LANES.CANVAS_2D,
    category: 'overlay',
    description: 'Audio-bent line lattice overlay.',
    defaults: {},
    paramsSchema: {},
    compatibilityNotes: ['Stacks over a base module.'],
    performanceNotes: ['Line count changes with viewport size and audio motion.'],
    render: visualModules.spectralGrid
  },
  {
    id: 'beatBloom',
    name: 'Beat Bloom',
    stage: MODULE_STAGES.POST_FX,
    lane: RENDER_LANES.CANVAS_2D,
    category: 'post-fx',
    description: 'Beat-triggered radial light pulse.',
    defaults: {},
    paramsSchema: {},
    compatibilityNotes: ['Reads beat pressure and draws over the current scene.'],
    performanceNotes: ['Creates one radial gradient only when beat energy is active.'],
    render: visualModules.beatBloom
  },
  {
    id: 'chromaSlice',
    name: 'Chroma Slice',
    stage: MODULE_STAGES.POST_FX,
    lane: RENDER_LANES.CANVAS_2D,
    category: 'post-fx',
    description: 'Glitch threshold slicing effect.',
    defaults: {},
    paramsSchema: {},
    compatibilityNotes: ['Requires a source canvas to slice from.'],
    performanceNotes: ['Draws a bounded number of glitch slices when glitch energy is high.'],
    render: visualModules.chromaSlice
  }
];

export const moduleRegistry = Object.freeze(CANVAS_2D_MODULES.map((moduleDef) => Object.freeze({ ...moduleDef })));

export const moduleCatalog = Object.freeze(moduleRegistry.map(({ render, ...metadata }) => Object.freeze({ ...metadata })));

export const VALID_MODULE_STAGES = Object.freeze(Object.values(MODULE_STAGES));
export const VALID_RENDER_LANES = Object.freeze(Object.values(RENDER_LANES));

export function getModuleById(moduleId) {
  return moduleRegistry.find((moduleDef) => moduleDef.id === moduleId) || null;
}

export function getModuleCatalog() {
  return moduleCatalog.map((moduleDef) => ({ ...moduleDef }));
}

export function getModulesByStage(stage) {
  return moduleCatalog.filter((moduleDef) => moduleDef.stage === stage);
}

export function getModulesByLane(lane) {
  return moduleCatalog.filter((moduleDef) => moduleDef.lane === lane);
}

export function getModuleRender(moduleId) {
  return getModuleById(moduleId)?.render || null;
}

export function isKnownModuleId(moduleId) {
  return Boolean(getModuleById(moduleId));
}

export function isKnownModuleStage(stage) {
  return VALID_MODULE_STAGES.includes(stage);
}

export function validateModuleStage(moduleId, stage) {
  const moduleDef = getModuleById(moduleId);
  return Boolean(moduleDef && moduleDef.stage === stage);
}

export function isBaseStage(stage) {
  return stage === MODULE_STAGES.BASE || stage === MODULE_STAGES.BASE_3D;
}
