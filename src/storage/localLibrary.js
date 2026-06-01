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

export function importTelemetryRows(rows) {
  const all = [...getTelemetry(), ...rows];
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
