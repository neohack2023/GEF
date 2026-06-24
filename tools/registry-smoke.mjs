import {
  MODULE_STAGES,
  RENDER_LANES,
  VALID_MODULE_STAGES,
  VALID_RENDER_LANES,
  getModuleById,
  getModuleCatalog,
  getModuleRender,
  getModulesByLane,
  getModulesByStage,
  isBaseStage,
  isKnownModuleId,
  isKnownModuleStage,
  moduleCatalog,
  moduleRegistry,
  validateModuleStage
} from '../src/render/moduleRegistry.js';
import { validateModuleSuggestion } from '../src/slm/validators/moduleSuggestionValidator.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function assertEqual(actual, expected, message) {
  if (actual !== expected) {
    throw new Error(`${message} Expected ${expected}, got ${actual}.`);
  }
}

function assertRegistryShape() {
  assert(Array.isArray(moduleRegistry), 'moduleRegistry must be an array.');
  assert(moduleRegistry.length > 0, 'moduleRegistry must contain at least one curated module.');
  assertEqual(moduleRegistry.length, moduleCatalog.length, 'registry and catalog counts must match.');

  const ids = new Set();

  for (const moduleDef of moduleRegistry) {
    assert(moduleDef && typeof moduleDef === 'object', 'each registry entry must be an object.');
    assert(typeof moduleDef.id === 'string' && moduleDef.id.length > 0, 'each registry entry needs an id.');
    assert(!ids.has(moduleDef.id), `module id must be unique: ${moduleDef.id}.`);
    ids.add(moduleDef.id);

    assert(typeof moduleDef.name === 'string' && moduleDef.name.length > 0, `${moduleDef.id} needs a name.`);
    assert(VALID_MODULE_STAGES.includes(moduleDef.stage), `${moduleDef.id} has an unknown stage.`);
    assert(VALID_RENDER_LANES.includes(moduleDef.lane), `${moduleDef.id} has an unknown render lane.`);
    assert(typeof moduleDef.render === 'function', `${moduleDef.id} must expose a trusted render function.`);
    assert(isKnownModuleId(moduleDef.id), `${moduleDef.id} must be discoverable by id.`);
    assert(isKnownModuleStage(moduleDef.stage), `${moduleDef.stage} must be a known stage.`);
    assertEqual(getModuleById(moduleDef.id), moduleDef, `${moduleDef.id} lookup should return the registry object.`);
    assertEqual(getModuleRender(moduleDef.id), moduleDef.render, `${moduleDef.id} render lookup should return the render function.`);
    assert(validateModuleStage(moduleDef.id, moduleDef.stage), `${moduleDef.id} should validate against its own stage.`);
  }
}

function assertCatalogIsMetadataOnly() {
  const catalogCopy = getModuleCatalog();

  assert(Array.isArray(catalogCopy), 'getModuleCatalog must return an array.');
  assert(catalogCopy !== moduleCatalog, 'getModuleCatalog must return a copy of the catalog array.');

  for (const catalogEntry of catalogCopy) {
    assert(!('render' in catalogEntry), `${catalogEntry.id} catalog entry must not expose render.`);
    assert(getModuleById(catalogEntry.id), `${catalogEntry.id} catalog entry must map to a registry module.`);
  }
}

function assertLaneAndStageFilters() {
  const canvasModules = getModulesByLane(RENDER_LANES.CANVAS_2D);
  const baseModules = getModulesByStage(MODULE_STAGES.BASE);

  assert(canvasModules.length > 0, 'Canvas2D lane should have curated modules.');
  assert(baseModules.length > 0, 'Base stage should have at least one module.');
  assert(isBaseStage(MODULE_STAGES.BASE), 'BASE should be treated as a base stage.');
  assert(isBaseStage(MODULE_STAGES.BASE_3D), 'BASE_3D should be treated as a base stage.');
}

function assertSuggestionValidation() {
  const modules = getModuleCatalog();
  const firstModule = modules[0];

  const validSuggestion = validateModuleSuggestion(
    {
      schemaName: 'gef-module-suggestion',
      schemaVersion: 1,
      moduleId: firstModule.id,
      stage: firstModule.stage,
      confidence: 0.8,
      reason: 'Registry smoke validation.'
    },
    modules
  );

  assert(validSuggestion.ok, `valid suggestion should pass: ${validSuggestion.errors.join(' ')}`);
  assertEqual(validSuggestion.suggestion.moduleId, firstModule.id, 'validated suggestion should preserve module id.');

  const unknownModule = validateModuleSuggestion(
    {
      schemaName: 'gef-module-suggestion',
      schemaVersion: 1,
      moduleId: 'unknownModule',
      stage: firstModule.stage,
      confidence: 0.8,
      reason: 'Registry smoke validation.'
    },
    modules
  );

  assert(!unknownModule.ok, 'unknown module suggestions must be rejected.');

  const stageMismatch = validateModuleSuggestion(
    {
      schemaName: 'gef-module-suggestion',
      schemaVersion: 1,
      moduleId: firstModule.id,
      stage: MODULE_STAGES.POST_FX,
      confidence: 0.8,
      reason: 'Registry smoke validation.'
    },
    modules
  );

  if (firstModule.stage !== MODULE_STAGES.POST_FX) {
    assert(!stageMismatch.ok, 'stage mismatch suggestions must be rejected.');
  }
}

assertRegistryShape();
assertCatalogIsMetadataOnly();
assertLaneAndStageFilters();
assertSuggestionValidation();

console.log(`Registry smoke checks passed for ${moduleRegistry.length} curated modules.`);
