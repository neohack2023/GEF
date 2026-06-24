import fs from "node:fs";
import path from "node:path";

const outDir = "reports/ci";
fs.mkdirSync(outDir, { recursive: true });

const status = process.argv[2] ?? "unknown";
const context = {
  repository: process.env.GITHUB_REPOSITORY ?? "local",
  sha: process.env.GITHUB_SHA ?? "local",
  ref: process.env.GITHUB_REF ?? "local",
  eventName: process.env.GITHUB_EVENT_NAME ?? "local",
  eventPath: process.env.GITHUB_EVENT_PATH ?? null,
  runId: process.env.GITHUB_RUN_ID ?? null,
  runNumber: process.env.GITHUB_RUN_NUMBER ?? null,
  workflow: process.env.GITHUB_WORKFLOW ?? null,
  status,
  generatedAt: new Date().toISOString(),
};

fs.writeFileSync(
  path.join(outDir, "ci-context.json"),
  `${JSON.stringify(context, null, 2)}\n`,
);

fs.writeFileSync(
  path.join(outDir, "ci-summary.md"),
  `# CI Context\n\n` +
    `- Repository: ${context.repository}\n` +
    `- SHA: ${context.sha}\n` +
    `- Ref: ${context.ref}\n` +
    `- Event: ${context.eventName}\n` +
    `- Workflow: ${context.workflow}\n` +
    `- Run ID: ${context.runId}\n` +
    `- Run Number: ${context.runNumber}\n` +
    `- Status: ${context.status}\n` +
    `- Generated: ${context.generatedAt}\n\n` +
    `## Agent instruction\n\n` +
    `Do not mark the task complete until the failing check is repaired and CI passes.\n` +
    `If this run failed, inspect logs and patch the smallest failing area.\n`,
);
