export const DEFAULT_LOCAL_SLM_ENDPOINT = 'http://localhost:11434';

export const SLM_LANE_IDS = Object.freeze({
  LIGHT_HELPER: 'lightHelper',
  CODE_FOUNDRY: 'codeFoundry',
  HEAVIER_CODE_REPAIR: 'heavierCodeRepair'
});

export const SLM_LANES = Object.freeze({
  [SLM_LANE_IDS.LIGHT_HELPER]: Object.freeze({
    id: SLM_LANE_IDS.LIGHT_HELPER,
    label: 'Light helper',
    provider: 'ollama',
    model: 'llama3.2:3b',
    endpoint: DEFAULT_LOCAL_SLM_ENDPOINT,
    canGenerateVisualCode: false,
    canPromoteToMain: false,
    purpose: Object.freeze([
      'prompt_rewrite',
      'idea_routing',
      'feedback_summary',
      'memory_distillation',
      'curated_module_suggestion'
    ])
  }),

  [SLM_LANE_IDS.CODE_FOUNDRY]: Object.freeze({
    id: SLM_LANE_IDS.CODE_FOUNDRY,
    label: 'Code foundry',
    provider: 'ollama',
    model: 'qwen2.5-coder:3b',
    endpoint: DEFAULT_LOCAL_SLM_ENDPOINT,
    canGenerateVisualCode: true,
    canPromoteToMain: false,
    purpose: Object.freeze([
      'canvas2d_module_generation',
      'code_linting',
      'syntax_repair',
      'runtime_repair',
      'retry_generation'
    ]),
    requiredPipeline: Object.freeze([
      'prompt',
      'generate_artifact',
      'validate_static_policy',
      'compile_smoke_test',
      'runtime_smoke_test',
      'repair_retry',
      'sandbox_preview',
      'user_promotion'
    ])
  }),

  [SLM_LANE_IDS.HEAVIER_CODE_REPAIR]: Object.freeze({
    id: SLM_LANE_IDS.HEAVIER_CODE_REPAIR,
    label: 'Heavier code repair',
    provider: 'ollama',
    model: 'qwen2.5-coder:7b',
    endpoint: DEFAULT_LOCAL_SLM_ENDPOINT,
    canGenerateVisualCode: true,
    canPromoteToMain: false,
    optional: true,
    purpose: Object.freeze([
      'deeper_code_repair',
      'shader_reasoning',
      'complex_visual_module_generation'
    ])
  })
});

export function getSlmLane(laneId = SLM_LANE_IDS.LIGHT_HELPER) {
  return SLM_LANES[laneId] || SLM_LANES[SLM_LANE_IDS.LIGHT_HELPER];
}

export function getDefaultSlmModel(laneId = SLM_LANE_IDS.LIGHT_HELPER) {
  return getSlmLane(laneId).model;
}

export function getActiveSlmInstallCommands() {
  return [
    `ollama pull ${SLM_LANES[SLM_LANE_IDS.LIGHT_HELPER].model}`,
    `ollama pull ${SLM_LANES[SLM_LANE_IDS.CODE_FOUNDRY].model}`
  ];
}
