# GEF Memory Policy

GEF memory is the policy layer that decides what the system is allowed to remember, how long it remembers it, how it forgets, and when memory becomes training evidence.

This document connects:

```text
ARCHITECTURE.md
SECURITY.md
FEEDBACK_MEMORY_SYSTEM.md
DATASET_FORMAT.md
PRESET_FORMAT.md
AUDIO_METRICS.md
SLM_OPTION_PLAN.md
```

Core principle:

> Memory should make GEF smarter without turning the browser into a haunted attic of stale prompts.

GEF should remember useful evidence, not hoard everything.

---

## Policy goals

GEF memory should:

- keep useful local learning evidence
- reduce repeated failures
- improve module selection
- improve prompt rewriting
- improve SLM/LLM routing
- support future fine-tuning datasets
- stay local-first by default
- provide export and deletion controls
- avoid storing secrets, raw media, or unnecessary personal data
- separate raw logs from distilled knowledge
- forget low-value noise

GEF memory should not:

- store raw media data
- store provider secrets
- store API keys
- use imported rows without quarantine
- feed raw untrusted rows directly to models
- treat every event as training data
- auto-promote memory into renderer authority
- silently retain data forever

---

## Existing memory artifacts

Current browser storage keys:

```js
gef_local_presets
gef_telemetry_dataset
gef_autopilot_logs
```

Current planned/related memory files:

```text
FEEDBACK_MEMORY_SYSTEM.md
DATASET_FORMAT.md
PRESET_FORMAT.md
SECURITY.md
```

Current storage behavior:

- presets are stored in localStorage
- telemetry rows are stored in localStorage
- Foundry logs are stored in localStorage
- telemetry can be exported as JSONL
- telemetry can be imported from JSONL
- imported JSONL is not yet schema-validated in code

Current policy gap:

```text
The app can store memory, but it does not yet decide which memories deserve to survive.
```

This document fills that gap.

---

## Memory hierarchy

GEF should use layered memory.

```text
L0 Session Memory
L1 Working Memory
L2 Long-Term Memory
L3 Distilled Knowledge
L4 Training-Ready Archive
```

### L0 — Session Memory

Short-lived state for the active tab/session.

Examples:

```json
{
  "currentPrompt": "glitch bass data storm",
  "currentStage": "OVERLAY",
  "lastSandboxModuleId": "spectralGrid",
  "recentAudioSnapshot": {
    "bass": 0.72,
    "glitch": 0.63
  }
}
```

Use for:

- current run context
- current prompt
- temporary diagnostics
- short-term retry logic
- active UI state

Retention:

```text
Until page reload or tab close.
```

Storage:

```text
memory object or sessionStorage
```

Rules:

- Do not export by default.
- Do not train on directly.
- Clear on refresh unless promoted.

---

### L1 — Working Memory

Recent local history.

Examples:

- last 50 prompts
- last 50 sandbox previews
- last 50 accepts/rejects
- recent validation errors
- recent provider failures

Use for:

- immediate retry behavior
- avoiding repeated local failures
- short-range SLM context
- UX continuity

Retention:

```text
Default: 30 days or 500 rows, whichever comes first.
```

Storage:

```text
localStorage now, IndexedDB later
```

Rules:

- Keep small.
- Use row caps.
- Prefer structured summaries over raw piles.

---

### L2 — Long-Term Memory

Useful recurring evidence that survived scoring.

Examples:

```json
{
  "schemaName": "gef-memory-item",
  "schemaVersion": 1,
  "id": "mem_01J0",
  "type": "preference",
  "summary": "User prefers spectralGrid for data-storm prompts when glitch is high.",
  "evidenceRowIds": ["row_01", "row_02", "row_03"],
  "score": {
    "importance": 0.82,
    "confidence": 0.74,
    "usage": 0.32,
    "decay": 0.91,
    "total": 0.51
  }
}
```

Use for:

- preferences
- recurring failure patterns
- stable module-routing behavior
- known-good visual recipes
- known-bad prompts/settings

Retention:

```text
Default: 365 days unless reinforced by new evidence.
```

Storage:

```text
IndexedDB recommended
```

Rules:

- Must have evidence.
- Must have score.
- Must expire or be reinforced.
- Must not contain raw media or secrets.

