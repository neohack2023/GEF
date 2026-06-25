import {
  buildModelStatusRows,
  getGefSlmModelPlan,
  parseOllamaList
} from '../scripts/setup/slm-setup.mjs';
import { SLM_LANE_IDS } from '../src/slm/slmLanes.js';

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

const parsed = parseOllamaList([
  'NAME                          ID              SIZE      MODIFIED',
  'llama3.2:3b                   abc123          2.0 GB    2 days ago',
  'qwen2.5-coder:3b              def456          1.9 GB    1 hour ago',
  ''
].join('\n'));

assert(parsed.includes('llama3.2:3b'), 'parseOllamaList should include llama3.2:3b.');
assert(parsed.includes('qwen2.5-coder:3b'), 'parseOllamaList should include qwen2.5-coder:3b.');
assert(!parsed.includes('NAME'), 'parseOllamaList should ignore the table header.');

const plan = getGefSlmModelPlan();
assert(plan.some((entry) => entry.laneId === SLM_LANE_IDS.LIGHT_HELPER && entry.required), 'Light helper model should be required.');
assert(plan.some((entry) => entry.laneId === SLM_LANE_IDS.CODE_FOUNDRY && entry.required), 'Code Foundry model should be required.');
assert(plan.some((entry) => entry.laneId === SLM_LANE_IDS.HEAVIER_CODE_REPAIR && !entry.required), 'Heavier repair model should be optional.');

const rows = buildModelStatusRows(parsed, plan);
const lightHelper = rows.find((entry) => entry.laneId === SLM_LANE_IDS.LIGHT_HELPER);
const codeFoundry = rows.find((entry) => entry.laneId === SLM_LANE_IDS.CODE_FOUNDRY);
const heavierRepair = rows.find((entry) => entry.laneId === SLM_LANE_IDS.HEAVIER_CODE_REPAIR);

assert(lightHelper.installed, 'Installed light helper should be marked installed.');
assert(codeFoundry.installed, 'Installed Code Foundry should be marked installed.');
assert(!heavierRepair.installed, 'Missing heavier repair model should be marked missing.');
assert(heavierRepair.status === 'missing optional', 'Missing heavier repair should be optional.');

console.log('SLM setup menu smoke checks passed.');
