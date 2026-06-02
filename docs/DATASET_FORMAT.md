# GEF Dataset Format

GEF datasets are structured records of what happened during visual generation, validation, feedback, and memory distillation.

A preset answers:

```text
How do I restore this visual setup?
```

A dataset row answers:

```text
What did the system try, what context did it use, what happened, and what did the user think?
```

Core principle:

> Every useful run becomes evidence, but only validated evidence becomes training data.

The dataset should help GEF improve module selection, prompt rewriting, feedback classification, memory retrieval, SLM evaluation, and future fine-tuning. It should not become a junk drawer of raw prompts, untrusted imports, provider output, and half-baked ghosts wearing JSON masks.

---

## Current implementation

Current storage file:

```text
src/storage/localLibrary.js
```

Current localStorage key:

```js
const TELEMETRY_KEY = 'gef_telemetry_dataset';
```

Current telemetry write path:

```js
function logTelemetry(eventType, payload = {}) {
  const rows = appendTelemetry({
    timestamp: new Date().toISOString(),
    session_id: sessionId,
    event_type: eventType,
    ...payload
  });
  $('dataset-count').innerText = rows.length;
}
```

Current export path:

```js
export function exportTelemetryJsonl() {
  return getTelemetry().map((row) => JSON.stringify(row)).join('\n');
}
```

Current import path:

```js
const rows = String(ev.target.result)
  .split('\n')
  .filter(Boolean)
  .map((line) => JSON.parse(line));

const all = importTelemetryRows(rows);
```

Current event examples:

```text
SAFE_EVOLVE_PREVIEW
SAFE_ITERATE_PREVIEW
USER_REWARD
USER_PUNISHMENT
MANUAL_MAIN_BASE_COMPILE_SAFE
```

---

## Current legacy row shape

The current prototype shape is `legacy-telemetry-v0`:

```json
{
  "timestamp": "2026-06-01T20:00:00.000Z",
  "session_id": "c5d6e7",
  "event_type": "SAFE_EVOLVE_PREVIEW",
  "prompt": "glitchy bass-reactive data storm",
  "stage": "OVERLAY"
}
```

Current feedback examples:

```json
{
  "timestamp": "2026-06-01T20:01:00.000Z",
  "session_id": "c5d6e7",
  "event_type": "USER_REWARD",
  "reason": "User liked safe preview."
}
```

```json
{
  "timestamp": "2026-06-01T20:02:00.000Z",
  "session_id": "c5d6e7",
  "event_type": "USER_PUNISHMENT",
  "reason": "too plain"
}
```

Limitations of legacy v0:

- No stable row `id`.
- No `schemaName`.
- No `schemaVersion`.
- No explicit `source` or `trust` fields.
- No structured input/context/decision/validation/feedback envelope.
- No import quarantine state.
- No dataset split field.
- No model/provider metadata.
- No audio snapshot unless manually included.
- No row-level quality score.
- No row lineage or cleanup status.

Legacy v0 should remain importable through migration, but new dataset rows should use `gef-feedback-row-v1`.

---

## JSONL file rules

GEF should export feedback datasets as JSON Lines.

JSON Lines requirements to follow:

- UTF-8 encoding.
- Each line is a valid JSON value.
- Use `\n` as the line terminator.
- A final newline is recommended.
- Use `.jsonl` for uncompressed exports.
- Use `.jsonl.gz` for compressed exports later.

Recommended MIME label for browser download:

```text
application/jsonl
```

Note:

The JSON Lines site notes that `application/jsonl` is not yet standardized, so GEF should not depend on MIME alone for validation.

Useful reference:

```text
https://jsonlines.org/
```

---

## Dataset files vs event logs

GEF should treat raw telemetry and cleaned datasets differently.

| File | Purpose | Trust | Use |
| --- | --- | --- | --- |
| `telemetry.jsonl` | raw event stream | mixed | debugging, replay |
| `feedback_dataset.jsonl` | structured feedback rows | validated | SLM retrieval, evaluation |
| `training_clean.jsonl` | curated examples | reviewed | future fine-tuning |
| `eval_holdout.jsonl` | withheld examples | reviewed | regression/evaluation |
| `dataset_card.md` | dataset documentation | reviewed | human context |

