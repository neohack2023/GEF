const PRESET_KEY = 'gef_local_presets';
const TELEMETRY_KEY = 'gef_telemetry_dataset';
const AUTOPILOT_LOG_KEY = 'gef_autopilot_logs';

export function readJson(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback));
  } catch {
    return fallback;
  }
}

export function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value));
}

export function getPresets() {
  return readJson(PRESET_KEY, []).sort((a, b) => b.timestamp - a.timestamp);
}

export function savePreset(preset) {
  const all = readJson(PRESET_KEY, []);
  all.push({ ...preset, timestamp: Date.now() });
  writeJson(PRESET_KEY, all);
  return all;
}

export function deletePreset(index) {
  const all = getPresets();
  all.splice(index, 1);
  writeJson(PRESET_KEY, all);
  return all;
}

export function getTelemetry() {
  return readJson(TELEMETRY_KEY, []);
}

export function appendTelemetry(record) {
  const all = getTelemetry();
  all.push(record);
  writeJson(TELEMETRY_KEY, all);
  return all;
}

function wrapImportedRows(rows, metadata = {}) {
  const importedAt = metadata.importedAt || new Date().toISOString();
  const fileName = metadata.fileName || 'unknown-jsonl-import';
  const parserVersion = metadata.parserVersion || 'gef-jsonl-import-v1';

  return rows.map((entry, index) => {
    const row = entry && entry.row && typeof entry.row === 'object' ? entry.row : entry;
    const lineNumber = Number.isInteger(entry?.lineNumber) ? entry.lineNumber : index + 1;

    return {
      ...row,
      _gefImport: {
        state: 'quarantined',
        importedAt,
        fileName,
        lineNumber,
        originalIndex: index,
        parserVersion,
        schemaStatus: 'unvalidated',
        reviewed: false
      }
    };
  });
}

export function importTelemetryRows(rows, metadata = {}) {
  const importedRows = wrapImportedRows(rows, metadata);
  const all = [...getTelemetry(), ...importedRows];
  writeJson(TELEMETRY_KEY, all);
  return all;
}

export function exportTelemetryJsonl() {
  return getTelemetry().map((row) => JSON.stringify(row)).join('\n');
}

export function getAutopilotLogs() {
  return readJson(AUTOPILOT_LOG_KEY, []);
}

export function appendAutopilotLog(entry) {
  const all = getAutopilotLogs();
  all.push(entry);
  if (all.length > 500) all.shift();
  writeJson(AUTOPILOT_LOG_KEY, all);
  return all;
}
