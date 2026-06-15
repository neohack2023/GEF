import { readFile, writeFile } from 'node:fs/promises';

const logPath = process.argv[2] ?? 'ci-output.log';
const rawLog = await readFile(logPath, 'utf8').catch(() => '');
const log = stripAnsi(rawLog);

const env = process.env;
const repo = env.GITHUB_REPOSITORY ?? 'unknown/repository';
const serverUrl = env.GITHUB_SERVER_URL ?? 'https://github.com';
const runUrl = `${serverUrl}/${repo}/actions/runs/${env.GITHUB_RUN_ID ?? ''}`;
const commitUrl = `${serverUrl}/${repo}/commit/${env.GITHUB_SHA ?? ''}`;
const shortSha = (env.GITHUB_SHA ?? 'unknown').slice(0, 12);
const stage = env.CI_FAILURE_STAGE ?? 'npm run check';
const findings = parseFindings(log);

for (const finding of findings.slice(0, 20)) {
  console.log(
    `::error file=${escapeCommandProperty(finding.file)},line=${finding.line},title=Node CI::${escapeCommandData(finding.message)}`
  );
}

const firstFinding = findings[0];
const title = firstFinding
  ? `[CI] Node check failed at ${firstFinding.file}:${firstFinding.line}`
  : `[CI] Node check failed on ${shortSha}`;

const body = buildIssueBody({ findings, log });
const summary = buildSummary({ findings, log });

await writeFile('ci-issue-title.txt', `${title}\n`, 'utf8');
await writeFile('ci-issue-body.md', body, 'utf8');
await writeFile('ci-failure-summary.md', summary, 'utf8');

function buildIssueBody({ findings, log }) {
  const table = findings.length
    ? [
        '| File | Line | Message |',
        '| --- | ---: | --- |',
        ...findings.slice(0, 25).map((finding) => (
          `| \`${escapeMarkdown(finding.file)}\` | ${finding.line} | ${escapeMarkdown(finding.message)} |`
        ))
      ].join('\n')
    : 'No file/line-specific finding could be parsed. Check the raw output below.';

  return [
    '<!-- gef-node-ci-failure -->',
    `<!-- commit:${env.GITHUB_SHA ?? 'unknown'} -->`,
    '',
    '# Node CI failure',
    '',
    'The Node CI rail caught a failure that needs a human or LLM repair pass.',
    '',
    '## Failure source',
    '',
    `- Workflow: ${env.GITHUB_WORKFLOW ?? 'unknown workflow'}`,
    `- Stage: ${stage}`,
    `- Commit: ${env.GITHUB_SHA ? `[${shortSha}](${commitUrl})` : 'unknown'}`,
    `- Ref: ${env.GITHUB_REF ?? 'unknown'}`,
    `- Actor: ${env.GITHUB_ACTOR ?? 'unknown'}`,
    `- Run: ${env.GITHUB_RUN_ID ? `[${env.GITHUB_RUN_ID}](${runUrl})` : 'unknown'}`,
    `- Attempt: ${env.GITHUB_RUN_ATTEMPT ?? 'unknown'}`,
    '',
    '## Parsed findings',
    '',
    table,
    '',
    '## Fix packet for LLM / solo-dev handoff',
    '',
    '1. Open the file and line listed above.',
    '2. Reproduce locally with `npm run check`.',
    '3. Patch the smallest safe change.',
    '4. Re-run `npm run check` before committing.',
    '5. Keep generated/provider output untrusted unless validated and promoted by the user.',
    '',
    '## Raw CI output excerpt',
    '',
    '```text',
    trimForIssue(log),
    '```',
    ''
  ].join('\n');
}

function buildSummary({ findings, log }) {
  const rows = findings.length
    ? [
        '| File | Line | Message |',
        '| --- | ---: | --- |',
        ...findings.slice(0, 15).map((finding) => (
          `| \`${escapeMarkdown(finding.file)}\` | ${finding.line} | ${escapeMarkdown(finding.message)} |`
        ))
      ].join('\n')
    : 'No file/line-specific finding could be parsed.';

  return [
    '# Node CI failure',
    '',
    `Stage: \`${stage}\``,
    `Commit: \`${env.GITHUB_SHA ?? 'unknown'}\``,
    '',
    '## Parsed findings',
    '',
    rows,
    '',
    '## Raw output excerpt',
    '',
    '```text',
    trimForIssue(log, 3000),
    '```',
    ''
  ].join('\n');
}

function parseFindings(text) {
  const lines = text.split(/\r?\n/);
  const findings = [];
  const seen = new Set();

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const direct = line.match(/^-?\s*(?<file>[^:\s][^:]*\.(?:js|mjs|cjs|html|css)):(?<line>\d+)\s+(?<message>.+)$/i);
    if (direct?.groups) {
      addFinding(findings, seen, {
        file: normalizeFile(direct.groups.file),
        line: Number(direct.groups.line),
        message: direct.groups.message.trim()
      });
      continue;
    }

    const syntax = line.match(/(?<file>(?:\/[^:\n]+|[A-Za-z]:\\[^:\n]+|[^:\n]+)\.(?:js|mjs|cjs)):(?<line>\d+)/i);
    if (syntax?.groups) {
      addFinding(findings, seen, {
        file: normalizeFile(syntax.groups.file),
        line: Number(syntax.groups.line),
        message: findNearbyError(lines, index) ?? 'Node syntax check failed'
      });
    }
  }

  return findings;
}

function addFinding(findings, seen, finding) {
  if (!finding.file || !Number.isFinite(finding.line)) return;
  const key = `${finding.file}:${finding.line}:${finding.message}`;
  if (seen.has(key)) return;
  seen.add(key);
  findings.push(finding);
}

function findNearbyError(lines, startIndex) {
  const window = lines.slice(startIndex, startIndex + 8);
  const errorLine = window.find((line) => /^(SyntaxError|TypeError|ReferenceError|Error):/.test(line.trim()));
  return errorLine?.trim();
}

function normalizeFile(file) {
  let normalized = file.replace(/\\/g, '/').trim();
  const workspace = (env.GITHUB_WORKSPACE ?? '').replace(/\\/g, '/');
  if (workspace && normalized.startsWith(`${workspace}/`)) {
    normalized = normalized.slice(workspace.length + 1);
  }
  return normalized.replace(/^\.\//, '');
}

function trimForIssue(text, limit = 8000) {
  const trimmed = text.trim();
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit)}\n\n[output truncated]`;
}

function stripAnsi(text) {
  return text.replace(/\u001b\[[0-9;]*m/g, '');
}

function escapeMarkdown(value) {
  return String(value).replace(/\|/g, '\\|').replace(/`/g, '\\`');
}

function escapeCommandData(value) {
  return String(value).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
}

function escapeCommandProperty(value) {
  return escapeCommandData(value).replace(/,/g, '%2C');
}