Rule:

```text
Raw telemetry is not automatically training data.
```

---

## Target row: `gef-feedback-row-v1`

A full row should capture one meaningful decision/result/feedback unit.

```json
{
  "schemaName": "gef-feedback-row",
  "schemaVersion": 1,
  "id": "row_01J0EXAMPLE",
  "createdAt": "2026-06-01T20:00:00.000Z",
  "sessionId": "session_01J0",
  "source": {
    "kind": "local",
    "trust": "trusted_local",
    "origin": "browser-runtime"
  },
  "event": {
    "type": "SANDBOX_PREVIEWED",
    "phase": "preview",
    "sequence": 12
  },
  "input": {
    "userPrompt": "glitchy bass-reactive data storm",
    "selectedStage": "OVERLAY",
    "requestedFormat": "js",
    "provider": "mock_slm",
    "model": "mock-v0"
  },
  "context": {
    "activeBase": "voidCore",
    "enabledModules": ["spectralGrid", "beatBloom", "chromaSlice"],
    "sandboxModuleId": "spectralGrid",
    "previewMode": "AUTO",
    "ui": {
      "speed": 1.0,
      "glitchThreshold": 1.5,
      "audioSense": 1.0
    },
    "audioSnapshot": {
      "bass": 0.72,
      "mid": 0.34,
      "treble": 0.48,
      "beat": 1,
      "glitch": 0.63,
      "centroid": 0.41,
      "rms": 0.55,
      "fftSize": 1024,
      "sampleRate": 48000
    }
  },
  "decision": {
    "intent": "overlay",
    "moduleId": "spectralGrid",
    "stage": "OVERLAY",
    "parameterHints": {
      "density": 1.2,
      "opacity": 0.8
    },
    "confidence": 0.78,
    "reason": "Prompt asks for data storm structure and audio-reactive motion."
  },
  "validation": {
    "passed": true,
    "errors": [],
    "warnings": [],
    "renderFramesTested": 8,
    "validatorVersion": "gef-validator-v1"
  },
  "feedback": {
    "outcome": "accepted",
    "userRating": 1,
    "reason": "",
    "tags": ["good_motion", "audio_reactive", "usable"]
  },
  "quality": {
    "score": 1.5,
    "shouldTrain": true,
    "shouldDistill": true,
    "split": "train"
  },
  "lineage": {
    "parentRowIds": [],
    "derivedFrom": [],
    "migration": null
  },
  "privacy": {
    "containsUserText": true,
    "containsMediaData": false,
    "containsSecrets": false,
    "exportAllowed": true
  }
}
```

---

## Required fields

For `gef-feedback-row-v1`, require:

```text
schemaName
schemaVersion
id
createdAt
sessionId
source
event
input
context
decision
validation
feedback
quality
privacy
```

Required values:

```json
{
  "schemaName": "gef-feedback-row",
  "schemaVersion": 1
}
```

---

## Field definitions

### `schemaName`

Must be:

```json
"gef-feedback-row"
```

This prevents confusing dataset rows with presets, memory files, provider config, or capture metadata.

### `schemaVersion`

Current target:

```json
1
```

Increment when required fields change, field meaning changes, or migration is required.

### `id`

Stable row identifier.

Recommended shape:

```text
row_<random-or-ulid>
```

Rules:

- Must be unique within a dataset.
- Must not be generated from prompt text.
- Must survive export/import.

### `createdAt`

ISO 8601 timestamp.

Use:

```js
new Date().toISOString()
```

### `sessionId`

Identifier for the browser session that generated the row.

Rules:

- Useful for grouping related events.
- Should not identify the user across unrelated exports.
- Can be regenerated per browser session.

### `source`

Tracks origin and trust.

```json
{
  "kind": "local",
  "trust": "trusted_local",
  "origin": "browser-runtime"
}
```

Allowed `kind` values:

```text
local
imported
migration
provider_generated
manual_review
```

Allowed `trust` values:

```text
trusted_local
untrusted_import
reviewed
quarantined
provider_generated
```

### `event`

The stable event envelope.

```json
{
  "type": "SANDBOX_PREVIEWED",
  "phase": "preview",
  "sequence": 12
}
```