---

### L3 — Distilled Knowledge

Compressed lessons generated from multiple rows.

Example:

```json
{
  "schemaName": "gef-distilled-memory",
  "schemaVersion": 1,
  "id": "rule_01J0",
  "type": "rule",
  "lesson": "For prompts mentioning data storm, spectralGrid usually outperforms beatBloom as the first overlay.",
  "evidenceCount": 18,
  "confidence": 0.84,
  "sourceRows": ["row_001", "row_024", "row_087"],
  "lastReinforcedAt": "2026-06-01T20:00:00.000Z"
}
```

Use for:

- SLM context packs
- prompt rewrite rules
- module scoring rules
- future docs
- human review

Retention:

```text
Permanent until contradicted, superseded, or deleted by the user.
```

Storage:

```text
IndexedDB or versioned local JSON export
```

Rules:

- Distilled memories must be human-readable.
- Must cite source row IDs.
- Must track confidence.
- Must be reversible by deletion of source evidence if privacy requires it.

---

### L4 — Training-Ready Archive

Reviewed, cleaned, versioned examples.

Examples:

```text
training_clean.jsonl
eval_holdout.jsonl
module_choice_train.jsonl
feedback_classifier_eval.jsonl
```

Use for:

- SLM evaluation
- prompt-router regression tests
- possible fine-tuning
- reproducible research exports

Retention:

```text
Versioned archive until user deletes it.
```

Rules:

- Must come from validated rows.
- Must pass privacy checks.
- Must not include quarantined imports.
- Must include dataset card metadata when exported.
- Must separate train/eval/holdout splits.

---

## Memory lifecycle

```text
Capture
  -> Validate
  -> Score
  -> Store
  -> Retrieve
  -> Distill
  -> Reinforce / Decay
  -> Archive / Forget
  -> Export / Delete
```

### 1. Capture

Memory can be captured from:

- prompt submissions
- module choices
- sandbox previews
- validation results
- user accepts/rejects
- prompt edits
- provider output validation failures
- JSONL imports
- dataset exports
- memory distillation passes

Capture rules:

- Capture only through known event paths.
- Do not silently capture raw media data.
- Do not capture secrets.
- Do not capture provider API keys.
- Do not capture unnecessary user-identifying data.

### 2. Validate

Before long-term storage:

- validate schema
- validate source/trust
- validate module IDs
- validate stage values
- validate privacy flags
- validate row size
- validate text length
- validate import status

Invalid memory should go to quarantine or be rejected.

### 3. Score

Every durable memory gets a score.

Recommended score fields:

```json
{
  "importance": 0.8,
  "confidence": 0.9,
  "usage": 0.4,
  "freshness": 0.7,
  "quality": 1.2,
  "risk": 0.1,
  "total": 0.62
}
```

Suggested total:

```js
function memoryScore({ importance, confidence, usage, freshness, quality, risk }) {
  const positive = (importance * 0.3)
    + (confidence * 0.25)
    + (usage * 0.15)
    + (freshness * 0.1)
    + ((quality + 2) / 4) * 0.2;

  return Math.max(0, Math.min(1, positive - risk));
}
```

### 4. Store

Storage choice:

| Layer | Storage |
| --- | --- |
| L0 Session | JS memory or sessionStorage |
| L1 Working | localStorage now, IndexedDB later |
| L2 Long-Term | IndexedDB |
| L3 Distilled | IndexedDB or local JSON export |
| L4 Training Archive | JSONL export and IndexedDB metadata |

### 5. Retrieve

Retrieval order:

```text
1. Current session context
2. Recent working memory
3. Long-term high-score memories
4. Distilled knowledge
5. Training archive only when explicitly requested
```

Never retrieve everything.

Retrieval pack limit:

```js
const retrievalPack = {
  maxItems: 8,
  maxChars: 4000,
  includeQuarantine: false,
  includeRawTelemetry: false,
  preferDistilled: true
};
```

### 6. Distill

Distillation turns many rows into a small lesson.

Distillation input:

- accepted rows
- rejected rows with clear reasons
- repeated validation failures
- repeated provider failures
- repeated module-stage successes
- repeated audio/visual correlations

Distillation output:

