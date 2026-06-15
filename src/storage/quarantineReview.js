import {
  deleteQuarantinedTelemetryRows,
  exportReviewedTelemetryJsonl,
  getQuarantinedTelemetryRows,
  getTelemetryQuarantineSummary,
  promoteQuarantinedTelemetryRows
} from './localLibrary.js';

const $ = (id) => document.getElementById(id);

function setStatus(text, timeout = 2600) {
  const status = $('status-bar');
  if (!status) return;
  status.textContent = text;
  status.className = '';

  if (timeout > 0) {
    window.setTimeout(() => {
      status.textContent = 'STABLE ENGINE ACTIVE';
      status.className = '';
    }, timeout);
  }
}

function setDatasetCount(total) {
  const counter = $('dataset-count');
  if (counter) counter.textContent = String(total);
}

function makeRow(label, value) {
  const row = document.createElement('div');
  row.className = 'quarantine-stat-row';

  const labelEl = document.createElement('span');
  labelEl.textContent = label;

  const valueEl = document.createElement('strong');
  valueEl.textContent = String(value);

  row.append(labelEl, valueEl);
  return row;
}

function describeTelemetryRow(row) {
  const importMeta = row?._gefImport || {};
  const eventType = row?.event_type || row?.eventType || row?.type || 'unknown event';
  const source = importMeta.fileName || 'unknown source';
  const line = Number.isInteger(importMeta.lineNumber) ? `line ${importMeta.lineNumber}` : 'unknown line';
  const timestamp = row?.timestamp || importMeta.importedAt || 'unknown time';
  return `${eventType} · ${source} · ${line} · ${timestamp}`;
}

function renderPreview(rows) {
  const preview = $('quarantine-preview');
  if (!preview) return;
  preview.replaceChildren();

  if (!rows.length) {
    const empty = document.createElement('div');
    empty.className = 'tiny-note';
    empty.textContent = 'No quarantined rows waiting for review.';
    preview.appendChild(empty);
    return;
  }

  rows.forEach(({ row, index }) => {
    const card = document.createElement('div');
    card.className = 'quarantine-row';

    const meta = document.createElement('div');
    meta.className = 'quarantine-row-meta';
    meta.textContent = `#${index + 1}`;

    const body = document.createElement('div');
    body.textContent = describeTelemetryRow(row);

    card.append(meta, body);
    preview.appendChild(card);
  });
}

function renderQuarantineReview() {
  const summaryEl = $('quarantine-summary');
  const promoteBtn = $('btn-promote-quarantine');
  const deleteBtn = $('btn-delete-quarantine');
  if (!summaryEl || !promoteBtn || !deleteBtn) return;

  const summary = getTelemetryQuarantineSummary();
  setDatasetCount(summary.total);
  summaryEl.replaceChildren(
    makeRow('Total rows', summary.total),
    makeRow('Local rows', summary.local),
    makeRow('Quarantined imports', summary.quarantined),
    makeRow('Promoted imports', summary.promoted),
    makeRow('Exportable rows', summary.exportable)
  );

  const hasQuarantine = summary.quarantined > 0;
  promoteBtn.disabled = !hasQuarantine;
  deleteBtn.disabled = !hasQuarantine;
  renderPreview(getQuarantinedTelemetryRows(5));
}

function downloadText(filename, text, type = 'text/plain') {
  const blob = new Blob([text], { type });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

function bindQuarantineReview() {
  $('tab-library')?.addEventListener('click', () => window.setTimeout(renderQuarantineReview, 0));
  $('dataset-upload')?.addEventListener('change', () => window.setTimeout(renderQuarantineReview, 150));
  $('save-btn')?.addEventListener('click', () => window.setTimeout(renderQuarantineReview, 0));

  $('btn-promote-quarantine')?.addEventListener('click', () => {
    const { rows, promoted } = promoteQuarantinedTelemetryRows();
    renderQuarantineReview();
    setStatus(promoted ? `Promoted ${promoted} quarantined rows for reviewed export.` : 'No quarantined rows to promote.');
    setDatasetCount(rows.length);
  });

  $('btn-delete-quarantine')?.addEventListener('click', () => {
    const { rows, deleted } = deleteQuarantinedTelemetryRows();
    renderQuarantineReview();
    setStatus(deleted ? `Deleted ${deleted} quarantined rows.` : 'No quarantined rows to delete.');
    setDatasetCount(rows.length);
  });

  $('btn-export-lora')?.addEventListener('click', (event) => {
    event.preventDefault();
    event.stopImmediatePropagation();

    const rows = exportReviewedTelemetryJsonl();
    const summary = getTelemetryQuarantineSummary();
    renderQuarantineReview();

    if (!rows.trim()) {
      setStatus(summary.quarantined ? 'Export blocked: only quarantined rows are available. Promote or delete them first.' : 'Dataset is empty.');
      return;
    }

    downloadText(`gef_reviewed_telemetry_${Date.now()}.jsonl`, rows, 'application/jsonl');
    const skipped = summary.quarantined ? ` Skipped ${summary.quarantined} quarantined rows.` : '';
    setStatus(`Exported ${summary.exportable} reviewed rows.${skipped}`);
  }, true);

  renderQuarantineReview();
}

bindQuarantineReview();
