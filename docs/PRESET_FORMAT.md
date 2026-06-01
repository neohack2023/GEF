# GEF Preset Format

GEF presets are portable snapshots of a visual pipeline.

A preset should answer one question:

```text
How do I recreate this visual setup later without replaying the whole session?
```

Presets are not the same as telemetry. A preset stores the chosen render configuration. Telemetry stores what happened during use.

Core principle:

> A preset should restore intent, not smuggle runtime authority.

That means a preset may choose registered modules and safe parameters. It should not contain executable code, provider secrets, raw model output, raw media, or unvalidated memory rows.

---

## Current implementation

Current storage file:

```text
src/storage/localLibrary.js
```

Current localStorage key:

```js
const PRESET_KEY = 'gef_local_presets';
```

Current save path:

```js
savePreset({
  name,
  baseModuleId: runtime.baseModuleId,
  enabledModules: [...runtime.enabledModules],
  ui: {
    speed: parseFloat($('sl-speed').value),
    glitch: parseFloat($('sl-glitch').value),
    audioSense: parseFloat($('sl-audio-sense').value),
    preview: $('sandbox-preview-mode').value
  }
});
```

Current storage behavior:

```js
export function savePreset(preset) {
  const all = readJson(PRESET_KEY, []);
  all.push({ ...preset, timestamp: Date.now() });
  writeJson(PRESET_KEY, all);
  return all;
}
```

Current load path:

```js
runtime.setBaseModule(preset.baseModuleId || 'voidCore');
runtime.enabledModules = new Set(preset.enabledModules || ['spectralGrid', 'beatBloom', 'chromaSlice']);
$('sl-speed').value = preset.ui?.speed ?? 1.0;
$('sl-glitch').value = preset.ui?.glitch ?? 1.5;
$('sl-audio-sense').value = preset.ui?.audioSense ?? 1.0;
```

---

## Current legacy preset shape

The current prototype shape is effectively `legacy-v0`:

```json
{
  "name": "Unnamed Pipeline",
  "baseModuleId": "voidCore",
  "enabledModules": ["spectralGrid", "beatBloom", "chromaSlice"],
  "ui": {
    "speed": 1.0,
    "glitch": 1.5,
    "audioSense": 1.0,
    "preview": "AUTO"
  },
  "timestamp": 1710000000000
}
```

Problems with `legacy-v0`:

- No `schemaVersion`.
- No stable preset `id`.
- No app version metadata.
- No module parameter storage.
- No validation envelope.
- No source/trust metadata.
- No forward migration rules.
- No difference between visual settings, UI settings, audio settings, and memory references.

Keep loading this shape for backward compatibility, but new exports should use `preset-v1`.

---

## Browser storage notes

GEF currently stores presets through Web Storage, specifically `localStorage`.

Browser facts that affect presets:

- `localStorage` persists across browser sessions for the same origin.
- Web Storage is synchronous, so large reads/writes can block the UI.
- Browser storage quotas and eviction behavior vary by browser.
- IndexedDB is better for larger datasets and structured indexed data.

Design consequence:

```text
Small presets can stay in localStorage.
Large preset packs, thumbnails, embeddings, and memory-linked presets should move to IndexedDB.
```

Useful references:

```text
https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
https://developer.mozilla.org/en-US/docs/Web/API/IndexedDB_API
```

---

## Versioning rule

GEF preset format should use two fields:

```json
{
  "schemaVersion": 1,
  "schemaName": "gef-preset"
}
```

Recommended version behavior:

| Change | Version action |
| --- | --- |
| Add optional field | keep same major schema version |
| Add required field | increment schema version or provide migration |
| Rename/remove field | increment schema version |
| Change module parameter meaning | increment module version |
| Change default behavior only | document in migration notes |

This follows the same spirit as Semantic Versioning: breaking changes require stronger version signals, while backward-compatible additions can be handled gently.

Useful reference:

```text
https://semver.org/spec/v2.0.0.html
```

---

## Target `preset-v1` shape

