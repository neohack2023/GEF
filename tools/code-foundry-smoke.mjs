import { MODULE_STAGES, RENDER_LANES } from '../src/render/moduleRegistry.js';
import { validateGeneratedVisualArtifact } from '../src/slm/validators/generatedVisualArtifactValidator.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const safeArtifact = {
  schemaName: 'gef-generated-visual-artifact',
  schemaVersion: 1,
  lane: 'codeFoundry',
  runtime: 'canvas2d',
  renderLane: RENDER_LANES.CANVAS_2D,
  stage: MODULE_STAGES.OVERLAY,
  name: 'Smoke Grid Candidate',
  usedAudioSignals: ['bass', 'beat'],
  code: [
    'ctx.save();',
    'ctx.globalAlpha = 0.5 + audio.beat * 0.4;',
    'ctx.strokeStyle = `rgba(0,255,136,${0.2 + audio.bass * 0.5})`;',
    'for (let x = 0; x < w; x += 48) {',
    '  ctx.beginPath();',
    '  ctx.moveTo(x, 0);',
    '  ctx.lineTo(x + Math.sin(time + x * 0.01) * 20, h);',
    '  ctx.stroke();',
    '}',
    'ctx.restore();'
  ].join('\n'),
  notes: 'Safe smoke-test render body.'
};

const valid = validateGeneratedVisualArtifact(safeArtifact);
assert(valid.ok, `safe artifact should validate: ${valid.errors.join(' ')}`);
assert(valid.artifact.code.includes('ctx.save'), 'validated artifact should preserve code body.');

const blocked = validateGeneratedVisualArtifact({
  ...safeArtifact,
  code: 'fetch("https://example.com");\nctx.fillRect(0, 0, w, h);'
});
assert(!blocked.ok, 'artifact with network access must be rejected.');
assert(blocked.errors.some((error) => error.includes('fetch')), 'blocked artifact should mention fetch.');

const wrongLane = validateGeneratedVisualArtifact({
  ...safeArtifact,
  renderLane: '3d'
});
assert(!wrongLane.ok, 'non-Canvas2D render lane must be rejected.');

const planningOnlyStage = validateGeneratedVisualArtifact({
  ...safeArtifact,
  stage: MODULE_STAGES.PRE_BASE
});
assert(!planningOnlyStage.ok, 'PRE_BASE should remain known but disabled for generated artifacts.');

console.log('Code Foundry validator smoke checks passed.');
