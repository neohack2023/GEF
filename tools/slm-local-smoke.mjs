import { getModuleCatalog } from '../src/render/moduleRegistry.js';
import {
  listOllamaModels,
  requestOllamaGeneratedVisualArtifact,
  requestOllamaModuleSuggestion
} from '../src/slm/providers/ollamaProvider.js';
import { DEFAULT_LOCAL_SLM_ENDPOINT, SLM_LANES, SLM_LANE_IDS } from '../src/slm/slmLanes.js';
import { validateGeneratedVisualArtifact } from '../src/slm/validators/generatedVisualArtifactValidator.js';
import { validateModuleSuggestion } from '../src/slm/validators/moduleSuggestionValidator.js';

const endpoint = process.env.GEF_SLM_ENDPOINT || DEFAULT_LOCAL_SLM_ENDPOINT;

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function modelName(model) {
  return model?.name || model?.model || '';
}

function hasModel(models, expected) {
  return models.some((model) => modelName(model) === expected);
}

function names(models) {
  return models.map(modelName).filter(Boolean).join(', ') || '(none returned)';
}

async function verifyModels() {
  console.log(`Checking local Ollama at ${endpoint}`);
  const models = await listOllamaModels({ endpoint });
  console.log(`Installed models: ${names(models)}`);

  const lightHelper = SLM_LANES[SLM_LANE_IDS.LIGHT_HELPER];
  const codeFoundry = SLM_LANES[SLM_LANE_IDS.CODE_FOUNDRY];
  const heavierRepair = SLM_LANES[SLM_LANE_IDS.HEAVIER_CODE_REPAIR];

  for (const lane of [lightHelper, codeFoundry]) {
    assert(hasModel(models, lane.model), `Missing ${lane.label}: run ollama pull ${lane.model}`);
    console.log(`OK ${lane.label}: ${lane.model}`);
  }

  console.log(hasModel(models, heavierRepair.model)
    ? `OK optional ${heavierRepair.label}: ${heavierRepair.model}`
    : `Optional model not installed: ${heavierRepair.model}`);
}

async function checkCuratedSuggestion() {
  const lane = SLM_LANES[SLM_LANE_IDS.LIGHT_HELPER];
  const modules = getModuleCatalog();
  console.log(`Checking curated suggestion with ${lane.model}`);

  const result = await requestOllamaModuleSuggestion({
    endpoint,
    model: lane.model,
    stage: 'OVERLAY',
    modules,
    userPrompt: 'Choose one existing curated GEF overlay module for a clean audio reactive grid. Return JSON only.'
  });

  const validation = validateModuleSuggestion(result.data, modules);
  assert(validation.ok, `Curated suggestion validation failed: ${validation.errors.join(' ')}`);
  console.log(`OK curated suggestion: ${validation.suggestion.moduleId}`);
}

async function checkCodeFoundryArtifact() {
  const lane = SLM_LANES[SLM_LANE_IDS.CODE_FOUNDRY];
  console.log(`Checking Code Foundry artifact with ${lane.model}`);

  const result = await requestOllamaGeneratedVisualArtifact({
    endpoint,
    model: lane.model,
    stage: 'OVERLAY',
    diagnostics: 'Local SLM smoke check.',
    priorCode: '',
    userPrompt: 'Draft a bounded Canvas2D overlay body for a bass reactive ring lattice. Return JSON only.'
  });

  const validation = validateGeneratedVisualArtifact(result.data);
  assert(validation.ok, `Code Foundry validation failed: ${validation.errors.join(' ')}`);
  console.log(`OK Code Foundry artifact: ${validation.artifact.name}`);
}

async function main() {
  console.log('GEF local SLM smoke runner');
  console.log('Uses live local Ollama responses and validators. It does not preview or promote output.');
  await verifyModels();
  await checkCuratedSuggestion();
  await checkCodeFoundryArtifact();
  console.log('Local SLM smoke passed.');
}

main().catch((error) => {
  console.error(`Local SLM smoke failed: ${error.message || error}`);
  process.exitCode = 1;
});
