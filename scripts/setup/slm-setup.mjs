import { execFile, spawn } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import { fileURLToPath } from 'node:url';
import { SLM_LANES, SLM_LANE_IDS } from '../../src/slm/slmLanes.js';

export const OLLAMA_DOWNLOAD_URL = 'https://ollama.com/download';
export const OLLAMA_MODEL_LIBRARY_URL = 'https://ollama.com/library';

function execFileText(command, args = [], options = {}) {
  return new Promise((resolve) => {
    execFile(command, args, { windowsHide: true, timeout: 8000, ...options }, (error, stdout, stderr) => {
      resolve({
        ok: !error,
        stdout: String(stdout || ''),
        stderr: String(stderr || ''),
        error
      });
    });
  });
}

export function parseOllamaList(stdout) {
  return String(stdout || '')
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .filter((line) => !line.toLowerCase().startsWith('name '))
    .map((line) => line.split(/\s+/)[0])
    .filter(Boolean);
}

export function getGefSlmModelPlan() {
  return [
    {
      laneId: SLM_LANE_IDS.LIGHT_HELPER,
      label: SLM_LANES[SLM_LANE_IDS.LIGHT_HELPER].label,
      model: SLM_LANES[SLM_LANE_IDS.LIGHT_HELPER].model,
      required: true,
      reason: 'curated-module suggestions, prompt routing, and lightweight helper work'
    },
    {
      laneId: SLM_LANE_IDS.CODE_FOUNDRY,
      label: SLM_LANES[SLM_LANE_IDS.CODE_FOUNDRY].label,
      model: SLM_LANES[SLM_LANE_IDS.CODE_FOUNDRY].model,
      required: true,
      reason: 'Code Foundry Canvas2D artifact drafting and repair'
    },
    {
      laneId: SLM_LANE_IDS.HEAVIER_CODE_REPAIR,
      label: SLM_LANES[SLM_LANE_IDS.HEAVIER_CODE_REPAIR].label,
      model: SLM_LANES[SLM_LANE_IDS.HEAVIER_CODE_REPAIR].model,
      required: false,
      reason: 'optional deeper repair lane for heavier code experiments'
    }
  ];
}

export function buildModelStatusRows(installedModels, modelPlan = getGefSlmModelPlan()) {
  const installed = new Set(installedModels);
  return modelPlan.map((entry) => ({
    ...entry,
    installed: installed.has(entry.model),
    status: installed.has(entry.model) ? 'installed' : entry.required ? 'missing required' : 'missing optional'
  }));
}

function printDivider() {
  console.log('\n' + '='.repeat(72));
}

function printHeader(title) {
  printDivider();
  console.log(`GEF Local SLM Setup · ${title}`);
  printDivider();
}

function printModelStatus(rows) {
  console.log('\nGEF SLM lanes:');
  for (const row of rows) {
    const marker = row.installed ? 'OK' : row.required ? 'MISSING' : 'OPTIONAL';
    console.log(`- [${marker}] ${row.model} · ${row.label}`);
    console.log(`  ${row.reason}`);
  }
}

async function commandExists(command) {
  const checker = process.platform === 'win32'
    ? await execFileText('where', [command])
    : await execFileText('sh', ['-lc', `command -v ${command}`]);
  return checker.ok;
}

async function getOllamaVersion() {
  const result = await execFileText('ollama', ['--version']);
  return result.ok ? result.stdout.trim() || 'ollama installed' : null;
}

async function getInstalledModels() {
  const result = await execFileText('ollama', ['list']);
  if (!result.ok) {
    return {
      ok: false,
      models: [],
      message: result.stderr.trim() || result.stdout.trim() || 'Ollama is installed but the local service did not respond.'
    };
  }

  return {
    ok: true,
    models: parseOllamaList(result.stdout),
    message: ''
  };
}

async function pullModel(model) {
  console.log(`\nPulling ${model}...`);
  await new Promise((resolve, reject) => {
    const child = spawn('ollama', ['pull', model], { stdio: 'inherit', shell: false });
    child.on('error', reject);
    child.on('close', (code) => {
      if (code === 0) resolve();
      else reject(new Error(`ollama pull ${model} exited with code ${code}`));
    });
  });
}

async function openUrl(url) {
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', '', url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }

  if (process.platform === 'darwin') {
    spawn('open', [url], { detached: true, stdio: 'ignore' }).unref();
    return;
  }

  spawn('xdg-open', [url], { detached: true, stdio: 'ignore' }).unref();
}

