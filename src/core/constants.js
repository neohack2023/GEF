export const STAGES = {
  PRE_BASE: { id: 'PRE_BASE', order: 10, desc: 'Transforms before base draw' },
  BASE: { id: 'BASE', order: 20, desc: 'Primary visual generator or replacement' },
  OVERLAY: { id: 'OVERLAY', order: 30, desc: 'Standard additive layers' },
  FEEDBACK_PASS: { id: 'FEEDBACK_PASS', order: 40, desc: 'Recursive feedback from prior frame' },
  POST_FX: { id: 'POST_FX', order: 50, desc: 'Pixel manipulation and datamosh passes' },
  UI_OVERLAY: { id: 'UI_OVERLAY', order: 60, desc: 'Text or HUD overlays' }
};

export const FORMATS = {
  JS: 'js',
  WGSL: 'wgsl',
  GLSL: 'glsl',
  PYTHON: 'python'
};

export const DEFAULT_METRICS = {
  bass: 0,
  mid: 0,
  treble: 0,
  beat: 0,
  glitch: 0,
  centroid: 0,
  rms: 0
};
