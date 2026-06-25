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
  experimentLevel: 'medium',
  techniques: ['pseudo-3d', 'beat-bloom', 'gradient-field'],
  usedAudioSignals: ['bass', 'beat'],
  code: [
    'ctx.save();',
    'const cx = w * 0.5;',
    'const cy = h * 0.5;',
    'const pulse = 0.5 + audio.beat * 0.5;',
    'const gradient = ctx.createRadialGradient(cx, cy, 12, cx, cy, Math.max(w, h) * 0.6);',
    'gradient.addColorStop(0, `rgba(0,255,136,${0.2 + audio.bass * 0.5})`);',
    'gradient.addColorStop(1, "rgba(0,0,0,0)");',
    'ctx.fillStyle = gradient;',
    'ctx.fillRect(0, 0, w, h);',
    'ctx.globalAlpha = 0.5 + audio.beat * 0.4;',
    'ctx.strokeStyle = `rgba(0,255,136,${0.2 + audio.bass * 0.5})`;',
    'for (let x = 0; x < w; x += 48) {',
    '  ctx.beginPath();',
    '  ctx.moveTo(x, 0);',
    '  ctx.lineTo(x + Math.sin(time + x * 0.01) * 20 * pulse, h);',
    '  ctx.stroke();',
    '}',
    'ctx.restore();'
  ].join('\n'),
  fallbackPlan: 'Reduce to a simple bass-reactive grid if gradient bloom is too heavy.',
  notes: 'Safe smoke-test render body with experimental metadata.'
};

const valid = validateGeneratedVisualArtifact(safeArtifact);
assert(valid.ok, `safe artifact should validate: ${valid.errors.join(' ')}`);
assert(valid.artifact.code.includes('ctx.save'), 'validated artifact should preserve code body.');
assert(valid.artifact.experimentLevel === 'medium', 'validated artifact should preserve experimentLevel.');
assert(valid.artifact.techniques.includes('pseudo-3d'), 'validated artifact should preserve declared techniques.');
assert(valid.artifact.fallbackPlan.includes('simple'), 'validated artifact should preserve fallbackPlan.');

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

const noDrawing = validateGeneratedVisualArtifact({
  ...safeArtifact,
  code: 'const pulse = audio.beat + time;\nconst center = w * 0.5 + pulse;'
});
assert(!noDrawing.ok, 'artifact with no Canvas2D drawing operation must be rejected.');
assert(noDrawing.errors.some((error) => error.includes('drawing operation')), 'no-drawing artifact should explain the missing drawing operation.');

const badExperimentLevel = validateGeneratedVisualArtifact({
  ...safeArtifact,
  experimentLevel: 'unbounded-chaos'
});
assert(!badExperimentLevel.ok, 'unknown experimentLevel must be rejected.');

console.log('Code Foundry validator smoke checks passed.');