```json
{
  "schemaName": "gef-preset",
  "schemaVersion": 1,
  "id": "preset_01HZZZEXAMPLE",
  "name": "Bass Grid Bloom",
  "description": "A stable bass-reactive grid stack with bloom pulses.",
  "createdAt": "2026-06-01T20:00:00.000Z",
  "updatedAt": "2026-06-01T20:00:00.000Z",
  "app": {
    "name": "GEF Sandbox Compiler",
    "version": "2.3.0",
    "build": "safe-foundation"
  },
  "source": {
    "kind": "local",
    "trust": "trusted_local",
    "author": "local-user"
  },
  "pipeline": {
    "baseModuleId": "voidCore",
    "enabledModules": ["spectralGrid", "beatBloom", "chromaSlice"],
    "moduleOrder": ["voidCore", "spectralGrid", "beatBloom", "chromaSlice"],
    "modules": {
      "voidCore": {
        "enabled": true,
        "stage": "BASE",
        "params": {}
      },
      "spectralGrid": {
        "enabled": true,
        "stage": "OVERLAY",
        "params": {
          "opacity": 0.75,
          "density": 1.0,
          "blendMode": "screen"
        }
      },
      "beatBloom": {
        "enabled": true,
        "stage": "POST_FX",
        "params": {}
      },
      "chromaSlice": {
        "enabled": true,
        "stage": "POST_FX",
        "params": {}
      }
    }
  },
  "audio": {
    "speed": 1.0,
    "audioSense": 1.0,
    "glitchThreshold": 1.5,
    "fftSize": 1024,
    "smoothingTimeConstant": 0.1,
    "bands": {
      "mode": "legacy-bins",
      "bass": [0, 10],
      "mid": [10, 70],
      "treble": [70, 200]
    }
  },
  "sandbox": {
    "previewMode": "AUTO",
    "promoteOnLoad": false
  },
  "ui": {
    "showMeters": true,
    "showModuleStack": true,
    "notes": ""
  },
  "memoryRefs": [],
  "tags": ["bass-reactive", "grid", "safe-foundation"],
  "compatibility": {
    "minAppVersion": "2.3.0",
    "requiresAdapters": ["canvas2d"],
    "optionalAdapters": []
  }
}
```

---

## Required fields

For `preset-v1`, require:

```text
schemaName
schemaVersion
id
name
createdAt
pipeline
audio
sandbox
source
compatibility
```

Minimum valid preset:

```json
{
  "schemaName": "gef-preset",
  "schemaVersion": 1,
  "id": "preset_minimal_001",
  "name": "Minimal Void",
  "createdAt": "2026-06-01T20:00:00.000Z",
  "source": {
    "kind": "local",
    "trust": "trusted_local"
  },
  "pipeline": {
    "baseModuleId": "voidCore",
    "enabledModules": [],
    "moduleOrder": ["voidCore"],
    "modules": {
      "voidCore": {
        "enabled": true,
        "stage": "BASE",
        "params": {}
      }
    }
  },
  "audio": {
    "speed": 1.0,
    "audioSense": 1.0,
    "glitchThreshold": 1.5
  },
  "sandbox": {
    "previewMode": "AUTO",
    "promoteOnLoad": false
  },
  "compatibility": {
    "minAppVersion": "2.3.0",
    "requiresAdapters": ["canvas2d"]
  }
}
```

---

## Field definitions

### `schemaName`

Must be:

```json
"gef-preset"
```

Use this to reject telemetry files, memory files, or unrelated JSON.

### `schemaVersion`

Integer format version.

Current target:

```json
1
```

### `id`

Stable preset identifier.

Recommended shape:

```text
preset_<random-or-ulid>
```

Rules:

- Must be unique within the local library.
- Must not be used as a DOM id without escaping.
- Should survive rename operations.

### `name`

User-visible preset name.

Rules:

- Display with `textContent`, not unsanitized `innerHTML`.
- Limit length, recommended max `80` characters.
- Empty names become `Unnamed Pipeline`.

### `description`

Optional user-facing notes.

Rules:

- Plain text only.
- Limit length, recommended max `500` characters.

### `createdAt` and `updatedAt`

ISO 8601 timestamps.

Recommended shape:

```js
new Date().toISOString()
```

Legacy `timestamp` remains milliseconds since epoch.

### `source`

Tracks origin and trust.

```json
{
  "kind": "local",
  "trust": "trusted_local",
  "author": "local-user"
}
```

Allowed `kind` values:

```text
local
imported
provider_suggested
migration
```

Allowed `trust` values:

```text
trusted_local
untrusted_import
reviewed
provider_generated
```

### `pipeline`

