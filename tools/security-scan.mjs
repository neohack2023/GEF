import { readdir, readFile } from 'node:fs/promises';
import { extname, join } from 'node:path';

const roots = ['index.html', 'src', 'tools'];
const fileExtensions = new Set(['.js', '.mjs', '.html', '.css']);
const blockedPatterns = [
  { label: 'eval call', pattern: /\beval\s*\(/ },
  { label: 'Function constructor', pattern: /\bnew\s+Function\b/ },
  { label: 'frontend API key wording', pattern: /api[_-]?key/i },
  { label: 'frontend sensitive credential wording', pattern: /\b(secret|password|token)\b/i },
  { label: 'frontend bearer token literal', pattern: /bearer\s+[a-z0-9._-]+/i }
];

const allowedReviewTextPatterns = [
  /forbidden/i,
  /blockedPatterns/,
  /safety boundaries/i,
  /do not use/i,
  /do not store/i,
  /do not log/i,
  /credential reference/i,
  /provider credentials/i,
  /frontend sensitive credential wording/i,
  /frontend bearer token literal/i,
  /api\[_-\]\?key/i,
  /\bsecret\|password\|token\b/i,
  /bearer\\s\+\[a-z0-9\._-\]/i,
  /grep -R/i
];

function hasSupportedExtension(path) {
  return fileExtensions.has(extname(path));
}

async function collectFiles(path) {
  if (hasSupportedExtension(path)) return [path];

  let entries;
  try {
    entries = await readdir(path, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = [];
  for (const entry of entries) {
    const childPath = join(path, entry.name);
    if (entry.isDirectory()) {
      files.push(...await collectFiles(childPath));
    } else if (entry.isFile() && hasSupportedExtension(childPath)) {
      files.push(childPath);
    }
  }
  return files;
}

function isAllowedReviewText(line) {
  return allowedReviewTextPatterns.some((pattern) => pattern.test(line));
}

const findings = [];
const files = (await Promise.all(roots.map(collectFiles))).flat();

for (const file of files) {
  const text = await readFile(file, 'utf8');
  const lines = text.split(/\r?\n/);
  lines.forEach((line, index) => {
    blockedPatterns.forEach(({ label, pattern }) => {
      if (pattern.test(line) && !isAllowedReviewText(line)) {
        findings.push(`${file}:${index + 1} ${label}`);
      }
    });
  });
}

if (findings.length) {
  console.error('Security scan found review items:');
  findings.forEach((finding) => console.error(`- ${finding}`));
  process.exitCode = 1;
} else {
  console.log('Security scan passed.');
}
