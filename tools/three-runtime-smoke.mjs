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

console.log('3D runtime contract smoke passed.');
