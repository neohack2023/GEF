import { readFile, writeFile } from 'node:fs/promises';

const [filesPath = 'pr-files.json', checkLogPath = 'pr-check-output.log'] = process.argv.slice(2);
const files = await readJson(filesPath, []);
const checkLog = await readFile(checkLogPath, 'utf8').catch(() => '');
const event = await readJson(process.env.GITHUB_EVENT_PATH, {});
const pr = event.pull_request ?? {};

const env = process.env;
const repo = env.GITHUB_REPOSITORY ?? 'unknown/repository';
const serverUrl = env.GITHUB_SERVER_URL ?? 'https://github.com';
const runUrl = `${serverUrl}/${repo}/actions/runs/${env.GITHUB_RUN_ID ?? ''}`;
const headSha = pr.head?.sha ?? env.GITHUB_SHA ?? 'unknown';
const baseRef = pr.base?.ref ?? 'unknown';
const headRef = pr.head?.ref ?? 'unknown';
const checkStatus = env.PR_HANDOFF_CHECK_STATUS ?? 'unknown';

const normalizedFiles = files.map(normalizeFileRecord);
const docsTouched = normalizedFiles.filter((file) => isDocsFile(file.filename));
const codeTouched = normalizedFiles.filter((file) => !isDocsFile(file.filename));
const safetySignals = collectSafetySignals(normalizedFiles);
const checklist = buildChecklist({ normalizedFiles, docsTouched, codeTouched, safetySignals });
const changedFileTable = buildChangedFileTable(normalizedFiles);
const safetyTable = buildSafetyTable(safetySignals);
const docsSummary = buildDocsSummary(docsTouched, codeTouched);
const checkSummary = summarizeCheck(checkStatus, checkLog);

const body = [
  '<!-- gef-pr-handoff -->',
  '',
  '# GEF PR handoff packet',
  '',
  'This packet is generated for solo-dev and LLM-assisted review. It is a map, not an approval stamp.',
  '',
  '## PR context',
  '',
  `- PR: ${pr.number ? `#${pr.number}` : 'unknown'}`,
  `- Title: ${pr.title ?? 'unknown'}`,
  `- Base: \`${baseRef}\``,
  `- Head: \`${headRef}\``,
  `- Head commit: \`${headSha}\``,
  `- Workflow run: ${env.GITHUB_RUN_ID ? `[${env.GITHUB_RUN_ID}](${runUrl})` : 'unknown'}`,
  '',
  '## Tests run by this handoff rail',
  '',
  checkSummary,
  '',
  '## Changed files',
  '',
  changedFileTable,
  '',
  '## Docs touched',
  '',
  docsSummary,
  '',
  '## Safety-sensitive areas',
  '',
  safetyTable,
  '',
  '## Reviewer checklist',
  '',
  checklist.map((item) => `- [ ] ${item}`).join('\n'),
  '',
  '## LLM repair/review prompt seed',
  '',
  '```text',
  buildPromptSeed({ normalizedFiles, safetySignals, checkStatus }),
  '```',
  ''
].join('\n');

await writeFile('pr-handoff.md', body, 'utf8');

function normalizeFileRecord(file) {
  return {
    filename: file.filename ?? file.path ?? 'unknown',
    status: file.status ?? 'modified',
    additions: Number(file.additions ?? 0),
    deletions: Number(file.deletions ?? 0),
    changes: Number(file.changes ?? 0)
  };
}

async function readJson(path, fallback) {
  if (!path) return fallback;
  try {
    return JSON.parse(await readFile(path, 'utf8'));
  } catch {
    return fallback;
  }
}

function isDocsFile(filename) {
  return filename === 'README.md' || filename.startsWith('docs/') || filename.endsWith('.md');
}

function collectSafetySignals(files) {
  const rules = [
    {
      label: 'Runtime/render lane',
      reason: 'Canvas, module stack, boot flow, or browser behavior may need smoke testing.',
      match: (name) => name === 'index.html' || name === 'src/app.js' || name.startsWith('src/render/')
    },
    {
      label: 'Audio/media lane',
      reason: 'Analyzer, microphone, upload, recording, or media fallback behavior may need browser checks.',
      match: (name) => name.startsWith('src/audio/') || name === 'index.html'
    },
    {
      label: 'Storage/import lane',
      reason: 'Preset, telemetry, JSONL, quarantine, or local data behavior may need import/export checks.',
      match: (name) => name.startsWith('src/storage/') || name.includes('DATASET') || name.includes('MEMORY')
    },
    {
      label: 'Provider/autopilot boundary',
      reason: 'Model/provider suggestions must stay validated, sandboxed, and user-promoted.',
      match: (name) => name.startsWith('src/foundry/') || name.startsWith('src/autopilot/') || name.includes('SLM') || name.includes('FEEDBACK')
    },
    {
      label: 'CI/workflow lane',
      reason: 'Automation changes should be checked for permissions, triggers, and handoff clarity.',
      match: (name) => name.startsWith('.github/workflows/') || name === 'package.json' || name.startsWith('tools/')
    },
    {
      label: 'Security docs/policy lane',
      reason: 'Security policy changes should stay aligned with the safe-foundation rule.',
      match: (name) => name.includes('SECURITY')
    }
  ];

  return rules
    .map((rule) => ({
      label: rule.label,
      reason: rule.reason,
      files: files.filter((file) => rule.match(file.filename)).map((file) => file.filename)
    }))
    .filter((signal) => signal.files.length > 0);
}