function openOllamaServerWindow() {
  if (process.platform === 'win32') {
    spawn('cmd', ['/c', 'start', 'GEF Ollama Server', 'cmd', '/k', 'ollama serve'], {
      detached: true,
      stdio: 'ignore'
    }).unref();
    console.log('Opened a new Command Prompt window running: ollama serve');
    return;
  }

  console.log('Start Ollama in another terminal with: ollama serve');
}

async function promptChoice(rl, prompt) {
  const answer = await rl.question(prompt);
  return answer.trim().toLowerCase();
}

async function missingOllamaMenu(rl) {
  while (true) {
    printHeader('Ollama not found');
    console.log('The ollama command was not found on PATH.');
    console.log(`Download page: ${OLLAMA_DOWNLOAD_URL}`);
    console.log('\nMenu:');
    console.log('1) Open Ollama download page');
    console.log('2) Print install/download link');
    console.log('3) Re-check after installing');
    console.log('0) Exit');

    const choice = await promptChoice(rl, '\nChoose: ');
    if (choice === '1') await openUrl(OLLAMA_DOWNLOAD_URL);
    if (choice === '2') console.log(`\nInstall Ollama from: ${OLLAMA_DOWNLOAD_URL}`);
    if (choice === '3') return 'recheck';
    if (choice === '0') return 'exit';
  }
}

async function installedOllamaMenu(rl, version) {
  while (true) {
    printHeader('Ollama model check');
    console.log(version);

    const listResult = await getInstalledModels();
    if (!listResult.ok) {
      console.log('\nOllama command exists, but the local service did not answer.');
      console.log(listResult.message);
      console.log('\nMenu:');
      console.log('1) Open a new Command Prompt running ollama serve');
      console.log('2) Re-check service/models');
      console.log('3) Open Ollama download page');
      console.log('0) Exit');

      const choice = await promptChoice(rl, '\nChoose: ');
      if (choice === '1') openOllamaServerWindow();
      if (choice === '2') continue;
      if (choice === '3') await openUrl(OLLAMA_DOWNLOAD_URL);
      if (choice === '0') return;
      continue;
    }

    const rows = buildModelStatusRows(listResult.models);
    const missingRequired = rows.filter((row) => row.required && !row.installed);
    const missingOptional = rows.filter((row) => !row.required && !row.installed);
    printModelStatus(rows);

    console.log('\nMenu:');
    console.log('1) Pull missing required GEF models');
    console.log('2) Pull optional heavier repair model');
    console.log('3) Re-check installed models');
    console.log('4) Open Ollama model library');
    console.log('5) Show exact pull commands');
    console.log('0) Exit');

    const choice = await promptChoice(rl, '\nChoose: ');

    if (choice === '1') {
      if (!missingRequired.length) {
        console.log('\nAll required GEF models are already installed.');
      }
      for (const row of missingRequired) {
        await pullModel(row.model);
      }
    }

    if (choice === '2') {
      if (!missingOptional.length) {
        console.log('\nOptional repair model is already installed.');
      }
      for (const row of missingOptional) {
        await pullModel(row.model);
      }
    }

    if (choice === '3') continue;
    if (choice === '4') await openUrl(OLLAMA_MODEL_LIBRARY_URL);
    if (choice === '5') {
      console.log('\nRequired:');
      for (const row of rows.filter((entry) => entry.required)) console.log(`ollama pull ${row.model}`);
      console.log('\nOptional:');
      for (const row of rows.filter((entry) => !entry.required)) console.log(`ollama pull ${row.model}`);
    }
    if (choice === '0') return;
  }
}

export async function runSlmSetupMenu() {
  const rl = createInterface({ input, output });

  try {
    while (true) {
      const hasOllama = await commandExists('ollama');
      if (!hasOllama) {
        const result = await missingOllamaMenu(rl);
        if (result === 'recheck') continue;
        return;
      }

      const version = await getOllamaVersion();
      await installedOllamaMenu(rl, version || 'ollama installed');
      return;
    }
  } finally {
    rl.close();
  }
}

const executedDirectly = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (executedDirectly) {
  runSlmSetupMenu().catch((error) => {
    console.error(`\nGEF SLM setup failed: ${error.message || error}`);
    process.exitCode = 1;
  });
}