The actual visual pipeline.

```json
{
  "baseModuleId": "voidCore",
  "enabledModules": ["spectralGrid", "beatBloom"],
  "moduleOrder": ["voidCore", "spectralGrid", "beatBloom"],
  "modules": {}
}
```

Rules:

- `baseModuleId` must exist in the module registry.
- Every `enabledModules` item must exist in the module registry.
- `moduleOrder` must contain only registered module IDs.
- `modules` stores per-module state and params.
- Unknown module IDs should be ignored or quarantined, not executed.

### `audio`

Stores visual response controls.

Current fields:

```json
{
  "speed": 1.0,
  "audioSense": 1.0,
  "glitchThreshold": 1.5
}
```

Future fields:

```json
{
  "fftSize": 1024,
  "smoothingTimeConstant": 0.1,
  "bands": {
    "mode": "hz",
    "bass": [20, 250],
    "mid": [250, 2500],
    "treble": [2500, 9000]
  }
}
```

Rules:

- Clamp numeric fields to safe UI ranges.
- Do not trust imported values blindly.
- Preserve unknown future audio fields under `extensions.audio` if needed.

### `sandbox`

Stores preview behavior.

```json
{
  "previewMode": "AUTO",
  "promoteOnLoad": false
}
```

Rules:

- `previewMode` must be one of `AUTO`, `STACK`, or `REPLACE`.
- `promoteOnLoad` must default to `false`.
- Imported presets must never auto-promote into main.

### `memoryRefs`

Optional references to feedback or training rows that inspired the preset.

```json
"memoryRefs": ["feedback_01HZ", "rule_01JA"]
```

Rules:

- References only, not embedded memory rows.
- Do not import raw memory through a preset.
- Broken references are allowed and should not break loading.

### `compatibility`

Describes what the preset needs.

```json
{
  "minAppVersion": "2.3.0",
  "requiresAdapters": ["canvas2d"],
  "optionalAdapters": ["webgpu"]
}
```

Rules:

- If required adapters are missing, load as read-only or preview-unavailable.
- Canvas2D presets should remain the baseline compatibility target.

### `tags`

Optional user or system tags.

```json
["bass-reactive", "grid", "safe-foundation"]
```

Rules:

- Plain strings only.
- Limit count, recommended max `20`.
- Limit length, recommended max `40` characters each.

---

## JSON Schema starter

JSON Schema is useful here because presets are nested objects with required fields, typed arrays, numeric ranges, and optional fields.

Starter schema:

