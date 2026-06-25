import { RENDER_LANES, MODULE_STAGES, isKnownModuleStage } from '../../render/moduleRegistry.js';
import { validateGeneratedVisualCodePolicy } from './generatedVisualCodePolicy.js';

const VALID_SCHEMA_NAME = 'gef-generated-visual-artifact';
const VALID_RUNTIME = 'canvas2d';
const VALID_LANE = 'codeFoundry';
const VALID_EXPERIMENT_LEVELS = new Set(['safe', 'medium', 'wild']);
const VALID_GENERATED_STAGES = new Set([
  MODULE_STAGES.BASE,
  MODULE_STAGES.OVERLAY,
  MODULE_STAGES.POST_FX,
  MODULE_STAGES.FEEDBACK_PASS,
  MODULE_STAGES.UI_OVERLAY
]);

const DRAWING_PATTERNS = Object.freeze([
  'fillRect',
  'strokeRect',
  'clearRect',
  'beginPath',
  'arc',
  'ellipse',
  'lineTo',
  'moveTo',
  'bezierCurveTo',
  'quadraticCurveTo',
  'stroke',
  'fill',
  'drawImage',
  'createLinearGradient',
  'createRadialGradient',
  'fillText',
  'strokeText'
]);

function clampText(value, maxLength = 2000) {
  return String(value || '').trim().slice(0, maxLength);
}

function isObject(value) {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeStringArray(value, maxItems = 10, maxLength = 80) {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => clampText(item, maxLength))
    .filter(Boolean)
    .slice(0, maxItems);
}

function checkBalancedPairs(code) {
  const pairs = [
    ['(', ')', 'parentheses'],
    ['[', ']', 'brackets'],
    ['{', '}', 'braces']
  ];

  return pairs.flatMap(([open, close, name]) => {
    const opens = [...code].filter((char) => char === open).length;
    const closes = [...code].filter((char) => char === close).length;
    return opens === closes ? [] : [`Unbalanced ${name}: ${opens} ${open} vs ${closes} ${close}.`];
  });
}

function includesAnyPattern(code, patterns) {
  return patterns.some((pattern) => code.includes(pattern));
}

function checkFunctionalRenderBody(code) {
  const errors = [];
  const warnings = [];

  if (!/\bctx\s*\./.test(code)) {
    errors.push('code must use ctx drawing APIs.');
  }

  if (!/\b(w|h)\b/.test(code)) {
    warnings.push('code should reference canvas size w or h for responsive rendering.');
  }

  if (!/\b(time|audio)\b/.test(code)) {
    warnings.push('code should reference time or audio so it reacts instead of drawing a static stamp.');
  }

  if (!includesAnyPattern(code, DRAWING_PATTERNS)) {
    errors.push('code must include at least one recognizable Canvas2D drawing operation.');
  }

  const saveCount = (code.match(/\bctx\.save\s*\(/g) || []).length;
  const restoreCount = (code.match(/\bctx\.restore\s*\(/g) || []).length;
  if (saveCount !== restoreCount) {
    warnings.push(`ctx.save/restore count differs: ${saveCount} save call(s), ${restoreCount} restore call(s).`);
  }

  if (/for\s*\([^;]+;\s*;/.test(code) || /while\s*\(\s*true\s*\)/.test(code)) {
    errors.push('loops must have visible bounds.');
  }

  return { errors, warnings };
}

export function validateGeneratedVisualArtifact(candidate) {
  const errors = [];
  const warnings = [];

  if (!isObject(candidate)) {
    return {
      ok: false,
      errors: ['Generated visual artifact must be a JSON object.'],
      warnings,
      artifact: null,
      policy: validateGeneratedVisualCodePolicy('')
    };
  }

  if (candidate.schemaName !== VALID_SCHEMA_NAME) {
    errors.push(`schemaName must be ${VALID_SCHEMA_NAME}.`);
  }

  if (candidate.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1.');
  }

  const lane = clampText(candidate.lane, 80);
  if (lane !== VALID_LANE) {
    errors.push(`lane must be ${VALID_LANE}.`);
  }

  const runtime = clampText(candidate.runtime, 80);
  if (runtime !== VALID_RUNTIME) {
    errors.push(`runtime must be ${VALID_RUNTIME}.`);
  }

  const renderLane = clampText(candidate.renderLane || RENDER_LANES.CANVAS_2D, 80);
  if (renderLane !== RENDER_LANES.CANVAS_2D) {
    errors.push('renderLane must stay canvas2d for this validator.');
  }

  const stage = clampText(candidate.stage, 80);
  if (!isKnownModuleStage(stage)) {
    errors.push('stage must be a known GEF stage.');
  } else if (!VALID_GENERATED_STAGES.has(stage)) {
    errors.push('stage is known but not enabled for generated Canvas2D artifacts yet.');
  }

  const name = clampText(candidate.name, 120);
  if (!name) {
    errors.push('name is required.');
  }

  const experimentLevel = clampText(candidate.experimentLevel || 'medium', 40);
  if (!VALID_EXPERIMENT_LEVELS.has(experimentLevel)) {
    errors.push('experimentLevel must be safe, medium, or wild.');
  }

  const techniques = normalizeStringArray(candidate.techniques, 12, 60);
  if (!techniques.length) {
    warnings.push('Artifact did not declare experimental techniques.');
  }

  const code = clampText(candidate.code, 10000);
  if (!code) {
    errors.push('code is required.');
  }

  if (/```/.test(code)) {
    errors.push('code must not include markdown fences.');
  }

  if (/\bfunction\b|=>|\breturn\b/.test(code)) {
    warnings.push('Artifact should be a render-function body only, not a full function declaration.');
  }

  const balanceWarnings = checkBalancedPairs(code);
  warnings.push(...balanceWarnings);

  const functional = checkFunctionalRenderBody(code);
  errors.push(...functional.errors);
  warnings.push(...functional.warnings);

  const policy = validateGeneratedVisualCodePolicy(code);
  if (!policy.ok) {
    errors.push(policy.message);
  }

  const usedAudioSignals = normalizeStringArray(candidate.usedAudioSignals, 12, 40);
  const fallbackPlan = clampText(candidate.fallbackPlan, 500);
  const notes = clampText(candidate.notes, 1000);

  if (!usedAudioSignals.length) {
    warnings.push('Artifact did not declare usedAudioSignals.');
  }

  if (!fallbackPlan) {
    warnings.push('Artifact should include a fallbackPlan for simpler repair if the experiment is rejected.');
  }

  if (errors.length) {
    return {
      ok: false,
      errors,
      warnings,
      artifact: null,
      policy
    };
  }

  return {
    ok: true,
    errors,
    warnings,
    artifact: {
      schemaName: VALID_SCHEMA_NAME,
      schemaVersion: 1,
      lane: VALID_LANE,
      runtime: VALID_RUNTIME,
      renderLane,
      stage,
      name,
      experimentLevel,
      techniques,
      usedAudioSignals,
      code,
      fallbackPlan,
      notes
    },
    policy
  };
}
