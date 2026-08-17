export const THREE_RENDER_LANE = '3d';

const THREE_MODULES = [
  {
    id: 'bassTunnel3d',
    name: 'Bass Tunnel 3D',
    stage: 'BASE_3D',
    lane: THREE_RENDER_LANE,
    category: 'depth-field',
    description: 'Curated audio-reactive tunnel rendered through the adaptive GPU sandbox.',
    backends: ['webgpu', 'webgl2'],
    defaults: Object.freeze({ rings: 28, segments: 24 }),
    safety: Object.freeze({
      curated: true,
      generatedCode: false,
      remoteAssets: false,
      sandboxOnly: true
    })
  }
];

export const threeModuleCatalog = Object.freeze(
  THREE_MODULES.map((moduleDef) => Object.freeze({ ...moduleDef }))
);

export function getThreeModuleById(moduleId) {
  return threeModuleCatalog.find((moduleDef) => moduleDef.id === moduleId) || null;
}

export function validateThreeModuleForSandbox(moduleId) {
  const moduleDef = getThreeModuleById(moduleId);
  if (!moduleDef) return { ok: false, error: 'Unknown 3D module.' };
  if (moduleDef.lane !== THREE_RENDER_LANE || moduleDef.stage !== 'BASE_3D') {
    return { ok: false, error: '3D module must use the governed 3D base stage.' };
  }
  if (!moduleDef.safety.curated || !moduleDef.safety.sandboxOnly || moduleDef.safety.generatedCode) {
    return { ok: false, error: '3D module does not satisfy the curated sandbox policy.' };
  }
  return { ok: true, module: moduleDef };
}