- human-readable lesson
- evidence count
- source row IDs
- confidence
- contradictions
- last reinforced timestamp

Distillation should run:

```text
after every 20 meaningful feedback rows
or weekly
or manually from a Review Memory action
```

### 7. Reinforce or decay

Useful memories get stronger when reused successfully.

```js
function reinforceMemory(memory, evidenceRowId) {
  memory.evidenceRowIds = [...new Set([...(memory.evidenceRowIds || []), evidenceRowId])];
  memory.accessCount = (memory.accessCount || 0) + 1;
  memory.lastReinforcedAt = new Date().toISOString();
  memory.confidence = Math.min(1, (memory.confidence || 0.5) + 0.04);
  return memory;
}
```

Stale memories decay.

```js
function decayMemory(memory, daysSinceAccess) {
  const decay = Math.exp(-daysSinceAccess / 365);
  return {
    ...memory,
    decay,
    effectiveScore: (memory.score?.total || 0) * decay
  };
}
```

### 8. Forget

Forgetting is required.

Forget when:

- memory expired
- user deletes memory
- source evidence was deleted
- memory score falls below threshold
- memory is contradicted by stronger evidence
- privacy flags disallow retention
- imported row stays unreviewed too long
- dataset split moves to archive

Default forget threshold:

```text
effectiveScore < 0.15
```

---

## Retention schedule

Default policy:

| Memory type | Default retention | Notes |
| --- | ---: | --- |
| L0 session memory | tab/session only | never exported by default |
| L1 working memory | 30 days or 500 rows | recent context only |
| raw telemetry | 90 days | export before cleanup if desired |
| feedback rows | 180 days | accepted/rejected rows may promote |
| validation failures | 180 days | keep useful failures for regression |
| imported quarantine rows | 30 days | delete unless reviewed |
| long-term memory | 365 days | reinforced memories renew |
| distilled knowledge | until contradicted/deleted | compact and human-readable |
| training-ready archives | user-controlled | versioned export/archive |
| presets | user-controlled | not memory evidence by default |
| Foundry logs | 500 entries | current implementation cap |

Rules:

- User settings may override defaults.
- Deletion must win over retention.
- Export should be available before bulk cleanup.
- Quarantine should not become permanent storage.

---

## Memory types

Recommended `type` values:

```text
event
feedback
preference
failure_pattern
success_pattern
module_recipe
audio_correlation
provider_behavior
security_event
distilled_rule
dataset_candidate
evidence
```

### Evidence memory

GEF should treat experiments as evidence.

Example:

```json
{
  "schemaName": "gef-memory-item",
  "schemaVersion": 1,
  "type": "evidence",
  "summary": "Audio Influence 15-19 preserved source skeleton while allowing style retargeting.",
  "evidenceKind": "observed_result",
  "confidence": 0.92,
  "sourceRows": ["row_cover_test_001", "row_cover_test_002"],
  "promoteToRule": true
}
```

Evidence memories should support the nested learning loop:

```text
Generate -> Observe -> Classify -> Patch -> Template -> Re-Test
```

---

## Memory schemas

### `gef-memory-item-v1`

```json
{
  "schemaName": "gef-memory-item",
  "schemaVersion": 1,
  "id": "mem_01J0",
  "createdAt": "2026-06-01T20:00:00.000Z",
  "updatedAt": "2026-06-01T20:00:00.000Z",
  "type": "preference",
  "summary": "User likes dense spectral grids when bass and glitch are high.",
  "source": {
    "kind": "local",
    "trust": "trusted_local"
  },
  "evidenceRowIds": ["row_01", "row_02"],
  "tags": ["spectralGrid", "audio_reactive", "good_motion"],
  "score": {
    "importance": 0.8,
    "confidence": 0.74,
    "usage": 0.32,
    "freshness": 0.9,
    "quality": 1.4,
    "risk": 0.05,
    "total": 0.67
  },
  "retention": {
    "layer": "long_term",
    "expiresAt": "2027-06-01T20:00:00.000Z",
    "lastAccessedAt": "2026-06-01T20:00:00.000Z",
    "accessCount": 3
  },
  "privacy": {
    "containsUserText": true,
    "containsSecrets": false,
    "exportAllowed": true,
    "deleteWithSourceRows": true
  }
}
```