Allowed event types:

```text
PROMPT_SUBMITTED
INTENT_CLASSIFIED
MODULE_CHOSEN
SANDBOX_PREVIEWED
VALIDATION_PASSED
VALIDATION_FAILED
USER_ACCEPTED
USER_REJECTED
USER_EDITED_PROMPT
MEMORY_DISTILLED
DATASET_IMPORTED
DATASET_EXPORTED
PROVIDER_RESPONSE_REJECTED
```

Allowed phases:

```text
input
planning
decision
preview
validation
feedback
memory
import
export
security
```

### `input`

What the user or controller asked for.

```json
{
  "userPrompt": "glitchy bass-reactive data storm",
  "selectedStage": "OVERLAY",
  "requestedFormat": "js",
  "provider": "mock_slm",
  "model": "mock-v0"
}
```

Rules:

- `userPrompt` is optional for non-prompt events.
- Store plain text only.
- Never store API keys.
- Never store raw file contents.

### `context`

Runtime state around the event.

```json
{
  "activeBase": "voidCore",
  "enabledModules": ["spectralGrid"],
  "sandboxModuleId": "spectralGrid",
  "previewMode": "AUTO",
  "ui": {},
  "audioSnapshot": {}
}
```

Rules:

- Context should be enough to explain the decision later.
- Context should not store raw media.
- Module IDs must be registry IDs.

### `decision`

The app or provider choice.

```json
{
  "intent": "overlay",
  "moduleId": "spectralGrid",
  "stage": "OVERLAY",
  "parameterHints": {},
  "confidence": 0.78,
  "reason": "short explanation"
}
```

Rules:

- `moduleId` must be a registered module ID.
- `stage` must be a known stage.
- `parameterHints` must be schema-valid before use.
- `reason` is plain text, not executable instruction.

### `validation`

What the validator found.

```json
{
  "passed": true,
  "errors": [],
  "warnings": [],
  "renderFramesTested": 8,
  "validatorVersion": "gef-validator-v1"
}
```

Rules:

- Failed validation rows are useful for debugging and evaluation.
- Failed validation rows should not be used for positive training examples.

### `feedback`

User judgment.

```json
{
  "outcome": "accepted",
  "userRating": 1,
  "reason": "",
  "tags": ["good_motion"]
}
```

Allowed `outcome` values:

```text
accepted
rejected
edited
ignored
unknown
```

Recommended `userRating` range:

```text
-1 rejected
 0 neutral/unknown
 1 accepted
```

### `quality`

Dataset-use decision.

```json
{
  "score": 1.5,
  "shouldTrain": true,
  "shouldDistill": true,
  "split": "train"
}
```

Allowed `split` values:

```text
raw
train
validation
eval
holdout
quarantine
archive
```

Rules:

- Imported rows start in `quarantine`.
- Failed validation rows should usually be `raw`, `eval`, or `archive`, not `train`.
- `holdout` rows should not be used in training.

### `lineage`

Tracks where a row came from.

```json
{
  "parentRowIds": [],
  "derivedFrom": [],
  "migration": null
}
```

Use for:

- migrated legacy rows
- cleaned rows derived from raw telemetry
- edited prompt pairs
- distilled memory sources

### `privacy`

Controls export and training safety.

```json
{
  "containsUserText": true,
  "containsMediaData": false,
  "containsSecrets": false,
  "exportAllowed": true
}
```

Rules:

- `containsSecrets` must force `exportAllowed = false`.
- Raw media data should never be embedded in a dataset row.
- Filenames should be optional and privacy-filtered.

---

## Feedback tags

Use stable tags so rows can be searched and scored.

Positive tags:

```text
good_motion
audio_reactive
usable
strong_base
strong_overlay
clean_colors
good_depth
matches_prompt
worth_saving
strong_sync
interesting_glitch
```

Negative tags:

```text
too_plain
too_noisy
too_dark
too_bright
not_audio_reactive
wrong_stage
weak_motion
muddy_colors
bad_depth
missed_prompt
performance_issue
unstable_preview
wrong_module
bad_timing
```

System tags:

```text
schema_valid
schema_invalid
imported
migrated_v0
provider_output_rejected
sandbox_only
manual_reviewed
```