```json
{
  "$schema": "https://json-schema.org/draft/2020-12/schema",
  "$id": "https://gef.local/schemas/gef-preset-v1.schema.json",
  "title": "GEF Preset v1",
  "type": "object",
  "required": [
    "schemaName",
    "schemaVersion",
    "id",
    "name",
    "createdAt",
    "source",
    "pipeline",
    "audio",
    "sandbox",
    "compatibility"
  ],
  "properties": {
    "schemaName": { "const": "gef-preset" },
    "schemaVersion": { "const": 1 },
    "id": { "type": "string", "minLength": 1, "maxLength": 120 },
    "name": { "type": "string", "minLength": 1, "maxLength": 80 },
    "description": { "type": "string", "maxLength": 500 },
    "createdAt": { "type": "string", "format": "date-time" },
    "updatedAt": { "type": "string", "format": "date-time" },
    "source": {
      "type": "object",
      "required": ["kind", "trust"],
      "properties": {
        "kind": { "enum": ["local", "imported", "provider_suggested", "migration"] },
        "trust": { "enum": ["trusted_local", "untrusted_import", "reviewed", "provider_generated"] },
        "author": { "type": "string", "maxLength": 120 }
      }
    },
    "pipeline": {
      "type": "object",
      "required": ["baseModuleId", "enabledModules", "moduleOrder", "modules"],
      "properties": {
        "baseModuleId": { "type": "string" },
        "enabledModules": {
          "type": "array",
          "items": { "type": "string" },
          "uniqueItems": true
        },
        "moduleOrder": {
          "type": "array",
          "items": { "type": "string" },
          "uniqueItems": true
        },
        "modules": { "type": "object" }
      }
    },
    "audio": {
      "type": "object",
      "required": ["speed", "audioSense", "glitchThreshold"],
      "properties": {
        "speed": { "type": "number", "minimum": -2, "maximum": 5 },
        "audioSense": { "type": "number", "minimum": 0, "maximum": 3 },
        "glitchThreshold": { "type": "number", "minimum": 0.1, "maximum": 5 }
      }
    },
    "sandbox": {
      "type": "object",
      "required": ["previewMode", "promoteOnLoad"],
      "properties": {
        "previewMode": { "enum": ["AUTO", "STACK", "REPLACE"] },
        "promoteOnLoad": { "const": false }
      }
    },
    "compatibility": {
      "type": "object",
      "required": ["minAppVersion", "requiresAdapters"],
      "properties": {
        "minAppVersion": { "type": "string" },
        "requiresAdapters": {
          "type": "array",
          "items": { "type": "string" },
          "minItems": 1
        },
        "optionalAdapters": {
          "type": "array",
          "items": { "type": "string" }
        }
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

Legacy input:

```json
{
  "name": "My Preset",
  "baseModuleId": "voidCore",
  "enabledModules": ["spectralGrid"],
  "ui": {
    "speed": 1,
    "glitch": 1.5,
    "audioSense": 1,
    "preview": "AUTO"
  },
  "timestamp": 1710000000000
}
```

Migration output:

```js
export function migrateLegacyPresetV0(preset) {
  const createdAt = preset.timestamp
    ? new Date(preset.timestamp).toISOString()
    : new Date().toISOString();

  const baseModuleId = preset.baseModuleId || 'voidCore';
  const enabledModules = Array.isArray(preset.enabledModules) ? preset.enabledModules : [];
  const moduleOrder = [baseModuleId, ...enabledModules.filter((id) => id !== baseModuleId)];

  return {
    schemaName: 'gef-preset',
    schemaVersion: 1,
    id: `preset_${crypto.randomUUID?.() || Date.now()}`,
    name: preset.name || 'Unnamed Pipeline',
    createdAt,
    updatedAt: createdAt,
    source: {
      kind: 'migration',
      trust: 'trusted_local'
    },
    pipeline: {
      baseModuleId,
      enabledModules,
      moduleOrder,
      modules: Object.fromEntries(
        moduleOrder.map((id) => [id, { enabled: true, stage: 'UNKNOWN', params: {} }])
      )
    },
    audio: {
      speed: Number(preset.ui?.speed ?? 1.0),
      audioSense: Number(preset.ui?.audioSense ?? 1.0),
      glitchThreshold: Number(preset.ui?.glitch ?? 1.5),
      bands: {
        mode: 'legacy-bins',
        bass: [0, 10],
        mid: [10, 70],
        treble: [70, 200]
      }
    },
    sandbox: {
      previewMode: preset.ui?.preview || 'AUTO',
      promoteOnLoad: false
    },
    compatibility: {
      minAppVersion: '2.3.0',
      requiresAdapters: ['canvas2d']
    },
    tags: ['migrated-v0']
  };
}
```

Important:

After migration, validate module IDs against the registry and rewrite `stage` from actual module metadata when available.

---

## Validation helpers

### Clamp helpers

```js
export function clamp(value, min, max, fallback) {
  const number = Number(value);
  if (!Number.isFinite(number)) return fallback;
  return Math.max(min, Math.min(max, number));
}
```

### Preview mode validator

```js
export function safePreviewMode(value) {
  return ['AUTO', 'STACK', 'REPLACE'].includes(value) ? value : 'AUTO';
}
```

### Module ID validator

```js
export function filterKnownModuleIds(ids, moduleCatalog) {
  const known = new Set(moduleCatalog.map((moduleDef) => moduleDef.id));
  return ids.filter((id) => known.has(id));
}
```

### Preset normalizer

```js
export function normalizePreset(preset, moduleCatalog) {
  const migrated = preset.schemaVersion ? preset : migrateLegacyPresetV0(preset);
  const enabledModules = filterKnownModuleIds(migrated.pipeline.enabledModules || [], moduleCatalog);
  const baseModuleId = filterKnownModuleIds([migrated.pipeline.baseModuleId], moduleCatalog)[0] || 'voidCore';

  return {
    ...migrated,
    pipeline: {
      ...migrated.pipeline,
      baseModuleId,
      enabledModules,
      moduleOrder: [baseModuleId, ...enabledModules.filter((id) => id !== baseModuleId)]
    },
    audio: {
      ...migrated.audio,
      speed: clamp(migrated.audio?.speed, -2, 5, 1.0),
      audioSense: clamp(migrated.audio?.audioSense, 0, 3, 1.0),
      glitchThreshold: clamp(migrated.audio?.glitchThreshold, 0.1, 5, 1.5)
    },
    sandbox: {
      previewMode: safePreviewMode(migrated.sandbox?.previewMode),
      promoteOnLoad: false
    }
  };
}
```

---

## Import rules

Imported presets are untrusted until normalized and validated.

Rules:

- Require `schemaName === 'gef-preset'` for v1 imports.
- Accept legacy v0 only through migration.
- Limit file size.
- Limit array lengths.
- Validate module IDs against registry.
- Clamp all numeric controls.
- Force `sandbox.promoteOnLoad = false`.
- Mark source trust as `untrusted_import` unless user explicitly reviews and accepts.
- Render imported text using `textContent`.
- Do not import memory rows through presets.

Import flow:

```text
file input
  -> parse JSON
  -> identify shape
  -> migrate if legacy
  -> schema validate
  -> normalize/clamp
  -> registry validate
  -> store as untrusted import
  -> allow user preview
  -> user accepts
  -> mark reviewed