function buildChangedFileTable(files) {
  if (!files.length) return 'No changed files were reported by the GitHub API.';

  return [
    '| File | Status | + | - |',
    '| --- | --- | ---: | ---: |',
    ...files.map((file) => `| \`${escapeMarkdown(file.filename)}\` | ${file.status} | ${file.additions} | ${file.deletions} |`)
  ].join('\n');
}

function buildDocsSummary(docsTouched, codeTouched) {
  if (docsTouched.length) {
    return [
      `Docs changed: ${docsTouched.length}.`,
      '',
      ...docsTouched.map((file) => `- \`${file.filename}\``),
      '',
      codeTouched.length
        ? 'Code also changed, so confirm docs still match behavior.'
        : 'Docs-only change, so confirm examples and links still match current repo behavior.'
    ].join('\n');
  }

  if (codeTouched.length) {
    return 'No docs changed. Reviewer should decide whether README, docs index, testing notes, or security notes need a matching update.';
  }

  return 'No docs or code changes were reported.';
}

function buildSafetyTable(signals) {
  if (!signals.length) return 'No safety-sensitive path groups were detected by this heuristic.';

  return [
    '| Area | Why it matters | Files |',
    '| --- | --- | --- |',
    ...signals.map((signal) => (
      `| ${signal.label} | ${signal.reason} | ${signal.files.map((file) => `\`${escapeMarkdown(file)}\``).join('<br>')} |`
    ))
  ].join('\n');
}

function buildChecklist({ normalizedFiles, docsTouched, codeTouched, safetySignals }) {
  const items = [
    'Confirm the PR has a narrow purpose and does not bundle unrelated reactor-room wiring.',
    'Review changed files against the project rule: Models may suggest. Validators decide. Users promote.',
    'Confirm `npm run check` result above matches the separate Node CI result.'
  ];

  const labels = new Set(safetySignals.map((signal) => signal.label));

  if (labels.has('Runtime/render lane')) {
    items.push('Smoke test boot, main canvas render, sandbox toggle, and panic reset.');
  }

  if (labels.has('Audio/media lane')) {
    items.push('Check media upload, microphone denial/unavailable messaging, and recording fallback behavior where relevant.');
  }

  if (labels.has('Storage/import lane')) {
    items.push('Test preset save/load/delete and JSONL import/export, including bad-line reporting and quarantine state.');
  }

  if (labels.has('Provider/autopilot boundary')) {
    items.push('Verify provider/model output remains suggestion-only until schema validation, sandbox preview, and user promotion.');
  }

  if (labels.has('CI/workflow lane')) {
    items.push('Review workflow permissions, event triggers, artifacts, and whether failure output is useful for repair.');
  }

  if (labels.has('Security docs/policy lane')) {
    items.push('Confirm security docs still match implementation and do not promise protections that are not built yet.');
  }

  if (!docsTouched.length && codeTouched.length) {
    items.push('Decide whether docs need an update for the changed behavior.');
  }

  if (normalizedFiles.some((file) => file.filename === 'README.md' || file.filename === 'docs/README.md')) {
    items.push('Check docs index links and landing-page wording for drift.');
  }

  return items;
}

function summarizeCheck(status, log) {
  const statusLabel = status === '0'
    ? 'passed'
    : status === 'unknown'
      ? 'unknown'
      : `failed with exit code ${status}`;

  const excerpt = trimLog(log, status === '0' ? 1200 : 3000);

  return [
    `- Command: \`npm run check\``,
    `- Result: **${statusLabel}**`,
    '',
    '<details>',
    '<summary>Check output excerpt</summary>',
    '',
    '```text',
    excerpt || 'No output captured.',
    '```',
    '',
    '</details>'
  ].join('\n');
}

function buildPromptSeed({ normalizedFiles, safetySignals, checkStatus }) {
  const files = normalizedFiles.map((file) => `- ${file.filename} (${file.status}, +${file.additions}/-${file.deletions})`).join('\n') || '- No files reported';
  const signals = safetySignals.map((signal) => `- ${signal.label}: ${signal.files.join(', ')}`).join('\n') || '- No safety-sensitive groups detected';

  return [
    'Review this GEF PR as a systems architect and solo-dev handoff partner.',
    'Keep the safe-foundation rule intact: Models may suggest. Validators decide. Users promote.',
    `npm run check status: ${checkStatus}`,
    '',
    'Changed files:',
    files,
    '',
    'Safety signals:',
    signals,
    '',
    'Return: likely risks, missing tests, docs drift, and the smallest safe follow-up patch if needed.'
  ].join('\n');
}

function trimLog(log, limit) {
  const clean = log.replace(/\u001b\[[0-9;]*m/g, '').trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit)}\n\n[output truncated]`;
}

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, '\\|').replace(/`/g, '\\`');
}