---

## Quality scoring

Start with a simple deterministic scorer.

```js
export function scoreFeedbackRow(row) {
  let score = 0;

  if (row.feedback?.outcome === 'accepted') score += 1;
  if (row.feedback?.outcome === 'rejected') score -= 1;
  if (row.feedback?.outcome === 'edited') score += 0.25;

  if (row.validation?.passed === true) score += 0.25;
  if (row.validation?.passed === false) score -= 0.75;

  const tags = new Set(row.feedback?.tags || []);
  if (tags.has('matches_prompt')) score += 0.5;
  if (tags.has('audio_reactive')) score += 0.35;
  if (tags.has('worth_saving')) score += 0.35;
  if (tags.has('not_audio_reactive')) score -= 0.5;
  if (tags.has('performance_issue')) score -= 0.4;
  if (tags.has('missed_prompt')) score -= 0.6;

  return Math.max(-2, Math.min(2, score));
}
```

Training gate:

```js
export function shouldUseForTraining(row) {
  return row.validation?.passed === true
    && row.quality?.score >= 1
    && row.feedback?.outcome === 'accepted'
    && row.privacy?.containsSecrets !== true
    && row.privacy?.exportAllowed === true
    && row.source?.trust !== 'untrusted_import';
}
```

---

## Dataset split policy

Recommended split behavior:

| Split | Purpose | Include |
| --- | --- | --- |
| `raw` | original logs | everything local before cleaning |
| `train` | model/policy improvement | accepted, validated, high-score rows |
| `validation` | tune prompts/scoring | mixed but reviewed rows |
| `eval` | regression testing | representative accepted/rejected cases |
| `holdout` | honest future evaluation | never used in training |
| `quarantine` | imported/untrusted rows | imported rows before review |
| `archive` | historical low-use data | old/low-value rows |

Rule:

```text
A row should not move from quarantine to train without validation and review.
```

---

## JSON Schema starter

