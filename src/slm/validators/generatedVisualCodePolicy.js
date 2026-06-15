export const GENERATED_VISUAL_ALLOWED_ARGS = Object.freeze(['ctx', 'w', 'h', 'time', 'audio', 'fbCtx', 'Math']);

export const GENERATED_VISUAL_BLOCKED_PATTERNS = Object.freeze([
  'fetch',
  'XMLHttpRequest',
  'WebSocket',
  'localStorage',
  'sessionStorage',
  'indexedDB',
  'document',
  'window',
  'navigator',
  'location',
  'eval',
  'Function',
  'import',
  'script',
  'cookie',
  'postMessage',
  'Worker',
  'SharedWorker',
  'serviceWorker'
]);

function stripCommentsAndStrings(source) {
  return String(source || '')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .replace(/\/\/.*$/gm, ' ')
    .replace(/`(?:\\[\s\S]|[^`])*`/g, ' ')
    .replace(/'(?:\\.|[^'\\])*'/g, ' ')
    .replace(/"(?:\\.|[^"\\])*"/g, ' ');
}

function hasBlockedPattern(source, pattern) {
  const escaped = pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const expression = new RegExp(`(^|[^A-Za-z0-9_$])${escaped}([^A-Za-z0-9_$]|$)`);
  return expression.test(source);
}

export function validateGeneratedVisualCodePolicy(code) {
  const normalized = stripCommentsAndStrings(code);
  const blocked = GENERATED_VISUAL_BLOCKED_PATTERNS.filter((pattern) => hasBlockedPattern(normalized, pattern));

  return {
    ok: blocked.length === 0,
    blocked,
    allowedArgs: [...GENERATED_VISUAL_ALLOWED_ARGS],
    message: blocked.length
      ? `Generated visual code references blocked browser/runtime capability: ${blocked.join(', ')}`
      : 'Generated visual code passed static policy screening.'
  };
}