### `gef-distilled-memory-v1`

```json
{
  "schemaName": "gef-distilled-memory",
  "schemaVersion": 1,
  "id": "rule_01J0",
  "createdAt": "2026-06-01T20:00:00.000Z",
  "lesson": "For data-storm prompts, spectralGrid is usually a better first overlay than beatBloom.",
  "evidenceCount": 18,
  "sourceRows": ["row_001", "row_024", "row_087"],
  "confidence": 0.84,
  "contradictions": [],
  "status": "active",
  "lastReinforcedAt": "2026-06-01T20:00:00.000Z"
}
```

---

## Import and quarantine policy

Imported memory is untrusted.

Import flow:

```text
Import JSONL / JSON
  -> parse
  -> schema check
  -> mark source.kind = imported
  -> mark source.trust = untrusted_import
  -> force split/layer = quarantine
  -> block retrieval by default
  -> user review
  -> promote or delete
```

Quarantine rules:

- quarantined rows are not used for training
- quarantined rows are not used for SLM context
- quarantined rows are not distilled
- quarantined rows expire after 30 days by default
- user may review and promote selected rows

---

## Dataset promotion policy

Memory becomes dataset material only after review.

Promotion chain:

```text
raw event
  -> validated feedback row
  -> scored memory item
  -> distilled knowledge or dataset candidate
  -> cleaned training/eval row
```

A memory may become a dataset candidate only if:

```js
function canPromoteToDataset(memory) {
  return memory.score?.total >= 0.65
    && memory.score?.confidence >= 0.65
    && memory.privacy?.containsSecrets !== true
    && memory.privacy?.exportAllowed === true
    && memory.source?.trust !== 'untrusted_import'
    && Array.isArray(memory.evidenceRowIds)
    && memory.evidenceRowIds.length > 0;
}
```

Rules:

- rejected examples can be training data if clearly labeled
- validation failures can be eval data
- accepted high-score rows can be train data
- holdout rows must never be used for training
- source row lineage must remain traceable

---

## Retrieval policy for SLM/LLM providers

Provider context should use small, deliberate memory packs.

Context pack shape:

```js
{
  task: 'module_choice',
  currentPrompt,
  selectedStage,
  availableModules,
  audioSnapshot,
  recentWorkingMemory: [],
  distilledRules: [],
  relevantPreferences: [],
  recentRejectPatterns: []
}
```

Provider retrieval rules:

- prefer distilled knowledge over raw logs
- include at most 8 memory items
- include source summaries, not full raw rows
- exclude quarantine
- exclude secrets
- exclude raw media
- exclude expired memory
- include contradictions when relevant
- log which memory IDs were used

Memory used by a provider must be treated as context, not command authority.

---

## Privacy and user controls

GEF should provide these controls:

```text
Enable memory
Disable memory
Ephemeral session mode
Export telemetry JSONL
Export cleaned dataset JSONL
Export memory summary JSON
Clear telemetry
Clear memory
Clear presets
Clear all local data
Review imported quarantine
Review distilled memories
```

Default privacy stance:

```text
local-first
no raw media storage
no secret storage
explicit export
explicit deletion
```

Ephemeral mode:

- no localStorage writes
- no IndexedDB writes
- session memory only
- export still allowed if user manually requests it

Deletion rules:

- Clear source rows.
- Clear derived memories if `deleteWithSourceRows = true`.
- Clear embeddings derived from deleted text.
- Clear training candidates derived from deleted memory.
- Preserve only aggregate counts if they contain no user text and no identifiers.

---

## Security requirements

Memory must follow `SECURITY.md`.

Required controls:

- schema validation before storage
- schema validation before import
- quarantine imported rows
- do not render memory text through unsafe HTML
- do not store API keys
- do not store provider secrets
- do not store raw media
- use CSP to reduce XSS risk
- consider encryption for sensitive exports
- provide clear delete/export controls

Sensitive storage rule:

```text
If it would be bad to leak, do not put it in localStorage.
```

---

## Storage migration policy

Current implementation uses localStorage.

Migration target:

```text
localStorage -> IndexedDB
```

Recommended stores:

```text
gef_events
gef_feedback_rows
gef_memory_items
gef_distilled_memories
gef_embeddings
gef_dataset_exports
gef_settings
gef_audit_log
```

Why IndexedDB:

- larger structured data
- indexes
- async operations
- better fit for memory/search workloads

Migration rules:

- keep legacy localStorage import path
- migrate rows once
- mark migrated rows with lineage
- avoid duplicate migration
- allow user to clear old keys after migration

---

## Audit events

Memory-related audit events:

```text
MEMORY_ENABLED
MEMORY_DISABLED
EPHEMERAL_MODE_ENABLED
MEMORY_ROW_WRITTEN
MEMORY_ROW_REJECTED
MEMORY_DISTILLED
MEMORY_REINFORCED
MEMORY_DECAYED
MEMORY_EXPIRED
MEMORY_DELETED
MEMORY_EXPORTED
DATASET_PROMOTED
QUARANTINE_IMPORTED
QUARANTINE_REVIEWED
QUARANTINE_PURGED
```

Do not log:

- API keys
- provider tokens
- raw media
- full imported files
- secrets found in prompts

---

## Cleanup jobs

Run cleanup:

```text
on app boot
when memory writes exceed row cap
when storage estimate crosses threshold
on manual user request
```

Cleanup steps:

```js
function cleanupMemory(now = Date.now()) {
  expireOldWorkingMemory(now);
  purgeQuarantineOlderThan(30);
  decayLongTermMemory(now);
  archiveLowScoreMemory(0.15);
  removeOrphanEmbeddings();
  updateMemoryStats();
}
```

Storage thresholds:

```text
warn at 5 MB localStorage equivalent
warn at 50 MB IndexedDB memory stores
ask before deleting reviewed training archives
```

---

## Implementation checklist

Immediate:

- [ ] Add `src/memory/feedbackStore.js`.
- [ ] Add `src/memory/memorySchemas.js`.
- [ ] Add `src/memory/memoryManager.js`.
- [ ] Add `src/memory/scoring.js`.
- [ ] Add `source`, `trust`, `quality`, and `privacy` fields to new rows.
- [ ] Add import quarantine state.
- [ ] Add memory clear/export controls.
- [ ] Add legacy localStorage migration helpers.

Next:

- [ ] Move feedback rows to IndexedDB.
- [ ] Add keyword memory search.
- [ ] Add distilled memory store.
- [ ] Add cleanup job on boot.
- [ ] Add retention settings UI.
- [ ] Add dataset promotion filter.
- [ ] Add memory retrieval pack for SLM router.

Later:

- [ ] Add embeddings.
- [ ] Add worker-based distillation.
- [ ] Add encrypted export option.
- [ ] Add memory review UI.
- [ ] Add training-ready dataset builder.
- [ ] Add eval/holdout generator.

---

## Reference notes reflected

The policy reflects these external best-practice areas:

- data minimization and limited retention
- user access/delete/export controls
- client-side storage limits and browser persistence behavior
- IndexedDB for larger structured browser data
- JSONL for row-based export
- JSON Schema for validation
- dataset cards for dataset transparency
- secure storage and encryption guidance
- semantic retrieval through embeddings
- quarantine for untrusted imports

Reference URLs:

```text
https://www.edps.europa.eu/data-protection/data-protection/glossary/d_en
https://oag.ca.gov/privacy/ccpa
https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
https://developer.mozilla.org/en-US/docs/Web/API/SubtleCrypto
https://owasp.org/www-project-mobile-top-10/2023-risks/m9-insecure-data-storage
https://jsonlines.org/
https://json-schema.org/learn/getting-started-step-by-step
https://huggingface.co/docs/hub/datasets-cards
https://huggingface.co/learn/llm-course/chapter5/6
https://arxiv.org/abs/1803.09010
```

---

## Memory maxims

- Memory is evidence, not clutter.
- Raw logs are not wisdom.
- Distilled knowledge beats endless history.
- Quarantine imports before they touch the brain.
- Forgetting is a feature.
- Deletion beats retention.
- Presets restore visuals; memory explains learning.
- Dataset candidates must earn promotion.
- SLM context should be small, relevant, and validated.
- The best memory is the one that helps the next run without poisoning the future.