Use JSON Schema to validate dataset rows before import, export, or training.

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://gef.local/schemas/gef-feedback-row-v1.schema.json",
  "title": "GEF Feedback Row v1",
  "type": "object",
  "required": [
    "schemaName",
    "schemaVersion",
    "id",
    "createdAt",
    "sessionId",
    "source",
    "event",
    "input",
    "context",
    "decision",
    "validation",
    "feedback",
    "quality",
    "privacy"
  ],
  "properties": {
    "schemaName": { "const": "gef-feedback-row" },
    "schemaVersion": { "const": 1 },
    "id": { "type": "string", "minLength": 1, "maxLength": 160 },
    "createdAt": { "type": "string", "format": "date-time" },
    "sessionId": { "type": "string", "minLength": 1, "maxLength": 160 },
    "source": {
      "type": "object",
      "required": ["kind", "trust"],
      "properties": {
        "kind": { "enum": ["local", "imported", "migration", "provider_generated", "manual_review"] },
        "trust": { "enum": ["trusted_local", "untrusted_import", "reviewed", "quarantined", "provider_generated"] },
        "origin": { "type": "string", "maxLength": 160 }
      }
    },
    "event": {
      "type": "object",
      "required": ["type", "phase"],
      "properties": {
        "type": { "type": "string", "maxLength": 80 },
        "phase": { "type": "string", "maxLength": 40 },
        "sequence": { "type": "integer", "minimum": 0 }
      }
    },
    "input": {
      "type": "object",
      "properties": {
        "userPrompt": { "type": "string", "maxLength": 4000 },
        "selectedStage": { "type": "string", "maxLength": 40 },
        "requestedFormat": { "enum": ["js", "glsl", "wgsl", "python", "unknown"] },
        "provider": { "type": "string", "maxLength": 80 },
        "model": { "type": "string", "maxLength": 120 }
      }
    },
    "context": { "type": "object" },
    "decision": { "type": "object" },
    "validation": {
      "type": "object",
      "required": ["passed", "errors", "warnings"],
      "properties": {
        "passed": { "type": "boolean" },
        "errors": { "type": "array", "items": { "type": "string" } },
        "warnings": { "type": "array", "items": { "type": "string" } },
        "renderFramesTested": { "type": "integer", "minimum": 0 },
        "validatorVersion": { "type": "string" }
      }
    },
    "feedback": {
      "type": "object",
      "required": ["outcome", "tags"],
      "properties": {
        "outcome": { "enum": ["accepted", "rejected", "edited", "ignored", "unknown"] },
        "userRating": { "type": "number", "minimum": -1, "maximum": 1 },
        "reason": { "type": "string", "maxLength": 1000 },
        "tags": { "type": "array", "items": { "type": "string" }, "uniqueItems": true }
      }
    },
    "quality": {
      "type": "object",
      "required": ["score", "shouldTrain", "shouldDistill", "split"],
      "properties": {
        "score": { "type": "number", "minimum": -2, "maximum": 2 },
        "shouldTrain": { "type": "boolean" },
        "shouldDistill": { "type": "boolean" },
        "split": { "enum": ["raw", "train", "validation", "eval", "holdout", "quarantine", "archive"] }
      }
    },
    "privacy": {
      "type": "object",
      "required": ["containsSecrets", "exportAllowed"],
      "properties": {
        "containsUserText": { "type": "boolean" },
        "containsMediaData": { "type": "boolean" },
        "containsSecrets": { "type": "boolean" },
        "exportAllowed": { "type": "boolean" }
      }
    }
  }
}
```

Useful reference:

```text
https://json-schema.org/learn/getting-started-step-by-step
```

---

## Migration from legacy v0

Legacy row:

```json
{
  "timestamp": "2026-06-01T20:00:00.000Z",
  "session_id": "session_123",
  "event_type": "SAFE_EVOLVE_PREVIEW",
  "prompt": "glitchy bass data storm",
  "stage": "OVERLAY"
}
```

Migration helper:

```js
export function migrateLegacyTelemetryV0(row) {
  const eventType = row.event_type || 'UNKNOWN_LEGACY_EVENT';
  const isPositive = eventType === 'USER_REWARD';
  const isNegative = eventType === 'USER_PUNISHMENT';

  return {
    schemaName: 'gef-feedback-row',
    schemaVersion: 1,
    id: `row_${crypto.randomUUID?.() || Date.now()}`,
    createdAt: row.timestamp || new Date().toISOString(),
    sessionId: row.session_id || 'unknown-session',
    source: {
      kind: 'migration',
      trust: 'trusted_local',
      origin: 'legacy-telemetry-v0'
    },
    event: {
      type: mapLegacyEventType(eventType),
      phase: inferPhaseFromLegacyEvent(eventType),
      sequence: 0
    },
    input: {
      userPrompt: row.prompt || '',
      selectedStage: row.stage || 'UNKNOWN',
      requestedFormat: row.format || 'unknown',
      provider: 'none',
      model: 'none'
    },
    context: {
      activeBase: row.activeBase || null,
      enabledModules: row.enabledModules || [],
      sandboxModuleId: row.moduleId || null,
      previewMode: row.previewMode || 'AUTO',
      ui: {},
      audioSnapshot: row.audioSnapshot || null
    },
    decision: {
      intent: 'unknown',
      moduleId: row.moduleId || null,
      stage: row.stage || 'UNKNOWN',
      parameterHints: {},
      confidence: 0,
      reason: row.reason || ''
    },
    validation: {
      passed: true,
      errors: [],
      warnings: ['Migrated from legacy telemetry; validation was not available.'],
      renderFramesTested: 0,
      validatorVersion: 'legacy-migration-v0'
    },
    feedback: {
      outcome: isPositive ? 'accepted' : isNegative ? 'rejected' : 'unknown',
      userRating: isPositive ? 1 : isNegative ? -1 : 0,
      reason: row.reason || '',
      tags: ['migrated_v0']
    },
    quality: {
      score: isPositive ? 1 : isNegative ? -1 : 0,
      shouldTrain: false,
      shouldDistill: isPositive || isNegative,
      split: 'raw'
    },
    lineage: {
      parentRowIds: [],
      derivedFrom: ['legacy-telemetry-v0'],
      migration: {
        fromSchema: 'legacy-telemetry-v0',
        migratedAt: new Date().toISOString()
      }
    },
    privacy: {
      containsUserText: Boolean(row.prompt || row.reason),
      containsMediaData: false,
      containsSecrets: false,
      exportAllowed: true
    }
  };
}
```

Legacy mapping:

```js
export function mapLegacyEventType(eventType) {
  const map = {
    SAFE_EVOLVE_PREVIEW: 'SANDBOX_PREVIEWED',
    SAFE_ITERATE_PREVIEW: 'SANDBOX_PREVIEWED',
    USER_REWARD: 'USER_ACCEPTED',
    USER_PUNISHMENT: 'USER_REJECTED',
    MANUAL_MAIN_BASE_COMPILE_SAFE: 'VALIDATION_PASSED'
  };

  return map[eventType] || eventType || 'UNKNOWN_LEGACY_EVENT';
}
```

---

## Import rules

Imported datasets are untrusted until validated.

Import flow:

```text
file selected
  -> size check
  -> read as text
  -> split by newline
  -> parse each JSON line
  -> schemaName/schemaVersion check
  -> migrate if legacy
  -> JSON Schema validation
  -> security/privacy check
  -> quarantine imported rows
  -> show accepted/rejected counts
  -> user review
  -> move reviewed rows to raw/eval/train only after approval
