import assert from 'node:assert/strict';
import {
  BASS_TUNNEL_LIMITS,
  createBassTunnelVertices,
  createTunnelUniforms
} from '../src/render/threeSceneGeometry.js';
import {
  getThreeModuleById,
  validateThreeModuleForSandbox
} from '../src/render/threeModuleRegistry.js';
import { Adaptive3dRuntime } from '../src/render/adaptive3dRuntime.js';

function createFakeCanvas() {
  return {
    width: 300,
    height: 150,
    hidden: true,
    dataset: {},
    cloneNode() {
      return createFakeCanvas();
    },
    replaceWith() {}
  };
}

const moduleDef = getThreeModuleById('bassTunnel3d');
assert.equal(moduleDef?.lane, '3d');
assert.equal(moduleDef?.stage, 'BASE_3D');
assert.equal(moduleDef?.safety.sandboxOnly, true);
assert.equal(moduleDef?.safety.generatedCode, false);
assert.equal(validateThreeModuleForSandbox('bassTunnel3d').ok, true);
assert.equal(validateThreeModuleForSandbox('provider-output').ok, false);

const vertices = createBassTunnelVertices({ rings: 999, segments: 999 });
const expectedFloats = BASS_TUNNEL_LIMITS.rings * BASS_TUNNEL_LIMITS.segments * 2 * 2;
assert.equal(vertices.length, expectedFloats);
assert.equal(vertices.every(Number.isFinite), true);

const uniforms = createTunnelUniforms(1920, 1080, Number.NaN, {
  bass: 0.7,
  mid: Number.NaN,
  treble: 0.4,
  glitch: 0.2,
  rms: 0.5,
  beat: 1
});
assert.equal(uniforms.length, 8);
assert.equal(uniforms.every(Number.isFinite), true);

let releaseInitialization;
let pendingDisposed = false;
const initializationGate = new Promise((resolve) => {
  releaseInitialization = resolve;
});
const cancellableRuntime = new Adaptive3dRuntime(createFakeCanvas(), {
  runtimeFactories: {
    webgpu: (canvas) => ({
      canvas,
      init: () => initializationGate,
      render() {},
      dispose() { pendingDisposed = true; }
    })
  }
});
const pendingPreview = cancellableRuntime.preview('bassTunnel3d', 'webgpu');
await Promise.resolve();
assert.equal(cancellableRuntime.getStatus().initializing, true);
cancellableRuntime.deactivate();
releaseInitialization();
const cancelledPreview = await pendingPreview;
assert.equal(cancelledPreview.cancelled, true);
assert.equal(pendingDisposed, true);
assert.equal(cancellableRuntime.getStatus().active, false);
assert.equal(cancellableRuntime.getStatus().initializing, false);

let triggerLoss;
let deactivationReceipt = null;
const lossRuntime = new Adaptive3dRuntime(createFakeCanvas(), {
  onDeactivated: (receipt) => { deactivationReceipt = receipt; },
  runtimeFactories: {
    webgl2: (_canvas, { onLost }) => ({
      async init() { triggerLoss = onLost; },
      render() {},
      dispose() {}
    })
  }
});
assert.equal((await lossRuntime.preview('bassTunnel3d', 'webgl2')).ok, true);
triggerLoss('simulated context loss');
assert.equal(deactivationReceipt?.reason, 'backend-lost');
assert.equal(lossRuntime.getStatus().active, false);

console.log('3D runtime contract smoke passed.');