```

---

## Export rules

A preset export should include only what is needed to recreate the visual state.

Allowed in preset export:

- module IDs
- module order
- module parameters
- UI controls that affect rendering
- audio response settings
- adapter requirements
- tags and plain-text notes
- memory references

Not allowed in preset export:

- API keys
- local provider endpoints unless explicitly included by user
- raw model prompts unless saved as notes
- raw memory rows
- raw telemetry rows
- raw media files
- microphone/audio data
- generated executable code

---

## Preset packs

Future pack shape:

```json
{
  "schemaName": "gef-preset-pack",
  "schemaVersion": 1,
  "exportedAt": "2026-06-01T20:00:00.000Z",
  "app": {
    "name": "GEF Sandbox Compiler",
    "version": "2.3.0"
  },
  "presets": []
}
```

Rules:

- Each preset inside the pack must validate individually.
- A bad preset should not poison the whole pack.
- Imported packs should report accepted, rejected, and migrated counts.

---

## Relationship to other data files

| File type | Purpose | Contains |
| --- | --- | --- |
| Preset | recreate visual setup | module IDs, settings, tags |
| Telemetry JSONL | record events | prompts, decisions, feedback events |
| Memory policy | explain retention | rules for keep/compress/forget |
| Dataset format | training/evaluation rows | validated examples |
| Capture metadata | reproduce export context | render size, FPS, codec, audio summary |

Do not blur these together.

Preset files should be clean little engine maps, not a junk drawer with confetti stuck in the gears.

---

## Best build order

1. Add `schemaName` and `schemaVersion` to new saves.
2. Add preset `id`, `createdAt`, and `updatedAt`.
3. Add `normalizePreset()` for both v0 and v1.
4. Add module ID validation against the catalog.
5. Replace preset card `innerHTML` user fields with `textContent` rendering.
6. Add single preset export/import.
7. Add preset-pack export/import.
8. Add module parameter schema support.
9. Add IndexedDB storage for larger preset libraries.
10. Add thumbnail support only after storage migration.

---

## Reference notes reviewed

- MDN Web Storage API: localStorage persists by origin and is synchronous.
- MDN Storage quotas and eviction: browser storage limits and eviction behavior vary.
- JSON Schema: use `properties`, `required`, nested objects, arrays, and validation keywords for predictable data contracts.
- Semantic Versioning: breaking changes should be signaled by stronger version increments.

Reference URLs:

```text
https://developer.mozilla.org/en-US/docs/Web/API/Web_Storage_API
https://developer.mozilla.org/en-US/docs/Web/API/Storage_API/Storage_quotas_and_eviction_criteria
https://json-schema.org/learn/getting-started-step-by-step
https://semver.org/spec/v2.0.0.html
```

---

## Preset maxims

- Presets restore configuration, not authority.
- Module IDs are references, not code.
- Imports are guilty until validated.
- Unknown fields should survive only in safe extension pockets.
- Memory references are allowed; memory payloads are not.
- Legacy saves should migrate quietly.
- A preset should be boring enough to trust and rich enough to revive the visual.