```

Rules:

- Reject blank non-whitespace lines.
- Limit file size.
- Limit line size.
- Limit total rows per import.
- Parse line-by-line so one bad row does not destroy the whole import.
- Store parse errors with line numbers.
- Mark imported rows as `source.kind = imported` and `source.trust = untrusted_import`.
- Force imported rows into `quality.split = quarantine` unless explicitly reviewed.
- Do not render imported text with `innerHTML`.
- Do not use imported rows for training until reviewed.

Import result object:

```js
{
  accepted: 142,
  rejected: 3,
  migrated: 27,
  quarantined: 142,
  errors: [
    { line: 7, message: 'Invalid JSON' },
    { line: 19, message: 'Unknown schemaName' }
  ]
}
```

---

## Export rules

Export only rows that are allowed to leave local storage.

```js
export function canExportRow(row) {
  return row.privacy?.exportAllowed === true
    && row.privacy?.containsSecrets !== true
    && row.privacy?.containsMediaData !== true;
}
```

Export variants:

| Export | Rows |
| --- | --- |
| `raw_local` | local rows, including unknown outcomes |
| `clean_feedback` | accepted/rejected rows with validation |
| `train_ready` | accepted, high-score, reviewed rows |
| `eval_set` | reviewed representative rows |
| `quarantine_review` | imported rows for manual inspection |

Recommended filename pattern:

```text
gef_dataset_<variant>_<YYYYMMDD_HHMMSS>.jsonl
```

---

## Cleaning rules

Raw rows need cleanup before training.

Keep:

- accepted rows with validation pass
- rejected rows with clear reasons
- edited prompt pairs
- validation failures with useful diagnostics
- provider responses rejected by validator
- rows with useful audio context

Downrank or archive:

- empty prompts
- duplicate rows
- rows with no decision and no feedback
- rows with only UI noise
- rows with ambiguous outcome
- old low-score rows

Reject from training:

- rows containing secrets
- rows containing raw media data
- rows with invalid module IDs
- rows with failed validation and positive feedback conflict
- imported rows that were not reviewed
- provider output that failed schema validation

---

## Training formats

GEF's raw feedback row is rich. Training examples should be derived from it, not identical to it.

### Module choice training example

```json
{
  "task": "module_choice",
  "input": {
    "prompt": "glitchy bass-reactive data storm",
    "stage": "OVERLAY",
    "availableModules": ["voidCore", "spectralGrid", "beatBloom", "chromaSlice"],
    "audioSummary": {
      "bass": 0.72,
      "glitch": 0.63,
      "beat": 1
    }
  },
  "output": {
    "moduleId": "spectralGrid",
    "stage": "OVERLAY",
    "parameterHints": {
      "density": 1.2
    },
    "reason": "Accepted prior run matched data storm and audio-reactive motion."
  },
  "weight": 1.5
}
```

### Feedback classifier example

```json
{
  "task": "feedback_classification",
  "input": {
    "reason": "too flat and not moving with the beat",
    "moduleId": "beatBloom",
    "stage": "POST_FX"
  },
  "output": {
    "outcome": "rejected",
    "tags": ["too_plain", "not_audio_reactive"],
    "suggestedAdjustment": "increase motion density and bind effect strength to bass or RMS"
  },
  "weight": 1.0
}
```

### Prompt rewrite example

```json
{
  "task": "prompt_rewrite",
  "input": {
    "rawPrompt": "make it crazy glitchy but cleaner",
    "recentRejectTags": ["too_noisy", "missed_prompt"]
  },
  "output": {
    "cleanPrompt": "Create a controlled glitch overlay with clear structure, bass-reactive slices, and reduced visual noise.",
    "stage": "POST_FX"
  },
  "weight": 0.8
}
```

---

## Evaluation rows

Evaluation rows should include both successes and failures.

Good eval set categories:

```text
accepted_simple_prompt
accepted_audio_reactive
accepted_glitch_prompt
rejected_too_plain
rejected_wrong_stage
validation_unknown_module
validation_bad_json
import_quarantine_case
memory_retrieval_case
```

Regression rule:

```text
A new provider/router should not perform worse than the mock baseline on the eval set.
```

---

## Dataset card

If GEF exports or shares a cleaned dataset, include a dataset card.

Recommended sections:

```text
Dataset Summary
Dataset Purpose
Collection Process
Schema Version
Row Count
Splits
Known Limitations
Privacy Notes
Label/Feedback Definitions
Cleaning Rules
Recommended Uses
Out-of-Scope Uses
License / Sharing Rules
Changelog
```

This follows the dataset-card idea: document the contents of a dataset, give context for how it should be used, and include responsible-use notes such as known limitations or potential biases.

Useful reference:

```text
https://huggingface.co/docs/hub/datasets-cards
```

---

## Relationship to other docs

| Doc | Role |
| --- | --- |
| `FEEDBACK_MEMORY_SYSTEM.md` | explains learning loop and memory layers |
| `SECURITY.md` | defines trust, import, model-output, and dataset poisoning controls |
| `AUDIO_METRICS.md` | defines audio snapshots used inside dataset rows |
| `PRESET_FORMAT.md` | separates visual setup from evidence rows |
| `MEMORY_POLICY.md` | will define retention, distillation, forgetting, and privacy policy |
| `TESTING.md` | will define validation and regression tests |

---

## Best build order

1. Add `src/telemetry/eventTypes.js`.
2. Add `src/telemetry/datasetWriter.js`.
3. Add `src/telemetry/jsonlExport.js`.
4. Add `src/telemetry/datasetSchemas.js`.
5. Add `migrateLegacyTelemetryV0()`.
6. Add line-by-line import with partial failure reporting.
7. Add `source`, `trust`, `quality`, and `privacy` fields to new rows.
8. Add dataset split controls.
9. Add cleaned dataset export variants.
10. Add dataset-card export template.
11. Add eval-set generation.
12. Feed clean rows into SLM retrieval and testing.

---

## Reference notes reviewed

- JSON Lines is suitable for one-record-at-a-time structured data and log-like data. It requires UTF-8, one valid JSON value per line, and `\n` line terminators.
- JSON Schema is used to annotate and validate JSON documents; it supports object properties, required fields, nested structures, arrays, and validation keywords.
- Dataset cards document dataset contents and context for use; Hugging Face recommends including information such as potential biases and metadata like license, language, tags, and size.
- Datasheets for Datasets argues that dataset documentation should include motivation, composition, collection process, recommended uses, and related transparency details.

Reference URLs:

```text
https://jsonlines.org/
https://json-schema.org/learn/getting-started-step-by-step
https://huggingface.co/docs/hub/datasets-cards
https://arxiv.org/abs/1803.09010
```

---

## Dataset maxims

- Telemetry is raw ore; datasets are refined metal.
- JSONL is for rows, not mystery blobs.
- Every row needs a schema name, version, source, trust, and privacy state.
- Accepted examples teach preference.
- Rejected examples teach boundaries.
- Validation failures teach guardrails.
- Imported rows go to quarantine first.
- Holdout data is sacred: do not train on the test oracle.
- The dataset should make the system smarter without making it easier to poison.
