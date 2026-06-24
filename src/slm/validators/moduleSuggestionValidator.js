import { MODULE_STAGES, isKnownModuleStage } from '../../render/moduleRegistry.js';

const VALID_SCHEMA_NAME = 'gef-module-suggestion';

function clampText(value, maxLength = 420) {
  return String(value || '').trim().slice(0, maxLength);
}

function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

export function validateModuleSuggestion(candidate, moduleCatalog) {
  const errors = [];
  const diagnostics = [];

  if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) {
    return { ok: false, errors: ['Suggestion must be a JSON object.'], diagnostics, suggestion: null };
  }

  if (candidate.schemaName !== VALID_SCHEMA_NAME) {
    errors.push(`schemaName must be ${VALID_SCHEMA_NAME}.`);
  }

  if (candidate.schemaVersion !== 1) {
    errors.push('schemaVersion must be 1.');
  }

  const moduleId = clampText(candidate.moduleId, 80);
  const module = moduleCatalog.find((item) => item.id === moduleId);
  if (!module) {
    errors.push('moduleId must match a curated visual module.');
  }

  const stage = clampText(candidate.stage, 40);
  if (!isKnownModuleStage(stage)) {
    errors.push('stage must be a known GEF stage.');
  }

  if (module && stage && module.stage !== stage) {
    errors.push(`stage must match curated module stage ${module.stage}.`);
  }

  if (!isFiniteNumber(candidate.confidence) || candidate.confidence < 0 || candidate.confidence > 1) {
    errors.push('confidence must be a number from 0 to 1.');
  }

  const reason = clampText(candidate.reason, 420);
  if (!reason) {
    errors.push('reason is required.');
  }

  if (module && module.stage === MODULE_STAGES.BASE) {
    diagnostics.push('Base replacement suggestions should remain sandbox-only until user promotion.');
  }

  if (errors.length) {
    return { ok: false, errors, diagnostics, suggestion: null };
  }

  return {
    ok: true,
    errors,
    diagnostics,
    suggestion: {
      schemaName: VALID_SCHEMA_NAME,
      schemaVersion: 1,
      moduleId,
      moduleName: module.name,
      stage,
      confidence: candidate.confidence,
      reason
    }
  };
}
