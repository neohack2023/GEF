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

export function writeTelemetry(rows) {
  const safeRows = Array.isArray(rows) ? rows : [];
  writeJson(TELEMETRY_KEY, safeRows);
  return safeRows;
}

export function appendTelemetry(record) {
  const all = getTelemetry();
  all.push(record);
  writeJson(TELEMETRY_KEY, all);
  return all;
}

function isQuarantinedImport(row) {
  return row?._gefImport?.state === 'quarantined';
}

function isRejectedImport(row) {
  return row?._gefImport?.state === 'rejected';
}

function isPromotedImport(row) {
  return row?._gefImport?.state === 'promoted';
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

export function getTelemetryQuarantineSummary() {
  const rows = getTelemetry();
  const quarantined = rows.filter(isQuarantinedImport).length;
  const promoted = rows.filter(isPromotedImport).length;
  const rejected = rows.filter(isRejectedImport).length;
  const local = rows.length - rows.filter((row) => row?._gefImport).length;

  return {
    total: rows.length,
    local,
    quarantined,
    promoted,
    rejected,
    exportable: rows.filter(isExportableTelemetryRow).length
  };
}

export function getQuarantinedTelemetryRows(limit = 5) {
  return getTelemetry()
    .map((row, index) => ({ row, index }))
    .filter((entry) => isQuarantinedImport(entry.row))
    .slice(0, limit);
}

export function promoteQuarantinedTelemetryRows() {
  const reviewedAt = new Date().toISOString();
  const rows = getTelemetry();
  let promoted = 0;

  const nextRows = rows.map((row) => {
    if (!isQuarantinedImport(row)) return row;
    promoted += 1;
    return {
      ...row,
      _gefImport: {
        ...row._gefImport,
        state: 'promoted',
        schemaStatus: 'accepted-for-local-review',
        reviewed: true,
        reviewedAt
      }
    };
  });

  writeTelemetry(nextRows);
  return { rows: nextRows, promoted };
}

export function deleteQuarantinedTelemetryRows() {
  const rows = getTelemetry();
  const nextRows = rows.filter((row) => !isQuarantinedImport(row));
  const deleted = rows.length - nextRows.length;
  writeTelemetry(nextRows);
  return { rows: nextRows, deleted };
}

export function isExportableTelemetryRow(row) {
  return !isQuarantinedImport(row) && !isRejectedImport(row);
}

export function exportReviewedTelemetryJsonl() {
  return getTelemetry()
    .filter(isExportableTelemetryRow)
    .map((row) => JSON.stringify(row))
    .join('\n');
}

export function exportTelemetryJsonl() {
  return exportReviewedTelemetryJsonl();
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
